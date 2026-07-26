---
id: subsys.tui.streaming-pipeline
title: Streaming Pipeline
kind: subsystem
tier: T2
source: [codex-rs/tui/src/markdown_stream.rs, codex-rs/tui/src/markdown_render/streaming.rs, codex-rs/tui/src/streaming/mod.rs, codex-rs/tui/src/streaming/render.rs, codex-rs/tui/src/streaming/chunking.rs, codex-rs/tui/src/streaming/commit_tick.rs, codex-rs/tui/src/streaming/controller.rs, codex-rs/tui/src/chatwidget/streaming.rs, codex-rs/tui/src/exec_cell/live_output.rs]
symbols: [MarkdownStreamCollector, StreamingMarkdownRender, StreamingRender, StreamState, AdaptiveChunkingPolicy, ChunkingMode, DrainPlan, run_commit_tick, StreamController, PlanStreamController, LiveCommandOutput]
related: [subsys.tui.chatwidget, subsys.tui.rendering-theming, subsys.tui.event-system]
evidence: explicit
status: verified
updated: 61a44880a8
---

> TUI streaming pipeline 现在由 newline-gated markdown collector、FIFO `StreamState`、adaptive chunking policy、commit-tick orchestrator、message/plan stream controllers 和 `ChatWidget` glue 组成；`chunking.rs` 的注释仍保留旧补充 Markdown 路径列表，但当前可验证事实应从 `codex-rs/tui/src/streaming/*` 代码本身取。[E: codex-rs/tui/src/chatwidget/streaming.rs:141][I]

## 能回答的问题

- markdown delta 什么时候变成可提交的 stable source？
- queue ordering 和 queue-age pressure 在哪里维护？
- catch-up mode 的进入/退出门槛是什么？
- commit tick 如何同时 drain answer stream 和 plan stream？

## Markdown 边界

`MarkdownStreamCollector` 缓冲 token deltas，并只在 newline boundary 暴露 completed prefix；`commit_complete_source` 找最后一个 `\n`，返回新 committed source 的 byte range，而 `committed_source()` 借用完整 newline-safe prefix，避免每个 delta 复制 String。[E: codex-rs/tui/src/markdown_stream.rs:87][E: codex-rs/tui/src/markdown_stream.rs:94]

finalize path 的 `finalize_and_take_source` 转移完整 buffer ownership，必要时补 newline 后 clear collector；这只应在 stream 真正完成或 intentionally consolidated interrupted output 时调用。[E: codex-rs/tui/src/markdown_stream.rs:109][E: codex-rs/tui/src/markdown_stream.rs:114]

`render_streaming_markdown_lines_with_width_and_cwd` 在同一次 pulldown-cmark parse 中同时产出 styled lines、最后一个 top-level block 的 source offset、reference-link-definition flag 和首 block 是否 raw HTML；offset 永远针对传入的原字符串。[E: codex-rs/tui/src/markdown_render/streaming.rs:41][E: codex-rs/tui/src/markdown_render/streaming.rs:50][E: codex-rs/tui/src/markdown_render/streaming.rs:52]

## Queue State

`StreamState` 持有 collector、FIFO queued lines 和 `has_seen_delta`；module contract 明确 queue ordering 是关键 invariant，drain 只从 front pop，enqueue 记录 arrival timestamp 以便 policy 计算 oldest queued age。[E: codex-rs/tui/src/streaming/mod.rs:32][E: codex-rs/tui/src/streaming/mod.rs:33][E: codex-rs/tui/src/streaming/mod.rs:34][I]

state API 包括 `step` drain one、`drain_n` bounded multi-line drain、`clear_queue`、`is_idle`、`queued_len`、`oldest_queued_age` 和 `enqueue`；`enqueue` 给同一批 lines 共享 `Instant::now()`。[E: codex-rs/tui/src/streaming/mod.rs:56][E: codex-rs/tui/src/streaming/mod.rs:57][E: codex-rs/tui/src/streaming/mod.rs:67][E: codex-rs/tui/src/streaming/mod.rs:75][E: codex-rs/tui/src/streaming/mod.rs:79][E: codex-rs/tui/src/streaming/mod.rs:83][E: codex-rs/tui/src/streaming/mod.rs:87][E: codex-rs/tui/src/streaming/mod.rs:93][E: codex-rs/tui/src/streaming/mod.rs:94]

