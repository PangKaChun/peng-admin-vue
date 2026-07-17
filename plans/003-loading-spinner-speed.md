# 003 — 提速全局 loading 转圈,提升感知性能

- **Status**: DONE
- **Commit**: 859ddce(依赖工作区未提交的 motion.scss)
- **Severity**: MEDIUM
- **Category**: 感知性能(Easing & duration)
- **Estimated scope**: 1 个文件,1 条规则

## Problem

全仓 18+ 个视图用 `v-loading`(表格加载、登录跳转等),Element UI 的 spinner 默认 **2s/圈**:

```css
/* element-ui/theme-chalk(stock,不可改动源) */
.el-loading-spinner .circular {
  animation: loading-rotate 2s linear infinite;
}
```

转得慢的 spinner 让同样的等待显得更久 — 加快转速不改变实际耗时,但显著改善加载的感知速度(faster-spinning spinner makes load feel faster)。

## Target

```scss
/* target — src/assets/styles/motion.scss 末尾(reduced-motion 块之前)新增 */

/* —— Loading 转速:2s/圈 → 1.2s/圈,同样耗时感知更快 —— */
.el-loading-spinner .circular {
  animation-duration: 1.2s;
}
```

选择器与 stock 完全同权重(0,2,0),靠加载顺序覆盖:`motion.scss` 经 `index.scss` 在 `main.js` 中晚于 element 主题(`element-variables.scss`)加载,后到者胜。

## Repo conventions to follow

- Element 覆盖集中在 `src/assets/styles/motion.scss`,分节注释用 `/* —— 标题 —— */` 中文样式,见该文件现有分节。
- 保持 `linear` 不动:匀速旋转是 constant motion,linear 正确。

## Steps

1. 打开 `src/assets/styles/motion.scss`,在 `@media (prefers-reduced-motion: reduce)` 块**之前**插入 Target 中的规则(含分节注释)。

## Boundaries

- 不改 `.el-loading-spinner .path` 的 dash 动画(1.5s ease-in-out 描边节奏与转速独立)。
- 不动任何视图的 v-loading 用法。
- 不新增依赖。

## Verification

- **Mechanical**:`npm run dev` 编译无错;DevTools 中选中任一 loading 的 `.circular`,computed `animation-duration` 为 `1.2s`。
- **Feel check**:打开任意列表页(如 sys/user)刷新触发表格 loading:转圈应明显轻快,但不至于焦躁(若感觉太急,退到 1.4s;不要低于 1s)。
- **Done when**:全站任意 v-loading 的转速均为 1.2s/圈。
