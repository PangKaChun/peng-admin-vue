<template>
  <!-- Excel 预览对话框 -->
  <viewer-dialog
    :visible.sync="visible"
    :title="title"
    :loading="loading"
    :message="message"
    dialog-class="excel-viewer-dialog"
    @closed="discard"
  >
    <template slot="toolbar">
      <el-button-group>
        <el-button size="mini" icon="el-icon-minus" title="缩小" :disabled="!hasSheet" @click="zoomOut" />
        <el-button size="mini" icon="el-icon-plus" title="放大" :disabled="!hasSheet" @click="zoomIn" />
      </el-button-group>
      <span class="excel-viewer__scale">{{ zoomPercent }}%</span>
      <el-button size="mini" :disabled="!hasSheet" @click="resetZoom">实际大小</el-button>

      <el-divider direction="vertical" />

      <el-input
        v-model="searchText"
        size="mini"
        placeholder="查找内容，回车定位"
        clearable
        class="excel-viewer__search-input"
        :disabled="!hasSheet"
        @keyup.enter.native="search"
        @clear="clearSearch"
      />
      <el-button-group>
        <el-button size="mini" icon="el-icon-arrow-up" title="上一个" :disabled="!matchTotal" @click="findAgain(true)" />
        <el-button size="mini" icon="el-icon-arrow-down" title="下一个" :disabled="!matchTotal" @click="findAgain(false)" />
      </el-button-group>
      <span v-if="matchTotal" class="excel-viewer__match">{{ matchCurrent }} / {{ matchTotal }}</span>
      <span v-else-if="searched" class="excel-viewer__match excel-viewer__match--none">无匹配</span>

      <span v-if="truncated" class="excel-viewer__truncated">
        <i class="el-icon-warning-outline" /> 内容过大，仅预览前 {{ maxRows }} 行 × {{ maxCols }} 列
      </span>
    </template>

    <!-- 编辑栏 -->
    <div slot="before" class="excel-viewer__formula">
      <span class="excel-viewer__addr">{{ selectedAddr }}</span>
      <span class="excel-viewer__value" :title="selectedText">{{ selectedText }}</span>
    </div>

    <!-- 可聚焦才收得到方向键;点击走委托,不给上万个格子挂监听 -->
    <!-- eslint-disable-next-line vue/no-v-html -->
    <div
      v-if="hasSheet"
      ref="sheet"
      class="excel-viewer__sheet"
      :style="sheetStyle"
      tabindex="0"
      @click="onCellClick"
      @keydown="onKeydown"
      v-html="sheetHtml"
    />

    <!-- 底部工作表标签 -->
    <div v-if="sheetNames.length" slot="after" class="excel-viewer__tabs">
      <div class="excel-viewer__tab-list">
        <button
          v-for="name in sheetNames"
          :key="name"
          type="button"
          class="excel-viewer__tab"
          :class="{ 'is-active': name === activeSheet }"
          :title="name"
          @click="selectSheet(name)"
        >{{ name }}</button>
      </div>
      <span v-if="dimensionText" class="excel-viewer__dimension">{{ dimensionText }}</span>
    </div>
  </viewer-dialog>
</template>

<script>
import viewer from '@/components/ViewerDialog/viewer'

// 超大表保护:超过该行列数只解析、渲染左上区域
const MAX_ROWS = 1000
const MAX_COLS = 100
// 缩放步进与上下限
const ZOOM_STEP = 0.1
const ZOOM_MIN = 0.5
const ZOOM_MAX = 2
// 命中高亮上限,超出的仍可跳转,只是不铺底色
const MAX_HIGHLIGHT = 500
// 键盘移动跨越合并区的最大试探步数
const MAX_STEP_PROBE = 64
// 方向键 → [行增量, 列增量]
const ARROW_DELTAS = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }

// SheetJS 与表格拼装逻辑(./grid)首次预览 Excel 时才加载,加载后留在模块变量里
let grid = null
function loadGrid() {
  return import(/* webpackChunkName: "viewer-excel" */ './grid').then(mod => {
    grid = mod
  })
}

