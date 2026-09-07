---
id: subsys.llm.deepseek-extensions
title: DeepSeek LLM API 扩展与插件清单
kind: subsystem
tier: T2
pkg: llm
source:
  - packages/llm/deepseek-llm-api-extensions/src/index.ts
  - packages/llm/deepseek-llm-api-extensions/src/types.ts
  - packages/llm/deepseek-llm-api-extensions/package.json
  - packages/llm/deepseek-llm-api-extensions/tests/registry.spec.ts
  - packages/llm/plugin-package-inventory-deepseek/src/index.ts
  - packages/llm/plugin-package-inventory-deepseek/src/types.ts
  - packages/llm/plugin-package-inventory-deepseek/package.json
  - packages/llm/plugin-package-inventory-deepseek/tests/inventory.spec.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/sdk-minimal/cordis.patch.yml
  - packages/llm/llm-deepseek/src/index.ts
  - packages/llm/llm-deepseek/src/adapter.ts
  - packages/session/session-log-deepseek/src/index.ts
  - packages/boot/app-boot/src/profile.ts
symbols:
  - DeepSeekLlmApiExtensionRegistry
  - ctx.deepseekLlmApiExtensions
  - DeepSeekLlmApiExtensionMap
  - DeepSeekLlmApiExtensionProvider
  - PreparedDeepSeekLlmApiExtensions
  - dsh_plugin_packages
  - DeepSeekPluginPackageInventoryExtension
  - plugin-package-inventory-deepseek
related:
  - subsys.llm.deepseek
  - subsys.llm.service
  - subsys.composition.bundle-base
  - subsys.composition.bundle-sdk-minimal
  - subsys.host.plugin-inventory
  - subsys.persistence.session-log-deepseek
  - spine.capability-seams
  - ref.ctx-keys
evidence: explicit
status: verified
updated: d347e70390
---

> `@deepseek-ai/dsh-deepseek-llm-api-extensions` 是 **host 面**登记式 seam `ctx.deepseekLlmApiExtensions`：各插件独占一个官方 DeepSeek **顶层请求字段**；`@deepseek-ai/dsh-plugin-package-inventory-deepseek` 是其中一个默认开启的 field provider，把 Loader 上 **ACTIVE** 的 npm 包身份写成 `dsh_plugin_packages`。这不是 `ctx.llm`，也不是 Web 设置页的 `ctx.pluginInventory`。

DSH 是 Cordis 组合运行时（`profile → bundle → agent preset`）。五个 shipped profile 是 `web` / `headless` / `sdk` / `sdk-minimal` / `acp`；`sdk-minimal` 是唯一不叠 `dsh-base` 的 bundle，但仍自己 insert 这两行。 [E: packages/boot/app-boot/src/profile.ts:137] [E: packages/bundle/sdk-minimal/cordis.patch.yml:17] [E: packages/bundle/sdk-minimal/cordis.patch.yml:23]

## 能回答的问题

- `ctx.deepseekLlmApiExtensions` 谁 `super` 占键？字段怎么 `register`？重复字段会怎样？
- `prepare` 何时跑、字段如何 clone/freeze、`accept()` 和 HTTP 2xx 的先后？
- `dsh_plugin_packages` 默认开还是关？和 `dsh_session_log` 默认差在哪？
- Loader 的 group / disabled / 非 ACTIVE / `cordis:` / 无 name 的 loose 模块会不会进清单？
- 带 `sessionId` 时会不会把 standing preset 树并进 host 清单？preset 根 bare 包从哪解析？
- 卸掉 inventory 插件后请求还会不会带该字段？和 [`subsys.host.plugin-inventory`](../host/plugin-inventory.md) 是不是同一份投影？

## 职责边界

本页权威覆盖：

