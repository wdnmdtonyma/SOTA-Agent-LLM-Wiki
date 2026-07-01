---
id: subsys.ai.message-transform
title: 消息归一化
kind: subsystem
tier: T2
pkg: ai
source:
  - packages/ai/src/api/transform-messages.ts
symbols:
  - transformMessages
related:
  - subsys.ai.wire-protocol-dispatch
  - ref.ai.core-types
evidence: explicit
status: verified
updated: 8c943640
---

> `subsys.ai.message-transform` 描述 `transformMessages` 如何在 provider-specific wire payload 构造前,把历史 `Message[]` 归一成更适合目标 `Model` replay 的 `Message[]`。

## 能回答的问题

- `transformMessages(messages, model, normalizeToolCallId?)` 的输入和输出模型是什么?
- 不支持图片输入的目标模型会怎样处理 user / toolResult 里的 image content part?
- assistant 历史消息里的 thinking、text、toolCall content part 在同模型和跨模型 replay 时有什么差异?
- tool call id normalization 如何同步影响 assistant toolCall 和后续 toolResult?
- 为什么会插入合成 toolResult,插入时机在哪里?
- `transformMessages` 与各 provider wire serializer 的边界在哪里?

## 职责边界

`transformMessages` 的输入是统一 `Message[]`、目标 `Model<TApi>`、以及可选 `normalizeToolCallId(id, model, sourceAssistant)` 回调;输出仍是统一 `Message[]`,不是 OpenAI、Anthropic、Google、Bedrock 或 Mistral 的 wire payload。[E: packages/ai/src/api/transform-messages.ts:64][E: packages/ai/src/api/transform-messages.ts:65][E: packages/ai/src/api/transform-messages.ts:66][E: packages/ai/src/api/transform-messages.ts:67][E: packages/ai/src/api/transform-messages.ts:68][E: packages/ai/src/api/transform-messages.ts:219]

这个 subsystem 覆盖 replay normalization,不覆盖 `Context.systemPrompt` 的 provider-specific role 选择;`transformMessages` 只接收 `messages: Message[]`,源码没有读取 system prompt 的参数或分支。[E: packages/ai/src/api/transform-messages.ts:64][E: packages/ai/src/api/transform-messages.ts:65][I]

`transformMessages` 通常由 provider-specific `convertMessages` / `convertResponsesMessages` 在构造 wire payload 前调用;OpenAI Responses、OpenAI Completions、Anthropic Messages、Google shared、Bedrock Converse 和 Mistral Conversations 都在各自 serializer 内调用它。[E: packages/ai/src/api/openai-responses-shared.ts:123][E: packages/ai/src/api/openai-completions.ts:870][E: packages/ai/src/api/anthropic-messages.ts:1021][E: packages/ai/src/api/google-shared.ts:98][E: packages/ai/src/api/bedrock-converse-stream.ts:739][E: packages/ai/src/api/mistral-conversations.ts:71]

## 关键文件

- `packages/ai/src/api/transform-messages.ts`:定义 non-vision image placeholder、图片降级 helper、`transformMessages` 两段处理流程、tool call id map 与合成 toolResult 插入逻辑。[E: packages/ai/src/api/transform-messages.ts:12][E: packages/ai/src/api/transform-messages.ts:13][E: packages/ai/src/api/transform-messages.ts:15][E: packages/ai/src/api/transform-messages.ts:35][E: packages/ai/src/api/transform-messages.ts:64][E: packages/ai/src/api/transform-messages.ts:70][E: packages/ai/src/api/transform-messages.ts:157]

## 数据模型

`Message` 在本函数里按 `role` 分为 user、assistant、toolResult 三类处理:第一段 map 对 user 直接返回,对 toolResult 只可能重写 `toolCallId`,对 assistant 遍历 `content` blocks;第二段再按 role 处理 assistant/toolResult/user 的工具调用连续性。[E: packages/ai/src/api/transform-messages.ts:76][E: packages/ai/src/api/transform-messages.ts:77][E: packages/ai/src/api/transform-messages.ts:81][E: packages/ai/src/api/transform-messages.ts:82][E: packages/ai/src/api/transform-messages.ts:90][E: packages/ai/src/api/transform-messages.ts:97][E: packages/ai/src/api/transform-messages.ts:182][E: packages/ai/src/api/transform-messages.ts:204][E: packages/ai/src/api/transform-messages.ts:207]

