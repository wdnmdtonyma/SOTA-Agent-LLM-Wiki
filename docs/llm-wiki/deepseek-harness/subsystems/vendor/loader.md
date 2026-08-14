---
id: subsys.vendor.loader
title: cordis plugin loader
kind: subsystem
tier: T2
pkg: vendor
source:
  - vendor/loader/src/index.ts
  - vendor/loader/src/config/entry.ts
  - vendor/loader/src/config/group.ts
  - vendor/loader/src/config/isolate.ts
  - vendor/loader/src/config/tree.ts
  - vendor/loader/src/config/utils.ts
  - vendor/loader/package.json
  - vendor/README.md
  - vendor/include/src/index.ts
  - vendor/cordis/src/events.ts
  - vendor/cordis/src/fiber.ts
  - vendor/cordis/src/reflect.ts
  - packages/boot/app-boot/src/index.ts
  - packages/boot/app-boot/tests/user-patches.spec.ts
  - packages/bundle/base/cordis.patch.yml
  - apps/cli/config/agent-presets/minimal/agent.cordis.yml
  - apps/cli/tests/windows-shell.spec.ts
symbols:
  - Loader
  - Entry
  - EntryGroup
  - EntryTree
  - interpolate
related:
  - spine.overview
  - spine.composition-boot
  - subsys.vendor.cordis
  - subsys.composition.app-boot
  - subsys.composition.bundle-base
  - subsys.composition.agent-presets
evidence: explicit
status: verified
updated: 47f943859b
---

> `@deepseek-ai/cordis-plugin-loader` 是 **vendored** Cordis 插件加载器（`vendor/loader/`，npm 名见 package.json），不是 `packages/` 里的 DSH 包，也不是 profile 发现器。[E: vendor/loader/package.json:2] `Loader extends EntryTree`，构造时 `ctx.reflect.provide('loader', this)`；它拥有 entry 树、group、isolate realm、`!!js` interpolate 与按 specifier import 插件。[E: vendor/loader/src/index.ts:65] [E: vendor/loader/src/index.ts:90] profile / bundle 叠层是 Consumer [`subsys.composition.app-boot`](../composition/app-boot.md)，本页只写 loader 机制。

## 能回答的问题

- `ctx.loader` 是谁 `provide` 的？`Loader` 和 `EntryTree` / `Include` 谁负责落盘？
- YAML `!!js` 在哪家包被建成 `{ __jsExpr }`，又在哪条 waterfall 上被 `interpolate`？Group / Include 为什么整份 config 保持字面量？
- `internal/update` 上 Loader 的几个 listener 为什么必须 `next()`？不调用会停掉谁的 HMR / reload / persist？
- `isolate: { fs: true }` 怎样把 service 放进独立 realm？`true` 和字符串 label 差在哪？preset 漏写 isolate 在哪一页被拒？
- `unwrapExports` 为什么会剥掉 `export default` 上的 `name` / `inject`？`cordis:group` 这个 specifier 从哪张表解析？

## 职责边界

本包拥有 **entry 运行时**：`Entry` / `EntryGroup` / `EntryTree` / `Loader`、`evaluate` / `interpolate` / `isJsExpr`、isolate 插件（`LocalRealm` / `GlobalRealm`）、以及 `unwrapExports` + `EntryTree.import`。[E: vendor/loader/src/config/entry.ts:52] [E: vendor/loader/src/config/utils.ts:12] [E: vendor/loader/src/config/isolate.ts:71] 注册是可逆 effect：`provide('loader', this)` 跟 fiber 走；`ctx.on(...)` 返回 disposer，fiber unload 后监听卸掉。

它**不**拥有：

