---
id: surface.tools.cordis
title: cordis_* 自修改套件
kind: tool
tier: T1
pkg: composition
source:
  - packages/extensions/tool-cordis/src/index.ts
  - packages/extensions/tool-cordis/src/prompt.ts
  - packages/extensions/tool-cordis/src/present.ts
  - packages/extensions/tool-cordis/src/providers.ts
  - packages/extensions/tool-cordis/src/api-catalog.ts
  - packages/extensions/tool-cordis/src/inspect.ts
  - packages/extensions/tool-cordis/package.json
  - packages/extensions/tool-cordis/tests/cordis-lifecycle.spec.ts
  - packages/extensions/cordis-host-runner/src/index.ts
  - packages/extensions/cordis-host-runner/src/sandbox.ts
  - packages/extensions/cordis-host-runner/src/registry.ts
  - packages/extensions/cordis-host-runner/src/inspect-registry.ts
  - packages/extensions/cordis-host-runner/src/lifecycle.ts
  - packages/extensions/cordis-host-runner/package.json
  - packages/extensions/cordis-host-runner/tests/runner.spec.ts
  - packages/extensions/cordis-host-runner/tests/sandbox.spec.ts
  - packages/extensions/cordis-host-runner/tests/versioning.spec.ts
  - packages/bundle/web-app/cordis.patch.yml
  - packages/core/tools/src/index.ts
  - packages/core/tools/src/schema.ts
  - packages/guard/timeout-policy/src/index.ts
  - packages/session/session-checkpoint-policy/src/index.ts
  - apps/cli/config/agent-presets/cordis/agent.cordis.yml
  - apps/cli/config/agent-presets/minimal/agent.cordis.yml
  - apps/cli/config/agent-presets/standard/agent.cordis.yml
  - apps/cli/config/agent-presets/code/agent.cordis.yml
  - apps/cli/tests/web-agent-presets.e2e.ts
symbols:
  - cordis_define
  - cordis_run
  - cordis_stop
  - cordis_undefine
  - cordis_inspect_list
  - cordis_inspect_query
  - cordis_inspect_self
  - apply
  - name
  - inject
  - CORDIS_SYSTEM_PROMPT
  - evaluateHostCode
  - DynamicCordisRunnerService
  - hostInspectProviders
related:
  - spine.tool-call-anatomy
  - ref.tools-catalog
  - surface.presets.cordis
  - spine.capability-seams
  - subsys.composition.agent-presets
evidence: explicit
status: verified
updated: 47f943859b
---

> `cordis_*` 是 `@deepseek-ai/dsh-tool-cordis` 向模型登记的七个自修改工具：`cordis_inspect_list` / `cordis_inspect_query` / `cordis_inspect_self` 只读运行时与本会话动态 Plugin；`cordis_define` 把不可变 Package 写入进程内 registry；`cordis_run` 才对 Host 半求值并可选地等 Client 审批；`cordis_stop` 停当前 Run 但保留定义；`cordis_undefine` 永久删除。四个 shipped preset 里只有 `cordis` 装这组名字。没有 `cordis_mount` / `cordis_unmount`。

## 能回答的问题

- 模型看见的七个 `cordis_*` wire `name` 分别是什么？实现包、`inject`、`defineTool` 注册点在哪？有没有 `cordis_mount`？
- `cordis_define` 的 `plugin` / `name` / `purpose` / `code` 各填什么？它会不会执行 `apply`？
- `cordis_run` 的 `mode` 何时必须是 `run`、何时必须是 `update`？`awaiting-approval` / `starting` / `running` 分别代表什么？
- 这组工具消费哪些 `ctx.*`？Host 半在哪个 sandbox 里求值？那是不是安全边界？
- 四个 shipped preset 谁装 `@deepseek-ai/dsh-tool-cordis`？`standard` 会话看不看得到 `cordis_define`？
- 一次调用怎样进 `tools/pre-execute → execute → post-execute`？Client 审批是不是 `ctx.approval` 的 `ask`？

## Identity

实现包是 `@deepseek-ai/dsh-tool-cordis`。Cordis 插件名 `export const name = 'tool-cordis'`，`inject = ['tools', 'systemPrompt', 'dynamicCordisRunner', 'cordisInspect']`：四个服务缺一则插件保持 pending，catalog 里不会出现这七个名字。[E: packages/extensions/tool-cordis/package.json:2][E: packages/extensions/tool-cordis/src/index.ts:26][E: packages/extensions/tool-cordis/src/index.ts:27]

`apply(ctx)` **没有** schemastery `Config`：不改名、不关工具、不改参数。工厂就是这个 `apply`，在里面七次 `ctx.tools.register(defineTool({ name, … }))`，并挂 `systemPrompt` section `tool:cordis`（`order: 115`，文本为 `CORDIS_SYSTEM_PROMPT`），再用 `ctx.effect` 把 Host inspect Provider 登记进 `ctx.cordisInspect`。[E: packages/extensions/tool-cordis/src/index.ts:35][E: packages/extensions/tool-cordis/src/index.ts:36][E: packages/extensions/tool-cordis/src/index.ts:38]

