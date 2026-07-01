---
id: model-layer.llm-protocols
title: LLM Protocols
kind: subsystem
tier: T2
v: shared
source: [packages/llm/src/protocols/]
symbols: [AnthropicMessages, OpenAIResponses, OpenAIChat, OpenAICompatibleChat, Gemini, BedrockConverse]
related: [ref.llm-protocol-catalog, model-layer.copilot]
evidence: explicit
status: verified
updated: 8b68dc0d7
---

> `packages/llm/src/protocols` 当前导出 6 个 provider-native protocol adapter:Anthropic Messages、OpenAI Responses、OpenAI Chat、OpenAI-compatible Chat、Gemini、Bedrock Converse。每个 adapter 把同一个 `LLMRequest` 降成 provider-native body,再把 provider streaming frames 升成统一 `LLMEvent`。

## 能回答的问题
- 6 个 native protocol adapter 分别覆盖哪个 API shape?
- OpenAI Responses 为什么同时有 HTTP route 与 WebSocket route?
- OpenAI-compatible Chat 与 native OpenAI Chat 的差别在哪里?
- Gemini/Bedrock 的 endpoint 为什么依赖 model/body?
- 哪些 shared helper 统一处理 usage、system update、tool input?

## V1

V1 默认 provider path 是 AI SDK registry,不是这些 protocol adapter。[I] 当 V1 走 native seam 时,这些 adapter 才会成为 provider wire 层。[I]

## V2

V2 native provider engine 以这些 adapter 作为 protocol catalog,core catalog/plugin 决定 provider/model 后,具体 request body 与 stream parser 由 adapter 完成。[I]

## Protocol Catalog

`protocols/index.ts` 明确导出 6 个命名空间:AnthropicMessages、BedrockConverse、Gemini、OpenAIChat、OpenAICompatibleChat、OpenAIResponses。[E: packages/llm/src/protocols/index.ts:1][E: packages/llm/src/protocols/index.ts:2][E: packages/llm/src/protocols/index.ts:3][E: packages/llm/src/protocols/index.ts:4][E: packages/llm/src/protocols/index.ts:5][E: packages/llm/src/protocols/index.ts:6]

| Protocol | Route id | Endpoint / Transport | 关键行为 |
| --- | --- | --- | --- |
| Anthropic Messages | `anthropic-messages` | `/messages` + Anthropic default base URL + SSE framing | request body schema + streaming state machine;route 加 `anthropic-version` header。[E: packages/llm/src/protocols/anthropic-messages.ts:28][E: packages/llm/src/protocols/anthropic-messages.ts:29][E: packages/llm/src/protocols/anthropic-messages.ts:832][E: packages/llm/src/protocols/anthropic-messages.ts:839][E: packages/llm/src/protocols/anthropic-messages.ts:841][E: packages/llm/src/protocols/anthropic-messages.ts:845][E: packages/llm/src/protocols/anthropic-messages.ts:849][E: packages/llm/src/protocols/anthropic-messages.ts:851][E: packages/llm/src/protocols/anthropic-messages.ts:852] |
| OpenAI Responses HTTP | `openai-responses` | `/responses` + `HttpTransport.sseJson` | terminal event set 会停止 stream;HTTP route 复用 Responses protocol。[E: packages/llm/src/protocols/openai-responses.ts:959][E: packages/llm/src/protocols/openai-responses.ts:966][E: packages/llm/src/protocols/openai-responses.ts:975][E: packages/llm/src/protocols/openai-responses.ts:982][E: packages/llm/src/protocols/openai-responses.ts:984][E: packages/llm/src/protocols/openai-responses.ts:987] |
| OpenAI Responses WebSocket | `openai-responses-websocket` | 同 endpoint + `WebSocketTransport.jsonTransport` | WebSocket route 把 body 转成 `response.create` message,transport 不同但 protocol 相同。[E: packages/llm/src/protocols/openai-responses.ts:996][E: packages/llm/src/protocols/openai-responses.ts:1001][E: packages/llm/src/protocols/openai-responses.ts:1004][E: packages/llm/src/protocols/openai-responses.ts:1012][E: packages/llm/src/protocols/openai-responses.ts:1015][E: packages/llm/src/protocols/openai-responses.ts:1018] |
| OpenAI Chat | `openai-chat` | `/chat/completions` + `HttpTransport.sseJson` | route 使用 OpenAI Chat protocol、`/chat/completions` endpoint 和 SSE JSON transport。[E: packages/llm/src/protocols/openai-chat.ts:481][E: packages/llm/src/protocols/openai-chat.ts:488][E: packages/llm/src/protocols/openai-chat.ts:495][E: packages/llm/src/protocols/openai-chat.ts:497][E: packages/llm/src/protocols/openai-chat.ts:501][E: packages/llm/src/protocols/openai-chat.ts:503] |
| OpenAI-compatible Chat | `openai-compatible-chat` | relative `/chat/completions` + SSE framing | 直接复用 `OpenAIChat.protocol`,并提供自己的 route id、endpoint、framing。[E: packages/llm/src/protocols/openai-compatible-chat.ts:18][E: packages/llm/src/protocols/openai-compatible-chat.ts:19][E: packages/llm/src/protocols/openai-compatible-chat.ts:20][E: packages/llm/src/protocols/openai-compatible-chat.ts:21] |
| Gemini | `gemini` | `/models/${model}:streamGenerateContent?alt=sse` + Google default base URL | endpoint path 嵌入 request model id,并把 SSE pin 在 URL 上。[E: packages/llm/src/protocols/gemini.ts:486][E: packages/llm/src/protocols/gemini.ts:493][E: packages/llm/src/protocols/gemini.ts:500][E: packages/llm/src/protocols/gemini.ts:505][E: packages/llm/src/protocols/gemini.ts:506][E: packages/llm/src/protocols/gemini.ts:509] |
| Bedrock Converse | `bedrock-converse` | `/model/${body.modelId}/converse-stream` + Bedrock auth + custom framing | endpoint 读取 validated body 的 modelId 生成 path;URL 与签名 body 匹配是设计意图。[E: packages/llm/src/protocols/bedrock-converse.ts:638][E: packages/llm/src/protocols/bedrock-converse.ts:645][E: packages/llm/src/protocols/bedrock-converse.ts:658][E: packages/llm/src/protocols/bedrock-converse.ts:665][E: packages/llm/src/protocols/bedrock-converse.ts:666][E: packages/llm/src/protocols/bedrock-converse.ts:668][E: packages/llm/src/protocols/bedrock-converse.ts:669][I] |

