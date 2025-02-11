const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 5000;

// 미들웨어 설정
app.use(cors({
    origin: 'http://localhost:3000', // 프론트엔드 URL
    credentials: true // 쿠키와 자격 증명 정보를 허용
  }));
  
app.use(bodyParser.json());

// 테스트용 API
app.get("/", (req, res) => {
    res.send("🚀 서버가 정상적으로 실행 중입니다!");
});

// 서버 실행
app.listen(PORT, () => {
    console.log(`✅ 서버 실행 중: http://localhost:${PORT}`);
});