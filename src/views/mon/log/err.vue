<template>
  <el-container>
    <el-header>
      <el-form ref="queryForm" :model="queryParams" inline label-position="right" class="query-form" size="small">
        <el-form-item prop="title">
          <el-input v-model="queryParams.title" placeholder="请输入系统模块" clearable style="width: 240px" @keyup.enter.native="handleQuery" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="el-icon-search" size="mini" @click="handleQuery">搜索</el-button>
          <el-button icon="el-icon-refresh" size="mini" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
    </el-header>
    <el-main>
      <el-table
        border
        highlight-current-row
        stripe
        height="100%"
        v-loading="loading"
        :data="logList"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="50" align="center" />
        <el-table-column type="expand">
          <template slot-scope="scope">
            <el-tabs value="first" type="border-card">
              <el-tab-pane label="详细信息" name="first">
                <el-form label-position="left" inline class="demo-table-expand">
                  <el-form-item label="浏览器">
                    <span>{{ scope.row.browser }}</span>
                  </el-form-item>
                  <el-form-item label="URL">
                    <span>{{ scope.row.requestUrl }}</span>
                  </el-form-item>
                  <el-form-item label="请求参数">
                    <pre><code v-html="highlightedCode(scope.row.params,'json')"></code></pre>
                  </el-form-item>
                  <el-form-item label="系统模块">
                    <span>{{ scope.row.title }}</span>
                  </el-form-item>
                  <el-form-item label="方法">
                    <span>{{ scope.row.method }}</span>
                  </el-form-item>
                </el-form>
              </el-tab-pane>
              <el-tab-pane label="异常信息" name="second" class="error-msg-pane">
                <pre><code v-html="highlightedCode(scope.row.errorMsg,'java')"></code></pre>
              </el-tab-pane>
            </el-tabs>
          </template>
        </el-table-column>
        <el-table-column label="来源服务" align="center" key="serviceName" prop="serviceName" v-if="columns[0].visible" :show-overflow-tooltip="true" />
        <el-table-column label="系统模块" align="center" key="title" prop="title" v-if="columns[1].visible" :show-overflow-tooltip="true" />
        <el-table-column label="操作类型" align="center" key="bizType" prop="bizType" v-if="columns[2].visible">
          <template slot-scope="scope">
            <dict-tag :options="dict.type.sys_oper_type" :value="scope.row.bizType" />
          </template>
        </el-table-column>
        <el-table-column label="方法名称" align="center" key="method" prop="method" v-if="columns[3].visible" :show-overflow-tooltip="true" />
        <el-table-column label="请求方式" align="center" key="requestMethod" prop="requestMethod" v-if="columns[4].visible" />
        <el-table-column label="耗时" align="center" width="100" key="costTime" prop="costTime" v-if="columns[5].visible">
          <template slot-scope="scope">
            <el-tag v-if="scope.row.costTime <= 300">{{ scope.row.costTime }}ms</el-tag>
            <el-tag v-else-if="scope.row.costTime <= 1000" type="warning">{{ scope.row.costTime }}ms</el-tag>
            <el-tag v-else type="danger">{{ scope.row.costTime }}ms</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作人员" align="center" key="username" prop="username" v-if="columns[6].visible" />
        <el-table-column label="部门名称" align="center" key="deptName" prop="deptName" v-if="columns[7].visible" />
        <el-table-column
          label="请求URL"
          align="center"
          key="requestUrl"
          prop="requestUrl"
          v-if="columns[8].visible"
          :show-overflow-tooltip="true"
        />
        <el-table-column label="浏览器" align="center" key="browser" prop="browser" v-if="columns[9].visible" :show-overflow-tooltip="true" />
        <el-table-column label="主机地址" align="center" key="requestIp" prop="requestIp" v-if="columns[10].visible" />
        <el-table-column label="操作地点" align="center" key="address" prop="address" v-if="columns[11].visible" />
        <el-table-column label="请求参数" align="center" key="params" prop="params" v-if="columns[12].visible" :show-overflow-tooltip="true" />
        <el-table-column
          label="返回参数"
          align="center"
          key="jsonResult"
          prop="jsonResult"
          v-if="columns[13].visible"
          :show-overflow-tooltip="true"
        />
        <el-table-column label="操作状态" align="center" key="status" prop="status" v-if="columns[14].visible">
          <template slot-scope="scope">
            <dict-tag :options="dict.type.log_status" :value="scope.row.status" />
          </template>
        </el-table-column>
        <el-table-column label="操作时间" width="150" align="center" key="createTime" prop="createTime" v-if="columns[15].visible" />
      </el-table>
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
import hljs from 'highlight.js/lib/core'
import 'highlight.js/styles/github.css'
import java from 'highlight.js/lib/languages/java'
import json from 'highlight.js/lib/languages/json'
hljs.registerLanguage('java', java)
hljs.registerLanguage('json', json)

