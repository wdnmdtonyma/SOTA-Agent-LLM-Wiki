---
id: uncertainty.surface.sessions.management
title: surface.sessions.management 不确定项
kind: reference
tier: T3
pkg: coding-agent
source:
  - packages/coding-agent/src/core/session-manager.ts
  - packages/coding-agent/docs/sessions.md
  - packages/coding-agent/src/cli/session-picker.ts
evidence: unknown
status: draft
updated: 5a073885
---

> 本 staging 记录本轮按 `docs/llm-wiki/pi/index.json` 的 source 核验 `surface.sessions.management` 后,仍不能用三源直接证明的事项。

## 未收敛项

- `[U]` CLI 参数互斥、`--session <path|id>` 的 path-vs-id 解析、全局匹配后是否 fork 到当前 cwd、以及 `--session-id` 形状校验都需要 `packages/coding-agent/src/main.ts` 与 `packages/coding-agent/src/cli/args.ts` 复核;这些文件不在本节点 index source 中。
- `[U]` slash command 到 handler 的完整 dispatch 表未在本节点三源中出现。`/resume`、`/tree`、`/fork`、`/clone` 的用户语义可由 `docs/sessions.md` 证明,但 handler 如何调用 runtime/source storage 需要 `interactive-mode.ts`、`agent-session.ts` 或 runtime 节点复核。
- `[U]` `SessionSelectorComponent` 内部的 threaded/recent/fuzzy 排序、active session 删除拦截、rename UI 和 `parentSessionPath` tree rendering 不在三源中;本节点只保留用户文档层 picker 能力与 `selectSession()` wrapper 行为。
- `[U]` RPC 模式里的 `clone()` / `fork()` wire 命令映射没有在本节点 index source 中出现,应由 `surface.modes.rpc` 或 `surface.modes.rpc-protocol` 覆盖。
- `[U]` `ref.coding-agent.session-format` 的完整 JSONL v3 schema、legacy migration 和所有 entry 类型仍应由 reference 节点补齐;本节点只核会话管理面直接触达的 header、`parentSession`、`session_info`、`branch_summary` 和 root-to-leaf context 投影。

## 本轮处理

- 将主节点 frontmatter `source` 与 `## Sources` 收敛为 index source: `session-manager.ts`、`docs/sessions.md`、`session-picker.ts`。
- 移除或降级所有指向 `args.ts`、`main.ts`、`interactive-mode.ts`、`agent-session-runtime.ts`、`agent-session.ts`、`session-selector.ts`、`docs/session-format.md` 的 `[E]`。
- `surface.sessions.management` 已置为 `status: verified`,表示剩余 `[E]` 均可在本节点 index source 内逐行核到。

## Sources

- packages/coding-agent/src/core/session-manager.ts
- packages/coding-agent/docs/sessions.md
- packages/coding-agent/src/cli/session-picker.ts
