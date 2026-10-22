<template>
  <div class="chunk-upload">
    <el-upload
      action="#"
      :accept="accept"
      :auto-upload="false"
      :show-file-list="false"
      :multiple="false"
      :disabled="isBusy"
      :on-change="onFileChange"
      drag
    >
      <i class="el-icon-upload"></i>
      <div class="el-upload__text">将文件拖到此处，或<em>点击上传</em></div>
      <div class="el-upload__tip" slot="tip">
        单文件最大 {{ maxSizeMb }}MB，支持分片上传与断点续传
      </div>
    </el-upload>

    <div class="upload-status" v-if="file">
      <div class="file-row">
        <i class="el-icon-document file-icon"></i>
        <div class="file-info">
          <div class="file-name" :title="file.name">{{ file.name }}</div>
          <div class="file-size">{{ formatSize(file.size) }}</div>
        </div>
        <span class="status-text" :class="'status-text--' + status">{{ statusText }}</span>
        <div class="actions">
          <el-button v-if="isUploading" size="mini" icon="el-icon-video-pause" @click="pause">暂停</el-button>
          <el-button v-if="isPaused" type="primary" size="mini" icon="el-icon-video-play" @click="continueUpload">继续</el-button>
          <el-button v-if="isError" type="warning" size="mini" icon="el-icon-refresh-right" @click="continueUpload">重试</el-button>
          <el-button v-if="!isBusy" size="mini" icon="el-icon-delete" @click="clear">清除</el-button>
        </div>
      </div>
      <el-progress
        :percentage="percent"
        :status="progressStatus"
        :stroke-width="8"
        :show-text="false"
        class="upload-progress"
      />
    </div>
  </div>
</template>

<script>
import { checkChunks, uploadChunk, mergeChunks, getMergeStatus } from '@/api/sys/oss'
import { formatFileSize } from '@/utils/file'

// 上传状态(取值同时用于 status-text--* 样式类后缀)
const UploadStatus = Object.freeze({
  IDLE: 'idle',
  CHECKING: 'checking',
  UPLOADING: 'uploading',
  PAUSED: 'paused',
  MERGING: 'merging',
  SUCCESS: 'success',
  ERROR: 'error'
})

