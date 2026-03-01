# 보안 가이드 (계정 및 API 데이터)

## 체크리스트

### 1. 환경 변수 / 비밀값
- [ ] **`.env` 파일은 절대 git에 커밋하지 마세요.** (이미 `.gitignore`에 포함됨)
- [ ] **프로덕션에서는 반드시 `SECRET_KEY`를 설정**  
  예: `openssl rand -hex 32` 로 생성 후 `SECRET_KEY=...` 로 설정  
  설정하지 않으면 `FLASK_ENV=production` 일 때 앱이 시작되지 않습니다.
- [ ] **API 키는 서버에서만 사용**  
  `FMP_API_KEY`, FACCTing 토큰 등은 백엔드(terminal.py, fmp_api.py)에서만 참조되며, 프론트엔드로 노출되지 않습니다.

### 2. 세션 및 쿠키
- [ ] **HTTPS 사용 시**  
  `FLASK_ENV=production` 이면 세션 쿠키에 `Secure`, `HttpOnly`, `SameSite=Lax` 가 적용됩니다.  
  HTTPS 미사용 시 `SESSION_SECURE_COOKIE=1` 은 설정하지 마세요 (쿠키가 전송되지 않음).
- [ ] 비밀번호는 Werkzeug `generate_password_hash` / `check_password_hash` 로만 저장·검증됩니다.

### 3. 로그인 보안
- [ ] **로그인 시도 제한**  
  동일 IP에서 15분 동안 실패 5회 초과 시 429(Too Many Requests)가 반환됩니다.  
  다중 서버/재시작 시 메모리 초기화되므로, 필요 시 Redis 등 외부 저장소 기반 rate limit 도입을 고려하세요.

### 4. FACCTing API 연동
- [ ] **SSL 검증**  
  기본값은 인증서 검증 비활성화(개발 편의)입니다.  
  **프로덕션에서는 `FACCTING_VERIFY_SSL=1` 로 SSL 검증을 켜는 것을 권장합니다.**
- [ ] FACCTing 토큰은 DB에 평문 저장됩니다. DB 접근이 제한되도록 DB 계정·네트워크 접근을 제한하세요.

### 5. DB
- [ ] `DATABASE_URL` / `SQLALCHEMY_DATABASE_URI` 에 비밀번호가 포함되므로 `.env` 로만 관리하고, 로그에 출력되지 않도록 하세요.
- [ ] Alembic `migrations/env.py` 의 `get_engine_url()` 은 마이그레이션용이며, 일반적으로 로그에 노출되지 않습니다. 필요 시 `hide_password=True` 로 변경할 수 있습니다.

### 6. 배포
- [ ] 프로덕션에서는 `debug=False` 로 실행 (예: gunicorn 사용).
- [ ] `.env` 및 `.env.` 같은 복사본이 저장소에 올라가 있지 않은지 주기적으로 확인하세요.

---

## 적용된 보안 조치 요약

| 항목 | 내용 |
|------|------|
| SECRET_KEY | 프로덕션에서 미설정 시 앱 시작 거부 |
| 세션 쿠키 | production 시 Secure, HttpOnly, SameSite=Lax |
| 로그인 | IP 기준 15분당 실패 5회 제한 (429) |
| FACCTing SSL | `FACCTING_VERIFY_SSL=1` 로 검증 활성화 가능 |
| API 키 | FMP 등 키는 서버 환경변수만 사용, 클라이언트 미노출 |
