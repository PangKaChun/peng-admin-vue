<template>
  <!-- 压缩包预览对话框 -->
  <viewer-dialog
    :visible.sync="visible"
    :title="title"
    :loading="loading"
    :message="message"
    dialog-class="archive-viewer-dialog"
    @closed="discard"
  >
    <template v-if="!errorMsg" slot="toolbar">
      <el-input
        v-model="filterText"
        size="mini"
        placeholder="搜索文件名"
        clearable
        prefix-icon="el-icon-search"
        class="archive-viewer__filter"
      />
      <el-button-group>
        <el-button size="mini" icon="el-icon-circle-plus-outline" @click="setExpandAll(true)">展开全部</el-button>
        <el-button size="mini" icon="el-icon-remove-outline" @click="setExpandAll(false)">折叠全部</el-button>
      </el-button-group>
      <span class="archive-viewer__summary">
        共 {{ fileCount }} 个文件、{{ dirCount }} 个文件夹 · 解压后约 {{ formatFileSize(totalSize) }}
      </span>
    </template>

    <!-- 目录树:摊平成行做虚拟滚动,只渲染视口附近的一段,上万条目也不卡 -->
    <div v-show="!errorMsg" ref="scroller" class="archive-viewer__scroller" @scroll="onScroll">
      <div class="archive-viewer__rows" role="tree" :style="{ height: rowCount * rowHeight + 'px' }">
        <div :style="{ transform: 'translateY(' + windowStart * rowHeight + 'px)' }">
          <div
            v-for="row in windowRows"
            :key="row.node.id"
            class="archive-node"
            role="treeitem"
            :aria-level="row.depth + 1"
            :aria-expanded="row.node.dir ? String(row.expanded) : null"
            :style="{ paddingLeft: row.depth * indent + 'px' }"
            @click="toggle(row.node)"
          >
            <i
              class="archive-node__caret el-icon-caret-right"
              :class="{ 'is-expanded': row.expanded, 'is-leaf': !row.node.dir || !row.node.children.length }"
            />
            <i
              class="archive-node__icon"
              :class="row.node.dir ? 'el-icon-folder archive-node__icon--dir' : fileIcon(row.node.label)"
            />
            <span class="archive-node__label">{{ row.node.label }}</span>
            <span v-if="!row.node.dir" class="archive-node__size">{{ formatFileSize(row.node.size) }}</span>
          </div>
        </div>
      </div>
    </div>
  </viewer-dialog>
</template>

<script>
import viewer from '@/components/ViewerDialog/viewer'
import { formatFileSize } from '@/utils/file'
import { buildTree, flattenRows, matchNodes, eachDir, fileIcon } from './tree'

const LIBARCHIVE_WORKER_URL = process.env.BASE_URL + 'static/libarchive/worker-bundle.js'
// Archive.init 为全局一次性配置,标记避免重复设置
let libarchiveInited = false

// 行高与每级缩进(px),行高须与样式里 .archive-node 的 height 一致
const ROW_HEIGHT = 30
const INDENT = 18
// 视口上下各多渲染的行数,滚动时不露白
const OVERSCAN = 10

