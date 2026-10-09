import { dialog, ipcMain, shell } from "electron";
import {
  listAuthors,
  listBranches,
  listCommits,
  validateRepo
} from "./services/git";
import {
  deleteReport,
  getSettings,
  listReports,
  loadReport,
  saveReport,
  setSettings
} from "./services/store";
import { exportHtml, exportMarkdown, exportPdf } from "./services/export";
import { copyMarkdown, copyPlainText } from "./services/copy";
import type { ListCommitsQuery, Report, Settings } from "../shared/types";

export function registerIpc(): void {
  ipcMain.handle("git:validateRepo", (_e, path: string) => validateRepo(path));
  ipcMain.handle("git:listCommits", (_e, query: ListCommitsQuery) =>
    listCommits(query)
  );
  ipcMain.handle("git:listBranches", (_e, repos: string[]) =>
    listBranches(repos)
  );
  ipcMain.handle("git:listAuthors", (_e, query) => listAuthors(query));

  ipcMain.handle("settings:get", () => getSettings());
  ipcMain.handle("settings:set", (_e, settings: Settings) => setSettings(settings));

  ipcMain.handle("report:save", (_e, report: Report) => saveReport(report));
  ipcMain.handle("report:load", (_e, id: string) => loadReport(id));
  ipcMain.handle("report:list", () => listReports());
  ipcMain.handle("report:remove", (_e, id: string) => deleteReport(id));

  ipcMain.handle("export:markdown", (_e, report: Report) => exportMarkdown(report));
  ipcMain.handle("export:html", (_e, report: Report) => exportHtml(report));
  ipcMain.handle("export:pdf", (_e, report: Report) => exportPdf(report));

  ipcMain.handle("copy:markdown", (_e, report: Report) => copyMarkdown(report));
  ipcMain.handle("copy:plain", (_e, report: Report) => copyPlainText(report));

  ipcMain.handle("dialog:openDirectory", async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ["openDirectory"]
    });
    return { canceled, path: filePaths[0] ?? null };
  });

  ipcMain.handle("shell:openPath", (_e, path: string) => shell.openPath(path));
}
