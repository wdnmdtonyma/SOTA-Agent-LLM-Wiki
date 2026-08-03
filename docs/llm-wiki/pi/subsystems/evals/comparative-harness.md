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
updated: c1019d9202
---

> Pi comparative eval 层把 baseline/candidate/repetition 编成稳定 iteration metadata，把每次真实 harness run 绑定到 Vitest task，并输出成对 correctness lift 与独立效率 delta。

## 能回答的问题

- `evalHarnessTable()` 怎样规划 baseline、一个或多个 candidates 与 repetitions？
- 同一输入跨 harness 怎样生成稳定 pair key，哪些输入会被拒绝？
- pass-rate lift、token/latency/cost delta 与 incomplete diagnostics 怎样计算？
- native session 与生成源码怎样绑定到 test task、落盘并写入 `runs.jsonl`？
- extension authoring eval 实际比较什么，judge 检查哪些可观察行为？

## Harness table 与 iteration identity

`evalHarnessTable(evalSet, options)` 接受 baseline + 单个 `candidate` 或 `candidates[]`，repetitions 默认 1。它拒绝空 eval-set、空 candidate 列表、重复 harness name 和非正整数 repetitions；输出按 repetition 外层、baseline 后接 candidates 的 declaration order 排列。[E: packages/evals/src/vitest-evals/harness-table.ts:114] [E: packages/evals/src/vitest-evals/harness-table.ts:120] [E: packages/evals/src/vitest-evals/harness-table.ts:121] [E: packages/evals/src/vitest-evals/harness-table.ts:124] [E: packages/evals/src/vitest-evals/harness-table.ts:125] [E: packages/evals/src/vitest-evals/harness-table.ts:157] [E: packages/evals/src/vitest-evals/harness-table.ts:169] [E: packages/evals/src/vitest-evals/harness-table.ts:175]

每一行包装原 harness，并设置 schema v1 iteration artifact：`evalSet/groupKey/harness/baseline/candidates/repetition`。artifact 会合并进成功 run；若错误携带 partial harness run，也会先补 metadata 再重抛，避免失败 observation 丢失身份。[E: packages/evals/src/vitest-evals/harness-table.ts:12] [E: packages/evals/src/vitest-evals/harness-table.ts:137] [E: packages/evals/src/vitest-evals/harness-table.ts:138] [E: packages/evals/src/vitest-evals/harness-table.ts:141] [E: packages/evals/src/vitest-evals/harness-table.ts:145] [E: packages/evals/src/vitest-evals/harness-table.ts:147] [E: packages/evals/src/vitest-evals/harness-table.ts:149]

group key 优先使用 trim 后非空的 string `input.id`；否则先递归 canonicalize JSON，再以 SHA-256 生成 input key，最后与 repetition 组成 JSON tuple。canonicalization 对 object keys 排序，保留 array order，并拒绝非 finite number、稀疏数组、循环引用、非 plain object 与非 JSON value。[E: packages/evals/src/vitest-evals/harness-table.ts:66] [E: packages/evals/src/vitest-evals/harness-table.ts:69] [E: packages/evals/src/vitest-evals/harness-table.ts:73] [E: packages/evals/src/vitest-evals/harness-table.ts:80] [E: packages/evals/src/vitest-evals/harness-table.ts:85] [E: packages/evals/src/vitest-evals/harness-table.ts:90] [E: packages/evals/src/vitest-evals/harness-table.ts:100] [E: packages/evals/src/vitest-evals/harness-table.ts:105] [E: packages/evals/src/vitest-evals/harness-table.ts:110]

## Observation 收集与成对统计

custom reporter 只收集带合法 iteration artifact 的 harness runs。judge `avgScore` 是 correctness observation；run 内 errors 优先标记 `errored`，没有 score 的 passed test 标记 `unscored`，failed test 标记 `errored`。telemetry 分别读取 total tokens、total milliseconds 与 finite estimated USD cost。[E: packages/evals/src/vitest-evals/reporter.ts:51] [E: packages/evals/src/vitest-evals/reporter.ts:58] [E: packages/evals/src/vitest-evals/reporter.ts:60] [E: packages/evals/src/vitest-evals/reporter.ts:71] [E: packages/evals/src/vitest-evals/reporter.ts:72] [E: packages/evals/src/vitest-evals/reporter.ts:73] [E: packages/evals/src/vitest-evals/reporter.ts:75] [E: packages/evals/src/vitest-evals/reporter.ts:76] [E: packages/evals/src/vitest-evals/reporter.ts:79]

