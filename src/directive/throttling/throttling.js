export default {
  /**
   * 节流
   * 时间到了才再次执行
   * @param {*} el
   * @param {*} binding
   * @param {*} vnode
   */
  inserted(el, binding, vnode) {
    el.addEventListener("click", () => {
      if (!el.throttle) {
        el.throttle = true;
        setTimeout(() => {
          el.throttle = false;
        }, 3000);
      }
    });
  },
};
