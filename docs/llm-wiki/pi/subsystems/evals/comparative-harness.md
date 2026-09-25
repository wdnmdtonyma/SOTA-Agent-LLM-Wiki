---
id: subsys.evals.comparative-harness
title: Comparative Eval、工件与报告
kind: subsystem
tier: T2
pkg: evals
source:
  - packages/evals/README.md
  - packages/evals/src/plan.ts
  - packages/evals/src/report.ts
  - packages/evals/src/cli.ts
  - packages/evals/src/harness.ts
  - packages/evals/docker/Dockerfile
  - packages/evals/docker/install-runtime.mjs
  - packages/evals/docker/entrypoint.ts
  - packages/evals/evals/extensions.docs.eval.ts
  - packages/evals/evals/models.docs.eval.ts
  - packages/evals/evals/openai-provider.docs.eval.ts
  - packages/evals/evals/custom-provider.docs.eval.ts
  - packages/evals/evals/tui.docs.eval.ts
  - packages/evals/evals/configured-runtime.ts
  - packages/evals/evals/acme-server.ts
  - packages/evals/test/plan.test.ts
  - packages/evals/test/report.test.ts
  - packages/evals/test/comparison.test.ts
symbols:
  - DOCUMENTATION_VARIANTS
  - parseDiscoveredCases
  - createTaskPlan
  - EvalTask
  - PI_SESSION_SNAPSHOT_ARTIFACT
  - readTaskObservation
  - summarizeEvalObservations
  - formatEvalComparisonReport
  - EvalComparisonReport
related:
  - subsys.evals.pi-harness
  - spine.extension-lifecycle
  - subsys.coding-agent.extension-loader
  - subsys.coding-agent.usage-accounting
evidence: explicit
status: verified
updated: ff72faba28
---

> `eval:docs` 把 `evals/*.docs.eval.ts` 发现的用例扩成 `(case, variant, model, runNumber)` 任务，在隔离的 `without_docs`（control）与 `with_docs`（treatment）容器里各跑一次，再把恰好一对 `scored` observation 编成 pass-rate lift。产物写在 `.eval/<timestamp>_<id>/`（`protocol.json`、`observations.jsonl`、`report.json`/`report.txt`）。[E: packages/evals/README.md:9] [E: packages/evals/src/plan.ts:1] [E: packages/evals/src/report.ts:77] [E: packages/evals/src/report.ts:78] [E: packages/evals/README.md:94]

## 能回答的问题

- `without_docs` 与 `with_docs` 镜像在安装内容和 system prompt 上差什么？
- `createTaskPlan()` 怎样把发现的 case 扩成任务，repetition 顺序为何交替？
- 一次 arm 的 Vitest JSON 怎样变成 `EvalObservation`？哪些 outcome 会 block pair？
- pass-rate lift、token/latency/cost delta 与 flags 怎样计算？何时 withheld headline？
- `.eval/<timestamp>_<id>/` 里有哪些文件，session JSONL 落在哪？
- 五个 `*.docs.eval.ts` 套件各比较什么，judge 检查哪些可观察行为？

## 职责边界

文档 lift 的实验变量是 **Docker 镜像 + 默认 system prompt 是否含 Pi documentation 段**，不是 host 上的 baseline/candidate harness table。`*.docs.eval.ts` 是普通 `describeEval` 单套件；outer runner 拥有 variants、repetitions、isolation、identity、persistence 与 reporting。[E: packages/evals/README.md:9] [E: packages/evals/README.md:127]

host 用例（`evals/smoke.eval.ts`、`evals/documentation-audit.eval.ts`）不是成对比较，见 [subsys.evals.pi-harness](./pi-harness.md)。本节点覆盖 `plan.ts`、`report.ts`、`docker/Dockerfile` 与全部 `evals/*.docs.eval.ts`。

## 关键文件

