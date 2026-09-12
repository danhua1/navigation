<template>
  <BaseModal :title="site ? '编辑网站' : '添加网站'" @close="emit('close')">
    <p v-if="categories.length === 0" class="form-error">
      还没有任何分类，请先创建一个分类。
    </p>

    <form v-else :id="formId" @submit.prevent="handleSave">
      <div class="form-group">
        <label class="form-label" :for="`${uid}-name`">网站名称 *</label>
        <input
          :id="`${uid}-name`"
          v-model="form.name"
          class="form-input"
          :class="{ 'has-error': errors.name }"
          placeholder="如：Google"
          autocomplete="off"
          :aria-invalid="Boolean(errors.name)"
          :aria-describedby="errors.name ? `${uid}-name-error` : null"
        />
        <p v-if="errors.name" :id="`${uid}-name-error`" class="form-error">{{ errors.name }}</p>
      </div>

      <div class="form-group">
        <label class="form-label" :for="`${uid}-url`">网址 *</label>
        <input
          :id="`${uid}-url`"
          v-model="form.url"
          class="form-input"
          :class="{ 'has-error': errors.url }"
          placeholder="https://..."
          inputmode="url"
          autocomplete="off"
          :aria-invalid="Boolean(errors.url)"
          :aria-describedby="errors.url ? `${uid}-url-error` : null"
        />
        <p v-if="errors.url" :id="`${uid}-url-error`" class="form-error">{{ errors.url }}</p>
      </div>

      <div class="form-group">
        <label class="form-label" :for="`${uid}-desc`">描述</label>
        <input
          :id="`${uid}-desc`"
          v-model="form.description"
          class="form-input"
          placeholder="简短描述"
          autocomplete="off"
        />
      </div>

      <div class="form-group">
        <label class="form-label" :for="`${uid}-icon`">图标</label>
        <input
          :id="`${uid}-icon`"
          v-model="form.icon"
          class="form-input icon-input"
          placeholder="🔍"
          maxlength="8"
        />
        <p class="form-hint">留空则自动读取网站图标，读取失败时用首字母</p>
      </div>

      <div class="form-group">
        <label class="form-label" :for="`${uid}-cat`">所属分类 *</label>
        <select
          :id="`${uid}-cat`"
          v-model="form.categoryId"
          class="form-select"
          :class="{ 'has-error': errors.categoryId }"
        >
          <option v-for="cat in categories" :key="cat.id" :value="cat.id">
            {{ cat.icon }} {{ cat.name }}
          </option>
        </select>
        <p v-if="errors.categoryId" class="form-error">{{ errors.categoryId }}</p>
      </div>

      <div class="form-group">
        <label class="form-label" :for="`${uid}-group`">所属分组 *</label>
        <select :id="`${uid}-group`" v-model="form.groupId" class="form-select" :class="{ 'has-error': errors.groupId }">
          <option v-for="group in selectedGroups" :key="group.id" :value="group.id">{{ group.name }}</option>
        </select>
        <p v-if="errors.groupId" class="form-error">{{ errors.groupId }}</p>
      </div>
    </form>

    <template #footer>
      <button type="button" class="btn btn-ghost" @click="emit('close')">取消</button>
      <button
        type="submit"
        :form="formId"
        class="btn btn-primary"
        :disabled="categories.length === 0"
      >
        保存
      </button>
    </template>
  </BaseModal>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import BaseModal from './BaseModal.vue'
import { normalizeUrl } from '../utils/url.js'

const props = defineProps({
  site: { type: Object, default: null },
  categories: { type: Array, required: true },
  // 新增时是目标分类；编辑时是该站点当前所属分类
  defaultCategoryId: { type: String, default: null },
  defaultGroupId: { type: String, default: null }
})

const emit = defineEmits(['close', 'save'])

const uid = `site-form-${Math.random().toString(36).slice(2, 8)}`
const formId = `${uid}-el`

const form = ref(emptyForm())
const errors = ref({})

function emptyForm() {
  return { id: null, name: '', url: '', description: '', icon: '', categoryId: '', groupId: '' }
}

const selectedGroups = computed(() =>
  props.categories.find(category => category.id === form.value.categoryId)?.groups || []
)

function fallbackGroupId(categoryId = form.value.categoryId) {
  const groups = props.categories.find(category => category.id === categoryId)?.groups || []
  const wanted = props.defaultGroupId
  if (wanted && groups.some(group => group.id === wanted)) return wanted
  return groups[0]?.id || ''
}

watch(() => form.value.categoryId, categoryId => {
  if (!selectedGroups.value.some(group => group.id === form.value.groupId)) {
    form.value.groupId = fallbackGroupId(categoryId)
  }
})

function fallbackCategoryId() {
  const wanted = props.defaultCategoryId
  if (wanted && props.categories.some(c => c.id === wanted)) return wanted
  return props.categories[0]?.id || ''
}

watch(
  () => props.site,
  newSite => {
    errors.value = {}
    if (newSite) {
      form.value = {
        id: newSite.id,
        name: newSite.name || '',
        url: newSite.url || '',
        description: newSite.description || '',
        icon: newSite.icon || '',
        // 分类归属由外部传入，不再依赖站点对象上的历史字段
        categoryId: fallbackCategoryId(),
        groupId: newSite.groupId || fallbackGroupId(fallbackCategoryId())
      }
    } else {
      const categoryId = fallbackCategoryId()
      form.value = { ...emptyForm(), categoryId, groupId: fallbackGroupId(categoryId) }
    }
  },
  { immediate: true }
)

function handleSave() {
  const next = {}
  const name = form.value.name.trim()
  if (!name) next.name = '请输入网站名称'

  const rawUrl = form.value.url.trim()
  const url = normalizeUrl(rawUrl)
  if (!rawUrl) {
    next.url = '请输入网址'
  } else if (!url) {
    next.url = '网址无效，仅支持 http:// 或 https:// 地址'
  }

  const categoryId = form.value.categoryId
  if (!categoryId || !props.categories.some(c => c.id === categoryId)) {
    next.categoryId = '请选择分类'
  }
  const groupId = form.value.groupId
  if (!groupId || !selectedGroups.value.some(group => group.id === groupId)) {
    next.groupId = '请选择分组'
  }

  errors.value = next
  if (Object.keys(next).length > 0) return

  emit('save', {
    // 只回传站点自身字段，categoryId 单独给出，不写进站点数据
    site: {
      id: form.value.id,
      name,
      url,
      description: form.value.description.trim(),
      icon: form.value.icon.trim()
    },
    categoryId,
    groupId
  })
}
</script>

<style scoped>
.icon-input {
  width: 96px;
  text-align: center;
  font-size: 20px;
}
</style>
