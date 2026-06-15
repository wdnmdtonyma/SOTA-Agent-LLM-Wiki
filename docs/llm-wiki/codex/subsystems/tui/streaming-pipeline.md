---
id: subsys.tui.streaming-pipeline
title: 流式渲染管线
kind: subsystem
tier: T2
source:
  - codex-rs/tui/src/streaming
  - docs/tui-stream-chunking-review.md
  - docs/tui-stream-chunking-tuning.md
  - docs/tui-stream-chunking-validation.md
symbols:
  - StreamState
  - StreamController
  - PlanStreamController
  - AdaptiveChunkingPolicy
  - run_commit_tick
related:
  - subsys.tui.chatwidget
  - subsys.tui.event-system
  - subsys.tui.rendering-theming
evidence: explicit
status: verified
updated: 37aadeaa13
---

流式渲染管线把 model delta 先收集到 `MarkdownStreamCollector`，newline 后提交完整行并进入 FIFO queue；commit tick 读取 queue snapshot、调用 `AdaptiveChunkingPolicy` 选择 `DrainPlan`，再 drain ordinary/plan stream controllers [E: codex-rs/tui/src/markdown_stream.rs:47][E: codex-rs/tui/src/markdown_stream.rs:51][E: codex-rs/tui/src/streaming/controller.rs:42][E: codex-rs/tui/src/streaming/controller.rs:44][E: codex-rs/tui/src/streaming/mod.rs:32][E: codex-rs/tui/src/streaming/mod.rs:57][E: codex-rs/tui/src/streaming/mod.rs:69][E: codex-rs/tui/src/streaming/commit_tick.rs:76][E: codex-rs/tui/src/streaming/commit_tick.rs:81][E: codex-rs/tui/src/streaming/commit_tick.rs:86]；`StreamState` 明确保存 `MarkdownStreamCollector`、queued lines 和 `has_seen_delta` [E: codex-rs/tui/src/streaming/mod.rs:30][E: codex-rs/tui/src/streaming/mod.rs:31][E: codex-rs/tui/src/streaming/mod.rs:32][E: codex-rs/tui/src/streaming/mod.rs:33]。

## 能回答的问题

- 为什么 assistant delta 不是每个 token 都立即渲染。
- 什么情况下进入 `CatchUp`，什么情况下回到 `Smooth`。
- plan delta 和 assistant message delta 为什么使用两套 controller。
- 如何验证流式 chunking 是否退化，以及有哪些 trace/metrics。

## 职责边界

- `MarkdownStreamCollector` 负责把 markdown delta 累积到 newline boundary，并只提交完整行；`StreamState` 负责把提交后的 line 放进 FIFO queue [E: codex-rs/tui/src/markdown_stream.rs:37][E: codex-rs/tui/src/markdown_stream.rs:39][E: codex-rs/tui/src/markdown_stream.rs:47][E: codex-rs/tui/src/markdown_stream.rs:51][E: codex-rs/tui/src/streaming/mod.rs:95][E: codex-rs/tui/src/streaming/mod.rs:97][E: codex-rs/tui/src/streaming/mod.rs:101]。
- `StreamController` 负责普通 assistant message；`PlanStreamController` 负责 plan update 的 prefix/header/style，因此 plan streaming 不复用普通 answer cell 的输出形态是从两者 emit 构造差异得出的推断 [E: codex-rs/tui/src/streaming/controller.rs:107][E: codex-rs/tui/src/streaming/controller.rs:219][E: codex-rs/tui/src/streaming/controller.rs:234][E: codex-rs/tui/src/streaming/controller.rs:235][E: codex-rs/tui/src/streaming/controller.rs:241][I]。
- `AdaptiveChunkingPolicy` 的显式输入是 `QueueSnapshot`，输出是 `ChunkingDecision`/`DrainPlan`；markdown render 不在该 policy 的输入输出边界内 [E: codex-rs/tui/src/streaming/chunking.rs:155][E: codex-rs/tui/src/streaming/chunking.rs:180][E: codex-rs/tui/src/streaming/chunking.rs:200][I]。
- `run_commit_tick` 是单次 tick 的编排入口，读取 queue snapshot、做 chunking decision、应用 drain，并返回包含 `all_idle` 的 `CommitTickOutput` [E: codex-rs/tui/src/streaming/commit_tick.rs:39][E: codex-rs/tui/src/streaming/commit_tick.rs:45][E: codex-rs/tui/src/streaming/commit_tick.rs:69][E: codex-rs/tui/src/streaming/commit_tick.rs:70][E: codex-rs/tui/src/streaming/commit_tick.rs:76][E: codex-rs/tui/src/streaming/commit_tick.rs:81][E: codex-rs/tui/src/streaming/commit_tick.rs:86][E: codex-rs/tui/src/streaming/commit_tick.rs:90]。

## 关键 crate/文件

