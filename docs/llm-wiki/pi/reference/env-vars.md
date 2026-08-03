---
id: ref.coding-agent.env-vars
title: 环境变量目录(PI_* + provider keys)
kind: catalog
tier: T3
pkg: coding-agent
source:
  - packages/ai/src/env-api-keys.ts
  - packages/ai/src/utils/provider-env.ts
  - packages/ai/src/auth/context.ts
  - packages/ai/src/auth/helpers.ts
  - packages/ai/src/providers/anthropic.ts
  - packages/ai/src/providers/baseten.ts
  - packages/ai/src/providers/qwen-token-plan.ts
  - packages/ai/src/providers/qwen-token-plan-cn.ts
  - packages/ai/src/providers/github-copilot.ts
  - packages/ai/src/providers/amazon-bedrock.ts
  - packages/ai/src/providers/cloudflare-auth.ts
  - packages/ai/src/providers/google-vertex.ts
  - packages/ai/src/providers/radius.ts
  - packages/ai/src/api/anthropic-messages.ts
  - packages/ai/src/api/openai-responses.ts
  - packages/ai/src/api/openai-completions.ts
  - packages/ai/src/api/azure-openai-responses.ts
  - packages/ai/src/api/bedrock-converse-stream.ts
  - packages/ai/src/api/google-vertex.ts
  - packages/ai/src/auth/oauth/anthropic.ts
  - packages/ai/src/auth/oauth/kimi-coding.ts
  - packages/ai/src/auth/oauth/openai-codex.ts
  - packages/ai/src/auth/oauth/openrouter.ts
  - packages/coding-agent/src/config.ts
  - packages/coding-agent/src/main.ts
  - packages/coding-agent/src/cli.ts
  - packages/coding-agent/src/rpc-entry.ts
  - packages/coding-agent/src/cli/args.ts
  - packages/coding-agent/src/cli/startup-ui.ts
  - packages/coding-agent/src/modes/interactive/components/footer.ts
  - packages/coding-agent/src/core/experimental.ts
  - packages/coding-agent/src/core/telemetry.ts
  - packages/coding-agent/src/core/timings.ts
  - packages/coding-agent/src/core/settings-manager.ts
  - packages/coding-agent/src/core/tools/bash.ts
  - packages/coding-agent/src/core/http-dispatcher.ts
  - packages/coding-agent/src/core/resolve-config-value.ts
  - packages/coding-agent/src/core/package-manager.ts
  - packages/coding-agent/src/extensions/llama/huggingface.ts
  - packages/coding-agent/src/extensions/llama/provider.ts
  - packages/coding-agent/src/utils/version-check.ts
  - packages/coding-agent/src/utils/tools-manager.ts
  - packages/coding-agent/docs/usage.md
  - packages/coding-agent/docs/providers.md
symbols:
  - findEnvKeys
  - getEnvApiKey
  - getProviderEnvValue
  - envApiKeyAuth
  - areExperimentalFeaturesEnabled
  - isInstallTelemetryEnabled
  - resolveConfigValue
  - BashToolOptions
related:
  - surface.config.resolution
  - subsys.ai.env-api-keys
  - subsys.coding-agent.telemetry
evidence: explicit
status: verified
updated: 305c014dcc
---

> `ref.coding-agent.env-vars` 是 pi-coding-agent 可见环境变量 catalog:覆盖 provider API key、provider request 配置、`PI_*` 产品开关、配置值 `$ENV` 模板读取规则,并标出当前未纳入本 coding-agent 节点的相邻包变量边界。

## 能回答的问题

- 某个内置 provider 会读取哪个 API key 环境变量?
- `PI_OFFLINE`、`PI_TELEMETRY`、`PI_EXPERIMENTAL`、`PI_CACHE_RETENTION` 分别控制什么?
- Azure、Cloudflare、Google Vertex、Amazon Bedrock 除 API key 外还需要哪些 env?
- `models.json`、`auth.json` provider env、headers 里的 `$ENV` / `${ENV}` 如何解析?
- 哪些 env 是 coding-agent 启动/config 层读取,哪些是 `pi-ai` provider 层读取?
- 哪些 `PI_*` 是 Pi 读取的配置，哪些只是模型 `bash` 子进程收到的 session metadata?

## 读取规则与范围

`pi-ai` provider env lookup 的基础 helper 是 `getProviderEnvValue(name, env)`:先读 provider-scoped `env?.[name]`,再读 `process.env[name]`,最后在 Bun compiled binary 且 `process.env` 为空时读 `/proc/self/environ` fallback。[E: packages/ai/src/utils/provider-env.ts:45][E: packages/ai/src/utils/provider-env.ts:47][E: packages/ai/src/utils/provider-env.ts:48][E: packages/ai/src/utils/provider-env.ts:49] `defaultProviderAuthContext().env(name)` 只把存在且 trim 后非空的 process env 字符串交给 auth resolver。[E: packages/ai/src/auth/context.ts:25][E: packages/ai/src/auth/context.ts:26][E: packages/ai/src/auth/context.ts:27] `envApiKeyAuth()` 的 stored credential key 优先于 env var,否则按传入 env var 顺序取第一个有值项。[E: packages/ai/src/auth/helpers.ts:16][E: packages/ai/src/auth/helpers.ts:18][E: packages/ai/src/auth/helpers.ts:20][E: packages/ai/src/auth/helpers.ts:21][E: packages/ai/src/auth/helpers.ts:22]

`resolve-config-value.ts` 不是有限 env var catalog,而是一套字符串解析语法:非 command 字符串扫描 `$ENV_VAR` 与 `${ENV_VAR}`,从传入 `env` 或 `process.env` 解析;缺失变量让解析结果变成 `undefined` 或 strict 入口里的错误。[E: packages/coding-agent/src/core/resolve-config-value.ts:28][E: packages/coding-agent/src/core/resolve-config-value.ts:57][E: packages/coding-agent/src/core/resolve-config-value.ts:66][E: packages/coding-agent/src/core/resolve-config-value.ts:88][E: packages/coding-agent/src/core/resolve-config-value.ts:89][E: packages/coding-agent/src/core/resolve-config-value.ts:108][E: packages/coding-agent/src/core/resolve-config-value.ts:109][E: packages/coding-agent/src/core/resolve-config-value.ts:229][E: packages/coding-agent/src/core/resolve-config-value.ts:243] 因此本 catalog 把 `$ENV` / `${ENV}` 作为动态规则列出,不试图枚举用户自定义 provider、headers 或 extension 里可能出现的任意变量。[I]

本节点范围是 coding-agent 产品层和它直接消费的 `pi-ai` provider/env 通道;`packages/server` 的 `PI_SERVER_*` / Radius env、以及只在 `packages/tui` 内部读取的 debug env 不作为本节点逐实例 catalog 的权威覆盖对象。[U]

## Provider API key 与 token env

