<template>
  <div class="page-split">
    <aside class="page-aside user-aside">
      <div class="page-aside__search">
        <el-input v-model="deptName" size="mini" clearable placeholder="搜索部门">
          <i slot="prefix" class="el-input__icon el-icon-search" />
        </el-input>
      </div>
      <div class="page-aside__body">
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
      </div>
    </aside>

    <div class="page-content">
      <div class="page-toolbar">
        <el-form ref="queryForm" :model="queryParams" inline size="small" class="page-filters" @submit.native.prevent>
          <el-form-item prop="username">
            <el-input
              v-model="queryParams.username"
              placeholder="登录名"
              clearable
              style="width: 160px"
              @keyup.enter.native="handleQuery"
            />
          </el-form-item>
          <el-form-item prop="phonenumber">
            <el-input
              v-model="queryParams.phonenumber"
              placeholder="手机号码"
              clearable
              style="width: 160px"
              @keyup.enter.native="handleQuery"
            />
          </el-form-item>
          <el-form-item prop="status">
            <el-select v-model="queryParams.status" placeholder="状态" clearable style="width: 120px">
              <el-option v-for="dict in dict.type.user_status" :key="dict.value" :label="dict.label" :value="dict.value" />
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
            />
          </el-form-item>
          <el-form-item>
            <el-button icon="el-icon-search" size="small" @click="handleQuery">搜索</el-button>
            <el-button type="text" size="small" @click="resetQuery">重置</el-button>
          </el-form-item>
        </el-form>

        <div class="page-actions">
          <el-button
            v-if="!multiple && $auth.hasPermi('sys:user:del')"
            type="danger"
            plain
            icon="el-icon-delete"
            size="small"
            @click="handleDelete()"
          >删除</el-button>
          <el-button
            v-hasPermi="['sys:user:add']"
            type="primary"
            icon="el-icon-plus"
            size="small"
            @click="handleAdd"
          >新增</el-button>
        </div>
      </div>

      <div class="page-body">
        <el-table
          v-loading="loading"
          :data="userList"
          height="100%"
          highlight-current-row
          @selection-change="handleSelectionChange"
        >
          <el-table-column type="selection" width="46" align="center" />
          <el-table-column label="登录名" align="left" prop="username" min-width="120" show-overflow-tooltip />
          <el-table-column label="用户昵称" align="left" prop="nickName" min-width="120" show-overflow-tooltip />
          <el-table-column label="部门" align="left" prop="deptName" min-width="120" show-overflow-tooltip />
          <el-table-column label="手机号码" align="center" prop="phonenumber" width="120" />
          <el-table-column label="创建时间" align="center" prop="createTime" width="160" />
          <el-table-column label="操作" align="center" width="160" class-name="small-padding">
            <template v-if="scope.row.userId !== '1'" slot-scope="scope">
              <el-button
                v-hasPermi="['sys:user:edit']"
                size="mini"
                type="text"
                @click="handleUpdate(scope.row)"
              >修改</el-button>
              <el-button
                v-hasPermi="['sys:user:del']"
                size="mini"
                type="text"
                @click="handleDelete(scope.row)"
              >删除</el-button>
              <el-dropdown
                v-hasPermi="['sys:user:edit']"
                size="mini"
                @command="command => handleCommand(command, scope.row)"
              >
                <span class="el-dropdown-link">
                  更多<i class="el-icon-arrow-down el-icon--right" />
                </span>
                <el-dropdown-menu slot="dropdown">
                  <el-dropdown-item v-hasPermi="['sys:user:edit']" command="handleResetPwd" icon="el-icon-key">重置密码</el-dropdown-item>
                  <el-dropdown-item v-hasPermi="['sys:user:edit']" command="handleAuthRole" icon="el-icon-circle-check">分配角色</el-dropdown-item>
                </el-dropdown-menu>
              </el-dropdown>
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

    <el-dialog :title="dialogTitle" :visible.sync="dialogFormVisible" width="580px" append-to-body>
      <el-form ref="form" :model="form" :rules="rules" label-width="80px">
        <el-row :gutter="16" class="form-grid-row">
          <el-col :span="12">
            <el-form-item label="用户昵称" prop="nickName">
              <el-input v-model="form.nickName" placeholder="用户昵称" maxlength="30" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="归属部门" prop="deptId">
              <treeselect v-model="form.deptId" :options="depts" :show-count="true" placeholder="选择部门" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="手机号码" prop="phonenumber">
              <el-input v-model="form.phonenumber" placeholder="手机号码" maxlength="11" />
            </el-form-item>
          </el-col>
          <el-col v-if="form.userId == undefined" :span="12">
            <el-form-item label="登录名" prop="username">
              <el-input v-model="form.username" placeholder="登录名" maxlength="30" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="性别">
              <el-select v-model="form.sex" placeholder="选择性别">
                <el-option v-for="dict in dict.type.user_sex" :key="dict.value" :label="dict.label" :value="dict.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态">
              <el-radio-group v-model="form.status">
                <el-radio v-for="dict in dict.type.user_status" :key="dict.value" :label="dict.value">{{ dict.label }}</el-radio>
              </el-radio-group>
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

    <resetPwd ref="resetPwd" :userId="userId" :username="username" />
    <authRole ref="authRole" :userId="userId" :username="username" />
  </div>
