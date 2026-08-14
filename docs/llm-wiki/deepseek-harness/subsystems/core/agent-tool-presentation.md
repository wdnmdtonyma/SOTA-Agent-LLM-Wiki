---
id: subsys.core.agent-tool-presentation
title: 工具呈现模式
kind: subsystem
tier: T2
pkg: core
source:
  - packages/core/agent-tool-presentation/src/index.ts
  - packages/core/agent-tool-presentation/tests/agent-tool-presentation.spec.ts
  - apps/cli/config/agent-presets/code/agent.cordis.yml
  - apps/cli/config/agent-presets/standard/agent.cordis.yml
  - packages/core/tools/src/index.ts
  - packages/core/system-prompt/src/index.ts
  - packages/preset/agent-presets/src/index.ts
  - packages/preset/agent-presets/src/mount.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/headless/cordis.patch.yml
  - vendor/cordis/src/events.ts
  - vendor/cordis/src/registry.ts
  - vendor/cordis/src/fiber.ts
  - apps/cli/tests/web-agent-presets.e2e.ts
  - packages/bundle/base/tests/base.spec.ts
symbols:
  - presentAs
  - apply
  - Config.mode
related:
  - subsys.core.tools
  - subsys.core.code-mode
  - surface.presets.code
  - spine.overview
  - spine.trace-code-mode
  - subsys.composition.agent-presets
  - subsys.execution.code-runtime
evidence: explicit
status: verified
updated: 47f943859b
---

> `@deepseek-ai/dsh-agent-tool-presentation` 是 **agent-preset 面的一行**：host 面 `ctx.tools` 注册表、调度器、API presenter 仍坐在进程级；preset 只在 standing scope 上调用 `ctx.tools.presentAs(mode)`，声明「这个 composition 覆盖的 Agent 模型看见哪种工具形」。它不是又一个 `dsh-tool-*`，也不实现 `run_code`。DSH 主线是 `profile → bundle → agent preset`；本行只改 preset 面投影，不换 host 面 Definition。

## 能回答的问题

- 工具呈现 `mode` 写在 host `tools` 行还是 preset 行？省略本行会落到哪一层默认？
- `apply` 对 `native` / `code` / `both` 各走哪条？静态 `inject` 为什么只有 `tools`？
- `presentAs` 为什么必须在 scoped context？和 `DSH_TOOLS_MODE` 差在 host 面还是 agent-preset 面？
- shipped 哪个 `agent.cordis.yml` 挂 `id: tool-presentation`？`standard` / `minimal` / `cordis` 挂不挂？
- 缺 `ctx.codeRuntime` 时 `presentAs` 会不会执行？`mountPreset` 的 `inactiveRows` / `leakedServices` 怎么审这一行？
- `mode: code` 之后，`system-prompt/assemble` 与 `tools/pre-execute` 两条 waterfall 各看见什么？不调用 `next()` 会怎样？

## 职责边界

本包拥有：Cordis 插件名 `tool-presentation`、必填 `Config.mode`、以及 `apply` 里对 `ctx.tools.presentAs` 的条件调用（`native` 立刻声明；`code` / `both` 先 `ctx.inject(['codeRuntime'], …)`）。[E: packages/core/agent-tool-presentation/src/index.ts:28] [E: packages/core/agent-tool-presentation/src/index.ts:51] [E: packages/core/agent-tool-presentation/src/index.ts:64] [E: packages/core/agent-tool-presentation/src/index.ts:69]

本包**不**拥有：

