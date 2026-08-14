---
id: subsys.core.code-mode
title: Code Mode 运行时
kind: subsystem
tier: T2
pkg: core
source:
  - packages/core/tools/src/code-mode.ts
  - packages/core/tools/src/ts-types.ts
  - packages/core/tools/src/py-types.ts
  - packages/code-runtime/code-runtime/src/index.ts
  - packages/core/tools/src/index.ts
  - packages/core/tools/src/types.ts
  - packages/core/tools/tests/code-mode.spec.ts
  - packages/core/agent-tool-presentation/src/index.ts
  - packages/core/agent-tool-presentation/tests/agent-tool-presentation.spec.ts
  - packages/code-runtime/code-runtime/src/types.ts
  - packages/code-runtime/code-runtime-worker-thread/src/index.ts
  - packages/preset/agent-presets/src/mount.ts
  - vendor/cordis/src/events.ts
  - apps/cli/config/agent-presets/code/agent.cordis.yml
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
  - CodeRuntime
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
updated: 47f943859b
---

> `run_code` 是 host 面 `ctx.tools` **预留的 presentation transport**（`RUN_CODE_NAME`），不是又一个 `dsh-tool-*` 包：模型写一段程序，`createRunCodeTool` 把 agent 可见工具绑成 `await tools.name(args)`，经 host 面 `ctx.codeRuntime` 执行；子调度走同一套 `tools/pre-execute → execute → post-execute`，带 `parent` token，只有外层 curated 结果进 `deriveMessages()`。

## 能回答的问题

- `run_code` 是谁注册的？为什么 `register('run_code')` 会立刻失败？
- `mode: code` / `both` / `native` 分别把哪些 schema 交给模型？SDK 段从哪张表按 `CodeRuntime.language` 选渲染器？
- 无 `ctx.codeRuntime` 时：schema 读路径、`wireSchemas` 装配、preset `tool-presentation` 行各发生什么？
- 程序里 `await tools.read(...)` 怎样带着 `parent` 重入守卫？`tools/code-dispatch-log` 为什么必须 `next()`？
- `dsh-agent-tool-presentation` 为什么只 `inject: ['tools']`，`code`/`both` 又为何动态等 `codeRuntime`？`leakedServices` 会不会拦这一行？

## 职责边界

本页拥有：**Code Mode 调度桥**（`createRunCodeTool` / 子调用 driver / `tools/code-dispatch-*` 日志）、**语言对齐**（`CodeSdkLanguage` + `RUN_CODE_FLAVORS` + `SDK_RENDERERS`）、以及 **`ctx.codeRuntime` 消费缝**（`requireCodeRuntime` / `peekRuntime` / `CodeRunRequest`）。

本页**不**拥有：

- host 注册表与 `tools/pre-execute` 全管线字段 —— [subsys.core.tools](tools.md)
- preset 行何时 `presentAs`、`Config.mode` 必填、shipped 谁挂这行 —— [subsys.core.agent-tool-presentation](agent-tool-presentation.md)
- worker-thread 预算、剥类型、`isolation` 语义 —— [subsys.execution.code-runtime](../execution/code-runtime.md)
- 一轮真实路径（picker → assemble → worker → client 树）—— [spine.trace-code-mode](../../spine/trace-code-mode.md)
- `run_code` JSON schema / `presentCall` 卡片 —— [surface.tools.run-code](../../surface/tools/run-code.md)（T1）
- shipped `code` / PTC 成员表 —— [surface.presets.code](../../surface/presets/code.md)

