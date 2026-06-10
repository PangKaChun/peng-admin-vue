<template>
  <el-container>
    <el-aside width="300px">
      <el-card class="box-card" shadow="never">
        <div slot="header" class="clearfix">
          <span class="menu-span el-icon-menu">菜单管理</span>
          <div style="float: right;">
            <el-button
              v-hasPermi="['sys:menu:add']"
              icon="el-icon-plus"
              size="mini"
              style="padding: 6px 9px"
              type="primary"
              @click="handleAdd"
            >新增</el-button>
          </div>
        </div>
        <el-input v-model="menuName" class="menu-filter-input" size="mini" placeholder="输入菜单名称搜索">
          <i slot="prefix" class="el-input__icon el-icon-search"></i>
        </el-input>
        <el-tree
          ref="menu"
          :data="menuList"
          :expand-on-click-node="false"
          :default-expanded-keys="menuList.map(item=>item.menuId)"
          :props="defaultProps"
          :filter-node-method="filterNode"
          check-strictly
          node-key="menuId"
          @node-click="handleUpdate"
        >
          <span class="custom-tree-node" slot-scope="{ node, data }">
            <span>
              <i :class="data.children && data.children.length ? node.expanded? 'el-icon-folder-opened' : 'el-icon-folder' : 'el-icon-document'" class="node-icon" />
              {{ node.label }}
            </span>
            <span>
              <el-button type="text" size="mini" @click.stop="handleAdd(data)">新增</el-button>
              <el-button type="text" size="mini" @click.stop="handleDelete(data)">删除</el-button>
            </span>
          </span>
        </el-tree>
      </el-card>
    </el-aside>
    <el-main>
      <el-card class="box-card" shadow="never">
        <div slot="header" class="clearfix">
          <span class="menu-span">{{title}}</span>
          <el-button
            v-hasPermi="['sys:menu:add']"
            icon="el-icon-check"
            size="mini"
            style="float: right; padding: 6px 9px"
            type="success"
            @click="submitForm"
          >保存</el-button>
        </div>
        <el-form ref="form" :model="form" :rules="rules" label-width="100px" v-loading="formLoading" style="width:80%;margin:20px auto;">
          <el-row>
            <el-col :span="24">
              <el-form-item label="上级菜单" prop="parentId">
                <treeselect v-model="form.parentId" :options="menus" :show-count="true" placeholder="选择上级菜单" />
              </el-form-item>
            </el-col>
            <el-col :span="24" v-if="form.menuType !== 'B'">
              <el-form-item label="菜单图标" prop="menuIcon">
                <el-popover placement="bottom-start" width="460" trigger="click" @show="$refs['iconSelect'].reset()">
                  <IconSelect ref="iconSelect" @selected="(name)=>form.menuIcon = name" />
                  <el-input slot="reference" v-model="form.menuIcon" placeholder="点击选择图标" readonly>
                    <svg-icon
                      v-if="form.menuIcon"
                      slot="prefix"
                      :icon-class="form.menuIcon"
                      class="el-input__icon"
                      style="height: 32px;width: 16px;"
                    />
                    <i v-else slot="prefix" class="el-icon-search el-input__icon" />
                  </el-input>
                </el-popover>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="菜单类型" prop="menuType">
                <el-radio-group v-model="form.menuType">
                  <el-radio-button v-for="dict in dict.type.menu_type" :key="dict.value" :label="dict.value">{{dict.label}}</el-radio-button>
                </el-radio-group>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="菜单名称" prop="menuName">
                <el-input v-model="form.menuName" placeholder="请输入菜单名称" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row>
            <el-col :span="12" v-if="form.menuType !== 'B'">
              <el-form-item label="路由地址" prop="routerPath">
                <el-input v-model="form.routerPath" placeholder="请输入路由地址" />
              </el-form-item>
            </el-col>
            <el-col :span="12" v-if="form.menuType === 'M'">
              <el-form-item label="组件地址" prop="componentPath">
                <el-input v-model="form.componentPath" placeholder="请输入组件地址" />
              </el-form-item>
            </el-col>
            <el-col :span="12" v-if="form.menuType !== 'D'">
              <el-form-item label="权限字符" prop="permission">
                <el-input v-model="form.permission" placeholder="请输入权限字符" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="显示排序" prop="orderNum">
                <el-input-number v-model="form.orderNum" controls-position="right" :min="0" />
              </el-form-item>
            </el-col>
            <el-col :span="12" v-if="form.menuType !== 'B'">
              <el-form-item label="显示状态" prop="visible">
                <el-radio-group v-model="form.visible">
                  <el-radio-button v-for="dict in dict.type.menu_status" :key="dict.value" :label="dict.value">{{dict.label}}</el-radio-button>
                </el-radio-group>
              </el-form-item>
            </el-col>
            <el-col :span="12" v-if="form.menuType !== 'B'">
              <el-form-item label="状态" prop="status">
                <el-radio-group v-model="form.status">
                  <el-radio-button v-for="dict in dict.type.menu_status" :key="dict.value" :label="dict.value">{{dict.label}}</el-radio-button>
                </el-radio-group>
              </el-form-item>
            </el-col>
            <el-col :span="24">
              <el-form-item label="备注" prop="remark">
                <el-input v-model="form.remark" type="textarea" placeholder="请输入内容"></el-input>
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
      </el-card>
    </el-main>
  </el-container>
