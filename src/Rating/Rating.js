import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Rating from 'react-rating-stars-component';
import axios from 'axios';
import './Rating.css';
import { ErrorContext } from '../Error/ErrorContext'; // ErrorContext 임포트

function UserRating() {
  const navigate = useNavigate();
  const location = useLocation();
  const { users, chatRoomId, departure, destination } = location.state || {}; // 출발지와 도착지 추가
  const [ratings, setRatings] = useState({}); // 각 사용자에 대한 별점 저장
  const [user, setUser] = useState(null); // 현재 사용자 정보

  const { showError } = useContext(ErrorContext); // ErrorContext에서 showError 함수 가져오기

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await axios.get('https://sharedtaxi.duckdns.org/api/user', {
          withCredentials: true,
        });
        setUser(response.data);
      } catch (error) {
        console.error('Error fetching user data:', error);
        showError('사용자 정보를 가져오는 중 오류가 발생했습니다. 로그인 페이지로 이동합니다.');
        setTimeout(() => {
          navigate('/');
        }, 2000); // 2초 지연 후 로그인 페이지로 이동
      }
    };
    fetchUser();
  }, [navigate, showError]);

  const handleRatingChange = (userId, newRating) => {
    setRatings((prevRatings) => ({
      ...prevRatings,
      [userId]: newRating,
    }));
  };

 // UserRating.js

const handleSubmit = async () => {
  try {
    // 1. 자신과 다른 유저에게 별점 부여
    for (const otherUser of users) {
      await axios.post('https://sharedtaxi.duckdns.org/api/rate-user', {
        userId: otherUser.id,
        newRating: ratings[otherUser.id] || 0,
        chatRoomId,
      });
    }

    // 2. 자신의 chat_room_status를 1로 업데이트
    await axios.put('https://sharedtaxi.duckdns.org/api/update-status', {
      userId: user.id,
      status: 1,
    });

    // 3. 모든 참가자의 chat_room_status를 확인하여 방 삭제 여부 결정
    const response = await axios.get(
      `https://sharedtaxi.duckdns.org/api/check-room-status/${chatRoomId}`
    );

    // 4. 이용 기록 저장 (chat_room_name 포함)
    await axios.post('https://sharedtaxi.duckdns.org/api/save-history', {
      chat_room_id: chatRoomId,
      user_id: user.id,
      departure: departure.location,
      destination: destination.location,
      chat_room_name: `${departure.location} to ${destination.location}`, // chat_room_name 전달
    });

    if (response.data.allRated) {
      // 모든 유저가 별점을 부여한 경우 방 삭제
      await axios.delete(`https://sharedtaxi.duckdns.org/api/chat-room/${chatRoomId}`);
      showError('모든 유저의 별점이 완료되어 방이 삭제되었습니다.');
    } else {
      showError('별점이 반영되었습니다.');
    }

    navigate('/main'); // 메인 페이지로 이동
  } catch (error) {
    console.error('Error submitting ratings:', error);
    showError('별점 반영 또는 이용 기록 저장에 실패했습니다.');
  }
};


  if (!user) return <div>Loading...</div>;

  return (
    <div className="rating-container">
      <h2>유저 별점</h2>
      {users.map((otherUser) => (
        <div key={otherUser.id} className="user-rating">
          <h3>{otherUser.username}</h3>
          <Rating
            count={5}
            size={30}
            activeColor="#ffd700"
            value={ratings[otherUser.id] || 0}
            onChange={(newRating) => handleRatingChange(otherUser.id, newRating)}
          />
        </div>
      ))}
      <button className="rating-button" onClick={handleSubmit}>
        별점 제출
      </button>
    </div>
  );
}

export default UserRating;