## 共享解析策略

Streaming tool-call accumulator 是共享概念:`ToolAccumulator` 存 `id/name/input`,共享 `parseToolInput` 把 raw JSON input 解析成 tool input;具体 adapter 用它累积多段 tool input。[E: packages/llm/src/protocols/shared.ts:32][E: packages/llm/src/protocols/shared.ts:33][E: packages/llm/src/protocols/shared.ts:34][E: packages/llm/src/protocols/shared.ts:35][E: packages/llm/src/protocols/shared.ts:155][E: packages/llm/src/protocols/shared.ts:156][I]

Usage 也有共享 policy:provider total 优先;没有 total 时才用 input+output fallback;`subtractTokens` 与 `sumTokens` 防止 provider breakdown 互相重叠时出现负数或 fabricated zero。[E: packages/llm/src/protocols/shared.ts:51][E: packages/llm/src/protocols/shared.ts:56][E: packages/llm/src/protocols/shared.ts:57][E: packages/llm/src/protocols/shared.ts:58][E: packages/llm/src/protocols/shared.ts:72][E: packages/llm/src/protocols/shared.ts:75][E: packages/llm/src/protocols/shared.ts:85][E: packages/llm/src/protocols/shared.ts:86]

System update 在不支持 privileged chronological system role 的 route 上会被包装成可见 user text,并 XML escape,以保持时间顺序但降低权限。[E: packages/llm/src/protocols/shared.ts:111][E: packages/llm/src/protocols/shared.ts:112][E: packages/llm/src/protocols/shared.ts:120][E: packages/llm/src/protocols/shared.ts:128][E: packages/llm/src/protocols/shared.ts:145][E: packages/llm/src/protocols/shared.ts:146]

## 设计动机

Protocol interface 只包含 body 与 stream state machine,不包含 deployment URL/auth/header;OpenAI-compatible Chat 复用 OpenAI Chat protocol,OpenAI Responses HTTP/WebSocket routes 复用同一个 Responses protocol。[E: packages/llm/src/route/protocol.ts:36][E: packages/llm/src/route/protocol.ts:40][E: packages/llm/src/route/protocol.ts:42][E: packages/llm/src/protocols/openai-compatible-chat.ts:19][E: packages/llm/src/protocols/openai-responses.ts:987][E: packages/llm/src/protocols/openai-responses.ts:1015]

Bedrock 与 Gemini 把 model/body 纳入 endpoint,说明 route endpoint 不是静态字符串:它可以依赖已校验 body 或 request。[E: packages/llm/src/protocols/gemini.ts:505][E: packages/llm/src/protocols/bedrock-converse.ts:665]

## 易错点

- `openai-compatible-chat` 不是第 7 个独立 parser;它复用 `OpenAIChat.protocol`,只提供不同 route id/endpoint/framing。[E: packages/llm/src/protocols/openai-compatible-chat.ts:18][E: packages/llm/src/protocols/openai-compatible-chat.ts:21]
- OpenAI Responses WebSocket route 不是另一个 protocol;它的 `protocol` 字段仍是 Responses protocol。[E: packages/llm/src/protocols/openai-responses.ts:1015]
- Anthropic server tool result blocks 使用独立 `AnthropicServerToolResultBlock` 表示；provider 执行并内联结果、没有 client round-trip 是源码中的注释性设计说明。[E: packages/llm/src/protocols/anthropic-messages.ts:95][I]

## Sources
- packages/llm/src/protocols/
- packages/llm/src/route/protocol.ts

## Related
- ref.llm-protocol-catalog
- model-layer.copilot
