---
id: session-v2.message-lowering
title: 投影消息→provider 消息 lowering
kind: subsystem
tier: T2
v: v2
source: [packages/core/src/session/runner/to-llm-message.ts, packages/core/src/session/message.ts, packages/core/src/session/runner/llm.ts, packages/core/src/session/history.ts, specs/v2/session.md, CONTEXT.md]
symbols: [toLLMMessages, toLLMMessage, assistant, toolCall, toolResult]
related: [spine.v2-provider-turn, model-layer.llm-schema]
evidence: explicit
status: verified
updated: 355a0bcf5
---

> Message lowering 把 projected V2 `SessionMessage.Message[]` 转成 canonical `@opencode-ai/llm Message[]`,并在同 provider/model continuation 时保留 provider-native reasoning 与 hosted tool metadata。

## 能回答的问题
- `SessionMessage.User/System/Shell/Compaction` 分别变成哪种 provider message?
- assistant tool call 与 tool result 为什么可能拆成多条 messages?
- model switch 后 reasoning/provider metadata 为什么不再 replay?
- provider-executed hosted tool 与 local tool 的 result replay 差异是什么?
- prompt file attachments 如何 lower 成 media parts?

## 职责边界

`toLLMMessages` 只做 projected history 到 LLM schema 的 lowering;history selection、tool materialization 和 request assembly 都在 runner 中完成,selected protocol adapter owns provider wire encoding。[E: packages/core/src/session/runner/to-llm-message.ts:149][E: packages/core/src/session/runner/llm.ts:215][E: packages/core/src/session/runner/llm.ts:217][E: packages/core/src/session/runner/llm.ts:219][E: CONTEXT.md:103][I] provider request assembly 在 runner 中把 `toLLMMessages(context, model)` 放入 `LLM.request` 的 `messages` 字段。[E: packages/core/src/session/runner/llm.ts:219][E: packages/core/src/session/runner/llm.ts:225] `CONTEXT.md` 把 Session History 定义为 projected chronological conversation after compaction and Context Epoch cutoffs;runner 从 `SessionHistory.entriesForRunner` 取 entries,映射成 context,再调用 `toLLMMessages(context, model)`。[E: CONTEXT.md:12][E: packages/core/src/session/runner/llm.ts:215][E: packages/core/src/session/runner/llm.ts:216][E: packages/core/src/session/runner/llm.ts:225]

## 输入输出表

| 输入 variant | 输出 |
|---|---|
| `agent-switched` / `model-switched` | 不输出 provider message。[E: packages/core/src/session/runner/to-llm-message.ts:95][E: packages/core/src/session/runner/to-llm-message.ts:96][E: packages/core/src/session/runner/to-llm-message.ts:97] |
| `user` | one user message,content 是 text plus file media parts。[E: packages/core/src/session/runner/to-llm-message.ts:98][E: packages/core/src/session/runner/to-llm-message.ts:100][E: packages/core/src/session/runner/to-llm-message.ts:102][E: packages/core/src/session/runner/to-llm-message.ts:103] |
| `synthetic` | one user message,string content。[E: packages/core/src/session/runner/to-llm-message.ts:110][E: packages/core/src/session/runner/to-llm-message.ts:111] |
| `system` | one system message。[E: packages/core/src/session/runner/to-llm-message.ts:113] |
| `shell` | one user message containing shell command and output。[E: packages/core/src/session/runner/to-llm-message.ts:114][E: packages/core/src/session/runner/to-llm-message.ts:118][E: packages/core/src/session/runner/to-llm-message.ts:119] |
| `assistant` | one assistant message plus zero or more tool-result messages。[E: packages/core/src/session/runner/to-llm-message.ts:123][E: packages/core/src/session/runner/to-llm-message.ts:90] |
| `compaction` | one user message with `<conversation-checkpoint>` wrapper。[E: packages/core/src/session/runner/to-llm-message.ts:129][E: packages/core/src/session/runner/to-llm-message.ts:130][E: packages/core/src/session/runner/to-llm-message.ts:131] |

`toLLMMessages` 对 input array 做 `flatMap`,而 `assistant(...)` 返回 `[assistant, ...results]`,所以一个 projected assistant message 可以 lowering 成多条 LLM messages。[E: packages/core/src/session/runner/to-llm-message.ts:85][E: packages/core/src/session/runner/to-llm-message.ts:86][E: packages/core/src/session/runner/to-llm-message.ts:89][E: packages/core/src/session/runner/to-llm-message.ts:90][E: packages/core/src/session/runner/to-llm-message.ts:149]

