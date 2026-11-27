<template>
  <div class="page">
    <div class="page-toolbar">
      <el-form ref="queryForm" :model="queryParams" inline size="small" class="page-filters" @submit.native.prevent>
        <el-form-item prop="jobName">
          <el-input
            v-model="queryParams.jobName"
            placeholder="任务名称"
            clearable
            style="width: 180px"
            @keyup.enter.native="handleQuery"
          />
        </el-form-item>
        <el-form-item prop="jobGroup">
          <el-select v-model="queryParams.jobGroup" placeholder="任务分组" clearable style="width: 130px">
            <el-option v-for="dict in dict.type.job_group" :key="dict.value" :label="dict.label" :value="dict.value" />
          </el-select>
        </el-form-item>
        <el-form-item prop="status">
          <el-select v-model="queryParams.status" placeholder="执行状态" clearable style="width: 120px">
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
          <el-button icon="el-icon-search" size="small" @click="handleQuery">搜索</el-button>
          <el-button type="text" size="small" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>

      <div class="page-actions">
        <el-button
          v-if="!multiple && $auth.hasPermi('mon:job:del')"
          type="danger"
          plain
          icon="el-icon-delete"
          size="small"
          @click="handleDelete()"
        >删除</el-button>
        <el-button
          v-hasPermi="['mon:job:del']"
          icon="el-icon-brush"
          size="small"
          @click="handleClean"
        >清空</el-button>
        <el-button icon="el-icon-close" size="small" @click="handleClose">关闭</el-button>
      </div>
    </div>

    <div class="page-body">
      <el-table
        v-loading="loading"
        :data="jobLogList"
        height="100%"
        highlight-current-row
        @selection-change="handleSelectionChange"
        @row-dblclick="handleView"
      >
        <el-table-column type="selection" width="46" align="center" />
        <el-table-column label="任务名称" align="left" prop="jobName" min-width="140" show-overflow-tooltip />
        <el-table-column label="任务分组" align="center" prop="jobGroup" width="105">
          <template slot-scope="scope">
            <dict-tag :options="dict.type.job_group" :value="scope.row.jobGroup" />
          </template>
        </el-table-column>
        <el-table-column label="调用目标" align="left" prop="invokeTarget" min-width="190" class-name="mono-cell" show-overflow-tooltip />
        <el-table-column label="日志信息" align="left" prop="jobMessage" min-width="200" show-overflow-tooltip />
        <el-table-column label="执行状态" align="center" prop="status" width="90">
          <template slot-scope="scope">
            <dict-tag :options="dict.type.common_status" :value="scope.row.status" />
          </template>
        </el-table-column>
        <el-table-column label="执行时间" align="center" prop="createTime" width="160">
          <template slot-scope="scope">
            <span>{{ parseTime(scope.row.createTime) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" align="center" width="80" fixed="right" class-name="small-padding">
          <template slot-scope="scope">
            <el-button
              v-hasPermi="['mon:job:list']"
              size="mini"
              type="text"
              @click="handleView(scope.row)"
            >详情</el-button>
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

    <el-dialog title="调度日志详情" :visible.sync="dialogFormVisible" width="680px" append-to-body>
      <el-descriptions :column="2" size="small" :colon="false">
        <el-descriptions-item label="任务名称">{{ form.jobName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="任务分组">
          <dict-tag :options="dict.type.job_group" :value="form.jobGroup" />
        </el-descriptions-item>
        <el-descriptions-item label="执行状态">
          <dict-tag :options="dict.type.common_status" :value="form.status" />
        </el-descriptions-item>
        <el-descriptions-item label="执行时间">{{ parseTime(form.createTime) || '-' }}</el-descriptions-item>
        <el-descriptions-item label="调用目标" :span="2">
          <code class="mono-text">{{ form.invokeTarget || '-' }}</code>
        </el-descriptions-item>
        <el-descriptions-item label="日志信息" :span="2">{{ form.jobMessage || '-' }}</el-descriptions-item>
      </el-descriptions>

      <div v-if="form.exceptionInfo" class="job-exception">
        <div class="job-exception__head">
          <span class="job-exception__title">异常信息</span>
          <el-button type="text" size="mini" icon="el-icon-document-copy" @click="copyException(form.exceptionInfo)">复制</el-button>
        </div>
        <pre class="job-exception__pre">{{ form.exceptionInfo }}</pre>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { getJob } from '@/api/mon/job'
import { listJobLog, delJobLog, cleanJobLog } from '@/api/mon/jobLog'
import { copyText } from '@/utils/clipboard'

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
    handleClose() {
      this.$tab.closeOpenPage({ path: '/mon/job' })
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
    handleSelectionChange(selection) {
      this.ids = selection.map(item => item.jobLogId)
      this.multiple = !selection.length
    },
    handleView(row) {
      this.form = row
      this.dialogFormVisible = true
    },
    copyException(text) {
      copyText(text)
        .then(() => this.$modal.msgSuccess('已复制到剪贴板'))
        .catch(() => this.$modal.msgError('复制失败'))
    },
    handleDelete() {
      const jobLogIds = this.ids
      this.$modal
        .confirm(`确认删除选中的 ${jobLogIds.length} 条调度日志吗？`)
        .then(() => delJobLog(jobLogIds))
        .then(() => {
          this.getList()
          this.$modal.msgSuccess('删除成功')
        })
        .catch(() => {})
    },
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
@import '@/assets/styles/tokens.scss';

.job-exception {
  margin-top: $space-4;
  padding-top: $space-4;
  border-top: 1px solid $separator-light;

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: $space-2;

    .el-button {
      padding: 0;
    }
  }

  &__title {
    font-size: 12px;
    font-weight: 600;
    color: $color-danger;
  }

  &__pre {
    margin: 0;
    max-height: 280px;
    overflow: auto;
    padding: $space-3;
    font-family: $font-mono;
    font-size: 12px;
    line-height: 1.6;
    color: $label;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    background: rgba($color-danger, 0.04);
    border-radius: $radius-sm;
  }
}
</style>
