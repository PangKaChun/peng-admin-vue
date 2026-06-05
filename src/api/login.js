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

// 两步登录第一步:校验账号密码 + 图形验证码,返回 {mfaRequired, ticket}
export function precheck(username, password, randomCode, captcha) {
  password = encrypt(password)
  return request({
    url: authAPI + "/login/precheck",
    method: "post",
    headers: { isToken: false },
    data: { username, password, randomCode, captcha }
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

//登录
export function login(username, password, randomCode, captcha, mfaCode) {
  password = encrypt(password)
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
