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
  - packages/evals/src/smoke.eval.ts
  - packages/evals/src/vitest-evals/artifacts.ts
  - packages/evals/test/pi-harness.test.ts
symbols:
  - PiCodingAgentInput
  - resolveModelSelection
  - createPiCodingAgentHarness
related:
  - subsys.evals.comparative-harness
  - subsys.coding-agent.agent-session
  - subsys.coding-agent.model-resolver
  - subsys.coding-agent.usage-accounting
evidence: explicit
status: verified
updated: a8ee03b815
---

> 私有 `@earendil-works/pi-evals` workspace 把真实 `AgentSession` 适配成 `vitest-evals` harness，在临时 project/agent 目录中运行模型驱动的端到端行为评测。[E: packages/evals/package.json:2] [E: packages/evals/package.json:4] [E: packages/evals/README.md:3] [E: packages/evals/README.md:4]

## 能回答的问题

- runner 怎样解析全局默认 provider/model，何时允许没有默认模型？
- `createPiCodingAgentHarness()` 能配置哪些 session 变量与输出投影？
- 单 prompt、prompt/reload 序列和 system prompt transform 怎样执行？
- transcript、usage、timing 与 native session artifact 包含什么？
- isolation、工具可用性、认证和清理有哪些边界？

## Runner 与模型选择

`npm run eval` 调用 `scripts/run-evals.mjs`。CLI `--provider` / `--model` 优先于环境变量，任一来源都要求 provider/model 成对；其它参数原样透传给 Vitest。runner 允许全局 default 为 `none`，但此时每个实际执行的 harness 必须通过 `model` 显式选择模型。[E: packages/evals/package.json:8] [E: packages/evals/scripts/run-evals.mjs:22] [E: packages/evals/scripts/run-evals.mjs:24] [E: packages/evals/scripts/run-evals.mjs:46] [E: packages/evals/scripts/run-evals.mjs:51] [E: packages/evals/scripts/run-evals.mjs:57] [E: packages/evals/scripts/run-evals.mjs:59] [E: packages/evals/scripts/run-evals.mjs:83] [E: packages/evals/README.md:21]

每次 invocation 创建 artifact directory，并在新建时请求 mode `0700`；默认位置是 `.eval/<ISO-time>_<UUID>`，也可由 `PI_EVAL_ARTIFACT_DIR` 指定。已有的用户指定目录不会被 `mkdir({mode})` 重新 chmod。runner 把最终 default selection 与 artifact path 打到 stderr，再以当前 Node 执行 Vitest。[E: packages/evals/scripts/run-evals.mjs:9] [E: packages/evals/scripts/run-evals.mjs:11] [E: packages/evals/scripts/run-evals.mjs:14] [E: packages/evals/scripts/run-evals.mjs:69] [E: packages/evals/scripts/run-evals.mjs:70] [E: packages/evals/scripts/run-evals.mjs:71] [E: packages/evals/scripts/run-evals.mjs:84] [I]

`resolveModelSelection()` 优先取 harness 的 `{ provider, id }`，否则读取 `PI_PROVIDER` / `PI_MODEL`；结果会 trim，缺任一字段立即报错。单元测试覆盖显式 model 覆盖环境 default、trim 与不完整选择。[E: packages/evals/src/pi-harness.ts:46] [E: packages/evals/src/pi-harness.ts:50] [E: packages/evals/src/pi-harness.ts:52] [E: packages/evals/src/pi-harness.ts:55] [E: packages/evals/test/pi-harness.test.ts:5] [E: packages/evals/test/pi-harness.test.ts:14] [E: packages/evals/test/pi-harness.test.ts:29]

## Harness 配置与 session 装配

