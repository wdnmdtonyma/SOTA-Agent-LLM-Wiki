---
id: subsys.core.turn-metadata
title: Turn metadata 与 attempted-tool lineage
kind: subsystem
tier: T2
source: [codex-rs/core/src/turn_metadata.rs, codex-rs/core/src/responses_metadata.rs, codex-rs/core/src/tools/executed_tool_calls.rs, codex-rs/core/src/tasks/mod.rs, codex-rs/core/src/session/turn.rs, codex-rs/protocol/src/models.rs, codex-rs/protocol/src/models/executed_tool_calls.rs]
symbols: [TurnMetadataState, CodexResponsesMetadata, TurnMetadataWorkspace, ExecutedToolCallRecorder]
related: [subsys.core.tool-system, subsys.core.context-manager, ref.data-model]
evidence: explicit
status: verified
updated: 9ded177ce7
---

> `TurnMetadataState` 是单 turn 的 Responses metadata source of truth：它携带 thread/turn lineage、workspace/git、sandbox、code-mode tool mapping、turn timing 与 caller extra metadata；`ExecutedToolCallRecorder` 则把模型尝试执行的 direct/nested tool calls 以有界、warehouse-only metadata 附到对应 tool output 上。[E: codex-rs/core/src/turn_metadata.rs:89][E: codex-rs/core/src/turn_metadata.rs:95][E: codex-rs/core/src/turn_metadata.rs:103][E: codex-rs/core/src/turn_metadata.rs:106][E: codex-rs/core/src/tools/executed_tool_calls.rs:23][E: codex-rs/protocol/src/models.rs:794]

## 能回答的问题

- Responses request 的 `turn_id`、parent thread/turn 与 subagent metadata 从哪里生成？
- `parent_turn_id` 为什么只能第一次写入，何时由 mailbox pending input 设置？
- MCP request 为什么看不到 parent-turn 和 code-mode tool map？
- attempted tool call 如何与 direct output、code-mode cell output 对齐？
- arguments、pending calls 与整份 prompt metadata 的硬上限是什么？
- 为什么 `executed_tool_calls` 不是 public app-server request field？

## 职责边界

`TurnMetadataState` 属于 turn-scoped runtime metadata；它不改变 conversation history，也不定义 tool dispatch。`CodexResponsesMetadata` 把该 state 投影成 canonical `x-codex-turn-metadata` client metadata 与兼容 headers。[E: codex-rs/core/src/turn_metadata.rs:197][E: codex-rs/core/src/turn_metadata.rs:254][E: codex-rs/core/src/responses_metadata.rs:159][E: codex-rs/core/src/responses_metadata.rs:219][I]

`ExecutedToolCallRecorder` 记录“模型尝试调用了什么”，再附着到下一次 prompt 的 tool output；actual tool result、approval 与 runtime event 仍由 tool system/context history 负责。[E: codex-rs/core/src/tools/executed_tool_calls.rs:64][E: codex-rs/core/src/tools/executed_tool_calls.rs:177][E: codex-rs/core/src/session/turn.rs:1347][I]

## 数据模型

| 实体 | 关键字段/约束 | 语义 |
|---|---|---|
| `TurnMetadataState` | cwd/repo、session/thread/fork/parent IDs、`OnceLock<String>` parent turn、subagent kind/header、turn id、sandbox、workspaces、code-mode tool names、turn start time、extra metadata、user-input-requested flag | Mutable turn-scoped metadata accumulator。[E: codex-rs/core/src/turn_metadata.rs:89][E: codex-rs/core/src/turn_metadata.rs:91][E: codex-rs/core/src/turn_metadata.rs:95][E: codex-rs/core/src/turn_metadata.rs:95][E: codex-rs/core/src/turn_metadata.rs:103][E: codex-rs/core/src/turn_metadata.rs:107] |
| `CodexResponsesMetadata` | installation/session/thread/turn/window IDs、request kind、lineage、subagent、sandbox、workspaces、tool names、turn timestamp、extra | Caller-owned request snapshot；canonical blob lives in `client_metadata["x-codex-turn-metadata"]`。[E: codex-rs/core/src/responses_metadata.rs:159][E: codex-rs/core/src/responses_metadata.rs:166][E: codex-rs/core/src/responses_metadata.rs:176][E: codex-rs/core/src/responses_metadata.rs:219][E: codex-rs/core/src/responses_metadata.rs:250] |
| `InternalChatMessageMetadataPassthrough` | optional `turn_id`, optional `executed_tool_calls` | attempted calls are warehouse-only: skipped during deserialization, schema generation, and TypeScript export。[E: codex-rs/protocol/src/models.rs:786][E: codex-rs/protocol/src/models.rs:789][E: codex-rs/protocol/src/models.rs:789][E: codex-rs/protocol/src/models.rs:792][E: codex-rs/protocol/src/models.rs:792][E: codex-rs/protocol/src/models.rs:794] |
| `ExecutedToolCall` | `name` + untagged raw/truncated arguments | truncation marker is locally trusted metadata；model-provided marker-shaped JSON is wrapped as raw data instead of being trusted。[E: codex-rs/protocol/src/models/executed_tool_calls.rs:232][E: codex-rs/protocol/src/models/executed_tool_calls.rs:243][E: codex-rs/protocol/src/models/executed_tool_calls.rs:244][E: codex-rs/protocol/src/models/executed_tool_calls.rs:246][E: codex-rs/protocol/src/models/executed_tool_calls.rs:262][E: codex-rs/protocol/src/models/executed_tool_calls.rs:263] |

