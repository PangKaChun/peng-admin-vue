<template>
  <div
    role="button"
    tabindex="0"
    :aria-label="isActive ? '收起侧边栏' : '展开侧边栏'"
    @click="toggleClick"
    @keydown.enter.prevent="toggleClick"
    @keydown.space.prevent="toggleClick"
  >
    <svg
      :class="{ 'is-active': isActive }"
      class="hamburger"
      viewBox="0 0 16 16"
      width="16"
      height="16"
      fill="none"
      aria-hidden="true"
    >
      <rect x="1.75" y="2.25" width="12.5" height="11.5" rx="2" stroke="currentColor" stroke-width="1.3" />
      <line x1="6" y1="2.25" x2="6" y2="13.75" stroke="currentColor" stroke-width="1.3" />
    </svg>
  </div>
</template>

<script>
export default {
  name: 'Hamburger',
  props: {
    isActive: {
      type: Boolean,
      default: false
    }
  },
  methods: {
    toggleClick() {
      this.$emit('toggleClick')
    }
  }
}
</script>

<style scoped>
.hamburger {
  display: block;
  width: 16px;
  height: 16px;
  opacity: 0.72;
  transition: opacity 0.15s ease;
}

.hamburger.is-active {
  opacity: 1;
}
</style>
