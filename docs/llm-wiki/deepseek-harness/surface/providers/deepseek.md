---
id: surface.providers.deepseek
title: DeepSeek 官方路由
kind: surface
tier: T1
pkg: llm
source:
  - packages/llm/llm-deepseek-api-key/src/index.ts
  - packages/llm/llm-deepseek-account/src/index.ts
  - packages/llm/llm-deepseek/src/config.ts
  - packages/llm/llm-deepseek/src/models.ts
  - packages/llm/llm-deepseek/src/model-info.ts
  - packages/llm/llm-deepseek/src/adapter.ts
  - packages/llm/llm-deepseek/src/host.ts
  - packages/llm/llm-deepseek/package.json
  - packages/llm/llm-deepseek/tests/runtime.spec.ts
  - packages/llm/llm-deepseek/tests/assemble.ts
  - packages/llm/llm-deepseek/tests/account-routing.spec.ts
  - packages/llm/llm-deepseek-account/tests/provider.spec.ts
  - packages/llm/llm/src/index.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/base/package.json
  - packages/bundle/acp-app/cordis.patch.yml
  - packages/bundle/sdk-minimal/cordis.patch.yml
  - packages/core/agent-default-model/src/index.ts
  - packages/llm/llm-pi-ai/src/index.ts
  - packages/llm/llm-pi-ai/src/config.ts
  - packages/llm/llm-pi-ai/tests/catalog.spec.ts
  - packages/web/web-search-deepseek/src/index.ts
  - packages/web/web-search-deepseek/src/provider.ts
  - packages/sdk/client/src/api.ts
  - python/sdk/src/deepseek_harness/api.py
  - packages/boot/app-boot/src/profile.ts
  - apps/cli/src/args.ts
  - packages/credentials/deepseek-account-platform/src/index.ts
  - packages/client/ui-settings-models/src/client/index.ts
  - packages/client/ui-settings-models/src/client/store.ts
  - packages/client/ui-settings-models/src/client/CustomProviderCard.tsx
symbols:
  - deepseek-official
  - deepseek-account
  - DeepSeekAdapter
  - apply
related:
  - surface.providers.pi-ai
  - surface.config.settings
  - subsys.llm.deepseek
  - subsys.llm.service
  - spine.overview
evidence: explicit
status: verified
updated: 477b4f4205
---

> `deepseek-official` 是 DSH **host 面**默认对话路由：`@deepseek-ai/dsh-llm-deepseek-api-key` 的 `apply` 始终登记它（`x-api-key`）。同 host 另有 `deepseek-account`（`@deepseek-ai/dsh-llm-deepseek-account`，`x-dsh-auth-token`）。用户 / 模型看见的默认 `provider` 是 `deepseek-official`，**不是** pi-ai catalog 名 `deepseek`。缺 `DEEPSEEK_API_KEY` **不**拒载官方插件；未登录 **不**拒载账号插件。第一次请求才分别 `MISSING_CREDENTIAL` / `ACCOUNT_SIGN_IN_REQUIRED`。

## 能回答的问题

- 默认对话走哪条 route？和账号路由 / pi-ai catalog / Settings 里的 `deepseek` 差在哪？
- 缺 `DEEPSEEK_API_KEY` 或未登录会不会让插件 load 失败？catalog 没写的 model id 能不能发？
- 新 Agent 默认 `provider` / `model` 是谁写的？ACP / SDK 客户端默认还是不是 `deepseek-v4-flash`？
- Models 页能不能「创建」这条官方路由？账号卡排在哪？
- 图片块会怎样？`DEEPSEEK_BASE_URL` 管不管搜索？
- 这条路由在不在 agent-preset isolate 里？

## 是什么

DeepSeek Harness 是 **Cordis 组合运行时**（`profile → bundle → agent preset`）。`dsh web` 把第一个非 flag 参数展开成 `--profile web`。`PROFILE_TEMPLATES` 另有 `headless` / `sdk` / `sdk-minimal` / `acp`。**没有 `desktop`。** `web` 把 `@deepseek-ai/dsh-base` 叠上 `@deepseek-ai/dsh-web-app`。本仓没有 shipped TUI。[E: apps/cli/src/args.ts:200] [E: packages/boot/app-boot/src/profile.ts:179]

