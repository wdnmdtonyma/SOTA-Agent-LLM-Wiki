---
id: surface.providers.pi-ai
title: pi-ai 多协议路由
kind: surface
tier: T1
pkg: llm
source:
  - packages/llm/llm-pi-ai/src/index.ts
  - packages/llm/llm-pi-ai/src/adapter.ts
  - packages/llm/llm-pi-ai/src/config.ts
  - packages/llm/llm-pi-ai/src/catalog.ts
  - packages/llm/llm-pi-ai/src/discovery.ts
  - packages/llm/llm-pi-ai/package.json
  - packages/llm/llm-pi-ai/tests/dynamic-config.spec.ts
  - packages/llm/llm-pi-ai/tests/loader-composition.spec.ts
  - packages/llm/llm-pi-ai/tests/catalog.spec.ts
  - packages/llm/llm-pi-ai/tests/adapter.spec.ts
  - packages/llm/llm-pi-ai/tests/sdk-options.spec.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/base/package.json
  - packages/bundle/base/tests/base.spec.ts
  - packages/boot/app-boot/src/profile.ts
  - packages/llm/llm-deepseek/src/index.ts
  - packages/llm/llm/src/index.ts
  - packages/settings/settings/src/index.ts
  - packages/settings/settings/tests/settings.spec.ts
symbols:
  - PiAiAdapter
  - Config
  - ensureRegistrationFacts
related: []
evidence: explicit
status: verified
updated: 0a53fb55be
---

> `@deepseek-ai/dsh-llm-pi-ai` 是 **host 面** 的多协议 LLM 路由：一个插件实例按 dict 键挂多条 pi-ai provider。`dsh-base` **始终** insert `id: llm-pi-ai`（依赖也在），但 **零 adapter route**，直到 Settings 写出 `llm-pi-ai:` profiles，或后层 composition 显式给 `config.providers`。这是 settings 驱动的 **dormant**，不是「包没进依赖」。叠 `dsh-base` 的 shipped profile（`web` / `headless` / `sdk` / `acp`）都会带上这一行；`sdk-minimal` **不叠** `dsh-base`，其 patch 也不 insert 本包。默认对话路由仍是兄弟包 `dsh-llm-deepseek` 的 `deepseek-official`。本页是配置面 / 路由名 / 门控；adapter 内部走读在 [subsys.llm.pi-ai](../../subsystems/llm/pi-ai.md)。

## 能回答的问题

- `dsh-base` 为什么无条件 insert `id: llm-pi-ai`，却没有 `providers:` 块？dormant 和「包没装」差在哪？
- dormant 时 `listProviders()` 为什么是空，而 `listConfigurableProviders()` 仍可非空？
- Settings 清空走 `registration.replace([])` 还是 dispose 插件？`update({ providers: {} })` 能不能清掉 route？
- 用户把 profile 键写成 `deepseek-official` 会怎样？catalog 里那个 `deepseek` 是不是同一条路由？
- 一次 `stream()` 为什么把 SDK `maxRetries` 钉成 `0`？可见重试归谁？
- `openai-codex` 这种只走 OAuth 的 catalog 项现在会不会出现在 directory？

## 是什么

DeepSeek Harness 是 **Cordis 组合运行时**（`profile → bundle → agent preset`）。本包坐在 **host 面**，和 `ctx.llm` / `ctx.settings` / `ctx.credentials` 同一层。五个 shipped profile 里，`web` / `headless` / `sdk` / `acp` 的 `bundles` 都含 `@deepseek-ai/dsh-base`，因此叠进 `llm-pi-ai` 行；`sdk-minimal` 的 `bundles` 只有 `@deepseek-ai/dsh-sdk-minimal`。 [E: packages/boot/app-boot/src/profile.ts:139] [E: packages/boot/app-boot/src/profile.ts:143] [E: packages/boot/app-boot/src/profile.ts:155] 产品入口不只是 `dsh web`：还有 `dsh --profile headless|sdk|sdk-minimal|acp`。本包不进 agent-preset 的 tools / persona / isolate 树（shipped preset 目录是 `minimal` / `standard` / `ptc` / `cordis`）。

