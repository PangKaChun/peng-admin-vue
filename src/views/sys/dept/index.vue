<template>
  <div class="page-split">
    <aside class="page-aside tree-aside">
      <div class="page-header">
        <span class="page-header__title">部门</span>
        <el-button
          v-hasPermi="['sys:dept:add']"
          type="primary"
          icon="el-icon-plus"
          size="mini"
          @click="handleAdd()"
        >新增</el-button>
      </div>
      <div class="page-aside__search">
        <el-input v-model="deptName" size="mini" clearable placeholder="搜索部门">
          <i slot="prefix" class="el-input__icon el-icon-search" />
        </el-input>
      </div>
      <div v-loading="loading" class="page-aside__body">
        <el-tree
          ref="dept"
          :data="deptList"
          :expand-on-click-node="false"
          :default-expanded-keys="deptList.map(item => item.deptId)"
          :props="defaultProps"
          :filter-node-method="filterNode"
          check-strictly
          highlight-current
          node-key="deptId"
          @node-click="handleUpdate"
        >
          <span slot-scope="{ node, data }" class="custom-tree-node">
            <span class="node-main">
              <i
                class="node-icon"
                :class="data.children && data.children.length ? (node.expanded ? 'el-icon-folder-opened' : 'el-icon-folder') : 'el-icon-document'"
              />
              <span class="node-label">{{ node.label }}</span>
            </span>
            <span class="tree-node-actions">
              <el-button
                v-hasPermi="['sys:dept:add']"
                type="text"
                size="mini"
                @click.stop="handleAdd(data)"
              >新增</el-button>
              <el-button
                v-hasPermi="['sys:dept:del']"
                type="text"
                size="mini"
                @click.stop="handleDelete(data)"
              >删除</el-button>
            </span>
          </span>
        </el-tree>
      </div>
    </aside>

    <div class="page-content">
      <div class="page-header">
        <div class="page-header__title">
          <span>{{ form.deptId != null ? '编辑部门' : '新增部门' }}</span>
          <span v-if="form.deptId != null && activeDeptName" class="page-header__sub">{{ activeDeptName }}</span>
        </div>
        <el-button
          v-if="form.deptId != null ? $auth.hasPermi('sys:dept:edit') : $auth.hasPermi('sys:dept:add')"
          type="primary"
          icon="el-icon-check"
          size="mini"
          :loading="submitting"
          :disabled="formLoading"
          @click="submitForm"
        >保存</el-button>
      </div>

      <div v-loading="formLoading" class="page-body page-body--scroll">
        <el-form
          ref="form"
          :model="form"
          :rules="rules"
          label-width="88px"
          class="detail-form"
          @submit.native.prevent="submitForm"
        >
          <el-row :gutter="16" class="form-grid-row">
            <el-col v-if="form.parentId !== '0'" :span="24">
              <el-form-item label="上级部门" prop="parentId">
                <treeselect v-model="form.parentId" :options="depts" :show-count="true" placeholder="上级部门" />
              </el-form-item>
            </el-col>
            <el-col :span="24">
              <el-form-item label="部门名称" prop="deptName">
                <el-input v-model="form.deptName" placeholder="部门名称" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="显示排序" prop="orderNum">
                <el-input-number v-model="form.orderNum" controls-position="right" :min="0" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="状态" prop="status">
                <el-radio-group v-model="form.status">
                  <el-radio-button v-for="dict in dict.type.dept_status" :key="dict.value" :label="dict.value">{{ dict.label }}</el-radio-button>
                </el-radio-group>
              </el-form-item>
            </el-col>
            <el-col :span="24">
              <el-form-item label="备注" prop="remark">
                <el-input v-model="form.remark" type="textarea" placeholder="备注" />
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
      </div>
    </div>
  </div>
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
      depts: [],
      deptList: [],
      deptName: undefined,
      formLoading: false,
      loading: false,
      submitting: false,
      activeDeptName: '',
      defaultProps: {
        children: 'children',
        label: 'deptName'
      },
      form: {},
      rules: {
        parentId: [{ required: true, message: '上级部门不能为空', trigger: 'blur' }],
        deptName: [{ required: true, message: '部门名称不能为空', trigger: 'blur' }],
        orderNum: [{ required: true, message: '部门顺序不能为空', trigger: 'blur' }]
      }
    }
  },
  watch: {
    deptName(val) {
      this.$refs.dept.filter(val)
    }
  },
  created() {
    this.getList()
    this.handleAdd()
  },
  methods: {
    /** 查询部门列表 */
    getList() {
      this.loading = true
      listDept()
        .then(response => {
          this.deptList = this.handleTree(response, 'deptId')
        })
        .finally(() => {
          this.loading = false
        })
    },
    getDeptsTree() {
      treeselect().then(response => {
        this.depts = response
      })
    },
    filterNode(value, data) {
      if (!value) return true
      return data.deptName.indexOf(value) !== -1
    },
    reset() {
      this.activeDeptName = ''
      this.form = {
        deptId: undefined,
        parentId: undefined,
        deptName: undefined,
        leaderId: undefined,
        orderNum: 1,
        status: '0',
        remark: undefined
      }
      this.$nextTick(() => {
        this.$refs.form && this.$refs.form.clearValidate()
      })
    },
    handleAdd(row) {
      this._detailReqId = (this._detailReqId || 0) + 1
      this.formLoading = false
      this.reset()
      this.$refs.dept && this.$refs.dept.setCurrentKey(null)
      if (row && row.deptId) {
        this.form.parentId = row.deptId
        if (row.children) {
          this.form.orderNum = row.children.length + 1
        }
      } else {
        this.form.orderNum = this.deptList.length + 1
      }
      this.getDeptsTree()
    },
    handleUpdate(row) {
      const reqId = (this._detailReqId = (this._detailReqId || 0) + 1)
      this.getDeptsTree()
      this.formLoading = true
      getDept(row.deptId)
        .then(response => {
          if (this._detailReqId !== reqId) return
          this.form = response
          this.activeDeptName = response.deptName || ''
          this.$nextTick(() => {
            this.$refs.form && this.$refs.form.clearValidate()
          })
        })
        .finally(() => {
          if (this._detailReqId === reqId) {
            this.formLoading = false
          }
        })
    },
    handleDelete(row) {
      this.$modal
        .confirm(`是否确认删除部门“${row.deptName}”？`)
        .then(() => delDept(row.deptId))
        .then(() => {
          if (this.form.deptId === row.deptId) {
            this.handleAdd()
          } else {
            this.getDeptsTree()
          }
          this.getList()
          this.$modal.msgSuccess('删除成功')
        })
        .catch(() => {})
    },
    submitForm() {
      if (this.submitting) return
      this.$refs.form.validate(valid => {
        if (!valid) return
        this.submitting = true
        const isUpdate = this.form.deptId != undefined
        const request = isUpdate
          ? updateDept(this.form).then(() => this.$modal.msgSuccess('修改成功'))
          : addDept(this.form).then(() => this.$modal.msgSuccess('新增成功'))
        request
          .then(() => {
            this.handleAdd()
            this.getList()
          })
          .finally(() => {
            this.submitting = false
          })
      })
    }
  }
}
</script>

<style lang="scss" scoped>
@import '@/assets/styles/tokens.scss';

.tree-aside {
  width: 280px;
}

.detail-form {
  max-width: 640px;
}

.custom-tree-node {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $space-2;
  padding-right: $space-1;
  font-size: 13px;

  .node-main {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
  }

  .node-label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .node-icon {
    flex: none;
    font-size: 14px;
    color: $label-secondary;
  }

  .tree-node-actions {
    flex: none;
    display: inline-flex;
    align-items: center;
    gap: $space-2;
    opacity: 0;
    pointer-events: none;
    transition: opacity $duration-fast ease;

    .el-button + .el-button {
      margin-left: 0;
    }

    @media (hover: none) {
      opacity: 1;
      pointer-events: auto;
    }
  }
}

.el-tree ::v-deep .el-tree-node__content {
  &:hover .tree-node-actions,
  &:focus-within .tree-node-actions {
    opacity: 1;
    pointer-events: auto;
  }
}
</style>
