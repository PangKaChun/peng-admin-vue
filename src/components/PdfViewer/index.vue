<template>
  <!-- PDF 预览对话框 -->
  <viewer-dialog
    :visible.sync="visible"
    :title="title"
    :loading="loading"
    :message="errorMsg"
    dialog-class="pdf-viewer-dialog"
    @closed="discard"
    @maximize="relayout"
  >
    <template slot="toolbar">
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
    </template>

    <!-- pdf.js 要求滚动容器绝对定位 -->
    <div v-show="!errorMsg" ref="container" class="pdf-viewer__container">
      <div class="pdfViewer" />
    </div>
  </viewer-dialog>
</template>

<script>
import viewer from '@/components/ViewerDialog/viewer'

// 缩放步进与上下限
const ZOOM_STEP = 1.25
const ZOOM_MIN = 0.25
const ZOOM_MAX = 4

export default {
  name: 'PdfViewer',
  mixins: [viewer({ title: 'PDF 预览', failText: 'PDF 加载失败，请尝试下载后查看' })],
  data() {
    return {
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
  methods: {
    /** 加载并显示文档 */
    async renderFile(blob, isStale) {
      // pdf.js(./pdfjs)首次预览 PDF 时才加载
      const [buffer, pdfjs] = await Promise.all([
        blob.arrayBuffer(),
        import(/* webpackChunkName: "viewer-pdf" */ './pdfjs')
      ])
      if (isStale()) {
        return
      }
      this.initViewer(pdfjs)
      const task = pdfjs.loadDocument(new Uint8Array(buffer))
      this._loadingTask = task
      const doc = await task.promise
      // 加载完成前对话框已被关闭(resetViewer 已 destroy 这次加载),丢弃结果
      if (isStale()) {
        return
      }
      this._viewer.setDocument(doc)
      this._linkService.setDocument(doc, null)
      this.pageCount = doc.numPages
    },
    /** 初始化 pdf.js viewer,整个组件生命周期只建一次 */
    initViewer(pdfjs) {
      if (this._viewer) {
        return
      }
      const { eventBus, linkService, viewer } = pdfjs.createViewer(this.$refs.container)
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
    /** 中止加载、卸下文档并复位文档相关状态 */
    resetViewer() {
      if (this._loadingTask) {
        this._loadingTask.destroy()
        this._loadingTask = null
      }
      if (this._viewer) {
        this._viewer.setDocument(null)
        this._linkService.setDocument(null, null)
      }
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
    /** 最大化/还原后,等对话框换完尺寸再按新容器宽度重排 */
    relayout() {
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
    /** 搜索 */
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
.pdf-viewer-dialog {
  .viewer-dialog__body {
    background: #e9ebee;
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

  .pdf-viewer__container {
    position: absolute;
    inset: 0;
    overflow: auto;
  }
}
</style>
