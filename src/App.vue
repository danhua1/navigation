<template>
  <div class="app-container">
    <button
      class="drawer-toggle"
      type="button"
      aria-label="打开分类菜单"
      :aria-expanded="sidebarOpen"
      @click="sidebarOpen = true"
    >☰</button>

    <!-- 侧边栏 -->
    <Sidebar
      :categories="data.categories"
      :active-category-id="activeCategoryId"
      :search-keyword="searchKeyword"
      :open="sidebarOpen"
      :is-mobile="isMobile"
      @select-category="handleSelectCategory"
      @add-category="showCategoryModal()"
      @edit-category="showCategoryModal($event)"
      @delete-category="handleDeleteCategory"
      @show-all="handleShowAll"
      @close="sidebarOpen = false"
    />

    <!-- 主内容区 -->
    <div class="main-area">
      <!-- 顶部搜索栏 -->
      <header class="app-header">
        <div class="search-bar">
          <span class="search-icon" aria-hidden="true">🔍</span>
          <input
            v-model="searchKeyword"
            class="search-input"
            type="search"
            aria-label="搜索网站"
            placeholder="搜索网站名称或描述..."
          />
          <button
            v-if="searchKeyword"
            class="search-clear"
            type="button"
            aria-label="清空搜索"
            @click="clearSearch"
          >✕</button>
        </div>
        <div class="header-actions">
          <button
            class="btn btn-ghost"
            type="button"
            :aria-label="theme === 'light' ? '切换到暗色模式' : '切换到亮色模式'"
            :title="theme === 'light' ? '暗色模式' : '亮色模式'"
            @click="toggleTheme"
          >
            {{ theme === 'light' ? '🌙' : '☀️' }}
          </button>
          <button class="btn btn-ghost" type="button" title="导入 JSON 备份" @click="triggerImport">
            <span aria-hidden="true">📥</span><span class="btn-label">导入</span>
          </button>
          <button class="btn btn-ghost" type="button" title="导入浏览器书签" @click="triggerBookmarkImport">
            <span aria-hidden="true">🔖</span><span class="btn-label">书签导入</span>
          </button>
          <button class="btn btn-ghost" type="button" title="导出 JSON 备份" @click="handleExport">
            <span aria-hidden="true">📤</span><span class="btn-label">导出</span>
          </button>
          <button class="btn btn-primary" type="button" @click="showSiteModal()">
            <span aria-hidden="true">+</span><span class="btn-label">添加网站</span>
          </button>
          <input
            ref="fileInput"
            type="file"
            accept="application/json,.json"
            class="sr-only"
            tabindex="-1"
            @change="handleFileSelected"
          />
          <input
            ref="bookmarkInput"
            type="file"
            accept="text/html,.html,.htm"
            class="sr-only"
            tabindex="-1"
            @change="handleBookmarkFileSelected"
          />
        </div>
      </header>

      <!-- 站点列表 -->
      <main class="content">
        <div v-if="emptyState" class="empty-state">
          <div class="icon" aria-hidden="true">{{ emptyState.icon }}</div>
          <div class="title">{{ emptyState.title }}</div>
          <div class="desc">{{ emptyState.desc }}</div>
        </div>

        <section
          v-for="category in filteredCategories"
          :key="category.id"
          class="category-section"
        >
          <div class="category-header">
            <h2 class="category-title">
              <span class="category-icon" aria-hidden="true">{{ category.icon }}</span>
              {{ category.name }}
              <span class="site-count">{{ category.sites.length }}</span>
            </h2>
            <button
              class="btn btn-ghost btn-sm"
              type="button"
              @click="showSiteModal(null, category.id)"
            >
              + 添加
            </button>
          </div>

          <div v-if="category.sites.length === 0" class="category-empty">
            这个分类还没有网站
          </div>

          <div v-else class="site-grid">
            <SiteCard
              v-for="site in visibleSites(category)"
              :key="site.id"
              :site="site"
              @edit="showSiteModal(site, category.id)"
              @delete="handleDeleteSite(category.id, $event)"
              @move="showMoveModal(site, category.id)"
            />
          </div>

          <!-- 大分类分批渲染，避免一次挂载上千个卡片 -->
          <button
            v-if="hiddenCount(category) > 0"
            class="btn btn-ghost load-more"
            type="button"
            @click="showMore(category.id)"
          >
            显示更多（还有 {{ hiddenCount(category) }} 个）
          </button>
        </section>
      </main>
    </div>

    <!-- 弹窗 -->
    <SiteModal
      v-if="siteModalVisible"
      :key="editingSite ? `edit-${editingSite.id}` : 'create'"
      :site="editingSite"
      :categories="data.categories"
      :default-category-id="siteModalCategoryId"
      @close="siteModalVisible = false"
      @save="handleSaveSite"
    />

    <CategoryModal
      v-if="categoryModalVisible"
      :key="editingCategory ? `edit-${editingCategory.id}` : 'create'"
      :category="editingCategory"
      @close="categoryModalVisible = false"
      @save="handleSaveCategory"
    />

    <MoveModal
      v-if="moveModalVisible"
      :site="movingSite"
      :from-category-id="movingSiteFromCategoryId"
      :categories="data.categories"
      @close="moveModalVisible = false"
      @move="handleMoveSite"
    />

    <ConfirmDialog />
    <ToastHost />
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import Sidebar from './components/Sidebar.vue'
import SiteCard from './components/SiteCard.vue'
import SiteModal from './components/SiteModal.vue'
import CategoryModal from './components/CategoryModal.vue'
import MoveModal from './components/MoveModal.vue'
import ConfirmDialog from './components/ConfirmDialog.vue'
import ToastHost from './components/ToastHost.vue'
import { useToast } from './composables/useToast.js'
import { useDialog } from './composables/useDialog.js'
import { debounce } from './utils/debounce.js'
import {
  exportData,
  generateId,
  importBookmarkHtml,
  importData,
  loadData,
  reindexForAppend,
  saveData
} from './utils/storage.js'

