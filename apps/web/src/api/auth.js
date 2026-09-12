const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'
const TOKEN_KEY = 'navigation_access_token'

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

function errorMessage(message) {
  return Array.isArray(message) ? message.join('；') : message
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new ApiError(errorMessage(payload.message) || '请求失败，请稍后重试', response.status)
  return payload.data ?? payload
}

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    // 隐私模式下存储不可用时，内存中的登录状态仍会被清除。
  }
}

function storeAuth(result) {
  try {
    localStorage.setItem(TOKEN_KEY, result.accessToken)
  } catch {
    throw new ApiError('浏览器无法保存登录状态，请检查隐私模式或存储权限', 0)
  }
  return result.user
}

export async function register(form) {
  return storeAuth(await request('/v1/auth/register', { method: 'POST', body: JSON.stringify(form) }))
}

export async function login(form) {
  return storeAuth(await request('/v1/auth/login', { method: 'POST', body: JSON.stringify(form) }))
}

export async function currentUser() {
  const token = getToken()
  if (!token) return null
  try {
    return await request('/v1/auth/me', { headers: { Authorization: `Bearer ${token}` } })
  } catch (error) {
    if (error.status === 401) clearToken()
    return null
  }
}

function authHeaders() {
  const token = getToken()
  if (!token) throw new ApiError('登录状态已失效，请重新登录', 401)
  return { Authorization: `Bearer ${token}` }
}

export function getNavigationData() {
  return request('/v1/navigation', { headers: authHeaders() })
}

export function saveNavigationData(data, revision) {
  return request('/v1/navigation', {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ data, revision })
  })
}