- vendored Cordis 内核（`Context` proxy、`Fiber`、`Events.waterfall` 的 `next = () => { const cb = cbs.shift() ?? inner }`）— [`subsys.vendor.cordis`](cordis.md)（`subsys.vendor.cordis`）。[E: vendor/cordis/src/events.ts:238]
- profile 发现、空根 `cordis.yml`、`composeEntries` / bundle 叠层、`boot()` 胶 — [`subsys.composition.app-boot`](../composition/app-boot.md)（`subsys.composition.app-boot`）。app-boot 是本页的 Consumer：`await ctx.plugin(Loader)` 再 `mountRootInclude`。[E: packages/boot/app-boot/src/index.ts:771]
- `dsh-base` 插进空根的那条 host 行表 — [`subsys.composition.bundle-base`](../composition/bundle-base.md)（`subsys.composition.bundle-base`）。那些行是 Loader 要 `import` 的 `name`，不是 loader 自己的名单。
- YAML `!!js` 方言与 `applyEntryPatches` — `@deepseek-ai/cordis-plugin-include` 把 `tag:yaml.org,2002:js` 建成 `{ __jsExpr }`。[E: vendor/include/src/index.ts:9] [E: vendor/include/src/index.ts:12] Loader 只认已经建成的 `JsExpr` 节点。
- preset 发现、`mountPreset`、`leakedServices` 审计 — [`subsys.composition.agent-presets`](../composition/agent-presets.md)（`subsys.composition.agent-presets`）。本页只写 isolate 机制；preset 用 `isolate.fs: true` 一类防泄漏。
- 端到端 `profile → bundle → preset` 走读 — [`spine.composition-boot`](../../spine/composition-boot.md)（`spine.composition-boot`）。

**host 面 vs agent-preset 面。** `ctx.loader` 是进程级单例。host 组合（`dsh-base` 等）和之后每会话 preset 子树都走同一套 entry / interpolate / isolate。默认产品路径仍是 `dsh web` 本地 Web GUI；本仓没有 shipped TUI。

**不要把 Loader 写成 app-boot。** `boot` 负责选哪份空根、叠哪些 patch、fail-loud 审计；Loader 负责把已经交给它的 `EntryOptions` 变成 fiber。

## 关键文件

| 路径 | 角色 |
|---|---|
| `vendor/loader/src/index.ts` | `Loader extends EntryTree`：`provide('loader')`、`internal/config` interpolate、`internal/update` persist / reload log、`unwrapExports` |
| `vendor/loader/src/config/entry.ts` | 单行 `Entry`：`update` / `init` / `_start` / `disabled` 的 `!!js` 求值 |
| `vendor/loader/src/config/group.ts` | `EntryGroup` 事务性 reconcile；`Group` 插件（`EntryGroup.key` 树载体） |
| `vendor/loader/src/config/isolate.ts` | `loader/entry-init` + `loader/patch-context`：按 `isolate` 选项换 realm 符号 |
| `vendor/loader/src/config/tree.ts` | `EntryTree`：`create` / `resolve` / `import` / `await`；`write()` 抽象 |
| `vendor/loader/src/config/utils.ts` | `evaluate` / `interpolate` / `isJsExpr` |
| `vendor/include/src/index.ts` | Consumer：`!!js` YAML Type、`Include extends EntryTree` 的文件 `write()`、同样的 `EntryGroup.key` |
| `packages/boot/app-boot/src/index.ts` | Consumer：`ctx.plugin(Loader)`、`builtins.include` / `builtins.group`、钉死 `id: include` |
| `packages/bundle/base/cordis.patch.yml` | Consumer：host 行表，含 `disabled: !!js process.platform …` |
| `apps/cli/config/agent-presets/minimal/agent.cordis.yml` | Consumer：`isolate: { fs: true }` 的 shipped 形状 |

## 数据模型

