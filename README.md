# 데이로그 Life Session 신청폼

React, TypeScript와 Vite로 만든 데이로그 오프라인 Life Session 신청 경험입니다. Vercel Serverless Function이 브라우저 요청을 검증하고 통합 Google Apps Script로 전달합니다.

## 로컬 실행

```bash
npm install
npm run dev
```

Vercel API까지 함께 확인할 때는 환경변수를 설정한 뒤 Vercel CLI의 로컬 개발 명령을 사용합니다.

## 검사

```bash
npm test
npm run lint
npm run build
```

## 배포 환경변수

필요한 변수 이름은 `.env.example`을 확인합니다. 비밀값은 코드나 브라우저 공개 환경변수에 넣지 않습니다.

Google Apps Script에 추가할 폼별 코드는 `google-apps-script/DaylogLifeSession.gs`에 있습니다. 통합 수신기의 기존 `Main.gs`에는 `daylog_life_session` 비밀키 매핑과 처리 분기를 별도로 추가해야 합니다.

## GitHub Pages 배포

`.github/workflows/deploy-pages.yml`이 `main` 브랜치 변경 시 Vite의 `dist/` 결과물을 GitHub Pages에 배포합니다.

1. GitHub 저장소의 **Settings → Pages**로 이동합니다.
2. **Build and deployment → Source**를 **GitHub Actions**로 선택합니다.
3. `main` 브랜치에 변경을 push하고 **Actions → Deploy GitHub Pages** 실행 결과를 확인합니다.

GitHub Pages는 정적 파일만 호스팅하므로 Vercel Serverless Function인 `/api/daylog/application`과 `/api/daylog/track`을 실행하지 못합니다. Pages 배포는 화면 확인용으로만 사용할 수 있으며, 실제 신청 접수에는 Vercel 또는 별도의 서버 API 배포가 필요합니다. Apps Script 비밀값을 Pages 빌드 환경변수나 브라우저 코드에 넣지 않습니다.

## 문서 및 기획·명세

기획·디자인·구현 명세의 단일 원본은 이 저장소의 `docs/`에서 관리합니다.

- [통합 문서 목차](docs/README.md)
- [디자인 시스템](docs/04-디자인/디자인-시스템.md)
- [신청 경험 구현 명세](docs/05-구현-명세/신청-폼-구현.md)
- [신청폼 구현 현황](docs/신청폼/구현-현황.md)
