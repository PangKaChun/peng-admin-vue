<template>
  <el-container>
    <el-header>
      <el-form
        :model="queryParams"
        ref="queryForm"
        label-position="right"
        class="query-form"
        size="small"
        :inline="true"
        v-show="showSearch"
      >
        <el-form-item prop="key">
          <el-input v-model="queryParams.key" placeholder="请输入流程标识" clearable style="width: 240px" @keyup.enter.native="handleQuery" />
        </el-form-item>
        <el-form-item prop="name">
          <el-input v-model="queryParams.name" placeholder="请输入流程名称" clearable style="width: 240px" @keyup.enter.native="handleQuery" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="el-icon-search" size="mini" @click="handleQuery">搜索</el-button>
          <el-button icon="el-icon-refresh" size="mini" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>

      <el-row :gutter="10" class="button-bar">
        <el-col :span="1.5">
          <el-button type="primary" icon="el-icon-edit" size="mini" @click="handleDesign" v-hasPermi="['flowable:definition:save']">新建设计</el-button>
        </el-col>
        <el-col :span="1.5">
          <el-button type="success" icon="el-icon-upload2" size="mini" @click="handleImport" v-hasPermi="['flowable:definition:import']">导入</el-button>
        </el-col>
      </el-row>
    </el-header>
    <el-main>
      <el-table highlight-current-row stripe size="mini" v-loading="loading" :data="definitionList">
        <el-table-column label="流程名称" align="center" prop="name" :show-overflow-tooltip="true" />
        <el-table-column label="流程标识" align="center" prop="key" :show-overflow-tooltip="true" />
        <el-table-column label="版本" align="center" width="70">
          <template slot-scope="scope">
            <el-tag size="mini">v{{ scope.row.version }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="分类" align="center" prop="category" :show-overflow-tooltip="true" />
        <el-table-column label="状态" align="center" width="80">
          <template slot-scope="scope">
            <el-tag :type="scope.row.suspended ? 'danger' : 'success'" size="mini">{{ scope.row.suspended ? '挂起' : '激活' }}</el-tag>
          </template>
        </el-table-column>
        <!-- 后端 VO 已用 @JsonFormat 输出 yyyy-MM-dd HH:mm:ss，直接展示，避免再次 parseTime 的冗余格式化 -->
        <el-table-column label="部署时间" align="center" prop="deploymentTime" width="180" />
        <el-table-column label="操作" align="center" width="340" class-name="small-padding fixed-width">
          <template slot-scope="scope">
            <el-button size="mini" type="text" icon="el-icon-edit-outline" @click="handleEdit(scope.row)" v-hasPermi="['flowable:definition:save']">设计</el-button>
            <el-button size="mini" type="text" icon="el-icon-view" @click="handleView(scope.row)" v-hasPermi="['flowable:definition:query']">流程图</el-button>
            <el-button size="mini" type="text" icon="el-icon-video-play" :disabled="scope.row.suspended" @click="handleStart(scope.row)" v-hasPermi="['flowable:instance:start']">发起</el-button>
            <el-button size="mini" type="text" :icon="scope.row.suspended ? 'el-icon-open' : 'el-icon-turn-off'" @click="handleState(scope.row)" v-hasPermi="['flowable:definition:edit']">{{ scope.row.suspended ? '激活' : '挂起' }}</el-button>
            <el-button size="mini" type="text" icon="el-icon-delete" @click="handleDelete(scope.row)" v-hasPermi="['flowable:definition:del']">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-main>
    <el-footer>
      <pagination v-show="total>0" :total="total" :page.sync="queryParams.pageNum" :limit.sync="queryParams.pageSize" @pagination="getList" />
    </el-footer>

    <!-- 流程设计器 -->
    <el-dialog :title="designForm.id ? '流程设计（修改）' : '流程设计（新建）'" :visible.sync="designOpen" fullscreen append-to-body :destroy-on-close="true">
      <el-form :inline="true" :model="designForm" size="small">
        <el-form-item label="流程分类">
          <el-input v-model="designForm.category" placeholder="请输入流程分类" style="width: 220px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="el-icon-check" @click="handleSave">保存部署</el-button>
          <el-button @click="designOpen = false">取 消</el-button>
        </el-form-item>
      </el-form>
      <bpmn-designer v-if="designOpen" ref="designer" :xml="designXml" style="height: calc(100vh - 170px)" />
    </el-dialog>

    <!-- 流程图查看 -->
    <el-dialog title="流程图" :visible.sync="viewOpen" width="70%" append-to-body @opened="onViewOpened">
      <bpmn-viewer v-if="viewOpen" ref="viewer" :xml="currentXml" style="height: 60vh" />
    </el-dialog>

    <!-- 导入流程文件 -->
    <el-dialog title="导入流程文件" :visible.sync="importOpen" width="500px" append-to-body>
      <el-form :model="importForm" label-width="80px" size="small">
        <el-form-item label="流程名称">
          <el-input v-model="importForm.name" placeholder="留空则用文件名" />
        </el-form-item>
        <el-form-item label="流程分类">
          <el-input v-model="importForm.category" placeholder="请输入流程分类" />
        </el-form-item>
        <el-form-item label="流程文件">
          <el-upload
            ref="upload"
            action="#"
            :auto-upload="false"
            :limit="1"
            accept=".bpmn,.xml"
            :on-change="onFileChange"
            :on-remove="onFileRemove"
            :file-list="fileList"
          >
            <el-button size="small" type="primary">选取文件</el-button>
            <div slot="tip" class="el-upload__tip">仅支持 bpmn20 的 .bpmn / .xml 文件</div>
          </el-upload>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button type="primary" @click="submitImport">确 定</el-button>
        <el-button @click="importOpen = false">取 消</el-button>
      </div>
    </el-dialog>

    <!-- 发起流程 -->
    <el-dialog title="发起流程" :visible.sync="startOpen" width="500px" append-to-body>
      <el-form :model="startForm" label-width="90px" size="small">
        <el-form-item label="流程名称">
          <span>{{ currentStartRow && currentStartRow.name }}</span>
        </el-form-item>
        <el-form-item label="业务标识">
          <el-input v-model="startForm.businessKey" placeholder="可选，便于按业务键追溯流程实例" clearable />
        </el-form-item>
        <el-form-item label="办理人">
          <el-select
            v-model="startForm.assigneeIds"
            multiple
            filterable
            clearable
            placeholder="可选，作为流程变量 candidateUsers 传入"
            style="width: 100%"
          >
            <el-option
              v-for="u in candidateUsers"
              :key="u.userId"
              :label="u.nickName ? (u.nickName + '（' + u.username + '）') : u.username"
              :value="u.userId"
            />
          </el-select>
          <div class="el-upload__tip">需流程的用户任务以 ${candidateUsers} / ${assignee} 引用方可自动指派</div>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button type="primary" @click="submitStart">确 定</el-button>
        <el-button @click="startOpen = false">取 消</el-button>
      </div>
    </el-dialog>
  </el-container>
</template>

<script>
import { listDefinition, importFile, readXml, saveModel, changeState, delDefinition, startProcess, listCandidateUsers } from '@/api/flowable/definition'
import BpmnDesigner from '@/components/BpmnDesigner'
import BpmnViewer from '@/components/BpmnViewer'

export default {
  name: 'ProcessDefinition',
  components: { BpmnDesigner, BpmnViewer },
  data() {
    return {
      loading: false,
      showSearch: true,
      total: 0,
      definitionList: [],
      // 设计器
      designOpen: false,
      designForm: { id: undefined, category: undefined },
      designXml: '',
      // 流程图查看
      viewOpen: false,
      currentXml: '',
      // 导入
      importOpen: false,
      importForm: { name: undefined, category: undefined, file: null },
      fileList: [],
      // 发起流程
      startOpen: false,
      startForm: { definitionId: undefined, businessKey: undefined, assigneeIds: [] },
      candidateUsers: [],
      currentStartRow: null,
      // 查询参数
      queryParams: {
        pageNum: 1,
        pageSize: 10,
        key: undefined,
        name: undefined
      }
    }
  },
  created() {
    this.getList()
  },
  methods: {
    /** 查询流程定义列表 */
    getList() {
      this.loading = true
      listDefinition(this.queryParams).then(response => {
        this.definitionList = response.records
        this.total = response.total
      }).finally(() => {
        this.loading = false
      })
    },
    /** 搜索 */
    handleQuery() {
      this.queryParams.pageNum = 1
      this.getList()
    },
    /** 重置 */
    resetQuery() {
      this.resetForm('queryForm')
      this.handleQuery()
    },
    /** 新建设计 */
    handleDesign() {
      this.designForm = { id: undefined, category: undefined }
      this.designXml = ''
      this.designOpen = true
    },
    /** 基于现有流程改版设计 */
    handleEdit(row) {
      readXml(row.id).then(xml => {
        this.designForm = { id: row.id, category: row.category }
        this.designXml = xml
        this.designOpen = true
      })
    },
    /** 保存部署 */
    async handleSave() {
      try {
        const xml = await this.$refs.designer.getXml()
        await saveModel({ category: this.designForm.category, xml })
        this.$modal.msgSuccess('保存成功')
        this.designOpen = false
        this.getList()
      } catch (e) {
        this.$modal.msgError('保存失败：' + (e.message || e))
      }
    },
    /** 打开导入对话框 */
    handleImport() {
      this.importForm = { name: undefined, category: undefined, file: null }
      this.fileList = []
      this.importOpen = true
    },
    /** 选择文件 */
    onFileChange(file) {
      this.importForm.file = file.raw
    },
    /** 移除文件 */
    onFileRemove() {
      this.importForm.file = null
    },
    /** 提交导入 */
    submitImport() {
      if (!this.importForm.file) {
        this.$modal.msgError('请选择流程文件')
        return
      }
      const formData = new FormData()
      formData.append('file', this.importForm.file)
      if (this.importForm.name) {
        formData.append('name', this.importForm.name)
      }
      if (this.importForm.category) {
        formData.append('category', this.importForm.category)
      }
      importFile(formData).then(() => {
        this.$modal.msgSuccess('导入成功')
        this.importOpen = false
        if (this.$refs.upload) {
          this.$refs.upload.clearFiles()
        }
        this.getList()
      })
    },
    /** 查看流程图 */
    handleView(row) {
      readXml(row.id).then(xml => {
        this.currentXml = xml
        this.viewOpen = true
      })
    },
    /** 对话框完全展开后重新适应视口 */
    onViewOpened() {
      if (this.$refs.viewer) {
        this.$refs.viewer.fit()
      }
    },
    /** 激活 / 挂起 */
    handleState(row) {
      const suspended = !row.suspended
      const action = suspended ? '挂起' : '激活'
      this.$modal
        .confirm('确认' + action + '流程「' + row.name + '」?')
        .then(() => changeState(row.id, suspended))
        .then(() => {
          this.$modal.msgSuccess(action + '成功')
          this.getList()
        })
        .catch(() => {})
    },
    /** 删除部署 */
    handleDelete(row) {
      this.$modal
        .confirm('确认删除流程「' + row.name + '」及其部署?')
        .then(() => delDefinition(row.deploymentId))
        .then(() => {
          this.$modal.msgSuccess('删除成功')
          this.getList()
        })
        .catch(() => {})
    },
    /** 打开发起流程对话框 */
    handleStart(row) {
      if (row.suspended) {
        this.$modal.msgError('流程已挂起，无法发起')
        return
      }
      this.currentStartRow = row
      this.startForm = { definitionId: row.id, businessKey: undefined, assigneeIds: [] }
      this.candidateUsers = []
      listCandidateUsers().then(list => {
        this.candidateUsers = Array.isArray(list) ? list : []
      })
      this.startOpen = true
    },
    /** 提交发起流程 */
    submitStart() {
      const variables = {}
      const assigneeIds = this.startForm.assigneeIds || []
      if (assigneeIds.length > 0) {
        variables.candidateUsers = assigneeIds
        // 仅选一人时同时给出 assignee，兼容流程以 ${assignee} 直接指派
        if (assigneeIds.length === 1) {
          variables.assignee = assigneeIds[0]
        }
      }
      const payload = {
        definitionId: this.startForm.definitionId,
        businessKey: this.startForm.businessKey || undefined,
        variables: Object.keys(variables).length > 0 ? variables : undefined
      }
      startProcess(payload).then(instanceId => {
        this.$modal.msgSuccess('发起成功，实例ID：' + instanceId)
        this.startOpen = false
      })
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
