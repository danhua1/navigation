<template>
  <BaseModal :title="isBulkMove ? '批量移动网站' : '移动网站'" @close="emit('close')">
    <div v-if="isBulkMove" class="bulk-preview">
      <span class="bulk-preview-mark" aria-hidden="true">{{ sites.length }}</span>
      <span><strong>已选择 {{ sites.length }} 个网站</strong><small>选择目标分类与分组后统一移动</small></span>
    </div>
    <div v-else-if="site" class="site-preview">
      <span class="site-preview-icon">{{ site.icon || site.name.charAt(0).toUpperCase() }}</span>
      <div class="site-preview-text">
        <div class="site-preview-name">{{ site.name }}</div>
        <div class="site-preview-url">{{ site.url }}</div>
      </div>
    </div>

    <div v-if="!isBulkMove" class="form-group">
      <span class="form-label">当前分类</span>
      <div class="current-category">{{ fromCategoryName }}</div>
    </div>

    <div class="form-group destination-block">
      <div class="field-heading">
        <span class="form-label" :id="`${uid}-label`">目标分类</span>
        <span>先选择分类</span>
      </div>
      <div class="category-list" :aria-labelledby="`${uid}-label`">
        <button
          v-for="cat in targets"
          :key="cat.id"
          type="button"
          class="category-option"
          :class="{ active: selectedCategoryId === cat.id }"
          @click="selectCategory(cat.id)"
        >
          <span class="category-option-icon">{{ cat.icon }}</span>
          <span class="category-option-name">{{ cat.name }}</span>
          <span class="category-option-count">{{ cat.sites.length }}</span>
        </button>
      </div>
    </div>

    <div class="form-group destination-block">
      <div class="field-heading">
        <span class="form-label" :id="`${uid}-group-label`">目标分组</span>
        <span>再选择放入位置</span>
      </div>
      <div class="group-list" :aria-labelledby="`${uid}-group-label`">
        <button
          v-for="group in selectedGroups"
          :key="group.id"
          type="button"
          class="category-option"
          :class="{ active: selectedGroupId === group.id }"
          @click="selectedGroupId = group.id"
          @dblclick="handleMove"
        >
          <span class="category-option-name">{{ group.name }}</span>
          <span class="category-option-count">{{ groupSiteCount(group.id) }}</span>
        </button>
      </div>
    </div>

    <template #footer>
      <button type="button" class="btn btn-ghost" @click="emit('close')">取消</button>
      <button type="button" class="btn btn-primary" :disabled="!canMove" @click="handleMove">
        移动
      </button>
    </template>
  </BaseModal>
</template>

<script setup>
import { computed, ref } from 'vue'
import BaseModal from './BaseModal.vue'

const props = defineProps({
  site: { type: Object, default: null },
  sites: { type: Array, default: () => [] },
  fromCategoryId: { type: String, default: null },
  categories: { type: Array, required: true }
})

const emit = defineEmits(['close', 'move'])

const uid = `move-${Math.random().toString(36).slice(2, 8)}`
const selectedCategoryId = ref('')
const selectedGroupId = ref('')

const targets = computed(() => props.categories)
const selectedGroups = computed(() => props.categories.find(category => category.id === selectedCategoryId.value)?.groups || [])
const isBulkMove = computed(() => props.sites.length > 0)

const fromCategoryName = computed(() => {
  const cat = props.categories.find(c => c.id === props.fromCategoryId)
  return cat ? `${cat.icon} ${cat.name}` : '未知分类'
})

const canMove = computed(
  () => Boolean(selectedCategoryId.value) && Boolean(selectedGroupId.value)
)

function selectCategory(categoryId) {
  selectedCategoryId.value = categoryId
  selectedGroupId.value = selectedGroups.value[0]?.id || ''
}

function groupSiteCount(groupId) {
  return props.categories.find(category => category.id === selectedCategoryId.value)?.sites.filter(site => site.groupId === groupId).length || 0
}

function handleMove() {
  if (!canMove.value) return
  emit('move', { targetCategoryId: selectedCategoryId.value, targetGroupId: selectedGroupId.value })
}
</script>

<style scoped>
.site-preview {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--bg-primary);
  border-radius: var(--radius-sm);
  margin-bottom: 16px;
}

.bulk-preview {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  margin-bottom: 16px;
  border-left: 3px solid var(--accent);
  background: color-mix(in srgb, var(--accent-light) 50%, var(--bg-primary));
  border-radius: 4px;
  color: var(--text-secondary);
}

.bulk-preview-mark {
  display: grid;
  min-width: 28px;
  height: 28px;
  place-items: center;
  color: var(--on-accent);
  background: var(--accent);
  border-radius: 4px;
  font-family: 'DM Mono', ui-monospace, monospace;
  font-size: 11px;
  font-weight: 700;
}

.bulk-preview strong,
.bulk-preview small {
  display: block;
}

.bulk-preview strong {
  color: var(--text-primary);
  font-size: 13px;
}

.bulk-preview small {
  margin-top: 2px;
  color: var(--text-muted);
  font-size: 11px;
}

.site-preview-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: var(--accent);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 600;
  flex-shrink: 0;
}

.site-preview-text {
  min-width: 0;
}

.site-preview-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.site-preview-url {
  font-size: 12px;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.current-category {
  padding: 10px 12px;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 14px;
  color: var(--text-secondary);
}

.destination-block {
  margin-bottom: 20px;
}

.field-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.field-heading .form-label {
  margin: 0;
  color: var(--text-primary);
  font-size: 13px;
}

.field-heading > span:last-child {
  color: var(--text-muted);
  font-size: 11px;
}

.category-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 8px;
  max-height: 220px;
  overflow-y: auto;
  padding: 1px;
}

.group-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 8px;
}

.category-option {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 52px;
  padding: 9px 11px;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 14px;
  transition: border-color 0.15s, background 0.15s, color 0.15s;
  text-align: left;
}

.category-option:hover {
  border-color: var(--accent);
  background: var(--accent-light);
}

.category-option.active {
  border-color: var(--accent);
  background: var(--accent-light);
  color: var(--accent);
  font-weight: 600;
}

.category-option-icon {
  font-size: 16px;
}

.category-option-name {
  flex: 1;
}

.category-option-count {
  font-size: 11px;
  color: var(--text-muted);
  background: var(--bg-tertiary);
  padding: 1px 6px;
  border-radius: 3px;
}

.category-option.active .category-option-count {
  background: var(--accent);
  color: #fff;
}

:deep(.modal) {
  max-width: 640px;
}

:deep(.modal-body) {
  padding-top: 16px;
  padding-bottom: 12px;
}

:deep(.modal-footer) {
  padding-top: 8px;
  border-top: 1px solid var(--border);
}

@media (max-width: 520px) {
  .category-list,
  .group-list {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .category-option {
    transition: none;
  }
}
</style>
