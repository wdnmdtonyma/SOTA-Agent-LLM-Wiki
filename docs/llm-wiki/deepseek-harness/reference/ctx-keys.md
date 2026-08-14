---
id: ref.ctx-keys
title: ctx 服务键目录
kind: catalog
tier: T3
pkg: cross
source:
  - docs/architecture.md
  - packages/README.md
  - packages/core/README.md
  - packages/boot/app-boot/src/index.ts
  - packages/boot/cmdline/src/index.ts
  - packages/util/launch-environment/src/index.ts
  - apps/cli/src/profile-boot.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/web-app/src/startup.ts
  - packages/bundle/web-app/src/index.ts
  - packages/bundle/headless/cordis.patch.yml
  - packages/bundle/headless/src/startup.ts
  - apps/cli/config/agent-presets/standard/agent.cordis.yml
  - apps/cli/config/agent-presets/minimal/agent.cordis.yml
  - packages/fs/fs/src/index.ts
  - packages/shell/shell/src/index.ts
  - packages/shell/shell-env/src/index.ts
  - packages/subprocess/subprocess/src/index.ts
  - packages/sandbox/sandbox/src/index.ts
  - packages/sandbox/sandbox-policy/src/index.ts
  - packages/terminal/terminal/src/index.ts
  - packages/lsp/lsp/src/index.ts
  - packages/code-runtime/code-runtime/src/index.ts
  - packages/e2b/e2b/src/index.ts
  - packages/llm/llm/src/index.ts
  - packages/llm/token-meter/src/index.ts
  - packages/core/session/src/index.ts
  - packages/core/tools/src/index.ts
  - packages/core/system-prompt/src/index.ts
  - packages/core/agent/src/index.ts
  - packages/core/agent-loop/src/index.ts
  - packages/core/agent-default-model/src/index.ts
  - packages/preset/agent-presets/src/index.ts
  - packages/interaction/commands/src/index.ts
  - packages/interaction/user-approval/src/index.ts
  - packages/interaction/user-questions/src/index.ts
  - packages/interaction/permission-presets/src/index.ts
  - packages/plan/plan-mode/src/index.ts
  - packages/skill/skill/src/index.ts
  - packages/goal/goal/src/index.ts
  - packages/jobs/jobs/src/index.ts
  - packages/workflow/workflow/src/index.ts
  - packages/subagent/subagent/src/index.ts
  - packages/web/web/src/index.ts
  - packages/compaction/compaction/src/index.ts
  - packages/compaction/compaction-tool-result-pruner/src/index.ts
  - packages/context/session-reference/src/index.ts
  - packages/attachment/attachment/src/index.ts
  - packages/credentials/credentials/src/index.ts
  - packages/settings/settings/src/index.ts
  - packages/storage/storage/src/index.ts
  - packages/storage/storage-domain/src/index.ts
  - packages/storage/storage-json/src/index.ts
  - packages/storage/storage-sqlite/src/index.ts
  - packages/workspace/workspace/src/index.ts
  - packages/spill/spill/src/index.ts
  - packages/session/session-persistence/src/index.ts
  - packages/session/session-projection/src/index.ts
  - packages/session/session-projection-cache/src/index.ts
  - packages/session/session-telemetry/src/index.ts
  - packages/session/session-title/src/index.ts
  - packages/session-query/session-query/src/index.ts
  - packages/session-query/session-query-sqlite/src/index.ts
  - packages/feedback/message-feedback/src/index.ts
  - packages/runtime-diagnostics/invariants/src/index.ts
  - packages/typert/protocol/src/types.ts
  - packages/typert/registry/src/service.ts
  - packages/api/gateway/src/types.ts
  - packages/host/apiproxy/src/index.ts
  - packages/host/webserver/src/index.ts
  - packages/host/directory-picker/src/index.ts
  - packages/host/directory-picker-auto/src/index.ts
  - packages/host/plugin-inventory/src/index.ts
  - packages/client/modules/src/index.ts
  - packages/client/connection/src/rpc-host.ts
  - packages/extensions/cordis-host-runner/src/index.ts
  - packages/extensions/cordis-host-runner/src/inspect-registry.ts
  - packages/client/runtime/src/client/index.ts
  - packages/client/locale/src/client/index.ts
  - packages/client/modules/src/client/manifest.ts
  - packages/client/modules/src/client/index.ts
  - packages/client/ui-commands/src/client/index.ts
  - packages/client/ui-conversation/src/client/index.ts
  - packages/client/ui-conversation/src/client/contract/slots.ts
  - packages/client/ui-input-trigger/src/client/index.ts
  - packages/client/ui-layout/src/client/index.ts
  - packages/client/ui-model-selection/src/client/service.ts
  - packages/client/ui-settings/src/client/settings-scope.ts
  - packages/client/ui-theme/src/client/index.ts
  - packages/client/web/src/app-shell.ts
  - packages/client/connection/src/client/index.ts
  - packages/client/ui-deliverables/src/client/index.ts
  - packages/api/gateway/src/client/index.ts
  - packages/api/remotes/src/client/index.ts
  - packages/session-query/session-log-export/src/client/index.ts
  - packages/extensions/cordis-client-runner/src/client/index.ts
  - packages/extensions/cordis-client-runner/src/client/inspect-registry.ts
  - packages/extensions/cordis-client-runner/src/client/timer.ts
  - vendor/cordis/src/context.ts
  - vendor/cordis/src/fiber.ts
  - vendor/loader/src/index.ts
  - vendor/hmr/src/index.ts
  - vendor/timer/src/index.ts
symbols:
  - fs
  - shell
  - tools
  - sessions
  - llm
  - subprocess
  - sandbox
  - terminals
  - commands
  - agents
  - dshHomePath
  - cmdlineArgs
  - appExit
related:
  - spine.capability-seams
  - ref.capability-seams
  - subsys.vendor.cordis
  - spine.overview
  - spine.composition-boot
  - subsys.composition.app-boot
  - subsys.composition.cmdline
  - subsys.execution.fs
  - subsys.execution.shell
  - subsys.core.tools
  - subsys.core.session
  - subsys.llm.service
  - subsys.client.runtime
evidence: explicit
status: verified
updated: 47f943859b
---

> Cordis `ctx` 上的**产品服务键**：Definition 包用 `interface Context { key: Service }` 占名，Provider 用 `super(ctx, 'key')` 或 `ctx.provide('key')` 填值。DSH 是 `profile → bundle → agent preset` 组合运行时，不是「又一个 coding agent」的固定单例；换 host 面 Provider 带走执行世界，agent-preset 面换的是 tools / persona / isolate。

