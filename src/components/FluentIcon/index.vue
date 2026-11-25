<template>
  <span
    :class="wrapperClass"
    aria-hidden="true"
    v-on="$listeners"
    v-html="svgContent"
  />
</template>

<script>
let iconMap = null
let iconLoadPromise = null

function loadIcons() {
  if (iconMap) {
    return Promise.resolve(iconMap)
  }
  if (!iconLoadPromise) {
    iconLoadPromise = import(/* webpackChunkName: "fluent-icons" */ './icons')
      .then(mod => {
        iconMap = Object.freeze(mod.default || mod)
        return iconMap
      })
      .catch(err => {
        iconLoadPromise = null
        throw err
      })
  }
  return iconLoadPromise
}

/**
 * Fluent UI 图标组件（按需异步加载注册表）
 */
export default {
  name: 'FluentIcon',
  props: {
    name: {
      type: String,
      required: true
    },
    size: {
      type: [Number, String],
      default: 24
    },
    filled: {
      type: Boolean,
      default: false
    },
    className: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      iconsReady: Boolean(iconMap)
    }
  },
  computed: {
    iconKey() {
      const name = this.name.replace(/-/g, '_')
      if (/_\d+_(regular|filled)$/.test(name)) {
        return name
      }
      const variant = this.filled ? 'filled' : 'regular'
      return `${name}_${this.size}_${variant}`
    },
    svgContent() {
      if (!this.iconsReady || !iconMap) {
        return ''
      }
      const svg = iconMap[this.iconKey]
      if (!svg && process.env.NODE_ENV !== 'production') {
        console.warn(`[FluentIcon] 图标「${this.iconKey}」未注册`)
      }
      return svg || ''
    },
    wrapperClass() {
      return this.className ? `fluent-icon ${this.className}` : 'fluent-icon'
    }
  },
  created() {
    if (!this.iconsReady) {
      loadIcons()
        .then(() => {
          this.iconsReady = true
        })
        .catch(() => {})
    }
  }
}
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