`dsh-base` **不** insert `code-runtime`，也 **没有** `subagent-codex` / `subagent-claude-code` 行——不是「装了但 dormant」：`base.spec.ts` 钉死这两 id 的 patch 行数为 0，且 manifest 不依赖 `@deepseek-ai/dsh-subagent-codex` / `@deepseek-ai/dsh-subagent-claude-code`。[E: packages/bundle/base/tests/base.spec.ts:38] [E: packages/bundle/base/tests/base.spec.ts:39] [E: packages/bundle/base/tests/base.spec.ts:40] [E: packages/bundle/base/tests/base.spec.ts:41] `codeRuntime` 只出现在 `dsh-web-app` / `dsh-headless` 的 host insert。进程级 Code Mode 另有临时 env `DSH_TOOLS_MODE`，与 per-session `presentAs` 正交。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/core/tools/src/code-mode.ts` | `RUN_CODE_NAME`、`createRunCodeTool`、flavor 表、子调度 driver |
| `packages/core/tools/src/index.ts` | `SDK_RENDERERS`、`wireSchemas`、`presentAs`、`collapses`、`shapeDispatchLog` |
| `packages/core/tools/src/ts-types.ts` | TypeScript `tools:sdk`：`renderToolsSdk` |
| `packages/core/tools/src/py-types.ts` | Python `tools:sdk`：`renderToolsSdkPy` |
| `packages/core/tools/src/types.ts` | `tool/code-dispatch-start` / `tool/code-dispatch` 事件载荷 |
| `packages/code-runtime/code-runtime/src/index.ts` | Service Definition：`ctx.codeRuntime` / `CodeRuntime` |
| `packages/code-runtime/code-runtime/src/types.ts` | `CodeRunRequest` / `CodeRunResult`（程序失败是字段，不是 `run()` reject） |
| `packages/code-runtime/code-runtime-worker-thread/src/index.ts` | shipped Provider：`language = 'typescript'` |
| `packages/core/agent-tool-presentation/src/index.ts` | preset 面选择器：`presentAs` + 动态 `inject(['codeRuntime'])` |
| `packages/preset/agent-presets/src/mount.ts` | `inactiveRows` / `leakedServices` |
| `packages/bundle/base/tests/base.spec.ts` | 钉死 base **没有** `subagent-codex` / `subagent-claude-code` |
| `packages/bundle/web-app/cordis.patch.yml` | web overlay：`code-runtime`、`DSH_TOOLS_MODE`、模型可见 id `disabled: true`、`agent-presets` |
| `packages/bundle/headless/cordis.patch.yml` | headless overlay：`code-runtime` + `DSH_TOOLS_MODE`；**不**挂 `agent-presets` |
| `vendor/cordis/src/events.ts` | waterfall：不 `next()` 就不 `shift` |

## 数据模型

| 符号 | 落点 | 含义 |
|---|---|---|
| `RUN_CODE_NAME` | `code-mode.ts` | 模型可见名 `'run_code'`；注册表保留，禁止 `register` / `restrict` |
| `ToolPresentationMode` | `tools` `Config.mode` | `'native'`（默认）/ `'code'` / `'both'`。全局改法是 host `tools` 行；per-scope 改法是 `presentAs` |
| `CodeSdkLanguage` | `code-mode.ts` | `'typescript' \| 'python'`。`RUN_CODE_FLAVORS` 与 `SDK_RENDERERS` 都 `satisfies` 此 union |
| `CodeRunRequest` | `dsh-code-runtime` types | `{ program, bindings, signal? }`。无隐藏预算字段 |
| `CodeRunResult` | 同左 | `{ value?, logs, error? }`。`error.kind`：`exception` / `timeout` / `abort` / `worker-exit` / `invalid-output` / `output-limit` |
| `CodeDispatchLog` | `dsh-tools` | 子调用已 settle 的 **日志副本**；waterfall 只能换这块 `content` |
| `tool/code-dispatch-start` / `tool/code-dispatch` | `SessionEventMap` | log-only。`subCallId = \`<parent>:code:<n>\`` |
| `maxParallelSubCalls` | `tools` Config | 并行子调用重叠上限，默认 `10` |

## 控制流

### A. 组合：host 提供 runtime，preset 只改呈现

1. `dsh-web-app` / `dsh-headless` 在 **host 面** insert `id: code-runtime`，插件 `@deepseek-ai/dsh-code-runtime-worker-thread`。[E: packages/bundle/web-app/cordis.patch.yml:48] [E: packages/bundle/headless/cordis.patch.yml:24] Service Definition `CodeRuntime` 构造 `super(ctx, 'codeRuntime')` 发布进程级 `ctx.codeRuntime`。[E: packages/code-runtime/code-runtime/src/index.ts:122] shipped `WorkerThreadCodeRuntime` 以 `super(ctx)` 挂上同一键，`language = 'typescript'`。[E: packages/code-runtime/code-runtime-worker-thread/src/index.ts:254] [E: packages/code-runtime/code-runtime-worker-thread/src/index.ts:246]

