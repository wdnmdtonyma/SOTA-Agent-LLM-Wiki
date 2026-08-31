---
id: subsys.core.memory
title: 长期 Memory
kind: subsystem
tier: T2
source: [codex-rs/memories/write/src/lib.rs, codex-rs/memories/write/src/start.rs, codex-rs/memories/write/src/phase1.rs, codex-rs/memories/write/src/phase2.rs, codex-rs/memories/write/src/runtime.rs, codex-rs/memories/write/src/storage.rs, codex-rs/memories/write/src/workspace.rs, codex-rs/memories/write/src/control.rs, codex-rs/memories/write/src/guard.rs, codex-rs/memories/read/src/lib.rs, codex-rs/memories/read/src/citations.rs, codex-rs/memories/read/src/usage.rs, codex-rs/ext/memories/src/lib.rs, codex-rs/ext/memories/src/extension.rs, codex-rs/ext/memories/src/prompts.rs, codex-rs/app-server/src/extensions.rs, codex-rs/app-server/src/request_processors/turn_processor.rs, codex-rs/core/src/session/session.rs, codex-rs/core/src/session/handlers.rs, codex-rs/core/src/session/mod.rs, codex-rs/config/src/types.rs, codex-rs/state/src/runtime/memories.rs]
symbols: [start_memories_startup_task, MemoriesExtension, build_memory_tool_developer_instructions, MemoriesConfig, memories::phase1::output_schema, sync_rollout_summaries_from_memories]
related: [spine.extension-system, subsys.core.instruction-assembly, subsys.core.session-lifecycle, subsys.core.turn-engine, subsys.core.unified-exec, subsys.core.history-notes]
evidence: explicit
status: verified
updated: a9519cbcdd
---

> 长期 Memory 拆成三层：`codex-rs/memories/write` 负责 startup extraction/consolidation 写路径，`codex-rs/memories/read` 负责 citation/usage/read helper，`codex-rs/ext/memories` 通过 extension API 把 `memory_summary.md` 注入 developer prompt 并可选暴露 dedicated memory tools。它不是 History notes 扩展：后者是 backend 私有 `history`/`notes` 回读面，private model-only。[E: codex-rs/memories/write/src/lib.rs:27][E: codex-rs/ext/memories/src/extension.rs:65][E: codex-rs/ext/history-notes/src/tools.rs:26]

## 能回答的问题

- Memory startup pipeline 现在在哪个 crate，何时从 app-server turn path 触发？
- `generate_memories`、`use_memories`、`dedicated_tools` 分别控制哪条路径？
- Phase 1 如何 claim rollouts、构造 strict JSON extraction prompt？
- Phase 2 如何 claim global lock、同步 memory workspace、启动受限 consolidation agent？
- `memory_summary.md` 如何通过 extension prompt contributor 进入 developer policy？
- 它和 History notes 扩展有何不同？

## 职责边界

写路径由 `codex_memories_write` crate 拥有：它导出 startup task、Phase 1/Phase 2 prompt/storage helpers、memory root layout 和清理函数。[E: codex-rs/memories/write/src/lib.rs:23] 读/注入路径不在 `core/src/session/mod.rs` 硬编码 memory 分支里，而是 app-server 安装 `codex_memories_extension`，再由 extension prompt contributor 返回 `PromptFragment::developer_policy`。[E: codex-rs/app-server/src/extensions.rs:107][E: codex-rs/ext/memories/src/extension.rs:65]

## 关键 crate/文件

- `codex-rs/memories/write/src/lib.rs`: write crate 的模块总账、导出函数、artifact names 和 path layout。[E: codex-rs/memories/write/src/lib.rs:23][E: codex-rs/memories/write/src/lib.rs:116]
- `codex-rs/memories/write/src/start.rs`: root-session startup gate、memory root creation、extension instruction seeding、prune、rate-limit guard、Phase 1、Phase 2 顺序。[E: codex-rs/memories/write/src/start.rs:24][E: codex-rs/memories/write/src/start.rs:33]
- `codex-rs/memories/write/src/phase1.rs`: startup job claim、strict output schema、parallel stage-one sampling。[E: codex-rs/memories/write/src/phase1.rs:137][E: codex-rs/memories/write/src/phase1.rs:220]
- `codex-rs/memories/write/src/phase2.rs`: global phase-two lock、memory workspace sync/diff、consolidation agent。[E: codex-rs/memories/write/src/phase2.rs:65][E: codex-rs/memories/write/src/phase2.rs:87]
- `codex-rs/ext/memories/src/extension.rs`: read-path prompt contributor、thread/config storage、optional dedicated tools。[E: codex-rs/ext/memories/src/extension.rs:44][E: codex-rs/ext/memories/src/extension.rs:115]