| 模型看见的 `name` | `defineTool` 登记行 | `presentCall` |
|---|---|---|
| `cordis_inspect_list` | [E: packages/extensions/tool-cordis/src/index.ts:42] | `presentInspectListCall` → `card: 'generic'` / `kind: 'read'` [E: packages/extensions/tool-cordis/src/present.ts:20] |
| `cordis_inspect_query` | [E: packages/extensions/tool-cordis/src/index.ts:61] | `presentInspectQueryCall` [E: packages/extensions/tool-cordis/src/present.ts:29] |
| `cordis_inspect_self` | [E: packages/extensions/tool-cordis/src/index.ts:97] | `presentInspectSelfCall` [E: packages/extensions/tool-cordis/src/present.ts:41] |
| `cordis_define` | [E: packages/extensions/tool-cordis/src/index.ts:149] | `presentDefineCall`（`kind: 'execute'`，`rawInput` 是 `code`）[E: packages/extensions/tool-cordis/src/present.ts:67] |
| `cordis_run` | [E: packages/extensions/tool-cordis/src/index.ts:241] | `presentRunCall` [E: packages/extensions/tool-cordis/src/present.ts:90] |
| `cordis_stop` | [E: packages/extensions/tool-cordis/src/index.ts:330] | `presentStopCall` [E: packages/extensions/tool-cordis/src/present.ts:101] |
| `cordis_undefine` | [E: packages/extensions/tool-cordis/src/index.ts:352] | `presentUndefineCall`（`kind: 'delete'`）[E: packages/extensions/tool-cordis/src/present.ts:79] |

`apply` **没有**登记 `cordis_mount` 或 `cordis_unmount`。`cordis` preset yml 头注释和部分 skill 正文仍写这两个旧名，那不是现行 `defineTool` 合同 [U]。

七个 `defineTool` 都没有 `timeoutMs`、没有 `isConcurrencySafe`。registry 对未声明的 classifier 一律 `exclusive`。[E: packages/core/tools/src/index.ts:1278]

`requireAgent(exec)` 在 `cordis_inspect_query` / `inspect_self` / `define` / `run` / `stop` / `undefine` 六个 body 里调用：没有 `exec.agent` 就抛 `Cordis dynamic tools require an Agent-backed session`。[E: packages/extensions/tool-cordis/src/index.ts:29][E: packages/extensions/tool-cordis/src/index.ts:88] `cordis_inspect_list` 的 `execute` 只 `ctx.cordisInspect.list()`，不调 `requireAgent`。[E: packages/extensions/tool-cordis/src/index.ts:54]

`apply` 还在 `agent/pre-step` 上挂一条 waterfall：用户文本里的 `@pluginId`（捕获组 `[a-z]{3,6}-\d+`，须贴着空白或行边界）会追加一条 `source.kind: 'plugin'` 的 user message，把 identity / 版本指针 / 默认 `run|update` 注入下一轮，**不含**源码。[E: packages/extensions/tool-cordis/src/index.ts:381][E: packages/extensions/tool-cordis/src/index.ts:499]

## 用途定位

这组工具让 **已经跑在 DSH 进程里的会话** 临时扩展同一个进程：读 Host/Client Inspect 目录、定义不可变 Package、激活 / 停止 / 删除动态 Plugin。定义只活在当前进程内存；`CORDIS_SYSTEM_PROMPT` 写明 `define` 不改仓库、不改配置、不落盘，进程重启即消失。[E: packages/extensions/tool-cordis/src/prompt.ts:7]

`cordis_define` 只校验参数和语法并入库，**不**请求审批、**不**执行 `apply`、**不**改 `currentPackageId`。真正跑起来走 `cordis_run` → `DynamicCordisRunnerService.run`；有 Host 半时才 `evaluateHostCode`。[E: packages/extensions/tool-cordis/src/index.ts:157][E: packages/extensions/cordis-host-runner/src/index.ts:151][E: packages/extensions/cordis-host-runner/tests/runner.spec.ts:98]

适用场景是「结果属于当前正在跑的 harness、交付物是临时 runtime 扩展」。模型指导要求：做动态 Plugin 前先 `skill` 加载 `cordis-plugin-development`；用 Inspect 当 API 真源，不要把 Inspect 结果当业务数据缓存。[E: packages/extensions/tool-cordis/src/prompt.ts:24]

受限执行环境用来挡住误用（`require` / `setTimeout` / `fetch` 等会被 trap），**不是**恶意代码的 security boundary。动态代码经 `ctx.get` / `inject` 拿到的 Service 连真实 runtime。[E: packages/extensions/tool-cordis/src/prompt.ts:8][E: packages/extensions/cordis-host-runner/src/sandbox.ts:96]

## 输入 schema

以插件默认 `apply(ctx)`（无 Config）boot 后的模型可见参数为准。`defineTool.parameters` 走隐式开放 object：`required: true` 的键进入 JSON Schema `required`；未标 required 的键可省略。[E: packages/core/tools/src/schema.ts:454]

shipped `cordis` yml 的 `tool-cordis` 行没有 `config:`，因此产品默认就是这七张表。[E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:245][E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:246]

