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
  - packages/client/ui-layout/src/client/AppFrame.module.css
  - packages/client/ui-layout/package.json
  - packages/client/ui-layout/tests/apply.client.spec.ts
  - packages/client/ui-layout/tests/service.client.spec.ts
  - packages/client/ui-layout/tests/columns.client.spec.ts
  - packages/client/ui-layout/tests/layout-store.client.spec.ts
  - packages/client/ui-layout/tests/app-frame.client.spec.tsx
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/headless/cordis.patch.yml
  - packages/boot/app-boot/src/profile.ts
  - packages/client/runtime/src/client/index.ts
  - packages/client/runtime/src/client/slots.ts
  - packages/client/ui-slots/src/index.ts
  - packages/client/ui-sidebar/src/client/index.ts
  - packages/client/ui-conversation/src/client/apply.ts
  - packages/client/web/src/app.tsx
  - packages/client/web-react/src/scoped-slots.tsx
symbols:
  - LayoutController
  - ctx.layout
  - AppFrame
  - ILayout
  - ThemePresenter
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
updated: 47f943859b
---

> `@deepseek-ai/dsh-client-ui-layout` 是 Web 工作台的 **三栏壳装配点**：host `apply` 为空；浏览器半边一次 `ctx.slots.register` 把 `AppFrame` 坐进 runtime 内建 `'root'`，同时声明 `sidebar` / `conversation` / `details` / `shell.overlay` 四个子槽并坐下 layout store。`ctx.layout` 只做面板开合，不持有会话导航。

## 能回答的问题

- `id: ui-layout` 出现在哪一层 composition？`dsh-base` / `dsh-headless` 有没有这行？
- host `apply` 为什么是空函数？client `inject` 吃哪些服务名？
- 一次 `register` 占了哪个槽、声明了哪四个子槽？谁再占用 `sidebar` / `conversation` / `details`？
- `ctx.layout` 的合同是什么？和 runtime `sessions` 的导航态差在哪？
- 在 `'root'` 上再 `register` 会怎样？加法面为什么必须是 `shell.overlay`？
- `CENTER_MIN` / `SIDEBAR_*` / `DETAILS_*` / `SIDEBAR_AUTO_COLLAPSE` 各钉什么？让步链改不改 store 偏好？
- 第二颗 `ctx.effect` 的 `ThemePresenter` 写哪些 DOM？跟 React 树有没有关系？

## 职责边界

DSH 是 **Cordis 组合运行时**（`profile → bundle → agent preset`）。capability seam 是 Definition / Provider / Consumer；**model-visible ⟺ logged**。Web 是默认安装路径（`PROFILE_TEMPLATES.web` = `dsh-base` 再叠 `dsh-web-app`）；本仓没有 shipped TUI。launcher 在 `provide('webStartup')` 之前拒绝 `--host 0.0.0.0`，因此默认 composition 不会 bind all-interfaces。client 是浏览器半边：**不**执行模型 turn，**不**实现 `ctx.fs` / agent-loop。

本包拥有：

- host 半边空 `apply`（Loader 能扫进 `window.__DSH_BOOT__`，进程侧零行为）。
- 浏览器半边 `LayoutController`（`ctx.layout`：`toggleSidebar` / `openDetails` / `closeDetails`）。
- `AppFrame` 占 `'root'`，以及同一声声明的四个子槽 + `createLayoutStore` 面板几何。
- `ThemePresenter`：把 `ctx.theme` 快照投影到 `document`（不经 React）。

本包**不**拥有：

