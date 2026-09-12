<template>
  <div class="toast-host" role="status" aria-live="polite">
    <TransitionGroup name="toast">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="toast"
        :class="`toast-${toast.type}`"
        @click="dismiss(toast.id)"
      >
        <span class="toast-icon">{{ icons[toast.type] || 'ℹ️' }}</span>
        <span class="toast-message">{{ toast.message }}</span>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup>
import { useToast } from '../composables/useToast.js'

const { toasts, dismiss } = useToast()

const icons = {
  success: '✅',
  error: '⚠️',
  info: 'ℹ️'
}
</script>

<style scoped>
.toast-host {
  position: fixed;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2000;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: min(420px, calc(100vw - 32px));
  padding: 10px 16px;
  border-radius: var(--radius-sm);
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-lg);
  font-size: 14px;
  color: var(--text-primary);
  cursor: pointer;
  pointer-events: auto;
}

.toast-success {
  border-color: #10b981;
}

.toast-error {
  border-color: #ef4444;
}

.toast-icon {
  flex-shrink: 0;
}

.toast-message {
  word-break: break-word;
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

@media (prefers-reduced-motion: reduce) {
  .toast-enter-active,
  .toast-leave-active {
    transition: none;
  }
}
</style>