const PAGE_SIZE = 60
const SAVE_DELAY = 400
const SEARCH_DELAY = 200

const toast = useToast()
const { ask, askDanger } = useDialog()

const data = ref({ categories: [], settings: { theme: 'light', searchEngine: 'google' } })
const activeCategoryId = ref(null)
const searchKeyword = ref('')
// 实际参与过滤的关键词，比输入框慢一拍，避免每个按键都重建整棵列表
const activeKeyword = ref('')
const theme = ref('light')
const sidebarOpen = ref(false)
const isMobile = ref(false)

// 弹窗状态
const siteModalVisible = ref(false)
const categoryModalVisible = ref(false)
const moveModalVisible = ref(false)
const editingSite = ref(null)
const editingCategory = ref(null)
const siteModalCategoryId = ref(null)
const movingSite = ref(null)
const movingSiteFromCategoryId = ref(null)
const fileInput = ref(null)
const bookmarkInput = ref(null)

// 每个分类已展开的数量
const expanded = ref({})

// ===== 初始化 =====
let mediaQuery = null

function syncIsMobile(e) {
  isMobile.value = e.matches
  if (!e.matches) sidebarOpen.value = false
}

onMounted(() => {
  data.value = loadData()
  applyTheme(data.value.settings.theme)

  mediaQuery = window.matchMedia('(max-width: 768px)')
  syncIsMobile(mediaQuery)
  mediaQuery.addEventListener('change', syncIsMobile)

  // 关闭页面前把挂起的保存补上，否则最后一次改动会丢
  window.addEventListener('pagehide', flushSave)
  document.addEventListener('visibilitychange', handleVisibility)
})

onBeforeUnmount(() => {
  mediaQuery?.removeEventListener('change', syncIsMobile)
  window.removeEventListener('pagehide', flushSave)
  document.removeEventListener('visibilitychange', handleVisibility)
  flushSave()
})

function handleVisibility() {
  if (document.visibilityState === 'hidden') flushSave()
}

// ===== 持久化 =====
let lastSaveError = ''

