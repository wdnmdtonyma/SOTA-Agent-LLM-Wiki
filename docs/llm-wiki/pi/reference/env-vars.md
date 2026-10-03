---
id: ref.coding-agent.env-vars
title: 环境变量目录(110)
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
 - packages/ai/src/providers/meta.ts
 - packages/ai/src/providers/typesafe.ts
 - packages/ai/src/providers/qwen-token-plan.ts
 - packages/ai/src/providers/qwen-token-plan-cn.ts
 - packages/ai/src/providers/qwen-token-plan-individual.ts
 - packages/tui/src/terminal.ts
 - packages/tui/src/terminal-image.ts
 - packages/tui/src/tui-main-screen.ts
 - packages/coding-agent/docs/terminal-setup.md
 - packages/coding-agent/docs/environment-variables.md
 - packages/ai/src/providers/github-copilot.ts
 - packages/ai/src/providers/amazon-bedrock.ts
 - packages/ai/src/providers/cloudflare-auth.ts
 - packages/ai/src/providers/google-vertex.ts
 - packages/ai/src/providers/radius.ts
 - packages/ai/src/providers/radius-config.ts
 - packages/ai/src/providers/openrouter.ts
 - packages/ai/src/api/anthropic-messages.ts
 - packages/ai/src/api/openai-responses.ts
 - packages/ai/src/api/openai-completions.ts
 - packages/ai/src/api/pi-messages.ts
 - packages/ai/src/api/azure-openai-responses.ts
 - packages/ai/src/api/bedrock-converse-stream.ts
 - packages/ai/src/api/google-vertex.ts
 - packages/ai/src/auth/oauth/anthropic.ts
 - packages/ai/src/auth/oauth/kimi-coding.ts
 - packages/ai/src/auth/oauth/openai-codex.ts
 - packages/ai/src/auth/oauth/openai-chatgpt.ts
 - packages/ai/src/auth/oauth/openrouter.ts
 - packages/ai/test/anthropic-federation.test.ts
 - packages/coding-agent/src/config.ts
 - packages/coding-agent/src/main.ts
 - packages/coding-agent/src/cli.ts
 - packages/coding-agent/src/cli/setup.ts
 - packages/coding-agent/src/rpc-entry.ts
 - packages/coding-agent/src/cli/args.ts
 - packages/coding-agent/src/cli/startup-ui.ts
 - packages/coding-agent/src/modes/interactive/components/footer.ts
 - packages/coding-agent/src/core/experimental.ts
 - packages/coding-agent/src/core/telemetry.ts
 - packages/coding-agent/src/core/timings.ts
 - packages/coding-agent/src/core/settings-manager.ts
 - packages/coding-agent/src/core/tools/bash.ts
 - packages/coding-agent/src/core/tools/powershell.ts
 - packages/coding-agent/src/core/http-dispatcher.ts
 - packages/coding-agent/src/core/resolve-config-value.ts
 - packages/coding-agent/src/core/radius.ts
 - packages/coding-agent/src/core/package-manager.ts
 - packages/coding-agent/src/core/cache-warmer.ts
 - packages/coding-agent/src/package-manager-cli.ts
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
 - ANTHROPIC_FEDERATION_RULE_ID_ENV
 - ANTHROPIC_ORGANIZATION_ID_ENV
 - ANTHROPIC_IDENTITY_TOKEN_FILE_ENV
 - ANTHROPIC_SERVICE_ACCOUNT_ID_ENV
 - ANTHROPIC_WORKSPACE_ID_ENV
 - areExperimentalFeaturesEnabled
 - isInstallTelemetryEnabled
 - resolveConfigValue
 - BashToolOptions
 - detectCapabilities
 - setCapabilityOverrides
 - getTerminalCapabilityOverrides
related:
 - surface.config.resolution
 - subsys.ai.env-api-keys
 - subsys.coding-agent.telemetry
evidence: explicit
status: verified
updated: 4c6fb7cfe8
---

> `ref.coding-agent.env-vars` 是 pi-coding-agent 可见环境变量 catalog:覆盖 provider API key、Anthropic workload identity federation、provider request 配置、`PI_*` 产品开关、配置值 `$ENV` 模板读取规则,并标出当前未纳入本 coding-agent 节点的相邻包变量边界。

## 能回答的问题

- 某个内置 provider 会读取哪个 API key 环境变量?
- `ANTHROPIC_FEDERATION_RULE_ID`、`ANTHROPIC_ORGANIZATION_ID`、`ANTHROPIC_IDENTITY_TOKEN_FILE` 何时生效,和 `ANTHROPIC_API_KEY` / `ANTHROPIC_AUTH_TOKEN` 谁优先?
- `PI_OFFLINE`、`PI_TELEMETRY`、`PI_EXPERIMENTAL`、`PI_CACHE_RETENTION` 分别控制什么?
- `PI_HYPERLINKS`、`PI_IMAGE_PROTOCOL`、`PI_TRUE_COLOR` 如何覆盖终端 capability 探测?
- Azure、Cloudflare、Google Vertex、Amazon Bedrock 除 API key 外还需要哪些 env?
- `models.json`、`auth.json` provider env、headers 里的 `$ENV` / `${ENV}` 如何解析?
- 哪些 env 是 coding-agent 启动/config 层读取,哪些是 `pi-ai` provider 层读取?
- 哪些 `PI_*` 是 Pi 读取的配置，哪些只是模型 `bash` / `powershell` 子进程收到的 session metadata?

## 读取规则与范围

`pi-ai` provider env lookup 的基础 helper 是 `getProviderEnvValue(name, env)`:先读 provider-scoped `env?.[name]`,再读 `process.env[name]`,最后在 Bun compiled binary 且 `process.env` 为空时读 `/proc/self/environ` fallback。[E: packages/ai/src/utils/provider-env.ts:45][E: packages/ai/src/utils/provider-env.ts:47][E: packages/ai/src/utils/provider-env.ts:48][E: packages/ai/src/utils/provider-env.ts:49] `defaultProviderAuthContext().env(name)` 只把存在且 trim 后非空的 process env 字符串交给 auth resolver。[E: packages/ai/src/auth/context.ts:25][E: packages/ai/src/auth/context.ts:26][E: packages/ai/src/auth/context.ts:27] `envApiKeyAuth()` 的 stored credential key 优先于 env var,否则按传入 env var 顺序取第一个有值项。[E: packages/ai/src/auth/helpers.ts:9][E: packages/ai/src/auth/helpers.ts:21][E: packages/ai/src/auth/helpers.ts:23][E: packages/ai/src/auth/helpers.ts:24][E: packages/ai/src/auth/helpers.ts:26]

`resolve-config-value.ts` 不是有限 env var catalog,而是一套字符串解析语法:非 command 字符串扫描 `$ENV_VAR` 与 `${ENV_VAR}`,从传入 `env` 或 `process.env` 解析;缺失变量让解析结果变成 `undefined` 或 strict 入口里的错误。[E: packages/coding-agent/src/core/resolve-config-value.ts:11][E: packages/coding-agent/src/core/resolve-config-value.ts:57][E: packages/coding-agent/src/core/resolve-config-value.ts:66][E: packages/coding-agent/src/core/resolve-config-value.ts:88][E: packages/coding-agent/src/core/resolve-config-value.ts:89][E: packages/coding-agent/src/core/resolve-config-value.ts:108][E: packages/coding-agent/src/core/resolve-config-value.ts:109][E: packages/coding-agent/src/core/resolve-config-value.ts:146][E: packages/coding-agent/src/core/resolve-config-value.ts:229][E: packages/coding-agent/src/core/resolve-config-value.ts:243] 因此本 catalog 把 `$ENV` / `${ENV}` 作为动态规则列出,不试图枚举用户自定义 provider、headers 或 extension 里可能出现的任意变量名。[I]

本节点按 **110** 个 catalog 实例计数:provider API key / token、Kimi OAuth host override、Anthropic federation 五个 `ANTHROPIC_*` 变量、provider request 与 ambient auth、coding-agent 产品 `PI_*`（含 `PI_RADIUS_GATEWAY`）/ 编辑器 / proxy,3 个 terminal capability override env(`PI_HYPERLINKS`、`PI_IMAGE_PROTOCOL`、`PI_TRUE_COLOR`),以及 TUI debug env `PI_TUI_DEBUG_REDRAW`、`PI_TUI_WRITE_LOG`、`PI_TUI_DEBUG`。`$ENV_VAR` / `${ENV_VAR}` 作为动态解析规则计入,不枚举用户自定义变量名。`packages/coding-agent/docs/environment-variables.md` 只作交叉核对,不把文档独有、源码未读的名字写进表。[I] `PI_EVAL_RUNS_PER_VARIANT` 属于 `packages/evals`，**不**计入本产品 catalog [I]。`AWS_ENDPOINT_URL_BEDROCK_RUNTIME` 在本 checkout 的源码与 `docs/providers.md` 中均不出现，不计入 [I]。`packages/coding-agent/src/experimental/server.ts` 的 `PI_SERVER_DIR` / `PI_SERVER_ID` 与 `session-worker.ts` 的 `PI_SESSION_WORKER_*` 不计入。[U]

