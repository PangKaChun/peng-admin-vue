import axios from 'axios'
import { MessageBox, Message } from 'element-ui'
import store from '@/store'
import { getToken, setToken, getRefreshToken, setRefreshToken } from '@/utils/auth'
import { tansParams } from '@/utils/rongji'
import cache from '@/plugins/cache'
import { refreshToken } from '@/api/login'
import { saveAs } from "file-saver"

// 是否显示重新登录
export let isRelogin = { show: false }
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
    let url = config.url + '?' + tansParams(config.params)
    url = url.slice(0, -1)
    config.params = {}
    config.url = url
  }

  // 防重复提交逻辑
  if (!isRepeatSubmit && config.method === 'post') {
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
      const interval = 1000 // 间隔时间(ms)，小于此时间视为重复提交
      
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

  // blob 请求的错误体也是 Blob,转回 JSON 才能走令牌刷新与错误提示
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

    if (code === 401 || code === 424) {
      const EToken = getRefreshToken()
      
      if (!isRefreshing && EToken) {
        isRefreshing = true
        try {
          const { data } = await refreshToken(EToken)
          const token = data.access_token
          
          if (token) {
            // 刷新成功，更新 Vuex 和本地存储
            store.dispatch("user/setToken", token)
            setToken(token)

            if (data.refresh_token) {
              store.dispatch("user/setRefreshToken", data.refresh_token)
              setRefreshToken(data.refresh_token)
            }

            // 执行队列中的请求
            requests.forEach(cb => cb(token))
            requests = []
            
            // 重发当前请求
            originalRequest.headers.Authorization = `Bearer ${token}`
            return service(originalRequest)
          }
        } catch (refreshError) {
          // 通知队列中的请求刷新失败，避免它们永远挂起
          requests.forEach(cb => cb(null))
          requests = []
          return reloginMessageBox()
        } finally {
          isRefreshing = false // 无论成功失败，重置状态
        }
      } else if (isRefreshing) {
        // 正在刷新 token 时，其他 401 请求进入队列等待
        return new Promise((resolve, reject) => {
          requests.push((token) => {
            if (!token) {
              reject(new Error('token 刷新失败'))
              return
            }
            originalRequest.headers.Authorization = `Bearer ${token}`
            resolve(service(originalRequest))
          })
        })
      } else {
        // 既没有 Refresh Token，又报 401，直接退回登录
        return reloginMessageBox()
      }
    } else if (response.data.msg === 'invalid_grant') {
      return reloginMessageBox()
    } else {
      message = response.data.msg || '未知异常'
    }
  } else {
    // 处理网络与超时异常
    if (message === "Network Error") {
      message = "后端接口连接异常"
    } else if (message.includes("timeout")) {
      message = "系统接口请求超时"
    } else if (message.includes("Request failed with status code")) {
      message = "系统接口 " + message.substr(message.length - 3) + " 异常"
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
      isRelogin.show = false
      store.dispatch('user/LogOut').then(() => {
        location.href = '/index'
      })
    }).catch(() => {
      isRelogin.show = false
    })
  }
  return Promise.reject(new Error('无效的会话，或者会话已过期，请重新登录。'))
}

/**
 * 下载本地文件
 * @param {string} localFileName 本地文件名称
 * @param {string} saveFileName 下载的文件名称
 * @returns {promise}
 */
export function downloadLocalFile(localFileName, saveFileName) {
  return new Promise((resolve, reject) => {
    axios({
      url: `/template/${localFileName}`,
      method: "get",
      responseType: "blob"
    })
      .then((res) => {
        const blob = new Blob([res.data])
        const suffix = localFileName.split(".").pop()
        const finalSaveName = saveFileName.includes('.') ? saveFileName : `${saveFileName}.${suffix}`

        if (navigator.msSaveBlob) {
          navigator.msSaveBlob(blob, finalSaveName) // 兼容 IE
        } else {
          const url = window.URL.createObjectURL(blob)
          saveAs(url, finalSaveName)
          window.URL.revokeObjectURL(url) // 释放内存
        }
        resolve()
      })
      .catch((err) => {
        if (err.message && err.message.includes("404")) {
          Message.error("未找到相关文件")
        } else {
          Message.error("文件下载失败")
        }
        reject(err)
      })
  })
}

export default service