`findEnvKeys(provider, env)` 报告当前有值的 candidate env vars；`getEnvApiKey(provider, env)` 通常取第一个 found key，然后才进入 Vertex ADC 与 Bedrock ambient credential branches。[E: packages/ai/src/env-api-keys.ts:130][E: packages/ai/src/env-api-keys.ts:134][E: packages/ai/src/env-api-keys.ts:135][E: packages/ai/src/env-api-keys.ts:145][E: packages/ai/src/env-api-keys.ts:146][E: packages/ai/src/env-api-keys.ts:149][E: packages/ai/src/env-api-keys.ts:154][E: packages/ai/src/env-api-keys.ts:166] Anthropic 是例外：discovery/status 顺序是 AUTH_TOKEN、OAUTH_TOKEN、API_KEY，但 `getEnvApiKey()` 跳过 AUTH_TOKEN；provider request auth 则按 stored credential、AUTH_TOKEN Bearer header、OAUTH_TOKEN/API_KEY 的顺序解析。[E: packages/ai/src/env-api-keys.ts:29][E: packages/ai/src/env-api-keys.ts:30][E: packages/ai/src/env-api-keys.ts:31][E: packages/ai/src/env-api-keys.ts:75][E: packages/ai/src/env-api-keys.ts:76][E: packages/ai/src/env-api-keys.ts:148][E: packages/ai/src/providers/anthropic.ts:16][E: packages/ai/src/providers/anthropic.ts:21][E: packages/ai/src/providers/anthropic.ts:24][E: packages/ai/src/providers/anthropic.ts:29][E: packages/ai/src/providers/anthropic.ts:31]

