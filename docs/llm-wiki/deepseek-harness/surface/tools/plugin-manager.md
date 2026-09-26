---
id: surface.tools.plugin-manager
title: plugin_manager
kind: tool
tier: T1
pkg: composition
source:
  - packages/boot/plugin-manager/src/tools.ts
  - packages/boot/plugin-manager/src/index.ts
  - packages/boot/plugin-manager/package.json
  - packages/boot/plugin-manager/tests/tools.spec.ts
  - packages/sandbox/sandbox/src/escalation.ts
  - packages/core/tools/src/index.ts
  - packages/guard/timeout-policy/src/index.ts
  - packages/session/session-checkpoint-policy/src/index.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/web-app/presets/standard.patch.yml
  - packages/bundle/web-app/presets/ptc.patch.yml
  - packages/bundle/web-app/presets/cordis.patch.yml
  - packages/bundle/web-app/presets/minimal.patch.yml
symbols:
  - plugin_manager
  - apply
  - inject
  - PluginManager
related:
  - spine.tool-call-anatomy
  - spine.trace-tool-approval
  - ref.tools-catalog
  - subsys.interaction.approval
  - subsys.execution.sandbox-policy
  - surface.presets.standard
  - surface.presets.code
  - surface.presets.cordis
  - subsys.composition.app-boot
evidence: explicit
status: verified
updated: 477b4f4205
---

> 模型可见名 `plugin_manager`；实现模块 `@deepseek-ai/dsh-plugin-manager/tools`（组合行 `id: tool-plugin-manager`）。列出 / 开关当前 profile 的插件与 bundle，或安装 / 卸载 bundle。每次 action 都要 `danger-full-access` 或当次 approval；出厂 shipped preset **默认 `disabled`**。

## 能回答的问题

- 模型看见的 `plugin_manager` 是哪个包、哪条 Cordis 行、`inject` 要什么？
- `action` 有哪些枚举？哪些字段按 action 必填？
- 为什么 `read-only` / `workspace-write` 会在碰 `ctx.pluginManager` 之前失败？approval 会不会把 session 模式改成 full-access？
- `minimal` / `standard` / `ptc` / `cordis` 谁装、谁 `disabled`？host `dsh-base` 那一行呢？
- 改的是当前 session 还是整个 profile？

## Identity

| 面 | 值 |
|---|---|
| wire `name` | `plugin_manager` [E: packages/boot/plugin-manager/src/tools.ts:20] |
| 实现包 | `@deepseek-ai/dsh-plugin-manager` 的 `./tools` 出口 [E: packages/boot/plugin-manager/package.json:2] [E: packages/boot/plugin-manager/package.json:43] |
| 组合行 id | `tool-plugin-manager`；`name: '@deepseek-ai/dsh-plugin-manager/tools'` [E: packages/bundle/base/cordis.patch.yml:16] |
| `inject` | `['tools', 'pluginManager', 'sandboxPolicy']` [E: packages/boot/plugin-manager/src/tools.ts:13] |
| 工厂 | `apply(ctx)`（无 Config） [E: packages/boot/plugin-manager/src/tools.ts:18] |
| 注册 | `ctx.tools.register(defineTool({ name: 'plugin_manager', ... }))` [E: packages/boot/plugin-manager/src/tools.ts:19] |

本页只有这一条 model-visible 名。同包的 `PluginManager` 服务（`ctx.pluginManager`，`id: plugin-manager`）是 Web / CLI 共用的管理面，不是第二把工具。[E: packages/boot/plugin-manager/src/index.ts:171] [E: packages/boot/plugin-manager/src/index.ts:206]

`tools.ts` **没有** `export const name`；Loader 用 package 子路径当插件身份。`defineTool` **没有** `timeoutMs`，也 **没有** `isConcurrencySafe` → exclusive；timeout-policy 原样 `next()`。[E: packages/guard/timeout-policy/src/index.ts:59] [E: packages/core/tools/src/index.ts:1305]

