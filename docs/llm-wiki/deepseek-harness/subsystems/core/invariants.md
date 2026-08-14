---
id: subsys.core.invariants
title: 运行时不变量
kind: subsystem
tier: T2
pkg: core
source:
  - packages/runtime-diagnostics/invariants/src/index.ts
  - packages/runtime-diagnostics/invariants/src/invariant.ts
  - packages/runtime-diagnostics/invariants/package.json
  - packages/runtime-diagnostics/invariants/tests/service.spec.ts
  - packages/core/agent-loop/src/invariant.ts
  - packages/core/agent-loop/tests/invariant.spec.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/base/package.json
  - packages/bundle/base/src/invariant.ts
  - packages/bundle/base/tests/base.spec.ts
  - packages/preset/agent-presets/src/mount.ts
  - packages/llm/llm/src/index.ts
  - packages/llm/llm/src/call-config.ts
  - vendor/cordis/src/events.ts
  - vendor/cordis/src/fiber.ts
  - vendor/cordis/src/service.ts
  - vendor/loader/src/config/isolate.ts
  - scripts/test-invariants.ts
  - scripts/package-invariants.ts
  - packages/examples/agent-spine-demo/src/index.ts
symbols:
  - ctx.invariants
  - InvariantRegistry
  - InvariantError
related:
  - spine.overview
  - subsys.core.agent-loop
  - spine.turn-and-step
  - spine.session-log
  - spine.composition-boot
  - spine.capability-seams
  - subsys.core.session
  - subsys.composition.agent-presets
  - subsys.composition.bundle-base
evidence: explicit
status: verified
updated: 47f943859b
---

> `@deepseek-ai/dsh-invariants` 是 **host 面**可配置注册表：`ctx.invariants.register(packageName, installer)` 按完整 npm 包名占位；过滤选中时才在 child fiber 里跑该包 `./invariant` companion 的 installer。它是 Cordis 组合运行时的 diagnostics 缝，不是又一个 coding-agent 断言套件，也不实现 session log 的 `model-visible ⟺ logged`——那条检查是 `dsh-agent-loop` companion 挂在 `llm/stream` waterfall 上的 Consumer。

## 能回答的问题

- 每包 `./invariant` companion 怎样 `register`？包入口为什么不能 `import` diagnostics？
- `enabled` / `package_allowlist` / `package_blocklist` 怎么过滤？关掉的包还会占名吗？
- `fail(msg)` 抛什么？`code` 是哪一个稳定字符串？
- `dsh-base` 的 `cordis.patch.yml` 有没有 `invariants` 行？默认 `dsh web` 进程树会不会跑这些检查？
- `dsh-agent-loop` companion 在 `llm/stream` 上核对什么？waterfall 不调用 `next()` 会怎样？
- 把 `InvariantRegistry` 写进 preset 行、不写 `isolate: { invariants: true }`，`leakedServices` 会不会拒掉整次 `mountPreset`？

## 职责边界

本包拥有：`InvariantRegistry`（`ctx.invariants`）、`Config` 过滤、按 npm 名的互斥占位、child installer fiber 的挂载 / 回滚、以及 `InvariantError`（`code: 'INVARIANT'`）。[E: packages/runtime-diagnostics/invariants/src/index.ts:70] [E: packages/runtime-diagnostics/invariants/src/index.ts:113] [E: packages/runtime-diagnostics/invariants/src/index.ts:52]

本包**不**拥有：

