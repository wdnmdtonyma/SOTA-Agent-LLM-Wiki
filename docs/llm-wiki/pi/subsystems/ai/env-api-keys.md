---
id: subsys.ai.env-api-keys
title: 环境变量解析
kind: subsystem
tier: T2
pkg: ai
source:
  - packages/ai/src/env-api-keys.ts
  - packages/ai/src/utils/provider-env.ts
symbols:
  - getApiKeyEnvVars
  - hasVertexAdcCredentials
related:
  - subsys.ai.auth-resolution
  - ref.coding-agent.env-vars
evidence: explicit
status: verified
updated: 5a073885
---

> `subsys.ai.env-api-keys` 描述 `pi-ai` 的环境凭证探测层:它把 provider id 映射到可用的 API key 环境变量,按统一规则读取 provider-scoped env / `process.env` / Bun sandbox fallback,并为 Vertex ADC 与 Bedrock ambient credentials 返回“已认证”哨兵值。

## 能回答的问题

- 某个 provider 会查哪些 API key 环境变量?
- `getApiKeyEnvVars`、`findEnvKeys`、`getEnvApiKey` 的职责差异是什么?
- `options.env` 或 `ProviderEnv` 如何覆盖普通 `process.env`?
- Vertex AI 在没有 `GOOGLE_CLOUD_API_KEY` 时如何判定 ADC 已配置?
- `env-api-keys.ts` 与新 auth resolution、provider config 和 wire protocol 的边界在哪里?

## 职责边界

`env-api-keys.ts` 在本节点 source 内呈现为环境凭证 discovery 的小型集中表:它让 callers 用 provider id 查环境变量名、已设置的变量名,或环境/ambient credentials 对应的 auth marker。[E: packages/ai/src/env-api-keys.ts:64][E: packages/ai/src/env-api-keys.ts:119][E: packages/ai/src/env-api-keys.ts:134][E: packages/ai/src/env-api-keys.ts:144][E: packages/ai/src/env-api-keys.ts:156] `provider-env.ts` 是取值 helper:同一个变量名会先读传入的 `ProviderEnv`,再读 `process.env`,最后在 Bun compiled binary 且 `process.env` 为空时尝试 `/proc/self/environ` fallback。[E: packages/ai/src/utils/provider-env.ts:45][E: packages/ai/src/utils/provider-env.ts:47][E: packages/ai/src/utils/provider-env.ts:48][E: packages/ai/src/utils/provider-env.ts:49]

这个节点覆盖 `getApiKeyEnvVars` 与 `hasVertexAdcCredentials` 的行为,也解释公开的 `findEnvKeys` / `getEnvApiKey` 如何消费它们。[E: packages/ai/src/env-api-keys.ts:31][E: packages/ai/src/env-api-keys.ts:64][E: packages/ai/src/env-api-keys.ts:121][E: packages/ai/src/env-api-keys.ts:136] Provider-specific request options 仍属于 wire modules 的边界;本节点 source 只显示 discovery/status 层如何把 Vertex credentials、project 和 location 判断为可用 auth。[E: packages/ai/src/env-api-keys.ts:145][E: packages/ai/src/env-api-keys.ts:147][E: packages/ai/src/env-api-keys.ts:149][I]

## 关键文件

- `packages/ai/src/env-api-keys.ts`:定义 Node builtin 的 lazy dynamic import cache、Vertex ADC 文件检测、provider→API key env mapping、`findEnvKeys()` 和 `getEnvApiKey()`。[E: packages/ai/src/env-api-keys.ts:2][E: packages/ai/src/env-api-keys.ts:8][E: packages/ai/src/env-api-keys.ts:29][E: packages/ai/src/env-api-keys.ts:31][E: packages/ai/src/env-api-keys.ts:64][E: packages/ai/src/env-api-keys.ts:121][E: packages/ai/src/env-api-keys.ts:136]
- `packages/ai/src/utils/provider-env.ts`:定义 `getProviderEnvValue()` 与 Bun sandbox fallback cache;该 fallback 在 ai package 内部实现,因此可推断 direct `pi-ai` consumers 不依赖 coding-agent entrypoint 预先修补 `process.env`。[E: packages/ai/src/utils/provider-env.ts:3][E: packages/ai/src/utils/provider-env.ts:15][E: packages/ai/src/utils/provider-env.ts:20][E: packages/ai/src/utils/provider-env.ts:45][E: packages/ai/src/utils/provider-env.ts:49][I]

