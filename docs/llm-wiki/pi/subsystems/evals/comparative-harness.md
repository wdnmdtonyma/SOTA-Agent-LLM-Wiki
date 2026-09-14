---
id: subsys.evals.comparative-harness
title: Comparative Eval、工件与报告
kind: subsystem
tier: T2
pkg: evals
source:
  - packages/evals/README.md
  - packages/evals/vitest.config.ts
  - packages/evals/src/extensions.eval.ts
  - packages/evals/src/models.eval.ts
  - packages/evals/src/providers.eval.ts
  - packages/evals/src/vitest-evals/artifacts.ts
  - packages/evals/src/vitest-evals/harness-table.ts
  - packages/evals/src/vitest-evals/reporter.ts
  - packages/evals/src/vitest-evals/setup.ts
  - packages/evals/src/vitest-evals/summary.ts
  - packages/evals/test/vitest-evals/artifacts.test.ts
  - packages/evals/test/vitest-evals/harness-table.test.ts
  - packages/evals/test/vitest-evals/summary.test.ts
symbols:
  - evalHarnessTable
  - deriveEvalGroupKey
  - resolveEvalRepetitions
  - EvalHarnessIterationArtifact
  - recordEvalSessionArtifact
  - recordEvalSourceArtifact
  - persistEvalArtifactReferences
  - EvalHarnessReporter
  - summarizeHarnessComparisons
  - formatHarnessComparisonReport
related:
  - subsys.evals.pi-harness
  - spine.extension-lifecycle
  - subsys.coding-agent.extension-loader
  - subsys.coding-agent.usage-accounting
evidence: explicit
status: verified
updated: 71dca871bc
---

> Pi comparative eval 层把 baseline/candidate/repetition 编成稳定 iteration metadata，把每次真实 harness run 绑定到 Vitest task，并在非 interrupted 结束时输出成对 correctness lift、独立效率 delta，以及 `.eval/` 下的 `report.txt` / `report.json`。[E: packages/evals/src/vitest-evals/reporter.ts:108] [E: packages/evals/src/vitest-evals/reporter.ts:115] [E: packages/evals/src/vitest-evals/reporter.ts:118]

## 能回答的问题

- `evalHarnessTable()` 怎样规划 baseline、一个或多个 candidates 与 repetitions？
- 同一输入跨 harness 怎样生成稳定 pair key，哪些输入会被拒绝？
- pass-rate lift、token/latency/cost delta 与 incomplete diagnostics 怎样计算？
- native session 与生成源码怎样绑定到 test task、落盘并写入 `runs.jsonl`？
- extension authoring eval 实际比较什么，judge 检查哪些可观察行为？
- `models.eval.ts` 与 `providers.eval.ts` 各比较什么，judge 如何打分？

## Harness table 与 iteration identity

`evalHarnessTable(evalSet, options)` 接受 baseline + 单个 `candidate` 或 `candidates[]`。repetitions 经 `resolveEvalRepetitions(explicit, env = process.env.PI_EVAL_REPETITIONS)` 解析：suite 显式 `repetitions` 优先，否则读 env，再缺省 1；必须是 `Number.isSafeInteger` 且 `>= 1`。它拒绝空 eval-set、空 candidate 列表、重复 harness name 和非正整数 repetitions；输出按 repetition 外层、baseline 后接 candidates 的 declaration order 排列。[E: packages/evals/src/vitest-evals/harness-table.ts:114] [E: packages/evals/src/vitest-evals/harness-table.ts:118] [E: packages/evals/src/vitest-evals/harness-table.ts:119] [E: packages/evals/src/vitest-evals/harness-table.ts:180] [E: packages/evals/src/vitest-evals/harness-table.ts:131] [E: packages/evals/src/vitest-evals/harness-table.ts:132] [E: packages/evals/src/vitest-evals/harness-table.ts:135] [E: packages/evals/src/vitest-evals/harness-table.ts:186] [E: packages/evals/README.md:42] [E: packages/evals/README.md:43]

每一行包装原 harness，并设置 schema v1 iteration artifact：`evalSet/groupKey/harness/baseline/candidates/repetition`。artifact 会合并进成功 run；若错误携带 partial harness run，也会先补 metadata 再重抛，避免失败 observation 丢失身份。[E: packages/evals/src/vitest-evals/harness-table.ts:13] [E: packages/evals/src/vitest-evals/harness-table.ts:148] [E: packages/evals/src/vitest-evals/harness-table.ts:152] [E: packages/evals/src/vitest-evals/harness-table.ts:156] [E: packages/evals/src/vitest-evals/harness-table.ts:160]