- 各包检查语义。每包自己的 `src/invariant.ts` 才是 Consumer；本页只用 `dsh-agent-loop` 当例子，完整 turn 时序在 [`subsys.core.agent-loop`](agent-loop.md) / [`spine.turn-and-step`](../../spine/turn-and-step.md)。
- append-only `SessionEventMap` 与 `deriveMessages()`（[`subsys.core.session`](session.md) / [`spine.session-log`](../../spine/session-log.md)）。loop companion 读它们，registry 不读 session。
- waterfall 原语本身（`vendor/cordis` 的 `Events.waterfall` 必须 `next()` 才会 `shift`）。
- preset 发现、`mountPreset`、`leakedServices`、`isolate` realm（[`subsys.composition.agent-presets`](../composition/agent-presets.md)）。registry 只是一个会 `provide('invariants')` 的 Service；漏 isolate 时由 roster 拒。
- host 面 webserver / persistence / sandbox / subagent **backends**，以及 `dsh-base` 行表（[`subsys.composition.bundle-base`](../composition/bundle-base.md)）。`dsh-base` 当前**不** dormant 加载 Codex / Claude 子代理：`cordis.patch.yml` 里 `id: subagent-codex` / `id: subagent-claude-code` 的 filter 长度为 0，[E: packages/bundle/base/tests/base.spec.ts:38] [E: packages/bundle/base/tests/base.spec.ts:39] 且 `package.json` 的 `dependencies` 不含 `@deepseek-ai/dsh-subagent-codex` / `@deepseek-ai/dsh-subagent-claude-code`。[E: packages/bundle/base/tests/base.spec.ts:40] [E: packages/bundle/base/tests/base.spec.ts:41]