## 能回答的问题

- 某个 `ctx.<key>` 的类型、Definition 包、默认 `dsh web` + `standard` 装的是谁？
- 哪些键是 launcher 在 Loader 树挂上之前 `provide` 的（`dshHomePath` / `cmdlineArgs` / `appExit` / `launchEnvironment`）？
- `sessions` / `connection` / `timer` / `dynamicCordisRunner` 在 host 进程和浏览器半边是不是同一张脸？
- 官方 `docs/capability-seams.md` 的 `svc_*` 漏了哪些 provide-only 键？`terminals` / `lsp` / `invariants` / `e2b` 默认树到底装不装？
- 换 `ctx.fs` + `ctx.subprocess` 会带走哪些 Consumer？preset 里为什么有的服务必须 `isolate`？

## 范围与 ground truth

本页是 **T3 catalog**：每个产品服务键一行。ground truth = 源码 `declare module '@deepseek-ai/cordis' { interface Context { key } }` 与产品路径上的 `ctx.provide('key')` / `super(ctx, 'key')`。官方 `docs/architecture.md`、`docs/capability-seams.md`、`packages/README.md`、`packages/core/README.md` **只当查漏，禁止 [E]**。

**host 面**（进程级，会话出现前就要 settle）：launcher 快照、Loader、sandbox / fs / shell / subprocess Provider、persistence、webserver、jobs / skills / tools **registry**、subagent backend。默认安装路径是本地 Web GUI（`dsh web` / `dsh --profile web`），web 再挂 `agent-presets` 且 `default: standard`。[E: packages/bundle/web-app/cordis.patch.yml:421][E: packages/bundle/web-app/cordis.patch.yml:424]

**agent-preset 面**（每会话 join）：tools / persona / isolate 服务。standard 把 `planMode` / `compaction`+`toolResultPruner` / `workflowEngine` 放进 `isolate` group；`tool-fs` / `tool-bash` 只 register 进 host `ctx.tools`，不 publish 同名服务。[E: apps/cli/config/agent-presets/standard/agent.cordis.yml:108][E: apps/cli/config/agent-presets/standard/agent.cordis.yml:141][E: apps/cli/config/agent-presets/standard/agent.cordis.yml:178]

**client 面**（`packages/client/**` 与 browser 半边）：另表。同名键（`sessions` / `connection` / `timer` / `dynamicCordisRunner` / `cordisInspect`）类型不同，禁止和 host 键混成一张无分层表。

**不占实例行**：Cordis 内核 accessor `root` / `baseUrl` / `events` / `logger` / `reflect` / `registry` / `fiber`（`vendor/cordis/src/context.ts` / `fiber.ts`）。没有 `ctx.scope`、`ctx.schedule`、`ctx.hooks`、`ctx.mcp`、`ctx.persona`：那些包走 isolate / tools / 人命令，不 merge 产品服务键。

**默认 provider** 认 `dsh web` = `dsh-base` + `dsh-web-app` + shipped `standard` preset。headless 另注。仓库里有实现包 ≠ 默认树装了它。

缝的三角与「换 Provider 带走什么」的走读在 [spine.capability-seams](../spine/capability-seams.md)；本页只钉键名与默认挂载。

## 实例表

列：键 · 类型/Service 类 · 默认 provider · 含义 · 为什么可换 · Definition 源 path。

### host / agent · launcher 与 boot

树挂上之前的 `provide` 键。`dsh` CLI 在 `boot(..., prepare)` 里写入；嵌入宿主可以不写或写自己的快照。

| 键 | 类型/Service 类 | 默认 provider | 含义 | 为什么可换 | Definition 源 path |
|---|---|---|---|---|---|
| `dshHomePath` | `typeof dshHomePath`（可选） | `boot()` `ctx.provide`；解析 `$DSH_HOME` 否则 `~/.dsh` | Loader `!!js` 用的 Harness-home 路径函数（如 `dshHomePath('sessions')`）。[E: packages/boot/app-boot/src/index.ts:27][E: packages/boot/app-boot/src/index.ts:770] | 嵌入宿主可指向另一 home；不换不会改模型可见 tool 名。 | `packages/boot/app-boot/src/index.ts` |
| `cmdlineArgs` | `CmdlineArgs`（可选；`get(): readonly string[]`） | `provideCmdline` | leftover argv 冻快照。launcher 只拥有 `--profile` / `--patch` / dump；web/headless 再 `parseCmdline`。[E: packages/boot/cmdline/src/index.ts:47][E: packages/boot/cmdline/src/index.ts:70] | 测试/嵌入可塞假 argv。 | `packages/boot/cmdline/src/index.ts` |
| `appExit` | `AppExit`（可选；`(code: number) => void`） | `provideCmdline` 接到 shutdown | 树 dispose 后请求进程退出。[E: packages/boot/cmdline/src/index.ts:49][E: packages/boot/cmdline/src/index.ts:71] | 测试可捕获 exit 而不杀进程。 | `packages/boot/cmdline/src/index.ts` |
| `launchEnvironment` | `LaunchEnvironmentSnapshot`（可选） | `profile-boot` `provide(DSH_LAUNCH_ENVIRONMENT_KEY)` | 本轮 env 分层快照（process / project `.env` / user `.env`）。缺省时 `launchEnvironmentOf` 回退到 `process.env`。[E: packages/util/launch-environment/src/index.ts:106][E: packages/util/launch-environment/src/index.ts:122][E: apps/cli/src/profile-boot.ts:252] | 凭证/LLM 按层解析，不读活的 `process.env` 以免热改。 | `packages/util/launch-environment/src/index.ts` |
| `configuredAgentIdentities` | `ConfiguredAgentIdentities`（可选） | 产品 `dsh` **不** provide；测试/嵌入可 provide | 按 agent 配置 `id` 钉死 session 身份，overlay 改 model 不会丢掉 id。[E: packages/core/agent-loop/src/index.ts:171][E: packages/core/agent-loop/src/index.ts:211] | 只有 launcher 知道会话是否已存在。 | `packages/core/agent-loop/src/index.ts` |
| `launcherSessionQueryPath` | `string`（可选） | 冻结树**无**产品 `provide` / `ctx.get` [U] | 声明给 launcher 钉 SQLite query 索引绝对路径。[E: packages/session-query/session-query-sqlite/src/index.ts:66][E: packages/session-query/session-query-sqlite/src/index.ts:71] | 预留嵌入合同；默认 web 用 row `config.path`（`:memory:` + `openAt: never`）。 | `packages/session-query/session-query-sqlite/src/index.ts` |
| `webStartup` | `WebStartupValues` | `dsh-web-app/startup` `provide('webStartup')` | `--host` / `--port` / `--trusted-host` 解析结果。`--host 0.0.0.0` 在 provide 前 `program.error`。[E: packages/bundle/web-app/src/startup.ts:20][E: packages/bundle/web-app/src/startup.ts:75] | 无 `interface Context` merge；`!!js ctx.webStartup.port` 读这个键。 | `packages/bundle/web-app/src/startup.ts` |
| `headlessStartup` | `HeadlessStartupValues` `{ task }` | `dsh-headless/startup` | headless positional `[task...]`。[E: packages/bundle/headless/src/startup.ts:19][E: packages/bundle/headless/src/startup.ts:54] | 只存在于 headless profile。 | `packages/bundle/headless/src/startup.ts` |
| `webRuntime` | bind 后 LAN trust 快照 | `dsh-web-app` `provide('webRuntime')` | listen 之后才确定的 host/trust，释放依赖行。[E: packages/bundle/web-app/src/index.ts:32][E: packages/bundle/web-app/src/index.ts:138] | 无 Context merge；`shellEnv` 用它发 `DSH_WEB_URL`。 | `packages/bundle/web-app/src/index.ts` |

