import request from '@/utils/request'
const flowableAPI = '/api-flowable'

// 查询流程定义列表
export function listDefinition(query) {
  return request({
    url: flowableAPI + '/flowable/definition/list',
    method: 'get',
    params: query
  })
}

// 导入流程文件（bpmn20 xml）
export function importFile(data) {
  return request({
    url: flowableAPI + '/flowable/definition/import',
    method: 'post',
    headers: { 'Content-Type': 'multipart/form-data' },
    data: data
  })
}

// 读取流程定义 XML 源码
export function readXml(definitionId) {
  return request({
    url: flowableAPI + '/flowable/definition/readXml/' + definitionId,
    method: 'get'
  })
}

// 保存流程设计器内的 XML 并部署
export function saveModel(data) {
  return request({
    url: flowableAPI + '/flowable/definition/save',
    method: 'post',
    data: data
  })
}

// 激活或挂起流程定义
export function changeState(definitionId, suspended) {
  return request({
    url: flowableAPI + '/flowable/definition/state',
    method: 'post',
    params: { definitionId, suspended }
  })
}

// 删除流程部署
export function delDefinition(deploymentId) {
  return request({
    url: flowableAPI + '/flowable/definition/delete/' + deploymentId,
    method: 'post'
  })
}
