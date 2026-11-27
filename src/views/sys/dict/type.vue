<template>
  <div class="page-content">
    <div class="page-toolbar">
      <el-form ref="queryForm" :model="queryParams" inline size="small" class="page-filters" @submit.native.prevent>
        <el-form-item prop="dictName">
          <el-input
            v-model="queryParams.dictName"
            placeholder="字典名称或类型"
            clearable
            style="width: 150px"
            @keyup.enter.native="handleQuery"
          />
        </el-form-item>
        <el-form-item>
          <el-button icon="el-icon-search" size="small" @click="handleQuery">搜索</el-button>
          <el-button type="text" size="small" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>

      <div class="page-actions">
        <el-button
          v-if="!multiple && $auth.hasPermi('sys:dict:del')"
          type="danger"
          plain
          icon="el-icon-delete"
          size="small"
          @click="handleDelete()"
        >删除</el-button>
        <el-button
          v-hasPermi="['sys:dict:add']"
          type="primary"
          icon="el-icon-plus"
          size="small"
          @click="handleAdd"
        >新增</el-button>
        <el-button
          v-hasPermi="['sys:dict:del']"
          icon="el-icon-refresh"
          size="small"
          @click="handleRefreshCache"
        >刷新缓存</el-button>
      </div>
    </div>

    <div class="page-body">
      <el-table
        ref="table"
        v-loading="loading"
        :data="dictList"
        row-key="dictId"
        height="100%"
        highlight-current-row
        @selection-change="handleSelectionChange"
        @current-change="handleCurrentChange"
      >
        <el-table-column type="selection" width="46" align="center" />
        <el-table-column label="字典名称" align="left" prop="dictName" show-overflow-tooltip />
        <el-table-column label="字典类型" align="left" prop="dictType" class-name="mono-cell" show-overflow-tooltip />
        <el-table-column label="操作" align="center" width="120" class-name="small-padding">
          <template slot-scope="scope">
            <el-button
              v-hasPermi="['sys:dict:edit']"
              size="mini"
              type="text"
              @click.stop="handleUpdate(scope.row)"
            >修改</el-button>
            <el-button
              v-hasPermi="['sys:dict:del']"
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
        :pager-count="5"
        layout="total, sizes, prev, pager, next"
        @pagination="getList"
      />
    </div>

    <el-dialog :title="dialogTitle" :visible.sync="dialogFormVisible" width="520px" append-to-body>
      <el-form ref="form" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="字典名称" prop="dictName">
          <el-input v-model="form.dictName" placeholder="字典名称" maxlength="30" />
        </el-form-item>
        <el-form-item label="字典类型" prop="dictType">
          <el-input v-model="form.dictType" placeholder="字典类型" maxlength="30" />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio v-for="dict in dict.type.dict_status" :key="dict.value" :label="dict.value">{{ dict.label }}</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注">
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
import { listType, getType, delType, addType, updateType, refreshCache } from '@/api/sys/dict/type'

export default {
  name: 'DictType',
  dicts: ['dict_status'],
  data() {
    return {
      ids: [],
      multiple: true,
      queryParams: {
        pageNum: 1,
        pageSize: 10,
        dictName: undefined
      },
      dictList: [],
      activeDictId: undefined,
      activeDictType: undefined,
      total: 0,
      loading: false,
      form: {},
      dialogTitle: '',
      dialogFormVisible: false,
      rules: {
        dictName: [{ required: true, message: '字典名称不能为空', trigger: 'blur' }],
        dictType: [{ required: true, message: '字典类型不能为空', trigger: 'blur' }]
      }
    }
  },
  created() {
    this.getList()
  },
  methods: {
    getList() {
      this.loading = true
      listType(this.queryParams)
        .then(response => {
          this.dictList = response.records || []
          this.total = response.total || 0
          this.$nextTick(() => {
            if (!this.dictList.length) {
              this.activeDictId = undefined
              this.activeDictType = ''
              this.$emit('update:value', '')
              return
            }
            const kept = this.activeDictId
              ? this.dictList.find(item => item.dictId === this.activeDictId)
              : null
            const target = kept || this.dictList[0]
            this.$refs.table && this.$refs.table.setCurrentRow(target)
            this.activeDictId = target.dictId
            if (target.dictType !== this.activeDictType) {
              this.activeDictType = target.dictType
              this.$emit('update:value', target.dictType)
            }
          })
        })
        .finally(() => {
          this.loading = false
        })
    },
    resetQuery() {
      this.resetForm('queryForm')
      this.handleQuery()
    },
    handleSelectionChange(selection) {
      this.ids = selection.map(item => item.dictId)
      this.multiple = !selection.length
    },
    handleCurrentChange(row) {
      if (!row) {
        if (!this.dictList.length) {
          this.activeDictId = undefined
          this.activeDictType = ''
          this.$emit('update:value', '')
        }
        return
      }
      this.activeDictId = row.dictId
      this.activeDictType = row.dictType
      this.$emit('update:value', row.dictType)
    },
    cancel() {
      this.dialogFormVisible = false
      this.reset()
    },
    reset() {
      this.form = {
        dictId: undefined,
        dictName: undefined,
        dictType: undefined,
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
      this.dialogTitle = '新增字典'
    },
    handleUpdate(row) {
      this.reset()
      getType(row.dictId).then(response => {
        this.form = response
        this.dialogFormVisible = true
        this.dialogTitle = '编辑字典'
      })
    },
    handleDelete(row) {
      const dictIds = (row && row.dictId) || this.ids
      const message = row && row.dictId
        ? `确认删除字典“${row.dictName}”吗？`
        : `确认删除选中的 ${dictIds.length} 项字典吗？`
      this.$modal
        .confirm(message)
        .then(() => delType(dictIds))
        .then(() => {
          this.getList()
          this.$modal.msgSuccess('删除成功')
        })
        .catch(() => {})
    },
    submitForm() {
      this.$refs.form.validate(valid => {
        if (!valid) return
        if (this.form.dictId != undefined) {
          updateType(this.form).then(() => {
            this.$modal.msgSuccess('修改成功')
            this.dialogFormVisible = false
            this.getList()
          })
        } else {
          addType(this.form).then(() => {
            this.$modal.msgSuccess('新增成功')
            this.dialogFormVisible = false
            this.getList()
          })
        }
      })
    },
    handleRefreshCache() {
      refreshCache().then(() => {
        this.$modal.msgSuccess('刷新成功')
        this.$store.dispatch('dict/cleanDict')
      })
    }
  }
}
</script>
