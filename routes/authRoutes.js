import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { getConnection } from '../config/dbConfig.js';
import dotenv from 'dotenv';
import  nodemailer from 'nodemailer';
dotenv.config();


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



// 새로운 통합 라우트
router.post('/verify-and-send', async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ success: false, message: "이메일을 입력해주세요." });
  }
  
  console.log("👤 이메일 확인 및 인증 코드 전송 라우트 호출됨");
  const connection = await getConnection();
  
  try {
    // 1. 이메일 존재 여부 확인
    const [result] = await connection.query('SELECT * FROM MEMBER WHERE email = ?', [email]);
    
   // 이메일 존재 여부를 응답으로 보냄
    if (!result || !Array.isArray(result) || result.length === 0) {
      return res.status(400).json({ success: false, message: '등록되지 않은 이메일입니다.' });
    }

    console.log("✅ 이메일이 존재합니다. 인증 코드 생성 및 전송 시작");
    
    // 2. 이메일이 존재하면 바로 인증 코드 생성 및 전송
    const verificationCode = Math.floor(Math.random() * (999999 - 100000 + 1)) + 100000;
    console.log('생성된 인증 코드:', verificationCode);
    
    // Nodemailer 트랜스포터 생성
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
    
    // 이메일 전송 옵션
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'PrivaShield 비밀번호 찾기 인증 코드',
      text: `귀하의 인증 코드는 ${verificationCode} 입니다. 5분 내에 인증을 완료해주세요.`
    };
    
    // 이메일 전송
    await transporter.sendMail(mailOptions);
    
    res.json({ 
      success: true, 
      verificationCode,
      message: '인증 코드가 전송되었습니다.'
    });
  } catch (error) {
    console.error('이메일 확인 또는 인증 코드 전송 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  }
});

router.post("/reset-password", async (req, res) => {
  console.log("🔐 비밀번호 재설정 라우트 호출됨");
  const connection = await getConnection();

  try {
    const { email, newPassword } = req.body;

    // 비밀번호 입력 확인
    if (!newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: "새 비밀번호를 입력해주세요." 
      });
    }

    // 비밀번호 복잡성 검사
    if (newPassword.length < 8) {
      return res.status(400).json({ 
        success: false, 
        message: "비밀번호는 최소 8자 이상이어야 합니다." 
      });
    }

    // 새 비밀번호 해시화
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    console.log("new 비밀번호 변경", hashedPassword);
    // 데이터베이스에 새 비밀번호 업데이트
    const [updateResult] = await connection.execute(
      'UPDATE MEMBER SET password_hash = ? WHERE email = ?',
      [hashedPassword,email]  // 기존에 인증된 이메일 사용
    );

    // 업데이트 확인
    if (updateResult.affectedRows === 0) {
      console.log("❌ 비밀번호 업데이트 실패");
      return res.status(500).json({ 
        success: false, 
        message: "비밀번호 재설정에 실패했습니다." 
      });
    }

    console.log("✅ 비밀번호 재설정 성공");
    res.status(200).json({ 
      success: true, 
      message: "비밀번호가 성공적으로 재설정되었습니다." 
    });

  } catch (error) {
    console.error("🔴 비밀번호 재설정 중 오류 발생:", error);
    res.status(500).json({ 
      success: false, 
      message: "서버 오류가 발생했습니다." 
    });
  }
});

  export default router;