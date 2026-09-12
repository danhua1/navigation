<template>
  <div class="site-card" draggable="true" @dragstart="startDrag" @dragend="dragging = false" :class="{ dragging, selected }">
    <label
      class="selection-toggle"
      @click.stop
    >
      <input
        type="checkbox"
        :checked="selected"
        :aria-label="selected ? `取消选择 ${site.name}` : `选择 ${site.name}`"
        @change="$emit('toggle-selection', site.id)"
      />
      <span class="selection-check" aria-hidden="true"></span>
    </label>
    <div class="site-icon" :style="{ background: iconBg }" aria-hidden="true">
      <!-- 优先使用用户提供的安全内嵌图标；否则试读站点自身 favicon。 -->
      <img
        v-if="displayIconUrl && !faviconFailed"
        class="site-favicon"
        :src="displayIconUrl"
        alt=""
        loading="lazy"
        decoding="async"
        referrerpolicy="no-referrer"
        @error="faviconFailed = true"
      />
      <template v-else>{{ iconText }}</template>
    </div>
    <div class="site-info">
      <!-- 链接铺满整张卡片（见 .site-name::after），操作按钮通过 z-index 浮在其上 -->
      <a
        class="site-name"
        :href="site.url"
        target="_blank"
        rel="noopener noreferrer"
        :title="site.name"
      >{{ site.name }}</a>
      <div class="site-desc" :title="subtitle">{{ subtitle }}</div>
    </div>
    <div class="card-actions">
      <button
        class="card-action-btn"
        type="button"
        :aria-label="`移动 ${site.name} 到其他分类`"
        title="移动到其他分类"
        @click="$emit('move', site)"
      >移动</button>
      <button
        class="card-action-btn"
        type="button"
        :aria-label="`编辑 ${site.name}`"
        title="编辑"
        @click="$emit('edit', site)"
      >编辑</button>
      <button
        class="card-action-btn"
        type="button"
        :aria-label="`删除 ${site.name}`"
        title="删除"
        @click="$emit('delete', site.id)"
      >删除</button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { urlHostname } from '../utils/url.js'

const props = defineProps({
  site: { type: Object, required: true },
  selected: { type: Boolean, default: false }
})

const emit = defineEmits(['edit', 'delete', 'move', 'dragstart', 'toggle-selection'])
const dragging = ref(false)

function startDrag(event) {
  dragging.value = true
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', props.site.id)
  emit('dragstart', props.site)
}

const isEmbeddedImage = computed(() => /^data:image\/(?:png|jpeg|gif|webp);base64,/i.test(props.site.icon || ''))
const iconText = computed(() => {
  if (isEmbeddedImage.value) return props.site.name.charAt(0).toUpperCase() || '🔗'
  return props.site.icon || props.site.name.charAt(0).toUpperCase() || '🔗'
})

const faviconFailed = ref(false)

// 只读站点自身的 /favicon.ico，不经过第三方图标服务，
// 避免把用户的收藏域名泄露给别的服务器
const faviconUrl = computed(() => {
  if (props.site.icon) return ''
  try {
    return new URL('/favicon.ico', props.site.url).href
  } catch {
    return ''
  }
})

const displayIconUrl = computed(() => isEmbeddedImage.value ? props.site.icon : faviconUrl.value)

// 换站点时重置失败标记，否则复用的组件实例会一直显示首字母
watch(displayIconUrl, () => {
  faviconFailed.value = false
})

const subtitle = computed(
  () => props.site.description || urlHostname(props.site.url) || props.site.url
)

// 根据站点名称生成稳定的背景色
const iconBg = computed(() => {
  const colors = [
    '#4f6df5', '#10b981', '#f59e0b', '#ef4444',
    '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'
  ]
  let hash = 0
  for (const ch of props.site.name) {
    hash = ch.charCodeAt(0) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
})
</script>

<style scoped>
.site-card {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 11px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 5px;
  transition: border-color 0.18s ease, background 0.18s ease, transform 0.18s ease;
  position: relative;
}

.site-card:hover,
.site-card:focus-within {
  border-color: color-mix(in srgb, var(--accent) 65%, var(--border));
  background: color-mix(in srgb, var(--accent-light) 32%, var(--bg-secondary));
  transform: translateX(2px);
}

.site-card.dragging {
  opacity: 0.45;
}

.site-card.selected {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent-light) 48%, var(--bg-secondary));
}

