# Update facts — 9f69463f1d

> Filler 的速查。每条仍须回源码核对行号。路径相对 `opencode/`。

## Provider / transforms / auth

- **Bedrock reasoning replay**: 只保留带 `signature` / `redactedContent` / `redactedData` 的 reasoning；不再因非空 text 保留。metadata 先看 `providerOptions[model.providerID]`，再 fallback `providerOptions.bedrock`。[E: packages/opencode/src/provider/transform.ts:197]
- **Qwen sampling**: `temperature()` / `topP()` 不再给 Qwen 写死 0.55 / 1；返回 `undefined`。[E: packages/opencode/src/provider/transform.ts:527]
- **textVerbosity**: `textVerbosity: "low"` 仅当 `model.api.npm` 是 `@ai-sdk/openai` 或 `@ai-sdk/amazon-bedrock/mantle`。[E: packages/opencode/src/provider/transform.ts:1305]
- **Vertex REP**: `googleVertexEndpoint(location)`：`global` → `aiplatform.googleapis.com`；`eu`/`us` → `aiplatform.{location}.rep.googleapis.com`；其它 `{location}-aiplatform.googleapis.com`。[E: packages/opencode/src/provider/provider.ts:101]
- **CF AI Gateway 三路**: `openai/*` → native OpenAI passthrough；`anthropic/*` → native Anthropic，点号版本 `replaceAll(".", "-")`；`workers-ai/`/`@cf/` → `createUnified({ apiKey })`（唯一向上游传 CF token）；其它第三方 → `createOpenAICompatible` + REST `cf-aig-gateway-id`。[E: packages/opencode/src/provider/provider.ts:809]
- **`cloudflareGatewayNpm()`**: `openai/*`→`@ai-sdk/openai`，`anthropic/*`→`@ai-sdk/anthropic`，驱动 reasoning variants。[E: packages/opencode/src/provider/provider.ts:1250]
- **Core CF plugin**: 仅 token scoping（Workers AI 才带 apiKey），**没有** mirror 三分路由。[E: packages/core/src/plugin/provider/cloudflare-ai-gateway.ts:27]
- **CerebrasPlugin (NEW)**: `chat.params` 在 `@ai-sdk/cerebras` 且已设 `max_completion_tokens` 时清掉 `maxOutputTokens`。`internalPlugins()` 注册。[E: packages/opencode/src/plugin/cerebras.ts:3][E: packages/opencode/src/plugin/index.ts:84]
- **Azure CLI OAuth**: `plugin/azure.ts` 重写为 Microsoft Entra ID (Azure CLI)：`az account get-access-token`、Cognitive Services vs AI Foundry scope、deployment 发现、`provider.models` hook。未装 `az` 则隐藏 OAuth。[E: packages/opencode/src/plugin/azure.ts:12]
- **Azure resource**: loader 增加 `auth?.type === "oauth" ? auth.accountId`。[E: packages/opencode/src/provider/provider.ts:250]
- **Codex residency**: JWT `chatgpt_compute_residency` → header `x-openai-internal-codex-residency`；忽略 `no_constraint` / `chatgpt_data_residency`。[E: packages/opencode/src/plugin/openai/codex.ts:80]
- **ChatGPT 订阅限额**: `gpt-5.6-*` 从 500k/372k/128k 降到与 5.5 相同的 400k/272k/128k。[E: packages/opencode/src/plugin/openai/codex.ts:312]
- **Console URL**: `defaultServer` `https://console.opencode.ai` → `https://opencode.ai/console`。[E: packages/core/src/plugin/provider/opencode.ts:16]
- **WS 1009**: oversized websocket 设 `fallback` 而不计 failure。[E: packages/opencode/src/plugin/openai/ws.ts:12]

## Session / retry / task / CLI

- **unknown finish**: prompt loop 退出排除集从 `["tool-calls"]` 变为 `["tool-calls", "unknown"]`。[E: packages/opencode/src/session/prompt.ts:1113][E: packages/opencode/src/session/prompt.ts:1295]
- **network_error finish**: AI SDK `rawFinishReason === "network_error"` → `ProviderError.ResponseStreamError`，走 retry。[E: packages/opencode/src/session/llm/ai-sdk.ts:89]
- **retry 模式**: `network[-_\s]error`；新增 capacity `try again later|currently/temporarily at capacity`。[E: packages/opencode/src/session/retry.ts:37][E: packages/opencode/src/session/retry.ts:40]
- **stream error fallback**: 未知 `error.code` 默认 `{ type: "api_error", isRetryable: true }`。[E: packages/opencode/src/provider/error.ts:148]
- **upsell 文案**: `$5/month` → `$10/month`。[E: packages/opencode/src/session/retry.ts:106]
- **TaskTool 失败**: `result.info.error` 或最后 error tool part → `Effect.fail`，消息含 `task_id: ${nextSession.id}`。[E: packages/opencode/src/tool/task.ts:213]
- **run 子 agent 权限**: `sessions` Set 跟踪 root + `parentID` 在 set 内的 child；`permission.asked` 用 `sessions.has`。[E: packages/opencode/src/cli/cmd/run.ts:699]
- **parent header**: `x-parent-session-id` 提到所有 provider 的公共 header（不再只在 non-opencode 分支）。[E: packages/opencode/src/session/llm/request.ts:201]
- **V2 runner headers**: `SessionRunner` 请求带 session affinity + parent；compaction summary 继承 `http`。[E: packages/core/src/session/runner/llm.ts:207][E: packages/core/src/session/compaction.ts:205]
- **malformed cost**: `finite()` 把 NaN/Infinity cost 当 0，避免污染 Decimal。[E: packages/opencode/src/session/session.ts:339]
- **instruction.ts / processor.ts / message-v2.ts / job.ts**: 本 range **无 diff**。unknown finish 在 `prompt.ts`，不是 processor。

