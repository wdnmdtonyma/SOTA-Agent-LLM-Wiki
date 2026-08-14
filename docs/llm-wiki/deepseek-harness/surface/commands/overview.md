---
id: surface.commands.overview
title: 人命令 ctx.commands
kind: surface
tier: T1
pkg: interaction
source:
  - packages/interaction/commands/src/index.ts
  - packages/interaction/commands/src/types.ts
  - packages/interaction/commands/src/brand.ts
  - packages/interaction/commands/package.json
  - packages/interaction/commands/tests/commands.spec.ts
  - packages/core/scope/src/store.ts
  - packages/core/scope/src/index.ts
  - packages/core/session/src/types.ts
  - packages/core/session/src/surface.ts
  - packages/typert/protocol/src/index.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/web-app/cordis.patch.yml
  - packages/boot/app-boot/src/profile.ts
  - packages/preset/agent-presets/src/index.ts
  - packages/preset/agent-presets/src/mount.ts
  - apps/cli/config/agent-presets/standard/agent.cordis.yml
  - apps/cli/config/agent-presets/code/agent.cordis.yml
  - apps/cli/config/agent-presets/cordis/agent.cordis.yml
  - apps/cli/config/agent-presets/minimal/agent.cordis.yml
  - packages/compaction/command-compact/src/index.ts
  - packages/compaction/command-compact/package.json
  - packages/compaction/command-compact/tests/command-compact.spec.ts
  - packages/feedback/command-feedback/src/index.ts
  - packages/feedback/command-feedback/package.json
  - packages/goal/command-goal/src/index.ts
  - packages/goal/command-goal/package.json
  - packages/interaction/permission-presets/src/index.ts
  - packages/interaction/permission-presets/package.json
  - packages/plan/plan-mode/src/index.ts
  - packages/plan/plan-mode/package.json
  - packages/session-query/session-log-export/src/index.ts
  - packages/session-query/session-log-export/package.json
  - packages/client/ui-commands/src/client/service.ts
  - packages/client/ui-commands/package.json
  - packages/client/runtime/src/client/sessions/session.ts
  - packages/client/ui-conversation/tests/input-scenarios.client.spec.tsx
  - packages/client/ui-model-selection/src/client/index.ts
  - packages/client/ui-permission-presets/src/client/index.ts
symbols:
  - ctx.commands
  - CommandRuntime
  - parseCommand
  - CommandId
related: []
evidence: explicit
status: verified
updated: 47f943859b
---

> `ctx.commands` 是 **host 面**人命令注册表：人在 Web 工作台敲 `/name …`，`CommandRuntime.execute()` 直接跑 handler，**不经模型 turn**，也不把命令行折进 `deriveMessages()`。DSH 是 Cordis 组合运行时（`profile → bundle → agent preset`）；默认产品路径是本地 Web GUI（`dsh web`），本仓没有 shipped TUI。

## 能回答的问题

- 人敲 `/compact` / `/feedback` 会不会变成一条 `user/message`、会不会开 turn？
- 行首必须有 `/` 吗？`register` 的 `name` 带不带斜杠？`/Goal` 算不算命令？
- `command/run` 和 `command/done` 写不写 session log？admission miss 写不写？
- `/compact` `/feedback` `/permission` `/goal` `/plan` `/export` 各是谁 `register` 的？进不进 shipped preset？
- `dsh-web-app` 会不会 `disabled` 掉 `id: commands`？`minimal` 会话有没有 `/compact`？
- 斜杠菜单里的 `/model` 是不是 `ctx.commands`？

## 是什么

包 `@deepseek-ai/dsh-commands` 发布 `CommandRuntime`，Loader 插件名 `export const name = 'commands'`，构造 `super(ctx, 'commands')`，键是 `ctx.commands`。 [E: packages/interaction/commands/package.json:2] [E: packages/interaction/commands/src/index.ts:23] [E: packages/interaction/commands/src/index.ts:237]

这是**人**面向 slash 行的注册表，不是模型可见工具。命中后 `execute` 直接调用 `definition.handler(invocation)`。 [E: packages/interaction/commands/src/index.ts:317] 空闲 session 上不会再包一层 `turn/start|end`，也不会多出 `user/message`。 [E: packages/interaction/commands/tests/commands.spec.ts:319] `ask_user_question` 是另一条缝：模型发起的工具，走 `ctx.userQuestions`，结果进 `tool/result`（[surface.tools.ask-user-question](../tools/ask-user-question.md)）。

