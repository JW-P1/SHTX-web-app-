import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './UsageHistory.css'; // 스타일링 파일

function UsageHistory() {
  const [history, setHistory] = useState([]); // 이용 기록 상태
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await axios.get('https://sharedtaxi.duckdns.org/api/user', {
          withCredentials: true,
        });
        const userId = response.data.id; // 현재 사용자 ID 가져오기

        const historyResponse = await axios.get(
          `https://sharedtaxi.duckdns.org/api/usage-history/${userId}`
        );
        console.log(historyResponse.data);
        setHistory(historyResponse.data);
      } catch (error) {
        console.error('Error fetching usage history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="usage-history-container">
      <h2>이용 기록</h2>
      {history.length === 0 ? (
        <p>이용 기록이 없습니다.</p>
      ) : (
        <ul className="history-list">
          {history.map((record, index) => (
            <li key={index} className="history-item">
              <h3>{record.chat_room_name}</h3>
              <p>출발지: {record.departure}</p>
              <p>도착지: {record.destination}</p>
              <p>이용 날짜: {new Date(record.created_at).toLocaleString()}</p>
            </li>
          ))}
        </ul>
      )}
      <button className='back-button' onClick={() => navigate(-1)}>뒤로가기</button>
    </div>
  );
}

export default UsageHistory;
