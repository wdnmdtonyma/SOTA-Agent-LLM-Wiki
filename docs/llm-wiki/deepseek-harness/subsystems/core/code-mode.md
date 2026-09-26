---
id: subsys.core.code-mode
title: PTC（run_code 呈现运输）
kind: subsystem
tier: T2
pkg: core
source:
  - packages/core/tools/src/ptc.ts
  - packages/core/tools/src/ts-types.ts
  - packages/core/tools/src/py-types.ts
  - packages/ptc-runtime/ptc-runtime/src/index.ts
  - packages/core/tools/src/index.ts
  - packages/core/tools/src/types.ts
  - packages/core/tools/tests/ptc.spec.ts
  - packages/core/agent-tool-presentation/src/index.ts
  - packages/core/agent-tool-presentation/tests/agent-tool-presentation.spec.ts
  - packages/ptc-runtime/ptc-runtime/src/types.ts
  - packages/ptc-runtime/ptc-runtime-node/src/index.ts
  - packages/preset/agent-preset-registry/src/mount.ts
  - vendor/cordis/src/events.ts
  - packages/bundle/web-app/presets/ptc.patch.yml
  - packages/bundle/web-app/package.json
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/headless/cordis.patch.yml
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/base/tests/base.spec.ts
  - packages/core/session/src/surface.ts
  - packages/session/session-checkpoint-policy/src/index.ts
symbols:
  - run_code
  - RUN_CODE_NAME
  - createRunCodeTool
  - PtcRuntime
  - ToolPresentationMode
related:
  - spine.trace-code-mode
  - subsys.core.tools
  - subsys.core.agent-tool-presentation
  - subsys.execution.code-runtime
  - spine.overview
  - spine.tool-call-anatomy
  - surface.presets.code
evidence: explicit
status: verified
updated: 477b4f4205
---

> `run_code` 是 host 面 `ctx.tools` **预留的 PTC presentation transport**（`RUN_CODE_NAME`），不是又一个 `dsh-tool-*` 包：模型写一段程序，`createRunCodeTool` 把 agent 可见工具绑成 `await tools.name(args)`，经 host 面 `ctx.ptcRuntime` 执行；子调度走同一套 `TOOL_RUNTIME_SCHEDULER`（`prepare` → `dispatch` → `finalize`/`finish`），带 `parent` token，只有外层 curated 结果进 `deriveMessages()`。本节点 id `subsys.core.code-mode` 是稳定别名；权威源是 `packages/core/tools/src/ptc.ts`。旧名 Code Mode。

## 能回答的问题

- `run_code` 是谁注册的？为什么 `register('run_code')` 会立刻失败？
- `mode: ptc` / `both` / `native` 分别把哪些 schema 交给模型？SDK 段从哪张表按 `PtcRuntime.language` 选渲染器？
- 无 `ctx.ptcRuntime` 时：schema 读路径、`wireSchemas` 装配、preset `tool-presentation` 行各发生什么？
- 程序里 `await tools.read(...)` 怎样带着 `parent` 重入守卫？`tools/ptc-dispatch-log` 为什么必须 `next()`？
- `dsh-agent-tool-presentation` 为什么只 `inject: ['tools']`，`ptc`/`both` 又为何动态等 `ptcRuntime`？`leakedServices` 会不会拦这一行？

## 职责边界

本页拥有：**PTC 调度桥**（`createRunCodeTool` / 子调用 driver / `tools/ptc-dispatch-log` 日志）、**语言对齐**（`PtcSdkLanguage` + `RUN_CODE_FLAVORS` + `SDK_RENDERERS`）、以及 **`ctx.ptcRuntime` 消费缝**（`requirePtcRuntime` / `peekRuntime` / `PtcRunRequest`）。

本页**不**拥有：

