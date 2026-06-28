---
id: subsys.ai.prompt-caching
title: 提示缓存策略
kind: subsystem
tier: T2
pkg: ai
source:
  - packages/ai/src/api/openai-prompt-cache.ts
  - packages/ai/src/api/anthropic-messages.ts
symbols:
  - clampOpenAIPromptCacheKey
related:
  - subsys.ai.anthropic-messages
  - subsys.ai.openai-responses
evidence: explicit
status: verified
updated: 5a073885
---

> `subsys.ai.prompt-caching` 描述 `pi-ai` 的 prompt caching 边界:OpenAI family 侧集中约束 `prompt_cache_key`,Anthropic Messages 侧把统一 cache retention 转成 Anthropic `cache_control` block metadata。

## 能回答的问题

- `clampOpenAIPromptCacheKey` 如何处理 `undefined`、短 key 和超长 key?
- OpenAI prompt cache key 的 64 字符上限在哪里定义?
- Anthropic Messages 如何从 `cacheRetention` / `PI_CACHE_RETENTION` 得到 `cache_control`?
- Anthropic `cache_control` 会挂到 system、user message、tool definition 的哪些位置?
- `cacheRetention: "none"` 对 Anthropic request body 和 session affinity header 有什么影响?
- 维护 prompt caching 时有哪些跨 provider gotcha?

## 职责边界

`packages/ai/src/api/openai-prompt-cache.ts` 是 OpenAI-family prompt cache key 的小型 helper:它定义 `OPENAI_PROMPT_CACHE_KEY_MAX_LENGTH = 64`,并导出 `clampOpenAIPromptCacheKey`。[E: packages/ai/src/api/openai-prompt-cache.ts:1][E: packages/ai/src/api/openai-prompt-cache.ts:3]

`packages/ai/src/api/anthropic-messages.ts` 是 Anthropic Messages 的 prompt caching 实现点:它解析统一 cache retention,生成 Anthropic SDK 的 `CacheControlEphemeral`,并在 request construction 中把 `cache_control` 写入可缓存的 system/user/tool 位置。[E: packages/ai/src/api/anthropic-messages.ts:46][E: packages/ai/src/api/anthropic-messages.ts:56][E: packages/ai/src/api/anthropic-messages.ts:907][E: packages/ai/src/api/anthropic-messages.ts:922][E: packages/ai/src/api/anthropic-messages.ts:1167][E: packages/ai/src/api/anthropic-messages.ts:1208]

本节点只把 OpenAI helper 与 Anthropic Messages 的缓存落点放在同一张图里;OpenAI Responses request payload 的完整转换属于 [subsys.ai.openai-responses](openai-responses.md),Anthropic message/tool/stream 细节属于 [subsys.ai.anthropic-messages](anthropic-messages.md)。[I]

## OpenAI prompt cache key clamp

`clampOpenAIPromptCacheKey(key)` 对 `undefined` 原样返回 `undefined`,所以调用方可以用同一个 helper 处理缺失的 session id 或关闭缓存后的 key 值。[E: packages/ai/src/api/openai-prompt-cache.ts:3][E: packages/ai/src/api/openai-prompt-cache.ts:4]

`clampOpenAIPromptCacheKey` 使用 `Array.from(key)` 计算字符数组,短于或等于 64 个字符时返回原始 `key`,长于 64 个字符时截取前 64 个字符再 `join("")`。[E: packages/ai/src/api/openai-prompt-cache.ts:5][E: packages/ai/src/api/openai-prompt-cache.ts:6][E: packages/ai/src/api/openai-prompt-cache.ts:7]

这里的 "字符" 是 JavaScript `Array.from(string)` 的迭代单位,不是 UTF-16 code unit 的 `string.length`;这会让 surrogate pair 按一个迭代单元进入 64 个元素的截断窗口。[E: packages/ai/src/api/openai-prompt-cache.ts:5][I]

## Anthropic cache retention

Anthropic retention resolver 的优先级是:显式 `cacheRetention` 直接返回;否则 `PI_CACHE_RETENTION=long` 返回 `"long"`;其它情况默认 `"short"`。[E: packages/ai/src/api/anthropic-messages.ts:46][E: packages/ai/src/api/anthropic-messages.ts:47][E: packages/ai/src/api/anthropic-messages.ts:50][E: packages/ai/src/api/anthropic-messages.ts:53]

