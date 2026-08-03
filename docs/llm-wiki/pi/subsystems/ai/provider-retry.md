---
id: subsys.ai.provider-retry
title: Provider 请求重试
kind: subsystem
tier: T2
pkg: ai
source:
  - packages/ai/src/utils/provider-retry.ts
  - packages/ai/src/utils/retry.ts
  - packages/ai/src/api/simple-options.ts
  - packages/ai/src/api/openai-responses.ts
  - packages/ai/src/api/azure-openai-responses.ts
  - packages/ai/src/api/openai-completions.ts
  - packages/ai/src/api/anthropic-messages.ts
  - packages/ai/src/api/openrouter-images.ts
  - packages/ai/src/api/google-shared.ts
  - packages/ai/src/api/google-generative-ai.ts
  - packages/ai/src/api/google-vertex.ts
symbols:
  - retryProviderRequest
  - retryAssistantCall
  - isRetryableAssistantError
related:
  - spine.provider-stream
  - subsys.ai.event-stream
  - ref.coding-agent.config-keys
evidence: explicit
status: verified
updated: c1019d9202
---

> Pi 有两层重试：provider request 层重建 SDK 请求，assistant 层在一次完整 assistant message 失败后重启生成。两者的错误输入、预算和事件不同。

## Provider request 层

`retryProviderRequest()` 默认零次重试；调用方显式传入 `maxRetries` 后，它仅重试具有 status/Headers 形状的 provider error。`x-should-retry` 具有最高优先级，否则 408、409、429、5xx 和无 status 网络错误可重试。[E: packages/ai/src/utils/provider-retry.ts:14] [E: packages/ai/src/utils/provider-retry.ts:23] [E: packages/ai/src/utils/provider-retry.ts:24] [E: packages/ai/src/utils/provider-retry.ts:28] [E: packages/ai/src/utils/provider-retry.ts:105] [E: packages/ai/src/utils/provider-retry.ts:109]

服务端 `retry-after-ms` / `retry-after` 优先于指数退避；默认拒绝超过 60 秒的服务端延迟，指数退避为 0.5s 起、8s 封顶并带 0–25% jitter。sleep 监听同一 AbortSignal。[E: packages/ai/src/utils/provider-retry.ts:1] [E: packages/ai/src/utils/provider-retry.ts:37] [E: packages/ai/src/utils/provider-retry.ts:51] [E: packages/ai/src/utils/provider-retry.ts:65] [E: packages/ai/src/utils/provider-retry.ts:75] [E: packages/ai/src/utils/provider-retry.ts:122]

## Assistant message 层

`retryAssistantCall()` 接收已经标准化为 `AssistantMessage` 的错误，根据 `RetryPolicy` 做完整生成重试并触发 scheduled/start/finished callbacks；配额、budget、billing 等确定性错误被分类为不可重试。[E: packages/ai/src/utils/retry.ts:7] [E: packages/ai/src/utils/retry.ts:88] [E: packages/ai/src/utils/retry.ts:106] [E: packages/ai/src/utils/retry.ts:162] [E: packages/ai/src/utils/retry.ts:188] [E: packages/ai/src/utils/retry.ts:222]

`SimpleStreamOptions` 的 `maxRetries` 与 `maxRetryDelayMs` 会被转入底层 `StreamOptions`，供 provider request 层使用。[E: packages/ai/src/api/simple-options.ts:21] [E: packages/ai/src/api/simple-options.ts:41] [E: packages/ai/src/api/simple-options.ts:42]

## L2 证伪与边界

- shared provider retry 现在覆盖 7 条 initial-request 路径：OpenAI Responses、Azure Responses、OpenAI Completions、Anthropic、OpenRouter images，加上经 `retryGoogleRequest()` 归一化 SDK error 后接入的 Google Generative AI 与 Google Vertex。[E: packages/ai/src/api/openai-responses.ts:147] [E: packages/ai/src/api/azure-openai-responses.ts:116] [E: packages/ai/src/api/openai-completions.ts:240] [E: packages/ai/src/api/anthropic-messages.ts:557] [E: packages/ai/src/api/openrouter-images.ts:68] [E: packages/ai/src/api/google-generative-ai.ts:92] [E: packages/ai/src/api/google-vertex.ts:110] [E: packages/ai/src/api/google-shared.ts:393] [E: packages/ai/src/api/google-shared.ts:397]
- Google SDK error 有 `status` 但通常没有 `headers`；wrapper 只在确有 status 且缺少 headers 时补 `headers: undefined`，让 `retryProviderRequest()` 能按相同 408/409/429/5xx policy 分类，并原样传入 retry budget 与 AbortSignal。[E: packages/ai/src/api/google-shared.ts:393] [E: packages/ai/src/api/google-shared.ts:393] [E: packages/ai/src/api/google-shared.ts:402] [E: packages/ai/src/api/google-shared.ts:403] [E: packages/ai/src/api/google-shared.ts:409] [E: packages/ai/src/api/google-shared.ts:411]
- assistant retry 消费 error message 文本而非 HTTP response；provider request retry 消费 status/headers error。不能把一层的分类表当作另一层的契约。[E: packages/ai/src/utils/provider-retry.ts:14] [E: packages/ai/src/utils/provider-retry.ts:23] [E: packages/ai/src/utils/provider-retry.ts:118] [E: packages/ai/src/utils/retry.ts:222] [E: packages/ai/src/utils/retry.ts:225] [E: packages/ai/src/utils/retry.ts:226]
- assistant `onRetryFinished` 只会在至少安排过一次 retry 后触发；scheduled callback 在 sleep 前，attempt-start 在 sleep 后。backoff 期间 abort 会先发 finished(false)，再把原 error message 归一成 `stopReason: "aborted"` 且清掉 `errorMessage`。[E: packages/ai/src/utils/retry.ts:171] [E: packages/ai/src/utils/retry.ts:177] [E: packages/ai/src/utils/retry.ts:183] [E: packages/ai/src/utils/retry.ts:189] [E: packages/ai/src/utils/retry.ts:196] [E: packages/ai/src/utils/retry.ts:201] [E: packages/ai/src/utils/retry.ts:203] [E: packages/ai/src/utils/retry.ts:205] [E: packages/ai/src/utils/retry.ts:209]
- 两层默认都不会无限重试；provider 层默认零次，assistant 层也受 settings budget 限制。[E: packages/ai/src/utils/provider-retry.ts:109] [E: packages/ai/src/utils/retry.ts:168]

## Sources

- packages/ai/src/utils/provider-retry.ts
- packages/ai/src/utils/retry.ts
- packages/ai/src/api/simple-options.ts
- packages/ai/src/api/openai-responses.ts
- packages/ai/src/api/azure-openai-responses.ts
- packages/ai/src/api/openai-completions.ts
- packages/ai/src/api/anthropic-messages.ts
- packages/ai/src/api/openrouter-images.ts

## 相关

- [spine.provider-stream](../../spine/provider-stream.md): retry 位于统一 API 与 provider wire request 之间的位置。
- [subsys.ai.event-stream](event-stream.md): assistant message 错误如何成为高层 retry 输入。
- [ref.coding-agent.config-keys](../../reference/config-keys.md): coding-agent 暴露的 retry 配置项。
