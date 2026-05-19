<template>
  <el-dialog title="重置密码" :visible.sync="visible">
    <div class="username">请输入"{{username}}"的新密码</div>
    <el-form ref="form" label-position="left" :model="form" :rules="rules" label-width="100px">
      <el-row>
        <el-col :xs="{ span: 24 }" :sm="{ span: 14 }" :lg="{ span: 14 }">
          <el-form-item label="新密码" prop="password">
            <el-input show-password v-model.trim="form.password" placeholder="请输入新密码"></el-input>
          </el-form-item>
        </el-col>
      </el-row>
      <el-row>
        <el-col :xs="{ span: 24 }" :sm="{ span: 14 }" :lg="{ span: 14 }">
          <el-form-item label="确认密码" prop="checkPassword">
            <el-input show-password v-model.trim="form.checkPassword" placeholder="请输入再次新密码"></el-input>
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>
    <div style="text-align: right">
      <el-button @click="visible = false">取 消</el-button>
      <el-button type="primary" @click="submit">提 交</el-button>
    </div>
  </el-dialog>
</template>

<script>
import { resetUserPwd } from '@/api/sys/user'
export default {
  name: 'resetPwd',
  props: {
    userId: {
      type: String,
      default: undefined
    },
    username: {
      type: String,
      default: void 0
    }
  },
  data() {
    var validatePass = (rule, value, callback) => {
      if (value === '') {
        callback(new Error('请输入密码'))
      } else {
        if (this.form.checkPassword !== '') {
          this.$refs.form.validateField('checkPassword')
        }
        callback()
      }
    }
    var validatePass2 = (rule, value, callback) => {
      if (value === '') {
        callback(new Error('请再次输入密码'))
      } else if (value !== this.form.password) {
        callback(new Error('两次输入密码不一致!'))
      } else {
        callback()
      }
    }
    return {
      visible: false,
      form: {
        password: undefined,
        checkPassword: undefined
      },
      rules: {
        password: [
          { validator: validatePass, trigger: 'blur' },
          { min: 6, message: '长度最少6位', trigger: 'blur' }
        ],
        checkPassword: [{ validator: validatePass2, trigger: 'change' }]
      }
    }
  },
  methods: {
    submit() {
      this.$refs.form.validate(ispass => {
        if (ispass) {
          resetUserPwd(this.userId, this.form.password).then(response => {
            this.$modal.msgSuccess('密码修改成功')
            this.visible = false
          })
        }
      })
    },
    reset() {
      this.form = {
        password: undefined,
        checkPassword: undefined
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.username {
  line-height: 32px;
  text-align: left;
  vertical-align: middle;
  font-size: 14px;
  color: #606266;
  line-height: 40px;
  box-sizing: border-box;
  font-weight: 700;
  margin-bottom: 12px;
}
</style>
