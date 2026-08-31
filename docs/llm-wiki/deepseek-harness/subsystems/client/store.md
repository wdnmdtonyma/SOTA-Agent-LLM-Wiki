---
id: subsys.client.store
title: client store
kind: subsystem
tier: T2
pkg: client
source:
  - packages/client/store/package.json
  - packages/client/store/src/index.ts
  - packages/client/store/src/contract.ts
  - packages/client/store/src/invariant.ts
  - packages/client/store/tests/store.client.spec.ts
  - packages/client/store/tests/invariant.client.spec.ts
  - packages/client/ui-slots/src/store.ts
  - packages/client/ui-renderer/src/client/scoped-slots.tsx
  - packages/client/ui-renderer/src/client/registry.ts
  - packages/client/ui-user-questions/src/client/draft-store.ts
  - packages/boot/app-boot/src/profile.ts
symbols:
  - defineStore
  - createSnapshotStore
  - SnapshotStore
  - StoreInstance
  - StoreHandle
  - EngineStoreInstance
  - EngineStoreHandle
  - ObservableSnapshot
  - StoreSpec
  - StoreDecl
  - PropsStore
  - notifySubscribers
  - shallowEqual
  - client-store-invariant
related:
  - spine.overview
  - spine.trace-web-first-prompt
  - subsys.client.runtime
  - subsys.client.ui-slots
  - subsys.client.ui-conversation
  - subsys.client.web
  - subsys.client.modules
  - surface.profiles.web
  - subsys.composition.bundle-web-app
evidence: explicit
status: verified
updated: 0a53fb55be
---

> `@deepseek-ai/dsh-client-store` 是浏览器半边的 **React-free snapshot 引擎**：zustand vanilla + immer + `subscribeWithSelector` + 可选 `raf` 批刷 + 手写 `localStorage` JSON persist。`defineStore` 把 `init` / `persist` / `actions` 烤成 `StoreHandle`；live 产物只有 `getSnapshot` / `subscribe` / baked `actions`（外加测试用的 `store.update`/`set`）。`useStore` 选择器 hook **不**在本包合成，由 [`subsys.client.runtime`](runtime.md) 指向的 ui-renderer 在装配时绑。本包**不是** Loader 行：没有 `dsh.client`、没有 `ctx.store`。已删除的 `packages/client/runtime` 的状态家现在就是这里。client 不执行模型 turn。

## 能回答的问题

- 旧 `dsh-client-runtime` 的 snapshot 引擎落到哪个包？`defineStore` 与 `createSnapshotStore` 差在哪？
- 默认 flush 为什么是 `sync`？`raf` 模式无 `requestAnimationFrame` 时落到什么？
- persist 为什么不用 zustand persist middleware？scope key 怎么拼进 `localStorage` 名？
- 组件为什么看不见 `update`/`set`？`useStore` 谁绑？
- `ui-slots` 再导出合同算不算第二份引擎？handle 模块级导出为什么禁止？
- `dsh-base` / `dsh-web-app` / headless 有没有 `id: store`？五个 shipped profile 谁真正跑这套引擎？

## 职责边界

DSH 是 **Cordis 组合运行时**（主线 `profile → bundle → agent preset`）。五个 shipped profile：`web`（live）与 `headless` / `sdk` / `sdk-minimal` / `acp`（startup）。[E: packages/boot/app-boot/src/profile.ts:138] `web` 叠 `dsh-base` + `dsh-web-app` 且 `patchReload: 'live'`；其余 startup。[E: packages/boot/app-boot/src/profile.ts:143] 默认 GUI 是 `dsh web`；stdio 面还有 `dsh --profile sdk|sdk-minimal|acp`。本仓没有 shipped TUI。client 不实现 `ctx.fs` / agent-loop。

本包拥有：

- 合同面 `ObservableSnapshot` / `StoreSpec` / `StoreHandle` / `StoreInstance` / `StoreDecl` / `PropsStore`（`packages/client/store/src/contract.ts`）。
- 引擎面 `createSnapshotStore`、`defineStore`、`SnapshotStore`、`EngineStoreInstance`、`notifySubscribers`、`shallowEqual`（`packages/client/store/src/index.ts`）。
- 空 invariant companion `name: 'client-store-invariant'`：库不占进程全局态，installer 是空函数。[E: packages/client/store/src/invariant.ts:13] [E: packages/client/store/src/invariant.ts:21]