**host 面 vs agent-preset 面。** `ctx.invariants` 是进程级服务：和 webserver / persistence / sandbox / 子代理 backends 一样，应该坐在 `profile → bundle` 的 host 组合上。Companion 只往已经存在的 registry 占名，不换工具清单、不换 persona。默认产品路径是 `dsh web`（本地 Web GUI），本仓没有 shipped TUI。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/runtime-diagnostics/invariants/src/index.ts` | `InvariantRegistry` / `InvariantError` / `ctx.invariants` |
| `packages/runtime-diagnostics/invariants/src/invariant.ts` | 本包自己的 companion：空 installer，只占 `@deepseek-ai/dsh-invariants` 这个名 |
| `packages/runtime-diagnostics/invariants/tests/service.spec.ts` | 过滤、占名、`InvariantError`、回滚、HMR 再注册 |
| `packages/core/agent-loop/src/invariant.ts` | Consumer 例子：`llm/stream` 上的 request-reconstruction |
| `packages/core/agent-loop/tests/invariant.spec.ts` | 手动拓扑：`InvariantRegistry` + loop companion |
| `packages/bundle/base/cordis.patch.yml` | 组合真树：**没有** `id: invariants` 行 |
| `packages/bundle/base/package.json` | `@deepseek-ai/dsh-invariants` 只在 peer/dev，不在 `dependencies` |
| `packages/bundle/base/src/invariant.ts` | base 自己的空 companion（patch 列表载体，无运行时关系可核） |
| `packages/preset/agent-presets/src/mount.ts` | `inactiveRows` / `leakedServices`：缺 `invariants` 或把服务漏进 root realm 都会拒 |
| `scripts/test-invariants.ts` | 普通 Vitest 根：强制 `plugin(InvariantRegistry, { enabled: true })` 再挂当前包 companion |
| `scripts/package-invariants.ts` | 结构门：每包必须导出 `./invariant`，且不得 default-export |
| `packages/examples/agent-spine-demo/src/index.ts` | 显式 composition：registry + session / agent / scope / agent-loop 四个 companion |

## 数据模型

| 符号 | 形状 | 默认 / 约束 |
|---|---|---|
| `Config.enabled` | `boolean` | schema 与构造缺省都是 `true` [E: packages/runtime-diagnostics/invariants/src/index.ts:96] [E: packages/runtime-diagnostics/invariants/src/index.ts:115] |
| `Config.package_allowlist` | `string[]` | 默认 `[]` = 放行全部；非空则至少一个 case-sensitive `RegExp` 命中完整 npm 名 [E: packages/runtime-diagnostics/invariants/src/index.ts:97] |
| `Config.package_blocklist` | `string[]` | 默认 `[]` = 不排除；命中则压过 allowlist [E: packages/runtime-diagnostics/invariants/src/index.ts:98] [E: packages/runtime-diagnostics/invariants/src/index.ts:125] |
| `InvariantInstaller` | `(ctx, fail) => void \| Promise<void>`，可选 `inject` | child fiber 可声明额外服务；loop 的 installer 带 `inject: ['sessions']` [E: packages/core/agent-loop/src/invariant.ts:55] |
| `InvariantFailure` | `(message: string) => never` | 绑定注册时的 `packageName`，抛 `InvariantError` [E: packages/runtime-diagnostics/invariants/src/index.ts:162] |
| `InvariantError` | `Error` 子类 | `name: 'InvariantError'`，`code: 'INVARIANT'`，`message` 前缀 `invariant violated by "<pkg>": ` [E: packages/runtime-diagnostics/invariants/src/index.ts:52] [E: packages/runtime-diagnostics/invariants/src/index.ts:62] [E: packages/runtime-diagnostics/invariants/src/index.ts:63] |
| `registrations` | `Set<string>` | 一个 npm 名同时只能有一条活登记；过滤关掉 installer 也占这个集合 [E: packages/runtime-diagnostics/invariants/src/index.ts:149] |

过滤编译走 `new RegExp(value)`，不解析 `/pattern/flags`，因此默认 case-sensitive、默认不锚定；空白、两侧空格、同列表重复、非法正则在服务启动期就抛，而不是跳过。[E: packages/runtime-diagnostics/invariants/src/index.ts:86] [E: packages/runtime-diagnostics/invariants/src/index.ts:79] 测试钉死 `'Session'` 匹配不了 `@deepseek-ai/dsh-session`，以及 `session` 作为 blocklist 源会压过 `^@deepseek-ai/dsh-` 的 allowlist。[E: packages/runtime-diagnostics/invariants/tests/service.spec.ts:108] [E: packages/runtime-diagnostics/invariants/tests/service.spec.ts:114]

## 控制流

1. **挂上 Definition。** `new InvariantRegistry(ctx, config)` 调 `super(ctx, 'invariants')`，Cordis `Service` 立刻 `reflect.provide('invariants', this)`，于是 `ctx.invariants` 可用。[E: packages/runtime-diagnostics/invariants/src/index.ts:113] [E: vendor/cordis/src/service.ts:57] 构造把 `enabled` 缺省成 `true`，并把两份 regex 列表 `compilePatterns`。[E: packages/runtime-diagnostics/invariants/src/index.ts:115] [E: packages/runtime-diagnostics/invariants/src/index.ts:116]

2. **组合真树默认不走这一步。** `dsh-base` 一条根 `insert` 从 `id: timer` 起放下 host 核心，含 `id: llm` / `id: session` / `id: agent-loop`（`agents: []`），**没有** `id: invariants`，也没有 `name: '@deepseek-ai/dsh-invariants'`。[E: packages/bundle/base/cordis.patch.yml:16] [E: packages/bundle/base/cordis.patch.yml:24] [E: packages/bundle/base/cordis.patch.yml:436] `@deepseek-ai/dsh-invariants` 只出现在 base 的 `peerDependencies` / `devDependencies`，不在 `dependencies`——这是 companion 类型依赖，不是把服务插进树。[E: packages/bundle/base/package.json:121] 仓库内其它 `cordis.patch.yml`（`dsh-web-app` / `dsh-headless`）同样没有该行。默认 `dsh web` 进程因此**不**提供 `ctx.invariants`，各包 companion 若被误插进树会停在 `inject: ['invariants']` 上。

3. **谁在真树里挂 Provider。** 要把检查跑起来，组合必须显式 `ctx.plugin(InvariantRegistry, …)`。`agent-spine-demo` 在 host 面挂 registry，再挂 session / agent / scope / agent-loop 四个 companion。[E: packages/examples/agent-spine-demo/src/index.ts:245] [E: packages/examples/agent-spine-demo/src/index.ts:246] [E: packages/examples/agent-spine-demo/src/index.ts:249] 普通 Vitest 根由 `scripts/test-invariants.ts` 拦截 `RegistryService.plugin`：先 `mount(InvariantRegistry, { enabled: true })`，再按测试路径加载当前包 `src/invariant.ts`。[E: scripts/test-invariants.ts:177] 路径匹配 `tests/*invariant*.spec.ts` 的聚焦套件（以及例外名单里的本包 `service.spec.ts`）关掉这个 host，自己搭拓扑。[E: scripts/test-invariants.ts:107] [E: scripts/test-invariants.ts:108]

4. **Companion 占名。** 每包 `apply` 是 `Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))`。companion 插件自身 `inject = ['invariants']`，没有服务时 fiber 保持 PENDING，不会偷偷改入口行为。[E: packages/core/agent-loop/src/invariant.ts:16] [E: packages/core/agent-loop/src/invariant.ts:63] 入口文件（`dsh-agent-loop` 的 `src/index.ts` 等）不 import `@deepseek-ai/dsh-invariants`。结构门要求 named-export `name` / `inject` / `apply`，并禁止 default-export，好让 Loader 保住 namespace。[E: scripts/package-invariants.ts:230] [E: scripts/package-invariants.ts:236]

5. **`register` 先占名，再决定是否跑 installer。** 空白 / 含空白的 `packageName` 立刻抛。[E: packages/runtime-diagnostics/invariants/src/index.ts:137] 名字已在 `registrations` 里则抛 `already registered`。[E: packages/runtime-diagnostics/invariants/src/index.ts:141] 通过后**先** `registrations.add`，再 `ownerCtx.effect(...)`（不用调用方被 tracing 换掉的 `this.ctx`）。[E: packages/runtime-diagnostics/invariants/src/index.ts:147] [E: packages/runtime-diagnostics/invariants/src/index.ts:149] [E: packages/runtime-diagnostics/invariants/src/index.ts:153] 登记本身是可逆 `ctx.effect`：卸掉 companion 或卸掉 registry，都会跑返回的 disposer。[E: vendor/cordis/src/fiber.ts:418]

6. **`selected()` 是唯一启用门。** `enabled === false` → 不选；allowlist 非空且没有一条 `pattern.test(packageName)` → 不选；任一 blocklist 命中 → 不选。[E: packages/runtime-diagnostics/invariants/src/index.ts:122] [E: packages/runtime-diagnostics/invariants/src/index.ts:123] [E: packages/runtime-diagnostics/invariants/src/index.ts:125] 未选中时 effect 只返回「从 set 里删掉这个名」的 disposer，**不**建 child fiber。`enabled: false` 时第二次 `register` 同一名字仍抛 `already registered`，且 listener 不会被装上。[E: packages/runtime-diagnostics/invariants/tests/service.spec.ts:84] [E: packages/runtime-diagnostics/invariants/tests/service.spec.ts:87]

7. **选中则 child fiber 跑 installer。** `fail` 被绑成 `throw new InvariantError(packageName, message)`。[E: packages/runtime-diagnostics/invariants/src/index.ts:162] 若 `installer.inject` 有值，child 以带 inject 的 plugin 挂上（loop 要 `sessions`）；否则无额外依赖。[E: packages/runtime-diagnostics/invariants/src/index.ts:166] `await child` 加入异步检查；installer 抛错则 `child.dispose()` 并 `registrations.delete`，已挂上的 listener 一并卸掉，同名可以立刻重试。[E: packages/runtime-diagnostics/invariants/src/index.ts:173] [E: packages/runtime-diagnostics/invariants/src/index.ts:185] 测试：installer 中途 `throw` 之后 ping 探测函数不会再被调用。[E: packages/runtime-diagnostics/invariants/tests/service.spec.ts:255]

8. **卸掉是双向的。** 成功路径的 disposer 先 `await child.dispose()`，`finally` 才释放占名；异步 teardown 完成前，同名 `register` 仍是 `already registered`。[E: packages/runtime-diagnostics/invariants/src/index.ts:181] [E: packages/runtime-diagnostics/invariants/tests/service.spec.ts:237] 卸干净之后可以再注册——HMR / 测试重载靠这条，而不是改过滤器（过滤器跟服务实例同寿命）。[E: packages/runtime-diagnostics/invariants/tests/service.spec.ts:220]

9. **Consumer 例子：`dsh-agent-loop` 的 `llm/stream` waterfall。** installer 用 `ctx.on('llm/stream', …, { global: true, prepend: true })` 挂在 child 上。[E: packages/core/agent-loop/src/invariant.ts:21] [E: packages/core/agent-loop/src/invariant.ts:54] `LlmRuntime.stream` 的实现是 `ctx.waterfall(this, 'llm/stream', options, () => this.adapterStream(...))`。[E: packages/llm/llm/src/index.ts:921] [E: packages/llm/llm/src/index.ts:925] Cordis waterfall 把最后一个参数当 innermost `next`：listener 必须调用传入的 `next()`，`cbs.shift()` 才会走到下一层；不调用就停在本层，内建 adapter 永远收不到流。[E: vendor/cordis/src/events.ts:237] [E: vendor/cordis/src/events.ts:238] `Events.register` 在 `options.prepend` 为真时选 `unshift`，否则 `push`：新 listener 插到 hooks 数组头，包住**当时已经登记**的 hooks。[E: vendor/cordis/src/events.ts:255] 后挂且默认 `push` 的层落在检查内侧，它们短路也挡不住已经执行的外层。真正会让检查「根本没跑」的，是**先** `push`、且不调用 `next()` 的短路 listener——检查若也 `push`，waterfall 先 `shift` 到短路层。`invariant.spec.ts` 的 `prepends ahead of a short-circuiting stream listener` 先 `ctx.on('llm/stream', …)`，再 `plugin(AgentLoopInvariant)`，divergent 请求仍抛 `diverges from the dispatch-time durable derivation`。[E: packages/core/agent-loop/tests/invariant.spec.ts:125] [E: packages/core/agent-loop/tests/invariant.spec.ts:127] [E: packages/core/agent-loop/tests/invariant.spec.ts:140]

10. **检查内容（仍是 companion 的事，不是 registry 的事）。** 没有 `isAgentLoopRequest(options)` 标记的请求直接 `return next()`——title / summarizer / 手搓 one-shot 不走这条合同。[E: packages/core/agent-loop/src/invariant.ts:22] [E: packages/llm/llm/src/call-config.ts:76] 带标记的请求必须：整个 `options` 冻结、带活的 `sessionId`、`messages` 数组冻结、log 里已有 `step/start` 与可折叠的 `request/header`，并且 `JSON.stringify(options.messages) === JSON.stringify(session.deriveMessages())`，model / system / tools / sampling 与 folded header 一致。[E: packages/core/agent-loop/src/invariant.ts:23] [E: packages/core/agent-loop/src/invariant.ts:40] 任一失败走 `fail(...)`，抛 `InvariantError`，**不会** `next()`。通过则 `return next()`。[E: packages/core/agent-loop/src/invariant.ts:53] 手动拓扑测试：多塞一条未入 log 的 user message 会炸 `diverges from the dispatch-time durable derivation`；没带 loop 标记的请求不炸。[E: packages/core/agent-loop/tests/invariant.spec.ts:64] [E: packages/core/agent-loop/tests/invariant.spec.ts:92]

11. **isolate / `leakedServices`。** `InvariantRegistry` 是 named Service。preset 行若把它 publish 进 **root realm**（没有 `isolate: { invariants: true }`），`mountPreset` 在树 settle 后扫 `leakedServices`：子树 fiber 提供的实现，其 store symbol 若等于 `ctx.root[Context.isolate][name]`，就算泄漏。[E: packages/preset/agent-presets/src/mount.ts:189] [E: packages/preset/agent-presets/src/mount.ts:200] 非空则抛，要求服务「sit behind an `isolate` realm or move to the host composition」。[E: packages/preset/agent-presets/src/mount.ts:365] Loader 读行上的 `isolate?.[name]`：`true` 进该 entry 的 `LocalRealm`，字符串标签进共享 `GlobalRealm`。[E: vendor/loader/src/config/isolate.ts:79] [E: vendor/loader/src/config/isolate.ts:81] Companion 自己通常不 `provide` 服务，泄漏门不针对它们；但 companion 行 `inject: ['invariants']`，host 若没挂 registry，`inactiveRows` 会报 `waiting for invariants`，同样让 `mountPreset` 失败。[E: packages/preset/agent-presets/src/mount.ts:297] [E: packages/preset/agent-presets/src/mount.ts:359] 正确位置是 host 面（profile / bundle / `--patch`），不是每会话 preset。

## 设计动机

DSH 是 `profile → bundle → agent preset` 叠出来的组合运行时。检查必须跟包走，不能集中进 loop 或 diagnostics 包——否则换一行组合、换一个 preset，断言就会和真实树脱节。`./invariant` companion 把「谁拥有这条关系」钉在 npm 名上；入口文件保持对 diagnostics 零依赖，关掉整份服务或用 regex 滤掉某个包，都不必改产品代码。

过滤器按包名而不是按检查种类切：allowlist / blocklist 是服务寿命内固定的 `RegExp` 源。空 allowlist 放行全部，是为了「后加载 / HMR 新挂上的包」不必改 config。占名即使 installer 没跑，是为了两个插件不能悄悄抢同一个包名。

`model-visible ⟺ logged` 之所以能成为硬边界，是因为 loop 把请求冻住再丢进 `llm/stream`，companion 只读 `deriveMessages()` 与 folded `request/header`。registry 提供 `fail` 与 child fiber，不解释 session 词汇表。

## Gotcha

- **默认安装树不挂这份服务。** 不要把「每个包都有 `./invariant`」读成「`dsh web` 已经在跑这些检查」。shipped bundle 不 insert `invariants`；要跑，得自己在 host 组合里 `plugin(InvariantRegistry)`，或依赖测试 host。
- **占名 ≠ 启用。** `enabled: false` 或 regex 滤掉之后，`register` 仍成功，第二次仍 `already registered`。想换 installer 必须先 dispose。
- **regex 不锚定、大小写敏感。** `'session'` 会命中 `@deepseek-ai/dsh-session-extra`；`'Session'` 命中不了 `dsh-session`。要精确匹配得自己写 `^…$`。
- **waterfall 忘了 `next()` = 否决下游。** loop companion 检查通过后若漏 `return next()`，adapter 看不到请求，表现像「模型没被调用」，其实是 listener 把链掐死。`fail()` 故意不 `next()`。
- **`prepend: true` 包住的是已经登记的 hooks，不是「挡后挂短路」。** `Events.register` 对 `prepend` 走 `unshift`。[E: vendor/cordis/src/events.ts:255] 短路 replay 先 `ctx.on('llm/stream')`、检查再默认 `push`，检查不跑；loop 测试按这个顺序挂 listener，再用 `{ prepend: true }` 证明 divergent 请求仍炸。[E: packages/core/agent-loop/tests/invariant.spec.ts:125] [E: packages/core/agent-loop/tests/invariant.spec.ts:140] 后挂且 `push` 的层落在检查内侧，不会让外层检查没跑。
- **这不是 session 合同本身。** `deriveMessages()` / `surfaceOp: replace`（没有 delete）活在 `dsh-session`。本页的 registry 只负责把 companion 接到事件上。
- **preset 里 publish `invariants` 必炸。** 需要每会话一份 registry 才写 `isolate: { invariants: true }`；产品意图是进程级一份。Companion 行在缺服务时是 `waiting for invariants`，不是静默跳过。
- **空 installer 不是漏写。** 没有可观察事件或可变数据关系的包把 `install` 写成 `() => {}`。[E: packages/bundle/base/src/invariant.ts:20] [E: packages/runtime-diagnostics/invariants/src/invariant.ts:21] 结构门要求这段声明文本含 `No runtime invariant:`，否则 `verify-package-invariants` 记一条 violation。[E: scripts/package-invariants.ts:269]
- **异步 dispose 仍占名。** 在 `child.dispose()` 的 barrier 解开前抢着 `register` 同名，会看到 `already registered`，不是服务坏了。
- **base 没有 dormant Codex / Claude 后端。** 不要把「standard preset 里 `tool-subagent-codex` 行 `disabled: true`」读成「base 已经装了但休眠」。invariants 行也一样：**没有行就是没装**，不是 dormant。

## Seam 三角

| 角色 | 落点 | ctx 键 / bundle / preset 行 |
|---|---|---|
| **Definition** | `@deepseek-ai/dsh-invariants`：`InvariantRegistry`、`Config`、`InvariantInstaller`、`InvariantError`；`Context.invariants` 模块扩增 | `ctx.invariants`。这是 diagnostics 注册表，不是 `fs` / `shell` 那种业务能力缝。要进真树，得有人写 Loader 行 `name: '@deepseek-ai/dsh-invariants'`，或代码里 `ctx.plugin(InvariantRegistry)`。[E: packages/runtime-diagnostics/invariants/src/index.ts:70] |
| **Provider** | 同一包的默认导出 `InvariantRegistry`：过滤、占名、child fiber、把 `fail` 绑成 `InvariantError` | **不**在 `dsh-base` / `dsh-web-app` / `dsh-headless` 的 `cordis.patch.yml`。测试 Provider 是 `scripts/test-invariants.ts` 的 `{ enabled: true }`；示例 Provider 是 `agent-spine-demo` 的 `config.invariants ?? {}`。[E: scripts/test-invariants.ts:177] [E: packages/examples/agent-spine-demo/src/index.ts:245] |
| **Consumer** | 每包 `./invariant` companion 的 `apply` → `register(ownPackageName, install)`。可执行例子：`dsh-agent-loop` 在 `llm/stream` 上核 request-reconstruction（`model-visible ⟺ logged`） | companion 行若出现在组合里，名字是 `@deepseek-ai/<pkg>/invariant`，`inject: ['invariants']`。preset 面不应 publish `invariants`；loop 行本身在 host：`dsh-base` 的 `id: agent-loop`。[E: packages/core/agent-loop/src/invariant.ts:63] [E: packages/bundle/base/cordis.patch.yml:436] |

换过滤 = 重载这份 Provider（改 config 或 `enabled`），不必改各包入口。换检查 = 改那个包的 companion。卸掉 Provider，所有 child listener 随 effect 倒序卸掉。[E: vendor/cordis/src/fiber.ts:431]

## Sources

- packages/runtime-diagnostics/invariants/src/index.ts
- packages/runtime-diagnostics/invariants/src/invariant.ts
- packages/runtime-diagnostics/invariants/package.json
- packages/runtime-diagnostics/invariants/tests/service.spec.ts
- packages/core/agent-loop/src/invariant.ts
- packages/core/agent-loop/tests/invariant.spec.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/base/package.json
- packages/bundle/base/src/invariant.ts
- packages/bundle/base/tests/base.spec.ts
- packages/preset/agent-presets/src/mount.ts
- packages/llm/llm/src/index.ts
- packages/llm/llm/src/call-config.ts
- vendor/cordis/src/events.ts
- vendor/cordis/src/fiber.ts
- vendor/cordis/src/service.ts
- vendor/loader/src/config/isolate.ts
- scripts/test-invariants.ts
- scripts/package-invariants.ts
- packages/examples/agent-spine-demo/src/index.ts

## 相关

- [`spine.overview`](../../spine/overview.md) — 组合运行时全仓地图；host 面 vs agent-preset 面。
- [`subsys.core.agent-loop`](agent-loop.md) — 默认 loop Provider；本页的 request-reconstruction companion 是它的 Consumer。
- [`spine.turn-and-step`](../../spine/turn-and-step.md) — turn / step 端到端；`llm/stream` 在 `agent/request` 之后。
- [`spine.session-log`](../../spine/session-log.md) — `deriveMessages()` 与 `request/header`；loop companion 用来比对 messages。
- [`spine.composition-boot`](../../spine/composition-boot.md) — `profile → bundle → preset`；invariants 若要进真树，加在 host 层。
- [`spine.capability-seams`](../../spine/capability-seams.md) — Definition / Provider / Consumer 总图。
- [`subsys.core.session`](session.md) — `Session` / `SessionStore` / `SurfaceOp`（没有 delete）。
- [`subsys.composition.agent-presets`](../composition/agent-presets.md) — `mountPreset` / `leakedServices` / `inactiveRows`。
- [`subsys.composition.bundle-base`](../composition/bundle-base.md) — `dsh-base` 行表；不含 `invariants`。