`createPiCodingAgentHarness()` 支持稳定 `name`、显式 `model`、coding-agent `noTools`、完整 default system prompt transform，以及把最终 response 与 live `AgentSession` 投影成 JSON-safe domain output。没有自定义 output 时结果就是最后一条 assistant 文本。[E: packages/evals/src/pi-harness.ts:35] [E: packages/evals/src/pi-harness.ts:37] [E: packages/evals/src/pi-harness.ts:38] [E: packages/evals/src/pi-harness.ts:39] [E: packages/evals/src/pi-harness.ts:42] [E: packages/evals/src/pi-harness.ts:179] [E: packages/evals/src/pi-harness.ts:246] [E: packages/evals/src/pi-harness.ts:254]

每次 run 建立新的 `ModelRuntime`，解析目标 model，并创建独立临时 root、workspace 与 agent directory。session services 使用 in-memory settings；thinking 固定为 `off`，工具是否禁用只由 `options.noTools` 决定，不再由 harness 强制关闭全部工具。[E: packages/evals/src/pi-harness.ts:117] [E: packages/evals/src/pi-harness.ts:118] [E: packages/evals/src/pi-harness.ts:119] [E: packages/evals/src/pi-harness.ts:122] [E: packages/evals/src/pi-harness.ts:130] [E: packages/evals/src/pi-harness.ts:131] [E: packages/evals/src/pi-harness.ts:135] [E: packages/evals/src/pi-harness.ts:141] [E: packages/evals/src/pi-harness.ts:148] [E: packages/evals/src/pi-harness.ts:149]

临时目录使 eval 开始时没有 project/global extensions；代码在第一个 prompt 前显式断言 extension path 列表为空。这个断言不等于禁用 resource reload：prompt/reload 序列可以在 workspace 中创建资源，再让 session reload 后使用它。[E: packages/evals/src/pi-harness.ts:122] [E: packages/evals/src/pi-harness.ts:124] [E: packages/evals/src/pi-harness.ts:166] [E: packages/evals/src/pi-harness.ts:167] [E: packages/evals/src/pi-harness.ts:169] [E: packages/evals/src/pi-harness.ts:171] [E: packages/evals/src/pi-harness.ts:175]

若配置 `transformSystemPrompt`，services 先安装 deferred override callback；session 创建后读取完整 default prompt，执行 transform，拒绝空结果并 reload，使 override 生效。[E: packages/evals/src/pi-harness.ts:136] [E: packages/evals/src/pi-harness.ts:137] [E: packages/evals/src/pi-harness.ts:153] [E: packages/evals/src/pi-harness.ts:154] [E: packages/evals/src/pi-harness.ts:155] [E: packages/evals/src/pi-harness.ts:156] [E: packages/evals/src/pi-harness.ts:157]

## 输入、输出与 trace

`PiCodingAgentInput` 是一个 prompt string，或由 `{type:"prompt", content}` 与 `{type:"reload"}` 组成的序列。每个 prompt 必须新增 assistant message、以 `stop` 结束并产生非空文本；整个序列至少要包含一个 prompt，output 取最后一次 prompt 的 response。[E: packages/evals/src/pi-harness.ts:28] [E: packages/evals/src/pi-harness.ts:90] [E: packages/evals/src/pi-harness.ts:92] [E: packages/evals/src/pi-harness.ts:98] [E: packages/evals/src/pi-harness.ts:99] [E: packages/evals/src/pi-harness.ts:104] [E: packages/evals/src/pi-harness.ts:169] [E: packages/evals/src/pi-harness.ts:173] [E: packages/evals/src/pi-harness.ts:178]

normalized transcript 不只包含 user/assistant text：assistant content 中的 tool calls 会记录 id/name/normalized arguments，tool results 会记录 call id、tool name、文本或 JSON-safe content，并为失败 result 附 error。[E: packages/evals/src/pi-harness.ts:58] [E: packages/evals/src/pi-harness.ts:61] [E: packages/evals/src/pi-harness.ts:67] [E: packages/evals/src/pi-harness.ts:72] [E: packages/evals/src/pi-harness.ts:76] [E: packages/evals/src/pi-harness.ts:82] [E: packages/evals/src/pi-harness.ts:83]

