// URL 白名单校验：只允许 http/https，挡掉 javascript:、data: 等可执行协议
const SAFE_PROTOCOLS = new Set(['http:', 'https:'])
const SCHEME_RE = /^([a-zA-Z][a-zA-Z0-9+.-]*):/
// 形如 example.com:8080/path，看着像协议其实是主机加端口
const HOST_PORT_RE = /^[a-zA-Z0-9.-]+:\d+([/?#]|$)/

function parseSafe(candidate) {
  try {
    const url = new URL(candidate)
    if (!SAFE_PROTOCOLS.has(url.protocol)) return null
    if (!url.hostname) return null
    return url.href
  } catch {
    return null
  }
}

// 规范化用户输入或书签里的地址，不合法或不安全时返回 null
export function normalizeUrl(raw) {
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  if (!trimmed) return null

  const scheme = trimmed.match(SCHEME_RE)
  if (scheme) {
    const protocol = `${scheme[1].toLowerCase()}:`
    if (trimmed.includes('://')) {
      // 带 // 的一律按协议判断，javascript://x%0aalert(1) 这种绕过也会被拒
      return SAFE_PROTOCOLS.has(protocol) ? parseSafe(trimmed) : null
    }
    // 不带 // 的协议（javascript:、mailto:、data:）直接拒，除非它其实是主机加端口
    if (!HOST_PORT_RE.test(trimmed)) return null
  }

  return parseSafe(trimmed.startsWith('//') ? `https:${trimmed}` : `https://${trimmed}`)
}

export function isSafeUrl(raw) {
  return normalizeUrl(raw) !== null
}

// 取主机名，用于名称缺失时兜底显示
export function urlHostname(raw) {
  try {
    return new URL(raw).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}
