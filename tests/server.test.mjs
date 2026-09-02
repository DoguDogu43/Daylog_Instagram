import test from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createApp } from '../server.mjs'

const distDir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'dist')

async function echoHandler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    res.status(405).json({ ok: false, error: 'method' })
    return
  }
  res.status(200).json({
    ok: true,
    method: req.method,
    contentType: req.headers['content-type'] ?? null,
    body: req.body,
  })
}

function startServer() {
  const server = createApp({ distDir, routes: { '/api/echo': echoHandler } })
  return new Promise((resolve) => {
    server.listen(0, () => {
      const { port } = server.address()
      resolve({ server, base: `http://127.0.0.1:${port}` })
    })
  })
}

test('normal: POST /api/echo 는 raw body/헤더를 핸들러에 전달하고 200 JSON을 반환', async () => {
  const { server, base } = await startServer()
  try {
    const res = await fetch(`${base}/api/echo`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ hello: 'world' }),
    })
    assert.equal(res.status, 200)
    const json = await res.json()
    assert.equal(json.ok, true)
    assert.equal(json.method, 'POST')
    assert.equal(json.contentType, 'application/json')
    assert.equal(json.body, '{"hello":"world"}')
  } finally {
    server.close()
  }
})

test('error: 미정의 /api 경로는 404 JSON', async () => {
  const { server, base } = await startServer()
  try {
    const res = await fetch(`${base}/api/nope`, { method: 'POST', body: '{}' })
    assert.equal(res.status, 404)
    const json = await res.json()
    assert.equal(json.ok, false)
  } finally {
    server.close()
  }
})

test('error: 핸들러의 status/setHeader 위임 확인 (GET /api/echo → 405 + Allow)', async () => {
  const { server, base } = await startServer()
  try {
    const res = await fetch(`${base}/api/echo`, { method: 'GET' })
    assert.equal(res.status, 405)
    assert.equal(res.headers.get('allow'), 'POST')
  } finally {
    server.close()
  }
})

test('boundary: 1MB 초과 바디는 413', async () => {
  const { server, base } = await startServer()
  try {
    const big = 'x'.repeat(1_000_001)
    const res = await fetch(`${base}/api/echo`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: big,
    })
    assert.equal(res.status, 413)
  } finally {
    server.close()
  }
})

test('boundary/security: 경로 트래버설은 소스 파일을 노출하지 않고 SPA fallback', async () => {
  const { server, base } = await startServer()
  try {
    const res = await fetch(`${base}/../../server.mjs`)
    const text = await res.text()
    assert.ok(!text.includes('createApp'), 'server.mjs 내용이 노출되면 안 됨')
    assert.ok(text.includes('INDEX_FIXTURE'), 'index.html fallback 이어야 함')
  } finally {
    server.close()
  }
})

test('static: 존재하는 파일은 그대로 서빙', async () => {
  const { server, base } = await startServer()
  try {
    const res = await fetch(`${base}/asset.txt`)
    assert.equal(res.status, 200)
    const text = await res.text()
    assert.ok(text.includes('ASSET_FIXTURE'))
  } finally {
    server.close()
  }
})

test('spa: 미존재 비-API 경로는 index.html', async () => {
  const { server, base } = await startServer()
  try {
    const res = await fetch(`${base}/some/client/route`)
    assert.equal(res.status, 200)
    const text = await res.text()
    assert.ok(text.includes('INDEX_FIXTURE'))
  } finally {
    server.close()
  }
})

test('health: /healthz → 200 ok', async () => {
  const { server, base } = await startServer()
  try {
    const res = await fetch(`${base}/healthz`)
    assert.equal(res.status, 200)
    assert.equal((await res.text()).trim(), 'ok')
  } finally {
    server.close()
  }
})
