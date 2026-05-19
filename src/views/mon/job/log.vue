<template>
  <el-container>
    <el-header>
      <el-form inline label-position="right" class="query-form" size="small">
        <el-form-item prop="jobName">
          <el-input v-model="queryParams.jobName" placeholder="请输入任务名称" clearable style="width: 240px" @keyup.enter.native="handleQuery" />
        </el-form-item>
        <el-form-item prop="jobGroup">
          <el-select v-model="queryParams.jobGroup" placeholder="请选择任务组名" clearable style="width: 240px">
            <el-option v-for="dict in dict.type.job_group" :key="dict.value" :label="dict.label" :value="dict.value" />
          </el-select>
        </el-form-item>
        <el-form-item prop="status">
          <el-select v-model="queryParams.status" placeholder="请选择执行状态" clearable style="width: 240px">
            <el-option v-for="dict in dict.type.common_status" :key="dict.value" :label="dict.label" :value="dict.value" />
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
          <el-button
            type="danger"
            plain
            icon="el-icon-delete"
            size="mini"
            :disabled="multiple"
            @click="handleDelete"
            v-hasPermi="['mon:job:del']"
          >删除</el-button>
        </el-col>
        <el-col :span="1.5">
          <el-button type="danger" plain icon="el-icon-delete" size="mini" @click="handleClean" v-hasPermi="['mon:job:del']">清空</el-button>
        </el-col>
        <el-col :span="1.5">
          <el-button type="warning" plain icon="el-icon-close" size="mini" @click="handleClose">关闭</el-button>
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
        :data="jobLogList"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" align="center" />
        <el-table-column label="任务名称" align="center" prop="jobName" :show-overflow-tooltip="true" />
        <el-table-column label="任务组名" align="center" prop="jobGroup" :show-overflow-tooltip="true">
          <template slot-scope="scope">
            <dict-tag :options="dict.type.job_group" :value="scope.row.jobGroup" />
          </template>
        </el-table-column>
        <el-table-column label="调用目标字符串" align="center" prop="invokeTarget" :show-overflow-tooltip="true" />
        <el-table-column label="日志信息" align="center" prop="jobMessage" :show-overflow-tooltip="true" />
        <el-table-column label="执行状态" align="center" prop="status">
          <template slot-scope="scope">
            <dict-tag :options="dict.type.common_status" :value="scope.row.status" />
          </template>
        </el-table-column>
        <el-table-column label="执行时间" align="center" prop="createTime" width="180">
          <template slot-scope="scope">
            <span>{{ parseTime(scope.row.createTime) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" align="center" class-name="small-padding fixed-width">
          <template slot-scope="scope">
            <el-button size="mini" type="text" icon="el-icon-view" @click="handleView(scope.row)" v-hasPermi="['mon:job:list']">详细</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 添加或修改字典配置对话框 -->
      <el-dialog title="调度日志详细" :visible.sync="dialogFormVisible" width="600px" append-to-body>
        <el-form ref="form" :model="form" label-width="100px" size="mini">
          <el-row>
            <el-col :span="12">
              <el-form-item label="任务名称：">{{ form.jobName }}</el-form-item>
              <el-form-item label="任务分组：">{{ form.jobGroup }}</el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="执行时间：">{{ form.createTime }}</el-form-item>
            </el-col>
            <el-col :span="24">
              <el-form-item label="调用方法：">{{ form.invokeTarget }}</el-form-item>
            </el-col>
            <el-col :span="24">
              <el-form-item label="日志信息：">{{ form.jobMessage }}</el-form-item>
            </el-col>
            <el-col :span="24">
              <el-form-item label="执行状态：">
                <div v-if="form.status == 0">正常</div>
                <div v-else-if="form.status == 1">失败</div>
              </el-form-item>
            </el-col>
            <el-col :span="24">
              <el-form-item label="异常信息：" v-if="form.status == 1">{{ form.exceptionInfo }}</el-form-item>
            </el-col>
          </el-row>
        </el-form>
        <div slot="footer" class="dialog-footer">
          <el-button @click="dialogFormVisible = false">关 闭</el-button>
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
import { getJob } from '@/api/mon/job'
import { listJobLog, delJobLog, cleanJobLog } from '@/api/mon/jobLog'

export default {
  name: 'JobLog',
  dicts: ['common_status', 'job_group'],
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
        jobName: undefined,
        jobGroup: undefined,
        status: undefined
      },
      // 字典表格数据
      jobLogList: [],
      // 总条数
      total: 0,
      // 遮罩层
      loading: false,
      // 表单参数
      form: {},
      dialogTitle: null,
      // 对话框表单可见
      dialogFormVisible: false
    }
  },
  created() {
    const jobId = this.$route.query.jobId
    if (jobId !== undefined && jobId != 0) {
      getJob(jobId).then(response => {
        this.queryParams.jobName = response.data.jobName
        this.queryParams.jobGroup = response.data.jobGroup
        this.getList()
      })
    } else {
      this.getList()
    }
  },
  methods: {
    /** 查询字典列表 */
    getList() {
      this.loading = true
      listJobLog(this.addDateRange(this.queryParams, this.dateRange)).then(response => {
        this.jobLogList = response.records
        this.total = response.total
        this.loading = false
      })
    },
    // 返回按钮
    handleClose() {
      const obj = { path: '/mon/job' }
      this.$tab.closeOpenPage(obj)
    },
    /** 重置按钮操作 */
    resetQuery() {
      this.dateRange = []
      this.resetForm('queryForm')
      this.handleQuery()
    },
    // 多选框选中数据
    handleSelectionChange(selection) {
      this.ids = selection.map(item => item.dictId)
      this.single = selection.length != 1
      this.multiple = !selection.length
    },
    /** 详细按钮操作 */
    handleView(row) {
      this.dialogFormVisible = true;
      this.form = row;
    },
    /** 搜索按钮操作 */
    handleQuery() {
      this.queryParams.pageNum = 1
      this.getList()
    },
    /** 删除按钮操作 */
    handleDelete(row) {
      const dictIds = row.dictId || this.ids
      this.$modal
        .confirm('是否确认删除字典编号为"' + dictIds + '"的数据项？')
        .then(function () {
          return delJobLog(dictIds)
        })
        .then(() => {
          this.getList()
          this.$modal.msgSuccess('删除成功')
        })
        .catch(() => {})
    },
    /** 清空按钮操作 */
    handleClean() {
      this.$modal
        .confirm('是否确认清空所有调度日志数据项？')
        .then(function () {
          return cleanJobLog()
        })
        .then(() => {
          this.getList()
          this.$modal.msgSuccess('清空成功')
        })
        .catch(() => {})
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
  border: 1px solid #d7dae2;
}
.query-form {
  padding-top: 20px;
  background-color: #f2f2f2;
  padding-left: 20px;
}
</style>
