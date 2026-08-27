import {
  applyRateLimit,
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
const TOGETHER_STYLES = ['visible_plan', 'social_commitment', 'tiny_start', 'frequent_adjustment', 'offline_discovery'] as const
const CONTACT_METHODS = ['phone', 'email', 'messenger'] as const
const PREFERRED_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun', 'flexible'] as const
const PREFERRED_PERIODS = ['morning', 'afternoon', 'evening', 'flexible'] as const

const REQUEST_ID = /^DAYLOG-[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/
const SESSION_ID = /^DAYLOG-S-[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/

function cleanApplication(payload: Record<string, unknown>) {
  if (payload.action !== 'submit') throw new RequestError('신청 요청을 확인해주세요.')
  const requestId = text(payload.requestId, '접수번호', 43, 43)
  const sessionId = text(payload.sessionId, '세션', 45, 45)
  if (!REQUEST_ID.test(requestId) || !SESSION_ID.test(sessionId)) throw new RequestError('접수 정보를 확인해주세요.')

  const comfortableTime = text(payload.comfortableTime, '편안한 시간', 1, 100)
  const difficultTime = text(payload.difficultTime, '힘든 시간', 1, 100)

  const changeAreas = enumArray(payload.changeAreas, CHANGE_AREAS, '변화 영역', 1, 3)
  const primaryChangeArea = enumValue(payload.primaryChangeArea, CHANGE_AREAS, '첫 변화 영역')
  if (!changeAreas.includes(primaryChangeArea)) throw new RequestError('첫 변화 영역을 확인해주세요.')

  const contactMethod = enumValue(payload.contactMethod, CONTACT_METHODS, '연락 방법')
  const contactValue = text(payload.contactValue, '연락처', 2, 100)
  if (contactMethod === 'phone') {
    const digits = contactValue.replace(/\D/g, '')
    if (digits.length < 10 || digits.length > 11) throw new RequestError('휴대전화 번호를 확인해주세요.')
  }
  if (contactMethod === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactValue)) {
    throw new RequestError('이메일 주소를 확인해주세요.')
  }

  const preferredDays = enumArray(payload.preferredDays, PREFERRED_DAYS, '희망 요일', 0, 7)
  const preferredPeriods = enumArray(payload.preferredPeriods, PREFERRED_PERIODS, '희망 시간대', 0, 3)
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
    primaryChangeArea,
    togetherStyle: payload.togetherStyle ? enumValue(payload.togetherStyle, TOGETHER_STYLES, '함께하는 방식') : '',
    displayName: text(payload.displayName, '이름·호칭', 1, 50),
    contactMethod,
    contactValue,
    preferredDays,
    preferredPeriods,
    additionalNote: optionalText(payload.additionalNote, '추가 이야기', 500),
    privacyConsent: true,
    source: text(payload.source, '접수 경로', 1, 50),
    utmSource: optionalText(payload.utmSource, 'UTM 소스', 100),
    utmMedium: optionalText(payload.utmMedium, 'UTM 매체', 100),
    utmCampaign: optionalText(payload.utmCampaign, 'UTM 캠페인', 100),
    formVersion: text(payload.formVersion, '폼 버전', 1, 30),
    schemaVersion: enumValue(payload.schemaVersion, ['daylog-life-session-v1'] as const, '스키마 버전'),
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
      response.status(200).json({ ok: true, requestId })
      return
    }

    const clean = cleanApplication(payload)
    const result = await forwardToAppsScript(clean)
    response.status(200).json({
      ok: true,
      requestId: result.submissionId || clean.requestId,
      duplicate: result.duplicate === true,
    })
  } catch (error) {
    handleApiError(error, response)
  }
}
