import request from '@/utils/request'
const systemAPI = '/api-system'

// 查询客户端列表
export function listClient(query) {
  return request({
    url: systemAPI + '/sys/client/list',
    method: 'get',
    params: query
  })
}

// 查询客户端详细
export function getClient(id) {
  return request({
    url: systemAPI + '/sys/client/getInfo/' + id,
    method: 'get'
  })
}

// 新增客户端
export function addClient(data) {
  return request({
    url: systemAPI + '/sys/client/add',
    method: 'post',
    data: data
  })
}

// 修改客户端
export function updateClient(data) {
  return request({
    url: systemAPI + '/sys/client/update',
    method: 'post',
    data: data
  })
}

// 删除客户端
export function delClient(ids) {
  return request({
    url: systemAPI + '/sys/client/del/' + ids,
    method: 'post'
  })
}
