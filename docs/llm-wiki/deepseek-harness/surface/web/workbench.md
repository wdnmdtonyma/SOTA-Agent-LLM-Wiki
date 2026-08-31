---
id: surface.web.workbench
title: Web 工作台可见面
kind: surface
tier: T1
pkg: client
source:
  - packages/client/web/src/index.ts
  - packages/client/web/src/boot.ts
  - packages/client/web/src/boot-page.ts
  - packages/client/ui-renderer/src/index.ts
  - packages/client/ui-renderer/src/client/index.ts
  - packages/client/ui-renderer/src/client/app.tsx
  - packages/client/store/package.json
  - packages/api/session-controller/src/client/index.ts
  - packages/api/session-controller/src/client/sessions/session.ts
  - packages/api/session-controller/src/client/contract/sessions.ts
  - packages/api/workspace-controller/src/client/index.ts
  - packages/client/ui-workspace/src/client/navigation.ts
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
  - packages/client/ui-sidebar/src/client/index.ts
  - packages/client/ui-commands/src/client/service.ts
  - packages/client/ui-chat/src/client/apply.ts
symbols:
  - AppWebEntry
  - ctx.webServer
  - window.__DSH_BOOT__
  - WebServer
  - ctx.uiRenderer
  - ctx.sessions
related:
  - surface.profiles.web
  - surface.cli.overview
  - spine.trace-web-first-prompt
  - subsys.client.web
  - subsys.host.webserver
  - subsys.client.runtime
  - surface.commands.overview
evidence: explicit
status: verified
updated: 0a53fb55be
---

> 工作台是用户打开的**本地 Web GUI**：`dsh web`（≡ `--profile web`）在 **host 面** `listen` 一个只做路由登记的 `ctx.webServer`，浏览器半边用 `AppWebEntry` 读 `window.__DSH_BOOT__`，Loader 静默后把 mount 点交给 `ctx.uiRenderer`。client **不**执行模型 turn。DSH 是 Cordis 组合运行时（`profile → bundle → agent preset`）；本仓没有 shipped TUI。`dsh web` **不是**唯一宿主入口：还可用 `dsh --profile headless|sdk|sdk-minimal|acp`。

## 能回答的问题

- 打开这份 GUI 打什么命令？缺省 bind / 打印出的 URL 是什么？`--host 0.0.0.0` 会不会 listen？`--no-open` 做什么？
- `apps/web` 自己做了什么？没有 `window.__DSH_BOOT__` 时裸 Vite 能不能当应用跑？
- 屏幕上的 sidebar / 对话列 / details / 浮层是哪些槽？每个 shipped `ui-*` 一行干什么？
- 普通文本和行首 `/` 命令各走哪条缝？client 会不会自己 `kick()` loop？
- host 面上的 `tool-*` 为什么是 `disabled`？新会话默认挂哪个 agent preset？
- 没有 Workspace 会不会凭空 mint 会话？

## 是什么

DSH 不是「又一个 coding agent」。一次 `dsh web` 叠三面：

| 面 | 活在哪 | 工作台看到的职责 |
|---|---|---|
| **host 面** | 进程级，一份 | `WebServer` listen；`/api` 与 fallback 发 dist；会话落盘、sandbox、注册表。`webserver` **不**发文件、**不**打印 URL。 |
| **client 面** | 浏览器半边 | 壳、槽位、composer、slash 菜单。对象层发 RPC、收 mux。**不**跑 agent loop。 |
| **agent-preset 面** | 每会话 | 模型可见 tools / persona / isolate。web overlay 把 base 上的 `tool-*` 行关掉，改由 preset 再挂；缺省 `standard`。 |

capability seam 仍是 Definition / Provider / Consumer。`model-visible ⟺ logged`：模型看见的工具集写在该会话的 preset + session log 里，不写在浏览器内存里。

