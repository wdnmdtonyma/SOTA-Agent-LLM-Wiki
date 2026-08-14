---
id: surface.web.workbench
title: Web 工作台可见面
kind: surface
tier: T1
pkg: client
source:
  - packages/client/web/src/index.ts
  - packages/client/web/src/boot.tsx
  - packages/client/web/src/AppRoot.tsx
  - packages/client/web/src/app-shell.ts
  - packages/client/web/src/app.tsx
  - packages/client/web/tests/app-root.client.spec.tsx
  - packages/client/runtime/src/index.ts
  - packages/client/runtime/src/client/index.ts
  - packages/client/runtime/src/client/sessions/session.ts
  - packages/client/runtime/src/client/workspaces/service.ts
  - packages/client/runtime/src/client/contract/sessions.ts
  - packages/client/runtime/package.json
  - packages/host/webserver/src/index.ts
  - packages/host/frontend-static/src/index.ts
  - packages/bundle/web-app/src/startup.ts
  - packages/bundle/web-app/src/index.ts
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/web-app/tests/startup.spec.ts
  - packages/boot/app-boot/src/profile.ts
  - apps/cli/src/args.ts
  - apps/cli/tests/args.spec.ts
  - apps/cli/tests/built-bin.e2e.ts
  - apps/web/src/main.ts
  - apps/web/index.html
  - apps/web/vite.config.ts
  - packages/client/modules/src/index.ts
  - packages/client/modules/src/client/manifest.ts
  - packages/client/connection/src/index.ts
  - packages/client/connection/src/api-path.ts
  - packages/client/ui-layout/src/client/index.ts
  - packages/client/ui-layout/src/client/AppFrame.tsx
  - packages/client/ui-conversation/src/client/apply.ts
  - packages/client/ui-conversation/src/client/skeleton/InputBar.tsx
  - packages/client/ui-conversation/src/client/input/facade.ts
  - packages/client/ui-sidebar/src/client/index.ts
  - packages/client/ui-commands/src/client/service.ts
symbols:
  - AppWebEntry
  - ctx.webServer
  - window.__DSH_BOOT__
  - APP_SHELL_ID
  - WebServer
related: []
evidence: explicit
status: verified
updated: 47f943859b
---

> 工作台是用户打开的**本地 Web GUI**：`dsh web`（≡ `--profile web`）在 **host 面** `listen` 一个只做路由登记的 `ctx.webServer`，浏览器半边用 `AppWebEntry` 读 `window.__DSH_BOOT__` 把槽位 chrome 装进 `#root`。client **不**执行模型 turn。DSH 是 Cordis 组合运行时（`profile → bundle → agent preset`）；本仓没有 shipped TUI。

## 能回答的问题

- 打开这份 GUI 打什么命令？缺省 bind / 打印出的 URL 是什么？`--host 0.0.0.0` 会不会 listen？
- `apps/web` 自己做了什么？没有 `window.__DSH_BOOT__` 时裸 Vite 能不能当应用跑？
- 屏幕上的 sidebar / 对话列 / details / 浮层是哪些槽？每个 shipped `ui-*` 一行干什么？
- 普通文本和行首 `/` 命令各走哪条缝？client 会不会自己 `kick()` loop？
- host 面上的 `tool-*` 为什么是 `disabled`？新会话默认挂哪个 agent preset？
- 没有 Workspace 会不会凭空 `session.create`？

## 是什么

DSH 不是「又一个 coding agent」。一次 `dsh web` 叠三面：

| 面 | 活在哪 | 工作台看到的职责 |
|---|---|---|
| **host 面** | 进程级，一份 | `WebServer` listen；`/api` 与 fallback 发 dist；会话落盘、sandbox、注册表。`webserver` **不**发文件、**不**打印 URL。 |
| **client 面** | 浏览器半边 | 壳、槽位、composer、slash 菜单。对象层发 RPC、收 mux。**不**跑 `ReactLoopAgent`。 |
| **agent-preset 面** | 每会话 | 模型可见 tools / persona / isolate。web overlay 把 base 上的 `tool-*` 行关掉，改由 preset 再挂；缺省 `standard`。 |

