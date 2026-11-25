<template>
  <div class="page-split">
    <div class="page-content">
      <div class="page-toolbar">
        <el-form ref="queryForm" :model="queryParams" inline size="small" class="page-filters" @submit.native.prevent>
          <el-form-item prop="roleName">
            <el-input
              v-model="queryParams.roleName"
              placeholder="角色名称"
              clearable
              style="width: 160px"
              @keyup.enter.native="handleQuery"
            />
          </el-form-item>
          <el-form-item prop="status">
            <el-select v-model="queryParams.status" placeholder="状态" clearable style="width: 120px">
              <el-option v-for="dict in dict.type.role_status" :key="dict.value" :label="dict.label" :value="dict.value" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-date-picker
              v-model="dateRange"
              style="width: 220px"
              value-format="yyyy-MM-dd"
              type="daterange"
              range-separator="-"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
            />
          </el-form-item>
          <el-form-item>
            <el-button icon="el-icon-search" size="small" @click="handleQuery">搜索</el-button>
            <el-button type="text" size="small" @click="resetQuery">重置</el-button>
          </el-form-item>
        </el-form>

        <div class="page-actions">
          <el-button
            v-hasPermi="['sys:role:add']"
            type="primary"
            icon="el-icon-plus"
            size="small"
            @click="handleAdd"
          >新增</el-button>
          <el-button
            v-if="!multiple && $auth.hasPermi('sys:role:del')"
            type="danger"
            plain
            icon="el-icon-delete"
            size="small"
            @click="handleDelete"
          >删除</el-button>
        </div>
      </div>

      <div class="page-body">
        <el-table
          ref="table"
          v-loading="loading"
          :data="roleList"
          height="100%"
          highlight-current-row
          @selection-change="handleSelectionChange"
          @current-change="handleCurrentChange"
        >
          <el-table-column type="selection" width="46" align="center" />
          <el-table-column label="角色名称" align="left" prop="roleName" min-width="120" show-overflow-tooltip />
          <el-table-column label="角色标识" align="left" prop="roleCode" min-width="120" class-name="mono-cell" show-overflow-tooltip />
          <el-table-column label="状态" align="center" width="80">
            <template slot-scope="scope">
              <el-switch
                v-model="scope.row.status"
                active-value="0"
                inactive-value="1"
                :disabled="scope.row.roleId === '1' || !$auth.hasPermi('sys:role:edit')"
                @click.native.stop
                @change="handleStatusChange(scope.row)"
              />
            </template>
          </el-table-column>
          <el-table-column label="创建时间" align="center" prop="createTime" width="160" class-name="num-cell" />
          <el-table-column label="操作" align="center" width="120" class-name="small-padding">
            <template v-if="scope.row.roleId !== '1'" slot-scope="scope">
              <el-button
                v-hasPermi="['sys:role:edit']"
                size="mini"
                type="text"
                @click.stop="handleUpdate(scope.row)"
              >修改</el-button>
              <el-button
                v-hasPermi="['sys:role:del']"
                size="mini"
                type="text"
                @click.stop="handleDelete(scope.row)"
              >删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div v-show="total > 0" class="page-footer">
        <pagination
          :total="total"
          :page.sync="queryParams.pageNum"
          :limit.sync="queryParams.pageSize"
          @pagination="getList"
        />
      </div>
    </div>

    <aside class="page-aside page-aside--right">
      <div class="page-header">
        <div class="page-header__title">
          <span>权限分配</span>
          <span v-if="activeRoleName" class="page-header__sub">{{ activeRoleName }}</span>
        </div>
        <el-button
          v-show="roleId"
          v-hasPermi="['sys:role:edit']"
          :loading="saveAuthLoading"
          :disabled="authsLoading"
          size="mini"
          type="primary"
          @click="saveAuth"
        >保存</el-button>
      </div>

      <div v-if="roleId" v-loading="authsLoading" class="role-auth-body">
        <el-tabs v-model="activeTabName" class="role-tabs">
          <el-tab-pane label="菜单权限" name="menu">
            <el-tree
              ref="menu"
              :data="menus"
              :expand-on-click-node="false"
              :default-expanded-keys="menus.map(item => item.id)"
              :default-checked-keys="menuIds"
              :props="defaultProps"
              check-strictly
              show-checkbox
              node-key="id"
              @check="menuChange"
            />
          </el-tab-pane>
          <el-tab-pane label="数据权限" name="dept" :disabled="deptTabDisabled">
            <el-tree
              ref="dept"
              :data="depts"
              default-expand-all
              :expand-on-click-node="false"
              :default-checked-keys="deptIds"
              :props="defaultProps"
              check-strictly
              show-checkbox
              node-key="id"
              @check="deptChange"
            />
          </el-tab-pane>
        </el-tabs>
      </div>
      <div v-else class="page-empty">暂无角色</div>
    </aside>

    <el-dialog :title="dialogTitle" :visible.sync="dialogFormVisible" width="560px" append-to-body>
      <el-form ref="form" :model="form" :rules="rules" label-width="80px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="角色名称" prop="roleName">
              <el-input v-model="form.roleName" placeholder="角色名称" maxlength="30" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="角色标识" prop="roleCode">
              <el-input v-model="form.roleCode" placeholder="角色标识" maxlength="30" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态">
              <el-radio-group v-model="form.status">
                <el-radio v-for="dict in dict.type.role_status" :key="dict.value" :label="dict.value">{{ dict.label }}</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="数据范围" prop="dataScope">
              <el-select v-model="form.dataScope" placeholder="选择数据范围">
                <el-option v-for="dict in dict.type.data_scope" :key="dict.value" :label="dict.label" :value="dict.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="备注">
              <el-input v-model="form.remark" type="textarea" placeholder="备注" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <div slot="footer">
        <el-button @click="cancel">取消</el-button>
        <el-button type="primary" @click="submitForm">确定</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { listRole, getRole, delRole, addRole, updateRole, listRoleAuth, authRole } from '@/api/sys/role'