| 符号 | 要点 |
|---|---|
| `Loader` | `extends EntryTree`。`name = 'loader'`。根树 `write()` 是空实现（内存树）。[E: vendor/loader/src/index.ts:72] [E: vendor/loader/src/index.ts:162] |
| `Loader.Config.baseUrl` | 可选；构造时写到 `ctx.baseUrl`，相对 specifier 相对它解析。[E: vendor/loader/src/index.ts:80] |
| `Loader.Intercept.await` | 其它插件 `inject: ['loader']` 时：`await: true` 且 `getTasks().length > 0` 则 `Service.check` 返回 false，依赖方保持 pending。[E: vendor/loader/src/index.ts:168] |
| `EntryOptions` | `id` / `name` / `config?` / `group?` / `disabled?` / `inject?`；isolate 插件再扩 `isolate?` / `intercept?`。[E: vendor/loader/src/config/entry.ts:11] [E: vendor/loader/src/config/isolate.ts:8] |
| `Entry` | 一行已配置插件。`ctx = loader.ctx.extend({ [Entry.key]: this })`。嵌套树里对外 `id` 是 `祖先id:本地id`（`EntryTree.sep = ':'`）。[E: vendor/loader/src/config/entry.ts:67] [E: vendor/loader/src/config/tree.ts:8] |
| `Entry.disabled` | 本组 `group: true` 恒 false。否则 `disabledOf`：`!!js` 对 loader ctx `evaluate`，字面量则 `Boolean(disabled)`；再沿父 entry 向上看。原始 `disabled` 节点不改写，write-back 仍是 `!!js`。[E: vendor/loader/src/config/entry.ts:90] [E: vendor/loader/src/config/entry.ts:105] |
| `EntryGroup` | 一组子 entry 的运行时主人。`create` / `update` 失败会回滚新行并重放旧 config。[E: vendor/loader/src/config/group.ts:20] [E: vendor/loader/src/config/group.ts:102] |
| `Group` | 插件形态的 `EntryGroup`。`static [EntryGroup.key] = true`，让 `internal/config` 跳过 interpolate。[E: vendor/loader/src/config/group.ts:118] |
| `JsExpr` | `{ __jsExpr: string }`。`isJsExpr` 认「对象且带 `__jsExpr`」。[E: vendor/loader/src/config/utils.ts:26] |
| `interpolate` | 递归：`JsExpr` → `evaluate(ctx, expr)`；数组 / 对象逐项；其它原样返回。[E: vendor/loader/src/config/utils.ts:14] |
| `evaluate` | `new Function('ctx', 'expr', 'with (ctx) { return eval(expr) }')`。[E: vendor/loader/src/config/utils.ts:5] |
| `LocalRealm` | `isolate[name] === true`：每条 entry 一份，suffix `#<options.id>`。[E: vendor/loader/src/config/isolate.ts:81] [E: vendor/loader/src/config/isolate.ts:55] |
| `GlobalRealm` | `isolate[name] === '<label>'`：同 label 共享，suffix `@<label>`。[E: vendor/loader/src/config/isolate.ts:84] [E: vendor/loader/src/config/isolate.ts:66] |
| `builtins` | `cordis:<key>` → `ctx.loader.builtins[key]`。app-boot 填 `include` 与 `group`。[E: vendor/loader/src/config/tree.ts:146] [E: packages/boot/app-boot/src/index.ts:510] |

`dsh-base` 用同一套 `disabled: !!js` 互斥两套 shell（win32 关 bash 栈，非 win32 关 pwsh 栈）。[E: packages/bundle/base/cordis.patch.yml:212] [E: packages/bundle/base/cordis.patch.yml:216] `evaluate` 被 windows-shell 测试直接 import，用假 `process.platform` 钉死两边结果。[E: apps/cli/tests/windows-shell.spec.ts:20] [E: apps/cli/tests/windows-shell.spec.ts:30]

## 控制流

1. Consumer `boot@packages/boot/app-boot/src/index.ts`：`new Context()` → `ctx.provide('dshHomePath', dshHomePath)` → `await ctx.plugin(Loader)`。[E: packages/boot/app-boot/src/index.ts:770] [E: packages/boot/app-boot/src/index.ts:771] `dshHomePath` 不是 loader 的 API；它只是随后 `interpolate` 的 `with (ctx)` 作用域里能看见的一个键。