- host 面注册表、`schemas` / `execute`、`tools/pre-execute` 管线、`ToolLayer.mode` 存储 —— 那些是 [`subsys.core.tools`](tools.md) 的 `ToolRuntime`。
- 预留运输 `run_code`、SDK 渲染、子调度、`tools/code-dispatch-log` —— [`subsys.core.code-mode`](code-mode.md)。本页不写 `run_code` JSON schema。
- `ctx.codeRuntime` 的 Provider（web / headless 插入的 `@deepseek-ai/dsh-code-runtime-worker-thread`）—— [`subsys.execution.code-runtime`](../execution/code-runtime.md)。
- preset 发现、standing mount、`bindScopeParent`、`inactiveRows`、`leakedServices` —— [`subsys.composition.agent-presets`](../composition/agent-presets.md)。
- shipped `code` preset 的完整成员表（persona / isolate 组 / 各 `dsh-tool-*` 行）—— [`surface.presets.code`](../../surface/presets/code.md)。
- 不实现 agent-loop，不往 `SessionEventMap` 写事件。companion `./invariant` 的 installer 是空函数：呈现关系由 `dsh-tools` 持有。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/core/agent-tool-presentation/src/index.ts` | 插件 `name` / `inject` / `Config` / `apply` |
| `packages/core/agent-tool-presentation/tests/agent-tool-presentation.spec.ts` | 同进程 code vs native、缺 runtime pending、`Config` 无默认 |
| `packages/core/tools/src/index.ts` | `presentAs`、`modeFor`、`wireSchemas`、collapse 在 `tools/pre-execute` **之前** |
| `apps/cli/config/agent-presets/code/agent.cordis.yml` | shipped 唯一挂本行的 preset；`config.mode: code` |
| `apps/cli/config/agent-presets/standard/agent.cordis.yml` | 对照：以 `tool-web` 收束，无 `tool-presentation` |
| `packages/preset/agent-presets/src/index.ts` | standing scope + `bindScopeParent` 让声明覆盖 join 上来的 Agent |
| `packages/preset/agent-presets/src/mount.ts` | `inactiveRows` / `leakedServices` 激活审计 |
| `packages/bundle/{base,web-app,headless}/cordis.patch.yml` | host `tools` 默认；`DSH_TOOLS_MODE`；`code-runtime` insert |
| `vendor/cordis/src/events.ts` | waterfall：不调用 `next()` 不会 `shift` |
| `vendor/cordis/src/registry.ts` | `ctx.inject(deps, cb)` = 子 fiber 等依赖 |

## 数据模型

| 符号 | 形状 | 谁写 | 谁读 |
|---|---|---|---|
| `Config.mode` | `'native' \| 'code' \| 'both'`，`.required()`，无 schema 默认 | preset 行 `config.mode` | `apply` 分支 |
| `ToolRuntime` 的 `Config.mode` | 同三值，`.default('native')` | host `tools` 行 / `DSH_TOOLS_MODE` | `defaultMode` |
| `ToolLayer.mode` | 一格，不是可合并 entry 表 | `presentAs` 写入 scoped 层 | `modeFor` 沿 scope 链从近到远 |
| 静态 `inject` | `['tools']` | 插件元数据 | Loader / `inactiveRows`（entry 自己的 `fiber.inject`） |
| 动态 wait | `ctx.inject(['codeRuntime'], …)` | `apply` 在 `code`/`both` | 子 fiber；`presentAs` 只在 callback 里发生 |
| Cordis `name` | `'tool-presentation'` | 插件导出 | yml `id` 仍是 `tool-presentation`；包名是 `@deepseek-ai/dsh-agent-tool-presentation` |

`mode` 三值的模型可见后果由 registry 投影，不由本包复制一份 catalog：`native` = 每个可见 schema；`code` = 只把 `run_code` 送进 wire，并生成 SDK section；`both` = schema 两边都送。[E: packages/core/agent-tool-presentation/src/index.ts:51] [E: packages/core/tools/src/index.ts:791]

## 控制流

### 1. host 面先 settle，preset 行后挂

1. `dsh-base` 插入 host `id: tools` / `@deepseek-ai/dsh-tools`，yml **不**写 `mode`，schema 默认 `native`。[E: packages/bundle/base/cordis.patch.yml:425] [E: packages/core/tools/src/index.ts:791]
2. `dsh-web-app` 与 `dsh-headless` 把同一 `tools` 行的 `mode` 写成 `!!js process.env.DSH_TOOLS_MODE`（未设则仍是 schema 默认），并 `insert` `code-runtime` = `@deepseek-ai/dsh-code-runtime-worker-thread`。[E: packages/bundle/web-app/cordis.patch.yml:41] [E: packages/bundle/web-app/cordis.patch.yml:49] [E: packages/bundle/headless/cordis.patch.yml:20]
3. 只有 web 再 `insert` `agent-presets` 且 `default: standard`。headless **没有** roster，模型可见工具留在 host 全局层；本插件的 shipped 行不会被 headless 自动挂上。[E: packages/bundle/web-app/cordis.patch.yml:424]
4. 会话选 `code`（或任何自写 preset 含本行）时，`AgentPresets.ensureStanding` 用 `{ agentPreset: preset.id }` 建 standing key，`createScope` 后 `mountPreset`。[E: packages/preset/agent-presets/src/index.ts:514] [E: packages/preset/agent-presets/src/index.ts:524]
5. `AgentPresets.mount` 一次 `bindScopeParent(agentKey, standing.key)`：standing 上的 `presentAs` 沿 scope 链被 join 上来的 Agent 继承。[E: packages/preset/agent-presets/src/index.ts:286] 子代理 `composeFrom` 对同一 `standing.key` 再绑一次，不重挂 composition。[E: packages/preset/agent-presets/src/index.ts:323]

### 2. `apply`：声明本身是 effect

6. Loader 校验 `Config`：`mode` 缺省直接抛，单测 `Config({} as never)` 钉死。省略**整行**才是「用部署默认」；挂了行却不写 `mode` 等于白挂，schema 拒绝。[E: packages/core/agent-tool-presentation/src/index.ts:51] [E: packages/core/agent-tool-presentation/tests/agent-tool-presentation.spec.ts:127]
7. 静态 `inject` 只有 `['tools']`。`native` 必须能在没有 `codeRuntime` 的部署上 mount，所以 `codeRuntime` 不进插件元数据。[E: packages/core/agent-tool-presentation/src/index.ts:35] [E: packages/core/agent-tool-presentation/tests/agent-tool-presentation.spec.ts:63]
8. `config.mode === 'native'`：立刻 `ctx.tools.presentAs('native')` 然后 `return`。`presentAs` 自己走 `ctx.effect`，dispose 跟行一起卸，apply 不再包一层。[E: packages/core/agent-tool-presentation/src/index.ts:64] [E: vendor/cordis/src/fiber.ts:418]
9. `code` / `both`：`ctx.inject(['codeRuntime'], runtimeCtx => runtimeCtx.tools.presentAs(config.mode))`。`RegistryService.inject` 是 `ctx.plugin({ inject, apply })` 的简写，缺服务时子 fiber 的 epoch 停在 `INACTIVE`，callback 不跑。[E: packages/core/agent-tool-presentation/src/index.ts:69] [E: vendor/cordis/src/registry.ts:300]
10. 单测：host 不挂 runtime 时 `row.ctx.get('codeRuntime')` 为 `undefined`，`assemble` 仍是 native `echo`；runtime 后到再装配则只剩 `run_code`。[E: packages/core/agent-tool-presentation/tests/agent-tool-presentation.spec.ts:109] [E: packages/core/agent-tool-presentation/tests/agent-tool-presentation.spec.ts:121]

### 3. `presentAs` 写进 scoped `ToolLayer`

11. `presentAs@packages/core/tools/src/index.ts` 要求 `scopeOf(ctx)`；全局 context 抛错，并指明进程级呈现是 host `tools` 行的 `mode` 字段。[E: packages/core/tools/src/index.ts:949]
12. 同一 scope 第二份声明抛 `conflicts with "<已有>" already declared`：一格答案，不是 merge。[E: packages/core/tools/src/index.ts:956]
13. `modeFor` 从 scope 链近端往远端找第一个 `ToolLayer.mode`，都没有则 `defaultMode`。standing 声明覆盖所有 parent 到它的 Agent；Agent 自己若再声明会盖过 preset。[E: packages/core/tools/src/index.ts:908]
14. 非 `native` 时 `presentAs` 还在**本 scope** 注册 `tools:code-only` / `tools:sdk` 两个 section。卸行后 `layer.mode = undefined`，单测装配回到 `echo` 且没有 `tools:sdk`。[E: packages/core/agent-tool-presentation/tests/agent-tool-presentation.spec.ts:97]

### 4. 装配 waterfall 必须 `next()`

15. host `ToolRuntime` 构造时 `ctx.systemPrompt.tools(context => this.wireSchemas(context.scope))`。`assemble` 先按 scope 收集 schema，再跑 `system-prompt/assemble` waterfall。[E: packages/core/system-prompt/src/index.ts:532]
16. `mode === 'code'` 时 `wireSchemas` 把 schema 滤成 `schema.name === RUN_CODE_NAME`，`knownNames` 也只剩运输名。插件单测：code agent 的 tools = `[RUN_CODE_NAME]`，同进程 native agent 仍是 `['echo']`；`both` 是 `['echo', RUN_CODE_NAME]`。[E: packages/core/tools/src/index.ts:996] [E: packages/core/agent-tool-presentation/tests/agent-tool-presentation.spec.ts:74] [E: packages/core/agent-tool-presentation/tests/agent-tool-presentation.spec.ts:85]
17. shipped yml 路径：`mount(agentCtx, 'code')` 后 `assembly.tools === ['run_code']`；同进程 `standard` 会话仍含 `bash`、不含 `run_code`。[E: apps/cli/tests/web-agent-presets.e2e.ts:301] [E: apps/cli/tests/web-agent-presets.e2e.ts:310] [E: apps/cli/tests/web-agent-presets.e2e.ts:311]
18. Cordis `Events.waterfall`：最后一个参数是 innermost `next`；listener 必须调用传入的 `next()` 才会 `cbs.shift()` 到下一层。不调用就停在本层，内层（含「把 `wireSchemas` 结果当权威」的 inner）不跑。[E: vendor/cordis/src/events.ts:237] [E: vendor/cordis/src/events.ts:242]
19. 本插件**不**注册 `system-prompt/assemble` listener。它只改 `ToolLayer.mode`，让 inner 收集到的 `assembly.tools` 已经是投影后的列表。别的包若在 waterfall 里改 `tools` 且不 `next()`，会换掉本行刚选出的呈现。

### 5. 执行：collapse 在 `tools/pre-execute` 之前

20. `collapses` 用 `modeFor(scope)`，**不是** `defaultMode`。preset 在 native 部署上选 `code` 时，模型直调 native 名仍被塌缩。[E: packages/core/tools/src/index.ts:1325]
21. `createExecution` 在进 `tools/pre-execute` **之前**判定 collapse：被塌缩的调用拿 `UNKNOWN_TOOL`（文案指向「进 `run_code` 再调」），`pre-execute` listener、approval `ask`、guard 都看不见它。[E: packages/core/tools/src/index.ts:1381]
22. 真正进管线的调用才 `waterfall(..., 'tools/pre-execute', exec, () => allow)`。默认 inner 是 `allow`；listener 不 `next()` 则整条链停在该层，inner `allow` 不执行。[E: packages/core/tools/src/index.ts:1476] [E: vendor/cordis/src/events.ts:237]
23. 带 `parent` 的 SDK 子调度 `nested === true`，`collapses` 为假，走同一套 `execute`。模型历史只收外层 curated 结果 —— `model-visible ⟺ logged` 仍成立，只是模型本轮看见的名字是 `run_code`。子调度细节在 [`subsys.core.code-mode`](code-mode.md)。

### 6. isolate 与 `leakedServices`

24. `mountPreset` 在树 settle 后先 `inactiveRows`，再 `leakedServices`。后者扫描 mount 子树里 publish 进 **root realm** 的服务名；非空则抛，要求 `isolate` 或搬到 host。[E: packages/preset/agent-presets/src/mount.ts:189] [E: packages/preset/agent-presets/src/mount.ts:365]
25. 本行**不** `provide` 任何服务，只调已有的 `ctx.tools`。shipped `code` 文件里 `id: tool-presentation` **没有** `isolate:` 键，审计不应因本行报泄漏。[E: apps/cli/config/agent-presets/code/agent.cordis.yml:259]
26. 同文件里需要私有实例的是别的组（`planning` 的 `planMode`、`compaction` 的 `compaction`/`toolResultPruner`、`delegation` 的 `workflowEngine`）。那些行漏进 root 会让**整次** `mountPreset` 失败，本行即使 `presentAs` 已跑也会随 subtree dispose 卸掉。
27. `inactiveRows` 只读 **loader entry** 的 `fiber.inject` 键，缺服务则写成 `id (name): waiting for …`。[E: packages/preset/agent-presets/src/mount.ts:295] [E: packages/preset/agent-presets/src/mount.ts:359]
28. 本行静态 `inject` 是 `['tools']`。`code`/`both` 等 `codeRuntime` 发生在 `apply` 里新建的**子** fiber，不出现在 entry 的 `fiber.inject` 里。因此缺 runtime 时：`presentAs` 不执行（装配回落部署默认）是单测钉死的；`inactiveRows` 会不会点名 `tool-presentation` 并拒绝 mount，按当前实现是**不会** —— 与 `apply` 旁注释的「审计点名」意图不一致。[U]

## 设计动机

工具注册表有三类 Consumer（loop 调度、API presenter、每个 tool 插件），不能搬进 per-session preset。preset 能拥有的是**投影**：同一进程里 `code` 会话只看见 `run_code` + SDK，旁边 `standard` 会话仍看见 native 名。成员表不用为 Code Mode 再抄一份删行版 yml。

`Config.mode` 故意不设默认：部署默认已经由 host `tools.mode`（或 schema `native`）给出；preset 不挂本行就会落到那一层。挂了行却省略 `mode`，Loader 应当 fail-loud。

`codeRuntime` 不进静态 `inject`，是为了让 `mode: native` 在无 runtime 的组合里仍能 mount。`code`/`both` 改在 `apply` 里 wait：意图是「缺 runtime 时在激活审计点名本行，而不是第一次 `assemble` 才炸」。当前 `inactiveRows` 看不到动态子 fiber，loud-fail 合同只实现了一半（pending + 回落 native；mount 仍可能成功）。[U]

## Gotcha

- **省略本行 ≠ `mode: native` 行。** 省略 = 继承 host `defaultMode`。web/headless 若设了 `DSH_TOOLS_MODE=code`，没挂本行的 preset 也会进程级进 Code Mode。不要把环境变量写成「选了 shipped `code` preset」。[E: packages/bundle/web-app/cordis.patch.yml:41]
- **shipped 只有 `code` preset 挂本行**，且 `mode: code`。`standard` 以 `id: tool-web` 收束；`minimal` / `cordis` 的 `agent.cordis.yml` 也没有 `tool-presentation`。[E: apps/cli/config/agent-presets/code/agent.cordis.yml:262] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:247]
- **web 默认仍是 `standard`。** 要跑 PTC / Code Mode 必须显式选 `code`，或改 `agent-presets.default`。[E: packages/bundle/web-app/cordis.patch.yml:424]
- **不要把本插件挂到未 scoped 的 host 行。** `presentAs` 会抛 `requires a scoped context`。headless 没有 roster，进程级 Code Mode 只走 host `tools.mode`。[E: packages/core/tools/src/index.ts:949]
- **同一 standing scope 只能 `presentAs` 一次。** 两行抢同一 scope 是组成错误，不是后者覆盖。[E: packages/core/tools/src/index.ts:956]
- **`code` 不从 composition 删除 native 工具行。** `tool-bash` / `tool-fs` 仍注册，供 SDK 子调度。模型直调那些名字在进 `tools/pre-execute` 之前就被拒绝，approval 看不到注定失败的调用。[E: packages/core/tools/src/index.ts:1381]
- **waterfall 不 `next()` 就停。** 对 `system-prompt/assemble` 会换掉或扣住已投影的 `tools`；对 `tools/pre-execute` 会扣住 inner `allow`。本行自己不监听这两条事件。[E: vendor/cordis/src/events.ts:237]
- **`dsh-base` 不 dormant 加载 Codex/Claude 子代理。** `code` yml 里 `tool-subagent-codex` / `tool-subagent-claude-code` 是 preset 面 `disabled: true` 行，不是 base 里休眠的后端。`base.spec.ts` 钉死 patch 里这两 id 行数为 0，manifest 也不依赖那两个包。[E: packages/bundle/base/tests/base.spec.ts:38] [E: packages/bundle/base/tests/base.spec.ts:40]
- **缺 `codeRuntime` 时不要写成「mount 一定失败」。** 单测路径是 pending + native 回落；`inactiveRows` 只读静态 `inject`。[E: packages/core/agent-tool-presentation/tests/agent-tool-presentation.spec.ts:109] [U]

## Seam 三角

| 角 | 落点 | 包 / ctx 键 / 组合行 |
|---|---|---|
| **Definition** | 呈现合同：`ToolPresentationMode`、`ctx.tools.presentAs(mode)`、host `ToolRuntime.Config.mode` | `@deepseek-ai/dsh-tools`；`ctx.tools`；`dsh-base` 的 `id: tools` |
| **Provider（部署默认）** | 进程级 `defaultMode` | 同一 `id: tools` 行；web/headless 用 `DSH_TOOLS_MODE` 覆盖；不设则 schema `native` |
| **Provider（本包）** | scoped 声明：`apply` → `presentAs` | `@deepseek-ai/dsh-agent-tool-presentation`；`ctx.tools`（消费已有服务，不 `provide`）；shipped 仅 `apps/cli/config/agent-presets/code/agent.cordis.yml` 的 `id: tool-presentation` / `mode: code` |
| **Consumer** | `modeFor` → `wireSchemas` / `collapses` / `createExecution`；`systemPrompt.assemble`；loop 把装配结果送进模型请求 | host `ctx.tools` + `ctx.systemPrompt`；不经过本包第二个服务键 |
| **依赖缝 `codeRuntime`** | Definition = `ctx.codeRuntime`；Provider = web/headless `id: code-runtime`；Consumer = 本行 `ctx.inject(['codeRuntime'], …)` | `@deepseek-ai/dsh-code-runtime` / `@deepseek-ai/dsh-code-runtime-worker-thread`；`native` 不走这条缝 |

本行不发布服务，所以 **没有**「本包 = Provider、别人 inject 本包」的第三角。capability seam 仍是 `Definition / Provider / Consumer`：Definition 在 host `dsh-tools`，本包是 preset 面的一个 Provider。

## Sources

- `packages/core/agent-tool-presentation/src/index.ts`
- `packages/core/agent-tool-presentation/tests/agent-tool-presentation.spec.ts`
- `apps/cli/config/agent-presets/code/agent.cordis.yml`
- `apps/cli/config/agent-presets/standard/agent.cordis.yml`
- `packages/core/tools/src/index.ts`
- `packages/core/system-prompt/src/index.ts`
- `packages/preset/agent-presets/src/index.ts`
- `packages/preset/agent-presets/src/mount.ts`
- `packages/bundle/base/cordis.patch.yml`
- `packages/bundle/web-app/cordis.patch.yml`
- `packages/bundle/headless/cordis.patch.yml`
- `vendor/cordis/src/events.ts`
- `vendor/cordis/src/registry.ts`
- `vendor/cordis/src/fiber.ts`
- `apps/cli/tests/web-agent-presets.e2e.ts`
- `packages/bundle/base/tests/base.spec.ts`

## 相关

- [`subsys.core.tools`](tools.md) — host 面 `ctx.tools` 注册表与 `pre-execute` / `execute` 管线；`presentAs` / `modeFor` / collapse 的权威实现。
- [`subsys.core.code-mode`](code-mode.md) — `run_code` 运输、SDK、子调度；本行只选择要不要把那套投影给模型。
- [`surface.presets.code`](../../surface/presets/code.md) — shipped `code` preset 成员表与 picker 文案；相对 `standard` 的唯一可加载增量就是本行。
- [`spine.overview`](../../spine/overview.md) — `profile → bundle → agent preset`、host 面 vs agent-preset 面。
- [`spine.trace-code-mode`](../../spine/trace-code-mode.md) — 一次 Code Mode turn 从本行声明走到 `run_code` 的走读。
- [`subsys.composition.agent-presets`](../composition/agent-presets.md) — standing mount、`bindScopeParent`、`inactiveRows`、`leakedServices`。
- [`subsys.execution.code-runtime`](../execution/code-runtime.md) — `ctx.codeRuntime` Provider；本行 `code`/`both` 等它。
