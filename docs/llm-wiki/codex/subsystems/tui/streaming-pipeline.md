---
id: subsys.tui.streaming-pipeline
title: Streaming Pipeline
kind: subsystem
tier: T2
source: [codex-rs/tui/src/markdown_stream.rs, codex-rs/tui/src/streaming/mod.rs, codex-rs/tui/src/streaming/chunking.rs, codex-rs/tui/src/streaming/commit_tick.rs, codex-rs/tui/src/streaming/controller.rs, codex-rs/tui/src/chatwidget/streaming.rs]
symbols: [MarkdownStreamCollector, StreamState, AdaptiveChunkingPolicy, ChunkingMode, DrainPlan, run_commit_tick, StreamController, PlanStreamController]
related: [subsys.tui.chatwidget, subsys.tui.rendering-theming, subsys.tui.event-system]
evidence: explicit
status: verified
updated: db887d03e1
---

> TUI streaming pipeline 现在由 newline-gated markdown collector、FIFO `StreamState`、adaptive chunking policy、commit-tick orchestrator、message/plan stream controllers 和 `ChatWidget` glue 组成；`chunking.rs` 的注释仍保留旧补充 Markdown 路径列表，但当前可验证事实应从 `codex-rs/tui/src/streaming/*` 代码本身取。[E: codex-rs/tui/src/markdown_stream.rs:1][E: codex-rs/tui/src/streaming/mod.rs:1][E: codex-rs/tui/src/streaming/chunking.rs:1][E: codex-rs/tui/src/streaming/chunking.rs:73][E: codex-rs/tui/src/streaming/commit_tick.rs:1][E: codex-rs/tui/src/streaming/controller.rs:459][E: codex-rs/tui/src/chatwidget/streaming.rs:111][I]

## 能回答的问题

- markdown delta 什么时候变成可提交的 stable source？
- queue ordering 和 queue-age pressure 在哪里维护？
- catch-up mode 的进入/退出门槛是什么？
- commit tick 如何同时 drain answer stream 和 plan stream？

## Markdown 边界

`MarkdownStreamCollector` 缓冲 token deltas，并只在 newline boundary 暴露 completed prefix；`commit_complete_source` 找最后一个 `\n`，返回上次 commit 后的新 source，没有 newline 或没有新内容时返回 none。[E: codex-rs/tui/src/markdown_stream.rs:3][E: codex-rs/tui/src/markdown_stream.rs:4][E: codex-rs/tui/src/markdown_stream.rs:20][E: codex-rs/tui/src/markdown_stream.rs:23][E: codex-rs/tui/src/markdown_stream.rs:30][E: codex-rs/tui/src/markdown_stream.rs:77][E: codex-rs/tui/src/markdown_stream.rs:87][E: codex-rs/tui/src/markdown_stream.rs:87][E: codex-rs/tui/src/markdown_stream.rs:88][E: codex-rs/tui/src/markdown_stream.rs:93]

finalize path 会 flush remaining source，必要时补 newline，然后 clear collector；这只应在 stream 真正完成或 intentionally consolidated interrupted output 时调用。[E: codex-rs/tui/src/markdown_stream.rs:98][E: codex-rs/tui/src/markdown_stream.rs:100][E: codex-rs/tui/src/markdown_stream.rs:102][E: codex-rs/tui/src/markdown_stream.rs:104][E: codex-rs/tui/src/markdown_stream.rs:110][E: codex-rs/tui/src/markdown_stream.rs:111][E: codex-rs/tui/src/markdown_stream.rs:114]

## Queue State

`StreamState` 持有 collector、FIFO queued lines 和 `has_seen_delta`；module contract 明确 queue ordering 是关键 invariant，drain 只从 front pop，enqueue 记录 arrival timestamp 以便 policy 计算 oldest queued age。[E: codex-rs/tui/src/streaming/mod.rs:3][E: codex-rs/tui/src/streaming/mod.rs:9][E: codex-rs/tui/src/streaming/mod.rs:29][E: codex-rs/tui/src/streaming/mod.rs:31][E: codex-rs/tui/src/streaming/mod.rs:32][E: codex-rs/tui/src/streaming/mod.rs:33]

