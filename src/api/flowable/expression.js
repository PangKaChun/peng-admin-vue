import request from '@/utils/request'
const flowableAPI = '/api-flowable'

// 查询流程表达式列表
export function listExpression(query) {
  return request({
    url: flowableAPI + '/flowable/expression/list',
    method: 'get',
    params: query
  })
}

// 查询流程表达式详细
export function getExpression(expressionId) {
  return request({
    url: flowableAPI + '/flowable/expression/getInfo/' + expressionId,
    method: 'get'
  })
}

// 新增流程表达式
export function addExpression(data) {
  return request({
    url: flowableAPI + '/flowable/expression/add',
    method: 'post',
    data: data
  })
}

// 修改流程表达式
export function updateExpression(data) {
  return request({
    url: flowableAPI + '/flowable/expression/update',
    method: 'post',
    data: data
  })
}

// 删除流程表达式
export function delExpression(expressionId) {
  return request({
    url: flowableAPI + '/flowable/expression/delete/' + expressionId,
    method: 'post'
  })
}