### host / agent · vendor 组合

| 键 | 类型/Service 类 | 默认 provider | 含义 | 为什么可换 | Definition 源 path |
|---|---|---|---|---|---|
| `loader` | `Loader` | `@deepseek-ai/cordis-plugin-loader`（`boot` 先 `ctx.plugin(Loader)`） | 配置树 / 插件条目 / isolate。`pluginInventory` inject 它。[E: vendor/loader/src/index.ts:33] | 换 Loader 等于换组合运行时。 | `vendor/loader/src/index.ts` |
| `hmr` | `Hmr` | base `id: hmr` `@deepseek-ai/cordis-plugin-hmr` | 监视源与 config 热更新。[E: vendor/hmr/src/index.ts:17] | 生产可卸；web 另挂 `client-hmr`。 | `vendor/hmr/src/index.ts` |
| `timer` | `TimerService` | base `id: timer` | host 生命周期安全的 timeout/interval；mixin 到 `ctx.timeout()`。[E: vendor/timer/src/index.ts:5] | 浏览器半边另有 `ClientTimerService`（client 表）。 | `vendor/timer/src/index.ts` |

### host / agent · core spine

这些多半是 **core spine service**（官方表标 `core` / `bundle`），不是可换 execution seam。Definition 包自己 `super(ctx, key)` 即默认 provider。

| 键 | 类型/Service 类 | 默认 provider | 含义 | 为什么可换 | Definition 源 path |
|---|---|---|---|---|---|
| `sessions` | `SessionStore` | `@deepseek-ai/dsh-session` | 进程内 append-only Session 与 `session/flush`（**parallel**）。model-visible ⟺ logged 从这里投影。[E: packages/core/session/src/index.ts:39] | 换实现会改日志合同；测试可假 store。浏览器 `sessions` 是另一张脸。 | `packages/core/session/src/index.ts` |
| `tools` | `ToolRuntime` | `@deepseek-ai/dsh-tools` | 模型可见 registry + pre/execute/post 管线 + Code Mode `run_code`。[E: packages/core/tools/src/index.ts:139] | 换 loop/presentation 不换这个键；工具包是 Consumer。 | `packages/core/tools/src/index.ts` |
| `systemPrompt` | `SystemPrompt` | `@deepseek-ai/dsh-system-prompt` | 按 step 收集 section 与 tool schema。 | persona / plan-mode 往这里挂文案，不换服务类。 | `packages/core/system-prompt/src/index.ts` |
| `agents` | `AgentRegistry` | `@deepseek-ai/dsh-agent` | create/resume 工厂、活 Agent 句柄。[E: packages/core/agent/src/index.ts:38] | ACP / loop / in-process subagent 都 inject 它。 | `packages/core/agent/src/index.ts` |
| `agent` | `Agent`（可选；DX 字段） | `AgentRegistry` 根 accessor，默认 `undefined` | 装在 `Agent.ctx` 上的关联，**不是** scope 解析器。层选择用 `scopeOf()`。[E: packages/core/agent/src/index.ts:48] | 不可当 seam 换；读错会和 isolate 打架。 | `packages/core/agent/src/index.ts` |
| `agentLoop` | `AgentLoop` | `@deepseek-ai/dsh-agent-loop` | 默认可替换驱动。扩展应依赖 `dsh-agent` 事件，不依赖本包。[E: packages/core/agent-loop/src/index.ts:162] | 官方标 `bundle`：换 loop 必须对照架构地图，但 [E] 只认源码。 | `packages/core/agent-loop/src/index.ts` |
| `agentDefaultModel` | `AgentDefaultModelConfig` | `@deepseek-ai/dsh-agent-default-model` | 默认 `provider: deepseek-official` / `model: deepseek-v4-flash`，再叠 settings。 | headless 与 apiproxy 共用一个选择。 | `packages/core/agent-default-model/src/index.ts` |
| `agentPresets` | `AgentPresets` | web `id: agent-presets`；**headless 不挂** | 发现/standing-mount preset 目录。web `default: standard`。[E: packages/preset/agent-presets/src/index.ts:71] | 换 default 只改每会话 tools，不换 host Provider。 | `packages/preset/agent-presets/src/index.ts` |
| `commands` | `CommandRuntime` | `@deepseek-ai/dsh-commands` | 人命令，不经模型 turn。 | 与 `ctx.tools` 分家：slash 走这里。 | `packages/interaction/commands/src/index.ts` |
| `invariants` | `InvariantRegistry` | **默认 web 树无 yml 行** | `register(packageName, installer)`。companion 在 `./invariant`。[E: packages/runtime-diagnostics/invariants/src/index.ts:70] | 诊断缝；不装则 inject `invariants` 的 companion 等不到。 | `packages/runtime-diagnostics/invariants/src/index.ts` |
| `typert` | `TypertRegistryContract` | `@deepseek-ai/dsh-typert-registry`（`TypertRegistry`） | 运行时类型/Remote 描述。[E: packages/typert/protocol/src/types.ts:489] | client 半边也 inject 同名键（同一合同）。 | `packages/typert/protocol/src/types.ts` |
| `typertGateway` | `TypertGateway` | `@deepseek-ai/dsh-api-gateway` | Host 上把 Remote 描述绑到活服务，经 Connection RPC 调。[E: packages/api/gateway/src/types.ts:52] | 浏览器读的是 `ctx.remote`，不是这个键。 | `packages/api/gateway/src/types.ts` |

