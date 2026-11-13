// 压缩包条目列表 → 目录树 → 可见行,纯函数、不碰 DOM

// 文件名按中文环境自然排序;复用同一个 Collator,比逐次带参数调 localeCompare 快一个量级
const collator = new Intl.Collator('zh-Hans-CN', { numeric: true, sensitivity: 'base' })

// 图标 → 扩展名
const ICON_EXTENSIONS = {
  'el-icon-picture-outline': ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg'],
  'el-icon-video-camera': ['mp4', 'mov', 'avi', 'mkv'],
  'el-icon-headset': ['mp3', 'wav', 'flac'],
  'el-icon-folder-opened': ['zip', 'rar', '7z', 'gz', 'tar'],
  'el-icon-s-grid': ['xls', 'xlsx', 'csv'],
  'el-icon-document': ['doc', 'docx', 'pdf'],
  'el-icon-document-copy': ['txt', 'md', 'json', 'xml', 'html', 'css', 'js', 'ts']
}
const DEFAULT_ICON = 'el-icon-document'
// 摊平成 扩展名 → 图标;无原型对象,免得 constructor 之类的扩展名查到原型上去
const EXT_ICONS = Object.create(null)
Object.keys(ICON_EXTENSIONS).forEach(icon => {
  ICON_EXTENSIONS[icon].forEach(ext => {
    EXT_ICONS[ext] = icon
  })
})

/** 按扩展名挑选文件图标 */
export function fileIcon(name) {
  const ext = name.slice(name.lastIndexOf('.') + 1).toLowerCase()
  return EXT_ICONS[ext] || DEFAULT_ICON
}

/** 递归排序:文件夹在前,同类按名称自然序 */
function sortNodes(nodes) {
  nodes.sort((a, b) => {
    if (a.dir !== b.dir) {
      return a.dir ? -1 : 1
    }
    return collator.compare(a.label, b.label)
  })
  nodes.forEach(node => {
    if (node.children && node.children.length) {
      sortNodes(node.children)
    }
  })
}

/**
 * 由扁平条目构建嵌套目录树,缺失的中间层文件夹按需补齐
 * @param {Array<{path: String, dir: Boolean, size: Number}>} entries 归一后的条目
 * @returns {{nodes: Array, fileCount: Number, dirCount: Number, totalSize: Number}}
 */
export function buildTree(entries) {
  const root = { children: [] }
  // 路径(不含末尾 /)→ 目录节点,复用避免重复建层
  const dirs = new Map([['', root]])
  let fileCount = 0
  let dirCount = 0
  let totalSize = 0

  // 逐级确保目录节点存在,返回最末层目录节点
  const ensureDir = dirPath => {
    const known = dirs.get(dirPath)
    if (known) {
      return known
    }
    let path = ''
    let parent = root
    dirPath.split('/').forEach(part => {
      path = path ? path + '/' + part : part
      let node = dirs.get(path)
      if (!node) {
        node = { id: path + '/', label: part, dir: true, children: [] }
        parent.children.push(node)
        dirs.set(path, node)
        dirCount += 1
      }
      parent = node
    })
    return parent
  }

  entries.forEach(entry => {
    const path = entry.path
    // 显式文件夹条目:仅建层(空文件夹也能呈现)
    if (entry.dir) {
      if (path) {
        ensureDir(path)
      }
      return
    }
    const idx = path.lastIndexOf('/')
    const label = path.slice(idx + 1)
    // 防御:异常空文件名跳过
    if (!label) {
      return
    }
    const parent = idx > 0 ? ensureDir(path.slice(0, idx)) : root
    parent.children.push({ id: path, label, dir: false, size: entry.size })
    fileCount += 1
    totalSize += entry.size
  })

  sortNodes(root.children)
  return { nodes: root.children, fileCount, dirCount, totalSize }
}

/**
 * 按展开状态把目录树摊平成自上而下的可见行,供虚拟列表渲染
 * @param {Array} nodes 目录树
 * @param {Set} expanded 已展开的文件夹节点
 * @param {Set|null} matched 过滤命中的节点(见 matchNodes),不过滤传 null
 * @returns {Array<{node: Object, depth: Number, expanded: Boolean}>}
 */
export function flattenRows(nodes, expanded, matched, depth = 0, rows = []) {
  nodes.forEach(node => {
    if (matched && !matched.has(node)) {
      return
    }
    const open = node.dir && expanded.has(node)
    rows.push({ node, depth, expanded: open })
    if (open) {
      flattenRows(node.children, expanded, matched, depth + 1, rows)
    }
  })
  return rows
}

/**
 * 按名称过滤(不区分大小写):名称含关键词的节点,连同它们的各级父文件夹
 * @returns {Set} 应显示的节点集合
 */
export function matchNodes(nodes, keyword) {
  const matched = new Set()
  const lower = keyword.toLowerCase()
  const visit = list => {
    let any = false
    list.forEach(node => {
      const childHit = node.dir && visit(node.children)
      if (childHit || node.label.toLowerCase().indexOf(lower) !== -1) {
        matched.add(node)
        any = true
      }
    })
    return any
  }
  visit(nodes)
  return matched
}

/** 对树里每个文件夹节点调用 visit */
export function eachDir(nodes, visit) {
  nodes.forEach(node => {
    if (node.dir) {
      visit(node)
      eachDir(node.children, visit)
    }
  })
}
