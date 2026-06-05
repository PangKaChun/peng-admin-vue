<template>
  <el-container>
    <el-main>
      <el-card class="box-card">
        <div class="box-card-body">
          <h1 style="font-size: 24px; text-align: center; color: #202124">PENG ADMIN</h1>
          <el-divider></el-divider>

          <!-- 第一步:账号密码 + 图形验证码 -->
          <el-form v-show="step === 1" :model="form" :rules="rules" ref="loginForm" @submit.native.prevent>
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
              <el-input
                style="width: 63%"
                placeholder="请输入验证码"
                v-model.trim="form.captcha"
                @keyup.enter.native="onPrecheck"
                autocomplete="off"
              >
                <i slot="prefix" class="el-input__icon el-icon-key"></i>
              </el-input>
              <div class="login-code">
                <el-image v-loading="captchaLoading" @load="captchaLoading=false" :src="`${captchaSrc + form.randomCode}`" @click="getCaptcha" style="cursor: pointer" fit="fill">
                  <div class="el-image__error" slot="error">验证码</div>
                </el-image>
              </div>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" style="width: 100%" @click="onPrecheck" :loading="loginLoading">登录</el-button>
            </el-form-item>
          </el-form>

          <!-- 第二步:Google Authenticator 动态验证码（账密校验通过后才出现） -->
          <el-form v-show="step === 2" :model="mfaForm" :rules="mfaRules" ref="mfaForm" @submit.native.prevent>
            <p class="mfa-hint">账号 <b>{{ form.username }}</b> 已通过验证，请输入 Google Authenticator 中的 6 位动态验证码。</p>
            <el-form-item prop="mfaCode">
              <el-input v-model.trim="mfaForm.mfaCode" maxlength="6" placeholder="请输入 6 位动态验证码" @keyup.enter.native="onVerifyMfa" autocomplete="off">
                <i slot="prefix" class="el-input__icon el-icon-mobile-phone"></i>
              </el-input>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" style="width: 100%" @click="onVerifyMfa" :loading="loginLoading">登录</el-button>
            </el-form-item>
            <el-form-item>
              <el-button type="text" @click="backToStep1">返回上一步</el-button>
            </el-form-item>
          </el-form>
        </div>
      </el-card>
    </el-main>
  </el-container>
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
    this.getCaptcha()
  },
  methods: {
    getCaptcha() {
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
            } else {
              // 未开启 MFA:凭票据直接完成登录
              this.authorize()
            }
          })
          .catch(() => {
            this.loginLoading = false
            this.getCaptcha()
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
      this.getCaptcha()
    }
  }
}
</script>

<style lang="scss" scoped>
.el-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  background-image: url('../assets/images/login-bg.jpg');
  background-size: cover;
}

.box-card {
  background-color: white;
  max-width: 440px;
  min-height: 368.25px;
  border-radius: 0%;
  margin: auto;

  .box-card-body {
    padding: 24px;
  }
}

.login-code {
  width: 33%;
  height: 54px;
  float: right;
  .el-image{
    width: 100%;
  }
  img {
    cursor: pointer;
    vertical-align: middle;
  }
}

.mfa-hint {
  color: #909399;
  font-size: 13px;
  line-height: 1.6;
  margin: 0 0 16px;
}
</style>
