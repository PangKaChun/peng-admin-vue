<template>
  <div class="page-split">
    <aside class="page-aside tree-aside">
      <div class="page-header">
        <span class="page-header__title">菜单</span>
        <el-button
          v-hasPermi="['sys:menu:add']"
          type="primary"
          icon="el-icon-plus"
          size="mini"
          @click="handleAdd()"
        >新增</el-button>
      </div>
      <div class="page-aside__search">
        <el-input v-model="menuName" size="mini" clearable placeholder="搜索菜单">
          <i slot="prefix" class="el-input__icon el-icon-search" />
        </el-input>
      </div>
      <div v-loading="loading" class="page-aside__body">
        <el-tree
          ref="menu"
          :data="menuList"
          :expand-on-click-node="false"
          :default-expanded-keys="menuList.map(item => item.menuId)"
          :props="defaultProps"
          :filter-node-method="filterNode"
          check-strictly
          highlight-current
          node-key="menuId"
          @node-click="handleUpdate"
        >
          <span slot-scope="{ node, data }" class="custom-tree-node">
            <span class="node-main">
              <i
                class="node-icon"
                :class="data.children && data.children.length ? (node.expanded ? 'el-icon-folder-opened' : 'el-icon-folder') : 'el-icon-document'"
              />
              <span class="node-label">{{ node.label }}</span>
            </span>
            <span class="tree-node-actions">
              <el-button
                v-hasPermi="['sys:menu:add']"
                type="text"
                size="mini"
                @click.stop="handleAdd(data)"
              >新增</el-button>
              <el-button
                v-hasPermi="['sys:menu:del']"
                type="text"
                size="mini"
                @click.stop="handleDelete(data)"
              >删除</el-button>
            </span>
          </span>
        </el-tree>
      </div>
    </aside>

    <div class="page-content">
      <div class="page-header">
        <span class="page-header__title">{{ form.menuId != null ? '编辑菜单' : '新增菜单' }}</span>
        <el-button
          v-if="form.menuId != null ? $auth.hasPermi('sys:menu:edit') : $auth.hasPermi('sys:menu:add')"
          type="primary"
          icon="el-icon-check"
          size="mini"
          :loading="submitting"
          @click="submitForm"
        >保存</el-button>
      </div>

      <div v-loading="formLoading" class="page-body page-body--scroll">
        <el-form
          ref="form"
          :model="form"
          :rules="rules"
          label-width="88px"
          class="detail-form"
          @submit.native.prevent="submitForm"
        >
          <div class="form-section">
            <h3 class="form-section__title">基本信息</h3>
            <el-row :gutter="16">
              <el-col :span="24">
                <el-form-item label="上级菜单" prop="parentId">
                  <treeselect v-model="form.parentId" :options="menus" :show-count="true" placeholder="选择上级菜单" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="菜单类型" prop="menuType">
                  <el-radio-group v-model="form.menuType" @change="handleTypeChange">
                    <el-radio-button v-for="dict in dict.type.menu_type" :key="dict.value" :label="dict.value">{{ dict.label }}</el-radio-button>
                  </el-radio-group>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="显示排序" prop="orderNum">
                  <el-input-number v-model="form.orderNum" controls-position="right" :min="0" style="width: 100%" />
                </el-form-item>
              </el-col>
              <el-col :span="form.menuType !== 'B' ? 12 : 24">
                <el-form-item label="菜单名称" prop="menuName">
                  <el-input v-model="form.menuName" placeholder="菜单名称" />
                </el-form-item>
              </el-col>
              <el-col v-if="form.menuType !== 'B'" :span="12">
                <el-form-item label="菜单图标" prop="menuIcon">
                  <el-popover
                    placement="bottom-start"
                    width="460"
                    trigger="click"
                    @show="$refs.iconSelect && $refs.iconSelect.reset()"
                  >
                    <IconSelect ref="iconSelect" @selected="name => (form.menuIcon = name)" />
                    <el-input
                      slot="reference"
                      :value="hasDisplayIcon ? form.menuIcon : ''"
                      placeholder="点击选择图标"
                      readonly
                      class="icon-input"
                    >
                      <span v-if="hasDisplayIcon" slot="prefix" class="el-input__icon icon-input__prefix">
                        <fluent-icon
                          v-if="form.menuIcon.startsWith('fluent:')"
                          :name="form.menuIcon.slice(7)"
                          class="icon-input__glyph"
                        />
                        <svg-icon
                          v-else
                          :icon-class="form.menuIcon"
                          class="icon-input__glyph"
                        />
                      </span>
                      <i v-else slot="prefix" class="el-icon-search el-input__icon" />
                      <i
                        v-if="hasDisplayIcon"
                        slot="suffix"
                        class="el-input__icon el-icon-circle-close icon-input__clear"
                        title="清除图标"
                        @click.stop="form.menuIcon = undefined"
                      />
                    </el-input>
                  </el-popover>
                </el-form-item>
              </el-col>
            </el-row>
          </div>

          <div class="form-section">
            <h3 class="form-section__title">{{ routeSectionTitle }}</h3>
            <el-row :gutter="16">
              <el-col v-if="form.menuType !== 'B'" :span="form.menuType === 'M' ? 12 : 24">
                <el-form-item label="路由地址" prop="routerPath">
                  <el-input v-model="form.routerPath" class="mono-input" placeholder="user" />
                </el-form-item>
              </el-col>
              <el-col v-if="form.menuType === 'M'" :span="12">
                <el-form-item label="组件地址" prop="componentPath">
                  <el-input v-model="form.componentPath" class="mono-input" placeholder="sys/user/index" />
                </el-form-item>
              </el-col>
              <el-col v-if="form.menuType !== 'D'" :span="24">
                <el-form-item label="权限字符" prop="permission">
                  <el-input v-model="form.permission" class="mono-input" placeholder="sys:user:list" />
                </el-form-item>
              </el-col>
            </el-row>
          </div>

          <div v-if="form.menuType !== 'B'" class="form-section">
            <h3 class="form-section__title">显示与状态</h3>
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="显示状态" prop="visible">
                  <el-radio-group v-model="form.visible">
                    <el-radio-button v-for="dict in dict.type.menu_status" :key="dict.value" :label="dict.value">{{ dict.label }}</el-radio-button>
                  </el-radio-group>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="状态" prop="status">
                  <el-radio-group v-model="form.status">
                    <el-radio-button v-for="dict in dict.type.menu_status" :key="dict.value" :label="dict.value">{{ dict.label }}</el-radio-button>
                  </el-radio-group>
                </el-form-item>
              </el-col>
            </el-row>
          </div>

          <div class="form-section">
            <h3 class="form-section__title">其他信息</h3>
            <el-row :gutter="16">
              <el-col :span="24">
                <el-form-item label="备注" prop="remark">
                  <el-input v-model="form.remark" type="textarea" :rows="3" placeholder="备注" />
                </el-form-item>
              </el-col>
            </el-row>
          </div>
        </el-form>
      </div>
    </div>
  </div>
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
      menus: [],
      menuList: [],
      menuName: undefined,
      formLoading: false,
      loading: false,
      submitting: false,
      defaultProps: {
        children: 'children',
        label: 'menuName'
      },
      form: {},
      rules: {
        menuName: [{ required: true, message: '菜单名称不能为空', trigger: 'blur' }],
        orderNum: [{ required: true, message: '菜单顺序不能为空', trigger: 'blur' }],
        routerPath: [{ required: true, message: '路由地址不能为空', trigger: 'blur' }],
        componentPath: [{ required: true, message: '组件地址不能为空', trigger: 'blur' }]
      }
    }
  },
  computed: {
    hasDisplayIcon() {
      return Boolean(this.form.menuIcon && this.form.menuIcon !== '#')
    },
    routeSectionTitle() {
      if (this.form.menuType === 'D') return '路由'
      if (this.form.menuType === 'B') return '权限'
      return '路由与权限'
    }
  },
  watch: {
    menuName(val) {
      this.$refs.menu.filter(val)
    }
  },
  created() {
    this.getList()
    this.handleAdd()
  },
  methods: {
    getList() {
      this.loading = true
      listMenu()
        .then(response => {
          this.menuList = this.handleTree(response, 'menuId')
        })
        .finally(() => {
          this.loading = false
        })
    },
    getMenusTree() {
      treeselect().then(response => {
        this.menus = [{ id: 0, label: '主类目', children: response }]
      })
    },
    filterNode(value, data) {
      if (!value) return true
      return data.menuName.indexOf(value) !== -1
    },
    reset() {
      this.form = {
        menuId: undefined,
        menuName: undefined,
        parentId: 0,
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
      this.$nextTick(() => {
        this.$refs.form && this.$refs.form.clearValidate()
      })
    },
    handleAdd(row) {
      this.reset()
      this.$refs.menu && this.$refs.menu.setCurrentKey(null)
      if (row && row.menuId) {
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
    },
    handleTypeChange() {
      this.$nextTick(() => {
        this.$refs.form && this.$refs.form.clearValidate()
      })
    },
    handleUpdate(row) {
      this.getMenusTree()
      this.formLoading = true
      getMenu(row.menuId)
        .then(response => {
          this.form = response
          this.$nextTick(() => {
            this.$refs.form && this.$refs.form.clearValidate()
          })
        })
        .finally(() => {
          this.formLoading = false
        })
    },
    handleDelete(row) {
      this.$modal
        .confirm(`是否确认删除菜单“${row.menuName}”？`)
        .then(() => delMenu(row.menuId))
        .then(() => {
          if (this.form.menuId === row.menuId) {
            this.handleAdd()
          } else {
            this.getMenusTree()
          }
          this.getList()
          this.$modal.msgSuccess('删除成功')
        })
        .catch(() => {})
    },
    submitForm() {
      if (this.submitting) return
      this.$refs.form.validate(valid => {
        if (!valid) return
        this.submitting = true
        const request = this.form.menuId != undefined
          ? updateMenu(this.form).then(() => this.$modal.msgSuccess('修改成功'))
          : addMenu(this.form).then(() => this.$modal.msgSuccess('新增成功'))
        request
          .then(() => {
            this.handleAdd()
            this.getList()
          })
          .finally(() => {
            this.submitting = false
          })
      })
    }
  }
}
</script>

<style lang="scss" scoped>
@import '../../../assets/styles/tokens.scss';

.tree-aside {
  width: 280px;
}

.detail-form {
  max-width: 640px;

  ::v-deep .el-row {
    display: flex;
    flex-wrap: wrap;

    &::before,
    &::after {
      display: none;
    }
  }
}

.form-section {
  & + & {
    margin-top: $space-3;
    padding-top: $space-4;
    border-top: 1px solid $separator-light;
  }

  &__title {
    margin: 0 0 $space-3;
    font-size: 12px;
    font-weight: 600;
    color: $label-secondary;
  }
}

.mono-input ::v-deep .el-input__inner {
  font-family: $font-mono;
  font-size: 12px;
}

.icon-input {
  ::v-deep .el-input__inner {
    cursor: pointer;
  }

  &__prefix {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: $label;
  }

  .icon-input__glyph {
    width: 15px;
    height: 15px;
    vertical-align: 0;
  }

  &__clear {
    cursor: pointer;
    color: $label-tertiary;
    transition: color $duration-fast ease;

    &:hover {
      color: $label-secondary;
    }
  }
}

.custom-tree-node {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $space-2;
  padding-right: $space-1;
  font-size: 13px;

  .node-main {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
  }

  .node-label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .node-icon {
    flex: none;
    font-size: 14px;
    color: $label-secondary;
  }

  .tree-node-actions {
    flex: none;
    display: inline-flex;
    align-items: center;
    gap: $space-2;
    opacity: 0;
    transition: opacity $duration-fast ease;

    .el-button + .el-button {
      margin-left: 0;
    }
  }
}

.el-tree ::v-deep .el-tree-node__content {
  &:hover .tree-node-actions,
  &:focus-within .tree-node-actions {
    opacity: 1;
  }
}
</style>
