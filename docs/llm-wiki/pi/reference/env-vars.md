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
  - packages/ai/src/utils/oauth/anthropic.ts
  - packages/ai/src/utils/oauth/openai-codex.ts
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
  - packages/coding-agent/src/core/http-dispatcher.ts
  - packages/coding-agent/src/core/resolve-config-value.ts
  - packages/coding-agent/src/core/package-manager.ts
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
related:
  - surface.config.resolution
  - subsys.ai.env-api-keys
  - subsys.coding-agent.telemetry
evidence: explicit
status: verified
updated: 8c943640
---

> `ref.coding-agent.env-vars` 是 pi-coding-agent 可见环境变量 catalog:覆盖 provider API key、provider request 配置、`PI_*` 产品开关、配置值 `$ENV` 模板读取规则,并标出当前未纳入本 coding-agent 节点的相邻包变量边界。

## 能回答的问题

- 某个内置 provider 会读取哪个 API key 环境变量?
- `PI_OFFLINE`、`PI_TELEMETRY`、`PI_EXPERIMENTAL`、`PI_CACHE_RETENTION` 分别控制什么?
- Azure、Cloudflare、Google Vertex、Amazon Bedrock 除 API key 外还需要哪些 env?
- `models.json`、`auth.json` provider env、headers 里的 `$ENV` / `${ENV}` 如何解析?
- 哪些 env 是 coding-agent 启动/config 层读取,哪些是 `pi-ai` provider 层读取?

## 读取规则与范围

`pi-ai` provider env lookup 的基础 helper 是 `getProviderEnvValue(name, env)`:先读 provider-scoped `env?.[name]`,再读 `process.env[name]`,最后在 Bun compiled binary 且 `process.env` 为空时读 `/proc/self/environ` fallback。[E: packages/ai/src/utils/provider-env.ts:45][E: packages/ai/src/utils/provider-env.ts:47][E: packages/ai/src/utils/provider-env.ts:48][E: packages/ai/src/utils/provider-env.ts:49] `defaultProviderAuthContext().env(name)` 只把存在且 trim 后非空的 process env 字符串交给 auth resolver。[E: packages/ai/src/auth/context.ts:25][E: packages/ai/src/auth/context.ts:26][E: packages/ai/src/auth/context.ts:27] `envApiKeyAuth()` 的 stored credential key 优先于 env var,否则按传入 env var 顺序取第一个有值项。[E: packages/ai/src/auth/helpers.ts:16][E: packages/ai/src/auth/helpers.ts:17][E: packages/ai/src/auth/helpers.ts:18][E: packages/ai/src/auth/helpers.ts:19][E: packages/ai/src/auth/helpers.ts:20]

`resolve-config-value.ts` 不是有限 env var catalog,而是一套字符串解析语法:非 command 字符串扫描 `$ENV_VAR` 与 `${ENV_VAR}`,从传入 `env` 或 `process.env` 解析;缺失变量让解析结果变成 `undefined` 或 strict 入口里的错误。[E: packages/coding-agent/src/core/resolve-config-value.ts:28][E: packages/coding-agent/src/core/resolve-config-value.ts:57][E: packages/coding-agent/src/core/resolve-config-value.ts:66][E: packages/coding-agent/src/core/resolve-config-value.ts:88][E: packages/coding-agent/src/core/resolve-config-value.ts:89][E: packages/coding-agent/src/core/resolve-config-value.ts:108][E: packages/coding-agent/src/core/resolve-config-value.ts:109][E: packages/coding-agent/src/core/resolve-config-value.ts:229][E: packages/coding-agent/src/core/resolve-config-value.ts:243] 因此本 catalog 把 `$ENV` / `${ENV}` 作为动态规则列出,不试图枚举用户自定义 provider、headers 或 extension 里可能出现的任意变量。[I]

本节点范围是 coding-agent 产品层和它直接消费的 `pi-ai` provider/env 通道;`packages/orchestrator` 的 `PI_ORCHESTRATOR_*` / Radius env、以及只在 `packages/tui` 内部读取的 debug env 不作为本节点逐实例 catalog 的权威覆盖对象。[U]

## Provider API key 与 token env

`findEnvKeys(provider, env)` 只报告当前有值的 API key env var;`getEnvApiKey(provider, env)` 取第一个 found key,然后才进入 Vertex ADC 与 Bedrock ambient credential branches。[E: packages/ai/src/env-api-keys.ts:121][E: packages/ai/src/env-api-keys.ts:125][E: packages/ai/src/env-api-keys.ts:126][E: packages/ai/src/env-api-keys.ts:136][E: packages/ai/src/env-api-keys.ts:137][E: packages/ai/src/env-api-keys.ts:139][E: packages/ai/src/env-api-keys.ts:144][E: packages/ai/src/env-api-keys.ts:156] `anthropic` 的 env order 是 `ANTHROPIC_OAUTH_TOKEN` 再 `ANTHROPIC_API_KEY`,所以 OAuth token env 会优先于 API key env。[E: packages/ai/src/env-api-keys.ts:70][E: packages/ai/src/env-api-keys.ts:71][E: packages/ai/src/providers/anthropic.ts:14]