user content 的字符串形态不被本函数改写;只有当 user `content` 是 content part array 时,`downgradeUnsupportedImages` 才会处理其中的 image blocks。[E: packages/ai/src/api/transform-messages.ts:40][E: packages/ai/src/api/transform-messages.ts:41][E: packages/ai/src/api/transform-messages.ts:44]

toolResult content 在类型上也被当作 content part array 处理;目标模型不支持 image input 时,toolResult 的 image blocks 会被替换为 tool 专用文本 placeholder。[E: packages/ai/src/api/transform-messages.ts:48][E: packages/ai/src/api/transform-messages.ts:51]

assistant content part 的显式处理分支是 `thinking`、`text`、`toolCall`;其它 block 类型如果未来出现在 assistant content 中,当前函数会落到默认 `return block` 路径。[E: packages/ai/src/api/transform-messages.ts:97][E: packages/ai/src/api/transform-messages.ts:98][E: packages/ai/src/api/transform-messages.ts:116][E: packages/ai/src/api/transform-messages.ts:124][E: packages/ai/src/api/transform-messages.ts:144]

## 控制流

1. `downgradeUnsupportedImages@packages/ai/src/api/transform-messages.ts:35` 先检查 `model.input.includes("image")`;支持 image 的模型直接返回原 messages,不支持 image 的模型才遍历消息降级图片。[E: packages/ai/src/api/transform-messages.ts:35][E: packages/ai/src/api/transform-messages.ts:36][E: packages/ai/src/api/transform-messages.ts:37][E: packages/ai/src/api/transform-messages.ts:40]
2. `replaceImagesWithPlaceholder@packages/ai/src/api/transform-messages.ts:15` 把 image block 替换成 `{ type: "text", text: placeholder }`,并用 `previousWasPlaceholder` 折叠连续图片,避免同一段连续图片生成多个相同 placeholder。[E: packages/ai/src/api/transform-messages.ts:15][E: packages/ai/src/api/transform-messages.ts:17][E: packages/ai/src/api/transform-messages.ts:20][E: packages/ai/src/api/transform-messages.ts:21][E: packages/ai/src/api/transform-messages.ts:22][E: packages/ai/src/api/transform-messages.ts:24][E: packages/ai/src/api/transform-messages.ts:29]
3. `transformMessages@packages/ai/src/api/transform-messages.ts:64` 建立 `toolCallIdMap`,再对 image-aware messages 做第一段 map;这个 map 同时负责 thinking replay、tool call id normalization 和 toolResult id rewrite。[E: packages/ai/src/api/transform-messages.ts:70][E: packages/ai/src/api/transform-messages.ts:71][E: packages/ai/src/api/transform-messages.ts:74][E: packages/ai/src/api/transform-messages.ts:82][E: packages/ai/src/api/transform-messages.ts:84]
4. assistant 消息用 `provider`、`api`、`model` 三个字段判断是否来自同一个目标模型;这个布尔值决定 thinking/text/toolCall 元数据是否可保留。[E: packages/ai/src/api/transform-messages.ts:92][E: packages/ai/src/api/transform-messages.ts:93][E: packages/ai/src/api/transform-messages.ts:94][E: packages/ai/src/api/transform-messages.ts:95]
5. thinking block 如果是 redacted,只有同模型 replay 才保留,跨模型 replay 直接丢弃;非 redacted 且没有同模型 `thinkingSignature` 豁免的空 thinking 会丢弃,同模型可保留 thinking block,跨模型会把非空 thinking 转成 text block。[E: packages/ai/src/api/transform-messages.ts:98][E: packages/ai/src/api/transform-messages.ts:101][E: packages/ai/src/api/transform-messages.ts:102][E: packages/ai/src/api/transform-messages.ts:106][E: packages/ai/src/api/transform-messages.ts:108][E: packages/ai/src/api/transform-messages.ts:109][E: packages/ai/src/api/transform-messages.ts:110][E: packages/ai/src/api/transform-messages.ts:112]
6. text block 同模型 replay 原样保留;跨模型 replay 只保留 `type: "text"` 和 `text`,因此会丢掉 text block 上的额外 metadata。[E: packages/ai/src/api/transform-messages.ts:116][E: packages/ai/src/api/transform-messages.ts:117][E: packages/ai/src/api/transform-messages.ts:118][E: packages/ai/src/api/transform-messages.ts:120]
7. toolCall block 跨模型 replay 时会删除 `thoughtSignature` metadata;如果提供了 `normalizeToolCallId`,还会把旧 id 映射到新 id 并写回 toolCall。[E: packages/ai/src/api/transform-messages.ts:124][E: packages/ai/src/api/transform-messages.ts:128][E: packages/ai/src/api/transform-messages.ts:130][E: packages/ai/src/api/transform-messages.ts:133][E: packages/ai/src/api/transform-messages.ts:134][E: packages/ai/src/api/transform-messages.ts:136][E: packages/ai/src/api/transform-messages.ts:137]
8. 后续 toolResult 如果命中 `toolCallIdMap`,会用同一个 normalized id 替换 `toolCallId`,保持 assistant toolCall 与 toolResult 的引用一致。[E: packages/ai/src/api/transform-messages.ts:81][E: packages/ai/src/api/transform-messages.ts:82][E: packages/ai/src/api/transform-messages.ts:83][E: packages/ai/src/api/transform-messages.ts:84]
9. 第二段遍历会跳过 `stopReason` 为 `"error"` 或 `"aborted"` 的 assistant 消息,因为这些 turn 被视为不应 replay 的不完整 assistant 输出。[E: packages/ai/src/api/transform-messages.ts:191][E: packages/ai/src/api/transform-messages.ts:192][E: packages/ai/src/api/transform-messages.ts:193]
10. 第二段还会记录 assistant toolCall,收集后续 toolResult id;当下一个 assistant、user 或对话结尾到来时,缺失结果的 pending toolCall 会被补成 `isError: true`、文本为 `"No result provided"` 的 synthetic toolResult。[E: packages/ai/src/api/transform-messages.ts:157][E: packages/ai/src/api/transform-messages.ts:160][E: packages/ai/src/api/transform-messages.ts:163][E: packages/ai/src/api/transform-messages.ts:164][E: packages/ai/src/api/transform-messages.ts:168][E: packages/ai/src/api/transform-messages.ts:169][E: packages/ai/src/api/transform-messages.ts:170][E: packages/ai/src/api/transform-messages.ts:184][E: packages/ai/src/api/transform-messages.ts:197][E: packages/ai/src/api/transform-messages.ts:199][E: packages/ai/src/api/transform-messages.ts:205][E: packages/ai/src/api/transform-messages.ts:209][E: packages/ai/src/api/transform-messages.ts:217]

