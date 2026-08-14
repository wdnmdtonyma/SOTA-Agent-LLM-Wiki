---
id: surface.tools.run-code
title: run_code (Code Mode)
kind: tool
tier: T1
pkg: core
source:
  - packages/core/tools/src/code-mode.ts
  - packages/core/tools/src/index.ts
  - packages/core/tools/src/schema.ts
  - packages/core/tools/src/types.ts
  - packages/core/tools/src/ts-types.ts
  - packages/core/tools/package.json
  - packages/core/tools/tests/code-mode.spec.ts
  - packages/core/agent-tool-presentation/src/index.ts
  - packages/core/agent-tool-presentation/package.json
  - packages/core/agent-tool-presentation/tests/agent-tool-presentation.spec.ts
  - packages/code-runtime/code-runtime/src/index.ts
  - packages/code-runtime/code-runtime/src/types.ts
  - packages/code-runtime/code-runtime/package.json
  - packages/code-runtime/code-runtime-worker-thread/src/index.ts
  - packages/code-runtime/code-runtime-worker-thread/src/bootstrap.ts
  - packages/code-runtime/code-runtime-worker-thread/package.json
  - packages/session/session-checkpoint-policy/src/index.ts
  - packages/core/session/src/surface.ts
  - packages/guard/timeout-policy/src/index.ts
  - packages/preset/agent-presets/src/mount.ts
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/headless/cordis.patch.yml
  - apps/cli/config/agent-presets/code/agent.cordis.yml
  - apps/cli/config/agent-presets/code/preset.yml
  - apps/cli/config/agent-presets/minimal/agent.cordis.yml
  - apps/cli/config/agent-presets/standard/agent.cordis.yml
  - apps/cli/config/agent-presets/cordis/agent.cordis.yml
  - apps/cli/tests/web-agent-presets.e2e.ts
symbols:
  - RUN_CODE_NAME
  - createRunCodeTool
  - presentAs
  - CodeRunFailedError
  - wireSchemas
  - collapses
  - apply
  - name
  - inject
  - Config
related:
  - spine.tool-call-anatomy
  - ref.tools-catalog
  - spine.trace-code-mode
  - surface.presets.code
  - subsys.core.code-mode
evidence: explicit
status: verified
updated: 47f943859b
---

> `run_code` 是 `@deepseek-ai/dsh-tools` 在 Code Mode 下留给模型的**唯一** function-calling 运输工具（`RUN_CODE_NAME = 'run_code'`）：模型写一段 TypeScript 程序，host 面 `ctx.codeRuntime` 执行它，程序里用 `await tools.name(args)` 重入同一套工具管线。它**不是** `packages/*/tool-*` 插件行。

## 能回答的问题

- `run_code` 的 wire `name`、实现包、工厂与「禁止 `register`」分别在哪？为什么 catalog 里会出现它，yml 里却没有 `id: run_code`？
- 模型可见字段是哪两个？`description` 空白、缺 `code`、程序 `print`/`return` 空，分别得到什么？
- `code` preset 怎样让 `assembly.tools === ['run_code']`？`minimal` / `standard` / `cordis` 为什么模型直接看见 `bash` / `read`？
- `await tools.read(...)` 怎样带着 `parent` token 绕过 collapse、仍走 approval / sandbox / timeout？子调用为什么进 session log 却不进下一轮 LLM？
- bindings 为什么跳过 `run_code` 自己？runtime 缝知不知道工具？

## Identity

模型看见的工具名是字面量 `'run_code'`，导出常量 `RUN_CODE_NAME`。[E: packages/core/tools/src/code-mode.ts:20]

实现包是 `@deepseek-ai/dsh-tools`（工具 **registry** 包，不是 `dsh-tool-*`）。工厂是 `createRunCodeTool(registry, options)`：`defineTool({ name: RUN_CODE_NAME, … })`，由 `ToolRuntime.requireCodeTransport()` 在第一次需要时惰性构造，**从不**走进 `ctx.tools.register()`。[E: packages/core/tools/package.json:2][E: packages/core/tools/src/code-mode.ts:294][E: packages/core/tools/src/code-mode.ts:297][E: packages/core/tools/src/index.ts:922][E: packages/core/tools/src/index.ts:923]

