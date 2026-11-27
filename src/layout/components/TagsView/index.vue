<template>
  <div id="tags-view-container" class="tags-view-container">
    <scroll-pane ref="scrollPane" class="tags-view-wrapper" @scroll="handleScroll">
      <transition-group name="tags-flip" tag="span" class="tags-view-flip">
        <router-link
          v-for="tag in visitedViews"
          ref="tag"
          :key="tag.path"
          :class="{ active: isActive(tag) }"
          :to="{ path: tag.path, query: tag.query, fullPath: tag.fullPath }"
          tag="span"
          class="tags-view-item"
          @click.middle.native="!isAffix(tag) ? closeSelectedTag(tag) : ''"
          @contextmenu.prevent.native="openMenu(tag, $event)"
        >
          <span class="tags-view-item__title">{{ tag.title }}</span>
          <span
            v-if="!isAffix(tag)"
            class="el-icon-close tags-view-item__close"
            @click.prevent.stop="closeSelectedTag(tag)"
          />
        </router-link>
      </transition-group>
    </scroll-pane>

    <ul
      v-show="visible"
      :style="{ left: left + 'px', top: top + 'px' }"
      class="contextmenu"
    >
      <li @click="refreshSelectedTag(selectedTag)">
        <i class="el-icon-refresh-right" /> 刷新页面
      </li>
      <li v-if="!isAffix(selectedTag)" @click="closeSelectedTag(selectedTag)">
        <i class="el-icon-close" /> 关闭当前
      </li>
      <li @click="closeOthersTags">
        <i class="el-icon-circle-close" /> 关闭其他
      </li>
      <li v-if="!isFirstView()" @click="closeLeftTags">
        <i class="el-icon-back" /> 关闭左侧
      </li>
      <li v-if="!isLastView()" @click="closeRightTags">
        <i class="el-icon-right" /> 关闭右侧
      </li>
      <li @click="closeAllTags(selectedTag)">
        <i class="el-icon-circle-close" /> 全部关闭
      </li>
    </ul>
  </div>
</template>

<script>
import ScrollPane from './ScrollPane'
import path from 'path'

export default {
  components: { ScrollPane },
  data() {
    return {
      visible: false,
      top: 0,
      left: 0,
      selectedTag: {},
      affixTags: []
    }
  },
  computed: {
    visitedViews() {
      return this.$store.state.tagsView.visitedViews
    },
    routes() {
      return this.$store.state.permission.routes
    }
  },
  watch: {
    $route() {
      this.addTags()
      this.moveToCurrentTag()
    },
    visible(value) {
      if (value) {
        document.body.addEventListener('click', this.closeMenu)
        document.addEventListener('keydown', this.handleKeydown)
      } else {
        document.body.removeEventListener('click', this.closeMenu)
        document.removeEventListener('keydown', this.handleKeydown)
      }
    }
  },
  mounted() {
    this.initTags()
    this.addTags()
  },
  beforeDestroy() {
    document.body.removeEventListener('click', this.closeMenu)
    document.removeEventListener('keydown', this.handleKeydown)
  },
  methods: {
    isActive(route) {
      return route.path === this.$route.path
    },
    isAffix(tag) {
      return tag.meta && tag.meta.affix
    },
    isFirstView() {
      const idx = this.visitedViews.findIndex(v => v.path === this.selectedTag.path)
      return idx <= 0 || this.visitedViews.slice(0, idx).every(v => this.isAffix(v))
    },
    isLastView() {
      const idx = this.visitedViews.findIndex(v => v.path === this.selectedTag.path)
      return idx === -1 || idx >= this.visitedViews.length - 1 || this.visitedViews.slice(idx + 1).every(v => this.isAffix(v))
    },
    filterAffixTags(routes, basePath = '/') {
      let tags = []
      routes.forEach(route => {
        if (route.meta && route.meta.affix) {
          const tagPath = path.resolve(basePath, route.path)
          tags.push({
            fullPath: tagPath,
            path: tagPath,
            name: route.name,
            meta: { ...route.meta }
          })
        }
        if (route.children) {
          const tempTags = this.filterAffixTags(route.children, route.path ? path.resolve(basePath, route.path) : basePath)
          if (tempTags.length >= 1) {
            tags = [...tags, ...tempTags]
          }
        }
      })
      return tags
    },
    initTags() {
      const affixTags = (this.affixTags = this.filterAffixTags(this.routes))
      for (const tag of affixTags) {
        if (tag.name) {
          this.$store.dispatch('tagsView/addVisitedView', tag)
        }
      }
    },
    addTags() {
      const { name } = this.$route
      if (name) {
        this.$store.dispatch('tagsView/addView', this.$route)
      }
      return false
    },
    moveToCurrentTag() {
      this.$nextTick(() => {
        const tags = this.$refs.tag
        if (!tags) return
        for (const tag of tags) {
          if (tag.to.path === this.$route.path) {
            this.$refs.scrollPane.moveToTarget(tag)
            if (tag.to.fullPath !== this.$route.fullPath) {
              this.$store.dispatch('tagsView/updateVisitedView', this.$route)
            }
            break
          }
        }
      })
    },
    refreshSelectedTag(view) {
      this.$tab.refreshPage(view)
    },
    closeSelectedTag(view) {
      this.$tab.closePage(view).then(({ visitedViews }) => {
        if (this.isActive(view)) {
          this.toLastView(visitedViews, view)
        }
      })
    },
    closeRightTags() {
      this.$tab.closeRightPage(this.selectedTag).then(visitedViews => {
        if (!visitedViews.find(i => i.fullPath === this.$route.fullPath)) {
          this.toLastView(visitedViews)
        }
      })
    },
    closeLeftTags() {
      this.$tab.closeLeftPage(this.selectedTag).then(visitedViews => {
        if (!visitedViews.find(i => i.fullPath === this.$route.fullPath)) {
          this.toLastView(visitedViews)
        }
      })
    },
    closeOthersTags() {
      this.$router.push(this.selectedTag).catch(() => {})
      this.$tab.closeOtherPage(this.selectedTag).then(() => {
        this.moveToCurrentTag()
      })
    },
    closeAllTags(view) {
      this.$tab.closeAllPage().then(({ visitedViews }) => {
        if (this.affixTags.some(tag => tag.path === this.$route.path)) {
          return
        }
        this.toLastView(visitedViews, view)
      })
    },
    toLastView(visitedViews, view) {
      const latestView = visitedViews.slice(-1)[0]
      if (latestView) {
        this.$router.push(latestView.fullPath)
      } else if (view && view.name === 'Index') {
        this.$router.replace({ path: '/redirect' + view.fullPath })
      } else {
        this.$router.push('/')
      }
    },
    openMenu(tag, e) {
      const menuWidth = 148
      const maxLeft = window.innerWidth - menuWidth - 8
      this.left = Math.max(8, Math.min(e.clientX, maxLeft))
      this.top = e.clientY + 4
      this.visible = true
      this.selectedTag = tag
    },
    closeMenu() {
      this.visible = false
    },
    handleKeydown(e) {
      if (e.key === 'Escape') {
        this.closeMenu()
      }
    },
    handleScroll() {
      this.closeMenu()
    }
  }
}
</script>

