---
id: subsys.vendor.cordis
title: vendored Cordis
kind: subsystem
tier: T2
pkg: vendor
source:
  - vendor/cordis/src/index.ts
  - vendor/cordis/src/context.ts
  - vendor/cordis/src/events.ts
  - vendor/cordis/src/fiber.ts
  - vendor/README.md
  - vendor/cordis/src/service.ts
  - vendor/cordis/src/registry.ts
  - vendor/cordis/src/reflect.ts
  - vendor/cordis/package.json
  - packages/fs/fs/tests/service.spec.ts
  - packages/fs/fs/src/index.ts
symbols:
  - Context
  - Fiber
  - Service
  - EventsService
related:
  - spine.overview
  - spine.capability-seams
  - spine.composition-boot
  - subsys.vendor.loader
  - subsys.composition.bundle-base
evidence: explicit
status: verified
updated: 47f943859b
---

> `@deepseek-ai/cordis` 是 **vendored** 组合运行时（`vendor/cordis/`），npm 名写在该包 `package.json`，不是 `packages/` 里的 DSH 包。`Context` 是 `Proxy`：`provide` / `inject` / `plugin` / `on` / `emit` / `waterfall` 都是 mixin 到 `ctx` 上的方法。`Service` 构造调用 `ctx.reflect.provide`；注册是可逆 effect，fiber unload 后该键变 `undefined`。`waterfall` 必须调用传入的 `next()`，否则链停在本层（含内置 `inner`）。

## 能回答的问题

- `@deepseek-ai/cordis` 是 DSH 自己在 `packages/` 里实现的插件框架，还是 `vendor/cordis/` 里的 vendored 运行时？和 `@deepseek-ai/cordis-plugin-loader` 谁拥有谁？
- `new Context()` 为什么返回 proxy？`ctx.provide` / `ctx.plugin` / `ctx.on` / `ctx.waterfall` 分别 mixin 自哪个内置 service？
- `Service` 构造怎样把实例挂上 `ctx.<name>`？同一 realm 再挂一个同名 service 会抛什么？fiber `dispose` 之后该键为什么是 `undefined`？
- `EventsService.waterfall` 的 `next = () => { const cb = cbs.shift() ?? inner; return cb(...args) }` 不调用会停在哪一层？
- `ctx.effect` / `ctx.on` / `EventsService.register` 怎样随 fiber 撤回？已 dispose 的 fiber 再挂 effect 会怎样？
- `Context.isolate()` 和 loader 的 `isolate.fs: true` / `!!js` interpolate / entry 树是不是同一层？

## 职责边界

本包 `@deepseek-ai/cordis`（`vendor/cordis/`，`version` `4.0.1`）拥有组合运行时内核：`Context` proxy、`Fiber` 生命周期、`Service` 基类、`ReflectService`（`provide` / `get` / `set` / accessor / mixin）、`RegistryService`（`plugin` / `inject`）、`EventsService`（`on` / `emit` / `waterfall` 等五种 dispatch）。[E: vendor/cordis/package.json:2] [E: vendor/cordis/package.json:4] 入口 `vendor/cordis/src/index.ts` 再导出这些模块。[E: vendor/cordis/src/index.ts:2] [E: vendor/cordis/src/index.ts:6] [E: vendor/cordis/src/index.ts:10] [E: vendor/cordis/src/index.ts:12]

它**不**拥有：

- entry 树、group、`isolate.fs: true` 这类 YAML realm、`!!js` interpolate、按 specifier import 插件 — [`subsys.vendor.loader`](loader.md)（`subsys.vendor.loader`）。Loader 是可选 peer `@deepseek-ai/cordis-plugin-loader`，不是本包源码。[E: vendor/cordis/package.json:37] [E: vendor/cordis/package.json:44]
- profile 发现、bundle / 用户 patch 叠层 — [`spine.composition-boot`](../../spine/composition-boot.md)（`spine.composition-boot`）/ [`subsys.composition.bundle-base`](../composition/bundle-base.md)（`subsys.composition.bundle-base`）。`dsh-base` 是坐在本运行时上的第一层 host insert，不是 Cordis 内核。
- 某一条 DSH capability 的 `ctx.fs` / `ctx.shell` 合同。那些包 `extends Service` 并 `super(ctx, '<name>')`，本页只核这条登记原语。