- host 注册表与 `tools/pre-execute` 全管线字段 —— [subsys.core.tools](tools.md)
- preset 行何时 `presentAs`、`Config.mode` 必填、shipped 谁挂这行 —— [subsys.core.agent-tool-presentation](agent-tool-presentation.md)
- Node process 预算、剥类型、`isolation` 语义 —— [subsys.execution.code-runtime](../execution/code-runtime.md)
- 一轮真实路径（picker → assemble → process → client 树）—— [spine.trace-code-mode](../../spine/trace-code-mode.md)
- `run_code` JSON schema / `presentCall` 卡片 —— [surface.tools.run-code](../../surface/tools/run-code.md)（T1）
- shipped `ptc` 成员表（节点 id 仍是 `surface.presets.code`）—— [surface.presets.code](../../surface/presets/code.md)

四个 shipped preset 声明在 `packages/bundle/web-app/presets/{minimal,standard,ptc,cordis}.patch.yml`。旧目录名 `code` 就是 PTC。`dsh-base` **insert** `id: ptc-runtime` → `@deepseek-ai/dsh-ptc-runtime-node`，叠了 base 的 profile（`web` / `headless` / `sdk` / `acp`）都有 `ctx.ptcRuntime`；`sdk-minimal` 不叠 base，没有这一行。`dsh-base` **没有** `subagent-codex` / `subagent-claude-code` 行：`base.spec.ts` 钉死这两 id 的 patch 行数为 0。 [E: packages/bundle/base/cordis.patch.yml:389] [E: packages/bundle/base/tests/base.spec.ts:42] [E: packages/bundle/base/tests/base.spec.ts:43] 进程级 PTC 另有临时 env `DSH_TOOLS_MODE`，与 per-session `presentAs` 正交。五个 shipped profile 是 `web`（live）与 `headless` / `sdk` / `sdk-minimal` / `acp`（startup）。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/core/tools/src/ptc.ts` | `RUN_CODE_NAME`、`createRunCodeTool`、flavor 表、子调度 driver |
| `packages/core/tools/src/index.ts` | `SDK_RENDERERS`、`wireSchemas`、`presentAs`、`collapses`、`shapeDispatchLog` |
| `packages/core/tools/src/ts-types.ts` | TypeScript `tools:sdk`：`renderToolsSdk` |
| `packages/core/tools/src/py-types.ts` | Python `tools:sdk`：`renderToolsSdkPy` |
| `packages/core/tools/src/types.ts` | `tool/ptc-dispatch-start` / `tool/ptc-dispatch` 事件载荷 |
| `packages/ptc-runtime/ptc-runtime/src/index.ts` | Service Definition：`ctx.ptcRuntime` / `PtcRuntime` |
| `packages/ptc-runtime/ptc-runtime/src/types.ts` | `PtcRunRequest` / `PtcRunSpec` / `PtcRunResult`（程序失败是字段，不是 `run()` reject） |
| `packages/ptc-runtime/ptc-runtime-node/src/index.ts` | shipped Provider：`language = 'typescript'`，`isolation = 'process'` |
| `packages/core/agent-tool-presentation/src/index.ts` | preset 面选择器：`presentAs` + 动态 `inject(['ptcRuntime'])` |
| `packages/preset/agent-preset-registry/src/mount.ts` | `leakedServices` |
| `packages/bundle/web-app/presets/ptc.patch.yml` | shipped PTC preset：`tool-presentation` `mode: ptc`；`workflow-ptc` / `tool-workflow` / `tool-ralph` 均 `disabled: true` |
| `packages/bundle/web-app/cordis.patch.yml` | web overlay：`DSH_TOOLS_MODE`、模型可见 id `disabled: true` |
| `packages/bundle/headless/cordis.patch.yml` | headless overlay：`DSH_TOOLS_MODE`；**不**挂 shipped preset 文件 |
| `vendor/cordis/src/events.ts` | waterfall：不 `next()` 就不 `shift` |

## 数据模型

| 符号 | 落点 | 含义 |
|---|---|---|
| `RUN_CODE_NAME` | `ptc.ts` | 模型可见名 `'run_code'`；注册表保留，禁止 `register` / `restrict` |
| `ToolPresentationMode` | `tools` `Config.mode` | `'native'`（默认）/ `'ptc'` / `'both'`。全局改法是 host `tools` 行；per-scope 改法是 `presentAs` |
| `PtcSdkLanguage` | `ptc.ts` | `'typescript' \| 'python'`。`RUN_CODE_FLAVORS` 与 `SDK_RENDERERS` 都 `satisfies` 此 union |
| `PtcRunRequest` | `dsh-ptc-runtime` types | `{ program, bindings, cwd?, timeoutMs?, sandboxPolicy?, signal? }`。Provider `resolve()` 填齐 `cwd` / `timeoutMs` 成 `PtcRunSpec` |
| `PtcRunResult` | 同左 | `{ value?, logs, error?, sandbox? }`。`error.kind` 含 `exception` / `timeout` / `abort` / `worker-exit` / `invalid-output` / `output-limit` / `protocol` / `sandbox-unavailable` |
| `PtcDispatchLog` | `dsh-tools` | 子调用已 settle 的 **日志副本**；waterfall 只能换这块 `content` |
| `tool/ptc-dispatch-start` / `tool/ptc-dispatch` | `SessionEventMap` | log-only。`subCallId = \`<parent>:ptc:<n>\`` [E: packages/core/tools/src/ptc.ts:545] |
| `maxParallelSubCalls` | `tools` Config | 并行子调用重叠上限，默认 `10` |

