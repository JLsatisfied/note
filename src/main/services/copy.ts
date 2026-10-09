import { clipboard } from "electron";
import { reportToMarkdown } from "./export";
import type { Report } from "../../shared/types";

/** 去掉行内标记：加粗 / 斜体 / 行内代码 / 链接 */
function stripInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/(^|[^*])\*(?!\s)([^*]+?)(?<!\s)\*/g, "$1$2")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")
    .trim();
}

/**
 * 把 Markdown 退化成纯文本。
 *
 * 给微信 / 钉钉这类不支持 Markdown 的地方用：去掉标记符号，同时把标题层级
 * 转成缩进，粘过去仍然看得出「仓库 → 分支 → 提交」的层次。
 */
function markdownToPlainText(md: string): string {
  const out: string[] = [];
  let indent = 0; // 当前标题所处层级，列表按它缩进对齐
  let skipBlank = false; // 刚输出过标题，紧跟着的空行丢掉，免得段落太散
  const pad = (n: number) => "  ".repeat(n);
  const push = (line: string) => {
    out.push(line);
    skipBlank = false;
  };

  for (const raw of md.replace(/\r\n/g, "\n").split("\n")) {
    const heading = raw.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length;
      const text = stripInline(heading[2]);
      if (level <= 2) {
        // 一/二级标题变成【】包起来的段落标题
        indent = 0;
        if (out.length && out[out.length - 1] !== "") out.push("");
        push(`【${text}】`);
      } else {
        // 三级及以下（日期 / 仓库 / 分支）按层级缩进
        indent = level - 3;
        push(pad(indent) + text);
      }
      skipBlank = true;
      continue;
    }

    const quote = raw.match(/^\s*>\s?(.*)$/);
    if (quote) {
      if (quote[1].trim()) push(stripInline(quote[1]));
      continue;
    }

    // 也匹配「-」这种只有符号、内容留空的占位项
    const bullet = raw.match(/^(\s*)[-*+](?:\s+(.*))?$/);
    if (bullet) {
      // 列表符号换成间隔号，缩进跟当前标题对齐
      const extra = Math.floor(bullet[1].length / 2);
      push(`${pad(indent + extra)}· ${stripInline(bullet[2] ?? "")}`);
      continue;
    }

    if (!raw.trim()) {
      if (!skipBlank) push("");
      continue;
    }
    push(stripInline(raw));
  }

  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** 复制为 Markdown（带 # 标题，粘到飞书/语雀等地方会保留格式） */
export function copyMarkdown(report: Report): boolean {
  clipboard.writeText(reportToMarkdown(report));
  return true;
}

/** 复制为纯文本（去掉标记，粘到微信/钉钉不会出现一堆符号） */
export function copyPlainText(report: Report): boolean {
  clipboard.writeText(markdownToPlainText(reportToMarkdown(report)));
  return true;
}