`presentCall`：`action` 以 `list_` 开头 → `kind: 'read'`，否则 `'other'`；title `Manage profile plugins`。[E: packages/boot/plugin-manager/src/tools.ts:90] [E: packages/boot/plugin-manager/tests/tools.spec.ts:244]

## 用途定位

本工具让模型在 **当前 profile** 上做与 Web Plugins 页同一套操作：列出插件/bundle、enable/disable、安装/移除 bundle、列出/授予/撤销 version exemption。描述写明：每次都要 danger-full-access 或当次审批；审批 **不**改 session 权限模式；改动影响该 profile 的每一个 session；先 list 再拿精确 id；安装可能跑允许的 build script；live profile 立刻生效，startup profile 要重启。[E: packages/boot/plugin-manager/src/tools.ts:21]

权威副作用在 `ctx.pluginManager`（写 profile patch / 跑 pnpm），不在 session log 里另造一份插件表。

## 输入 schema

以默认 boot 后的 `ctx.tools.schemas()` 为准。`action` 必填 enum；其余按 action 在 **execute** 里再要求，schema 上多为可选。

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---|---|---|---|
| `action` | `string` | 是 | 无 | enum：`list_plugins` / `list_bundles` / `set_plugin` / `set_bundle` / `install_bundle` / `remove_bundle` / `list_version_exemptions` / `set_version_exemption` | 管理操作。[E: packages/boot/plugin-manager/src/tools.ts:23] |
| `target` | `string` | 视 action | 无 | set/install/remove/exemption 在 body 里要求 | 插件 entry id、bundle 包名、或安装 spec |
| `enabled` | `boolean` | 视 action | 安装默认 true | set 操作在 body 里要求 | 对 `set_version_exemption`：true 授予、false 撤销 |
| `runtimeVersion` | `string` | exemption | 无 | 必须是 `list_version_exemptions` 给出的精确 DSH 版本 | 与 `target` 的 `package-name@version` 成对 |
| `acceptRisk` | `boolean` | 授予 exemption | 无 | 仅在警告用户之后为 true | 一般安装许可不够 |
| `approvedBuilds` | `string[]` | install 可选 | 无 | 只传用户明确批准过的 `pendingBuilds` 名 | 给该 profile 持久 build 许可 |
| `registry` | `string` | install 可选 | 无 | npm registry URL | 用户点名时优先问这个 registry |
| `offset` | `number` | 否 | `0` | 非负整数 | list 分页 |
| `limit` | `number` | 否 | `25` | 1–100 整数 | list 页大小。[E: packages/boot/plugin-manager/src/tools.ts:56] |

缺 `action` 或 enum 外的值在 schema 边界失败。`set_plugin` 缺 `target`/`enabled` 等在 body 抛，例如 `target and enabled are required`。[E: packages/boot/plugin-manager/src/tools.ts:71] [E: packages/boot/plugin-manager/tests/tools.spec.ts:237]

**没有 Config。** 出厂行也不覆盖参数。

## 输出 & 截断 / spill

`output.schema` 是 `string`；`render` 原样当 text。[E: packages/boot/plugin-manager/src/tools.ts:33] execute 把 manager 结果 `JSON.stringify`。list 结果形如 `{ entries, total, nextOffset }`，条目剥掉 `meta`。[E: packages/boot/plugin-manager/src/tools.ts:66]

没有 spill。失败走 registry `isError`（缺 approval 服务时文案含 `requires approval, but no approval service is composed`）。[E: packages/boot/plugin-manager/tests/tools.spec.ts:51]

## 背后的 seam