`register()` 无条件拒绝这个名字：任何 agent 都可能给自己选 Code Mode，部署默认下抢到这个名字会在 preset mount 时变成碰撞。[E: packages/core/tools/src/index.ts:1054][E: packages/core/tools/src/index.ts:1055]

`restrict({ allow|deny })` 同样不能点名 `run_code`。[E: packages/core/tools/src/index.ts:1085][E: packages/core/tools/src/index.ts:1086]

可见性插入发生在 `view()` 末尾、capability 过滤之后：`modeFor(scope) !== 'native'` 才把 transport 放进该 scope 的 dispatch 表。同进程里 `native` 会话的 `get('run_code')` 仍是 `undefined`。[E: packages/core/tools/src/index.ts:1189][E: packages/core/tools/src/index.ts:1190][E: packages/core/tools/tests/code-mode.spec.ts:1591]

产品面上让一个会话进入 Code Mode 的 **agent-preset 行**是 `@deepseek-ai/dsh-agent-tool-presentation`：插件名 `export const name = 'tool-presentation'`，静态 `inject = ['tools']`（故意不含 `codeRuntime`），`Config.mode` 为必填的 `'native' | 'code' | 'both'`。[E: packages/core/agent-tool-presentation/package.json:2][E: packages/core/agent-tool-presentation/src/index.ts:28][E: packages/core/agent-tool-presentation/src/index.ts:35][E: packages/core/agent-tool-presentation/src/index.ts:51]

`apply(ctx, config)`：`native` 立刻 `ctx.tools.presentAs('native')`；`code` / `both` 则 `ctx.inject(['codeRuntime'], …)` 再 `presentAs(config.mode)`。[E: packages/core/agent-tool-presentation/src/index.ts:63][E: packages/core/agent-tool-presentation/src/index.ts:64][E: packages/core/agent-tool-presentation/src/index.ts:69][E: packages/core/agent-tool-presentation/src/index.ts:70]

`presentAs` 必须在 scoped context（preset 的 standing scope）上调用；进程级默认走 host `tools` 行的 `Config.mode`（schema 默认 `'native'`）。[E: packages/core/tools/src/index.ts:946][E: packages/core/tools/src/index.ts:949][E: packages/core/tools/src/index.ts:791]

`createRunCodeTool` **没有**声明 `timeoutMs`，也 **没有** `isConcurrencySafe`。外层 `run_code` 走 exclusive 调度；`timeout-policy` 读到 `undefined` 就原样 `next()`。[E: packages/core/tools/src/index.ts:1278][E: packages/guard/timeout-policy/src/index.ts:57][E: packages/guard/timeout-policy/src/index.ts:59]

## 用途定位

`run_code` 是 Code Mode 的运输层，不是又一个「执行任意脚本」的 shell。模型一次调用提交：

1. `code`：一段 **async 函数体**（top-level `await` / `return` 合法；TypeScript 走 type-strip，不可擦除语法如 `enum` 会变成程序失败）。
2. `description`：5–10 词的 UI 标题（`presentCall.title`），不参与执行。

程序里的能力来自生成 SDK：`await tools.name(args)`。SDK 声明的是**该 agent 可见、且名字不是 `run_code`** 的工具——同一份 `ctx.tools` 注册表的第二套投影，不是第二套实现。shipped `code` preset 下，模型请求里的 wire schema **只有** `run_code`。[E: packages/core/tools/src/index.ts:994][E: packages/core/tools/src/index.ts:996][E: apps/cli/tests/web-agent-presets.e2e.ts:301]

子调用带着 `parent: exec.token` 重入 `tools/pre-execute → execute → post-execute`。它们写入 `tool/code-dispatch-start` / `tool/code-dispatch`，不进 `deriveMessages()`；模型下一轮只看见外层 curated `tool/result`。[E: packages/core/tools/src/code-mode.ts:477][E: packages/core/session/src/surface.ts:16][E: packages/core/tools/tests/code-mode.spec.ts:1554]

## 输入 schema

以 `createRunCodeTool` 的静态 spec 为准（`defineTool` 用它做参数校验）。语言相关的 **description 文案**是 getter，在 schema 投影时按 `ctx.codeRuntime.language` 换成 TypeScript / Python flavor；字段名与必填性不随语言变。[E: packages/core/tools/src/code-mode.ts:306][E: packages/core/tools/src/code-mode.ts:307][E: packages/core/tools/src/code-mode.ts:667][E: packages/core/tools/src/code-mode.ts:668]

