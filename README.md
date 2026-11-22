# 우리집 보드

우리 가족만 쓰는 상태 공유 보드 (웹앱/PWA). React + Vite + Firebase Firestore, GitHub Pages로 배포.

- 설계: `docs/superpowers/specs/`
- Firebase 설정(폰 기준 클릭 안내): `docs/SETUP-FIREBASE.md`
- 배포(GitHub Pages, 폰 기준 클릭 안내): `docs/DEPLOY-GITHUB-PAGES.md`
- 알림 켜기(무료 알림 서버, 폰 기준 클릭 안내): `docs/SETUP-PUSH.md` (서버 코드는 `worker/`)

> 이 저장소는 Public입니다. 가족 이름, 근무 데이터, 가족 코드는 코드·문서·테스트에 넣지 않습니다.
> 구성원 이름은 앱 설정에서 입력하며 Firestore에만 저장됩니다. 테스트 데이터는 모두 가짜입니다.

## 개발
```
npm install
cp .env.example .env.local   # 값을 채움 (커밋 금지)
npm run dev
npm test
```
