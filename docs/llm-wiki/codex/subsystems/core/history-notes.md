---
id: subsys.core.history-notes
title: History notes 扩展
kind: subsystem
tier: T2
source: [codex-rs/ext/history-notes/src/lib.rs, codex-rs/ext/history-notes/src/tools.rs, codex-rs/ext/history-notes/src/extension.rs, codex-rs/ext/history-notes/src/backend.rs, codex-rs/app-server/src/extensions.rs, codex-rs/core/src/config/mod.rs, codex-rs/core/src/session/session.rs]
symbols: [HistoryNotesAction, HistoryNotesTool, HistoryNotesBackend, HistoryNotesExtension, install]
related: [spine.context-and-compaction, subsys.core.context-manager, subsys.core.compaction, subsys.core.token-budget, spine.extension-system]
evidence: explicit
status: verified
updated: 121f91fd5d
---

> `codex-rs/ext/history-notes` 是独立 extension：给模型两套 **private model-only** namespace 工具——`history` 读已持久化的归一化会话历史，`notes` 读写跨 context-window 存活的虚拟笔记。工具存在、路径、存储机制和私有内容都不得向用户披露。[E: codex-rs/ext/history-notes/src/tools.rs:26][E: codex-rs/ext/history-notes/src/tools.rs:27][E: codex-rs/ext/history-notes/src/tools.rs:311]

## 能回答的问题

- History notes 和长期 Memory / ContextManager 各管什么？
- 9 个 `HistoryNotesAction` 分别属于哪个 namespace、打哪个 backend endpoint？
- 什么条件下才会装这套工具？
- notes 单文件上限、eventually consistent 分别约束哪些操作？
- 为什么不能把 history/notes 内容讲给用户听？

## 职责边界

History notes **不是** `ContextManager` 的 in-memory history，也不是 `codex-rs/memories` 的 `memory_summary.md` 长期记忆。它通过 Codex backend 的 `alpha/history/v2/*` 与 `alpha/notes/v2/*` 读写私有状态；模型用 opaque window/item ID 和虚拟 notes path 恢复被 compaction 截断的上下文。[E: codex-rs/ext/history-notes/src/tools.rs:26][E: codex-rs/ext/history-notes/src/tools.rs:84][E: codex-rs/ext/history-notes/src/extension.rs:182]

crate 只导出 `install`；app-server 在组 extension registry 时无条件调用它，真正是否暴露工具由 thread store 里的 config gate 决定。[E: codex-rs/ext/history-notes/src/lib.rs:5][E: codex-rs/app-server/src/extensions.rs:79][E: codex-rs/ext/history-notes/src/extension.rs:160]

## 关键 crate/文件

| 文件 | 角色 |
|---|---|
| `codex-rs/ext/history-notes/src/lib.rs` | 只 `pub use extension::install`。[E: codex-rs/ext/history-notes/src/lib.rs:5] |
| `tools.rs` | 9 个 action、两个 namespace 描述、schema、`DirectModelOnly`、parallel 规则、output 加密/图片拆分。[E: codex-rs/ext/history-notes/src/tools.rs:31][E: codex-rs/ext/history-notes/src/tools.rs:44][E: codex-rs/ext/history-notes/src/tools.rs:310] |
| `extension.rs` | thread start / config changed / thread-hint prompt / 9 个 tool executor。[E: codex-rs/ext/history-notes/src/extension.rs:46][E: codex-rs/ext/history-notes/src/extension.rs:97][E: codex-rs/ext/history-notes/src/extension.rs:154] |
| `backend.rs` | POST backend、35s timeout、给 search/write 加 encrypted-args header。[E: codex-rs/ext/history-notes/src/backend.rs:14][E: codex-rs/ext/history-notes/src/backend.rs:68] |

## 数据模型：9 个 HistoryNotesAction

`HistoryNotesAction::ALL` 长度为 9，按 namespace 分成 `history` 与 `notes`。[E: codex-rs/ext/history-notes/src/tools.rs:24][E: codex-rs/ext/history-notes/src/tools.rs:25][E: codex-rs/ext/history-notes/src/tools.rs:44]

