<template>
  <div class="login">
    <div class="login-card">
      <div class="login-header">
        <h1 class="login-title">PENG ADMIN</h1>
        <p class="login-subtitle">欢迎登录</p>
      </div>

      <!-- 第一步:账号密码 + 人机验证(图形验证码或滑块二选一) -->
      <el-form v-show="step === 1" class="login-form" :model="form" :rules="rules" ref="loginForm" @submit.native.prevent>
        <el-form-item prop="username">
          <el-input v-model.trim="form.username" placeholder="请输入用户名" @keyup.enter.native="onPrecheck" autocomplete="off">
            <i slot="prefix" class="el-input__icon el-icon-user"></i>
          </el-input>
        </el-form-item>
        <el-form-item prop="password">
          <el-input placeholder="请输入密码" v-model.trim="form.password" show-password autocomplete="off" @keyup.enter.native="onPrecheck">
            <i slot="prefix" class="el-input__icon el-icon-lock"></i>
          </el-input>
        </el-form-item>
        <el-form-item v-if="captchaType === 'image'" key="captcha" prop="captcha">
          <div class="captcha-row">
            <el-input
              class="captcha-input"
              placeholder="请输入验证码"
              v-model.trim="form.captcha"
              @keyup.enter.native="onPrecheck"
              autocomplete="off"
            >
              <i slot="prefix" class="el-input__icon el-icon-key"></i>
            </el-input>
            <div class="login-code">
              <el-image
                v-loading="captchaLoading"
                @load="captchaLoading = false"
                :src="`${captchaSrc + form.randomCode}`"
                @click="refreshCaptcha"
                fit="fill"
              >
                <div class="el-image__error" slot="error">验证码</div>
              </el-image>
            </div>
          </div>
        </el-form-item>
        <el-form-item v-else-if="captchaType === 'slider'" key="slider" prop="sliderToken">
          <slider-verify ref="slider" v-model="form.sliderToken" @success="$refs.loginForm.clearValidate('sliderToken')" />
        </el-form-item>
        <!-- 验证方式加载前先占住一行 -->
        <div v-else class="login-verify-placeholder"></div>
        <el-form-item class="login-actions">
          <el-button class="login-btn" type="primary" @click="onPrecheck" :loading="loginLoading">登录</el-button>
        </el-form-item>
      </el-form>

      <!-- 第二步:Google Authenticator 动态验证码（账密校验通过后才出现） -->
      <el-form v-show="step === 2" class="login-form" :model="mfaForm" :rules="mfaRules" ref="mfaForm" @submit.native.prevent>
        <p class="mfa-hint">账号 <b>{{ form.username }}</b> 已通过验证，请输入 Google&nbsp;Authenticator 中的 6 位动态验证码。</p>
        <el-form-item prop="mfaCode">
          <el-input ref="mfaCodeInput" v-model.trim="mfaForm.mfaCode" maxlength="6" placeholder="请输入 6 位动态验证码" @keyup.enter.native="onVerifyMfa" autocomplete="off">
            <i slot="prefix" class="el-input__icon el-icon-mobile-phone"></i>
          </el-input>
        </el-form-item>
        <el-form-item class="login-actions">
          <el-button class="login-btn" type="primary" @click="onVerifyMfa" :loading="loginLoading">登录</el-button>
        </el-form-item>
        <div class="login-back">
          <el-button type="text" @click="backToStep1">返回上一步</el-button>
        </div>
      </el-form>

      <!-- 强制绑定动态验证码 -->
      <el-form v-show="step === 3" class="login-form" :model="mfaForm" :rules="mfaRules" ref="bindForm" @submit.native.prevent>
        <p class="mfa-hint">账号 <b>{{ form.username }}</b> 须启用多因素认证。请用 Google&nbsp;Authenticator 扫码或手动录入密钥，再输入 6 位动态验证码。</p>
        <div class="mfa-bind">
          <img v-if="bind.qrDataUrl" :src="bind.qrDataUrl" class="mfa-bind__qr" alt="动态口令二维码" />
          <p class="mfa-bind__secret">{{ bind.secret }}</p>
        </div>
        <el-form-item prop="mfaCode">
          <el-input ref="bindCodeInput" v-model.trim="mfaForm.mfaCode" maxlength="6" placeholder="请输入 6 位动态验证码" @keyup.enter.native="onVerifyMfa" autocomplete="off">
            <i slot="prefix" class="el-input__icon el-icon-mobile-phone"></i>
          </el-input>
        </el-form-item>
        <el-form-item class="login-actions">
          <el-button class="login-btn" type="primary" @click="onVerifyMfa" :loading="loginLoading">绑定并继续</el-button>
        </el-form-item>
        <div class="login-back">
          <el-button type="text" @click="backToStep1">返回上一步</el-button>
        </div>
      </el-form>

      <!-- 初始密码 / 已过期:修改密码 -->
      <el-form v-show="step === 4" class="login-form" :model="pwdForm" :rules="pwdRules" ref="pwdForm" @submit.native.prevent>
        <p class="mfa-hint">账号 <b>{{ form.username }}</b> 的密码为初始密码或已超过有效期，请设置新密码：{{ passwordRuleTip }}。</p>
        <el-form-item prop="newPassword">
          <el-input v-model.trim="pwdForm.newPassword" show-password placeholder="请输入新密码" autocomplete="new-password">
            <i slot="prefix" class="el-input__icon el-icon-lock"></i>
          </el-input>
        </el-form-item>
        <el-form-item prop="confirmPassword">
          <el-input v-model.trim="pwdForm.confirmPassword" show-password placeholder="请再次输入新密码" autocomplete="new-password" @keyup.enter.native="onChangePwd">
            <i slot="prefix" class="el-input__icon el-icon-lock"></i>
          </el-input>
        </el-form-item>
        <el-form-item class="login-actions">
          <el-button class="login-btn" type="primary" @click="onChangePwd" :loading="loginLoading">修改并登录</el-button>
        </el-form-item>
        <div class="login-back">
          <el-button type="text" @click="backToStep1">返回上一步</el-button>
        </div>
      </el-form>
    </div>
  </div>
