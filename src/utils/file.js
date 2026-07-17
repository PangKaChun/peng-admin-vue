/**
 * 文件大小格式化
 * @param {Number} size 字节数
 * @returns {String} 人类可读大小,如 1.25 MB
 */
export function formatFileSize(size) {
  if (size === null || size === undefined) {
    return ''
  }
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let value = size
  let index = 0
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024
    index++
  }
  return value.toFixed(index === 0 ? 0 : 2) + ' ' + units[index]
}
