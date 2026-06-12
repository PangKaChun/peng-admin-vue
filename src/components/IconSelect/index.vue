<!-- @author zhengjie -->
<template>
  <div class="icon-body">
    <el-input v-model="name" style="position: relative;margin-bottom: 5px;" clearable placeholder="请输入图标名称" @clear="filterIcons" @input.native="filterIcons">
      <i slot="suffix" class="el-icon-search el-input__icon" />
    </el-input>
    <el-tabs v-model="activeTab">
      <el-tab-pane label="默认图标" name="svg">
        <div class="icon-list">
          <div v-for="(item, index) in iconList" :key="index" @click="selectedIcon(item)">
            <svg-icon :icon-class="item" style="height: 30px;width: 16px;" />
            <span :title="item">{{ item }}</span>
          </div>
        </div>
      </el-tab-pane>
      <el-tab-pane label="Fluent 图标" name="fluent">
        <div class="fluent-icon-list">
          <div
            v-for="(item, index) in fluentIconList"
            :key="index"
            class="fluent-icon-item"
            :title="item"
            @click="selectedFluentIcon(item)"
          >
            <fluent-icon :name="item" />
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script>
import icons from './requireIcons'
import fluentIconMap from '@/components/FluentIcon/icons'

const fluentIcons = Object.keys(fluentIconMap)

export default {
  name: 'IconSelect',
  data() {
    return {
      name: '',
      activeTab: 'svg',
      iconList: icons,
      fluentIconList: fluentIcons
    }
  },
  methods: {
    filterIcons() {
      this.iconList = icons
      this.fluentIconList = fluentIcons
      if (this.name) {
        this.iconList = this.iconList.filter(item => item.includes(this.name))
        this.fluentIconList = this.fluentIconList.filter(item => item.includes(this.name))
      }
    },
    selectedIcon(name) {
      this.$emit('selected', name)
      document.body.click()
    },
    selectedFluentIcon(name) {
      this.$emit('selected', `fluent:${name}`)
      document.body.click()
    },
    reset() {
      this.name = ''
      this.iconList = icons
      this.fluentIconList = fluentIcons
    }
  }
}
</script>

<style rel="stylesheet/scss" lang="scss" scoped>
  @import '../../assets/styles/tokens.scss';

  .icon-body {
    width: 100%;
    padding: 10px;
    .icon-list {
      height: 200px;
      overflow-y: scroll;
      div {
        height: 30px;
        line-height: 30px;
        margin-bottom: -5px;
        cursor: pointer;
        width: 33%;
        float: left;
      }
      span {
        display: inline-block;
        vertical-align: -0.15em;
        fill: currentColor;
        overflow: hidden;
      }
    }
    // Fluent 图标键名较长，不展示文字，正方形网格排列，悬停 title 显示键名
    .fluent-icon-list {
      height: 200px;
      overflow-y: auto;
      display: flex;
      flex-wrap: wrap;
      align-content: flex-start;
      .fluent-icon-item {
        width: 36px;
        height: 36px;
        margin: 0 8px 8px 0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        color: $label-secondary;
        border: 1px solid $separator;
        border-radius: $radius-xs;
        cursor: pointer;
        transition: color .2s, border-color .2s, background-color .2s;
        &:hover {
          color: $color-primary;
          border-color: $color-primary;
          background-color: $fill-quaternary;
        }
      }
    }
  }
</style>
