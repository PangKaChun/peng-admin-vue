<template>
  <el-container>
    <el-header>
      <el-form ref="queryForm" :model="queryParams" inline label-position="right" class="query-form" size="small">
        <el-form-item prop="jobName">
          <el-input v-model="queryParams.jobName" placeholder="请输入任务名称" clearable style="width: 220px" @keyup.enter.native="handleQuery" />
        </el-form-item>
        <el-form-item prop="jobGroup">
          <el-select v-model="queryParams.jobGroup" placeholder="请选择任务分组" clearable style="width: 180px">
            <el-option v-for="dict in dict.type.job_group" :key="dict.value" :label="dict.label" :value="dict.value" />
          </el-select>
        </el-form-item>
        <el-form-item prop="status">
          <el-select v-model="queryParams.status" placeholder="请选择执行状态" clearable style="width: 160px">
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
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="el-icon-search" size="mini" @click="handleQuery">搜索</el-button>
          <el-button icon="el-icon-refresh" size="mini" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>

      <el-row :gutter="10" class="button-bar">
        <el-col :span="1.5">
          <el-button type="danger" plain icon="el-icon-delete" size="mini" :disabled="multiple" @click="handleDelete()" v-hasPermi="['mon:job:del']">删除</el-button>
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
        @row-dblclick="handleView"
      >
        <el-table-column type="selection" width="50" align="center" />
        <el-table-column label="任务名称" align="left" prop="jobName" min-width="140" :show-overflow-tooltip="true" />
        <el-table-column label="任务分组" align="center" prop="jobGroup" width="105">
          <template slot-scope="scope">
            <dict-tag :options="dict.type.job_group" :value="scope.row.jobGroup" />
          </template>
        </el-table-column>
        <el-table-column label="调用目标" align="left" prop="invokeTarget" min-width="190" class-name="mono-cell" :show-overflow-tooltip="true" />
        <el-table-column label="日志信息" align="left" prop="jobMessage" min-width="200" :show-overflow-tooltip="true" />
        <el-table-column label="执行状态" align="center" prop="status" width="95">
          <template slot-scope="scope">
            <dict-tag :options="dict.type.common_status" :value="scope.row.status" />
          </template>
        </el-table-column>
        <el-table-column label="执行时间" align="center" prop="createTime" width="170" class-name="num-cell">
          <template slot-scope="scope">
            <span>{{ parseTime(scope.row.createTime) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" align="center" width="85" fixed="right" class-name="small-padding fixed-width">
          <template slot-scope="scope">
            <el-button size="mini" type="text" icon="el-icon-view" @click="handleView(scope.row)" v-hasPermi="['mon:job:list']">详细</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 调度日志详细 -->
      <el-dialog title="调度日志详细" :visible.sync="dialogFormVisible" width="720px" append-to-body>
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="任务名称">{{ form.jobName }}</el-descriptions-item>
          <el-descriptions-item label="任务分组">
            <dict-tag :options="dict.type.job_group" :value="form.jobGroup" />
          </el-descriptions-item>
          <el-descriptions-item label="执行状态">
            <dict-tag :options="dict.type.common_status" :value="form.status" />
          </el-descriptions-item>
          <el-descriptions-item label="执行时间">{{ parseTime(form.createTime) }}</el-descriptions-item>
          <el-descriptions-item label="调用目标" :span="2">
            <code class="mono-text">{{ form.invokeTarget }}</code>
          </el-descriptions-item>
          <el-descriptions-item label="日志信息" :span="2">{{ form.jobMessage }}</el-descriptions-item>
          <el-descriptions-item v-if="form.exceptionInfo" label="异常信息" :span="2">
            <pre class="exception-pre">{{ form.exceptionInfo }}</pre>
          </el-descriptions-item>
        </el-descriptions>
        <div slot="footer" class="dialog-footer">
          <el-button @click="dialogFormVisible = false">关闭</el-button>
        </div>
      </el-dialog>
    </el-main>
    <el-footer>
      <pagination
        v-show="total > 0"
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
      ids: [],
      multiple: true,
      dateRange: [],
      queryParams: {
        pageNum: 1,
        pageSize: 10,
        jobName: undefined,
        jobGroup: undefined,
        status: undefined
      },
      jobLogList: [],
      total: 0,
      loading: false,
      form: {},
      dialogFormVisible: false
    }
  },
  created() {
    const jobId = this.$route.params.jobId
    if (jobId && jobId != 0) {
      getJob(jobId)
        .then(response => {
          this.queryParams.jobName = response.jobName
          this.queryParams.jobGroup = response.jobGroup
        })
        .finally(() => {
          this.getList()
        })
    } else {
      this.getList()
    }
  },
  methods: {
    /** 查询调度日志列表 */
    getList() {
      this.loading = true
      listJobLog(this.addDateRange(this.queryParams, this.dateRange))
        .then(response => {
          this.jobLogList = response.records
          this.total = response.total
        })
        .finally(() => {
          this.loading = false
        })
    },
    /** 返回按钮 */
    handleClose() {
      this.$tab.closeOpenPage({ path: '/mon/job' })
    },
    /** 搜索按钮操作 */
    handleQuery() {
      this.queryParams.pageNum = 1
      this.getList()
    },
    /** 重置按钮操作 */
    resetQuery() {
      this.dateRange = []
      this.resetForm('queryForm')
      this.handleQuery()
    },
    /** 多选框选中数据 */
    handleSelectionChange(selection) {
      this.ids = selection.map(item => item.jobLogId)
      this.multiple = !selection.length
    },
    /** 详细按钮操作（双击行同效） */
    handleView(row) {
      this.form = row
      this.dialogFormVisible = true
    },
    /** 删除按钮操作 */
    handleDelete(row) {
      const jobLogIds = (row && row.jobLogId) || this.ids
      const message = row
        ? '确认删除该条调度日志吗？'
        : '确认删除选中的 ' + jobLogIds.length + ' 条调度日志吗？'
      this.$modal
        .confirm(message)
        .then(() => delJobLog(jobLogIds))
        .then(() => {
          this.getList()
          this.$modal.msgSuccess('删除成功')
        })
        .catch(() => {})
    },
    /** 清空按钮操作 */
    handleClean() {
      this.$modal
        .confirm('确认清空所有调度日志吗？')
        .then(() => cleanJobLog())
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
$font-mono: SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace;

::v-deep .el-table__body .mono-cell .cell,
.mono-text {
  font-family: $font-mono;
  font-size: 12px;
}

.mono-text {
  word-break: break-all;
}

::v-deep .el-table__body .num-cell .cell {
  font-variant-numeric: tabular-nums;
}

.exception-pre {
  margin: 0;
  max-height: 280px;
  overflow: auto;
  font-family: $font-mono;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