## 控制流

### A. 组合：host 提供 runtime，preset 只改呈现

1. `dsh-base` 在 **host 面** insert `id: ptc-runtime`，插件 `@deepseek-ai/dsh-ptc-runtime-node`。[E: packages/bundle/base/cordis.patch.yml:389] [E: packages/bundle/base/cordis.patch.yml:390] Service Definition `PtcRuntime` 构造 `super(ctx, 'ptcRuntime')` 发布进程级 `ctx.ptcRuntime`。[E: packages/ptc-runtime/ptc-runtime/src/index.ts:134] shipped `NodePtcRuntime` 以 `super(ctx)` 挂上同一键，`language = 'typescript'`，`isolation = 'process'`。[E: packages/ptc-runtime/ptc-runtime-node/src/index.ts:75] [E: packages/ptc-runtime/ptc-runtime-node/src/index.ts:65] [E: packages/ptc-runtime/ptc-runtime-node/src/index.ts:66]

2. `dsh-base` 的 `tools` 行默认 `mode: 'native'`（schema default）。[E: packages/core/tools/src/index.ts:811] web / headless 把该行写成 `mode: !!js process.env.DSH_TOOLS_MODE`：未设 env 时仍是 schema 默认 `native`；设了则整进程 `defaultMode` 变成 `ptc`/`both`。这是 workaround，不是 `ptc` preset 路径。[E: packages/bundle/web-app/cordis.patch.yml:38] [E: packages/bundle/headless/cordis.patch.yml:18] web 再把 base 上模型可见行标 `disabled: true`，然后 `dsh.bundle.patch` 叠四份 preset 声明。headless **不**挂这些 preset 文件：模型可见工具留在 host 全局层。[E: packages/bundle/web-app/package.json:44] [E: packages/bundle/web-app/cordis.patch.yml:444]

   `dsh-web-app` 被 `disabled: true` 的模型可见 id 包括 `tool-plugin-manager`、`tool-bash` / `tool-pwsh`、`tool-fs*`、delegation / workflow / ralph 等；目的是让 session 挂 preset 而不是吃 host 全局工具行。[E: packages/bundle/web-app/cordis.patch.yml:444] [E: packages/bundle/web-app/cordis.patch.yml:534]

