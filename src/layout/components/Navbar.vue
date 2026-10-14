<template>
  <div class="navbar">
    <hamburger id="hamburger-container" :is-active="sidebar.opened" class="hamburger-container" @toggleClick="toggleSideBar" />

    <div class="right-menu">
      <template v-if="device!=='mobile'">
        <screenfull class="right-menu-item" />
        <notify class="right-menu-item" />
      </template>
      <el-dropdown class="avatar-container right-menu-item" trigger="click">
        <div class="avatar-wrapper">
          <img :src="avatar" class="user-avatar" />
          <span class="username">{{name}}</span>
          <i class="el-icon-caret-bottom" />
        </div>
        <el-dropdown-menu slot="dropdown">
          <router-link to="/user/profile">
            <el-dropdown-item>个人中心</el-dropdown-item>
          </router-link>
          <el-dropdown-item divided @click.native="logout">
            <span>退出登录</span>
          </el-dropdown-item>
        </el-dropdown-menu>
      </el-dropdown>
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import Hamburger from '@/components/Hamburger'
import Screenfull from '@/components/Screenfull'
import Notify from '@/components/Notify'

export default {
  components: {
    Hamburger,
    Screenfull,
    Notify
  },
  computed: {
    ...mapGetters(['sidebar', 'avatar', 'device', 'name'])
  },
  methods: {
    toggleSideBar() {
      this.$store.dispatch('app/toggleSideBar')
    },
    async logout() {
      this.$confirm('确定注销并退出系统吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
        .then(() => {
          this.$store.dispatch('user/LogOut').then(() => {
            location.href = '/index'
          })
        })
        .catch(() => {})
    }
  }
}
</script>

<style lang="scss" scoped>
@import '@/assets/styles/tokens.scss';

.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 50px;
  padding: 0 $space-2;
  overflow: hidden;
  position: relative;

  // 工具栏按钮:32px 高的圆角悬停块,与侧栏菜单项、页签的胶囊风格一致
  .hamburger-container,
  .right-menu-item {
    display: flex;
    align-items: center;
    height: 32px;
    padding: 0 $space-2;
    border-radius: $radius-sm;
    color: rgb(6, 30, 89);
    cursor: pointer;
    transition:
      background-color 0.15s ease,
      transform 0.16s $ease-out;
    -webkit-tap-highlight-color: transparent;

    &:hover {
      background-color: $fill-hover;
    }

    &:active {
      transform: scale(0.97);
    }

    @media (prefers-reduced-motion: reduce) {
      &:active {
        transform: none;
      }
    }
  }

  .right-menu {
    display: flex;
    align-items: center;
    gap: $space-1;
    height: 100%;
  }

  .avatar-wrapper {
    display: flex;
    align-items: center;

    .user-avatar {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      object-fit: cover;
      box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.06); // 白底头像与白色顶栏之间的细描边
    }

    .username {
      margin-left: $space-2;
    }

    .el-icon-caret-bottom {
      margin-left: $space-1;
      font-size: 12px;
      color: $label-secondary;
    }
  }
}
</style>
