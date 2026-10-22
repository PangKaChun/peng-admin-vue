import request from '@/utils/request'
const fileAPI = '/api-file'

// 查询文件列表
export function listOss(query) {
  return request({
    url: fileAPI + '/sys/oss/list',
    method: 'get',
    params: query
  })
}

// 检查已上传分片(断点续传)
export function checkChunks(params) {
  return request({
    url: fileAPI + '/sys/oss/chunk/check',
    method: 'get',
    params: params
  })
}

// 上传单个分片
export function uploadChunk(data) {
  return request({
    url: fileAPI + '/sys/oss/chunk/upload',
    method: 'post',
    headers: { 'Content-Type': 'multipart/form-data', repeatSubmit: false },
    timeout: 60000,
    data: data
  })
}

// 提交分片合并
export function mergeChunks(data) {
  return request({
    url: fileAPI + '/sys/oss/chunk/merge',
    method: 'post',
    data: data
  })
}

// 查询分片合并结果(轮询)
export function getMergeStatus(identifier) {
  return request({
    url: fileAPI + '/sys/oss/chunk/merge/status',
    method: 'get',
    params: { identifier }
  })
}

// 文件访问地址前缀
function fileBaseUrl() {
  return `${location.origin}${process.env.VUE_APP_BASE_API}${fileAPI}`
}

// 下载地址
export function downloadOssUrl(ossId) {
  return `${fileBaseUrl()}/sys/oss/files/${ossId}/download`
}

// 删除文件
export function delOss(ossIds) {
  return request({
    url: fileAPI + '/sys/oss/delete/' + ossIds,
    method: 'post'
  })
}

// 修改文件公开状态
export function changeOssPublic(data) {
  return request({
    url: fileAPI + '/sys/oss/changePublic',
    method: 'post',
    data: data
  })
}

// 重试 HLS 转码(仅转码失败的视频)
export function retryHlsOss(ossId) {
  return request({
    url: fileAPI + '/sys/oss/files/' + ossId + '/hls/retry',
    method: 'post'
  })
}

// 换取私有文件访问短码
export function getOssShare(ossId) {
  return request({
    url: fileAPI + '/sys/oss/files/' + ossId + '/share',
    method: 'get'
  })
}

// 预览文件内容,经请求头携带登录态
export function getOssPreviewBlob(ossId) {
  return request({
    url: fileAPI + '/sys/oss/files/' + ossId + '/preview',
    method: 'get',
    responseType: 'blob',
    // 大文件预览不设超时
    timeout: 0
  })
}

// 预览地址
export function previewOssUrl(ossId) {
  return `${fileBaseUrl()}/sys/oss/files/${ossId}/preview`
}

// HLS 播放列表地址
export function hlsPlayUrl(ossId) {
  return `${fileBaseUrl()}/sys/oss/files/${ossId}/hls/index.m3u8`
}

// 短码访问地址,免登录;业务后端换好的 {code} 也用它拼
export function shareOssUrls(share) {
  const base = `${fileBaseUrl()}/s/${share.code}`
  return {
    preview: base,
    download: base + '/download',
    hls: base + '/hls/index.m3u8'
  }
}
