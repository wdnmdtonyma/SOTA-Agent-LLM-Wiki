---
id: subsys.core.turn-metadata
title: Turn metadata 与 attempted-tool lineage
kind: subsystem
tier: T2
source: [codex-rs/core/src/turn_metadata.rs, codex-rs/core/src/responses_metadata.rs, codex-rs/core/src/tools/executed_tool_calls.rs, codex-rs/core/src/tasks/mod.rs, codex-rs/core/src/session/turn.rs, codex-rs/core/src/session/turn_input.rs, codex-rs/protocol/src/models.rs, codex-rs/protocol/src/models/executed_tool_calls.rs]
symbols: [TurnMetadataState, CodexResponsesMetadata, TurnMetadataWorkspace, ExecutedToolCallRecorder]
related: [subsys.core.tool-system, subsys.core.context-manager, ref.data-model]
evidence: explicit
status: verified
updated: 121f91fd5d
---

> `TurnMetadataState` 是单 turn 的 Responses metadata source of truth：它携带 thread/turn lineage、workspace/git、sandbox、code-mode tool mapping、turn timing 与 caller extra metadata；`ExecutedToolCallRecorder` 则把模型尝试执行的 direct/nested tool calls 以有界、warehouse-only metadata 附到对应 tool output 上。[E: codex-rs/core/src/turn_metadata.rs:116][E: codex-rs/core/src/turn_metadata.rs:119][E: codex-rs/core/src/turn_metadata.rs:123][E: codex-rs/core/src/turn_metadata.rs:138][E: codex-rs/core/src/tools/executed_tool_calls.rs:26][E: codex-rs/protocol/src/models.rs:955]

## 能回答的问题

- Responses request 的 `turn_id`、parent thread/turn 与 subagent metadata 从哪里生成？
- `parent_turn_id` 为什么只能第一次写入，何时由 mailbox pending input 设置？
- MCP request 为什么看不到 parent-turn 和 code-mode tool map？
- attempted tool call 如何与 direct output、code-mode cell output 对齐？
- arguments、pending calls 与整份 prompt metadata 的硬上限是什么？
- 为什么 `executed_tool_calls` 不是 public app-server request field？

## 职责边界

`TurnMetadataState` 属于 turn-scoped runtime metadata；它不改变 conversation history，也不定义 tool dispatch。`CodexResponsesMetadata` 把该 state 投影成 canonical `x-codex-turn-metadata` client metadata 与兼容 headers。[E: codex-rs/core/src/turn_metadata.rs:282][E: codex-rs/core/src/turn_metadata.rs:376][E: codex-rs/core/src/responses_metadata.rs:220][E: codex-rs/core/src/responses_metadata.rs:307][I]

`ExecutedToolCallRecorder` 记录“模型尝试调用了什么”，再附着到下一次 prompt 的 tool output；actual tool result、approval 与 runtime event 仍由 tool system/context history 负责。[E: codex-rs/core/src/tools/executed_tool_calls.rs:105][E: codex-rs/core/src/tools/executed_tool_calls.rs:274][E: codex-rs/core/src/session/turn.rs:1458][I]

## 数据模型

| 实体 | 关键字段/约束 | 语义 |
|---|---|---|
| `TurnMetadataState` | cwd/repo、session/thread/fork/parent IDs、`OnceLock<String>` parent turn、subagent kind/header、turn id、sandbox、workspaces、code-mode tool names、turn start time、extra metadata、user-input-requested flag | Mutable turn-scoped metadata accumulator。[E: codex-rs/core/src/turn_metadata.rs:116][E: codex-rs/core/src/turn_metadata.rs:117][E: codex-rs/core/src/turn_metadata.rs:118][E: codex-rs/core/src/turn_metadata.rs:119][E: codex-rs/core/src/turn_metadata.rs:122][E: codex-rs/core/src/turn_metadata.rs:123] |
| `CodexResponsesMetadata` | installation/session/thread/turn/window IDs、request kind、lineage、subagent、sandbox、workspaces、tool names、turn timestamp、extra | Caller-owned request snapshot；canonical blob lives in `client_metadata["x-codex-turn-metadata"]`。[E: codex-rs/core/src/responses_metadata.rs:220][E: codex-rs/core/src/responses_metadata.rs:223][E: codex-rs/core/src/responses_metadata.rs:227][E: codex-rs/core/src/responses_metadata.rs:236][E: codex-rs/core/src/responses_metadata.rs:341] |
| `InternalChatMessageMetadataPassthrough` | optional `turn_id`, optional `executed_tool_calls` | attempted calls are warehouse-only: skipped during deserialization, schema generation, and TypeScript export。[E: codex-rs/protocol/src/models.rs:930][E: codex-rs/protocol/src/models.rs:933][E: codex-rs/protocol/src/models.rs:952][E: codex-rs/protocol/src/models.rs:953][E: codex-rs/protocol/src/models.rs:954][E: codex-rs/protocol/src/models.rs:955] |
| `ExecutedToolCall` | `name` + untagged raw/truncated arguments | truncation marker is locally trusted metadata；model-provided marker-shaped JSON is wrapped as raw data instead of being trusted。[E: codex-rs/protocol/src/models/executed_tool_calls.rs:319][E: codex-rs/protocol/src/models/executed_tool_calls.rs:330][E: codex-rs/protocol/src/models/executed_tool_calls.rs:331][E: codex-rs/protocol/src/models/executed_tool_calls.rs:333][E: codex-rs/protocol/src/models/executed_tool_calls.rs:401][E: codex-rs/protocol/src/models/executed_tool_calls.rs:402] |

