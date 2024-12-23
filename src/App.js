import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './Login/login.js';
import MainPage from './MainPage/mainPage.js';
import './GlobalStyles.css'; // 공통 CSS 파일 불러오기
import SearchPage from './MainPage/searchPage.js';
import SignupPage from './Login/signup.js';
import Map from './MainPage/MapPage.js';
import MyPage from './MainPage/myPage.js';
import ChatRoom from './ChatRoom/ChatRoom.js';
import DestinationPage from './MainPage/Destination.js';
import RouteMap from './MainPage/RouteMap.js';
import Route1 from './MainPage/Route1.js';
import Layout from './MainPage/Layout/Layout.js'; // 레이아웃 컴포넌트 가져오기
import AddressSearchPage from './MainPage/AddressSearchPage';
import DeparturePage from './MainPage/Departure.js';
import RatingPage from './Rating/Rating.js';
import UsageHistory from './History/UsageHistory.js';
import AdminPage from './Admin/AdminPage.js';
import { ErrorProvider } from './Error/ErrorContext.js';
import ErrorModal from './Error/ErrorModal.js';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
  };

  const handleSignupSuccess = (username, password) => {
    console.log(`New user signed up: ${username}, ${password}`);
    setIsLoggedIn(true);
  };

  return (
    // 앱 전체를 ErrorProvider로 감싸기
    <ErrorProvider>
      <Router>
        <div className="app-container">
          {/* ErrorModal을 포함하여 에러 메시지를 표시 */}
          <ErrorModal />
          <Routes>
            {/* 로그인과 회원가입 페이지는 레이아웃 없이 렌더링 */}
            <Route path="/" element={<Login onLogin={handleLoginSuccess} />} />
            <Route path="/signup" element={<SignupPage onSignup={handleSignupSuccess} />} />
            <Route path="/destination" element={<DestinationPage />} />
            <Route path="/departure" element={<DeparturePage />} />
            <Route path="/route-map" element={<RouteMap />} />
            <Route path="/route1" element={<Route1 />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/chatroom" element={<ChatRoom />} />
            <Route path="/map" element={<Map />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/rating" element={<RatingPage />} />
            <Route path="/address-search" element={<AddressSearchPage />} />
            <Route path="/chatroom/:chatRoomId" element={<ChatRoom />} />
            {/* 나머지 경로는 Layout을 사용해 하단 내비게이션 바 유지 */}
            <Route element={<Layout />}>
              <Route path="/main" element={<MainPage />} />
              <Route path="/mypage" element={<MyPage />} />
              <Route path="/usage-history" element={<UsageHistory />} />
            </Route>
          </Routes>
        </div>
      </Router>
    </ErrorProvider>
  );
}

export default App;
