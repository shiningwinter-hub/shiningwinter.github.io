# 우리가 만든 세상, 우리가 채우는 색깔

수업에서 학생들이 AI로 만든 그림을 컬러링북으로 바꿔, 태블릿에서 터치로 색칠하는 정적 웹사이트입니다.
서버·로그인·API 키가 필요 없고 GitHub Pages에서 그대로 동작합니다.

## 폴더 구성

```
index.html      화면 구조
style.css       디자인 (가로/세로 태블릿 대응)
app.js          색칠 기능 (영역 채우기, 붓, 지우개, 원본 색, 되돌리기, 자동 저장, PNG 저장)
artworks.json   작품 목록
images/original 원본 그림 (.jpg)
images/coloring 컬러링용 선화 (.png, 흰 바탕 + 검은 선)
images/thumbs   목록용 썸네일 (.jpg)
.nojekyll       GitHub Pages가 파일을 그대로 쓰도록 하는 빈 파일
```

## GitHub Pages로 배포하기

1. GitHub에서 새 저장소 만들기 (예: `our-colorbook`, Public)
2. 이 폴더 **안의 내용 전체**를 저장소 첫 화면에 끌어다 놓고 **Commit changes**
   - `.nojekyll`처럼 점으로 시작하는 파일이 안 보이면 웹 업로드에서 빠질 수 있어요. 없어도 대부분 동작하지만, 저장소에서 *Add file → Create new file*로 `.nojekyll` 이름의 빈 파일을 만들어 두면 안전합니다.
3. **Settings → Pages → Build and deployment → Deploy from a branch → `main` / `(root)` → Save**
4. 1~2분 뒤 `https://계정명.github.io/our-colorbook/` 접속 확인 → QR코드로 공유

## 작품 추가·수정

- 교사용 도구(teacher-tool/teacher.html)에서 작품을 등록하고 **작품 파일만 ZIP**을 만든 뒤,
  `artworks.json`과 `images` 폴더를 저장소에 다시 올리면(같은 이름은 덮어쓰기) 됩니다.
- 직접 고칠 때는 `artworks.json`에 아래 형식으로 한 줄씩 추가하세요.

```json
{
  "id": "art-001",
  "title": "작품 제목",
  "category": "좋아하는 동물",
  "original": "images/original/art-001.jpg",
  "coloring": "images/coloring/art-001.png",
  "thumbnail": "images/thumbs/art-001.jpg",
  "description": ""
}
```

카테고리: 나만의 친구 · 좋아하는 음식 · 좋아하는 동물 · 좋아하는 공룡 · 나의 모습 · 자유 상상
(작품이 없는 카테고리 버튼은 자동으로 숨겨집니다.)

`version` 값을 바꾸면 태블릿에 남아 있는 예전 이미지 캐시를 무시하고 새 이미지를 받습니다.
교사용 도구로 ZIP을 만들면 자동으로 바뀝니다.

## 알아 두기

- 학생의 색칠 결과는 **각 태블릿 브라우저에만** 저장됩니다. 브라우저 기록·사이트 데이터를 지우거나 기기를 바꾸면 사라지므로, 완성 화면의 **그림 저장**으로 PNG를 받아 두세요.
- `index.html`을 더블클릭해서 열면 보안 제한 때문에 그림이 열리지 않습니다. GitHub Pages 주소로 확인하거나, PC에서 `python -m http.server`로 열어 테스트하세요.
- 공개 저장소의 Pages 주소는 링크를 아는 누구나 볼 수 있습니다. 학생 실명·얼굴 사진 등 개인정보가 들어간 그림은 올리기 전에 확인해 주세요.
- 선 판정 기준·붓 굵기 등은 `app.js` 맨 위 `CONFIG`에서 바꿀 수 있습니다.
