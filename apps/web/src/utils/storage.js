import { normalizeUrl, urlHostname } from './url.js'

const STORAGE_KEY = 'nav_site_data'
const LEGACY_STORAGE_KEY = STORAGE_KEY
// 数据结构版本，便于以后做迁移
export const DATA_VERSION = 1

const VALID_THEMES = ['light', 'dark']
const MAX_ICON_LENGTH = 16
const MAX_EMBEDDED_ICON_CHARS = 1024 * 1024
const IMAGE_DATA_URL_RE = /^data:image\/(?:png|jpeg|gif|webp);base64,[a-z0-9+/]+={0,2}$/i
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024

// 没有存过主题时跟随系统。index.html 的首屏脚本用的是同一套判断，
// 两处必须一致，否则首帧套用的主题会被 App 挂载后再改一次，又闪一下
export function preferredTheme() {
  try {
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

// 默认分类和站点数据
const defaultData = {
  version: DATA_VERSION,
  categories: [
    {
      id: 'cat-1',
      name: '常用工具',
      icon: '🔧',
      sites: [
        { id: 's-1', name: 'Google', url: 'https://www.google.com', description: '搜索引擎', icon: '🔍' },
        { id: 's-2', name: 'GitHub', url: 'https://github.com', description: '代码托管平台', icon: '🐙' },
        { id: 's-3', name: 'Stack Overflow', url: 'https://stackoverflow.com', description: '程序员问答社区', icon: '📚' }
      ]
    },
    {
      id: 'cat-2',
      name: 'AI 工具',
      icon: '🤖',
      sites: [
        { id: 's-4', name: 'ChatGPT', url: 'https://chat.openai.com', description: 'AI 对话助手', icon: '💬' },
        { id: 's-5', name: 'Claude', url: 'https://claude.ai', description: 'AI 助手', icon: '🧠' }
      ]
    },
    {
      id: 'cat-3',
      name: '设计灵感',
      icon: '🎨',
      sites: [
        { id: 's-6', name: 'Dribbble', url: 'https://dribbble.com', description: '设计师作品社区', icon: '🏀' },
        { id: 's-7', name: 'Figma', url: 'https://www.figma.com', description: '在线设计工具', icon: '✏️' }
      ]
    },
    {
      id: 'cat-4',
      name: '开发文档',
      icon: '📖',
      sites: [
        { id: 's-8', name: 'Vue.js', url: 'https://vuejs.org', description: 'Vue 框架文档', icon: '💚' },
        { id: 's-9', name: 'MDN', url: 'https://developer.mozilla.org', description: 'Web 开发文档', icon: '📘' }
      ]
    }
  ],
  settings: {
    theme: 'light',
    searchEngine: 'google'
  }
}

export function getDefaultData() {
  const data = structuredClone(defaultData)
  // 首次使用时跟随系统偏好，和 index.html 的首屏脚本保持一致
  data.settings.theme = preferredTheme()
  return data
}

// 生成唯一 ID
export function generateId(prefix = 'id') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function cleanText(value, maxLength = 200) {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, maxLength)
}

// 图标只保留短文本，挡掉书签导出里的 base64 data URI
function cleanIcon(value) {
  const icon = cleanText(value, MAX_ICON_LENGTH)
  if (!icon || /^data:/i.test(icon)) return ''
  return icon
}

// 书签导出的位图图标可以原样保留，但不接受 SVG 或任意 data URI。
// 前者可能承载可执行内容，后者会很容易把 localStorage 撑满。
function cleanSiteIcon(value, state) {
  if (typeof value === 'string' && IMAGE_DATA_URL_RE.test(value)) {
    if (state.embeddedIconChars + value.length <= MAX_EMBEDDED_ICON_CHARS) {
      state.embeddedIconChars += value.length
      return value
    }
    return ''
  }
  return cleanIcon(value)
}

// 站点必须有合法 http(s) 地址，名称缺失时用主机名兜底
function sanitizeSite(raw, seenIds, iconState) {
  if (!raw || typeof raw !== 'object') return null

  const url = normalizeUrl(raw.url)
  if (!url) return null

  const name = cleanText(raw.name, 120) || urlHostname(url) || url

  let id = cleanText(raw.id, 64)
  if (!id || seenIds.has(id)) id = generateId('site')
  seenIds.add(id)

  return {
    id,
    name,
    url,
    description: cleanText(raw.description, 300),
    icon: cleanSiteIcon(raw.icon, iconState)
  }
}

function sanitizeCategory(raw, seenIds, seenSiteIds, iconState) {
  if (!raw || typeof raw !== 'object') return null

  let id = cleanText(raw.id, 64)
  if (!id || seenIds.has(id)) id = generateId('cat')
  seenIds.add(id)

  const sites = Array.isArray(raw.sites)
    ? raw.sites.map(s => sanitizeSite(s, seenSiteIds, iconState)).filter(Boolean)
    : []

  return {
    id,
    name: cleanText(raw.name, 60) || '未命名分类',
    icon: cleanIcon(raw.icon) || '📁',
    sites
  }
}

function sanitizeSettings(raw) {
  const settings = raw && typeof raw === 'object' ? raw : {}
  return {
    theme: VALID_THEMES.includes(settings.theme) ? settings.theme : preferredTheme(),
    searchEngine: cleanText(settings.searchEngine, 32) || 'google'
  }
}

/**
 * 把任意来源的数据规整成可信结构，并统计丢弃数量。
 * @returns {{ data: object, dropped: { categories: number, sites: number } }}
 */
export function sanitizeData(raw) {
  const input = raw && typeof raw === 'object' ? raw : {}
  const rawCategories = Array.isArray(input.categories) ? input.categories : []

  const seenCatIds = new Set()
  const seenSiteIds = new Set()
  const iconState = { embeddedIconChars: 0 }
  const categories = []
  let droppedSites = 0

  for (const rawCat of rawCategories) {
    const rawSiteCount = Array.isArray(rawCat?.sites) ? rawCat.sites.length : 0
    const cat = sanitizeCategory(rawCat, seenCatIds, seenSiteIds, iconState)
    if (!cat) continue
    droppedSites += rawSiteCount - cat.sites.length
    categories.push(cat)
  }

  return {
    data: {
      version: DATA_VERSION,
      categories,
      settings: sanitizeSettings(input.settings)
    },
    dropped: {
      categories: rawCategories.length - categories.length,
      sites: droppedSites
    }
  }
}

// 读取本地数据
function storageKey(userId) {
  return userId ? `${STORAGE_KEY}:${encodeURIComponent(userId)}` : LEGACY_STORAGE_KEY
}

export function loadData(userId = null) {
  let raw
  try {
    raw = localStorage.getItem(storageKey(userId))
    // 只把旧版未登录数据交给明确登录的第一个账号，然后立即移除旧 key，
    // 避免后续账号继续读到这份全局数据。
    if (!raw && userId) {
      const legacy = localStorage.getItem(LEGACY_STORAGE_KEY)
      if (legacy) {
        const migrated = sanitizeData(JSON.parse(legacy)).data
        localStorage.setItem(storageKey(userId), JSON.stringify(migrated))
        localStorage.removeItem(LEGACY_STORAGE_KEY)
        return migrated
      }
    }
  } catch (e) {
    // 隐私模式下 localStorage 可能整体不可用
    console.error('读取数据失败:', e)
    return getDefaultData()
  }

  if (!raw) {
    const initial = getDefaultData()
    saveData(initial, userId)
    return initial
  }

  try {
    return sanitizeData(JSON.parse(raw)).data
  } catch (e) {
    console.error('解析数据失败:', e)
    return getDefaultData()
  }
}

/**
 * 保存数据到本地。
 * @returns {{ ok: boolean, error?: string }} 失败原因需要向用户展示，不能静默丢弃
 */
export function saveData(data, userId = null) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(data))
    return { ok: true }
  } catch (e) {
    console.error('保存数据失败:', e)
    const quotaExceeded =
      e instanceof DOMException &&
      (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')
    return {
      ok: false,
      error: quotaExceeded
        ? '本地存储空间已满，改动未能保存。请导出备份后删除部分网站。'
        : `保存失败：${e.message || '本地存储不可用'}`
    }
  }
}