- 槽纯核（`SlotCore` / `SlotKind` / 卸载 cascade）— [`subsys.client.ui-slots`](ui-slots.md)。
- `ctx.slots` Service、内建 `'root'` 声明、`renderSlot('root')` 门 — [`subsys.client.runtime`](runtime.md) 的 `SlotRegistry`。
- 壳只画 `'root'`、prefetch / adopt 模块图 — [`subsys.client.web`](web.md)。
- composer / `session.prompt` / slash 命令 — [`subsys.client.ui-conversation`](ui-conversation.md)。
- `SidebarRoot` 内部 `sidebar.workspaces` / `sidebar.settings` 座 — 点名 `ui-sidebar` 即可，本页不展开。
- HTTP `/api`、模型 turn、session log、preset mount。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/client/ui-layout/src/index.ts` | host `apply`：空函数 |
| `packages/client/ui-layout/src/client/index.ts` | client `inject` / `apply`：provide `layout` + 一次 `register` + `ThemePresenter` |
| `packages/client/ui-layout/src/client/service.ts` | `ILayout` / `LayoutController` / `attachPanels` |
| `packages/client/ui-layout/src/client/AppFrame.tsx` | 三栏 grid、拖动手柄、窄屏折叠、`renderSlot` 四个子槽 |
| `packages/client/ui-layout/src/client/columns.ts` | 列宽常量与 `computeColumns` 让步链 |
| `packages/client/ui-layout/src/client/stores.ts` | `createLayoutStore`：偏好宽（0 = 关）+ `narrow` / `narrowExpanded` |
| `packages/client/ui-layout/src/client/theme-presenter.ts` | `ThemePresenter`：`color-scheme` / `data-ds-dark-theme` / token / `theme-color` |
| `packages/bundle/web-app/cordis.patch.yml` | `id: ui-layout` 无条件 insert |
| `packages/bundle/base/cordis.patch.yml` | `dsh-base` insert：从 `timer` 到 `llm-deepseek`，无 `id: ui-layout` |
| `packages/bundle/headless/cordis.patch.yml` | `dsh-headless` insert：只有 `code-runtime` / `headless-startup` / `headless-runner` |
| `packages/client/runtime/src/client/slots.ts` | 内建 `'root'`；`ctx.slots.renderSlot` 只许 `'root'` |
| `packages/client/ui-slots/src/index.ts` | `SlotCore` 种子 `'root'`；同 priority 二次登记抛错；更低 priority 阴影赢家 |
| `packages/client/web/src/app.tsx` | 壳唯一的 `renderSlot('root', {})` |
| `packages/client/ui-sidebar/src/client/index.ts` | 占用 `sidebar`，`toggleSidebar` 调 `ctx.layout` |
| `packages/client/ui-conversation/src/client/apply.ts` | 占用 `conversation` + `details`，开合 details 调 `ctx.layout` |

## 数据模型

| 符号 | 要点 |
|---|---|
| `ILayout` / `ctx.layout` | 三个动作：`toggleSidebar` / `openDetails` / `closeDetails`。`attachPanels` 只在具体类上，测试 fake 不必实现它。 |
| `PanelActions` | layout store 的 bound actions（含 `setSidebar` / `setDetails` / `setNarrow`）。对外面不暴露拖拽写口。 |
| `LayoutState` | `{ sidebar, details, narrow, narrowExpanded }`。宽以 px 计，`0` = 关。 |
| `Columns` | `computeColumns` 的渲染宽；details `0` 表示视觉关闭但子树仍挂着。 |
| `SidebarOwnerProps` | `{ collapsed, width }`。`ConvOwnerProps` / `DetailsOwnerProps` 为空；`sessionId` 由 framework 注入。 |
| `ThemeSnapshot` | `ThemePresenter` 只读 `active.colorScheme` 与 `active.tokens`，不读 preference id（`system` 在 ui-theme 已解析）。 |

列宽常量（合同冻结，不是视觉文案）：

| 常量 | 值 | 用途 |
|---|---|---|
| `CENTER_MIN` | 640 | 中栏地板；只有最终 fallback 可再往下 |
| `SIDEBAR_MIN` / `SIDEBAR_MAX` | 264 / 420 | sidebar 拖拽夹取 |
| `SIDEBAR_DEFAULT` | 280 | 未拖过 / 重新打开 |
| `SIDEBAR_COLLAPSED` | 56 | 关闭后仍渲染的 compact rail |
| `SIDEBAR_AUTO_COLLAPSE` | 1024 | viewport 低于此则自动折成 rail |
| `DETAILS_MIN` / `DETAILS_MAX` | 300 / 520 | details 拖拽夹取 |
| `DETAILS_DEFAULT` | 360 | 首次打开 |

装配表（本页只点名占用者，不把每个 skeleton 写成子系统）：

| 槽 | kind / scope | 谁占用 |
|---|---|---|
| `'root'` | `single` / `root`（`SlotCore` 构造时种子，`declaredBy: '(built-in)'`） | 本包 `AppFrame` |
| `'sidebar'` | `single` / `root` | `ui-sidebar` 的 `SidebarRoot`（内部再声明 `sidebar.workspaces` / `sidebar.settings` / `sidebar.footer.action`） |
| `'conversation'` | `single` / `session-maybe` | `ui-conversation` 的 `ConversationRoot`（内部再声明 composer / session body / hero 等子座） |
| `'details'` | `single` / `session` | `ui-conversation` 的 `DetailsPanel`（内部再声明 `conversation.details.tool`） |
| `'shell.overlay'` | `list` / `root` | **无人独占**。新 `id` 并列加入。层 `pointer-events: none`，直接子节点被 CSS 打开指针。 |

## 控制流

1. **web overlay 无条件 insert 本行。** `PROFILE_TEMPLATES.web@packages/boot/app-boot/src/profile.ts` 是 `['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app']`。[E: packages/boot/app-boot/src/profile.ts:115] web-app patch 第一段 `insert` 写出 `id: ui-layout` / `name: '@deepseek-ai/dsh-client-ui-layout'`，没有额外 `config`。[E: packages/bundle/web-app/cordis.patch.yml:180] [E: packages/bundle/web-app/cordis.patch.yml:181] `dsh-base` 的 insert 从 `id: timer` 起到 `id: llm-deepseek` 止，没有 `id: ui-layout`。[E: packages/bundle/base/cordis.patch.yml:16] [E: packages/bundle/base/cordis.patch.yml:450] `dsh-headless` 的 insert 只有 `code-runtime` / `headless-startup` / `headless-runner` 三行，没有 `id: ui-layout`。[E: packages/bundle/headless/cordis.patch.yml:24] [E: packages/bundle/headless/cordis.patch.yml:27] [E: packages/bundle/headless/cordis.patch.yml:31]

2. **host `apply` 是空函数。** `apply@packages/client/ui-layout/src/index.ts` 签名无 `ctx`、体为空：node 半边只为 Loader 生命周期占位，行为全在 `./client`。[E: packages/client/ui-layout/src/index.ts:4] 测试把「调用不抛」钉成合同。[E: packages/client/ui-layout/tests/apply.client.spec.ts:110] `package.json` 的 `dsh.client` 声明 `inject: [@deepseek-ai/dsh-client-runtime, @deepseek-ai/dsh-client-ui-theme]`、`platform: web`，供 modules 扫进 `__DSH_BOOT__`。[E: packages/client/ui-layout/package.json:35] [E: packages/client/ui-layout/package.json:38]

3. **client `inject` 是服务名 `slots` + `theme`。** 与 package 级 `dsh.client.inject`（包名）不是同一张表。[E: packages/client/ui-layout/src/client/index.ts:108] [E: packages/client/ui-layout/tests/apply.client.spec.ts:40] runtime 浏览器 `apply` 先 `ctx.plugin(SlotRegistry)`，于是 `ctx.slots` 在本插件之前就位。[E: packages/client/runtime/src/client/index.ts:189] `SlotCore` 构造时种子 `'root'` 为 `{ kind: 'single', scope: 'root' }`，`declaredBy = '(built-in)'`。[E: packages/client/ui-slots/src/index.ts:700] [E: packages/client/ui-slots/src/index.ts:701] [E: packages/client/ui-slots/src/index.ts:702]

4. **一次 `register` 占 `'root'` 并声明四个子槽。** `apply@packages/client/ui-layout/src/client/index.ts` 先 `new LayoutController()`，再一颗 `ctx.effect`：`ctx.reflect.provide('layout', layout)`，然后 `ctx.slots.register({ name: 'root', children: { sidebar, conversation, details, shell.overlay }, store: createLayoutStore, inject }, AppFrame)`。[E: packages/client/ui-layout/src/client/index.ts:117] [E: packages/client/ui-layout/src/client/index.ts:119] [E: packages/client/ui-layout/src/client/index.ts:121] [E: packages/client/ui-layout/src/client/index.ts:123] [E: packages/client/ui-layout/src/client/index.ts:124] [E: packages/client/ui-layout/src/client/index.ts:125] [E: packages/client/ui-layout/src/client/index.ts:126] [E: packages/client/ui-layout/src/client/index.ts:130] [E: packages/client/ui-layout/src/client/index.ts:137] 子槽规格：`sidebar` = `single`/`root`；`conversation` = `single`/`session-maybe`；`details` = `single`/`session`；`shell.overlay` = `list`/`root`。`store` 传的是 **factory**（`createLayoutStore`），framework 按 entry 实例化，避免模块缓存钉死单例。

5. **`inject` hook 把 bound actions 接到 `ctx.layout`。** register 的 `inject: (actions: PanelActions) => { layout.attachPanels(actions); return {} }` 不向 `AppFrame` 注入业务面。[E: packages/client/ui-layout/src/client/index.ts:133] [E: packages/client/ui-layout/src/client/index.ts:134] web-react `cachedRootInject` 在 `'root'` entry 首次渲染时 `runInject(entry, undefined, actions)`，之后 WeakMap 缓存。[E: packages/client/web-react/src/scoped-slots.tsx:176] [E: packages/client/web-react/src/scoped-slots.tsx:179] `LayoutController.#require` 在未 `attachPanels` 时抛 `layout: panel actions not wired (root entry not mounted)`——手势不可能早于首帧，撞到就是 boot-order bug。[E: packages/client/ui-layout/src/client/service.ts:66] [E: packages/client/ui-layout/tests/service.client.spec.ts:41] 重新 `attachPanels` 覆盖旧 action 集（HMR / 再 register）。[E: packages/client/ui-layout/src/client/service.ts:43]

