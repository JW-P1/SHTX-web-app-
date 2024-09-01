import React, { useState, useEffect } from 'react';
import './map.css';

function MapWithCurrentLocation() {
  const [currentLocation, setCurrentLocation] = useState({ lat: 33.450701, lng: 126.570667 }); // 기본 좌표 설정
  const [map, setMap] = useState(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCurrentLocation({ lat: latitude, lng: longitude });
        },
        (error) => {
          console.error('Error getting user location:', error);
        }
      );
    } else {
      console.error('Geolocation is not supported by this browser.');
    }
  }, []);

  useEffect(() => {
    // 지도 API 로드
    const script = document.createElement('script');
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=84938a3d101dcfe481dcf72d7fdbbee4&autoload=false`;
    script.async = true;
    document.head.appendChild(script);

    script.onload = () => {
      window.kakao.maps.load(() => {
        const container = document.getElementById('map'); // 지도를 표시할 div
        const options = {
          center: new window.kakao.maps.LatLng(currentLocation.lat, currentLocation.lng),
          level: 3
        };
        const kakaoMap = new window.kakao.maps.Map(container, options); // 지도 생성
        setMap(kakaoMap);

        // 현재 위치 마커 추가
        const markerPosition = new window.kakao.maps.LatLng(currentLocation.lat, currentLocation.lng);
        const marker = new window.kakao.maps.Marker({
          position: markerPosition
        });
        marker.setMap(kakaoMap);
      });
    };

    return () => script.remove(); // 컴포넌트가 언마운트될 때 스크립트 제거
  }, [currentLocation]);

  const handleCenterButtonClick = () => {
    if (map && currentLocation) {
      const moveLatLon = new window.kakao.maps.LatLng(currentLocation.lat, currentLocation.lng);
      map.panTo(moveLatLon);
    }
  };

  return (
    <div className="map-container">
      <div id="map" style={{ width: '100%', height: '400px' }}></div>
      <button className="center-button" onClick={handleCenterButtonClick}>
        내 위치로 이동
      </button>
    </div>
  );
}

export default MapWithCurrentLocation;
