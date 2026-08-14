---
id: surface.providers.deepseek
title: DeepSeek 官方路由
kind: surface
tier: T1
pkg: llm
source:
  - packages/llm/llm-deepseek/src/index.ts
  - packages/llm/llm-deepseek/src/adapter.ts
  - packages/llm/llm-deepseek/src/serialize.ts
  - packages/llm/llm-deepseek/package.json
  - packages/llm/llm-deepseek/tests/adapter.spec.ts
  - packages/llm/llm-deepseek/tests/dynamic-config.spec.ts
  - packages/llm/llm-deepseek/tests/serialize.spec.ts
  - packages/llm/llm-deepseek/tests/assemble.ts
  - packages/llm/llm/src/index.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/base/package.json
  - packages/core/agent-default-model/src/index.ts
  - packages/core/agent-default-model/tests/agent-default-model.spec.ts
  - packages/llm/llm-pi-ai/src/index.ts
  - packages/llm/llm-pi-ai/src/config.ts
  - packages/llm/llm-pi-ai/src/catalog.ts
  - packages/llm/llm-pi-ai/tests/catalog.spec.ts
  - packages/llm/llm-pi-ai/tests/dynamic-config.spec.ts
  - packages/settings/settings/src/index.ts
  - packages/web/web-search-deepseek/src/index.ts
  - packages/web/web-search-deepseek/src/provider.ts
  - packages/boot/app-boot/src/profile.ts
  - apps/cli/src/args.ts
  - apps/cli/config/agent-presets/minimal/agent.cordis.yml
  - apps/cli/config/agent-presets/standard/agent.cordis.yml
  - apps/cli/config/agent-presets/code/agent.cordis.yml
  - apps/cli/config/agent-presets/cordis/agent.cordis.yml
  - packages/client/ui-settings-models/src/client/index.ts
  - packages/client/ui-settings-models/src/client/ProviderEditor.tsx
  - packages/client/ui-settings-models/src/client/CustomProviderCard.tsx
symbols:
  - deepseek-official
  - DeepSeekAdapter
  - apply
related: []
evidence: explicit
status: verified
updated: 47f943859b
---

> `deepseek-official` 是 DSH **host 面**默认对话路由：`@deepseek-ai/dsh-llm-deepseek` 的 `apply` 始终 `registerAdapter(['deepseek-official'], …)`。用户 / 模型看见的默认 `provider` 是这个字符串，**不是** pi-ai catalog 名 `deepseek`。缺 `DEEPSEEK_API_KEY` **不**拒载插件；第一次请求才 `MISSING_CREDENTIAL`。

## 能回答的问题

- 默认对话走哪条 route？和 pi-ai catalog / Settings 里的 `deepseek` 差在哪？
- 缺 `DEEPSEEK_API_KEY` 会不会让插件 load 失败？catalog 没写的 model id 能不能发？
- settings 命名空间 `llm-deepseek` 改 base URL / catalog / key 要不要重启？
- 新 Agent 默认 `provider` / `model` 是谁写的？Models 页能不能「创建」这条官方路由？
- 图片块会怎样？`DEEPSEEK_BASE_URL` 管不管搜索？
- 这条路由在不在 agent-preset isolate 里？默认产品路径是什么？

## 是什么

DeepSeek Harness 是 **Cordis 组合运行时**（`profile → bundle → agent preset`），默认产品路径是本地 Web GUI：`dsh web` ≡ `--profile web`。`PROFILE_TEMPLATES.web` 把 `@deepseek-ai/dsh-base` 叠上 `@deepseek-ai/dsh-web-app`。本仓没有 shipped TUI。[E: apps/cli/src/args.ts:156] [E: packages/boot/app-boot/src/profile.ts:115]

四个名字不要混：

