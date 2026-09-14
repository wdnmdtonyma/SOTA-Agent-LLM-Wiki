---
id: subsys.evals.pi-harness
title: Pi 行为评测 Harness
kind: subsystem
tier: T2
pkg: evals
source:
  - packages/evals/package.json
  - packages/evals/README.md
  - packages/evals/scripts/run-evals.mjs
  - packages/evals/src/pi-harness.ts
  - packages/evals/src/docs.eval.ts
  - packages/evals/src/smoke.eval.ts
  - packages/evals/src/vitest-evals/artifacts.ts
  - packages/evals/test/pi-harness.test.ts
symbols:
  - PiCodingAgentInput
  - resolveModelSelection
  - createPiCodingAgentHarness
  - excludePiDocumentation
related:
  - subsys.evals.comparative-harness
  - subsys.coding-agent.agent-session
  - subsys.coding-agent.model-resolver
  - subsys.coding-agent.usage-accounting
evidence: explicit
status: verified
updated: 71dca871bc
---

> 私有 `@earendil-works/pi-evals` workspace（版本 `0.85.1`）把真实 `AgentSession` 适配成 `vitest-evals` harness，在临时 project / isolated `HOME` / `~/.pi/agent` 目录中运行模型驱动的端到端行为评测。[E: packages/evals/package.json:2] [E: packages/evals/package.json:3] [E: packages/evals/package.json:4] [E: packages/evals/README.md:3] [E: packages/evals/src/pi-harness.ts:143] [E: packages/evals/src/pi-harness.ts:144]

## 能回答的问题

- runner 怎样解析全局默认 provider/model，何时允许没有默认模型？
- `createPiCodingAgentHarness()` 能配置哪些 session 变量与输出投影？
- 单 prompt、prompt/reload 序列和 system prompt transform 怎样执行？
- transcript、usage、timing 与 native session artifact 包含什么？
- isolation、工具可用性、认证和清理有哪些边界？
- `docs.eval.ts` 怎样对照 `packages/coding-agent/docs` 与实现？

## Runner 与模型选择

`npm run eval` 调用 `scripts/run-evals.mjs`。CLI `--provider` / `--model` 优先于环境变量，任一来源都要求 provider/model 成对；其它参数原样透传给 Vitest。runner 允许全局 default 为 `none`，但此时每个实际执行的 harness 必须通过 `model` 显式选择模型。[E: packages/evals/package.json:8] [E: packages/evals/scripts/run-evals.mjs:25] [E: packages/evals/scripts/run-evals.mjs:72] [E: packages/evals/scripts/run-evals.mjs:78] [E: packages/evals/scripts/run-evals.mjs:80] [E: packages/evals/README.md:21]

CLI `--repetitions` / `--repetitions=` 与环境变量 `PI_EVAL_REPETITIONS` 解析为正整数 repetition count，缺省 1；非法值直接 `process.exit(1)`。该值写入子进程 `PI_EVAL_REPETITIONS`，供 `evalHarnessTable()` 的 `resolveEvalRepetitions()` 读取。suite 显式 `repetitions` 覆盖 CLI/env。`PI_EVAL_REPETITIONS` 是 eval runner 私有变量，不是产品 coding-agent env catalog 的一员。[E: packages/evals/scripts/run-evals.mjs:37] [E: packages/evals/scripts/run-evals.mjs:57] [E: packages/evals/scripts/run-evals.mjs:66] [E: packages/evals/scripts/run-evals.mjs:67] [E: packages/evals/scripts/run-evals.mjs:68] [E: packages/evals/scripts/run-evals.mjs:70] [E: packages/evals/scripts/run-evals.mjs:97] [E: packages/evals/README.md:42] [E: packages/evals/README.md:43]

每次 invocation 创建 artifact directory，并在新建时请求 mode `0700`；默认位置是 `.eval/<ISO-time>_<UUID>`，也可由 `PI_EVAL_ARTIFACT_DIR` 指定。已有的用户指定目录不会被 `mkdir({mode})` 重新 chmod。runner 把最终 default selection、repetition count 与 artifact path 打到 stderr，再以当前 Node 执行 Vitest。[E: packages/evals/scripts/run-evals.mjs:9] [E: packages/evals/scripts/run-evals.mjs:10] [E: packages/evals/scripts/run-evals.mjs:13] [E: packages/evals/scripts/run-evals.mjs:14] [E: packages/evals/scripts/run-evals.mjs:90] [E: packages/evals/scripts/run-evals.mjs:91] [E: packages/evals/scripts/run-evals.mjs:92] [E: packages/evals/scripts/run-evals.mjs:93] [E: packages/evals/scripts/run-evals.mjs:106] [I]

