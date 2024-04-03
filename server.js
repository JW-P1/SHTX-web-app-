const express = require('express');
const path = require('path');
const app = express();
const cors = require('cors');
const axios = require('axios');
const PORT = 4002;

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 정적 파일을 제공할 경로 설정
app.use(express.static(path.join(__dirname, 'build')));

app.get('/search', async (req, res) => {
  const { query } = req.query;
  console.log(query);
  const apiKey = 'AIzaSyDS0lJo8GSm9HwnJ3DUtlrGRDXNlQEPTqY'; // 여기에 본인의 Google Maps API 키를 넣어주세요
  
  try {
    const response = await axios.get(`https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${apiKey}`);
    const data = response.data;
    
    // 서버로부터 받은 응답이 정상적인 JSON 형식이 아닌 경우
    if (!data || data.status !== 'OK' || !data.results) {
      throw new Error('Unexpected response from Google Places API');
    }
    
    res.json(data); // 응답을 받을 때 JSON 형식으로 반환
    
  } catch (error) {
    console.error('Error fetching search results:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// React 앱을 제공하는 라우트 설정
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, '0.0.0.0' ,() => {
  console.log(`Server is running on port ${PORT}`);
});
