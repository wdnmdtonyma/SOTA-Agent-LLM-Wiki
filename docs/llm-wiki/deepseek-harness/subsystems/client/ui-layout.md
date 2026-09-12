---
id: subsys.client.ui-layout
title: ui-layout
kind: subsystem
tier: T2
pkg: client
source:
  - packages/client/ui-layout/src/index.ts
  - packages/client/ui-layout/src/client/index.ts
  - packages/client/ui-layout/src/client/service.ts
  - packages/client/ui-layout/src/client/AppFrame.tsx
  - packages/client/ui-layout/src/client/columns.ts
  - packages/client/ui-layout/src/client/stores.ts
  - packages/client/ui-layout/src/client/theme-presenter.ts
  - packages/client/ui-layout/src/client/DocumentTitle.tsx
  - packages/client/ui-layout/src/client/AppFrame.module.css
  - packages/client/ui-layout/package.json
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/headless/cordis.patch.yml
  - packages/boot/app-boot/src/profile.ts
  - packages/client/ui-slots/src/index.ts
  - packages/client/ui-renderer/src/client/index.ts
  - packages/client/ui-renderer/src/client/app.tsx
  - packages/client/ui-renderer/src/client/registry.ts
  - packages/client/ui-sidebar/src/client/index.ts
  - packages/client/ui-conversation/src/client/apply.ts
  - packages/client/ui-sidebar-right/src/client/index.ts
  - packages/client/ui-dockkit/src/index.ts
  - packages/client/web/src/boot.ts
  - packages/bundle/web-app/src/startup.ts
symbols:
  - LayoutController
  - ctx.layout
  - AppFrame
  - ILayout
  - ThemePresenter
  - DocumentTitle
related:
  - spine.overview
  - spine.trace-web-first-prompt
  - subsys.client.ui-slots
  - subsys.client.ui-conversation
  - subsys.client.runtime
  - subsys.client.web
  - surface.web.workbench
  - surface.profiles.web
  - subsys.composition.bundle-web-app
evidence: explicit
status: verified
updated: c291e7961a
---

> `@deepseek-ai/dsh-client-ui-layout` 是 Web 工作台的 **三栏壳装配点**：host `apply` 为空；浏览器半边一次 `ctx.slots.register` 把 `AppFrame` 坐进内建 `'root'`，同时声明 `sidebar` / `main` / `rightbar` / `shell.overlay` 四个子槽并坐下 layout store。`ctx.layout` 管主面板选择、sidebar 开合、以及 rightbar 的 track / fullscreen 报告，不持有会话导航。

## 能回答的问题

- `id: ui-layout` 出现在哪一层 composition？`dsh-base` / `dsh-headless` / `sdk` / `sdk-minimal` / `acp` 有没有这行？
- host `apply` 为什么是空函数？client `inject` 吃哪些服务名？
- 一次 `register` 占了哪个槽、声明了哪四个子槽？谁再占用 `sidebar` / `main` / `rightbar`？
- `ctx.layout` 的合同是什么？和 `ctx.sessions` 的导航态差在哪？
- 在 `'root'` 上再 `register` 会怎样？加法面为什么必须是 `shell.overlay`？
- `CENTER_MIN` / `SIDEBAR_*` / `RIGHTBAR_*` / `SIDEBAR_AUTO_COLLAPSE` 各钉什么？让步链改不改 store 偏好？
- 右栏 / dockkit 是不是本包装出来的？还是折叠进本页的邻包？

## 职责边界

DSH 是 **Cordis 组合运行时**（`profile → bundle → agent preset`）。Shipped CLI profile 五个：`web`（`patchReload: live`，bundles `dsh-base` + `dsh-web-app`）、`headless` / `sdk` / `sdk-minimal` / `acp`。`desktop` 不是第六个 CLI profile。本仓没有 shipped TUI。只有 web bundle insert `id: ui-layout`。launcher 在 `provide('webStartup')` 之前拒绝 `--host 0.0.0.0`。[E: packages/bundle/web-app/src/startup.ts:74] client 是浏览器半边：**不**执行模型 turn。

