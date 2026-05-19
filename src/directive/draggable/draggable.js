export default {
  /**
   * 弹窗拖拽指令
   * @param {*} el dom元素
   * @param {*} binding
   * @param {*} vnode
   */
  inserted(el, binding, vnode) {
    //当被绑定的元素插入到 DOM 中时
    //获取当前的位置;
    el.onmousedown = function (e) {
      var x = e.clientX - el.offsetLeft;
      var y = e.clientY - el.offsetTop;
      document.onmousemove = function (eve) {
        el.style.left = eve.clientX - x + "px";
        el.style.top = eve.clientY - y + "px";
      };
      document.onmouseup = function () {
        document.onmousemove = null;
        document.onmouseup = null;
      };
    };
  },
};
