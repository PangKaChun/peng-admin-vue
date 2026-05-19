import request from "@/utils/request";
import { encrypt } from '@/utils/jsencrypt.js'

const authAPI = '/api-auth'

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
