---
id: execution.background
title: 后台 jobs(ephemeral)
kind: subsystem
tier: T2
v: shared
source:
  - packages/opencode/src/background/job.ts
  - packages/core/src/background-job.ts
  - packages/opencode/src/tool/task.ts
  - packages/core/src/tool/builtins.ts
symbols:
  - BackgroundJob.Service
  - BackgroundJob.make
  - TaskTool
related:
  - tool.task
evidence: explicit
status: verified
updated: 8b68dc0d7
---

> Background jobs 是一个进程内、非 durable 的 job registry：core 提供 `BackgroundJob.make` 引擎，V1 用 `packages/opencode/src/background/job.ts` 包成 instance-scoped service，当前主要由 V1 `task` tool 的 experimental background subagents 使用；V2 builtins 尚未移植 task/background leaf。

## 能回答的问题

- background job 状态为什么重启后会丢？
- V1 wrapper 如何把 core engine 变成 instance-scoped service？
- `TaskTool` 的 foreground/background 模式怎样使用 job registry？
- `extend`、`promote`、`waitForPromotion` 分别做什么？
- V2 当前是否有 background subagent tool？

## V1

V1 wrapper re-export core `BackgroundJob` 类型，并用 `InstanceState.make(() => CoreBackgroundJob.make)` 为每个 instance 创建一个 registry [E: packages/opencode/src/background/job.ts:6] [E: packages/opencode/src/background/job.ts:21]。wrapper 的 service 方法只是把 `list/get/start/extend/wait/waitForPromotion/promote/cancel` 转发到当前 instance 的 core registry [E: packages/opencode/src/background/job.ts:22] [E: packages/opencode/src/background/job.ts:30]。

`TaskTool` 取得 `BackgroundJob.Service`，并只在 `params.background === true` 且 runtime flag `experimentalBackgroundSubagents` 开启时允许真正 background；否则会报 `Background subagents require OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS=true`。`experimentalBackgroundSubagents` 由 `enabledByExperimental("OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS")` 驱动，当特定变量 `OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS=true` 或 umbrella `OPENCODE_EXPERIMENTAL=true` 时均为 true。[E: packages/opencode/src/tool/task.ts:85] [E: packages/opencode/src/tool/task.ts:97] [E: packages/opencode/src/tool/task.ts:98] [E: packages/opencode/src/tool/task.ts:100] [E: packages/opencode/src/effect/runtime-flags.ts:11] [E: packages/opencode/src/effect/runtime-flags.ts:43]。tool 参数里的 `background` 字段只有在 `Parameters` schema 中存在，旧 json schema 在未开实验 flag 时退回 `BaseParameters`，避免模型看到 background 字段 [E: packages/opencode/src/tool/task.ts:58] [E: packages/opencode/src/tool/task.ts:337] [E: packages/opencode/src/tool/task.ts:341]。

Task 启动时使用 child session id 作为 job id，`background.start({ id: nextSession.id, type: "task", title, metadata, onPromote, run })` [E: packages/opencode/src/tool/task.ts:259] [E: packages/opencode/src/tool/task.ts:260] [E: packages/opencode/src/tool/task.ts:261] [E: packages/opencode/src/tool/task.ts:264] [E: packages/opencode/src/tool/task.ts:271]。如果同一 job 仍 running，`background.extend({ id: nextSession.id, run })` 返回 true 后会返回 background updated output；core `extend` 把新 run 接到 previous tail 后执行 [E: packages/opencode/src/tool/task.ts:242] [E: packages/core/src/background-job.ts:263] [E: packages/core/src/background-job.ts:267] [E: packages/core/src/background-job.ts:282] [E: packages/core/src/background-job.ts:283]。

Foreground task 不是绕过 background registry；它同样 start job，然后 race `background.wait(...)` 与 `background.waitForPromotion(...)`。如果 job 被 promote 成 background，foreground call 返回 background started output [E: packages/opencode/src/tool/task.ts:259] [E: packages/opencode/src/tool/task.ts:309] [E: packages/opencode/src/tool/task.ts:310] [E: packages/opencode/src/tool/task.ts:311] [E: packages/opencode/src/tool/task.ts:313]。

## V2

Core background job engine 在 `packages/core/src/background-job.ts`，但它的 service tag 是 `@opencode/BackgroundJob`，不是 `@opencode/v2/...` [E: packages/core/src/background-job.ts:99]。V2 static built-in layer merge `ApplyPatchTool`、`BashTool`、`EditTool`、read/search/write、Question、Skill、Todo、Web tools 等 Location-scoped tools，没有 `TaskTool` entry [E: packages/core/src/tool/builtins.ts:35] [E: packages/core/src/tool/builtins.ts:46]。因此 V2 core 当前没有等价的 model-facing background task tool；只有可复用的 process-local engine 与 V1 wrapper 使用它 [I]。

## Core 数据模型