group key 优先使用 trim 后非空的 string `input.id`；否则先递归 canonicalize JSON，再以 SHA-256 生成 input key，最后与 repetition 组成 JSON tuple。canonicalization 对 object keys 排序，保留 array order，并拒绝非 finite number、稀疏数组、循环引用、非 plain object 与非 JSON value。[E: packages/evals/src/vitest-evals/harness-table.ts:101] [E: packages/evals/src/vitest-evals/harness-table.ts:103] [E: packages/evals/src/vitest-evals/harness-table.ts:107] [E: packages/evals/src/vitest-evals/harness-table.ts:111] [E: packages/evals/src/vitest-evals/harness-table.ts:69] [E: packages/evals/src/vitest-evals/harness-table.ts:73] [E: packages/evals/src/vitest-evals/harness-table.ts:80] [E: packages/evals/src/vitest-evals/harness-table.ts:87]

## Observation 收集与成对统计

custom reporter 只收集带合法 iteration artifact 的 harness runs。judge `avgScore` 是 correctness observation；run 内 errors 优先标记 `errored`，没有 score 的 passed test 标记 `unscored`，failed test 标记 `errored`。telemetry 分别读取 total tokens、total milliseconds 与 finite estimated USD cost。[E: packages/evals/src/vitest-evals/reporter.ts:60] [E: packages/evals/src/vitest-evals/reporter.ts:61] [E: packages/evals/src/vitest-evals/reporter.ts:76] [E: packages/evals/src/vitest-evals/reporter.ts:77] [E: packages/evals/src/vitest-evals/reporter.ts:80]

summary 按 eval-set，再按 file + test name + group key 分组；每个 candidate 只与声明的 baseline 成对。正确性仅纳入双方各有唯一 `scored` observation 的 pair，以 `score >= 1` 判 pass，lift = candidate pass rate − baseline pass rate；同时统计 baseline wins、candidate wins 与 ties。[E: packages/evals/src/vitest-evals/summary.ts:128] [E: packages/evals/src/vitest-evals/summary.ts:205] [E: packages/evals/src/vitest-evals/summary.ts:256] [E: packages/evals/src/vitest-evals/summary.ts:258] [E: packages/evals/src/vitest-evals/summary.ts:277]

tokens、latency 与 estimated cost 独立要求双方都是 scored 且 metric finite，报告 baseline/candidate mean 与 candidate-minus-baseline delta。缺 observation、重复 observation、harness error、缺 score、skipped/pending 等不可评分 outcome 不会被强制转成失败或零 telemetry，而是进入 diagnostics。[E: packages/evals/src/vitest-evals/summary.ts:220] [E: packages/evals/src/vitest-evals/summary.ts:226] [E: packages/evals/src/vitest-evals/summary.ts:173] [E: packages/evals/src/vitest-evals/summary.ts:175] [E: packages/evals/src/vitest-evals/summary.ts:176] [E: packages/evals/src/vitest-evals/summary.ts:178] [E: packages/evals/src/vitest-evals/summary.ts:179]

非 interrupted 的 run 结束时，reporter 将 comparison 格式化为 terminal table（标题 `Eval Comparisons`，每个 eval set 一节）。同一次 Vitest invocation 里多个 comparative 文件会合成一份报告，因为 `onTestRunEnd` 收集全部 modules。interrupted run 只打印 comparison unavailable，并且直接 return，不写 `report.*`。[E: packages/evals/src/vitest-evals/reporter.ts:104] [E: packages/evals/src/vitest-evals/reporter.ts:105] [E: packages/evals/src/vitest-evals/reporter.ts:106] [E: packages/evals/src/vitest-evals/reporter.ts:108] [E: packages/evals/src/vitest-evals/summary.ts:376] [E: packages/evals/README.md:48] [E: packages/evals/README.md:49]

若存在 `PI_EVAL_ARTIFACT_DIR`，reporter 再写 `report.json`（`JSON.stringify(report, null, 2)` 的 structured `HarnessComparisonReport`）与 `report.txt`（去色后的 terminal 文本；没有 formatted 内容时写空字符串）。文件 mode `0600`，目录 `0700`。[E: packages/evals/src/vitest-evals/reporter.ts:111] [E: packages/evals/src/vitest-evals/reporter.ts:113] [E: packages/evals/src/vitest-evals/reporter.ts:115] [E: packages/evals/src/vitest-evals/reporter.ts:118] [E: packages/evals/README.md:70] [E: packages/evals/README.md:71]

