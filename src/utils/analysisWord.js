/**
 * 解析word 在线预览
 * Ligenghong
 * @param {*} url
 *
 */
import mammoth from "mammoth";
export function analysisWord(url) {
  var vm = this;
  var xhr = new XMLHttpRequest();
  xhr.open("get", url, true);
  xhr.responseType = "arraybuffer";
  xhr.onload = function () {
    if (xhr.status == 200) {
      mammoth
        .convertToHtml({ arrayBuffer: new Uint8Array(xhr.response) })
        .then(function (resultObject) {
          vm.$nextTick(() => {
            vm.officeViewerUrl = resultObject.value;
          });
        });
    }
  };
  xhr.send();
}
