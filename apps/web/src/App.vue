<template>
  <AuthView v-if="!authReady || !authUser" :loading="!authReady" @authenticated="handleAuthenticated" />
  <div v-else class="app-container">
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
          <span class="search-icon" aria-hidden="true">⌕</span>
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
          >×</button>
        </div>
        <div class="header-actions">
          <button
            class="btn btn-ghost"
            type="button"
            :aria-label="theme === 'light' ? '切换到暗色模式' : '切换到亮色模式'"
            :title="theme === 'light' ? '暗色模式' : '亮色模式'"
            @click="toggleTheme"
          >
            {{ theme === 'light' ? '☾' : '☀' }}
          </button>
          <button class="btn btn-ghost" type="button" title="导入 JSON 备份" @click="triggerImport">
            <span aria-hidden="true">↓</span><span class="btn-label">导入</span>
          </button>
          <button class="btn btn-ghost" type="button" title="导出 JSON 备份" @click="handleExport">
            <span aria-hidden="true">↑</span><span class="btn-label">导出</span>
          </button>
          <button class="btn btn-primary" type="button" @click="showSiteModal()">
            <span aria-hidden="true">＋</span><span class="btn-label">添加网站</span>
          </button>
          <button class="btn btn-ghost" type="button" title="退出登录" @click="handleLogout">
            <span class="btn-label">{{ authUser.username }}</span><span aria-hidden="true">↪</span>
          </button>
          <input
            ref="fileInput"
            type="file"
            accept="application/json,.json"
            class="sr-only"
            tabindex="-1"
            @change="handleFileSelected"
          />
        </div>
      </header>

      <!-- 站点列表 -->
      <main class="content">
        <div v-if="!emptyState" class="collection-summary">
          <div>
            <p class="eyebrow">收藏导航</p>
            <h1>{{ collectionTitle }}</h1>
          </div>
          <p class="collection-meta">{{ collectionMeta }}</p>
        </div>
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
            <div class="category-header-actions">
              <button
                class="btn btn-ghost btn-sm"
                type="button"
                @click="showGroupModal(category.id)"
              >
                ＋ 分组
              </button>
              <button
                class="btn btn-ghost btn-sm"
                type="button"
                @click="showSiteModal(null, category.id)"
              >
                ＋ 网站
              </button>
            </div>
          </div>

          <div v-if="category.sites.length === 0" class="category-empty">
            这个分类还没有网站
          </div>

          <div v-else class="group-list">
            <section
              v-for="group in visibleGroups(category)"
              :key="group.id"
              class="group-section"
              :class="{ 'is-drop-target': dropTargetGroupId === group.id }"
              @dragover.prevent="dropTargetGroupId = group.id"
              @dragleave="dropTargetGroupId = null"
              @drop="dropSite(category.id, group.id)"
            >
              <div class="group-header">
                <h3>{{ group.name }} <span>{{ sitesForGroup(category, group.id).length }}</span></h3>
                <div class="group-actions">
                  <button type="button" class="group-action" :aria-label="`编辑分组 ${group.name}`" title="编辑分组" @click="showGroupModal(category.id, group)">✎</button>
                  <button type="button" class="group-action" :aria-label="`删除分组 ${group.name}`" title="删除分组" @click="handleDeleteGroup(category.id, group.id)">⌫</button>
                </div>
              </div>
              <div class="site-grid">
                <SiteCard
                  v-for="site in visibleSitesForGroup(category, group.id)"
                  :key="site.id"
                  :site="site"
                  @edit="showSiteModal(site, category.id)"
                  @delete="handleDeleteSite(category.id, $event)"
                  @move="showMoveModal(site, category.id)"
                  @dragstart="draggedSiteId = $event.id"
                />
              </div>
              <p v-if="sitesForGroup(category, group.id).length === 0" class="group-empty">将网站拖到这里，或通过“移动”操作归类。</p>
            </section>
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
      :default-group-id="siteModalGroupId"
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

    <GroupModal
      v-if="groupModalVisible"
      :group="editingGroup"
      @close="groupModalVisible = false"
      @save="handleSaveGroup"
    />

    <ConfirmDialog />
    <ToastHost />
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, toRaw, watch } from 'vue'
import Sidebar from './components/Sidebar.vue'
import SiteCard from './components/SiteCard.vue'
import SiteModal from './components/SiteModal.vue'
import CategoryModal from './components/CategoryModal.vue'
import MoveModal from './components/MoveModal.vue'
import GroupModal from './components/GroupModal.vue'
import ConfirmDialog from './components/ConfirmDialog.vue'
import ToastHost from './components/ToastHost.vue'
import AuthView from './components/AuthView.vue'
import { clearToken, currentUser, getNavigationData, saveNavigationData } from './api/auth.js'
import { useToast } from './composables/useToast.js'
import { useDialog } from './composables/useDialog.js'
import { debounce } from './utils/debounce.js'
import {
  exportData,
  getDefaultData,
  generateId,
  importData,
  loadData,
  MAX_IMPORT_BYTES,
  reindexForAppend,
  saveData,
  sanitizeData
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
const authUser = ref(null)
const authReady = ref(false)

// 弹窗状态
const siteModalVisible = ref(false)
const categoryModalVisible = ref(false)
const moveModalVisible = ref(false)
const groupModalVisible = ref(false)
const editingSite = ref(null)
const editingCategory = ref(null)
const siteModalCategoryId = ref(null)
const siteModalGroupId = ref(null)
const movingSite = ref(null)
const movingSiteFromCategoryId = ref(null)
const editingGroup = ref(null)
const editingGroupCategoryId = ref(null)
const draggedSiteId = ref(null)
const dropTargetGroupId = ref(null)
const fileInput = ref(null)

// 每个分类已展开的数量
const expanded = ref({})

// ===== 初始化 =====
let mediaQuery = null
let activeUserId = null
let remoteRevision = 0
let hydratingData = false
let remoteSyncBlocked = false

function syncIsMobile(e) {
  isMobile.value = e.matches
  if (!e.matches) sidebarOpen.value = false
}

onMounted(async () => {
  const user = await currentUser()
  authUser.value = user && await activateUser(user) ? user : null
  authReady.value = true

  mediaQuery = window.matchMedia('(max-width: 768px)')
  syncIsMobile(mediaQuery)
  mediaQuery.addEventListener('change', syncIsMobile)

  // 关闭页面前把挂起的保存补上，否则最后一次改动会丢
  window.addEventListener('pagehide', flushSave)
  document.addEventListener('visibilitychange', handleVisibility)
})

function handleAuthenticated(user) {
  activateUser(user).then(active => {
    if (active) authUser.value = user
  })
}

function handleLogout() {
  debouncedPersist.cancel()
  activeUserId = null
  remoteRevision = 0
  remoteSyncBlocked = false
  clearToken()
  authUser.value = null
  data.value = getDefaultData()
}

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
let remoteSaveChain = Promise.resolve()

async function persist(snapshot, userId) {
  const result = saveData(snapshot, userId)
  if (result.ok) {
    lastSaveError = ''
  } else if (result.error !== lastSaveError) {
    lastSaveError = result.error
    toast.error(result.error)
  }

  if (!userId) return

  // 所有远端写入排队，避免网络乱序导致旧快照覆盖新快照。
  remoteSaveChain = remoteSaveChain
    .catch(() => {})
    .then(async () => {
      if (activeUserId !== userId || remoteSyncBlocked) return
      try {
        const result = await saveNavigationData(snapshot, remoteRevision)
        remoteRevision = result.revision
        lastRemoteSaveError = ''
      } catch (error) {
        if (error.status === 401) {
          clearToken()
          activeUserId = null
          authUser.value = null
          return
        }
        if (error.status === 409) {
          remoteSyncBlocked = true
          toast.error('云端数据已在其他位置更新。本地修改已保留，请刷新后再同步。')
          return
        }
        if (error.message !== lastRemoteSaveError) {
          lastRemoteSaveError = error.message
          toast.error(`云端保存失败：${error.message}`)
        }
      }
    })
  await remoteSaveChain
}

async function persistNow() {
  const snapshot = structuredClone(toRaw(data.value))
  const local = saveData(snapshot, activeUserId)
  if (!local.ok) throw new Error(local.error)
  if (!activeUserId) return false

  debouncedPersist.cancel()
  try {
    const result = await saveNavigationData(snapshot, remoteRevision)
    remoteRevision = result.revision
    return true
  } catch (error) {
    if (error.status === 401) {
      clearToken()
      activeUserId = null
      authUser.value = null
    }
    throw error
  }
}

const debouncedPersist = debounce(persist, SAVE_DELAY)
let lastRemoteSaveError = ''

function flushSave() {
  debouncedPersist.flush()
}

watch(
  data,
  newVal => {
    if (activeUserId && !hydratingData) {
      // 防止排队期间继续修改响应式对象，导致请求内容随引用变化。
      debouncedPersist(structuredClone(toRaw(newVal)), activeUserId)
    }
  },
  { deep: true }
)

async function activateUser(user) {
  activeUserId = user.id
  remoteSyncBlocked = false
  const localData = loadData(user.id)

  try {
    const remote = await getNavigationData()
    remoteRevision = remote.revision
    if (remote.data) {
      hydratingData = true
      data.value = sanitizeData(remote.data).data
      await nextTick()
      hydratingData = false
      saveData(data.value, user.id)
    } else {
      hydratingData = true
      data.value = localData
      await nextTick()
      hydratingData = false
      const result = await saveNavigationData(data.value, remoteRevision)
      remoteRevision = result.revision
      saveData(data.value, user.id)
    }
    applyTheme(data.value.settings.theme)
  } catch (error) {
    if (error.status === 401) {
      clearToken()
      activeUserId = null
      return false
    }
    hydratingData = true
    data.value = localData
    await nextTick()
    hydratingData = false
    applyTheme(data.value.settings.theme)
    toast.error(`云端数据加载失败，当前使用本地缓存：${error.message}`)
  }
  return true
}

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

const visibleSiteCount = computed(() =>
  filteredCategories.value.reduce((sum, category) => sum + category.sites.length, 0)
)

const collectionTitle = computed(() => {
  if (activeKeyword.value) return `“${activeKeyword.value}”的搜索结果`
  if (activeCategoryId.value) {
    return data.value.categories.find(category => category.id === activeCategoryId.value)?.name || '收藏导航'
  }
  return '全部链接'
})

const collectionMeta = computed(() => `${visibleSiteCount.value} 个网站 · ${filteredCategories.value.length} 个分类`)

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

function sitesForGroup(category, groupId) {
  return category.sites.filter(site => site.groupId === groupId)
}

function visibleGroups(category) {
  if (!activeKeyword.value) return category.groups
  return category.groups.filter(group => sitesForGroup(category, group.id).length > 0)
}

function visibleSitesForGroup(category, groupId) {
  const sites = sitesForGroup(category, groupId)
  const limit = limitFor(`${category.id}:${groupId}`)
  return sites.length <= limit ? sites : sites.slice(0, limit)
}

function hiddenCount(category) {
  return category.groups.reduce((count, group) =>
    count + Math.max(0, sitesForGroup(category, group.id).length - limitFor(`${category.id}:${group.id}`)), 0)
}

function showMore(categoryId) {
  const category = data.value.categories.find(item => item.id === categoryId)
  for (const group of category?.groups || []) {
    const key = `${categoryId}:${group.id}`
    expanded.value[key] = limitFor(key) + PAGE_SIZE
  }
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
  siteModalGroupId.value = site?.groupId || null
  siteModalVisible.value = true
}

function showGroupModal(categoryId, group = null) {
  editingGroupCategoryId.value = categoryId
  editingGroup.value = group
  groupModalVisible.value = true
}

function handleSaveGroup(group) {
  const category = data.value.categories.find(item => item.id === editingGroupCategoryId.value)
  if (!category) return
  if (group.id) {
    const target = category.groups.find(item => item.id === group.id)
    if (target) target.name = group.name
    toast.success('分组已更新')
  } else {
    category.groups.push({ id: generateId('group'), name: group.name })
    toast.success(`已创建「${group.name}」`)
  }
  groupModalVisible.value = false
}

async function handleDeleteGroup(categoryId, groupId) {
  const category = data.value.categories.find(item => item.id === categoryId)
  const group = category?.groups.find(item => item.id === groupId)
  if (!category || !group) return
  if (category.groups.length <= 1) {
    toast.error('每个分类至少需要保留一个分组')
    return
  }
  const destination = category.groups.find(item => item.id !== groupId)
  const count = sitesForGroup(category, groupId).length
  const ok = await askDanger({
    title: '删除分组',
    message: count > 0 ? `「${group.name}」中的 ${count} 个网站将转入「${destination.name}」。` : `确定删除「${group.name}」？`,
    confirmLabel: '删除分组'
  })
  if (!ok) return
  for (const site of category.sites) {
    if (site.groupId === groupId) site.groupId = destination.id
  }
  category.groups = category.groups.filter(item => item.id !== groupId)
  delete expanded.value[`${categoryId}:${groupId}`]
  toast.success('分组已删除')
}

function dropSite(categoryId, groupId) {
  const category = data.value.categories.find(item => item.id === categoryId)
  const site = category?.sites.find(item => item.id === draggedSiteId.value)
  dropTargetGroupId.value = null
  draggedSiteId.value = null
  if (!site || site.groupId === groupId) return
  site.groupId = groupId
  toast.success('网站已移动到分组')
}

function handleSaveSite({ site, categoryId, groupId }) {
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
      source.sites[idx] = { ...site, groupId }
    } else {
      source.sites.splice(idx, 1)
      target.sites.push({ ...site, groupId })
    }
    toast.success('已保存')
  } else {
    target.sites.push({ ...site, id: generateId('site'), groupId })
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
    data.value.categories.push({
      ...catData,
      id: generateId('cat'),
      groups: [
        { id: generateId('group'), name: '常用' },
        { id: generateId('group'), name: '非常用' }
      ],
      sites: []
    })
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

function handleMoveSite({ targetCategoryId, targetGroupId }) {
  const fromCat = data.value.categories.find(c => c.id === movingSiteFromCategoryId.value)
  const targetCat = data.value.categories.find(c => c.id === targetCategoryId)
  if (!fromCat || !targetCat) return
  if (!targetCat.groups.some(group => group.id === targetGroupId)) return

  const idx = fromCat.sites.findIndex(s => s.id === movingSite.value.id)
  if (idx === -1) return

  const [site] = fromCat.sites.splice(idx, 1)
  targetCat.sites.push({ ...site, groupId: targetGroupId })
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
  if (file.size > MAX_IMPORT_BYTES) {
    toast.error('导入文件过大，最多支持 5MB')
    return
  }

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
    await nextTick()
    const synced = await persistNow()
    toast.success(`导入完成，共 ${count} 个网站${skipped ? `。${skipped}` : ''}${synced ? '，已同步到云端。' : ''}`)
  } catch (err) {
    toast.error(err.message)
  }
}