// 导出数据为 JSON 文件
export function exportData(data) {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const date = new Date().toISOString().slice(0, 10)
  a.download = `navigation-backup-${date}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function readFileAsText(file) {
  if (!file || typeof file.size !== 'number' || file.size > MAX_IMPORT_BYTES) {
    return Promise.reject(new Error('导入文件过大，最多支持 5MB'))
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => resolve(e.target.result)
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsText(file)
  })
}

/**
 * 从 JSON 文件导入数据，返回清洗后的结果。
 * @returns {Promise<{ data: object, dropped: { categories: number, sites: number } }>}
 */
export async function importData(file) {
  const text = await readFileAsText(file)
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('文件解析失败，请检查 JSON 格式')
  }

  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.categories)) {
    throw new Error('数据格式不正确：缺少 categories 字段')
  }

  const result = sanitizeData(parsed)
  if (result.data.categories.length === 0) {
    throw new Error('文件中没有可导入的有效分类')
  }
  return result
}

/**
 * 追加导入前重新分配 ID。sanitizeData 只在单个文件内去重，
 * 同一份备份导入两次仍会和现有数据撞 ID，导致列表 key 重复、按 ID 查找命中错误对象。
 * @param {Array} categories 待追加的分类
 * @param {Array} existing 现有分类，用于避开已占用的 ID
 */
export function reindexForAppend(categories, existing = []) {
  const taken = new Set()
  for (const cat of existing) {
    taken.add(cat.id)
    for (const site of cat.sites) taken.add(site.id)
  }

  // 同一毫秒内连续生成时 generateId 只靠随机后缀区分，这里显式兜一层去重
  const fresh = prefix => {
    let id = generateId(prefix)
    while (taken.has(id)) id = generateId(prefix)
    taken.add(id)
    return id
  }

  return categories.map(cat => ({
    ...cat,
    id: fresh('cat'),
    sites: cat.sites.map(site => ({ ...site, id: fresh('site') }))
  }))
}
