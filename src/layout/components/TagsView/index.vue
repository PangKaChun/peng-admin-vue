<template>
  <div id="tags-view-container" class="tags-view-container">
    <scroll-pane
      ref="scrollPane"
      class="tags-view-wrapper"
      @scroll="handleScroll"
    >
      <router-link
        v-for="(tag, index) in visitedViews"
        ref="tag"
        :key="tag.path"
        :class="isActive(tag) ? 'active' : ''"
        :to="{ path: tag.path, query: tag.query, fullPath: tag.fullPath }"
        tag="span"
        class="tags-view-item"
        @click.middle.native="!isAffix(tag) ? closeSelectedTag(tag) : ''"
        @contextmenu.prevent.native="openMenu(tag, $event)"
      >
        <!-- 相邻标签间的分隔线：首个与活动标签不渲染 -->
        <span v-if="index !== 0 && !isActive(tag)" class="tags-view-item__divider" />
        <!-- 背景层：圆角矩形 + 左右 SVG 弧脚  -->
        <span class="tags-view-item__background">
          <span class="tags-view-item__background-content" />
          <svg class="tags-view-item__background-before" width="7" height="7" aria-hidden="true">
            <path d="M 0 7 A 7 7 0 0 0 7 0 L 7 7 Z" />
          </svg>
          <svg class="tags-view-item__background-after" width="7" height="7" aria-hidden="true">
            <path d="M 0 0 A 7 7 0 0 0 7 7 L 0 7 Z" />
          </svg>
        </span>
        <span class="tags-view-item__main">{{ tag.title }}</span>
        <span
          v-if="!isAffix(tag)"
          class="el-icon-close"
          @click.prevent.stop="closeSelectedTag(tag)"
        />
      </router-link>
    </scroll-pane>
    <ul
      v-show="visible"
      :style="{ left: left + 'px', top: top + 'px' }"
      class="contextmenu"
    >
      <li @click="refreshSelectedTag(selectedTag)">
        <i class="el-icon-refresh-right"></i> 刷新页面
      </li>
      <li v-if="!isAffix(selectedTag)" @click="closeSelectedTag(selectedTag)">
        <i class="el-icon-close"></i> 关闭当前
      </li>
      <li @click="closeOthersTags">
        <i class="el-icon-circle-close"></i> 关闭其他
      </li>
      <li v-if="!isFirstView()" @click="closeLeftTags">
        <i class="el-icon-back"></i> 关闭左侧
      </li>
      <li v-if="!isLastView()" @click="closeRightTags">
        <i class="el-icon-right"></i> 关闭右侧
      </li>
      <li @click="closeAllTags(selectedTag)">
        <i class="el-icon-circle-close"></i> 全部关闭
      </li>
    </ul>
  </div>
</template>

<script>
import ScrollPane from "./ScrollPane";
import path from "path";