</script>

<style scoped>
.app-container {
  display: flex;
  min-height: 100dvh;
  background: var(--bg-primary);
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
  background: color-mix(in srgb, var(--bg-primary) 92%, transparent);
  border-bottom: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
  backdrop-filter: blur(14px);
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px clamp(16px, 3vw, 40px);
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
  max-width: 560px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 0 14px;
  height: 44px;
  box-shadow: 0 1px 0 rgba(19, 78, 74, 0.04);
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

.search-bar:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent);
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
  width: min(1440px, 100%);
  padding: clamp(24px, 4vw, 44px) clamp(16px, 3vw, 40px) 56px;
}

.collection-summary {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 16px;
  margin: 0 0 32px;
}

.eyebrow {
  color: var(--accent);
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  margin-bottom: 8px;
}

.collection-summary h1 {
  font-size: clamp(24px, 3vw, 32px);
  line-height: 1.2;
  letter-spacing: 0;
}

.collection-meta {
  color: var(--text-secondary);
  font-size: 13px;
  white-space: nowrap;
}

.category-section {
  margin-bottom: 40px;
}

.category-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.category-header-actions {
  display: flex;
  gap: 4px;
  margin-left: auto;
}

.category-title {
  font-size: 17px;
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
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 14px;
}

.group-list {
  display: grid;
  gap: 24px;
}