6. **壳只画 `'root'`。** `buildRenderApp@packages/client/web/src/app.tsx` 在 `AppRoot` settled 之后调用 `ctx.slots.renderSlot('root', {})`——整棵工作台从这一次 ctx 级 render 挂下来。[E: packages/client/web/src/app.tsx:41] `SlotRegistry.renderSlot` 只接受 `'root'`；无 renderer 或 `'root'` 尚无登记则 fail-loud。[E: packages/client/runtime/src/client/slots.ts:252] [E: packages/client/runtime/src/client/slots.ts:255] [E: packages/client/runtime/src/client/slots.ts:259]

7. **`AppFrame` 解列宽并 `renderSlot` 四个子槽。** `detailsSession` 只在 `current` 存在且 `blank === false` 时取 id，否则当无会话。[E: packages/client/ui-layout/src/client/AppFrame.tsx:94] [E: packages/client/ui-layout/src/client/AppFrame.tsx:96] `useLayoutEffect`：已有非空 id 再换成另一个非空 id 时 `actions.closeDetails()`；首次出现会话不关（本来就是关的）。[E: packages/client/ui-layout/src/client/AppFrame.tsx:105] `narrow = viewport < SIDEBAR_AUTO_COLLAPSE`，并 `actions.setNarrow(narrow)`。[E: packages/client/ui-layout/src/client/AppFrame.tsx:136] [E: packages/client/ui-layout/src/client/AppFrame.tsx:137] 窄屏折叠把传给求解器的 sidebar 偏好写成 `0`（rail）；窄屏手动展开则传真实偏好，偏好若已是 `0` 则用 `SIDEBAR_DEFAULT`。[E: packages/client/ui-layout/src/client/AppFrame.tsx:138] [E: packages/client/ui-layout/src/client/AppFrame.tsx:141] 无非空会话时 details 偏好不参与求解（传入 `0`）。[E: packages/client/ui-layout/src/client/AppFrame.tsx:142] grid 是 `${sidebar}px minmax(0, 1fr) ${details}px`。[E: packages/client/ui-layout/src/client/AppFrame.tsx:168] `renderSlot('sidebar', { collapsed, width })`、`renderSlot('conversation', {})`、`renderSlot('details', {})`、`renderSlot('shell.overlay', {})` 从第一帧就挂上，没有 baselines 门。[E: packages/client/ui-layout/src/client/AppFrame.tsx:179] [E: packages/client/ui-layout/src/client/AppFrame.tsx:190] [E: packages/client/ui-layout/src/client/AppFrame.tsx:191] [E: packages/client/ui-layout/src/client/AppFrame.tsx:194]

