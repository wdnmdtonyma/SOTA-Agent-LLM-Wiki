---
id: subsys.ai.openai-responses
title: OpenAI Responses 协议
kind: subsystem
tier: T2
pkg: ai
source:
 - packages/ai/src/api/openai-responses.ts
 - packages/ai/src/api/openai-responses-shared.ts
 - packages/ai/src/utils/transcript.ts
 - packages/ai/src/api/constrained-sampling.ts
 - packages/ai/src/api/simple-options.ts
 - packages/ai/src/types.ts
 - packages/ai/src/models.ts
 - packages/ai/src/api/openai-codex-responses.ts
 - packages/ai/src/utils/pi-user-agent.ts
 - packages/ai/src/providers/xai.ts
 - packages/ai/scripts/generate-models.ts
 - packages/ai/test/openai-responses-namespace.test.ts
 - packages/ai/test/transcript-tool-changes.test.ts
symbols:
 - stream
 - OpenAIResponsesOptions
 - convertResponsesTools
 - resolveTranscriptTools
related:
 - subsys.ai.wire-protocol-dispatch
 - subsys.ai.openai-completions
evidence: explicit
status: verified
updated: ff72faba28
---

> `subsys.ai.openai-responses` 描述 `pi-ai` 的 OpenAI Responses API wire 入口:把统一 `Model + TranscriptContext + StreamOptions` 转成 `client.responses.create(...stream: true)`,再把 Responses stream events 归一成 `AssistantMessageEventStream`。已删除的 `deferred-tools.ts` 不再参与本 adapter。

## 能回答的问题

- `openai-responses` 的 `stream` 如何建立 OpenAI client、请求 payload 和 normalized assistant stream?
- `OpenAIResponsesOptions` 支持哪些 Responses 专属请求字段?
- transcript system messages、tool definitions、tool results 如何转换为 Responses `input` / `tools`?
- `supportsToolSearch` 怎样用 `tool_search_call` / `tool_search_output` 做 prefix deferral?
- `samplingParams` 是否在 direct `stream`/`complete`(不只 `streamSimple`)生效?
- Responses 的 reasoning/text/tool-call/usage event 如何映射回 `AssistantMessage` 内容块和事件?
- `openai-responses.ts` 与 `openai-responses-shared.ts` 的边界在哪里?
- tool-call `namespace` 何时 round-trip、何时在 replay 时丢弃?
- 维护 OpenAI Responses wire 协议时有哪些容易踩到的 id、cache、reasoning、pricing gotcha?

## 职责边界

`packages/ai/src/api/openai-responses.ts` 是 OpenAI Responses 的顶层 wire implementation:它导出 `OpenAIResponsesOptions`、`stream`、`streamSimple`。`stream` 接收 `TranscriptContext`,先创建 `AssistantMessageEventStream`,再 `resolveTranscript(context, supportsMidConvoSystemMessages)`,构造 OpenAI SDK client,组装 `ResponseCreateParamsStreaming`,调用 `client.responses.create(params, requestOptions).withResponse()`,并在成功时 push `start` / `done`,失败时 push `error`。[E: packages/ai/src/api/openai-responses.ts:113] [E: packages/ai/src/api/openai-responses.ts:115] [E: packages/ai/src/api/openai-responses.ts:118] [E: packages/ai/src/api/openai-responses.ts:119] [E: packages/ai/src/api/openai-responses.ts:170] [E: packages/ai/src/api/openai-responses.ts:178]

`packages/ai/src/api/openai-responses-shared.ts` 是 Responses-family 的 reusable conversion/streaming layer:顶层文件从 shared 导入 `convertResponsesMessages`、`convertResponsesTools`、`processResponsesStream`。[E: packages/ai/src/api/openai-responses.ts:28] [E: packages/ai/src/api/openai-responses.ts:180] [E: packages/ai/src/api/openai-responses-shared.ts:145] [E: packages/ai/src/api/openai-responses-shared.ts:361] [E: packages/ai/src/api/openai-responses-shared.ts:434]

公开 `Models.stream` / `complete` 仍接受 `Context`;它们在 dispatch 前 `normalizeContext()`,本 adapter 只看见 `TranscriptContext`。[E: packages/ai/src/models.ts:865] [E: packages/ai/src/models.ts:870] [E: packages/ai/src/models.ts:886] [E: packages/ai/src/utils/transcript.ts:30]

## 关键文件

