---
id: subsys.execution.code-runtime
title: code-runtime 缝
kind: subsystem
tier: T2
pkg: execution
source:
  - packages/code-runtime/code-runtime/src/index.ts
  - packages/code-runtime/code-runtime/src/types.ts
  - packages/code-runtime/code-runtime/src/invariant.ts
  - packages/code-runtime/code-runtime/tests/service.spec.ts
  - packages/code-runtime/code-runtime/tests/reserved.spec.ts
  - packages/code-runtime/code-runtime-worker-thread/src/index.ts
  - packages/code-runtime/code-runtime-worker-thread/src/bootstrap.ts
  - packages/code-runtime/code-runtime-worker-thread/src/protocol.ts
  - packages/code-runtime/code-runtime-worker-thread/src/worker.ts
  - packages/code-runtime/code-runtime-worker-thread/tests/runtime.spec.ts
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/web-app/package.json
  - packages/bundle/headless/cordis.patch.yml
  - packages/bundle/headless/package.json
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/base/package.json
  - packages/core/agent-tool-presentation/src/index.ts
  - packages/core/agent-tool-presentation/tests/agent-tool-presentation.spec.ts
  - packages/core/tools/src/code-mode.ts
  - packages/core/tools/src/index.ts
  - apps/cli/config/agent-presets/code/agent.cordis.yml
  - vendor/cordis/src/service.ts
symbols:
  - ctx.codeRuntime
  - CodeRuntime
  - WorkerThreadCodeRuntime
  - RESERVED_BINDING_GLOBALS
  - RESERVED_ERROR_MEMBERS
  - PORTABLE_RESERVED_WORDS
related:
  - spine.overview
  - spine.capability-seams
  - spine.trace-code-mode
  - subsys.core.code-mode
  - subsys.core.agent-tool-presentation
  - surface.tools.run-code
evidence: explicit
status: verified
updated: 47f943859b
---

> `ctx.codeRuntime`（`CodeRuntime`）是 **host 面**程序执行缝：跑一段模型写的程序，对接 host 侧异步 `bindings`。runtime **不知道** tools / sessions / approval / sandbox；那些由 Consumer 绑进 `CodeRunRequest`。默认 Provider 是 `WorkerThreadCodeRuntime`（`@deepseek-ai/dsh-code-runtime-worker-thread`），挂在 **`dsh-web-app` 与 `dsh-headless`** 的 `id: code-runtime`，**不在 `dsh-base`**。

## 能回答的问题

- `ctx.codeRuntime` 的 Definition 与默认 worker-thread Provider 分别是哪个包？谁占 `ctx` 键？
- 为什么默认安装的 `dsh web` / headless 有 runtime，而 `dsh-base` 没有这一行？
- `run()` 什么时候 `resolve` 出 `error` 字段，什么时候才 `reject`？
- `RESERVED_BINDING_GLOBALS` / `RESERVED_ERROR_MEMBERS` / `PORTABLE_RESERVED_WORDS` 为什么是跨后端合同，而不是本 worker 私有黑名单？
- `code` preset 的 `tool-presentation` 怎样等这条缝？缺 runtime 时 wire 会不会已经变成 `run_code`？
- worker-thread 的 `computeMs` / `maxWallMs` / heap / 空 `env` 是安全边界还是 containment？

## 职责边界

本页覆盖 **Definition + 默认 shipped Provider**（index 把 `@deepseek-ai/dsh-code-runtime` 与 `@deepseek-ai/dsh-code-runtime-worker-thread` 分在同一节点）。Definition 是抽象类 `CodeRuntime`，构造 `super(ctx, 'codeRuntime')` 占唯一的 `ctx.codeRuntime`。[E: packages/code-runtime/code-runtime/src/index.ts:122] Definition 包 **没有** bundle 行、也 **不** 自带 Provider：合同由测试里的 `StubRuntime` 行使。[E: packages/code-runtime/code-runtime/tests/service.spec.ts:12]

本缝拥有：一次 `run` 的程序源、命名空间 bindings、abort signal、跨后端 portable 标识符合同、以及 Provider 的 isolation 描述符与预算。`WorkerThreadCodeRuntime` 另拥有剥 TypeScript 类型、fresh worker、port 协议、busy/wall/heap/output 预算。

