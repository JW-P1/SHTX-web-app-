import React, { useState, useEffect, useRef, useContext } from 'react';
import io from 'socket.io-client';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import './ChatRoom.css';
import { ErrorContext } from '../Error/ErrorContext'; // ErrorContext 임포트

function ChatRoom() {
  const { chatRoomId } = useParams();
  const location = useLocation();
  const { departure, destination } = location.state || {}; // 출발지와 도착지 받기
  const [messages, setMessages] = useState([]);
  const [usersInRoom, setUsersInRoom] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);

  const { showError } = useContext(ErrorContext); // ErrorContext에서 showError 함수 가져오기

  useEffect(() => {
    // 사용자 정보 가져오기
    const fetchUser = async () => {
      try {
        const response = await axios.get('https://sharedtaxi.duckdns.org/api/user', {
          withCredentials: true,
        });
        setUser(response.data);
      } catch (error) {
        console.error('Error fetching user data:', error);
        navigate('/login');
      }
    };

    fetchUser();

    // 소켓 연결 설정
    socketRef.current = io('/', {
      withCredentials: true,
    });

    socketRef.current.on('connect', () => {
      console.log('Socket connected:', socketRef.current.id);
      socketRef.current.emit('joinRoom', chatRoomId);
    });

    socketRef.current.on('roomUsers', (users) => {
      setUsersInRoom(users);
    });

    socketRef.current.on('receiveMessage', (message) => {
      setMessages((prevMessages) => [...prevMessages, message]);
    });

    socketRef.current.on('chatRoomDeleted', (data) => {
      showError(data.message);
      setTimeout(() => {
        navigate('/main');
      }, 2000);
    });

    socketRef.current.on('removedFromChatRoom', (data) => {
      showError(data.message);
      setTimeout(() => {
        navigate('/main');
      }, 2000);
    });

    // 서버에서 이전 메시지 가져오기
    const fetchMessages = async () => {
      try {
        const response = await axios.get(
          `https://sharedtaxi.duckdns.org/api/chat-room/${chatRoomId}/messages`
        );
        setMessages(response.data);
      } catch (err) {
        console.error('Error fetching messages:', err);
        showError('메시지를 가져오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();

    return () => {
      if (socketRef.current) {
        socketRef.current.emit('leaveRoom', chatRoomId);
        socketRef.current.disconnect();
      }
    };
  }, [chatRoomId, navigate, showError]);

  // 사용자 정보 업데이트 시 소켓에 사용자 ID 등록
  useEffect(() => {
    if (user && user.id && socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('registerUser', user.id);
    }
  }, [user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = () => {
    if (inputMessage.trim() === '') return;

    if (!user || !user.id) {
      showError('사용자 정보가 없습니다. 로그인이 필요합니다.');
      return;
    }

    const message = {
      chatRoomId: chatRoomId,
      userId: user.id,
      content: inputMessage,
      sent_time: new Date().toISOString(),
    };
    setInputMessage('');
    socketRef.current.emit('sendMessage', message, (response) => {
      if (response.status === 'ok') {
        setMessages((prevMessages) => [...prevMessages, response.message]);
      } else {
        showError('메시지 전송에 실패했습니다.');
      }
    });
  };

  const handleComplete = async () => {
    try {
      const response = await axios.get(
        `https://sharedtaxi.duckdns.org/api/chat-room/${chatRoomId}/users`
      );
      const otherUsers = response.data.filter((roomUser) => roomUser.id !== user.id);

      if (otherUsers.length === 0) {
        // 다른 사용자가 없을 때 처리
        // 1. 채팅방 삭제
        await axios.delete(`/api/chat-room/${chatRoomId}`, { withCredentials: true });

        // 2. 사용자의 chat_room_status를 2로 업데이트
        await axios.post(
          '/api/update-status1',
          {
            user_id: user.id,
            status: 2,
          },
          { withCredentials: true }
        );

        // 메인 페이지로 이동
        navigate('/main');
        return;
      }

      // 다른 사용자가 있을 경우 평점 주기 페이지로 이동
      navigate('/rating', {
        state: {
          users: otherUsers,
          chatRoomId,
          departure,
          destination,
        },
      });
    } catch (error) {
      console.error('Error handling completion:', error);
      showError('완료 처리 중 오류가 발생했습니다.');
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="chat-room-container">
      <header className="chat-room-header">
        <button className="back-button" onClick={() => navigate('/main')}>
          ←
        </button>
        <h2>공유택시 채팅방</h2>
        <button className="complete-payment-button" onClick={handleComplete}>
          완료
        </button>
      </header>

      <div className="chat-messages">
        {messages.map((message) => (
          <div
            key={message.message_id}
            className={`chat-message-container ${
              message.user_id === (user && user.id) ? 'mine-container' : 'other-container'
            }`}
          >
            {message.user_id !== (user && user.id) && (
              <div className="username-top">{message.username || 'Unknown'}</div>
            )}
            <div
              className={`chat-message ${
                message.user_id === (user && user.id) ? 'mine' : 'other'
              }`}
            >
              <div className="message-content">
                <div className="message-text">{message.message_content}</div>
                <div className="message-time">
                  {new Date(message.sent_time).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-container">
        <input
          type="text"
          className="chat-input"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="메시지를 입력하세요..."
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
        />
        <button className="send-button" onClick={sendMessage}>
          ➤
        </button>
      </div>
    </div>
  );
}

export default ChatRoom;