**host 面 vs agent-preset 面。** `Context` 是进程里那一份运行时。host 面（webserver / persistence / sandbox）和 agent-preset 面（tools / persona / isolate 行）都是挂在同一棵 fiber 树上的插件；切面由 composition 写，不由本包划分。默认产品路径是 `dsh web`；本仓没有 shipped TUI。

**`Context.isolate` 是内核原语，不是 loader 配置。** `isolate(name, label?)` 给子 context 换一套该 `name` 的 isolation label。[E: vendor/cordis/src/context.ts:121] [E: vendor/cordis/src/context.ts:123] preset 防泄漏用的 `isolate.fs: true` 行、以及 `!!js` 插值，属于 Loader。不要把那些写成 `Context` 核心。

## 关键文件

| 路径 | 角色 |
|---|---|
| `vendor/cordis/package.json` | npm 名 `@deepseek-ai/cordis`；可选 peer 才是 loader / include |
| `vendor/cordis/src/index.ts` | 包入口：re-export context / events / fiber / registry / service |
| `vendor/cordis/src/context.ts` | `Context` 类：根构造返回 `Proxy`；`extend` / `isolate` / `intercept` |
| `vendor/cordis/src/reflect.ts` | `ReflectService`：proxy handler、`provide` / `get` / `set`、把方法 mixin 到 `ctx` |
| `vendor/cordis/src/service.ts` | `Service`：构造里 `ctx.reflect.provide(name, self)` |
| `vendor/cordis/src/registry.ts` | `RegistryService.plugin` / `inject`；按 callback 键共享 `Plugin.Runtime` |
| `vendor/cordis/src/fiber.ts` | `Fiber` / `FiberState` / `ctx.effect`；unload 跑 disposer；`internal/update` waterfall |
| `vendor/cordis/src/events.ts` | `EventsService`：五种 dispatch；`register` 把 listener 存成 fiber effect |
| `packages/fs/fs/src/index.ts` | DSH Consumer 例：`FileSystem extends Service` + `super(ctx, 'fs')` |
| `packages/fs/fs/tests/service.spec.ts` | 同名再挂抛错；fiber dispose 后 `ctx.fs === undefined` |
| `vendor/README.md` | vendored 清单与本地改动日志；只进 Sources，不当 `[E]` |

## 数据模型

| 符号 | 要点 |
|---|---|
| `Context` | 根构造把 `this` 包成 `new Proxy(this, ReflectService.handler)` 并 `return self`。四个内置 service 是 own property：`reflect` / `registry` / `events` / `logger`。[E: vendor/cordis/src/context.ts:74] [E: vendor/cordis/src/context.ts:78] [E: vendor/cordis/src/context.ts:79] [E: vendor/cordis/src/context.ts:80] [E: vendor/cordis/src/context.ts:81] [E: vendor/cordis/src/context.ts:83] |
| mixin 面 | `ctx.get` / `set` / `provide` ← `reflect`；`ctx.effect` ← `fiber`；`ctx.inject` / `plugin` ← `registry`；`ctx.on` / `once` / `parallel` / `emit` / `serial` / `bail` / `waterfall` ← `events`。[E: vendor/cordis/src/reflect.ts:219] [E: vendor/cordis/src/reflect.ts:220] [E: vendor/cordis/src/reflect.ts:221] [E: vendor/cordis/src/reflect.ts:222] |
| `Fiber` | 一次 `ctx.plugin()` 的运行实例。根 fiber 由 `new Fiber(…, null, …)` 建成（`runtime === null`），`uid === 0`、`state === ACTIVE`，`dispose` 等于 `restart()`，不是拆掉内置 service。[E: vendor/cordis/src/context.ts:77] [E: vendor/cordis/src/fiber.ts:321] [E: vendor/cordis/src/fiber.ts:323] [E: vendor/cordis/src/fiber.ts:331] |
| `FiberState` | `PENDING` 等 inject；`LOADING` 在跑插件体；`ACTIVE` 已提供；`FAILED` 启动/配置抛错；`UNLOADING` 在跑 disposer；`DISPOSED` 的 `uid === null`，不能再挂 effect。[E: vendor/cordis/src/fiber.ts:147] [E: vendor/cordis/src/fiber.ts:353] |
| `Service` | 抽象基类。构造 `self.ctx.reflect.provide(name, self, this[Service.check])`，把自身登记为 `ctx[name]`。[E: vendor/cordis/src/service.ts:57] |
| `Impl` | `reflect.store` 里一条：`name` + 提供它的 `fiber` + `value` + 可选 `check`。键是 isolation `symbol`，不是裸字符串。[E: vendor/cordis/src/reflect.ts:286] [E: vendor/cordis/src/reflect.ts:288] |
| `EventsService` | `ctx.events`。`DispatchMode`：`emit` / `parallel` / `serial` / `bail` / `waterfall`。[E: vendor/cordis/src/events.ts:32] |
| `Hook` | `{ ctx, callback, prepend?, global? }`。`register` 用 `fiber.effect` 推进 `_hooks[name]`，disposer 调 `unregister`。[E: vendor/cordis/src/events.ts:256] [E: vendor/cordis/src/events.ts:258] |
| `Plugin` | 函数 `(ctx, config)`、class `new (ctx, config)`、或 `{ apply }`。registry 身份是 `resolve()` 得到的 callback。[E: vendor/cordis/src/registry.ts:222] [E: vendor/cordis/src/registry.ts:226] |
| 内置 waterfall | `internal/config`（激活前改 raw config）、`internal/update`（`Fiber.update` 的重启门）、`internal/get` / `internal/set`（proxy 读写）。listener 不 `next()` 就停。[E: vendor/cordis/src/fiber.ts:642] [E: vendor/cordis/src/fiber.ts:748] [E: vendor/cordis/src/reflect.ts:153] |

