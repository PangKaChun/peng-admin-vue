<!--
  选择用户弹窗组件（支持单选 / 多选）

  用法：
    <user-select
      :visible.sync="userSelectVisible"
      :multiple="true"
      :selected.sync="selectedUserIds"
      @confirm="handleUserConfirm"
    />

  Props：
    visible   {Boolean}  .sync 控制显隐
    multiple  {Boolean}  是否多选（默认 false 单选）
    selected  {Array}    回显用的 userId 数组（重新打开时勾选），支持 .sync
    title     {String}   弹窗标题（默认「选择用户」）
    width     {String}   弹窗宽度（默认 960px）

  事件：
    confirm   多选 -> (rows: 用户对象数组, ids: userId 数组)
              单选 -> (row:  单个用户对象,   id:  userId)
    update:selected  确定时回传选中的 userId 数组（配合 :selected.sync）
-->
<template>
  <el-dialog
    custom-class="user-select-dialog"
    :title="title"
    :visible.sync="dialogVisible"
    :width="width"
    top="10vh"
    append-to-body
    @open="onOpen"
  >
    <div class="user-select">
      <!-- 左侧部门树 -->
      <div class="us-tree">
        <el-input v-model="deptName" size="small" placeholder="输入部门名称搜索" clearable>
          <i slot="prefix" class="el-input__icon el-icon-search"></i>
        </el-input>
        <el-scrollbar class="us-tree-scroll">
          <el-tree
            ref="tree"
            :data="depts"
            :props="defaultProps"
            :expand-on-click-node="false"
            :filter-node-method="filterNode"
            default-expand-all
            highlight-current
            node-key="id"
            @node-click="handleNodeClick"
          />
        </el-scrollbar>
      </div>

      <!-- 右侧内容 -->
      <div class="us-content">
        <!-- 搜索 -->
        <el-form inline size="small" class="us-query" @submit.native.prevent>
          <el-form-item>
            <el-input v-model="queryParams.username" placeholder="登录名" clearable style="width: 150px" @keyup.enter.native="handleQuery" />
          </el-form-item>
          <el-form-item>
            <el-input v-model="queryParams.nickName" placeholder="用户昵称" clearable style="width: 150px" @keyup.enter.native="handleQuery" />
          </el-form-item>
          <el-form-item>
            <el-input v-model="queryParams.phonenumber" placeholder="手机号码" clearable style="width: 150px" @keyup.enter.native="handleQuery" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" icon="el-icon-search" @click="handleQuery">搜索</el-button>
            <el-button icon="el-icon-refresh" @click="resetQuery">重置</el-button>
          </el-form-item>
        </el-form>

        <!-- 用户表格 -->
        <div class="us-table-wrap">
          <el-table
            ref="table"
            :key="renderKey"
            v-loading="loading"
            :data="userList"
            border
            size="small"
            highlight-current-row
            height="100%"
            row-key="userId"
            @row-click="handleRowClick"
            @selection-change="handleSelectionChange"
          >
            <el-table-column v-if="multiple" type="selection" reserve-selection width="45" align="center" />
            <el-table-column v-else label="选择" width="55" align="center">
              <template slot-scope="scope">
                <el-radio v-model="singleSelectedId" :label="scope.row.userId" class="us-radio" />
              </template>
            </el-table-column>
            <el-table-column label="登录名" prop="username" align="center" show-overflow-tooltip />
            <el-table-column label="用户昵称" prop="nickName" align="center" show-overflow-tooltip />
            <el-table-column label="部门" prop="deptName" align="center" show-overflow-tooltip />
            <el-table-column label="手机号码" prop="phonenumber" align="center" width="120" />
            <el-table-column label="状态" align="center" width="80">
              <template slot-scope="scope">
                <dict-tag :options="dict.type.user_status" :value="scope.row.status" />
              </template>
            </el-table-column>
            <template slot="empty">
              <el-empty :image-size="80" description="暂无用户数据" />
            </template>
          </el-table>
        </div>

        <pagination
          v-show="total > 0"
          class="us-pagination"
          :total="total"
          :page.sync="queryParams.pageNum"
          :limit.sync="queryParams.pageSize"
          @pagination="getList"
        />
      </div>
    </div>

    <div slot="footer" class="dialog-footer">
      <span v-if="multiple" class="us-count">已选 {{ multipleSelection.length }} 项</span>
      <el-button @click="dialogVisible = false">取 消</el-button>
      <el-button type="primary" @click="handleConfirm">确 定</el-button>
    </div>
  </el-dialog>
</template>

<script>
import { listUser } from '@/api/sys/user'
import { treeselect } from '@/api/sys/dept'