2. `dsh-base` 的 `tools` 行默认 `mode: 'native'`（schema default）。web / headless 把该行写成 `mode: !!js process.env.DSH_TOOLS_MODE`：未设 env 时仍是 schema 默认 `native`；设了则整进程 `defaultMode` 变成 `code`/`both`。这是 workaround，不是 `code` preset 路径。[E: packages/core/tools/src/index.ts:791] [E: packages/bundle/web-app/cordis.patch.yml:41] [E: packages/bundle/headless/cordis.patch.yml:20] web 再把 base 上模型可见行标 `disabled: true`，然后 insert `agent-presets` 且 `default: standard`。headless **不**挂 `agent-presets`，也 **不** disable 这些 tool 行：模型可见工具留在 host 全局层。[E: packages/bundle/web-app/cordis.patch.yml:421] [E: packages/bundle/web-app/cordis.patch.yml:424]

   `dsh-web-app` 被 `disabled: true` 的模型可见 id（每条 `id:` 下一行是 `disabled: true`；`hmr` 也 disabled，但不在模型可见集）：[E: packages/bundle/web-app/cordis.patch.yml:294]

   | id | 证据 |
   |---|---|
   | `tool-bash` | [E: packages/bundle/web-app/cordis.patch.yml:293] [E: packages/bundle/web-app/cordis.patch.yml:294] |
   | `tool-pwsh` | [E: packages/bundle/web-app/cordis.patch.yml:296] [E: packages/bundle/web-app/cordis.patch.yml:297] |
   | `tool-jobs` | [E: packages/bundle/web-app/cordis.patch.yml:309] [E: packages/bundle/web-app/cordis.patch.yml:310] |
   | `tool-fs` | [E: packages/bundle/web-app/cordis.patch.yml:312] [E: packages/bundle/web-app/cordis.patch.yml:313] |
   | `tool-fs-search` | [E: packages/bundle/web-app/cordis.patch.yml:315] [E: packages/bundle/web-app/cordis.patch.yml:316] |
   | `tool-str-replace-editor` | [E: packages/bundle/web-app/cordis.patch.yml:318] [E: packages/bundle/web-app/cordis.patch.yml:319] |
   | `skill-filesystem` | [E: packages/bundle/web-app/cordis.patch.yml:330] [E: packages/bundle/web-app/cordis.patch.yml:331] |
   | `tool-skill` | [E: packages/bundle/web-app/cordis.patch.yml:333] [E: packages/bundle/web-app/cordis.patch.yml:334] |
   | `tool-goal` | [E: packages/bundle/web-app/cordis.patch.yml:345] [E: packages/bundle/web-app/cordis.patch.yml:346] |
   | `plan-mode` | [E: packages/bundle/web-app/cordis.patch.yml:348] [E: packages/bundle/web-app/cordis.patch.yml:349] |
   | `compaction-basic` | [E: packages/bundle/web-app/cordis.patch.yml:358] [E: packages/bundle/web-app/cordis.patch.yml:359] |
   | `command-compact` | [E: packages/bundle/web-app/cordis.patch.yml:361] [E: packages/bundle/web-app/cordis.patch.yml:362] |
   | `tool-result-pruner` | [E: packages/bundle/web-app/cordis.patch.yml:364] [E: packages/bundle/web-app/cordis.patch.yml:365] |
   | `tool-subagent-control` | [E: packages/bundle/web-app/cordis.patch.yml:374] [E: packages/bundle/web-app/cordis.patch.yml:375] |
   | `tool-subagent-list-agents` | [E: packages/bundle/web-app/cordis.patch.yml:377] [E: packages/bundle/web-app/cordis.patch.yml:378] |
   | `tool-subagent` | [E: packages/bundle/web-app/cordis.patch.yml:380] [E: packages/bundle/web-app/cordis.patch.yml:381] |
   | `tool-subagent-fork` | [E: packages/bundle/web-app/cordis.patch.yml:383] [E: packages/bundle/web-app/cordis.patch.yml:384] |
   | `workflow-worker-thread` | [E: packages/bundle/web-app/cordis.patch.yml:392] [E: packages/bundle/web-app/cordis.patch.yml:393] |
   | `tool-workflow` | [E: packages/bundle/web-app/cordis.patch.yml:395] [E: packages/bundle/web-app/cordis.patch.yml:396] |
   | `tool-ralph` | [E: packages/bundle/web-app/cordis.patch.yml:398] [E: packages/bundle/web-app/cordis.patch.yml:399] |
   | `agent-instructions` | [E: packages/bundle/web-app/cordis.patch.yml:401] [E: packages/bundle/web-app/cordis.patch.yml:402] |
   | `tool-todo` | [E: packages/bundle/web-app/cordis.patch.yml:404] [E: packages/bundle/web-app/cordis.patch.yml:405] |
   | `tool-web` | [E: packages/bundle/web-app/cordis.patch.yml:407] [E: packages/bundle/web-app/cordis.patch.yml:408] |

