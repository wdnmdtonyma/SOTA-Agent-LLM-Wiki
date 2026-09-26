---
id: surface.tools.cordis
title: cordis_inspect_list / cordis_inspect_query
kind: tool
tier: T1
pkg: composition
source:
  - packages/extensions/tool-cordis/src/index.ts
  - packages/extensions/tool-cordis/src/present.ts
  - packages/extensions/tool-cordis/src/providers.ts
  - packages/extensions/tool-cordis/src/api-catalog.ts
  - packages/extensions/tool-cordis/src/config.ts
  - packages/extensions/tool-cordis/src/host.ts
  - packages/extensions/tool-cordis/package.json
  - packages/extensions/tool-cordis/tests/cordis-lifecycle.spec.ts
  - packages/extensions/cordis-host-runner/src/inspect-registry.ts
  - packages/extensions/cordis-host-runner/package.json
  - packages/bundle/web-app/cordis.patch.yml
  - packages/core/tools/src/index.ts
  - packages/core/tools/src/schema.ts
  - packages/guard/timeout-policy/src/index.ts
  - packages/session/session-checkpoint-policy/src/index.ts
  - packages/bundle/web-app/presets/cordis.patch.yml
  - packages/bundle/web-app/presets/minimal.patch.yml
  - packages/bundle/web-app/presets/standard.patch.yml
  - packages/bundle/web-app/presets/ptc.patch.yml
  - apps/cli/tests/web-agent-presets.e2e.ts
symbols:
  - cordis_inspect_list
  - cordis_inspect_query
  - apply
  - name
  - inject
  - hostInspectProviders
  - queryLiveConfig
related:
  - spine.tool-call-anatomy
  - ref.tools-catalog
  - surface.presets.cordis
  - spine.capability-seams
  - subsys.composition.agent-presets
evidence: explicit
status: verified
updated: 477b4f4205
---

> `cordis_inspect_list` / `cordis_inspect_query` 是 `@deepseek-ai/dsh-tool-cordis` 向模型登记的**只读** Inspect 两件套。`cordis_define` / `cordis_run` / `cordis_stop` / `cordis_undefine` / `cordis_inspect_self` 已从 catalog 退役；动态 Plugin 的写路径改走 `plugin_manager`（本页不展开）。四个 shipped preset 里只有 `cordis` 装这组名字。

## 能回答的问题

- 模型现在看见几个 `cordis_*`？`cordis_define` 还在不在 `ctx.tools.schemas()`？
- 实现包、`inject`、`defineTool` 注册点在哪？Host inspect Provider 是谁挂的？
- `cordis_inspect_query` 的 `platform` / `provider` / `method` / `input` 各填什么？
- Host 默认有哪些 Provider？`Builtin` 还在吗？
- 四个 shipped preset 谁装 `@deepseek-ai/dsh-tool-cordis`？`standard` 会话看不看得到 `cordis_define`？
- 一次调用怎样进 `tools/pre-execute → execute → post-execute`？

## Identity

实现包是 `@deepseek-ai/dsh-tool-cordis`。Cordis 插件名 `export const name = 'tool-cordis'`，`inject = ['tools', 'cordisInspect']`：两个服务缺一则插件保持 pending，catalog 里不会出现这两个名字。[E: packages/extensions/tool-cordis/package.json:2] [E: packages/extensions/tool-cordis/src/index.ts:9] [E: packages/extensions/tool-cordis/src/index.ts:10]

`apply(ctx)` **没有** schemastery `Config`，也**没有** `systemPrompt` section。工厂只做两次 `ctx.tools.register(defineTool({ name, … }))`。[E: packages/extensions/tool-cordis/src/index.ts:21] [E: packages/extensions/tool-cordis/src/index.ts:22] [E: packages/extensions/tool-cordis/src/index.ts:41]

| 模型看见的 `name` | `defineTool` | `presentCall` |
|---|---|---|
| `cordis_inspect_list` | [E: packages/extensions/tool-cordis/src/index.ts:23] | `presentInspectListCall` → `card: 'generic'` / `kind: 'read'` [E: packages/extensions/tool-cordis/src/present.ts:8] |
| `cordis_inspect_query` | [E: packages/extensions/tool-cordis/src/index.ts:42] | `presentInspectQueryCall` [E: packages/extensions/tool-cordis/src/present.ts:17] |

