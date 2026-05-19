import request from '@/utils/request'
const systemAPI = '/api-system'

// 查询参数列表
export function listConfig(query) {
  return request({
    url: systemAPI + '/sys/config/list',
    method: 'get',
    params: query
  })
}

// 查询参数详细
export function getConfig(configId) {
  return request({
    url: systemAPI + '/sys/config/getInfo/' + configId,
    method: 'get'
  })
}

// 根据参数键名查询参数值
export function getConfigKey(configKey) {
  return request({
    url: systemAPI + '/sys/config/configKey/' + configKey,
    method: 'get'
  })
}

// 新增参数配置
export function addConfig(data) {
  return request({
    url: systemAPI + '/sys/config/add',
    method: 'post',
    data: data
  })
}

// 修改参数配置
export function updateConfig(data) {
  return request({
    url: systemAPI + '/sys/config/update',
    method: 'post',
    data: data
  })
}

// 删除参数配置
export function delConfig(configId) {
  return request({
    url: systemAPI + '/sys/config/delete/' + configId,
    method: 'post'
  })
}

// 刷新参数缓存
export function refreshCache() {
  return request({
    url: systemAPI + '/sys/config/refreshCache',
    method: 'post'
  })
}
