<template>
  <!-- 文件预览对话框外壳:标题栏最大化、工具栏、加载态与居中提示,各预览器只填内容 -->
  <el-dialog
    :visible="visible"
    :fullscreen="maximized"
    width="72%"
    top="4vh"
    append-to-body
    :custom-class="'viewer-dialog ' + dialogClass"
    @update:visible="$emit('update:visible', $event)"
    @closed="$emit('closed')"
  >
    <!-- 自定义标题栏,双击也可切换最大化 -->
    <div slot="title" class="viewer-dialog__header" @dblclick="toggleMaximize">
      <span class="el-dialog__title">{{ title }}</span>
      <button
        type="button"
        class="viewer-dialog__maximize"
        :title="maximized ? '还原' : '最大化'"
        @click="toggleMaximize"
      >
        <i :class="maximized ? 'el-icon-copy-document' : 'el-icon-full-screen'" />
      </button>
    </div>

    <div v-if="$slots.toolbar" class="viewer-dialog__toolbar">
      <slot name="toolbar" />
    </div>
    <slot name="before" />

    <div v-loading="loading" class="viewer-dialog__body">
      <div v-if="message" class="viewer-dialog__message">{{ message }}</div>
      <slot />
    </div>

    <slot name="after" />
  </el-dialog>
</template>

<script>
export default {
  name: 'ViewerDialog',
  props: {
    // 是否显示,支持 .sync
    visible: { type: Boolean, default: false },
    // 对话框标题(文件名)
    title: { type: String, default: '' },
    // 加载中
    loading: { type: Boolean, default: false },
    // 预览区居中提示(加载失败 / 空内容),为空不显示
    message: { type: String, default: '' },
    // 各预览器自己的样式命名空间
    dialogClass: { type: String, default: '' }
  },
  data() {
    return {
      // 是否最大化
      maximized: false
    }
  },
  methods: {
    /** 最大化/还原,预览区尺寸随之变化,需要重排的预览器监听 maximize */
    toggleMaximize() {
      this.maximized = !this.maximized
      this.$emit('maximize', this.maximized)
    }
  }
}
</script>

<style lang="scss">
@import '@/assets/styles/tokens.scss';

/* 对话框挂 body(append-to-body),样式不能 scoped。
   预览区相关规则只用单个类名,各预览器用 .xxx-viewer-dialog 前缀覆盖时不受样式加载顺序影响 */
.viewer-dialog .el-dialog__body {
  padding: 0;
}

/* 标题栏最大化/还原按钮 */
.viewer-dialog__maximize {
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

.viewer-dialog__toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: $space-2;
  padding: $space-2 $space-4;
  border-bottom: 1px solid #ebeef5;
}

.viewer-dialog__body {
  position: relative;
  height: 74vh;
  overflow: auto;
  background: $bg-base;
}

.viewer-dialog__message {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 14px;
  color: #909399;
}

/* 最大化:对话框纵向弹性布局,预览区吃满剩余高度 */
.viewer-dialog.is-fullscreen {
  display: flex;
  flex-direction: column;

  .el-dialog__body {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
  }

  .el-dialog__body > * {
    flex-shrink: 0;
  }

  .viewer-dialog__body {
    flex: 1;
    height: auto;
    min-height: 0;
  }
}
</style>
