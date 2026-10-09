# Note — Git 提交驱动的日报/周报桌面应用

基于 **Vue 3 + Electron + Element Plus + TypeScript** 的跨平台桌面应用，读取本地 Git 仓库提交记录，自动按日 / 按周汇总个人或团队工作内容，生成可编辑、可保存、可导出的工作日报与周报。

## 功能

- 自动读取本地 Git 仓库提交记录，按日 / 按周聚合
- 支持按 **仓库（多选）、日期 / 周、作者、分支** 筛选
- 按 Conventional Commits 前缀（feat/fix/refactor/…）归类，生成结构化草稿
- 可编辑分段报表（增删 / 排序 / 改标题，Markdown 编辑与预览）
- 本地保存与历史查询（存储于系统 `userData` 目录）
- 导出 **Markdown / HTML / PDF**（PDF 走 Electron 原生 `printToPDF`）
- 中文提交信息无乱码（强制 git UTF-8 输出）

## 技术栈

| 层 | 技术 |
|---|---|
| 桌面框架 | Electron 33 |
| 构建 | electron-vite 3 |
| 前端 | Vue 3 + Vue Router + Pinia |
| UI | Element Plus |
| 日期 | dayjs |
| 打包 | electron-builder（win:nsis / mac:dmg / linux:AppImage） |

## 运行

```bash
pnpm install      # 安装依赖（已配置 electron 国内镜像）
pnpm dev          # 开发模式（HMR）
pnpm build        # 构建产物到 out/
pnpm typecheck    # 类型检查
```

## 打包

```bash
pnpm build:win     # Windows 安装包
pnpm build:mac     # macOS DMG
pnpm build:linux   # Linux AppImage
```

打包产物输出到 `dist/`。

## 使用

1. 进入「设置」添加本地 Git 仓库目录（可添加多个）
2. 进入「日报 / 周报」选择仓库、日期 / 周、作者，点击生成
3. 编辑报表内容（支持 Markdown），保存
4. 在「历史记录」中查看、重新编辑、导出或删除
5. 导出为 Markdown / HTML / PDF

## 目录结构

```
src/
├─ main/        # Electron 主进程（git 读取 / 持久化 / 导出）
├─ preload/     # contextBridge 暴露 window.api
├─ shared/      # 主 / 渲染进程共享类型与 API 定义
└─ renderer/    # Vue 3 应用（视图 / 组件 / 状态 / 工具）
```

## 说明

- Git 读取依赖系统已安装 `git` 命令；提交信息强制以 UTF-8 读取，兼容中文 Windows。
- 报表与设置保存在 `app.getPath("userData")/note/` 下（`settings.json` 与 `reports/*.json`）。
- 若需取消 electron 国内镜像，删除根目录 `.npmrc` 即可。
