import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { getConnection } from "../config/dbConfig.js";

const router = express.Router();

// JWT 비밀키 (실제 환경에서는 환경 변수로 관리)
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key";
// 토큰 만료 시간 (예: 24시간)
const JWT_EXPIRES_IN = "24h";

router.post("/login", async (req, res) => {
  console.log("🔒 로그인 라우트 호출됨");

  try {
    const { email, password } = req.body;
    console.log(`이메일: ${email}, 비밀번호: ${password}`);

    // 데이터베이스에서 사용자 조회
    const connection = await getConnection();
    const [rows] = await connection.execute(
      "SELECT email, password_hash, user_name FROM MEMBER WHERE TRIM(email) = TRIM(?)",
      [email]
    );

    if (rows.length === 0) {
      console.log("❌ 이메일이 일치하지 않음");
      return res.status(401).json({ message: "이메일이 올바르지 않습니다." });
    }

    const user = rows[0];
    console.log("✔️ 이메일 확인됨");

    // 비밀번호 해시값이 저장된 'password_hash' 필드를 사용해야 합니다.
    console.log("저장된 해시된 비밀번호:", user.password_hash); // 수정된 부분

    if (!user.password_hash) {
      console.log("❌ 비밀번호 해시 없음");
      return res
        .status(500)
        .json({ message: "서버 오류: 비밀번호 정보가 없습니다." });
    }

    // 비밀번호 비교
    const isPasswordValid = await bcrypt.compare(password, user.password_hash); // 수정된 부분
    if (!isPasswordValid) {
      console.log("❌ 비밀번호가 올바르지 않음");
      return res.status(401).json({ message: "비밀번호가 올바르지 않습니다." });
    }
    console.log("✔️ 비밀번호 확인됨");

    const expiresIn = process.env.JWT_EXPIRES_IN || "1h"; // 기본값 1시간
    console.log("🔹 JWT 만료 시간:", expiresIn);

    const token = jwt.sign(
      {
        user_name: user.user_name,
        email: user.email,
      },
      process.env.JWT_SECRET,
      { expiresIn }
    );

    console.log("JWT_EXPIRES_IN:", process.env.JWT_EXPIRES_IN);
    console.log("✔️ 토큰 생성 완료");

    // 토큰 및 사용자 정보 반환
    res.status(200).json({
      token,
      user: {
        email: user.email,
        user_name: user.user_name,
      },
    });
    console.log("✅ 로그인 성공: 토큰 및 사용자 정보 반환");
  } catch (error) {
    console.error("🔴 로그인 중 오류 발생:", error);
    res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
});

// 회원가입 라우트
router.post("/signup", async (req, res) => {
  console.log("👤 회원가입 라우트 호출됨");
  const connection = await getConnection();

  try {
    const { name, email, password } = req.body;
    console.log(
      `회원가입 시도: 이름: ${name}, 이메일: ${email}, 비밀번호: ${password}`
    );

    // 이메일 중복 확인
    const [existingUsers] = await connection.query(
      "SELECT * FROM MEMBER WHERE email = ?",
      [email]
    );

    if (existingUsers.length > 0) {
      console.log("❌ 이미 가입된 이메일입니다.");
      return res.status(400).json({ message: "이미 가입된 이메일입니다." });
    }
    console.log("✔️ 이메일 중복 없음");

    // 비밀번호 해시화
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    console.log("✔️ 비밀번호 해시화 완료");

    // 새 사용자 데이터베이스에 추가
    const [result] = await connection.query(
      "INSERT INTO MEMBER (email, password_hash , user_name) VALUES (?, ?, ?)",
      [email, hashedPassword, name]
    );

    console.log("✔️ 새 사용자 데이터베이스에 추가됨");

    // JWT 토큰 생성
    const token = jwt.sign(
      {
        userId: result.insertId,
        email: email,
        name: name,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    console.log("✔️ JWT 토큰 생성 완료");

    // 토큰 및 기본 사용자 정보 반환
    res.status(201).json({
      token,
      user: {
        id: result.insertId,
        email: email,
        name: name,
      },
    });
    console.log("✅ 회원가입 성공: 토큰 및 사용자 정보 반환");
  } catch (error) {
    console.error("🔴 회원가입 중 오류 발생:", error);
    res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
});

// 토큰 검증 라우트 (클라이언트에서 토큰 유효성 확인 용도)
router.get("/verify", async (req, res) => {
  console.log("🔒 토큰 검증 라우트 호출됨");
  const authHeader = req.headers.authorization;
  console.log("Authorization 헤더:", authHeader);

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log("❌ Authorization 헤더가 올바르지 않음");
    return res.status(401).json({ valid: false });
  }

  const token = authHeader.split(" ")[1];
  console.log("토큰 추출됨:", token);

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log("✔️ 토큰 검증 성공, 디코딩된 사용자 정보:", decoded);
    res.status(200).json({ valid: true, user: decoded });
  } catch (error) {
    console.log("❌ 토큰 검증 실패:", error);
    res.status(401).json({ valid: false });
  }
});

export default router;
