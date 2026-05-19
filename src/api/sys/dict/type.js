import request from '@/utils/request'
const systemAPI = '/api-system'

// 查询字典类型列表
export function listType(query) {
  return request({
    url: systemAPI + '/sys/dict/type/list',
    method: 'get',
    params: query
  })
}

// 查询字典类型详细
export function getType(dictId) {
  return request({
    url: systemAPI + '/sys/dict/type/' + dictId,
    method: 'get'
  })
}

// 新增字典类型
export function addType(data) {
  return request({
    url: systemAPI + '/sys/dict/type/add',
    method: 'post',
    data: data
  })
}

// 修改字典类型
export function updateType(data) {
  return request({
    url: systemAPI + '/sys/dict/type/update',
    method: 'post',
    data: data
  })
}

// 删除字典类型
export function delType(dictId) {
  return request({
    url: systemAPI + '/sys/dict/type/del/' + dictId,
    method: 'post'
  })
}

// 刷新字典缓存
export function refreshCache() {
  return request({
    url: systemAPI + '/sys/dict/type/refreshCache',
    method: 'post'
  })
}

// 获取字典选择框列表
export function optionselect() {
  return request({
    url: systemAPI + '/sys/dict/type/optionselect',
    method: 'get'
  })
}