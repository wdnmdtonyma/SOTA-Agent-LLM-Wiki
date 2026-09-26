---
id: subsys.execution.code-runtime
title: ptc-runtime 缝
kind: subsystem
tier: T2
pkg: execution
source:
  - packages/ptc-runtime/ptc-runtime/src/index.ts
  - packages/ptc-runtime/ptc-runtime/src/types.ts
  - packages/ptc-runtime/ptc-runtime/tests/service.spec.ts
  - packages/ptc-runtime/ptc-runtime/tests/reserved.spec.ts
  - packages/ptc-runtime/ptc-runtime-node/src/index.ts
  - packages/ptc-runtime/ptc-runtime-node/src/bindings.ts
  - packages/ptc-runtime/ptc-runtime-node/src/protocol.ts
  - packages/ptc-runtime/ptc-runtime-node/src/environment.ts
  - packages/ptc-runtime/ptc-runtime-node/tests/runtime.spec.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/base/package.json
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/headless/cordis.patch.yml
  - packages/core/agent-tool-presentation/src/index.ts
  - packages/core/agent-tool-presentation/tests/agent-tool-presentation.spec.ts
  - packages/core/tools/src/ptc.ts
  - packages/core/tools/src/index.ts
  - packages/bundle/web-app/presets/ptc.patch.yml
  - vendor/cordis/src/service.ts
symbols:
  - ctx.ptcRuntime
  - PtcRuntime
  - NodePtcRuntime
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
  - subsys.execution.code-runtime-python
evidence: explicit
status: verified
updated: 477b4f4205
---

> `ctx.ptcRuntime`（`PtcRuntime`）是 **host 面**程序执行缝：跑一段模型写的程序，对接 host 侧异步 `bindings`。Definition **不知道** tools / sessions / approval；那些由 Consumer 绑进 `PtcRunRequest`。默认 Provider 是 `NodePtcRuntime`（`@deepseek-ai/dsh-ptc-runtime-node`），挂在 **`dsh-base`** 的 `id: ptc-runtime`，因此叠了 base 的 `web` / `headless` / `sdk` / `acp` 都有这条缝；**不在** `sdk-minimal`。PTC（旧名 Code Mode；wiki 节点 `subsys.core.code-mode`）是这条缝的执行面 Consumer。旧包 `packages/code-runtime/**` 已删除。

## 能回答的问题

- `ctx.ptcRuntime` 的 Definition 与默认 Node process Provider 分别是哪个包？谁占 `ctx` 键？
- 为什么 `dsh-base` 有 runtime，而 `sdk-minimal` 没有这一行？
- `resolve()` 与 `run()` 分工是什么？`run()` 什么时候 `resolve` 出 `error` 字段，什么时候才 `reject`？
- `RESERVED_BINDING_GLOBALS` / `RESERVED_ERROR_MEMBERS` / `PORTABLE_RESERVED_WORDS` 为什么是跨后端合同，而不是本 Node provider 私有黑名单？
- PTC preset 的 `tool-presentation`（`mode: ptc`）怎样等这条缝？缺 runtime 时 wire 会不会已经变成 `run_code`？
- Node process 的 `timeoutMs` / heap / 空 env / `ctx.sandbox.confine` 是安全边界还是 containment？

## 职责边界

本页覆盖 **Definition + 默认 shipped Provider**（index 把 `@deepseek-ai/dsh-ptc-runtime` 与 `@deepseek-ai/dsh-ptc-runtime-node` 分在同一节点）。Definition 是抽象类 `PtcRuntime`，构造 `super(ctx, 'ptcRuntime')` 占唯一的 `ctx.ptcRuntime`。[E: packages/ptc-runtime/ptc-runtime/src/index.ts:134] Definition 包 **没有** bundle 行、也 **不** 自带 Provider：合同由测试里的 `StubRuntime` 行使。[E: packages/ptc-runtime/ptc-runtime/tests/service.spec.ts:42]

本缝拥有：一次 `run` 的程序源、命名空间 bindings、abort signal、跨后端 portable 标识符合同、以及 Provider 的 isolation 描述符与预算。`NodePtcRuntime` 另拥有剥 TypeScript 类型、fresh Node process、control-pipe 协议、wall/heap/output 预算，以及通过 `ctx.sandbox.confine` 套文件围栏。

