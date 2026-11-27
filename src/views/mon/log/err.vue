<template>
  <div class="page">
    <div class="page-toolbar">
      <el-form ref="queryForm" :model="queryParams" inline size="small" class="page-filters" @submit.native.prevent>
        <el-form-item prop="title">
          <el-input
            v-model="queryParams.title"
            placeholder="系统模块"
            clearable
            style="width: 200px"
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
        @row-dblclick="handleDetail"
      >
        <el-table-column label="来源服务" align="left" prop="serviceName" min-width="110" show-overflow-tooltip />
        <el-table-column label="系统模块" align="left" prop="title" min-width="120" show-overflow-tooltip />
        <el-table-column label="操作类型" align="center" prop="bizType" width="90">
          <template slot-scope="scope">
            <dict-tag :options="dict.type.sys_oper_type" :value="scope.row.bizType" />
          </template>
        </el-table-column>
        <el-table-column label="请求方式" align="center" prop="requestMethod" width="84" class-name="mono-cell" />
        <el-table-column label="耗时" align="right" width="84" prop="costTime" class-name="mono-cell">
          <template slot-scope="scope">
            <span v-if="scope.row.costTime != null" :class="costClass(scope.row.costTime)">{{ scope.row.costTime }}ms</span>
            <template v-else>-</template>
          </template>
        </el-table-column>
        <el-table-column label="操作人员" align="left" prop="username" width="110" show-overflow-tooltip />
        <el-table-column label="主机地址" align="left" prop="requestIp" width="130" class-name="mono-cell" show-overflow-tooltip />
        <el-table-column label="操作地点" align="left" prop="address" min-width="110" show-overflow-tooltip />
        <el-table-column label="操作时间" align="center" prop="createTime" width="160" />
        <el-table-column label="操作" align="center" width="76" fixed="right" class-name="small-padding">
          <template slot-scope="scope">
            <el-button size="mini" type="text" @click="handleDetail(scope.row)">详情</el-button>
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

    <log-detail :visible.sync="detailOpen" :row="detailRow" :oper-types="dict.type.sys_oper_type" :status-options="dict.type.log_status" />
  </div>
</template>

<script>
import { listLog } from '@/api/mon/log'
import LogDetail from './detail'

export default {
  name: 'errLog',
  components: { LogDetail },
  dicts: ['sys_oper_type', 'log_status'],
  data() {
    return {
      queryParams: {
        pageNum: 1,
        pageSize: 10,
        title: undefined,
        status: '1'
      },
      logList: [],
      total: 0,
      loading: false,
      detailOpen: false,
      detailRow: {}
    }
  },
  created() {
    this.getList()
  },
  methods: {
    getList() {
      this.loading = true
      listLog(this.queryParams)
        .then(response => {
          this.logList = response.records
          this.total = response.total
        })
        .finally(() => {
          this.loading = false
        })
    },
    costClass(ms) {
      if (ms > 1000) return 'cost-danger'
      if (ms > 300) return 'cost-warning'
      return 'cost-normal'
    },
    resetQuery() {
      this.resetForm('queryForm')
      this.handleQuery()
    },
    handleQuery() {
      this.queryParams.pageNum = 1
      this.getList()
    },
    handleDetail(row) {
      this.detailRow = row
      this.detailOpen = true
    }
  }
}
</script>

<style lang="scss" scoped>
@import '@/assets/styles/tokens.scss';

.cost-normal { color: $label-secondary; }
.cost-warning { color: $color-warning; font-weight: 500; }
.cost-danger { color: $color-danger; font-weight: 500; }
</style>
