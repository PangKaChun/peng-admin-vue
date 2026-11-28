import axios from 'axios'

const authRequest = axios.create({
  baseURL: process.env.VUE_APP_BASE_API,
  timeout: 10000,
  // 刷新、注销端点凭 HttpOnly Cookie 鉴权，服务端以此请求头做 CSRF 校验
  headers: {
    'X-Requested-With': 'XMLHttpRequest'
  }
})

authRequest.interceptors.response.use(res => res.data)

export default authRequest