本包拥有：

- host 半边空 `apply`（Loader 能扫进 `window.__DSH_BOOT__`，进程侧零行为）。
- 浏览器半边 `LayoutController`（`ctx.layout`：`selectPanel` / `beginNavigation` / `toggleSidebar` / `openRightbar` / `closeRightbar`）。
- `AppFrame` 占 `'root'`，以及同一声声明的四个子槽 + `createLayoutStore` 面板几何。
- `ThemePresenter`：把 `ctx.theme` 快照投影到 `document`（不经 React）。
- `DocumentTitle`：把当前会话 durable title 投影到 `document.title`。

本包**不**拥有：

- 槽纯核（`SlotCore` / `SlotKind` / 卸载 cascade）— [`subsys.client.ui-slots`](ui-slots.md)。
- `ctx.slots` Service、内建 `'root'` 声明、`renderSlot('root')` 门 — [`subsys.client.runtime`](runtime.md) 现指向 `packages/client/ui-renderer` 的 `SlotRegistry`。
- composer / `session.prompt` / slash 命令 — [`subsys.client.ui-conversation`](ui-conversation.md)。
- 右栏 tab 树、dock 引擎 — 见本页折叠节；**不要**另开 `ui-dockkit` / `ui-sidebar-right` 节点。
- HTTP API、模型 turn、session log、preset mount。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/client/ui-layout/src/index.ts` | host `apply`：空函数 |
| `packages/client/ui-layout/src/client/index.ts` | client `inject` / `apply`：provide `layout` + 一次 `register` + `ThemePresenter` |
| `packages/client/ui-layout/src/client/service.ts` | `ILayout` / `LayoutController` |
| `packages/client/ui-layout/src/client/AppFrame.tsx` | 三栏 grid、拖动手柄、窄屏折叠、`renderSlot` 子槽 |
| `packages/client/ui-layout/src/client/columns.ts` | 列宽常量与 `computeColumns` 让步链 |
| `packages/client/ui-layout/src/client/stores.ts` | `createLayoutStore`：sidebar / rightbar 偏好 + 主面板选择 |
| `packages/client/ui-layout/src/client/theme-presenter.ts` | `ThemePresenter`：`color-scheme` / token / 字号 / `theme-color` |
| `packages/client/ui-layout/src/client/DocumentTitle.tsx` | `document.title` 投影 |
| `packages/bundle/web-app/cordis.patch.yml` | `id: ui-layout` 无条件 insert |
| `packages/client/ui-renderer/src/client/registry.ts` | `SlotRegistry`；`ctx.slots.renderSlot` 只许 `'root'` |
| `packages/client/ui-sidebar/src/client/index.ts` | 占用 `sidebar`，`toggleSidebar` / `selectPanel` 调 `ctx.layout` |
| `packages/client/ui-conversation/src/client/apply.ts` | 占用 `main` 的 key `'conversation'` |
| `packages/client/ui-sidebar-right/src/client/index.ts` | 占用 `rightbar`，经 `openRightbar` / `closeRightbar` 报告几何 |
| `packages/client/ui-dockkit/src/index.ts` | 纯 TS dock 树 + React；零 Cordis |

## 数据模型

| 符号 | 要点 |
|---|---|
| `ILayout` / `ctx.layout` | `selectPanel` / `beginNavigation` / `toggleSidebar` / `openRightbar(track, fullscreen)` / `closeRightbar`。[E: packages/client/ui-layout/src/client/service.ts:28] [E: packages/client/ui-layout/src/client/service.ts:49] |
| `PanelActions` | layout store 的 bound actions（含 `setSidebar` / `setRightbar` / `selectPanel`）。 |
| `LayoutState` | `panelInfo.activePanelId` + `layoutInfo`（sidebar 宽、viewport、narrowExpanded、rightbar 偏好 / shown / track / fullscreen）。[E: packages/client/ui-layout/src/client/stores.ts:16] |
| `Columns` | `computeColumns` 的渲染宽：`sidebar` / `center` / `rightbar`。 |
| `MainPanelId` | 全局中栏面板 id；`null` 显示 Conversation。 |

列宽常量（合同冻结，不是视觉文案）：

| 常量 | 值 | 用途 |
|---|---|---|
| `CENTER_MIN` | 400 | 中栏地板；只有 rightbar 丢掉 track 后中栏才可再往下 [E: packages/client/ui-layout/src/client/columns.ts:11] |
| `SIDEBAR_MIN` / `SIDEBAR_MAX` | 264 / 420 | sidebar 拖拽夹取 |
| `SIDEBAR_DEFAULT` | 280 | 未拖过 / 重新打开 |
| `SIDEBAR_COLLAPSED` | 56 | 关闭后仍渲染的 compact rail |
| `SIDEBAR_AUTO_COLLAPSE` | 1024 | viewport 低于此则自动折成 rail |
| `RIGHTBAR_MIN` | 300 | 右栏拖拽地板 [E: packages/client/ui-layout/src/client/columns.ts:25] |
| `RIGHTBAR_MAX_RATIO` | 0.7 | 右栏不超过帧宽的 70% |
| `RIGHTBAR_DEFAULT_RATIO` | 0.45 | 首次打开右栏的默认比例 |

**没有** `DETAILS_*` / `openDetails` / `closeDetails`。旧三列 `sidebar` / `conversation` / `details` 已拆成 `sidebar` + keyed `main` + `rightbar`。

装配表（本页只点名占用者）：

| 槽 | kind / scope | 谁占用 |
|---|---|---|
| `'root'` | `single` / `root`（内建） | 本包 `AppFrame` [E: packages/client/ui-layout/src/client/index.ts:149] |
| `'sidebar'` | `single` / `root` | `ui-sidebar` 的 `SidebarRoot` [E: packages/client/ui-sidebar/src/client/index.ts:71] |
| `'main'` | `keyed` / `root` | `ui-conversation` 登记 key `'conversation'` [E: packages/client/ui-conversation/src/client/apply.ts:411] [E: packages/client/ui-conversation/src/client/apply.ts:414] |
| `'rightbar'` | `single` / `root` | `ui-sidebar-right` [E: packages/client/ui-sidebar-right/src/client/index.ts:76] |
| `'shell.overlay'` | `list` / `root` | **无人独占**。新 `id` 并列加入。层 `pointer-events: none`，直接子节点被 CSS 打开指针。[E: packages/client/ui-layout/src/client/AppFrame.module.css:90] [E: packages/client/ui-layout/src/client/AppFrame.module.css:98] |

## 控制流

1. **web overlay 无条件 insert 本行。** `PROFILE_TEMPLATES.web` 是 `['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app']`，`patchReload: 'live'`。[E: packages/boot/app-boot/src/profile.ts:110] [E: packages/boot/app-boot/src/profile.ts:112] 另四个 shipped 模板是 `acp` / `headless` / `sdk` / `sdk-minimal`（后者 **不** 叠 `dsh-base`）。[E: packages/boot/app-boot/src/profile.ts:105] web-app patch `insert` 写出 `id: ui-layout` / `name: '@deepseek-ai/dsh-client-ui-layout'`，没有额外 `config`。[E: packages/bundle/web-app/cordis.patch.yml:207] `dsh-base` / `dsh-headless` 没有 `id: ui-layout`。[E: packages/bundle/headless/cordis.patch.yml:20]

2. **host `apply` 是空函数。** `apply@packages/client/ui-layout/src/index.ts` 签名无 `ctx`、体为空。[E: packages/client/ui-layout/src/index.ts:4] `package.json` 的 `dsh.client` 声明 `inject` 为 locale / ui-renderer / ui-session / ui-theme、`platform: web`。[E: packages/client/ui-layout/package.json:31] [E: packages/client/ui-layout/package.json:36]

3. **client `inject` 是服务名 `slots` + `theme` + `locale`。** 与 package 级 `dsh.client.inject`（包名）不是同一张表。[E: packages/client/ui-layout/src/client/index.ts:123]

4. **一次 `register` 占 `'root'` 并声明四个子槽。** `apply` 先 `createLayoutStore` + `LayoutController`，再 `ctx.reflect.provide('layout', layout)`，然后 `ctx.slots.register({ name: 'root', children: { sidebar, main, rightbar, shell.overlay }, store }, AppFrame)`。[E: packages/client/ui-layout/src/client/index.ts:131] [E: packages/client/ui-layout/src/client/index.ts:147] [E: packages/client/ui-layout/src/client/index.ts:152] 子槽规格：`sidebar` = `single`/`root`；`main` = `keyed`/`root`；`rightbar` = `single`/`root`；`shell.overlay` = `list`/`root`。[E: packages/client/ui-layout/src/client/index.ts:152]

5. **`LayoutController` 构造时就带 store actions。** 不再有 `attachPanels` / `panel actions not wired`。`selectPanel` 若 id 未在 `main` 槽登记则抛 `layout.selectPanel: main panel "…" is not registered`。[E: packages/client/ui-layout/src/client/service.ts:68] [E: packages/client/ui-layout/src/client/service.ts:70] `beginNavigation` 取消上一笔未完成导航。[E: packages/client/ui-layout/src/client/service.ts:77]

6. **壳只画 `'root'`。** `uiRenderer.mount` 调用 `buildRenderApp`，后者 `ctx.slots.renderSlot('root', {})`。[E: packages/client/ui-renderer/src/client/app.tsx:21] `SlotRegistry.renderSlot` 只接受 `'root'`。[E: packages/client/ui-renderer/src/client/registry.ts:349]

7. **`AppFrame` 解列宽并 `renderSlot` 子槽。** grid 是 `${sidebar}px minmax(0, 1fr) ${rightbar}px`。[E: packages/client/ui-layout/src/client/AppFrame.tsx:207] `renderSlot('sidebar', { collapsed, width })`、keyed `main`、`renderSlot('rightbar', { width, viewportWidth, canShow })`、`renderSlot('shell.overlay', {})`。[E: packages/client/ui-layout/src/client/AppFrame.tsx:193] [E: packages/client/ui-layout/src/client/AppFrame.tsx:227]

8. **让步链是纯函数。** `computeColumns`：sidebar 关 = `SIDEBAR_COLLAPSED`，开 = clamp 到 `[SIDEBAR_MIN, SIDEBAR_MAX]`；右栏放不下 `RIGHTBAR_MIN` 则 track 为 0；中栏在丢掉右栏 track 之前不低于 `CENTER_MIN`。[E: packages/client/ui-layout/src/client/columns.ts:50]

9. **占用者经 `ctx.layout` 发面板动作，导航仍在 sessions。** `ui-sidebar` `toggleSidebar` / `selectPanel` 调 `ctx.layout`。[E: packages/client/ui-sidebar/src/client/index.ts:67] `ui-sidebar-right` 用 `openRightbar` / `closeRightbar` 报告几何，不自己写 store 宽。[E: packages/client/ui-sidebar-right/src/client/index.ts:140]

10. **在 `'root'` 上再 register：同 priority 抛错；更低 priority 阴影整框。** `SlotCore.register` 对 `single` 在相同 `priority` 找到占用者就抛 `already has a registration`。[E: packages/client/ui-slots/src/index.ts:841] 加法面是 `shell.overlay`（list）。overlay 层 `pointer-events: none`，直接子节点 `pointer-events: auto`。[E: packages/client/ui-layout/src/client/AppFrame.module.css:90]

11. **第二颗 effect：`ThemePresenter` 投影 `ctx.theme`。** 独立于 `AppFrame`：先 `presenter.apply(ctx.theme.getTheme())`，再 `ctx.on('theme/change', …)`。[E: packages/client/ui-layout/src/client/index.ts:173] `apply` 写 `document.documentElement.style.colorScheme`、按 scheme 增删 dark attribute、写字号与 token、填 `theme-color`。[E: packages/client/ui-layout/src/client/theme-presenter.ts:43]

## 右栏与 dockkit（折叠，不另开节点）

**`@deepseek-ai/dsh-client-ui-dockkit`** 是纯 TypeScript dock 树 + React 组件：`applyOp` / `Sequencer` / `DockController` 无 React、无 DOM、无 Cordis；组件只渲染快照并上报已结算手势。本包装配**不**依赖它。[E: packages/client/ui-dockkit/src/index.ts:21]

**`@deepseek-ai/dsh-client-ui-sidebar-right`** 占 `rightbar`。client `inject = ['slots', 'layout', 'locale', 'resources']`，`apply` 提供 `sidebarRight` / `sidebarRightTabs`，并把 shown/track/fullscreen 报告给 `ctx.layout.openRightbar` / `closeRightbar`。[E: packages/client/ui-sidebar-right/src/client/index.ts:76] [E: packages/client/ui-sidebar-right/src/client/index.ts:94] [E: packages/client/ui-sidebar-right/src/client/index.ts:140] shipped tab 类型：`ui-sidebar-documentpreview`、`ui-sidebar-files`。web-app yml 连续插入这三行。[E: packages/bundle/web-app/cordis.patch.yml:224] [E: packages/bundle/web-app/cordis.patch.yml:230] [E: packages/bundle/web-app/cordis.patch.yml:234]

本页不写 dock 树算法、tab 持久化或 preview renderer。工作台可见面见 [`surface.web.workbench`](../../surface/web/workbench.md)。

## 设计动机

- **装配点而不是第二套壳。** 壳库只 `renderSlot('root')`。换掉三栏或加浮动层，走槽登记，不必 fork `AppWebEntry`。
- **几何与导航切开。** 面板宽是 root-scope 瞬时 store；当前会话 / workspace 在 session-controller 客户端 + ui-session。`ctx.layout` 没有 `openSession`。
- **中栏改 keyed。** Conversation 是 `main` 上的一个 key，全局面板可以另占 key，而不再挤进已删除的 `details` 列。
- **右栏几何由占用者报告。** layout 只知道 track / fullscreen / 偏好宽；tab 开合属于 `ui-sidebar-right`。
- **让步不改偏好。** 缩窗派生 rightbar track `0`，拉窗按原偏好恢复。sidebar 永不让步。
- **主题不进 React。** 首屏 token 与 UA chrome 必须在插件 fiber 上写 DOM。

## Gotcha

- 同 priority 再往 `'root'` `register` **抛错**，不是静默并列。加法请走 `shell.overlay`。[E: packages/client/ui-slots/src/index.ts:841]
- 不要再写 `ILayout.openDetails` / `DETAILS_*` / `CENTER_MIN = 640` / `ui-chat` 占 `details`。那些符号已删除。
- `package.json` `description` 仍写「three-column AppFrame」与「navigation + panels」；对外 `ILayout` 已是主面板选择 + sidebar + rightbar，导航在 `ctx.sessions`。[E: packages/client/ui-layout/package.json:3]
- 面板几何 **不** 进 `localStorage`。刷新回到 sidebar 默认、rightbar 由占用者再报告。
- client **不**执行模型 turn。本包连 `session.prompt` 都不碰。

## Seam 三角

| 缝 | Definition | Provider | Consumer | base | web-app | headless / sdk / acp |
|---|---|---|---|---|---|---|
| 组合行 `id: ui-layout` | npm `@deepseek-ai/dsh-client-ui-layout`；`dsh.client.platform: web` | `dsh-web-app` `insert` 该 id | modules 扫进 `__DSH_BOOT__`；浏览器 Loader `create` 该行 | **无**此行 | **有**（无条件） | **无**此行 |
| `ctx.slots` + 内建 `'root'` | `SlotCore` 种子 `{ kind: 'single', scope: 'root' }` | ui-renderer `SlotRegistry` | 本包 `register({ name: 'root', … }, AppFrame)`；`buildRenderApp` `renderSlot('root')` | 无 client 行 | 有 `id: ui-renderer` 再有本行 | 无浏览器半边 |
| 四子槽声明 | `sidebar` / `main` / `rightbar` / `shell.overlay` | 本包这一次 `children:` 表 | `ui-sidebar` → `sidebar`；`ui-conversation` → `main`/`conversation`；`ui-sidebar-right` → `rightbar`；任意插件 → `shell.overlay` | 无 | web-app 同时 insert 那几个 `ui-*` | 无 |
| `ctx.layout` | `ILayout`（select / navigate / sidebar / rightbar） | 本包 `ctx.reflect.provide('layout', LayoutController)` | `ui-sidebar` 的 toggle / select；`ui-sidebar-right` 的几何报告 | 无 | 有（client 面） | 无 |
| `ctx.theme` → DOM | ui-theme 的 `ThemeSnapshot` / `theme/change` | ui-theme `ThemeRuntime` | 本包 `ThemePresenter`（第二颗 effect） | 无 | 有 `id: ui-theme` 且本行 fiber inject `theme` | 无 |

换掉 Provider 会带走 Consumer：去掉 web-app 的 `ui-layout` 行，壳 `renderSlot('root')` 因无登记 fail-loud；在 `'root'` 上用更低 priority 再 register，会带走整棵座位树。

## Sources

- packages/client/ui-layout/src/index.ts
- packages/client/ui-layout/src/client/index.ts
- packages/client/ui-layout/src/client/service.ts
- packages/client/ui-layout/src/client/AppFrame.tsx
- packages/client/ui-layout/src/client/columns.ts
- packages/client/ui-layout/src/client/stores.ts
- packages/client/ui-layout/src/client/theme-presenter.ts
- packages/client/ui-layout/src/client/DocumentTitle.tsx
- packages/client/ui-layout/src/client/AppFrame.module.css
- packages/client/ui-layout/package.json
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/base/cordis.patch.yml
- packages/bundle/headless/cordis.patch.yml
- packages/boot/app-boot/src/profile.ts
- packages/client/ui-slots/src/index.ts
- packages/client/ui-renderer/src/client/index.ts
- packages/client/ui-renderer/src/client/app.tsx
- packages/client/ui-renderer/src/client/registry.ts
- packages/client/ui-sidebar/src/client/index.ts
- packages/client/ui-conversation/src/client/apply.ts
- packages/client/ui-sidebar-right/src/client/index.ts
- packages/client/ui-dockkit/src/index.ts
- packages/client/web/src/boot.ts
- packages/bundle/web-app/src/startup.ts

## 相关

- [`spine.overview`](../../spine/overview.md) — 组合运行时全仓地图；host / preset / client 三面。
- [`spine.trace-web-first-prompt`](../../spine/trace-web-first-prompt.md) — `dsh web` / `dsh --profile web` 到第一轮提问；本页只覆盖壳坐下三栏之后的装配，不走 `session.prompt`。
- [`subsys.client.ui-slots`](ui-slots.md) — `SlotCore` 纯核：kind / scope / 同 priority 冲突 / 卸载 cascade。
- [`subsys.client.ui-conversation`](ui-conversation.md) — 占 `main` 的 `'conversation'`；composer 提交链。
- [`subsys.client.runtime`](runtime.md) — store + session-controller 客户端 + ui-renderer；导航态在这里。
- [`subsys.client.web`](web.md) — `AppWebEntry` / 唯一的 `uiRenderer.mount`。
- [`surface.web.workbench`](../../surface/web/workbench.md) — 工作台可见面（槽位与 chrome）；本页是装配控制流。
- [`surface.profiles.web`](../../surface/profiles/web.md) — web profile 产品面与 host insert id 全表。
- [`subsys.composition.bundle-web-app`](../composition/bundle-web-app.md) — 写出 `id: ui-layout` 的那一层 bundle。
