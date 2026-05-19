<template>
  <div class="top-right-btn" :style="style">
    <el-row>
      <el-tooltip class="item" effect="dark" :content="showSearch ? '隐藏搜索' : '显示搜索'" placement="top" v-if="search">
        <el-button size="mini" circle icon="el-icon-search" @click="toggleSearch()" />
      </el-tooltip>
      <el-tooltip class="item" effect="dark" content="刷新" placement="top">
        <el-button size="mini" circle icon="el-icon-refresh" @click="refresh()" />
      </el-tooltip>
      <el-popover :title="title" placement="bottom" width="150" trigger="manual" v-model="open">
        <el-checkbox v-model="ColumnsSelected" :indeterminate="allSelected" @change="handleCheckAllChange">
          全选
        </el-checkbox>
        <el-checkbox v-for="item in columns" :key="item.property" v-model="item.visible"
          @change="handleCheckedcolumnsChange(item)">
          {{ item.label }}
        </el-checkbox>
        <el-tooltip slot="reference" class="item" effect="dark" content="显隐列" placement="top" v-if="columns">
          <el-button size="mini" circle icon="el-icon-menu" @click="showColumn()" style="margin-left: 10px" />
        </el-tooltip>
      </el-popover>
    </el-row>
  </div>
</template>

<script>
export default {
  name: "RightTool",
  data() {
    return {
      // 显隐数据
      value: [],
      // 弹出层标题
      title: "显示/隐藏",
      // 是否显示弹出层
      open: false,
      // 默认选
      ColumnsSelected: true,
      // 全选
      allSelected: false,
      // 防止表格变动
      TableColumnsChange: false,
    };
  },
  props: {
    showSearch: {
      type: Boolean,
      default: true,
    },
    columns: {
      type: Array,
    },
    search: {
      type: Boolean,
      default: true,
    },
    gutter: {
      type: Number,
      default: 10,
    },
  },
  computed: {
    style() {
      const ret = {};
      if (this.gutter) {
        ret.marginRight = `${this.gutter / 2}px`;
      }
      return ret;
    },
  },
  created() {
    // 显隐列初始默认隐藏列
    for (let item in this.columns) {
      if (this.columns[item].visible === false) {
        this.value.push(parseInt(item));
      }
    }
  },
  methods: {
    // 搜索
    toggleSearch() {
      this.$emit("update:showSearch", !this.showSearch);
    },
    // 刷新
    refresh() {
      this.$emit("queryTable");
    },
    // 右侧列表元素变化
    dataChange(data) {
      for (let item in this.columns) {
        const key = this.columns[item].key;
        this.columns[item].visible = !data.includes(key);
      }
    },
    // 打开显隐列dialog
    showColumn() {
      this.open = !this.open;
    },

    // 更新列表
    updatecolumns() {
      let cols = null;
      const columnFilter = (e) =>
        e &&
        e.type === "default" &&
        e.property &&
        this.ignoreColumns.indexOf(e.property) === -1;
      const refCols = table.columns.filter(columnFilter);
      if (this.TableColumnsChange) {
        this.TableColumnsChange = false;
        return;
      }
      this.TableColumnsChange = false;
      const columns = [];
      const fullcolumns = table.$children
        .map((e) => e.columnConfig)
        .filter(columnFilter);
      cols = sortWithRef(fullcolumns, refCols);
      cols.forEach((config) => {
        const column = {
          property: config.property,
          label: config.label,
          visible: refCols.indexOf(config) !== -1,
        };
        columns.push(column);
      });
      this.columns = columns;
    },

    // 全选按钮
    handleCheckAllChange(val) {
      if (val === false) {
        this.ColumnsSelected = true;
        return;
      }
      this.columns.forEach((column) => {
        if (!column.visible) {
          column.visible = true;
        }
      });
      this.ColumnsSelected = val;
      this.allSelected = false;
    },

    // 单选
    handleCheckedcolumnsChange(item) {
      let totalCount = 0;
      let selectedCount = 0;
      this.columns.forEach((column) => {
        ++totalCount;
        selectedCount += column.visible ? 1 : 0;
      });
      if (selectedCount === 0) {
        this.$modal.notify("请至少选择一列");
        this.$nextTick(function () {
          item.visible = true;
        });
        return;
      }
      this.ColumnsSelected = selectedCount === totalCount;
      this.allSelected = selectedCount !== totalCount && selectedCount !== 0;
    },
  },
};
</script>

<style lang="scss" scoped>
.top-right-btn {
  float: right;
}
</style>
