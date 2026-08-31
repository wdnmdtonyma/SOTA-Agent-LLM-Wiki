---
id: ref.ctx-keys
title: ctx 服务键目录
kind: catalog
tier: T3
pkg: cross
source:
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
  - packages/preset/agent-presets/presets/standard/agent.cordis.yml
  - packages/preset/agent-presets/presets/minimal/agent.cordis.yml
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
  - packages/llm/deepseek-llm-api-extensions/src/index.ts
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
  - packages/subagent/tool-subagent/src/model-selection-settings.ts
  - packages/web/web/src/index.ts
  - packages/webhook/webhook/src/index.ts
  - packages/experimental/agent-team/src/index.ts
  - packages/compaction/compaction/src/index.ts
  - packages/compaction/compaction-tool-result-pruner/src/index.ts
  - packages/context/session-reference/src/index.ts
  - packages/context/file-reference/src/index.ts
  - packages/attachment/attachment/src/index.ts
  - packages/credentials/credentials/src/index.ts
  - packages/credentials/authorization/src/index.ts
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
  - packages/api/gateway/src/types.ts
  - packages/api/session-controller/src/index.ts
  - packages/api/session-controller/src/client/index.ts
  - packages/api/session-controller/src/file-references.ts
  - packages/api/settings-controller/src/index.ts
  - packages/api/settings-controller/src/credentials.ts
  - packages/api/workspace-controller/src/index.ts
  - packages/api/workspace-controller/src/client/index.ts
  - packages/host/webserver/src/index.ts
  - packages/host/directory-picker/src/index.ts
  - packages/host/plugin-inventory/src/index.ts
  - packages/client/modules/src/index.ts
  - packages/client/connection/src/rpc-host.ts
  - packages/extensions/cordis-host-runner/src/index.ts
  - packages/extensions/cordis-host-runner/src/inspect-registry.ts
  - packages/client/locale/src/client/index.ts
  - packages/client/modules/src/client/manifest.ts
  - packages/client/ui-commands/src/client/index.ts
  - packages/client/ui-conversation/src/client/index.ts
  - packages/client/ui-chat/src/client/contract/slots.ts
  - packages/client/ui-input-trigger/src/client/index.ts
  - packages/client/ui-layout/src/client/index.ts
  - packages/client/ui-model-selection/src/client/service.ts
  - packages/client/ui-settings/src/client/settings-scope.ts
  - packages/client/ui-settings/src/client/schema.ts
  - packages/client/ui-theme/src/client/index.ts
  - packages/client/ui-session/src/client/index.ts
  - packages/client/ui-workspace/src/client/navigation.ts
  - packages/client/ui-renderer/src/client/index.ts
  - packages/client/connection/src/client/index.ts
  - packages/client/ui-deliverables/src/client/index.ts
  - packages/client/web/src/boot.ts
  - packages/api/gateway/src/client/index.ts
  - packages/api/remotes/src/client/index.ts
  - packages/session-query/session-log-export/src/client/index.ts
  - packages/extensions/cordis-client-runner/src/client/index.ts
  - packages/extensions/cordis-client-runner/src/client/inspect-registry.ts
  - packages/extensions/cordis-client-runner/src/client/timer.ts
  - packages/experimental/inspector/src/client/plugin.ts
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
  - sessionController
  - webhookRuntime
  - agentTeams
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
  - subsys.host.apiproxy
  - subsys.core.code-mode
evidence: explicit
status: verified
updated: 0a53fb55be
---

> Cordis `ctx` 上的**产品服务键**：Definition 包用 `interface Context { key: Service }` 占名，Provider 用 `super(ctx, 'key')` 或 `ctx.provide('key')` 填值。DSH 是 `profile → bundle → agent preset` 组合运行时；换 host 面 Provider 带走执行世界，agent-preset 面换的是 tools / persona / isolate。

## 能回答的问题

- 某个 `ctx.<key>` 的类型、Definition 包、默认 `dsh web` + `standard` 装的是谁？
- 哪些键是 launcher 在 Loader 树挂上之前 `provide` 的（`dshHomePath` / `cmdlineArgs` / `appExit` / `appReady` / `launchEnvironment`）？
- `sessions` / `connection` / `timer` / `dynamicCordisRunner` 在 host 进程和浏览器半边是不是同一张脸？
- `terminals` / `lsp` / `invariants` / `e2b` / `webhookRuntime` / `agentTeams` 默认树到底装不装？
- 换 `ctx.fs` + `ctx.subprocess` 会带走哪些 Consumer？preset 里为什么有的服务必须 `isolate`？

## 范围与 ground truth

本页是 **T3 catalog**：每个产品服务键一行。ground truth = 源码 `declare module '@deepseek-ai/cordis' { interface Context { key } }` 与产品路径上的 `ctx.provide('key')` / `super(ctx, 'key')`。官方 `docs/**` **只当查漏，禁止 [E]**。

**host 面**（进程级，会话出现前就要 settle）：launcher 快照、Loader、sandbox / fs / shell / subprocess Provider、persistence、webserver、三个 Host HTTP controller、jobs / skills / tools **registry**、subagent backend。默认 GUI 安装路径是 `dsh web` / `dsh --profile web`（`dsh-base` + `dsh-web-app`）。web 再挂 `agent-presets` 且 `default: standard`。[E: packages/bundle/web-app/cordis.patch.yml:442][E: packages/bundle/web-app/cordis.patch.yml:445] 另有 shipped profile `headless` / `sdk` / `sdk-minimal` / `acp`（`dsh --profile …`）；`sdk-minimal` 不叠 `dsh-base`。

**agent-preset 面**（每会话 join）：tools / persona / isolate 服务。四个 shipped 目录是 `minimal` / `standard` / `ptc` / `cordis`。standard 把 `planMode` / `compaction`+`toolResultPruner` / `workflowEngine` 放进 `isolate` group；`tool-fs` / `tool-bash` 只 register 进 host `ctx.tools`，不 publish 同名服务。[E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:108][E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:141][E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:178]

**client 面**（`packages/client/**`、`packages/api/*-controller/src/client/` 与 browser 半边）：另表。同名键（`sessions` / `connection` / `timer` / `dynamicCordisRunner` / `cordisInspect`）类型不同，禁止和 host 键混成一张无分层表。旧包 `dsh-client-runtime` / `dsh-host-apiproxy` 已删除。

