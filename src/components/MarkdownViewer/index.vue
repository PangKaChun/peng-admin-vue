<template>
  <!-- Markdown 预览对话框 -->
  <el-dialog
    :visible.sync="visible"
    :fullscreen="maximized"
    width="72%"
    top="4vh"
    append-to-body
    custom-class="md-viewer-dialog"
    @closed="cleanup"
  >
    <!-- 自定义标题栏 -->
    <div slot="title" class="md-viewer__header" @dblclick="toggleMaximize">
      <span class="el-dialog__title">{{ title }}</span>
      <button
        type="button"
        class="md-viewer__maximize"
        :title="maximized ? '还原' : '最大化'"
        @click="toggleMaximize"
      >
        <i :class="maximized ? 'el-icon-copy-document' : 'el-icon-full-screen'" />
      </button>
    </div>

    <div v-loading="loading" class="md-viewer__body">
      <div v-if="errorMsg" class="md-viewer__error">{{ errorMsg }}</div>
      <!-- 内容经 DOMPurify 白名单消毒后才交给 v-html,脚本/事件属性/危险协议均被剥除 -->
      <div v-else ref="content" class="md-viewer__content md-body" v-html="contentHtml" />
    </div>
  </el-dialog>
</template>

<script>
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import hljs from 'highlight.js/lib/core'
import 'highlight.js/styles/github.css'
// 按需注册常用语言
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import java from 'highlight.js/lib/languages/java'
import json from 'highlight.js/lib/languages/json'
import xml from 'highlight.js/lib/languages/xml'
import css from 'highlight.js/lib/languages/css'
import scss from 'highlight.js/lib/languages/scss'
import bash from 'highlight.js/lib/languages/bash'
import shell from 'highlight.js/lib/languages/shell'
import sql from 'highlight.js/lib/languages/sql'
import python from 'highlight.js/lib/languages/python'
import go from 'highlight.js/lib/languages/go'
import yaml from 'highlight.js/lib/languages/yaml'
import ini from 'highlight.js/lib/languages/ini'
import plaintext from 'highlight.js/lib/languages/plaintext'

hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('java', java)
hljs.registerLanguage('json', json)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('html', xml)
hljs.registerLanguage('vue', xml)
hljs.registerLanguage('css', css)
hljs.registerLanguage('scss', scss)
hljs.registerLanguage('bash', bash)
hljs.registerLanguage('shell', shell)
hljs.registerLanguage('sql', sql)
hljs.registerLanguage('python', python)
hljs.registerLanguage('go', go)
hljs.registerLanguage('yaml', yaml)
hljs.registerLanguage('ini', ini)
hljs.registerLanguage('plaintext', plaintext)
hljs.configure({ ignoreUnescapedHTML: true })

const purifier = DOMPurify(window)
// 外链统一新窗口打开并断开 opener,避免预览内点击把整个管理端导航走
purifier.addHook('afterSanitizeAttributes', node => {
  if (node.tagName === 'A' && node.hasAttribute('href')) {
    node.setAttribute('target', '_blank')
    node.setAttribute('rel', 'noopener noreferrer')
  }
})
// 禁掉 style 标签与内联样式:防止注入全局 CSS 或 fixed 覆盖层遮挡管理端
const SANITIZE_OPTIONS = { FORBID_TAGS: ['style'], FORBID_ATTR: ['style'] }

