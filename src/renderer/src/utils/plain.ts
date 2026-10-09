/**
 * 深拷贝成纯 JSON 数据，去掉 Vue 响应式 Proxy。
 *
 * Electron IPC 使用 V8 序列化器，无法克隆 Proxy，会抛
 * "could not be cloned"。凡是渲染进程里来自 ref/reactive 的数据，
 * 传给 window.api.* 之前都要先过一遍这里。
 */
export function toPlain<T>(value: T): T {
  if (value === null || typeof value !== "object") return value;
  return JSON.parse(JSON.stringify(value)) as T;
}
