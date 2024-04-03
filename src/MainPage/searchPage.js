import React, { useState } from 'react';
import './searchPage.css';
import axios from 'axios';

function SearchPage() {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [error, setError] = useState('');

  const handleInputChange = async (e) => {
    const inputValue = e.target.value;
    setQuery(inputValue);

    try {
      const response = await axios.get(`http://localhost:4002/search?query=${encodeURIComponent(inputValue)}`);
      if (response.status !== 200) {
        throw new Error('Failed to fetch search results');
      }
      const data = response.data;
      setSearchResults(data.results);
      setError('');
    } catch (error) {
      console.error('Error fetching search results:', error);
      setSearchResults([]);
      setError('Error fetching search results. Please try again later.');
    }
  };

  return (
    <div className="search-container">
      <input
        type="text"
        value={query}
        onChange={handleInputChange}
        placeholder="Enter search query..."
      />
      {error && <p className="error">{error}</p>}
      <ul className="search-results">
        {searchResults.map((result, index) => (
          <li key={index}>{result.name}</li>
        ))}
      </ul>
    </div>
  );
}

export default SearchPage;
