<template>
  <!-- 压缩包预览对话框 -->
  <el-dialog
    :visible.sync="visible"
    :fullscreen="maximized"
    width="72%"
    top="4vh"
    append-to-body
    custom-class="archive-viewer-dialog"
    @closed="cleanup"
  >
    <!-- 自定义标题栏:标题 + 最大化/还原按钮(双击标题栏也可切换) -->
    <div slot="title" class="archive-viewer__header" @dblclick="toggleMaximize">
      <span class="el-dialog__title">{{ title }}</span>
      <button
        type="button"
        class="archive-viewer__maximize"
        :title="maximized ? '还原' : '最大化'"
        @click="toggleMaximize"
      >
        <i :class="maximized ? 'el-icon-copy-document' : 'el-icon-full-screen'" />
      </button>
    </div>

    <div v-if="!errorMsg" class="archive-viewer__toolbar">
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
    </div>

    <div v-loading="loading" class="archive-viewer__body">
      <div v-if="errorMsg" class="archive-viewer__error">{{ errorMsg }}</div>
      <el-tree
        v-else
        ref="tree"
        :data="treeData"
        node-key="id"
        :props="treeProps"
        :default-expanded-keys="expandedKeys"
        :filter-node-method="filterNode"
        empty-text="空压缩包"
        class="archive-viewer__tree"
      >
        <span slot-scope="{ node, data }" class="archive-node">
          <i
            class="archive-node__icon"
            :class="[data.dir ? 'el-icon-folder' : fileIcon(data.label), { 'archive-node__icon--dir': data.dir }]"
          />
          <span class="archive-node__label">{{ node.label }}</span>
          <span v-if="!data.dir" class="archive-node__size">{{ formatFileSize(data.size) }}</span>
        </span>
      </el-tree>
    </div>
  </el-dialog>
</template>

<script>
import JSZip from 'jszip'
import { formatFileSize } from '@/utils/file'

const LIBARCHIVE_WORKER_URL = process.env.BASE_URL + 'static/libarchive/worker-bundle.js'
// Archive.init 为全局一次性配置,标记避免重复设置
let libarchiveInited = false

