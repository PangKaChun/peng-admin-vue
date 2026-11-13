// 日期时间按简体中文版 Excel 的习惯显示,纯函数、不碰 DOM。
//
// SheetJS 一律按美式区域排版:内置格式 14 排成 3/5/24,而中文版 Excel 显示 2024/3/5;
// "2024年3月5日""13时30分"这类随区域变化的内置格式(27–36、50–58)文件里只存编号不存格式串,
// 也都被它当成 14 或 h:mm:ss。这里在解析完之后把这些单元格的展示文本(cell.w)重排一遍
import * as XLSX from 'xlsx'

const format = XLSX.SSF.format

// 美式默认格式串 → 中文版 Excel 的等价格式(对应内置格式 14、22)
const US_DATE = 'm/d/yy'
const ZH_FORMAT_STRINGS = new Map([
  [US_DATE, 'yyyy/m/d'],
  ['m/d/yy h:mm', 'yyyy/m/d h:mm']
])
// 随区域变化的内置格式编号 → 简体中文下的实际格式(ECMA-376 Part 1 §18.8.30)
const ZH_BUILTIN_FORMATS = {
  27: 'yyyy"年"m"月"',
  28: 'm"月"d"日"',
  29: 'm"月"d"日"',
  30: 'm-d-yy',
  31: 'yyyy"年"m"月"d"日"',
  32: 'h"时"mm"分"',
  33: 'h"时"mm"分"ss"秒"',
  34: '上午/下午h"时"mm"分"',
  35: '上午/下午h"时"mm"分"ss"秒"',
  36: 'yyyy"年"m"月"',
  50: 'yyyy"年"m"月"',
  51: 'm"月"d"日"',
  52: 'yyyy"年"m"月"',
  53: 'm"月"d"日"',
  54: 'm"月"d"日"',
  55: '上午/下午h"时"mm"分"',
  56: '上午/下午h"时"mm"分"ss"秒"',
  57: 'yyyy"年"m"月"',
  58: 'm"月"d"日"'
}
// "系统长日期 / 系统时间"格式,Excel 按操作系统区域显示,格式串本身只是英文占位
const SYSTEM_DATE_RE = /^\[\$-(?:F800|x-sysdate)\]/i
const SYSTEM_TIME_RE = /^\[\$-(?:F400|x-systime)\]/i
const ZH_LONG_DATE = 'yyyy"年"m"月"d"日"'
const ZH_TIME = 'h:mm:ss'
// aaa / aaaa 是中日文版 Excel 的星期记号(二 / 星期二),SheetJS 不认,会原样输出字母
const WEEKDAY_RE = /"[^"]*"|a{3,4}/gi
const WEEKDAYS = '日一二三四五六'
// [$-804] 这类纯区域前缀,SheetJS 会把它当货币符号排出一个 $
const LOCALE_PREFIX_RE = /\[\$-[^\]]*\]/g
// 标记:格式串里含星期记号,要结合单元格的值才能定下来
const NEEDS_WEEKDAY = Symbol('weekday')

// 每次扫原始 XML 解码的字节数
const SCAN_CHUNK = 1 << 20

// 格式串 → 处理方式,一张表里格式串就那么几种,缓存下来免得逐格跑正则
const kinds = new Map()

/** 格式串该怎么处理:null 不用动,字符串是替换成的格式,NEEDS_WEEKDAY 见上 */
function kindOf(z) {
  let kind = kinds.get(z)
  if (kind === undefined) {
    if (ZH_FORMAT_STRINGS.has(z)) {
      kind = ZH_FORMAT_STRINGS.get(z)
    } else if (SYSTEM_DATE_RE.test(z)) {
      kind = ZH_LONG_DATE
    } else if (SYSTEM_TIME_RE.test(z)) {
      kind = ZH_TIME
    } else {
      kind = z.replace(/"[^"]*"/g, '').search(/a{3,4}/i) >= 0 ? NEEDS_WEEKDAY : null
    }
    kinds.set(z, kind)
  }
  return kind
}

/** 把格式串里的星期记号换成这一天的星期几(带引号的字面量) */
function withWeekday(z, value, opts) {
  const date = XLSX.SSF.parse_date_code(value, opts)
  if (!date) {
    return null
  }
  const day = WEEKDAYS.charAt(date.q)
  return z.replace(LOCALE_PREFIX_RE, '').replace(WEEKDAY_RE, token => {
    if (token.charAt(0) === '"') {
      return token
    }
    return '"' + (token.length === 4 ? '星期' : '') + day + '"'
  })
}

/** 按格式串能判断的那部分:内置 14 / 22、系统日期时间、星期记号 */
function localizeByFormatString(sheet, opts) {
  sheet['!data'].forEach(row => {
    if (!row) {
      return
    }
    row.forEach(cell => {
      if (!cell || cell.t !== 'n') {
        return
      }
      // 随区域变化的内置格式没有格式串,SheetJS 按美式日期排;文本里带斜杠的才可能是这种情况
      const z = cell.z || (typeof cell.w === 'string' && cell.w.indexOf('/') > 0 ? US_DATE : null)
      const kind = z ? kindOf(z) : null
      if (kind === null) {
        return
      }
      const fmt = kind === NEEDS_WEEKDAY ? withWeekday(z, cell.v, opts) : kind
      // 只替换 SheetJS 按格式串排出来的文本;CSV 里的日期 w 是文件原文,保持不动
      if (fmt && cell.w === format(z, cell.v, opts)) {
        cell.w = format(fmt, cell.v, opts)
      }
    })
  })
}

