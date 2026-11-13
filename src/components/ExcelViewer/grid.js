// SheetJS 解析与表格 HTML 拼装,纯函数、不碰 DOM。
// 本模块连同 SheetJS 是一个异步 chunk,由 ExcelViewer 在首次预览时加载
import * as XLSX from 'xlsx'
import { localizeDates } from './formats'

// 读不到工作簿默认字体时(如 xls)采用的单个数字像素宽度,按中文版 Excel 的宋体 / 等线 11 号取
const FALLBACK_DIGIT_WIDTH = 8
// 默认字号(磅),字体没写字号时用
const DEFAULT_FONT_SIZE = 11
// 字体名里有非 ASCII 字符,或是这些中日韩字体的英文名,数字按半个字宽排
const CJK_FONT_RE = /[^\x00-\x7f]|^(?:n?simsun|simhei|dengxian|microsoft yahei|microsoft jhenghei|fangsong|kaiti|(?:p?mingliu)|ms p?gothic|ms p?mincho|malgun gothic)/i
// 列宽 / 行高兜底与钳制范围(px);没设列宽的列按中文版 Excel 的默认列宽 72px
const DEFAULT_COL_WIDTH = 72
const MIN_COL_WIDTH = 40
const MAX_COL_WIDTH = 400
const DEFAULT_ROW_HEIGHT = 26
const MIN_ROW_HEIGHT = 22
const MAX_ROW_HEIGHT = 120
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

/** 单元格地址,如 B3 */
export function cellAddress(r, c) {
  return XLSX.utils.encode_cell({ r: r, c: c })
}

/** 读取单元格 */
export function cellAt(sheet, r, c) {
  const data = sheet['!data']
  if (data) {
    const row = data[r]
    return row ? row[c] : undefined
  }
  return sheet[cellAddress(r, c)]
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

/**
 * 解析工作簿。每张表只读前 maxRows 行:预览只渲染这么多,大表不必整张解析
 * @param {ArrayBuffer} buffer 文件内容
 * @param {Number} maxRows 每张表预览的行数上限
 */
export function readWorkbook(buffer, maxRows) {
  // 多读一行:CSV 这类不记录总行数的格式,靠这一行判断后面还有没有数据
  const workbook = parse(buffer, { sheetRows: maxRows + 1 })
  // sheetRows 按表内行号截断,数据从上限之外才开始的表会被读成空表,这种表单独放宽上限重读
  workbook.SheetNames.forEach(name => {
    const sheet = workbook.Sheets[name]
    const fullRef = sheet && sheet['!fullref']
    const startRow = fullRef ? XLSX.utils.decode_range(fullRef).s.r : 0
    if (startRow >= maxRows) {
      workbook.Sheets[name] = parse(buffer, { sheets: name, sheetRows: startRow + maxRows + 1 }).Sheets[name]
    }
  })
  return workbook
}

/** XLSX.read 加上读完后的修正:日期时间本地化、列宽换算 */
function parse(buffer, options) {
  const workbook = XLSX.read(buffer, {
    dense: true,
    cellHTML: false,
    // 列宽 / 行高 / 隐藏标记与填充色
    cellStyles: true,
    // 保留单元格格式串与原始 XML,日期本地化要用
    cellNF: true,
    bookFiles: true,
    ...options
  })
  localizeDates(workbook, options.sheetRows)
  // 原始文件内容用完即弃,别让工作簿一直攥着整包解压后的 XML
  delete workbook.files
  delete workbook.keys
  delete workbook.cfb
  if (hasCharWidths(workbook)) {
    const digitWidth = digitWidthOf(workbook)
    workbook.SheetNames.forEach(name => fixColWidths(workbook.Sheets[name], digitWidth))
  }
  return workbook
}

/**
 * 工作簿默认字体下单个数字的像素宽度,Excel 的列宽字符数就是按它换算成像素的
 *
 * 不依赖本机装没装这个字体,按字体类别估:中日韩字体的数字占半个字宽、向上取整,
 * 西文字体约半个字号、四舍五入。常见默认字体都对得上:
 * Calibri 11 → 7,Arial 10 → 7,Calibri 12 → 8,宋体 / 等线 11 → 8,宋体 12 → 8
 */
function digitWidthOf(workbook) {
  // 样式表里第一个字体就是"常规"样式的字体,即工作簿默认字体
  const font = workbook.Styles && workbook.Styles.Fonts && workbook.Styles.Fonts[0]
  if (!font || !font.name) {
    return FALLBACK_DIGIT_WIDTH
  }
  // 磅 → 像素(96 DPI)
  const half = ((font.sz || DEFAULT_FONT_SIZE) * 96) / 72 / 2
  return CJK_FONT_RE.test(font.name) ? Math.ceil(half) : Math.round(half)
}

/** 列宽是否以字符数记录:xlsx / xlsb / xls 是,XML 表格、ODS 等直接记像素 */
function hasCharWidths(workbook) {
  // xls 读出来不带 bookType
  return !workbook.bookType || /^xls[xmb]$/.test(workbook.bookType)
}

// SheetJS 把字符宽度换算成像素时用的"单个数字宽度"是它的模块级变量,会被上一次解析改掉,
// 同一个文件刷新后第一次打开和之后再打开,算出的 wpx 可能不一样。这里按工作簿默认字体重算
function fixColWidths(sheet, digitWidth) {
  const cols = sheet && sheet['!cols']
  if (!cols) {
    return
  }
  cols.forEach(col => {
    if (col && col.width) {
      // ECMA-376 Part 1 §18.3.1.13 的换算公式
      col.wpx = Math.floor(((256 * col.width + Math.floor(128 / digitWidth)) / 256) * digitWidth)
    }
  })
}

/** 区间内未隐藏的行号 / 列号,以及它们在可见序列里的下标 */
function visibleIndexes(start, end, infos) {
  const list = []
  const pos = {}
  for (let i = start; i <= end; i++) {
    if (!(infos[i] && infos[i].hidden)) {
      pos[i] = list.length
      list.push(i)
    }
  }
  return { list: list, pos: pos }
}

// 跨度按可见行列数算,合并区里夹着隐藏行列时才不会多占格
function resolveMerges(sheet, range, rowPos, colPos) {
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
}

/** 拼单个单元格 */
function buildCell(cell, r, c, span) {
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
}

/**
 * 拼出带列标(A/B/C…)与行号侧栏的表格
 *
 * 不走 sheet_to_html,自己拼才能还原列宽行高、跳过隐藏行列、渲染填充色,
 * 并给每格打上 data-r / data-c 供选中与查找定位。
 */
function buildHtml(sheet, range, visRows, visCols, covered, spans) {
  const cols = sheet['!cols'] || []
  const rows = sheet['!rows'] || []
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
      parts.push(buildCell(cell, r, c, span))
    }
    parts.push('</tr>')
  }
  parts.push('</tbody></table>')
  return parts.join('')
}

