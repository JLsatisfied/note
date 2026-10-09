<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { ArrowDown } from "@element-plus/icons-vue";
import dayjs from "dayjs";
import type {
  AuthorInfo,
  GitCommit,
  Report,
  ReportSection,
  ReportType
} from "@shared/types";
import { useSettingsStore } from "@/stores/settings";
import { buildDailySections, buildWeeklySections, toPlain } from "@/utils/report";
import CommitTable from "./CommitTable.vue";
import ReportEditor from "./ReportEditor.vue";

type ExportKind = "markdown" | "html" | "pdf";
type CopyKind = "markdown" | "plain";

const props = defineProps<{ type: ReportType }>();

const route = useRoute();
const router = useRouter();
const settingsStore = useSettingsStore();

const selectedRepos = ref<string[]>([]);
const date = ref<string>("");
const author = ref<string>("");
const branch = ref<string>("");
const authors = ref<AuthorInfo[]>([]);
const branches = ref<string[]>([]);

const commits = ref<GitCommit[]>([]);
const sections = ref<ReportSection[]>([]);
const reportId = ref<string | null>(null);

const loading = ref(false);
const saving = ref(false);

const repos = computed(() => settingsStore.repos);
const isDaily = computed(() => props.type === "daily");

const weekRangeText = computed(() => {
  if (!date.value) return "";
  const start = dayjs(date.value).startOf("week").format("YYYY-MM-DD");
  const end = dayjs(date.value).endOf("week").format("YYYY-MM-DD");
  return `${start} ~ ${end}`;
});

function computeRange(): { since: string; until: string } {
  if (isDaily.value) {
    return {
      since: `${date.value} 00:00:00`,
      until: `${date.value} 23:59:59`
    };
  }
  const start = dayjs(date.value).startOf("week");
  const end = dayjs(date.value).endOf("week");
  return {
    since: start.format("YYYY-MM-DD 00:00:00"),
    until: end.format("YYYY-MM-DD 23:59:59")
  };
}

function currentReport(): Report {
  return {
    id: reportId.value ?? "",
    type: props.type,
    date: isDaily.value
      ? date.value
      : dayjs(date.value).startOf("week").format("YYYY-MM-DD"),
    sections: toPlain(sections.value),
    commits: toPlain(commits.value),
    createdAt: "",
    updatedAt: ""
  };
}

async function loadAuthors() {
  if (!selectedRepos.value.length) {
    authors.value = [];
    return;
  }
  const { since, until } = computeRange();
  authors.value = await window.api.git.listAuthors({
    repos: toPlain(selectedRepos.value),
    since,
    until
  });
}

async function loadBranches() {
  if (!selectedRepos.value.length) {
    branches.value = [];
    branch.value = "";
    return;
  }
  branches.value = await window.api.git.listBranches(
    toPlain(selectedRepos.value)
  );
}

async function onReposChange() {
  author.value = "";
  branch.value = "";
  await Promise.all([loadAuthors(), loadBranches()]);
}

async function generate() {
  if (!selectedRepos.value.length) {
    ElMessage.warning("请先选择仓库");
    return;
  }
  if (!date.value) {
    ElMessage.warning("请选择日期");
    return;
  }
  loading.value = true;
  try {
    const { since, until } = computeRange();
    commits.value = await window.api.git.listCommits({
      repos: toPlain(selectedRepos.value),
      since,
      until,
      author: author.value || undefined,
      branch: branch.value || undefined,
      includeMerges: settingsStore.includeMerges
    });
    sections.value = isDaily.value
      ? buildDailySections(commits.value)
      : buildWeeklySections(commits.value);
    if (!commits.value.length) ElMessage.info("该时间段内没有找到提交记录");
  } catch (e) {
    ElMessage.error(`读取提交失败：${(e as Error).message}`);
  } finally {
    loading.value = false;
  }
}

async function save() {
  saving.value = true;
  try {
    const saved = await window.api.report.save(currentReport());
    reportId.value = saved.id;
    await router.replace({ query: { ...route.query, id: saved.id } });
    ElMessage.success("已保存");
  } catch (e) {
    ElMessage.error(`保存失败：${(e as Error).message}`);
  } finally {
    saving.value = false;
  }
}

async function handleExport(cmd: ExportKind) {
  try {
    const result = await window.api.export[cmd](currentReport());
    if (result.saved && result.path) {
      try {
        await ElMessageBox.confirm("导出成功，是否打开所在文件夹？", "提示", {
          confirmButtonText: "打开",
          cancelButtonText: "关闭",
          type: "success"
        });
        const sep = result.path.includes("\\") ? "\\" : "/";
        const dir = result.path.slice(0, result.path.lastIndexOf(sep));
        await window.api.shell.openPath(dir);
      } catch {
        /* 用户选择关闭 */
      }
    }
  } catch (e) {
    ElMessage.error(`导出失败：${(e as Error).message}`);
  }
}

