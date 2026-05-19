import request from '@/utils/request'
import { parseStrEmpty } from "@/utils/rongji";
const systemAPI = '/api-system'

// 查询菜单列表
export function listMenu(query) {
  return request({
    url: systemAPI + "/sys/menu/list",
    method: "get",
    params: query,
  });
}

// 查询菜单详细
export function getMenu(menuId) {
  return request({
    url: systemAPI + '/sys/menu/' + parseStrEmpty(menuId),
    method: 'get'
  })
}

// 新增菜单
export function addMenu(data) {
  return request({
    url: systemAPI + '/sys/menu/add',
    method: 'post',
    data: data
  })
}

// 修改菜单
export function updateMenu(data) {
  return request({
    url: systemAPI + '/sys/menu/update',
    method: 'post',
    data: data
  })
}

// 删除菜单
export function delMenu(menuId) {
  return request({
    url: systemAPI + '/sys/menu/del/' + parseStrEmpty(menuId),
    method: 'post'
  })
}

// 获取菜单下拉树列表
export function treeselect() {
  return request({
    url: systemAPI + '/sys/menu/treeselect',
    method: 'get'
  })
}