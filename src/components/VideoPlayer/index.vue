<template>
  <!-- 视频播放对话框(HLS) -->
  <el-dialog :title="title" :visible.sync="visible" width="820px" append-to-body @closed="destroyHls">
    <video ref="video" controls style="width: 100%; max-height: 70vh; background: #000"></video>
  </el-dialog>
</template>

<script>
import { getToken, getRefreshToken, setToken, setRefreshToken } from '@/utils/auth'
import { refreshToken } from '@/api/login'

// hls.js 首次播放时才加载,加载后留在模块变量里
let Hls = null
function loadHls() {
  return import(/* webpackChunkName: "viewer-hls" */ 'hls.js').then(mod => {
    Hls = mod.default
  })
}

export default {
  name: 'VideoPlayer',
  // 播放器实例与播放参数不进 data,挂非响应式私有属性(_hls / _source / _session 等):
  // 进了 data 会被 Vue 深度代理,hls.js 内部每次状态变更都要过一遍响应式
  data() {
    return {
      // 播放对话框
      visible: false,
      // 播放标题
      title: ''
    }
  },
  beforeDestroy() {
    this.destroyHls()
  },
  methods: {
    /**
     * 打开对话框并播放视频(HLS)
     * @param url m3u8 播放地址
     * @param title 对话框标题
     * @param options.withToken 是否携带令牌,公开文件传 false
     * @param options.shareUrl 返回 Promise<短码地址> 的函数,原生 HLS 带不了请求头时用
     */
    play(url, title, options) {
      const { withToken, shareUrl } = options || {}
      this.title = title || ''
      this.visible = true
      this.start({ url, withToken: withToken !== false, shareUrl: shareUrl || null })
    },
    /** 加载 hls.js 并开始播放 */
    async start(source) {
      this.destroyHls()
      this._source = source
      // 播放令牌:hls.js 还没加载完就关掉对话框或换了视频时,这次初始化作废
      const session = (this._session = {})
      try {
        // 同时等对话框体渲染出 video 节点
        await Promise.all([loadHls(), this.$nextTick()])
      } catch (e) {
        if (this._session === session) {
          console.error('hls.js 加载失败', e)
          this.$modal.msgError('播放器加载失败，请重试')
        }
        return
      }
      const video = this.$refs.video
      if (this._session !== session || !video) {
        return
      }
      if (Hls.isSupported()) {
        this.attachHls(video)
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        this.playNative(video, session)
      } else {
        this.$modal.msgError('当前浏览器不支持 HLS 播放')
      }
    },
    /** 用 hls.js 播放 */
    attachHls(video) {
      const hls = new Hls({
        // 每次请求动态读取当前令牌,令牌刷新后分片请求自动使用新令牌;公开文件免鉴权不注入
        xhrSetup: (xhr) => {
          const token = this._source.withToken ? getToken() : null
          if (token) {
            xhr.setRequestHeader('Authorization', 'Bearer ' + token)
          }
        }
      })
      this._hls = hls
      hls.on(Hls.Events.ERROR, this.onHlsError)
      // 成功加载分片即认为已恢复,允许后续再次过期时重新刷新
      hls.on(Hls.Events.FRAG_LOADED, () => {
        this._refreshedOnce = false
      })
      hls.loadSource(this._source.url)
      hls.attachMedia(video)
    },
    // Safari 原生 HLS 带不了请求头,私有视频临时换短码地址,播放超过有效期会中断
    playNative(video, session) {
      const { url, withToken, shareUrl } = this._source
      if (!withToken || !shareUrl) {
        video.src = url
        return
      }
      shareUrl().then((shared) => {
        if (this._session === session) {
          video.src = shared
        }
      }).catch(() => {})
    },
    /** hls.js 错误处理:令牌过期(401/424)刷新后续播,其余致命错误尝试恢复 */
    onHlsError(event, data) {
      const hls = this._hls
      if (!data || !hls) {
        return
      }
      const code = data.response && data.response.code
      // 令牌过期刷新仅对鉴权播放生效,免鉴权播放不存在令牌语义
      if (this._source.withToken && data.type === Hls.ErrorTypes.NETWORK_ERROR && (code === 401 || code === 424)) {
        this.refreshAndReload(data.details)
        return
      }
      if (!data.fatal) {
        return
      }
      switch (data.type) {
        case Hls.ErrorTypes.NETWORK_ERROR:
          hls.startLoad()
          break
        case Hls.ErrorTypes.MEDIA_ERROR:
          hls.recoverMediaError()
          break
        default:
          this.$modal.msgError('视频播放失败')
          this.destroyHls()
      }
    },
    /** 令牌过期:用 refresh_token 刷新后继续加载;刷新过仍然 401 则判定登录失效 */
    async refreshAndReload(details) {
      if (this._refreshing) {
        return
      }
      if (this._refreshedOnce) {
        this.expire()
        return
      }
      this._refreshing = true
      this._refreshedOnce = true
      const hls = this._hls
      // 暂停加载,避免用旧令牌空转重试
      hls.stopLoad()
      let token = null
      try {
        token = await this.refreshAccessToken()
      } catch (e) {
        // 刷新请求失败按拿不到令牌处理
      }
      // 刷新期间对话框已关闭或换了视频,与这个播放器无关了
      if (this._hls !== hls) {
        return
      }
      this._refreshing = false
      if (!token) {
        this.expire()
        return
      }
      // 清单/层级错误需重载源,分片错误从当前位置续播
      if (this.isManifestError(details)) {
        hls.loadSource(this._source.url)
      }
      hls.startLoad()
    },
    /** 登录失效:提示并停止播放 */
    expire() {
      this.$modal.msgError('登录已过期，请重新登录')
      this.destroyHls()
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
    /** 释放播放器,进行中的初始化一并作废 */
    destroyHls() {
      this._session = null
      if (this._hls) {
        this._hls.destroy()
        this._hls = null
      }
      this._refreshing = false
      this._refreshedOnce = false
      const video = this.$refs.video
      if (video) {
        video.removeAttribute('src')
        video.load()
      }
    }
  }
}
</script>