capability seam 仍是 Definition / Provider / Consumer。`model-visible ⟺ logged`：模型看见的工具集写在该会话的 preset + session log 里，不写在浏览器内存里。

默认安装路径就是这份本地 GUI。`PROFILE_TEMPLATES` 只有 `web` 与 `headless`，没有 TUI 模板。 [E: packages/boot/app-boot/src/profile.ts:115] [E: packages/boot/app-boot/src/profile.ts:116]

壳库是 `@deepseek-ai/dsh-client-web`，产品符号是 `AppWebEntry`。 [E: packages/client/web/src/index.ts:10] 该包**没有** `dsh.client` 字段：壳打进 `@deepseek-ai/dsh-web-frontend` dist，不经 `/plugins/<id>/client.js` 再拉自己。 [I]

浏览器对象层是 `@deepseek-ai/dsh-client-runtime`。node 半边 `apply` 是空函数；行为全在 `./client`。 [E: packages/client/runtime/src/index.ts:4] [E: packages/client/runtime/package.json:2]

HTTP 载体是 `@deepseek-ai/dsh-host-webserver` 的 `WebServer`，Cordis 键 `ctx.webServer`。构造立刻 `super(ctx, 'webServer')`；`[Service.init]` 立刻 `listen`。 [E: packages/host/webserver/src/index.ts:75] [E: packages/host/webserver/src/index.ts:218] [E: packages/host/webserver/src/index.ts:221]

## 入口

用户碰到工作台的路径：

| 入口 | 行为 |
|---|---|
| `dsh web [app args…]` | launcher 子命令，action 把 profile 写成 `'web'`。`parse(['web'])` 得到 `{ mode: 'profile', profile: 'web', … }`。 [E: apps/cli/src/args.ts:156] [E: apps/cli/src/args.ts:168] [E: apps/cli/tests/args.spec.ts:28] |
| `dsh --profile web [app args…]` | 同一条 `mode: 'profile'`。`--host` / `--port` / `--trusted-host` 是 inner args，不是 launcher 旗标。 [E: apps/cli/tests/args.spec.ts:40] |
| 监督进程 stdout | Loader 整树 settle 后 `web-runtime` 打印 `dsh web: http://127.0.0.1:<port>`。 [E: packages/bundle/web-app/src/index.ts:168] |
| 浏览器打开该 URL | `frontend-static` 占 fallback，发 dist / SPA `index.html`。 [E: packages/host/frontend-static/src/index.ts:98] |
| `apps/web` `#root` | HTML 只提供空 `#root`。 [E: apps/web/index.html:11] `main.ts` 找不到则抛 `web app: missing #root`，否则 `new AppWebEntry(el).run()`。 [E: apps/web/src/main.ts:8] [E: apps/web/src/main.ts:9] [E: apps/web/src/main.ts:10] |
| `window.__DSH_BOOT__` | host `ClientModuleRegistry.tapIndex` 把 `<script>window.__DSH_BOOT__ = …</script>` 插进 `<head>`。 [E: packages/client/modules/src/index.ts:170] [E: packages/client/modules/src/index.ts:246] 壳 `parseBootManifest` 读它。 [E: packages/client/web/src/boot.tsx:98] |

`dsh --profile web --help` 打 `Usage: dsh --profile web`，stdout **不含** `dsh web: http://`（action 不跑，不 bind）。 [E: apps/cli/tests/built-bin.e2e.ts:338] [E: apps/cli/tests/built-bin.e2e.ts:340] launcher 把 `--profile web -h` 的 `-h` 放进 inner `args`。 [E: apps/cli/tests/args.spec.ts:38]

裸 `vite` / `vite preview` 在 listen 之前抛错：`apps/web is not a standalone application: bare Vite cannot inject window.__DSH_BOOT__`。 [E: apps/web/vite.config.ts:16]