- `packages/ai/src/api/openai-responses.ts`: OpenAI SDK client、headers/session id/cache retention、Responses request fields、`samplingParams` merge、service tier pricing multiplier、`streamSimple` reasoning clamp。[E: packages/ai/src/api/openai-responses.ts:68] [E: packages/ai/src/api/openai-responses.ts:240] [E: packages/ai/src/api/openai-responses.ts:284] [E: packages/ai/src/api/openai-responses.ts:364] [E: packages/ai/src/api/openai-responses.ts:220]
- `packages/ai/src/api/openai-responses-shared.ts`: unified messages/tools 到 Responses shape 的转换,含 `supportsToolSearch` 的 `tool_search_*` items;Responses stream event 到 `thinking_*` / `text_*` / `toolcall_*` / usage / stop reason 的转换。[E: packages/ai/src/api/openai-responses-shared.ts:145] [E: packages/ai/src/api/openai-responses-shared.ts:195] [E: packages/ai/src/api/openai-responses-shared.ts:361] [E: packages/ai/src/api/openai-responses-shared.ts:434]

## 数据模型

`OpenAIResponsesOptions` 扩展统一 `StreamOptions`,新增 `reasoningEffort`、`reasoningSummary`、`serviceTier` 与 `toolChoice`;`reasoningEffort` 允许 `minimal | low | medium | high | xhigh | max`,`reasoningSummary` 允许 `auto | detailed | concise | null`,`serviceTier` 与 `toolChoice` 直接沿用 OpenAI SDK request 类型。`samplingParams` 继承自 `StreamOptions`。[E: packages/ai/src/api/openai-responses.ts:103] [E: packages/ai/src/api/openai-responses.ts:104] [E: packages/ai/src/api/openai-responses.ts:105] [E: packages/ai/src/api/openai-responses.ts:106] [E: packages/ai/src/types.ts:207]

`stream` 初始化的 `AssistantMessage` 会记录 assistant role、空 content、`api`、provider、model、零值 usage/cost、`stopReason: "pending"` 和 timestamp。[E: packages/ai/src/api/openai-responses.ts:123] [E: packages/ai/src/api/openai-responses.ts:137]

`getCompat` 默认 `supportsAdditionalTools: false`、`supportsToolSearch: false`、`supportsStrictMode: false`;catalog 对验证过的 OpenAI / Codex 模型打开 `supportsToolSearch`。[E: packages/ai/src/api/openai-responses.ts:74] [E: packages/ai/src/api/openai-responses.ts:76] [E: packages/ai/src/api/openai-responses.ts:77] [E: packages/ai/src/types.ts:850] [E: packages/ai/scripts/generate-models.ts:877] [E: packages/ai/scripts/generate-models.ts:887]

## Tool search 与 prefix deferral

本 adapter **不再**调用 `splitDeferredTools()`。工具拆分改由 `resolveTranscriptTools(messages, supportsAdditionalTools || supportsToolSearch)`:能锚定 additions 且没有 removal/redeclare 时,`requestTools` 只含 leading system 的 `toolsAdded`;later `toolsAdded` 作为 in-place additions。否则 `requestTools` 就是 `getCurrentTools()` 的完整当前集。[E: packages/ai/src/api/openai-responses.ts:294] [E: packages/ai/src/api/openai-responses.ts:296] [E: packages/ai/src/utils/transcript.ts:226] [E: packages/ai/src/utils/transcript.ts:229]

`convertResponsesMessages` 对 later system message 的 additions:`supportsAdditionalTools` 优先发 Responses `additional_tools` developer item;`supportsToolSearch` 才发 completed `tool_search_call` + `tool_search_output`。`tool_search_output.tools` 经 `convertResponsesTools(..., { toolSearchResult: true })` 带上 `defer_loading: true`,这是 **prefix deferral** 路径:later tools 不进 top-level `tools`,而是作为 search result 挂在 transcript 上,保留 cached prefix。[E: packages/ai/src/api/openai-responses-shared.ts:184] [E: packages/ai/src/api/openai-responses-shared.ts:187] [E: packages/ai/src/api/openai-responses-shared.ts:195] [E: packages/ai/src/api/openai-responses-shared.ts:199] [E: packages/ai/src/api/openai-responses-shared.ts:206] [E: packages/ai/src/api/openai-responses-shared.ts:210] [E: packages/ai/src/api/openai-responses-shared.ts:378] [E: packages/ai/src/api/openai-responses-shared.ts:391] [E: packages/ai/test/transcript-tool-changes.test.ts:237]

immediate `requestTools` 仍写入 request 顶层 `tools`。[E: packages/ai/src/api/openai-responses.ts:334] [E: packages/ai/src/api/openai-responses.ts:335]

## `samplingParams` 在 direct stream/complete 生效

