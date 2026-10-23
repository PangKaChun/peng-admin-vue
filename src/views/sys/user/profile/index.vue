<template>
  <div class="app-container">
    <el-row :gutter="20">
      <el-col :xs="24" :sm="16" :md="12" :lg="10">
        <el-card shadow="never">
          <div slot="header">
            <span>多因素认证（Google Authenticator）</span>
          </div>

          <div class="mfa-status">
            <span class="mfa-status__label">当前状态：</span>
            <el-tag v-if="status.enabled" type="success" size="small">已启用</el-tag>
            <el-tag v-else type="info" size="small">未启用</el-tag>
          </div>

          <p class="mfa-tip">
            启用后，登录时除账号密码与图形验证码外，还需输入 Google Authenticator 生成的 6 位动态验证码。
          </p>

          <el-button
            v-if="!status.enabled"
            type="primary"
            :loading="loading"
            @click="handleBind"
          >启用</el-button>
          <el-button
            v-else-if="!status.enforced"
            type="danger"
            :loading="loading"
            @click="openDisable"
          >关闭</el-button>
          <p v-else class="mfa-tip">当前账号的角色要求必须启用多因素认证，不能关闭。</p>
        </el-card>
      </el-col>

      <el-col :xs="24" :sm="16" :md="12" :lg="10">
        <el-card shadow="never">
          <div slot="header">
            <span>修改密码</span>
          </div>
          <el-form ref="pwdForm" :model="pwdForm" :rules="pwdRules" label-width="90px">
            <el-form-item label="旧密码" prop="oldPassword">
              <el-input v-model.trim="pwdForm.oldPassword" show-password placeholder="请输入旧密码" autocomplete="current-password" />
            </el-form-item>
            <el-form-item label="新密码" prop="newPassword">
              <el-input v-model.trim="pwdForm.newPassword" show-password placeholder="请输入新密码" autocomplete="new-password" />
            </el-form-item>
            <el-form-item label="确认密码" prop="confirmPassword">
              <el-input v-model.trim="pwdForm.confirmPassword" show-password placeholder="请再次输入新密码" autocomplete="new-password" />
            </el-form-item>
            <p class="mfa-tip">{{ passwordRuleTip }}；密码有效期 {{ passwordPolicy.expireDays }} 天，到期后登录须修改。</p>
            <el-button type="primary" :loading="pwdLoading" @click="submitPwd">保存</el-button>
          </el-form>
        </el-card>
      </el-col>
    </el-row>

    <!-- 绑定 / 启用弹窗 -->
    <el-dialog title="绑定 Google Authenticator" :visible.sync="bindVisible" width="420px" append-to-body>
      <div class="mfa-bind">
        <img v-if="qrDataUrl" :src="qrDataUrl" class="mfa-bind__qr" alt="动态口令二维码" />
        <p class="mfa-bind__secret">密钥：<span>{{ secret }}</span></p>
        <p class="mfa-tip">使用 Google Authenticator 扫码，或手动录入上述密钥，然后输入 6 位动态验证码确认。</p>
        <el-input
          v-model.trim="bindCode"
          maxlength="6"
          placeholder="请输入 6 位动态验证码"
          @keyup.enter.native="confirmEnable"
        />
      </div>
      <div slot="footer">
        <el-button @click="bindVisible = false">取消</el-button>
        <el-button type="primary" :loading="loading" @click="confirmEnable">确认启用</el-button>
      </div>
    </el-dialog>

    <!-- 关闭弹窗 -->
    <el-dialog title="关闭多因素认证" :visible.sync="disableVisible" width="420px" append-to-body>
      <p class="mfa-tip">请输入当前 Google Authenticator 的 6 位动态验证码以确认关闭。</p>
      <el-input
        v-model.trim="disableCode"
        maxlength="6"
        placeholder="请输入 6 位动态验证码"
        @keyup.enter.native="confirmDisable"
      />
      <div slot="footer">
        <el-button @click="disableVisible = false">取消</el-button>
        <el-button type="danger" :loading="loading" @click="confirmDisable">确认关闭</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import QRCode from 'qrcode'
