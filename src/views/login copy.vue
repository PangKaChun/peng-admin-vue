<template>
  <el-container class="containerBox">
    <el-main>
      <div class="title">
        <img
          src="@/assets/logo.png"
          alt=""
          height="40"
          style="vertical-align: middle"
        />
        <div>快件通关管理子系统 ｜ (深圳海关) PENG ADMIN ｜ 管理端</div>
      </div>
      <div class="bodyBox">
        <div class="imageBox">
          <div class="iiamg"></div>
          <!-- <img src="@/assets/images/login_jmages.png" alt="" /> -->
        </div>
        <div class="loginForm">
          <div class="formCard">
            <div class="formRoundBox">
              <h1 style="font-size: 24px; text-align: center; color: #fff">
                PENG ADMIN
              </h1>
              <h2 style="font-size: 16px; text-align: center; color: #fff">
                快件通关管理子系统
              </h2>
              <el-divider></el-divider>
              <el-form :model="form" :rules="rules" ref="loginForm">
                <el-form-item prop="username">
                  <el-input
                    v-model.trim="form.username"
                    placeholder="请输入用户名"
                    @keyup.enter.native="onSubmit"
                    autocomplete="off"
                  >
                    <i slot="prefix" class="el-input__icon el-icon-user"></i>
                  </el-input>
                </el-form-item>
                <el-form-item prop="password">
                  <el-input
                    placeholder="请输入密码"
                    v-model.trim="form.password"
                    show-password
                    autocomplete="off"
                  >
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
                    <el-image
                      v-loading="captchaLoading"
                      @load="captchaLoading = false"
                      :src="`${captchaSrc + form.randomCode}`"
                      @click="getCaptcha"
                      style="cursor: pointer"
                      fit="fill"
                    >
                      <div class="el-image__error" slot="error">验证码</div>
                    </el-image>
                  </div>
                </el-form-item>
                <el-form-item>
                  <el-button
                    type="info"
                    style="width: 100%"
                    round
                    @click="onSubmit"
                    :loading="loginLoading"
                    >登录</el-button
                  >
                  <!-- <a href="/" @click="onSubmit">登录</a> -->
                </el-form-item>
              </el-form>
            </div>
          </div>
        </div>
      </div>
      <div class="footer">
        技术支持:福建榕基软件有限公司深圳分公司&nbsp;联系电话&nbsp;&nbsp;13360546074
      </div>
    </el-main>
  </el-container>
</template>

<script>
export default {
  name: "Login",
  data() {
    return {
      captchaSrc: process.env.VUE_APP_BASE_API + "/captcha/",
      form: {
        username: "",
        password: "",
        randomCode: this.guid(),
        captcha: null,
      },
      rules: {
        username: [{ required: true, message: "请输入账号", trigger: "blur" }],
        password: [
          { required: true, message: "请输入密码", trigger: "blur" },
          { min: 6, message: "长度最少6位", trigger: "blur" },
        ],
        captcha: [{ required: true, message: "请输入验证码", trigger: "blur" }],
      },
      captchaLoading: true,
      loginLoading: false,
      redirect: undefined,
    };
  },
  watch: {
    $route: {
      handler: function (route) {
        this.redirect = route.query && route.query.redirect;
      },
      immediate: true,
    },
  },
  mounted() {
    this.getCaptcha();
  },
  methods: {
    getCaptcha() {
      this.captchaLoading = true;
      this.form.randomCode = this.guid();
    },
    guid() {
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
        /[xy]/g,
        function (c) {
          var r = (Math.random() * 16) | 0,
            v = c == "x" ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        }
      );
    },
    onSubmit() {
      this.$refs.loginForm.validate((valid) => {
        if (valid) {
          this.loginLoading = true;
          this.$store
            .dispatch("user/Login", this.form)
            .then(() => {
              this.$router.push({ path: this.redirect || "/" }).catch(() => {});
            })
            .catch(() => {
              this.loginLoading = false;
              this.getCaptcha();
            });
        }
      });
    },
  },
};
</script>

<style lang="scss" scoped>
.containerBox {
  width: 100%;
  height: 100%;
  background: #010b26;
  overflow: hidden;
  .title {
    width: 100%;
    height: 40px;
    color: #fff;
    padding: 34px 0 0 98px;
    font-size: 23px;
    display: flex;
    line-height: 40px;
    img {
      margin-right: 20px;
    }
  }
  .bodyBox {
    width: 100%;
    height: calc(100% - 80px);
    display: flex;
    align-items: center;
    padding-left: 14%;
    .imageBox {
      width: 52%;
      height: calc(100% - 80px);
      .iiamg {
        width: 757px;
        height: 570px;
        background-size: 100%;
        background-attachment: inherit;
        background: url("../assets/images/login_jmages.png") no-repeat;
      }
    }
    .loginForm {
      width: 54%;
      color: #fff;
      display: flex;
      padding-top: 40px;
      .formCard {
        width: 382px;
        height: 395px;
        margin: 0 auto;
        border-radius: 0.5em;
        font-family: sans-serif;
        position: relative;
        animation: animate_text 2s linear infinite alternate;
        color: #fff;
        z-index: 2;
        &::before {
          content: "";
          position: absolute;
          left: -2px;
          top: -2px;
          width: 387px;
          height: 399px;
          border-radius: 0.5em;
          z-index: -1;
          background-image: linear-gradient(60deg, #136aab, #723c99);
          background-size: 300%;
          animation: animate_bg 5s infinite;
        }

        @keyframes animate_bg {
          0%,
          100% {
            background-position: 0%, 50%;
          }

          50% {
            background-position: 100%, 50%;
          }
        }

        @keyframes animate_text {
          from {
            color: #136aab;
          }

          to {
            color: #723c99;
          }
        }
        .formRoundBox {
          width: 100%;
          height: 100%;
          background-color: rgb(1, 15, 51);
          border-radius: 0.5em;
          padding: 20px;

          a {
            position: absolute;
            top: 50%;
            left: 50%;
            text-decoration: none;
            transform: translate(-50%, -50%);
            font-size: 24px;
            background: linear-gradient(
              90deg,
              #136aab,
              #723c99,
              #723c99,
              #136aab
            );
            background-size: 400%;
            width: 100%;
            height: 50px;
            color: #fff;
            line-height: 50px;
            text-align: center;
            text-transform: uppercase;
            border-radius: 50px;
            z-index: 2;
            margin-top: 20px;
          }
          a::before {
            content: "";
            position: absolute;
            background: linear-gradient(
              90deg,
              #136aab,
              #723c99,
              #723c99,
              #136aab
            );
            background-size: 400%;
            width: 100%;
            height: 100%;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            padding: 10px;
            border-radius: 50px;
            z-index: -1;
          }
          a:hover::before {
            animation: sun 10s infinite;
          }
          a:hover {
            animation: sun 10s infinite;
          }

          @keyframes sun {
            100% {
              background-position: -400% 0;
            }
          }
        }
        .login-code {
          width: 33%;
          height: 54px;
          float: right;
          .el-image {
            width: 100%;
          }
          img {
            cursor: pointer;
            vertical-align: middle;
          }
        }
      }
    }
  }
  .footer{
    width: 100%;
    text-align: center;
    color: #fff;
  }
}
</style>