Host inspect Provider **不**在 preset 行的 `apply` 里登记。`dsh-web-app` 在 host 面 insert `id: cordis-inspect-providers` / `name: '@deepseek-ai/dsh-tool-cordis/host'`，由 `host.ts` 的 `apply` 把 `hostInspectProviders(ctx)` 写进 `ctx.cordisInspect`。registry 按 id 拒重名，所以这一行必须是进程级一次。[E: packages/bundle/web-app/cordis.patch.yml:150] [E: packages/bundle/web-app/cordis.patch.yml:151] [E: packages/extensions/tool-cordis/src/host.ts:5] [E: packages/extensions/tool-cordis/src/host.ts:17]

`requireAgent` 只在 `cordis_inspect_query` 里调用：没有 `exec.agent` 抛 `Cordis inspection requires an Agent-backed session`。`cordis_inspect_list` 不调它。[E: packages/extensions/tool-cordis/src/index.ts:12] [E: packages/extensions/tool-cordis/src/index.ts:66] [E: packages/extensions/tool-cordis/src/index.ts:35]

两个 `defineTool` 都没有 `timeoutMs`、没有 `isConcurrencySafe` → exclusive。[E: packages/core/tools/src/index.ts:1305]

**已退役的五个名字。** e2e 钉死 `cordis` catalog 含 `cordis_inspect_list` / `cordis_inspect_query` / `plugin_manager`，并且 **不含** `cordis_define` / `cordis_run` / `cordis_stop` / `cordis_undefine` / `cordis_inspect_self`。`standard` 会话同样不含 `cordis_define`。[E: apps/cli/tests/web-agent-presets.e2e.ts:366] [E: apps/cli/tests/web-agent-presets.e2e.ts:368] [E: apps/cli/tests/web-agent-presets.e2e.ts:442] UI 包仍有历史 `cordis_define` 卡片实现，那不是现行 `defineTool` 合同 [I]。

没有 `cordis_mount` / `cordis_unmount`。

## 用途定位

这两支工具让模型在写 / 配 plugin **之前**读运行时 API：先 `cordis_inspect_list` 拿 Provider 目录，再 `cordis_inspect_query` 跑只读 method。description 禁止把 Inspect method 当成 plugin 代码能调用的业务 Service。[E: packages/extensions/tool-cordis/src/index.ts:28] [E: packages/extensions/tool-cordis/src/index.ts:48]

它们**不**定义、不求值、不审批动态 Package。`DynamicCordisRunnerService` 仍存在于 `dsh-cordis-host-runner`，但不再经本包的模型工具暴露。写路径是另一支工具 `plugin_manager`（`packages/boot/plugin-manager/src/tools.ts`；`cordis` preset 在有 `profileContext` 时启用，`standard` / `ptc` 出厂 `disabled: true`）。

`packages/extensions/tool-cordis/tests/cordis-lifecycle.spec.ts` 测的是 vendored Cordis `ctx.effect` 所有权，**不是**这两个 wire 名。[E: packages/extensions/tool-cordis/tests/cordis-lifecycle.spec.ts:9]

## 输入 schema

以插件默认 `apply(ctx)`（无 Config）boot 后的模型可见参数为准。

### `cordis_inspect_list`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| （无） | — | — | `parameters: {}`。列出 Host 本地 Provider 与 Client 同步过来的 manifest。[E: packages/extensions/tool-cordis/src/index.ts:30] |

### `cordis_inspect_query`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `platform` | `string` | 是 | enum `host` / `client`。[E: packages/extensions/tool-cordis/src/index.ts:51] |
| `provider` | `string` | 是 | 必须来自 list 的 id。[E: packages/extensions/tool-cordis/src/index.ts:52] |
| `method` | `string` | 是 | 该 Provider 声明的方法名。[E: packages/extensions/tool-cordis/src/index.ts:53] |
| `input` | `json` | 否 | 必须满足该方法 input schema。[E: packages/extensions/tool-cordis/src/index.ts:54] |

shipped `cordis` 的 `tool-cordis` 行没有 `config:`，产品默认就是这两张表。[E: packages/bundle/web-app/presets/cordis.patch.yml:141] [E: packages/bundle/web-app/presets/cordis.patch.yml:142]

Host 出厂 Provider（`hostInspectProviders`）是 `Service.listService`、`Event.listEvents`、`Config.listConfigs`、`Tool.listTools`。**没有** `Builtin`。[E: packages/extensions/tool-cordis/src/providers.ts:41] [E: packages/extensions/tool-cordis/src/providers.ts:50] [E: packages/extensions/tool-cordis/src/providers.ts:58] [E: packages/extensions/tool-cordis/src/providers.ts:67] e2e 精确相等 `['Service', 'Event', 'Config', 'Tool']`。[E: apps/cli/tests/web-agent-presets.e2e.ts:672]

