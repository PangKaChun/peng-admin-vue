<template>
  <section class="app-main">
    <transition name="fade-transform" mode="out-in">
      <keep-alive :include="cachedViews">
        <router-view :key="key" />
      </keep-alive>
    </transition>
  </section>
</template>

<script>
export default {
  name: 'AppMain',
  computed: {
    cachedViews() {
      return this.$store.state.tagsView.cachedViews
    },
    key() {
      return this.$route.path
    }
  }
}
</script>

<style lang="scss" scoped>
.app-main {
  /* 50 = navbar，38 = tagsView */
  height: calc(100vh - 50px - 38px);
  width: 100%;
  position: relative;
  overflow: hidden;
}
</style>

<style lang="scss">
// 全局滚动条:透明轨道 + 半透明滑块;2px 透明边框把可见滑块收窄到 4px,悬停时加深并加宽到 6px
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track,
::-webkit-scrollbar-corner {
  background-color: transparent;
}

::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.2);
  background-clip: padding-box;
  border: 2px solid transparent;
  border-radius: 4px;

  &:hover {
    background-color: rgba(0, 0, 0, 0.35);
    border-width: 1px;
  }
}
</style>
