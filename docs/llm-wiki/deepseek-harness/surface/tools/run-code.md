---
id: surface.tools.run-code
title: run_code (PTC 运输工具)
kind: tool
tier: T1
pkg: core
source:
  - packages/core/tools/src/ptc.ts
  - packages/core/tools/src/index.ts
  - packages/core/tools/src/schema.ts
  - packages/core/tools/src/types.ts
  - packages/core/tools/src/ts-types.ts
  - packages/core/tools/src/py-types.ts
  - packages/core/tools/package.json
  - packages/core/tools/tests/ptc.spec.ts
  - packages/core/agent-tool-presentation/src/index.ts
  - packages/core/agent-tool-presentation/package.json
  - packages/core/agent-tool-presentation/tests/agent-tool-presentation.spec.ts
  - packages/ptc-runtime/ptc-runtime/src/index.ts
  - packages/ptc-runtime/ptc-runtime/src/types.ts
  - packages/ptc-runtime/ptc-runtime/package.json
  - packages/ptc-runtime/ptc-runtime-node/src/index.ts
  - packages/ptc-runtime/ptc-runtime-node/package.json
  - packages/session/session-checkpoint-policy/src/index.ts
  - packages/core/session/src/surface.ts
  - packages/guard/timeout-policy/src/index.ts
  - packages/preset/agent-preset-registry/src/mount.ts
  - packages/bundle/web-app/presets/ptc.patch.yml
  - packages/bundle/web-app/presets/minimal.patch.yml
  - packages/bundle/web-app/presets/standard.patch.yml
  - packages/bundle/web-app/presets/cordis.patch.yml
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/headless/cordis.patch.yml
  - packages/bundle/base/cordis.patch.yml
  - apps/cli/tests/web-agent-presets.e2e.ts
symbols:
  - RUN_CODE_NAME
  - createRunCodeTool
  - PtcSdkLanguage
  - CodeRunFailedError
  - presentAs
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
updated: 477b4f4205
---

> `run_code` 是 `@deepseek-ai/dsh-tools` 在 **PTC**（旧名 Code Mode；wiki 节点 id `surface.presets.code` / `subsys.core.code-mode` 仍作稳定别名）下留给模型的**唯一** function-calling 运输工具（`RUN_CODE_NAME = 'run_code'`）：模型提交一段 TypeScript 或 Python 程序，host 面 `ctx.ptcRuntime` 执行它，程序里用 `await tools.name(args)` 经 `TOOL_RUNTIME_SCHEDULER` 重入同一套工具管线。它**不是** `packages/*/tool-*` 插件行。权威实现是 `packages/core/tools/src/ptc.ts`；执行缝是 `packages/ptc-runtime/ptc-runtime` 的 `PtcRuntime`。

## 能回答的问题

- `run_code` 的 wire `name`、实现包、工厂与「禁止 `register`」分别在哪？为什么 catalog 里会出现它，yml 里却没有 `id: run_code`？
- 模型可见字段是哪几个？`description` 空白、缺 `code`、程序 `print`/`return` 空，分别得到什么？TypeScript 与 Python flavor 改什么、不改什么？`timeoutMs` / `sandbox_permissions` 何时出现？
- shipped `ptc` preset 怎样让 `assembly.tools === ['run_code']`？`minimal` / `standard` / `cordis` 为什么模型直接看见 `bash` / `read`？
- `await tools.read(...)` 怎样带着 `parent` token 绕过 collapse、仍走 approval / sandbox / timeout？子调用为什么进 session log 却不进下一轮 LLM？
- bindings 为什么跳过 `run_code` 自己？runtime 缝知不知道工具？`ctx.ptcRuntime` 取代了什么？

## Identity

模型看见的工具名是字面量 `'run_code'`，导出常量 `RUN_CODE_NAME`。[E: packages/core/tools/src/ptc.ts:30]

实现包是 `@deepseek-ai/dsh-tools`（工具 **registry** 包，不是 `dsh-tool-*`）。工厂是 `createRunCodeTool(registry, options)`：`defineTool({ name: RUN_CODE_NAME, … })`，由 `ToolRuntime.requirePtcTransport()` 在第一次需要时惰性构造并缓存在 `ptcTransport`，**从不**走进 `ctx.tools.register()`。[E: packages/core/tools/package.json:2] [E: packages/core/tools/src/ptc.ts:333] [E: packages/core/tools/src/ptc.ts:336] [E: packages/core/tools/src/index.ts:944] [E: packages/core/tools/src/index.ts:945]

`register()` 无条件拒绝这个名字：任何 agent 都可能给自己选 PTC，部署默认下抢到这个名字会在 preset mount 时变成碰撞。[E: packages/core/tools/src/index.ts:1080] [E: packages/core/tools/src/index.ts:1081]