</template>

<script>
import QRCode from 'qrcode'
import { bindMfaForLogin, changePwdForLogin, getCaptchaType, getPasswordPolicy } from '@/api/login'
import { newPasswordRule, formatPasswordRule, DEFAULT_PASSWORD_POLICY } from '@/utils/validate'
import SliderVerify from '@/components/SliderVerify'

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
      captchaSrc: process.env.VUE_APP_BASE_API +'/captcha/' ,
      // 人机验证方式:image 图形验证码 / slider 滑块
      captchaType: '',
      step: 1,
      ticket: '',
      // precheck 返回的待完成步骤
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
        username: [{ required: true, message: '请输入账号', trigger: 'blur' }],
        password: [
          { required: true, message: '请输入密码', trigger: 'blur' },
          { min: 6, message: '长度最少6位', trigger: 'blur' }
        ],
        captcha: [{ required: true, message: '请输入验证码', trigger: 'blur' }],
        sliderToken: [{ required: true, message: '请完成滑块验证' }]
      },
      mfaRules: {
        mfaCode: [{ required: true, message: '请输入动态验证码', trigger: 'blur' }]
      },
      captchaLoading: true,
      loginLoading: false,
      redirect: undefined
    }
  },
  computed: {
    passwordRuleTip() {
      return formatPasswordRule(this.passwordPolicy)
    }
  },
  watch: {
    $route: {
      handler: function (route) {
        this.redirect = route.query && route.query.redirect
      },
      immediate: true
    }
  },
  mounted() {
    this.loadCaptchaType()
  },
  methods: {
    // 人机验证方式:图形验证码或滑块二选一,默认图形验证码
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
    // 重新做人机验证:图形验证码换一张,滑块复位
    resetVerify() {
      if (this.captchaType === 'slider') {
        this.$refs.slider.reset()
      } else {
        this.refreshCaptcha()
      }
    },
    guid() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0,
                v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },
    // 第一步:校验账号密码 + 人机验证
    onPrecheck() {
      // 验证方式还没加载出来时不提交
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
    // 动态码先于改密,全部完成后凭票据发码
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
          return QRCode.toDataURL(res.otpauthUri, { width: 180, margin: 1 })
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
    // 校验动态验证码;强制绑定时校验通过即完成绑定
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
    // 凭挑战票据走 PKCE 发码
    authorize() {
      this.loginLoading = true
      this.$store
        .dispatch('user/AuthorizeWithPKCE', { ticket: this.ticket })
        .catch(() => {
          this.loginLoading = false
          this.backToStep1()
        })
    },
    backToStep1() {
      this.step = 1
      this.ticket = ''
      this.requirements = { mfaRequired: false, mfaBindRequired: false, pwdChangeRequired: false }
      this.mfaForm.mfaCode = null
      this.bind = { secret: '', qrDataUrl: '' }
      this.$refs.pwdForm.resetFields()
      this.loginLoading = false
      this.resetVerify()
    }
  }
}
</script>

