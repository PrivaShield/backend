// controllers/userController.js
const User = require("../models/user");
const bcrypt = require("bcrypt");

// 비밀번호 재설정 컨트롤러
exports.resetPassword = async (req, res) => {
  try {
    const { email, resetToken, newPassword } = req.body;

    // 이메일과 토큰으로 사용자 찾기
    const user = await User.findOne({
      email: email,
      resetPasswordToken: resetToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    // 사용자가 없거나 토큰이 만료된 경우
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "유효하지 않은 토큰이거나 만료되었습니다.",
      });
    }

    // 비밀번호 해시화
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // 사용자 정보 업데이트
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

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
};
