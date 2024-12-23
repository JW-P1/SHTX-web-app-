import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import './Destination.css';
import { ErrorContext } from '../Error/ErrorContext'; // ErrorContext 임포트

function Destination() {
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = location; // `state`로부터 출발지와 목적지 정보 받음
  const [map, setMap] = useState(null);
  const [marker, setMarker] = useState(null);
  const [destinationCoords, setDestinationCoords] = useState(null);
  const [destinationAddress, setDestinationAddress] = useState('');
  const [user, setUser] = useState(null); // 로그인한 사용자 정보

  const { showError } = useContext(ErrorContext); // ErrorContext에서 showError 함수 가져오기

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await axios.get('https://sharedtaxi.duckdns.org/api/user', {
          withCredentials: true,
        });
        console.log(response.data);
        setUser(response.data);
      } catch (error) {
        console.error('Error fetching user data:', error);
        showError('로그인이 필요합니다. 로그인 페이지로 이동합니다.'); // showError로 에러 메시지 표시
        setTimeout(() => {
          navigate('/');
        }, 2000); // 2초 지연
      }
    };

    fetchUser();

    const script = document.createElement('script');
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=84938a3d101dcfe481dcf72d7fdbbee4&autoload=false&libraries=services`;
    script.async = true;
    document.head.appendChild(script);

    script.onload = () => {
      window.kakao.maps.load(() => {
        const container = document.getElementById('destination-map');
        const options = {
          center: new window.kakao.maps.LatLng(37.5665, 126.9780),
          level: 3,
        };
        const kakaoMap = new window.kakao.maps.Map(container, options);
        setMap(kakaoMap);

        const newMarker = new window.kakao.maps.Marker({
          position: kakaoMap.getCenter(),
          map: kakaoMap,
          clickable: true,
        });
        setMarker(newMarker);

        window.kakao.maps.event.addListener(kakaoMap, 'center_changed', () => {
          const center = kakaoMap.getCenter();
          newMarker.setPosition(center);
          setDestinationCoords(center);
          updateAddress(center);
        });

        // 초기 도착지 설정 (state로 전달된 좌표)
        if (state && state.destination && state.destination.coords) {
          const coords = new window.kakao.maps.LatLng(
            parseFloat(state.destination.coords.lat),
            parseFloat(state.destination.coords.lng)
          );
          kakaoMap.setCenter(coords);
          newMarker.setPosition(coords);
          setDestinationCoords(coords);
          updateAddress(coords);
        }
      });
    };

    return () => {
      document.head.removeChild(script);
    };
  }, [state, navigate, showError]);

  const updateAddress = (coords) => {
    const geocoder = new window.kakao.maps.services.Geocoder();
    geocoder.coord2Address(coords.getLng(), coords.getLat(), (result, status) => {
      if (status === window.kakao.maps.services.Status.OK) {
        const address = result[0].road_address
          ? result[0].road_address.address_name
          : result[0].address.address_name;
        setDestinationAddress(address);
      } else {
        console.error('주소를 가져오는 중 오류 발생');
        showError('주소를 가져오는 중 오류가 발생했습니다.'); // showError로 에러 메시지 표시
      }
    });
  };

  const handleBack = () => {
    navigate(-1); // 뒤로 가기 기능
  };

  const handleSaveDestination = () => {
    if (!user) {
      showError('로그인이 필요합니다.'); // showError로 에러 메시지 표시
      return;
    }

    const startLocation = state?.departure.location;
    const startCoords = state?.departure.coords;

    console.log('State:', state);
    console.log('Start Location:', startLocation);
    console.log('Destination Address:', destinationAddress);
    console.log('Start Coordinates:', startCoords);
    console.log('Destination Coordinates:', destinationCoords);

    if (!startLocation || !destinationAddress || !startCoords || !destinationCoords) {
      showError('출발지 또는 도착지 정보가 비어있습니다.'); // showError로 에러 메시지 표시
      return;
    }

    navigate('/route-map', {
      state: {
        departure: { location: startLocation, coords: startCoords },
        destination: {
          location: destinationAddress,
          coords: {
            lat: destinationCoords.getLat(),
            lng: destinationCoords.getLng(),
          },
        },
      },
    });
  };

  return (
    <div className="destination-container">
      <div className="back-button" onClick={handleBack}>
        <span className="back-button-icon">←</span>
      </div>
      <div id="destination-map" style={{ width: '100%', height: '100vh' }}></div>
      {destinationCoords && (
        <div className="destination-info">
          <p>도착지: {destinationAddress}</p>
          <button className="destination-button" onClick={handleSaveDestination}>
            도착지로 설정
          </button>
        </div>
      )}
    </div>
  );
}

export default Destination;
