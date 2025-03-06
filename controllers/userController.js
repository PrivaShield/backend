//controllers/userController.js
import bcrypt from "bcrypt";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getConnection } from "../config/dbConfig.js";

// ESM에서 __dirname 설정
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// 회원 탈퇴 컨트롤러
export const deleteUser = async (req, res) => {
  const connection = await getConnection();

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "이메일 정보가 필요합니다.",
      });
    }

    // 이메일로 사용자 찾기
    const [rows] = await connection.execute(
      "SELECT * FROM MEMBER WHERE email = ?",
      [email]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "사용자를 찾을 수 없습니다.",
      });
    }

    // 회원 데이터 삭제 (또는 isActive 필드가 있다면 업데이트)
    await connection.execute("DELETE FROM MEMBER WHERE email = ?", [email]);

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
// getUserInfo 함수 수정
export const getUserInfo = async (req, res) => {
  let connection = null;

  try {
    const { email } = req.query;
    connection = await getConnection();

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "이메일 정보가 필요합니다.",
      });
    }

    // 이메일로 사용자 찾기
    const [rows] = await connection.execute(
      "SELECT email, user_name, profile_image FROM MEMBER WHERE email = ?",
      [email]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "사용자를 찾을 수 없습니다.",
      });
    }

    const user = rows[0];

    // 회원 정보 반환 (비밀번호는 보안을 위해 제외)
    res.status(200).json({
      success: true,
      data: {
        name: user.user_name || "",
        email: user.email,
        profileImage: user.profile_image || "",
      },
    });
  } catch (error) {
    console.error("회원 정보 조회 오류:", error);
    res.status(500).json({
      success: false,
      message: "서버 오류가 발생했습니다.",
      error: error.message,
    });
  } finally {
    if (connection) {
      try {
        // end() 메서드를 사용하여 연결 종료
        await connection.end();
      } catch (err) {
        console.error("연결 종료 오류:", err);
      }
    }
  }
};

// 프로필 정보 업데이트 컨트롤러 추가
export const updateProfile = async (req, res) => {
  const connection = await getConnection();

  try {
    const { email, name } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "이메일 정보가 필요합니다.",
      });
    }

    // 이메일로 사용자 찾기
    const [rows] = await connection.execute(
      "SELECT * FROM MEMBER WHERE email = ?",
      [email]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "사용자를 찾을 수 없습니다.",
      });
    }

    // 사용자 이름 업데이트
    await connection.execute(
      "UPDATE MEMBER SET user_name = ? WHERE email = ?",
      [name, email]
    );

    res.status(200).json({
      success: true,
      message: "프로필 정보가 성공적으로 업데이트되었습니다.",
    });
  } catch (error) {
    console.error("프로필 업데이트 오류:", error);
    res.status(500).json({
      success: false,
      message: "서버 오류가 발생했습니다.",
      error: error.message,
    });
  }
};

// 프로필 이미지 업로드 컨트롤러
export const updateProfileImage = async (req, res) => {
  let connection = null;

  try {
    const { email } = req.body;
    connection = await getConnection();

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
    const [rows] = await connection.execute(
      "SELECT * FROM MEMBER WHERE email = ?",
      [email]
    );

    if (rows.length === 0) {
      // 파일 업로드 후 사용자가 없는 경우, 업로드된 파일 삭제
      const fullPath = path.join(__dirname, "..", "public", profileImagePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }

      return res.status(404).json({
        success: false,
        message: "사용자를 찾을 수 없습니다.",
      });
    }

    // 기존 프로필 이미지가 있으면 삭제
    if (rows[0].profile_image) {
      const oldImagePath = path.join(
        __dirname,
        "..",
        "public",
        rows[0].profile_image
      );
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }

    // 프로필 이미지 경로 업데이트
    await connection.execute(
      "UPDATE MEMBER SET profile_image = ? WHERE email = ?",
      [profileImagePath, email]
    );

    // 사용자 정보를 함께 가져오기
    const [userInfo] = await connection.execute(
      "SELECT email, user_name, profile_image FROM MEMBER WHERE email = ?",
      [email]
    );

    // 성공 응답 (사용자 모든 정보 포함)
    res.status(200).json({
      success: true,
      message: "프로필 이미지가 성공적으로 업데이트되었습니다.",
      data: {
        email: userInfo[0].email,
        name: userInfo[0].user_name || "",
        profileImage: profileImagePath,
      },
    });
  } catch (error) {
    console.error("프로필 이미지 업데이트 오류:", error);

    // 파일이 업로드된 경우 오류 발생 시 삭제
    if (req.file) {
      const fullPath = path.join(
        __dirname,
        "..",
        "public",
        `/uploads/profile/${req.file.filename}`
      );
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }

    res.status(500).json({
      success: false,
      message: "서버 오류가 발생했습니다.",
      error: error.message,
    });
  } finally {
    if (connection) {
      try {
        await connection.end();
      } catch (err) {
        console.error("연결 종료 오류:", err);
      }
    }
  }
};
