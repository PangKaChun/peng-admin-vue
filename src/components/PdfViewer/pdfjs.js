// pdf.js 核心库与 viewer 层。
// 本模块连同 pdf.js 是一个异步 chunk,由 PdfViewer 在首次预览时加载
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf'
import { EventBus, PDFLinkService, PDFFindController, PDFViewer } from 'pdfjs-dist/legacy/web/pdf_viewer'
import 'pdfjs-dist/legacy/web/pdf_viewer.css'
import pdfWorkerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.js'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

// CJK 字型映射与标准字体资源
const PDF_ASSETS_BASE = process.env.BASE_URL + 'static/pdf-assets/'

/**
 * 在滚动容器上创建 viewer
 * @param {HTMLElement} container 绝对定位的滚动容器,内含 .pdfViewer 节点
 * @returns {{eventBus, linkService, viewer}}
 */
export function createViewer(container) {
  const eventBus = new EventBus()
  const linkService = new PDFLinkService({ eventBus })
  const findController = new PDFFindController({ eventBus, linkService })
  const viewer = new PDFViewer({
    container,
    viewer: container.querySelector('.pdfViewer'),
    eventBus,
    linkService,
    findController
  })
  linkService.setViewer(viewer)
  return { eventBus, linkService, viewer }
}

/**
 * 发起文档加载
 * @param {Uint8Array} data PDF 文件内容
 * @returns pdf.js 的 loadingTask,promise 字段给出文档,destroy() 中止加载并释放 worker
 */
export function loadDocument(data) {
  return pdfjsLib.getDocument({
    data,
    cMapUrl: PDF_ASSETS_BASE + 'cmaps/',
    cMapPacked: true,
    standardFontDataUrl: PDF_ASSETS_BASE + 'standard_fonts/',
    // 禁用 eval 执行 PDF 内嵌字体程序(CVE-2024-4367 防护,文件来自用户上传不可信)
    isEvalSupported: false
  })
}
