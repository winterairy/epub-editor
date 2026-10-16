import { Fragment, useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import type { ChainedCommands, Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import DOMPurify from "dompurify";
import { diffLines } from "diff";
import { formatWhenReady, monaco } from "./monaco";
import type { Command } from "../../shared/commands";
import {
  ArrowDownTrayIcon, Bars3BottomLeftIcon, BoldIcon, BookOpenIcon,
  ChevronDownIcon, ChevronUpIcon, CodeBracketIcon, Cog6ToothIcon,
  DocumentTextIcon, FolderIcon, ItalicIcon, ListBulletIcon, MagnifyingGlassIcon,
  MinusIcon, NumberedListIcon, PhotoIcon, Squares2X2Icon, StrikethroughIcon,
  UnderlineIcon, ViewColumnsIcon, XMarkIcon,
} from "@heroicons/react/24/outline";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { TooltipProvider } from "./components/ui/tooltip";
import { ToggleGroup, ToggleGroupItem } from "./components/ui/toggle-group";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./components/ui/tabs";
import { IconButton } from "./components/IconButton";
import { ChoiceSelect } from "./components/ChoiceSelect";
import { StudioMenubar } from "./components/StudioMenubar";
import { StudioDialogs, type DialogKind } from "./components/StudioDialogs";

type Doc = {
  id: string;
  name: string;
  text: string;
  kind: "html" | "css";
  saved: string;
};
type Panel = "changes" | "validation" | "history";
type Activity = "explorer" | "search" | "media" | "templates";
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
    { label: "굵게", icon: <BoldIcon />, active: "bold", run: (c) => c.toggleBold() },
    { label: "기울임", icon: <ItalicIcon />, active: "italic", run: (c) => c.toggleItalic() },
    { label: "밑줄", icon: <UnderlineIcon />, active: "underline", run: (c) => c.toggleUnderline() },
    { label: "취소선", icon: <StrikethroughIcon />, active: "strike", run: (c) => c.toggleStrike() },
    { label: "인라인 코드", icon: <CodeBracketIcon />, active: "code", run: (c) => c.toggleCode() },
  ],
  [
    { label: "소제목", icon: "H2", active: "h2", run: (c) => c.toggleHeading({ level: 2 }) },
    { label: "작은 소제목", icon: "H3", active: "h3", run: (c) => c.toggleHeading({ level: 3 }) },
    { label: "목록", icon: <ListBulletIcon />, active: "bulletList", run: (c) => c.toggleBulletList() },
    { label: "번호 목록", icon: <NumberedListIcon />, active: "orderedList", run: (c) => c.toggleOrderedList() },
    { label: "인용", icon: <Bars3BottomLeftIcon />, active: "blockquote", run: (c) => c.toggleBlockquote() },
    { label: "구분선", icon: <MinusIcon />, run: (c) => c.setHorizontalRule() },
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
  const [dialog, setDialog] = useState<DialogKind>(null);
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
  const active = docs.find((doc) => doc.id === activeId);
  const activeRef = useRef(activeId);
  activeRef.current = activeId;
  const docsRef = useRef(docs);
  docsRef.current = docs;
  const codeContainer = useRef<HTMLDivElement>(null);
  const codeEditor = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const dialogReturnFocus = useRef<HTMLElement | null>(null);
  const panelClickWasOpen = useRef(false);
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
    if (
      command === "new" ||
      command === "open" ||
      command === "import" ||
      command === "settings" ||
      command === "help"
    ) {
      dialogReturnFocus.current = document.activeElement as HTMLElement | null;
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
  return (
    <TooltipProvider delayDuration={300}>
    <div className="studio">
      <header className="titlebar">
        <span className="brand">
          <BookOpenIcon className="size-5" aria-hidden="true" /> <b>EPUB STUDIO</b>
        </span>
        {!window.desktop && <StudioMenubar onCommand={command} />}
        <span className="book-title">{book.title} — 작업실</span>
        <span className="prototype-badge">UI PROTOTYPE</span>
      </header>
      <div className="workbench">
        <nav className="activitybar" aria-label="활동 바">
          {(
            [
              ["explorer", FolderIcon, "책 탐색기"],
              ["search", MagnifyingGlassIcon, "전체 검색"],
              ["media", PhotoIcon, "미디어"],
              ["templates", Squares2X2Icon, "템플릿"],
            ] as const
          ).map(([id, Icon, label]) => (
            <IconButton
              key={id}
              className={activity === id && sidebar ? "active" : ""}
              label={label}
              side="right"
              aria-pressed={activity === id && sidebar}
              onClick={() => {
                if (activity === id) setSidebar((value) => !value);
                else {
                  setActivity(id);
                  setSidebar(true);
                }
              }}
            >
              <Icon className="size-6" aria-hidden="true" />
            </IconButton>
          ))}
          <IconButton
            className="settings-button"
            label="책 설정"
            side="right"
            onClick={() => command("settings")}
          >
            <Cog6ToothIcon className="size-6" aria-hidden="true" />
          </IconButton>
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
                <IconButton
                  label="사이드바 접기"
                  onClick={() => setSidebar(false)}
                >
                  <XMarkIcon aria-hidden="true" />
                </IconButton>
              </div>
              {activity === "explorer" && (
                <>
                  <div className="project-name">▾ {book.title}</div>
                  <details open>
                    <summary>본문</summary>
                    {docs
                      .filter((doc) => doc.kind === "html")
                      .map((doc) => (
                        <Button variant="ghost"
                          className={`tree-file ${activeId === doc.id ? "selected" : ""}`}
                          key={doc.id}
                          aria-label={doc.name}
                          onClick={() => openDoc(doc.id)}
                        >
                          <DocumentTextIcon className="file-icon size-4" aria-hidden="true" />
                          {doc.name}
                          {doc.text !== doc.saved && (
                            <span className="dirty-dot">●</span>
                          )}
                        </Button>
                      ))}
                  </details>
                  <details open>
                    <summary>스타일</summary>
                    {docs
                      .filter((doc) => doc.kind === "css")
                      .map((doc) => (
                        <Button variant="ghost"
                          key={doc.id}
                          className={`tree-file ${activeId === doc.id ? "selected" : ""}`}
                          aria-label={doc.name}
                          onClick={() => openDoc(doc.id)}
                        >
                          <CodeBracketIcon className="file-icon css size-4" aria-hidden="true" />
                          {doc.name}
                        </Button>
                      ))}
                  </details>
                  <details>
                    <summary>이미지</summary>
                    <p className="muted sidebar-note">
                      미디어를 첨부하면 여기에 표시됩니다.
                    </p>
                  </details>
                  <Button variant="ghost"
                    className="sidebar-action"
                    onClick={() => command("settings")}
                  >
                    책 정보 설정
                  </Button>
                </>
              )}
              {activity === "search" && (
                <>
                  <Input
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
                        <Button variant="ghost"
                          className="search-result"
                          key={doc.id}
                          onClick={() => openDoc(doc.id)}
                        >
                          {doc.name}
                          <small>{plainText(doc.text).slice(0, 80)}</small>
                        </Button>
                      ))}
                  {search &&
                    !docs.some((doc) =>
                      plainText(doc.text).includes(search),
                    ) && <p className="sidebar-note">검색 결과가 없습니다.</p>}
                </>
              )}
              {activity === "media" && (
                <div className="sidebar-note">
                  <PhotoIcon className="empty-icon size-10" aria-hidden="true" />
                  <h3>책에 장면을 더하세요</h3>
                  <p className="muted">
                    이미지와 GIF를 관리할 공간입니다. 첨부 기능은 후속
                    개발됩니다.
                  </p>
                  <Button variant="ghost"
                    onClick={() =>
                      setNotice("미디어 첨부는 후속 개발 예정입니다.")
                    }
                  >
                    미디어 첨부 (예정)
                  </Button>
                </div>
              )}
              {activity === "templates" && (
                <div className="template-list">
                  {["빈 책", "소설", "에세이"].map((name) => (
                    <Button variant="ghost"
                      key={name}
                      onClick={() => {
                        command("new");
                        setTemplate(name);
                      }}
                    >
                      <BookOpenIcon className="size-6" aria-hidden="true" />
                      <b>{name}</b>
                      <small>새 책에 적용 · 데모</small>
                    </Button>
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
        <Tabs value={activeId} onValueChange={setActiveId} className="main-column">
          <TabsList className="file-tabs" aria-label="파일 탭" variant="line">
            {tabs.map((id) => {
              const doc = docs.find((doc) => doc.id === id)!;
              return (
                <div
                  key={id}
                  className={`file-tab ${activeId === id ? "selected" : ""}`}
                >
                  <TabsTrigger value={id}>
                    {doc.kind === "css" ? <CodeBracketIcon aria-hidden="true" /> : <DocumentTextIcon aria-hidden="true" />} {doc.name}
                    {doc.text !== doc.saved && " ●"}
                  </TabsTrigger>
                  <IconButton
                    label={`${doc.name} 닫기`}
                    onClick={() => closeTab(id)}
                  >
                    <XMarkIcon aria-hidden="true" />
                  </IconButton>
                </div>
              );
            })}
          </TabsList>
          {active ? (
            <TabsContent value={activeId} forceMount className="document-content" aria-label={`${active.name} 편집 작업 공간`}>
              <div className="editor-toolbar">
                <span className="breadcrumb">본문 / {active.name}</span>
                <ToggleGroup type="single" value={mode} onValueChange={(value) => {
                  if (value === "rich" || value === "code") command(value);
                }} className="mode-switch" aria-label="편집 모드" size="sm">
                  {active.kind === "html" && (
                    <>
                      <ToggleGroupItem value="rich">
                        <DocumentTextIcon aria-hidden="true" /> 일반 편집
                      </ToggleGroupItem>
                      <ToggleGroupItem value="code">
                        <CodeBracketIcon aria-hidden="true" /> 코드 편집
                      </ToggleGroupItem>
                    </>
                  )}
                </ToggleGroup>
                <Button variant="ghost" size="sm"
                  aria-pressed={preview}
                  onClick={() => command("preview")}
                >
                  <ViewColumnsIcon aria-hidden="true" /> 미리보기
                </Button>
                <Button variant="ghost"
                  className="primary small"
                  onClick={() => command("export")}
                >
                  <ArrowDownTrayIcon aria-hidden="true" /> 내보내기
                </Button>
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
                              <IconButton
                                key={item.label}
                                label={item.label}
                                aria-pressed={
                                  item.active ? Boolean(formatState?.[item.active]) : undefined
                                }
                                disabled={!editor}
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() =>
                                  editor && item.run(editor.chain().focus()).run()
                                }
                              >
                                {item.icon}
                              </IconButton>
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
            </TabsContent>
          ) : (
            <div className="welcome">
              <BookOpenIcon className="empty-icon size-10" aria-hidden="true" />
              <h1>당신의 이야기를 책으로</h1>
              <p>새 책을 시작하거나 탐색기에서 장을 선택하세요.</p>
              <Button variant="ghost" onClick={() => command("new")}>새 책 만들기</Button>
              <Button variant="ghost" onClick={() => command("open")}>최근 프로젝트</Button>
              <Button variant="ghost" onClick={() => command("import")}>DOCX 가져오기</Button>
            </div>
          )}
          <Tabs asChild value={panel} onValueChange={(value) => {
            setPanel(value as Panel);
            setPanelOpen(true);
          }}>
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
            <div className="panel-tabs">
            <TabsList aria-label="하단 패널 탭" variant="line" className="panel-tab-list">
              {(Object.keys(labels) as Panel[]).map((id) => (
                <TabsTrigger
                  key={id}
                  value={id}
                  aria-expanded={panel === id && panelOpen}
                  className={panel === id && panelOpen ? "selected" : ""}
                  onPointerDown={() => { panelClickWasOpen.current = panel === id && panelOpen; }}
                  onClick={() => {
                    setPanel(id);
                    setPanelOpen(!panelClickWasOpen.current);
                    panelClickWasOpen.current = false;
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      showPanel(id);
                    }
                  }}
                >
                  {labels[id]}
                  {id === "changes" && (
                    <span className="count">{changedDocs.length}</span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
              <IconButton
                className="panel-toggle"
                label={panelOpen ? "하단 패널 접기" : "하단 패널 펼치기"}
                onClick={() => setPanelOpen((value) => !value)}
              >
                {panelOpen ? <ChevronDownIcon aria-hidden="true" /> : <ChevronUpIcon aria-hidden="true" />}
              </IconButton>
            </div>
            {panelOpen && (
              <TabsContent
                value={panel}
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
                      <div className="export-format">
                        <span id="export-format-label">출력 형식</span>
                        <ChoiceSelect label="출력 형식" value={format} onValueChange={(value) => setFormat(value as "EPUB" | "PDF")} options={["EPUB", "PDF"].map((value) => ({ value, label: value }))} />
                      </div>
                      <Button variant="ghost" className="primary" onClick={demoExport}>
                        확인 후 내보내기 (데모)
                      </Button>
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
                      <Button variant="ghost" onClick={() => setValidation(true)}>
                        검증 실행 (데모)
                      </Button>
                    </div>
                    {validation ? (
                      <Button variant="ghost"
                        className="validation-row"
                        onClick={() => {
                          openDoc("chapter1");
                          setNotice("샘플 안내의 본문 파일로 이동했습니다.");
                        }}
                      >
                        ⓘ 1장.xhtml · 표지를 설정해 보세요.{" "}
                        <span>샘플 안내</span>
                      </Button>
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
              </TabsContent>
            )}
          </section>
          </Tabs>
        </Tabs>
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
          <Button variant="ghost" onClick={() => command("export")}>{format} <ChevronUpIcon aria-hidden="true" /></Button>
        </div>
      </footer>
      <StudioDialogs
        kind={dialog}
        draft={{ title: titleDraft, author: authorDraft, language: languageDraft, template }}
        bookTitle={book.title}
        hasEdits={dirty || history.length > 0}
        returnFocus={dialogReturnFocus}
        onChange={(draft) => {
          if (draft.title !== undefined) setTitleDraft(draft.title);
          if (draft.author !== undefined) setAuthorDraft(draft.author);
          if (draft.language !== undefined) setLanguageDraft(draft.language);
          if (draft.template !== undefined) setTemplate(draft.template);
        }}
        onClose={() => setDialog(null)}
        onCreate={newBook}
        onApply={() => {
          setBook((current) => ({ ...current, title: titleDraft.trim() || current.title, author: authorDraft, language: languageDraft }));
          setDialog(null);
          setNotice("책 정보 변경 데모 · OPF 저장은 후속 구현");
        }}
        onOpenSample={() => {
          openDoc("chapter1");
          setDialog(null);
          setNotice("현재 샘플 프로젝트를 열었습니다.");
        }}
        onImport={() => setNotice("DOCX 가져오기 화면 데모입니다. 파일은 읽지 않았습니다.")}
      />
    </div>
    </TooltipProvider>
  );
}
