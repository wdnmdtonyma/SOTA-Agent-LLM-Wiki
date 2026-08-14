---
id: subsys.client.ui-slots
title: ui-slots
kind: subsystem
tier: T2
pkg: client
source:
  - packages/client/ui-slots/src/index.ts
  - packages/client/ui-slots/src/store.ts
  - packages/client/ui-slots/src/renderer.ts
  - packages/client/ui-slots/src/invariant.ts
  - packages/client/ui-slots/package.json
  - packages/client/ui-slots/tests/core.client.spec.ts
  - packages/client/ui-slots/tests/dynamic-keys.client.spec.ts
  - packages/client/ui-slots/tests/type-chain.client.spec.tsx
  - packages/client/runtime/src/index.ts
  - packages/client/runtime/src/client/index.ts
  - packages/client/runtime/src/client/slots.ts
  - packages/client/runtime/tests/slots-service.client.spec.ts
  - packages/client/ui-layout/src/client/index.ts
  - packages/client/ui-layout/src/client/AppFrame.tsx
  - packages/client/ui-conversation/src/client/apply.ts
  - packages/client/ui-sidebar/src/client/index.ts
  - packages/client/web/src/app-shell.ts
  - packages/client/web/src/app.tsx
  - packages/client/web-react/src/scoped-slots.tsx
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/headless/cordis.patch.yml
  - packages/extensions/cordis-client-runner/src/client/guard.ts
  - packages/extensions/cordis-client-runner/src/client/runtime.ts
  - packages/extensions/cordis-client-runner/tests/guard.client.spec.ts
symbols:
  - SlotMap
  - SlotCore
  - SlotKind
  - SlotScope
  - register
related:
  - spine.overview
  - subsys.client.runtime
  - subsys.client.ui-layout
  - subsys.client.ui-conversation
  - surface.web.workbench
  - spine.trace-web-first-prompt
  - surface.profiles.web
  - subsys.composition.bundle-web-app
evidence: explicit
status: verified
updated: 47f943859b
---

> `@deepseek-ai/dsh-client-ui-slots` 是浏览器座位图的**纯核库**：`SlotMap` 声明合并、`SlotKind` / `SlotScope`、一次 `register` 的占座 + 子槽声明 + store 座，以及 renderer / store 合同。它**不是** web-app Loader 行。`ctx.slots` 由 client-runtime 浏览器半边的 `SlotRegistry` 提供；各 `ui-*` 做一次 `ctx.slots.register(...)`。DSH 是 Cordis 组合运行时（profile → bundle → preset）；Web 是默认安装路径，本仓没有 shipped TUI。client 不执行模型 turn。

## 能回答的问题

- `ui-slots` 为什么不是 `cordis.patch.yml` 里的 `id: ui-slots`？`ctx.slots` 谁 `provide`？
- `SlotKind`（`single` / `list` / `keyed` / `chain`）与 `SlotScope`（`root` / `session-maybe` / `session`）各自管哪条轴？
- 子槽写进 `children` 表等于什么？卸载一棵座位树走哪条 disposer？
- shipped 工作台谁占 `root` / `sidebar` / `conversation` / `details` / `shell.overlay`？为什么在 `root` 上再 `register` 会拆掉整框？
- 同 cell 第二次 `register` 何时抛错、何时阴影？动态 Cordis 包为什么优先级更低反而赢？
- `SlotCore` 与 `SlotRegistry` / `createSlotRenderer` 各守哪一段？base / web-app / headless 谁装这条缝？

## 职责边界

本包拥有 **纯核**：`SlotMap` / `LocaleNamespaceMap` 的 declare-merge 空表、`SlotCore` 台账（内建 `'root'`）、`register` 的 load-time 校验与 unload cascade、`StoreDecl` / `StoreHandle` 合同、`SlotRenderer` / `SlotRendererHost` 安装缝。主入口没有 Cordis `apply`，`package.json` 没有 runtime `dependencies`，React 只以 `@types/react` 出现。[E: packages/client/ui-slots/package.json:31] invariant companion 的 installer 是空函数：核自己不发 Cordis 事件。[E: packages/client/ui-slots/src/invariant.ts:23]

