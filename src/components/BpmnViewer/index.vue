<template>
  <div ref="canvas" class="bpmn-viewer"></div>
</template>

<script>
import BpmnViewer from 'bpmn-js/lib/NavigatedViewer'
import 'bpmn-js/dist/assets/diagram-js.css'
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css'

export default {
  name: 'BpmnViewer',
  props: {
    xml: { type: String, default: '' }
  },
  watch: {
    xml(val) {
      this.render(val)
    }
  },
  created() {
    this._viewer = null
  },
  mounted() {
    this._viewer = new BpmnViewer({ container: this.$refs.canvas })
    if (this.xml) {
      this.render(this.xml)
    }
  },
  beforeDestroy() {
    if (this._viewer) {
      this._viewer.destroy()
      this._viewer = null
    }
  },
  methods: {
    /** 渲染指定 XML（只读） */
    async render(xml) {
      if (!xml || !this._viewer) {
        return
      }
      try {
        await this._viewer.importXML(xml)
        if (!this._viewer) return
        this._viewer.get('canvas').zoom('fit-viewport')
      } catch (e) {
        if (this._viewer) {
          this.$modal && this.$modal.msgError('渲染流程图失败：' + e.message)
        }
      }
    },
    /** 重新适应视口：对话框展开动画结束后调用，确保画布尺寸已就绪（避免重复 importXML） */
    fit() {
      if (!this._viewer) {
        return
      }
      try {
        this._viewer.get('canvas').zoom('fit-viewport')
      } catch (e) {
        // 画布尚未就绪时忽略
      }
    }
  }
}
</script>

<style scoped>
.bpmn-viewer {
  width: 100%;
  height: 100%;
  min-height: 460px;
}
</style>
