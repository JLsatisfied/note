<script setup lang="ts">
import { onMounted } from "vue";
import { useRoute } from "vue-router";
import { Calendar, Clock, Document, Setting } from "@element-plus/icons-vue";
import { useSettingsStore } from "@/stores/settings";

const route = useRoute();
const settingsStore = useSettingsStore();

onMounted(() => {
  settingsStore.load();
});
</script>

<template>
  <el-container class="app-shell">
    <el-aside width="200px" class="sidebar">
      <div class="brand">
        <span class="brand-icon">📝</span>
        <span class="brand-name">Note</span>
        <span class="brand-sub">工作汇报</span>
      </div>
      <el-menu :default-active="route.path" router class="menu">
        <el-menu-item index="/daily">
          <el-icon><Document /></el-icon><span>日报</span>
        </el-menu-item>
        <el-menu-item index="/weekly">
          <el-icon><Calendar /></el-icon><span>周报</span>
        </el-menu-item>
        <el-menu-item index="/history">
          <el-icon><Clock /></el-icon><span>历史记录</span>
        </el-menu-item>
        <el-menu-item index="/settings">
          <el-icon><Setting /></el-icon><span>设置</span>
        </el-menu-item>
      </el-menu>
    </el-aside>
    <el-main class="main">
      <router-view />
    </el-main>
  </el-container>
</template>

<style scoped>
.app-shell {
  height: 100%;
}

.sidebar {
  display: flex;
  flex-direction: column;
  border-right: 1px solid #e4e7ed;
}

.brand {
  display: flex;
  align-items: baseline;
  gap: 6px;
  padding: 20px 16px;
  border-bottom: 1px solid #f0f2f5;
}

.brand-icon {
  font-size: 20px;
}

.brand-name {
  font-size: 18px;
  font-weight: 700;
  color: #409eff;
}

.brand-sub {
  font-size: 12px;
  color: #909399;
}

.menu {
  flex: 1;
  border-right: none;
}

.main {
  overflow: auto;
  background: #f5f7fa;
  padding: 16px;
}
</style>