- `codex-rs/tui/src/streaming/mod.rs`: FIFO state 和 queue age。
- `codex-rs/tui/src/streaming/controller.rs`: ordinary answer 与 plan 的 controller。
- `codex-rs/tui/src/streaming/chunking.rs`: `Smooth`/`CatchUp` 状态机和 drain policy。
- `codex-rs/tui/src/streaming/commit_tick.rs`: 每个 commit tick 的快照、决策、drain 和 trace。
- `docs/tui-stream-chunking-review.md`: 问题背景、目标、runtime flow、invariants。
- `docs/tui-stream-chunking-tuning.md`: tuning 顺序与阈值说明。
- `docs/tui-stream-chunking-validation.md`: trace 验证命令和健康/退化判据。

## 数据模型

- `QueuedLine` 存储 line 和入队时间，用于计算 queue oldest age [E: codex-rs/tui/src/streaming/mod.rs:24][E: codex-rs/tui/src/streaming/mod.rs:25][E: codex-rs/tui/src/streaming/mod.rs:26]。
- `QueueSnapshot` 包含 `queued_lines` 与 `oldest_age`，是 adaptive policy 的输入 [E: codex-rs/tui/src/streaming/chunking.rs:131][E: codex-rs/tui/src/streaming/chunking.rs:133][E: codex-rs/tui/src/streaming/chunking.rs:180]。
- `ChunkingMode` 只有 `Smooth` 与 `CatchUp` 两种模式，分别对应平滑单行 drain 和积压批量 drain [E: codex-rs/tui/src/streaming/chunking.rs:119][E: codex-rs/tui/src/streaming/chunking.rs:122][E: codex-rs/tui/src/streaming/chunking.rs:124]。
- `DrainPlan::Single` 与 tuple variant `DrainPlan::Batch(usize)` 是应用层看到的输出计划 [E: codex-rs/tui/src/streaming/chunking.rs:137][E: codex-rs/tui/src/streaming/chunking.rs:139][E: codex-rs/tui/src/streaming/chunking.rs:141]。
- `CommitTickScope` 支持 `AnyMode` 和 `CatchUpOnly`，`CatchUpOnly` 会在当前模式不是 `CatchUp` 时 suppress drain [E: codex-rs/tui/src/streaming/commit_tick.rs:31][E: codex-rs/tui/src/streaming/commit_tick.rs:33][E: codex-rs/tui/src/streaming/commit_tick.rs:35][E: codex-rs/tui/src/streaming/commit_tick.rs:82][E: codex-rs/tui/src/streaming/commit_tick.rs:83]。

## 控制流

1. delta 到达后，controller 调用 collector 的 `push_delta`，如果 delta 包含 newline，则提交完整行并 enqueue [E: codex-rs/tui/src/streaming/controller.rs:40][E: codex-rs/tui/src/streaming/controller.rs:41][E: codex-rs/tui/src/streaming/controller.rs:42][E: codex-rs/tui/src/streaming/controller.rs:44]。
2. incomplete markdown 不立即输出；collector 的测试覆盖 “no commit until newline” 行为 [E: codex-rs/tui/src/markdown_stream.rs:141][E: codex-rs/tui/src/markdown_stream.rs:145][E: codex-rs/tui/src/markdown_stream.rs:148]。
3. finalize 时，如果 buffer 没有 newline，collector 会补 newline、render 剩余内容、输出尚未提交的行并清空状态 [E: codex-rs/tui/src/markdown_stream.rs:79][E: codex-rs/tui/src/markdown_stream.rs:82][E: codex-rs/tui/src/markdown_stream.rs:83][E: codex-rs/tui/src/markdown_stream.rs:95][E: codex-rs/tui/src/markdown_stream.rs:100][E: codex-rs/tui/src/markdown_stream.rs:104]。
4. commit tick 先把 ordinary stream 和 plan stream 的 queue 汇总成 snapshot，计算总 queue depth 和最大 oldest age [E: codex-rs/tui/src/streaming/commit_tick.rs:93][E: codex-rs/tui/src/streaming/commit_tick.rs:106][E: codex-rs/tui/src/streaming/commit_tick.rs:107][E: codex-rs/tui/src/streaming/commit_tick.rs:110][E: codex-rs/tui/src/streaming/commit_tick.rs:111][E: codex-rs/tui/src/streaming/commit_tick.rs:114][E: codex-rs/tui/src/streaming/commit_tick.rs:116]。
5. adaptive policy 在 empty queue 时重置到 `Smooth`，在 depth/age 达到 enter 阈值时进入 `CatchUp`，在 depth/age 回落且 hold 时间满足时退出 [E: codex-rs/tui/src/streaming/chunking.rs:181][E: codex-rs/tui/src/streaming/chunking.rs:184][E: codex-rs/tui/src/streaming/chunking.rs:217][E: codex-rs/tui/src/streaming/chunking.rs:223][E: codex-rs/tui/src/streaming/chunking.rs:234][E: codex-rs/tui/src/streaming/chunking.rs:248][E: codex-rs/tui/src/streaming/chunking.rs:267][E: codex-rs/tui/src/streaming/chunking.rs:271][E: codex-rs/tui/src/streaming/chunking.rs:278][E: codex-rs/tui/src/streaming/chunking.rs:282]。
6. drain 应用阶段分别 drain ordinary stream 和 plan stream；ordinary stream 通过 `emit` 构造 `AgentMessageCell`，plan stream 通过 plan-specific emit 构造 proposed-plan stream cell [E: codex-rs/tui/src/streaming/commit_tick.rs:144][E: codex-rs/tui/src/streaming/commit_tick.rs:180][E: codex-rs/tui/src/streaming/commit_tick.rs:194][E: codex-rs/tui/src/streaming/controller.rs:107][E: codex-rs/tui/src/streaming/controller.rs:241]。

