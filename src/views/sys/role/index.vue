<template>
  <el-container>
    <el-container>
      <el-header>
        <el-form inline label-position="right" class="query-form" size="small" :model="queryParams" ref="queryForm">
          <el-form-item prop="roleName">
            <el-input
              v-model="queryParams.roleName"
              placeholder="请输入角色名称"
              clearable
              style="width: 240px"
              @keyup.enter.native="handleQuery"
            />
          </el-form-item>
          <el-form-item prop="status">
            <el-select v-model="queryParams.status" placeholder="角色状态" clearable style="width: 240px">
              <el-option v-for="dict in dict.type.role_status" :key="dict.value" :label="dict.label" :value="dict.value" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-date-picker
              v-model="dateRange"
              style="width: 240px"
              value-format="yyyy-MM-dd"
              type="daterange"
              range-separator="-"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
            ></el-date-picker>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" icon="el-icon-search" size="mini" @click="handleQuery">搜索</el-button>
            <el-button icon="el-icon-refresh" size="mini" @click="resetQuery">重置</el-button>
          </el-form-item>
        </el-form>

        <el-row :gutter="10" class="button-bar">
          <el-col :span="1.5">
            <el-button type="primary" icon="el-icon-plus" size="mini" @click="handleAdd" v-hasPermi="['sys:role:add']">新增</el-button>
          </el-col>
          <el-col :span="1.5">
            <el-button
              type="success"
              icon="el-icon-edit"
              size="mini"
              :disabled="single"
              @click="handleUpdate"
              v-hasPermi="['sys:role:edit']"
            >修改</el-button>
          </el-col>
          <el-col :span="1.5">
            <el-button
              type="danger"
              icon="el-icon-delete"
              size="mini"
              :disabled="multiple"
              @click="handleDelete"
              v-hasPermi="['sys:role:del']"
            >删除</el-button>
          </el-col>
        </el-row>
      </el-header>
      <el-main>
        <el-table
          border
          highlight-current-row
          stripe
          height="100%"
          v-loading="loading"
          :data="roleList"
          @selection-change="handleSelectionChange"
          @current-change="handleCurrentChange"
        >
          <el-table-column type="selection" width="50" align="center" />
          <el-table-column
            label="角色名称"
            align="center"
            key="roleName"
            prop="roleName"

          />
          <el-table-column
            label="角色标识"
            align="center"
            key="roleCode"
            prop="roleCode"
            v-if="columns[1].visible"
            :show-overflow-tooltip="true"
          />
          <el-table-column label="状态" align="center" key="status" v-if="columns[2].visible">
            <template slot-scope="scope">
              <el-switch
                v-model="scope.row.status"
                active-value="0"
                inactive-value="1"
                :disabled="scope.row.roleId === '1'"
                @change="handleStatusChange(scope.row)"
              ></el-switch>
            </template>
          </el-table-column>
          <el-table-column label="创建时间" align="center" prop="createTime" v-if="columns[3].visible" width="160" />
          <el-table-column label="操作" align="center" width="160" class-name="small-padding fixed-width">
            <template slot-scope="scope" v-if="scope.row.roleId !== '1'">
              <el-button size="mini" type="text" icon="el-icon-edit" @click="handleUpdate(scope.row)" v-hasPermi="['sys:role:edit']">修改</el-button>
              <el-button size="mini" type="text" icon="el-icon-delete" @click="handleDelete(scope.row)" v-hasPermi="['sys:role:del']">删除</el-button>
            </template>
          </el-table-column>
        </el-table>

        <!-- 添加或修改角色配置对话框 -->
        <el-dialog :title="dialogTitle" :visible.sync="dialogFormVisible" width="600px" append-to-body>
          <el-form ref="form" :model="form" :rules="rules" label-width="80px">
            <el-row>
              <el-col :span="12">
                <el-form-item label="角色名称" prop="roleName">
                  <el-input v-model="form.roleName" placeholder="请输入角色名称" maxlength="30" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="角色标识" prop="roleCode">
                  <el-input v-model="form.roleCode" placeholder="请输入角色标识" maxlength="30" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row>
              <el-col :span="12">
                <el-form-item label="状态">
                  <el-radio-group v-model="form.status">
                    <el-radio v-for="dict in dict.type.role_status" :key="dict.value" :label="dict.value">{{dict.label}}</el-radio>
                  </el-radio-group>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="数据范围">
                  <el-select v-model="form.dataScope" placeholder="请选择数据范围">
                    <el-option v-for="dict in dict.type.data_scope" :key="dict.value" :label="dict.label" :value="dict.value"></el-option>
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
            <el-row>
              <el-col :span="24">
                <el-form-item label="备注">
                  <el-input v-model="form.remark" type="textarea" placeholder="请输入内容"></el-input>
                </el-form-item>
              </el-col>
            </el-row>
          </el-form>
          <div slot="footer" class="dialog-footer">
            <el-button type="primary" @click="submitForm">确 定</el-button>
            <el-button @click="cancel">取 消</el-button>
          </div>
        </el-dialog>
      </el-main>
      <el-footer>
        <pagination
          v-show="total>0"
          :total="total"
          :page.sync="queryParams.pageNum"
          :limit.sync="queryParams.pageSize"
          @pagination="getList"
        />
      </el-footer>
    </el-container>

    <!-- 菜单授权 -->
    <el-aside width="300px">
      <el-card v-show="roleId" class="box-card" shadow="never">
        <div slot="header" class="clearfix">
          <el-tooltip class="item" effect="dark" content="选择指定角色分配菜单" placement="top">
            <span class="role-span">权限分配</span>
          </el-tooltip>
          <el-button
            v-hasPermi="['sys:role:edit']"
            :disabled="!roleId"
            :loading="saveAuthLoading"
            icon="el-icon-check"
            size="mini"
            style="float: right; padding: 6px 9px"
            type="primary"
            @click="saveAuth"
          >保存</el-button>
        </div>
        <el-tabs v-model="activeTabName" class="box-tabs" type="border-card" v-loading="authsLoading">
          <el-tab-pane label="菜单权限" name="menu">
            <el-tree
              ref="menu"
              :data="menus"
              :expand-on-click-node="false"
              :default-expanded-keys="menus.map(item=>item.id)"
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
      </el-card>
      <el-card v-show="!roleId" class="box-card" shadow="never">
        <div slot="header" class="clearfix">
          <span class="role-span">权限分配</span>
        </div>
        <div style="padding: 20px">
          <div class="my-code">点击角色查看详情</div>
        </div>
      </el-card>
    </el-aside>
  </el-container>
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
      // 选中数组
      ids: [],
      // 非单个禁用
      single: true,
      // 非多个禁用
      multiple: true,
      // 日期范围
      dateRange: [],
      // 查询参数
      queryParams: {
        pageNum: 1,
        pageSize: 10,
        roleName: undefined,
        roleCode: undefined,
        status: undefined
      },
      // 列信息
      columns: [
        { key: 1, label: `角色名称`, visible: true },
        { key: 2, label: `角色标识`, visible: true },
        { key: 3, label: `状态`, visible: true },
        { key: 4, label: `创建时间`, visible: true }
      ],
      // 角色表格数据
      roleList: [],
      // 总条数
      total: 0,
      // 遮罩层
      loading: false,
      // 表单参数
      form: {},
      dialogTitle: null,
      // 对话框表单可见
      dialogFormVisible: false,
      // 表单校验
      rules: {
        roleName: [{ required: true, message: '角色名称不能为空', trigger: 'blur' }],
        roleCode: [{ required: true, message: '角色标识不能为空', trigger: 'blur' }],
        dataScope: [{ required: true, message: '数据范围不能为空', trigger: 'blur' }]
      },
      /** 菜单授权 */
      // 选中行id
      roleId: undefined,
      // 数据权限选项卡禁用
      deptTabDisabled: false,
      // 保存角色权限遮罩层
      saveAuthLoading: false,
      // 查询角色权限遮罩层
      authsLoading: false,
      // 授权标签页
      activeTabName: 'menu',
      // 菜单数据
      menus: [],
      // 部门数据
      depts: [],
      defaultProps: {
        children: 'children',
        label: 'label'
      },
      // 选中菜单ids
      menuIds: [],
      // 选中部门ids
      deptIds: [],
    }
  },
  created() {
    this.getList()
    this.getMenusTree()
    this.getDeptsTree()
  },
  methods: {
    /** 查询角色列表 */
    getList() {
      this.roleId = undefined
      this.loading = true
      listRole(this.addDateRange(this.queryParams, this.dateRange)).then(response => {
        this.roleList = response.records
        this.total = response.total
        this.loading = false
      })
    },
    /** 重置按钮操作 */
    resetQuery() {
      this.roleId = undefined
      this.dateRange = []
      this.resetForm('queryForm')
      this.handleQuery()
    },
    // 多选框选中数据
    handleSelectionChange(selection) {
      this.ids = selection.map(item => item.roleId)
      this.single = selection.length != 1
      this.multiple = !selection.length
    },
    // 取消按钮
    cancel() {
      this.dialogFormVisible = false
      this.reset()
    },
    // 表单重置
    reset() {
      this.form = {
        roleId: undefined,
        roleName: undefined,
        roleCode: undefined,
        dataScope: undefined,
        status: '0',
        remark: undefined
      }
      this.resetForm('form')
    },
    /** 搜索按钮操作 */
    handleQuery() {
      this.queryParams.pageNum = 1
      this.getList()
    },
    /** 新增按钮操作 */
    handleAdd() {
      this.reset()
      this.dialogFormVisible = true
      this.dialogTitle = '添加角色'
    },
    /** 修改按钮操作 */
    handleUpdate(row) {
      this.reset()
      const roleId = row.roleId || this.ids
      getRole(roleId).then(response => {
        this.form = response
        this.dialogFormVisible = true
        this.dialogTitle = '修改角色'
      })
    },
    /** 删除按钮操作 */
    handleDelete(row) {
      const roleIds = row.roleId || this.ids
      this.$modal
        .confirm('是否确认删除角色编号为"' + roleIds + '"的数据项？')
        .then(function () {
          return delRole(roleIds)
        })
        .then(() => {
          this.getList()
          this.$modal.msgSuccess('删除成功')
        })
        .catch(() => {})
    },
    /** 提交按钮 */
    submitForm: function () {
      this.$refs['form'].validate(valid => {
        if (valid) {
          if (this.form.roleId != undefined) {
            updateRole(this.form).then(response => {
              this.$modal.msgSuccess('修改成功')
              this.dialogFormVisible = false
              this.getList()
            })
          } else {
            addRole(this.form).then(response => {
              this.$modal.msgSuccess('新增成功')
              this.dialogFormVisible = false
              this.getList()
            })
          }
          this.handleCurrentChange(this.form)
        }
      })
    },
    /** 菜单授权 */

    /** 查询部门下拉树结构 */
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
    // 触发单选
    handleCurrentChange(val) {
      if (val) {
        // 清空菜单的选中
        this.$refs.menu.setCheckedKeys([])
        // 清空部门的选中
        this.$refs.dept.setCheckedKeys([])
        // 保存当前的角色id
        this.roleId = val.roleId
        this.deptTabDisabled = val.dataScope !== '5'
        // 初始化默认选中的key
        this.menuIds = []
        this.authsLoading = true
        this.activeTabName = 'menu'
        listRoleAuth(this.roleId)
          .then(response => {
            this.menuIds = response.menuIds
            this.deptIds = response.deptIds
          })
          .finally(() => {
            this.authsLoading = false
          })
      }
    },
    menuChange(menu) {
      let childIds = []
      if (menu.children) {
        this.getChildrenIds(childIds, menu)
      }
      childIds.push(menu.id)
      // 判断是否在 menuIds 中，如果存在则删除，否则添加
      if (this.menuIds.indexOf(menu.id) !== -1) {
        for (let i = 0; i < childIds.length; i++) {
          const index = this.menuIds.indexOf(childIds[i])
          if (index !== -1) {
            this.menuIds.splice(index, 1)
          }
        }
      } else {
        for (let i = 0; i < childIds.length; i++) {
          const index = this.menuIds.indexOf(childIds[i])
          if (index === -1) {
            this.menuIds.push(childIds[i])
          }
        }
      }
      this.$refs.menu.setCheckedKeys(this.menuIds)
    },
    deptChange(dept) {
      let childIds = []
      if (dept.children) {
        this.getChildrenIds(childIds, dept)
      }
      childIds.push(dept.id)
      // 判断是否在 deptIds 中，如果存在则删除，否则添加
      if (this.deptIds.indexOf(dept.id) !== -1) {
        for (let i = 0; i < childIds.length; i++) {
          const index = this.deptIds.indexOf(childIds[i])
          if (index !== -1) {
            this.deptIds.splice(index, 1)
          }
        }
      } else {
        for (let i = 0; i < childIds.length; i++) {
          const index = this.deptIds.indexOf(childIds[i])
          if (index === -1) {
            this.deptIds.push(childIds[i])
          }
        }
      }
      this.$refs.dept.setCheckedKeys(this.deptIds)
    },
    getChildrenIds(array, node) {
      for (let item of node.children) {
        array.push(item.id)
        if (item.children) {
          this.getChildrenIds(array, item)
        }
      }
    },
    // 保存菜单
    saveAuth() {
      this.saveAuthLoading = true
      let roleId = this.roleId
      let menuIds = this.menuIds
      let deptIds = this.deptIds
      authRole({ roleId, menuIds, deptIds})
        .then(response => {
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
.el-container {
  height: 100%;
}
.el-header {
  height: auto !important;
  padding: 0;
}
.el-main {
  padding: 0;
}
.el-footer {
  height: auto !important;
  border: 1px solid #e6ebf5;
  border-top: 0;
}
.query-form {
  padding-top: 20px;
  background-color: #f2f2f2;
  padding-left: 20px;
}
.box-card {
  height: 100%;
  border-radius: 0;

  ::v-deep .el-card__body {
    height: calc(100% - 47px);
    padding: 0;
  }
}
.role-span {
  font-weight: bold;
  color: #303133;
  font-size: 15px;
  line-height: 26px;
}
.box-tabs {
  height: 100%;
  border: 0;

  ::v-deep .el-tabs__content {
    overflow-y: auto;
    height: calc(100% - 39px);
  }
}

.el-checkbox{
  display: block;
  + .el-checkbox {
    margin-top: 6px;
  }
}

.my-code {
  position: relative;
  padding: 15px;
  line-height: 20px;
  border-left: 5px solid #ddd;
  color: #333;
  font-family: Courier New, serif;
  font-size: 12px;
}
</style>
