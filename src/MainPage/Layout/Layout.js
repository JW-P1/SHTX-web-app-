import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { FaHome, FaComments, FaUserAlt } from 'react-icons/fa';
import axios from 'axios';
import './Layout.css';

function Layout() {
  const navigate = useNavigate();
  const [chatRoomId, setChatRoomId] = useState(null);

  useEffect(() => {
    // 사용자의 chat_participation 조회하여 chat_room_id 설정
    const fetchChatRoomId = async () => {
      try {
        const response = await axios.get('https://sharedtaxi.duckdns.org/api/user', {
          withCredentials: true,
        });
        const userId = response.data.id;

        // userId로 chat_participation 조회
        const chatRoomResponse = await axios.get(
          `https://sharedtaxi.duckdns.org/api/get-user-chat-room/${userId}`
        );
        setChatRoomId(chatRoomResponse.data.chat_room_id);
      } catch (error) {
        console.error('Error fetching chat room ID:', error);
      }
    };

    fetchChatRoomId();
  }, []);

  const handleChatClick = () => {
    if (chatRoomId) {
      navigate(`/chatroom/${chatRoomId}`);
    } else {
      alert("현재 참여 중인 채팅방이 없습니다.");
    }
  };

  return (
    <div className="layout-container">
      <div className="content">
        <Outlet />
      </div>
      <div className="bottom-navigation">
        <div className="nav-icon" onClick={() => navigate('/main')}>
          <FaHome size={24} />
        </div>
        <div className="nav-icon" onClick={handleChatClick}>
          <FaComments size={24} />
        </div>
        <div className="nav-icon" onClick={() => navigate('/mypage')}>
          <FaUserAlt size={24} />
        </div>
      </div>
    </div>
  );
}

export default Layout;
