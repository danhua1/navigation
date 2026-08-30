import { ref } from 'vue'

/**
 * 全局单例确认弹窗。替代 window.confirm，支持任意数量的选项，
 * 因此「追加 / 覆盖 / 取消」这类三选一不必再挤进一个布尔值里。
 */
const dialog = ref(null)
let resolver = null

/**
 * @param {object} options
 * @param {string} options.title
 * @param {string} [options.message]
 * @param {Array<{ label: string, value: any, variant?: 'primary'|'danger'|'ghost' }>} [options.choices]
 * @returns {Promise<any>} 选中项的 value；关闭或取消时为 null
 */
export function askDialog({ title, message = '', choices }) {
  // 上一个弹窗还挂着时先结掉，避免 Promise 永远悬空
  if (resolver) resolver(null)

  dialog.value = {
    title,
    message,
    choices: choices?.length
      ? choices
      : [
          { label: '取消', value: null, variant: 'ghost' },
          { label: '确定', value: true, variant: 'primary' }
        ]
  }

  return new Promise(resolve => {
    resolver = resolve
  })
}

export function resolveDialog(value) {
  dialog.value = null
  const done = resolver
  resolver = null
  if (done) done(value)
}

/** 危险操作的快捷入口，确认按钮为红色 */
export function askConfirmDanger({ title, message = '', confirmLabel = '删除' }) {
  return askDialog({
    title,
    message,
    choices: [
      { label: '取消', value: null, variant: 'ghost' },
      { label: confirmLabel, value: true, variant: 'danger' }
    ]
  })
}

export function useDialog() {
  return { dialog, ask: askDialog, askDanger: askConfirmDanger, resolve: resolveDialog }
}
