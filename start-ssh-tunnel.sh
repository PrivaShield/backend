#!/bin/bash

# 환경 변수에서 SSH 키 경로와 RDS 정보를 가져옵니다.
SSH_KEY_PATH=$SSH_KEY_PATH  # Heroku에서 설정한 SSH_KEY_PATH 환경 변수
RDS_HOST=$RDS_HOST          # Heroku에서 설정한 RDS_HOST 환경 변수
RDS_PORT=$RDS_PORT          # Heroku에서 설정한 RDS_PORT 환경 변수

# SSH 터널링 실행
ssh -i $SSH_KEY_PATH -N -L 3307:$RDS_HOST:$RDS_PORT ubuntu@52.78.247.122