| 名字 | 是什么 |
|---|---|
| yml `id: llm-deepseek` | `dsh-base` 的 host 行 |
| 包 `@deepseek-ai/dsh-llm-deepseek` | Cordis 插件，`name = 'llm-deepseek'`，`inject = ['llm']` [E: packages/llm/llm-deepseek/package.json:2] [E: packages/llm/llm-deepseek/src/index.ts:41] [E: packages/llm/llm-deepseek/src/index.ts:42] |
| settings ns `llm-deepseek` | 用户文档整段 = 一个 profile（directory `settingsPath: []`）[E: packages/llm/llm-deepseek/src/index.ts:44] [E: packages/llm/llm-deepseek/src/index.ts:252] |
| route 键 `deepseek-official` | `ctx.llm` 私有 `adapters` map 的 provider 字符串；`GenerateOptions.provider` 必须写这个才命中 [E: packages/llm/llm-deepseek/src/index.ts:47] [E: packages/llm/llm-deepseek/src/index.ts:256] |

`DeepSeekAdapter` 是这条路由的实现：`fetch` `POST {baseURL}/chat/completions`，SSE 流。显示名 `DeepSeek`。[E: packages/llm/llm-deepseek/src/adapter.ts:158] [E: packages/llm/llm-deepseek/src/adapter.ts:164] [E: packages/llm/llm-deepseek/src/adapter.ts:301]

这是 **host 面** 服务，和 `ctx.llm` / `ctx.settings` / `ctx.credentials` 同一层。四个 shipped preset 末条分别是 `str-replace-editor` / `tool-web` / `tool-presentation` / `tool-skill`，**没有** `id: llm-deepseek`，也没有给本包 `isolate:`。换 preset 不换这条官方路由。[E: packages/bundle/base/cordis.patch.yml:450] [E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:59] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:247] [E: apps/cli/config/agent-presets/code/agent.cordis.yml:259] [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:261]

**不是** pi-ai catalog 的 `deepseek`。`dsh-base` 始终挂 `@deepseek-ai/dsh-llm-pi-ai`，但 `Config.providers` 缺省 `{}`；`routes.length === 0` 时不 `registerAdapter`，零活 route，直到 Settings 写出 `llm-pi-ai.providers.<id>`。catalog 里的 `deepseek` 在 directory 上 `declared: false`（shipped 名，不是已声明的自定义路由）。[E: packages/bundle/base/cordis.patch.yml:95] [E: packages/llm/llm-pi-ai/src/config.ts:256] [E: packages/llm/llm-pi-ai/src/index.ts:266] [E: packages/llm/llm-pi-ai/tests/catalog.spec.ts:153] 细节见 [surface.providers.pi-ai](../providers/pi-ai.md)。

## 入口

用户碰到这条官方路由的路径：

| 入口 | 行为 |
|---|---|
| 新 Agent 默认选择 | `dsh-base` 的 `id: agent-default-model` 写 `provider: deepseek-official`、`model: deepseek-v4-flash`。settings ns `agent-default-model` 可覆盖。[E: packages/bundle/base/cordis.patch.yml:66] [E: packages/bundle/base/cordis.patch.yml:67] [E: packages/core/agent-default-model/src/index.ts:21] [E: packages/core/agent-default-model/tests/agent-default-model.spec.ts:47] |
| `dsh web` Models 页 | onboarding 步 `id: 'deepseek-official'`。directory 条目 `settingsNs: 'llm-deepseek'`、`settingsPath: []`。手写「自定义提供方」卡片写入的 ns 是 `llm-pi-ai`，不是本段。[E: packages/client/ui-settings-models/src/client/index.ts:133] [E: packages/llm/llm-deepseek/src/index.ts:252] [E: packages/client/ui-settings-models/src/client/CustomProviderCard.tsx:37] [E: packages/client/ui-settings-models/src/client/ProviderEditor.tsx:338] |
| `$DSH_HOME/settings.yaml` 的 `llm-deepseek:` | 叠在组合 entry 上；hot-reload 后下一请求生效。见 [surface.config.settings](../config/settings.md)。[E: packages/llm/llm-deepseek/src/index.ts:270] |
| `$DSH_HOME/.credentials.yaml` / 启动环境 | 配置只带引用 `apiKeyEnv`（默认 `DEEPSEEK_API_KEY`），不带字面 key。[E: packages/llm/llm-deepseek/src/index.ts:92] |
| `DEEPSEEK_BASE_URL` | 缺 `config.baseURL` 时，从启动环境层取；再缺则 `https://api.deepseek.com`。[E: packages/llm/llm-deepseek/src/index.ts:104] [E: packages/llm/llm-deepseek/src/index.ts:185] [E: packages/llm/llm-deepseek/src/index.ts:186] [E: packages/llm/llm-deepseek/src/index.ts:187] |
| `GenerateOptions.provider` | 调用方必须写 `'deepseek-official'`。测试 helper 默认就是这个键。[E: packages/llm/llm-deepseek/tests/assemble.ts:20] 写成 `'deepseek'` 在默认树上是 `NO_ADAPTER`（那条 route 要等 pi-ai Settings profile）。[E: packages/llm/llm/src/index.ts:818] |

