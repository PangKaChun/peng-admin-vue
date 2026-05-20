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

//登录
export function login(username, password, randomCode, captcha) {
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
    data: { grant_type:'password',scope:'openid',username, password, randomCode, captcha },
  });
}

//刷新token
export function refreshToken(refreshToken) {
  return request({
    auth: {
      username: process.env.VUE_APP_OAUTH_CLIENT_ID,
      password: process.env.VUE_APP_OAUTH_CLIENT_SECRET
    },
    url: authAPI + "/oauth2/token",
    method: "post",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    data: { grant_type:'refresh_token', refresh_token:refreshToken },
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

// PKCE：用授权码 + code_verifier 换 access_token / refresh_token
// 必须带 Basic auth：SAS 0.4.1 对 client_authentication_methods=none 的公共客户端不下发 refresh_token，
// 此处用 client_secret_basic 走机密客户端认证，同时保留 PKCE 的 code_verifier 校验。
export function exchangeCodeForToken({ code, codeVerifier }) {
  return request({
    auth: {
      username: process.env.VUE_APP_OAUTH_CLIENT_ID,
      password: process.env.VUE_APP_OAUTH_CLIENT_SECRET
    },
    url: authAPI + "/oauth2/token",
    method: "post",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      isToken: false
    },
    data: {
      grant_type: 'authorization_code',
      redirect_uri: buildRedirectUri(),
      code,
      code_verifier: codeVerifier
    }
  });
}
