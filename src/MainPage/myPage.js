// MyPage.js

import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaStar, FaStarHalfAlt, FaRegStar } from 'react-icons/fa'; // react-icons 사용
import './myPage.css';
import { ErrorContext } from '../Error/ErrorContext'; // ErrorContext 임포트

function MyPage() {
  const [user, setUser] = useState(null); // 사용자 정보
  const [ratingData, setRatingData] = useState(null); // 사용자 rating 정보
  const [isModalOpen, setIsModalOpen] = useState(false); // 모달 창 상태
  const [newUsername, setNewUsername] = useState(''); // 새로운 닉네임
  const [newPassword, setNewPassword] = useState(''); // 새로운 비밀번호
  const [confirmPassword, setConfirmPassword] = useState(''); // 비밀번호 확인
  const navigate = useNavigate();

  const { showError } = useContext(ErrorContext); // ErrorContext에서 showError 함수 가져오기

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const userResponse = await axios.get('https://sharedtaxi.duckdns.org/api/user', {
          withCredentials: true,
        });
        setUser(userResponse.data);

        // 사용자 rating 정보 가져오기
        const ratingResponse = await axios.get('https://sharedtaxi.duckdns.org/api/user-rating', {
          withCredentials: true, // 필요 시
        });
        setRatingData(ratingResponse.data);
      } catch (error) {
        console.error('Error fetching user data:', error);
        // 로그인되지 않은 상태라면 로그인 페이지로 이동
        showError('로그인이 필요합니다. 로그인 페이지로 이동합니다.');
        setTimeout(() => {
          navigate('/');
        }, 2000); // 2초 지연
      }
    };

    fetchUserInfo();
  }, [navigate, showError]);

  const handleLogout = async () => {
    try {
      const response = await axios.post(
        'https://sharedtaxi.duckdns.org/api/logout',
        {},
        {
          withCredentials: true, // 세션 쿠키 포함
        }
      );
      console.log(response.data.message); // '로그아웃 성공' 출력
      navigate('/');
    } catch (error) {
      console.error('Error during logout:', error);
      showError('로그아웃 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  const handleOpenModal = () => {
    setIsModalOpen(true);
    setNewUsername(user.username);
    setNewPassword('');
    setConfirmPassword('');
    // setUpdateError(''); // 제거
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    // setUpdateError(''); // 제거
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    // setUpdateError(''); // 제거

    // 비밀번호 확인
    if (newPassword !== confirmPassword) {
      // setUpdateError('비밀번호가 일치하지 않습니다.');
      showError('비밀번호가 일치하지 않습니다.');
      return;
    }

    try {
      const response = await axios.post(
        'https://sharedtaxi.duckdns.org/api/user/update',
        {
          username: newUsername,
          password: newPassword, // 비밀번호가 변경되지 않으면 빈 문자열 또는 null로 보내지 않는지 확인
        },
        {
          withCredentials: true, // 세션 쿠키 포함
        }
      );

      console.log(response.data.message);
      setUser(response.data.user);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error updating user data:', error);
      if (error.response && error.response.data && error.response.data.message) {
        // setUpdateError(error.response.data.message);
        showError(error.response.data.message);
      } else {
        // setUpdateError('사용자 정보 업데이트에 실패했습니다. 다시 시도해주세요.');
        showError('사용자 정보 업데이트에 실패했습니다. 다시 시도해주세요.');
      }
    }
  };

  const renderStars = (rating = 0) => {
    const stars = [];
    const fullStars = Math.floor(rating); // 정수 부분의 별 개수
    const halfStar = rating % 1 >= 0.5; // 반 별 여부

    // 전체 별 추가
    for (let i = 0; i < fullStars; i++) {
      stars.push(<FaStar key={`full-${i}`} color="#fc3f65" />);
    }

    // 반 별 추가
    if (halfStar) {
      stars.push(<FaStarHalfAlt key="half" color="#fc3f65" />);
    }

    // 빈 별 추가 (최대 5개)
    while (stars.length < 5) {
      stars.push(<FaRegStar key={`empty-${stars.length}`} color="#fc3f65" />);
    }

    return stars;
  };

  if (!user || !ratingData) {
    return <div>Loading...</div>;
  }

  return (
    <div className="mypage">
      <div className="profile-container">
        <div className="profile-content">
          <div className="profile-info">
            <h2>{user.username}</h2>
            <p>{user.email}</p>
            <p>성별: {user.gender === '남' ? '남성' : '여성'}</p>
          </div>
        </div>

        {/* 별점 표시 영역 */}
        <div className="rating-section">
          <h3>내 별점</h3>
          <div className="stars">{renderStars(ratingData.rating)}</div>
          <p>{ratingData.rating.toFixed(1)} / 5.0</p>
        </div>
      </div>

      <div className="menu-list">
        <div className="menu-item" onClick={handleOpenModal}>
          내 정보 변경하기 ›
        </div>
        <div className="menu-item" onClick={() => navigate('/usage-history')}>
          이용 기록 ›
        </div>
      </div>

      <button className="logout-button" onClick={handleLogout}>
        로그아웃
      </button>

      {/* 모달 창 */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>내 정보 변경하기</h2>
            <form onSubmit={handleUpdate}>
              <div className="form-group">
                <label>닉네임:</label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>새 비밀번호:</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="새 비밀번호를 입력하세요"
                />
              </div>
              <div className="form-group">
                <label>비밀번호 확인:</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="비밀번호를 다시 입력하세요"
                />
              </div>
              {/* 에러 메시지 표시 부분 제거 */}
              <div className="modal-buttons">
                <button type="submit" className="update-button">
                  업데이트
                </button>
                <button type="button" className="cancel-button" onClick={handleCloseModal}>
                  취소
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default MyPage;