3. shipped `ptc` preset 在 `presets/ptc.patch.yml` 挂 `id: tool-presentation`，`config.mode: ptc`。`bash` / `read` 等工具行仍在 preset 里 `register` 进 **host** 注册表；改变的是呈现，不是删行。`workflow-ptc` / `tool-workflow` / `tool-ralph` **均为 `disabled: true`**。`tool-presentation` **没有** `isolate:` 块——它不 publish 任何 service。[E: packages/bundle/web-app/presets/ptc.patch.yml:144] [E: packages/bundle/web-app/presets/ptc.patch.yml:147] [E: packages/bundle/web-app/presets/ptc.patch.yml:121] [E: packages/bundle/web-app/presets/ptc.patch.yml:126] [E: packages/bundle/web-app/presets/ptc.patch.yml:129] 声明 `id: ptc`、`order: 2`。[E: packages/bundle/web-app/presets/ptc.patch.yml:8] [E: packages/bundle/web-app/presets/ptc.patch.yml:9]

4. `apply@packages/core/agent-tool-presentation/src/index.ts`：静态 `inject = ['tools']`（故意不含 `ptcRuntime`，否则 `native` 行也会被 runtime 绑住）。`native` 立刻 `ctx.tools.presentAs('native')`；`ptc` / `both` 走 `ctx.inject(['ptcRuntime'], runtimeCtx => runtimeCtx.tools.presentAs(config.mode))`。[E: packages/core/agent-tool-presentation/src/index.ts:35] [E: packages/core/agent-tool-presentation/src/index.ts:64] [E: packages/core/agent-tool-presentation/src/index.ts:69]

5. `presentAs@packages/core/tools/src/index.ts` 必须在 scoped context（preset standing scope / `agent.ctx`）；全局调用抛错，指引去改 `tools` 行的 `mode`。同一 scope 第二次声明冲突抛错。非 `native` 时为本 scope 再注册 collapse 与 `tools:sdk` section。[E: packages/core/tools/src/index.ts:974] [E: packages/core/tools/src/index.ts:977] [E: packages/core/tools/src/index.ts:984] [E: packages/core/tools/src/index.ts:996]

### B. isolate 与 `leakedServices`

6. `mountPreset@packages/preset/agent-preset-registry/src/mount.ts` 在 subtree settle 后做审计：失败行拼进 throw；`leakedServices`（subtree 把 service publish 进 **root realm**）非空则抛 `Preset services require isolate realms: …`。[E: packages/preset/agent-preset-registry/src/mount.ts:264] [E: packages/preset/agent-preset-registry/src/mount.ts:267]

7. `leakedServices` 比较 `store` 里实现的 symbol 是否等于 `ctx.root[Context.isolate][impl.name]`：无 `isolate` 的 Provider 写进 root 符号，就会被点名；`isolate: { name: true }` 写进 realm-private 符号，则缺席。[E: packages/preset/agent-preset-registry/src/mount.ts:86] [E: packages/preset/agent-preset-registry/src/mount.ts:97]

8. **对本缝的含义：** `ptcRuntime` 必须留在 host（`dsh-base` 那一行）。若有人把 `PtcRuntime` 实现挂进 preset 且不写 `isolate`，`leakedServices` 拒绝。`dsh-agent-tool-presentation` 只改 `ToolLayer.mode`，不 `provide` 服务，所以 **不需要** `isolate`，也不会触发泄漏门。同份 `ptc` preset 里 `planning` / `compaction` / `delegation` 组才带 `isolate:`（`planMode` / `compaction`+`toolResultPruner` / `workflowEngine`），与 PTC transport 无关。[E: packages/bundle/web-app/presets/ptc.patch.yml:45] [E: packages/bundle/web-app/presets/ptc.patch.yml:66] [E: packages/bundle/web-app/presets/ptc.patch.yml:83]

