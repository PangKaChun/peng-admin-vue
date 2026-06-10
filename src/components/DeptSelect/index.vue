<!--
  选择部门弹窗组件（树形，支持单选 / 多选）

  用法：
    <dept-select
      :visible.sync="deptSelectVisible"
      :multiple="true"
      :selected.sync="selectedDeptIds"
      @confirm="handleDeptConfirm"
    />

  Props：
    visible       {Boolean}  .sync 控制显隐
    multiple      {Boolean}  是否多选（默认 false 单选，多选时显示复选框）
    selected      {Array}    回显用的 deptId 数组（重新打开时勾选 / 高亮），支持 .sync
    checkStrictly {Boolean}  多选时父子节点是否互不关联（默认 true）
    title         {String}   弹窗标题（默认「选择部门」）
    width         {String}   弹窗宽度（默认 480px）

  事件：
    confirm   多选 -> (nodes: 部门节点数组, ids: deptId 数组)
              单选 -> (node:  单个部门节点,   id:  deptId)
    update:selected  确定时回传选中的 deptId 数组（配合 :selected.sync）

  说明：节点数据来自 /sys/dept/treeselect，结构为 { id, label, children }，
       其中 id 即 deptId、label 即部门名称。
-->
<template>
  <el-dialog
    :title="title"
    :visible.sync="dialogVisible"
    :width="width"
    top="10vh"
    append-to-body
    @open="onOpen"
  >
    <div class="dept-select">
      <el-input v-model="deptName" size="small" placeholder="输入部门名称搜索" clearable>
        <i slot="prefix" class="el-input__icon el-icon-search"></i>
      </el-input>

      <div v-loading="loading" class="ds-tree-scroll">
        <el-tree
          ref="tree"
          :key="renderKey"
          :data="depts"
          :props="defaultProps"
          :filter-node-method="filterNode"
          :show-checkbox="multiple"
          :check-strictly="checkStrictly"
          :expand-on-click-node="false"
          empty-text="暂无部门数据"
          default-expand-all
          highlight-current
          node-key="id"
          @node-click="handleNodeClick"
          @check="handleCheck"
        >
          <span slot-scope="{ node, data }" class="custom-tree-node">
            <i
              class="node-icon"
              :class="data.children && data.children.length ? (node.expanded ? 'el-icon-folder-opened' : 'el-icon-folder') : 'el-icon-document'"
            />
            <span class="node-label">{{ node.label }}</span>
          </span>
        </el-tree>
      </div>
    </div>

    <div slot="footer" class="dialog-footer">
      <span v-if="multiple" class="ds-count">已选 {{ checkedCount }} 项</span>
      <el-button @click="dialogVisible = false">取 消</el-button>
      <el-button type="primary" @click="handleConfirm">确 定</el-button>
    </div>
  </el-dialog>
</template>

<script>
import { treeselect } from '@/api/sys/dept'

export default {
  name: 'DeptSelect',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    multiple: {
      type: Boolean,
      default: false
    },
    selected: {
      type: Array,
      default: () => []
    },
    checkStrictly: {
      type: Boolean,
      default: true
    },
    title: {
      type: String,
      default: '选择部门'
    },
    width: {
      type: String,
      default: '480px'
    }
  },
  data() {
    return {
      loading: false,
      depts: [],
      deptName: undefined,
      defaultProps: {
        children: 'children',
        label: 'label'
      },
      // 单选当前节点
      currentNode: null,
      // 多选已勾选数量
      checkedCount: 0,
      renderKey: 0
    }
  },
  computed: {
    dialogVisible: {
      get() {
        return this.visible
      },
      set(val) {
        this.$emit('update:visible', val)
      }
    }
  },
  watch: {
    // 根据名称筛选部门树
    deptName(val) {
      if (this.$refs.tree) this.$refs.tree.filter(val)
    }
  },
  methods: {
    onOpen() {
      this.renderKey++
      this.deptName = undefined
      this.currentNode = null
      this.checkedCount = 0
      this.getTree()
    },
    /** 查询部门树 */
    getTree() {
      this.loading = true
      treeselect()
        .then(res => {
          this.depts = res || []
          this.loading = false
          this.$nextTick(() => this.applyEcho())
        })
        .catch(() => {
          this.loading = false
        })
    },
    // 回显选中项（兼容 selected 与节点 id 的类型差异）
    applyEcho() {
      if (!this.$refs.tree) return
      const keys = this.resolveKeys(this.selected)
      if (this.multiple) {
        this.$refs.tree.setCheckedKeys(keys)
        this.checkedCount = this.$refs.tree.getCheckedKeys().length
      } else {
        const key = keys.length ? keys[0] : null
        this.$refs.tree.setCurrentKey(key)
        this.currentNode = key != null ? this.$refs.tree.getCurrentNode() : null
      }
    },
    // 将传入的 selected 解析为树中真实存在、且类型匹配的 node-key 列表
    resolveKeys(selected) {
      const wanted = (Array.isArray(selected) ? selected : []).map(String)
      if (!wanted.length) return []
      const all = []
      const collect = nodes => {
        nodes.forEach(n => {
          all.push(n.id)
          if (n.children && n.children.length) collect(n.children)
        })
      }
      collect(this.depts)
      return all.filter(id => wanted.includes(String(id)))
    },
    // 筛选节点
    filterNode(value, data) {
      if (!value) return true
      return data.label.indexOf(value) !== -1
    },
    // 节点单击
    handleNodeClick(data, node) {
      if (this.multiple) {
        // 多选模式下点击节点行等同于切换其勾选状态，提升操作便捷性
        this.$refs.tree.setChecked(data, !node.checked, false)
        this.handleCheck()
        return
      }
      this.currentNode = data
    },
    // 勾选变化
    handleCheck() {
      if (this.$refs.tree) this.checkedCount = this.$refs.tree.getCheckedKeys().length
    },
    /** 确定 */
    handleConfirm() {
      if (this.multiple) {
        const nodes = this.$refs.tree.getCheckedNodes()
        if (!nodes.length) {
          this.$modal.msgWarning('请至少选择一个部门')
          return
        }
        const ids = nodes.map(n => n.id)
        this.$emit('update:selected', ids)
        this.$emit('confirm', nodes, ids)
      } else {
        if (!this.currentNode) {
          this.$modal.msgWarning('请选择一个部门')
          return
        }
        const id = this.currentNode.id
        this.$emit('update:selected', [id])
        this.$emit('confirm', this.currentNode, id)
      }
      this.dialogVisible = false
    }
  }
}
</script>

<style lang="scss" scoped>
.dept-select {
  .ds-tree-scroll {
    margin-top: 8px;
    // 随内容自适应高度，超出后内部滚动，保证弹窗整体不超过屏幕高度的 80%
    max-height: calc(80vh - 230px);
    min-height: 120px;
    overflow: auto;
    border: 1px solid #ebeef5;
    border-radius: 4px;
    padding: 6px 4px;
  }

  .custom-tree-node {
    display: flex;
    align-items: center;
    font-size: 14px;

    .node-icon {
      margin-right: 6px;
      font-size: 14px;
      color: #f5a623;
      flex-shrink: 0;
    }

    .el-icon-document.node-icon {
      color: #909399;
    }
  }
}

.dialog-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;

  .ds-count {
    margin-right: auto;
    color: #6e6e73;
    font-size: 13px;
  }
}
</style>