state API 包括 `step` drain one、`drain_n` bounded multi-line drain、`clear_queue`、`is_idle`、`queued_len`、`oldest_queued_age` 和 `enqueue`；`enqueue` 给同一批 lines 共享 `Instant::now()`。[E: codex-rs/tui/src/streaming/mod.rs:55][E: codex-rs/tui/src/streaming/mod.rs:56][E: codex-rs/tui/src/streaming/mod.rs:62][E: codex-rs/tui/src/streaming/mod.rs:66][E: codex-rs/tui/src/streaming/mod.rs:74][E: codex-rs/tui/src/streaming/mod.rs:78][E: codex-rs/tui/src/streaming/mod.rs:82][E: codex-rs/tui/src/streaming/mod.rs:86][E: codex-rs/tui/src/streaming/mod.rs:92][E: codex-rs/tui/src/streaming/mod.rs:93]

## Adaptive Chunking

`AdaptiveChunkingPolicy` 是 two-gear model：`Smooth` 一 tick 一行，`CatchUp` backlog 存在时批量 drain；它只看 queue depth 和 oldest age，不看 source identity 或 transport。[E: codex-rs/tui/src/streaming/chunking.rs:3][E: codex-rs/tui/src/streaming/chunking.rs:4][E: codex-rs/tui/src/streaming/chunking.rs:6][E: codex-rs/tui/src/streaming/chunking.rs:9][E: codex-rs/tui/src/streaming/chunking.rs:17][E: codex-rs/tui/src/streaming/chunking.rs:18]

进入/退出门槛在代码常量里：enter depth 8 行或 oldest age 120ms，exit depth 2 行且 oldest age 40ms 以下并保持 250ms，catch-up exit 后 250ms re-entry hold，severe depth 64 行或 oldest age 300ms 可绕过 hold。[E: codex-rs/tui/src/streaming/chunking.rs:82][E: codex-rs/tui/src/streaming/chunking.rs:85][E: codex-rs/tui/src/streaming/chunking.rs:87][E: codex-rs/tui/src/streaming/chunking.rs:90][E: codex-rs/tui/src/streaming/chunking.rs:92][E: codex-rs/tui/src/streaming/chunking.rs:95][E: codex-rs/tui/src/streaming/chunking.rs:97][E: codex-rs/tui/src/streaming/chunking.rs:100][E: codex-rs/tui/src/streaming/chunking.rs:102][E: codex-rs/tui/src/streaming/chunking.rs:103][E: codex-rs/tui/src/streaming/chunking.rs:105][E: codex-rs/tui/src/streaming/chunking.rs:108][E: codex-rs/tui/src/streaming/chunking.rs:110][E: codex-rs/tui/src/streaming/chunking.rs:113][E: codex-rs/tui/src/streaming/chunking.rs:115][E: codex-rs/tui/src/streaming/chunking.rs:116]

policy output 是 `ChunkingDecision { mode, entered_catch_up, drain_plan }`，drain plan 只有 `Single` 或 `Batch(usize)`；`decide` 对给定 mode/snapshot/now deterministic，空 queue 会 reset 到 smooth。[E: codex-rs/tui/src/streaming/chunking.rs:136][E: codex-rs/tui/src/streaming/chunking.rs:137][E: codex-rs/tui/src/streaming/chunking.rs:141][E: codex-rs/tui/src/streaming/chunking.rs:146][E: codex-rs/tui/src/streaming/chunking.rs:148][E: codex-rs/tui/src/streaming/chunking.rs:152][E: codex-rs/tui/src/streaming/chunking.rs:176][E: codex-rs/tui/src/streaming/chunking.rs:180][E: codex-rs/tui/src/streaming/chunking.rs:181][E: codex-rs/tui/src/streaming/chunking.rs:183]

## Commit Tick

`run_commit_tick` 收集 answer/plan controllers 的 combined queue snapshot，调用 policy 决策；如果 scope 是 `CatchUpOnly` 且 mode 不是 catch-up，就返回 default output，否则把 drain plan 应用到两个 controller。[E: codex-rs/tui/src/streaming/commit_tick.rs:62][E: codex-rs/tui/src/streaming/commit_tick.rs:69][E: codex-rs/tui/src/streaming/commit_tick.rs:76][E: codex-rs/tui/src/streaming/commit_tick.rs:81][E: codex-rs/tui/src/streaming/commit_tick.rs:82][E: codex-rs/tui/src/streaming/commit_tick.rs:86]

