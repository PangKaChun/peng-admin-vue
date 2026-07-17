<template>
  <!-- PDF 预览对话框(pdf.js:缩放/翻页/文本搜索) -->
  <el-dialog
    :visible.sync="visible"
    :fullscreen="maximized"
    width="72%"
    top="4vh"
    append-to-body
    custom-class="pdf-viewer-dialog"
    @closed="cleanup"
  >
    <!-- 自定义标题栏:标题 + 最大化/还原按钮(双击标题栏也可切换) -->
    <div slot="title" class="pdf-viewer__header" @dblclick="toggleMaximize">
      <span class="el-dialog__title">{{ title }}</span>
      <button
        type="button"
        class="pdf-viewer__maximize"
        :title="maximized ? '还原' : '最大化'"
        @click="toggleMaximize"
      >
        <i :class="maximized ? 'el-icon-copy-document' : 'el-icon-full-screen'" />
      </button>
    </div>
    <div class="pdf-viewer__toolbar">
      <el-button-group>
        <el-button size="mini" icon="el-icon-arrow-left" title="上一页" :disabled="loading || pageNumber <= 1" @click="gotoPage(pageNumber - 1)" />
        <el-button size="mini" icon="el-icon-arrow-right" title="下一页" :disabled="loading || pageNumber >= pageCount" @click="gotoPage(pageNumber + 1)" />
      </el-button-group>
      <span class="pdf-viewer__pages">
        <el-input v-model="pageInput" size="mini" class="pdf-viewer__page-input" :disabled="loading" @change="onPageInput" />
        <span>/ {{ pageCount }}</span>
      </span>

      <el-divider direction="vertical" />

      <el-button-group>
        <el-button size="mini" icon="el-icon-minus" title="缩小" :disabled="loading" @click="zoomOut" />
        <el-button size="mini" icon="el-icon-plus" title="放大" :disabled="loading" @click="zoomIn" />
      </el-button-group>
      <span class="pdf-viewer__scale">{{ scalePercent }}%</span>
      <el-button size="mini" :disabled="loading" @click="fitWidth">适应宽度</el-button>

      <el-divider direction="vertical" />

      <el-input
        v-model="searchText"
        size="mini"
        placeholder="搜索文本，回车查找"
        clearable
        class="pdf-viewer__search-input"
        :disabled="loading"
        @keyup.enter.native="search"
        @clear="clearSearch"
      />
      <el-button-group>
        <el-button size="mini" icon="el-icon-arrow-up" title="上一个" :disabled="loading || !searchText" @click="findAgain(true)" />
        <el-button size="mini" icon="el-icon-arrow-down" title="下一个" :disabled="loading || !searchText" @click="findAgain(false)" />
      </el-button-group>
      <span v-if="matchTotal > 0" class="pdf-viewer__match">{{ matchCurrent }} / {{ matchTotal }}</span>
      <span v-else-if="searched && searchText" class="pdf-viewer__match pdf-viewer__match--none">无匹配</span>
    </div>

    <div v-loading="loading" class="pdf-viewer__body">
      <!-- pdf.js 要求滚动容器绝对定位;内层 .pdfViewer 由 PDFViewer 接管渲染页面 -->
      <div ref="container" class="pdf-viewer__container">
        <div class="pdfViewer" />
      </div>
      <div v-if="errorMsg" class="pdf-viewer__error">{{ errorMsg }}</div>
    </div>
  </el-dialog>
</template>

<script>
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf'
import { EventBus, PDFLinkService, PDFFindController, PDFViewer } from 'pdfjs-dist/legacy/web/pdf_viewer'
import 'pdfjs-dist/legacy/web/pdf_viewer.css'
import pdfWorkerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.js'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

// CJK 字型映射与标准字体资源(由 vue.config.js CopyWebpackPlugin 随构建发布,中文 PDF 渲染必需)
const PDF_ASSETS_BASE = process.env.BASE_URL + 'static/pdf-assets/'

// 缩放步进与上下限
const ZOOM_STEP = 1.25
const ZOOM_MIN = 0.25
const ZOOM_MAX = 4

