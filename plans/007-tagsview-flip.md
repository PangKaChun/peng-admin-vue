# 007 — TagsView 标签增删的 FLIP 动效

- **Status**: DONE
- **Commit**: 859ddce(依赖工作区未提交的 tokens.scss 强曲线)
- **Severity**: 机会项(Missed opportunity)
- **Category**: 动效质量(Interruptibility / Missed opportunities)
- **Estimated scope**: 1 个文件(模板 + 样式各一小块)

## Problem

新开页签**瞬间出现**、关闭页签时右侧标签**瞬间跳位** — 高频可见的 jarring seam。当前模板(`src/layout/components/TagsView/index.vue:8-37`)是裸 v-for:

```html
<!-- current -->
<scroll-pane ref="scrollPane" class="tags-view-wrapper" @scroll="handleScroll">
  <router-link
    v-for="(tag, index) in visitedViews"
    ref="tag"
    :key="tag.path"
    ...
    tag="span"
    class="tags-view-item"
  >
    ...
  </router-link>
</scroll-pane>
```

`:key="tag.path"` 已就位,直接可上 `<transition-group>` 的 FLIP。

设计取舍(已定,executor 不要偏离):
- **入场**:0.15s 淡入 + scale(0.97)→1(高频元素 → drastically reduce,不超过 0.15s)。
- **出场:无动画**。Vue 的 leave 动画需要给离场元素 `position: absolute`,会破坏这套负 margin 重叠 + SVG 弧脚的 Chrome 标签布局;离场瞬删,由 move 动画平滑补位。
- **移位**:`transform 0.2s $ease-in-out`(纯 transform,GPU,天然可中断)。
- **不加 `appear`**:首次渲染(刷新恢复多个页签)不许全体淡入。

## Target

```html
<!-- target:transition-group 包裹 v-for,tag="span" 保持 inline 流 -->
<scroll-pane ref="scrollPane" class="tags-view-wrapper" @scroll="handleScroll">
  <transition-group name="tags-flip" tag="span" class="tags-view-flip">
    <router-link ...(原样)... >
      ...
    </router-link>
  </transition-group>
</scroll-pane>
```

```scss
/* target — 同文件 scoped 样式,加在 .tags-view-wrapper 规则附近 */
.tags-view-flip {
  display: inline-block;
  white-space: nowrap;
  height: 100%;
}

.tags-flip-enter-active {
  transition: opacity 0.15s $ease-out, transform 0.15s $ease-out;
}

.tags-flip-enter {
  opacity: 0;
  transform: scale(0.97);
}

.tags-flip-move {
  transition: transform 0.2s $ease-in-out;
}

@media (prefers-reduced-motion: reduce) {
  .tags-flip-enter {
    transform: none;
  }

  .tags-flip-move {
    transition: none;
  }
}
```

## Repo conventions to follow

- 该文件已 `@import "../../../assets/styles/tokens.scss";`(274 行),`$ease-out` / `$ease-in-out` 直接可用。
- 曲线/时长不得内联字面量 — 全部走 token(本文件既有写法:`transition: color $motion-fast $ease-out`)。
- reduce 写法对齐 `motion.scss`:去位移留淡入。

## Steps

1. 模板:在 `<scroll-pane>` 与 `<router-link v-for>` 之间插入 `<transition-group name="tags-flip" tag="span" class="tags-view-flip">`,闭合于 `</router-link>` 之后。router-link 及其内部一字不动。
2. 样式:按 Target 添加五条规则(容器 + enter-active + enter + move + reduce)。
3. 确认 `.tags-view-item:first-of-type`(约 313 行)在新容器下仍命中(transition-group 渲染的 span 成为父级,first-of-type 作用于兄弟间,应不受影响 — 亲测确认)。

## Boundaries

- 不动 ScrollPane 组件、不动 `$refs.tag`(refs 在 v-for 元素上,不受包裹影响,但需验证 moveToTarget 滚动定位仍工作)。
- 不加 leave 动画(见 Problem 中的取舍)、不加 `appear`。
- 不改分隔线 v-if 逻辑。
- 若模板结构与引用不符,停下报告。

## Verification

- **Mechanical**:`npm run dev` 编译无错,控制台无 Vue key/transition-group 警告。
- **Feel check**(登录后):
  - 从侧栏连开 3 个新页面:每个新标签淡入 + 轻微放大到位,不闪、不推挤跳位。
  - 关闭中间标签:右侧标签平滑左移补位(0.2s),无瞬跳;**连点关闭多个**,移动从当前位置续走(可中断),不回零重播。
  - 右键 → 关闭其他/全部:多标签同时补位,不卡顿。
  - 页签多到出横向滚动时,新开页签的自动滚动定位(moveToTarget)仍正常。
  - DevTools 动画面板 10% 速度:enter 的 scale 从 0.97 起,不是从 0。
  - Rendering 面板开 reduce:新增标签纯淡入,补位瞬时。
- **Done when**:增删页签全程无瞬跳,连续操作可中断,首次加载无全体入场动画。