## 关键字段

`Config` 与 settings 整段同一 shape。没有字面 `apiKey` 字段。

| 字段 | 默认 / 约束 | 用户可见含义 |
|---|---|---|
| `apiKeyEnv` | `DEEPSEEK_API_KEY`（`role('credential-ref')`） | 每请求解析的凭据名 [E: packages/llm/llm-deepseek/src/index.ts:92] |
| `baseURL` | 省略 → `$DEEPSEEK_BASE_URL` → `https://api.deepseek.com` | chat-completions 基址；后面拼 `/chat/completions` [E: packages/llm/llm-deepseek/src/index.ts:104] [E: packages/llm/llm-deepseek/src/adapter.ts:301] |
| `thinking` | 可选 `'enabled' \| 'disabled'` | `disabled` 时 advertised effort 只剩 `off` [E: packages/llm/llm-deepseek/src/index.ts:94] |
| `reasoningEffort` | 可选 `'off' \| 'high' \| 'max'`；advertised 缺省落到 `high` | `thinking: disabled` 时组合里只允许 `off`，否则 **load 失败、不注册** [E: packages/llm/llm-deepseek/src/index.ts:95] [E: packages/llm/llm-deepseek/src/adapter.ts:208] [E: packages/llm/llm-deepseek/src/index.ts:165] |
| `maxTokens` | `256_000` | 未列出 / 未单独封顶的模型的默认输出帽 [E: packages/llm/llm-deepseek/src/index.ts:96] [E: packages/llm/llm-deepseek/src/adapter.ts:93] |
| `defaultContextWindow` | `1_000_000` | catalog 没写容量、或 unlisted id 时的窗口 [E: packages/llm/llm-deepseek/src/index.ts:97] [E: packages/llm/llm-deepseek/src/adapter.ts:91] |
| `models` | `deepseek-v4-flash` / `deepseek-v4-pro`（名 `DeepSeek-V4-Flash` / `DeepSeek-V4-Pro`） | 选择器广告列表；`[]` 合法（广告为空）[E: packages/llm/llm-deepseek/src/index.ts:50] [E: packages/llm/llm-deepseek/src/index.ts:51] [E: packages/llm/llm-deepseek/src/index.ts:98] [E: packages/llm/llm-deepseek/tests/adapter.spec.ts:821] |
| `streamIdleTimeoutMs` | `300_000` | 单次 stream 读空闲上限 [E: packages/llm/llm-deepseek/src/index.ts:99] [E: packages/llm/llm-deepseek/src/adapter.ts:89] |
| `retryPolicy` | 省略用 llm 普通默认 | **唯一**会触发 `registration.replace` 的字段 [E: packages/llm/llm-deepseek/src/index.ts:100] [E: packages/llm/llm-deepseek/src/index.ts:266] |

catalog **只是广告**。`listModels('deepseek-official')` 给 Models / ACP 选择器；`resolveModel` 对未列出的 id 仍返回 `inputModalities: ['text']`，`serializeRequest` 把 `options.model` 原样写成 wire `model`。测试用未列入的 `'m'` 也能发出请求。[E: packages/llm/llm-deepseek/src/adapter.ts:172] [E: packages/llm/llm-deepseek/src/adapter.ts:190] [E: packages/llm/llm-deepseek/src/serialize.ts:174] [E: packages/llm/llm-deepseek/tests/adapter.spec.ts:787] [E: packages/llm/llm-deepseek/tests/adapter.spec.ts:1019]

