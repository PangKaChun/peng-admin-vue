<template>
  <el-container :class="classObj" class="app-wrapper" :style="{ '--current-color': theme }">
    <transition name="fade">
      <div v-if="device === 'mobile' && sidebar.opened" class="drawer-bg" @click="handleClickOutside" />
    </transition>
    <sidebar v-if="!sidebar.hide" class="sidebar-container" :style="`width:${sidebar.opened?resize:54}px !important`" />
    <div
      v-show="device !== 'mobile'"
      class="resize-sash"
      :class="{ 'is-active': isResizing }"
      :style="{ left: (sidebar.opened ? resize : 54) + 'px' }"
      @mousedown="onSashMouseDown"
      @dblclick="resetSashWidth"
    ></div>
    <el-container class="main-container">
      <el-header>
        <navbar />
      </el-header>
      <el-main>
        <tags-view />
        <app-main />
      </el-main>
    </el-container>
  </el-container>
</template>

<script>
import { AppMain, Navbar, Sidebar, TagsView } from './components'
import ResizeMixin from './mixin/ResizeHandler'
import watermarkOption from '@/utils/waterMark.js'
import { mapState } from 'vuex'
export default {
  name: 'Layout',
  components: {
    AppMain,
    Navbar,
    Sidebar,
    TagsView
  },
  mixins: [ResizeMixin],
  data() {
    return {
      resize: 200,
      defaultResize: 200,
      minSidebarWidth: 200,
      minMainWidth: 1000,
      isResizing: false,
      _onMouseMove: null,
      _onMouseUp: null
    }
  },
  computed: {
    ...mapState({
      theme: state => state.settings.theme,
      sideTheme: state => state.settings.sideTheme,
      sidebar: state => state.app.sidebar,
      device: state => state.app.device,
      username: state => state.user.name
    }),
    classObj() {
      return {
        hideSidebar: !this.sidebar.opened,
        openSidebar: this.sidebar.opened,
        withoutAnimation: this.sidebar.withoutAnimation,
        mobile: this.device === 'mobile'
      }
    }
  },
  mounted() {
    watermarkOption.set(this.username, this.parseTime(new Date(), '{y}-{m}-{d} {h}:{i}:{s}'))
  },
  beforeDestroy() {
    // 防止组件销毁时拖拽未结束，残留全局监听
    this.endResize()
  },
  methods: {
    handleClickOutside() {
      this.$store.dispatch('app/closeSideBar', { withoutAnimation: false })
    },
    // VS Code 风格的 sash 拖拽：mousedown 开始监听 document，mouseup 释放
    onSashMouseDown(e) {
      // 仅响应左键
      if (e.button !== 0) return
      e.preventDefault()

      const box = document.querySelector('.app-wrapper')
      if (!box) return

      const startX = e.clientX
      const startWidth = this.resize

      this.isResizing = true
      // 拖拽期间屏蔽全局文字选择 + 强制 cursor，避免穿过 iframe / 富文本时光标抖动
      document.body.style.userSelect = 'none'
      document.body.style.cursor = 'ew-resize'

      this._onMouseMove = (evt) => {
        const dx = evt.clientX - startX
        // sash 不占布局空间，只需约束 sidebar / 主区的最小宽度
        const maxAllowed = box.clientWidth - this.minMainWidth
        let next = startWidth + dx
        if (next < this.minSidebarWidth) next = this.minSidebarWidth
        if (next > maxAllowed) next = maxAllowed
        this.resize = next
      }
      this._onMouseUp = () => {
        this.endResize()
      }

      document.addEventListener('mousemove', this._onMouseMove)
      document.addEventListener('mouseup', this._onMouseUp)
    },
    endResize() {
      if (this._onMouseMove) {
        document.removeEventListener('mousemove', this._onMouseMove)
        this._onMouseMove = null
      }
      if (this._onMouseUp) {
        document.removeEventListener('mouseup', this._onMouseUp)
        this._onMouseUp = null
      }
      if (this.isResizing) {
        this.isResizing = false
        document.body.style.userSelect = ''
        document.body.style.cursor = ''
      }
    },
    // 双击 sash 恢复默认宽度，与 VS Code 行为一致
    resetSashWidth() {
      this.resize = this.defaultResize
    }
  }
}
</script>

<style lang="scss" scoped>
@import '@/assets/styles/tokens.scss';

.el-container {
  height: 100%;
}

// sash 用绝对定位浮在 sidebar / 主区交界处，需要 wrapper 提供定位上下文
.app-wrapper {
  position: relative;
}

.el-header {
  height: 50px !important;
  background-color: $bg-base;
  padding: 0;
  border-bottom: 1px solid $separator;
}

.el-main {
  padding: 0;
  position: relative;
}

.drawer-bg {
  // 半透明用 rgba 而非 opacity:opacity 留给 fade 过渡(scoped 选择器优先级更高,会压住过渡类)
  background: rgba(0, 0, 0, 0.3);
  width: 100%;
  top: 0;
  height: 100%;
  position: absolute;
  z-index: 999;
}

/* VS Code 风格的可拖拽分隔条（sash） */
.resize-sash {
  position: absolute;
  top: 0;
  // left 由 :style 动态绑定到 sidebar 当前宽度
  width: 4px;
  height: 100%;
  // 通过负位移让 4px 热区横跨在边界线两侧，sash 中心正好落在 sidebar 右边缘
  transform: translateX(-2px);
  cursor: ew-resize;
  background-color: transparent;
  user-select: none;
  z-index: 2001;
  touch-action: none;

  // 默认不显示高亮线 —— sidebar 自身的边框/背景已经把两侧分开
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 50%;
    width: 4px;
    height: 100%;
    transform: translateX(-50%) scaleX(0);
    background-color: var(--current-color, $color-primary);
    transition:
      transform 0.1s $ease-out 0.2s,
      opacity 0.1s $ease-out 0.2s;
    opacity: 0;
    pointer-events: none;
  }

  // hover：延迟后浮现 4px 高亮条（VS Code sash 的标志性效果）
  &:hover::before {
    transform: translateX(-50%) scaleX(1);
    opacity: 1;
  }

  // 拖拽中：立刻高亮，无延迟
  &.is-active::before {
    transform: translateX(-50%) scaleX(1);
    opacity: 1;
    transition:
      transform 0.1s $ease-out,
      opacity 0.1s $ease-out;
  }

  // 减弱动效:高亮条保持全宽,只做淡入淡出
  @media (prefers-reduced-motion: reduce) {
    &::before,
    &:hover::before,
    &.is-active::before {
      transform: translateX(-50%);
    }
  }
}
</style>