`parameterSchemaSpecToJsonSchema` 编成隐式开放 object：`code` / `description` 进入 JSON Schema `required`；未声明 `additionalProperties: false`。[E: packages/core/tools/src/schema.ts:451][E: packages/core/tools/src/schema.ts:454]

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---:|---|---|---|
| `code` | `string` | 是 | 无 | schema 只要 string；空串仍过校验 | 程序：async 函数体。TypeScript flavor 文案是 `The program: the body of an async TypeScript function.`。[E: packages/core/tools/src/code-mode.ts:306][E: packages/core/tools/src/code-mode.ts:53] |
| `description` | `string` | 是 | 无 | schema 只要 string；`execute` 再拒 `trim().length === 0` | UI 标题，英文合同写 5–10 词、主动语态。空白 / 纯空格变成 `isError`：`invalid description: expected a non-empty string`。[E: packages/core/tools/src/code-mode.ts:310][E: packages/core/tools/src/code-mode.ts:329][E: packages/core/tools/tests/code-mode.spec.ts:1245] |

缺字段或类型不对由 `defineTool` 包装器先 `validate`，抛 `ToolArgsError`（`INVALID_ARGS`），进不了用户 `execute`。[E: packages/core/tools/src/schema.ts:586][E: packages/core/tools/src/schema.ts:587][E: packages/core/tools/src/schema.ts:466]

**Config 不改这两个字段名。** 相关旋钮在 host `tools` 行，不是 `run_code` 自己的参数：

| Config 键 | 默认 | 作用 |
|---|---|---|
| `mode` | `'native'` | 进程默认呈现。`'code'` 只把 `run_code` 交给模型；`'both'` 同时交出 native schema 与 `run_code`。[E: packages/core/tools/src/index.ts:791][E: packages/core/tools/src/index.ts:994] |
| `maxParallelSubCalls` | `10` | 程序里连续 `isConcurrencySafe === true` 的子调用最多重叠数；`1` 变严格串行。必须是正整数。[E: packages/core/tools/src/index.ts:792][E: packages/core/tools/src/index.ts:776] |

shipped `code` preset **不**改这两项：呈现靠 `tool-presentation.config.mode: code` 盖在 standing scope 上，overlap cap 沿用插件默认 10。

**语言 flavor（只改文案）。** `RUN_CODE_FLAVORS` 有 `typescript` 与 `python`。无 runtime 时 `peekRuntime()` 为 `undefined`，退化成 TypeScript（文档 catalog 路径；`wireSchemas` 在投影前会 `requireCodeRuntime`，真实 assemble 不会把 fallback 喂给模型）。未知 language 在 getter 上直接抛。[E: packages/core/tools/src/code-mode.ts:115][E: packages/core/tools/src/code-mode.ts:120][E: packages/core/tools/src/code-mode.ts:127]

shipped Provider `WorkerThreadCodeRuntime.language = 'typescript'`，因此产品默认模型读到 TypeScript 工具描述 + TypeScript SDK。[E: packages/code-runtime/code-runtime-worker-thread/src/index.ts:246][E: packages/core/tools/tests/code-mode.spec.ts:400]

`run_code` **从不**广告 `sandbox_permissions` / `justification` / `timeout`。那些是被绑定的 native 工具自己的字段。

## 输出 & 截断 / spill

`execute` 的规范值是封闭 object：`logs: string[]`（必填）+ 可选 `result`（`type: 'json'`）。registry `createSuccessResult` 校验后再 `output.render`。[E: packages/core/tools/src/code-mode.ts:318][E: packages/core/tools/src/code-mode.ts:319][E: packages/core/tools/src/index.ts:1800]

模型看见的是一段 text，不是裸规范值：

| 条件 | 模型可见 text |
|---|---|
| 只有 `logs` | `logs` 用 `\n` 拼接 |
| 只有 `result` | 字符串原样；其它 JSON 用两空格缩进 pretty-print（总缩进帽 10 字符） |
| `logs` 与 `result` 都有 | 两段用 `\n` 相接 |
| 两者都空 / `result` 缺省且 `logs: []` | `(run_code completed with no output)` |

