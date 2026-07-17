<template>
  <div class="navbar">
    <hamburger id="hamburger-container" :is-active="sidebar.opened" class="hamburger-container" @toggleClick="toggleSideBar" />

    <div class="right-menu">
      <template v-if="device!=='mobile'">
        <screenfull class="right-menu-item hover-effect" />
        <notify class="notify-wrapper hover-effect" />
      </template>
      <el-dropdown class="avatar-container right-menu-item hover-effect" trigger="click">
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
.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 50px;
  overflow: hidden;
  position: relative;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);

  .hamburger-container {
    line-height: 46px;
    height: 100%;
    cursor: pointer;
    transition: background-color 0.15s ease;
    -webkit-tap-highlight-color: transparent;

    &:hover {
      background: rgba(0, 0, 0, 0.065);
    }
  }

  .right-menu {
    display: flex;
    align-items: center;
    height: 100%;
    .right-menu-item {
      height: 100%;
      padding: 0 12px;
      line-height: 50px;
      color: rgb(6,30,89);

      &.hover-effect {
        cursor: pointer;
        transition: background-color 0.15s ease;

        &:hover {
          background: rgba(0, 0, 0, 0.065);
        }
      }
    }

    .notify-wrapper {
      height: 100%;
      color: #fff;
      display: flex;
      align-items: center;
      padding: 0 12px;

      &.hover-effect {
        cursor: pointer;
        transition: background-color 0.15s ease;

        &:hover {
          background: rgba(0, 0, 0, 0.065);
        }
      }
    }

    .avatar-container {
      .avatar-wrapper {
        height: 100%;
        display: flex;
        align-items: center;
        .user-avatar {
          cursor: pointer;
          width: 28px;
          height: 28px;
          border-radius: 10px;
        }

        .username {
          padding-left: 6px;
        }

        .el-icon-caret-bottom {
          padding-left: 6px;
          cursor: pointer;
          font-size: 12px;
        }
      }
    }
  }
}
</style>