**不占实例行**：Cordis 内核 accessor `root` / `baseUrl` / `events` / `logger` / `reflect` / `registry` / `fiber`。没有 `ctx.scope`、`ctx.schedule`、`ctx.hooks`、`ctx.mcp`、`ctx.persona`：那些包走 isolate / tools / 人命令，不 merge 产品服务键。

**默认 provider** 认 `dsh web` = `dsh-base` + `dsh-web-app` + shipped `standard` preset。headless / sdk / acp / sdk-minimal 另注。仓库里有实现包 ≠ 默认树装了它。

缝的三角与「换 Provider 带走什么」的走读在 [spine.capability-seams](../spine/capability-seams.md)；本页只钉键名与默认挂载。

## 实例表

列：键 · 类型/Service 类 · 默认 provider · 含义 · 为什么可换 · Definition 源 path。

### host / agent · launcher 与 boot

树挂上之前的 `provide` 键。`dsh` CLI 在 `boot(..., prepare)` 里写入；嵌入宿主可以不写或写自己的快照。

| 键 | 类型/Service 类 | 默认 provider | 含义 | 为什么可换 | Definition 源 path |
|---|---|---|---|---|---|
| `dshHomePath` | `typeof dshHomePath`（可选） | `boot()` `ctx.provide`；解析 `$DSH_HOME` 否则 `~/.dsh` | Loader `!!js` 用的 Harness-home 路径函数。[E: packages/boot/app-boot/src/index.ts:26][E: packages/boot/app-boot/src/index.ts:785] | 嵌入宿主可指向另一 home。 | `packages/boot/app-boot/src/index.ts` |
| `cmdlineArgs` | `CmdlineArgs`（可选；`get(): readonly string[]`） | `provideCmdline` | leftover argv 冻快照。launcher 只拥有 `--profile` / `--patch` / dump；web/headless 再 `parseCmdline`。[E: packages/boot/cmdline/src/index.ts:58][E: packages/boot/cmdline/src/index.ts:86] | 测试/嵌入可塞假 argv。 | `packages/boot/cmdline/src/index.ts` |
| `appExit` | `AppExit`（可选；`(code: number) => void`） | `provideCmdline` 接到 shutdown | 树 dispose 后请求进程退出。[E: packages/boot/cmdline/src/index.ts:60][E: packages/boot/cmdline/src/index.ts:87] | 测试可捕获 exit 而不杀进程。 | `packages/boot/cmdline/src/index.ts` |
| `appReady` | `AppReady`（可选） | `provideCmdline` 若 `host.ready` 存在 | 成功启动后才跑的 listener。[E: packages/boot/cmdline/src/index.ts:62][E: packages/boot/cmdline/src/index.ts:88] | stdio 面（sdk/acp）需要；纯 GUI 也可提供。 | `packages/boot/cmdline/src/index.ts` |
| `launchEnvironment` | `LaunchEnvironmentSnapshot`（可选） | `profile-boot` `provide(DSH_LAUNCH_ENVIRONMENT_KEY)` | 本轮 env 分层快照。缺省时 `launchEnvironmentOf` 回退到 `process.env`。[E: packages/util/launch-environment/src/index.ts:122][E: apps/cli/src/profile-boot.ts:255] | 凭证/LLM 按层解析，不读活的 `process.env`。 | `packages/util/launch-environment/src/index.ts` |
| `configuredAgentIdentities` | `ConfiguredAgentIdentities`（可选） | 产品 `dsh` **不** provide；测试/嵌入可 provide | 按 agent 配置 `id` 钉死 session 身份。[E: packages/core/agent-loop/src/index.ts:227] | 只有 launcher 知道会话是否已存在。 | `packages/core/agent-loop/src/index.ts` |
| `launcherSessionQueryPath` | `string`（可选） | 冻结树**无**产品 `provide` | 声明给 launcher 钉 SQLite query 索引绝对路径。[E: packages/session-query/session-query-sqlite/src/index.ts:66][E: packages/session-query/session-query-sqlite/src/index.ts:71] | 预留嵌入合同；默认 web 用 row `config.path`。 | `packages/session-query/session-query-sqlite/src/index.ts` |
| `webStartup` | `WebStartupValues` | `dsh-web-app/startup` `provide('webStartup')` | `--host` / `--port` / `--trusted-host` / `--no-open` 解析结果。`--host 0.0.0.0` 在 provide 前 `program.error`。[E: packages/bundle/web-app/src/startup.ts:20][E: packages/bundle/web-app/src/startup.ts:80] | 无 `interface Context` merge；`!!js ctx.webStartup.port` 读这个键。 | `packages/bundle/web-app/src/startup.ts` |
| `headlessStartup` | `HeadlessStartupValues` `{ task }` | `dsh-headless/startup` | headless positional `[task...]`。[E: packages/bundle/headless/src/startup.ts:19][E: packages/bundle/headless/src/startup.ts:54] | 只存在于 headless profile。 | `packages/bundle/headless/src/startup.ts` |
| `webRuntime` | bind 后 LAN trust 快照 | `dsh-web-app` `provide('webRuntime')` | listen 之后才确定的 host/trust。[E: packages/bundle/web-app/src/index.ts:38][E: packages/bundle/web-app/src/index.ts:240] | 无 Context merge；`shellEnv` 用它发 `DSH_WEB_URL`。 | `packages/bundle/web-app/src/index.ts` |

### host / agent · vendor 组合

| 键 | 类型/Service 类 | 默认 provider | 含义 | 为什么可换 | Definition 源 path |
|---|---|---|---|---|---|
| `loader` | `Loader` | `@deepseek-ai/cordis-plugin-loader`（`boot` 先 `ctx.plugin(Loader)`） | 配置树 / 插件条目 / isolate。[E: vendor/loader/src/index.ts:33] | 换 Loader 等于换组合运行时。 | `vendor/loader/src/index.ts` |
| `hmr` | `Hmr` | base `id: hmr` `@deepseek-ai/cordis-plugin-hmr` | 监视源与 config 热更新。[E: vendor/hmr/src/index.ts:17] | 生产可卸；web 另挂 `client-hmr`。 | `vendor/hmr/src/index.ts` |
| `timer` | `TimerService` | base `id: timer` | host 生命周期安全的 timeout/interval；mixin 到 `ctx.timeout()`。[E: vendor/timer/src/index.ts:5] | 浏览器半边另有 `ClientTimerService`。 | `vendor/timer/src/index.ts` |