summary 按 eval-set，再按 file + test name + group key 分组；每个 candidate 只与声明的 baseline 成对。正确性仅纳入双方各有唯一 `scored` observation 的 pair，以 `score >= 1` 判 pass，lift = candidate pass rate − baseline pass rate；同时统计 baseline wins、candidate wins 与 ties。[E: packages/evals/src/vitest-evals/summary.ts:112] [E: packages/evals/src/vitest-evals/summary.ts:126] [E: packages/evals/src/vitest-evals/summary.ts:196] [E: packages/evals/src/vitest-evals/summary.ts:203] [E: packages/evals/src/vitest-evals/summary.ts:247] [E: packages/evals/src/vitest-evals/summary.ts:256] [E: packages/evals/src/vitest-evals/summary.ts:258] [E: packages/evals/src/vitest-evals/summary.ts:267] [E: packages/evals/src/vitest-evals/summary.ts:274] [E: packages/evals/src/vitest-evals/summary.ts:289]

tokens、latency 与 estimated cost 独立要求双方都是 scored 且 metric finite，报告 baseline/candidate mean 与 candidate-minus-baseline delta。缺 observation、重复 observation、harness error、缺 score、skipped/pending 等不可评分 outcome 不会被强制转成失败或零 telemetry，而是进入 diagnostics。[E: packages/evals/src/vitest-evals/summary.ts:212] [E: packages/evals/src/vitest-evals/summary.ts:220] [E: packages/evals/src/vitest-evals/summary.ts:223] [E: packages/evals/src/vitest-evals/summary.ts:235] [E: packages/evals/src/vitest-evals/summary.ts:243] [E: packages/evals/src/vitest-evals/summary.ts:164] [E: packages/evals/src/vitest-evals/summary.ts:173] [E: packages/evals/src/vitest-evals/summary.ts:175] [E: packages/evals/src/vitest-evals/summary.ts:176] [E: packages/evals/src/vitest-evals/summary.ts:179]

正常 run 结束时 reporter 将 comparison 格式化为 terminal table；interrupted run 只报告 comparison unavailable。summary schema 没有在此实现中写成独立 JSON 文件。[E: packages/evals/src/vitest-evals/reporter.ts:98] [E: packages/evals/src/vitest-evals/reporter.ts:103] [E: packages/evals/src/vitest-evals/reporter.ts:107] [E: packages/evals/src/vitest-evals/reporter.ts:109] [E: packages/evals/src/vitest-evals/summary.ts:65] [E: packages/evals/src/vitest-evals/summary.ts:374] [I]

## Session/source artifact pipeline

eval-only `afterEach` 从当前 task metadata 取得 harness run，把 `piSessionJsonl` snapshot 作为 `@earendil-works/pi-evals:session` artifact 记录到明确的 Vitest task。场景也可用相同 runId 记录 `@earendil-works/pi-evals:source` attachment。[E: packages/evals/src/vitest-evals/setup.ts:5] [E: packages/evals/src/vitest-evals/setup.ts:6] [E: packages/evals/src/vitest-evals/artifacts.ts:51] [E: packages/evals/src/vitest-evals/artifacts.ts:55] [E: packages/evals/src/vitest-evals/artifacts.ts:61] [E: packages/evals/src/vitest-evals/artifacts.ts:75] [E: packages/evals/src/vitest-evals/artifacts.ts:80]

