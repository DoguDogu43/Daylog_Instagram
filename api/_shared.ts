export type ApiRequest = {
  method?: string
  body?: unknown
  headers: Record<string, string | string[] | undefined>
}

export type ApiResponse = {
  status(code: number): ApiResponse
  json(body: unknown): void
  setHeader(name: string, value: string): void
}

type ForwardResult = {
  ok: boolean
  submissionId?: string
  eventId?: string
  schemaVersion?: string
  duplicate?: boolean
  error?: string
}

export const DAYLOG_LIFE_SESSION_SCHEMA_VERSION = 'daylog-life-session-v3'
export const DAYLOG_REQUEST_ID_PATTERN = /^DAYLOG-[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/
export const DAYLOG_SESSION_ID_PATTERN = /^DAYLOG-S-[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/

const MAX_BODY_BYTES = 20_000
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

export class RequestError extends Error {
  status: number

  constructor(message: string, status = 400) {
    super(message)
    this.status = status
  }
}

export function prepareResponse(response: ApiResponse) {
  response.setHeader('Cache-Control', 'no-store')
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
}

export function requirePost(request: ApiRequest, response: ApiResponse) {
  if (request.method === 'POST') return true
  response.setHeader('Allow', 'POST')
  response.status(405).json({ ok: false, error: '허용되지 않은 요청이에요.' })
  return false
}

export function requireJson(request: ApiRequest) {
  const raw = request.headers['content-type']
  const contentType = Array.isArray(raw) ? raw[0] : raw
  if (!contentType?.toLowerCase().includes('application/json')) {
    throw new RequestError('JSON 형식으로 보내주세요.', 415)
  }
}

export function parseBody(request: ApiRequest): Record<string, unknown> {
  requireJson(request)

  const raw = typeof request.body === 'string' ? request.body : JSON.stringify(request.body ?? {})
  if (Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) {
    throw new RequestError('요청 내용이 너무 커요.', 413)
  }

  let value: unknown = request.body
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value)
    } catch {
      throw new RequestError('JSON 형식을 확인해주세요.')
    }
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new RequestError('요청 내용을 확인해주세요.')
  }

  return value as Record<string, unknown>
}

export function applyRateLimit(request: ApiRequest, scope: string, limit: number, windowMs: number) {
  const forwardedFor = request.headers['x-forwarded-for']
  const ipValue = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor
  const ip = ipValue?.split(',')[0]?.trim() || 'unknown'
  const key = `${scope}:${ip}`
  const now = Date.now()
  const current = rateLimitStore.get(key)

  if (!current || current.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs })
    return
  }

  current.count += 1
  if (current.count > limit) {
    throw new RequestError('요청이 너무 많아요. 잠시 후 다시 시도해주세요.', 429)
  }
}

export function text(value: unknown, field: string, min: number, max: number) {
  if (typeof value !== 'string') throw new RequestError(`${field} 값을 확인해주세요.`)
  const result = value.trim()
  if (result.length < min || result.length > max) throw new RequestError(`${field} 값을 확인해주세요.`)
  return result
}

export function optionalText(value: unknown, field: string, max: number) {
  if (value === undefined || value === null || value === '') return ''
  return text(value, field, 0, max)
}

export function enumValue<T extends string>(value: unknown, allowed: readonly T[], field: string): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new RequestError(`${field} 값을 확인해주세요.`)
  }
  return value as T
}

export function enumArray<T extends string>(
  value: unknown,
  allowed: readonly T[],
  field: string,
  min: number,
  max: number,
) {
  if (!Array.isArray(value) || value.length < min || value.length > max) {
    throw new RequestError(`${field} 값을 확인해주세요.`)
  }
  const result = value.map((item) => enumValue(item, allowed, field))
  if (new Set(result).size !== result.length) throw new RequestError(`${field}에 중복된 값이 있어요.`)
  return result
}

export function integer(value: unknown, field: string, min: number, max: number) {
  if (!Number.isInteger(value) || (value as number) < min || (value as number) > max) {
    throw new RequestError(`${field} 값을 확인해주세요.`)
  }
  return value as number
}

export async function forwardToAppsScript(payload: Record<string, unknown>): Promise<ForwardResult> {
  const url = process.env.GOOGLE_APPS_SCRIPT_URL
  const secret = process.env.GOOGLE_APPS_SCRIPT_SHARED_SECRET
  const formType = process.env.DAYLOG_FORM_TYPE || 'daylog_life_session'

  if (!url || !secret || formType !== 'daylog_life_session') {
    throw new RequestError('신청 접수 설정이 아직 완료되지 않았어요.', 503)
  }

  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
  } catch {
    throw new RequestError('신청 접수 설정을 확인해주세요.', 503)
  }
  if (parsedUrl.protocol !== 'https:' || parsedUrl.hostname !== 'script.google.com' || !parsedUrl.pathname.endsWith('/exec')) {
    throw new RequestError('신청 접수 설정을 확인해주세요.', 503)
  }

  const configuredTimeout = Number(process.env.APPS_SCRIPT_TIMEOUT_MS || 9000)
  const timeoutMs = Number.isFinite(configuredTimeout)
    ? Math.min(Math.max(configuredTimeout, 3000), 15000)
    : 9000
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const result = await fetch(parsedUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, formType, secret }),
      redirect: 'follow',
      signal: controller.signal,
    })

    if (!result.ok) throw new Error(`upstream_status_${result.status}`)
    const body = (await result.json()) as unknown
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('invalid_upstream_response')
    const response = body as ForwardResult
    if (response.ok !== true) throw new Error('upstream_rejected')
    if (response.schemaVersion !== DAYLOG_LIFE_SESSION_SCHEMA_VERSION) throw new Error('upstream_schema_mismatch')
    return response
  } catch (error) {
    console.error('daylog_apps_script_forward_failed', error instanceof Error ? error.message : 'unknown')
    throw new RequestError('지금은 이야기를 전달하기 어려워요. 잠시 후 다시 시도해주세요.', 502)
  } finally {
    clearTimeout(timeout)
  }
}

export function handleApiError(error: unknown, response: ApiResponse) {
  if (error instanceof RequestError) {
    response.status(error.status).json({ ok: false, error: error.message })
    return
  }
  console.error('daylog_api_error', error instanceof Error ? error.message : 'unknown')
  response.status(500).json({ ok: false, error: '잠시 후 다시 시도해주세요.' })
}