插件名 `llm-pi-ai`，`inject = ['llm']`，包名 `@deepseek-ai/dsh-llm-pi-ai`。 [E: packages/llm/llm-pi-ai/src/index.ts:89] [E: packages/llm/llm-pi-ai/src/index.ts:90] [E: packages/llm/llm-pi-ai/package.json:2] `apply` 建一个 adapter，按当前 `Config.providers` 决定要不要往 `ctx.llm` 登记 adapter route。dict 的 **键就是 route**（`GenerateOptions.provider` 用的那个字符串）。没有 `ctx.llm.route`。

三件不要混：

| 名字 | 谁拥有 | 何时成为 adapter route |
|---|---|---|
| `deepseek-official` | 兄弟包 `dsh-llm-deepseek` | load 时就 `registerAdapter([PROVIDER], adapter)`，`PROVIDER = 'deepseek-official'`，与本包无关 [E: packages/llm/llm-deepseek/src/index.ts:90] [E: packages/llm/llm-deepseek/src/index.ts:476] |
| `deepseek` | 本包 catalog（pi-ai 内置表） | 只有写出 `llm-pi-ai.providers.deepseek`（或 composition 同键）之后 [E: packages/llm/llm-pi-ai/tests/dynamic-config.spec.ts:104] [E: packages/llm/llm-pi-ai/tests/catalog.spec.ts:153] |
| 手写键（如 `acme-gateway`） | 本包，catalog 不认识 | profile 自列 `api` + `models` 之后；`declared: true` [E: packages/llm/llm-pi-ai/tests/catalog.spec.ts:147] |

两家能共存，正因为 catalog 键 **不叫** `deepseek-official`。新 Agent 默认仍是 `dsh-base` 写的 `deepseek-official` / `deepseek-v4-flash`。 [E: packages/bundle/base/cordis.patch.yml:78] [E: packages/bundle/base/cordis.patch.yml:79]

dormant ≠ 没装：行在、`package.json` 依赖在、`apply` 跑过、Models 页的 directory 在 dormant 时已经列出 **全部** 内置 catalog id（含 `openai-codex`）。只是 `listProviders()` 还没有本包的键。 [E: packages/bundle/base/cordis.patch.yml:107] [E: packages/bundle/base/package.json:67] [E: packages/llm/llm-pi-ai/tests/dynamic-config.spec.ts:89] [E: packages/llm/llm-pi-ai/tests/catalog.spec.ts:1202] 也不要把 Codex / Claude 子代理说成「像本包一样 dormant」——`dsh-base` 里那两行数为 0，manifest 也没有对应依赖，那是没装。 [E: packages/bundle/base/tests/base.spec.ts:42] [E: packages/bundle/base/tests/base.spec.ts:47]

## 入口

| 入口 | 行为 |
|---|---|
| `dsh-base` 行 `id: llm-pi-ai` | 无 `config:` / 无 `providers:`。插件加载，route 集为空。 [E: packages/bundle/base/cordis.patch.yml:107] [E: packages/bundle/base/cordis.patch.yml:108] |
| `$DSH_HOME/settings.yaml` 的 `llm-pi-ai:` | 用户层 profiles。真 Loader：往这里写 `providers.deepseek` 后 `listProviders()` 出现 `deepseek`。 [E: packages/llm/llm-pi-ai/tests/loader-composition.spec.ts:106] [E: packages/llm/llm-pi-ai/tests/loader-composition.spec.ts:118] |
| Web Models 页 | 写同一个 settings 命名空间；directory 的 `settingsNs` / `settingsPath` 指向 `llm-pi-ai` + `['providers', <route>]`。 [E: packages/llm/llm-pi-ai/src/index.ts:129] [E: packages/llm/llm-pi-ai/src/index.ts:130] |
| composition 整段 `Config` | `installSection` 第四参是整个 `config`（settings 把它当 `base: entry`），不是单独的 `config.providers`。[E: packages/llm/llm-pi-ai/src/index.ts:297] [E: packages/settings/settings/src/index.ts:480] `ensureRegistrationFacts` 在 `routes.length === 0` 时不 `registerAdapter`；有键才登记。[E: packages/llm/llm-pi-ai/src/index.ts:284] [E: packages/llm/llm-pi-ai/src/index.ts:288] |
| `ctx.llm.discoverModels('llm-pi-ai', …)` | 配置面「拉模型」：catalog 路由只读内置表；未知路由才拼 `GET …/models`。和有没有 adapter route 无关。 [E: packages/llm/llm-pi-ai/src/index.ts:261] [E: packages/llm/llm-pi-ai/src/discovery.ts:202] [E: packages/llm/llm-pi-ai/src/discovery.ts:87] |

