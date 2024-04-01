import React, { useState, useEffect } from 'react';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';
import './map.css';

function MapWithCurrentLocation() {
  const [currentLocation, setCurrentLocation] = useState(null);
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

  // 내 위치를 지도 중심으로 설정하는 함수
  const handleCenterButtonClick = () => {
    if (map && currentLocation) {
      map.panTo(currentLocation);
    }
  };

  // 구글 지도의 기본 UI 컨트롤을 비활성화하는 옵션 설정
  const mapOptions = {
    disableDefaultUI: true,
  };

  return (
    <div className="map-container">
      <LoadScript googleMapsApiKey="YOUR_API_KEY">
        <GoogleMap
          className="google-map"
          mapContainerStyle={{ width: '100%', height: '100%' }}
          zoom={13}
          center={currentLocation || { lat: 0, lng: 0 }}
          options={mapOptions} // 구글 지도 옵션 설정
          onLoad={(map) => setMap(map)} // 지도가 로드될 때 호출되는 함수
        >
          {currentLocation && <Marker position={currentLocation} />}
        </GoogleMap>
      </LoadScript>
      {/* 내 위치를 가운데로 고정하는 버튼 */}
      <button className="center-button" onClick={handleCenterButtonClick}>
        내 위치로 이동
      </button>
    </div>
  );
}

export default MapWithCurrentLocation;