## Session/source artifact pipeline

eval-only `afterEach` 从当前 task metadata 取得 harness run，把 `piSessionJsonl` snapshot 作为 `@earendil-works/pi-evals:session` artifact 记录到明确的 Vitest task。场景也可用相同 runId 记录 `@earendil-works/pi-evals:source` attachment。[E: packages/evals/src/vitest-evals/setup.ts:5] [E: packages/evals/src/vitest-evals/setup.ts:6] [E: packages/evals/src/vitest-evals/artifacts.ts:51] [E: packages/evals/src/vitest-evals/artifacts.ts:62] [E: packages/evals/src/vitest-evals/artifacts.ts:81]

落盘阶段只选 type 合法且 runId 匹配的 artifacts；attachment name 必须等于 basename，以阻止目录穿越。文件写到 `sessions|sources/<sha256(runId)>/<name>`；新建目录与文件分别请求 mode `0700`、`0600`，但不会 chmod 已存在的路径。report record 只保存相对 path。[E: packages/evals/src/vitest-evals/artifacts.ts:95] [E: packages/evals/src/vitest-evals/artifacts.ts:97] [E: packages/evals/src/vitest-evals/artifacts.ts:103] [E: packages/evals/src/vitest-evals/artifacts.ts:104] [E: packages/evals/src/vitest-evals/artifacts.ts:105] [E: packages/evals/src/vitest-evals/artifacts.ts:106] [E: packages/evals/src/vitest-evals/artifacts.ts:108] [E: packages/evals/src/vitest-evals/artifacts.ts:109] [I]

`onTestCaseResult` 把每个 completed run 追加到 `runs.jsonl`：包括 test identity/status、harness name、usage、timing、errors、artifact references 与除 raw snapshot/runId 外的 metadata。artifact directory 与 JSONL 使用限制性权限。[E: packages/evals/src/vitest-evals/reporter.ts:15] [E: packages/evals/src/vitest-evals/reporter.ts:30] [E: packages/evals/src/vitest-evals/reporter.ts:37] [E: packages/evals/src/vitest-evals/reporter.ts:41] [E: packages/evals/src/vitest-evals/reporter.ts:44] [E: packages/evals/src/vitest-evals/reporter.ts:45] [E: packages/evals/src/vitest-evals/reporter.ts:48] [E: packages/evals/src/vitest-evals/reporter.ts:96]

artifact 可能含完整 prompts、responses、generated source 与 tool output，不是脱敏摘要。[E: packages/evals/README.md:77] [E: packages/evals/README.md:78]

## Extension authoring comparative eval

四个 shipped comparative 套件共用同一实验变量：baseline harness 名 `system-prompt-without-docs`，传入 [subsys.evals.pi-harness](./pi-harness.md) 的 `excludePiDocumentation`；candidate 名 `default-system-prompt`，不传 transform，因此保留完整 default system prompt。都不在 suite 里写死 `repetitions`，次数走 CLI/env 缺省 1。[E: packages/evals/src/extensions.eval.ts:88] [E: packages/evals/src/extensions.eval.ts:89] [E: packages/evals/src/extensions.eval.ts:90] [E: packages/evals/src/models.eval.ts:128] [E: packages/evals/src/models.eval.ts:129] [E: packages/evals/src/models.eval.ts:130] [E: packages/evals/src/providers.eval.ts:353] [E: packages/evals/src/providers.eval.ts:357] [E: packages/evals/src/providers.eval.ts:360] [E: packages/evals/src/providers.eval.ts:385] [E: packages/evals/src/providers.eval.ts:386] [E: packages/evals/src/providers.eval.ts:387]

extension eval-set 标题是 `Create and use a tool extension`；Vitest case 标题是 `creates and uses the extension`。场景先要求模型创建 `.pi/extensions/hello.ts`，然后 reload，再要求调用 `hello({name:"Bob"})` 并只返回 greeting。domain output 捕获 Guidelines / Pi docs markers、loader errors、loaded extension tools 与生成源码。[E: packages/evals/src/extensions.eval.ts:88] [E: packages/evals/src/extensions.eval.ts:95] [E: packages/evals/src/extensions.eval.ts:98] [E: packages/evals/src/extensions.eval.ts:28] [E: packages/evals/src/extensions.eval.ts:29] [E: packages/evals/src/extensions.eval.ts:103] [E: packages/evals/src/extensions.eval.ts:105] [E: packages/evals/src/extensions.eval.ts:109]