图片：core `image` 块在 `serializeMessages` 里抛 `LlmError` `UNSUPPORTED_CONTENT`，不会被 flatten 成空文本。[E: packages/llm/llm-deepseek/src/serialize.ts:66] [E: packages/llm/llm-deepseek/tests/serialize.spec.ts:146]

**同名不同包。** `dsh-base` 的 `searchProvider: deepseek-official` 是 `@deepseek-ai/dsh-web-search-deepseek` 的 `DEEPSEEK_PROVIDER_ID`，走 Anthropic-compatible `/messages`，基址默认 `https://api.deepseek.com/anthropic/v1`。chat 的 `$DEEPSEEK_BASE_URL` **不**给搜索用；搜索用 `$DEEPSEEK_SEARCH_BASE_URL`。改 `llm-deepseek.baseURL` 换不了搜索。[E: packages/bundle/base/cordis.patch.yml:407] [E: packages/web/web-search-deepseek/src/provider.ts:27] [E: packages/web/web-search-deepseek/src/provider.ts:35] [E: packages/web/web-search-deepseek/src/index.ts:82] [E: packages/web/web-search-deepseek/src/index.ts:111]

## 装配与门控

1. **`dsh-base` 无条件 insert。** `id: llm-deepseek` / `name: '@deepseek-ai/dsh-llm-deepseek'`，**没有**内联 `config:`，也没有 `isolate:`。manifest 依赖本包。`dsh-base` 同时 insert `id: llm-pi-ai`（dormant）和 `id: agent-default-model`（默认对准本路由）。[E: packages/bundle/base/cordis.patch.yml:450] [E: packages/bundle/base/cordis.patch.yml:451] [E: packages/bundle/base/package.json:64] [E: packages/bundle/base/cordis.patch.yml:95] [E: packages/bundle/base/cordis.patch.yml:66]

2. **boot 就注册活 route。** `apply` 先 `options()` 校验连接事实（坏 catalog / `thinking: disabled` 配 `high`/`max` → **load 抛错、不注册**），再 `registerConfigurableProviders` + **无条件** `registerAdapter(['deepseek-official'], adapter)`。没有「零 route」分支。[E: packages/llm/llm-deepseek/src/index.ts:223] [E: packages/llm/llm-deepseek/src/index.ts:251] [E: packages/llm/llm-deepseek/src/index.ts:256] [E: packages/llm/llm-deepseek/tests/adapter.spec.ts:729]

3. **缺 key 不拒载。** 空 `DEEPSEEK_API_KEY` 时 `listProviders` / `listModels` 仍成功（默认两条 V4）。第一次 `stream` 才 `MISSING_CREDENTIAL`，文案同时点名 credentials 服务和 `export DEEPSEEK_API_KEY`。存上 key 后下一请求就能打，不用重启。[E: packages/llm/llm-deepseek/tests/adapter.spec.ts:920] [E: packages/llm/llm-deepseek/tests/adapter.spec.ts:921] [E: packages/llm/llm-deepseek/tests/adapter.spec.ts:923] [E: packages/llm/llm-deepseek/src/index.ts:244] [E: packages/llm/llm-deepseek/tests/dynamic-config.spec.ts:89] [E: packages/llm/llm-deepseek/tests/dynamic-config.spec.ts:93]

4. **Settings 是 overlay，不是开关。** `installSettingsSection` 把组合 entry 当 `base`。没挂 `ctx.settings` 时 entry 自己就是权威（环境里的 `DEEPSEEK_API_KEY` / `DEEPSEEK_BASE_URL` 仍解析）。改 `baseURL` / `models` / key **不**重注册；只有 `retryPolicy` 变了才 `replace(['deepseek-official'])`，观察者看不到空窗口。[E: packages/llm/llm-deepseek/src/index.ts:270] [E: packages/llm/llm-deepseek/src/index.ts:266] [E: packages/llm/llm-deepseek/tests/dynamic-config.spec.ts:73] [E: packages/llm/llm-deepseek/tests/dynamic-config.spec.ts:149]