3. shipped `code` preset 在 `agent.cordis.yml` 末尾挂 `id: tool-presentation`，`config.mode: code`。`bash` / `read` 等工具行仍在 preset 里 `register` 进 **host** 注册表；改变的是呈现，不是删行。`tool-presentation` **没有** `isolate:` 块——它不 publish 任何 service。[E: apps/cli/config/agent-presets/code/agent.cordis.yml:259] [E: apps/cli/config/agent-presets/code/agent.cordis.yml:262]

4. `apply@packages/core/agent-tool-presentation/src/index.ts`：静态 `inject = ['tools']`（故意不含 `codeRuntime`，否则 `native` 行也会被 runtime 绑住）。`native` 立刻 `ctx.tools.presentAs('native')`；`code` / `both` 走 `ctx.inject(['codeRuntime'], runtimeCtx => runtimeCtx.tools.presentAs(config.mode))`。[E: packages/core/agent-tool-presentation/src/index.ts:35] [E: packages/core/agent-tool-presentation/src/index.ts:64] [E: packages/core/agent-tool-presentation/src/index.ts:69]

5. `presentAs@packages/core/tools/src/index.ts` 必须在 scoped context（preset standing scope / `agent.ctx`）；全局调用抛错，指引去改 `tools` 行的 `mode`。同一 scope 第二次声明冲突抛错。非 `native` 时为本 scope 再注册 `tools:code-only` 与 `tools:sdk`。[E: packages/core/tools/src/index.ts:949] [E: packages/core/tools/src/index.ts:956] [E: packages/core/tools/src/index.ts:967] [E: packages/core/tools/src/index.ts:968] [E: packages/core/tools/src/index.ts:969]

### B. isolate 与 `leakedServices`

6. `mountPreset@packages/preset/agent-presets/src/mount.ts` 在 subtree settle 后做两道门：`inactiveRows`（enabled 行仍在等静态 `fiber.inject` 里的服务）和 `leakedServices`（subtree 把 service publish 进 **root realm**）。后者抛 `row(s) published process-global service(s) […]；a preset service must sit behind an isolate realm or move to the host composition`。[E: packages/preset/agent-presets/src/mount.ts:295] [E: packages/preset/agent-presets/src/mount.ts:361] [E: packages/preset/agent-presets/src/mount.ts:365]

7. `leakedServices` 比较 `store` 里实现的 symbol 是否等于 `ctx.root[Context.isolate][impl.name]`：无 `isolate` 的 Provider 写进 root 符号，就会被点名；`isolate: { name: true }` 写进 realm-private 符号，则缺席。[E: packages/preset/agent-presets/src/mount.ts:189] [E: packages/preset/agent-presets/src/mount.ts:200]

8. **对本缝的含义：** `codeRuntime` 必须留在 host（web/headless 那一行）。若有人把 `CodeRuntime` 实现挂进 preset 且不写 `isolate`，`leakedServices` 拒绝。`dsh-agent-tool-presentation` 只改 `ToolLayer.mode`，不 `provide` 服务，所以 **不需要** `isolate`，也不会触发泄漏门。同份 `code` preset 里 `planning` / `compaction` / `delegation` 组才带 `isolate:`（`planMode` / `compaction` / `workflowEngine`），与 Code Mode transport 无关。[E: apps/cli/config/agent-presets/code/agent.cordis.yml:114] [E: apps/cli/config/agent-presets/code/agent.cordis.yml:115] [E: apps/cli/config/agent-presets/code/agent.cordis.yml:147] [E: apps/cli/config/agent-presets/code/agent.cordis.yml:148] [E: apps/cli/config/agent-presets/code/agent.cordis.yml:178] [E: apps/cli/config/agent-presets/code/agent.cordis.yml:179]