| env var | provider id(s) | 类型 | 默认 | 含义 / 为什么 | 源 |
|---|---|---|---|---|---|
| `ANTHROPIC_OAUTH_TOKEN` | `anthropic` | secret token | unset | Anthropic env auth 的第一优先级 token;`envApiKeyAuth()` 会按数组顺序解析。[E: packages/ai/src/env-api-keys.ts:70][E: packages/ai/src/env-api-keys.ts:71][E: packages/ai/src/providers/anthropic.ts:14] | `packages/ai/src/env-api-keys.ts:71` |
| `ANTHROPIC_API_KEY` | `anthropic` | secret API key | unset | Anthropic env auth 的第二候选;也在 CLI help 中列为 Claude API key。[E: packages/ai/src/env-api-keys.ts:71][E: packages/coding-agent/src/cli/args.ts:336] | `packages/ai/src/env-api-keys.ts:71` |
| `COPILOT_GITHUB_TOKEN` | `github-copilot` | secret token | unset | GitHub Copilot token auth env;provider 还支持 lazy OAuth,但该 env 是 api-key auth 路径。[E: packages/ai/src/env-api-keys.ts:65][E: packages/ai/src/env-api-keys.ts:66][E: packages/ai/src/providers/github-copilot.ts:15][E: packages/ai/src/providers/github-copilot.ts:16] | `packages/ai/src/env-api-keys.ts:66` |
| `ANT_LING_API_KEY` | `ant-ling` | secret API key | unset | Ant Ling provider API key。[E: packages/ai/src/env-api-keys.ts:75] | `packages/ai/src/env-api-keys.ts:75` |
| `OPENAI_API_KEY` | `openai` | secret API key | unset | OpenAI provider API key。[E: packages/ai/src/env-api-keys.ts:76] | `packages/ai/src/env-api-keys.ts:76` |
| `AZURE_OPENAI_API_KEY` | `azure-openai-responses` | secret API key | unset | Azure OpenAI Responses provider API key;endpoint/version 由额外 Azure env 或 model/options 解析。[E: packages/ai/src/env-api-keys.ts:77][E: packages/ai/src/api/azure-openai-responses.ts:207][E: packages/ai/src/api/azure-openai-responses.ts:217][E: packages/ai/src/api/azure-openai-responses.ts:208] | `packages/ai/src/env-api-keys.ts:77` |
| `NVIDIA_API_KEY` | `nvidia` | secret API key | unset | NVIDIA NIM provider API key。[E: packages/ai/src/env-api-keys.ts:78] | `packages/ai/src/env-api-keys.ts:78` |
| `DEEPSEEK_API_KEY` | `deepseek` | secret API key | unset | DeepSeek provider API key。[E: packages/ai/src/env-api-keys.ts:79] | `packages/ai/src/env-api-keys.ts:79` |
| `GEMINI_API_KEY` | `google` | secret API key | unset | Google Gemini provider API key。[E: packages/ai/src/env-api-keys.ts:80] | `packages/ai/src/env-api-keys.ts:80` |
| `GOOGLE_CLOUD_API_KEY` | `google-vertex` | secret API key | unset | Google Vertex explicit API key;如果缺失,Vertex provider 可尝试 ADC + project + location。[E: packages/ai/src/env-api-keys.ts:81][E: packages/ai/src/providers/google-vertex.ts:16][E: packages/ai/src/providers/google-vertex.ts:19][E: packages/ai/src/providers/google-vertex.ts:21][E: packages/ai/src/providers/google-vertex.ts:22] | `packages/ai/src/env-api-keys.ts:81` |
| `GROQ_API_KEY` | `groq` | secret API key | unset | Groq provider API key。[E: packages/ai/src/env-api-keys.ts:82] | `packages/ai/src/env-api-keys.ts:82` |
| `CEREBRAS_API_KEY` | `cerebras` | secret API key | unset | Cerebras provider API key。[E: packages/ai/src/env-api-keys.ts:83] | `packages/ai/src/env-api-keys.ts:83` |
| `XAI_API_KEY` | `xai` | secret API key | unset | xAI provider API key。[E: packages/ai/src/env-api-keys.ts:84] | `packages/ai/src/env-api-keys.ts:84` |
| `OPENROUTER_API_KEY` | `openrouter` | secret API key | unset | OpenRouter text provider API key;OpenRouter image provider also uses the same env in its own provider file, outside `env-api-keys.ts` text-provider map。[E: packages/ai/src/env-api-keys.ts:85][I] | `packages/ai/src/env-api-keys.ts:85` |
| `AI_GATEWAY_API_KEY` | `vercel-ai-gateway` | secret API key | unset | Vercel AI Gateway provider API key。[E: packages/ai/src/env-api-keys.ts:86] | `packages/ai/src/env-api-keys.ts:86` |
| `ZAI_API_KEY` | `zai` | secret API key | unset | ZAI Coding Plan global provider API key。[E: packages/ai/src/env-api-keys.ts:87] | `packages/ai/src/env-api-keys.ts:87` |
| `ZAI_CODING_CN_API_KEY` | `zai-coding-cn` | secret API key | unset | ZAI Coding Plan China provider API key。[E: packages/ai/src/env-api-keys.ts:88] | `packages/ai/src/env-api-keys.ts:88` |
| `MISTRAL_API_KEY` | `mistral` | secret API key | unset | Mistral provider API key。[E: packages/ai/src/env-api-keys.ts:89] | `packages/ai/src/env-api-keys.ts:89` |
| `MINIMAX_API_KEY` | `minimax` | secret API key | unset | MiniMax global provider API key。[E: packages/ai/src/env-api-keys.ts:90] | `packages/ai/src/env-api-keys.ts:90` |
| `MINIMAX_CN_API_KEY` | `minimax-cn` | secret API key | unset | MiniMax China provider API key。[E: packages/ai/src/env-api-keys.ts:91] | `packages/ai/src/env-api-keys.ts:91` |
| `MOONSHOT_API_KEY` | `moonshotai`, `moonshotai-cn` | secret API key | unset | Moonshot global and China provider ids share one env var。[E: packages/ai/src/env-api-keys.ts:92][E: packages/ai/src/env-api-keys.ts:93] | `packages/ai/src/env-api-keys.ts:92` |
| `HF_TOKEN` | `huggingface` | secret token | unset | Hugging Face provider token。[E: packages/ai/src/env-api-keys.ts:94] | `packages/ai/src/env-api-keys.ts:94` |
| `FIREWORKS_API_KEY` | `fireworks` | secret API key | unset | Fireworks provider API key。[E: packages/ai/src/env-api-keys.ts:95] | `packages/ai/src/env-api-keys.ts:95` |
| `TOGETHER_API_KEY` | `together` | secret API key | unset | Together AI provider API key。[E: packages/ai/src/env-api-keys.ts:96] | `packages/ai/src/env-api-keys.ts:96` |
| `OPENCODE_API_KEY` | `opencode`, `opencode-go` | secret API key | unset | OpenCode Zen and OpenCode Go provider ids share one env var。[E: packages/ai/src/env-api-keys.ts:97][E: packages/ai/src/env-api-keys.ts:98] | `packages/ai/src/env-api-keys.ts:97` |
| `KIMI_API_KEY` | `kimi-coding` | secret API key | unset | Kimi For Coding provider API key。[E: packages/ai/src/env-api-keys.ts:99] | `packages/ai/src/env-api-keys.ts:99` |
| `CLOUDFLARE_API_KEY` | `cloudflare-workers-ai`, `cloudflare-ai-gateway` | secret API key | unset | Cloudflare Workers AI and AI Gateway token;Cloudflare auth also requires account id and, for AI Gateway, gateway id。[E: packages/ai/src/env-api-keys.ts:100][E: packages/ai/src/env-api-keys.ts:101][E: packages/ai/src/providers/cloudflare-auth.ts:38][E: packages/ai/src/providers/cloudflare-auth.ts:39][E: packages/ai/src/providers/cloudflare-auth.ts:40][E: packages/ai/src/providers/cloudflare-auth.ts:42] | `packages/ai/src/env-api-keys.ts:100` |
| `XIAOMI_API_KEY` | `xiaomi` | secret API key | unset | Xiaomi MiMo provider API key。[E: packages/ai/src/env-api-keys.ts:102] | `packages/ai/src/env-api-keys.ts:102` |
| `XIAOMI_TOKEN_PLAN_CN_API_KEY` | `xiaomi-token-plan-cn` | secret API key | unset | Xiaomi token-plan China region API key。[E: packages/ai/src/env-api-keys.ts:103] | `packages/ai/src/env-api-keys.ts:103` |
| `XIAOMI_TOKEN_PLAN_AMS_API_KEY` | `xiaomi-token-plan-ams` | secret API key | unset | Xiaomi token-plan Amsterdam region API key。[E: packages/ai/src/env-api-keys.ts:104] | `packages/ai/src/env-api-keys.ts:104` |
| `XIAOMI_TOKEN_PLAN_SGP_API_KEY` | `xiaomi-token-plan-sgp` | secret API key | unset | Xiaomi token-plan Singapore region API key。[E: packages/ai/src/env-api-keys.ts:105] | `packages/ai/src/env-api-keys.ts:105` |