- `packages/evals/src/plan.ts`: `DOCUMENTATION_VARIANTS`、`parseDiscoveredCases`、`createTaskPlan`。[E: packages/evals/src/plan.ts:1] [E: packages/evals/src/plan.ts:21] [E: packages/evals/src/plan.ts:39]
- `packages/evals/src/report.ts`: `readTaskObservation`、`summarizeEvalObservations`（report `schemaVersion: 3`）、`formatEvalComparisonReport`、session 落盘。[E: packages/evals/src/report.ts:136] [E: packages/evals/src/report.ts:359] [E: packages/evals/src/report.ts:405] [E: packages/evals/src/report.ts:436]
- `packages/evals/docker/Dockerfile`: multi-stage `without_docs` / `with_docs`。[E: packages/evals/docker/Dockerfile:38] [E: packages/evals/docker/Dockerfile:42]
- `packages/evals/docker/install-runtime.mjs`: pack 当前 workspace 包、对称删除内部依赖的 docs/examples/src/test。[E: packages/evals/docker/install-runtime.mjs:15] [E: packages/evals/docker/install-runtime.mjs:33]
- `packages/evals/docker/entrypoint.ts`: 启动时校验 allowlist、root-only evaluator 源、`PI_EVAL_CONTAINER=1`。[E: packages/evals/docker/entrypoint.ts:27] [E: packages/evals/docker/entrypoint.ts:116]
- `packages/evals/evals/*.docs.eval.ts`: 五个文档 lift 场景；fixture 在 `evals/configured-runtime.ts` 与 `evals/acme-server.ts`。

## 数据模型

`DOCUMENTATION_VARIANTS = ["without_docs", "with_docs"]`。[E: packages/evals/src/plan.ts:1]

`DiscoveredEvalCase`：`file`、`fullName`、`evalSet`、`caseId`。Vitest list 的 `name` 必须是恰好一段 `"<eval set> > <case>"`；重复 identity 拒绝。[E: packages/evals/src/plan.ts:4] [E: packages/evals/src/plan.ts:28] [E: packages/evals/src/plan.ts:30] [E: packages/evals/src/plan.ts:33] [E: packages/evals/test/plan.test.ts:18]

`EvalTask` 在 case 上叠加 `variant`、`model`（必须含 `/` 且不在两端）、`runNumber`。[E: packages/evals/src/plan.ts:11] [E: packages/evals/src/plan.ts:44]

`EvalObservation` = run identity + 可选 metrics + `outcome`: `scored`（附 `score` ∈ [0, 1]）| `unscored` | `skipped` | `pending` | `errored`。零分仍是 `scored`，不是缺失。[E: packages/evals/src/report.ts:32] [E: packages/evals/src/report.ts:93] [E: packages/evals/test/report.test.ts:184]

`EvalComparisonReport`：`schemaVersion: 3`、`protocolDigest`、`control: "without_docs"`、`treatment: "with_docs"`、`comparisons[]`、`blockedPairs[]`、`operationalTotals[]`。[E: packages/evals/src/report.ts:75] [E: packages/evals/src/report.ts:405]

## Docker 变体

builder 阶段 ephemeral bind-mount 仓库、`npm ci`、`build:offline`，再 `install-runtime.mjs` 把当前 workspace tarball 装进 `/opt/evaluator`。两变体装同一份 runtime。[E: packages/evals/docker/Dockerfile:5] [E: packages/evals/docker/Dockerfile:10] [E: packages/evals/README.md:88]

`without-docs-install` 只删除 coding-agent 的 `README.md`、`CHANGELOG.md`、`docs/`、`examples/`。`without_docs` / `with_docs` stage 分别 COPY 这份或完整的 `node_modules`，并 `ENV PI_EVAL_VARIANT`。[E: packages/evals/docker/Dockerfile:15] [E: packages/evals/docker/Dockerfile:16] [E: packages/evals/docker/Dockerfile:38] [E: packages/evals/docker/Dockerfile:40] [E: packages/evals/docker/Dockerfile:42] [E: packages/evals/docker/Dockerfile:44]