## 控制流

1. `media@packages/core/src/session/runner/to-llm-message.ts:13` 把 prompt `FileAttachment` 变成 LLM `ContentPart` media,字段包括 `type: "media"`、`mediaType`、`data`、`filename` 和 optional description metadata。[E: packages/core/src/session/runner/to-llm-message.ts:14][E: packages/core/src/session/runner/to-llm-message.ts:15][E: packages/core/src/session/runner/to-llm-message.ts:16][E: packages/core/src/session/runner/to-llm-message.ts:17][E: packages/core/src/session/runner/to-llm-message.ts:18]
2. `toolInput@packages/core/src/session/runner/to-llm-message.ts:21` 对 non-pending tool state 直接返回 structured input;pending state 尝试 JSON.parse raw string,失败时保留 raw string。[E: packages/core/src/session/runner/to-llm-message.ts:22][E: packages/core/src/session/runner/to-llm-message.ts:24][E: packages/core/src/session/runner/to-llm-message.ts:26]
3. `toolCall@packages/core/src/session/runner/to-llm-message.ts:30` 生成 `ToolCallPart`,带 call id、name、input、`providerExecuted` 和 optional provider metadata。[E: packages/core/src/session/runner/to-llm-message.ts:31][E: packages/core/src/session/runner/to-llm-message.ts:32][E: packages/core/src/session/runner/to-llm-message.ts:33][E: packages/core/src/session/runner/to-llm-message.ts:34][E: packages/core/src/session/runner/to-llm-message.ts:35][E: packages/core/src/session/runner/to-llm-message.ts:36]
4. `toolResult@packages/core/src/session/runner/to-llm-message.ts:39` 对 completed tool 选择 result:如果 tool 是 provider-executed 且 stored `state.result` 存在,复用 stored result;否则把 structured/content 转成 result value。provider-executed tool results are provider-native transcript facts is the design contract in `CONTEXT.md`。[E: packages/core/src/session/runner/to-llm-message.ts:40][E: packages/core/src/session/runner/to-llm-message.ts:44][E: packages/core/src/session/runner/to-llm-message.ts:45][E: packages/core/src/session/runner/to-llm-message.ts:46][E: CONTEXT.md:120]
5. `toolResult` 对 error tool 同样优先复用 provider-executed stored result;否则构造 `{ error, content, structured }`,并设置 `resultType: "error"`。[E: packages/core/src/session/runner/to-llm-message.ts:55][E: packages/core/src/session/runner/to-llm-message.ts:60][E: packages/core/src/session/runner/to-llm-message.ts:61][E: packages/core/src/session/runner/to-llm-message.ts:62][E: packages/core/src/session/runner/to-llm-message.ts:63][E: CONTEXT.md:120]
6. `assistant@packages/core/src/session/runner/to-llm-message.ts:70` 用 projected assistant model 与 selected continuation `model` 比较 providerID/modelID;reasoning part 只有在 `sameModel` 为真时携带 `providerMetadata`,tool call/result metadata 也通过 `sameModel ? ... : undefined` gate 传入。[E: packages/core/src/session/runner/to-llm-message.ts:71][E: packages/core/src/session/runner/to-llm-message.ts:72][E: packages/core/src/session/runner/to-llm-message.ts:76][E: packages/core/src/session/runner/to-llm-message.ts:77][E: packages/core/src/session/runner/to-llm-message.ts:81][E: packages/core/src/session/runner/to-llm-message.ts:82][E: packages/core/src/session/runner/to-llm-message.ts:87]
7. assistant text parts always lower 成 `{ type: "text", text }`;reasoning part 在 same model 时 lower 成 reasoning part with providerMetadata,否则非空 reasoning text 降级成普通 text。[E: packages/core/src/session/runner/to-llm-message.ts:74][E: packages/core/src/session/runner/to-llm-message.ts:75][E: packages/core/src/session/runner/to-llm-message.ts:76][E: packages/core/src/session/runner/to-llm-message.ts:77][E: packages/core/src/session/runner/to-llm-message.ts:78][E: packages/core/src/session/runner/to-llm-message.ts:79]
8. assistant tool part 会先生成 tool call part,再尝试生成 tool result part;provider-executed tool 的 result 与 call 放在同一 assistant message content 中,local tool 的 result 另行生成 tool role messages。[E: packages/core/src/session/runner/to-llm-message.ts:81][E: packages/core/src/session/runner/to-llm-message.ts:82][E: packages/core/src/session/runner/to-llm-message.ts:83][E: packages/core/src/session/runner/to-llm-message.ts:86][E: packages/core/src/session/runner/to-llm-message.ts:87][E: packages/core/src/session/runner/to-llm-message.ts:89][E: packages/core/src/session/runner/to-llm-message.ts:90]
9. `user` message lowering 把 text 和 files 合并到 one user role message,metadata 保留 projected metadata,有 agents 时加入 `agents` metadata。[E: packages/core/src/session/runner/to-llm-message.ts:100][E: packages/core/src/session/runner/to-llm-message.ts:102][E: packages/core/src/session/runner/to-llm-message.ts:103][E: packages/core/src/session/runner/to-llm-message.ts:105][E: packages/core/src/session/runner/to-llm-message.ts:106]
10. `system` message lowering 用 `Message.system(message.text)`,这让 Mid-Conversation System Message 进入 provider-native chronological instruction role when supported。[E: packages/core/src/session/runner/to-llm-message.ts:113][E: CONTEXT.md:107]
11. `compaction` message lowering 构造 user role checkpoint,消息文本要求模型/消息接收方把 summary/recent-context 当 historical context 而不是 new instructions。[E: packages/core/src/session/runner/to-llm-message.ts:129][E: packages/core/src/session/runner/to-llm-message.ts:130][E: packages/core/src/session/runner/to-llm-message.ts:131]

