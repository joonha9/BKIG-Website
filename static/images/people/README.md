# People 페이지 얼굴 사진 (Our People)

이 폴더에 **people.html** 조직도에서 사용할 멤버 얼굴 사진을 넣어주세요.

## 권장 사양 (용량 최적화)

- **해상도**: 최대 400×400px (화면에서는 64~80px로 표시되므로 400px이면 충분합니다)
- **포맷**: JPEG(품질 80~85%) 또는 WebP
- **파일명**: 영문·숫자 권장 (예: `joonha.jpg`, `gibeom_kim.webp`)
- **용량**: 한 장당 50KB 이하 목표

## people.js에서 사용하는 방법

`static/js/people.js`의 `orgData`에서 각 멤버에 `photo` 필드를 넣으면 됩니다.

```js
{ name: '홍길동', role: 'Report Lead', tier: 2, photo: 'gildong.jpg', ... }
```

파일명만 적어주면 이 폴더(`/static/images/people/`)에서 자동으로 불러옵니다.

## 최적화 스크립트 (선택)

프로젝트 루트에 `scripts/optimize_people_photos.py` 스크립트를 두었습니다.  
이 폴더에 원본 사진을 넣은 뒤 아래처럼 실행하면, **최대 400px 리사이즈 + JPEG/WebP 압축**된 파일이 같은 폴더에 저장됩니다.

```bash
pip install Pillow
python scripts/optimize_people_photos.py
```

자세한 사용법은 스크립트 파일 상단 주석을 참고하세요.
