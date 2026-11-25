<template>
  <div class="navbar">
    <hamburger
      id="hamburger-container"
      :is-active="sidebar.opened"
      class="navbar-btn"
      @toggleClick="toggleSideBar"
    />

    <tags-view class="navbar-tabs" />

    <div class="right-menu">
      <screenfull v-if="device !== 'mobile'" class="navbar-btn" />
      <el-dropdown class="avatar-container navbar-btn" trigger="click">
        <div class="avatar-wrapper">
          <img :src="avatar" alt="" class="user-avatar" />
          <span class="username">{{ name }}</span>
          <i class="el-icon-arrow-down" />
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
import TagsView from './TagsView'

export default {
  components: {
    Hamburger,
    Screenfull,
    TagsView
  },
  computed: {
    ...mapGetters(['sidebar', 'avatar', 'device', 'name'])
  },
  methods: {
    toggleSideBar() {
      this.$store.dispatch('app/toggleSideBar')
    },
    logout() {
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
  gap: $space-2;
  height: $topbar-height;
  padding: 0 $space-2;
  background: $bg-base;
  position: relative;

  .navbar-btn {
    flex: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 28px;
    padding: 0 $space-2;
    border-radius: $radius-sm;
    color: $label-secondary;
    cursor: pointer;
    transition:
      background-color $duration-fast ease,
      color $duration-fast ease,
      transform 0.16s $ease-out;
    -webkit-tap-highlight-color: transparent;

    &:hover {
      background-color: $fill-hover;
      color: $label;
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

  .navbar-tabs {
    flex: 1;
    min-width: 0;
  }

  .right-menu {
    flex: none;
    display: flex;
    align-items: center;
    gap: $space-1;
  }

  .avatar-wrapper {
    display: flex;
    align-items: center;
    font-size: 13px;
    color: $label;

    .user-avatar {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      object-fit: cover;
      box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.06);
    }

    .username {
      margin-left: $space-2;
      font-weight: 500;
      max-width: 120px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;

      @media (max-width: 640px) {
        display: none;
      }
    }

    .el-icon-arrow-down {
      margin-left: $space-1;
      font-size: 11px;
      color: $label-secondary;
    }
  }
}
</style>
