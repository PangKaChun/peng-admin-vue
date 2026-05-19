<template>
  <div>
    <el-button type="primary" @click="showModal = true">{{title}}附件上传</el-button>
    <el-dialog v-if="showModal" title="同步附件至企业" :visible.sync="showModal" width="800px" center>
      <el-button type="primary" @click="$refs.file.click()">添加附件</el-button>
      <input ref="file" type="file" hidden @change="uploadFiles" accept=".docx,.pdf,.txt"/>
      <div style="margin-top: 10px">
        <span style="color: red">*此功能用于企业端{{model}}{{title}}的附件上传(注意：传输以每次同步为准)</span>
      </div>
      <el-table style="margin-top:15px" highlight-current-row stripe v-loading="loading" :data="list">
        <el-table-column label="文件名" align="center" key="title" prop="title" :show-overflow-tooltip="true"/>
        <el-table-column label="创建时间" sortable align="center" key="createTime" prop="createTime" :show-overflow-tooltip="true"/>
        <el-table-column label="同步时间" sortable align="center" key="sendTime" prop="sendTime" :show-overflow-tooltip="true"/>
        <el-table-column label="是否同步" align="center" key="isSend" prop="isSend" :show-overflow-tooltip="true">
          <template slot-scope="scope">
          <el-switch v-model="scope.row.isEnable" active-value="1" inactive-value="0"
                     active-color="#13ce66" inactive-color="#ff4949" size="mini" @change="syncFiles(scope.row)">
          </el-switch>
          </template>
        </el-table-column>
        <el-table-column label="操作" align="center" width="160" class-name="small-padding fixed-width">
          <template slot-scope="scope">
            <el-button v-show="scope.row.isSend == 0" size="mini" type="text" icon="el-icon-delete"
                       @click="handleDelete(scope.row)">删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <pagination v-show="total > 0" :total="total" :page.sync="queryParams.pageNum" :limit.sync="queryParams.pageSize"
                  @pagination="getList"/>
    </el-dialog>
  </div>
</template>

<script>
  import {
    listSf,
    addSf,
    sendSf,
    delSf
  } from '@/api/biz/sf'

  export default {
    props: {
      funcName: {
        type: String,
        default: null
      },
      title: {
        type: String,
        default: null
      },
      model: {
        type: String,
        default: null
      },
      isMore: {
        type: Boolean,
        default: false
      }
    },
    data() {
      return {
        showModal: false,
        list: [],
        files: [],
        form: {},
        loading: false,
        submitLoading: false,
        // 总条数
        total: 0,
        // 查询参数
        queryParams: {
          pageNum: 1,
          pageSize: 10
        },
      }
    },
    methods: {
      /** 查询附件列表 */
      getList() {
        this.loading = true
        listSf({
          funcName: this.funcName,
          ...this.queryParams
        }).then(response => {
          this.list = response.records
          this.total = response.total
          this.loading = false
        })
      },
      // 表单重置
      reset() {
        this.form = {
          funcName: this.funcName,
          title: undefined,
          orderNum: 0
        }
      },
      uploadFiles(e) {
        this.reset()
        // TODO: 添加文件的处理逻辑
        let files = e.target.files
        if (files.length > 0) {
          let file = files[0]
          let fileName = file.name
          let fileName2 = fileName.split('.')
          let extName = fileName2.pop()
          if (extName != 'docx' && extName != 'pdf' && extName != 'txt') {
            this.$message({
              type: 'error',
              message: '不支持的格式,只支持docx、pdf、txt格式',
            })
            return;
          }
          this.$prompt('请输入文件名', '文件名', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            inputValue: fileName2[0]
          })
            .then(({
                     value
                   }) => {
              this.submitLoading = true
              let renameFile = new File([file], value + '.' + extName, {
                type: file.type
              })
              let filename = value + '.' + extName
              let raw = renameFile
              const formData = new FormData()
              formData.append('funcName', this.funcName)
              formData.append('title', filename)
              formData.append('orderNum', 0)
              formData.append('file', raw)
              addSf(formData)
                .then(response => {
                  this.getList()
                  this.$modal.msgSuccess('上传成功')
                })
                .finally(() => {
                  this.submitLoading = false
                })
            })
            .catch(() => {
              this.$message.info('取消上传')
            })
        }
        let fileEl = this.$refs.file
        fileEl.value = ''
      },
      syncFiles(row) {
        this.$confirm(`是否将${this.funcName == 'cb' ? '这一个' : '此'}附件${this.funcName == 'cb' ? '' : '新增至附件列表'}用于企业提交申请时的${this.title}展示?`, '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        })
          .then(() => {
            sendSf({
              funcName: this.funcName,
              sampleId:row.sampleId,
              isEnable:row.isEnable
            }).then(()=>{
              this.getList()
              return this.$modal.msgSuccess('同步成功')
            })
          })
          .catch(() => {
            this.$message({
              type: 'info',
              message: '已取消发送'
            })
            row.isEnable='0'
          })
      },
      handleDelete(row) {
        const sampleIds = row.sampleId
        const title = row.title
        this.$modal
          .confirm('是否确认删除附件名为"' + title + '"的数据项？')
          .then(function () {
            return delSf(sampleIds)
          })
          .then(() => {
            this.getList()
            this.$modal.msgSuccess('删除成功')
          })
          .catch(() => {
          })
      }
    },
    watch:{
      showModal(newVal,oldVal){
        if(newVal){
          this.getList()
        }
      }
    }
  }
</script>

<style>
  .dialog-footer {
    padding: 10px 0;
    text-align: right;
  }
</style>
