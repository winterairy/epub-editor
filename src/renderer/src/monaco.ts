import * as monaco from 'monaco-editor'
import EditorWorker from 'monaco-editor/editor/editor.worker.js?worker'
import HtmlWorker from 'monaco-editor/language/html/html.worker.js?worker'
import CssWorker from 'monaco-editor/language/css/css.worker.js?worker'
self.MonacoEnvironment = { getWorker(_id, label) {
  if (label === 'html') return new HtmlWorker()
  if (label === 'css') return new CssWorker()
  return new EditorWorker()
} }
// 블록 태그마다 줄을 나누되, 긴 문단은 강제로 자르지 않고 화면 줄바꿈(wordWrap)에 맡긴다.
monaco.html.htmlDefaults.setOptions({
  ...monaco.html.htmlDefaults.options,
  format: { ...(monaco.html.htmlDefaults.options.format as monaco.html.HTMLFormatConfiguration), tabSize: 2, insertSpaces: true, wrapLineLength: 0 },
})
export { monaco }
