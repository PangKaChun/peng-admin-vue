<template>
  <el-aside class="has-logo" width="">
    <logo :collapse="isCollapse" />
    <el-scrollbar wrap-class="scrollbar-wrapper">
      <el-menu
        :default-active="activeMenu"
        :collapse="isCollapse"
        :unique-opened="true"
        :collapse-transition="false"
        mode="vertical"
      >
        <sidebar-item
          v-for="(route, index) in sidebarRouters"
          :key="route.path + index"
          :item="route"
          :base-path="route.path"
        />
      </el-menu>
    </el-scrollbar>
  </el-aside>
</template>

<script>
import { mapGetters } from 'vuex'
import Logo from './Logo'
import SidebarItem from './SidebarItem'

export default {
  components: { SidebarItem, Logo },
  computed: {
    ...mapGetters(['sidebarRouters', 'sidebar', 'device']),
    activeMenu() {
      const { meta, path } = this.$route
      return meta.activeMenu || path
    },
    isCollapse() {
      return this.device !== 'mobile' && !this.sidebar.opened
    }
  }
}
</script>