.site-card.selected .selection-toggle {
  opacity: 1;
  visibility: visible;
}

.selection-toggle {
  position: absolute;
  left: -10px;
  top: -10px;
  z-index: 2;
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  padding: 3px;
  border-radius: 50%;
  background: var(--bg-secondary);
  box-shadow: 0 2px 6px color-mix(in srgb, var(--text-primary) 18%, transparent);
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.15s ease;
}

.selection-toggle input {
  position: absolute;
  opacity: 0;
}

.selection-check {
  width: 17px;
  height: 17px;
  display: grid;
  place-items: center;
  border: 1.5px solid var(--text-muted);
  border-radius: 50%;
  background: var(--bg-secondary);
  transition: background 0.15s ease, border-color 0.15s ease;
}

.selection-check::after {
  content: '';
  width: 7px;
  height: 4px;
  border-bottom: 2px solid var(--on-accent, #fff);
  border-left: 2px solid var(--on-accent, #fff);
  opacity: 0;
  transform: rotate(-45deg) translate(1px, -1px);
}

.selection-toggle input:checked + .selection-check {
  border-color: var(--accent);
  background: var(--accent);
  opacity: 1;
  visibility: visible;
}

.selection-toggle input:checked + .selection-check::after { opacity: 1; }

.selection-toggle input:focus-visible + .selection-check {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.site-icon {
  width: 44px;
  height: 44px;
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 17px;
  color: #fff;
  font-weight: 600;
  flex-shrink: 0;
  overflow: hidden;
}

.site-favicon {
  width: 25px;
  height: 25px;
  /* 图标底色可能与站点 favicon 撞色，留白衬底更清晰 */
  border-radius: 4px;
  background: #fff;
  object-fit: contain;
}

.site-info {
  flex: 1;
  min-width: 0;
}

.site-name {
  display: block;
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 把点击区域扩展到整张卡片，同时保持 <a> 是唯一的链接元素 */
.site-name::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: var(--radius);
}

.site-name:focus-visible::after {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.site-desc {
  font-size: 11px;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-top: 3px;
}

.card-actions {
  display: flex;
  gap: 2px;
  position: absolute;
  top: 7px;
  right: 7px;
  background: var(--bg-secondary);
  padding: 2px;
  border-radius: 4px;
  border: 1px solid var(--border);
  box-shadow: var(--shadow-lg);
  /* 浮在铺满卡片的链接之上 */
  z-index: 1;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.15s;
}

/* 键盘聚焦时也要出现，否则按钮对键盘用户不可达 */
.site-card:hover .card-actions,
.card-actions:focus-within {
  opacity: 1;
  visibility: visible;
}

.site-card:hover .selection-toggle,
.selection-toggle:focus-visible {
  opacity: 1;
  visibility: visible;
}

/* 触屏没有 hover，直接常显 */
@media (hover: none) {
  .card-actions {
    opacity: 1;
    visibility: visible;
  }

  .selection-toggle {
    opacity: 1;
    visibility: visible;
  }
}

.card-action-btn {
  background: none;
  border: none;
  min-width: 38px;
  min-height: 32px;
  padding: 5px 7px;
  font-size: 11px;
  border-radius: 3px;
  opacity: 0.75;
}

.card-action-btn:hover,
.card-action-btn:focus-visible {
  opacity: 1;
  background: var(--bg-tertiary);
}

@media (prefers-reduced-motion: reduce) {
  .site-card {
    transition: none;
  }

  .site-card:hover,
  .site-card:focus-within {
    transform: none;
  }
}
</style>