## Parent lineage 与 Responses metadata

1. `TurnMetadataState::new` captures thread/fork/parent identity and computes repo root/sandbox；`parent_turn_id` starts empty as `OnceLock`。[E: codex-rs/core/src/turn_metadata.rs:113][E: codex-rs/core/src/turn_metadata.rs:126][E: codex-rs/core/src/turn_metadata.rs:135][E: codex-rs/core/src/turn_metadata.rs:142]
2. `set_parent_turn_id` ignores blank values and accepts only the first non-empty value, so later delivery cannot rewrite lineage。[E: codex-rs/core/src/turn_metadata.rs:227][E: codex-rs/core/src/turn_metadata.rs:228][E: codex-rs/core/src/turn_metadata.rs:230]
3. `Session::start_task` retrieves pending input and optional parent turn id from the input queue；only `MailboxParentProvenance::Attribute` writes it into `TurnMetadataState`。[E: codex-rs/core/src/tasks/mod.rs:317][E: codex-rs/core/src/tasks/mod.rs:318][E: codex-rs/core/src/tasks/mod.rs:322]
4. `responses_metadata_template` copies turn/fork/parent/subagent/sandbox/workspace/tool/timing/extra state into a request snapshot；caller-provided extra metadata is filtered so reserved core keys cannot be overridden。[E: codex-rs/core/src/turn_metadata.rs:234][E: codex-rs/core/src/turn_metadata.rs:242][E: codex-rs/core/src/turn_metadata.rs:254][E: codex-rs/core/src/turn_metadata.rs:255][E: codex-rs/core/src/turn_metadata.rs:257][E: codex-rs/core/src/turn_metadata.rs:269][E: codex-rs/core/src/responses_metadata.rs:47][E: codex-rs/core/src/responses_metadata.rs:64]
5. `client_metadata()` emits flat compatibility IDs plus full `x-codex-turn-metadata` JSON；parent turn is also projected as a flat key when present。[E: codex-rs/core/src/responses_metadata.rs:219][E: codex-rs/core/src/responses_metadata.rs:228][E: codex-rs/core/src/responses_metadata.rs:244][E: codex-rs/core/src/responses_metadata.rs:247][E: codex-rs/core/src/responses_metadata.rs:250]
6. MCP projection deliberately removes both code-mode tool mapping and `parent_turn_id`, then adds current model/effort and whether user input was requested during the turn。[E: codex-rs/core/src/turn_metadata.rs:157][E: codex-rs/core/src/turn_metadata.rs:166][E: codex-rs/core/src/turn_metadata.rs:167][E: codex-rs/core/src/turn_metadata.rs:168][E: codex-rs/core/src/turn_metadata.rs:183][E: codex-rs/core/src/turn_metadata.rs:187]

## Executed tool metadata 控制流

1. Recorder sees both direct and Code Mode nested calls. It omits the public Code Mode wrapper/wait calls themselves, records the underlying attempted call name, and converts oversized arguments to truncation metadata。[E: codex-rs/core/src/tools/executed_tool_calls.rs:64][E: codex-rs/core/src/tools/executed_tool_calls.rs:71][E: codex-rs/core/src/tools/executed_tool_calls.rs:85][E: codex-rs/core/src/tools/executed_tool_calls.rs:88][E: codex-rs/core/src/tools/executed_tool_calls.rs:94][E: codex-rs/core/src/tools/executed_tool_calls.rs:107]
2. Direct calls are keyed by call id；nested calls accumulate per code-mode cell, then `output_cells` maps a later output call id back to the cell。[E: codex-rs/core/src/tools/executed_tool_calls.rs:29][E: codex-rs/core/src/tools/executed_tool_calls.rs:30][E: codex-rs/core/src/tools/executed_tool_calls.rs:31][E: codex-rs/core/src/tools/executed_tool_calls.rs:108][E: codex-rs/core/src/tools/executed_tool_calls.rs:131][E: codex-rs/core/src/tools/executed_tool_calls.rs:293]
3. `attach_pending_to_prompt` scans prompt items newest-first, attaches calls only to matching function/custom/tool-search outputs, and keeps retry/retained caches so a retry sees the same metadata。[E: codex-rs/core/src/tools/executed_tool_calls.rs:177][E: codex-rs/core/src/tools/executed_tool_calls.rs:197][E: codex-rs/core/src/tools/executed_tool_calls.rs:202][E: codex-rs/core/src/tools/executed_tool_calls.rs:210][E: codex-rs/core/src/tools/executed_tool_calls.rs:220][E: codex-rs/core/src/tools/executed_tool_calls.rs:251][E: codex-rs/core/src/tools/executed_tool_calls.rs:252][E: codex-rs/core/src/tools/executed_tool_calls.rs:255]
4. Sampling attaches pending metadata before `build_prompt`; if anything was attached, protocol-level prompt bounding runs across the complete request。[E: codex-rs/core/src/session/turn.rs:1337][E: codex-rs/core/src/session/turn.rs:1347][E: codex-rs/core/src/session/turn.rs:1349][E: codex-rs/core/src/session/turn.rs:1351][E: codex-rs/core/src/session/turn.rs:1353]

