"""
BKIG Terminal — 최초 관리자(Super Admin) 시드 스크립트.

사용 방법:
  python3 seed.py

최초 관리자 계정 (개발용):
  - ID(이메일): admin@bkig.com
  - PW: admin1234!

이미 해당 이메일로 유저가 있으면 건너뜀. 없으면 생성.
"""
import os
import sys

# 프로젝트 루트에서 app 로드
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import app
from terminal import db, User
from werkzeug.security import generate_password_hash

# 최초 관리자 계정 (개발용 — 프로덕션에서는 환경변수 등으로 변경 권장)
SEED_ADMIN_EMAIL = "admin@bkig.com"
SEED_ADMIN_PASSWORD = "admin1234!"
SEED_ADMIN_NAME = "Terminal Admin"
SEED_ADMIN_DIVISION = "Admin"
SEED_ADMIN_ROLE = "super_admin"


def run_seed():
    with app.app_context():
        existing = User.query.filter_by(email=SEED_ADMIN_EMAIL).first()
        if existing:
            print("Seed: admin user already exists (email: {}). Skipping.".format(SEED_ADMIN_EMAIL))
            return
        user = User(
            email=SEED_ADMIN_EMAIL,
            password_hash=generate_password_hash(SEED_ADMIN_PASSWORD),
            name=SEED_ADMIN_NAME,
            division=SEED_ADMIN_DIVISION,
            role=SEED_ADMIN_ROLE,
        )
        db.session.add(user)
        db.session.commit()
        print("Seed: created admin user.")
        print("  ID(Email): {}".format(SEED_ADMIN_EMAIL))
        print("  PW: {}".format(SEED_ADMIN_PASSWORD))


if __name__ == "__main__":
    run_seed()
