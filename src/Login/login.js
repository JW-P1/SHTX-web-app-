import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios'; // axios 라이브러리 import
import { useNavigate } from 'react-router-dom'; // useNavigate import 추가
import './login.css';

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate(); // useNavigate 훅 사용
  const [error, setError] = useState('');

  const handleLogin = async () => {
    try {
      const response = await axios.post('/login', {
        username,
        password
      });

      console.log(response.status);
      console.log(response.data);

      if (response.status === 200) {
        console.log('Login successful');
        onLogin();

        navigate('/')
      } else {
        setError('Invalid username or password');
      }
    } catch (error) {
      console.error('Error logging in:', error);
      setError('Error logging in');
    }
  };

  return (
    <div className="login-container">
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
      <Link to="/signup">Signup</Link>
      <button>Forgot Password</button>
    </div>
  );
}

export default Login;