`getCacheControl` 在 retention 为 `"none"` 时只返回 retention,不返回 `cacheControl`;非 `"none"` 时返回 `{ type: "ephemeral" }`,并且仅当 retention 是 `"long"` 且 model compat 支持 long cache retention 时加上 `ttl: "1h"`。[E: packages/ai/src/api/anthropic-messages.ts:61][E: packages/ai/src/api/anthropic-messages.ts:62][E: packages/ai/src/api/anthropic-messages.ts:65][E: packages/ai/src/api/anthropic-messages.ts:68]

Anthropic compat 默认支持 long cache retention 和 tool 上的 cache control,但这两个能力都可以被 `model.compat` 覆盖;默认不发送 session affinity header。[E: packages/ai/src/api/anthropic-messages.ts:170][E: packages/ai/src/api/anthropic-messages.ts:175][E: packages/ai/src/api/anthropic-messages.ts:176][E: packages/ai/src/api/anthropic-messages.ts:177]

## Anthropic cache_control 落点

`buildParams` 先调用 `getCacheControl`,再把 `cacheControl` 传给 `convertMessages`,并只在 `compat.supportsCacheControlOnTools` 为真时把它传给 `convertTools`。[E: packages/ai/src/api/anthropic-messages.ts:907][E: packages/ai/src/api/anthropic-messages.ts:911][E: packages/ai/src/api/anthropic-messages.ts:948][E: packages/ai/src/api/anthropic-messages.ts:953]

OAuth token 路径会创建第一段 Claude Code identity system text,并在有 `cacheControl` 时给该 system block 写 `cache_control`;调用方 system prompt 如果存在,也会作为第二个 system text block 获得同一个 `cache_control`。[E: packages/ai/src/api/anthropic-messages.ts:917][E: packages/ai/src/api/anthropic-messages.ts:921][E: packages/ai/src/api/anthropic-messages.ts:922][E: packages/ai/src/api/anthropic-messages.ts:925][E: packages/ai/src/api/anthropic-messages.ts:929]

非 OAuth 路径只在 `context.systemPrompt` 存在时创建 system array,并在有 `cacheControl` 时给该 system text block 写 `cache_control`。[E: packages/ai/src/api/anthropic-messages.ts:932][E: packages/ai/src/api/anthropic-messages.ts:934][E: packages/ai/src/api/anthropic-messages.ts:937][E: packages/ai/src/api/anthropic-messages.ts:938]

`convertMessages` 只在转换后的 params 最后一条消息存在且 `role === "user"` 时挂 conversation-history cache point:数组 content 时要求最后一个 block 是 `text`、`image` 或 `tool_result`,然后给这个 block 写 `cache_control`;string content 时会把整条 user content 改成一个 text block array 并写 `cache_control`。[E: packages/ai/src/api/anthropic-messages.ts:1158][E: packages/ai/src/api/anthropic-messages.ts:1160][E: packages/ai/src/api/anthropic-messages.ts:1162][E: packages/ai/src/api/anthropic-messages.ts:1165][E: packages/ai/src/api/anthropic-messages.ts:1167][E: packages/ai/src/api/anthropic-messages.ts:1169][E: packages/ai/src/api/anthropic-messages.ts:1174]

`convertTools` 只把 `cache_control` 写到最后一个 tool definition,同时保留 tool name、description、input schema 和可选 `eager_input_streaming` 字段。[E: packages/ai/src/api/anthropic-messages.ts:1196][E: packages/ai/src/api/anthropic-messages.ts:1200][E: packages/ai/src/api/anthropic-messages.ts:1201][E: packages/ai/src/api/anthropic-messages.ts:1202][E: packages/ai/src/api/anthropic-messages.ts:1203][E: packages/ai/src/api/anthropic-messages.ts:1208]

## Session 与 usage 边界

