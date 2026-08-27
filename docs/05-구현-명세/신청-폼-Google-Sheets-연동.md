# 데이로그 신청 폼 Google Sheets 연동 설계

## 문서 목적

데이로그 Life Session 신청과 퍼널 이벤트를 기존 통합 Google Apps Script 웹 앱을 통해 총합 Google Sheets에 저장하기 위한 구현 계획입니다.

## 변경 금지 조건

`/Users/won-young/Library/Mobile Documents/com~apple~CloudDocs/도구/총합_시트_관련`의 기존 문서는 참조 전용입니다.

- 기존 문서를 수정하지 않습니다.
- 기존 문서에 데이로그 코드를 추가하지 않습니다.
- 이 문서와 데이로그 구현 저장소에서만 데이로그 연동을 기획하고 구현합니다.
- 실제 Apps Script 프로젝트에 적용할 때도 기존 폼 처리기의 동작을 변경하지 않는 추가 방식으로 진행합니다.

## 참조 문서에서 유지할 규약

- Apps Script 프로젝트 전체에 `doGet()`은 하나만 둡니다.
- Apps Script 프로젝트 전체에 `doPost()`는 하나만 둡니다.
- 하나의 통합 웹 앱 URL을 사용합니다.
- `formType`으로 폼별 처리기를 분기합니다.
- 폼마다 고유한 스크립트 속성 비밀값을 사용합니다.
- 신청 종류마다 Google Sheets 탭을 분리합니다.
- 폼별 상수와 함수에 고유 접두어를 붙입니다.
- `LockService`로 동시 요청을 보호합니다.
- 접수번호와 이벤트 ID로 중복 저장을 방지합니다.
- 사용자 입력은 수식 주입 방지 처리를 거칩니다.
- Apps Script 코드 변경 후 새 버전으로 웹 앱을 배포합니다.

## 전체 구조

```text
신청 브라우저
  ↓ HTTPS, 비밀값 없음
Vercel 동일 출처 API
  ├── 요청 검증
  ├── 속도 제한 및 honeypot 확인
  ├── formType 추가
  └── 서버 환경변수의 secret 추가
  ↓ HTTPS POST
통합 Google Apps Script /exec
  ├── formType 라우팅
  ├── secret 검증
  ├── 값 정리 및 허용값 검증
  ├── LockService
  └── 중복 ID 확인
  ↓
총합 Google Sheets
  ├── 데이로그_라이프세션_신청응답
  ├── 데이로그_라이프세션_퍼널이벤트
  └── 데이로그_라이프세션_퍼널현황
```

브라우저가 Apps Script로 직접 요청하지 않습니다. 비밀키가 브라우저 번들 또는 개발자 도구에 노출되지 않게 Vercel 서버 API가 중계합니다.

## 기술 구현 기준

- 신청 UI는 React와 TypeScript 엄격 모드로 구현합니다.
- `/api/daylog/track`과 `/api/daylog/application`은 Vercel Serverless Function의 TypeScript 핸들러로 구현합니다.
- 브라우저와 서버가 공유하는 페이로드 타입은 순수 TypeScript 모듈로 두되, 비밀값이나 서버 전용 설정을 노출하지 않습니다.
- API는 외부 JSON을 `unknown`으로 받고 필드·길이·허용값을 실행 시에 다시 검증합니다.
- Next.js를 전제하지 않고 Vercel에 배포 가능한 React 프로젝트 구조를 따릅니다.

## 폼 식별값

| 항목 | 값 |
| --- | --- |
| `formType` | `daylog_life_session` |
| Apps Script 파일 | `DaylogLifeSession.gs` |
| 함수 접두어 | `daylogLifeSession` |
| 상수 접두어 | `DAYLOG_LIFE_SESSION_` |
| 스크립트 속성 | `DAYLOG_LIFE_SESSION_SECRET` |
| 익명 세션 접두어 | `DAYLOG-S-` |
| 접수번호 접두어 | `DAYLOG-` |

## Google Sheets 탭

```text
데이로그_라이프세션_신청응답
데이로그_라이프세션_퍼널이벤트
데이로그_라이프세션_퍼널현황
```

