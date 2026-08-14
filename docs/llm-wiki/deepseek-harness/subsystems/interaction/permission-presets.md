---
id: subsys.interaction.permission-presets
title: permission presets
kind: subsystem
tier: T2
pkg: interaction
source:
  - packages/interaction/permission-presets/src/index.ts
  - packages/interaction/permission-presets/src/types.ts
  - packages/interaction/permission-presets/src/client.ts
  - packages/interaction/permission-presets/src/invariant.ts
  - packages/interaction/permission-presets/tests/permission-presets.spec.ts
  - packages/interaction/permission-presets/tests/projection.spec.ts
  - packages/interaction/permission-presets/tests/invariant.spec.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/web-app/cordis.patch.yml
  - packages/sandbox/sandbox-policy/src/session-mode.ts
  - packages/interaction/user-approval/src/index.ts
  - packages/core/session/src/surface.ts
  - packages/core/session/src/known-event-types.ts
  - packages/settings/settings/src/index.ts
  - packages/shell/shell/src/index.ts
  - packages/shell/bash-sandbox/src/index.ts
  - packages/subagent/subagent/src/child-agent.ts
  - packages/host/apiproxy/src/api-proxy.ts
symbols:
  - ctx.permissionPresets
  - PermissionPresetService
  - CUSTOM_PRESET
  - permission/preset
related:
  - spine.trace-tool-approval
  - spine.overview
  - spine.session-log
  - subsys.interaction.approval
  - subsys.execution.sandbox-policy
  - subsys.interaction.commands
  - subsys.persistence.settings
  - subsys.persistence.projection
  - subsys.composition.bundle-base
evidence: explicit
status: verified
updated: 47f943859b
---

> `ctx.permissionPresets`（`PermissionPresetService`）是 **host 面**产品开关：一张 preset 表把用户选择折成两个独立旋钮（`sandbox` mode + `approval` policy）。切换先记 log-only 的 `permission/preset`，再走各旋钮的 **canonical setter**。执行、runtime-context 文案、replay **只读旋钮 fold**，不读 preset 名；两档旋钮对相同时，靠 preset 事件保住用户点过哪一项。

## 能回答的问题

- preset 名和 `sandbox/mode` / `approval/policy` 谁才是执行真相？为什么两档同 bundle 还要记 `permission/preset`？
- 裸 plugin 默认表有几档？`dsh-base` 真树三档分别捆哪对旋钮？`DSH_PERMISSION_MODE` 写的是 preset 名还是旋钮？
- `CUSTOM_PRESET` 什么时候出现？能当 `/permission` 目标或事件 payload 吗？
- `set()` 和 `/permission` 写 approval 旋钮时差在哪？新会话 pin 为什么走 `setApprovalPolicy` 而不是 `setPolicy`？
- Settings ns `permission` 改的是当前会话还是以后新建的会话？seed / 空 resume 会不会吃最新 default？
- `permissions` projection 和 `/permission` 命令各自在什么组合下才挂上？

## 职责边界

本包 `@deepseek-ai/dsh-permission-presets` 拥有：`ctx.permissionPresets` 键、preset 表与 `defaultPreset`、log-only 事件 `permission/preset`、纯 fold `effectivePermissionPreset` / `applyKnobEvent` / `derive`、写路径 `set` / `apply`、新会话 `pinInitialPermission`、Settings ns `permission`、以及两个可选 child（`permissions` projection、`/permission` 命令）。

本包**不**拥有：

- `approval/request` waterfall、`ask | never` 在 `decide()` 里的分叉、`allowed-once` grant —— [`subsys.interaction.approval`](./approval.md)。
- `sandboxPolicy.resolve`、围栏 / `confine`、升权 grant —— [`subsys.execution.sandbox-policy`](../execution/sandbox-policy.md)。升权盖一次 call，不改 standing 旋钮。
- `ctx.commands` 注册表本身、slash 菜单渲染 —— [`subsys.interaction.commands`](./commands.md)。本页只点 `/permission` 这一条 Consumer。
- `ctx.sessionProjections` 注册表与 cache —— [`subsys.persistence.projection`](../persistence/projection.md)。本页只点 `permissions` 这一把 unit。
- Settings 分层 / 热发布 —— [`subsys.persistence.settings`](../persistence/settings.md)。本页只点 ns `permission`。
- 浏览器半边 picker（`dsh-web-app` 的 `id: ui-permission`）。它提交同一条 `/permission` 行，本页不写组件。

