<template>
  <div class="sidebar-logo-container" :class="{'collapse':collapse}">
    <router-link class="sidebar-logo-link" to="/">
      <span class="sidebar-logo-badge">P</span>
      <span v-if="!collapse" class="sidebar-title">{{ title }}</span>
    </router-link>
  </div>
</template>

<script>
export default {
  name: 'SidebarLogo',
  props: {
    collapse: {
      type: Boolean,
      required: true
    }
  },
  data() {
    return {
      title: 'PENG ADMIN'
    }
  }
}
</script>

<style lang="scss" scoped>
@import '@/assets/styles/tokens.scss';

.sidebar-logo-container {
  position: relative;
  width: 100%;
  height: 50px;
  line-height: 50px;
  border-bottom: 1px solid $separator;
  overflow: hidden;

  & .sidebar-logo-link {
    height: 100%;
    width: 100%;
    display: flex;
    align-items: center;
    padding: 0 $space-4;
    box-sizing: border-box;

    & .sidebar-logo-badge {
      flex: none;
      width: 26px;
      height: 26px;
      line-height: 26px;
      border-radius: $radius-sm;
      background: $color-primary;
      color: #fff;
      font-weight: 700;
      font-size: 13px;
      text-align: center;
    }

    & .sidebar-title {
      display: inline-block;
      margin: 0 0 0 $space-3;
      color: $label;
      font-weight: 600;
      line-height: 20px;
      font-size: 14px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }

  &.collapse {
    .sidebar-logo-link {
      padding: 0;
      justify-content: center;
    }
  }
}
</style>
