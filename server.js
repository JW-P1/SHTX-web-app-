const express = require('express');
const session = require('express-session');
const path = require('path');
const app = express();
const cors = require('cors');
const axios = require('axios');
const mysql = require('mysql');
const PORT = 4002;

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'build')));

// MySQL 데이터베이스 연결 설정
const connection = mysql.createConnection({
  host: '127.0.0.1',
  user: 'root',
  password: '2364',
  database: 'SHTX',
  port: '3306'
});

// 세션 설정
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true
}));

// MySQL 데이터베이스 연결
connection.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    return;
  }
  console.log('Connected to MySQL');
});

app.get('/search', async (req, res) => {
  const { query } = req.query;
  console.log(query);
  const apiKey = '84938a3d101dcfe481dcf72d7fdbbee4'; // 여기에 본인의 Kakao REST API 키를 넣어주세요

  try {
    const response = await axios.get('https://dapi.kakao.com/v2/local/search/keyword.json', {
      headers: {
        Authorization: `KakaoAK ${apiKey}`
      },
      params: {
        query: query,
        size: 10
      }
    });

    const data = response.data;
    console.log(data);

    // Kakao API의 검색 결과 형식을 클라이언트가 예상하는 형식으로 변환
    const results = data.documents.map((item) => ({
      name: item.place_name,
      address: item.address_name,
      lat: item.y,
      lng: item.x
    }));

    res.json({ results });

  } catch (error) {
    console.error('Error fetching search results:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 회원가입
app.post('/signup', (req, res) => {
  const { username, id, password } = req.body;

  console.log('Received data:');
  console.log('Username:', username);
  console.log('ID:', id);
  console.log('Password:', password);

  const query = `INSERT INTO users (username, user_id, password) VALUES ('${username}', '${id}', '${password}')`;

  connection.query(query, (error, results) => {
    if (error) {
      console.error('Error inserting data into MySQL:', error);
      res.status(500).send('Error inserting data into MySQL');
      return;
    }
    console.log('Data inserted into MySQL:', results);
    res.send('Signup successful');
  });

});

app.post('/login', (req, res) => {
  const { username, password } = req.body;

  const query = `SELECT * FROM users WHERE user_id = '${username}' AND password = '${password}'`;
  connection.query(query, (error, results) => {
    if (error) {
      console.error('Error searching for user in MySQL:', error);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }

    if (results.length > 0) {
      const user = results[0];
      req.session.user = user;
      res.json({ message: 'Login successful' });
    } else {
      res.status(401).json({ message: 'Invalid username or password' });
    }
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});