export default {
  name: 'ExcelViewer',
  mixins: [viewer({ title: 'Excel 预览', failText: 'Excel 加载失败，请尝试下载后查看' })],
  data() {
    return {
      // 工作表名列表
      sheetNames: [],
      // 当前工作表
      activeSheet: '',
      // 当前工作表渲染出的 HTML
      sheetHtml: '',
      // 是否触发超大表截断
      truncated: false,
      // 截断阈值
      maxRows: MAX_ROWS,
      maxCols: MAX_COLS,
      // 底部尺寸提示(当前工作表总行列数)
      dimensionText: '',
      // 显示比例
      zoom: 1,
      // 选中单元格地址与完整内容
      selectedAddr: '',
      selectedText: '',
      // 查找关键词
      searchText: '',
      // 是否已执行过查找(用于展示"无匹配")
      searched: false,
      // 当前命中序号 / 命中总数
      matchCurrent: 0,
      matchTotal: 0
    }
  },
  computed: {
    // 是否有可操作的表格内容
    hasSheet() {
      return !!this.sheetHtml
    },
    // 预览区居中提示:加载失败,或当前工作表没有内容
    message() {
      if (this.errorMsg) {
        return this.errorMsg
      }
      return !this.loading && !this.hasSheet ? '该工作表为空' : ''
    },
    // 缩放百分比展示
    zoomPercent() {
      return Math.round(this.zoom * 100)
    },
    // 表格缩放
    sheetStyle() {
      return { zoom: String(this.zoom) }
    }
  },
  methods: {
    /** 解析工作簿并渲染首个工作表 */
    async renderFile(blob, isStale) {
      const [buffer] = await Promise.all([blob.arrayBuffer(), loadGrid()])
      if (isStale()) {
        return
      }
      // 解析结果挂非响应式私有属性,避免 Vue 深度代理大对象
      const workbook = grid.readWorkbook(buffer, MAX_ROWS)
      this._workbook = workbook
      this.sheetNames = workbook.SheetNames
      this.selectSheet(workbook.SheetNames[0] || '')
    },
    // 不走 watch,换文件后首个工作表同名时它不会触发
    selectSheet(name) {
      this.activeSheet = name
      this.renderSheet()
    },
    /** 当前工作表对象 */
    currentSheet() {
      const workbook = this._workbook
      return workbook && this.activeSheet ? workbook.Sheets[this.activeSheet] : null
    },
    /** 渲染当前工作表 */
    renderSheet() {
      this.resetSheetState()
      // 行列索引随 HTML 一起算出,选中与查找靠它定位,挂非响应式私有属性
      const layout = grid.layoutSheet(this.currentSheet(), MAX_ROWS, MAX_COLS)
      this._layout = layout
      if (!layout) {
        return
      }
      this.truncated = layout.truncated
      // 没记录总行数的格式(CSV 等)只知道超过了上限
      const rows = layout.moreRows ? '超过 ' + MAX_ROWS : layout.totalRows
      this.dimensionText = rows + ' 行 × ' + layout.totalCols + ' 列'
      this.sheetHtml = layout.html
      // 命中集与工作表绑定,切表后按同一关键词重查
      if (this.searchText.trim()) {
        this.$nextTick(() => this.runSearch())
      }
    },

    /** 点击单元格 */
    onCellClick(e) {
      const td = e.target && e.target.closest ? e.target.closest('td[data-r]') : null
      if (!td) {
        return
      }
      this.selectCell(Number(td.dataset.r), Number(td.dataset.c), td)
    },
    /** 方向键在可见行列间移动选区 */
    onKeydown(e) {
      const delta = ARROW_DELTAS[e.key]
      const layout = this._layout
      if (!delta || !this._cursor || !layout) {
        return
      }
      e.preventDefault()
      const from = this._cursor
      let ri = layout.rowPos[from.r]
      let ci = layout.colPos[from.c]
      if (ri == null || ci == null) {
        return
      }
      // 落点可能还在同一个合并区内,沿同方向继续试探直到换格
      for (let step = 0; step < MAX_STEP_PROBE; step++) {
        const nri = ri + delta[0]
        const nci = ci + delta[1]
        if (nri < 0 || nri >= layout.visRows.length || nci < 0 || nci >= layout.visCols.length) {
          return
        }
        ri = nri
        ci = nci
        const td = this.findCell(layout.visRows[ri], layout.visCols[ci])
        if (!td) {
          continue
        }
        const r = Number(td.dataset.r)
        const c = Number(td.dataset.c)
        if (r === from.r && c === from.c) {
          continue
        }
        this.selectCell(r, c, td)
        td.scrollIntoView({ block: 'nearest', inline: 'nearest' })
        return
      }
    },
    /** 选中单元格 */
    selectCell(r, c, el) {
      const td = el || this.findCell(r, c)
      if (!td) {
        return
      }
      this.clearSelection()
      td.classList.add('is-selected')
      this._selectedEl = td
      const rowHead = this.rowHeadEl(r)
      if (rowHead) {
        rowHead.classList.add('is-active')
        this._rowHeadEl = rowHead
      }
      const colHead = this.colHeadEl(c)
      if (colHead) {
        colHead.classList.add('is-active')
        this._colHeadEl = colHead
      }
      this._cursor = { r: r, c: c }
      this.selectedAddr = grid.cellAddress(r, c)
      const sheet = this.currentSheet()
      const cell = sheet ? grid.cellAt(sheet, r, c) : null
      // 有公式就显示公式,跟 Excel 编辑栏一致
      this.selectedText = cell && cell.f ? '=' + cell.f : td.textContent
    },
    /** 撤销选中高亮 */
    clearSelection() {
      if (this._selectedEl) {
        this._selectedEl.classList.remove('is-selected')
        this._selectedEl = null
      }
      if (this._rowHeadEl) {
        this._rowHeadEl.classList.remove('is-active')
        this._rowHeadEl = null
      }
      if (this._colHeadEl) {
        this._colHeadEl.classList.remove('is-active')
        this._colHeadEl = null
      }
    },
    /** 表格根节点 */
    gridEl() {
      return this.$refs.sheet ? this.$refs.sheet.querySelector('.excel-grid') : null
    },
    /** 第 r 行对应的 tr,行被隐藏或超出预览范围时返回 null */
    rowEl(r) {
      const table = this.gridEl()
      const ri = this._layout ? this._layout.rowPos[r] : null
      if (!table || ri == null || !table.tBodies[0]) {
        return null
      }
      return table.tBodies[0].rows[ri] || null
    },
    // 一行最多 MAX_COLS 个格子,线性扫就够
    // 横向合并区内的坐标会返回锚点格子,纵向被覆盖的行返回 null
    findCell(r, c) {
      const tr = this.rowEl(r)
      if (!tr) {
        return null
      }
      // 下标 0 是行号侧栏,从 1 开始扫
      for (let i = 1; i < tr.cells.length; i++) {
        const td = tr.cells[i]
        const start = Number(td.dataset.c)
        if (start === c || (start < c && start + (td.colSpan || 1) > c)) {
          return td
        }
      }
      return null
    },
    /** 行号侧栏节点 */
    rowHeadEl(r) {
      const tr = this.rowEl(r)
      return tr ? tr.cells[0] : null
    },
    /** 列标表头节点 */
    colHeadEl(c) {
      const table = this.gridEl()
      if (!table || !table.tHead) {
        return null
      }
      const cells = table.tHead.rows[0].cells
      for (let i = 1; i < cells.length; i++) {
        if (Number(cells[i].dataset.c) === c) {
          return cells[i]
        }
      }
      return null
    },

    /** 查找 */
    search() {
      const query = this.searchText.trim()
      if (!query) {
        this.clearSearch()
        return
      }
      if (this.searched && this._lastQuery === query) {
        this.findAgain(false)
        return
      }
      this.runSearch()
    },
    /** 按当前关键词重新查找并定位到首个命中 */
    runSearch() {
      const query = this.searchText.trim()
      const sheet = this.currentSheet()
      if (!query || !sheet || !this._layout) {
        this.clearSearch()
        return
      }
      const matches = grid.findMatches(sheet, this._layout, query)
      this._lastQuery = query
      this._matches = matches
      this.searched = true
      this.matchTotal = matches.length
      this.matchCurrent = 0
      this.applyHighlight()
      if (matches.length) {
        this.gotoMatch(0)
      }
    },
    /** 上一个 / 下一个命中 */
    findAgain(previous) {
      const total = this._matches ? this._matches.length : 0
      if (!total) {
        return
      }
      const next = (this.matchCurrent - 1 + (previous ? -1 : 1) + total) % total
      this.gotoMatch(next)
    },
    /** 跳转到第 index 个命中 */
    gotoMatch(index) {
      const match = this._matches[index]
      if (!match) {
        return
      }
      this.matchCurrent = index + 1
      const td = this.findCell(match.r, match.c)
      if (!td) {
        return
      }
      if (this._currentMatchEl) {
        this._currentMatchEl.classList.remove('is-current-match')
      }
      td.classList.add('is-current-match')
      this._currentMatchEl = td
      this.selectCell(match.r, match.c, td)
      td.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    },
    /** 铺命中底色 */
    applyHighlight() {
      this.clearHighlight()
      const matches = this._matches || []
      const limit = Math.min(matches.length, MAX_HIGHLIGHT)
      const els = []
      for (let i = 0; i < limit; i++) {
        const td = this.findCell(matches[i].r, matches[i].c)
        if (td) {
          td.classList.add('is-match')
          els.push(td)
        }
      }
      this._matchEls = els
    },
    /** 清掉命中底色 */
    clearHighlight() {
      if (this._matchEls) {
        for (let i = 0; i < this._matchEls.length; i++) {
          this._matchEls[i].classList.remove('is-match')
        }
      }
      this._matchEls = []
      if (this._currentMatchEl) {
        this._currentMatchEl.classList.remove('is-current-match')
        this._currentMatchEl = null
      }
    },
    /** 清空查找状态 */
    clearSearch() {
      this.clearHighlight()
      this._matches = []
      this._lastQuery = ''
      this.searched = false
      this.matchCurrent = 0
      this.matchTotal = 0
    },

    /** 放大 */
    zoomIn() {
      this.setZoom(this.zoom + ZOOM_STEP)
    },
    /** 缩小 */
    zoomOut() {
      this.setZoom(this.zoom - ZOOM_STEP)
    },
    /** 还原为实际大小 */
    resetZoom() {
      this.zoom = 1
    },
    /** 设置显示比例,取两位小数并钳制在上下限内 */
    setZoom(value) {
      this.zoom = Math.min(Math.max(Math.round(value * 100) / 100, ZOOM_MIN), ZOOM_MAX)
    },
    /** 释放工作簿并复位整体状态 */
    resetViewer() {
      this._workbook = null
      this.sheetNames = []
      this.activeSheet = ''
      this.zoom = 1
      this.searchText = ''
      this.resetSheetState()
    },
    /** 复位与当前工作表绑定的状态 */
    resetSheetState() {
      this.clearSelection()
      this.clearSearch()
      this.sheetHtml = ''
      this.truncated = false
      this.dimensionText = ''
      this.selectedAddr = ''
      this.selectedText = ''
      this._cursor = null
      this._layout = null
    }
  }
}
</script>

