<template>
  <div class="login">
    <div class="login-card">
      <div class="login-header">
        <h1 class="login-title">{{ stepTitle }}</h1>
        <p v-if="step > 1" class="login-account">{{ form.username }}</p>
      </div>

      <!-- 第一步：账号密码 + 人机验证 -->
      <el-form v-show="step === 1" ref="loginForm" class="login-form" :model="form" :rules="rules" @submit.native.prevent>
        <el-form-item prop="username">
          <el-input v-model.trim="form.username" placeholder="用户名" autocomplete="off" @keyup.enter.native="onPrecheck">
            <i slot="prefix" class="el-input__icon el-icon-user" />
          </el-input>
        </el-form-item>
        <el-form-item prop="password">
          <el-input v-model.trim="form.password" placeholder="密码" show-password autocomplete="off" @keyup.enter.native="onPrecheck">
            <i slot="prefix" class="el-input__icon el-icon-lock" />
          </el-input>
        </el-form-item>
        <el-form-item v-if="captchaType === 'image'" key="captcha" prop="captcha">
          <div class="captcha-row">
            <el-input
              v-model.trim="form.captcha"
              class="captcha-input"
              placeholder="验证码"
              autocomplete="off"
              @keyup.enter.native="onPrecheck"
            >
              <i slot="prefix" class="el-input__icon el-icon-key" />
            </el-input>
            <div class="login-code" @click="refreshCaptcha">
              <el-image
                v-loading="captchaLoading"
                :src="`${captchaSrc + form.randomCode}`"
                fit="fill"
                @load="captchaLoading = false"
                @error="captchaLoading = false"
              >
                <div slot="error" class="el-image__error">刷新</div>
              </el-image>
            </div>
          </div>
        </el-form-item>
        <el-form-item v-else-if="captchaType === 'slider'" key="slider" prop="sliderToken">
          <slider-verify ref="slider" v-model="form.sliderToken" @success="$refs.loginForm.clearValidate('sliderToken')" />
        </el-form-item>
        <div v-else class="login-verify-placeholder" />
        <el-form-item class="login-actions">
          <el-button class="login-btn" type="primary" :loading="loginLoading" @click="onPrecheck">登录</el-button>
        </el-form-item>
      </el-form>

      <!-- 第二步：动态验证码 -->
      <el-form v-show="step === 2" ref="mfaForm" class="login-form" :model="mfaForm" :rules="mfaRules" @submit.native.prevent>
        <el-form-item prop="mfaCode">
          <el-input
            ref="mfaCodeInput"
            v-model.trim="mfaForm.mfaCode"
            maxlength="6"
            placeholder="6 位验证码"
            autocomplete="off"
            @keyup.enter.native="onVerifyMfa"
          >
            <i slot="prefix" class="el-input__icon el-icon-mobile-phone" />
          </el-input>
        </el-form-item>
        <el-form-item class="login-actions">
          <el-button class="login-btn" type="primary" :loading="loginLoading" @click="onVerifyMfa">{{ requirements.pwdChangeRequired ? '继续' : '登录' }}</el-button>
        </el-form-item>
        <div class="login-back">
          <el-button type="text" @click="backToStep1">返回</el-button>
        </div>
      </el-form>

      <!-- 第三步：绑定验证器 -->
      <el-form v-show="step === 3" ref="bindForm" class="login-form" :model="mfaForm" :rules="mfaRules" @submit.native.prevent>
        <div class="mfa-bind">
          <img v-if="bind.qrDataUrl" :src="bind.qrDataUrl" class="mfa-bind__qr" alt="验证器二维码" />
          <button
            v-if="bind.secret"
            type="button"
            class="mfa-bind__secret"
            title="点击复制密钥"
            @click="copySecret(bind.secret)"
          >
            <span>{{ bind.secret }}</span>
            <i class="el-icon-document-copy" />
          </button>
        </div>
        <el-form-item prop="mfaCode">
          <el-input
            ref="bindCodeInput"
            v-model.trim="mfaForm.mfaCode"
            maxlength="6"
            placeholder="6 位验证码"
            autocomplete="off"
            @keyup.enter.native="onVerifyMfa"
          >
            <i slot="prefix" class="el-input__icon el-icon-mobile-phone" />
          </el-input>
        </el-form-item>
        <el-form-item class="login-actions">
          <el-button class="login-btn" type="primary" :loading="loginLoading" @click="onVerifyMfa">{{ requirements.pwdChangeRequired ? '绑定并继续' : '绑定并登录' }}</el-button>
        </el-form-item>
        <div class="login-back">
          <el-button type="text" @click="backToStep1">返回</el-button>
        </div>
      </el-form>

      <!-- 第四步：重设密码 -->
      <el-form v-show="step === 4" ref="pwdForm" class="login-form" :model="pwdForm" :rules="pwdRules" @submit.native.prevent>
        <el-form-item prop="newPassword">
          <el-input v-model.trim="pwdForm.newPassword" show-password placeholder="新密码" autocomplete="new-password">
            <i slot="prefix" class="el-input__icon el-icon-lock" />
          </el-input>
        </el-form-item>
        <el-form-item prop="confirmPassword">
          <el-input
            v-model.trim="pwdForm.confirmPassword"
            show-password
            placeholder="确认新密码"
            autocomplete="new-password"
            @keyup.enter.native="onChangePwd"
          >
            <i slot="prefix" class="el-input__icon el-icon-lock" />
          </el-input>
        </el-form-item>
        <p class="pwd-constraint">{{ passwordRuleTip }}</p>
        <el-form-item class="login-actions">
          <el-button class="login-btn" type="primary" :loading="loginLoading" @click="onChangePwd">保存并登录</el-button>
        </el-form-item>
        <div class="login-back">
          <el-button type="text" @click="backToStep1">返回</el-button>
        </div>
      </el-form>
    </div>
  </div>
