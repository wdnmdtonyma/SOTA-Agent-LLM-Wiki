---
id: subsys.evals.pi-harness
title: Pi 行为评测 Harness
kind: subsystem
tier: T2
pkg: evals
source:
  - packages/evals/package.json
  - packages/evals/README.md
  - packages/evals/src/cli.ts
  - packages/evals/src/docker.ts
  - packages/evals/src/plan.ts
  - packages/evals/src/harness.ts
  - packages/evals/evals/smoke.eval.ts
  - packages/evals/evals/documentation-audit.eval.ts
  - packages/evals/vitest.evals.config.ts
  - packages/evals/test/harness.test.ts
  - packages/evals/docker/entrypoint.ts
symbols:
  - PiCodingAgentInput
  - PiCodingAgentHarnessOptions
  - resolveModelSelection
  - applyIsolatedEnvironment
  - verifySystemPrompt
  - createPiCodingAgentHarness
  - DOCUMENTATION_EVAL_TOOLS
  - resolveDocumentationVariant
  - excludePiDocumentation
  - createPiDocumentationEvalHarness
  - buildImages
  - discoverCases
  - runTask
related:
  - subsys.evals.comparative-harness
  - subsys.coding-agent.agent-session
  - subsys.coding-agent.model-resolver
  - subsys.coding-agent.usage-accounting
evidence: explicit
status: verified
updated: ff72faba28
---

> 私有 `@earendil-works/pi-evals`（版本 `0.87.1`）把真实 `AgentSession` 适配成 `vitest-evals` harness。`evals/` 扁平用例：`*.docs.eval.ts` 是文档 lift，由 `eval:docs` 在 Docker `without_docs` / `with_docs` 镜像里成对跑；其它 `*.eval.ts` 是 host，由 `eval:host` 在本机 Vitest 直接跑。runner 在 `src/`（`cli.ts` / `docker.ts` / `plan.ts` / `report.ts` / `harness.ts`）。[E: packages/evals/package.json:2] [E: packages/evals/package.json:3] [E: packages/evals/package.json:4] [E: packages/evals/README.md:7] [E: packages/evals/README.md:9] [E: packages/evals/README.md:10] [E: packages/evals/README.md:12]

## 能回答的问题

- `eval` / `eval:host` / `eval:docs` 怎样分流用例？CLI 怎样解析 `--provider` / `--model` / `--runs-per-variant`？
- `createPiCodingAgentHarness()` 能配置哪些 session 变量、workspace fixture 与输出投影？
- 单 prompt、prompt/reload 序列、abort 与 cleanup 怎样执行？
- isolation（临时 HOME、`PI_EVAL_*` 擦除、容器 sandbox）和认证从哪来？
- 文档 eval 默认工具为什么不含 shell？`createPiDocumentationEvalHarness()` 为何拒绝在 host 上跑？
- host 套件 `smoke.eval.ts` 与 `documentation-audit.eval.ts` 各断言什么？

## 职责边界

`@earendil-works/pi-evals` 是 repository-internal private package，不是发布给下游的 runtime API。[E: packages/evals/package.json:4]

`eval:host` 用 Vitest `--project host` 跑本机用例；`eval:docs` 用 `node --experimental-strip-types src/cli.ts` 编排 Docker 比较；`eval` 先 host 再 docs，`--` 之后的额外 CLI 参数只传给 `eval:docs`。[E: packages/evals/package.json:8] [E: packages/evals/package.json:9] [E: packages/evals/package.json:10] [E: packages/evals/README.md:30]

`createPiCodingAgentHarness()` 是 vitest-evals adapter：每次 run 建隔离 workspace / HOME / `~/.pi/agent`，驱动真实 `AgentSession`。文档 lift 的成对规划、镜像差异与 pass-rate 报告在 [subsys.evals.comparative-harness](./comparative-harness.md)，不在本节点展开。

## 关键文件

