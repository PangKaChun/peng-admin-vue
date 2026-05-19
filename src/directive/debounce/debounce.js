export default {
  /**
   * 防抖
   * 按钮多次点击只有一次执行
   * @param {*} el
   * @param {*} binding
   * @param {*} vnode
   */
  inserted(el, binding, vnode) {
    el.addEventListener("click", () => {
      if (el.timer !== null) {
        clearTimeout(el.timer);
      }
      el.timer = setTimeout(() => {}, 3000);
    });
  },
};