`resolveModelSelection()` 优先取 harness 的 `{ provider, id }`，否则读取 `PI_PROVIDER` / `PI_MODEL`；结果会 trim，缺任一字段立即报错。单元测试覆盖显式 model 覆盖环境 default、trim 与不完整选择。[E: packages/evals/src/pi-harness.ts:69] [E: packages/evals/src/pi-harness.ts:70] [E: packages/evals/src/pi-harness.ts:71] [E: packages/evals/src/pi-harness.ts:72] [E: packages/evals/test/pi-harness.test.ts:5] [E: packages/evals/test/pi-harness.test.ts:14] [E: packages/evals/test/pi-harness.test.ts:29]

## Harness 配置与 session 装配

`createPiCodingAgentHarness()` 支持稳定 `name`、显式 `model`、coding-agent `noTools`、工具 allowlist `tools`、`customTools`、完整 default system prompt 的 `transformSystemPrompt`，以及把最终 `response`、live `AgentSession`、`systemPrompt` 与 `agentDir` 投影成 JSON-safe domain output。没有自定义 `output` 时结果就是最后一次 prompt 的 assistant 文本。[E: packages/evals/src/pi-harness.ts:37] [E: packages/evals/src/pi-harness.ts:38] [E: packages/evals/src/pi-harness.ts:39] [E: packages/evals/src/pi-harness.ts:40] [E: packages/evals/src/pi-harness.ts:41] [E: packages/evals/src/pi-harness.ts:42] [E: packages/evals/src/pi-harness.ts:46] [E: packages/evals/src/pi-harness.ts:49] [E: packages/evals/src/pi-harness.ts:50] [E: packages/evals/src/pi-harness.ts:217] [E: packages/evals/src/pi-harness.ts:224]

每次 run 建立新的 `ModelRuntime`，解析目标 model，并在 `mkdtemp("pi-eval-")` 下创建 `workspace` cwd、`home` isolatedHome 与 `agentDir = isolatedHome/.pi/agent`（相对该临时 home 的 `~/.pi/agent`）。session services 使用 `SettingsManager.inMemory({ shellCommandPrefix })`：prefix 导出 `HOME=<isolatedHome>`，并 `unset PI_CODING_AGENT_DIR PI_EVAL_ARTIFACT_DIR PI_MODEL PI_PROVIDER PI_REASONING_LEVEL PI_SESSION_FILE PI_SESSION_ID`。thinking 固定为 `off`；工具是否禁用只由 `options.noTools` 决定，harness 不再强制关闭全部工具。[E: packages/evals/src/pi-harness.ts:137] [E: packages/evals/src/pi-harness.ts:141] [E: packages/evals/src/pi-harness.ts:142] [E: packages/evals/src/pi-harness.ts:143] [E: packages/evals/src/pi-harness.ts:144] [E: packages/evals/src/pi-harness.ts:164] [E: packages/evals/src/pi-harness.ts:169] [E: packages/evals/src/pi-harness.ts:170] [E: packages/evals/src/pi-harness.ts:182] [E: packages/evals/src/pi-harness.ts:184]

`transformSystemPrompt` 被装成 hidden inline extension `{ name: "eval-system-prompt-transform", hidden: true }`：factory 钩 `before_agent_start`，用 `event.systemPrompt` 跑 transform 并返回 `{ systemPrompt }`。有 transform 时 `resourceLoaderOptions` 只传 `{ extensionFactories }`，没有 `systemPromptOverride`；session 创建后唯一的 `reload()` 来自输入序列里的 `{ type: "reload" }` 步。[E: packages/evals/src/pi-harness.ts:148] [E: packages/evals/src/pi-harness.ts:150] [E: packages/evals/src/pi-harness.ts:151] [E: packages/evals/src/pi-harness.ts:153] [E: packages/evals/src/pi-harness.ts:154] [E: packages/evals/src/pi-harness.ts:155] [E: packages/evals/src/pi-harness.ts:172] [E: packages/evals/src/pi-harness.ts:212]

临时目录使 eval 开始时没有 project/global file extensions。第一个 prompt 前，代码断言 `extensionRunner.getExtensionPaths()` 在过滤掉 `<inline:eval-system-prompt-transform>` 之后为空。这个断言不等于禁用 resource reload：prompt/reload 序列可以在 workspace 中创建资源，再让 session reload 后使用它。[E: packages/evals/src/pi-harness.ts:197] [E: packages/evals/src/pi-harness.ts:199] [E: packages/evals/src/pi-harness.ts:201] [E: packages/evals/src/pi-harness.ts:212]