- 包 `@deepseek-ai/dsh-deepseek-llm-api-extensions` 与类 `DeepSeekLlmApiExtensionRegistry`。 [E: packages/llm/deepseek-llm-api-extensions/package.json:2] [E: packages/llm/deepseek-llm-api-extensions/src/index.ts:66]
- Cordis 键 `ctx.deepseekLlmApiExtensions`。 [E: packages/llm/deepseek-llm-api-extensions/src/index.ts:20] [E: packages/llm/deepseek-llm-api-extensions/src/index.ts:70]
- 可 declaration-merge 的 `DeepSeekLlmApiExtensionMap`、`register` / `prepare` / 联合 `accept`。 [E: packages/llm/deepseek-llm-api-extensions/src/types.ts:16] [E: packages/llm/deepseek-llm-api-extensions/src/index.ts:79] [E: packages/llm/deepseek-llm-api-extensions/src/index.ts:108]
- 包 `@deepseek-ai/dsh-plugin-package-inventory-deepseek`、plugin 名 `plugin-package-inventory-deepseek`、字段 `dsh_plugin_packages`。 [E: packages/llm/plugin-package-inventory-deepseek/package.json:2] [E: packages/llm/plugin-package-inventory-deepseek/src/index.ts:26] [E: packages/llm/plugin-package-inventory-deepseek/src/index.ts:190]

本页**不**拥有：

- `deepseek-official` 路由、`DeepSeekAdapter` HTTP/SSE — [`subsys.llm.deepseek`](./deepseek.md)。本页只点 adapter 如何 **消费** `prepare` / `accept`。
- `ctx.llm` / `registerAdapter` — [`subsys.llm.service`](./service.md)。
- `dsh_session_log` 水位线与 `session-log-deepseek/delivery-accepted` — [`subsys.persistence.session-log-deepseek`](../persistence/session-log-deepseek.md)。本页只把它当成第二个 field provider。
- Web 只读 Remote `ctx.pluginInventory`（`pluginInventory/list`）— [`subsys.host.plugin-inventory`](../host/plugin-inventory.md)。那是 Typert snapshot，**不**进官方 chat body。