本包**不**拥有：`ctx.slots` / `SlotRegistry`（ui-renderer；权威走读在 [`subsys.client.runtime`](runtime.md) 与 [`subsys.client.ui-slots`](ui-slots.md)）；`useStore` hook（ui-renderer `observableHook`）；Session / Workspace 对象层（`packages/api/session-controller/src/client/`、`packages/api/workspace-controller/src/client/`）；host `SessionStore`；模型 turn。

`ui-slots` 的 `store.ts` **只再导出类型**，不实现引擎。[E: packages/client/ui-slots/src/store.ts:12] 节点 id `subsys.client.runtime` 是稳定别名，应链到本页而不是复述引擎。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/client/store/package.json` | npm `@deepseek-ai/dsh-client-store`；deps `immer` + `zustand`；无 `dsh.client` |
| `packages/client/store/src/contract.ts` | 框架中性合同：snapshot / handle / baked actions / `PropsStore` |
| `packages/client/store/src/index.ts` | 引擎实现：`createSnapshotStore`、`defineStore`、persist、raf |
| `packages/client/store/src/invariant.ts` | Cordis companion；空 installer |
| `packages/client/store/tests/store.client.spec.ts` | sync/raf、primitive persist、scope 后缀、`clearPersisted` |
| `packages/client/ui-slots/src/store.ts` | 座位核再导出合同类型 |
| `packages/client/ui-renderer/src/client/scoped-slots.tsx` | 把 instance 绑成 `kit.useStore` + `kit.actions` |
| `packages/client/ui-renderer/src/client/registry.ts` | 每 handle × scope key 缓存一份 instance；scope 死时 `clearPersisted` |

## 数据模型

| 符号 | 要点 |
|---|---|
| `ObservableSnapshot<T>` | `getSnapshot()` + `subscribe(fn) → unsubscribe`。[E: packages/client/store/src/contract.ts:4] |
| `SnapshotStore<T>` | 合同 snapshot 加上 `update(draft mutator)` / `set(next)`。这是**裸数据面**；React hook 不骑在上面。[E: packages/client/store/src/index.ts:27] |
| `ActionsDecl<T>` | 完整写集：每个 action 是 `(draft, ...params) => void`。组件只能走 baked 回调，不能 `set`。[E: packages/client/store/src/contract.ts:40] |
| `StoreSpec<T,A>` | `init: () => T`（每实例新状态）、可选 `persist?: string`、`actions`。[E: packages/client/store/src/contract.ts:56] |
| `StoreHandle` | spec + `create(scopeKey?)`。handle 身份是实例共享键。禁止模块级 export handle（reload 会伪装成单例）。[E: packages/client/store/src/contract.ts:94] |
| `StoreInstance` | `actions` + `getSnapshot` + `subscribe` + `clearPersisted`。**没有** `useStore`。[E: packages/client/store/src/contract.ts:70] |
| `EngineStoreInstance` | 合同 instance 加上 `readonly store: SnapshotStore<T>`（框架/测试 API）。[E: packages/client/store/src/index.ts:177] |
| `StoreDecl` | 共享 handle **或** exclusive `StoreFactory`（每 entry × scope 调一次工厂）。[E: packages/client/store/src/contract.ts:118] |
| `PropsStore<H>` | 组件看见的份额：`{ useStore, actions }`。组件永远不拿 instance。[E: packages/client/store/src/contract.ts:135] |
| `DefineStore` | 合同类型；实现是旁边的 `defineStore` 函数。[E: packages/client/store/src/contract.ts:144] |

依赖：`zustand ~4.4.7`、`immer ^10.1.1`；`cordis` 是 peer（invariant companion 用）。[E: packages/client/store/package.json:30] [E: packages/client/store/package.json:31]

## 控制流

1. **`createSnapshotStore(init, opts?)` 建裸引擎。** 默认 flush `'sync'`（未设 `opts.flush` 时不包 `rafBatch`）；`opts.flush === 'raf'` 才批刷。[E: packages/client/store/src/index.ts:103] [E: packages/client/store/src/index.ts:114] zustand `createStore` + `subscribeWithSelector`；`update` 走 immer `produce(..., true)` 整值替换，避免 scalar/array root 被 partial-merge 打散。[E: packages/client/store/src/index.ts:107] [E: packages/client/store/src/index.ts:130]

2. **`raf` 批刷。** `rafBatch` 有 `requestAnimationFrame` 用它，否则 `queueMicrotask`。一帧 N 次 `update` → 一次通知。[E: packages/client/store/src/index.ts:72] [E: packages/client/store/src/index.ts:77] 已知 skew（JSDoc）：中途 mount 的组件读到新状态，已有 subscriber 要等下一次 flush；实现上 `api.subscribe(flush)` 把通知推迟到 raf/microtask。[E: packages/client/store/src/index.ts:116]

3. **`notifySubscribers` 拷贝 listener 再派发。** 单个回调抛错 `console.error` 后继续，标签 `label`（引擎路径是 `'[client-store]'`）。[E: packages/client/store/src/index.ts:46] conversation 等非 store 观察者也进口这个函数。

4. **persist 是手写 `localStorage` JSON，不是 zustand persist middleware。** `attachPersistence` 整值 `getItem`/`setItem` JSON。[E: packages/client/store/src/index.ts:146] `typeof localStorage === 'undefined'` 则静默关掉（node e2e 跑 client 树）。[E: packages/client/store/src/index.ts:150] 读失败 / 写失败只 `console.error`，不拆 store。[E: packages/client/store/src/index.ts:157] [E: packages/client/store/src/index.ts:163]

5. **`set()` 在非 production 走 immer `freeze(value, true)`。** `update` 的 produce 在 dev 也会冻；production 不深冻。[E: packages/client/store/src/index.ts:169] [E: packages/client/store/src/index.ts:171]

6. **`defineStore(spec)` 返回 `EngineStoreHandle`。** `create(scopeKey?)`：有 `persist` 时，无 scope → 原 key，有 scope → `` `${persist}.${scopeKey}` ``。[E: packages/client/store/src/index.ts:217] [E: packages/client/store/src/index.ts:222] 每个 action 闭包到 `store.update`。[E: packages/client/store/src/index.ts:231] `create()` **不**去重：每次 `createSnapshotStore` 新实例；同 persist key 的多个 live instance 会交叉污染同一 `localStorage` 条目；生产安全靠 ui-renderer 每 handle × scope 缓存一份。[E: packages/client/store/src/index.ts:225]

7. **`clearPersisted`。** 无 persist 或无 `localStorage` 是 no-op；`removeItem` 失败吞掉。[E: packages/client/store/src/index.ts:238]

8. **座位系统消费。** `SlotRegistry.resolveStore`：root 调 `handle.create()`，session 调 `handle.create(key)` 并缓存。[E: packages/client/ui-renderer/src/client/registry.ts:545] scope 死亡：`clearStoreScope` 对非 root instance `clearPersisted` 再删 map。[E: packages/client/ui-renderer/src/client/registry.ts:556] 装配把 instance 当成 snapshot 源：`kit['useStore'] = observableHook(store)`，`kit['actions'] = store.actions`。[E: packages/client/ui-renderer/src/client/scoped-slots.tsx:449]

9. **直接引擎消费者。** 部分 `ui-*` 与 session-log-export 跳过座位 store 座，直接 `createSnapshotStore` / `defineStore`（例如 `ui-user-questions` 的 draft handle、`ui-settings-models`、`ui-deliverables`）。它们仍是本引擎的 Consumer，不经过 `ctx.slots`。

10. **组合。** `PROFILE_TEMPLATES.web` 叠 `dsh-base` + `dsh-web-app`。[E: packages/boot/app-boot/src/profile.ts:143] store **没有** patch `id:`。headless / sdk / sdk-minimal / acp 不跑浏览器座位树，因此生产路径不物化这些 instance（测试仍可在 node 里 new 引擎）。

## 设计动机

- **引擎与 React 切开。** 换渲染器不必重写 persist / immer / flush。hook 是 ui-renderer 的唯一 uSES 桥，按 instance 缓存。
- **写集是审计面。** 组件没有 `set`/`update`；所有副作用必须是声明过的 action。
- **手写 persist。** 保护 string 等 primitive 根；storage 失败不得拆 live store。
- **handle 身份，不是模块单例。** `create()` 每次新 instance；共享由框架按 handle 引用缓存。
- **空 invariant。** 没有进程全局可变表可声明；每个 instance 由拥有者测试覆盖。

## Gotcha

- 没有 `packages/client/runtime`。wiki 别名仍是 [`subsys.client.runtime`](runtime.md)；引擎细节以本页为准。
- 没有 `ctx.store`，也没有 Loader `id: store`。
- `defineStore` 默认 flush 是 `sync`。`createSnapshotStore` 的 `'raf'` 是裸引擎选项；`defineStore` 当前**不**把 flush 暴露进 spec。
- 同 persist key 多 `create()` 会交叉写 `localStorage`。测试要隔离就换 scope key 或不要 persist。[E: packages/client/store/src/index.ts:225]
- `clearPersisted` 只删 key，不把内存 state 拨回 `init`。
- `shallowEqual` 是 zustand/shallow 的再导出，给 hook 消费者免 zustand 依赖。[E: packages/client/store/src/index.ts:67]
- opaque class 实例：`set` 冻信封但不遍历 class 字段；`Set` 等仍会被冻（测试合同）。
- 不要把本包和 host [`subsys.persistence.storage`](../persistence/storage.md) 的 `Storage` / sqlite 混成一条缝：那是进程内 domain KV，不是浏览器 `localStorage` snapshot。

## Seam 三角

本包是 **库缝**，不是 `ctx.*` 服务。换引擎实现会带走所有 `defineStore` / `createSnapshotStore` 调用方；合同类型可以留在 `contract.ts`。

| 缝 | Definition | Provider | Consumer | `dsh-base` | `dsh-web-app` | `dsh-headless` |
|---|---|---|---|---|---|---|
| snapshot 引擎 | `ObservableSnapshot` / `StoreSpec` / `StoreHandle` / `StoreInstance` | `createSnapshotStore` + `defineStore` @ `dsh-client-store` | ui-renderer `resolveStore`；各 `ui-*` `defineStore` / 裸 `createSnapshotStore`；session-log-export | 无 Loader 行 | 浏览器树间接用 | 无浏览器树 |
| 座位 store 座 | `StoreDecl` / `PropsStore`（ui-slots 再导出） | **browser** `SlotRegistry` 缓存 `handle.create` | `kit.useStore` / `kit.actions` | 无 | 有（经 ui-renderer） | 无 |
| `useStore` hook | `SnapshotSelectorHook` 合同 | **browser** ui-renderer `observableHook` | 座位组件 | 无 | 有 | 无 |
| persist 键 | `StoreSpec.persist` + `scopeKey` 后缀 | `defineStore.create` | `clearStoreScope` 在 session 死时 `clearPersisted` | 无 | 有 | 无 |
| invariant companion | `ctx.invariants.register('@deepseek-ai/dsh-client-store')` | `client-store-invariant` 空 installer | 测试 `ctx.plugin(StoreInvariant)` | 随 invariants 组合 | 随 | 随 |

## Sources

- packages/client/store/package.json
- packages/client/store/src/index.ts
- packages/client/store/src/contract.ts
- packages/client/store/src/invariant.ts
- packages/client/store/tests/store.client.spec.ts
- packages/client/store/tests/invariant.client.spec.ts
- packages/client/ui-slots/src/store.ts
- packages/client/ui-renderer/src/client/scoped-slots.tsx
- packages/client/ui-renderer/src/client/registry.ts
- packages/client/ui-user-questions/src/client/draft-store.ts
- packages/boot/app-boot/src/profile.ts

## 相关

- [`subsys.client.runtime`](runtime.md) — 稳定别名：对象层总览；Session/Workspace 客户端与 `ctx.slots` 不在本页展开
- [`subsys.client.ui-slots`](ui-slots.md) — `SlotCore` / `register`；store 类型再导出
- [`subsys.client.web`](web.md) — `AppWebEntry` mount
- [`subsys.client.modules`](modules.md) — `__DSH_BOOT__` 图；store 不是 client 包 roster 行
- [`spine.trace-web-first-prompt`](../../spine/trace-web-first-prompt.md) — 第一条 prompt 的宿主路径
- [`surface.profiles.web`](../../surface/profiles/web.md) — live Web profile
- [`subsys.composition.bundle-web-app`](../composition/bundle-web-app.md) — 插入 ui-renderer，不插入 store
