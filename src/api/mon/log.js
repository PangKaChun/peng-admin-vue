import request from '@/utils/request'

const logAPI = '/api-log'

// 查询操作日志列表
export function listLog(query) {
  return request({
    url: logAPI + '/sys/log/list',
    method: 'get',
    params: query
  })
}

// 查询日志详情
export function getLog(logId) {
  return request({
    url: logAPI + '/log/audit/' + logId,
    method: 'get'
  })
}

// 查询登录日志列表
export function loginLog(query) {
  return request({
    url: logAPI + '/sys/login/log/list',
    method: 'get',
    params: query
  })
}