明确不拥有：

- 模型可见运输名 `run_code`、TypeScript/Python SDK 投影、子调用 `parent` token、`tool/ptc-dispatch-*` 日志：[subsys.core.code-mode](../core/code-mode.md)（权威源 `packages/core/tools/src/ptc.ts`）。
- preset 何时 `presentAs('ptc')`、`Config.mode` 必填：[subsys.core.agent-tool-presentation](../core/agent-tool-presentation.md)。
- `run_code` JSON schema / `presentCall` 卡片：[surface.tools.run-code](../../surface/tools/run-code.md)。本页不写字段表。
- `ctx.fs` / `ctx.subprocess` / `ctx.sandbox` 的 **Definition**。Definition 不声明这三条。shipped Node Provider **会** `inject` 它们来 spawn 受围栏的进程；换掉这三条会带走 PTC 程序的文件/进程世界，但不会改 `run_code` schema。
- 一轮 picker → assemble → process → client 树的走读：[spine.trace-code-mode](../../spine/trace-code-mode.md)。

**host 面 vs agent-preset 面。** `ctx.ptcRuntime` 是进程级 host 服务：session 出现之前就要占键。Shipped profiles 是 `web`（live）与 `headless` / `sdk` / `sdk-minimal` / `acp`（startup）。`dsh-base` insert `id: ptc-runtime` → `@deepseek-ai/dsh-ptc-runtime-node`。[E: packages/bundle/base/cordis.patch.yml:389] [E: packages/bundle/base/cordis.patch.yml:390] 对应 manifest 依赖该包。[E: packages/bundle/base/package.json:123]

`sdk-minimal` **不**叠 `dsh-base`，也没有本缝。[I] 核过 `packages/bundle/sdk-minimal/cordis.patch.yml` 无 `ptc-runtime` 字符串。

浏览器 client 不实现 `PtcRuntime`，不跑模型程序。

