<!--
  选择角色弹窗组件（支持单选 / 多选）

  用法：
    <role-select
      :visible.sync="roleSelectVisible"
      :multiple="true"
      :selected.sync="selectedRoleIds"
      @confirm="handleRoleConfirm"
    />

  Props：
    visible   {Boolean}  .sync 控制显隐
    multiple  {Boolean}  是否多选（默认 false 单选）
    selected  {Array}    回显用的 roleId 数组（重新打开时勾选），支持 .sync
    title     {String}   弹窗标题（默认「选择角色」）
    width     {String}   弹窗宽度（默认 720px）

  事件：
    confirm   多选 -> (rows: 角色对象数组, ids: roleId 数组)
              单选 -> (row:  单个角色对象,   id:  roleId)
    update:selected  确定时回传选中的 roleId 数组（配合 :selected.sync）

  说明：行对象包含 roleId / roleName / roleCode / status 等字段，若需要角色标识
       （roleCode）可从 confirm 回传的行对象中读取。
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
    <div class="role-select">
      <!-- 搜索 -->
      <el-form inline size="small" class="rs-query" @submit.native.prevent>
        <el-form-item>
          <el-input v-model="queryParams.roleName" placeholder="角色名称" clearable style="width: 160px" @keyup.enter.native="handleQuery" />
        </el-form-item>
        <el-form-item>
          <el-input v-model="queryParams.roleCode" placeholder="角色标识" clearable style="width: 160px" @keyup.enter.native="handleQuery" />
        </el-form-item>
        <el-form-item>
          <el-select v-model="queryParams.status" placeholder="状态" clearable style="width: 120px">
            <el-option v-for="dict in dict.type.role_status" :key="dict.value" :label="dict.label" :value="dict.value" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="el-icon-search" @click="handleQuery">搜索</el-button>
          <el-button icon="el-icon-refresh" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>

      <!-- 角色表格 -->
      <el-table
        ref="table"
        :key="renderKey"
        v-loading="loading"
        :data="roleList"
        border
        size="small"
        highlight-current-row
        :max-height="tableMaxHeight"
        row-key="roleId"
        @row-click="handleRowClick"
        @selection-change="handleSelectionChange"
      >
        <el-table-column v-if="multiple" type="selection" reserve-selection width="45" align="center" />
        <el-table-column v-else label="选择" width="55" align="center">
          <template slot-scope="scope">
            <el-radio v-model="singleSelectedId" :label="scope.row.roleId" class="rs-radio" />
          </template>
        </el-table-column>
        <el-table-column label="角色名称" prop="roleName" align="center" show-overflow-tooltip />
        <el-table-column label="角色标识" prop="roleCode" align="center" show-overflow-tooltip />
        <el-table-column label="状态" align="center" width="90">
          <template slot-scope="scope">
            <dict-tag :options="dict.type.role_status" :value="scope.row.status" />
          </template>
        </el-table-column>
        <template slot="empty">
          <el-empty :image-size="80" description="暂无角色数据" />
        </template>
      </el-table>

      <pagination
        v-show="total > 0"
        :total="total"
        :page.sync="queryParams.pageNum"
        :limit.sync="queryParams.pageSize"
        @pagination="getList"
      />
    </div>

    <div slot="footer" class="dialog-footer">
      <span v-if="multiple" class="rs-count">已选 {{ multipleSelection.length }} 项</span>
      <el-button @click="dialogVisible = false">取 消</el-button>
      <el-button type="primary" @click="handleConfirm">确 定</el-button>
    </div>
  </el-dialog>
</template>

<script>
import { listRole } from '@/api/sys/role'

export default {
  name: 'RoleSelect',
  dicts: ['role_status'],
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
      default: '选择角色'
    },
    width: {
      type: String,
      default: '720px'
    }
  },
  data() {
    return {
      loading: false,
      roleList: [],
      total: 0,
      queryParams: {
        pageNum: 1,
        pageSize: 10,
        roleName: undefined,
        roleCode: undefined,
        status: undefined
      },
      multipleSelection: [],
      singleSelectedId: null,
      singleSelected: null,
      echoIds: [],
      // 表格高度随视口自适应，保证弹窗整体不超过屏幕高度的 80%
      tableMaxHeight: 360,
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
  mounted() {
    this.updateHeight()
    window.addEventListener('resize', this.updateHeight)
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.updateHeight)
  },
  methods: {
    // 依据视口高度计算表格最大高度（弹窗其余部分约预留 260px）
    updateHeight() {
      const vh = window.innerHeight || document.documentElement.clientHeight || 768
      this.tableMaxHeight = Math.max(180, Math.floor(vh * 0.8) - 260)
    },
    onOpen() {
      this.renderKey++
      this.updateHeight()
      this.queryParams.pageNum = 1
      this.queryParams.roleName = undefined
      this.queryParams.roleCode = undefined
      this.queryParams.status = undefined
      this.multipleSelection = []
      this.singleSelected = null
      this.echoIds = Array.isArray(this.selected) ? this.selected.map(id => String(id)) : []
      this.singleSelectedId = this.multiple ? null : (this.echoIds.length ? this.echoIds[0] : null)
      if (this.$refs.table) {
        this.$refs.table.clearSelection()
      }
      this.getList()
    },
    /** 查询角色列表 */
    getList() {
      this.loading = true
      listRole(this.queryParams)
        .then(res => {
          this.roleList = res.records || []
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
        this.roleList.forEach(row => {
          const i = this.echoIds.indexOf(String(row.roleId))
          if (i > -1) {
            this.$refs.table.toggleRowSelection(row, true)
            this.echoIds.splice(i, 1)
          }
        })
      } else if (this.singleSelectedId != null && !this.singleSelected) {
        const row = this.roleList.find(r => String(r.roleId) === String(this.singleSelectedId))
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
      this.queryParams.roleName = undefined
      this.queryParams.roleCode = undefined
      this.queryParams.status = undefined
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
        this.singleSelectedId = String(row.roleId)
        this.singleSelected = row
      }
    },
    /** 确定 */
    handleConfirm() {
      if (this.multiple) {
        const rows = this.multipleSelection
        if (!rows.length) {
          this.$modal.msgWarning('请至少选择一个角色')
          return
        }
        const ids = rows.map(r => r.roleId)
        this.$emit('update:selected', ids)
        this.$emit('confirm', rows, ids)
      } else {
        if (!this.singleSelected) {
          this.$modal.msgWarning('请选择一个角色')
          return
        }
        const id = this.singleSelected.roleId
        this.$emit('update:selected', [id])
        this.$emit('confirm', this.singleSelected, id)
      }
      this.dialogVisible = false
    }
  }
}
</script>

<style lang="scss" scoped>
.role-select {
  .rs-query {
    margin-bottom: 8px;
  }

  .rs-radio {
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

  .rs-count {
    margin-right: auto;
    color: #6e6e73;
    font-size: 13px;
  }
}
</style>
