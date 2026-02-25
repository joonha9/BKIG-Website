"""
BKIG Terminal — 최초 관리자(Super Admin) 시드 스크립트 + Comms 구조.

사용 방법:
  python3 seed.py

최초 관리자 계정 (개발용):
  - ID(이메일): admin@bkig.com
  - PW: admin1234!

Divisions: Investment, Research, Case Study, PD/PR
방 구조(executive, division, team rooms)만 생성. 멤버(division_lead, analyst)는 직접 생성.
sync_room_memberships로 super_admin=전체 방, division_lead=executive+자기 division/team 방 자동 반영.
"""
import os
import sys

# 프로젝트 루트에서 app 로드
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import app
from terminal import db, User, Room, RoomMember, Division, Team, sync_room_memberships
from werkzeug.security import generate_password_hash

# 최초 관리자 계정 (개발용 — 프로덕션에서는 환경변수 등으로 변경 권장)
SEED_ADMIN_EMAIL = "admin@bkig.com"
SEED_ADMIN_PASSWORD = "admin1234!"
SEED_ADMIN_NAME = "Terminal Admin"
SEED_ADMIN_DIVISION = "Admin"
SEED_ADMIN_ROLE = "super_admin"

# Divisions (이름은 DB/API와 매칭용)
DIVISION_NAMES = ["Investment", "Research", "Case Study", "PD/PR"]
# 팀 번호 (1, 2, 3) — 각 division당 이만큼 팀 생성
TEAM_NUMBERS = [1, 2, 3]

# 예전 시드로 생성했던 멤버 이메일 — DB에서 제거 (한 번 실행 후엔 무시됨)
_SEED_CREATED_EMAILS = [
    "investment_lead@bkig.com",
    "research_lead@bkig.com",
    "case_study_lead@bkig.com",
    "pd_pr_lead@bkig.com",
    "investment_team1_analyst1@bkig.com",
    "investment_team1_analyst2@bkig.com",
    "investment_team2_analyst1@bkig.com",
    "investment_team2_analyst2@bkig.com",
    "research_team1_analyst1@bkig.com",
    "research_team1_analyst2@bkig.com",
    "research_team2_analyst1@bkig.com",
    "research_team2_analyst2@bkig.com",
    "case_study_team1_analyst1@bkig.com",
    "case_study_team1_analyst2@bkig.com",
    "case_study_team2_analyst1@bkig.com",
    "case_study_team2_analyst2@bkig.com",
    "pd_pr_team1_analyst1@bkig.com",
    "pd_pr_team1_analyst2@bkig.com",
    "pd_pr_team2_analyst1@bkig.com",
    "pd_pr_team2_analyst2@bkig.com",
]


def run_seed():
    with app.app_context():
        _remove_seed_created_members()
        _seed_admin()
        _seed_divisions_teams_rooms()
        _ensure_user_division_team_ids()
        sync_room_memberships()
        print("Seed: room memberships synced (super_admin=all rooms, division_lead=executive+division+team rooms).")


def _remove_seed_created_members():
    """Remove users that were created by the old seed (division leads + analysts)."""
    from terminal import Task, Meeting, Announcement, MeetingNote, InternalResearchDocument

    to_delete = User.query.filter(User.email.in_(_SEED_CREATED_EMAILS)).all()
    if not to_delete:
        return
    ids = [u.id for u in to_delete]
    admin = User.query.filter_by(role="super_admin").first()
    admin_id = admin.id if admin else None

    if admin_id:
        Task.query.filter(Task.assigned_to_id.in_(ids)).update({Task.assigned_to_id: admin_id}, synchronize_session=False)
        Task.query.filter(Task.assigned_by_id.in_(ids)).update({Task.assigned_by_id: admin_id}, synchronize_session=False)
        Meeting.query.filter(Meeting.created_by_id.in_(ids)).update({Meeting.created_by_id: admin_id}, synchronize_session=False)
        Announcement.query.filter(Announcement.created_by_id.in_(ids)).update({Announcement.created_by_id: admin_id}, synchronize_session=False)
        MeetingNote.query.filter(MeetingNote.created_by_id.in_(ids)).update({MeetingNote.created_by_id: admin_id}, synchronize_session=False)
        InternalResearchDocument.query.filter(InternalResearchDocument.uploaded_by_id.in_(ids)).update(
            {InternalResearchDocument.uploaded_by_id: admin_id}, synchronize_session=False
        )

    RoomMember.query.filter(RoomMember.user_id.in_(ids)).delete(synchronize_session=False)
    User.query.filter(User.id.in_(ids)).delete(synchronize_session=False)
    db.session.commit()
    print("Seed: removed {} seed-created members (division leads & analysts).".format(len(to_delete)))


