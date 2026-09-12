<template>
  <BaseModal :title="group ? '编辑分组' : '新建分组'" @close="emit('close')">
    <form :id="formId" @submit.prevent="save">
      <div class="form-group">
        <label class="form-label" :for="`${uid}-name`">分组名称 *</label>
        <input
          :id="`${uid}-name`"
          v-model="name"
          class="form-input"
          :class="{ 'has-error': error }"
          maxlength="48"
          placeholder="如：待检查"
          autocomplete="off"
          :aria-invalid="Boolean(error)"
        />
        <p v-if="error" class="form-error">{{ error }}</p>
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

const props = defineProps({ group: { type: Object, default: null } })
const emit = defineEmits(['close', 'save'])
const uid = `group-${Math.random().toString(36).slice(2, 8)}`
const formId = `${uid}-form`
const name = ref('')
const error = ref('')

watch(() => props.group, value => {
  name.value = value?.name || ''
  error.value = ''
}, { immediate: true })

function save() {
  const value = name.value.trim()
  if (!value) {
    error.value = '请输入分组名称'
    return
  }
  emit('save', { id: props.group?.id || null, name: value })
}
</script>
