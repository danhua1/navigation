<template>
  <BaseModal :title="isBulkMove ? '批量移动网站' : '移动网站'" @close="emit('close')">
    <div v-if="isBulkMove" class="bulk-preview">
      <strong>{{ sites.length }}</strong>
      <span>个已选择的网站</span>
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

    <div class="form-group">
      <span class="form-label" :id="`${uid}-label`">目标分类 *</span>
      <div class="category-list" role="listbox" :aria-labelledby="`${uid}-label`">
        <button
          v-for="cat in targets"
          :key="cat.id"
          type="button"
          class="category-option"
          :class="{ active: selectedCategoryId === cat.id }"
          role="option"
          :aria-selected="selectedCategoryId === cat.id"
          @click="selectCategory(cat.id)"
        >
          <span class="category-option-icon">{{ cat.icon }}</span>
          <span class="category-option-name">{{ cat.name }}</span>
          <span class="category-option-count">{{ cat.sites.length }}</span>
        </button>
      </div>
    </div>

    <div class="form-group">
      <span class="form-label" :id="`${uid}-group-label`">目标分组 *</span>
      <div class="group-list" role="listbox" :aria-labelledby="`${uid}-group-label`">
        <button
          v-for="group in selectedGroups"
          :key="group.id"
          type="button"
          class="category-option"
          :class="{ active: selectedGroupId === group.id }"
          role="option"
          :aria-selected="selectedGroupId === group.id"
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
  align-items: baseline;
  gap: 8px;
  padding: 14px;
  margin-bottom: 16px;
  border: 1px solid var(--border);
  background: var(--accent-light);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
}

.bulk-preview strong {
  color: var(--accent);
  font-family: 'DM Mono', ui-monospace, monospace;
  font-size: 24px;
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

.category-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 280px;
  overflow-y: auto;
}

.category-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 14px;
  transition: border-color 0.15s, background 0.15s;
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
  border-radius: 8px;
}

.category-option.active .category-option-count {
  background: var(--accent);
  color: #fff;
}

@media (prefers-reduced-motion: reduce) {
  .category-option {
    transition: none;
  }
}
</style>
