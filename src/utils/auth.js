import Cookies from 'js-cookie'

// Access Token 只放内存；Refresh Token 由服务端以 HttpOnly Cookie 下发，前端不可见
let accessToken = ''

// 令牌不得以脚本可读的 Cookie 留存
Cookies.remove('Access-Token')
Cookies.remove('Refresh-Token')

export function getToken () {
  return accessToken
}

export function setToken (token) {
  accessToken = token || ''
}

export function removeToken () {
  accessToken = ''
}