`restrict({ allow|deny })` 同样不能点名 `run_code`。[E: packages/core/tools/src/index.ts:1111] [E: packages/core/tools/src/index.ts:1112]

可见性插入发生在 `view()` 末尾、capability 过滤之后：`modeFor(scope) !== 'native'` 才把 transport 放进该 scope 的 dispatch 表。同进程里 `native` 会话的 wire 仍是 native 名、没有 `run_code`。[E: packages/core/tools/src/index.ts:1215] [E: packages/core/tools/src/index.ts:1216] [E: packages/core/agent-tool-presentation/tests/agent-tool-presentation.spec.ts:78]

产品面上让一个会话进入 PTC 的 **agent-preset 行**是 `@deepseek-ai/dsh-agent-tool-presentation`：插件名 `export const name = 'tool-presentation'`，静态 `inject = ['tools']`（故意不含 `ptcRuntime`），`Config.mode` 为必填的 `'native' | 'ptc' | 'both'`。[E: packages/core/agent-tool-presentation/package.json:2] [E: packages/core/agent-tool-presentation/src/index.ts:28] [E: packages/core/agent-tool-presentation/src/index.ts:35] [E: packages/core/agent-tool-presentation/src/index.ts:51]

`apply(ctx, config)`：`native` 立刻 `ctx.tools.presentAs('native')`；`ptc` / `both` 则 `ctx.inject(['ptcRuntime'], …)` 再 `presentAs(config.mode)`。[E: packages/core/agent-tool-presentation/src/index.ts:64] [E: packages/core/agent-tool-presentation/src/index.ts:69] [E: packages/core/agent-tool-presentation/src/index.ts:70]

`presentAs` 必须在 scoped context（preset 的 standing scope）上调用；进程级默认走 host `tools` 行的 `Config.mode`（schema 默认 `'native'`）。[E: packages/core/tools/src/index.ts:974] [E: packages/core/tools/src/index.ts:977] [E: packages/core/tools/src/index.ts:811]

`createRunCodeTool` **没有**声明定义级 `timeoutMs`，也 **没有** `isConcurrencySafe`。外层 `run_code` 走 exclusive 调度；`timeout-policy` 读到 `undefined` 就原样 `next()`。程序时限是模型参数 `timeoutMs` + `PtcRuntime.timeout`，不是工具定义字段。[E: packages/core/tools/src/index.ts:1305] [E: packages/guard/timeout-policy/src/index.ts:59] [E: packages/core/tools/src/ptc.ts:109]

## 用途定位

`run_code` 是 PTC 的运输层，不是又一个「执行任意脚本」的 shell。模型一次调用提交：

1. `code`：一段 **async 函数体**（top-level `await` / `return` 合法；TypeScript 走 type-strip，不可擦除语法如 `enum` 会变成程序失败）。
2. `description`：5–10 词的 UI 标题（`presentCall.title`），不参与执行。

程序里的能力来自生成 SDK：`await tools.name(args)`。SDK 声明的是**该 agent 可见、且名字不是 `run_code`** 的工具——同一份 `ctx.tools` 注册表的第二套投影，不是第二套实现。shipped `ptc` preset 下，模型请求里的 wire schema **只有** `run_code`。[E: packages/core/tools/src/index.ts:1022] [E: packages/core/tools/src/index.ts:1024] [E: apps/cli/tests/web-agent-presets.e2e.ts:416]

子调用带着 `parent: exec.token` 重入 `tools/pre-execute → execute → post-execute`（经 `TOOL_RUNTIME_SCHEDULER` 的 `prepare` / `dispatch` / `finalize|finish`）。它们写入 `tool/ptc-dispatch-start` / `tool/ptc-dispatch`，不进 `deriveMessages()`；模型下一轮只看见外层 curated `tool/result`。[E: packages/core/tools/src/ptc.ts:553] [E: packages/core/session/src/surface.ts:50] [E: packages/core/tools/tests/ptc.spec.ts:1891]

## 输入 schema

以 `createRunCodeTool` 的静态 spec 为准（`defineTool` 用它做参数校验）。语言相关的 **description 文案**是 getter，在 schema 投影时按 `ctx.ptcRuntime.language` 换成 TypeScript / Python flavor；`code` / `description` 的字段名与必填性不随语言变。[E: packages/core/tools/src/ptc.ts:344] [E: packages/core/tools/src/ptc.ts:748] [E: packages/core/tools/src/ptc.ts:759]