[E: packages/core/tools/src/code-mode.ts:322][E: packages/core/tools/src/code-mode.ts:325][E: packages/core/tools/tests/code-mode.spec.ts:1254]

程序失败（异常、预算、abort、worker 死、输出非 JSON / 超 cap）走 `CodeRunFailedError`，`HarnessError` code `'CODE_RUN_FAILED'`。文案带 `result.error.kind`、`message`，以及非空时的 `Captured output:` 日志块。registry 收成 `isError`，`error.info = { name: 'CodeRunFailedError', code: 'CODE_RUN_FAILED' }`。[E: packages/core/tools/src/code-mode.ts:141][E: packages/core/tools/src/code-mode.ts:633][E: packages/core/tools/tests/code-mode.spec.ts:1127]

`presentCall`：`card: 'generic'`，`title: args.description`，`kind: 'execute'`，`rawInput: args.code`。没有 `presentResult`——UI 沿用这笔 title，从 durable `tool/result` content 读正文，避免把大结果再拷进 host view。[E: packages/core/tools/src/code-mode.ts:645][E: packages/core/tools/src/code-mode.ts:647][E: packages/core/tools/tests/code-mode.spec.ts:1235]

`run_code` **没有**自己的 spill 路径：不读 `ctx.spillStore`。外层结果就是 curated logs + return。子调用的 durable 副本另走 `tools/code-dispatch-log` waterfall：listener 只能改 **log 里那份** `content`，不能改已经返回给程序的 JSON value，也不能改外层 `tool/result`。[E: packages/core/tools/src/code-mode.ts:503][E: packages/core/tools/src/index.ts:1296]

`tool/code-dispatch*` **不在** `SURFACE_EVENT_TYPES`（只有 `user/message` / `assistant/message` / `tool/result`）。`deriveEventMessage` 对它们走 `default` 返回 `null`。[E: packages/core/session/src/surface.ts:16][E: packages/core/session/src/surface.ts:112][E: packages/core/tools/tests/code-mode.spec.ts:1554]

子事件形状：`rootCallId` / `parentCallId` / `subCallId`（`${parentCallId}:code:${n}`）/ `name` / `arguments`；settle 再加 `isError` + `content`。[E: packages/core/tools/src/types.ts:12][E: packages/core/tools/src/types.ts:20][E: packages/core/tools/src/code-mode.ts:470]

## 背后的 seam

| 角色 | 落点 |
|---|---|
| Definition | `@deepseek-ai/dsh-code-runtime` 的抽象 `CodeRuntime`：`ctx.codeRuntime`，`language` / `isolation` 信息字段，`run(CodeRunRequest): Promise<CodeRunResult>`。请求只有 `program` / `bindings` / `signal`；程序失败是 `result.error` 字段，`run()` 本身只在合同误用时 reject。[E: packages/code-runtime/code-runtime/package.json:2][E: packages/code-runtime/code-runtime/src/index.ts:134][E: packages/code-runtime/code-runtime/src/types.ts:80] |
| Provider | 默认 `@deepseek-ai/dsh-code-runtime-worker-thread` 的 `WorkerThreadCodeRuntime`（`language = 'typescript'`，`isolation = 'worker-thread'`）。web / headless bundle 都在 **host 面** insert 这一行。[E: packages/code-runtime/code-runtime-worker-thread/package.json:2][E: packages/code-runtime/code-runtime-worker-thread/src/index.ts:246][E: packages/bundle/web-app/cordis.patch.yml:49][E: packages/bundle/headless/cordis.patch.yml:25] |
| Consumer | `@deepseek-ai/dsh-tools` 的 `createRunCodeTool`：枚举 `registry.schemas(exec.agent)`、绑 `CodeBindingFunction`、调 `runtime.run`、用 `registry[TOOL_RUNTIME_SCHEDULER]` 调度子调用。agent-preset 面的 `tool-presentation` 只调用 `presentAs`，不执行程序。[E: packages/core/tools/src/code-mode.ts:614][E: packages/core/tools/src/code-mode.ts:481][E: packages/core/agent-tool-presentation/src/index.ts:70] |