9. `inactiveRows` **只**读 `entry.fiber.inject`（行的静态 inject）。`tool-presentation` 的静态 inject 是 `['tools']`；等 `codeRuntime` 的是 `apply` 里另开的子 fiber。因此缺 runtime 时：`row.await()` 仍成功，`presentAs('code')` 未跑，`modeFor` 仍是部署默认 `native`，`assemble` 继续交出 native 名（测试里是 `echo`）。后来 `ctx.plugin(StubRuntime)` 才切到 `[run_code]`。[E: packages/core/agent-tool-presentation/tests/agent-tool-presentation.spec.ts:55] [E: packages/core/agent-tool-presentation/tests/agent-tool-presentation.spec.ts:109] [E: packages/core/agent-tool-presentation/tests/agent-tool-presentation.spec.ts:111] [E: packages/core/agent-tool-presentation/tests/agent-tool-presentation.spec.ts:121] [U]

### C. 装配：`wireSchemas` 与语言表

10. `ToolRuntime` 构造时把 `ctx.systemPrompt.tools` 接到 `wireSchemas(scope)`。`modeFor` 沿 scope 链取最近的 `layer.mode`，否则 `defaultMode`。[E: packages/core/tools/src/index.ts:832] [E: packages/core/tools/src/index.ts:908] [E: packages/core/tools/src/index.ts:910]

11. `view()` 在 filterable 层之后、且 `modeFor !== 'native'` 时，把保留 transport 插入 `visible`。`register` 见到 `run_code` 直接抛 reserved；`restrict` 也不能点这个名字。[E: packages/core/tools/src/index.ts:1190] [E: packages/core/tools/src/index.ts:1055] [E: packages/core/tools/src/index.ts:1086]

12. `wireSchemas@packages/core/tools/src/index.ts`：`native` 投影全部可见 schema。非 native **先** `requireCodeRuntime(mode)`（`ctx.get('codeRuntime')` 为空则抛；`language` 不在 `SDK_RENDERERS` 自己的键上也抛），再投影。`mode === 'code'` 只留名为 `run_code` 的 schema，`knownNames` 收成 `[RUN_CODE_NAME]`；`both` 留下 native + `run_code`。[E: packages/core/tools/src/index.ts:992] [E: packages/core/tools/src/index.ts:996] [E: packages/core/tools/src/index.ts:1000] [E: packages/core/tools/src/index.ts:1022] [E: packages/core/tools/src/index.ts:1024] [E: packages/core/tools/tests/code-mode.spec.ts:131]

13. `SDK_RENDERERS` 与 `RUN_CODE_FLAVORS` 都 `satisfies Record<CodeSdkLanguage, …>`，`CodeSdkLanguage = 'typescript' | 'python'`。漏改一侧是 typecheck 失败，不是运行时静默错语言。`tools:sdk`（order 150）用 `SDK_RENDERERS[runtime.language]` 调 `renderToolsSdk` 或 `renderToolsSdkPy`；`sdkSchemas` 排除 `run_code` 自身。`tools:code-only`（order 99）只在有效 `mode === 'code'` 写出「只能直接调 `run_code`」。[E: packages/core/tools/src/code-mode.ts:23] [E: packages/core/tools/src/code-mode.ts:80] [E: packages/core/tools/src/code-mode.ts:86] [E: packages/core/tools/src/index.ts:51] [E: packages/core/tools/src/index.ts:63] [E: packages/core/tools/src/index.ts:861] [E: packages/core/tools/src/index.ts:888] [E: packages/core/tools/src/index.ts:1241] [E: packages/core/tools/src/ts-types.ts:273] [E: packages/core/tools/src/py-types.ts:763]

