// server.js

const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt'); // 비밀번호 암호화
const path = require('path');
const app = express();
const cors = require('cors');
const axios = require('axios');
const mysql = require('mysql');
const http = require('http');
const { Server } = require('socket.io');
const MySQLStore = require('express-mysql-session')(session);
const PORT = 4002;

app.set('trust proxy', 1); // 프록시를 신뢰

// HTTP 서버와 Socket.IO 서버를 설정합니다.
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      'http://sharedtaxi.duckdns.org',  // HTTP
      'https://sharedtaxi.duckdns.org', // HTTPS
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// 세션 미들웨어 설정
const sessionMiddleware = session({
  key: 'shared_taxi_session', // 세션 쿠키의 이름을 명시적으로 설정
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true,
  store: new MySQLStore({
    host: '127.0.0.1',
    port: '3306',
    user: 'root',
    password: '2364',
    database: 'SHTX',
  }), // MySQL에 세션 저장
  cookie: {
    secure: true, // HTTPS에서만 작동하도록 설정
    httpOnly: true, // JavaScript로 쿠키에 접근하지 못하도록 설정
    sameSite: 'None', // 타사 요청에도 쿠키를 전송하도록 설정
    maxAge: 1000 * 60 * 60, // 1시간 동안 세션 유지
  },
});

// Express와 Socket.IO에 세션 미들웨어 적용
app.use(sessionMiddleware);
io.use((socket, next) => {
  sessionMiddleware(socket.request, {}, next);
});

app.use(cors({
  origin: [
    'http://sharedtaxi.duckdns.org',  // HTTP
    'https://sharedtaxi.duckdns.org', // HTTPS
  ],
  credentials: true, // 클라이언트가 쿠키를 받을 수 있도록 허용
}));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 정적 파일 제공 설정
app.use(express.static(path.join(__dirname, 'build')));
// .well-known 폴더를 정적 파일로 제공
app.use('/.well-known', express.static(path.join(__dirname, '.well-known')));

// MySQL 데이터베이스 연결 설정
const connection = mysql.createConnection({
  host: '127.0.0.1',
  user: 'root',
  password: '2364',
  database: 'SHTX',
  port: '3306',
});

// MySQL 데이터베이스 연결
connection.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    return;
  }
  console.log('Connected to MySQL');
});

// 사용자 ID와 소켓 ID를 매핑하기 위한 객체
const userSocketMap = {};

// Socket.IO 이벤트 설정
io.on('connection', (socket) => {
  const user = socket.request.session.user;
  if (user && user.id) {
    userSocketMap[user.id] = socket.id;
    socket.userId = user.id; // 소켓 객체에 userId 저장
    console.log(`User ID ${user.id} connected with socket ID ${socket.id}`);

    // 채팅방 입장
    socket.on('joinRoom', (chatRoomId) => {
      socket.join(chatRoomId);
      console.log(`User with socket ID ${socket.id} joined room ${chatRoomId}`);
    });

    // 채팅방 퇴장
    socket.on('leaveRoom', (chatRoomId) => {
      socket.leave(chatRoomId);
      console.log(`User with socket ID ${socket.id} left room ${chatRoomId}`);
    });

    // 메시지 전송
    socket.on('sendMessage', (message) => {
      // 1. 메시지를 보낸 사용자의 닉네임을 조회
      const userQuery = `SELECT username FROM users WHERE id = ?`;
      connection.query(userQuery, [message.userId], (userError, userResults) => {
        if (userError || userResults.length === 0) {
          console.error('Error fetching user:', userError);
          socket.emit('errorMessage', { error: 'Failed to fetch user' });
          return;
        }

        const username = userResults[0].username;

        // 2. 메시지를 데이터베이스에 저장, 닉네임도 함께 저장
        const query = `INSERT INTO messages (chat_room_id, user_id, username, message_content, sent_time) VALUES (?, ?, ?, ?, ?)`;
        const params = [message.chatRoomId, message.userId, username, message.content, new Date()];

        connection.query(query, params, (error, results) => {
          if (error) {
            console.error('Error inserting message into MySQL:', error);
            socket.emit('errorMessage', { error: 'Failed to save message' });
            return;
          }
          console.log('Message saved to MySQL:', results);

          // 3. 특정 채팅방의 사용자에게 닉네임을 포함하여 메시지 전송
          io.to(message.chatRoomId).emit('receiveMessage', {
            message_id: results.insertId, // 새로 삽입된 메시지 ID
            chat_room_id: message.chatRoomId,
            user_id: message.userId,
            username: username, // 닉네임 추가
            message_content: message.content,
            sent_time: new Date(),
            read_status: 0, // 기본적으로 읽지 않은 상태
          });
        });
      });
    });

    // 소켓이 연결을 끊을 때
    socket.on('disconnect', (reason) => {
      console.log(`User ID ${socket.userId} disconnected from socket ID ${socket.id}. Reason: ${reason}`);
      if (socket.userId && userSocketMap[socket.userId] === socket.id) {
        delete userSocketMap[socket.userId];
        console.log(`Cleaned up userSocketMap for user ID ${socket.userId}`);
      }
    });

    // 소켓 에러 핸들링
    socket.on('error', (error) => {
      console.error(`Socket error from user ID ${socket.userId}:`, error);
    });
  } else {
    console.log('Unauthenticated socket connection');
    socket.disconnect();
  }
});