| env var | provider id(s) | 类型 | 默认 | 含义 / 为什么 | 源 |
|---|---|---|---|---|---|
| `ANTHROPIC_AUTH_TOKEN` | `anthropic` | secret bearer token | unset | discovery/status 的第一候选；provider 把它放进 `Authorization: Bearer` header，`getEnvApiKey()` 刻意不把它当 API key 返回。[E: packages/ai/src/env-api-keys.ts:29][E: packages/ai/src/env-api-keys.ts:76][E: packages/ai/src/env-api-keys.ts:148][E: packages/ai/src/providers/anthropic.ts:21][E: packages/ai/src/providers/anthropic.ts:24] | `packages/ai/src/env-api-keys.ts:29` |
| `ANTHROPIC_OAUTH_TOKEN` | `anthropic` | secret token | unset | AUTH_TOKEN 缺失后，provider 将它作为 `apiKey` auth 的下一候选；API key 再后。[E: packages/ai/src/env-api-keys.ts:30][E: packages/ai/src/env-api-keys.ts:76][E: packages/ai/src/providers/anthropic.ts:29][E: packages/ai/src/providers/anthropic.ts:31] | `packages/ai/src/env-api-keys.ts:30` |
| `ANTHROPIC_API_KEY` | `anthropic` | secret API key | unset | Anthropic env auth 的第三候选；也在 CLI help 中列为 Claude API key。[E: packages/ai/src/env-api-keys.ts:31][E: packages/ai/src/env-api-keys.ts:76][E: packages/ai/src/providers/anthropic.ts:29][E: packages/coding-agent/src/cli/args.ts:363] | `packages/ai/src/env-api-keys.ts:31` |
| `COPILOT_GITHUB_TOKEN` | `github-copilot` | secret token | unset | GitHub Copilot token auth env;provider 还支持 lazy OAuth,但该 env 是 api-key auth 路径。[E: packages/ai/src/env-api-keys.ts:69][E: packages/ai/src/env-api-keys.ts:70][E: packages/ai/src/providers/github-copilot.ts:15][E: packages/ai/src/providers/github-copilot.ts:16] | `packages/ai/src/env-api-keys.ts:70` |
| `ANT_LING_API_KEY` | `ant-ling` | secret API key | unset | Ant Ling provider API key。[E: packages/ai/src/env-api-keys.ts:80] | `packages/ai/src/env-api-keys.ts:80` |
| `QWEN_TOKEN_PLAN_API_KEY` | `qwen-token-plan` | secret API key | unset | Qwen Token Plan Singapore endpoint 的 API key。[E: packages/ai/src/env-api-keys.ts:81][E: packages/ai/src/providers/qwen-token-plan.ts:8][E: packages/ai/src/providers/qwen-token-plan.ts:11] | `packages/ai/src/env-api-keys.ts:81` |
| `QWEN_TOKEN_PLAN_CN_API_KEY` | `qwen-token-plan-cn` | secret API key | unset | Qwen Token Plan Beijing endpoint 的独立 API key。[E: packages/ai/src/env-api-keys.ts:82][E: packages/ai/src/providers/qwen-token-plan-cn.ts:8][E: packages/ai/src/providers/qwen-token-plan-cn.ts:11] | `packages/ai/src/env-api-keys.ts:82` |
| `OPENAI_API_KEY` | `openai` | secret API key | unset | OpenAI provider API key。[E: packages/ai/src/env-api-keys.ts:83] | `packages/ai/src/env-api-keys.ts:83` |
| `AZURE_OPENAI_API_KEY` | `azure-openai-responses` | secret API key | unset | Azure OpenAI Responses provider API key;endpoint/version 由额外 Azure env 或 model/options 解析。[E: packages/ai/src/env-api-keys.ts:84][E: packages/ai/src/api/azure-openai-responses.ts:226][E: packages/ai/src/api/azure-openai-responses.ts:236][E: packages/ai/src/api/azure-openai-responses.ts:227] | `packages/ai/src/env-api-keys.ts:84` |
| `NVIDIA_API_KEY` | `nvidia` | secret API key | unset | NVIDIA NIM provider API key。[E: packages/ai/src/env-api-keys.ts:85] | `packages/ai/src/env-api-keys.ts:85` |
| `DEEPSEEK_API_KEY` | `deepseek` | secret API key | unset | DeepSeek provider API key。[E: packages/ai/src/env-api-keys.ts:86] | `packages/ai/src/env-api-keys.ts:86` |
| `GEMINI_API_KEY` | `google` | secret API key | unset | Google Gemini provider API key。[E: packages/ai/src/env-api-keys.ts:87] | `packages/ai/src/env-api-keys.ts:87` |
| `GOOGLE_CLOUD_API_KEY` | `google-vertex` | secret API key | unset | Google Vertex explicit API key;stored credential key 优先,随后查该 env,缺失时再尝试 ADC + project + location。[E: packages/ai/src/env-api-keys.ts:88][E: packages/ai/src/providers/google-vertex.ts:63][E: packages/ai/src/providers/google-vertex.ts:64][E: packages/ai/src/providers/google-vertex.ts:66][E: packages/ai/src/providers/google-vertex.ts:74] | `packages/ai/src/env-api-keys.ts:88` |
| `GROQ_API_KEY` | `groq` | secret API key | unset | Groq provider API key。[E: packages/ai/src/env-api-keys.ts:89] | `packages/ai/src/env-api-keys.ts:89` |
| `CEREBRAS_API_KEY` | `cerebras` | secret API key | unset | Cerebras provider API key。[E: packages/ai/src/env-api-keys.ts:90] | `packages/ai/src/env-api-keys.ts:90` |
| `XAI_API_KEY` | `xai` | secret API key | unset | xAI provider API key。[E: packages/ai/src/env-api-keys.ts:91] | `packages/ai/src/env-api-keys.ts:91` |
| `RADIUS_API_KEY` | `radius` | secret API key | unset | Radius gateway provider API key；同一 provider 也可走 Radius OAuth。[E: packages/ai/src/env-api-keys.ts:92][E: packages/ai/src/providers/radius.ts:31][E: packages/ai/src/providers/radius.ts:33] | `packages/ai/src/env-api-keys.ts:92` |
| `OPENROUTER_API_KEY` | `openrouter` | secret API key | unset | OpenRouter text provider API key;OpenRouter image provider also uses the same env in its own provider file, outside `env-api-keys.ts` text-provider map。[E: packages/ai/src/env-api-keys.ts:93][I] | `packages/ai/src/env-api-keys.ts:93` |
| `AI_GATEWAY_API_KEY` | `vercel-ai-gateway` | secret API key | unset | Vercel AI Gateway provider API key。[E: packages/ai/src/env-api-keys.ts:94] | `packages/ai/src/env-api-keys.ts:94` |
| `ZAI_API_KEY` | `zai` | secret API key | unset | ZAI Coding Plan global provider API key。[E: packages/ai/src/env-api-keys.ts:95] | `packages/ai/src/env-api-keys.ts:95` |
| `ZAI_CODING_CN_API_KEY` | `zai-coding-cn` | secret API key | unset | ZAI Coding Plan China provider API key。[E: packages/ai/src/env-api-keys.ts:96] | `packages/ai/src/env-api-keys.ts:96` |
| `MISTRAL_API_KEY` | `mistral` | secret API key | unset | Mistral provider API key。[E: packages/ai/src/env-api-keys.ts:97] | `packages/ai/src/env-api-keys.ts:97` |
| `MINIMAX_API_KEY` | `minimax` | secret API key | unset | MiniMax global provider API key。[E: packages/ai/src/env-api-keys.ts:98] | `packages/ai/src/env-api-keys.ts:98` |
| `MINIMAX_CN_API_KEY` | `minimax-cn` | secret API key | unset | MiniMax China provider API key。[E: packages/ai/src/env-api-keys.ts:99] | `packages/ai/src/env-api-keys.ts:99` |
| `MOONSHOT_API_KEY` | `moonshotai`, `moonshotai-cn` | secret API key | unset | Moonshot global and China provider ids share one env var。[E: packages/ai/src/env-api-keys.ts:100][E: packages/ai/src/env-api-keys.ts:101] | `packages/ai/src/env-api-keys.ts:100` |
| `HF_TOKEN` | `huggingface` / llama.cpp extension | secret token | unset | Hugging Face inference provider token；llama.cpp 的 GGUF search/download UI 也把它作为 token lookup 第一优先级。[E: packages/ai/src/env-api-keys.ts:102][E: packages/coding-agent/src/extensions/llama/huggingface.ts:46][E: packages/coding-agent/src/extensions/llama/huggingface.ts:48] | `packages/ai/src/env-api-keys.ts:102` |
| `FIREWORKS_API_KEY` | `fireworks` | secret API key | unset | Fireworks provider API key。[E: packages/ai/src/env-api-keys.ts:103] | `packages/ai/src/env-api-keys.ts:103` |
| `TOGETHER_API_KEY` | `together` | secret API key | unset | Together AI provider API key。[E: packages/ai/src/env-api-keys.ts:104] | `packages/ai/src/env-api-keys.ts:104` |
| `BASETEN_API_KEY` | `baseten` | secret API key | unset | Baseten OpenAI-compatible inference provider API key。[E: packages/ai/src/env-api-keys.ts:105] [E: packages/ai/src/providers/baseten.ts:11] | `packages/ai/src/env-api-keys.ts:105` |
| `OPENCODE_API_KEY` | `opencode`, `opencode-go` | secret API key | unset | OpenCode Zen and OpenCode Go provider ids share one env var。[E: packages/ai/src/env-api-keys.ts:106][E: packages/ai/src/env-api-keys.ts:107] | `packages/ai/src/env-api-keys.ts:106` |
| `KIMI_API_KEY` | `kimi-coding` | secret API key | unset | Kimi For Coding provider API key。[E: packages/ai/src/env-api-keys.ts:108] | `packages/ai/src/env-api-keys.ts:108` |
| `KIMI_CODE_OAUTH_HOST` | Kimi Code OAuth | host URL | provider default | Overrides the Kimi Code OAuth host; takes precedence over `KIMI_OAUTH_HOST` when both are set。[E: packages/ai/src/auth/oauth/kimi-coding.ts:35] [E: packages/ai/src/auth/oauth/kimi-coding.ts:36] [E: packages/ai/src/auth/oauth/kimi-coding.ts:37] | `packages/ai/src/auth/oauth/kimi-coding.ts:35` |
| `KIMI_OAUTH_HOST` | Kimi Code OAuth | host URL | provider default | Backward-compatible OAuth host override used when `KIMI_CODE_OAUTH_HOST` is absent。[E: packages/ai/src/auth/oauth/kimi-coding.ts:35] [E: packages/ai/src/auth/oauth/kimi-coding.ts:36] [E: packages/ai/src/auth/oauth/kimi-coding.ts:37] | `packages/ai/src/auth/oauth/kimi-coding.ts:36` |
| `CLOUDFLARE_API_KEY` | `cloudflare-workers-ai`, `cloudflare-ai-gateway` | secret API key | unset | Cloudflare Workers AI and AI Gateway token;Cloudflare auth also requires account id and, for AI Gateway, gateway id。[E: packages/ai/src/env-api-keys.ts:109][E: packages/ai/src/env-api-keys.ts:110][E: packages/ai/src/providers/cloudflare-auth.ts:31][E: packages/ai/src/providers/cloudflare-auth.ts:32][E: packages/ai/src/providers/cloudflare-auth.ts:33][E: packages/ai/src/providers/cloudflare-auth.ts:35] | `packages/ai/src/env-api-keys.ts:109` |
| `XIAOMI_API_KEY` | `xiaomi` | secret API key | unset | Xiaomi MiMo provider API key。[E: packages/ai/src/env-api-keys.ts:111] | `packages/ai/src/env-api-keys.ts:111` |
| `XIAOMI_TOKEN_PLAN_CN_API_KEY` | `xiaomi-token-plan-cn` | secret API key | unset | Xiaomi token-plan China region API key。[E: packages/ai/src/env-api-keys.ts:112] | `packages/ai/src/env-api-keys.ts:112` |
| `XIAOMI_TOKEN_PLAN_AMS_API_KEY` | `xiaomi-token-plan-ams` | secret API key | unset | Xiaomi token-plan Amsterdam region API key。[E: packages/ai/src/env-api-keys.ts:113] | `packages/ai/src/env-api-keys.ts:113` |
| `XIAOMI_TOKEN_PLAN_SGP_API_KEY` | `xiaomi-token-plan-sgp` | secret API key | unset | Xiaomi token-plan Singapore region API key。[E: packages/ai/src/env-api-keys.ts:114] | `packages/ai/src/env-api-keys.ts:114` |

