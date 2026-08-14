---
id: subsys.util.brand
title: Branded ids
kind: subsystem
tier: T2
pkg: util
source:
  - packages/util/brand/src/index.ts
  - packages/util/brand/src/invariant.ts
  - packages/util/brand/package.json
  - packages/core/session/src/types.ts
  - packages/llm/llm/src/brand.ts
  - packages/interaction/commands/src/brand.ts
  - packages/workspace/workspace/src/types.ts
  - packages/workspace/workspace/src/index.ts
  - packages/runtime-diagnostics/invariants/src/index.ts
  - scripts/package-invariants.ts
symbols:
  - Branded
related:
  - spine.overview
  - subsys.core.session
  - subsys.vendor.cordis
  - subsys.core.invariants
evidence: explicit
status: verified
updated: 47f943859b
---

> `@deepseek-ai/dsh-brand` 只拥有编译期名义类型 `Branded<B>`：跨包 id 的 **primitive**，不是 Cordis service，也没有 `SessionId` / `CallId` / `CommandId` / `JobId` 这些具体 id。铸造函数一律留在 **owning 包**；运行时仍是普通 `string`。

## 能回答的问题

- `@deepseek-ai/dsh-brand` 导出什么？有没有运行时 factory，有没有 `ctx.brand`？
- 跨边界 id 为什么必须走 `Branded<B>`，却不能在本包写成 `SessionId(...)`？
- `SessionId` / `CallId` / `CommandId` 各自的 type 与 factory 落在哪个 owning 包？
- `brand-invariant` 的 `install` 为什么是空函数？本包有没有 `tests/`？
- companion 的 `apply` 怎样占 `@deepseek-ai/dsh-brand` 这个 npm 名，卸掉之后还占不占？

## 职责边界

本包拥有 **唯一** 一个导出类型：`Branded<B extends string> = string & { readonly [BRAND]: B }`，其中 `BRAND` 是文件内 `unique symbol`，不导出。[E: packages/util/brand/src/index.ts:24] [E: packages/util/brand/src/index.ts:27] npm 名 `@deepseek-ai/dsh-brand`。[E: packages/util/brand/package.json:2] 主入口源码没有 `import`、没有函数、没有 `apply`，因此也没有 `ctx.brand`。

它**不**拥有：

- 任何具体 id 的 type 或 factory。`SessionId` 在 `dsh-session`（[`subsys.core.session`](../core/session.md)，`subsys.core.session`），`CallId` 在 `dsh-llm`，`CommandId` 在 `dsh-commands`，`WorkspaceId` 在 `dsh-workspace`，`JobId` 在 `dsh-jobs`。本页只把前三个 factory 当作 Consumer 例，不展开那些子系统。
- `ctx.invariants` Definition、过滤、child fiber——[`subsys.core.invariants`](../core/invariants.md)（`subsys.core.invariants`）。本包 `./invariant` 是 Consumer：空 `install` 只占名。
- Cordis `Context` / `Fiber` / `Events.waterfall`——[`subsys.vendor.cordis`](../vendor/cordis.md)（`subsys.vendor.cordis`）。本包不 `provide` 服务，不往 `Events.waterfall` 挂 listener。全局规则仍是：waterfall listener 必须调用传入的 `next()`，否则 `cbs.shift()` 停在本层。
- 产品主目录 / `$DSH_HOME`——那是 `subsys.util.home-paths`。

**host 面 vs agent-preset 面。** `Branded` 是 TypeScript 类型，两面的 `.ts` 都可以 `import type`，不进 Loader 行，也没有 `isolate` remount。`dsh-base` / `dsh-web-app` / `dsh-headless` 都不 insert 本包。companion 要等 host 已经 `provide('invariants')`；默认 `dsh web` 树不挂那份 registry。默认产品路径仍是本地 Web GUI；本仓没有 shipped TUI。

