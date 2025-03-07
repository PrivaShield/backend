// routes/dashboard.js
import express from "express";
import { getConnection } from "../config/dbConfig.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// ESM에서 __dirname 설정
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// GET 요청 처리
router.get('/getdata', async (req, res) => {
  let connection = null;
  console.log('✅ /api/dashboard/getdata 엔드포인트 도착!');
  
  const { email, content_type, sensitivity_level, input_date } = req.query;
    
  // URL 디코딩 (필요한 경우)
  const decodedEmail = decodeURIComponent(email);
  const decodedContentType = decodeURIComponent(content_type);
  const decodedSensitivityLevel = decodeURIComponent(sensitivity_level);
  const decodedInputDate = decodeURIComponent(input_date);

  // 디코딩된 데이터 출력 (서버에서 확인)
  console.log('디코딩된 데이터:', decodedEmail, decodedContentType, decodedSensitivityLevel, decodedInputDate);
  
  try {
    // 데이터베이스 연결
    connection = await getConnection();

    // SQL 쿼리 (INSERT)
    const sql = `INSERT INTO DANGEROUSCONTENTLOGS (email, content_type, input_date, sensitivity_level) 
                 VALUES (?, ?, ?, ?)`;

    const values = [decodedEmail, decodedContentType, decodedInputDate, decodedSensitivityLevel];

    // 쿼리 실행
    const [result] = await connection.execute(sql, values);
    
    // 데이터 삽입 성공 후 처리
    console.log('데이터 삽입 성공 삽입된 ID:', result.insertId);
    res.status(200).json({ success: true, message: '데이터 저장 완료', insertId: result.insertId });
  } catch (err) {
    console.error('데이터 삽입 오류:', err);
    res.status(500).json({ success: false, message: ' 데이터 삽입 중 오류 발생!' });
  } 
});


// 종합 대시보드 데이터 (모든 정보를 한 번에 제공)
router.get("/summary", async (req, res) => {
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

    // 1. 오늘 감지된 민감 텍스트 조회
    const [todayStats] = await connection.execute(
      `SELECT 
         content_type, 
         COUNT(*) AS type_count,
         sensitivity_level
       FROM 
         DANGEROUSCONTENTLOGS
       WHERE 
         DATE(input_date) = CURDATE() AND email = ?
       GROUP BY 
         content_type, sensitivity_level`,
      [email]
    );

    // 오늘 전체 감지 건수
    const [todayTotal] = await connection.execute(
      `SELECT COUNT(*) AS today_total
       FROM DANGEROUSCONTENTLOGS
       WHERE DATE(input_date) = CURDATE() AND email = ?`,
      [email]
    );

    // 2. 최근 실행일(오늘 이전 가장 최근 날짜) 조회
    const [lastExecutionDate] = await connection.execute(
      `SELECT 
         DATE(input_date) AS last_date
       FROM 
         DANGEROUSCONTENTLOGS
       WHERE 
         DATE(input_date) < CURDATE() AND email = ?
       GROUP BY 
         DATE(input_date)
       ORDER BY 
         last_date DESC
       LIMIT 1`,
      [email]
    );

    // 3. 최근 실행일의 감지 건수 조회
    let lastDateTotal = 0;
    let lastDate = null;
    let changeRate = 0;

    if (lastExecutionDate.length > 0) {
      lastDate = lastExecutionDate[0].last_date;

      const [lastDateResults] = await connection.execute(
        `SELECT COUNT(*) AS last_total
         FROM DANGEROUSCONTENTLOGS
         WHERE DATE(input_date) = ? AND email = ?`,
        [lastDate, email]
      );

      lastDateTotal = lastDateResults[0].last_total || 0;

      // 변화율 계산 (오늘 - 이전) / 이전 * 100
      if (lastDateTotal > 0) {
        changeRate = (
          ((todayTotal[0].today_total - lastDateTotal) / lastDateTotal) *
          100
        ).toFixed(1);
      }
    }

    // 4. 이번 달 감지된 총 건수
    const [monthlyTotal] = await connection.execute(
      `SELECT 
         COUNT(*) AS monthly_total
       FROM 
         DANGEROUSCONTENTLOGS
       WHERE 
         DATE_FORMAT(input_date, '%Y-%m') = DATE_FORMAT(CURDATE(), '%Y-%m') 
         AND email = ?`,
      [email]
    );

    // 5. 지난달 대비 증감률 계산
    const [lastMonthTotal] = await connection.execute(
      `SELECT 
         COUNT(*) AS last_month_total
       FROM 
         DANGEROUSCONTENTLOGS
       WHERE 
         DATE_FORMAT(input_date, '%Y-%m') = DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 1 MONTH), '%Y-%m')
         AND email = ?`,
      [email]
    );

    // 데이터 가공
    // 유형별 감지 건수 (중복된 content_type을 합쳐서 처리)
    const sensitiveTypes = [];
    todayStats.forEach((item) => {
      const existingType = sensitiveTypes.find(
        (type) => type.type === item.content_type
      );
      if (existingType) {
        existingType.count += item.type_count;
      } else {
        sensitiveTypes.push({
          type: item.content_type,
          count: item.type_count,
          level: item.sensitivity_level,
        });
      }
    });

    const todayTotalCount = todayTotal[0]?.today_total || 0;
    const thisMonthTotal = monthlyTotal[0]?.monthly_total || 0;
    const prevMonthTotal = lastMonthTotal[0]?.last_month_total || 0;

    // 월간 증감률 계산
    let monthlyChangePercent = 0;
    if (prevMonthTotal > 0) {
      monthlyChangePercent = (
        ((thisMonthTotal - prevMonthTotal) / prevMonthTotal) *
        100
      ).toFixed(1);
    }

    // 안전 점수 계산 (간단한 예시로 대체)
    const safetyScore = Math.max(
      0,
      Math.min(100, 100 - Math.floor(todayTotalCount * 2))
    );

    // 응답 데이터 구성
    res.status(200).json({
      success: true,
      data: {
        today: {
          detectedCount: todayTotalCount,
          sensitiveTypes: sensitiveTypes,
          lastExecutionDate: lastDate
            ? new Date(lastDate).toISOString().split("T")[0]
            : null,
          lastExecutionCount: lastDateTotal,
          changeRate: changeRate,
        },
        monthly: {
          thisMonth: thisMonthTotal,
          lastMonth: prevMonthTotal,
          changePercent: monthlyChangePercent,
        },
        safetyScore: safetyScore,
        globalPercentile: 15, // 예시 값
      },
    });
  } catch (error) {
    console.error("대시보드 요약 조회 오류:", error);
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
});