## Provider configuration and ambient auth env

| env var | owner | 类型 | 默认 | 含义 / 为什么 | 源 |
|---|---|---|---|---|---|
| `AZURE_OPENAI_BASE_URL` | Azure OpenAI Responses | URL | model `baseUrl` fallback or error | Explicit Azure endpoint;如果 absent,code 可用 resource name 或 model base URL。[E: packages/ai/src/api/azure-openai-responses.ts:217][E: packages/ai/src/api/azure-openai-responses.ts:213][E: packages/ai/src/api/azure-openai-responses.ts:227][E: packages/ai/src/api/azure-openai-responses.ts:233] | `packages/ai/src/api/azure-openai-responses.ts:217` |
| `AZURE_OPENAI_RESOURCE_NAME` | Azure OpenAI Responses | string | unset | Azure resource name alternative;用于 build default base URL。[E: packages/ai/src/api/azure-openai-responses.ts:208][E: packages/ai/src/api/azure-openai-responses.ts:213][E: packages/ai/src/api/azure-openai-responses.ts:213] | `packages/ai/src/api/azure-openai-responses.ts:208` |
| `AZURE_OPENAI_API_VERSION` | Azure OpenAI Responses | string | `v1` | API version override;explicit option 优先,env 次之,然后默认版本。[E: packages/ai/src/api/azure-openai-responses.ts:201][E: packages/ai/src/api/azure-openai-responses.ts:207][E: packages/ai/src/api/azure-openai-responses.ts:204] | `packages/ai/src/api/azure-openai-responses.ts:207` |
| `AZURE_OPENAI_DEPLOYMENT_NAME_MAP` | Azure OpenAI Responses | mapping string | model id | model id 到 Azure deployment name 的 map;解析后按 `model.id` 查找,找不到就用 model id。[E: packages/ai/src/api/azure-openai-responses.ts:37][E: packages/ai/src/api/azure-openai-responses.ts:41][E: packages/ai/src/api/azure-openai-responses.ts:41][E: packages/ai/src/api/azure-openai-responses.ts:42][E: packages/ai/src/api/azure-openai-responses.ts:43] | `packages/ai/src/api/azure-openai-responses.ts:41` |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Workers AI / AI Gateway | string | unset | Cloudflare account id;required for both Cloudflare auth kinds and propagated into provider env/base URL。[E: packages/ai/src/providers/cloudflare-auth.ts:5][E: packages/ai/src/providers/cloudflare-auth.ts:39][E: packages/ai/src/providers/cloudflare-auth.ts:42][E: packages/ai/src/providers/cloudflare-auth.ts:47][E: packages/ai/src/providers/cloudflare-auth.ts:50] | `packages/ai/src/providers/cloudflare-auth.ts:39` |
| `CLOUDFLARE_GATEWAY_ID` | Cloudflare AI Gateway | string | unset | Cloudflare AI Gateway slug;required only for `ai-gateway` auth kind and included in provider env/base URL。[E: packages/ai/src/providers/cloudflare-auth.ts:6][E: packages/ai/src/providers/cloudflare-auth.ts:40][E: packages/ai/src/providers/cloudflare-auth.ts:42][E: packages/ai/src/providers/cloudflare-auth.ts:48][E: packages/ai/src/providers/cloudflare-auth.ts:50] | `packages/ai/src/providers/cloudflare-auth.ts:40` |
| `GOOGLE_APPLICATION_CREDENTIALS` | Google Vertex | file path | default ADC path | Vertex ADC explicit credentials file path;auth resolver checks it before the default ADC path,wire layer passes it as `keyFilename` when present。[E: packages/ai/src/env-api-keys.ts:32][E: packages/ai/src/env-api-keys.ts:51][E: packages/ai/src/providers/google-vertex.ts:19][E: packages/ai/src/providers/google-vertex.ts:20][E: packages/ai/src/api/google-vertex.ts:404][E: packages/ai/src/api/google-vertex.ts:404] | `packages/ai/src/env-api-keys.ts:32` |
| `GOOGLE_CLOUD_PROJECT` | Google Vertex | string | unset | Vertex project id;accepted before `GCLOUD_PROJECT` in compatibility discovery and wire resolution。[E: packages/ai/src/env-api-keys.ts:147][E: packages/ai/src/providers/google-vertex.ts:21][E: packages/ai/src/api/google-vertex.ts:421][E: packages/ai/src/api/google-vertex.ts:423] | `packages/ai/src/env-api-keys.ts:147` |
| `GCLOUD_PROJECT` | Google Vertex | string | unset | Alternate Vertex project id env;used after `GOOGLE_CLOUD_PROJECT`。[E: packages/ai/src/env-api-keys.ts:147][E: packages/ai/src/providers/google-vertex.ts:21][E: packages/ai/src/api/google-vertex.ts:424] | `packages/ai/src/env-api-keys.ts:147` |
| `GOOGLE_CLOUD_LOCATION` | Google Vertex | string | unset | Vertex location;required with ADC path/project for ambient Vertex auth marker and required by wire resolution。[E: packages/ai/src/env-api-keys.ts:149][E: packages/ai/src/providers/google-vertex.ts:22][E: packages/ai/src/api/google-vertex.ts:434][E: packages/ai/src/api/google-vertex.ts:434][E: packages/ai/src/api/google-vertex.ts:436] | `packages/ai/src/env-api-keys.ts:149` |
| `AWS_PROFILE` | Amazon Bedrock | profile name | SDK default chain | Bedrock ambient auth readiness source and BedrockRuntimeClientConfig profile source。[E: packages/ai/src/env-api-keys.ts:165][E: packages/ai/src/providers/amazon-bedrock.ts:16][E: packages/ai/src/api/bedrock-converse-stream.ts:133][E: packages/ai/src/api/bedrock-converse-stream.ts:133] | `packages/ai/src/env-api-keys.ts:165` |
| `AWS_ACCESS_KEY_ID` | Amazon Bedrock | secret access key id | unset | Bedrock ambient auth requires it together with `AWS_SECRET_ACCESS_KEY`;wire credentials builder also requires the pair。[E: packages/ai/src/env-api-keys.ts:166][E: packages/ai/src/providers/amazon-bedrock.ts:17][E: packages/ai/src/api/bedrock-converse-stream.ts:943][E: packages/ai/src/api/bedrock-converse-stream.ts:944][E: packages/ai/src/api/bedrock-converse-stream.ts:946] | `packages/ai/src/env-api-keys.ts:166` |
| `AWS_SECRET_ACCESS_KEY` | Amazon Bedrock | secret access key | unset | Pair for `AWS_ACCESS_KEY_ID`;wire credential object is not created unless both exist。[E: packages/ai/src/env-api-keys.ts:166][E: packages/ai/src/providers/amazon-bedrock.ts:17][E: packages/ai/src/api/bedrock-converse-stream.ts:945][E: packages/ai/src/api/bedrock-converse-stream.ts:946] | `packages/ai/src/env-api-keys.ts:166` |
| `AWS_SESSION_TOKEN` | Amazon Bedrock | secret session token | unset | Optional session token added to explicit Bedrock credentials when access key and secret are present。[E: packages/ai/src/api/bedrock-converse-stream.ts:958][E: packages/ai/src/api/bedrock-converse-stream.ts:962] | `packages/ai/src/api/bedrock-converse-stream.ts:958` |
| `AWS_BEARER_TOKEN_BEDROCK` | Amazon Bedrock | secret bearer token | unset | Bedrock ambient readiness source and bearer token request auth source unless `AWS_BEDROCK_SKIP_AUTH=1`。[E: packages/ai/src/env-api-keys.ts:167][E: packages/ai/src/providers/amazon-bedrock.ts:15][E: packages/ai/src/api/bedrock-converse-stream.ts:153][E: packages/ai/src/api/bedrock-converse-stream.ts:154][E: packages/ai/src/api/bedrock-converse-stream.ts:155] | `packages/ai/src/env-api-keys.ts:167` |
| `AWS_CONTAINER_CREDENTIALS_RELATIVE_URI` | Amazon Bedrock | ECS credential URI | unset | Bedrock ambient readiness source for ECS task role credentials。[E: packages/ai/src/env-api-keys.ts:168][E: packages/ai/src/providers/amazon-bedrock.ts:20] | `packages/ai/src/env-api-keys.ts:168` |
| `AWS_CONTAINER_CREDENTIALS_FULL_URI` | Amazon Bedrock | ECS credential URI | unset | Bedrock ambient readiness source for ECS task role credentials using full URI。[E: packages/ai/src/env-api-keys.ts:169][E: packages/ai/src/providers/amazon-bedrock.ts:21] | `packages/ai/src/env-api-keys.ts:169` |
| `AWS_WEB_IDENTITY_TOKEN_FILE` | Amazon Bedrock | file path | unset | Bedrock ambient readiness source for web identity token / IRSA credentials。[E: packages/ai/src/env-api-keys.ts:170][E: packages/ai/src/providers/amazon-bedrock.ts:22] | `packages/ai/src/env-api-keys.ts:170` |
| `AWS_REGION` | Amazon Bedrock | region | fallback chain | Bedrock region fallback after explicit option;ARN region wins before configuredRegion,and explicit endpoint region can supply final region when configuredRegion is absent。[E: packages/ai/src/api/bedrock-converse-stream.ts:134][E: packages/ai/src/api/bedrock-converse-stream.ts:163][E: packages/ai/src/api/bedrock-converse-stream.ts:165][E: packages/ai/src/api/bedrock-converse-stream.ts:167][E: packages/ai/src/api/bedrock-converse-stream.ts:936][E: packages/ai/src/api/bedrock-converse-stream.ts:937] | `packages/ai/src/api/bedrock-converse-stream.ts:937` |
| `AWS_DEFAULT_REGION` | Amazon Bedrock | region | fallback chain | Bedrock configured region candidate after `AWS_REGION`。[E: packages/ai/src/api/bedrock-converse-stream.ts:936][E: packages/ai/src/api/bedrock-converse-stream.ts:937][E: packages/ai/src/api/bedrock-converse-stream.ts:938] | `packages/ai/src/api/bedrock-converse-stream.ts:938` |
| `AWS_BEDROCK_SKIP_AUTH` | Amazon Bedrock | boolean flag | off | When set to `"1"`,Bedrock proxy mode skips bearer/credential auth and installs dummy credentials。[E: packages/ai/src/api/bedrock-converse-stream.ts:153][E: packages/ai/src/api/bedrock-converse-stream.ts:175][E: packages/ai/src/api/bedrock-converse-stream.ts:175][E: packages/ai/src/api/bedrock-converse-stream.ts:176][E: packages/ai/src/api/bedrock-converse-stream.ts:177] | `packages/ai/src/api/bedrock-converse-stream.ts:153` |
| `AWS_BEDROCK_FORCE_HTTP1` | Amazon Bedrock | boolean flag | off | When set to `"1"`,Bedrock request handler uses HTTP/1.1 Node handler when no proxy handler is selected。[E: packages/ai/src/api/bedrock-converse-stream.ts:192][E: packages/ai/src/api/bedrock-converse-stream.ts:198] | `packages/ai/src/api/bedrock-converse-stream.ts:192` |
| `AWS_BEDROCK_FORCE_CACHE` | Amazon Bedrock | boolean flag | off | Allows cache points for application inference profiles whose ARN lacks recognizable Claude model name。[E: packages/ai/src/api/bedrock-converse-stream.ts:656][E: packages/ai/src/api/bedrock-converse-stream.ts:660][E: packages/ai/src/api/bedrock-converse-stream.ts:660] | `packages/ai/src/api/bedrock-converse-stream.ts:660` |
| `AWS_ENDPOINT_URL_BEDROCK_RUNTIME` | Amazon Bedrock / AWS SDK | URL | SDK default | User docs describe this as standard AWS SDK env for a Bedrock proxy endpoint; direct source reads are delegated to AWS SDK rather than explicit `getProviderEnvValue()` in this file set。[E: packages/coding-agent/docs/providers.md:201][E: packages/coding-agent/docs/providers.md:204][E: packages/coding-agent/docs/providers.md:205][I] | `packages/coding-agent/docs/providers.md:205` |
| `PI_CACHE_RETENTION` | provider request cache | enum-like string | `short` | `long` enables extended prompt cache retention where supported;Anthropic, OpenAI Responses, OpenAI Completions, and Bedrock helpers all fall back to `"short"` otherwise。[E: packages/ai/src/api/anthropic-messages.ts:46][E: packages/ai/src/api/anthropic-messages.ts:50][E: packages/ai/src/api/anthropic-messages.ts:51][E: packages/ai/src/api/openai-responses.ts:48][E: packages/ai/src/api/openai-responses.ts:52][E: packages/ai/src/api/openai-completions.ts:142][E: packages/ai/src/api/openai-completions.ts:146][E: packages/ai/src/api/bedrock-converse-stream.ts:603][E: packages/ai/src/api/bedrock-converse-stream.ts:614][E: packages/coding-agent/docs/usage.md:299] | `packages/ai/src/api/anthropic-messages.ts:50` |
| `PI_OAUTH_CALLBACK_HOST` | OAuth callback host | host string | `127.0.0.1` | Overrides the callback server host used by Anthropic OAuth and OpenAI Codex browser OAuth;the two flows keep their own fixed callback ports/paths。[E: packages/ai/src/utils/oauth/anthropic.ts:33][E: packages/ai/src/utils/oauth/anthropic.ts:34][E: packages/ai/src/utils/oauth/anthropic.ts:35][E: packages/ai/src/utils/oauth/openai-codex.ts:37][E: packages/ai/src/utils/oauth/openai-codex.ts:51][E: packages/ai/src/utils/oauth/openai-codex.ts:52] | `packages/ai/src/utils/oauth/anthropic.ts:33` |