`execute` 命中后先 `session.append('command/run', …)`，再调 handler，再 `append('command/done', …)`。两参 append、无 `surfaceOp`。 [E: packages/interaction/commands/src/index.ts:308] [E: packages/interaction/commands/src/index.ts:317] [E: packages/interaction/commands/src/index.ts:330] 空闲 log 上事件序就是 `command/run`、`command/done`。 [E: packages/interaction/commands/tests/commands.spec.ts:319]

`SurfaceEventType` 只有 `user/message` / `assistant/message` / `tool/result`。 [E: packages/core/session/src/types.ts:343] `deriveEventMessage` 对其它类型返回 `null`。 [E: packages/core/session/src/surface.ts:112] `/compact` 单测钉死：生命周期成对之后 `surface.nodes` 仍是 `[]`，`deriveMessages()` 仍是 `[]`。 [E: packages/compaction/command-compact/tests/command-compact.spec.ts:151] [E: packages/compaction/command-compact/tests/command-compact.spec.ts:152]

DSH 默认安装路径是 `PROFILE_TEMPLATES.web = ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app']`；shipped 模板只有 `web` 与 `headless`，没有 TUI。 [E: packages/boot/app-boot/src/profile.ts:115] [E: packages/boot/app-boot/src/profile.ts:116]

## 入口

人碰到 slash 命令的路径（默认 `dsh web`）：

1. 工作台输入框敲 `/`。client 包 `@deepseek-ai/dsh-client-ui-commands` 向 `inputTriggers` 登记 `trigger: '/'` 的 source `name: 'command'`。 [E: packages/client/ui-commands/package.json:2] [E: packages/client/ui-commands/src/client/service.ts:141] [E: packages/client/ui-commands/src/client/service.ts:142]
2. Enter / 菜单选中之后，`CommandUiRuntime` 调 `ctx.remote.commands.execute(sessionId, line)`（两参：会话身份 + 整行）。 [E: packages/client/ui-commands/src/client/service.ts:374] `ClientSession.command(line)` 是同一条 Remote。 [E: packages/client/runtime/src/client/sessions/session.ts:359]
3. host 上 `@Remote` 的 `CommandRuntime.execute(agent, line, signal)` 吃 live `Agent`、整行、以及请求 `AbortSignal`。 [E: packages/interaction/commands/src/index.ts:296] `CommandRuntime` 继承 `TypertRemoteService`。 [E: packages/typert/protocol/src/index.ts:147] session 身份如何折成 `Agent`、request abort 如何补成 `signal`，属于 Typert / api-remotes，不是本页。
4. host `execute`：`parseCommand(line)` 失败或有效视图里没有该名 → 返回 `undefined`（admission miss），**不** mint id、**不**写 log。 [E: packages/interaction/commands/src/index.ts:303] [E: packages/interaction/commands/src/index.ts:305] [E: packages/interaction/commands/tests/commands.spec.ts:430] composer 侧 `matchEnter` 对非 `/` 行或目录里没有的名字先返回 `undefined`，整行走默认 prompt sink，**还没**打到 host RPC。 [E: packages/client/ui-commands/src/client/service.ts:308] [E: packages/client/ui-commands/src/client/service.ts:322] 若 RPC 已经发出且回 `undefined`，`CommandUiRuntime.execute` 报 `{ kind: 'error', text: 'unknown or malformed command: …' }`，不是默认 sink。 [E: packages/client/ui-commands/src/client/service.ts:376]
5. 命中则同步写下 `command/run`，再跑 handler。结算文案活在 session 流上的 `command/done`；composer 对已准入的命令只回报 `{ kind: 'success' }`，不 echo 一遍。 [E: packages/client/ui-commands/src/client/service.ts:378]

**composer 对「有没有 `input.hint`」分叉。** 没有 `input` 的 host 命令（shipped 里是 `/compact`、`/export`）只在**光秃** `/name` 上 execute；带尾巴的行 `matchEnter` 返回 `undefined`，整行掉进默认 sink。 [E: packages/client/ui-commands/src/client/service.ts:332] [E: packages/client/ui-commands/src/client/service.ts:333] 单测：`/compact` + Enter 会 execute；`/compact 现在` 变成 `queue` 出去的普通消息，`executed` 仍为空。 [E: packages/client/ui-conversation/tests/input-scenarios.client.spec.tsx:237] [E: packages/client/ui-conversation/tests/input-scenarios.client.spec.tsx:245]

