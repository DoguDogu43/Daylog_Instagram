import {
  applyRateLimit,
  DAYLOG_LIFE_SESSION_SCHEMA_VERSION,
  DAYLOG_SESSION_ID_PATTERN,
  enumValue,
  forwardToAppsScript,
  handleApiError,
  parseBody,
  prepareResponse,
  RequestError,
  requirePost,
  text,
  type ApiRequest,
  type ApiResponse,
} from '../_shared.js'

const STAGES = [
  'started',
  'daily_rhythm_selected',
  'energy_selected',
  'past_pattern_selected',
  'change_area_selected',
  'session_info_viewed',
  'application_started',
  'consent_accepted',
  'submitted',
] as const

export default async function handler(request: ApiRequest, response: ApiResponse) {
  prepareResponse(response)
  if (!requirePost(request, response)) return

  try {
    applyRateLimit(request, 'track', 80, 10 * 60 * 1000)
    const payload = parseBody(request)
    if (payload.action !== 'track') throw new RequestError('진행 기록 요청을 확인해주세요.')
    const sessionId = text(payload.sessionId, '세션', 45, 45)
    const stage = enumValue(payload.stage, STAGES, '진행 단계')
    const eventId = text(payload.eventId, '이벤트', 1, 100)
    if (!DAYLOG_SESSION_ID_PATTERN.test(sessionId) || eventId !== `${sessionId}:${stage}`) {
      throw new RequestError('진행 기록을 확인해주세요.')
    }

    const schemaVersion = enumValue(
      payload.schemaVersion,
      [DAYLOG_LIFE_SESSION_SCHEMA_VERSION] as const,
      '스키마 버전',
    )

    await forwardToAppsScript({
      action: 'track',
      eventId,
      sessionId,
      stage,
      source: text(payload.source, '접수 경로', 1, 50),
      formVersion: text(payload.formVersion, '폼 버전', 1, 30),
      schemaVersion,
    })
    response.status(200).json({ ok: true, eventId, schemaVersion })
  } catch (error) {
    handleApiError(error, response)
  }
}