usage 包含 provider/model、input/output/total tokens、tool call count、cache read/write tokens；只有 model pricing 任一费率非零时才附 `estimatedCostUsd`。run 返回前另加 wall-clock `timings.totalMs`。[E: packages/evals/src/pi-harness.ts:180] [E: packages/evals/src/pi-harness.ts:181] [E: packages/evals/src/pi-harness.ts:189] [E: packages/evals/src/pi-harness.ts:190] [E: packages/evals/src/pi-harness.ts:192] [E: packages/evals/src/pi-harness.ts:195] [E: packages/evals/src/pi-harness.ts:197] [E: packages/evals/src/pi-harness.ts:199] [E: packages/evals/src/pi-harness.ts:242]

## Session artifact 与清理

创建 `SessionManager` 后，harness 立即把 session id 记录为 `runId`。run 成功或失败后、删除临时目录之前，它会读取 native session JSONL 并写入 `piSessionJsonl` harness artifact；`subsys.evals.comparative-harness` 负责把 snapshot 绑定到 Vitest task 并持久化。[E: packages/evals/src/pi-harness.ts:141] [E: packages/evals/src/pi-harness.ts:142] [E: packages/evals/src/pi-harness.ts:212] [E: packages/evals/src/pi-harness.ts:215] [E: packages/evals/src/pi-harness.ts:217] [E: packages/evals/src/vitest-evals/artifacts.ts:13]

AbortSignal 在 prompt 前检查，并在 abort event 时调用 `AgentSession.abort()`；监听器总会移除。snapshot 之后依次 dispose session、递归删除 temp root；主 run 和 cleanup 同时失败时返回 `AggregateError`，cleanup 单独失败也不会被吞掉。[E: packages/evals/src/pi-harness.ts:91] [E: packages/evals/src/pi-harness.ts:159] [E: packages/evals/src/pi-harness.ts:160] [E: packages/evals/src/pi-harness.ts:163] [E: packages/evals/src/pi-harness.ts:204] [E: packages/evals/src/pi-harness.ts:205] [E: packages/evals/src/pi-harness.ts:223] [E: packages/evals/src/pi-harness.ts:229] [E: packages/evals/src/pi-harness.ts:234] [E: packages/evals/src/pi-harness.ts:238]

## L2 边界

- 这是 repository-internal private package，不是发布给下游的 runtime API。[E: packages/evals/package.json:4]
- harness 使用真实 `ModelRuntime` 与 Pi 正常认证来源，不 mock provider；模型行为、服务可用性与凭据仍影响可复现性。[E: packages/evals/README.md:21] [E: packages/evals/README.md:22]
- smoke eval 明确传 `noTools:"all"`，只能证明无工具的基本端到端 prompt；工具、reload 与 extension 行为由 comparative extension eval 覆盖。[E: packages/evals/src/smoke.eval.ts:5] [E: packages/evals/src/smoke.eval.ts:7] [E: packages/evals/src/smoke.eval.ts:9]
- native artifacts 可能含 prompts、responses、source code 与 tool output，应按敏感运行记录处理。[E: packages/evals/README.md:32] [E: packages/evals/README.md:33]

## Sources

- packages/evals/package.json
- packages/evals/README.md
- packages/evals/scripts/run-evals.mjs
- packages/evals/src/pi-harness.ts
- packages/evals/src/smoke.eval.ts
- packages/evals/src/vitest-evals/artifacts.ts
- packages/evals/test/pi-harness.test.ts

## 相关

- [subsys.evals.comparative-harness](./comparative-harness.md): baseline/candidate planning、artifact persistence 与 paired summary。
- [subsys.coding-agent.agent-session](../coding-agent/agent-session.md): eval harness 驱动的产品 session façade。
- [subsys.coding-agent.model-resolver](../coding-agent/model-resolver.md): provider/model 与认证解析。
- [subsys.coding-agent.usage-accounting](../coding-agent/usage-accounting.md): token、tool call 与 cost 统计来源。