## 数据模型

`ProviderEnv` 在这两个文件中作为可选 env bag 传入,`env-api-keys.ts` 与 `provider-env.ts` 都通过该参数允许 caller 注入 provider-scoped environment overrides。[E: packages/ai/src/env-api-keys.ts:26][E: packages/ai/src/env-api-keys.ts:31][E: packages/ai/src/env-api-keys.ts:119][E: packages/ai/src/env-api-keys.ts:125][E: packages/ai/src/env-api-keys.ts:139][E: packages/ai/src/utils/provider-env.ts:1][E: packages/ai/src/utils/provider-env.ts:45] `getProviderEnvValue(name, env)` 使用 truthy fallback 链,所以空字符串 override 不会遮蔽后续 `process.env` 或 Bun fallback;这和“空字符串表示 unset”的读取语义一致,但不是 nullish-override 语义。[E: packages/ai/src/utils/provider-env.ts:45][E: packages/ai/src/utils/provider-env.ts:47][E: packages/ai/src/utils/provider-env.ts:48][E: packages/ai/src/utils/provider-env.ts:49][I]

`getApiKeyEnvVars(provider)` 返回只读字符串数组或 `undefined`;`findEnvKeys(provider, env)` 只保留当前能通过 `getProviderEnvValue` 读到 truthy value 的变量名;`getEnvApiKey(provider, env)` 取第一个 found env key 的值作为 API key。[E: packages/ai/src/env-api-keys.ts:64][E: packages/ai/src/env-api-keys.ts:109][E: packages/ai/src/env-api-keys.ts:121][E: packages/ai/src/env-api-keys.ts:122][E: packages/ai/src/env-api-keys.ts:125][E: packages/ai/src/env-api-keys.ts:126][E: packages/ai/src/env-api-keys.ts:136][E: packages/ai/src/env-api-keys.ts:137][E: packages/ai/src/env-api-keys.ts:139]

`getEnvApiKey()` 对 ambient credentials 使用字符串哨兵值 `"<authenticated>"`:Vertex ADC 满足 credentials/project/location 时返回该值,Amazon Bedrock 任一支持的 ambient credential source 存在时也返回该值。[E: packages/ai/src/env-api-keys.ts:151][E: packages/ai/src/env-api-keys.ts:152][E: packages/ai/src/env-api-keys.ts:156][E: packages/ai/src/env-api-keys.ts:164][E: packages/ai/src/env-api-keys.ts:165][E: packages/ai/src/env-api-keys.ts:166][E: packages/ai/src/env-api-keys.ts:167][E: packages/ai/src/env-api-keys.ts:168][E: packages/ai/src/env-api-keys.ts:169][E: packages/ai/src/env-api-keys.ts:170][E: packages/ai/src/env-api-keys.ts:172] 这个返回值表示“可认证”而不是实际 secret;直接把它当上游 API key 使用只适合兼容路径里把认证状态传给后续 provider-specific code 的场景。[I]

## Provider API key 映射

`github-copilot` 是特殊分支,只返回 `COPILOT_GITHUB_TOKEN`。[E: packages/ai/src/env-api-keys.ts:65][E: packages/ai/src/env-api-keys.ts:66] `anthropic` 是特殊分支,返回顺序是 `ANTHROPIC_OAUTH_TOKEN` 再 `ANTHROPIC_API_KEY`,因此 `findEnvKeys()` 和 `getEnvApiKey()` 都会优先采用 OAuth token env。[E: packages/ai/src/env-api-keys.ts:70][E: packages/ai/src/env-api-keys.ts:71][E: packages/ai/src/env-api-keys.ts:125][E: packages/ai/src/env-api-keys.ts:139]

