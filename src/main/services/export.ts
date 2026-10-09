import { BrowserWindow, dialog } from "electron";
import { writeFileSync } from "node:fs";
import { marked } from "marked";
import dayjs from "dayjs";
import type { Report } from "../../shared/types";
import type { ExportResult } from "../../shared/api";

function reportTitle(report: Report): string {
  return report.type === "daily" ? "工作日报" : "工作周报";
}

function reportDateText(report: Report): string {
  if (report.type === "daily") return report.date;
  // 周报 date 存的是周一，补上周日形成完整区间：周一 ~ 周日
  const start = report.date;
  const end = dayjs(report.date).add(6, "day").format("YYYY-MM-DD");
  return `${start} ~ ${end}`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

export function reportToMarkdown(report: Report): string {
  const lines: string[] = [
    `# ${reportTitle(report)}`,
    "",
    `> 日期：${reportDateText(report)}`,
    ""
  ];
  for (const s of report.sections) {
    lines.push(`## ${s.title}`, "");
    if (s.content.trim()) lines.push(s.content.trim(), "");
  }
  return lines.join("\n");
}

export function reportToHtml(report: Report): string {
  const sectionsHtml = report.sections
    .map(
      (s) => `
  <section class="section">
    <h2>${escapeHtml(s.title)}</h2>
    <div class="content">${marked.parse(s.content || "") as string}</div>
  </section>`
    )
    .join("\n");

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(reportTitle(report))}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: "Microsoft YaHei", "PingFang SC", "Segoe UI", sans-serif;
         color: #303133; line-height: 1.7; margin: 0; padding: 40px; background: #fff; }
  .report { max-width: 800px; margin: 0 auto; }
  .report h1 { font-size: 24px; border-bottom: 2px solid #409eff; padding-bottom: 10px; }
  .meta { color: #909399; margin: 8px 0 28px; }
  .section { margin-bottom: 26px; }
  .section h2 { font-size: 18px; color: #409eff; border-left: 4px solid #409eff; padding-left: 10px; }
  .content { margin-left: 4px; }
  .content h3 { font-size: 15px; margin: 14px 0 6px; }
  .content h4 { font-size: 14px; margin: 12px 0 4px; color: #606266; }
  .content h5 { font-size: 13px; margin: 10px 0 2px; color: #909399; font-weight: 600; }
  .content ul { padding-left: 22px; margin: 6px 0; }
  .content li { margin: 4px 0; }
  code { background: #f5f7fa; padding: 2px 6px; border-radius: 3px; font-family: Consolas, monospace; }
  @media print { body { padding: 0; } .section { page-break-inside: avoid; } }
</style>
</head>
<body>
<div class="report">
  <h1>${escapeHtml(reportTitle(report))}</h1>
  <div class="meta">日期：${escapeHtml(reportDateText(report))}</div>
  ${sectionsHtml}
</div>
</body>
</html>`;
}

function defaultFileName(report: Report, ext: string): string {
  const date =
    report.type === "daily"
      ? report.date
      : `${report.date}~${dayjs(report.date).add(6, "day").format("YYYY-MM-DD")}`;
  return `${date}-${report.type}-工作汇报.${ext}`;
}

/**
 * 弹保存对话框。注意：没有窗口时不能把 undefined 作为第一个参数传给
 * showSaveDialog（Electron 会抛 "conversion failure from undefined"），
 * 此时要用只接受 options 的重载。
 */
async function showSaveDialog(
  defaultPath: string,
  filterName: string,
  ext: string
): Promise<{ canceled: boolean; filePath?: string }> {
  const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
  const options = {
    defaultPath,
    filters: [{ name: filterName, extensions: [ext] }]
  };
  return win ? dialog.showSaveDialog(win, options) : dialog.showSaveDialog(options);
}

async function saveFile(
  report: Report,
  ext: string,
  filterName: string,
  content: string | Buffer
): Promise<ExportResult> {
  const { canceled, filePath } = await showSaveDialog(
    defaultFileName(report, ext),
    filterName,
    ext
  );
  if (canceled || !filePath) return { saved: false, canceled: true };
  writeFileSync(filePath, content);
  return { saved: true, path: filePath };
}

export async function exportMarkdown(report: Report): Promise<ExportResult> {
  return saveFile(report, "md", "Markdown", reportToMarkdown(report));
}

export async function exportHtml(report: Report): Promise<ExportResult> {
  return saveFile(report, "html", "HTML", reportToHtml(report));
}

export async function exportPdf(report: Report): Promise<ExportResult> {
  const { canceled, filePath } = await showSaveDialog(
    defaultFileName(report, "pdf"),
    "PDF",
    "pdf"
  );
  if (canceled || !filePath) return { saved: false, canceled: true };

  const html = reportToHtml(report);
  const pdfWin = new BrowserWindow({
    show: false,
    webPreferences: { sandbox: true, nodeIntegration: false }
  });
  try {
    await pdfWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    const data = await pdfWin.webContents.printToPDF({
      printBackground: true,
      pageSize: "A4",
      margins: { top: 0.4, bottom: 0.4, left: 0.4, right: 0.4 }
    });
    writeFileSync(filePath, data);
    return { saved: true, path: filePath };
  } finally {
    pdfWin.destroy();
  }
}
