import request from "@/utils/request";
const systemAPI = '/api-system'

// 获取路由
export const getRouters = () => {
  return request({
    url: systemAPI + "/getRouters",
    method: "get",
  });
};
