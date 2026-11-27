<template>
  <div class="page">
    <div class="page-toolbar">
      <el-form ref="queryForm" :model="queryParams" inline size="small" class="page-filters" @submit.native.prevent>
        <el-form-item prop="originalName">
          <el-input
            v-model="queryParams.originalName"
            placeholder="文件名"
            clearable
            style="width: 180px"
            @keyup.enter.native="handleQuery"
          />
        </el-form-item>
        <el-form-item prop="fileType">
          <el-select v-model="queryParams.fileType" placeholder="文件类型" clearable style="width: 120px">
            <el-option v-for="item in fileTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item prop="status">
          <el-select v-model="queryParams.status" placeholder="状态" clearable style="width: 110px">
            <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button icon="el-icon-search" size="small" @click="handleQuery">搜索</el-button>
          <el-button type="text" size="small" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>

      <div class="page-actions">
        <el-button
          v-if="!multiple && $auth.hasPermi('sys:oss:del')"
          type="danger"
          plain
          icon="el-icon-delete"
          size="small"
          @click="handleDelete()"
        >删除</el-button>
        <el-button
          type="primary"
          icon="el-icon-upload2"
          size="small"
          @click="openUpload"
        >上传</el-button>
      </div>
    </div>

    <div class="page-body">
      <el-table
        v-loading="loading"
        :data="ossList"
        height="100%"
        highlight-current-row
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="46" align="center" />
        <el-table-column label="文件名" align="left" prop="originalName" min-width="180" show-overflow-tooltip />
        <el-table-column label="预览" align="center" width="76">
          <template slot-scope="scope">
            <i v-if="!canAccess(scope.row)" class="oss-thumb__icon el-icon-lock" title="私有文件，仅上传人或管理员可查看" />
            <el-image
              v-else-if="scope.row.fileType === 'image' && thumbUrl(scope.row)"
              class="oss-thumb"
              fit="cover"
              lazy
              :src="thumbUrl(scope.row)"
              :preview-src-list="[thumbUrl(scope.row)]"
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
        <el-table-column label="类型" align="center" prop="fileType" width="80">
          <template slot-scope="scope">
            <span>{{ fileTypeLabel(scope.row.fileType) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="大小" align="right" prop="fileSize" width="96">
          <template slot-scope="scope">
            <span>{{ formatFileSize(scope.row.fileSize) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="存储" align="center" prop="ossType" width="84" />
        <el-table-column label="公开" align="center" prop="publicFlag" width="76">
          <template slot-scope="scope">
            <el-switch
              v-model="scope.row.publicFlag"
              :active-value="1"
              :inactive-value="0"
              :disabled="!$auth.hasPermi('sys:oss:edit') || !canAccess(scope.row)"
              @change="handleChangePublic(scope.row)"
            />
          </template>
        </el-table-column>
        <el-table-column label="状态" align="center" prop="status" width="76">
          <template slot-scope="scope">
            <el-tag :type="scope.row.status === 1 ? 'success' : 'danger'">
              {{ scope.row.status === 1 ? '正常' : '无效' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" align="center" prop="createTime" width="160">
          <template slot-scope="scope">
            <span>{{ parseTime(scope.row.createTime) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" align="center" width="210" class-name="small-padding">
          <template slot-scope="scope">
            <span v-if="scope.row.fileType === 'video' && scope.row.hlsStatus === 1" class="hls-tip">转码中</span>
            <span v-else-if="scope.row.fileType === 'video' && scope.row.hlsStatus === 3" class="hls-tip hls-tip--fail">转码失败</span>
            <el-button
              size="mini"
              type="text"
              :disabled="!canAccess(scope.row)"
              @click="handleDownload(scope.row)"
            >下载</el-button>
            <el-button
              v-hasPermi="['sys:oss:del']"
              size="mini"
              type="text"
              @click="handleDelete(scope.row)"
            >删除</el-button>
            <el-dropdown size="mini" @command="command => handleCommand(command, scope.row)">
              <span class="el-dropdown-link">
                更多<i class="el-icon-arrow-down el-icon--right" />
              </span>
              <el-dropdown-menu slot="dropdown">
                <template v-if="scope.row.publicFlag === 1 && canPlay(scope.row)">
                  <el-dropdown-item command="handleCopyLink" icon="el-icon-link">复制原文件链接</el-dropdown-item>
                  <el-dropdown-item command="handleCopyHlsLink" icon="el-icon-video-play">复制 HLS 链接</el-dropdown-item>
                </template>
                <el-dropdown-item v-else-if="scope.row.publicFlag === 1" command="handleCopyLink" icon="el-icon-link">复制链接</el-dropdown-item>
                <el-dropdown-item
                  v-else
                  command="handleSign"
                  icon="el-icon-key"
                  :disabled="!canAccess(scope.row)"
                >生成签名地址</el-dropdown-item>
                <el-dropdown-item
                  v-if="scope.row.fileType === 'video' && scope.row.hlsStatus === 3 && $auth.hasPermi('sys:oss:edit')"
                  command="handleRetryHls"
                  icon="el-icon-refresh-right"
                >重试转码</el-dropdown-item>
              </el-dropdown-menu>
            </el-dropdown>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div v-show="total > 0" class="page-footer">
      <pagination
        :total="total"
        :page.sync="queryParams.pageNum"
        :limit.sync="queryParams.pageSize"
        @pagination="getList"
      />
    </div>

    <el-dialog
      title="上传文件"
      :visible.sync="uploadOpen"
      width="520px"
      append-to-body
      :before-close="handleUploadBeforeClose"
      @closed="uploadBusy = false"
    >
      <div class="upload-public">
        <span class="upload-public__label">公开访问</span>
        <el-switch v-model="uploadPublic" :active-value="1" :inactive-value="0" :disabled="uploadBusy" />
      </div>
      <file-upload
        v-if="uploadOpen"
        :is-public="uploadPublic"
        @busy-change="uploadBusy = $event"
        @success="handleUploadSuccess"
      />
      <div slot="footer">
        <el-button @click="closeUpload">关闭</el-button>
      </div>
    </el-dialog>

    <el-dialog title="签名地址" :visible.sync="signOpen" width="620px" append-to-body>
      <el-form label-width="80px" size="small">
        <el-form-item label="文件名">{{ signInfo.name }}</el-form-item>
        <el-form-item label="有效期至">
          <span>{{ signInfo.expireTime }}</span>
          <span class="sign-hint">有效期内持链接可直接访问</span>
        </el-form-item>
        <el-form-item v-for="item in signInfo.urls" :key="item.label" :label="item.label">
          <el-input :value="item.url" readonly>
            <el-button slot="append" icon="el-icon-document-copy" @click="copyUrl(item.url, item.label)">复制</el-button>
          </el-input>
        </el-form-item>
      </el-form>
      <div slot="footer">
        <el-button @click="signOpen = false">关闭</el-button>
      </div>
    </el-dialog>

    <video-player ref="videoPlayer" />
    <pdf-viewer ref="pdfViewer" />
    <excel-viewer ref="excelViewer" />
    <word-viewer ref="wordViewer" />
    <archive-viewer ref="archiveViewer" />
    <markdown-viewer ref="markdownViewer" />
  </div>
</template>

<script>
import {
  listOss, downloadOssUrl, delOss, changeOssPublic, getOssShare, getOssPreviewBlob, previewOssUrl, hlsPlayUrl, shareOssUrls, retryHlsOss
} from '@/api/sys/oss'
import { formatFileSize } from '@/utils/file'
import { copyText } from '@/utils/clipboard'
import FileUpload from '@/components/FileUpload'
import VideoPlayer from '@/components/VideoPlayer'
import PdfViewer from '@/components/PdfViewer'
import ExcelViewer from '@/components/ExcelViewer'
import WordViewer from '@/components/WordViewer'
import ArchiveViewer from '@/components/ArchiveViewer'
import MarkdownViewer from '@/components/MarkdownViewer'

export default {
  name: 'Oss',
  components: { FileUpload, VideoPlayer, PdfViewer, ExcelViewer, WordViewer, ArchiveViewer, MarkdownViewer },
  data() {
    return {
      loading: false,
      uploadOpen: false,
      uploadPublic: 0,
      uploadBusy: false,
      ids: [],
      multiple: true,
      total: 0,
      ossList: [],
      thumbUrls: {},
      signOpen: false,
      signInfo: {},
      fileTypeOptions: [
        { value: 'image', label: '图片' },
        { value: 'video', label: '视频' },
        { value: 'document', label: '文档' },
        { value: 'other', label: '其它' }
      ],
      statusOptions: [
        { value: 1, label: '正常' },
        { value: 0, label: '无效' }
      ],
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
  beforeDestroy() {
    this._thumbToken = null
    this.revokeThumbs()
  },
  methods: {
    getList() {
      this.loading = true
      listOss(this.queryParams)
        .then(response => {
          this.ossList = response.records
          this.total = response.total
          this.loadThumbs()
        })
        .finally(() => {
          this.loading = false
        })
    },
    handleQuery() {
      this.queryParams.pageNum = 1
      this.getList()
    },
    resetQuery() {
      this.resetForm('queryForm')
      this.handleQuery()
    },
    handleSelectionChange(selection) {
      this.ids = selection.map(item => item.ossId)
      this.multiple = !selection.length
    },
    openUpload() {
      this.uploadPublic = 0
      this.uploadBusy = false
      this.uploadOpen = true
    },
    closeUpload() {
      this.handleUploadBeforeClose(() => {
        this.uploadOpen = false
      })
    },
    handleUploadBeforeClose(done) {
      if (!this.uploadBusy) {
        done()
        return
      }
      this.$modal
        .confirm('文件正在上传或合并中，关闭将中断当前任务，确定关闭吗？')
        .then(() => done())
        .catch(() => {})
    },
    handleUploadSuccess() {
      this.$modal.msgSuccess('上传成功')
      this.getList()
    },
    canPlay(row) {
      return row.fileType === 'video' && row.hlsStatus === 2
    },
    isPdf(row) {
      return row.fileMimeType === 'application/pdf' || (row.fileExtension || '').toLowerCase() === 'pdf'
    },
    handlePreviewPdf(row) {
      this.$refs.pdfViewer.open(getOssPreviewBlob(row.ossId), row.originalName)
    },
    isExcel(row) {
      const ext = (row.fileExtension || '').toLowerCase()
      const mime = row.fileMimeType || ''
      return ['xlsx', 'xls', 'csv'].includes(ext) ||
        mime.includes('spreadsheetml') ||
        mime === 'application/vnd.ms-excel' ||
        mime === 'text/csv'
    },
    handlePreviewExcel(row) {
      this.$refs.excelViewer.open(getOssPreviewBlob(row.ossId), row.originalName)
    },
    isWord(row) {
      const ext = (row.fileExtension || '').toLowerCase()
      const mime = row.fileMimeType || ''
      return ['doc', 'docx'].includes(ext) ||
        mime.includes('wordprocessingml') ||
        mime === 'application/msword'
    },
    handlePreviewWord(row) {
      this.$refs.wordViewer.open(getOssPreviewBlob(row.ossId), row.originalName)
    },
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
    isArchive(row) {
      return this.archiveFormat(row) !== null
    },
    handlePreviewArchive(row) {
      this.$refs.archiveViewer.open(getOssPreviewBlob(row.ossId), row.originalName, this.archiveFormat(row))
    },
    isMarkdown(row) {
      const ext = (row.fileExtension || '').toLowerCase()
      return ['md', 'markdown'].includes(ext) || row.fileMimeType === 'text/markdown'
    },
    handlePreviewMarkdown(row) {
      this.$refs.markdownViewer.open(getOssPreviewBlob(row.ossId), row.originalName)
    },
    handlePlay(row) {
      this.$refs.videoPlayer.play(hlsPlayUrl(row.ossId), row.originalName, {
        withToken: row.publicFlag !== 1,
        shareUrl: () => this.shareUrl(row, 'hls')
      })
    },
    handleRetryHls(row) {
      retryHlsOss(row.ossId).then(() => {
        this.$modal.msgSuccess('已重新提交转码')
        this.getList()
      })
    },
    handleDownload(row) {
      const href = row.publicFlag === 1 ? Promise.resolve(downloadOssUrl(row.ossId)) : this.shareUrl(row, 'download')
      href.then(url => {
        const a = document.createElement('a')
        a.href = url
        a.download = row.originalName
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      })
    },
    handleChangePublic(row) {
      changeOssPublic({ ossId: row.ossId, publicFlag: row.publicFlag })
        .then(() => {
          this.$modal.msgSuccess(row.publicFlag === 1 ? '已公开' : '已设为私有')
          this.loadThumb(row)
        })
        .catch(() => {
          row.publicFlag = row.publicFlag === 1 ? 0 : 1
        })
    },
    handleCommand(command, row) {
      if (command === 'handleCopyLink') this.handleCopyLink(row)
      else if (command === 'handleCopyHlsLink') this.handleCopyHlsLink(row)
      else if (command === 'handleSign') this.handleSign(row)
      else if (command === 'handleRetryHls') this.handleRetryHls(row)
    },
    handleCopyLink(row) {
      this.copyUrl(previewOssUrl(row.ossId), this.canPlay(row) ? '原文件链接' : '链接')
    },
    handleCopyHlsLink(row) {
      this.copyUrl(hlsPlayUrl(row.ossId), 'HLS 链接')
    },
    handleSign(row) {
      getOssShare(row.ossId).then(share => {
        const urls = shareOssUrls(share)
        const list = [
          { label: '预览地址', url: urls.preview },
          { label: '下载地址', url: urls.download }
        ]
        if (this.canPlay(row)) {
          list.push({ label: 'HLS 地址', url: urls.hls })
        }
        this.signInfo = { name: row.originalName, expireTime: this.parseTime(share.expires), urls: list }
        this.signOpen = true
      })
    },
    copyUrl(text, label = '链接') {
      copyText(text)
        .then(() => this.$modal.msgSuccess(label + '已复制'))
        .catch(() => this.$modal.msgError('复制失败，请手动复制：' + text))
    },
    handleDelete(row) {
      const ossIds = (row && row.ossId) || this.ids
      const message = row && row.ossId
        ? `确认删除文件“${row.originalName}”吗？`
        : `确认删除选中的 ${ossIds.length} 个文件吗？`
      this.$modal
        .confirm(message)
        .then(() => delOss(ossIds))
        .then(() => {
          this.getList()
          this.$modal.msgSuccess('删除成功')
        })
        .catch(() => {})
    },
    canAccess(row) {
      if (row.publicFlag === 1 || this.$auth.hasRole('SYSTEM_ADMIN')) {
        return true
      }
      return !!row.userId && row.userId === this.$store.getters.userInfo.userId
    },
    shareUrl(row, kind) {
      return getOssShare(row.ossId).then(share => shareOssUrls(share)[kind])
    },
    thumbUrl(row) {
      return row.publicFlag === 1 ? previewOssUrl(row.ossId) : this.thumbUrls[row.ossId]
    },
    loadThumbs() {
      this.revokeThumbs()
      this._thumbToken = {}
      this.ossList.forEach(row => this.loadThumb(row))
    },
    loadThumb(row) {
      if (row.fileType !== 'image' || row.publicFlag === 1 || !this.canAccess(row) || this.thumbUrls[row.ossId]) {
        return
      }
      const token = this._thumbToken
      getOssPreviewBlob(row.ossId)
        .then(blob => {
          if (this._thumbToken === token) {
            this.$set(this.thumbUrls, row.ossId, URL.createObjectURL(blob))
          }
        })
        .catch(() => {})
    },
    revokeThumbs() {
      Object.values(this.thumbUrls).forEach(url => URL.revokeObjectURL(url))
      this.thumbUrls = {}
    },
    fileTypeIcon(fileType) {
      const icons = { image: 'el-icon-picture-outline', video: 'el-icon-video-camera', document: 'el-icon-document' }
      return icons[fileType] || 'el-icon-files'
    },
    fileTypeLabel(value) {
      const item = this.fileTypeOptions.find(opt => opt.value === value)
      return item ? item.label : (value || '')
    },
    formatFileSize
  }
}
</script>

<style lang="scss" scoped>
@import '@/assets/styles/tokens.scss';

.upload-public {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: $space-3;
  padding-bottom: $space-3;
  border-bottom: 1px solid $separator-light;

  &__label {
    font-size: 13px;
    font-weight: 500;
    color: $label;
  }
}

.sign-hint {
  margin-left: $space-2;
  font-size: 12px;
  color: $label-tertiary;
}

.hls-tip {
  margin-right: $space-2;
  font-size: 12px;
  color: $label-secondary;

  &--fail {
    color: $color-danger;
  }
}

.oss-thumb {
  display: block;
  width: 48px;
  height: 32px;
  margin: 0 auto;
  border-radius: $radius-xs;
  background: $fill-quaternary;
  cursor: pointer;

  &__slot {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    font-size: 14px;
    color: $label-tertiary;
  }

  &__icon {
    font-size: 18px;
    color: $label-tertiary;
  }

  &--video,
  &--pdf,
  &--excel,
  &--word,
  &--archive,
  &--md {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    transition: background-color $duration-fast ease;
  }

  &--video {
    background: $label;
    color: $bg-base;
    &:hover { background: lighten($label, 12%); }
  }

  &--pdf {
    background: rgba($color-danger, 0.08);
    color: $color-danger;
    &:hover { background: rgba($color-danger, 0.14); }
  }

  &--excel {
    background: rgba($color-success, 0.08);
    color: $color-success;
    &:hover { background: rgba($color-success, 0.14); }
  }

  &--word {
    background: rgba($color-primary, 0.08);
    color: $color-primary;
    &:hover { background: rgba($color-primary, 0.14); }
  }

  &--archive {
    background: rgba($color-warning, 0.1);
    color: $color-warning;
    &:hover { background: rgba($color-warning, 0.18); }
  }

  &--md {
    background: $fill-quaternary;
    color: $label-secondary;
    &:hover { background: $fill-active; }
  }
}
</style>
