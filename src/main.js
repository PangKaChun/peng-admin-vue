import Vue from "vue";
import App from "./App.vue";
import router from "./router";
import store from "./store";
// ElementUI
import ElementUI from "element-ui";
import "./assets/styles/element-variables.scss";

import directive from "./directive"; // directive
import plugins from "./plugins"; // plugins

import "./assets/styles/index.scss"; // global css
import "@/assets/styles/rongji.scss"; // rongji css

import "./assets/icons"; // icon
import "./permission"; // permission control
import { getDicts } from "@/api/sys/dict/data";

//echarts
import * as echarts from 'echarts';
Vue.prototype.$echarts = echarts;

// 字典标签组件
import DictTag from "@/components/DictTag";
// 字典数据组件
import DictData from "@/components/DictData";

// 左侧工具栏
import RightTool from "@/components/RightTool";

// Fluent UI 图标组件
import FluentIcon from "@/components/FluentIcon";

import {
  parseTime,
  resetForm,
  addDateRange,
  selectDictLabel,
  selectDictLabels,
  handleTree,
  json2FormData,
  formatDuration
} from "@/utils/rongji";

import { valiDators } from "@/utils/valiDator.js";

import { dataToFile } from "@/utils/downloadFileAndImg";

// 分页组件
import Pagination from "@/components/Pagination";

// 全局方法挂载
Vue.prototype.getDicts = getDicts;
Vue.prototype.selectDictLabel = selectDictLabel;
Vue.prototype.selectDictLabels = selectDictLabels;
Vue.prototype.addDateRange = addDateRange;
Vue.prototype.resetForm = resetForm;
Vue.prototype.handleTree = handleTree;
Vue.prototype.parseTime = parseTime;
Vue.prototype.dataToFile = dataToFile;
Vue.prototype.json2FormData = json2FormData;
Vue.prototype.$valiDators = valiDators;
Vue.prototype.formatDuration = formatDuration;

// 全局组件挂载
Vue.component("DictTag", DictTag);
Vue.component("Pagination", Pagination);
Vue.component("RightTool", RightTool);
Vue.component("FluentIcon", FluentIcon);

Vue.use(directive);
Vue.use(plugins);

// ElementUI默认配置
ElementUI.Dialog.props.closeOnClickModal.default = false
Vue.use(ElementUI, { size: "small" });
DictData.install();

Vue.config.productionTip = false;

new Vue({
  router,
  store,
  render: (h) => h(App),
}).$mount("#app");