- `packages/evals/package.json`: 脚本 `eval` / `eval:host` / `eval:docs` / `test`；`test` 走 `vitest.test.config.ts`（`test/**/*.test.ts`），与行为评测分离。[E: packages/evals/package.json:8] [E: packages/evals/package.json:9] [E: packages/evals/package.json:10] [E: packages/evals/package.json:11]
- `packages/evals/vitest.evals.config.ts`: `docs` project 只 `include` `evals/**/*.docs.eval.ts`；`host` project `include` `evals/**/*.eval.ts` 并 `exclude` `evals/**/*.docs.eval.ts`。两者 `fileParallelism: false`、`maxWorkers: 1`、timeout 300s。容器内 `PI_EVAL_CONTAINER === "1"` 时不加 coding-agent workspace source alias，解析已安装的 `dist/`。[E: packages/evals/vitest.evals.config.ts:9] [E: packages/evals/vitest.evals.config.ts:10] [E: packages/evals/vitest.evals.config.ts:18] [E: packages/evals/vitest.evals.config.ts:15] [E: packages/evals/vitest.evals.config.ts:16] [E: packages/evals/vitest.evals.config.ts:26] [E: packages/evals/vitest.evals.config.ts:27] [E: packages/evals/vitest.evals.config.ts:46]
- `packages/evals/src/cli.ts`: `eval:docs` 入口。解析 CLI、建 `.eval/<timestamp>_<id>/`、build 两镜像、discover、`createTaskPlan`、逐 arm `runTask`、写 `protocol.json` / `observations.jsonl` / `report.*`。[E: packages/evals/src/cli.ts:27] [E: packages/evals/src/cli.ts:128] [E: packages/evals/src/cli.ts:151]
- `packages/evals/src/docker.ts`: `buildImages` / `discoverCases` / `runTask` / `requireEvalAuthFile`。容器 `--read-only` + tmpfs，auth 只读挂载。[E: packages/evals/src/docker.ts:38] [E: packages/evals/src/docker.ts:101] [E: packages/evals/src/docker.ts:161]
- `packages/evals/src/harness.ts`: `createPiCodingAgentHarness`、`createPiDocumentationEvalHarness`、`DOCUMENTATION_EVAL_TOOLS`、隔离与 transcript/usage 投影。[E: packages/evals/src/harness.ts:471] [E: packages/evals/src/harness.ts:485] [E: packages/evals/src/harness.ts:517]
- `packages/evals/evals/smoke.eval.ts`、`packages/evals/evals/documentation-audit.eval.ts`: 当前 host 套件。文档 lift 用例是 `evals/*.docs.eval.ts`，权威描述在 [subsys.evals.comparative-harness](./comparative-harness.md)。

## 数据模型

`PiCodingAgentInput` 是 prompt `string`，或 `{ type: "prompt"; content: string } | { type: "reload" }` 序列。[E: packages/evals/src/harness.ts:43]

`PiCodingAgentHarnessOptions` 可配稳定 `name`、显式 `{ provider, id }` `model`、coding-agent `noTools` / `tools` / `customTools`、相对 workspace 的 `workspaceFiles`、完整 default system prompt 的 `transformSystemPrompt`，以及 `expectedPiDocumentation`（由文档 harness 写入，host 套件通常不设）。带 `output` 的变体把 `{ response, session, systemPrompt, agentDir }` 投影成 JSON-safe domain output；没有 `output` 时结果就是最后一次 prompt 的 assistant 文本。[E: packages/evals/src/harness.ts:50] [E: packages/evals/src/harness.ts:51] [E: packages/evals/src/harness.ts:52] [E: packages/evals/src/harness.ts:53] [E: packages/evals/src/harness.ts:54] [E: packages/evals/src/harness.ts:55] [E: packages/evals/src/harness.ts:56] [E: packages/evals/src/harness.ts:57] [E: packages/evals/src/harness.ts:58] [E: packages/evals/src/harness.ts:61] [E: packages/evals/src/harness.ts:415]

`DOCUMENTATION_EVAL_TOOLS` 是 `read` / `write` / `edit` / `grep` / `find` / `ls`。文档 eval 默认工具不含 shell，也不含 web-search。[E: packages/evals/src/harness.ts:485] [E: packages/evals/README.md:90]

## Runner 与模型选择

`parseEvalCli`（`cli.ts` 模块局部）只接受 `--provider` / `--model` / `--runs-per-variant`、以 `.docs.eval.ts` 结尾的文件路径，以及 `-t` / `--testNamePattern` / `--testNamePattern=`。其它参数直接 throw。[E: packages/evals/src/cli.ts:24] [E: packages/evals/src/cli.ts:25] [E: packages/evals/src/cli.ts:37] [E: packages/evals/src/cli.ts:66]