## Adaptive Chunking

`AdaptiveChunkingPolicy` 是 two-gear model：`Smooth` 一 tick 一行，`CatchUp` backlog 存在时批量 drain；它只看 queue depth 和 oldest age，不看 source identity 或 transport。[I]

进入/退出门槛在代码常量里：enter depth 8 行或 oldest age 120ms，exit depth 2 行且 oldest age 40ms 以下并保持 250ms，catch-up exit 后 250ms re-entry hold，severe depth 64 行或 oldest age 300ms 可绕过 hold。[E: codex-rs/tui/src/streaming/chunking.rs:85][E: codex-rs/tui/src/streaming/chunking.rs:90][E: codex-rs/tui/src/streaming/chunking.rs:95][E: codex-rs/tui/src/streaming/chunking.rs:100][E: codex-rs/tui/src/streaming/chunking.rs:103][E: codex-rs/tui/src/streaming/chunking.rs:108][E: codex-rs/tui/src/streaming/chunking.rs:113][E: codex-rs/tui/src/streaming/chunking.rs:116]

policy output 是 `ChunkingDecision { mode, entered_catch_up, drain_plan }`，drain plan 只有 `Single` 或 `Batch(usize)`；`decide` 对给定 mode/snapshot/now deterministic，空 queue 会 reset 到 smooth。[E: codex-rs/tui/src/streaming/chunking.rs:136][E: codex-rs/tui/src/streaming/chunking.rs:137][E: codex-rs/tui/src/streaming/chunking.rs:141][E: codex-rs/tui/src/streaming/chunking.rs:146][E: codex-rs/tui/src/streaming/chunking.rs:148][E: codex-rs/tui/src/streaming/chunking.rs:152][E: codex-rs/tui/src/streaming/chunking.rs:180][E: codex-rs/tui/src/streaming/chunking.rs:181][E: codex-rs/tui/src/streaming/chunking.rs:183]

## Commit Tick

`run_commit_tick` 收集 answer/plan controllers 的 combined queue snapshot，调用 policy 决策；如果 scope 是 `CatchUpOnly` 且 mode 不是 catch-up，就返回 default output，否则把 drain plan 应用到两个 controller。[E: codex-rs/tui/src/streaming/commit_tick.rs:69][E: codex-rs/tui/src/streaming/commit_tick.rs:76][E: codex-rs/tui/src/streaming/commit_tick.rs:81][E: codex-rs/tui/src/streaming/commit_tick.rs:82][E: codex-rs/tui/src/streaming/commit_tick.rs:86]

snapshot 会 sum controller queue depth，并取最大 oldest age；plan application 只从 controller queue head drain，`Single` 映射到 `on_commit_tick`，`Batch` 映射到 `on_commit_tick_batch`。[E: codex-rs/tui/src/streaming/commit_tick.rs:97][E: codex-rs/tui/src/streaming/commit_tick.rs:102][E: codex-rs/tui/src/streaming/commit_tick.rs:106][E: codex-rs/tui/src/streaming/commit_tick.rs:110][E: codex-rs/tui/src/streaming/commit_tick.rs:114][E: codex-rs/tui/src/streaming/commit_tick.rs:148][E: codex-rs/tui/src/streaming/commit_tick.rs:155][E: codex-rs/tui/src/streaming/commit_tick.rs:163][E: codex-rs/tui/src/streaming/commit_tick.rs:180][E: codex-rs/tui/src/streaming/commit_tick.rs:185][E: codex-rs/tui/src/streaming/commit_tick.rs:186][E: codex-rs/tui/src/streaming/commit_tick.rs:194][E: codex-rs/tui/src/streaming/commit_tick.rs:199][E: codex-rs/tui/src/streaming/commit_tick.rs:200]

## Controllers 与 ChatWidget Glue

`StreamingRender` 保存 source 与 rendered-line 两个 stable prefix boundary，只重新渲染最后一个 top-level Markdown block；width/render-mode change、reference-style link definition 或 inline-visualization rewrite 会退化为 full recompute，因为它们可能影响已稳定的前缀。[E: codex-rs/tui/src/streaming/render.rs:105][E: codex-rs/tui/src/streaming/render.rs:122][E: codex-rs/tui/src/streaming/render.rs:148]

