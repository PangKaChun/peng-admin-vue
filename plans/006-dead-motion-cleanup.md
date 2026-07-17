# 006 — 清理死动效规则与死按钮样式

- **Status**: TODO
- **Commit**: 859ddce
- **Severity**: LOW
- **Category**: 一致性·清理(Cohesion & tokens)
- **Estimated scope**: 2 个文件,纯删除

## Problem

两处死代码误导后来者:

**1. `.main-container` 的 margin-left 过渡** — 布局早已改为 el-container flex(侧栏宽度经 `layout/index.vue:4` 内联样式控制),`margin-left` 从不变化,这条过渡永远不会触发:

```scss
/* src/assets/styles/sidebar.scss:3-8 — current */
.main-container {
  min-height: 100%;
  transition: margin-left .28s $ease-in-out;
  // margin-left: $base-sidebar-width;
  position: relative;
}
```

**2. `.el-button--cyan` 系列** — 全仓搜索 `cyan` 仅 rongji.scss 自身命中,零使用,且硬编码 #20B2AA/#48D1CC 不在任何 token 里:

```scss
/* src/assets/styles/rongji.scss:186-205 — current */
/* button color */
.el-button--cyan.is-active,
.el-button--cyan:active {
  background: #20B2AA;
  /* … */
}

.el-button--cyan:focus,
.el-button--cyan:hover {
  background: #48D1CC;
  /* … */
}

.el-button--cyan {
  background-color: #20B2AA;
  /* … */
}
```

## Target

```scss
/* target — sidebar.scss */
.main-container {
  min-height: 100%;
  position: relative;
}
```

rongji.scss:186-205 的 `/* button color */` 注释与三条 `.el-button--cyan` 规则整体删除。

## Repo conventions to follow

- `.withoutAnimation` 块(sidebar.scss 244-250)**保留** — 它仍作用于移动端抽屉的 transform 过渡。
- `.mobile .sidebar-container` 的 transform 过渡**保留** — 移动端抽屉是活的。

## Steps

1. `src/assets/styles/sidebar.scss`:删除 `transition: margin-left .28s $ease-in-out;` 与注释行 `// margin-left: $base-sidebar-width;`。
2. `src/assets/styles/rongji.scss`:删除 186-205 行的 cyan 按钮块(以实际内容边界为准:从 `/* button color */` 到第三条 `.el-button--cyan` 规则的闭合)。
3. 全仓搜索 `cyan` 确认仅剩 node_modules / 无关命中。

## Boundaries

- 仅删除以上两处;不顺手重构、不动别的注释代码。
- 不新增依赖。
- 若发现 `.el-button--cyan` 出现了新使用点(工作区漂移),停下报告。

## Verification

- **Mechanical**:`npm run dev` 编译无错;`grep -rn "cyan\|margin-left .28" src/assets/styles/` 零命中。
- **Feel check**:登录后折叠/展开侧栏、拖拽 sash 调宽:行为与删除前完全一致(这两条本来就是死规则,任何行为变化都说明删错了 — 立即回退并报告)。
- **Done when**:grep 零命中且侧栏行为无任何变化。