### host / agent · core spine

| 键 | 类型/Service 类 | 默认 provider | 含义 | 为什么可换 | Definition 源 path |
|---|---|---|---|---|---|
| `sessions` | `SessionStore` | `@deepseek-ai/dsh-session` | 进程内 append-only Session 与 `session/flush`。[E: packages/core/session/src/index.ts:37] | 换实现会改日志合同。浏览器 `sessions` 是另一张脸。 | `packages/core/session/src/index.ts` |
| `tools` | `ToolRuntime` | `@deepseek-ai/dsh-tools` | 模型可见 registry + pre/execute/post；PTC 运输 `run_code` 也在这里。[E: packages/core/tools/src/index.ts:131] | 换 loop/presentation 不换这个键。 | `packages/core/tools/src/index.ts` |
| `systemPrompt` | `SystemPrompt` | `@deepseek-ai/dsh-system-prompt` | 按 step 收集 section 与 tool schema。[E: packages/core/system-prompt/src/index.ts:15] | persona / plan-mode 往这里挂文案。 | `packages/core/system-prompt/src/index.ts` |
| `agents` | `AgentRegistry` | `@deepseek-ai/dsh-agent` | create/resume 工厂、活 Agent 句柄。[E: packages/core/agent/src/index.ts:29] | ACP / loop / in-process subagent 都 inject 它。 | `packages/core/agent/src/index.ts` |
| `agent` | `Agent`（可选；DX 字段） | `AgentRegistry` 根 accessor，默认 `undefined` | 装在 `Agent.ctx` 上的关联，**不是** scope 解析器。[E: packages/core/agent/src/index.ts:39] | 不可当 seam 换。 | `packages/core/agent/src/index.ts` |
| `agentLoop` | `AgentLoop` | `@deepseek-ai/dsh-agent-loop` | 默认可替换驱动。[E: packages/core/agent-loop/src/index.ts:218] | 扩展应依赖 `dsh-agent` 事件。 | `packages/core/agent-loop/src/index.ts` |
| `agentDefaultModel` | `AgentDefaultModelConfig` | `@deepseek-ai/dsh-agent-default-model` | 默认 `provider: deepseek-official` / `model: deepseek-v4-flash`。[E: packages/core/agent-default-model/src/index.ts:16][E: packages/bundle/base/cordis.patch.yml:78] | headless 与 Host Session RPC 共用一个选择。 | `packages/core/agent-default-model/src/index.ts` |
| `agentPresets` | `AgentPresets` | web `id: agent-presets`；**headless / sdk / acp 不挂** | 发现/standing-mount preset 目录。web `default: standard`。[E: packages/preset/agent-presets/src/index.ts:89] | 换 default 只改每会话 tools。 | `packages/preset/agent-presets/src/index.ts` |
| `commands` | `CommandRuntime` | `@deepseek-ai/dsh-commands` | 人命令，不经模型 turn。[E: packages/interaction/commands/src/index.ts:107] | 与 `ctx.tools` 分家。 | `packages/interaction/commands/src/index.ts` |
| `invariants` | `InvariantRegistry` | **默认 web 树无 yml 行** | `register(packageName, installer)`。[E: packages/runtime-diagnostics/invariants/src/index.ts:70] | 诊断缝；不装则 companion 等不到。 | `packages/runtime-diagnostics/invariants/src/index.ts` |
| `typert` | `TypertRegistryContract` | `@deepseek-ai/dsh-typert-registry` | 运行时类型/Remote 描述。[E: packages/typert/protocol/src/types.ts:595] | client 半边也 inject 同名键。 | `packages/typert/protocol/src/types.ts` |
| `typertGateway` | `TypertGateway` | `@deepseek-ai/dsh-api-gateway` | Host 上把 Remote 描述绑到活服务。[E: packages/api/gateway/src/types.ts:155] | 浏览器读的是 `ctx.remote`。 | `packages/api/gateway/src/types.ts` |
| `deepseekLlmApiExtensions` | `DeepSeekLlmApiExtensionRegistry` | `@deepseek-ai/dsh-deepseek-llm-api-extensions` | 独立拥有的 DeepSeek 请求顶层字段注册表。[E: packages/llm/deepseek-llm-api-extensions/src/index.ts:20] | `session-log-deepseek` 等往这里 register 字段。 | `packages/llm/deepseek-llm-api-extensions/src/index.ts` |
| `subagentModelSelection` | `SubagentModelSelectionConfig` | `dsh-tool-subagent` 设置段 | 新 Agent 拿到委托工具时抽样的用户偏好。[E: packages/subagent/tool-subagent/src/model-selection-settings.ts:15] | 设置可关，不换 `ctx.subagents`。 | `packages/subagent/tool-subagent/src/model-selection-settings.ts` |

### host / agent · execution seams

换这些 Provider 会带走挂在该键上的 Consumer 整组。典型：换 `ctx.fs` + `ctx.subprocess` 带走 Bash / PTY / LSP / `glob`/`grep`。

