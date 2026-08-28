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

## 문서 및 기획·명세

기획·디자인·구현 명세의 단일 원본은 이 저장소의 `docs/`에서 관리합니다.

- [통합 문서 목차](docs/README.md)
- [디자인 시스템](docs/04-디자인/디자인-시스템.md)
- [신청 경험 구현 명세](docs/05-구현-명세/신청-폼-구현.md)
- [신청폼 구현 현황](docs/신청폼/구현-현황.md)
