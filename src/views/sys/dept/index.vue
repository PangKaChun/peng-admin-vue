<template>
  <el-container>
    <el-aside width="300px">
      <el-card class="box-card" shadow="never">
        <div slot="header" class="clearfix">
          <span class="dept-span el-icon-dept">部门管理</span>
          <div style="float: right;">
            <el-button
              v-hasPermi="['sys:dept:add']"
              icon="el-icon-plus"
              size="mini"
              style="padding: 6px 9px"
              type="primary"
              @click="handleAdd"
            >新增</el-button>
          </div>
        </div>
        <el-input v-model="deptName" class="dept-filter-input" size="mini" placeholder="输入部门名称搜索">
          <i slot="prefix" class="el-input__icon el-icon-search"></i>
        </el-input>
        <el-tree
          ref="dept"
          :data="deptList"
          :default-expanded-keys="deptList.map(item=>item.deptId)"
          :props="defaultProps"
          :filter-node-method="filterNode"
          check-strictly
          node-key="deptId"
          @node-click="handleUpdate"
        >
          <span class="custom-tree-node" slot-scope="{ node, data }">
            <span>
              <i :class="data.children && data.children.length ? node.expanded? 'el-icon-folder-opened' : 'el-icon-folder' : 'el-icon-document'" class="node-icon" />
              {{ node.label }}
            </span>
            <span>
              <el-button type="text" size="mini" @click.stop="handleAdd(data)">新增</el-button>
              <el-button type="text" size="mini" @click.stop="handleDelete(data)">删除</el-button>
            </span>
          </span>
        </el-tree>
      </el-card>
    </el-aside>
    <el-main>
      <el-card class="box-card" shadow="never">
        <div slot="header" class="clearfix">
          <span class="dept-span">{{title}}</span>
          <el-button
            v-hasPermi="['sys:dept:add']"
            icon="el-icon-check"
            size="mini"
            style="float: right; padding: 6px 9px"
            type="success"
            @click="submitForm"
          >保存</el-button>
        </div>
        <el-form ref="form" :model="form" :rules="rules" label-width="100px" v-loading="formLoading" style="width:80%;margin:20px auto;">
          <el-row>
            <el-col :span="24" v-if="form.parentId !== '0'">
              <el-form-item label="上级部门" prop="parentId">
                <treeselect v-model="form.parentId" :options="depts" :show-count="true" placeholder="选择上级部门" />
              </el-form-item>
            </el-col>
            <el-col :span="24">
              <el-form-item label="部门名称" prop="deptName">
                <el-input v-model="form.deptName" placeholder="请输入部门名称" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row>
            <el-col :span="12">
              <el-form-item label="显示排序" prop="orderNum">
                <el-input-number v-model="form.orderNum" controls-position="right" :min="0" />
              </el-form-item>
            </el-col>
            <el-col :span="12" v-if="form.deptType !== 'B'">
              <el-form-item label="状态" prop="status">
                <el-radio-group v-model="form.status">
                  <el-radio-button v-for="dict in dict.type.dept_status" :key="dict.value" :label="dict.value">{{dict.label}}</el-radio-button>
                </el-radio-group>
              </el-form-item>
            </el-col>
            <el-col :span="24">
              <el-form-item label="备注" prop="remark">
                <el-input v-model="form.remark" type="textarea" placeholder="请输入内容"></el-input>
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
      </el-card>
    </el-main>
  </el-container>
</template>

<script>
import Treeselect from '@riophae/vue-treeselect'
import '@riophae/vue-treeselect/dist/vue-treeselect.css'