默认安装路径就是这份本地 GUI。`PROFILE_TEMPLATES` 有五个 shipped 名：`acp` / `web` / `headless` / `sdk` / `sdk-minimal`；`web` 是其中唯一 `patchReload: 'live'` 的模板。没有 TUI 模板。 [E: packages/boot/app-boot/src/profile.ts:137] [E: packages/boot/app-boot/src/profile.ts:142] [E: packages/boot/app-boot/src/profile.ts:144]

壳库是 `@deepseek-ai/dsh-client-web`，产品符号是 `AppWebEntry`。 [E: packages/client/web/src/index.ts:9]

浏览器快照引擎是 `@deepseek-ai/dsh-client-store`（React-free observable / snapshot store）。 [E: packages/client/store/package.json:2] 会话对象层在 `@deepseek-ai/dsh-api-session-controller` 的 `src/client/`：`apply` 安装 `ctx.sessions`。 [E: packages/api/session-controller/src/client/index.ts:71] [E: packages/api/session-controller/src/client/index.ts:88] Workspace 对象层在 `@deepseek-ai/dsh-api-workspace-controller` 的 `src/client/`：`ctx.workspaces`。 [E: packages/api/workspace-controller/src/client/index.ts:33] [E: packages/api/workspace-controller/src/client/index.ts:44] 已删除包 `packages/client/runtime` **不要**再当 source。

槽渲染与 `ctx.uiRenderer.mount` 在 `@deepseek-ai/dsh-client-ui-renderer` 的 client `apply`；host 半边 `apply()` 是空函数。 [E: packages/client/ui-renderer/src/client/index.ts:88] [E: packages/client/ui-renderer/src/index.ts:4] 组装应用只调一次 `ctx.slots.renderSlot('root', {})`。 [E: packages/client/ui-renderer/src/client/app.tsx:21]

HTTP 载体是 `@deepseek-ai/dsh-host-webserver` 的 `WebServer`，Cordis 键 `ctx.webServer`。 [E: packages/host/webserver/src/index.ts:24] 构造立刻 `super(ctx, 'webServer')`；`[Service.init]` 立刻 `listen`。 [E: packages/host/webserver/src/index.ts:144] [E: packages/host/webserver/src/index.ts:220]

## 入口

用户碰到工作台的路径：

| 入口 | 行为 |
|---|---|
| `dsh web [app args…]` | launcher 子命令，action 把 profile 写成 `'web'`。`parse(['web'])` 得到 `{ mode: 'profile', profile: 'web', … }`。 [E: apps/cli/src/args.ts:156] [E: apps/cli/src/args.ts:168] [E: apps/cli/tests/args.spec.ts:28] |
| `dsh --profile web [app args…]` | 同一条 `mode: 'profile'`。`--host` / `--no-open` / `--port` / `--trusted-host` 是 inner args，不是 launcher 旗标。 [E: apps/cli/tests/args.spec.ts:40] |
| 监督进程 stdout | Loader 整树 settle 后 `web-runtime` 打印 `dsh web: <authenticatedUrl>`（可带 LAN）。 [E: packages/bundle/web-app/src/index.ts:280] |
| 浏览器打开该 URL | `frontend-static` 占 fallback，发 dist / SPA `index.html`。 [E: packages/host/frontend-static/src/index.ts:124] |
| `apps/web` `#root` | HTML 只提供空 `#root`。 [E: apps/web/index.html:11] `main.ts` 找不到则抛 `web app: missing #root`，否则 `new AppWebEntry(el).run()`。 [E: apps/web/src/main.ts:4] [E: apps/web/src/main.ts:5] [E: apps/web/src/main.ts:6] |
| `window.__DSH_BOOT__` | host `ClientModuleRegistry` 把 `{ kind: 'global', name: '__DSH_BOOT__', value: graph }` 写进 index injection。 [E: packages/client/modules/src/index.ts:522] 壳把 `win.__DSH_BOOT__` 交给 `moduleLoader.create`。 [E: packages/client/web/src/boot.ts:69] `parseBootManifest` 校验该对象。 [E: packages/client/modules/src/client/manifest.ts:167] |