`parameterSchemaSpecToJsonSchema` 编成隐式开放 object：`code` / `description` 进入 JSON Schema `required`；未声明 `additionalProperties: false`。[E: packages/core/tools/src/schema.ts:451] [E: packages/core/tools/src/schema.ts:454]

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---:|---|---|---|
| `code` | `string` | 是 | 无 | schema 只要 string；空串仍过校验 | 程序：async 函数体。TypeScript flavor 文案是 `The program: the body of an async TypeScript function.`。[E: packages/core/tools/src/ptc.ts:345] [E: packages/core/tools/src/ptc.ts:61] |
| `description` | `string` | 是 | 无 | schema 只要 string；`execute` 再拒 `trim().length === 0` | UI 标题，英文合同写 5–10 词、主动语态。空白 / 纯空格变成 `isError`：`invalid description: expected a non-empty string`。[E: packages/core/tools/src/ptc.ts:346] [E: packages/core/tools/src/ptc.ts:380] [E: packages/core/tools/tests/ptc.spec.ts:1584] |
| `timeoutMs` | `number` | 否 | runtime `timeout.defaultMs` | 正有限数；`0` 不禁用。runtime 无 `timeout` 时 execute 拒 | 整段程序（含嵌套工具与 approval 等待）的墙钟预算。广告 getter 仅在 `runtime.timeout` 存在时放出。[E: packages/core/tools/src/ptc.ts:109] [E: packages/core/tools/src/ptc.ts:117] [E: packages/core/tools/src/ptc.ts:385] |
| `sandbox_permissions` | `string` | 否 | 无 | `ESCALATION_TARGETS` 枚举 | 这一次完整程序执行的更宽 sandbox mode。须配 `justification`。runtime 无 `sandboxMode` 时 getter 不放、execute 拒。[E: packages/core/tools/src/ptc.ts:110] [E: packages/core/tools/src/ptc.ts:122] [E: packages/core/tools/src/ptc.ts:394] |
| `justification` | `string` | 与 escalation 成对 | 无 | 给用户看的升权理由 | 与 `sandbox_permissions` 一起走 `validateEscalationArgs` / `approveEscalation`。嵌套工具仍走自己的政策。[E: packages/core/tools/src/ptc.ts:111] [E: packages/core/tools/src/ptc.ts:384] |

缺字段或类型不对由 `defineTool` 包装器先 `validate`，抛 `ToolArgsError`（`INVALID_ARGS`），进不了用户 `execute`。[E: packages/core/tools/src/schema.ts:598] [E: packages/core/tools/src/schema.ts:599]

**Config 不改 `code` / `description` 字段名。** 相关旋钮在 host `tools` 行，不是 `run_code` 自己的参数：

| Config 键 | 默认 | 作用 |
|---|---|---|
| `mode` | `'native'` | 进程默认呈现。`'ptc'` 只把 `run_code` 交给模型；`'both'` 同时交出 native schema 与 `run_code`。[E: packages/core/tools/src/index.ts:811] [E: packages/core/tools/src/index.ts:1022] |
| `maxParallelSubCalls` | `10` | 程序里连续 `isConcurrencySafe === true` 的子调用最多重叠数；`1` 变严格串行。必须是正整数。[E: packages/core/tools/src/index.ts:812] [E: packages/core/tools/src/index.ts:796] |

shipped `ptc` preset **不**改这两项：呈现靠 `tool-presentation.config.mode: ptc` 盖在 standing scope 上，overlap cap 沿用插件默认 10。

**语言 flavor（只改文案 + SDK）。** `PtcSdkLanguage` 是 `'typescript' | 'python'`；`RUN_CODE_FLAVORS` 与 `SDK_RENDERERS` 用 `satisfies` 钉在同一 union。无 runtime 时 `peekRuntime()` 为 `undefined`，退化成 TypeScript（文档 catalog 路径；`wireSchemas` 在投影前会 `requirePtcRuntime`，真实 assemble 不会把 fallback 喂给模型）。未知 language 在 getter 上直接抛。[E: packages/core/tools/src/ptc.ts:89] [E: packages/core/tools/src/ptc.ts:92] [E: packages/core/tools/src/ptc.ts:148] [E: packages/core/tools/src/index.ts:61]

shipped Provider `NodePtcRuntime.language = 'typescript'`，因此产品默认模型读到 TypeScript 工具描述 + TypeScript SDK。[E: packages/ptc-runtime/ptc-runtime-node/src/index.ts:65] 该 Provider 同时暴露 `timeout` 与 `sandboxMode`，所以产品 PTC 会话的模型 schema **会**看到 `timeoutMs` / `sandbox_permissions` / `justification`。[E: packages/ptc-runtime/ptc-runtime-node/src/index.ts:97] [E: packages/ptc-runtime/ptc-runtime-node/src/index.ts:99]

## 输出 & 截断 / spill

`execute` 的规范值是封闭 object：`logs: string[]`（必填）+ 可选 `result`（`type: 'json'`）+ 可选 `sandbox`（`mode` / `denied` / `enforcement`）。registry 校验后再 `output.render`。[E: packages/core/tools/src/ptc.ts:354] [E: packages/core/tools/src/ptc.ts:360]

模型看见的是一段 text，不是裸规范值：

