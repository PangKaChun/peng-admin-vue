<template>
  <!-- Word 预览对话框 -->
  <viewer-dialog
    :visible.sync="visible"
    :title="title"
    :loading="loading"
    :message="errorMsg"
    dialog-class="word-viewer-dialog"
    @closed="discard"
  >
    <div v-show="!errorMsg" ref="container" class="word-viewer__container" />
  </viewer-dialog>
</template>

<script>
import viewer from '@/components/ViewerDialog/viewer'

export default {
  name: 'WordViewer',
  // docx-preview 仅支持 OOXML(.docx)
  mixins: [viewer({ title: 'Word 预览', failText: 'Word 预览失败，可能是老版本 .doc 格式，请下载后查看' })],
  methods: {
    /** 渲染文档 */
    async renderFile(blob, isStale) {
      // docx-preview(连带 jszip)首次预览 Word 时才加载
      const { renderAsync } = await import(/* webpackChunkName: "viewer-docx" */ 'docx-preview')
      if (isStale()) {
        return
      }
      // 每次加载用独立宿主:迟到的旧渲染只会落在自己的宿主里,不会冲掉新文档
      const host = document.createElement('div')
      this.$refs.container.appendChild(host)
      // host 同时作为内容与样式宿主:注入的 <style> 随宿主移除一并释放,不污染全局
      await renderAsync(blob, host, host, {
        className: 'docx',
        inWrapper: true,
        breakPages: true,
        renderHeaders: true,
        renderFooters: true,
        // 图片内联 base64,随宿主移除自动回收,免去手动 revoke blob URL
        useBase64URL: true
      })
      // 渲染期间对话框已关闭或换了文档,撤掉刚落地的内容
      if (isStale()) {
        host.remove()
      }
    },
    /** 清空已渲染的文档 */
    resetViewer() {
      if (this.$refs.container) {
        this.$refs.container.innerHTML = ''
      }
    }
  }
}
</script>

<style lang="scss">
.word-viewer-dialog {
  .viewer-dialog__body,
  .docx-wrapper {
    background: #f5f7fa;
  }

  .word-viewer__container {
    min-height: 100%;
  }
}
</style>
