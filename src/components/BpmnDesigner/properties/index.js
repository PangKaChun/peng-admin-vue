import FlowablePropertiesProvider from './FlowablePropertiesProvider'

/**
 * Flowable 属性 Provider 模块
 *
 * 注册到 BpmnModeler 的 additionalModules，与官方 BpmnPropertiesProviderModule 协同：
 * 通用属性（编号 / 名称 / 文档）沿用官方，Flowable 扩展属性由本模块补齐。
 */
export default {
  __init__: ['flowablePropertiesProvider'],
  flowablePropertiesProvider: ['type', FlowablePropertiesProvider]
}