2. `Loader` 构造@`vendor/loader/src/index.ts`：`super(ctx)` 建根 `EntryGroup`，可选写 `baseUrl`，`defineProperty(..., Service.tracker)`，然后 `ctx.reflect.provide('loader', this, this[Service.check])`。[E: vendor/loader/src/index.ts:78] [E: vendor/loader/src/index.ts:90] `provide` 把实现存进 `reflect.store[ctx[Context.isolate]['loader']]`；同 realm 再注册同名会抛。[E: vendor/cordis/src/reflect.ts:287] [E: vendor/cordis/src/reflect.ts:290] 末尾 `ctx.plugin(isolate)` 装 isolate 钩子。[E: vendor/loader/src/index.ts:159]

3. `mountRootInclude` 钉死根行 `id: 'include'` / `name: 'cordis:include'`，并 `ctx.loader.builtins.group = Group`，让 `cordis:group` 不依赖 included 树自己的 specifier 解析。[E: packages/boot/app-boot/src/index.ts:519] [E: packages/boot/app-boot/src/index.ts:520] [E: packages/boot/app-boot/src/index.ts:510] `EntryTree.import`：`cordis:` 前缀查 `builtins`，否则走 Node internal loader 或动态 `import()`。[E: vendor/loader/src/config/tree.ts:147] [E: vendor/loader/src/config/tree.ts:155]

4. `EntryTree.create` → `EntryGroup.create@vendor/loader/src/config/group.ts`：`ensureId`，`new Entry(loader)`，`entry.update(options, true, true)`。[E: vendor/loader/src/config/tree.ts:99] [E: vendor/loader/src/config/group.ts:30] 新 `Entry` 立刻 `emit('loader/entry-init')`；isolate 插件给该 ctx 一份自己的 `Context.isolate` / `Context.intercept` 原型链。[E: vendor/loader/src/config/entry.ts:68] [E: vendor/loader/src/config/isolate.ts:93]

5. `Entry.init` → `_init`：`unwrapExports(await tree.import(name))` 再 `_start`。[E: vendor/loader/src/config/entry.ts:280] [E: vendor/loader/src/config/entry.ts:285] `unwrapExports` 先取 `exports.default ?? exports`；带 `__esModule` 再剥一层。写成 `export default { apply }` 会丢掉模块顶上的 `name` / `inject`。[E: vendor/loader/src/index.ts:194] [E: vendor/loader/src/index.ts:198]

6. `_start@vendor/loader/src/config/entry.ts`：`await this._patchContext([])` → `ctx.registry.plugin(plugin, this.options.config)` → `fiber.await()`。失败则 `_dispose` 刚建的 fiber。[E: vendor/loader/src/config/entry.ts:294] [E: vendor/loader/src/config/entry.ts:296] `_patchContext` 自己是 waterfall：`waterfall('loader/patch-context', this, async () => { setPrototypeOf; maybe fiber.update })`。[E: vendor/loader/src/config/entry.ts:115]

7. isolate 的 `loader/patch-context` listener **必须 `await next()`**。它先按 `isolate` 选项生成新符号表（`true` → `LocalRealm`，字符串 → `GlobalRealm`），`swap` 到 `entry.ctx[Context.isolate]`，然后 `await next()` 跑 waterfall inner（`setPrototypeOf`，若已有 fiber 再 `fiber.update(..., true)`），回来后再搬 `reflect.store` 并 `reflect.notify`。[E: vendor/loader/src/config/isolate.ts:100] [E: vendor/loader/src/config/isolate.ts:125] [E: vendor/loader/src/config/isolate.ts:129] 不调用 `next()`，inner 与 `next()` 之后的 remap / notify 停在本层。`registry.plugin` **不**在这条 listener 的 `next()` 链上：`_start` 等整个 `_patchContext` waterfall 返回后才 `this.ctx.registry.plugin(...)`。[E: vendor/loader/src/config/entry.ts:294] [E: vendor/loader/src/config/entry.ts:296]

