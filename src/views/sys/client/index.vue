<template>
  <div class="page">
    <div class="page-toolbar">
      <el-form ref="queryForm" :model="queryParams" inline size="small" class="page-filters" @submit.native.prevent>
        <el-form-item prop="clientId">
          <el-input
            v-model="queryParams.clientId"
            placeholder="客户端 ID"
            clearable
            style="width: 180px"
            @keyup.enter.native="handleQuery"
          />
        </el-form-item>
        <el-form-item prop="clientName">
          <el-input
            v-model="queryParams.clientName"
            placeholder="客户端名称"
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
          v-hasPermi="['sys:client:add']"
          type="primary"
          icon="el-icon-plus"
          size="small"
          @click="handleAdd"
        >新增</el-button>
        <el-button
          v-if="!multiple && $auth.hasPermi('sys:client:del')"
          type="danger"
          plain
          icon="el-icon-delete"
          size="small"
          @click="handleDelete"
        >删除</el-button>
      </div>
    </div>

    <div class="page-body">
      <el-table
        v-loading="loading"
        :data="clientList"
        height="100%"
        highlight-current-row
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="46" align="center" />
        <el-table-column label="客户端 ID" align="left" prop="clientId" min-width="140" class-name="mono-cell" show-overflow-tooltip />
        <el-table-column label="客户端名称" align="left" prop="clientName" min-width="140" show-overflow-tooltip />
        <el-table-column label="授权类型" align="left" min-width="180">
          <template slot-scope="scope">
            <span class="chip-list">
              <span v-for="grant in splitToList(scope.row.authorizationGrantTypes)" :key="grant" class="chip">{{ grant }}</span>
            </span>
          </template>
        </el-table-column>
        <el-table-column label="授权范围" align="left" min-width="140">
          <template slot-scope="scope">
            <span class="chip-list">
              <span v-for="item in splitToList(scope.row.scopes)" :key="item" class="chip">{{ item }}</span>
            </span>
          </template>
        </el-table-column>
        <el-table-column label="签发时间" align="center" prop="clientIdIssuedAt" width="160" class-name="num-cell">
          <template slot-scope="scope">
            <span>{{ parseTime(scope.row.clientIdIssuedAt) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" align="center" width="120" class-name="small-padding">
          <template slot-scope="scope">
            <el-button
              v-hasPermi="['sys:client:edit']"
              size="mini"
              type="text"
              @click="handleUpdate(scope.row)"
            >修改</el-button>
            <el-button
              v-hasPermi="['sys:client:del']"
              size="mini"
              type="text"
              @click="handleDelete(scope.row)"
            >删除</el-button>
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

    <el-dialog :title="title" :visible.sync="open" width="640px" append-to-body class="scrollbar">
      <el-form ref="form" :model="form" :rules="rules" label-width="110px">
        <div class="form-section">
          <h3 class="form-section__title">基本信息</h3>
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="客户端 ID" prop="clientId">
                <el-input v-model="form.clientId" placeholder="客户端 ID" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="客户端名称" prop="clientName">
                <el-input v-model="form.clientName" placeholder="客户端名称" />
              </el-form-item>
            </el-col>
            <el-col :span="24">
              <el-form-item label="客户端密钥" prop="clientSecret">
                <el-input
                  v-model="form.clientSecret"
                  type="password"
                  show-password
                  autocomplete="new-password"
                  :placeholder="secretPlaceholder"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="认证方式" prop="clientAuthenticationMethods">
                <el-select v-model="form.clientAuthenticationMethods" multiple placeholder="选择认证方式">
                  <el-option v-for="method in authMethodOptions" :key="method" :label="method" :value="method" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="授权类型" prop="authorizationGrantTypes">
                <el-select v-model="form.authorizationGrantTypes" multiple placeholder="选择授权类型">
                  <el-option v-for="grant in grantTypeOptions" :key="grant" :label="grant" :value="grant" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="24">
              <el-form-item label="授权范围" prop="scopes">
                <el-select
                  v-model="form.scopes"
                  multiple
                  filterable
                  allow-create
                  default-first-option
                  placeholder="选择或输入 scope"
                >
                  <el-option v-for="scope in scopeOptions" :key="scope" :label="scope" :value="scope" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col v-if="showRedirectUris" :span="24">
              <el-form-item label="重定向地址" :required="(form.authorizationGrantTypes || []).includes('authorization_code')">
                <el-input v-model="redirectUrisText" type="textarea" :rows="3" placeholder="每行一个回调地址" />
              </el-form-item>
            </el-col>
          </el-row>
        </div>

        <div class="form-section">
          <h3 class="form-section__title">客户端设置</h3>
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="要求 PKCE">
                <el-switch v-model="form.requireProofKey" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="授权确认">
                <el-switch v-model="form.requireAuthorizationConsent" />
              </el-form-item>
            </el-col>
            <template v-if="showJwtSettings">
              <el-col :span="12">
                <el-form-item label="JWK Set 地址">
                  <el-input v-model="form.jwkSetUrl" placeholder="https://..." />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="认证签名算法">
                  <el-select v-model="form.tokenEndpointAuthenticationSigningAlgorithm" clearable placeholder="选择算法">
                    <el-option v-for="alg in jwsAlgorithmOptions" :key="alg" :label="alg" :value="alg" />
                  </el-select>
                </el-form-item>
              </el-col>
            </template>
          </el-row>
        </div>

        <div class="form-section">
          <h3 class="form-section__title">令牌设置</h3>
          <el-row :gutter="12">
            <el-col :span="12">
              <el-form-item label="访问令牌格式">
                <el-select v-model="form.accessTokenFormat">
                  <el-option v-for="fmt in tokenFormatOptions" :key="fmt.value" :label="fmt.label" :value="fmt.value" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="ID Token 算法">
                <el-select v-model="form.idTokenSignatureAlgorithm">
                  <el-option v-for="alg in signatureAlgorithmOptions" :key="alg" :label="alg" :value="alg" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="访问令牌 (秒)">
                <el-input-number v-model="form.accessTokenTtl" :min="1" :step="60" controls-position="right" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="刷新令牌 (秒)">
                <el-input-number v-model="form.refreshTokenTtl" :min="1" :step="60" controls-position="right" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="授权码 (秒)">
                <el-input-number v-model="form.authorizationCodeTtl" :min="1" :step="60" controls-position="right" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="复用刷新令牌">
                <el-switch v-model="form.reuseRefreshTokens" />
              </el-form-item>
            </el-col>
          </el-row>
        </div>
      </el-form>
      <div slot="footer">
        <el-button @click="cancel">取消</el-button>
        <el-button type="primary" @click="submitForm">确定</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { listClient, getClient, delClient, addClient, updateClient } from '@/api/sys/client'

export default {
  name: 'Client',
  data() {
    return {
      loading: false,
      ids: [],
      multiple: true,
      total: 0,
      clientList: [],
      title: '',
      open: false,
      redirectUrisText: '',
      authMethodOptions: ['client_secret_basic', 'client_secret_post', 'none', 'client_secret_jwt', 'private_key_jwt'],
      grantTypeOptions: ['authorization_code', 'refresh_token', 'client_credentials', 'password'],
      scopeOptions: ['openid', 'profile', 'internal'],
      signatureAlgorithmOptions: ['RS256', 'RS384', 'RS512', 'ES256', 'ES384', 'ES512', 'PS256', 'PS384', 'PS512'],
      jwsAlgorithmOptions: ['RS256', 'RS384', 'RS512', 'ES256', 'ES384', 'ES512', 'PS256', 'PS384', 'PS512', 'HS256', 'HS384', 'HS512'],
      tokenFormatOptions: [
        { value: 'self-contained', label: 'JWT（自包含）' },
        { value: 'reference', label: 'Opaque（引用令牌）' }
      ],
      queryParams: {
        pageNum: 1,
        pageSize: 10,
        clientId: undefined,
        clientName: undefined
      },
      form: {},
      rules: {
        clientId: [{ required: true, message: '客户端 ID 不能为空', trigger: 'blur' }],
        clientName: [{ required: true, message: '客户端名称不能为空', trigger: 'blur' }],
        clientAuthenticationMethods: [{ required: true, message: '认证方式不能为空', trigger: 'change' }],
        authorizationGrantTypes: [{ required: true, message: '授权类型不能为空', trigger: 'change' }],
        scopes: [{ required: true, message: '授权范围不能为空', trigger: 'change' }]
      }
    }
  },
  computed: {
    secretPlaceholder() {
      return this.form.id ? '留空保持原密钥' : '公共客户端可留空'
    },
    showRedirectUris() {
      return (this.form.authorizationGrantTypes || []).includes('authorization_code') || !!this.redirectUrisText
    },
    showJwtSettings() {
      const methods = this.form.clientAuthenticationMethods || []
      return methods.some(m => m.endsWith('_jwt')) || !!this.form.jwkSetUrl || !!this.form.tokenEndpointAuthenticationSigningAlgorithm
    }
  },
  created() {
    this.getList()
  },
  methods: {
    getList() {
      this.loading = true
      listClient(this.queryParams)
        .then(response => {
          this.clientList = response.records
          this.total = response.total
        })
        .finally(() => {
          this.loading = false
        })
    },
    splitToList(value) {
      return value ? value.split(',') : []
    },
    cancel() {
      this.open = false
      this.reset()
    },
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
      this.$nextTick(() => {
        this.$refs.form && this.$refs.form.clearValidate()
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
    handleAdd() {
      this.reset()
      this.open = true
      this.title = '新增客户端'
    },
    handleSelectionChange(selection) {
      this.ids = selection.map(item => item.id)
      this.multiple = !selection.length
    },
    handleUpdate(row) {
      this.reset()
      const id = row.id || this.ids[0]
      getClient(id).then(response => {
        this.form = response
        this.redirectUrisText = (response.redirectUris || []).join('\n')
        this.open = true
        this.title = '编辑客户端'
      })
    },
    submitForm() {
      this.$refs.form.validate(valid => {
        if (!valid) return
        this.form.redirectUris = this.redirectUrisText
          ? this.redirectUrisText.split('\n').map(item => item.trim()).filter(Boolean)
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
      })
    },
    handleDelete(row) {
      const ids = row.id || this.ids
      this.$modal
        .confirm('是否确认删除客户端编号为"' + ids + '"的数据项？')
        .then(() => delClient(ids))
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
@import '../../../assets/styles/tokens.scss';

.chip-list {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 4px;
}

.chip {
  display: inline-block;
  padding: 1px 6px;
  border-radius: $radius-xs;
  background: $fill-quaternary;
  font-family: $font-mono;
  font-size: 11px;
  line-height: 18px;
  color: $label;
}

.form-section {
  & + & {
    margin-top: $space-3;
    padding-top: $space-4;
    border-top: 1px solid $separator-light;
  }

  &__title {
    margin: 0 0 $space-3;
    font-size: 12px;
    font-weight: 600;
    color: $label-secondary;
  }
}
</style>
