import { contextBridge, ipcRenderer } from "electron";
import type { Api } from "../shared/api";

/**
 * Electron IPC 使用 V8 序列化器，无法克隆 Vue 响应式 Proxy（会抛
 * "An object could not be cloned"）。这里统一把对象参数深拷贝成纯 JSON 数据，
 * 再交给 ipcRenderer.invoke，避免渲染进程把 reactive/ref 的 Proxy 传过来。
 */
function toPlain<T>(value: T): T {
  if (value === null || typeof value !== "object") return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

const api: Api = {
  git: {
    validateRepo: (path) => ipcRenderer.invoke("git:validateRepo", path),
    listCommits: (query) => ipcRenderer.invoke("git:listCommits", toPlain(query)),
    listBranches: (repos) =>
      ipcRenderer.invoke("git:listBranches", toPlain(repos)),
    listAuthors: (query) => ipcRenderer.invoke("git:listAuthors", toPlain(query))
  },
  settings: {
    get: () => ipcRenderer.invoke("settings:get"),
    set: (settings) => ipcRenderer.invoke("settings:set", toPlain(settings))
  },
  report: {
    save: (report) => ipcRenderer.invoke("report:save", toPlain(report)),
    load: (id) => ipcRenderer.invoke("report:load", id),
    list: () => ipcRenderer.invoke("report:list"),
    remove: (id) => ipcRenderer.invoke("report:remove", id)
  },
  export: {
    markdown: (report) => ipcRenderer.invoke("export:markdown", toPlain(report)),
    html: (report) => ipcRenderer.invoke("export:html", toPlain(report)),
    pdf: (report) => ipcRenderer.invoke("export:pdf", toPlain(report))
  },
  // 文本在主进程生成后直接写系统剪贴板：避免渲染进程在 file:// 下
  // 拿不到 navigator.clipboard 权限
  copy: {
    markdown: (report) => ipcRenderer.invoke("copy:markdown", toPlain(report)),
    plain: (report) => ipcRenderer.invoke("copy:plain", toPlain(report))
  },
  dialog: {
    openDirectory: () => ipcRenderer.invoke("dialog:openDirectory")
  },
  shell: {
    openPath: (path) => ipcRenderer.invoke("shell:openPath", path)
  }
};

contextBridge.exposeInMainWorld("api", api);
