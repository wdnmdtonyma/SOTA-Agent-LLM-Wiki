---
id: subsys.util.brand
title: Branded ids
kind: subsystem
tier: T2
pkg: util
source:
  - packages/util/brand/src/index.ts
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
  - brandString
related:
  - spine.overview
  - subsys.core.session
  - subsys.vendor.cordis
  - subsys.core.invariants
evidence: explicit
status: verified
updated: c291e7961a
---

> `@deepseek-ai/dsh-brand` 拥有编译期名义类型 `Branded<B>` 和擦除型 helper `brandString<T>`：跨包 id 的 **primitive**，不是 Cordis service，也没有 `SessionId` / `ToolCallId` / `CommandId` / `JobId` 这些具体 id。具体 type 仍留在 **owning 包**；运行时仍是普通 `string`。

## 能回答的问题

- `@deepseek-ai/dsh-brand` 导出什么？`brandString` 做什么？有没有 `ctx.brand`？
- 跨边界 id 为什么必须走 `Branded<B>`，却不能在本包写成 `SessionId(...)`？
- `SessionId` / `ToolCallId` / `CommandId` 各自的 type 与 factory 落在哪个 owning 包？
- 本包有没有 `tests/`？
- companion 的 `apply` 怎样占 `@deepseek-ai/dsh-brand` 这个 npm 名，卸掉之后还占不占？

## 职责边界

本包导出两个符号：类型 `Branded<B extends string> = string & { readonly [BRAND]: B }`，以及 `brandString<T extends Branded<string>>(value): T` 做 `value as T`。[E: packages/util/brand/src/index.ts:18] [E: packages/util/brand/src/index.ts:28] [E: packages/util/brand/src/index.ts:28] `BRAND` 是文件内 `unique symbol`，不导出。[E: packages/util/brand/src/index.ts:15] npm 名 `@deepseek-ai/dsh-brand`。[E: packages/util/brand/package.json:2] 主入口没有 `apply`、没有 `inject`，因此也没有 `ctx.brand`。

它**不**拥有：

- 任何具体 id 的 type 或 factory。`SessionId` 在 `dsh-session`（[`subsys.core.session`](../core/session.md)，`subsys.core.session`），`ToolCallId`（以及同文件的 `MessageId` / `ProviderRequestId` 等）在 `dsh-llm`，`CommandId` 在 `dsh-commands`，`WorkspaceId` 在 `dsh-workspace`，`JobId` 在 `dsh-jobs`。本页只把前几个 factory 当作 Consumer 例，不展开那些子系统。
- `ctx.invariants` Definition、过滤、child fiber——[`subsys.core.invariants`](../core/invariants.md)（`subsys.core.invariants`）。本包是类型 helper，不是 Loader 行。
- Cordis `Context` / `Fiber` / `Events.waterfall`——[`subsys.vendor.cordis`](../vendor/cordis.md)（`subsys.vendor.cordis`）。本包不 `provide` 服务，不往 `Events.waterfall` 挂 listener。全局规则仍是：waterfall listener 必须调用传入的 `next()`，否则 `cbs.shift()` 停在本层。
- 产品主目录 / `$DSH_HOME`——那是 `subsys.util.home-paths`。

**host 面 vs agent-preset 面。** `Branded` / `brandString` 是 TypeScript 类型加零状态 helper，两面的 `.ts` 都可以 `import`，不进 Loader 行，也没有 `isolate` remount。`dsh-base` / `dsh-web-app` / `dsh-headless` / `dsh-sdk-app` / `dsh-sdk-minimal` / `dsh-acp-app` 都不 insert 本包。五个 shipped profile 是 `web` / `headless` / `sdk` / `sdk-minimal` / `acp`；本仓没有 shipped TUI。

