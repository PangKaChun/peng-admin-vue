import request from "@/utils/request";
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

// 口令策略,返回 {minLength, maxLength, minCharTypes, expireDays}
export function getPasswordPolicy() {
  return request({
    url: authAPI + "/login/password-policy",
    method: "get",
    headers: { isToken: false }
  });
}

// 登录页人机验证方式(参数管理 sys.login.captchaType),返回 {captchaType}:image 图形验证码 / slider 滑块
export function getCaptchaType() {
  return request({
    url: authAPI + "/login/captcha-type",
    method: "get",
    headers: { isToken: false }
  });
}

// 滑块验证:领取挑战令牌,返回 {token, difficulty}(工作量证明难度)
export function createSliderChallenge() {
  return request({
    url: authAPI + "/login/slider/challenge",
    method: "post",
    headers: { isToken: false, repeatSubmit: false }
  });
}

// 滑块验证:拖到终点后提交 {token, nonce},通过后 token 即为一次性登录凭证
export function verifySlider(data) {
  return request({
    url: authAPI + "/login/slider/verify",
    method: "post",
    headers: { isToken: false, repeatSubmit: false },
    data
  });
}

// 两步登录第一步:校验账号密码 + 人机验证(图形验证码或滑块凭证,后端按参数管理只认其一),返回 {mfaRequired, mfaBindRequired, pwdChangeRequired, ticket}
export async function precheck(username, password, randomCode, captcha, sliderToken) {
  password = await encrypt(password)
  return request({
    url: authAPI + "/login/precheck",
    method: "post",
    headers: { isToken: false },
    data: { username, password, randomCode, captcha, sliderToken }
  });
}

// 强制绑定:生成动态口令密钥,返回 {secret, otpauthUri}
export function bindMfaForLogin(ticket) {
  return request({
    url: authAPI + "/login/mfa/bind",
    method: "post",
    headers: { isToken: false },
    data: { ticket }
  });
}

// 两步登录第二步:校验 Google Authenticator 动态口令
export function verifyMfa(ticket, code) {
  return request({
    url: authAPI + "/login/mfa/verify",
    method: "post",
    headers: { isToken: false },
    data: { ticket, code }
  });
}

// 初始密码 / 被重置 / 已过期:登录前修改密码
export async function changePwdForLogin(ticket, password) {
  password = await encrypt(password)
  return request({
    url: authAPI + "/login/pwd/change",
    method: "post",
    headers: { isToken: false },
    data: { ticket, password }
  });
}

//登录
export async function login(username, password, randomCode, captcha, mfaCode) {
  password = await encrypt(password)
  return request({
    auth: {
      username: process.env.VUE_APP_OAUTH_CLIENT_ID,
      password: process.env.VUE_APP_OAUTH_CLIENT_SECRET
    },
    url: authAPI + "/oauth2/token",
    method: "post",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    data: { grant_type: 'password', scope: 'openid', username, password, randomCode, captcha, mfaCode },
  });
}

//刷新token
export function refreshToken(refreshToken) {
  return request({
    url: authAPI + "/oauth2/token",
    method: "post",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      isToken: false,
    },
    data: { client_id: process.env.VUE_APP_OAUTH_CLIENT_ID, grant_type: 'refresh_token', refresh_token: refreshToken },
  });
}

// 获取用户详细信息
export function getInfo() {
  return request({
    url: authAPI + "/userinfo",
    method: "get",
  });
}

//退出登录
export function logout() {
  return request({
    url: authAPI + "/logout?redirect_url=localhost",
    method: "get",
  });
}

// PKCE：authorization_code + code_verifier 换 access_token / refresh_token
export function exchangeCodeForToken({ code, codeVerifier }) {
  return request({
    url: authAPI + "/oauth2/token",
    method: "post",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      isToken: false
    },
    data: {
      client_id: process.env.VUE_APP_OAUTH_CLIENT_ID,
      grant_type: 'authorization_code',
      redirect_uri: buildRedirectUri(),
      code,
      code_verifier: codeVerifier
    }
  });
}
