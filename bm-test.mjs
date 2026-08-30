import { JSDOM } from 'jsdom'
const dom = new JSDOM('')
global.DOMParser = dom.window.DOMParser

const { parseBookmarkHtml } = await import('./src/utils/storage.js')

// 真实浏览器导出的结构：DT 不闭合、H3 后跟嵌套 DL、DL 后带空 <p>
const html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
    <DT><A HREF="https://top-level.com">Top Level Link</A>
    <DT><H3>Dev</H3>
    <DL><p>
        <DT><A HREF="https://github.com" ICON="data:image/png;base64,AAAA">GitHub</A>
        <DT><A HREF="https://github.com">GitHub Again</A>
        <DT><H3>Docs</H3>
        <DL><p>
            <DT><A HREF="https://vuejs.org">Vue</A>
            <DT><A HREF="https://developer.mozilla.org">MDN</A>
        </DL><p>
        <DT><A HREF="javascript:alert(document.cookie)">Evil Bookmarklet</A>
        <DT><A HREF="https://no-name.com"></A>
    </DL><p>
    <DT><H3>Empty Folder</H3>
    <DL><p>
    </DL><p>
</DL><p>`

const r = parseBookmarkHtml(html)
console.log('total=%d skipped=%d', r.total, r.skipped)
for (const c of r.categories) {
  console.log(`  ${c.icon} ${c.name}: ${c.sites.map(s => s.name).join(', ')}`)
}

const byName = Object.fromEntries(r.categories.map(c => [c.name, c.sites.map(s => s.url)]))
const all = r.categories.flatMap(c => c.sites.map(s => s.url))
function check(label, cond) { console.log((cond ? 'ok   ' : 'FAIL ') + label) }

console.log()
check('未分类 排在最前',              r.categories[0]?.name === '未分类')
check('顶层链接归入未分类',            byName['未分类']?.includes('https://top-level.com/'))
check('GitHub 只在 Dev 下（不重复）',   byName['Dev']?.includes('https://github.com/') && !byName['Docs']?.includes('https://github.com/'))
check('子文件夹链接只在 Docs 下',       byName['Docs']?.includes('https://vuejs.org/') && !byName['Dev']?.includes('https://vuejs.org/'))
check('Docs 拿到全部 2 条',            byName['Docs']?.length === 2)
check('javascript: 被拦掉',            !all.some(u => u.startsWith('javascript')))
check('重复 URL 去重',                 all.length === new Set(all).size)
check('空文件夹被丢弃',                !('Empty Folder' in byName))
check('无名链接用主机名兜底',           r.categories.some(c => c.sites.some(s => s.name === 'no-name.com')))
check('base64 图标未被存入',           !all.length || r.categories.every(c => c.sites.every(s => !s.icon.startsWith('data:'))))
check('全部 URL 已规范化',             all.every(u => u.startsWith('https://')))