## 关键字段

`Config` 只有一层有意义的部署键：`providers`。缺省 / 省略 = `{}` = dormant。 [E: packages/llm/llm-pi-ai/src/config.ts:222] [E: packages/llm/llm-pi-ai/src/config.ts:341] [E: packages/llm/llm-pi-ai/tests/dynamic-config.spec.ts:89]

| 键 / 符号 | 形状 | 门控 |
|---|---|---|
| `Config.providers` | `Record<route, PiAiProviderProfile>`，**键即 route** | 数组旧形 `Array.isArray` 直接拒。[E: packages/llm/llm-pi-ai/src/config.ts:389] `undefined` / `{}` 经 `Object.entries(providers ?? {})` 得到空 map。[E: packages/llm/llm-pi-ai/src/config.ts:392] |
| settings 命名空间 | `llm-pi-ai` | `const NS = 'llm-pi-ai'`；文档顶层键同名。 [E: packages/llm/llm-pi-ai/src/index.ts:92] |
| `settingsPath` | `['providers', provider]` | Models 页改的是这一格，不是 `llm-deepseek:`。 [E: packages/llm/llm-pi-ai/src/index.ts:130] |
| `declared` | catalog 成员？不是「有没有 profile」 | catalog 路由（含 `deepseek`、`openai-codex`）`false`；手写路由 `true`。 [E: packages/llm/llm-pi-ai/src/index.ts:134] [E: packages/llm/llm-pi-ai/tests/catalog.spec.ts:153] [E: packages/llm/llm-pi-ai/tests/catalog.spec.ts:1217] |
| `apiKeyEnv` | `CredentialRef` | 请求时解析。命名了但没命中 → `MISSING_CREDENTIAL`，不是 load 失败。 [E: packages/llm/llm-pi-ai/src/index.ts:189] |
| `api` / `baseURL` / `models` | 手写网关必填侧 | catalog 路由可省略（继承内置表）。未知键且不列 `models` → `resolves no models`，拒在写入处。 [E: packages/llm/llm-pi-ai/tests/dynamic-config.spec.ts:192] |
| `displayName` | 选择器标签 | 默认等于 route 键。 [E: packages/llm/llm-pi-ai/src/config.ts:435] 改名会重登记（`registrationFacts` 捕获它）。 [E: packages/llm/llm-pi-ai/src/index.ts:106] |
| `retryPolicy` | 本包只带值 | 有 route 时 `registerAdapter(routes, adapter)` 才把 adapter 写进 registry。[E: packages/llm/llm-pi-ai/src/index.ts:288] profile 上再写已删除的 `maxRetries` / `maxRetryDelayMs` 直接拒。[E: packages/llm/llm-pi-ai/src/config.ts:370] |
| 官方名 vs catalog 名 | `deepseek-official` ≠ `deepseek` | 默认不会撞 adapter 键。用户硬写键 `deepseek-official` 才进碰撞路径。 |

