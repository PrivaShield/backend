const express = require("express");
const router = express.Router();

// 기본 라우트
router.get("/", (req, res) => {
  res.json({ message: "사용자 API가 작동 중입니다." });
});

// 비밀번호 재설정 라우트
router.post("/reset-password", (req, res) => {
  res.status(200).json({
    success: true,
    message: "비밀번호가 성공적으로 변경되었습니다.",
  });
});

// 회원 탈퇴 라우트
router.delete("/delete-user", (req, res) => {
  res.status(200).json({
    success: true,
    message: "회원 탈퇴가 성공적으로 처리되었습니다.",
  });
});

module.exports = router;
