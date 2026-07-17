<template>
  <el-aside class="has-logo" width="205px">
    <logo :collapse="isCollapse" />
    <el-scrollbar :class="settings.sideTheme" wrap-class="scrollbar-wrapper">
        <el-menu
            :default-active="activeMenu"
            :collapse="isCollapse"
            :background-color="settings.sideTheme === 'theme-dark' ? variables.menuBackground : variables.menuLightBackground"
            :text-color="settings.sideTheme === 'theme-dark' ? variables.menuColor : variables.menuLightColor"
            :unique-opened="true"
            :active-text-color="variables.menuAccent"
            :collapse-transition="false"
            mode="vertical"
        >
            <sidebar-item
                v-for="(route, index) in sidebarRouters"
                :key="route.path  + index"
                :item="route"
                :base-path="route.path"
            />
        </el-menu>
    </el-scrollbar>
  </el-aside>
</template>

<script>
import { mapGetters, mapState } from "vuex";
import Logo from "./Logo";
import SidebarItem from "./SidebarItem";
import variables from "@/assets/styles/variables.scss";

export default {
  components: { SidebarItem, Logo },
  computed: {
    ...mapState(["settings"]),
    ...mapGetters(["sidebarRouters", "sidebar"]),
    activeMenu() {
      const route = this.$route;
      const { meta, path } = route;
      // if set path, the sidebar will highlight the path you set
      if (meta.activeMenu) {
        return meta.activeMenu;
      }
      return path;
    },
    isCollapse() {
      return !this.sidebar.opened;
    },
    variables() {
      return variables;
    },
  },
};
</script>