落盘阶段只选 type 合法且 runId 匹配的 artifacts；attachment name 必须等于 basename，以阻止目录穿越。文件写到 `sessions|sources/<sha256(runId)>/<name>`；新建目录与文件分别请求 mode `0700`、`0600`，但不会 chmod 已存在的路径。report record 只保存相对 path。[E: packages/evals/src/vitest-evals/artifacts.ts:87] [E: packages/evals/src/vitest-evals/artifacts.ts:95] [E: packages/evals/src/vitest-evals/artifacts.ts:97] [E: packages/evals/src/vitest-evals/artifacts.ts:101] [E: packages/evals/src/vitest-evals/artifacts.ts:103] [E: packages/evals/src/vitest-evals/artifacts.ts:104] [E: packages/evals/src/vitest-evals/artifacts.ts:105] [E: packages/evals/src/vitest-evals/artifacts.ts:106] [E: packages/evals/src/vitest-evals/artifacts.ts:108] [E: packages/evals/src/vitest-evals/artifacts.ts:109] [I]

`onTestCaseResult` 把每个 completed run 追加到 `runs.jsonl`：包括 test identity/status、harness name、usage、timing、errors、artifact references 与除 raw snapshot/runId 外的 metadata。artifact directory 与 JSONL 使用限制性权限。[E: packages/evals/src/vitest-evals/reporter.ts:14] [E: packages/evals/src/vitest-evals/reporter.ts:23] [E: packages/evals/src/vitest-evals/reporter.ts:26] [E: packages/evals/src/vitest-evals/reporter.ts:29] [E: packages/evals/src/vitest-evals/reporter.ts:36] [E: packages/evals/src/vitest-evals/reporter.ts:37] [E: packages/evals/src/vitest-evals/reporter.ts:40] [E: packages/evals/src/vitest-evals/reporter.ts:43] [E: packages/evals/src/vitest-evals/reporter.ts:44] [E: packages/evals/src/vitest-evals/reporter.ts:47] [E: packages/evals/src/vitest-evals/reporter.ts:94]

artifact 可能含完整 prompts、responses、generated source 与 tool output，不是脱敏摘要。[E: packages/evals/README.md:32] [E: packages/evals/README.md:33]

## Extension authoring comparative eval

extension eval 的 baseline 从 default system prompt 的 `Guidelines` 开始截断；candidate 保留 Guidelines 与 Pi docs，只移除 cwd 段。两者用稳定 harness names 放入同一个 baseline/candidate table，默认只运行一次 repetition。[E: packages/evals/src/extensions.eval.ts:41] [E: packages/evals/src/extensions.eval.ts:44] [E: packages/evals/src/extensions.eval.ts:47] [E: packages/evals/src/extensions.eval.ts:50] [E: packages/evals/src/extensions.eval.ts:100] [E: packages/evals/src/extensions.eval.ts:101] [E: packages/evals/src/extensions.eval.ts:102] [E: packages/evals/src/vitest-evals/harness-table.ts:169]

场景先要求模型创建 `.pi/extensions/hello.ts`，然后 reload，再要求调用 `hello({name:"Bob"})` 并只返回 greeting。domain output 捕获 system-prompt markers、loader errors、loaded extension tools 与生成源码。[E: packages/evals/src/extensions.eval.ts:18] [E: packages/evals/src/extensions.eval.ts:23] [E: packages/evals/src/extensions.eval.ts:24] [E: packages/evals/src/extensions.eval.ts:28] [E: packages/evals/src/extensions.eval.ts:30] [E: packages/evals/src/extensions.eval.ts:31] [E: packages/evals/src/extensions.eval.ts:110] [E: packages/evals/src/extensions.eval.ts:111] [E: packages/evals/src/extensions.eval.ts:117] [E: packages/evals/src/extensions.eval.ts:119]