### `cordis_inspect_list`

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---:|---|---|---|
| （无） | — | — | — | `parameters: {}` | 列出 Host 本地 Provider 与 Client 同步过来的 manifest。[E: packages/extensions/tool-cordis/src/index.ts:49] |

### `cordis_inspect_query`

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---:|---|---|---|
| `platform` | `string` | 是 | 无 | enum `host` / `client` | Provider 所在平面。[E: packages/extensions/tool-cordis/src/index.ts:73] |
| `provider` | `string` | 是 | 无 | 必须来自 list 的 id | 例如 Host 侧 `Service` / `Event` / `Builtin` / `Tool`。[E: packages/extensions/tool-cordis/src/index.ts:74] |
| `method` | `string` | 是 | 无 | 必须是该 Provider 声明的方法名 | Host 侧分别是 `listService` / `listEvents` / `listBuiltins` / `listTools`。[E: packages/extensions/tool-cordis/src/index.ts:75][E: packages/extensions/tool-cordis/src/providers.ts:31] |
| `input` | `json` | 否 | 省略 | 必须满足该方法 input schema | schema 只声明可选 `json`。[E: packages/extensions/tool-cordis/src/index.ts:76] `Service.listService` 无 key 时 `queryServiceApi` 返回 `mode: 'catalog'` 紧凑目录；带精确名再查 `mode: 'service'` 合同。[E: packages/extensions/tool-cordis/src/api-catalog.ts:4691][E: packages/extensions/tool-cordis/src/api-catalog.ts:4692] 工具 description 也写了无 input 先逛目录。[E: packages/extensions/tool-cordis/src/index.ts:68] |

### `cordis_inspect_self`

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---:|---|---|---|
| `pluginId` | `string` | 否 | 省略 = 列全部 Plugin | 本会话 `cordis_define` 返回或 `@pluginId` 注入的稳定 id | 省略时 `mode: 'plugins'`。[E: packages/extensions/tool-cordis/src/index.ts:106] |
| `packageId` | `string` | 否 | 省略 = Plugin 摘要 | 不能单独出现 | 单独给 `packageId` 抛 `cordis_inspect_self packageId requires pluginId`。两者都给才返回源码与 diagnostics。[E: packages/extensions/tool-cordis/src/index.ts:107][E: packages/extensions/tool-cordis/src/index.ts:116] |

### `cordis_define`

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---:|---|---|---|
| `plugin` | object，`oneOf` 两支 | 是 | 无 | `additionalProperties: false` | `kind: 'new'` 只要 `idPrefix`；`kind: 'existing'` 只要已有 `pluginId`。[E: packages/extensions/tool-cordis/src/index.ts:160] |
| `plugin.idPrefix`（`new`） | `string` | 该支必填 | 无 | schema 只要求 string；runner 再核 `/^[a-z]{3,6}$/` | 3–6 个小写英文字母。Host 分配 `{prefix}-{n}`，例如 `dyn-1`。[E: packages/extensions/tool-cordis/src/index.ts:168][E: packages/extensions/cordis-host-runner/src/index.ts:165][E: packages/extensions/cordis-host-runner/src/registry.ts:156] |
| `plugin.pluginId`（`existing`） | `string` | 该支必填 | 无 | 必须是本 session 已有 Plugin | 在同一 Plugin 上追加不可变 Package，不覆盖旧版本。[E: packages/extensions/tool-cordis/src/index.ts:180] |
| `name` | `string` | 是 | 无 | runner `trim()` 后不能空 | 短可读 Package 名。[E: packages/extensions/tool-cordis/src/index.ts:185][E: packages/extensions/cordis-host-runner/src/index.ts:154] |
| `purpose` | `string` | 是 | 无 | runner `trim()` 后不能空 | 一句面向用户的用途。[E: packages/extensions/tool-cordis/src/index.ts:186][E: packages/extensions/cordis-host-runner/src/index.ts:155] |
| `code` | object | 是 | 无 | `additionalProperties: false`；至少 `host` 或 `client` 之一 | 各自是 **plain JavaScript function body**，必须 `return` 一个 Cordis Plugin。无 TS / JSX / import 变换。[E: packages/extensions/tool-cordis/src/index.ts:187][E: packages/extensions/cordis-host-runner/src/index.ts:156] |
| `code.host` | `string` | 否 | 省略 = 无 Host 半 | 与 `client` 至少填一个 | Host 半函数体。[E: packages/extensions/tool-cordis/src/index.ts:192] |
| `code.client` | `string` | 否 | 省略 = 无 Client 半 | 与 `host` 至少填一个 | 浏览器半函数体。[E: packages/extensions/tool-cordis/src/index.ts:193] |

### `cordis_run`

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---:|---|---|---|
| `pluginId` | `string` | 是 | 无 | 本会话 Plugin | `cordis_define` 返回的稳定 id。[E: packages/extensions/tool-cordis/src/index.ts:253] |
| `packageId` | `string` | 是 | 无 | 该 Plugin 下已定义的不可变 Package | 例如 `pkg-1`。[E: packages/extensions/tool-cordis/src/index.ts:254][E: packages/extensions/cordis-host-runner/src/registry.ts:166] |
| `mode` | `string` | 是 | 无 | enum `run` / `update` | `run`：首次激活、重启 `current`、或回滚到 `current`。`update`：从已有 `current` 切到**另一个** Package（即使当前已 stop）。[E: packages/extensions/tool-cordis/src/index.ts:255][E: packages/extensions/cordis-host-runner/src/index.ts:782][E: packages/extensions/cordis-host-runner/src/index.ts:794] |

