<template>
  <div class="bpmn-designer">
    <div class="bpmn-toolbar">
      <el-button-group class="bpmn-toolbar-group">
        <el-button size="mini" icon="el-icon-document-add" @click="handleNew">新建</el-button>
        <el-button size="mini" icon="el-icon-refresh-left" :disabled="!canUndo" @click="undo">后退</el-button>
        <el-button size="mini" icon="el-icon-refresh-right" :disabled="!canRedo" @click="redo">前进</el-button>
      </el-button-group>
      <el-button-group class="bpmn-toolbar-group">
        <el-button size="mini" icon="el-icon-zoom-in" @click="zoom(0.1)">放大</el-button>
        <el-button size="mini" icon="el-icon-zoom-out" @click="zoom(-0.1)">缩小</el-button>
        <el-button size="mini" icon="el-icon-refresh" @click="fitViewport">适应</el-button>
        <el-button size="mini" icon="el-icon-aim" @click="centerView">居中</el-button>
      </el-button-group>
      <el-button-group>
        <el-button size="mini" icon="el-icon-view" @click="viewXml">查看XML</el-button>
        <el-button size="mini" icon="el-icon-picture-outline" @click="downloadSvg">下载SVG</el-button>
        <el-button size="mini" icon="el-icon-download" @click="downloadBpmn">下载BPMN</el-button>
      </el-button-group>
    </div>
    <div class="bpmn-body">
      <div ref="canvas" class="bpmn-canvas"></div>
      <!-- 属性面板：选中流程/节点后可设置 id(Key)、名称、条件表达式等 -->
      <div ref="panel" class="bpmn-properties"></div>
    </div>

    <!-- 办理人 / 候选办理人选择：属性面板内的「选择用户」按钮经 eventBus 触发本弹窗 -->
    <user-select
      :visible.sync="userSelectVisible"
      :multiple="userSelectMultiple"
      :selected="userSelectSelected"
      :title="userSelectTitle"
      @confirm="onUserSelectConfirm"
    />

    <!-- 候选组选择：用户任务「候选组」字段的选择按钮经 eventBus 触发本部门弹窗 -->
    <dept-select
      :visible.sync="deptSelectVisible"
      :multiple="deptSelectMultiple"
      :selected="deptSelectSelected"
      :title="deptSelectTitle"
      @confirm="onDeptSelectConfirm"
    />

    <!-- 表达式选择：办理人字段的「选择表达式」按钮经 eventBus 触发本弹窗，写回表达式内容 -->
    <expression-select
      :visible.sync="expressionSelectVisible"
      :selected="expressionSelectSelected"
      @confirm="onExpressionSelectConfirm"
    />

    <!-- 角色选择：候选组字段的「选择角色」按钮经 eventBus 触发本弹窗，写回 roleId -->
    <role-select
      :visible.sync="roleSelectVisible"
      :multiple="roleSelectMultiple"
      :selected="roleSelectSelected"
      :title="roleSelectTitle"
      @confirm="onRoleSelectConfirm"
    />

    <!-- 查看 XML：只读展示当前流程的 BPMN XML -->
    <el-dialog title="流程 XML" :visible.sync="xmlVisible" width="70%" append-to-body>
      <pre class="bpmn-xml"><code v-html="highlightedCode(xmlContent,'xml')"></code></pre>
      <div slot="footer" class="dialog-footer">
        <el-button icon="el-icon-document-copy" @click="copyXml">复制</el-button>
        <el-button type="primary" @click="xmlVisible = false">关闭</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import BpmnModeler from 'bpmn-js/lib/Modeler'
import { BpmnPropertiesPanelModule, BpmnPropertiesProviderModule } from 'bpmn-js-properties-panel'
import customTranslate from './customTranslate'
import flowableModdle from './flowable.json'
import flowablePropertiesProviderModule from './properties'
import UserSelect from '@/components/UserSelect'
import DeptSelect from '@/components/DeptSelect'
import ExpressionSelect from '@/components/ExpressionSelect'
import RoleSelect from '@/components/RoleSelect'
import { setApproverValue } from './properties/approver'
import { saveAs } from 'file-saver'