六个名字不要混：

| 名字 | 是什么 |
|---|---|
| yml `id: llm-deepseek` | `dsh-base` 的 host 行，`name: '@deepseek-ai/dsh-llm-deepseek-api-key'`（`sdk-minimal` 自己也 insert 同 id）[E: packages/bundle/base/cordis.patch.yml:524] |
| yml `id: llm-deepseek-account` | 账号 Provider 行 [E: packages/bundle/base/cordis.patch.yml:527] |
| 协议库 `@deepseek-ai/dsh-llm-deepseek` | Messages adapter；**没有** Cordis `apply` |
| settings ns `llm-deepseek` | 有 Loader 行时 = 该行 `id`；directory `settingsPath: []` [E: packages/llm/llm-deepseek-api-key/src/index.ts:37] |
| route 键 `deepseek-official` | API-key 写入 `adapters` 的 provider 字符串 [E: packages/llm/llm-deepseek-api-key/src/index.ts:15] |
| route 键 `deepseek-account` | 账号写入 `adapters` 的 provider 字符串 [E: packages/llm/llm-deepseek-account/src/index.ts:15] |

`DeepSeekAdapter` 是两条路由共用的实现：`fetch` `POST {messagesApiRoot(baseURL)}/messages`，SSE 流。官方显示名 `DeepSeek`，账号显示名 `DeepSeek Account`。[E: packages/llm/llm-deepseek/src/adapter.ts:120] [E: packages/llm/llm-deepseek-api-key/src/index.ts:37] [E: packages/llm/llm-deepseek-account/src/index.ts:40]

这是 **host 面** 服务。四个 shipped preset（`packages/bundle/web-app/presets/{minimal,standard,ptc,cordis}.patch.yml`）**没有** `id: llm-deepseek`，也没有给本包 `isolate:`。换 preset 不换这两条官方 / 账号路由。

**不是** pi-ai catalog 的 `deepseek`。`dsh-base` 始终挂 `@deepseek-ai/dsh-llm-pi-ai`，但 `Config.providers` 缺省 `{}`；`routes.length === 0` 时不 `registerAdapter`，零活 route，直到 Settings 写出 `llm-pi-ai.providers.<id>`。catalog 里的 `deepseek` 在 directory 上 `declared: false`。[E: packages/bundle/base/cordis.patch.yml:127] [E: packages/llm/llm-pi-ai/src/config.ts:353] [E: packages/llm/llm-pi-ai/src/index.ts:298] 细节见 [surface.providers.pi-ai](../providers/pi-ai.md)。

## 入口

用户碰到这两条路由的路径：

