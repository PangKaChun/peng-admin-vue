/**
 * Flowable 流程属性 Provider
 *
 * 官方 bpmn-js-properties-panel 仅内置「通用 BPMN」属性（编号 / 名称 / 文档），不含任何
 * 引擎扩展属性。本 Provider 基于已注册的 flowable.json moddle 扩展，为用户任务、服务任务、
 * 开始事件、流程、顺序流、活动（异步）及多实例补齐 Flowable 执行语义字段，使右侧属性面板可
 * 直接编辑办理人、候选人 / 组、表单、条件表达式、async/exclusive、多实例集合等——此前这些
 * 属性虽能在保存时保留，却无处可填。监听器 / 表单属性 / 字段注入 / in-out 等元素型扩展已在
 * flowable.json 声明（导入→保存往返保留），但暂未在面板提供可视化增删改。
 *
 * 实现复用面板自带的 preact（@bpmn-io/properties-panel/preact），其 jsx-runtime 与面板内
 * 渲染所用 preact 严格同版本，这正是 bpmn-js-properties-panel 自身扩展 Provider 的标准做法，
 * 避免 Vue 工程的 babel JSX 与 preact 混淆。
 */
import { TextFieldEntry, isTextFieldEntryEdited, CheckboxEntry, isCheckboxEntryEdited } from '@bpmn-io/properties-panel'
import { useService } from 'bpmn-js-properties-panel'
import { jsx } from '@bpmn-io/properties-panel/preact/jsx-runtime'
import { useState, useEffect, useMemo, useRef } from '@bpmn-io/properties-panel/preact/hooks'
import { is, getBusinessObject } from 'bpmn-js/lib/util/ModelUtil'
import { readField, setField, setApprover, setApproverValue, VALUE_APPROVER_TYPES } from './approver'

// 低于默认 Provider 的 DEFAULT_PRIORITY(1000)，保证 Flowable 分组追加在「常规 / 文档」之后
const LOW_PRIORITY = 500

/** 元素是否匹配给定类型中的任意一个 */
function isAny(element, types) {
  return types.some(function (type) {
    return is(element, type)
  })
}

/**
 * 生成「读写某个 Flowable 属性」的文本输入组件
 *
 * @param {string} property moddle 属性名（含命名空间，如 flowable:assignee）
 * @param {string} label 字段标签
 * @param {string} description 字段说明
 * @returns {Function} preact 入口组件
 */
function flowableTextField(property, label, description) {
  return function FlowableTextField(props) {
    const element = props.element
    const id = props.id
    const modeling = useService('modeling')
    const debounce = useService('debounceInput')

    const getValue = function () {
      return getBusinessObject(element).get(property) || ''
    }
    // 清空时写 undefined，moddle 会移除该属性而非留下空串
    const setValue = function (value) {
      modeling.updateProperties(element, { [property]: value || undefined })
    }

    return jsx(TextFieldEntry, {
      element: element,
      id: id,
      label: label,
      description: description,
      getValue: getValue,
      setValue: setValue,
      debounce: debounce
    })
  }
}

/**
 * 生成「布尔属性」的复选框组件（如 flowable:async / flowable:exclusive）
 *
 * @param {string} property moddle 属性名
 * @param {string} label 字段标签
 * @param {string} description 字段说明
 * @returns {Function} preact 入口组件
 */
function flowableCheckbox(property, label, description) {
  return function FlowableCheckbox(props) {
    const element = props.element
    const id = props.id
    const modeling = useService('modeling')

    const getValue = function () {
      return !!getBusinessObject(element).get(property)
    }
    const setValue = function (value) {
      modeling.updateProperties(element, { [property]: value })
    }

    return jsx(CheckboxEntry, {
      element: element,
      id: id,
      label: label,
      description: description,
      getValue: getValue,
      setValue: setValue
    })
  }
}

// ===== 用户任务「审批人」配置：approverType / approverValue / assignmentMode + 审批策略 approvalStrategy =====
// 数据落到 extensionElements 下的 flowable:field 与 flowable:property，读写见 ./approver

// 审批人类型单选项（落到 flowable:field name="approverType"）
const APPROVER_TYPES = [
  { value: 'USER', label: '指定用户' },
  { value: 'ROLES', label: '候选角色' },
  { value: 'DEPTS', label: '候选部门' },
  { value: 'INITIATOR', label: '发起人' },
  { value: 'INITIATOR_MANAGER', label: '发起人直属领导' },
  { value: 'INITIATOR_DEPT_LEADER', label: '发起人部门负责人' },
  { value: 'EXPRESSION', label: '自定义表达式' }
]