`install-runtime.mjs` 对 **非** `pi-coding-agent` 的已打包内部包，删除名为 `docs` / `examples` / `src` / `test` / `tests` 的目录，以及 `readme*` / `changelog*` 文件，避免它们充当另一路说明书。[E: packages/evals/docker/install-runtime.mjs:34] [E: packages/evals/docker/install-runtime.mjs:39] [E: packages/evals/docker/install-runtime.mjs:40] [E: packages/evals/README.md:88]

entrypoint `assertWorkspace` 冻结 `/repo` 目录形状，要求 coding-agent 含 `package.json` / `npm-shrinkwrap.json` / `dist/index.js`。`without_docs` 不得再出现那四份 coding-agent 文档；`with_docs` 必须有非空的 `README.md`、`CHANGELOG.md`、`docs/models.md`、`examples/README.md`。内部依赖若仍含 docs/examples/src/test 则 throw。解析必须落在 `dist/index.js`。[E: packages/evals/docker/entrypoint.ts:28] [E: packages/evals/docker/entrypoint.ts:32] [E: packages/evals/docker/entrypoint.ts:48] [E: packages/evals/docker/entrypoint.ts:55] [E: packages/evals/docker/entrypoint.ts:103]

`without_docs` 在 harness 层还用 `excludePiDocumentation` 去掉 default prompt 的 `\n<docs>\n`…`\n</docs>` 段；`with_docs` 不传 transform，并用 `expectedPiDocumentation: true` 校验段仍在。实现见 [subsys.evals.pi-harness](./pi-harness.md)。[E: packages/evals/src/harness.ts:534] [E: packages/evals/src/harness.ts:535] [E: packages/evals/README.md:84] [E: packages/evals/README.md:86]

evaluator 源（`src/`、`evals/`、`docker/`、Vitest config）`chmod go-rwx`，Vitest 以 root 加载后 harness 永久降到 UID 65532，使模型工具与生成代码不能读 judge / fixture。[E: packages/evals/docker/Dockerfile:27] [E: packages/evals/docker/entrypoint.ts:73] [E: packages/evals/docker/entrypoint.ts:87]

## 任务规划

`createTaskPlan(cases, model, runsPerVariant)` 外层按 case，内层 `runNumber = 1..N`。奇数 run 顺序 `without_docs` 然后 `with_docs`，偶数相反，降低顺序偏差。`runsPerVariant` 必须是 `>= 1` 的安全整数。[E: packages/evals/src/plan.ts:51] [E: packages/evals/src/plan.ts:53] [E: packages/evals/src/plan.ts:54] [E: packages/evals/src/plan.ts:47] [E: packages/evals/README.md:80] [E: packages/evals/test/plan.test.ts:29]

`N=2` 时四个 task 的 `(variant, runNumber)` 为 `(without_docs,1)`、`(with_docs,1)`、`(with_docs,2)`、`(without_docs,2)`。[E: packages/evals/test/plan.test.ts:28] [E: packages/evals/test/plan.test.ts:30]

CLI `--runs-per-variant` / `PI_EVAL_RUNS_PER_VARIANT` 缺省 1；一次 repetition 不能建立稳定性。[E: packages/evals/src/cli.ts:80] [E: packages/evals/README.md:57] [E: packages/evals/README.md:105]

执行时 `runTask` 用精确 `testNamePattern` `^<evalSet> <caseId>$`（空格，不是 ` > `）在对应镜像里跑单个 case。缺 `vitest.json` 返回 `undefined`，CLI 记 `errored` 并继续计划队列。[E: packages/evals/src/docker.ts:163] [E: packages/evals/src/docker.ts:164] [E: packages/evals/src/docker.ts:174] [E: packages/evals/src/cli.ts:176]

## Observation 与成对统计

`readTaskObservation` 同时读 `@vitest-evals/core` workspace 与 raw Vitest JSON。必须恰好一条 assertion、`fullName === "<evalSet> <caseId>"`、恰好一个 workspace case、status 一致、存在 harness run、`usage.provider/model` 等于 task.model。读失败或形状不对 → `errored`。[E: packages/evals/src/report.ts:147] [E: packages/evals/src/report.ts:149] [E: packages/evals/src/report.ts:154] [E: packages/evals/src/report.ts:161] [E: packages/evals/src/report.ts:162]