deterministic judge 要求源码 import canonical `@earendil-works/pi-coding-agent`，拒绝旧 `@mariozechner/` 与 `@sinclair/typebox` imports；还要求 loader 无错误、注册 `hello` tool、tool call 成功且 `hello({ name: "Bob" })` 的 result 与最终 response 都精确为 `Hello, Bob!`。`judgeThreshold: null` 使低 judge score 成为 observation，而不是 Vitest infrastructure failure；system-prompt marker 则用 hard assertions 验证实验变量确实不同。[E: packages/evals/src/extensions.eval.ts:52] [E: packages/evals/src/extensions.eval.ts:55] [E: packages/evals/src/extensions.eval.ts:58] [E: packages/evals/src/extensions.eval.ts:62] [E: packages/evals/src/extensions.eval.ts:63] [E: packages/evals/src/extensions.eval.ts:69] [E: packages/evals/src/extensions.eval.ts:72] [E: packages/evals/src/extensions.eval.ts:77] [E: packages/evals/src/extensions.eval.ts:96] [E: packages/evals/src/extensions.eval.ts:122] [E: packages/evals/src/extensions.eval.ts:123]

生成源码存在时，以同一个 runId 记录 `hello.ts` source artifact。代码定义了真实模型驱动的比较方法，但 repository 中没有固定某次模型运行结果；实际结论仍取决于选定模型、认证、repetitions 与当次 observations。[E: packages/evals/src/extensions.eval.ts:112] [E: packages/evals/src/extensions.eval.ts:116] [E: packages/evals/src/extensions.eval.ts:118] [I]

## Model 与 provider authoring comparative evals

`models.eval.ts` 的 eval-set 是 `Add model to existing provider`。prompt 要求配置 `openai/fixture-chat`（显示名 `Fixture Chat`：text-only、reasoning、32768 context / 4096 maxTokens、零费率），然后 reload。judge 对 domain `result` 做 `deepStrictEqual`：新模型字段必须完全匹配，且既有 OpenAI 模型 id 仍可在 runtime 上取到。`output` 若 `session.modelRuntime` 还没有该模型，会用 isolated `agentDir` 的 `models.json` / `auth.json` / `models-store.json` 再 `ModelRuntime.create`。[E: packages/evals/src/models.eval.ts:10] [E: packages/evals/src/models.eval.ts:99] [E: packages/evals/src/models.eval.ts:120] [E: packages/evals/src/models.eval.ts:128] [E: packages/evals/src/models.eval.ts:138] [E: packages/evals/src/models.eval.ts:142] [E: packages/evals/src/models.eval.ts:69] [E: packages/evals/src/models.eval.ts:71]

`providers.eval.ts` 含两个 eval-set，共用本机 loopback fake HTTP server。`Add OpenAI-compatible provider` 要求加入 provider id `acme`、Chat Completions base URL、从 `ACME_API_KEY` 读密钥，以及模型 `acme-chat` / `Acme Chat`（text-only、无 reasoning、32768/4096、零费率）。judge 要求 runtime 能 `completeSimple` 出 `ACME_OK`，且 fake server 收到过合法 Bearer 请求。该套件在 session runtime 找不到模型时同样回退到 `agentDir` 文件。[E: packages/evals/src/providers.eval.ts:12] [E: packages/evals/src/providers.eval.ts:353] [E: packages/evals/src/providers.eval.ts:311] [E: packages/evals/src/providers.eval.ts:324] [E: packages/evals/src/providers.eval.ts:344] [E: packages/evals/src/providers.eval.ts:346] [E: packages/evals/src/providers.eval.ts:372] [E: packages/evals/src/providers.eval.ts:115]

