<template>
  <div class="page-content">
    <div class="page-header">
      <div class="page-header__title">
        <span>字典项</span>
        <span v-if="dictType" class="page-header__sub mono-text">{{ dictType }}</span>
      </div>
      <el-button
        v-if="dictType && $auth.hasPermi('sys:dict:add')"
        type="primary"
        icon="el-icon-plus"
        size="mini"
        @click="handleAdd"
      >新增</el-button>
    </div>

    <div class="page-body">
      <el-table
        v-if="dictType"
        v-loading="loading"
        :data="dataList"
        height="100%"
        highlight-current-row
      >
        <el-table-column type="index" width="50" align="center" />
        <el-table-column label="字典标签" align="left" prop="dictLabel">
          <template slot-scope="scope">
            <span v-if="!scope.row.listClass || scope.row.listClass === 'default'">{{ scope.row.dictLabel }}</span>
            <el-tag v-else :type="scope.row.listClass === 'primary' ? '' : scope.row.listClass">{{ scope.row.dictLabel }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="字典值" align="left" prop="dictValue" class-name="mono-cell" show-overflow-tooltip />
        <el-table-column label="排序" align="center" width="70" prop="dictSort" />
        <el-table-column label="操作" align="center" width="120" class-name="small-padding">
          <template slot-scope="scope">
            <el-button
              v-hasPermi="['sys:dict:edit']"
              size="mini"
              type="text"
              @click="handleUpdate(scope.row)"
            >修改</el-button>
            <el-button
              v-hasPermi="['sys:dict:del']"
              size="mini"
              type="text"
              @click="handleDelete(scope.row)"
            >删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div v-else-if="dictType === ''" class="page-empty">暂无字典</div>
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
        <el-row :gutter="16">
          <el-col :span="24">
            <el-form-item label="字典类型" prop="dictType">
              <el-input v-model="form.dictType" disabled maxlength="30" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="字典标签" prop="dictLabel">
              <el-input v-model="form.dictLabel" placeholder="字典标签" maxlength="30" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="字典键值" prop="dictValue">
              <el-input v-model="form.dictValue" placeholder="字典键值" maxlength="30" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="显示排序" prop="dictSort">
              <el-input-number v-model="form.dictSort" controls-position="right" :min="0" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="回显样式" prop="listClass">
              <el-select v-model="form.listClass">
                <el-option v-for="item in listClassOptions" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="状态">
              <el-radio-group v-model="form.status">
                <el-radio v-for="dict in dict.type.dict_status" :key="dict.value" :label="dict.value">{{ dict.label }}</el-radio>
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
  </div>
</template>

<script>
import { listData, getData, delData, addData, updateData } from '@/api/sys/dict/data'

export default {
  name: 'DictData',
  dicts: ['dict_status'],
  props: {
    dictType: String
  },
  data() {
    return {
      queryParams: {
        pageNum: 1,
        pageSize: 10,
        dictType: undefined
      },
      dataList: [],
      total: 0,
      loading: false,
      form: {},
      dialogTitle: '',
      dialogFormVisible: false,
      listClassOptions: [
        { value: 'default', label: '默认' },
        { value: 'primary', label: '主要' },
        { value: 'success', label: '成功' },
        { value: 'info', label: '信息' },
        { value: 'warning', label: '警告' },
        { value: 'danger', label: '危险' }
      ],
      rules: {
        dictSort: [{ required: true, message: '字典排序不能为空', trigger: 'blur' }],
        dictLabel: [{ required: true, message: '字典标签不能为空', trigger: 'blur' }],
        dictType: [{ required: true, message: '字典类型不能为空', trigger: 'blur' }],
        dictValue: [{ required: true, message: '字典键值不能为空', trigger: 'blur' }]
      }
    }
  },
  watch: {
    dictType: {
      immediate: true,
      handler(val) {
        this._reqSeq = (this._reqSeq || 0) + 1
        if (val) {
          this.queryParams.pageNum = 1
          this.queryParams.dictType = val
          this.getList()
        } else {
          this.queryParams.dictType = undefined
          this.dataList = []
          this.total = 0
          this.loading = false
        }
      }
    }
  },
  methods: {
    getList() {
      const targetType = this.queryParams.dictType
      if (!targetType) return
      const seq = ++this._reqSeq
      this.loading = true
      listData(this.queryParams)
        .then(response => {
          if (this._reqSeq !== seq) return
          this.dataList = response.records || []
          this.total = response.total || 0
        })
        .finally(() => {
          if (this._reqSeq === seq) {
            this.loading = false
          }
        })
    },
    cancel() {
      this.dialogFormVisible = false
      this.reset()
    },
    reset() {
      this.form = {
        dictCode: undefined,
        dictSort: 0,
        dictType: this.dictType,
        dictLabel: undefined,
        dictValue: undefined,
        listClass: 'default',
        status: '0',
        remark: undefined
      }
      this.$nextTick(() => {
        this.$refs.form && this.$refs.form.clearValidate()
      })
    },
    handleAdd() {
      this.reset()
      this.dialogFormVisible = true
      this.dialogTitle = '新增字典项'
    },
    handleUpdate(row) {
      this.reset()
      getData(row.dictCode).then(response => {
        this.form = response
        this.dialogFormVisible = true
        this.dialogTitle = '编辑字典项'
      })
    },
    handleDelete(row) {
      this.$modal
        .confirm(`确认删除字典项“${row.dictLabel}”吗？`)
        .then(() => delData(row.dictCode))
        .then(() => {
          this.getList()
          this.$modal.msgSuccess('删除成功')
        })
        .catch(() => {})
    },
    submitForm() {
      this.$refs.form.validate(valid => {
        if (!valid) return
        if (this.form.dictCode != undefined) {
          updateData(this.form).then(() => {
            this.$modal.msgSuccess('修改成功')
            this.dialogFormVisible = false
            this.getList()
          })
        } else {
          addData(this.form).then(() => {
            this.$modal.msgSuccess('新增成功')
            this.dialogFormVisible = false
            this.getList()
          })
        }
      })
    }
  }
}
</script>
