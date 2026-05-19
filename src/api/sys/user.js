import request from "@/utils/request";
import { parseStrEmpty } from "@/utils/rongji";
import { encrypt } from '@/utils/jsencrypt.js'
const systemAPI = '/api-system'

// 查询用户列表
export function listUser(query) {
  return request({
    url: systemAPI + "/sys/user/list",
    method: "get",
    params: query,
  });
}

// 查询用户详细
export function getUser(userId) {
  return request({
    url: systemAPI + '/sys/user/' + parseStrEmpty(userId),
    method: 'get'
  })
}

// 新增用户
export function addUser(data) {
  return request({
    url: systemAPI + '/sys/user/add',
    method: 'post',
    data: data
  })
}

// 修改用户
export function updateUser(data) {
  return request({
    url: systemAPI + '/sys/user/update',
    method: 'post',
    data: data
  })
}

// 删除用户
export function delUser(userId) {
  return request({
    url: systemAPI + '/sys/user/del/' + userId,
    method: 'post'
  })
}

// 用户密码重置
export function resetUserPwd(userId, password) {
  password = encrypt(password)
  const data = {
    userId,
    password
  }
  return request({
    url: systemAPI + '/sys/user/resetPwd',
    method: 'post',
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    data: data
  })
}

// 查询授权角色
export function listAuthRole(userId) {
  return request({
    url: systemAPI + '/sys/user/role/' + userId,
    method: 'get'
  })
}

// 保存授权角色
export function updateAuthRole(data) {
  return request({
    url: systemAPI + '/sys/user/authRole',
    method: 'post',
    params: data
  })
}