## Coding-agent runtime and config env

| env var | owner | 类型 | 默认 | 含义 / 为什么 | 源 |
|---|---|---|---|---|---|
| `PI_CODING_AGENT_DIR` | config path | path | `~/.pi/agent` | Generated from `APP_NAME.toUpperCase() + "_CODING_AGENT_DIR"`;when set,`getAgentDir()` returns this path instead of the default agent dir。[E: packages/coding-agent/src/config.ts:489][E: packages/coding-agent/src/config.ts:491][E: packages/coding-agent/src/config.ts:495][E: packages/coding-agent/src/config.ts:516][E: packages/coding-agent/src/config.ts:518][E: packages/coding-agent/src/config.ts:520] | `packages/coding-agent/src/config.ts:495` |
| `PI_CODING_AGENT_SESSION_DIR` | session path | path | settings `sessionDir` / agent dir sessions | Generated from `APP_NAME.toUpperCase() + "_CODING_AGENT_SESSION_DIR"`;session dir precedence is CLI `--session-dir`,env var,then settings。[E: packages/coding-agent/src/config.ts:496][E: packages/coding-agent/src/main.ts:567][E: packages/coding-agent/src/main.ts:569][E: packages/coding-agent/src/main.ts:570][E: packages/coding-agent/src/main.ts:571] | `packages/coding-agent/src/config.ts:496` |
| `PI_PACKAGE_DIR` | package asset path | path | detected package root | Overrides package asset root,used before Bun binary / Node package detection。[E: packages/coding-agent/src/config.ts:367][E: packages/coding-agent/src/config.ts:369][E: packages/coding-agent/src/config.ts:370][E: packages/coding-agent/src/config.ts:371] | `packages/coding-agent/src/config.ts:369` |
| `PI_SHARE_VIEWER_URL` | share command URL | URL | `https://pi.dev/session/` | Base URL for share viewer links;`getShareViewerUrl()` appends `#<gistId>` to the env or default base。[E: packages/coding-agent/src/config.ts:502][E: packages/coding-agent/src/config.ts:505][E: packages/coding-agent/src/config.ts:506][E: packages/coding-agent/src/config.ts:507] | `packages/coding-agent/src/config.ts:506` |
| `PI_OFFLINE` | startup network gate | truthy flag | off | `main()` treats `--offline` or truthy env as offline,then writes `PI_OFFLINE=1` and `PI_SKIP_VERSION_CHECK=1`;version checks and tool/package network paths also consult it。[E: packages/coding-agent/src/main.ts:470][E: packages/coding-agent/src/main.ts:471][E: packages/coding-agent/src/main.ts:472][E: packages/coding-agent/src/main.ts:473][E: packages/coding-agent/src/utils/version-check.ts:34][E: packages/coding-agent/src/utils/tools-manager.ts:14][E: packages/coding-agent/src/utils/tools-manager.ts:15][E: packages/coding-agent/src/utils/tools-manager.ts:17][E: packages/coding-agent/src/core/package-manager.ts:42][E: packages/coding-agent/src/core/package-manager.ts:43][E: packages/coding-agent/src/core/package-manager.ts:45] | `packages/coding-agent/src/main.ts:470` |
| `PI_SKIP_VERSION_CHECK` | version check gate | presence flag | off | Any set value skips latest-version fetch;offline mode also sets it to `"1"` during startup。[E: packages/coding-agent/src/main.ts:472][E: packages/coding-agent/src/main.ts:473][E: packages/coding-agent/src/utils/version-check.ts:34] | `packages/coding-agent/src/utils/version-check.ts:34` |
| `PI_TELEMETRY` | telemetry / attribution gate | truthy override | settings fallback | Overrides install/update telemetry and default provider attribution gate:env present means parse env truthiness,env absent means `settingsManager.getEnableInstallTelemetry()`。[E: packages/coding-agent/src/core/telemetry.ts:3][E: packages/coding-agent/src/core/telemetry.ts:5][E: packages/coding-agent/src/core/telemetry.ts:8][E: packages/coding-agent/src/core/telemetry.ts:10][E: packages/coding-agent/src/core/telemetry.ts:12][E: packages/coding-agent/docs/usage.md:298] | `packages/coding-agent/src/core/telemetry.ts:10` |
| `PI_EXPERIMENTAL` | experimental feature gate | exact flag | off | Experimental features are enabled only when env equals `"1"`;first-time setup and footer xp marker consume this helper。[E: packages/coding-agent/src/core/experimental.ts:1][E: packages/coding-agent/src/core/experimental.ts:2][E: packages/coding-agent/src/cli/startup-ui.ts:125][E: packages/coding-agent/src/modes/interactive/components/footer.ts:163] | `packages/coding-agent/src/core/experimental.ts:2` |
| `PI_TIMING` | startup profiling | exact flag | off | Timing module snapshots `PI_TIMING === "1"` at module load;disabled paths return without recording or printing。[E: packages/coding-agent/src/core/timings.ts:6][E: packages/coding-agent/src/core/timings.ts:16][E: packages/coding-agent/src/core/timings.ts:17][E: packages/coding-agent/src/core/timings.ts:21][E: packages/coding-agent/src/core/timings.ts:22][E: packages/coding-agent/src/core/timings.ts:45][E: packages/coding-agent/src/core/timings.ts:46] | `packages/coding-agent/src/core/timings.ts:6` |
| `PI_STARTUP_BENCHMARK` | startup benchmark mode | truthy flag | off | Truthy env enables interactive startup benchmark;non-interactive modes error out。[E: packages/coding-agent/src/main.ts:800][E: packages/coding-agent/src/main.ts:801][E: packages/coding-agent/src/main.ts:802][E: packages/coding-agent/src/main.ts:803] | `packages/coding-agent/src/main.ts:800` |
| `PI_CLEAR_ON_SHRINK` | terminal rendering | exact flag | off | `SettingsManager.getClearOnShrink()` uses settings first,then env equals `"1"`,then false。[E: packages/coding-agent/src/core/settings-manager.ts:1078][E: packages/coding-agent/src/core/settings-manager.ts:1080][E: packages/coding-agent/src/core/settings-manager.ts:1081][E: packages/coding-agent/src/core/settings-manager.ts:1083] | `packages/coding-agent/src/core/settings-manager.ts:1082` |
| `PI_HARDWARE_CURSOR` | terminal rendering | exact flag | off | `SettingsManager.getShowHardwareCursor()` uses setting first,then env equals `"1"`。[E: packages/coding-agent/src/core/settings-manager.ts:1166][E: packages/coding-agent/src/core/settings-manager.ts:1167] | `packages/coding-agent/src/core/settings-manager.ts:1166` |
| `PI_CODING_AGENT` | process marker | string | set by entrypoint | CLI and RPC entrypoints set this env to `"true"` before calling `main()`;source shown here writes it,not a user-facing config knob。[E: packages/coding-agent/src/cli.ts:13][E: packages/coding-agent/src/rpc-entry.ts:7][I] | `packages/coding-agent/src/cli.ts:13` |
| `VISUAL` | external editor fallback | command | unset | `externalEditor` setting takes precedence;when unset,settings manager uses `VISUAL` then `EDITOR`,then platform default editor。[E: packages/coding-agent/src/core/settings-manager.ts:846][E: packages/coding-agent/src/core/settings-manager.ts:847][E: packages/coding-agent/src/core/settings-manager.ts:851][E: packages/coding-agent/src/core/settings-manager.ts:855][E: packages/coding-agent/docs/usage.md:300] | `packages/coding-agent/src/core/settings-manager.ts:850` |
| `EDITOR` | external editor fallback | command | unset | Fallback after `VISUAL` for Ctrl+G external editor command when `externalEditor` setting is empty。[E: packages/coding-agent/src/core/settings-manager.ts:851][E: packages/coding-agent/docs/usage.md:300] | `packages/coding-agent/src/core/settings-manager.ts:850` |
| `HTTP_PROXY` | HTTP proxy | URL | unset | `httpProxy` setting writes this env with nullish assignment before undici `EnvHttpProxyAgent` is configured;existing env is not overwritten。[E: packages/coding-agent/src/core/http-dispatcher.ts:43][E: packages/coding-agent/src/core/http-dispatcher.ts:43][E: packages/coding-agent/src/core/http-dispatcher.ts:45][E: packages/coding-agent/src/core/http-dispatcher.ts:50][E: packages/coding-agent/src/core/http-dispatcher.ts:55] | `packages/coding-agent/src/core/http-dispatcher.ts:45` |
| `HTTPS_PROXY` | HTTP proxy | URL | unset | `httpProxy` setting writes this env with nullish assignment;undici proxy agent then reads env proxy settings。[E: packages/coding-agent/src/core/http-dispatcher.ts:43][E: packages/coding-agent/src/core/http-dispatcher.ts:43][E: packages/coding-agent/src/core/http-dispatcher.ts:46][E: packages/coding-agent/src/core/http-dispatcher.ts:55] | `packages/coding-agent/src/core/http-dispatcher.ts:46` |
| `PNPM_HOME` | self-update command construction | path | inferred global dir | pnpm self-update command uses `PNPM_HOME` as `--config.global-bin-dir` when a pnpm global path match is inferred;this is package-manager host integration,not Pi-specific config。[E: packages/coding-agent/src/config.ts:126][E: packages/coding-agent/src/config.ts:129][E: packages/coding-agent/src/config.ts:130][I] | `packages/coding-agent/src/config.ts:130` |
| `$ENV_VAR` / `${ENV_VAR}` in config values | models/auth/header config | dynamic template | literal/config dependent | Any valid env name referenced in config strings can be resolved from provider-scoped env or `process.env`;`$$` and `$!` are escapes,not env names。[E: packages/coding-agent/src/core/resolve-config-value.ts:42][E: packages/coding-agent/src/core/resolve-config-value.ts:48][E: packages/coding-agent/src/core/resolve-config-value.ts:57][E: packages/coding-agent/src/core/resolve-config-value.ts:66][E: packages/coding-agent/src/core/resolve-config-value.ts:88][E: packages/coding-agent/src/core/resolve-config-value.ts:89][E: packages/coding-agent/src/core/resolve-config-value.ts:101][E: packages/coding-agent/src/core/resolve-config-value.ts:108][E: packages/coding-agent/src/core/resolve-config-value.ts:109] | `packages/coding-agent/src/core/resolve-config-value.ts:101` |

