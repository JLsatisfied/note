<script setup lang="ts">
import dayjs from "dayjs";
import type { GitCommit } from "@shared/types";

defineProps<{ commits: GitCommit[] }>();

function repoName(path: string): string {
  const parts = path.replace(/[\\/]+$/, "").split(/[\\/]/);
  return parts[parts.length - 1] || path;
}

function formatTime(iso: string): string {
  return dayjs(iso).format("MM-DD HH:mm");
}
</script>

<template>
  <el-table :data="commits" size="small" max-height="520" border>
    <el-table-column label="仓库" width="110">
      <template #default="{ row }">{{ repoName(row.repo) }}</template>
    </el-table-column>
    <el-table-column label="分支" width="110">
      <template #default="{ row }">
        <el-tag v-if="row.branch" size="small" type="info" disable-transitions>
          {{ row.branch }}
        </el-tag>
        <span v-else>—</span>
      </template>
    </el-table-column>
    <el-table-column label="时间" width="100">
      <template #default="{ row }">{{ formatTime(row.date) }}</template>
    </el-table-column>
    <el-table-column prop="author" label="作者" width="100" />
    <el-table-column label="提交说明" min-width="200">
      <template #default="{ row }">
        <el-tooltip
          :content="row.subject"
          placement="top"
          :show-after="200"
          :disabled="!row.subject"
        >
          <span class="subject-cell">{{ row.subject }}</span>
        </el-tooltip>
      </template>
    </el-table-column>
  </el-table>
</template>

<style scoped>
.subject-cell {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