### host / agent · execution seams

换这些 Provider 会带走挂在该键上的 Consumer 整组。典型：换 `ctx.fs` + `ctx.subprocess` 带走 Bash / PTY / LSP / `glob`/`grep`。

| 键 | 类型/Service 类 | 默认 provider | 含义 | 为什么可换 | Definition 源 path |
|---|---|---|---|---|---|
| `fs` | `FileSystem` | `@deepseek-ai/dsh-fs-sandbox` `SandboxedFileSystem`（base `id: fs-sandbox`；继承 `LocalFileSystem`） | 文本读写/edit 缝。minimal preset **isolate** 后再挂 `fs-local` 影子 host sandbox。[E: packages/fs/fs/src/index.ts:46][E: packages/fs/fs/src/index.ts:88] | 换 `fs-local` / `fs-e2b` 不改 `read`/`write`/`edit` wire 名。 | `packages/fs/fs/src/index.ts` |
| `shell` | `ShellExecutor` | 非 win：`dsh-bash-sandbox` `SandboxBashExecutor`；win：`dsh-pwsh-sandbox` | one-shot bash/pwsh。Consumer：`tool-bash` / `tool-pwsh` / hook 桥。[E: packages/shell/shell/src/index.ts:42][E: packages/shell/shell/src/index.ts:67] | 同名两个 `bash` **不**占两个 ctx 键：persistent 那包走 `terminals`。 | `packages/shell/shell/src/index.ts` |
| `shellEnv` | `ShellEnvRegistry` | `@deepseek-ai/dsh-shell-env`（**host**，preset 不得 isolate） | 效果作用域内的 `DSH_*` 事实；每次 shell 执行收一份快照。 | web-app 往这里发 `DSH_WEB_URL`；isolate 会让模型 shell 永远看不见。 | `packages/shell/shell-env/src/index.ts` |
| `subprocess` | `SubprocessRuntime` | `@deepseek-ai/dsh-subprocess-local` `LocalSubprocessRuntime` | 进程树/stdio/PTY/kill。bash、terminal-bash、lsp-stdio、ACP/Codex/Claude 子代理都 spawn 这里。[E: packages/subprocess/subprocess/src/index.ts:70] | 与 `fs` 一起换成 E2B 即远程 Linux 世界。 | `packages/subprocess/subprocess/src/index.ts` |
| `sandbox` | `SandboxProvider` | `@deepseek-ai/dsh-sandbox-local` `LocalSandboxProvider` | 接住即将 spawn 的 argv，按 per-call policy 包一层。[E: packages/sandbox/sandbox/src/index.ts:148] | 换 runner（bwrap/landlock/seatbelt）不改 tool 层。 | `packages/sandbox/sandbox/src/index.ts` |
| `sandboxPolicy` | `SandboxPolicyService` | `@deepseek-ai/dsh-sandbox-policy` | 部署默认 mode + workspace root。bash 与 fs 必须读同一份，否则围栏根会漂。 | 不是 per-call 后端；只换「家」。 | `packages/sandbox/sandbox-policy/src/index.ts` |
| `terminals` | `TerminalSessionService` | **默认 web+standard 未装**；minimal isolate 组：`dsh-terminal` + `dsh-terminal-bash` | 持久 PTY registry。`tool-bash-persistent` 的 `bash` 走这里。[E: packages/terminal/terminal/src/index.ts:50] | 必须 isolate：agent-owned。standard 没有 `terminal_*` 工具。 | `packages/terminal/terminal/src/index.ts` |
| `lsp` | `LspService` | **四个 shipped preset 与 base/web 均未装** | 四个规范化 LSP 操作的注册/选择。实现包 `dsh-lsp-stdio` 在 examples。[E: packages/lsp/lsp/src/index.ts:40] | 换 stdio 后端不改 `lsp` tool 名；默认产品树根本没有这个键。 | `packages/lsp/lsp/src/index.ts` |
| `codeRuntime` | `CodeRuntime` | web/headless `dsh-code-runtime-worker-thread` `WorkerThreadCodeRuntime` | Code Mode 跑模型写的程序。base **不**挂，由 mode bundle 插入。 | 换 worker/语言不改 `run_code` 名。 | `packages/code-runtime/code-runtime/src/index.ts` |
| `e2b` | `E2BRuntime` | **默认未装**（POC；`examples/headless-agent/e2b.cordis.yml`） | 共享 E2B SDK handle，让 `fs-e2b` 与 `subprocess-e2b` 住同一远程 Linux。[E: packages/e2b/e2b/src/index.ts:65] | 只换世界，不换 tool wire 名。 | `packages/e2b/e2b/src/index.ts` |

### host / agent · persistence