## Parent lineage 与 Responses metadata

1. `TurnMetadataState::new` captures thread/fork/parent identity and computes repo root/sandbox；`parent_turn_id` starts empty as `OnceLock`。[E: codex-rs/core/src/turn_metadata.rs:161][E: codex-rs/core/src/turn_metadata.rs:209][E: codex-rs/core/src/turn_metadata.rs:210][E: codex-rs/core/src/turn_metadata.rs:211]
2. `set_parent_turn_id` ignores blank values and accepts only the first non-empty value, so later delivery cannot rewrite lineage。[E: codex-rs/core/src/turn_metadata.rs:309][E: codex-rs/core/src/turn_metadata.rs:310][E: codex-rs/core/src/turn_metadata.rs:313]
3. Session start writes optional `parent_turn_id` from `start_options` / `TurnInput` into `TurnMetadataState`；there is no `MailboxParentProvenance` type on HEAD。[E: codex-rs/core/src/tasks/mod.rs:481][E: codex-rs/core/src/tasks/mod.rs:494][E: codex-rs/core/src/session/turn_input.rs:172][E: codex-rs/core/src/session/turn_input.rs:175]
4. `responses_metadata_template` copies turn/fork/parent/subagent/sandbox/workspace/tool/timing/extra state into a request snapshot；caller-provided extra metadata is filtered so reserved core keys cannot be overridden。[E: codex-rs/core/src/turn_metadata.rs:376][E: codex-rs/core/src/turn_metadata.rs:381][E: codex-rs/core/src/turn_metadata.rs:354][E: codex-rs/core/src/responses_metadata.rs:488]
5. `client_metadata()` emits flat compatibility IDs plus full `x-codex-turn-metadata` JSON；parent turn is also projected as a flat key when present。[E: codex-rs/core/src/responses_metadata.rs:307][E: codex-rs/core/src/responses_metadata.rs:332][E: codex-rs/core/src/responses_metadata.rs:341]
6. MCP projection (`current_meta_value_for_mcp_request`) clears harness-owned tool inventory, then removes `parent_turn_id` / `root_turn_id` / agent name before adding current model/effort and whether user input was requested during the turn。[E: codex-rs/core/src/turn_metadata.rs:234][E: codex-rs/core/src/turn_metadata.rs:242][E: codex-rs/core/src/turn_metadata.rs:247][E: codex-rs/core/src/turn_metadata.rs:250][E: codex-rs/core/src/turn_metadata.rs:268]

## Executed tool metadata 控制流

1. Recorder sees both direct and Code Mode nested calls. It omits the public Code Mode wrapper/wait calls themselves, records the underlying attempted call name, and converts oversized arguments to truncation metadata。[E: codex-rs/core/src/tools/executed_tool_calls.rs:104][E: codex-rs/core/src/tools/executed_tool_calls.rs:111][E: codex-rs/core/src/tools/executed_tool_calls.rs:92][E: codex-rs/core/src/tools/executed_tool_calls.rs:128][E: codex-rs/core/src/tools/executed_tool_calls.rs:136][E: codex-rs/core/src/tools/executed_tool_calls.rs:149]
2. Direct calls are keyed by call id；nested calls accumulate per code-mode cell, then `output_cells` maps a later output call id back to the cell。[E: codex-rs/core/src/tools/executed_tool_calls.rs:32][E: codex-rs/core/src/tools/executed_tool_calls.rs:33][E: codex-rs/core/src/tools/executed_tool_calls.rs:34][E: codex-rs/core/src/tools/executed_tool_calls.rs:150][E: codex-rs/core/src/tools/executed_tool_calls.rs:173][E: codex-rs/core/src/tools/executed_tool_calls.rs:474]
3. `attach_pending_to_prompt` scans prompt items newest-first, attaches calls only to matching function/custom/tool-search outputs, and keeps retry/retained caches so a retry sees the same metadata。[E: codex-rs/core/src/tools/executed_tool_calls.rs:274][E: codex-rs/core/src/tools/executed_tool_calls.rs:301][E: codex-rs/core/src/tools/executed_tool_calls.rs:306][E: codex-rs/core/src/tools/executed_tool_calls.rs:314][E: codex-rs/core/src/tools/executed_tool_calls.rs:332][E: codex-rs/core/src/tools/executed_tool_calls.rs:379][E: codex-rs/core/src/tools/executed_tool_calls.rs:304][E: codex-rs/core/src/tools/executed_tool_calls.rs:393]
4. Sampling attaches pending metadata before `build_prompt`; if anything was attached, protocol-level prompt bounding runs across the complete request。[E: codex-rs/core/src/session/turn.rs:1456][E: codex-rs/core/src/session/turn.rs:1458][E: codex-rs/core/src/session/turn.rs:1460]