CLI 一旦出现 `--provider` 或 `--model`，两者必须成对；否则读 `PI_PROVIDER` / `PI_MODEL`，只设其中一个会报错。解析结束后仍缺 provider 或 model 则拒绝启动：`eval:docs` 实际运行必须有模型。[E: packages/evals/src/cli.ts:71] [E: packages/evals/src/cli.ts:72] [E: packages/evals/src/cli.ts:76] [E: packages/evals/src/cli.ts:115] [E: packages/evals/README.md:55]

`--runs-per-variant` 与环境变量 `PI_EVAL_RUNS_PER_VARIANT` 解析为正整数，缺省 1；非 `Number.isSafeInteger` 或 `< 1` 抛错。`PI_EVAL_RUNS_PER_VARIANT` 是 eval runner 私有变量，不是产品 coding-agent env catalog 的一员。[E: packages/evals/src/cli.ts:79] [E: packages/evals/src/cli.ts:80] [E: packages/evals/src/cli.ts:81] [E: packages/evals/README.md:57] [E: packages/evals/README.md:65]

未在 CLI 点名文件时，默认 `globSync("evals/**/*.docs.eval.ts")`。路径必须落在 `packages/evals` 内且仍以 `.docs.eval.ts` 结尾。[E: packages/evals/src/cli.ts:118] [E: packages/evals/src/cli.ts:125] [E: packages/evals/src/cli.ts:96]

`resolveModelSelection()`（harness 内）优先取 options 的 `{ provider, id }`，否则读 `PI_PROVIDER` / `PI_MODEL`；结果会 trim，缺任一字段立即报错。单元测试覆盖显式 model 覆盖环境 default、trim 与不完整选择。[E: packages/evals/src/harness.ts:70] [E: packages/evals/src/harness.ts:74] [E: packages/evals/src/harness.ts:76] [E: packages/evals/test/harness.test.ts:16] [E: packages/evals/test/harness.test.ts:26] [E: packages/evals/test/harness.test.ts:32]

host 与 docs 都需要 `PI_PROVIDER` 和 `PI_MODEL`（或 docs 的等价 CLI 旗标）。`npm run eval -- --provider …` 不会把旗标传给 `eval:host`。[E: packages/evals/README.md:24] [E: packages/evals/README.md:30]

## eval:docs 控制流

1. `parseEvalCli@packages/evals/src/cli.ts:27` 解析 argv；`artifactRunId@packages/evals/src/cli.ts:89` 生成 `<ISO-time-with-colons-as-dashes>_<UUID>`，目录 `packages/evals/.eval/<id>/`，`mkdir` mode `0700`。[E: packages/evals/src/cli.ts:89] [E: packages/evals/src/cli.ts:128] [E: packages/evals/src/cli.ts:130] [E: packages/evals/README.md:94]
2. `requireEvalAuthFile@packages/evals/src/docker.ts:67` 要求 host `auth.json`（`PI_CODING_AGENT_DIR` 或 `~/.pi/agent`）存在且含所选 provider 的 credential。[E: packages/evals/src/docker.ts:67] [E: packages/evals/src/docker.ts:72] [E: packages/evals/src/docker.ts:84]
3. `buildImages@packages/evals/src/docker.ts:38` 对同一 `docker/Dockerfile` 分别 `--target without_docs` 与 `--target with_docs`；两镜像 id 相同则 abort。[E: packages/evals/src/docker.ts:47] [E: packages/evals/src/docker.ts:48] [E: packages/evals/src/cli.ts:132]
4. 对 `DOCUMENTATION_VARIANTS` 各跑一次 `discoverCases`（容器 `vitest list --project docs`），`compareDiscovery` 要求两变体 cohort 的 `(fullName, file)` 完全一致，再 `createTaskPlan(cases, provider/model, runsPerVariant)`。[E: packages/evals/src/cli.ts:144] [E: packages/evals/src/cli.ts:109] [E: packages/evals/src/cli.ts:151] [E: packages/evals/src/plan.ts:1] [E: packages/evals/src/docker.ts:145]
5. 写入 `protocol.json`（`schemaVersion: 1` + `protocolDigest` = SHA-256 of the protocol body）与 `expected-runs.json`。[E: packages/evals/src/cli.ts:153] [E: packages/evals/src/cli.ts:163] [E: packages/evals/src/cli.ts:168]
6. 按计划逐条 `runTask`。容器失败或没有 `vitest.json` 记 `erroredObservation`，不中断后续 arm；每步重写完整 `observations.jsonl`。[E: packages/evals/src/cli.ts:175] [E: packages/evals/src/cli.ts:176] [E: packages/evals/src/cli.ts:178] [E: packages/evals/src/docker.ts:172] [E: packages/evals/src/docker.ts:174] [E: packages/evals/README.md:76]
7. `summarizeEvalObservations` 写 `report.json` / `report.txt`。`blockedPairs.length > 0` 时 `process.exitCode = 1`。[E: packages/evals/src/cli.ts:186] [E: packages/evals/src/cli.ts:188] [E: packages/evals/src/cli.ts:192]