`classifyCaseStatus`：Vitest `failed` → `errored`；`skipped` / `todo` / `disabled` → `skipped`；`pending` → `pending`。skipped/pending 在读 harness 之前就返回，因此可以没有 run。[E: packages/evals/src/report.ts:102] [E: packages/evals/src/report.ts:103] [E: packages/evals/src/report.ts:152] [E: packages/evals/test/report.test.ts:106]

metrics（tokens / toolCalls / totalMs / estimatedCostUsd / cache*）必须是有限非负数，否则整臂 `errored`。status 已是 errored 或 `run.errors.length > 0` 时保留 metrics、outcome 仍 `errored`。`avgScore` 非法 → `errored`；`avgScore` 缺失 → `unscored`。[E: packages/evals/src/report.ts:87] [E: packages/evals/src/report.ts:178] [E: packages/evals/src/report.ts:187] [E: packages/evals/src/report.ts:188] [E: packages/evals/test/report.test.ts:126]

`PI_SESSION_SNAPSHOT_ARTIFACT`（`"piSessionJsonl"`）若是 string，写到 `<artifactDir>/<variant>/sessions/<sha256(identity)>/session.jsonl`，目录 `0700`、文件 `0600`。identity = `[evalSet, caseId, variant, model, runNumber]`。缺 session 仍可 `scored`。[E: packages/evals/src/report.ts:9] [E: packages/evals/src/report.ts:123] [E: packages/evals/src/report.ts:125] [E: packages/evals/src/report.ts:132] [E: packages/evals/src/report.ts:133] [E: packages/evals/test/report.test.ts:204]

`resolvePair` 要求每个 variant **恰好** expected 1 且 observed 1 且 `outcome === "scored"`。缺 observation、重复、skipped/pending/unscored/errored 都进 `blockedPairs.reasons`，不会被填成失败或零 telemetry。[E: packages/evals/src/report.ts:254] [E: packages/evals/src/report.ts:260] [E: packages/evals/README.md:103]

`summarizeEvalObservations` 按 eval-set 聚合。仅当该 set **零** blocked pair 且至少一对 eligible 时才发布 headline：pass = `score >= 1`，`lift = treatmentPassRate - controlPassRate`。任一 pair 被 block → `controlPassRate` / `treatmentPassRate` / `lift` 全为 `null`。[E: packages/evals/src/report.ts:379] [E: packages/evals/src/report.ts:381] [E: packages/evals/src/report.ts:393] [E: packages/evals/test/comparison.test.ts:78] [E: packages/evals/test/comparison.test.ts:93]

tokens / toolCalls / totalMs / estimatedCostUsd 独立要求双方 metric 都 finite，报告 control/treatment mean 与 treatment−control delta。缺失保持 `unavailable`，不把缺测当 0；`totalTokens: 0` 仍计入 operational total。[E: packages/evals/src/report.ts:292] [E: packages/evals/src/report.ts:302] [E: packages/evals/README.md:103] [E: packages/evals/test/comparison.test.ts:111]

`comparisonFlags`：`no-lift`（两 pass rate 相等）、`negative-delta`（treatment < control）、`control-saturated` / `treatment-saturated`（rate === 1）、`flaky`（同一 `caseId+variant` 在不同 repetition 上 pass/fail 不一致）。[E: packages/evals/src/report.ts:339] [E: packages/evals/src/report.ts:340] [E: packages/evals/src/report.ts:341] [E: packages/evals/src/report.ts:342] [E: packages/evals/src/report.ts:355] [E: packages/evals/README.md:105]

