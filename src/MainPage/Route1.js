import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import './RouteMap.css';
import { ErrorContext } from '../Error/ErrorContext'; // ErrorContext 임포트

function Route1() {
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = location; // 출발지와 도착지 정보
  const [map, setMap] = useState(null);

  const { showError } = useContext(ErrorContext); // ErrorContext에서 showError 함수 가져오기

  console.log('전달된 state:', state); // 좌표와 위치 데이터 확인
  const departure = state?.departure;
  const destination = state?.destination;

  useEffect(() => {
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
            new window.kakao.maps.Size(24, 35) // 마커 크기 조정
          ),
        });
        departureMarker.setMap(kakaoMap);

        const departureOverlay = new window.kakao.maps.CustomOverlay({
          content: `<div style="padding:5px 10px; background:black; color:white; border-radius:5px;">출발</div>`,
          position: departureMarker.getPosition(),
          yAnchor: 2.2, // 마커 위에 위치하도록 조정
        });
        departureOverlay.setMap(kakaoMap);

        // 도착지 마커와 텍스트 설정
        const destinationMarker = new window.kakao.maps.Marker({
          position: new window.kakao.maps.LatLng(destination.coords.lat, destination.coords.lng),
          image: new window.kakao.maps.MarkerImage(
            'https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png',
            new window.kakao.maps.Size(24, 35) // 마커 크기 조정
          ),
        });
        destinationMarker.setMap(kakaoMap);

        const destinationOverlay = new window.kakao.maps.CustomOverlay({
          content: `<div style="padding:5px 10px; background:#1a3d7c; color:white; border-radius:5px;">도착</div>`,
          position: destinationMarker.getPosition(),
          yAnchor: 2.2, // 마커 위에 위치하도록 조정
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

  const handleBack = () => {
    navigate('/main');
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
      </div>
    </div>
  );
}

export default Route1;
