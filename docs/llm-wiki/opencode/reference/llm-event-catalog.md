---
id: ref.llm-event-catalog
title: LLM Event Catalog
kind: reference
tier: T3
v: shared
source:
  - packages/llm/src/schema/events.ts
  - packages/llm/src/schema/errors.ts
status: verified
updated: 355a0bcf5
evidence: explicit
symbols:
  - LLMEvent
  - Usage
  - LLMError
  - ToolFailure
related:
  - model-layer.llm-schema
---

# LLM Event Catalog

本节点列出 `packages/llm` 的 stream event、usage 和 error reason catalog。V1 native seam 与 V2 engine 共享这些 schemas；差异在于谁消费事件：V1 optional native path 把事件桥接回 V1 session/UI，[I] V2 runner 直接把这些 provider-neutral events 持久化或投影到 Session execution flow。[I]

## V1

V1 默认 Vercel AI SDK path 不直接以 `LLMEvent` 为唯一事件源；启用 native seam 时，protocol adapters 会产出本节点的事件 union，再由 V1 bridge 转换成 session-visible facts。[I]

## V2

V2 使用 `LLMEvent` 作为 provider stream 的统一语义输出：protocol state machine 只产出这些事件，不把 provider-specific raw chunks 直接泄漏给 runner。[E: packages/llm/src/route/protocol.ts:58] [E: packages/llm/src/route/protocol.ts:58]

## Usage

| 字段 | 类型 | 语义 |
| --- | --- | --- |
| `inputTokens` | optional number | provider 报告的输入 token 总数。[E: packages/llm/src/schema/events.ts:51] [E: packages/llm/src/schema/events.ts:52] |
| `outputTokens` | optional number | provider 报告的输出 token 总数。[E: packages/llm/src/schema/events.ts:53] |
| `nonCachedInputTokens` | optional number | 非 cache read/write 的输入 token 估算或 provider breakdown。[E: packages/llm/src/schema/events.ts:54] |
| `cacheReadInputTokens` | optional number | cache read token 数。[E: packages/llm/src/schema/events.ts:55] |
| `cacheWriteInputTokens` | optional number | cache write token 数。[E: packages/llm/src/schema/events.ts:56] |
| `reasoningTokens` | optional number | reasoning/thought token 数。[E: packages/llm/src/schema/events.ts:57] |
| `totalTokens` | optional number | provider total 或 input/output 合计。[E: packages/llm/src/schema/events.ts:58] |
| `providerMetadata` | optional metadata | provider-specific raw usage metadata。[E: packages/llm/src/schema/events.ts:59] |
| `visibleOutputTokens` | computed getter | `outputTokens - reasoningTokens` 且 clamp 到 0，防止 negative downstream schema crash。[E: packages/llm/src/schema/events.ts:67] [E: packages/llm/src/schema/events.ts:68] |

## Sixteen LLM Events

| Event type | 字段 | 语义 |
| --- | --- | --- |
| `step-start` | `index` | provider step 开始。[E: packages/llm/src/schema/events.ts:78] [E: packages/llm/src/schema/events.ts:80] |
| `text-start` | `id`, `providerMetadata?` | text content block 开始。[E: packages/llm/src/schema/events.ts:84] [E: packages/llm/src/schema/events.ts:87] |
| `text-delta` | `id`, `text`, `providerMetadata?` | text token/content delta。[E: packages/llm/src/schema/events.ts:91] [E: packages/llm/src/schema/events.ts:95] |
| `text-end` | `id`, `providerMetadata?` | text content block 结束。[E: packages/llm/src/schema/events.ts:99] [E: packages/llm/src/schema/events.ts:102] |
| `reasoning-start` | `id`, `providerMetadata?` | reasoning block 开始。[E: packages/llm/src/schema/events.ts:106] [E: packages/llm/src/schema/events.ts:109] |
| `reasoning-delta` | `id`, `text`, `providerMetadata?` | reasoning/thought delta。[E: packages/llm/src/schema/events.ts:113] [E: packages/llm/src/schema/events.ts:117] |
| `reasoning-end` | `id`, `providerMetadata?` | reasoning block 结束。[E: packages/llm/src/schema/events.ts:121] [E: packages/llm/src/schema/events.ts:124] |
| `tool-input-start` | `id`, `name`, `providerMetadata?` | streamed tool argument block 开始。[E: packages/llm/src/schema/events.ts:128] [E: packages/llm/src/schema/events.ts:132] |
| `tool-input-delta` | `id`, `name`, `text` | tool argument JSON/text delta。[E: packages/llm/src/schema/events.ts:136] [E: packages/llm/src/schema/events.ts:140] |
| `tool-input-end` | `id`, `name`, `providerMetadata?` | streamed tool input 结束。[E: packages/llm/src/schema/events.ts:144] [E: packages/llm/src/schema/events.ts:148] |
| `tool-call` | `id`, `name`, `input`, `providerExecuted?`, `providerMetadata?` | 完整 tool call；provider-hosted tool 用 `providerExecuted` 标记。[E: packages/llm/src/schema/events.ts:152] [E: packages/llm/src/schema/events.ts:158] |
| `tool-result` | `id`, `name`, `result`, `output?`, `providerExecuted?`, `providerMetadata?` | 完整 tool result；同时保留 legacy `result` 和 normalized `output?`。[E: packages/llm/src/schema/events.ts:162] [E: packages/llm/src/schema/events.ts:170] |
| `tool-error` | `id`, `name`, `message`, `error?`, `providerMetadata?` | model-visible expected tool failure event。[E: packages/llm/src/schema/events.ts:173] [E: packages/llm/src/schema/events.ts:180] |
| `step-finish` | `index`, `reason`, `usage?`, `providerMetadata?` | provider step 结束，通常伴随 finish reason 与 usage。[E: packages/llm/src/schema/events.ts:183] [E: packages/llm/src/schema/events.ts:189] |
| `finish` | `reason`, `usage?`, `providerMetadata?` | 完整 response stream 结束。[E: packages/llm/src/schema/events.ts:192] [E: packages/llm/src/schema/events.ts:197] |
| `provider-error` | `message`, `classification?`, `retryable?`, `providerMetadata?` | provider stream 中的非 tool error。[E: packages/llm/src/schema/events.ts:200] [E: packages/llm/src/schema/events.ts:205] |