### `cordis_stop`

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---:|---|---|---|
| `pluginId` | `string` | 是 | 无 | 本会话 Plugin | 停当前 Run 并取消未完成的审批 / 激活；定义、grant、版本指针保留。已停止则幂等成功。[E: packages/extensions/tool-cordis/src/index.ts:337] |

### `cordis_undefine`

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---:|---|---|---|
| `pluginId` | `string` | 是 | 无 | 本会话 Plugin | 先 stop / 取消审批，再删除全部 Package、grant、版本指针。之后 `@` 引用失效。[E: packages/extensions/tool-cordis/src/index.ts:360] |

## 输出 & 截断 / spill

registry 对成功值做 `output.schema` 校验，再调 `render`（以及可选 `presentationMeta`）。这七个工具**没有**自己的 spill 路径：不读 `ctx.spillStore`，不把正文卸到磁盘。[E: packages/core/tools/src/index.ts:1795][E: packages/core/tools/src/index.ts:1800]

| `name` | 规范值 | 模型看见的 `render` | `presentationMeta` |
|---|---|---|---|
| `cordis_inspect_list` | `{ providers }`（`ctx.cordisInspect.list()`） | `JSON.stringify(value, null, 2)` | 无 [E: packages/extensions/tool-cordis/src/index.ts:55] |
| `cordis_inspect_query` | `{ platform, provider, method, data }` | 同样 pretty JSON | 无 [E: packages/extensions/tool-cordis/src/index.ts:91] |
| `cordis_inspect_self` | `mode: 'plugins' \| 'plugin' \| 'package'` 的 JSON | 同样 pretty JSON | 无 [E: packages/extensions/tool-cordis/src/index.ts:120] |
| `cordis_define` | `{ pluginId, packageId, name, purpose, hasHostHalf, hasClientHalf }` | `Defined {pluginId}/{packageId} ({name}); it is not running yet. Use cordis_run to activate this Package.` | `{ pluginId, packageId }` [E: packages/extensions/tool-cordis/src/index.ts:212] |
| `cordis_run` | 开放 JSON。非终态：`status` + ids + `mode` + 可选 `currentPackageId` / `nextPackageId`。`status: 'running'` 时 `host` 带 `status` / `provides` / `waitingFor`；`client` 只有 `status` / `waitingFor`，没有 `provides` | `awaiting-approval` → `… is awaiting user approval ({pluginRunId}).`；`starting` → `… is starting asynchronously …`；否则 `… is running …` [E: packages/extensions/tool-cordis/src/index.ts:271] | `{ pluginId, packageId, pluginRunId }` [E: packages/extensions/tool-cordis/src/index.ts:278] |
| `cordis_stop` | `{ pluginId }` | `Dynamic Plugin {id} is stopped; its definition and versions remain.` | 无 [E: packages/extensions/tool-cordis/src/index.ts:341] |
| `cordis_undefine` | `{ pluginId, wasRunning }` | `Removed dynamic Plugin {id} and all of its Packages.` | 无 [E: packages/extensions/tool-cordis/src/index.ts:371] |

`cordis_run` 的 tool body **不等**最终成败：带未授权 Client 半时立即返回 `awaiting-approval`；已授权则返回 `starting`。Host-only Package 在同一调用里就能走到 `running`。[E: packages/extensions/cordis-host-runner/src/index.ts:303][E: packages/extensions/cordis-host-runner/tests/runner.spec.ts:150][E: packages/extensions/cordis-host-runner/tests/runner.spec.ts:190]

失败走 registry `toolErrorResult`：`content` 为 `Error: <message>`。常见来源：`requireAgent`、inspect `packageId` 缺 `pluginId`、`define` 空名 / 空 purpose / 两边都没 code / `idPrefix` 不合、`precheckCode` 语法失败、`run` / `undefine` 的 `receipt.ok === false`。

`standard` / `code` / `cordis` 的 compaction `tool-result-pruner` 可能在事后把过长 `tool/result` 换成 head/tail，那是 compaction 层，不是这组工具的输出合同。

## 背后的 seam

| 角色 | 落点 |
|---|---|
| Definition | agent-preset 行 `id: tool-cordis` / `name: '@deepseek-ai/dsh-tool-cordis'`，加上七个 `defineTool` 合同。[E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:245] |
| Provider | host 面 `@deepseek-ai/dsh-cordis-host-runner`：`DynamicCordisRunnerService` 以服务名 `dynamicCordisRunner` 发布，构造时再 `new CordisInspectRegistryService(ctx)` 发布 `cordisInspect`。`static inject = ['tools']`。`Config.vmTimeoutMs` 默认 `5000`。[E: packages/extensions/cordis-host-runner/package.json:2][E: packages/extensions/cordis-host-runner/src/index.ts:140][E: packages/extensions/cordis-host-runner/src/inspect-registry.ts:54][E: packages/extensions/cordis-host-runner/src/index.ts:125][E: packages/extensions/cordis-host-runner/src/index.ts:128] |
| Consumer | 七个 `cordis_*` 工具。`tool-cordis` 自己不 `provide`，所以不必进 preset `isolate` realm。 |

