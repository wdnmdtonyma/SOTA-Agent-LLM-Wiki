---
id: subsys.core.memory
title: 长期 Memory
kind: subsystem
tier: T2
source: [codex-rs/memories/write/src/lib.rs, codex-rs/memories/write/src/start.rs, codex-rs/memories/write/src/phase1.rs, codex-rs/memories/write/src/phase1_output.rs, codex-rs/memories/write/src/phase2.rs, codex-rs/memories/write/src/runtime.rs, codex-rs/memories/write/src/storage.rs, codex-rs/memories/write/src/workspace.rs, codex-rs/memories/write/src/control.rs, codex-rs/memories/write/src/guard.rs, codex-rs/memories/read/src/lib.rs, codex-rs/memories/read/src/citations.rs, codex-rs/memories/read/src/usage.rs, codex-rs/ext/memories/src/lib.rs, codex-rs/ext/memories/src/extension.rs, codex-rs/ext/memories/src/prompts.rs, codex-rs/core/src/context/memory.rs, codex-rs/protocol/src/memory_version.rs, codex-rs/app-server/src/extensions.rs, codex-rs/app-server/src/request_processors/turn_processor.rs, codex-rs/app-server-protocol/src/protocol/common.rs, codex-rs/core/src/session/session.rs, codex-rs/core/src/session/handlers.rs, codex-rs/core/src/session/mod.rs, codex-rs/config/src/types.rs, codex-rs/state/src/runtime/memories.rs, codex-rs/ext/history-notes/src/tools.rs]
symbols: [start_memories_startup_task, MemoriesExtension, build_memory_tool_developer_instructions, MemoriesConfig, MemoryContextFragment, MemoryVersion, memories::phase1::output_schema, sync_rollout_summaries_from_memories]
related: [spine.extension-system, subsys.core.instruction-assembly, subsys.core.session-lifecycle, subsys.core.turn-engine, subsys.core.unified-exec, subsys.core.history-notes, rpc.mcp-skills-plugin-methods]
evidence: explicit
status: verified
updated: 3abbf9fe2c
---

> 长期 Memory 拆成三层：`codex-rs/memories/write` 负责 startup extraction/consolidation 写路径，`codex-rs/memories/read` 负责 citation/usage/read helper，`codex-rs/ext/memories` 通过 extension API 把 `memory_summary.md` 注入 developer prompt 并可选暴露 dedicated memory tools。core 侧 `MemoryContextFragment` 是 bounded v2 memory context。它不是 History notes 扩展：后者是 backend 私有 `history`/`notes` 回读面，private model-only。[E: codex-rs/memories/write/src/lib.rs:29][E: codex-rs/ext/memories/src/extension.rs:70][E: codex-rs/core/src/context/memory.rs:9][E: codex-rs/ext/history-notes/src/tools.rs:26]

## 能回答的问题

- Memory startup pipeline 现在在哪个 crate，何时从 app-server turn path 触发？
- `generate_memories`、`use_memories`、`dedicated_tools` 分别控制哪条路径？
- V1/V2 memory root 如何分目录？
- Phase 1 如何 claim rollouts、构造 strict JSON extraction prompt？
- Phase 2 如何 claim global lock、同步 memory workspace、启动受限 consolidation agent？
- `memory_summary.md` 如何通过 extension prompt contributor 进入 developer policy？
- experimental `memory/status` RPC 在哪里查方法表？
- 它和 History notes 扩展有何不同？

## 职责边界

写路径由 `codex_memories_write` crate 拥有：它导出 startup task、Phase 1/Phase 2 prompt/storage helpers、memory root layout 和清理函数。[E: codex-rs/memories/write/src/lib.rs:25] 读/注入路径不在 `core/src/session/mod.rs` 硬编码 memory 分支里，而是 app-server 安装 `codex_memories_extension`，再由 extension prompt contributor 返回 `PromptFragment::developer_policy`。[E: codex-rs/app-server/src/extensions.rs:110][E: codex-rs/ext/memories/src/extension.rs:95]

experimental client RPC `memory/status` 存在；方法表权威在 `rpc.mcp-skills-plugin-methods`，本页不列 params/response。[E: codex-rs/app-server-protocol/src/protocol/common.rs:706][E: codex-rs/app-server-protocol/src/protocol/common.rs:707]

## 关键 crate/文件