| 入口 | 行为 |
|---|---|
| 新 Agent 默认选择 | `dsh-base` 的 `id: agent-default-model` 写 `provider: deepseek-official`、`model: deepseek-flash`。默认 catalog 是 **`deepseek-flash` + `deepseek-v4-pro`**；`deepseek-v4-flash` 不在默认表，但仍可请求（按文本），也可写进 `models:` 与默认两条并存。ACP 插件行、TS SDK 构造、Python SDK dataclass **仍硬编码** `deepseek-v4-flash`。[E: packages/bundle/base/cordis.patch.yml:85] [E: packages/bundle/base/cordis.patch.yml:86] [E: packages/llm/llm-deepseek/src/models.ts:8] [E: packages/bundle/acp-app/cordis.patch.yml:21] [E: packages/sdk/client/src/api.ts:43] [E: python/sdk/src/deepseek_harness/api.py:23] |
| `dsh web` Models 页 | onboarding 步 `id: 'deepseek-official'`。directory 条目 `settingsNs: 'llm-deepseek'`、`settingsPath: []`。账号卡 `deepseek-account` 排在官方卡前面。手写「自定义提供方」卡片写入的 ns 是 `llm-pi-ai`，不是本段。[E: packages/client/ui-settings-models/src/client/index.ts:155] [E: packages/client/ui-settings-models/src/client/store.ts:68] [E: packages/client/ui-settings-models/src/client/CustomProviderCard.tsx:42] |
| profile patch / Settings 的 `llm-deepseek:` | 叠在组合 entry 的 Volatile Config 上；hot-reload 后下一请求生效。见 [surface.config.settings](../config/settings.md)。 |
| `$DSH_HOME/.credentials.yaml` / 启动环境 | API-key 配置只带引用 `apiKeyEnv`（默认 `DEEPSEEK_API_KEY`），不带字面 key。[E: packages/llm/llm-deepseek-api-key/src/config.ts:16] |
| 账号登录 | Platform PKCE 把 grant 写入 credentials；推理请求 `resolveToken(baseURL)`，origin 必须等于 `inferenceOrigin`（默认 `https://api.deepseek.com`）。[E: packages/credentials/deepseek-account-platform/src/index.ts:56] [E: packages/credentials/deepseek-account-platform/src/index.ts:375] |
| `DEEPSEEK_BASE_URL` | 缺 `config.baseURL` 时，从启动环境层取；再缺则 `https://api.deepseek.com/anthropic`。[E: packages/llm/llm-deepseek/src/config.ts:106] [E: packages/llm/llm-deepseek/src/config.ts:290] |
| `GenerateOptions.provider` | 调用方必须写 `'deepseek-official'` 或 `'deepseek-account'`。测试 helper 默认是前者。[E: packages/llm/llm-deepseek/tests/assemble.ts:20] 写成 `'deepseek'` 在默认树上是 `NO_ADAPTER`。[E: packages/llm/llm/src/index.ts:987] |

## 关键字段

协议 `Config` 与 settings 整段同一 shape。API-key 插件另加 `apiKeyEnv`。账号插件 **没有** `apiKeyEnv`。

| 字段 | 默认 / 约束 | 用户可见含义 |
|---|---|---|
| `apiKeyEnv`（仅官方） | `DEEPSEEK_API_KEY`（`role('credential-ref')`） | 每请求解析的凭据名 [E: packages/llm/llm-deepseek-api-key/src/config.ts:16] |
| `baseURL` | 省略 → `$DEEPSEEK_BASE_URL` → `https://api.deepseek.com/anthropic` | Messages 基址；后面拼 `/v1/messages`（已以 `/v1` 结尾则不再加） [E: packages/llm/llm-deepseek/src/config.ts:106] [E: packages/llm/llm-deepseek/src/adapter.ts:120] |
| `thinking` | 可选 `'enabled' \| 'disabled'` | `disabled` 时 advertised effort 只剩 `off` [E: packages/llm/llm-deepseek/src/config.ts:84] |
| `reasoningEffort` | 可选 `'off' \| 'low' \| 'high' \| 'max'`；advertised 缺省落到 `high` | `thinking: disabled` 时组合里只允许 `off`，否则 **load 失败、不注册** [E: packages/llm/llm-deepseek/src/config.ts:209] [E: packages/llm/llm-deepseek/src/model-info.ts:96] |
| `maxTokens` | `256_000` | 未列出 / 未单独封顶的模型的默认输出帽 |
| `defaultContextWindow` | `1_000_000` | catalog 没写容量、或 unlisted id 时的窗口 [E: packages/llm/llm-deepseek/src/model-info.ts:67] |
| `models` | 默认两条：`deepseek-flash`（V41，`inputModalities: ['text','image']`）/ `deepseek-v4-pro`（文本） | 选择器广告列表；`[]` 合法（广告为空）；可再写入 `deepseek-v4-flash` 与默认并存 [E: packages/llm/llm-deepseek/src/models.ts:6] [E: packages/llm/llm-deepseek/tests/runtime.spec.ts:1739] |
| `streamIdleTimeoutMs` | `300_000` | 单次 stream 读空闲上限 |
| `retryPolicy` | 省略用 llm 普通默认 | **唯一**会触发 `registration.replace` 的字段 [E: packages/llm/llm-deepseek/src/host.ts:46] |

