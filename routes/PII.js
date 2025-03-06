// routes/pii.js
import express from 'express';
import AWS from 'aws-sdk';
import connection from '../config/dbConfig'; // DB 연결 파일 가져오기
import jwt from 'jsonwebtoken';

const router = express.Router();

// 시작 시 JWT_SECRET 환경 변수 확인
if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET 환경 변수가 설정되지 않았습니다.');
  process.exit(1);
}

// AWS Comprehend 클라이언트 생성
const comprehend = new AWS.Comprehend({
  region: 'ap-northeast-2'
});

// 민감도 레벨 매핑
const sensitivityMapping = {
  'BANK_ACCOUNT_NUMBER': '높음',
  'BANK_ROUTING': '높음',
  'CREDIT_DEBIT_NUMBER': '높음',
  'CREDIT_DEBIT_CVV': '높음',
  'CREDIT_DEBIT_EXPIRY': '높음',
  'PIN': '높음',
  'SSN': '높음',
  'PASSWORD': '높음',
  'EMAIL': '높음', // 이메일 주소
  'PHONE': '높음', // 전화번호
  'DRIVER_ID': '높음', // 운전면허번호
  'PASSPORT_NUMBER': '높음', // 여권번호
  'MAC_ADDRESS': '높음', // MAC 주소
  'IP_ADDRESS': '높음', // IP 주소
  'AWS_ACCESS_KEY': '높음', // AWS 액세스 키
  'AWS_SECRET_KEY': '높음', // AWS 시크릿 키
  'NAME': '중간', // 이름
  'ADDRESS': '중간', // 주소
  'INTERNATIONAL_BANK_ACCOUNT_NUMBER': '중간', // 국제 은행 계좌번호
  'SWIFT_CODE': '중간', // SWIFT 코드
  'LICENSE_PLATE': '중간', // 자동차 번호판
  'VEHICLE_IDENTIFICATION_NUMBER': '중간', // 차량 식별 번호
  'DEFAULT': '낮음'
};

// PII 감지 API 엔드포인트
router.post('/detect-pii', async (req, res) => {
  const { text } = req.body;
  
  // 인증 헤더 확인
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: '인증 헤더가 없습니다.' });
  }
  
  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(400).json({ message: '토큰이 필요합니다.' });
  }

  // 토큰에서 이메일 추출
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET); // JWT 비밀 키로 토큰을 디코딩
  } catch (err) {
    return res.status(401).json({ message: '유효하지 않은 토큰입니다.' });
  }

  const userEmail = decoded.email; // 이메일 추출

  // 텍스트 검증
  if (!text || text.trim() === "") {
    return res.status(400).json({ message: '텍스트가 비어 있습니다.' });
  }

  // Comprehend PII 감지 요청 파라미터
  const params = {
    TextList: [text],
    LanguageCode: 'ko',
  };

  try {
    const data = await comprehend.batchDetectPiiEntities(params).promise();
    const detectedEntities = data.ResultList[0].Entities;

    // 감지된 PII가 없는 경우 처리
    if (detectedEntities.length === 0) {
      return res.status(200).json({
        message: '감지된 PII가 없습니다.',
        detected_types: [],
        sensitivity_levels: []
      });
    }

    // DB에 PII 정보 저장
    const sql = 'INSERT INTO DANGEROUSCONTENTLOGS (email, content_type, input_date, sensitivity_level) VALUES ?';
    const values = detectedEntities.map(entity => [
      userEmail,
      entity.Type,
      new Date(),
      sensitivityMapping[entity.Type] || '낮음',
    ]);

    // DB 저장
    await connection.promise().query(sql, [values]);

    res.status(200).json({
      message: 'PII 감지 및 저장 완료',
      detected_types: detectedEntities.map(e => e.Type),
      sensitivity_levels: detectedEntities.map(e => sensitivityMapping[e.Type] || '낮음')
    });
  } catch (err) {
    console.error('Comprehend 오류:', err);
    // 개발 환경에서만 상세 오류 메시지 노출
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? `PII 감지 실패: ${err.message}` 
      : 'PII 감지 처리 중 오류가 발생했습니다.';
    
    res.status(500).json({ message: errorMessage });
  }
});

export default router;