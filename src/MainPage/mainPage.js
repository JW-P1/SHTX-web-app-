// MainPage.js

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Board.css';

function Board() {
  const [departure, setDeparture] = useState('');
  const navigate = useNavigate();
  const [chatRooms, setChatRooms] = useState([]);

  const handleSearchClick = () => {
    navigate('/search');
  };

  const addChatRoom = (newChatRoom) => {
    setChatRooms([...chatRooms, newChatRoom]);
  };

  return (
    <div className="board">
      <div className="input-container">
        <input
          type="text"
          placeholder="출발지 입력"
          value={departure}
          onChange={(e) => setDeparture(e.target.value)}
          onClick={handleSearchClick}
          className="input-field"
        />
      </div>
      <div className="chat-room-list">
        <h2>채팅방 목록</h2>
        <ul>
          {chatRooms.map((chatRoom, index) => (
            <li key={index}>
              출발지: {chatRoom.departure}, 목적지: {chatRoom.destination}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default Board;