catalog **只是广告**。`listModels('deepseek-official')` 给 Models / ACP 选择器；`resolveModel` 对未列出的 id 仍返回 `inputModalities: ['text']`。账号路由未登录时 `listModels('deepseek-account')` 返回 `[]`。[E: packages/llm/llm-deepseek/src/model-info.ts:73] [E: packages/llm/llm-deepseek-account/src/index.ts:48]

图片：catalog 声明 `image` 的模型（默认 **`deepseek-flash`**）走 Files API / inline image。**text-only** 模型（含默认表里的 `deepseek-v4-pro`、未列出的 `deepseek-v4-flash`、unlisted id）由 `LlmRuntime` 先把 image 投影成文本，不会当原生图发出。

**同名不同包。** `dsh-base` 的 `searchProvider: deepseek-official` 是 `@deepseek-ai/dsh-web-search-deepseek` 的 `DEEPSEEK_PROVIDER_ID`，走 Anthropic-compatible `/messages`，基址默认 `https://api.deepseek.com/anthropic/v1`，默认模型仍是 `deepseek-v4-flash`。chat 的 `$DEEPSEEK_BASE_URL` **不**给搜索用；搜索用 `$DEEPSEEK_SEARCH_BASE_URL`。改 `llm-deepseek.baseURL` 换不了搜索。[E: packages/bundle/base/cordis.patch.yml:474] [E: packages/web/web-search-deepseek/src/provider.ts:27] [E: packages/web/web-search-deepseek/src/provider.ts:34] [E: packages/web/web-search-deepseek/src/provider.ts:37] [E: packages/web/web-search-deepseek/src/index.ts:80]

## 装配与门控

1. **`dsh-base` 无条件 insert。** `id: llm-deepseek` / `id: llm-deepseek-account` / `id: deepseek-account`，**没有**内联 `config:`（账号 Platform 行除外），也没有 `isolate:`。manifest 依赖 api-key + account + platform 三包。`dsh-base` 同时 insert `id: llm-pi-ai`（dormant）和 `id: agent-default-model`（默认对准官方路由的 `deepseek-flash`）。[E: packages/bundle/base/cordis.patch.yml:524] [E: packages/bundle/base/package.json:62] [E: packages/bundle/base/cordis.patch.yml:127] [E: packages/bundle/base/cordis.patch.yml:82] [E: packages/bundle/base/cordis.patch.yml:86]

2. **boot 就注册两条活 route。** 各 `apply` 先 `options()` 校验连接事实（坏 catalog / `thinking: disabled` 配 `low`/`high`/`max` → **load 抛错、不注册**），再 `registerConfigurableProviders` + **无条件** `registerDeepSeekProvider`。没有「零 route」分支。[E: packages/llm/llm-deepseek-api-key/src/index.ts:19] [E: packages/llm/llm-deepseek-api-key/src/index.ts:39] [E: packages/llm/llm-deepseek-account/src/index.ts:42]

3. **缺 key / 未登录不拒载。** 空 `DEEPSEEK_API_KEY` 时官方 `listProviders` / `listModels` 仍成功（默认两条，含 `deepseek-flash`）。第一次官方 `stream` 才 `MISSING_CREDENTIAL`。账号未登录时 `listModels` 为空，第一次 `stream` 才 `ACCOUNT_SIGN_IN_REQUIRED`，**不**回落 API key。[E: packages/llm/llm-deepseek/tests/runtime.spec.ts:1738] [E: packages/llm/llm-deepseek/tests/account-routing.spec.ts:53] [E: packages/llm/llm-deepseek-account/tests/provider.spec.ts:34]

4. **Settings 是 Volatile overlay，不是开关。** `settings.configure({ auto: false })` 把 fiber Config 交给 Models 页。没挂 `ctx.settings` 时 entry 自己就是权威（环境里的 `DEEPSEEK_API_KEY` / `DEEPSEEK_BASE_URL` 仍解析）。改 `baseURL` / `models` / key **不**重注册；只有 `retryPolicy` 变了才 `replace([PROVIDER])`。[E: packages/llm/llm-deepseek/src/host.ts:21] [E: packages/llm/llm-deepseek/src/host.ts:46]

