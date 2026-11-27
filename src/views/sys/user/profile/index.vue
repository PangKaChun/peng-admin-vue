<template>
  <div class="page">
    <div class="page-body page-body--scroll">
      <div class="settings-sheet">
        <section class="settings-section">
          <h2 class="settings-title">两步验证</h2>
          <div class="settings-row">
            <div class="settings-row__info">
              <div class="settings-row__name">Google Authenticator</div>
              <div class="settings-row__status">{{ mfaStatusText }}</div>
            </div>
            <el-button
              v-if="!status.enabled"
              type="primary"
              size="small"
              :loading="loading"
              @click="handleBind"
            >启用</el-button>
            <el-button
              v-else-if="!status.enforced"
              type="danger"
              plain
              size="small"
              :loading="loading"
              @click="openDisable"
            >关闭</el-button>
          </div>
        </section>

        <section class="settings-section">
          <h2 class="settings-title">修改密码</h2>
          <el-form ref="pwdForm" :model="pwdForm" :rules="pwdRules" label-width="80px" class="pwd-form">
            <el-form-item label="旧密码" prop="oldPassword">
              <el-input v-model.trim="pwdForm.oldPassword" show-password placeholder="旧密码" autocomplete="current-password" />
            </el-form-item>
            <el-form-item label="新密码" prop="newPassword">
              <el-input v-model.trim="pwdForm.newPassword" show-password placeholder="新密码" autocomplete="new-password" />
            </el-form-item>
            <el-form-item label="确认密码" prop="confirmPassword">
              <el-input
                v-model.trim="pwdForm.confirmPassword"
                show-password
                placeholder="确认新密码"
                autocomplete="new-password"
                @keyup.enter.native="submitPwd"
              />
            </el-form-item>
            <el-form-item>
              <p class="pwd-constraint">{{ passwordRuleTip }}，有效期 {{ passwordPolicy.expireDays }} 天</p>
              <el-button type="primary" size="small" :loading="pwdLoading" @click="submitPwd">保存</el-button>
            </el-form-item>
          </el-form>
        </section>
      </div>
    </div>

    <el-dialog
      title="绑定验证器"
      :visible.sync="bindVisible"
      width="400px"
      append-to-body
      @opened="$refs.bindCodeInput && $refs.bindCodeInput.focus()"
    >
      <div class="mfa-bind">
        <img v-if="qrDataUrl" :src="qrDataUrl" class="mfa-bind__qr" alt="动态口令二维码" />
        <button
          v-if="secret"
          type="button"
          class="mfa-bind__secret"
          title="点击复制密钥"
          @click="copySecret"
        >
          <span>{{ secret }}</span>
          <i class="el-icon-document-copy" />
        </button>
        <el-input
          ref="bindCodeInput"
          v-model.trim="bindCode"
          maxlength="6"
          placeholder="6 位验证码"
          @keyup.enter.native="confirmEnable"
        />
      </div>
      <div slot="footer">
        <el-button @click="bindVisible = false">取消</el-button>
        <el-button type="primary" :loading="loading" @click="confirmEnable">确认启用</el-button>
      </div>
    </el-dialog>

    <el-dialog
      title="关闭两步验证"
      :visible.sync="disableVisible"
      width="400px"
      append-to-body
      @opened="$refs.disableCodeInput && $refs.disableCodeInput.focus()"
    >
      <el-input
        ref="disableCodeInput"
        v-model.trim="disableCode"
        maxlength="6"
        placeholder="当前 6 位验证码"
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
import { copyText } from '@/utils/clipboard'

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
        newPassword: [
          { required: true, message: '请输入新密码', trigger: 'blur' },
          newPasswordRule(() => this.passwordPolicy)
        ],
        confirmPassword: [
          { required: true, message: '请再次输入新密码', trigger: 'blur' },
          { validator: validateConfirmPassword, trigger: 'blur' }
        ]
      },
      passwordPolicy: { ...DEFAULT_PASSWORD_POLICY }
    }
  },
  computed: {
    mfaStatusText() {
      if (!this.status.enabled) return '未启用'
      return this.status.enforced ? '角色强制启用' : '已启用'
    },
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
    copySecret() {
      copyText(this.secret)
        .then(() => this.$modal.msgSuccess('密钥已复制'))
        .catch(() => this.$modal.msgError('复制失败'))
    },
    submitPwd() {
      if (this.pwdLoading) return
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
    handleBind() {
      this.loading = true
      bindMfa()
        .then(res => {
          this.secret = res.data.secret
          this.otpauthUri = res.data.otpauthUri
          this.bindCode = ''
          return QRCode.toDataURL(this.otpauthUri, { width: 180, margin: 1 })
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
    confirmEnable() {
      if (this.loading) return
      if (!this.bindCode) {
        this.$modal.msgError('请输入动态验证码')
        return
      }
      this.loading = true
      enableMfa(this.bindCode)
        .then(() => {
          this.$modal.msgSuccess('两步验证已启用')
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
    confirmDisable() {
      if (this.loading) return
      if (!this.disableCode) {
        this.$modal.msgError('请输入动态验证码')
        return
      }
      this.loading = true
      disableMfa(this.disableCode)
        .then(() => {
          this.$modal.msgSuccess('两步验证已关闭')
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
@import '@/assets/styles/tokens.scss';

.settings-sheet {
  max-width: 560px;
  margin: 0 auto;
}

.settings-section {
  padding: $space-5 0;

  & + & {
    border-top: 1px solid $separator-light;
  }
}

.settings-title {
  margin: 0 0 $space-4;
  font-size: 14px;
  font-weight: 600;
  color: $label;
}

.settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $space-4;

  &__name {
    font-size: 13px;
    font-weight: 500;
    color: $label;
  }

  &__status {
    margin-top: 2px;
    font-size: 12px;
    color: $label-secondary;
  }
}

.pwd-form {
  max-width: 440px;
}

.pwd-constraint {
  margin: 0 0 $space-3;
  font-size: 12px;
  color: $label-secondary;
  line-height: 1.5;
}

.mfa-bind {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $space-3;

  &__qr {
    width: 180px;
    height: 180px;
    border: 1px solid $separator-light;
    border-radius: $radius-md;
  }

  &__secret {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 10px;
    border: 1px solid $separator;
    border-radius: $radius-sm;
    background: $bg-subtle;
    font-family: $font-mono;
    font-size: 12px;
    letter-spacing: 0.04em;
    color: $label;
    cursor: pointer;
    word-break: break-all;

    &:hover {
      border-color: $color-primary;
      color: $color-primary;
    }
  }
}
</style>