| 键 | 类型/Service 类 | 默认 provider | 含义 | 为什么可换 | Definition 源 path |
|---|---|---|---|---|---|
| `fs` | `FileSystem` | `@deepseek-ai/dsh-fs-sandbox` `SandboxedFileSystem`（base `id: fs-sandbox`） | 文本读写/edit 缝。minimal **isolate** 后再挂 `fs-local` 影子。[E: packages/fs/fs/src/index.ts:46][E: packages/fs/fs/src/index.ts:88] | 换 `fs-local` / `fs-e2b` 不改 `read`/`write`/`edit` wire 名。 | `packages/fs/fs/src/index.ts` |
| `shell` | `ShellExecutor` | 非 win：`dsh-bash-sandbox`；win：`dsh-pwsh-sandbox` | one-shot bash/pwsh。Consumer：`tool-bash` / `tool-pwsh`。[E: packages/shell/shell/src/index.ts:41][E: packages/shell/shell/src/index.ts:66] | persistent 那包走 `terminals`，不占第二个 `shell` 键。 | `packages/shell/shell/src/index.ts` |
| `shellEnv` | `ShellEnvRegistry` | `@deepseek-ai/dsh-shell-env`（**host**，preset 不得 isolate） | 效果作用域内的 `DSH_*` 事实。[E: packages/shell/shell-env/src/index.ts:21] | web-app 往这里发 `DSH_WEB_URL`。 | `packages/shell/shell-env/src/index.ts` |
| `subprocess` | `SubprocessRuntime` | `@deepseek-ai/dsh-subprocess-local` | 进程树/stdio/PTY/kill。[E: packages/subprocess/subprocess/src/index.ts:70] | 与 `fs` 一起换成 E2B 即远程 Linux 世界。 | `packages/subprocess/subprocess/src/index.ts` |
| `sandbox` | `SandboxProvider` | `@deepseek-ai/dsh-sandbox-local` | 接住即将 spawn 的 argv。[E: packages/sandbox/sandbox/src/index.ts:148] | 换 runner 不改 tool 层。 | `packages/sandbox/sandbox/src/index.ts` |
| `sandboxPolicy` | `SandboxPolicyService` | `@deepseek-ai/dsh-sandbox-policy` | 部署默认 mode + workspace root。[E: packages/sandbox/sandbox-policy/src/index.ts:59] | 不是 per-call 后端。 | `packages/sandbox/sandbox-policy/src/index.ts` |
| `terminals` | `TerminalSessionService` | **默认 web+standard 未装**；minimal isolate 组：`dsh-terminal` + `dsh-terminal-bash` / `dsh-terminal-pwsh` | 持久 PTY registry。`tool-bash-persistent` / `tool-pwsh-persistent` 走这里。[E: packages/terminal/terminal/src/index.ts:50][E: packages/preset/agent-presets/presets/minimal/agent.cordis.yml:25] | 必须 isolate：agent-owned。 | `packages/terminal/terminal/src/index.ts` |
| `lsp` | `LspService` | **四个 shipped preset 与 base/web 均未装** | 规范化 LSP 操作的注册/选择。[E: packages/lsp/lsp/src/index.ts:40] | 默认产品树没有这个键。 | `packages/lsp/lsp/src/index.ts` |
| `codeRuntime` | `CodeRuntime` | web/headless `dsh-code-runtime-worker-thread` | PTC `run_code` 跑模型写的 TypeScript/Python。[E: packages/code-runtime/code-runtime/src/index.ts:91][E: packages/bundle/web-app/cordis.patch.yml:49] | 换 worker 不改 `run_code` 名。 | `packages/code-runtime/code-runtime/src/index.ts` |
| `e2b` | `E2BRuntime` | **默认未装** | 共享 E2B SDK handle。[E: packages/e2b/e2b/src/index.ts:65] | 只换世界，不换 tool wire 名。 | `packages/e2b/e2b/src/index.ts` |

### host / agent · persistence

| 键 | 类型/Service 类 | 默认 provider | 含义 | 为什么可换 | Definition 源 path |
|---|---|---|---|---|---|
| `sessionPersistence` | `SessionPersistence` | `@deepseek-ai/dsh-session-persistence-jsonl` | SessionEvent 落盘。[E: packages/session/session-persistence/src/index.ts:83] | 换介质不换事件词表。 | `packages/session/session-persistence/src/index.ts` |
| `sessionQuery` | `SessionQueryEngine` | `@deepseek-ai/dsh-session-query-sqlite` | 精确读/trace/filter。[E: packages/session-query/session-query/src/index.ts:76] | 打开 `openAt` 才有全文。 | `packages/session-query/session-query/src/index.ts` |
| `sessionProjections` | `SessionProjectionRegistry` | `@deepseek-ai/dsh-session-projection` | 域 fold 单元。[E: packages/session/session-projection/src/index.ts:26] | 注册单元，不换存储。 | `packages/session/session-projection/src/index.ts` |
| `sessionProjectionCache` | `SessionProjectionCache` | web `dsh-session-projection-cache` | 冷读阶梯。[E: packages/session/session-projection-cache/src/index.ts:37] | 只 GUI 列表需要。 | `packages/session/session-projection-cache/src/index.ts` |
| `sessionTelemetry` | `SessionTelemetryBackend` | `dsh-session-telemetry-otel` | 捕获/脱敏后离开进程。[E: packages/session/session-telemetry/src/index.ts:21] | 没有进程内 Consumer。 | `packages/session/session-telemetry/src/index.ts` |
| `sessionTitle` | `SessionTitleService` | Definition + `dsh-session-title-first-prompt-llm` | 确定性 fallback + 可选异步 LLM 标题。[E: packages/session/session-title/src/index.ts:66] | 换 first-prompt provider。 | `packages/session/session-title/src/index.ts` |
| `attachments` | `AttachmentStore` | `@deepseek-ai/dsh-attachment-local` | 日志外的内容寻址图片字节。[E: packages/attachment/attachment/src/index.ts:33] | 换存储根不改 message 引用形状。 | `packages/attachment/attachment/src/index.ts` |
| `settings` | `SettingsProvider` | `@deepseek-ai/dsh-settings-file` | 分层用户文档。[E: packages/settings/settings/src/index.ts:145] | 插件只 register schema。 | `packages/settings/settings/src/index.ts` |
| `credentials` | `CredentialProvider` | `@deepseek-ai/dsh-credentials-local` | 配置持引用，值在 provider。[E: packages/credentials/credentials/src/index.ts:150] | 换保管所不改 adapter。 | `packages/credentials/credentials/src/index.ts` |
| `authorization` | `AuthorizationService` | `@deepseek-ai/dsh-authorization` | 浏览器/设备授权流。[E: packages/credentials/authorization/src/index.ts:45] | 与 `credentials` 分家。 | `packages/credentials/authorization/src/index.ts` |
| `storage` | `Storage` | web `dsh-storage` 枢纽 | 具名 backend 注册表。[E: packages/storage/storage/src/index.ts:32] | 多 backend 并存。 | `packages/storage/storage/src/index.ts` |
| `storage.backend.json` | lifecycle-only（无 Context merge） | web `dsh-storage-json` `provide(storageBackendServiceKey('json'))` | 让 `storageDomain` inject 等到 json 后端登记完。[E: packages/storage/storage/src/index.ts:27][E: packages/storage/storage-json/src/index.ts:118] | 调用方仍走 `ctx.storage`。 | `packages/storage/storage/src/index.ts` |
| `storage.backend.sqlite` | lifecycle-only | `dsh-storage-sqlite`（**默认 web 未装**） | sqlite 介质的同款生命周期键。[E: packages/storage/storage-sqlite/src/index.ts:167] | 与 json 可并存。 | `packages/storage/storage/src/index.ts` |
| `storageDomain` | `DomainFacility` | web `dsh-storage-domain` | typed 域设施。[E: packages/storage/storage-domain/src/index.ts:37] | 不换 KV 介质语义。 | `packages/storage/storage-domain/src/index.ts` |
| `spillStore` | `SpillStore` | `@deepseek-ai/dsh-spill-local` | 过大 tool 文本落盘。[E: packages/spill/spill/src/index.ts:25] | 换目录不改 locator 合同。 | `packages/spill/spill/src/index.ts` |
| `workspaceRegistry` | `WorkspaceRegistry` | web `dsh-workspace` | `WorkspaceId` 实体。[E: packages/workspace/workspace/src/index.ts:69] | 无 workspace 则 GUI 列表空。 | `packages/workspace/workspace/src/index.ts` |
| `messageFeedback` | `MessageFeedbackService` | web `dsh-message-feedback` | 本地 per-assistant-message 反馈。[E: packages/feedback/message-feedback/src/index.ts:56] | Host Remote；client UI 另半边。 | `packages/feedback/message-feedback/src/index.ts` |

