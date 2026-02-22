# BKIG Terminal — DB 마이그레이션 가이드 (Flask-Migrate / Alembic)

터미널(CLI)에서 아래 명령을 **순서대로** 실행하세요.

## 1. 의존성 설치

```bash
pip install Flask-Migrate
```

또는 프로젝트 의존성 일괄 설치:

```bash
pip install -r requirements.txt
```

## 2. 마이그레이션 폴더 초기화 (최초 1회)

```bash
export FLASK_APP=app.py
flask db init
```

- `migrations/` 폴더와 `migrations/versions/` 가 생성됩니다.
- 이미 `migrations/` 가 있으면 생략합니다.

## 3. 마이그레이션 파일 생성

모델 변경 후, 변경 사항을 반영한 마이그레이션 파일을 생성합니다.

```bash
flask db migrate -m "Initial migration and add is_active"
```

- 최초 한 번은 위 메시지로 생성합니다.
- 이후 스키마를 바꿀 때마다 `-m "설명"` 을 바꿔가며 실행합니다.

## 4. DB 스키마 적용

생성된 마이그레이션을 실제 DB에 적용합니다.

```bash
flask db upgrade
```

- `terminal.db` (SQLite)에 테이블/컬럼이 생성·수정됩니다.

---

## 요약 (복사용)

```bash
pip install Flask-Migrate
export FLASK_APP=app.py
flask db init
flask db migrate -m "Initial migration and add is_active"
flask db upgrade
```

- **Windows (CMD):** `set FLASK_APP=app.py`
- **Windows (PowerShell):** `$env:FLASK_APP="app.py"`

---

## 참고

- **처음 마이그레이션 도입 시:**  
  - **이미 `terminal.db`가 없음:** 위 1~4 단계만 순서대로 실행.  
  - **이미 `terminal.db`와 테이블이 있음:** `flask db upgrade` 시 "table already exists" 가능.  
    → 방법 A: 기존 DB 백업 후 삭제하고 `flask db upgrade`.  
    → 방법 B: 이미 스키마가 맞다면 `flask db stamp head` 로 “적용됨”만 표시.  
- _Removed duplicate note._
- **기존 (레거시):** 첫 `flask db migrate` 가 “테이블이 이미 존재함” 오류를 낼 수 있습니다. 이 경우 기존 DB를 백업 후 제거하고 `flask db upgrade` 로 새로 만들거나, 생성된 마이그레이션 스크립트를 열어 `create_table` 대신 `add_column` 등으로 수정한 뒤 적용할 수 있습니다.
- **이후 스키마 변경:** 모델 수정 → `flask db migrate -m "설명"` → `flask db upgrade`
- **롤백:** `flask db downgrade` (한 단계 이전 버전으로 되돌림)