shipped 组合里，只有 `dsh-web-app` 在 host 面 insert `id: cordis-host-runner`。[E: packages/bundle/web-app/cordis.patch.yml:102][E: packages/bundle/web-app/cordis.patch.yml:103] `dsh-base` 与 `dsh-headless` 的 patch **没有**这一行；缺 Provider 时 `tool-cordis` 的 `inject` 不会满足，七个名字进不了 catalog。

换 / 卸掉 `dynamicCordisRunner` 会带走：进程内 Plugin/Package 身份铸造、session 所有权、`define`/`run`/`stop`/`undefine`、Host 半 `node:vm` 求值、Client 审批请求、`@pluginId` 解析。换 / 卸掉 `cordisInspect` 会带走：Host+Client Provider 目录、`query` 路由、Client 查询的 pending 表。不会带走：`ctx.tools` 注册表本身、approval/sandbox 的文件/shell 政策、四个 shipped preset 里其它 native 工具。

`cordis_run` 成功走到 Host 半时，求值发生在 `createSandbox` + `evaluateHostCode`。`createSandbox` 的 realm 只有 traps、tagged `console`、`harness`（`defineTool` / `registerTool` 加 extras）、`btoa`/`atob`/`TextEncoder`/`TextDecoder`——**没有**全局 `ctx`。[E: packages/extensions/cordis-host-runner/src/sandbox.ts:129][E: packages/extensions/cordis-host-runner/src/sandbox.ts:130] `ctx` 是 Plugin `apply(ctx)` 的参数，由 `startHostHalf` 在求值返回之后把 fiber 挂到名为 `cordis-dynamic` 的 group 时注入。[E: packages/extensions/cordis-host-runner/src/sandbox.ts:229][E: packages/extensions/cordis-host-runner/src/index.ts:899][E: packages/extensions/cordis-host-runner/src/lifecycle.ts:23] `require` / 定时器 / `fetch` 是抛错 trap；`process` / `Buffer` 等数据全局保持 `undefined`。[E: packages/extensions/cordis-host-runner/src/sandbox.ts:97][E: packages/extensions/cordis-host-runner/src/sandbox.ts:111] `cordis-dynamic` group 名在 runner 里 `this.rootCtx.plugin({ name: 'cordis-dynamic', apply: () => {} })`。[E: packages/extensions/cordis-host-runner/src/index.ts:1238]

`hostInspectProviders` 在 Host 上登记四个只读 Provider：`Service.listService`、`Event.listEvents`、`Builtin.listBuiltins`、`Tool.listTools`（按调用 Agent 的 `ctx.tools.schemas`）。[E: packages/extensions/tool-cordis/src/providers.ts:29][E: packages/extensions/tool-cordis/src/providers.ts:61]

## 执行管线

模型写出其中一个 `cordis_*` 后，loop 经 `ctx.tools.execute` 进入 registry：`tools/pre-execute` → 可选 `ask` → monotonic `guard` → `tools/execute`（around-dispatch，含 checkpoint / timeout 包装）→ `ToolDefinition.execute` → `tools/post-execute` → `output.render`。[E: packages/core/tools/src/index.ts:1342][E: packages/core/tools/src/index.ts:1475][E: packages/core/tools/src/index.ts:1549]

对本套件的挂点：

- **`tools/pre-execute`**：`tool-cordis` 不注册 listener，也不返回 `ask`。waterfall 默认 `{ kind: 'allow' }`。Client 半审批**不是**这条 `ctx.approval.request` 门，而是 `cordis_run` body 里 `DynamicCordisRunnerService.run` 发出的 `cordis/request-run`。[E: packages/core/tools/src/index.ts:1477][E: packages/extensions/cordis-host-runner/src/index.ts:291]
- **调度**：七个名字都没有 `isConcurrencySafe`，`executionMode` 为 `exclusive`，不会进 parallel 滚动池。[E: packages/core/tools/src/index.ts:1278]
- **`tools/execute` 包装**：
  - `session-checkpoint-policy` 仅在「有 `exec.agent` 且 `exec.parent === undefined`」时 `flush` session，再 `next()`；flush 后若已 abort，返回 `ABORTED_BEFORE_DISPATCH`，body 不跑。除 `cordis_inspect_list` 外的六个工具会 `requireAgent`，顶层调用会撞上这条。[E: packages/session/session-checkpoint-policy/src/index.ts:70][E: packages/session/session-checkpoint-policy/src/index.ts:71][E: packages/extensions/tool-cordis/src/index.ts:54]
  - `timeout-policy` 读 `definition.timeoutMs`；七个工具都未声明，包装器直接 `next()`。Host 半同步求值另有 runner `vmTimeoutMs`（默认 5000），作为 `runInContext` 的 `timeout`，不是 tool-call deadline。async body 能逃出该同步超时 [I]（`node:vm` 只约束同步段）。[E: packages/guard/timeout-policy/src/index.ts:57][E: packages/guard/timeout-policy/src/index.ts:59][E: packages/extensions/cordis-host-runner/src/sandbox.ts:232]
