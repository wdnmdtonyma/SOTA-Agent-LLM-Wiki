---
id: ref.llm-protocol-catalog
title: LLM Protocol Catalog
kind: reference
tier: T3
v: shared
source:
  - packages/llm/src/protocols/
  - packages/llm/src/route/protocol.ts
status: verified
updated: 8b68dc0d7
evidence: explicit
symbols:
  - Protocol
  - AnthropicMessages.protocol
  - BedrockConverse.protocol
  - Gemini.protocol
  - OpenAIChat.protocol
  - OpenAICompatibleChat.route
  - OpenAIResponses.protocol
related:
  - model-layer.llm-protocols
---

# LLM Protocol Catalog

本节点描述 `packages/llm/src/protocols` 的六种协议实现。`Protocol` 只拥有 provider-native body schema/build 与 streaming state machine；URL、headers、auth、framing 属于 `Route.make(...)` 的 deployment concern，不属于 protocol 自身。[E: packages/llm/src/route/protocol.ts:36] [E: packages/llm/src/route/protocol.ts:36] [E: packages/llm/src/route/protocol.ts:36]

## V1

V1 主线仍是 Vercel AI SDK provider path；`packages/llm` 是 native provider protocol seam。启用 native LLM seam 时，V1 可以复用这些 protocol 的 body/stream adapters，但默认活跑路径不由这些 protocol 直接调度。[I]

## V2

V2 core 把 `packages/llm` 当作 provider protocol engine。[I] `Protocol` contract 本身负责把 common `LLMRequest` 降成 provider-native body，并把 streaming response 解码回统一 `LLMEvent`。[E: packages/llm/src/route/protocol.ts:49] [E: packages/llm/src/route/protocol.ts:42]

## Protocol Contract

| Contract 字段 | 类型 | 语义 |
| --- | --- | --- |
| `Protocol.id` | `ProtocolID` | 协议实现稳定 ID。[E: packages/llm/src/route/protocol.ts:36] [E: packages/llm/src/route/protocol.ts:38] |
| `Protocol.body.schema` | `Schema.Codec<Body, unknown>` | provider-native body 的校验 schema。[E: packages/llm/src/route/protocol.ts:45] [E: packages/llm/src/route/protocol.ts:47] |
| `Protocol.body.from` | `(LLMRequest) => Effect<Body, LLMError>` | 从 common `LLMRequest` 构造 provider body。[E: packages/llm/src/route/protocol.ts:49] [E: packages/llm/src/route/protocol.ts:49] |
| `Protocol.stream.event` | `Schema.Codec<Event, Frame>` | 从 framed response unit 解码一个 provider event。[E: packages/llm/src/route/protocol.ts:52] [E: packages/llm/src/route/protocol.ts:54] |
| `Protocol.stream.initial` | `(request) => State` | 每个 response 开始时初始化 parser state。[E: packages/llm/src/route/protocol.ts:56] [E: packages/llm/src/route/protocol.ts:56] |
| `Protocol.stream.step` | `(state,event) => Effect<[State, LLMEvent[]], LLMError>` | 每个 provider event 推进状态并产出统一事件。[E: packages/llm/src/route/protocol.ts:58] [E: packages/llm/src/route/protocol.ts:58] |
| `Protocol.stream.terminal?` | `(event) => boolean` | 可选 terminal predicate，给不会自然结束的 transports 用。[E: packages/llm/src/route/protocol.ts:60] [E: packages/llm/src/route/protocol.ts:60] |
| `Protocol.stream.onHalt?` | `(state) => LLMEvent[]` | framed stream 结束时 flush pending finish/tool events。[E: packages/llm/src/route/protocol.ts:62] [E: packages/llm/src/route/protocol.ts:62] |

## Six Protocols

