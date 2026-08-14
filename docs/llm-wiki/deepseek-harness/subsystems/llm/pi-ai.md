---
id: subsys.llm.pi-ai
title: pi-ai adapter
kind: subsystem
tier: T2
pkg: llm
source:
  - packages/llm/llm-pi-ai/src/adapter.ts
  - packages/llm/llm-pi-ai/src/catalog.ts
  - packages/llm/llm-pi-ai/src/config.ts
  - packages/llm/llm-pi-ai/src/index.ts
  - packages/llm/llm-pi-ai/src/discovery.ts
  - packages/llm/llm-pi-ai/src/provider.ts
  - packages/llm/llm-pi-ai/package.json
  - packages/llm/llm-pi-ai/tests/dynamic-config.spec.ts
  - packages/llm/llm-pi-ai/tests/loader-composition.spec.ts
  - packages/llm/llm-pi-ai/tests/catalog.spec.ts
  - packages/llm/llm-pi-ai/tests/adapter.spec.ts
  - packages/llm/llm-pi-ai/tests/sdk-options.spec.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/base/package.json
  - packages/bundle/base/tests/base.spec.ts
  - packages/llm/llm-deepseek/src/index.ts
  - packages/llm/llm/src/index.ts
  - packages/settings/settings/src/index.ts
  - vendor/cordis/src/events.ts
symbols:
  - PiAiAdapter
  - ensureRegistrationFacts
  - Config
related:
  - spine.overview
  - spine.composition-boot
  - subsys.llm.service
  - subsys.llm.deepseek
  - subsys.llm.retry
  - subsys.core.agent-default-model
  - subsys.composition.bundle-base
  - surface.providers.pi-ai
  - surface.providers.deepseek
evidence: explicit
status: verified
updated: 47f943859b
---

> `@deepseek-ai/dsh-llm-pi-ai` 是 **host 面** 的多协议 LLM Provider：把 `@earendil-works/pi-ai` 接到 `ctx.llm`。`dsh-base` **始终** 加载插件行 `id: llm-pi-ai`，但 **零 adapter route**，直到 Settings 写出 `llm-pi-ai:` profiles，或 composition 显式给 `config.providers`。这是 settings 驱动的休眠，不是「包没进依赖」。默认对话路由是兄弟包的 `deepseek-official`，不是本包。

DSH 是 Cordis 组合运行时（`profile → bundle → agent preset`），不是「又一个 coding agent」。capability seam 是 Definition / Provider / Consumer。本包坐在 **host 面**（和 `ctx.llm` / `settings` / `credentials` 同一层），不进 agent-preset 的 tools / persona / isolate 树。没有 `ctx.llm.route`；route = `LlmRuntime` 私有 `adapters` map 的 provider 字符串键，调用方用 `GenerateOptions.provider`。

## 能回答的问题

- `dsh-base` 为什么无条件 insert `id: llm-pi-ai`，却没有 `providers:` 块？这和 Codex / Claude 后端「连行都没有」差在哪？
- dormant 时 `listProviders()` 为什么是空，而 `listConfigurableProviders()` 仍可非空？
- 谁第一次调用 `registerAdapter`？Settings 清空时走 `replace([])` 还是 dispose？
- 用户 profile 去抢 `deepseek-official` 会怎样？旧 routes 还在不在？
- 一次 `stream()` 为什么把 SDK `maxRetries` 钉成 `0`？重试归谁？
- 默认新 Agent 的 `provider` 是 `deepseek` 还是 `deepseek-official`？

## 职责边界

本包 `@deepseek-ai/dsh-llm-pi-ai` 拥有： [E: packages/llm/llm-pi-ai/package.json:2]

- 插件名 `llm-pi-ai`，`inject = ['llm']`。 [E: packages/llm/llm-pi-ai/src/index.ts:84] [E: packages/llm/llm-pi-ai/src/index.ts:85]
- `apply` 里的 `PiAiAdapter` 实例、settings 命名空间 `llm-pi-ai`、本地函数 `ensureRegistrationFacts` / `ensureDirectory`。 [E: packages/llm/llm-pi-ai/src/index.ts:87] [E: packages/llm/llm-pi-ai/src/index.ts:150] [E: packages/llm/llm-pi-ai/src/index.ts:253]
- `Config.providers`：route 键 → `PiAiProviderProfile`；缺省 / 空 dict = dormant。 [E: packages/llm/llm-pi-ai/src/config.ts:178] [E: packages/llm/llm-pi-ai/src/config.ts:256]
- 已安装 pi-ai catalog 的物化（`resolveRouteModels` / `catalogProviderTakesApiKey`）与手写 gateway 的 `buildProvider`。
- 配置面 discovery：`discoverModels` 对 catalog 路由只读内置表，对未知路由才 `GET /models`。 [E: packages/llm/llm-pi-ai/src/discovery.ts:195] [E: packages/llm/llm-pi-ai/src/discovery.ts:202]