- **`tools/post-execute`**：不注册 listener，默认 `accept`。[E: packages/core/tools/src/index.ts:1745]
- **sandbox**：不挂 `ctx.sandbox` / `sandbox_permissions`。文件副作用沙箱只罩 fs/shell 类工具。Host 半的 `node:vm` 是合作式隔离，不是 containment。
- **Code Mode**：shipped `code` preset **不装** `tool-cordis`，模型在 PTC 会话里既没有这七个 native 名，SDK 里也不会出现它们。

## Preset 装配

成员资格只认 `apps/cli/config/agent-presets/{minimal,standard,code,cordis}/agent.cordis.yml`，不以 package 存在为准。

| preset | 装 `@deepseek-ai/dsh-tool-cordis`？ | `disabled` | isolate | shipped Config |
|---|---|---|---|---|
| `minimal` | **否** | — | — | 文件无 `id: tool-cordis`。成员停在 `filesystem` 组的 `str-replace-editor`。[E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:59] |
| `standard` | **否** | — | — | 成员停在 `tool-web`。mount `standard` 后 catalog **不含** `cordis_define`。[E: apps/cli/config/agent-presets/standard/agent.cordis.yml:247][E: apps/cli/tests/web-agent-presets.e2e.ts:326] |
| `code` | **否** | — | — | 相对 `standard` 的可加载增量是末尾 `tool-presentation` `mode: code`，不是 `tool-cordis`。[E: apps/cli/config/agent-presets/code/agent.cordis.yml:259] |
| `cordis` | **是** | 无 | 无 | `- id: tool-cordis` / `name: '@deepseek-ai/dsh-tool-cordis'`，无 `config`。e2e 断言 catalog 含全部七个名字，并仍含 `bash` / `read` / `edit` / `skill`。[E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:245][E: apps/cli/tests/web-agent-presets.e2e.ts:270][E: apps/cli/tests/web-agent-presets.e2e.ts:271] |

`tool-cordis` 行不进 `planning` / `compaction` / `delegation` isolate 组：它只往 host 已有的 `tools` / `systemPrompt` / `dynamicCordisRunner` / `cordisInspect` 注册，不 `provide` 新服务。

## execute() 走读

符号：`apply` @ `packages/extensions/tool-cordis/src/index.ts`；`DynamicCordisRunnerService.define` / `run` / `stop` / `undefine` @ `packages/extensions/cordis-host-runner/src/index.ts`；`evaluateHostCode` @ `sandbox.ts`。

1. **公共门槛。** `cordis_inspect_list` 不调 `requireAgent`。另外六个 body 经 `requireAgent`。inspect / define / run / stop / undefine 用 `exec.agent.id` 当 session 所有权键；跨 session 的 `run`/`stop` 在 runner 里变成 `plugin-missing`。[E: packages/extensions/tool-cordis/src/index.ts:54][E: packages/extensions/tool-cordis/src/index.ts:88][E: packages/extensions/cordis-host-runner/tests/runner.spec.ts:143]

2. **`cordis_inspect_list`。** `execute` 同步 `Promise.resolve({ providers: ctx.cordisInspect.list() })`。`list()` 先排 Host 已登记 Provider，再拼 Client `syncInspectManifest` 镜像。[E: packages/extensions/tool-cordis/src/index.ts:55][E: packages/extensions/cordis-host-runner/src/inspect-registry.ts:91]

3. **`cordis_inspect_query`。** `ctx.cordisInspect.query(platform, provider, method, input, agent, exec.signal)`。Host：按 manifest 校验 input → 调本地 `query` → 校验 output。Client：校验后发 `cordis/inspect-query`，一直等到页面 `resolveInspectQuery` 或 `exec.signal` abort。[E: packages/extensions/tool-cordis/src/index.ts:83][E: packages/extensions/cordis-host-runner/src/inspect-registry.ts:116][E: packages/extensions/cordis-host-runner/src/inspect-registry.ts:190]

4. **`cordis_inspect_self`。** 无 `pluginId` → `listPlugins` 映射成 `mode: 'plugins'`。只有 `pluginId` → `inspectPlugin`，带每个 Package 的 `isCurrent` / `isNext`。两者都有 → `inspectPackage` + snapshot，返回 `code`（Host/Client 源）和 `runtime.host|client`（`provides` / `waitingFor` / error）。`packageId` 单独出现直接抛错。[E: packages/extensions/tool-cordis/src/index.ts:120][E: packages/extensions/tool-cordis/src/index.ts:126][E: packages/extensions/tool-cordis/src/index.ts:138]

5. **`cordis_define`。** 把 `plugin.kind` 映射成 runner 请求；`code.host` / `code.client` 只在有值时展开。`DynamicCordisRunnerService.define`：trim `name`/`purpose`；两边都缺则抛；对每一半 `precheckCode`（`new Script` 包一层 `async () => { … }`，不执行）。`kind: 'new'` 校验 `idPrefix` 并 `mintPluginId`；`kind: 'existing'` 要求同 session。然后 `mintPackageId`（`pkg-n`）写入 `plugin.packages`，返回 receipt。**到这里 fiber 还没挂，`apply` 没跑。** [E: packages/extensions/tool-cordis/src/index.ts:221][E: packages/extensions/cordis-host-runner/src/index.ts:159][E: packages/extensions/cordis-host-runner/src/sandbox.ts:209][E: packages/extensions/cordis-host-runner/tests/sandbox.spec.ts:168]