| 条件 | 模型可见 text |
|---|---|
| 只有 `logs` | `logs` 用 `\n` 拼接 |
| 只有 `result` | 字符串原样；其它 JSON pretty-print |
| `logs` 与 `result` 都有 | 两段用 `\n` 相接 |
| 两者都空 / `result` 缺省且 `logs: []` | `(run_code completed with no output)` |
| `sandbox.enforcement === 'partial'` | 追加 `File sandbox enforcement is partial on this host.` |
| `sandbox.denied` | 追加该 mode 拒绝了一次操作，并附 escalation 指导 |

[E: packages/core/tools/src/ptc.ts:371] [E: packages/core/tools/src/ptc.ts:376] [E: packages/core/tools/tests/ptc.spec.ts:1591]

程序失败（异常、预算、abort、进程死、输出非 JSON / 超 cap）走 `CodeRunFailedError`，`HarnessError` code `'CODE_RUN_FAILED'`。文案带 `result.error.kind`、`message`，以及非空时的 `Captured output:` 日志块和 sandbox 摘要。registry 收成 `isError`，`error.info = { name: 'CodeRunFailedError', code: 'CODE_RUN_FAILED' }`。[E: packages/core/tools/src/ptc.ts:174] [E: packages/core/tools/src/ptc.ts:721] [E: packages/core/tools/tests/ptc.spec.ts:1464]

`presentCall`：`card: 'generic'`，`title: args.description`，`kind: 'execute'`，`rawInput: args.code`。没有 `presentResult`——UI 沿用这笔 title，从 durable `tool/result` content 读正文，避免把大结果再拷进 host view。[E: packages/core/tools/src/ptc.ts:734] [E: packages/core/tools/src/ptc.ts:738] [E: packages/core/tools/tests/ptc.spec.ts:1572]

`run_code` **没有**自己的 spill 路径：不读 `ctx.spillStore`。外层结果就是 curated logs + return。子调用的 durable 副本另走 `tools/ptc-dispatch-log` waterfall：listener 只能改 **log 里那份** `content`，不能改已经返回给程序的 JSON value，也不能改外层 `tool/result`。[E: packages/core/tools/src/ptc.ts:579] [E: packages/core/tools/src/index.ts:1323]

`tool/ptc-dispatch*` **不在** `SURFACE_EVENT_TYPES`（`system/message` / `developer/message` / `user/message` / `assistant/message` / `tool/result`）。`deriveEventMessage` 对它们走 `default` 返回 `null`。[E: packages/core/session/src/surface.ts:50] [E: packages/core/session/src/surface.ts:156] [E: packages/core/tools/tests/ptc.spec.ts:1891]

子事件形状：`rootCallId` / `parentCallId` / `subCallId`（`${parentCallId}:ptc:${n}`）/ `name` / `arguments`；settle 再加 `isError` + `content`。Session 事件类型键是 `tool/ptc-dispatch-start` / `tool/ptc-dispatch`。[E: packages/core/tools/src/types.ts:11] [E: packages/core/tools/src/types.ts:20] [E: packages/core/tools/src/types.ts:42] [E: packages/core/tools/src/ptc.ts:545]

含 image 的嵌套成功结果会 `deferContext`，source 是 `{ kind: 'ptc-mode' }`。[E: packages/core/tools/src/ptc.ts:640] [E: packages/core/tools/src/ptc.ts:642]

## 背后的 seam

| 角色 | 落点 |
|---|---|
| Definition | `@deepseek-ai/dsh-ptc-runtime` 的抽象 `PtcRuntime`：`ctx.ptcRuntime`（服务名 `'ptcRuntime'`），`language` / `isolation` 信息字段，`resolve(PtcRunRequest): PtcRunSpec` 再 `run(spec): Promise<PtcRunResult>`。程序失败是 `result.error` 字段，`run()` 本身只在合同误用时 reject。[E: packages/ptc-runtime/ptc-runtime/package.json:2] [E: packages/ptc-runtime/ptc-runtime/src/index.ts:93] [E: packages/ptc-runtime/ptc-runtime/src/index.ts:134] [E: packages/ptc-runtime/ptc-runtime/src/types.ts:73] |
| Provider | 默认 `@deepseek-ai/dsh-ptc-runtime-node` 的 `NodePtcRuntime`（`language = 'typescript'`，`isolation = 'process'`）。`dsh-base` 在 **host 面** insert `id: ptc-runtime`。叠 base 的 profile（`web` / `headless` / `sdk` / `acp`）都拿到这份 Node 实现；`sdk-minimal` 不叠 base。experimental `packages/experimental/ptc-runtime-python` 存在但不随 shipped profile 挂。[E: packages/ptc-runtime/ptc-runtime-node/package.json:2] [E: packages/ptc-runtime/ptc-runtime-node/src/index.ts:65] [E: packages/ptc-runtime/ptc-runtime-node/src/index.ts:66] [E: packages/bundle/base/cordis.patch.yml:389] |
| Consumer | `@deepseek-ai/dsh-tools` 的 `createRunCodeTool`：枚举 `registry.schemas(exec.agent)`、绑 `PtcBindingFunction`、调 `runtime.resolve` / `runtime.run`、用 `registry[TOOL_RUNTIME_SCHEDULER]` 调度子调用。agent-preset 面的 `tool-presentation` 只调用 `presentAs`，不执行程序。[E: packages/core/tools/src/ptc.ts:697] [E: packages/core/tools/src/ptc.ts:557] [E: packages/core/agent-tool-presentation/src/index.ts:70] |

