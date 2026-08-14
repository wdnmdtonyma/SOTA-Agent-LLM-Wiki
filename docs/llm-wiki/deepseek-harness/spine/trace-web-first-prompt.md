---
id: spine.trace-web-first-prompt
title: trace: Web 第一次提问
kind: flow
tier: T0
pkg: cross
source:
  - apps/cli/src/args.ts
  - apps/cli/src/bin.ts
  - apps/cli/src/profile-boot.ts
  - apps/web/src/main.ts
  - packages/boot/app-boot/src/profile.ts
  - packages/boot/cmdline/src/index.ts
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/web-app/src/index.ts
  - packages/bundle/web-app/src/startup.ts
  - packages/client/connection/src/api-path.ts
  - packages/client/connection/src/client/index.ts
  - packages/client/connection/src/http-bridge.ts
  - packages/client/connection/src/index.ts
  - packages/client/modules/src/index.ts
  - packages/client/runtime/src/client/sessions/manager.ts
  - packages/client/runtime/src/client/sessions/session.ts
  - packages/client/runtime/src/client/workspaces/service.ts
  - packages/client/ui-commands/src/client/service.ts
  - packages/client/ui-conversation/src/client/input/facade.ts
  - packages/client/ui-conversation/src/client/input/hub.ts
  - packages/client/ui-conversation/src/client/service.ts
  - packages/client/ui-conversation/src/client/skeleton/InputBar.tsx
  - packages/client/web/src/boot.tsx
  - packages/client/web/src/index.ts
  - packages/core/agent-loop/src/agent.ts
  - packages/core/agent-loop/src/index.ts
  - packages/host/apiproxy/src/api-proxy.ts
  - packages/host/apiproxy/src/fetch/client.ts
  - packages/host/apiproxy/src/fetch/handler.ts
  - packages/host/apiproxy/src/index.ts
  - packages/host/frontend-static/src/index.ts
  - packages/host/webserver/src/index.ts
  - packages/preset/agent-presets/src/index.ts
symbols: [parseDshArgs, runProfile, WebServer, AppWebEntry, ConversationController, createApiProxy, ReactLoopAgent]
related: [spine.composition-boot, spine.turn-and-step, surface.web.workbench]
evidence: explicit
status: verified
updated: 47f943859b
---

> `dsh web` 把 **host 面**（进程级 webserver / apiproxy / persistence）叠在 `dsh-base` 上，浏览器 **client 面** 经 `/api` 创建会话并提交第一句；该会话再按 **agent-preset 面** 挂上 tools / persona / isolate，由可替换的 `ReactLoopAgent` 跑完第一轮 turn。

## 能回答的问题

- `dsh web` 与 `dsh --profile web` 如何落到同一条 profile 启动链？
- `--host 0.0.0.0` 在 CLI 上会怎样？默认 bind 是什么？
- 浏览器第一次普通提问走哪条 RPC？谁把文本送进 `Inbox`？
- 新会话的 agent preset 在哪一刻挂上？host 面的 `tool-*` 为何是 `disabled`？
- 第一轮 `turn/start` 何时打开、`turn/end` 何时落下？事件如何回到 GUI？
- 这条路径上 host 面、agent-preset 面、client 面各守哪一段？

```mermaid
flowchart TD
  argv["dsh web"] --> parse["parseDshArgs profile=web"]
  parse --> run["runProfile"]
  run --> compose["composeEntries: dsh-base then dsh-web-app"]
  compose --> flags["web-startup flag parse"]
  flags -->|"--host 0.0.0.0"| die["appExit no bind"]
  flags --> listen["WebServer.listen"]
  listen --> glue["web-runtime: dist fallback + URL line"]
  glue --> api["client-connection /api + WS mux"]
  api --> page["GET / SPA + window.__DSH_BOOT__"]
  page --> shell["AppWebEntry.run"]
  shell --> pick["workspaces.connectWorkspace"]
  pick --> create["POST /api/session.create"]
  create --> preset["AgentPresets.mount in setup"]
  preset --> idle["ReactLoopAgent idle"]
  idle --> submit["InputBar / InputHub.sink"]
  submit --> prompt["POST /api/session.prompt"]
  prompt --> follow["ReactLoopAgent.followup"]
  follow --> turn["turn then 0..n step"]
  turn --> mux["events.mux session/event"]
  mux --> ui["Session.handleMuxEnvelope"]
```

