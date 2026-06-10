<!--
  选择表达式弹窗组件（仅单选）

  用法：
    <expression-select
      :visible.sync="exprSelectVisible"
      :selected.sync="selectedExpressionId"
      @confirm="handleExpressionConfirm"
    />

  Props：
    visible   {Boolean}        .sync 控制显隐
    selected  {String|Number}  回显用的 expressionId（重新打开时勾选），支持 .sync
    title     {String}         弹窗标题（默认「选择表达式」）
    width     {String}         弹窗宽度（默认 720px）

  事件：
    confirm          -> (row: 表达式对象, id: expressionId)
    update:selected  -> 确定时回传选中的 expressionId（配合 :selected.sync）

  说明：行对象包含 expressionId / expressionName / expressionContent / expressionType 等字段，
       若需要表达式内容（expressionContent）可从 confirm 回传的行对象中读取。
-->
<template>
  <el-dialog
    :title="title"
    :visible.sync="dialogVisible"
    :width="width"
    top="10vh"
    append-to-body
    @open="onOpen"
  >
    <div class="expression-select">
      <!-- 搜索 -->
      <el-form inline size="small" class="es-query" @submit.native.prevent>
        <el-form-item>
          <el-input
            v-model="queryParams.expressionName"
            placeholder="表达式名称"
            clearable
            style="width: 180px"
            @keyup.enter.native="handleQuery"
          />
        </el-form-item>
        <el-form-item>
          <el-select v-model="queryParams.expressionType" placeholder="表达式类型" clearable style="width: 160px">
            <el-option v-for="dict in dict.type.flow_expression_type" :key="dict.value" :label="dict.label" :value="dict.value" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="el-icon-search" @click="handleQuery">搜索</el-button>
          <el-button icon="el-icon-refresh" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>

      <!-- 表达式表格 -->
      <el-table
        ref="table"
        :key="renderKey"
        v-loading="loading"
        :data="expressionList"
        border
        size="small"
        highlight-current-row
        :max-height="tableMaxHeight"
        row-key="expressionId"
        @row-click="handleRowClick"
      >
        <el-table-column label="选择" width="55" align="center">
          <template slot-scope="scope">
            <el-radio v-model="singleSelectedId" :label="scope.row.expressionId" class="es-radio" />
          </template>
        </el-table-column>
        <el-table-column label="表达式名称" prop="expressionName" align="center" show-overflow-tooltip />
        <el-table-column label="表达式内容" prop="expressionContent" align="center" show-overflow-tooltip />
        <el-table-column label="表达式类型" align="center" width="120">
          <template slot-scope="scope">
            <dict-tag :options="dict.type.flow_expression_type" :value="scope.row.expressionType" />
          </template>
        </el-table-column>
        <template slot="empty">
          <el-empty :image-size="80" description="暂无表达式数据" />
        </template>
      </el-table>

      <pagination
        v-show="total > 0"
        :total="total"
        :page.sync="queryParams.pageNum"
        :limit.sync="queryParams.pageSize"
        @pagination="getList"
      />
    </div>

    <div slot="footer" class="dialog-footer">
      <el-button @click="dialogVisible = false">取 消</el-button>
      <el-button type="primary" @click="handleConfirm">确 定</el-button>
    </div>
  </el-dialog>
</template>

<script>
import { listExpression } from '@/api/flowable/expression'

export default {
  name: 'ExpressionSelect',
  dicts: ['flow_expression_type'],
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    selected: {
      type: [String, Number],
      default: null
    },
    title: {
      type: String,
      default: '选择表达式'
    },
    width: {
      type: String,
      default: '720px'
    }
  },
  data() {
    return {
      loading: false,
      expressionList: [],
      total: 0,
      queryParams: {
        pageNum: 1,
        pageSize: 10,
        expressionName: undefined,
        expressionType: undefined
      },
      // 当前勾选的 expressionId
      singleSelectedId: null,
      // 当前勾选的行对象
      singleSelected: null,
      // 表格高度随视口自适应，保证弹窗整体不超过屏幕高度的 80%
      tableMaxHeight: 360,
      renderKey: 0
    }
  },
  computed: {
    dialogVisible: {
      get() {
        return this.visible
      },
      set(val) {
        this.$emit('update:visible', val)
      }
    }
  },
  mounted() {
    this.updateHeight()
    window.addEventListener('resize', this.updateHeight)
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.updateHeight)
  },
  methods: {
    // 依据视口高度计算表格最大高度（弹窗其余部分约预留 260px）
    updateHeight() {
      const vh = window.innerHeight || document.documentElement.clientHeight || 768
      this.tableMaxHeight = Math.max(180, Math.floor(vh * 0.8) - 260)
    },
    onOpen() {
      this.renderKey++
      this.updateHeight()
      this.queryParams.pageNum = 1
      this.queryParams.expressionName = undefined
      this.queryParams.expressionType = undefined
      this.singleSelected = null
      this.singleSelectedId = this.selected != null && this.selected !== '' ? String(this.selected) : null
      this.getList()
    },
    /** 查询表达式列表 */
    getList() {
      this.loading = true
      listExpression(this.queryParams)
        .then(res => {
          this.expressionList = res.records || []
          this.total = res.total || 0
          this.loading = false
          this.$nextTick(() => this.applyEcho())
        })
        .catch(() => {
          this.loading = false
        })
    },
    // 回显勾选（仅当选中行落在当前页时生效）
    applyEcho() {
      if (this.singleSelectedId != null && !this.singleSelected) {
        const row = this.expressionList.find(r => String(r.expressionId) === String(this.singleSelectedId))
        if (row) this.singleSelected = row
      }
    },
    /** 搜索 */
    handleQuery() {
      this.queryParams.pageNum = 1
      this.getList()
    },
    /** 重置 */
    resetQuery() {
      this.queryParams.expressionName = undefined
      this.queryParams.expressionType = undefined
      this.handleQuery()
    },
    handleRowClick(row) {
      this.singleSelectedId = String(row.expressionId)
      this.singleSelected = row
    },
    /** 确定 */
    handleConfirm() {
      if (!this.singleSelected) {
        this.$modal.msgWarning('请选择一个表达式')
        return
      }
      const id = this.singleSelected.expressionId
      this.$emit('update:selected', id)
      this.$emit('confirm', this.singleSelected, id)
      this.dialogVisible = false
    }
  }
}
</script>

<style lang="scss" scoped>
.expression-select {
  .es-query {
    margin-bottom: 8px;
  }

  .es-radio {
    margin-right: 0;

    ::v-deep .el-radio__label {
      display: none;
    }
  }

  ::v-deep .el-table {
    cursor: pointer;
  }
}

.dialog-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}
</style>
