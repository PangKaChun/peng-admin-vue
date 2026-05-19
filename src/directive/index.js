import hasRole from "./permission/hasRole";
import hasPermi from "./permission/hasPermi";
import draggable from "./draggable/draggable";
import debounce from "./debounce/debounce";
import throttling from "./throttling/throttling";
import elDragDialog from "./el-dragDialog/darg";
const install = function (Vue) {
  Vue.directive("hasRole", hasRole);
  Vue.directive("hasPermi", hasPermi);
  Vue.directive("draggable", draggable);
  Vue.directive("debounce", debounce);
  Vue.directive("throttling", throttling);
  Vue.directive("elDragDialog", elDragDialog);
};

if (window.Vue) {
  window["hasRole"] = hasRole;
  window["hasPermi"] = hasPermi;
  window["draggable"] = draggable;
  window["debounce"] = debounce;
  window["throttling"] = throttling;
  window["elDragDialog"] = elDragDialog;
  Vue.use(install); // eslint-disable-line
}

export default install;