deterministic judge 要求源码 import canonical `@earendil-works/pi-coding-agent`，拒绝旧 `@mariozechner/*` 与 `@sinclair/typebox` imports；还要求 loader 无错误、注册 `hello` tool、tool call 成功且结果与最终 response 都精确为 `Hello, Bob!`。`judgeThreshold:null` 使低 judge score 成为 observation，而不是 Vitest infrastructure failure；system-prompt marker 则用 hard assertions 验证实验变量确实不同。[E: packages/evals/src/extensions.eval.ts:64] [E: packages/evals/src/extensions.eval.ts:67] [E: packages/evals/src/extensions.eval.ts:70] [E: packages/evals/src/extensions.eval.ts:74] [E: packages/evals/src/extensions.eval.ts:75] [E: packages/evals/src/extensions.eval.ts:79] [E: packages/evals/src/extensions.eval.ts:81] [E: packages/evals/src/extensions.eval.ts:84] [E: packages/evals/src/extensions.eval.ts:89] [E: packages/evals/src/extensions.eval.ts:108] [E: packages/evals/src/extensions.eval.ts:134] [E: packages/evals/src/extensions.eval.ts:135]

生成源码存在时，以同一个 runId 记录 `hello.ts` source artifact。代码定义了真实模型驱动的比较方法，但 repository 中没有固定某次模型运行结果；实际结论仍取决于选定模型、认证、repetitions 与当次 observations。[E: packages/evals/src/extensions.eval.ts:124] [E: packages/evals/src/extensions.eval.ts:125] [E: packages/evals/src/extensions.eval.ts:127] [E: packages/evals/src/extensions.eval.ts:128] [I]

## 测试与设计边界

- artifact tests 证明 session/source artifact 绑定 explicit task，并只持久化匹配 runId 的 attachments。[E: packages/evals/test/vitest-evals/artifacts.test.ts:11] [E: packages/evals/test/vitest-evals/artifacts.test.ts:23] [E: packages/evals/test/vitest-evals/artifacts.test.ts:53] [E: packages/evals/test/vitest-evals/artifacts.test.ts:92]
- harness-table tests 证明 canonical object key order 不影响 hash、array order 会影响 hash，并拒绝循环/稀疏/非 plain inputs。[E: packages/evals/test/vitest-evals/harness-table.test.ts:15] [E: packages/evals/test/vitest-evals/harness-table.test.ts:21] [E: packages/evals/test/vitest-evals/harness-table.test.ts:24] [E: packages/evals/test/vitest-evals/harness-table.test.ts:27]
- summary tests 分别覆盖 paired lift/efficiency、missing observation、harness errors、unscored tests、多个 candidates 与 terminal formatting。[E: packages/evals/test/vitest-evals/summary.test.ts:37] [E: packages/evals/test/vitest-evals/summary.test.ts:94] [E: packages/evals/test/vitest-evals/summary.test.ts:142] [E: packages/evals/test/vitest-evals/summary.test.ts:157] [E: packages/evals/test/vitest-evals/summary.test.ts:170] [E: packages/evals/test/vitest-evals/summary.test.ts:218]
- eval config 禁用 file parallelism，并注册 vitest-evals reporter、Pi reporter 与 eval-only setup；artifact append 和 comparison collection 因而按该配置运行。[E: packages/evals/vitest.config.ts:9] [E: packages/evals/vitest.config.ts:13] [E: packages/evals/vitest.config.ts:14]

## Sources

- packages/evals/README.md
- packages/evals/vitest.config.ts
- packages/evals/src/extensions.eval.ts
- packages/evals/src/vitest-evals/artifacts.ts
- packages/evals/src/vitest-evals/harness-table.ts
- packages/evals/src/vitest-evals/reporter.ts
- packages/evals/src/vitest-evals/setup.ts
- packages/evals/src/vitest-evals/summary.ts
- packages/evals/test/vitest-evals/artifacts.test.ts
- packages/evals/test/vitest-evals/harness-table.test.ts
- packages/evals/test/vitest-evals/summary.test.ts

## 相关

- [subsys.evals.pi-harness](./pi-harness.md): comparative rows 实际驱动的 Pi `AgentSession` adapter。
- [spine.extension-lifecycle](../../spine/extension-lifecycle.md): extension create、reload、register 与 tool invocation 主链。
- [subsys.coding-agent.extension-loader](../coding-agent/extension-loader.md): eval 捕获的 loader errors 与 extension registry。
- [subsys.coding-agent.usage-accounting](../coding-agent/usage-accounting.md): paired token、tool-call 与 estimated-cost telemetry 来源。