## 数据模型

`MemoriesConfig::default` 默认生成和使用 memories，但 dedicated tools 默认关闭。[E: codex-rs/config/src/types.rs:344]

`generate_memories` 决定 thread persistence metadata 的 initial `memory_mode`: 新建时为 true 则 `Enabled`，否则 `Disabled`。[E: codex-rs/core/src/session/session.rs:868]

Memory artifact layout：`memory_root(codex_home)` 是 `codex_home/memories`，`rollout_summaries_dir(root)` 是 `root/rollout_summaries`，`memory_extensions_root(root)` 是 `root/extensions`，`raw_memories_file(root)` 是 `root/raw_memories.md`。[E: codex-rs/memories/write/src/lib.rs:116][E: codex-rs/memories/write/src/lib.rs:120][E: codex-rs/memories/write/src/lib.rs:124][E: codex-rs/memories/write/src/lib.rs:128]

## Startup/write path

1. App-server turn path 在成功提交有 input 的 turn 后调用 `codex_memories_write::start_memories_startup_task`。[E: codex-rs/memories/write/src/start.rs:24]
2. Startup gate 跳过 ephemeral session、未开启 `Feature::MemoryTool` 的 session、以及 non-root agent；缺少 state DB 时直接跳过。[E: codex-rs/memories/write/src/start.rs:33][E: codex-rs/memories/write/src/start.rs:49]
3. Background task 创建 memory root，seed extension instructions，prune stale stage-one outputs，检查 Codex rate limits，之后依次运行 Phase 1 和 Phase 2。[E: codex-rs/memories/write/src/start.rs:56][E: codex-rs/memories/write/src/start.rs:66][E: codex-rs/memories/write/src/start.rs:68][E: codex-rs/memories/write/src/start.rs:78]

## Phase 1

Stage-one output schema 是 strict JSON object，必须包含 `rollout_summary`、`rollout_slug` 和 `raw_memory`，并禁止 additional properties；并行采样使用 `buffer_unordered(stage_one::CONCURRENCY_LIMIT)`。[E: codex-rs/memories/write/src/phase1.rs:137][E: codex-rs/memories/write/src/phase1.rs:145][E: codex-rs/memories/write/src/phase1.rs:220]

Phase 1 job 把 `stage_one::PROMPT` 作为 base instructions，设置 output schema 且 `output_schema_strict = true`。[E: codex-rs/memories/write/src/phase1.rs:309][E: codex-rs/memories/write/src/phase1.rs:314]

## Phase 2

Phase 2 先 claim global phase2 job，再确保 memory workspace git baseline，构建 locked-down consolidation agent config，读取 selected raw memories，同步 workspace，再用 workspace diff 判断是否需要 agent。[E: codex-rs/memories/write/src/phase2.rs:65][E: codex-rs/memories/write/src/phase2.rs:74][E: codex-rs/memories/write/src/phase2.rs:87]

## Read path 与 tools

App-server 的 `thread_extensions` 安装 `codex_memories_extension`；extension 在 thread start/config changed 时把 `MemoriesExtensionConfig` 存入 thread store，`enabled` 条件是 `Feature::MemoryTool && config.memories.use_memories`，`dedicated_tools` 独立跟随 config。[E: codex-rs/app-server/src/extensions.rs:107][E: codex-rs/ext/memories/src/extension.rs:44]