明确不拥有：

- 模型可见运输名 `run_code`、SDK 投影、子调用 `parent` token、`tools/code-dispatch-*` 日志：[subsys.core.code-mode](../core/code-mode.md)（`subsys.core.code-mode`）。
- preset 何时 `presentAs('code')`、`Config.mode` 必填：[subsys.core.agent-tool-presentation](../core/agent-tool-presentation.md)（`subsys.core.agent-tool-presentation`）。
- `run_code` JSON schema / `presentCall` 卡片：[surface.tools.run-code](../../surface/tools/run-code.md)（`surface.tools.run-code`，T1）。本页不写字段表。
- `ctx.fs` / `ctx.subprocess` / `ctx.sandbox`。本缝 **不** `inject` 这三条。程序若产生文件或进程副作用，只能通过 Consumer 绑进来的函数走到那些缝。
- 一轮 picker → assemble → worker → client 树的走读：[spine.trace-code-mode](../../spine/trace-code-mode.md)（`spine.trace-code-mode`）。

**host 面 vs agent-preset 面。** `ctx.codeRuntime` 是进程级 host 服务：session 出现之前就要占键。默认安装是本地 Web GUI（`dsh web`），本仓没有 shipped TUI。`dsh-web-app` 与 `dsh-headless` 各 `insert` 一行 `id: code-runtime` → `@deepseek-ai/dsh-code-runtime-worker-thread`。[E: packages/bundle/web-app/cordis.patch.yml:48] [E: packages/bundle/web-app/cordis.patch.yml:49] [E: packages/bundle/headless/cordis.patch.yml:24] [E: packages/bundle/headless/cordis.patch.yml:25] 对应 manifest 都依赖该包。[E: packages/bundle/web-app/package.json:85] [E: packages/bundle/headless/package.json:48]

`dsh-base` **不** insert 本缝。[I] 核过 `packages/bundle/base/cordis.patch.yml` 无 `code-runtime` 字符串；`packages/bundle/base/package.json` 的 `dependencies` 也无 `@deepseek-ai/dsh-code-runtime` / `@deepseek-ai/dsh-code-runtime-worker-thread`。`base.spec.ts` 只钉死 `subagent-codex` / `subagent-claude-code` 行数为 0，没有对 `code-runtime` 的对称断言。

浏览器 client 不实现 `CodeRuntime`，不跑 worker。

