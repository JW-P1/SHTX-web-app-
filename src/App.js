// App.js

import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './Login/login.js';
import MainPage from './MainPage/mainPage.js';
import SearchPage from './MainPage/searchPage';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // 로그인 상태를 변경하는 함수
  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={isLoggedIn ? <MainPage /> : <Login onLogin={handleLogin} />} />
        <Route path="/search" element={<SearchPage />} />
      </Routes>
    </Router>
  );
}

export default App;
