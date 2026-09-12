<template>
  <AuthView v-if="!authReady || !authUser" :loading="!authReady" @authenticated="handleAuthenticated" />
  <div v-else class="app-shell">
    <a class="skip-link" href="#workspace">跳到内容</a>
    <header class="topbar">
      <button class="wordmark" type="button" title="显示全部网站" @click="handleShowAll">
        <span class="wordmark-mark" aria-hidden="true">N</span>
        <span>Navigation</span>
      </button>
      <p class="sync-state"><span aria-hidden="true"></span>已连接 · {{ totalSiteCount }} 个链接</p>
      <div class="topbar-actions">
        <button class="btn btn-ghost utility-btn" type="button" title="导入 JSON 备份" @click="triggerImport">导入</button>
        <button class="btn btn-ghost utility-btn" type="button" title="导出 JSON 备份" @click="handleExport">导出</button>
        <button
          class="theme-button"
          type="button"
          :aria-label="theme === 'light' ? '切换到暗色模式' : '切换到亮色模式'"
          :title="theme === 'light' ? '暗色模式' : '亮色模式'"
          @click="toggleTheme"
        >{{ theme === 'light' ? '暗' : '亮' }}</button>
        <button class="account-button" type="button" title="退出登录" @click="handleLogout">
          <span class="account-avatar" aria-hidden="true">{{ authUser.username.charAt(0).toUpperCase() }}</span>
          <span>{{ authUser.username }}</span>
        </button>
      </div>
    </header>

    <main id="workspace" class="workspace" tabindex="-1">
      <section class="command-deck" aria-label="导航控制台">
        <div class="command-title">
          <p class="kicker">PERSONAL LINK INDEX</p>
          <h1>你的导航工作台</h1>
        </div>
        <div class="search-bar">
          <span class="search-icon" aria-hidden="true">/</span>
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
        <button class="btn btn-primary add-site" type="button" @click="showSiteModal()">添加网站</button>
      </section>

      <nav class="category-rail" aria-label="分类工作区">
        <button class="category-tab all-tab" :class="{ active: !activeCategoryId && !searchKeyword }" type="button" :aria-current="!activeCategoryId && !searchKeyword ? 'page' : undefined" @click="handleShowAll">
          <span>全部</span><b>{{ totalSiteCount }}</b>
        </button>
        <div class="category-tab-wrap" v-for="cat in data.categories" :key="cat.id" :class="{ active: activeCategoryId === cat.id }">
          <button class="category-tab" type="button" :aria-current="activeCategoryId === cat.id ? 'page' : undefined" @click="handleSelectCategory(cat.id)">
            <span class="category-tab-icon" aria-hidden="true">{{ cat.icon }}</span>
            <span>{{ cat.name }}</span><b>{{ cat.sites.length }}</b>
          </button>
          <div class="category-tab-actions" role="group" :aria-label="`${cat.name} 分类操作`">
            <button type="button" :aria-label="`编辑分类 ${cat.name}`" title="编辑分类" @click="showCategoryModal(cat)">编辑</button>
            <button type="button" :aria-label="`删除分类 ${cat.name}`" title="删除分类" @click="handleDeleteCategory(cat.id)">删除</button>
          </div>
        </div>
        <button class="new-category" type="button" @click="showCategoryModal()">新建分类</button>
      </nav>

      <section class="content">
        <div v-if="selectedSiteIds.size" class="selection-toolbar" role="status">
          <span class="selection-count"><b>{{ selectedSiteIds.size }}</b> 已选择</span>
          <div>
            <button class="btn btn-ghost btn-sm" type="button" @click="clearSelection">取消选择</button>
            <button class="btn btn-primary btn-sm" type="button" @click="showBulkMoveModal">移动到分组</button>
          </div>
        </div>
        <div v-if="!emptyState" class="collection-summary">
          <div>
            <h1>{{ collectionTitle }}</h1>
            <p class="collection-meta">{{ collectionMeta }}</p>
          </div>
          <p class="workspace-hint">拖动网站至分组，或使用网站菜单移动</p>
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
                <div>
                  <p class="group-label">分组</p>
                  <h3>{{ group.name }} <span>{{ sitesForGroup(category, group.id).length }}</span></h3>
                </div>
                <div class="group-actions">
                  <button type="button" class="group-action" :aria-label="`编辑分组 ${group.name}`" title="编辑分组" @click="showGroupModal(category.id, group)">编辑</button>
                  <button type="button" class="group-action" :aria-label="`删除分组 ${group.name}`" title="删除分组" @click="handleDeleteGroup(category.id, group.id)">删除</button>
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
                  :selected="selectedSiteIds.has(site.id)"
                  @toggle-selection="toggleSiteSelection"
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
      </section>
    </main>
    <input
      ref="fileInput"
      type="file"
      accept="application/json,.json"
      class="sr-only"
      tabindex="-1"
      @change="handleFileSelected"
    />

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
      :sites="movingSites"
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
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
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
const movingSiteIds = ref([])
const editingGroup = ref(null)
const editingGroupCategoryId = ref(null)
const draggedSiteId = ref(null)
const dropTargetGroupId = ref(null)
const fileInput = ref(null)
const selectedSiteIds = ref(new Set())

