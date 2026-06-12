<template>
  <span
    :class="wrapperClass"
    aria-hidden="true"
    v-on="$listeners"
    v-html="svgContent"
  />
</template>

<script>
import icons from "./icons";

/**
 * Fluent UI 图标组件（基于 @fluentui/svg-icons 按需注册，见同目录 icons.js）
 *
 * 用法：
 *   <fluent-icon name="add" />
 *   <fluent-icon name="arrow-clockwise" />
 *   <fluent-icon name="star" filled style="color: #f5a623; font-size: 24px" />
 *   <fluent-icon name="add_24_regular" />  <!-- 完整键名直接渲染，size / filled 失效 -->
 *
 * 图标随 font-size 缩放、随 color 取色，与 svg-icon 行为一致。
 */
export default {
  name: "FluentIcon",
  props: {
    // 图标名，支持短横线写法（arrow-clockwise）或下划线写法（arrow_clockwise）
    name: {
      type: String,
      required: true,
    },
    // 设计尺寸（Fluent 每档尺寸独立绘制），仅决定选用哪套设计稿，显示大小跟随 font-size
    size: {
      type: [Number, String],
      default: 24,
    },
    // 填充变体（filled），默认线框（regular）
    filled: {
      type: Boolean,
      default: false,
    },
    className: {
      type: String,
      default: "",
    },
  },
  computed: {
    iconKey() {
      const name = this.name.replace(/-/g, "_");
      if (/_\d+_(regular|filled)$/.test(name)) {
        return name;
      }
      const variant = this.filled ? "filled" : "regular";
      return `${name}_${this.size}_${variant}`;
    },
    svgContent() {
      const svg = icons[this.iconKey];
      if (!svg) {
        if (process.env.NODE_ENV !== "production") {
          console.warn(
            `[FluentIcon] 图标「${this.iconKey}」未注册，请在 src/components/FluentIcon/icons.js 中按需引入`
          );
        }
        return "";
      }
      return svg;
    },
    wrapperClass() {
      return this.className ? `fluent-icon ${this.className}` : "fluent-icon";
    },
  },
};
</script>

<style scoped>
.fluent-icon {
  display: inline-block;
  width: 1.2em;
  height: 1.2em;
  vertical-align: -0.25em;
}

.fluent-icon ::v-deep svg {
  display: block;
  width: 100%;
  height: 100%;
  fill: currentColor;
}
</style>