5. **preset 不挂、不 isolate。** 本行是进程级 host 服务。四个 shipped preset 只贡献 tools / persona / isolate。

6. **和 pi-ai 并排。** 官方 / 账号路由始终在；pi-ai 加 `providers.deepseek` 之后 `listProviders` 才会出现 `'deepseek'`。三家 route 键不同，默认可共存。若有人给 pi-ai 写 `providers.deepseek-official`，directory `replace` 被拒，旧 `settingsNs: 'llm-deepseek'` 条目继续服务。[E: packages/llm/llm-pi-ai/tests/catalog.spec.ts:1200]

HTTP / SSE / `llm/stream` waterfall 的内部步骤见 [subsys.llm.deepseek](../../subsystems/llm/deepseek.md) 与 [subsys.llm.service](../../subsystems/llm/service.md)。

## 跨包关系

- `surface.providers.pi-ai` — 始终加载、零 route 直到 Settings 加 profile；catalog 名 `deepseek`。本页只点名差异。
- `surface.config.settings` — ns `llm-deepseek` / `llm-deepseek-account` 的活 Config 与 Models 写路径。
- `subsys.llm.deepseek` — adapter 控制流、Messages serialize / SSE / retry 捕获、账号 token 门控。
- `subsys.llm.service` — `ctx.llm.registerAdapter`、私有 `adapters` map、`NO_ADAPTER`。
- `spine.overview` — host 面 vs agent-preset 面；默认 `dsh web`，另有 `dsh --profile sdk|sdk-minimal|acp|headless`。

## Sources

- packages/llm/llm-deepseek-api-key/src/index.ts
- packages/llm/llm-deepseek-account/src/index.ts
- packages/llm/llm-deepseek/src/config.ts
- packages/llm/llm-deepseek/src/models.ts
- packages/llm/llm-deepseek/src/model-info.ts
- packages/llm/llm-deepseek/src/adapter.ts
- packages/llm/llm-deepseek/src/host.ts
- packages/llm/llm-deepseek/package.json
- packages/llm/llm-deepseek/tests/runtime.spec.ts
- packages/llm/llm-deepseek/tests/assemble.ts
- packages/llm/llm-deepseek/tests/account-routing.spec.ts
- packages/llm/llm-deepseek-account/tests/provider.spec.ts
- packages/llm/llm/src/index.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/base/package.json
- packages/bundle/acp-app/cordis.patch.yml
- packages/bundle/sdk-minimal/cordis.patch.yml
- packages/core/agent-default-model/src/index.ts
- packages/llm/llm-pi-ai/src/index.ts
- packages/llm/llm-pi-ai/src/config.ts
- packages/llm/llm-pi-ai/tests/catalog.spec.ts
- packages/web/web-search-deepseek/src/index.ts
- packages/web/web-search-deepseek/src/provider.ts
- packages/sdk/client/src/api.ts
- python/sdk/src/deepseek_harness/api.py
- packages/boot/app-boot/src/profile.ts
- apps/cli/src/args.ts
- packages/credentials/deepseek-account-platform/src/index.ts
- packages/client/ui-settings-models/src/client/index.ts
- packages/client/ui-settings-models/src/client/store.ts
- packages/client/ui-settings-models/src/client/CustomProviderCard.tsx

## 相关

- [surface.providers.pi-ai](../providers/pi-ai.md)：`llm-pi-ai` 始终加载、零 route，直到 Settings 加 profile；catalog 名 `deepseek`。
- [surface.config.settings](../config/settings.md)：`llm-deepseek` settings 段与 Models / profile patch。
- [subsys.llm.deepseek](../../subsystems/llm/deepseek.md)：adapter 内部（Messages / 每请求快照 / 账号 token）。
- [subsys.llm.service](../../subsystems/llm/service.md)：`ctx.llm` 缝与 `registerAdapter`。
- [spine.overview](../../spine/overview.md)：Cordis 组合、host 面、默认 `dsh web` 与其它 shipped profile。
