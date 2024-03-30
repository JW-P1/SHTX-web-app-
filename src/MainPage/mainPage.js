import React, { useState, useEffect } from 'react';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';

function MapWithCurrentLocation() {
  const [currentLocation, setCurrentLocation] = useState(null);

  // 컴포넌트가 마운트될 때 한 번 실행되며 사용자의 현재 위치를 가져옵니다.
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
  }, []); // 빈 배열을 전달하여 컴포넌트가 마운트될 때 한 번만 실행됩니다.

  return (
    <div style={{ width: '100%', height: '400px' }}>
      <LoadScript googleMapsApiKey="AIzaSyCtkyr7KdtL40hQPLIMi52xVPaKobvEY04">
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '100%' }}
          zoom={13}
          center={currentLocation || { lat: 0, lng: 0 }} // 현재 위치가 없을 경우 기본값으로 (0, 0) 설정
        >
          {currentLocation && <Marker position={currentLocation} />}
        </GoogleMap>
      </LoadScript>
    </div>
  );
}

export default MapWithCurrentLocation;
