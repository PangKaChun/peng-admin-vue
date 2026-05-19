import request from '@/utils/request'
import { parseStrEmpty } from "@/utils/rongji";
const systemAPI = '/api-system'

// 查询部门列表
export function listDept(query) {
  return request({
    url: systemAPI + "/sys/dept/list",
    method: "get",
    params: query,
  });
}

// 查询部门详细
export function getDept(deptId) {
  return request({
    url: systemAPI + '/sys/dept/' + parseStrEmpty(deptId),
    method: 'get'
  })
}

// 新增部门
export function addDept(data) {
  return request({
    url: systemAPI + '/sys/dept/add',
    method: 'post',
    data: data
  })
}

// 修改部门
export function updateDept(data) {
  return request({
    url: systemAPI + '/sys/dept/update',
    method: 'post',
    data: data
  })
}

// 删除部门
export function delDept(deptId) {
  return request({
    url: systemAPI + '/sys/dept/del/' + parseStrEmpty(deptId),
    method: 'post'
  })
}

// 获取部门下拉树列表
export function treeselect() {
  return request({
    url: systemAPI + '/sys/dept/treeselect',
    method: 'get'
  })
}