### host / agent · interaction 与 context

| 键 | 类型/Service 类 | 默认 provider | 含义 | 为什么可换 | Definition 源 path |
|---|---|---|---|---|---|
| `approval` | `ApprovalService` | `@deepseek-ai/dsh-user-approval` | `approval/request` waterfall；缺 listener fail-closed。[E: packages/interaction/user-approval/src/index.ts:18] | 换 UI/ACP 桥。 | `packages/interaction/user-approval/src/index.ts` |
| `userQuestions` | `UserQuestionService` | `@deepseek-ai/dsh-user-questions` | `ask()` Promise。[E: packages/interaction/user-questions/src/index.ts:17] | `tool-ask-user` 不绑具体 GUI。 | `packages/interaction/user-questions/src/index.ts` |
| `permissionPresets` | `PermissionPresetService` | `@deepseek-ai/dsh-permission-presets` | 捆 sandbox+approval。[E: packages/interaction/permission-presets/src/index.ts:34] | 一次切换写 `permission/preset`。 | `packages/interaction/permission-presets/src/index.ts` |
| `planMode` | `PlanModeController` | Definition 自 provide；standard **isolate** | 折叠 `plan/mode`、`/plan`、`exit_plan_mode`。[E: packages/plan/plan-mode/src/index.ts:52] | isolate 让每 preset 一份状态。 | `packages/plan/plan-mode/src/index.ts` |
| `skills` | `SkillRegistry` | `@deepseek-ai/dsh-skill` + `skill-filesystem` | 合并 provider 目录。[E: packages/skill/skill/src/index.ts:287] | 扫描根含 `<project>/.dsh/skills` 与 `.agents/skills`。 | `packages/skill/skill/src/index.ts` |
| `sessionReferenceResolver` | `SessionReferenceResolver` | `@deepseek-ai/dsh-session-reference` | 跨会话快照打成不可信 message context。[E: packages/context/session-reference/src/index.ts:65] | host 管 mention 语法。 | `packages/context/session-reference/src/index.ts` |
| `fileReferences` | `FileReferenceService` | 文件 mention 后端 | 可取消的文件/目录候选发现。[E: packages/context/file-reference/src/index.ts:21] | Host RPC 再包一层 `sessionFileReferences`。 | `packages/context/file-reference/src/index.ts` |
| `compaction` | `CompactionEngine` | `dsh-compaction-basic`；standard isolate | 无模型可见 compact tool。[E: packages/compaction/compaction/src/index.ts:83] | isolate 避免两个 preset 抢一个引擎。 | `packages/compaction/compaction/src/index.ts` |
| `toolResultPruner` | `ToolResultPruner` | `dsh-compaction-tool-result-pruner` | 摘要前裁当前 tool 结果。[E: packages/compaction/compaction-tool-result-pruner/src/index.ts:34] | 必须和 compaction 同 realm。 | `packages/compaction/compaction-tool-result-pruner/src/index.ts` |
| `tokenMeter` | `TokenMeter` | `@deepseek-ai/dsh-token-meter`（**host**） | 每会话 replay 计量。[E: packages/llm/token-meter/src/index.ts:84] | isolate 会让投影随 preset 来去。 | `packages/llm/token-meter/src/index.ts` |

### host / agent · orchestration、web、webhook、teams

| 键 | 类型/Service 类 | 默认 provider | 含义 | 为什么可换 | Definition 源 path |
|---|---|---|---|---|---|
| `subagents` | `SubagentRuntime` | Definition + host `spawn`/`fork` | 运输 registry + continuation。[E: packages/subagent/subagent/src/index.ts:143] | 加 Codex/Claude/ACP/SDK 后端不改控制工具。 | `packages/subagent/subagent/src/index.ts` |
| `jobs` | `JobRegistry` | `@deepseek-ai/dsh-jobs-local` | 后台 bash / PTY / 委托登记。[E: packages/jobs/jobs/src/index.ts:31] | **host** singleton：preset isolate 会让 `run_in_background` 看不见。 | `packages/jobs/jobs/src/index.ts` |
| `workflowEngine` | `WorkflowEngine` | `dsh-workflow-worker-thread`；standard isolate | `workflow` / `ralph` 引擎。[E: packages/workflow/workflow/src/index.ts:33] | 一上下文一个引擎。 | `packages/workflow/workflow/src/index.ts` |
| `goals` | `GoalService` | `@deepseek-ai/dsh-goal` | 同会话目标域。[E: packages/goal/goal/src/index.ts:60] | 不要 isolate，否则 UI Remote 丢服务。 | `packages/goal/goal/src/index.ts` |
| `web` | `WebRuntime` | `@deepseek-ai/dsh-web` + `dsh-web-search-deepseek` | search/fetch provider 注册表。[E: packages/web/web/src/index.ts:37] | search **不**走 `DEEPSEEK_BASE_URL`。 | `packages/web/web/src/index.ts` |
| `llm` | `LlmRuntime` | Definition 自 provide；适配器 `dsh-llm-deepseek` + 休眠 `dsh-llm-pi-ai` | adapter 注册 + `llm/stream` waterfall。[E: packages/llm/llm/src/index.ts:51] | 加 provider 是 register route。 | `packages/llm/llm/src/index.ts` |
| `webhookRuntime` | `WebhookRuntime` | `@deepseek-ai/dsh-webhook`；**默认 web 树未装** | fire-and-forget 规则注册表；GitHub adapter 另包。[E: packages/webhook/webhook/src/index.ts:15][E: packages/webhook/webhook/src/index.ts:73] | 规则 `register` 是 effect-scoped。 | `packages/webhook/webhook/src/index.ts` |
| `agentTeams` | `TeamService` | experimental `@deepseek-ai/dsh-experimental-agent-team`；**默认未装** | implicit-root Teams（roster / mailbox / task board）。[E: packages/experimental/agent-team/src/index.ts:40][E: packages/experimental/agent-team/src/index.ts:81] | 叠在 continuable subagent 上；opt-in profile。 | `packages/experimental/agent-team/src/index.ts` |

