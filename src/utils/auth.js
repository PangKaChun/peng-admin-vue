import Cookies from 'js-cookie'

const AccessTokenKey = 'Access-Token'
const RefreshTokenKey = 'Refresh-Token'

export function getToken () {
  return Cookies.get(AccessTokenKey)
}

export function setToken (token) {
  return Cookies.set(AccessTokenKey, token)
}

export function removeToken () {
  return Cookies.remove(AccessTokenKey)
}

export function getRefreshToken () {
  return Cookies.get(RefreshTokenKey)
}

export function setRefreshToken (token) {
  return Cookies.set(RefreshTokenKey, token)
}

export function removeRefreshToken () {
  return Cookies.remove(RefreshTokenKey)
}