`buildParams` 在 named fields 之后 `Object.assign(params, model.samplingParams, options?.samplingParams)`,因此 per-request keys 覆盖 model defaults,二者都覆盖前面的 `temperature` / `max_output_tokens` 等 named fields。`buildParams` 由 `stream()` 直接调用,`Models.complete()` 只是 `stream().result()`,所以 **direct stream/complete 都会 merge**,不依赖 `streamSimple`。[E: packages/ai/src/api/openai-responses.ts:159] [E: packages/ai/src/api/openai-responses.ts:364] [E: packages/ai/src/models.ts:886] [E: packages/ai/src/types.ts:207]

`streamSimple` 经 `buildBaseOptions` 把 `SimpleStreamOptions.samplingParams` 拷进 `StreamOptions`,再交给 `stream` → `buildParams`,路径相同。[E: packages/ai/src/api/openai-responses.ts:227] [E: packages/ai/src/api/simple-options.ts:29]

`StreamOptions.samplingParams` 是任意 record;本 adapter 在 `buildParams` 末尾 merge,Azure Responses 与 Completions 同样 `Object.assign`。Codex Responses 的 `buildRequestBody` 不 merge 该字段。[E: packages/ai/src/types.ts:207] [E: packages/ai/src/api/openai-responses.ts:364] [I]

## 控制流

1. `stream@openai-responses.ts` 同步返回 `AssistantMessageEventStream`,并在内部 async IIFE 里创建 output 聚合对象。[E: packages/ai/src/api/openai-responses.ts:113] [E: packages/ai/src/api/openai-responses.ts:118] [E: packages/ai/src/api/openai-responses.ts:122]
2. `getClientApiKey@openai-responses.ts` 接受显式 `apiKey`;如果没有 apiKey 但 headers 里已有 `authorization` 或 `cf-aig-authorization`,返回 `"unused"` 作为 SDK apiKey placeholder;否则抛出 provider-specific missing key error。[E: packages/ai/src/api/openai-responses.ts:44] [E: packages/ai/src/api/openai-responses.ts:45] [E: packages/ai/src/api/openai-responses.ts:46] [E: packages/ai/src/api/openai-responses.ts:47]
3. `createClient@openai-responses.ts` 以 `model.baseUrl`、resolved apiKey 和 merged headers 创建 OpenAI SDK client；默认先写 `User-Agent: getPiUserAgent()`，再 overlay `model.headers`。session id 按 `sessionAffinityFormat` 分支。`xai` provider 只挂这条 Responses API。[E: packages/ai/src/api/openai-responses.ts:248] [E: packages/ai/src/utils/pi-user-agent.ts:17] [E: packages/ai/src/providers/xai.ts:7] [E: packages/ai/src/providers/xai.ts:22]
4. `buildParams@openai-responses.ts` 先用 `convertResponsesMessages` 构造 Responses `input`,再创建基础 payload:`model`、`input`、`stream: true`、`prompt_cache_key`、`prompt_cache_retention`、`store: false`;随后按 options/context/model 条件追加 `max_output_tokens`、`temperature`、`service_tier`、`tools`、`reasoning` 和 `include`;最后 merge `samplingParams`。[E: packages/ai/src/api/openai-responses.ts:284] [E: packages/ai/src/api/openai-responses.ts:298] [E: packages/ai/src/api/openai-responses.ts:313] [E: packages/ai/src/api/openai-responses.ts:364]
5. `stream@openai-responses.ts` 在发送前允许 `options.onPayload` 替换整个 payload;HTTP response 返回后调用 `options.onResponse`,然后才 push normalized `start` event。`processResponsesStream` 对每个 Responses event 先 `await onProviderStreamEvent?.(event, model)`。[E: packages/ai/src/api/openai-responses.ts:160] [E: packages/ai/src/api/openai-responses.ts:177] [E: packages/ai/src/api/openai-responses.ts:178] [E: packages/ai/src/api/openai-responses.ts:181] [E: packages/ai/src/api/openai-responses-shared.ts:601]
6. `processResponsesStream` 消费 OpenAI `AsyncIterable<ResponseStreamEvent>`;缺少 `response.completed` 或 `response.incomplete` 终端事件时会抛错。[E: packages/ai/src/api/openai-responses-shared.ts:434] [E: packages/ai/src/api/openai-responses-shared.ts:761] [E: packages/ai/src/api/openai-responses-shared.ts:762]

## 请求字段转换

