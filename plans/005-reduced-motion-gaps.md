# 005 — 补齐 reduced-motion 覆盖缺口(登录卡 / 右键菜单 / 移动端抽屉)

- **Status**: DONE
- **Commit**: 859ddce(依赖工作区未提交的 motion.scss)
- **Severity**: MEDIUM
- **Category**: 可访问性(Accessibility)
- **Estimated scope**: 3 个文件,各 1 小块

## Problem

`motion.scss` 的 `prefers-reduced-motion` 块只覆盖了全局层(路由切换、弹窗、下拉、按钮),三处组件内的**位移动画**不在保护范围:

```scss
/* src/views/login.vue:222-232 附近 — current:16px 上升入场 */
animation: login-rise 0.5s $ease-out both;

@keyframes login-rise {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  /* … */
}
```

```scss
/* src/layout/components/TagsView/index.vue:449-450 附近 — current:右键菜单位移入场 */
transform-origin: top left;
animation: menuFadeIn .16s $ease-out;

/* 同文件 480-490 行 @keyframes menuFadeIn:translateY(-4px) scale(.98) → 原位 */
```

```scss
/* src/assets/styles/sidebar.scss:228-241 — current:移动端抽屉横移 */
.sidebar-container {
  position: fixed;
  transition: transform .28s $ease-in-out;
  width: $base-sidebar-width !important;
}
```

原则:减弱不是清零 — **保留帮助理解的透明度过渡,去掉位移/缩放**。

## Target

```scss
/* target — login.vue,紧跟 login-rise 所在规则之后新增 */
@media (prefers-reduced-motion: reduce) {
  /* 选择器 = 当前挂 animation: login-rise 的那个选择器 */
  animation: login-fade 0.3s $ease-out both;
}

@keyframes login-fade {
  from { opacity: 0; }
}
```

```scss
/* target — TagsView/index.vue,加在 .contextmenu 规则内 */
@media (prefers-reduced-motion: reduce) {
  animation: menuFadeReduced .12s $ease-out;
}

/* 与 menuFadeIn 相邻处新增 */
@keyframes menuFadeReduced {
  from { opacity: 0; }
}
```

```scss
/* target — sidebar.scss,mobile 块内 .sidebar-container 之后 */
@media (prefers-reduced-motion: reduce) {
  transition: none; // 抽屉必须移动才有意义,reduce 下改为瞬时定位
}
```

## Repo conventions to follow

- reduced-motion 的既有写法见 `src/assets/styles/motion.scss` 末尾块:去 transform、留 opacity。
- login.vue 与 TagsView 均已 `@import` tokens,`$ease-out` 直接可用;sidebar.scss 经 index.scss 编译,同样可用。

## Steps

1. `src/views/login.vue`:找到 `animation: login-rise` 所在选择器(约 218-222 行),在该选择器内部追加 reduce 媒体查询(嵌套写法,SCSS 支持);在 `@keyframes login-rise` 旁新增 `@keyframes login-fade`。
2. `src/layout/components/TagsView/index.vue`:`.contextmenu` 规则内(约 449 行 animation 声明之后)追加 reduce 嵌套块;`@keyframes menuFadeIn`(约 480 行)旁新增 `menuFadeReduced`。
3. `src/assets/styles/sidebar.scss`:`.mobile .sidebar-container`(约 228 行)规则内追加 reduce 嵌套块 `transition: none;`。

## Boundaries

- 不改三处动画的正常(非 reduce)路径 — 时长、曲线、位移都保持现状。
- 不动 motion.scss 现有 reduce 块。
- 不新增依赖。
- 若与引用代码对不上(行号漂移),按选择器语义定位;语义也对不上则停下报告。

## Verification

- **Mechanical**:`npm run dev` 编译无错。
- **Feel check**:DevTools → Rendering → Emulate `prefers-reduced-motion: reduce`:
  - 刷新登录页:卡片纯淡入,无上升位移。
  - 登录后在页签上右键:菜单纯淡入,无位移缩放。
  - 窄窗口(<992px)切移动端模式开合侧栏:抽屉瞬时出现/消失,无横移。
  - 关掉模拟,三处动画恢复原样。
- **Done when**:reduce 模拟下全站找不到位移/缩放动画,透明度反馈仍在。
