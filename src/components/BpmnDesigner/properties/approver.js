/**
 * 用户任务「审批人」扩展元素读写工具
 *
 * 审批人配置不再使用 flowable:assignee / candidateUsers / candidateGroups 属性，而是落到
 * 用户任务 extensionElements 下：
 *   - flowable:field name="approverType"     审批人类型（USER/ROLES/DEPTS/INITIATOR/...）
 *   - flowable:field name="approverValue"    取值（用户/角色/部门 id 逗号分隔，或表达式）
 *   - flowable:field name="assignmentMode"   分配方式（ASSIGNEE 直接办理 / CANDIDATE 候选）
 *   - flowable:field name="approvalStrategy" 审批策略（ANYONE 任意一人 / ALL 所有人）
 *
 * field 取值放在子元素 <flowable:string> 内（moddle 中 Field.string 为非属性 String 字段）。
 * 本模块封装它们的读 / 写 / 删，供 preact 属性面板组件（FlowablePropertiesProvider）与 Vue
 * 设计器（BpmnDesigner/index.vue 的选人弹窗回写）共用；写入统一经 modeling 纳入命令栈（可撤销 / 重做）。
 */
import { is, getBusinessObject } from 'bpmn-js/lib/util/ModelUtil'

// 取值型审批人：需要进一步选择具体用户 / 角色 / 部门 / 表达式
export const VALUE_APPROVER_TYPES = ['USER', 'ROLES', 'DEPTS', 'EXPRESSION']
// 直接解析为单一办理人的审批人类型（发起人系）
const SINGLE_APPROVER_TYPES = ['INITIATOR', 'INITIATOR_MANAGER', 'INITIATOR_DEPT_LEADER']
// 本模块托管的 field 名称
const APPROVER_FIELDS = ['approverType', 'approverValue', 'assignmentMode']

/**
 * 依据审批人类型与取值推导分配方式
 * 单人来源（发起人系）或仅指定 1 个用户 → ASSIGNEE；其余（多人 / 角色 / 部门 / 表达式）→ CANDIDATE
 */
export function deriveAssignmentMode(type, value) {
  if (SINGLE_APPROVER_TYPES.includes(type)) {
    return 'ASSIGNEE'
  }
  if (type === 'USER') {
    const count = String(value ?? '').split(',').filter(s => s.trim()).length
    return count === 1 ? 'ASSIGNEE' : 'CANDIDATE'
  }
  return 'CANDIDATE'
}

function getExtensionValues(bo) {
  return bo.get('extensionElements')?.get('values') || []
}

// 判断某个 flowable:field 是否存在且值等于预期
function isField(v, name) {
  return is(v, 'flowable:Field') && v.get('name') === name
}

/** 读取某个 flowable:field 的值（取子元素 <flowable:string>） */
export function readField(bo, name) {
  const field = getExtensionValues(bo).find(v => isField(v, name))
  return field ? (field.get('string') || '') : ''
}

// 以新的 values 数组整体写回 extensionElements（单条命令，便于撤销）
function writeExtensionValues(modeling, bpmnFactory, element, values) {
  const bo = getBusinessObject(element)
  let extensionElements = bo.get('extensionElements')
  if (!extensionElements) {
    if (!values.length) {
      return
    }
    extensionElements = bpmnFactory.create('bpmn:ExtensionElements', { values: values })
    extensionElements.$parent = bo
    values.forEach(v => { v.$parent = extensionElements })
    modeling.updateProperties(element, { extensionElements: extensionElements })
  } else {
    values.forEach(v => { if (!v.$parent) { v.$parent = extensionElements } })
    modeling.updateModdleProperties(element, extensionElements, { values: values })
  }
}

// 创建一个 flowable:field 实例
function createField(bpmnFactory,name, stringVal) {
  return bpmnFactory.create('flowable:Field', { name, string: String(stringVal) })
}

/**
 * 写入审批人配置：一次性重建 approverType / approverValue / assignmentMode 三个 field。
 * 在取值型类型间切换时保留 approvalStrategy；切到非取值型（发起人系）或清空时一并清除 approvalStrategy。
 * type 为空表示清空审批人配置。
 */
export function setApprover(modeling, bpmnFactory, element, type, value) {
  const bo = getBusinessObject(element)
  const isValueType = VALUE_APPROVER_TYPES.includes(type)
  const next = getExtensionValues(bo).filter(function (v) {
    if (is(v, 'flowable:Field')) {
      const fieldName = v.get('name')
      // 这三个 field 总是重建
      if (APPROVER_FIELDS.includes(fieldName)) {
        return false
      }
      // 非取值型审批人无需审批策略，顺带清除
      if (fieldName === 'approvalStrategy' && !isValueType) {
        return false
      }
    }
    return true
  })
  if (type) {
    next.push(createField(bpmnFactory, 'approverType', type))
    if (isValueType && value) {
      next.push(createField(bpmnFactory, 'approverValue', String(value)))
    }
    next.push(createField(bpmnFactory, 'assignmentMode', deriveAssignmentMode(type, value)))
  }
  writeExtensionValues(modeling, bpmnFactory, element, next)
}

/** 仅更新审批人取值（approverValue），并按类型重算 assignmentMode；审批人类型保持不变 */
export function setApproverValue(modeling, bpmnFactory, element, value) {
  const type = readField(getBusinessObject(element), 'approverType')
  setApprover(modeling, bpmnFactory, element, type, value)
}

/** 写入 / 清除一个具名 flowable:field（value 为空则删除），保留其它扩展元素 */
export function setField(modeling, bpmnFactory, element, name, value) {
  const bo = getBusinessObject(element)
  const next = getExtensionValues(bo).filter(
    v => !isField(v, name)
  )
  if (value) {
    next.push(createField(bpmnFactory, name, String(value)))
  }
  writeExtensionValues(modeling, bpmnFactory, element, next)
}
