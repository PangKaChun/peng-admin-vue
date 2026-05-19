<template>
  <el-container>
    <el-main>
      <el-card class="box-card">
        <div class="box-card-body">
          <h1 style="font-size: 24px; text-align: center; color: #202124">PENG ADMIN</h1>
          <el-divider></el-divider>
          <el-form :model="form" :rules="rules" ref="loginForm">
            <el-form-item prop="username">
              <el-input v-model.trim="form.username" placeholder="请输入用户名" @keyup.enter.native="onSubmit" autocomplete="off">
                <i slot="prefix" class="el-input__icon el-icon-user"></i>
              </el-input>
            </el-form-item>
            <el-form-item prop="password">
              <el-input placeholder="请输入密码" v-model.trim="form.password" show-password autocomplete="off">
                <i slot="prefix" class="el-input__icon el-icon-lock"></i>
              </el-input>
            </el-form-item>
            <el-form-item prop="captcha">
              <el-input
                style="width: 63%"
                placeholder="请输入验证码"
                v-model.trim="form.captcha"
                @keyup.enter.native="onSubmit"
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
              <el-button type="primary" style="width: 100%" @click="onSubmit" :loading="loginLoading">登录</el-button>
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
      form: {
        username: 'admin',
        password: '123456',
        randomCode: this.guid(),
        captcha: null
      },
      rules: {
        username: [{ required: true, message: '请输入账号', trigger: 'blur' }],
        password: [
          { required: true, message: '请输入密码', trigger: 'blur' },
          { min: 6, message: '长度最少6位', trigger: 'blur' }
        ],
        captcha: [{ required: true, message: '请输入验证码', trigger: 'blur' }]
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
    onSubmit() {
      this.$refs.loginForm.validate(valid => {
        if (valid) {
          this.loginLoading = true
          this.$store
            .dispatch('user/Login', this.form)
            .then(() => {
              this.$router.push({ path: this.redirect || '/' }).catch(() => {})
            })
            .catch(() => {
              this.loginLoading = false
              this.getCaptcha()
            })
        }
      })
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
</style>