8. **让步链是纯函数，不改 store。** `computeColumns@packages/client/ui-layout/src/client/columns.ts`：sidebar 永不让步（关 = `SIDEBAR_COLLAPSED`，开 = clamp 到 `[SIDEBAR_MIN, SIDEBAR_MAX]`）；第一步三栏加 `CENTER_MIN` 能放下则原样；第二步只缩 details（不低于 `DETAILS_MIN`）；第三步派生 details `0`，中栏吃剩余（可低于 `CENTER_MIN`）。[E: packages/client/ui-layout/src/client/columns.ts:21] [E: packages/client/ui-layout/src/client/columns.ts:29] [E: packages/client/ui-layout/src/client/columns.ts:64] [E: packages/client/ui-layout/src/client/columns.ts:68] [E: packages/client/ui-layout/src/client/columns.ts:71] [E: packages/client/ui-layout/src/client/columns.ts:76] 再拉宽窗口用同一组偏好重算，details 自动回来。spec 钉 step-2：`1250` + 默认偏好 → `{ sidebar: 280, center: 640, details: 330 }`。[E: packages/client/ui-layout/tests/columns.client.spec.ts:40]

9. **store 写口：拖拽夹取、开合显式写 0 / 默认。** `init` = `{ sidebar: SIDEBAR_DEFAULT, details: 0, narrow: false, narrowExpanded: false }`。[E: packages/client/ui-layout/src/client/stores.ts:50] `setSidebar` / `setDetails` 只 `clampWidth`，从不跨过开关线。[E: packages/client/ui-layout/src/client/stores.ts:52] 宽屏 `toggleSidebar`：`0 ⟷ SIDEBAR_DEFAULT`（拖过的宽被忘掉）。[E: packages/client/ui-layout/src/client/stores.ts:58] 窄屏 `toggleSidebar` 只翻 `narrowExpanded`，宽偏好不动。[E: packages/client/ui-layout/src/client/stores.ts:57] `setNarrow` 在跨越断点时清掉 override。[E: packages/client/ui-layout/src/client/stores.ts:65] `openDetails` 仅在 `details === 0` 时写成 `DETAILS_DEFAULT`；`closeDetails` 写 `0`。[E: packages/client/ui-layout/src/client/stores.ts:67] [E: packages/client/ui-layout/src/client/stores.ts:68] 不读写 `localStorage`。[E: packages/client/ui-layout/tests/layout-store.client.spec.ts:93]