`convertResponsesMessages` 先 `resolveTranscript`,再 `transformMessages(normalizedContext.messages, model, normalizeToolCallId)`。当 model 是 reasoning model 且 compat 没禁用 developer role 时使用 `developer`,否则使用 `system`。leading system 的文本来自 `getSystemMessageText`,不是 `context.systemPrompt`。[E: packages/ai/src/api/openai-responses-shared.ts:151] [E: packages/ai/src/api/openai-responses-shared.ts:179] [E: packages/ai/src/api/openai-responses-shared.ts:215] [E: packages/ai/src/api/openai-responses-shared.ts:224]

用户消息的 string content 转成一个 `input_text` content part;多模态 user content 中 text block 转 `input_text`,image block 转 `input_image` 且使用 `data:<mime>;base64,<data>` URL,空 content 会跳过。[E: packages/ai/src/api/openai-responses-shared.ts:230] [E: packages/ai/src/api/openai-responses-shared.ts:237] [E: packages/ai/src/api/openai-responses-shared.ts:243] [E: packages/ai/src/api/openai-responses-shared.ts:249]

历史 assistant 消息会把 `thinkingSignature` 反序列化回 Responses `reasoning` item,把 text block 包成 completed Responses `message`,把 tool call block 包成 Responses `function_call` 或 grammar `custom_tool_call`。replay 时 `namespace` **只在同 model**(`isSameModel`)时写回;换 model / 换 provider / 换 API 会丢掉 namespace。已删除的 deferred-tools map 不再参与 namespace 判定。[E: packages/ai/src/api/openai-responses-shared.ts:258] [E: packages/ai/src/api/openai-responses-shared.ts:259] [E: packages/ai/src/api/openai-responses-shared.ts:317] [E: packages/ai/src/api/openai-responses-shared.ts:326]

tool definition 转换保持每个 tool 的 `name`、`description` 与 JSON schema `parameters`。`strict` 先看 `resolveJsonSchemaStrictSampling()`,再回落到 `options.strict`(未传则为 `false`);`supportsStrictMode` 为真时才把 `strict` 写到 function tool。`getCompat` 默认 `supportsStrictMode: false`。[E: packages/ai/src/api/openai-responses-shared.ts:362] [E: packages/ai/src/api/openai-responses-shared.ts:382] [E: packages/ai/src/api/openai-responses-shared.ts:393] [E: packages/ai/src/api/openai-responses.ts:74]

## event 与 usage 转换

`response.output_item.added` 会按 item type 建立 slot 并 push start event:`reasoning` -> `thinking_start`,`message` -> `text_start`,`function_call` / `custom_tool_call` -> `toolcall_start`;function/custom call block 的 id 组合为 `${call_id}|${item.id}`。若 item 带 `namespace`,slot 会立刻写到内部 `ToolCall.namespace`。[E: packages/ai/src/api/openai-responses-shared.ts:488] [E: packages/ai/src/api/openai-responses-shared.ts:490] [E: packages/ai/src/api/openai-responses-shared.ts:493] [E: packages/ai/src/types.ts:417]

`response.output_item.done` finalize 会再次把 `item.namespace` 写回 block,测试锁定了这条 late-arrival round-trip。[E: packages/ai/src/api/openai-responses-shared.ts:718] [E: packages/ai/src/api/openai-responses-shared.ts:734]

`response.completed` 或 `response.incomplete` 进入 `finalizeResponse`:保存 response id,从 `input_tokens` 同时扣 cached/cache-write tokens,写 output/reasoning/totalTokens,调用 `calculateCost`,可选按 service tier 调整 cost,再把 response status 映射为 stop reason;如果 content 中有 toolCall 且 stop reason 仍是 `stop`,最终 stop reason 改为 `toolUse`。[E: packages/ai/src/api/openai-responses-shared.ts:595] [E: packages/ai/src/api/openai-responses-shared.ts:596] [E: packages/ai/src/api/openai-responses-shared.ts:744]

## reasoning、cache、service tier

`streamSimple` 先经 `buildBaseOptions` 生成统一基础 options,再用 `clampThinkingLevel` 把 caller 的 `reasoning` 收窄到目标 model 能力;当 clamp 结果是 `off` 时不传 `reasoningEffort`,否则把 clamped level 传给 `stream`。[E: packages/ai/src/api/openai-responses.ts:220] [E: packages/ai/src/api/openai-responses.ts:231] [E: packages/ai/src/api/openai-responses.ts:232]

`buildParams` 只在 `model.reasoning` 为真时写 Responses `reasoning`;truthy 的 `reasoningEffort` 或 `reasoningSummary` 会设置 effort、summary,并请求 `include: ["reasoning.encrypted_content"]`。[E: packages/ai/src/api/openai-responses.ts:345] [E: packages/ai/src/api/openai-responses.ts:346] [E: packages/ai/src/api/openai-responses.ts:354]