// 이전 유출 기록 가져오기 (오늘 제외)
router.get("/previous-leaks", async (req, res) => {
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

    // 이전 유출 기록 조회
    const [leaks] = await connection.execute(
      `SELECT 
         content_type, 
         sensitivity_level,
         COUNT(*) AS count
       FROM 
         DANGEROUSCONTENTLOGS
       WHERE 
         email = ? AND
         DATE(input_date) < CURDATE()
       GROUP BY 
         content_type, sensitivity_level`,
      [email]
    );

    res.status(200).json({
      success: true,
      data: leaks,
    });
  } catch (error) {
    console.error("이전 유출 기록 조회 오류:", error);
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
});

// 현재 유출 기록 가져오기 (오늘만)
router.get("/current-leaks", async (req, res) => {
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

    // 현재 유출 기록 조회
    const [leaks] = await connection.execute(
      `SELECT 
         content_type, 
         sensitivity_level,
         COUNT(*) AS count
       FROM 
         DANGEROUSCONTENTLOGS
       WHERE 
         email = ? AND
         DATE(input_date) = CURDATE()
       GROUP BY 
         content_type, sensitivity_level`,
      [email]
    );

    res.status(200).json({
      success: true,
      data: leaks,
    });
  } catch (error) {
    console.error("현재 유출 기록 조회 오류:", error);
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
});