本节点范围是 coding-agent 产品层和它直接消费的 `pi-ai` provider/env 通道,以及用户文档列出的 TUI capability override，外加 TUI 源码中的 `PI_TUI_DEBUG_REDRAW`、`PI_TUI_WRITE_LOG` 与 `PI_TUI_DEBUG`。`packages/server` 的 `PI_SERVER_*` 不作为本节点逐实例 catalog 的权威覆盖对象。[U]

## Provider API key 与 token env

`findEnvKeys(provider, env)` 报告当前有值的 candidate env vars；`getEnvApiKey(provider, env)` 通常取第一个 found key，然后才进入 Vertex ADC 与 Bedrock ambient credential branches。[E: packages/ai/src/env-api-keys.ts:138][E: packages/ai/src/env-api-keys.ts:142][E: packages/ai/src/env-api-keys.ts:143][E: packages/ai/src/env-api-keys.ts:153][E: packages/ai/src/env-api-keys.ts:154][E: packages/ai/src/env-api-keys.ts:157][E: packages/ai/src/env-api-keys.ts:162][E: packages/ai/src/env-api-keys.ts:174] Anthropic 是例外：discovery/status 顺序是 AUTH_TOKEN、OAUTH_TOKEN、API_KEY，但 `getEnvApiKey()` 跳过 AUTH_TOKEN；provider request auth 则按 stored credential、AUTH_TOKEN Bearer header、OAUTH_TOKEN/API_KEY、最后 workload identity federation 的顺序解析。Federation 五个变量**不**在 `getApiKeyEnvVars()` / `findEnvKeys()` 里。[E: packages/ai/src/env-api-keys.ts:29][E: packages/ai/src/env-api-keys.ts:30][E: packages/ai/src/env-api-keys.ts:31][E: packages/ai/src/env-api-keys.ts:32][E: packages/ai/src/env-api-keys.ts:80][E: packages/ai/src/env-api-keys.ts:81][E: packages/ai/src/env-api-keys.ts:156][E: packages/ai/src/providers/anthropic.ts:30][E: packages/ai/src/providers/anthropic.ts:34][E: packages/ai/src/providers/anthropic.ts:38][E: packages/ai/src/providers/anthropic.ts:43][E: packages/ai/src/providers/anthropic.ts:46][E: packages/ai/src/providers/anthropic.ts:53][E: packages/ai/src/providers/anthropic.ts:69]