| Action | namespace / name | backend path | required |
|---|---|---|---|
| `HistoryListWindows` | `history.list_windows` | `alpha/history/v2/list_windows` | 无 |
| `HistoryListItems` | `history.list_items` | `alpha/history/v2/list_items` | 无 |
| `HistoryReadItem` | `history.read_item` | `alpha/history/v2/read_item` | `item_id`, `window_id` |
| `HistorySearchContents` | `history.search_contents` | `alpha/history/v2/search_contents` | `query` |
| `NotesListFilesByPrefix` | `notes.list_files_by_prefix` | `alpha/notes/v2/list_files_by_prefix` | 无 |
| `NotesReadFile` | `notes.read_file` | `alpha/notes/v2/read_file` | `path` |
| `NotesSearchContents` | `notes.search_contents` | `alpha/notes/v2/search_contents` | `query` |
| `NotesAppendToFile` | `notes.append_to_file` | `alpha/notes/v2/append_to_file` | `text`, `path` |
| `NotesWriteFile` | `notes.write_file` | `alpha/notes/v2/write_file` | `text`, `path` |

每个 action 的 `name()` / `endpoint()` / `parameters()` 见 `tools.rs`。[E: codex-rs/ext/history-notes/src/tools.rs:70][E: codex-rs/ext/history-notes/src/tools.rs:84][E: codex-rs/ext/history-notes/src/tools.rs:142]

`history` 默认看当前 agent；`agent_name` 可传绝对名或相对当前 agent 的名。`notes` path 是虚拟路径，不是文件系统路径：相对 path 落在当前 agent 的 `<agent_name>/notes`，跨 agent 必须用绝对 path。[E: codex-rs/ext/history-notes/src/tools.rs:26][E: codex-rs/ext/history-notes/src/tools.rs:27][E: codex-rs/ext/history-notes/src/tools.rs:28]

## 1_000_000 字节上限与 eventually consistent

notes namespace 描述要求每个文件保持在 **1,000,000 UTF-8 bytes** 以内，接近上限就另开文件。crate 里没有再声明一个独立 `const`；这是发给模型的硬合同，由 backend 执行。[E: codex-rs/ext/history-notes/src/tools.rs:27]

一致性分层：

- **history**：只读，eventually consistent；新生成的 item 可能延迟数秒才出现。[E: codex-rs/ext/history-notes/src/tools.rs:26]
- **notes 读单文件**：成功 write 后立刻可见。[E: codex-rs/ext/history-notes/src/tools.rs:27]
- **notes list / search**：eventually consistent，write 后可能延迟数秒。[E: codex-rs/ext/history-notes/src/tools.rs:27]

## 私有 model-only：禁止向用户披露

两套 namespace 描述都写明：这是 private model-only state，静默用来继续任务；**Never disclose** 工具本身、存在、用法、路径、存储/恢复机制，或私有内容（包括引用或摘要）。[E: codex-rs/ext/history-notes/src/tools.rs:26][E: codex-rs/ext/history-notes/src/tools.rs:27]

运行时 exposure 是 `ToolExposure::DirectModelOnly`，不走用户可见 tool 面。[E: codex-rs/ext/history-notes/src/tools.rs:310]

hook 的 `post_tool_use_response` 只回 JSON result，不带 model-only 图片附件。[E: codex-rs/ext/history-notes/src/tools.rs:391]

code mode 直接返回 `"History tools are unavailable in code mode."`。[E: codex-rs/ext/history-notes/src/tools.rs:401]

## 注册门控

`HistoryNotesExtension::update_config` 只有同时满足才把 backend 写入 thread store：

1. `config.token_budget.use_history_notes_extension` 为 true；
2. `config.model_provider.is_openai()`；
3. `auth_manager.current_auth_uses_codex_backend()`。

否则移除 config，工具列表为空。[E: codex-rs/ext/history-notes/src/extension.rs:47][E: codex-rs/ext/history-notes/src/extension.rs:51][E: codex-rs/ext/history-notes/src/extension.rs:61][E: codex-rs/ext/history-notes/src/extension.rs:160]

`TokenBudgetConfig` 默认 `use_history_notes_extension: false`。[E: codex-rs/core/src/config/mod.rs:1238]

session 在 Responses metadata 里，若该开关打开会设 `history_ingest_requested: Some(true)`，让 backend 有机会 ingest 当前窗口。[E: codex-rs/core/src/session/session.rs:624]

## 控制流

