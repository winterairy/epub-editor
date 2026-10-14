import { useEffect, useRef, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { monaco } from './monaco'
const sample = '<h1>새로운 책</h1><p>첫 번째 장을 작성해 보세요.</p>'
export function App() {
  const [mode, setMode] = useState<'rich' | 'code'>('rich')
  const [html, setHtml] = useState(sample)
  const container = useRef<HTMLDivElement>(null)
  const code = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)
  const editor = useEditor({ extensions: [StarterKit], content: sample, editorProps: { attributes: { 'aria-label': '본문 편집', role: 'textbox' } }, onUpdate: ({ editor }) => setHtml(editor.getHTML()) })
  useEffect(() => {
    if (mode !== 'code' || !container.current) return
    const instance = monaco.editor.create(container.current, { value: html, language: 'html', automaticLayout: true, minimap: { enabled: false }, fontSize: 15, theme: 'vs', ariaLabel: 'HTML 코드 편집' })
    code.current = instance
    return () => { const model = instance.getModel(); instance.dispose(); model?.dispose(); code.current = null }
  }, [mode])
  function toggle() {
    if (mode === 'rich') { setHtml(editor?.getHTML() ?? html); setMode('code') }
    else { const next = code.current?.getValue() ?? html; editor?.commands.setContent(next); setHtml(editor?.getHTML() ?? next); setMode('rich') }
  }
  return <main>
    <header><div><p className="eyebrow">EPUB STUDIO</p><h1>나의 전자책 작업실</h1></div><button onClick={toggle}>{mode === 'rich' ? '코드 편집' : '일반 편집'}</button></header>
    <div className="workspace"><aside><h2>책 구성</h2><p className="chapter">1. 첫 번째 장</p><p>로컬 프로젝트 기반 편집기</p></aside>
    <section aria-label="편집 작업 공간"><div className="toolbar"><strong>{mode === 'rich' ? '일반 편집' : 'HTML 코드 편집'}</strong>{mode === 'rich' && <><button onClick={() => editor?.chain().focus().toggleBold().run()}>굵게</button><button onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>소제목</button></>}</div>
    {mode === 'rich' ? <EditorContent editor={editor} /> : <div ref={container} className="code-editor" />}
    </section></div>
    <footer>개발용 기본 화면 · 저장 및 내보내기는 이후 구현됩니다. 코드 전환은 기본 문서 요소만 지원합니다.</footer>
  </main>
}