| 键 | 类型/Service 类 | 默认 provider | 含义 | 为什么可换 | Definition 源 path |
|---|---|---|---|---|---|
| `sessionPersistence` | `SessionPersistence` | `@deepseek-ai/dsh-session-persistence-jsonl` `JsonlSessionPersistence`（`root: !!js dshHomePath('sessions')`） | SessionEvent 落盘。另有 sqlite 后端。 | 换介质不换事件词表。 | `packages/session/session-persistence/src/index.ts` |
| `sessionQuery` | `SessionQueryEngine` | `@deepseek-ai/dsh-session-query-sqlite` `SqliteSessionQueryEngine`（`openAt: never`，`:memory:`） | 精确读/trace/filter；FTS 默认关。 | 打开 `openAt` 才有全文；定义缝仍是这个键。 | `packages/session-query/session-query/src/index.ts` |
| `sessionProjections` | `SessionProjectionRegistry` | `@deepseek-ai/dsh-session-projection` | 域 fold 单元；list_agents / title / apiproxy 读 watermark。 | 注册单元，不换存储。 | `packages/session/session-projection/src/index.ts` |
| `sessionProjectionCache` | `SessionProjectionCache` | web `dsh-session-projection-cache` | 冷读阶梯：cache 行 + persistence 尾 replay。 | 只 web/GUI 列表需要。 | `packages/session/session-projection-cache/src/index.ts` |
| `sessionTelemetry` | `SessionTelemetryBackend` | `dsh-session-telemetry-otel` `OpenTelemetrySessionBackend`（默认 `DSH_TELEMETRY_MODE` 或缺省 `DISABLED`） | 捕获/脱敏后离开进程。 | 没有进程内 Consumer。 | `packages/session/session-telemetry/src/index.ts` |
| `sessionTitle` | `SessionTitleService` | Definition + `dsh-session-title-first-prompt-llm` | 确定性 fallback + 可选异步 LLM 标题。 | 换 first-prompt / all-prompts provider。 | `packages/session/session-title/src/index.ts` |
| `attachments` | `AttachmentStore` | `@deepseek-ai/dsh-attachment-local` `LocalAttachmentStore` | 日志外的内容寻址图片字节。 | 换存储根不改 message 引用形状。 | `packages/attachment/attachment/src/index.ts` |
| `settings` | `SettingsProvider` | `@deepseek-ai/dsh-settings-file` `FileSettingsProvider` | 分层用户文档（`$DSH_HOME/settings.yaml`）。 | 插件只 register schema；介质可换。 | `packages/settings/settings/src/index.ts` |
| `credentials` | `CredentialProvider` | `@deepseek-ai/dsh-credentials-local` `LocalCredentialProvider` | 配置持引用，值在 provider；下次请求即新密钥。 | 换保管所不改 adapter。 | `packages/credentials/credentials/src/index.ts` |
| `storage` | `Storage` | web `dsh-storage` 枢纽 | 具名 backend 注册表 + 挂 data form。枢纽自己不做 IO。[E: packages/storage/storage/src/index.ts:32] | 多 backend 并存。 | `packages/storage/storage/src/index.ts` |
| `storage.backend.json` | lifecycle-only（无 Context merge） | web `dsh-storage-json` `provide(storageBackendServiceKey('json'))` | 让 `storageDomain` inject 等到 json 后端登记完。[E: packages/storage/storage/src/index.ts:27][E: packages/storage/storage-json/src/index.ts:113] | 调用方仍走 `ctx.storage`，这个键只挡激活竞态。 | `packages/storage/storage/src/index.ts` |
| `storage.backend.sqlite` | lifecycle-only | `dsh-storage-sqlite`（**默认 web 未装**） | sqlite 介质的同款生命周期键。[E: packages/storage/storage-sqlite/src/index.ts:167] | 与 json 可并存。 | `packages/storage/storage/src/index.ts` |
| `storageDomain` | `DomainFacility` | web `dsh-storage-domain` | 等齐 configured backend 后发布 typed 域设施。workspace / messageFeedback 用它。 | 不换 KV 介质语义。 | `packages/storage/storage-domain/src/index.ts` |
| `spillStore` | `SpillStore` | `@deepseek-ai/dsh-spill-local` `LocalSpillStore` | 过大 tool 文本落盘，返回 locator。`spill-policy` 是 post-execute Consumer。 | 换目录不改 locator 合同。 | `packages/spill/spill/src/index.ts` |
| `workspaceRegistry` | `WorkspaceRegistry` | web `dsh-workspace` | `WorkspaceId` 实体；sessionIds 账户给 Host RPC / GUI。 | 无 workspace 则 GUI 列表空。 | `packages/workspace/workspace/src/index.ts` |
| `messageFeedback` | `MessageFeedbackService` | web `dsh-message-feedback` | 本地 per-assistant-message 反馈，不进 Session 历史。 | Host Remote；client UI 另半边。 | `packages/feedback/message-feedback/src/index.ts` |

### host / agent · interaction 与 context

| 键 | 类型/Service 类 | 默认 provider | 含义 | 为什么可换 | Definition 源 path |
|---|---|---|---|---|---|
| `approval` | `ApprovalService` | `@deepseek-ai/dsh-user-approval` | `approval/request` waterfall；缺 listener fail-closed `unavailable`。ACP 可当 answerer。 | 换 UI/ACP 桥，不换 tool 门控点。 | `packages/interaction/user-approval/src/index.ts` |
| `userQuestions` | `UserQuestionService` | `@deepseek-ai/dsh-user-questions` | `ask()` Promise；UI 提供当前回答者。 | `tool-ask-user` 不绑具体 GUI。 | `packages/interaction/user-questions/src/index.ts` |
| `permissionPresets` | `PermissionPresetService` | `@deepseek-ai/dsh-permission-presets` | `workspace-write` / `danger-full-access` 等捆 sandbox+approval。 | 一次切换写 `permission/preset`。 | `packages/interaction/permission-presets/src/index.ts` |
| `planMode` | `PlanModeController` | Definition 自 provide；standard **isolate** 再挂一份 | 折叠 `plan/mode`、`/plan`、`exit_plan_mode` schema。 | isolate 让每 preset 一份状态。 | `packages/plan/plan-mode/src/index.ts` |
| `skills` | `SkillRegistry` | `@deepseek-ai/dsh-skill` + host/preset 的 `skill-filesystem` | 合并 provider 目录。`tool-skill` 渲染。 | 扫描根含 `<project>/.dsh/skills` 与 `.agents/skills`。 | `packages/skill/skill/src/index.ts` |
| `sessionReferenceResolver` | `SessionReferenceResolver` | `@deepseek-ai/dsh-session-reference` | 跨会话快照打成不可信 message context。 | host 管 mention 语法。 | `packages/context/session-reference/src/index.ts` |
| `compaction` | `CompactionEngine` | `dsh-compaction-basic` `BasicCompactionEngine`；standard isolate | 无模型可见 compact tool；吃 post-step pressure。 | isolate 避免两个 preset 抢一个引擎。 | `packages/compaction/compaction/src/index.ts` |
| `toolResultPruner` | `ToolResultPruner` | `dsh-compaction-tool-result-pruner`（与 compaction 同 isolate） | 摘要前裁当前 tool 结果。 | 必须和 compaction 同 realm。 | `packages/compaction/compaction-tool-result-pruner/src/index.ts` |
| `tokenMeter` | `TokenMeter` | `@deepseek-ai/dsh-token-meter`（**host**，preset 注释禁止 isolate） | 每会话 replay 计量；GUI context meter 读它。 | isolate 会让投影随 preset 来去。 | `packages/llm/token-meter/src/index.ts` |

### host / agent · orchestration 与 web 访问

