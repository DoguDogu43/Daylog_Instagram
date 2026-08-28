import {
  applyRateLimit,
  DAYLOG_LIFE_SESSION_SCHEMA_VERSION,
  DAYLOG_REQUEST_ID_PATTERN,
  DAYLOG_SESSION_ID_PATTERN,
  enumArray,
  enumValue,
  forwardToAppsScript,
  handleApiError,
  optionalText,
  parseBody,
  prepareResponse,
  RequestError,
  requirePost,
  text,
  type ApiRequest,
  type ApiResponse,
} from '../_shared.js'

const DAILY_RHYTHMS = ['morning_active', 'daytime_focus', 'evening_important', 'irregular_daily'] as const
const PAST_PATTERNS = ['solo_focus', 'together_commitment', 'fixed_time_place', 'meaning_or_fun', 'unknown'] as const
const CHANGE_AREAS = ['sleep', 'meal', 'exercise', 'smartphone', 'study', 'work', 'hobby', 'relationship', 'rest'] as const
const PREFERRED_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun', 'flexible'] as const
const PREFERRED_PERIODS = ['morning', 'afternoon', 'evening', 'flexible'] as const

function cleanApplication(payload: Record<string, unknown>) {
  if (payload.action !== 'submit') throw new RequestError('신청 요청을 확인해주세요.')
  const requestId = text(payload.requestId, '접수번호', 43, 43)
  const sessionId = text(payload.sessionId, '세션', 45, 45)
  if (!DAYLOG_REQUEST_ID_PATTERN.test(requestId) || !DAYLOG_SESSION_ID_PATTERN.test(sessionId)) {
    throw new RequestError('접수 정보를 확인해주세요.')
  }

  const comfortableTime = text(payload.comfortableTime, '편안한 시간', 1, 100)
  const difficultTime = text(payload.difficultTime, '힘든 시간', 1, 100)

  const changeAreas = enumArray(payload.changeAreas, CHANGE_AREAS, '변화 영역 순위', 1, 3)
  const ageText = text(String(payload.age ?? ''), '나이', 1, 3)
  const age = Number(ageText)
  if (!/^\d{1,3}$/.test(ageText) || !Number.isInteger(age) || age < 1 || age > 120) {
    throw new RequestError('나이를 확인해주세요.')
  }
  const phoneNumber = text(payload.phoneNumber, '전화번호', 13, 13)
  if (!/^010-\d{4}-\d{4}$/.test(phoneNumber)) throw new RequestError('전화번호 형식을 확인해주세요.')
  const nearbyStation = text(payload.nearbyStation, '거주지 주변 역', 1, 50)

  const preferredDays = enumArray(payload.preferredDays, PREFERRED_DAYS, '인터뷰 가능 요일', 1, 7)
  const preferredPeriods = enumArray(payload.preferredPeriods, PREFERRED_PERIODS, '인터뷰 가능 시간대', 1, 3)
  if (preferredDays.includes('flexible') && preferredDays.length !== 1) throw new RequestError('희망 요일을 확인해주세요.')
  if (preferredPeriods.includes('flexible') && preferredPeriods.length !== 1) throw new RequestError('희망 시간대를 확인해주세요.')
  if (payload.privacyConsent !== true) throw new RequestError('개인정보 수집·이용 동의가 필요해요.')

  return {
    action: 'submit',
    requestId,
    sessionId,
    dailyRhythm: enumValue(payload.dailyRhythm, DAILY_RHYTHMS, '하루 리듬'),
    comfortableTime,
    difficultTime,
    pastPattern: enumValue(payload.pastPattern, PAST_PATTERNS, '지속 방식'),
    changeAreas,
    displayName: text(payload.displayName, '이름', 1, 50),
    age,
    phoneNumber,
    nearbyStation,
    preferredDays,
    preferredPeriods,
    privacyConsent: true,
    source: text(payload.source, '접수 경로', 1, 50),
    utmSource: optionalText(payload.utmSource, 'UTM 소스', 100),
    utmMedium: optionalText(payload.utmMedium, 'UTM 매체', 100),
    utmCampaign: optionalText(payload.utmCampaign, 'UTM 캠페인', 100),
    formVersion: text(payload.formVersion, '폼 버전', 1, 30),
    schemaVersion: enumValue(payload.schemaVersion, [DAYLOG_LIFE_SESSION_SCHEMA_VERSION] as const, '스키마 버전'),
    website: '',
  }
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  prepareResponse(response)
  if (!requirePost(request, response)) return

  try {
    applyRateLimit(request, 'application', 8, 10 * 60 * 1000)
    const payload = parseBody(request)

    if (typeof payload.website === 'string' && payload.website.trim()) {
      const requestId = typeof payload.requestId === 'string' ? payload.requestId : ''
      response.status(200).json({ ok: true, requestId, schemaVersion: DAYLOG_LIFE_SESSION_SCHEMA_VERSION })
      return
    }

    const clean = cleanApplication(payload)
    const result = await forwardToAppsScript(clean)
    response.status(200).json({
      ok: true,
      requestId: result.submissionId || clean.requestId,
      schemaVersion: DAYLOG_LIFE_SESSION_SCHEMA_VERSION,
      duplicate: result.duplicate === true,
    })
  } catch (error) {
    handleApiError(error, response)
  }
}
