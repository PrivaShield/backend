// models/user.js
import { getConnection } from "../config/dbConfig.js";
import bcrypt from "bcrypt";

class User {
  // 사용자 생성
  static async create(userData) {
    const connection = await getConnection();
    try {
      const { email, password, user_name } = userData;

      // 비밀번호 해시
      const hashedPassword = await bcrypt.hash(password, 10);

      // SQL 쿼리 실행
      const [result] = await connection.execute(
        "INSERT INTO MEMBER (email, password, user_name) VALUES (?, ?, ?)",
        [email, hashedPassword, user_name]
      );

      return result;
    } catch (error) {
      throw error;
    } finally {
      await connection.end();
    }
  }

  // 이메일로 사용자 찾기
  static async findByEmail(email) {
    const connection = await getConnection();
    try {
      const [rows] = await connection.execute(
        "SELECT * FROM MEMBER WHERE email = ?",
        [email]
      );

      return rows[0] || null;
    } catch (error) {
      throw error;
    } finally {
      await connection.end();
    }
  }

  // 사용자 정보 업데이트
  static async updateProfile(email, updateData) {
    const connection = await getConnection();
    try {
      const { user_name, profile_image } = updateData;

      const updateFields = [];
      const updateValues = [];

      if (user_name) {
        updateFields.push("user_name = ?");
        updateValues.push(user_name);
      }

      if (profile_image) {
        updateFields.push("profile_image = ?");
        updateValues.push(profile_image);
      }

      updateValues.push(email);

      const query = `
        UPDATE MEMBER 
        SET ${updateFields.join(", ")} 
        WHERE email = ?
      `;

      const [result] = await connection.execute(query, updateValues);

      return result;
    } catch (error) {
      throw error;
    } finally {
      await connection.end();
    }
  }

  // 비밀번호 변경
  static async changePassword(email, newPassword) {
    const connection = await getConnection();
    try {
      // 비밀번호 해시
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      const [result] = await connection.execute(
        "UPDATE MEMBER SET password = ? WHERE email = ?",
        [hashedPassword, email]
      );

      return result;
    } catch (error) {
      throw error;
    } finally {
      await connection.end();
    }
  }

  // 사용자 삭제
  static async deleteByEmail(email) {
    const connection = await getConnection();
    try {
      const [result] = await connection.execute(
        "DELETE FROM MEMBER WHERE email = ?",
        [email]
      );

      return result;
    } catch (error) {
      throw error;
    } finally {
      await connection.end();
    }
  }

  // 로그인 검증
  static async validateLogin(email, password) {
    const connection = await getConnection();
    try {
      const [rows] = await connection.execute(
        "SELECT * FROM MEMBER WHERE email = ?",
        [email]
      );

      if (rows.length === 0) {
        return false;
      }

      const user = rows[0];
      return await bcrypt.compare(password, user.password);
    } catch (error) {
      throw error;
    } finally {
      await connection.end();
    }
  }
}

export default User;