export default {
  name: 'MarkdownViewer',
  data() {
    return {
      // 预览对话框
      visible: false,
      // 是否最大化
      maximized: false,
      // 对话框标题(文件名)
      title: '',
      // 加载中
      loading: false,
      // 加载失败提示
      errorMsg: '',
      // 消毒后的渲染 HTML
      contentHtml: ''
    }
  },
  beforeDestroy() {
    this.cleanup()
  },
  methods: {
    /** 打开对话框并加载 Markdown,source 为 Blob 或 Promise<Blob> */
    open(source, title) {
      this.title = title || 'Markdown 预览'
      this.visible = true
      this.load(source)
    },
    /** 拉取、解析、消毒并渲染 */
    async load(source) {
      this.resetState()
      this.loading = true
      const token = {}
      this._loadToken = token
      try {
        const text = await (await source).text()
        if (this._loadToken !== token) {
          return
        }
        const rawHtml = marked.parse(text, { gfm: true })
        this.contentHtml = purifier.sanitize(rawHtml, SANITIZE_OPTIONS)
        // DOM 落地后对代码块做高亮
        this.$nextTick(() => this.highlightCode())
      } catch (e) {
        if (this._loadToken === token) {
          console.error('Markdown 加载失败', e)
          this.errorMsg = 'Markdown 加载失败，请尝试下载后查看'
        }
      } finally {
        if (this._loadToken === token) {
          this.loading = false
        }
      }
    },
    /** 高亮渲染区内全部代码块 */
    highlightCode() {
      const content = this.$refs.content
      if (!content) {
        return
      }
      content.querySelectorAll('pre code').forEach(block => {
        hljs.highlightElement(block)
      })
    },
    /** 最大化/还原 */
    toggleMaximize() {
      this.maximized = !this.maximized
    },
    /** 关闭后清理 */
    cleanup() {
      this._loadToken = null
      this.resetState()
    },
    /** 复位状态 */
    resetState() {
      this.loading = false
      this.errorMsg = ''
      this.contentHtml = ''
    }
  }
}
</script>

<style lang="scss">
@import '@/assets/styles/tokens.scss';

.md-viewer-dialog {
  .el-dialog__body {
    padding: 0;
  }

  /* 标题栏最大化/还原按钮 */
  .md-viewer__maximize {
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

  .md-viewer__body {
    position: relative;
    height: 74vh;
    overflow: auto;
    background: #fff;
  }

  .md-viewer__content {
    max-width: 880px;
    margin: 0 auto;
    padding: 24px 32px 48px;
  }

  .md-viewer__error {
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

    .md-viewer__body {
      flex: 1;
      height: auto;
      min-height: 0;
    }
  }
}

/* GitHub 风格排版 */
.md-body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 15px;
  line-height: 1.7;
  color: #24292f;
  word-wrap: break-word;

  h1, h2, h3, h4, h5, h6 {
    margin: 24px 0 12px;
    font-weight: 600;
    line-height: 1.3;
  }

  h1 {
    padding-bottom: 8px;
    border-bottom: 1px solid #eaecef;
    font-size: 28px;
  }

  h2 {
    padding-bottom: 6px;
    border-bottom: 1px solid #eaecef;
    font-size: 22px;
  }

  h3 { font-size: 18px; }
  h4 { font-size: 16px; }
  h5, h6 { font-size: 14px; }

  p, ul, ol, table, blockquote, pre {
    margin: 0 0 14px;
  }

  ul, ol {
    padding-left: 26px;
  }

  li + li {
    margin-top: 3px;
  }

  a {
    color: $color-primary;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  blockquote {
    padding: 2px 14px;
    border-left: 4px solid #d0d7de;
    color: #57606a;

    > :last-child {
      margin-bottom: 0;
    }
  }

  /* 行内代码 */
  code {
    padding: 2px 5px;
    border-radius: 4px;
    background: rgba(175, 184, 193, 0.2);
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
    font-size: 85%;
  }

  /* 代码块(高亮底色交给 hljs github 主题) */
  pre {
    padding: 14px 16px;
    border-radius: 6px;
    background: #f6f8fa;
    overflow: auto;

    code {
      padding: 0;
      border-radius: 0;
      background: transparent;
      font-size: 13px;
      line-height: 1.55;
    }
  }

  table {
    display: block;
    max-width: 100%;
    overflow: auto;
    border-collapse: collapse;
    border-spacing: 0;

    th, td {
      padding: 6px 13px;
      border: 1px solid #d0d7de;
    }

    th {
      background: #f6f8fa;
      font-weight: 600;
    }

    tr:nth-child(even) td {
      background: #fafbfc;
    }
  }

  img {
    max-width: 100%;
    box-sizing: border-box;
  }

  hr {
    height: 1px;
    margin: 20px 0;
    border: none;
    background: #d8dee4;
  }

  /* GFM 任务列表 */
  li:has(> input[type="checkbox"]) {
    list-style: none;
    margin-left: -18px;
  }
}
</style>