import { listDept, getDept, addDept, updateDept, delDept, treeselect } from '@/api/sys/dept'
export default {
  name: 'Dept',
  dicts: ['dept_status'],
  components: { Treeselect },
  data() {
    return {
      // 选中数组
      ids: [],
      // 部门树选项
      depts: [],
      // 部门数据
      deptList: [],
      // 部门名称
      deptName: undefined,
      // 遮罩层
      formLoading: false,
      // 遮罩层
      loading: false,
      defaultProps: {
        children: 'children',
        label: 'deptName'
      },
      // 表单参数
      form: {},
      title: null,
      // 表单校验
      rules: {
        parentId: [{ required: true, message: '上级部门不能为空', trigger: 'blur' }],
        deptName: [{ required: true, message: '部门名称不能为空', trigger: 'blur' }],
        orderNum: [{ required: true, message: '部门顺序不能为空', trigger: 'blur' }]
      }
    }
  },
  watch: {
    // 根据名称筛选部门树
    deptName(val) {
      this.$refs.dept.filter(val)
    }
  },
  created() {
    this.getList()
    this.handleAdd()
  },
  methods: {
    /** 查询角色列表 */
    getList() {
      this.loading = true
      listDept().then(response => {
        this.deptList = this.handleTree(response, 'deptId')
        this.loading = false
      })
    },
    /** 查询部门下拉树结构 */
    getDeptsTree() {
      treeselect().then(response => {
        this.depts = response
      })
    },
    // 筛选节点
    filterNode(value, data) {
      if (!value) return true
      return data.deptName.indexOf(value) !== -1
    },
    // 表单重置
    reset() {
      this.form = {
        deptId: undefined,
        parentId: undefined,
        deptName: undefined,
        leaderId: undefined,
        orderNum: 1,
        status: '0',
        remark: undefined
      }
      this.resetForm('form')
    },
    /** 新增按钮操作 */
    handleAdd(row) {
      this.reset()
      if (row != null && row.deptId) {
        this.form.parentId = row.deptId
        if (row.children) {
          this.form.orderNum = row.children.length + 1
        }
      } else {
        this.form.orderNum = this.deptList.length + 1
      }
      this.getDeptsTree()
      this.title = '添加部门'
    },
    /** 修改按钮操作 */
    handleUpdate(row) {
      // this.reset()
      this.getDeptsTree()
      const deptId = row.deptId
      this.formLoading = true
      getDept(deptId)
        .then(response => {
          this.form = response
          this.title = `修改部门—${response.deptName}`
        })
        .finally(() => {
          this.formLoading = false
        })
    },
    /** 删除按钮操作 */
    handleDelete(row) {
      const deptIds = row.deptId || this.ids
      this.$modal
        .confirm('是否确认删除部门编号为"' + deptIds + '"的数据项？')
        .then(function () {
          return delDept(deptIds)
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
          if (this.form.deptId != undefined) {
            updateDept(this.form).then(response => {
              this.reset()
              this.$modal.msgSuccess('修改成功')
              this.getList()
            })
          } else {
            addDept(this.form).then(response => {
              this.$modal.msgSuccess('新增成功')
              this.getList()
            })
          }
        }
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.el-container {
  height: 100%;
}
.el-main {
  padding: 0;
}
.query-form {
  padding-top: 20px;
  background-color: #f2f2f2;
  padding-left: 20px;
}
.box-card {
  height: 100%;
  border-radius: 0;

  .dept-filter-input {
    width: 90%;
    display: block;
    padding: 6px 0;
    margin: 0 auto;
  }

  ::v-deep .el-card__body {
    height: calc(100% - 47px);
    overflow-y: auto;
    padding: 0;
  }

  ::v-deep .el-tree-node.is-current > .el-tree-node__content {
    background: #1976d21f;
    color: #094194;
    font-weight: 600;

    .node-icon {
      color: #094194 !important;
    }
  }
}
.dept-span {
  font-weight: bold;
  color: #303133;
  font-size: 15px;
  line-height: 26px;
}
.custom-tree-node {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 14px;
  padding-right: 8px;

  .node-icon {
    font-size: 14px;
    color: #f5a623;
    flex-shrink: 0;
  }
}
.el-input-number {
  width: 100%;
}
::v-deep .el-icon-document.node-icon {
  color: #909399 !important;
}
</style>