</template>

<script>
import Treeselect from '@riophae/vue-treeselect'
import '@riophae/vue-treeselect/dist/vue-treeselect.css'
import IconSelect from '@/components/IconSelect'

import { listMenu, getMenu, addMenu, updateMenu, delMenu, treeselect } from '@/api/sys/menu'
export default {
  name: 'Menu',
  dicts: ['menu_status', 'menu_type'],
  components: { Treeselect, IconSelect },
  data() {
    return {
      // 选中数组
      ids: [],
      // 菜单树选项
      menus: [],
      // 菜单数据
      menuList: [],
      // 菜单名称
      menuName: undefined,
      // 遮罩层
      formLoading: false,
      // 遮罩层
      loading: false,
      defaultProps: {
        children: 'children',
        label: 'menuName'
      },
      // 表单参数
      form: {},
      title: null,
      // 表单校验
      rules: {
        menuName: [{ required: true, message: '菜单名称不能为空', trigger: 'blur' }],
        orderNum: [{ required: true, message: '菜单顺序不能为空', trigger: 'blur' }],
        routerPath: [{ required: true, message: '路由地址不能为空', trigger: 'blur' }],
        componentPath: [{ required: true, message: '组件地址不能为空', trigger: 'blur' }]
      }
    }
  },
  watch: {
    // 根据名称筛选菜单树
    menuName(val) {
      this.$refs.menu.filter(val)
    }
  },
  created() {
    this.getList()
    this.handleAdd()
  },
  methods: {
    /** 查询角色列表 */
    getList() {
      this.loading = true
      listMenu().then(response => {
        this.menuList = this.handleTree(response, 'menuId')
        this.loading = false
      })
    },
    /** 查询菜单下拉树结构 */
    getMenusTree() {
      treeselect().then(response => {
        this.menus = []
        const menu = { id: 0, label: '主类目', children: [] }
        menu.children = response
        this.menus.push(menu)
      })
    },
    // 筛选节点
    filterNode(value, data) {
      if (!value) return true
      return data.menuName.indexOf(value) !== -1
    },
    // 表单重置
    reset() {
      this.form = {
        menuId: undefined,
        menuName: undefined,
        parentId: '0',
        menuType: 'D',
        menuIcon: undefined,
        orderNum: 1,
        visible: '0',
        status: '0',
        permission: undefined,
        routerPath: undefined,
        componentPath: undefined,
        remark: undefined
      }
      this.resetForm('form')
    },
    /** 新增按钮操作 */
    handleAdd(row) {
      this.reset()
      if (row != null && row.menuId) {
        this.form.parentId = row.menuId
        if (row.menuType === 'D') {
          this.form.menuType = 'M'
        } else if (row.menuType === 'M') {
          this.form.menuType = 'B'
        }
        if (row.children) {
          this.form.orderNum = row.children.length + 1
        }
      } else {
        this.form.parentId = 0
        this.form.orderNum = this.menuList.length + 1
      }
      this.getMenusTree()
      this.title = '添加菜单'
    },
    /** 修改按钮操作 */
    handleUpdate(row) {
      // this.reset()
      this.getMenusTree()
      const menuId = row.menuId
      this.formLoading = true
      getMenu(menuId)
        .then(response => {
          this.form = response
          this.title = `修改菜单—${response.menuName}`
        })
        .finally(() => {
          this.formLoading = false
        })
    },
    /** 删除按钮操作 */
    handleDelete(row) {
      const menuIds = row.menuId || this.ids
      this.$modal
        .confirm('是否确认删除菜单编号为"' + menuIds + '"的数据项？')
        .then(function () {
          return delMenu(menuIds)
        })
        .then(() => {
          this.getList()
          this.$modal.msgSuccess('删除成功')
        })
        .catch(() => {})
    },
    /** 提交按钮 */
    submitForm: function () {
      this.$refs['form'].validate(valid => {
        if (valid) {
          if (this.form.menuId != undefined) {
            updateMenu(this.form).then(response => {
              this.reset()
              this.$modal.msgSuccess('修改成功')
              this.getList()
            })
          } else {
            addMenu(this.form).then(response => {
              this.$modal.msgSuccess('新增成功')
              this.getList()
            })
          }
        }
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.el-container {
  height: 100%;
}
.el-main {
  padding: 0;
}
.query-form {
  padding-top: 20px;
  background-color: #f2f2f2;
  padding-left: 20px;
}
.box-card {
  height: 100%;
  border-radius: 0;

  .menu-filter-input {
    width: 90%;
    display: block;
    padding: 6px 0;
    margin: 0 auto;
  }

  ::v-deep .el-card__body {
    height: calc(100% - 47px);
    overflow-y: auto;
    padding: 0;
  }

  ::v-deep .el-tree-node.is-current > .el-tree-node__content {
    background: #1976d21f;
    color: #094194;
    font-weight: 600;

    .node-icon {
      color: #094194 !important;
    }
  }
}
.menu-span {
  font-weight: bold;
  color: #303133;
  font-size: 15px;
  line-height: 26px;
}
.custom-tree-node {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 14px;
  padding-right: 8px;

  .node-icon {
    font-size: 14px;
    color: #f5a623;
    flex-shrink: 0;
  }
}
.el-input-number {
  width: 100%;
}
::v-deep .el-icon-document.node-icon {
  color: #909399 !important;
}
</style>