8. Fiber 激活走 `_resolveConfig@vendor/cordis/src/fiber.ts`：`waterfall(this, 'internal/config', config, () => config)`，**之后**才 `resolveConfig(runtime, config)`。[E: vendor/cordis/src/fiber.ts:642] Loader 的 `internal/config` listener 先 `const config = next()`，再决定是否 interpolate。[E: vendor/loader/src/index.ts:93] 没有 `this.entry`、或 parent fiber 与本 fiber 共享同一 `entry`（子插件）、或 `plugin[EntryGroup.key]`（Group / Include 树载体）→ 原样返回；否则 `return interpolate(this.ctx, config)`。[E: vendor/loader/src/index.ts:94] [E: vendor/loader/src/index.ts:99] [E: vendor/loader/src/index.ts:100] Include 同样声明 `static [EntryGroup.key] = true`，所以它自己的 `path` / `patches` 保持字面量，嵌套行的 `!!js` 留到那一行自己的 fiber。[E: vendor/include/src/index.ts:182]

9. `Fiber.update@vendor/cordis/src/fiber.ts` 在 ACTIVE 时跑 `waterfall(this, 'internal/update', config, noSave, () => { this.config = config; return this.restart() })`。[E: vendor/cordis/src/fiber.ts:748] Cordis `Events.waterfall`：最后一个参数是 innermost `next`；`next = () => { const cb = cbs.shift() ?? inner; return cb(...args) }`。不调用传入的 `next()` 就停在本层，包括内置 `restart`。[E: vendor/cordis/src/events.ts:237] [E: vendor/cordis/src/events.ts:238]

10. Loader 在这条链上挂了两个 **global** listener，**都必须 `next()`**：

    | listener | 注册 | 做什么 | 忘了 `next()` |
    |---|---|---|---|
    | persist | `{ global: true, prepend: true }` | 有 `entry` 且非 `noSave` 时 `await next()`，再把 config 写回 `entry.options.config` 并 `tree.write()` [E: vendor/loader/src/index.ts:105] [E: vendor/loader/src/index.ts:108] | 后续 listener、fiber-local 钩子、`restart()` 全停；HMR / reload 链断 |
    | reload log | `{ global: true }` | `showLog(..., 'reload')` 后 `return next()` [E: vendor/loader/src/index.ts:114] | persist 已经 `await next()` 的话，卡在 log 层，同样到不了 `restart()` |

    persist 在无 `entry`、`noSave`、或 parent 与本 fiber 共享 entry 时 `return next()`，把 persist 写回跳过。[E: vendor/loader/src/index.ts:104] reload log **不**看 `noSave`：它只在无 `entry` 或共享 parent entry 时 `return next()`，否则先 `showLog` 再 `next()`。[E: vendor/loader/src/index.ts:112]

11. 非 global 的 `internal/update` **不进**普通 hook 表。`EventsService` 构造里：`internal/listener` 把它们推进 `fiber._hooks['internal/update']`；另一条 `{ global: true, prepend: true }` 包装器再对这张表做一层 mini-waterfall，最后才调用外层 `next`。[E: vendor/cordis/src/events.ts:141] [E: vendor/cordis/src/events.ts:148] `Group` 的 `ctx.on('internal/update', config => this.update(config))` 是这条 fiber-local 路：它 reconcile 子行，自己不 `next()`，从而 **veto Group fiber 的 `restart()`**——树载体就地改孩子，不把自己卸掉再建。[E: vendor/loader/src/config/group.ts:122] Include 在 `path` 未变时同样不 `next()`，只 `root.update(patched)`。[E: vendor/include/src/index.ts:210]

12. 自处置：`internal/plugin` 见到 tracked fiber 被 `ctx.fiber.dispose()`（且不是 loader 自己的 `_disposing` / 整棵树 UNLOADING）时 `showLog('unload')`；若 entry 仍 enabled，则写 `options.disabled = true` 并 `tree.write()`。[E: vendor/loader/src/index.ts:155] [E: vendor/loader/src/index.ts:156]

