import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './Departure.css';

function Departure() {
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = location; // 전달된 출발지 정보 받기
  const [map, setMap] = useState(null);
  const [marker, setMarker] = useState(null);
  const [departureAddress, setDepartureAddress] = useState(''); // 출발지 텍스트 저장
  const [departureCoords, setDepartureCoords] = useState(null); // 출발지 좌표 저장

  useEffect(() => {
    const script = document.createElement('script');
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=84938a3d101dcfe481dcf72d7fdbbee4&autoload=false&libraries=services`;
    script.async = true;
    document.head.appendChild(script);

    script.onload = () => {
      window.kakao.maps.load(() => {
        const container = document.getElementById('departure-map');
        const options = {
          center: new window.kakao.maps.LatLng(37.5665, 126.9780), // 기본 좌표 설정
          level: 3,
        };
        const kakaoMap = new window.kakao.maps.Map(container, options);
        setMap(kakaoMap);

        const newMarker = new window.kakao.maps.Marker({
          position: kakaoMap.getCenter(),
          map: kakaoMap,
        });
        setMarker(newMarker);

        // 지도 이동 시 마커 위치와 주소 갱신
        window.kakao.maps.event.addListener(kakaoMap, 'center_changed', () => {
          const center = kakaoMap.getCenter();
          newMarker.setPosition(center);
          setDepartureCoords({ lat: center.getLat(), lng: center.getLng() }); // 좌표 저장
          updateAddress(center); // 주소 갱신
        });

        if (state && state.coords) {
          const coords = new window.kakao.maps.LatLng(state.coords.lat, state.coords.lng);
          kakaoMap.setCenter(coords);
          newMarker.setPosition(coords);
          setDepartureCoords({ lat: coords.getLat(), lng: coords.getLng() }); // 초기 좌표 설정
          updateAddress(coords); // 초기 주소 설정
        }
      });
    };

    return () => {
      document.head.removeChild(script);
    };
  }, [state]);

  const updateAddress = (coords) => {
    const geocoder = new window.kakao.maps.services.Geocoder();
    geocoder.coord2Address(coords.getLng(), coords.getLat(), (result, status) => {
      if (status === window.kakao.maps.services.Status.OK) {
        const address = result[0].road_address
          ? result[0].road_address.address_name
          : result[0].address.address_name;
        setDepartureAddress(address); // 출발지 텍스트 저장
      }
    });
  };
  const handleBack = () => {
    navigate(-1); // 뒤로 가기 기능
  };
  const handleSaveDeparture = () => {
    if (!departureAddress || !departureCoords) {
      alert('출발지 정보가 비어있습니다.');
      return;
    }

    console.log('출발지 텍스트:', departureAddress);
    console.log('출발지 좌표:', departureCoords);

    // 출발지 텍스트와 좌표를 AddressSearchPage로 전달
    navigate('/address-search', {
      state: {
        departure: {
          location: departureAddress,
          coords: departureCoords,
        },
      },
    });
  };

  return (
    <div className="departure-container">
      <div className="back-button" onClick={handleBack}>
        <span className="back-button-icon">←</span>
      </div>
      <div id="departure-map" style={{ width: '100%', height: '100vh' }}></div>
      {departureAddress && (
        <div className="departure-info">
          <p>출발지: {departureAddress}</p>
          <button className="departure-button" onClick={handleSaveDeparture}>
            출발지<br />설정
          </button>
        </div>
      )}
    </div>
  );
}

export default Departure;
