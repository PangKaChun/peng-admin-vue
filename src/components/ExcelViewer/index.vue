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

    <div v-if="sheetNames.length" class="excel-viewer__toolbar">
      <el-radio-group v-model="activeSheet" size="mini">
        <el-radio-button v-for="name in sheetNames" :key="name" :label="name" />
      </el-radio-group>
      <span v-if="truncated" class="excel-viewer__truncated">
        <i class="el-icon-warning-outline" /> 内容过大，仅预览前 {{ maxRows }} 行 × {{ maxCols }} 列
      </span>
    </div>

    <div v-loading="loading" class="excel-viewer__body">
      <div v-if="errorMsg" class="excel-viewer__error">{{ errorMsg }}</div>
      <div v-else class="excel-viewer__sheet" v-html="sheetHtml" />
    </div>
  </el-dialog>
</template>

<script>
import * as XLSX from 'xlsx'

// 超大表保护:超过该行列数只渲染截断视图,避免 HTML 拼接卡死页面
const MAX_ROWS = 1000
const MAX_COLS = 100

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
      // 截断阈值(供模板提示展示)
      maxRows: MAX_ROWS,
      maxCols: MAX_COLS
    }
  },
  watch: {
    // 切换工作表重新渲染
    activeSheet() {
      this.renderSheet()
    }
  },
  methods: {
    /** 打开对话框并加载 Excel */
    open(url, title) {
      this.title = title || 'Excel 预览'
      this.visible = true
      this.load(url)
    },
    /** 拉取并解析工作簿 */
    async load(url) {
      this.resetState()
      this.loading = true
      try {
        const resp = await fetch(url)
        if (!resp.ok) {
          throw new Error('HTTP ' + resp.status)
        }
        const buf = await resp.arrayBuffer()
        // dense 模式按行数组存储,大表内存占用更低
        const workbook = XLSX.read(buf, { dense: true })
        // 解析结果挂非响应式私有属性,避免 Vue 深度代理大对象
        this._workbook = workbook
        this.sheetNames = workbook.SheetNames
        this.activeSheet = workbook.SheetNames[0] || ''
        this.renderSheet()
      } catch (e) {
        console.error('Excel 加载失败', e)
        this.errorMsg = 'Excel 加载失败，请尝试下载后查看'
      } finally {
        this.loading = false
      }
    },
    /** 渲染当前工作表为 HTML 表格(合并单元格由 sheet_to_html 原生输出 rowspan/colspan) */
    renderSheet() {
      const workbook = this._workbook
      if (!workbook || !this.activeSheet) {
        this.sheetHtml = ''
        return
      }
      const sheet = workbook.Sheets[this.activeSheet]
      this.truncated = false
      if (!sheet || !sheet['!ref']) {
        this.sheetHtml = ''
        return
      }
      const fullRange = XLSX.utils.decode_range(sheet['!ref'])
      let range = fullRange
      // 超大表只渲染左上区域:临时收窄 !ref,渲染后还原,避免污染工作簿(切表往返仍能识别截断)
      if (fullRange.e.r - fullRange.s.r + 1 > MAX_ROWS || fullRange.e.c - fullRange.s.c + 1 > MAX_COLS) {
        this.truncated = true
        range = {
          s: fullRange.s,
          e: {
            r: Math.min(fullRange.e.r, fullRange.s.r + MAX_ROWS - 1),
            c: Math.min(fullRange.e.c, fullRange.s.c + MAX_COLS - 1)
          }
        }
      }
      const originalRef = sheet['!ref']
      sheet['!ref'] = XLSX.utils.encode_range(range)
      let bodyHtml
      try {
        bodyHtml = XLSX.utils.sheet_to_html(sheet, { header: '', footer: '' })
      } finally {
        sheet['!ref'] = originalRef
      }
      this.sheetHtml = this.decorateGrid(bodyHtml, range)
    },
    /**
     * 给 sheet_to_html 的裸表格补上 Excel 风格的列标(A/B/C…)与行号侧栏
     *
     * <p>仅注入行号与列字母(均由范围推导,非用户内容,无 XSS 风险);单元格内容仍是
     * sheet_to_html 已转义的安全 HTML,合并单元格的 colspan/rowspan 原样保留。
     *
     * @param tableHtml sheet_to_html 输出的 `<table>…</table>`
     * @param range     当前渲染范围(含起始行列,用于对齐真实行号/列标)
     * @return 带列标表头与行号侧栏的表格 HTML
     */
    decorateGrid(tableHtml, range) {
      // 剥掉外层 table 标签,仅保留行,便于重新包裹
      const rowsHtml = tableHtml
        .replace(/^<table[^>]*>/, '')
        .replace(/<\/table>\s*$/, '')
      // 每个可视行前插入行号单元格(Excel 真实行号,1 基)
      let rowNum = range.s.r
      const body = rowsHtml.replace(/<tr(\s[^>]*)?>/g, (match, attrs) => {
        rowNum += 1
        return '<tr' + (attrs || '') + '><th class="excel-grid__rownum">' + rowNum + '</th>'
      })
      // 列标表头:左上角占位 + A、B、C…
      let head = '<th class="excel-grid__corner"></th>'
      for (let c = range.s.c; c <= range.e.c; c++) {
        head += '<th>' + XLSX.utils.encode_col(c) + '</th>'
      }
      return '<table class="excel-grid"><thead><tr class="excel-grid__head">'
        + head + '</tr></thead><tbody>' + body + '</tbody></table>'
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
    /** 复位状态 */
    resetState() {
      this.loading = false
      this.errorMsg = ''
      this.sheetNames = []
      this.activeSheet = ''
      this.sheetHtml = ''
      this.truncated = false
    }
  }
}
</script>