</template>

<script>
import QRCode from 'qrcode'
import { bindMfaForLogin, changePwdForLogin, getCaptchaType, getPasswordPolicy } from '@/api/login'
import { newPasswordRule, formatPasswordRule, DEFAULT_PASSWORD_POLICY } from '@/utils/validate'
import { copyText } from '@/utils/clipboard'
import SliderVerify from '@/components/SliderVerify'

const STEP_TITLES = {
  1: 'PENG ADMIN',
  2: '动态验证码',
  3: '绑定验证器',
  4: '重设密码'
}

export default {
  name: 'Login',
  components: { SliderVerify },
  data() {
    const validateConfirmPassword = (rule, value, callback) => {
      if (value !== this.pwdForm.newPassword) {
        callback(new Error('两次输入的密码不一致'))
      } else {
        callback()
      }
    }
    return {
      captchaSrc: process.env.VUE_APP_BASE_API + '/captcha/',
      captchaType: '',
      step: 1,
      ticket: '',
      requirements: {
        mfaRequired: false,
        mfaBindRequired: false,
        pwdChangeRequired: false
      },
      form: {
        username: '',
        password: '',
        randomCode: this.guid(),
        captcha: null,
        sliderToken: ''
      },
      mfaForm: {
        mfaCode: null
      },
      bind: {
        secret: '',
        qrDataUrl: ''
      },
      pwdForm: {
        newPassword: '',
        confirmPassword: ''
      },
      pwdRules: {
        newPassword: [newPasswordRule(() => this.passwordPolicy)],
        confirmPassword: [{ validator: validateConfirmPassword, trigger: 'blur' }]
      },
      passwordPolicy: { ...DEFAULT_PASSWORD_POLICY },
      rules: {
        username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
        password: [
          { required: true, message: '请输入密码', trigger: 'blur' },
          { min: 6, message: '长度最少 6 位', trigger: 'blur' }
        ],
        captcha: [{ required: true, message: '请输入验证码', trigger: 'blur' }],
        sliderToken: [{ required: true, message: '请完成滑块验证' }]
      },
      mfaRules: {
        mfaCode: [{ required: true, message: '请输入 6 位验证码', trigger: 'blur' }]
      },
      captchaLoading: true,
      loginLoading: false
    }
  },
  computed: {
    stepTitle() {
      return STEP_TITLES[this.step] || 'PENG ADMIN'
    },
    passwordRuleTip() {
      return formatPasswordRule(this.passwordPolicy)
    }
  },
  mounted() {
    this.loadCaptchaType()
  },
  methods: {
    loadCaptchaType() {
      getCaptchaType()
        .then(res => res.captchaType)
        .catch(() => 'image')
        .then(type => {
          this.captchaType = type === 'slider' ? 'slider' : 'image'
          if (this.captchaType === 'image') {
            this.refreshCaptcha()
          }
        })
    },
    refreshCaptcha() {
      this.captchaLoading = true
      this.form.randomCode = this.guid()
    },
    resetVerify() {
      if (this.captchaType === 'slider') {
        this.$refs.slider && this.$refs.slider.reset()
      } else {
        this.refreshCaptcha()
      }
    },
    guid() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.trunc(Math.random() * 16)
        const v = c === 'x' ? r : (r & 0x3) | 0x8
        return v.toString(16)
      })
    },
    copySecret(secret) {
      copyText(secret)
        .then(() => this.$modal.msgSuccess('密钥已复制'))
        .catch(() => this.$modal.msgError('复制失败'))
    },
    onPrecheck() {
      if (!this.captchaType) {
        return
      }
      this.$refs.loginForm.validate(valid => {
        if (!valid) {
          return
        }
        this.loginLoading = true
        this.$store
          .dispatch('user/Precheck', this.form)
          .then(({ mfaRequired, mfaBindRequired, pwdChangeRequired, ticket }) => {
            this.ticket = ticket
            this.requirements = {
              mfaRequired: !!mfaRequired,
              mfaBindRequired: !!mfaBindRequired,
              pwdChangeRequired: !!pwdChangeRequired
            }
            this.nextStep()
          })
          .catch(() => {
            this.loginLoading = false
            this.resetVerify()
          })
      })
    },
    nextStep() {
      this.loginLoading = false
      const { mfaRequired, mfaBindRequired, pwdChangeRequired } = this.requirements
      if (mfaBindRequired) {
        this.showBind()
      } else if (mfaRequired) {
        this.step = 2
        this.$nextTick(() => {
          this.$refs.mfaCodeInput.focus()
        })
      } else if (pwdChangeRequired) {
        getPasswordPolicy()
          .then(policy => {
            this.passwordPolicy = policy
          })
          .catch(() => {})
        this.step = 4
      } else {
        this.authorize()
      }
    },
    showBind() {
      this.loginLoading = true
      bindMfaForLogin(this.ticket)
        .then(res => {
          this.bind.secret = res.secret
          return QRCode.toDataURL(res.otpauthUri, { width: 176, margin: 1 })
        })
        .then(url => {
          this.bind.qrDataUrl = url
          this.step = 3
          this.loginLoading = false
          this.$nextTick(() => {
            this.$refs.bindCodeInput.focus()
          })
        })
        .catch(() => {
          this.backToStep1()
        })
    },
    onVerifyMfa() {
      const form = this.step === 3 ? this.$refs.bindForm : this.$refs.mfaForm
      form.validate(valid => {
        if (!valid) {
          return
        }
        this.loginLoading = true
        this.$store
          .dispatch('user/VerifyMfa', { ticket: this.ticket, code: this.mfaForm.mfaCode })
          .then(() => {
            this.requirements.mfaRequired = false
            this.requirements.mfaBindRequired = false
            this.nextStep()
          })
          .catch(() => {
            this.loginLoading = false
          })
      })
    },
    onChangePwd() {
      this.$refs.pwdForm.validate(valid => {
        if (!valid) {
          return
        }
        this.loginLoading = true
        changePwdForLogin(this.ticket, this.pwdForm.newPassword)
          .then(() => {
            this.$modal.msgSuccess('密码已修改')
            this.requirements.pwdChangeRequired = false
            this.nextStep()
          })
          .catch(() => {
            this.loginLoading = false
          })
      })
    },
    authorize() {
      this.loginLoading = true
      this.$store
        .dispatch('user/AuthorizeWithPKCE', { ticket: this.ticket })
        .catch(() => {
          this.loginLoading = false
          this.$modal.msgError('当前环境无法发起安全授权，请确认使用 HTTPS 或 localhost 访问')
          this.backToStep1()
        })
    },
    backToStep1() {
      this.step = 1
      this.ticket = ''
      this.requirements = { mfaRequired: false, mfaBindRequired: false, pwdChangeRequired: false }
      this.mfaForm.mfaCode = null
      this.bind = { secret: '', qrDataUrl: '' }
      this.$refs.mfaForm && this.$refs.mfaForm.clearValidate()
      this.$refs.bindForm && this.$refs.bindForm.clearValidate()
      this.$refs.pwdForm.resetFields()
      this.loginLoading = false
      this.resetVerify()
    }
  }
}
</script>

