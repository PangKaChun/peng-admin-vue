import request from '@/utils/request'
import authRequest from '@/utils/auth-request'
import { getToken } from '@/utils/auth'
import { encrypt } from '@/utils/jsencrypt.js'

const authAPI = '/api-auth'

// 构建 OAuth 回调地址
export function buildRedirectUri() {
  return window.location.origin + process.env.VUE_APP_OAUTH_REDIRECT_URI
}

// 构建授权请求地址
export function buildAuthorizeUrl() {
  return process.env.VUE_APP_BASE_API + authAPI + process.env.VUE_APP_OAUTH_AUTHORIZE_ENDPOINT
}

// 口令策略，返回 {minLength, maxLength, minCharTypes, expireDays}
export function getPasswordPolicy() {
  return request({
    url: authAPI + '/login/password-policy',
    method: 'get',
    headers: { isToken: false }
  })
}

// 登录页人机验证方式，返回 {captchaType}: image 图形验证码 / slider 滑块
export function getCaptchaType() {
  return request({
    url: authAPI + '/login/captcha-type',
    method: 'get',
    headers: { isToken: false }
  })
}

// 滑块验证：领取挑战令牌，返回 {token, difficulty}
export function createSliderChallenge() {
  return request({
    url: authAPI + '/login/slider/challenge',
    method: 'post',
    headers: { isToken: false, repeatSubmit: false }
  })
}

// 滑块验证：拖到终点后提交 {token, nonce}
export function verifySlider(data) {
  return request({
    url: authAPI + '/login/slider/verify',
    method: 'post',
    headers: { isToken: false, repeatSubmit: false },
    data
  })
}

// 两步登录第一步：校验账号密码 + 人机验证
export async function precheck(username, password, randomCode, captcha, sliderToken) {
  password = await encrypt(password)
  return request({
    url: authAPI + '/login/precheck',
    method: 'post',
    headers: { isToken: false },
    data: { username, password, randomCode, captcha, sliderToken }
  })
}

// 强制绑定：生成动态口令密钥
export function bindMfaForLogin(ticket) {
  return request({
    url: authAPI + '/login/mfa/bind',
    method: 'post',
    headers: { isToken: false },
    data: { ticket }
  })
}

// 两步登录第二步：校验 Google Authenticator 动态口令
export function verifyMfa(ticket, code) {
  return request({
    url: authAPI + '/login/mfa/verify',
    method: 'post',
    headers: { isToken: false },
    data: { ticket, code }
  })
}

// 初始密码 / 被重置 / 已过期：登录前修改密码
export async function changePwdForLogin(ticket, password) {
  password = await encrypt(password)
  return request({
    url: authAPI + '/login/pwd/change',
    method: 'post',
    headers: { isToken: false },
    data: { ticket, password }
  })
}

// 刷新 token，浏览器自动通过 HttpOnly Cookie 携带 refresh_token
export function refreshToken() {
  return authRequest({
    url: authAPI + '/oauth2/token',
    method: 'post',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    data: {
      client_id: process.env.VUE_APP_OAUTH_CLIENT_ID,
      grant_type: 'refresh_token'
    }
  })
}

// 获取用户详细信息
export function getInfo() {
  return request({
    url: authAPI + '/userinfo',
    method: 'get'
  })
}

// 退出登录
export function logout() {
  const token = getToken()
  return authRequest({
    url: authAPI + '/logout?redirect_url=localhost',
    method: 'post',
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  })
}

// PKCE：authorization_code + code_verifier 换 access_token / refresh_token
export function exchangeCodeForToken({ code, codeVerifier }) {
  return authRequest({
    url: authAPI + '/oauth2/token',
    method: 'post',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    data: {
      client_id: process.env.VUE_APP_OAUTH_CLIENT_ID,
      grant_type: 'authorization_code',
      redirect_uri: buildRedirectUri(),
      code,
      code_verifier: codeVerifier
    }
  })
}