export default {
  components: { ScrollPane },
  data() {
    return {
      visible: false,
      top: 0,
      left: 0,
      selectedTag: {},
      affixTags: [],
    };
  },
  computed: {
    visitedViews() {
      return this.$store.state.tagsView.visitedViews;
    },
    routes() {
      return this.$store.state.permission.routes;
    },
  },
  watch: {
    $route() {
      this.addTags();
      this.moveToCurrentTag();
    },
    visible(value) {
      if (value) {
        document.body.addEventListener("click", this.closeMenu);
      } else {
        document.body.removeEventListener("click", this.closeMenu);
      }
    },
  },
  mounted() {
    this.initTags();
    this.addTags();
  },
  methods: {
    isActive(route) {
      return route.path === this.$route.path;
    },
    isAffix(tag) {
      return tag.meta && tag.meta.affix;
    },
    isFirstView() {
      try {
        return (
          this.selectedTag.fullPath === "/index" ||
          this.selectedTag.fullPath === this.visitedViews[1].fullPath
        );
      } catch (err) {
        return false;
      }
    },
    isLastView() {
      try {
        return (
          this.selectedTag.fullPath ===
          this.visitedViews[this.visitedViews.length - 1].fullPath
        );
      } catch (err) {
        return false;
      }
    },
    filterAffixTags(routes, basePath = "/") {
      let tags = [];
      routes.forEach((route) => {
        if (route.meta && route.meta.affix) {
          const tagPath = path.resolve(basePath, route.path);
          tags.push({
            fullPath: tagPath,
            path: tagPath,
            name: route.name,
            meta: { ...route.meta },
          });
        }
        if (route.children) {
          // 父级 path 为空时（如根路由 `{ path: '' }`）继承当前 basePath，
          // 否则 path.resolve('', 'index') 会让 path-browserify 调用 process.cwd() 抛出 process is not defined
          const tempTags = this.filterAffixTags(route.children, route.path || basePath);
          if (tempTags.length >= 1) {
            tags = [...tags, ...tempTags];
          }
        }
      });
      return tags;
    },
    initTags() {
      const affixTags = (this.affixTags = this.filterAffixTags(this.routes));
      for (const tag of affixTags) {
        // Must have tag name
        if (tag.name) {
          this.$store.dispatch("tagsView/addVisitedView", tag);
        }
      }
    },
    addTags() {
      const { name } = this.$route;
      if (name) {
        this.$store.dispatch("tagsView/addView", this.$route);
        if (this.$route.meta.link) {
          this.$store.dispatch("tagsView/addIframeView", this.$route);
        }
      }
      return false;
    },
    moveToCurrentTag() {
      const tags = this.$refs.tag;
      this.$nextTick(() => {
        for (const tag of tags) {
          if (tag.to.path === this.$route.path) {
            this.$refs.scrollPane.moveToTarget(tag);
            // when query is different then update
            if (tag.to.fullPath !== this.$route.fullPath) {
              this.$store.dispatch("tagsView/updateVisitedView", this.$route);
            }
            break;
          }
        }
      });
    },
    refreshSelectedTag(view) {
      this.$tab.refreshPage(view);
      if (this.$route.meta.link) {
        this.$store.dispatch("tagsView/delIframeView", this.$route);
      }
    },
    closeSelectedTag(view) {
      this.$tab.closePage(view).then(({ visitedViews }) => {
        if (this.isActive(view)) {
          this.toLastView(visitedViews, view);
        }
      });
    },
    closeRightTags() {
      this.$tab.closeRightPage(this.selectedTag).then((visitedViews) => {
        if (!visitedViews.find((i) => i.fullPath === this.$route.fullPath)) {
          this.toLastView(visitedViews);
        }
      });
    },
    closeLeftTags() {
      this.$tab.closeLeftPage(this.selectedTag).then((visitedViews) => {
        if (!visitedViews.find((i) => i.fullPath === this.$route.fullPath)) {
          this.toLastView(visitedViews);
        }
      });
    },
    closeOthersTags() {
      this.$router.push(this.selectedTag).catch(() => {});
      this.$tab.closeOtherPage(this.selectedTag).then(() => {
        this.moveToCurrentTag();
      });
    },
    closeAllTags(view) {
      this.$tab.closeAllPage().then(({ visitedViews }) => {
        if (this.affixTags.some((tag) => tag.path === this.$route.path)) {
          return;
        }
        this.toLastView(visitedViews, view);
      });
    },
    toLastView(visitedViews, view) {
      const latestView = visitedViews.slice(-1)[0];
      if (latestView) {
        this.$router.push(latestView.fullPath);
      } else {
        // now the default is to redirect to the home page if there is no tags-view,
        // you can adjust it according to your needs.
        if (view.name === "Dashboard") {
          // to reload home page
          this.$router.replace({ path: "/redirect" + view.fullPath });
        } else {
          this.$router.push("/");
        }
      }
    },
    openMenu(tag, e) {
      const menuMinWidth = 105;
      const offsetLeft = this.$el.getBoundingClientRect().left; // container margin left
      const offsetWidth = this.$el.offsetWidth; // container width
      const maxLeft = offsetWidth - menuMinWidth; // left boundary
      const left = e.clientX - offsetLeft + 15; // 15: margin right

      if (left > maxLeft) {
        this.left = maxLeft;
      } else {
        this.left = left;
      }

      this.top = e.clientY - 50;
      this.visible = true;
      this.selectedTag = tag;
    },
    closeMenu() {
      this.visible = false;
    },
    handleScroll() {
      this.closeMenu();
    },
  },
};
</script>

<style lang="scss" scoped>
@import "../../../assets/styles/tokens.scss";

$tabs-gap: 7px;                              // 基准间隙：分隔线偏移 / 顶部圆角 / 弧脚尺寸
$tabs-overlap: 12px;                         // 相邻标签重叠量
$tabs-active-bg: rgba($color-primary, 0.15); // 活动标签：主题色 15% 蒙层
$tabs-hover-bg: $bg-grouped;                 // 悬停浮块

$motion-fast: .16s;