6. **`cordis_run`：计划。** `resolvePlan`：Plugin 必须本 session 拥有；Package 必须存在。`mode === 'update'` 且（尚无 `current` 或 target 已是 `current`）→ `invalid-mode`。`mode === 'run'` 且已有 `current` 且 target ≠ `current` → 必须改用 `update`。已有 in-flight start → `transition-in-flight`。signal 在创建请求前已 abort → `cancelled`。[E: packages/extensions/cordis-host-runner/src/index.ts:782][E: packages/extensions/cordis-host-runner/src/index.ts:794][E: packages/extensions/cordis-host-runner/src/index.ts:257]

7. **`cordis_run`：Host-only。** 没有 `clientCode` 时 `run` 直接 `activate` → `startHost`：`createSandbox` + `evaluateHostCode(..., vmTimeoutMs)`；返回值必须是带 `apply(ctx)` 的 Plugin（或 Plugin 函数），否则教学型报错（含「忘了 `return`」）。然后 `startHostHalf` 把 fiber 挂到 `cordis-dynamic` group。成功则 `currentPackageId` 变成该 Package，tool 返回 `status: 'running'`，`host.status` / `host.provides` / `host.waitingFor` 来自 `missingServices` / `providedServices`；`client` 只有 `status` / `waitingFor`。[E: packages/extensions/cordis-host-runner/src/index.ts:270][E: packages/extensions/cordis-host-runner/src/index.ts:899][E: packages/extensions/cordis-host-runner/src/index.ts:900][E: packages/extensions/cordis-host-runner/src/index.ts:905][E: packages/extensions/cordis-host-runner/src/lifecycle.ts:23][E: packages/extensions/tool-cordis/src/index.ts:314][E: packages/extensions/tool-cordis/src/index.ts:315][E: packages/extensions/tool-cordis/src/index.ts:318][E: packages/extensions/tool-cordis/src/inspect.ts:119]

8. **`cordis_run`：带 Client 半。** 未在 `approvedClientPackages` 且未开 `clientVersionUpdatesApproved` 时 `requiresApproval = true`，`status = 'awaiting-approval'`，emit `cordis/request-run`，tool **立即返回**，不在 body 里等 UI。单次勾选只授权当前 Package；双勾选授权该 Plugin 后续版本。已授权则 tool 返回 `starting`，Host/Client 继续异步；成功、拒绝、技术失败经 Run 状态与 steering 回灌。用户拒绝后模型不得再要一次审批。[E: packages/extensions/cordis-host-runner/src/index.ts:278][E: packages/extensions/cordis-host-runner/src/index.ts:303][E: packages/extensions/tool-cordis/src/prompt.ts:18][E: packages/extensions/cordis-host-runner/src/index.ts:350]

9. **`cordis_run` 的 tool 包装。** runner 对 `host-half-failed` 是 `resolves` 成 `{ ok: false, reason: 'host-half-failed' }`，自己不 throw。工具包装在 `receipt.ok === false` 时才 `throw new Error(receipt.message)`。`status !== 'running'` 原样投影 ids。`status === 'running'` 再读 `snapshot` 填 Host fiber 与 Client `waitingFor`。[E: packages/extensions/cordis-host-runner/tests/versioning.spec.ts:26][E: packages/extensions/tool-cordis/src/index.ts:292]

10. **`cordis_stop`。** `dynamicCordisRunner.stop`。若 `!ok && reason !== 'not-running'` 才抛；已停止返回 `{ pluginId }`。会取消 pending 审批并 `retract` 活动 Run；`currentPackageId` / Packages / grants 留下。[E: packages/extensions/tool-cordis/src/index.ts:345][E: packages/extensions/cordis-host-runner/src/index.ts:460]

11. **`cordis_undefine`。** `undefine`：取消 pending、retract、从 registry `delete`。`!ok` 则抛。返回 `{ pluginId, wasRunning }`。[E: packages/extensions/tool-cordis/src/index.ts:374][E: packages/extensions/cordis-host-runner/src/index.ts:216]

12. **`@pluginId` 注入。** `referencedPluginIds` 只扫 `message.source.kind === 'user'` 的文本。命中则 `reference(agent, id)`：存在就渲染 `<cordis_dynamic_plugin_context>` JSON +「用 `existing` 追加 Package、不要另开新 Plugin」；不存在则说明可能已删、属别的 Session、或进程重启丢失，禁止默默新建。[E: packages/extensions/tool-cordis/src/index.ts:501][E: packages/extensions/tool-cordis/src/index.ts:516][E: packages/extensions/tool-cordis/src/index.ts:525]

## 设计动机·edge

