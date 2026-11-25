<template>
  <div class="icon-body">
    <el-input v-model="name" clearable placeholder="搜索图标" style="margin-bottom: 8px;" @clear="filterIcons" @input="filterIcons">
      <i slot="suffix" class="el-icon-search el-input__icon" />
    </el-input>
    <el-tabs v-model="activeTab" @tab-click="onTabClick">
      <el-tab-pane label="默认图标" name="svg">
        <div class="icon-list">
          <div v-for="(item, index) in iconList" :key="index" @click="selectedIcon(item)">
            <svg-icon :icon-class="item" style="height: 30px;width: 16px;" />
            <span :title="item">{{ item }}</span>
          </div>
        </div>
      </el-tab-pane>
      <el-tab-pane label="Fluent 图标" name="fluent">
        <div v-loading="fluentLoading" class="fluent-icon-list">
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

export default {
  name: 'IconSelect',
  data() {
    return {
      name: '',
      activeTab: 'svg',
      iconList: icons,
      allFluentIcons: [],
      fluentIconList: [],
      fluentLoading: false
    }
  },
  methods: {
    onTabClick(tab) {
      if (tab.name === 'fluent' && !this.allFluentIcons.length && !this.fluentLoading) {
        this.fluentLoading = true
        import(/* webpackChunkName: "fluent-icons" */ '@/components/FluentIcon/icons')
          .then(mod => {
            this.allFluentIcons = Object.keys(mod.default || mod)
            this.filterIcons()
          })
          .catch(() => {
            this.$modal && this.$modal.msgError('图标加载失败')
          })
          .finally(() => {
            this.fluentLoading = false
          })
      }
    },
    filterIcons() {
      const q = this.name
      this.iconList = q ? icons.filter(item => item.includes(q)) : icons
      this.fluentIconList = q ? this.allFluentIcons.filter(item => item.includes(q)) : this.allFluentIcons
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
      this.filterIcons()
    }
  }
}
</script>

<style lang="scss" scoped>
@import '../../assets/styles/tokens.scss';

.icon-body {
  width: 100%;
  padding: $space-2;

  .icon-list {
    height: 200px;
    overflow-y: auto;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    align-content: flex-start;
    gap: 4px;

    div {
      display: flex;
      align-items: center;
      gap: 6px;
      height: 30px;
      padding: 0 6px;
      border-radius: $radius-xs;
      cursor: pointer;
      min-width: 0;
      transition: background-color $duration-fast ease;

      &:hover {
        background-color: $fill-hover;
      }
    }

    span {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 12px;
      color: $label;
    }
  }

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
      transition: color $duration-fast, border-color $duration-fast, background-color $duration-fast;

      &:hover {
        color: $color-primary;
        border-color: $color-primary;
        background-color: $fill-quaternary;
      }
    }
  }
}
</style>
