<template>
  <!-- Excel 预览对话框 -->
  <el-dialog
    :visible.sync="visible"
    :fullscreen="maximized"
    width="72%"
    top="4vh"
    append-to-body
    custom-class="excel-viewer-dialog"
    @closed="cleanup"
  >
    <!-- 自定义标题栏 -->
    <div slot="title" class="excel-viewer__header" @dblclick="toggleMaximize">
      <span class="el-dialog__title">{{ title }}</span>
      <button
        type="button"
        class="excel-viewer__maximize"
        :title="maximized ? '还原' : '最大化'"
        @click="toggleMaximize"
      >
        <i :class="maximized ? 'el-icon-copy-document' : 'el-icon-full-screen'" />
      </button>
    </div>

    <div class="excel-viewer__toolbar">
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
    </div>

    <!-- 编辑栏 -->
    <div class="excel-viewer__formula">
      <span class="excel-viewer__addr">{{ selectedAddr }}</span>
      <span class="excel-viewer__value" :title="selectedText">{{ selectedText }}</span>
    </div>

    <div
      ref="body"
      v-loading="loading"
      class="excel-viewer__body"
      tabindex="0"
      @click="onCellClick"
      @keydown="onKeydown"
    >
      <div v-if="errorMsg" class="excel-viewer__error">{{ errorMsg }}</div>
      <div v-else-if="!loading && !sheetHtml" class="excel-viewer__empty">该工作表为空</div>
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div v-else ref="sheet" class="excel-viewer__sheet" :style="sheetStyle" v-html="sheetHtml" />
    </div>

    <!-- 底部工作表标签 -->
    <div v-if="sheetNames.length" class="excel-viewer__tabs">
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
  </el-dialog>
</template>

<script>
import * as XLSX from 'xlsx'

// 超大表保护:超过该行列数只渲染左上区域
const MAX_ROWS = 1000
const MAX_COLS = 100
// 列宽 / 行高兜底与钳制范围(px)
const DEFAULT_COL_WIDTH = 80
const MIN_COL_WIDTH = 40
const MAX_COL_WIDTH = 400
const DEFAULT_ROW_HEIGHT = 26
const MIN_ROW_HEIGHT = 22
const MAX_ROW_HEIGHT = 120
// 缩放步进与上下限
const ZOOM_STEP = 0.1
const ZOOM_MIN = 0.5
const ZOOM_MAX = 2
// 命中高亮上限,超出的仍可跳转,只是不铺底色
const MAX_HIGHLIGHT = 500
// 键盘移动跨越合并区的最大试探步数
const MAX_STEP_PROBE = 64
// Excel 单表最大列数
const COL_BASE = 16384

const HTML_ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }
// 超链接协议白名单,挡住 javascript: 等伪协议
const SAFE_LINK_RE = /^(?:https?:|mailto:)/i