import { listLog } from '@/api/mon/log'
export default {
  name: 'errLog',
  dicts: ['sys_oper_type', 'log_status'],
  data() {
    return {
      // 选中数组
      ids: [],
      // 非单个禁用
      single: true,
      // 非多个禁用
      multiple: true,
      // 查询参数（status 固定为失败,只查异常日志）
      queryParams: {
        pageNum: 1,
        pageSize: 10,
        title: undefined,
        status: '1'
      },
      // 列信息
      columns: [
        { key: 1, label: `来源服务`, visible: true },
        { key: 2, label: `系统模块`, visible: true },
        { key: 3, label: `操作类型`, visible: true },
        { key: 4, label: `方法名称`, visible: false },
        { key: 5, label: `请求方式`, visible: true },
        { key: 6, label: `耗时`, visible: true },
        { key: 7, label: `操作人员`, visible: true },
        { key: 8, label: `部门名称`, visible: true },
        { key: 9, label: `请求URL`, visible: false },
        { key: 10, label: `浏览器`, visible: false },
        { key: 11, label: `主机地址`, visible: true },
        { key: 12, label: `操作地点`, visible: true },
        { key: 13, label: `请求参数`, visible: false },
        { key: 14, label: `返回参数`, visible: false },
        { key: 15, label: `操作状态`, visible: true },
        { key: 16, label: `操作时间`, visible: true }
      ],
      // 日志表格数据
      logList: [],
      // 总条数
      total: 0,
      // 遮罩层
      loading: false
    }
  },
  created() {
    this.getList()
  },
  methods: {
    /** 查询异常日志列表 */
    getList() {
      this.loading = true
      listLog(this.queryParams).then(response => {
        this.logList = response.records
        this.total = response.total
      }).finally(() => {
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
      this.ids = selection.map(item => item.logId)
      this.single = selection.length != 1
      this.multiple = !selection.length
    },
    /** 搜索按钮操作 */
    handleQuery() {
      this.queryParams.pageNum = 1
      this.getList()
    },
    /** 高亮显示（空内容直接返回占位,避免 hljs 对 null 抛错导致展开行渲染失败） */
    highlightedCode(code, language) {
      if (!code) {
        return '&nbsp;'
      }
      return hljs.highlight(code, { language: language }).value || '&nbsp;'
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

.demo-table-expand {
  ::v-deep label {
    width: 110px;
    color: #99a9bf;
  }
  .el-form-item {
    margin-right: 0;
    margin-bottom: 0;
    width: 100%;
  }
}

// 异常堆栈面板：限高滚动,堆栈短时不留大片空白
.error-msg-pane {
  max-height: 400px;
  overflow-y: auto;
}

// 请求参数 / 异常堆栈长行换行,避免展开行横向溢出
pre {
  margin: 0;
  code {
    white-space: pre-wrap;
    word-break: break-all;
  }
}
</style>