`dockerArgs` 给每个容器：`--rm --read-only`、`/tmp` 与 `/repo/node_modules/.vite-temp` 可执行 tmpfs、bind `/artifacts`、只读挂载 host `auth.json` 到 `/run/pi-eval-secrets/auth.json`，并注入 `PI_EVAL_ARTIFACT_DIR`、`PI_EVAL_RUNS_PER_VARIANT`、`PI_EVAL_SANDBOX_UID=65532`、`PI_EVAL_SANDBOX_GID=65532`、`PI_PROVIDER`、`PI_MODEL`。`PI_EVAL_VARIANT` 来自镜像 `ENV`，不在 `dockerArgs` 里覆盖。[E: packages/evals/src/docker.ts:100] [E: packages/evals/src/docker.ts:101] [E: packages/evals/src/docker.ts:103] [E: packages/evals/src/docker.ts:108] [E: packages/evals/src/docker.ts:110] [E: packages/evals/src/docker.ts:121]

## Harness 装配与 session

`createPiCodingAgentHarness()` 默认 name `pi-coding-agent`，`run` 调 `runPiCodingAgent`。[E: packages/evals/src/harness.ts:478] [E: packages/evals/src/harness.ts:479] [E: packages/evals/src/harness.ts:480]

每次 run：在 `getAgentDir()` 快照 **host** agent dir 之后，`mkdtemp("pi-eval-")` 下建 `workspace` cwd、`home` isolatedHome、`agentDir = isolatedHome/.pi/agent`。`applyIsolatedEnvironment` 把 `HOME` / `USERPROFILE` 指到 isolatedHome、`PI_CODING_AGENT_DIR` 指到 `agentDir`，并删除所有 `PI_EVAL_*` 环境变量（含 runner 自己的 `PI_EVAL_VARIANT` / `PI_EVAL_ARTIFACT_DIR`）；返回 restore 闭包。[E: packages/evals/src/harness.ts:281] [E: packages/evals/src/harness.ts:283] [E: packages/evals/src/harness.ts:284] [E: packages/evals/src/harness.ts:286] [E: packages/evals/src/harness.ts:82] [E: packages/evals/src/harness.ts:83] [E: packages/evals/src/harness.ts:86] [E: packages/evals/src/harness.ts:310] [E: packages/evals/test/harness.test.ts:41]

认证：从 **隔离前** 的 host `auth.json` 读 `readStoredCredential` 进 `InMemoryCredentialStore`，再 `ModelRuntime.create({ credentials })`。没有 stored credential 但 `getAuth` 给出 `apiKey` 时，走 `setRuntimeApiKey`。`ModelRuntime.create` 不传 isolated `modelsPath`。[E: packages/evals/src/harness.ts:312] [E: packages/evals/src/harness.ts:316] [E: packages/evals/src/harness.ts:325] [E: packages/evals/src/harness.ts:326]

`transformSystemPrompt` 装成 hidden inline extension `{ name: "eval-system-prompt-transform", hidden: true }`：`before_agent_start` 用 `event.systemPrompt` 跑 transform 并返回 `{ systemPrompt }`。session 创建后唯一的 `reload()` 来自输入序列里的 `{ type: "reload" }` 步。[E: packages/evals/src/harness.ts:289] [E: packages/evals/src/harness.ts:292] [E: packages/evals/src/harness.ts:295] [E: packages/evals/src/harness.ts:376]

