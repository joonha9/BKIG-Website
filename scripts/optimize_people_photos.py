#!/usr/bin/env python3
"""
People 페이지 얼굴 사진 용량 최적화 스크립트.

사용법:
  pip install Pillow
  python scripts/optimize_people_photos.py

동작:
  - static/images/people/ 폴더 내 이미지를 찾아
  - 긴 변 400px 기준으로 리사이즈하고
  - JPEG 품질 85%로 저장해 용량을 줄입니다.
  - 기존 파일은 덮어쓰므로, 필요하면 먼저 백업하세요.
"""

import os
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("Pillow가 필요합니다: pip install Pillow")
    raise SystemExit(1)

PEOPLE_DIR = Path(__file__).resolve().parent.parent / "static" / "images" / "people"
MAX_SIZE = 400
JPEG_QUALITY = 85
SKIP_EXTENSIONS = {".webp", ".svg", ".gif"}  # WebP는 이미 최적화된 경우 많음; 필요 시 처리 추가 가능


def optimize_image(path: Path) -> bool:
    """이미지 한 장 리사이즈·압축 후 같은 경로에 저장. 성공 여부 반환."""
    ext = path.suffix.lower()
    if ext in SKIP_EXTENSIONS:
        return False
    try:
        img = Image.open(path)
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
        w, h = img.size
        if max(w, h) <= MAX_SIZE and ext in (".jpg", ".jpeg"):
            return False  # 이미 작으면 스킵
        ratio = min(MAX_SIZE / w, MAX_SIZE / h, 1.0)
        if ratio < 1.0:
            new_size = (int(w * ratio), int(h * ratio))
            img = img.resize(new_size, Image.Resampling.LANCZOS)
        out_path = path.with_suffix(".jpg")
        img.save(out_path, "JPEG", quality=JPEG_QUALITY, optimize=True)
        if out_path != path:
            path.unlink()
        return True
    except Exception as e:
        print(f"  [경고] {path.name}: {e}")
        return False


def main():
    if not PEOPLE_DIR.is_dir():
        print(f"폴더가 없습니다: {PEOPLE_DIR}")
        return
    exts = {".jpg", ".jpeg", ".png", ".webp"}
    count = 0
    for path in sorted(PEOPLE_DIR.iterdir()):
        if path.is_file() and path.suffix.lower() in exts and path.name != "README.md":
            if optimize_image(path):
                count += 1
                print(f"  최적화: {path.name}")
    if count == 0:
        print("처리할 이미지가 없거나, 모두 스킵되었습니다.")
    else:
        print(f"총 {count}개 파일 최적화했습니다.")


if __name__ == "__main__":
    main()