// 전체 사용자의 유출 기록 가져오기
router.get("/all-users-leaks", async (req, res) => {
  let connection = null;

  try {
    connection = await getConnection();

    // 전체 사용자별 유출 기록 조회
    const [users] = await connection.execute(
      `SELECT 
         DISTINCT email
       FROM 
         DANGEROUSCONTENTLOGS`
    );

    // 각 사용자별 유출 기록을 상세히 조회
    const userData = await Promise.all(
      users.map(async (user) => {
        const [leaks] = await connection.execute(
          `SELECT 
             content_type, 
             sensitivity_level,
             COUNT(*) AS count
           FROM 
             DANGEROUSCONTENTLOGS
           WHERE 
             email = ?
           GROUP BY 
             content_type, sensitivity_level`,
          [user.email]
        );

        return {
          email: user.email,
          leaks: leaks,
        };
      })
    );

    res.status(200).json({
      success: true,
      data: userData,
    });
  } catch (error) {
    console.error("전체 사용자 유출 기록 조회 오류:", error);
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
});

// 월간 민감 텍스트 데이터 가져오기 (새로 추가)
router.get("/monthly-data", async (req, res) => {
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

    // 이번 달에 감지된 총 건수
    const [totalCount] = await connection.execute(
      `SELECT 
          COUNT(*) AS totalCount
       FROM 
          DANGEROUSCONTENTLOGS
       WHERE 
          input_date >= CURDATE() - INTERVAL (DAY(CURDATE()) - 1) DAY
          AND input_date < CURDATE() + INTERVAL 1 DAY
          AND email = ?`,
      [email]
    );

    // 이번 달 중 현재일 기준 날짜별 총 감지 건수
    const [dailyData] = await connection.execute(
      `SELECT 
          DATE_FORMAT(input_date, '%m/%d') AS date,
          COUNT(*) AS detection_count
       FROM 
          DANGEROUSCONTENTLOGS
       WHERE 
          input_date >= CURDATE() - INTERVAL (DAY(CURDATE()) - 1) DAY
          AND input_date < CURDATE() + INTERVAL 1 DAY
          AND email = ?
       GROUP BY 
          DATE(input_date)
       ORDER BY 
          DATE(input_date)`,
      [email]
    );

    res.status(200).json({
      success: true,
      data: {
        totalCount: totalCount[0]?.totalCount || 0,
        dailyData: dailyData,
      },
    });
  } catch (error) {
    console.error("월간 데이터 조회 오류:", error);
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
});

// HTML 파일 제공 라우트 (안전 점수 HTML)
router.get("/safety-score", async (req, res) => {
  try {
    // HTML 파일 경로
    const htmlFilePath = path.join(__dirname, "../public/safety_score.html");

    // 파일이 존재하는지 확인
    if (!fs.existsSync(htmlFilePath)) {
      return res.status(404).json({
        success: false,
        message: "safety_score.html 파일을 찾을 수 없습니다.",
      });
    }

    // HTML 파일 읽기
    const htmlContent = fs.readFileSync(htmlFilePath, "utf8");

    // HTML 컨텐츠 전송
    res.set("Content-Type", "text/html");
    res.send(htmlContent);
  } catch (error) {
    console.error("HTML 파일 제공 오류:", error);
    res.status(500).json({
      success: false,
      message: "HTML 파일을 제공하는 중 오류가 발생했습니다.",
      error: error.message,
    });
  }
});

// 월간 응답 HTML 파일 제공 (새로 추가)
router.get("/monthly-response", async (req, res) => {
  try {
    // HTML 파일 경로
    const htmlFilePath = path.join(__dirname, "../public/MonthlyResponse.html");

    // 파일이 존재하는지 확인
    if (!fs.existsSync(htmlFilePath)) {
      return res.status(404).json({
        success: false,
        message: "MonthlyResponse.html 파일을 찾을 수 없습니다.",
      });
    }

    // HTML 파일 읽기
    const htmlContent = fs.readFileSync(htmlFilePath, "utf8");

    // HTML 컨텐츠 전송
    res.set("Content-Type", "text/html");
    res.send(htmlContent);
  } catch (error) {
    console.error("HTML 파일 제공 오류:", error);
    res.status(500).json({
      success: false,
      message: "HTML 파일을 제공하는 중 오류가 발생했습니다.",
      error: error.message,
    });
  }
});

// 월간 위험 감지 데이터 가져오기
router.get("/monthly-risk", async (req, res) => {
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

    // 최근 6개월간 월별 데이터 가져오기
    const [monthlyRiskData] = await connection.execute(
      `SELECT 
            DATE_FORMAT(input_date, '%Y-%m') AS month,
            COUNT(*) AS count
         FROM 
            DANGEROUSCONTENTLOGS
         WHERE 
            input_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
            AND email = ?
         GROUP BY 
            DATE_FORMAT(input_date, '%Y-%m')
         ORDER BY 
            month ASC`,
      [email]
    );

    res.status(200).json({
      success: true,
      data: monthlyRiskData,
    });
  } catch (error) {
    console.error("월간 위험 감지 데이터 조회 오류:", error);
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
});

// 유형별 민감 정보 비율 API
router.get("/sensitive-info", async (req, res) => {
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

    // 유형별 민감 정보 조회
    const [sensitiveInfo] = await connection.execute(
      `SELECT 
           content_type, 
           COUNT(*) AS count
         FROM 
           DANGEROUSCONTENTLOGS
         WHERE 
           email = ?
         GROUP BY 
           content_type
         ORDER BY 
           count DESC`,
      [email]
    );

    res.status(200).json({
      success: true,
      data: sensitiveInfo,
    });
  } catch (error) {
    console.error("유형별 민감 정보 조회 오류:", error);
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
});

export default router;