기존 폼 탭과 열 구성이 다르므로 기존 탭에 섞지 않습니다.

## 신청응답 탭

열 정의의 단일 원본은 [신청 폼 데이터 정의](신청-폼-데이터-정의.md)입니다.

운영 기준:

- 첫 행을 고정합니다.
- 헤더 배경은 Deep Navy `#172033`, 텍스트는 흰색을 사용합니다.
- 접수시각 열은 `yyyy-mm-dd hh:mm:ss` 형식으로 표시합니다.
- 접수번호가 이미 존재하면 새 행을 만들지 않고 `duplicate: true`를 반환합니다.
- 기본 신청 상태는 `신규`입니다.
- 입력 문자열은 `safeCell_()`을 거칩니다.
- 응답 코드 JSON에는 생활 탐색 코드만 저장하고 연락처를 중복 저장하지 않습니다.

## 퍼널 단계

| 단계 코드 | 표시명 | 기록 시점 |
| --- | --- | --- |
| `started` | 신청 경험 시작 | 첫 화면 CTA 선택 |
| `daily_rhythm_selected` | 하루 리듬 선택 | Scene 01 완료 |
| `energy_selected` | 편안한·힘든 시간 선택 | Scene 02 완료 |
| `past_pattern_selected` | 지속 방식 선택 | Scene 03 완료 |
| `change_area_selected` | 변화 영역 선택 | Scene 04 완료 |
| `together_style_selected` | 함께하는 방식 선택 | Scene 05 완료 |
| `life_note_viewed` | 나의 하루 초안 확인 | Scene 06 노출 |
| `application_started` | 신청 정보 입력 | 연락 정보 화면 진입 |
| `consent_accepted` | 개인정보 동의 | 필수 동의 선택 |
| `submitted` | 신청 완료 | Sheets 저장 성공 후 |

같은 세션의 같은 단계는 한 번만 저장합니다. 뒤로 이동하거나 다시 선택해도 퍼널 사용자 수가 중복 증가하지 않습니다.

## 퍼널이벤트 탭

탭 이름:

```text
데이로그_라이프세션_퍼널이벤트
```

| 순서 | 열 이름 | 값 |
| ---: | --- | --- |
| 1 | 기록시각 | Apps Script `new Date()` |
| 2 | 이벤트ID | `${sessionId}:${stage}` |
| 3 | 익명 세션ID | `DAYLOG-S-...` |
| 4 | 단계코드 | 허용된 퍼널 단계 코드 |
| 5 | 단계 | Apps Script가 만든 표시명 |
| 6 | 접속 경로 | `source` |

퍼널 이벤트에는 이름, 연락처, LIFE NOTE 답변과 UTM 상세값을 넣지 않습니다.

## 퍼널현황 탭

탭 이름:

```text
데이로그_라이프세션_퍼널현황
```

| 열 | 의미 |
| --- | --- |
| 단계코드 | 집계 기준 키, 화면에서는 숨김 가능 |
| 단계 | 운영자가 읽는 단계명 |
| 사용자 수 | 퍼널이벤트의 단계코드 개수 |
| 이전 단계 대비 | 이전 단계 사용자 수 대비 비율 |
| 이탈 수 | 이전 단계에서 다음 단계로 넘어오지 않은 수 |
| 이탈률 | `1 - 이전 단계 대비` |
| 시작 대비 | `신청 경험 시작` 대비 도달률 |

기존 통합 코드와 같은 `COUNTIF` 기반 계산 방식을 사용합니다.

## 브라우저 API

### 퍼널 이벤트

```text
POST /api/daylog/track
```

브라우저 요청 예시:

```json
{
  "action": "track",
  "eventId": "DAYLOG-S-550E8400-E29B-41D4-A716-446655440000:started",
  "sessionId": "DAYLOG-S-550E8400-E29B-41D4-A716-446655440000",
  "stage": "started",
  "source": "daylog_web"
}
```

서버는 `formType`과 `secret`을 추가해 Apps Script로 전달합니다.

퍼널 기록 실패는 사용자 신청 진행을 막지 않습니다. 오류는 서버 로그에 남기되 화면은 다음 장면으로 이동합니다.

### 최종 신청

