import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './searchPage.css';
import MapWithCurrentLocation from './MapWithCurrentLocation.js'; // 파일명 수정

function SearchPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    isDepartureInputActive = true,
    departure = { location: '', coords: null },
    destination = { location: '', coords: null },
  } = location.state || {};

  const [departureQuery, setDepartureQuery] = useState(departure.location);
  const [destinationQuery, setDestinationQuery] = useState(destination.location);
  const [isDestinationMode, setIsDestinationMode] = useState(!isDepartureInputActive);

  const [departureCoords, setDepartureCoords] = useState(departure.coords);
  const [destinationCoords, setDestinationCoords] = useState(destination.coords);

  const handleBack = () => {
    navigate('/address-search', {
      state: {
        isDepartureInputActive: isDepartureInputActive,
        departure: {
          location: departureQuery,
          coords: departureCoords,
        },
        destination: {
          location: destinationQuery,
          coords: destinationCoords,
        },
      },
    });
  };

  const handleSetLocation = (location, coords) => {
    if (isDestinationMode) {
      setDestinationQuery(location);
      setDestinationCoords(coords);
    } else {
      setDepartureQuery(location);
      setDepartureCoords(coords);
    }
  };

  const handleInputFocus = (mode) => {
    navigate('/address-search', {
      state: {
        isDepartureInputActive: mode === 'departure',
        departure: {
          location: departureQuery,
          coords: departureCoords,
        },
        destination: {
          location: destinationQuery,
          coords: destinationCoords,
        },
      },
    });
  };

  return (
    <div className="search-container">
      <div className="back-button" onClick={handleBack}>
        <span className="back-button-icon">←</span>
      </div>

      {/* 지도 영역 */}
      <div className="map-container">
        <MapWithCurrentLocation
          isDestinationMode={isDestinationMode}
          departureCoords={departureCoords}
          destinationCoords={destinationCoords}
          setLocation={handleSetLocation}
        />
      </div>

      {/* 검색창 */}
      <div className="search-box">
        <input
          type="text"
          value={departureQuery}
          onChange={(e) => setDepartureQuery(e.target.value)}
          onFocus={() => handleInputFocus('departure')}
          placeholder="출발지 입력"
          className="search-input"
        />

        <div className="search-divider"></div>

        <input
          type="text"
          value={destinationQuery}
          onChange={(e) => setDestinationQuery(e.target.value)}
          onFocus={() => handleInputFocus('destination')}
          placeholder="도착지 입력"
          className="search-input"
        />
      </div>
    </div>
  );
}

export default SearchPage;