| 角色 | 实体 | 本工具怎么用 |
|---|---|---|
| Definition（工具注册表） | `ctx.tools` | `inject` 含 `tools`；`register`。[E: packages/boot/plugin-manager/src/tools.ts:13] |
| Definition（管理服务） | `ctx.pluginManager` / `PluginManager` | `listPlugins` / `listBundles` / `setPluginEnabled` / `setBundleEnabled` / `installBundle` / `removeBundle` / `listVersionExemptions` / `setVersionExemption`。[E: packages/boot/plugin-manager/src/index.ts:171] |
| Definition（权限） | `ctx.sandboxPolicy` | `resolve({ session })` 得到 `policy.mode`，作为 `approveEscalation` 的 `effectiveMode`。[E: packages/boot/plugin-manager/src/tools.ts:38] [E: packages/boot/plugin-manager/src/tools.ts:40] |
| Consumer | `@deepseek-ai/dsh-plugin-manager/tools` | 先 `approveEscalation({ requestedMode: 'danger-full-access', … })`，再调 manager。[E: packages/boot/plugin-manager/src/tools.ts:39] |
| Provider（审批） | `ctx.approval`（可选） | 经 `approveEscalation` 的 `approver: ctx.get('approval')`。没有 approval 服务且模式不够宽 → 失败，manager 方法零调用。[E: packages/boot/plugin-manager/src/tools.ts:42] [E: packages/boot/plugin-manager/tests/tools.spec.ts:46] |

`PluginManager` 自己 `static inject = ['loader', 'profileContext']`。没有 `profileContext` 时 `dsh-base` 把 `id: plugin-manager` 整行 disabled。[E: packages/boot/plugin-manager/src/index.ts:177] [E: packages/bundle/base/cordis.patch.yml:22]

换掉 `pluginManager` 会带走：profile 文件写在哪、pnpm 怎么跑、live vs restart。不会带走：wire 名、八个 action、escalation 合同。

## 执行管线

`ctx.tools.execute` 走 `tools/pre-execute`（默认 `{ kind: 'allow' }`）→ guard → `tools/execute` → body → `tools/post-execute`。[E: packages/core/tools/src/index.ts:1369] [E: packages/core/tools/src/index.ts:1506]

对本工具的挂点：

- **approval / sandbox：** 不走 `tools/pre-execute` 的 `ask`。body **一开始**就 `approveEscalation`：`requestedMode: 'danger-full-access'`，`subject: 'plugin management operation'`。已经是 full-access 则不 prompt；较窄模式走 `ctx.approval`，outcome `allowed-once` 不改 session 的 `sandbox/mode`。[E: packages/boot/plugin-manager/src/tools.ts:39] [E: packages/sandbox/sandbox/src/escalation.ts:171] [E: packages/boot/plugin-manager/tests/tools.spec.ts:105] [E: packages/boot/plugin-manager/tests/tools.spec.ts:115]
- **timeout：** 未声明 `timeoutMs`。[E: packages/guard/timeout-policy/src/index.ts:59]
- **checkpoint：** top-level 先 flush 再 `next()`。[E: packages/session/session-checkpoint-policy/src/index.ts:71]
- **并行：** exclusive。[E: packages/core/tools/src/index.ts:1305]
- **PTC：** shipped `ptc` 仍声明本行但 `disabled: true`。若有人 enable 且 `mode: ptc`，无 `parent` 的直调会 collapse。

`never` approval policy 在非 full-access 下拒且不 prompt；切到 `danger-full-access` 后同一 action 不再 prompt。[E: packages/boot/plugin-manager/tests/tools.spec.ts:140]

## Preset 装配

出厂 **默认 disabled**。host 与 preset 各写一行：