**没有 `codeRuntime/*` 事件。** Definition 不声明 waterfall / emit。companion `code-runtime-invariant` 的 installer 是空函数。[E: packages/code-runtime/code-runtime/src/invariant.ts:21] 组合失败是「同 realm 第二份 service 抛」和「Consumer `inject` 等到服务」。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/code-runtime/code-runtime/src/index.ts` | Definition：`CodeRuntime`、`RESERVED_*`、`PORTABLE_RESERVED_WORDS` |
| `packages/code-runtime/code-runtime/src/types.ts` | `CodeRunRequest` / `CodeRunResult` / `CodeBindingNamespace` |
| `packages/code-runtime/code-runtime/tests/service.spec.ts` | 登记 `ctx.codeRuntime`、error-as-field、duplicate、dispose |
| `packages/code-runtime/code-runtime/tests/reserved.spec.ts` | 跨后端 reserved 集合的成员钉 |
| `packages/code-runtime/code-runtime-worker-thread/src/index.ts` | 默认 Provider：`WorkerThreadCodeRuntime` |
| `packages/code-runtime/code-runtime-worker-thread/src/bootstrap.ts` | worker 内 `runWorkerMain` / `makeNamespaces` / `console` shim |
| `packages/code-runtime/code-runtime-worker-thread/src/protocol.ts` | host ↔ worker 的 `WorkerBootData` / `call` / `done` |
| `packages/code-runtime/code-runtime-worker-thread/tests/runtime.spec.ts` | 真 worker：预算、空 env、reserved 拒、dispose |
| `packages/bundle/web-app/cordis.patch.yml` | host insert `id: code-runtime` |
| `packages/bundle/headless/cordis.patch.yml` | 同一 insert；headless **没有** `agent-presets` |
| `packages/core/agent-tool-presentation/src/index.ts` | preset 面 Consumer：`code`/`both` 动态等本缝 |
| `packages/core/tools/src/code-mode.ts` | 执行面 Consumer：`runtime.run({ program, bindings, signal })` |

## 数据模型

| 符号 | 要点 |
|---|---|
| `CodeRuntime` | `Service` 子类；键名 `'codeRuntime'`。两个只读描述符 `language` / `isolation` + 一个抽象 `run`。[E: packages/code-runtime/code-runtime/src/index.ts:111] [E: packages/code-runtime/code-runtime/src/index.ts:119] [E: packages/code-runtime/code-runtime/src/index.ts:134] |
| `CodeRunRequest` | `{ program, bindings, signal? }`。没有预算旋钮；时间 / 输出 / heap 是 Provider 的 `Config`，请求里没有 `??` 可填的隐藏字段。[E: packages/code-runtime/code-runtime/src/types.ts:80] [E: packages/code-runtime/code-runtime/src/types.ts:82] [E: packages/code-runtime/code-runtime/src/types.ts:88] |
| `CodeBindingNamespace` | 程序看见的一个全局对象（例如 `tools`）。`global` 必须是 portable 标识符 `[A-Za-z_][A-Za-z0-9_]*`，且不在 reserved 集合里。函数名是任意字符串，按 own property 处理。 |
| `CodeBindingErrorClass` | 可选：往程序注入一个真实 Error 子类；host 拒答时程序 `catch` 到它，并通过 `memberNameProperty` 读成员名。 |
| `CodeRunResult` | `{ value?, logs, error? }`。程序失败是字段，不是 `run()` 的 rejection。[E: packages/code-runtime/code-runtime/src/types.ts:122] [E: packages/code-runtime/code-runtime/src/types.ts:124] [E: packages/code-runtime/code-runtime/src/types.ts:126] |
| `CodeRunFailure.kind` | `'exception'` \| `'timeout'` \| `'abort'` \| `'worker-exit'` \| `'invalid-output'` \| `'output-limit'`。正交：预算到期不是 exception，abort 不是 timeout，substrate 死不是这两者。[E: packages/code-runtime/code-runtime/src/types.ts:105] |
| `RESERVED_BINDING_GLOBALS` | `console`、`__dsh_main__`、`__builtins__`、`__name__`、`__debug__`。`tools` 不在集合里。[E: packages/code-runtime/code-runtime/src/index.ts:40] [E: packages/code-runtime/code-runtime/tests/reserved.spec.ts:17] [E: packages/code-runtime/code-runtime/tests/reserved.spec.ts:22] |
| `RESERVED_ERROR_MEMBERS` | JS `Error` 的 `name`/`message`/`stack` 与 Python 异常协议的 `args`/`with_traceback`/`add_note`；另加 `DUNDER_MEMBER`（`/^__.+__$/`）整类拒绝。[E: packages/code-runtime/code-runtime/src/index.ts:55] [E: packages/code-runtime/code-runtime/src/index.ts:64] |
| `PORTABLE_RESERVED_WORDS` | ECMAScript ∪ Python 保留字的并集。举例：`function`（仅 ES）、`lambda` / `nonlocal`（仅 Python）、`class`（两边都有）。[E: packages/code-runtime/code-runtime/src/index.ts:76] [E: packages/code-runtime/code-runtime/tests/reserved.spec.ts:48] [E: packages/code-runtime/code-runtime/tests/reserved.spec.ts:50] |
| `WorkerThreadCodeRuntime.Config` | 填完默认后：`computeMs: 60_000`、`maxWallMs: 600_000`、`maxOutputBytes: 67_108_864`、`maxOldGenerationSizeMb: 512`。[E: packages/code-runtime/code-runtime-worker-thread/src/index.ts:240] [E: packages/code-runtime/code-runtime-worker-thread/src/index.ts:241] [E: packages/code-runtime/code-runtime-worker-thread/src/index.ts:242] [E: packages/code-runtime/code-runtime-worker-thread/src/index.ts:243] |
| `language` / `isolation`（shipped） | `'typescript'` / `'worker-thread'`。[E: packages/code-runtime/code-runtime-worker-thread/src/index.ts:246] [E: packages/code-runtime/code-runtime-worker-thread/src/index.ts:247] |

本仓 **没有** published Python `CodeRuntime` 实现。`PORTABLE_RESERVED_WORDS` 仍并入 Python 关键字，是为了「一份 namespace 列表在所有后端都合法」：`lambda` 在本 TypeScript worker 上也会当合同误用被拒。[E: packages/code-runtime/code-runtime-worker-thread/tests/runtime.spec.ts:799]

## 控制流

1. `CodeRuntime`@packages/code-runtime/code-runtime/src/index.ts 在 augmentation 里声明 `Context.codeRuntime`，构造调用 `Service` → `ctx.reflect.provide('codeRuntime', self)`。[E: packages/code-runtime/code-runtime/src/index.ts:91] [E: packages/code-runtime/code-runtime/src/index.ts:122] [E: vendor/cordis/src/service.ts:57]
2. 同一 isolate realm 再挂第二个同名 service 会抛 `registered`。fiber `dispose` 后 `ctx.get('codeRuntime')` 变为 `undefined`。[E: packages/code-runtime/code-runtime/tests/service.spec.ts:85] [E: packages/code-runtime/code-runtime/tests/service.spec.ts:80]
3. `dsh-web-app` / `dsh-headless` 在 **host** 插默认 Provider：`id: code-runtime` → `@deepseek-ai/dsh-code-runtime-worker-thread`。这是进程级一行，不是 per-session 副本。web 另 insert `agent-presets` 且 `default: standard`：不选 `code`、也不把 host `tools.mode` 打成非 native，模型就看不到 `run_code`，但 runtime 已经在树上。[E: packages/bundle/web-app/cordis.patch.yml:48] [E: packages/bundle/headless/cordis.patch.yml:24] [E: packages/bundle/web-app/cordis.patch.yml:421] [E: packages/bundle/web-app/cordis.patch.yml:424]
4. `WorkerThreadCodeRuntime`@packages/code-runtime/code-runtime-worker-thread/src/index.ts `extends CodeRuntime`，`super(ctx)` 继承键名。构造校验每个预算都是正有限数；`maxOutputBytes` 至少 `MIN_OUTPUT_BYTES`（4）；`maxWallMs` 不得超过 `MAX_TIMER_DELAY_MS`（更长会被 Node `setTimeout` clamp 成 1 ms）。`ctx.effect` 登记 `teardown`。[E: packages/code-runtime/code-runtime-worker-thread/src/index.ts:254] [E: packages/code-runtime/code-runtime-worker-thread/src/index.ts:259] [E: packages/code-runtime/code-runtime-worker-thread/src/index.ts:66] [E: packages/code-runtime/code-runtime-worker-thread/src/index.ts:262] [E: packages/code-runtime/code-runtime-worker-thread/src/index.ts:268] [E: packages/code-runtime/code-runtime-worker-thread/src/index.ts:270]
5. shipped `code` preset 挂 `id: tool-presentation`，`config.mode: code`。[E: apps/cli/config/agent-presets/code/agent.cordis.yml:259] [E: apps/cli/config/agent-presets/code/agent.cordis.yml:262] `apply@packages/core/agent-tool-presentation/src/index.ts` 的静态 `inject` 只有 `['tools']`；`code` / `both` 另开子 fiber：`ctx.inject(['codeRuntime'], runtimeCtx => runtimeCtx.tools.presentAs(config.mode))`。[E: packages/core/agent-tool-presentation/src/index.ts:35] [E: packages/core/agent-tool-presentation/src/index.ts:69] [E: packages/core/agent-tool-presentation/src/index.ts:70]
6. 缺 runtime 时：`row.ctx.get('codeRuntime')` 为 `undefined`，`presentAs('code')` 不跑，`assemble` 仍是部署默认 native 名（测试里是 `echo`）。后来 `ctx.plugin(StubRuntime)` 才切到 `[run_code]`。[E: packages/core/agent-tool-presentation/tests/agent-tool-presentation.spec.ts:109] [E: packages/core/agent-tool-presentation/tests/agent-tool-presentation.spec.ts:111] [E: packages/core/agent-tool-presentation/tests/agent-tool-presentation.spec.ts:118] yml / `apply` 旁注释写「mount 失败并点名本 id」；`inactiveRows` 只读静态 `inject: ['tools']`，可执行断言是 pending + native 回落。[U]
7. 执行面 Consumer 是 `createRunCodeTool`@packages/core/tools/src/code-mode.ts：`requireRuntime()` 取 `ctx.codeRuntime`，再 `runtime.run({ program: args.code, bindings: [{ global: 'tools', functions, errorClass: { name: 'ToolCallError', memberNameProperty: 'toolName' } }], signal })`。请求里没有 tool schema、没有 session。[E: packages/core/tools/src/code-mode.ts:332] [E: packages/core/tools/src/code-mode.ts:614] [E: packages/core/tools/src/code-mode.ts:616] [E: packages/core/tools/src/code-mode.ts:619] 装配期另一条读路径是 `requireCodeRuntime`：`ctx.get('codeRuntime')` 为空则抛，文案点名要加载 `@deepseek-ai/dsh-code-runtime-worker-thread`。[E: packages/core/tools/src/index.ts:1020] [E: packages/core/tools/src/index.ts:1022]
8. `run`@packages/code-runtime/code-runtime-worker-thread/src/index.ts：已 dispose 则 **reject**（合同误用）。然后 `validateBindings`：`global` / error-class 名必须匹配 `IDENTIFIER` 且不在 `PORTABLE_RESERVED_WORDS` / `RESERVED_BINDING_GLOBALS`；重复名抛；`memberNameProperty` 空串、落在 `RESERVED_ERROR_MEMBERS`、或匹配 `DUNDER_MEMBER` 也抛。这些 throw 都是 `run()` 的 rejection，不是 `CodeRunResult.error`。[E: packages/code-runtime/code-runtime-worker-thread/src/index.ts:294] [E: packages/code-runtime/code-runtime-worker-thread/src/index.ts:323] [E: packages/code-runtime/code-runtime-worker-thread/src/index.ts:332] [E: packages/code-runtime/code-runtime-worker-thread/src/index.ts:355]
9. 信号已 aborted：直接 `resolve` `{ kind: 'abort' }`，不 spawn。[E: packages/code-runtime/code-runtime-worker-thread/src/index.ts:296] [E: packages/code-runtime/code-runtime-worker-thread/tests/runtime.spec.ts:222] 非可擦除语法（测试用 `enum`）在 `stripTypeScriptTypes` 处变成 `{ kind: 'exception' }`，同样不 spawn。[E: packages/code-runtime/code-runtime-worker-thread/src/index.ts:302] [E: packages/code-runtime/code-runtime-worker-thread/tests/runtime.spec.ts:131]
10. `execute` 为每次 run `new Worker`：`env: {}`、`execArgv: []`、`resourceLimits.maxOldGenerationSizeMb` 取 Config。剥类型时用 `async function __dsh_program__() { … }` 包一层再 slice 回 body，让 top-level `await` / `return` 合法。[E: packages/code-runtime/code-runtime-worker-thread/src/index.ts:378] [E: packages/code-runtime/code-runtime-worker-thread/src/index.ts:382] [E: packages/code-runtime/code-runtime-worker-thread/src/index.ts:386] [E: packages/code-runtime/code-runtime-worker-thread/src/index.ts:387] 真 worker 里 `JSON.stringify(process.env)` 是 `'{}'`。[E: packages/code-runtime/code-runtime-worker-thread/tests/runtime.spec.ts:145]
11. Worker 入口把 `parentPort` + `workerData` 交给 `runWorkerMain`@packages/code-runtime/code-runtime-worker-thread/src/bootstrap.ts。它用 `AsyncFunction` 以 `'use strict'` 执行剥完类型的 body，参数是各 namespace 全局、声明过的 error class、以及五方法 `console` shim（`log`/`info`/`warn`/`error`/`debug`）。[E: packages/code-runtime/code-runtime-worker-thread/src/worker.ts:14] [E: packages/code-runtime/code-runtime-worker-thread/src/bootstrap.ts:406] [E: packages/code-runtime/code-runtime-worker-thread/src/bootstrap.ts:410]
12. 程序 `await tools.name(args)` 在 worker 里只 `postMessage({ type: 'call', id, global, name, args })`。host `onCall` 用 `Object.hasOwn` 找函数：伪造的 `constructor` / `hasOwnProperty` 不会沿着 prototype 摸到 Consumer 没声明的可调用物。未知名、非 JSON 参数、binding throw，都变成对该次 call 的 reply 失败，不砸 host 进程。[E: packages/code-runtime/code-runtime-worker-thread/src/bootstrap.ts:347] [E: packages/code-runtime/code-runtime-worker-thread/src/index.ts:479] [E: packages/code-runtime/code-runtime-worker-thread/src/index.ts:481]
13. 入站 port 流量当 hostile peer：`parseWorkerMessage` 按字段重建，junk 丢弃。host 的 `message` listener 里 throw 会炸进程，所以解析失败必须吞掉。[E: packages/code-runtime/code-runtime-worker-thread/src/index.ts:142] [E: packages/code-runtime/code-runtime-worker-thread/src/index.ts:512]
14. 预算在 host 侧：按 `ELU_POLL_INTERVAL_MS`（25）读 `worker.performance.eventLoopUtilization().active`，超过 `computeMs` → `{ kind: 'timeout', message: compute budget… }`；`setTimeout(maxWallMs)` → wall-clock ceiling。abort listener 与 `teardown` 走 `{ kind: 'abort' }`。worker `error` / 提前 `exit` → `{ kind: 'worker-exit' }`。热循环即使用未 await 的 decoy binding 也耗尽 compute；纯 `await` 慢 binding 不计入 busy。[E: packages/code-runtime/code-runtime-worker-thread/src/index.ts:63] [E: packages/code-runtime/code-runtime-worker-thread/src/index.ts:538] [E: packages/code-runtime/code-runtime-worker-thread/src/index.ts:540] [E: packages/code-runtime/code-runtime-worker-thread/src/index.ts:542] [E: packages/code-runtime/code-runtime-worker-thread/src/index.ts:544] [E: packages/code-runtime/code-runtime-worker-thread/tests/runtime.spec.ts:180] [E: packages/code-runtime/code-runtime-worker-thread/tests/runtime.spec.ts:183] [E: packages/code-runtime/code-runtime-worker-thread/tests/runtime.spec.ts:196]
15. 程序 `return` 的值必须是无损 JSON，否则 `{ kind: 'invalid-output' }`，不会改写成一段渲染字符串。日志 + completion + 失败文案共享 `maxOutputBytes`；超额是 `{ kind: 'output-limit' }`。[E: packages/code-runtime/code-runtime-worker-thread/tests/runtime.spec.ts:152] 测试钉死：`result.error` 在 resolved result 上，`run()` 本身不因 `throw new Error("boom")` 而 reject。[E: packages/code-runtime/code-runtime/tests/service.spec.ts:62]
16. `teardown` 把还活着的 run `settle({ kind: 'abort', message: 'runtime disposed' })` 并 `await` 每个 worker 退出；之后再 `run()` 抛 `after disposal`。两次 run 不共享 `globalThis`：先写 `globalThis.leak`，下一次 `typeof` 是 `'undefined'`。[E: packages/code-runtime/code-runtime-worker-thread/src/index.ts:281] [E: packages/code-runtime/code-runtime-worker-thread/tests/runtime.spec.ts:882] [E: packages/code-runtime/code-runtime-worker-thread/tests/runtime.spec.ts:870]

## 设计动机

- **runtime 零工具知识。** `CodeRunRequest` 只有程序、bindings、signal。换一套 Consumer 就能把同一条缝接到非 `run_code` 的宿主；approval / sandbox / session log 不会焊进 worker。
- **一份 namespace 列表，所有后端。** `console` 是本 worker 的日志槽；`__dsh_main__` / `__builtins__` / `__name__` / `__debug__` 是为尚未 shipped 的 Python 后端预留。共享 `RESERVED_*`，避免「在 worker 上合法、换 Python 就撞车」。
- **error 是字段。** 模型程序失败是业务结果，要带着 `logs` 回到 Consumer。只有「对已 dispose 的 runtime 再 `run`」或「bindings 违反 portable 合同」才是组成错误。
- **containment，不是 `ctx.sandbox`。** 空 env、砍掉继承的 `execArgv`、heap cap、计量 busy time、超时杀 worker，是为了停住热循环和限制爆炸输出。这不是 Codex 级网络/进程隔离，也不读 `SandboxMode`。文件围栏仍在 binding 所调用的 `fs-sandbox` / `bash-sandbox`。
- **计量的是 worker 自己的 ELU。** 等一个慢 tool 不该吃 compute 预算；挂一个永不 resolve 的 decoy 也不该让热循环逃过预算。

相对 Pi：Pi 没有这条可替换 `ctx.codeRuntime` 缝。相对「再做一个 interpreter 工具」：DSH 把执行器放在 host 组合里，preset 只决定要不要 `presentAs('code')`。

## Gotcha

- **有 runtime ≠ 模型在用 Code Mode。** web/headless 总是 insert 本缝；web 默认 preset 仍是 `standard`。headless **不**挂 `agent-presets`，shipped `code` yml 不会自动上树。进程级临时开关是同一 overlay 里的 `DSH_TOOLS_MODE`，与本缝是否 loaded 正交。[E: packages/bundle/web-app/cordis.patch.yml:41] [E: packages/bundle/headless/cordis.patch.yml:20]
- **不要把 yml 注释写成 mount 门。** `code` preset 头注释和 `apply` JSDoc 说缺 runtime 则 mount 失败并点名 `tool-presentation`。静态 `inject` 没有 `codeRuntime`；单测钉死的是 pending + native `echo`。[E: packages/core/agent-tool-presentation/src/index.ts:35] [E: packages/core/agent-tool-presentation/tests/agent-tool-presentation.spec.ts:111] [U]
- **`$tools` / `lambda` 会被拒，尽管本 backend 是 TypeScript。** `$` 不是 portable 标识符；`lambda` 是 Python 关键字。合同误用走 `run()` reject，程序根本进不了 worker。[E: packages/code-runtime/code-runtime-worker-thread/tests/runtime.spec.ts:792] [E: packages/code-runtime/code-runtime-worker-thread/tests/runtime.spec.ts:799]
- **函数名可以叫 `__proto__`，全局名不行。** namespace `global` 走标识符规则；成员名是 own property，测试钉死 `tools["__proto__"]` / `tools["constructor"]` 是普通函数。[E: packages/code-runtime/code-runtime-worker-thread/tests/runtime.spec.ts:780]
- **剥类型包装名是 `__dsh_program__`，reserved 集合里是 `__dsh_main__`。** 前者只存在于 host 侧 `stripTypeScriptTypes` 的临时包装，slice 之后不进 worker 全局。不要把两个 dunder 写成同一个槽。[E: packages/code-runtime/code-runtime-worker-thread/src/index.ts:84]
- **OOM 是 `worker-exit`，host 继续活。** 把 `maxOldGenerationSizeMb` 调到 32 再分配到爆，下一次 `run` 仍能 `return "alive"`。[E: packages/code-runtime/code-runtime-worker-thread/tests/runtime.spec.ts:267]
- **in-flight binding 的结算是 Caller 的责任。** `signal` 只让 runtime 停止再问；`createRunCodeTool` 用自己的 `AbortController` 去掐子调用。本缝不认识 `parent` token。
- **`language` / `isolation` 不是门。** 本缝不因 `language === 'python'` 拒跑。门控在 Consumer：`dsh-tools` 的 `SDK_RENDERERS` 认不认这个 `language`。本仓 published 实现只有 `'typescript'`。
- **同 realm 不能挂两份。** 要换 backend 就换 bundle / `--patch` 行，不要在已提供 `codeRuntime` 的 realm 再 `plugin` 一个。

## Seam 三角

| 角色 | 落点 | ctx 键 / bundle / preset 行 |
|---|---|---|
| **Definition** | `@deepseek-ai/dsh-code-runtime` 的 `CodeRuntime` + `RESERVED_*` + `PORTABLE_RESERVED_WORDS`。抽象类，**不是** bundle 插件行 | `ctx.codeRuntime`。host 只挂 Provider 行 `id: code-runtime` |
| **Provider（默认 shipped）** | `@deepseek-ai/dsh-code-runtime-worker-thread` 的 `WorkerThreadCodeRuntime` | **host**：`dsh-web-app` 与 `dsh-headless` 的 `id: code-runtime`。**不在** `dsh-base`。无 `static inject` |
| **Provider（其它 substrate）** | 本仓无第二份 published 实现 | shipped 只有 `language = 'typescript'` / `isolation = 'worker-thread'`。换 backend = 换 `id: code-runtime` 行 |
| **Consumer（呈现）** | `dsh-agent-tool-presentation` | 静态 `inject = ['tools']`；`mode: code` / `both` 时 `ctx.inject(['codeRuntime'], …)`。shipped 仅 `apps/cli/config/agent-presets/code/agent.cordis.yml` 的 `id: tool-presentation` |
| **Consumer（执行 / 装配）** | `dsh-tools` 的 `createRunCodeTool` 与 `requireCodeRuntime` | 不静态 `inject` 本缝（避免 native 部署被绑住）。执行时 `runtime.run`；装配非 native 时 `ctx.get('codeRuntime')` |
| **不是 Consumer** | `tool-fs` / `tool-bash` / `fs-sandbox` / `subprocess-local` | 它们不 `inject` `codeRuntime`。换本缝不会改 `ctx.fs` / `ctx.subprocess` 的世界 |

换 Provider = 改 web/headless（或 `--patch`）的 `id: code-runtime` 行，不改 `createRunCodeTool`。把第二个 `CodeRuntime` 挂进同一 realm 会抛，不会静默覆盖。

## Sources

- packages/code-runtime/code-runtime/src/index.ts
- packages/code-runtime/code-runtime/src/types.ts
- packages/code-runtime/code-runtime/src/invariant.ts
- packages/code-runtime/code-runtime/tests/service.spec.ts
- packages/code-runtime/code-runtime/tests/reserved.spec.ts
- packages/code-runtime/code-runtime-worker-thread/src/index.ts
- packages/code-runtime/code-runtime-worker-thread/src/bootstrap.ts
- packages/code-runtime/code-runtime-worker-thread/src/protocol.ts
- packages/code-runtime/code-runtime-worker-thread/src/worker.ts
- packages/code-runtime/code-runtime-worker-thread/tests/runtime.spec.ts
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/web-app/package.json
- packages/bundle/headless/cordis.patch.yml
- packages/bundle/headless/package.json
- packages/bundle/base/cordis.patch.yml
- packages/bundle/base/package.json
- packages/core/agent-tool-presentation/src/index.ts
- packages/core/agent-tool-presentation/tests/agent-tool-presentation.spec.ts
- packages/core/tools/src/code-mode.ts
- packages/core/tools/src/index.ts
- apps/cli/config/agent-presets/code/agent.cordis.yml
- vendor/cordis/src/service.ts

## 相关

- [spine.overview](../../spine/overview.md)（`spine.overview`）：`profile → bundle → agent preset` 与 host / preset 切面。
- [spine.capability-seams](../../spine/capability-seams.md)（`spine.capability-seams`）：Definition / Provider / Consumer 通例；本缝是另一条 host 执行世界，不吃 `fs`/`subprocess`。
- [spine.trace-code-mode](../../spine/trace-code-mode.md)（`spine.trace-code-mode`）：从 `code` preset 走到 `runtime.run` 再回到 `deriveMessages()` 的一轮。
- [subsys.core.code-mode](../core/code-mode.md)（`subsys.core.code-mode`）：`run_code` 桥、SDK、子调度；本页只提供它调用的 `CodeRuntime`。
- [subsys.core.agent-tool-presentation](../core/agent-tool-presentation.md)（`subsys.core.agent-tool-presentation`）：preset 面 `presentAs`；`code`/`both` 等本缝。
- [surface.tools.run-code](../../surface/tools/run-code.md)（`surface.tools.run-code`）：模型看见的 `run_code` 字段与卡片，不是本缝的 schema。