`dsh --profile web --help` 打 `Usage: dsh --profile web`，stdout **不含** `dsh web: http://`（action 不跑，不 bind）。 [E: apps/cli/tests/built-bin.e2e.ts:355] [E: apps/cli/tests/built-bin.e2e.ts:357] launcher 把 `--profile web -h` 的 `-h` 放进 inner `args`。 [E: apps/cli/tests/args.spec.ts:38]

裸 `vite` / `vite preview` 在 listen 之前抛错：`apps/web is not a standalone application: bare Vite cannot inject window.__DSH_BOOT__`。 [E: apps/web/vite.config.ts:9] [E: apps/web/vite.config.ts:35]

其它 shipped 入口（**没有**这份 GUI）：`dsh --profile headless`、`dsh --profile sdk`、`dsh --profile sdk-minimal`、`dsh --profile acp`。launcher 硬编码的 profile 别名只有 `web`。 [E: apps/cli/src/args.ts:156]

## 关键字段

### Bind 与 safety

`WEB_STARTUP_SERVICE` 字面量是 `'webStartup'`。`--host` 等于 `'0.0.0.0'` 时 `program.error`（safety：会把 RCE 暴露到网络），**不会** `provide('webStartup')`。 [E: packages/bundle/web-app/src/startup.ts:20] [E: packages/bundle/web-app/src/startup.ts:74] [E: packages/bundle/web-app/src/startup.ts:80]

web 旗标：`--host`、`--no-open`、`--port`、`--trusted-host`。Commander 的 `--no-open` 发布 `openBrowser: options.open`（默认打开）。 [E: packages/bundle/web-app/src/startup.ts:51] [E: packages/bundle/web-app/src/startup.ts:52] [E: packages/bundle/web-app/src/startup.ts:81]

`id: webserver`：`inject: [webStartup]`，`host: !!js ctx.webStartup.host ?? '127.0.0.1'`，`port: !!js ctx.webStartup.port ?? 3080`。无旗标时服务值是 `{ openBrowser: true, trustedHosts: [] }`，consumer 的 `??` 读成 `127.0.0.1:3080`。 [E: packages/bundle/web-app/cordis.patch.yml:113] [E: packages/bundle/web-app/cordis.patch.yml:115] [E: packages/bundle/web-app/cordis.patch.yml:116] [E: packages/bundle/web-app/tests/startup.spec.ts:110] [E: packages/bundle/web-app/tests/startup.spec.ts:113] `web-runtime` 读 `openBrowser: !!js ctx.webStartup.openBrowser`。 [E: packages/bundle/web-app/cordis.patch.yml:134]

内建 bin：`dsh web --host 0.0.0.0` 的 stdout 为空，stderr 含 safety 句，exit 1。 [E: apps/cli/tests/built-bin.e2e.ts:363] [E: apps/cli/tests/built-bin.e2e.ts:365]

`WebServer.Config.host` 仍是 `'127.0.0.1' | '0.0.0.0'`。旗标路径拒 all-interfaces ≠ schema 禁止；一条整行改 `webserver.config.host` 的 overlay 仍可能 bind `0.0.0.0`。 [E: packages/host/webserver/src/index.ts:61]

`listen` 成功后本包只写 `listenedPort`。 [E: packages/host/webserver/src/index.ts:297] URL 行属于 `web-app`。 [E: packages/bundle/web-app/src/index.ts:280] 未命中 named route 时把请求交给唯一 fallback。 [E: packages/host/webserver/src/index.ts:230] 发文件的是 `frontend-static`。 [E: packages/host/frontend-static/src/index.ts:124]

缺 `@deepseek-ai/dsh-web-frontend` 时 `resolveDistIndex` 抛 `web-app: @deepseek-ai/dsh-web-frontend is not resolvable from this composition`。 [E: packages/bundle/web-app/src/index.ts:177] `web-runtime` `ctx.plugin(FrontendStatic, { distIndex })`。 [E: packages/bundle/web-app/src/index.ts:241]

### `window.__DSH_BOOT__`

