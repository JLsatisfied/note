<script setup lang="ts">
import { ref } from "vue";
import { ArrowDown, ArrowUp, Delete, Plus } from "@element-plus/icons-vue";
import { marked } from "marked";
import type { ReportSection } from "@shared/types";

const sections = defineModel<ReportSection[]>({ required: true });
const preview = ref(false);

let seq = 0;

function addSection() {
  sections.value.push({
    id: `sec-${Date.now()}-${seq++}`,
    title: "新段落",
    content: ""
  });
}

function removeSection(index: number) {
  sections.value.splice(index, 1);
}

function move(index: number, delta: number) {
  const target = index + delta;
  if (target < 0 || target >= sections.value.length) return;
  const arr = sections.value;
  const [item] = arr.splice(index, 1);
  arr.splice(target, 0, item);
}

function renderMarkdown(content: string): string {
  return marked.parse(content || "") as string;
}
</script>

<template>
  <div class="report-editor">
    <div class="editor-header">
      <span class="editor-title">报表内容（可编辑）</span>
      <el-switch v-model="preview" active-text="预览" inactive-text="编辑" />
      <el-button size="small" type="primary" plain :icon="Plus" @click="addSection">
        添加段落
      </el-button>
    </div>

    <div v-for="(s, i) in sections" :key="s.id" class="section-card">
      <div class="section-top">
        <el-input v-model="s.title" class="title-input" placeholder="段落标题" />
        <div class="section-ops">
          <el-button size="small" text :icon="ArrowUp" :disabled="i === 0" @click="move(i, -1)" />
          <el-button
            size="small"
            text
            :icon="ArrowDown"
            :disabled="i === sections.length - 1"
            @click="move(i, 1)"
          />
          <el-button size="small" text type="danger" :icon="Delete" @click="removeSection(i)" />
        </div>
      </div>
      <div v-if="preview" class="preview" v-html="renderMarkdown(s.content)" />
      <el-input
        v-else
        v-model="s.content"
        type="textarea"
        :autosize="{ minRows: 4, maxRows: 16 }"
        placeholder="支持 Markdown 语法"
      />
    </div>
  </div>
</template>

<style scoped>
.editor-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.editor-title {
  font-size: 15px;
  font-weight: 600;
  margin-right: auto;
}

.section-card {
  margin-bottom: 14px;
  padding: 12px;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  background: #fff;
}

.section-top {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.title-input {
  flex: 1;
}

.section-ops {
  display: flex;
  gap: 2px;
}

.preview {
  padding: 12px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  background: #fafafa;
  line-height: 1.7;
}

.preview :deep(h2) {
  font-size: 17px;
  margin: 6px 0;
}

.preview :deep(h3) {
  font-size: 15px;
  margin: 10px 0 4px;
}

.preview :deep(h4) {
  font-size: 14px;
  margin: 8px 0 2px;
  color: #606266;
}

.preview :deep(h5) {
  font-size: 13px;
  margin: 6px 0 2px;
  color: #909399;
  font-weight: 600;
}

.preview :deep(ul) {
  padding-left: 20px;
}

.preview :deep(li) {
  margin: 3px 0;
}

.preview :deep(code) {
  padding: 1px 5px;
  border-radius: 3px;
  background: #f5f7fa;
}
</style>