有 `input` 的命令（`/feedback` `/goal` `/permission` `/plan`）走 leadingInput claim，尾巴交给 `execute`。`/permission` 另外被 client `decorate`：光秃 Enter 弹 preset 选择器，选中后再 `live.command(\`/permission ${option.id}\`)`。 [E: packages/client/ui-permission-presets/src/client/index.ts:164]

**不是 `ctx.commands` 的斜杠。** `/model` 是 `commandUi.register` 的 client contribution（`popupSelect`），本仓没有 `ctx.commands.register({ name: 'model' })`。 [E: packages/client/ui-model-selection/src/client/index.ts:127] contribution 与 host 命令撞名会抛。 [E: packages/client/ui-commands/src/client/service.ts:254]

slash 菜单渲染、`/` 输入状态机属于 `ui-commands` / 工作台（[surface.web.workbench](../web/workbench.md)），本页只接到「整行进 `execute`」。

## 关键字段

| 字段 / 符号 | 人怎么碰到 | 机器合同 |
|---|---|---|
| 行首 `/` | 必须从行首写 `/name`；前导空格、裸 `name`、`/` 单独、`/Goal`、`/goal/path` 都不是命令 | `parseCommand`：`^\/([a-z][a-z0-9_-]*)(?=$\|[\t\n\r ])`。对不上返回 `undefined`。 [E: packages/interaction/commands/src/index.ts:103] [E: packages/interaction/commands/tests/commands.spec.ts:50] |
| `register` 的 `name` | 菜单里显示 `/compact`，登记时写 `'compact'` | `COMMAND_NAME = /^[a-z][a-z0-9_-]*$/`；**不**带前导 `/`。带斜杠或大写过不了 `COMMAND_NAME.test`。 [E: packages/interaction/commands/src/index.ts:25] [E: packages/interaction/commands/src/index.ts:152] |
| `rawInput` | `/goal create the thing` 里名字后面的原文 | 含分隔空白，不做 trim。`/goal` → `''`；`/goal create the thing` → `' create the thing'`。 [E: packages/interaction/commands/tests/commands.spec.ts:42] [E: packages/interaction/commands/tests/commands.spec.ts:43] |
| `ScopedLayers` | 同一进程里，host 全局命令对每个会话可见；preset overlay 可以盖住同名 | `register` 用调用方 ctx 的 `scopeOf`：无 `kScope` 进 eager `global`；有标签进 overlay。`view(agent)` = `layers.merge(agent, …)`：先铺 global，再按祖先链 `set`，近层覆盖。 [E: packages/core/scope/src/index.ts:154] [E: packages/core/scope/src/store.ts:213] [E: packages/interaction/commands/src/index.ts:366] |
| 同层撞名 | 两个插件都想占 `/feedback` | 同一层 `NamedEntries.insert` 抛。global 诊断要求 per-agent 变体挂到 `agent.ctx`；scoped 层是 `already registered in this scope`。跨层允许阴影。 [E: packages/interaction/commands/src/index.ts:80] [E: packages/interaction/commands/tests/commands.spec.ts:123] [E: packages/interaction/commands/tests/commands.spec.ts:100] |
| `command/run` | 卡片出现「正在跑 `/name`」 | 命中后、handler **之前**写入。payload：`commandId` / `name` / 可选 `args` / `source: { kind: 'user' }`。`args` 就是 `rawInput`。 [E: packages/interaction/commands/src/types.ts:88] [E: packages/interaction/commands/src/index.ts:308] |
| `recordInput` | `/feedback` 的正文只该出现一次 | 缺省视为 true。`=== false` 时 `command/run` **省略** `args` 键；handler 仍收到完整 `rawInput`。 [E: packages/interaction/commands/src/index.ts:311] [E: packages/interaction/commands/tests/commands.spec.ts:355] [E: packages/feedback/command-feedback/src/index.ts:105] |
| `command/done` | 卡片结算文案 | 与 `command/run` 用同一 `commandId` 配对。`kind: 'success' \| 'error'`；success 可带 `sourceEventSeq`。 [E: packages/interaction/commands/src/types.ts:95] [E: packages/interaction/commands/src/index.ts:330] |
| admission miss | 打了不像命令的行，或 `/missing` | **不** mint id、**不**写 log。空闲 session 上 `execute('not a command')` / `execute('/missing')` 之后 `session.events` 仍是 `[]`。 [E: packages/interaction/commands/src/index.ts:303] [E: packages/interaction/commands/tests/commands.spec.ts:430] |
| `CommandId` | 把 run/done/RPC 回执对上 | 运行时 `cmd-${8 位 instanceToken}-${seq}`。品牌构造不校验。 [E: packages/interaction/commands/src/index.ts:343] [E: packages/interaction/commands/src/brand.ts:28] |
| `list` / `execute` vs `find` / `register` | 浏览器能发现和提交，拿不到 handler | 前两个带 `@Remote`；`find` 带着 handler，不是 Remote。 [E: packages/interaction/commands/src/index.ts:259] [E: packages/interaction/commands/src/index.ts:273] [E: packages/interaction/commands/src/index.ts:296] |