| 面 | 行 | `disabled` | 说明 |
|---|---|---|---|
| `dsh-base` | `id: tool-plugin-manager` | **`true`** | host 预留行，默认不进模型目录。[E: packages/bundle/base/cordis.patch.yml:16] [E: packages/bundle/base/cordis.patch.yml:18] |
| `dsh-base` | `id: plugin-manager`（服务，不是工具） | `!ctx.get('profileContext')` | 无 profile 上下文时连服务都不挂。[E: packages/bundle/base/cordis.patch.yml:20] |
| `dsh-web-app` overlay | 再 disable `tool-plugin-manager` | **`true`** | 与其它 host 模型可见工具一起挪到 preset。[E: packages/bundle/web-app/cordis.patch.yml:444] [E: packages/bundle/web-app/cordis.patch.yml:445] |
| `minimal` | 无本行 | — | [I] 核过 `minimal.patch.yml` 无 `tool-plugin-manager` |
| `standard` | 有 | **`true`** | [E: packages/bundle/web-app/presets/standard.patch.yml:144] [E: packages/bundle/web-app/presets/standard.patch.yml:146] |
| `ptc` | 有 | **`true`** | [E: packages/bundle/web-app/presets/ptc.patch.yml:150] [E: packages/bundle/web-app/presets/ptc.patch.yml:152] |
| `cordis` | 有 | `!ctx.get('profileContext')` | 有 profile 上下文才 enable。[E: packages/bundle/web-app/presets/cordis.patch.yml:152] [E: packages/bundle/web-app/presets/cordis.patch.yml:154] |

仓库里有 `@deepseek-ai/dsh-plugin-manager` ≠ 模型默认能调。要启用：user patch 把对应 preset 行的 `disabled` 去掉，或在有 `profileContext` 的 cordis 会话里。启用后仍过不了 escalation 就不能改 profile。

## execute() 走读

1. `sandboxPolicy.resolve`（有 agent 则带 session）。[E: packages/boot/plugin-manager/src/tools.ts:38]
2. `approveEscalation`；`exec.signal.throwIfAborted()`。[E: packages/boot/plugin-manager/src/tools.ts:39] [E: packages/boot/plugin-manager/src/tools.ts:44]
3. `switch (args.action)`：list 分页并剥 `meta`；set/install/remove 调对应 manager 方法；exemption 还要 `acceptRisk` / 精确 `runtimeVersion`。[E: packages/boot/plugin-manager/src/tools.ts:46]
4. 返回 `JSON.stringify(...)`。

## 设计动机·edge

相对「再做一个 admin MCP」：管理合同与 Web Plugins 页共用 `PluginManager`，避免两套 patch 语义。相对普通工具的 `sandbox_permissions` 字段：本工具的每次调用都是 profile 级、出沙箱的 host 代码，所以固定要 full-access / 当次审批，而不是广告一个可选 escalation 参数。

version exemption 必须精确到 `package-name@version` + runtime 版本；描述要求先警告崩溃/丢数据风险。list 默认 25 条、上限 100，避免把整个 inventory 灌进 context。

## Sources

- packages/boot/plugin-manager/src/tools.ts
- packages/boot/plugin-manager/src/index.ts
- packages/boot/plugin-manager/package.json
- packages/boot/plugin-manager/tests/tools.spec.ts
- packages/sandbox/sandbox/src/escalation.ts
- packages/core/tools/src/index.ts
- packages/guard/timeout-policy/src/index.ts
- packages/session/session-checkpoint-policy/src/index.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/web-app/presets/standard.patch.yml
- packages/bundle/web-app/presets/ptc.patch.yml
- packages/bundle/web-app/presets/cordis.patch.yml
- packages/bundle/web-app/presets/minimal.patch.yml

## 相关

- [spine.tool-call-anatomy](../../spine/tool-call-anatomy.md)：通用工具管线；本工具的审批在 body 里，不在 `pre-execute` `ask`。
- [spine.trace-tool-approval](../../spine/trace-tool-approval.md)：`approveEscalation` 时序。
- [ref.tools-catalog](../../reference/tools-catalog.md)：模型可见工具清单。
- [subsys.interaction.approval](../../subsystems/interaction/approval.md)：`ctx.approval`。
- [subsys.execution.sandbox-policy](../../subsystems/execution/sandbox-policy.md)：`effectiveMode`。
- [surface.presets.standard](../presets/standard.md) / [surface.presets.code](../presets/code.md) / [surface.presets.cordis](../presets/cordis.md)：出厂 `disabled`。
- [subsys.composition.app-boot](../../subsystems/composition/app-boot.md)：profile / `profileContext`。
