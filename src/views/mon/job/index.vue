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
          <el-select v-model="queryParams.status" placeholder="请选择任务状态" clearable style="width: 160px">
            <el-option v-for="dict in dict.type.job_status" :key="dict.value" :label="dict.label" :value="dict.value" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="el-icon-search" size="mini" @click="handleQuery">搜索</el-button>
          <el-button icon="el-icon-refresh" size="mini" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>

      <el-row :gutter="10" class="button-bar">
        <el-col :span="1.5">
          <el-button type="primary" plain icon="el-icon-plus" size="mini" @click="handleAdd" v-hasPermi="['mon:job:add']">新增</el-button>
        </el-col>
        <el-col :span="1.5">
          <el-button type="success" plain icon="el-icon-edit" size="mini" :disabled="single" @click="handleUpdate()" v-hasPermi="['mon:job:edit']">修改</el-button>
        </el-col>
        <el-col :span="1.5">
          <el-button type="danger" plain icon="el-icon-delete" size="mini" :disabled="multiple" @click="handleDelete()" v-hasPermi="['mon:job:del']">删除</el-button>
        </el-col>
        <el-col :span="1.5">
          <el-button type="info" plain icon="el-icon-s-operation" size="mini" @click="handleJobLog()" v-hasPermi="['mon:job:list']">调度日志</el-button>
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
        :data="jobList"
        @selection-change="handleSelectionChange"
        @row-dblclick="handleView"
      >
        <el-table-column type="selection" width="50" align="center" />
        <el-table-column label="任务名称" align="left" prop="jobName" min-width="150" :show-overflow-tooltip="true" />
        <el-table-column label="任务分组" align="center" prop="jobGroup" width="110">
          <template slot-scope="scope">
            <dict-tag :options="dict.type.job_group" :value="scope.row.jobGroup" />
          </template>
        </el-table-column>
        <el-table-column label="调用目标" align="left" prop="invokeTarget" min-width="200" class-name="mono-cell" :show-overflow-tooltip="true" />
        <el-table-column label="Cron 表达式" align="left" prop="cronExpression" min-width="160" class-name="mono-cell" :show-overflow-tooltip="true" />
        <el-table-column label="状态" align="center" width="90">
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
        <el-table-column label="操作" align="center" width="175" fixed="right" class-name="small-padding fixed-width">
          <template slot-scope="scope">
            <el-button size="mini" type="text" icon="el-icon-edit" @click="handleUpdate(scope.row)" v-hasPermi="['mon:job:edit']">修改</el-button>
            <el-button size="mini" type="text" icon="el-icon-delete" @click="handleDelete(scope.row)" v-hasPermi="['mon:job:del']">删除</el-button>
            <el-dropdown size="mini" @command="(command) => handleCommand(command, scope.row)" v-hasPermi="['mon:job:changeStatus', 'mon:job:list']">
              <span class="el-dropdown-link">
                <i class="el-icon-d-arrow-right el-icon--right"></i>更多
              </span>
              <el-dropdown-menu slot="dropdown">
                <el-dropdown-item command="handleRun" icon="el-icon-caret-right" v-hasPermi="['mon:job:changeStatus']">执行一次</el-dropdown-item>
                <el-dropdown-item command="handleView" icon="el-icon-view" v-hasPermi="['mon:job:list']">任务详情</el-dropdown-item>
                <el-dropdown-item command="handleJobLog" icon="el-icon-s-operation" v-hasPermi="['mon:job:list']">调度日志</el-dropdown-item>
              </el-dropdown-menu>
            </el-dropdown>
          </template>
        </el-table-column>
      </el-table>

      <!-- 新增或修改定时任务对话框 -->
      <el-dialog :title="dialogTitle" :visible.sync="dialogFormVisible" width="760px" append-to-body @close="resetForm('form')">
        <el-form ref="form" :model="form" :rules="rules" label-width="115px">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="任务名称" prop="jobName">
                <el-input v-model="form.jobName" placeholder="请输入任务名称" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="任务分组" prop="jobGroup">
                <el-select v-model="form.jobGroup" placeholder="请选择任务分组" style="width: 100%">
                  <el-option v-for="dict in dict.type.job_group" :key="dict.value" :label="dict.label" :value="dict.value" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="24">
              <el-form-item prop="invokeTarget">
                <span slot="label">
                  调用目标
                  <el-tooltip placement="top">
                    <div slot="content">
                      Bean 调用示例：rjTask.rjParams('rj')
                      <br />类方法调用示例：com.example.task.SampleTask.run('arg')
                      <br />参数说明：支持字符串、布尔类型、长整型、浮点型、整型
                    </div>
                    <button type="button" class="help-btn" aria-label="查看调用目标说明">
                      <i class="el-icon-question"></i>
                    </button>
                  </el-tooltip>
                </span>
                <el-input v-model="form.invokeTarget" placeholder="请输入调用目标字符串" class="mono-input" />
              </el-form-item>
            </el-col>
            <el-col :span="24">
              <el-form-item label="Cron 表达式" prop="cronExpression">
                <el-input v-model="form.cronExpression" placeholder="请输入 Cron 执行表达式" class="mono-input">
                  <template slot="append">
                    <el-button type="primary" @click="handleShowCron">
                      生成表达式
                      <i class="el-icon-time el-icon--right"></i>
                    </el-button>
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
        <div slot="footer" class="dialog-footer">
          <el-button type="primary" @click="submitForm">确定</el-button>
          <el-button @click="cancel">取消</el-button>
        </div>
      </el-dialog>

      <el-dialog title="Cron 表达式生成器" :visible.sync="openCron" width="700px" append-to-body destroy-on-close class="scrollbar">
        <crontab @hide="openCron = false" @fill="crontabFill" :expression="expression" />
      </el-dialog>

      <!-- 任务详情 -->
      <el-dialog title="任务详情" :visible.sync="openView" width="720px" append-to-body>
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
          <el-descriptions-item label="下次执行时间">{{ parseTime(detail.nextValidTime) || '-' }}</el-descriptions-item>
          <el-descriptions-item label="Cron 表达式">
            <code class="mono-text">{{ detail.cronExpression }}</code>
          </el-descriptions-item>
          <el-descriptions-item label="并发执行">{{ detail.concurrent == 0 ? '允许' : '禁止' }}</el-descriptions-item>
          <el-descriptions-item label="执行策略" :span="2">{{ misfirePolicyMap[detail.misfirePolicy] }}</el-descriptions-item>
          <el-descriptions-item label="调用目标" :span="2">
            <code class="mono-text">{{ detail.invokeTarget }}</code>
          </el-descriptions-item>
        </el-descriptions>
        <div slot="footer" class="dialog-footer">
          <el-button @click="openView = false">关闭</el-button>
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
      single: true,
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
    /** 查询定时任务列表 */
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
    /** 搜索按钮操作 */
    handleQuery() {
      this.queryParams.pageNum = 1
      this.getList()
    },
    /** 重置按钮操作 */
    resetQuery() {
      this.resetForm('queryForm')
      this.handleQuery()
    },
    /** 多选框选中数据 */
    handleSelectionChange(selection) {
      this.ids = selection.map(item => item.jobId)
      this.single = selection.length !== 1
      this.multiple = !selection.length
    },
    /** 更多操作触发 */
    handleCommand(command, row) {
      switch (command) {
        case 'handleRun':
          this.handleRun(row)
          break
        case 'handleView':
          this.handleView(row)
          break
        case 'handleJobLog':
          this.handleJobLog(row)
          break
        default:
          break
      }
    },
    /** 任务状态修改 */
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
    /** 立即执行一次 */
    handleRun(row) {
      this.$modal
        .confirm('确认要立即执行一次任务“' + row.jobName + '”吗？')
        .then(() => runJob(row.jobId, row.jobGroup))
        .then(() => {
          this.$modal.msgSuccess('执行成功')
        })
        .catch(() => {})
    },
    /** 任务详细信息 */
    handleView(row) {
      getJob(row.jobId).then(response => {
        this.detail = response
        this.openView = true
      })
    },
    /** 打开 Cron 表达式生成器 */
    handleShowCron() {
      this.expression = this.form.cronExpression
      this.openCron = true
    },
    /** 确定后回传值 */
    crontabFill(value) {
      this.form.cronExpression = value
      this.$refs.form.validateField('cronExpression')
    },
    /** 调度日志列表查询 */
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
      this.resetForm('form')
    },
    /** 新增按钮操作 */
    handleAdd() {
      this.reset()
      this.dialogFormVisible = true
      this.dialogTitle = '新增任务'
    },
    /** 修改按钮操作 */
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
        this.dialogTitle = '修改任务'
      })
    },
    /** 删除按钮操作 */
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
    /** 提交按钮 */
    submitForm() {
      this.$refs['form'].validate(valid => {
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
$font-mono: SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace;

::v-deep .el-table__body .mono-cell .cell,
.mono-input ::v-deep .el-input__inner,
.mono-text {
  font-family: $font-mono;
  font-size: 12px;
}

.mono-text {
  word-break: break-all;
}

.help-btn {
  padding: 0 2px;
  border: 0;
  background: transparent;
  color: #6e6e73;
  cursor: pointer;

  &:hover,
  &:focus-visible {
    color: #094194;
  }
}
</style>
