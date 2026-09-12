import { ref } from 'vue'

// 全局单例：轻提示替代 alert，不阻塞交互
const toasts = ref([])
let seq = 0

export function pushToast(message, type = 'info', duration = 3200) {
  const id = ++seq
  toasts.value.push({ id, message, type })
  if (duration > 0) {
    setTimeout(() => dismissToast(id), duration)
  }
  return id
}

export function dismissToast(id) {
  const idx = toasts.value.findIndex(t => t.id === id)
  if (idx !== -1) toasts.value.splice(idx, 1)
}

export function useToast() {
  return {
    toasts,
    push: pushToast,
    dismiss: dismissToast,
    success: msg => pushToast(msg, 'success'),
    error: msg => pushToast(msg, 'error', 5000)
  }
}