9. 缺 runtime 时：`row.ctx.get('ptcRuntime')` 为 `undefined`，`presentAs('ptc')` 不跑，`assemble` 仍是部署默认 native 名（测试里是 `echo`）。后来 `ctx.plugin(StubRuntime)` 才切到 `[run_code]`。[E: packages/core/agent-tool-presentation/tests/agent-tool-presentation.spec.ts:111] [E: packages/core/agent-tool-presentation/tests/agent-tool-presentation.spec.ts:113] [E: packages/core/agent-tool-presentation/tests/agent-tool-presentation.spec.ts:123] JSDoc / 测试注释仍写「缺 runtime 则 mount 失败、审计点名该行」；可执行断言是 pending + native 回落。[U]

### C. 装配：`wireSchemas` 与语言表

10. `ToolRuntime` 构造时把 `ctx.systemPrompt.tools` 接到 `wireSchemas(scope)`。`modeFor` 沿 scope 链取最近的 `layer.mode`，否则 `defaultMode`。[E: packages/core/tools/src/index.ts:854] [E: packages/core/tools/src/index.ts:928] [E: packages/core/tools/src/index.ts:932]

11. `view()` 在 filterable 层之后、且 `modeFor !== 'native'` 时，把保留 transport 插入 `visible`。`register` 见到 `run_code` 直接抛 reserved；`restrict` 也不能点这个名字。[E: packages/core/tools/src/index.ts:1215] [E: packages/core/tools/src/index.ts:1080] [E: packages/core/tools/src/index.ts:1111]

12. `wireSchemas@packages/core/tools/src/index.ts`：`native` 投影全部可见 schema。非 native **先** `requirePtcRuntime(mode)`（`ctx.get('ptcRuntime')` 为空则抛；`language` 不在 `SDK_RENDERERS` 自己的键上也抛），再投影。`mode === 'ptc'` 只留名为 `run_code` 的 schema，`knownNames` 收成 `[RUN_CODE_NAME]`；`both` 留下 native + `run_code`。[E: packages/core/tools/src/index.ts:1011] [E: packages/core/tools/src/index.ts:1020] [E: packages/core/tools/src/index.ts:1022] [E: packages/core/tools/src/index.ts:1046]

13. `SDK_RENDERERS` 与 `RUN_CODE_FLAVORS` 都 `satisfies Record<PtcSdkLanguage, …>`，`PtcSdkLanguage = 'typescript' | 'python'`。漏改一侧是 typecheck 失败，不是运行时静默错语言。`tools:sdk` 用 `SDK_RENDERERS[runtime.language]` 调 `renderToolsSdk` 或 `renderToolsSdkPy`。[E: packages/core/tools/src/ptc.ts:89] [E: packages/core/tools/src/ptc.ts:92] [E: packages/core/tools/src/index.ts:61]

14. **无 runtime 的两条读路径必须分开。** 定义 readers / `schemas()` 走 `peekRuntime()`：`undefined` 时 `resolveFlavor` 退化 `TYPESCRIPT_FLAVOR`（doc-catalog 是 shipped 的这条路，不喂模型）。真正装配 `wireSchemas` 先 `requirePtcRuntime`，host `defaultMode` 已是 `ptc` 且没 runtime 时 `assemble` 整次拒绝。[E: packages/core/tools/src/ptc.ts:148] [E: packages/core/tools/src/index.ts:956] [E: packages/core/tools/src/index.ts:1046]

### D. 外层 `run_code` 与带 `parent` 的子调度

15. 模型只看到 `run_code`（`ptc`）或 native+`run_code`（`both`）。loop 为外层构造 **没有** `parent` 的 `ToolExecutionInput`，进同一套 `prepareExecution`。`tools/pre-execute` 是 waterfall：innermost `next` 默认 allow；listener 不调用传入的 `next()`，Cordis 就不会 `shift` 到下一层。[E: vendor/cordis/src/events.ts:238]

16. `session-checkpoint-policy` 挂在 `tools/execute`：`exec.parent !== undefined` 时直接 `next()`，子调用复用外层已 flush 的落点。[E: packages/session/session-checkpoint-policy/src/index.ts:71]

