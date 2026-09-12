<template>
  <BaseModal v-if="dialog" :title="dialog.title" @close="resolve(null)">
    <p v-if="dialog.message" class="dialog-message">{{ dialog.message }}</p>

    <template #footer>
      <button
        v-for="choice in dialog.choices"
        :key="choice.label"
        type="button"
        class="btn"
        :class="`btn-${choice.variant || 'ghost'}`"
        @click="resolve(choice.value)"
      >
        {{ choice.label }}
      </button>
    </template>
  </BaseModal>
</template>

<script setup>
import BaseModal from './BaseModal.vue'
import { useDialog } from '../composables/useDialog.js'

const { dialog, resolve } = useDialog()
</script>

<style scoped>
.dialog-message {
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-secondary);
  /* 多行提示里的换行需要保留 */
  white-space: pre-line;
  margin: 0;
}
</style>