类型是 `WebBootGraph`：`rev: string` + `entries[]`（每行 `id` / `url` / `rev`，可选 `inject` / `immediately` / `external`）+ `batches[]`。 [E: packages/client/modules/src/client/manifest.ts:81] [E: packages/client/modules/src/client/manifest.ts:50] [E: packages/client/modules/src/client/manifest.ts:69] 缺对象时文案是 `client-modules: window.__DSH_BOOT__ is missing or not an object`。 [E: packages/client/modules/src/client/manifest.ts:169]

`AppWebEntry` 构造立刻画 `BootPage`（wordmark `HARNESS`）。 [E: packages/client/web/src/boot.ts:38] [E: packages/client/web/src/boot-page.ts:37] `run()` 缺 `window.__ModuleLoader__` 抛 `web boot: window.__ModuleLoader__ bootstrap facade is missing`，catch 里 `page.fail`。 [E: packages/client/web/src/boot.ts:58] [E: packages/client/web/src/boot.ts:83] Loader 条目未 ACTIVE 则抛 `web boot: N entries did not activate`。 [E: packages/client/web/src/boot.ts:156] 静默后 `ctx.inject(['uiRenderer'], … mount(container))`。 [E: packages/client/web/src/boot.ts:97]

### 工作台槽位

`buildRenderApp` 在全程序里只调一次 `ctx.slots.renderSlot('root', {})`。 [E: packages/client/ui-renderer/src/client/app.tsx:21] `ui-layout` 把 `AppFrame` 登记进 `'root'`，并声明四个子槽：

| 槽 | kind / scope | 谁占 | 人看见什么 |
|---|---|---|---|
| `'root'` | `single` / 内建 | `ui-layout` → `AppFrame` [E: packages/client/ui-layout/src/client/index.ts:124] | 三列壳 |
| `'sidebar'` | `single` / `root` | `ui-sidebar` [E: packages/client/ui-sidebar/src/client/index.ts:51] | 会话树、Workspace、设置入口。`AppFrame` `renderSlot('sidebar', …)` [E: packages/client/ui-layout/src/client/AppFrame.tsx:194] |
| `'conversation'` | `single` / `session-maybe` | `ui-conversation` [E: packages/client/ui-conversation/src/client/apply.ts:173] | Hero / 对话流 / composer。`renderSlot('conversation', {})` [E: packages/client/ui-layout/src/client/AppFrame.tsx:205] |
| `'details'` | `single` / `session` | `ui-chat` [E: packages/client/ui-chat/src/client/apply.ts:161] | 工具细节列。`renderSlot('details', {})` [E: packages/client/ui-layout/src/client/AppFrame.tsx:207] |
| `'shell.overlay'` | `list` / `root` | 设置面板、popupSelect 等加法面 | 浮在整框上。`renderSlot('shell.overlay', {})` [E: packages/client/ui-layout/src/client/index.ts:130] [E: packages/client/ui-layout/src/client/AppFrame.tsx:211] |

`'root'` 是 `single`：再 `register` 会阴影整框。加法面用 `'shell.overlay'`。

`ui-renderer` client `apply`：`SlotRegistry` + `slots.install(createSlotRenderer())` + `provide('uiRenderer')`。 [E: packages/client/ui-renderer/src/client/index.ts:89]

### shipped `ui-*`（id + 一句职责）

web-app 浏览器 chrome。**不要**把每一行当成独立子系统。下表按 yml 出现顺序列出全部 shipped `ui-*` id。 [E: packages/bundle/web-app/cordis.patch.yml:172]

