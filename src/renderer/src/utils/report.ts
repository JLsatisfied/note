import dayjs from "dayjs";
import type { GitCommit, ReportSection } from "@shared/types";

export { toPlain } from "./plain";

const TYPE_LABELS: Record<string, string> = {
  feat: "新功能",
  fix: "修复",
  refactor: "重构",
  perf: "性能优化",
  docs: "文档",
  style: "样式",
  test: "测试",
  chore: "杂项",
  build: "构建",
  ci: "CI",
  revert: "回退"
};

/** 解析 Conventional Commits 前缀，返回类型与中文标签 */
export function classifyCommit(subject: string): { type: string; label: string } {
  const m = subject.match(/^(\w+)(\([^)]*\))?!?:\s*/);
  if (!m) return { type: "", label: "" };
  const t = m[1].toLowerCase();
  return { type: t, label: TYPE_LABELS[t] ?? "" };
}

function repoName(path: string): string {
  const parts = path.replace(/[\\/]+$/, "").split(/[\\/]/);
  return parts[parts.length - 1] || path;
}

function formatCommitLine(c: GitCommit): string {
  const { label } = classifyCommit(c.subject);
  const tag = label ? `【${label}】` : "";
  return `- ${tag}${c.subject}`;
}

function groupCommitsByRepo(
  commits: GitCommit[]
): Map<string, GitCommit[]> {
  const map = new Map<string, GitCommit[]>();
  for (const c of commits) {
    const list = map.get(c.repo) ?? [];
    list.push(c);
    map.set(c.repo, list);
  }
  return map;
}

export function groupCommitsByDay(
  commits: GitCommit[]
): Map<string, GitCommit[]> {
  const map = new Map<string, GitCommit[]>();
  for (const c of commits) {
    const day = dayjs(c.date).format("YYYY-MM-DD");
    const list = map.get(day) ?? [];
    list.push(c);
    map.set(day, list);
  }
  return map;
}

function groupCommitsByBranch(
  commits: GitCommit[]
): Map<string, GitCommit[]> {
  const map = new Map<string, GitCommit[]>();
  for (const c of commits) {
    const key = c.branch || "未标注分支";
    const list = map.get(key) ?? [];
    list.push(c);
    map.set(key, list);
  }
  return map;
}

/** 将一组提交按「仓库 → 分支」分组渲染成 markdown 列表 */
function renderCommitGroups(commits: GitCommit[]): string {
  const byRepo = groupCommitsByRepo(commits);
  const lines: string[] = [];
  for (const [repo, list] of byRepo) {
    lines.push(`#### ${repoName(repo)}`);
    for (const [branch, branchCommits] of groupCommitsByBranch(list)) {
      lines.push(`##### ${branch}`);
      for (const c of branchCommits) lines.push(formatCommitLine(c));
    }
    lines.push("");
  }
  return lines.join("\n").trim();
}

/**
 * 生成「统计摘要」段落：领导看日报/周报第一眼想知道的就是工作量有多大。
 * 纯本地计算，数据全部来自提交列表本身。
 */
export function buildSummary(
  commits: GitCommit[],
  type: "daily" | "weekly"
): string {
  if (!commits.length) return "- 本周期内没有提交记录";

  const repos = new Set(commits.map((c) => c.repo));
  const branches = new Set(commits.map((c) => c.branch).filter(Boolean));
  const days = Array.from(new Set(commits.map((c) => dayjs(c.date).format("YYYY-MM-DD")))).sort();
  const authors = new Set(commits.map((c) => c.author));

  // 类型分布：无法识别前缀的归入「其他」
  const byType = new Map<string, number>();
  for (const c of commits) {
    const { label } = classifyCommit(c.subject);
    const key = label || "其他";
    byType.set(key, (byType.get(key) ?? 0) + 1);
  }

  const scope = type === "daily" ? "本日" : "本周";
  const lines: string[] = [
    `- ${scope}共提交 **${commits.length}** 次，涉及 **${repos.size}** 个仓库、**${branches.size}** 个分支`
  ];

  if (authors.size > 1) lines.push(`- 参与人 **${authors.size}** 位：${Array.from(authors).join("、")}`);
  if (type === "weekly") {
    const range = days.length > 1 ? `${days[0]} ~ ${days[days.length - 1]}` : days[0];
    lines.push(`- 活跃 **${days.length}** 天（${range}）`);
  }
  if (byType.size) {
    const dist = Array.from(byType.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k} ${v}`)
      .join("、");
    lines.push(`- 类型分布：${dist}`);
  }
  return lines.join("\n");
}

function riskCommits(commits: GitCommit[]): GitCommit[] {
  return commits.filter((c) => {
    const t = classifyCommit(c.subject).type;
    return t === "fix" || t === "revert";
  });
}

export function buildDailySections(commits: GitCommit[]): ReportSection[] {
  const risk = riskCommits(commits);
  return [
    {
      id: "summary",
      title: "统计摘要",
      content: buildSummary(commits, "daily")
    },
    {
      id: "done",
      title: "今日完成",
      content: commits.length ? renderCommitGroups(commits) : "- "
    },
    { id: "plan", title: "明日计划", content: "- " },
    {
      id: "risk",
      title: "问题与风险",
      content: risk.length ? renderCommitGroups(risk) : "- "
    }
  ];
}

export function buildWeeklySections(commits: GitCommit[]): ReportSection[] {
  const byDay = groupCommitsByDay(commits);
  const days = Array.from(byDay.keys()).sort();
  const lines: string[] = [];
  for (const day of days) {
    const dayCommits = byDay.get(day) ?? [];
    lines.push(`### ${dayjs(day).format("MM-DD dddd")}`);
    lines.push(renderCommitGroups(dayCommits));
    lines.push("");
  }
  const risk = riskCommits(commits);
  return [
    {
      id: "summary",
      title: "统计摘要",
      content: buildSummary(commits, "weekly")
    },
    {
      id: "done",
      title: "本周完成",
      content: lines.length ? lines.join("\n").trim() : "- "
    },
    { id: "plan", title: "下周计划", content: "- " },
    {
      id: "risk",
      title: "问题与风险",
      content: risk.length ? renderCommitGroups(risk) : "- "
    }
  ];
}