**没有 waterfall，没有 isolate。** 本包不进 Loader 行。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/util/brand/src/index.ts` | 权威：`Branded<B>` + `brandString`；无 Cordis |
| `packages/util/brand/package.json` | 主入口；无 `dependencies` |
| `packages/core/session/src/types.ts` | Consumer 例：`SessionId = Branded<'SessionId'>` 与 `SessionId()` → `brandString` |
| `packages/llm/llm/src/brand.ts` | Consumer 例：`ToolCallId` / `MessageId` 等，factory 走 `brandString` |
| `packages/interaction/commands/src/brand.ts` | Consumer 例：`CommandId = Branded<'CommandId'>` 与 `CommandId()` 裸 cast |
| `packages/workspace/workspace/src/types.ts` | Consumer 例：`WorkspaceId = Branded<'WorkspaceId'>`（只有类型） |
| `packages/workspace/workspace/src/index.ts` | `WorkspaceId()` factory 落在这里，不在 `types.ts` |
| `packages/runtime-diagnostics/invariants/src/index.ts` | `register` 用 `ctx.effect` 做可逆占位 |
| `scripts/package-invariants.ts` | 结构门：空 `install` 必须带 `No runtime invariant:` 说明 |

本包 **没有** `tests/` 目录。不要把「值代数有人测」读成本包自带单测。

## 数据模型

| 符号 | 要点 |
|---|---|
| `BRAND` | `declare const BRAND: unique symbol`。只作交叉类型的属性键，运行时不存在。[E: packages/util/brand/src/index.ts:15] |
| `Branded<B>` | `string & { readonly [BRAND]: B }`，`B extends string`。`Branded<'SessionId'>` 与 `Branded<'ToolCallId'>` 在类型上不可互换；擦除后都是 `string`。[E: packages/util/brand/src/index.ts:18] |
| `brandString<T>` | `export function brandString<T extends Branded<string>>(value: string \| T): T`，`return value as T`。不校验格式。[E: packages/util/brand/src/index.ts:28] [E: packages/util/brand/src/index.ts:28] |
| `SessionId` | owning 包 `dsh-session`：`export type SessionId = Branded<'SessionId'>`，`SessionId(id)` 调用 `brandString<SessionId>(id)`。[E: packages/core/session/src/types.ts:16] [E: packages/core/session/src/types.ts:26] [E: packages/core/session/src/types.ts:26] |
| `ToolCallId` | owning 包 `dsh-llm`：`export type ToolCallId = Branded<'ToolCallId'>` + 同名 factory，`brandString<ToolCallId>(id)`。同文件还有 `MessageId` / `ProviderRequestId` 等，本页不展开。[E: packages/llm/llm/src/brand.ts:31] [E: packages/llm/llm/src/brand.ts:38] [E: packages/llm/llm/src/brand.ts:39] |
| `CommandId` | owning 包 `dsh-commands`：`export type CommandId = Branded<'CommandId'>` + 同名 factory，`return id as CommandId`（不经过 `brandString`）。[E: packages/interaction/commands/src/brand.ts:22] [E: packages/interaction/commands/src/brand.ts:31] [E: packages/interaction/commands/src/brand.ts:31] |
| `WorkspaceId` | owning 包 `dsh-workspace`：类型在 `types.ts` 写成 `Branded<'WorkspaceId'>`；factory `WorkspaceId(id)` 在 `index.ts`，仍是 `id as WorkspaceId`。[E: packages/workspace/workspace/src/types.ts:16] [E: packages/workspace/workspace/src/index.ts:37] [E: packages/workspace/workspace/src/index.ts:37] |
`package.json` 的 `exports["."]` 是类型 primitive + `brandString`。[E: packages/util/brand/package.json:17] `peerDependencies` 只有 `@deepseek-ai/cordis`；主入口不依赖能力包。[E: packages/util/brand/package.json:29] [E: packages/util/brand/package.json:30] manifest **没有** `dependencies` 字段。

比较、日志、JSON、线协议都按普通字符串走。brand 只挡住「把 `SessionId` 传进要 `ToolCallId` 的形参」这种跨包混淆。

## 控制流

1. **类型层。** `Branded@packages/util/brand/src/index.ts` 用文件私有 `unique symbol` 做交叉属性键，再按字面量 `B` 区分品牌。[E: packages/util/brand/src/index.ts:15] [E: packages/util/brand/src/index.ts:18] 编译后属性被擦掉。`brandString` 是唯一可执行语句：裸 `as T`。[E: packages/util/brand/src/index.ts:28]

2. **owning 包 import。** `dsh-session` 写 `import { brandString, type Branded } from '@deepseek-ai/dsh-brand'`，再声明自己的 id。[E: packages/core/session/src/types.ts:1] `dsh-llm` 同样值导入 `brandString`。[E: packages/llm/llm/src/brand.ts:13] `dsh-commands` 仍只 `import type { Branded }`，factory 自己 `as`。[E: packages/interaction/commands/src/brand.ts:12]

3. **factory 在 owning 包。** `SessionId@packages/core/session/src/types.ts` 与 `ToolCallId@packages/llm/llm/src/brand.ts` 走 `brandString<X>(id)`；`CommandId@packages/interaction/commands/src/brand.ts` 走 `return id as CommandId`。[E: packages/core/session/src/types.ts:26] [E: packages/llm/llm/src/brand.ts:39] [E: packages/interaction/commands/src/brand.ts:31] 空串、任意字符串都能通过；格式、唯一性、谁来 mint（uuid / 单调计数 / provider 签发）由那个包自己决定。本页不写那些 mint 规则。

4. **`WorkspaceId` 拆文件。** 类型在 `types.ts`，factory 在 `WorkspaceId@packages/workspace/workspace/src/index.ts`。[E: packages/workspace/workspace/src/types.ts:16] [E: packages/workspace/workspace/src/index.ts:37] 读 `types.ts` 看不到构造函数。

5. **类型消费不经过 Cordis。** `dsh-base` 不 insert 本包。owning 包靠 import + factory。入口可以是 `dsh --profile web|headless|sdk|sdk-minimal|acp`。本包没有 `tests/` 可挂。

## 设计动机

跨包 id 在运行时都是字符串：session 日志、tool-call 相关、command 生命周期、workspace 记录、job 登记很容易在类型上互换。`Branded<B>` 把「这根字符串属于谁」钉在字面量 `B` 上，同时让比较 / `JSON.stringify` / 线协议保持 `string`。`brandString` 把擦除型构造收成一个 helper，owning 包可以包一层同名 factory，也可以直接 `brandString<SessionId>(raw)`。

primitive 单独成零 `dependencies` 包，是为了 owning 包不必为了拿到 `Branded` 去依赖另一个能力包（`dsh-jobs` 不必 import `dsh-session` 才能写 `JobId`）。具体 id 的 mint 规则（谁发、什么形状、是否校验）属于那个能力的合同，不能收进本包，否则本包会变成隐藏的 id 注册中心。

本包没有 event stream、没有可变运行时表。JSDoc 里写的独立安装副本可互换，是因为没有运行时身份表。

`dsh-llm` / `dsh-commands` 把 type+factory 放在 `src/brand.ts` 叶子，是为了 wire / 其它 TS 程序能点名品牌，却不必加载宿主插件的 `Context` merge。那是 owning 包的出口形状，不是本包的第二套 API。

## Gotcha

- **本包没有 `SessionId()`。** 搜 `function SessionId` 会落到 `packages/core/session/src/types.ts`，不是这里。把本包写成「id 运行时库」整页作废。本包运行时只有 `brandString`。
- **没有 `CallId`。** llm 侧工具调用相关品牌是 `ToolCallId`，不是旧名 `CallId`。[E: packages/llm/llm/src/brand.ts:31]
- **本包没有 `tests/`。** 不要写「brand 单测钉死 SessionId 不能赋给 ToolCallId」。
- **factory 不做校验。** `brandString` 与 `return id as X` 都接受任意字符串，包括 `''`。唯一性、格式、谁有权 mint 都在 owning 包。
- **`WorkspaceId` 的 factory 不在 `types.ts`。** 那个文件声明自己「Types only」。只读 `types.ts` 会以为没有构造函数。
- **默认 profile 不 insert 本包。** 类型品牌在没挂 `ctx.invariants` 时照样生效。
- **不是每个 `string` 都要 brand。** 政策是「跨包、可能被拿错」的 id。包内局部字符串继续用 `string`。
- **主入口不是插件。** 不要写 `id: brand` 的 `cordis.yml` 行，也不要 `export default { apply }`。
- **owning 包写法不统一。** `dsh-session` / `dsh-llm` 走 `brandString`；`dsh-commands` / `dsh-workspace` factory 仍裸 `as`。语义相同，grep 不能只搜一种。

## Seam 三角

| 角色 | 落点 | ctx 键 / bundle / preset 行 |
|---|---|---|
| **Definition** | `Branded<B>` + `brandString`（`packages/util/brand/src/index.ts`） | **无** `ctx` 键。不是 capability service |
| **Provider（本页）** | `@deepseek-ai/dsh-brand` 的类型与 helper 导出 | 主入口只出类型 + `brandString`。**不在** `dsh-base` / `dsh-web-app` / `dsh-headless` / `dsh-sdk-app` / `dsh-sdk-minimal` / `dsh-acp-app` / shipped preset `minimal`/`standard`/`ptc`/`cordis` |
| **Consumer** | owning 包 factory：`SessionId()` @ `dsh-session`、`ToolCallId()` @ `dsh-llm`、`CommandId()` @ `dsh-commands`；`WorkspaceId` 类型 @ `dsh-workspace` `types.ts`、factory @ 其 `index.ts` | 各包 `import type { Branded }` 和/或 `brandString`。换一个具体 id = 改那个 owning 包，不改本包 |

换检查语义不会发生在本包：这里没有运行时身份表。

## Sources

- packages/util/brand/src/index.ts
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
- [subsys.core.invariants](../core/invariants.md)（`subsys.core.invariants`）：`ctx.invariants.register`；本包不作为 companion 挂树。