import { treeselect as menuTreeselect } from '@/api/sys/menu'
import { treeselect as deptTreeselect } from '@/api/sys/dept'

export default {
  name: 'Role',
  dicts: ['role_status', 'data_scope'],
  data() {
    return {
      ids: [],
      multiple: true,
      dateRange: [],
      queryParams: {
        pageNum: 1,
        pageSize: 10,
        roleName: undefined,
        roleCode: undefined,
        status: undefined
      },
      roleList: [],
      total: 0,
      loading: false,
      form: {},
      dialogTitle: '',
      dialogFormVisible: false,
      rules: {
        roleName: [{ required: true, message: '角色名称不能为空', trigger: 'blur' }],
        roleCode: [{ required: true, message: '角色标识不能为空', trigger: 'blur' }],
        dataScope: [{ required: true, message: '数据范围不能为空', trigger: 'change' }]
      },
      roleId: undefined,
      activeRoleName: '',
      deptTabDisabled: false,
      saveAuthLoading: false,
      authsLoading: false,
      activeTabName: 'menu',
      menus: [],
      depts: [],
      defaultProps: {
        children: 'children',
        label: 'label'
      },
      menuIds: [],
      deptIds: []
    }
  },
  created() {
    this.getList()
    this.getMenusTree()
    this.getDeptsTree()
  },
  methods: {
    getList() {
      this.loading = true
      listRole(this.addDateRange(this.queryParams, this.dateRange))
        .then(response => {
          this.roleList = response.records || []
          this.total = response.total || 0
          this.$nextTick(() => {
            if (!this.roleList.length) {
              this.roleId = undefined
              this.activeRoleName = ''
              return
            }
            const kept = this.roleId ? this.roleList.find(item => item.roleId === this.roleId) : null
            const target = kept || this.roleList[0]
            this.$refs.table && this.$refs.table.setCurrentRow(target)
          })
        })
        .finally(() => {
          this.loading = false
        })
    },
    resetQuery() {
      this.dateRange = []
      this.resetForm('queryForm')
      this.handleQuery()
    },
    handleSelectionChange(selection) {
      this.ids = selection.map(item => item.roleId)
      this.multiple = !selection.length
    },
    handleStatusChange(row) {
      const text = row.status === '0' ? '启用' : '停用'
      const revertStatus = row.status === '0' ? '1' : '0'
      this.$modal
        .confirm(`确认要${text}角色“${row.roleName}”吗？`)
        .then(() => updateRole({ ...row }))
        .then(() => {
          this.$modal.msgSuccess(`${text}成功`)
        })
        .catch(() => {
          row.status = revertStatus
        })
    },
    cancel() {
      this.dialogFormVisible = false
      this.reset()
    },
    reset() {
      this.form = {
        roleId: undefined,
        roleName: undefined,
        roleCode: undefined,
        dataScope: undefined,
        status: '0',
        remark: undefined
      }
      this.$nextTick(() => {
        this.$refs.form && this.$refs.form.clearValidate()
      })
    },
    handleQuery() {
      this.queryParams.pageNum = 1
      this.getList()
    },
    handleAdd() {
      this.reset()
      this.dialogFormVisible = true
      this.dialogTitle = '新增角色'
    },
    handleUpdate(row) {
      this.reset()
      const roleId = row.roleId || this.ids[0]
      getRole(roleId).then(response => {
        this.form = response
        this.dialogFormVisible = true
        this.dialogTitle = '编辑角色'
      })
    },
    handleDelete(row) {
      const roleIds = row.roleId || this.ids
      this.$modal
        .confirm('是否确认删除角色编号为"' + roleIds + '"的数据项？')
        .then(() => delRole(roleIds))
        .then(() => {
          this.getList()
          this.$modal.msgSuccess('删除成功')
        })
        .catch(() => {})
    },
    submitForm() {
      this.$refs.form.validate(valid => {
        if (!valid) return
        if (this.form.roleId != undefined) {
          updateRole(this.form).then(() => {
            this.$modal.msgSuccess('修改成功')
            this.dialogFormVisible = false
            this.getList()
          })
        } else {
          addRole(this.form).then(() => {
            this.$modal.msgSuccess('新增成功')
            this.dialogFormVisible = false
            this.getList()
          })
        }
      })
    },
    /** 查询菜单下拉树结构 */
    getMenusTree() {
      menuTreeselect().then(res => {
        this.menus = res
      })
    },
    /** 查询部门下拉树结构 */
    getDeptsTree() {
      deptTreeselect().then(res => {
        this.depts = res
      })
    },
    handleCurrentChange(val) {
      if (!val || !val.roleId) {
        if (!this.roleList.length) {
          this.roleId = undefined
          this.activeRoleName = ''
        }
        return
      }
      this.roleId = val.roleId
      this.activeRoleName = val.roleName || ''
      this.deptTabDisabled = val.dataScope !== '5'
      this.menuIds = []
      this.deptIds = []
      this.activeTabName = 'menu'
      this.$nextTick(() => {
        this.$refs.menu && this.$refs.menu.setCheckedKeys([])
        this.$refs.dept && this.$refs.dept.setCheckedKeys([])
      })
      this.authsLoading = true
      listRoleAuth(this.roleId)
        .then(response => {
          if (this.roleId !== val.roleId) return
          this.menuIds = response.menuIds || []
          this.deptIds = response.deptIds || []
          this.$nextTick(() => {
            this.$refs.menu && this.$refs.menu.setCheckedKeys(this.menuIds)
            this.$refs.dept && this.$refs.dept.setCheckedKeys(this.deptIds)
          })
        })
        .finally(() => {
          if (this.roleId === val.roleId) {
            this.authsLoading = false
          }
        })
    },
    menuChange(menu) {
      this.toggleTreeKeys(menu, this.menuIds, 'menu')
    },
    deptChange(dept) {
      this.toggleTreeKeys(dept, this.deptIds, 'dept')
    },
    toggleTreeKeys(node, list, refName) {
      const childIds = []
      if (node.children) {
        this.getChildrenIds(childIds, node)
      }
      childIds.push(node.id)
      const exists = list.indexOf(node.id) !== -1
      childIds.forEach(id => {
        const idx = list.indexOf(id)
        if (exists && idx !== -1) {
          list.splice(idx, 1)
        } else if (!exists && idx === -1) {
          list.push(id)
        }
      })
      this.$refs[refName] && this.$refs[refName].setCheckedKeys(list)
    },
    getChildrenIds(array, node) {
      for (const item of node.children) {
        array.push(item.id)
        if (item.children) {
          this.getChildrenIds(array, item)
        }
      }
    },
    saveAuth() {
      this.saveAuthLoading = true
      authRole({ roleId: this.roleId, menuIds: this.menuIds, deptIds: this.deptIds })
        .then(() => {
          this.$modal.msgSuccess('授权成功')
        })
        .finally(() => {
          this.saveAuthLoading = false
        })
    }
  }
}
</script>

<style lang="scss" scoped>
@import '../../../assets/styles/tokens.scss';

.role-auth-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.role-tabs {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;

  ::v-deep .el-tabs__header {
    margin: 0;
    padding: 0 $space-4;
    border-bottom: 1px solid $separator-light;
  }

  ::v-deep .el-tabs__nav-wrap::after {
    display: none;
  }

  ::v-deep .el-tabs__content {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: $space-2 $space-3;
  }
}
</style>