## 设计动机与权衡

图片降级发生在通用 message 层,这样 provider-specific serializers 可以继续按 text/image content part 写转换逻辑;非 vision target 看到的是显式 placeholder 文本,而不是静默丢图。[E: packages/ai/src/api/transform-messages.ts:12][E: packages/ai/src/api/transform-messages.ts:13][E: packages/ai/src/api/transform-messages.ts:22][E: packages/ai/src/api/transform-messages.ts:44][E: packages/ai/src/api/transform-messages.ts:51][I]

thinking replay 的规则偏向同模型保留 provider-private continuity metadata,跨模型则降级为可读文本或丢弃 opaque/redacted 内容;这避免把某个 provider/model 的不可移植签名传给另一个模型。[E: packages/ai/src/api/transform-messages.ts:92][E: packages/ai/src/api/transform-messages.ts:101][E: packages/ai/src/api/transform-messages.ts:102][E: packages/ai/src/api/transform-messages.ts:106][E: packages/ai/src/api/transform-messages.ts:110][I]

tool call id normalization 由 caller 注入,因为各 wire API 的 id 规则不同;本函数只保证 assistant toolCall 与 toolResult 使用同一映射。[E: packages/ai/src/api/transform-messages.ts:67][E: packages/ai/src/api/transform-messages.ts:133][E: packages/ai/src/api/transform-messages.ts:136][E: packages/ai/src/api/transform-messages.ts:137][E: packages/ai/src/api/transform-messages.ts:82][E: packages/ai/src/api/transform-messages.ts:84][I]

