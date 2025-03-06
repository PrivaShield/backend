import mysql from "mysql2/promise";

const dbConfig = {
  host: "localhost",
  port: 3307,
  user: "privaShield",
  password: "privashield11", // 보안상 .env 사용 권장
  database: "safe_db",
};

export async function testDBConnection() {
  try {
    const connection = await mysql.createConnection(dbConfig);
    console.log("✅ MySQL 연결 성공!");

    // 데이터베이스 선택
    await connection.query("USE safe_db");

    // 모든 테이블 이름 조회
    const [rows] = await connection.execute("SHOW TABLES");
    console.log("모든 테이블 이름:", rows);

    await connection.end();
  } catch (error) {
    console.error("❌ MySQL 연결 실패:", error.message);
  }
}

// DB 연결 함수 (다른 파일에서 사용 가능)
export async function getConnection() {
  return await mysql.createConnection(dbConfig);
}

// ssh 수동 연결 필수
// ssh -i "C:/privaShield-key.pem" -N -L 3307:privashielddb.cvoio4q4qfcn.ap-northeast-2.rds.amazonaws.com:3306 ubuntu@52.78.247.122