换 Provider 会带走：源语言、隔离形态、type-strip / 语法错误形态、`computeMs` / `maxWallMs` / heap / 输出字节帽、`env`/`execArgv`。不会带走：`code`/`description` schema、collapse 规则、SDK 投影、`parent` 重入、dispatch 日志形状。

runtime 缝**零工具知识**。`CodeRunRequest.bindings` 只是命名空间 + 函数表；会话、approval、sandbox、checkpoint 全在 `dsh-tools` 桥一侧。[E: packages/code-runtime/code-runtime/src/types.ts:80][E: packages/code-runtime/code-runtime/src/types.ts:82]

shipped worker 默认预算：`computeMs: 60_000`（worker ELU 忙时）、`maxWallMs: 600_000`、`maxOutputBytes: 67_108_864`、`maxOldGenerationSizeMb: 512`。`new Worker` 使用 `env: {}`、`execArgv: []`。这是 containment，不是对模型代码的安全边界。[E: packages/code-runtime/code-runtime-worker-thread/src/index.ts:240][E: packages/code-runtime/code-runtime-worker-thread/src/index.ts:382][E: packages/code-runtime/code-runtime-worker-thread/src/index.ts:386]

`run_code` 还消费同一进程的 `ctx.tools`（自己所在的 registry）与可选的 `ctx.systemPrompt`（registry 的静态 `inject`）。不消费 `ctx.shell` / `ctx.fs` / `ctx.approval` 作为直接依赖；那些挂在被绑定的 native 工具上。

## 执行管线

模型发出 `run_code` 后，loop 经 `ctx.tools.execute` 进入 registry：`createExecution` → `tools/pre-execute` → 可能的 `ask` → monotonic `guard` → `tools/execute`（around）→ body → `tools/post-execute` → `output.render`。[E: packages/core/tools/src/index.ts:1476][E: packages/core/tools/src/index.ts:1574]

对本运输工具的挂点：

- **collapse 在 policy 之前。** `mode === 'code'` 且 **没有** `parent` 时，除 `run_code` 以外的名字在 `createExecution` 里变成 `final-result`：`UNKNOWN_TOOL`，文案指引「从 `run_code` 程序里调」。`tools/pre-execute` / `ask` / guards **看不到**这次直调。[E: packages/core/tools/src/index.ts:1325][E: packages/core/tools/src/index.ts:1423][E: packages/core/tools/src/index.ts:1441][E: packages/core/tools/tests/code-mode.spec.ts:1607]
- **外层 `run_code` 自己**不注册 pre-execute listener，也不 `ask`。waterfall 默认 `{ kind: 'allow' }`。[E: packages/core/tools/src/index.ts:1477]
- **`tools/execute` 包装：**
  - `session-checkpoint-policy`：有 `exec.agent` 且 `exec.parent === undefined` 才 `flush` session；子调用 `parent !== undefined` 直接 `next()`，复用外层已经 flush 的落点。[E: packages/session/session-checkpoint-policy/src/index.ts:71]
  - `timeout-policy`：`run_code` 未声明 `timeoutMs`，包装器 `next()`。程序时限在 worker 的 `computeMs` / `maxWallMs`，不是工具字段。[E: packages/guard/timeout-policy/src/index.ts:59]
- **调度：** 未声明 `isConcurrencySafe` → `executionMode` 为 `exclusive`。同一步里两个 `run_code` 不会重叠。[E: packages/core/tools/src/index.ts:1278]
- **sandbox / approval：** 外层不挂文件 sandbox stamp。SDK 子调用重入完整管线，被调工具自己的 approval / sandbox / `timeoutMs` 仍生效。

`collapses` 读 `modeFor(scope)`，不读 `defaultMode`。preset 在 native 部署上 `presentAs('code')` 时，直调 `write` 仍会被收掉。[E: packages/core/tools/src/index.ts:1325]

## Preset 装配

成员资格只认 `apps/cli/config/agent-presets/{minimal,standard,code,cordis}/agent.cordis.yml`。`run_code` **不是** yml 里的工具行；四个文件都没有 `id: run_code` / `name: run_code`。模型能不能直调它，取决于有没有 `tool-presentation` 且 `mode: code`（或进程级 `tools.mode`）。

