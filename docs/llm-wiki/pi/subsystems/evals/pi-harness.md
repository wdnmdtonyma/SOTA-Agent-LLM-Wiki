---
id: subsys.evals.pi-harness
title: Pi 行为评测 Harness
kind: subsystem
tier: T2
pkg: evals
source:
  - packages/evals/package.json
  - packages/evals/README.md
  - packages/evals/src/pi-harness.ts
  - packages/evals/scripts/run-evals.mjs
symbols:
  - piCodingAgentHarness
  - runPiEval
related:
  - subsys.coding-agent.agent-session
  - subsys.coding-agent.model-resolver
  - subsys.coding-agent.usage-accounting
evidence: explicit
status: verified
updated: cee5ff7520
---

> 私有 `@earendil-works/pi-evals` workspace 用 `vitest-evals` 驱动真实 coding-agent session，在隔离临时目录中运行行为评测。

## 执行路径

包被标记为 private，`npm run eval` 交给 runner；runner 要求 provider/model 成对提供，可来自 CLI 或 `PI_PROVIDER` / `PI_MODEL`，然后把其它参数透传给 Vitest。[E: packages/evals/package.json:2] [E: packages/evals/package.json:4] [E: packages/evals/package.json:8] [E: packages/evals/scripts/run-evals.mjs:13] [E: packages/evals/scripts/run-evals.mjs:40] [E: packages/evals/scripts/run-evals.mjs:45] [E: packages/evals/scripts/run-evals.mjs:60]

`runPiEval()` 创建 `ModelRuntime` 并要求模型与认证都可用；随后建立 workspace/agent 临时目录、in-memory settings/session，禁用 extensions、skills、prompt templates、themes、context files 和全部工具，thinking 固定为 off。[E: packages/evals/src/pi-harness.ts:37] [E: packages/evals/src/pi-harness.ts:46] [E: packages/evals/src/pi-harness.ts:49] [E: packages/evals/src/pi-harness.ts:55] [E: packages/evals/src/pi-harness.ts:61] [E: packages/evals/src/pi-harness.ts:71] [E: packages/evals/src/pi-harness.ts:76] [E: packages/evals/src/pi-harness.ts:85] [E: packages/evals/src/pi-harness.ts:91] [E: packages/evals/src/pi-harness.ts:92]

一次 prompt 必须得到 `stop` assistant 与非空文本，结果返回简化 user/assistant events，以及从 session stats 得到的 input/output/total tokens；abort 会转给 session，并在成功或失败路径清理 session 与临时目录。[E: packages/evals/src/pi-harness.ts:111] [E: packages/evals/src/pi-harness.ts:117] [E: packages/evals/src/pi-harness.ts:125] [E: packages/evals/src/pi-harness.ts:129] [E: packages/evals/src/pi-harness.ts:134] [E: packages/evals/src/pi-harness.ts:149] [E: packages/evals/src/pi-harness.ts:158] [E: packages/evals/src/pi-harness.ts:163]

## L2 证伪与边界

- 这是 repository-internal eval package，不是发布给下游的 runtime API。[E: packages/evals/package.json:4]
- harness 明确禁用所有 tools 与资源扩展，因此现有 general-knowledge eval 不能证明工具调用、skill 或 extension 行为。[E: packages/evals/src/pi-harness.ts:76] [E: packages/evals/src/pi-harness.ts:92]
- provider/model 无默认 fallback，认证也不会被 mock；评测可复现性仍依赖所选远端模型与凭据。[E: packages/evals/src/pi-harness.ts:37] [E: packages/evals/src/pi-harness.ts:51] [E: packages/evals/src/pi-harness.ts:55]

## Sources

- packages/evals/package.json
- packages/evals/README.md
- packages/evals/src/pi-harness.ts
- packages/evals/scripts/run-evals.mjs

## 相关

- [subsys.coding-agent.agent-session](../coding-agent/agent-session.md): eval harness 驱动的产品 session façade。
- [subsys.coding-agent.model-resolver](../coding-agent/model-resolver.md): provider/model 与认证解析。
- [subsys.coding-agent.usage-accounting](../coding-agent/usage-accounting.md): eval result token totals 的来源。