本页不枚举整张 pi-ai catalog。配置面只需要记住：dormant 时 directory 登记 **每一个** `catalogProviderIds()` 项（测试钉 `listConfigurableProviders().length > 30`，并含 `openai` **以及** OAuth-only 的 `openai-codex`）。 [E: packages/llm/llm-pi-ai/src/index.ts:137] [E: packages/llm/llm-pi-ai/src/catalog.ts:177] [E: packages/llm/llm-pi-ai/tests/dynamic-config.spec.ts:93] [E: packages/llm/llm-pi-ai/tests/catalog.spec.ts:1202]

## 装配与门控

1. **始终加载，零 route。** `dsh-base` 的行只有 `id` / `name`，没有 `providers:`。 [E: packages/bundle/base/cordis.patch.yml:107] [E: packages/bundle/base/cordis.patch.yml:108] `Config.providers` schema 缺省 `{}`。 [E: packages/llm/llm-pi-ai/src/config.ts:341] 裸挂后 `listProviders() === []`。 [E: packages/llm/llm-pi-ai/tests/dynamic-config.spec.ts:89] [E: packages/llm/llm-pi-ai/tests/loader-composition.spec.ts:106]

2. **directory 与 route 拆开。** `apply` 立刻 `ensureDirectory()`：`directoryEntries` 先把 **全部** catalog id 写进 `registerConfigurableProviders`，再并上当前 profiles 的手写键。 [E: packages/llm/llm-pi-ai/src/index.ts:226] [E: packages/llm/llm-pi-ai/src/index.ts:137] [E: packages/llm/llm-pi-ai/src/index.ts:138] [E: packages/llm/llm-pi-ai/src/index.ts:241] 同一次 `apply` 还 `registerModelDiscovery`。所以 dormant 时 Models 页已经有卡可点，包括只走登录流的 catalog 项。

3. **`ensureRegistrationFacts`：空集不 `registerAdapter`。** `routes = [...profiles().keys()]`。还没有 handle 且 `routes.length === 0` 时只记下 facts 然后 `return`。 [E: packages/llm/llm-pi-ai/src/index.ts:280] [E: packages/llm/llm-pi-ai/src/index.ts:284] [E: packages/llm/llm-pi-ai/src/index.ts:286] 这是故意的：`LlmRuntime.registerAdapter([])` 会抛 `INVALID_ADAPTER`。 [E: packages/llm/llm/src/index.ts:388] 第一次非空才 `registerAdapter(routes, adapter)`；之后同一实例 `registration.replace(routes)`。 [E: packages/llm/llm-pi-ai/src/index.ts:288] [E: packages/llm/llm-pi-ai/src/index.ts:290]

4. **Settings 清空 = `replace([])`，不是 dispose。** 用户层必须整段 `settings.replace('llm-pi-ai', {})`：这是去掉覆盖、回到 composition `base` 的路径。 [E: packages/settings/settings/src/index.ts:581] [E: packages/settings/settings/tests/settings.spec.ts:383] shipped 裸行的 `base` 是空 dict，于是 `routes` 变空；**已经拿过 handle** 就 `registration.replace([])`，`listProviders()` 回到 `[]`，插件仍在、directory 的 catalog 半边留下。 [E: packages/llm/llm-pi-ai/src/index.ts:290] [E: packages/llm/llm-pi-ai/tests/dynamic-config.spec.ts:112] [E: packages/llm/llm-pi-ai/tests/dynamic-config.spec.ts:113] [E: packages/llm/llm-pi-ai/tests/catalog.spec.ts:1190] `update({ providers: {} })` 走 `mergeLayers`：plain object 按键递归合并，空 dict **删不掉** 已有 route 键。 [E: packages/settings/settings/src/index.ts:287] [E: packages/settings/settings/src/index.ts:292] composition 自己带了 `providers` 时，清用户层只撤 overlay，`base` 那条继续服务。 [E: packages/llm/llm-pi-ai/tests/dynamic-config.spec.ts:140] [E: packages/llm/llm-pi-ai/tests/dynamic-config.spec.ts:141]

