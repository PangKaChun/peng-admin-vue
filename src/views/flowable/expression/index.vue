<template>
  <div class="page">
    <div class="page-toolbar">
      <el-form ref="queryForm" :model="queryParams" inline size="small" class="page-filters" @submit.native.prevent>
        <el-form-item prop="expressionName">
          <el-input
            v-model="queryParams.expressionName"
            placeholder="表达式名称"
            clearable
            style="width: 180px"
            @keyup.enter.native="handleQuery"
          />
        </el-form-item>
        <el-form-item prop="expressionType">
          <el-select v-model="queryParams.expressionType" placeholder="表达式类型" clearable style="width: 150px">
            <el-option v-for="dict in dict.type.flow_expression_type" :key="dict.value" :label="dict.label" :value="dict.value" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button icon="el-icon-search" size="small" @click="handleQuery">搜索</el-button>
          <el-button type="text" size="small" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>

      <div class="page-actions">
        <el-button
          v-if="!multiple && $auth.hasPermi('flowable:expression:del')"
          type="danger"
          plain
          icon="el-icon-delete"
          size="small"
          @click="handleDelete()"
        >删除</el-button>
        <el-button
          v-hasPermi="['flowable:expression:add']"
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
        :data="expressionList"
        height="100%"
        highlight-current-row
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="46" align="center" />
        <el-table-column label="表达式名称" align="left" prop="expressionName" min-width="140" show-overflow-tooltip />
        <el-table-column label="表达式内容" align="left" prop="expressionContent" min-width="200" class-name="mono-cell" show-overflow-tooltip />
        <el-table-column label="表达式类型" align="center" prop="expressionType" width="120">
          <template slot-scope="scope">
            <dict-tag :options="dict.type.flow_expression_type" :value="scope.row.expressionType" />
          </template>
        </el-table-column>
        <el-table-column label="备注" align="left" prop="remark" min-width="140" show-overflow-tooltip />
        <el-table-column label="创建时间" align="center" prop="createTime" width="160">
          <template slot-scope="scope">
            <span>{{ parseTime(scope.row.createTime) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" align="center" width="120" class-name="small-padding">
          <template slot-scope="scope">
            <el-button
              v-hasPermi="['flowable:expression:edit']"
              size="mini"
              type="text"
              @click="handleUpdate(scope.row)"
            >修改</el-button>
            <el-button
              v-hasPermi="['flowable:expression:del']"
              size="mini"
              type="text"
              @click="handleDelete(scope.row)"
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

    <el-dialog :title="title" :visible.sync="open" width="540px" append-to-body>
      <el-form ref="form" :model="form" :rules="rules" label-width="68px">
        <el-form-item label="名称" prop="expressionName">
          <el-input v-model="form.expressionName" placeholder="表达式名称" />
        </el-form-item>
        <el-form-item label="类型" prop="expressionType">
          <el-select v-model="form.expressionType" placeholder="选择类型">
            <el-option v-for="dict in dict.type.flow_expression_type" :key="dict.value" :label="dict.label" :value="dict.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="内容" prop="expressionContent">
          <el-input
            v-model="form.expressionContent"
            type="textarea"
            :rows="4"
            :maxlength="500"
            show-word-limit
            class="mono-input"
            placeholder="例如 ${days > 3}"
          />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="form.remark" type="textarea" placeholder="备注" />
        </el-form-item>
      </el-form>
      <div slot="footer">
        <el-button @click="cancel">取消</el-button>
        <el-button type="primary" @click="submitForm">确定</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { listExpression, getExpression, delExpression, addExpression, updateExpression } from '@/api/flowable/expression'

export default {
  name: 'Expression',
  dicts: ['flow_expression_type'],
  data() {
    return {
      loading: false,
      ids: [],
      multiple: true,
      total: 0,
      expressionList: [],
      title: '',
      open: false,
      queryParams: {
        pageNum: 1,
        pageSize: 10,
        expressionName: undefined,
        expressionType: undefined
      },
      form: {},
      rules: {
        expressionName: [{ required: true, message: '表达式名称不能为空', trigger: 'blur' }],
        expressionType: [{ required: true, message: '表达式类型不能为空', trigger: 'change' }],
        expressionContent: [{ required: true, message: '表达式内容不能为空', trigger: 'blur' }]
      }
    }
  },
  created() {
    this.getList()
  },
  methods: {
    getList() {
      this.loading = true
      listExpression(this.queryParams)
        .then(response => {
          this.expressionList = response.records
          this.total = response.total
        })
        .finally(() => {
          this.loading = false
        })
    },
    cancel() {
      this.open = false
      this.reset()
    },
    reset() {
      this.form = {
        expressionId: undefined,
        expressionName: undefined,
        expressionType: undefined,
        expressionContent: undefined,
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
    resetQuery() {
      this.resetForm('queryForm')
      this.handleQuery()
    },
    handleAdd() {
      this.reset()
      this.open = true
      this.title = '新增表达式'
    },
    handleSelectionChange(selection) {
      this.ids = selection.map(item => item.expressionId)
      this.multiple = !selection.length
    },
    handleUpdate(row) {
      this.reset()
      getExpression(row.expressionId).then(response => {
        this.form = response
        this.open = true
        this.title = '编辑表达式'
      })
    },
    submitForm() {
      this.$refs.form.validate(valid => {
        if (!valid) return
        const isUpdate = this.form.expressionId !== undefined
        const req = isUpdate ? updateExpression(this.form) : addExpression(this.form)
        req.then(() => {
          this.$modal.msgSuccess(isUpdate ? '修改成功' : '新增成功')
          this.open = false
          this.getList()
        })
      })
    },
    handleDelete(row) {
      const expressionIds = (row && row.expressionId) || this.ids
      const message = row
        ? '确认删除表达式“' + row.expressionName + '”吗？'
        : '确认删除选中的 ' + expressionIds.length + ' 项表达式吗？'
      this.$modal
        .confirm(message)
        .then(() => delExpression(expressionIds))
        .then(() => {
          this.getList()
          this.$modal.msgSuccess('删除成功')
        })
        .catch(() => {})
    }
  }
}
</script>