Anthropic 自行创建 client 的路径在 cache retention 为 `"none"` 时不会把 `options.sessionId` 传入 `createClient`;其它 retention 会把 `options.sessionId` 作为 `cacheSessionId` 传入。[E: packages/ai/src/api/anthropic-messages.ts:514][E: packages/ai/src/api/anthropic-messages.ts:515][E: packages/ai/src/api/anthropic-messages.ts:517][E: packages/ai/src/api/anthropic-messages.ts:524]

普通 API key 或 header-owned auth 路径只有在存在 session id 且 compat 允许 `sendSessionAffinityHeaders` 时才添加 `x-session-affinity` header。[E: packages/ai/src/api/anthropic-messages.ts:878][E: packages/ai/src/api/anthropic-messages.ts:879]

Anthropic stream 会把 `cache_read_input_tokens` 计入 unified `usage.cacheRead`,把 `cache_creation_input_tokens` 计入 `usage.cacheWrite`,并把 `cache_creation.ephemeral_1h_input_tokens` 计入 `usage.cacheWrite1h`。[E: packages/ai/src/api/anthropic-messages.ts:553][E: packages/ai/src/api/anthropic-messages.ts:554][E: packages/ai/src/api/anthropic-messages.ts:555]

## 设计动机与 gotcha

OpenAI helper 只负责 key 长度边界,不表达 retention;Anthropic implementation 不使用 `prompt_cache_key`,而是通过 `cache_control` metadata 在 system/user/tool block 上声明缓存点。[E: packages/ai/src/api/openai-prompt-cache.ts:1][E: packages/ai/src/api/openai-prompt-cache.ts:3][E: packages/ai/src/api/anthropic-messages.ts:68][E: packages/ai/src/api/anthropic-messages.ts:922][E: packages/ai/src/api/anthropic-messages.ts:1167][E: packages/ai/src/api/anthropic-messages.ts:1208][I]

`cacheRetention: "none"` 对 Anthropic 同时关掉 `cache_control` 与 session affinity 输入:前者来自 `getCacheControl` 不返回 cache control,后者来自 `cacheSessionId` 被置为 `undefined`。[E: packages/ai/src/api/anthropic-messages.ts:62][E: packages/ai/src/api/anthropic-messages.ts:63][E: packages/ai/src/api/anthropic-messages.ts:514][E: packages/ai/src/api/anthropic-messages.ts:515]

Anthropic 的 `"long"` retention 在本文件里是 `ttl: "1h"`,而 OpenAI-family long-retention policy 不在本节点 source 中定义;比较跨 provider TTL 时应跳到对应 OpenAI 节点核对。[E: packages/ai/src/api/anthropic-messages.ts:65][E: packages/ai/src/api/anthropic-messages.ts:68][I]

`convertMessages` 只在转换后的 params 最后一条消息是 user 时缓存其最后一个可缓存 block,所以在最后一条消息不是 user、或最后一个 block 不是 text/image/tool_result 时,conversation-history cache point 不会落到 messages 上。[E: packages/ai/src/api/anthropic-messages.ts:1158][E: packages/ai/src/api/anthropic-messages.ts:1160][E: packages/ai/src/api/anthropic-messages.ts:1162][E: packages/ai/src/api/anthropic-messages.ts:1165]

## 跨包边界

[subsys.ai.anthropic-messages](anthropic-messages.md) 覆盖 Anthropic wire adapter 的完整 request、stream event、usage 和 stop reason 转换;本节点只抽出 prompt caching 的 retention、`cache_control` 和 session-affinity 逻辑。[I]

[subsys.ai.openai-responses](openai-responses.md) 覆盖 OpenAI Responses payload 的完整构造;本节点只权威覆盖 `clampOpenAIPromptCacheKey` helper 及它代表的 OpenAI prompt cache key clamp 规则。[I]

## Sources

- packages/ai/src/api/openai-prompt-cache.ts
- packages/ai/src/api/anthropic-messages.ts

## 相关

- [subsys.ai.anthropic-messages](anthropic-messages.md) - Anthropic Messages wire adapter 的完整 payload 与 streaming 行为。
- [subsys.ai.openai-responses](openai-responses.md) - OpenAI Responses wire adapter 中 prompt cache key 与 retention 字段的使用边界。
