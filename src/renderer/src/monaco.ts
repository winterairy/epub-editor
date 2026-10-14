import * as monaco from 'monaco-editor'
import EditorWorker from 'monaco-editor/editor/editor.worker.js?worker'
import HtmlWorker from 'monaco-editor/language/html/html.worker.js?worker'
import CssWorker from 'monaco-editor/language/css/css.worker.js?worker'
self.MonacoEnvironment = { getWorker(_id, label) {
  if (label === 'html') return new HtmlWorker()
  if (label === 'css') return new CssWorker()
  return new EditorWorker()
} }
export { monaco }
