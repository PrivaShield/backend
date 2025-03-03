import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const router = express.Router();

// JWT 비밀키 (실제 환경에서는 환경 변수로 관리)
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';
// 토큰 만료 시간 (예: 24시간)
const JWT_EXPIRES_IN = '24h';

// 더미 데이터 (MongoDB 대신 사용) - 객체에서 배열로 변경
const dummyUsers = [
  {
    id: 1,
    email: 'test@example.com',
    password: '$2b$10$GgAt862z7bNQTxlXXCF2vu8JXZ3XwZMVVYYpX.z4dtIa45U31RXpi', // password123의 해시
    name: 'Test User'
  }
];

// 테스트용 해시 생성 함수 (필요시 주석 해제하여 사용)
const generateTestHash = async () => {
  const password = 'password123';
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);
  console.log(`Hash for "${password}": ${hash}`);
};
generateTestHash();

router.post('/login', async (req, res) => {
    console.log("🔒 로그인 라우트 호출됨");
    try {
        const { email, password } = req.body;
        console.log(`이메일: ${email}, 비밀번호: ${password}`); // 입력된 이메일과 비밀번호 로그

        // 이메일로 사용자 찾기 (더미 데이터에서)
        const user = dummyUsers.find(u => u.email === email);
        if (!user) {
            console.log("❌ 이메일이 일치하지 않음");
            return res.status(401).json({ message: '이메일이 올바르지 않습니다.' });
        }
        console.log("✔️ 이메일 확인됨");

        // 비밀번호 비교
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            console.log("❌ 비밀번호가 올바르지 않음");
            return res.status(401).json({ message: '비밀번호가 올바르지 않습니다.' });
        }
        console.log("✔️ 비밀번호 확인됨");

        // JWT 토큰 생성
        const token = jwt.sign(
            { 
                userId: user.id,
                email: user.email,
                name: user.name
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        console.log("✔️ 토큰 생성 완료");

        // 토큰 및 사용자 정보 반환
        res.status(200).json({
            token,
            user: {
                email: user.email,
                name: user.name
            }
        });
        console.log("✅ 로그인 성공: 토큰 및 사용자 정보 반환");

    } catch (error) {
        console.error('🔴 로그인 중 오류 발생:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});


// 회원가입 라우트
router.post('/signup', async (req, res) => {
    console.log("👤 회원가입 라우트 호출됨");
    try {
        const { name, email, password } = req.body;
        console.log(`회원가입 시도: 이름: ${name}, 이메일: ${email}, 비밀번호: ${password}`);

        // 이메일 중복 확인
        const existingUser = dummyUsers.find(u => u.email === email);
        if (existingUser) {
            console.log("❌ 이미 가입된 이메일입니다.");
            return res.status(400).json({ message: '이미 가입된 이메일입니다.' });
        }
        console.log("✔️ 이메일 중복 없음");

        // 비밀번호 해시화
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        console.log("✔️ 비밀번호 해시화 완료");

        // 새 사용자 생성 (더미 데이터에 추가)
        const newUser = {
            id: dummyUsers.length + 1, // 더미 데이터에서는 ID는 자동으로 증가
            name,
            email,
            password: hashedPassword
        };

        dummyUsers.push(newUser);  // 새 사용자 더미 데이터에 추가
        console.log("✔️ 새 사용자 더미 데이터에 추가됨");

        // JWT 토큰 생성
        const token = jwt.sign(
            { 
                userId: newUser.id,
                email: newUser.email,
                name: newUser.name
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );
        console.log("✔️ JWT 토큰 생성 완료");

        // 토큰 및 기본 사용자 정보 반환
        res.status(201).json({
            token,
            user: {
                id: newUser.id,
                email: newUser.email,
                name: newUser.name
            }
        });
        console.log("✅ 회원가입 성공: 토큰 및 사용자 정보 반환");

    } catch (error) {
        console.error('🔴 회원가입 중 오류 발생:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

// 토큰 검증 라우트 (클라이언트에서 토큰 유효성 확인 용도)
router.get('/verify', async (req, res) => {
    console.log("🔒 토큰 검증 라우트 호출됨");
    const authHeader = req.headers.authorization;
    console.log("Authorization 헤더:", authHeader);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log("❌ Authorization 헤더가 올바르지 않음");
        return res.status(401).json({ valid: false });
    }

    const token = authHeader.split(' ')[1];
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