## 控制流

1. `new Context()`@vendor/cordis/src/context.ts 建 isolate / intercept 空表，把实例换成 `Proxy`，再 `new Fiber(self, {}, …, null, …)` 得到根 fiber，然后依次 `new ReflectService` / `RegistryService` / `EventsService` / `LoggerService`，最后 `fiber._disposables.clear()` 并返回 proxy。[E: vendor/cordis/src/context.ts:74] [E: vendor/cordis/src/context.ts:77] [E: vendor/cordis/src/context.ts:78] [E: vendor/cordis/src/context.ts:82] [E: vendor/cordis/src/context.ts:83] 四个 service 是 own property，proxy `get` 先 `Reflect.has` 命中，不走 inject 门。[E: vendor/cordis/src/reflect.ts:140]

2. `ReflectService` 构造立刻 mixin：于是 `ctx.provide` / `ctx.plugin` / `ctx.on` / `ctx.waterfall` / `ctx.effect` 都落在根 context 上。[E: vendor/cordis/src/reflect.ts:219] [E: vendor/cordis/src/reflect.ts:222]

3. `RegistryService.plugin@vendor/cordis/src/registry.ts` 把插件收成 callback（函数本身，或 `{ apply }` 的 `apply`），`assertActive`，按 callback 复用 `Plugin.Runtime`，再 `new Fiber(parent, config, Inject.resolve(plugin.inject), runtime, …)`。[E: vendor/cordis/src/registry.ts:318] [E: vendor/cordis/src/registry.ts:320] [E: vendor/cordis/src/registry.ts:330] 返回值是 `Fiber & PromiseLike<Fiber>`：`then` 接到 `fiber.await()`。[E: vendor/cordis/src/registry.ts:333] `ctx.inject(deps, cb)` 只是 `plugin({ inject, apply: cb })`。[E: vendor/cordis/src/registry.ts:301]

4. 非根 `Fiber` 构造：`parent.extend({ fiber: this })` 得到子 context；`dispose` 登记为 **父** fiber 的 `effect`。[E: vendor/cordis/src/fiber.ts:236] [E: vendor/cordis/src/fiber.ts:265] 然后 `emit('internal/plugin')`。`inject` 里每一个名字先 `_checkImpl`，再 `_refresh`。[E: vendor/cordis/src/fiber.ts:302] [E: vendor/cordis/src/fiber.ts:316] [E: vendor/cordis/src/fiber.ts:318]

