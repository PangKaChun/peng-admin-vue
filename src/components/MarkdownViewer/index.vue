<template>
  <!-- Markdown 预览对话框 -->
  <viewer-dialog
    :visible.sync="visible"
    :title="title"
    :loading="loading"
    :message="errorMsg"
    dialog-class="md-viewer-dialog"
    @closed="discard"
  >
    <!-- 内容经 DOMPurify 白名单消毒后才交给 v-html,脚本/事件属性/危险协议均被剥除 -->
    <div v-if="!errorMsg" ref="content" class="md-viewer__content md-body" v-html="contentHtml" />
  </viewer-dialog>
</template>

<script>
import viewer from '@/components/ViewerDialog/viewer'

// 代码块进入预览区上下这段距离内就提前高亮,正常滚动时看不到未高亮的状态
const HIGHLIGHT_MARGIN = '400px 0px'

export default {
  name: 'MarkdownViewer',
  mixins: [viewer({ title: 'Markdown 预览', failText: 'Markdown 加载失败，请尝试下载后查看' })],
  data() {
    return {
      // 消毒后的渲染 HTML
      contentHtml: ''
    }
  },
  methods: {
    /** 解析、消毒并渲染 */
    async renderFile(blob, isStale) {
      // 渲染链路(marked / DOMPurify / highlight.js)首次预览 Markdown 时才加载
      const [text, renderer] = await Promise.all([
        blob.text(),
        import(/* webpackChunkName: "viewer-markdown" */ './renderer')
      ])
      if (isStale()) {
        return
      }
      this.contentHtml = renderer.renderMarkdown(text)
      // DOM 落地后再挂代码高亮
      await this.$nextTick()
      if (!isStale()) {
        this.observeCodeBlocks(renderer.highlightBlock)
      }
    },
    // 未标注语言的代码块要让 hljs 把各语法挨个试一遍,代码块多的长文档一次扫完会卡住主线程,
    // 所以滚到预览区附近才高亮
    observeCodeBlocks(highlight) {
      const content = this.$refs.content
      const blocks = content ? content.querySelectorAll('pre code') : []
      if (!blocks.length) {
        return
      }
      // 不支持 IntersectionObserver 的旧浏览器退回一次性高亮
      if (!window.IntersectionObserver) {
        blocks.forEach(block => highlight(block))
        return
      }
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            observer.unobserve(entry.target)
            highlight(entry.target)
          }
        })
      }, { root: content.closest('.viewer-dialog__body'), rootMargin: HIGHLIGHT_MARGIN })
      blocks.forEach(block => observer.observe(block))
      this._codeObserver = observer
    },
    /** 清空内容并停掉代码块观察 */
    resetViewer() {
      if (this._codeObserver) {
        this._codeObserver.disconnect()
        this._codeObserver = null
      }
      this.contentHtml = ''
    }
  }
}
</script>

<style lang="scss">
@import '@/assets/styles/tokens.scss';

.md-viewer-dialog {
  .md-viewer__content {
    max-width: 880px;
    margin: 0 auto;
    padding: 24px 32px 48px;
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

  /* 代码块(高亮配色交给 hljs github 主题) */
  pre {
    padding: 14px 16px;
    border-radius: 6px;
    background: #f6f8fa;
    overflow: auto;

    /* hljs 主题样式随渲染链路晚加载,带上 .hljs 才压得过它的 pre code.hljs 内边距;
       display / overflow 与高亮后保持一致,懒高亮前后代码块高度不变 */
    code,
    code.hljs {
      display: block;
      padding: 0;
      overflow-x: auto;
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
