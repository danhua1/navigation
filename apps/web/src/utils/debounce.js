/**
 * 防抖包装。返回的函数带 flush（立刻执行挂起调用）和 cancel（丢弃挂起调用）。
 * flush 用于页面关闭前把未落盘的数据补写一次。
 */
export function debounce(fn, wait) {
  let timer = null
  let pendingArgs = null

  function wrapped(...args) {
    pendingArgs = args
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      const args = pendingArgs
      pendingArgs = null
      fn(...args)
    }, wait)
  }

  wrapped.flush = () => {
    if (!timer) return
    clearTimeout(timer)
    timer = null
    const args = pendingArgs
    pendingArgs = null
    fn(...args)
  }

  wrapped.cancel = () => {
    if (timer) clearTimeout(timer)
    timer = null
    pendingArgs = null
  }

  return wrapped
}