`excludePiDocumentation(defaultPrompt)` 按两个稳定标记切片，不改生产 prompt builder：`indexOf("\nPi documentation (read only")` 与 `lastIndexOf("\nCurrent working directory: ")`。缺任一标记即 throw。返回值是 documentation 标记之前的前缀加上 cwd 标记起的后缀；isolated eval 的空 workspace / 空 agentDir 使两标记之间通常没有 project context 或 skills，于是 baseline 与 candidate 只差 Pi documentation 块。[E: packages/evals/src/pi-harness.ts:57] [E: packages/evals/src/pi-harness.ts:58] [E: packages/evals/src/pi-harness.ts:59] [E: packages/evals/src/pi-harness.ts:60] [E: packages/evals/src/pi-harness.ts:61] [E: packages/evals/src/pi-harness.ts:62] [I]

## 输入、输出与 trace

`PiCodingAgentInput` 是一个 prompt string，或由 `{type:"prompt", content}` 与 `{type:"reload"}` 组成的序列。每个 prompt 必须新增 assistant message，且 `stopReason` 只能是 `stop` 或 `toolUse`：`stop` 时还要求 `getLastAssistantText()` 非空，否则抛错；`toolUse` 允许空文本并返回 `""`。整个序列至少要包含一个 prompt，output 取最后一次 prompt 的 response。[E: packages/evals/src/pi-harness.ts:29] [E: packages/evals/src/pi-harness.ts:110] [E: packages/evals/src/pi-harness.ts:117] [E: packages/evals/src/pi-harness.ts:118] [E: packages/evals/src/pi-harness.ts:123] [E: packages/evals/src/pi-harness.ts:124] [E: packages/evals/src/pi-harness.ts:125] [E: packages/evals/src/pi-harness.ts:207] [E: packages/evals/src/pi-harness.ts:215]

配置了 `transformSystemPrompt` 时，空结果在**第一次 prompt 之后**才抛 `System-prompt transform did not produce a non-empty prompt.`：检查点在 `promptAgent()` 返回后看 `evaluatedSystemPrompt?.trim()`；`{ type: "reload" }` 步不会跑这条空结果检查。[E: packages/evals/src/pi-harness.ts:153] [E: packages/evals/src/pi-harness.ts:207] [E: packages/evals/src/pi-harness.ts:208] [E: packages/evals/src/pi-harness.ts:209] [E: packages/evals/src/pi-harness.ts:212]

自定义 `output` 收到 `{ response, session, systemPrompt, agentDir }`。`systemPrompt` 优先用 transform 写入的 `evaluatedSystemPrompt`，否则退回 `evalSession.systemPrompt`。[E: packages/evals/src/pi-harness.ts:218] [E: packages/evals/src/pi-harness.ts:219] [E: packages/evals/src/pi-harness.ts:220] [E: packages/evals/src/pi-harness.ts:221] [E: packages/evals/src/pi-harness.ts:222]

normalized transcript 不只包含 user/assistant text：assistant content 中的 tool calls 会记录 id/name/normalized arguments，tool results 会记录 call id、tool name、文本或 JSON-safe content，并为失败 result 附 error。[E: packages/evals/src/pi-harness.ts:80] [E: packages/evals/src/pi-harness.ts:86] [E: packages/evals/src/pi-harness.ts:91] [E: packages/evals/src/pi-harness.ts:95] [E: packages/evals/src/pi-harness.ts:101] [E: packages/evals/src/pi-harness.ts:102]

usage 包含 provider/model、input/output/total tokens、tool call count、cache read/write tokens；只有 model pricing 任一费率非零时才附 `estimatedCostUsd`。run 返回前另加 wall-clock `timings.totalMs`。[E: packages/evals/src/pi-harness.ts:226] [E: packages/evals/src/pi-harness.ts:235] [E: packages/evals/src/pi-harness.ts:237] [E: packages/evals/src/pi-harness.ts:240] [E: packages/evals/src/pi-harness.ts:242] [E: packages/evals/src/pi-harness.ts:244] [E: packages/evals/src/pi-harness.ts:287]

## Session artifact 与清理

创建 `SessionManager` 后，harness 立即把 session id 记录为 `runId`。run 成功或失败后、删除临时目录之前，它会读取 native session JSONL 并写入 `piSessionJsonl` harness artifact；[subsys.evals.comparative-harness](./comparative-harness.md) 负责把 snapshot 绑定到 Vitest task 并持久化。[E: packages/evals/src/pi-harness.ts:175] [E: packages/evals/src/pi-harness.ts:176] [E: packages/evals/src/pi-harness.ts:260] [E: packages/evals/src/pi-harness.ts:262] [E: packages/evals/src/vitest-evals/artifacts.ts:13]