export default {
  name: 'PdfViewer',
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
      errorMsg: '',
      // 当前页码
      pageNumber: 1,
      // 总页数
      pageCount: 0,
      // 页码输入框
      pageInput: '1',
      // 当前缩放比例
      scale: 1,
      // 搜索关键词
      searchText: '',
      // 是否已执行过搜索(用于展示"无匹配")
      searched: false,
      // 当前匹配序号 / 匹配总数
      matchCurrent: 0,
      matchTotal: 0
    }
  },
  computed: {
    // 缩放百分比展示
    scalePercent() {
      return Math.round(this.scale * 100)
    }
  },
  beforeDestroy() {
    this.cleanup()
  },
  methods: {
    /** 打开对话框并加载 PDF */
    open(url, title) {
      this.title = title || 'PDF 预览'
      this.errorMsg = ''
      this.visible = true
      // 等对话框体渲染出容器后再初始化 viewer
      this.$nextTick(() => this.load(url))
    },
    /** 初始化 pdf.js viewer(仅首次,后续复用同一实例) */
    initViewer() {
      if (this._viewer) {
        return
      }
      const container = this.$refs.container
      const eventBus = new EventBus()
      const linkService = new PDFLinkService({ eventBus })
      const findController = new PDFFindController({ eventBus, linkService })
      const viewer = new PDFViewer({
        container,
        viewer: container.querySelector('.pdfViewer'),
        eventBus,
        linkService,
        findController
      })
      linkService.setViewer(viewer)
      eventBus.on('pagesinit', () => {
        // 文档就绪后默认适应宽度
        viewer.currentScaleValue = 'page-width'
      })
      eventBus.on('pagechanging', ({ pageNumber }) => {
        this.pageNumber = pageNumber
        this.pageInput = String(pageNumber)
      })
      eventBus.on('scalechanging', ({ scale }) => {
        this.scale = scale
      })
      eventBus.on('updatefindmatchescount', ({ matchesCount }) => this.updateMatches(matchesCount))
      eventBus.on('updatefindcontrolstate', ({ matchesCount }) => this.updateMatches(matchesCount))
      // viewer 相关实例挂非响应式私有属性,避免 Vue 深度代理拖慢渲染
      this._eventBus = eventBus
      this._linkService = linkService
      this._viewer = viewer
    },
    /** 加载文档 */
    async load(url) {
      this.initViewer()
      this.resetDocState()
      this.loading = true
      const task = pdfjsLib.getDocument({
        url,
        cMapUrl: PDF_ASSETS_BASE + 'cmaps/',
        cMapPacked: true,
        standardFontDataUrl: PDF_ASSETS_BASE + 'standard_fonts/',
        // 禁用 eval 执行 PDF 内嵌字体程序(CVE-2024-4367 防护,文件来自用户上传不可信)
        isEvalSupported: false
      })
      this._loadingTask = task
      try {
        const doc = await task.promise
        // 加载完成前对话框已被关闭(cleanup 已 destroy),丢弃结果
        if (this._loadingTask !== task) {
          return
        }
        this._viewer.setDocument(doc)
        this._linkService.setDocument(doc, null)
        this.pageCount = doc.numPages
        this.pageNumber = 1
        this.pageInput = '1'
      } catch (e) {
        // cleanup 触发的取消不算错误
        if (this._loadingTask === task) {
          this.errorMsg = 'PDF 加载失败，请尝试下载后查看'
          console.error('PDF 加载失败', e)
        }
      } finally {
        if (this._loadingTask === task) {
          this.loading = false
        }
      }
    },
    /** 关闭后清理:取消加载、卸载文档、复位状态 */
    cleanup() {
      if (this._loadingTask) {
        this._loadingTask.destroy()
        this._loadingTask = null
      }
      if (this._viewer) {
        this._viewer.setDocument(null)
        this._linkService.setDocument(null, null)
      }
      this.resetDocState()
    },
    /** 复位文档相关状态 */
    resetDocState() {
      this.loading = false
      this.pageNumber = 1
      this.pageCount = 0
      this.pageInput = '1'
      this.scale = 1
      this.searchText = ''
      this.searched = false
      this.matchCurrent = 0
      this.matchTotal = 0
      this._lastQuery = ''
    },
    /** 跳转页码 */
    gotoPage(n) {
      if (!this._viewer || !this.pageCount) {
        return
      }
      this._viewer.currentPageNumber = Math.min(Math.max(1, n), this.pageCount)
    },
    /** 页码输入框确认 */
    onPageInput(value) {
      const n = parseInt(value, 10)
      if (isNaN(n)) {
        this.pageInput = String(this.pageNumber)
        return
      }
      this.gotoPage(n)
      // 越界输入被钳制后回显实际页码
      this.$nextTick(() => {
        this.pageInput = String(this.pageNumber)
      })
    },
    /** 放大 */
    zoomIn() {
      if (this._viewer) {
        this._viewer.currentScale = Math.min(this._viewer.currentScale * ZOOM_STEP, ZOOM_MAX)
      }
    },
    /** 缩小 */
    zoomOut() {
      if (this._viewer) {
        this._viewer.currentScale = Math.max(this._viewer.currentScale / ZOOM_STEP, ZOOM_MIN)
      }
    },
    /** 适应宽度 */
    fitWidth() {
      if (this._viewer) {
        this._viewer.currentScaleValue = 'page-width'
      }
    },
    /** 最大化/还原:容器尺寸变化后让 pdf.js 重新计算布局 */
    toggleMaximize() {
      this.maximized = !this.maximized
      this.$nextTick(() => {
        const viewer = this._viewer
        if (!viewer || !this.pageCount) {
          return
        }
        // 预设缩放(如 page-width)按新容器宽度重排;用户手动定过数值缩放则保持不动
        const preset = viewer.currentScaleValue
        if (preset && isNaN(parseFloat(preset))) {
          viewer.currentScaleValue = preset
        }
        viewer.update()
      })
    },
    /** 搜索:新词发起搜索,同词回车等价"下一个" */
    search() {
      const query = this.searchText
      if (!query) {
        this.clearSearch()
        return
      }
      if (this.searched && this._lastQuery === query) {
        this.findAgain(false)
        return
      }
      this._lastQuery = query
      this.searched = true
      this.dispatchFind('', false)
    },
    /** 上一个/下一个匹配 */
    findAgain(previous) {
      if (!this.searchText) {
        return
      }
      // 关键词已变化则重新发起搜索
      if (!this.searched || this._lastQuery !== this.searchText) {
        this.search()
        return
      }
      this.dispatchFind('again', previous)
    },
    /** 向 findController 派发查找事件 */
    dispatchFind(type, previous) {
      if (!this._eventBus) {
        return
      }
      this._eventBus.dispatch('find', {
        source: this,
        type,
        query: this.searchText,
        phraseSearch: true,
        caseSensitive: false,
        entireWord: false,
        highlightAll: true,
        findPrevious: previous
      })
    },
    /** 清空搜索并撤销高亮 */
    clearSearch() {
      this.searched = false
      this.matchCurrent = 0
      this.matchTotal = 0
      this._lastQuery = ''
      if (this._eventBus) {
        // findbarclose 会让 findController 清除全部高亮
        this._eventBus.dispatch('findbarclose', { source: this })
      }
    },
    /** 更新匹配计数 */
    updateMatches(matchesCount) {
      if (!matchesCount) {
        return
      }
      this.matchCurrent = matchesCount.current || 0
      this.matchTotal = matchesCount.total || 0
    }
  }
}
</script>

