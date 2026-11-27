import axios from 'axios'

const authRequest = axios.create({
  baseURL: process.env.VUE_APP_BASE_API,
  timeout: 10000
})

authRequest.interceptors.response.use(res => res.data)

export default authRequest