.group-section {
  border: 1px solid transparent;
  border-radius: var(--radius);
  padding: 12px;
  margin: -12px;
  transition: border-color 0.18s ease, background 0.18s ease;
}

.group-section.is-drop-target {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent-light) 45%, transparent);
}

.group-header {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 34px;
  margin-bottom: 10px;
}

.group-header h3 {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-secondary);
}

.group-header h3 span {
  display: inline-grid;
  place-items: center;
  min-width: 22px;
  height: 20px;
  padding: 0 6px;
  margin-left: 4px;
  border-radius: 999px;
  background: var(--bg-tertiary);
  color: var(--text-muted);
  font-size: 11px;
}

.group-actions {
  display: flex;
  gap: 4px;
  margin-left: auto;
  opacity: 0;
  transition: opacity 0.18s ease;
}

.group-section:hover .group-actions,
.group-actions:focus-within {
  opacity: 1;
}

.group-action {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
}

.group-action:hover,
.group-action:focus-visible {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.group-empty {
  margin: 2px 0 0;
  min-height: 72px;
  display: grid;
  place-items: center;
  border: 1px dashed var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  font-size: 12px;
  text-align: center;
  padding: 12px;
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

  .collection-summary {
    align-items: flex-start;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 24px;
  }

  .site-grid {
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  }

  .group-actions {
    opacity: 1;
  }
}
</style>
