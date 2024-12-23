import React, { useState, useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './signup.css';
import { ErrorContext } from '../Error/ErrorContext'; // ErrorContext 임포트

function Signup({ onSignup }) {
  const [username, setUsername] = useState('');
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [gender, setGender] = useState('');
  const [email, setEmail] = useState('');
  // const [error, setError] = useState(''); // 불필요해져서 제거

  const { showError } = useContext(ErrorContext); // ErrorContext에서 showError 함수 가져오기

  const navigate = useNavigate();

  const handleSignup = async () => {
    if (!username || !userId || !password || !gender || !email) {
      showError('모든 필드를 입력해주세요.'); // showError 함수로 에러 메시지 표시
      return;
    }

    try {
      const response = await axios.post(
        'https://sharedtaxi.duckdns.org/api/signup',
        {
          username,
          user_id: userId,
          password,
          gender,
          email,
        },
        {
          withCredentials: true,
        }
      );

      console.log(response.data);

      // 회원가입 성공 시 알림과 함께 로그인 페이지로 이동
      // alert를 showError로 대체
      showError('회원가입에 성공했습니다! 로그인 해주세요.');

      // 약간의 지연 후 로그인 페이지로 이동 (모달을 볼 수 있도록)
      setTimeout(() => {
        navigate('/');
      }, 2000); // 2초 지연
    } catch (error) {
      console.error('Error signing up:', error);
      showError('회원가입에 실패했습니다. 다시 시도해주세요.');
    }
  };

  return (
    <div className="signup-container">
      <h1>Let's Start!</h1>
      <div className="signup-form">
        <div className="form-group">
          <label>닉네임:</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="닉네임을 입력하세요"
          />
        </div>
        <div className="form-group">
          <label>아이디:</label>
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="아이디를 입력하세요"
          />
        </div>
        <div className="form-group">
          <label>비밀번호:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호를 입력하세요"
          />
        </div>
        <div className="form-group">
          <label>성별:</label>
          <select value={gender} onChange={(e) => setGender(e.target.value)}>
            <option value="">선택하세요</option>
            <option value="남">남</option>
            <option value="여">여</option>
          </select>
        </div>
        <div className="form-group">
          <label>이메일:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일을 입력하세요"
          />
        </div>
        {/* 에러 메시지 표시 부분 제거 */}
        {/* {error && <p className="error-message">{error}</p>} */}
        <button onClick={handleSignup} className="signup-button">
          회원가입
        </button>
      </div>
    </div>
  );
}

export default Signup;