13. `disabled: !!js` 在每次 mount 决策上对 loader ctx 求值，options 里留下 `{ __jsExpr }`。user-patches 测试钉死 write-back 形态与 `entry.disabled === (process.platform === 'win32')`。[E: packages/boot/app-boot/tests/user-patches.spec.ts:237] [E: packages/boot/app-boot/tests/user-patches.spec.ts:238] config 里的 `!!js` 则在步骤 8 的 `interpolate` 之后变成插件真正收到的值：`fiber.config.value === 'user-value'`，options 仍是表达式节点。[E: packages/boot/app-boot/tests/user-patches.spec.ts:289]

14. isolate 形状：`isolate.fs: true` 一类把 `fs` 放进该 group 行的 `LocalRealm`（suffix `#<id>`），同组孩子的 `Context.isolate.fs` 指向这份私有符号，`provide('fs')` / `ctx.fs` 不再撞 root realm。[E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:51] [E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:52] [E: vendor/loader/src/config/isolate.ts:82] 字符串 label 则进 `GlobalRealm`。同 realm 符号下第二次 `provide` 仍抛；label 合并的是 realm，不是「多实例池」。preset 漏写 isolate、把 service publish 进 root 的审计在 [`subsys.composition.agent-presets`](../composition/agent-presets.md)，本页不写 `mountPreset` / `leakedServices` 算法。

## 设计动机

Loader 把「一份可热更新的插件清单」从 Cordis 内核里拆出来：`Fiber` 只认识单个插件的 lifecycle，entry 树才认识 id、父子 group、disable、isolate 与落盘。根 `Loader.write` 有意做成空操作，这样进程内 `new Loader` 的测试树不会偷偷写文件；真正的 YAML 回写是 `Include.write` 对 `this.root.data` 的职责。

`internal/config` 延后到 inject 齐了再 interpolate，是为了让 `!!js ctx.get('answer')` / `dshHomePath('sessions')` 看见已经 provide 的键，而不是在插件还 PENDING 时求值失败。树载体跳过 interpolate，避免 Group / Include 把自己孩子的表达式在错误的 fiber 上提前跑掉。

`disabled` 是唯一被求值的 **元数据** 字段：mount 决策需要布尔值，但文件方言要保住 `!!js`，所以 `disabledOf` 读表达式、`options.disabled` 不改写。

waterfall 必须 `next()` 是 Cordis 全局合同。Loader 把 persist 做成 prepend + `await next()`，是为了「先让 restart / 子钩子跑完，成功后再 write」。哪一层吞掉 `next()`，HMR 触发的 `Fiber.update` 和手工 reload 都会停在那一层。

isolate 用换 `Context.isolate[name]` 的 symbol 来换 `reflect.store` 槽位，而不是再做一套服务表。`true` 给 preset 每座 standing mount 一份私有实例（`fs` / `planMode` / `compaction`）；字符串 label 给「多行共享同一 realm」——仍然是一份实现，第二次 `provide` 照样炸。

## Gotcha

- **不是 app-boot。** 换 profile / bundle / `--patch` 不会改 `Loader` 类。那些层只改变喂给 `create` / Include `patches` 的 `EntryOptions`。
- **`vendor/README.md` 不是 `[E]`。** 它记录 vendored 分叉；机制以 `.ts` / 测试 / yml 为准。
- **YAML `!!js` 不属于本包。** include 的 Type 才 `construct: (data) => ({ __jsExpr: data })`。dump 打印字面量、不求值；求值发生在已挂上的行走 `internal/config` 时。
- **树载体整份 config 不 interpolate。** 给 Group / Include 的 `!!js` 不会在载体 fiber 上求值。要把表达式挂在真正消费它的那一行。
- **`internal/update` 分两层。** Loader 的 global persist / log **必须** `next()`。`Group` / `Include` 的 fiber-local 钩子故意不 `next()` 来 veto 自身 `restart()`。不要给 Loader 的 global 钩子学这个 veto。
- **default export 会丢掉 loader 元数据。** `unwrapExports` 先取 `.default`。插件要 `export const name` / `export const inject` / `export function apply`。
- **`isolate: { fs: true }` 不是 host `dsh-base` 的默认。** shipped `minimal` 用它让 preset 的 `fs-local` 遮住 host 沙箱 fs；`standard` 用同一形状隔离 `planMode` / `compaction` / `workflowEngine`。漏写会在 `mountPreset` 被拒，不是 `Loader` 构造抛错。
- **根 `tree.write()` 是空的。** persist 钩子仍会调用它；只有 `parent.tree` 是 `Include` 时才会烤回文件。app-boot 每次把 profile `cordis.yml` 重写成 `[]`，就是怕 Include 把已展开的树写回去再叠一层 insert。
- **`cordis:` builtin 不是 npm 名。** 未注册的 `cordis:foo` 得到 `undefined`，随后 `registry.plugin` 失败。产品树靠 app-boot 预置 `include` / `group`。

