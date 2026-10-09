<script setup lang="ts">
import { onMounted, ref } from "vue";
import { ElMessage } from "element-plus";
import { Delete, Plus } from "@element-plus/icons-vue";
import { useSettingsStore } from "@/stores/settings";

const store = useSettingsStore();
const defaultAuthor = ref("");
const includeMerges = ref(false);

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
</style>