| `id` | `name` | 职责 |
|---|---|---|
| `ui-theme` | `@deepseek-ai/dsh-client-ui-theme` | 亮/暗/系统主题与 Appearance 行 |
| `ui-layout` | `@deepseek-ai/dsh-client-ui-layout` | `AppFrame` 三列 + `ctx.layout` |
| `ui-renderer` | `@deepseek-ai/dsh-client-ui-renderer` | 槽渲染器 + `ctx.uiRenderer.mount` |
| `ui-session` | `@deepseek-ai/dsh-client-ui-session` | Session 标准 props / SessionProvider |
| `ui-sidebar` | `@deepseek-ai/dsh-client-ui-sidebar` | 会话树、搜索、分组、状态点 |
| `ui-settings` | `@deepseek-ai/dsh-client-ui-settings` | 设置域底座与槽位合同 |
| `ui-settings-general` | `@deepseek-ai/dsh-client-ui-settings-general` | General 段、欢迎页、壳 chrome 文案 |
| `ui-settings-models` | `@deepseek-ai/dsh-client-ui-settings-models` | Models 设置与 onboarding 对话框 |
| `ui-settings-plugin-inventory` | `@deepseek-ai/dsh-client-ui-settings-plugin-inventory` | Plugins 设置里只读 Loader 清单 |
| `ui-conversation` | `@deepseek-ai/dsh-client-ui-conversation` | 对话骨架、composer、input 槽 |
| `ui-approval` | `@deepseek-ai/dsh-client-ui-approval` | 审批卡片 |
| `ui-chat` | `@deepseek-ai/dsh-client-ui-chat` | chat 流与 `details` 列 |
| `ui-brand-official` | `@deepseek-ai/dsh-client-ui-brand-official` | sidebar / conversation 品牌槽官方占位 |
| `ui-attachment` | `@deepseek-ai/dsh-client-ui-attachment` | 附件面（现为 Loader 行） |
| `ui-tool` | `@deepseek-ai/dsh-client-ui-tool` | tool-call 树与按工具名的视图 |
| `ui-cordis` | `@deepseek-ai/dsh-client-ui-cordis` | `cordis_define` 工具卡片 |
| `ui-workflow-run` | `@deepseek-ai/dsh-client-ui-workflow-run` | 耐久 workflow-run 对话节点 |
| `ui-deliverables` | `@deepseek-ai/dsh-client-ui-deliverables` | turn 尾部产出文件行 |
| `ui-workspace` | `@deepseek-ai/dsh-client-ui-workspace` | Workspace 选择器 + `ctx.uiWorkspace` |
| `ui-input-trigger` | `@deepseek-ai/dsh-client-ui-input-trigger` | composer 里 `/` 与 `@` 触发管线 |
| `ui-commands` | `@deepseek-ai/dsh-client-ui-commands` | slash 菜单、三种命令 UI、`popupSelect` |
| `ui-skill` | `@deepseek-ai/dsh-client-ui-skill` | `@` skill 引用与 skill 工具行 |
| `ui-subagent` | `@deepseek-ai/dsh-client-ui-subagent` | 子代理目录、续跑、`@` 引用 |
| `ui-reference` | `@deepseek-ai/dsh-client-ui-reference` | 通用 `@` 引用源 |
| `ui-schedule` | `@deepseek-ai/dsh-client-ui-schedule` | Schedule 目录；**yml 里 `disabled: true`**，要 overlay 才开 [E: packages/bundle/web-app/cordis.patch.yml:261] |
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

同表里还有非 `ui-*` 但进 `__DSH_BOOT__` 的装配行：`locale`、`modules`、`connection`、`api-remotes`、`cordis-client-runner`、`client-hmr`。 [E: packages/bundle/web-app/cordis.patch.yml:152] [E: packages/bundle/web-app/cordis.patch.yml:169]

`ui-slots` 是库，**不是** Loader 行。`ui-directory-picker-*` 不在这份 shipped insert 里。

### 人提交的两条缝

| 人怎么做 | client 调用 | 会不会开模型 turn |
|---|---|---|
| composer 主按钮 | `inputActions.submit()` [E: packages/client/ui-conversation/src/client/skeleton/InputBar.tsx:325] | 会。host 再 `followup`。client 只发 unary RPC。`Session.prompt` [E: packages/api/session-controller/src/client/sessions/session.ts:207] |
| 空闲 Enter | `keyboard.submit(g.resolveSubmitMode(...))` [E: packages/client/ui-conversation/src/client/skeleton/InputBar.tsx:275] | 同上，会开 turn。 |
| 行首 `/name …` 被 command 认领 | `ui-commands` 走 `remote.commands.execute` [E: packages/client/ui-commands/src/client/service.ts:405] | **不会**。人命令不经 `session.prompt`。产品面见 [`surface.commands.overview`](../commands/overview.md)。 |

