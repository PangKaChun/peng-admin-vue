import request from '@/utils/request'
const systemAPI = '/api-system'

// 查询当前用户多因素认证状态
export function getMfaStatus() {
  return request({
    url: systemAPI + '/sys/mfa/status',
    method: 'get'
  })
}

// 生成密钥并返回绑定二维码链接
export function bindMfa() {
  return request({
    url: systemAPI + '/sys/mfa/bind',
    method: 'post'
  })
}

// 校验动态口令并启用多因素认证
export function enableMfa(code) {
  return request({
    url: systemAPI + '/sys/mfa/enable',
    method: 'post',
    params: { code }
  })
}

// 校验动态口令并关闭多因素认证
export function disableMfa(code) {
  return request({
    url: systemAPI + '/sys/mfa/disable',
    method: 'post',
    params: { code }
  })
}
