---
id: sdk.ts-overview
title: TypeScript SDK 总览
kind: sdk
tier: T1
source: [sdk/typescript/src/codex.ts, sdk/typescript/src/thread.ts, sdk/typescript/src/exec.ts, sdk/typescript/src/codexOptions.ts, sdk/typescript/src/threadOptions.ts, sdk/typescript/src/turnOptions.ts]
symbols: [Codex, Thread, Turn, RunResult, StreamedTurn, UserInput, Input, CodexOptions, ThreadOptions, CodexExec]
related: [sdk.ts-events-items, sdk.ts-structured-output, sdk.sdk-architecture]
evidence: explicit
status: verified
updated: 5670360009
---

> TypeScript SDK 是围绕 `Codex`、`Thread` 和 `CodexExec` 的 thin wrapper：它启动或恢复 conversation thread，把 input 转成 prompt/images，再通过 Codex CLI `exec --experimental-json` 流式读取 JSONL events。[E: sdk/typescript/src/codex.ts:11][E: sdk/typescript/src/codex.ts:25][E: sdk/typescript/src/codex.ts:36][E: sdk/typescript/src/thread.ts:76][E: sdk/typescript/src/thread.ts:77][E: sdk/typescript/src/exec.ts:86][E: sdk/typescript/src/exec.ts:87][E: sdk/typescript/src/exec.ts:222]

## 能回答的问题

- TS SDK 的 public entry point 是什么？
- `startThread()` 和 `resumeThread()` 如何创建 `Thread`？
- `Thread.runStreamed()` 和 `Thread.run()` 的差异是什么？
- `CodexOptions`、`ThreadOptions`、`TurnOptions` 暴露哪些字段？
- TS SDK 如何把结构化 input 变成 CLI prompt 和 image flags？

## Public classes

`Codex` constructor 接收 `CodexOptions`，从中取 `codexPathOverride`、`env`、`config` 创建 `CodexExec`；`startThread()` 返回没有 id 的新 `Thread`，`resumeThread(id)` 返回带已有 id 的 `Thread`。[E: sdk/typescript/src/codex.ts:15][E: sdk/typescript/src/codex.ts:16][E: sdk/typescript/src/codex.ts:17][E: sdk/typescript/src/codex.ts:25][E: sdk/typescript/src/codex.ts:26][E: sdk/typescript/src/codex.ts:36][E: sdk/typescript/src/codex.ts:37]

`Thread` 保存 `_exec`、SDK options、thread options 和 nullable `_id`；`id` getter 在 first `thread.started` event 前可为 null，收到 `thread.started` 后 SDK 把 event 的 `thread_id` 写回 `_id`。[E: sdk/typescript/src/thread.ts:42][E: sdk/typescript/src/thread.ts:43][E: sdk/typescript/src/thread.ts:44][E: sdk/typescript/src/thread.ts:45][E: sdk/typescript/src/thread.ts:48][E: sdk/typescript/src/thread.ts:57][E: sdk/typescript/src/thread.ts:59][E: sdk/typescript/src/thread.ts:60][E: sdk/typescript/src/thread.ts:61][E: sdk/typescript/src/thread.ts:62][E: sdk/typescript/src/thread.ts:104][E: sdk/typescript/src/thread.ts:105]

`Turn`/`RunResult` 是 completed turn shape，包含 completed `items`、`finalResponse` 和 nullable `usage`；`StreamedTurn`/`RunStreamedResult` 暴露 `events: AsyncGenerator<ThreadEvent>`。[E: sdk/typescript/src/thread.ts:10][E: sdk/typescript/src/thread.ts:11][E: sdk/typescript/src/thread.ts:12][E: sdk/typescript/src/thread.ts:13][E: sdk/typescript/src/thread.ts:17][E: sdk/typescript/src/thread.ts:20][E: sdk/typescript/src/thread.ts:21][E: sdk/typescript/src/thread.ts:25]

## Options schema

`CodexOptions` 包含 `codexPathOverride`、`baseUrl`、`apiKey`、`config` 和 `env`；`config` 的值类型是 string/number/boolean/array/nested object，SDK 会把 object flatten 成 CLI-compatible `--config key=value` overrides。[E: sdk/typescript/src/codexOptions.ts:1][E: sdk/typescript/src/codexOptions.ts:5][E: sdk/typescript/src/codexOptions.ts:6][E: sdk/typescript/src/codexOptions.ts:7][E: sdk/typescript/src/codexOptions.ts:8][E: sdk/typescript/src/codexOptions.ts:16][E: sdk/typescript/src/codexOptions.ts:21][E: sdk/typescript/src/exec.ts:89][E: sdk/typescript/src/exec.ts:90][E: sdk/typescript/src/exec.ts:91][E: sdk/typescript/src/exec.ts:246][E: sdk/typescript/src/exec.ts:248][E: sdk/typescript/src/exec.ts:252][E: sdk/typescript/src/exec.ts:257][E: sdk/typescript/src/exec.ts:259][E: sdk/typescript/src/exec.ts:276][E: sdk/typescript/src/exec.ts:287][E: sdk/typescript/src/exec.ts:292]

`ThreadOptions` 暴露 model、sandbox mode、working directory、skip git repo check、reasoning effort、network access、web search mode/legacy flag、approval policy 和 additional directories；`TurnOptions` 只有 per-turn `outputSchema` 和 `AbortSignal`。[E: sdk/typescript/src/threadOptions.ts:10][E: sdk/typescript/src/threadOptions.ts:11][E: sdk/typescript/src/threadOptions.ts:12][E: sdk/typescript/src/threadOptions.ts:13][E: sdk/typescript/src/threadOptions.ts:14][E: sdk/typescript/src/threadOptions.ts:15][E: sdk/typescript/src/threadOptions.ts:16][E: sdk/typescript/src/threadOptions.ts:17][E: sdk/typescript/src/threadOptions.ts:18][E: sdk/typescript/src/threadOptions.ts:19][E: sdk/typescript/src/turnOptions.ts:3][E: sdk/typescript/src/turnOptions.ts:5]