```text
POST /api/daylog/application
```

브라우저 요청 구조는 [신청 폼 데이터 정의](신청-폼-데이터-정의.md)를 따릅니다.

최종 신청 실패는 고객에게 알려야 하며 입력값을 유지한 상태에서 다시 시도할 수 있어야 합니다.

## Vercel API 책임

- 요청 메서드와 `Content-Type`을 확인합니다.
- JSON 크기를 제한합니다.
- 브라우저 입력을 1차 검증합니다.
- honeypot 필드가 채워졌는지 확인합니다.
- 필요하면 IP 또는 세션 기준 속도 제한을 적용합니다.
- `GOOGLE_APPS_SCRIPT_URL`을 읽습니다.
- `GOOGLE_APPS_SCRIPT_SHARED_SECRET`을 읽습니다.
- `DAYLOG_FORM_TYPE` 또는 서버 상수로 `daylog_life_session`을 추가합니다.
- Apps Script 요청 시간 제한을 설정합니다.
- Apps Script 응답의 JSON과 `ok` 값을 확인합니다.
- 브라우저에 secret, Apps Script 상세 오류와 내부 URL을 반환하지 않습니다.
- 로그에 이름, 연락처, 전체 요청 본문과 비밀값을 남기지 않습니다.

## Vercel 환경변수

| 변수 | 값 | 공개 여부 |
| --- | --- | --- |
| `GOOGLE_APPS_SCRIPT_URL` | 통합 Apps Script `/exec` URL | 서버 전용 |
| `GOOGLE_APPS_SCRIPT_SHARED_SECRET` | `DAYLOG_LIFE_SESSION_SECRET`과 같은 값 | 서버 전용 |
| `DAYLOG_FORM_TYPE` | `daylog_life_session` | 서버 전용 권장 |
| `SITE_URL` | 실제 공개 주소, 필요한 경우만 사용 | 서버 전용 권장 |

비밀값에는 사용 중인 React 빌드 도구의 공개 환경변수 접두어를 사용하지 않습니다.

환경변수를 추가하거나 변경하면 Vercel을 다시 배포합니다.

## Apps Script Main 변경 계획

실제 적용 단계에서 기존 `Main.gs`의 비밀값 매핑에 한 항목을 추가합니다.

```javascript
daylog_life_session: 'DAYLOG_LIFE_SESSION_SECRET'
```

`doPost()`의 기존 `switch`에 한 분기를 추가합니다.

```javascript
case 'daylog_life_session':
  return handleDaylogLifeSession_(payload, lock);
```

새 `doGet()` 또는 `doPost()`를 만들지 않습니다.

## DaylogLifeSession.gs 책임

새 파일에는 다음 항목만 둡니다.

- 데이로그 전용 시트명과 헤더 상수
- 허용 코드와 표시 문구 매핑
- 퍼널 단계 정의
- `handleDaylogLifeSession_()`
- 신청 저장 함수
- 퍼널 이벤트 저장 함수
- 신청 데이터 정리 및 검증 함수
- 퍼널 이벤트 정리 및 검증 함수
- 세 탭 생성 및 초기화 함수
- 데이로그 전용 헤더 설정 함수
- 데이로그 전용 텍스트 검증 함수

공통 `parsePayload_()`, `getBook_()`, `valueExists_()`, `safeCell_()`과 `jsonResponse_()`는 기존 `Common.gs`를 사용하고 다시 선언하지 않습니다.

## Apps Script 신청 처리 순서

1. `formType`과 secret은 `Main.gs`에서 확인합니다.
2. `action === 'track'`이면 퍼널 이벤트 처리기로 전달합니다.
3. honeypot인 `website`가 채워져 있으면 성공 형태로 응답하되 저장하지 않습니다.
4. 모든 코드와 문자열을 정리하고 검증합니다.
5. `lock.waitLock(10000)`으로 동시 쓰기를 보호합니다.
6. 신청응답 탭을 가져오거나 생성합니다.
7. 접수번호가 이미 있으면 `duplicate: true`를 반환합니다.
8. 코드값을 검증된 표시 문구로 변환합니다.
9. 사용자 문자열에 `safeCell_()`을 적용합니다.
10. 한 행을 추가합니다.
11. `submissionId`를 반환합니다.