## 关键字段

### Bind 与 safety

`WEB_STARTUP_SERVICE` 字面量是 `'webStartup'`。`--host` 等于 `'0.0.0.0'` 时 `program.error`（safety：会把 RCE 暴露到网络），**不会** `provide('webStartup')`。 [E: packages/bundle/web-app/src/startup.ts:20] [E: packages/bundle/web-app/src/startup.ts:70] [E: packages/bundle/web-app/src/startup.ts:75]

`id: webserver`：`inject: [webStartup]`，`host: !!js ctx.webStartup.host ?? '127.0.0.1'`，`port: !!js ctx.webStartup.port ?? 3080`。无旗标时服务值是 `{ trustedHosts: [] }`，consumer 的 `??` 读成 `127.0.0.1:3080`。 [E: packages/bundle/web-app/cordis.patch.yml:117] [E: packages/bundle/web-app/cordis.patch.yml:119] [E: packages/bundle/web-app/cordis.patch.yml:120] [E: packages/bundle/web-app/tests/startup.spec.ts:107] [E: packages/bundle/web-app/tests/startup.spec.ts:109]

内建 bin：`dsh web --host 0.0.0.0` 的 stdout 为空，stderr 含 safety 句，exit 1。 [E: apps/cli/tests/built-bin.e2e.ts:347] [E: apps/cli/tests/built-bin.e2e.ts:348]

`WebServer.Config.host` 仍是 `'127.0.0.1' | '0.0.0.0'`。旗标路径拒 all-interfaces ≠ schema 禁止；一条整行改 `webserver.config.host` 的 overlay 仍可能 bind `0.0.0.0`。 [E: packages/host/webserver/src/index.ts:61]

`listen` 成功后本包只写 `listenedPort`。[E: packages/host/webserver/src/index.ts:221] 回调里没有 `console.log`。[I] URL 行属于 `web-app`。 [E: packages/bundle/web-app/src/index.ts:168] 未命中 named route 时只把请求交给唯一 fallback；发文件的是 `frontend-static`。 [E: packages/host/webserver/src/index.ts:153] [E: packages/host/frontend-static/src/index.ts:98]

### `window.__DSH_BOOT__`

类型是 `WebBootGraph`：`rev: string` + `entries[]`（每行 `id` / `url` / `rev`，可选 `inject` / `immediately`）。 [E: packages/client/modules/src/client/manifest.ts:50] [E: packages/client/modules/src/client/manifest.ts:66] [E: packages/client/modules/src/client/manifest.ts:68] 缺对象时文案是 `window.__DSH_BOOT__ is missing or not an object`，`run()` **reject**（此时还没有 HARNESS loading 页）。 [E: packages/client/modules/src/client/manifest.ts:110]

`immediately: true` 标在各 client 包的 `package.json`（例如 runtime）。[E: packages/client/runtime/package.json:40] shipped 还有 `modules` / `connection` / `locale` / `ui-theme` / `client-hmr` 以及 host 面 `api-remotes` / `typert-registry` / `api-gateway` 同样 immediately；`ui-layout` 默认不标。[I]

### 工作台槽位

`buildRenderApp` 在全程序里只调一次 `ctx.slots.renderSlot('root', {})`。 [E: packages/client/web/src/app.tsx:41] `ui-layout` 把 `AppFrame` 登记进 `'root'`，并声明四个子槽：

