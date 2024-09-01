import React, { useState } from 'react';
import './searchPage.css';
import Map from './MapPage.js';
import axios from 'axios';

function SearchPage() {
  const [departureQuery, setDepartureQuery] = useState('');
  const [departureResults, setDepartureResults] = useState([]);
  const [departureError, setDepartureError] = useState('');
  const [destinationQuery, setDestinationQuery] = useState('');
  const [destinationResults, setDestinationResults] = useState([]);
  const [destinationError, setDestinationError] = useState('');

  const handleDepartureInputChange = async (e) => {
    const inputValue = e.target.value;
    setDepartureQuery(inputValue);

    try {
      const response = await axios.get(`http://34.47.83.155:4002/search?query=${encodeURIComponent(inputValue)}`);
      if (response.status !== 200) {
        throw new Error('Failed to fetch departure results');
      }
      const data = response.data;
      setDepartureResults(data.results);
      setDepartureError('');
    } catch (error) {
      console.error('Error fetching departure results:', error);
      setDepartureResults([]);
      setDepartureError('Failed to fetch departure results');
    }
  };

  const handleDestinationInputChange = async (e) => {
    const inputValue = e.target.value;
    setDestinationQuery(inputValue);

    try {
      const response = await axios.get(`http://34.47.83.155:4002/search?query=${encodeURIComponent(inputValue)}`);
      if (response.status !== 200) {
        throw new Error('Failed to fetch destination results');
      }
      const data = response.data;
      setDestinationResults(data.results);
      setDestinationError('');
    } catch (error) {
      console.error('Error fetching destination results:', error);
      setDestinationResults([]);
      setDestinationError('Failed to fetch destination results');
    }
  };

  const handleSelectLocation = (result, type) => {
    if (type === 'departure') {
      setDepartureQuery(result.name);
    } else if (type === 'destination') {
      setDestinationQuery(result.name);
    }
  };

  return (
    <div className="search-container">
      <div className="search-box">
        <input
          type="text"
          value={departureQuery}
          onChange={handleDepartureInputChange}
          placeholder="Enter departure query..."
          className="search-input"
        />
        <ul>
          {departureResults.map((result, index) => (
            <li key={index} onClick={() => handleSelectLocation(result, 'departure')}>{result.name}</li>
          ))}
        </ul>
        {departureError && <p className="error">{departureError}</p>}
      </div>

      <div className="search-box">
        <input
          type="text"
          value={destinationQuery}
          onChange={handleDestinationInputChange}
          placeholder="Enter destination query..."
          className="search-input"
        />
        <ul>
          {destinationResults.map((result, index) => (
            <li key={index} onClick={() => handleSelectLocation(result, 'destination')}>{result.name}</li>
          ))}
        </ul>
        {destinationError && <p className="error">{destinationError}</p>}
      </div>

      <div className="map-container">
        <Map />
      </div>
    </div>
  );
}

export default SearchPage;
