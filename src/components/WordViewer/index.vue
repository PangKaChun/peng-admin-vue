<template>
  <!-- Word 预览对话框 -->
  <el-dialog
    :visible.sync="visible"
    :fullscreen="maximized"
    width="72%"
    top="4vh"
    append-to-body
    custom-class="word-viewer-dialog"
    @closed="cleanup"
  >
    <!-- 自定义标题栏 -->
    <div slot="title" class="word-viewer__header" @dblclick="toggleMaximize">
      <span class="el-dialog__title">{{ title }}</span>
      <button
        type="button"
        class="word-viewer__maximize"
        :title="maximized ? '还原' : '最大化'"
        @click="toggleMaximize"
      >
        <i :class="maximized ? 'el-icon-copy-document' : 'el-icon-full-screen'" />
      </button>
    </div>

    <div v-loading="loading" class="word-viewer__body">
      <div v-if="errorMsg" class="word-viewer__error">{{ errorMsg }}</div>
      <div v-show="!errorMsg" ref="container" class="word-viewer__container" />
    </div>
  </el-dialog>
</template>

<script>
import { renderAsync } from 'docx-preview'

export default {
  name: 'WordViewer',
  data() {
    return {
      // 预览对话框
      visible: false,
      // 是否最大化
      maximized: false,
      // 对话框标题(文件名)
      title: '',
      // 文档加载中
      loading: false,
      // 加载失败提示
      errorMsg: ''
    }
  },
  beforeDestroy() {
    this.cleanup()
  },
  methods: {
    /** 打开对话框并加载 Word */
    open(url, title) {
      this.title = title || 'Word 预览'
      this.errorMsg = ''
      this.visible = true
      // 等对话框体渲染出容器后再注入文档
      this.$nextTick(() => this.load(url))
    },
    /** 拉取并渲染文档 */
    async load(url) {
      this.errorMsg = ''
      this.loading = true
      // 加载令牌
      const token = {}
      this._loadToken = token
      try {
        const resp = await fetch(url)
        if (!resp.ok) {
          throw new Error('HTTP ' + resp.status)
        }
        const blob = await resp.blob()
        if (this._loadToken !== token) {
          return
        }
        const container = this.$refs.container
        // docx-preview 渲染前会清空容器,这里再清一次做双保险
        container.innerHTML = ''
        // container 同时作为内容与样式宿主:注入的 <style> 随容器清空一并释放,不污染全局
        await renderAsync(blob, container, container, {
          className: 'docx',
          inWrapper: true,
          breakPages: true,
          renderHeaders: true,
          renderFooters: true,
          // 图片内联 base64,随容器清空自动回收,免去手动 revoke blob URL
          useBase64URL: true
        })
        // 渲染期间对话框已关闭,清掉刚落地的内容
        if (this._loadToken !== token) {
          container.innerHTML = ''
        }
      } catch (e) {
        if (this._loadToken === token) {
          // docx-preview 仅支持 OOXML(.docx)
          console.error('Word 加载失败', e)
          this.errorMsg = 'Word 预览失败，可能是老版本 .doc 格式，请下载后查看'
        }
      } finally {
        if (this._loadToken === token) {
          this.loading = false
        }
      }
    },
    /** 最大化/还原 */
    toggleMaximize() {
      this.maximized = !this.maximized
    },
    /** 关闭后清理 */
    cleanup() {
      this._loadToken = null
      this.loading = false
      this.errorMsg = ''
      if (this.$refs.container) {
        this.$refs.container.innerHTML = ''
      }
    }
  }
}
</script>

<style lang="scss">
@import '@/assets/styles/tokens.scss';

.word-viewer-dialog {
  .el-dialog__body {
    padding: 0;
  }

  /* 标题栏最大化/还原按钮 */
  .word-viewer__maximize {
    position: absolute;
    top: 20px;
    right: 50px;
    padding: 0;
    border: none;
    outline: none;
    background: transparent;
    font-size: 16px;
    color: #909399;
    cursor: pointer;

    &:hover {
      color: $color-primary;
    }
  }

  .word-viewer__body {
    position: relative;
    height: 74vh;
    overflow: auto;
    background: #f5f7fa;
  }

  .word-viewer__container {
    min-height: 100%;
  }

  .word-viewer__body .docx-wrapper {
    background: #f5f7fa;
  }

  .word-viewer__error {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 14px;
    color: #909399;
  }

  /* 最大化 */
  &.is-fullscreen {
    display: flex;
    flex-direction: column;

    .el-dialog__body {
      display: flex;
      flex: 1;
      flex-direction: column;
      min-height: 0;
    }

    .word-viewer__body {
      flex: 1;
      height: auto;
      min-height: 0;
    }
  }
}
</style>
