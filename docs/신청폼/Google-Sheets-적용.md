# Google Sheets 적용

## 적용 원칙

기존 통합 Google Apps Script의 공통 함수와 다섯 폼 처리기는 수정하지 않습니다. 통합 진입점에는 데이로그 라우팅에 필요한 두 항목만 추가하고, 실제 저장 로직은 새 `DaylogLifeSession.gs` 파일에 둡니다.

구현 파일:

```text
/Users/won-young/Documents/ChatGPT/데이로그/application-form/google-apps-script/DaylogLifeSession.gs
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
