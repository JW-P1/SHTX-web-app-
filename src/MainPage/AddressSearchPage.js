import React, { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaCircle, FaMapMarkerAlt, FaMap } from 'react-icons/fa'; // 지도 아이콘
import { MdMyLocation } from 'react-icons/md'; // 내 위치 아이콘
import './AddressSearchPage.css';
import { ErrorContext } from '../Error/ErrorContext'; // ErrorContext 임포트

// **lodash의 debounce 함수 임포트 (추가된 부분)**
import { debounce } from 'lodash';

function AddressSearchPage() {
  const [currentLocation, setCurrentLocation] = useState('');
  const [departure, setDeparture] = useState('');
  const [destination, setDestination] = useState('');
  const [departureCoords, setDepartureCoords] = useState(null);
  const [destinationCoords, setDestinationCoords] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [isDepartureInputActive, setIsDepartureInputActive] = useState(true);
  const locationInitialized = useRef(false); // 위치 초기화 추적
  const navigate = useNavigate();
  const location = useLocation();
  const psRef = useRef(null); // Kakao Places 객체 참조

  const { showError } = useContext(ErrorContext); // ErrorContext에서 showError 함수 가져오기

  // 입력창에 대한 ref 생성
  const departureInputRef = useRef(null);
  const destinationInputRef = useRef(null);

  // **디바운스된 검색 함수 생성 (추가된 부분)**
  const debouncedFetchSearchResults = useRef(
    debounce((query) => {
      fetchSearchResults(query);
    }, 500) // 0.5초 지연 시간 설정
  ).current;

  // 전달된 출발지 텍스트를 한 번만 입력창에 갱신
  useEffect(() => {
    if (!locationInitialized.current && location.state && location.state.departure) {
      const {
        isDepartureInputActive = true,
        departure = { location: '', coords: null },
        destination = { location: '', coords: null },
      } = location.state;

      setDeparture(departure.location);
      setDepartureCoords(departure.coords);
      setDestination(destination.location);
      setDestinationCoords(destination.coords);
      setIsDepartureInputActive(isDepartureInputActive);
      locationInitialized.current = true; // 위치 초기화 완료 표시
    }
  }, [location.state]);

  // Kakao Maps SDK 초기화 및 현재 위치 가져오기
  useEffect(() => {
    if (!locationInitialized.current) {
      // 위치 정보가 초기화되지 않은 경우에만 실행
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            fetchAddressFromCoords(latitude, longitude, true);
            setDepartureCoords({ lat: latitude, lng: longitude });
            locationInitialized.current = true; // 초기화 완료 표시
          },
          (error) => {
            console.error('위치 정보 가져오기 실패:', error);
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      } else {
        console.error('이 브라우저는 위치 서비스를 지원하지 않습니다.');
        showError('이 브라우저는 위치 서비스를 지원하지 않습니다.'); // showError로 에러 메시지 표시
      }
    }
    psRef.current = new window.kakao.maps.services.Places();
  }, [showError]);

  // 좌표로부터 주소 가져오기
  const fetchAddressFromCoords = (lat, lng, isInitial = false) => {
    const geocoder = new window.kakao.maps.services.Geocoder();
    geocoder.coord2Address(lng, lat, (result, status) => {
      if (status === window.kakao.maps.services.Status.OK) {
        const address = result[0].road_address
          ? result[0].road_address.address_name
          : result[0].address.address_name;
        setCurrentLocation(address);
        if (isInitial) {
          setDeparture(address); // 현재 위치를 출발지로 설정
          locationInitialized.current = true; // 위치 초기화 완료로 설정
        }
      } else {
        console.error('주소를 가져오는 데 실패했습니다.');
        showError('주소를 가져오는 데 실패했습니다.'); // showError로 에러 메시지 표시
      }
    });
  };

  const normalizeQuery = (query) => query.trim(); // 공백 제거

  // **검색 결과를 정규화된 쿼리로 요청 (기존 함수)**
  const fetchSearchResults = (query) => {
    const normalizedQuery = normalizeQuery(query);
    if (!normalizedQuery) {
      setSearchResults([]);
      return;
    }
    // 검색 결과 초기화
    setSearchResults([]);
    psRef.current.keywordSearch(normalizedQuery, (data, status) => {
      if (status === window.kakao.maps.services.Status.OK) {
        setSearchResults(data);
      } else {
        console.error('검색 결과를 가져오는 중 오류 발생');
        setSearchResults([]);
      }
    });
  };

  // **입력값 변경 시 디바운스된 검색 함수 호출하도록 수정 (변경된 부분)**
  const handleInputChange = (e, inputType) => {
    const value = e.target.value;
    if (inputType === 'departure') {
      setDeparture(value);
      setDepartureCoords(null); // 입력이 변경될 때 좌표 초기화
    } else {
      setDestination(value);
      setDestinationCoords(null); // 입력이 변경될 때 좌표 초기화
    }
    // **디바운스된 검색 함수 호출**
    debouncedFetchSearchResults(value);
  };

  // **컴포넌트 언마운트 시 디바운스된 함수 취소 (추가된 부분)**
  useEffect(() => {
    return () => {
      debouncedFetchSearchResults.cancel();
    };
  }, []);

  // 입력창 포커스 핸들러 (어느 입력창이 활성화됐는지 추적)
  const handleFocus = (inputType) => {
    setIsDepartureInputActive(inputType === 'departure');
  };

  // 리스트 항목 클릭 핸들러 (출발지 또는 목적지 선택)
  const handleLocationSelect = (result) => {
    // 현재 활성화된 입력창의 ref를 가져옴
    const activeInput = isDepartureInputActive
      ? departureInputRef.current
      : destinationInputRef.current;

    // 입력창에 스페이스바를 입력하여 조합 입력 완료
    if (activeInput) {
      // 현재 입력된 값에 스페이스바 추가
      const originalValue = activeInput.value;
      activeInput.value = originalValue + ' ';

      // React 상태 업데이트 (필요한 경우)
      if (isDepartureInputActive) {
        setDeparture(activeInput.value);
      } else {
        setDestination(activeInput.value);
      }

      // 입력 이벤트 트리거 (React가 변경 사항을 감지하도록)
      const event = new Event('input', { bubbles: true });
      activeInput.dispatchEvent(event);

      // 추가한 스페이스바 제거
      activeInput.value = originalValue;

      // React 상태 업데이트 (필요한 경우)
      if (isDepartureInputActive) {
        setDeparture(activeInput.value);
      } else {
        setDestination(activeInput.value);
      }

      activeInput.dispatchEvent(event);
    }

    // 나머지 기능 수행
    setTimeout(() => {
      const location = result.place_name;
      const coords = { lat: parseFloat(result.y), lng: parseFloat(result.x) };

      if (isDepartureInputActive) {
        setDeparture(location);
        setDepartureCoords(coords);
        // 출발지는 다른 페이지로 이동하지 않음
      } else {
        setDestination(location);
        setDestinationCoords(coords);

        if (departureCoords) {
          navigate('/destination', {
            state: {
              departure: { location: departure, coords: departureCoords },
              destination: { location, coords },
            },
          });
        } else {
          showError('출발지 정보를 확인해주세요.'); // showError로 에러 메시지 표시
        }
      }

      // 검색 결과 초기화
      setSearchResults([]);

      // 선택한 항목을 강조 표시 (선택 사항)
      setSearchResults((prevResults) =>
        prevResults.map((item) =>
          item.id === result.id ? { ...item, isActive: true } : { ...item, isActive: false }
        )
      );

      // 필요하면 입력창에 다시 포커스 설정
      // activeInput.focus();
    }, 100); // 100ms 지연
  };

  // 뒤로 가기 버튼 핸들러
  const handleBackClick = () => {
    navigate('/main');
  };

  const handleMapClick = () => {
    navigate('/search', {
      state: {
        isDepartureInputActive: isDepartureInputActive,
        departure: {
          location: departure,
          coords: departureCoords,
        },
        destination: {
          location: destination,
          coords: destinationCoords,
        },
      },
    });
  };

  // 매칭 버튼 클릭 핸들러 수정
  const handleMatchClick = () => {
    if (!departure || !destination || !departureCoords || !destinationCoords) {
      showError('출발지와 목적지를 확인해주세요.'); // showError로 에러 메시지 표시
      return;
    }
    navigate('/route-map', {
      state: {
        departure: { location: departure, coords: departureCoords },
        destination: { location: destination, coords: destinationCoords },
      },
    });
  };

  // '내 위치' 아이콘 클릭 핸들러
  const handleMyLocationClick = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          fetchAddressFromCoords(latitude, longitude, true);
          setDepartureCoords({ lat: latitude, lng: longitude });
        },
        (error) => {
          console.error('위치 정보 가져오기 실패:', error);
          showError('위치 정보를 가져오는 데 실패했습니다. 위치 서비스가 활성화되어 있는지 확인해주세요.'); // showError로 에러 메시지 표시
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      console.error('이 브라우저는 위치 서비스를 지원하지 않습니다.');
      showError('이 브라우저는 위치 서비스를 지원하지 않습니다.'); // showError로 에러 메시지 표시
    }
  };

  return (
    <div className="address-search-container">
      <div className="top-bar">
        <button className="back-button3" onClick={handleBackClick}>
          ←
        </button>
        <h2 className="page-title">주소 검색</h2>
      </div>

      <div className="search-section">
        <div className="search-input-container">
          <FaCircle size={8} color="#fc3f65" className="search-icon" /> {/* 출발지 아이콘 */}
          <input
            type="text"
            placeholder="[출발지] 입력 또는 검색"
            value={departure}
            onChange={(e) => handleInputChange(e, 'departure')}
            onFocus={() => handleFocus('departure')}
            className="departure-input"
            ref={departureInputRef} // ref 추가
          />
        </div>

        <div className="search-input-container">
          <FaMapMarkerAlt size={15} color="#fc3f65" className="search-icon" /> {/* 목적지 아이콘 */}
          <input
            type="text"
            placeholder="[도착지] 검색해주세요"
            value={destination}
            onChange={(e) => handleInputChange(e, 'destination')}
            onFocus={() => handleFocus('destination')}
            className="destination-input"
            ref={destinationInputRef} // ref 추가
          />
        </div>

        <div className="bottom-nav">
          <button className="nav-item match-button" onClick={handleMatchClick}>
            매칭
          </button>
          {/* 지도 아이콘 */}
          <span className="nav-item" onClick={handleMapClick}>
            <FaMap size={17} />
          </span>
          {/* 구분선 */}
          <div className="divider" />
          {/* 내 위치 아이콘 */}
          <span className="nav-item" onClick={handleMyLocationClick}>
            <MdMyLocation size={17} />
          </span>
        </div>

        <ul className="search-results">
          {searchResults.map((result, index) => (
            <li
              key={index}
              onClick={() => handleLocationSelect(result)}
              className={result.isActive ? 'active' : ''}
            >
              {result.place_name} {result.road_address_name && `(${result.road_address_name})`}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default AddressSearchPage;
