// Board.js

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Board.css';

function Board() {
  const [departure, setDeparture] = useState('');
  const navigate = useNavigate();

  const handleSearchClick = () => {
    navigate('/search');
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
    </div>
  );
}

export default Board;
