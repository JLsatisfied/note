import { app } from "electron";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  unlinkSync,
  writeFileSync
} from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { Report, Settings } from "../../shared/types";

const DEFAULT_SETTINGS: Settings = {
  repos: [],
  defaultAuthor: "",
  includeMerges: false
};

function dataDir(): string {
  const dir = join(app.getPath("userData"), "note");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

function reportsDir(): string {
  const dir = join(dataDir(), "reports");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

/** 原子写：先写临时文件再 rename，避免中断损坏 */
function atomicWrite(file: string, data: string): void {
  const tmp = `${file}.tmp`;
  writeFileSync(tmp, data, "utf-8");
  renameSync(tmp, file);
}

export function getSettings(): Settings {
  const file = join(dataDir(), "settings.json");
  if (!existsSync(file)) return { ...DEFAULT_SETTINGS };
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(readFileSync(file, "utf-8")) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function setSettings(settings: Settings): Settings {
  atomicWrite(join(dataDir(), "settings.json"), JSON.stringify(settings, null, 2));
  return settings;
}

export function saveReport(report: Report): Report {
  const now = new Date().toISOString();
  const final: Report = {
    ...report,
    id: report.id || randomUUID(),
    createdAt: report.createdAt || now,
    updatedAt: now
  };
  atomicWrite(join(reportsDir(), `${final.id}.json`), JSON.stringify(final, null, 2));
  return final;
}

export function loadReport(id: string): Report | null {
  const file = join(reportsDir(), `${id}.json`);
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, "utf-8")) as Report;
  } catch {
    return null;
  }
}

export function listReports(): Report[] {
  const dir = reportsDir();
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      try {
        return JSON.parse(readFileSync(join(dir, f), "utf-8")) as Report;
      } catch {
        return null;
      }
    })
    .filter((r): r is Report => r !== null)
    .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
}

export function deleteReport(id: string): boolean {
  const file = join(reportsDir(), `${id}.json`);
  if (!existsSync(file)) return false;
  unlinkSync(file);
  return true;
}
