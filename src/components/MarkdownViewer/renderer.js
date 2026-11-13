// Markdown 渲染链路:marked 解析 → DOMPurify 消毒 → highlight.js 代码高亮。
// 本模块连同这三个库是一个异步 chunk,由 MarkdownViewer 在首次预览时加载
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import hljs from 'highlight.js/lib/core'
import 'highlight.js/styles/github.css'
// 按需注册常用语言
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import java from 'highlight.js/lib/languages/java'
import json from 'highlight.js/lib/languages/json'
import xml from 'highlight.js/lib/languages/xml'
import css from 'highlight.js/lib/languages/css'
import scss from 'highlight.js/lib/languages/scss'
import bash from 'highlight.js/lib/languages/bash'
import shell from 'highlight.js/lib/languages/shell'
import sql from 'highlight.js/lib/languages/sql'
import python from 'highlight.js/lib/languages/python'
import go from 'highlight.js/lib/languages/go'
import yaml from 'highlight.js/lib/languages/yaml'
import ini from 'highlight.js/lib/languages/ini'
import plaintext from 'highlight.js/lib/languages/plaintext'

// 语言名 → 语法定义,html / vue 复用 xml
const LANGUAGES = {
  javascript, typescript, java, json, xml, html: xml, vue: xml, css, scss,
  bash, shell, sql, python, go, yaml, ini, plaintext
}
Object.keys(LANGUAGES).forEach(name => hljs.registerLanguage(name, LANGUAGES[name]))
hljs.configure({ ignoreUnescapedHTML: true })

const purifier = DOMPurify(window)
// 外链统一新窗口打开并断开 opener,避免预览内点击把整个管理端导航走
purifier.addHook('afterSanitizeAttributes', node => {
  if (node.tagName === 'A' && node.hasAttribute('href')) {
    node.setAttribute('target', '_blank')
    node.setAttribute('rel', 'noopener noreferrer')
  }
})
// 禁掉 style 标签与内联样式:防止注入全局 CSS 或 fixed 覆盖层遮挡管理端
const SANITIZE_OPTIONS = { FORBID_TAGS: ['style'], FORBID_ATTR: ['style'] }

/**
 * Markdown 文本 → 可直接交给 v-html 的 HTML
 * 经 DOMPurify 白名单消毒,脚本/事件属性/危险协议均被剥除
 */
export function renderMarkdown(text) {
  return purifier.sanitize(marked.parse(text, { gfm: true }), SANITIZE_OPTIONS)
}

/** 高亮单个代码块(pre > code 节点) */
export function highlightBlock(block) {
  hljs.highlightElement(block)
}