14. **无 runtime 的两条读路径必须分开。** 定义 readers / `schemas()` 走 `peekRuntime()`：`undefined` 时 `resolveFlavor` 退化 `TYPESCRIPT_FLAVOR`（doc-catalog 是 shipped 的这条路，不喂模型）。真正装配 `wireSchemas` 先 `requireCodeRuntime`，host `defaultMode` 已是 `code` 且没 runtime 时 `assemble` 整次拒绝。[E: packages/core/tools/src/code-mode.ts:120] [E: packages/core/tools/tests/code-mode.spec.ts:361] [E: packages/core/tools/tests/code-mode.spec.ts:449]

### D. 外层 `run_code` 与带 `parent` 的子调度

15. 模型只看到 `run_code`（`code`）或 native+`run_code`（`both`）。loop 为外层构造 **没有** `parent` 的 `ToolExecutionInput`，进同一套 `prepareExecution`。`tools/pre-execute` 是 waterfall：innermost `next` 默认 `{ kind: 'allow' }`；listener 不调用传入的 `next()`，Cordis 就不会 `shift` 到下一层，链停在本层（含默认 allow）。[E: packages/core/tools/src/index.ts:1476] [E: packages/core/tools/src/index.ts:1477] [E: vendor/cordis/src/events.ts:237]

16. `session-checkpoint-policy` 挂在 `tools/execute`：`exec.parent !== undefined` 时直接 `next()`，子调用复用外层已 flush 的落点。[E: packages/session/session-checkpoint-policy/src/index.ts:71]

17. `collapses`：`!nested && modeFor(scope) === 'code' && name !== RUN_CODE_NAME`。走 `modeFor` 而不是 `defaultMode`，否则 native 部署上的 `code` preset 会宣布 `[run_code]` 却仍执行 native 名。模型直调 `write` 在 **policy 之前** 变成 `UNKNOWN_TOOL`（文案指引从程序里调），approval / guard 看不到注定失败的调用。[E: packages/core/tools/src/index.ts:1325] [E: packages/core/tools/src/index.ts:1381] [E: packages/core/tools/src/index.ts:1441]

18. `createRunCodeTool.execute@packages/core/tools/src/code-mode.ts`：非空 `description`；`requireRuntime()`；为整次 run 建 `AbortController`。`registry.schemas(exec.agent)` 枚举该 agent 可见工具，**跳过** `run_code`，每个名字绑成 `CodeBindingFunction`。`runtime.run({ program: args.code, bindings: [{ global: 'tools', functions, errorClass: { name: 'ToolCallError', memberNameProperty: 'toolName' } }], signal })`。[E: packages/core/tools/src/code-mode.ts:330] [E: packages/core/tools/src/code-mode.ts:332] [E: packages/core/tools/src/code-mode.ts:338] [E: packages/core/tools/src/code-mode.ts:607] [E: packages/core/tools/src/code-mode.ts:614]

19. 程序侧 `await tools.name(args)` 回到 binding：`jsonNormalizeArgs` 后分配 `subCallId = \`${callId}:code:${n}\``，构造带 `parent: exec.token` 的 input，交给 `registry[TOOL_RUNTIME_SCHEDULER]`。`nested === true` 时 `collapses` 为 false，SDK 子调用可以点名 `read` / `bash`，重入完整 `prepare`（pre-execute / ask / guards）→ `dispatch`（`tools/execute` + body）→ `finalize`/`finish`（post-execute）。[E: packages/core/tools/src/code-mode.ts:477] [E: packages/core/tools/src/code-mode.ts:545]

20. 子调度单车道：`start()` 先 `append('tool/code-dispatch-start')` 再 `scheduler.prepare`；连续 `isConcurrencySafe === true` 的调用最多重叠 `maxParallelSubCalls`；exclusive 等池空且自己的 `commit()`（含 post-execute）完成。分类在每次 `start` 前重读 `executionMode()`。

### E. `tools/code-dispatch-log` waterfall 与 model-visible

21. `settle` **立刻**把完整 JSON value 还给程序。日志另走 `shapeDispatchLog` → `ctx.waterfall(..., 'tools/code-dispatch-log', dispatch, () => Promise.resolve(dispatch.content))`。listener 必须 `next()` 才会 `shift`：不调用则后续 listener 与 innermost「原样返回 `content`」都不跑，本层返回值成为 durable 副本。spill 等 Consumer 先 `await next()` 再把 oversized 文本换成 preview + locator。抛错被 contain，回退原始 `content`。[E: packages/core/tools/src/index.ts:1299] [E: vendor/cordis/src/events.ts:238] [E: packages/core/tools/tests/code-mode.spec.ts:958] [E: packages/core/tools/tests/code-mode.spec.ts:967]

