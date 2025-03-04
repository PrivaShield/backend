import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import userRoutes from "./routes/userInfoRoutes.js";
import authRoutes from "./routes/authRoutes.js";

// ESM에서 __dirname 설정
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const app = express();
const PORT = process.env.PORT || 5000;

// 미들웨어 설정
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

app.use(bodyParser.json());

// 라우트 등록
app.use("/api/users", userRoutes);
app.use('/api/auth', authRoutes);


// 테스트용 API
app.get("/", (req, res) => {
  res.send("🚀 서버가 정상적으로 실행 중입니다!");
});

// 업로드 디렉토리 생성
const uploadDir = path.join(__dirname, "uploads/profile");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 정적 파일 제공 설정
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// 서버 실행
app.listen(PORT, () => {
  console.log(`✅ 서버 실행 중: http://localhost:${PORT}`);
  console.log(`✅ 더미 데이터를 사용하여 서버가 실행되었습니다.`);
});
