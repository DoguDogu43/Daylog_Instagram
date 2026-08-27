import {
  applyRateLimit,
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
  'together_style_selected',
  'life_note_viewed',
  'application_started',
  'consent_accepted',
  'submitted',
] as const

const SESSION_ID = /^DAYLOG-S-[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/

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
    if (!SESSION_ID.test(sessionId) || eventId !== `${sessionId}:${stage}`) {
      throw new RequestError('진행 기록을 확인해주세요.')
    }

    await forwardToAppsScript({
      action: 'track',
      eventId,
      sessionId,
      stage,
      source: text(payload.source, '접수 경로', 1, 50),
      formVersion: text(payload.formVersion, '폼 버전', 1, 30),
    })
    response.status(200).json({ ok: true, eventId })
  } catch (error) {
    handleApiError(error, response)
  }
}