`Session.prompt` 在第一个 `await` 之前同步置 `promptAttempted = true`。 [E: packages/api/session-controller/src/client/sessions/session.ts:218]

外向面 `ISessions` **有** `create`。 [E: packages/api/session-controller/src/client/contract/sessions.ts:35] New Session 走 `ctx.uiWorkspace.startSession`（sidebar 注入）。 [E: packages/client/ui-sidebar/src/client/index.ts:46] [E: packages/client/ui-workspace/src/client/navigation.ts:114] 没有 current / recent Workspace 时只 `sessions.clear()`，**不** mint。 [E: packages/client/ui-workspace/src/client/navigation.ts:126] 有 Workspace 时 `sessions.create({ workspaceId })`。 [E: packages/client/ui-workspace/src/client/navigation.ts:108]

## 装配与门控

1. **组合。** `PROFILE_TEMPLATES.web = ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app']`，`patchReload: 'live'`。 [E: packages/boot/app-boot/src/profile.ts:143] web overlay 插入 `web-startup` / `webserver` / `web-runtime` / 浏览器 roster，以及 `agent-presets` `default: standard`。 [E: packages/bundle/web-app/cordis.patch.yml:445] 同一 overlay 把 base 上的模型可见行写成 `disabled: true`（例如 `tool-bash`），改由每会话 preset 再挂。 [E: packages/bundle/web-app/cordis.patch.yml:320] `headless` 模板是 `dsh-base` + `dsh-headless`，**没有**这份 GUI。 [E: packages/boot/app-boot/src/profile.ts:147] 四个 shipped preset 目录名是 `minimal` / `standard` / `ptc` / `cordis`（旧名 `code` = PTC）。

2. **bind 门。** `webserver` / `web-runtime` 都 `inject: [webStartup]`。`--host 0.0.0.0`、非数字 `--port`、`--help` 都不 provide 该服务，依赖行 pending，进程不 listen。 [E: packages/bundle/web-app/src/startup.ts:74] [E: packages/bundle/web-app/tests/startup.spec.ts:138]

3. **dist 门。** `web-runtime` `ctx.plugin(FrontendStatic, { distIndex })`。前端包不可解析则 fail-loud。 [E: packages/bundle/web-app/src/index.ts:241] [E: packages/bundle/web-app/src/index.ts:177]

4. **HTTP 分工。** `connection` 登记 prefix `/api`（`API_PATH`）。 [E: packages/client/connection/src/api-path.ts:7] [E: packages/client/connection/src/index.ts:116] `webserver` 自己不认识这些路径。Host HTTP API 是三个 controller（`session` / `settings` / `workspace`），不是已删除的 `apiproxy`。

5. **壳两阶段。** `AppWebEntry.run`：等 `__DSH_BOOT_READY__` → 建 module system → prefetch `immediately` → Loader create 全部行 → `loader.await()` → 审计 ACTIVE → `uiRenderer.mount`。 [E: packages/client/web/src/boot.ts:54] [E: packages/client/web/src/boot.ts:133] [E: packages/client/web/src/boot.ts:97] 失败走 `BootPage.fail`，不是独立 React `AppRoot`。 [E: packages/client/web/src/boot.ts:83] [E: packages/client/web/src/boot-page.ts:72]

6. **对象层。** Session client `apply` 需要 `typert` / `remote` / `remote.commands` / `remote.session` / `remote.subagents`，并 `createSessionControlStream`。 [E: packages/api/session-controller/src/client/index.ts:76] [E: packages/api/session-controller/src/client/index.ts:103] client 从不 `kick()` loop。

7. **Workspace 门。** `UiWorkspaceService.startSession`：三个候选都没有时只 `sessions.clear()`。 [E: packages/client/ui-workspace/src/client/navigation.ts:125]