DSH 是 Cordis 组合运行时（`profile → bundle → agent preset`）。`PermissionPresetService` 是 **host 面**进程级服务，preset **不**重挂 approval / sandbox-policy / permission。默认产品路径是本地 Web GUI（`dsh web`），本仓没有 shipped TUI。人命令不经模型 turn。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/interaction/permission-presets/src/index.ts` | `PermissionPresetService`、`CUSTOM_PRESET`、`set` / `apply` / `pinInitialPermission`、projection 与 `/permission` child |
| `packages/interaction/permission-presets/src/types.ts` | `PresetOption` / `PermissionSelect`；`SessionProjectionMap.permissions` 的唯一声明 |
| `packages/interaction/permission-presets/src/client.ts` | 浏览器半边只 re-export `./types`（零重复） |
| `packages/interaction/permission-presets/src/invariant.ts` | companion：`permission/preset` 必须能在活表里 `resolve` |
| `packages/interaction/permission-presets/tests/permission-presets.spec.ts` | 表序、`custom`、tie-break、`set` 三事件、pin / settings / seed |
| `packages/interaction/permission-presets/tests/projection.spec.ts` | `permissions` 整值、`/permission` 开关与裸调用 |
| `packages/interaction/permission-presets/tests/invariant.spec.ts` | 未知 preset 拒读；无关事件放过 |
| `packages/bundle/base/cordis.patch.yml` | host 真树：`id: permission` 三档表；旁边的 `sandbox-policy` / `approval` 旋钮默认 |
| `packages/bundle/web-app/cordis.patch.yml` | `id: ui-permission`（client Consumer；不重挂服务） |
| `packages/sandbox/sandbox-policy/src/session-mode.ts` | sandbox 旋钮 fold / `setSandboxMode` |
| `packages/interaction/user-approval/src/index.ts` | approval 旋钮 fold / `setApprovalPolicy` / live `setPolicy` |
| `packages/settings/settings/src/index.ts` | `settingsNamespace` / `installSettingsSection` |
| `packages/subagent/subagent/src/child-agent.ts` | 委派只复制旋钮（approval 钉 `never`），不写 `permission/preset` |

## 数据模型

| 符号 | 要点 |
|---|---|
| `ctx.permissionPresets` | Cordis `Context` 扩增键。构造 `super(ctx, 'permissionPresets')`。 [E: packages/interaction/permission-presets/src/index.ts:38] [E: packages/interaction/permission-presets/src/index.ts:186] |
| `PresetSpec` | `{ sandbox, approval, name?, description? }`。旋钮取值分别来自 `SANDBOX_MODES` 与 `APPROVAL_POLICIES`。 [E: packages/interaction/permission-presets/src/index.ts:55] [E: packages/interaction/permission-presets/src/index.ts:163] [E: packages/interaction/permission-presets/src/index.ts:164] |
| `Config.presets` | `Record<string, PresetSpec>`。**schema 默认只有两档**：`workspace-write`（`workspace-write` + `ask`）与 `danger-full-access`（`danger-full-access` + `never`），并带 name / description。 [E: packages/interaction/permission-presets/src/index.ts:167] [E: packages/interaction/permission-presets/src/index.ts:168] [E: packages/interaction/permission-presets/src/index.ts:172] |
| `Config.defaultPreset` | 新会话默认。省略则 `derive(EMPTY_KNOBS)`：用组合好的 `ctx.shell.sandboxMode` + `ctx.approval.config.policy ?? 'ask'` 去对表。对不上 → 构造失败，必须显式写。 [E: packages/interaction/permission-presets/src/index.ts:195] [E: packages/interaction/permission-presets/src/index.ts:196] [E: packages/interaction/permission-presets/src/index.ts:198] |
| `CUSTOM_PRESET` | 字面量 `'custom'`。旋钮对不上任何表项时的**派生状态**，不是表键。 [E: packages/interaction/permission-presets/src/index.ts:70] |
| `permission/preset` | `{ preset: string }`。log-only；不在 `SURFACE_EVENT_TYPES`，没有 `surfaceOp`，不进 `deriveMessages()`。 [E: packages/interaction/permission-presets/src/index.ts:50] [E: packages/core/session/src/surface.ts:16] [E: packages/core/session/src/known-event-types.ts:39] |
| `KnobState` | `{ preset, sandbox, approval }`，各键 `null` 表示还没有 override、view 时用组合默认。 [E: packages/interaction/permission-presets/src/index.ts:94] [E: packages/interaction/permission-presets/src/index.ts:104] |
| `PermissionSelect` | `{ options, currentValue }`。`options` 按表声明序；`custom` **只在当前就是 custom 时**追加。 [E: packages/interaction/permission-presets/src/types.ts:27] [E: packages/interaction/permission-presets/src/index.ts:334] |
| `SessionProjectionMap.permissions` | 读侧整值。键缺失 = 没组合这份服务，client 应藏控件。 [E: packages/interaction/permission-presets/src/types.ts:42] |
| `PermissionSettings` | `{ defaultPreset }`。Settings ns 由 `settingsNamespace('permission')` 品牌化。 [E: packages/interaction/permission-presets/src/index.ts:134] [E: packages/interaction/permission-presets/src/index.ts:73] |
| `static inject` | 必挂 `['shell', 'approval', 'sessions']`。projection / commands 走可选 `ctx.inject`。 [E: packages/interaction/permission-presets/src/index.ts:180] |

两套表必须分开写：

1. **类型 / 裸 plugin**：测试 `plugin(PermissionPresetService, {})` 得到 `names === ['workspace-write', 'danger-full-access']`。 [E: packages/interaction/permission-presets/tests/permission-presets.spec.ts:83]
2. **shipped `dsh-base`**：`id: permission` 覆写整张表为三档，**没有** schema 默认那两段英文 description。 [E: packages/bundle/base/cordis.patch.yml:193] [E: packages/bundle/base/cordis.patch.yml:194] [E: packages/bundle/base/cordis.patch.yml:197] [E: packages/bundle/base/cordis.patch.yml:200] [E: packages/bundle/base/cordis.patch.yml:203]

| shipped 档 | sandbox | approval |
|---|---|---|
| `read-only` | `read-only` | `ask` [E: packages/bundle/base/cordis.patch.yml:198] [E: packages/bundle/base/cordis.patch.yml:199] |
| `workspace-write` | `workspace-write` | `ask` [E: packages/bundle/base/cordis.patch.yml:201] [E: packages/bundle/base/cordis.patch.yml:202] |
| `danger-full-access` | `danger-full-access` | `never` [E: packages/bundle/base/cordis.patch.yml:204] [E: packages/bundle/base/cordis.patch.yml:205] |

`DSH_PERMISSION_MODE` **不是**第四套 preset API。`id: sandbox-policy` 把它写成 mode（缺省 `'workspace-write'`）；`id: approval` 仅当它 `=== 'danger-full-access'` 才把 policy 写成 `'never'`，否则 `'ask'`。permission 行不读这个环境变量：新会话默认靠旋钮对表推断。 [E: packages/bundle/base/cordis.patch.yml:175] [E: packages/bundle/base/cordis.patch.yml:191]

## 控制流

1. **host 面挂开关，不重挂旋钮。** `dsh-base` 在 `id: sandbox-policy` 与 `id: approval` 之后插入 `id: permission` = `@deepseek-ai/dsh-permission-presets`。`dsh-web-app` / `dsh-headless` 不另写这一行；web 只加 client `id: ui-permission`。agent-preset 不 remount。 [E: packages/bundle/base/cordis.patch.yml:172] [E: packages/bundle/base/cordis.patch.yml:188] [E: packages/bundle/base/cordis.patch.yml:193] [E: packages/bundle/web-app/cordis.patch.yml:253] [E: packages/bundle/web-app/cordis.patch.yml:254]

2. **`PermissionPresetService`@packages/interaction/permission-presets/src/index.ts 占 `ctx.permissionPresets`。** schema 填完表后，`custom` 若出现在表键上立刻抛 reserved。 [E: packages/interaction/permission-presets/src/index.ts:189] [E: packages/interaction/permission-presets/src/index.ts:190] `ctx.shell.sandboxMode === undefined`（基类 `ShellExecutor` 默认就是 `undefined`）视为未围栏，抛 misconfiguration——preset 必须能写出一个 sandbox mode。 [E: packages/interaction/permission-presets/src/index.ts:192] [E: packages/shell/shell/src/index.ts:75] shipped POSIX 执行器 `SandboxBashExecutor` 覆盖 getter，返回构造时抄下的 `ctx.sandboxPolicy.defaultMode`。 [E: packages/shell/bash-sandbox/src/index.ts:75] 推断出的 default 若是 `custom`，要求调用方显式 `defaultPreset`。 [E: packages/interaction/permission-presets/src/index.ts:198] [E: packages/interaction/permission-presets/tests/permission-presets.spec.ts:183]

3. **Settings ns `permission` 只服务「以后的会话」。** `installSettingsSection(ctx, PERMISSION_SETTINGS_NAMESPACE, …)` 把 `baseSettings = { defaultPreset }` 当 composition entry；`setSource` 换成 `scope.get()` thunk，`onChange` 是空函数——不重挂任何进程级路由，下次 `session/created` 再读 thunk。 [E: packages/interaction/permission-presets/src/index.ts:211] [E: packages/interaction/permission-presets/src/index.ts:212] [E: packages/interaction/permission-presets/src/index.ts:217] [E: packages/settings/settings/src/index.ts:863] 无 settings Provider 时 `defaultPreset` getter 退回 entry。表外值 `update` 被 schema 拒，活默认不变。 [E: packages/interaction/permission-presets/tests/permission-presets.spec.ts:298] [E: packages/interaction/permission-presets/tests/permission-presets.spec.ts:299] Web 白名单含 `'permission'`，否则 ApiProxy 答 `settings-not-exposed`。 [E: packages/host/apiproxy/src/api-proxy.ts:127]

4. **`pinInitialPermission` 钉在 `session/created`，并扫已存活 session。** 构造里 `ctx.on('session/created', …)`，再 `for (const session of ctx.sessions.list())` 补钉（HMR / 晚挂）。 [E: packages/interaction/permission-presets/src/index.ts:220] [E: packages/interaction/permission-presets/src/index.ts:224] 测试：先 `create` 再 `plugin` 这份服务，已有空会话补上三条事实。 [E: packages/interaction/permission-presets/tests/permission-presets.spec.ts:258]

5. **全新会话走用户当前 default，一次写满三件。** `pinInitialPermission`@packages/interaction/permission-presets/src/index.ts：log 里既没有 `permission/preset`、也没有 sandbox / approval override、且没有 `session/end-seed` 时，取 `this.defaultPreset`，`append('permission/preset')`，再 `setSandboxMode` + `setApprovalPolicy`（初始化没有「上一次模型可见政策」，不走 `setPolicy`）。 [E: packages/interaction/permission-presets/src/index.ts:406] [E: packages/interaction/permission-presets/src/index.ts:409] [E: packages/interaction/permission-presets/src/index.ts:410] [E: packages/interaction/permission-presets/src/index.ts:411] 测试钉死 pin 出的三条事件是 `workspace-write` / `workspace-write` / `ask`；改 settings 后再 `create` 只影响第二条会话。 [E: packages/interaction/permission-presets/tests/permission-presets.spec.ts:200] [E: packages/interaction/permission-presets/tests/permission-presets.spec.ts:210] [E: packages/interaction/permission-presets/tests/permission-presets.spec.ts:211]

6. **seed / 半初始化会话只补缺，不套最新用户 default。** 有 `session/end-seed`、或已经有任一旋钮 / preset 事件：用 fold 出的 `KnobState` 调 `derive`。缺 preset 且对得上表 → 补 `permission/preset`；缺 sandbox → `setSandboxMode(session, ctx.shell.sandboxMode)`；缺 approval → `setApprovalPolicy(session, ctx.approval.config.policy ?? 'ask')`。 [E: packages/interaction/permission-presets/src/index.ts:421] [E: packages/interaction/permission-presets/src/index.ts:422] [E: packages/interaction/permission-presets/src/index.ts:425] [E: packages/interaction/permission-presets/src/index.ts:428] 空 seed（`seed: []`，带 `session/end-seed`）即使 settings 已改成 `danger-full-access`，仍按组合默认钉 `workspace-write`。 [E: packages/interaction/permission-presets/tests/permission-presets.spec.ts:238] [E: packages/interaction/permission-presets/tests/permission-presets.spec.ts:239] 对不上表的 seeded 组合保持 `custom`，**不**补 preset 事件。 [E: packages/interaction/permission-presets/tests/permission-presets.spec.ts:279] [E: packages/interaction/permission-presets/tests/permission-presets.spec.ts:280]

7. **`set`@packages/interaction/permission-presets/src/index.ts 是无 agent 的写路径。** `set(session, name)` → `apply(session, name, (policy) => setApprovalPolicy(session, policy))`。 [E: packages/interaction/permission-presets/src/index.ts:375] [E: packages/interaction/permission-presets/src/index.ts:376] `apply` 先 `resolve(name)`（未知名抛；`custom` 也抛）。`current(events) !== name` 才 `append('permission/preset', { preset: name })`。然后只在旋钮与 fold（否则组合默认）不同时调用 `setSandboxMode` / 传入的 approval writer。 [E: packages/interaction/permission-presets/src/index.ts:381] [E: packages/interaction/permission-presets/src/index.ts:382] [E: packages/interaction/permission-presets/src/index.ts:383] [E: packages/interaction/permission-presets/src/index.ts:387] [E: packages/interaction/permission-presets/src/index.ts:390] 从组合默认切到 `danger-full-access` 正好三条：preset + `sandbox/mode` + `approval/policy`。 [E: packages/interaction/permission-presets/tests/permission-presets.spec.ts:133] [E: packages/interaction/permission-presets/tests/permission-presets.spec.ts:134] 点已经生效的档是 no-op，log 长度不变。 [E: packages/interaction/permission-presets/tests/permission-presets.spec.ts:144]

8. **`/permission` 是 live 写路径，approval 走 `setPolicy`。** `ctx.inject(['commands'], …)` 在 `dsh-base` 已挂 `id: commands` 时注册 `name: 'permission'`。 [E: packages/interaction/permission-presets/src/index.ts:257] [E: packages/interaction/permission-presets/src/index.ts:259] [E: packages/bundle/base/cordis.patch.yml:250] 空输入只报 `current preset … (available: …)`，不再 append。 [E: packages/interaction/permission-presets/src/index.ts:268] 不在 `this.names` 里 → `{ kind: 'error' }`，除 `command/run` / `command/done` 外 log 不动。 [E: packages/interaction/permission-presets/src/index.ts:271] [E: packages/interaction/permission-presets/tests/projection.spec.ts:128] 合法名调用 `apply(…, (policy) => this.ctx.approval.setPolicy(agent, policy))`。 [E: packages/interaction/permission-presets/src/index.ts:273] `ApprovalService.setPolicy` 在政策真变时才 `setApprovalPolicy`，并 `agent.inject` 一条 plugin 源 user 消息（`The approval policy changed from "…" to "…" (changed by the user).`）。 [E: packages/interaction/user-approval/src/index.ts:226] [E: packages/interaction/user-approval/src/index.ts:229] [E: packages/interaction/user-approval/src/index.ts:230] 测试：`/permission danger-full-access` 成功文案是 `preset danger-full-access`，并看到这条 inject。 [E: packages/interaction/permission-presets/tests/projection.spec.ts:94] [E: packages/interaction/permission-presets/tests/projection.spec.ts:99] 人命令不经模型 turn（[`subsys.interaction.commands`](./commands.md)）。

9. **读侧 `permissions` projection 是可选 child。** `ctx.inject(['sessionProjections'], …)` 登记 `key: 'permissions'`，`stateVersion: 1`，`init` = `EMPTY_KNOBS`，`apply` = `applyKnobEvent`，`view` = `selectFor`。 [E: packages/interaction/permission-presets/src/index.ts:243] [E: packages/interaction/permission-presets/src/index.ts:245] [E: packages/interaction/permission-presets/src/index.ts:250] `applyKnobEvent` 只认三种 type；其它事件返回同一引用，registry 的 change gate 不通知。 [E: packages/interaction/permission-presets/src/index.ts:115] [E: packages/interaction/permission-presets/src/index.ts:122] [E: packages/interaction/permission-presets/tests/projection.spec.ts:68] `dsh-base` 有 `id: session-projection`，所以 shipped 产品树会出这个键；没有 registry 的装配不受影响。卸掉 permission 服务后键消失。 [E: packages/bundle/base/cordis.patch.yml:126] [E: packages/interaction/permission-presets/tests/projection.spec.ts:85]

10. **`derive`@packages/interaction/permission-presets/src/index.ts 是 current / view 的同一套数学。** 有效 sandbox = `state.sandbox ?? ctx.shell.sandboxMode`；有效 approval = `state.approval ?? ctx.approval.config.policy ?? 'ask'`。若 `state.preset` 仍在表里且旋钮对得上，**沿用该选择**（同 bundle 的平局）。否则按 `Object.entries` 表序找第一档命中；都没有 → `CUSTOM_PRESET`。 [E: packages/interaction/permission-presets/src/index.ts:310] [E: packages/interaction/permission-presets/src/index.ts:311] [E: packages/interaction/permission-presets/src/index.ts:315] [E: packages/interaction/permission-presets/src/index.ts:318] [E: packages/interaction/permission-presets/src/index.ts:320] 测试：两档都是 `workspace-write`+`ask` 时 `set('agentish')` 后 `current` 仍是 `agentish`；旋钮漂到 `danger-full-access`+`never` 后回落到表序第一档命中。 [E: packages/interaction/permission-presets/tests/permission-presets.spec.ts:123] [E: packages/interaction/permission-presets/tests/permission-presets.spec.ts:126]

11. **执行 / prompt / replay 读旋钮 fold，不读 preset 名。** sandbox：`effectiveSandboxMode` 从后往前取最后一条 `sandbox/mode`；`SandboxPolicyService.resolve` / `overrideOf` 用这份 fold（再被一次性 grant 盖过）。 [E: packages/sandbox/sandbox-policy/src/session-mode.ts:55] [E: packages/sandbox/sandbox-policy/src/index.ts:136] [E: packages/sandbox/sandbox-policy/src/index.ts:150] approval：`effectiveApprovalPolicy` 同样取最后一条 `approval/policy`；`ApprovalService` 的 live 政策是 `overrideOf ?? config.policy ?? 'ask'`；`'never'` 在进 `approval/request` waterfall **之前**就返回 `'rejected'`。 [E: packages/interaction/user-approval/src/index.ts:115] [E: packages/interaction/user-approval/src/index.ts:286] [E: packages/interaction/user-approval/src/index.ts:312] 模型若看见档位，来源是 `sandbox:policy` / `approval:policy` runtime-context（以及 live `setPolicy` 注入的那条 user 消息），不是 `permission/preset` 事件。完整 ask 时序在 [`spine.trace-tool-approval`](../../spine/trace-tool-approval.md)。

12. **`CUSTOM_PRESET` 可展示，不能当目标。** `optionOf('custom')` 返回固定英文文案；`selectFor` 只在 `derive === 'custom'` 时把它 append 到 options 尾。 [E: packages/interaction/permission-presets/src/index.ts:362] [E: packages/interaction/permission-presets/src/index.ts:334] `resolve('custom')` / `set(..., 'custom')` 抛 `unknown preset`。 [E: packages/interaction/permission-presets/tests/permission-presets.spec.ts:103] `/permission custom` 走 `names.includes` 失败，与其它未知名相同。从 custom 再点回一档真 preset：重新记录 `permission/preset`，并只修漂了的那只旋钮。 [E: packages/interaction/permission-presets/tests/permission-presets.spec.ts:157]

13. **companion 校验表内名字，默认产品树不跑。** `validateEvent` 在 `permission/preset` 且 `!ctx.permissionPresets.names.includes(preset)` 时 `fail`。 [E: packages/interaction/permission-presets/src/invariant.ts:16] 测试钉死 `'missing'` 抛 / 未知 seed 在晚挂 companion 时拒。 [E: packages/interaction/permission-presets/tests/invariant.spec.ts:41] `dsh-base` **没有** `id: invariants` 行；默认 `dsh web` 不提供 `ctx.invariants`，这份 companion 停在 `inject: ['invariants']`。细节在 [`subsys.core.invariants`](../core/invariants.md)。

## 设计动机

产品只想给用户一个 Permissions 选择器，但执行面早已拆成两个独立 fold：文件副作用档（`sandbox/mode`）和审批政策（`approval/policy`）。把选择器做成第三份可变状态会让 bash / fs / approval 各读各的。所以 preset 是**写放大**：一次选择变成「一条意图事件 + 两次 canonical setter」。读路径维持原 fold，换执行器、换 replay、换 runtime-context 投影都不必认识 preset 名。

`permission/preset` 单独存在，是因为两档可以捆同一对旋钮（测试里的 `workspace-write` 与 `agentish`）。只看旋钮会丢掉「用户点的是哪一项」；执行仍然正确，UI 的 current 标记会跳回表序第一档。

schema 默认两档、产品树再插入 `read-only`，和 sandbox-policy「schema fail-safe `read-only`、产品覆写成 `workspace-write`」是同一手法的另一面：裸 `plugin(Service, {})` 不能悄悄冒充 shipped 表。`DSH_PERMISSION_MODE` 只拧旁边两个旋钮的组合默认，让推断出来的 default 落到三档之一。

新会话 pin 用 `setApprovalPolicy` 而 live `/permission` 用 `setPolicy`，是为了避免在「还没有对模型说过旧政策」时注入一条虚假的 changed-by-the-user 消息。Settings 只改未来会话，避免热改 default 改写已经 pin 过的 log。

相对 Claude / Codex：它们把 permission mode 当成运行时一等状态；DSH 把用户可见档位折叠回已经存在的两只旋钮，执行层继续只认 fold。

## Gotcha

- **schema 默认表 ≠ shipped 表。** 只读 `static Config` 会以为产品没有 `read-only`，并且带着那两段英文 description。`dsh-base` 覆写后是三档键、无 description。 [E: packages/interaction/permission-presets/src/index.ts:167] [E: packages/bundle/base/cordis.patch.yml:197]
- **`custom` 不是档。** 不能进表、不能当 `defaultPreset`、不能当 `set` / `/permission` 目标、不能当 `permission/preset` payload。只出现在 `currentValue` 与当前 options 尾。 [E: packages/interaction/permission-presets/src/index.ts:70] [E: packages/interaction/permission-presets/src/index.ts:189]
- **点当前档不写 log。** `current === name` 时连 `permission/preset` 都不 append。从 custom 漂回来才重新记录选择。 [E: packages/interaction/permission-presets/src/index.ts:382] [E: packages/interaction/permission-presets/tests/permission-presets.spec.ts:144]
- **执行不看 preset 名。** 工具 / 围栏 / `ApprovalService.request` 读的是 `sandbox/mode` 与 `approval/policy` 的最后一条。preset 事件只服务 UI、tie-break、以及「用户意图」的耐久记录。
- **`set` ≠ `/permission`。** `set` 静默 `setApprovalPolicy`。命令走 `setPolicy`，政策变化会进 inbox 一条 user 消息。pin / seed 补洞也走静默路径。 [E: packages/interaction/permission-presets/src/index.ts:376] [E: packages/interaction/permission-presets/src/index.ts:273]
- **`permission/preset` 不是 surface。** `SURFACE_EVENT_TYPES` 只有三类消息事件。replay 模型历史看不见这条；看见的是旋钮投影出的 runtime-context。 [E: packages/core/session/src/surface.ts:16]
- **改 Settings `defaultPreset` 不回写旧会话。** 已 pin 的 log 保持原档；只有之后 `create` 的会话吃新 default。空 seed / 带历史的 resume 走「补缺」支路，也不吃最新用户 default。 [E: packages/interaction/permission-presets/tests/permission-presets.spec.ts:210] [E: packages/interaction/permission-presets/tests/permission-presets.spec.ts:226]
- **委派子会话常常变成 `custom`。** `appendDelegatedPolicyOverrides` 只写 `sandbox/mode`（父级显式 override）和 `approval/policy: never`（只要组合了 approval），**不**写 `permission/preset`。`workspace-write`+`never` 对不上 shipped 三档。执行仍按那两只旋钮：子代理 ask 在 waterfall 前就被 `never` 拒。 [E: packages/subagent/subagent/src/child-agent.ts:202] [E: packages/subagent/subagent/src/child-agent.ts:220] [E: packages/subagent/subagent/src/child-agent.ts:223]
- **未围栏的 `ctx.shell` 不能挂这份服务。** `sandboxMode === undefined` 在 load 时失败，不是运行期再降级。 [E: packages/interaction/permission-presets/tests/permission-presets.spec.ts:164]
- **升权 grant 不改 preset。** `resolve({ mode })` / tool 层盖章只活在这一次 call。standing 旋钮与 `permission/preset` 都不动。见 [`subsys.execution.sandbox-policy`](../execution/sandbox-policy.md)。
- **live PTY 可以挡住 sandbox 旋钮切换。** `setSandboxMode` 仍会 append；`terminal-bash` 在 owner 仍活跃时拒切换。见 [`subsys.execution.terminal`](../execution/terminal.md)。
- **默认 `dsh web` 不跑 preset invariant。** 不要把 `./invariant` 出口读成产品树已经在校验未知 `permission/preset`。

## Seam 三角

| 角色 | 包 | ctx 键 / 合同 | bundle / preset 行 |
|---|---|---|---|
| Definition | `@deepseek-ai/dsh-permission-presets`（`types.ts` + 服务类） | `ctx.permissionPresets`；`SessionEventMap['permission/preset']`；`SessionProjectionMap.permissions` | 无 preset 行；`./client` 只投影类型 |
| Provider | `PermissionPresetService` | `set` / `current` / `pinInitialPermission`；必 `inject` `shell`+`approval`+`sessions` | **host** `dsh-base` `id: permission`。不重挂 `approval` / `sandbox-policy` |
| 旋钮 writer | `setSandboxMode`、`setApprovalPolicy` / `ApprovalService.setPolicy` | 各旋钮自己的 log-only 事件 | 同 host 的 `id: sandbox-policy`、`id: approval` |
| 读侧 child | `permissions` unit | `sessionProjections.register`；`applyKnobEvent` + `selectFor` | 有 `id: session-projection` 才激活（base 有） |
| 写侧 child | `/permission` | `commands.register({ name: 'permission' })` | 有 `id: commands` 才激活（base 有） |
| Settings | `installSettingsSection` | ns `permission`，字段 `defaultPreset` | base `id: settings`；wire 白名单含该 ns |
| Client Consumer | `@deepseek-ai/dsh-client-ui-permission-presets` | 读 `permissions` 投影，提交 `/permission <preset>` | **只** `dsh-web-app` `id: ui-permission` |
| 执行 Consumer | fs/bash/pwsh/terminal + `ApprovalService.request` | 读旋钮 fold，不读 preset 名 | host 执行器；preset 面工具是再下一层 Consumer |

换产品档位表 = 改 `id: permission` 的 `config.presets`（或 `defaultPreset`），不要改 `tool-bash` / `tool-fs`。换围栏或审批实现，只要还导出同一对 setter / fold，这份开关不用动。

## Sources

- packages/interaction/permission-presets/src/index.ts
- packages/interaction/permission-presets/src/types.ts
- packages/interaction/permission-presets/src/client.ts
- packages/interaction/permission-presets/src/invariant.ts
- packages/interaction/permission-presets/tests/permission-presets.spec.ts
- packages/interaction/permission-presets/tests/projection.spec.ts
- packages/interaction/permission-presets/tests/invariant.spec.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/web-app/cordis.patch.yml
- packages/sandbox/sandbox-policy/src/session-mode.ts
- packages/interaction/user-approval/src/index.ts
- packages/core/session/src/surface.ts
- packages/core/session/src/known-event-types.ts
- packages/settings/settings/src/index.ts
- packages/shell/shell/src/index.ts
- packages/shell/bash-sandbox/src/index.ts
- packages/subagent/subagent/src/child-agent.ts
- packages/host/apiproxy/src/api-proxy.ts

## 相关

- [spine.trace-tool-approval](../../spine/trace-tool-approval.md)：`ask | never`、`allowed-once`、升权与 `write` 的端到端时序。preset 只拧政策旋钮，不替代这条链。
- [spine.overview](../../spine/overview.md)：`profile → bundle → preset`；host 面 vs agent-preset 面。
- [spine.session-log](../../spine/session-log.md)：append-only log 与 `deriveMessages()`；`permission/preset` 不进 surface。
- [subsys.interaction.approval](./approval.md)：`ctx.approval`、waterfall、`setPolicy` 注入的模型可见通知。
- [subsys.execution.sandbox-policy](../execution/sandbox-policy.md)：`setSandboxMode` / `resolve`；本页是 shipped 写手之一。
- [subsys.interaction.commands](./commands.md)：`ctx.commands`；`/permission` 是一条 Consumer。
- [subsys.persistence.settings](../persistence/settings.md)：`installSettingsSection` 与 ns 分层。
- [subsys.persistence.projection](../persistence/projection.md)：`sessionProjections.register` 合同；`permissions` 是一把 unit。
- [subsys.composition.bundle-base](../composition/bundle-base.md)：`id: permission` 与旁边的 sandbox / approval 行。