def _seed_admin():
    """Create admin user if not exists."""
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
    print("Seed: created admin user. ID(Email): {}, PW: {}".format(SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD))


def _seed_divisions_teams_rooms():
    """Create divisions (Investment, Research, Case Study, PD/PR), teams per division, and rooms."""
    # Divisions
    div_map = {}
    for name in DIVISION_NAMES:
        d = Division.query.filter_by(name=name).first()
        if not d:
            d = Division(name=name)
            db.session.add(d)
            db.session.flush()
            print("Seed: created division '{}'.".format(name))
        div_map[name] = d.id
    db.session.commit()

    # Teams per division (name "1", "2" to match User.team integer)
    team_by_div_and_num = {}
    for div_name in DIVISION_NAMES:
        div_id = div_map[div_name]
        for num in TEAM_NUMBERS:
            name_str = str(num)
            t = Team.query.filter_by(division_id=div_id, name=name_str).first()
            if not t:
                t = Team(name=name_str, division_id=div_id)
                db.session.add(t)
                db.session.flush()
                print("Seed: created team '{}' for division '{}'.".format(name_str, div_name))
            team_by_div_and_num[(div_id, num)] = t.id
    db.session.commit()

    # Executive room
    if not Room.query.filter_by(room_type="executive").first():
        r = Room(name="Executive", room_type="executive", division_id=None, team_id=None)
        db.session.add(r)
        db.session.commit()
        print("Seed: created executive room 'Executive'.")

    # Division rooms (one per division)
    for div_name in DIVISION_NAMES:
        div_id = div_map[div_name]
        if not Room.query.filter_by(room_type="division", division_id=div_id).first():
            r = Room(name=div_name, room_type="division", division_id=div_id, team_id=None)
            db.session.add(r)
            db.session.commit()
            print("Seed: created division room '{}'.".format(div_name))

    # Team rooms (e.g. "Research - Team 1" = Research division lead + Team 1 research analysts)
    for div_name in DIVISION_NAMES:
        div_id = div_map[div_name]
        for num in TEAM_NUMBERS:
            team_id = team_by_div_and_num.get((div_id, num))
            if not team_id:
                continue
            if not Room.query.filter_by(room_type="team", team_id=team_id).first():
                r = Room(name="{} - Team {}".format(div_name, num), room_type="team", division_id=div_id, team_id=team_id)
                db.session.add(r)
                db.session.commit()
                print("Seed: created team room '{} - Team {}'.".format(div_name, num))


def _ensure_user_division_team_ids():
    """Set division_id and team_id for existing users by matching division (string) and team (int)."""
    divs = {d.name: d for d in Division.query.all()}
    for u in User.query.all():
        if u.division_id is not None and u.team_id is not None:
            continue
        div = divs.get((u.division or "").strip())
        if div:
            if u.division_id is None:
                u.division_id = div.id
            if u.team_id is None and getattr(u, "team", None) is not None:
                t = Team.query.filter_by(division_id=div.id, name=str(u.team)).first()
                if t:
                    u.team_id = t.id
    db.session.commit()


if __name__ == "__main__":
    run_seed()
