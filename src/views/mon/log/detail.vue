<template>
  <el-dialog
    :title="isError ? '异常日志详情' : '操作日志详情'"
    :visible.sync="dialogVisible"
    width="820px"
    append-to-body
    class="log-detail"
    @open="handleOpen"
  >
    <div ref="wrap" class="detail-wrap">
      <!-- 基本信息 -->
      <section class="detail-card">
        <div class="detail-card-title"><i class="el-icon-info" />基本信息</div>
        <div class="detail-grid">
          <div class="detail-item">
            <span class="detail-label">系统模块</span>
            <span class="detail-value">{{ display(row.title) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">操作类型</span>
            <span class="detail-value"><dict-tag :options="operTypes" :value="row.bizType" /></span>
          </div>
          <div class="detail-item">
            <span class="detail-label">来源服务</span>
            <span class="detail-value">{{ display(row.serviceName) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">操作状态</span>
            <span class="detail-value"><dict-tag :options="statusOptions" :value="row.status" /></span>
          </div>
          <div class="detail-item">
            <span class="detail-label">操作时间</span>
            <span class="detail-value">{{ display(row.createTime) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">耗时</span>
            <span class="detail-value">
              <el-tag v-if="row.costTime != null" :type="costTagType">{{ row.costTime }}ms</el-tag>
              <template v-else>-</template>
            </span>
          </div>
        </div>
      </section>

      <!-- 异常信息：异常日志最关心的内容，紧跟基本信息 -->
      <section v-if="isError || row.errorMsg" class="detail-card is-danger">
        <div class="detail-card-title">
          <i class="el-icon-warning-outline" />异常信息
          <el-button v-if="errorCode" type="text" size="mini" icon="el-icon-document-copy" class="copy-btn" @click="copyText(errorCode.text)">复制</el-button>
        </div>
        <pre v-if="errorCode" class="code-block is-danger"><code v-if="errorCode.html" v-html="errorCode.html" /><code v-else>{{ errorCode.text }}</code></pre>
        <div v-else class="code-empty">无异常信息</div>
      </section>

      <!-- 操作人员 -->
      <section class="detail-card">
        <div class="detail-card-title"><i class="el-icon-user" />操作人员</div>
        <div class="detail-grid">
          <div class="detail-item">
            <span class="detail-label">操作人员</span>
            <span class="detail-value">{{ display(row.username) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">部门名称</span>
            <span class="detail-value">{{ display(row.deptName) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">主机地址</span>
            <span class="detail-value">
              {{ display(row.requestIp) }}<span v-if="row.address" class="detail-sub">{{ row.address }}</span>
            </span>
          </div>
          <div class="detail-item">
            <span class="detail-label">客户端</span>
            <span class="detail-value">{{ clientText }}</span>
          </div>
        </div>
      </section>

      <!-- 请求信息 -->
      <section class="detail-card">
        <div class="detail-card-title"><i class="el-icon-sort" />请求信息</div>
        <div class="detail-grid">
          <div class="detail-item is-full">
            <span class="detail-label">请求URL</span>
            <span class="detail-value">
              <span v-if="row.requestMethod" :class="['method-tag', 'is-' + String(row.requestMethod).toLowerCase()]">{{ row.requestMethod }}</span>{{ display(row.requestUrl) }}
            </span>
          </div>
          <div class="detail-item is-full">
            <span class="detail-label">方法名称</span>
            <span class="detail-value is-mono">{{ display(row.method) }}</span>
          </div>
        </div>
      </section>

      <!-- 请求参数 -->
      <section class="detail-card">
        <div class="detail-card-title">
          <i class="el-icon-upload2" />请求参数
          <el-button v-if="paramsCode" type="text" size="mini" icon="el-icon-document-copy" class="copy-btn" @click="copyText(paramsCode.text)">复制</el-button>
        </div>
        <pre v-if="paramsCode" class="code-block"><code v-if="paramsCode.html" v-html="paramsCode.html" /><code v-else>{{ paramsCode.text }}</code></pre>
        <div v-else class="code-empty">无数据</div>
      </section>

      <!-- 返回参数 -->
      <section class="detail-card">
        <div class="detail-card-title">
          <i class="el-icon-download" />返回参数
          <el-button v-if="resultCode" type="text" size="mini" icon="el-icon-document-copy" class="copy-btn" @click="copyText(resultCode.text)">复制</el-button>
        </div>
        <pre v-if="resultCode" class="code-block"><code v-if="resultCode.html" v-html="resultCode.html" /><code v-else>{{ resultCode.text }}</code></pre>
        <div v-else class="code-empty">无数据</div>
      </section>
    </div>
  </el-dialog>
</template>

<script>
import hljs from 'highlight.js/lib/core'
import 'highlight.js/styles/github.css'
import java from 'highlight.js/lib/languages/java'
import json from 'highlight.js/lib/languages/json'
hljs.registerLanguage('java', java)
hljs.registerLanguage('json', json)

// 超过该长度不做高亮,避免超大报文卡住弹窗
const HIGHLIGHT_LIMIT = 50000

/**
 * 转成代码块数据：JSON 先格式化再高亮,非 JSON 原样输出（html 为空时模板走文本插值,天然转义）
 * 空内容返回 null,由模板显示占位
 */
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
    // 字典由父页面传入,避免每次打开重复请求
    operTypes: {
      type: Array,
      default: () => []
    },
    statusOptions: {
      type: Array,
      default: () => []
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
    isError() {
      return this.row.status != null && String(this.row.status) !== '0'
    },
    costTagType() {
      const cost = this.row.costTime
      return cost <= 300 ? '' : cost <= 1000 ? 'warning' : 'danger'
    },
    clientText() {
      return [this.row.browser, this.row.os].filter(Boolean).join(' / ') || '-'
    },
    paramsCode() {
      return toCode(this.row.params, 'json')
    },
    resultCode() {
      return toCode(this.row.jsonResult, 'json')
    },
    errorCode() {
      return toCode(this.row.errorMsg, 'java')
    }
  },
  methods: {
    /** 每次打开回到顶部（弹窗内容复用,不重置会停在上一条的滚动位置） */
    handleOpen() {
      this.$nextTick(() => {
        if (this.$refs.wrap) {
          this.$refs.wrap.scrollTop = 0
        }
      })
    },
    display(val) {
      return val === null || val === undefined || val === '' ? '-' : val
    },
    /** 复制到剪贴板（非安全上下文下 navigator.clipboard 不可用,降级 execCommand） */
    copyText(text) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text)
          .then(() => this.$modal.msgSuccess('已复制到剪贴板'))
          .catch(() => this.legacyCopy(text))
      } else {
        this.legacyCopy(text)
      }
    },
    legacyCopy(text) {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(ta)
      ok ? this.$modal.msgSuccess('已复制到剪贴板') : this.$modal.msgError('复制失败')
    }
  }
}
</script>

<style lang="scss" scoped>
@import '../../../assets/styles/tokens.scss';

$font-mono: SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace;

// 分组背景 + 白卡片（iOS 设置页式分组）,滚动放在内层,保留弹窗圆角
.log-detail ::v-deep .el-dialog__body {
  padding: 0;
  background: $bg-grouped;
  border-radius: 0 0 $radius-lg $radius-lg;
}

.detail-wrap {
  max-height: 72vh;
  overflow-y: auto;
  padding: $space-4;
}

.detail-card {
  padding: $space-3 $space-4 $space-4;
  background: $bg-base;
  border-radius: $radius-md;

  & + & {
    margin-top: $space-3;
  }
}

.detail-card-title {
  display: flex;
  align-items: center;
  height: 24px;
  margin-bottom: $space-3;
  font-size: 13px;
  font-weight: 600;
  color: $label;

  > i {
    margin-right: 6px;
    font-size: 14px;
    color: $color-primary;
  }

  .copy-btn {
    margin-left: auto;
    padding: 0;
  }
}

.detail-card.is-danger .detail-card-title > i {
  color: $color-danger;
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
  line-height: 24px;

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
  word-break: break-all;

  &.is-mono {
    font-family: $font-mono;
    font-size: 12px;
  }
}

.detail-sub {
  margin-left: $space-2;
  color: $label-secondary;
}

// 请求方式徽标：按 HTTP 动词着色
$method-colors: (get: $color-success, post: $color-primary, put: $color-warning, delete: $color-danger);

.method-tag {
  display: inline-block;
  margin-right: $space-2;
  padding: 0 6px;
  font-size: 11px;
  font-weight: 600;
  line-height: 18px;
  color: $label-secondary;
  background: $fill-quaternary;
  border-radius: $radius-xs;
  vertical-align: 1px;
}

@each $name, $color in $method-colors {
  .method-tag.is-#{$name} {
    color: $color;
    background: rgba($color, 0.1);
  }
}

.code-block {
  margin: 0;
  max-height: 280px;
  overflow: auto;
  padding: $space-3;
  font-family: $font-mono;
  font-size: 12px;
  line-height: 1.6;
  color: $label;
  white-space: pre-wrap;
  word-break: break-all;
  background: $fill-quaternary;
  border-radius: $radius-sm;

  code {
    font-family: inherit;
  }

  // 异常堆栈通常更长,给更多高度
  &.is-danger {
    max-height: 360px;
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
</style>