- `codex-rs/memories/write/src/lib.rs`: write crate 的模块总账、导出函数、artifact names 和 path layout。[E: codex-rs/memories/write/src/lib.rs:25][E: codex-rs/memories/write/src/lib.rs:118]
- `codex-rs/memories/write/src/start.rs`: root-session startup gate、versioned root、extension instruction seeding、prune、rate-limit guard、Phase 1、Phase 2 顺序。[E: codex-rs/memories/write/src/start.rs:24][E: codex-rs/memories/write/src/start.rs:33]
- `codex-rs/memories/write/src/phase1.rs` + `phase1_output.rs`: startup job claim、versioned strict output schema、parallel stage-one sampling。[E: codex-rs/memories/write/src/phase1.rs:137][E: codex-rs/memories/write/src/phase1_output.rs:61]
- `codex-rs/memories/write/src/phase2.rs`: global phase-two lock、memory workspace sync/diff、consolidation agent。[E: codex-rs/memories/write/src/phase2.rs:67][E: codex-rs/memories/write/src/phase2.rs:83]
- `codex-rs/core/src/context/memory.rs`: `MemoryContextFragment` 把 v2 read instructions / extraction evidence 做成 bounded contextual fragment。[E: codex-rs/core/src/context/memory.rs:9][E: codex-rs/core/src/context/memory.rs:14]
- `codex-rs/ext/memories/src/extension.rs`: read-path prompt contributor、thread/config storage、optional dedicated tools。[E: codex-rs/ext/memories/src/extension.rs:45][E: codex-rs/ext/memories/src/extension.rs:135]

## 数据模型

`MemoriesConfig::default` 默认生成和使用 memories，但 dedicated tools 默认关闭。[E: codex-rs/config/src/types.rs:350][E: codex-rs/config/src/types.rs:356][E: codex-rs/config/src/types.rs:357][E: codex-rs/config/src/types.rs:358]

`generate_memories` 决定 thread persistence metadata 的 initial `memory_mode`: 新建时为 true 则 `Enabled`，否则 `Disabled`。[E: codex-rs/core/src/session/session.rs:996]

`MemoryVersion` 把 artifact namespace 分成 V1 `memories` 与 V2 `memories_v2`。[E: codex-rs/protocol/src/memory_version.rs:9][E: codex-rs/protocol/src/memory_version.rs:17][E: codex-rs/protocol/src/memory_version.rs:19][E: codex-rs/protocol/src/memory_version.rs:20]

`memory_root(codex_home)` 仍是 `codex_home/memories` helper；startup/read 实际用 `codex_home.join(version.directory_name())`。[E: codex-rs/memories/write/src/lib.rs:118][E: codex-rs/memories/write/src/start.rs:64][E: codex-rs/ext/memories/src/prompts.rs:39]

`MemoryContextFragment` 有 `ReadInstructions`（developer）和 `ExtractionEvidence`（user），body 按 8,900 bytes truncate。[E: codex-rs/core/src/context/memory.rs:9][E: codex-rs/core/src/context/memory.rs:17][E: codex-rs/core/src/context/memory.rs:41]

## Startup/write path

1. App-server turn path 在成功提交有 input 的 turn 后调用 `codex_memories_write::start_memories_startup_task`。[E: codex-rs/app-server/src/request_processors/turn_processor.rs:686][E: codex-rs/memories/write/src/start.rs:24]
2. Startup gate 跳过 ephemeral session、未开启 `Feature::MemoryTool` 的 session、以及 non-root agent；缺少 state DB 时直接跳过。[E: codex-rs/memories/write/src/start.rs:33][E: codex-rs/memories/write/src/start.rs:60]
3. `dual_write` 为真时同一 startup 会按 V1 再 V2 各跑一遍 pipeline；否则只跑 `config.memories.version`。[E: codex-rs/memories/write/src/start.rs:40][E: codex-rs/memories/write/src/start.rs:43]
4. Background task 创建 versioned memory root，seed extension instructions，prune stale stage-one outputs，检查 Codex rate limits，之后依次运行 Phase 1 和 Phase 2。[E: codex-rs/memories/write/src/start.rs:64][E: codex-rs/memories/write/src/start.rs:71][E: codex-rs/memories/write/src/start.rs:77][E: codex-rs/memories/write/src/start.rs:89]

## Phase 1

V1 stage-one output schema 是 strict JSON object，必须包含 `rollout_summary`、`rollout_slug` 和 `raw_memory`，并禁止 additional properties；V2 不再要求 `raw_memory`。并行采样使用 `buffer_unordered(stage_one::CONCURRENCY_LIMIT)`。[E: codex-rs/memories/write/src/phase1_output.rs:61][E: codex-rs/memories/write/src/phase1_output.rs:70][E: codex-rs/memories/write/src/phase1_output.rs:73][E: codex-rs/memories/write/src/phase1.rs:189]

Phase 1 job 按 version 选 base instructions，设置 output schema 且 `output_schema_strict = true`。[E: codex-rs/memories/write/src/phase1.rs:304][E: codex-rs/memories/write/src/phase1.rs:310][E: codex-rs/memories/write/src/phase1.rs:311]

## Phase 2

Phase 2 先 claim global phase2 job，再确保 memory workspace git baseline，构建 locked-down consolidation agent config，读取 selected raw memories，同步 workspace，再用 workspace diff 判断是否需要 agent。[E: codex-rs/memories/write/src/phase2.rs:68][E: codex-rs/memories/write/src/phase2.rs:76][E: codex-rs/memories/write/src/phase2.rs:83]

## Read path 与 tools

App-server 的 `thread_extensions` 安装 `codex_memories_extension`；extension 在 thread start/config changed 时把 `MemoriesExtensionConfig` 存入 thread store，`enabled` 条件是 `Feature::MemoryTool && config.memories.use_memories`，`dedicated_tools` 独立跟随 config。[E: codex-rs/app-server/src/extensions.rs:110][E: codex-rs/ext/memories/src/extension.rs:48][E: codex-rs/ext/memories/src/extension.rs:49]