<style lang="scss" scoped>
@import '../assets/styles/tokens.scss';

.login {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: $space-5;
  background: #1b1b1f url('../assets/images/login-bg.png') center / cover no-repeat;

  // 轻微压暗背景,让白卡与柔和阴影更聚焦
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(0, 0, 0, 0.25), rgba(0, 0, 0, 0.45));
    pointer-events: none;
  }
}

.login-card {
  position: relative;
  z-index: 1;
  width: 400px;
  max-width: 100%;
  padding: $space-8 $space-8 $space-6;
  background: $bg-base;
  border-radius: $radius-lg;
  box-shadow: $shadow-card;
  animation: login-rise 0.5s $ease-out both;

  // 减弱动效:去位移,保留淡入
  @media (prefers-reduced-motion: reduce) {
    animation: login-fade 0.3s $ease-out both;
  }
}

@keyframes login-rise {
  from {
    opacity: 0;
    transform: translateY(16px);
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
  margin: $space-3 0 0;
  font-size: 26px;
  font-weight: 600;
  letter-spacing: 0.5px;
  color: $label;
}

.login-subtitle {
  margin: $space-2 0 0;
  font-size: 14px;
  color: $label-secondary;
}

.login-form {
  ::v-deep .el-form-item {
    margin-bottom: $space-5;
  }

  ::v-deep .el-input__inner {
    height: 44px;
    line-height: 44px;
    border-radius: $radius-sm;

    &:focus {
      box-shadow: 0 0 0 3px rgba($color-primary, 0.12);
    }
  }

  ::v-deep .el-input__icon {
    line-height: 44px;
    color: $label-secondary;
  }
}

.captcha-row {
  display: flex;
  gap: $space-3;
}

.login-verify-placeholder {
  height: 44px;
  margin-bottom: $space-5;
}

.captcha-input {
  flex: 1;
}

.login-code {
  flex: 0 0 auto;

  ::v-deep .el-image {
    display: block;
    width: 120px;
    height: 44px;
    overflow: hidden;
    cursor: pointer;
    border: 1px solid $separator;
    border-radius: $radius-sm;
  }

  ::v-deep .el-image__error {
    width: 120px;
    height: 44px;
    line-height: 44px;
    font-size: 13px;
  }
}

.login-actions {
  margin-bottom: $space-3;
}

.login-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 44px;
  font-size: 15px;
  font-weight: 500;
  letter-spacing: 2px;
  border-radius: $radius-sm;
}

.login-back {
  text-align: center;
}

.mfa-hint {
  margin: 0 0 $space-5;
  padding: $space-3 $space-4;
  font-size: 13px;
  line-height: 1.6;
  color: $label-secondary;
  background: $fill-quaternary;
  border-radius: $radius-md;

  b {
    color: $label;
    font-weight: 600;
  }
}

.mfa-bind {
  margin-bottom: $space-4;
  text-align: center;

  &__qr {
    width: 180px;
    height: 180px;
  }

  &__secret {
    margin: $space-2 0 0;
    font-family: ui-monospace, Menlo, Consolas, monospace;
    font-size: 13px;
    letter-spacing: 1px;
    word-break: break-all;
    color: $label;
  }
}

@media (max-width: 480px) {
  .login-card {
    padding: $space-6 $space-5;
  }
}
</style>
