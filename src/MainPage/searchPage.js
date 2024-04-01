import React, { useState } from 'react';
import './searchPage.css';
import axios from 'axios';

function SearchPage() {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    setQuery(e.target.value);
  };

  const fetchSearchResults = async () => {
    try {
      const response = await axios.get(`http://localhost:4000/search?query=${encodeURIComponent(query)}`);
      if (response.status !== 200) {
        throw new Error('Failed to fetch search results');
      }
      const data = response.data;
      console.log(data);
      setSearchResults(data.results);
      console.log(searchResults);
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
      <button onClick={fetchSearchResults}>Search</button>
      {error && <p className="error">{error}</p>}
      <ul className="search-results">
      {searchResults?.map((result, index) => (
        <li key={index}>{result.name}</li>
        ))}
      </ul>
    </div>
  );
}

export default SearchPage;
