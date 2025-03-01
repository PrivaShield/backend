import mysql from "mysql2/promise";

// ssh 수동 연결 필수
// ssh -i "C:/privaShield-key.pem" -N -L 3307:privashielddb.cvoio4q4qfcn.ap-northeast-2.rds.amazonaws.com:3306 ubuntu@52.78.247.122

const dbConfig = {
  host: "localhost", // RDS에 직접 연결하려면 RDS 엔드포인트 입력
  port: 3307, // MySQL 기본 포트 (RDS면 3306)
  user: "privaShield",
  password: "privashield11",
  database: "safe_db",
};

async function testDBConnection() {
  try {
    const connection = await mysql.createConnection(dbConfig);
    console.log("✅ MySQL 연결 성공!");

    // 데이터베이스 선택 (query 메서드 사용)
    await connection.query("USE safe_db"); // 'query'로 변경
    // 모든 테이블 이름 조회
    const [rows, fields] = await connection.execute("SHOW TABLES");

    // 조회된 테이블 이름 출력
    console.log("모든 테이블 이름:", rows);

    await connection.end();
  } catch (error) {
    console.error("❌ MySQL 연결 실패:", error.message);
  }
}

testDBConnection();