## Apps Script 검증

- 접수번호와 세션 ID 형식
- `schemaVersion`과 허용된 `formVersion`
- 각 enum 값의 허용 목록 포함 여부
- 시간 필드가 0~23 정수인지
- 편안한 시간과 힘든 시간이 다른지
- 생활 영역 개수가 1~3개인지
- 생활 영역에 중복이 없는지
- 첫 변화 영역이 선택 영역에 포함되는지
- 연락 방법별 연락처 형식
- 희망 요일과 시간대가 비어 있거나 허용값으로만 구성됐는지
- 희망 요일과 시간대에 중복이 없는지
- `flexible`과 다른 값의 동시 선택 금지
- 필수 개인정보 동의가 `true`인지
- 사용자 문자열 최대 길이
- 응답 JSON 최대 길이

검증 실패의 상세 이유는 서버 로그에만 남기고 고객 화면에는 안전한 일반 문구를 제공합니다.

## 응답 계약

### 정상 신청

```json
{
  "ok": true,
  "submissionId": "DAYLOG-..."
}
```

### 중복 신청

```json
{
  "ok": true,
  "submissionId": "DAYLOG-...",
  "duplicate": true
}
```

중복 응답도 고객에게는 이미 접수된 정상 상태로 안내합니다.

### 정상 이벤트

```json
{
  "ok": true,
  "eventId": "DAYLOG-S-...:started"
}
```

### 서버 또는 인증 오류

```json
{
  "ok": false,
  "error": "server_error"
}
```

브라우저에는 `unauthorized`, Apps Script URL, 비밀값 또는 상세 예외를 그대로 노출하지 않습니다.

## 사용자 오류 문구

| 상황 | 문구 |
| --- | --- |
| 필수 입력 누락 | 아직 확인하지 않은 항목이 있어요. 표시된 내용을 확인해 주세요. |
| 연락처 형식 오류 | 연락받을 정보를 한 번 확인해 주세요. |
| 중복 접수 | 이미 이야기가 잘 도착했어요. 접수 내용을 확인해 드릴게요. |
| 네트워크 오류 | 연결이 잠시 불안정해요. 작성한 내용은 그대로 두었으니 다시 보내 주세요. |
| 서버 오류 | 지금은 이야기를 전달하기 어려워요. 잠시 후 다시 시도해 주세요. |
| 접수 성공 | 이야기가 잘 도착했어요. 이제 직접 만나 함께 살펴볼게요. |

## 개인정보와 로그

- 연락처와 생활 답변을 브라우저 영구 저장소에 저장하지 않습니다.
- 제출 재시도를 위한 상태는 페이지 메모리에 유지합니다.
- 서버 로그에 전체 요청 본문을 남기지 않습니다.
- 퍼널 이벤트에 개인 답변을 넣지 않습니다.
- Apps Script 실행 로그에도 개인정보를 직접 출력하지 않습니다.
- Google Sheets 접근 권한을 운영에 필요한 계정으로 제한합니다.
- 보관 기간, 열람 권한과 삭제 요청 절차는 공개 전 별도 정책으로 확정합니다.

## 구현 순서

1. [신청 폼 데이터 정의](신청-폼-데이터-정의.md)의 미확정 항목을 결정합니다.
2. Vercel API 계약과 입력 검증을 구현합니다.
3. 신청 경험의 장면 데이터를 최종 코드값과 연결합니다.
4. `DaylogLifeSession.gs`를 데이로그 구현 저장소에 작성합니다.
5. 통합 Apps Script 프로젝트에 새 파일을 추가합니다.
6. `Main.gs` 비밀값 매핑과 `switch`에 데이로그 분기만 추가합니다.
7. Apps Script 스크립트 속성에 `DAYLOG_LIFE_SESSION_SECRET`을 등록합니다.
8. Apps Script 웹 앱을 새 버전으로 배포합니다.
9. Vercel 환경변수를 등록하고 다시 배포합니다.
10. 퍼널 이벤트와 최종 신청을 테스트합니다.
11. 세 개의 데이로그 탭과 중복 방지를 확인합니다.
12. 기존 폼 다섯 개의 회귀 테스트를 진행합니다.