import { getMfaStatus, bindMfa, enableMfa, disableMfa } from '@/api/sys/mfa'
import { updateUserPwd } from '@/api/sys/user'
import { getPasswordPolicy } from '@/api/login'
import { newPasswordRule, formatPasswordRule, DEFAULT_PASSWORD_POLICY } from '@/utils/validate'

export default {
  name: 'Profile',
  data() {
    const validateConfirmPassword = (rule, value, callback) => {
      if (value !== this.pwdForm.newPassword) {
        callback(new Error('两次输入的密码不一致'))
      } else {
        callback()
      }
    }
    return {
      status: { enabled: false, bound: false, enforced: false },
      loading: false,
      bindVisible: false,
      disableVisible: false,
      secret: '',
      otpauthUri: '',
      qrDataUrl: '',
      bindCode: '',
      disableCode: '',
      pwdLoading: false,
      pwdForm: {
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
      },
      pwdRules: {
        oldPassword: [{ required: true, message: '请输入旧密码', trigger: 'blur' }],
        newPassword: [newPasswordRule(() => this.passwordPolicy)],
        confirmPassword: [{ validator: validateConfirmPassword, trigger: 'blur' }]
      },
      passwordPolicy: { ...DEFAULT_PASSWORD_POLICY }
    }
  },
  computed: {
    passwordRuleTip() {
      return formatPasswordRule(this.passwordPolicy)
    }
  },
  created() {
    this.getStatus()
    getPasswordPolicy()
      .then(policy => {
        this.passwordPolicy = policy
      })
      .catch(() => {})
  },
  methods: {
    getStatus() {
      getMfaStatus().then(res => {
        this.status = res.data || { enabled: false, bound: false, enforced: false }
      })
    },
    submitPwd() {
      this.$refs.pwdForm.validate(valid => {
        if (!valid) {
          return
        }
        this.pwdLoading = true
        updateUserPwd(this.pwdForm.oldPassword, this.pwdForm.newPassword)
          .then(() => {
            this.$modal.msgSuccess('密码已修改')
            this.$refs.pwdForm.resetFields()
          })
          .catch(() => {})
          .finally(() => {
            this.pwdLoading = false
          })
      })
    },
    // 生成密钥并打开绑定弹窗
    handleBind() {
      this.loading = true
      bindMfa()
        .then(res => {
          this.secret = res.data.secret
          this.otpauthUri = res.data.otpauthUri
          this.bindCode = ''
          return QRCode.toDataURL(this.otpauthUri, { width: 200, margin: 1 })
        })
        .then(url => {
          this.qrDataUrl = url
          this.bindVisible = true
        })
        .catch(() => {})
        .finally(() => {
          this.loading = false
        })
    },
    // 校验动态口令并启用
    confirmEnable() {
      if (!this.bindCode) {
        this.$modal.msgError('请输入动态验证码')
        return
      }
      this.loading = true
      enableMfa(this.bindCode)
        .then(() => {
          this.$modal.msgSuccess('多因素认证已启用')
          this.bindVisible = false
          this.getStatus()
        })
        .catch(() => {})
        .finally(() => {
          this.loading = false
        })
    },
    openDisable() {
      this.disableCode = ''
      this.disableVisible = true
    },
    // 校验动态口令并关闭
    confirmDisable() {
      if (!this.disableCode) {
        this.$modal.msgError('请输入动态验证码')
        return
      }
      this.loading = true
      disableMfa(this.disableCode)
        .then(() => {
          this.$modal.msgSuccess('多因素认证已关闭')
          this.disableVisible = false
          this.getStatus()
        })
        .catch(() => {})
        .finally(() => {
          this.loading = false
        })
    }
  }
}
</script>

<style lang="scss" scoped>
.mfa-status {
  display: flex;
  align-items: center;
  margin-bottom: 12px;

  &__label {
    color: #606266;
  }
}

.mfa-tip {
  color: #909399;
  font-size: 12px;
  line-height: 1.6;
  margin: 0 0 16px;
}

.mfa-bind {
  text-align: center;

  &__qr {
    width: 200px;
    height: 200px;
  }

  &__secret {
    word-break: break-all;
    color: #303133;
    font-size: 13px;
    margin: 8px 0 4px;

    span {
      font-family: ui-monospace, Menlo, Consolas, monospace;
      letter-spacing: 1px;
    }
  }
}
</style>
