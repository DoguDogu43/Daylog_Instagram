# Google Sheets 적용

## 적용 원칙

기존 통합 Google Apps Script의 공통 함수와 다섯 폼 처리기는 수정하지 않습니다. 통합 진입점에는 데이로그 라우팅에 필요한 두 항목만 추가하고, 실제 저장 로직은 새 `DaylogLifeSession.gs` 파일에 둡니다.

구현 파일:

```text
google-apps-script/DaylogLifeSession.gs
```

## 1. 스크립트 속성 추가

Apps Script의 프로젝트 설정에서 다음 속성을 추가합니다.

| 이름 | 값 |
| --- | --- |
| `DAYLOG_LIFE_SESSION_SECRET` | 새로 생성한 충분히 긴 임의의 비밀값 |

실제 값은 문서나 코드에 기록하지 않습니다.

## 2. `Main.gs` 비밀키 매핑 추가

기존 `SECRET_PROPERTY_BY_FORM_` 객체에 다음 한 줄을 추가합니다.

```javascript
daylog_life_session: 'DAYLOG_LIFE_SESSION_SECRET'
```

기존 항목은 삭제하거나 이름을 바꾸지 않습니다.

## 3. `Main.gs` 분기 추가

기존 `doPost()`의 `switch (payload.formType)`에 다음 분기를 추가합니다.

```javascript
case 'daylog_life_session':
  return handleDaylogLifeSession_(payload, lock);
```

새 `doGet()` 또는 `doPost()`를 만들지 않습니다.

## 4. 폼별 코드 추가

Apps Script 프로젝트에 `DaylogLifeSession.gs` 파일을 만들고 구현 저장소의 같은 이름 파일 내용을 복사합니다.

이 파일은 기존 `Common.gs`의 다음 함수를 재사용합니다.

- `getBook_()`
- `valueExists_()`
- `safeCell_()`
- `jsonResponse_()`

적용 전 구현 파일이 다음 v3 계약과 일치하는지 확인합니다.

- `schemaVersion`: `daylog-life-session-v3`
- `comfortableTime`, `difficultTime`: 앞뒤 공백 제거 후 각각 1~100자 문자열
- `changeAreas`: 배열 순서가 1·2·3순위
- 신청 필드: 이름, 나이, `010-0000-0000` 전화번호, 주변 역, 인터뷰 가능 요일·시간대
- 퍼널: `session_info_viewed` 다음 `application_started`

## 5. Apps Script 재배포

새 버전으로 웹 앱을 배포합니다. URL은 기존과 같은 통합 `/exec` 주소를 사용합니다.

## 6. 생성되는 탭

첫 신청과 이벤트 기록 시 다음 탭이 자동 생성됩니다.

```text
데이로그_라이프세션_신청응답
데이로그_라이프세션_퍼널이벤트
데이로그_라이프세션_퍼널현황
```

## 회귀 확인

- 기존 다섯 폼이 기존 탭에 정상 저장되는지 확인합니다.
- 통합 웹 앱의 `doGet()` 응답이 유지되는지 확인합니다.
- Apps Script 프로젝트 전체에 `doGet()`과 `doPost()`가 각각 하나인지 확인합니다.
- 데이로그 신청은 데이로그 탭에만 저장되는지 확인합니다.
- 같은 접수번호와 이벤트 ID를 다시 보내도 새 행이 생기지 않는지 확인합니다.
- 4단계 다음 `session_info_viewed`, `application_started`가 순서대로 집계되는지 확인합니다.
- 신규 신청응답 탭이 v3 23열 구조로 생성되고 순위와 신청자 정보가 정확히 저장되는지 확인합니다.
- 기존 v1 탭은 적용 전에 백업합니다. 적용 후 `함께하는 방식` 헤더가 `v1 보관 필드 (수집 중단)`으로 바뀌되 기존 셀 값이 유지되는지 확인합니다.
- 기존 탭에는 누락된 v3 열만 추가되고 새 행은 헤더명 기준으로 정렬되는지 확인합니다. Apps Script는 기존 데이터 열을 삭제하거나 덮어쓰지 않습니다.

이 문서는 적용 절차이며 실제 Apps Script 추가, 환경변수 등록과 재배포가 확인되기 전에는 운영 완료로 간주하지 않습니다.