## 테스트 시나리오

### 정상 동작

- 모든 필수 답변과 신청 정보가 한 행으로 저장됩니다.
- 표시 문구와 응답 코드 JSON이 일치합니다.
- 퍼널 단계가 순서대로 기록됩니다.
- 퍼널현황 공식이 올바르게 계산됩니다.
- 신청 성공 후 `submitted` 이벤트가 기록됩니다.

### 중복과 재시도

- 같은 접수번호를 두 번 보내도 한 행만 저장됩니다.
- 같은 이벤트 ID를 두 번 보내도 한 이벤트만 저장됩니다.
- 네트워크 오류 후 같은 접수번호로 재시도할 수 있습니다.
- 중복 응답을 고객에게 오류로 표시하지 않습니다.

### 검증

- 알 수 없는 `formType`이 거부됩니다.
- 잘못된 secret이 거부됩니다.
- 허용되지 않은 enum 코드가 거부됩니다.
- 첫 변화 영역이 선택 영역에 없으면 거부됩니다.
- `flexible`과 다른 요일·시간대의 동시 선택이 거부됩니다.
- 개인정보 동의가 없으면 거부됩니다.
- 지나치게 긴 문자열이 거부됩니다.
- 수식으로 시작하는 문자열이 시트에서 실행되지 않습니다.

### 보안과 개인정보

- 브라우저 번들에 secret이 포함되지 않습니다.
- 브라우저 요청과 응답에 Apps Script URL이 노출되지 않습니다.
- 서버 로그에 이름과 연락처가 남지 않습니다.
- 퍼널 이벤트에 생활 답변이 포함되지 않습니다.
- honeypot 요청은 저장되지 않습니다.
- 과도한 반복 요청이 제한됩니다.

### 회귀

- 해나 포스터 신청이 기존 탭에 저장됩니다.
- 해나 광고 신청이 기존 탭에 저장됩니다.
- 해나 활동 신청이 기존 탭에 저장됩니다.
- 혁이레코드 인스타 신청이 기존 탭에 저장됩니다.
- 혁이레코드 활동 신청이 기존 탭에 저장됩니다.
- 통합 웹 앱의 `doGet()` 응답이 유지됩니다.

## 완료 기준

- 기존 총합 시트 관련 문서가 수정되지 않았습니다.
- Apps Script 프로젝트에 `doGet()`과 `doPost()`가 각각 하나만 있습니다.
- `daylog_life_session`이 새 처리기로만 라우팅됩니다.
- 데이로그 전용 세 탭에만 데이터가 기록됩니다.
- 비밀값은 Vercel 서버와 Apps Script 스크립트 속성에만 있습니다.
- 신청과 퍼널 이벤트의 중복 저장 방지가 작동합니다.
- 사용자 입력 수식 주입이 방지됩니다.
- 기존 폼 다섯 개의 저장과 퍼널 집계가 그대로 작동합니다.

## 미확정 항목

- React 빌드 도구·라우터와 Vercel API 파일 위치
- 연락 방법과 일정 수집 범위
- 공개 개인정보 처리방침
- 신청 완료 후 예약 시스템 연결 여부
- 속도 제한 기준과 저장소
- 운영 담당자의 Google Sheets 권한 범위

## 참조 전용 문서

다음 위치의 문서는 수정하지 않습니다.

```text
/Users/won-young/Library/Mobile Documents/com~apple~CloudDocs/도구/총합_시트_관련
```

특히 다음 문서의 통합 규약을 참고했습니다.

- `구글시트 Apps Script 통합 가이드.md`
- `통합 Apps Script Main Common 설정.md`
- `통합 Apps Script 폼별 GS 코드.md`
- `Vercel 환경변수 설정.md`
- 기존 폼별 코드 문서 5개

## 관련 문서

- [신청 폼 데이터 정의](신청-폼-데이터-정의.md)
- [신청 경험 구현 명세](신청-폼-구현.md)
- [신청 경험 디자인](../04-디자인/신청-폼-디자인.md)
- [검수 체크리스트](검수-체크리스트.md)