export default {
  name: 'FileUpload',
  props: {
    // 是否公开 0私有 1公开
    isPublic: {
      type: Number,
      default: 0
    },
    // 分片大小，默认 10MB
    chunkSize: {
      type: Number,
      default: 10 * 1024 * 1024
    },
    // 接受的文件类型
    accept: {
      type: String,
      default: ''
    },
    // 单文件最大体积(MB)
    maxSizeMb: {
      type: Number,
      default: 10240
    },
    // 并发上传分片数
    concurrent: {
      type: Number,
      default: 3
    }
  },
  data() {
    return {
      // 当前文件(原生 File)
      file: null,
      // 文件唯一标识(断点续传分组键)
      identifier: '',
      // 分片总数
      totalChunks: 0,
      // 已上传分片序号集合
      uploadedSet: new Set(),
      // 上传状态,取值见 UploadStatus
      status: UploadStatus.IDLE,
      // 进度百分比
      percent: 0,
      // 暂停标记
      paused: false,
      // 错误信息
      errorMsg: ''
    }
  },
  computed: {
    // 分片大小(MB) 展示
    chunkSizeMb() {
      return (this.chunkSize / 1024 / 1024).toFixed(0)
    },
    // 是否处于忙碌状态
    isBusy() {
      return this.status === UploadStatus.CHECKING
        || this.status === UploadStatus.UPLOADING
        || this.status === UploadStatus.MERGING
    },
    // 是否上传中(可暂停)
    isUploading() {
      return this.status === UploadStatus.UPLOADING
    },
    // 是否已暂停(可继续)
    isPaused() {
      return this.status === UploadStatus.PAUSED
    },
    // 是否失败(可重试)
    isError() {
      return this.status === UploadStatus.ERROR
    },
    // 进度条状态
    progressStatus() {
      if (this.status === UploadStatus.SUCCESS) {
        return 'success'
      }
      if (this.status === UploadStatus.ERROR) {
        return 'exception'
      }
      return undefined
    },
    // 状态文案
    statusText() {
      switch (this.status) {
        case UploadStatus.CHECKING:
          return '校验分片...'
        case UploadStatus.UPLOADING:
          return `上传中 ${this.percent}%`
        case UploadStatus.PAUSED:
          return '已暂停'
        case UploadStatus.MERGING:
          return '合并中...'
        case UploadStatus.SUCCESS:
          return '上传完成'
        case UploadStatus.ERROR:
          return this.errorMsg || '上传失败'
        default:
          return ''
      }
    }
  },
  methods: {
    /** 选择文件 */
    onFileChange(file) {
      if (this.isBusy) {
        this.$modal.msgError('请等待当前文件上传完成')
        return
      }
      if (file && file.raw) {
        this.startUpload(file.raw)
      }
    },
    /** 开始上传 */
    async startUpload(rawFile) {
      if (rawFile.size === 0) {
        this.$modal.msgError('不支持上传空文件')
        return
      }
      if (rawFile.size / 1024 / 1024 > this.maxSizeMb) {
        this.$modal.msgError(`上传文件大小不能超过 ${this.maxSizeMb}MB`)
        return
      }
      this.resetState()
      this.file = rawFile
      this.identifier = this.generateIdentifier(rawFile)
      this.totalChunks = Math.max(1, Math.ceil(rawFile.size / this.chunkSize))
      this.status = UploadStatus.CHECKING
      try {
        // 断点续传：查询服务端已持有的分片
        const res = await checkChunks({ identifier: this.identifier, totalChunks: this.totalChunks })
        this.uploadedSet = new Set(res.uploadedChunks || [])
        this.updatePercent()
      } catch (e) {
        this.status = UploadStatus.ERROR
        this.errorMsg = '检查分片失败，可点击重试'
        return
      }
      await this.continueUpload()
    },
    /** 继续/重试上传 */
    async continueUpload() {
      this.prepareUpload()

      const pending = this.getPendingChunks()
      // 分片已齐(如秒传续传场景)直接进入合并
      if (!pending.length) {
        return this.merge()
      }

      try {
        await this.uploadPendingChunks(pending)
      } catch (e) {
        this.status = UploadStatus.ERROR
        this.errorMsg = '分片上传失败，可点击重试'
        return
      }

      if (this.paused) {
        this.status = UploadStatus.PAUSED
        return
      }
      await this.merge()
    },
    /** 进入上传态,清除上一轮的暂停与错误标记 */
    prepareUpload() {
      this.status = UploadStatus.UPLOADING
      this.paused = false
      this.errorMsg = ''
    },
    /** 收集待上传分片序号(断点续传:跳过服务端已持有的) */
    getPendingChunks() {
      const pending = []
      for (let i = 0; i < this.totalChunks; i++) {
        if (!this.uploadedSet.has(i)) {
          pending.push(i)
        }
      }
      return pending
    },
    /**
     * 并发上传待传分片
     *
     * 固定数量的 worker 共享游标领取任务;任一分片重试耗尽即置 failed 让其余 worker 停止领新片,
     * 并向上抛出由调用方统一置错误态。暂停后同样不再领新片,已在途的分片跑完即结束。
     */
    async uploadPendingChunks(pending) {
      let cursor = 0
      let failed = false
      const worker = async () => {
        while (cursor < pending.length && !this.paused && !failed) {
          const index = pending[cursor++]
          try {
            await this.sendChunkWithRetry(index)
            this.uploadedSet.add(index)
            this.updatePercent()
          } catch (e) {
            failed = true
            throw e
          }
        }
      }
      const workers = []
      const count = Math.min(this.concurrent, pending.length)
      for (let w = 0; w < count; w++) {
        workers.push(worker())
      }
      await Promise.all(workers)
    },
    /** 上传单个分片(含重试) */
    async sendChunkWithRetry(index, retries = 2) {
      for (let attempt = 0; ; attempt++) {
        try {
          await this.sendChunk(index)
          return
        } catch (e) {
          if (attempt >= retries || this.paused) {
            throw e
          }
        }
      }
    },
    /** 上传单个分片 */
    async sendChunk(index) {
      const start = index * this.chunkSize
      const end = Math.min(start + this.chunkSize, this.file.size)
      const blob = this.file.slice(start, end)
      const formData = new FormData()
      formData.append('file', blob, this.file.name + '.part' + index)
      formData.append('identifier', this.identifier)
      formData.append('chunkIndex', index)
      await uploadChunk(formData)
    },
    /** 合并分片:提交后台异步合并,再轮询结果(大文件哈希+上传耗时长,避免请求超时) */
    async merge() {
      this.status = UploadStatus.MERGING
      try {
        await mergeChunks({
          identifier: this.identifier,
          fileName: this.file.name,
          totalChunks: this.totalChunks,
          publicFlag: this.isPublic
        })
        const oss = await this.pollMergeResult()
        this.status = UploadStatus.SUCCESS
        this.percent = 100
        this.$emit('success', oss)
      } catch (e) {
        this.status = UploadStatus.ERROR
        this.errorMsg = (e && e.message) ? e.message : '合并失败，可点击重试'
      }
    },
    /** 轮询后台合并结果直至成功/失败 */
    async pollMergeResult() {
      // 每 1.5s 轮询一次，最多约 30 分钟，覆盖超大文件的哈希与上传耗时
      const intervalMs = 1500
      const maxAttempts = 1200
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const res = await getMergeStatus(this.identifier)
        if (res.status === 'success') {
          return res.oss
        }
        if (res.status === 'failed') {
          throw new Error(res.message || '合并失败，可点击重试')
        }
        await this.sleep(intervalMs)
      }
      throw new Error('合并超时，请稍后重试')
    },
    /** 延时 */
    sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms))
    },
    /** 暂停 */
    pause() {
      this.paused = true
    },
    /** 清除当前文件 */
    clear() {
      this.resetState()
      this.file = null
    },
    /** 重置状态 */
    resetState() {
      this.identifier = ''
      this.totalChunks = 0
      this.uploadedSet = new Set()
      this.status = UploadStatus.IDLE
      this.percent = 0
      this.paused = false
      this.errorMsg = ''
    },
    /** 更新进度(仅在 totalChunks 就绪后调用) */
    updatePercent() {
      this.percent = Math.floor(this.uploadedSet.size * 100 / this.totalChunks)
    },
    /** 生成文件唯一标识(文件名+大小+修改时间的哈希) */
    generateIdentifier(file) {
      const raw = `${file.name}-${file.size}-${file.lastModified}`
      return this.cyrb53(raw).toString(36) + '-' + file.size
    },
    /** 轻量字符串哈希(cyrb53) */
    cyrb53(str, seed = 0) {
      let h1 = 0xdeadbeef ^ seed
      let h2 = 0x41c6ce57 ^ seed
      for (let i = 0, ch; i < str.length; i++) {
        ch = str.charCodeAt(i)
        h1 = Math.imul(h1 ^ ch, 2654435761)
        h2 = Math.imul(h2 ^ ch, 1597334677)
      }
      h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
      h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
      return 4294967296 * (2097151 & h2) + (h1 >>> 0)
    },
    // 文件大小格式化(公共工具)
    formatSize: formatFileSize
  }
}
</script>