// 取值型审批人各自对应的选择弹窗（经 eventBus 触发外层 Vue 弹窗，写回 approverValue）
const VALUE_PICKERS = {
  USER: { event: 'flowable.userSelect', multiple: true, icon: 'user', title: '选择用户', description: '点击右侧选择用户，多个以英文逗号分隔' },
  ROLES: { event: 'flowable.roleSelect', multiple: true, icon: 'peoples', title: '选择角色', description: '点击右侧选择角色，多个以英文逗号分隔' },
  DEPTS: { event: 'flowable.deptSelect', multiple: true, icon: 'tree', title: '选择部门', description: '点击右侧选择部门，多个以英文逗号分隔' },
  EXPRESSION: { event: 'flowable.expressionSelect', multiple: false, icon: 'code', title: '选择表达式', description: '输入或选择表达式，如 ${approver}' }
}

// 审批策略单选项（落到 flowable:property name="approvalStrategy"）
const APPROVAL_STRATEGIES = [
  { value: 'ANYONE', label: '任意一人审批' },
  { value: 'ALL', label: '所有人审批' }
]

// 通用单选组渲染（preact）：label + 一列 radio
function renderRadioGroup(entryId, label, name, options, current, onSelect) {
  return jsx('div', {
    class: 'bio-properties-panel-entry flowable-radio-entry',
    'data-entry-id': entryId,
    children: [
      jsx('label', { class: 'bio-properties-panel-label', children: label }),
      jsx('div', {
        class: 'flowable-radio-group',
        children: options.map(function (opt) {
          return jsx('label', {
            class: 'flowable-radio',
            children: [
              jsx('input', {
                type: 'radio',
                name: name,
                checked: current === opt.value,
                onChange: function () { onSelect(opt.value) }
              }),
              jsx('span', { children: opt.label })
            ]
          })
        })
      })
    ]
  })
}

/**
 * 审批人类型单选（approverType）
 * 切换类型时清空 approverValue，并按类型重算 assignmentMode（见 approver.setApprover）。
 */
function ApproverType(props) {
  const element = props.element
  const modeling = useService('modeling')
  const bpmnFactory = useService('bpmnFactory')
  const current = readField(getBusinessObject(element), 'approverType')
  const onSelect = function (type) {
    setApprover(modeling, bpmnFactory, element, type, '')
  }
  return renderRadioGroup(props.id, '审批人类型', 'flowable-approver-type', APPROVER_TYPES, current, onSelect)
}

/**
 * 审批人取值（approverValue）：仅取值型审批人（USER/ROLES/DEPTS/EXPRESSION）渲染。
 * 文本框可手输，右侧按钮经 eventBus 打开对应选择弹窗；写回经 approver.setApproverValue。
 * 输入用本地 state 受控，避免 debounce 提交期间被模型回填导致光标跳动。
 */