| 槽 | kind / scope | 谁占 | 人看见什么 |
|---|---|---|---|
| `'root'` | `single` / `root` | `ui-layout` → `AppFrame` [E: packages/client/ui-layout/src/client/index.ts:121] | 三列壳 |
| `'sidebar'` | `single` / `root` | `ui-sidebar` [E: packages/client/ui-sidebar/src/client/index.ts:42] | 会话树、Workspace、设置入口。`AppFrame` `renderSlot('sidebar', …)` [E: packages/client/ui-layout/src/client/AppFrame.tsx:179] |
| `'conversation'` | `single` / `session-maybe` | `ui-conversation` [E: packages/client/ui-conversation/src/client/apply.ts:197] | Hero / 对话流 / composer。`renderSlot('conversation', {})` [E: packages/client/ui-layout/src/client/AppFrame.tsx:190] |
| `'details'` | `single` / `session` | `ui-conversation` 的 `DetailsPanel` [E: packages/client/ui-conversation/src/client/apply.ts:445] | 工具细节列。`renderSlot('details', {})` [E: packages/client/ui-layout/src/client/AppFrame.tsx:191] |
| `'shell.overlay'` | `list` / `root` | 设置面板、popupSelect 等加法面 | 浮在整框上。`renderSlot('shell.overlay', {})` [E: packages/client/ui-layout/src/client/index.ts:126] [E: packages/client/ui-layout/src/client/AppFrame.tsx:194] |

`'root'` 是 `single`：再 `register` 会阴影整框。加法面用 `'shell.overlay'`。

`app-shell` 伪包 id 是 `APP_SHELL_ID = '@deepseek-ai/dsh-client-app-shell'`（无 npm 包，host 图没有这一行）。`inject = ['slots', 'sessions', 'layout']`，`apply` 里 `ctx.slots.install(createSlotRenderer())` 再 `provide('appShell')`。 [E: packages/client/web/src/app-shell.ts:11] [E: packages/client/web/src/app-shell.ts:30] [E: packages/client/web/src/app-shell.ts:39]

### shipped `ui-*`（id + 一句职责）

web-app 第一段 `insert` 里的浏览器 chrome。**不要**把每一行当成独立子系统；控制流在对应 T2。下表按 yml 出现顺序列出全部 shipped `ui-*` id。 [E: packages/bundle/web-app/cordis.patch.yml:174]

| `id` | `name` | 职责 |
|---|---|---|
| `ui-theme` | `@deepseek-ai/dsh-client-ui-theme` | 亮/暗/系统主题与 Appearance 行 |
| `ui-layout` | `@deepseek-ai/dsh-client-ui-layout` | `AppFrame` 三列 + `ctx.layout` |
| `ui-sidebar` | `@deepseek-ai/dsh-client-ui-sidebar` | 会话树、搜索、分组、状态点 |
| `ui-settings` | `@deepseek-ai/dsh-client-ui-settings` | 设置域底座与槽位合同 |
| `ui-settings-general` | `@deepseek-ai/dsh-client-ui-settings-general` | General 段、欢迎页、壳 chrome 文案 |
| `ui-settings-models` | `@deepseek-ai/dsh-client-ui-settings-models` | Models 设置与 onboarding 对话框 |
| `ui-settings-plugin-inventory` | `@deepseek-ai/dsh-client-ui-settings-plugin-inventory` | Plugins 设置里只读 Loader 清单 |
| `ui-conversation` | `@deepseek-ai/dsh-client-ui-conversation` | 对话骨架、chat 流、composer、details host |
| `ui-tool` | `@deepseek-ai/dsh-client-ui-tool` | tool-call 树与按工具名的视图 |
| `ui-cordis` | `@deepseek-ai/dsh-client-ui-cordis` | `cordis_define` 工具卡片 |
| `ui-workflow-run` | `@deepseek-ai/dsh-client-ui-workflow-run` | 耐久 workflow-run 对话节点 |
| `ui-deliverables` | `@deepseek-ai/dsh-client-ui-deliverables` | turn 尾部产出文件行 |
| `ui-workspace` | `@deepseek-ai/dsh-client-ui-workspace` | Workspace 选择器（sidebar / empty-state） |
| `ui-input-trigger` | `@deepseek-ai/dsh-client-ui-input-trigger` | composer 里 `/` 与 `@` 触发管线 |
| `ui-commands` | `@deepseek-ai/dsh-client-ui-commands` | slash 菜单、三种命令 UI、`popupSelect` |
| `ui-skill` | `@deepseek-ai/dsh-client-ui-skill` | `@` skill 引用与 skill 工具行 |
| `ui-subagent` | `@deepseek-ai/dsh-client-ui-subagent` | 子代理目录、续跑、`@` 引用 |
| `ui-jobs` | `@deepseek-ai/dsh-client-ui-jobs` | 会话头上的后台 job 列表 |
| `ui-goal` | `@deepseek-ai/dsh-client-ui-goal` | composer 上方 GoalBar |
| `ui-message-feedback` | `@deepseek-ai/dsh-client-ui-message-feedback` | assistant 条上的赞/踩 |
| `ui-model-selection` | `@deepseek-ai/dsh-client-ui-model-selection` | `/model` 与 composer 模型座 |
| `ui-permission` | `@deepseek-ai/dsh-client-ui-permission-presets` | `/permission` 与默认权限座 |
| `ui-agent-preset` | `@deepseek-ai/dsh-client-ui-agent-preset` | 默认 preset / 本会话 preset / 编辑器 |
| `ui-settings-plugins` | `@deepseek-ai/dsh-client-ui-settings-plugins` | 用户可配的 host 插件卡片 |
| `ui-plan` | `@deepseek-ai/dsh-client-ui-plan` | plan-mode 座与 `/plan` |
| `ui-user-questions` | `@deepseek-ai/dsh-client-ui-user-questions` | `ask_user_question` 接管 composer |
| `ui-trajectory` | `@deepseek-ai/dsh-client-ui-trajectory` | 轨迹事件账本（conversation ViewMap） |