22. 然后 `session.append('tool/code-dispatch', { rootCallId, parentCallId, subCallId, name, arguments, isError, content })`。`SURFACE_EVENT_TYPES` 只有 `user/message` / `assistant/message` / `tool/result`；`deriveEventMessage` 对 dispatch 事件走 `default` 返回 `null`。测试钉死 dispatch 不派生 model message。外层 `output.render` 把 `logs` + completion 拼成一段 text，loop 再 `append('tool/result')`。这是 **model-visible ⟺ logged** 在 Code Mode 上的切法：子调用 logged 供 UI / 重建，但不进下一轮 `messages`。[E: packages/core/tools/src/code-mode.ts:510] [E: packages/core/session/src/surface.ts:16] [E: packages/core/session/src/surface.ts:17] [E: packages/core/session/src/surface.ts:18] [E: packages/core/session/src/surface.ts:109] [E: packages/core/session/src/surface.ts:112] [E: packages/core/tools/tests/code-mode.spec.ts:1568] [E: packages/core/tools/tests/code-mode.spec.ts:1569]

23. `CodeRuntime.run` 合同：程序失败写在 `CodeRunResult.error`，`run()` 本身只在 Service Definition 误用时 reject。`createRunCodeTool` 见到 `result.error` 抛 `CodeRunFailedError`（`CODE_RUN_FAILED`），注册表把它收成 `isError` 外层结果。[E: packages/code-runtime/code-runtime/src/index.ts:134] [E: packages/code-runtime/code-runtime/src/types.ts:126] [E: packages/core/tools/src/code-mode.ts:141] [E: packages/core/tools/src/code-mode.ts:631]

## 设计动机

Code Mode 把「多步工具编排」从模型的 native function-calling 挪进一段程序，但 **不**另起一套执行器。能力仍由 host `ctx.tools` 注册；preset 只声明呈现。`CodeRuntime` 零工具知识：请求只有 `program` / `bindings` / `signal`，approval / sandbox / timeout 全在 `dsh-tools` 桥一侧。两张语言表用同一个 `satisfies CodeSdkLanguage` 锁死，避免 TypeScript schema 配 Python SDK。子调用必须落盘（client 树、重建），但不能灌回 context——所以 dispatch 事件故意不进 surface。

相对 peer harness：这不是「再做一个 coding agent 的 interpreter 工具」，而是 Cordis 组合里 **host 注册表 + host runtime + preset 呈现** 的三层切分。同进程可以并排跑 `code` 与 `native` 会话。

## Gotcha

- **`run_code` 不是包。** 没有 `@deepseek-ai/dsh-tool-run-code`。名字由注册表保留；抢注或 `restrict` 点它都抛。
- **程序永远绑不到 `run_code`。** 即使 `mode: 'both'`，binding 枚举也 `continue` 掉它，避免递归 transport。
- **collapse 在 policy 前。** `code` 下模型直调 native 名不会进 approval。嵌套因为 `parent` 才重入守卫。
- **`tools/code-dispatch-log` 改不了程序已拿到的值。** 只改即将 `append` 的副本。不 `next()` 等于否决后续 spill。
- **无 runtime：读 schema 退化 TS，装配失败。** `peekRuntime() === undefined` → TypeScript flavor；`wireSchemas` / 已生效的非 native `defaultMode` → throw。preset 动态 wait 未完成时 `modeFor` 仍是 native，assemble **不会**走到 `requireCodeRuntime`。
- **JSDoc / 测试注释写「缺 runtime 则 mount 失败、审计点名该行」。** `inactiveRows` 只看静态 `inject: ['tools']`，可执行断言是 `row.await()` 成功且 assemble 仍为 `echo`。[U]
- **`DSH_TOOLS_MODE` ≠ 选了 `code` preset。** 前者改 host `defaultMode`（整进程）；后者是 standing scope 上的 `presentAs('code')`。
- **shipped backend 只有 TypeScript。** Python flavor / `renderToolsSdkPy` 已接线，本仓 published 实现仍是 `WorkerThreadCodeRuntime.language = 'typescript'`。未知 `language`（测试用 `'ruby'`）装配与 flavor getter 都 fail-loud。
- **一 scope 一个 mode。** 第二次 `presentAs` 冲突。全局 `presentAs` 非法。