// 정기적인 userSocketMap 정리 (예: 10분마다)
setInterval(() => {
  console.log('Running periodic cleanup of userSocketMap');
  for (const userId in userSocketMap) {
    const socketId = userSocketMap[userId];
    const socket = io.sockets.sockets.get(socketId);
    if (!socket) {
      console.log(`Socket ID ${socketId} for user ID ${userId} is no longer active. Removing from userSocketMap.`);
      delete userSocketMap[userId];
    }
  }
}, 10 * 60 * 1000); // 10분
// 좌표 기반 거리 계산 함수 (정수 반환)
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // 지구의 반경(미터)
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c;
  return Math.floor(distance); // 정수로 반환
}

// server.js 또는 해당 서버 파일

app.post('/api/save-history', (req, res) => {
  const { chat_room_id, user_id, departure, destination, chat_room_name } = req.body;

  // 필요한 필드가 모두 전달되었는지 확인
  if (!chat_room_id || !user_id || !departure || !destination || !chat_room_name) {
    return res.status(400).json({ error: '모든 필드를 입력해주세요.' });
  }

  // usage_history 테이블에 기록 저장
  const historyQuery = `
    INSERT INTO usage_history (user_id, chat_room_id, chat_room_name, departure, destination, joined_at)
    VALUES (?, ?, ?, ?, ?, NOW())
  `;

  connection.query(
    historyQuery,
    [user_id, chat_room_id, chat_room_name, departure, destination],
    (error, results) => {
      if (error) {
        console.error('Error saving history:', error);
        return res.status(500).json({ error: '이용 기록 저장에 실패했습니다.' });
      }

      res.status(200).json({ message: '이용 기록이 성공적으로 저장되었습니다.' });
    }
  );
});


