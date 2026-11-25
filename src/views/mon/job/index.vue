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
          <el-select v-model="queryParams.status" placeholder="状态" clearable style="width: 110px">
            <el-option v-for="dict in dict.type.job_status" :key="dict.value" :label="dict.label" :value="dict.value" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button icon="el-icon-search" size="small" @click="handleQuery">搜索</el-button>
          <el-button type="text" size="small" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>

      <div class="page-actions">
        <el-button
          v-hasPermi="['mon:job:add']"
          type="primary"
          icon="el-icon-plus"
          size="small"
          @click="handleAdd"
        >新增</el-button>
        <el-button
          v-hasPermi="['mon:job:list']"
          icon="el-icon-s-operation"
          size="small"
          @click="handleJobLog()"
        >调度日志</el-button>
        <el-button
          v-if="!multiple && $auth.hasPermi('mon:job:del')"
          type="danger"
          plain
          icon="el-icon-delete"
          size="small"
          @click="handleDelete()"
        >删除</el-button>
      </div>
    </div>

    <div class="page-body">
      <el-table
        v-loading="loading"
        :data="jobList"
        height="100%"
        highlight-current-row
        @selection-change="handleSelectionChange"
        @row-dblclick="handleView"
      >
        <el-table-column type="selection" width="46" align="center" />
        <el-table-column label="任务名称" align="left" prop="jobName" min-width="150" show-overflow-tooltip />
        <el-table-column label="任务分组" align="center" prop="jobGroup" width="110">
          <template slot-scope="scope">
            <dict-tag :options="dict.type.job_group" :value="scope.row.jobGroup" />
          </template>
        </el-table-column>
        <el-table-column label="调用目标" align="left" prop="invokeTarget" min-width="200" class-name="mono-cell" show-overflow-tooltip />
        <el-table-column label="Cron 表达式" align="left" prop="cronExpression" min-width="150" class-name="mono-cell" show-overflow-tooltip />
        <el-table-column label="状态" align="center" width="84">
          <template slot-scope="scope">
            <el-switch
              v-model="scope.row.status"
              active-value="0"
              inactive-value="1"
              :disabled="!$auth.hasPermi('mon:job:changeStatus')"
              @change="handleStatusChange(scope.row)"
            />
          </template>
        </el-table-column>
        <el-table-column label="操作" align="center" width="170" fixed="right" class-name="small-padding">
          <template slot-scope="scope">
            <el-button
              v-hasPermi="['mon:job:edit']"
              size="mini"
              type="text"
              @click="handleUpdate(scope.row)"
            >修改</el-button>
            <el-button
              v-hasPermi="['mon:job:del']"
              size="mini"
              type="text"
              @click="handleDelete(scope.row)"
            >删除</el-button>
            <el-dropdown
              v-hasPermi="['mon:job:changeStatus', 'mon:job:list']"
              size="mini"
              @command="command => handleCommand(command, scope.row)"
            >
              <span class="el-dropdown-link">
                更多<i class="el-icon-arrow-down el-icon--right" />
              </span>
              <el-dropdown-menu slot="dropdown">
                <el-dropdown-item v-hasPermi="['mon:job:changeStatus']" command="handleRun" icon="el-icon-caret-right">执行一次</el-dropdown-item>
                <el-dropdown-item v-hasPermi="['mon:job:list']" command="handleView" icon="el-icon-view">任务详情</el-dropdown-item>
                <el-dropdown-item v-hasPermi="['mon:job:list']" command="handleJobLog" icon="el-icon-s-operation">调度日志</el-dropdown-item>
              </el-dropdown-menu>
            </el-dropdown>
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

    <el-dialog :title="dialogTitle" :visible.sync="dialogFormVisible" width="680px" append-to-body>
      <el-form ref="form" :model="form" :rules="rules" label-width="104px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="任务名称" prop="jobName">
              <el-input v-model="form.jobName" placeholder="任务名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="任务分组" prop="jobGroup">
              <el-select v-model="form.jobGroup" placeholder="选择分组">
                <el-option v-for="dict in dict.type.job_group" :key="dict.value" :label="dict.label" :value="dict.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="调用目标" prop="invokeTarget">
              <el-input
                v-model="form.invokeTarget"
                placeholder="如 rjTask.rjParams('rj') 或 com.example.SampleTask.run('arg')"
                class="mono-input"
              />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="Cron 表达式" prop="cronExpression">
              <el-input v-model="form.cronExpression" placeholder="如 0/10 * * * * ?" class="mono-input">
                <template slot="append">
                  <el-button @click="handleShowCron">生成表达式</el-button>
                </template>
              </el-input>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="执行策略" prop="misfirePolicy">
              <el-radio-group v-model="form.misfirePolicy" size="small">
                <el-radio-button label="1">立即执行</el-radio-button>
                <el-radio-button label="2">执行一次</el-radio-button>
                <el-radio-button label="3">放弃执行</el-radio-button>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="并发执行" prop="concurrent">
              <el-radio-group v-model="form.concurrent" size="small">
                <el-radio-button label="0">允许</el-radio-button>
                <el-radio-button label="1">禁止</el-radio-button>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="任务状态">
              <el-radio-group v-model="form.status">
                <el-radio v-for="dict in dict.type.job_status" :key="dict.value" :label="dict.value">{{ dict.label }}</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <div slot="footer">
        <el-button @click="cancel">取消</el-button>
        <el-button type="primary" @click="submitForm">确定</el-button>
      </div>
    </el-dialog>

    <el-dialog title="Cron 表达式生成器" :visible.sync="openCron" width="700px" append-to-body destroy-on-close class="scrollbar">
      <crontab :expression="expression" @hide="openCron = false" @fill="crontabFill" />
    </el-dialog>

    <el-dialog title="任务详情" :visible.sync="openView" width="680px" append-to-body>
      <el-descriptions :column="2" border size="small">
        <el-descriptions-item label="任务编号">{{ detail.jobId }}</el-descriptions-item>
        <el-descriptions-item label="任务名称">{{ detail.jobName }}</el-descriptions-item>
        <el-descriptions-item label="任务分组">
          <dict-tag :options="dict.type.job_group" :value="detail.jobGroup" />
        </el-descriptions-item>
        <el-descriptions-item label="任务状态">
          <dict-tag :options="dict.type.job_status" :value="detail.status" />
        </el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ detail.createTime }}</el-descriptions-item>
        <el-descriptions-item label="下次执行">{{ parseTime(detail.nextValidTime) || '-' }}</el-descriptions-item>
        <el-descriptions-item label="Cron 表达式">
          <code class="mono-text">{{ detail.cronExpression }}</code>
        </el-descriptions-item>
        <el-descriptions-item label="并发执行">{{ detail.concurrent == 0 ? '允许' : '禁止' }}</el-descriptions-item>
        <el-descriptions-item label="执行策略" :span="2">{{ misfirePolicyMap[detail.misfirePolicy] }}</el-descriptions-item>
        <el-descriptions-item label="调用目标" :span="2">
          <code class="mono-text">{{ detail.invokeTarget }}</code>
        </el-descriptions-item>
      </el-descriptions>
      <div slot="footer">
        <el-button @click="openView = false">关闭</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { listJob, getJob, delJob, addJob, updateJob, runJob, changeJobStatus } from '@/api/mon/job'