## 三面边界

这条路径跨三层，不要把它读成「又一个 coding agent 的 TUI loop」。

**Host 面（进程级，一次 boot 一份）**：`webserver` 只做 listen 与路由登记；`api-gateway`（`ctx.apiProxy`）是传输无关的 RPC 合同；`client-connection` 把合同绑到 `/api`；`frontend-static` 占 fallback 座发 dist。会话落盘、sandbox、subagent 注册表也在这一面。Web bundle 把 base 里面向模型的 `tool-*` / `plan-mode` / `compaction-basic` 等行标成 `disabled`，避免进程级默认装一套工具。 [E: packages/bundle/web-app/cordis.patch.yml:294]

**Agent-preset 面（每会话）**：`session.create` 的 `setup` 调用 `AgentPresets.mount`，把该会话的 scope 接到 preset 的 standing mount。默认 preset id 是 web bundle 写进 `agent-presets` 行的 `standard`。tools、persona、isolate 在这里出现；换 preset 换的是这一面，不是重 boot host。 [E: packages/bundle/web-app/cordis.patch.yml:424] [E: packages/host/apiproxy/src/api-proxy.ts:1245]

**Client 面（浏览器半边）**：`apps/web` 只找 `#root` 并跑 `AppWebEntry`；插件图来自 host 注入的 `window.__DSH_BOOT__`。composer 提交走 `ctx.connection.api` 的 `session.prompt`，会话事件从 `events.mux` WebSocket 回流。client 不执行模型 turn。 [E: apps/web/src/main.ts:10] [E: packages/client/web/src/boot.tsx:98]

## 端到端步骤

1. `parseDshArgs@apps/cli/src/args.ts` 把子命令 `web` 解析成 `mode: 'profile'` 且 `profile: 'web'`，与 `dsh --profile web` 同一条启动合同；裸 `dsh`（没有 `--profile`）直接报错，没有隐含默认 profile。 [E: apps/cli/src/args.ts:168] [E: apps/cli/src/args.ts:140]

2. `bin.ts` 的 `profile` 分支动态导入并调用 `runProfile@apps/cli/src/profile-boot.ts`：先 `composeProfile` 叠 bundle / 用户 `$DSH_HOME/profiles/web/cordis.patch.yml` / home patch / `--patch`，再 `boot` 空 root `cordis.yml`，并把 argv 余下部分通过 `provideCmdline` 交给树。 [E: apps/cli/src/bin.ts:32] [E: apps/cli/src/profile-boot.ts:255]

3. `PROFILE_TEMPLATES.web@packages/boot/app-boot/src/profile.ts` 声明 web 模板是 `dsh-base` 然后 `dsh-web-app`。web-app patch 插入 `web-startup`、`webserver`（`inject: [webStartup]`）、`web-runtime`、`api-gateway`、`connection`、整份 `dsh.client` 浏览器 roster，以及 `agent-presets`。 [E: packages/boot/app-boot/src/profile.ts:115] [E: packages/bundle/web-app/cordis.patch.yml:107]

4. `apply@packages/bundle/web-app/src/startup.ts` 用 commander 解析 `--host` / `--port` / `--trusted-host`。`--host 0.0.0.0` 走 `program.error(...)`，文案写明尚未支持、会把 RCE 暴露到网络，应改用 `127.0.0.1`。`parseCmdline` 把这次 `CommanderError` 交给 `appExit`，**不会** `provide('webStartup')`，依赖它的 `webserver` 行无法激活，进程不 bind。 [E: packages/bundle/web-app/src/startup.ts:70] [E: packages/boot/cmdline/src/index.ts:117]

5. 合法 invocation 才 `ctx.provide(WEB_STARTUP_SERVICE, { host?, port?, trustedHosts })`。`webserver` 行用表达式读它：缺省 `host` 是 `'127.0.0.1'`，缺省 `port` 是 `3080`（`--port 0` 让 OS 选端口）。 [E: packages/bundle/web-app/src/startup.ts:75] [E: packages/bundle/web-app/cordis.patch.yml:119]