| provider id | env var(s) | evidence |
|---|---|---|
| `ant-ling` | `ANT_LING_API_KEY` | [E: packages/ai/src/env-api-keys.ts:75] |
| `openai` | `OPENAI_API_KEY` | [E: packages/ai/src/env-api-keys.ts:76] |
| `azure-openai-responses` | `AZURE_OPENAI_API_KEY` | [E: packages/ai/src/env-api-keys.ts:77] |
| `nvidia` | `NVIDIA_API_KEY` | [E: packages/ai/src/env-api-keys.ts:78] |
| `deepseek` | `DEEPSEEK_API_KEY` | [E: packages/ai/src/env-api-keys.ts:79] |
| `google` | `GEMINI_API_KEY` | [E: packages/ai/src/env-api-keys.ts:80] |
| `google-vertex` | `GOOGLE_CLOUD_API_KEY` | [E: packages/ai/src/env-api-keys.ts:81] |
| `groq` | `GROQ_API_KEY` | [E: packages/ai/src/env-api-keys.ts:82] |
| `cerebras` | `CEREBRAS_API_KEY` | [E: packages/ai/src/env-api-keys.ts:83] |
| `xai` | `XAI_API_KEY` | [E: packages/ai/src/env-api-keys.ts:84] |
| `openrouter` | `OPENROUTER_API_KEY` | [E: packages/ai/src/env-api-keys.ts:85] |
| `vercel-ai-gateway` | `AI_GATEWAY_API_KEY` | [E: packages/ai/src/env-api-keys.ts:86] |
| `zai` | `ZAI_API_KEY` | [E: packages/ai/src/env-api-keys.ts:87] |
| `zai-coding-cn` | `ZAI_CODING_CN_API_KEY` | [E: packages/ai/src/env-api-keys.ts:88] |
| `mistral` | `MISTRAL_API_KEY` | [E: packages/ai/src/env-api-keys.ts:89] |
| `minimax` | `MINIMAX_API_KEY` | [E: packages/ai/src/env-api-keys.ts:90] |
| `minimax-cn` | `MINIMAX_CN_API_KEY` | [E: packages/ai/src/env-api-keys.ts:91] |
| `moonshotai` | `MOONSHOT_API_KEY` | [E: packages/ai/src/env-api-keys.ts:92] |
| `moonshotai-cn` | `MOONSHOT_API_KEY` | [E: packages/ai/src/env-api-keys.ts:93] |
| `huggingface` | `HF_TOKEN` | [E: packages/ai/src/env-api-keys.ts:94] |
| `fireworks` | `FIREWORKS_API_KEY` | [E: packages/ai/src/env-api-keys.ts:95] |
| `together` | `TOGETHER_API_KEY` | [E: packages/ai/src/env-api-keys.ts:96] |
| `opencode` | `OPENCODE_API_KEY` | [E: packages/ai/src/env-api-keys.ts:97] |
| `opencode-go` | `OPENCODE_API_KEY` | [E: packages/ai/src/env-api-keys.ts:98] |
| `kimi-coding` | `KIMI_API_KEY` | [E: packages/ai/src/env-api-keys.ts:99] |
| `cloudflare-workers-ai` | `CLOUDFLARE_API_KEY` | [E: packages/ai/src/env-api-keys.ts:100] |
| `cloudflare-ai-gateway` | `CLOUDFLARE_API_KEY` | [E: packages/ai/src/env-api-keys.ts:101] |
| `xiaomi` | `XIAOMI_API_KEY` | [E: packages/ai/src/env-api-keys.ts:102] |
| `xiaomi-token-plan-cn` | `XIAOMI_TOKEN_PLAN_CN_API_KEY` | [E: packages/ai/src/env-api-keys.ts:103] |
| `xiaomi-token-plan-ams` | `XIAOMI_TOKEN_PLAN_AMS_API_KEY` | [E: packages/ai/src/env-api-keys.ts:104] |
| `xiaomi-token-plan-sgp` | `XIAOMI_TOKEN_PLAN_SGP_API_KEY` | [E: packages/ai/src/env-api-keys.ts:105] |

Provider ids absent from these branches or the `envMap` return `undefined`, which makes `findEnvKeys()` and normal API-key lookup return `undefined` before ambient provider-specific branches run。[E: packages/ai/src/env-api-keys.ts:108][E: packages/ai/src/env-api-keys.ts:109][E: packages/ai/src/env-api-keys.ts:122][E: packages/ai/src/env-api-keys.ts:123]

## Vertex ADC detection

