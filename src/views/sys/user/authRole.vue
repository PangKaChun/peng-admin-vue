<template>
  <el-dialog :title="username ? `分配角色（${username}）` : '分配角色'" :visible.sync="visible" width="440px" append-to-body>
    <el-form v-loading="loading" label-width="60px">
      <el-form-item label="角色" style="margin-bottom: 0;">
        <el-select v-model="roleIds" multiple placeholder="选择角色">
          <el-option
            v-for="item in roles"
            :key="item.roleId"
            :label="item.roleName"
            :value="item.roleId"
          />
        </el-select>
      </el-form-item>
    </el-form>
    <div slot="footer">
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :disabled="loading" :loading="submitting" @click="submit">确定</el-button>
    </div>
  </el-dialog>
</template>

<script>
import { listAuthRole, updateAuthRole } from '@/api/sys/user'

export default {
  name: 'authRole',
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
    return {
      roles: [],
      visible: false,
      loading: false,
      submitting: false,
      roleIds: []
    }
  },
  watch: {
    visible(newVal) {
      if (newVal) {
        this.getList()
      }
    }
  },
  methods: {
    getList() {
      const reqSeq = (this._reqSeq = (this._reqSeq || 0) + 1)
      this.loading = true
      listAuthRole(this.userId)
        .then(response => {
          if (this._reqSeq !== reqSeq) return
          const data = response.data || []
          this.roles = response.roles || []
          this.roleIds = data.map(item => item.roleId)
        })
        .finally(() => {
          if (this._reqSeq === reqSeq) {
            this.loading = false
          }
        })
    },
    reset() {
      this._reqSeq = (this._reqSeq || 0) + 1
      this.loading = false
      this.roles = []
      this.roleIds = []
    },
    submit() {
      if (this.loading || this.submitting) return
      this.submitting = true
      updateAuthRole({
        userId: this.userId,
        roleIds: (this.roleIds || []).join(',')
      })
        .then(() => {
          this.$modal.msgSuccess('授权成功')
          this.visible = false
        })
        .finally(() => {
          this.submitting = false
        })
    }
  }
}
</script>
