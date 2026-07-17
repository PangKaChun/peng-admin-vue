# 001 — 清除三个组件里硬编码的 Element 默认蓝 #409eff

- **Status**: DONE
- **Commit**: 859ddce(依赖工作区未提交的 tokens.scss 动效层改造)
- **Severity**: HIGH
- **Category**: 一致性(Cohesion & tokens)
- **Estimated scope**: 3 个文件,约 10 处小改

## Problem

品牌主色是 `$color-primary: #094194`(定义于 `src/assets/styles/tokens.scss:2`),但三个组件硬编码了 Element UI 的默认蓝 `#409eff`,hover/强调态看起来像另一个产品:

```scss
/* src/components/FileUpload/index.vue:382 — current */
$primary: #409eff;
```

```scss
/* src/components/FileUpload/index.vue:414-421 — current */
&:hover {
  border-color: $primary;
  background-color: #f4f9ff;

  .el-icon-upload {
    color: $primary;
  }
}
```

```scss
/* src/components/ExcelViewer/index.vue:219-221 — current */
&:hover {
  color: #409eff;
}
```

```scss
/* src/components/PdfViewer/index.vue:375-377 — current */
&:hover {
  color: #409eff;
}
```

FileUpload 中局部变量 `$primary` 的其余使用位置:410、415、419、448、479 行(以实际搜索结果为准)。

## Target

三个组件全部引用全局 token,不留局部品牌色定义:

```scss
/* target — 每个组件 <style lang="scss" scoped> 块的第一行(若尚未导入) */
@import '@/assets/styles/tokens.scss';
```

```scss
/* target — FileUpload:删除局部 $primary 定义,所有 $primary 引用改为 $color-primary */
&:hover {
  border-color: $color-primary;
  background-color: rgba($color-primary, 0.05); // 替代 #f4f9ff,从主色派生

  .el-icon-upload {
    color: $color-primary;
  }
}
```

```scss
/* target — ExcelViewer / PdfViewer */
&:hover {
  color: $color-primary;
}
```

## Repo conventions to follow

- Token 引入范例:`src/layout/components/Sidebar/Logo.vue:48` — `@import '@/assets/styles/tokens.scss';`(用 `@/` 别名,不用相对路径)
- 主色浅底派生范例:`src/assets/styles/variables.scss:28` — `rgba($color-primary, 0.1)`

## Steps

1. `src/components/FileUpload/index.vue`:在 `<style lang="scss" scoped>` 顶部加 `@import '@/assets/styles/tokens.scss';`,删除 382 行 `$primary: #409eff;`,把该文件所有 `$primary` 替换为 `$color-primary`(搜索确认无遗漏),416 行 `#f4f9ff` 改为 `rgba($color-primary, 0.05)`。
2. `src/components/ExcelViewer/index.vue`:确认 style 块是否已导入 tokens,没有则加 `@import '@/assets/styles/tokens.scss';`;220 行 `#409eff` → `$color-primary`。
3. `src/components/PdfViewer/index.vue`:同上;376 行 `#409eff` → `$color-primary`。
4. 全仓搜索 `#409eff`(含大写 `#409EFF`),确认 src 下不再有任何命中。

## Boundaries

- 不动这三个文件里的其它硬编码灰色(`#909399` `#c0c4cc` `#d9dde3` `#fafbfc`)— 那是 002/后续计划的范围。
- 不改模板与 JS,只改样式。
- 不新增依赖。
- 若某行与本计划引用的代码对不上(工作区已漂移),停下报告,不要即兴发挥。

## Verification

- **Mechanical**:`npm run dev` 编译无错;`grep -ri "#409eff" src/` 零命中。
- **Feel check**:打开 OSS 管理页(sys/oss)预览一个 PDF 与 Excel,hover 关闭按钮 — 高亮色应是深品牌蓝 #094194 系,不是亮蓝;打开含 FileUpload 的表单,hover 拖拽上传区,边框与图标应为品牌蓝,浅底是极淡的品牌蓝而非 #f4f9ff。
- **Done when**:src 下无 #409eff,三组件 hover 色与全站主按钮同色。