| 键 | 类型/Service 类 | 默认 provider | 含义 | 为什么可换 | Definition 源 path |
|---|---|---|---|---|---|
| `subagents` | `SubagentRuntime` | Definition + host `spawn`/`fork` in-process | 运输 registry + continuation。tool 的 wire 名是 Config `toolName`（`subagent` / `subagent_fork`）。[E: packages/subagent/subagent/src/index.ts:131] | 加 Codex/Claude/ACP/SDK 后端不改控制工具。 | `packages/subagent/subagent/src/index.ts` |
| `jobs` | `JobRegistry` | `@deepseek-ai/dsh-jobs-local` `LocalJobRegistry` | 后台 bash / PTY / 委托登记。`tool-jobs` 是控制器。 | **host** singleton：preset isolate 会让 `run_in_background` 看不见。 | `packages/jobs/jobs/src/index.ts` |
| `workflowEngine` | `WorkflowEngine` | `dsh-workflow-worker-thread` `WorkerThreadWorkflowEngine`；standard isolate | `workflow` / `ralph` 的引擎；`agent()` 经 `ctx.subagents`。 | 无具名 provider 表，一上下文一个引擎。 | `packages/workflow/workflow/src/index.ts` |
| `goals` | `GoalService` | `@deepseek-ai/dsh-goal` | 同会话目标域。Gateway Remote 从 **host** 解析，preset 只决定是否挂 `tool-goal`。 | 不要 isolate，否则 UI Remote 丢服务。 | `packages/goal/goal/src/index.ts` |
| `web` | `WebRuntime` | `@deepseek-ai/dsh-web` + `dsh-web-search-deepseek`（`searchProvider: deepseek-official`；fetch 默认关） | search/fetch provider 注册表。`tool-web` 拥有稳定模型名。 | search **不**走 `DEEPSEEK_BASE_URL`。 | `packages/web/web/src/index.ts` |
| `llm` | `LlmRuntime` | Definition 自 provide；适配器 `dsh-llm-deepseek` + 休眠 `dsh-llm-pi-ai` | adapter 注册 + `llm/stream` waterfall（必须 `next()`）。[E: packages/llm/llm/src/index.ts:48] | 加 provider 是 register route，不是换这个键。 | `packages/llm/llm/src/index.ts` |

### host / agent · Web 宿主

只出现在 `dsh-web-app`（默认 GUI）。headless 不挂。

| 键 | 类型/Service 类 | 默认 provider | 含义 | 为什么可换 | Definition 源 path |
|---|---|---|---|---|---|
| `webServer` | `WebServer` | `@deepseek-ai/dsh-host-webserver` | `node:http` 具名路由 + index transform + static fallback。[E: packages/host/webserver/src/index.ts:20] | connection / modules / hmr 都 inject 它。 | `packages/host/webserver/src/index.ts` |
| `apiProxy` | `ApiProxy` | `@deepseek-ai/dsh-host-apiproxy` `ApiProxyService` | 传输无关的 Host API 分发；流是订阅不是广播。 | 换传输不换 dispatch 脸。 | `packages/host/apiproxy/src/index.ts` |
| `clientModules` | `ClientModuleRegistry` | `@deepseek-ai/dsh-client-modules`（**host** 半边） | 扫描 `dsh.client`、组 `__DSH_BOOT__`、serve bundle。[E: packages/client/modules/src/index.ts:42] | 浏览器键是 `modules`。 | `packages/client/modules/src/index.ts` |
| `connection` | `HostConnectionHandle`（`HostConnectionService`） | `@deepseek-ai/dsh-client-connection` host 半边 | Host RPC 注册与升级。[E: packages/client/connection/src/rpc-host.ts:38] | 浏览器 `provide('connection', handle)` 是另一类型。 | `packages/client/connection/src/rpc-host.ts` |
| `directoryPicker` | `DirectoryPicker` | `dsh-host-directory-picker-auto` 运行时再挂 native 或 browse | OS chooser vs in-app 浏览的判别能力。[E: packages/host/directory-picker/src/index.ts:120] | overlay 可钉死 `-native` / `-browse`。 | `packages/host/directory-picker/src/index.ts` |
| `pluginInventory` | `PluginInventoryGateway` | `@deepseek-ai/dsh-host-plugin-inventory` | Loader 非 group 条目只读投影。`super(ctx, 'pluginInventory')`，**无** `interface Context` merge。[E: packages/host/plugin-inventory/src/index.ts:47] | Settings 页经 `remote.pluginInventory` 读。 | `packages/host/plugin-inventory/src/index.ts` |
| `dynamicCordisRunner` | `DynamicCordisRunnerService` | `@deepseek-ai/dsh-cordis-host-runner` | 内存定义表 + host vm sandbox + request-run。[E: packages/extensions/cordis-host-runner/src/index.ts:83] | `tool-cordis` Consumer；client 另有 Face。 | `packages/extensions/cordis-host-runner/src/index.ts` |
| `cordisInspect` | `CordisInspectRegistryService` | 同 host-runner | host inspect provider 注册，镜像 client manifest。[E: packages/extensions/cordis-host-runner/src/inspect-registry.ts:41] | client 表有同名不同类。 | `packages/extensions/cordis-host-runner/src/inspect-registry.ts` |

### client · 浏览器 ctx

`packages/client/**` 与 browser 半边。不要和 host 表合并。`inject: ['remote.commands']` 是 `ctx.remote` 上的命名空间，**不是**顶层 ctx 键。