## Hard bounds 与 failure semantics

- Individual attempted-tool arguments are capped at 8 KiB；recorder keeps at most 256 complete pending direct/nested calls, then may retain one truncated overflow marker（state can reach 257）；每个 output 的 full nested argument bytes 上限为 32 KiB。[E: codex-rs/core/src/tools/executed_tool_calls.rs:16][E: codex-rs/core/src/tools/executed_tool_calls.rs:17][E: codex-rs/core/src/tools/executed_tool_calls.rs:18][E: codex-rs/core/src/tools/executed_tool_calls.rs:113][E: codex-rs/core/src/tools/executed_tool_calls.rs:121][E: codex-rs/core/src/tools/executed_tool_calls.rs:123][E: codex-rs/core/src/tools/executed_tool_calls.rs:124][E: codex-rs/core/src/tools/executed_tool_calls.rs:125][E: codex-rs/core/src/tools/executed_tool_calls.rs:151][E: codex-rs/core/src/tools/executed_tool_calls.rs:159][E: codex-rs/core/src/tools/executed_tool_calls.rs:163][E: codex-rs/core/src/tools/executed_tool_calls.rs:171]
- Protocol bounding enforces 8 KiB per argument and 32 KiB total serialized metadata。Normal prompt distributes budget fairly across remaining items；retained-history mode reverses traversal to prioritize newest calls。[E: codex-rs/protocol/src/models/executed_tool_calls.rs:9][E: codex-rs/protocol/src/models/executed_tool_calls.rs:11][E: codex-rs/protocol/src/models/executed_tool_calls.rs:49][E: codex-rs/protocol/src/models/executed_tool_calls.rs:54][E: codex-rs/protocol/src/models/executed_tool_calls.rs:55][E: codex-rs/protocol/src/models/executed_tool_calls.rs:100][E: codex-rs/protocol/src/models/executed_tool_calls.rs:136][E: codex-rs/protocol/src/models/executed_tool_calls.rs:141]
- Recorder is best effort: cancellation、compaction or a yielded code-mode cell without a later wait may leave pending attempted calls unreported；this metadata is observability, not an execution ledger。[E: codex-rs/core/src/tools/executed_tool_calls.rs:23][I]

## Gotcha

- `parent_thread_id` and `parent_turn_id` are different lineage dimensions；the latter is first-write-wins and intentionally removed from MCP metadata。[E: codex-rs/core/src/turn_metadata.rs:95][E: codex-rs/core/src/turn_metadata.rs:95][E: codex-rs/core/src/turn_metadata.rs:167][E: codex-rs/core/src/turn_metadata.rs:227]
- `executed_tool_calls` is attached to tool-output chat metadata, not emitted as a standalone rollout item or public app-server field。[E: codex-rs/protocol/src/models.rs:789][E: codex-rs/protocol/src/models.rs:794][E: codex-rs/core/src/tools/executed_tool_calls.rs:255]
- Full Code Mode tool mapping remains in canonical client metadata, while direct compatibility headers omit that unbounded mapping。[E: codex-rs/core/src/responses_metadata.rs:219][E: codex-rs/core/src/responses_metadata.rs:260][E: codex-rs/core/src/responses_metadata.rs:262]

## Sources

- `codex-rs/core/src/turn_metadata.rs`
- `codex-rs/core/src/responses_metadata.rs`
- `codex-rs/core/src/tools/executed_tool_calls.rs`
- `codex-rs/core/src/tasks/mod.rs`
- `codex-rs/core/src/session/turn.rs`
- `codex-rs/protocol/src/models.rs`
- `codex-rs/protocol/src/models/executed_tool_calls.rs`

## 相关

- [工具系统](tool-system.md) — tool call routing and execution boundary。
- [Context manager](context-manager.md) — prompt history materialization before metadata attachment。
- 索引 id：`ref.data-model`