本包 **不** 拥有：

- `ctx.llm` 本身、`registerAdapter` / `llm/stream` waterfall 合同 — [subsys.llm.service](./service.md)。
- 默认对话路由 `deepseek-official` 与官方 HTTP adapter — [subsys.llm.deepseek](./deepseek.md)。本包 catalog 里另有一个 **不同名** 的 `deepseek`，两家能共存。
- 默认 `provider` / `model` 选择 — [subsys.core.agent-default-model](../core/agent-default-model.md)。`dsh-base` 写的是 `deepseek-official` / `deepseek-v4-flash`。 [E: packages/bundle/base/cordis.patch.yml:66] [E: packages/bundle/base/cordis.patch.yml:67]
- 可见重试的 **执行**（`agent/request-error`）— [subsys.llm.retry](./retry.md)。本包只在 profile 上带 `retryPolicy` 值，并把 SDK 侧 `maxRetries` 钉死为 `0`。 [E: packages/llm/llm-pi-ai/src/adapter.ts:97]
- credentials 文档、settings 文件后端、Models 页 UI — 本包只消费 `ctx.credentials` / `ctx.settings`。
- Codex / Claude 子代理后端。那两家 **不是** 「像本包一样 dormant 加载」：`dsh-base` 没有对应行，manifest 也没有对应依赖。 [E: packages/bundle/base/tests/base.spec.ts:38] [E: packages/bundle/base/tests/base.spec.ts:39] [E: packages/bundle/base/tests/base.spec.ts:40] [E: packages/bundle/base/tests/base.spec.ts:41]

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/llm/llm-pi-ai/src/index.ts` | `apply`：directory、`ensureRegistrationFacts`、settings watcher |
| `packages/llm/llm-pi-ai/src/adapter.ts` | `PiAiAdapter`：snapshot、`stream`、SDK `maxRetries: 0` |
| `packages/llm/llm-pi-ai/src/config.ts` | `Config` / `resolveProfiles` / `assertServiceable` |
| `packages/llm/llm-pi-ai/src/catalog.ts` | 已安装 catalog 默认、`catalogProviderTakesApiKey` |
| `packages/llm/llm-pi-ai/src/provider.ts` | `buildProvider` / `supportedProtocols` |
| `packages/llm/llm-pi-ai/src/discovery.ts` | 配置面 `discoverModels` |
| `packages/llm/llm-pi-ai/tests/dynamic-config.spec.ts` | dormant、directory 非空、清空、撞名 |
| `packages/llm/llm-pi-ai/tests/loader-composition.spec.ts` | 真 Loader：裸行零 route，Settings 一写就注册 |
| `packages/bundle/base/cordis.patch.yml` | host 行：`id: llm-pi-ai`，无 `providers:` |
| `packages/llm/llm-deepseek/src/index.ts` | 对照：始终 `registerAdapter(['deepseek-official'], …)` |
| `packages/llm/llm/src/index.ts` | `registerAdapter` / `replace([])` / `llm/stream` waterfall |

## 数据模型

| 符号 / 键 | 落点 | 含义 |
|---|---|---|
| `Config.providers` | 插件 config + settings ns `llm-pi-ai` | dict 的 **键就是 route**。省略或 `{}` → `resolveProfiles` 得到空 map。 [E: packages/llm/llm-pi-ai/src/config.ts:178] [E: packages/llm/llm-pi-ai/src/config.ts:307] [E: packages/llm/llm-pi-ai/tests/adapter.spec.ts:700] |
| `ResolvedPiAiProviderProfile` | `resolveProfiles` | 已校验的单 route：`provider`、`displayName`、`retryPolicy`、`piProvider`、`configuredMaxTokens` |
| adapter route | `LlmRuntime` 私有 `adapters` | 只有 `registerAdapter` / `replace` 写进去的 provider 字符串。`listProviders()` 读这一层。仓库里没有 `ctx.llm.route`。 |
| directory entry | `registerConfigurableProviders` | Models 页可选的 provider 卡。dormant 时仍含 catalog 里带 api-key 方法的项。 [E: packages/llm/llm-pi-ai/src/index.ts:142] [E: packages/llm/llm-pi-ai/src/index.ts:143] |
| `settingsNs` / `settingsPath` | directory | 一律 `llm-pi-ai` + `['providers', provider]`。catalog 路由 `declared: false`；手写路由 `declared: true`。 [E: packages/llm/llm-pi-ai/src/index.ts:129] [E: packages/llm/llm-pi-ai/src/index.ts:134] |
| `PiAiSnapshot` | `PiAiAdapter.current` | 一份 immutable `profiles` + `Models`。配置变更建新 collection，飞行中的 stream 继续用它捕获的那份。 [E: packages/llm/llm-pi-ai/src/adapter.ts:204] [E: packages/llm/llm-pi-ai/src/adapter.ts:285] |
| catalog 名 `deepseek` | pi-ai 内置表 | 与官方路由 `deepseek-official` **刻意不同名**。前者只在本包写出 profile 之后才成为 adapter route。 |

## 控制流

1. **`dsh-base` 无条件挂上本包，且不给 `providers:`。** `cordis.patch.yml` 的行只有 `id: llm-pi-ai` 与 `name: '@deepseek-ai/dsh-llm-pi-ai'`，没有 `config:` 块。 [E: packages/bundle/base/cordis.patch.yml:95] [E: packages/bundle/base/cordis.patch.yml:96] manifest **依赖** `@deepseek-ai/dsh-llm-pi-ai`。 [E: packages/bundle/base/package.json:65] 对照：`subagent-codex` / `subagent-claude-code` 行数为 0，且不在 dependencies 里——那是「没装」，不是 dormant。 [E: packages/bundle/base/tests/base.spec.ts:38] [E: packages/bundle/base/tests/base.spec.ts:41] shipped preset 的 `agent.cordis.yml` 没有本包行；本行留在 host root，无 `isolate`。

2. **`apply@packages/llm/llm-pi-ai/src/index.ts` 先建 adapter，再铺 directory，最后才谈 route。** `new PiAiAdapter` 绑 `profiles` / `resolveApiKey` / `attachments`。 [E: packages/llm/llm-pi-ai/src/index.ts:200] 立刻 `ensureDirectory()`：`directoryEntries` 把 **catalog 中 `catalogProviderTakesApiKey` 为真** 的 id 登记进 `registerConfigurableProviders`，再并上当前 profiles 里的手写路由。 [E: packages/llm/llm-pi-ai/src/index.ts:226] [E: packages/llm/llm-pi-ai/src/catalog.ts:161] 裸挂 `{}` 时测试钉死 `listProviders() === []`，同时 `listConfigurableProviders().length > 30`（含 `openai` 等 catalog 卡）。 [E: packages/llm/llm-pi-ai/tests/dynamic-config.spec.ts:65] [E: packages/llm/llm-pi-ai/tests/dynamic-config.spec.ts:69] OAuth-only 的 `openai-codex` 默认 **不** 进 directory。 [E: packages/llm/llm-pi-ai/tests/catalog.spec.ts:948] 同一次 `apply` 还 `registerModelDiscovery(NS, discoverModels)`，与有没有 route 无关。 [E: packages/llm/llm-pi-ai/src/index.ts:246]

3. **`ensureRegistrationFacts@packages/llm/llm-pi-ai/src/index.ts`：零 route 就不 `registerAdapter`。** 它读 `routes = [...profiles().keys()]`。若还没有 `AdapterRegistrationHandle` 且 `routes.length === 0`，只记下 `registeredFacts` 然后 `return`，**不** 调用 `registerAdapter`。 [E: packages/llm/llm-pi-ai/src/index.ts:262] [E: packages/llm/llm-pi-ai/src/index.ts:266] [E: packages/llm/llm-pi-ai/src/index.ts:268] 这是故意的：`LlmRuntime.registerAdapter([])` 会抛 `INVALID_ADAPTER`（「an adapter must register at least one provider」）。 [E: packages/llm/llm/src/index.ts:346] `replace([])` 才合法，留给已经拿过 handle 的清空路径。 [E: packages/llm/llm/src/index.ts:364]

4. **profiles 从哪来：composition `config.providers` 或 settings `llm-pi-ai:`。** `Config` schema 把缺省 `providers` 收成 `{}`。 [E: packages/llm/llm-pi-ai/src/config.ts:256] `installSettingsSection` 把 composition 行当 `base`，用户文档叠在上面；`settings.update` 走 `mergeLayers`（plain object 递归合并，所以 dict 按 route 键叠加），`settings.replace({})` 退回 composition `base`。 [E: packages/settings/settings/src/index.ts:872] [E: packages/settings/settings/src/index.ts:297] shipped base 没有 `config.providers`，所以用户层一空就回到空 map。真 Loader 测试：裸 `id: llm-pi-ai` 启动后 `listProviders()` 为空；往 `settings.yaml` 写 `llm-pi-ai.providers.deepseek` 后出现 route `deepseek`。 [E: packages/llm/llm-pi-ai/tests/loader-composition.spec.ts:97] [E: packages/llm/llm-pi-ai/tests/loader-composition.spec.ts:109]

5. **有 route 之后：同一 adapter 实例 `registerAdapter` 或 `replace`。** 第一次非空 `routes` 走 `ctx.llm.registerAdapter(routes, adapter)`。 [E: packages/llm/llm-pi-ai/src/index.ts:270] 之后只 `registration.replace(routes)`——同一实例、先校验再一次性 commit，观察者看不到空窗。 [E: packages/llm/llm-pi-ai/src/index.ts:272] 捕获进 registry 的事实是 route 集合 + 每条 `displayName` + `retryPolicy`；仅重排 YAML 键不会 swap。 [E: packages/llm/llm-pi-ai/src/index.ts:101] [E: packages/llm/llm-pi-ai/src/index.ts:255] Settings 把 ns 清成 `{}` 时，shipped 姿态下 `routes` 变空，已有 handle 就 `replace([])`，`listProviders()` 回到 `[]`（dormant 活 registration）。 [E: packages/llm/llm-pi-ai/tests/dynamic-config.spec.ts:88] [E: packages/llm/llm-pi-ai/tests/dynamic-config.spec.ts:89] 若 composition 自己带了 `providers`（测试里的 `openai` 行），`replace(NS, {})` 只撤用户层，composition 那条继续服务。 [E: packages/llm/llm-pi-ai/tests/dynamic-config.spec.ts:116] [E: packages/llm/llm-pi-ai/tests/dynamic-config.spec.ts:117]

6. **撞名：整次 swap 拒绝，旧 routes / 旧 directory 继续服务。** `prepareRoutes` 发现别的 registration 已占同一 provider 字符串，抛 `DUPLICATE_ADAPTER`。 [E: packages/llm/llm/src/index.ts:380] `onChange` 包住 `ensureRegistrationFacts`：打 error 日志，**不** 推进 `registeredFacts`。 [E: packages/llm/llm-pi-ai/src/index.ts:296] 测试：外来 adapter 占着 `anthropic` 时，settings 再声明 `anthropic`，结果仍是 `['anthropic', 'openai']`，openai 还能打到原 endpoint。 [E: packages/llm/llm-pi-ai/tests/dynamic-config.spec.ts:194] directory 同理：已有 `llm-deepseek` 声明 `deepseek-official` 时，本包再声明同名只耗一条诊断，`settingsNs` 仍是 `llm-deepseek`，directory 长度不变。 [E: packages/llm/llm-pi-ai/tests/catalog.spec.ts:909] [E: packages/llm/llm-pi-ai/tests/catalog.spec.ts:911] 不可服务的 profile（catalog 不认识且没列 `models`）在 `assertServiceable` / `validate` 处就拒写，旧 routes 不动。 [E: packages/llm/llm-pi-ai/tests/dynamic-config.spec.ts:167] [E: packages/llm/llm-pi-ai/src/index.ts:282]

7. **请求路径：`GenerateOptions.provider` → 私有 `adapters` → `llm/stream` waterfall → `PiAiAdapter.stream`。** `LlmRuntime.registration` 按 provider 字符串取 map；没有就 `NO_ADAPTER`。 [E: packages/llm/llm/src/index.ts:818] `streamWithRegistration` 把 innermost 设成 `adapterStream`，外包 `ctx.waterfall(..., 'llm/stream', …)`。 [E: packages/llm/llm/src/index.ts:921] [E: packages/llm/llm/src/index.ts:925] Cordis `Events.waterfall` 把最后一个参数当 innermost `next`：监听器必须调用传入的 `next()` 才会 `shift` 到下一层；不调用就停在本层，adapter 根本不会跑。 [E: vendor/cordis/src/events.ts:237] [E: vendor/cordis/src/events.ts:238] 本包 **不** 自己挂 `llm/stream`。重试执行在 [subsys.llm.retry](./retry.md) 的 `agent/request-error`；本 adapter 每次 SDK 调用钉 `maxRetries: 0`。 [E: packages/llm/llm-pi-ai/src/adapter.ts:97] [E: packages/llm/llm-pi-ai/tests/sdk-options.spec.ts:50] `stream` 在任何 `await` 之前 `current()` 冻结 snapshot；`GenerateOptions.stop` 直接 `UNSUPPORTED_OPTION`。 [E: packages/llm/llm-pi-ai/src/adapter.ts:278] [E: packages/llm/llm-pi-ai/src/adapter.ts:285] 缺 `apiKeyEnv` 命中值是请求时 `MISSING_CREDENTIAL`，不是 load 失败。 [E: packages/llm/llm-pi-ai/src/index.ts:192]

8. **默认对话不走本包。** 兄弟插件写死 `PROVIDER = 'deepseek-official'`，load 时就 `registerAdapter([PROVIDER], adapter)`。 [E: packages/llm/llm-deepseek/src/index.ts:47] [E: packages/llm/llm-deepseek/src/index.ts:256] `agent-default-model` 的 composition 默认也是这对。dormant 的本包不会把 `deepseek` 或任何 catalog 名变成已注册 route。

## 设计动机

- **组合决定「适配器在不在树里」，settings 决定「哪些 provider 真跑」。** 把 `@deepseek-ai/dsh-llm-pi-ai` 留在 `dsh-base`，Models 页才能对着活着的 settings ns / directory 加卡；不必为每个第三方网关再改 bundle。零 route 避免空 adapter 污染 `listProviders()` 和默认 picker。
- **directory 与 route 拆开。** catalog API-key provider 在 dormant 时就要能被挑中；否则「先装包再写 settings」会变成「页面上没有可点的卡」。OAuth-only 项默认不展示，避免做出一张怎么配都会 `Provider is not configured` 的卡。
- **atomic `replace`，禁止 dispose-then-register。** 撞到 `deepseek-official` 时若先撤掉自己的 directory / routes，Models 页会空、已有 openai 路由会闪断。校验失败只打日志，旧集合继续服务。
- **SDK 不重试。** 可见次数与 backoff 属于 `retryPolicy` + `dsh-llm-retry`。profile 上残留的 `maxRetries` / `maxRetryDelayMs` 在 `resolveProfiles` 就拒绝，避免静默叠乘。 [E: packages/llm/llm-pi-ai/src/config.ts:285]
- **catalog 名不叫 `deepseek-official`。** 官方 HTTP 与 pi-ai 的 DeepSeek catalog 可以同时登记；抢同一个字符串才会被 registry 拒。

## Gotcha

- **dormant ≠ 没装。** 行在、依赖在、plugin `apply` 跑过、directory 可能已经有几十张 catalog 卡。只是 `adapters` map 里还没有本包的 provider 键。不要写成「零 directory / 零一切」。
- **dormant ≠ Codex / Claude 那种「包在仓库里」。** 那两家连 `dsh-base` 行都没有。本包是 settings 驱动休眠。
- **不要把本包当默认路由。** 新 Agent 默认是 `deepseek-official`。catalog 键 `deepseek` 要等 `llm-pi-ai:` 写出 profile 才成为 route。
- **清空 Settings 在 shipped 姿态下是 `replace([])`，不是卸插件。** 第一次挂上时根本不会 `registerAdapter([])`（那会抛错）。
- **composition 若写了 `config.providers`，清用户层不会回到零 route。** 只撤 overlay，`base` 里的键留下。
- **抢 `deepseek-official` 会失败，而且是整次 swap 失败。** 新键进不来，旧键也不掉。directory 碰撞同样保旧。
- **不可服务的 section 拒在写入处。** `assertServiceable` 调 `resolveProfiles`；手写路由必须自列 `models`，否则 `resolves no models`。
- **waterfall 不 `next()` = adapter 不跑。** 这是 Cordis 语义，不是「跳过重试继续打供应商」。
- **本行不要搬进 preset / `isolate`。** 它不 `provide` 新服务，只往 host `ctx.llm` 登记 route / directory；preset 再 `apply` 一次会第二次 `registerAdapter` / `registerConfigurableProviders`，撞 `DUPLICATE_ADAPTER` / `DUPLICATE_DIRECTORY`。
- **图片要 `attachments`。** 模型 `input` 含 `image` 且消息带图时，没有 durable attachment service 会 `UNSUPPORTED_CONTENT`。这与官方 adapter 拒绝图片是两条路。

## Seam 三角

| 角色 | 包 / 符号 | ctx 键 | bundle / preset 行 |
|---|---|---|---|
| Definition | `@deepseek-ai/dsh-llm` 的 `LlmRuntime`：`registerAdapter`、`registerConfigurableProviders`、`prepareCall` / `stream`、`llm/stream` waterfall | `ctx.llm` | **host** `dsh-base` `id: llm`。preset **不**挂 llm。没有 `ctx.llm.route`。 |
| Provider | 本包 `apply` + `PiAiAdapter` + `ensureRegistrationFacts`；settings ns `llm-pi-ai` | 不另开 `ctx.*`；往 `ctx.llm` 登记 route / directory | **host** `dsh-base` `id: llm-pi-ai`（无 `config.providers`，无 `isolate`）。**无** preset 行。活 overlays：`$DSH_HOME/settings.yaml` 的 `llm-pi-ai:`，或后层 composition 写 `config.providers`。 |
| Consumer | `ReactLoopAgent` / `prepareCall`（`GenerateOptions.provider`）；Web Models 页读 directory、写 settings；`discoverModels` | `ctx.llm`、`ctx.settings`、`ctx.credentials` | loop 在 host `id: agent-loop`。默认 consumer 选的是兄弟 Provider `id: llm-deepseek` 的 `deepseek-official`，不是本包。 |

换掉本行（`disabled: true` 或卸依赖）= Models 页失去 pi-ai catalog 卡与多协议 gateway；`deepseek-official` 仍在。只清空 `llm-pi-ai:` section = route 回到 dormant，directory 的 catalog 半边留下。换掉 `id: llm` 会带走所有 adapter，包括本包还没登记的能力缝。

## Sources

- packages/llm/llm-pi-ai/src/adapter.ts
- packages/llm/llm-pi-ai/src/catalog.ts
- packages/llm/llm-pi-ai/src/config.ts
- packages/llm/llm-pi-ai/src/index.ts
- packages/llm/llm-pi-ai/src/discovery.ts
- packages/llm/llm-pi-ai/src/provider.ts
- packages/llm/llm-pi-ai/package.json
- packages/llm/llm-pi-ai/tests/dynamic-config.spec.ts
- packages/llm/llm-pi-ai/tests/loader-composition.spec.ts
- packages/llm/llm-pi-ai/tests/catalog.spec.ts
- packages/llm/llm-pi-ai/tests/adapter.spec.ts
- packages/llm/llm-pi-ai/tests/sdk-options.spec.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/base/package.json
- packages/bundle/base/tests/base.spec.ts
- packages/llm/llm-deepseek/src/index.ts
- packages/llm/llm/src/index.ts
- packages/settings/settings/src/index.ts
- vendor/cordis/src/events.ts

## 相关

- [spine.overview](../../spine/overview.md) — Cordis 组合主线、host 面 vs agent-preset 面、`model-visible ⟺ logged`。
- [spine.composition-boot](../../spine/composition-boot.md) — `profile → bundle → preset`；`dsh-base` 是第一层 insert。
- [subsys.llm.service](./service.md) — `ctx.llm` / `registerAdapter` / `replace([])` / `llm/stream` waterfall。
- [subsys.llm.deepseek](./deepseek.md) — 始终登记的默认路由 `deepseek-official`。
- [subsys.llm.retry](./retry.md) — 可见重试执行；本包 SDK `maxRetries: 0`。
- [subsys.core.agent-default-model](../core/agent-default-model.md) — 新 Agent 默认 `deepseek-official` / `deepseek-v4-flash`。
- [subsys.composition.bundle-base](../composition/bundle-base.md) — host insert 全表；本行无 `providers:`；无 Codex / Claude 后端行。
- [surface.providers.pi-ai](../../surface/providers/pi-ai.md) — 配置面 / 多协议路由字段（T1）。
- [surface.providers.deepseek](../../surface/providers/deepseek.md) — 模型可见路由名 `deepseek-official`。
