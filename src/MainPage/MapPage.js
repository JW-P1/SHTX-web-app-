import React, { useState, useEffect, useCallback } from 'react';
import './map.css';

function MapWithCurrentLocation({ setDepartureLocation, setDestinationLocation, isDestinationMode }) {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [map, setMap] = useState(null);
  const [centerMarker, setCenterMarker] = useState(null);
  const [selectedCoords, setSelectedCoords] = useState(null);

  // 현재 위치 정보를 가져오는 useEffect
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          console.log('위치 허용됨:', position);
          setCurrentLocation({ lat: latitude, lng: longitude });
        },
        (error) => {
          console.error('사용자 위치를 가져오는 중 오류 발생:', error);
          setCurrentLocation({ lat: 37.5665, lng: 126.9780 }); // 기본 위치(서울)
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0, // 캐시된 위치 사용 방지
        }
      );
    } else {
      console.error('이 브라우저는 위치 정보를 지원하지 않습니다.');
      setCurrentLocation({ lat: 37.5665, lng: 126.9780 });
    }
  }, []);

  // 지도를 로딩하는 useEffect (currentLocation 변경 시에만 실행)
  useEffect(() => {
    if (!currentLocation) return; // currentLocation이 없으면 실행 중지

    console.log('현재 위치로 지도 초기화 시작:', currentLocation);

    const script = document.createElement('script');
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=84938a3d101dcfe481dcf72d7fdbbee4&autoload=false&libraries=services`;
    script.async = true;
    document.head.appendChild(script);

    script.onload = () => {
      window.kakao.maps.load(() => {
        console.log('Kakao Maps API 로드됨');
        const container = document.getElementById('map');
        const options = {
          center: new window.kakao.maps.LatLng(currentLocation.lat, currentLocation.lng),
          level: 3,
        };

        const kakaoMap = new window.kakao.maps.Map(container, options);
        setMap(kakaoMap);

        const marker = new window.kakao.maps.Marker({
          position: kakaoMap.getCenter(),
          map: kakaoMap,
          draggable: true,
        });
        setCenterMarker(marker);

        const debouncedUpdateAddress = debounce(updateAddress, 100);

        window.kakao.maps.event.addListener(kakaoMap, 'center_changed', () => {
          const center = kakaoMap.getCenter();
          marker.setPosition(center);
          const coords = { lat: center.getLat(), lng: center.getLng() };
          setSelectedCoords(coords);
          debouncedUpdateAddress(coords);
        });

        window.addEventListener('resize', () => kakaoMap.relayout());
      });
    };

    return () => {
      document.head.removeChild(script);
      window.removeEventListener('resize', () => map && map.relayout());
    };
  }, [currentLocation]); // currentLocation이 변경될 때마다 실행

  const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  };

  const searchDetailAddrFromCoords = useCallback((coords, callback) => {
    const geocoder = new window.kakao.maps.services.Geocoder();
    geocoder.coord2Address(coords.lng, coords.lat, callback);
  }, []);

  const updateAddress = (coords) => {
    searchDetailAddrFromCoords(coords, (result, status) => {
      if (status === window.kakao.maps.services.Status.OK) {
        const detailAddr = result[0].road_address
          ? result[0].road_address.address_name
          : result[0].address.address_name;

        if (isDestinationMode) {
          setDestinationLocation(detailAddr, coords);
        } else {
          setDepartureLocation(detailAddr, coords);
        }
      }
    });
  };

  return (
    <div className="map-container">
      <div id="map"></div>
      {isDestinationMode && (
        <div className="destination-footer">
          <p>{`도착지: ${selectedCoords ? `${selectedCoords.lat}, ${selectedCoords.lng}` : '선택되지 않음'}`}</p>
          <button className="destination-button">도착지로 설정</button>
        </div>
      )}
    </div>
  );
}

export default MapWithCurrentLocation;