6. `WebServer[Service.init]@packages/host/webserver/src/index.ts` 立刻 `listen(config.port, config.host)`。该包不懂 harness 概念、不发文件；命名路由未命中时走唯一 fallback。`Config.host` 的 schema 仍是 `'127.0.0.1' | '0.0.0.0'`——CLI 旗标被拒，并不等于 schema 禁止 all-interfaces overlay。 [E: packages/host/webserver/src/index.ts:219] [E: packages/host/webserver/src/index.ts:61]

7. `apply@packages/bundle/web-app/src/index.ts` 在 bind 后采样 LAN trust、`provide('webRuntime')`、挂 `frontend-static`、可选注册 `app:web-surface` prompt section 与 `DSH_WEB_URL`。Loader 整树 settle 后打印 `dsh web: http://127.0.0.1:<port>`（all-interfaces 时附带一条 LAN URL）。 [E: packages/bundle/web-app/src/index.ts:138] [E: packages/bundle/web-app/src/index.ts:168]

8. `apply@packages/host/frontend-static/src/index.ts` 占据 fallback：GET/HEAD 在 dist 内发文件，miss 回 `index.html` 200（SPA）。每个 index 响应先跑 `webServer.applyIndexTaps`。 [E: packages/host/frontend-static/src/index.ts:98]

9. `ClientModuleRegistry@packages/client/modules/src/index.ts` 登记 `/plugins` 前缀，并用 `tapIndex` 把 `window.__DSH_BOOT__ = <graph>` 插进 `<head>`。没有这份图，Vite 壳不是可独立跑的应用。 [E: packages/client/modules/src/index.ts:246] [E: packages/client/modules/src/index.ts:170]

10. `apply@packages/client/connection/src/index.ts` 以 prefix `/api` 注册 HTTP 路由：先 `isTrustedApiRequest`（loopback 或 `trustedHosts`），再 `bridge` 成 WHATWG `Request`，转给 `toFetchHandler(ctx.apiProxy)`。同一插件再给 `/api/events.mux` 与 `/api/events.host` 挂 WebSocket upgrade。特权方法（settings / credentials / 部分 agentPreset）即使 Host 在信任名单里也再跑一遍空名单，钉死 loopback。 [E: packages/client/connection/src/index.ts:173] [E: packages/client/connection/src/index.ts:147] [E: packages/client/connection/src/api-path.ts:8]

11. 浏览器打开打印出的 URL。`main.ts` 取 `#root` 后 `new AppWebEntry(el).run()`。`AppWebEntry.run` 解析 `__DSH_BOOT__`，prefetch `immediately` 行，挂 Loader，按图创建 client 插件（含 `connection`、`ui-conversation`、`ui-workspace`），fiber 全 `ACTIVE` 后把 `AppRoot` 切到真实 UI。 [E: apps/web/src/main.ts:10] [E: packages/client/web/src/boot.tsx:137]

12. client `connection` 半边在无 `?fixture` 时提供 `WebApiClient`（unary 走 `fetch` POST `/api/<method>`，mux/host 走 WebSocket）。 [E: packages/client/connection/src/client/index.ts:88]

13. `WorkspacesService.startInitialSelection@packages/client/runtime/src/client/workspaces/service.ts` 在 workspace/session baseline 就绪后：已有 `current` 会话则不动；否则对 `recentWorkspaceId` 调 `connectWorkspace`。`connectWorkspace` 复用该 workspace 下仍 `blank` 的会话，否则 `sessions.create({ workspaceId })`。没有 Workspace 时不会凭空 `session.create`。 [E: packages/client/runtime/src/client/workspaces/service.ts:144] [E: packages/client/runtime/src/client/workspaces/service.ts:112]

14. `SessionManager.create` 发 `session.create`。host `createApiProxy` 的 `sessions.create` 分配 `session-<uuid>`（或采纳调用方预分配 id），解析 cwd（workspace 路径 / 显式 `cwd` / `process.cwd()`），然后 `ensureSession`。 [E: packages/client/runtime/src/client/sessions/manager.ts:544] [E: packages/host/apiproxy/src/api-proxy.ts:2183]

