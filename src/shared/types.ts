export interface GitCommit {
  hash: string;
  author: string;
  email: string;
  date: string; // ISO 时间
  subject: string;
  refs: string[]; // 关联分支 / tag
  branch: string; // 提交所属分支（git log --source 的 %S）
  repo: string; // 仓库路径
}

export interface RepoConfig {
  path: string;
  name: string;
  alias?: string;
}

export interface ReportSection {
  id: string;
  title: string;
  content: string; // markdown
}

export type ReportType = "daily" | "weekly";

export interface Report {
  id: string;
  type: ReportType;
  date: string; // 日报：YYYY-MM-DD；周报：周一的 YYYY-MM-DD
  sections: ReportSection[];
  commits: GitCommit[];
  createdAt: string;
  updatedAt: string;
}

export interface Settings {
  repos: RepoConfig[];
  defaultAuthor: string;
  includeMerges: boolean;
}

export interface ListCommitsQuery {
  repos: string[];
  since?: string;
  until?: string;
  author?: string;
  branch?: string;
  includeMerges?: boolean;
}

export interface AuthorInfo {
  name: string;
  email: string;
}