`hasVertexAdcCredentials(env)` first checks `env?.GOOGLE_APPLICATION_CREDENTIALS` directly and, if present, only returns true when the lazy-loaded `_existsSync` can see that explicit path。[E: packages/ai/src/env-api-keys.ts:31][E: packages/ai/src/env-api-keys.ts:32][E: packages/ai/src/env-api-keys.ts:33][E: packages/ai/src/env-api-keys.ts:34] If no explicit path exists and the cached result is still null, the function checks whether the lazy Node imports have completed; in non-Node/non-Bun environments it caches false, while in Node/Bun import-race state it returns false without caching so a later call can retry。[E: packages/ai/src/env-api-keys.ts:37][E: packages/ai/src/env-api-keys.ts:41][E: packages/ai/src/env-api-keys.ts:42][E: packages/ai/src/env-api-keys.ts:43][E: packages/ai/src/env-api-keys.ts:45][E: packages/ai/src/env-api-keys.ts:47]

When filesystem/path helpers are available, the ADC check reads `GOOGLE_APPLICATION_CREDENTIALS` through `getProviderEnvValue`; if present it caches `_existsSync(gacPath)`, otherwise it checks `~/.config/gcloud/application_default_credentials.json` under the current homedir。[E: packages/ai/src/env-api-keys.ts:51][E: packages/ai/src/env-api-keys.ts:52][E: packages/ai/src/env-api-keys.ts:53][E: packages/ai/src/env-api-keys.ts:56][E: packages/ai/src/env-api-keys.ts:57] `getEnvApiKey("google-vertex")` returns `"<authenticated>"` only when `hasVertexAdcCredentials(env)`, `GOOGLE_CLOUD_PROJECT` or `GCLOUD_PROJECT`, and `GOOGLE_CLOUD_LOCATION` are all truthy。[E: packages/ai/src/env-api-keys.ts:144][E: packages/ai/src/env-api-keys.ts:145][E: packages/ai/src/env-api-keys.ts:146][E: packages/ai/src/env-api-keys.ts:147][E: packages/ai/src/env-api-keys.ts:149][E: packages/ai/src/env-api-keys.ts:151][E: packages/ai/src/env-api-keys.ts:152]

## 控制流

1. `getApiKeyEnvVars@env-api-keys.ts:64` handles provider-specific special cases, then reads `envMap[provider]` and wraps the mapped env name in a one-element array。[E: packages/ai/src/env-api-keys.ts:64][E: packages/ai/src/env-api-keys.ts:65][E: packages/ai/src/env-api-keys.ts:70][E: packages/ai/src/env-api-keys.ts:74][E: packages/ai/src/env-api-keys.ts:108][E: packages/ai/src/env-api-keys.ts:109]
2. `findEnvKeys@env-api-keys.ts:121` asks `getApiKeyEnvVars(provider)` for candidates and filters by `getProviderEnvValue(envVar, env)`; empty result becomes `undefined` rather than an empty array。[E: packages/ai/src/env-api-keys.ts:121][E: packages/ai/src/env-api-keys.ts:122][E: packages/ai/src/env-api-keys.ts:123][E: packages/ai/src/env-api-keys.ts:125][E: packages/ai/src/env-api-keys.ts:126]
3. `getEnvApiKey@env-api-keys.ts:136` uses the first `findEnvKeys()` hit as the returned API key value, then falls through to Vertex ADC and Amazon Bedrock ambient credential checks。[E: packages/ai/src/env-api-keys.ts:136][E: packages/ai/src/env-api-keys.ts:137][E: packages/ai/src/env-api-keys.ts:138][E: packages/ai/src/env-api-keys.ts:139][E: packages/ai/src/env-api-keys.ts:144][E: packages/ai/src/env-api-keys.ts:156]
4. `getProviderEnvValue@provider-env.ts:45` resolves one variable name from scoped env, process env, Bun `/proc/self/environ`, then `undefined`; this source shows env API-key discovery consuming that helper, and other wire-module reuse is a boundary note rather than evidence from this node source。[E: packages/ai/src/utils/provider-env.ts:45][E: packages/ai/src/utils/provider-env.ts:47][E: packages/ai/src/utils/provider-env.ts:48][E: packages/ai/src/utils/provider-env.ts:49][E: packages/ai/src/env-api-keys.ts:125][E: packages/ai/src/env-api-keys.ts:139][I]

## 设计动机与权衡

Node builtins are imported lazily through variable specifiers so browser/Vite bundles do not turn `env-api-keys.ts` into hard Node dependencies; that is why `_existsSync`, `_homedir`, and `_join` are nullable caches instead of top-level imports。[E: packages/ai/src/env-api-keys.ts:2][E: packages/ai/src/env-api-keys.ts:3][E: packages/ai/src/env-api-keys.ts:4][E: packages/ai/src/env-api-keys.ts:8][E: packages/ai/src/env-api-keys.ts:9][E: packages/ai/src/env-api-keys.ts:10][E: packages/ai/src/env-api-keys.ts:11][I]