<style lang="scss">
@import '@/assets/styles/tokens.scss';

.excel-viewer-dialog {
  .excel-viewer__scale {
    min-width: 42px;
    font-size: 12px;
    color: #606266;
    text-align: center;
  }

  .excel-viewer__search-input {
    width: 200px;
  }

  .excel-viewer__match {
    font-size: 12px;
    color: #909399;

    &--none {
      color: $color-danger;
    }
  }

  .excel-viewer__truncated {
    font-size: 12px;
    color: $color-warning;
  }

  /* 编辑栏 */
  .excel-viewer__formula {
    display: flex;
    align-items: center;
    height: 30px;
    padding: 0 $space-4 0 0;
    border-bottom: 1px solid #ebeef5;
    background: $bg-base;
    font-size: 12px;
  }

  .excel-viewer__addr {
    flex-shrink: 0;
    width: 92px;
    padding: 0 $space-2;
    border-right: 1px solid $separator-light;
    color: $label-secondary;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    text-align: center;
    line-height: 30px;
    user-select: none;
  }

  .excel-viewer__value {
    flex: 1;
    min-width: 0;
    padding-left: $space-3;
    overflow: hidden;
    color: $label;
    white-space: nowrap;
    text-overflow: ellipsis;
    user-select: text;
  }

  /* 扣掉标题栏 + 工具栏 + 编辑栏 + 标签条的高度,工具栏窄屏会折两行 */
  .viewer-dialog__body {
    height: calc(92vh - 190px);
    min-height: 180px;
    background: $bg-grouped;
  }

  .excel-viewer__sheet {
    padding: $space-3;
    outline: none;
  }

  /* Excel 风格表格 */
  .excel-grid {
    table-layout: fixed;
    border-collapse: separate;
    border-spacing: 0;
    border-top: 1px solid $separator;
    border-left: 1px solid $separator;
    background: $bg-base;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
    font-size: 12px;
    color: $label;

    th,
    td {
      border-right: 1px solid $separator;
      border-bottom: 1px solid $separator;
    }

    td {
      padding: 3px 8px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      vertical-align: middle;
      /* 给吸附的行列头让位 */
      scroll-margin-top: 26px;
      scroll-margin-left: 52px;
    }

    /* 数字 / 日期右对齐 + 等宽数字 */
    td.is-num {
      text-align: right;
      font-variant-numeric: tabular-nums;
    }

    td.is-bool {
      text-align: center;
    }

    td.is-err {
      color: $color-danger;
      text-align: center;
    }

    /* 合并格常放标题 */
    td.is-merged {
      white-space: normal;
      text-align: center;
    }

    a {
      color: $color-primary;
      text-decoration: none;

      &:hover {
        text-decoration: underline;
      }
    }
  }

  /* 列标表头,吸顶冻结 */
  .excel-grid__head th {
    position: sticky;
    top: 0;
    z-index: 2;
    height: 22px;
    padding: 2px 6px;
    overflow: hidden;
    background: $fill-quaternary;
    font-weight: 600;
    color: $label-secondary;
    text-align: center;
    white-space: nowrap;
    user-select: none;
  }

  /* 行号侧栏,吸左冻结 */
  .excel-grid__rownum {
    position: sticky;
    left: 0;
    z-index: 1;
    padding: 2px 6px;
    background: $fill-quaternary;
    font-weight: 400;
    color: $label-tertiary;
    text-align: center;
    white-space: nowrap;
    user-select: none;
  }

  /* 左上角同时吸顶吸左,选择器要压过 .excel-grid__head th 的 z-index */
  .excel-grid__head th.excel-grid__corner {
    left: 0;
    z-index: 3;
  }

  /* 斑马纹,原表填充色是内联样式,盖不掉 */
  .excel-grid tbody tr:nth-child(even) td {
    background: #fafafb;
  }

  /* 悬停整行,用内阴影叠色留住原表填充色 */
  .excel-grid tbody tr:hover td {
    box-shadow: inset 0 0 0 999px rgba($color-primary, 0.05);
  }

  /* 选中格与行号 / 列标联动 */
  .excel-grid td.is-selected {
    position: relative;
    z-index: 1;
    outline: 2px solid $color-primary;
    outline-offset: -2px;
  }

  .excel-grid .excel-grid__rownum.is-active,
  .excel-grid__head th.is-active {
    background: rgba($color-primary, 0.1);
    color: $color-primary;
  }

  /* 查找命中,特异性和顺序都要排在行悬停之后 */
  .excel-grid tbody tr td.is-match {
    box-shadow: inset 0 0 0 999px rgba($color-warning, 0.25);
  }

  .excel-grid tbody tr td.is-current-match {
    box-shadow: inset 0 0 0 999px rgba($color-warning, 0.55);
  }

  /* 底部工作表标签 */
  .excel-viewer__tabs {
    display: flex;
    align-items: center;
    gap: $space-3;
    padding: 0 $space-4;
    border-top: 1px solid #ebeef5;
    background: $fill-quaternary;
  }

  .excel-viewer__tab-list {
    display: flex;
    flex: 1;
    min-width: 0;
    overflow-x: auto;
    scrollbar-width: thin;
  }

  .excel-viewer__tab {
    flex-shrink: 0;
    max-width: 160px;
    height: 30px;
    padding: 0 $space-3;
    border: none;
    border-right: 1px solid $separator-light;
    outline: none;
    background: transparent;
    overflow: hidden;
    color: $label-secondary;
    font-size: 12px;
    white-space: nowrap;
    text-overflow: ellipsis;
    cursor: pointer;
    transition: background $duration-fast ease, color $duration-fast ease;

    &:hover {
      color: $label;
      background: rgba($color-primary, 0.06);
    }

    &.is-active {
      background: $bg-base;
      color: $color-primary;
      font-weight: 600;
      box-shadow: inset 0 2px 0 0 $color-primary;
    }
  }

  .excel-viewer__dimension {
    flex-shrink: 0;
    font-size: 12px;
    color: $label-tertiary;
    user-select: none;
  }
}
</style>