### host / agent · Web 宿主与 Host HTTP API

只出现在 `dsh-web-app`（默认 GUI）的键：`webServer` / `clientModules` / `connection` / `directoryPicker` / `pluginInventory` / 三个 controller。headless 不挂 GUI 键。旧 `ctx.apiProxy` **已删除**。

| 键 | 类型/Service 类 | 默认 provider | 含义 | 为什么可换 | Definition 源 path |
|---|---|---|---|---|---|
| `webServer` | `WebServer` | `@deepseek-ai/dsh-host-webserver` | `node:http` 具名路由 + index transform + static fallback。[E: packages/host/webserver/src/index.ts:24] | connection / modules / hmr 都 inject 它。 | `packages/host/webserver/src/index.ts` |
| `sessionController` | `SessionController` | `@deepseek-ai/dsh-api-session-controller` | Host Session 业务 API；Remote namespace `'session'`。[E: packages/api/session-controller/src/index.ts:62][E: packages/api/session-controller/src/index.ts:115] | 取代已删的 apiproxy session 分发。 | `packages/api/session-controller/src/index.ts` |
| `settingsController` | `SettingsController` | `@deepseek-ai/dsh-api-settings-controller` | Host Settings Remote namespace `'settings'`。[E: packages/api/settings-controller/src/index.ts:77] | 读路径 `redactSecrets: true`。 | `packages/api/settings-controller/src/index.ts` |
| `credentialsController` | `CredentialsController` | settings-controller 挂载 | Host `'credentials'` Remote。[E: packages/api/settings-controller/src/credentials.ts:56] | 与 `ctx.credentials` 保管所分家。 | `packages/api/settings-controller/src/credentials.ts` |
| `workspaceController` | `WorkspaceController` | `@deepseek-ai/dsh-api-workspace-controller` | Host Workspace Remote namespace `'workspace'`。[E: packages/api/workspace-controller/src/index.ts:29][E: packages/api/workspace-controller/src/index.ts:42] | 浏览器对象层在 `src/client/`。 | `packages/api/workspace-controller/src/index.ts` |
| `sessionFileReferences` | `SessionFileReferences` | session-controller 适配器 | Host `'fileReferences'` Remote，inject `fileReferences`。[E: packages/api/session-controller/src/file-references.ts:12] | 换发现后端不换 namespace。 | `packages/api/session-controller/src/file-references.ts` |
| `clientModules` | `ClientModuleRegistry` | `@deepseek-ai/dsh-client-modules`（**host** 半边） | 扫描 `dsh.client`、组 `__DSH_BOOT__`。[E: packages/client/modules/src/index.ts:47] | 浏览器键是 `modules`。 | `packages/client/modules/src/index.ts` |
| `connection` | `HostConnectionHandle` | `@deepseek-ai/dsh-client-connection` host 半边 | Host RPC 注册与升级。[E: packages/client/connection/src/rpc-host.ts:54] | 浏览器 `provide('connection', handle)` 是另一类型。 | `packages/client/connection/src/rpc-host.ts` |
| `directoryPicker` | `DirectoryPicker` | `dsh-host-directory-picker-auto` | OS chooser vs in-app 浏览。[E: packages/host/directory-picker/src/index.ts:92] | overlay 可钉死 `-native` / `-browse`。 | `packages/host/directory-picker/src/index.ts` |
| `pluginInventory` | `PluginInventoryGateway` | `@deepseek-ai/dsh-host-plugin-inventory` | Loader 非 group 条目只读投影。`super(ctx, 'pluginInventory')`，**无** `interface Context` merge。[E: packages/host/plugin-inventory/src/index.ts:50] | Settings 页经 `remote.pluginInventory` 读。 | `packages/host/plugin-inventory/src/index.ts` |
| `dynamicCordisRunner` | `DynamicCordisRunnerService` | `@deepseek-ai/dsh-cordis-host-runner` | 内存定义表 + host vm sandbox。[E: packages/extensions/cordis-host-runner/src/index.ts:83] | `tool-cordis` Consumer；client 另有 Face。 | `packages/extensions/cordis-host-runner/src/index.ts` |
| `cordisInspect` | `CordisInspectRegistryService` | 同 host-runner | host inspect provider 注册。[E: packages/extensions/cordis-host-runner/src/inspect-registry.ts:40] | client 表有同名不同类。 | `packages/extensions/cordis-host-runner/src/inspect-registry.ts` |

### client · 浏览器 ctx

`packages/client/**` 与 browser 半边。不要和 host 表合并。`inject: ['remote.commands']` 是 `ctx.remote` 上的命名空间，**不是**顶层 ctx 键。旧 runtime 上的 `conversationEvents` / `conversationViews` **不再是顶层 ctx 键**（现为 `uiConversation` 内部 registry / slot hook）。