// 每个分类已展开的数量
const expanded = ref({})

// ===== 初始化 =====
let activeUserId = null
let remoteRevision = 0
let hydratingData = false
let remoteSyncBlocked = false

onMounted(async () => {
  const user = await currentUser()
  authUser.value = user && await activateUser(user) ? user : null
  authReady.value = true

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

// navigation_data 是严格的 JSON 文档。JSON 往返既是安全的深拷贝，
// 也不会把 Vue 的响应式代理传给 structuredClone。
function createNavigationSnapshot(value) {
  return JSON.parse(JSON.stringify(value))
}

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
  const snapshot = createNavigationSnapshot(data.value)
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
      debouncedPersist(createNavigationSnapshot(newVal), activeUserId)
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

const totalSiteCount = computed(() =>
  data.value.categories.reduce((sum, category) => sum + category.sites.length, 0)
)

const movingSites = computed(() => {
  if (movingSiteIds.value.length === 0) return []
  const ids = new Set(movingSiteIds.value)
  return data.value.categories.flatMap(category => category.sites.filter(site => ids.has(site.id)))
})

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
}

function handleShowAll() {
  activeCategoryId.value = null
  clearSearch()
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
  if (selectedSiteIds.value.has(siteId)) toggleSiteSelection(siteId)
  toast.success('已删除')
}

// ===== 分类 =====
function showCategoryModal(category = null) {
  editingCategory.value = category
  categoryModalVisible.value = true
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
  const nextSelection = new Set(selectedSiteIds.value)
  for (const site of cat.sites) nextSelection.delete(site.id)
  selectedSiteIds.value = nextSelection
  if (activeCategoryId.value === categoryId) activeCategoryId.value = null
  delete expanded.value[categoryId]
  toast.success('已删除')
}

// ===== 移动 =====
function showMoveModal(site, fromCategoryId) {
  movingSite.value = site
  movingSiteFromCategoryId.value = fromCategoryId
  movingSiteIds.value = []
  moveModalVisible.value = true
}

function toggleSiteSelection(siteId) {
  const next = new Set(selectedSiteIds.value)
  if (next.has(siteId)) next.delete(siteId)
  else next.add(siteId)
  selectedSiteIds.value = next
}

function clearSelection() {
  selectedSiteIds.value = new Set()
}

function showBulkMoveModal() {
  if (selectedSiteIds.value.size === 0) return
  movingSite.value = null
  movingSiteFromCategoryId.value = null
  movingSiteIds.value = [...selectedSiteIds.value]
  moveModalVisible.value = true
}

function handleMoveSite({ targetCategoryId, targetGroupId }) {
  const targetCat = data.value.categories.find(c => c.id === targetCategoryId)
  if (!targetCat) return
  if (!targetCat.groups.some(group => group.id === targetGroupId)) return

  if (movingSiteIds.value.length > 0) {
    const ids = new Set(movingSiteIds.value)
    const sites = []
    for (const category of data.value.categories) {
      const retained = []
      for (const site of category.sites) {
        if (ids.has(site.id)) sites.push(site)
        else retained.push(site)
      }
      category.sites = retained
    }
    if (sites.length === 0) return
    targetCat.sites.push(...sites.map(site => ({ ...site, groupId: targetGroupId })))
    moveModalVisible.value = false
    clearSelection()
    movingSiteIds.value = []
    toast.success(`已将 ${sites.length} 个网站移动到「${targetCat.name}」`)
    return
  }

  const fromCat = data.value.categories.find(c => c.id === movingSiteFromCategoryId.value)
  if (!fromCat || !movingSite.value) return

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

<style scoped>
.app-shell { min-height: 100dvh; background: var(--bg-primary); }
.skip-link { position: fixed; top: 8px; left: 8px; z-index: 1000; transform: translateY(-150%); background: var(--accent); color: var(--on-accent); padding: 10px 14px; border-radius: 6px; }
.skip-link:focus { transform: translateY(0); }
.topbar { min-height: 68px; display: flex; align-items: center; gap: 24px; padding: 10px clamp(16px, 4vw, 64px); border-bottom: 1px solid var(--border); background: color-mix(in srgb, var(--bg-primary) 92%, transparent); backdrop-filter: blur(18px); position: sticky; top: 0; z-index: 30; }
.wordmark { display: inline-flex; align-items: center; gap: 10px; color: var(--text-primary); font-family: 'DM Mono', ui-monospace, monospace; font-size: 14px; font-weight: 700; letter-spacing: 0; }.wordmark-mark { width: 28px; height: 28px; display: grid; place-items: center; color: var(--on-accent); background: var(--accent); border-radius: 6px; font-family: inherit; }.sync-state { color: var(--text-muted); font-family: 'DM Mono', ui-monospace, monospace; font-size: 11px; margin-right: auto; }.sync-state span { display: inline-block; width: 7px; height: 7px; margin-right: 7px; border-radius: 50%; background: var(--success); }.topbar-actions { display: flex; align-items: center; gap: 4px; }.utility-btn { min-height: 36px; padding-inline: 10px; font-size: 12px; }.theme-button, .account-button { min-height: 36px; border: 1px solid var(--border); background: var(--bg-secondary); color: var(--text-secondary); }.theme-button { width: 36px; border-radius: 6px; font-size: 12px; }.account-button { display: inline-flex; align-items: center; gap: 8px; padding: 4px 9px 4px 5px; margin-left: 4px; border-radius: 6px; font-size: 12px; }.account-avatar { display: grid; place-items: center; width: 26px; height: 26px; background: var(--accent-light); color: var(--accent); font-weight: 700; border-radius: 4px; }
.workspace { width: min(1600px, 100%); margin: 0 auto; padding: clamp(24px, 4vw, 56px) clamp(16px, 4vw, 64px) 72px; }.command-deck { display: grid; grid-template-columns: minmax(190px, .85fr) minmax(250px, 1.5fr) auto; align-items: center; gap: 24px; padding: 0 0 32px; border-bottom: 1px solid var(--border); }.kicker, .group-label { color: var(--accent); font-family: 'DM Mono', ui-monospace, monospace; font-size: 10px; font-weight: 700; letter-spacing: .08em; }.command-title h1 { font-size: clamp(25px, 3vw, 38px); line-height: 1.15; margin-top: 6px; letter-spacing: 0; }.command-deck .search-bar { height: 50px; max-width: none; display: flex; align-items: center; gap: 10px; padding: 0 12px; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 6px; box-shadow: none; transition: border-color .18s ease, box-shadow .18s ease; }.command-deck .search-bar:focus-within { border-color: var(--accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 16%, transparent); }.command-deck .search-icon { display: grid; width: 24px; height: 24px; place-items: center; border: 1px solid var(--border); color: var(--text-muted); border-radius: 4px; font-family: 'DM Mono', ui-monospace, monospace; font-size: 12px; opacity: 1; }.search-input { outline: 0; }.add-site { min-height: 50px; padding-inline: 18px; }
.category-rail { display: flex; align-items: stretch; gap: 8px; padding: 18px 0 28px; overflow-x: auto; border-bottom: 1px solid var(--border); scrollbar-width: thin; }.category-tab-wrap { position: relative; flex: 0 0 auto; border: 1px solid var(--border); border-radius: 6px; background: var(--bg-secondary); transition: border-color .18s, background .18s; }.category-tab-wrap.active, .category-tab-wrap:hover { border-color: var(--accent); }.category-tab { min-height: 42px; display: flex; align-items: center; gap: 8px; padding: 7px 10px; color: var(--text-secondary); font-size: 13px; white-space: nowrap; }.category-tab:hover, .category-tab:focus-visible, .category-tab-wrap.active .category-tab { color: var(--text-primary); }.category-tab-wrap.active .category-tab { font-weight: 700; }.category-tab b { display: grid; min-width: 20px; height: 20px; place-items: center; padding: 0 5px; background: var(--bg-tertiary); color: var(--text-muted); border-radius: 3px; font-family: 'DM Mono', ui-monospace, monospace; font-size: 10px; font-weight: 500; }.category-tab-icon { max-width: 20px; overflow: hidden; }.all-tab { border: 1px solid var(--border); background: var(--bg-secondary); color: var(--text-secondary); }.all-tab.active { border-color: var(--accent); background: var(--accent); color: var(--on-accent); font-weight: 700; }.all-tab.active b { background: color-mix(in srgb, var(--on-accent) 18%, transparent); color: var(--on-accent); }.category-tab-actions { display: none; gap: 2px; position: absolute; inset: calc(100% + 4px) auto auto 0; z-index: 10; padding: 4px; background: var(--bg-secondary); border: 1px solid var(--border); box-shadow: var(--shadow-lg); border-radius: 5px; }.category-tab-wrap:hover .category-tab-actions, .category-tab-actions:focus-within { display: flex; }.category-tab-actions button { min-height: 32px; padding: 0 8px; border-radius: 3px; color: var(--text-secondary); font-size: 11px; }.category-tab-actions button:hover { background: var(--bg-tertiary); color: var(--text-primary); }.new-category { min-height: 42px; flex: 0 0 auto; padding: 0 12px; color: var(--accent); border: 1px dashed color-mix(in srgb, var(--accent) 65%, var(--border)); border-radius: 6px; font-size: 12px; font-weight: 600; white-space: nowrap; }.new-category:hover { background: var(--accent-light); }
.content { width: auto; padding: 36px 0 0; }.collection-summary { display: flex; align-items: end; justify-content: space-between; gap: 20px; padding-bottom: 28px; margin: 0; }.collection-summary h1 { font-size: 22px; line-height: 1.2; letter-spacing: 0; }.collection-meta, .workspace-hint { color: var(--text-muted); font-size: 12px; margin-top: 7px; }.workspace-hint { font-family: 'DM Mono', ui-monospace, monospace; text-align: right; }.category-section { margin-bottom: 50px; }.category-header { display: flex; align-items: center; gap: 12px; margin-bottom: 18px; }.category-title { font-size: 17px; }.site-count { padding: 2px 7px; border: 1px solid var(--border); border-radius: 3px; background: transparent; color: var(--text-muted); font-family: 'DM Mono', ui-monospace, monospace; font-size: 10px; font-weight: 500; }.btn-sm { min-height: 34px; padding: 5px 9px; font-size: 12px; }.category-empty { padding: 24px; border: 1px dashed var(--border); color: var(--text-muted); font-size: 13px; }
.selection-toolbar { position: sticky; top: 78px; z-index: 20; display: flex; align-items: center; justify-content: space-between; gap: 12px; width: fit-content; min-width: 260px; padding: 7px 8px 7px 12px; margin: -12px 0 20px; background: color-mix(in srgb, var(--bg-secondary) 96%, transparent); border: 1px solid var(--border); border-radius: 6px; box-shadow: 0 8px 20px color-mix(in srgb, var(--text-primary) 12%, transparent); color: var(--text-secondary); font-size: 12px; }.selection-count { display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }.selection-count b { display: grid; min-width: 21px; height: 21px; place-items: center; padding: 0 5px; color: var(--on-accent); background: var(--accent); border-radius: 3px; font-family: 'DM Mono', ui-monospace, monospace; font-size: 10px; }.selection-toolbar > div { display: flex; gap: 4px; }.selection-toolbar .btn { min-height: 32px; }
.group-list { grid-template-columns: repeat(auto-fit, minmax(min(100%, 460px), 1fr)); gap: 16px; }.group-section { min-width: 0; margin: 0; padding: 18px; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 7px; transition: border-color .18s, transform .18s, background .18s; }.group-section.is-drop-target { border-color: var(--accent); background: var(--accent-light); transform: translateY(-2px); }.group-header { padding-bottom: 14px; margin-bottom: 14px; border-bottom: 1px solid var(--border); }.group-header h3 { display: flex; align-items: center; gap: 6px; font-size: 15px; color: var(--text-primary); }.group-header h3 span { display: grid; min-width: 22px; height: 20px; place-items: center; padding: 0 5px; background: var(--bg-tertiary); border-radius: 3px; color: var(--text-muted); font-family: 'DM Mono', ui-monospace, monospace; font-size: 10px; }.group-actions { opacity: .55; }.group-section:hover .group-actions, .group-actions:focus-within { opacity: 1; }.group-action { min-width: 34px; min-height: 34px; padding: 0 7px; width: auto; height: auto; border-radius: 4px; font-size: 12px; }.site-grid { display: grid; grid-template-columns: 1fr; gap: 8px; }.group-empty { min-height: 92px; margin: 0; border-radius: 4px; }.load-more { margin-top: 16px; }
@media (max-width: 800px) { .topbar { gap: 12px; }.sync-state, .account-button > span:last-child { display: none; }.command-deck { grid-template-columns: 1fr auto; gap: 16px; }.command-deck .search-bar { grid-column: 1 / -1; grid-row: 2; }.collection-summary { align-items: flex-start; flex-direction: column; }.workspace-hint { text-align: left; }.group-list { grid-template-columns: 1fr; } }
@media (max-width: 480px) { .topbar { padding-inline: 14px; }.utility-btn { display: none; }.workspace { padding: 24px 14px 48px; }.command-title h1 { font-size: 26px; }.add-site { padding-inline: 12px; }.category-rail { margin-inline: -14px; padding-inline: 14px; }.category-header { align-items: flex-start; flex-wrap: wrap; }.category-header-actions { margin-left: 0; }.group-section { padding: 14px; } }
@media (hover: none) { .category-tab-actions { display: flex; position: static; padding: 3px 4px 4px; border: 0; box-shadow: none; background: transparent; } .category-tab-wrap { padding-bottom: 2px; } }
@media (prefers-reduced-motion: reduce) { .group-section, .category-tab-wrap { transition: none; }.group-section.is-drop-target { transform: none; } }
</style>

<style scoped>
/* 分组顺着页面向下展开，网站在各分组内横向扫描。 */
.group-list { grid-template-columns: 1fr; gap: 20px; }
.group-section { padding: 20px; }
.site-grid { grid-template-columns: repeat(auto-fill, minmax(245px, 1fr)); gap: 10px; }
@media (max-width: 600px) {
  .site-grid { grid-template-columns: 1fr; }
}
</style>