换 Provider 会带走：源语言、隔离形态（process vs 其它）、type-strip / 语法错误形态、墙钟预算、heap / 输出字节帽、env、sandbox 默认 mode。不会带走：`code`/`description` 必填字段、collapse 规则、SDK 投影、`parent` 重入、dispatch 日志形状。

runtime 缝**零工具知识**。`PtcRunRequest.bindings` 只是命名空间 + 函数表；会话、approval、sandbox、checkpoint 全在 `dsh-tools` 桥一侧。[E: packages/ptc-runtime/ptc-runtime/src/types.ts:80] [E: packages/ptc-runtime/ptc-runtime/src/types.ts:82]

shipped Node 默认预算：`timeoutMs: 120_000`、`maxTimeoutMs: 600_000`、`maxOutputBytes: 67_108_864`、`maxOldGenerationSizeMb: 512`、`graceMs: 3_000`。spawn 的 `env` 把宿主环境键清成 `undefined`（再滤掉启动名）；`executionInstructions` 写 `process.env starts empty`。这是 containment + 与 bash 同一套 file sandbox，不是对模型代码的安全边界。[E: packages/ptc-runtime/ptc-runtime-node/src/index.ts:55] [E: packages/ptc-runtime/ptc-runtime-node/src/index.ts:67] [E: packages/ptc-runtime/ptc-runtime-node/src/index.ts:229]

`run_code` 还消费同一进程的 `ctx.tools`（自己所在的 registry）与可选的 `ctx.systemPrompt`（registry 的静态 `inject`）、以及 confined 路径上的 `ctx.sandboxPolicy` / `ctx.approval`。不消费 `ctx.shell` / `ctx.fs` 作为直接依赖；那些挂在被绑定的 native 工具上。

## 执行管线

模型发出 `run_code` 后，loop 经 `ctx.tools.execute` 进入 registry：`createExecution` → `tools/pre-execute` → 可能的 `ask` → monotonic `guard` → `tools/execute`（around）→ body → `tools/post-execute` → `output.render`。[E: packages/core/tools/src/index.ts:1493] [E: packages/core/tools/src/index.ts:1506]

对本运输工具的挂点：

- **collapse 在 policy 之前。** `mode === 'ptc'` 且 **没有** `parent` 时，除 `run_code` 以外的名字在 `createExecution` 里变成 `final-result`：`UNKNOWN_TOOL`，文案指引「从 `run_code` 程序里调」。`tools/pre-execute` / `ask` / guards **看不到**这次直调。[E: packages/core/tools/src/index.ts:1352] [E: packages/core/tools/src/index.ts:1408] [E: packages/core/tools/src/index.ts:1471] [E: packages/core/tools/tests/ptc.spec.ts:1932]
- **外层 `run_code` 自己**不注册 pre-execute listener，也不 `ask`。waterfall 默认 `{ kind: 'allow' }`。[E: packages/core/tools/src/index.ts:1509]
- **`tools/execute` 包装：**
  - `session-checkpoint-policy`：有 `exec.agent` 且 `exec.parent === undefined` 才 `flush` session；子调用 `parent !== undefined` 直接 `next()`，复用外层已经 flush 的落点。[E: packages/session/session-checkpoint-policy/src/index.ts:71]
  - `timeout-policy`：`run_code` 未声明定义级 `timeoutMs`，包装器 `next()`。程序时限在 Node provider 的墙钟 `timeoutMs` / `maxTimeoutMs`。[E: packages/guard/timeout-policy/src/index.ts:59]
- **调度：** 未声明 `isConcurrencySafe` → `executionMode` 为 `exclusive`。同一步里两个 `run_code` 不会重叠。[E: packages/core/tools/src/index.ts:1305]
- **sandbox / approval：** 外层可走程序级 `sandbox_permissions` escalation。SDK 子调用重入完整管线，被调工具自己的 approval / sandbox / `timeoutMs` 仍生效。

`collapses` 读 `modeFor(scope)`，不读 `defaultMode`。preset 在 native 部署上 `presentAs('ptc')` 时，直调 `write` 仍会被收掉。[E: packages/core/tools/src/index.ts:1352]

