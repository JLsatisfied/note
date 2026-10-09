import { acceptHMRUpdate, defineStore } from "pinia";
import type {
  FilterMemory,
  RepoConfig,
  ReportType,
  Settings
} from "@shared/types";
import { toPlain } from "@/utils/plain";

export const useSettingsStore = defineStore("settings", {
  state: () => ({
    settings: null as Settings | null,
    loaded: false
  }),
  getters: {
    repos: (s): RepoConfig[] => s.settings?.repos ?? [],
    defaultAuthor: (s): string => s.settings?.defaultAuthor ?? "",
    includeMerges: (s): boolean => s.settings?.includeMerges ?? false,
    lastFilter: (s): Partial<Record<ReportType, FilterMemory>> =>
      s.settings?.lastFilter ?? {}
  },
  actions: {
    async load() {
      this.settings = await window.api.settings.get();
      this.loaded = true;
    },
    // 注意：{...this.settings} 只是浅拷贝，repos 仍是响应式 Proxy，
    // 必须 toPlain 深拷贝后才能通过 IPC 序列化
    async addRepo(repo: RepoConfig) {
      const repos = [...(this.settings?.repos ?? []), repo];
      this.settings = await window.api.settings.set(
        toPlain({ ...this.settings!, repos })
      );
    },
    async removeRepo(path: string) {
      const repos = (this.settings?.repos ?? []).filter((r) => r.path !== path);
      this.settings = await window.api.settings.set(
        toPlain({ ...this.settings!, repos })
      );
    },
    async update(partial: Partial<Settings>) {
      this.settings = await window.api.settings.set(
        toPlain({ ...this.settings!, ...partial })
      );
    },
    /** 记住某个报表类型上次用的筛选条件 */
    async setFilter(type: ReportType, filter: FilterMemory) {
      const base = this.settings ?? (await window.api.settings.get());
      const lastFilter = { ...(base.lastFilter ?? {}), [type]: filter };
      this.settings = await window.api.settings.set(
        toPlain({ ...base, lastFilter })
      );
    }
  }
});

// 让 store 的 action 改动也能热更新；否则改了 action 必须重启才生效
if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useSettingsStore, import.meta.hot));
}
