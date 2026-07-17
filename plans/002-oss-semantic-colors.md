# 002 — OSS 缩略图配色改用语义 token

- **Status**: DONE
- **Commit**: 859ddce(依赖工作区未提交的 tokens.scss 动效层改造)
- **Severity**: HIGH
- **Category**: 一致性(Cohesion & tokens)
- **Estimated scope**: 2 个文件(oss 视图 + tokens.scss 加 1 个 token)

## Problem

`src/views/sys/oss/index.vue` 的文件类型缩略图硬编码了 Element UI 的调色板,绕过了项目的 Apple 语义色(`tokens.scss`:`$color-danger: #D32F2F`、`$color-success: #388E3C`、`$label: #1D1D1F`):

```scss
/* src/views/sys/oss/index.vue:458-496 — current */
.oss-thumb--video {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #303133;
  color: #fff;
  font-size: 16px;
  transition: background-color 0.2s ease;

  &:hover {
    background: #606266;
  }
}
.oss-thumb--pdf {
  /* …同结构… */
  background: #fef0f0;
  color: #f56c6c;
  &:hover {
    background: #fde2e2;
  }
}
.oss-thumb--excel {
  /* …同结构… */
  background: #f0f9eb;
  color: #67c23a;
  &:hover {
    background: #e7f6db;
  }
}
```

另外 456 与 499 行的占位灰 `#c0c4cc` 也是 Element 调色板,tokens 里缺一档三级文字色。

## Target

```scss
/* target — src/assets/styles/tokens.scss,加在 $label-secondary 之后 */
$label-tertiary:    #AEAEB2; // 三级文字(占位符 / 弱化图标)
```

```scss
/* target — oss/index.vue(仅列出变化的声明,结构不动) */
.oss-thumb--video {
  background: $label;
  color: #fff;
  &:hover { background: mix(#fff, $label, 15%); }
}
.oss-thumb--pdf {
  background: rgba($color-danger, 0.08);
  color: $color-danger;
  &:hover { background: rgba($color-danger, 0.14); }
}
.oss-thumb--excel {
  background: rgba($color-success, 0.08);
  color: $color-success;
  &:hover { background: rgba($color-success, 0.14); }
}
/* 456、499 行 */
color: $label-tertiary;
```

## Repo conventions to follow

- 语义色浅底派生范例:`src/assets/styles/variables.scss:28` — `rgba($color-primary, 0.1)`
- token 注释风格:中文、行尾注释,见 `tokens.scss` 全文
- 组件内引 token 需 `@import '@/assets/styles/tokens.scss';`(范例 `src/layout/components/Sidebar/Logo.vue:48`)

## Steps

1. `src/assets/styles/tokens.scss`:在 `$label-secondary:   #6E6E73;`(17 行附近)下一行加 `$label-tertiary:    #AEAEB2; // 三级文字(占位符 / 弱化图标)`。
2. `src/views/sys/oss/index.vue`:确认 `<style>` 块已导入 tokens(没有则在块顶加 `@import '@/assets/styles/tokens.scss';`)。
3. 按 Target 逐条替换 `.oss-thumb--video` / `--pdf` / `--excel` 的 `background`、`color`、`&:hover background` 六组值。
4. 456、499 行 `#c0c4cc` → `$label-tertiary`。
5. `transition: background-color 0.2s ease;` 三处保持不变(hover 色彩过渡用内置 ease 是正确的)。

## Boundaries

- 只动上述配色声明;不改布局、模板、JS。
- 不动该文件其它硬编码色(如 #303133 以外的工具条颜色)— 超出本计划范围。
- 不新增依赖。
- 若行号/代码与引用对不上,停下报告。

## Verification

- **Mechanical**:`npm run dev` 编译无错;`grep -n "#f56c6c\|#67c23a\|#fef0f0\|#f0f9eb\|#c0c4cc" src/views/sys/oss/index.vue` 零命中。
- **Feel check**:打开 OSS 管理页,看视频/PDF/Excel 三种缩略图:红绿应是项目的深红 #D32F2F / 深绿 #388E3C 系(与 el-tag danger/success 同族),不再是 Element 亮红亮绿;hover 时浅底加深一档,过渡平顺。
- **Done when**:grep 零命中且三种缩略图与全站语义色一致。
