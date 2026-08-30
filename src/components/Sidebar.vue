<template>
  <!-- 移动端抽屉的遮罩，点击关闭 -->
  <div v-if="open" class="sidebar-scrim" @click="$emit('close')"></div>

  <aside class="sidebar" :class="{ open }" :aria-hidden="isMobileClosed ? 'true' : undefined">
    <div class="sidebar-header">
      <span class="logo" aria-hidden="true">🧭</span>
      <span class="title">我的导航</span>
      <button
        class="drawer-close"
        type="button"
        aria-label="关闭菜单"
        @click="$emit('close')"
      >✕</button>
    </div>

    <nav class="sidebar-nav" aria-label="分类导航">
      <button
        class="nav-item"
        type="button"
        :class="{ active: !activeCategoryId && !searchKeyword }"
        @click="$emit('show-all')"
      >
        <span class="nav-icon" aria-hidden="true">🏠</span>
        <span class="nav-text">全部</span>
        <span class="nav-count">{{ totalSites }}</span>
      </button>

      <div class="nav-divider"></div>

      <!-- 行是容器，主按钮与操作按钮平级，避免 button 嵌套 button -->
      <div
        v-for="cat in categories"
        :key="cat.id"
        class="nav-row"
        :class="{ active: activeCategoryId === cat.id }"
      >
        <button class="nav-item" type="button" @click="$emit('select-category', cat.id)">
          <span class="nav-icon" aria-hidden="true">{{ cat.icon }}</span>
          <span class="nav-text">{{ cat.name }}</span>
          <span class="nav-count">{{ cat.sites.length }}</span>
        </button>
        <div class="nav-actions">
          <button
            class="nav-action-btn"
            type="button"
            :aria-label="`编辑分类 ${cat.name}`"
            title="编辑"
            @click="$emit('edit-category', cat)"
          >✏️</button>
          <button
            class="nav-action-btn"
            type="button"
            :aria-label="`删除分类 ${cat.name}`"
            title="删除"
            @click="$emit('delete-category', cat.id)"
          >🗑️</button>
        </div>
      </div>

      <button class="nav-item add-btn" type="button" @click="$emit('add-category')">
        <span class="nav-icon" aria-hidden="true">➕</span>
        <span class="nav-text">添加分类</span>
      </button>
    </nav>
  </aside>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  categories: { type: Array, default: () => [] },
  activeCategoryId: { type: String, default: null },
  searchKeyword: { type: String, default: '' },
  open: { type: Boolean, default: false },
  isMobile: { type: Boolean, default: false }
})

defineEmits(['select-category', 'add-category', 'edit-category', 'delete-category', 'show-all', 'close'])

const totalSites = computed(() =>
  props.categories.reduce((sum, c) => sum + c.sites.length, 0)
)

// 抽屉收起时对读屏软件隐藏，避免焦点落进屏幕外的元素
const isMobileClosed = computed(() => props.isMobile && !props.open)
</script>

<style scoped>
.sidebar {
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  width: var(--sidebar-width);
  background: var(--bg-secondary);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  z-index: 200;
  overflow-y: auto;
}

.sidebar-scrim {
  display: none;
}

.sidebar-header {
  height: var(--header-height);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 20px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.logo {
  font-size: 24px;
}

.title {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  flex: 1;
}

.drawer-close {
  display: none;
  background: none;
  border: none;
  font-size: 16px;
  color: var(--text-muted);
  padding: 4px 8px;
  border-radius: var(--radius-sm);
}

.sidebar-nav {
  padding: 12px 8px;
  flex: 1;
}

.nav-row {
  position: relative;
  border-radius: var(--radius-sm);
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-secondary);
  font-size: 14px;
  transition: background 0.15s, color 0.15s;
}

.nav-item:hover,
.nav-item:focus-visible {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.nav-row.active .nav-item,
.nav-item.active {
  background: var(--accent-light);
  color: var(--accent);
  font-weight: 600;
}

.nav-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.nav-text {
  flex: 1;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nav-count {
  font-size: 11px;
  color: var(--text-muted);
  background: var(--bg-tertiary);
  padding: 1px 6px;
  border-radius: 8px;
}

.nav-row.active .nav-count,
.nav-item.active .nav-count {
  background: var(--accent);
  color: #fff;
}

.nav-actions {
  display: flex;
  gap: 2px;
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: var(--bg-secondary);
  padding: 2px;
  border-radius: var(--radius-sm);
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.15s;
}

.nav-row:hover .nav-actions,
.nav-actions:focus-within {
  opacity: 1;
  visibility: visible;
}

@media (hover: none) {
  .nav-actions {
    opacity: 1;
    visibility: visible;
  }
}

.nav-action-btn {
  background: none;
  border: none;
  padding: 2px 4px;
  font-size: 12px;
  border-radius: 4px;
  opacity: 0.7;
}

.nav-action-btn:hover,
.nav-action-btn:focus-visible {
  opacity: 1;
  background: var(--bg-tertiary);
}

.nav-divider {
  height: 1px;
  background: var(--border);
  margin: 8px 12px;
}

.add-btn {
  color: var(--text-muted);
  border: 1px dashed var(--border);
  margin-top: 4px;
}

.add-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}

/* 移动端：抽屉式，由 open 控制 */
@media (max-width: 768px) {
  .sidebar {
    transform: translateX(-100%);
    transition: transform 0.3s;
    box-shadow: none;
  }

  .sidebar.open {
    transform: translateX(0);
    box-shadow: var(--shadow-lg);
  }

  .drawer-close {
    display: block;
  }

  .sidebar-scrim {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    z-index: 150;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sidebar {
    transition: none;
  }
}
</style>
