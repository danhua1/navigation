<template>
  <BaseModal :title="category ? '编辑分类' : '添加分类'" @close="emit('close')">
    <form :id="formId" @submit.prevent="handleSave">
      <div class="form-group">
        <label class="form-label" :for="`${uid}-name`">分类名称 *</label>
        <input
          :id="`${uid}-name`"
          v-model="form.name"
          class="form-input"
          :class="{ 'has-error': errors.name }"
          placeholder="如：常用工具"
          autocomplete="off"
          :aria-invalid="Boolean(errors.name)"
          :aria-describedby="errors.name ? `${uid}-name-error` : null"
        />
        <p v-if="errors.name" :id="`${uid}-name-error`" class="form-error">{{ errors.name }}</p>
      </div>

      <div class="form-group">
        <label class="form-label" :for="`${uid}-icon`">图标（Emoji）</label>
        <div class="icon-picker">
          <input
            :id="`${uid}-icon`"
            v-model="form.icon"
            class="form-input icon-input"
            placeholder="📁"
            maxlength="8"
          />
          <div class="icon-suggestions" role="group" aria-label="常用图标">
            <button
              v-for="emoji in emojiList"
              :key="emoji"
              type="button"
              class="emoji-btn"
              :class="{ active: form.icon === emoji }"
              :aria-pressed="form.icon === emoji"
              :title="emoji"
              @click="form.icon = emoji"
            >
              {{ emoji }}
            </button>
          </div>
        </div>
      </div>
    </form>

    <template #footer>
      <button type="button" class="btn btn-ghost" @click="emit('close')">取消</button>
      <button type="submit" :form="formId" class="btn btn-primary">保存</button>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref, watch } from 'vue'
import BaseModal from './BaseModal.vue'

const props = defineProps({
  category: { type: Object, default: null }
})

const emit = defineEmits(['close', 'save'])

const uid = `cat-form-${Math.random().toString(36).slice(2, 8)}`
const formId = `${uid}-el`

// 常用 Emoji 建议
const emojiList = [
  '🔧', '🤖', '🎨', '📖', '💻', '🎮', '🎵', '📺',
  '📰', '🛒', '💰', '🏥', '✈️', '🏠', '📷', '🍔',
  '📚', '⚽', '🎬', '💡', '🚀', '🌐', '📱', '☁️'
]

const form = ref({ id: null, name: '', icon: '📁' })
const errors = ref({})

watch(
  () => props.category,
  newCat => {
    errors.value = {}
    form.value = newCat
      ? { id: newCat.id, name: newCat.name || '', icon: newCat.icon || '📁' }
      : { id: null, name: '', icon: '📁' }
  },
  { immediate: true }
)

function handleSave() {
  const name = form.value.name.trim()
  if (!name) {
    errors.value = { name: '请输入分类名称' }
    return
  }
  errors.value = {}
  emit('save', {
    id: form.value.id,
    name,
    icon: form.value.icon.trim() || '📁'
  })
}
</script>

<style scoped>
.icon-picker {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.icon-input {
  width: 80px;
  text-align: center;
  font-size: 20px;
}

.icon-suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.emoji-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  transition: border-color 0.15s, background 0.15s;
}

.emoji-btn:hover {
  border-color: var(--accent);
}

.emoji-btn.active {
  border-color: var(--accent);
  background: var(--accent-light);
}

@media (prefers-reduced-motion: reduce) {
  .emoji-btn {
    transition: none;
  }
}
</style>