10. **占用者经 `ctx.layout` 发面板动作，导航仍在 runtime sessions。** `ui-sidebar` `register({ name: 'sidebar', … }, SidebarRoot)`，`inject` 里 `toggleSidebar: () => ctx.layout.toggleSidebar()`。[E: packages/client/ui-sidebar/src/client/index.ts:38] [E: packages/client/ui-sidebar/src/client/index.ts:42] `ui-conversation` `slots.register({ name: 'conversation', … }, ConversationRoot)`；chat view 的 `openDetails` 先写 conversation store 的 selection 再 `layout.openDetails()`；`DetailsPanel` 的 `closeDetails` 调 `layout.closeDetails()`。[E: packages/client/ui-conversation/src/client/apply.ts:197] [E: packages/client/ui-conversation/src/client/apply.ts:392] [E: packages/client/ui-conversation/src/client/apply.ts:445] [E: packages/client/ui-conversation/src/client/apply.ts:452] `ILayout` 只有这三个方法。[E: packages/client/ui-layout/src/client/service.ts:25] [E: packages/client/ui-layout/src/client/service.ts:27] [E: packages/client/ui-layout/src/client/service.ts:29] `sessions.open` / `workspaces.connectWorkspace` 不在本包。

11. **在 `'root'` 上再 register：同 priority 抛错；更低 priority 阴影整框。** `SlotCore.register` 对 `single` 在相同 `priority`（缺省 `0`）找到占用者就抛 `already has a registration`。[E: packages/client/ui-slots/src/index.ts:801] [E: packages/client/ui-slots/src/index.ts:802] 不同 priority 共存，ledger 按 priority 升序；`entriesOfSlot` 取每个 cell 第一个仍 live 的条目（最低 priority 赢）。[E: packages/client/ui-slots/src/index.ts:868] [E: packages/client/ui-slots/src/index.ts:947] 赢家若不是 `AppFrame`，四个子槽不再被渲染（声明还在输家 entry 上，画面上整棵座位树消失）。加法面是 `shell.overlay`（list，新 `id` 并列）。overlay 层 `pointer-events: none`，直接子节点 `pointer-events: auto`。[E: packages/client/ui-layout/src/client/AppFrame.module.css:114] [E: packages/client/ui-layout/src/client/AppFrame.module.css:118]