**没有 waterfall，没有 isolate。** 组合失败只会发生在有人把 `@deepseek-ai/dsh-brand/invariant` 插进树、却等不到 `invariants` 的时候（`inject = ['invariants']`）。[E: packages/util/brand/src/invariant.ts:15]

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/util/brand/src/index.ts` | 唯一权威：`Branded<B>`；无运行时代码 |
| `packages/util/brand/src/invariant.ts` | companion：`name = 'brand-invariant'`，空 `install`，`apply` 占 npm 名 |
| `packages/util/brand/package.json` | 主入口 + `./invariant` 子路径；无 `dependencies` |
| `packages/core/session/src/types.ts` | Consumer 例：`SessionId = Branded<'SessionId'>` 与 `SessionId()` |
| `packages/llm/llm/src/brand.ts` | Consumer 例：`CallId = Branded<'CallId'>` 与 `CallId()`（同文件还有 llm 自有的其它 brand，本页不展开） |
| `packages/interaction/commands/src/brand.ts` | Consumer 例：`CommandId = Branded<'CommandId'>` 与 `CommandId()` |
| `packages/workspace/workspace/src/types.ts` | Consumer 例：`WorkspaceId = Branded<'WorkspaceId'>`（只有类型） |
| `packages/workspace/workspace/src/index.ts` | `WorkspaceId()` factory 落在这里，不在 `types.ts` |
| `packages/runtime-diagnostics/invariants/src/index.ts` | `register` 用 `ctx.effect` 做可逆占位 |
| `scripts/package-invariants.ts` | 结构门：空 `install` 必须带 `No runtime invariant:` 说明 |

本包 **没有** `tests/` 目录。不要把「值代数有人测」读成本包自带单测。

## 数据模型

| 符号 | 要点 |
|---|---|
| `BRAND` | `declare const BRAND: unique symbol`。只作交叉类型的属性键，运行时不存在。[E: packages/util/brand/src/index.ts:24] |
| `Branded<B>` | `string & { readonly [BRAND]: B }`，`B extends string`。`Branded<'SessionId'>` 与 `Branded<'CallId'>` 在类型上不可互换；擦除后都是 `string`。[E: packages/util/brand/src/index.ts:27] |
| `SessionId` | owning 包 `dsh-session`：`export type SessionId = Branded<'SessionId'>`，`export function SessionId(id: string): SessionId` 做 `id as SessionId`，无校验。[E: packages/core/session/src/types.ts:22] [E: packages/core/session/src/types.ts:29] [E: packages/core/session/src/types.ts:30] |
| `CallId` | owning 包 `dsh-llm`：`export type CallId = Branded<'CallId'>` + 同名 factory，同样是裸 cast。[E: packages/llm/llm/src/brand.ts:31] [E: packages/llm/llm/src/brand.ts:38] [E: packages/llm/llm/src/brand.ts:39] |
| `CommandId` | owning 包 `dsh-commands`：`export type CommandId = Branded<'CommandId'>` + 同名 factory，`return id as CommandId`。[E: packages/interaction/commands/src/brand.ts:20] [E: packages/interaction/commands/src/brand.ts:27] [E: packages/interaction/commands/src/brand.ts:28] |
| `WorkspaceId` | owning 包 `dsh-workspace`：类型在 `types.ts` 写成 `Branded<'WorkspaceId'>`；factory `WorkspaceId(id)` 在 `index.ts`，仍是 `id as WorkspaceId`。[E: packages/workspace/workspace/src/types.ts:15] [E: packages/workspace/workspace/src/index.ts:37] [E: packages/workspace/workspace/src/index.ts:38] |
| `name` | companion 插件名 `'brand-invariant'`，不是 npm 名。[E: packages/util/brand/src/invariant.ts:13] |
| `inject` | `['invariants']`。companion 声明依赖 `ctx.invariants`，等不到这份服务就不会跑 `apply`。[E: packages/util/brand/src/invariant.ts:15] |
| `PACKAGE_NAME` | `'@deepseek-ai/dsh-brand'`，交给 `register` 的占位键。[E: packages/util/brand/src/invariant.ts:10] |
| `install` | `InvariantInstaller`，函数体为空：`() => {}`。[E: packages/util/brand/src/invariant.ts:21] |
| `apply` | `(ctx) => Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))`，返回 register 的 disposer。[E: packages/util/brand/src/invariant.ts:28] [E: packages/util/brand/src/invariant.ts:29] |

`package.json` 的 `exports` 分两路：`"."` 是类型 primitive，`"./invariant"` 是 companion。[E: packages/util/brand/package.json:17] [E: packages/util/brand/package.json:21] `peerDependencies` 只有 `@deepseek-ai/dsh-invariants` 与 `@deepseek-ai/cordis`，给 companion 用；主入口不依赖它们。[E: packages/util/brand/package.json:35] [E: packages/util/brand/package.json:36] manifest **没有** `dependencies` 字段。

比较、日志、JSON、线协议都按普通字符串走。brand 只挡住「把 `SessionId` 传进要 `CallId` 的形参」这种跨包混淆。

## 控制流

1. **类型层。** `Branded@packages/util/brand/src/index.ts` 用文件私有 `unique symbol` 做交叉属性键，再按字面量 `B` 区分品牌。[E: packages/util/brand/src/index.ts:24] [E: packages/util/brand/src/index.ts:27] 编译后属性被擦掉；本文件没有任何可执行语句。

2. **owning 包 `import type`。** 例如 `dsh-session` 写 `import type { Branded } from '@deepseek-ai/dsh-brand'`，再声明自己的 id。[E: packages/core/session/src/types.ts:1] `dsh-llm` / `dsh-commands` 同样只 type-import，不加载本包 companion，也不 merge `Context`。[E: packages/llm/llm/src/brand.ts:13] [E: packages/interaction/commands/src/brand.ts:13]

3. **factory 在 owning 包。** `SessionId@packages/core/session/src/types.ts`、`CallId@packages/llm/llm/src/brand.ts`、`CommandId@packages/interaction/commands/src/brand.ts` 都是 `function X(id: string): X { return id as X }`。[E: packages/core/session/src/types.ts:29] [E: packages/llm/llm/src/brand.ts:38] [E: packages/interaction/commands/src/brand.ts:27] 空串、任意字符串都能通过；格式、唯一性、谁来 mint（uuid / 单调计数 / provider 签发）由那个包自己决定。本页不写那些 mint 规则。

4. **`WorkspaceId` 拆文件。** 类型在 `types.ts`，factory 在 `WorkspaceId@packages/workspace/workspace/src/index.ts`。[E: packages/workspace/workspace/src/types.ts:15] [E: packages/workspace/workspace/src/index.ts:37] 读 `types.ts` 看不到构造函数。

5. **companion 只占名。** 结构门要求每包 `src/invariant.ts` named-export `name` / `inject` / `apply`，且禁止 `export default`，好让 Loader 保住 namespace。[E: scripts/package-invariants.ts:230] [E: scripts/package-invariants.ts:235] [E: scripts/package-invariants.ts:236] `apply@packages/util/brand/src/invariant.ts` 调用 `ctx.invariants.register('@deepseek-ai/dsh-brand', install)`。[E: packages/util/brand/src/invariant.ts:29]

6. **空 `install` 是门禁允许的形态。** `install` 函数体 statement 数为 0。[E: packages/util/brand/src/invariant.ts:21] `checkInstaller@scripts/package-invariants.ts` 见到空函数就要求声明文本含 `No runtime invariant:`，否则记 violation。[E: scripts/package-invariants.ts:265] [E: scripts/package-invariants.ts:269] 值代数不在这里跑：由 TypeScript 名义类型，以及各 owning 包自己的测试保证。本包没有 `tests/` 可挂。

7. **占位可逆。** `InvariantRegistry.register@packages/runtime-diagnostics/invariants/src/index.ts` 先把 npm 名放进 `registrations`，再 `ownerCtx.effect(...)`；返回值就是那条 effect 的 disposer。[E: packages/runtime-diagnostics/invariants/src/index.ts:149] [E: packages/runtime-diagnostics/invariants/src/index.ts:153] [E: packages/runtime-diagnostics/invariants/src/index.ts:196] fiber unload 或调用 disposer 会撤占位。空 `install` 被选中时 child fiber 里什么 listener 都不挂，因此卸掉也没有事件钩要拆。

8. **默认产品树走不到第 5 步。** `dsh-base` 不 insert `invariants`，也不 insert `brand-invariant`。类型消费只靠步骤 2–4 的 `import type` + owning factory，不经过 Cordis 组合。

## 设计动机

跨包 id 在运行时都是字符串：session 日志、tool-call 相关、command 生命周期、workspace 记录、job 登记很容易在类型上互换。`Branded<B>` 把「这根字符串属于谁」钉在字面量 `B` 上，同时让比较 / `JSON.stringify` / 线协议保持 `string`。

primitive 单独成零依赖包，是为了 owning 包不必为了拿到 `Branded` 去依赖另一个能力包（`dsh-jobs` 不必 import `dsh-session` 才能写 `JobId`）。具体 id 的 mint 规则（谁发、什么形状、是否校验）属于那个能力的合同，不能收进本包，否则本包会变成隐藏的 id 注册中心。

`install` 为空，是因为这里没有 event stream、没有可变运行时表可核。结构门仍然要求 companion 在场并占自己的 npm 名，避免「这个包没有 `./invariant`」和「这个包真的没有运行时关系」混在一起。JSDoc 里写的「unit tests」指类型系统加上 owning 包测试，不是本目录下的 Vitest。

`dsh-llm` / `dsh-commands` 把 type+factory 放在 `src/brand.ts` 叶子，是为了 wire / 其它 TS 程序能点名品牌，却不必加载宿主插件的 `Context` merge。那是 owning 包的出口形状，不是本包的第二套 API。

## Gotcha

- **本包没有 `SessionId()`。** 搜 `function SessionId` 会落到 `packages/core/session/src/types.ts`，不是这里。把本包写成「id 运行时库」整页作废。
- **本包没有 `tests/`。** 空 `install` 加上结构门注释，不等于本包测过品牌代数。不要写「brand 单测钉死 SessionId 不能赋给 CallId」。
- **factory 不做校验。** `return id as X` 接受任意字符串，包括 `''`。唯一性、格式、谁有权 mint 都在 owning 包。
- **`WorkspaceId` 的 factory 不在 `types.ts`。** 那个文件声明自己「Types only」。只读 `types.ts` 会以为没有构造函数。
- **companion 名 ≠ 包名。** Loader / 诊断树看见的插件名是 `brand-invariant`；`register` 占的是 `@deepseek-ai/dsh-brand`。
- **`dsh web` 默认不跑 companion。** 每个包都有 `./invariant` ≠ 默认进程挂了 `ctx.invariants`。类型品牌在没挂 registry 时照样生效。
- **不是每个 `string` 都要 brand。** 政策是「跨包、可能被拿错」的 id。包内局部字符串继续用 `string`。
- **主入口不是插件。** 不要写 `id: brand` 的 `cordis.yml` 行，也不要 `export default { apply }`。companion 禁止 default-export。[E: scripts/package-invariants.ts:236]

## Seam 三角

| 角色 | 落点 | ctx 键 / bundle / preset 行 |
|---|---|---|
| **Definition** | `Branded<B>`（`packages/util/brand/src/index.ts`） | **无** `ctx` 键。不是 capability service |
| **Provider（本页）** | `@deepseek-ai/dsh-brand` 的类型导出 | 主入口只出类型。`exports["./invariant"]` 是诊断 companion，不是 id Provider。**不在** `dsh-base` / `dsh-web-app` / `dsh-headless` / shipped preset |
| **Consumer** | owning 包 factory：`SessionId()` @ `dsh-session`、`CallId()` @ `dsh-llm`、`CommandId()` @ `dsh-commands`；`WorkspaceId` 类型 @ `dsh-workspace` `types.ts`、factory @ 其 `index.ts` | 各包 `import type { Branded }`。换一个具体 id = 改那个 owning 包，不改本包 |

companion 相对 `ctx.invariants` 也是 Consumer：`apply` → `register`。换检查语义不会发生在本包——`install` 故意为空。

## Sources

- packages/util/brand/src/index.ts
- packages/util/brand/src/invariant.ts
- packages/util/brand/package.json
- packages/core/session/src/types.ts
- packages/llm/llm/src/brand.ts
- packages/interaction/commands/src/brand.ts
- packages/workspace/workspace/src/types.ts
- packages/workspace/workspace/src/index.ts
- packages/runtime-diagnostics/invariants/src/index.ts
- scripts/package-invariants.ts

## 相关

- [spine.overview](../../spine/overview.md)（`spine.overview`）：`profile → bundle → agent preset` 与 host / preset 切面。本包不进那条组合，只给各包类型。
- [subsys.core.session](../core/session.md)（`subsys.core.session`）：`SessionId` 的 owning 包；append-only `SessionEvent` 日志。
- [subsys.vendor.cordis](../vendor/cordis.md)（`subsys.vendor.cordis`）：vendored `Context` / 可逆 `ctx.effect` / waterfall 必须 `next()`。
- [subsys.core.invariants](../core/invariants.md)（`subsys.core.invariants`）：`ctx.invariants.register` 与空 installer 结构门；本包 companion 是 Consumer。