`Add custom streaming provider` 要求加入 `acme-stream`，文档在 `GET /docs`，流式 `POST /generate` + `x-acme-key`，模型 `acme-stream-chat` / `Acme Stream Chat`（16384/2048）。judge 要求 `completeSimple` 拼出 `ACME_STREAM_OK` 且 usage 为 4/3。这套只用 `session.modelRuntime`，没有 `agentDir` 回退。[E: packages/evals/src/providers.eval.ts:16] [E: packages/evals/src/providers.eval.ts:37] [E: packages/evals/src/providers.eval.ts:98] [E: packages/evals/src/providers.eval.ts:385] [E: packages/evals/src/providers.eval.ts:327] [E: packages/evals/src/providers.eval.ts:340] [E: packages/evals/src/providers.eval.ts:260] [E: packages/evals/src/providers.eval.ts:399]

models / providers 与 extension eval 共用同一套 marker 断言：`judgeThreshold: null`，hard assert `systemPromptHasGuidelines === true` 且 `systemPromptHasPiDocs` 仅 candidate 为 true；models / providers 的 it timeout 为 300s。[E: packages/evals/src/models.eval.ts:136] [E: packages/evals/src/models.eval.ts:146] [E: packages/evals/src/models.eval.ts:147] [E: packages/evals/src/providers.eval.ts:366] [E: packages/evals/src/providers.eval.ts:378] [E: packages/evals/src/providers.eval.ts:379] [E: packages/evals/src/providers.eval.ts:393] [E: packages/evals/src/providers.eval.ts:405]

## 测试与设计边界

- artifact tests 证明 session/source artifact 绑定 explicit task，并只持久化匹配 runId 的 attachments。[E: packages/evals/test/vitest-evals/artifacts.test.ts:11] [E: packages/evals/test/vitest-evals/artifacts.test.ts:23] [E: packages/evals/test/vitest-evals/artifacts.test.ts:53] [E: packages/evals/test/vitest-evals/artifacts.test.ts:92]
- harness-table tests 证明 canonical object key order 不影响 hash、array order 会影响 hash，并拒绝循环/稀疏/非 plain inputs；`resolveEvalRepetitions` 覆盖 explicit > env > 1 以及非法 env。[E: packages/evals/test/vitest-evals/harness-table.test.ts:16] [E: packages/evals/test/vitest-evals/harness-table.test.ts:22] [E: packages/evals/test/vitest-evals/harness-table.test.ts:25] [E: packages/evals/test/vitest-evals/harness-table.test.ts:36] [E: packages/evals/test/vitest-evals/harness-table.test.ts:42]
- summary tests 分别覆盖 paired lift/efficiency、missing observation、harness errors、unscored tests、多个 candidates 与 terminal formatting。[E: packages/evals/test/vitest-evals/summary.test.ts:37] [E: packages/evals/test/vitest-evals/summary.test.ts:94] [E: packages/evals/test/vitest-evals/summary.test.ts:142] [E: packages/evals/test/vitest-evals/summary.test.ts:157] [E: packages/evals/test/vitest-evals/summary.test.ts:170] [E: packages/evals/test/vitest-evals/summary.test.ts:218]
- eval config 禁用 file parallelism，并注册 vitest-evals reporter、Pi reporter 与 eval-only setup；artifact append 和 comparison collection 因而按该配置运行。[E: packages/evals/vitest.config.ts:9] [E: packages/evals/vitest.config.ts:13] [E: packages/evals/vitest.config.ts:14]

## Sources

- packages/evals/README.md
- packages/evals/vitest.config.ts
- packages/evals/src/extensions.eval.ts
- packages/evals/src/models.eval.ts
- packages/evals/src/providers.eval.ts
- packages/evals/src/vitest-evals/artifacts.ts
- packages/evals/src/vitest-evals/harness-table.ts
- packages/evals/src/vitest-evals/reporter.ts
- packages/evals/src/vitest-evals/setup.ts
- packages/evals/src/vitest-evals/summary.ts
- packages/evals/test/vitest-evals/artifacts.test.ts
- packages/evals/test/vitest-evals/harness-table.test.ts
- packages/evals/test/vitest-evals/summary.test.ts

## 相关

- [subsys.evals.pi-harness](./pi-harness.md): comparative rows 实际驱动的 Pi `AgentSession` adapter、`excludePiDocumentation` 与 isolated `HOME`。
- [spine.extension-lifecycle](../../spine/extension-lifecycle.md): extension create、reload、register 与 tool invocation 主链。
- [subsys.coding-agent.extension-loader](../coding-agent/extension-loader.md): eval 捕获的 loader errors 与 extension registry。
- [subsys.coding-agent.usage-accounting](../coding-agent/usage-accounting.md): paired token、tool-call 与 estimated-cost telemetry 来源。
