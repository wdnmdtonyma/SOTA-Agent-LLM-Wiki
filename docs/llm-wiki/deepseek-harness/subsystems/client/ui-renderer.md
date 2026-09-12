---
id: subsys.client.ui-renderer
title: ui-renderer (原 web-react)
kind: subsystem
tier: T2
pkg: client
source:
  - packages/client/ui-renderer/package.json
  - packages/client/ui-renderer/src/index.ts
  - packages/client/ui-renderer/src/invariant.ts
  - packages/client/ui-renderer/src/client/index.ts
  - packages/client/ui-renderer/src/client/app.tsx
  - packages/client/ui-renderer/src/client/bind.ts
  - packages/client/ui-renderer/src/client/bindings.tsx
  - packages/client/ui-renderer/src/client/registry.ts
  - packages/client/ui-renderer/src/client/scoped-slots.tsx
  - packages/client/ui-renderer/tests/bind.client.spec.tsx
  - packages/client/ui-renderer/tests/registry.client.spec.ts
  - packages/client/ui-renderer/tests/scoped-slots.client.spec.tsx
  - packages/client/ui-slots/src/index.ts
  - packages/client/ui-slots/src/renderer.ts
  - packages/client/store/src/index.ts
  - packages/client/web/src/boot.ts
  - packages/client/ui-layout/src/client/index.ts
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/headless/cordis.patch.yml
  - packages/bundle/web-app/src/startup.ts
symbols:
  - bindSnapshotSelector
  - createSlotRenderer
  - buildRenderApp
  - SlotAssemblyError
  - observableHook
  - maybeObservableHook
  - keyedObservableHook
  - BootHandoff
  - HostContext
  - RootStandardProvider
  - ScopeProvider
  - boundRenderSlot
related:
  - spine.overview
  - spine.trace-web-first-prompt
  - subsys.client.runtime
  - subsys.client.ui-slots
  - subsys.client.ui-layout
  - subsys.client.ui-conversation
  - subsys.client.web
  - surface.web.workbench
  - surface.profiles.web
  - subsys.composition.bundle-web-app
evidence: explicit
status: verified
updated: c291e7961a
---

> `@deepseek-ai/dsh-client-ui-renderer` 是已删除 `dsh-client-web-react` 的 live 去处：浏览器半边把 `SlotCore`（[`subsys.client.ui-slots`](ui-slots.md)）接到 Cordis fiber、`slots/changed`、React outlet 与 **唯一** uSES 构造器 `bindSnapshotSelector`；`ctx.reflect.provide('uiRenderer')` 的 `mount` 把 `buildRenderApp` 的 `renderSlot('root')` 挂进 DOM。Host 半边 `apply()` 空操作。服务名 `ctx.slots` / `ctx.uiRenderer` 与 `SlotRegistry` 的对象层摘要见 [`subsys.client.runtime`](runtime.md)（节点 id 稳定别名）。client 不执行模型 turn。

## 能回答的问题

- 旧包 `packages/client/web-react` 拆到哪些 live 文件？host `apply` 与 client `apply` 各做什么？
- `bindSnapshotSelector` 为什么是栈里唯一 hook 构造器？`subscribe` / `getSnapshot` 何时捕获？
- `createSlotRenderer` 包哪些 Provider？per-entry `boundRenderSlot` 何时抛 `StaleAuthorizationError` / `SlotOwnershipError`？
- `ctx.slots.renderSlot` 为什么只允许 `'root'`？boot 怎样 `inject(['uiRenderer'])` 再 `mount`？
- `dsh-web-app` 插 `id: ui-renderer` 吗？`dsh-base` / `dsh-headless` / `sdk` / `sdk-minimal` / `acp` 装不装这条缝？
- `slots/changed` 与 invariant companion 如何对齐 version bump？

## 职责边界

本包装 **React 渲染缝与 snapshot 绑定**，不是座位图纯核，也不是 HTTP / Session 对象层。

