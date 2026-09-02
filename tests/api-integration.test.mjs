import test from 'node:test'
import assert from 'node:assert/strict'
import { createApp } from '../server.mjs'

const realFetch = globalThis.fetch.bind(globalThis)

// forwardToAppsScript 가 통과할 수 있는 env (script.google.com/.../exec 검증 충족)
process.env.GOOGLE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKtest/exec'
process.env.GOOGLE_APPS_SCRIPT_SHARED_SECRET = 'test-secret'
process.env.DAYLOG_FORM_TYPE = 'daylog_life_session'

const { default: applicationHandler } = await import('../server-dist/daylog/application.js')
const { default: trackHandler } = await import('../server-dist/daylog/track.js')

function startServer() {
  const server = createApp({
    distDir: '/nonexistent-dist',
    routes: {
      '/api/daylog/application': applicationHandler,
      '/api/daylog/track': trackHandler,
    },
  })
  return new Promise((resolve) => {
    server.listen(0, () => resolve({ server, base: `http://127.0.0.1:${server.address().port}` }))
  })
}

test('error: GET /api/daylog/track → 405 Allow POST', async () => {
  const { server, base } = await startServer()
  try {
    const res = await realFetch(`${base}/api/daylog/track`, { method: 'GET' })
    assert.equal(res.status, 405)
    assert.equal(res.headers.get('allow'), 'POST')
  } finally {
    server.close()
  }
})

test('error: 잘못된 content-type → 415', async () => {
  const { server, base } = await startServer()
  try {
    const res = await realFetch(`${base}/api/daylog/track`, {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: 'x',
    })
    assert.equal(res.status, 415)
  } finally {
    server.close()
  }
})

test('boundary: 유효 JSON이나 잘못된 페이로드 → 400', async () => {
  const { server, base } = await startServer()
  try {
    const res = await realFetch(`${base}/api/daylog/track`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    })
    assert.equal(res.status, 400)
    const json = await res.json()
    assert.equal(json.ok, false)
  } finally {
    server.close()
  }
})

test('normal: 유효 track 페이로드 + fetch 모킹 → 200', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({ ok: true, schemaVersion: 'daylog-life-session-v3' }),
  })
  const { server, base } = await startServer()
  try {
    const sessionId = 'DAYLOG-S-12345678-1234-4123-8123-123456789012'
    const stage = 'started'
    const res = await realFetch(`${base}/api/daylog/track`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        action: 'track',
        sessionId,
        stage,
        eventId: `${sessionId}:${stage}`,
        source: 'web',
        formVersion: 'v1',
        schemaVersion: 'daylog-life-session-v3',
      }),
    })
    assert.equal(res.status, 200)
    const json = await res.json()
    assert.equal(json.ok, true)
    assert.equal(json.eventId, `${sessionId}:${stage}`)
    assert.equal(json.schemaVersion, 'daylog-life-session-v3')
  } finally {
    server.close()
    globalThis.fetch = originalFetch
  }
})