| Protocol | Body shape 关键字段 | Stream 状态机 | Terminal / halt | Route deployment |
| --- | --- | --- | --- | --- |
| `AnthropicMessages` | body 含 `model/system/messages/tools/tool_choice/stream/max_tokens/temperature/top_p/top_k/stop_sequences/thinking`，`max_tokens` fallback 是 model route output limit 或 4096。[E: packages/llm/src/protocols/anthropic-messages.ts:529] [E: packages/llm/src/protocols/anthropic-messages.ts:536] | `content_block_start` 开 tool/text/reasoning；`input_json_delta` 累积 tool args；`message_delta` 发 finish。[E: packages/llm/src/protocols/anthropic-messages.ts:654] [E: packages/llm/src/protocols/anthropic-messages.ts:734] [E: packages/llm/src/protocols/anthropic-messages.ts:772] | 没有 explicit terminal；stream halt 自然结束。[E: packages/llm/src/protocols/anthropic-messages.ts:817] | Route 使用 provider `anthropic`、`Auth.none`、SSE framing。[E: packages/llm/src/protocols/anthropic-messages.ts:838] |
| `BedrockConverse` | body 含 `modelId/messages/system/inferenceConfig/toolConfig`；generation 为空时省略 `inferenceConfig`。[E: packages/llm/src/protocols/bedrock-converse.ts:398] [E: packages/llm/src/protocols/bedrock-converse.ts:402] | 处理 toolUse start/delta/stop、text delta、reasoningContent、messageStop、metadata、Bedrock error events。[E: packages/llm/src/protocols/bedrock-converse.ts:471] [E: packages/llm/src/protocols/bedrock-converse.ts:518] [E: packages/llm/src/protocols/bedrock-converse.ts:578] | `onHalt` 等 pendingFinish，保证 `messageStop` 和 `metadata` 都有机会到达后只发一次 finish。[E: packages/llm/src/protocols/bedrock-converse.ts:448] [E: packages/llm/src/protocols/bedrock-converse.ts:607] | Route provider `bedrock`，endpoint path 包含 encoded `modelId`，auth 是 `BedrockAuth.auth`，framing 是 AWS event stream。[E: packages/llm/src/protocols/bedrock-converse.ts:648] [E: packages/llm/src/protocols/bedrock-converse.ts:654] [E: packages/llm/src/protocols/bedrock-converse.ts:658] |
| `Gemini` | body 含 `contents/systemInstruction/tools/toolConfig/generationConfig`；generationConfig 可省略。[E: packages/llm/src/protocols/gemini.ts:312] [E: packages/llm/src/protocols/gemini.ts:318] | candidate parts 中 text 可是普通 text 或 thought reasoning；functionCall 变 tool call。[E: packages/llm/src/protocols/gemini.ts:406] [E: packages/llm/src/protocols/gemini.ts:422] | `onHalt: finish` 用 finishReason/usage flush final event。[E: packages/llm/src/protocols/gemini.ts:368] [E: packages/llm/src/protocols/gemini.ts:471] | Route provider `google`，endpoint `/models/${model}:streamGenerateContent?alt=sse`，Auth.none。[E: packages/llm/src/protocols/gemini.ts:502] [E: packages/llm/src/protocols/gemini.ts:505] [E: packages/llm/src/protocols/gemini.ts:508] |
| `OpenAIChat` | body 含 `model/messages/tools/tool_choice/stream/stream_options/max_tokens/temperature/top_p/frequency_penalty/presence_penalty/seed/stop`。[E: packages/llm/src/protocols/openai-chat.ts:360] [E: packages/llm/src/protocols/openai-chat.ts:359] | delta reasoning/content 走 lifecycle；tool_calls JSON args 用 `ToolStream.appendOrStart` 累积；finishReason 到达时 finalize all tools。[E: packages/llm/src/protocols/openai-chat.ts:411] [E: packages/llm/src/protocols/openai-chat.ts:415] [E: packages/llm/src/protocols/openai-chat.ts:432] | `onHalt: finishEvents` flush accumulated tool events and finish。[E: packages/llm/src/protocols/openai-chat.ts:467] [E: packages/llm/src/protocols/openai-chat.ts:491] | Route provider `openai`，endpoint `/chat/completions` with default base URL，Auth.none，SSE JSON transport。[E: packages/llm/src/protocols/openai-chat.ts:484] [E: packages/llm/src/protocols/openai-chat.ts:489] |
| `OpenAICompatibleChat` | 复用 `OpenAIChat.protocol`，没有单独 body state machine。[E: packages/llm/src/protocols/openai-compatible-chat.ts:17] [E: packages/llm/src/protocols/openai-compatible-chat.ts:19] | 完全继承 OpenAI Chat stream parser。[E: packages/llm/src/protocols/openai-compatible-chat.ts:17] | 继承 OpenAI Chat onHalt。 | Route id 是 `openai-compatible-chat`，endpoint 是 `/chat/completions`，framing 是 SSE；provider helpers 配 endpoint。[E: packages/llm/src/protocols/openai-compatible-chat.ts:17] [E: packages/llm/src/protocols/openai-compatible-chat.ts:20] |
| `OpenAIResponses` | body 含 `model/input/tools/tool_choice/stream/max_output_tokens/temperature/top_p` 加 lowerOptions。[E: packages/llm/src/protocols/openai-responses.ts:471] [E: packages/llm/src/protocols/openai-responses.ts:480] | step 分发 output_text/reasoning/tool/function_call/output_item/completed/incomplete/failed/error。[E: packages/llm/src/protocols/openai-responses.ts:907] [E: packages/llm/src/protocols/openai-responses.ts:931] | terminal set 是 `response.completed/response.incomplete/response.failed`；failed 发 provider-error。[E: packages/llm/src/protocols/openai-responses.ts:597] [E: packages/llm/src/protocols/openai-responses.ts:597] | Route provider `openai`，endpoint `/responses` with default base URL，Auth.none，SSE JSON transport；还有 WebSocket message adapter。[E: packages/llm/src/protocols/openai-responses.ts:943] [E: packages/llm/src/protocols/openai-responses.ts:963] [E: packages/llm/src/protocols/openai-responses.ts:990] |

## Framing Notes

JSON SSE protocols usually use `Protocol.jsonEvent(schema)` to decode data frames from JSON strings。[E: packages/llm/src/route/protocol.ts:82] Bedrock Converse is the exception: AWS event-stream frames are binary length/header/payload/CRC records decoded by `@smithy/eventstream-codec` and rewrapped under `:event-type` for schema matching。[E: packages/llm/src/protocols/bedrock-event-stream.ts:11] [E: packages/llm/src/protocols/bedrock-event-stream.ts:82]

## Sources

- packages/llm/src/protocols/
- packages/llm/src/route/protocol.ts

## Related

- model-layer.llm-protocols