/**
 * 排出一张工作表的预览:表格 HTML 加上选中、查找要用的行列索引
 *
 * @param {Object} sheet readWorkbook 读出的工作表
 * @param {Number} maxRows 预览行数上限
 * @param {Number} maxCols 预览列数上限
 * @returns {Object|null} 空表返回 null;否则:
 *   html       表格 HTML,没有可见行列时为空串
 *   visRows / visCols  渲染出来的行号 / 列号(已剔除隐藏行列),升序
 *   rowPos / colPos    行号 / 列号 → 在 visRows / visCols 里的下标
 *   covered    被合并区盖住、没有对应格子的坐标键集合
 *   totalRows / totalCols  整张表的行列数
 *   moreRows   为 true 时 totalRows 只是下限,文件没记录总行数(CSV 等)
 *   truncated  是否只预览了左上一部分
 */
export function layoutSheet(sheet, maxRows, maxCols) {
  if (!sheet || !sheet['!ref']) {
    return null
  }
  // 读的时候限过行数,!ref 是实际读到的范围,!fullref 才是整张表
  const parsed = XLSX.utils.decode_range(sheet['!ref'])
  const full = sheet['!fullref'] ? XLSX.utils.decode_range(sheet['!fullref']) : parsed
  const totalRows = full.e.r - full.s.r + 1
  const totalCols = full.e.c - full.s.c + 1
  // 超大表只渲染左上区域
  const range = {
    s: parsed.s,
    e: {
      r: Math.min(parsed.e.r, parsed.s.r + maxRows - 1),
      c: Math.min(parsed.e.c, parsed.s.c + maxCols - 1)
    }
  }
  // 原表隐藏的行列不渲染
  const rows = visibleIndexes(range.s.r, range.e.r, sheet['!rows'] || [])
  const cols = visibleIndexes(range.s.c, range.e.c, sheet['!cols'] || [])
  const { covered, spans } = resolveMerges(sheet, range, rows.pos, cols.pos)
  const hasCells = rows.list.length > 0 && cols.list.length > 0
  return {
    html: hasCells ? buildHtml(sheet, range, rows.list, cols.list, covered, spans) : '',
    visRows: rows.list,
    visCols: cols.list,
    rowPos: rows.pos,
    colPos: cols.pos,
    covered: covered,
    totalRows: totalRows,
    totalCols: totalCols,
    moreRows: !sheet['!fullref'] && totalRows === maxRows + 1,
    truncated: totalRows > maxRows || totalCols > maxCols
  }
}

/**
 * 在预览出来的格子里查找包含关键词的单元格,不区分大小写
 * 扫解析结果拿命中,不依赖 DOM
 * @returns {Array<{r: Number, c: Number}>} 按行优先排序的命中坐标
 */
export function findMatches(sheet, layout, query) {
  const keyword = query.toLowerCase()
  const matches = []
  for (let ri = 0; ri < layout.visRows.length; ri++) {
    const r = layout.visRows[ri]
    for (let ci = 0; ci < layout.visCols.length; ci++) {
      const c = layout.visCols[ci]
      // 合并区被覆盖的格子没有对应节点
      if (layout.covered.has(cellKey(r, c))) {
        continue
      }
      const text = cellText(cellAt(sheet, r, c))
      if (text !== '' && String(text).toLowerCase().indexOf(keyword) >= 0) {
        matches.push({ r: r, c: c })
      }
    }
  }
  return matches
}
