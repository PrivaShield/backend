//routes/users.js
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import * as userController from "../controllers/userController.js";

// ESM에서 __dirname 설정
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// 업로드 디렉토리 설정
const uploadDir = path.join(__dirname, "../uploads/profile");

// 디렉토리가 없으면 생성
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer 설정
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // 파일명 중복 방지를 위한 타임스탬프 추가
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  },
});

// 파일 필터링
const fileFilter = (req, file, cb) => {
  // 이미지 파일만 허용
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("이미지 파일만 업로드 가능합니다."), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB 용량 제한
  },
  fileFilter: fileFilter,
});

// 인증 라우트 추가
//router.post("/login", userController.login);
//router.post("/signup", userController.signup);

// 비밀번호 변경 라우트 (토큰 없이)
//router.post("/change-password", userController.changePassword);

// 회원 정보 조회 라우트
router.get("/", userController.getUserInfo);

// 프로필 이미지 업로드 라우트
router.patch(
  "/profile_image",
  upload.single("profileImage"),
  userController.updateProfileImage
);

// 수정된 코드
router.post("/update-profile", userController.updateProfile);

// 회원 탈퇴 라우트
router.delete("/delete-user", userController.deleteUser);

export default router;