| env var | provider id(s) | 类型 | 默认 | 含义 / 为什么 | 源 |
|---|---|---|---|---|---|
| `ANTHROPIC_AUTH_TOKEN` | `anthropic` | secret bearer token | unset | discovery/status 的第一候选；provider 把它放进 `Authorization: Bearer` header，`getEnvApiKey()` 刻意不把它当 API key 返回。[E: packages/ai/src/env-api-keys.ts:29][E: packages/ai/src/env-api-keys.ts:81][E: packages/ai/src/env-api-keys.ts:156][E: packages/ai/src/providers/anthropic.ts:34][E: packages/ai/src/providers/anthropic.ts:38] | `packages/ai/src/env-api-keys.ts:29` |
| `ANTHROPIC_OAUTH_TOKEN` | `anthropic` | secret token | unset | AUTH_TOKEN 缺失后，provider 将它作为 `apiKey` auth 的下一候选；API key 再后。[E: packages/ai/src/env-api-keys.ts:30][E: packages/ai/src/env-api-keys.ts:81][E: packages/ai/src/providers/anthropic.ts:43][E: packages/ai/src/providers/anthropic.ts:46] | `packages/ai/src/env-api-keys.ts:30` |
| `ANTHROPIC_API_KEY` | `anthropic` | secret API key | unset | Anthropic env auth 的第三候选；也在 CLI help 中列为 Claude API key。与 federation 同时存在时 API key 赢。[E: packages/ai/src/env-api-keys.ts:31][E: packages/ai/src/env-api-keys.ts:81][E: packages/ai/src/providers/anthropic.ts:43][E: packages/coding-agent/src/cli/args.ts:403][E: packages/ai/test/anthropic-federation.test.ts:138] | `packages/ai/src/env-api-keys.ts:31` |
| `COPILOT_GITHUB_TOKEN` | `github-copilot` | secret token | unset | GitHub Copilot token auth env;provider 还支持 lazy OAuth,但该 env 是 api-key auth 路径。[E: packages/ai/src/env-api-keys.ts:74][E: packages/ai/src/env-api-keys.ts:75][E: packages/ai/src/providers/github-copilot.ts:15][E: packages/ai/src/providers/github-copilot.ts:16] | `packages/ai/src/env-api-keys.ts:75` |
| `ANT_LING_API_KEY` | `ant-ling` | secret API key | unset | Ant Ling provider API key。[E: packages/ai/src/env-api-keys.ts:85] | `packages/ai/src/env-api-keys.ts:85` |
| `QWEN_TOKEN_PLAN_API_KEY` | `qwen-token-plan`, `qwen-token-plan-individual` | secret API key | unset | 国际 Qwen Token Plan 与 Token Plan Individual **共享** 同一 API key；两个 provider factory 都把该 env 交给 `envApiKeyAuth`，`getApiKeyEnvVars` 也对两个 id 映射到同一变量。[E: packages/ai/src/env-api-keys.ts:86][E: packages/ai/src/env-api-keys.ts:88][E: packages/ai/src/providers/qwen-token-plan.ts:11][E: packages/ai/src/providers/qwen-token-plan-individual.ts:11] | `packages/ai/src/env-api-keys.ts:86` |
| `QWEN_TOKEN_PLAN_CN_API_KEY` | `qwen-token-plan-cn` | secret API key | unset | Qwen Token Plan Beijing endpoint 的独立 API key。[E: packages/ai/src/env-api-keys.ts:87][E: packages/ai/src/providers/qwen-token-plan-cn.ts:11] | `packages/ai/src/env-api-keys.ts:87` |
| `OPENAI_API_KEY` | `openai` | secret API key | unset | OpenAI provider API key。[E: packages/ai/src/env-api-keys.ts:89] | `packages/ai/src/env-api-keys.ts:89` |
| `AZURE_OPENAI_API_KEY` | `azure-openai-responses` | secret API key | unset | Azure OpenAI Responses provider API key;endpoint/version 由额外 Azure env 或 model/options 解析。[E: packages/ai/src/env-api-keys.ts:90] | `packages/ai/src/env-api-keys.ts:90` |
| `NVIDIA_API_KEY` | `nvidia` | secret API key | unset | NVIDIA NIM provider API key。[E: packages/ai/src/env-api-keys.ts:91] | `packages/ai/src/env-api-keys.ts:91` |
| `DEEPSEEK_API_KEY` | `deepseek` | secret API key | unset | DeepSeek provider API key。[E: packages/ai/src/env-api-keys.ts:92] | `packages/ai/src/env-api-keys.ts:92` |
| `GEMINI_API_KEY` | `google` | secret API key | unset | Google Gemini provider API key。[E: packages/ai/src/env-api-keys.ts:93] | `packages/ai/src/env-api-keys.ts:93` |
| `GOOGLE_CLOUD_API_KEY` | `google-vertex` | secret API key | unset | Google Vertex explicit API key;stored credential key 优先,随后查该 env,缺失时再尝试 ADC + project + location。[E: packages/ai/src/env-api-keys.ts:94][E: packages/ai/src/providers/google-vertex.ts:71][E: packages/ai/src/providers/google-vertex.ts:72][E: packages/ai/src/providers/google-vertex.ts:81] | `packages/ai/src/env-api-keys.ts:94` |
| `GROQ_API_KEY` | `groq` | secret API key | unset | Groq provider API key。[E: packages/ai/src/env-api-keys.ts:95] | `packages/ai/src/env-api-keys.ts:95` |
| `CEREBRAS_API_KEY` | `cerebras` | secret API key | unset | Cerebras provider API key。[E: packages/ai/src/env-api-keys.ts:96] | `packages/ai/src/env-api-keys.ts:96` |
| `XAI_API_KEY` | `xai` | secret API key | unset | xAI provider API key。[E: packages/ai/src/env-api-keys.ts:97] | `packages/ai/src/env-api-keys.ts:97` |
| `TYPESAFE_API_KEY` | `typesafe` | secret API key | unset | TypeSafe classifier provider API key。[E: packages/ai/src/env-api-keys.ts:98][E: packages/ai/src/providers/typesafe.ts:11] | `packages/ai/src/env-api-keys.ts:98` |
| `RADIUS_API_KEY` | `radius` | secret API key | unset | Radius gateway provider API key；同一 provider 也可走 Radius OAuth。[E: packages/ai/src/env-api-keys.ts:99][E: packages/ai/src/providers/radius.ts:37][E: packages/ai/src/providers/radius.ts:38] | `packages/ai/src/env-api-keys.ts:99` |
| `OPENROUTER_API_KEY` | `openrouter` | secret API key | unset | OpenRouter provider API key；chat / image / classifier 模型共用同一个 `openrouterProvider()` 的 `envApiKeyAuth`。[E: packages/ai/src/env-api-keys.ts:100][E: packages/ai/src/providers/openrouter.ts:16] | `packages/ai/src/env-api-keys.ts:100` |
| `AI_GATEWAY_API_KEY` | `vercel-ai-gateway` | secret API key | unset | Vercel AI Gateway provider API key。[E: packages/ai/src/env-api-keys.ts:101] | `packages/ai/src/env-api-keys.ts:101` |
| `ZAI_API_KEY` | `zai` | secret API key | unset | ZAI Coding Plan global provider API key。[E: packages/ai/src/env-api-keys.ts:102] | `packages/ai/src/env-api-keys.ts:102` |
| `ZAI_CODING_CN_API_KEY` | `zai-coding-cn` | secret API key | unset | ZAI Coding Plan China provider API key。[E: packages/ai/src/env-api-keys.ts:103] | `packages/ai/src/env-api-keys.ts:103` |
| `MISTRAL_API_KEY` | `mistral` | secret API key | unset | Mistral provider API key。[E: packages/ai/src/env-api-keys.ts:104] | `packages/ai/src/env-api-keys.ts:104` |
| `MINIMAX_API_KEY` | `minimax` | secret API key | unset | MiniMax global provider API key。[E: packages/ai/src/env-api-keys.ts:105] | `packages/ai/src/env-api-keys.ts:105` |
| `MINIMAX_CN_API_KEY` | `minimax-cn` | secret API key | unset | MiniMax China provider API key。[E: packages/ai/src/env-api-keys.ts:106] | `packages/ai/src/env-api-keys.ts:106` |
| `MOONSHOT_API_KEY` | `moonshotai`, `moonshotai-cn` | secret API key | unset | Moonshot global and China provider ids share one env var。[E: packages/ai/src/env-api-keys.ts:107][E: packages/ai/src/env-api-keys.ts:108] | `packages/ai/src/env-api-keys.ts:107` |
| `HF_TOKEN` | `huggingface` / llama.cpp extension | secret token | unset | Hugging Face inference provider token；llama.cpp 的 GGUF search/download UI 也把它作为 token lookup 第一优先级。[E: packages/ai/src/env-api-keys.ts:109][E: packages/coding-agent/src/extensions/llama/huggingface.ts:47][E: packages/coding-agent/src/extensions/llama/huggingface.ts:48] | `packages/ai/src/env-api-keys.ts:109` |
| `FIREWORKS_API_KEY` | `fireworks` | secret API key | unset | Fireworks provider API key。[E: packages/ai/src/env-api-keys.ts:110] | `packages/ai/src/env-api-keys.ts:110` |
| `TOGETHER_API_KEY` | `together` | secret API key | unset | Together AI provider API key。[E: packages/ai/src/env-api-keys.ts:111] | `packages/ai/src/env-api-keys.ts:111` |
| `BASETEN_API_KEY` | `baseten` | secret API key | unset | Baseten OpenAI-compatible inference provider API key。[E: packages/ai/src/env-api-keys.ts:112][E: packages/ai/src/providers/baseten.ts:11] | `packages/ai/src/env-api-keys.ts:112` |
| `OPENCODE_API_KEY` | `opencode`, `opencode-go` | secret API key | unset | OpenCode Zen and OpenCode Go provider ids share one env var。[E: packages/ai/src/env-api-keys.ts:113][E: packages/ai/src/env-api-keys.ts:114] | `packages/ai/src/env-api-keys.ts:113` |
| `KIMI_API_KEY` | `kimi-coding` | secret API key | unset | Kimi For Coding provider API key。[E: packages/ai/src/env-api-keys.ts:115] | `packages/ai/src/env-api-keys.ts:115` |
| `META_API_KEY` | `meta` | secret API key | unset | Meta Muse provider API key；同一 provider 也可走 Meta OAuth。[E: packages/ai/src/env-api-keys.ts:116][E: packages/ai/src/providers/meta.ts:13] | `packages/ai/src/env-api-keys.ts:116` |
| `KIMI_CODE_OAUTH_HOST` | Kimi Code OAuth | host URL | provider default `https://auth.kimi.com` | Overrides the Kimi Code OAuth host; takes precedence over `KIMI_OAUTH_HOST` when both are set。[E: packages/ai/src/auth/oauth/kimi-coding.ts:15][E: packages/ai/src/auth/oauth/kimi-coding.ts:36][E: packages/ai/src/auth/oauth/kimi-coding.ts:37][E: packages/ai/src/auth/oauth/kimi-coding.ts:38] | `packages/ai/src/auth/oauth/kimi-coding.ts:37` |
| `KIMI_OAUTH_HOST` | Kimi Code OAuth | host URL | provider default | Backward-compatible OAuth host override used when `KIMI_CODE_OAUTH_HOST` is absent。[E: packages/ai/src/auth/oauth/kimi-coding.ts:36][E: packages/ai/src/auth/oauth/kimi-coding.ts:37][E: packages/ai/src/auth/oauth/kimi-coding.ts:38] | `packages/ai/src/auth/oauth/kimi-coding.ts:37` |
| `CLOUDFLARE_API_KEY` | `cloudflare-workers-ai`, `cloudflare-ai-gateway` | secret API key | unset | Cloudflare Workers AI and AI Gateway token;Cloudflare auth also requires account id and, for AI Gateway, gateway id。[E: packages/ai/src/env-api-keys.ts:117][E: packages/ai/src/env-api-keys.ts:118][E: packages/ai/src/providers/cloudflare-auth.ts:4][E: packages/ai/src/providers/cloudflare-auth.ts:37] | `packages/ai/src/env-api-keys.ts:117` |
| `XIAOMI_API_KEY` | `xiaomi` | secret API key | unset | Xiaomi MiMo provider API key。[E: packages/ai/src/env-api-keys.ts:119] | `packages/ai/src/env-api-keys.ts:119` |
| `XIAOMI_TOKEN_PLAN_CN_API_KEY` | `xiaomi-token-plan-cn` | secret API key | unset | Xiaomi token-plan China region API key。[E: packages/ai/src/env-api-keys.ts:120] | `packages/ai/src/env-api-keys.ts:120` |
| `XIAOMI_TOKEN_PLAN_AMS_API_KEY` | `xiaomi-token-plan-ams` | secret API key | unset | Xiaomi token-plan Amsterdam region API key。[E: packages/ai/src/env-api-keys.ts:121] | `packages/ai/src/env-api-keys.ts:121` |
| `XIAOMI_TOKEN_PLAN_SGP_API_KEY` | `xiaomi-token-plan-sgp` | secret API key | unset | Xiaomi token-plan Singapore region API key。[E: packages/ai/src/env-api-keys.ts:122] | `packages/ai/src/env-api-keys.ts:122` |

## Provider configuration and ambient auth env

