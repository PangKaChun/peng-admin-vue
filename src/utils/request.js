import axios from 'axios'
import { MessageBox, Message } from 'element-ui'
import store from '@/store'
import { getToken, setToken, getRefreshToken, setRefreshToken } from '@/utils/auth'
import { tansParams } from '@/utils/common'
import cache from '@/plugins/cache'
import { refreshToken } from '@/api/login'

// 是否显示重新登录
export const isRelogin = { show: false }
// 是否正在刷新 token
let isRefreshing = false
// 重试队列，保存需要等待 token 刷新的请求
let requests = []

axios.defaults.headers['Content-Type'] = 'application/json;charset=utf-8'

// 创建 axios 实例
const service = axios.create({
  baseURL: process.env.VUE_APP_BASE_API,
  timeout: 10000
})

// request 拦截器
service.interceptors.request.use(config => {
  const isToken = (config.headers || {}).isToken === false
  const isRepeatSubmit = (config.headers || {}).repeatSubmit === false

  if (getToken() && !isToken) {
    config.headers['Authorization'] = 'Bearer ' + getToken()
  }

  // get 请求映射 params 参数
  if (config.method === 'get' && config.params) {
    const qs = tansParams(config.params).slice(0, -1)
    if (qs) {
      config.url += (config.url.includes('?') ? '&' : '?') + qs
    }
    config.params = {}
  }

  // 防重复提交逻辑
  if (
    !isRepeatSubmit &&
    !config._retry &&
    config.method === 'post' &&
    !(config.data instanceof FormData) &&
    !(config.data instanceof Blob)
  ) {
    const requestObj = {
      url: config.url,
      data: typeof config.data === 'object' ? JSON.stringify(config.data) : config.data,
      time: new Date().getTime()
    }
    const sessionObj = cache.session.getJSON('sessionObj')

    if (!sessionObj) {
      cache.session.setJSON('sessionObj', requestObj)
    } else {
      const { url: s_url, data: s_data, time: s_time } = sessionObj
      const interval = 1000

      if (s_data === requestObj.data && requestObj.time - s_time < interval && s_url === requestObj.url) {
        const message = '数据正在处理，请勿重复提交'
        console.warn(`[${s_url}]: ` + message)
        return Promise.reject(new Error(message))
      } else {
        cache.session.setJSON('sessionObj', requestObj)
      }
    }
  }
  return config
}, error => {
  console.error('Request Error:', error)
  return Promise.reject(error)
})

// 响应拦截器
service.interceptors.response.use(res => {
  return res.data
},
async (error) => {
  let { message, response } = error
  message = message || ''

  // blob 请求的错误体也是 Blob，转回 JSON 才能走令牌刷新与错误提示
  if (response && response.data instanceof Blob && response.data.type.includes('json')) {
    try {
      response.data = JSON.parse(await response.data.text())
    } catch (e) {
      // 解析失败按原样处理
    }
  }

  if (response && response.data) {
    const code = response.data.code
    const originalRequest = error.config
    const isAuthRequest = (originalRequest.headers || {}).isToken !== false

    if ((code === 401 || code === 424) && isAuthRequest) {
      if (originalRequest._retry) {
        return reloginMessageBox()
      }

      const EToken = getRefreshToken()

      if (!isRefreshing && EToken) {
        isRefreshing = true
        try {
          const { data } = await refreshToken(EToken)
          const token = data && data.access_token
          if (!token) {
            throw new Error('刷新令牌缺少 access_token')
          }

          store.dispatch('user/setToken', token)
          setToken(token)

          if (data.refresh_token) {
            store.dispatch('user/setRefreshToken', data.refresh_token)
            setRefreshToken(data.refresh_token)
          }

          requests.forEach(cb => cb(token))
          requests = []

          originalRequest._retry = true
          originalRequest.headers = originalRequest.headers || {}
          originalRequest.headers.repeatSubmit = false
          originalRequest.headers.Authorization = `Bearer ${token}`
          return service(originalRequest)
        } catch (refreshError) {
          requests.forEach(cb => cb(null))
          requests = []
          return reloginMessageBox()
        } finally {
          isRefreshing = false
        }
      } else if (isRefreshing) {
        return new Promise((resolve, reject) => {
          requests.push((token) => {
            if (!token) {
              reject(new Error('token 刷新失败'))
              return
            }
            originalRequest._retry = true
            originalRequest.headers = originalRequest.headers || {}
            originalRequest.headers.repeatSubmit = false
            originalRequest.headers.Authorization = `Bearer ${token}`
            resolve(service(originalRequest))
          })
        })
      } else {
        return reloginMessageBox()
      }
    } else if (response.data.msg === 'invalid_grant' && isAuthRequest) {
      return reloginMessageBox()
    } else {
      message = response.data.msg || '未知异常'
    }
  } else {
    if (message === 'Network Error') {
      message = '后端接口连接异常'
    } else if (message.includes('timeout')) {
      message = '系统接口请求超时'
    } else if (message.includes('Request failed with status code')) {
      message = '系统接口 ' + message.substr(message.length - 3) + ' 异常'
    }
  }

  Message({ message: message, type: 'error', duration: 5 * 1000 })
  return Promise.reject(error)
})

function reloginMessageBox() {
  if (!isRelogin.show) {
    isRelogin.show = true
    MessageBox.confirm('登录状态已过期，您可以继续留在该页面，或者重新登录', '系统提示', {
      confirmButtonText: '重新登录',
      cancelButtonText: '取消',
      type: 'warning'
    }).then(() => {
      store.dispatch('user/LogOut').finally(() => {
        isRelogin.show = false
        location.href = '/index'
      })
    }).catch(() => {
      isRelogin.show = false
    })
  }
  return Promise.reject(new Error('无效的会话，或者会话已过期，请重新登录。'))
}

export default service