同表里还有非 `ui-*` 但进 `__DSH_BOOT__` 的装配行：`locale`、`modules`、`connection`、`api-remotes`、`client-runtime`、`cordis-client-runner`、`client-hmr`。 [E: packages/bundle/web-app/cordis.patch.yml:151] [E: packages/bundle/web-app/cordis.patch.yml:168]

`ui-primitives` / `ui-attachment` / `ui-slots` 是库，**不是** Loader 行。`ui-directory-picker-*` 不在这份 shipped insert 里。

### 人提交的两条缝

| 人怎么做 | client 调用 | 会不会开模型 turn |
|---|---|---|
| composer 主按钮 | `inputActions.submit()` [E: packages/client/ui-conversation/src/client/skeleton/InputBar.tsx:554] | 会。host 再 `followup`。client 只发 unary RPC。[E: packages/client/runtime/src/client/sessions/session.ts:202] |
| 空闲 Enter | `keyboard.submit(resolveSubmitMode(...))` [E: packages/client/ui-conversation/src/client/skeleton/InputBar.tsx:335] | 同上，会开 turn。 |
| 行首 `/name …` 被 command 认领 | `ui-commands` 走 `remote.commands.execute` [E: packages/client/ui-commands/src/client/service.ts:374] | **不会**。人命令不经 `session.prompt`。产品面见 [`surface.commands.overview`](../commands/overview.md)。 |

`Session.prompt` 在第一个 `await` 之前同步置 `promptAttempted = true`，blank 会话当帧切到 `engaging`。 [E: packages/client/runtime/src/client/sessions/session.ts:196]

外向面 `ISessions` **没有** `create`。 [E: packages/client/runtime/src/client/contract/sessions.ts:26] New Session 走 `workspaces.startSession`。 [E: packages/client/runtime/src/client/workspaces/service.ts:177]

## 装配与门控

1. **组合。** `PROFILE_TEMPLATES.web = ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app']`。 [E: packages/boot/app-boot/src/profile.ts:115] web overlay 插入 `web-startup` / `webserver` / `web-runtime` / 浏览器 roster，以及 `agent-presets` `default: standard`。 [E: packages/bundle/web-app/cordis.patch.yml:424] 同一 overlay 把 base 上的模型可见行写成 `disabled: true`（例如 `tool-bash`），改由每会话 preset 再挂。 [E: packages/bundle/web-app/cordis.patch.yml:294] `headless` 模板是 `dsh-base` + `dsh-headless`，**没有**这份 GUI。 [E: packages/boot/app-boot/src/profile.ts:116]

