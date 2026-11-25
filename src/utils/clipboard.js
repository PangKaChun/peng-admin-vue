/**
 * 复制文本到剪贴板（安全上下文优先 Clipboard API，降级 textarea）
 * @param {string} text
 * @returns {Promise<void>}
 */
export function copyText(text) {
  const value = text == null ? '' : String(text)
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(value).catch(() => legacyCopy(value))
  }
  return legacyCopy(value)
}

function legacyCopy(text) {
  return new Promise((resolve, reject) => {
    const active = document.activeElement
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.top = '0'
    ta.style.left = '0'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    ta.setSelectionRange(0, text.length)
    try {
      const ok = document.execCommand('copy')
      ok ? resolve() : reject(new Error('copy failed'))
    } catch (e) {
      reject(e)
    } finally {
      document.body.removeChild(ta)
      if (active && typeof active.focus === 'function') {
        active.focus()
      }
    }
  })
}