snapshot 会 sum controller queue depth，并取最大 oldest age；plan application 只从 controller queue head drain，`Single` 映射到 `on_commit_tick`，`Batch` 映射到 `on_commit_tick_batch`。[E: codex-rs/tui/src/streaming/commit_tick.rs:97][E: codex-rs/tui/src/streaming/commit_tick.rs:95][E: codex-rs/tui/src/streaming/commit_tick.rs:102][E: codex-rs/tui/src/streaming/commit_tick.rs:106][E: codex-rs/tui/src/streaming/commit_tick.rs:110][E: codex-rs/tui/src/streaming/commit_tick.rs:114][E: codex-rs/tui/src/streaming/commit_tick.rs:148][E: codex-rs/tui/src/streaming/commit_tick.rs:155][E: codex-rs/tui/src/streaming/commit_tick.rs:163][E: codex-rs/tui/src/streaming/commit_tick.rs:180][E: codex-rs/tui/src/streaming/commit_tick.rs:185][E: codex-rs/tui/src/streaming/commit_tick.rs:186][E: codex-rs/tui/src/streaming/commit_tick.rs:194][E: codex-rs/tui/src/streaming/commit_tick.rs:199][E: codex-rs/tui/src/streaming/commit_tick.rs:200]

## Controllers 与 ChatWidget Glue

`StreamController` 包装 `StreamCore` 并产出 `AgentMessageCell`；`PlanStreamController` 包装同一 core 但带 plan-specific header、indentation 和 background styling。两者都有 new/push/finalize/on_commit_tick/on_commit_tick_batch/queued_lines/oldest_queued_age 等接口。[E: codex-rs/tui/src/streaming/controller.rs:459][E: codex-rs/tui/src/streaming/controller.rs:462][E: codex-rs/tui/src/streaming/controller.rs:473][E: codex-rs/tui/src/streaming/controller.rs:480][E: codex-rs/tui/src/streaming/controller.rs:486][E: codex-rs/tui/src/streaming/controller.rs:500][E: codex-rs/tui/src/streaming/controller.rs:505][E: codex-rs/tui/src/streaming/controller.rs:517][E: codex-rs/tui/src/streaming/controller.rs:521][E: codex-rs/tui/src/streaming/controller.rs:553][E: codex-rs/tui/src/streaming/controller.rs:570][E: codex-rs/tui/src/streaming/controller.rs:574][E: codex-rs/tui/src/streaming/controller.rs:586][E: codex-rs/tui/src/streaming/controller.rs:594][E: codex-rs/tui/src/streaming/controller.rs:600][E: codex-rs/tui/src/streaming/controller.rs:614][E: codex-rs/tui/src/streaming/controller.rs:622]

`ChatWidget` glue 中，agent delta 调用 `on_agent_message_delta`，plan delta 会创建 `PlanStreamController` 并触发 commit animation/catch-up tick；finalize paths 把 remaining cells/source consolidation 写回 history。[E: codex-rs/tui/src/chatwidget/streaming.rs:19][E: codex-rs/tui/src/chatwidget/streaming.rs:35][E: codex-rs/tui/src/chatwidget/streaming.rs:52][E: codex-rs/tui/src/chatwidget/streaming.rs:111][E: codex-rs/tui/src/chatwidget/streaming.rs:115][E: codex-rs/tui/src/chatwidget/streaming.rs:131][E: codex-rs/tui/src/chatwidget/streaming.rs:137][E: codex-rs/tui/src/chatwidget/streaming.rs:142]

## Gotchas

- chunking policy 的 non-responsibilities 明确包括 tick scheduling、line reordering 和 transport-specific semantics；调参时不要把 source 类型塞进 policy。[E: codex-rs/tui/src/streaming/chunking.rs:67][E: codex-rs/tui/src/streaming/chunking.rs:69][E: codex-rs/tui/src/streaming/chunking.rs:70][E: codex-rs/tui/src/streaming/chunking.rs:71]
- `commit_tick.rs` 不直接 mutate UI state；调用者负责 animation events 和 history insertion side effects。[E: codex-rs/tui/src/streaming/commit_tick.rs:7][E: codex-rs/tui/src/streaming/commit_tick.rs:8]

## Sources

- `codex-rs/tui/src/markdown_stream.rs`
- `codex-rs/tui/src/streaming/mod.rs`
- `codex-rs/tui/src/streaming/chunking.rs`
- `codex-rs/tui/src/streaming/commit_tick.rs`
- `codex-rs/tui/src/streaming/controller.rs`
- `codex-rs/tui/src/chatwidget/streaming.rs`

## 相关

- `subsys.tui.chatwidget`: streaming notifications 进入 UI 状态机的位置。
- `subsys.tui.rendering-theming`: emitted history cells 的渲染基础。
