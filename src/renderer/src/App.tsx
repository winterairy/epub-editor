import { Fragment, useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import type { ChainedCommands, Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import DOMPurify from "dompurify";
import { diffLines } from "diff";
import { formatWhenReady, monaco } from "./monaco";
import type { Command } from "../../shared/commands";

type Doc = {
  id: string;
  name: string;
  text: string;
  kind: "html" | "css";
  saved: string;
};
type Panel = "changes" | "validation" | "history";
type Activity = "explorer" | "search" | "media" | "templates";
type Dialog = "new" | "open" | "import" | "settings" | "help" | null;
const readFormatState = (editor: Editor) => ({
  bold: editor.isActive("bold"),
  italic: editor.isActive("italic"),
  underline: editor.isActive("underline"),
  strike: editor.isActive("strike"),
  code: editor.isActive("code"),
  h2: editor.isActive("heading", { level: 2 }),
  h3: editor.isActive("heading", { level: 3 }),
  bulletList: editor.isActive("bulletList"),
  orderedList: editor.isActive("orderedList"),
  blockquote: editor.isActive("blockquote"),
});
type FormatItem = {
  label: string;
  icon: React.ReactNode;
  active?: keyof ReturnType<typeof readFormatState>;
  run: (chain: ChainedCommands) => ChainedCommands;
};
const formatGroups: FormatItem[][] = [
  [
    { label: "굵게", icon: <b>B</b>, active: "bold", run: (c) => c.toggleBold() },
    { label: "기울임", icon: <i>I</i>, active: "italic", run: (c) => c.toggleItalic() },
    { label: "밑줄", icon: <u>U</u>, active: "underline", run: (c) => c.toggleUnderline() },
    { label: "취소선", icon: <s>S</s>, active: "strike", run: (c) => c.toggleStrike() },
    { label: "인라인 코드", icon: <code>{"</>"}</code>, active: "code", run: (c) => c.toggleCode() },
  ],
  [
    { label: "소제목", icon: "H2", active: "h2", run: (c) => c.toggleHeading({ level: 2 }) },
    { label: "작은 소제목", icon: "H3", active: "h3", run: (c) => c.toggleHeading({ level: 3 }) },
    { label: "목록", icon: "• 목록", active: "bulletList", run: (c) => c.toggleBulletList() },
    { label: "번호 목록", icon: "1. 목록", active: "orderedList", run: (c) => c.toggleOrderedList() },
    { label: "인용", icon: "인용", active: "blockquote", run: (c) => c.toggleBlockquote() },
    { label: "구분선", icon: "―", run: (c) => c.setHorizontalRule() },
  ],
  [
    { label: "서식 지우기", icon: "서식 지우기", run: (c) => c.unsetAllMarks().clearNodes() },
  ],
];
const initialDocs: Doc[] = [
  {
    id: "chapter1",
    name: "1장.xhtml",
    kind: "html",
    text: "<h1>새로운 책</h1><p>모든 이야기는 작은 문장에서 시작됩니다.</p><h2>첫 번째 장</h2><p>이곳에 당신의 이야기를 써보세요. 일반 편집과 코드 편집을 오가며 책을 만들어갈 수 있습니다.</p>",
    saved: "",
  },
  {
    id: "chapter2",
    name: "2장.xhtml",
    kind: "html",
    text: "<h1>이야기의 다음 페이지</h1><p>다음 장의 내용을 작성해 보세요.</p>",
    saved: "",
  },
  {
    id: "style",
    name: "스타일.css",
    kind: "css",
    text: "body {\n  font-family: serif;\n  line-height: 1.8;\n}\n\nh1 { margin-bottom: 1.5em; }",
    saved: "",
  },
].map((doc) => ({ ...doc, saved: doc.text })) as Doc[];
const labels = {
  changes: "변경 내용",
  validation: "검증 결과",
  history: "내보내기 기록",
};
function readSize(key: string, fallback: number): number {
  try {
    const n = Number(localStorage.getItem(key));
    return n > 0 && Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}
function plainText(html: string): string {
  const dom = new DOMParser().parseFromString(html, "text/html");
  return dom.body.textContent ?? "";
}

export function App() {
  const [docs, setDocs] = useState<Doc[]>(initialDocs);
  const [activeId, setActiveId] = useState("chapter1");
  const [tabs, setTabs] = useState(["chapter1", "style"]);
  const [mode, setMode] = useState<"rich" | "code">("rich");
  const [activity, setActivity] = useState<Activity>("explorer");
  const [sidebar, setSidebar] = useState(true);
  const [preview, setPreview] = useState(false);
  const [panel, setPanel] = useState<Panel>("changes");
  const [panelOpen, setPanelOpen] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);
  const maxPanelHeight = Math.max(120, Math.min(420, viewportHeight - 280));
  const [panelHeight, setPanelHeight] = useState(() =>
    Math.min(400, Math.max(120, readSize("panel-height", 220))),
  );
  const visiblePanelHeight = Math.min(maxPanelHeight, panelHeight);
  const [sidebarWidth, setSidebarWidth] = useState(() =>
    Math.min(360, Math.max(180, readSize("sidebar-width", 240))),
  );
  const [dialog, setDialog] = useState<Dialog>(null);
  const [book, setBook] = useState({
    title: "이야기의 시작",
    author: "나의 이름",
    language: "ko",
  });
  const [titleDraft, setTitleDraft] = useState("");
  const [authorDraft, setAuthorDraft] = useState("");
  const [languageDraft, setLanguageDraft] = useState("ko");
  const [template, setTemplate] = useState("빈 책");
  const [search, setSearch] = useState("");
  const [format, setFormat] = useState<"EPUB" | "PDF">("EPUB");
  const [baseline, setBaseline] = useState<
    Record<string, Record<string, string>>
  >({ EPUB: {}, PDF: {} });
  const [history, setHistory] = useState<string[]>([]);
  const [validation, setValidation] = useState(false);
  const [notice, setNotice] = useState("UI 프로토타입 · 샘플 프로젝트");
  const [menu, setMenu] = useState<string | null>(null);
  const active = docs.find((doc) => doc.id === activeId);
  const activeRef = useRef(activeId);
  activeRef.current = activeId;
  const docsRef = useRef(docs);
  docsRef.current = docs;
  const codeContainer = useRef<HTMLDivElement>(null);
  const codeEditor = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const commandRef = useRef<(command: Command) => void>(() => {});
  const dirty = docs.some((doc) => doc.text !== doc.saved);
  const updateText = (id: string, text: string) =>
    setDocs((current) =>
      current.map((doc) => (doc.id === id ? { ...doc, text } : doc)),
    );
  const editor = useEditor({
    extensions: [StarterKit],
    content: initialDocs[0].text,
    editorProps: { attributes: { "aria-label": "본문 편집", role: "textbox" } },
    onUpdate: ({ editor }) => updateText(activeRef.current, editor.getHTML()),
  });
  const formatState = useEditorState({
    editor,
    selector: ({ editor }) => (editor ? readFormatState(editor) : null),
  });
  useEffect(() => {
    const doc = docsRef.current.find((doc) => doc.id === activeId);
    if (doc?.kind === "html" && mode === "rich")
      editor?.commands.setContent(doc.text, { emitUpdate: false });
  }, [activeId, mode, editor]);
  useEffect(() => {
    const doc = docsRef.current.find((doc) => doc.id === activeId);
    if (
      !doc ||
      (mode !== "code" && doc.kind !== "css") ||
      !codeContainer.current
    )
      return;
    const instance = monaco.editor.create(codeContainer.current, {
      value: doc.text,
      language: doc.kind,
      theme: "vs-dark",
      automaticLayout: true,
      minimap: { enabled: false },
      wordWrap: "on",
      wrappingIndent: "same",
      fontFamily: '"D2Coding", Consolas, monospace',
      fontSize: 14,
      padding: { top: 20 },
      ariaLabel: doc.kind === "css" ? "CSS 코드 편집" : "HTML 코드 편집",
    });
    codeEditor.current = instance;
    // 정렬만으로 바뀐 내용은 변경으로 표시하지 않도록 저장본도 함께 맞춘다.
    if (doc.kind === "html")
      void formatWhenReady(instance).then((formattedOk) => {
          if (!formattedOk || doc.text !== doc.saved || !instance.getModel())
            return;
          const formatted = instance.getValue();
          setDocs((current) =>
            current.map((item) =>
              item.id === doc.id
                ? { ...item, text: formatted, saved: formatted }
                : item,
            ),
          );
        });
    const subscription = instance.onDidChangeModelContent(() =>
      updateText(doc.id, instance.getValue()),
    );
    return () => {
      subscription.dispose();
      const model = instance.getModel();
      instance.dispose();
      model?.dispose();
      codeEditor.current = null;
    };
  }, [activeId, mode]);
  useEffect(() => {
    try {
      localStorage.setItem("panel-height", String(panelHeight));
      localStorage.setItem("sidebar-width", String(sidebarWidth));
    } catch {
      /* Layout remains available in memory. */
    }
  }, [panelHeight, sidebarWidth]);
  useEffect(() => {
    if (dialog) dialogRef.current?.showModal();
    else dialogRef.current?.close();
  }, [dialog]);
  useEffect(() => {
    const listener = () => setViewportHeight(window.innerHeight);
    window.addEventListener("resize", listener);
    return () => window.removeEventListener("resize", listener);
  }, []);
  useEffect(
    () => window.desktop?.onCommand((command) => commandRef.current(command)),
    [],
  );
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      const command =
        event.key.toLowerCase() === "s"
          ? "save"
          : event.key.toLowerCase() === "b"
            ? "sidebar"
            : event.key.toLowerCase() === "j"
              ? "panel"
              : null;
      if (command) {
        event.preventDefault();
        commandRef.current(command);
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);
  function openDoc(id: string) {
    setTabs((current) => (current.includes(id) ? current : [...current, id]));
    setActiveId(id);
  }
  function closeTab(id: string) {
    const next = tabs.filter((tab) => tab !== id);
    setTabs(next);
    if (id === activeId) setActiveId(next.at(-1) ?? "");
  }
  function showPanel(next: Panel) {
    setPanelOpen((current) => panel !== next || !current);
    setPanel(next);
  }
  function command(command: Command) {
    setMenu(null);
    if (
      command === "new" ||
      command === "open" ||
      command === "import" ||
      command === "settings" ||
      command === "help"
    ) {
      setTitleDraft(command === "settings" ? book.title : "");
      setAuthorDraft(book.author);
      setLanguageDraft(book.language);
      setDialog(command);
    } else if (command === "save") {
      setDocs((current) => current.map((doc) => ({ ...doc, saved: doc.text })));
      setNotice("저장 동작 데모 · PC에는 파일을 쓰지 않았습니다.");
    } else if (command === "sidebar") setSidebar((value) => !value);
    else if (command === "panel") setPanelOpen((value) => !value);
    else if (command === "preview") setPreview((value) => !value);
    else if (command === "search" || command === "templates") {
      setActivity(command);
      setSidebar(true);
    } else if (command === "code" || command === "rich") {
      if (active?.kind === "css" && command === "rich") {
        setNotice("CSS는 코드 편집으로 열립니다.");
        return;
      }
      if (command === "rich")
        setNotice(
          "프로토타입: 기본 문서 요소만 지원합니다. 임의 XHTML 보존은 후속 구현입니다.",
        );
      setMode(command);
    } else if (command === "validate") {
      setValidation(true);
      setPanel("validation");
      setPanelOpen(true);
    } else if (command === "changes" || command === "export") {
      setPanel("changes");
      setPanelOpen(true);
    }
  }
  commandRef.current = command;
  function resize(event: React.PointerEvent, target: "sidebar" | "panel") {
    const element = event.currentTarget as HTMLElement;
    element.setPointerCapture(event.pointerId);
    const start = target === "sidebar" ? event.clientX : event.clientY;
    const initial = target === "sidebar" ? sidebarWidth : visiblePanelHeight;
    const move = (next: PointerEvent) => {
      const size =
        initial +
        (target === "sidebar" ? next.clientX - start : start - next.clientY);
      if (target === "sidebar")
        setSidebarWidth(Math.min(360, Math.max(180, size)));
      else setPanelHeight(Math.min(maxPanelHeight, Math.max(120, size)));
    };
    const stop = () => {
      element.removeEventListener("pointermove", move);
      element.removeEventListener("pointerup", stop);
      element.removeEventListener("pointercancel", stop);
    };
    element.addEventListener("pointermove", move);
    element.addEventListener("pointerup", stop);
    element.addEventListener("pointercancel", stop);
  }
  function newBook() {
    if (
      (dirty || history.length) &&
      !window.confirm("현재 데모의 편집 내용과 기록을 지우고 새 책을 만들까요?")
    )
      return;
    const title = titleDraft.trim() || "새로운 책";
    const text = `<h1>${DOMPurify.sanitize(title, { ALLOWED_TAGS: [] })}</h1><p>${template === "빈 책" ? "첫 문장을 작성해 보세요." : "템플릿으로 이야기를 시작해 보세요."}</p>`;
    setDocs([{ ...initialDocs[0], text, saved: text }, initialDocs[2]]);
    setBook({ title, author: "나의 이름", language: "ko" });
    setTabs(["chapter1"]);
    setActiveId("chapter1");
    setMode("rich");
    editor?.commands.setContent(text, { emitUpdate: false });
    setBaseline({ EPUB: {}, PDF: {} });
    setHistory([]);
    setValidation(false);
    setDialog(null);
    setNotice(`${template}으로 새 책 생성 데모`);
  }
  const changedDocs = docs.filter(
    (doc) => baseline[format][doc.id] !== doc.text,
  );
  function demoExport() {
    setBaseline((current) => ({
      ...current,
      [format]: Object.fromEntries(docs.map((doc) => [doc.id, doc.text])),
    }));
    setHistory((current) => [
      `${format} · ${new Date().toLocaleTimeString("ko-KR")} · 출력 흐름 데모 (파일 생성 없음)`,
      ...current,
    ]);
    setNotice(
      `${format} 내보내기 흐름을 확인했습니다. 실제 파일은 생성하지 않았습니다.`,
    );
    setPanel("history");
  }
  const menuGroups: Record<string, [string, Command][]> = {
    파일: [
      ["새 책…", "new"],
      ["열기…", "open"],
      ["DOCX 가져오기…", "import"],
      ["저장 (데모)", "save"],
      ["EPUB/PDF 내보내기…", "export"],
    ],
    편집: [["책 전체 검색", "search"]],
    보기: [
      ["사이드바 표시/숨기기", "sidebar"],
      ["하단 패널 표시/숨기기", "panel"],
      ["미리보기 표시/숨기기", "preview"],
    ],
    책: [
      ["메타데이터·표지·목차", "settings"],
      ["템플릿·스타일", "templates"],
    ],
    도구: [
      ["책 검증 (데모)", "validate"],
      ["변경 내용 확인", "changes"],
    ],
    도움말: [["사용 안내", "help"]],
  };
  return (
    <div className="studio">
      <header className="titlebar">
        <span className="brand">
          ▣ <b>EPUB STUDIO</b>
        </span>
        {!window.desktop && (
          <nav aria-label="브라우저용 메뉴">
            {Object.keys(menuGroups).map((label) => (
              <div className="menu-group" key={label}>
                <button
                  aria-expanded={menu === label}
                  onClick={() => setMenu(menu === label ? null : label)}
                >
                  {label}
                </button>
                {menu === label && (
                  <div className="menu-popup">
                    {menuGroups[label].map(([text, action]) => (
                      <button key={action} onClick={() => command(action)}>
                        {text}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
        )}
        <span className="book-title">{book.title} — 작업실</span>
        <span className="prototype-badge">UI PROTOTYPE</span>
      </header>
      <div className="workbench">
        <nav className="activitybar" aria-label="활동 바">
          {(
            [
              ["explorer", "▤", "책 탐색기"],
              ["search", "⌕", "전체 검색"],
              ["media", "▧", "미디어"],
              ["templates", "▦", "템플릿"],
            ] as const
          ).map(([id, icon, label]) => (
            <button
              key={id}
              className={activity === id && sidebar ? "active" : ""}
              title={label}
              aria-label={label}
              aria-pressed={activity === id && sidebar}
              onClick={() => {
                if (activity === id) setSidebar((value) => !value);
                else {
                  setActivity(id);
                  setSidebar(true);
                }
              }}
            >
              {icon}
            </button>
          ))}
          <button
            className="settings-button"
            aria-label="책 설정"
            title="책 설정"
            onClick={() => command("settings")}
          >
            ⚙
          </button>
        </nav>
        {sidebar && (
          <>
            <aside className="sidebar" style={{ width: sidebarWidth }}>
              <div className="sidebar-heading">
                <span>
                  {
                    {
                      explorer: "책 탐색기",
                      search: "전체 검색",
                      media: "미디어",
                      templates: "템플릿",
                    }[activity]
                  }
                </span>
                <button
                  aria-label="사이드바 접기"
                  onClick={() => setSidebar(false)}
                >
                  ×
                </button>
              </div>
              {activity === "explorer" && (
                <>
                  <div className="project-name">▾ {book.title}</div>
                  <details open>
                    <summary>본문</summary>
                    {docs
                      .filter((doc) => doc.kind === "html")
                      .map((doc) => (
                        <button
                          className={`tree-file ${activeId === doc.id ? "selected" : ""}`}
                          key={doc.id}
                          aria-label={doc.name}
                          onClick={() => openDoc(doc.id)}
                        >
                          <span className="file-icon">◇</span>
                          {doc.name}
                          {doc.text !== doc.saved && (
                            <span className="dirty-dot">●</span>
                          )}
                        </button>
                      ))}
                  </details>
                  <details open>
                    <summary>스타일</summary>
                    {docs
                      .filter((doc) => doc.kind === "css")
                      .map((doc) => (
                        <button
                          key={doc.id}
                          className={`tree-file ${activeId === doc.id ? "selected" : ""}`}
                          aria-label={doc.name}
                          onClick={() => openDoc(doc.id)}
                        >
                          <span className="file-icon css">#</span>
                          {doc.name}
                        </button>
                      ))}
                  </details>
                  <details>
                    <summary>이미지</summary>
                    <p className="muted sidebar-note">
                      미디어를 첨부하면 여기에 표시됩니다.
                    </p>
                  </details>
                  <button
                    className="sidebar-action"
                    onClick={() => command("settings")}
                  >
                    책 정보 설정
                  </button>
                </>
              )}
              {activity === "search" && (
                <>
                  <input
                    autoFocus
                    aria-label="책 전체 검색어"
                    placeholder="책에서 찾기…"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                  <p className="muted sidebar-note">샘플 본문 검색</p>
                  {search &&
                    docs
                      .filter((doc) => plainText(doc.text).includes(search))
                      .map((doc) => (
                        <button
                          className="search-result"
                          key={doc.id}
                          onClick={() => openDoc(doc.id)}
                        >
                          {doc.name}
                          <small>{plainText(doc.text).slice(0, 80)}</small>
                        </button>
                      ))}
                  {search &&
                    !docs.some((doc) =>
                      plainText(doc.text).includes(search),
                    ) && <p className="sidebar-note">검색 결과가 없습니다.</p>}
                </>
              )}
              {activity === "media" && (
                <div className="sidebar-note">
                  <div className="empty-icon">▧</div>
                  <h3>책에 장면을 더하세요</h3>
                  <p className="muted">
                    이미지와 GIF를 관리할 공간입니다. 첨부 기능은 후속
                    개발됩니다.
                  </p>
                  <button
                    onClick={() =>
                      setNotice("미디어 첨부는 후속 개발 예정입니다.")
                    }
                  >
                    미디어 첨부 (예정)
                  </button>
                </div>
              )}
              {activity === "templates" && (
                <div className="template-list">
                  {["빈 책", "소설", "에세이"].map((name) => (
                    <button
                      key={name}
                      onClick={() => {
                        setTemplate(name);
                        setDialog("new");
                      }}
                    >
                      <span>▤</span>
                      <b>{name}</b>
                      <small>새 책에 적용 · 데모</small>
                    </button>
                  ))}
                </div>
              )}
            </aside>
            <div
              className="sidebar-resizer"
              role="separator"
              aria-label="사이드바 너비"
              aria-orientation="vertical"
              aria-valuenow={sidebarWidth}
              aria-valuemin={180}
              aria-valuemax={360}
              tabIndex={0}
              onPointerDown={(event) => resize(event, "sidebar")}
              onKeyDown={(event) => {
                if (["ArrowLeft", "ArrowRight"].includes(event.key)) {
                  event.preventDefault();
                  setSidebarWidth((value) =>
                    Math.min(
                      360,
                      Math.max(
                        180,
                        value + (event.key === "ArrowRight" ? 20 : -20),
                      ),
                    ),
                  );
                }
              }}
            />
          </>
        )}
        <div className="main-column">
          <div className="file-tabs" role="tablist" aria-label="파일 탭">
            {tabs.map((id) => {
              const doc = docs.find((doc) => doc.id === id)!;
              return (
                <div
                  key={id}
                  className={`file-tab ${activeId === id ? "selected" : ""}`}
                >
                  <button
                    role="tab"
                    aria-selected={activeId === id}
                    onClick={() => setActiveId(id)}
                  >
                    {doc.kind === "css" ? "#" : "◇"} {doc.name}
                    {doc.text !== doc.saved && " ●"}
                  </button>
                  <button
                    aria-label={`${doc.name} 닫기`}
                    onClick={() => closeTab(id)}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
          {active ? (
            <>
              <div className="editor-toolbar">
                <span className="breadcrumb">본문 / {active.name}</span>
                <div className="mode-switch">
                  {active.kind === "html" && (
                    <>
                      <button
                        className={mode === "rich" ? "selected" : ""}
                        onClick={() => command("rich")}
                      >
                        일반 편집
                      </button>
                      <button
                        className={mode === "code" ? "selected" : ""}
                        onClick={() => command("code")}
                      >
                        코드 편집
                      </button>
                    </>
                  )}
                </div>
                <button
                  aria-pressed={preview}
                  onClick={() => command("preview")}
                >
                  ◫ 미리보기
                </button>
                <button
                  className="primary small"
                  onClick={() => command("export")}
                >
                  내보내기
                </button>
              </div>
              <div className="editing-split">
                <section
                  className={`editor-area ${mode === "rich" && active.kind === "html" ? "rich" : ""}`}
                  aria-label="편집 작업 공간"
                >
                  {mode === "rich" && active.kind === "html" ? (
                    <>
                      <div className="format-toolbar">
                        {formatGroups.map((group, index) => (
                          <Fragment key={index}>
                            {index > 0 && <span className="divider" />}
                            {group.map((item) => (
                              <button
                                key={item.label}
                                aria-label={item.label}
                                title={item.label}
                                aria-pressed={
                                  item.active ? formatState?.[item.active] : undefined
                                }
                                onClick={() =>
                                  editor && item.run(editor.chain().focus()).run()
                                }
                              >
                                {item.icon}
                              </button>
                            ))}
                          </Fragment>
                        ))}
                      </div>
                      <EditorContent editor={editor} />
                    </>
                  ) : (
                    <div ref={codeContainer} className="code-editor" />
                  )}
                </section>
                {preview && (
                  <aside className="preview-pane" aria-label="책 미리보기">
                    <div className="preview-heading">
                      책 미리보기 <span>본문 데모</span>
                    </div>
                    <article
                      dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(
                          active.kind === "html"
                            ? active.text
                            : "<p>본문 장을 선택하면 미리보기를 표시합니다.</p>",
                        ),
                      }}
                    />
                    <p className="preview-note">
                      실제 EPUB 페이지 배치와 CSS 적용은 후속 구현
                    </p>
                  </aside>
                )}
              </div>
            </>
          ) : (
            <div className="welcome">
              <div className="empty-icon">▣</div>
              <h1>당신의 이야기를 책으로</h1>
              <p>새 책을 시작하거나 탐색기에서 장을 선택하세요.</p>
              <button onClick={() => command("new")}>새 책 만들기</button>
              <button onClick={() => command("open")}>최근 프로젝트</button>
              <button onClick={() => command("import")}>DOCX 가져오기</button>
            </div>
          )}
          <section className="bottom-panel" aria-label="하단 패널">
            {panelOpen && (
              <div
                className="panel-resizer"
                role="separator"
                aria-label="하단 패널 높이"
                aria-orientation="horizontal"
                aria-valuenow={visiblePanelHeight}
                aria-valuemin={120}
                aria-valuemax={maxPanelHeight}
                tabIndex={0}
                onPointerDown={(event) => resize(event, "panel")}
                onKeyDown={(event) => {
                  if (["ArrowUp", "ArrowDown"].includes(event.key)) {
                    event.preventDefault();
                    setPanelHeight((value) =>
                      Math.min(
                        maxPanelHeight,
                        Math.max(
                          120,
                          Math.min(value, maxPanelHeight) +
                            (event.key === "ArrowUp" ? 20 : -20),
                        ),
                      ),
                    );
                  }
                }}
              />
            )}
            <div
              className="panel-tabs"
              role="tablist"
              aria-label="하단 패널 탭"
            >
              {(Object.keys(labels) as Panel[]).map((id) => (
                <button
                  key={id}
                  id={`tab-${id}`}
                  role="tab"
                  aria-selected={panel === id}
                  aria-expanded={panel === id && panelOpen}
                  aria-controls="panel-content"
                  className={panel === id && panelOpen ? "selected" : ""}
                  onClick={() => showPanel(id)}
                >
                  {labels[id]}
                  {id === "changes" && (
                    <span className="count">{changedDocs.length}</span>
                  )}
                </button>
              ))}
              <button
                className="panel-toggle"
                aria-label={panelOpen ? "하단 패널 접기" : "하단 패널 펼치기"}
                onClick={() => setPanelOpen((value) => !value)}
              >
                {panelOpen ? "⌄" : "⌃"}
              </button>
            </div>
            {panelOpen && (
              <div
                id="panel-content"
                role="tabpanel"
                aria-labelledby={`tab-${panel}`}
                className="panel-content"
                style={{ height: visiblePanelHeight }}
              >
                {panel === "changes" && (
                  <>
                    <div className="review-header">
                      <div>
                        <b>
                          {Object.keys(baseline[format]).length
                            ? "이전 내보내기와 비교"
                            : "첫 내보내기 · 전체 내용 확인"}
                        </b>
                        <p>
                          비교 기준과 기록은 메모리에만 저장됩니다. 실제 파일
                          출력은 하지 않습니다.
                        </p>
                      </div>
                      <label>
                        출력 형식{" "}
                        <select
                          aria-label="출력 형식"
                          value={format}
                          onChange={(event) =>
                            setFormat(event.target.value as "EPUB" | "PDF")
                          }
                        >
                          <option>EPUB</option>
                          <option>PDF</option>
                        </select>
                      </label>
                      <button className="primary" onClick={demoExport}>
                        확인 후 내보내기 (데모)
                      </button>
                    </div>
                    {!changedDocs.length ? (
                      <p className="muted">
                        이전 {format} 내보내기 이후 변경된 내용이 없습니다.
                      </p>
                    ) : (
                      changedDocs.map((doc) => (
                        <details className="diff-file" key={doc.id}>
                          <summary>
                            ＋ {doc.name}{" "}
                            <span>
                              {baseline[format][doc.id] === undefined
                                ? "추가"
                                : "수정"}
                            </span>
                          </summary>
                          <pre>
                            {diffLines(
                              baseline[format][doc.id] ?? "",
                              doc.text,
                            ).map((part, index) => (
                              <span
                                className={
                                  part.added
                                    ? "added"
                                    : part.removed
                                      ? "removed"
                                      : ""
                                }
                                key={index}
                              >
                                {part.added ? "+ " : part.removed ? "- " : "  "}
                                {part.value}
                              </span>
                            ))}
                          </pre>
                        </details>
                      ))
                    )}
                  </>
                )}
                {panel === "validation" && (
                  <>
                    <div className="review-header">
                      <div>
                        <b>책 검증</b>
                        <p>
                          아래 항목은 화면 동작을 확인하기 위한 샘플입니다.
                          EPUBCheck는 실행하지 않습니다.
                        </p>
                      </div>
                      <button onClick={() => setValidation(true)}>
                        검증 실행 (데모)
                      </button>
                    </div>
                    {validation ? (
                      <button
                        className="validation-row"
                        onClick={() => {
                          openDoc("chapter1");
                          setNotice("샘플 안내의 본문 파일로 이동했습니다.");
                        }}
                      >
                        ⓘ 1장.xhtml · 표지를 설정해 보세요.{" "}
                        <span>샘플 안내</span>
                      </button>
                    ) : (
                      <p className="muted">
                        검증을 실행하면 결과와 파일 위치를 표시합니다.
                      </p>
                    )}
                  </>
                )}
                {panel === "history" && (
                  <>
                    <p className="muted">이번 세션의 내보내기 흐름 데모 기록</p>
                    {history.length ? (
                      history.map((entry, index) => (
                        <div className="history-row" key={index}>
                          ✓ {entry}
                        </div>
                      ))
                    ) : (
                      <p>아직 내보내기 기록이 없습니다.</p>
                    )}
                  </>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
      <footer className="statusbar">
        <span role="status">
          {dirty ? "● 저장하지 않은 변경 · 데모" : "✓ 샘플 상태"} · {notice}
        </span>
        <div>
          <span>
            {active?.kind === "html"
              ? `${plainText(active.text).length}자`
              : "CSS"}
          </span>
          <span>
            {active?.kind === "css" || mode === "code"
              ? "코드 편집"
              : "일반 편집"}
          </span>
          <button onClick={() => command("export")}>{format} ▴</button>
        </div>
      </footer>
      <dialog
        ref={dialogRef}
        onCancel={() => setDialog(null)}
        onClose={() => setDialog(null)}
        aria-labelledby="dialog-title"
      >
        <div className="dialog-heading">
          <h2 id="dialog-title">
            {
              {
                new: "새 책 만들기",
                open: "최근 프로젝트",
                import: "Word 원고 가져오기",
                settings: "책 설정",
                help: "EPUB Studio 안내",
              }[dialog ?? "help"]
            }
          </h2>
          <button aria-label="대화상자 닫기" onClick={() => setDialog(null)}>
            ×
          </button>
        </div>
        {dialog === "new" && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              newBook();
            }}
          >
            <label>
              책 제목
              <input
                autoFocus
                value={titleDraft}
                onChange={(event) => setTitleDraft(event.target.value)}
                placeholder="새로운 책"
              />
            </label>
            <label>
              기본 템플릿
              <select
                value={template}
                onChange={(event) => setTemplate(event.target.value)}
              >
                {["빈 책", "소설", "에세이"].map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </select>
            </label>
            <p className="muted">
              데모 문서를 만듭니다. 디스크에 저장하지 않습니다.
            </p>
            <button className="primary">책 만들기 (데모)</button>
          </form>
        )}
        {dialog === "open" && (
          <>
            <p className="muted">
              최근 프로젝트 목록 예시입니다. 실제 경로는 읽지 않습니다.
            </p>
            <button
              className="recent-card"
              onClick={() => {
                openDoc("chapter1");
                setDialog(null);
                setNotice("현재 샘플 프로젝트를 열었습니다.");
              }}
            >
              <b>{book.title}</b>
              <small>샘플 프로젝트 · 현재 세션</small>
            </button>
          </>
        )}
        {dialog === "import" && (
          <>
            <div className="import-placeholder">DOCX 원고를 가져올 공간</div>
            <p>
              Mammoth로 문단·제목·이미지를 가져오는 기능은 후속 단계에서
              구현합니다.
            </p>
            <button
              onClick={() =>
                setNotice(
                  "DOCX 가져오기 화면 데모입니다. 파일은 읽지 않았습니다.",
                )
              }
            >
              파일 선택 (예정)
            </button>
          </>
        )}
        {dialog === "settings" && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setBook((current) => ({
                ...current,
                title: titleDraft.trim() || current.title,
                author: authorDraft,
                language: languageDraft,
              }));
              setDialog(null);
              setNotice("책 정보 변경 데모 · OPF 저장은 후속 구현");
            }}
          >
            <label>
              책 제목
              <input
                value={titleDraft}
                onChange={(event) => setTitleDraft(event.target.value)}
              />
            </label>
            <label>
              저자
              <input
                value={authorDraft}
                onChange={(event) => setAuthorDraft(event.target.value)}
              />
            </label>
            <label>
              언어
              <select
                value={languageDraft}
                onChange={(event) => setLanguageDraft(event.target.value)}
              >
                <option value="ko">한국어</option>
                <option value="en">영어</option>
              </select>
            </label>
            <p className="muted">표지와 목차의 세부 설정은 후속 구현됩니다.</p>
            <button className="primary">적용 (데모)</button>
          </form>
        )}
        {dialog === "help" && (
          <>
            <p>로컬 전자책 작업실 UI 프로토타입입니다.</p>
            <p>
              탐색기 → 편집 → 변경 확인 → 내보내기 흐름을 확인할 수 있습니다.
            </p>
            <p>Ctrl+B: 사이드바 · Ctrl+J: 하단 패널 · Ctrl+S: 저장 데모</p>
            <p className="muted">
              프로젝트 저장·DOCX 가져오기·미디어·실제 EPUB/PDF 출력은 아직
              제공하지 않습니다. 코드에서 일반 편집으로 전환하면 지원하지 않는
              태그가 유실될 수 있습니다.
            </p>
          </>
        )}
      </dialog>
    </div>
  );
}
