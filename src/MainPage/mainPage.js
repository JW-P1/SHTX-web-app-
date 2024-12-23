import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaSearch, FaCar, FaTaxi, FaLongArrowAltDown, FaMapMarkerAlt } from 'react-icons/fa'; // Font Awesome 아이콘 사용
import './Board.css';
import axios from 'axios';
import { ErrorContext } from '../Error/ErrorContext'; // ErrorContext 임포트

function Board() {
  const [departure, setDeparture] = useState('');
  const [chatRooms, setChatRooms] = useState([]);
  const [user, setUser] = useState(null); // 현재 로그인한 유저 정보
  const navigate = useNavigate();
  const [geocoder, setGeocoder] = useState(null);

  const { showError } = useContext(ErrorContext); // ErrorContext에서 showError 함수 가져오기

  // 사용자 정보 가져오기
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await axios.get('https://sharedtaxi.duckdns.org/api/user', {
          withCredentials: true,
        });
        setUser(response.data);
      } catch (error) {
        console.error('Error fetching user data:', error);
        showError('사용자 정보를 가져오는 중 오류가 발생했습니다.'); // showError로 에러 메시지 표시
      }
    };

    fetchUserInfo();
  }, [showError]);

  useEffect(() => {
    const loadKakaoMaps = () => {
      if (window.kakao && window.kakao.maps && window.kakao.maps.services) {
        setGeocoder(new window.kakao.maps.services.Geocoder());
      } else {
        const script = document.createElement('script');
        script.src =
          'https://dapi.kakao.com/v2/maps/sdk.js?appkey=84938a3d101dcfe481dcf72d7fdbbee4&autoload=false&libraries=services';
        script.async = true;
        script.onload = () => {
          window.kakao.maps.load(() =>
            setGeocoder(new window.kakao.maps.services.Geocoder())
          );
        };
        document.head.appendChild(script);
      }
    };
    loadKakaoMaps();
  }, []);

  // 좌표로부터 장소명 가져오기
  const getPlaceNameFromCoordinates = (lat, lng, callback) => {
    if (!window.kakao || !window.kakao.maps || !window.kakao.maps.services) {
      return callback(null);
    }

    const places = new window.kakao.maps.services.Places();

    const coord = new window.kakao.maps.LatLng(lat, lng);

    const callbackFunc = (result, status) => {
      if (status === window.kakao.maps.services.Status.OK && result[0]) {
        callback(result[0].place_name);
      } else {
        callback(null);
      }
    };
    // 주변에서 가장 가까운 장소 한 개만 검색
    places.categorySearch(' ', callbackFunc, {
      location: coord,
      radius: 50, // 검색 반경 (미터 단위)
      sort: window.kakao.maps.services.SortBy.DISTANCE,
      size: 1,
    });
  };

  // 채팅방 정보 가져오기
  useEffect(() => {
    if (geocoder) {
      const fetchChatRooms = async () => {
        try {
          const response = await axios.get('https://sharedtaxi.duckdns.org/api/chat-rooms', {
            withCredentials: true,
          });
          const updatedChatRooms = await Promise.all(
            response.data.map(
              (room) =>
                new Promise((resolve) => {
                  // 출발지 장소명 또는 주소 가져오기
                  getPlaceNameFromCoordinates(
                    room.departure_lat,
                    room.departure_lng,
                    (departurePlaceName) => {
                      if (departurePlaceName) {
                        room.simpleDeparture = departurePlaceName;
                        checkDestination();
                      } else {
                        getAddressFromCoordinates(
                          room.departure_lat,
                          room.departure_lng,
                          (simpleDeparture) => {
                            room.simpleDeparture = simpleDeparture;
                            checkDestination();
                          }
                        );
                      }
                    }
                  );

                  // 목적지 처리 함수
                  const checkDestination = () => {
                    // 목적지 장소명 또는 주소 가져오기
                    getPlaceNameFromCoordinates(
                      room.destination_lat,
                      room.destination_lng,
                      (destinationPlaceName) => {
                        if (destinationPlaceName) {
                          room.simpleDestination = destinationPlaceName;
                          finalizeRoom();
                        } else {
                          getAddressFromCoordinates(
                            room.destination_lat,
                            room.destination_lng,
                            (simpleDestination) => {
                              room.simpleDestination = simpleDestination;
                              finalizeRoom();
                            }
                          );
                        }
                      }
                    );
                  };

                  // 모든 정보가 준비되면 resolve 호출
                  const finalizeRoom = () => {
                    // 출발 시간 형식 변환
                    const formattedDepartureTime = formatDepartureTime(room.departure_time);
                    resolve({
                      ...room,
                      formattedDepartureTime,
                    });
                  };
                })
            )
          );
          setChatRooms(updatedChatRooms);
        } catch (error) {
          console.error('Error fetching chat rooms:', error);
          showError('채팅방 정보를 가져오는 중 오류가 발생했습니다.'); // showError로 에러 메시지 표시
        }
      };
      fetchChatRooms();
    }
  }, [geocoder, showError]);

  const getAddressFromCoordinates = (lat, lng, callback) => {
    if (!geocoder) return callback('Unknown Location');
    geocoder.coord2Address(lng, lat, (result, status) => {
      const address =
        status === window.kakao.maps.services.Status.OK
          ? result[0].road_address?.address_name || result[0].address.address_name
          : 'Unknown Location';
      callback(address);
    });
  };

  const formatDepartureTime = (departureTime) => {
    const date = new Date(departureTime);
    return date.toLocaleString([], {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleMapIconClick = (room) => {
    navigate('/route1', {
      state: {
        departure: {
          location: room.simpleDeparture,
          coords: { lat: room.departure_lat, lng: room.departure_lng },
        },
        destination: {
          location: room.simpleDestination,
          coords: { lat: room.destination_lat, lng: room.destination_lng },
        },
      },
    });
  };

  const handleSearchClick = () => navigate('/address-search');

  const handleChatRoomClick = async (chatRoomId, room) => {
    if (!user) {
      showError('로그인이 필요합니다.'); // showError로 에러 메시지 표시
      return;
    }

    try {
      // chat_room_status가 0인지 2인지 확인
      const statusResponse = await axios.get(
        `https://sharedtaxi.duckdns.org/api/check-user-status/${user.id}`,
        { withCredentials: true }
      );

      const currentStatus = statusResponse.data.chat_room_status;
      console.log('메인 current', currentStatus);

      if (currentStatus === 0) {
        // 현재 참여 중인 채팅방이 해당 채팅방인지 확인
        const participationResponse = await axios.get(
          `https://sharedtaxi.duckdns.org/api/get-user-chat-room/${user.id}`,
          { withCredentials: true }
        );

        const currentChatRoomId = participationResponse.data.chat_room_id;
        console.log('현재 참여 중인 채팅방 ID:', currentChatRoomId);

        if (currentChatRoomId !== chatRoomId) {
          // 다른 채팅방에 참여 중인 경우 입장 제한
          showError(
            '현재 다른 채팅방에 참여 중입니다. 다른 채팅방에 입장할 수 없습니다.'
          ); // showError로 에러 메시지 표시
          return;
        }
      }

      if (currentStatus === 2) {
        // chat_participation에서 해당 채팅방의 다른 참여자들의 성별 확인
        const participationResponse = await axios.get(
          `https://sharedtaxi.duckdns.org/api/check-room-gender/${chatRoomId}`
        );
        console.log('다른사람성별', participationResponse);
        const otherGenders = participationResponse.data
          .filter((participant) => participant.user_id !== user.id)
          .map((participant) => participant.gender);
        console.log(user.gender);
        const hasOppositeGender = otherGenders.some(
          (gender) => gender !== user.gender
        );

        // 이성이 있을 경우 확인 창 표시
        if (hasOppositeGender) {
          const confirmEntry = window.confirm(
            '이성이 포함되어 있습니다. 입장하시겠습니까?'
          );
          if (!confirmEntry) return;
        }
      }

      // 채팅방에 참여 기록 저장
      await axios.post('https://sharedtaxi.duckdns.org/api/join-chat-room', {
        chat_room_id: chatRoomId,
        user_id: user.id,
      });

      // chat_room_status를 0으로 업데이트
      await axios.post('https://sharedtaxi.duckdns.org/api/update-status1', {
        user_id: user.id,
        status: 0,
      });

    // **채팅방으로 이동 (방의 출발지와 목적지를 전달)**
    navigate(`/chatroom/${chatRoomId}`, {
      state: {
        departure: {
          location: room.simpleDeparture,
          coords: { lat: room.departure_lat, lng: room.departure_lng },
        },
        destination: {
          location: room.simpleDestination,
          coords: { lat: room.destination_lat, lng: room.destination_lng },
        },
      },
    });
    } catch (error) {
      console.error('Error joining chat room:', error);
      showError('채팅방에 참여하는 중 오류가 발생했습니다.'); // showError로 에러 메시지 표시
    }
  };

  // 관리자 페이지로 이동하는 함수
  const handleAdminClick = () => {
    navigate('/admin'); // 실제 관리자 페이지 경로로 변경하세요
  };

  return (
    <div className="board-container">
      {/* 상단바 */}
      <div className="header-bar">
        {user && user.isAdmin ? (
          <button className="admin-button" onClick={handleAdminClick}>
            관리자
          </button>
        ) : null}

        <span className="logo-text">공유택시</span>
      </div>

      {/* 내용 */}
      <div className="content-container">
        <div className="input-container">
          <div className="search-wrapper">
            <input
              type="text"
              placeholder="출발지 입력"
              value={departure}
              onChange={(e) => setDeparture(e.target.value)}
              onFocus={handleSearchClick}
              className="input-field"
            />
            <FaSearch className="search-icon" />
          </div>
        </div>

        <div className="chat-room-list">
          <ul>
            {chatRooms.map((room, index) => (
              <li key={index} className="chat-room-card">
                {/* 출발지와 목적지 정보 */}
                <div className="chat-room-info">
                  <div className="location">
                    <FaCar className="location-icon" /> {room.simpleDeparture}
                  </div>
                  <FaLongArrowAltDown className="arrow-icon" />
                  <div className="location">
                    <FaTaxi className="location-icon" /> {room.simpleDestination}
                  </div>
                  {/* 출발 시간 표시 */}
                  <div className="departure-time">
                    출발 시간: {room.formattedDepartureTime}
                  </div>
                  {/* 입장 버튼 */}
                  <div className="enter-button-container">
                    <button
                      className="enter-button"
                      onClick={() => handleChatRoomClick(room.chat_room_id, room)}
                    >
                      입장
                    </button>
                  </div>
                </div>

                {/* 지도 아이콘 */}
                <div className="button-container">
                  <FaMapMarkerAlt
                    className="map-icon"
                    onClick={() => handleMapIconClick(room)}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default Board;
