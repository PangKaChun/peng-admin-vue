<template>
  <div class="bpmn-designer">
    <div class="bpmn-toolbar">
      <el-button-group>
        <el-button size="mini" icon="el-icon-zoom-in" @click="zoom(0.1)">放大</el-button>
        <el-button size="mini" icon="el-icon-zoom-out" @click="zoom(-0.1)">缩小</el-button>
        <el-button size="mini" icon="el-icon-refresh" @click="fitViewport">适应</el-button>
      </el-button-group>
    </div>
    <div class="bpmn-body">
      <div ref="canvas" class="bpmn-canvas"></div>
      <!-- 属性面板：选中流程/节点后可设置 id(Key)、名称、条件表达式等 -->
      <div ref="panel" class="bpmn-properties"></div>
    </div>
  </div>
</template>

<script>
import BpmnModeler from 'bpmn-js/lib/Modeler'
import { BpmnPropertiesPanelModule, BpmnPropertiesProviderModule } from 'bpmn-js-properties-panel'
import customTranslate from './customTranslate'
import flowableModdle from './flowable.json'
import flowablePropertiesProviderModule from './properties'

import 'bpmn-js/dist/assets/diagram-js.css'
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css'
import '@bpmn-io/properties-panel/dist/assets/properties-panel.css'

// 自定义中文翻译模块，覆盖 bpmn-js 默认英文文案
const customTranslateModule = {
  translate: ['value', customTranslate]
}

// 新建流程时的空白模板（含一个开始节点与对应 DI）
const EMPTY_DIAGRAM = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:omgdc="http://www.omg.org/spec/DD/20100524/DC" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" id="sid-38422fae-e03e-43a3-bef4-bd33b32041b2" targetNamespace="http://bpmn.io/bpmn" exporter="bpmn-js (https://demo.bpmn.io)" exporterVersion="18.16.0">
  <process id="Process_1" isExecutable="true">
    <startEvent id="StartEvent_1y45yut" name="开始" />
  </process>
  <bpmndi:BPMNDiagram id="BpmnDiagram_1">
    <bpmndi:BPMNPlane id="BpmnPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="StartEvent_1y45yut_di" bpmnElement="StartEvent_1y45yut">
        <omgdc:Bounds x="152" y="102" width="36" height="36" />
        <bpmndi:BPMNLabel>
          <omgdc:Bounds x="160" y="145" width="22" height="27" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</definitions>`

export default {
  name: 'BpmnDesigner',
  props: {
    xml: { type: String, default: '' }
  },
  data() {
    return {
      modeler: null
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
    this.createDiagram(this.xml || EMPTY_DIAGRAM)
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
      } catch (e) {
        this.$modal && this.$modal.msgError('加载流程图失败：' + e.message)
      }
    },
    /** 适应画布 */
    fitViewport() {
      this.modeler.get('canvas').zoom('fit-viewport')
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
</style>