Prompt contributor 只在 extension config enabled 时读取 `codex_home/memories/memory_summary.md`，非空才渲染 embedded template，并作为 `PromptFragment::developer_policy` 返回。[E: codex-rs/ext/memories/src/extension.rs:61][E: codex-rs/ext/memories/src/extension.rs:68]

Dedicated memory tools 只在 extension config enabled 且 `dedicated_tools` 为 true 时暴露。[E: codex-rs/ext/memories/src/extension.rs:115]

## Thread memory mode 与清理

`set_thread_memory_mode` 只持久化 active session 的 thread-level memory mode metadata。[E: codex-rs/core/src/session/handlers.rs:393]

`clear_memory_roots_contents` 会清空 `codex_home/memories` 和 legacy `codex_home/memories_extensions` 两个 root。[E: codex-rs/memories/write/src/lib.rs:23]

## 设计动机与权衡

Memory 生成被放在 turn 提交后的 background startup task，而不是同步塞进当前 turn sampling；Phase 1/Phase 2 还受 state DB、rate-limit guard、lease 和 global lock 约束，这把慢速 extraction/consolidation 从当前交互延迟中隔离出来。[E: codex-rs/memories/write/src/start.rs:24][E: codex-rs/memories/write/src/phase2.rs:65][I]

`use_memories` 与 `dedicated_tools` 的拆分让 Codex 可以只注入 memory summary 而不暴露 dedicated tools；生成侧 `generate_memories` 又独立控制 future extraction eligibility。[E: codex-rs/ext/memories/src/extension.rs:44][I]

## gotcha

- Prompt injection 读取的是 `memory_summary.md`，不是 `raw_memories.md` 或 rollout summaries。[E: codex-rs/ext/memories/src/extension.rs:65]
- `memory_extensions_root(root)` 当前是 `root/extensions`；clear path 仍额外清理 legacy `codex_home/memories_extensions`。[E: codex-rs/memories/write/src/lib.rs:124]
- 这不是 `ext/history-notes`：History notes 是 Codex backend 上的 private model-only `history`/`notes` namespace，禁止向用户披露；长期 Memory 走 developer policy，面向可感知的跨会话记忆。[E: codex-rs/ext/history-notes/src/tools.rs:26][E: codex-rs/ext/memories/src/extension.rs:68]

## Sources

- `codex-rs/memories/write/src/lib.rs`
- `codex-rs/memories/write/src/start.rs`
- `codex-rs/memories/write/src/phase1.rs`
- `codex-rs/memories/write/src/phase2.rs`
- `codex-rs/memories/write/src/runtime.rs`
- `codex-rs/memories/write/src/storage.rs`
- `codex-rs/memories/write/src/workspace.rs`
- `codex-rs/memories/write/src/control.rs`
- `codex-rs/memories/write/src/guard.rs`
- `codex-rs/memories/read/src/lib.rs`
- `codex-rs/memories/read/src/citations.rs`
- `codex-rs/memories/read/src/usage.rs`
- `codex-rs/ext/memories/src/lib.rs`
- `codex-rs/ext/memories/src/extension.rs`
- `codex-rs/ext/memories/src/prompts.rs`
- `codex-rs/app-server/src/extensions.rs`
- `codex-rs/app-server/src/request_processors/turn_processor.rs`
- `codex-rs/core/src/session/session.rs`
- `codex-rs/core/src/session/handlers.rs`
- `codex-rs/core/src/session/mod.rs`
- `codex-rs/config/src/types.rs`
- `codex-rs/state/src/runtime/memories.rs`

## 相关

- [指令/prompt 装配](instruction-assembly.md) — memory prompt contributor 如何通过 extension slot 进入 developer policy。
- [Session 生命周期](session-lifecycle.md) — startup task 从 app-server/turn path 异步触发。
- [Turn 引擎](turn-engine.md) — memory prompt 注入后如何进入 model input。
- [Unified Exec](unified-exec.md) — safe read/search 访问 memory artifacts 时的 usage classification。
- [Ext 扩展插件系统](../../spine/extension-system.md) — memories extension 如何通过 contributor slots 暴露工具与 prompt fragment。
- [History notes 扩展](history-notes.md) — 另一套 private backend history/notes，不要和长期 Memory 混为一谈。
