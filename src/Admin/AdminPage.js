import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FaSearch, FaCar, FaTaxi, FaLongArrowAltDown, FaMapMarkerAlt } from 'react-icons/fa'; // Font Awesome 아이콘 사용
import './AdminPage.css';
import { ErrorContext } from '../Error/ErrorContext'; // ErrorContext 임포트

function AdminPage() {
  const [chatRooms, setChatRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [participants, setParticipants] = useState([]);
  const [messages, setMessages] = useState([]);
  const [user, setUser] = useState(null); // 현재 로그인한 사용자 정보
  const navigate = useNavigate(); // useNavigate 훅 추가

  const { showError } = useContext(ErrorContext); // ErrorContext에서 showError 함수 가져오기

  useEffect(() => {
    // 관리자 여부 확인
    const fetchUser = async () => {
      try {
        const response = await axios.get('https://sharedtaxi.duckdns.org/api/user', {
          withCredentials: true,
        });
        setUser(response.data);
        if (!response.data.isAdmin) {
          showError('관리자만 접근 가능합니다.'); // showError로 에러 메시지 표시
          // 접근 권한이 없으므로 메인 페이지로 이동 (약간 지연)
          setTimeout(() => {
            navigate('/main');
          }, 2000); // 2초 지연
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        navigate('/'); // 로그인 페이지로 이동
      }
    };

    fetchUser();
  }, [navigate, showError]);

  useEffect(() => {
    // 채팅방 목록을 가져오는 함수
    const fetchChatRooms = async () => {
      try {
        const response = await axios.get('https://sharedtaxi.duckdns.org/api/chat-rooms', {
          withCredentials: true,
        });
        console.log('Chat rooms data:', response.data); // 응답 데이터 확인
        setChatRooms(response.data);
      } catch (error) {
        console.error('Error fetching chat rooms:', error);
        showError('채팅방 목록을 가져오는 중 오류가 발생했습니다.');
      }
    };

    fetchChatRooms();
  }, [showError]);

  const handleSearch = (event) => {
    setSearchQuery(event.target.value);
  };

  const handleRoomClick = async (room) => {
    setSelectedRoom(room);

    // 참가자 목록 가져오기
    try {
      const response = await axios.get(
        `https://sharedtaxi.duckdns.org/api/chat-room/${room.chat_room_id}/users`,
        { withCredentials: true }
      );
      setParticipants(response.data);
    } catch (error) {
      console.error('Error fetching participants:', error);
      showError('참가자 목록을 가져오는 중 오류가 발생했습니다.');
    }

    // 채팅 내역 가져오기
    try {
      const response = await axios.get(
        `https://sharedtaxi.duckdns.org/api/chat-room/${room.chat_room_id}/messages`,
        { withCredentials: true }
      );
      setMessages(response.data);
    } catch (error) {
      console.error('Error fetching messages:', error);
      showError('채팅 내역을 가져오는 중 오류가 발생했습니다.');
    }
  };

  const handleCloseChatRoom = async () => {
    if (selectedRoom) {
      try {
        await axios.delete(
          `https://sharedtaxi.duckdns.org/api/chat-room/${selectedRoom.chat_room_id}`,
          { withCredentials: true }
        );
        showError('채팅방이 닫혔습니다.');
        setSelectedRoom(null);
        // 채팅방 목록 갱신
        const response = await axios.get('https://sharedtaxi.duckdns.org/api/chat-rooms', {
          withCredentials: true,
        });
        setChatRooms(response.data);
      } catch (error) {
        console.error('Error closing chat room:', error);
        showError('채팅방을 닫는 중 오류가 발생했습니다.');
      }
    }
  };

  const handleRemoveParticipant = async (userId) => {
    if (selectedRoom) {
      try {
        await axios.delete(
          `https://sharedtaxi.duckdns.org/api/chat-room/${selectedRoom.chat_room_id}/leave/${userId}`,
          { withCredentials: true }
        );
        showError('참가자가 제거되었습니다.');
        // 참가자 목록 갱신
        const response = await axios.get(
          `https://sharedtaxi.duckdns.org/api/chat-room/${selectedRoom.chat_room_id}/users`,
          { withCredentials: true }
        );
        setParticipants(response.data);
      } catch (error) {
        console.error('Error removing participant:', error);
        showError('참가자를 제거하는 중 오류가 발생했습니다.');
      }
    }
  };

  // 검색 필터
  const filteredRooms = chatRooms.filter((room) =>
    room.chat_room_id && room.chat_room_id.toString().includes(searchQuery)
  );

  const handleBack = () => {
    navigate(-1); // 이전 페이지로 이동
  };

  return (
    <div className="admin-page">
      {/* 헤더 바 */}
      <div className="header-bar">
        <button className="back-button" onClick={handleBack} aria-label="뒤로가기">
          ← 
        </button>
        <h2>채팅방 관리</h2>
      </div>

      <div className="search-container1">
        <input
          type="text"
          placeholder="채팅방 아이디로 검색"
          value={searchQuery}
          onChange={handleSearch}
        />
      </div>

      <div className="main-content">
        <div className="chat-room-list">
          <table className="chat-room-table">
            <thead>
              <tr>
                <th>채팅방 아이디</th>
                <th>채팅방 이름</th>
                <th>생성 시간</th>
              </tr>
            </thead>
            <tbody>
              {filteredRooms.map((room) => (
                <tr
                  key={room.chat_room_id}
                  onClick={() => handleRoomClick(room)}
                  className={selectedRoom?.chat_room_id === room.chat_room_id ? 'selected' : ''}
                >
                  <td>{room.chat_room_id}</td>
                  <td>{room.chat_room_name}</td>
                  <td>{new Date(room.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selectedRoom && (
          <div className="chat-room-details">
            <h3>채팅방 상세 정보</h3>
            <p>
              <strong>채팅방 아이디:</strong> {selectedRoom.chat_room_id}
            </p>
            <p>
              <strong>채팅방 이름:</strong> {selectedRoom.chat_room_name}
            </p>
            <p>
              <strong>생성 시간:</strong>{' '}
              {new Date(selectedRoom.created_at).toLocaleString()}
            </p>

            <button onClick={handleCloseChatRoom} className="close-room-button">
              채팅방 닫기
            </button>

            <h4>참가자 목록</h4>
            <table className="participant-table">
              <thead>
                <tr>
                  <th>유저 아이디</th>
                  <th>닉네임</th>
                  <th>이메일</th>
                  <th>제거</th>
                </tr>
              </thead>
              <tbody>
                {participants.map((participant) => (
                  <tr key={participant.id}>
                    <td>{participant.id}</td>
                    <td>{participant.username}</td>
                    <td>{participant.email}</td>
                    <td>
                      <button
                        onClick={() => handleRemoveParticipant(participant.id)}
                        className="remove-participant-button"
                      >
                        제거
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h4>채팅 내역</h4>
            <div className="chat-history">
              {messages.map((message) => (
                <div key={message.message_id} className="message-item">
                  <p>
                    <strong>{message.username}:</strong> {message.message_content}
                  </p>
                  <p className="message-time">
                    {new Date(message.sent_time).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminPage;
