@echo off
REM SSH 터널링 시작 (AWS RDS MySQL 연결)
start "SSH Tunnel" "C:\Program Files\Git\usr\bin\bash.exe" -c "ssh -i 'C:/privaShield-key.pem' -N -L 3307:privashielddb.cvoio4q4qfcn.ap-northeast-2.rds.amazonaws.com:3306 ubuntu@52.78.247.122"

REM 잠시 대기 (터널링 준비 시간)
timeout /t 5

REM 애플리케이션 서버 실행
node index.js