| 实体 | 字段 | 说明 | 证据 |
|---|---|---|---|
| `Info` | `id`, `type`, `title?`, `status`, `started_at`, `completed_at?`, `output?`, `error?`, `metadata?` | 对外可见 job snapshot | [E: packages/core/src/background-job.ts:9] [E: packages/core/src/background-job.ts:18] |
| `Active` | `info`, `done`, `scope`, `token`, `pending`, `next`, `output?`, `tail`, `promoted`, `onPromote?` | 运行中 job 内部状态 | [E: packages/core/src/background-job.ts:21] [E: packages/core/src/background-job.ts:31] |
| `StartInput` | `id?`, `type`, `title?`, `metadata?`, `onPromote?`, `run` | 启动 job 的 effect payload | [E: packages/core/src/background-job.ts:64] [E: packages/core/src/background-job.ts:70] |
| `ExtendInput` | `id`, `run` | 追加同一 job 后续 run | [E: packages/core/src/background-job.ts:73] [E: packages/core/src/background-job.ts:75] |

## Core 控制流

1. `make` 创建 `SynchronizedRef<Map<string, Active>>` 和 service scope [E: packages/core/src/background-job.ts:120] [E: packages/core/src/background-job.ts:122] [E: packages/core/src/background-job.ts:123]。
2. `make` 的状态只有进程内 `SynchronizedRef<Map<string, Active>>` 和当前 `Scope.Scope`，没有数据库或 event-store dependency [E: packages/core/src/background-job.ts:121] [E: packages/core/src/background-job.ts:122] [E: packages/core/src/background-job.ts:123]。因此 registry 是 process-local、非 durable [I]。
3. `start` 在 uninterruptibleMask 内生成 id、timestamps、deferreds 和 closeable scope；同 id running job 存在时返回 existing snapshot，不重复启动 [E: packages/core/src/background-job.ts:202] [E: packages/core/src/background-job.ts:205] [E: packages/core/src/background-job.ts:207] [E: packages/core/src/background-job.ts:208] [E: packages/core/src/background-job.ts:214] [E: packages/core/src/background-job.ts:217]。
4. 新 job 会 fork `restore(input.run)` 到 job scope，完成后调用 `settle`；tail deferred 保证 extend 能串行 [E: packages/core/src/background-job.ts:180] [E: packages/core/src/background-job.ts:182] [E: packages/core/src/background-job.ts:243] [E: packages/core/src/background-job.ts:249]。
5. `extend` 只对 running job 生效，增加 `pending` 与 `next` sequence，并 fork 一个等待 previous tail 后执行的新 run [E: packages/core/src/background-job.ts:263] [E: packages/core/src/background-job.ts:269] [E: packages/core/src/background-job.ts:270] [E: packages/core/src/background-job.ts:282] [E: packages/core/src/background-job.ts:283]。
6. `settle` 用 token 和 sequence 防旧 run 覆盖新 job；只有所有 pending run 完成后才把 status 设为 `completed|cancelled|error` [E: packages/core/src/background-job.ts:136] [E: packages/core/src/background-job.ts:138] [E: packages/core/src/background-job.ts:143] [E: packages/core/src/background-job.ts:146]。
7. `promote` 会把 `metadata.background` 设为 true，succeed `promoted` deferred，并执行 `onPromote` [E: packages/core/src/background-job.ts:321] [E: packages/core/src/background-job.ts:323] [E: packages/core/src/background-job.ts:332] [E: packages/core/src/background-job.ts:333]。
8. `cancel` 把 running job 标为 `cancelled`，succeed done，并 close job scope [E: packages/core/src/background-job.ts:347] [E: packages/core/src/background-job.ts:349] [E: packages/core/src/background-job.ts:355] [E: packages/core/src/background-job.ts:356]。

## 设计动机与权衡

这个 registry 的可观测状态来自进程内 Map 和 Scope，没有持久化层 [E: packages/core/src/background-job.ts:121] [E: packages/core/src/background-job.ts:123]。这让 V1 background subagent 实现轻量，代价是进程重启后无法恢复 job status 或 live work [I]。

## Gotcha

- `background=true` 是 V1 task experimental flag 行为，不是 V2 default core agent 行为。
- `waitForPromotion` 对已经 metadata.background 的 job 立即返回；对不存在或非 running job 会 `Effect.never` [E: packages/core/src/background-job.ts:305] [E: packages/core/src/background-job.ts:306]。
- `output` 保存的是 sequence 最大的成功 run 输出，而不是拼接所有 run 输出 [E: packages/core/src/background-job.ts:138] [E: packages/core/src/background-job.ts:139] [E: packages/core/src/background-job.ts:140]。
- Background jobs 没有 SQLite 表；不要在 V2 database schema 里找 job persistence。

## Sources

- packages/opencode/src/background/job.ts
- packages/core/src/background-job.ts
- packages/opencode/src/tool/task.ts
- packages/core/src/tool/builtins.ts

## 相关

- [Task 工具](../../surface/tools/task.md)