**没有 `ptcRuntime/*` 事件。** Definition 不声明 waterfall / emit。组合失败是「同 realm 第二份 service 抛」和「Consumer `inject` 等到服务」。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/ptc-runtime/ptc-runtime/src/index.ts` | Definition：`PtcRuntime`、`RESERVED_*`、`PORTABLE_RESERVED_WORDS` |
| `packages/ptc-runtime/ptc-runtime/src/types.ts` | `PtcRunRequest` / `PtcRunSpec` / `PtcRunResult` / `PtcBindingNamespace` |
| `packages/ptc-runtime/ptc-runtime/tests/service.spec.ts` | 登记 `ctx.ptcRuntime`、error-as-field、duplicate、dispose |
| `packages/ptc-runtime/ptc-runtime/tests/reserved.spec.ts` | 跨后端 reserved 集合的成员钉 |
| `packages/ptc-runtime/ptc-runtime-node/src/index.ts` | 默认 Provider：`NodePtcRuntime` |
| `packages/ptc-runtime/ptc-runtime-node/src/bindings.ts` | portable 标识符 / reserved 校验 |
| `packages/ptc-runtime/ptc-runtime-node/src/protocol.ts` | host ↔ child 的 boot / call / done 帧 |
| `packages/ptc-runtime/ptc-runtime-node/src/environment.ts` | 启动环境剥离名单 |
| `packages/bundle/base/cordis.patch.yml` | host insert `id: ptc-runtime` |
| `packages/core/agent-tool-presentation/src/index.ts` | preset 面 Consumer：`ptc`/`both` 动态等本缝 |
| `packages/core/tools/src/ptc.ts` | 执行面 Consumer：`runtime.run(runtime.resolve({ program, bindings, … }))` |
| `packages/bundle/web-app/presets/ptc.patch.yml` | shipped PTC preset 的 `tool-presentation` 行 |

## 数据模型

| 符号 | 要点 |
|---|---|
| `PtcRuntime` | `Service` 子类；键名 `'ptcRuntime'`。只读描述符 `language` / `isolation` + 抽象 `resolve` / `run`。[E: packages/ptc-runtime/ptc-runtime/src/index.ts:104] [E: packages/ptc-runtime/ptc-runtime/src/index.ts:134] [E: packages/ptc-runtime/ptc-runtime/src/index.ts:143] |
| `PtcRunRequest` | `{ program, bindings, cwd?, timeoutMs?, sandboxPolicy?, signal? }`。`resolve()` 填齐绝对 `cwd` 与 cap 过的 `timeoutMs`，产出 `PtcRunSpec`。[E: packages/ptc-runtime/ptc-runtime/src/types.ts:73] [E: packages/ptc-runtime/ptc-runtime/src/types.ts:101] |
| `PtcBindingNamespace` | 程序看见的一个全局对象（例如 `tools`）。`global` 必须是 portable 标识符 `[A-Za-z_][A-Za-z0-9_]*`，且不在 reserved 集合里。函数名是任意字符串，按 own property 处理。 |
| `PtcBindingErrorClass` | 可选：往程序注入一个真实 Error 子类；host 拒答时程序 `catch` 到它，并通过 `memberNameProperty` 读成员名。 |
| `PtcRunResult` | `{ value?, logs, error?, sandbox? }`。程序失败是字段，不是 `run()` 的 rejection。[E: packages/ptc-runtime/ptc-runtime/src/types.ts:144] [E: packages/ptc-runtime/ptc-runtime/src/types.ts:161] |
| `PtcRunFailure.kind` | `'exception'` \| `'timeout'` \| `'abort'` \| `'worker-exit'` \| `'invalid-output'` \| `'output-limit'` \| `'protocol'` \| `'sandbox-unavailable'`。[E: packages/ptc-runtime/ptc-runtime/src/types.ts:134] |
| `RESERVED_BINDING_GLOBALS` | `console`、`__dsh_main__`、`__builtins__`、`__name__`、`__debug__`。`tools` 不在集合里。[E: packages/ptc-runtime/ptc-runtime/src/index.ts:42] [E: packages/ptc-runtime/ptc-runtime/tests/reserved.spec.ts:17] [E: packages/ptc-runtime/ptc-runtime/tests/reserved.spec.ts:22] |
| `RESERVED_ERROR_MEMBERS` | JS `Error` 的 `name`/`message`/`stack` 与 Python 异常协议的 `args`/`with_traceback`/`add_note`；另加 `DUNDER_MEMBER`（`/^__.+__$/`）整类拒绝。[E: packages/ptc-runtime/ptc-runtime/src/index.ts:57] [E: packages/ptc-runtime/ptc-runtime/src/index.ts:66] |
| `PORTABLE_RESERVED_WORDS` | ECMAScript ∪ Python 保留字的并集。举例：`function`（仅 ES）、`lambda` / `nonlocal`（仅 Python）、`class`（两边都有）。[E: packages/ptc-runtime/ptc-runtime/src/index.ts:78] [E: packages/ptc-runtime/ptc-runtime/tests/reserved.spec.ts:48] [E: packages/ptc-runtime/ptc-runtime/tests/reserved.spec.ts:50] |
| `NodePtcRuntime.Config` | 填完默认后：`timeoutMs: 120_000`、`maxTimeoutMs: 600_000`、`maxOutputBytes: 67_108_864`、`maxOldGenerationSizeMb: 512`、`maxMessageBytes: 134_217_728`、`maxPendingCalls: 128`、`graceMs: 3_000`。[E: packages/ptc-runtime/ptc-runtime-node/src/index.ts:55] [E: packages/ptc-runtime/ptc-runtime-node/src/index.ts:56] [E: packages/ptc-runtime/ptc-runtime-node/src/index.ts:57] [E: packages/ptc-runtime/ptc-runtime-node/src/index.ts:58] |
| `language` / `isolation`（shipped） | `'typescript'` / `'process'`。[E: packages/ptc-runtime/ptc-runtime-node/src/index.ts:65] [E: packages/ptc-runtime/ptc-runtime-node/src/index.ts:66] |
| `static inject`（shipped） | `['fs', 'subprocess', 'sandbox', 'sandboxPolicy']`。[E: packages/ptc-runtime/ptc-runtime-node/src/index.ts:53] |

shipped overlay **没有**第二条 `id: ptc-runtime`。experimental `PythonPtcRuntime` 在 `packages/experimental/ptc-runtime-python`（`language: 'python'`，`isolation: 'process'`），不进 base 默认行。PTC 的 SDK flavor `'typescript' | 'python'` 是 `dsh-tools` 投影表。`PORTABLE_RESERVED_WORDS` 仍并入 Python 关键字：`lambda` 在本 TypeScript backend 上也会当合同误用被拒。

## 控制流

1. `PtcRuntime`@packages/ptc-runtime/ptc-runtime/src/index.ts 在 augmentation 里声明 `Context.ptcRuntime`，构造调用 `Service` → `ctx.reflect.provide('ptcRuntime', self)`。[E: packages/ptc-runtime/ptc-runtime/src/index.ts:93] [E: packages/ptc-runtime/ptc-runtime/src/index.ts:134] [E: vendor/cordis/src/service.ts:57]
2. 同一 isolate realm 再挂第二个同名 service 会抛 `registered`。fiber `dispose` 后 `ctx.get('ptcRuntime')` 变为 `undefined`。[E: packages/ptc-runtime/ptc-runtime/tests/service.spec.ts:88] [E: packages/ptc-runtime/ptc-runtime/tests/service.spec.ts:83]
3. `dsh-base` 在 **host** 插默认 Provider：`id: ptc-runtime` → `@deepseek-ai/dsh-ptc-runtime-node`。这是进程级一行，不是 per-session 副本。web 另叠 shipped preset 且 registry `default: standard`：不选 PTC preset、也不把 host `tools.mode` 打成非 native，模型就看不到 `run_code`，但 runtime 已经在树上。[E: packages/bundle/base/cordis.patch.yml:389] [E: packages/bundle/web-app/cordis.patch.yml:38]
4. `NodePtcRuntime`@packages/ptc-runtime/ptc-runtime-node/src/index.ts `extends PtcRuntime`，`super(ctx)` 继承键名。构造校验每个预算都是正有限数；`maxOutputBytes` 至少 4；timer 字段不得超过 `MAX_TIMER_DELAY_MS`。`ctx.effect` 登记 teardown：abort 所有 live run 并 await。[E: packages/ptc-runtime/ptc-runtime-node/src/index.ts:74] [E: packages/ptc-runtime/ptc-runtime-node/src/index.ts:78] [E: packages/ptc-runtime/ptc-runtime-node/src/index.ts:89]
5. shipped PTC preset 挂 `id: tool-presentation`，`config.mode: ptc`。[E: packages/bundle/web-app/presets/ptc.patch.yml:144] [E: packages/bundle/web-app/presets/ptc.patch.yml:147] `apply@packages/core/agent-tool-presentation/src/index.ts` 的静态 `inject` 只有 `['tools']`；`ptc` / `both` 另开子 fiber：`ctx.inject(['ptcRuntime'], runtimeCtx => runtimeCtx.tools.presentAs(config.mode))`。[E: packages/core/agent-tool-presentation/src/index.ts:35] [E: packages/core/agent-tool-presentation/src/index.ts:69]
6. 缺 runtime 时：`row.ctx.get('ptcRuntime')` 为 `undefined`，`presentAs('ptc')` 不跑，`assemble` 仍是部署默认 native 名（测试里是 `echo`）。后来 `ctx.plugin(StubRuntime)` 才切到 `[run_code]`。[E: packages/core/agent-tool-presentation/tests/agent-tool-presentation.spec.ts:111] [E: packages/core/agent-tool-presentation/tests/agent-tool-presentation.spec.ts:113] [E: packages/core/agent-tool-presentation/tests/agent-tool-presentation.spec.ts:123] JSDoc 写「mount 失败并点名本 id」；可执行断言是 pending + native 回落。[U]
7. 执行面 Consumer 是 `createRunCodeTool`@packages/core/tools/src/ptc.ts：`requireRuntime()` 取 `ctx.ptcRuntime`，再 `runtime.run(runtime.resolve({ program: args.code, bindings: [{ global: 'tools', functions, errorClass: { name: 'ToolCallError', memberNameProperty: 'toolName' } }], signal, cwd?, sandboxPolicy?, timeoutMs? }))`。请求里没有 tool schema、没有 session。[E: packages/core/tools/src/ptc.ts:697] [E: packages/core/tools/src/ptc.ts:698] 装配期另一条读路径是 `requirePtcRuntime`：`ctx.get('ptcRuntime')` 为空则抛，文案点名要加载 `@deepseek-ai/dsh-ptc-runtime-node`。[E: packages/core/tools/src/index.ts:1046] [E: packages/core/tools/src/index.ts:1048]
8. `resolve`@packages/ptc-runtime/ptc-runtime-node/src/index.ts：已 dispose 则 **throw**。默认 `sandboxPolicy` 取 `ctx.sandboxPolicy.resolve()`；默认 `cwd` 取 `sandboxPolicy.workspaceRoot`（必须绝对路径）；`timeoutMs` 经 `clampTimeout`。[E: packages/ptc-runtime/ptc-runtime-node/src/index.ts:108] [E: packages/ptc-runtime/ptc-runtime-node/src/index.ts:110] [E: packages/ptc-runtime/ptc-runtime-node/src/index.ts:116]
9. `run`：已 dispose 或缺 `sandboxPolicy` 则 **reject**（合同误用）。`validateBindings` 失败同样是 `run()` 的 rejection，不是 `PtcRunResult.error`。[E: packages/ptc-runtime/ptc-runtime-node/src/index.ts:127] [E: packages/ptc-runtime/ptc-runtime-node/src/index.ts:128] [E: packages/ptc-runtime/ptc-runtime-node/src/index.ts:130]
10. `execute` 剥 TypeScript 类型：用 `async function __dsh_program__() { … }` 包一层再 slice 回 body，让 top-level `await` / `return` 合法。然后 `ctx.subprocess.resolveExecutable` + `ctx.sandbox.confine`（`danger-full-access` 跳过 confine）。spawn 的 `env` 把 ambient 键置 `undefined`，只保留启动白名单之外的 tombstone；child 看到的是空环境。[E: packages/ptc-runtime/ptc-runtime-node/src/index.ts:206] [E: packages/ptc-runtime/ptc-runtime-node/src/index.ts:217] [E: packages/ptc-runtime/ptc-runtime-node/src/index.ts:224] [E: packages/ptc-runtime/ptc-runtime-node/src/index.ts:229] [E: packages/ptc-runtime/ptc-runtime-node/src/index.ts:236]
11. 控制面走 subprocess `control: 'pipe'`。child 先发 `ready`，host 回 `boot`，随后 `call` / `log` / `done`。未知名、非 JSON 参数、binding throw，都变成对该次 call 的 reply 失败，不砸 host 进程。[E: packages/ptc-runtime/ptc-runtime-node/src/index.ts:284] [E: packages/ptc-runtime/ptc-runtime-node/src/index.ts:312]
12. 入站 control 流量当 hostile peer：非法帧走 `{ kind: 'protocol' }`。wall-clock `setTimeout(spec.timeoutMs)` → `{ kind: 'timeout' }`；abort → `{ kind: 'abort' }`；进程提前退出 → `{ kind: 'worker-exit' }` 或 `{ kind: 'sandbox-unavailable' }`（confine runner 诊断命中时）。[E: packages/ptc-runtime/ptc-runtime-node/src/index.ts:163] [E: packages/ptc-runtime/ptc-runtime-node/src/index.ts:196] [E: packages/ptc-runtime/ptc-runtime-node/src/index.ts:274]
13. 程序 `return` 的值必须是无损 JSON，否则 `{ kind: 'invalid-output' }`。日志 + completion + 失败文案共享 `maxOutputBytes`；超额是 `{ kind: 'output-limit' }`。测试钉死：`result.error` 在 resolved result 上，`run()` 本身不因程序 `throw` 而 reject。[E: packages/ptc-runtime/ptc-runtime/tests/service.spec.ts:58]
14. teardown 把还活着的 run abort 并 `await` 每个 process 退出；之后再 `run()` 抛 `after disposal`。两次 run 不共享进程全局。

## 设计动机

- **runtime 零工具知识。** `PtcRunRequest` 只有程序、bindings、可选目录/预算/政策/signal。换一套 Consumer 就能把同一条缝接到非 `run_code` 的宿主；approval / session log 不会焊进 child。
- **一份 namespace 列表，所有后端。** `console` 是 Node 后端的日志槽；`__dsh_main__` / `__builtins__` / `__name__` / `__debug__` 是为 Python 后端预留。共享 `RESERVED_*`，避免「在 Node 上合法、换 Python 就撞车」。
- **error 是字段。** 模型程序失败是业务结果，要带着 `logs` 回到 Consumer。只有「对已 dispose 的 runtime 再 `run`」或「bindings 违反 portable 合同」才是组成错误。
- **containment + 可选文件围栏。** 空 env、heap cap、wall-clock、计量输出，是为了停住热循环和限制爆炸输出。`danger-full-access` 以外还会走 `ctx.sandbox.confine`，与 Bash 共用同一套文件政策。这不是 Codex 级网络隔离词汇。
- **计量的是 wall-clock，不是 ELU。** Node process 后端用 `timeoutMs` 做 elapsed ceiling；等一个慢 tool 会吃这根预算（与旧 worker-thread ELU 计量不同）。

相对 Pi：Pi 没有这条可替换 `ctx.ptcRuntime` 缝。相对「再做一个 interpreter 工具」：DSH 把执行器放在 host 组合里，preset 只决定要不要 `presentAs('ptc')`。

## Gotcha

- **有 runtime ≠ 模型在用 PTC。** 叠 `dsh-base` 的 profile 总是 insert 本缝；web 默认 preset 仍是 `standard`。headless **不**挂 shipped preset 文件，PTC yml 不会自动上树。进程级临时开关是 overlay 里的 `DSH_TOOLS_MODE`，与本缝是否 loaded 正交。[E: packages/bundle/web-app/cordis.patch.yml:38] [E: packages/bundle/headless/cordis.patch.yml:18]
- **不要把 JSDoc 写成 mount 门。** `apply` JSDoc 说缺 runtime 则 mount 失败并点名 `tool-presentation`。静态 `inject` 没有 `ptcRuntime`；单测钉死的是 pending + native `echo`。[E: packages/core/agent-tool-presentation/src/index.ts:35] [E: packages/core/agent-tool-presentation/tests/agent-tool-presentation.spec.ts:113] [U]
- **`$tools` / `lambda` 会被拒，尽管本 backend 是 TypeScript。** `$` 不是 portable 标识符；`lambda` 是 Python 关键字。合同误用走 `run()` reject，程序根本进不了 child。
- **函数名可以叫 `__proto__`，全局名不行。** namespace `global` 走标识符规则；成员名是 own property。
- **剥类型包装名是 `__dsh_program__`，reserved 集合里是 `__dsh_main__`。** 前者只存在于 host 侧 `stripTypeScriptTypes` 的临时包装，slice 之后不进 child 全局。不要把两个 dunder 写成同一个槽。[E: packages/ptc-runtime/ptc-runtime-node/src/index.ts:45]
- **in-flight binding 的结算是 Caller 的责任。** `signal` 只让 runtime 停止再问；`createRunCodeTool` 用自己的 `AbortController` 去掐子调用。本缝不认识 `parent` token。
- **`language` / `isolation` 不是门。** 本缝不因 `language === 'python'` 拒跑。门控在 Consumer：`dsh-tools` 的 `SDK_RENDERERS` 认不认这个 `language`。shipped Provider 仍是 `'typescript'`；换 Python 要换 `id: ptc-runtime` 行到 experimental 包。
- **同 realm 不能挂两份。** 要换 backend 就换 bundle / `--patch` 行，不要在已提供 `ptcRuntime` 的 realm 再 `plugin` 一个。
- **四个 shipped preset 声明在 `packages/bundle/web-app/presets/*.patch.yml`。** 旧目录 `packages/preset/agent-presets/presets/` 已删除；节点 id `surface.presets.code` 仍指向 PTC。
- **kind 名 `worker-exit` 仍用于 process 死亡。** isolation 已经是 `'process'`，不要据此推断还在用 `worker_threads`。

## Seam 三角

| 角色 | 落点 | ctx 键 / bundle / preset 行 |
|---|---|---|
| **Definition** | `@deepseek-ai/dsh-ptc-runtime` 的 `PtcRuntime` + `RESERVED_*` + `PORTABLE_RESERVED_WORDS`。抽象类，**不是** bundle 插件行 | `ctx.ptcRuntime`。host 只挂 Provider 行 `id: ptc-runtime` |
| **Provider（默认 shipped）** | `@deepseek-ai/dsh-ptc-runtime-node` 的 `NodePtcRuntime` | **host**：`dsh-base` 的 `id: ptc-runtime`。叠 base 的 web / headless / sdk / acp 继承。**不在** `sdk-minimal`。`static inject = ['fs', 'subprocess', 'sandbox', 'sandboxPolicy']` |
| **Provider（其它 substrate）** | experimental `@deepseek-ai/dsh-experimental-ptc-runtime-python` 的 `PythonPtcRuntime`（见 [subsys.execution.code-runtime-python](code-runtime-python.md)） | **不**在 shipped overlay。换 backend = 换 `id: ptc-runtime` 行 |
| **Consumer（呈现）** | `dsh-agent-tool-presentation` | 静态 `inject = ['tools']`；`mode: ptc` / `both` 时 `ctx.inject(['ptcRuntime'], …)`。shipped 仅 `packages/bundle/web-app/presets/ptc.patch.yml` 的 `id: tool-presentation` |
| **Consumer（执行 / 装配）** | `dsh-tools` 的 `createRunCodeTool`（`ptc.ts`）与 `requirePtcRuntime` | 不静态 `inject` 本缝（避免 native 部署被绑住）。执行时 `runtime.run`；装配非 native 时 `ctx.get('ptcRuntime')` |
| **不是 Definition Consumer** | `tool-fs` / `tool-bash` | 它们不 `inject` `ptcRuntime`。换本缝不会改它们的 schema；但 Node Provider 会消费 `ctx.fs` / `ctx.subprocess` / `ctx.sandbox`，远程世界要成对替换 |

换 Provider = 改 `dsh-base`（或 `--patch`）的 `id: ptc-runtime` 行，不改 `createRunCodeTool`。把第二个 `PtcRuntime` 挂进同一 realm 会抛，不会静默覆盖。

## Sources

- packages/ptc-runtime/ptc-runtime/src/index.ts
- packages/ptc-runtime/ptc-runtime/src/types.ts
- packages/ptc-runtime/ptc-runtime/tests/service.spec.ts
- packages/ptc-runtime/ptc-runtime/tests/reserved.spec.ts
- packages/ptc-runtime/ptc-runtime-node/src/index.ts
- packages/ptc-runtime/ptc-runtime-node/src/bindings.ts
- packages/ptc-runtime/ptc-runtime-node/src/protocol.ts
- packages/ptc-runtime/ptc-runtime-node/src/environment.ts
- packages/ptc-runtime/ptc-runtime-node/tests/runtime.spec.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/base/package.json
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/headless/cordis.patch.yml
- packages/core/agent-tool-presentation/src/index.ts
- packages/core/agent-tool-presentation/tests/agent-tool-presentation.spec.ts
- packages/core/tools/src/ptc.ts
- packages/core/tools/src/index.ts
- packages/bundle/web-app/presets/ptc.patch.yml
- vendor/cordis/src/service.ts

## 相关

- [spine.overview](../../spine/overview.md)（`spine.overview`）：`profile → bundle → agent preset` 与 host / preset 切面。
- [spine.capability-seams](../../spine/capability-seams.md)（`spine.capability-seams`）：Definition / Provider / Consumer 通例；本缝是另一条 host 执行世界。
- [spine.trace-code-mode](../../spine/trace-code-mode.md)（`spine.trace-code-mode`）：从 PTC preset 走到 `runtime.run` 再回到 `deriveMessages()` 的一轮。
- [subsys.core.code-mode](../core/code-mode.md)（`subsys.core.code-mode`）：PTC `run_code` 桥、SDK、子调度；本页只提供它调用的 `PtcRuntime`。
- [subsys.core.agent-tool-presentation](../core/agent-tool-presentation.md)（`subsys.core.agent-tool-presentation`）：preset 面 `presentAs`；`ptc`/`both` 等本缝。
- [surface.tools.run-code](../../surface/tools/run-code.md)（`surface.tools.run-code`）：模型看见的 `run_code` 字段与卡片，不是本缝的 schema。
- [subsys.execution.code-runtime-python](code-runtime-python.md)（`subsys.execution.code-runtime-python`）：experimental CPython Provider。