`llmEventTagged` union 明确包含这 16 个 event schema，并按 `type` tagged union 化。[E: packages/llm/src/schema/events.ts:209] [E: packages/llm/src/schema/events.ts:226] `LLMEvent` namespace 提供 constructors 和 guards；constructors 会规范化 content block ID 与 tool call ID。[E: packages/llm/src/schema/events.ts:241] [E: packages/llm/src/schema/events.ts:264] Guards 覆盖每个 event type。[E: packages/llm/src/schema/events.ts:276] [E: packages/llm/src/schema/events.ts:292]

## Response Helpers

`LLMResponse.text` 串联所有 `text-delta`，`LLMResponse.reasoning` 串联所有 `reasoning-delta`，`LLMResponse.toolCalls` 过滤 `tool-call`。[E: packages/llm/src/schema/events.ts:320] [E: packages/llm/src/schema/events.ts:326] [E: packages/llm/src/schema/events.ts:353] namespace helper 也提供 `text/usage/toolCalls/reasoning` 静态函数。[E: packages/llm/src/schema/events.ts:358] [E: packages/llm/src/schema/events.ts:371]

## Error Reasons

| Reason | 字段 | retryable | 语义 |
| --- | --- | --- | --- |
| `InvalidRequest` | `message`, `parameter?`, `classification?`, `providerMetadata?`, `http?` | false | 请求构造或 provider 400-style 错误。[E: packages/llm/src/schema/errors.ts:34] [E: packages/llm/src/schema/errors.ts:43] |
| `NoRoute` | `route`, `provider`, `model` | false | 没有 matching LLM route；message getter 包含 provider/model/route。[E: packages/llm/src/schema/errors.ts:47] [E: packages/llm/src/schema/errors.ts:58] |
| `Authentication` | `message`, `kind`, `providerMetadata?`, `http?` | false | kind 枚举 missing/invalid/expired/insufficient-permissions/unknown。[E: packages/llm/src/schema/errors.ts:62] [E: packages/llm/src/schema/errors.ts:65] |
| `RateLimit` | `message`, `retryAfterMs?`, `rateLimit?`, `providerMetadata?`, `http?` | true | rate limit，可重试。[E: packages/llm/src/schema/errors.ts:74] [E: packages/llm/src/schema/errors.ts:83] |
| `QuotaExceeded` | `message`, `providerMetadata?`, `http?` | false | quota exhausted，不自动重试。[E: packages/llm/src/schema/errors.ts:87] [E: packages/llm/src/schema/errors.ts:94] |
| `ContentPolicy` | `message`, `providerMetadata?`, `http?` | false | content policy/filtering hard error。[E: packages/llm/src/schema/errors.ts:98] [E: packages/llm/src/schema/errors.ts:105] |
| `ProviderInternal` | `message`, `status`, `retryAfterMs?`, `providerMetadata?`, `http?` | true | provider 5xx/internal 类错误。[E: packages/llm/src/schema/errors.ts:109] [E: packages/llm/src/schema/errors.ts:118] |
| `Transport` | `message`, `kind?`, `url?`, `http?` | false | transport/network/request framing 类错误。[E: packages/llm/src/schema/errors.ts:122] [E: packages/llm/src/schema/errors.ts:130] |
| `InvalidProviderOutput` | `message`, `route?`, `raw?`, `providerMetadata?` | false | provider response schema/parse 不符合预期。[E: packages/llm/src/schema/errors.ts:134] [E: packages/llm/src/schema/errors.ts:134] |
| `UnknownProvider` | `message`, `status?`, `providerMetadata?`, `http?` | false | provider-specific 未分类错误。[E: packages/llm/src/schema/errors.ts:148] [E: packages/llm/src/schema/errors.ts:156] |

`LLMErrorReason` union 由这 10 个 reason 组成。[E: packages/llm/src/schema/errors.ts:160] [E: packages/llm/src/schema/errors.ts:171] `LLMError` 自身带 `module/method/reason`，`retryable` 和 `retryAfterMs` 代理到 reason，message 形如 `${module}.${method}: ${reason.message}`。[E: packages/llm/src/schema/errors.ts:174] [E: packages/llm/src/schema/errors.ts:190]

## ToolFailure

`ToolFailure` 是 tool executor 的 expected failure type。runtime 捕获它后会生成 `tool-error` event 加一个 error tool-result，让模型自我纠正；非 `ToolFailure` 的 thrown/yielded error 被视为 defect 并失败 stream。[E: packages/llm/src/schema/errors.ts:203] [E: packages/llm/src/schema/errors.ts:203]

## Sources

- packages/llm/src/schema/events.ts
- packages/llm/src/schema/errors.ts

## Related

- model-layer.llm-schema