## Provider configuration and ambient auth env

| env var | owner | 类型 | 默认 | 含义 / 为什么 | 源 |
|---|---|---|---|---|---|
| `AZURE_OPENAI_BASE_URL` | Azure OpenAI Responses | URL | model `baseUrl` fallback or error | Explicit Azure endpoint;如果 absent,code 可用 resource name 或 model base URL。[E: packages/ai/src/api/azure-openai-responses.ts:236][E: packages/ai/src/api/azure-openai-responses.ts:232][E: packages/ai/src/api/azure-openai-responses.ts:246][E: packages/ai/src/api/azure-openai-responses.ts:252] | `packages/ai/src/api/azure-openai-responses.ts:233` |
| `AZURE_OPENAI_RESOURCE_NAME` | Azure OpenAI Responses | string | unset | Azure resource name alternative;用于 build default base URL。[E: packages/ai/src/api/azure-openai-responses.ts:227][E: packages/ai/src/api/azure-openai-responses.ts:232][E: packages/ai/src/api/azure-openai-responses.ts:232] | `packages/ai/src/api/azure-openai-responses.ts:224` |
| `AZURE_OPENAI_API_VERSION` | Azure OpenAI Responses | string | `v1` | API version override;explicit option 优先,env 次之,然后默认版本。[E: packages/ai/src/api/azure-openai-responses.ts:220][E: packages/ai/src/api/azure-openai-responses.ts:226][E: packages/ai/src/api/azure-openai-responses.ts:223] | `packages/ai/src/api/azure-openai-responses.ts:217` |
| `AZURE_OPENAI_DEPLOYMENT_NAME_MAP` | Azure OpenAI Responses | mapping string | model id | model id 到 Azure deployment name 的 map;解析后按 `model.id` 查找,找不到就用 model id。[E: packages/ai/src/api/azure-openai-responses.ts:41][E: packages/ai/src/api/azure-openai-responses.ts:45][E: packages/ai/src/api/azure-openai-responses.ts:45][E: packages/ai/src/api/azure-openai-responses.ts:46][E: packages/ai/src/api/azure-openai-responses.ts:47] | `packages/ai/src/api/azure-openai-responses.ts:41` |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Workers AI / AI Gateway | string | unset | 两种 Cloudflare auth 都要求 account id;stored credential env 优先,否则回落 ambient env,解析后继续作为 provider env 传递。[E: packages/ai/src/providers/cloudflare-auth.ts:5][E: packages/ai/src/providers/cloudflare-auth.ts:18][E: packages/ai/src/providers/cloudflare-auth.ts:23][E: packages/ai/src/providers/cloudflare-auth.ts:32][E: packages/ai/src/providers/cloudflare-auth.ts:40] | `packages/ai/src/providers/cloudflare-auth.ts:5` |
| `CLOUDFLARE_GATEWAY_ID` | Cloudflare AI Gateway | string | unset | 仅 `ai-gateway` auth 要求 gateway id;stored credential env 优先,否则回落 ambient env,解析后进入 provider env。[E: packages/ai/src/providers/cloudflare-auth.ts:6][E: packages/ai/src/providers/cloudflare-auth.ts:21][E: packages/ai/src/providers/cloudflare-auth.ts:23][E: packages/ai/src/providers/cloudflare-auth.ts:33][E: packages/ai/src/providers/cloudflare-auth.ts:41] | `packages/ai/src/providers/cloudflare-auth.ts:6` |
| `LLAMA_BASE_URL` | llama.cpp extension | URL | stored credential or unset | 指向 llama.cpp router；stored credential env 优先，其次 ambient env。未配置时 provider 不可用，登录 prompt 的 placeholder 才使用 localhost default。[E: packages/coding-agent/src/extensions/llama/provider.ts:15][E: packages/coding-agent/src/extensions/llama/provider.ts:24][E: packages/coding-agent/src/extensions/llama/provider.ts:76] | `packages/coding-agent/src/extensions/llama/provider.ts:15` |
| `LLAMA_API_KEY` | llama.cpp extension | secret API key | local placeholder | 未存 key 时 request auth 读取该 env；仍缺失则使用 `"local"` 占位值。[E: packages/coding-agent/src/extensions/llama/provider.ts:100][E: packages/coding-agent/src/extensions/llama/provider.ts:103] | `packages/coding-agent/src/extensions/llama/provider.ts:100` |
| `HF_TOKEN_PATH` | llama.cpp extension | file path | unset | Hugging Face token 文件；仅在 `HF_TOKEN` 缺失后尝试。[E: packages/coding-agent/src/extensions/llama/huggingface.ts:46][E: packages/coding-agent/src/extensions/llama/huggingface.ts:50][E: packages/coding-agent/src/extensions/llama/huggingface.ts:51] | `packages/coding-agent/src/extensions/llama/huggingface.ts:46` |
| `HF_HOME` | llama.cpp extension | directory | unset | token lookup 候选 `${HF_HOME}/token`。[E: packages/coding-agent/src/extensions/llama/huggingface.ts:52] | `packages/coding-agent/src/extensions/llama/huggingface.ts:52` |
| `XDG_CACHE_HOME` | llama.cpp extension | directory | unset | token lookup 候选 `${XDG_CACHE_HOME}/huggingface/token`；再回落用户 home 默认 cache。[E: packages/coding-agent/src/extensions/llama/huggingface.ts:53][E: packages/coding-agent/src/extensions/llama/huggingface.ts:54] | `packages/coding-agent/src/extensions/llama/huggingface.ts:53` |
| `GOOGLE_APPLICATION_CREDENTIALS` | Google Vertex | file path | default ADC path | Vertex auth resolver 先取 stored credential env,再取 ambient env,两者都无值才检查默认 ADC path;wire layer在存在时把它作为 `keyFilename`。[E: packages/ai/src/env-api-keys.ts:36][E: packages/ai/src/env-api-keys.ts:55][E: packages/ai/src/providers/google-vertex.ts:66][E: packages/ai/src/providers/google-vertex.ts:68][E: packages/ai/src/api/google-vertex.ts:416][E: packages/ai/src/api/google-vertex.ts:418] | `packages/ai/src/env-api-keys.ts:36` |
| `GOOGLE_CLOUD_PROJECT` | Google Vertex | string | unset | stored credential env 优先,ambient `GOOGLE_CLOUD_PROJECT` 次之,最后兼容 `GCLOUD_PROJECT`;wire resolution 维持相同两 env 顺序。[E: packages/ai/src/env-api-keys.ts:157][E: packages/ai/src/providers/google-vertex.ts:69][E: packages/ai/src/providers/google-vertex.ts:72][E: packages/ai/src/api/google-vertex.ts:433][E: packages/ai/src/api/google-vertex.ts:437] | `packages/ai/src/env-api-keys.ts:156` |
| `GCLOUD_PROJECT` | Google Vertex | string | unset | Alternate Vertex project id env;仅在 stored/ambient `GOOGLE_CLOUD_PROJECT` 都缺失后使用。[E: packages/ai/src/env-api-keys.ts:157][E: packages/ai/src/providers/google-vertex.ts:72][E: packages/ai/src/api/google-vertex.ts:437] | `packages/ai/src/env-api-keys.ts:156` |
| `GOOGLE_CLOUD_LOCATION` | Google Vertex | string | unset | stored credential env 优先于 ambient env;与 credentials/project 同时存在时 ADC auth 才就绪,wire resolution 也要求 location。[E: packages/ai/src/env-api-keys.ts:159][E: packages/ai/src/providers/google-vertex.ts:73][E: packages/ai/src/providers/google-vertex.ts:74][E: packages/ai/src/api/google-vertex.ts:446][E: packages/ai/src/api/google-vertex.ts:449] | `packages/ai/src/env-api-keys.ts:158` |
| `AWS_PROFILE` | Amazon Bedrock | profile name | SDK default chain | Bedrock 可把 profile 存入 credential env,resolve 时 stored profile 优先于 ambient `AWS_PROFILE`;wire layer把 option/profile env 交给 Bedrock client config。[E: packages/ai/src/env-api-keys.ts:175][E: packages/ai/src/providers/amazon-bedrock.ts:42][E: packages/ai/src/providers/amazon-bedrock.ts:57][E: packages/ai/src/providers/amazon-bedrock.ts:61][E: packages/ai/src/api/bedrock-converse-stream.ts:140] | `packages/ai/src/env-api-keys.ts:174` |
| `AWS_ACCESS_KEY_ID` | Amazon Bedrock | secret access key id | unset | Bedrock ambient auth requires it together with `AWS_SECRET_ACCESS_KEY`;wire credentials builder also requires the pair。[E: packages/ai/src/env-api-keys.ts:176][E: packages/ai/src/providers/amazon-bedrock.ts:64][E: packages/ai/src/api/bedrock-converse-stream.ts:1036][E: packages/ai/src/api/bedrock-converse-stream.ts:1037][E: packages/ai/src/api/bedrock-converse-stream.ts:1039] | `packages/ai/src/env-api-keys.ts:175` |
| `AWS_SECRET_ACCESS_KEY` | Amazon Bedrock | secret access key | unset | Pair for `AWS_ACCESS_KEY_ID`;wire credential object is not created unless both exist。[E: packages/ai/src/env-api-keys.ts:176][E: packages/ai/src/providers/amazon-bedrock.ts:64][E: packages/ai/src/api/bedrock-converse-stream.ts:1038][E: packages/ai/src/api/bedrock-converse-stream.ts:1039] | `packages/ai/src/env-api-keys.ts:175` |
| `AWS_SESSION_TOKEN` | Amazon Bedrock | secret session token | unset | Optional session token added to explicit Bedrock credentials when access key and secret are present。[E: packages/ai/src/api/bedrock-converse-stream.ts:1051][E: packages/ai/src/api/bedrock-converse-stream.ts:1055] | `packages/ai/src/api/bedrock-converse-stream.ts:982` |
| `AWS_BEARER_TOKEN_BEDROCK` | Amazon Bedrock | secret bearer token | unset | Bedrock ambient readiness source and bearer token request auth source unless `AWS_BEDROCK_SKIP_AUTH=1`。[E: packages/ai/src/env-api-keys.ts:177][E: packages/ai/src/providers/amazon-bedrock.ts:56][E: packages/ai/src/api/bedrock-converse-stream.ts:161][E: packages/ai/src/api/bedrock-converse-stream.ts:162][E: packages/ai/src/api/bedrock-converse-stream.ts:165] | `packages/ai/src/env-api-keys.ts:176` |
| `AWS_CONTAINER_CREDENTIALS_RELATIVE_URI` | Amazon Bedrock | ECS credential URI | unset | Bedrock ambient readiness source for ECS task role credentials。[E: packages/ai/src/env-api-keys.ts:178][E: packages/ai/src/providers/amazon-bedrock.ts:67] | `packages/ai/src/env-api-keys.ts:177` |
| `AWS_CONTAINER_CREDENTIALS_FULL_URI` | Amazon Bedrock | ECS credential URI | unset | Bedrock ambient readiness source for ECS task role credentials using full URI。[E: packages/ai/src/env-api-keys.ts:179][E: packages/ai/src/providers/amazon-bedrock.ts:68] | `packages/ai/src/env-api-keys.ts:178` |
| `AWS_WEB_IDENTITY_TOKEN_FILE` | Amazon Bedrock | file path | unset | Bedrock ambient readiness source for web identity token / IRSA credentials。[E: packages/ai/src/env-api-keys.ts:180][E: packages/ai/src/providers/amazon-bedrock.ts:69] | `packages/ai/src/env-api-keys.ts:179` |
| `AWS_REGION` | Amazon Bedrock | region | fallback chain | configured region 按 explicit option、`AWS_REGION`、`AWS_DEFAULT_REGION` 求值;inference-profile ARN region 仍优先,标准 endpoint region 只在 explicit endpoint 生效时兜底。[E: packages/ai/src/api/bedrock-converse-stream.ts:144][E: packages/ai/src/api/bedrock-converse-stream.ts:174][E: packages/ai/src/api/bedrock-converse-stream.ts:176][E: packages/ai/src/api/bedrock-converse-stream.ts:178][E: packages/ai/src/api/bedrock-converse-stream.ts:179][E: packages/ai/src/api/bedrock-converse-stream.ts:1036][E: packages/ai/src/api/bedrock-converse-stream.ts:1039] | `packages/ai/src/api/bedrock-converse-stream.ts:137` |
| `AWS_DEFAULT_REGION` | Amazon Bedrock | region | fallback chain | Bedrock configured region candidate after explicit option 与 `AWS_REGION`。[E: packages/ai/src/api/bedrock-converse-stream.ts:1036][E: packages/ai/src/api/bedrock-converse-stream.ts:1039][E: packages/ai/src/api/bedrock-converse-stream.ts:1040] | `packages/ai/src/api/bedrock-converse-stream.ts:967` |
| `AWS_BEDROCK_SKIP_AUTH` | Amazon Bedrock | boolean flag | off | When set to `"1"`,Bedrock proxy mode skips bearer/credential auth and installs dummy credentials。[E: packages/ai/src/api/bedrock-converse-stream.ts:161][E: packages/ai/src/api/bedrock-converse-stream.ts:186][E: packages/ai/src/api/bedrock-converse-stream.ts:186][E: packages/ai/src/api/bedrock-converse-stream.ts:187][E: packages/ai/src/api/bedrock-converse-stream.ts:188] | `packages/ai/src/api/bedrock-converse-stream.ts:154` |
| `AWS_BEDROCK_FORCE_HTTP1` | Amazon Bedrock | boolean flag | off | When set to `"1"`,Bedrock request handler uses HTTP/1.1 Node handler when no proxy handler is selected。[E: packages/ai/src/api/bedrock-converse-stream.ts:203][E: packages/ai/src/api/bedrock-converse-stream.ts:209] | `packages/ai/src/api/bedrock-converse-stream.ts:196` |
| `AWS_BEDROCK_FORCE_CACHE` | Amazon Bedrock | boolean flag | off | Allows cache points for application inference profiles whose ARN lacks recognizable Claude model name。[E: packages/ai/src/api/bedrock-converse-stream.ts:739][E: packages/ai/src/api/bedrock-converse-stream.ts:743][E: packages/ai/src/api/bedrock-converse-stream.ts:743] | `packages/ai/src/api/bedrock-converse-stream.ts:672` |
| `AWS_ENDPOINT_URL_BEDROCK_RUNTIME` | Amazon Bedrock / AWS SDK | URL | SDK default | User docs describe this as standard AWS SDK env for a Bedrock proxy endpoint; direct source reads are delegated to AWS SDK rather than explicit `getProviderEnvValue()` in this file set。[E: packages/coding-agent/docs/providers.md:230][E: packages/coding-agent/docs/providers.md:233][E: packages/coding-agent/docs/providers.md:234][I] | `packages/coding-agent/docs/providers.md:228` |
| `PI_CACHE_RETENTION` | provider request cache | enum-like string | `short` | `long` enables extended prompt cache retention where supported;Anthropic, OpenAI Responses, OpenAI Completions, and Bedrock helpers all fall back to `"short"` otherwise。[E: packages/ai/src/api/anthropic-messages.ts:49][E: packages/ai/src/api/anthropic-messages.ts:53][E: packages/ai/src/api/anthropic-messages.ts:54][E: packages/ai/src/api/openai-responses.ts:57][E: packages/ai/src/api/openai-responses.ts:61][E: packages/ai/src/api/openai-completions.ts:186][E: packages/ai/src/api/openai-completions.ts:190][E: packages/ai/src/api/bedrock-converse-stream.ts:686][E: packages/ai/src/api/bedrock-converse-stream.ts:697][E: packages/coding-agent/docs/usage.md:299] | `packages/ai/src/api/anthropic-messages.ts:49` |
| `PI_OAUTH_CALLBACK_HOST` | OAuth callback host | host string | `127.0.0.1` | Overrides the callback server host used by Anthropic、OpenAI Codex 与 OpenRouter browser OAuth;各 flow 保留自己的固定 callback port/path。[E: packages/ai/src/auth/oauth/anthropic.ts:32][E: packages/ai/src/auth/oauth/anthropic.ts:33][E: packages/ai/src/auth/oauth/openai-codex.ts:30][E: packages/ai/src/auth/oauth/openai-codex.ts:44][E: packages/ai/src/auth/oauth/openrouter.ts:25][E: packages/ai/src/auth/oauth/openrouter.ts:26] | `packages/ai/src/auth/oauth/anthropic.ts:32` |