本包**不**拥有：`ctx.slots` 服务名与 fiber 卸载（[`subsys.client.runtime`](runtime.md) 的 `SlotRegistry`）；HTTP `/api` 与会话对象层；`AppFrame` / composer UI（[`subsys.client.ui-layout`](ui-layout.md)、[`subsys.client.ui-conversation`](ui-conversation.md)）；模型 turn（agent-loop）。host 面的 `client-runtime` `apply` 是空函数，行为全在浏览器半边。[E: packages/client/runtime/src/index.ts:4]

组合画像：`PROFILE_TEMPLATES.web` 叠 `dsh-base` + `dsh-web-app`。web-app 插入 `client-runtime`、`ui-layout`、`ui-conversation` 等 `dsh.client` 行，**没有** `id: ui-slots`。[E: packages/bundle/web-app/cordis.patch.yml:168] [E: packages/bundle/web-app/cordis.patch.yml:180] launcher 在 `provide('webStartup')` 之前拒绝 `--host 0.0.0.0`，本页假定已经 bind 到浏览器壳；那条旗标门在 [`surface.profiles.web`](../../surface/profiles/web.md)，此处不重写。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/client/ui-slots/src/index.ts` | `SlotMap`、`SlotKind` / `SlotScope`、`SlotCore.register`、台账、cascade |
| `packages/client/ui-slots/src/store.ts` | `StoreSpec` / `StoreHandle` / `StoreDecl` / `PropsStore`（实现不在本包） |
| `packages/client/ui-slots/src/renderer.ts` | `SlotRenderer` / `SlotRendererHost`、`StaleAuthorizationError` / `SlotOwnershipError` |
| `packages/client/ui-slots/src/invariant.ts` | 空 installer 的 invariant companion |
| `packages/client/ui-slots/tests/core.client.spec.ts` | 内建 `root`、未声明抛错、同优抛错、cascade、store 钉 scope、微任务批通知 |
| `packages/client/runtime/src/client/slots.ts` | `SlotRegistry`：`slots/changed`、`ctx.effect` 卸载、`install` / `renderSlot('root')`、store 实例轴 |
| `packages/client/runtime/src/client/index.ts` | 浏览器 `apply`：`ctx.plugin(SlotRegistry)` |
| `packages/client/ui-layout/src/client/index.ts` | 一次 `register`：`AppFrame` 占 `root`，声明四子槽 |
| `packages/client/web/src/app-shell.ts` | `ctx.slots.install(createSlotRenderer())` |
| `packages/extensions/cordis-client-runner/src/client/guard.ts` | 动态包 `slots.register` 代理：自动分配更低 `priority` |

## 数据模型

| 符号 | 要点 |
|---|---|
| `SlotMap` | 空 interface，由各包 `declare module` 合并键。本编译单元里 `keyof SlotMap` 读成 `never`，消费者合并后才是真实键集。[E: packages/client/ui-slots/src/index.ts:24] |
| `SlotKind` | `'single' \| 'list' \| 'keyed' \| 'chain'`：单座 / 有序列表 / 键分发 / selector 选举链。[E: packages/client/ui-slots/src/index.ts:88] |
| `SlotScope` | `'root' \| 'session-maybe' \| 'session'`：全局、当前会话可空、严格绑会话。[E: packages/client/ui-slots/src/index.ts:91] `InjectParams`：`session` 带确定 `sessionId`，`session-maybe` 允许 `undefined`，`root` 不传 session 轴。[E: packages/client/ui-slots/src/index.ts:462] [E: packages/client/ui-slots/src/index.ts:466] [E: packages/client/ui-slots/src/index.ts:467] `PropsRuntime` 按 scope 交叉 `SessionStandardProps` 或 `SessionMaybeStandardProps`。[E: packages/client/ui-slots/src/index.ts:218] [E: packages/client/ui-slots/src/index.ts:219] |
| `SlotSpec` / `ChildrenDecl` | 子槽声明表：键 = 被授权 `renderSlot` 的名字，值 = 运行时 `kind`/`scope`/`inject`。声明即独占渲染权。 |
| `StoredEntry` | 台账行：component、kind 形状字段、`select` / `inject` / `children` / `store` / `locale` / `registrant`。 |
| `StoreDecl` | 共享 `StoreHandle` 或 exclusive `StoreFactory`。[E: packages/client/ui-slots/src/store.ts:106] 核只钉非函数 handle 的 scope；factory 走 `typeof store === 'function'` 豁免。[E: packages/client/ui-slots/src/index.ts:835] |
| `SlotRenderer` / `SlotRendererHost` | 核合同是 `SlotRenderer.renderRoot`（加 `SlotRendererHost`）。runtime `SlotRegistry.install` / `renderSlot` 拥有安装与 ctx 级入口；web-react `createSlotRenderer` 返回 `{ renderRoot }`。[E: packages/client/ui-slots/src/renderer.ts:189] [E: packages/client/ui-slots/src/renderer.ts:196] [E: packages/client/runtime/src/client/slots.ts:213] [E: packages/client/web-react/src/scoped-slots.tsx:897] |
| `LiveSlotNode` | `snapshot()` 导出的 JSON 安全树（无 component / hook）。 |

runtime 把 `'root'` 合并进 `SlotMap`（`single`/`root`）。[E: packages/client/runtime/src/client/slots.ts:41] 这里再 register 会阴影整框；加法面是 ui-layout 声明的 `shell.overlay` list。[E: packages/client/ui-layout/src/client/index.ts:83]

## 控制流

1. **组合层不插 `ui-slots` 行。** `dsh-web-app` 第一段 insert 有 `id: client-runtime`（`@deepseek-ai/dsh-client-runtime`）、`id: cordis-client-runner`、`id: ui-layout`、`id: ui-conversation`。核以 library 被 runtime `import { SlotCore }`。`dsh-base` 的 insert 从 `timer` / `hmr` / `llm` 起，没有浏览器 roster。[E: packages/bundle/web-app/cordis.patch.yml:168] [E: packages/bundle/web-app/cordis.patch.yml:171] [E: packages/bundle/base/cordis.patch.yml:16] `dsh-headless` 只插 `code-runtime` / `headless-startup` / `headless-runner`，没有 `webserver`、没有 `agent-presets`、也没有 client 座位图。[E: packages/bundle/headless/cordis.patch.yml:27]

2. **host 半边空；浏览器半边 `provide` `ctx.slots`。** `packages/client/runtime/src/index.ts` 的 host `apply` 丢弃 context。浏览器 `apply@packages/client/runtime/src/client/index.ts` 调用 `ctx.plugin(SlotRegistry)`，服务名 `'slots'`。[E: packages/client/runtime/src/index.ts:4] [E: packages/client/runtime/src/client/index.ts:189] [E: packages/client/runtime/src/client/slots.ts:105]

3. **`SlotCore` 构造即声明 `'root'`。** 记录 `kind: 'single', scope: 'root'`，`declaredBy: '(built-in)'`。构造不 `markDirty`。之后任何贡献必须先被某条 `children` 表声明，否则 `register` 抛 `slot "…" is not declared`。[E: packages/client/ui-slots/src/index.ts:701] [E: packages/client/ui-slots/src/index.ts:790] 测试钉死：新核 `specDynamic('root')` 已是 `{ kind: 'single', scope: 'root' }`；对未声明键 `register` 抛 `not declared`。[E: packages/client/ui-slots/tests/core.client.spec.ts:55] [E: packages/client/ui-slots/tests/core.client.spec.ts:60]

4. **`SlotRegistry` 把核接到 fiber 与事件。** 构造里 `onMutate` 同步 `ctx.emit('slots/changed', key)`。`register` 必须留在 prototype（不能写成实例箭头）：Cordis service proxy 在调用时把 `this.ctx` 绑到**调用方** fiber，卸载才 cascade 到登记插件。[E: packages/client/runtime/src/client/slots.ts:106] [E: packages/client/runtime/src/client/slots.ts:470] `_register` 先把 exclusive factory `store()` 铸成 handle、盖上 `registrant`（缺省 fiber name），再调核；核校验失败则本层不提交 store 轴。[E: packages/client/runtime/src/client/slots.ts:360]

5. **shipped 工作台一次 `register` 坐下整框。** `ui-layout` `inject = ['slots', 'theme']`。`apply` 提供 `ctx.layout`，然后 `ctx.slots.register({ name: 'root', children: { sidebar, conversation, details, shell.overlay }, store: createLayoutStore, inject })`，component 是 `AppFrame`。[E: packages/client/ui-layout/src/client/index.ts:108] [E: packages/client/ui-layout/src/client/index.ts:121] 同一声 `children` 既声明规格又拿走这四个键的 `renderSlot` 独占权。重复声明同一子键抛 `already declared`，并点名先声明者。[E: packages/client/ui-slots/src/index.ts:829]

6. **Consumer 占子座，不再给每个 `ui-*` 开节。**

   | 槽 | kind / scope | 声明者 | 占用者 |
   |---|---|---|---|
   | `root` | `single` / `root` | `SlotCore` 内建 | `ui-layout` `AppFrame` |
   | `sidebar` | `single` / `root` | ui-layout | `ui-sidebar` `SidebarRoot`（再声明 `sidebar.workspaces` / `sidebar.settings` / `sidebar.footer.action`） |
   | `conversation` | `single` / `session-maybe` | ui-layout | `ui-conversation` `ConversationRoot`（内部再声明 composer / session body / hero 等子座） |
   | `details` | `single` / `session` | ui-layout | `ui-conversation` `DetailsPanel`（再声明 `conversation.details.tool`） |
   | `shell.overlay` | `list` / `root` | ui-layout | 无人独占；新 `id` 是加法 |

   `AppFrame` 在固定树位分别调用 `renderSlot('sidebar', { collapsed, width })`、`renderSlot('conversation', {})`、`renderSlot('details', {})`、`renderSlot('shell.overlay', {})`。[E: packages/client/ui-layout/src/client/AppFrame.tsx:179] [E: packages/client/ui-layout/src/client/AppFrame.tsx:190] [E: packages/client/ui-layout/src/client/AppFrame.tsx:191] [E: packages/client/ui-layout/src/client/AppFrame.tsx:194] `ui-sidebar` 占 `sidebar`。[E: packages/client/ui-sidebar/src/client/index.ts:42] `ui-conversation` 占 `conversation` 与 `details`。[E: packages/client/ui-conversation/src/client/apply.ts:197] [E: packages/client/ui-conversation/src/client/apply.ts:445]

7. **壳只做一次 ctx 级 `renderSlot('root')`。** `app-shell` `inject = ['slots', 'sessions', 'layout']`，`apply` 里 `ctx.slots.install(createSlotRenderer())`。[E: packages/client/web/src/app-shell.ts:30] [E: packages/client/web/src/app-shell.ts:39] `buildRenderApp` 返回的树调用 `ctx.slots.renderSlot('root', {})`。[E: packages/client/web/src/app.tsx:41] `SlotRegistry.renderSlot` 只接受 `'root'`；未 `install`、或 `'root'` 台账为空，都 fail-loud。[E: packages/client/runtime/src/client/slots.ts:252] [E: packages/client/runtime/src/client/slots.ts:256] [E: packages/client/runtime/src/client/slots.ts:258] host face 还要求 `sessions` / `workspaces` 已挂（runtime apply 必须先于壳渲染）。[E: packages/client/runtime/src/client/slots.ts:390]

8. **`register` 的 cell 规则（核，所有调用方共用）。** `priority` 缺省 `0`。`single` / 同 `key` / 同 `id` 在**同一 priority** 再登记抛错（`already has a registration` / `already has an entry`）；缺 `key` / `id` / `select` 也按 kind 抛。[E: packages/client/ui-slots/src/index.ts:796] [E: packages/client/ui-slots/src/index.ts:802] 不同 priority 共存，台账按 priority 升序（list 再按 `order`）；`entriesOfSlot` 跳过 abdicate 条目，每个 cell 只收第一次出现的赢家，因此**数字更小的赢**。[E: packages/client/ui-slots/src/index.ts:867] [E: packages/client/ui-slots/src/index.ts:944] `chain` 不做阴影：选举吃完全部条目。同优二次占 `root` 的测试期望抛 `already has a registration`。[E: packages/client/ui-slots/tests/core.client.spec.ts:66]

9. **动态包走 facade，才会「第二次覆盖」。** `@deepseek-ai/dsh-cordis-client-runner` 的 `guardedSlots` 在非 `chain` 上把 `options.priority` 改写成 `allocatePriority()`；runner 里 `allocatePriority: () => --this.nextPriority`（从 0 递减：`-1`、`-2`…）。[E: packages/extensions/cordis-client-runner/src/client/guard.ts:124] [E: packages/extensions/cordis-client-runner/src/client/runtime.ts:424] 测试：两次 `register({ name: 'root' })` 台账 priority 是 `-1` 再 `-2`，最新的更低因而赢。[E: packages/extensions/cordis-client-runner/tests/guard.client.spec.ts:156] 阴影**不** dispose 旧条目：`AppFrame` 仍在 ledger 上，它声明的子槽规格还在；但 `entriesOfSlot('root')` 选出动态组件，`AppFrame` 不再被画，它内部那些 `renderSlot('sidebar'|…)` 调用也不跑，整棵座位树从屏幕上消失。加法面是 `shell.overlay`（list，新 `id` 并排）。

10. **渲染读 `entriesOfSlot`，不读生 ledger。** `createSlotRenderer` 的 `RootOutlet` 取 `host.entriesOfSlot('root')[0]`；`single` 取 cell 赢家，`chain` 按 `select(owner)` 第一个非 `null` 当选，`overlay` 保活 fallback。[E: packages/client/web-react/src/scoped-slots.tsx:897] [E: packages/client/web-react/src/scoped-slots.tsx:861] [E: packages/client/web-react/src/scoped-slots.tsx:762] [E: packages/client/web-react/src/scoped-slots.tsx:797] [E: packages/client/web-react/src/scoped-slots.tsx:802] 入口 crash 对阴影 kind 带 `abdicate: true`：条目仍在 `entries()` 里，但被放进 `abdicated` WeakSet，下一个 survivor 上场。[E: packages/client/ui-slots/src/index.ts:1101] `boundRenderSlot` 在条目已死时抛 `StaleAuthorizationError`，键不在 `children` 表时抛 `SlotOwnershipError`；两个类在 `renderer.ts` 是空 `Error` 子类。[E: packages/client/web-react/src/scoped-slots.tsx:44] [E: packages/client/web-react/src/scoped-slots.tsx:49] [E: packages/client/ui-slots/src/renderer.ts:200] [E: packages/client/ui-slots/src/renderer.ts:207]

11. **一条生命周期轴：disposer = 贡献 + 声明树。** `register` 返回的函数若条目已不在 ledger 则直接 return（idempotent / stale no-op）。[E: packages/client/ui-slots/src/index.ts:891] 仍在则滤掉自己、`markDirty`、`releaseEntry`。`releaseEntry` 把每个子槽 `spec` 清空、entries 置空、递归再 `releaseEntry`。[E: packages/client/ui-slots/src/index.ts:1140] 测例：dispose 占 `root` 的 frame 后，子槽 `specDynamic` 变 `undefined`。[E: packages/client/ui-slots/tests/core.client.spec.ts:97] `SlotRegistry` 把该 disposer 挂进 `ctx.effect(..., 'slots.register()')`：插件 fiber `dispose` 即卸座。测例：带 `inject: ['slots']` 的插件 unload 后 `t.host` 条目数为 0。[E: packages/client/runtime/tests/slots-service.client.spec.ts:247]

12. **变更通知两档。** `markDirty` 同步 bump `version` 并调用 `onMutate`（→ `slots/changed`），`subscribe` 则 `queueMicrotask` 按 record 批一次。[E: packages/client/ui-slots/src/index.ts:1170] [E: packages/client/ui-slots/src/index.ts:1175] 同 tick 两次 `register`：version +2，listener 只响 1 次。[E: packages/client/ui-slots/tests/core.client.spec.ts:268] `subscribeDeclaration` 同步，且整张 `children` 表先全部落声明再 `notifyDeclaration`。[E: packages/client/ui-slots/src/index.ts:887]

13. **store：核钉 scope，runtime 管实例。** 共享 handle 第一次挂上记下 `SlotScope`，跨 scope 再挂抛 `one handle, one scope`；factory 豁免。[E: packages/client/ui-slots/src/index.ts:839] [E: packages/client/ui-slots/tests/core.client.spec.ts:196] `SlotRegistry.resolveStore`：root 用字面量 `'root'` 作 key 且 `handle.create()`；session 用 `sessionId` 且 `handle.create(sessionId)`。会话死时 `pruneStoreScope` 对 session 轴 `clearPersisted` 再删实例（含从未渲染过、但上次页面留下 persist key 的会话）。[E: packages/client/runtime/src/client/slots.ts:276] [E: packages/client/runtime/src/client/slots.ts:432] 组件只看见 `useStore` + 已烘焙 `actions`，看不见实例。[E: packages/client/ui-slots/src/store.ts:124]

14. **`slots.inject(key, cb)` 等声明寿命，不是第二条 register API。** 声明已在则同步跑；否则等 `subscribeDeclaration`。collapse 卸 effect，下一次声明再跑。controller 属调用方 fiber。这是后挂插件等 `ui-layout` 先声明子槽的门，不是另开一套座位。

## 设计动机

- **库与 Provider 切开。** 座位语义要给测试、动态 facade、web-react 三方共用，不能绑死 Loader 行。web-app 只插 `client-runtime`；headless / base 根本不装浏览器半边。换 renderer（`install`）或换动态 guard，不改 `SlotCore`。
- **声明即独占渲染权。** 子槽不能由两个 frame 同时 `renderSlot`，否则所有权漂移。类型侧 `RendersCheck` 还要求声明了 `children` 的组件必须消费 `renderSlot` / `renderSlotChain`。
- **同优 fail-loud，跨优阴影。** 无 priority 的 composition 保持历史「一 cell 一占座」。动态包需要覆盖 shipped 组件时，facade 分配更低数字，让 `entriesOfSlot` 选出后来者，而不去 dispose `AppFrame`（dispose 会 cascade 拆掉子槽声明，后挂的 `ui-sidebar` 会变成 undeclared）。
- **`root` 禁止当加法面。** `single` 的第二赢家不是「旁边再贴一块」，而是整棵树换根。浮动层用 `shell.overlay` list。
- **model-visible ⟺ logged 不适用于座位图。** 槽位是人看的壳，不进 session log，也不进模型工具集。client 只经 `/api` 提交；本页不唤醒 `ReactLoopAgent`。

## Gotcha

- **直接 `ctx.slots.register({ name: 'root' })` 在 AppFrame 之后会抛，不是覆盖。** 覆盖只发生在调用方给出**更低** `priority`，或走 cordis-client-runner facade（自动 `--nextPriority`）。[E: packages/client/ui-slots/src/index.ts:802] [E: packages/extensions/cordis-client-runner/src/client/runtime.ts:424]
- **阴影 ≠ cascade。** 低 priority 赢家只换谁被 `entriesOfSlot` 画出来；旧条目与它声明的子槽仍在 ledger。只有 disposer / fiber unload 才把子槽打回 undeclared。
- **`register` 必须是 prototype 方法。** 写成箭头会把 `this` 冻在 service 根 ctx，插件 unload 卸不掉座位。[E: packages/client/runtime/src/client/slots.ts:470]
- **共享 store handle 一 scope。** 同一 handle 不能同时坐 `root` 槽和 `session` 槽；要跨 scope 用 factory。[E: packages/client/ui-slots/src/index.ts:839]
- **`locale:` 条目在未 `installLocale` 时渲染抛 `SlotAssemblyError`。** locale 插件必须是 immediately-tier；后装的 face 通知不到已挂 outlet。[E: packages/client/web-react/src/scoped-slots.tsx:413]
- **`ctx-level renderSlot` 只能 `'root'`。** 子槽一律走组件 props 上的 `renderSlot` / `renderSlotChain`。delegation 是传 props，授权身份仍是登记条目。[E: packages/client/runtime/src/client/slots.ts:253]
- **不要给 30 个 `ui-*` 各开子系统。** 本页的权威装配点就是 `root` 四子槽；更里面的 composer / toolview / settings.section 仍是同一次 `register` 语义。
- **`hmr` ≠ `client-hmr` ≠ 动态 priority。** web overlay 关掉的是 base 共享 `@deepseek-ai/cordis-plugin-hmr`；`client-hmr` 热换 client bundle；动态包阴影是 `cordis-client-runner` 的 `allocatePriority`。三条线。

## Seam 三角

| 缝 | Definition | Provider | Consumer | base | web-app | headless |
|---|---|---|---|---|---|---|
| `SlotMap` / `SlotCore.register` | `@deepseek-ai/dsh-client-ui-slots`：空表 + 核台账 + 四 kind 校验 | 无 Cordis 服务；`new SlotCore()` 即可（测试直接用） | 类型合并方（runtime 合并 `root`；layout / conversation / sidebar 合并自己的键） | 不进树 | 被 runtime **import**，不是 Loader 行 | 不进树 |
| `ctx.slots` | `SlotRegistry extends Service`，服务名 `'slots'` | **browser** `id: client-runtime` → `ctx.plugin(SlotRegistry)`。host `apply` 空 | 各 `ui-*` / 动态 facade 的 `register` / `inject`；壳的 `install` / `renderSlot('root')` | 无此行 | 有 | 无 |
| `SlotRenderer` | `SlotRenderer.renderRoot` + `SlotRendererHost`（`renderer.ts`）；`install` 在 runtime | **browser** `app-shell`：`ctx.slots.install(createSlotRenderer())`（web-react 实现 `renderRoot`） | `AppRoot` 经 `buildRenderApp` 调 `renderSlot('root')` | 无壳 | 有 | 无 |
| 动态阴影 `priority` | 核：升序、最低赢；facade：改写 options | **browser** `id: cordis-client-runner`：`allocatePriority = () => --nextPriority` | 动态 Cordis 包的 `slots.register`；chain 保持自有 `select` | 无 | 有 | 无 |
| store 实例轴 | `StoreDecl` / `DefineStore` 合同在 ui-slots；`defineStore` 引擎在 runtime | `SlotRegistry.storeOf` / `pruneStoreScope` | 声明了 `store:` 的登记组件（`useStore` + `actions`） | 无 | 随 runtime | 无 |

换 Provider 会带走 Consumer：删掉 web-app 的 `client-runtime` 行，所有 `inject: ['slots']` 的 `ui-*` pending，壳无法 `install`。把 `jobs` 式的 host 服务搬进 preset 与本缝无关。Definition（`SlotMap` 键、kind/scope、`register` 抛错合同）在三份 shipped 模板里不变；**只有 web-app 把这条缝接到活树上**。base 是单会话进程工具面；headless 是无 GUI 的 host 全局工具面。本仓没有 shipped TUI 去消费 `ctx.slots`。

## Sources

- packages/client/ui-slots/src/index.ts
- packages/client/ui-slots/src/store.ts
- packages/client/ui-slots/src/renderer.ts
- packages/client/ui-slots/src/invariant.ts
- packages/client/ui-slots/package.json
- packages/client/ui-slots/tests/core.client.spec.ts
- packages/client/ui-slots/tests/dynamic-keys.client.spec.ts
- packages/client/ui-slots/tests/type-chain.client.spec.tsx
- packages/client/runtime/src/index.ts
- packages/client/runtime/src/client/index.ts
- packages/client/runtime/src/client/slots.ts
- packages/client/runtime/tests/slots-service.client.spec.ts
- packages/client/ui-layout/src/client/index.ts
- packages/client/ui-layout/src/client/AppFrame.tsx
- packages/client/ui-conversation/src/client/apply.ts
- packages/client/ui-sidebar/src/client/index.ts
- packages/client/web/src/app-shell.ts
- packages/client/web/src/app.tsx
- packages/client/web-react/src/scoped-slots.tsx
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/base/cordis.patch.yml
- packages/bundle/headless/cordis.patch.yml
- packages/extensions/cordis-client-runner/src/client/guard.ts
- packages/extensions/cordis-client-runner/src/client/runtime.ts
- packages/extensions/cordis-client-runner/tests/guard.client.spec.ts

## 相关

- [`spine.overview`](../../spine/overview.md) — 组合运行时全仓地图；host / preset / client 三面。
- [`spine.trace-web-first-prompt`](../../spine/trace-web-first-prompt.md) — `dsh web` 到第一轮 `session.prompt`；本页只覆盖座位图如何挂上，不跑 turn。
- [`subsys.client.runtime`](runtime.md) — `SlotRegistry` / `ctx.slots` / sessions / workspaces；本页是它下面的纯核。
- [`subsys.client.ui-layout`](ui-layout.md) — `AppFrame` 占 `root`、四子槽与 `ctx.layout`。
- [`subsys.client.ui-conversation`](ui-conversation.md) — 占 `conversation` + `details`，以及提交链（本页不写 composer 组件图鉴）。
- [`surface.web.workbench`](../../surface/web/workbench.md) — 工作台可见面与 chrome；装配合同以本页 + layout/conversation 为准。
- [`surface.profiles.web`](../../surface/profiles/web.md) — web profile、`--host 0.0.0.0` 拒在 `webStartup` 之前。
- [`subsys.composition.bundle-web-app`](../composition/bundle-web-app.md) — web overlay 插入 client roster、disable 模型可见 tool 行。