15. 首次身份走 `ctx.agents.create`：`meta.cwd` 与解析出的 `agentPreset` 写入 header；`setup` 来自 `composeAgent`。有 `ctx.agentPresets` 时 `presets.resolve` 得 id（未点名则用 settings/部署默认），`setup` 里 `presets.mount(agentCtx, resolvedId)`。`AgentPresets.mount` 要求 `agentCtx` 已有 scope key，把该 key parent 到 preset 的 standing mount——拒绝挂到无 scope 的 context，以免注册泄漏到全进程。 [E: packages/host/apiproxy/src/api-proxy.ts:1670] [E: packages/preset/agent-presets/src/index.ts:278]

16. `AgentLoop` 在构造时 `ctx.agents.setFactory(this)`。`createAgent` → `prepare` 里 `new ReactLoopAgent(loopCtx, id, options, session)`，跑完 unpublished `setup` 再 publish。构造时若 log 里还没有 `turn/start`，`phase` 是 `{ kind: 'idle', lastTurn: 0 }`。 [E: packages/core/agent-loop/src/index.ts:350] [E: packages/core/agent-loop/src/index.ts:549] [E: packages/core/agent-loop/src/agent.ts:93]

17. 用户在 composer 输入普通文本。主按钮调用 `inputActions.submit()`，该 face 固定 `submit('queue')`；Enter 经 `resolveSubmitMode`，空闲会话同样是 `queue`。`SessionInputShell.submit` 进入 adjudication；未被 `/` command claim 吃掉的草稿落到 `InputHub.sink`。 [E: packages/client/ui-conversation/src/client/skeleton/InputBar.tsx:554] [E: packages/client/ui-conversation/src/client/input/facade.ts:80]

18. `InputHub.sink` 先 `commitSend`（undo 不得复活已发送草稿），再 `ConversationController.sendSession`。`sendSession` 把草稿图转成 base64 `PromptContentPart`，调用 `session.prompt(content, mode)`。 [E: packages/client/ui-conversation/src/client/input/hub.ts:159] [E: packages/client/ui-conversation/src/client/service.ts:154]

19. `Session.prompt@packages/client/runtime/src/client/sessions/session.ts` 在第一个 await 之前同步置 `promptAttempted`（blank → engaging 必须出现在当帧）。普通会话（无 subagent `address`）走 `api.sessions.prompt({ sessionId, mode, content, clientTimeZone })`。`AbstractApiClient.callUnary` POST `/api/session.prompt`，`content-type: application/json`。 [E: packages/client/runtime/src/client/sessions/session.ts:202] [E: packages/host/apiproxy/src/fetch/client.ts:341]

20. `toFetchHandler` 按 path 分发到 `api.sessions.prompt`。实现先 `turnAgentFor`：resume/adopt 出 live `Agent`，且当前 selection 必须有 adapter，否则 `model-unavailable`（不把失败拖进 pre-step）。通过后把 `rpcId` 与校验过的 IANA zone 写入 `MessageSource`，`createUserMessage`，`mode === 'steer'` 则 `agent.steer`，否则 `agent.followup`。第一次提问是 `queue` → `followup`。 [E: packages/host/apiproxy/src/fetch/handler.ts:99] [E: packages/host/apiproxy/src/api-proxy.ts:2499]

21. `ReactLoopAgent.followup` 即 `send(input, 'next-turn', true)`：插入 `Inbox` 的 next-turn，并 `wakeDriver`。idle 时预约 `phase: running`，在 `agents.withInitiator` 下 `kick()`。`kick` 循环 `turn()` 直到 inbox 空。 [E: packages/core/agent-loop/src/agent.ts:123] [E: packages/core/agent-loop/src/agent.ts:192]

22. `turn()` 先 `session.append('turn/start', { turn })`（第一轮 `turn === 1`），再 `preStep`：`inbox.claim` + `systemPrompt.assemble` + `agent/pre-step` waterfall。通过则 `step/start`，把 claimed `UserMessage` 以 `surfaceOp: 'append'` 写入 `user/message`（模型可见 ⟺ 已入 log）。 [E: packages/core/agent-loop/src/agent.ts:255] [E: packages/core/agent-loop/src/agent.ts:283]

