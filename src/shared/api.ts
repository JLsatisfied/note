import type {
  AuthorInfo,
  GitCommit,
  ListCommitsQuery,
  Report,
  Settings
} from "./types";

export interface RepoValidateResult {
  valid: boolean;
  isGit?: boolean;
  error?: string;
}

export interface ExportResult {
  saved: boolean;
  path?: string;
  canceled?: boolean;
}

export interface OpenDirectoryResult {
  canceled: boolean;
  path: string | null;
}

export interface Api {
  git: {
    validateRepo: (path: string) => Promise<RepoValidateResult>;
    listCommits: (query: ListCommitsQuery) => Promise<GitCommit[]>;
    listBranches: (repos: string[]) => Promise<string[]>;
    listAuthors: (query: {
      repos: string[];
      since?: string;
      until?: string;
    }) => Promise<AuthorInfo[]>;
  };
  settings: {
    get: () => Promise<Settings>;
    set: (settings: Settings) => Promise<Settings>;
  };
  report: {
    save: (report: Report) => Promise<Report>;
    load: (id: string) => Promise<Report | null>;
    list: () => Promise<Report[]>;
    remove: (id: string) => Promise<boolean>;
  };
  export: {
    markdown: (report: Report) => Promise<ExportResult>;
    html: (report: Report) => Promise<ExportResult>;
    pdf: (report: Report) => Promise<ExportResult>;
  };
  /** 复制到系统剪贴板，返回是否成功 */
  copy: {
    markdown: (report: Report) => Promise<boolean>;
    plain: (report: Report) => Promise<boolean>;
  };
  dialog: {
    openDirectory: () => Promise<OpenDirectoryResult>;
  };
  shell: {
    openPath: (path: string) => Promise<string>;
  };
}