.tags-view-container {
  width: 100%;
  height: 38px;
  background: $bg-base;
  border-bottom: 1px solid $separator-light;
  box-sizing: border-box;
  overflow: hidden;

  .tags-view-wrapper {
    white-space: nowrap;
    height: 100%;

    .tags-view-item {
      position: relative;
      z-index: 1;
      display: inline-flex;
      align-items: center;

      height: 33px; // 37(容器内高，扣除底边框) - 4(顶部留白)
      margin-top: 4px;
      margin-right: -$tabs-overlap;

      color: rgba(0, 0, 0, 0.72);
      font-size: 12px;

      cursor: pointer;
      user-select: none;

      transition: color $motion-fast $ease-out;

      &:first-of-type {
        margin-left: 4px; // 给首个标签左弧脚的 1px 外溢留位
      }

      &:last-of-type {
        margin-right: 0;
      }

      /* 分隔线（模板 v-if 控制：首个与活动标签不渲染） */
      .tags-view-item__divider {
        position: absolute;
        top: 50%;
        left: $tabs-gap;
        z-index: 1;
        width: 1px;
        height: 16px;
        background: $separator;
        transform: translateY(-50%);
        transition: opacity $motion-fast;
      }

      /* 背景层：激活时是「顶部圆角矩形 + 两侧弧脚」的 Chrome 标签形；
         悬停时收底 2px、左右内缩 2px、四角全圆，同一元素平滑形变 */
      .tags-view-item__background {
        position: absolute;
        inset: 0;
        z-index: -1;
        padding: 0 ($tabs-gap - 1px);
        box-sizing: border-box;
        transition: padding $motion-fast $ease-out;

        .tags-view-item__background-content {
          display: block;
          height: 100%;
          border-radius: $tabs-gap $tabs-gap 0 0;
          transition:
            background-color $motion-fast $ease-out,
            margin $motion-fast $ease-out,
            border-radius $motion-fast $ease-out;
        }

        svg {
          position: absolute;
          bottom: 0;
          fill: transparent;
          transition: fill $motion-fast $ease-out;
        }

        .tags-view-item__background-before {
          left: -1px;
        }

        .tags-view-item__background-after {
          right: -1px;
        }
      }

      /* 主体文字：压在背景层之上 */
      .tags-view-item__main {
        position: relative;
        z-index: 2;
        display: inline-flex;
        align-items: center;
        height: 100%;
        margin: 0 ($tabs-gap * 2);
        padding: 0 18px 0 2px;
        overflow: hidden;
        white-space: nowrap;
      }

      /* -----------------------------
       * hover（非活动）：背景形变为悬浮圆角块
       * ----------------------------- */

      &:hover:not(.active) {
        color: $label;

        .tags-view-item__divider {
          opacity: 0;
        }

        .tags-view-item__background {
          padding-bottom: 2px;

          .tags-view-item__background-content {
            margin: 0 2px;
            border-radius: 6px;
            background-color: $tabs-hover-bg;
          }
        }
      }

      /* 悬停/活动标签右邻的分隔线同步隐藏 */
      &:hover:not(.active) + .tags-view-item .tags-view-item__divider,
      &.active + .tags-view-item .tags-view-item__divider {
        opacity: 0;
      }

      /* -----------------------------
       * active：主题色蒙层卡片 + 弧脚填色
       * ----------------------------- */

      &.active {
        z-index: 2;
        color: $color-primary;

        .tags-view-item__background {
          .tags-view-item__background-content {
            background-color: $tabs-active-bg;
          }

          svg {
            fill: $tabs-active-bg;
          }
        }
      }
    }
  }

 /* -----------------------------
   * Context Menu
   * ----------------------------- */
  .contextmenu {
    position: absolute;
    z-index: 100;
    margin: 0;
    padding: 6px;
    min-width: 150px;
    list-style: none;
    background: #fff;
    border: 1px solid $separator-light;
    border-radius: $radius-md;
    box-shadow: $shadow-popover;
    font-size: 13px;
    color: $label;

    animation: menuFadeIn .16s ease;

    li {
      display: flex;
      align-items: center;
      height: 32px;
      padding: 0 12px;
      border-radius: $radius-xs;
      cursor: pointer;
      white-space: nowrap;
      transition:
        background-color $motion-fast,
        color $motion-fast;

      &:hover {
        background: $bg-grouped;
      }

      i {
        width: 16px;
        margin-right: 8px;
        text-align: center;
      }
    }
  }
}

/* -----------------------------
 * Animation
 * ----------------------------- */

@keyframes menuFadeIn {
  from {
    opacity: 0;
    transform: translateY(-4px) scale(.98);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
</style>

<style lang="scss">
// 关闭按钮
.tags-view-wrapper {
  .tags-view-item {
    .el-icon-close {
      position: absolute;
      top: 50%;
      right: 14px;
      z-index: 3;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      transform: translateY(-50%);
      transition: background-color .16s ease;

      &:before {
        display: inline-block;
        transform: scale(.9);
      }

      &:hover {
        background: rgba(0, 0, 0, .10);
      }

      &:active {
        background: rgba(0, 0, 0, .16);
      }
    }
  }
}
</style>
