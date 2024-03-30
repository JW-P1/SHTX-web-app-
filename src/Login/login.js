import React, { useState } from 'react';
import './login.css';

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = () => {
    // 여기서는 간단하게 유효성 검사만 수행합니다. 실제로는 서버와 통신하여 로그인을 처리해야 합니다.
    if (username === 'user' && password === 'password') {
      onLogin(); // 로그인 상태를 변경하는 콜백 함수 호출
    } else {
      setError('Invalid username or password');
    }
  };

  return (
    <div className="login-container"> {/* CSS 클래스 적용 */}
      <h1>Login Page</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <div>
        <label>Username:</label>
        <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} />
      </div>
      <div>
        <label>Password:</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <button onClick={handleLogin}>Login</button>
    </div>
  );
}

export default Login;