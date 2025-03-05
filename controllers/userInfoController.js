import bcrypt from "bcrypt";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ESM에서 __dirname 설정
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 더미 데이터 - 메모리에 저장
let dummyUsers = [
  {
    id: 1,
    email: "test@example.com",
    password: "$2b$10$GgAt862z7bNQTxlXXCF2vu8JXZ3XwZMVVYYpX.z4dtIa45U31RXpi", // password123의 해시
    name: "Test User",
    profileImage: "",
    resetPasswordToken: null,
    resetPasswordExpires: null,
    isActive: true,
    deletedAt: null,
  },
];

// 비밀번호 변경 컨트롤러 (토큰 없이)
export const changePassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    // 이메일로 사용자 찾기
    const userIndex = dummyUsers.findIndex((user) => user.email === email);
    if (userIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "사용자를 찾을 수 없습니다.",
      });
    }

    // 비밀번호 해시화
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // 사용자 비밀번호 업데이트
    dummyUsers[userIndex].password = hashedPassword;

    res.status(200).json({
      success: true,
      message: "비밀번호가 성공적으로 변경되었습니다.",
    });
  } catch (error) {
    console.error("비밀번호 변경 오류:", error);
    res.status(500).json({
      success: false,
      message: "서버 오류가 발생했습니다.",
      error: error.message,
    });
  }
};

// 회원 탈퇴 컨트롤러
export const deleteUser = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "이메일 정보가 필요합니다.",
      });
    }

    // 이메일로 사용자 찾기
    const userIndex = dummyUsers.findIndex((user) => user.email === email);
    if (userIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "사용자를 찾을 수 없습니다.",
      });
    }

    // 소프트 삭제 처리
    dummyUsers[userIndex].isActive = false;
    dummyUsers[userIndex].deletedAt = new Date();

    // 성공 응답
    res.status(200).json({
      success: true,
      message: "회원 탈퇴가 성공적으로 처리되었습니다.",
    });
  } catch (error) {
    console.error("회원 탈퇴 오류:", error);
    res.status(500).json({
      success: false,
      message: "서버 오류가 발생했습니다.",
      error: error.message,
    });
  }
};

// 회원 정보 조회 컨트롤러
export const getUserInfo = async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "이메일 정보가 필요합니다.",
      });
    }

    // 이메일로 사용자 찾기
    const user = dummyUsers.find((user) => user.email === email);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "사용자를 찾을 수 없습니다.",
      });
    }

    // 회원 정보 반환 (비밀번호는 보안을 위해 제외)
    res.status(200).json({
      success: true,
      data: {
        name: user.name || "",
        email: user.email,
        phoneNumber: user.phoneNumber || "",
      },
    });
  } catch (error) {
    console.error("회원 정보 조회 오류:", error);
    res.status(500).json({
      success: false,
      message: "서버 오류가 발생했습니다.",
      error: error.message,
    });
  }
};

// 프로필 이미지 업로드 컨트롤러
export const updateProfileImage = async (req, res) => {
  try {
    const { email } = req.body;

    // 이메일이 없는 경우
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "이메일 정보가 필요합니다.",
      });
    }

    // 파일이 없는 경우
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "이미지 파일이 필요합니다.",
      });
    }

    // 업로드된 파일 경로
    const profileImagePath = `/uploads/profile/${req.file.filename}`;

    // 이메일로 사용자 찾기
    const userIndex = dummyUsers.findIndex((user) => user.email === email);
    if (userIndex === -1) {
      // 파일 업로드 후 사용자가 없는 경우, 업로드된 파일 삭제
      fs.unlinkSync(path.join(__dirname, "..", req.file.path));

      return res.status(404).json({
        success: false,
        message: "사용자를 찾을 수 없습니다.",
      });
    }

    // 기존 프로필 이미지가 있다면 삭제
    if (dummyUsers[userIndex].profileImage) {
      const oldImagePath = path.join(
        __dirname,
        "..",
        dummyUsers[userIndex].profileImage
      );
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }

    // 프로필 이미지 경로 업데이트
    dummyUsers[userIndex].profileImage = profileImagePath;

    // 성공 응답
    res.status(200).json({
      success: true,
      message: "프로필 이미지가 성공적으로 업데이트되었습니다.",
      data: {
        profileImage: profileImagePath,
      },
    });
  } catch (error) {
    console.error("프로필 이미지 업데이트 오류:", error);

    // 파일이 업로드된 경우 오류 발생 시 삭제
    if (req.file) {
      fs.unlinkSync(path.join(__dirname, "..", req.file.path));
    }

    res.status(500).json({
      success: false,
      message: "서버 오류가 발생했습니다.",
      error: error.message,
    });
  }
};