DSH 把「改自己正在跑的组合」做成 **opt-in 的 agent-preset 工具集**，而不是进程级光环：`standard` 会话看不到 `cordis_define`。[E: apps/cli/tests/web-agent-presets.e2e.ts:326] 这和 Claude / Codex 把 runtime 自省藏在产品内部、或不暴露给模型的做法不同；也和 Pi 一类「只有静态 skill、没有 live plugin 生命周期」不同。

和常见 peer 的关键差异：

- **define ≠ run。** 模型先入库给用户看源码（`presentDefineCall.rawInput`），再显式 `cordis_run`。测试标题就是 `records a definition without running it`。[E: packages/extensions/cordis-host-runner/tests/runner.spec.ts:98][E: packages/extensions/tool-cordis/src/present.ts:69]
- **版本不可变。** 改代码必须 `kind: 'existing'` 追加 Package；`update` 失败时 `currentPackageId` 不动，`nextPackageId` 停在失败目标，不会自动重启旧版本。[E: packages/extensions/cordis-host-runner/tests/versioning.spec.ts:28]
- **Client 审批挂在 runner，不挂在 `tools/pre-execute`。** Host-only 无审批；未授权 Client 返回 `awaiting-approval` 后结束本 turn。这不是 `ask|never` / `allowed-once` 那条工具审批脊柱。
- **vm 不是 security sandbox。** trap 只挡误用；拿到真实 Service 就能碰真实 runtime。yml 头把本会话比作 shell access，那是注释立场 [I]，不是可执行登记名。
- **没有 `cordis_mount` / `cordis_unmount`。** 现行动词是 define / run / stop / undefine + 三条 inspect。`startHostHalf` 在 `already registered` 时的教学文案仍写 `cordis_runtime_inspect what:"temporary"`，那不是现行 `defineTool` 名。[E: packages/extensions/cordis-host-runner/src/lifecycle.ts:39] `present.ts` 仍导出未使用的 `presentRuntimeInspectCall` [I]。
- **session 隔离。** inventory 全局可见（给面板列全进程 Plugin），但 `run`/`stop`/`undefine`/`inspect_self` 按 `sessionId === agent.id` 守写。
- **`tool-cordis/tests/cordis-lifecycle.spec.ts` 不覆盖这七个名字。** 它测的是 vendored Cordis 的 `ctx.effect` / child fiber 所有权（reentrant restart、setup 抛错回滚、INACTIVE_EFFECT）。七个工具的行为回归在 `cordis-host-runner/tests` 的 `dynamic runner definitions` / `dynamic runner dispatch`。[E: packages/extensions/tool-cordis/tests/cordis-lifecycle.spec.ts:9][E: packages/extensions/cordis-host-runner/tests/runner.spec.ts:50]

## Sources

- packages/extensions/tool-cordis/src/index.ts
- packages/extensions/tool-cordis/src/prompt.ts
- packages/extensions/tool-cordis/src/present.ts
- packages/extensions/tool-cordis/src/providers.ts
- packages/extensions/tool-cordis/src/api-catalog.ts
- packages/extensions/tool-cordis/src/inspect.ts
- packages/extensions/tool-cordis/package.json
- packages/extensions/tool-cordis/tests/cordis-lifecycle.spec.ts
- packages/extensions/cordis-host-runner/src/index.ts
- packages/extensions/cordis-host-runner/src/sandbox.ts
- packages/extensions/cordis-host-runner/src/registry.ts
- packages/extensions/cordis-host-runner/src/inspect-registry.ts
- packages/extensions/cordis-host-runner/src/lifecycle.ts
- packages/extensions/cordis-host-runner/package.json
- packages/extensions/cordis-host-runner/tests/runner.spec.ts
- packages/extensions/cordis-host-runner/tests/sandbox.spec.ts
- packages/extensions/cordis-host-runner/tests/versioning.spec.ts
- packages/bundle/web-app/cordis.patch.yml
- packages/core/tools/src/index.ts
- packages/core/tools/src/schema.ts
- packages/guard/timeout-policy/src/index.ts
- packages/session/session-checkpoint-policy/src/index.ts
- apps/cli/config/agent-presets/cordis/agent.cordis.yml
- apps/cli/config/agent-presets/minimal/agent.cordis.yml
- apps/cli/config/agent-presets/standard/agent.cordis.yml
- apps/cli/config/agent-presets/code/agent.cordis.yml
- apps/cli/tests/web-agent-presets.e2e.ts

## 相关

- [工具调用解剖](../../spine/tool-call-anatomy.md) — `tools/pre-execute` → execute → `tools/post-execute`；`ask|never` 与本页的 `cordis/request-run` 不是同一条门。
- [模型可见工具目录](../../reference/tools-catalog.md) — boot 后 `ctx.tools.schemas()` 总表；七个 `cordis_*` 只在 `cordis` preset 会话出现。
- [cordis preset](../presets/cordis.md) — shipped 创造模式成员表、`customSkillDirs`、persona 两平面；本页只写七个工具的 schema / 管线 / runner。
- [能力缝](../../spine/capability-seams.md) — Definition / Provider / Consumer；本页的三角是 `tool-cordis` / `cordis-host-runner` / 七个 `cordis_*`。
- [preset 发现与挂载](../../subsystems/composition/agent-presets.md) — standing mount、isolate、leakedServices；解释为何 `tool-cordis` 可以不进 realm。