// 사용 기록 가져오기 API
app.get('/api/usage-history/:userId', (req, res) => {
  const userId = req.params.userId;

  // 데이터베이스에서 해당 사용자의 이용 기록 조회
  const query = `
    SELECT *
    FROM usage_history
    WHERE user_id = ?
    ORDER BY created_at DESC
  `;

  connection.query(query, [userId], (error, results) => {
    if (error) {
      console.error('Error fetching usage history:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    res.json(results);
  });
});


// 사용자의 참여 중인 채팅방 ID 조회 API
app.get('/api/get-user-chat-room/:userId', (req, res) => {
  const { userId } = req.params;

  const query = `SELECT chat_room_id FROM chat_participation WHERE user_id = ?`;
  connection.query(query, [userId], (error, results) => {
    if (error) {
      console.error('Error fetching chat room:', error);
      return res.status(500).json({ error: 'Failed to fetch chat room' });
    }

    // 참여 중인 채팅방이 없을 때를 대비하여 처리
    if (results.length === 0) {
      return res.json({ chat_room_id: null });
    }

    res.json({ chat_room_id: results[0].chat_room_id });
  });
});

// 채팅방 검색 및 생성 로직
// 채팅방 검색 및 생성 로직
app.post('/api/start-matching', async (req, res) => {
  const { user_id, departure, destination, departureCoords, destinationCoords, departure_time } = req.body;

  console.log('Request body:', req.body);
  // 데이터 유효성 검사
  if (!user_id || !departure || !destination || !departureCoords || !destinationCoords || !departure_time) {
    console.error('Invalid input data:', req.body);
    return res.status(400).json({ error: 'Invalid input data' });
  }

  try {
    // user_id가 users 테이블에 존재하는지 확인
    const userCheckQuery = `SELECT id FROM users WHERE id = ?`;
    connection.query(userCheckQuery, [user_id], (userCheckError, userCheckResults) => {
      if (userCheckError) {
        console.error('Error checking user in MySQL:', userCheckError);
        return res.status(500).json({ error: 'Internal Server Error' });
      }

      if (userCheckResults.length === 0) {
        console.error('User not found in database');
        return res.status(404).json({ error: 'User not found' });
      }

      const userIdFromDb = userCheckResults[0].id;

      // 기존 채팅방 검색 (모든 채팅방 불러오기)
      const searchQuery = `SELECT * FROM chat_room`;
      connection.query(searchQuery, (searchError, searchResults) => {
        if (searchError) {
          console.error('Error searching for existing chat room:', searchError);
          return res.status(500).json({ error: 'Internal Server Error during chat room search' });
        }

        let matchedChatRoom = null;
        for (let room of searchResults) {
          const roomDepartureCoords = { lat: room.departure_lat, lng: room.departure_lng };
          const roomDestinationCoords = { lat: room.destination_lat, lng: room.destination_lng };

          const departureDistance = getDistance(
            departureCoords.lat, departureCoords.lng,
            roomDepartureCoords.lat, roomDepartureCoords.lng
          );

          const destinationDistance = getDistance(
            destinationCoords.lat, destinationCoords.lng,
            roomDestinationCoords.lat, roomDestinationCoords.lng
          );

          // 출발 시간 차이를 계산 (예: 30분 이내)
          const departureTimeDifference = Math.abs(new Date(departure_time) - new Date(room.departure_time));
          const maxTimeDifference = 30 * 60 * 1000; // 30분

          // 500m 이내 && 출발 시간 차이가 30분 이내인 경우
          if (departureDistance <= 500 && destinationDistance <= 500 && departureTimeDifference <= maxTimeDifference) {
            matchedChatRoom = room;
            break;
          }
        }

        if (matchedChatRoom) {
          // 기존 채팅방이 존재하는 경우, 사용자 참여 여부 확인
          const checkParticipationQuery = `SELECT * FROM chat_participation WHERE chat_room_id = ? AND user_id = ?`;
          connection.query(checkParticipationQuery, [matchedChatRoom.chat_room_id, userIdFromDb], (checkError, checkResults) => {
            if (checkError) {
              console.error('Error checking user participation:', checkError);
              return res.status(500).json({ error: 'Internal Server Error' });
            }

            if (checkResults.length === 0) {
              // 사용자가 참여하지 않은 경우에만 추가
              const joinQuery = `INSERT INTO chat_participation (chat_room_id, user_id) VALUES (?, ?)`;
              connection.query(joinQuery, [matchedChatRoom.chat_room_id, userIdFromDb], (joinError, joinResults) => {
                if (joinError) {
                  console.error('Error adding user to existing chat room:', joinError);
                  return res.status(500).json({ error: 'Internal Server Error' });
                }
                res.json({ message: 'Joined existing chat room', chat_room_id: matchedChatRoom.chat_room_id });
              });
            } else {
              // 이미 참여한 경우
              res.json({ message: 'User already in chat room', chat_room_id: matchedChatRoom.chat_room_id });
            }
          });
        } else {
          // 유사한 채팅방이 없으면 새로운 채팅방 생성
          const createQuery =
            `INSERT INTO chat_room (chat_room_name, created_at, departure, destination, departure_lat, departure_lng, destination_lat, destination_lng, departure_time)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ;
          connection.query(createQuery, [
            `${departure} to ${destination}`,  // chat_room_name에 출발지와 도착지를 합쳐서 저장
            new Date(),
            departure, // 출발지 주소
            destination, // 도착지 주소
            departureCoords.lat, // 출발지 위도
            departureCoords.lng, // 출발지 경도
            destinationCoords.lat, // 도착지 위도
            destinationCoords.lng, // 도착지 경도
            new Date(departure_time), // 출발 시간 저장
          ],
          (createError, createResults) => {
            if (createError) {
              console.error('Error creating new chat room:', createError);
              return res.status(500).json({ error: 'Internal Server Error' });
            }

            const newChatRoomId = createResults.insertId;
            const joinQuery = `INSERT INTO chat_participation (chat_room_id, user_id) VALUES (?, ?)`;
            connection.query(joinQuery, [newChatRoomId, userIdFromDb], (joinError, joinResults) => {
              if (joinError) {
                console.error('Error adding user to new chat room:', joinError);
                return res.status(500).json({ error: 'Internal Server Error' });
              }
              res.json({ message: 'Created new chat room and joined', chat_room_id: newChatRoomId });
            });
          });
        }
      });
    });
  } catch (error) {
    console.error('Error in matching logic:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


app.get('/api/chat-room/:chatRoomId/users', (req, res) => {
  const { chatRoomId } = req.params;
  const query = `
    SELECT u.id, u.username, u.email
    FROM chat_participation cp
    JOIN users u ON cp.user_id = u.id
    WHERE cp.chat_room_id = ?
  `;

  connection.query(query, [chatRoomId], (error, results) => {
    if (error) {
      console.error('Error fetching users in room:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    res.json(results);
  });
});

app.get('/api/check-user-status/:userId', (req, res) => {
  const { userId } = req.params;

  const query = 'SELECT 1 FROM chat_participation WHERE user_id = ? LIMIT 1';
  connection.query(query, [userId], (error, results) => {
    if (error) {
      console.error('Error checking user participation:', error);
      return res.status(500).json({ error: 'Failed to check user participation' });
    }

    // 사용자가 chat_participation에 있으면 chat_room_status = 0, 없으면 2로 반환
    const chatRoomStatus = results.length > 0 ? 0 : 2;
    res.json({ chat_room_status: chatRoomStatus });
  });
});
app.post('/api/user/update', async (req, res) => {
  try {
    const userId = req.session.user?.id;
    const { username, password } = req.body;

    if (!userId) {
      return res.status(401).json({ message: '로그인이 필요합니다.' });
    }

    const updates = {};
    if (username) updates.username = username;
    if (password) updates.password = password;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: '업데이트할 항목이 없습니다.' });
    }

    let query = 'UPDATE users SET ';
    const params = [];

    if (updates.username) {
      query += 'username = ?, ';
      params.push(updates.username);
    }
    if (updates.password) {
      query += 'password = ?, ';
      params.push(updates.password);
    }

    query = query.slice(0, -2);
    query += ' WHERE id = ?';
    params.push(userId);

    // `db` 대신 `connection`으로 수정
    connection.query(query, params, (err, result) => {
      if (err) {
        console.error('사용자 정보 업데이트 중 오류 발생:', err);
        return res.status(500).json({ message: '사용자 정보 업데이트 중 오류가 발생했습니다.' });
      }

      connection.query('SELECT id, username, email, gender FROM users WHERE id = ?', [userId], (err, results) => {
        if (err || results.length === 0) {
          console.error('업데이트된 사용자 정보를 가져오는 중 오류 발생:', err);
          return res.status(500).json({ message: '업데이트된 사용자 정보를 가져오는 중 오류가 발생했습니다.' });
        }

        const updatedUser = results[0];
        req.session.user = updatedUser;
        res.json({ message: '사용자 정보가 업데이트되었습니다.', user: updatedUser });
      });
    });
  } catch (error) {
    console.error('서버 오류가 발생했습니다:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

app.post('/api/update-status1', (req, res) => {
  const { user_id, status } = req.body;

  const updateQuery = 'UPDATE users SET chat_room_status = ? WHERE id = ?';
  connection.query(updateQuery, [status, user_id], (error, results) => {
    if (error) {
      console.error('Error updating status:', error);
      return res.status(500).json({ error: 'Failed to update status' });
    }
    res.json({ message: 'Status updated successfully' });
  });
});

app.put('/api/update-status', (req, res) => {
  const { userId, status } = req.body;

  const query = 'UPDATE users SET chat_room_status = ? WHERE id = ?';
  connection.query(query, [status, userId], (error, results) => {
    if (error) {
      console.error('Error updating user status:', error);
      return res.status(500).json({ error: 'Failed to update status' });
    }
    res.json({ message: 'Status updated successfully' });
  });
});

app.get('/api/check-room-status/:chatRoomId', (req, res) => {
  const { chatRoomId } = req.params;

  const query = `
    SELECT COUNT(*) AS remaining
    FROM chat_participation cp
    JOIN users u ON cp.user_id = u.id
    WHERE cp.chat_room_id = ? AND u.chat_room_status = 0
  `;

  connection.query(query, [chatRoomId], async (error, results) => {
    if (error) {
      console.error('Error checking room status:', error);
      return res.status(500).json({ error: 'Failed to check room status' });
    }

    const remaining = results[0]?.remaining ?? 0;
    console.log(`Remaining users with status 0: ${remaining}`);

    if (remaining === 0) {
      try {
        // 1. 참여한 모든 유저들의 chat_room_status를 2으로 변경
        const updateStatusQuery = `
          UPDATE users
          SET chat_room_status = 2
          WHERE id IN (SELECT user_id FROM chat_participation WHERE chat_room_id = ?)
        `;
        await new Promise((resolve, reject) => {
          connection.query(updateStatusQuery, [chatRoomId], (err) => {
            if (err) return reject(err);
            resolve();
          });
        });
        console.log('All users\' status reset to 0.');

        // 2. chat_participation에서 해당 채팅방 관련 정보 삭제
        const deleteParticipationQuery = 'DELETE FROM chat_participation WHERE chat_room_id = ?';
        await new Promise((resolve, reject) => {
          connection.query(deleteParticipationQuery, [chatRoomId], (err) => {
            if (err) return reject(err);
            resolve();
          });
        });
        console.log('Chat participation entries deleted.');

        // 3. chat_room 테이블에서 채팅방 삭제
        const deleteChatRoomQuery = 'DELETE FROM chat_room WHERE chat_room_id = ?';
        await new Promise((resolve, reject) => {
          connection.query(deleteChatRoomQuery, [chatRoomId], (err) => {
            if (err) return reject(err);
            resolve();
          });
        });
        console.log('Chat room deleted successfully.');

        res.json({ message: 'Chat room deleted and user statuses reset.' });
      } catch (deleteError) {
        console.error('Error deleting chat room or updating statuses:', deleteError);
        res.status(500).json({ error: 'Failed to delete chat room or reset user statuses' });
      }
    } else {
      res.json({ message: 'Users still active, not deleting the chat room' });
    }
  });
});

app.get('/api/check-room-gender/:chatRoomId', (req, res) => {
  const { chatRoomId } = req.params;

  const query = `
    SELECT u.user_id, u.gender
    FROM chat_participation cp
    JOIN users u ON cp.user_id = u.id
    WHERE cp.chat_room_id = ?
  `;

  connection.query(query, [chatRoomId], (error, results) => {
    if (error) {
      console.error('Error checking room gender:', error);
      return res.status(500).json({ error: 'Failed to check room gender' });
    }
    res.json(results);
  });
});

// 관리자에 의한 채팅방 삭제 API 수정
app.delete('/api/chat-room/:chatRoomId', (req, res) => {
  const { chatRoomId } = req.params;

  const deleteMessagesQuery = 'DELETE FROM messages WHERE chat_room_id = ?';
  const deleteParticipationQuery = 'DELETE FROM chat_participation WHERE chat_room_id = ?';
  const deleteChatRoomQuery = 'DELETE FROM chat_room WHERE chat_room_id = ?';

  // 1. 메시지 삭제
  connection.query(deleteMessagesQuery, [chatRoomId], (error) => {
    if (error) {
      console.error('Error deleting messages:', error);
      return res.status(500).json({ error: 'Failed to delete messages' });
    }

    // 2. 참여 정보 삭제
    connection.query(deleteParticipationQuery, [chatRoomId], (error) => {
      if (error) {
        console.error('Error deleting participation:', error);
        return res.status(500).json({ error: 'Failed to delete participation' });
      }

      // 3. 채팅방 삭제
      connection.query(deleteChatRoomQuery, [chatRoomId], (error) => {
        if (error) {
          console.error('Error deleting chat room:', error);
          return res.status(500).json({ error: 'Failed to delete chat room' });
        }

        // 삭제 후 이벤트 발생
        io.to(chatRoomId).emit('chatRoomDeleted', { message: '채팅방이 삭제되었습니다.' });

        res.json({ message: 'Chat room and related data deleted successfully' });
      });
    });
  });
});

// 관리자에 의한 참가자 제거 API 수정
app.delete('/api/chat-room/:chatRoomId/leave/:userId', (req, res) => {
  const { chatRoomId, userId } = req.params;

  // 1. chat_participation 테이블에서 유저 제거
  connection.query(
    'DELETE FROM chat_participation WHERE chat_room_id = ? AND user_id = ?',
    [chatRoomId, userId],
    (deleteError, deleteResults) => {
      if (deleteError) {
        console.error('Error removing user from chat room:', deleteError);
        return res.status(500).json({ error: 'Failed to remove user' });
      }

      // 2. 남아있는 유저 목록 확인
      connection.query(
        'SELECT * FROM chat_participation WHERE chat_room_id = ?',
        [chatRoomId],
        (selectError, remainingUsers) => {
          if (selectError) {
            console.error('Error checking remaining users:', selectError);
            return res.status(500).json({ error: 'Failed to check remaining users' });
          }

          // 3. 유저가 없으면 채팅방 삭제
          if (remainingUsers.length === 0) {
            connection.query(
              'DELETE FROM chat_room WHERE chat_room_id = ?',
              [chatRoomId],
              (roomDeleteError) => {
                if (roomDeleteError) {
                  console.error('Error deleting chat room:', roomDeleteError);
                  return res.status(500).json({ error: 'Failed to delete chat room' });
                }

                console.log(`Chat room ${chatRoomId} deleted as no users remain.`);
              }
            );
          }

          // 이벤트 발생
          const socketId = userSocketMap[userId];
          if (socketId) {
            io.to(socketId).emit('removedFromChatRoom', { message: '관리자에 의해 채팅방에서 제거되었습니다.' });
          }

          res.status(200).json({ message: 'User removed, others remain in chat room' });
        }
      );
    }
  );
});

// 이전 메시지 로드 API
app.get('/api/chat-room/:chatRoomId/messages', (req, res) => {
  const { chatRoomId } = req.params;
  const query = `SELECT * FROM messages WHERE chat_room_id = ? ORDER BY sent_time ASC`;

  connection.query(query, [chatRoomId], (error, results) => {
    if (error) {
      console.error('Error fetching messages from MySQL:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    res.json(results);
  });
});

// 채팅방 생성 API
app.post('/api/create-chat-room', (req, res) => {
  const { search_id, chat_room_name } = req.body;

  const query = `INSERT INTO chat_room (search_id, chat_room_name, created_at) VALUES (?, ?, ?)`;
  const params = [search_id, chat_room_name, new Date()];

  connection.query(query, params, (error, results) => {
    if (error) {
      console.error('Error creating chat room in MySQL:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    const chatRoomId = results.insertId;

    // 생성된 채팅방 ID를 클라이언트로 전송
    res.json({ chat_room_id: chatRoomId, message: 'Chat room created successfully' });
  });
});

app.post('/api/join-chat-room', (req, res) => {
  const { chat_room_id, user_id } = req.body;

  // 이미 참여한 기록이 있는지 확인
  const checkQuery = `SELECT * FROM chat_participation WHERE chat_room_id = ? AND user_id = ?`;
  connection.query(checkQuery, [chat_room_id, user_id], (checkError, results) => {
    if (checkError) {
      console.error('Error checking user participation:', checkError);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    if (results.length > 0) {
      // 이미 참여 중인 경우 - 바로 채팅방에 입장시킴
      console.log('User is already in the chat room');
      return res.json({ message: 'Already in the chat room' });
    }

    // 참여하지 않은 경우 삽입
    const insertQuery = `INSERT INTO chat_participation (chat_room_id, user_id) VALUES (?, ?)`;
    connection.query(insertQuery, [chat_room_id, user_id], (insertError, insertResults) => {
      if (insertError) {
        console.error('Error adding user to chat room:', insertError);
        return res.status(500).json({ error: 'Failed to join chat room' });
      }

      console.log('User successfully added to chat room:', insertResults);
      res.json({ message: 'Successfully joined chat room' });
    });
  });
});

// 채팅방 목록을 반환하는 API 엔드포인트 추가
app.get('/api/chat-rooms', (req, res) => {
  const query = 'SELECT * FROM chat_room'; // chat_room 테이블에서 모든 채팅방을 가져옴

  connection.query(query, (error, results) => {
    if (error) {
      console.error('Error fetching chat rooms from MySQL:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    res.json(results); // 채팅방 목록을 클라이언트로 반환
  });
});

// 장소 검색 API
app.get('/search', async (req, res) => {
  const { query } = req.query;
  console.log(query);
  const apiKey = '84938a3d101dcfe481dcf72d7fdbbee4'; // 여기에 본인의 Kakao REST API 키를 넣어주세요

  try {
    const response = await axios.get('https://dapi.kakao.com/v2/local/search/keyword.json', {
      headers: {
        Authorization: `KakaoAK ${apiKey}`,
      },
      params: {
        query: query,
        size: 10,
      },
    });

    const data = response.data;
    console.log(data);

    // Kakao API의 검색 결과 형식을 클라이언트가 예상하는 형식으로 변환
    const results = data.documents.map((item) => ({
      name: item.place_name,
      address: item.address_name,
      lat: item.y,
      lng: item.x,
    }));

    res.json({ results });

  } catch (error) {
    console.error('Error fetching search results:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 사용자 평점 업데이트 API
app.post('/api/rate-user', (req, res) => {
  const { userId, newRating, chatRoomId } = req.body; // chatRoomId 추가

  // 1. 현재 유저의 rating과 ratingCount 가져오기
  const getUserQuery = 'SELECT rating, ratingCount FROM users WHERE id = ?';
  connection.query(getUserQuery, [userId], (err, results) => {
    if (err) {
      console.error('Error fetching user:', err);
      return res.status(500).json({ error: 'Error fetching user' });
    }

    const { rating, ratingCount } = results[0];
    const updatedCount = ratingCount + 1;

    // 2. 새 평점 계산
    const updatedRating = ((rating * ratingCount) + newRating) / updatedCount;

    // 3. users 테이블 업데이트
    const updateUserQuery = 'UPDATE users SET rating = ?, ratingCount = ? WHERE id = ?';
    connection.query(updateUserQuery, [updatedRating, updatedCount, userId], (err) => {
      if (err) {
        console.error('Error updating user rating:', err);
        return res.status(500).json({ error: 'Error updating user rating' });
      }

      res.json({
        message: 'Rating updated successfully',
        rating: updatedRating,
      });
    });
  });
});

// 로그인된 사용자 정보 확인 API
app.get('/api/user', (req, res) => {
  if (req.session.user) {
    res.json(req.session.user); // 세션에 저장된 사용자 정보 반환
  } else {
    res.status(401).json({ message: 'Unauthorized: No user logged in' });
  }
});


// 회원가입 API 엔드포인트 (/api/signup)
app.post('/api/signup', (req, res) => {
  const { username, user_id, password, gender, email } = req.body;

  // 입력 검증
  if (!username || !user_id || !password || !gender || !email) {
    return res.status(400).json({ message: '모든 필드를 입력해주세요.' });
  }

  // 중복된 user_id 또는 email 확인
  const checkQuery = 'SELECT * FROM users WHERE user_id = ? OR email = ?';
  connection.query(checkQuery, [user_id, email], (err, results) => {
    if (err) {
      console.error('Error checking existing user:', err);
      return res.status(500).json({ message: '서버 에러' });
    }

    if (results.length > 0) {
      return res.status(409).json({ message: '이미 사용 중인 아이디 또는 이메일입니다.' });
    }

    // 새로운 사용자 삽입 (비밀번호 평문 저장)
    const insertQuery = `
      INSERT INTO users 
      (username, user_id, password, gender, email, chat_room_status, rating, ratingCount, isAdmin) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const defaultValues = [username, user_id, password, gender, email, 0, 0, 0, 0];

    connection.query(insertQuery, defaultValues, (err, results) => {
      if (err) {
        console.error('Error inserting data into MySQL:', err);
        return res.status(500).json({ message: 'MySQL 삽입 에러' });
      }

      console.log('Data inserted into MySQL:', results);
      res.status(201).json({ message: '회원가입 성공' });
    });
  });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;

  const query = `SELECT * FROM users WHERE user_id = ? AND password = ?`;
  connection.query(query, [username, password], async (error, results) => {
    if (error) {
      console.error('Error MySQL:', error);
      res.status(500).json({ error: 'Error1' });
      return;
    }

    if (results.length > 0) {
      const user = results[0]; // 첫 번째 사용자 정보 가져오기
      // 비밀번호 비교
      // 세션에 사용자 정보 저장
      req.session.user = {
        id: user.id,
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        gender: user.gender, // 성별 정보 추가
        isAdmin: user.isAdmin, // 관리자 여부 추가
      };
      req.session.save((err) => {
        if (err) {
          console.error('세션 저장 오류:', err);
          return res.status(500).json({ error: '세션 저장 실패' });
        }
        res.json({ message: 'Login successful', user: req.session.user });
      });
    } else {
      res.status(401).json({ message: 'Invalid username or password' });
    }
  });
});

// 로그아웃 API 엔드포인트 (/api/logout)
app.post('/api/logout', (req, res) => {
  if (req.session.user) {
    req.session.destroy((err) => {
      if (err) {
        console.error('세션 파기 오류:', err);
        return res.status(500).json({ message: '로그아웃 중 오류가 발생했습니다.' });
      }
      res.clearCookie('connect.sid'); // 세션 쿠키를 클리어합니다. (쿠키 이름은 설정에 따라 다를 수 있습니다.)
      res.json({ message: '로그아웃 성공' });
    });
  } else {
    res.status(400).json({ message: '로그인된 사용자가 아닙니다.' });
  }
});

// MariaDB에서 검색 데이터를 가져오는 API 엔드포인트 추가
app.get('/api/last-search', (req, res) => {
  const query = 'SELECT * FROM search ORDER BY search_time DESC LIMIT 1'; // 가장 최근 검색 데이터를 가져옴

  connection.query(query, (error, results) => {
    if (error) {
      console.error('Error fetching data from MySQL:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    if (results.length > 0) {
      res.json(results[0]); // 가장 최근의 검색 결과 반환
    } else {
      res.status(404).json({ message: 'No search results found' });
    }
  });
});

// 새로운 API: 현재 로그인된 사용자의 rating과 ratingCount 가져오기
app.get('/api/user-rating', async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // 사용자 ID로 DB 조회
    connection.query(
      'SELECT rating, ratingCount FROM users WHERE id = ?',
      [user.id],
      (error, results) => {
        if (error) {
          console.error('Error fetching user rating:', error);
          return res.status(500).json({ error: 'Internal Server Error' });
        }

        if (results.length === 0) {
          return res.status(404).json({ error: 'User not found' });
        }

        res.json(results[0]);
      }
    );
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/save-destination', (req, res) => {
  if (!req.session.user) {
    console.error('Unauthorized access attempt');
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { startLocation, destination } = req.body;
  const userId = req.session.user.id; // 세션에서 사용자 ID 가져오기

  // 로그 추가: 서버에 도착한 데이터 확인
  console.log('User session data:', req.session.user);
  console.log('Received data for saving:', { startLocation, destination });

  // 데이터 검증
  if (!startLocation || !destination) {
    console.error('Invalid data received:', req.body);
    return res.status(400).json({ error: 'Invalid data' });
  }

  console.log('Checking if user exists in the database.');

  // 사용자가 실제로 존재하는지 확인하는 쿼리 추가
  const userCheckQuery = `SELECT * FROM users WHERE id = ?`;

  connection.query(userCheckQuery, [userId], (userCheckError, userCheckResults) => {
    if (userCheckError) {
      console.error('Error checking user in MySQL:', userCheckError);
      return res.status(500).json({ error: 'Internal Server Error', details: userCheckError.message });
    }

    if (userCheckResults.length === 0) {
      console.error('User not found in database');
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('User exists. Proceeding to save destination.');

    // 유저가 존재하는 경우 검색 데이터 저장
    const saveDestinationQuery = `INSERT INTO search (user_id, departure, destination) VALUES (?, ?, ?)`;

    connection.query(saveDestinationQuery, [userId, startLocation, destination], (error, results) => {
      if (error) {
        console.error('Error inserting data into MySQL:', error);
        return res.status(500).json({ error: 'Internal Server Error', details: error.message });
      }

      console.log('Search data saved to MySQL:', results);
      res.json({ message: 'Destination saved successfully' });
    });
  });
});

// 모든 GET 요청을 React 앱으로 전달
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// 서버 시작
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});