5. **preset 不挂、不 isolate。** 本行是进程级 host 服务。四个 shipped preset 只贡献 tools / persona / isolate；末条分别是 `str-replace-editor` / `tool-web` / `tool-presentation` / `tool-skill`。[E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:59] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:247] [E: apps/cli/config/agent-presets/code/agent.cordis.yml:259] [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:261]

6. **和 pi-ai 并排。** 官方路由始终在；pi-ai 加 `providers.deepseek` 之后 `listProviders` 才会出现 `'deepseek'`。两家 route 键不同，默认可共存。若有人给 pi-ai 写 `providers.deepseek-official`，directory `replace` 被拒，旧 `settingsNs: 'llm-deepseek'` 条目继续服务。[E: packages/llm/llm-pi-ai/tests/dynamic-config.spec.ts:80] [E: packages/llm/llm-pi-ai/tests/catalog.spec.ts:892] [E: packages/llm/llm-pi-ai/tests/catalog.spec.ts:910]

HTTP / SSE / `llm/stream` waterfall 的内部步骤见 [subsys.llm.deepseek](../../subsystems/llm/deepseek.md) 与 [subsys.llm.service](../../subsystems/llm/service.md)。

## 跨包关系

- `surface.providers.pi-ai` — 始终加载、零 route 直到 Settings 加 profile；catalog 名 `deepseek`。本页只点名差异。
- `surface.config.settings` — ns `llm-deepseek` 的三层 resolve 与 Models 写路径；本页只写官方路由怎样把 entry 当 `base`。
- `subsys.llm.deepseek` — adapter 控制流、serialize / SSE / retry 捕获。
- `subsys.llm.service` — `ctx.llm.registerAdapter`、私有 `adapters` map、`NO_ADAPTER`。
- `spine.overview` — host 面 vs agent-preset 面；默认 `dsh web`。

## Sources

- packages/llm/llm-deepseek/src/index.ts
- packages/llm/llm-deepseek/src/adapter.ts
- packages/llm/llm-deepseek/src/serialize.ts
- packages/llm/llm-deepseek/package.json
- packages/llm/llm-deepseek/tests/adapter.spec.ts
- packages/llm/llm-deepseek/tests/dynamic-config.spec.ts
- packages/llm/llm-deepseek/tests/serialize.spec.ts
- packages/llm/llm-deepseek/tests/assemble.ts
- packages/llm/llm/src/index.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/base/package.json
- packages/core/agent-default-model/src/index.ts
- packages/core/agent-default-model/tests/agent-default-model.spec.ts
- packages/llm/llm-pi-ai/src/index.ts
- packages/llm/llm-pi-ai/src/config.ts
- packages/llm/llm-pi-ai/src/catalog.ts
- packages/llm/llm-pi-ai/tests/catalog.spec.ts
- packages/llm/llm-pi-ai/tests/dynamic-config.spec.ts
- packages/settings/settings/src/index.ts
- packages/web/web-search-deepseek/src/index.ts
- packages/web/web-search-deepseek/src/provider.ts
- packages/boot/app-boot/src/profile.ts
- apps/cli/src/args.ts
- apps/cli/config/agent-presets/minimal/agent.cordis.yml
- apps/cli/config/agent-presets/standard/agent.cordis.yml
- apps/cli/config/agent-presets/code/agent.cordis.yml
- apps/cli/config/agent-presets/cordis/agent.cordis.yml
- packages/client/ui-settings-models/src/client/index.ts
- packages/client/ui-settings-models/src/client/ProviderEditor.tsx
- packages/client/ui-settings-models/src/client/CustomProviderCard.tsx

## 相关

无 index related。邻居节点：

- [surface.providers.pi-ai](../providers/pi-ai.md)：`llm-pi-ai` 始终加载、零 route，直到 Settings 加 profile；catalog 名 `deepseek`。
- [surface.config.settings](../config/settings.md)：`llm-deepseek` settings 段与 Models / `settings.yaml`。
- [subsys.llm.deepseek](../../subsystems/llm/deepseek.md)：adapter 内部（serialize / SSE / 每请求快照）。
- [subsys.llm.service](../../subsystems/llm/service.md)：`ctx.llm` 缝与 `registerAdapter`。
- [spine.overview](../../spine/overview.md)：Cordis 组合、host 面、默认 `dsh web`。