Prompt contributor 只在 extension config enabled 时读取 `{codex_home}/{version.directory_name()}/memory_summary.md`，非空才渲染 embedded template。V1 直接作为 `PromptFragment::developer_policy`；V2 先切成 `MemoryContextFragment::ReadInstructions` 再包成 developer policy。[E: codex-rs/ext/memories/src/prompts.rs:39][E: codex-rs/ext/memories/src/prompts.rs:40][E: codex-rs/ext/memories/src/extension.rs:66][E: codex-rs/ext/memories/src/extension.rs:84][E: codex-rs/ext/memories/src/extension.rs:95]

Dedicated memory tools 只在 extension config enabled 且 `dedicated_tools` 为 true 时暴露。[E: codex-rs/ext/memories/src/extension.rs:146]

## Thread memory mode 与清理

`set_thread_memory_mode` 只持久化 active session 的 thread-level memory mode metadata。[E: codex-rs/core/src/session/handlers.rs:269]

`clear_memory_roots_contents` 会清空 `codex_home/memories`、`codex_home/memories_v2` 和 legacy `codex_home/memories_extensions`。[E: codex-rs/memories/write/src/control.rs:3][E: codex-rs/memories/write/src/control.rs:5][E: codex-rs/memories/write/src/control.rs:6][E: codex-rs/memories/write/src/control.rs:7]

## 设计动机与权衡

Memory 生成被放在 turn 提交后的 background startup task，而不是同步塞进当前 turn sampling；Phase 1/Phase 2 还受 state DB、rate-limit guard、lease 和 global lock 约束，这把慢速 extraction/consolidation 从当前交互延迟中隔离出来。[E: codex-rs/memories/write/src/start.rs:24][E: codex-rs/memories/write/src/phase2.rs:68][I]

`use_memories` 与 `dedicated_tools` 的拆分让 Codex 可以只注入 memory summary 而不暴露 dedicated tools；生成侧 `generate_memories` 又独立控制 future extraction eligibility。[E: codex-rs/ext/memories/src/extension.rs:48][I]

V1/V2 分目录是为了让 v1 cleanup/rollback 不碰到 v2 artifacts。[E: codex-rs/protocol/src/memory_version.rs:17][I]

## gotcha

- Prompt injection 读取的是 versioned `memory_summary.md`，不是 `raw_memories.md` 或 rollout summaries。[E: codex-rs/ext/memories/src/prompts.rs:40]
- 不要把所有 memory 都写成 `codex_home/memories`：V2 根是 `memories_v2`。[E: codex-rs/protocol/src/memory_version.rs:20]
- `memory/status` 方法表不要在本页展开；去 `rpc.mcp-skills-plugin-methods`。[E: codex-rs/app-server-protocol/src/protocol/common.rs:706][E: codex-rs/app-server-protocol/src/protocol/common.rs:707]
- 这不是 `ext/history-notes`：History notes 是 Codex backend 上的 private model-only `history`/`notes` namespace，禁止向用户披露；长期 Memory 走 developer policy，面向可感知的跨会话记忆。[E: codex-rs/ext/history-notes/src/tools.rs:26][E: codex-rs/ext/memories/src/extension.rs:95]

## Sources

- `codex-rs/memories/write/src/lib.rs`
- `codex-rs/memories/write/src/start.rs`
- `codex-rs/memories/write/src/phase1.rs`
- `codex-rs/memories/write/src/phase1_output.rs`
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
- `codex-rs/core/src/context/memory.rs`
- `codex-rs/protocol/src/memory_version.rs`
- `codex-rs/app-server/src/extensions.rs`
- `codex-rs/app-server/src/request_processors/turn_processor.rs`
- `codex-rs/app-server-protocol/src/protocol/common.rs`
- `codex-rs/core/src/session/session.rs`
- `codex-rs/core/src/session/handlers.rs`
- `codex-rs/core/src/session/mod.rs`
- `codex-rs/config/src/types.rs`
- `codex-rs/state/src/runtime/memories.rs`
- `codex-rs/ext/history-notes/src/tools.rs`

## 相关

- [指令/prompt 装配](instruction-assembly.md) — memory prompt contributor 如何通过 extension slot 进入 developer policy。
- [Session 生命周期](session-lifecycle.md) — startup task 从 app-server/turn path 异步触发。
- [Turn 引擎](turn-engine.md) — memory prompt 注入后如何进入 model input。
- [Unified Exec](unified-exec.md) — safe read/search 访问 memory artifacts 时的 usage classification。
- [Ext 扩展插件系统](../../spine/extension-system.md) — memories extension 如何通过 contributor slots 暴露工具与 prompt fragment。
- [History notes 扩展](history-notes.md) — 另一套 private backend history/notes，不要和长期 Memory 混为一谈。
- `rpc.mcp-skills-plugin-methods` — experimental `memory/status` 方法表。
