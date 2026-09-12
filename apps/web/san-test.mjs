import { JSDOM } from 'jsdom'
const dom = new JSDOM('', { url: 'https://x.test/' })
global.DOMParser = dom.window.DOMParser
global.localStorage = dom.window.localStorage
global.matchMedia = () => ({ matches: false })

const { MAX_IMPORT_BYTES, importData, sanitizeData, reindexForAppend } = await import('./src/utils/storage.js')

let pass = 0, fail = 0
const ok = (c, m) => { c ? pass++ : fail++; console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`) }

// --- sanitizeData 面对垃圾输入 ---
const r = sanitizeData({
  categories: [
    { id: 'c1', name: 'A', sites: [
      { id: 's1', name: 'Good', url: 'https://good.com' },
      { id: 's2', name: 'Evil', url: 'javascript:alert(1)' },   // 应丢弃
      { id: 's3', name: 'NoUrl' },                              // 应丢弃
      null,                                                     // 应丢弃
      { id: 's1', name: 'DupId', url: 'https://dup.com' },      // 保留但换 id
      { name: 'B64', url: 'https://i.com', icon: 'data:image/png;base64,AAAA' },
    ]},
    { id: 'c1', name: 'DupCat', sites: [] },   // 重复分类 id -> 换新
    null,                                      // 应丢弃
    { name: 'NoSites' },                       // sites 缺失 -> []
    'garbage',                                 // 应丢弃
  ],
  settings: { theme: 'hacker', searchEngine: 'x'.repeat(999) }
})

const cats = r.data.categories
ok(cats.length === 3, `保留 3 个分类（得到 ${cats.length}）`)
ok(r.dropped.categories === 2, `统计到 2 个无效分类（得到 ${r.dropped.categories}）`)
ok(r.dropped.sites === 3, `统计到 3 个无效站点（得到 ${r.dropped.sites}）`)

const sites = cats[0].sites
ok(sites.length === 3, `A 保留 3 个站点（得到 ${sites.length}）`)
ok(!sites.some(s => s.url.startsWith('javascript:')), 'javascript: 站点已剔除')
ok(new Set(sites.map(s => s.id)).size === sites.length, '重复站点 id 已重新分配')
ok(sites.find(s => s.name === 'B64')?.icon === 'data:image/png;base64,AAAA', '安全的 base64 位图图标被保留')
ok(sanitizeData({ categories: [{ sites: [{ name: 'Unsafe', url: 'https://unsafe.com', icon: 'data:image/svg+xml;base64,AAAA' }] }] }).data.categories[0].sites[0].icon === '', 'SVG data URI 图标被拒绝')
ok(new Set(cats.map(c => c.id)).size === 3, '重复分类 id 已重新分配')
ok(Array.isArray(cats.find(c => c.name === 'NoSites')?.sites), 'sites 缺失时补成数组')
ok(r.data.settings.theme === 'light' || r.data.settings.theme === 'dark', `非法主题被纠正（${r.data.settings.theme}）`)
ok(r.data.version === 1, 'version 已写入')
ok(sanitizeData(null).data.categories.length === 0, 'null 输入不抛错')
ok(sanitizeData({}).data.categories.length === 0, '空对象不抛错')

// 旧版分类没有分组时，自动升级为「常用 / 非常用」，并把原有网站放进常用。
const grouped = sanitizeData({ categories: [{ id: 'legacy', name: 'Legacy', sites: [
  { id: 'legacy-site', name: 'Site', url: 'https://legacy.example' }
]}] }).data.categories[0]
ok(grouped.groups.map(group => group.name).join(',') === '常用,非常用', '旧数据自动获得默认分组')
ok(grouped.sites[0].groupId === grouped.groups[0].id, '旧网站自动归入常用分组')

// --- 站点上的历史 categoryId 不应被保留 ---
const leak = sanitizeData({ categories: [{ id: 'c', name: 'C', sites: [
  { id: 's', name: 'S', url: 'https://s.com', categoryId: 'stale-cat' }
]}]})
ok(!('categoryId' in leak.data.categories[0].sites[0]), '站点上的陈旧 categoryId 已剥离')

// --- reindexForAppend：同一份数据导入两次不撞 id ---
const base = sanitizeData({ categories: [
  { id: 'cat-1', name: 'X', sites: [{ id: 's-1', name: 'S', url: 'https://a.com' }] }
]}).data.categories
const again = sanitizeData({ categories: [
  { id: 'cat-1', name: 'X', sites: [{ id: 's-1', name: 'S', url: 'https://a.com' }] }
]}).data.categories

const merged = [...base, ...reindexForAppend(again, base)]
const allCat = merged.map(c => c.id)
const allSite = merged.flatMap(c => c.sites.map(s => s.id))
const allGroups = merged.flatMap(c => c.groups.map(group => group.id))
ok(new Set(allCat).size === allCat.length, `追加后分类 id 全局唯一（${allCat.length} 个）`)
ok(new Set(allSite).size === allSite.length, `追加后站点 id 全局唯一（${allSite.length} 个）`)
ok(new Set(allGroups).size === allGroups.length, `追加后分组 id 全局唯一（${allGroups.length} 个）`)

// 大批量：Date.now() 相同的情况下也不能撞
const big = sanitizeData({ categories: Array.from({ length: 40 }, (_, i) => ({
  id: `c${i}`, name: `C${i}`,
  sites: Array.from({ length: 50 }, (_, j) => ({ id: `s${i}-${j}`, name: 'S', url: `https://s${i}-${j}.com` }))
}))}).data.categories
const rebig = reindexForAppend(big, big)
const bigIds = [...big, ...rebig].flatMap(c => [c.id, ...c.sites.map(s => s.id)])
ok(new Set(bigIds).size === bigIds.length, `2000+ 条批量重排无 id 冲突（${bigIds.length} 个）`)

// 导入限制必须在 FileReader 读取前生效，避免大文件阻塞浏览器。
await importData({ size: MAX_IMPORT_BYTES + 1 }).then(
  () => ok(false, '超大导入文件被拒绝'),
  error => ok(error.message.includes('最多支持 5MB'), '超大导入文件被拒绝')
)

console.log(fail === 0 ? `\nall ${pass} passed` : `\n${fail} FAILED`)
process.exit(fail === 0 ? 0 : 1)
