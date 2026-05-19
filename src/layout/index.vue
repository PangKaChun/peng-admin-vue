<template>
  <el-container :class="classObj" class="app-wrapper" :style="{ '--current-color': theme }">
    <div v-if="device === 'mobile' && sidebar.opened" class="drawer-bg" @click="handleClickOutside" />
    <sidebar v-if="!sidebar.hide" class="sidebar-container" :style="`width:${sidebar.opened?resize:54}px !important`" />
    <div v-show="device !== 'mobile'" class="resize"></div>
    <el-container class="main-container">
      <el-header>
        <navbar />
      </el-header>
      <el-main>
        <tags-view />
        <app-main />
      </el-main>
      <!-- <el-footer>版权所有：福建榕基软件股份有限公司深圳分公司 2023 Rongji Software Corporation ShenZhen</el-footer> -->
    </el-container>
  </el-container>
</template>

<script>
import { AppMain, Navbar, Sidebar, TagsView } from './components'
import ResizeMixin from './mixin/ResizeHandler'
import watermarkOption from '@/utils/waterMark.js'
import { mapState } from 'vuex'
export default {
  name: 'Layout',
  components: {
    AppMain,
    Navbar,
    Sidebar,
    TagsView
  },
  mixins: [ResizeMixin],
  data() {
    return {
      resize: 205
    }
  },
  computed: {
    ...mapState({
      theme: state => state.settings.theme,
      sideTheme: state => state.settings.sideTheme,
      sidebar: state => state.app.sidebar,
      device: state => state.app.device,
      username: state => state.user.name
    }),
    classObj() {
      return {
        hideSidebar: !this.sidebar.opened,
        openSidebar: this.sidebar.opened,
        withoutAnimation: this.sidebar.withoutAnimation,
        mobile: this.device === 'mobile'
      }
    }
  },
  mounted() {
    watermarkOption.set(this.username, this.parseTime(new Date(), '{y}-{m}-{d} {h}:{i}:{s}'))
    this.dragControllerDiv()
  },
  methods: {
    handleClickOutside() {
      this.$store.dispatch('app/closeSideBar', { withoutAnimation: false })
    },
    dragControllerDiv() {
      var resize = document.getElementsByClassName('resize')
      var left = document.getElementsByClassName('sidebar-container')
      // var mid = document.getElementsByClassName('main-container')
      var box = document.getElementsByClassName('app-wrapper')
      let that = this
      // 鼠标按下事件
      resize[0].onmousedown = function (e) {
        //颜色改变提醒
        resize[0].style.background = '#0069CC'
        var startX = e.clientX
        resize[0].left = resize[0].offsetLeft
        // 鼠标拖动事件
        document.onmousemove = function (e) {
          var endX = e.clientX
          var moveLen = resize[0].left + (endX - startX) // （endx-startx）=移动的距离。resize[0].left+移动的距离=左边区域最后的宽度
          var maxT = box[0].clientWidth - resize[0].offsetWidth // 容器宽度 - 左边区域的宽度 = 右边区域的宽度

          if (moveLen < 200) moveLen = 200 // 左边区域的最小宽度为200px
          if (moveLen > maxT - 1000) moveLen = maxT - 1000 //右边区域最小宽度为1000px
          left[0].style.width = moveLen + 'px !important'
          that.resize = moveLen
        }
        // 鼠标松开事件
        document.onmouseup = function (evt) {
          //颜色恢复
          resize[0].style.background = '#fff'
          document.onmousemove = null
          document.onmouseup = null
          resize[0].releaseCapture && resize[0].releaseCapture() //当你不在需要继续获得鼠标消息就要应该调用ReleaseCapture()释放掉
        }
        resize[0].setCapture && resize[0].setCapture() //该函数在属于当前线程的指定窗口里设置鼠标捕获
        return false
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.el-container {
  height: 100%;
}

.el-header {
  height: 50px !important;
  background-color: #fff;
  padding: 0;
  border-bottom: 1px solid rgb(220,231,242);
}

.el-aside {
  background-color: #0d1117;
  width: 205px !important;
  overflow-x: hidden;
}

.el-main {
  padding: 0;
  position: relative;
}

.el-footer {
  height: 33px !important;

  background: none repeat scroll 0 0 #fff;
  border-top: 1px solid #e7eaec;
  overflow: hidden;
  padding: 10px 6px 0 6px;
  height: 33px;
  font-size: 0.7rem !important;
  color: #7a8b9a;
  letter-spacing: 0.8px;
}

.drawer-bg {
  background: #000;
  opacity: 0.3;
  width: 100%;
  top: 0;
  height: 100%;
  position: absolute;
  z-index: 999;
}

/*拖拽区div样式*/
.resize {
  cursor: e-resize;
  float: left;
  position: relative;
  // top: 45%;
  background-color: #fff;
  width: 6px;
  height: 100%;
  background-size: cover;
  background-position: center;
  /*z-index: 99999;*/
  font-size: 32px;
  color: white;
}
</style>