import Crontab from '@/components/Crontab'

const MISFIRE_POLICY_MAP = {
  '0': '默认策略',
  '1': '立即执行',
  '2': '执行一次',
  '3': '放弃执行'
}

export default {
  name: 'Job',
  components: { Crontab },
  dicts: ['job_group', 'job_status'],
  data() {
    return {
      ids: [],
      multiple: true,
      queryParams: {
        pageNum: 1,
        pageSize: 10,
        jobName: undefined,
        jobGroup: undefined,
        status: undefined
      },
      jobList: [],
      total: 0,
      loading: false,
      openView: false,
      detail: {},
      misfirePolicyMap: MISFIRE_POLICY_MAP,
      openCron: false,
      expression: '',
      form: {},
      dialogTitle: '',
      dialogFormVisible: false,
      rules: {
        jobName: [{ required: true, message: '任务名称不能为空', trigger: 'blur' }],
        invokeTarget: [{ required: true, message: '调用目标字符串不能为空', trigger: 'blur' }],
        cronExpression: [{ required: true, message: 'Cron 执行表达式不能为空', trigger: 'blur' }]
      }
    }
  },
  created() {
    this.getList()
  },
  methods: {
    getList() {
      this.loading = true
      listJob(this.queryParams)
        .then(response => {
          this.jobList = response.records
          this.total = response.total
        })
        .finally(() => {
          this.loading = false
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
    handleSelectionChange(selection) {
      this.ids = selection.map(item => item.jobId)
      this.multiple = !selection.length
    },
    handleCommand(command, row) {
      if (command === 'handleRun') this.handleRun(row)
      else if (command === 'handleView') this.handleView(row)
      else if (command === 'handleJobLog') this.handleJobLog(row)
    },
    handleStatusChange(row) {
      const text = row.status === '0' ? '启用' : '停用'
      const revertStatus = row.status === '0' ? '1' : '0'
      this.$modal
        .confirm('确认要' + text + '任务“' + row.jobName + '”吗？')
        .then(() => changeJobStatus(row.jobId, row.status))
        .then(() => {
          this.$modal.msgSuccess(text + '成功')
        })
        .catch(() => {
          row.status = revertStatus
        })
    },
    handleRun(row) {
      this.$modal
        .confirm('确认要立即执行一次任务“' + row.jobName + '”吗？')
        .then(() => runJob(row.jobId, row.jobGroup))
        .then(() => {
          this.$modal.msgSuccess('执行成功')
        })
        .catch(() => {})
    },
    handleView(row) {
      getJob(row.jobId).then(response => {
        this.detail = response
        this.openView = true
      })
    },
    handleShowCron() {
      this.expression = this.form.cronExpression
      this.openCron = true
    },
    crontabFill(value) {
      this.form.cronExpression = value
      this.$refs.form.validateField('cronExpression')
    },
    handleJobLog(row) {
      const jobId = (row && row.jobId) || 0
      this.$router.push({ path: '/mon/job-log/index/' + jobId })
    },
    cancel() {
      this.dialogFormVisible = false
      this.reset()
    },
    reset() {
      this.form = {
        jobId: undefined,
        jobName: undefined,
        jobGroup: undefined,
        invokeTarget: undefined,
        cronExpression: undefined,
        misfirePolicy: '1',
        concurrent: '1',
        status: '0'
      }
      this.$nextTick(() => {
        this.$refs.form && this.$refs.form.clearValidate()
      })
    },
    handleAdd() {
      this.reset()
      this.dialogFormVisible = true
      this.dialogTitle = '新增任务'
    },
    handleUpdate(row) {
      this.reset()
      const jobId = (row && row.jobId) || this.ids[0]
      getJob(jobId).then(response => {
        this.form = {
          ...response,
          misfirePolicy: String(response.misfirePolicy),
          concurrent: String(response.concurrent)
        }
        this.dialogFormVisible = true
        this.dialogTitle = '编辑任务'
      })
    },
    handleDelete(row) {
      const jobIds = (row && row.jobId) || this.ids
      const message = row
        ? '确认删除定时任务“' + row.jobName + '”吗？'
        : '确认删除选中的 ' + jobIds.length + ' 项定时任务吗？'
      this.$modal
        .confirm(message)
        .then(() => delJob(jobIds))
        .then(() => {
          this.getList()
          this.$modal.msgSuccess('删除成功')
        })
        .catch(() => {})
    },
    submitForm() {
      this.$refs.form.validate(valid => {
        if (!valid) return
        const isUpdate = this.form.jobId !== undefined
        const req = isUpdate ? updateJob(this.form) : addJob(this.form)
        req.then(() => {
          this.$modal.msgSuccess(isUpdate ? '修改成功' : '新增成功')
          this.dialogFormVisible = false
          this.getList()
        })
      })
    }
  }
}
</script>

<style lang="scss" scoped>
@import '../../../assets/styles/tokens.scss';

.mono-input ::v-deep .el-input__inner {
  font-family: $font-mono;
  font-size: 12px;
}

.mono-text {
  word-break: break-all;
}
</style>
