<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { Delete, Refresh, View } from "@element-plus/icons-vue";
import dayjs from "dayjs";
import type { Report } from "@shared/types";
import { toPlain } from "@/utils/report";

type ExportKind = "markdown" | "html" | "pdf";
type CopyKind = "markdown" | "plain";

const router = useRouter();
const reports = ref<Report[]>([]);
const loading = ref(false);

async function load() {
  loading.value = true;
  reports.value = await window.api.report.list();
  loading.value = false;
}

function typeText(type: string): string {
  return type === "daily" ? "日报" : "周报";
}

function typeTag(type: string): "success" | "primary" {
  return type === "daily" ? "success" : "primary";
}

function dateText(r: Report): string {
  if (r.type === "daily") return r.date;
  return `${r.date} ~ ${dayjs(r.date).add(6, "day").format("YYYY-MM-DD")}`;
}

function open(r: Report) {
  router.push({ path: `/${r.type}`, query: { id: r.id } });
}

async function handleExport(r: Report, cmd: ExportKind) {
  try {
    // r 是表格行，属于 Vue 响应式 Proxy，必须先转纯数据再走 IPC
    const result = await window.api.export[cmd](toPlain(r));
    if (result.saved && result.path) ElMessage.success("导出成功");
  } catch (e) {
    console.error("[export] 导出失败", e);
    ElMessage.error(`导出失败：${(e as Error).message}`);
  }
}

async function handleCopy(r: Report, cmd: CopyKind) {
  try {
    // 同上：表格行是响应式 Proxy，先转纯数据
    await window.api.copy[cmd](toPlain(r));
    ElMessage.success(cmd === "markdown" ? "已复制 Markdown" : "已复制纯文本");
  } catch (e) {
    console.error("[copy] 复制失败", e);
    ElMessage.error(`复制失败：${(e as Error).message}`);
  }
}

async function remove(r: Report) {
  try {
    await ElMessageBox.confirm(
      `确定删除「${dateText(r)}」的${typeText(r.type)}吗？`,
      "提示",
      { type: "warning" }
    );
  } catch {
    return;
  }
  await window.api.report.remove(r.id);
  ElMessage.success("已删除");
  await load();
}

onMounted(load);
</script>

<template>
  <el-card shadow="never">
    <template #header>
      <div class="header">
        <span class="title">历史报表</span>
        <el-button size="small" :icon="Refresh" circle @click="load" />
      </div>
    </template>

    <el-table v-loading="loading" :data="reports" border>
      <el-table-column label="类型" width="90">
        <template #default="{ row }">
          <el-tag :type="typeTag(row.type)" size="small">{{ typeText(row.type) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="日期" width="240">
        <template #default="{ row }">{{ dateText(row) }}</template>
      </el-table-column>
      <el-table-column label="提交数" width="90">
        <template #default="{ row }">{{ row.commits?.length ?? 0 }}</template>
      </el-table-column>
      <el-table-column label="更新时间" min-width="160">
        <template #default="{ row }">
          {{ dayjs(row.updatedAt).format("YYYY-MM-DD HH:mm") }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="280" fixed="right">
        <template #default="{ row }">
          <el-button size="small" type="primary" text :icon="View" @click="open(row)">
            打开
          </el-button>
          <el-dropdown trigger="click" @command="(c: CopyKind) => handleCopy(row, c)">
            <el-button size="small" type="warning" text>复制</el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="markdown">复制 Markdown</el-dropdown-item>
                <el-dropdown-item command="plain">复制纯文本</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <el-dropdown trigger="click" @command="(c: ExportKind) => handleExport(row, c)">
            <el-button size="small" type="success" text>导出</el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="markdown">Markdown</el-dropdown-item>
                <el-dropdown-item command="html">HTML</el-dropdown-item>
                <el-dropdown-item command="pdf">PDF</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <el-button size="small" type="danger" text :icon="Delete" @click="remove(row)">
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-empty v-if="!loading && !reports.length" description="暂无历史报表" />
  </el-card>
</template>

<style scoped>
.header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.title {
  font-size: 16px;
  font-weight: 600;
  margin-right: auto;
}
</style>
