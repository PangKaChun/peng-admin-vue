import request from '@/utils/request'

const systemAPI = '/api-system'

// 查询操作日志列表
export function listLog(query) {
  return request({
    url: systemAPI + '/sys/log/list',
    method: 'get',
    params: query
  })
}

// 查询登录日志列表
export function loginLog(query) {
  return request({
    url: systemAPI + '/sys/login/log/list',
    method: 'get',
    params: query
  })
}