import hljs from 'highlight.js/lib/core'
import 'highlight.js/styles/github.css'
import xml from 'highlight.js/lib/languages/xml'
hljs.registerLanguage('xml', xml)

import 'bpmn-js/dist/assets/diagram-js.css'
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css'
import '@bpmn-io/properties-panel/dist/assets/properties-panel.css'

// 自定义中文翻译模块
const customTranslateModule = {
  translate: ['value', customTranslate]
}

export default {
  name: 'BpmnDesigner',
  components: { UserSelect, DeptSelect, ExpressionSelect, RoleSelect },
  props: {
    xml: { type: String, default: '' }
  },
  data() {
    return {
      modeler: null,
      // 选择用户弹窗状态
      userSelectVisible: false,
      userSelectMultiple: false,
      userSelectSelected: [],
      userSelectTitle: '选择用户',
      // 选择部门弹窗状态
      deptSelectVisible: false,
      deptSelectMultiple: true,
      deptSelectSelected: [],
      deptSelectTitle: '选择候选组',
      // 选择表达式弹窗状态
      expressionSelectVisible: false,
      expressionSelectSelected: null,
      // 选择角色弹窗状态
      roleSelectVisible: false,
      roleSelectMultiple: true,
      roleSelectSelected: [],
      roleSelectTitle: '选择角色',
      // 工具栏「后退 / 前进」按钮可用态
      canUndo: false,
      canRedo: false,
      // 查看 XML 弹窗
      xmlVisible: false,
      xmlContent: ''
    }
  },
  mounted() {
    this.modeler = new BpmnModeler({
      container: this.$refs.canvas,
      propertiesPanel: { parent: this.$refs.panel },
      additionalModules: [
        customTranslateModule,
        BpmnPropertiesPanelModule,
        BpmnPropertiesProviderModule,
        // Flowable 扩展属性 Provider：在通用属性之外补齐办理人 / 候选人 / 条件表达式等
        flowablePropertiesProviderModule
      ],
      // 注册 Flowable 命名空间，编辑既有 Flowable 流程时保留 flowable:assignee 等扩展属性，避免重存被丢弃
      moddleExtensions: { flowable: flowableModdle }
    })
    // 监听属性面板内「选择用户」按钮广播的事件，打开 UserSelect 弹窗
    this.modeler.get('eventBus').on('flowable.userSelect', e => {
      this.openUserSelect(e.payload || {})
    })
    // 监听属性面板内「候选组」选择按钮广播的事件，打开 DeptSelect 弹窗
    this.modeler.get('eventBus').on('flowable.deptSelect', e => {
      this.openDeptSelect(e.payload || {})
    })
    // 监听属性面板内「办理人」字段的「选择表达式」按钮事件，打开 ExpressionSelect 弹窗
    this.modeler.get('eventBus').on('flowable.expressionSelect', e => {
      this.openExpressionSelect(e.payload || {})
    })
    // 监听属性面板内「候选组」字段的「选择角色」按钮事件，打开 RoleSelect 弹窗
    this.modeler.get('eventBus').on('flowable.roleSelect', e => {
      this.openRoleSelect(e.payload || {})
    })
    // 命令栈变化时刷新「后退 / 前进」按钮可用态
    this.modeler.get('eventBus').on('commandStack.changed', () => {
      this.updateUndoRedo()
    })
    // 无外部 xml 时新建空白流程
    if (this.xml) {
      this.createDiagram(this.xml)
    } else{
      this.handleNew(this.genProcessId(), this.genProcessName())
    }
  },
  beforeDestroy() {
    if (this.modeler) {
      this.modeler.destroy()
      this.modeler = null
    }
  },
  methods: {
    /** 导入 XML 渲染到设计器 */
    async createDiagram(xml) {
      try {
        await this.modeler.importXML(xml)
        this.fitViewport()
        this.updateUndoRedo()
      } catch (e) {
        this.$modal && this.$modal.msgError('加载流程图失败：' + e.message)
      }
    },
    /** 适应画布 */
    fitViewport() {
      this.modeler.get('canvas').zoom('fit-viewport')
    },
    /** 视图居中 */
    centerView() {
      const canvas = this.modeler.get('canvas')
      const viewbox = canvas.viewbox()
      const inner = viewbox.inner
      canvas.viewbox({
        x: inner.x + inner.width / 2 - viewbox.width / 2,
        y: inner.y + inner.height / 2 - viewbox.height / 2,
        width: viewbox.width,
        height: viewbox.height
      })
    },
    /** 缩放 */
    zoom(step) {
      const canvas = this.modeler.get('canvas')
      canvas.zoom(canvas.zoom() + step)
    },
    /** 获取当前设计的 XML，供父组件保存 */
    async getXml() {
      const { xml } = await this.modeler.saveXML({ format: true })
      return xml
    },
    /** 查看当前 BPMN XML */
    async viewXml() {
      try {
        const { xml } = await this.modeler.saveXML({ format: true })
        this.xmlContent = xml
        this.xmlVisible = true
      } catch (e) {
        this.$modal && this.$modal.msgError('获取 XML 失败：' + e.message)
      }
    },
    /** 复制 XML 到剪贴板 */
    copyXml() {
      const text = this.xmlContent || ''
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text)
          .then(() => this.$modal && this.$modal.msgSuccess('已复制到剪贴板'))
          .catch(() => this.$modal && this.$modal.msgError('复制失败'))
      } else {
        // 降级：临时 textarea + execCommand
        const ta = document.createElement('textarea')
        ta.value = text
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
        this.$modal && this.$modal.msgSuccess('已复制到剪贴板')
      }
    },
    /** 下载当前流程图为 SVG */
    async downloadSvg() {
      try {
        const { svg } = await this.modeler.saveSVG()
        this.downloadFile(svg, this.diagramName() + '.svg', 'image/svg+xml')
      } catch (e) {
        this.$modal && this.$modal.msgError('下载 SVG 失败：' + e.message)
      }
    },
    /** 下载当前流程为 BPMN 文件 */
    async downloadBpmn() {
      try {
        const { xml } = await this.modeler.saveXML({ format: true })
        this.downloadFile(xml, this.diagramName() + '.bpmn', 'application/bpmn20-xml')
      } catch (e) {
        this.$modal && this.$modal.msgError('下载 BPMN 失败：' + e.message)
      }
    },
    /** 触发浏览器下载文本内容 */
    downloadFile(content, filename, mime) {
      const blob = new Blob([content], { type: mime + ';charset=utf-8' })
      saveAs(blob, filename)
    },
    /** 文件名基名：取流程编号(Key)，缺省 diagram */
    diagramName() {
      try {
        const root = this.modeler.get('canvas').getRootElement()
        const id = root && root.businessObject && root.businessObject.id
        return id || 'diagram'
      } catch (e) {
        return 'diagram'
      }
    },
    /** 生成随机流程编号 */
    genProcessId() {
      return 'Process_' + Math.random().toString(36).slice(2, 10)
    },
    /** 生成随机流程名称 */
    genProcessName() {
      return '流程_' + Math.floor(Math.random() * 9000 + 1000)
    },
    /** 新建空白流程 */
    async handleNew() {
      await this.modeler.createDiagram();
      const root = this.modeler.get('canvas').getRootElement()
      const elementRegistry = this.modeler.get('elementRegistry');
      this.modeler.get('modeling').updateProperties(root, {
        id: this.genProcessId(),
        name: this.genProcessName(),
        isExecutable: true
      })
      const startEventElement = elementRegistry.find(el => el.type === 'bpmn:StartEvent');
      if (startEventElement) {
        this.modeler.get('modeling').updateProperties(startEventElement, {
          name: '开始'
        });
      }
    },
    /** 后退 */
    undo() {
      this.modeler.get('commandStack').undo()
    },
    /** 前进 */
    redo() {
      this.modeler.get('commandStack').redo()
    },
    /** 同步「后退 / 前进」按钮的可用状态 */
    updateUndoRedo() {
      const commandStack = this.modeler.get('commandStack')
      this.canUndo = commandStack.canUndo()
      this.canRedo = commandStack.canRedo()
    },
    /** 选人 / 选角色 / 选部门 / 选表达式弹窗选定后，统一写回用户任务的审批人取值 approverValue（按类型重算 assignmentMode） */
    writeApproverValue(element, value) {
      if (!this.modeler) return
      setApproverValue(this.modeler.get('modeling'), this.modeler.get('bpmnFactory'), element, value || undefined)
    },
    /**
     * 打开选择用户弹窗（审批人类型=USER，写回 approverValue）
     * @param {Object} payload eventBus 传来的 { element, multiple, current }
     */
    openUserSelect(payload) {
      // bpmn 元素含循环引用，存到非响应式实例属性上，避免被 Vue 深度观测
      this._userSelectCtx = { element: payload.element }
      this.userSelectMultiple = !!payload.multiple
      this.userSelectTitle = '选择用户'
      this.userSelectSelected = this.parseUserIds(payload.current)
      this.userSelectVisible = true
    },
    /** 把已有的属性值解析为回显用的 userId 数组；表达式（含 ${}）不参与回显 */
    parseUserIds(current) {
      if (!current) return []
      const str = String(current)
      if (str.indexOf('${') !== -1) return []
      return str.split(',').map(s => s.trim()).filter(s => /^\d+$/.test(s))
    },
    /**
     * 选定用户后写回审批人取值 approverValue
     * 多选回传 (rows, ids)，单选回传 (row, id)；统一取第二个参数为 userId
     */
    onUserSelectConfirm(rowOrRows, idOrIds) {
      const ctx = this._userSelectCtx
      if (!ctx || !this.modeler) return
      const value = this.userSelectMultiple
        ? (idOrIds || []).join(',')
        : (idOrIds != null ? String(idOrIds) : '')
      this.writeApproverValue(ctx.element, value)
    },
    /**
     * 打开选择部门弹窗（审批人类型=DEPTS，写回 approverValue）
     * @param {Object} payload eventBus 传来的 { element, multiple, current }
     */
    openDeptSelect(payload) {
      // bpmn 元素含循环引用，存到非响应式实例属性上，避免被 Vue 深度观测
      this._deptSelectCtx = { element: payload.element }
      this.deptSelectMultiple = payload.multiple !== false
      this.deptSelectTitle = '选择部门'
      this.deptSelectSelected = this.parseDeptIds(payload.current)
      this.deptSelectVisible = true
    },
    /** 把已有的属性值解析为回显用的 deptId 数组；表达式（含 ${}）不参与回显 */
    parseDeptIds(current) {
      if (!current) return []
      const str = String(current)
      if (str.indexOf('${') !== -1) return []
      return str.split(',').map(s => s.trim()).filter(s => /^\d+$/.test(s))
    },
    /**
     * 选定部门后写回审批人取值 approverValue
     * 多选回传 (nodes, ids)，单选回传 (node, id)；统一取第二个参数为 deptId
     */
    onDeptSelectConfirm(nodeOrNodes, idOrIds) {
      const ctx = this._deptSelectCtx
      if (!ctx || !this.modeler) return
      const value = this.deptSelectMultiple
        ? (idOrIds || []).join(',')
        : (idOrIds != null ? String(idOrIds) : '')
      this.writeApproverValue(ctx.element, value)
    },
    /**
     * 打开选择表达式弹窗（审批人类型=EXPRESSION，写回 approverValue）
     * @param {Object} payload eventBus 传来的 { element, multiple, current }
     */
    openExpressionSelect(payload) {
      // bpmn 元素含循环引用，存到非响应式实例属性上，避免被 Vue 深度观测
      this._expressionSelectCtx = { element: payload.element }
      // 写回的是表达式内容而非 id，无法据此反查，故不做回显
      this.expressionSelectSelected = null
      this.expressionSelectVisible = true
    },
    /**
     * 选定表达式后写回审批人取值 approverValue：写入表达式内容，与手填表达式一致
     * confirm 回传 (row, id)，row 含 expressionContent
     */
    onExpressionSelectConfirm(row, id) {
      const ctx = this._expressionSelectCtx
      if (!ctx || !this.modeler) return
      const value = row && row.expressionContent ? String(row.expressionContent).trim() : ''
      this.writeApproverValue(ctx.element, value)
    },
    /**
     * 打开选择角色弹窗（审批人类型=ROLES，写回 approverValue）
     * @param {Object} payload eventBus 传来的 { element, multiple, current }
     */
    openRoleSelect(payload) {
      // bpmn 元素含循环引用，存到非响应式实例属性上，避免被 Vue 深度观测
      this._roleSelectCtx = { element: payload.element }
      this.roleSelectMultiple = payload.multiple !== false
      this.roleSelectTitle = '选择角色'
      this.roleSelectSelected = this.parseRoleIds(payload.current)
      this.roleSelectVisible = true
    },
    /** 把已有的候选组值解析为回显用的 roleId 数组；表达式（含 ${}）不参与回显 */
    parseRoleIds(current) {
      if (!current) return []
      const str = String(current)
      if (str.indexOf('${') !== -1) return []
      return str.split(',').map(s => s.trim()).filter(Boolean)
    },
    /**
     * 选定角色后写回审批人取值 approverValue
     * 多选回传 (rows, ids)，单选回传 (row, id)；统一取第二个参数为 roleId
     */
    onRoleSelectConfirm(rowOrRows, idOrIds) {
      const ctx = this._roleSelectCtx
      if (!ctx || !this.modeler) return
      const value = this.roleSelectMultiple
        ? (idOrIds || []).join(',')
        : (idOrIds != null ? String(idOrIds) : '')
      this.writeApproverValue(ctx.element, value)
    },
    /** 高亮显示 */
    highlightedCode(code, language) {
      const result = hljs.highlight(code, { language: language })
      return result.value || '&nbsp;'
    }
  }
}
</script>

