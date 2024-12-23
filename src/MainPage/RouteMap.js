import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import DatePicker from 'react-datepicker'; // DatePicker import
import 'react-datepicker/dist/react-datepicker.css'; // DatePicker CSS import
import './RouteMap.css';
import { ErrorContext } from '../Error/ErrorContext'; // ErrorContext 임포트

function RouteMap() {
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = location; // 출발지와 도착지 정보
  const [map, setMap] = useState(null);
  const [user, setUser] = useState(null);
  const [departureTime, setDepartureTime] = useState(null); // 출발 시간 상태 추가

  const { showError } = useContext(ErrorContext); // ErrorContext에서 showError 함수 가져오기

  const departure = state?.departure;
  const destination = state?.destination;

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

    if (!departure || !destination) {
      showError('출발지와 도착지 정보가 올바르지 않습니다. 메인 페이지로 이동합니다.');
      setTimeout(() => {
        navigate('/main');
      }, 2000); // 2초 지연 후 메인 페이지로 이동
      return;
    }

    const script = document.createElement('script');
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=84938a3d101dcfe481dcf72d7fdbbee4&autoload=false&libraries=services`;
    script.async = true;
    document.head.appendChild(script);

    script.onload = () => {
      window.kakao.maps.load(() => {
        const container = document.getElementById('route-map');
        const options = {
          center: new window.kakao.maps.LatLng(departure.coords.lat, departure.coords.lng),
          level: 5,
        };
        const kakaoMap = new window.kakao.maps.Map(container, options);
        setMap(kakaoMap);

        setupRoute(kakaoMap);
      });
    };

    return () => {
      document.head.removeChild(script);
    };
  }, [departure, destination, navigate, showError]);

  const setupRoute = async (kakaoMap) => {
    const url = `https://apis-navi.kakaomobility.com/v1/directions?origin=${departure.coords.lng},${departure.coords.lat}&destination=${destination.coords.lng},${destination.coords.lat}&priority=RECOMMEND`;

    try {
      const headers = {
        Authorization: 'KakaoAK a86d2e13dc20867896a9980a982966f6',
      };

      const response = await axios.get(url, { headers });
      console.log('경로 응답:', response.data);

      if (response.data?.routes?.length > 0) {
        const route = response.data.routes[0];
        const path = route.sections[0].roads.flatMap((road) =>
          road.vertexes
            .map((vertex, index) =>
              index % 2 === 0
                ? new window.kakao.maps.LatLng(road.vertexes[index + 1], vertex)
                : null
            )
            .filter((point) => point)
        );

        // 경로에 맞춰 폴리라인 생성
        const polyline = new window.kakao.maps.Polyline({
          path,
          strokeWeight: 5,
          strokeColor: '#3a7bdd',
          strokeOpacity: 0.7,
          strokeStyle: 'solid',
        });
        polyline.setMap(kakaoMap);

        // 출발지 마커와 텍스트 설정
        const departureMarker = new window.kakao.maps.Marker({
          position: new window.kakao.maps.LatLng(departure.coords.lat, departure.coords.lng),
          image: new window.kakao.maps.MarkerImage(
            'https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png',
            new window.kakao.maps.Size(24, 35)
          ),
        });
        departureMarker.setMap(kakaoMap);

        const departureOverlay = new window.kakao.maps.CustomOverlay({
          content: `<div style="padding:5px 10px; background:black; color:white; border-radius:5px;">출발</div>`,
          position: departureMarker.getPosition(),
          yAnchor: 2.2,
        });
        departureOverlay.setMap(kakaoMap);

        // 도착지 마커와 텍스트 설정
        const destinationMarker = new window.kakao.maps.Marker({
          position: new window.kakao.maps.LatLng(destination.coords.lat, destination.coords.lng),
          image: new window.kakao.maps.MarkerImage(
            'https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png',
            new window.kakao.maps.Size(24, 35)
          ),
        });
        destinationMarker.setMap(kakaoMap);

        const destinationOverlay = new window.kakao.maps.CustomOverlay({
          content: `<div style="padding:5px 10px; background:#1a3d7c; color:white; border-radius:5px;">도착</div>`,
          position: destinationMarker.getPosition(),
          yAnchor: 2.2,
        });
        destinationOverlay.setMap(kakaoMap);

        // 경로에 맞게 지도의 범위 설정
        const bounds = new window.kakao.maps.LatLngBounds();
        path.forEach((point) => bounds.extend(point));
        kakaoMap.setBounds(bounds);
      } else {
        showError('경로를 찾을 수 없습니다. 다시 시도해주세요.');
      }
    } catch (error) {
      console.error('경로 요청 중 오류 발생:', error);
      showError('경로 요청 중 오류가 발생했습니다.');
    }
  };

  const handleMatchStart = async () => {
    if (!user) {
      showError('사용자 정보가 없습니다. 로그인이 필요합니다.');
      return;
    }
  
    if (!departureTime) {
      showError('출발 시간을 선택해주세요.');
      return;
    }
  
    try {
      // 관리자 권한 확인: 이름이 "관리자" 또는 아이디가 "admin"이면 매칭 제한 없음
      const isAdmin = user.name === '관리자' || user.id === 'admin';
  
      if (!isAdmin) {
        // 관리자 권한이 없는 경우에만 chat_room_status 확인
        const statusResponse = await axios.get(
          `https://sharedtaxi.duckdns.org/api/check-user-status/${user.id}`,
          { withCredentials: true }
        );
  
        const currentStatus = statusResponse.data.chat_room_status;
        if (currentStatus === 0) {
          // chat_room_status가 0이면 매칭 제한
          showError('현재 다른 채팅방에 참여 중입니다. 새로운 매칭에 참여할 수 없습니다.');
          return;
        }
      }
  
      const data = {
        user_id: user.id,
        departure: departure.location,
        destination: destination.location,
        departureCoords: departure.coords,
        destinationCoords: destination.coords,
        departure_time: departureTime.toISOString(), // 출발 시간을 ISO 문자열로 전송
      };
  
      const response = await axios.post(
        'https://sharedtaxi.duckdns.org/api/start-matching',
        data,
        {
          withCredentials: true,
        }
      );
  
      if (response.data.chat_room_id) {
        const chatRoomId = response.data.chat_room_id;
  
        // 매칭된 방에 참여 중인 다른 유저들의 성별 확인
        const participationResponse = await axios.get(
          `https://sharedtaxi.duckdns.org/api/check-room-gender/${chatRoomId}`
        );
  
        const otherGenders = participationResponse.data
          .filter((participant) => participant.user_id !== user.id)
          .map((participant) => participant.gender);
  
        const hasOppositeGender = otherGenders.some((gender) => gender !== user.gender);
  
        // 이성이 있을 경우 알림
        if (hasOppositeGender) {
          const confirmEntry = window.confirm(
            '이성이 포함되어 있습니다. 입장하시겠습니까?'
          );
          if (!confirmEntry) {
            return; // 매칭 취소
          }
        }
  
        // chat_room_status를 0으로 업데이트
        await axios.post('https://sharedtaxi.duckdns.org/api/update-status1', {
          user_id: user.id,
          status: 0,
        });
  
        navigate(`/chatroom/${chatRoomId}`);
      } else {
        showError('매칭에 실패했습니다. 다시 시도해주세요.');
      }
    } catch (error) {
      console.error('에러로그:', error);
      showError('매칭 중 오류가 발생했습니다.');
    }
  };
  

  const handleBack = () => {
    navigate('/address-search');
  };

  return (
    <div className="route-map-container">
      <div className="back-button" onClick={handleBack}>
        <span className="back-button-icon">X</span>
      </div>
      <div id="route-map" style={{ width: '100%', height: '100vh' }}></div>
      {/* 주소와 매칭 시작 버튼 */}
      <div className="info-container">
        <div className="address">
          <p>출발지: {departure.location}</p>
          <div className="search-divider"></div>
          <p>도착지: {destination.location}</p>
        </div>
        {/* 출발 시간 선택 추가 */}
        <div className="departure-time-picker">
          <label>출발 시간 선택:</label>
          <DatePicker
            selected={departureTime}
            onChange={(date) => setDepartureTime(date)}
            showTimeSelect
            timeFormat="HH:mm"
            timeIntervals={10}
            dateFormat="yyyy-MM-dd HH:mm"
            minDate={new Date()}
            placeholderText="출발 시간을 선택하세요"
          />
        </div>
        <button className="match-button" onClick={handleMatchStart}>
          매칭 시작
        </button>
      </div>
    </div>
  );
}

export default RouteMap;