**拥有**

- 浏览器 `apply`：`new SlotRegistry(ctx)`、`slots.install(createSlotRenderer())`、`ctx.reflect.provide('uiRenderer')`。[E: packages/client/ui-renderer/src/client/index.ts:89] [E: packages/client/ui-renderer/src/client/index.ts:90] [E: packages/client/ui-renderer/src/client/index.ts:91]
- `bindSnapshotSelector`：裸 `HostObservable` → 稳定 `useSelector`。[E: packages/client/ui-renderer/src/client/bind.ts:21]
- `createSlotRenderer` / `SlotOutlet` / 授权绑定 / election overlay。[E: packages/client/ui-renderer/src/client/scoped-slots.tsx:929]
- `buildRenderApp`：全程序只调一次 `ctx.slots.renderSlot('root', {})`。[E: packages/client/ui-renderer/src/client/app.tsx:21]
- Hydration：`BootHandoff` 保住 `data-dsh-boot` DOM 再切应用。[E: packages/client/ui-renderer/src/client/index.ts:59] [E: packages/client/ui-renderer/src/client/index.ts:73]
- Companion `client-ui-renderer-invariant`：`slots/changed` 必须发生在 `getVersion(key) !== 0` 之后。[E: packages/client/ui-renderer/src/invariant.ts:34] [E: packages/client/ui-renderer/src/invariant.ts:35]

**不拥有**

- `SlotMap` / `SlotKind` / `SlotScope` / `SlotCore.register` 校验与 cascade：权威 [`subsys.client.ui-slots`](ui-slots.md)。
- `defineStore` / snapshot 引擎：[`subsys.client.runtime`](runtime.md) 指向 `dsh-client-store`。
- `ctx.sessions` / `Session.prompt`：session-controller 浏览器半边，见 runtime。
- `AppFrame` 占 `'root'`：[`subsys.client.ui-layout`](ui-layout.md)。
- 模型 turn：agent-loop。Host HTTP：三个 `packages/api/*-controller` + webserver，不是本包。

DSH 是 Cordis 组合运行时（profile → bundle → preset）。五个 shipped profile：`web`（live）与 `headless` / `sdk` / `sdk-minimal` / `acp`（startup）。`dsh web` 是唯一硬编码 profile 子命令；其余 `dsh --profile sdk|sdk-minimal|acp|headless`。web-app launcher 在 `provide('webStartup')` 之前拒绝 `--host 0.0.0.0`。[E: packages/bundle/web-app/src/startup.ts:74] 四个 shipped preset 目录是 `minimal` / `standard` / `ptc` / `cordis`（旧 `code` = PTC），与本渲染缝无关。