export default {
  name: 'ArchiveViewer',
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
      // el-tree 数据(嵌套目录树)
      treeData: [],
      // 默认展开的节点(顶层文件夹)
      expandedKeys: [],
      // 文件名过滤关键词
      filterText: '',
      // 统计:文件数 / 文件夹数 / 解压后总大小
      fileCount: 0,
      dirCount: 0,
      totalSize: 0,
      // el-tree 字段映射
      treeProps: { label: 'label', children: 'children' }
    }
  },
  watch: {
    // 关键词变化时驱动 el-tree 过滤
    filterText(val) {
      if (this.$refs.tree) {
        this.$refs.tree.filter(val)
      }
    }
  },
  beforeDestroy() {
    this.cleanup()
  },
  methods: {
    /**
     * 打开对话框并加载压缩包
     * @param source 文件内容:Blob 或 Promise<Blob>
     * @param title  文件名(标题)
     * @param format 压缩格式:zip / rar / 7z
     */
    open(source, title, format) {
      this.title = title || '压缩包预览'
      this.visible = true
      this.load(source, format)
    },
    /** 拉取并解析压缩包目录(仅列目录,不解压条目内容,大包也秒开) */
    async load(source, format) {
      this.resetState()
      this.loading = true
      // 加载令牌:对话框关闭后丢弃迟到结果
      const token = {}
      this._loadToken = token
      try {
        const blob = await source
        if (this._loadToken !== token) {
          return
        }
        // zip 用轻量 jszip(已随 docx-preview 打包);rar/7z 才拉起 libarchive 的 WASM Worker
        const entries = format === 'zip'
          ? await this.readZip(blob)
          : await this.readByLibarchive(blob)
        if (this._loadToken !== token) {
          return
        }
        this.buildTree(entries)
      } catch (e) {
        if (this._loadToken === token) {
          console.error('压缩包加载失败', e)
          this.errorMsg = '压缩包解析失败，可能已加密或文件损坏，请下载后查看'
        }
      } finally {
        if (this._loadToken === token) {
          this.loading = false
        }
      }
    },
    /** jszip 读取 zip 目录,归一为 { path, dir, size } 列表 */
    async readZip(blob) {
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
      const { Archive } = await import('libarchive.js')
      if (!libarchiveInited) {
        Archive.init({ workerUrl: LIBARCHIVE_WORKER_URL })
        libarchiveInited = true
      }
      const archive = await Archive.open(blob)
      this._archive = archive
      try {
        // getFilesArray 返回 [{ file: { name, size }, path: '父目录/' }],大小来自档案头,无需解压
        const arr = await archive.getFilesArray()
        return arr.map(({ file, path }) => ({
          path: (path || '') + file.name,
          dir: false,
          size: typeof file.size === 'number' ? file.size : 0
        }))
      } finally {
        // 关闭即终止 Worker,释放 WASM 内存
        await archive.close()
        this._archive = null
      }
    },
    /** 由归一后的扁平条目构建嵌套目录树(缺失的中间层文件夹按需补齐) */
    buildTree(entries) {
      const root = { children: [] }
      // 路径(不含末尾 /)→ 目录节点,复用避免重复建层
      const dirMap = { '': root }
      let fileCount = 0
      let dirCount = 0
      let totalSize = 0

      // 逐级确保目录节点存在,返回最末层目录节点
      const ensureDir = (dirPath) => {
        if (dirMap[dirPath]) {
          return dirMap[dirPath]
        }
        const parts = dirPath.split('/')
        let cur = ''
        let parent = root
        for (const part of parts) {
          const next = cur ? cur + '/' + part : part
          if (!dirMap[next]) {
            const node = { id: next + '/', label: part, dir: true, children: [] }
            parent.children.push(node)
            dirMap[next] = node
            dirCount += 1
          }
          parent = dirMap[next]
          cur = next
        }
        return parent
      }

      entries.forEach(entry => {
        // 显式文件夹条目:仅建层(空文件夹也能呈现)
        if (entry.dir) {
          if (entry.path) {
            ensureDir(entry.path)
          }
          return
        }
        const path = entry.path
        const idx = path.lastIndexOf('/')
        const dirPath = idx >= 0 ? path.slice(0, idx) : ''
        const base = idx >= 0 ? path.slice(idx + 1) : path
        // 防御:异常空文件名跳过
        if (!base) {
          return
        }
        const parent = dirPath ? ensureDir(dirPath) : root
        parent.children.push({ id: path, label: base, dir: false, size: entry.size })
        fileCount += 1
        totalSize += entry.size
      })

      this.sortNodes(root.children)
      this.fileCount = fileCount
      this.dirCount = dirCount
      this.totalSize = totalSize
      this.treeData = root.children
      // 顶层文件夹默认展开一层,便于概览
      this.expandedKeys = root.children.filter(n => n.dir).map(n => n.id)
    },
    /** 递归排序 */
    sortNodes(nodes) {
      nodes.sort((a, b) => {
        if (a.dir !== b.dir) {
          return a.dir ? -1 : 1
        }
        return a.label.localeCompare(b.label, 'zh-Hans-CN', { numeric: true, sensitivity: 'base' })
      })
      nodes.forEach(n => {
        if (n.children && n.children.length) {
          this.sortNodes(n.children)
        }
      })
    },
    /** 按扩展名挑选文件图标 */
    fileIcon(name) {
      const ext = (name.split('.').pop() || '').toLowerCase()
      const map = {
        png: 'el-icon-picture-outline', jpg: 'el-icon-picture-outline', jpeg: 'el-icon-picture-outline',
        gif: 'el-icon-picture-outline', bmp: 'el-icon-picture-outline', webp: 'el-icon-picture-outline', svg: 'el-icon-picture-outline',
        mp4: 'el-icon-video-camera', mov: 'el-icon-video-camera', avi: 'el-icon-video-camera', mkv: 'el-icon-video-camera',
        mp3: 'el-icon-headset', wav: 'el-icon-headset', flac: 'el-icon-headset',
        zip: 'el-icon-folder-opened', rar: 'el-icon-folder-opened', '7z': 'el-icon-folder-opened',
        gz: 'el-icon-folder-opened', tar: 'el-icon-folder-opened',
        xls: 'el-icon-s-grid', xlsx: 'el-icon-s-grid', csv: 'el-icon-s-grid',
        doc: 'el-icon-document', docx: 'el-icon-document', pdf: 'el-icon-document',
        txt: 'el-icon-document-copy', md: 'el-icon-document-copy', json: 'el-icon-document-copy',
        xml: 'el-icon-document-copy', html: 'el-icon-document-copy', css: 'el-icon-document-copy',
        js: 'el-icon-document-copy', ts: 'el-icon-document-copy'
      }
      return map[ext] || 'el-icon-document'
    },
    /** el-tree 过滤 */
    filterNode(value, data) {
      if (!value) {
        return true
      }
      return data.label.toLowerCase().indexOf(value.toLowerCase()) !== -1
    },
    /** 展开/折叠全部节点 */
    setExpandAll(expand) {
      const tree = this.$refs.tree
      if (!tree) {
        return
      }
      const nodesMap = tree.store.nodesMap
      Object.keys(nodesMap).forEach(key => {
        nodesMap[key].expanded = expand
      })
    },
    /** 最大化/还原 */
    toggleMaximize() {
      this.maximized = !this.maximized
    },
    /** 关闭后清理 */
    cleanup() {
      this._loadToken = null
      if (this._archive) {
        this._archive.close()
        this._archive = null
      }
      this.resetState()
    },
    /** 复位状态 */
    resetState() {
      this.loading = false
      this.errorMsg = ''
      this.treeData = []
      this.expandedKeys = []
      this.filterText = ''
      this.fileCount = 0
      this.dirCount = 0
      this.totalSize = 0
    },
    // 文件大小格式化(公共工具)
    formatFileSize
  }
}
</script>

<style lang="scss">
@import '@/assets/styles/tokens.scss';

.archive-viewer-dialog {
  .el-dialog__body {
    padding: 0;
  }

  /* 标题栏最大化/还原按钮 */
  .archive-viewer__maximize {
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

  .archive-viewer__toolbar {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
    padding: 8px 16px;
    border-bottom: 1px solid #ebeef5;
  }

  .archive-viewer__filter {
    width: 220px;
  }

  .archive-viewer__summary {
    font-size: 12px;
    color: #909399;
  }

  .archive-viewer__body {
    position: relative;
    height: 74vh;
    overflow: auto;
    background: #fff;
  }

  .archive-viewer__tree {
    padding: 10px 16px;
  }

  /* 让节点内容撑满行宽,便于大小右对齐 */
  .archive-viewer__tree .el-tree-node__content {
    height: 30px;
  }

  .archive-node {
    display: flex;
    align-items: center;
    flex: 1;
    min-width: 0;
    padding-right: 8px;
    font-size: 13px;
  }

  .archive-node__icon {
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

  .archive-viewer__error {
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

    .archive-viewer__toolbar {
      flex-shrink: 0;
    }

    .archive-viewer__body {
      flex: 1;
      height: auto;
      min-height: 0;
    }
  }
}
</style>
