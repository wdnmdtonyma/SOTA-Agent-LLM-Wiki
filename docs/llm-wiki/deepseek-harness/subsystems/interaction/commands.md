---
id: subsys.interaction.commands
title: commands 注册表
kind: subsystem
tier: T2
pkg: interaction
source:
  - packages/interaction/commands/src/index.ts
  - packages/interaction/commands/src/types.ts
  - packages/interaction/commands/src/brand.ts
  - packages/interaction/commands/src/invariant.ts
  - packages/interaction/commands/package.json
  - packages/interaction/commands/tests/commands.spec.ts
  - packages/interaction/commands/tests/invariant.spec.ts
  - packages/core/scope/src/store.ts
  - packages/core/scope/src/index.ts
  - packages/typert/protocol/src/index.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/web-app/cordis.patch.yml
  - apps/cli/config/agent-presets/standard/agent.cordis.yml
  - packages/compaction/command-compact/src/index.ts
  - packages/feedback/command-feedback/src/index.ts
  - packages/goal/command-goal/src/index.ts
  - packages/interaction/permission-presets/src/index.ts
  - packages/plan/plan-mode/src/index.ts
  - packages/session-query/session-log-export/src/index.ts
  - vendor/cordis/src/service.ts
  - vendor/cordis/src/utils.ts
  - vendor/cordis/src/events.ts
symbols:
  - ctx.commands
  - CommandRuntime
  - parseCommand
  - CommandId
related:
  - spine.overview
  - spine.turn-and-step
  - subsys.core.scope
  - subsys.core.session
  - subsys.context.compaction
  - subsys.interaction.feedback
  - subsys.interaction.permission-presets
  - subsys.orchestration.goal
  - subsys.composition.bundle-base
evidence: explicit
status: verified
updated: 47f943859b
---

> `ctx.commands` 是 **host 面**人命令注册表：`CommandRuntime`（`TypertRemoteService`）挂在进程级键 `commands` 上。人敲的 `/name …` 由 `execute()` 直接跑 handler，**不经模型 turn**，也不把命令行折进 `deriveMessages()`。DSH 是 Cordis 组合运行时（`profile → bundle → agent preset`）；默认产品路径是本地 Web GUI（`dsh web`），本仓没有 shipped TUI。

## 能回答的问题

- `ctx.commands` 是哪个包、哪一层组合挂上的？handler 会不会进 `user/message` / 开 turn？
- `parseCommand` 的名字语法是什么？行首必须有 `/` 吗？`register` 的 `name` 带不带斜杠？
- `ScopedLayers` 怎样分 global 与 agent / preset overlay？同层同名会怎样？近层怎样盖住远层？
- `command/run` / `command/done` 何时写入？admission miss 写不写 log？`recordInput` 默认是什么？
- `/compact` `/feedback` `/permission` `/goal` 各是谁登记的？`dsh-web-app` 会不会 disable `id: commands`？
- 浏览器 `remote.commands.execute(sessionId, line)` 和 host `execute(agent, line, signal)` 各拥有什么？slash 菜单是不是本包？

## 职责边界

本包 `@deepseek-ai/dsh-commands` 拥有：`CommandRuntime` / `ctx.commands`、`parseCommand`、`CommandDefinition` 边界校验、`ScopedLayers` 上的 global + scoped 视图、`command/run` ↔ `command/done` 生命周期 append、配对 id `CommandId`、以及 emit 事件 `commands/change`。可选 companion `@deepseek-ai/dsh-commands/invariant` 校验同一 session log 里的配对，不占 `ctx.commands`。

本包**不**拥有：

- 各条 shipped 命令的领域语义（`/compact` 的选段、`/feedback` 的 `feedback/record`、`/permission` 的旋钮、`/goal` 的生命周期）——只提供 `register` / `execute` 缝。
- client `ui-commands`、`/` 输入触发、slash 菜单渲染。那些是 `dsh-web-app` 的 client 行。
- Typert 如何把 wire 上的 session 身份折成 live `Agent`、如何补 `AbortSignal`。host 方法吃 `Agent`；client 调 `remote.commands`。
- `ScopedLayers` / `NamedEntries` / `scopeOf` 原语本身（[subsys.core.scope](../core/scope.md)）。
- session surface / `deriveMessages()`（[subsys.core.session](../core/session.md)）。`command/*` 不是 `SurfaceEventType`。