</template>

<script>
import Treeselect from '@riophae/vue-treeselect'
import '@riophae/vue-treeselect/dist/vue-treeselect.css'
import { listUser, getUser, addUser, updateUser, delUser } from '@/api/sys/user'
import { treeselect } from '@/api/sys/dept'
import resetPwd from './resetPwd'
import authRole from './authRole'

export default {
  name: 'User',
  dicts: ['user_status', 'user_sex'],
  components: { Treeselect, resetPwd, authRole },
  data() {
    return {
      userId: undefined,
      username: undefined,
      ids: [],
      multiple: true,
      deptName: undefined,
      dateRange: [],
      queryParams: {
        pageNum: 1,
        pageSize: 10,
        username: undefined,
        phonenumber: undefined,
        status: undefined,
        deptId: undefined
      },
      userList: [],
      total: 0,
      loading: false,
      depts: [],
      defaultProps: {
        children: 'children',
        label: 'label'
      },
      form: {},
      dialogTitle: '',
      dialogFormVisible: false,
      rules: {
        username: [
          { required: true, message: '登录名不能为空', trigger: 'blur' },
          { min: 2, max: 20, message: '登录名长度必须介于 2 和 20 之间', trigger: 'blur' }
        ],
        nickName: [{ required: true, message: '用户昵称不能为空', trigger: 'blur' }],
        phonenumber: [
          {
            pattern: /^1[3-9][0-9]\d{8}$/,
            message: '请输入正确的手机号码',
            trigger: 'blur'
          }
        ]
      }
    }
  },
  watch: {
    deptName(val) {
      this.$refs.tree.filter(val)
    }
  },
  created() {
    this.getList()
    this.getTreeselect()
  },
  methods: {
    getList() {
      this.loading = true
      listUser(this.addDateRange(this.queryParams, this.dateRange))
        .then(response => {
          this.userList = response.records
          this.total = response.total
        })
        .finally(() => {
          this.loading = false
        })
    },
    getTreeselect() {
      treeselect().then(res => {
        this.depts = res
      })
    },
    filterNode(value, data) {
      if (!value) return true
      return data.label.indexOf(value) !== -1
    },
    handleNodeClick(data) {
      this.queryParams.deptId = data.id
      this.handleQuery()
    },
    resetQuery() {
      this.dateRange = []
      this.queryParams.deptId = undefined
      this.deptName = undefined
      if (this.$refs.tree) {
        this.$refs.tree.setCurrentKey(null)
      }
      this.resetForm('queryForm')
      this.handleQuery()
    },
    handleSelectionChange(selection) {
      this.ids = selection.map(item => item.userId)
      this.multiple = !selection.length
    },
    cancel() {
      this.dialogFormVisible = false
      this.reset()
    },
    reset() {
      this.form = {
        userId: undefined,
        deptId: undefined,
        username: undefined,
        nickName: undefined,
        phonenumber: undefined,
        sex: 'M',
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
    handleCommand(command, row) {
      if (command === 'handleResetPwd') {
        this.handleResetPwd(row)
      } else if (command === 'handleAuthRole') {
        this.handleAuthRole(row)
      }
    },
    handleAdd() {
      this.reset()
      this.getTreeselect()
      this.dialogFormVisible = true
      this.dialogTitle = '新增用户'
    },
    handleUpdate(row) {
      this.reset()
      this.getTreeselect()
      getUser(row.userId).then(response => {
        this.form = response
        this.dialogFormVisible = true
        this.dialogTitle = '编辑用户'
      })
    },
    handleResetPwd(row) {
      this.userId = row.userId
      this.username = row.username
      this.$refs.resetPwd.reset()
      this.$refs.resetPwd.visible = true
    },
    handleAuthRole(row) {
      this.userId = row.userId
      this.username = row.username
      this.$refs.authRole.reset()
      this.$refs.authRole.visible = true
    },
    handleDelete(row) {
      const userIds = (row && row.userId) || this.ids
      const message = row && row.userId
        ? `确认删除用户“${row.username}”吗？`
        : `确认删除选中的 ${userIds.length} 位用户吗？`
      this.$modal
        .confirm(message)
        .then(() => delUser(userIds))
        .then(() => {
          this.getList()
          this.$modal.msgSuccess('删除成功')
        })
        .catch(() => {})
    },
    submitForm() {
      this.$refs.form.validate(valid => {
        if (!valid) return
        if (this.form.userId != undefined) {
          updateUser(this.form).then(() => {
            this.$modal.msgSuccess('修改成功')
            this.dialogFormVisible = false
            this.getList()
          })
        } else {
          addUser(this.form).then(() => {
            this.$modal.msgSuccess('新增成功，请通过「重置密码」为该用户设置初始密码')
            this.dialogFormVisible = false
            this.getList()
          })
        }
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.user-aside {
  width: 220px;
}
</style>