5. `_refresh@vendor/cordis/src/fiber.ts`：任一 required service 在 `_store` 里缺席，就把 epoch 设成 `INACTIVE`，fiber 停在 `PENDING`，**不**跑插件体。[E: vendor/cordis/src/fiber.ts:614] [E: vendor/cordis/src/fiber.ts:617] 齐了才 `_reload`：`_resolveConfig`（先 `waterfall('internal/config')`）再执行 callback。class 插件 `new callback(ctx, config)`；函数 / `apply` 则直接调用。[E: vendor/cordis/src/fiber.ts:642] [E: vendor/cordis/src/fiber.ts:253] [E: vendor/cordis/src/fiber.ts:259]

6. `Service` 构造@vendor/cordis/src/service.ts 在 class 插件的 `new` 里跑：`self.ctx.reflect.provide(name, self, this[symbols.check])`。[E: vendor/cordis/src/service.ts:57] DSH 的 `FileSystem` 只做 `super(ctx, 'fs')`，于是 `ctx.fs` 指向该实例。[E: packages/fs/fs/src/index.ts:86] [E: packages/fs/fs/src/index.ts:88]

7. `ReflectService.provide@vendor/cordis/src/reflect.ts` **整段包在 `ctx.fiber.effect` 里**。[E: vendor/cordis/src/reflect.ts:278] 同 isolation key 已有 `Impl` 则抛 `service "<name>" has been registered at <fiber.name>`。[E: vendor/cordis/src/reflect.ts:290] 否则写入 `store[key]`。effect 的 disposer 先 `delete this.store[key]`，再 `notify([name])` 让 inject 了该名的 fiber 重算。[E: vendor/cordis/src/reflect.ts:298] [E: vendor/cordis/src/reflect.ts:299] fs 测试：同一 root 再 `ctx.plugin(FakeFileSystem)` reject；`fiber.dispose()` 之后 `ctx.fs` 是 `undefined`。[E: packages/fs/fs/tests/service.spec.ts:100] [E: packages/fs/fs/tests/service.spec.ts:107] [E: packages/fs/fs/tests/service.spec.ts:108]

8. 根 context 读 `ctx.fs`：根 fiber 的 `runtime` 为 `null`，proxy `get` 走 `ctx.reflect.get(prop, false)`，不再要求 inject。[E: vendor/cordis/src/reflect.ts:152] 有 runtime 的子 context 则 `waterfall('internal/get', …, inner)`，`inner` 沿 fiber 链查 `store[prop]`；声明了 inject 但当前 inactive 会改报错文案。[E: vendor/cordis/src/reflect.ts:153] [E: vendor/cordis/src/reflect.ts:157] [E: vendor/cordis/src/reflect.ts:160]

9. **waterfall 必须 `next()`。** `EventsService.waterfall@vendor/cordis/src/events.ts` 先 `dispatch` 得到 listener 数组，把最后一个参数弹出当 `inner`，再压进去一个 `next`：[E: vendor/cordis/src/events.ts:235] [E: vendor/cordis/src/events.ts:236]

   ```ts
   const next = () => {
     const cb = cbs.shift() ?? inner
     return cb(...args)
   }
   ```

   [E: vendor/cordis/src/events.ts:237] [E: vendor/cordis/src/events.ts:238] [E: vendor/cordis/src/events.ts:239] 第一次 `return next()` 取出**第一个** listener。该 listener 若不调用传入的 `next()`，`cbs.shift()` 不再发生，后续 listener 与 `inner` 都不跑。[E: vendor/cordis/src/events.ts:242] 这不是「listener 数量上限」，是「不 `next()` 就否决余下整条链」。`emit` 则同步 `map` 调用、**不等待**返回的 promise。[E: vendor/cordis/src/events.ts:195]

10. `Fiber.update@vendor/cordis/src/fiber.ts` 在 ACTIVE 时走 `waterfall(this, 'internal/update', config, noSave, () => this.restart())`。[E: vendor/cordis/src/fiber.ts:748] [E: vendor/cordis/src/fiber.ts:751] 不 `next()` 则默认 `restart` 不发生。`EventsService` 还用 `{ global: true, prepend: true }` 挂了一层 `internal/update`：把该 fiber `_hooks['internal/update']` 编进同一套 `shift() ?? next`。[E: vendor/cordis/src/events.ts:148] [E: vendor/cordis/src/events.ts:151] [E: vendor/cordis/src/events.ts:155] 非 global 的 `ctx.on('internal/update', …)` 被 `internal/listener` bail 进 `_hooks`，不进全局 `_hooks` 表。[E: vendor/cordis/src/events.ts:141] [E: vendor/cordis/src/events.ts:144] [E: vendor/cordis/src/events.ts:296]