<style lang="scss" scoped>
@import '@/assets/styles/tokens.scss';

.chunk-upload {
  // 拖拽上传区:撑满容器宽度
  ::v-deep .el-upload,
  ::v-deep .el-upload-dragger {
    width: 100%;
  }
  ::v-deep .el-upload-dragger {
    height: auto;
    padding: 28px 16px;
    border: 1px dashed #d9dde3;
    border-radius: 8px;
    background-color: #fafbfc;
    transition: border-color 0.2s ease, background-color 0.2s ease;

    .el-icon-upload {
      margin: 0 0 8px;
      font-size: 48px;
      line-height: 1;
      color: #c0c4cc;
      transition: color 0.2s ease;
    }
    .el-upload__text {
      font-size: 14px;
      color: #606266;

      em {
        color: $color-primary;
        font-style: normal;
      }
    }
    &:hover {
      border-color: $color-primary;
      background-color: rgba($color-primary, 0.05);

      .el-icon-upload {
        color: $color-primary;
      }
    }
  }
  ::v-deep .el-upload__tip {
    margin-top: 8px;
    font-size: 12px;
    line-height: 1.5;
    color: #a8abb2;
    text-align: center;
  }

  // 上传状态卡片
  .upload-status {
    margin-top: 14px;
    padding: 14px 16px;
    border: 1px solid #ebeef5;
    border-radius: 8px;
    background-color: #fff;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  }
  .file-row {
    display: flex;
    align-items: center;
  }
  .file-icon {
    flex-shrink: 0;
    margin-right: 10px;
    font-size: 26px;
    color: $color-primary;
  }
  .file-info {
    flex: 1;
    min-width: 0; // 允许子元素省略号生效
  }
  .file-name {
    overflow: hidden;
    font-size: 13px;
    font-weight: 500;
    color: #303133;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .file-size {
    margin-top: 2px;
    font-size: 12px;
    color: #909399;
  }
  .status-text {
    flex-shrink: 0;
    margin: 0 12px;
    font-size: 12px;
    font-weight: 500;
    white-space: nowrap;

    &--checking,
    &--merging {
      color: #909399;
    }
    &--uploading {
      color: $color-primary;
    }
    &--paused {
      color: #e6a23c;
    }
    &--success {
      color: #67c23a;
    }
    &--error {
      color: #f56c6c;
    }
  }
  .actions {
    display: flex;
    flex-shrink: 0;
    gap: 6px;

    ::v-deep .el-button + .el-button {
      margin-left: 0; // 间距统一交给 gap 控制
    }
  }
  .upload-progress {
    margin-top: 12px;
  }
}
</style>