## Preset 装配

四个 shipped preset 文件是 `packages/bundle/web-app/presets/{minimal,standard,ptc,cordis}.patch.yml`。`run_code` **不是** yml 里的工具行；四个文件都没有 `id: run_code` / `name: run_code`。模型能不能直调它，取决于有没有 `tool-presentation` 且 `mode: ptc`（或进程级 `tools.mode`）。wiki 节点 `surface.presets.code` 仍指向 PTC 这一套。

| preset | `tool-presentation` | 模型 wire | isolate | 说明 |
|---|---|---|---|---|
| `minimal` | **否** | native（POSIX 上只有 `bash`） | persistent-shell `terminals`（无 fs / 无 str_replace） | 文件无 `tool-presentation`。e2e 断言 `assembly.tools === ['bash']`。[E: packages/bundle/web-app/presets/minimal.patch.yml:17] [E: apps/cli/tests/web-agent-presets.e2e.ts:321] |
| `standard` | **否** | native（`bash` / `read` / `present` / `workflow` / …，**没有** `run_code`） | 无 | 无 presentation 行。同进程旁的 `ptc` 会话互不影响。[E: packages/bundle/web-app/presets/standard.patch.yml:142] [E: apps/cli/tests/web-agent-presets.e2e.ts:427] |
| `ptc`（旧目录名 `code`） | **是** | **只有** `run_code` | 无（presentation 不 `provide`） | 相对 `standard`：末尾 `id: tool-presentation` / `config.mode: ptc`。`workflow-ptc` / `tool-workflow` / `tool-ralph` **全** `disabled: true`。native 工具行仍在，供 SDK 子调度。[E: packages/bundle/web-app/presets/ptc.patch.yml:144] [E: packages/bundle/web-app/presets/ptc.patch.yml:147] [E: packages/bundle/web-app/presets/ptc.patch.yml:119] [E: packages/bundle/web-app/presets/ptc.patch.yml:124] [E: packages/bundle/web-app/presets/ptc.patch.yml:127] [E: apps/cli/tests/web-agent-presets.e2e.ts:416] |
| `cordis` | **否** | native + `cordis_*` | 无 | 增量是 `tool-cordis`，不是 presentation。模型直调 `cordis_define` 等，**不**走 `run_code`。[E: packages/bundle/web-app/presets/cordis.patch.yml:141] |

`ptc` 的 `tool-web` 现为 `fetch: true`（与 `standard` 相同）：SDK 里会出现 `web_search`（以及 fetch 配置打开时的 web fetch 名），不会出现 `str_replace_editor`。e2e 钉死 SDK 文本含 `web_search`、不含 `str_replace_editor`。[E: packages/bundle/web-app/presets/ptc.patch.yml:141] [E: apps/cli/tests/web-agent-presets.e2e.ts:421]

web host 的 `tools.mode: !!js process.env.DSH_TOOLS_MODE` 与 headless 同一键，是**整进程** defaultMode，不是「选了 shipped `ptc` preset」。unset 时 schema 默认 `native`。[E: packages/bundle/web-app/cordis.patch.yml:38] [E: packages/bundle/headless/cordis.patch.yml:18]

缺 host `ptcRuntime` 时：`tool-presentation` 的动态 `inject(['ptcRuntime'])` 停在 pending；静态 `inject` 只有 `['tools']`，`auditRows` 只读 `fiber.inject`，**不会**因为缺 runtime 把 `ptcRuntime` 写进 waiting 列表。单测里此时 `assemble` 仍是 native `echo`。[E: packages/preset/agent-preset-registry/src/mount.ts:206] [E: packages/core/agent-tool-presentation/tests/agent-tool-presentation.spec.ts:111] [E: packages/core/agent-tool-presentation/tests/agent-tool-presentation.spec.ts:113] 模块 JSDoc 仍写「fails at mount / 审计点名该行」——可执行路径与注释是否再对齐见 `_staging/uncertainty-update-run-code.md`。[U]

## execute() 走读

符号：`createRunCodeTool` @ `packages/core/tools/src/ptc.ts`；子调度走 `ToolRuntime[TOOL_RUNTIME_SCHEDULER]` @ `packages/core/tools/src/index.ts`；程序跑在 `PtcRuntime.resolve` + `run`。

1. **校验参数。** `defineTool` 先按 schema 收 `code`/`description`（以及可选控制字段）。用户 `execute` 再 `args.description.trim().length === 0` 则抛 `invalid description`。[E: packages/core/tools/src/schema.ts:598] [E: packages/core/tools/src/ptc.ts:380]

2. **取 runtime。** `requireRuntime()` → `requirePtcRuntime` → `ctx.get('ptcRuntime')`。缺实现时抛错，registry 收成结构化 `isError`（文案含 `requires a PTC runtime`），不是进程崩溃。[E: packages/core/tools/src/ptc.ts:383] [E: packages/core/tools/src/index.ts:1046] [E: packages/core/tools/tests/ptc.spec.ts:1564]

