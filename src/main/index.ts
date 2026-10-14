import {
  app,
  BrowserWindow,
  Menu,
  type MenuItemConstructorOptions,
} from "electron";
import { join } from "node:path";
import type { Command } from "../shared/commands";
function createWindow(): void {
  const window = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: join(import.meta.dirname, "../preload/index.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event) => event.preventDefault());
  const item = (
    label: string,
    command: Command,
    accelerator?: string,
  ): MenuItemConstructorOptions => ({
    label,
    accelerator,
    click: () => window.webContents.send("editor:command", command),
  });
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      {
        label: "파일",
        submenu: [
          item("새 책…", "new", "CmdOrCtrl+N"),
          item("열기…", "open", "CmdOrCtrl+O"),
          item("DOCX 가져오기…", "import"),
          { type: "separator" },
          item("저장 (데모)", "save", "CmdOrCtrl+S"),
          item("EPUB/PDF 내보내기…", "export"),
          { role: "quit", label: "종료" },
        ],
      },
      {
        label: "편집",
        submenu: [
          { role: "undo", label: "실행 취소" },
          { role: "redo", label: "다시 실행" },
          { type: "separator" },
          { role: "cut", label: "잘라내기" },
          { role: "copy", label: "복사" },
          { role: "paste", label: "붙여넣기" },
          item("책 전체 검색", "search", "CmdOrCtrl+Shift+F"),
        ],
      },
      {
        label: "보기",
        submenu: [
          item("일반 편집", "rich"),
          item("코드 편집", "code"),
          item("사이드바 표시/숨기기", "sidebar", "CmdOrCtrl+B"),
          item("하단 패널 표시/숨기기", "panel", "CmdOrCtrl+J"),
          item("미리보기 표시/숨기기", "preview"),
        ],
      },
      {
        label: "책",
        submenu: [
          item("메타데이터·표지·목차", "settings"),
          item("템플릿·스타일", "templates"),
        ],
      },
      {
        label: "도구",
        submenu: [
          item("책 검증 (데모)", "validate"),
          item("변경 내용 확인", "changes"),
        ],
      },
      { label: "도움말", submenu: [item("사용 안내·앱 정보", "help")] },
    ]),
  );
  const devUrl = process.env.ELECTRON_RENDERER_URL;
  if (devUrl) void window.loadURL(devUrl);
  else
    void window.loadFile(join(import.meta.dirname, "../renderer/index.html"));
}
app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