The Bun fallback duplicates the coding-agent sandbox env restoration pattern so `pi-ai` can resolve provider env values inside the ai package itself; the direct-consumer motivation is inferred from the helper living here rather than in the coding-agent entrypoint。[E: packages/ai/src/utils/provider-env.ts:15][E: packages/ai/src/utils/provider-env.ts:45][I] The fallback only activates in Bun when `process.env` has zero keys, then caches `/proc/self/environ` entries in `procEnvCache`。[E: packages/ai/src/utils/provider-env.ts:16][E: packages/ai/src/utils/provider-env.ts:20][E: packages/ai/src/utils/provider-env.ts:21][E: packages/ai/src/utils/provider-env.ts:26][E: packages/ai/src/utils/provider-env.ts:27][E: packages/ai/src/utils/provider-env.ts:30]

## gotcha

- `findEnvKeys()` only reports API key variables that are actually configured; its code path does not include ambient credential sources such as AWS profiles, AWS IAM credentials or Google ADC, while `getEnvApiKey()` can still convert Vertex/Bedrock ambient readiness into `"<authenticated>"`。[E: packages/ai/src/env-api-keys.ts:119][E: packages/ai/src/env-api-keys.ts:125][E: packages/ai/src/env-api-keys.ts:144][E: packages/ai/src/env-api-keys.ts:156][E: packages/ai/src/env-api-keys.ts:172]
- `hasVertexAdcCredentials()` uses `env?.GOOGLE_APPLICATION_CREDENTIALS` for the first explicit-path fast path, then `getProviderEnvValue("GOOGLE_APPLICATION_CREDENTIALS", env)` for the cached branch; a process-level path can therefore influence the default cached branch even when the direct `env` object has no value。[E: packages/ai/src/env-api-keys.ts:32][E: packages/ai/src/env-api-keys.ts:51][I]
- `cachedVertexAdcCredentialsExists` is global to this module and not keyed by `ProviderEnv`, so a cached default ADC result can be reused across later calls that also omit an explicit credentials path。[E: packages/ai/src/env-api-keys.ts:29][E: packages/ai/src/env-api-keys.ts:37][E: packages/ai/src/env-api-keys.ts:53][E: packages/ai/src/env-api-keys.ts:56][E: packages/ai/src/env-api-keys.ts:61][I]

## 跨包边界

[subsys.ai.auth-resolution](auth-resolution.md) owns the request-time credential resolution order: stored credentials and OAuth are handled there, while this node only documents legacy/compat/status environment discovery and shared env value lookup。[E: packages/ai/src/env-api-keys.ts:119][E: packages/ai/src/env-api-keys.ts:134][I] Newer provider auth definitions can use their own env var lists through auth helpers or custom `ApiKeyAuth`, so `getApiKeyEnvVars` is a discovery/catalog surface rather than the only source of provider auth truth。[I]

[ref.coding-agent.env-vars](../../reference/env-vars.md) should enumerate environment variables across ai and coding-agent; this node is the authoritative subsystem explanation for the provider API key subset and the ambient auth probes that come from `env-api-keys.ts`。[E: packages/ai/src/env-api-keys.ts:64][E: packages/ai/src/env-api-keys.ts:74][E: packages/ai/src/env-api-keys.ts:144][E: packages/ai/src/env-api-keys.ts:156][I]

Provider config and wire protocol stay outside this node: `getProviderEnvValue()` is the shared primitive for reading request-scoped env overrides, but Azure endpoint settings, Bedrock region/profile options, Vertex project/location, proxy variables, and cache-retention flags are interpreted in their owning wire modules。[E: packages/ai/src/utils/provider-env.ts:45][I]

## Sources

- packages/ai/src/env-api-keys.ts
- packages/ai/src/utils/provider-env.ts

## 相关

- [subsys.ai.auth-resolution](auth-resolution.md): request-time auth resolution, stored credentials, OAuth refresh, and provider `ApiKeyAuth` execution.
- [ref.coding-agent.env-vars](../../reference/env-vars.md): environment variable catalog that should list provider keys plus coding-agent runtime/config env vars.