## Coding-agent runtime and config env

| env var | owner | 类型 | 默认 | 含义 / 为什么 | 源 |
|---|---|---|---|---|---|
| `PI_CODING_AGENT_DIR` | config path | path | `~/.pi/agent` | Generated from `APP_NAME.toUpperCase() + "_CODING_AGENT_DIR"`;when set,`getAgentDir()` returns this path instead of the default agent dir。[E: packages/coding-agent/src/config.ts:489][E: packages/coding-agent/src/config.ts:491][E: packages/coding-agent/src/config.ts:495][E: packages/coding-agent/src/config.ts:516][E: packages/coding-agent/src/config.ts:518][E: packages/coding-agent/src/config.ts:520] | `packages/coding-agent/src/config.ts:489` |
| `PI_CODING_AGENT_SESSION_DIR` | session path | path | settings `sessionDir` / agent dir sessions | Generated from `APP_NAME.toUpperCase() + "_CODING_AGENT_SESSION_DIR"`;session dir precedence is CLI `--session-dir`,env var,then settings。[E: packages/coding-agent/src/config.ts:496][E: packages/coding-agent/src/main.ts:625][E: packages/coding-agent/src/main.ts:627][E: packages/coding-agent/src/main.ts:628][E: packages/coding-agent/src/main.ts:629] | `packages/coding-agent/src/config.ts:496` |
| `PI_PACKAGE_DIR` | package asset path | path | detected package root | Overrides package asset root,used before Bun binary / Node package detection。[E: packages/coding-agent/src/config.ts:367][E: packages/coding-agent/src/config.ts:369][E: packages/coding-agent/src/config.ts:370][E: packages/coding-agent/src/config.ts:371] | `packages/coding-agent/src/config.ts:367` |
| `PI_SHARE_VIEWER_URL` | share command URL | URL | `https://pi.dev/session/` | Base URL for share viewer links;`getShareViewerUrl()` appends `#<gistId>` to the env or default base。[E: packages/coding-agent/src/config.ts:502][E: packages/coding-agent/src/config.ts:505][E: packages/coding-agent/src/config.ts:506][E: packages/coding-agent/src/config.ts:507] | `packages/coding-agent/src/config.ts:502` |
| `PI_OFFLINE` | startup network gate | truthy flag | off | `main()` treats `--offline` or truthy env as offline,then writes `PI_OFFLINE=1` and `PI_SKIP_VERSION_CHECK=1`;version checks and tool/package network paths also consult it。[E: packages/coding-agent/src/main.ts:524][E: packages/coding-agent/src/main.ts:525][E: packages/coding-agent/src/main.ts:526][E: packages/coding-agent/src/main.ts:527][E: packages/coding-agent/src/utils/version-check.ts:34][E: packages/coding-agent/src/utils/tools-manager.ts:14][E: packages/coding-agent/src/utils/tools-manager.ts:15][E: packages/coding-agent/src/utils/tools-manager.ts:17][E: packages/coding-agent/src/core/package-manager.ts:43][E: packages/coding-agent/src/core/package-manager.ts:44][E: packages/coding-agent/src/core/package-manager.ts:46] | `packages/coding-agent/src/main.ts:476` |
| `PI_SKIP_VERSION_CHECK` | version check gate | presence flag | off | Any set value skips latest-version fetch;offline mode also sets it to `"1"` during startup。[E: packages/coding-agent/src/main.ts:526][E: packages/coding-agent/src/main.ts:527][E: packages/coding-agent/src/utils/version-check.ts:34] | `packages/coding-agent/src/main.ts:478` |
| `PI_TELEMETRY` | telemetry / attribution gate | truthy override | settings fallback | Overrides install/update telemetry and default provider attribution gate:env present means parse env truthiness,env absent means `settingsManager.getEnableInstallTelemetry()`。[E: packages/coding-agent/src/core/telemetry.ts:3][E: packages/coding-agent/src/core/telemetry.ts:5][E: packages/coding-agent/src/core/telemetry.ts:8][E: packages/coding-agent/src/core/telemetry.ts:10][E: packages/coding-agent/src/core/telemetry.ts:12][E: packages/coding-agent/docs/usage.md:301] | `packages/coding-agent/src/core/telemetry.ts:3` |
| `PI_EXPERIMENTAL` | experimental feature gate | exact flag | off | Experimental features are enabled only when env equals `"1"`;first-time setup and footer xp marker consume this helper。[E: packages/coding-agent/src/core/experimental.ts:1][E: packages/coding-agent/src/core/experimental.ts:2][E: packages/coding-agent/src/cli/startup-ui.ts:125][E: packages/coding-agent/src/modes/interactive/components/footer.ts:162] | `packages/coding-agent/src/core/experimental.ts:1` |
| `PI_TIMING` | startup profiling | exact flag | off | Timing module snapshots `PI_TIMING === "1"` at module load;disabled paths return without recording or printing。[E: packages/coding-agent/src/core/timings.ts:6][E: packages/coding-agent/src/core/timings.ts:16][E: packages/coding-agent/src/core/timings.ts:17][E: packages/coding-agent/src/core/timings.ts:21][E: packages/coding-agent/src/core/timings.ts:22][E: packages/coding-agent/src/core/timings.ts:45][E: packages/coding-agent/src/core/timings.ts:46] | `packages/coding-agent/src/core/timings.ts:6` |
| `PI_STARTUP_BENCHMARK` | startup benchmark mode | truthy flag | off | Truthy env enables interactive startup benchmark;non-interactive modes error out。[E: packages/coding-agent/src/main.ts:857][E: packages/coding-agent/src/main.ts:858][E: packages/coding-agent/src/main.ts:859][E: packages/coding-agent/src/main.ts:860] | `packages/coding-agent/src/main.ts:805` |
| `PI_CLEAR_ON_SHRINK` | terminal rendering | exact flag | off | `SettingsManager.getClearOnShrink()` uses settings first,then env equals `"1"`,then false。[E: packages/coding-agent/src/core/settings-manager.ts:1098][E: packages/coding-agent/src/core/settings-manager.ts:1100][E: packages/coding-agent/src/core/settings-manager.ts:1101][E: packages/coding-agent/src/core/settings-manager.ts:1103] | `packages/coding-agent/src/core/settings-manager.ts:1093` |
| `PI_HARDWARE_CURSOR` | terminal rendering | exact flag | off | `SettingsManager.getShowHardwareCursor()` uses setting first,then env equals `"1"`。[E: packages/coding-agent/src/core/settings-manager.ts:1207][E: packages/coding-agent/src/core/settings-manager.ts:1208] | `packages/coding-agent/src/core/settings-manager.ts:1181` |
| `PI_CODING_AGENT` | process marker | string | set by entrypoint | CLI and RPC entrypoints set this env to `"true"` before calling `main()`;source shown here writes it,not a user-facing config knob。[E: packages/coding-agent/src/cli.ts:13][E: packages/coding-agent/src/rpc-entry.ts:7][I] | `packages/coding-agent/src/cli.ts:13` |
| `AI_AGENT` | generic process attribution | string | set to `"pi"` by entrypoint | CLI and RPC entrypoints set this process-wide marker before `main()` so generic tooling and inherited child processes can attribute work to Pi;it is not a user-facing Pi setting。[E: packages/coding-agent/src/cli.ts:14][E: packages/coding-agent/src/rpc-entry.ts:8][E: packages/coding-agent/README.md:667][I] | `packages/coding-agent/src/cli.ts:14` |
| `PI_SESSION_ID` | model bash child env | session id | removed unless context available | `bash` tool 先从继承 env 删除该变量；默认启用 session exposure 时再写入当前 `SessionManager` id。它是子进程 metadata，不是 Pi 启动配置。[E: packages/coding-agent/src/core/tools/bash.ts:166][E: packages/coding-agent/src/core/tools/bash.ts:171][E: packages/coding-agent/src/core/tools/bash.ts:173] | `packages/coding-agent/src/core/tools/bash.ts:166` |
| `PI_SESSION_FILE` | model bash child env | path | removed / omitted for in-memory session | 与 session id 同批清理；仅当当前 session 有持久化 file 时写入。[E: packages/coding-agent/src/core/tools/bash.ts:167][E: packages/coding-agent/src/core/tools/bash.ts:174][E: packages/coding-agent/src/core/tools/bash.ts:175] | `packages/coding-agent/src/core/tools/bash.ts:167` |
| `PI_PROVIDER` | model bash child env | provider id | removed / omitted without model | `bash` tool 有当前 model 时写 provider id；关闭 `exposeSessionEnvironment` 或缺少 extension context 时保持删除。[E: packages/coding-agent/src/core/tools/bash.ts:168][E: packages/coding-agent/src/core/tools/bash.ts:171][E: packages/coding-agent/src/core/tools/bash.ts:176][E: packages/coding-agent/src/core/tools/bash.ts:177] | `packages/coding-agent/src/core/tools/bash.ts:168` |
| `PI_MODEL` | model bash child env | model id | removed / omitted without model | 与 `PI_PROVIDER` 成对来自当前 model，但代码分别赋值；并非用于选择 Pi 启动模型。[E: packages/coding-agent/src/core/tools/bash.ts:169][E: packages/coding-agent/src/core/tools/bash.ts:176][E: packages/coding-agent/src/core/tools/bash.ts:178] | `packages/coding-agent/src/core/tools/bash.ts:169` |
| `PI_REASONING_LEVEL` | model bash child env | thinking level | removed / omitted when empty | 当前 context 有 thinking level 时注入；清理发生在 `spawnHook` 之前，hook 可以最终覆盖 env。[E: packages/coding-agent/src/core/tools/bash.ts:170][E: packages/coding-agent/src/core/tools/bash.ts:180][E: packages/coding-agent/src/core/tools/bash.ts:182][E: packages/coding-agent/src/core/tools/bash.ts:183] | `packages/coding-agent/src/core/tools/bash.ts:170` |
| `VISUAL` | external editor fallback | command | unset | `externalEditor` setting takes precedence;when unset,settings manager uses `VISUAL` then `EDITOR`,then platform default editor。[E: packages/coding-agent/src/core/settings-manager.ts:859][E: packages/coding-agent/src/core/settings-manager.ts:860][E: packages/coding-agent/src/core/settings-manager.ts:864][E: packages/coding-agent/src/core/settings-manager.ts:868][E: packages/coding-agent/docs/usage.md:301] | `packages/coding-agent/src/core/settings-manager.ts:854` |
| `EDITOR` | external editor fallback | command | unset | Fallback after `VISUAL` for Ctrl+G external editor command when `externalEditor` setting is empty。[E: packages/coding-agent/src/core/settings-manager.ts:864][E: packages/coding-agent/docs/usage.md:301] | `packages/coding-agent/src/core/settings-manager.ts:859` |
| `HTTP_PROXY` | HTTP proxy | URL | unset | `httpProxy` setting writes this env with nullish assignment before undici `EnvHttpProxyAgent` is configured;existing env is not overwritten。[E: packages/coding-agent/src/core/http-dispatcher.ts:45][E: packages/coding-agent/src/core/http-dispatcher.ts:45][E: packages/coding-agent/src/core/http-dispatcher.ts:47][E: packages/coding-agent/src/core/http-dispatcher.ts:52][E: packages/coding-agent/src/core/http-dispatcher.ts:57] | `packages/coding-agent/src/core/http-dispatcher.ts:43` |
| `HTTPS_PROXY` | HTTP proxy | URL | unset | `httpProxy` setting writes this env with nullish assignment;undici proxy agent then reads env proxy settings。[E: packages/coding-agent/src/core/http-dispatcher.ts:45][E: packages/coding-agent/src/core/http-dispatcher.ts:45][E: packages/coding-agent/src/core/http-dispatcher.ts:48][E: packages/coding-agent/src/core/http-dispatcher.ts:57] | `packages/coding-agent/src/core/http-dispatcher.ts:43` |
| `PNPM_HOME` | self-update command construction | path | inferred global dir | pnpm self-update command uses `PNPM_HOME` as `--config.global-bin-dir` when a pnpm global path match is inferred;this is package-manager host integration,not Pi-specific config。[E: packages/coding-agent/src/config.ts:126][E: packages/coding-agent/src/config.ts:129][E: packages/coding-agent/src/config.ts:130][I] | `packages/coding-agent/src/config.ts:126` |
| `$ENV_VAR` / `${ENV_VAR}` in config values | models/auth/header config | dynamic template | literal/config dependent | Any valid env name referenced in config strings can be resolved from provider-scoped env or `process.env`;`$$` and `$!` are escapes,not env names。[E: packages/coding-agent/src/core/resolve-config-value.ts:42][E: packages/coding-agent/src/core/resolve-config-value.ts:48][E: packages/coding-agent/src/core/resolve-config-value.ts:57][E: packages/coding-agent/src/core/resolve-config-value.ts:66][E: packages/coding-agent/src/core/resolve-config-value.ts:88][E: packages/coding-agent/src/core/resolve-config-value.ts:89][E: packages/coding-agent/src/core/resolve-config-value.ts:101][E: packages/coding-agent/src/core/resolve-config-value.ts:108][E: packages/coding-agent/src/core/resolve-config-value.ts:109] | `packages/coding-agent/src/core/resolve-config-value.ts:42` |