Anthropic workload identity federation 只在 `anthropic` provider、且没有 stored key / `ANTHROPIC_AUTH_TOKEN` / `ANTHROPIC_OAUTH_TOKEN` / `ANTHROPIC_API_KEY` / 请求 auth header 时启用。三个必填变量(`ANTHROPIC_FEDERATION_RULE_ID`、`ANTHROPIC_ORGANIZATION_ID`、`ANTHROPIC_IDENTITY_TOKEN_FILE`)缺一则 auth resolve 返回 `undefined`；`ANTHROPIC_SERVICE_ACCOUNT_ID` 与 `ANTHROPIC_WORKSPACE_ID` 有值才写入 provider env。wire 层把它们交给 Anthropic SDK `config`(SDK 自己换短时 token 并重读 identity token 文件),并且按 `(baseUrl, federation)` 复用 client 以共享 token cache。其它 `anthropic-messages` provider(例如 `kimi-coding`)不会走这条路径。[E: packages/ai/src/env-api-keys.ts:32][E: packages/ai/src/env-api-keys.ts:33][E: packages/ai/src/env-api-keys.ts:34][E: packages/ai/src/env-api-keys.ts:35][E: packages/ai/src/env-api-keys.ts:36][E: packages/ai/src/providers/anthropic.ts:53][E: packages/ai/src/providers/anthropic.ts:61][E: packages/ai/src/providers/anthropic.ts:64][E: packages/ai/src/providers/anthropic.ts:69][E: packages/ai/src/api/anthropic-messages.ts:355][E: packages/ai/src/api/anthropic-messages.ts:356][E: packages/ai/src/api/anthropic-messages.ts:359][E: packages/ai/src/api/anthropic-messages.ts:612][E: packages/ai/src/api/anthropic-messages.ts:1052][E: packages/ai/src/api/anthropic-messages.ts:1065][E: packages/ai/test/anthropic-federation.test.ts:117][E: packages/ai/test/anthropic-federation.test.ts:137][E: packages/coding-agent/docs/providers.md:69]