function ApproverValue(props) {
  const element = props.element
  const id = props.id
  const modeling = useService('modeling')
  const bpmnFactory = useService('bpmnFactory')
  const eventBus = useService('eventBus')
  const debounce = useService('debounceInput')

  const bo = getBusinessObject(element)
  const type = readField(bo, 'approverType')
  const value = readField(bo, 'approverValue')

  const elementRef = useRef(element)
  const [localValue, setLocalValue] = useState(value)
  const displayValue = elementRef.current === element ? localValue : value

  // 切换选中节点：更新引用并以新节点的值重置输入框
  useEffect(function () {
    elementRef.current = element
    setLocalValue(value)
  }, [element])
  // 同一节点下，外部（如选人弹窗 / 切换审批人类型）写回时同步到输入框
  useEffect(function () {
    if (value !== localValue) {
      setLocalValue(value)
    }
  }, [value])

  const commitNow = function (val) {
    setApproverValue(modeling, bpmnFactory, element, val ? val.trim() : undefined)
  }
  const debouncedCommit = useMemo(function () {
    return debounce(commitNow)
  }, [element])

  const onInput = function (e) {
    setLocalValue(e.target.value)
    debouncedCommit(e.target.value)
  }
  const onBlur = function (e) {
    const trimmed = e.target.value.trim()
    if (debouncedCommit.cancel) {
      debouncedCommit.cancel()
    }
    setLocalValue(trimmed)
    commitNow(trimmed)
  }

  const picker = VALUE_PICKERS[type]
  // 非取值型（发起人系）或未选类型：不渲染取值编辑器（hooks 已在前面无条件调用）
  if (!picker) {
    return null
  }

  const openPicker = function () {
    eventBus.fire(picker.event, {
      payload: { element: element, target: 'approverValue', multiple: picker.multiple, current: value }
    })
  }
  const inputId = 'bio-properties-panel-' + id

  return jsx('div', {
    class: 'bio-properties-panel-entry',
    'data-entry-id': id,
    children: [
      jsx('div', {
        class: 'bio-properties-panel-textfield',
        children: [
          jsx('label', { for: inputId, class: 'bio-properties-panel-label', children: '审批人' }),
          jsx('div', {
            class: 'flowable-user-input-row',
            children: [
              jsx('input', {
                id: inputId,
                type: 'text',
                name: id,
                spellCheck: 'false',
                autoComplete: 'off',
                class: 'bio-properties-panel-input',
                value: displayValue,
                onInput: onInput,
                onBlur: onBlur
              }),
              jsx('button', {
                type: 'button',
                class: 'flowable-user-dots',
                title: picker.title,
                onClick: openPicker,
                // 复用 @/components/SvgIcon 的雪碧图（main.js 已全局注入 #icon-* 符号）
                children: jsx('svg', {
                  class: 'svg-icon',
                  'aria-hidden': 'true',
                  children: jsx('use', { 'xlink:href': '#icon-' + picker.icon })
                })
              })
            ]
          })
        ]
      }),
      jsx('div', { class: 'bio-properties-panel-description', children: picker.description })
    ]
  })
}

/**
 * 审批策略单选（approvalStrategy）：仅多审批人（取值型）场景渲染；单人来源无需策略。
 */
function ApprovalStrategy(props) {
  const element = props.element
  const modeling = useService('modeling')
  const bpmnFactory = useService('bpmnFactory')
  const bo = getBusinessObject(element)
  const type = readField(bo, 'approverType')
  const current = readField(bo, 'approvalStrategy')
  const onSelect = function (val) {
    setField(modeling, bpmnFactory, element, 'approvalStrategy', val)
  }
  // 仅取值型审批人需要审批策略
  if (VALUE_APPROVER_TYPES.indexOf(type) === -1) {
    return null
  }
  return renderRadioGroup(props.id, '审批策略', 'flowable-approval-strategy', APPROVAL_STRATEGIES, current, onSelect)
}

/**
 * 生成「多实例特性属性」的文本组件
 *
 * collection / elementVariable 挂在元素的 loopCharacteristics 子对象上，故经
 * updateModdleProperties 更新该子对象本身，而非元素。分组仅在元素含多实例特性时呈现，
 * 因此渲染时 loopCharacteristics 必非空。
 *
 * @param {string} property moddle 属性名
 * @param {string} label 字段标签
 * @param {string} description 字段说明
 * @returns {Function} preact 入口组件
 */
function multiInstanceTextField(property, label, description) {
  return function MultiInstanceTextField(props) {
    const element = props.element
    const id = props.id
    const modeling = useService('modeling')
    const debounce = useService('debounceInput')
    const loopCharacteristics = getBusinessObject(element).loopCharacteristics

    const getValue = function () {
      return loopCharacteristics ? (loopCharacteristics.get(property) || '') : ''
    }
    const setValue = function (value) {
      modeling.updateModdleProperties(element, loopCharacteristics, { [property]: value || undefined })
    }

    return jsx(TextFieldEntry, {
      element: element,
      id: id,
      label: label,
      description: description,
      getValue: getValue,
      setValue: setValue,
      debounce: debounce
    })
  }
}

/**
 * 顺序流条件表达式
 *
 * conditionExpression 是 BPMN 标准子元素（`<conditionExpression xsi:type="tFormalExpression">`），
 * 而非属性，故需经 bpmnFactory 构造 FormalExpression；清空时置 undefined 以移除该子元素。
 */
