<template>
  <div class="page">
    <div class="page-toolbar">
      <el-form ref="queryForm" :model="queryParams" inline size="small" class="page-filters" @submit.native.prevent>
        <el-form-item prop="key">
          <el-input
            v-model="queryParams.key"
            placeholder="流程标识"
            clearable
            style="width: 180px"
            @keyup.enter.native="handleQuery"
          />
        </el-form-item>
        <el-form-item prop="name">
          <el-input
            v-model="queryParams.name"
            placeholder="流程名称"
            clearable
            style="width: 180px"
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
          v-hasPermi="['flowable:definition:save']"
          type="primary"
          icon="el-icon-plus"
          size="small"
          @click="handleDesign"
        >新建设计</el-button>
        <el-button
          v-hasPermi="['flowable:definition:import']"
          icon="el-icon-upload2"
          size="small"
          @click="handleImport"
        >导入</el-button>
      </div>
    </div>

    <div class="page-body">
      <el-table v-loading="loading" :data="definitionList" height="100%" highlight-current-row>
        <el-table-column label="流程名称" align="left" prop="name" min-width="160" show-overflow-tooltip />
        <el-table-column label="流程标识" align="left" prop="key" min-width="140" class-name="mono-cell" show-overflow-tooltip />
        <el-table-column label="版本" align="center" width="76" class-name="mono-cell num-cell">
          <template slot-scope="scope">v{{ scope.row.version }}</template>
        </el-table-column>
        <el-table-column label="分类" align="left" prop="category" min-width="120" show-overflow-tooltip />
        <el-table-column label="状态" align="center" width="80">
          <template slot-scope="scope">
            <el-tag :type="scope.row.suspended ? 'danger' : 'success'">{{ scope.row.suspended ? '挂起' : '激活' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="部署时间" align="center" prop="deploymentTime" width="160" class-name="num-cell" />
        <el-table-column label="操作" align="center" width="240" class-name="small-padding">
          <template slot-scope="scope">
            <el-button
              v-hasPermi="['flowable:definition:save']"
              size="mini"
              type="text"
              @click="handleEdit(scope.row)"
            >设计</el-button>
            <el-button
              v-hasPermi="['flowable:definition:query']"
              size="mini"
              type="text"
              @click="handleView(scope.row)"
            >流程图</el-button>
            <el-button
              v-hasPermi="['flowable:definition:edit']"
              size="mini"
              type="text"
              @click="handleState(scope.row)"
            >{{ scope.row.suspended ? '激活' : '挂起' }}</el-button>
            <el-button
              v-hasPermi="['flowable:definition:del']"
              size="mini"
              type="text"
              @click="handleDelete(scope.row)"
            >删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div v-show="total > 0" class="page-footer">
      <pagination :total="total" :page.sync="queryParams.pageNum" :limit.sync="queryParams.pageSize" @pagination="getList" />
    </div>

    <el-dialog :title="designForm.id ? '编辑流程设计' : '新建流程设计'" :visible.sync="designOpen" fullscreen append-to-body :destroy-on-close="true">
      <el-form :inline="true" :model="designForm" size="small">
        <el-form-item label="流程分类">
          <el-input v-model="designForm.category" placeholder="流程分类" style="width: 220px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="el-icon-check" @click="handleSave">保存部署</el-button>
          <el-button @click="designOpen = false">取消</el-button>
        </el-form-item>
      </el-form>
      <bpmn-designer v-if="designOpen" ref="designer" :xml="designXml" style="height: calc(100vh - 170px)" />
    </el-dialog>

    <el-dialog title="流程图" :visible.sync="viewOpen" width="70%" append-to-body @opened="onViewOpened">
      <bpmn-viewer v-if="viewOpen" ref="viewer" :xml="currentXml" style="height: 60vh" />
    </el-dialog>

    <el-dialog title="导入流程文件" :visible.sync="importOpen" width="460px" append-to-body>
      <el-form :model="importForm" label-width="80px" size="small">
        <el-form-item label="流程名称">
          <el-input v-model="importForm.name" placeholder="留空使用文件名" />
        </el-form-item>
        <el-form-item label="流程分类">
          <el-input v-model="importForm.category" placeholder="流程分类" />
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
            <el-button size="small">选择 .bpmn / .xml 文件</el-button>
          </el-upload>
        </el-form-item>
      </el-form>
      <div slot="footer">
        <el-button @click="importOpen = false">取消</el-button>
        <el-button type="primary" @click="submitImport">确定</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { listDefinition, importFile, readXml, saveModel, changeState, delDefinition } from '@/api/flowable/definition'

export default {
  name: 'ProcessDefinition',
  components: {
    BpmnDesigner: () => import(/* webpackChunkName: "flowable-designer" */ '@/components/BpmnDesigner'),
    BpmnViewer: () => import(/* webpackChunkName: "flowable-viewer" */ '@/components/BpmnViewer')
  },
  data() {
    return {
      loading: false,
      total: 0,
      definitionList: [],
      designOpen: false,
      designForm: { id: undefined, category: undefined },
      designXml: '',
      viewOpen: false,
      currentXml: '',
      importOpen: false,
      importForm: { name: undefined, category: undefined, file: null },
      fileList: [],
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
    getList() {
      this.loading = true
      listDefinition(this.queryParams)
        .then(response => {
          this.definitionList = response.records
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
    handleDesign() {
      this.designForm = { id: undefined, category: undefined }
      this.designXml = ''
      this.designOpen = true
    },
    handleEdit(row) {
      readXml(row.id).then(xml => {
        this.designForm = { id: row.id, category: row.category }
        this.designXml = xml
        this.designOpen = true
      })
    },
    async handleSave() {
      if (!this.$refs.designer || !this.$refs.designer.getXml) {
        this.$modal.msgWarning('设计器正在加载，请稍候')
        return
      }
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
    handleImport() {
      this.importForm = { name: undefined, category: undefined, file: null }
      this.fileList = []
      this.importOpen = true
    },
    onFileChange(file) {
      this.importForm.file = file.raw
    },
    onFileRemove() {
      this.importForm.file = null
    },
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
    handleView(row) {
      readXml(row.id).then(xml => {
        this.currentXml = xml
        this.viewOpen = true
      })
    },
    onViewOpened() {
      if (this.$refs.viewer && this.$refs.viewer.fit) {
        this.$refs.viewer.fit()
      }
    },
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
    handleDelete(row) {
      this.$modal
        .confirm('确认删除流程「' + row.name + '」及其部署?')
        .then(() => delDefinition(row.deploymentId))
        .then(() => {
          this.$modal.msgSuccess('删除成功')
          this.getList()
        })
        .catch(() => {})
    }
  }
}
</script>