| 键 | 类型/Service 类 | 默认 provider | 含义 | 为什么可换 | Definition 源 path |
|---|---|---|---|---|---|
| `connection` | `ConnectionHandle` | `dsh-client-connection/client` `ctx.provide` | 浏览器 wire：fixture 或 HTTP。[E: packages/client/connection/src/client/index.ts:290] | `?fixture` 换运输。 | `packages/client/connection/src/client/index.ts` |
| `modules` | `ClientModuleLoader` | `window.__DSH_MODULES__` 再 `reflect.provide` | 壳 kernel 先造模块系统。[E: packages/client/modules/src/client/manifest.ts:38] | 缺 slot 直接抛。 | `packages/client/modules/src/client/manifest.ts` |
| `locale` | `LocaleRuntime` | `@deepseek-ai/dsh-client-locale` | 字典与 `locale/change`。[E: packages/client/locale/src/client/index.ts:83] | 与 settings 同步。 | `packages/client/locale/src/client/index.ts` |
| `theme` | `ThemeRuntime` | `@deepseek-ai/dsh-client-ui-theme` | 主题快照与 `theme/change`。[E: packages/client/ui-theme/src/client/index.ts:113] | 可跟 OS `system`。 | `packages/client/ui-theme/src/client/index.ts` |
| `slots` | `SlotRegistry` | `@deepseek-ai/dsh-client-ui-renderer` client | UI 插槽。[E: packages/client/ui-renderer/src/client/index.ts:44] | ui-* 只往这里 inject。 | `packages/client/ui-renderer/src/client/index.ts` |
| `uiRenderer` | `UiRendererService` | 同 renderer `reflect.provide` | boot kernel `mount(container)`。[E: packages/client/ui-renderer/src/client/index.ts:46][E: packages/client/web/src/boot.ts:97] | Host 半边 `apply()` 是空操作。 | `packages/client/ui-renderer/src/client/index.ts` |
| `sessions` | `ISessions` | session-controller **client** | 浏览器会话脸（列表/当前/流）。[E: packages/api/session-controller/src/client/index.ts:71] | **不是** host `SessionStore`。 | `packages/api/session-controller/src/client/index.ts` |
| `workspaces` | `IWorkspaces` | workspace-controller **client** | 浏览器 workspace 脸。[E: packages/api/workspace-controller/src/client/index.ts:33] | 目录选择 UI 走这里。 | `packages/api/workspace-controller/src/client/index.ts` |
| `uiSession` | `UiSession` | `@deepseek-ai/dsh-client-ui-session` | Session Controller 适配 + session-scoped source。[E: packages/client/ui-session/src/client/index.ts:134] | 与 host `sessionController` 成对。 | `packages/client/ui-session/src/client/index.ts` |
| `uiWorkspace` | `UiWorkspace` | `@deepseek-ai/dsh-client-ui-workspace` | 跨 controller 的 workspace 导航。[E: packages/client/ui-workspace/src/client/navigation.ts:56] | 目录 UI 能力。 | `packages/client/ui-workspace/src/client/navigation.ts` |
| `conversation` | `IConversation` | `@deepseek-ai/dsh-client-ui-conversation` | 当前会话视图/输入合同。[E: packages/client/ui-conversation/src/client/index.ts:70] | 具体 controller 包内。 | `packages/client/ui-conversation/src/client/index.ts` |
| `uiConversation` | `UiConversation` | 同 conversation 包 | 目标中立的 Conversation registry / 装配。[E: packages/client/ui-conversation/src/client/index.ts:72] | 取代旧 runtime 的 events/views 顶层键。 | `packages/client/ui-conversation/src/client/index.ts` |
| `chatFileMentions` | `ChatFileMentions` | `dsh-client-ui-deliverables` `provide` | 散文文件 mention；`ctx.get` 可选。[E: packages/client/ui-chat/src/client/contract/slots.ts:48][E: packages/client/ui-deliverables/src/client/index.ts:94] | 无 deliverables 则 mention 空。 | `packages/client/ui-chat/src/client/contract/slots.ts` |
| `commandUi` | `CommandUiRuntime` | `@deepseek-ai/dsh-client-ui-commands` | slash 弹出层。[E: packages/client/ui-commands/src/client/index.ts:36] | 人命令 UI，不是 `ctx.commands`。 | `packages/client/ui-commands/src/client/index.ts` |
| `inputTriggers` | `InputTriggerServiceContract` | `@deepseek-ai/dsh-client-ui-input-trigger` | `@` / `/` 候选。[E: packages/client/ui-input-trigger/src/client/index.ts:37] | 与 conversation 解耦。 | `packages/client/ui-input-trigger/src/client/index.ts` |
| `layout` | `ILayout` | `@deepseek-ai/dsh-client-ui-layout` | 开/关 details 等壳布局。[E: packages/client/ui-layout/src/client/index.ts:32] | 测试可假 layout。 | `packages/client/ui-layout/src/client/index.ts` |
| `modelDirectories` | `ModelDirectoryResolver` | `@deepseek-ai/dsh-client-ui-model-selection` | 每会话模型目录。[E: packages/client/ui-model-selection/src/client/service.ts:24] | 随 scope dispose。 | `packages/client/ui-model-selection/src/client/service.ts` |
| `settingsScope` | `SettingsScopeBinder` | `@deepseek-ai/dsh-client-ui-settings` | 偏好走这个 binder。[E: packages/client/ui-settings/src/client/settings-scope.ts:221] | 纯客户端 transport。 | `packages/client/ui-settings/src/client/settings-scope.ts` |
| `settingsSchema` | `SettingsSchemaService` | 同 ui-settings | 同步 schema 与不可变 path 操作。[E: packages/client/ui-settings/src/client/schema.ts:156] | 禁止跨插件 value import。 | `packages/client/ui-settings/src/client/schema.ts` |
| `remote` | `ClientRemote` / `TypertClientRemote` | `dsh-api-gateway` client + `dsh-api-remotes` 装配 | 生成的 Host Remote 命名空间。[E: packages/api/gateway/src/client/index.ts:128][E: packages/api/remotes/src/client/index.ts:131] | 换装配只改挂上的 namespace。 | `packages/api/gateway/src/client/index.ts` |
| `sessionLogDownload` | `SessionLogDownloadController` | `@deepseek-ai/dsh-session-log-export` | 导出下载状态 + modal。[E: packages/session-query/session-log-export/src/client/index.ts:17] | 听 `command/executed` `export`。 | `packages/session-query/session-log-export/src/client/index.ts` |
| `dynamicCordisRunner` | `CordisRunnerFace` | `@deepseek-ai/dsh-cordis-client-runner` | 页内 load 状态 + 调 host 半边。[E: packages/extensions/cordis-client-runner/src/client/index.ts:129][E: packages/extensions/cordis-client-runner/src/client/index.ts:291] | 不是 host `DynamicCordisRunnerService`。 | `packages/extensions/cordis-client-runner/src/client/index.ts` |
| `cordisInspect` | `ClientCordisInspectRegistry` | client-runner inspect | 浏览器 inspect provider。[E: packages/extensions/cordis-client-runner/src/client/inspect-registry.ts:139] | 与 host 注册表镜像。 | `packages/extensions/cordis-client-runner/src/client/inspect-registry.ts` |
| `timer` | `ClientTimerService` | client-runner | 浏览器 timer，API 对齐 host `TimerService`。[E: packages/extensions/cordis-client-runner/src/client/timer.ts:20] | 动态包沙箱用。 | `packages/extensions/cordis-client-runner/src/client/timer.ts` |
| `inspector` | `InspectorService` | experimental client inspector；**默认未装** | Client-realm 观测。[E: packages/experimental/inspector/src/client/plugin.ts:31] | opt-in 诊断面。 | `packages/experimental/inspector/src/client/plugin.ts` |