`Config.listConfigs` 走 `queryLiveConfig`：无 `entry` 时分页列 Loader 树；有 `entry` 时投影该插件的 native Schemastery Config。没有 Loader 的 Host 会抛错。[E: packages/extensions/tool-cordis/src/config.ts:98] [E: packages/extensions/tool-cordis/src/config.ts:100]

## 输出 & 截断 / spill

两个工具的规范值都是 JSON。`render` 是 `JSON.stringify(value, null, 2)` 包进一段 text。没有 `presentationMeta`，没有自己的 spill。[E: packages/extensions/tool-cordis/src/index.ts:33] [E: packages/extensions/tool-cordis/src/index.ts:58]

`cordis_inspect_list` 返回 `{ providers: ctx.cordisInspect.list() }`。[E: packages/extensions/tool-cordis/src/index.ts:36]

`cordis_inspect_query` 返回 `{ platform, provider, method, data }`。[E: packages/extensions/tool-cordis/src/index.ts:69]

失败走 registry `Error: <message>`。

## 背后的 seam

| 角色 | 落点 |
|---|---|
| Definition | preset 行 `id: tool-cordis` / `name: '@deepseek-ai/dsh-tool-cordis'`，加上两个 `defineTool`。[E: packages/bundle/web-app/presets/cordis.patch.yml:141] |
| Provider | host `@deepseek-ai/dsh-cordis-host-runner` 发布 `cordisInspect`；`@deepseek-ai/dsh-tool-cordis/host` 登记四个 Host Provider。[E: packages/bundle/web-app/cordis.patch.yml:144] [E: packages/extensions/tool-cordis/src/host.ts:17] |
| Consumer | 两个 `cordis_inspect_*`。 |

`dsh-web-app` 同时 insert `cordis-host-runner` 与 `cordis-inspect-providers`。[E: packages/bundle/web-app/cordis.patch.yml:144] [E: packages/bundle/web-app/cordis.patch.yml:150] `dsh-base` / `dsh-headless` **没有**这两行；缺 Provider 时 `inject: cordisInspect` 不满足，两个名字进不了 catalog。web profile 才叠 `dsh-web-app`。

换 / 卸掉 `cordisInspect` 会带走：Host+Client Provider 目录、`query` 路由、Client 查询的 pending 表。不会带走：`ctx.tools` 注册表本身、四个 shipped preset 里其它 native 工具。

## 执行管线

模型写出其中一个 `cordis_inspect_*` 后，loop 经 `ctx.tools.execute`：`tools/pre-execute` → monotonic `guard` → `tools/execute` → body → `tools/post-execute`。[E: packages/core/tools/src/index.ts:1506] [E: packages/core/tools/src/index.ts:1606] [E: packages/core/tools/src/index.ts:1783]

- **pre-execute：** 本插件不注册 listener，也不 `ask`。没有 Client 半审批——那是已退役的 `cordis_run` 路径。
- **调度：** exclusive。[E: packages/core/tools/src/index.ts:1305]
- **checkpoint：** `cordis_inspect_query` 有 `exec.agent` 且无 `parent` 时会 `flush`；`cordis_inspect_list` 无 agent 要求，裸 execute 会跳过这条。[E: packages/session/session-checkpoint-policy/src/index.ts:71] [E: packages/extensions/tool-cordis/src/index.ts:35]
- **timeout：** 未声明 `timeoutMs`，包装器直接 `next()`。Client query 的等待靠 `exec.signal` 取消，不是 tool deadline。[E: packages/guard/timeout-policy/src/index.ts:59] [E: packages/extensions/tool-cordis/src/index.ts:67]
- **PTC：** shipped `ptc` preset **不装** `tool-cordis`。[E: packages/bundle/web-app/presets/ptc.patch.yml:144]

## Preset 装配

成员资格只认 `packages/bundle/web-app/presets/{standard,ptc,minimal,cordis}.patch.yml`。

