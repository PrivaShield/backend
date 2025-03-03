import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';

const app = express();
const PORT = process.env.PORT || 5000;

// 미들웨어 설정
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));

app.use(express.json());
app.use(bodyParser.json());

// 테스트용 API
app.get("/", (req, res) => {
  res.send("🚀 서버가 정상적으로 실행 중입니다!");
});

// 정적 파일 제공 설정
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// 업로드 디렉토리 생성
const uploadDir = path.join(__dirname, "uploads/profile");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 서버 실행
app.listen(PORT, () => {
  console.log(`✅ 서버 실행 중: http://localhost:${PORT}`);
});
