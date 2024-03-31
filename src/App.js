import React, { useState } from 'react';
import Login from './Login/login.js';
import MainPage from './MainPage/mainPage.js'; // MainPage 컴포넌트도 필요한 경우 import합니다.

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // 로그인 상태를 변경하는 함수
  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  return (
    <div className="App">
      {/* 로그인 상태에 따라 다른 컴포넌트 렌더링 */}
      {isLoggedIn ? (
        <MainPage />
      ) : (
        <Login onLogin={handleLogin} /> // onLogin 콜백 함수를 전달 변경
      )}
    </div>
  );
}

export default App;