| env var | owner | 类型 | 默认 | 含义 / 为什么 | 源 |
|---|---|---|---|---|---|
| `ANTHROPIC_FEDERATION_RULE_ID` | Anthropic federation | federation rule id | unset | 三个必填 federation 变量之一；缺它则 workload identity 路径不成立。API key / AUTH_TOKEN 优先。[E: packages/ai/src/env-api-keys.ts:32][E: packages/ai/src/providers/anthropic.ts:55][E: packages/ai/src/api/anthropic-messages.ts:356][E: packages/ai/src/api/anthropic-messages.ts:365] | `packages/ai/src/env-api-keys.ts:32` |
| `ANTHROPIC_ORGANIZATION_ID` | Anthropic federation | organization id | unset | 必填；写入 SDK `config.organization_id`。[E: packages/ai/src/env-api-keys.ts:33][E: packages/ai/src/providers/anthropic.ts:56][E: packages/ai/src/api/anthropic-messages.ts:357][E: packages/ai/src/api/anthropic-messages.ts:361] | `packages/ai/src/env-api-keys.ts:33` |
| `ANTHROPIC_IDENTITY_TOKEN_FILE` | Anthropic federation | file path | unset | 必填；SDK 从该文件读 OIDC identity token(`identity_token: { source: "file", path }`)。长会话需保持文件新鲜。[E: packages/ai/src/env-api-keys.ts:35][E: packages/ai/src/providers/anthropic.ts:57][E: packages/ai/src/api/anthropic-messages.ts:358][E: packages/ai/src/api/anthropic-messages.ts:367][E: packages/coding-agent/docs/providers.md:69] | `packages/ai/src/env-api-keys.ts:35` |
| `ANTHROPIC_SERVICE_ACCOUNT_ID` | Anthropic federation | service account id | unset | 可选；有值才写入 provider env 与 SDK `authentication.service_account_id`。[E: packages/ai/src/env-api-keys.ts:34][E: packages/ai/src/providers/anthropic.ts:64][E: packages/ai/src/api/anthropic-messages.ts:366][E: packages/ai/test/anthropic-federation.test.ts:122] | `packages/ai/src/env-api-keys.ts:34` |
| `ANTHROPIC_WORKSPACE_ID` | Anthropic federation | workspace id | unset | 可选；有值才写入 provider env 与 SDK `config.workspace_id`。[E: packages/ai/src/env-api-keys.ts:36][E: packages/ai/src/providers/anthropic.ts:64][E: packages/ai/src/api/anthropic-messages.ts:362][E: packages/ai/test/anthropic-federation.test.ts:113] | `packages/ai/src/env-api-keys.ts:36` |
| `AZURE_OPENAI_BASE_URL` | Azure OpenAI Responses | URL | model `baseUrl` fallback or error | Explicit Azure endpoint;如果 absent,code 可用 resource name 或 model base URL。[E: packages/ai/src/api/azure-openai-responses.ts:236][E: packages/ai/src/api/azure-openai-responses.ts:242][E: packages/ai/src/api/azure-openai-responses.ts:245] | `packages/ai/src/api/azure-openai-responses.ts:236` |
| `AZURE_OPENAI_RESOURCE_NAME` | Azure OpenAI Responses | string | unset | Azure resource name alternative;用于 build default base URL。[E: packages/ai/src/api/azure-openai-responses.ts:237][E: packages/ai/src/api/azure-openai-responses.ts:241][E: packages/ai/src/api/azure-openai-responses.ts:242] | `packages/ai/src/api/azure-openai-responses.ts:237` |
| `AZURE_OPENAI_API_VERSION` | Azure OpenAI Responses | string | `v1` | API version override;explicit option 优先,env 次之,然后默认版本。[E: packages/ai/src/api/azure-openai-responses.ts:25][E: packages/ai/src/api/azure-openai-responses.ts:230][E: packages/ai/src/api/azure-openai-responses.ts:232][E: packages/ai/src/api/azure-openai-responses.ts:233] | `packages/ai/src/api/azure-openai-responses.ts:232` |
| `AZURE_OPENAI_DEPLOYMENT_NAME_MAP` | Azure OpenAI Responses | mapping string | model id | model id 到 Azure deployment name 的 map;解析后按 `model.id` 查找,找不到就用 model id。[E: packages/ai/src/api/azure-openai-responses.ts:47][E: packages/ai/src/api/azure-openai-responses.ts:48][E: packages/ai/src/api/azure-openai-responses.ts:50] | `packages/ai/src/api/azure-openai-responses.ts:48` |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Workers AI / AI Gateway | string | unset | 两种 Cloudflare auth 都要求 account id;stored credential env 优先,否则回落 ambient env,解析后继续作为 provider env 传递。[E: packages/ai/src/providers/cloudflare-auth.ts:5][E: packages/ai/src/providers/cloudflare-auth.ts:19][E: packages/ai/src/providers/cloudflare-auth.ts:23][E: packages/ai/src/providers/cloudflare-auth.ts:32][E: packages/ai/src/providers/cloudflare-auth.ts:47] | `packages/ai/src/providers/cloudflare-auth.ts:5` |
| `CLOUDFLARE_GATEWAY_ID` | Cloudflare AI Gateway | string | unset | 仅 `ai-gateway` auth 要求 gateway id;stored credential env 优先,否则回落 ambient env,解析后进入 provider env。[E: packages/ai/src/providers/cloudflare-auth.ts:6][E: packages/ai/src/providers/cloudflare-auth.ts:22][E: packages/ai/src/providers/cloudflare-auth.ts:23][E: packages/ai/src/providers/cloudflare-auth.ts:33][E: packages/ai/src/providers/cloudflare-auth.ts:48] | `packages/ai/src/providers/cloudflare-auth.ts:6` |
| `LLAMA_BASE_URL` | llama.cpp extension | URL | stored credential or unset | 指向 llama.cpp router；stored credential env 优先，其次 ambient env。未配置时 provider 不可用，登录 prompt 的 placeholder 才使用 localhost default。[E: packages/coding-agent/src/extensions/llama/provider.ts:25][E: packages/coding-agent/src/extensions/llama/provider.ts:33][E: packages/coding-agent/src/extensions/llama/provider.ts:163] | `packages/coding-agent/src/extensions/llama/provider.ts:33` |
| `LLAMA_API_KEY` | llama.cpp extension | secret API key | local placeholder | 未存 key 时 request auth 读取该 env；仍缺失则使用 `"local"` 占位值。[E: packages/coding-agent/src/extensions/llama/provider.ts:190] | `packages/coding-agent/src/extensions/llama/provider.ts:190` |
| `HF_TOKEN_PATH` | llama.cpp extension | file path | unset | Hugging Face token 文件；仅在 `HF_TOKEN` 缺失后尝试。[E: packages/coding-agent/src/extensions/llama/huggingface.ts:51] | `packages/coding-agent/src/extensions/llama/huggingface.ts:51` |
| `HF_HOME` | llama.cpp extension | directory | unset | token lookup 候选 `${HF_HOME}/token`。[E: packages/coding-agent/src/extensions/llama/huggingface.ts:52] | `packages/coding-agent/src/extensions/llama/huggingface.ts:52` |
| `XDG_CACHE_HOME` | llama.cpp extension | directory | unset | token lookup 候选 `${XDG_CACHE_HOME}/huggingface/token`；再回落用户 home 默认 cache。[E: packages/coding-agent/src/extensions/llama/huggingface.ts:53][E: packages/coding-agent/src/extensions/llama/huggingface.ts:54] | `packages/coding-agent/src/extensions/llama/huggingface.ts:53` |
| `GOOGLE_APPLICATION_CREDENTIALS` | Google Vertex | file path | default ADC path | Vertex auth resolver 先取 stored credential env,再取 ambient env,两者都无值才检查默认 ADC path;wire layer在存在时把它作为 `keyFilename`。[E: packages/ai/src/env-api-keys.ts:41][E: packages/ai/src/env-api-keys.ts:60][E: packages/ai/src/providers/google-vertex.ts:6][E: packages/ai/src/providers/google-vertex.ts:74][E: packages/ai/src/providers/google-vertex.ts:76][E: packages/ai/src/api/google-vertex.ts:425] | `packages/ai/src/env-api-keys.ts:60` |
| `GOOGLE_CLOUD_PROJECT` | Google Vertex | string | unset | stored credential env 优先,ambient `GOOGLE_CLOUD_PROJECT` 次之,最后兼容 `GCLOUD_PROJECT`;wire resolution 维持相同两 env 顺序。[E: packages/ai/src/env-api-keys.ts:165][E: packages/ai/src/providers/google-vertex.ts:79][E: packages/ai/src/api/google-vertex.ts:444][E: packages/ai/src/api/google-vertex.ts:445] | `packages/ai/src/env-api-keys.ts:165` |
| `GCLOUD_PROJECT` | Google Vertex | string | unset | Alternate Vertex project id env;仅在 stored/ambient `GOOGLE_CLOUD_PROJECT` 都缺失后使用。[E: packages/ai/src/env-api-keys.ts:165][E: packages/ai/src/providers/google-vertex.ts:79][E: packages/ai/src/api/google-vertex.ts:445] | `packages/ai/src/env-api-keys.ts:165` |
| `GOOGLE_CLOUD_LOCATION` | Google Vertex | string | unset | stored credential env 优先于 ambient env;与 credentials/project 同时存在时 ADC auth 才就绪,wire resolution 也要求 location。[E: packages/ai/src/env-api-keys.ts:167][E: packages/ai/src/providers/google-vertex.ts:80][E: packages/ai/src/providers/google-vertex.ts:81][E: packages/ai/src/api/google-vertex.ts:455][E: packages/ai/src/api/google-vertex.ts:457] | `packages/ai/src/env-api-keys.ts:167` |
| `AWS_PROFILE` | Amazon Bedrock | profile name | SDK default chain | Bedrock 可把 profile 存入 credential env,resolve 时 stored profile 优先于 ambient `AWS_PROFILE`;wire layer把 option/profile env 交给 Bedrock client config。[E: packages/ai/src/env-api-keys.ts:183][E: packages/ai/src/providers/amazon-bedrock.ts:65][E: packages/ai/src/providers/amazon-bedrock.ts:69][E: packages/ai/src/api/bedrock-converse-stream.ts:164] | `packages/ai/src/env-api-keys.ts:183` |
| `AWS_ACCESS_KEY_ID` | Amazon Bedrock | secret access key id | unset | Bedrock ambient auth requires it together with `AWS_SECRET_ACCESS_KEY`;wire credentials builder also requires the pair。[E: packages/ai/src/env-api-keys.ts:184][E: packages/ai/src/providers/amazon-bedrock.ts:72][E: packages/ai/src/api/bedrock-converse-stream.ts:1204] | `packages/ai/src/env-api-keys.ts:184` |
| `AWS_SECRET_ACCESS_KEY` | Amazon Bedrock | secret access key | unset | Pair for `AWS_ACCESS_KEY_ID`;wire credential object is not created unless both exist。[E: packages/ai/src/env-api-keys.ts:184][E: packages/ai/src/providers/amazon-bedrock.ts:72][E: packages/ai/src/api/bedrock-converse-stream.ts:1205] | `packages/ai/src/env-api-keys.ts:184` |
| `AWS_SESSION_TOKEN` | Amazon Bedrock | secret session token | unset | Optional session token added to explicit Bedrock credentials when access key and secret are present。[E: packages/ai/src/api/bedrock-converse-stream.ts:1209][E: packages/ai/src/api/bedrock-converse-stream.ts:1213] | `packages/ai/src/api/bedrock-converse-stream.ts:1209` |
| `AWS_BEARER_TOKEN_BEDROCK` | Amazon Bedrock | secret bearer token | unset | Bedrock ambient readiness source and bearer token request auth source unless `AWS_BEDROCK_SKIP_AUTH=1`。[E: packages/ai/src/env-api-keys.ts:185][E: packages/ai/src/providers/amazon-bedrock.ts:64][E: packages/ai/src/api/bedrock-converse-stream.ts:187] | `packages/ai/src/env-api-keys.ts:185` |
| `AWS_CONTAINER_CREDENTIALS_RELATIVE_URI` | Amazon Bedrock | ECS credential URI | unset | Bedrock ambient readiness source for ECS task role credentials。[E: packages/ai/src/env-api-keys.ts:186][E: packages/ai/src/providers/amazon-bedrock.ts:75] | `packages/ai/src/env-api-keys.ts:186` |
| `AWS_CONTAINER_CREDENTIALS_FULL_URI` | Amazon Bedrock | ECS credential URI | unset | Bedrock ambient readiness source for ECS task role credentials using full URI。[E: packages/ai/src/env-api-keys.ts:187][E: packages/ai/src/providers/amazon-bedrock.ts:76] | `packages/ai/src/env-api-keys.ts:187` |
| `AWS_WEB_IDENTITY_TOKEN_FILE` | Amazon Bedrock | file path | unset | Bedrock ambient readiness source for web identity token / IRSA credentials。[E: packages/ai/src/env-api-keys.ts:188][E: packages/ai/src/providers/amazon-bedrock.ts:77] | `packages/ai/src/env-api-keys.ts:188` |
| `AWS_REGION` | Amazon Bedrock | region | fallback chain | configured region 按 explicit option、`AWS_REGION`、`AWS_DEFAULT_REGION` 求值;inference-profile ARN region 仍优先,标准 endpoint region 只在 explicit endpoint 生效时兜底。[E: packages/ai/src/api/bedrock-converse-stream.ts:1194][E: packages/ai/src/api/bedrock-converse-stream.ts:1197][E: packages/ai/src/api/bedrock-converse-stream.ts:1198] | `packages/ai/src/api/bedrock-converse-stream.ts:1197` |
| `AWS_DEFAULT_REGION` | Amazon Bedrock | region | fallback chain | Bedrock configured region candidate after explicit option 与 `AWS_REGION`。[E: packages/ai/src/api/bedrock-converse-stream.ts:1194][E: packages/ai/src/api/bedrock-converse-stream.ts:1197][E: packages/ai/src/api/bedrock-converse-stream.ts:1198] | `packages/ai/src/api/bedrock-converse-stream.ts:1198` |
| `AWS_BEDROCK_SKIP_AUTH` | Amazon Bedrock | boolean flag | off | When set to `"1"`,Bedrock proxy mode skips bearer/credential auth and installs dummy credentials。[E: packages/ai/src/api/bedrock-converse-stream.ts:183][E: packages/ai/src/api/bedrock-converse-stream.ts:208] | `packages/ai/src/api/bedrock-converse-stream.ts:183` |
| `AWS_BEDROCK_FORCE_HTTP1` | Amazon Bedrock | boolean flag | off | When set to `"1"`,Bedrock request handler uses HTTP/1.1 Node handler when no proxy handler is selected。[E: packages/ai/src/api/bedrock-converse-stream.ts:229] | `packages/ai/src/api/bedrock-converse-stream.ts:229` |
| `AWS_BEDROCK_FORCE_CACHE` | Amazon Bedrock | boolean flag | off | Allows cache points for application inference profiles whose ARN lacks recognizable Claude model name。[E: packages/ai/src/api/bedrock-converse-stream.ts:880] | `packages/ai/src/api/bedrock-converse-stream.ts:880` |
| `PI_CACHE_RETENTION` | provider request cache | enum-like string | protocol-dependent | `long` enables extended prompt cache retention where supported。Anthropic Messages、OpenAI Responses、OpenAI Completions、Bedrock 在 option 缺失时回落 `"short"`；`pi-messages` 在 option 缺失且 env 不是 `"long"` 时返回 `undefined`(交给 backend default)；coding-agent cache-warmer 把非 `"long"` 当成 `"short"`。[E: packages/ai/src/api/anthropic-messages.ts:73][E: packages/ai/src/api/anthropic-messages.ts:76][E: packages/ai/src/api/openai-responses.ts:76][E: packages/ai/src/api/openai-completions.ts:293][E: packages/ai/src/api/bedrock-converse-stream.ts:838][E: packages/ai/src/api/pi-messages.ts:352][E: packages/coding-agent/src/core/cache-warmer.ts:42] | `packages/ai/src/api/anthropic-messages.ts:73` |
| `PI_OAUTH_CALLBACK_HOST` | OAuth callback host | host string | `127.0.0.1` | Overrides the callback server host used by Anthropic、OpenAI Codex、OpenRouter 与 OpenAI ChatGPT browser OAuth;各 flow 保留自己的固定 callback port/path。[E: packages/ai/src/auth/oauth/anthropic.ts:17][E: packages/ai/src/auth/oauth/openai-codex.ts:40][E: packages/ai/src/auth/oauth/openai-codex.ts:41][E: packages/ai/src/auth/oauth/openrouter.ts:24][E: packages/ai/src/auth/oauth/openrouter.ts:25][E: packages/ai/src/auth/oauth/openai-chatgpt.ts:22] | `packages/ai/src/auth/oauth/anthropic.ts:17` |

