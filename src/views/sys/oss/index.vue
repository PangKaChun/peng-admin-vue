<template>
  <el-container>
    <el-header>
      <el-form
        :model="queryParams"
        ref="queryForm"
        label-position="right"
        class="query-form"
        size="small"
        :inline="true"
        v-show="showSearch"
        label-width="68px"
      >
        <el-form-item prop="originalName">
          <el-input
            v-model="queryParams.originalName"
            placeholder="请输入文件名"
            clearable
            style="width: 240px"
            @keyup.enter.native="handleQuery"
          />
        </el-form-item>
        <el-form-item prop="fileType">
          <el-select v-model="queryParams.fileType" placeholder="文件类型" clearable style="width: 160px">
            <el-option v-for="item in fileTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item prop="status">
          <el-select v-model="queryParams.status" placeholder="状态" clearable style="width: 160px">
            <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="el-icon-search" size="mini" @click="handleQuery">搜索</el-button>
          <el-button icon="el-icon-refresh" size="mini" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>

      <el-row :gutter="10" class="button-bar">
        <el-col :span="1.5">
          <el-button type="primary" icon="el-icon-upload2" size="mini" @click="openUpload">上传</el-button>
        </el-col>
        <el-col :span="1.5">
          <el-button
            type="danger"
            icon="el-icon-delete"
            size="mini"
            :disabled="multiple"
            @click="handleDelete"
            v-hasPermi="['sys:oss:del']"
          >删除</el-button>
        </el-col>
      </el-row>
    </el-header>
    <el-main>
      <el-table
        highlight-current-row
        stripe
        size="mini"
        v-loading="loading"
        :data="ossList"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="50" align="center" />
        <el-table-column label="文件名" align="center" prop="originalName" :show-overflow-tooltip="true" />
        <el-table-column label="预览" align="center" width="80">
          <template slot-scope="scope">
            <el-image
              v-if="scope.row.fileType === 'image'"
              class="oss-thumb"
              fit="cover"
              lazy
              :src="previewUrl(scope.row)"
              :preview-src-list="[previewUrl(scope.row)]"
            >
              <div slot="placeholder" class="oss-thumb__slot"><i class="el-icon-loading" /></div>
              <div slot="error" class="oss-thumb__slot"><i class="el-icon-picture-outline" /></div>
            </el-image>
            <div
              v-else-if="canPlay(scope.row)"
              class="oss-thumb oss-thumb--video"
              title="播放"
              @click="handlePlay(scope.row)"
            >
              <i class="el-icon-video-play" />
            </div>
            <div
              v-else-if="isPdf(scope.row)"
              class="oss-thumb oss-thumb--pdf"
              title="预览"
              @click="handlePreviewPdf(scope.row)"
            >
              <i class="el-icon-document" />
            </div>
            <div
              v-else-if="isExcel(scope.row)"
              class="oss-thumb oss-thumb--excel"
              title="预览"
              @click="handlePreviewExcel(scope.row)"
            >
              <i class="el-icon-s-grid" />
            </div>
            <div
              v-else-if="isWord(scope.row)"
              class="oss-thumb oss-thumb--word"
              title="预览"
              @click="handlePreviewWord(scope.row)"
            >
              <i class="el-icon-document" />
            </div>
            <div
              v-else-if="isArchive(scope.row)"
              class="oss-thumb oss-thumb--archive"
              title="预览"
              @click="handlePreviewArchive(scope.row)"
            >
              <i class="el-icon-folder-opened" />
            </div>
            <div
              v-else-if="isMarkdown(scope.row)"
              class="oss-thumb oss-thumb--md"
              title="预览"
              @click="handlePreviewMarkdown(scope.row)"
            >
              <i class="el-icon-tickets" />
            </div>
            <i v-else class="oss-thumb__icon" :class="fileTypeIcon(scope.row.fileType)" />
          </template>
        </el-table-column>
        <el-table-column label="文件类型" align="center" prop="fileType" width="90">
          <template slot-scope="scope">
            <span>{{ fileTypeLabel(scope.row.fileType) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="大小" align="center" prop="fileSize" width="100">
          <template slot-scope="scope">
            <span>{{ formatFileSize(scope.row.fileSize) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="存储后端" align="center" prop="ossType" width="90" />
        <el-table-column label="是否公开" align="center" prop="publicFlag" width="90">
          <template slot-scope="scope">
            <el-switch
              v-model="scope.row.publicFlag"
              :active-value="1"
              :inactive-value="0"
              :disabled="!$auth.hasPermi('sys:oss:edit')"
              @change="handleChangePublic(scope.row)"
            />
          </template>
        </el-table-column>
        <el-table-column label="状态" align="center" prop="status" width="80">
          <template slot-scope="scope">
            <el-tag :type="scope.row.status === 1 ? 'success' : 'danger'" size="mini">
              {{ scope.row.status === 1 ? '正常' : '无效' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" align="center" prop="createTime" width="160">
          <template slot-scope="scope">
            <span>{{ parseTime(scope.row.createTime) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" align="center" width="260" class-name="small-padding fixed-width">
          <template slot-scope="scope">
            <span v-if="scope.row.fileType === 'video' && scope.row.hlsStatus === 1" class="hls-tip">转码中</span>
            <span v-else-if="scope.row.fileType === 'video' && scope.row.hlsStatus === 3" class="hls-tip hls-tip--fail">转码失败</span>
            <el-button
              v-if="scope.row.fileType === 'video' && scope.row.hlsStatus === 3"
              size="mini"
              type="text"
              icon="el-icon-refresh-right"
              @click="handleRetryHls(scope.row)"
              v-hasPermi="['sys:oss:edit']"
            >重试转码</el-button>
            <el-button size="mini" type="text" icon="el-icon-download" @click="handleDownload(scope.row)">下载</el-button>
            <el-button v-if="scope.row.publicFlag === 1" size="mini" type="text" icon="el-icon-link" @click="handleCopyLink(scope.row)">复制链接</el-button>
            <el-button size="mini" type="text" icon="el-icon-delete" @click="handleDelete(scope.row)" v-hasPermi="['sys:oss:del']">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-main>
    <el-footer>
      <pagination
        v-show="total>0"
        :total="total"
        :page.sync="queryParams.pageNum"
        :limit.sync="queryParams.pageSize"
        @pagination="getList"
      />
    </el-footer>

    <!-- 上传文件对话框 -->
    <el-dialog title="上传文件" :visible.sync="uploadOpen" width="560px" append-to-body>
      <div class="upload-public">
        <span>是否公开：</span>
        <el-switch v-model="uploadPublic" :active-value="1" :inactive-value="0" active-text="公开" inactive-text="私有" />
      </div>
      <file-upload :is-public="uploadPublic" @success="handleUploadSuccess" />
      <div slot="footer" class="dialog-footer">
        <el-button @click="uploadOpen = false">关 闭</el-button>
      </div>
    </el-dialog>

    <!-- 视频播放对话框(HLS) -->
    <video-player ref="videoPlayer" />

    <!-- PDF 预览对话框(pdf.js) -->
    <pdf-viewer ref="pdfViewer" />

    <!-- Excel 预览对话框(SheetJS) -->
    <excel-viewer ref="excelViewer" />

    <!-- Word 预览对话框(docx-preview) -->
    <word-viewer ref="wordViewer" />

    <!-- 压缩包预览对话框(zip/rar/7z:jszip + libarchive.js + el-tree) -->
    <archive-viewer ref="archiveViewer" />

    <!-- Markdown 预览对话框(marked + DOMPurify + highlight.js) -->
    <markdown-viewer ref="markdownViewer" />
  </el-container>
</template>

<script>
import { listOss, downloadOssUrl, delOss, changeOssPublic, publicOssUrl, previewOssUrl, hlsPlayUrl, retryHlsOss } from '@/api/sys/oss'
import { formatFileSize } from '@/utils/file'
import FileUpload from '@/components/FileUpload'
import VideoPlayer from '@/components/VideoPlayer'
// PDF 预览走 pdf.js(含 worker/cmaps 资源),Excel 预览走 SheetJS,Word 预览走 docx-preview,
// 压缩包(zip/rar/7z)预览走 jszip + libarchive.js,Markdown 预览走 marked,均异步加载避免拖累首屏
const PdfViewer = () => import('@/components/PdfViewer')
const ExcelViewer = () => import('@/components/ExcelViewer')
const WordViewer = () => import('@/components/WordViewer')
const ArchiveViewer = () => import('@/components/ArchiveViewer')
const MarkdownViewer = () => import('@/components/MarkdownViewer')

export default {
  name: 'Oss',
  components: { FileUpload, VideoPlayer, PdfViewer, ExcelViewer, WordViewer, ArchiveViewer, MarkdownViewer },
  data() {
    return {
      // 遮罩层
      loading: false,
      // 上传对话框
      uploadOpen: false,
      // 上传是否公开
      uploadPublic: 0,
      // 选中数组
      ids: [],
      // 非多个禁用
      multiple: true,
      // 显示搜索条件
      showSearch: true,
      // 总条数
      total: 0,
      // 文件表格数据
      ossList: [],
      // 文件类型选项
      fileTypeOptions: [
        { value: 'image', label: '图片' },
        { value: 'video', label: '视频' },
        { value: 'document', label: '文档' },
        { value: 'other', label: '其它' }
      ],
      // 状态选项
      statusOptions: [
        { value: 1, label: '正常' },
        { value: 0, label: '无效' }
      ],
      // 查询参数
      queryParams: {
        pageNum: 1,
        pageSize: 10,
        originalName: undefined,
        fileType: undefined,
        status: undefined
      }
    }
  },
  created() {
    this.getList()
  },
  methods: {
    /** 查询文件列表 */
    getList() {
      this.loading = true
      listOss(this.queryParams).then(response => {
        this.ossList = response.records
        this.total = response.total
        this.loading = false
      }).catch(() => {
        this.loading = false
      })
    },
    /** 搜索按钮操作 */
    handleQuery() {
      this.queryParams.pageNum = 1
      this.getList()
    },
    /** 重置按钮操作 */
    resetQuery() {
      this.resetForm('queryForm')
      this.handleQuery()
    },
    // 多选框选中数据
    handleSelectionChange(selection) {
      this.ids = selection.map(item => item.ossId)
      this.multiple = !selection.length
    },
    /** 打开上传对话框 */
    openUpload() {
      this.uploadOpen = true
    },
    /** 上传成功回调 */
    handleUploadSuccess() {
      this.$modal.msgSuccess('上传成功')
      this.getList()
    },
    /** 是否可播放 */
    canPlay(row) {
      return row.fileType === 'video' && row.hlsStatus === 2
    },
    /** 是否 PDF 文件 */
    isPdf(row) {
      return row.fileMimeType === 'application/pdf' || (row.fileExtension || '').toLowerCase() === 'pdf'
    },
    /** 预览 PDF(pdf.js 对话框:缩放/翻页/搜索) */
    handlePreviewPdf(row) {
      this.$refs.pdfViewer.open(this.previewUrl(row), row.originalName)
    },
    /** 是否 Excel/CSV 文件 */
    isExcel(row) {
      const ext = (row.fileExtension || '').toLowerCase()
      const mime = row.fileMimeType || ''
      return ['xlsx', 'xls', 'csv'].includes(ext)
        || mime.includes('spreadsheetml')
        || mime === 'application/vnd.ms-excel'
        || mime === 'text/csv'
    },
    /** 预览 Excel(SheetJS 对话框:多 Sheet/合并单元格) */
    handlePreviewExcel(row) {
      this.$refs.excelViewer.open(this.previewUrl(row), row.originalName)
    },
    /** 是否 Word 文件(docx-preview 仅支持 .docx,.doc 打开后由查看器提示降级) */
    isWord(row) {
      const ext = (row.fileExtension || '').toLowerCase()
      const mime = row.fileMimeType || ''
      return ['doc', 'docx'].includes(ext)
        || mime.includes('wordprocessingml')
        || mime === 'application/msword'
    },
    /** 预览 Word(docx-preview 对话框:还原页面版式) */
    handlePreviewWord(row) {
      this.$refs.wordViewer.open(this.previewUrl(row), row.originalName)
    },
    /** 压缩格式判定:zip 走 jszip,rar/7z 走 libarchive.js;其余(tar/gz 等)不支持返回 null */
    archiveFormat(row) {
      const ext = (row.fileExtension || '').toLowerCase()
      const mime = row.fileMimeType || ''
      if (ext === 'zip' || mime === 'application/zip' || mime === 'application/x-zip-compressed') {
        return 'zip'
      }
      if (ext === 'rar' || mime === 'application/vnd.rar' || mime === 'application/x-rar-compressed') {
        return 'rar'
      }
      if (ext === '7z' || mime === 'application/x-7z-compressed') {
        return '7z'
      }
      return null
    },
    /** 是否可预览的压缩包(zip/rar/7z) */
    isArchive(row) {
      return this.archiveFormat(row) !== null
    },
    /** 预览压缩包(el-tree 展示目录结构) */
    handlePreviewArchive(row) {
      this.$refs.archiveViewer.open(this.previewUrl(row), row.originalName, this.archiveFormat(row))
    },
    /** 是否 Markdown 文件 */
    isMarkdown(row) {
      const ext = (row.fileExtension || '').toLowerCase()
      return ['md', 'markdown'].includes(ext) || row.fileMimeType === 'text/markdown'
    },
    /** 预览 Markdown(marked 渲染 + 代码高亮) */
    handlePreviewMarkdown(row) {
      this.$refs.markdownViewer.open(this.previewUrl(row), row.originalName)
    },
    /** 播放视频(HLS):公开/私有共用同一地址,公开文件不携带令牌(带无效令牌反而会被 401) */
    handlePlay(row) {
      const isPublic = row.publicFlag === 1
      this.$refs.videoPlayer.play(hlsPlayUrl(row.ossId), row.originalName, { withToken: !isPublic })
    },
    /** 重试 HLS 转码 */
    handleRetryHls(row) {
      retryHlsOss(row.ossId).then(() => {
        this.$modal.msgSuccess('已重新提交转码')
        this.getList()
      })
    },
    /** 下载按钮操作:交给浏览器原生下载(流式落盘 + Range 续传),公开文件免令牌 */
    handleDownload(row) {
      const a = document.createElement('a')
      a.href = downloadOssUrl(row.ossId, row.publicFlag === 1)
      a.download = row.originalName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    },
    /** 切换公开状态 */
    handleChangePublic(row) {
      changeOssPublic({ ossId: row.ossId, publicFlag: row.publicFlag })
        .then(() => {
          this.$modal.msgSuccess(row.publicFlag === 1 ? '已公开' : '已设为私有')
        })
        .catch(() => {
          // 失败回滚开关状态
          row.publicFlag = row.publicFlag === 1 ? 0 : 1
        })
    },
    /** 复制公开链接 */
    handleCopyLink(row) {
      const url = publicOssUrl(row.ossId)
      const done = () => this.$modal.msgSuccess('链接已复制')
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(done).catch(() => this.fallbackCopy(url, done))
      } else {
        this.fallbackCopy(url, done)
      }
    },
    /** 兼容性复制(非安全上下文/旧浏览器) */
    fallbackCopy(text, done) {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      try {
        document.execCommand('copy')
        done()
      } catch (e) {
        this.$modal.msgError('复制失败，请手动复制：' + text)
      } finally {
        document.body.removeChild(ta)
      }
    },
    /** 删除按钮操作 */
    handleDelete(row) {
      const ossIds = row.ossId || this.ids
      this.$modal
        .confirm('是否确认删除选中的文件？')
        .then(() => delOss(ossIds))
        .then(() => {
          this.getList()
          this.$modal.msgSuccess('删除成功')
        })
        .catch(() => {})
    },
    /** 行内预览地址 */
    previewUrl(row) {
      return previewOssUrl(row.ossId, false)
    },
    /** 非图片类型的占位图标 */
    fileTypeIcon(fileType) {
      const icons = { video: 'el-icon-video-camera', document: 'el-icon-document' }
      return icons[fileType] || 'el-icon-files'
    },
    /** 文件类型名称 */
    fileTypeLabel(value) {
      const item = this.fileTypeOptions.find(opt => opt.value === value)
      return item ? item.label : (value || '')
    },
    // 文件大小格式化(公共工具)
    formatFileSize
  }
}
</script>

<style lang="scss" scoped>
@import '@/assets/styles/tokens.scss';
.el-container {
  height: 100%;
}
.el-aside {
  border: 1px solid #d7dae2;
}
.el-header {
  height: auto !important;
  padding: 0;
}
.el-main {
  padding: 0;
}
.el-footer {
  height: auto !important;
  border: 1px solid #d7dae2;
}
.query-form {
  padding-top: 20px;
  background-color: #f2f2f2;
  padding-left: 20px;
}
.upload-public {
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  font-size: 14px;
}
.hls-tip {
  margin-right: 8px;
  font-size: 12px;
  color: #909399;
}
.oss-thumb {
  display: block;
  width: 48px;
  height: 32px;
  margin: 0 auto;
  border-radius: 4px;
  background: #f5f7fa;
  cursor: pointer;
}
.oss-thumb__slot {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-size: 14px;
  color: $label-tertiary;
}
.oss-thumb--video {
  display: flex;
  align-items: center;
  justify-content: center;
  background: $label;
  color: #fff;
  font-size: 16px;
  transition: background-color 0.2s ease;

  &:hover {
    background: mix(#fff, $label, 15%);
  }
}
.oss-thumb--pdf {
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba($color-danger, 0.08);
  color: $color-danger;
  font-size: 16px;
  transition: background-color 0.2s ease;

  &:hover {
    background: rgba($color-danger, 0.14);
  }
}
.oss-thumb--excel {
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba($color-success, 0.08);
  color: $color-success;
  font-size: 16px;
  transition: background-color 0.2s ease;

  &:hover {
    background: rgba($color-success, 0.14);
  }
}
.oss-thumb--word {
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba($color-primary, 0.08);
  color: $color-primary;
  font-size: 16px;
  transition: background-color 0.2s ease;

  &:hover {
    background: rgba($color-primary, 0.14);
  }
}
.oss-thumb--archive {
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba($color-warning, 0.10);
  color: $color-warning;
  font-size: 16px;
  transition: background-color 0.2s ease;

  &:hover {
    background: rgba($color-warning, 0.18);
  }
}
.oss-thumb--md {
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba($label, 0.06);
  color: $label-secondary;
  font-size: 16px;
  transition: background-color 0.2s ease;

  &:hover {
    background: rgba($label, 0.12);
  }
}
.oss-thumb__icon {
  font-size: 18px;
  color: $label-tertiary;
}
.hls-tip--fail {
  color: $color-danger;
}
</style>