11. **`ctx.on` / `EventsService.register` 是可逆 effect。** `on` 先 `fiber.assertActive()`，再 `register`：`fiber.effect(() => { hooks[method](…); return () => this.unregister(hooks, callback) })`。[E: vendor/cordis/src/events.ts:294] [E: vendor/cordis/src/events.ts:301] [E: vendor/cordis/src/events.ts:256] [E: vendor/cordis/src/events.ts:258] `ctx.effect` 本身也是 mixin 到 fiber 的：`assertActive()`，`UNLOADING` 时抛 `INACTIVE_EFFECT`；disposer 按登记**逆序**跑。[E: vendor/cordis/src/fiber.ts:419] [E: vendor/cordis/src/fiber.ts:421] [E: vendor/cordis/src/fiber.ts:431] `uid === null` 的 fiber 再挂 effect 同样抛 `INACTIVE_EFFECT`。[E: vendor/cordis/src/fiber.ts:353]

12. fiber unload：`_unload` 取出 `_disposables` 并 `runDisposable`，然后 `this.store = undefined`。[E: vendor/cordis/src/fiber.ts:676] [E: vendor/cordis/src/fiber.ts:687] 插件 fiber 的父级 effect disposer 还会把 `uid` 置 `null` 并 `emit('internal/plugin')`。[E: vendor/cordis/src/fiber.ts:268] provide / on / 用户 `ctx.effect` 都在这批 disposer 里，所以卸插件 = 撤回该 fiber 的全部登记。

## 设计动机

DSH 把 Cordis **vendor 进仓库**（`vendor/cordis/`），是为了钉死、可审计、可打本地补丁，而不是再实现一套「DSH 插件框架」然后对外叫别的名字。npm 名是 `@deepseek-ai/cordis`；entry 树与 `!!js` 另包，避免内核和 loader 绑死。[I]

**登记做成 effect**，是为了让 `dispose` / 依赖消失 / HMR 重启走同一条撤回路径：`provide` 删 `store[key]`，`on` 从 hook 数组摘掉，用户 `ctx.effect` 逆序跑自己的 disposer。测试用 `ctx.fs` 从有值变成 `undefined` 钉死这条语义，而不是留下一个僵尸对象。

**waterfall 必须 `next()`**，是为了让中间件能否决。DSH 的 `fs/write-intent`「单槽」政策（第一个不 `next()` 的 listener 吃掉 tool 传入的 `inner`）就是这条原语，不是再发明一套事件总线。`Fiber.update` 的 `internal/update` 同样：不 `next()` 等于否决默认 `restart`。

**proxy + inject** 让子插件不能随手读未声明的 service（会抛 `cannot get property … without inject`）。根 context 与 `ctx.get` 是显式出口。`PENDING` 而不是立刻失败，是为了让 provider 晚到时 fiber 自己 `_refresh` 再加载。

**`Context.isolate`** 把「同名不同 realm」做成子 context 上的 label，而不是第二套 service 表。YAML 里怎么写 isolate 行是 Loader / preset 的事。

相对「硬编码 host 单例」：换掉一个 `Service` 子类（测试里的 `FakeFileSystem`，产品里的 `fs-sandbox`）不必改 Consumer 的 `ctx.fs` 读取。相对把 loader 写进内核：本包只认 `ctx.plugin(callback)`；从磁盘读 `cordis.yml` 不是它的工作。

## Gotcha