| preset | `tool-presentation` | 模型 wire | isolate | 说明 |
|---|---|---|---|---|
| `minimal` | **否** | native（`bash` + `str_replace_editor`） | 与本工具无关 | 文件无 `tool-presentation` / `dsh-agent-tool-presentation`。e2e 断言 `assembly.tools` 为那两个名字。[E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:59][E: apps/cli/tests/web-agent-presets.e2e.ts:227] |
| `standard` | **否** | native（`bash` / `read` / …，**没有** `run_code`） | 无 | 以 `tool-web` 收束，无 presentation 行。同进程旁的 `code` 会话互不影响。[E: apps/cli/config/agent-presets/standard/agent.cordis.yml:248][E: apps/cli/tests/web-agent-presets.e2e.ts:311] |
| `code` | **是** | **只有** `run_code` | 无（presentation 不 `provide`） | 相对 `standard` 的唯一可加载增量：末尾 `id: tool-presentation` / `name: '@deepseek-ai/dsh-agent-tool-presentation'` / `config.mode: code`。picker 显示名来自 `preset.yml` 的 `PTC 模式`。native 工具行仍在，供 SDK 子调度。[E: apps/cli/config/agent-presets/code/agent.cordis.yml:259][E: apps/cli/config/agent-presets/code/agent.cordis.yml:262][E: apps/cli/config/agent-presets/code/preset.yml:1][E: apps/cli/tests/web-agent-presets.e2e.ts:301] |
| `cordis` | **否** | native + 七个 `cordis_*` | 无 | 增量是 `tool-cordis`，不是 presentation。模型直调 `cordis_define` 等，**不**走 `run_code`。[E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:245] |

`code` 的 `tool-web` 与 `standard` 一样是 `fetch: false`：SDK 里会出现 `web_search`，不会出现 `web_fetch`。e2e 钉死 SDK 文本含 `web_search`、不含 `str_replace_editor`。[E: apps/cli/config/agent-presets/code/agent.cordis.yml:251][E: apps/cli/tests/web-agent-presets.e2e.ts:305]

web host 的 `tools.mode: !!js process.env.DSH_TOOLS_MODE` 与 headless 同一键，是**整进程** defaultMode，不是「选了 shipped `code` preset」。unset 时 schema 默认 `native`。[E: packages/bundle/web-app/cordis.patch.yml:41][E: packages/bundle/headless/cordis.patch.yml:20]

缺 host `codeRuntime` 时：`tool-presentation` 的动态 `inject(['codeRuntime'])` 停在 pending；静态 `inject` 只有 `['tools']`，`inactiveRows` 只读 `fiber.inject`，**不会**因为缺 runtime 点名这一行。单测里此时 `assemble` 仍是 native `echo`。[E: packages/preset/agent-presets/src/mount.ts:295][E: packages/core/agent-tool-presentation/tests/agent-tool-presentation.spec.ts:109][E: packages/core/agent-tool-presentation/tests/agent-tool-presentation.spec.ts:111][U]

## execute() 走读

符号：`createRunCodeTool` @ `packages/core/tools/src/code-mode.ts`；子调度走 `ToolRuntime[TOOL_RUNTIME_SCHEDULER]` @ `packages/core/tools/src/index.ts`；程序跑在 `CodeRuntime.run`。

1. **校验参数。** `defineTool` 先按 schema 收 `code`/`description`。用户 `execute` 再 `args.description.trim().length === 0` 则抛 `invalid description`。[E: packages/core/tools/src/schema.ts:586][E: packages/core/tools/src/code-mode.ts:329]

2. **取 runtime。** `requireRuntime()` → `ctx.get('codeRuntime')`。缺实现时抛错，registry 收成结构化 `isError`（文案含 `requires a code runtime`），不是进程崩溃。[E: packages/core/tools/src/code-mode.ts:332][E: packages/core/tools/src/index.ts:1020][E: packages/core/tools/tests/code-mode.spec.ts:1227]

3. **run-scoped abort。** 新建 `AbortController`；外层 `exec.signal` abort 会链式掐掉未完成子调用。`finally` 里 `abort('run_code settled')` 再 `drainDispatches`。[E: packages/core/tools/src/code-mode.ts:338][E: packages/core/tools/src/code-mode.ts:627]