/** 原始文件内容转成字节数组,拿不到返回 null */
function bytesOf(file) {
  const content = file && file.content
  if (content instanceof Uint8Array) {
    return content
  }
  return Array.isArray(content) ? Uint8Array.from(content) : null
}

/** 取 XML 标签里的属性值 */
function attr(tag, name) {
  const m = new RegExp('\\b' + name + '="([^"]*)"').exec(tag)
  return m ? m[1] : null
}

/** 列字母 → 列号(A → 0) */
function colIndex(letters) {
  let n = 0
  for (let i = 0; i < letters.length; i++) {
    n = n * 26 + letters.charCodeAt(i) - 64
  }
  return n - 1
}

/**
 * 顺序扫工作表的原始 XML,对前 rowLimit 行里带样式的单元格回调 (行号, 列号, 样式下标)
 * 分块解码、扫到行数上限就停,大表也只读开头一小段
 */
function scanCellStyles(bytes, rowLimit, onCell) {
  const decoder = new TextDecoder()
  const tagRe = /<(row|c)\b([^>]*)>/g
  let carry = ''
  let r = -1
  let c = -1
  for (let offset = 0; offset < bytes.length; offset += SCAN_CHUNK) {
    const text = carry + decoder.decode(bytes.subarray(offset, offset + SCAN_CHUNK), { stream: true })
    // 末尾可能截在标签中间,留到下一块再拼
    const lastOpen = text.lastIndexOf('<')
    carry = lastOpen > text.lastIndexOf('>') ? text.slice(lastOpen) : ''
    tagRe.lastIndex = 0
    let m
    while ((m = tagRe.exec(text))) {
      const ref = attr(m[2], 'r')
      if (m[1] === 'row') {
        r = ref ? parseInt(ref, 10) - 1 : r + 1
        c = -1
        if (r >= rowLimit) {
          return
        }
        continue
      }
      // 没写坐标的单元格紧跟前一格
      const letters = ref ? /^[A-Z]+/.exec(ref) : null
      c = letters ? colIndex(letters[0]) : c + 1
      const style = attr(m[2], 's')
      if (style !== null) {
        onCell(r, c, parseInt(style, 10))
      }
    }
  }
}

/** 各工作表在压缩包里的路径,顺序与 SheetNames 一致 */
function sheetPaths(workbook) {
  const targets = new Map()
  const rels = bytesOf(workbook.files['xl/_rels/workbook.xml.rels'])
  if (rels) {
    const tags = new TextDecoder().decode(rels).match(/<Relationship\b[^>]*>/g) || []
    tags.forEach(tag => {
      const target = attr(tag, 'Target')
      if (target) {
        targets.set(attr(tag, 'Id'), 'xl/' + target.replace(/[/]?xl\//, ''))
      }
    })
  }
  return workbook.Workbook.Sheets.map((meta, i) => targets.get(meta.id) || 'xl/worksheets/sheet' + (i + 1) + '.xml')
}

// 随区域变化的内置格式只有编号,解析结果里分不出是哪一个(SheetJS 给的格式串都一样),
// 得回到 xlsx 的原始 XML 查每个单元格的样式下标
function localizeBuiltinFormats(workbook, rowLimit, opts) {
  const styles = workbook.Styles
  if (!workbook.files || !styles || !styles.CellXf || !workbook.Workbook) {
    return
  }
  // 文件自己声明了格式串的编号,以文件为准
  const declared = styles.NumberFmt || {}
  const formats = new Map()
  styles.CellXf.forEach((xf, index) => {
    const fmt = ZH_BUILTIN_FORMATS[xf.numFmtId]
    if (fmt && declared[xf.numFmtId] == null) {
      formats.set(index, fmt)
    }
  })
  if (!formats.size) {
    return
  }
  const paths = sheetPaths(workbook)
  workbook.SheetNames.forEach((name, i) => {
    const sheet = workbook.Sheets[name]
    const bytes = bytesOf(workbook.files[paths[i]])
    if (!sheet || !sheet['!data'] || !bytes) {
      return
    }
    scanCellStyles(bytes, rowLimit, (r, c, style) => {
      const fmt = formats.get(style)
      const cell = fmt && sheet['!data'][r] && sheet['!data'][r][c]
      if (cell && cell.t === 'n') {
        cell.w = format(fmt, cell.v, opts)
      }
    })
  })
}

/**
 * 把工作簿里日期时间单元格的展示文本改成中文版 Excel 的样子
 *
 * 要求读取时带 dense / cellNF(保留格式串);带 bookFiles 时还会处理 xlsx 里
 * 随区域变化的内置格式,否则这类单元格按 yyyy/m/d、h:mm:ss 显示
 *
 * @param {Object} workbook XLSX.read 的结果
 * @param {Number} rowLimit 每张表解析的行数上限(与读取时的 sheetRows 一致)
 */
export function localizeDates(workbook, rowLimit) {
  const props = workbook.Workbook && workbook.Workbook.WBProps
  const opts = { date1904: !!(props && props.date1904) }
  workbook.SheetNames.forEach(name => {
    const sheet = workbook.Sheets[name]
    if (sheet && sheet['!data']) {
      localizeByFormatString(sheet, opts)
    }
  })
  localizeBuiltinFormats(workbook, rowLimit, opts)
}