12. **第二颗 effect：`ThemePresenter` 投影 `ctx.theme`。** 独立于 `AppFrame`：先 `presenter.apply(ctx.theme.getTheme())`，再 `ctx.on('theme/change', …)`。[E: packages/client/ui-layout/src/client/index.ts:149] [E: packages/client/ui-layout/src/client/index.ts:150] `apply` 写 `document.documentElement.style.colorScheme`、按 scheme 增删 `body[data-ds-dark-theme]`、清掉上次 token 再写 `active.tokens`、把计算后的 `body` 背景填进自有 `meta[name="theme-color"]`。[E: packages/client/ui-layout/src/client/theme-presenter.ts:39] [E: packages/client/ui-layout/src/client/theme-presenter.ts:41] [E: packages/client/ui-layout/src/client/theme-presenter.ts:46] [E: packages/client/ui-layout/src/client/theme-presenter.ts:49] `dispose` 只撤回自己写过的属性 / 变量 / meta 节点。fiber 卸掉后 listener 断开，后续 `setTheme` 不再碰 DOM。[E: packages/client/ui-layout/tests/apply.client.spec.ts:91]

13. **teardown 一条轴。** effect disposer：先 `disposeRegistration()`，再 `void disposeService()`（`provide` 的 disposer 异步 settle）。[E: packages/client/ui-layout/src/client/index.ts:139] [E: packages/client/ui-layout/src/client/index.ts:141] 卸掉后 `ctx.layout` 消失、`'root'` entries 为空、三个具名子槽 spec 消失；**内建** `'root'` spec 仍是 `{ kind: 'single', scope: 'root' }`。[E: packages/client/ui-layout/tests/apply.client.spec.ts:100] [E: packages/client/ui-layout/tests/apply.client.spec.ts:104]

## 设计动机