<style lang="scss" scoped>
@import '@/assets/styles/tokens.scss';

.login {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: $space-5;
  background: $bg-subtle;
}

.login-card {
  width: 360px;
  max-width: 100%;
  padding: $space-8 28px $space-6;
  background: $bg-base;
  border: 1px solid $separator;
  border-radius: $radius-lg;
  box-shadow: $shadow-card;
  animation: login-rise 0.35s $ease-out both;

  @media (prefers-reduced-motion: reduce) {
    animation: login-fade 0.2s $ease-out both;
  }
}

@keyframes login-rise {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes login-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}

.login-header {
  margin-bottom: $space-6;
  text-align: center;
}

.login-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.015em;
  color: $label;
}

.login-account {
  margin: $space-1 0 0;
  font-size: 13px;
  color: $label-secondary;
}

.login-form {
  ::v-deep .el-form-item {
    margin-bottom: $space-4;
  }

  ::v-deep .el-input__inner {
    height: 44px;
    line-height: 44px;
    border-radius: $radius-sm;
  }

  ::v-deep .el-input__icon {
    line-height: 44px;
    color: $label-tertiary;
  }
}

.captcha-row {
  display: flex;
  gap: $space-2;
}

.login-verify-placeholder {
  height: 44px;
  margin-bottom: $space-4;
}

.captcha-input {
  flex: 1;
}

.login-code {
  flex: 0 0 auto;

  ::v-deep .el-image {
    display: block;
    width: 112px;
    height: 44px;
    overflow: hidden;
    cursor: pointer;
    border: 1px solid $separator;
    border-radius: $radius-sm;
  }

  ::v-deep .el-image__error {
    width: 112px;
    height: 44px;
    line-height: 44px;
    font-size: 12px;
    color: $label-secondary;
  }
}

.login-actions {
  margin-top: $space-2;
  margin-bottom: $space-2 !important;
}

.login-btn {
  width: 100%;
  height: 44px;
  font-size: 14px;
  font-weight: 500;
  border-radius: $radius-sm;
}

.login-back {
  text-align: center;
}

.mfa-bind {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $space-3;
  margin-bottom: $space-4;

  &__qr {
    width: 176px;
    height: 176px;
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

.pwd-constraint {
  margin: 4px 0 $space-3;
  font-size: 12px;
  color: $label-secondary;
  line-height: 1.5;
}
</style>