`formatEvalComparisonReport` 标题 `Documentation Eval Comparisons`；lift 为 null 且有 blocked 时打印 `Pass rate  withheld because pairs are blocked`。随后 `Operational totals` 按变体汇总，再列出 blocked pair reasons。CLI 在 `blockedPairs.length > 0` 时非零退出。[E: packages/evals/src/report.ts:438] [E: packages/evals/src/report.ts:445] [E: packages/evals/src/report.ts:466] [E: packages/evals/src/cli.ts:192] [E: packages/evals/test/comparison.test.ts:121]

## 产物目录

每次 `eval:docs` invocation 建 ignored `.eval/<timestamp>_<id>/`：[E: packages/evals/src/cli.ts:128] [E: packages/evals/README.md:94]

| 路径 | 内容 |
|---|---|
| `protocol.json` | model、image ids、files、cases、tasks、`protocolDigest` [E: packages/evals/src/cli.ts:153] [E: packages/evals/src/cli.ts:166] |
| `expected-runs.json` | 完整 planned cohort [E: packages/evals/src/cli.ts:168] |
| `observations.jsonl` | 每臂结束后整文件重写的 normalized outcomes [E: packages/evals/src/cli.ts:181] |
| `discovery/<variant>/discovered-tests.json` | 容器 `vitest list` 输出 [E: packages/evals/src/docker.ts:143] [E: packages/evals/src/docker.ts:153] |
| `tasks/<sha256(identity)>/vitest.json` | 该 arm 的 native Vitest JSON [E: packages/evals/src/docker.ts:162] [E: packages/evals/src/docker.ts:173] |
| `<variant>/sessions/<sha256(identity)>/session.jsonl` | native Pi session [E: packages/evals/src/report.ts:128] [E: packages/evals/src/report.ts:133] |
| `report.json` / `report.txt` | `EvalComparisonReport` 与去色终端文本 [E: packages/evals/src/cli.ts:188] [E: packages/evals/src/cli.ts:189] |

task / session 目录名都是 SHA-256(`JSON.stringify([evalSet, caseId, variant, model, runNumber])`)。[E: packages/evals/src/docker.ts:157] [E: packages/evals/src/report.ts:125]

工件可能含完整 prompts、responses、generated source 与 tool output。[E: packages/evals/README.md:107]

## 文档 lift 套件

五个 shipped `*.docs.eval.ts` 都走 `createPiDocumentationEvalHarness`（因此默认工具 `DOCUMENTATION_EVAL_TOOLS`，无 shell），并用 `judgeThreshold: null`。[E: packages/evals/evals/extensions.docs.eval.ts:9] [E: packages/evals/evals/models.docs.eval.ts:25] [E: packages/evals/evals/openai-provider.docs.eval.ts:36] [E: packages/evals/evals/custom-provider.docs.eval.ts:45] [E: packages/evals/evals/tui.docs.eval.ts:188] [E: packages/evals/evals/extensions.docs.eval.ts:42]

**Create and use a tool extension**（`evals/extensions.docs.eval.ts`）：prompt 要求配置含 `hello({name})` 的 extension（不要建 project source），`reload`，再调用 `hello({ name: "Bob" })` 且最终 response 恰好 `Hello, Bob!`。tools allowlist 在文档默认集上加 `hello`。`output` 投影 `extensionErrors`、`toolLoaded`、`toolResult`。judges：`StructuredOutputJudge` strict（errors 空、toolLoaded true、response 与 toolResult 都是 `Hello, Bob!`）+ `ToolCallJudge` 期望该次调用。[E: packages/evals/evals/extensions.docs.eval.ts:10] [E: packages/evals/evals/extensions.docs.eval.ts:26] [E: packages/evals/evals/extensions.docs.eval.ts:30] [E: packages/evals/evals/extensions.docs.eval.ts:40] [E: packages/evals/evals/extensions.docs.eval.ts:45] [E: packages/evals/evals/extensions.docs.eval.ts:50] [E: packages/evals/evals/extensions.docs.eval.ts:52]

