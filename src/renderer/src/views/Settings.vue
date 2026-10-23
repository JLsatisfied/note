<script setup lang="ts">
import { onMounted, ref } from "vue";
import { ElMessage } from "element-plus";
import {
  ArrowDown,
  ArrowUp,
  Delete,
  Plus,
  RefreshLeft
} from "@element-plus/icons-vue";
import type {
  ReportType,
  SectionSource,
  SectionTemplate
} from "@shared/types";
import { useSettingsStore } from "@/stores/settings";
import { DEFAULT_TEMPLATES } from "@/utils/report";
import { toPlain } from "@/utils/plain";

const store = useSettingsStore();
const defaultAuthor = ref("");
const includeMerges = ref(false);

const SOURCE_OPTIONS: { value: SectionSource; label: string; hint: string }[] = [
  { value: "summary", label: "统计摘要", hint: "自动生成" },
  { value: "done", label: "提交列表", hint: "自动生成" },
  { value: "risk", label: "问题与风险", hint: "自动挑出 fix / revert" },
  { value: "static", label: "固定文本", hint: "生成时原样填入" }
];

const tplType = ref<ReportType>("daily");
// 编辑中的副本：保存前不碰 store，避免改一半就落盘
const editing = ref<Record<ReportType, SectionTemplate[]>>({
  daily: [],
  weekly: []
});

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

function seedTemplates() {
  for (const t of ["daily", "weekly"] as ReportType[]) {
    const saved = store.sectionTemplate[t];
    editing.value[t] = clone(saved?.length ? saved : DEFAULT_TEMPLATES[t]);
  }
}

function addSection() {
  editing.value[tplType.value].push({
    title: "新段落",
    source: "static",
    content: ""
  });
}

function removeSection(i: number) {
  editing.value[tplType.value].splice(i, 1);
}

