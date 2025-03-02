const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const authRoutes = require('./routes/authRoutes');
// const authMiddleware = require('./middleware/authMiddleware');


const app = express();
const PORT = process.env.PORT || 5000;

// CORS 설정
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));

app.use(express.json());
app.use(bodyParser.json());

// 라우터 설정
app.use('/api/auth', authRoutes);

// 테스트용 API
app.get("/", (req, res) => {
    res.send("🚀 서버가 정상적으로 실행 중입니다!");
});

// 서버 실행
app.listen(PORT, () => {
    console.log(`✅ 서버 실행 중: http://localhost:${PORT}`);
});