## Coding-agent runtime and config env

| env var | owner | 类型 | 默认 | 含义 / 为什么 | 源 |
|---|---|---|---|---|---|
| `PI_CODING_AGENT_DIR` | config path | path | `~/.pi/agent` | Generated from `APP_NAME.toUpperCase() + "_CODING_AGENT_DIR"`;when set,`getAgentDir()` returns this path instead of the default agent dir。first-time setup 见到该 env 会跳过。[E: packages/coding-agent/src/config.ts:546][E: packages/coding-agent/src/config.ts:566][E: packages/coding-agent/src/config.ts:567][E: packages/coding-agent/src/config.ts:569][E: packages/coding-agent/src/cli/startup-ui.ts:144] | `packages/coding-agent/src/config.ts:546` |
| `PI_CODING_AGENT_SESSION_DIR` | session path | path | settings `sessionDir` / agent dir sessions | Generated from `APP_NAME.toUpperCase() + "_CODING_AGENT_SESSION_DIR"`;session dir precedence is CLI `--session-dir`,env var,then settings。[E: packages/coding-agent/src/config.ts:547][E: packages/coding-agent/src/main.ts:688][E: packages/coding-agent/src/main.ts:690][E: packages/coding-agent/src/main.ts:691][E: packages/coding-agent/src/main.ts:692] | `packages/coding-agent/src/config.ts:547` |
| `PI_PACKAGE_DIR` | package asset path | path | detected package root | Overrides package asset root,used before Bun binary / Node package detection。[E: packages/coding-agent/src/config.ts:395][E: packages/coding-agent/src/config.ts:396] | `packages/coding-agent/src/config.ts:395` |
| `PI_MANAGED_INSTALL_ROOT` | installer-managed install root | path | unset | `getActiveManagedInstallRoot()` 读取该 env 并 `trim()`；未设置则不是 managed install。设置后要求根目录有 `managed-install.json`（`kind: "pi-managed-install"`、`layout: "releases-v1"`、`schemaVersion: 1`），且当前 package dir 落在该根的 `releases/` 下，否则抛错或不视为 managed。[E: packages/coding-agent/src/package-manager-cli.ts:54][E: packages/coding-agent/src/package-manager-cli.ts:55][E: packages/coding-agent/src/package-manager-cli.ts:56][E: packages/coding-agent/src/package-manager-cli.ts:62][E: packages/coding-agent/src/package-manager-cli.ts:71] | `packages/coding-agent/src/package-manager-cli.ts:55` |
| `PI_INSTALLER_API_BASE` | installer release API | URL | `https://pi.dev/api/installer/releases` | managed self-update 用 `(process.env.PI_INSTALLER_API_BASE?.trim() \|\| DEFAULT_INSTALLER_API_BASE)` 作为 installer API base,再 strip trailing slash。[E: packages/coding-agent/src/package-manager-cli.ts:50][E: packages/coding-agent/src/package-manager-cli.ts:189] | `packages/coding-agent/src/package-manager-cli.ts:189` |
| `PI_SHARE_VIEWER_URL` | share command URL | URL | `https://pi.dev/session/` | Base URL for share viewer links;`getShareViewerUrl()` appends `#<gistId>` to the env or default base。[E: packages/coding-agent/src/config.ts:553][E: packages/coding-agent/src/config.ts:557] | `packages/coding-agent/src/config.ts:557` |
| `PI_RADIUS_GATEWAY` | Radius gateway origin | URL | `DEFAULT_RADIUS_GATEWAY` (`https://radius.pi.dev`) | `/bug` 上传与 Radius relay 使用的 gateway origin；`getRadiusGatewayUrl()` 读 `process.env.PI_RADIUS_GATEWAY`，缺省回落到 ai 包的 default gateway。[E: packages/coding-agent/src/core/radius.ts:4][E: packages/coding-agent/src/core/radius.ts:10][E: packages/ai/src/providers/radius-config.ts:4][E: packages/coding-agent/docs/environment-variables.md:89] | `packages/coding-agent/src/core/radius.ts:4` |
| `PI_OFFLINE` | startup network gate | truthy flag | off | `main()` treats `--offline` or truthy env (`1`/`true`/`yes`) as offline,then writes `PI_OFFLINE=1` and `PI_SKIP_VERSION_CHECK=1`;version checks and tool/package network paths also consult it。[E: packages/coding-agent/src/main.ts:107][E: packages/coding-agent/src/main.ts:576][E: packages/coding-agent/src/main.ts:578][E: packages/coding-agent/src/main.ts:579][E: packages/coding-agent/src/utils/version-check.ts:55][E: packages/coding-agent/src/utils/tools-manager.ts:15][E: packages/coding-agent/src/core/package-manager.ts:55] | `packages/coding-agent/src/main.ts:576` |
| `PI_SKIP_VERSION_CHECK` | version check gate | presence flag | off | Any set value skips latest-version fetch;offline mode also sets it to `"1"` during startup。[E: packages/coding-agent/src/main.ts:579][E: packages/coding-agent/src/utils/version-check.ts:98] | `packages/coding-agent/src/utils/version-check.ts:98` |
| `PI_TELEMETRY` | telemetry / attribution gate | truthy override | settings fallback | Overrides install/update telemetry and default provider attribution gate:env present means parse env truthiness,env absent means `settingsManager.getEnableInstallTelemetry()`。[E: packages/coding-agent/src/core/telemetry.ts:3][E: packages/coding-agent/src/core/telemetry.ts:5][E: packages/coding-agent/src/core/telemetry.ts:8][E: packages/coding-agent/src/core/telemetry.ts:10][E: packages/coding-agent/src/core/telemetry.ts:12] | `packages/coding-agent/src/core/telemetry.ts:10` |
| `PI_EXPERIMENTAL` | experimental feature gate | exact flag | off | Experimental features are enabled only when env equals `"1"`。`experimental.ts` 只剩 `areExperimentalFeaturesEnabled()`；first-time setup and footer xp marker consume this helper。[E: packages/coding-agent/src/core/experimental.ts:1][E: packages/coding-agent/src/core/experimental.ts:2][E: packages/coding-agent/src/cli/startup-ui.ts:141][E: packages/coding-agent/src/modes/interactive/components/footer.ts:213] | `packages/coding-agent/src/core/experimental.ts:2` |
| `PI_TIMING` | startup profiling | exact flag | off | Timing module snapshots `PI_TIMING === "1"` at module load;disabled paths return without recording or printing。[E: packages/coding-agent/src/core/timings.ts:6][E: packages/coding-agent/src/core/timings.ts:16][E: packages/coding-agent/src/core/timings.ts:17][E: packages/coding-agent/src/core/timings.ts:21][E: packages/coding-agent/src/core/timings.ts:22][E: packages/coding-agent/src/core/timings.ts:45][E: packages/coding-agent/src/core/timings.ts:46] | `packages/coding-agent/src/core/timings.ts:6` |
| `PI_STARTUP_BENCHMARK` | startup benchmark mode | truthy flag | off | Truthy env enables interactive startup benchmark;non-interactive modes error out。[E: packages/coding-agent/src/main.ts:931][E: packages/coding-agent/src/main.ts:932] | `packages/coding-agent/src/main.ts:931` |
| `PI_CLEAR_ON_SHRINK` | terminal rendering | exact flag | off | `SettingsManager.getClearOnShrink()` uses settings first,then env equals `"1"`,then false。[E: packages/coding-agent/src/core/settings-manager.ts:1318][E: packages/coding-agent/src/core/settings-manager.ts:1320][E: packages/coding-agent/src/core/settings-manager.ts:1323] | `packages/coding-agent/src/core/settings-manager.ts:1323` |
| `PI_HARDWARE_CURSOR` | terminal rendering | exact flag | off | `SettingsManager.getShowHardwareCursor()` uses setting first,then env equals `"1"`。[E: packages/coding-agent/src/core/settings-manager.ts:1468][E: packages/coding-agent/src/core/settings-manager.ts:1469] | `packages/coding-agent/src/core/settings-manager.ts:1469` |
| `PI_HYPERLINKS` | terminal capability override | `1` / `0` / `auto` | unset = auto-detect | 覆盖 OSC 8 hyperlink 探测。`detectCapabilities()` 用 `parseBooleanCapabilityOverride()`:只有 `"1"` → `true`、`"0"` → `false`;`auto` 或其它值返回 `undefined`,继续走环境探测 [E: packages/tui/src/terminal-image.ts:136][E: packages/tui/src/terminal-image.ts:137][E: packages/tui/src/terminal-image.ts:141][E: packages/tui/src/terminal-image.ts:157]。用户文档列出 `1\|0\|auto` 与 settings `terminal.hyperlinks` [E: packages/coding-agent/docs/environment-variables.md:91][E: packages/coding-agent/docs/terminal-setup.md:213]。settings 的 boolean 覆盖经 `getTerminalCapabilityOverrides()` → `setCapabilityOverrides()` 叠在 env 探测结果之上,settings 优先 [E: packages/coding-agent/src/core/settings-manager.ts:1284][E: packages/coding-agent/src/main.ts:870]。 | `packages/tui/src/terminal-image.ts:141` |
| `PI_IMAGE_PROTOCOL` | terminal capability override | `kitty` / `iterm2` / `none` / `0` / `auto` | unset = auto-detect | 覆盖 inline image protocol。`kitty` 或 `iterm2` 强制该协议;`none` 或 `"0"` 强制 `images: null`;其它值(含文档中的 `auto`)保持 `undefined` 并沿用探测 [E: packages/tui/src/terminal-image.ts:145][E: packages/tui/src/terminal-image.ts:146][E: packages/tui/src/terminal-image.ts:147][E: packages/tui/src/terminal-image.ts:149]。用户文档列出 `kitty\|iterm2\|none\|auto` 与 settings `terminal.images` [E: packages/coding-agent/docs/environment-variables.md:92][E: packages/coding-agent/docs/terminal-setup.md:214]。settings 把 `"kitty"`/`"iterm2"`/`false` 写成 capability override,`auto` 不写入 override [E: packages/coding-agent/src/core/settings-manager.ts:1282]。 | `packages/tui/src/terminal-image.ts:145` |
| `PI_TRUE_COLOR` | terminal capability override | `1` / `0` / `auto` | unset = auto-detect | 覆盖 truecolor 探测,解析规则与 `PI_HYPERLINKS` 相同:`"1"`/`"0"` 强制,`auto` 回落探测 [E: packages/tui/src/terminal-image.ts:136][E: packages/tui/src/terminal-image.ts:152][E: packages/tui/src/terminal-image.ts:156]。用户文档列出 `1\|0\|auto` 与 settings `terminal.trueColor` [E: packages/coding-agent/docs/environment-variables.md:93][E: packages/coding-agent/docs/terminal-setup.md:215]。settings boolean 同样经 `getTerminalCapabilityOverrides()` 覆盖 env [E: packages/coding-agent/src/core/settings-manager.ts:1283][E: packages/coding-agent/src/main.ts:870]。 | `packages/tui/src/terminal-image.ts:152` |
| `PI_TUI_DEBUG_REDRAW` | TUI redraw debug | exact flag | off | `TuiMainScreen` 仅在 env 等于 `"1"` 时把 full-render 原因追加到 log directory 的 `pi-tui-debug.log`。旧名 `PI_DEBUG_REDRAW` 已不存在。[E: packages/tui/src/tui-main-screen.ts:321][E: packages/tui/src/tui-main-screen.ts:322][E: packages/tui/src/tui-main-screen.ts:324] | `packages/tui/src/tui-main-screen.ts:321` |
| `PI_TUI_WRITE_LOG` | TUI write log | path or directory | unset | 若设置，`ProcessTerminal` 写入 write-log：值为已存在目录时写成该目录下带时间戳的 `tui-<ts>-<pid>.log`，否则把该值当文件路径。[E: packages/tui/src/terminal.ts:152][E: packages/tui/src/terminal.ts:155][E: packages/tui/src/terminal.ts:163] | `packages/tui/src/terminal.ts:152` |
| `PI_TUI_DEBUG` | TUI per-render debug dump | exact flag | off | 等于 `"1"` 时，`TuiMainScreen` 把每次 render 的 debug dump 写到 `/tmp/tui`。[E: packages/tui/src/tui-main-screen.ts:569][E: packages/tui/src/tui-main-screen.ts:570][E: packages/tui/src/tui-main-screen.ts:572] | `packages/tui/src/tui-main-screen.ts:569` |
| `PI_TUI_ESC_TIMEOUT` | TUI escape reassembly | positive milliseconds | `100` over SSH, else `10` | `resolveEscapeTimeoutMs()` 读取该 env；有限且 `> 0` 时覆盖默认。默认在存在 `SSH_CONNECTION` 或 `SSH_TTY` 时用 100ms，否则 10ms，避免高延迟终端把 `Alt+key` 拆成 Escape。[E: packages/tui/src/terminal.ts:115][E: packages/tui/src/terminal.ts:123][E: packages/tui/src/terminal.ts:124][E: packages/tui/src/terminal.ts:128] | `packages/tui/src/terminal.ts:124` |
| `PI_CODING_AGENT` | process marker | string | set by entrypoint | CLI and RPC entrypoints set this env to `"true"` before calling `main()`;source shown here writes it,not a user-facing config knob。[E: packages/coding-agent/src/cli/setup.ts:6][E: packages/coding-agent/src/rpc-entry.ts:7][I] | `packages/coding-agent/src/cli/setup.ts:6` |
| `AI_AGENT` | generic process attribution | string | set to `"pi"` by entrypoint | CLI and RPC entrypoints set this process-wide marker before `main()` so generic tooling and inherited child processes can attribute work to Pi;it is not a user-facing Pi setting。[E: packages/coding-agent/src/cli/setup.ts:7][E: packages/coding-agent/src/rpc-entry.ts:8][I] | `packages/coding-agent/src/cli/setup.ts:7` |
| `PI_SESSION_ID` | model shell child env | session id | removed unless context available | `bash` tool 先从继承 env 删除该变量；默认启用 session exposure 时再写入当前 `SessionManager` id。`powershell` 通过 `BashToolOptions.exposeSessionEnvironment` 复用同一套注入。它是子进程 metadata，不是 Pi 启动配置。[E: packages/coding-agent/src/core/tools/bash.ts:194][E: packages/coding-agent/src/core/tools/bash.ts:199][E: packages/coding-agent/src/core/tools/bash.ts:201][E: packages/coding-agent/src/core/tools/bash.ts:222][E: packages/coding-agent/src/core/tools/powershell.ts:30][E: packages/coding-agent/docs/environment-variables.md:26] | `packages/coding-agent/src/core/tools/bash.ts:194` |
| `PI_SESSION_FILE` | model shell child env | path | removed / omitted for in-memory session | 与 session id 同批清理；仅当当前 session 有持久化 file 时写入。[E: packages/coding-agent/src/core/tools/bash.ts:195][E: packages/coding-agent/src/core/tools/bash.ts:202][E: packages/coding-agent/src/core/tools/bash.ts:203][E: packages/coding-agent/docs/environment-variables.md:27] | `packages/coding-agent/src/core/tools/bash.ts:195` |
| `PI_PROVIDER` | model shell child env | provider id | removed / omitted without model | `bash` tool 有当前 model 时写 provider id；关闭 `exposeSessionEnvironment` 或缺少 extension context 时保持删除。[E: packages/coding-agent/src/core/tools/bash.ts:196][E: packages/coding-agent/src/core/tools/bash.ts:199][E: packages/coding-agent/src/core/tools/bash.ts:205][E: packages/coding-agent/docs/environment-variables.md:28] | `packages/coding-agent/src/core/tools/bash.ts:196` |
| `PI_MODEL` | model shell child env | model id | removed / omitted without model | 与 `PI_PROVIDER` 成对来自当前 model，但代码分别赋值；并非用于选择 Pi 启动模型。[E: packages/coding-agent/src/core/tools/bash.ts:197][E: packages/coding-agent/src/core/tools/bash.ts:206][E: packages/coding-agent/docs/environment-variables.md:29] | `packages/coding-agent/src/core/tools/bash.ts:197` |
| `PI_REASONING_LEVEL` | model shell child env | thinking level | removed / omitted when empty | 当前 context 有 thinking level 时注入；清理发生在 `spawnHook` 之前，hook 可以最终覆盖 env。[E: packages/coding-agent/src/core/tools/bash.ts:198][E: packages/coding-agent/src/core/tools/bash.ts:208][E: packages/coding-agent/src/core/tools/bash.ts:224][E: packages/coding-agent/docs/environment-variables.md:30] | `packages/coding-agent/src/core/tools/bash.ts:198` |
| `VISUAL` | external editor fallback | command | unset | `externalEditor` setting takes precedence;when unset,settings manager uses `VISUAL` then `EDITOR`,then platform default editor。[E: packages/coding-agent/src/core/settings-manager.ts:1054][E: packages/coding-agent/src/core/settings-manager.ts:1059][E: packages/coding-agent/src/core/settings-manager.ts:1063] | `packages/coding-agent/src/core/settings-manager.ts:1059` |
| `EDITOR` | external editor fallback | command | unset | Fallback after `VISUAL` for Ctrl+G external editor command when `externalEditor` setting is empty。[E: packages/coding-agent/src/core/settings-manager.ts:1059] | `packages/coding-agent/src/core/settings-manager.ts:1059` |
| `HTTP_PROXY` | HTTP proxy | URL | unset | `httpProxy` setting writes this env with nullish assignment before undici `EnvHttpProxyAgent` is configured;existing env is not overwritten。[E: packages/coding-agent/src/core/http-dispatcher.ts:45][E: packages/coding-agent/src/core/http-dispatcher.ts:48] | `packages/coding-agent/src/core/http-dispatcher.ts:48` |
| `HTTPS_PROXY` | HTTP proxy | URL | unset | `httpProxy` setting writes this env with nullish assignment;undici proxy agent then reads env proxy settings。[E: packages/coding-agent/src/core/http-dispatcher.ts:45][E: packages/coding-agent/src/core/http-dispatcher.ts:49] | `packages/coding-agent/src/core/http-dispatcher.ts:49` |
| `PNPM_HOME` | self-update command construction | path | inferred global dir | pnpm self-update command uses `PNPM_HOME` as `--config.global-bin-dir` when a pnpm global path match is inferred;this is package-manager host integration,not Pi-specific config。[E: packages/coding-agent/src/config.ts:136][I] | `packages/coding-agent/src/config.ts:136` |
| `$ENV_VAR` / `${ENV_VAR}` in config values | models/auth/header config | dynamic template | literal/config dependent | Any valid env name referenced in config strings can be resolved from provider-scoped env or `process.env`;`$$` and `$!` are escapes,not env names。[E: packages/coding-agent/src/core/resolve-config-value.ts:11][E: packages/coding-agent/src/core/resolve-config-value.ts:42][E: packages/coding-agent/src/core/resolve-config-value.ts:57][E: packages/coding-agent/src/core/resolve-config-value.ts:66][E: packages/coding-agent/src/core/resolve-config-value.ts:88][E: packages/coding-agent/src/core/resolve-config-value.ts:89][E: packages/coding-agent/src/core/resolve-config-value.ts:146] | `packages/coding-agent/src/core/resolve-config-value.ts:146` |