## 跨包关系

[subsys.ai.env-api-keys](../subsystems/ai/env-api-keys.md) 是 provider API key discovery 的 subsystem 节点:它解释 `getApiKeyEnvVars()`、`findEnvKeys()`、`getEnvApiKey()` 和 Bun sandbox env fallback 的控制流;本 catalog 只把每个 env var 实例展开成可 grep 的行。[E: packages/ai/src/env-api-keys.ts:68][E: packages/ai/src/env-api-keys.ts:130][E: packages/ai/src/env-api-keys.ts:145][I]

[surface.config.resolution](../surface/config/resolution.md) 是 `$ENV` / `${ENV}` / `!cmd` 配置字符串解析的 surface 节点;本 catalog 把这套动态 env 语法列为一个规则,因为它允许用户在 `models.json`、provider headers、auth config 中引入任意 env name。[E: packages/coding-agent/src/core/resolve-config-value.ts:57][E: packages/coding-agent/src/core/resolve-config-value.ts:66][E: packages/coding-agent/src/core/resolve-config-value.ts:80][E: packages/coding-agent/src/core/resolve-config-value.ts:81][E: packages/coding-agent/src/core/resolve-config-value.ts:85][E: packages/coding-agent/src/core/resolve-config-value.ts:229][I]

[subsys.coding-agent.telemetry](../subsystems/coding-agent/telemetry.md) 解释 `PI_TELEMETRY`、`PI_EXPERIMENTAL`、`PI_TIMING` 的行为细节;本 catalog 保持逐实例目录视角,不重复 provider attribution header 合并策略。[E: packages/coding-agent/src/core/telemetry.ts:10][E: packages/coding-agent/src/core/experimental.ts:2][E: packages/coding-agent/src/core/timings.ts:6][I]