function ConditionExpression(props) {
  const element = props.element
  const id = props.id
  const modeling = useService('modeling')
  const bpmnFactory = useService('bpmnFactory')
  const debounce = useService('debounceInput')

  const getValue = function () {
    const conditionExpression = getBusinessObject(element).conditionExpression
    return conditionExpression ? conditionExpression.body : ''
  }
  const setValue = function (value) {
    let conditionExpression
    if (value && value.trim()) {
      conditionExpression = bpmnFactory.create('bpmn:FormalExpression', { body: value })
      // 绑定父级，确保序列化时命名空间正确
      conditionExpression.$parent = getBusinessObject(element)
    }
    modeling.updateProperties(element, { conditionExpression: conditionExpression })
  }

  return jsx(TextFieldEntry, {
    element: element,
    id: id,
    label: '条件表达式',
    description: '结果为 true 才走此线，如 ${amount > 1000}',
    getValue: getValue,
    setValue: setValue,
    debounce: debounce
  })
}

// 各字段对应的入口组件：模块加载时一次性创建，保持引用稳定，避免每次渲染重建导致重挂载
const UserTaskFormKey = flowableTextField('flowable:formKey', '表单标识 (formKey)', '绑定外部表单的 key')
const DueDate = flowableTextField('flowable:dueDate', '到期时间 (dueDate)', 'ISO8601 时间或表达式')

const ServiceClass = flowableTextField('flowable:class', 'Java 类 (class)', '实现 JavaDelegate 的全限定类名')
const ServiceExpression = flowableTextField('flowable:expression', '表达式 (expression)', '如 ${bean.method(execution)}')
const ServiceDelegate = flowableTextField('flowable:delegateExpression', '委托表达式 (delegateExpression)', '解析为 JavaDelegate 的表达式 ${bean}')

const Initiator = flowableTextField('flowable:initiator', '发起人变量 (initiator)', '将发起人写入该流程变量，如 initiator')
const StartFormKey = flowableTextField('flowable:formKey', '表单标识 (formKey)', '绑定发起表单的 key')

const StarterUsers = flowableTextField('flowable:candidateStarterUsers', '可发起用户 (candidateStarterUsers)', '多个以英文逗号分隔')
const StarterGroups = flowableTextField('flowable:candidateStarterGroups', '可发起用户组 (candidateStarterGroups)', '多个以英文逗号分隔')

const ServiceResultVariable = flowableTextField('flowable:resultVariable', '结果变量 (resultVariable)', '将返回值写入该流程变量')
const ServiceType = flowableTextField('flowable:type', '任务类型 (type)', '内置类型，如 mail / http / dmn')

const AsyncFlag = flowableCheckbox('flowable:async', '异步执行 (async)', '勾选后由 Job 执行器异步执行此节点')
const ExclusiveFlag = flowableCheckbox('flowable:exclusive', '互斥 (exclusive)', '同一实例的异步作业串行执行，默认开启')

const MiCollection = multiInstanceTextField('flowable:collection', '集合 (collection)', '多实例遍历的集合变量或表达式')
const MiElementVariable = multiInstanceTextField('flowable:elementVariable', '元素变量 (elementVariable)', '每个实例接收的当前元素变量名')

/** 用户任务分组：审批人设置（类型 + 取值）、审批策略、表单与到期 */
function createUserTaskGroup() {
  return {
    id: 'flowable-userTask',
    label: 'Flowable 用户任务',
    entries: [
      { id: 'flowable-approverType', component: ApproverType, isEdited: function () { return false } },
      { id: 'flowable-approverValue', component: ApproverValue, isEdited: isTextFieldEntryEdited },
      { id: 'flowable-approvalStrategy', component: ApprovalStrategy, isEdited: function () { return false } },
      { id: 'flowable-formKey', component: UserTaskFormKey, isEdited: isTextFieldEntryEdited },
      { id: 'flowable-dueDate', component: DueDate, isEdited: isTextFieldEntryEdited }
    ]
  }
}

/** 服务任务分组 */
function createServiceTaskGroup() {
  return {
    id: 'flowable-serviceTask',
    label: 'Flowable 服务任务',
    entries: [
      { id: 'flowable-class', component: ServiceClass, isEdited: isTextFieldEntryEdited },
      { id: 'flowable-expression', component: ServiceExpression, isEdited: isTextFieldEntryEdited },
      { id: 'flowable-delegateExpression', component: ServiceDelegate, isEdited: isTextFieldEntryEdited },
      { id: 'flowable-resultVariable', component: ServiceResultVariable, isEdited: isTextFieldEntryEdited },
      { id: 'flowable-type', component: ServiceType, isEdited: isTextFieldEntryEdited }
    ]
  }
}

