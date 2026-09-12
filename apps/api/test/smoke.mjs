import { spawn } from 'node:child_process'
import http from 'node:http'
import { fileURLToPath } from 'node:url'

const port = 3101
const baseUrl = `http://127.0.0.1:${port}`
const child = spawn(process.execPath, ['dist/main.js'], {
  cwd: fileURLToPath(new URL('..', import.meta.url)),
  env: { ...process.env, NODE_ENV: 'test', PORT: String(port) },
  stdio: ['ignore', 'pipe', 'pipe']
})

let output = ''
child.stdout.on('data', chunk => { output += chunk.toString() })
child.stderr.on('data', chunk => { output += chunk.toString() })

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const requestUrl = new URL(path, baseUrl)
    const req = http.request(requestUrl, {
      method: options.method || 'GET',
      headers: options.headers || {}
    }, response => {
      let body = ''
      response.setEncoding('utf8')
      response.on('data', chunk => { body += chunk })
      response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, body }))
    })
    req.on('error', reject)
    if (options.body) req.write(options.body)
    req.end()
  })
}

function check(condition, message) {
  if (!condition) throw new Error(message)
  console.log(`ok   ${message}`)
}

async function waitForServer() {
  const deadline = Date.now() + 15_000
  while (Date.now() < deadline) {
    try {
      const response = await request('/api/health')
      if (response.status === 200) return
    } catch {
      // 应用还在启动，继续轮询。
    }
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  throw new Error(`API 启动超时\n${output}`)
}

try {
  await waitForServer()

  const health = await request('/api/health')
  check(health.status === 200 && JSON.parse(health.body).data.status === 'ok', 'health 接口可用')

  const unauthorized = await request('/api/v1/auth/me')
  check(unauthorized.status === 401, '未授权请求被拒绝')

  const navigationUnauthorized = await request('/api/v1/navigation')
  check(navigationUnauthorized.status === 401, '导航数据接口需要登录')

  const invalidBody = JSON.stringify({ email: 'invalid', password: 'short' })
  const invalid = await request('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(invalidBody) },
    body: invalidBody
  })
  check(invalid.status === 400, '认证参数校验生效')

  let limited
  for (let i = 0; i < 10; i += 1) {
    limited = await request('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(invalidBody) },
      body: invalidBody
    })
  }
  check(limited.status === 429 && limited.headers['retry-after'], '认证接口触发请求限流')
  console.log('\nAPI smoke test passed')
} finally {
  child.kill('SIGTERM')
}