`createAgentSessionFromServices` 固定 `thinkingLevel: "off"`；工具是否禁用只由 `options.noTools` / `options.tools` / `options.customTools` 决定。第一个 prompt 前断言 `extensionRunner.getExtensionPaths()` 去掉预期 `<inline:…>` 后为空——临时目录使 eval 开始时没有 project/global file extensions，但不禁止后续 prompt 写资源再 `reload`。[E: packages/evals/src/harness.ts:350] [E: packages/evals/src/harness.ts:351] [E: packages/evals/src/harness.ts:357] [E: packages/evals/src/harness.ts:361]

`workspaceFiles` 只允许相对路径；escape workspace 的绝对路径或 `..` 抛 `TypeError`，文件 mode `0600`。[E: packages/evals/src/harness.ts:227] [E: packages/evals/src/harness.ts:230] [E: packages/evals/src/harness.ts:234]

## 文档 harness 与 prompt 变体

`createPiDocumentationEvalHarness()` 要求 `PI_EVAL_CONTAINER === "1"` **且** `PI_EVAL_SANDBOX_UID` / `PI_EVAL_SANDBOX_GID` 都已设置，否则 throw `Documentation evals must run in the isolated container sandbox.`。variant 来自 `PI_EVAL_VARIANT`（必须是 `without_docs` 或 `with_docs`），并在 factory 时捕获进 harness `name`——之后 `applyIsolatedEnvironment` 会删掉 `PI_EVAL_*`。[E: packages/evals/src/harness.ts:526] [E: packages/evals/src/harness.ts:527] [E: packages/evals/src/harness.ts:529] [E: packages/evals/src/harness.ts:532] [E: packages/evals/test/harness.test.ts:113] [E: packages/evals/docker/entrypoint.ts:116]

默认 `tools` 为 `[...DOCUMENTATION_EVAL_TOOLS]`。`without_docs` 额外传入 `transformSystemPrompt: excludePiDocumentation`，`expectedPiDocumentation` 仅 `with_docs` 为 true。[E: packages/evals/src/harness.ts:533] [E: packages/evals/src/harness.ts:534] [E: packages/evals/src/harness.ts:535]

`excludePiDocumentation(defaultPrompt)` 删除 `\n<docs>\n` … `\n</docs>` 整段（含标记），并要求 `\n<cwd>\n` 出现在该段之后；缺标记即 throw。这是当前 default system prompt 的 XML 分区，不是旧的纯文本切片。[E: packages/evals/src/harness.ts:494] [E: packages/evals/src/harness.ts:495] [E: packages/evals/src/harness.ts:496] [E: packages/evals/src/harness.ts:501] [E: packages/evals/src/harness.ts:504] [E: packages/evals/test/harness.test.ts:72]

`verifySystemPrompt` 在有 `expectedPiDocumentation` 时要求 prompt 仍含 `\n<rules>\n`，并以是否含 `\n<docs>\nPi documentation (read only` 对齐变体。[E: packages/evals/src/harness.ts:261] [E: packages/evals/src/harness.ts:262] [E: packages/evals/src/harness.ts:265] [E: packages/evals/src/harness.ts:266]

## 输入、输出、trace 与清理

`promptAgent` 每个 prompt 必须新增 assistant message，且 `stopReason` 只能是 `stop` 或 `toolUse`：`stop` 时还要求 `getLastAssistantText()` 非空，否则抛错；`toolUse` 允许空文本并返回 `""`。整个序列至少要包含一个 prompt，output 取最后一次 prompt 的 response。[E: packages/evals/src/harness.ts:246] [E: packages/evals/src/harness.ts:247] [E: packages/evals/src/harness.ts:253] [E: packages/evals/src/harness.ts:385] [E: packages/evals/src/harness.ts:386]

AbortSignal 在 prompt 前 `throwIfAborted`，并在 abort event 时调用 `AgentSession.abort()`；监听器总会移除。[E: packages/evals/src/harness.ts:239] [E: packages/evals/src/harness.ts:369] [E: packages/evals/src/harness.ts:372] [E: packages/evals/src/harness.ts:382]

system prompt 优先用 transform 写入的 `forcedSystemPrompt`，否则 `getCurrentSystemPrompt(session.messages)`（transcript 里的当前 system，不是旧的 session 字段）。[E: packages/evals/src/harness.ts:390]

