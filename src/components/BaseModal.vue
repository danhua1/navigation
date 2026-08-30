<template>
  <div class="modal-overlay" @mousedown.self="$emit('close')">
    <div
      ref="panel"
      class="modal"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      @keydown="handleKeydown"
    >
      <div class="modal-header">
        <h2 :id="titleId" class="modal-title">{{ title }}</h2>
        <button class="close-btn" type="button" aria-label="关闭" @click="$emit('close')">✕</button>
      </div>
      <div class="modal-body">
        <slot />
      </div>
      <div class="modal-footer">
        <slot name="footer" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'

defineProps({
  title: { type: String, required: true }
})

const emit = defineEmits(['close'])

const panel = ref(null)
const titleId = `modal-title-${Math.random().toString(36).slice(2, 8)}`

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function focusable() {
  if (!panel.value) return []
  return Array.from(panel.value.querySelectorAll(FOCUSABLE)).filter(
    el => el.offsetParent !== null || el === document.activeElement
  )
}

function handleKeydown(e) {
  if (e.key === 'Escape') {
    e.stopPropagation()
    emit('close')
    return
  }
  if (e.key !== 'Tab') return

  // 焦点陷阱：Tab 在弹窗内循环，不跑到背后的页面上
  const items = focusable()
  if (items.length === 0) {
    e.preventDefault()
    return
  }
  const first = items[0]
  const last = items[items.length - 1]
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault()
    first.focus()
  }
}

let previouslyFocused = null
let restoreOverflow = ''

onMounted(() => {
  previouslyFocused = document.activeElement
  restoreOverflow = document.body.style.overflow
  // 锁定背景滚动
  document.body.style.overflow = 'hidden'

  // 优先聚焦第一个输入框，否则退回面板本身，保证 ESC 能被接住
  const items = focusable()
  const firstField = items.find(el => /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName))
  ;(firstField || items[0] || panel.value)?.focus()
})

onBeforeUnmount(() => {
  document.body.style.overflow = restoreOverflow
  previouslyFocused?.focus?.()
})
</script>

<style scoped>
.modal {
  outline: none;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  font-size: 18px;
  color: var(--text-muted);
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  line-height: 1;
}

.close-btn:hover {
  background: var(--bg-tertiary);
}
</style>
