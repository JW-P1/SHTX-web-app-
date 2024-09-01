// App.js

import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './Login/login.js';
import MainPage from './MainPage/mainPage.js';
import SearchPage from './MainPage/searchPage';
import SignupPage from './Login/signup.js';
import Map from './MainPage/MapPage.js';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // 로그인 상태를 변경하는 함수
  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
  };

  // 회원가입 후 자동 로그인
  const handleSignupSuccess = (username, password) => {
    console.log(`New user signed up: ${username}, ${password}`);
    setIsLoggedIn(true);
  };

  return (
    <Router>
      <Routes>
        {/* 로그인한 경우 MainPage으로 이동 */}
        <Route path="/" element={isLoggedIn ? <MainPage /> : <Login onLogin={handleLoginSuccess} />} />
        
        {/* 추가적인 경로 설정 */}
        <Route path="/search" element={<SearchPage />} />
        <Route path="/signup" element={<SignupPage onSignup={handleSignupSuccess} />} />
        <Route path="/login" element={<Login onLogin={handleLoginSuccess} />} />
        <Route path="/map" element={<Map />} />
      </Routes>
    </Router>
  );
}

export default App;