## Seam 三角

| Seam | Definition | Provider | Consumer |
|---|---|---|---|
| `ctx.codeRuntime` | `@deepseek-ai/dsh-code-runtime` 抽象类 `CodeRuntime`（`ctx` 键 `'codeRuntime'`） | host 行 `id: code-runtime` → `@deepseek-ai/dsh-code-runtime-worker-thread`（web-app / headless insert；**不**在 `dsh-base`） | `createRunCodeTool` 的 `runtime.run`；`wireSchemas` / `tools:sdk` 的 `requireCodeRuntime`；preset 行对 `code`/`both` 的 `ctx.inject(['codeRuntime'], …)` |
| `ctx.tools` + 保留名 `run_code` | `@deepseek-ai/dsh-tools`：`ToolRuntime`、`Events['tools/*']`、`createRunCodeTool` | host `id: tools`（`dsh-base`；web/headless 可 overlay `mode`） | agent-loop `executeToolCalls`；`systemPrompt.tools` → `wireSchemas`；一切 `dsh-tool-*` 的 `register` |
| 呈现 `presentAs` | `ToolRuntime.presentAs` / `ToolLayer.mode` | preset 行 `id: tool-presentation`（仅 shipped `code`；`mode` 必填，无默认） | 同一 registry 的 `modeFor` / `collapses` / `view` / section 回调 |
| `tools/code-dispatch-log` | `Events` waterfall：`(dispatch, next) => Promise<ContentBlock[]>` | `ToolRuntime.shapeDispatchLog`（innermost：原样 `dispatch.content`） | spill-policy 等：必须 `await next()` 再换 durable 副本 |
| isolate / 泄漏门 | `leakedServices`：root realm 符号 | 需要私有实例的 **preset 服务行** 写 `isolate: { …: true }` | `mountPreset` 拒绝泄漏。`codeRuntime` 应留 host；`tool-presentation` 不 publish，无 isolate |

## Sources

- packages/core/tools/src/code-mode.ts
- packages/core/tools/src/ts-types.ts
- packages/core/tools/src/py-types.ts
- packages/code-runtime/code-runtime/src/index.ts
- packages/core/tools/src/index.ts
- packages/core/tools/src/types.ts
- packages/core/tools/tests/code-mode.spec.ts
- packages/core/agent-tool-presentation/src/index.ts
- packages/core/agent-tool-presentation/tests/agent-tool-presentation.spec.ts
- packages/code-runtime/code-runtime/src/types.ts
- packages/code-runtime/code-runtime-worker-thread/src/index.ts
- packages/preset/agent-presets/src/mount.ts
- vendor/cordis/src/events.ts
- apps/cli/config/agent-presets/code/agent.cordis.yml
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/headless/cordis.patch.yml
- packages/bundle/base/cordis.patch.yml
- packages/bundle/base/tests/base.spec.ts
- packages/core/session/src/surface.ts
- packages/session/session-checkpoint-policy/src/index.ts

## 相关

- [spine.trace-code-mode](../../spine/trace-code-mode.md) — 从 `code` preset 到 worker 再回到 `deriveMessages()` 的一轮走读。
- [subsys.core.tools](tools.md) — host 注册表、`pre-execute` / `execute` / `post-execute`、`presentAs` API。
- [subsys.core.agent-tool-presentation](agent-tool-presentation.md) — preset 面 `mode` 选择器；本页只消费它如何触发 `presentAs`。
- [subsys.execution.code-runtime](../execution/code-runtime.md) — `CodeRuntime` 缝与 worker-thread 预算。
- [spine.overview](../../spine/overview.md) — `profile → bundle → agent preset` 与 host / preset 切面。
- [spine.tool-call-anatomy](../../spine/tool-call-anatomy.md) — 外层 native 管线；子调用重入同一条。
- [surface.presets.code](../../surface/presets/code.md) — shipped `code` / PTC 成员与 isolate 组。