<style scoped>
.bpmn-designer {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.bpmn-toolbar {
  padding: 6px 0;
}
.bpmn-toolbar-group {
  margin-right: 8px;
}
.bpmn-body {
  flex: 1;
  display: flex;
  min-height: 0;
  border: 1px solid #e4e7ed;
}
.bpmn-canvas {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 460px;
}
.bpmn-properties {
  flex: 0 0 320px;
  width: 320px;
  border-left: 1px solid #e4e7ed;
  overflow-y: auto;
  background: #fff;
}
/* 属性面板内部默认无边框，去掉自带阴影以贴合对话框 */
.bpmn-properties >>> .bio-properties-panel {
  border-left: none;
}
/* 查看 XML 弹窗内的代码块 */
.bpmn-xml {
  margin: 0;
  max-height: 60vh;
  overflow: auto;
  padding: 12px;
  background: #f5f5f7;
  border-radius: 4px;
  font-family: Consolas, Monaco, monospace;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>

<!-- 审批人 / 审批策略等字段由 preact 渲染在属性面板内，scoped 样式命中不到，故用非 scoped 块并限定在 .bpmn-properties 下 -->
<style lang="scss">
.bpmn-properties {
  // 文本框 + ··· 选人按钮同一行：输入框自适应、按钮贴右
  .flowable-user-input-row {
    display: flex;
    align-items: stretch;
    gap: 4px;

    .bio-properties-panel-input {
      flex: 1 1 auto;
      min-width: 0;
    }
  }

  .flowable-user-dots {
    flex: 0 0 auto;
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    padding: 0;
    font-size: 14px;
    color: #1d1d1f;
    background: #f5f5f7;
    border: 1px solid #d2d2d7;
    border-radius: 4px;
    cursor: pointer;

    &:hover {
      background: #ebebf0;
    }

    // SvgIcon 自带的 .svg-icon 尺寸样式是 scoped，preact 面板内手绘的 svg 命中不到，故在此显式补齐
    .svg-icon {
      width: 14px;
      height: 14px;
      fill: currentColor;
      overflow: hidden;
    }
  }

  // 审批人类型 / 审批策略单选组
  .flowable-radio-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-top: 4px;
  }

  .flowable-radio {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: #1d1d1f;
    cursor: pointer;

    input {
      flex: 0 0 auto;
      margin: 0;
    }
  }
}
</style>