<style lang="scss" scoped>
@import '@/assets/styles/tokens.scss';

.tags-view-container {
  height: $topbar-height;
  min-width: 0;
  display: flex;
  align-items: center;
  overflow: hidden;

  .tags-view-wrapper {
    width: 100%;
    white-space: nowrap;

    .tags-view-flip {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      height: $topbar-height;
    }

    .tags-view-item {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 28px;
      padding: 0 10px;
      border-radius: $radius-sm;
      color: $label-secondary;
      font-size: 12px;
      cursor: pointer;
      user-select: none;
      transition:
        background-color $duration-fast $ease-out,
        color $duration-fast $ease-out;

      &:hover {
        background-color: $fill-hover;
        color: $label;

        .tags-view-item__close {
          opacity: 1;
        }
      }

      &.active {
        background-color: $fill-active;
        color: $label;
        font-weight: 500;

        .tags-view-item__close {
          opacity: 0.75;
        }
      }
    }

    .tags-view-item__close {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      margin-right: -4px;
      border-radius: 50%;
      font-size: 11px;
      opacity: 0;
      transition: opacity $duration-fast ease, background-color $duration-fast ease;

      &:hover {
        opacity: 1 !important;
        background-color: rgba(0, 0, 0, 0.1);
      }

      @media (hover: none) {
        opacity: 0.75;
      }
    }
  }

  .contextmenu {
    position: fixed;
    z-index: 2050;
    margin: 0;
    padding: 4px;
    min-width: 144px;
    list-style: none;
    background: $bg-base;
    border: 1px solid $separator;
    border-radius: $radius-md;
    box-shadow: $shadow-popover;
    font-size: 12px;
    color: $label;
    transform-origin: top left;
    animation: menuFadeIn 0.14s $ease-out;

    @media (prefers-reduced-motion: reduce) {
      animation: none;
    }

    li {
      display: flex;
      align-items: center;
      height: 30px;
      padding: 0 10px;
      border-radius: $radius-xs;
      cursor: pointer;
      white-space: nowrap;
      transition: background-color $duration-fast;

      &:hover {
        background: $fill-hover;
      }

      i {
        width: 16px;
        margin-right: 6px;
        text-align: center;
        color: $label-secondary;
      }
    }
  }
}

@keyframes menuFadeIn {
  from {
    opacity: 0;
    transform: translateY(-4px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.tags-flip-enter-active {
  transition: opacity $duration-fast $ease-out, transform $duration-fast $ease-out;
}

.tags-flip-enter {
  opacity: 0;
  transform: scale(0.97);
}

.tags-flip-move {
  transition: transform $duration-base $ease-in-out;
}

@media (prefers-reduced-motion: reduce) {
  .tags-flip-enter {
    transform: none;
  }
  .tags-flip-move {
    transition: none;
  }
}
</style>