<style lang="scss">
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
      color: #409eff;
    }
  }

  .excel-viewer__toolbar {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
    padding: 8px 16px;
    border-bottom: 1px solid #ebeef5;
  }

  .excel-viewer__truncated {
    font-size: 12px;
    color: #e6a23c;
  }

  .excel-viewer__body {
    position: relative;
    height: 74vh;
    overflow: auto;
    background: #f5f7fa;
  }

  .excel-viewer__sheet {
    padding: 12px;
  }

  /* Excel 风格表格 */
  .excel-grid {
    border-collapse: separate;
    border-spacing: 0;
    border-top: 1px solid #d0d7de;
    border-left: 1px solid #d0d7de;
    background: #fff;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
    font-size: 12px;
    color: #24292f;

    th,
    td {
      border-right: 1px solid #d0d7de;
      border-bottom: 1px solid #d0d7de;
    }

    td {
      min-width: 64px;
      max-width: 420px;
      height: 26px;
      padding: 3px 10px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      vertical-align: middle;
    }

    /* 数字右对齐 + 等宽数字,与 Excel 观感一致 */
    td[data-t="n"] {
      text-align: right;
      font-variant-numeric: tabular-nums;
    }
  }

  /* 列标表头(A/B/C…):吸顶冻结 */
  .excel-grid__head th {
    position: sticky;
    top: 0;
    z-index: 2;
    height: 22px;
    padding: 2px 10px;
    background: #f2f3f5;
    font-weight: 600;
    color: #57606a;
    text-align: center;
    white-space: nowrap;
    user-select: none;
  }

  /* 行号侧栏:吸左冻结 */
  .excel-grid__rownum {
    position: sticky;
    left: 0;
    z-index: 1;
    min-width: 46px;
    width: 46px;
    padding: 2px 8px;
    background: #f2f3f5;
    font-weight: 400;
    color: #8c959f;
    text-align: center;
    white-space: nowrap;
    user-select: none;
  }

  /* 左上角:同时吸顶吸左,压最上层(特异性须高于 .excel-grid__head th 才能盖住其 z-index) */
  .excel-grid__head th.excel-grid__corner {
    left: 0;
    z-index: 3;
    min-width: 46px;
    width: 46px;
  }

  /* 斑马纹:仅数据单元格,侧栏保持表头底色 */
  .excel-grid tbody tr:nth-child(even) td {
    background: #fafbfc;
  }

  /* 悬停整行高亮(源码顺序在斑马纹之后,同特异性靠后覆盖) */
  .excel-grid tbody tr:hover td {
    background: #eef5ff;
  }

  .excel-grid tbody tr:hover .excel-grid__rownum {
    background: #e6eefb;
    color: #409eff;
  }

  .excel-viewer__error {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 14px;
    color: #909399;
  }

  /* 最大化:对话框纵向弹性布局,预览区吃满剩余高度 */
  &.is-fullscreen {
    display: flex;
    flex-direction: column;

    .el-dialog__body {
      display: flex;
      flex: 1;
      flex-direction: column;
      min-height: 0;
    }

    .excel-viewer__toolbar {
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
