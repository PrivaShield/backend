const express = require("express");
const router = express.Router();

// 비밀번호 재설정 라우트
router.post("/reset-password", (req, res) => {
  try {
    const { email, resetToken, newPassword } = req.body;

    // 테스트용 응답
    res.status(200).json({
      success: true,
      message: "비밀번호가 성공적으로 변경되었습니다.",
    });
  } catch (error) {
    console.error("비밀번호 재설정 오류:", error);
    res.status(500).json({
      success: false,
      message: "서버 오류가 발생했습니다.",
      error: error.message,
    });
  }
});

module.exports = router;