## Sources

- packages/ai/src/env-api-keys.ts
- packages/ai/src/utils/provider-env.ts
- packages/ai/src/auth/context.ts
- packages/ai/src/auth/helpers.ts
- packages/ai/src/providers/anthropic.ts
- packages/ai/src/providers/baseten.ts
- packages/ai/src/providers/github-copilot.ts
- packages/ai/src/providers/amazon-bedrock.ts
- packages/ai/src/providers/cloudflare-auth.ts
- packages/ai/src/providers/google-vertex.ts
- packages/ai/src/api/anthropic-messages.ts
- packages/ai/src/api/openai-responses.ts
- packages/ai/src/api/openai-completions.ts
- packages/ai/src/api/azure-openai-responses.ts
- packages/ai/src/api/bedrock-converse-stream.ts
- packages/ai/src/api/google-vertex.ts
- packages/ai/src/auth/oauth/anthropic.ts
- packages/ai/src/auth/oauth/openai-codex.ts
- packages/coding-agent/src/config.ts
- packages/coding-agent/src/main.ts
- packages/coding-agent/src/cli.ts
- packages/coding-agent/src/rpc-entry.ts
- packages/coding-agent/src/cli/args.ts
- packages/coding-agent/src/cli/startup-ui.ts
- packages/coding-agent/src/modes/interactive/components/footer.ts
- packages/coding-agent/src/core/experimental.ts
- packages/coding-agent/src/core/telemetry.ts
- packages/coding-agent/src/core/timings.ts
- packages/coding-agent/src/core/settings-manager.ts
- packages/coding-agent/src/core/tools/bash.ts
- packages/coding-agent/src/core/http-dispatcher.ts
- packages/coding-agent/src/core/resolve-config-value.ts
- packages/coding-agent/src/core/package-manager.ts
- packages/coding-agent/src/utils/version-check.ts
- packages/coding-agent/src/utils/tools-manager.ts
- packages/coding-agent/docs/usage.md
- packages/coding-agent/docs/providers.md

## 相关

- [surface.config.resolution](../surface/config/resolution.md): 用户配置中 `$ENV`、`${ENV}`、`!cmd` 字符串的解析规则。
- [subsys.ai.env-api-keys](../subsystems/ai/env-api-keys.md): provider API key discovery、Vertex/Bedrock ambient auth marker、provider env lookup。
- [subsys.coding-agent.telemetry](../subsystems/coding-agent/telemetry.md): telemetry、experimental、startup timing env gate 的行为说明。