## Run control flow

`runStreamed()` 返回 `runStreamedInternal()` 生成的 async generator；内部先创建 output schema temp file，再把 input normalize 成 prompt/images，随后调用 `CodexExec.run()`。[E: sdk/typescript/src/thread.ts:66][E: sdk/typescript/src/thread.ts:67][E: sdk/typescript/src/thread.ts:70][E: sdk/typescript/src/thread.ts:74][E: sdk/typescript/src/thread.ts:76][E: sdk/typescript/src/thread.ts:77]

`CodexExec.run()` command args 从 `["exec", "--experimental-json"]` 开始；SDK 根据 options 追加 `--config`、`--model`、`--sandbox`、`--cd`、`--add-dir`、`--skip-git-repo-check`、`--output-schema`、`resume <threadId>` 和 `--image`。[E: sdk/typescript/src/exec.ts:86][E: sdk/typescript/src/exec.ts:87][E: sdk/typescript/src/exec.ts:89][E: sdk/typescript/src/exec.ts:90][E: sdk/typescript/src/exec.ts:91][E: sdk/typescript/src/exec.ts:102][E: sdk/typescript/src/exec.ts:103][E: sdk/typescript/src/exec.ts:106][E: sdk/typescript/src/exec.ts:107][E: sdk/typescript/src/exec.ts:110][E: sdk/typescript/src/exec.ts:111][E: sdk/typescript/src/exec.ts:114][E: sdk/typescript/src/exec.ts:116][E: sdk/typescript/src/exec.ts:120][E: sdk/typescript/src/exec.ts:121][E: sdk/typescript/src/exec.ts:124][E: sdk/typescript/src/exec.ts:125][E: sdk/typescript/src/exec.ts:151][E: sdk/typescript/src/exec.ts:152][E: sdk/typescript/src/exec.ts:155][E: sdk/typescript/src/exec.ts:157]

`CodexExec.run()` spawn CLI process 后把 prompt 写入 stdin，按 stdout line 逐行 yield JSONL string；如果进程 exit code 非 0 或被 signal 终止，SDK 把 stderr 拼进 thrown `Error`。[E: sdk/typescript/src/exec.ts:181][E: sdk/typescript/src/exec.ts:193][E: sdk/typescript/src/exec.ts:194][E: sdk/typescript/src/exec.ts:200][E: sdk/typescript/src/exec.ts:204][E: sdk/typescript/src/exec.ts:222][E: sdk/typescript/src/exec.ts:229][E: sdk/typescript/src/exec.ts:230][E: sdk/typescript/src/exec.ts:232]

`Thread.run()` 消费同一个 internal stream：遇到 `item.completed` 时收集 item，并把 agent_message item text 作为 final response；遇到 `turn.completed` 时记录 usage；遇到 `turn.failed` 时抛出 error。[E: sdk/typescript/src/thread.ts:116][E: sdk/typescript/src/thread.ts:122][E: sdk/typescript/src/thread.ts:123][E: sdk/typescript/src/thread.ts:124][E: sdk/typescript/src/thread.ts:126][E: sdk/typescript/src/thread.ts:127][E: sdk/typescript/src/thread.ts:128][E: sdk/typescript/src/thread.ts:129][E: sdk/typescript/src/thread.ts:130][E: sdk/typescript/src/thread.ts:135]

## Input model

TS SDK 的 `UserInput` 目前支持 `text` 和 `local_image` 两种 item；`Input` 可以是 string 或 `UserInput[]`。[E: sdk/typescript/src/thread.ts:30][E: sdk/typescript/src/thread.ts:31][E: sdk/typescript/src/thread.ts:34][E: sdk/typescript/src/thread.ts:35][E: sdk/typescript/src/thread.ts:38] `normalizeInput()` 把 string 直接当 prompt，把 text items 用两个换行拼接成 prompt，把 local images 收集为 `images` 数组交给 CLI `--image`。[E: sdk/typescript/src/thread.ts:82][E: sdk/typescript/src/thread.ts:141][E: sdk/typescript/src/thread.ts:143][E: sdk/typescript/src/thread.ts:149][E: sdk/typescript/src/thread.ts:151][E: sdk/typescript/src/thread.ts:154][E: sdk/typescript/src/exec.ts:155][E: sdk/typescript/src/exec.ts:157]

## 设计动机

TS SDK 的设计更像“typed programmatic facade over `codex exec`”，而不是 app-server RPC client：它把用户关心的 thread/run/stream API 保持很小，把复杂行为交给 CLI exec JSON event stream。[I] 这种设计让 Node SDK 可以复用已有 CLI distribution 和 platform binary resolver，同时避免维护第二套 app-server JSON-RPC transport。[I]

## Sources

- `sdk/typescript/src/codex.ts`
- `sdk/typescript/src/thread.ts`
- `sdk/typescript/src/exec.ts`
- `sdk/typescript/src/codexOptions.ts`
- `sdk/typescript/src/threadOptions.ts`
- `sdk/typescript/src/turnOptions.ts`

## 相关

- `sdk.ts-events-items` -> [TypeScript events/items](ts-events-items.md)
- `sdk.ts-structured-output` -> [TypeScript structured output](ts-structured-output.md)
- `sdk.sdk-architecture` -> [SDK 架构对照](sdk-architecture.md)