8. **Vite 门。** `rejectStandaloneServe` 在 `env.command === 'serve'` 时抛错。正确路径是 `dsh web`（开发态可另开 `pnpm run dev:web` 给 `client-hmr`）。 [E: apps/web/vite.config.ts:35]

失败怎么响：

| 条件 | 响应 |
|---|---|
| `--host 0.0.0.0` | usage error，exit 1，不 provide `webStartup`，不 bind |
| 缺 frontend 包 | `resolveDistIndex` 抛错，boot fail-loud |
| listen 失败 | `WebServer` init reject（如 `EADDRINUSE`） |
| 缺 `/` 畸形 `__DSH_BOOT__` 或 `__ModuleLoader__` | `run()` catch → `BootPage.fail`（HARNESS 页已在） |
| plugin 未 ACTIVE | `assertEntriesActive` 抛，boot 页列失败 id |
| 无 Workspace | 不 mint 会话；New Session 进空态 |
| 普通提问 | 经 session controller Remote `prompt`；端到端见 [`spine.trace-web-first-prompt`](../../spine/trace-web-first-prompt.md) |

## 跨包关系

- `surface.profiles.web`（[../profiles/web.md](../profiles/web.md)）— `dsh web` alias、`--host` / `--port` / `--no-open`、web overlay 全表与 disable 清单。本页是打开之后的 GUI，不复述那张组合表。
- `surface.cli.overview`（[../cli/overview.md](../cli/overview.md)）— launcher 三种 mode；`dsh web` 在那里只是 alias；其它宿主走 `--profile`。
- `spine.trace-web-first-prompt`（[../../spine/trace-web-first-prompt.md](../../spine/trace-web-first-prompt.md)）— 从 `dsh web` 到第一轮 `session.prompt` / `turn/end`。本页停在壳与 chrome。
- `subsys.client.web`（[../../subsystems/client/web.md](../../subsystems/client/web.md)）— `AppWebEntry.run` 两阶段控制流。
- `subsys.host.webserver`（[../../subsystems/host/webserver.md](../../subsystems/host/webserver.md)）— `register` / `match` / fallback / `tapIndex`。
- `subsys.client.runtime`（[../../subsystems/client/runtime.md](../../subsystems/client/runtime.md)）— `dsh-client-store` + session/workspace controller 客户端 + `ui-renderer`（节点 id 稳定别名）。
- `surface.commands.overview`（[../commands/overview.md](../commands/overview.md)）— `/name` 人命令；工作台只提供 slash 菜单与 `remote.commands.execute`。

## Sources

- packages/client/web/src/index.ts
- packages/client/web/src/boot.ts
- packages/client/web/src/boot-page.ts
- packages/client/ui-renderer/src/index.ts
- packages/client/ui-renderer/src/client/index.ts
- packages/client/ui-renderer/src/client/app.tsx
- packages/client/store/package.json
- packages/api/session-controller/src/client/index.ts
- packages/api/session-controller/src/client/sessions/session.ts
- packages/api/session-controller/src/client/contract/sessions.ts
- packages/api/workspace-controller/src/client/index.ts
- packages/client/ui-workspace/src/client/navigation.ts
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
- packages/client/ui-sidebar/src/client/index.ts
- packages/client/ui-commands/src/client/service.ts
- packages/client/ui-chat/src/client/apply.ts

## 相关

- `surface.profiles.web`：[web profile](../profiles/web.md)
- `surface.cli.overview`：[CLI 入口与旗标](../cli/overview.md)
- `spine.trace-web-first-prompt`：[trace: Web 第一次提问](../../spine/trace-web-first-prompt.md)
- `subsys.client.web`：[web shell](../../subsystems/client/web.md)
- `subsys.host.webserver`：[HTTP 宿主](../../subsystems/host/webserver.md)
- `subsys.client.runtime`：[client store / session client / ui-renderer](../../subsystems/client/runtime.md)
- `surface.commands.overview`：[人命令 ctx.commands](../commands/overview.md)