function persist(snapshot) {
  const result = saveData(snapshot)
  if (result.ok) {
    lastSaveError = ''
    return
  }
  // 同一个错误只提示一次，避免连续输入时刷屏
  if (result.error !== lastSaveError) {
    lastSaveError = result.error
    toast.error(result.error)
  }
}

const debouncedPersist = debounce(persist, SAVE_DELAY)

function flushSave() {
  debouncedPersist.flush()
}

watch(
  data,
  newVal => {
    // 传响应式对象本身：序列化在防抖结束时才发生，届时写入的是最新状态
    debouncedPersist(newVal)
  },
  { deep: true }
)

const debouncedSearch = debounce(value => {
  activeKeyword.value = value
}, SEARCH_DELAY)

watch(searchKeyword, value => {
  const next = value.trim()
  if (!next) {
    // 清空要立刻生效，否则列表会空一下再回来
    debouncedSearch.cancel()
    activeKeyword.value = ''
    return
  }
  debouncedSearch(next)
})

// ===== 列表 =====
const filteredCategories = computed(() => {
  const kw = activeKeyword.value.toLowerCase()

  if (!kw) {
    if (activeCategoryId.value) {
      return data.value.categories.filter(c => c.id === activeCategoryId.value)
    }
    return data.value.categories
  }

  const result = []
  for (const cat of data.value.categories) {
    const sites = cat.sites.filter(
      s =>
        s.name.toLowerCase().includes(kw) ||
        (s.description && s.description.toLowerCase().includes(kw)) ||
        s.url.toLowerCase().includes(kw)
    )
    if (sites.length > 0) result.push({ ...cat, sites })
  }
  return result
})

const emptyState = computed(() => {
  if (filteredCategories.value.length > 0) return null
  if (activeKeyword.value) {
    return {
      icon: '🔍',
      title: '没有匹配的网站',
      desc: `找不到与「${activeKeyword.value}」相关的结果`
    }
  }
  if (data.value.categories.length === 0) {
    return { icon: '📂', title: '暂无分类', desc: '先在左侧创建一个分类，再添加网站' }
  }
  return { icon: '📭', title: '暂无网站', desc: '点击「添加网站」开始管理你的收藏' }
})

function limitFor(categoryId) {
  return expanded.value[categoryId] || PAGE_SIZE
}

function visibleSites(category) {
  if (category.sites.length <= limitFor(category.id)) return category.sites
  return category.sites.slice(0, limitFor(category.id))
}

function hiddenCount(category) {
  return Math.max(0, category.sites.length - limitFor(category.id))
}

function showMore(categoryId) {
  expanded.value[categoryId] = limitFor(categoryId) + PAGE_SIZE
}

// ===== 主题 =====
function applyTheme(next) {
  theme.value = next
  document.documentElement.setAttribute('data-theme', next)
}

function toggleTheme() {
  const next = theme.value === 'light' ? 'dark' : 'light'
  applyTheme(next)
  data.value.settings.theme = next
}

// ===== 导航 =====
function handleSelectCategory(id) {
  activeCategoryId.value = id
  clearSearch()
  sidebarOpen.value = false
}

function handleShowAll() {
  activeCategoryId.value = null
  clearSearch()
  sidebarOpen.value = false
}

function clearSearch() {
  debouncedSearch.cancel()
  searchKeyword.value = ''
  activeKeyword.value = ''
}

// ===== 站点 =====
function findCategoryOfSite(siteId) {
  return data.value.categories.find(c => c.sites.some(s => s.id === siteId)) || null
}

function showSiteModal(site = null, categoryId = null) {
  editingSite.value = site
  // 编辑时以站点实际所在分类为准，而不是站点对象上可能过期的字段
  siteModalCategoryId.value = site ? findCategoryOfSite(site.id)?.id || categoryId : categoryId
  siteModalVisible.value = true
}

function handleSaveSite({ site, categoryId }) {
  const target = data.value.categories.find(c => c.id === categoryId)
  if (!target) {
    toast.error('目标分类不存在')
    return
  }

  if (site.id) {
    const source = findCategoryOfSite(site.id)
    if (!source) {
      toast.error('找不到要编辑的网站')
      return
    }
    const idx = source.sites.findIndex(s => s.id === site.id)
    if (source.id === categoryId) {
      source.sites[idx] = { ...site }
    } else {
      source.sites.splice(idx, 1)
      target.sites.push({ ...site })
    }
    toast.success('已保存')
  } else {
    target.sites.push({ ...site, id: generateId('site') })
    toast.success(`已添加到「${target.name}」`)
  }

  siteModalVisible.value = false
}