3. **可选 escalation 与 timeout。** `validateEscalationArgs`；`timeoutMs` 在 runtime 不支持或非正数时抛。有 `sandbox_permissions`+`justification` 时 `approveEscalation`，得到的 mode 盖进本次 `sandboxPolicy`。[E: packages/core/tools/src/ptc.ts:384] [E: packages/core/tools/src/ptc.ts:395]

4. **run-scoped abort。** 新建 `AbortController`；外层 `exec.signal` abort 会链式掐掉未完成子调用。`finally` 里 `abort('run_code settled')` 再 `drainDispatches`。[E: packages/core/tools/src/ptc.ts:412] [E: packages/core/tools/src/ptc.ts:713]

5. **枚举 bindings，跳过自己。** `registry.schemas(exec.agent)` 是该 agent 可见集。`schema.name === RUN_CODE_NAME` 则 `continue`。函数表是 `Object.create(null)` + `defineProperty`，`__proto__` 这类名字也是 own key。测试钉死即便 `mode: 'both'`，程序侧 `functions.run_code` 仍是 `undefined`。[E: packages/core/tools/src/ptc.ts:689] [E: packages/core/tools/src/ptc.ts:690] [E: packages/core/tools/tests/ptc.spec.ts:407]

6. **`runtime.resolve` + `runtime.run`。** `program: args.code`，单一 namespace `global: 'tools'`，`errorClass: { name: 'ToolCallError', memberNameProperty: 'toolName' }`，`signal: runController.signal`，可选 `cwd` / `sandboxPolicy` / `timeoutMs`。[E: packages/core/tools/src/ptc.ts:697] [E: packages/core/tools/src/ptc.ts:700] [E: packages/core/tools/src/ptc.ts:702]

7. **Node 进程执行。** `NodePtcRuntime` 用 `stripTypeScriptTypes` 剥类型（包一层 async function 以便 top-level `await`/`return`）；再 `ctx.subprocess.spawn` 开 confined 进程。失败 kind 包括 `exception` / `timeout` / `abort` / `output-limit` / `worker-exit`。[E: packages/ptc-runtime/ptc-runtime-node/src/index.ts:206] [E: packages/ptc-runtime/ptc-runtime-node/src/index.ts:236]

8. **一次 `await tools.name(args)`。** 进程经 control pipe 回 host；host 调绑定函数：`jsonNormalizeArgs`（内部 `snapshotJsonValue`）成无损 JSON（`undefined` / 非 JSON 在 dispatch 之前拒绝），`subCallId = CallId(\`${exec.callId}:ptc:${n}\`)`，`parent: exec.token`。[E: packages/core/tools/src/ptc.ts:186] [E: packages/core/tools/src/ptc.ts:545] [E: packages/core/tools/src/ptc.ts:553]

9. **子调度复刻 native 并发合同。** `classify()` 读 `executionMode()`（只有 `isConcurrencySafe === true` 才 parallel）。连续 parallel 最多 `maxParallelSubCalls`；exclusive 等池空，且自己的 `commit()`（含 post-execute）完成才放行。driver 单车道：`start()` 里 `append('tool/ptc-dispatch-start')` + `scheduler.prepare`；body 走 `dispatch`；`commit()` 里 `finalize`/`finish` 再 `settle`。[E: packages/core/tools/src/ptc.ts:612] [E: packages/core/tools/src/ptc.ts:636]

10. **settle 立刻把 JSON value 还给程序。** 失败绑定变成 `throw new Error(outcome.message)`，进程再包成 `ToolCallError`（`toolName` = 成员名）。log 另走 `shapeDispatchLog` → `session.append('tool/ptc-dispatch', …)`。[E: packages/core/tools/src/ptc.ts:675] [E: packages/core/tools/src/ptc.ts:586]

11. **程序结束。** `result.error` 存在则抛 `CodeRunFailedError`；否则返回 `{ logs, result?, sandbox? }`。空输出由 `render` 变成 `(run_code completed with no output)`。nested `concludesTurn` / `deferContext` 会转发到外层 `exec`。[E: packages/core/tools/src/ptc.ts:717] [E: packages/core/tools/src/ptc.ts:723] [E: packages/core/tools/src/ptc.ts:653]

## 设计动机·edge

DSH 的 PTC 不是把 catalog 换成「一个解释器工具」再删掉 `read`/`bash`。preset 仍注册那些行；改变的是 **presentation**：模型 function-calling 面只剩运输名，多步编排改成一段程序，中间子结果不灌回下一轮 context。

和常见 peer 的差异：

