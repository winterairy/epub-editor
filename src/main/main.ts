import { app, BrowserWindow, Menu, dialog } from "electron";
import * as path from "path";

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 1000,
    title: "EPUB Reader",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (!app.isPackaged) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: "파일",
      submenu: [
        {
          label: "파일 열기...",
          accelerator: "Ctrl+O",
          click: async () => {
            if (!mainWindow) return;

            const { canceled, filePaths } = await dialog.showOpenDialog(
              mainWindow,
              {
                title: "EPUB 파일 선택",
                buttonLabel: "열기",
                properties: ["openFile"],
                filters: [
                  { name: "EPUB 파일", extensions: ["epub"] },
                  { name: "모든 파일", extensions: ["*"] },
                ],
              }
            );

            if (!canceled && filePaths.length > 0) {
              console.log("선택한 파일:", filePaths[0]);
              // mainWindow.webContents.send("open-epub", filePaths[0]);
            }
          },
        },
        { type: "separator" },
        { role: "quit", label: "끝내기" },
      ],
    },
    {
      label: "보기",
      submenu: [
        { role: "reload", label: "새로고침" },
        { type: "separator" },
        { role: "togglefullscreen", label: "전체 화면 전환" },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    if (!app.isPackaged) {
      process.exit(0);
    }
  }
});