/** HTML 转义 */
function escapeHtml(text) {
  return String(text).replace(/[&<>"]/g, ch => HTML_ENTITIES[ch])
}

/** 数值钳制 */
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

/** 行列坐标 → 数字键 */
function cellKey(r, c) {
  return r * COL_BASE + c
}

/** 读取单元格 */
function cellAt(sheet, r, c) {
  const data = sheet['!data']
  if (data) {
    const row = data[r]
    return row ? row[c] : undefined
  }
  return sheet[XLSX.utils.encode_cell({ r: r, c: c })]
}

/** 单元格展示文本,w 是 SheetJS 按数字格式渲染好的 */
function cellText(cell) {
  if (!cell) {
    return ''
  }
  if (cell.w != null) {
    return cell.w
  }
  return cell.v != null ? cell.v : ''
}

// SheetJS 社区版只解析 Fills,字体与对齐样式拿不到
function fillHex(cell) {
  const style = cell && cell.s
  if (!style || !style.patternType || style.patternType === 'none') {
    return ''
  }
  const rgb = (style.fgColor && style.fgColor.rgb) || ''
  // 可能是 ARGB(8 位),取后 6 位
  const hex = rgb.length === 8 ? rgb.slice(2) : rgb
  // 纯白填充跳过,留给斑马纹
  if (!/^[0-9a-fA-F]{6}$/.test(hex) || hex.toUpperCase() === 'FFFFFF') {
    return ''
  }
  return hex
}

/** 深色填充上反白文字 */
function isDarkHex(hex) {
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
  return 0.299 * r + 0.587 * g + 0.114 * b < 140
}

/** 列宽 */
function colWidthPx(colInfo) {
  let px = DEFAULT_COL_WIDTH
  if (colInfo) {
    if (colInfo.wpx) {
      px = colInfo.wpx
    } else if (colInfo.wch) {
      px = colInfo.wch * 7 + 5
    }
  }
  return clamp(Math.round(px), MIN_COL_WIDTH, MAX_COL_WIDTH)
}

/** 行高 */
function rowHeightPx(rowInfo) {
  const px = rowInfo && rowInfo.hpx ? rowInfo.hpx : DEFAULT_ROW_HEIGHT
  return clamp(Math.round(px), MIN_ROW_HEIGHT, MAX_ROW_HEIGHT)
}

export default {
  name: 'ExcelViewer',
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
      // 当前工作表总行列数
      totalRows: 0,
      totalCols: 0,
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
    // 缩放百分比展示
    zoomPercent() {
      return Math.round(this.zoom * 100)
    },
    // 表格缩放
    sheetStyle() {
      return { zoom: String(this.zoom) }
    },
    // 底部尺寸提示
    dimensionText() {
      return this.totalRows ? this.totalRows + ' 行 × ' + this.totalCols + ' 列' : ''
    }
  },
  beforeDestroy() {
    this.cleanup()
  },
  methods: {
    /** 打开对话框并加载 Excel,source 为 Blob 或 Promise<Blob> */
    open(source, title) {
      this.title = title || 'Excel 预览'
      this.visible = true
      this.load(source)
    },
    /** 拉取并解析工作簿 */
    async load(source) {
      this.resetState()
      this.loading = true
      try {
        const buf = await (await source).arrayBuffer()
        // cellStyles 才会解析出列宽 / 行高 / 隐藏标记与填充色
        const workbook = XLSX.read(buf, { dense: true, cellStyles: true, cellHTML: false })
        // 解析结果挂非响应式私有属性,避免 Vue 深度代理大对象
        this._workbook = workbook
        this.sheetNames = workbook.SheetNames
        this.selectSheet(workbook.SheetNames[0] || '')
      } catch (e) {
        console.error('Excel 加载失败', e)
        this.errorMsg = 'Excel 加载失败，请尝试下载后查看'
      } finally {
        this.loading = false
      }
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
      const sheet = this.currentSheet()
      if (!sheet || !sheet['!ref']) {
        this.sheetHtml = ''
        return
      }
      const fullRange = XLSX.utils.decode_range(sheet['!ref'])
      this.totalRows = fullRange.e.r - fullRange.s.r + 1
      this.totalCols = fullRange.e.c - fullRange.s.c + 1
      let range = fullRange
      // 超大表只渲染左上区域
      if (this.totalRows > MAX_ROWS || this.totalCols > MAX_COLS) {
        this.truncated = true
        range = {
          s: fullRange.s,
          e: {
            r: Math.min(fullRange.e.r, fullRange.s.r + MAX_ROWS - 1),
            c: Math.min(fullRange.e.c, fullRange.s.c + MAX_COLS - 1)
          }
        }
      }
      this._range = range
      this.sheetHtml = this.buildHtml(sheet, range)
      // 命中集与工作表绑定,切表后按同一关键词重查
      if (this.searchText.trim()) {
        this.$nextTick(() => this.runSearch())
      }
    },
    /**
     * 拼出带列标(A/B/C…)与行号侧栏的表格
     *
     * 不走 sheet_to_html,自己拼才能还原列宽行高、跳过隐藏行列、渲染填充色,
     * 并给每格打上 data-r / data-c 供选中与查找定位。
     */
    buildHtml(sheet, range) {
      const cols = sheet['!cols'] || []
      const rows = sheet['!rows'] || []
      // 原表隐藏的行列不渲染
      const visRows = []
      const rowPos = {}
      for (let r = range.s.r; r <= range.e.r; r++) {
        if (!(rows[r] && rows[r].hidden)) {
          rowPos[r] = visRows.length
          visRows.push(r)
        }
      }
      const visCols = []
      const colPos = {}
      for (let c = range.s.c; c <= range.e.c; c++) {
        if (!(cols[c] && cols[c].hidden)) {
          colPos[c] = visCols.length
          visCols.push(c)
        }
      }
      this._visRows = visRows
      this._visCols = visCols
      this._rowPos = rowPos
      this._colPos = colPos
      if (!visRows.length || !visCols.length) {
        return ''
      }

      const { covered, spans } = this.resolveMerges(sheet, range, rowPos, colPos)
      this._covered = covered

      // 行号列宽度随最大行号位数增长
      const gutter = Math.max(46, String(range.e.r + 1).length * 9 + 16)
      const widths = [gutter]
      let totalWidth = gutter
      for (let i = 0; i < visCols.length; i++) {
        const width = colWidthPx(cols[visCols[i]])
        widths.push(width)
        totalWidth += width
      }
      // 定宽布局下宽度必须写死,否则窄表会被拉伸铺满容器,列宽就失真了
      const parts = ['<table class="excel-grid" style="width:', totalWidth, 'px"><colgroup>']
      for (let i = 0; i < widths.length; i++) {
        parts.push('<col style="width:', widths[i], 'px">')
      }
      parts.push('</colgroup><thead><tr class="excel-grid__head"><th class="excel-grid__corner"></th>')
      for (let i = 0; i < visCols.length; i++) {
        parts.push('<th data-c="', visCols[i], '">', XLSX.utils.encode_col(visCols[i]), '</th>')
      }
      parts.push('</tr></thead><tbody>')

      for (let ri = 0; ri < visRows.length; ri++) {
        const r = visRows[ri]
        parts.push('<tr style="height:', rowHeightPx(rows[r]), 'px"><th class="excel-grid__rownum">', r + 1, '</th>')
        for (let ci = 0; ci < visCols.length; ci++) {
          const c = visCols[ci]
          const key = cellKey(r, c)
          if (covered.has(key)) {
            continue
          }
          const span = spans.get(key)
          const cell = span ? cellAt(sheet, span.vr, span.vc) : cellAt(sheet, r, c)
          parts.push(this.buildCell(cell, r, c, span))
        }
        parts.push('</tr>')
      }
      parts.push('</tbody></table>')
      return parts.join('')
    },
    // 跨度按可见行列数算,合并区里夹着隐藏行列时才不会多占格
    resolveMerges(sheet, range, rowPos, colPos) {
      const covered = new Set()
      const spans = new Map()
      const merges = sheet['!merges'] || []
      for (let i = 0; i < merges.length; i++) {
        const m = merges[i]
        const sr = Math.max(m.s.r, range.s.r)
        const er = Math.min(m.e.r, range.e.r)
        const sc = Math.max(m.s.c, range.s.c)
        const ec = Math.min(m.e.c, range.e.c)
        if (sr > er || sc > ec) {
          continue
        }
        let anchorR = -1
        let rs = 0
        for (let r = sr; r <= er; r++) {
          if (rowPos[r] != null) {
            rs++
            if (anchorR < 0) {
              anchorR = r
            }
          }
        }
        let anchorC = -1
        let cs = 0
        for (let c = sc; c <= ec; c++) {
          if (colPos[c] != null) {
            cs++
            if (anchorC < 0) {
              anchorC = c
            }
          }
        }
        for (let r = sr; r <= er; r++) {
          for (let c = sc; c <= ec; c++) {
            covered.add(cellKey(r, c))
          }
        }
        // 合并区整体落在隐藏行 / 列里,全部当覆盖处理
        if (anchorR < 0 || anchorC < 0) {
          continue
        }
        covered.delete(cellKey(anchorR, anchorC))
        spans.set(cellKey(anchorR, anchorC), { rs: rs, cs: cs, vr: m.s.r, vc: m.s.c })
      }
      return { covered: covered, spans: spans }
    },
    /** 拼单个单元格 */
    buildCell(cell, r, c, span) {
      let cls = 'excel-grid__cell'
      let style = ''
      if (cell) {
        if (cell.t === 'n' || cell.t === 'd') {
          cls += ' is-num'
        } else if (cell.t === 'b') {
          cls += ' is-bool'
        } else if (cell.t === 'e') {
          cls += ' is-err'
        }
        const hex = fillHex(cell)
        if (hex) {
          style = 'background:#' + hex + ';'
          if (isDarkHex(hex)) {
            style += 'color:#fff;'
          }
        }
      }
      let attrs = ' data-r="' + r + '" data-c="' + c + '"'
      if (span && (span.rs > 1 || span.cs > 1)) {
        cls += ' is-merged'
        if (span.rs > 1) {
          attrs += ' rowspan="' + span.rs + '"'
        }
        if (span.cs > 1) {
          attrs += ' colspan="' + span.cs + '"'
        }
      }
      let content = escapeHtml(cellText(cell))
      const link = cell && cell.l && cell.l.Target ? String(cell.l.Target).trim() : ''
      if (link && SAFE_LINK_RE.test(link)) {
        content = '<a href="' + escapeHtml(link) + '" target="_blank" rel="noopener noreferrer">' + content + '</a>'
      }
      return '<td class="' + cls + '"' + attrs + (style ? ' style="' + style + '"' : '') + '>' + content + '</td>'
    },

    // 走委托,不给上万个格子挂监听
    onCellClick(e) {
      const td = e.target && e.target.closest ? e.target.closest('td[data-r]') : null
      if (!td) {
        return
      }
      this.selectCell(Number(td.dataset.r), Number(td.dataset.c), td)
    },
    /** 方向键在可见行列间移动选区 */
    onKeydown(e) {
      const deltas = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }
      const delta = deltas[e.key]
      if (!delta || !this._cursor) {
        return
      }
      e.preventDefault()
      const from = this._cursor
      let ri = this._rowPos[from.r]
      let ci = this._colPos[from.c]
      if (ri == null || ci == null) {
        return
      }
      // 落点可能还在同一个合并区内,沿同方向继续试探直到换格
      for (let step = 0; step < MAX_STEP_PROBE; step++) {
        const nri = ri + delta[0]
        const nci = ci + delta[1]
        if (nri < 0 || nri >= this._visRows.length || nci < 0 || nci >= this._visCols.length) {
          return
        }
        ri = nri
        ci = nci
        const td = this.findCell(this._visRows[ri], this._visCols[ci])
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
      this.selectedAddr = XLSX.utils.encode_cell({ r: r, c: c })
      const sheet = this.currentSheet()
      const cell = sheet ? cellAt(sheet, r, c) : null
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
    // 行下标查 _rowPos,行内一行最多 MAX_COLS 个格子,线性扫就够
    // 横向合并区内的坐标会返回锚点格子,纵向被覆盖的行返回 null
    findCell(r, c) {
      const grid = this.gridEl()
      const ri = this._rowPos ? this._rowPos[r] : null
      if (!grid || ri == null) {
        return null
      }
      const tr = grid.tBodies[0] ? grid.tBodies[0].rows[ri] : null
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
      const grid = this.gridEl()
      const ri = this._rowPos ? this._rowPos[r] : null
      if (!grid || ri == null || !grid.tBodies[0]) {
        return null
      }
      const tr = grid.tBodies[0].rows[ri]
      return tr ? tr.cells[0] : null
    },
    /** 列标表头节点 */
    colHeadEl(c) {
      const grid = this.gridEl()
      if (!grid || !grid.tHead) {
        return null
      }
      const cells = grid.tHead.rows[0].cells
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
    // 扫解析结果拿命中,不重建 DOM
    runSearch() {
      const query = this.searchText.trim()
      const sheet = this.currentSheet()
      if (!query || !sheet || !this._range) {
        this.clearSearch()
        return
      }
      const keyword = query.toLowerCase()
      const matches = []
      for (let ri = 0; ri < this._visRows.length; ri++) {
        const r = this._visRows[ri]
        for (let ci = 0; ci < this._visCols.length; ci++) {
          const c = this._visCols[ci]
          // 合并区被覆盖的格子没有对应节点
          if (this._covered && this._covered.has(cellKey(r, c))) {
            continue
          }
          const text = cellText(cellAt(sheet, r, c))
          if (text !== '' && String(text).toLowerCase().indexOf(keyword) >= 0) {
            matches.push({ r: r, c: c })
          }
        }
      }
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
      this.zoom = clamp(Math.round((this.zoom + ZOOM_STEP) * 100) / 100, ZOOM_MIN, ZOOM_MAX)
    },
    /** 缩小 */
    zoomOut() {
      this.zoom = clamp(Math.round((this.zoom - ZOOM_STEP) * 100) / 100, ZOOM_MIN, ZOOM_MAX)
    },
    /** 还原为实际大小 */
    resetZoom() {
      this.zoom = 1
    },
    /** 最大化/还原 */
    toggleMaximize() {
      this.maximized = !this.maximized
    },
    /** 关闭后清理 */
    cleanup() {
      this._workbook = null
      this.resetState()
    },
    /** 复位整体状态 */
    resetState() {
      this.loading = false
      this.errorMsg = ''
      this.sheetNames = []
      this.activeSheet = ''
      this.zoom = 1
      this.searchText = ''
      this.resetSheetState()
      this.sheetHtml = ''
    },
    /** 复位与当前工作表绑定的状态 */
    resetSheetState() {
      this.clearSelection()
      this.clearSearch()
      this.truncated = false
      this.totalRows = 0
      this.totalCols = 0
      this.selectedAddr = ''
      this.selectedText = ''
      this._cursor = null
      this._range = null
      this._covered = null
      this._visRows = []
      this._visCols = []
      this._rowPos = {}
      this._colPos = {}
    }
  }
}
</script>

<style lang="scss">
@import '@/assets/styles/tokens.scss';
/* 对话框挂 body(append-to-body) */
.excel-viewer-dialog {
  .el-dialog__body {
    padding: 0;
  }

  /* 标题栏最大化/还原按钮 */
  .excel-viewer__maximize {
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

  .excel-viewer__toolbar {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: $space-2;
    padding: $space-2 $space-4;
    border-bottom: 1px solid #ebeef5;
  }

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
  .excel-viewer__body {
    position: relative;
    height: calc(92vh - 190px);
    min-height: 180px;
    overflow: auto;
    outline: none;
    background: $bg-grouped;
  }

  .excel-viewer__sheet {
    padding: $space-3;
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

  .excel-viewer__error,
  .excel-viewer__empty {
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

    .excel-viewer__toolbar,
    .excel-viewer__formula,
    .excel-viewer__tabs {
      flex-shrink: 0;
    }

    .excel-viewer__body {
      flex: 1;
      height: auto;
      min-height: 0;
    }
  }
}
</style>