所有权 / 冻结输出 / 一次 `accept` 在 registry 操作里强制；inventory 每次从 Loader fiber 与 `package.json` 现读。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/llm/deepseek-llm-api-extensions/src/index.ts` | `DeepSeekLlmApiExtensionRegistry`、`register`、`prepare`、`acceptAll` |
| `packages/llm/deepseek-llm-api-extensions/src/types.ts` | `DeepSeekLlmApiExtensionMap`、request / provider / prepared 合同 |
| `packages/llm/plugin-package-inventory-deepseek/src/index.ts` | `apply` 登记 `dsh_plugin_packages`；Loader 身份解析 |
| `packages/llm/plugin-package-inventory-deepseek/src/types.ts` | merge 字段类型 `DeepSeekPluginPackageInventoryExtension` |
| `packages/bundle/base/cordis.patch.yml` | host 行 `deepseek-llm-api-extensions` 与 `plugin-package-inventory-deepseek` |
| `packages/bundle/sdk-minimal/cordis.patch.yml` | 不叠 base 时仍 insert 同样两行 |
| `packages/llm/llm-deepseek/src/index.ts` | `prepareExtensions` 可选 `ctx.get('deepseekLlmApiExtensions')` |
| `packages/llm/llm-deepseek/src/adapter.ts` | 发 HTTP 前 merge 字段；2xx 后 `accept()` |

## 数据模型

`DeepSeekLlmApiExtensionRequest` 给 provider 看的是 **序列化之后、扩展字段之前** 的 base body，外加可选 `sessionId`、`purpose`（`'compaction' | 'session-title'`）和 `AbortSignal`。 [E: packages/llm/deepseek-llm-api-extensions/src/types.ts:19]

`PreparedDeepSeekLlmApiExtensions.fields` 是 `Partial<DeepSeekLlmApiExtensionMap>`；`accept()` 多次调用加入同一次 settlement。 [E: packages/llm/deepseek-llm-api-extensions/src/types.ts:51] [E: packages/llm/deepseek-llm-api-extensions/src/index.ts:127]

`dsh_plugin_packages` 的 wire 形状是 `{ version: 1, packages: { name, version }[] }`。 [E: packages/llm/plugin-package-inventory-deepseek/src/types.ts:10]

hub 的 `DeepSeekLlmApiExtensionMap` 初始为空对象；贡献包用 `declare module '.../types'` 并进自己的键。inventory 并的是 `dsh_plugin_packages`。 [E: packages/llm/deepseek-llm-api-extensions/src/types.ts:16] [E: packages/llm/plugin-package-inventory-deepseek/src/types.ts:16]

## 控制流

1. **占键。** `DeepSeekLlmApiExtensionRegistry` 作为 Cordis `Service` 挂 `deepseekLlmApiExtensions`。 [E: packages/llm/deepseek-llm-api-extensions/src/index.ts:70]
2. **独占登记。** `register(field, provider)` 走 `ctx.effect`：空/未 trim 的名字抛错；同名字段已在 map 里则 `already registered`；fiber dispose 时 `delete`。 [E: packages/llm/deepseek-llm-api-extensions/src/index.ts:85] [E: packages/llm/deepseek-llm-api-extensions/src/index.ts:91] [E: packages/llm/deepseek-llm-api-extensions/src/index.ts:95]
3. **Inventory `apply`。** `inject = ['agents', 'deepseekLlmApiExtensions', 'loader']`。`Config.enabled` 默认 `true`；`enabled === false` 则整段 return，不登记。 [E: packages/llm/plugin-package-inventory-deepseek/src/index.ts:28] [E: packages/llm/plugin-package-inventory-deepseek/src/index.ts:38] [E: packages/llm/plugin-package-inventory-deepseek/src/index.ts:187]
4. **Adapter 接线。** `dsh-llm-deepseek` 的 `apply` 把 `prepareExtensions` 接到 `ctx.get('deepseekLlmApiExtensions')?.prepare`；缺服务时返回空 `fields` 与 no-op `accept`。 [E: packages/llm/llm-deepseek/src/index.ts:465]
5. **请求前 `prepare`。** `DeepSeekAdapter` 在 `fetch` 之前调用 `prepareExtensions`，把 `sessionId` / `purpose` 从 `GenerateOptions` 抄进 request；prepare 失败变成 `LlmError` code `REQUEST_EXTENSION`。 [E: packages/llm/llm-deepseek/src/adapter.ts:621] [E: packages/llm/llm-deepseek/src/adapter.ts:628]
6. **并行 prepare。** registry 对当前 map 条目 `Promise.all`；`request.signal` abort 则停止等待（即使 provider Promise 永不 settle）。`undefined` 贡献被跳过。每个 `value` 先 `structuredClone` 再递归 `freeze`。 [E: packages/llm/deepseek-llm-api-extensions/src/index.ts:111] [E: packages/llm/deepseek-llm-api-extensions/src/index.ts:118] [E: packages/llm/deepseek-llm-api-extensions/src/index.ts:119]
7. **碰撞检查与发出。** adapter 禁止扩展键覆盖 base body 已有键，然后 `JSON.stringify({ ...body, ...extensions.fields })` POST `/chat/completions`。 [E: packages/llm/llm-deepseek/src/adapter.ts:630] [E: packages/llm/llm-deepseek/src/adapter.ts:637]
8. **2xx 后 `accept`。** 非 ok 不 `accept`；ok 后 `await extensions.accept()`，失败同样 `REQUEST_EXTENSION`。registry 用 `allSettled`：单失败原样抛、多失败 `AggregateError`。 [E: packages/llm/llm-deepseek/src/adapter.ts:695] [E: packages/llm/deepseek-llm-api-extensions/src/index.ts:46] [E: packages/llm/deepseek-llm-api-extensions/src/index.ts:47]

### `dsh_plugin_packages` 收集

`collectActivePluginPackages` 先扫 **host** `ctx.loader` 的 ACTIVE、非 group、非 disabled 条目。 [E: packages/llm/plugin-package-inventory-deepseek/src/index.ts:133] [E: packages/llm/plugin-package-inventory-deepseek/src/index.ts:157]

若 request 带 `sessionId` 且进程有 `agentPresets`，动态 `import` `standingMountFor`，把该 Agent 的 standing preset Loader 树也扫进去；preset **根** bare 行用 **host** `baseUrl` 解析（测试断言：preset 目录自己的 `node_modules` 版本会被忽略）。 [E: packages/llm/plugin-package-inventory-deepseek/src/index.ts:158] [E: packages/llm/plugin-package-inventory-deepseek/src/index.ts:167] [E: packages/llm/plugin-package-inventory-deepseek/tests/inventory.spec.ts:224]

身份规则（`PackageIdentityResolver`）：

- 裸包名 / scoped 子路径：在若干 `createRequire` search path 上找 `package.json`；找不到则 **prepare 失败**。 [E: packages/llm/plugin-package-inventory-deepseek/src/index.ts:115] [E: packages/llm/plugin-package-inventory-deepseek/src/index.ts:117]
- 相对/绝对 file 模块：最近 `package.json`；`name` 缺失且允许 anonymous 则 **省略**（loose）。manifest 有 name 但缺 version 则抛。 [E: packages/llm/plugin-package-inventory-deepseek/src/index.ts:63] [E: packages/llm/plugin-package-inventory-deepseek/src/index.ts:125]
- `cordis:` builtin 与非 `file:` URL **不进**清单。 [E: packages/llm/plugin-package-inventory-deepseek/src/index.ts:119]
- 去重键是 `name\0version`：同名不同 version **都保留**；排序是纯字符串比较，不依赖 ICU locale。 [E: packages/llm/plugin-package-inventory-deepseek/src/index.ts:174] [E: packages/llm/plugin-package-inventory-deepseek/src/index.ts:146]

缺 `sessionId`、session 对不上 live Agent、或 Agent 没有 standing preset：只报 host 树。 [E: packages/llm/plugin-package-inventory-deepseek/tests/inventory.spec.ts:113]

`agent-presets` 是 **optional peer**；inventory 用 `ctx.get('agentPresets')` 守卫动态 import。 [E: packages/llm/plugin-package-inventory-deepseek/package.json:53] [E: packages/llm/plugin-package-inventory-deepseek/src/index.ts:158]

## 装配

`dsh-base` 在 `id: llm` 之后 insert `id: deepseek-llm-api-extensions`（无 `config`），在 `id: agent` 之后 insert `id: plugin-package-inventory-deepseek`（无 `config`，因此 `enabled` 走 schema 默认 `true`）。 [E: packages/bundle/base/cordis.patch.yml:30] [E: packages/bundle/base/cordis.patch.yml:70]

同文件还 insert `id: session-log-deepseek`（默认 **不**贡献字段：该包 `enabled` 默认 `false`，必须显式 `true` 才 `register('dsh_session_log')`）。 [E: packages/bundle/base/cordis.patch.yml:36] [E: packages/session/session-log-deepseek/src/index.ts:25] [E: packages/session/session-log-deepseek/src/index.ts:71]

`dsh-sdk-minimal` 不叠 base，但同样 insert 扩展 registry、session-log-deepseek、plugin-package-inventory-deepseek。 [E: packages/bundle/sdk-minimal/cordis.patch.yml:17]

Inventory 插件 dispose / reload 会撤回字段（effect-scoped `register`）。 [E: packages/llm/plugin-package-inventory-deepseek/tests/inventory.spec.ts:227]

## 设计动机

官方 adapter 只做 **一次** prepare + **一次** 联合 accept，让各包拥有互不 overlap 的顶层 JSON 键，而不是改 `DeepSeekAdapter` 每加一个产品字段。字段值 clone+freeze，provider 不能事后改发出去的 body。 [E: packages/llm/deepseek-llm-api-extensions/src/index.ts:7] [E: packages/llm/deepseek-llm-api-extensions/src/index.ts:108]

插件清单给官方 API 的是 **npm 身份**（name+version），不是 Loader 行 id / fiberPhase；installed-but-inactive、group 结构行、无 provenance 的 fiber 都排除。 [E: packages/llm/plugin-package-inventory-deepseek/src/index.ts:8]

## Gotcha

- 扩展字段是 **模型服务看到的请求 JSON**，不是 session log 的 `request/header` 工具名；`model-visible ⟺ logged` 不覆盖这些键。
- `ctx.pluginInventory` 是另一条缝：给 trusted Web UI 列 Loader 行。两套都读 Loader，投影合同不同。
- `prepare` 失败发生在 HTTP 之前；`accept` 失败发生在 2xx 之后、SSE translate 之前。非 2xx 不 commit watermark / 其它 accept 回调。
- inventory 对「ACTIVE 裸包却找不到 manifest」是 **硬失败**，不是省略。 [E: packages/llm/plugin-package-inventory-deepseek/src/index.ts:117]
- 字段名空白或未 trim 在 `register` 时就炸，不会拖到请求。 [E: packages/llm/deepseek-llm-api-extensions/src/index.ts:85]
- registry 本身没有 plugin `Config`；关 `dsh_plugin_packages` 靠 inventory 行 `config.enabled: false`。

## Seam 三角

| 角色 | 实体 | 在哪 |
|---|---|---|
| **Definition** | `ctx.deepseekLlmApiExtensions` / `DeepSeekLlmApiExtensionRegistry` / 空的 `DeepSeekLlmApiExtensionMap` | `@deepseek-ai/dsh-deepseek-llm-api-extensions` [E: packages/llm/deepseek-llm-api-extensions/src/index.ts:70] |
| **Provider（字段）** | `dsh_plugin_packages` ← `plugin-package-inventory-deepseek`；`dsh_session_log` ← `session-log-deepseek`（默认关） | inventory `register` [E: packages/llm/plugin-package-inventory-deepseek/src/index.ts:190]；session-log [E: packages/session/session-log-deepseek/src/index.ts:72] |
| **Consumer** | `DeepSeekAdapter.prepareExtensions` → merge → 2xx `accept()` | `dsh-llm-deepseek` [E: packages/llm/llm-deepseek/src/index.ts:465] [E: packages/llm/llm-deepseek/src/adapter.ts:695] |

卸一个 field provider：该顶层键不再出现在 chat-completions body。卸整个 registry：adapter 走空 fields 分支，官方请求仍能发。换 `ctx.llm` adapter **不会**自动换这张表；pi-ai 路由不走这套 prepare。

## Sources

- `packages/llm/deepseek-llm-api-extensions/src/index.ts`
- `packages/llm/deepseek-llm-api-extensions/src/types.ts`
- `packages/llm/deepseek-llm-api-extensions/package.json`
- `packages/llm/deepseek-llm-api-extensions/tests/registry.spec.ts`
- `packages/llm/plugin-package-inventory-deepseek/src/index.ts`
- `packages/llm/plugin-package-inventory-deepseek/src/types.ts`
- `packages/llm/plugin-package-inventory-deepseek/package.json`
- `packages/llm/plugin-package-inventory-deepseek/tests/inventory.spec.ts`
- `packages/bundle/base/cordis.patch.yml`
- `packages/bundle/sdk-minimal/cordis.patch.yml`
- `packages/llm/llm-deepseek/src/index.ts`
- `packages/llm/llm-deepseek/src/adapter.ts`
- `packages/session/session-log-deepseek/src/index.ts`
- `packages/boot/app-boot/src/profile.ts`

## 相关

- [`subsys.llm.deepseek`](./deepseek.md) — `deepseek-official` adapter；本缝的 HTTP Consumer。
- [`subsys.llm.service`](./service.md) — `ctx.llm` hub；扩展表不是它的 directory。
- [`subsys.composition.bundle-base`](../composition/bundle-base.md) — base 插入两行 + `session-log-deepseek`。
- [`subsys.composition.bundle-sdk-minimal`](../composition/bundle-sdk-minimal.md) — 不叠 base 仍带同样行。
- [`subsys.host.plugin-inventory`](../host/plugin-inventory.md) — Web Typert 清单，不是 `dsh_plugin_packages`。
- [`subsys.persistence.session-log-deepseek`](../persistence/session-log-deepseek.md) — `dsh_session_log` 字段权威。
- [`spine.capability-seams`](../../spine/capability-seams.md) / [`ref.ctx-keys`](../../reference/ctx-keys.md) — 缝目录里的 `ctx.deepseekLlmApiExtensions` 行。