`commands` 服务本身**不**进 preset `isolate`。preset 通过 **调用方 ctx 的 `scopeOf`** 往同一份 host 注册表叠 overlay，不是再 publish 一份 `ctx.commands`。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/interaction/commands/src/index.ts` | `parseCommand`、`CommandRuntime`、`register` / `list` / `find` / `execute` |
| `packages/interaction/commands/src/types.ts` | `CommandResult` / `CommandDescriptor` / `command/run` / `command/done` / `commands/change` |
| `packages/interaction/commands/src/brand.ts` | `CommandId` 品牌与构造；无 Cordis import |
| `packages/interaction/commands/src/invariant.ts` | companion：按 `commandId` 配对，校 `sourceEventSeq` |
| `packages/interaction/commands/tests/commands.spec.ts` | 语法、scope 阴影、lifecycle、admission miss、abort |
| `packages/interaction/commands/tests/invariant.spec.ts` | 非法 `sourceEventSeq`、error 不得带 source |
| `packages/core/scope/src/store.ts` | `ScopedLayers.merge` / `effect`；`NamedEntries.insert` 同名抛错 |
| `packages/bundle/base/cordis.patch.yml` | host 行 `id: commands` |
| `packages/compaction/command-compact/src/index.ts` | Consumer：`/compact` |
| `packages/feedback/command-feedback/src/index.ts` | Consumer：`/feedback`，`recordInput: false` |
| `packages/interaction/permission-presets/src/index.ts` | Consumer：`/permission`（`inject: ['commands']` 子 fiber） |
| `packages/goal/command-goal/src/index.ts` | Consumer：`/goal` |
| `packages/plan/plan-mode/src/index.ts` | Consumer：`/plan`（同样可选 `inject: ['commands']`） |
| `packages/session-query/session-log-export/src/index.ts` | Consumer：Web `/export` |
| `packages/bundle/web-app/cordis.patch.yml` | client `id: ui-commands`；host `command-compact` `disabled`；**没有** disable `commands` |

## 数据模型

| 符号 | 要点 |
|---|---|
| `COMMAND_NAME` | `^[a-z][a-z0-9_-]*$`。`register` 的 `name` 必须整串匹配，**不**带前导 `/`。 [E: packages/interaction/commands/src/index.ts:25] |
| `parseCommand` | 行首 `/` + 同上名字字符，其后必须是行尾或空白（`\t\n\r `）。返回 `{ name, rawInput }`；`rawInput` 是名字后的原文，含分隔空白，不做 trim。对不上返回 `undefined`。 [E: packages/interaction/commands/src/index.ts:103] [E: packages/interaction/commands/src/index.ts:108] |
| `CommandDefinition` | `name` / `description` / 可选 `input.hint` / 可选 `recordInput` / `handler`。`description` 与 hint 都必须是非空（trim 后）字符串。 [E: packages/interaction/commands/src/index.ts:158] [E: packages/interaction/commands/src/index.ts:171] |
| `recordInput` | 缺省视为 true。`=== false` 时 `command/run` **省略** `args`；handler 仍收到完整 `rawInput`。 [E: packages/interaction/commands/src/index.ts:311] |
| `CommandInvocation` | `{ commandId, agent, rawInput, signal }`。handler 的入参；不经模型。 [E: packages/interaction/commands/src/index.ts:28] [E: packages/interaction/commands/src/index.ts:54] |
| `CommandResult` | `{ kind: 'success', text?, sourceEventSeq? }` 或 `{ kind: 'error', text }`。error 的 `text` 必须非空。`sourceEventSeq` 只允许出现在 success。 [E: packages/interaction/commands/src/types.ts:19] [E: packages/interaction/commands/src/index.ts:212] |
| `CommandDescriptor` | `list()` 返回的不可变视图：`name` / `description` / 可选 `input`。**没有** handler。 [E: packages/interaction/commands/src/types.ts:42] |
| `CommandExecution` | `{ commandId, result }`。`execute` 在 handler 正常结算后返回；admission miss 返回 `undefined`。 [E: packages/interaction/commands/src/types.ts:34] [E: packages/interaction/commands/src/index.ts:303] [E: packages/interaction/commands/src/index.ts:305] |
| `CommandId` | `Branded<'CommandId'>`。构造函数只做类型品牌，不校验。运行时形状 `cmd-${8 位 instanceToken}-${seq}`。 [E: packages/interaction/commands/src/brand.ts:20] [E: packages/interaction/commands/src/index.ts:343] |
| `CommandSource` | 今天只有 `{ kind: 'user' }`。 [E: packages/interaction/commands/src/types.ts:57] [E: packages/interaction/commands/src/types.ts:58] |
| `command/run` | log-only。`{ commandId, name, args?, source }`。`args` 是 `parseCommand` 的 `rawInput`。 [E: packages/interaction/commands/src/types.ts:88] |
| `command/done` | log-only。`{ commandId, kind, text?, sourceEventSeq? }`。与 `command/run` 用同一 `commandId` 配对。 [E: packages/interaction/commands/src/types.ts:95] |
| `commands/change` | Cordis **emit**（不是 waterfall）。登记或卸载后广播；observer 失败不能否决突变。 [E: packages/interaction/commands/src/types.ts:72] |

`command/*` 走两参 `session.append(type, data)`，不开 turn、不带 `surfaceOp`。 [E: packages/interaction/commands/src/index.ts:360] 不进 `surface.nodes` / `deriveMessages()` 是因为 `SurfaceEventType` 只有 `user/message` / `assistant/message` / `tool/result`。[I]

## 控制流

1. **host 面挂一份 `CommandRuntime`。** `dsh-base` 组合行 `id: commands` / `name: '@deepseek-ai/dsh-commands'`。`CommandRuntime` 继承 `TypertRemoteService`，构造 `super(ctx, 'commands')`，键是 `ctx.commands`。`export const name = 'commands'` 是 Loader 插件名。这是进程级服务，不是 preset isolate 里的私有实例。 [E: packages/bundle/base/cordis.patch.yml:250] [E: packages/bundle/base/cordis.patch.yml:251] [E: packages/interaction/commands/src/index.ts:23] [E: packages/interaction/commands/src/index.ts:225] [E: packages/interaction/commands/src/index.ts:237] [E: packages/typert/protocol/src/index.ts:147]

2. **`parseCommand@packages/interaction/commands/src/index.ts` 只做语法。** `/goal` → `{ name: 'goal', rawInput: '' }`；`/goal create the thing` 的 `rawInput` 以一个空格开头。缺 `/`、前导空格、`/Goal`、`/goal/path`、非法字符一律 `undefined`。名字字符集与 `COMMAND_NAME` 相同，但解析器额外要求行首斜杠和空白边界。 [E: packages/interaction/commands/src/index.ts:103] [E: packages/interaction/commands/tests/commands.spec.ts:42] [E: packages/interaction/commands/tests/commands.spec.ts:50]

3. **`register@CommandRuntime` 写哪一层，由调用方 ctx 的 `scopeOf` 决定。** Cordis `Service` tracker 把 `this.ctx` 重绑到调用方：读 `this.ctx` 时 proxy 返回调用 context，不是构造时那份。`ScopedLayers.effect` 再 `scopeOf(ctx)`：无 `kScope` 进 eager `global`；有标签才懒创建 overlay。`NamedEntries.insert` 在**同一层**撞名就抛。global 层的诊断要求「per-agent 变体请挂到该 agent 的 `agent.ctx`」；scoped 层则是 `already registered in this scope`。 [E: vendor/cordis/src/service.ts:48] [E: vendor/cordis/src/utils.ts:176] [E: packages/core/scope/src/store.ts:231] [E: packages/core/scope/src/index.ts:154] [E: packages/core/scope/src/store.ts:45] [E: packages/interaction/commands/src/index.ts:80] [E: packages/interaction/commands/src/index.ts:81] [E: packages/interaction/commands/src/index.ts:247]

4. **同层冲突，跨层允许阴影。** 两次 `ctx.commands.register(command('same'))` 抛 `/agent\.ctx/`。`scope.ctx.commands.register(command('same'))` 可以盖住 global；对该 agent 的 `execute('/shared')` 跑 scoped handler，`scope.dispose()` 之后回落到 global。fiber dispose 卸掉该 fiber 贡献的登记。 [E: packages/interaction/commands/tests/commands.spec.ts:123] [E: packages/interaction/commands/tests/commands.spec.ts:124] [E: packages/interaction/commands/tests/commands.spec.ts:100] [E: packages/interaction/commands/tests/commands.spec.ts:103] [E: packages/interaction/commands/tests/commands.spec.ts:114]

5. **有效视图：global + scope 祖先链，近层覆盖。** `view(agent)` = `layers.merge(agent, layer => layer.commands)`。`merge` 先铺 global，再按 `chainLayers`（远祖在前、本 scope 在后）`set`。live `Agent` 自己是 `ScopeKey`；`dsh web` 上 `bindScopeParent(agent, standingKey)` 之后，preset standing 上登记的名字对该 agent 可见。`list` 返回按 `name` 排序的冻结 `CommandDescriptor`；`find` 返回带 handler 的 `CommandDefinition`。 [E: packages/interaction/commands/src/index.ts:365] [E: packages/core/scope/src/store.ts:212] [E: packages/interaction/commands/src/index.ts:259] [E: packages/interaction/commands/src/index.ts:273] [E: packages/interaction/commands/tests/commands.spec.ts:86]

6. **`list` / `execute` 是 `@Remote`；`find` / `register` 不是。** 浏览器半边只看 descriptor 和结算结果，拿不到 handler 函数。host `execute(agent, line, signal)` 仍要 live `Agent` 才能选层、往该 session 写 log。client 调的是 `remote.commands.execute(sessionId, line)`（两参）；session 身份 → Agent、以及 request abort → `signal`，属于 Typert / api-remotes，不是本包。 [E: packages/interaction/commands/src/index.ts:259] [E: packages/interaction/commands/src/index.ts:296] [E: packages/interaction/commands/src/index.ts:297]

7. **admission miss 静默返回，不写 log。** `parseCommand` 失败或 `view(agent)` 没有该名 → `undefined`。空闲 session 上 `execute('not a command')` / `execute('/missing')` 之后 `session.events` 仍是 `[]`。调用方（composer）把这当成「不是命令」，不要当成 handler 失败。 [E: packages/interaction/commands/src/index.ts:302] [E: packages/interaction/commands/src/index.ts:304] [E: packages/interaction/commands/src/index.ts:305] [E: packages/interaction/commands/tests/commands.spec.ts:430]

8. **已 abort 的 signal 在 `command/run` 之前就抛。** 解析成功且名字命中之后，若 `signal.aborted`，立刻 `throw abortError(signal)`，**还没有** mint id、也没有 append。挂起中的 handler 被 abort 则已经有 `command/run`，再补 `command/done { kind: 'error' }` 后把原错误抛出。 [E: packages/interaction/commands/src/index.ts:306] [E: packages/interaction/commands/src/index.ts:321] [E: packages/interaction/commands/tests/commands.spec.ts:211] [E: packages/interaction/commands/tests/commands.spec.ts:416]

9. **命中后：先 `command/run`，再跑 handler，再 `command/done`。** `mintCommandId` 之后同步 `appendLifecycle(..., 'command/run', { commandId, name, args?, source: { kind: 'user' } })`。`command/run` append 失败会让整次 `execute` 响亮失败。handler 的返回值经 `withAbort` + `normalizeResult`；成功路径再 append `command/done`（success 才抄 `sourceEventSeq`）并返回冻结的 `{ commandId, result }`。handler 抛错 / abort：先尽量 append `command/done { kind: 'error', text }`，这次 append 失败只 `logger.warn`，然后把 handler 自己的错误继续抛出。 [E: packages/interaction/commands/src/index.ts:308] [E: packages/interaction/commands/src/index.ts:318] [E: packages/interaction/commands/src/index.ts:330] [E: packages/interaction/commands/src/index.ts:325] [E: packages/interaction/commands/src/index.ts:326] [E: packages/interaction/commands/tests/commands.spec.ts:318]

10. **不开 turn，也不包一层假 turn。** 空闲 log 上成功执行后事件序就是 `command/run`、`command/done`。已经有 `turn/start` 时，这对事件直接插在开 turn 里，不会再写合成的 `turn/start|end`。persistence 走普通 `session/event` + checkpoint，本包不强制 `flush`。 [E: packages/interaction/commands/tests/commands.spec.ts:319] [E: packages/interaction/commands/tests/commands.spec.ts:439] [E: packages/interaction/commands/src/index.ts:352]

11. **`recordInput: false` 让领域事件独占 payload。** `/private keep this once` 的 handler 仍看见 `rawInput: ' keep this once'`，但 `command/run.data` 没有 `args` 键。`dsh-command-feedback` 这样登记：它自己 `session.append('feedback/record', { text })`，避免命令行与领域事件各记一份。缺省（含 `/compact` 的空输入）会记下 `args: ''`。 [E: packages/interaction/commands/src/index.ts:311] [E: packages/interaction/commands/tests/commands.spec.ts:358] [E: packages/feedback/command-feedback/src/index.ts:105] [E: packages/feedback/command-feedback/src/index.ts:75]

12. **`commands/change` 是非否决 emit。** `ScopedLayers` 在 insert 成功和 undo 时回调 `notifyChange`。实现手扫 `dispatch('emit', ['commands/change'])`，同步 throw 与 rejected Promise 都 `warn`，后续 listener 继续跑。同一 disposer 第二次调用是空操作，不会再通知。本包**没有** waterfall；Cordis 全局规则「waterfall 必须 `next()`」管的是邻缝（例如 compaction 挂的 `agent/pre-step`），不是 `commands/change`。 [E: packages/interaction/commands/src/index.ts:374] [E: packages/interaction/commands/src/index.ts:381] [E: packages/interaction/commands/tests/commands.spec.ts:135] [E: vendor/cordis/src/events.ts:238]

13. **组合：base 挂 registry；web-app 不关它；preset 用 scope 加自己的命令。** host 同行还有 `id: command-feedback`、`id: command-goal`。`dsh-web-app` 加 client `id: ui-commands`，并 `disabled: true` 掉 host 面 `command-compact`（与 `compaction-basic` 一起搬走），**没有** disable `id: commands` / `command-feedback` / `command-goal` 的行。`standard` / `code` / `cordis` 在 agent-preset 面 `cordis:group id: compaction` 里重挂 `command-compact`，并 `isolate.compaction` / `toolResultPruner`——isolate 的是 compaction 服务 realm，不是第二份 `ctx.commands`。登记发生在 `mountPreset` 的 standing scoped ctx 上，因此 `/compact` 跟着该 preset 的 overlay 走。`minimal` 不挂 compaction 组，也就没有 `/compact`。 [E: packages/bundle/base/cordis.patch.yml:253] [E: packages/bundle/base/cordis.patch.yml:262] [E: packages/bundle/web-app/cordis.patch.yml:227] [E: packages/bundle/web-app/cordis.patch.yml:228] [E: packages/bundle/web-app/cordis.patch.yml:361] [E: packages/bundle/web-app/cordis.patch.yml:362] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:141] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:147] [E: packages/compaction/command-compact/src/index.ts:11] [E: packages/compaction/command-compact/src/index.ts:101]

14. **点名 Consumer，不当字段表。** 本仓 `packages/**/src` 里调用 `commands.register({` 的名字是：`compact`（[subsys.context.compaction](../context/compaction.md)）、`feedback`（[subsys.interaction.feedback](./feedback.md)）、`goal`（[subsys.orchestration.goal](../orchestration/goal.md)）、`permission`（[subsys.interaction.permission-presets](./permission-presets.md)）、`plan`（`subsys.orchestration.plan`）、`export`（`dsh-web-app` 的 `session-log-download`）。`/compact` 调 `ctx.compaction.compactNow`；`/feedback` 只追加 log-only `feedback/record`，不启动模型。 [E: packages/compaction/command-compact/src/index.ts:66] [E: packages/feedback/command-feedback/src/index.ts:101] [E: packages/goal/command-goal/src/index.ts:164] [E: packages/interaction/permission-presets/src/index.ts:258] [E: packages/plan/plan-mode/src/index.ts:270] [E: packages/session-query/session-log-export/src/index.ts:20]

15. **companion 配对，默认产品树不跑。** `commands-invariant` 的 `inject = ['invariants']`。同一 session 里 `command/run` 的 `commandId` 不得重复；`command/done` 必须已见过对应 `command/run`；`sourceEventSeq` 只允许 success，且必须指向更早、非 `command/*` 的事件。`dsh-base` **没有** `id: invariants` 行，默认 `dsh web` 不提供 `ctx.invariants`，这条检查只在显式挂 registry 的测试 / demo 拓扑里活。 [E: packages/interaction/commands/src/invariant.ts:16] [E: packages/interaction/commands/src/invariant.ts:27] [E: packages/interaction/commands/src/invariant.ts:35] [E: packages/interaction/commands/tests/invariant.spec.ts:57]

## 设计动机

人命令和模型 turn 必须分开。若把 `/compact` 当成一条 `user/message` 丢进 loop，compaction / permission / feedback 会污染 `deriveMessages()`，也会和 `model-visible ⟺ logged` 抢同一条历史。`execute` 的合同写死「不把命令送给模型」：handler 直接改 host 状态，lifecycle 事件是 log-only 影子。

注册表做成 host 单例 + `ScopedLayers`，是为了让 `/feedback` 这种进程级能力对每个 agent 可见，同时让 `/compact` 可以跟着 preset isolate 组走——换 `minimal` 等于这个会话没有 compact 命令，而不必再 publish 一份 `ctx.commands`。同层撞名 fail-loud，避免两个插件默默抢同一个 slash 名。

`command/run` 在 handler **之前**落地，是为了让投影 / UI 能从冷 log 恢复「有一次尚未结算的命令」（`/plan` 的 pending 就读这条）。`recordInput: false` 把「谁拥有用户输入」留给领域事件，避免 `/feedback` 的文本在 `command/run.args` 和 `feedback/record` 里各出现一次。

`list` / `execute` 走 Typert，handler 留在 host：浏览器只负责发现与提交整行，结算文案由 session 流上的 `command/done` 渲染，composer 不再 echo 一遍。

## Gotcha

- **人命令不经模型 turn。** 不要把 `execute` 理解成「先 append `user/message` 再让 loop 看」。空闲 log 上只有 `command/run` + `command/done`。 [E: packages/interaction/commands/tests/commands.spec.ts:319]
- **`register` 的 `name` 没有 `/`；`execute` 的 `line` 必须有。** `execute(agent, 'run', signal)` 是 admission miss。 [E: packages/interaction/commands/tests/commands.spec.ts:190]
- **大小写与路径都不是命令。** `/Goal`、`/goal/path`、` /goal` 都是 `undefined`。 [E: packages/interaction/commands/tests/commands.spec.ts:50]
- **同层同名会抛；阴影只能来自更近的 scope。** 不要在 host 上登记第二个 `feedback`。要做 per-agent 变体，挂到该 agent 的 scoped ctx。 [E: packages/interaction/commands/tests/commands.spec.ts:123]
- **已经 abort 的 signal 不会留下 `command/run`。** 只有 handler 开始之后的 abort 才保证成对。 [E: packages/interaction/commands/src/index.ts:306]
- **handler 返回 `{ kind: 'error' }` 不抛；handler throw / abort 才抛。** 两条路径都会写 `command/done kind: 'error'`，但 RPC 调用方看到的是「结算结果」对「rejected promise」。 [E: packages/interaction/commands/tests/commands.spec.ts:276] [E: packages/interaction/commands/tests/commands.spec.ts:393]
- **`recordInput` 默认 true。** 只有显式 `false` 才省略 `args`。空 `/compact` 仍记下 `args: ''`。
- **`CommandId(...)` 不校验。** 品牌构造接受任意字符串；运行时 mint 才是 `cmd-` 前缀。 [E: packages/interaction/commands/src/brand.ts:28]
- **`find` 带着 handler，不要放到 Remote 上。** 远程面只有 `list` / `execute`。
- **本包没有 waterfall。** 漏 `next()` 否决整条链，说的是 `agent/pre-step` / `tools/execute` 那些邻缝，不是 `commands/change`。
- **`dsh-web-app` 关掉的是 host `/compact`，不是注册表。** `id: commands` 仍在。slash 菜单是 `ui-commands`，本页不写它的 composer / 卡片。
- **默认 `dsh web` 不跑 `commands-invariant`。** 配对规则在测试里是硬的，产品进程树没有 `ctx.invariants`。

## Seam 三角

| 角色 | 包 / 符号 | ctx 键 / 合同 | bundle / preset 行 |
|---|---|---|---|
| Definition | `@deepseek-ai/dsh-commands` 的 `types.ts` / `brand.ts` + `CommandRuntime` 方法合同 | `CommandResult` / `command/run` / `command/done` / `parseCommand` | 类型子路径可进 client；服务实现留 host |
| Provider | `CommandRuntime` | `ctx.commands`；`register` / `list` / `find` / `execute` | `dsh-base` `id: commands`。web-app **不** disable。preset **不** remount 这份服务 |
| Consumer（host 命令） | `dsh-command-feedback`、`dsh-command-goal`、`dsh-permission-presets` 的 inject 子 fiber、`dsh-command-compact`、`dsh-plan-mode` 的 inject 子 fiber、`dsh-session-log-export` | `inject` 含 `commands`；只调 `register` | feedback / goal 是 base 行；compact = base 挂、web disable、preset compaction isolate 组重挂；`/export` 是 web-app 行 |
| Consumer（client） | `dsh-client-ui-commands`、`ClientSession.command` | `remote.commands.list` / `execute` | `dsh-web-app` `id: ui-commands`。本页不拥有菜单 |
| Companion | `@deepseek-ai/dsh-commands/invariant` | 听 `session/event`，校配对 | **不是** shipped bundle 行；要 `ctx.invariants` |

换一条命令实现 = 换 Consumer 包，registry 合同不变。换 UI = 换 client 对 `remote.commands` 的调用方，不能把 handler 搬进浏览器。preset 需要私有 **compaction** 实例时 isolate 那个键；`commands` 留在 host。

## Sources

- packages/interaction/commands/src/index.ts
- packages/interaction/commands/src/types.ts
- packages/interaction/commands/src/brand.ts
- packages/interaction/commands/src/invariant.ts
- packages/interaction/commands/package.json
- packages/interaction/commands/tests/commands.spec.ts
- packages/interaction/commands/tests/invariant.spec.ts
- packages/core/scope/src/store.ts
- packages/core/scope/src/index.ts
- packages/typert/protocol/src/index.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/web-app/cordis.patch.yml
- apps/cli/config/agent-presets/standard/agent.cordis.yml
- packages/compaction/command-compact/src/index.ts
- packages/feedback/command-feedback/src/index.ts
- packages/goal/command-goal/src/index.ts
- packages/interaction/permission-presets/src/index.ts
- packages/plan/plan-mode/src/index.ts
- packages/session-query/session-log-export/src/index.ts
- vendor/cordis/src/service.ts
- vendor/cordis/src/utils.ts
- vendor/cordis/src/events.ts

## 相关

- [spine.overview](../../spine/overview.md)：`profile → bundle → preset`；host 面 vs agent-preset 面。
- [spine.turn-and-step](../../spine/turn-and-step.md)：inbox 何时变成 `user/message`。人命令不走这条。
- [subsys.core.scope](../core/scope.md)：`ScopedLayers` / `scopeOf` / isolate ≠ scope。
- [subsys.core.session](../core/session.md)：append-only log；`command/*` 不是 surface。
- [subsys.context.compaction](../context/compaction.md)：`/compact` → `compactNow`；web disable + preset isolate 重挂。
- [subsys.interaction.feedback](./feedback.md)：`/feedback` 与 `feedback/record`；web-app 另有 `message-feedback`。
- [subsys.interaction.permission-presets](./permission-presets.md)：`/permission` 写 sandbox + approval 两个旋钮。
- [subsys.orchestration.goal](../orchestration/goal.md)：`/goal` 与 `create_goal` 工具共用 `ctx.goals`。
- [subsys.composition.bundle-base](../composition/bundle-base.md)：`id: commands` 以及同行 `command-feedback` / `command-goal` / `command-compact`。