## 跨包关系

[subsys.ai.env-api-keys](../subsystems/ai/env-api-keys.md) 是 provider API key discovery 的 subsystem 节点:它解释 `getApiKeyEnvVars()`、`findEnvKeys()`、`getEnvApiKey()` 和 Bun sandbox env fallback 的控制流;本 catalog 只把每个 env var 实例展开成可 grep 的行。[E: packages/ai/src/env-api-keys.ts:64][E: packages/ai/src/env-api-keys.ts:121][E: packages/ai/src/env-api-keys.ts:136][I]

[surface.config.resolution](../surface/config/resolution.md) 是 `$ENV` / `${ENV}` / `!cmd` 配置字符串解析的 surface 节点;本 catalog 把这套动态 env 语法列为一个规则,因为它允许用户在 `models.json`、provider headers、auth config 中引入任意 env name。[E: packages/coding-agent/src/core/resolve-config-value.ts:57][E: packages/coding-agent/src/core/resolve-config-value.ts:66][E: packages/coding-agent/src/core/resolve-config-value.ts:80][E: packages/coding-agent/src/core/resolve-config-value.ts:81][E: packages/coding-agent/src/core/resolve-config-value.ts:85][E: packages/coding-agent/src/core/resolve-config-value.ts:229][I]

[subsys.coding-agent.telemetry](../subsystems/coding-agent/telemetry.md) 解释 `PI_TELEMETRY`、`PI_EXPERIMENTAL`、`PI_TIMING` 的行为细节;本 catalog 保持逐实例目录视角,不重复 provider attribution header 合并策略。[E: packages/coding-agent/src/core/telemetry.ts:10][E: packages/coding-agent/src/core/experimental.ts:2][E: packages/coding-agent/src/core/timings.ts:6][I]

## Sources

- packages/ai/src/env-api-keys.ts
- packages/ai/src/utils/provider-env.ts
- packages/ai/src/auth/context.ts
- packages/ai/src/auth/helpers.ts
- packages/ai/src/providers/anthropic.ts
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
- packages/ai/src/utils/oauth/anthropic.ts
- packages/ai/src/utils/oauth/openai-codex.ts
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