4. **枚举 bindings，跳过自己。** `registry.schemas(exec.agent)` 是该 agent 可见集。`schema.name === RUN_CODE_NAME` 则 `continue`。函数表是 `Object.create(null)` + `defineProperty`，`__proto__` 这类名字也是 own key。测试钉死即便 `mode: 'both'`，程序侧 `functions.run_code` 仍是 `undefined`。[E: packages/core/tools/src/code-mode.ts:606][E: packages/core/tools/src/code-mode.ts:607][E: packages/core/tools/tests/code-mode.spec.ts:347]

5. **`runtime.run`。** `program: args.code`，单一 namespace `global: 'tools'`，`errorClass: { name: 'ToolCallError', memberNameProperty: 'toolName' }`，`signal: runController.signal`。[E: packages/core/tools/src/code-mode.ts:614][E: packages/core/tools/src/code-mode.ts:617][E: packages/core/tools/src/code-mode.ts:619]

6. **worker 执行。** `WorkerThreadCodeRuntime.run` 用 `stripTypeScriptTypes` 剥类型（包一层 async function 以便 top-level `await`/`return`）；失败且未 spawn 时 `error.kind === 'exception'`。Worker 入口 `runWorkerMain` 用 `AsyncFunction` 以 `'use strict'` 跑 body，注入 `tools`、`ToolCallError`、裁剪过的 `console`。[E: packages/code-runtime/code-runtime-worker-thread/src/index.ts:302][E: packages/code-runtime/code-runtime-worker-thread/src/index.ts:308][E: packages/code-runtime/code-runtime-worker-thread/src/bootstrap.ts:406][E: packages/code-runtime/code-runtime-worker-thread/src/bootstrap.ts:410]

7. **一次 `await tools.name(args)`。** worker `postMessage({ type: 'call', … })`；host 调绑定函数：`snapshotJsonValue` 成无损 JSON（`undefined` / 非 JSON 在 dispatch 之前拒绝），`subCallId = CallId(\`${exec.callId}:code:${n}\`)`，`parent: exec.token`。[E: packages/core/tools/src/code-mode.ts:468][E: packages/core/tools/src/code-mode.ts:470][E: packages/core/tools/src/code-mode.ts:477]

8. **子调度复刻 native 并发合同。** `classify()` 读 `executionMode()`（只有 `isConcurrencySafe === true` 才 parallel）。连续 parallel 最多 `maxParallelSubCalls`；exclusive 等池空，且自己的 `commit()`（含 post-execute）完成才放行。driver 单车道：`start()` 里 `append('tool/code-dispatch-start')` + `scheduler.prepare`；body 走 `dispatch`；`commit()` 里 `finalize`/`finish` 再 `settle`。[E: packages/core/tools/src/code-mode.ts:530][E: packages/core/tools/src/code-mode.ts:535][E: packages/core/tools/src/code-mode.ts:545]

9. **settle 立刻把 JSON value 还给程序。** 失败绑定变成 `throw new Error(outcome.message)`，worker 再包成 `ToolCallError`（`toolName` = 成员名）。log 另走 `shapeDispatchLog` → `session.append('tool/code-dispatch', …)`。[E: packages/core/tools/src/code-mode.ts:592][E: packages/core/tools/src/code-mode.ts:510]

10. **程序结束。** `result.error` 存在则抛 `CodeRunFailedError`；否则返回 `{ logs, result? }`。空输出由 `render` 变成 `(run_code completed with no output)`。nested `concludesTurn` / `deferContext` 会转发到外层 `exec`。[E: packages/core/tools/src/code-mode.ts:631][E: packages/core/tools/src/code-mode.ts:635][E: packages/core/tools/src/code-mode.ts:570]

## 设计动机·edge

DSH 的 Code Mode 不是把 catalog 换成「一个解释器工具」再删掉 `read`/`bash`。preset 仍注册那些行；改变的是 **presentation**：模型 function-calling 面只剩运输名，多步编排改成一段程序，中间子结果不灌回下一轮 context。

和常见 peer 的差异：