## Hard bounds 与 failure semantics

- Individual attempted-tool arguments are capped at 8 KiB；recorder keeps at most 256 complete pending direct/nested calls, then may retain one truncated overflow marker（state can reach 257）；每个 output 的 full nested argument bytes 上限为 32 KiB。[E: codex-rs/core/src/tools/executed_tool_calls.rs:19][E: codex-rs/core/src/tools/executed_tool_calls.rs:20][E: codex-rs/core/src/tools/executed_tool_calls.rs:21][E: codex-rs/core/src/tools/executed_tool_calls.rs:155][E: codex-rs/core/src/tools/executed_tool_calls.rs:163][E: codex-rs/core/src/tools/executed_tool_calls.rs:165][E: codex-rs/core/src/tools/executed_tool_calls.rs:166][E: codex-rs/core/src/tools/executed_tool_calls.rs:167][E: codex-rs/core/src/tools/executed_tool_calls.rs:195][E: codex-rs/core/src/tools/executed_tool_calls.rs:206][E: codex-rs/core/src/tools/executed_tool_calls.rs:210][E: codex-rs/core/src/tools/executed_tool_calls.rs:218]
- Protocol bounding enforces 8 KiB per argument and 32 KiB total serialized metadata。Normal prompt distributes budget fairly across remaining items；retained-history mode reverses traversal to prioritize newest calls。[E: codex-rs/protocol/src/models/executed_tool_calls.rs:9][E: codex-rs/protocol/src/models/executed_tool_calls.rs:15][E: codex-rs/protocol/src/models/executed_tool_calls.rs:76][E: codex-rs/protocol/src/models/executed_tool_calls.rs:81][E: codex-rs/protocol/src/models/executed_tool_calls.rs:82][E: codex-rs/protocol/src/models/executed_tool_calls.rs:164][E: codex-rs/protocol/src/models/executed_tool_calls.rs:220][E: codex-rs/protocol/src/models/executed_tool_calls.rs:225]
- Recorder is best effort: cancellation、compaction or a yielded code-mode cell without a later wait may leave pending attempted calls unreported；this metadata is observability, not an execution ledger。[E: codex-rs/core/src/tools/executed_tool_calls.rs:26][I]

## Gotcha

- `parent_thread_id` and `parent_turn_id` are different lineage dimensions；the latter is first-write-wins and intentionally removed from MCP metadata。[E: codex-rs/core/src/turn_metadata.rs:122][E: codex-rs/core/src/turn_metadata.rs:123][E: codex-rs/core/src/turn_metadata.rs:313][E: codex-rs/core/src/turn_metadata.rs:247]
- `executed_tool_calls` is attached to tool-output chat metadata, not emitted as a standalone rollout item or public app-server field。[E: codex-rs/protocol/src/models.rs:952][E: codex-rs/protocol/src/models.rs:955][E: codex-rs/core/src/tools/executed_tool_calls.rs:393]
- Full Code Mode tool mapping remains in canonical client metadata, while direct compatibility headers omit that unbounded mapping。[E: codex-rs/core/src/responses_metadata.rs:341][E: codex-rs/core/src/responses_metadata.rs:352][E: codex-rs/core/src/responses_metadata.rs:353]

## Sources

- `codex-rs/core/src/turn_metadata.rs`
- `codex-rs/core/src/responses_metadata.rs`
- `codex-rs/core/src/tools/executed_tool_calls.rs`
- `codex-rs/core/src/tasks/mod.rs`
- `codex-rs/core/src/session/turn.rs`
- `codex-rs/core/src/session/turn_input.rs`
- `codex-rs/protocol/src/models.rs`
- `codex-rs/protocol/src/models/executed_tool_calls.rs`

## 相关

- [工具系统](tool-system.md) — tool call routing and execution boundary。
- [Context manager](context-manager.md) — prompt history materialization before metadata attachment。
- 索引 id：`ref.data-model`
