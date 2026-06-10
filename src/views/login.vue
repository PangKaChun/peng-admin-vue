<template>
  <div class="login">
    <div class="login-card">
      <div class="login-header">
        <h1 class="login-title">PENG ADMIN</h1>
        <p class="login-subtitle">欢迎登录</p>
      </div>

      <!-- 第一步:账号密码 + 图形验证码 -->
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
        <el-form-item prop="captcha">
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
    </div>
  </div>
</template>

<script>
export default {
  name: 'Login',
  data() {
    return {
      captchaSrc: process.env.VUE_APP_BASE_API +'/captcha/' ,
      step: 1,
      ticket: '',
      form: {
        username: 'admin',
        password: '123456',
        randomCode: this.guid(),
        captcha: null
      },
      mfaForm: {
        mfaCode: null
      },
      rules: {
        username: [{ required: true, message: '请输入账号', trigger: 'blur' }],
        password: [
          { required: true, message: '请输入密码', trigger: 'blur' },
          { min: 6, message: '长度最少6位', trigger: 'blur' }
        ],
        captcha: [{ required: true, message: '请输入验证码', trigger: 'blur' }]
      },
      mfaRules: {
        mfaCode: [{ required: true, message: '请输入动态验证码', trigger: 'blur' }]
      },
      captchaLoading: true,
      loginLoading: false,
      redirect: undefined
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
    this.refreshCaptcha()
  },
  methods: {
    refreshCaptcha() {
      this.captchaLoading = true
      this.form.randomCode = this.guid()
    },
    guid() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0,
                v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },
    // 第一步:校验账号密码 + 图形验证码
    onPrecheck() {
      this.$refs.loginForm.validate(valid => {
        if (!valid) {
          return
        }
        this.loginLoading = true
        this.$store
          .dispatch('user/Precheck', this.form)
          .then(({ mfaRequired, ticket }) => {
            this.ticket = ticket
            if (mfaRequired) {
              // 需要动态码:进入第二步
              this.step = 2
              this.loginLoading = false
              this.$nextTick(() => {
                this.$refs.mfaCodeInput.focus()
              })
            } else {
              // 未开启 MFA:凭票据直接完成登录
              this.authorize()
            }
          })
          .catch(() => {
            this.loginLoading = false
            this.refreshCaptcha()
          })
      })
    },
    // 第二步:校验动态验证码后完成登录
    onVerifyMfa() {
      this.$refs.mfaForm.validate(valid => {
        if (!valid) {
          return
        }
        this.loginLoading = true
        this.$store
          .dispatch('user/VerifyMfa', { ticket: this.ticket, code: this.mfaForm.mfaCode })
          .then(() => {
            this.authorize()
          })
          .catch(() => {
            this.loginLoading = false
          })
      })
    },
    // 凭挑战票据走 PKCE 发码
    authorize() {
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
      this.mfaForm.mfaCode = null
      this.loginLoading = false
      this.refreshCaptcha()
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

@media (max-width: 480px) {
  .login-card {
    padding: $space-6 $space-5;
  }
}
</style>