- **不调用 `next()`，链停在本层。** `cbs.shift() ?? inner` 只在 `next()` 被调用时前进。漏掉一次，后面的 listener 和内置 `inner`（`Fiber.update` 的 `restart`、`internal/get` 的 store 查找、tool 传入的默认 intent）全部不跑。
- **同一 realm 同名 service 会抛。** 报错来自 `reflect.provide`，文案带已有 fiber 的 `name`。再挂一份必须先 `isolate(name)`（或等原 fiber dispose）。[E: vendor/cordis/src/reflect.ts:290]
- **dispose 之后键是 `undefined`，不是旧实例。** disposer 删的是 `store[key]`；根上的 `ctx.fs` 读 `reflect.get`。
- **`INACTIVE_EFFECT`。** `uid === null` 或 `state === UNLOADING` 时 `ctx.effect` / `ctx.on` / `ctx.plugin` 都会拒。不要在 unload 回调里再登记期望活过这次卸载的 effect。[E: vendor/cordis/src/fiber.ts:353] [E: vendor/cordis/src/fiber.ts:421]
- **没有 inject 就读 `ctx.<service>` 会抛**（子 fiber）。要用 `ctx.get(name)`，或把名字写进插件 `inject`。
- **根 `fiber.dispose` 不是拆运行时。** 它等于 `restart()`。内置 `reflect` / `events` 不是靠 `provide` 挂上的 own property。
- **Loader 的东西不要当成内核。** `!!js` interpolate、`isolate.fs: true`、entry group、按包名 import，都在 `@deepseek-ai/cordis-plugin-loader`。本包的 `internal/config` 只是给那种 listener 用的 waterfall 钩子。
- **「单槽」不是 hook 数组长度 1。** 先注册且不 `next()` 的那个拥有决定；`prepend: true` 会排到更外层。
- **`emit` 不等待。** listener 返回的 promise 被丢掉；要汇合用 `parallel`，要可否决用 `waterfall` / `serial` / `bail`。
- **插件身份是 callback。** 两个 `{ apply }` 对象若共享同一个 `apply` 函数，会进同一条 `Plugin.Runtime`。

## Seam 三角

| 角色 | 落点 | ctx 键 / 组合位置 |
|---|---|---|
| **Definition** | 本包的 `Context` / `Fiber` / `Service` / `EventsService` | 运行时 API：`provide` · `inject` · `plugin` · `on` · `emit` · `waterfall` · `effect`。**不是**某条 DSH `ctx.fs` 合同 |
| **Provider（本页）** | `@deepseek-ai/cordis`（`vendor/cordis/`） | 根构造安装 `ctx.reflect` / `ctx.registry` / `ctx.events` / `ctx.logger`。无 Loader `id:` 行——它是进程里先于 entry 树的内核 |
| **Consumer（DSH service）** | 例如 `@deepseek-ai/dsh-fs` 的 `FileSystem` | `extends Service` + `super(ctx, 'fs')`。同一 realm 第二份会抛；dispose 后 `ctx.fs === undefined` |
| **Consumer（组合）** | [`subsys.vendor.loader`](loader.md) + [`subsys.composition.bundle-base`](../composition/bundle-base.md) | Loader 在这棵 `Context` 上长 entry 树；`dsh-base` 的 `cordis.patch.yml` 是第一层 host insert。isolate YAML / `!!js` 不在本页 |
| **Consumer（事件）** | 任何 `ctx.on` / `ctx.waterfall` 调用方 | listener 必须在 waterfall 上调用传入的 `next()`。`ctx.on` 随所在 fiber 撤回 |

换执行世界 = 换某个 `Service` 子类的 Provider 插件，不是 fork 一份 Cordis。同名再 `provide` 必须先 isolate 或先 dispose。

## Sources

- vendor/cordis/src/index.ts
- vendor/cordis/src/context.ts
- vendor/cordis/src/events.ts
- vendor/cordis/src/fiber.ts
- vendor/README.md
- vendor/cordis/src/service.ts
- vendor/cordis/src/registry.ts
- vendor/cordis/src/reflect.ts
- vendor/cordis/package.json
- packages/fs/fs/tests/service.spec.ts
- packages/fs/fs/src/index.ts

## 相关

- [spine.overview](../../spine/overview.md)（`spine.overview`）：DSH 是 Cordis 组合运行时（`profile → bundle → agent preset`），不是内置一堆工具的 coding agent。
- [spine.capability-seams](../../spine/capability-seams.md)（`spine.capability-seams`）：Definition / Provider / Consumer 三角怎样挂上 `ctx.*`；本页是那条三角底下的登记原语。
- [spine.composition-boot](../../spine/composition-boot.md)（`spine.composition-boot`）：空 Loader 根如何叠成 profile / bundle / preset；本页不拥有发现与叠层。
- [subsys.vendor.loader](loader.md)（`subsys.vendor.loader`）：entry 树、group、isolate realm、`!!js` interpolate。
- [subsys.composition.bundle-base](../composition/bundle-base.md)（`subsys.composition.bundle-base`）：坐在本运行时上的第一层 host insert（`dsh-base`）。