17. `collapses`：`!nested && modeFor(scope) === 'ptc' && name !== RUN_CODE_NAME`。走 `modeFor` 而不是 `defaultMode`，否则 native 部署上的 `ptc` preset 会宣布 `[run_code]` 却仍执行 native 名。模型直调 `write` 在 **policy 之前** 变成 `UNKNOWN_TOOL`（文案指引从程序里调），approval / guard 看不到注定失败的调用。[E: packages/core/tools/src/index.ts:1352] [E: packages/core/tools/src/index.ts:1469]

18. `createRunCodeTool.execute@packages/core/tools/src/ptc.ts`：`requireRuntime()`；为整次 run 建 `AbortController`。`registry.schemas(exec.agent)` 枚举该 agent 可见工具，**跳过** `run_code`，每个名字绑成 `PtcBindingFunction`。`runtime.run(runtime.resolve({ program: args.code, bindings: [{ global: 'tools', functions, errorClass: { name: 'ToolCallError', memberNameProperty: 'toolName' } }], signal, cwd?, sandboxPolicy?, timeoutMs? }))`。[E: packages/core/tools/src/ptc.ts:333] [E: packages/core/tools/src/ptc.ts:690] [E: packages/core/tools/src/ptc.ts:697]

19. 程序侧 `await tools.name(args)` 回到 binding：`jsonNormalizeArgs` 后分配 `subCallId`，构造带 `parent: exec.token` 的 input，交给 `registry[TOOL_RUNTIME_SCHEDULER]`。`nested === true` 时 `collapses` 为 false，SDK 子调用可以点名 `read` / `bash`，重入完整 `prepare` → `dispatch` → `finalize`/`finish`。

20. 子调度单车道：`start()` 先 `append('tool/ptc-dispatch-start')` 再 `scheduler.prepare`；`classify()` 读 `registry.executionMode(input).kind`，`parallel` 调用最多重叠 `maxParallelSubCalls`；`exclusive` 等池空且自己的 `commit()`（含 post-execute）完成。[E: packages/core/tools/src/ptc.ts:612] [E: packages/core/tools/src/index.ts:812]

### E. `tools/ptc-dispatch-log` waterfall 与 model-visible

21. `settle` **立刻**把完整 JSON value 还给程序。日志另走 `shapeDispatchLog` → `ctx.waterfall(..., 'tools/ptc-dispatch-log', dispatch, () => Promise.resolve(dispatch.content))`。listener 必须 `next()` 才会 `shift`：不调用则后续 listener 与 innermost「原样返回 `content`」都不跑。抛错被 contain，回退原始 `content`。[E: packages/core/tools/src/index.ts:1323] [E: vendor/cordis/src/events.ts:238]

22. 然后 `session.append('tool/ptc-dispatch', { rootCallId, parentCallId, subCallId, name, arguments, isError, content })`。`SURFACE_EVENT_TYPES` 只有五类消息事件；`deriveEventMessage` 对 dispatch 事件走 `default` 返回 `null`。外层 `output.render` 把 `logs` + completion 拼成一段 text，loop 再 `append('tool/result')`。这是 **model-visible ⟺ logged** 在 PTC 上的切法：子调用 logged 供 UI / 重建，但不进下一轮 `messages`。[E: packages/core/tools/src/ptc.ts:586] [E: packages/core/session/src/surface.ts:50] [E: packages/core/session/src/surface.ts:153]

23. `PtcRuntime.run` 合同：程序失败写在 `PtcRunResult.error`，`run()` 本身只在 Service Definition 误用时 reject。`createRunCodeTool` 见到 `result.error` 抛 `CodeRunFailedError`（`CODE_RUN_FAILED`），注册表把它收成 `isError` 外层结果。[E: packages/ptc-runtime/ptc-runtime/src/index.ts:150] [E: packages/ptc-runtime/ptc-runtime/src/types.ts:144] [E: packages/core/tools/src/ptc.ts:174] [E: packages/core/tools/src/ptc.ts:721] 含 image 的嵌套结果以 plugin context 推迟，source kind 是 `'ptc-mode'`。[E: packages/core/tools/src/ptc.ts:14] [E: packages/core/tools/src/ptc.ts:640]

