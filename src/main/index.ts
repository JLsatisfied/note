import { app, BrowserWindow, shell } from "electron";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { registerIpc } from "./ipc";

/**
 * 开发时任务栏和窗口标题栏用的图标。
 *
 * 打包后 Windows 会直接用 exe 里嵌好的图标；而 build/ 是构建资源目录，
 * 不会被打进 app.asar，所以在安装后的应用里这个路径不存在，返回 undefined
 * 让 Electron 用默认行为。
 */
function windowIcon(): string | undefined {
  const file = join(__dirname, "../../build/icon.png");
  return existsSync(file) ? file : undefined;
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1080,
    minHeight: 680,
    show: false,
    autoHideMenuBar: true,
    icon: windowIcon(),
    title: "Note — 工作汇报",
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.on("ready-to-show", () => mainWindow.show());

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });

  if (!app.isPackaged && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

app.whenReady().then(() => {
  app.setAppUserModelId("com.note.app");
  registerIpc();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