| preset | 装 `@deepseek-ai/dsh-tool-cordis`？ | `disabled` | isolate | shipped Config |
|---|---|---|---|---|
| `minimal` | **否** | — | — | 无 `id: tool-cordis`。只有 persistent-shell。[E: packages/bundle/web-app/presets/minimal.patch.yml:17] |
| `standard` | **否** | — | — | 停在 `present` + `tool-plugin-manager` `disabled: true`。catalog **不含** `cordis_define`。[E: packages/bundle/web-app/presets/standard.patch.yml:142] [E: packages/bundle/web-app/presets/standard.patch.yml:146] [E: apps/cli/tests/web-agent-presets.e2e.ts:442] |
| `ptc` | **否** | — | — | 相对 `standard` 的增量是 `tool-presentation` `mode: ptc`，不是 `tool-cordis`。[E: packages/bundle/web-app/presets/ptc.patch.yml:144] |
| `cordis` | **是** | 无 | 无 | `- id: tool-cordis` / `name: '@deepseek-ai/dsh-tool-cordis'`，无 `config`。e2e catalog 含两个 inspect 名和 `plugin_manager`，并仍含 `bash` / `read` / `edit` / `skill`。[E: packages/bundle/web-app/presets/cordis.patch.yml:141] [E: apps/cli/tests/web-agent-presets.e2e.ts:366] [E: apps/cli/tests/web-agent-presets.e2e.ts:371] |

`cordis` 的 `tool-plugin-manager` 是 `disabled: !!js "!ctx.get('profileContext')"`：Web 会话有 `profileContext` 时 **启用** `plugin_manager`；`standard` / `ptc` 则无条件 `disabled: true`。[E: packages/bundle/web-app/presets/cordis.patch.yml:154] [E: packages/bundle/web-app/presets/standard.patch.yml:146]

`tool-cordis` 行不进 `planning` / `compaction` / `delegation` isolate 组：它只往 host 已有的 `tools` / `cordisInspect` 注册。

## execute() 走读

1. **`cordis_inspect_list`。** 同步 `Promise.resolve({ providers: ctx.cordisInspect.list() })`。[E: packages/extensions/tool-cordis/src/index.ts:36]
2. **`cordis_inspect_query`。** `requireAgent` → `ctx.cordisInspect.query(platform, provider, method, input, agent, exec.signal)` → 投影 `{ platform, provider, method, data }`。Host 查询本地跑；Client 查询等到第一份有效页面响应或 signal abort。[E: packages/extensions/tool-cordis/src/index.ts:60]

## 设计动机·edge

- **Inspect 与 mutation 拆开。** 模型工具只读运行时合同；改 live 组合走 `plugin_manager`，不再走 `cordis_define` / `cordis_run`。
- **Host Provider 进程级一次。** `cordis-inspect-providers` 在 web-app host 面，preset 行只消费。
- **`Config` 取代 `Builtin`。** 活 Loader 树的 schemastery 投影，不是静态 builtin 清单。
- **`standard` 看不到自修改工具。** 这和 Claude / Codex 把 runtime 自省藏在产品内部不同；DSH 把它收成 creator preset 的 opt-in。
- **vm / 审批不在本页。** `evaluateHostCode` 与 `cordis/request-run` 仍在 runner 里，但没有模型工具再调用它们。

## Sources

- packages/extensions/tool-cordis/src/index.ts
- packages/extensions/tool-cordis/src/present.ts
- packages/extensions/tool-cordis/src/providers.ts
- packages/extensions/tool-cordis/src/api-catalog.ts
- packages/extensions/tool-cordis/src/config.ts
- packages/extensions/tool-cordis/src/host.ts
- packages/extensions/tool-cordis/package.json
- packages/extensions/tool-cordis/tests/cordis-lifecycle.spec.ts
- packages/extensions/cordis-host-runner/src/inspect-registry.ts
- packages/extensions/cordis-host-runner/package.json
- packages/bundle/web-app/cordis.patch.yml
- packages/core/tools/src/index.ts
- packages/core/tools/src/schema.ts
- packages/guard/timeout-policy/src/index.ts
- packages/session/session-checkpoint-policy/src/index.ts
- packages/bundle/web-app/presets/cordis.patch.yml
- packages/bundle/web-app/presets/minimal.patch.yml
- packages/bundle/web-app/presets/standard.patch.yml
- packages/bundle/web-app/presets/ptc.patch.yml
- apps/cli/tests/web-agent-presets.e2e.ts

## 相关

- [工具调用解剖](../../spine/tool-call-anatomy.md) — `tools/pre-execute` → execute → `tools/post-execute`
- [模型可见工具目录](../../reference/tools-catalog.md) — 两个 `cordis_inspect_*` 只在 `cordis` preset 会话出现
- [cordis preset](../presets/cordis.md) — shipped 创造模式；`plugin_manager` 与 `customSkillDirs`
- [能力缝](../../spine/capability-seams.md) — Definition / Provider / Consumer
- [preset 发现与挂载](../../subsystems/composition/agent-presets.md) — standing mount、isolate