<style lang="scss">
@import '@/assets/styles/tokens.scss';
/* 对话框挂 body(append-to-body) */
.pdf-viewer-dialog {
  .el-dialog__body {
    padding: 0;
  }

  /* 标题栏最大化/还原按钮 */
  .pdf-viewer__maximize {
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

    .pdf-viewer__toolbar {
      flex-shrink: 0;
    }

    .pdf-viewer__body {
      flex: 1;
      height: auto;
      min-height: 0;
    }
  }

  .pdf-viewer__toolbar {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    padding: 8px 16px;
    border-bottom: 1px solid #ebeef5;
  }

  .pdf-viewer__pages {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: #606266;
  }

  .pdf-viewer__page-input {
    width: 46px;

    .el-input__inner {
      padding: 0 4px;
      text-align: center;
    }
  }

  .pdf-viewer__scale {
    min-width: 42px;
    font-size: 12px;
    color: #606266;
    text-align: center;
  }

  .pdf-viewer__search-input {
    width: 200px;
  }

  .pdf-viewer__match {
    font-size: 12px;
    color: #909399;

    &--none {
      color: #f56c6c;
    }
  }

  .pdf-viewer__body {
    position: relative;
    height: 74vh;
    background: #e9ebee;
  }

  .pdf-viewer__container {
    position: absolute;
    inset: 0;
    overflow: auto;
  }

  .pdf-viewer__error {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 14px;
    color: #909399;
  }
}
</style>
