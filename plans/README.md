# 动效与一致性改进计划

由 `improve-animations` 审计产出(2026-07-17,commit 859ddce)。审计范围:界面一致性、动效质量、性能、可访问性。

> 前置依赖:工作区**未提交**的全局动效层改造(tokens.scss 强曲线 + 时长分级、motion.scss、transition.scss 非对称路由切换)。计划 001/002/003/005/007 引用其中的 token,先提交那批改动再执行计划。

## 计划清单

| # | 计划 | 严重度 | 类别 | 状态 |
| --- | --- | --- | --- | --- |
| 001 | [清除硬编码 Element 蓝 #409eff](001-brand-blue-tokens.md) | HIGH | 一致性 | DONE |
| 002 | [OSS 缩略图语义 token](002-oss-semantic-colors.md) | HIGH | 一致性 | DONE |
| 003 | [Loading 转速 2s → 1.2s](003-loading-spinner-speed.md) | MEDIUM | 感知性能 | DONE |
| 004 | [Hamburger 旋转过渡](004-hamburger-rotation.md) | MEDIUM | 动效质量 | DONE |
| 005 | [reduced-motion 补漏 ×3](005-reduced-motion-gaps.md) | MEDIUM | 可访问性 | DONE |
| 006 | [死动效/死样式清理](006-dead-motion-cleanup.md) | LOW | 清理 | DONE |
| 007 | [TagsView 标签增删 FLIP](007-tagsview-flip.md) | 机会项 | 动效质量 | DONE |

## 推荐执行顺序

1. **001 → 002**(一致性,收益最大,纯样式替换,风险最低)
2. **003 → 004 → 006**(各自独立的一行级改动,可合并为一次提交)
3. **005**(可访问性补漏,涉及三个文件,验证需模拟 reduce)
4. **007**(唯一动模板的计划,风险最高,单独提交,重点回归 ScrollPane 滚动定位)

## 依赖关系

- 002 依赖 001 的"组件内 @import tokens"习惯,但不硬依赖 — 可乱序。
- 005 的 sidebar.scss 改动与 006 的 sidebar.scss 删除同文件 — 若同批执行,先 006 后 005,避免行号漂移。
- 007 无代码依赖,但建议最后做:它是唯一需要真机手感回归的计划。

## 审计中确认不改的项(勿反复提出)

- TagsView 背景层 morph 动 padding/margin/border-radius — 刻意取舍(绝对定位小子树,成本可忽略),注释已说明。
- 侧栏宽度折叠瞬跳 — 刻意(动画 width 逐帧 reflow 整个主区 + 与 sash 拖拽冲突)。
- 登录→首页整视图硬切 — 审计提出过(机会项 B),用户决定不做。