2. **bind 门。** `webserver` / `web-runtime` 都 `inject: [webStartup]`。`--host 0.0.0.0`、非数字 `--port`、`--help` 都不 provide 该服务，依赖行 pending，进程不 listen。 [E: packages/bundle/web-app/src/startup.ts:70] [E: packages/bundle/web-app/tests/startup.spec.ts:134]

3. **dist 门。** `web-runtime` `ctx.plugin(FrontendStatic, { distIndex })`。缺 `@deepseek-ai/dsh-web-frontend/dist/index.html` 抛 `frontend dist not built`。 [E: packages/bundle/web-app/src/index.ts:139] [E: packages/bundle/web-app/src/index.ts:122]

4. **HTTP 分工。** `connection` 登记 prefix `/api`（`API_PATH`）。[E: packages/client/connection/src/index.ts:173] upgrade 另登 `/api/events.mux` / `/api/events.host`。[E: packages/client/connection/src/index.ts:193] [E: packages/client/connection/src/index.ts:194] `modules` 登记 prefix `/plugins` 并 `tapIndex`。 [E: packages/client/modules/src/index.ts:242] `webserver` 自己不认识这些路径。

5. **壳两阶段。** `AppWebEntry.run`：parse 图 → 画 HARNESS loading → prefetch `immediately` + 挂 Loader → adopt `modules` 与其余 plugin 行 + 壳自有 `APP_SHELL_ID` → `loader.await()` + 全 fiber `ACTIVE` → `settled.set(true)`。 [E: packages/client/web/src/boot.tsx:137] `AppRoot` 只看 `settled`，不看 status 全员 `active`。 [E: packages/client/web/src/AppRoot.tsx:35] [E: packages/client/web/tests/app-root.client.spec.tsx:47] plugin 阶段失败把 message 写进 `error` store；UI 文案 `Failed to load plugins` 在 `AppRoot`。[E: packages/client/web/src/boot.tsx:141] [E: packages/client/web/src/AppRoot.tsx:52]

6. **对象层。** 浏览器 `apply`：`SlotRegistry`、`SessionRuntime`、`WorkspaceRuntime`、conversation registry，再 `connection.start`。 [E: packages/client/runtime/src/client/index.ts:189] [E: packages/client/runtime/src/client/index.ts:195] [E: packages/client/runtime/src/client/index.ts:199] [E: packages/client/runtime/src/client/index.ts:204] mux `session/event` 折进窗口；client 从不 `kick()` loop。

7. **Workspace 门。** `startInitialSelection`：已有 `current` **或** 没有 `recentWorkspaceId`（没有任何 Workspace）则结束，**不** `session.create`。 [E: packages/client/runtime/src/client/workspaces/service.ts:139] `startSession` 三个候选都没有时只 `sessions.clear()`。 [E: packages/client/runtime/src/client/workspaces/service.ts:184]

8. **Vite 门。** `rejectStandaloneServe` 在 `env.command === 'serve'` 时抛错，`Server.listen` 不会发生。正确路径是 `dsh web`（开发态可另开 `pnpm run dev:web` 给 `client-hmr`）。 [E: apps/web/vite.config.ts:16]

失败怎么响：

| 条件 | 响应 |
|---|---|
| `--host 0.0.0.0` | usage error，exit 1，不 provide `webStartup`，不 bind |
| 缺 frontend dist | `web-runtime` 抛错，boot fail-loud |
| listen 失败 | `WebServer` init reject（如 `EADDRINUSE`） |
| 缺 / 畸形 `__DSH_BOOT__` | `run()` reject，没有 loading 页 |
| plugin 未 ACTIVE | 留在 HARNESS 页列失败 id |
| 无 Workspace | 不 mint 会话；New Session 进空态 |
| 普通提问 | POST `/api/session.prompt`；端到端见 [`spine.trace-web-first-prompt`](../../spine/trace-web-first-prompt.md) |

