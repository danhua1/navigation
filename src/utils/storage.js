import { normalizeUrl, urlHostname } from './url.js'

const STORAGE_KEY = 'nav_site_data'
// 数据结构版本，便于以后做迁移
export const DATA_VERSION = 1

const VALID_THEMES = ['light', 'dark']
const MAX_ICON_LENGTH = 16

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

// 站点必须有合法 http(s) 地址，名称缺失时用主机名兜底
function sanitizeSite(raw, seenIds) {
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
    icon: cleanIcon(raw.icon)
  }
}

function sanitizeCategory(raw, seenIds, seenSiteIds) {
  if (!raw || typeof raw !== 'object') return null

  let id = cleanText(raw.id, 64)
  if (!id || seenIds.has(id)) id = generateId('cat')
  seenIds.add(id)

  const sites = Array.isArray(raw.sites)
    ? raw.sites.map(s => sanitizeSite(s, seenSiteIds)).filter(Boolean)
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
  const categories = []
  let droppedSites = 0

  for (const rawCat of rawCategories) {
    const rawSiteCount = Array.isArray(rawCat?.sites) ? rawCat.sites.length : 0
    const cat = sanitizeCategory(rawCat, seenCatIds, seenSiteIds)
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
export function loadData() {
  let raw
  try {
    raw = localStorage.getItem(STORAGE_KEY)
  } catch (e) {
    // 隐私模式下 localStorage 可能整体不可用
    console.error('读取数据失败:', e)
    return getDefaultData()
  }

  if (!raw) {
    const initial = getDefaultData()
    saveData(initial)
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
export function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
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

// ===== 书签 HTML 解析 =====

// 浏览器书签导出的结构：<DT><H3>文件夹</H3><DL>...子项...</DL>
// 由于 <DT> 不会被 <DL> 关闭，嵌套的 DL 会成为 H3 的兄弟节点
function folderContents(h3) {
  let sibling = h3.nextElementSibling
  while (sibling) {
    if (sibling.tagName === 'DL') return sibling
    // 导出文件里 H3 和 DL 之间常有空的 <p>
    if (sibling.tagName !== 'P') return null
    sibling = sibling.nextElementSibling
  }
  return null
}

function linkToSite(link, seenUrls) {
  const url = normalizeUrl(link.getAttribute('HREF'))
  // bookmarklet（javascript:）和失效地址在这里被挡掉
  if (!url || seenUrls.has(url)) return null
  seenUrls.add(url)

  const rawName = link.textContent.trim()
  const name = cleanText(rawName, 120) || urlHostname(url) || url
  return {
    id: generateId('site'),
    name,
    url,
    description: '',
    icon: ''
  }
}

/**
 * 递归遍历书签树。每个文件夹产出一个分类，同名文件夹合并，URL 全局去重。
 */
function walkFolder(dl, ctx, categoryName) {
  const items = dl.querySelectorAll(':scope > dt')

  for (const dt of items) {
    const h3 = dt.querySelector(':scope > h3')
    if (h3) {
      const childDl = folderContents(h3)
      if (childDl) {
        walkFolder(childDl, ctx, cleanText(h3.textContent, 60) || '未命名文件夹')
      }
      continue
    }

    const link = dt.querySelector(':scope > a')
    if (!link) continue

    ctx.total += 1
    const site = linkToSite(link, ctx.seenUrls)
    if (!site) {
      ctx.skipped += 1
      continue
    }

    // 直接挂在根层的链接归入「未分类」
    const name = categoryName || '未分类'
    let category = ctx.byName.get(name)
    if (!category) {
      category = { id: generateId('cat'), name, icon: categoryName ? '📁' : '📦', sites: [] }
      ctx.byName.set(name, category)
      ctx.ordered.push(category)
    }
    category.sites.push(site)
  }
}

/**
 * 解析浏览器书签 HTML。
 * @returns {{ categories: Array, total: number, skipped: number }}
 */
export function parseBookmarkHtml(htmlText) {
  const doc = new DOMParser().parseFromString(htmlText, 'text/html')
  const ctx = { byName: new Map(), ordered: [], seenUrls: new Set(), total: 0, skipped: 0 }

  // 只从最外层 DL 进入，避免嵌套 DL 被重复遍历
  const roots = doc.querySelectorAll('dl:not(dl dl)')
  for (const root of roots) {
    walkFolder(root, ctx, '')
  }

  const categories = ctx.ordered.filter(c => c.sites.length > 0)
  // 「未分类」排到最前，和原有行为保持一致
  categories.sort((a, b) => (a.name === '未分类' ? -1 : 0) - (b.name === '未分类' ? -1 : 0))

  return { categories, total: ctx.total, skipped: ctx.skipped }
}

/**
 * 从书签 HTML 文件导入。
 * @returns {Promise<{ categories: Array, total: number, skipped: number }>}
 */
export async function importBookmarkHtml(file) {
  const text = await readFileAsText(file)

  let result
  try {
    result = parseBookmarkHtml(text)
  } catch (err) {
    throw new Error('书签文件解析失败：' + err.message)
  }

  if (result.categories.length === 0) {
    throw new Error('未在书签文件中找到任何可用链接')
  }
  return result
}
