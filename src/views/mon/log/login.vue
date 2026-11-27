<template>
  <div class="page">
    <div class="page-toolbar">
      <el-form ref="queryForm" :model="queryParams" inline size="small" class="page-filters" @submit.native.prevent>
        <el-form-item prop="username">
          <el-input
            v-model="queryParams.username"
            placeholder="登录名"
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
    </div>

    <div class="page-body">
      <el-table
        v-loading="loading"
        :data="logList"
        height="100%"
        highlight-current-row
      >
        <el-table-column label="登录名" align="left" prop="username" min-width="110" show-overflow-tooltip />
        <el-table-column label="类型" align="center" width="76" prop="logType" :formatter="logTypeFormat" />
        <el-table-column label="登录地址" align="left" prop="ipaddr" width="130" class-name="mono-cell" show-overflow-tooltip />
        <el-table-column label="登录地点" align="left" prop="loginLocation" min-width="120" show-overflow-tooltip />
        <el-table-column label="浏览器" align="left" prop="browser" min-width="110" show-overflow-tooltip />
        <el-table-column label="操作系统" align="left" prop="os" min-width="110" show-overflow-tooltip />
        <el-table-column label="状态" align="center" prop="status" width="80">
          <template slot-scope="scope">
            <dict-tag :options="dict.type.log_status" :value="scope.row.status" />
          </template>
        </el-table-column>
        <el-table-column label="操作信息" align="left" prop="msg" min-width="140" show-overflow-tooltip />
        <el-table-column label="登录时间" align="center" prop="loginTime" width="160" />
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
  </div>
</template>

<script>
import { loginLog } from '@/api/mon/log'

const LOG_TYPE_LABELS = { LOGIN: '登录', LOGOUT: '登出' }

export default {
  name: 'LoginLog',
  dicts: ['log_status'],
  data() {
    return {
      queryParams: {
        pageNum: 1,
        pageSize: 10,
        username: undefined
      },
      logList: [],
      total: 0,
      loading: false
    }
  },
  created() {
    this.getList()
  },
  methods: {
    getList() {
      this.loading = true
      loginLog(this.queryParams)
        .then(response => {
          this.logList = response.records
          this.total = response.total
        })
        .finally(() => {
          this.loading = false
        })
    },
    logTypeFormat(row) {
      return LOG_TYPE_LABELS[row.logType] || row.logType
    },
    resetQuery() {
      this.resetForm('queryForm')
      this.handleQuery()
    },
    handleQuery() {
      this.queryParams.pageNum = 1
      this.getList()
    }
  }
}
</script>