## 跨包关系

- `surface.profiles.web`（[../profiles/web.md](../profiles/web.md)）— `dsh web` alias、`--host` / `--port`、web overlay 全表与 disable 清单。本页是打开之后的 GUI，不复述那张组合表。
- `surface.cli.overview`（[../cli/overview.md](../cli/overview.md)）— launcher 三种 mode；`dsh web` 在那里只是 alias。
- `spine.trace-web-first-prompt`（[../../spine/trace-web-first-prompt.md](../../spine/trace-web-first-prompt.md)）— 从 `dsh web` 到第一轮 `session.prompt` / `turn/end`。本页停在壳与 chrome。
- `subsys.client.web`（[../../subsystems/client/web.md](../../subsystems/client/web.md)）— `AppWebEntry.run` 两阶段控制流。
- `subsys.host.webserver`（[../../subsystems/host/webserver.md](../../subsystems/host/webserver.md)）— `register` / `match` / fallback / `tapIndex`。
- `subsys.client.runtime`（[../../subsystems/client/runtime.md](../../subsystems/client/runtime.md)）— `ctx.slots` / `ctx.sessions` / `ctx.workspaces` 对象层。
- `surface.commands.overview`（[../commands/overview.md](../commands/overview.md)）— `/name` 人命令；工作台只提供 slash 菜单与 `remote.commands.execute`。

## Sources

- packages/client/web/src/index.ts
- packages/client/web/src/boot.tsx
- packages/client/web/src/AppRoot.tsx
- packages/client/web/src/app-shell.ts
- packages/client/web/src/app.tsx
- packages/client/web/tests/app-root.client.spec.tsx
- packages/client/runtime/src/index.ts
- packages/client/runtime/src/client/index.ts
- packages/client/runtime/src/client/sessions/session.ts
- packages/client/runtime/src/client/workspaces/service.ts
- packages/client/runtime/src/client/contract/sessions.ts
- packages/client/runtime/package.json
- packages/host/webserver/src/index.ts
- packages/host/frontend-static/src/index.ts
- packages/bundle/web-app/src/startup.ts
- packages/bundle/web-app/src/index.ts
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/web-app/tests/startup.spec.ts
- packages/boot/app-boot/src/profile.ts
- apps/cli/src/args.ts
- apps/cli/tests/args.spec.ts
- apps/cli/tests/built-bin.e2e.ts
- apps/web/src/main.ts
- apps/web/index.html
- apps/web/vite.config.ts
- packages/client/modules/src/index.ts
- packages/client/modules/src/client/manifest.ts
- packages/client/connection/src/index.ts
- packages/client/connection/src/api-path.ts
- packages/client/ui-layout/src/client/index.ts
- packages/client/ui-layout/src/client/AppFrame.tsx
- packages/client/ui-conversation/src/client/apply.ts
- packages/client/ui-conversation/src/client/skeleton/InputBar.tsx
- packages/client/ui-conversation/src/client/input/facade.ts
- packages/client/ui-sidebar/src/client/index.ts
- packages/client/ui-commands/src/client/service.ts

## 相关

无 index related。邻居节点：

- `surface.profiles.web`：[web profile](../profiles/web.md)
- `surface.cli.overview`：[CLI 入口与旗标](../cli/overview.md)
- `spine.trace-web-first-prompt`：[trace: Web 第一次提问](../../spine/trace-web-first-prompt.md)
- `subsys.client.web`：[web shell](../../subsystems/client/web.md)
- `subsys.host.webserver`：[HTTP 宿主](../../subsystems/host/webserver.md)
- `subsys.client.runtime`：[client runtime](../../subsystems/client/runtime.md)
- `surface.commands.overview`：[人命令 ctx.commands](../commands/overview.md)
