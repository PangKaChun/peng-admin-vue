<template>
  <el-container>
    <el-main>
      <el-card class="box-card" shadow="never">
        <div slot="header" class="clearfix">
          <span class="dict-span">字典详情</span>
          <div style="float: right;" v-if="dictType">
            <el-button
              v-hasPermi="['sys:dict:add']"
              icon="el-icon-plus"
              size="mini"
              style="padding: 6px 9px"
              type="primary"
              @click="handleAdd"
            >新增</el-button>
          </div>
        </div>
        <el-table
          v-if="dictType"
          border
          highlight-current-row
          stripe
          height="100%"
          v-loading="loading"
          :data="dataList"
          @selection-change="handleSelectionChange"
        >
          <el-table-column type="index"></el-table-column>
          <el-table-column label="所属字典" align="center" key="dictType" prop="dictType" :show-overflow-tooltip="true" />
          <el-table-column label="字典标签" align="center" prop="dictLabel">
            <template slot-scope="scope">
              <span v-if="scope.row.listClass == '' || scope.row.listClass == 'default'">{{scope.row.dictLabel}}</span>
              <el-tag v-else :type="scope.row.listClass == 'primary' ? '' : scope.row.listClass">{{scope.row.dictLabel}}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="字典值" align="center" key="dictValue" prop="dictValue" :show-overflow-tooltip="true" />
          <el-table-column label="排序" align="center" width="60" key="dictSort" prop="dictSort" />
          <el-table-column label="操作" align="center" width="160" class-name="small-padding fixed-width">
            <template slot-scope="scope">
              <el-button size="mini" type="text" icon="el-icon-edit" @click="handleUpdate(scope.row)" v-hasPermi="['sys:dict:edit']">修改</el-button>
              <el-button size="mini" type="text" icon="el-icon-delete" @click="handleDelete(scope.row)" v-hasPermi="['sys:dict:del']">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
        <div style="padding: 20px" v-else>
          <div class="my-code">点击字典查看详情</div>
        </div>
      </el-card>

      <!-- 添加或修改字典配置对话框 -->
      <el-dialog :title="dialogTitle" :visible.sync="dialogFormVisible" width="600px" append-to-body>
        <el-form ref="form" :model="form" :rules="rules" label-width="80px">
          <el-row>
            <el-col :span="24">
              <el-form-item label="字典类型" prop="dictType">
                <el-input v-model="form.dictType" disabled placeholder="请输入字典类型" maxlength="30" />
              </el-form-item>
            </el-col>
            <el-col :span="24">
              <el-form-item label="字典标签" prop="dictLabel">
                <el-input v-model="form.dictLabel" placeholder="请输入字典标签" maxlength="30" />
              </el-form-item>
            </el-col>
            <el-col :span="24">
              <el-form-item label="字典键值" prop="dictValue">
                <el-input v-model="form.dictValue" placeholder="请输入字典标签" maxlength="30" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="显示排序" prop="dictSort">
                <el-input-number v-model="form.dictSort" controls-position="right" :min="0" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="回显样式" prop="listClass">
                <el-select v-model="form.listClass">
                  <el-option v-for="item in listClassOptions" :key="item.value" :label="item.label" :value="item.value"></el-option>
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="24">
              <el-form-item label="状态">
                <el-radio-group v-model="form.status">
                  <el-radio v-for="dict in dict.type.dict_status" :key="dict.value" :label="dict.value">{{dict.label}}</el-radio>
                </el-radio-group>
              </el-form-item>
            </el-col>
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
      // 选中数组
      ids: [],
      // 非单个禁用
      single: true,
      // 非多个禁用
      multiple: true,
      // 查询参数
      queryParams: {
        pageNum: 1,
        pageSize: 10,
        dictType: undefined
      },
      // 字典表格数据
      dataList: [],
      // 总条数
      total: 0,
      // 遮罩层
      loading: false,
      // 表单参数
      form: {},
      dialogTitle: null,
      // 对话框表单可见
      dialogFormVisible: false,
      // 数据标签回显样式
      listClassOptions: [
        {
          value: 'default',
          label: '默认'
        },
        {
          value: 'primary',
          label: '主要'
        },
        {
          value: 'success',
          label: '成功'
        },
        {
          value: 'info',
          label: '信息'
        },
        {
          value: 'warning',
          label: '警告'
        },
        {
          value: 'danger',
          label: '危险'
        }
      ],
      // 表单校验
      rules: {
        dictSort: [{ required: true, message: '字典排序不能为空', trigger: 'blur' }],
        dictLabel: [{ required: true, message: '字典标签不能为空', trigger: 'blur' }],
        dictType: [{ required: true, message: '字典类型不能为空', trigger: 'blur' }],
        dictValue: [{ required: true, message: '字典键值不能为空', trigger: 'blur' }]
      }
    }
  },
  watch: {
    dictType(val) {
      if (val) {
        this.queryParams.dictType = val
        this.getList()
      }
    }
  },
  methods: {
    /** 查询字典列表 */
    getList() {
      this.loading = true
      listData(this.queryParams).then(response => {
        this.dataList = response.records
        this.total = response.total
        this.loading = false
      })
    },
    /** 重置按钮操作 */
    resetQuery() {
      this.resetForm('queryForm')
      this.handleQuery()
    },
    // 多选框选中数据
    handleSelectionChange(selection) {
      this.ids = selection.map(item => item.dictCode)
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
        dictCode: undefined,
        dictSort: 0,
        dictType: this.dictType,
        dictLabel: undefined,
        dictValue: undefined,
        listClass: 'default',
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
      this.dialogTitle = '添加字典数据'
    },
    /** 修改按钮操作 */
    handleUpdate(row) {
      this.reset()
      const dictCode = row.dictCode || this.ids
      getData(dictCode).then(response => {
        this.form = response
        this.dialogFormVisible = true
        this.dialogTitle = '修改字典数据'
      })
    },
    /** 删除按钮操作 */
    handleDelete(row) {
      const dictCodes = row.dictCode || this.ids
      this.$modal
        .confirm('是否确认删除字典编号为"' + dictCodes + '"的数据项？')
        .then(function () {
          return delData(dictCodes)
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
          if (this.form.dictCode != undefined) {
            updateData(this.form).then(response => {
              this.$modal.msgSuccess('修改成功')
              this.dialogFormVisible = false
              this.getList()
            })
          } else {
            addData(this.form).then(response => {
              this.$modal.msgSuccess('新增成功')
              this.dialogFormVisible = false
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
.el-aside {
  border: 1px solid #d7dae2;
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
  border: 1px solid #d7dae2;
}
.query-form {
  padding-top: 20px;
  background-color: #f2f2f2;
  padding-left: 20px;
}
.dict-span {
  font-weight: bold;
  color: #303133;
  font-size: 15px;
  line-height: 26px;
}
.box-card {
  height: 100%;
  border-radius: 0;

  ::v-deep .el-card__body {
    height: calc(100% - 47px);
    padding: 0;
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