## 设计动机与权衡

- review 文档把问题定义为 streaming output 到达速度可能超过 one-line-per-tick animation，导致 queued lines 增长和 visible output lag；设计目标包括保留 baseline behavior、减少 display lag、保持 output order、避免 single-frame flush 和保持 policy transport-agnostic [E: docs/tui-stream-chunking-review.md:8][E: docs/tui-stream-chunking-review.md:9][E: docs/tui-stream-chunking-review.md:10][E: docs/tui-stream-chunking-review.md:14][E: docs/tui-stream-chunking-review.md:15][E: docs/tui-stream-chunking-review.md:16][E: docs/tui-stream-chunking-review.md:17][E: docs/tui-stream-chunking-review.md:18]。
- `CatchUp` 的 entering thresholds 同时看 depth 和 age，避免只按行数或只按时间造成误判；源码常量包括 enter depth 8、enter age 120ms、exit depth 2、exit age 40ms [E: codex-rs/tui/src/streaming/chunking.rs:85][E: codex-rs/tui/src/streaming/chunking.rs:90][E: codex-rs/tui/src/streaming/chunking.rs:95][E: codex-rs/tui/src/streaming/chunking.rs:100][I]。
- tuning 文档建议按 logical group 调参：先调 entry/exit thresholds，再调 hold windows，再调 severe gates，最后调 baseline cadence；这把进入/退出阈值作为一组，而不是把单个常量当作 magic number [E: docs/tui-stream-chunking-tuning.md:69][E: docs/tui-stream-chunking-tuning.md:71][E: docs/tui-stream-chunking-tuning.md:72][E: docs/tui-stream-chunking-tuning.md:73][E: docs/tui-stream-chunking-tuning.md:74][I]。
- validation 文档要求检查 trace target，并 review commit ticks、mode transitions、smooth/catchup ticks、drain-plan distribution、queue depth、oldest queued age 和 rapid re-entry count；这些指标用于捕捉性能/流畅度退化是从 validation goals 与 regression checks 得出的推断 [E: docs/tui-stream-chunking-validation.md:8][E: docs/tui-stream-chunking-validation.md:11][E: docs/tui-stream-chunking-validation.md:13][E: docs/tui-stream-chunking-validation.md:17][E: docs/tui-stream-chunking-validation.md:48][E: docs/tui-stream-chunking-validation.md:49][E: docs/tui-stream-chunking-validation.md:50][E: docs/tui-stream-chunking-validation.md:51][E: docs/tui-stream-chunking-validation.md:52][E: docs/tui-stream-chunking-validation.md:53][E: docs/tui-stream-chunking-validation.md:54][E: docs/tui-stream-chunking-validation.md:55][E: docs/tui-stream-chunking-validation.md:61][E: docs/tui-stream-chunking-validation.md:68][I]。

## gotcha

- `CatchUpOnly` tick 仍会计算 policy decision，但在 decision mode 不是 `CatchUp` 时返回 default output，不会 drain line [E: codex-rs/tui/src/streaming/commit_tick.rs:81][E: codex-rs/tui/src/streaming/commit_tick.rs:82][E: codex-rs/tui/src/streaming/commit_tick.rs:83]。
- severe backlog 有单独阈值：severe depth 64、severe age 300ms；排查慢终端时这些值比普通 enter 阈值更能说明“已经明显落后” [E: codex-rs/tui/src/streaming/chunking.rs:113][E: codex-rs/tui/src/streaming/chunking.rs:116][I]。
- plan stream 和 answer stream 都纳入同一个 queue snapshot；计划更新也可能推动全局 `CatchUp` 决策是从统一 snapshot 与 policy decision 输入得出的推断 [E: codex-rs/tui/src/streaming/commit_tick.rs:81][E: codex-rs/tui/src/streaming/commit_tick.rs:93][E: codex-rs/tui/src/streaming/commit_tick.rs:106][E: codex-rs/tui/src/streaming/commit_tick.rs:110][E: codex-rs/tui/src/streaming/commit_tick.rs:114][E: codex-rs/tui/src/streaming/commit_tick.rs:116][E: codex-rs/tui/src/streaming/chunking.rs:180][I]。

## Sources

- `codex-rs/tui/src/streaming`
- `docs/tui-stream-chunking-review.md`
- `docs/tui-stream-chunking-tuning.md`
- `docs/tui-stream-chunking-validation.md`

## 相关

- `subsys.tui.chatwidget`
- `subsys.tui.event-system`
- `subsys.tui.rendering-theming`
