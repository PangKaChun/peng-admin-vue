import request from "@/utils/request";
const jobAPI = '/api-job'

// 查询调度日志列表
export function listJobLog(query) {
  return request({
    url: jobAPI + "/sys/job/log/list",
    method: "get",
    params: query,
  });
}

// 删除调度日志
export function delJobLog(jobLogId) {
  return request({
    url: jobAPI + "/sys/job/log/del/" + jobLogId,
    method: "post",
  });
}

// 清空调度日志
export function cleanJobLog() {
  return request({
    url: jobAPI + "/sys/job/log/clean",
    method: "post",
  });
}