5. **抢名：整次 swap 拒绝，旧集合继续服务。** `prepareRoutes` 发现别的 registration 已占同一 provider 字符串，抛 `DUPLICATE_ADAPTER`。 [E: packages/llm/llm/src/index.ts:422] `onChange` 接住后打日志，**不**推进 `registeredFacts`。测试：外来 adapter 占着 `anthropic` 时再声明同名，结果仍是 `['anthropic', 'openai']`，openai 还能打到原 endpoint。 [E: packages/llm/llm-pi-ai/tests/dynamic-config.spec.ts:218] directory 同理：已有 `llm-deepseek` 声明 `deepseek-official` 时，本包再写同名只耗一条诊断，`settingsNs` 仍是 `llm-deepseek`，directory 长度不变。 [E: packages/llm/llm-pi-ai/tests/catalog.spec.ts:1166] [E: packages/llm/llm-pi-ai/tests/catalog.spec.ts:1168] 不可服务的 section（catalog 不认识且没列 `models`）在 `assertServiceable` 就拒写，旧 routes 不动。 [E: packages/llm/llm-pi-ai/tests/dynamic-config.spec.ts:192]

6. **SDK 不重试。** `PiAiAdapter` 每次调用钉 `maxRetries: 0`。 [E: packages/llm/llm-pi-ai/src/adapter.ts:130] [E: packages/llm/llm-pi-ai/tests/sdk-options.spec.ts:52] 可见次数与 backoff 归 `retryPolicy` + `dsh-llm-retry`（`agent/request-error`），不在本包里叠乘。

## 跨包关系

- `surface.providers.deepseek` — 官方路由名 `deepseek-official`，boot 即登记；本页只写它和 catalog 键 `deepseek` 的名字差。抢官方名：directory 保旧；同字符串的 adapter swap 整次拒绝。
- `surface.config.settings` — `llm-pi-ai` 是一个 settings 命名空间；三层 resolve、`replace({})` 回 `base`、`update` 按键合并。本页只写这个 ns 怎样变成活 route。
- `subsys.llm.pi-ai` — `PiAiAdapter.stream`、snapshot、waterfall、`llm/stream` 的 T2 走读。本页不复述请求管线。
- `spine.overview` — host 面 vs agent-preset 面。本包是 host 行，默认叠进叠 `dsh-base` 的 profile；`sdk-minimal` 例外。

## Sources

- packages/llm/llm-pi-ai/src/index.ts
- packages/llm/llm-pi-ai/src/adapter.ts
- packages/llm/llm-pi-ai/src/config.ts
- packages/llm/llm-pi-ai/src/catalog.ts
- packages/llm/llm-pi-ai/src/discovery.ts
- packages/llm/llm-pi-ai/package.json
- packages/llm/llm-pi-ai/tests/dynamic-config.spec.ts
- packages/llm/llm-pi-ai/tests/loader-composition.spec.ts
- packages/llm/llm-pi-ai/tests/catalog.spec.ts
- packages/llm/llm-pi-ai/tests/adapter.spec.ts
- packages/llm/llm-pi-ai/tests/sdk-options.spec.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/base/package.json
- packages/bundle/base/tests/base.spec.ts
- packages/boot/app-boot/src/profile.ts
- packages/llm/llm-deepseek/src/index.ts
- packages/llm/llm/src/index.ts
- packages/settings/settings/src/index.ts
- packages/settings/settings/tests/settings.spec.ts

## 相关

无 index related。邻居节点：

- [surface.providers.deepseek](../providers/deepseek.md) — 模型可见路由名 `deepseek-official`。
- [surface.config.settings](../config/settings.md) — `settings.yaml` 分层；本 ns 在空 profile 时零 route。
- [subsys.llm.pi-ai](../../subsystems/llm/pi-ai.md) — adapter 控制流与 seam 三角。
- [spine.overview](../../spine/overview.md) — Cordis 组合主线、host 面 vs agent-preset 面。
