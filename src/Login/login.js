import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './login.css';
import { FaUserAlt, FaLock } from 'react-icons/fa'; // react-icons 사용
import { ErrorContext } from '../Error/ErrorContext'; // ErrorContext 임포트

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const { showError } = useContext(ErrorContext); // ErrorContext에서 showError 함수 가져오기

  const handleLogin = async () => {
    try {
      // 서버에 로그인 요청
      const response = await axios.post(
        'https://sharedtaxi.duckdns.org/login',
        {
          username,
          password,
        },
        {
          withCredentials: true, // 세션 쿠키를 포함하여 서버로 전송
        }
      );

      // 로그인 성공 여부 확인
      if (response.status === 200 && response.data.user) {
        console.log('Login successful');
        onLogin(); // 부모 컴포넌트에서 로그인 상태를 업데이트하는 함수 호출
        const userId = response.data.user.id;
        console.log('로그인중 유저 아이디:', userId);

        // 1. chat_room_status 확인
        const statusResponse = await axios.get(
          `https://sharedtaxi.duckdns.org/api/check-user-status/${userId}`,
          {
            withCredentials: true,
          }
        );
        console.log('status 확인 응답:', statusResponse);

        // 2. 상태에 따라 chat_room_status 업데이트
        const currentStatus = statusResponse.data.chat_room_status;

        const updateResponse = await axios.post(
          'https://sharedtaxi.duckdns.org/api/update-status1',
          {
            user_id: userId,
            status: currentStatus,
          },
          {
            withCredentials: true,
          }
        );
        console.log('status 업데이트 응답:', updateResponse);

        navigate('/main'); // 로그인 성공 시 메인 페이지로 이동
      } else {
        setErrorMessage();
      }
    } catch (error) {
      console.error('Error logging in:', error.message, error.response ? error.response.data : '');
      setErrorMessage();
    }
  };

  const setErrorMessage = () => {
    showError('아이디 또는 비밀번호가 잘못되었습니다.'); // showError로 에러 메시지 표시
  };

  const handleSignupRedirect = () => {
    navigate('/signup');
  };

  return (
    <div className="login-container">
      <div className="logo">공유택시</div>
      <div className="welcome-text">Welcome</div>

      <div className="input-group">
        <FaUserAlt className="input-icon" />
        <input
          type="text"
          placeholder="아이디"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="input-field"
        />
      </div>

      <div className="input-group">
        <FaLock className="input-icon" />
        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input-field"
        />
      </div>

      <button onClick={handleLogin} className="login-button">
        로그인
      </button>
      <button onClick={handleSignupRedirect} className="signup-button">
        이메일 회원가입
      </button>
      <Link to="/forgot-password" className="forgot-password">
        아이디 / 비밀번호 찾기
      </Link>
    </div>
  );
}

export default Login;
