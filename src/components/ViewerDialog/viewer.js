import ViewerDialog from './index.vue'

/**
 * 文件预览器公共逻辑:对话框开关、加载态、失败提示、过期加载丢弃
 *
 * 使用方实现两个钩子:
 * - renderFile(blob, isStale, ...args) 解析并渲染文件。每次 await 之后先问 isStale(),
 *   为 true 说明对话框已关闭或又打开了别的文件,应立即放弃并撤掉自己刚落地的东西
 * - resetViewer() 释放上一份文件占用的资源、复位自己的状态(可选)
 *
 * @param {Object} options
 * @param {String} options.title 未传文件名时的默认标题
 * @param {String} options.failText 加载失败时展示给用户的提示
 */
export default function viewer({ title: defaultTitle, failText }) {
  return {
    components: { ViewerDialog },
    data() {
      return {
        // 预览对话框
        visible: false,
        // 对话框标题(文件名)
        title: '',
        // 加载中
        loading: false,
        // 加载失败提示
        errorMsg: ''
      }
    },
    beforeDestroy() {
      this.discard()
    },
    methods: {
      /** 打开对话框并加载文件,source 为 Blob 或 Promise<Blob>,其余参数透传给 renderFile */
      async open(source, title, ...args) {
        this.discard()
        this.title = title || defaultTitle
        this.visible = true
        this.loading = true
        // 加载令牌:关闭或再次打开后,迟到的结果一律丢弃
        const ticket = (this._ticket = {})
        const isStale = () => this._ticket !== ticket
        try {
          // 等对话框体渲染出容器
          await this.$nextTick()
          const blob = await source
          if (!isStale()) {
            await this.renderFile(blob, isStale, ...args)
          }
        } catch (e) {
          if (!isStale()) {
            console.error(failText, e)
            this.errorMsg = failText
          }
        } finally {
          if (!isStale()) {
            this.loading = false
          }
        }
      },
      /** 作废进行中的加载并清掉上一份内容,对话框关闭后也走这里 */
      discard() {
        this._ticket = null
        this.loading = false
        this.errorMsg = ''
        if (this.resetViewer) {
          this.resetViewer()
        }
      }
    }
  }
}