| 键 | 类型/Service 类 | 默认 provider | 含义 | 为什么可换 | Definition 源 path |
|---|---|---|---|---|---|
| `connection` | `ConnectionHandle`（`api` / `rpc` / `start`） | `dsh-client-connection/client` `ctx.provide` | 浏览器 wire：fixture 或 HTTP。[E: packages/client/connection/src/client/index.ts:143] | `?fixture` 换运输；无第二次 Context merge。 | `packages/client/connection/src/client/index.ts` |
| `modules` | `ClientModuleLoader` | `window.__DSH_MODULES__` 再 `reflect.provide` | 壳 kernel 先造模块系统，插件再挂。[E: packages/client/modules/src/client/manifest.ts:39][E: packages/client/modules/src/client/index.ts:33] | 缺 slot 直接抛。 | `packages/client/modules/src/client/manifest.ts` |
| `locale` | `LocaleRuntime` | `@deepseek-ai/dsh-client-locale` | 字典与 `locale/change`。 | 与 settings 同步。 | `packages/client/locale/src/client/index.ts` |
| `theme` | `ThemeRuntime` | `@deepseek-ai/dsh-client-ui-theme` | 主题快照与 `theme/change`。[E: packages/client/ui-theme/src/client/index.ts:105] | 可跟 OS `system`。 | `packages/client/ui-theme/src/client/index.ts` |
| `slots` | `SlotRegistry` | `@deepseek-ai/dsh-client-runtime` | UI 插槽。 | ui-* 只往这里 inject。 | `packages/client/runtime/src/client/index.ts` |
| `conversationEvents` | `ConversationEventRegistry` | runtime | 事件 → 业务 Context。 | 扩展对话投影。 | `packages/client/runtime/src/client/index.ts` |
| `conversationViews` | `ConversationViewRegistry` | runtime | 每 target 的 snapshot builder。 | 扩展视图。 | `packages/client/runtime/src/client/index.ts` |
| `sessions` | `ISessions` | runtime `reflect.provide('sessions', this)` | 浏览器会话脸（列表/当前/流）。[E: packages/client/runtime/src/client/index.ts:176] | **不是** host `SessionStore`。 | `packages/client/runtime/src/client/index.ts` |
| `workspaces` | `IWorkspaces` | runtime | 浏览器 workspace 脸。 | 目录选择 UI 走这里。 | `packages/client/runtime/src/client/index.ts` |
| `conversation` | `IConversation` | `@deepseek-ai/dsh-client-ui-conversation` | 当前会话视图/输入合同。 | 具体 controller 包内。 | `packages/client/ui-conversation/src/client/index.ts` |
| `chatFileMentions` | `ChatFileMentions` | `dsh-client-ui-deliverables` `provide` | 散文文件 mention；`ctx.get` 可选。[E: packages/client/ui-conversation/src/client/contract/slots.ts:312][E: packages/client/ui-deliverables/src/client/index.ts:65] | 无 deliverables 则 mention 空。 | `packages/client/ui-conversation/src/client/contract/slots.ts` |
| `commandUi` | `CommandUiRuntime` | `@deepseek-ai/dsh-client-ui-commands` | slash 弹出层。 | 人命令 UI，不是 `ctx.commands`。 | `packages/client/ui-commands/src/client/index.ts` |
| `inputTriggers` | `InputTriggerServiceContract` | `@deepseek-ai/dsh-client-ui-input-trigger` | `@` / `/` 候选。 | 与 conversation 解耦。 | `packages/client/ui-input-trigger/src/client/index.ts` |
| `layout` | `ILayout` | `@deepseek-ai/dsh-client-ui-layout` | 开/关 details 等壳布局。 | 测试可假 layout。 | `packages/client/ui-layout/src/client/index.ts` |
| `modelDirectories` | `ModelDirectoryResolver` | `@deepseek-ai/dsh-client-ui-model-selection` | 每会话模型目录。 | 随 scope dispose。 | `packages/client/ui-model-selection/src/client/service.ts` |
| `settingsScope` | `SettingsScopeBinder` | `@deepseek-ai/dsh-client-ui-settings` | 偏好走这个 binder，禁止跨插件 value import。 | 纯客户端 transport。 | `packages/client/ui-settings/src/client/settings-scope.ts` |
| `appShell` | `AppShellService` | `dsh-client-web` `app-shell` | `renderApp()` 一次组装。[E: packages/client/web/src/app-shell.ts:22] | 壳入口。 | `packages/client/web/src/app-shell.ts` |
| `remote` | `ClientRemote` / `TypertClientRemote` | `dsh-api-gateway` client + `dsh-api-remotes` 装配 | 生成的 Host Remote 命名空间（commands/goals/pluginInventory/…）。[E: packages/api/gateway/src/client/index.ts:61][E: packages/api/remotes/src/client/index.ts:93] | 换装配只改挂上的 namespace。 | `packages/api/gateway/src/client/index.ts` |
| `sessionLogDownload` | `SessionLogDownloadController` | `@deepseek-ai/dsh-session-log-export` | 导出下载状态 + modal。[E: packages/session-query/session-log-export/src/client/index.ts:14] | 听 `command/executed` `export`。 | `packages/session-query/session-log-export/src/client/index.ts` |
| `dynamicCordisRunner` | `CordisRunnerFace` | `@deepseek-ai/dsh-cordis-client-runner` | 页内 load 状态 + 调 host 半边。[E: packages/extensions/cordis-client-runner/src/client/index.ts:128] | 不是 host `DynamicCordisRunnerService`。 | `packages/extensions/cordis-client-runner/src/client/index.ts` |
| `cordisInspect` | `ClientCordisInspectRegistry` | client-runner inspect | 浏览器 inspect provider。[E: packages/extensions/cordis-client-runner/src/client/inspect-registry.ts:139] | 与 host 注册表镜像。 | `packages/extensions/cordis-client-runner/src/client/inspect-registry.ts` |
| `timer` | `ClientTimerService` | client-runner | 浏览器 timer，API 对齐 host `TimerService`。[E: packages/extensions/cordis-client-runner/src/client/timer.ts:20] | 动态包沙箱用，不是 vendor host timer。 | `packages/extensions/cordis-client-runner/src/client/timer.ts` |

## 对照 / 分家 / 装配

**官方 `docs/capability-seams.md` 主表约 56 个 `ctx.*`。** 源码多出来的产品键：`dshHomePath` / `cmdlineArgs` / `appExit` / `launchEnvironment` / `configuredAgentIdentities` / `launcherSessionQueryPath` / `webStartup` / `headlessStartup` / `webRuntime` / `pluginInventory` / `storage.backend.*` / `agent` / host `connection` / vendor `loader`·`hmr`·`timer`，以及整张 client 表。官方漏的按源码收；官方有而默认树未装的（`terminals` / `lsp` / `e2b` / `invariants`）仍占行，provider 写成未装。

**同名两包不占两个 ctx 键。** `dsh-tool-bash` 与 `dsh-tool-bash-persistent` 都叫模型可见 `bash`，但一个 inject `shell`，一个 inject `terminals`。

**isolate。** preset 里 **publish** 服务必须进 `isolate` group，否则 `leakedServices` 拒 mount。只 `register` 进 host registry 的 tool 行可以不带。

**headless** 不挂 `agentPresets`；模型可见行坐在 host 全局。本仓没有 shipped TUI；help 里的 `tui` 只是自定义 profile 名。

## Sources