- **没有** Claude / Codex 那种模型直调的 `apply_patch` 合一方言。文件副作用仍是 SDK 里的 `read` / `edit` / `write` / `bash`（或 `minimal` 的 `str_replace_editor`），只是到达方式变了。
- **collapse 在 policy 之前。** 模型直调 `write` 不会误触发 approval；子调用因为 `parent` 才重入守卫。[E: packages/core/tools/src/index.ts:1381]
- **禁止递归运输。** bindings 跳过 `run_code`；`register` / `restrict` 也不能碰这个名字。程序没有句柄再 `await tools.run_code(...)`。[E: packages/core/tools/src/code-mode.ts:607]
- **SDK 是第二套投影。** `wireSchemas` 给 function calling；`renderToolsSdk` 给 `declare const tools: { [K in ToolName]: (args) => Promise<…> }`。调用约定写在 `SDK_INSTRUCTIONS`：`await tools.name(args)`，失败用 `ToolCallError`，独立只读可 `Promise.all`。[E: packages/core/tools/src/ts-types.ts:254][E: packages/core/tools/src/ts-types.ts:289]
- **runtime 可替换，工具知识不可下沉。** 换 container / process backend 不应改 schema；也不该让 runtime 去 import `dsh-tools`。
- **worker ≠ sandbox。** `env: {}` 挡住的是环境泄漏，不是敌意模型。文件 / 网络副作用仍经被绑定工具的既有政策。
- **`both` 不是产品默认。** shipped `code` 用 `mode: code`。`both` 会让 native 名与 `run_code` 同时出现在 wire 上，且 `tools:code-only` 段渲染为空——直调 native 在 `both` 下是合法的。[E: packages/core/tools/src/index.ts:861]
- **缺 runtime 时不要把 JSDoc「fails at mount」当成可执行断言。** 静态 `inject` 不含 `codeRuntime`；动态 wait 未完成则 `modeFor` 仍是 native，模型继续看见 native 名。[U]

端到端一轮 turn（host insert runtime → mount `code` → assemble → 子调用树 → `deriveMessages`）写在 [spine.trace-code-mode](../../spine/trace-code-mode.md)，本页不复述那条编号路径。

## Sources

- packages/core/tools/src/code-mode.ts
- packages/core/tools/src/index.ts
- packages/core/tools/src/schema.ts
- packages/core/tools/src/types.ts
- packages/core/tools/src/ts-types.ts
- packages/core/tools/package.json
- packages/core/tools/tests/code-mode.spec.ts
- packages/core/agent-tool-presentation/src/index.ts
- packages/core/agent-tool-presentation/package.json
- packages/core/agent-tool-presentation/tests/agent-tool-presentation.spec.ts
- packages/code-runtime/code-runtime/src/index.ts
- packages/code-runtime/code-runtime/src/types.ts
- packages/code-runtime/code-runtime/package.json
- packages/code-runtime/code-runtime-worker-thread/src/index.ts
- packages/code-runtime/code-runtime-worker-thread/src/bootstrap.ts
- packages/code-runtime/code-runtime-worker-thread/package.json
- packages/session/session-checkpoint-policy/src/index.ts
- packages/core/session/src/surface.ts
- packages/guard/timeout-policy/src/index.ts
- packages/preset/agent-presets/src/mount.ts
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/headless/cordis.patch.yml
- apps/cli/config/agent-presets/code/agent.cordis.yml
- apps/cli/config/agent-presets/code/preset.yml
- apps/cli/config/agent-presets/minimal/agent.cordis.yml
- apps/cli/config/agent-presets/standard/agent.cordis.yml
- apps/cli/config/agent-presets/cordis/agent.cordis.yml
- apps/cli/tests/web-agent-presets.e2e.ts

## 相关

- [工具调用解剖](../../spine/tool-call-anatomy.md) — 外层 `run_code` 与 native 工具共用的 `pre-execute → execute → post-execute`；子调用重入同一管线。
- [工具 catalog](../../reference/tools-catalog.md) — 全量 model-visible 工具表；`run_code` 是保留 transport，不是 `tool-*` 行。
- [trace: Code Mode 一轮](../../spine/trace-code-mode.md) — 从 host insert runtime 到 `deriveMessages()` 的端到端走读。
- [code preset (PTC)](../presets/code.md) — shipped `code` 成员表；相对 `standard` 只多 `tool-presentation` `mode: code`。
- [Code Mode 运行时](../../subsystems/core/code-mode.md) — flavor 表、SDK codegen、`maxParallelSubCalls`、dispatch 不变量。