normalized transcript：user/assistant text、assistant tool calls（id/name/normalized arguments）、tool results（call id、tool name、文本或 JSON-safe content，失败时附 error）。[E: packages/evals/src/harness.ts:193] [E: packages/evals/src/harness.ts:202] [E: packages/evals/src/harness.ts:211] [E: packages/evals/src/harness.ts:217]

usage 含 provider/model、input/output/total tokens、tool call count、cache read/write tokens；只有 model pricing 任一费率非零时才附 `estimatedCostUsd`。run 返回前加 wall-clock `timings.totalMs`。metadata 另有 `systemPromptSha256`。[E: packages/evals/src/harness.ts:398] [E: packages/evals/src/harness.ts:399] [E: packages/evals/src/harness.ts:406] [E: packages/evals/src/harness.ts:409] [E: packages/evals/src/harness.ts:468]

`SessionManager.create` 后立即 `setArtifact("runId", sessionId)`。成功或失败后、删临时目录之前，读取 native session JSONL 写入 artifact 名 `piSessionJsonl`（常量在 `report.ts`）；没有 session 文件记 cleanup error。cleanup 依次 dispose session、`rm` temp root、restore env；主 run 与 cleanup 同时失败返回 `AggregateError`。[E: packages/evals/src/harness.ts:343] [E: packages/evals/src/harness.ts:344] [E: packages/evals/src/harness.ts:422] [E: packages/evals/src/harness.ts:426] [E: packages/evals/src/harness.ts:438] [E: packages/evals/src/harness.ts:450]

## 容器 sandbox

`PI_EVAL_SANDBOX_UID` / `PI_EVAL_SANDBOX_GID` 必须成对、为正整数。文档容器由 `dockerArgs` 设为 `65532`。`enterToolSandbox` 要求进程以 root 启动，chmod 保护 tmp 里 Vitest SSR 变换模块为 `0600`，`chownTree` 评测 root，然后 `setgroups([])` / `setgid` / `setuid` 永久降权；降权后若仍能读那些变换模块则 throw。[E: packages/evals/src/harness.ts:104] [E: packages/evals/src/harness.ts:116] [E: packages/evals/src/harness.ts:165] [E: packages/evals/src/harness.ts:169] [E: packages/evals/src/harness.ts:171] [E: packages/evals/src/harness.ts:186] [E: packages/evals/src/docker.ts:110]

sandbox 模式下，降权前删除 host agent dir 的 `auth.json`，并隐藏 `auth.source` 对应的 API key 环境变量，finally 再还原。[E: packages/evals/src/harness.ts:328] [E: packages/evals/src/harness.ts:329] [E: packages/evals/src/harness.ts:333] [E: packages/evals/src/harness.ts:443]

容器 entrypoint 把 evaluator `src/` / `evals/` / `docker/` / Vitest config 设为 root-only，并探测 UID 65532 不能读这些路径；coding-agent 必须解析到 `/repo/node_modules/@earendil-works/pi-coding-agent/dist/index.js`。[E: packages/evals/docker/entrypoint.ts:73] [E: packages/evals/docker/entrypoint.ts:87] [E: packages/evals/docker/entrypoint.ts:102] [E: packages/evals/docker/entrypoint.ts:103]

## Host 套件

`evals/smoke.eval.ts` 用 `createPiCodingAgentHarness({ noTools: "all" })`，断言首都问答输出 `Paris`、无 errors、usage provider/model 匹配环境变量且 `totalTokens > 0`。这是无工具的基本端到端 prompt，不是文档 lift。[E: packages/evals/evals/smoke.eval.ts:5] [E: packages/evals/evals/smoke.eval.ts:7] [E: packages/evals/evals/smoke.eval.ts:10] [E: packages/evals/evals/smoke.eval.ts:11]

`evals/documentation-audit.eval.ts` 是 **host** 审计（文件名不是 `*.docs.eval.ts`），harness 名 `documentation-page-audit`，工具 allowlist `read` / `grep` / `find` / `ls` 加上自定义 `submit_documentation_audit`。该 tool 用 TypeBox 收 `verdict`（`match` / `mismatch` / `inconclusive`）与 `explanation`（1–2000），`constrainedSampling` json_schema，`terminate: true`。[E: packages/evals/evals/documentation-audit.eval.ts:9] [E: packages/evals/evals/documentation-audit.eval.ts:17] [E: packages/evals/evals/documentation-audit.eval.ts:22] [E: packages/evals/evals/documentation-audit.eval.ts:27] [E: packages/evals/evals/documentation-audit.eval.ts:38] [E: packages/evals/evals/documentation-audit.eval.ts:39]