- **装配点而不是第二套壳。** 壳库只 `renderSlot('root')`。换掉三栏或加浮动层，走槽登记，不必 fork `AppWebEntry`。
- **几何与导航切开。** 面板宽是 root-scope 瞬时 store；当前会话 / workspace 在 runtime。`ctx.layout` 故意没有 `openSession`。
- **一次 `register` = 声明权。** 子槽声明等于独占渲染权：卸掉 `AppFrame` 四个座位一起塌。`single` 的 `'root'` 不能当加法面。
- **让步不改偏好。** 缩窗派生 details `0`，拉窗按原偏好恢复。sidebar 永不让步，避免导航轨被中栏挤没。
- **关面板忘掉拖宽。** `toggleSidebar` / `closeDetails` 写 `0` 或合同默认，避免「关之前拖到 419、再开还是 419」变成隐式持久化。
- **主题不进 React。** 首屏 token 与 UA chrome 必须在插件 fiber 上写 DOM；跟 `AppFrame` 是否已 mount 解耦。
- **host 空 `apply`。** `dsh.client` 双面：node 半边只为 modules 扫描存在；浏览器半边才是壳模块。

## Gotcha

- 同 priority 再往 `'root'` `register` **抛错**，不是静默并列。要阴影必须显式更低 `priority`；那样 `AppFrame` 不再渲染，四个子槽从画面消失。加法请走 `shell.overlay`。[E: packages/client/ui-slots/src/index.ts:802]
- `apply.client.spec.ts` 断言了 `sidebar` / `conversation` / `details` 三个 spec，**没有** `slots.spec('shell.overlay')`。ledger 里仍有第四个 list 声明。[E: packages/client/ui-layout/tests/apply.client.spec.ts:51] [E: packages/client/ui-layout/src/client/index.ts:126]
- `ctx.layout.*` 在 `AppFrame` 首帧 `inject` 之前调用会抛 `panel actions not wired`。不要在别的插件 `apply` 同步里抢先 toggle。[E: packages/client/ui-layout/src/client/service.ts:66]
- 面板几何 **不** 进 `localStorage`。刷新回到 sidebar 默认、details 关闭。[E: packages/client/ui-layout/tests/layout-store.client.spec.ts:93]
- 让步链派生的 details `0` 不是 store 里的 `0`。读 `useStore(s => s.details)` 当「现在开没开」会在窄窗误判。渲染真相是 `computeColumns` 的返回值。
- details 列宽 0 **不卸载** 子树（`DetailsColumn` 一直在）。session 作用域的 `details` 占用者在无 current 时由 framework 画空，不是本包 unmount。[E: packages/client/ui-layout/src/client/AppFrame.tsx:191]
- 切到另一个非空 Session 会 `closeDetails` 并忘掉拖宽；切到 `blank` 只把求解器输入写成 0，store 偏好可仍是打开的宽。[E: packages/client/ui-layout/src/client/AppFrame.tsx:105] [E: packages/client/ui-layout/src/client/AppFrame.tsx:142]
- 拖拽手柄：sidebar 关闭（含窄屏自动折叠）不画；details 渲染宽为 0 不画。拖拽基准是 **渲染宽**（让步夹过的值），不是 store 偏好。
- client **不**执行模型 turn。本包连 `session.prompt` 都不碰。
- `package.json` `description` 写「navigation + panels」；对外 `ILayout` 只有面板三动作。导航在 `ctx.sessions` / `ctx.workspaces`。

## Seam 三角

| 缝 | Definition | Provider | Consumer | base | web-app | headless |
|---|---|---|---|---|---|---|
| 组合行 `id: ui-layout` | npm `@deepseek-ai/dsh-client-ui-layout`；`dsh.client.platform: web` | `dsh-web-app` `insert` 该 id | modules 扫进 `__DSH_BOOT__`；浏览器 Loader `create` 该行 | **无**此行 | **有**（无条件） | **无**此行（insert 停在 `headless-runner`） |
| `ctx.slots` + 内建 `'root'` | `SlotCore` 种子 `{ kind: 'single', scope: 'root' }`；`SlotMap['root']` 由 runtime 声明合并 | runtime `SlotRegistry`（`ctx.plugin(SlotRegistry)`） | 本包 `register({ name: 'root', … }, AppFrame)`；壳 `renderSlot('root')` | 无 client runtime 行 | 有 `id: client-runtime` 再有本行 | 无浏览器半边 |
| 四子槽声明 | `SlotMap` 在本包 `declare module`：`sidebar` / `conversation` / `details` / `shell.overlay` | 本包这一次 `children:` 表（声明 = 独占渲染权） | `ui-sidebar` → `sidebar`；`ui-conversation` → `conversation` + `details`；任意插件 → `shell.overlay` list | 无 | web-app 同时 insert 那几个 `ui-*` | 无 |
| `ctx.layout` | `ILayout`（`toggleSidebar` / `openDetails` / `closeDetails`） | 本包 `ctx.reflect.provide('layout', LayoutController)`；首帧 `attachPanels` | `ui-sidebar` 的 toggle；`ui-conversation` 的 details 开合 | 无 | 有（client 面） | 无 |
| `ctx.theme` → DOM | ui-theme 的 `ThemeSnapshot` / `theme/change` | ui-theme `ThemeRuntime`（`getTheme` / `setTheme`） | 本包 `ThemePresenter`（第二颗 effect） | 无 | 有 `id: ui-theme` 且本行 `inject: [theme]` | 无 |

