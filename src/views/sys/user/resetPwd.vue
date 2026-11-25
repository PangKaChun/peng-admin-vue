<template>
  <el-dialog :title="username ? `重置密码（${username}）` : '重置密码'" :visible.sync="visible" width="440px" append-to-body>
    <el-form ref="form" :model="form" :rules="rules" label-width="80px">
      <el-form-item label="新密码" prop="password">
        <el-input v-model.trim="form.password" show-password placeholder="新密码" autocomplete="new-password" />
      </el-form-item>
      <el-form-item label="确认密码" prop="checkPassword">
        <el-input v-model.trim="form.checkPassword" show-password placeholder="确认新密码" autocomplete="new-password" @keyup.enter.native="submit" />
      </el-form-item>
      <el-form-item class="pwd-hint-item">
        <p class="pwd-constraint">{{ passwordRuleTip }}</p>
      </el-form-item>
    </el-form>
    <div slot="footer">
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" @click="submit">确定</el-button>
    </div>
  </el-dialog>
</template>

<script>
import { resetUserPwd } from '@/api/sys/user'
import { getPasswordPolicy } from '@/api/login'
import { validPassword, formatPasswordRule, DEFAULT_PASSWORD_POLICY } from '@/utils/validate'

export default {
  name: 'resetPwd',
  props: {
    userId: {
      type: String,
      default: undefined
    },
    username: {
      type: String,
      default: undefined
    }
  },
  data() {
    const validatePass = (rule, value, callback) => {
      if (!value) {
        callback(new Error('请输入密码'))
      } else if (!validPassword(value, this.passwordPolicy)) {
        callback(new Error(this.passwordRuleTip))
      } else {
        if (this.form.checkPassword) {
          this.$refs.form.validateField('checkPassword')
        }
        callback()
      }
    }
    const validatePass2 = (rule, value, callback) => {
      if (value === '') {
        callback(new Error('请再次输入密码'))
      } else if (value !== this.form.password) {
        callback(new Error('两次输入密码不一致'))
      } else {
        callback()
      }
    }
    return {
      visible: false,
      form: {
        password: '',
        checkPassword: ''
      },
      rules: {
        password: [{ required: true, validator: validatePass, trigger: 'blur' }],
        checkPassword: [{ required: true, validator: validatePass2, trigger: 'blur' }]
      },
      passwordPolicy: { ...DEFAULT_PASSWORD_POLICY }
    }
  },
  computed: {
    passwordRuleTip() {
      return formatPasswordRule(this.passwordPolicy)
    }
  },
  methods: {
    submit() {
      this.$refs.form.validate(valid => {
        if (!valid) return
        resetUserPwd(this.userId, this.form.password).then(() => {
          this.$modal.msgSuccess('密码已重置')
          this.visible = false
        })
      })
    },
    reset() {
      this.form = {
        password: '',
        checkPassword: ''
      }
      this.$nextTick(() => {
        this.$refs.form && this.$refs.form.clearValidate()
      })
      getPasswordPolicy()
        .then(policy => {
          this.passwordPolicy = policy
        })
        .catch(() => {})
    }
  }
}
</script>

<style lang="scss" scoped>
@import '../../../assets/styles/tokens.scss';

.pwd-hint-item {
  margin-bottom: 0;
}

.pwd-constraint {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: $label-secondary;
}
</style>
