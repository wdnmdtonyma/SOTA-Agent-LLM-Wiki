# uncertainty-update-853a80d26c-ai

batch: 853a80d26c ai protocol / provider / model
nodes: ref.ai.model-catalog, subsys.ai.model-discovery, subsys.ai.model-catalog-publication, ref.ai.provider-catalog, surface.providers.overview, subsys.ai.openai-completions, subsys.ai.anthropic-messages, subsys.ai.google-generative-ai, subsys.ai.google-vertex, subsys.ai.openai-responses, subsys.ai.bedrock-converse, subsys.ai.mistral-conversations, subsys.ai.cloudflare-gateway-binding, ref.ai.core-types
updated: 853a80d26c
status: draft

本轮只改 AI 协议 / provider / model 节点。下列点本批不能升成 `[E]`。

## [U] checkout 无法给出 flattened model 总数

- 节点: `ref.ai.model-catalog`、`subsys.ai.model-discovery`、`subsys.ai.model-catalog-publication`
- `*.models.ts` 仍是 `flattenModelCatalog(provider, values)` + gitignored `src/providers/data/*.json`。`MODELS` 仍是 **39** 个 structural bucket。
- `tools/generate-model-catalog.mjs` 仍按旧的逐模型 `Model<"api"> & { id; provider }` shard 解析，对本 wrapper 抛 `No model shapes found`。本轮按范围未改该脚本。
- 因此不能从 target SHA checkout 给出完整逐 id / `Model.api` 表或 flattened row 数。可证的是 bucket 结构、`QWEN_TOKEN_PLAN_INDIVIDUAL_MODEL_IDS`（8 个 id，含 `deepseek-v4-pro-0813`）、DeepSeek 硬编码 `deepseek-v4-flash-vision-exp`、以及 `workers-ai/${modelId}` 前缀规则。

## [I] 远端 catalog 重跑会漂

- 节点: 同上
- `generate-models.ts` 读 models.dev / OpenRouter / Vercel / NVIDIA。同一 commit 重跑 generator 可以得到不同 JSON snapshot。目标模型数必须绑官方 artifact，不能由 39 个 key 推导。

## 本轮已核、不进 uncertainty

- runtime providers 仍 40（含 Radius，无 structural shard）。
- xAI `api: "openai-responses"`，coding-agent 默认 `grok-4.6`。
- `GoogleThinkingLevel` → `GoogleApiThinkingLevel` + `ResolvedGoogleThinkingLevel`。
- Anthropic `allowedFallbackModels` / returned-model 计价；Completions `reasoning_details` 合并/replay、无 tools 时仍可写 `toolChoice`、thinking-token budget；Bedrock redacted replay + raw response headers；Mistral 无 id 碎片按 `index` 拼接；OpenRouter reasoning options 脚本；Cloudflare AI Gateway `workers-ai/*` passthrough；多 adapter `User-Agent: getPiUserAgent()`。
- 未改 `index.json` / `llms.txt` / `tools/` / `pi` 源码。
