<template>
  <el-container>
    <el-header>
      <el-form inline label-position="right" class="query-form" size="small">
        <el-form-item prop="title">
          <el-input v-model="queryParams.title" placeholder="请输入你要搜索的内容" clearable style="width: 240px" @keyup.enter.native="handleQuery" />
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
        <el-table-column label="用户名称" align="center" key="username" prop="username" v-if="columns[0].visible" />
        <el-table-column label="登录地址" align="center" key="ipaddr" prop="ipaddr" v-if="columns[1].visible" />
        <el-table-column label="登录地点" align="center" key="loginLocation" prop="loginLocation" v-if="columns[2].visible" />
        <el-table-column label="浏览器" align="center" key="browser" prop="browser" v-if="columns[3].visible" />
        <el-table-column label="操作系统" align="center" key="os" prop="os" v-if="columns[4].visible" />
        <el-table-column label="登录状态" align="center" key="status" prop="status" v-if="columns[5].visible">
          <template slot-scope="scope">
            <dict-tag :options="dict.type.log_status" :value="scope.row.status" />
          </template>
        </el-table-column>
        <el-table-column label="操作信息" align="center" key="msg" prop="msg" v-if="columns[6].visible" />
        <el-table-column label="登录日期" width="150" align="center" key="loginTime" prop="loginTime" v-if="columns[7].visible" />
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
import { loginLog } from '@/api/mon/log'
export default {
  name: 'Log',
  dicts: ['log_status'],
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
        pageSize: 10
      },
      // 列信息
      columns: [
        { key: 0, label: `用户名称`, visible: true },
        { key: 1, label: `登录地址`, visible: true },
        { key: 2, label: `登录地点`, visible: true },
        { key: 3, label: `浏览器`, visible: true },
        { key: 4, label: `操作系统`, visible: true },
        { key: 5, label: `登录状态`, visible: true },
        { key: 6, label: `操作信息`, visible: true },
        { key: 7, label: `登录日期`, visible: true }
      ],
      // 字典表格数据
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
    /** 查询字典列表 */
    getList() {
      this.loading = true
      loginLog(this.addDateRange(this.queryParams, this.dateRange)).then(response => {
        this.logList = response.records
        this.total = response.total
        this.loading = false
      })
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
    /** 搜索按钮操作 */
    handleQuery() {
      this.queryParams.pageNum = 1
      this.getList()
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