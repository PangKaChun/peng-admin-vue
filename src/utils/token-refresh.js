import { refreshToken } from '@/api/login'
import { getToken, setToken } from '@/utils/auth'

const LOCK_NAME = 'peng-token-refresh'
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('peng-auth') : null
let pending = null

if (channel) {
  channel.onmessage = ({ data }) => {
    if (data.type === 'token') {
      setToken(data.token)
    } else if (data.type === 'logout') {
      // 其他标签页已注销：重新加载后静默续期失败，自然回到登录页
      location.reload()
    }
  }
}

function withLock(task) {
  return navigator.locks && navigator.locks.request
    ? navigator.locks.request(LOCK_NAME, task)
    : task()
}

/**
 * 用 HttpOnly Cookie 中的 refresh_token 换新 access_token
 * 本页并发合并为一次请求，多标签页经 Web Locks 串行，排队期间其他标签页已刷新则直接复用
 * @param {string} staleToken 触发刷新时持有的旧令牌
 */
export function refreshAccessToken(staleToken = getToken()) {
  if (!pending) {
    pending = withLock(async () => {
      const current = getToken()
      if (current && current !== staleToken) {
        return current
      }
      const res = await refreshToken()
      const token = res && res.data && res.data.access_token
      if (!token) {
        throw new Error('刷新令牌缺少 access_token')
      }
      setToken(token)
      if (channel) {
        channel.postMessage({ type: 'token', token })
      }
      return token
    }).finally(() => {
      pending = null
    })
  }
  return pending
}

export function broadcastLogout() {
  if (channel) {
    channel.postMessage({ type: 'logout' })
  }
}
