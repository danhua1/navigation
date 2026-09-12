import { BadRequestException } from '@nestjs/common'
import { validateNavigationData } from '../dist/modules/navigation/navigation.service.js'

let pass = 0
let fail = 0

function check(condition, message) {
  if (condition) pass += 1
  else fail += 1
  console.log(`${condition ? 'ok  ' : 'FAIL'} ${message}`)
}

function expectValid(data, message) {
  try {
    validateNavigationData(data)
    check(true, message)
  } catch (error) {
    check(false, `${message}: ${error.message}`)
  }
}

function expectInvalid(data, message) {
  try {
    validateNavigationData(data)
    check(false, message)
  } catch (error) {
    check(error instanceof BadRequestException, message)
  }
}

const pngIcon = 'data:image/png;base64,AAAA'
const group = { id: 'group-common', name: '常用' }
const site = {
  id: 'site-1',
  name: 'OpenToken',
  url: 'https://opentk.ai/dashboard',
  description: '服务控制台',
  icon: pngIcon,
  groupId: group.id
}

function navigation(overrides = {}) {
  return {
    version: 1,
    categories: [{ id: 'category-ai', name: 'AI 中转', icon: 'folder', groups: [group], sites: [site] }],
    settings: { theme: 'light', searchEngine: 'google' },
    ...overrides
  }
}

expectValid(navigation(), '接受含分组和 Base64 PNG 图标的合法导航数据')
expectValid(navigation({ categories: [{ id: 'legacy', name: '旧分类', icon: '', sites: [{ ...site, groupId: undefined }] }] }), '兼容没有 groups 的历史分类数据')

expectInvalid(navigation({ version: 2 }), '拒绝不支持的数据版本')
expectInvalid(navigation({ categories: [{ id: 'category-ai', name: 'AI', icon: '', groups: [group], sites: [{ ...site, url: 'javascript:alert(1)' }] }] }), '拒绝非 http/https 网站地址')
expectInvalid(navigation({ categories: [{ id: 'category-ai', name: 'AI', icon: '', groups: [group], sites: [{ ...site, icon: 'data:image/svg+xml;base64,AAAA' }] }] }), '拒绝 SVG data URI 图标')
expectInvalid(navigation({ categories: [{ id: 'category-ai', name: 'AI', icon: '', groups: [group], sites: [{ ...site, groupId: 'missing' }] }] }), '拒绝引用不存在分组的网站')
expectInvalid(navigation({ categories: [{ id: 'category-ai', name: 'AI', icon: '', groups: [{ ...group }, { ...group }], sites: [] }] }), '拒绝重复分组 ID')
expectInvalid(navigation({ categories: [{ id: 'category-ai', name: 'AI', icon: '', groups: [group], sites: [{ ...site, unexpected: true }] }] }), '拒绝网站中的未知字段')
expectInvalid(navigation({ settings: { theme: 'system', searchEngine: 'google' } }), '拒绝不支持的主题')

console.log(fail === 0 ? `\nall ${pass} passed` : `\n${fail} FAILED`)
process.exit(fail === 0 ? 0 : 1)