- **没有** Claude / Codex 那种模型直调的 `apply_patch` 合一方言。文件副作用仍是 SDK 里的 `read` / `edit` / `write` / `bash`（`minimal` 只有 persistent `bash`），只是到达方式变了。
- **collapse 在 policy 之前。** 模型直调 `write` 不会误触发 approval；子调用因为 `parent` 才重入守卫。[E: packages/core/tools/src/index.ts:1408]
- **禁止递归运输。** bindings 跳过 `run_code`；`register` / `restrict` 也不能碰这个名字。程序没有句柄再 `await tools.run_code(...)`。[E: packages/core/tools/src/ptc.ts:690]
- **SDK 是第二套投影。** `wireSchemas` 给 function calling；`renderToolsSdk` / `renderToolsSdkPy` 给语言对应的 `tools` 声明。TypeScript 调用约定写在 `SDK_INSTRUCTIONS`：`await tools.name(args)`，失败用 `ToolCallError`，独立只读可 `Promise.all`。[E: packages/core/tools/src/ts-types.ts:250] [E: packages/core/tools/src/ts-types.ts:256] [E: packages/core/tools/src/py-types.ts:734]
- **runtime 可替换，工具知识不可下沉。** 换 process / container backend 不应改 schema；也不该让 runtime 去 import `dsh-tools`。旧 `ctx.codeRuntime` / `packages/code-runtime/**` 已删除。
- **process ≠ sandbox。** 空 env 挡住的是环境泄漏；文件 / 网络副作用仍经被绑定工具的既有政策，以及本次程序的 sandbox policy。
- **`both` 不是产品默认。** shipped `ptc` 用 `mode: ptc`。`both` 会让 native 名与 `run_code` 同时出现在 wire 上，且 `tools:ptc-only` 段渲染为空——直调 native 在 `both` 下是合法的。[E: packages/core/tools/src/index.ts:882]
- **缺 runtime 时不要把 JSDoc「fails at mount」当成可执行断言。** 静态 `inject` 不含 `ptcRuntime`；动态 wait 未完成则 `modeFor` 仍是 native，模型继续看见 native 名。[E: packages/core/agent-tool-presentation/src/index.ts:35] [E: packages/core/agent-tool-presentation/tests/agent-tool-presentation.spec.ts:113]

端到端一轮 turn（host insert runtime → mount `ptc` → assemble → 子调用树 → `deriveMessages`）写在 [spine.trace-code-mode](../../spine/trace-code-mode.md)，本页不复述那条编号路径。

## Sources

- packages/core/tools/src/ptc.ts
- packages/core/tools/src/index.ts
- packages/core/tools/src/schema.ts
- packages/core/tools/src/types.ts
- packages/core/tools/src/ts-types.ts
- packages/core/tools/src/py-types.ts
- packages/core/tools/package.json
- packages/core/tools/tests/ptc.spec.ts
- packages/core/agent-tool-presentation/src/index.ts
- packages/core/agent-tool-presentation/package.json
- packages/core/agent-tool-presentation/tests/agent-tool-presentation.spec.ts
- packages/ptc-runtime/ptc-runtime/src/index.ts
- packages/ptc-runtime/ptc-runtime/src/types.ts
- packages/ptc-runtime/ptc-runtime/package.json
- packages/ptc-runtime/ptc-runtime-node/src/index.ts
- packages/ptc-runtime/ptc-runtime-node/package.json
- packages/session/session-checkpoint-policy/src/index.ts
- packages/core/session/src/surface.ts
- packages/guard/timeout-policy/src/index.ts
- packages/preset/agent-preset-registry/src/mount.ts
- packages/bundle/web-app/presets/ptc.patch.yml
- packages/bundle/web-app/presets/minimal.patch.yml
- packages/bundle/web-app/presets/standard.patch.yml
- packages/bundle/web-app/presets/cordis.patch.yml
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/headless/cordis.patch.yml
- packages/bundle/base/cordis.patch.yml
- apps/cli/tests/web-agent-presets.e2e.ts

## 相关

- [工具调用解剖](../../spine/tool-call-anatomy.md) — 外层 `run_code` 与 native 工具共用的 `pre-execute → execute → post-execute`；子调用重入同一管线。
- [工具 catalog](../../reference/tools-catalog.md) — 全量 model-visible 工具表；`run_code` 是保留 transport，不是 `tool-*` 行。
- [trace: PTC 一轮](../../spine/trace-code-mode.md) — 从 host insert runtime 到 `deriveMessages()` 的端到端走读（节点 id 仍为 `spine.trace-code-mode`）。
- [PTC preset](../presets/code.md) — shipped `ptc` 成员表（节点 id `surface.presets.code`）；相对 `standard` 多 `tool-presentation` `mode: ptc`。
- [PTC 运行时](../../subsystems/core/code-mode.md) — flavor 表、SDK codegen、`maxParallelSubCalls`、dispatch 不变量（节点 id `subsys.core.code-mode`）。