export default {
  name: 'ArchiveViewer',
  mixins: [viewer({ title: '压缩包预览', failText: '压缩包解析失败，可能已加密或文件损坏，请下载后查看' })],
  // 目录树、展开状态、可见行都挂非响应式私有属性(_nodes / _expanded / _matched / _rows),
  // 进了 data 会被 Vue 逐节点深度代理;模板只拿冻结后的一小段 windowRows
  data() {
    return {
      // 文件名过滤关键词
      filterText: '',
      // 统计:文件数 / 文件夹数 / 解压后总大小
      fileCount: 0,
      dirCount: 0,
      totalSize: 0,
      // 当前可见行总数,决定滚动高度
      rowCount: 0,
      // 实际渲染的那一段行,以及它在可见行里的起始下标
      windowRows: [],
      windowStart: 0,
      // 模板用的行高与缩进
      rowHeight: ROW_HEIGHT,
      indent: INDENT
    }
  },
  computed: {
    // 预览区居中提示:解析失败、空压缩包或过滤无结果
    message() {
      if (this.errorMsg) {
        return this.errorMsg
      }
      if (this.loading || this.rowCount) {
        return ''
      }
      return this.filterText ? '没有匹配的文件' : '空压缩包'
    }
  },
  watch: {
    // 关键词变化时重新过滤
    filterText() {
      this.applyFilter()
    }
  },
  mounted() {
    window.addEventListener('resize', this.onResize)
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.onResize)
  },
  methods: {
    /**
     * 读取压缩包目录并建树(仅列目录,不解压条目内容)
     * @param format 压缩格式:zip / rar / 7z,由 open 的第三个参数传入
     */
    async renderFile(blob, isStale, format) {
      // zip 用轻量 jszip;rar/7z 才拉起 libarchive 的 WASM Worker
      const entries = format === 'zip'
        ? await this.readZip(blob)
        : await this.readByLibarchive(blob)
      if (isStale()) {
        return
      }
      const tree = buildTree(entries)
      this.fileCount = tree.fileCount
      this.dirCount = tree.dirCount
      this.totalSize = tree.totalSize
      this._nodes = tree.nodes
      // 顶层文件夹默认展开一层,便于概览
      this._expanded = new Set(tree.nodes.filter(node => node.dir))
      this.$refs.scroller.scrollTop = 0
      this.refreshRows()
    },
    /** jszip 读取 zip 目录,归一为 { path, dir, size } 列表 */
    async readZip(blob) {
      // 首次预览 zip 时才加载,与 docx-preview 依赖的是同一份
      const { default: JSZip } = await import(/* webpackChunkName: "viewer-jszip" */ 'jszip')
      const zip = await JSZip.loadAsync(blob)
      return Object.keys(zip.files).map(path => {
        const entry = zip.files[path]
        if (entry.dir) {
          return { path: path.replace(/\/+$/, ''), dir: true, size: 0 }
        }
        // 解压后大小取自 jszip 内部元数据(仅读目录,未解压);缺失则记 0
        const size = entry._data && typeof entry._data.uncompressedSize === 'number'
          ? entry._data.uncompressedSize
          : 0
        return { path, dir: false, size }
      })
    },
    /** libarchive.js 读取 rar/7z 目录,归一为 { path, dir, size } 列表(仅文件,中间目录由建树补齐) */
    async readByLibarchive(blob) {
      // 按需加载,zip 场景不会拉进这段依赖与 WASM
      const { Archive } = await import(/* webpackChunkName: "viewer-libarchive" */ 'libarchive.js')
      if (!libarchiveInited) {
        Archive.init({ workerUrl: LIBARCHIVE_WORKER_URL })
        libarchiveInited = true
      }
      const archive = await Archive.open(blob)
      // 记下来,对话框中途关闭时 resetViewer 能立刻终止 Worker
      this._archive = archive
      try {
        // getFilesArray 返回 [{ file: { name, size }, path: '父目录/' }],大小来自档案头,无需解压
        const files = await archive.getFilesArray()
        return files.map(({ file, path }) => ({
          path: (path || '') + file.name,
          dir: false,
          size: typeof file.size === 'number' ? file.size : 0
        }))
      } finally {
        // 关闭即终止 Worker,释放 WASM 内存;close 可重复调用
        if (this._archive === archive) {
          this._archive = null
        }
        await archive.close()
      }
    },
    /** 点击行:文件夹展开/折叠,文件不响应 */
    toggle(node) {
      if (!node.dir) {
        return
      }
      if (!this._expanded.delete(node)) {
        this._expanded.add(node)
      }
      this.refreshRows()
    },
    /** 展开/折叠全部文件夹 */
    setExpandAll(expand) {
      this._expanded = new Set()
      if (expand) {
        eachDir(this._nodes, node => this._expanded.add(node))
      }
      this.refreshRows()
    },
    /** 按关键词过滤;命中路径上的文件夹一并展开,清空关键词后保持展开 */
    applyFilter() {
      this._matched = this.filterText ? matchNodes(this._nodes, this.filterText) : null
      if (this._matched) {
        this._matched.forEach(node => {
          if (node.dir) {
            this._expanded.add(node)
          }
        })
      }
      this.refreshRows()
    },
    /** 展开状态或过滤结果变了,重算可见行 */
    refreshRows() {
      this._rows = flattenRows(this._nodes, this._expanded, this._matched)
      this.rowCount = this._rows.length
      this.updateWindow()
    },
    /** 当前滚动位置下应渲染的行区间 */
    windowRange() {
      const scroller = this.$refs.scroller
      // 一屏行数按窗口高度估,必然不小于预览区高度,省得跟踪对话框尺寸(最大化等)
      const size = Math.ceil(window.innerHeight / ROW_HEIGHT) + OVERSCAN * 2
      const first = scroller ? Math.floor(scroller.scrollTop / ROW_HEIGHT) - OVERSCAN : 0
      return { start: Math.max(0, Math.min(first, this._rows.length - size)), size }
    },
    /** 取出要渲染的那一段行 */
    updateWindow() {
      const { start, size } = this.windowRange()
      this.windowStart = start
      // 冻结后 Vue 不会深入代理行里引用的节点
      this.windowRows = Object.freeze(this._rows.slice(start, start + size))
    },
    /** 滚动:滚过一整行、起始行变了才重取 */
    onScroll() {
      if (this.windowRange().start !== this.windowStart) {
        this.updateWindow()
      }
    },
    /** 窗口尺寸变化,一屏能放的行数跟着变 */
    onResize() {
      if (this.visible) {
        this.updateWindow()
      }
    },
    /** 终止读取中的 Worker 并复位状态 */
    resetViewer() {
      if (this._archive) {
        this._archive.close()
        this._archive = null
      }
      this._nodes = []
      this._expanded = new Set()
      this._matched = null
      this.filterText = ''
      this.fileCount = 0
      this.dirCount = 0
      this.totalSize = 0
      this.refreshRows()
    },
    // 模板里用到的公共工具
    formatFileSize,
    fileIcon
  }
}
</script>

