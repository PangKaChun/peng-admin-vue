<template>
  <div class="page">
    <div class="page-toolbar">
      <el-form ref="queryForm" :model="queryParams" inline size="small" class="page-filters" @submit.native.prevent>
        <el-form-item prop="configName">
          <el-input
            v-model="queryParams.configName"
            placeholder="参数名称"
            clearable
            style="width: 160px"
            @keyup.enter.native="handleQuery"
          />
        </el-form-item>
        <el-form-item prop="configKey">
          <el-input
            v-model="queryParams.configKey"
            placeholder="参数键名"
            clearable
            style="width: 160px"
            @keyup.enter.native="handleQuery"
          />
        </el-form-item>
        <el-form-item prop="configType">
          <el-select v-model="queryParams.configType" placeholder="系统内置" clearable style="width: 120px">
            <el-option v-for="dict in dict.type.config_type" :key="dict.value" :label="dict.label" :value="dict.value" />
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
          v-if="!multiple && $auth.hasPermi('sys:config:del')"
          type="danger"
          plain
          icon="el-icon-delete"
          size="small"
          @click="handleDelete()"
        >删除</el-button>
        <el-button
          v-hasPermi="['sys:config:add']"
          type="primary"
          icon="el-icon-plus"
          size="small"
          @click="handleAdd"
        >新增</el-button>
        <el-button
          v-hasPermi="['sys:config:del']"
          icon="el-icon-refresh"
          size="small"
          @click="handleRefreshCache"
        >刷新缓存</el-button>
      </div>
    </div>

    <div class="page-body">
      <el-table
        v-loading="loading"
        :data="configList"
        height="100%"
        highlight-current-row
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="46" align="center" />
        <el-table-column label="参数名称" align="left" prop="configName" min-width="140" show-overflow-tooltip />
        <el-table-column label="参数键名" align="left" prop="configKey" min-width="160" class-name="mono-cell" show-overflow-tooltip />
        <el-table-column label="参数键值" align="left" prop="configValue" min-width="140" class-name="mono-cell" show-overflow-tooltip />
        <el-table-column label="系统内置" align="center" prop="configType" width="90">
          <template slot-scope="scope">
            <dict-tag :options="dict.type.config_type" :value="scope.row.configType" />
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
              v-hasPermi="['sys:config:edit']"
              size="mini"
              type="text"
              @click="handleUpdate(scope.row)"
            >修改</el-button>
            <el-button
              v-hasPermi="['sys:config:del']"
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

    <el-dialog :title="title" :visible.sync="open" width="500px" append-to-body>
      <el-form ref="form" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="参数名称" prop="configName">
          <el-input v-model="form.configName" placeholder="参数名称" />
        </el-form-item>
        <el-form-item label="参数键名" prop="configKey">
          <el-input v-model="form.configKey" placeholder="参数键名" />
        </el-form-item>
        <el-form-item label="参数键值" prop="configValue">
          <el-input v-model="form.configValue" placeholder="参数键值" />
        </el-form-item>
        <el-form-item label="系统内置" prop="configType">
          <el-radio-group v-model="form.configType">
            <el-radio v-for="dict in dict.type.config_type" :key="dict.value" :label="dict.value">{{ dict.label }}</el-radio>
          </el-radio-group>
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
import { listConfig, getConfig, delConfig, addConfig, updateConfig, refreshCache } from '@/api/sys/config'

export default {
  name: 'Config',
  dicts: ['config_type'],
  data() {
    return {
      loading: false,
      ids: [],
      multiple: true,
      total: 0,
      configList: [],
      title: '',
      open: false,
      dateRange: [],
      queryParams: {
        pageNum: 1,
        pageSize: 10,
        configName: undefined,
        configKey: undefined,
        configType: undefined
      },
      form: {},
      rules: {
        configName: [{ required: true, message: '参数名称不能为空', trigger: 'blur' }],
        configKey: [{ required: true, message: '参数键名不能为空', trigger: 'blur' }],
        configValue: [{ required: true, message: '参数键值不能为空', trigger: 'blur' }]
      }
    }
  },
  created() {
    this.getList()
  },
  methods: {
    getList() {
      this.loading = true
      listConfig(this.addDateRange(this.queryParams, this.dateRange))
        .then(response => {
          this.configList = response.records
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
        configId: undefined,
        configName: undefined,
        configKey: undefined,
        configValue: undefined,
        configType: 'Y',
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
      this.dateRange = []
      this.resetForm('queryForm')
      this.handleQuery()
    },
    handleAdd() {
      this.reset()
      this.open = true
      this.title = '新增参数'
    },
    handleSelectionChange(selection) {
      this.ids = selection.map(item => item.configId)
      this.multiple = !selection.length
    },
    handleUpdate(row) {
      this.reset()
      getConfig(row.configId).then(response => {
        this.form = response
        this.open = true
        this.title = '编辑参数'
      })
    },
    submitForm() {
      this.$refs.form.validate(valid => {
        if (!valid) return
        if (this.form.configId != undefined) {
          updateConfig(this.form).then(() => {
            this.$modal.msgSuccess('修改成功')
            this.open = false
            this.getList()
          })
        } else {
          addConfig(this.form).then(() => {
            this.$modal.msgSuccess('新增成功')
            this.open = false
            this.getList()
          })
        }
      })
    },
    handleDelete(row) {
      const configIds = (row && row.configId) || this.ids
      const message = row && row.configId
        ? `确认删除参数“${row.configName}”吗？`
        : `确认删除选中的 ${configIds.length} 项参数吗？`
      this.$modal
        .confirm(message)
        .then(() => delConfig(configIds))
        .then(() => {
          this.getList()
          this.$modal.msgSuccess('删除成功')
        })
        .catch(() => {})
    },
    handleRefreshCache() {
      refreshCache().then(() => {
        this.$modal.msgSuccess('刷新成功')
      })
    }
  }
}
</script>