23. `step()` 用 `session.deriveMessages()` 投影历史，再 `preparedCall?.stream(request) ?? loopCtx.llm.stream(request)` 吐 `assistant/chunk`；收束后 `assistant/message`（`surfaceOp: 'append'`）。无 `tool-call` 则本 step `completed`；有则 `executeToolCalls`，可能往 next-step 塞 continuation，同一 turn 继续 step。`nextStep` 空且本 turn 已有结束原因时 `append('turn/end')`，`kick` 若 inbox 已空则回到 idle。 [E: packages/core/agent-loop/src/agent.ts:341] [E: packages/core/agent-loop/src/agent.ts:345] [E: packages/core/agent-loop/src/agent.ts:319]

24. `createApiProxy` 在 `events.mux` 订阅上对每个 `session/event` 推 `session/event` 帧（可带 host 计算的 `view`）。浏览器 `Session.handleMuxEnvelope` 对 `session/event` 调 `acceptLiveEvent`，折叠进 conversation snapshot；manager 看到 `user/message` 还会推进 list 的 `updatedAt`。第一轮 turn 结束时 GUI 上的用户消息、assistant 文本（以及若有的 tool 行）都来自这条 log 投影，不是 client 本地伪造的模型历史。 [E: packages/host/apiproxy/src/api-proxy.ts:3493] [E: packages/client/runtime/src/client/sessions/session.ts:470]

**旁路（不是本 trace 的第一问）**：草稿被 `ui-input-trigger` claim 成 `/` 命令时，`ui-commands` 走 `remote.commands.execute`，不调用 `session.prompt`，因此不打开模型 turn。`session.prompt` 实现本身也不按 leading `/` 分流。 [E: packages/client/ui-commands/src/client/service.ts:374]

## 关键决策点

- **默认安装面是 Web GUI，不是 TUI。** `web` 是 launcher 写死的 profile 别名；本仓没有 shipped TUI 包。组合入口是 profile → bundle → 每会话 preset，不是进程里写死一套 coding tools。
- **`--host 0.0.0.0` 在 flag 层被拒。** 拒绝发生在 `web-startup` 提供服务之前，所以默认 composition 不会 listen all-interfaces。`WebServer.Config` 仍承认 `'0.0.0.0'`：一条替换整行 `config` 的 overlay 仍可能绑 all-interfaces；`web-runtime` 的 LAN trust 采样也仍认识该字面量。
- **Web 把模型工具从 host 面撤走。** web-app patch 把 `tool-bash` 等模型工具行标 `disabled: true`，改由每会话 preset 挂载。`shell-env`、`jobs` 注册表、`goals` 服务、`subagents` 单例仍留 host 面，因为 Gateway / 跨会话查询要在 root context 解析它们。
- **preset 挂在 unpublished `setup`，失败则整次 create 回滚。** 半吊子会话不会以「host 空工具集」姿态被 publish。
- **第一次提问的 wake 目标是 `next-turn`。** `queue` → `followup`；运行中的 `steer` 才进 `next-step`。`send(..., wakeup: true)` 在 abort 后的插入会被重分类到 `next-turn`，避免加入已死的 activity。
- **turn 边界先于模型调用。** 即使 claimed 消息在 pre-step 被抽空，已经 `append` 的 `turn/start` 仍属于这一轮，并以 `completed` 收束、不花模型调用。
- **`/api` 信任篱笆不是认证。** `trustedHosts` 防 DNS rebinding；改 settings / credentials / 打开本机路径仍钉 loopback。`session.create` / `session.prompt` 不在特权集合里——能开会话的调用方已经能跑该进程的默认工具面。
- **slash 命令不经 `session.prompt`。** 人命令走 `ctx.commands` / Remote `commands.execute`；只有普通（及带图）草稿进入 inbox 与模型历史。

## 指向后续 T1/T2

