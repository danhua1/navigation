<template>
  <BaseModal title="移动到其他分类" @close="emit('close')">
    <div class="site-preview">
      <span class="site-preview-icon">{{ site.icon || site.name.charAt(0).toUpperCase() }}</span>
      <div class="site-preview-text">
        <div class="site-preview-name">{{ site.name }}</div>
        <div class="site-preview-url">{{ site.url }}</div>
      </div>
    </div>

    <div class="form-group">
      <span class="form-label">当前分类</span>
      <div class="current-category">{{ fromCategoryName }}</div>
    </div>

    <div class="form-group">
      <span class="form-label" :id="`${uid}-label`">移动到 *</span>
      <p v-if="targets.length === 0" class="form-error">
        没有其他分类可供移动，请先创建一个新分类。
      </p>
      <div v-else class="category-list" role="listbox" :aria-labelledby="`${uid}-label`">
        <button
          v-for="cat in targets"
          :key="cat.id"
          type="button"
          class="category-option"
          :class="{ active: selectedCategoryId === cat.id }"
          role="option"
          :aria-selected="selectedCategoryId === cat.id"
          @click="selectedCategoryId = cat.id"
          @dblclick="handleMove"
        >
          <span class="category-option-icon">{{ cat.icon }}</span>
          <span class="category-option-name">{{ cat.name }}</span>
          <span class="category-option-count">{{ cat.sites.length }}</span>
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
  site: { type: Object, required: true },
  fromCategoryId: { type: String, required: true },
  categories: { type: Array, required: true }
})

const emit = defineEmits(['close', 'move'])

const uid = `move-${Math.random().toString(36).slice(2, 8)}`
const selectedCategoryId = ref('')

// 源分类不作为候选项出现，避免出现一整排禁用按钮
const targets = computed(() => props.categories.filter(c => c.id !== props.fromCategoryId))

const fromCategoryName = computed(() => {
  const cat = props.categories.find(c => c.id === props.fromCategoryId)
  return cat ? `${cat.icon} ${cat.name}` : '未知分类'
})

const canMove = computed(
  () => Boolean(selectedCategoryId.value) && selectedCategoryId.value !== props.fromCategoryId
)

function handleMove() {
  if (!canMove.value) return
  emit('move', { targetCategoryId: selectedCategoryId.value })
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