合成 toolResult 的权衡是优先满足 provider replay 对 tool-use adjacency/completeness 的要求,即使真实工具结果缺失也用 error toolResult 显式闭合 pending toolCall。[E: packages/ai/src/api/transform-messages.ts:157][E: packages/ai/src/api/transform-messages.ts:160][E: packages/ai/src/api/transform-messages.ts:163][E: packages/ai/src/api/transform-messages.ts:164][E: packages/ai/src/api/transform-messages.ts:168][E: packages/ai/src/api/transform-messages.ts:169][I]

## gotcha

`transformMessages` 不会把 user string content 转成 text content part array;这种 wire shape 转换留给 provider serializer,例如 OpenAI Responses 的 `convertResponsesMessages` 在遍历 transformed messages 后才把 user string 转成 `input_text`。[E: packages/ai/src/api/transform-messages.ts:76][E: packages/ai/src/api/transform-messages.ts:77][E: packages/ai/src/api/openai-responses-shared.ts:136][E: packages/ai/src/api/openai-responses-shared.ts:138][E: packages/ai/src/api/openai-responses-shared.ts:141]

合成 toolResult 的 `timestamp` 使用 `Date.now()`,所以 `transformMessages` 不是纯粹的结构性 map;如果输入有 orphaned toolCall,输出会包含调用时刻生成的新时间戳。[E: packages/ai/src/api/transform-messages.ts:170]

同模型判定要求 provider、api、model 三者都相等;只换同 provider 的 model id 也会进入跨模型降级路径。[E: packages/ai/src/api/transform-messages.ts:92][E: packages/ai/src/api/transform-messages.ts:93][E: packages/ai/src/api/transform-messages.ts:94][E: packages/ai/src/api/transform-messages.ts:95]

## 跨包边界

`subsys.ai.wire-protocol-dispatch` 覆盖 `Model.api` 如何选择 `ProviderStreams` implementation;本节点只覆盖已经进入 provider-specific serializer 后、wire payload 构造前的 message normalization。[E: packages/ai/src/api/openai-responses-shared.ts:123][E: packages/ai/src/api/openai-completions.ts:870][I]

`ref.ai.core-types` 应覆盖 `Message`、`AssistantMessage`、`ToolResultMessage`、`TextContent`、`ImageContent`、`ThinkingContent`、`ToolCall` 和 `Model` 的字段级定义;本节点只描述这些类型在 `transformMessages` 中被读取或改写的行为。[E: packages/ai/src/api/transform-messages.ts:1][E: packages/ai/src/api/transform-messages.ts:10][I]

## Sources

- packages/ai/src/api/transform-messages.ts
- packages/ai/src/api/openai-responses-shared.ts
- packages/ai/src/api/openai-completions.ts
- packages/ai/src/api/anthropic-messages.ts
- packages/ai/src/api/google-shared.ts
- packages/ai/src/api/bedrock-converse-stream.ts
- packages/ai/src/api/mistral-conversations.ts

## 相关

- [subsys.ai.wire-protocol-dispatch](wire-protocol-dispatch.md) - `Model.api` 到 provider wire implementation 的 dispatch 层。
- [ref.ai.core-types](../../reference/core-types.md) - `Message`、content part、`Model` 与 stream 相关核心类型的字段级定义。
