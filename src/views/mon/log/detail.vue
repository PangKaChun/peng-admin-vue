<template>
  <el-dialog
    :title="isError ? '异常日志详情' : '操作日志详情'"
    :visible.sync="dialogVisible"
    width="780px"
    append-to-body
    class="log-detail"
    @open="handleOpen"
  >
    <div ref="wrap" v-loading="loading" class="detail-wrap">
      <section class="detail-section">
        <h3 class="detail-section__title">基本信息</h3>
        <div class="detail-grid">
          <div class="detail-item">
            <span class="detail-label">系统模块</span>
            <span class="detail-value">{{ display(log.title) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">操作类型</span>
            <span class="detail-value"><dict-tag :options="operTypes" :value="log.bizType" /></span>
          </div>
          <div class="detail-item">
            <span class="detail-label">来源系统</span>
            <span class="detail-value">{{ display(log.appCode) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">来源服务</span>
            <span class="detail-value">{{ display(log.serviceName) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">操作状态</span>
            <span class="detail-value"><dict-tag :options="statusOptions" :value="log.status" /></span>
          </div>
          <div class="detail-item">
            <span class="detail-label">完整性</span>
            <span class="detail-value">
              <span v-if="log.signValid === true" class="text-success">校验通过</span>
              <span v-else-if="log.signValid === false" class="text-danger">校验不通过</span>
              <template v-else>-</template>
            </span>
          </div>
          <div class="detail-item">
            <span class="detail-label">操作时间</span>
            <span class="detail-value is-num">{{ display(log.createTime) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">耗时</span>
            <span class="detail-value is-mono">
              <span v-if="log.costTime != null" :class="costClass">{{ log.costTime }}ms</span>
              <template v-else>-</template>
            </span>
          </div>
        </div>
      </section>

      <section v-if="isError || log.errorMsg" class="detail-section">
        <div class="detail-section__head">
          <h3 class="detail-section__title is-danger">异常信息</h3>
          <el-button v-if="errorCode" type="text" size="mini" icon="el-icon-document-copy" @click="copyCode(errorCode.text)">复制</el-button>
        </div>
        <pre v-if="errorCode" class="code-block is-danger"><code v-if="errorCode.html" v-html="errorCode.html" /><code v-else>{{ errorCode.text }}</code></pre>
        <div v-else class="code-empty">无异常信息</div>
      </section>

      <section class="detail-section">
        <h3 class="detail-section__title">操作人员</h3>
        <div class="detail-grid">
          <div class="detail-item">
            <span class="detail-label">操作人员</span>
            <span class="detail-value">{{ display(log.username) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">用户 ID</span>
            <span class="detail-value is-mono">{{ display(log.userId) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">主机地址</span>
            <span class="detail-value is-mono">
              {{ display(log.requestIp) }}<span v-if="log.address" class="detail-sub">{{ log.address }}</span>
            </span>
          </div>
          <div class="detail-item">
            <span class="detail-label">客户端</span>
            <span class="detail-value">{{ clientText }}</span>
          </div>
        </div>
      </section>

      <section class="detail-section">
        <h3 class="detail-section__title">请求信息</h3>
        <div class="detail-grid">
          <div class="detail-item is-full">
            <span class="detail-label">请求 URL</span>
            <span class="detail-value is-mono">
              <span v-if="log.requestMethod" :class="['method-tag', 'is-' + String(log.requestMethod).toLowerCase()]">{{ log.requestMethod }}</span>{{ display(log.requestUrl) }}
            </span>
          </div>
          <div class="detail-item is-full">
            <span class="detail-label">方法名称</span>
            <span class="detail-value is-mono">{{ display(log.method) }}</span>
          </div>
        </div>
      </section>

      <section class="detail-section">
        <div class="detail-section__head">
          <h3 class="detail-section__title">请求参数</h3>
          <el-button v-if="paramsCode" type="text" size="mini" icon="el-icon-document-copy" @click="copyCode(paramsCode.text)">复制</el-button>
        </div>
        <pre v-if="paramsCode" class="code-block"><code v-if="paramsCode.html" v-html="paramsCode.html" /><code v-else>{{ paramsCode.text }}</code></pre>
        <div v-else class="code-empty">无数据</div>
      </section>

      <section class="detail-section">
        <div class="detail-section__head">
          <h3 class="detail-section__title">返回参数</h3>
          <el-button v-if="resultCode" type="text" size="mini" icon="el-icon-document-copy" @click="copyCode(resultCode.text)">复制</el-button>
        </div>
        <pre v-if="resultCode" class="code-block"><code v-if="resultCode.html" v-html="resultCode.html" /><code v-else>{{ resultCode.text }}</code></pre>
        <div v-else class="code-empty">无数据</div>
      </section>
    </div>
  </el-dialog>
</template>

<script>
import { getLog } from '@/api/mon/log'
import { copyText } from '@/utils/clipboard'
import hljs from 'highlight.js/lib/core'
import 'highlight.js/styles/github.css'
import java from 'highlight.js/lib/languages/java'
import json from 'highlight.js/lib/languages/json'

hljs.registerLanguage('java', java)
hljs.registerLanguage('json', json)

const HIGHLIGHT_LIMIT = 50000

function toCode(raw, language) {
  if (raw === null || raw === undefined || raw === '') {
    return null
  }
  let text = String(raw)
  if (language === 'json') {
    try {
      text = JSON.stringify(JSON.parse(text), null, 2)
    } catch (e) {
      return { text, html: '' }
    }
  }
  const html = text.length > HIGHLIGHT_LIMIT ? '' : hljs.highlight(text, { language }).value
  return { text, html }
}

export default {
  name: 'LogDetail',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    row: {
      type: Object,
      default: () => ({})
    },
    operTypes: {
      type: Array,
      default: () => []
    },
    statusOptions: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      detail: null,
      loading: false
    }
  },
  computed: {
    dialogVisible: {
      get() {
        return this.visible
      },
      set(val) {
        this.$emit('update:visible', val)
      }
    },
    log() {
      return this.detail || this.row
    },
    isError() {
      return this.log.status != null && String(this.log.status) !== '0'
    },
    costClass() {
      const cost = this.log.costTime
      return cost <= 300 ? '' : cost <= 1000 ? 'text-warning' : 'text-danger'
    },
    clientText() {
      return [this.log.browser, this.log.os].filter(Boolean).join(' / ') || '-'
    },
    paramsCode() {
      return toCode(this.log.params, 'json')
    },
    resultCode() {
      return toCode(this.log.jsonResult, 'json')
    },
    errorCode() {
      return toCode(this.log.errorMsg, 'java')
    }
  },
  methods: {
    handleOpen() {
      this.$nextTick(() => {
        if (this.$refs.wrap) {
          this.$refs.wrap.scrollTop = 0
        }
      })
      this.loadDetail()
    },
    loadDetail() {
      const logId = this.row.logId
      this.detail = null
      if (logId == null) {
        return
      }
      this.loading = true
      getLog(logId)
        .then(response => {
          if (this.row.logId === logId) {
            this.detail = response
          }
        })
        .finally(() => {
          if (this.row.logId === logId) {
            this.loading = false
          }
        })
    },
    display(val) {
      return val === null || val === undefined || val === '' ? '-' : val
    },
    copyCode(text) {
      copyText(text)
        .then(() => this.$modal.msgSuccess('已复制到剪贴板'))
        .catch(() => this.$modal.msgError('复制失败'))
    }
  }
}
</script>

<style lang="scss" scoped>
@import '@/assets/styles/tokens.scss';

.log-detail ::v-deep .el-dialog__body {
  padding: 0;
  border-radius: 0 0 $radius-lg $radius-lg;
}

.detail-wrap {
  max-height: 72vh;
  overflow-y: auto;
  padding: $space-4 $space-5 $space-5;
}

.detail-sub {
  margin-left: $space-2;
  font-family: $font-sans;
  font-size: 13px;
  color: $label-secondary;
}

.detail-section {
  padding: $space-4 0;

  &:first-child {
    padding-top: 0;
  }

  &:last-child {
    padding-bottom: 0;
  }

  & + & {
    border-top: 1px solid $separator-light;
  }

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: $space-2;

    .detail-section__title {
      margin-bottom: 0;
    }

    .el-button {
      padding: 0;
    }
  }

  &__title {
    margin: 0 0 $space-3;
    font-size: 12px;
    font-weight: 600;
    color: $label-secondary;

    &.is-danger {
      color: $color-danger;
    }
  }
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: $space-2 $space-6;
}

.detail-item {
  display: flex;
  min-width: 0;
  font-size: 13px;
  line-height: 22px;

  &.is-full {
    grid-column: 1 / -1;
  }
}

.detail-label {
  flex: none;
  width: 64px;
  margin-right: $space-3;
  color: $label-secondary;
}

.detail-value {
  flex: 1;
  min-width: 0;
  color: $label;
  overflow-wrap: anywhere;

  &.is-mono {
    font-family: $font-mono;
    font-size: 12px;
  }

  &.is-num {
    font-variant-numeric: tabular-nums;
  }
}

.text-success { color: $color-success; }
.text-warning { color: $color-warning; }
.text-danger { color: $color-danger; }

.code-block {
  margin: 0;
  max-height: 260px;
  overflow: auto;
  padding: $space-3;
  font-family: $font-mono;
  font-size: 12px;
  line-height: 1.6;
  color: $label;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  background: $fill-quaternary;
  border-radius: $radius-sm;

  code {
    font-family: inherit;
  }

  &.is-danger {
    max-height: 340px;
    background: rgba($color-danger, 0.04);
  }
}

.code-empty {
  padding: $space-3;
  font-size: 12px;
  text-align: center;
  color: $label-tertiary;
  background: $fill-quaternary;
  border-radius: $radius-sm;
}

$method-colors: (get: $color-success, post: $color-primary, put: $color-warning, delete: $color-danger);

.method-tag {
  display: inline-block;
  margin-right: $space-2;
  padding: 0 5px;
  font-size: 11px;
  font-weight: 600;
  line-height: 18px;
  color: $label-secondary;
  background: $fill-quaternary;
  border-radius: $radius-xs;
}

@each $name, $color in $method-colors {
  .method-tag.is-#{$name} {
    color: $color;
    background: rgba($color, 0.1);
  }
}
</style>