## 跨包关系

[subsys.ai.env-api-keys](../subsystems/ai/env-api-keys.md) 是 provider API key discovery 的 subsystem 节点:它解释 `getApiKeyEnvVars()`、`findEnvKeys()`、`getEnvApiKey()` 和 Bun sandbox env fallback 的控制流;本 catalog 只把每个 env var 实例展开成可 grep 的行。Federation 不走 `getApiKeyEnvVars()`,而走 `anthropicProvider().auth.apiKey.resolve` 与 `getAnthropicFederation()`。[E: packages/ai/src/env-api-keys.ts:73][E: packages/ai/src/env-api-keys.ts:138][E: packages/ai/src/env-api-keys.ts:153][E: packages/ai/src/providers/anthropic.ts:69][I]

[surface.config.resolution](../surface/config/resolution.md) 是 `$ENV` / `${ENV}` / `!cmd` 配置字符串解析的 surface 节点;本 catalog 把这套动态 env 语法列为一个规则,因为它允许用户在 `models.json`、provider headers、auth config 中引入任意 env name。[E: packages/coding-agent/src/core/resolve-config-value.ts:57][E: packages/coding-agent/src/core/resolve-config-value.ts:66][E: packages/coding-agent/src/core/resolve-config-value.ts:146][E: packages/coding-agent/src/core/resolve-config-value.ts:229][I]