## Seam 三角

| 角色 | 落点 | ctx 键 / 组合行 |
|---|---|---|
| **Definition** | `@deepseek-ai/cordis-plugin-loader` 的 `Loader` / `Entry` / `EntryTree` / `interpolate` | `ctx.loader`。isolate 改的是 `ctx[Context.isolate][service]` 的 symbol，不是第二套 `ctx.*` |
| **Provider（本页）** | vendored `vendor/loader/`；`Loader` 构造 `provide('loader', this)` | 进程级。根行通常是 Consumer 钉的 `id: include` / `name: cordis:include` |
| **Consumer（启动胶）** | `@deepseek-ai/dsh-app-boot` 的 `boot` / `mountRootInclude` | `ctx.plugin(Loader)`；`builtins.include` / `builtins.group`；`provide('dshHomePath')` 给 `!!js` 用 |
| **Consumer（行表）** | `dsh-base` `cordis.patch.yml` 与各 preset `agent.cordis.yml` | `name` 被 `EntryTree.import`；`disabled: !!js` / `isolate: { fs: true }` 被本页机制消费 |
| **Consumer（文件树）** | `@deepseek-ai/cordis-plugin-include` | `Include extends EntryTree`；实现真正的 `write()`；声明 `EntryGroup.key` |

换组合 = 换喂给 Loader 的 entry 列表，不是换 `Loader` 实现。同 realm 再 `provide` 同名服务仍抛。

## Sources

- vendor/loader/src/index.ts
- vendor/loader/src/config/entry.ts
- vendor/loader/src/config/group.ts
- vendor/loader/src/config/isolate.ts
- vendor/loader/src/config/tree.ts
- vendor/loader/src/config/utils.ts
- vendor/loader/package.json
- vendor/README.md
- vendor/include/src/index.ts
- vendor/cordis/src/events.ts
- vendor/cordis/src/fiber.ts
- vendor/cordis/src/reflect.ts
- packages/boot/app-boot/src/index.ts
- packages/boot/app-boot/tests/user-patches.spec.ts
- packages/bundle/base/cordis.patch.yml
- apps/cli/config/agent-presets/minimal/agent.cordis.yml
- apps/cli/tests/windows-shell.spec.ts

## 相关

- [spine.overview](../../spine/overview.md)（`spine.overview`）：`profile → bundle → agent preset` 与 host / preset 切面。
- [spine.composition-boot](../../spine/composition-boot.md)（`spine.composition-boot`）：组合启动走读；Loader 是其中一环，不是 profile 发现。
- [subsys.vendor.cordis](cordis.md)（`subsys.vendor.cordis`）：`Context` / `Fiber` / `Events.waterfall`；本页的 `next()` 合同源在这里。
- [subsys.composition.app-boot](../composition/app-boot.md)（`subsys.composition.app-boot`）：`boot` / `mountRootInclude` / 空根 / patch 叠层。Consumer。
- [subsys.composition.bundle-base](../composition/bundle-base.md)（`subsys.composition.bundle-base`）：host 面第一层 insert 行表，含 `disabled: !!js` shell 互斥。
- [subsys.composition.agent-presets](../composition/agent-presets.md)（`subsys.composition.agent-presets`）：`mountPreset` 与 `leakedServices`；消费 `isolate: { …: true }`，不实现 realm。