- 组合叠层、`PROFILE_TEMPLATES`、`--dump-config` 真树：`spine.composition-boot`（[composition-boot.md](composition-boot.md)），细节 `subsys.composition.app-boot`（[../subsystems/composition/app-boot.md](../subsystems/composition/app-boot.md)）
- turn / step / inbox `followup|steer|inject` / 可替换 loop：`spine.turn-and-step`（[turn-and-step.md](turn-and-step.md)），驱动实现 `subsys.core.agent-loop`（[../subsystems/core/agent-loop.md](../subsystems/core/agent-loop.md)）
- `deriveMessages` 与 append-only log：`spine.session-log`（[session-log.md](session-log.md)）
- `executeToolCalls` 与 pre/post-execute：`spine.tool-call-anatomy`（[tool-call-anatomy.md](tool-call-anatomy.md)）
- Web 工作台槽位与壳：`surface.web.workbench`（[../surface/web/workbench.md](../surface/web/workbench.md)），壳与模块表 `subsys.client.web` / `subsys.client.modules`（[../subsystems/client/web.md](../subsystems/client/web.md)、[../subsystems/client/modules.md](../subsystems/client/modules.md)）
- `/api` 合同与 BFF：`subsys.host.apiproxy`（[../subsystems/host/apiproxy.md](../subsystems/host/apiproxy.md)），listen 面 `subsys.host.webserver`（[../subsystems/host/webserver.md](../subsystems/host/webserver.md)）
- composer / 会话对象层：`subsys.client.ui-conversation`、`subsys.client.runtime`、`subsys.client.connection`（[../subsystems/client/ui-conversation.md](../subsystems/client/ui-conversation.md)、[../subsystems/client/runtime.md](../subsystems/client/runtime.md)、[../subsystems/client/connection.md](../subsystems/client/connection.md)）
- shipped preset 成员资格：`surface.presets.overview`（[../surface/presets/overview.md](../surface/presets/overview.md)）
- launcher 旗标：`surface.cli.overview`（[../surface/cli/overview.md](../surface/cli/overview.md)）

## Sources

- apps/cli/src/args.ts
- apps/cli/src/bin.ts
- apps/cli/src/profile-boot.ts
- apps/web/src/main.ts
- packages/boot/app-boot/src/profile.ts
- packages/boot/cmdline/src/index.ts
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/web-app/src/index.ts
- packages/bundle/web-app/src/startup.ts
- packages/client/connection/src/api-path.ts
- packages/client/connection/src/client/index.ts
- packages/client/connection/src/http-bridge.ts
- packages/client/connection/src/index.ts
- packages/client/modules/src/index.ts
- packages/client/runtime/src/client/sessions/manager.ts
- packages/client/runtime/src/client/sessions/session.ts
- packages/client/runtime/src/client/workspaces/service.ts
- packages/client/ui-commands/src/client/service.ts
- packages/client/ui-conversation/src/client/input/facade.ts
- packages/client/ui-conversation/src/client/input/hub.ts
- packages/client/ui-conversation/src/client/service.ts
- packages/client/ui-conversation/src/client/skeleton/InputBar.tsx
- packages/client/web/src/boot.tsx
- packages/client/web/src/index.ts
- packages/core/agent-loop/src/agent.ts
- packages/core/agent-loop/src/index.ts
- packages/host/apiproxy/src/api-proxy.ts
- packages/host/apiproxy/src/fetch/client.ts
- packages/host/apiproxy/src/fetch/handler.ts
- packages/host/apiproxy/src/index.ts
- packages/host/frontend-static/src/index.ts
- packages/host/webserver/src/index.ts
- packages/preset/agent-presets/src/index.ts

## 相关

- `spine.composition-boot`：[组合启动(profile→bundle→preset)](composition-boot.md) — 空入口表如何叠 bundle / home / `--patch`，以及 preset 何时按会话挂上。
- `spine.turn-and-step`：[turn 与 step(可替换 loop)](turn-and-step.md) — turn = 0..n step，inbox `followup` / `steer` / `inject`，默认 `ReactLoopAgent` 可替换。
- `surface.web.workbench`：[Web 工作台可见面](../surface/web/workbench.md) — 浏览器壳、槽位与工作台 chrome（本页只走到第一轮 turn 结束）。
