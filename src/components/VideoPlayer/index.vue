<template>
  <!-- 视频播放对话框(HLS) -->
  <el-dialog :title="title" :visible.sync="visible" width="820px" append-to-body @closed="destroyHls">
    <video ref="video" controls style="width: 100%; max-height: 70vh; background: #000"></video>
  </el-dialog>
</template>

<script>
import Hls from 'hls.js'
import { getToken, getRefreshToken, setToken, setRefreshToken } from '@/utils/auth'
import { refreshToken } from '@/api/login'

export default {
  name: 'VideoPlayer',
  data() {
    return {
      // 播放对话框
      visible: false,
      // 播放标题
      title: '',
      // 播放地址(m3u8)
      playUrl: '',
      // hls.js 实例
      hls: null,
      // 是否携带令牌
      withToken: true,
      // 是否正在刷新令牌
      tokenRefreshing: false,
      // 本次过期事件是否已刷新过
      tokenRefreshedOnce: false
    }
  },
  beforeDestroy() {
    this.destroyHls()
  },
  methods: {
    /** 打开对话框并播放视频(HLS) */
    play(url, title, options) {
      this.playUrl = url
      this.title = title || ''
      this.withToken = !(options && options.withToken === false)
      this.visible = true
      this.$nextTick(() => this.initHls())
    },
    /** 初始化 hls.js 播放器 */
    initHls() {
      const video = this.$refs.video
      if (!video) {
        return
      }
      this.destroyHls()
      this.tokenRefreshing = false
      this.tokenRefreshedOnce = false
      if (Hls.isSupported()) {
        const hls = new Hls({
          // 每次请求动态读取当前令牌,令牌刷新后分片请求自动使用新令牌;公开文件免鉴权不注入
          xhrSetup: (xhr) => {
            const token = this.withToken ? getToken() : null
            if (token) {
              xhr.setRequestHeader('Authorization', 'Bearer ' + token)
            }
          }
        })
        hls.on(Hls.Events.ERROR, this.onHlsError)
        // 成功加载分片即认为已恢复,允许后续再次过期时重新刷新
        hls.on(Hls.Events.FRAG_LOADED, () => {
          this.tokenRefreshedOnce = false
        })
        hls.loadSource(this.playUrl)
        hls.attachMedia(video)
        this.hls = hls
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Safari 原生 HLS(无法注入请求头,令牌过期无法自动刷新,私有视频建议用 hls.js 环境)
        video.src = this.playUrl
      } else {
        this.$modal.msgError('当前浏览器不支持 HLS 播放')
      }
    },
    /** hls.js 错误处理:令牌过期(401/424)刷新后续播,其余致命错误尝试恢复 */
    onHlsError(event, data) {
      if (!data) {
        return
      }
      const code = data.response && data.response.code
      // 令牌过期刷新仅对鉴权播放生效,免鉴权播放不存在令牌语义
      if (this.withToken && data.type === Hls.ErrorTypes.NETWORK_ERROR && (code === 401 || code === 424)) {
        this.refreshAndReload(data.details)
        return
      }
      if (!data.fatal) {
        return
      }
      switch (data.type) {
        case Hls.ErrorTypes.NETWORK_ERROR:
          this.hls.startLoad()
          break
        case Hls.ErrorTypes.MEDIA_ERROR:
          this.hls.recoverMediaError()
          break
        default:
          this.$modal.msgError('视频播放失败')
          this.destroyHls()
      }
    },
    /** 令牌过期:用 refresh_token 刷新后继续加载 */
    refreshAndReload(details) {
      if (this.tokenRefreshing) {
        return
      }
      if (this.tokenRefreshedOnce) {
        this.$modal.msgError('登录已过期，请重新登录')
        this.destroyHls()
        return
      }
      this.tokenRefreshing = true
      this.tokenRefreshedOnce = true
      // 暂停加载,避免用旧令牌空转重试
      if (this.hls) {
        this.hls.stopLoad()
      }
      this.refreshAccessToken()
        .then((token) => {
          if (token && this.hls) {
            // 清单/层级错误需重载源,分片错误从当前位置续播
            if (this.isManifestError(details)) {
              this.hls.loadSource(this.playUrl)
            }
            this.hls.startLoad()
          } else {
            this.$modal.msgError('登录已过期，请重新登录')
            this.destroyHls()
          }
        })
        .catch(() => {
          this.$modal.msgError('登录已过期，请重新登录')
          this.destroyHls()
        })
        .finally(() => {
          this.tokenRefreshing = false
        })
    },
    /** 是否清单/层级加载错误 */
    isManifestError(details) {
      return details === Hls.ErrorDetails.MANIFEST_LOAD_ERROR
        || details === Hls.ErrorDetails.MANIFEST_LOAD_TIMEOUT
        || details === Hls.ErrorDetails.LEVEL_LOAD_ERROR
    },
    /** 使用 refresh_token 刷新 access_token,返回新令牌(失败/无刷新令牌返回 null) */
    refreshAccessToken() {
      const refresh = getRefreshToken()
      if (!refresh) {
        return Promise.resolve(null)
      }
      return refreshToken(refresh).then((res) => {
        const data = res && res.data
        const token = data && data.access_token
        if (token) {
          this.$store.dispatch('user/setToken', token)
          setToken(token)
          if (data.refresh_token) {
            this.$store.dispatch('user/setRefreshToken', data.refresh_token)
            setRefreshToken(data.refresh_token)
          }
        }
        return token
      })
    },
    /** 释放播放器 */
    destroyHls() {
      if (this.hls) {
        this.hls.destroy()
        this.hls = null
      }
      this.tokenRefreshing = false
      this.tokenRefreshedOnce = false
      const video = this.$refs.video
      if (video) {
        video.removeAttribute('src')
        video.load()
      }
    }
  }
}
</script>