换掉 Provider 会带走 Consumer：去掉 web-app 的 `ui-layout` 行，壳 `renderSlot('root')` 因无登记 fail-loud；在 `'root'` 上用更低 priority 再 register，会带走整棵座位树（`sidebar` / `conversation` / `details` / overlay 不再被 `AppFrame` 画出来）。Definition（槽名、`ILayout` 三方法、让步常量）保持不变。

## Sources

- packages/client/ui-layout/src/index.ts
- packages/client/ui-layout/src/client/index.ts
- packages/client/ui-layout/src/client/service.ts
- packages/client/ui-layout/src/client/AppFrame.tsx
- packages/client/ui-layout/src/client/columns.ts
- packages/client/ui-layout/src/client/stores.ts
- packages/client/ui-layout/src/client/theme-presenter.ts
- packages/client/ui-layout/src/client/AppFrame.module.css
- packages/client/ui-layout/package.json
- packages/client/ui-layout/tests/apply.client.spec.ts
- packages/client/ui-layout/tests/service.client.spec.ts
- packages/client/ui-layout/tests/columns.client.spec.ts
- packages/client/ui-layout/tests/layout-store.client.spec.ts
- packages/client/ui-layout/tests/app-frame.client.spec.tsx
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/base/cordis.patch.yml
- packages/bundle/headless/cordis.patch.yml
- packages/boot/app-boot/src/profile.ts
- packages/client/runtime/src/client/index.ts
- packages/client/runtime/src/client/slots.ts
- packages/client/ui-slots/src/index.ts
- packages/client/ui-sidebar/src/client/index.ts
- packages/client/ui-conversation/src/client/apply.ts
- packages/client/web/src/app.tsx
- packages/client/web-react/src/scoped-slots.tsx

## 相关

- [`spine.overview`](../../spine/overview.md) — 组合运行时全仓地图；host / preset / client 三面。
- [`spine.trace-web-first-prompt`](../../spine/trace-web-first-prompt.md) — `dsh web` 到第一轮提问；本页只覆盖壳坐下三栏之后的装配，不走 `session.prompt`。
- [`subsys.client.ui-slots`](ui-slots.md) — `SlotCore` 纯核：kind / scope / 同 priority 冲突 / 卸载 cascade。
- [`subsys.client.ui-conversation`](ui-conversation.md) — 占 `conversation` + `details`；composer 提交链。
- [`subsys.client.runtime`](runtime.md) — `SlotRegistry` / `ctx.sessions` / `ctx.workspaces`；导航态在这里。
- [`subsys.client.web`](web.md) — `AppWebEntry` / `AppRoot` / 唯一的 `renderSlot('root')`。
- [`surface.web.workbench`](../../surface/web/workbench.md) — 工作台可见面（槽位与 chrome）；本页是装配控制流。
- [`surface.profiles.web`](../../surface/profiles/web.md) — web profile 产品面与 host insert id 全表。
- [`subsys.composition.bundle-web-app`](../composition/bundle-web-app.md) — 写出 `id: ui-layout` 的那一层 bundle。