## 对照 / 分家 / 装配

源码多出来的产品键相对官方 capability-seams 主表：launcher 快照、`storage.backend.*`、`agent` DX 字段、host `connection`、vendor `loader`·`hmr`·`timer`、三个 Host controller、`webhookRuntime` / `agentTeams`、以及整张 client 表。官方有而默认树未装的（`terminals` / `lsp` / `e2b` / `invariants` / `webhookRuntime` / `agentTeams`）仍占行，provider 写成未装。

**同名两包不占两个 ctx 键。** `dsh-tool-bash` 与 `dsh-tool-bash-persistent` 都叫模型可见 `bash`，但一个 inject `shell`，一个 inject `terminals`。`pwsh` 同样拆 one-shot 与 persistent。

**isolate。** preset 里 **publish** 服务必须进 `isolate` group，否则 `leakedServices` 拒 mount。只 `register` 进 host registry 的 tool 行可以不带。

**headless / sdk / acp** 不挂 `agentPresets`；模型可见行坐在 host 全局（base 工具行）。**web** 才把 tools/persona 挪到 shipped preset（`minimal` / `standard` / `ptc` / `cordis`）。本仓没有 shipped TUI；help 里的 `tui` 只是自定义 profile 名。

## Sources

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
- `packages/preset/agent-presets/presets/standard/agent.cordis.yml`
- `packages/preset/agent-presets/presets/minimal/agent.cordis.yml`
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
- `packages/llm/deepseek-llm-api-extensions/src/index.ts`
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
- `packages/subagent/tool-subagent/src/model-selection-settings.ts`
- `packages/web/web/src/index.ts`
- `packages/webhook/webhook/src/index.ts`
- `packages/experimental/agent-team/src/index.ts`
- `packages/compaction/compaction/src/index.ts`
- `packages/compaction/compaction-tool-result-pruner/src/index.ts`
- `packages/context/session-reference/src/index.ts`
- `packages/context/file-reference/src/index.ts`
- `packages/attachment/attachment/src/index.ts`
- `packages/credentials/credentials/src/index.ts`
- `packages/credentials/authorization/src/index.ts`
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
- `packages/api/gateway/src/types.ts`
- `packages/api/session-controller/src/index.ts`
- `packages/api/session-controller/src/client/index.ts`
- `packages/api/session-controller/src/file-references.ts`
- `packages/api/settings-controller/src/index.ts`
- `packages/api/settings-controller/src/credentials.ts`
- `packages/api/workspace-controller/src/index.ts`
- `packages/api/workspace-controller/src/client/index.ts`
- `packages/host/webserver/src/index.ts`
- `packages/host/directory-picker/src/index.ts`
- `packages/host/plugin-inventory/src/index.ts`
- `packages/client/modules/src/index.ts`
- `packages/client/connection/src/rpc-host.ts`
- `packages/extensions/cordis-host-runner/src/index.ts`
- `packages/extensions/cordis-host-runner/src/inspect-registry.ts`
- `packages/client/locale/src/client/index.ts`
- `packages/client/modules/src/client/manifest.ts`
- `packages/client/ui-commands/src/client/index.ts`
- `packages/client/ui-conversation/src/client/index.ts`
- `packages/client/ui-chat/src/client/contract/slots.ts`
- `packages/client/ui-input-trigger/src/client/index.ts`
- `packages/client/ui-layout/src/client/index.ts`
- `packages/client/ui-model-selection/src/client/service.ts`
- `packages/client/ui-settings/src/client/settings-scope.ts`
- `packages/client/ui-settings/src/client/schema.ts`
- `packages/client/ui-theme/src/client/index.ts`
- `packages/client/ui-session/src/client/index.ts`
- `packages/client/ui-workspace/src/client/navigation.ts`
- `packages/client/ui-renderer/src/client/index.ts`
- `packages/client/connection/src/client/index.ts`
- `packages/client/ui-deliverables/src/client/index.ts`
- `packages/client/web/src/boot.ts`
- `packages/api/gateway/src/client/index.ts`
- `packages/api/remotes/src/client/index.ts`
- `packages/session-query/session-log-export/src/client/index.ts`
- `packages/extensions/cordis-client-runner/src/client/index.ts`
- `packages/extensions/cordis-client-runner/src/client/inspect-registry.ts`
- `packages/extensions/cordis-client-runner/src/client/timer.ts`
- `packages/experimental/inspector/src/client/plugin.ts`
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
- [subsys.client.runtime](../subsystems/client/runtime.md) — 浏览器 store / session-controller client / `uiRenderer`（稳定 id）。
- [subsys.host.apiproxy](../subsystems/host/apiproxy.md) — Host HTTP API（三个 controller + webserver；稳定 id）。
- [subsys.core.code-mode](../subsystems/core/code-mode.md) — PTC `run_code` / `ctx.codeRuntime`（稳定 id）。
