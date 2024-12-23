import React, { useEffect } from 'react';

function SimpleKakaoMap() {
  useEffect(() => {
    // Kakao Maps API 스크립트를 동적으로 로드
    const script = document.createElement('script');
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=84938a3d101dcfe481dcf72d7fdbbee4`;
    script.async = true;
    document.head.appendChild(script);

    script.onload = () => {
      console.log('Kakao Maps API loaded.');

      // Kakao Maps API 초기화
      const container = document.getElementById('map'); // 지도를 표시할 div 
      const options = {
        center: new window.kakao.maps.LatLng(37.5665, 126.9780), // 지도의 중심좌표
        level: 5, // 지도의 확대 레벨
      };

      const map = new window.kakao.maps.Map(container, options); // 지도를 생성합니다
      console.log('Kakao map created:', map);
    };

    script.onerror = () => {
      console.error('Failed to load Kakao Maps API script.');
    };

    return () => {
      // 컴포넌트가 언마운트될 때 스크립트를 제거
      document.head.removeChild(script);
    };
  }, []);

  return (
    <div id="map" style={{ width: '100%', height: '100vh' }}></div>
  );
}

export default SimpleKakaoMap;
