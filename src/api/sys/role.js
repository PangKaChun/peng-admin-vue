import request from "@/utils/request";
import { parseStrEmpty } from "@/utils/rongji";
const systemAPI = '/api-system'

// 查询角色列表
export function listRole(query) {
  return request({
    url: systemAPI + "/sys/role/list",
    method: "get",
    params: query,
  });
}

// 查询角色详细
export function getRole(roleId) {
  return request({
    url: systemAPI + "/sys/role/" + parseStrEmpty(roleId),
    method: "get",
  });
}

// 新增角色
export function addRole(data) {
  return request({
    url: systemAPI + "/sys/role/add",
    method: "post",
    data: data,
  });
}

// 修改角色
export function updateRole(data) {
  return request({
    url: systemAPI + "/sys/role/update",
    method: "post",
    data: data,
  });
}

// 删除角色
export function delRole(roleId) {
  return request({
    url: systemAPI + "/sys/role/del/" + parseStrEmpty(roleId),
    method: "post",
  });
}

// 查询角色授权
export function listRoleAuth(roleId) {
  return request({
    url: systemAPI + "/sys/role/auths/" + parseStrEmpty(roleId),
    method: "get",
  });
}

// 角色授权
export function authRole(data) {
  return request({
    url: systemAPI + "/sys/role/auth",
    method: "post",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
    },
    data: data,
  });
}