AbortSignal 在 prompt 前检查，并在 abort event 时调用 `AgentSession.abort()`；监听器总会移除。snapshot 之后依次 dispose session、递归删除 temp root；主 run 和 cleanup 同时失败时返回 `AggregateError`，cleanup 单独失败也不会被吞掉。[E: packages/evals/src/pi-harness.ts:110] [E: packages/evals/src/pi-harness.ts:192] [E: packages/evals/src/pi-harness.ts:194] [E: packages/evals/src/pi-harness.ts:250] [E: packages/evals/src/pi-harness.ts:269] [E: packages/evals/src/pi-harness.ts:274] [E: packages/evals/src/pi-harness.ts:281] [E: packages/evals/src/pi-harness.ts:283] [E: packages/evals/src/pi-harness.ts:284]

## 文档审计 eval

`packages/evals/src/docs.eval.ts` 用同一 `createPiCodingAgentHarness` 对 `packages/coding-agent/docs/**/*.md` 做实现对照审计，不另建 wiki 节点。[E: packages/evals/src/docs.eval.ts:35] [E: packages/evals/src/docs.eval.ts:36] [E: packages/evals/src/docs.eval.ts:46]

Harness 名叫 `documentation-page-audit`，工具 allowlist 是 `read` / `grep` / `find` / `ls` 加上自定义 `submit_documentation_audit`。该 tool 用 TypeBox object schema 收 `verdict`（`match`/`mismatch`）、`explanation`、`documentationEvidence`、`implementationEvidence`，并 `terminate: true`。[E: packages/evals/src/docs.eval.ts:9] [E: packages/evals/src/docs.eval.ts:15] [E: packages/evals/src/docs.eval.ts:17] [E: packages/evals/src/docs.eval.ts:29] [E: packages/evals/src/docs.eval.ts:41] [E: packages/evals/src/docs.eval.ts:42]

每个文档页跑一次 300s timeout 的 prompt：以实现和测试为权威，只在 claim/example/procedure 与代码矛盾时报 mismatch。结束必须恰好调用一次 audit tool，且该次调用 `status === "ok"`、`verdict === "match"` 才通过。[E: packages/evals/src/docs.eval.ts:47] [E: packages/evals/src/docs.eval.ts:58] [E: packages/evals/src/docs.eval.ts:63] [E: packages/evals/src/docs.eval.ts:64] [E: packages/evals/src/docs.eval.ts:66] [E: packages/evals/src/docs.eval.ts:68]

## L2 边界

- 这是 repository-internal private package，不是发布给下游的 runtime API。[E: packages/evals/package.json:4]
- harness 使用真实 `ModelRuntime` 与 Pi 正常认证来源，不 mock provider；模型行为、服务可用性与凭据仍影响可复现性。[E: packages/evals/README.md:21] [E: packages/evals/README.md:22]
- `ModelRuntime.create()` 在 adapter 里不传 isolated `modelsPath`；bash 隔离靠 `shellCommandPrefix` 的 `HOME` / unset，Node 进程自身的 `process.env.HOME` 不会被改写。[E: packages/evals/src/pi-harness.ts:137] [E: packages/evals/src/pi-harness.ts:170] [I]
- smoke eval 明确传 `noTools:"all"`，只能证明无工具的基本端到端 prompt；工具、reload 与 extension 行为由 comparative extension eval 覆盖。[E: packages/evals/src/smoke.eval.ts:5] [E: packages/evals/src/smoke.eval.ts:7] [E: packages/evals/src/smoke.eval.ts:9]
- native artifacts 可能含 prompts、responses、source code 与 tool output，应按敏感运行记录处理。[E: packages/evals/README.md:77] [E: packages/evals/README.md:78]

## Sources

- packages/evals/package.json
- packages/evals/README.md
- packages/evals/scripts/run-evals.mjs
- packages/evals/src/pi-harness.ts
- packages/evals/src/docs.eval.ts
- packages/evals/src/smoke.eval.ts
- packages/evals/src/vitest-evals/artifacts.ts
- packages/evals/test/pi-harness.test.ts

## 相关

- [subsys.evals.comparative-harness](./comparative-harness.md): baseline/candidate planning、`--repetitions`、artifact persistence 与 paired summary。
- [subsys.coding-agent.agent-session](../coding-agent/agent-session.md): eval harness 驱动的产品 session façade。
- [subsys.coding-agent.model-resolver](../coding-agent/model-resolver.md): provider/model 与认证解析。
- [subsys.coding-agent.usage-accounting](../coding-agent/usage-accounting.md): token、tool call 与 cost 统计来源。