`StreamController` 包装 `StreamCore` 并产出 `AgentMessageCell`；`PlanStreamController` 包装同一 core 但带 plan-specific header、indentation 和 background styling。两者都有 new/push/finalize/on_commit_tick/on_commit_tick_batch/queued_lines/oldest_queued_age 等接口。[E: codex-rs/tui/src/streaming/controller.rs:475][E: codex-rs/tui/src/streaming/controller.rs:487][E: codex-rs/tui/src/streaming/controller.rs:508][E: codex-rs/tui/src/streaming/controller.rs:514][E: codex-rs/tui/src/streaming/controller.rs:526][E: codex-rs/tui/src/streaming/controller.rs:531][E: codex-rs/tui/src/streaming/controller.rs:543][E: codex-rs/tui/src/streaming/controller.rs:547][E: codex-rs/tui/src/streaming/controller.rs:579][E: codex-rs/tui/src/streaming/controller.rs:600][E: codex-rs/tui/src/streaming/controller.rs:612][E: codex-rs/tui/src/streaming/controller.rs:625][E: codex-rs/tui/src/streaming/controller.rs:631][E: codex-rs/tui/src/streaming/controller.rs:643][E: codex-rs/tui/src/streaming/controller.rs:651]

command execution 的 live cell 另有独立内存边界：`LiveCommandOutput` 在累计输出超过 1 MiB 后切换为 bounded preview，保留最前与最后各 50 条 completed lines、当前 partial line，并对单条超长行再保留 head/tail；transcript renderer 会插入 omitted-line marker。[E: codex-rs/tui/src/exec_cell/live_output.rs:5][E: codex-rs/tui/src/exec_cell/live_output.rs:11][E: codex-rs/tui/src/exec_cell/live_output.rs:18][E: codex-rs/tui/src/exec_cell/live_output.rs:18][E: codex-rs/tui/src/exec_cell/live_output.rs:142][E: codex-rs/tui/src/exec_cell/live_output.rs:149][E: codex-rs/tui/src/exec_cell/live_output.rs:150]

`ChatWidget` glue 中，answer stream 用带 thread-scoped inline-visualization context 的 controller，plan stream 仍使用普通 controller；delta 没有 newline 时不重建可见 tail，tail 内容未变化时也不 bump active-cell revision/redraw。[E: codex-rs/tui/src/chatwidget/streaming.rs:145][E: codex-rs/tui/src/chatwidget/streaming.rs:158][E: codex-rs/tui/src/chatwidget/streaming.rs:442][E: codex-rs/tui/src/chatwidget/streaming.rs:461][E: codex-rs/tui/src/chatwidget/streaming.rs:467][E: codex-rs/tui/src/chatwidget/streaming.rs:498][E: codex-rs/tui/src/chatwidget/streaming.rs:519]

## Gotchas

- chunking policy 的 non-responsibilities 明确包括 tick scheduling、line reordering 和 transport-specific semantics；调参时不要把 source 类型塞进 policy。[I]
- `commit_tick.rs` 不直接 mutate UI state；调用者负责 animation events 和 history insertion side effects。[I]
- incremental stable-prefix optimization 对 reference definitions 与 inline visualization 主动 fail open 到 full render；不能假设所有 Markdown 都只重绘 tail。[E: codex-rs/tui/src/streaming/render.rs:105][E: codex-rs/tui/src/streaming/render.rs:122]

## Sources

- `codex-rs/tui/src/markdown_stream.rs`
- `codex-rs/tui/src/markdown_render/streaming.rs`
- `codex-rs/tui/src/streaming/mod.rs`
- `codex-rs/tui/src/streaming/render.rs`
- `codex-rs/tui/src/streaming/chunking.rs`
- `codex-rs/tui/src/streaming/commit_tick.rs`
- `codex-rs/tui/src/streaming/controller.rs`
- `codex-rs/tui/src/chatwidget/streaming.rs`
- `codex-rs/tui/src/exec_cell/live_output.rs`

## 相关

- `subsys.tui.chatwidget`: streaming notifications 进入 UI 状态机的位置。
- `subsys.tui.rendering-theming`: emitted history cells 的渲染基础。