已经 abort 的 `signal` 在 `command/run` **之前**就抛，log 里不会留下半对。 [E: packages/interaction/commands/src/index.ts:306] handler 开始之后的 abort：已有 `command/run`，再补 `command/done { kind: 'error' }`。

## 装配与门控

**host 面挂一份注册表。** `dsh-base` 组合行 `id: commands` / `name: '@deepseek-ai/dsh-commands'`。这是进程级服务，preset **不** remount、**不** `isolate` `commands`。 [E: packages/bundle/base/cordis.patch.yml:250] [E: packages/bundle/base/cordis.patch.yml:251]

**`dsh-web-app` 不关注册表。** overlay 把 `id: plan-mode` / `id: command-compact` 标 `disabled: true`，并加 client `id: ui-commands`；`id: commands` / `command-feedback` / `command-goal` / `permission` 不在这条 overlay 的 disable 名单里。 [I] [E: packages/bundle/web-app/cordis.patch.yml:227] [E: packages/bundle/web-app/cordis.patch.yml:349] [E: packages/bundle/web-app/cordis.patch.yml:362] web 默认 `agent-presets.default: standard`。 [E: packages/bundle/web-app/cordis.patch.yml:424]

**agent-preset 面用 scope 加/减命令，不是第二份 `ctx.commands`。** `mountPreset` 拒绝 unscoped ctx。 [E: packages/preset/agent-presets/src/mount.ts:334] roster 把每个 Agent `bindScopeParent(agentKey, standing.key)`，standing 上登记的名字对该会话可见。 [E: packages/preset/agent-presets/src/index.ts:286]

本仓 `packages/**/src` 里调用 `commands.register({` 的 shipped 登记者（不是 T3 全量 catalog）：

| 人敲的 | `register` `name` | 谁登记 | 装配层 | 进不进 shipped preset |
|---|---|---|---|---|
| `/feedback` | `feedback` | `@deepseek-ai/dsh-command-feedback`（`inject: ['commands']`） | `dsh-base` `id: command-feedback`；web-app **不** disable | host 全局。四个 shipped preset 都看得到 |
| `/goal` | `goal` | `@deepseek-ai/dsh-command-goal`（`inject: ['commands', 'goals']`） | `dsh-base` `id: command-goal`；web-app **不** disable | host 全局。四个 preset 都看得到 |
| `/permission` | `permission` | `@deepseek-ai/dsh-permission-presets` 的 `inject(['commands'])` 子 fiber | `dsh-base` `id: permission`；web-app **不** disable | host 全局。四个 preset 都看得到 |
| `/export` | `export` | `@deepseek-ai/dsh-session-log-export`（`inject: ['commands']`） | **仅** `dsh-web-app` `id: session-log-download` | 不是 preset 行。默认 `dsh web` 有；headless 没有这条 |
| `/compact` | `compact` | `@deepseek-ai/dsh-command-compact`（`inject: ['commands', 'compaction']`） | base 挂 → web-app `disabled: true` → `standard` / `code` / `cordis` 在 `isolate.compaction` 组重挂 | **进**这三个 preset；**不进** `minimal`（没有 compaction 组） |
| `/plan` | `plan` | `@deepseek-ai/dsh-plan-mode` 的 `inject(['commands'])` 子 fiber | base 挂 → web-app `disabled: true` → `standard` / `code` / `cordis` 在 `isolate.planMode` 组重挂 | **进**这三个 preset；**不进** `minimal` |

登记点： [E: packages/feedback/command-feedback/src/index.ts:101] [E: packages/goal/command-goal/src/index.ts:164] [E: packages/interaction/permission-presets/src/index.ts:258] [E: packages/session-query/session-log-export/src/index.ts:20] [E: packages/compaction/command-compact/src/index.ts:100] [E: packages/plan/plan-mode/src/index.ts:270]

preset 重挂： [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:141] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:147] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:110] [E: apps/cli/config/agent-presets/code/agent.cordis.yml:154] [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:135]