cache retention 默认值由 `resolveCacheRetention` 决定:显式 `cacheRetention` 优先,否则 `PI_CACHE_RETENTION=long` 时为 `long`,其余为 `short`;`cacheRetention === "none"` 会同时禁用 request 的 `prompt_cache_key` 与 client session id forwarding。[E: packages/ai/src/api/openai-responses.ts:58] [E: packages/ai/src/api/openai-responses.ts:65] [E: packages/ai/src/api/openai-responses.ts:145] [E: packages/ai/src/api/openai-responses.ts:316]

service tier 既进入 request payload 的 `service_tier`,也进入 post-usage pricing adjustment;本地实现把 `flex` cost 乘 `0.5`,`priority` 对 `gpt-5.5` 乘 `2.5`,其它 priority 乘 `2`,默认乘 `1`。[E: packages/ai/src/api/openai-responses.ts:330] [E: packages/ai/src/api/openai-responses.ts:373] [E: packages/ai/src/api/openai-responses.ts:376] [E: packages/ai/src/api/openai-responses.ts:377]

## 设计动机与 gotcha

- Responses tool-call id 在本 subsystem 内是 `call_id|item_id` 复合 id;`convertResponsesMessages` 会 sanitize 每一段,对 foreign Responses item id 使用 `fc_${shortHash(itemId)}`,并强制 item id 以 `fc_` 开头。[E: packages/ai/src/api/openai-responses-shared.ts:154] [E: packages/ai/src/api/openai-responses-shared.ts:160] [E: packages/ai/src/api/openai-responses-shared.ts:173]
- `ToolCall.namespace` 是 Responses dynamically loaded / namespaced tool 的可选字段。stream 在 `added` 与 `done` 都会复制它；replay 只在 `isSameModel` 时写回。[E: packages/ai/src/types.ts:417] [E: packages/ai/src/api/openai-responses-shared.ts:259] [E: packages/ai/src/api/openai-responses-shared.ts:317] [E: packages/ai/src/api/openai-responses-shared.ts:493] [E: packages/ai/src/api/openai-responses-shared.ts:718]
- `AssistantMessage.endTurn` 保存 provider 是否显式结束 turn。标准 `processResponsesStream` 不写该字段；Codex adapter 在 terminal events 上若看到 boolean `end_turn` 才赋给 `output.endTurn`。agent 控制流当前不读它。[E: packages/ai/src/types.ts:559] [I]
- `partialJson` 是 streaming scratch buffer,正常 function-call finalization 和 error cleanup 都会删除它;持久化 assistant content 时不应依赖该字段。[E: packages/ai/src/api/openai-responses-shared.ts:494] [E: packages/ai/src/api/openai-responses-shared.ts:721]
- service tier cost multiplier 是本地硬编码策略,不是从 OpenAI response 动态读取价格表。[E: packages/ai/src/api/openai-responses.ts:369] [U]
- OpenAI client factory 接受 `options.fetch` 并传给 SDK。[E: packages/ai/src/api/openai-responses.ts:156] [E: packages/ai/src/api/openai-responses.ts:279]

## 跨包边界

`subsys.ai.wire-protocol-dispatch` 覆盖 `model.api` 如何选择 `api/<name>.ts` 的 `ProviderStreams`;本节点只从 `stream` / `streamSimple` 开始描述已经命中 `openai-responses` wire module 后的 payload 和 event conversion。[I]

`subsys.ai.openai-completions` 覆盖 Chat Completions wire 协议;Responses payload 使用 `input` 和 Responses `tools`,Completions payload 使用 chat `messages` 和 chat `tools`。[I]

## Sources

- packages/ai/src/api/openai-responses.ts
- packages/ai/src/api/openai-responses-shared.ts
- packages/ai/src/utils/transcript.ts
- packages/ai/src/api/constrained-sampling.ts
- packages/ai/src/types.ts
- packages/ai/src/api/openai-codex-responses.ts
- packages/ai/src/api/simple-options.ts
- packages/ai/src/models.ts
- packages/ai/src/utils/pi-user-agent.ts
- packages/ai/src/providers/xai.ts
- packages/ai/scripts/generate-models.ts
- packages/ai/test/openai-responses-namespace.test.ts
- packages/ai/test/transcript-tool-changes.test.ts

## 相关

- [subsys.ai.wire-protocol-dispatch](wire-protocol-dispatch.md) - `model.api` 到 provider wire implementation 的 dispatch 边界。
- [subsys.ai.openai-completions](openai-completions.md) - Chat Completions wire 协议和 Responses 协议的 sibling implementation。