function moveSection(i: number, delta: number) {
  const list = editing.value[tplType.value];
  const j = i + delta;
  if (j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
}

function resetTemplate() {
  editing.value[tplType.value] = clone(DEFAULT_TEMPLATES[tplType.value]);
}

async function saveTemplate() {
  const list = editing.value[tplType.value];
  if (!list.length) {
    ElMessage.warning("至少要留一个段落");
    return;
  }
  if (list.some((s) => !s.title.trim())) {
    ElMessage.warning("段落标题不能为空");
    return;
  }
  try {
    await store.setTemplate(tplType.value, toPlain(list));
    ElMessage.success("模板已保存");
  } catch (e) {
    console.error("[template] 保存失败", e);
    ElMessage.error(`保存失败：${(e as Error).message}`);
  }
}

function repoName(path: string): string {
  const parts = path.replace(/[\\/]+$/, "").split(/[\\/]/);
  return parts[parts.length - 1] || path;
}

async function addRepo() {
  const { canceled, path } = await window.api.dialog.openDirectory();
  if (canceled || !path) return;
  const v = await window.api.git.validateRepo(path);
  if (!v.valid) {
    ElMessage.error(v.error || "不是有效的 Git 仓库");
    return;
  }
  await store.addRepo({ path, name: repoName(path) });
  ElMessage.success("已添加仓库");
}

async function removeRepo(path: string) {
  await store.removeRepo(path);
  ElMessage.success("已移除");
}

async function save() {
  try {
    await store.update({
      defaultAuthor: defaultAuthor.value,
      includeMerges: includeMerges.value
    });
    ElMessage.success("已保存");
  } catch (e) {
    console.error("[settings] 保存失败", e);
    ElMessage.error(`保存失败：${(e as Error).message}`);
  }
}

onMounted(async () => {
  if (!store.loaded) await store.load();
  defaultAuthor.value = store.defaultAuthor;
  includeMerges.value = store.includeMerges;
  seedTemplates();
});
</script>

<template>
  <div class="settings">
    <el-card shadow="never">
      <template #header>
        <div class="header">
          <span class="title">Git 仓库</span>
          <el-button size="small" type="primary" :icon="Plus" @click="addRepo">
            添加仓库
          </el-button>
        </div>
      </template>

      <el-table v-if="store.repos.length" :data="store.repos" border>
        <el-table-column prop="name" label="名称" min-width="160" />
        <el-table-column prop="path" label="路径" min-width="320" show-overflow-tooltip />
        <el-table-column label="操作" width="90">
          <template #default="{ row }">
            <el-button
              size="small"
              type="danger"
              text
              :icon="Delete"
              @click="removeRepo(row.path)"
            >
              移除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-else description="尚未添加仓库，点击右上角「添加仓库」选择本地 Git 目录" />
    </el-card>

    <el-card shadow="never" class="card">
      <template #header>
        <span class="title">默认设置</span>
      </template>

      <el-form label-width="120px" style="max-width: 560px">
        <el-form-item label="默认作者">
          <el-input
            v-model="defaultAuthor"
            clearable
            placeholder="可选，填作者邮箱，如 zhangsan@example.com"
          />
          <div class="hint">
            生成日报/周报时，如果没手动选过作者，就默认用它过滤。
            填邮箱而不是姓名，才能和作者下拉框里的选项对上。
          </div>
        </el-form-item>
        <el-form-item label="包含合并提交">
          <el-switch v-model="includeMerges" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="save">保存设置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never" class="card">
      <template #header>
        <div class="header">
          <span class="title">报表模板</span>
          <el-button size="small" :icon="RefreshLeft" @click="resetTemplate">
            恢复默认
          </el-button>
        </div>
      </template>

      <el-tabs v-model="tplType" class="tpl-tabs">
        <el-tab-pane label="日报" name="daily" />
        <el-tab-pane label="周报" name="weekly" />
      </el-tabs>

      <div
        v-for="(sec, i) in editing[tplType]"
        :key="i"
        class="tpl-row"
      >
        <el-input v-model="sec.title" placeholder="段落标题" class="tpl-title" />
        <el-select v-model="sec.source" class="tpl-source">
          <el-option
            v-for="o in SOURCE_OPTIONS"
            :key="o.value"
            :label="o.label"
            :value="o.value"
          />
        </el-select>
        <el-input
          v-if="sec.source === 'static'"
          v-model="sec.content"
          placeholder="默认正文（Markdown），可留空"
          class="tpl-content"
        />
        <span v-else class="tpl-auto">内容自动生成</span>
        <el-button-group>
          <el-button
            size="small"
            :icon="ArrowUp"
            :disabled="i === 0"
            @click="moveSection(i, -1)"
          />
          <el-button
            size="small"
            :icon="ArrowDown"
            :disabled="i === editing[tplType].length - 1"
            @click="moveSection(i, 1)"
          />
          <el-button
            size="small"
            type="danger"
            :icon="Delete"
            @click="removeSection(i)"
          />
        </el-button-group>
      </div>

      <div class="tpl-foot">
        <el-button size="small" :icon="Plus" @click="addSection">添加段落</el-button>
        <el-button size="small" type="primary" @click="saveTemplate">
          保存模板
        </el-button>
      </div>

      <div class="hint">
        生成日报/周报时按这里的段落标题和顺序出草稿。改完记得点「保存模板」。
        同一个来源（比如「提交列表」）可以放多段，不会互相影响。
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.settings {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.header {
  display: flex;
  align-items: center;
}

.title {
  font-size: 16px;
  font-weight: 600;
  margin-right: auto;
}

.hint {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.6;
  color: #909399;
}

.tpl-tabs {
  margin-bottom: 4px;
}

.tpl-tabs :deep(.el-tabs__header) {
  margin-bottom: 8px;
}

.tpl-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.tpl-title {
  width: 180px;
  flex: none;
}

.tpl-source {
  width: 140px;
  flex: none;
}

.tpl-content {
  flex: 1;
}

.tpl-auto {
  flex: 1;
  font-size: 12px;
  color: #c0c4cc;
}

.tpl-foot {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}
</style>
