import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type {
  AuthorInfo,
  GitCommit,
  ListCommitsQuery
} from "../../shared/types";

const execFileAsync = promisify(execFile);

/** 字段分隔符：ASCII Unit Separator，提交信息里几乎不会出现 */
const FIELD_SEP = "\x1f";

/**
 * 以统一参数执行 git，强制 UTF-8 输出，避免中文 Windows 下 commit 中文乱码。
 * 全部使用参数数组（不经过 shell），避免命令注入。
 */
async function runGit(repo: string, args: string[]): Promise<string> {
  const base = [
    "-c",
    "i18n.logOutputEncoding=utf-8",
    "-c",
    "core.quotepath=false",
    "-C",
    repo
  ];
  try {
    const { stdout } = await execFileAsync("git", [...base, ...args], {
      maxBuffer: 64 * 1024 * 1024,
      windowsHide: true
    });
    return stdout;
  } catch (err) {
    const e = err as { stderr?: string; message?: string };
    throw new Error(e.stderr || e.message || "git 命令执行失败");
  }
}

/** 把 --source 输出的 ref 名转成可读的分支名 */
function branchOf(source: string): string {
  if (!source) return "";
  return source
    .replace(/^refs\/heads\//, "")
    .replace(/^refs\/remotes\//, "")
    .replace(/^refs\/tags\//, "tag: ");
}

export function validateRepo(path: string): {
  valid: boolean;
  isGit?: boolean;
  error?: string;
} {
  if (!path || !path.trim()) return { valid: false, error: "路径为空" };
  try {
    if (!existsSync(join(path, ".git"))) {
      return { valid: false, isGit: false, error: "该目录不是 Git 仓库（缺少 .git）" };
    }
    return { valid: true, isGit: true };
  } catch {
    return { valid: false, error: "路径不可访问" };
  }
}

export async function listCommits(query: ListCommitsQuery): Promise<GitCommit[]> {
  const commits: GitCommit[] = [];
  const args = ["log"];
  if (!query.includeMerges) args.push("--no-merges");
  if (query.branch) args.push(query.branch);
  else args.push("--all");
  if (query.since) args.push(`--since=${query.since}`);
  if (query.until) args.push(`--until=${query.until}`);
  if (query.author) args.push(`--author=${query.author}`);
  // --source 让每条提交都带上它所属的 ref（%S），从而知道提交属于哪个分支
  args.push("--source");
  args.push("--date=iso-strict");
  args.push(
    `--pretty=format:%H${FIELD_SEP}%an${FIELD_SEP}%ae${FIELD_SEP}%ad${FIELD_SEP}%s${FIELD_SEP}%D${FIELD_SEP}%S`
  );

  for (const repo of query.repos) {
    let out: string;
    try {
      out = await runGit(repo, args);
    } catch {
      continue; // 单个仓库失败不影响其它仓库
    }
    if (!out.trim()) continue;
    for (const line of out.split("\n")) {
      if (!line.trim()) continue;
      const [hash, author, email, date, subject, refsRaw, sourceRaw] =
        line.split(FIELD_SEP);
      commits.push({
        hash: hash ?? "",
        author: author ?? "",
        email: email ?? "",
        date: date ?? "",
        subject: subject ?? "",
        refs: refsRaw
          ? refsRaw.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        branch: branchOf(sourceRaw ?? ""),
        repo
      });
    }
  }
  return commits;
}

/** 汇总多个仓库的本地分支名（去重排序），用于多选仓库时也能按分支筛选 */
export async function listBranches(repos: string[]): Promise<string[]> {
  const set = new Set<string>();
  for (const repo of repos) {
    let out: string;
    try {
      out = await runGit(repo, [
        "for-each-ref",
        "--format=%(refname:short)",
        "refs/heads"
      ]);
    } catch {
      continue; // 单个仓库失败不影响其它仓库
    }
    for (const line of out.split("\n")) {
      const name = line.trim();
      if (name) set.add(name);
    }
  }
  return Array.from(set).sort();
}

export async function listAuthors(query: {
  repos: string[];
  since?: string;
  until?: string;
}): Promise<AuthorInfo[]> {
  const map = new Map<string, AuthorInfo>();
  for (const repo of query.repos) {
    const args = ["shortlog", "-sne", "--all"];
    if (query.since) args.push(`--since=${query.since}`);
    if (query.until) args.push(`--until=${query.until}`);
    let out: string;
    try {
      out = await runGit(repo, args);
    } catch {
      continue;
    }
    for (const line of out.split("\n")) {
      const m = line.trim().match(/^\d+\s+(.+?)\s*<(.+?)>$/);
      if (m) map.set(m[2], { name: m[1], email: m[2] });
    }
  }
  return Array.from(map.values());
}