/** 开始事件分组 */
function createStartEventGroup() {
  return {
    id: 'flowable-startEvent',
    label: 'Flowable 开始事件',
    entries: [
      { id: 'flowable-initiator', component: Initiator, isEdited: isTextFieldEntryEdited },
      { id: 'flowable-startFormKey', component: StartFormKey, isEdited: isTextFieldEntryEdited }
    ]
  }
}

/** 流程（根元素）分组 */
function createProcessGroup() {
  return {
    id: 'flowable-process',
    label: 'Flowable 流程',
    entries: [
      { id: 'flowable-candidateStarterUsers', component: StarterUsers, isEdited: isTextFieldEntryEdited },
      { id: 'flowable-candidateStarterGroups', component: StarterGroups, isEdited: isTextFieldEntryEdited }
    ]
  }
}

/** 异步特性分组（适用于活动：任务 / 子流程 / 调用活动等） */
function createAsyncGroup() {
  return {
    id: 'flowable-async',
    label: 'Flowable 异步',
    entries: [
      { id: 'flowable-async', component: AsyncFlag, isEdited: isCheckboxEntryEdited },
      { id: 'flowable-exclusive', component: ExclusiveFlag, isEdited: isCheckboxEntryEdited }
    ]
  }
}

/** 多实例分组（仅当节点配置了多实例特性时呈现） */
function createMultiInstanceGroup() {
  return {
    id: 'flowable-multiInstance',
    label: 'Flowable 多实例',
    entries: [
      { id: 'flowable-mi-collection', component: MiCollection, isEdited: isTextFieldEntryEdited },
      { id: 'flowable-mi-elementVariable', component: MiElementVariable, isEdited: isTextFieldEntryEdited }
    ]
  }
}

/** 取元素的多实例特性（无 / 非多实例返回 undefined） */
function getMultiInstanceLoop(element) {
  const loopCharacteristics = getBusinessObject(element).loopCharacteristics
  return loopCharacteristics && is(loopCharacteristics, 'bpmn:MultiInstanceLoopCharacteristics') ? loopCharacteristics : undefined
}

/** 顺序流条件分组 */
function createConditionGroup() {
  return {
    id: 'flowable-condition',
    label: '条件',
    entries: [
      { id: 'flowable-conditionExpression', component: ConditionExpression, isEdited: isTextFieldEntryEdited }
    ]
  }
}

/** 该顺序流是否允许配置条件：并行 / 事件网关出线与默认流上的条件会被引擎忽略，不予展示 */
function isConditionalSource(element) {
  const source = element.source
  if (!source) {
    return false
  }
  if (isAny(source, ['bpmn:ParallelGateway', 'bpmn:EventBasedGateway'])) {
    return false
  }
  // 默认流忽略条件
  if (getBusinessObject(source).default === getBusinessObject(element)) {
    return false
  }
  return true
}

/**
 * Provider 主体：按选中元素类型向面板追加对应的 Flowable 分组。
 * registerProvider 用 LOW_PRIORITY，使本组在官方「常规 / 文档」之后呈现。
 */
function FlowablePropertiesProvider(propertiesPanel) {
  this.getGroups = function (element) {
    return function (groups) {
      if (is(element, 'bpmn:UserTask')) {
        groups.push(createUserTaskGroup())
      }
      if (is(element, 'bpmn:ServiceTask')) {
        groups.push(createServiceTaskGroup())
      }
      if (is(element, 'bpmn:StartEvent')) {
        groups.push(createStartEventGroup())
      }
      if (is(element, 'bpmn:Activity')) {
        groups.push(createAsyncGroup())
      }
      if (getMultiInstanceLoop(element)) {
        groups.push(createMultiInstanceGroup())
      }
      if (is(element, 'bpmn:SequenceFlow') && isConditionalSource(element)) {
        groups.push(createConditionGroup())
      }
      if (is(element, 'bpmn:Process')) {
        groups.push(createProcessGroup())
      }
      return groups
    }
  }

  propertiesPanel.registerProvider(LOW_PRIORITY, this)
}

FlowablePropertiesProvider.$inject = ['propertiesPanel']

export default FlowablePropertiesProvider