每个 `packages/coding-agent/docs/**/*.md` 跑一次 prompt：以实现路径上的 runtime 行为为权威，只在明确、用户可见的 claim 矛盾时报 mismatch；证据不足报 inconclusive。结束必须恰好一次 audit tool，且 `status === "ok"`、`verdict === "match"` 才通过。prompt 注入文档页与仓库的绝对路径。[E: packages/evals/evals/documentation-audit.eval.ts:33] [E: packages/evals/evals/documentation-audit.eval.ts:43] [E: packages/evals/evals/documentation-audit.eval.ts:51] [E: packages/evals/evals/documentation-audit.eval.ts:53] [E: packages/evals/evals/documentation-audit.eval.ts:60] [E: packages/evals/evals/documentation-audit.eval.ts:64]

## 设计动机、权衡与 gotcha

- 文档比较的隔离、identity、persistence、reporting 由 outer runner 拥有；eval 文件只应含 scenario、model task 与 deterministic grading。`judgeThreshold: null` 让低分成为 observation 而不是 Vitest infrastructure failure。[E: packages/evals/README.md:127] [E: packages/evals/README.md:129]
- 文档默认工具不含 shell：模型不能靠 bash 绕过文件工具或读 root-only evaluator 源。Provider 流量仍需要容器网络，Docker 不能证明 agent 写出的代码从不使用网络。[E: packages/evals/README.md:90]
- host eval 在开发机上走 workspace source alias；docs eval 在容器里走 packed `dist/`。两者都使用真实 `ModelRuntime` 与 Pi 正常认证来源，不 mock provider。[E: packages/evals/vitest.evals.config.ts:41] [E: packages/evals/docker/entrypoint.ts:103] [E: packages/evals/README.md:24]
- `applyIsolatedEnvironment` 改的是 `process.env.HOME`（因此 `os.homedir()` 会变），不是 bash `shellCommandPrefix`。sandbox 降权是 POSIX `setuid`，不是用户命名空间。[E: packages/evals/src/harness.ts:82] [E: packages/evals/test/harness.test.ts:48] [E: packages/evals/src/harness.ts:171]
- native artifacts 可能含 prompts、responses、source code 与 tool output，应按敏感运行记录处理。[E: packages/evals/README.md:107]

## 跨包边界

- [subsys.coding-agent.agent-session](../coding-agent/agent-session.md): eval 经 `createAgentSessionFromServices` 驱动的产品 session façade（`prompt` / `reload` / `abort` / `getSessionStats`）。
- [subsys.coding-agent.model-resolver](../coding-agent/model-resolver.md): `ModelRuntime.create` / `getModel` / `getAuth` 与 host `auth.json`。
- [subsys.coding-agent.usage-accounting](../coding-agent/usage-accounting.md): token、tool call、cache 与 `stats.cost` 的来源。
- [subsys.evals.comparative-harness](./comparative-harness.md): `without_docs`/`with_docs` 镜像内容、`(case, variant, runNumber)` 计划、lift 与 `.eval/` 报告格式。

## Sources

- packages/evals/package.json
- packages/evals/README.md
- packages/evals/src/cli.ts
- packages/evals/src/docker.ts
- packages/evals/src/plan.ts
- packages/evals/src/harness.ts
- packages/evals/evals/smoke.eval.ts
- packages/evals/evals/documentation-audit.eval.ts
- packages/evals/vitest.evals.config.ts
- packages/evals/test/harness.test.ts
- packages/evals/docker/entrypoint.ts

## 相关

- [subsys.evals.comparative-harness](./comparative-harness.md): Docker 文档变体、`createTaskPlan` 交替顺序、blocked pair 与 `report.json`/`report.txt`。
- [subsys.coding-agent.agent-session](../coding-agent/agent-session.md): eval harness 驱动的产品 session façade。
- [subsys.coding-agent.model-resolver](../coding-agent/model-resolver.md): provider/model 与认证解析。
- [subsys.coding-agent.usage-accounting](../coding-agent/usage-accounting.md): token、tool call 与 cost 统计来源。