**Add model to existing provider**（`evals/models.docs.eval.ts`）：配置 `openai/fixture-chat`（显示名 `Fixture Chat`：text-only、reasoning、32768/4096、零费率），不要 project-local configuration，然后 reload。`inspectAddedModel(session.modelRuntime, …)` 要求新模型字段匹配，且内置 OpenAI 模型 id 在 refresh 后仍可取到（`existingModelsPreserved`）。[E: packages/evals/evals/models.docs.eval.ts:5] [E: packages/evals/evals/models.docs.eval.ts:9] [E: packages/evals/evals/models.docs.eval.ts:26] [E: packages/evals/evals/models.docs.eval.ts:30] [E: packages/evals/evals/models.docs.eval.ts:35] [E: packages/evals/evals/configured-runtime.ts:117]

**Add OpenAI-compatible provider**（`evals/openai-provider.docs.eval.ts`）：本机 loopback `createAcmeServer("openai")`。要求加入 provider id `acme`、Chat Completions base URL、从 `ACME_API_KEY` 读密钥、模型 `acme-chat` / `Acme Chat`（text-only、无 reasoning、32768/4096、零费率）。judge 经 `inspectProvider`：`completeSimple` 文本 `ACME_OK`、usage 3/2，且 fake server 收到合法 Bearer `resolved-acme-key` 的流式请求。probe 的 `options.env` 注入 `ACME_API_KEY`；suite 本身不 `stubEnv` 该变量。[E: packages/evals/evals/openai-provider.docs.eval.ts:13] [E: packages/evals/evals/openai-provider.docs.eval.ts:23] [E: packages/evals/evals/openai-provider.docs.eval.ts:32] [E: packages/evals/evals/openai-provider.docs.eval.ts:50] [E: packages/evals/evals/openai-provider.docs.eval.ts:55] [E: packages/evals/evals/acme-server.ts:3] [E: packages/evals/evals/acme-server.ts:101] [E: packages/evals/evals/configured-runtime.ts:77]

**Add custom streaming provider**（`evals/custom-provider.docs.eval.ts`）：`createAcmeServer("stream")`，`workspaceFiles` 写入 `fixtures/acme-stream-api.json`。要求 provider `acme-stream`、文档在该 fixture、credential 环境变量 `ACME_STREAM_API_KEY`（suite `beforeAll` 设为 `resolved-stream-key`）、模型 `acme-stream-chat` / `Acme Stream Chat`（16384/2048）。judge：`completeSimple` 拼出 `ACME_STREAM_OK`、usage 4/3，请求带 `x-acme-key` 且 `stream: true`。[E: packages/evals/evals/custom-provider.docs.eval.ts:16] [E: packages/evals/evals/custom-provider.docs.eval.ts:19] [E: packages/evals/evals/custom-provider.docs.eval.ts:46] [E: packages/evals/evals/custom-provider.docs.eval.ts:60] [E: packages/evals/evals/acme-server.ts:7] [E: packages/evals/evals/acme-server.ts:86] [E: packages/evals/evals/acme-server.ts:96]

**Customize the interactive context footer**（`evals/tui.docs.eval.ts`）：prompt 要求把内置 context 信息（如 `42.2%/272k (auto)`）换成十格进度条，百分比 clamp 到 0–100。`reload` 后 oracle 用 `InteractiveMode` + `RecordingTerminal` 在 `PI_OFFLINE=1` 下注入 42.2% / 65% / 120% fixture，自定义 `ContextFooterJudge`：无 extension errors、每档渲染含对应 bar（120% → `██████████ 100%`）、不再匹配内置 `%/272k` 模式，并用 Levenshtein 衡量其余 status 文本保留程度。valid 时 score 1 否则 0。[E: packages/evals/evals/tui.docs.eval.ts:249] [E: packages/evals/evals/tui.docs.eval.ts:253] [E: packages/evals/evals/tui.docs.eval.ts:258] [E: packages/evals/evals/tui.docs.eval.ts:18] [E: packages/evals/evals/tui.docs.eval.ts:195] [E: packages/evals/evals/tui.docs.eval.ts:238]