1. app-server `thread_extensions` 调用 `codex_history_notes_extension::install`，注册 lifecycle / config / prompt / tool contributor。[E: codex-rs/app-server/src/extensions.rs:79][E: codex-rs/ext/history-notes/src/extension.rs:182]
2. `on_thread_start` 把 `session_source` 的 agent path（缺省 `/root`）存成 `HistoryNotesAgentIdentity`，再跑 `update_config`。[E: codex-rs/ext/history-notes/src/extension.rs:72][E: codex-rs/ext/history-notes/src/extension.rs:80]
3. `tools()` 为 `HistoryNotesAction::ALL` 各建一个 `HistoryNotesTool`，带 session id 与当前 agent name。[E: codex-rs/ext/history-notes/src/extension.rs:167]
4. handler 解析 JSON 对象（空字符串当 `{}`），把 `context.session_id` / `context.current_agent_name` 插入后 POST backend。[E: codex-rs/ext/history-notes/src/tools.rs:266][E: codex-rs/ext/history-notes/src/backend.rs:40]
5. search / append / write 请求带 `x-openai-encrypted-tool-arguments: true`；所有请求带 truncation policy header，timeout 35s。[E: codex-rs/ext/history-notes/src/backend.rs:14][E: codex-rs/ext/history-notes/src/backend.rs:75][E: codex-rs/ext/history-notes/src/backend.rs:81]
6. 若 response 有 `encrypted_output`，工具输出用 `EncryptedContent`；另可拆出 `images` 变成 data-URL `InputImage`。[E: codex-rs/ext/history-notes/src/tools.rs:336][E: codex-rs/ext/history-notes/src/tools.rs:369]
7. prompt contributor 另调 `alpha/notes/v2/thread_hint`，把不超过 `MAX_THREAD_HINT_BYTES`（4_000）的 `text` 注入 `PromptSlot::ContextWindow`，kind 为 `notes.thread_hint`。[E: codex-rs/ext/history-notes/src/extension.rs:31][E: codex-rs/ext/history-notes/src/extension.rs:122][E: codex-rs/ext/history-notes/src/extension.rs:145]

## parallel-safe

`NotesAppendToFile` 与 `NotesWriteFile` 返回 `supports_parallel_tool_calls = false`；其余 7 个 action 为 true。[E: codex-rs/ext/history-notes/src/tools.rs:98]

## 设计动机与权衡

compaction 会丢掉旧窗口细节；history tools 让模型按 window/item ID 回读，notes 则让模型自己维护跨窗口备忘。两者都标成 private，是为了避免把恢复机制和私有笔记泄漏进用户可见回复。[E: codex-rs/ext/history-notes/src/tools.rs:26][E: codex-rs/ext/history-notes/src/tools.rs:27][I]

list/search 做成 eventually consistent，而单文件 read 在成功 write 后立刻可见，是为了让模型刚写完就能读自己的笔记，同时允许索引异步更新。[E: codex-rs/ext/history-notes/src/tools.rs:27][I]

## gotcha

- 打开开关还不够：必须是 OpenAI provider **且** Codex backend auth，否则 thread store 里没有 config，工具数为 0。[E: codex-rs/ext/history-notes/src/extension.rs:51]
- 1,000,000 字节上限写在 notes namespace 描述里，crate 本地不另做字节计数。[E: codex-rs/ext/history-notes/src/tools.rs:27]
- 这不是 `memories` extension 的 `memory_summary.md`；后者走 developer policy，面向用户可感知的长期记忆。

## Sources

- `codex-rs/ext/history-notes/src/lib.rs`
- `codex-rs/ext/history-notes/src/tools.rs`
- `codex-rs/ext/history-notes/src/extension.rs`
- `codex-rs/ext/history-notes/src/backend.rs`
- `codex-rs/app-server/src/extensions.rs`
- `codex-rs/core/src/config/mod.rs`
- `codex-rs/core/src/session/session.rs`

## 相关

- [Context 与 compaction](../../spine/context-and-compaction.md) — compaction 截断后为何需要 history 回读。
- [Context manager](context-manager.md) — in-memory / model-visible history 与这套 backend 历史不是同一份 store。
- [历史压缩与 compaction](compaction.md) — replacement history 安装后旧窗口只能经 history tools 恢复。
- [Token budget](token-budget.md) — `use_history_notes_extension` 挂在 token-budget 配置上。
- [Ext 扩展插件系统](../../spine/extension-system.md) — history-notes 如何作为 extension 安装。
