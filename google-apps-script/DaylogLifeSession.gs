const DAYLOG_LIFE_SESSION_APPLICATION_SHEET = '데이로그_라이프세션_신청응답';
const DAYLOG_LIFE_SESSION_EVENT_SHEET = '데이로그_라이프세션_퍼널이벤트';
const DAYLOG_LIFE_SESSION_SUMMARY_SHEET = '데이로그_라이프세션_퍼널현황';
const DAYLOG_LIFE_SESSION_SCHEMA_VERSION = 'daylog-life-session-v2';
const DAYLOG_LIFE_SESSION_REQUEST_ID_PATTERN = /^DAYLOG-[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/;
const DAYLOG_LIFE_SESSION_SESSION_ID_PATTERN = /^DAYLOG-S-[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/;

const DAYLOG_LIFE_SESSION_HEADERS = [
  '접수시각', '접수번호', '신청 상태', '이름·호칭', '연락 방법', '연락처',
  '희망 요일', '희망 시간대', '하루 리듬', '편안한 시간', '힘든 시간',
  '지속 방식', '바꾸고 싶은 영역', '첫 변화 영역', '추가 이야기',
  '개인정보 동의', '접수 경로', 'UTM 소스', 'UTM 매체',
  'UTM 캠페인', '익명 세션 ID', '폼 버전', '스키마 버전', '응답 코드 JSON'
];
const DAYLOG_LIFE_SESSION_EVENT_HEADERS = [
  '기록시각', '이벤트ID', '익명 세션ID', '단계코드', '단계', '접속 경로', '폼 버전', '스키마 버전'
];
const DAYLOG_LIFE_SESSION_V1_ARCHIVE_HEADER = 'v1 보관 필드 (수집 중단)';

const DAYLOG_LIFE_SESSION_DAILY_RHYTHMS = Object.freeze({
  morning_active: '아침 중심',
  daytime_focus: '낮 중심',
  evening_important: '저녁 중심',
  irregular_daily: '불규칙'
});
const DAYLOG_LIFE_SESSION_PAST_PATTERNS = Object.freeze({
  solo_focus: '혼자 집중',
  together_commitment: '함께하는 약속',
  fixed_time_place: '정해진 시간·장소',
  meaning_or_fun: '즐거움·의미',
  unknown: '아직 모름'
});
const DAYLOG_LIFE_SESSION_CHANGE_AREAS = Object.freeze({
  sleep: '수면', meal: '식사', exercise: '운동', smartphone: '스마트폰',
  study: '공부', work: '업무', hobby: '취미', relationship: '관계', rest: '휴식'
});
const DAYLOG_LIFE_SESSION_CONTACT_METHODS = Object.freeze({
  phone: '문자·전화', email: '이메일', messenger: '메신저'
});
const DAYLOG_LIFE_SESSION_DAYS = Object.freeze({
  mon: '월', tue: '화', wed: '수', thu: '목', fri: '금', sat: '토', sun: '일', flexible: '상관없음'
});
const DAYLOG_LIFE_SESSION_PERIODS = Object.freeze({
  morning: '오전', afternoon: '오후', evening: '저녁', flexible: '상관없음'
});
const DAYLOG_LIFE_SESSION_FUNNEL_STAGES = [
  { key: 'started', label: '신청 경험 시작' },
  { key: 'daily_rhythm_selected', label: '하루 리듬 선택' },
  { key: 'energy_selected', label: '편안한·힘든 시간 선택' },
  { key: 'past_pattern_selected', label: '지속 방식 선택' },
  { key: 'change_area_selected', label: '변화 영역 선택' },
  { key: 'application_started', label: '신청 정보 입력' },
  { key: 'consent_accepted', label: '개인정보 동의' },
  { key: 'submitted', label: '신청 완료' }
];
const DAYLOG_LIFE_SESSION_FUNNEL_LABELS = DAYLOG_LIFE_SESSION_FUNNEL_STAGES.reduce(function(result, stage) {
  result[stage.key] = stage.label;
  return result;
}, {});

function handleDaylogLifeSession_(payload, lock) {
  if (payload.action === 'track') return saveDaylogLifeSessionFunnelEvent_(payload, lock);
  if (payload.website) {
    return jsonResponse_({
      ok: true,
      submissionId: String(payload.requestId || ''),
      schemaVersion: DAYLOG_LIFE_SESSION_SCHEMA_VERSION
    });
  }
  if (payload.action !== 'submit') throw new Error('invalid_action');

  const clean = cleanDaylogLifeSessionApplication_(payload);
  lock.waitLock(10000);
  const sheet = getDaylogLifeSessionApplicationSheet_(getBook_());
  if (valueExists_(sheet, 2, clean.requestId)) {
    return jsonResponse_({
      ok: true,
      submissionId: clean.requestId,
      schemaVersion: DAYLOG_LIFE_SESSION_SCHEMA_VERSION,
      duplicate: true
    });
  }

  const responseCodes = JSON.stringify({
    dailyRhythm: clean.dailyRhythm,
    comfortableTime: clean.comfortableTime,
    difficultTime: clean.difficultTime,
    pastPattern: clean.pastPattern,
    changeAreas: clean.changeAreas,
    primaryChangeArea: clean.primaryChangeArea,
    schemaVersion: clean.schemaVersion
  });

  appendDaylogLifeSessionApplicationRow_(sheet, [
    new Date(), clean.requestId, '신규', safeCell_(clean.displayName),
    DAYLOG_LIFE_SESSION_CONTACT_METHODS[clean.contactMethod], safeCell_(clean.contactValue),
    clean.preferredDays.map(function(value) { return DAYLOG_LIFE_SESSION_DAYS[value]; }).join(', '),
    clean.preferredPeriods.map(function(value) { return DAYLOG_LIFE_SESSION_PERIODS[value]; }).join(', '),
    DAYLOG_LIFE_SESSION_DAILY_RHYTHMS[clean.dailyRhythm], safeCell_(clean.comfortableTime),
    safeCell_(clean.difficultTime), DAYLOG_LIFE_SESSION_PAST_PATTERNS[clean.pastPattern],
    clean.changeAreas.map(function(value) { return DAYLOG_LIFE_SESSION_CHANGE_AREAS[value]; }).join(', '),
    DAYLOG_LIFE_SESSION_CHANGE_AREAS[clean.primaryChangeArea],
    safeCell_(clean.additionalNote), '동의', safeCell_(clean.source), safeCell_(clean.utmSource), safeCell_(clean.utmMedium),
    safeCell_(clean.utmCampaign), clean.sessionId, clean.formVersion, clean.schemaVersion, safeCell_(responseCodes)
  ]);

  return jsonResponse_({
    ok: true,
    submissionId: clean.requestId,
    schemaVersion: DAYLOG_LIFE_SESSION_SCHEMA_VERSION
  });
}

function saveDaylogLifeSessionFunnelEvent_(payload, lock) {
  const eventId = daylogLifeSessionText_(payload.eventId, 100, true);
  const sessionId = daylogLifeSessionText_(payload.sessionId, 45, true);
  const stage = daylogLifeSessionText_(payload.stage, 40, true);
  const source = daylogLifeSessionText_(payload.source, 50, true);
  const formVersion = daylogLifeSessionText_(payload.formVersion, 30, true);
  const schemaVersion = daylogLifeSessionText_(payload.schemaVersion, 30, true);
  if (!DAYLOG_LIFE_SESSION_SESSION_ID_PATTERN.test(sessionId)) throw new Error('invalid_session_id');
  if (!DAYLOG_LIFE_SESSION_FUNNEL_LABELS[stage]) throw new Error('invalid_funnel_stage');
  if (eventId !== sessionId + ':' + stage) throw new Error('invalid_event_id');
  if (schemaVersion !== DAYLOG_LIFE_SESSION_SCHEMA_VERSION) throw new Error('invalid_schema_version');

  lock.waitLock(10000);
  const book = getBook_();
  const sheet = getDaylogLifeSessionFunnelEventSheet_(book);
  getDaylogLifeSessionFunnelSummarySheet_(book);
  if (valueExists_(sheet, 2, eventId)) {
    return jsonResponse_({
      ok: true,
      eventId: eventId,
      schemaVersion: DAYLOG_LIFE_SESSION_SCHEMA_VERSION,
      duplicate: true
    });
  }
  sheet.appendRow([
    new Date(), eventId, sessionId, stage, DAYLOG_LIFE_SESSION_FUNNEL_LABELS[stage],
    safeCell_(source), safeCell_(formVersion), schemaVersion
  ]);
  return jsonResponse_({
    ok: true,
    eventId: eventId,
    schemaVersion: DAYLOG_LIFE_SESSION_SCHEMA_VERSION
  });
}

function cleanDaylogLifeSessionApplication_(payload) {
  const clean = {
    requestId: daylogLifeSessionText_(payload.requestId, 43, true),
    sessionId: daylogLifeSessionText_(payload.sessionId, 45, true),
    dailyRhythm: String(payload.dailyRhythm || ''),
    comfortableTime: daylogLifeSessionText_(payload.comfortableTime, 100, true),
    difficultTime: daylogLifeSessionText_(payload.difficultTime, 100, true),
    pastPattern: String(payload.pastPattern || ''),
    changeAreas: Array.isArray(payload.changeAreas) ? payload.changeAreas.map(String) : [],
    primaryChangeArea: String(payload.primaryChangeArea || ''),
    displayName: daylogLifeSessionText_(payload.displayName, 50, true),
    contactMethod: String(payload.contactMethod || ''),
    contactValue: daylogLifeSessionText_(payload.contactValue, 100, true),
    preferredDays: Array.isArray(payload.preferredDays) ? payload.preferredDays.map(String) : [],
    preferredPeriods: Array.isArray(payload.preferredPeriods) ? payload.preferredPeriods.map(String) : [],
    additionalNote: daylogLifeSessionText_(payload.additionalNote, 500, false),
    source: daylogLifeSessionText_(payload.source, 50, true),
    utmSource: daylogLifeSessionText_(payload.utmSource, 100, false),
    utmMedium: daylogLifeSessionText_(payload.utmMedium, 100, false),
    utmCampaign: daylogLifeSessionText_(payload.utmCampaign, 100, false),
    formVersion: daylogLifeSessionText_(payload.formVersion, 30, true),
    schemaVersion: daylogLifeSessionText_(payload.schemaVersion, 30, true)
  };

  if (!DAYLOG_LIFE_SESSION_REQUEST_ID_PATTERN.test(clean.requestId)) throw new Error('invalid_request_id');
  if (!DAYLOG_LIFE_SESSION_SESSION_ID_PATTERN.test(clean.sessionId)) throw new Error('invalid_session_id');
  if (!DAYLOG_LIFE_SESSION_DAILY_RHYTHMS[clean.dailyRhythm]) throw new Error('invalid_daily_rhythm');
  if (!DAYLOG_LIFE_SESSION_PAST_PATTERNS[clean.pastPattern]) throw new Error('invalid_past_pattern');
  validateDaylogLifeSessionArray_(clean.changeAreas, DAYLOG_LIFE_SESSION_CHANGE_AREAS, 1, 3, 'change_areas');
  if (clean.changeAreas.indexOf(clean.primaryChangeArea) === -1) throw new Error('invalid_primary_change_area');
  if (!DAYLOG_LIFE_SESSION_CONTACT_METHODS[clean.contactMethod]) throw new Error('invalid_contact_method');
  validateDaylogLifeSessionContact_(clean.contactMethod, clean.contactValue);
  validateDaylogLifeSessionArray_(clean.preferredDays, DAYLOG_LIFE_SESSION_DAYS, 0, 7, 'preferred_days');
  validateDaylogLifeSessionArray_(clean.preferredPeriods, DAYLOG_LIFE_SESSION_PERIODS, 0, 3, 'preferred_periods');
  if (clean.preferredDays.indexOf('flexible') !== -1 && clean.preferredDays.length !== 1) throw new Error('invalid_days_flexible');
  if (clean.preferredPeriods.indexOf('flexible') !== -1 && clean.preferredPeriods.length !== 1) throw new Error('invalid_periods_flexible');
  if (payload.privacyConsent !== true) throw new Error('consent_required');
  if (clean.schemaVersion !== DAYLOG_LIFE_SESSION_SCHEMA_VERSION) throw new Error('invalid_schema_version');
  return clean;
}

function validateDaylogLifeSessionArray_(values, allowed, min, max, field) {
  if (values.length < min || values.length > max) throw new Error('invalid_' + field);
  if (new Set(values).size !== values.length) throw new Error('duplicate_' + field);
  if (values.some(function(value) { return !allowed[value]; })) throw new Error('invalid_' + field);
}

function validateDaylogLifeSessionContact_(method, value) {
  if (method === 'phone') {
    const digits = value.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 11) throw new Error('invalid_phone');
  }
  if (method === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new Error('invalid_email');
  if (method === 'messenger' && value.length < 2) throw new Error('invalid_messenger');
}

function getDaylogLifeSessionApplicationSheet_(book) {
  let sheet = book.getSheetByName(DAYLOG_LIFE_SESSION_APPLICATION_SHEET);
  if (!sheet) sheet = book.insertSheet(DAYLOG_LIFE_SESSION_APPLICATION_SHEET);
  if (sheet.getLastRow() === 0) {
    setDaylogLifeSessionHeader_(sheet, DAYLOG_LIFE_SESSION_HEADERS);
    sheet.getRange('A:A').setNumberFormat('yyyy-mm-dd hh:mm:ss');
    return sheet;
  }

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
  const legacyColumn = headers.indexOf('함께하는 방식');
  if (legacyColumn !== -1) {
    sheet.getRange(1, legacyColumn + 1).setValue(DAYLOG_LIFE_SESSION_V1_ARCHIVE_HEADER);
  }
  return sheet;
}

function appendDaylogLifeSessionApplicationRow_(sheet, values) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
  const missingHeaders = DAYLOG_LIFE_SESSION_HEADERS.filter(function(header) {
    return headers.indexOf(header) === -1;
  });
  if (missingHeaders.length) throw new Error('invalid_application_sheet_schema');

  const alignedRow = headers.map(function(header) {
    const index = DAYLOG_LIFE_SESSION_HEADERS.indexOf(header);
    return index === -1 ? '' : values[index];
  });
  sheet.appendRow(alignedRow);
}

function getDaylogLifeSessionFunnelEventSheet_(book) {
  let sheet = book.getSheetByName(DAYLOG_LIFE_SESSION_EVENT_SHEET);
  if (!sheet) sheet = book.insertSheet(DAYLOG_LIFE_SESSION_EVENT_SHEET);
  if (sheet.getLastRow() === 0) {
    setDaylogLifeSessionHeader_(sheet, DAYLOG_LIFE_SESSION_EVENT_HEADERS);
    sheet.getRange('A:A').setNumberFormat('yyyy-mm-dd hh:mm:ss');
  } else {
    setDaylogLifeSessionHeader_(sheet, DAYLOG_LIFE_SESSION_EVENT_HEADERS);
  }
  return sheet;
}

function getDaylogLifeSessionFunnelSummarySheet_(book) {
  let sheet = book.getSheetByName(DAYLOG_LIFE_SESSION_SUMMARY_SHEET);
  if (!sheet) sheet = book.insertSheet(DAYLOG_LIFE_SESSION_SUMMARY_SHEET);
  const expected = DAYLOG_LIFE_SESSION_FUNNEL_STAGES.map(function(stage) { return stage.key; });
  const existing = sheet.getLastRow() > 1
    ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getDisplayValues().map(function(row) { return row[0]; }).filter(String)
    : [];
  if (existing.join('|') === expected.join('|')) return sheet;

  sheet.getBandings().forEach(function(banding) { banding.remove(); });
  sheet.clear();
  setDaylogLifeSessionHeader_(sheet, ['단계코드', '단계', '사용자 수', '이전 단계 대비', '이탈 수', '이탈률', '시작 대비']);
  const rows = DAYLOG_LIFE_SESSION_FUNNEL_STAGES.map(function(stage) { return [stage.key, stage.label, '', '', '', '', '']; });
  sheet.getRange(2, 1, rows.length, 7).setValues(rows);
  DAYLOG_LIFE_SESSION_FUNNEL_STAGES.forEach(function(stage, index) {
    const row = index + 2;
    sheet.getRange(row, 3).setFormula("=COUNTIF('" + DAYLOG_LIFE_SESSION_EVENT_SHEET + "'!$D:$D,A" + row + ")");
    sheet.getRange(row, 7).setFormula('=IFERROR(C' + row + '/$C$2,0)');
    if (index === 0) {
      sheet.getRange(row, 4, 1, 3).setValues([['—', '—', '—']]);
    } else {
      sheet.getRange(row, 4).setFormula('=IFERROR(C' + row + '/C' + (row - 1) + ',0)');
      sheet.getRange(row, 5).setFormula('=MAX(C' + (row - 1) + '-C' + row + ',0)');
      sheet.getRange(row, 6).setFormula('=IFERROR(1-D' + row + ',0)');
    }
  });
  sheet.getRange(2, 4, rows.length, 1).setNumberFormat('0.0%');
  sheet.getRange(2, 6, rows.length, 2).setNumberFormat('0.0%');
  sheet.hideColumns(1);
  sheet.getRange(2, 2, rows.length, 6).applyRowBanding(SpreadsheetApp.BandingTheme.BLUE, false, false);
  return sheet;
}

function setDaylogLifeSessionHeader_(sheet, values) {
  sheet.getRange(1, 1, 1, values.length)
    .setValues([values]).setBackground('#172033').setFontColor('#FFFFFF').setFontWeight('bold');
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, values.length);
}

function daylogLifeSessionText_(value, maxLength, required) {
  if (value == null && !required) return '';
  if (typeof value !== 'string') throw new Error('invalid_text');
  const result = value.trim();
  if ((required && !result) || result.length > maxLength) throw new Error('invalid_text');
  return result;
}
