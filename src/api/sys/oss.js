import request from '@/utils/request'
import { getToken } from '@/utils/auth'
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

// 下载地址
export function downloadOssUrl(ossId, isPublic) {
  const base = `${location.origin}${process.env.VUE_APP_BASE_API}${fileAPI}/sys/oss/files/${ossId}/download`
  return isPublic ? base : `${base}?access_token=${encodeURIComponent(getToken())}`
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

// 预览地址(私有文件带令牌)
export function previewOssUrl(ossId, isPublic) {
  const base = `${location.origin}${process.env.VUE_APP_BASE_API}${fileAPI}/sys/oss/files/${ossId}/preview`
  return isPublic ? base : `${base}?access_token=${encodeURIComponent(getToken())}`
}

// 公开预览地址
export function publicOssUrl(ossId) {
  return previewOssUrl(ossId, true)
}

// HLS 播放列表地址
export function hlsPlayUrl(ossId) {
  return `${location.origin}${process.env.VUE_APP_BASE_API}${fileAPI}/sys/oss/files/${ossId}/hls/index.m3u8`
}