组合：`dsh-web-app` insert 含 `id: ui-renderer` / `name: '@deepseek-ai/dsh-client-ui-renderer'`。[E: packages/bundle/web-app/cordis.patch.yml:210] [E: packages/bundle/web-app/cordis.patch.yml:210] `dsh-base` insert 从 `timer` / `hmr` 起，没有浏览器 roster。[E: packages/bundle/base/cordis.patch.yml:16] `dsh-headless` 只插 `code-runtime` / `headless-startup` / `headless-runner`。[E: packages/bundle/headless/cordis.patch.yml:20] [E: packages/bundle/headless/cordis.patch.yml:23] [E: packages/bundle/headless/cordis.patch.yml:27] `package.json` `dsh.client.immediately: true`。[E: packages/client/ui-renderer/package.json:35] host 入口 `apply` 无行为。[E: packages/client/ui-renderer/src/index.ts:4]

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/client/ui-renderer/src/index.ts` | Host loader：空 `apply` |
| `packages/client/ui-renderer/src/client/index.ts` | 浏览器 `apply`、`UiRendererService`、`BootHandoff` / `mountApp` |
| `packages/client/ui-renderer/src/client/registry.ts` | `SlotRegistry`（Service 名 `'slots'`）、`install` / `renderSlot('root')`、store 实例轴 |
| `packages/client/ui-renderer/src/client/scoped-slots.tsx` | `createSlotRenderer`、outlet、授权、error boundary |
| `packages/client/ui-renderer/src/client/bind.ts` | **唯一** `bindSnapshotSelector` |
| `packages/client/ui-renderer/src/client/bindings.tsx` | `observableHook` 缓存、`HostContext`、scope providers |
| `packages/client/ui-renderer/src/client/app.tsx` | `buildRenderApp` |
| `packages/client/ui-renderer/src/invariant.ts` | `slots/changed` 时序 |
| `packages/client/web/src/boot.ts` | quiescence 后 `inject(['uiRenderer'])` → `mount` |
| `packages/bundle/web-app/cordis.patch.yml` | 插入 `id: ui-renderer` |

## 数据模型

| 符号 | 要点 |
|---|---|
| `UiRendererService` | `{ mount(container): disposer }`。[E: packages/client/ui-renderer/src/client/index.ts:30] 权威摘要在 runtime；本页写 mount 实现。 |
| `SlotRegistry` | Cordis `Service`，名 `'slots'`。[E: packages/client/ui-renderer/src/client/registry.ts:95] [E: packages/client/ui-renderer/src/client/registry.ts:134] 内含 `SlotCore`；register 必须在 prototype，使 `this.ctx` 绑到调用方 fiber。[E: packages/client/ui-renderer/src/client/registry.ts:606] [E: packages/client/ui-renderer/src/client/registry.ts:612] |
| `bindSnapshotSelector` | 捕获一次 `subscribe` / `getSnapshot` 闭包，默认 `Object.is`。[E: packages/client/ui-renderer/src/client/bind.ts:22] [E: packages/client/ui-renderer/src/client/bind.ts:23] 无 SSR snapshot（第三参 `undefined`）。[E: packages/client/ui-renderer/src/client/bind.ts:25] |
| `observableHook` | WeakMap 缓存，同一 source 不重建 hook。[E: packages/client/ui-renderer/src/client/bindings.tsx:57] [E: packages/client/ui-renderer/src/client/bindings.tsx:66] |
| `createSlotRenderer` | 只实现 `{ renderRoot }`。[E: packages/client/ui-renderer/src/client/scoped-slots.tsx:929] 树：`HostContext` → `RootStandardProvider` → `ScopeProvider scope="session-maybe"` → `RootOutlet`。[E: packages/client/ui-renderer/src/client/scoped-slots.tsx:939] |
| `SlotAssemblyError` | 缺 host / 缺 binding / `'root'` 尚无登记。[E: packages/client/ui-renderer/src/client/bindings.tsx:14] [E: packages/client/ui-renderer/src/client/scoped-slots.tsx:903] |
| `RootOwnerProps` | `'root'` 的 owner share：`children?: never`。[E: packages/client/ui-renderer/src/client/registry.ts:48] |

本包把 `'root'` 合并进 `SlotMap`（`single`/`root`）。[E: packages/client/ui-renderer/src/client/registry.ts:43] 在 `'root'` 再 `register` 会阴影整框；加法面是 ui-layout 的 `shell.overlay`。`SlotKind` / `SlotScope` 表在 ui-slots 节点。

## 控制流

1. **web-app 插入本行。** `id: ui-renderer`。[E: packages/bundle/web-app/cordis.patch.yml:210] 非 GUI profile 不装。

2. **Host 空；浏览器 `provide`。** host `apply` 空。[E: packages/client/ui-renderer/src/index.ts:4] client `inject: []`。[E: packages/client/ui-renderer/src/client/index.ts:51] `apply` 构造 registry、立刻 `install(createSlotRenderer())`、再 `ctx.reflect.provide('uiRenderer')`。[E: packages/client/ui-renderer/src/client/index.ts:89] [E: packages/client/ui-renderer/src/client/index.ts:90] [E: packages/client/ui-renderer/src/client/index.ts:91]

3. **`SlotRegistry` 事件桥。** 构造 `super(ctx, 'slots')`。[E: packages/client/ui-renderer/src/client/registry.ts:134] `onMutate` 同步 `ctx.emit('slots/changed', key)`。[E: packages/client/ui-renderer/src/client/registry.ts:135] invariant 拒绝 version 仍为 0 的 dispatch。[E: packages/client/ui-renderer/src/invariant.ts:34]

4. **`install` boot-once。** 第二次 `install` 抛 `already installed`。[E: packages/client/ui-renderer/src/client/registry.ts:243] 走调用方 `ctx.effect`，fiber 卸载卸 renderer。[E: packages/client/ui-renderer/src/client/registry.ts:244]

5. **`_register`。** exclusive factory `store()` 铸 handle、盖 `registrant`，再调核；核校验失败则本层不提交 store 轴。[E: packages/client/ui-renderer/src/client/registry.ts:440] prototype `register` 包 `this.ctx.effect(..., 'slots.register()')`。[E: packages/client/ui-renderer/src/client/registry.ts:612]

6. **授权绑定。** `boundRenderSlot` 按 `StoredEntry` WeakMap 稳定身份；entry 死后 `isLive` 失败抛 `StaleAuthorizationError`。[E: packages/client/ui-renderer/src/client/scoped-slots.tsx:46] 未在 `children` 声明的键抛 `SlotOwnershipError`。[E: packages/client/ui-renderer/src/client/scoped-slots.tsx:51] `chain` 键必须走 `renderSlotChain`。[E: packages/client/ui-renderer/src/client/scoped-slots.tsx:54]

7. **ctx 级只渲 `'root'`。** 其它键抛明确错误；未 `install`、`'root'` 无登记同样 fail-loud。[E: packages/client/ui-renderer/src/client/registry.ts:349] [E: packages/client/ui-renderer/src/client/registry.ts:352] [E: packages/client/ui-renderer/src/client/registry.ts:355] 成功则 `_renderer.renderRoot(this.hostFace(), owner)`。[E: packages/client/ui-renderer/src/client/registry.ts:358]

8. **装配树。** `buildRenderApp` 返回 `() => ctx.slots.renderSlot('root', {})`。[E: packages/client/ui-renderer/src/client/app.tsx:21] ui-layout 把 `AppFrame` 登记进 `'root'` 并声明四子槽（权威 ui-layout）。

9. **Boot mount。** `AppWebEntry.mountApp`：`ctx.inject(['uiRenderer'], … scope.uiRenderer.mount(this.container))`。[E: packages/client/web/src/boot.ts:97] [E: packages/client/web/src/boot.ts:98] 容器已有 `[data-dsh-boot]` 则 `hydrateRoot` + `BootHandoff`；否则 `createRoot` + `flushSync`。[E: packages/client/ui-renderer/src/client/index.ts:72] [E: packages/client/ui-renderer/src/client/index.ts:79]

10. **uSES。** 引擎与 Session 对象只暴露裸 `subscribe`/`getSnapshot`；React 侧 `bindSnapshotSelector` 一次绑定。测试钉死：重渲染不增加 `subscribeCalls`（见 `bind.client.spec.tsx`）。

## 设计动机

旧 `web-react` 把 React 绑定、slot registry 与「像 runtime 的对象层」搅在一起。现切分：无 React 的核在 ui-slots / store；**本包只做需要 React 与 live ctx 的那一层**。`bind` 必须在 React 侧，避免引擎依赖 `use-sync-external-store`。`renderSlot` 只开放 `'root'`，防止任意插件从 ctx 捅破授权树。

## Gotcha

- 对 `'root'` 第二次 `register` 阴影 `AppFrame`，动态包更低 `priority` 反而赢（cordis-client-runner 代理）。加法请走 `shell.overlay`。
- `register` 写成实例箭头会冻 `this` 到 service 根 ctx，插件卸载不 cascade。
- `hydrateRoot` 路径依赖 boot DOM 的 `:scope > [data-dsh-boot]`；结构不对会走 `createRoot` 闪一下。
- `HostObservable` 类型从 ui-slots 再导出，实现仍只在 `bind.ts`。
- 本仓没有 shipped TUI；headless / sdk / sdk-minimal / acp 不跑这条 React 缝。

## Seam 三角

| 角色 | 位置 |
|---|---|
| **Definition** | ui-slots：`SlotRenderer` / `SlotRendererHost` / `HostObservable` / `SnapshotSelectorHook`（合同）。本包声明 Cordis `Context.slots` / `uiRenderer` 与 Events `'slots/changed'`。[E: packages/client/ui-renderer/src/client/index.ts:44] [E: packages/client/ui-renderer/src/client/index.ts:46] |
| **Provider** | 本包 client `apply`：`SlotRegistry` + `createSlotRenderer` + `UiRendererService.mount`。[E: packages/client/ui-renderer/src/client/index.ts:88] [E: packages/client/ui-renderer/src/client/index.ts:91] 组合层：`dsh-web-app` `id: ui-renderer`。[E: packages/bundle/web-app/cordis.patch.yml:210] |
| **Consumer** | `packages/client/web` boot `inject(['uiRenderer'])`。[E: packages/client/web/src/boot.ts:97] 各 `ui-*` `ctx.slots.register`；ui-layout 占 `'root'`。动态包经 cordis-client-runner 代理 `register`。 |

换 renderer 实现必须仍满足 `install` + `renderRoot`；换 `bindSnapshotSelector` 会带走全部 selector hook 身份稳定性。

## Sources

- packages/client/ui-renderer/package.json
- packages/client/ui-renderer/src/index.ts
- packages/client/ui-renderer/src/invariant.ts
- packages/client/ui-renderer/src/client/index.ts
- packages/client/ui-renderer/src/client/app.tsx
- packages/client/ui-renderer/src/client/bind.ts
- packages/client/ui-renderer/src/client/bindings.tsx
- packages/client/ui-renderer/src/client/registry.ts
- packages/client/ui-renderer/src/client/scoped-slots.tsx
- packages/client/ui-renderer/tests/bind.client.spec.tsx
- packages/client/ui-renderer/tests/registry.client.spec.ts
- packages/client/ui-renderer/tests/scoped-slots.client.spec.tsx
- packages/client/ui-slots/src/index.ts
- packages/client/ui-slots/src/renderer.ts
- packages/client/store/src/index.ts
- packages/client/web/src/boot.ts
- packages/client/ui-layout/src/client/index.ts
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/base/cordis.patch.yml
- packages/bundle/headless/cordis.patch.yml
- packages/bundle/web-app/src/startup.ts

## 相关

- [`subsys.client.runtime`](runtime.md) — `ctx.slots` / `ctx.uiRenderer` / store / Session 客户端总览（稳定别名）。
- [`subsys.client.ui-slots`](ui-slots.md) — `SlotCore` / `SlotKind` / `register` 纯核。
- [`subsys.client.ui-layout`](ui-layout.md) — `AppFrame` 占 `'root'`。
- [`subsys.client.ui-conversation`](ui-conversation.md) — `conversation` 槽与提交。
- [`subsys.client.web`](web.md) — 浏览器壳与 boot kernel。
- [`surface.web.workbench`](../../surface/web/workbench.md) — 工作台可见面。
- [`surface.profiles.web`](../../surface/profiles/web.md) — `PROFILE_TEMPLATES.web`。
- [`subsys.composition.bundle-web-app`](../composition/bundle-web-app.md) — 插入本行的 bundle。
- [`spine.trace-web-first-prompt`](../../spine/trace-web-first-prompt.md) — 首条 prompt 走读。
- [`spine.overview`](../../spine/overview.md) — 总图。