async function handleCopy(cmd: CopyKind) {
  try {
    await window.api.copy[cmd](currentReport());
    ElMessage.success(cmd === "markdown" ? "已复制 Markdown" : "已复制纯文本");
  } catch (e) {
    console.error("[copy] 复制失败", e);
    ElMessage.error(`复制失败：${(e as Error).message}`);
  }
}

onMounted(async () => {
  if (!settingsStore.loaded) await settingsStore.load();
  date.value = isDaily.value
    ? dayjs().format("YYYY-MM-DD")
    : dayjs().startOf("week").format("YYYY-MM-DD");

  const id = route.query.id as string | undefined;
  if (id) {
    const r = await window.api.report.load(id);
    if (r) {
      reportId.value = r.id;
      date.value = r.date;
      commits.value = r.commits ?? [];
      sections.value = r.sections ?? [];
      selectedRepos.value = Array.from(
        new Set((r.commits ?? []).map((c) => c.repo))
      );
      await Promise.all([loadAuthors(), loadBranches()]);
    }
  }
});
</script>

<template>
  <div class="report-generator">
    <el-card shadow="never" class="filter-card">
      <div class="filters">
        <div class="filter-item">
          <span class="label">仓库</span>
          <el-select
            v-model="selectedRepos"
            multiple
            filterable
            collapse-tags
            placeholder="选择仓库"
            style="width: 300px"
            @change="onReposChange"
          >
            <el-option v-for="r in repos" :key="r.path" :label="r.name" :value="r.path" />
          </el-select>
        </div>

        <div class="filter-item">
          <span class="label">日期</span>
          <el-date-picker
            v-if="isDaily"
            v-model="date"
            type="date"
            value-format="YYYY-MM-DD"
            style="width: 150px"
          />
          <template v-else>
            <el-date-picker
              v-model="date"
              type="week"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              style="width: 150px"
            />
            <span class="week-range">{{ weekRangeText }}</span>
          </template>
        </div>

        <div class="filter-item">
          <span class="label">作者</span>
          <el-select
            v-model="author"
            clearable
            filterable
            placeholder="全部"
            style="width: 180px"
          >
            <el-option
              v-for="a in authors"
              :key="a.email"
              :label="`${a.name} <${a.email}>`"
              :value="a.email"
            />
          </el-select>
        </div>

        <div v-if="selectedRepos.length" class="filter-item">
          <span class="label">分支</span>
          <el-select
            v-model="branch"
            clearable
            filterable
            placeholder="全部分支"
            style="width: 160px"
          >
            <el-option v-for="b in branches" :key="b" :label="b" :value="b" />
          </el-select>
        </div>

        <el-button type="primary" :loading="loading" @click="generate">
          {{ isDaily ? "生成日报" : "生成周报" }}
        </el-button>
      </div>

      <div v-if="!repos.length" class="empty-hint">
        尚未配置 Git 仓库，请先到
        <router-link to="/settings">设置</router-link>
        添加仓库。
      </div>
    </el-card>

    <div v-if="commits.length || sections.length" class="content">
      <el-row :gutter="16">
        <el-col :span="10">
          <CommitTable :commits="commits" />
        </el-col>
        <el-col :span="14">
          <ReportEditor v-model="sections" />
        </el-col>
      </el-row>

      <div class="actions">
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
        <el-dropdown trigger="click" @command="handleCopy">
          <el-button type="primary" plain>
            复制
            <el-icon class="el-icon--right"><ArrowDown /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="markdown">复制 Markdown</el-dropdown-item>
              <el-dropdown-item command="plain">复制纯文本</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-dropdown trigger="click" @command="handleExport">
          <el-button type="success">
            导出
            <el-icon class="el-icon--right"><ArrowDown /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="markdown">Markdown (.md)</el-dropdown-item>
              <el-dropdown-item command="html">HTML (.html)</el-dropdown-item>
              <el-dropdown-item command="pdf">PDF (.pdf)</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>

    <el-empty v-else-if="!loading" description="选择仓库和日期，点击生成报表" />
  </div>
</template>

<style scoped>
.filter-card {
  margin-bottom: 16px;
}

.filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.label {
  font-size: 14px;
  color: #606266;
  white-space: nowrap;
}

.week-range {
  font-size: 13px;
  color: #909399;
  white-space: nowrap;
}

.empty-hint {
  margin-top: 12px;
  font-size: 13px;
  color: #909399;
}

.content {
  margin-top: 16px;
}

.actions {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}
</style>