async function handleDeleteSite(categoryId, siteId) {
  const cat = data.value.categories.find(c => c.id === categoryId)
  const site = cat?.sites.find(s => s.id === siteId)
  if (!cat || !site) return

  const ok = await askDanger({
    title: '删除网站',
    message: `确定删除「${site.name}」？此操作无法撤销。`
  })
  if (!ok) return

  cat.sites = cat.sites.filter(s => s.id !== siteId)
  toast.success('已删除')
}

// ===== 分类 =====
function showCategoryModal(category = null) {
  editingCategory.value = category
  categoryModalVisible.value = true
  sidebarOpen.value = false
}

function handleSaveCategory(catData) {
  if (catData.id) {
    const cat = data.value.categories.find(c => c.id === catData.id)
    if (cat) {
      cat.name = catData.name
      cat.icon = catData.icon
    }
    toast.success('已保存')
  } else {
    data.value.categories.push({ ...catData, id: generateId('cat'), sites: [] })
    toast.success(`已创建「${catData.name}」`)
  }
  categoryModalVisible.value = false
}

async function handleDeleteCategory(categoryId) {
  const cat = data.value.categories.find(c => c.id === categoryId)
  if (!cat) return

  const count = cat.sites.length
  const ok = await askDanger({
    title: '删除分类',
    message: count > 0
      ? `「${cat.name}」下的 ${count} 个网站会一并删除，此操作无法撤销。`
      : `确定删除「${cat.name}」？`
  })
  if (!ok) return

  data.value.categories = data.value.categories.filter(c => c.id !== categoryId)
  if (activeCategoryId.value === categoryId) activeCategoryId.value = null
  delete expanded.value[categoryId]
  toast.success('已删除')
}

// ===== 移动 =====
function showMoveModal(site, fromCategoryId) {
  movingSite.value = site
  movingSiteFromCategoryId.value = fromCategoryId
  moveModalVisible.value = true
}

function handleMoveSite({ targetCategoryId }) {
  const fromCat = data.value.categories.find(c => c.id === movingSiteFromCategoryId.value)
  const targetCat = data.value.categories.find(c => c.id === targetCategoryId)
  if (!fromCat || !targetCat) return

  const idx = fromCat.sites.findIndex(s => s.id === movingSite.value.id)
  if (idx === -1) return

  const [site] = fromCat.sites.splice(idx, 1)
  targetCat.sites.push(site)
  moveModalVisible.value = false
  toast.success(`已移动到「${targetCat.name}」`)
}

// ===== 导入导出 =====
function handleExport() {
  flushSave()
  exportData(data.value)
  toast.success('已导出备份文件')
}

function describeDropped(dropped) {
  const parts = []
  if (dropped.categories > 0) parts.push(`${dropped.categories} 个无效分类`)
  if (dropped.sites > 0) parts.push(`${dropped.sites} 个无效网站`)
  return parts.length > 0 ? `已跳过 ${parts.join('、')}` : ''
}

function triggerImport() {
  fileInput.value.click()
}

async function handleFileSelected(e) {
  const file = e.target.files[0]
  e.target.value = ''
  if (!file) return

  try {
    const { data: imported, dropped } = await importData(file)
    const count = imported.categories.reduce((sum, c) => sum + c.sites.length, 0)

    const choice = await ask({
      title: '导入备份',
      message: `文件中有 ${imported.categories.length} 个分类、${count} 个网站。\n导入方式：`,
      choices: [
        { label: '取消', value: null, variant: 'ghost' },
        { label: '追加', value: 'append' },
        { label: '覆盖', value: 'replace', variant: 'danger' }
      ]
    })
    if (!choice) return

    if (choice === 'replace') {
      data.value = imported
      activeCategoryId.value = null
      expanded.value = {}
      applyTheme(imported.settings.theme)
    } else {
      // 重发 ID，否则重复导入同一份备份会产生撞号的分类
      data.value.categories.push(...reindexForAppend(imported.categories, data.value.categories))
    }

    const skipped = describeDropped(dropped)
    toast.success(`导入完成，共 ${count} 个网站${skipped ? `。${skipped}` : ''}`)
  } catch (err) {
    toast.error(err.message)
  }
}