## 设计动机

PTC 把「多步工具编排」从模型的 native function-calling 挪进一段程序，但 **不**另起一套执行器。能力仍由 host `ctx.tools` 注册；preset 只声明呈现。`PtcRuntime` 零工具知识：请求只有 program / bindings / 可选 cwd·timeout·sandboxPolicy·signal，approval / sandbox / session log 全在 `dsh-tools` 桥一侧。两张语言表用同一个 `satisfies PtcSdkLanguage` 锁死，避免 TypeScript schema 配 Python SDK。子调用必须落盘（client 树、重建），但不能灌回 context——所以 dispatch 事件故意不进 surface。

相对 peer harness：这不是「再做一个 coding agent 的 interpreter 工具」，而是 Cordis 组合里 **host 注册表 + host runtime + preset 呈现** 的三层切分。同进程可以并排跑 `ptc` 与 `native` 会话。

## Gotcha

- **`run_code` 不是包。** 没有 `@deepseek-ai/dsh-tool-run-code`。名字由注册表保留；抢注或 `restrict` 点它都抛。
- **程序永远绑不到 `run_code`。** 即使 `mode: 'both'`，binding 枚举也 `continue` 掉它，避免递归 transport。
- **collapse 在 policy 前。** `ptc` 下模型直调 native 名不会进 approval。嵌套因为 `parent` 才重入守卫。
- **`tools/ptc-dispatch-log` 改不了程序已拿到的值。** 只改即将 `append` 的副本。不 `next()` 等于否决后续 spill。
- **无 runtime：读 schema 退化 TS，装配失败。** `peekRuntime() === undefined` → TypeScript flavor；`wireSchemas` / 已生效的非 native `defaultMode` → throw。preset 动态 wait 未完成时 `modeFor` 仍是 native，assemble **不会**走到 `requirePtcRuntime`。
- **JSDoc / 测试注释写「缺 runtime 则 mount 失败、审计点名该行」。** 可执行断言是 `row.ctx.get('ptcRuntime') === undefined` 且 assemble 仍为 `echo`。[U]
- **`DSH_TOOLS_MODE` ≠ 选了 `ptc` preset。** 前者改 host `defaultMode`（整进程）；后者是 standing scope 上的 `presentAs('ptc')`。
- **shipped host 行仍是 TypeScript Node process。** Python flavor / `renderToolsSdkPy` 已接线。另有 experimental `PythonPtcRuntime`（`packages/experimental/ptc-runtime-python`，`extends PtcRuntime`，spawn `python3`），**没有**进 shipped `id: ptc-runtime`。未知 `language`（测试用 `'ruby'`）装配与 flavor getter 都 fail-loud。
- **一 scope 一个 mode。** 第二次 `presentAs` 冲突。全局 `presentAs` 非法。
- **`ptc` preset 不把 workflow engine 留给 ralph。** `workflow-ptc` / `tool-workflow` / `tool-ralph` 在 PTC 声明里全部 `disabled: true`。standard / cordis 才启用 `workflow-ptc` + `tool-workflow`（ralph 仍 disabled）。
- **五个 profile。** 叠 `dsh-base` 的 profile 都有 `ptc-runtime`。只有 web overlay 叠四份 shipped preset 并把模型可见工具挪到 preset；headless / sdk / acp 跑 base host-plane 工具行。`sdk-minimal` 不叠 `dsh-base`，也没有本缝。

## Seam 三角

