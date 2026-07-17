# 004 — Hamburger 折叠图标旋转加过渡

- **Status**: DONE
- **Commit**: 859ddce
- **Severity**: MEDIUM
- **Category**: 动效质量(Physicality & origin / Cohesion)
- **Estimated scope**: 1 个文件,2 行

## Problem

侧栏折叠按钮的图标在 `is-active` 时旋转 180°,**没有过渡,瞬间翻转**:

```css
/* src/components/Hamburger/index.vue:33-43 — current(注意:plain CSS,非 scss)*/
<style scoped>
.hamburger {
  display: inline-block;
  vertical-align: middle;
  width: 20px;
  height: 20px;
}

.hamburger.is-active {
  transform: rotate(180deg);
}
```

点击后图标瞬跳 + 侧栏宽度瞬跳,状态变化无任何解释,感觉像渲染故障。图标加 0.2s 旋转即可让点击得到柔和确认;**侧栏宽度保持瞬跳是刻意的**(动画 width 会逐帧 reflow 整个主区,且与 sash 拖拽调宽互相打架 — 高频操作快就是对),不要给它加动画。

## Target

```css
/* target — .hamburger 增加一行 transition */
.hamburger {
  display: inline-block;
  vertical-align: middle;
  width: 20px;
  height: 20px;
  transition: transform 0.2s cubic-bezier(0.23, 1, 0.32, 1); /* = tokens.scss 的 $ease-out */
}
```

`rotate` 属 transform,GPU 合成,无性能顾虑。该 style 块是 plain CSS 用不了 SCSS 变量,直接内联曲线字面量并用注释标明来源 token。

## Repo conventions to follow

- 曲线唯一真源是 `src/assets/styles/tokens.scss:40` 的 `$ease-out: cubic-bezier(0.23, 1, 0.32, 1)` — 字面量必须与它逐字一致。
- 时长参考同类:图标级反馈 0.15–0.2s(见 `motion.scss` 按钮 transform 0.16s)。

## Steps

1. `src/components/Hamburger/index.vue`:在 `.hamburger` 规则(34-39 行)中追加 `transition: transform 0.2s cubic-bezier(0.23, 1, 0.32, 1);` 与来源注释。

## Boundaries

- 不给 `.sidebar-container` / `.main-container` 加任何宽度或位移动画(见 Problem 中的刻意取舍)。
- 不改模板、JS、SVG path。
- 不把 style 块改成 lang="scss"(改动面最小化)。

## Verification

- **Mechanical**:`npm run dev` 编译无错。
- **Feel check**:登录后连点折叠按钮:图标应平滑旋转,且**中途再点会从当前角度平滑折返**(transition 可中断);侧栏宽度依旧瞬跳 — 这是预期行为,不是遗漏。DevTools 动画面板放慢 10% 确认旋转用的是强 ease-out(起步快)。
- **Done when**:图标旋转平滑可中断,侧栏本体行为无变化。