## provider metadata replay

`SessionMessage.AssistantTool.provider` 同时保存 `metadata` 与 `resultMetadata`,schema 字段在 `SessionMessage.AssistantTool` 中定义。[E: packages/core/src/session/message.ts:110][E: packages/core/src/session/message.ts:112][E: packages/core/src/session/message.ts:113] lowering 对 tool call 使用 same-model `item.provider?.metadata`,对 tool result 使用 same-model `resultMetadata ?? metadata`。[E: packages/core/src/session/runner/to-llm-message.ts:81][E: packages/core/src/session/runner/to-llm-message.ts:82][E: packages/core/src/session/runner/to-llm-message.ts:87]

V2 session spec 明确:provider-native reasoning and provider metadata 只在 historical assistant model 与 selected continuation model 匹配时 replay;model switch 后 visible reasoning text 保留,provider-native metadata 省略。[E: specs/v2/session.md:45]

## 设计动机与权衡

- `agent-switched` 与 `model-switched` 不直接成为 provider context;它们作为 durable control/audit messages 的用途来自 projected message 类型和 lowering 返回空数组的组合推断。[E: packages/core/src/session/runner/to-llm-message.ts:95][E: packages/core/src/session/runner/to-llm-message.ts:96][E: packages/core/src/session/runner/to-llm-message.ts:97][I]
- compaction lowering 使用 user role checkpoint;V2 spec separately says compaction replaces active model representation while retaining full transcript durable。Treating the checkpoint role choice as serving that replacement model is a design inference。[E: specs/v2/session.md:111][E: packages/core/src/session/runner/to-llm-message.ts:129][E: packages/core/src/session/runner/to-llm-message.ts:130][E: packages/core/src/session/runner/to-llm-message.ts:131][I]
- same-model 比较只看 providerID 与 model id,不看 variant 字段;variant-sensitive provider metadata replay 没在当前 lowering 代码中建模。[E: packages/core/src/session/runner/to-llm-message.ts:71][E: packages/core/src/session/runner/to-llm-message.ts:72][I]

## gotcha

- `toolResult` 在非 provider-executed completed result path 调 `ToolOutput.toResultValue(...)`;本节点只从 lowering 源码证明这条转换路径,不把相邻 TODO 的 URI 行为当硬证据。[E: packages/core/src/session/runner/to-llm-message.ts:46]
- Pending tool input 的 raw string 如果不是 JSON,会作为 `ToolCallPart` input replay;这不是 schema validation,只是 history lowering fallback。[E: packages/core/src/session/runner/to-llm-message.ts:24][E: packages/core/src/session/runner/to-llm-message.ts:26][E: packages/core/src/session/runner/to-llm-message.ts:34][I]

## Sources
- packages/core/src/session/runner/to-llm-message.ts
- packages/core/src/session/message.ts
- packages/core/src/session/runner/llm.ts
- packages/core/src/session/history.ts
- specs/v2/session.md
- CONTEXT.md

## 相关
- [spine.v2-provider-turn](../../spine/v2-provider-turn.md)
- [model-layer.llm-schema](../model-layer/llm-schema.md)
