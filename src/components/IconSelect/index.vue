<template>
  <div class="icon-body">
    <el-input v-model="name" clearable placeholder="搜索图标" class="icon-search" @clear="filterIcons" @input="filterIcons">
      <i slot="suffix" class="el-icon-search el-input__icon" />
    </el-input>
    <el-tabs v-model="activeTab" @tab-click="onTabClick">
      <el-tab-pane label="默认图标" name="svg">
        <div v-if="iconList.length" class="icon-list">
          <div v-for="item in iconList" :key="item" @click="selectedIcon(item)">
            <svg-icon :icon-class="item" class="icon-list__glyph" />
            <span :title="item">{{ item }}</span>
          </div>
        </div>
        <div v-else class="icon-empty">无匹配图标</div>
      </el-tab-pane>
      <el-tab-pane label="Fluent 图标" name="fluent">
        <div v-loading="fluentLoading" class="fluent-icon-scroll" @scroll="onFluentScroll">
          <div v-if="visibleFluentIcons.length" class="fluent-icon-list">
            <div
              v-for="item in visibleFluentIcons"
              :key="item"
              class="fluent-icon-item"
              :title="item"
              @click="selectedFluentIcon(item)"
            >
              <fluent-icon :name="item" />
            </div>
          </div>
          <div v-else-if="!fluentLoading" class="icon-empty">无匹配图标</div>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script>
import icons from './requireIcons'

const FLUENT_BATCH_SIZE = 120

export default {
  name: 'IconSelect',
  data() {
    return {
      name: '',
      activeTab: 'svg',
      iconList: icons,
      allFluentIcons: [],
      fluentIconList: [],
      fluentLimit: FLUENT_BATCH_SIZE,
      fluentLoading: false
    }
  },
  computed: {
    visibleFluentIcons() {
      return this.fluentIconList.slice(0, this.fluentLimit)
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
    onFluentScroll(e) {
      const el = e.target
      if (this.fluentLimit < this.fluentIconList.length && el.scrollTop + el.clientHeight >= el.scrollHeight - 40) {
        this.fluentLimit += FLUENT_BATCH_SIZE
      }
    },
    filterIcons() {
      const q = this.name.trim()
      this.iconList = q ? icons.filter(item => item.includes(q)) : icons
      this.fluentIconList = q ? this.allFluentIcons.filter(item => item.includes(q)) : this.allFluentIcons
      this.fluentLimit = FLUENT_BATCH_SIZE
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
@import '@/assets/styles/tokens.scss';

.icon-body {
  width: 100%;
  padding: $space-2;

  .icon-search {
    margin-bottom: $space-2;
  }

  .icon-empty {
    height: 200px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    color: $label-tertiary;
  }

  .icon-list {
    height: 200px;
    overflow-y: auto;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    align-content: flex-start;
    gap: 4px;

    &__glyph {
      flex: none;
      width: 16px;
      height: 16px;
    }

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

  .fluent-icon-scroll {
    height: 200px;
    overflow-y: auto;
  }

  .fluent-icon-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(36px, 1fr));
    gap: 6px;

    .fluent-icon-item {
      height: 36px;
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