<style lang="scss">
@import '@/assets/styles/tokens.scss';

.archive-viewer-dialog {
  .viewer-dialog__toolbar {
    gap: $space-3;
  }

  .archive-viewer__filter {
    width: 220px;
  }

  .archive-viewer__summary {
    font-size: 12px;
    color: #909399;
  }

  /* 滚动容器铺满预览区,滚动事件与高度都由它给出 */
  .archive-viewer__scroller {
    position: absolute;
    inset: 0;
    padding: 10px 16px;
    overflow: auto;
  }

  /* 撑出全部行的总高度;里面只有视口附近那一段真实节点 */
  .archive-viewer__rows {
    overflow: hidden;
  }

  /* 一行一个节点,外观沿用 Element 树节点 */
  .archive-node {
    display: flex;
    align-items: center;
    height: 30px;
    padding-right: 8px;
    font-size: 13px;

    &[aria-expanded] {
      cursor: pointer;
    }

    &:hover {
      background-color: #f5f7fa;
    }
  }

  .archive-node__caret {
    flex-shrink: 0;
    padding: 6px;
    font-size: 12px;
    color: #c0c4cc;
    transition: transform $duration-fast ease;

    &.is-expanded {
      transform: rotate(90deg);
    }

    /* 文件与空文件夹没有可展开的内容,箭头只占位 */
    &.is-leaf {
      color: transparent;
    }
  }

  .archive-node__icon {
    flex-shrink: 0;
    margin-right: 6px;
    font-size: 15px;
    color: $label-tertiary;

    /* 文件夹用暖色区分 */
    &--dir {
      color: $color-warning;
    }
  }

  .archive-node__label {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: $label;
  }

  .archive-node__size {
    flex-shrink: 0;
    margin-left: 12px;
    font-size: 12px;
    color: #909399;
    font-variant-numeric: tabular-nums;
  }
}
</style>
