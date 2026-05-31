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
        label-width="68px"
      >
        <el-form-item prop="clientId">
          <el-input
            v-model="queryParams.clientId"
            placeholder="请输入客户端ID"
            clearable
            style="width: 240px"
            @keyup.enter.native="handleQuery"
          />
        </el-form-item>
        <el-form-item prop="clientName">
          <el-input
            v-model="queryParams.clientName"
            placeholder="请输入客户端名称"
            clearable
            style="width: 240px"
            @keyup.enter.native="handleQuery"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="el-icon-search" size="mini" @click="handleQuery">搜索</el-button>
          <el-button icon="el-icon-refresh" size="mini" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>

      <el-row :gutter="10" class="button-bar">
        <el-col :span="1.5">
          <el-button type="primary" icon="el-icon-plus" size="mini" @click="handleAdd" v-hasPermi="['sys:client:add']">新增</el-button>
        </el-col>
        <el-col :span="1.5">
          <el-button
            type="success"
            icon="el-icon-edit"
            size="mini"
            :disabled="single"
            @click="handleUpdate"
            v-hasPermi="['sys:client:edit']"
          >修改</el-button>
        </el-col>
        <el-col :span="1.5">
          <el-button
            type="danger"
            icon="el-icon-delete"
            size="mini"
            :disabled="multiple"
            @click="handleDelete"
            v-hasPermi="['sys:client:del']"
          >删除</el-button>
        </el-col>
      </el-row>
    </el-header>
    <el-main>
      <el-table
        highlight-current-row
        stripe
        size="mini"
        v-loading="loading"
        :data="clientList"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="50" align="center" />
        <el-table-column label="客户端ID" align="center" prop="clientId" :show-overflow-tooltip="true" />
        <el-table-column label="客户端名称" align="center" prop="clientName" :show-overflow-tooltip="true" />
        <el-table-column label="授权类型" align="center">
          <template slot-scope="scope">
            <el-tag v-for="grant in splitToList(scope.row.authorizationGrantTypes)" :key="grant" size="mini" class="cell-tag">{{ grant }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="授权范围" align="center">
          <template slot-scope="scope">
            <el-tag v-for="scope2 in splitToList(scope.row.scopes)" :key="scope2" type="success" size="mini" class="cell-tag">{{ scope2 }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="签发时间" align="center" prop="clientIdIssuedAt" width="180">
          <template slot-scope="scope">
            <span>{{ parseTime(scope.row.clientIdIssuedAt) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" align="center" class-name="small-padding fixed-width">
          <template slot-scope="scope">
            <el-button size="mini" type="text" icon="el-icon-edit" @click="handleUpdate(scope.row)" v-hasPermi="['sys:client:edit']">修改</el-button>
            <el-button size="mini" type="text" icon="el-icon-delete" @click="handleDelete(scope.row)" v-hasPermi="['sys:client:del']">删除</el-button>
          </template>
        </el-table-column>
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

    <!-- 添加或修改客户端对话框 -->
    <el-dialog :title="title" :visible.sync="open" width="680px" append-to-body>
      <el-form ref="form" :model="form" :rules="rules" label-width="140px">
        <el-divider content-position="left">基本信息</el-divider>
        <el-alert type="info" :closable="false" show-icon class="form-alert">
          <div slot="title">字段说明</div>
          <div>· 客户端密钥：明文输入，保存时自动 BCrypt 加密；修改时留空表示保持原密钥不变</div>
          <div>· 认证方式：<b>none</b> 为公共客户端（无密钥，需配合 PKCE）；<b>client_secret_basic / post</b> 为机密客户端，需填写密钥</div>
          <div>· 授权类型含 <b>authorization_code</b> 时必须填写重定向地址；<b>client_credentials</b> 用于服务间调用（scope 一般为 internal）</div>
        </el-alert>
        <el-form-item label="客户端ID" prop="clientId">
          <el-input v-model="form.clientId" placeholder="请输入客户端ID" />
        </el-form-item>
        <el-form-item label="客户端名称" prop="clientName">
          <el-input v-model="form.clientName" placeholder="请输入客户端名称" />
        </el-form-item>
        <el-form-item label="客户端密钥" prop="clientSecret">
          <el-input v-model="form.clientSecret" type="password" show-password autocomplete="new-password" :placeholder="secretPlaceholder" />
        </el-form-item>
        <el-form-item label="认证方式" prop="clientAuthenticationMethods">
          <el-select v-model="form.clientAuthenticationMethods" multiple style="width: 100%" placeholder="请选择认证方式">
            <el-option v-for="method in authMethodOptions" :key="method" :label="method" :value="method" />
          </el-select>
        </el-form-item>
        <el-form-item label="授权类型" prop="authorizationGrantTypes">
          <el-select v-model="form.authorizationGrantTypes" multiple style="width: 100%" placeholder="请选择授权类型">
            <el-option v-for="grant in grantTypeOptions" :key="grant" :label="grant" :value="grant" />
          </el-select>
        </el-form-item>
        <el-form-item label="授权范围" prop="scopes">
          <el-select
            v-model="form.scopes"
            multiple
            filterable
            allow-create
            default-first-option
            style="width: 100%"
            placeholder="请选择或输入授权范围"
          >
            <el-option v-for="scope in scopeOptions" :key="scope" :label="scope" :value="scope" />
          </el-select>
        </el-form-item>
        <el-form-item label="重定向地址">
          <el-input v-model="redirectUrisText" type="textarea" :rows="3" placeholder="授权码模式必填，多个地址每行一个" />
        </el-form-item>

        <el-divider content-position="left">客户端配置 client_settings</el-divider>
        <el-alert type="info" :closable="false" show-icon class="form-alert">
          <div slot="title">字段说明</div>
          <div>· 要求 PKCE：授权码模式的公共客户端 / SPA 建议开启</div>
          <div>· JWK Set 地址、客户端认证签名算法：仅当认证方式为 <b>client_secret_jwt / private_key_jwt</b> 时需要，其余留空</div>
        </el-alert>
        <el-form-item label="要求PKCE">
          <el-switch v-model="form.requireProofKey" />
        </el-form-item>
        <el-form-item label="需要授权确认">
          <el-switch v-model="form.requireAuthorizationConsent" />
        </el-form-item>
        <el-form-item label="JWK Set 地址">
          <el-input v-model="form.jwkSetUrl" placeholder="client_secret_jwt / private_key_jwt 认证时填写，可留空" />
        </el-form-item>
        <el-form-item label="客户端认证签名算法">
          <el-select v-model="form.tokenEndpointAuthenticationSigningAlgorithm" clearable style="width: 100%" placeholder="jwt 认证方式时填写，可留空">
            <el-option v-for="alg in jwsAlgorithmOptions" :key="alg" :label="alg" :value="alg" />
          </el-select>
        </el-form-item>

        <el-divider content-position="left">令牌配置 token_settings</el-divider>
        <el-alert type="info" :closable="false" show-icon class="form-alert">
          <div slot="title">字段说明</div>
          <div>· 各时长单位均为<b>秒</b></div>
          <div>· 复用刷新令牌：关闭则每次刷新<b>轮换</b>（更安全，推荐关闭）</div>
          <div>· 访问令牌格式：<b>self-contained</b> 为自包含 JWT；<b>reference</b> 为不透明引用令牌</div>
        </el-alert>
        <el-form-item label="访问令牌格式">
          <el-select v-model="form.accessTokenFormat" style="width: 100%">
            <el-option v-for="fmt in tokenFormatOptions" :key="fmt" :label="fmt" :value="fmt" />
          </el-select>
        </el-form-item>
        <el-form-item label="访问令牌时长">
          <el-input-number v-model="form.accessTokenTtl" :min="1" :step="60" controls-position="right" />
          <span class="unit-tip">秒</span>
        </el-form-item>
        <el-form-item label="刷新令牌时长">
          <el-input-number v-model="form.refreshTokenTtl" :min="1" :step="60" controls-position="right" />
          <span class="unit-tip">秒</span>
        </el-form-item>
        <el-form-item label="授权码时长">
          <el-input-number v-model="form.authorizationCodeTtl" :min="1" :step="60" controls-position="right" />
          <span class="unit-tip">秒</span>
        </el-form-item>
        <el-form-item label="复用刷新令牌">
          <el-switch v-model="form.reuseRefreshTokens" />
          <span class="unit-tip">关闭则每次刷新轮换（更安全）</span>
        </el-form-item>
        <el-form-item label="ID Token 签名算法">
          <el-select v-model="form.idTokenSignatureAlgorithm" style="width: 100%">
            <el-option v-for="alg in signatureAlgorithmOptions" :key="alg" :label="alg" :value="alg" />
          </el-select>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button type="primary" @click="submitForm">确 定</el-button>
        <el-button @click="cancel">取 消</el-button>
      </div>
    </el-dialog>
  </el-container>
</template>

<script>
import { listClient, getClient, delClient, addClient, updateClient } from '@/api/sys/client'

export default {
  name: 'Client',
  data() {
    return {
      // 遮罩层
      loading: false,
      // 选中数组
      ids: [],
      // 非单个禁用
      single: true,
      // 非多个禁用
      multiple: true,
      // 显示搜索条件
      showSearch: true,
      // 总条数
      total: 0,
      // 客户端表格数据
      clientList: [],
      // 弹出层标题
      title: '',
      // 是否显示弹出层
      open: false,
      // 重定向地址文本（每行一个，提交时转数组）
      redirectUrisText: '',
      // 认证方式可选项
      authMethodOptions: ['client_secret_basic', 'client_secret_post', 'none', 'client_secret_jwt', 'private_key_jwt'],
      // 授权类型可选项
      grantTypeOptions: ['authorization_code', 'refresh_token', 'client_credentials', 'password'],
      // 授权范围可选项（允许自定义）
      scopeOptions: ['openid', 'profile', 'internal'],
      // ID Token 签名算法可选项（非对称签名算法）
      signatureAlgorithmOptions: ['RS256', 'RS384', 'RS512', 'ES256', 'ES384', 'ES512', 'PS256', 'PS384', 'PS512'],
      // 客户端认证签名算法可选项（非对称签名 + HMAC）
      jwsAlgorithmOptions: ['RS256', 'RS384', 'RS512', 'ES256', 'ES384', 'ES512', 'PS256', 'PS384', 'PS512', 'HS256', 'HS384', 'HS512'],
      // 访问令牌格式可选项
      tokenFormatOptions: ['self-contained', 'reference'],
      // 查询参数
      queryParams: {
        pageNum: 1,
        pageSize: 10,
        clientId: undefined,
        clientName: undefined
      },
      // 表单参数
      form: {},
      // 表单校验
      rules: {
        clientId: [{ required: true, message: '客户端ID不能为空', trigger: 'blur' }],
        clientName: [{ required: true, message: '客户端名称不能为空', trigger: 'blur' }],
        clientAuthenticationMethods: [{ required: true, message: '认证方式不能为空', trigger: 'change' }],
        authorizationGrantTypes: [{ required: true, message: '授权类型不能为空', trigger: 'change' }],
        scopes: [{ required: true, message: '授权范围不能为空', trigger: 'change' }]
      }
    }
  },
  computed: {
    // 密钥输入框占位提示：修改时不回显，留空表示不变
    secretPlaceholder() {
      return this.form.id ? '留空表示不修改' : '请输入客户端密钥（公共客户端可留空）'
    }
  },
  created() {
    this.getList()
  },
  methods: {
    /** 查询客户端列表 */
    getList() {
      this.loading = true
      listClient(this.queryParams).then(response => {
        this.clientList = response.records
        this.total = response.total
        this.loading = false
      })
    },
    /** 逗号分隔串转数组（用于列表 tag 渲染） */
    splitToList(value) {
      return value ? value.split(',') : []
    },
    // 取消按钮
    cancel() {
      this.open = false
      this.reset()
    },
    // 表单重置
    reset() {
      this.form = {
        id: undefined,
        clientId: undefined,
        clientName: undefined,
        clientSecret: undefined,
        clientAuthenticationMethods: ['client_secret_basic'],
        authorizationGrantTypes: ['authorization_code', 'refresh_token'],
        redirectUris: [],
        scopes: ['openid'],
        requireProofKey: true,
        requireAuthorizationConsent: false,
        jwkSetUrl: undefined,
        tokenEndpointAuthenticationSigningAlgorithm: undefined,
        accessTokenFormat: 'self-contained',
        accessTokenTtl: 7200,
        refreshTokenTtl: 86400,
        authorizationCodeTtl: 300,
        reuseRefreshTokens: false,
        idTokenSignatureAlgorithm: 'RS256'
      }
      this.redirectUrisText = ''
      this.resetForm('form')
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
    /** 新增按钮操作 */
    handleAdd() {
      this.reset()
      this.open = true
      this.title = '添加客户端'
    },
    // 多选框选中数据
    handleSelectionChange(selection) {
      this.ids = selection.map(item => item.id)
      this.single = selection.length != 1
      this.multiple = !selection.length
    },
    /** 修改按钮操作 */
    handleUpdate(row) {
      this.reset()
      const id = row.id || this.ids[0]
      getClient(id).then(response => {
        this.form = response
        // 后端不回显密钥
        this.form.clientSecret = undefined
        this.redirectUrisText = (response.redirectUris || []).join('\n')
        this.open = true
        this.title = '修改客户端'
      })
    },
    /** 提交按钮 */
    submitForm() {
      this.$refs['form'].validate(valid => {
        if (valid) {
          // 重定向地址文本 -> 数组（按行拆分、去空白、过滤空行）
          this.form.redirectUris = this.redirectUrisText
            ? this.redirectUrisText.split('\n').map(item => item.trim()).filter(item => item)
            : []
          if (this.form.authorizationGrantTypes.includes('authorization_code') && this.form.redirectUris.length === 0) {
            this.$modal.msgError('授权码模式下重定向地址不能为空')
            return
          }
          if (this.form.id != undefined) {
            updateClient(this.form).then(() => {
              this.$modal.msgSuccess('修改成功')
              this.open = false
              this.getList()
            })
          } else {
            addClient(this.form).then(() => {
              this.$modal.msgSuccess('新增成功')
              this.open = false
              this.getList()
            })
          }
        }
      })
    },
    /** 删除按钮操作 */
    handleDelete(row) {
      const ids = row.id || this.ids
      this.$modal
        .confirm('是否确认删除客户端编号为"' + ids + '"的数据项？')
        .then(function () {
          return delClient(ids)
        })
        .then(() => {
          this.getList()
          this.$modal.msgSuccess('删除成功')
        })
        .catch(() => {})
    }
  }
}
</script>

<style lang="scss" scoped>
.el-container {
  height: 100%;
}
.el-aside {
  border: 1px solid #d7dae2;
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
.cell-tag {
  margin: 2px;
}
.unit-tip {
  margin-left: 8px;
  color: #999;
  font-size: 12px;
}
.form-alert {
  margin-bottom: 12px;
}
.form-alert ::v-deep .el-alert__description {
  line-height: 1.7;
}
</style>