- `docs/architecture.md`
- `packages/README.md`
- `packages/core/README.md`
- `packages/boot/app-boot/src/index.ts`
- `packages/boot/cmdline/src/index.ts`
- `packages/util/launch-environment/src/index.ts`
- `apps/cli/src/profile-boot.ts`
- `packages/bundle/base/cordis.patch.yml`
- `packages/bundle/web-app/cordis.patch.yml`
- `packages/bundle/web-app/src/startup.ts`
- `packages/bundle/web-app/src/index.ts`
- `packages/bundle/headless/cordis.patch.yml`
- `packages/bundle/headless/src/startup.ts`
- `apps/cli/config/agent-presets/standard/agent.cordis.yml`
- `apps/cli/config/agent-presets/minimal/agent.cordis.yml`
- `packages/fs/fs/src/index.ts`
- `packages/shell/shell/src/index.ts`
- `packages/shell/shell-env/src/index.ts`
- `packages/subprocess/subprocess/src/index.ts`
- `packages/sandbox/sandbox/src/index.ts`
- `packages/sandbox/sandbox-policy/src/index.ts`
- `packages/terminal/terminal/src/index.ts`
- `packages/lsp/lsp/src/index.ts`
- `packages/code-runtime/code-runtime/src/index.ts`
- `packages/e2b/e2b/src/index.ts`
- `packages/llm/llm/src/index.ts`
- `packages/llm/token-meter/src/index.ts`
- `packages/core/session/src/index.ts`
- `packages/core/tools/src/index.ts`
- `packages/core/system-prompt/src/index.ts`
- `packages/core/agent/src/index.ts`
- `packages/core/agent-loop/src/index.ts`
- `packages/core/agent-default-model/src/index.ts`
- `packages/preset/agent-presets/src/index.ts`
- `packages/interaction/commands/src/index.ts`
- `packages/interaction/user-approval/src/index.ts`
- `packages/interaction/user-questions/src/index.ts`
- `packages/interaction/permission-presets/src/index.ts`
- `packages/plan/plan-mode/src/index.ts`
- `packages/skill/skill/src/index.ts`
- `packages/goal/goal/src/index.ts`
- `packages/jobs/jobs/src/index.ts`
- `packages/workflow/workflow/src/index.ts`
- `packages/subagent/subagent/src/index.ts`
- `packages/web/web/src/index.ts`
- `packages/compaction/compaction/src/index.ts`
- `packages/compaction/compaction-tool-result-pruner/src/index.ts`
- `packages/context/session-reference/src/index.ts`
- `packages/attachment/attachment/src/index.ts`
- `packages/credentials/credentials/src/index.ts`
- `packages/settings/settings/src/index.ts`
- `packages/storage/storage/src/index.ts`
- `packages/storage/storage-domain/src/index.ts`
- `packages/storage/storage-json/src/index.ts`
- `packages/storage/storage-sqlite/src/index.ts`
- `packages/workspace/workspace/src/index.ts`
- `packages/spill/spill/src/index.ts`
- `packages/session/session-persistence/src/index.ts`
- `packages/session/session-projection/src/index.ts`
- `packages/session/session-projection-cache/src/index.ts`
- `packages/session/session-telemetry/src/index.ts`
- `packages/session/session-title/src/index.ts`
- `packages/session-query/session-query/src/index.ts`
- `packages/session-query/session-query-sqlite/src/index.ts`
- `packages/feedback/message-feedback/src/index.ts`
- `packages/runtime-diagnostics/invariants/src/index.ts`
- `packages/typert/protocol/src/types.ts`
- `packages/typert/registry/src/service.ts`
- `packages/api/gateway/src/types.ts`
- `packages/host/apiproxy/src/index.ts`
- `packages/host/webserver/src/index.ts`
- `packages/host/directory-picker/src/index.ts`
- `packages/host/directory-picker-auto/src/index.ts`
- `packages/host/plugin-inventory/src/index.ts`
- `packages/client/modules/src/index.ts`
- `packages/client/connection/src/rpc-host.ts`
- `packages/extensions/cordis-host-runner/src/index.ts`
- `packages/extensions/cordis-host-runner/src/inspect-registry.ts`
- `packages/client/runtime/src/client/index.ts`
- `packages/client/locale/src/client/index.ts`
- `packages/client/modules/src/client/manifest.ts`
- `packages/client/modules/src/client/index.ts`
- `packages/client/ui-commands/src/client/index.ts`
- `packages/client/ui-conversation/src/client/index.ts`
- `packages/client/ui-conversation/src/client/contract/slots.ts`
- `packages/client/ui-input-trigger/src/client/index.ts`
- `packages/client/ui-layout/src/client/index.ts`
- `packages/client/ui-model-selection/src/client/service.ts`
- `packages/client/ui-settings/src/client/settings-scope.ts`
- `packages/client/ui-theme/src/client/index.ts`
- `packages/client/web/src/app-shell.ts`
- `packages/client/connection/src/client/index.ts`
- `packages/client/ui-deliverables/src/client/index.ts`
- `packages/api/gateway/src/client/index.ts`
- `packages/api/remotes/src/client/index.ts`
- `packages/session-query/session-log-export/src/client/index.ts`
- `packages/extensions/cordis-client-runner/src/client/index.ts`
- `packages/extensions/cordis-client-runner/src/client/inspect-registry.ts`
- `packages/extensions/cordis-client-runner/src/client/timer.ts`
- `vendor/cordis/src/context.ts`
- `vendor/cordis/src/fiber.ts`
- `vendor/loader/src/index.ts`
- `vendor/hmr/src/index.ts`
- `vendor/timer/src/index.ts`

## 相关

- [spine.capability-seams](../spine/capability-seams.md) — Definition / Provider / Consumer 走读；换 `fs`+`subprocess` 带走什么。
- [ref.capability-seams](capability-seams.md) — 同一三角的 seam 清单（swappable vs core spine）。
- [subsys.vendor.cordis](../subsystems/vendor/cordis.md) — `provide` / isolate / waterfall 必须 `next()`。
- [spine.overview](../spine/overview.md) — 组合运行时总览；host 面 vs agent-preset 面。
- [spine.composition-boot](../spine/composition-boot.md) — profile → bundle → prepare/`provide` → Loader。
- [subsys.composition.app-boot](../subsystems/composition/app-boot.md) — `dshHomePath` 与 profile 发现。
- [subsys.composition.cmdline](../subsystems/composition/cmdline.md) — `cmdlineArgs` / `appExit` / `parseCmdline`。
- [subsys.execution.fs](../subsystems/execution/fs.md) — `ctx.fs` 缝。
- [subsys.execution.shell](../subsystems/execution/shell.md) — `ctx.shell` 缝。
- [subsys.core.tools](../subsystems/core/tools.md) — `ctx.tools` 管线。
- [subsys.core.session](../subsystems/core/session.md) — host `ctx.sessions`。
- [subsys.llm.service](../subsystems/llm/service.md) — `ctx.llm`。
- [subsys.client.runtime](../subsystems/client/runtime.md) — 浏览器 `slots` / `sessions` / `workspaces`。