[subsys.coding-agent.telemetry](../subsystems/coding-agent/telemetry.md) 解释 `PI_TELEMETRY`、`PI_EXPERIMENTAL`、`PI_TIMING` 的行为细节;本 catalog 保持逐实例目录视角,不重复 provider attribution header 合并策略。[E: packages/coding-agent/src/core/telemetry.ts:10][E: packages/coding-agent/src/core/experimental.ts:2][E: packages/coding-agent/src/core/timings.ts:6][I]

## Sources

- packages/ai/src/env-api-keys.ts
- packages/ai/src/utils/provider-env.ts
- packages/ai/src/auth/context.ts
- packages/ai/src/auth/helpers.ts
- packages/ai/src/providers/anthropic.ts
- packages/ai/src/providers/baseten.ts
- packages/ai/src/providers/meta.ts
- packages/ai/src/providers/typesafe.ts
- packages/ai/src/providers/qwen-token-plan.ts
- packages/ai/src/providers/qwen-token-plan-cn.ts
- packages/ai/src/providers/qwen-token-plan-individual.ts
- packages/tui/src/terminal.ts
- packages/tui/src/terminal-image.ts
- packages/tui/src/tui-main-screen.ts
- packages/coding-agent/docs/terminal-setup.md
- packages/coding-agent/docs/environment-variables.md
- packages/ai/src/providers/github-copilot.ts
- packages/ai/src/providers/amazon-bedrock.ts
- packages/ai/src/providers/cloudflare-auth.ts
- packages/ai/src/providers/google-vertex.ts
- packages/ai/src/providers/radius.ts
- packages/ai/src/providers/radius-config.ts
- packages/ai/src/providers/openrouter.ts
- packages/ai/src/api/anthropic-messages.ts
- packages/ai/src/api/openai-responses.ts
- packages/ai/src/api/openai-completions.ts
- packages/ai/src/api/pi-messages.ts
- packages/ai/src/api/azure-openai-responses.ts
- packages/ai/src/api/bedrock-converse-stream.ts
- packages/ai/src/api/google-vertex.ts
- packages/ai/src/auth/oauth/anthropic.ts
- packages/ai/src/auth/oauth/kimi-coding.ts
- packages/ai/src/auth/oauth/openai-codex.ts
- packages/ai/src/auth/oauth/openai-chatgpt.ts
- packages/ai/src/auth/oauth/openrouter.ts
- packages/ai/test/anthropic-federation.test.ts
- packages/coding-agent/src/config.ts
- packages/coding-agent/src/main.ts
- packages/coding-agent/src/cli.ts
- packages/coding-agent/src/cli/setup.ts
- packages/coding-agent/src/rpc-entry.ts
- packages/coding-agent/src/cli/args.ts
- packages/coding-agent/src/cli/startup-ui.ts
- packages/coding-agent/src/modes/interactive/components/footer.ts
- packages/coding-agent/src/core/experimental.ts
- packages/coding-agent/src/core/telemetry.ts
- packages/coding-agent/src/core/timings.ts
- packages/coding-agent/src/core/settings-manager.ts
- packages/coding-agent/src/core/tools/bash.ts
- packages/coding-agent/src/core/tools/powershell.ts
- packages/coding-agent/src/core/http-dispatcher.ts
- packages/coding-agent/src/core/resolve-config-value.ts
- packages/coding-agent/src/core/radius.ts
- packages/coding-agent/src/core/package-manager.ts
- packages/coding-agent/src/core/cache-warmer.ts
- packages/coding-agent/src/package-manager-cli.ts
- packages/coding-agent/src/extensions/llama/huggingface.ts
- packages/coding-agent/src/extensions/llama/provider.ts
- packages/coding-agent/src/utils/version-check.ts
- packages/coding-agent/src/utils/tools-manager.ts
- packages/coding-agent/docs/usage.md
- packages/coding-agent/docs/providers.md

## 相关

- [surface.config.resolution](../surface/config/resolution.md): 用户配置中 `$ENV`、`${ENV}`、`!cmd` 字符串的解析规则。
- [subsys.ai.env-api-keys](../subsystems/ai/env-api-keys.md): provider API key discovery、Vertex/Bedrock ambient auth marker、provider env lookup。
- [subsys.coding-agent.telemetry](../subsystems/coding-agent/telemetry.md): telemetry、experimental、startup timing env gate 的行为说明。