| Seam | Definition | Provider | Consumer |
|---|---|---|---|
| `ctx.ptcRuntime` | `@deepseek-ai/dsh-ptc-runtime` 抽象类 `PtcRuntime`（`ctx` 键 `'ptcRuntime'`） | host 行 `id: ptc-runtime` → `@deepseek-ai/dsh-ptc-runtime-node`（**在** `dsh-base`；因此 web / headless / sdk / acp 都有。**不在** `sdk-minimal`） | `createRunCodeTool` 的 `runtime.run(runtime.resolve(...))`；`wireSchemas` / `tools:sdk` 的 `requirePtcRuntime`；preset 行对 `ptc`/`both` 的 `ctx.inject(['ptcRuntime'], …)` |
| `ctx.tools` + 保留名 `run_code` | `@deepseek-ai/dsh-tools`：`ToolRuntime`、`Events['tools/*']`、`createRunCodeTool` | host `id: tools`（`dsh-base`；web/headless 可 overlay `mode`） | agent-loop `executeToolCalls`；`systemPrompt.tools` → `wireSchemas`；一切 `dsh-tool-*` 的 `register` |
| 呈现 `presentAs` | `ToolRuntime.presentAs` / `ToolLayer.mode` | preset 行 `id: tool-presentation`（仅 shipped `ptc`；`mode` 必填，无默认） | 同一 registry 的 `modeFor` / `collapses` / `view` / section 回调 |
| `tools/ptc-dispatch-log` | `Events` waterfall：`(dispatch, next) => Promise<ContentBlock[]>` | `ToolRuntime.shapeDispatchLog`（innermost：原样 `dispatch.content`） | spill-policy 等：必须 `await next()` 再换 durable 副本 |
| isolate / 泄漏门 | `leakedServices`：root realm 符号 | 需要私有实例的 **preset 服务行** 写 `isolate: { …: true }` | `mountPreset` 拒绝泄漏。`ptcRuntime` 应留 host；`tool-presentation` 不 publish，无 isolate |

## Sources

- packages/core/tools/src/ptc.ts
- packages/core/tools/src/ts-types.ts
- packages/core/tools/src/py-types.ts
- packages/ptc-runtime/ptc-runtime/src/index.ts
- packages/core/tools/src/index.ts
- packages/core/tools/src/types.ts
- packages/core/tools/tests/ptc.spec.ts
- packages/core/agent-tool-presentation/src/index.ts
- packages/core/agent-tool-presentation/tests/agent-tool-presentation.spec.ts
- packages/ptc-runtime/ptc-runtime/src/types.ts
- packages/ptc-runtime/ptc-runtime-node/src/index.ts
- packages/preset/agent-preset-registry/src/mount.ts
- vendor/cordis/src/events.ts
- packages/bundle/web-app/presets/ptc.patch.yml
- packages/bundle/web-app/package.json
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/headless/cordis.patch.yml
- packages/bundle/base/cordis.patch.yml
- packages/bundle/base/tests/base.spec.ts
- packages/core/session/src/surface.ts
- packages/session/session-checkpoint-policy/src/index.ts

## 相关

- [spine.trace-code-mode](../../spine/trace-code-mode.md) — 从 `ptc` preset 到 Node process 再回到 `deriveMessages()` 的一轮走读。
- [subsys.core.tools](tools.md) — host 注册表、`pre-execute` / `execute` / `post-execute`、`presentAs` API。
- [subsys.core.agent-tool-presentation](agent-tool-presentation.md) — preset 面 `mode` 选择器；本页只消费它如何触发 `presentAs`。
- [subsys.execution.code-runtime](../execution/code-runtime.md) — `PtcRuntime` 缝与 Node process 预算。
- [spine.overview](../../spine/overview.md) — `profile → bundle → agent preset` 与 host / preset 切面。
- [spine.tool-call-anatomy](../../spine/tool-call-anatomy.md) — 外层 native 管线；子调用重入同一条。
- [surface.presets.code](../../surface/presets/code.md) — shipped `ptc` 成员与 isolate 组（节点 id 稳定别名）。