`isolate.compaction` / `isolate.planMode` 隔离的是 **compaction / planMode 服务 realm**（`leakedServices` 用 `ctx.root[Context.isolate]` 判断有没有漏到 root 符号），不是再 publish 一份 `ctx.commands`。 [E: packages/preset/agent-presets/src/mount.ts:191] [E: packages/preset/agent-presets/src/mount.ts:200] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:141]

换 `minimal`：该 preset 的 `agent.cordis.yml` 没有 `command-compact` / `plan-mode` 行，有效视图里就没有这两个名字；host 上的 `/feedback` `/goal` `/permission` 以及 web 的 `/export` 仍在。 [I]

**handler 自己的门。** `/compact` 拒绝任何非空 `rawInput.trim()`（`Usage: /compact (no arguments)`）。 [E: packages/compaction/command-compact/src/index.ts:62] 在 Web composer 里带尾巴的 `/compact …` 根本不会进 `execute`（掉进 prompt）；直接打 RPC 才会撞到这条 usage。`/export` 同样拒绝 path。 [E: packages/session-query/session-log-export/src/index.ts:22]

## 跨包关系

- [spine.turn-and-step](../../spine/turn-and-step.md)：inbox 何时变成 `user/message`、loop 何时 `deriveMessages()`。人命令不走这条；空闲 log 上只有 `command/run` + `command/done`。
- [subsys.interaction.commands](../../subsystems/interaction/commands.md)：注册表控制流、`commands/change` emit、`commands-invariant` 配对。本页是人敲 `/name` 的产品面，不复述那页的步骤表。
- [surface.tools.ask-user-question](../tools/ask-user-question.md)：模型暂停等答案的工具，不是 slash command。
- [surface.web.workbench](../web/workbench.md)：`/` 输入、slash 菜单、命令卡片所在的 Web 工作台。

`/compact` 调 `ctx.compaction.compactNow`；`/feedback` 只追加 log-only `feedback/record`，不启动模型；`/permission` 写 sandbox + approval 两个旋钮；`/goal` 与 `create_goal` 工具共用 `ctx.goals`；`/plan` 写 plan-mode 选择，真正翻面等到下一个被接受的 `agent/pre-step`。各条命令的领域语义在对应 T2，本页只钉「谁登记、哪一层看得见」。

## Sources

- packages/interaction/commands/src/index.ts
- packages/interaction/commands/src/types.ts
- packages/interaction/commands/src/brand.ts
- packages/interaction/commands/package.json
- packages/interaction/commands/tests/commands.spec.ts
- packages/core/scope/src/store.ts
- packages/core/scope/src/index.ts
- packages/core/session/src/types.ts
- packages/core/session/src/surface.ts
- packages/typert/protocol/src/index.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/web-app/cordis.patch.yml
- packages/boot/app-boot/src/profile.ts
- packages/preset/agent-presets/src/index.ts
- packages/preset/agent-presets/src/mount.ts
- apps/cli/config/agent-presets/standard/agent.cordis.yml
- apps/cli/config/agent-presets/code/agent.cordis.yml
- apps/cli/config/agent-presets/cordis/agent.cordis.yml
- apps/cli/config/agent-presets/minimal/agent.cordis.yml
- packages/compaction/command-compact/src/index.ts
- packages/compaction/command-compact/package.json
- packages/compaction/command-compact/tests/command-compact.spec.ts
- packages/feedback/command-feedback/src/index.ts
- packages/feedback/command-feedback/package.json
- packages/goal/command-goal/src/index.ts
- packages/goal/command-goal/package.json
- packages/interaction/permission-presets/src/index.ts
- packages/interaction/permission-presets/package.json
- packages/plan/plan-mode/src/index.ts
- packages/plan/plan-mode/package.json
- packages/session-query/session-log-export/src/index.ts
- packages/session-query/session-log-export/package.json
- packages/client/ui-commands/src/client/service.ts
- packages/client/ui-commands/package.json
- packages/client/runtime/src/client/sessions/session.ts
- packages/client/ui-conversation/tests/input-scenarios.client.spec.tsx
- packages/client/ui-model-selection/src/client/index.ts
- packages/client/ui-permission-presets/src/client/index.ts

## 相关

- [spine.turn-and-step](../../spine/turn-and-step.md)：turn / step 与 `deriveMessages()`。人命令不进这条。
- [subsys.interaction.commands](../../subsystems/interaction/commands.md)：`ctx.commands` 注册表子系统。
- [surface.tools.ask-user-question](../tools/ask-user-question.md)：`ask_user_question` 模型工具。
- [surface.web.workbench](../web/workbench.md)：Web 工作台可见面。