export default {
  name: 'UserSelect',
  dicts: ['user_status'],
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
    title: {
      type: String,
      default: '选择用户'
    },
    width: {
      type: String,
      default: '960px'
    }
  },
  data() {
    return {
      loading: false,
      userList: [],
      total: 0,
      queryParams: {
        pageNum: 1,
        pageSize: 10,
        username: undefined,
        nickName: undefined,
        phonenumber: undefined,
        deptId: undefined
      },
      // 部门树
      depts: [],
      deptName: undefined,
      defaultProps: {
        children: 'children',
        label: 'label'
      },
      multipleSelection: [],
      singleSelectedId: null,
      singleSelected: null,
      echoIds: [],
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
      this.queryParams.pageNum = 1
      this.queryParams.username = undefined
      this.queryParams.nickName = undefined
      this.queryParams.phonenumber = undefined
      this.queryParams.deptId = undefined
      this.deptName = undefined
      this.multipleSelection = []
      this.singleSelected = null
      this.echoIds = Array.isArray(this.selected) ? this.selected.map(id => String(id)) : []
      this.singleSelectedId = this.multiple ? null : (this.echoIds.length ? this.echoIds[0] : null)
      if (this.$refs.table) {
        this.$refs.table.clearSelection()
      }
      this.$nextTick(() => {
        if (this.$refs.tree) this.$refs.tree.setCurrentKey(null)
      })
      this.getTreeselect()
      this.getList()
    },
    /** 查询部门下拉树结构 */
    getTreeselect() {
      treeselect().then(res => {
        this.depts = res
      })
    },
    // 筛选部门节点
    filterNode(value, data) {
      if (!value) return true
      return data.label.indexOf(value) !== -1
    },
    // 部门节点单击事件
    handleNodeClick(data) {
      this.queryParams.deptId = data.id
      this.handleQuery()
    },
    /** 查询用户列表 */
    getList() {
      this.loading = true
      listUser(this.queryParams)
        .then(res => {
          this.userList = res.records || []
          this.total = res.total || 0
          this.loading = false
          this.$nextTick(() => this.applyEcho())
        })
        .catch(() => {
          this.loading = false
        })
    },
    // 逐页回显勾选
    applyEcho() {
      if (this.multiple) {
        if (!this.echoIds.length || !this.$refs.table) return
        this.userList.forEach(row => {
          const i = this.echoIds.indexOf(String(row.userId))
          if (i > -1) {
            this.$refs.table.toggleRowSelection(row, true)
            this.echoIds.splice(i, 1)
          }
        })
      } else if (this.singleSelectedId != null && !this.singleSelected) {
        const row = this.userList.find(u => String(u.userId) === String(this.singleSelectedId))
        if (row) this.singleSelected = row
      }
    },
    /** 搜索 */
    handleQuery() {
      this.queryParams.pageNum = 1
      this.getList()
    },
    /** 重置 */
    resetQuery() {
      this.queryParams.username = undefined
      this.queryParams.nickName = undefined
      this.queryParams.phonenumber = undefined
      this.queryParams.deptId = undefined
      this.deptName = undefined
      if (this.$refs.tree) this.$refs.tree.setCurrentKey(null)
      this.handleQuery()
    },
    handleSelectionChange(selection) {
      this.multipleSelection = selection
    },
    handleRowClick(row, column) {
      if (this.multiple) {
        // 点击复选框列时由其自身处理,避免二次切换
        if (column && column.type === 'selection') return
        this.$refs.table.toggleRowSelection(row)
      } else {
        this.singleSelectedId = String(row.userId)
        this.singleSelected = row
      }
    },
    /** 确定 */
    handleConfirm() {
      if (this.multiple) {
        const rows = this.multipleSelection
        if (!rows.length) {
          this.$modal.msgWarning('请至少选择一个用户')
          return
        }
        const ids = rows.map(r => r.userId)
        this.$emit('update:selected', ids)
        this.$emit('confirm', rows, ids)
      } else {
        if (!this.singleSelected) {
          this.$modal.msgWarning('请选择一个用户')
          return
        }
        const id = this.singleSelected.userId
        this.$emit('update:selected', [id])
        this.$emit('confirm', this.singleSelected, id)
      }
      this.dialogVisible = false
    }
  }
}
</script>

<!-- 全局样式：固定弹窗高度为视口的 80%，弹窗本体移至 body 下，scoped 无法命中 .el-dialog -->
<style lang="scss">
.user-select-dialog {
  display: flex;
  flex-direction: column;
  height: 80vh;
  max-height: 80vh;

  .el-dialog__body {
    flex: 1;
    min-height: 0;
    overflow: hidden;
    padding: 16px 20px;
  }
}
</style>

<style lang="scss" scoped>
.user-select {
  display: flex;
  align-items: stretch;
  height: 100%;

  .us-tree {
    width: 200px;
    flex-shrink: 0;
    margin-right: 12px;
    padding-right: 12px;
    border-right: 1px solid #ebeef5;
    display: flex;
    flex-direction: column;
    min-height: 0;

    .us-tree-scroll {
      flex: 1;
      min-height: 0;
      margin-top: 8px;

      ::v-deep .el-scrollbar__wrap {
        overflow-x: hidden;
      }
    }
  }

  .us-content {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    min-height: 0;

    .us-query {
      flex-shrink: 0;
      margin-bottom: 8px;
    }

    .us-table-wrap {
      flex: 1;
      min-height: 0;
    }

    .us-pagination {
      flex-shrink: 0;
    }
  }

  .us-radio {
    margin-right: 0;

    ::v-deep .el-radio__label {
      display: none;
    }
  }

  ::v-deep .el-table {
    cursor: pointer;
  }
}

.dialog-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;

  .us-count {
    margin-right: auto;
    color: #6e6e73;
    font-size: 13px;
  }
}
</style>