## Config / DB

- **NEW `ConfigV2Compat.lower`**: V1 读路径先 lower 再 schema decode。[E: packages/opencode/src/config/v2-compat.ts:91][E: packages/opencode/src/config/config.ts:188]
- **硬拒绝**: 任意 `permissions`（含 agents/agent/mode 嵌套）throw；提示用 V1 `permission` 或 opencode2。[E: packages/opencode/src/config/v2-compat.ts:95]
- **忽略**: `plugins`/`providers`/`websearch`/`warming`、`experimental.portable_shell_scanner`、`model.variant`、`agents.*.request.headers`、`mcp.*.codemode`、无法压成单一 scalar 的 MCP timeout、无 extensions 的 custom LSP。
- **映射**: `snapshots→snapshot`、`media→attachment`、`model` object→string、`skills[]`→paths/urls、`compaction.keep.tokens→preserve_recent_tokens`、`compaction.buffer→reserved`、`experimental.subagent_depth`→顶层、`agents→agent`、`commands→command`、`mcp.servers` 展开。V1 同名冲突保留 V1。
- **写路径**: `update`/`updateGlobal` merge **原始 JSON/JSONC 树**，保留未 lower 的 V2 字段；用序列化文本比较 `changed`。[E: packages/opencode/src/config/config.ts:642]
- **core `config.ts` / `v1/config/`**: 本 range 无 diff。`config.migration` 职责不变。
- **legacy drizzle seed**: 有 `name` 列走原 INSERT；无 `name` 则按 `created_at` 前缀匹配 migration id，匹配失败 `Effect.die`。[E: packages/core/src/database/migration.ts:57]
- **workspace-name migration**: 无 `name` 列时用 `''`。[E: packages/core/src/database/migration/20260410174513_workspace-name.ts:8]

## Console / Stats / App / Function / CI

- **Zen requestBody**: 增量扫 `"model"`，上流 `ReadableStream` + `duplex: "half"`；stream 看上游 `text/event-stream`。去掉最多 3 次 provider failover 与 429/529 retry。[E: packages/console/app/src/routes/zen/util/handler.ts:93]
- **DeepSeek peak**: CST 工作日 9–12 / 14–18，周末不算。[E: packages/console/app/src/routes/zen/util/pricing.ts:1]
- **Lite usage breakdown** + Go limits-graph 动画 + checkout 5/hour Redis 限流。
- **Auth redirect allowlist**: client `app`；localhost http(s)；prod `opencode.ai` / `*.opencode.ai` https。[E: packages/console/function/src/auth-redirect.ts:1]
- **server-action**: 错/缺 referer 时改成 request origin。
- **删除** Black subscribe 页。首月 50% Go coupon 停售。
- **Muse Spark geo + training policy**: 22 国限制 contributor；lite + `!allowTraining` 拒。
- **Stats**: 新增 weekly retention（`model_retention`，min 100 user-weeks，top 15）；aggregates 含 free tier；**删除 geo-map.ts**；`ox-alpha`/`x-preview-f`→`glm-5.3-flash`；model id lower-case；用 `route_model`。
- **App**: `session-archive.ts`；home 立刻丢掉 archived；rename onBlur/IME 守卫。
- **GitHub OIDC**: 用 immutable `payload.repository`，不再 parse `sub`。[E: packages/function/src/github.ts]
- **CI**: 删除 `.github/workflows/beta.yml`；新增 `unlock.yml`（`sst unlock`）。
- **publish.ts**: 不再发 legacy preview CLI。
- **V1 routes**: `global.upgrade` 的 `target` 必填且 semver；`provider.list` 把已存 credential 的 provider 标 connected。
- **TUI**: 空 text + metadata 的 reasoning 当 opaque/encrypted，显示 `Thought · {duration}`，不可展开、不渲染 body。[E: packages/tui/src/routes/session/index.tsx:1616]

## 不变

- SessionV2 不是默认路径。
- Effect HttpApi，不是 Hono。
- 无新/删模型可见 tool。
- 36 workspace packages；`bun@1.3.14`；发布 `1.18.25`。
- `infra/stats.ts` 无 diff。
- zen/go live 模型表来自外部 catalog，不要把 commit 文案里的模型名写成硬编码名单。
