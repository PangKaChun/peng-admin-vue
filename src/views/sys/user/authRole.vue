<template>
  <el-dialog title="分配角色" :visible.sync="visible">
    <div class="username">当前"{{username}}"的角色</div>
    <el-form v-loading="loading" label-position="left" :model="form" label-width="80px">
      <el-row>
        <el-col :span="24">
          <el-form-item label-width="0px">
            <el-tag v-for="item in data" :key="item.roleId">{{ item.roleName }}</el-tag>
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item label="分配角色">
            <el-select v-model.trim="roleIds" multiple placeholder="请选择">
              <el-option v-for="item in roles" :key="item.roleId" :label="item.roleName" :value="item.roleId">
                <span>{{ item.roleName }}</span>
              </el-option>
            </el-select>
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
      default: void 0
    }
  },
  data() {
    return {
      data: [],
      form: {},
      roles: [],
      visible: false,
      loading: false,
      roleIds: undefined
    }
  },
  methods: {
    getList() {
      this.loading = true
      listAuthRole(this.userId)
        .then(response => {
          this.data = response.data
          this.roles = response.roles
          this.roleIds = this.data.map(item => {
            return item.roleId
          })
        })
        .finally(() => {
          this.loading = false
        })
    },
    reset() {
      this.data = []
      this.roles = []
      this.roleIds = []
    },
    submit() {
      const userId = this.userId
      const roleIds = this.roleIds.join(",")
      updateAuthRole({ userId: userId, roleIds: roleIds }).then(response => {
        this.$modal.msgSuccess('授权成功')
        this.visible = false
      })
    }
  },
  watch: {
    visible(newVal, oldVal) {
      if (newVal) {
        this.getList()
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
}
.el-tag + .el-tag {
  margin-left: 10px;
}
</style>
