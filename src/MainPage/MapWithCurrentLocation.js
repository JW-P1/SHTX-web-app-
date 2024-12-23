import React, { useEffect } from 'react';

function MapWithCurrentLocation({ isDestinationMode, departureCoords, destinationCoords, setLocation }) {
  useEffect(() => {
    const mapContainer = document.getElementById('map');
    const options = {
      center: new window.kakao.maps.LatLng(37.5665, 126.9780), // 기본 좌표 (서울 시청)
      level: 3,
    };

    const map = new window.kakao.maps.Map(mapContainer, options);

    // 초기 위치 설정
    let initialPosition;
    if (isDestinationMode && destinationCoords) {
      initialPosition = new window.kakao.maps.LatLng(destinationCoords.lat, destinationCoords.lng);
    } else if (!isDestinationMode && departureCoords) {
      initialPosition = new window.kakao.maps.LatLng(departureCoords.lat, departureCoords.lng);
    } else {
      // 현재 위치로 설정
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const locPosition = new window.kakao.maps.LatLng(lat, lng);
          map.setCenter(locPosition);
        });
      }
    }

    if (initialPosition) {
      map.setCenter(initialPosition);
    }

    // 중심 마커 추가
    const marker = new window.kakao.maps.Marker({
      position: map.getCenter(),
    });
    marker.setMap(map);

    // 지도 중심이 변경될 때 마커 위치 업데이트
    window.kakao.maps.event.addListener(map, 'center_changed', function () {
      const latlng = map.getCenter();
      marker.setPosition(latlng);
    });

    // 지도 이동 완료 시 (idle 이벤트) 주소 정보 가져오기
    window.kakao.maps.event.addListener(map, 'idle', function () {
      const latlng = map.getCenter();
      const geocoder = new window.kakao.maps.services.Geocoder();

      geocoder.coord2Address(latlng.getLng(), latlng.getLat(), function (result, status) {
        if (status === window.kakao.maps.services.Status.OK) {
          const address = result[0].road_address
            ? result[0].road_address.address_name
            : result[0].address.address_name;

          // 위치 정보 업데이트
          setLocation(address, { lat: latlng.getLat(), lng: latlng.getLng() });
        }
      });
    });
  }, [isDestinationMode, departureCoords, destinationCoords, setLocation]);

  return <div id="map" style={{ width: '100%', height: '100%' }}></div>;
}

export default MapWithCurrentLocation;
