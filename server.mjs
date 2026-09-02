import { createServer as createHttpServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { join, normalize, extname, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { argv, env } from 'node:process'

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
}

const MAX_BODY_BYTES = 1_000_000

function makeApiResponse(res) {
  let statusCode = 200
  const api = {
    status(code) {
      statusCode = code
      return api
    },
    setHeader(name, value) {
      res.setHeader(name, value)
    },
    json(body) {
      res.statusCode = statusCode
      if (!res.getHeader('Content-Type')) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
      }
      res.end(JSON.stringify(body))
    },
  }
  return api
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0
    let settled = false
    const chunks = []
    req.on('data', (chunk) => {
      if (settled) return
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        settled = true
        const err = new Error('payload_too_large')
        err.code = 'TOO_LARGE'
        reject(err)
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      if (!settled) resolve(Buffer.concat(chunks).toString('utf8'))
    })
    req.on('error', (err) => {
      if (!settled) reject(err)
    })
  })
}

function sendJson(res, status, obj) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(obj))
}

async function serveStatic(distDir, pathname, res) {
  const safe = normalize(decodeURIComponent(pathname))
  let filePath = join(distDir, safe)
  if (filePath !== distDir && !filePath.startsWith(distDir + '/')) {
    filePath = distDir // 트래버설 시도 → 루트로 강제
  }
  try {
    let s = await stat(filePath)
    if (s.isDirectory()) filePath = join(filePath, 'index.html')
    const data = await readFile(filePath)
    res.statusCode = 200
    res.setHeader('Content-Type', MIME[extname(filePath)] || 'application/octet-stream')
    res.end(data)
    return
  } catch {
    // fall through to SPA fallback
  }
  try {
    const html = await readFile(join(distDir, 'index.html'))
    res.statusCode = 200
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.end(html)
  } catch {
    res.statusCode = 404
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.end('not found')
  }
}

export function createApp({ distDir, routes }) {
  return createHttpServer(async (req, res) => {
    let pathname
    try {
      pathname = new URL(req.url, 'http://localhost').pathname
    } catch {
      sendJson(res, 400, { ok: false, error: 'bad_request' })
      return
    }

    if (pathname === '/healthz') {
      res.statusCode = 200
      res.setHeader('Content-Type', 'text/plain; charset=utf-8')
      res.end('ok')
      return
    }

    if (pathname.startsWith('/api/')) {
      const handler = routes[pathname]
      if (!handler) {
        sendJson(res, 404, { ok: false, error: 'not_found' })
        return
      }
      let body
      try {
        body = await readBody(req)
      } catch (err) {
        const status = err && err.code === 'TOO_LARGE' ? 413 : 400
        sendJson(res, status, {
          ok: false,
          error: '신청 내용이 너무 길어요. 입력한 내용을 줄인 뒤 다시 시도해 주세요.',
        })
        return
      }
      try {
        await handler({ method: req.method, headers: req.headers, body }, makeApiResponse(res))
      } catch {
        if (!res.writableEnded) {
          sendJson(res, 500, {
            ok: false,
            error: '신청 내용을 보내지 못했어요. 입력한 내용을 확인한 뒤 다시 시도해 주세요.',
          })
        }
      }
      return
    }

    await serveStatic(distDir, pathname, res)
  })
}

const thisFile = fileURLToPath(import.meta.url)
if (argv[1] === thisFile) {
  const rootDir = dirname(thisFile)
  const distDir = join(rootDir, 'dist')
  const { default: applicationHandler } = await import('./server-dist/daylog/application.js')
  const { default: trackHandler } = await import('./server-dist/daylog/track.js')
  const routes = {
    '/api/daylog/application': applicationHandler,
    '/api/daylog/track': trackHandler,
  }
  const port = Number(env.PORT) || 3000
  createApp({ distDir, routes }).listen(port, () => {
    console.log(`daylog listening on ${port}`)
  })
}
