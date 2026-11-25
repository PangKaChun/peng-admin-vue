const WATERMARK_ID = 'app-watermark'

function renderWatermark(content, content2) {
  const existing = document.getElementById(WATERMARK_ID)
  if (existing) {
    existing.remove()
  }

  const canvas = document.createElement('canvas')
  canvas.width = 220
  canvas.height = 140

  const ctx = canvas.getContext('2d')
  ctx.rotate((-20 * Math.PI) / 180)
  ctx.font = '12px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif'
  ctx.fillStyle = 'rgba(0, 0, 0, 0.045)'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(content || '', canvas.width / 4, canvas.height / 2)
  ctx.fillText(content2 || '', canvas.width / 4, canvas.height / 2 + 18)

  const div = document.createElement('div')
  div.id = WATERMARK_ID
  div.style.cssText = [
    'pointer-events:none',
    'position:fixed',
    'top:0',
    'right:0',
    'bottom:0',
    'left:0',
    'z-index:100000',
    `background:url(${canvas.toDataURL('image/png')}) left top repeat`
  ].join(';')
  document.body.appendChild(div)
}

export default {
  set(content, content2) {
    this.clear()
    renderWatermark(content, content2)
  },
  clear() {
    const existing = document.getElementById(WATERMARK_ID)
    if (existing) {
      existing.remove()
    }
  }
}