function triggerBookmarkImport() {
  bookmarkInput.value.click()
}

async function handleBookmarkFileSelected(e) {
  const file = e.target.files[0]
  e.target.value = ''
  if (!file) return

  try {
    const { categories, total, skipped } = await importBookmarkHtml(file)
    const count = categories.reduce((sum, c) => sum + c.sites.length, 0)

    const lines = [`解析到 ${categories.length} 个分类、${count} 个网站。`]
    if (skipped > 0) {
      lines.push(`已跳过 ${skipped} 个重复或不支持的链接（共 ${total} 条）。`)
    }
    lines.push('导入方式：')

    const choice = await ask({
      title: '导入浏览器书签',
      message: lines.join('\n'),
      choices: [
        { label: '取消', value: null, variant: 'ghost' },
        { label: '追加', value: 'append' },
        { label: '覆盖', value: 'replace', variant: 'danger' }
      ]
    })
    if (!choice) return

    if (choice === 'replace') {
      data.value.categories = categories
      activeCategoryId.value = null
      expanded.value = {}
    } else {
      data.value.categories.push(...reindexForAppend(categories, data.value.categories))
    }
    toast.success(`已导入 ${count} 个网站`)
  } catch (err) {
    toast.error(err.message)
  }
}
</script>

<style scoped>
.app-container {
  display: flex;
  min-height: 100vh;
}

.main-area {
  flex: 1;
  margin-left: var(--sidebar-width);
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.app-header {
  min-height: var(--header-height);
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 24px;
  position: sticky;
  top: 0;
  z-index: 100;
}

.drawer-toggle {
  display: none;
  position: fixed;
  left: 12px;
  top: 12px;
  z-index: 210;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-sm);
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  color: var(--text-primary);
  font-size: 18px;
  box-shadow: var(--shadow);
}

.search-bar {
  flex: 1;
  max-width: 500px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 0 16px;
  height: 40px;
  transition: border-color 0.2s;
}

.search-bar:focus-within {
  border-color: var(--accent);
}

.search-icon {
  font-size: 14px;
  opacity: 0.6;
}

.search-input {
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-size: 14px;
}

/* 去掉 Chrome 给 type=search 自带的清除按钮，避免和自定义按钮重复 */
.search-input::-webkit-search-cancel-button {
  appearance: none;
}

.search-clear {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 14px;
  padding: 2px 6px;
  border-radius: 4px;
}

.search-clear:hover {
  color: var(--text-primary);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.content {
  flex: 1;
  padding: 24px;
}

.category-section {
  margin-bottom: 32px;
}

.category-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.category-title {
  font-size: 18px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.category-icon {
  font-size: 20px;
}

.site-count {
  font-size: 12px;
  font-weight: 400;
  color: var(--text-muted);
  background: var(--bg-tertiary);
  padding: 2px 8px;
  border-radius: 10px;
}

.category-empty {
  font-size: 13px;
  color: var(--text-muted);
  padding: 12px 0;
}

.btn-sm {
  padding: 4px 10px;
  font-size: 13px;
  flex-shrink: 0;
}

.site-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

.load-more {
  margin-top: 12px;
  border: 1px dashed var(--border);
  width: 100%;
  justify-content: center;
}

/* 响应式：侧边栏改为抽屉，顶栏按钮只留图标 */
@media (max-width: 768px) {
  .main-area {
    margin-left: 0;
  }

  .drawer-toggle {
    display: block;
  }

  .app-header {
    padding: 8px 16px 8px 64px;
  }

  .btn-label {
    display: none;
  }

  .content {
    padding: 16px;
  }

  .site-grid {
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  }
}
</style>
