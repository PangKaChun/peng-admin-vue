<template>
  <el-container :class="classObj" class="app-wrapper">
    <transition name="fade">
      <div v-if="device === 'mobile' && sidebar.opened" class="drawer-bg" @click="handleClickOutside" />
    </transition>
    <sidebar v-if="!sidebar.hide" class="sidebar-container" :style="device === 'mobile' ? null : { width: (sidebar.opened ? resize : 54) + 'px' }" />
    <div
      v-show="device !== 'mobile' && sidebar.opened && !sidebar.hide"
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
        <app-main />
      </el-main>
    </el-container>
  </el-container>
</template>

<script>
import { AppMain, Navbar, Sidebar } from './components'
import ResizeMixin from './mixin/ResizeHandler'
import watermarkOption from '@/utils/waterMark.js'
import { mapState } from 'vuex'

export default {
  name: 'Layout',
  components: {
    AppMain,
    Navbar,
    Sidebar
  },
  mixins: [ResizeMixin],
  data() {
    return {
      resize: 220,
      defaultResize: 220,
      minSidebarWidth: 180,
      minMainWidth: 760,
      isResizing: false
    }
  },
  computed: {
    ...mapState({
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
    this.endResize()
    watermarkOption.clear()
  },
  methods: {
    handleClickOutside() {
      this.$store.dispatch('app/closeSideBar', { withoutAnimation: false })
    },
    onSashMouseDown(e) {
      if (e.button !== 0) return
      e.preventDefault()

      const box = document.querySelector('.app-wrapper')
      if (!box) return

      const startX = e.clientX
      const startWidth = this.resize

      this.isResizing = true
      document.body.style.userSelect = 'none'
      document.body.style.cursor = 'ew-resize'

      this._onMouseMove = evt => {
        const dx = evt.clientX - startX
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

.app-wrapper {
  position: relative;
}

.el-header {
  height: $topbar-height !important;
  background-color: $bg-base;
  padding: 0;
  border-bottom: 1px solid $separator;
}

.el-main {
  padding: 0;
  position: relative;
  overflow: hidden;
}

.drawer-bg {
  background: rgba(0, 0, 0, 0.3);
  width: 100%;
  top: 0;
  height: 100%;
  position: absolute;
  z-index: 999;
}

.resize-sash {
  position: absolute;
  top: 0;
  width: 4px;
  height: 100%;
  transform: translateX(-2px);
  cursor: ew-resize;
  background-color: transparent;
  user-select: none;
  z-index: 2001;
  touch-action: none;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 50%;
    width: 2px;
    height: 100%;
    transform: translateX(-50%) scaleX(0);
    background-color: $color-primary;
    transition:
      transform 0.1s $ease-out 0.2s,
      opacity 0.1s $ease-out 0.2s;
    opacity: 0;
    pointer-events: none;
  }

  &:hover::before {
    transform: translateX(-50%) scaleX(1);
    opacity: 1;
  }

  &.is-active::before {
    transform: translateX(-50%) scaleX(1);
    opacity: 1;
    transition:
      transform 0.1s $ease-out,
      opacity 0.1s $ease-out;
  }

  @media (prefers-reduced-motion: reduce) {
    &::before,
    &:hover::before,
    &.is-active::before {
      transform: translateX(-50%);
    }
  }
}
</style>
