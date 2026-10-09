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

/** 上次用过的筛选条件，日报/周报各记一份 */
export interface FilterMemory {
  repos: string[];
  /** 日报为当天，周报为周一 */
  date: string;
  /**
   * 作者邮箱。
   * - 缺省（undefined）：用户没改过，下次用设置里的「默认作者」
   * - null：用户显式选了「全部」，不要再套默认作者
   * - 字符串：用户自己选的作者
   */
  author?: string | null;
  /** 空串表示「全部分支」 */
  branch: string;
}

export interface Settings {
  repos: RepoConfig[];
  defaultAuthor: string;
  includeMerges: boolean;
  lastFilter: Partial<Record<ReportType, FilterMemory>>;
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