仓库里没有固定某次模型运行结果；实际结论仍取决于选定模型、认证、`--runs-per-variant` 与当次 observations。[I]

## 测试与设计边界

- `plan.test.ts`：Vitest `"<set> > <case>"` 拆 identity；拒绝少一段或重复；`createTaskPlan` 交替顺序；拒绝无 `/` 的 model 与非正 repetition。[E: packages/evals/test/plan.test.ts:7] [E: packages/evals/test/plan.test.ts:18] [E: packages/evals/test/plan.test.ts:25] [E: packages/evals/test/plan.test.ts:37]
- `report.test.ts`：skipped/pending 无 harness run 仍保留 outcome；failed 但有 partial run 保留 metrics 并落盘 session；零分是 scored；缺 score 是 unscored；model mismatch / run.errors 是 errored。[E: packages/evals/test/report.test.ts:116] [E: packages/evals/test/report.test.ts:126] [E: packages/evals/test/report.test.ts:184] [E: packages/evals/test/report.test.ts:189] [E: packages/evals/test/report.test.ts:194]
- `comparison.test.ts`：成对 lift 0.5 与 efficiency delta；incomplete/errored pair 使 headline `lift: null` 但仍累加 operational totals；重复 observation block；缺 `totalTokens` 的 operational total 是 `null` 而测到的 `0` 是 0。[E: packages/evals/test/comparison.test.ts:62] [E: packages/evals/test/comparison.test.ts:85] [E: packages/evals/test/comparison.test.ts:102] [E: packages/evals/test/comparison.test.ts:111] [E: packages/evals/test/comparison.test.ts:112]
- 文档 eval 允许 `read`/`write`/`edit`/`grep`/`find`/`ls`，不暴露 shell 或 web-search。容器有网络供 provider 使用，不能当作任意生成代码的网络隔离证明。[E: packages/evals/README.md:90]

## 跨包边界

- [subsys.evals.pi-harness](./pi-harness.md): `createPiDocumentationEvalHarness`、容器 sandbox、CLI 编排与 host 套件。
- [spine.extension-lifecycle](../../spine/extension-lifecycle.md): extension 创建、reload、register 与 tool invocation 主链（extensions / TUI footer 套件依赖这条链）。
- [subsys.coding-agent.extension-loader](../coding-agent/extension-loader.md): `resourceLoader.getExtensions()` 的 errors 与 tool registry。
- [subsys.coding-agent.usage-accounting](../coding-agent/usage-accounting.md): paired token、tool-call 与 estimated-cost telemetry 来源。

## Sources

- packages/evals/README.md
- packages/evals/src/plan.ts
- packages/evals/src/report.ts
- packages/evals/src/cli.ts
- packages/evals/src/harness.ts
- packages/evals/docker/Dockerfile
- packages/evals/docker/install-runtime.mjs
- packages/evals/docker/entrypoint.ts
- packages/evals/evals/extensions.docs.eval.ts
- packages/evals/evals/models.docs.eval.ts
- packages/evals/evals/openai-provider.docs.eval.ts
- packages/evals/evals/custom-provider.docs.eval.ts
- packages/evals/evals/tui.docs.eval.ts
- packages/evals/evals/configured-runtime.ts
- packages/evals/evals/acme-server.ts
- packages/evals/test/plan.test.ts
- packages/evals/test/report.test.ts
- packages/evals/test/comparison.test.ts

## 相关

- [subsys.evals.pi-harness](./pi-harness.md): `createPiDocumentationEvalHarness`、隔离 HOME、文档默认工具集与 `eval:docs` CLI。
- [spine.extension-lifecycle](../../spine/extension-lifecycle.md): extension create、reload、register 与 tool invocation 主链。
- [subsys.coding-agent.extension-loader](../coding-agent/extension-loader.md): eval 捕获的 loader errors 与 extension registry。
- [subsys.coding-agent.usage-accounting](../coding-agent/usage-accounting.md): paired token、tool-call 与 estimated-cost telemetry 来源。
