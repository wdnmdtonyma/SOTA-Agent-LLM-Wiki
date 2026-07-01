---
id: subsys.agent-core.message-model
title: 对话消息模型
kind: subsystem
tier: T2
pkg: agent
source:
  - packages/agent/src/types.ts
  - packages/agent/src/harness/messages.ts
symbols:
  - AgentMessage
  - AgentToolCall
  - AgentToolResult
related:
  - subsys.agent-core.message-conversion
  - ref.agent.message-types
evidence: explicit
status: verified
updated: 8c943640
---

> `subsys.agent-core.message-model` 描述 `pi-agent-core` 在 agent loop 与 harness conversion 之间使用的消息 union、tool call/result envelope,以及标准 LLM 消息与 custom harness 消息的转换边界。

## 能回答的问题

- `AgentMessage` 怎样把 provider message 与 app/harness custom message 放进同一个 transcript union?
- assistant tool call 在 agent-core 里用什么类型锚定?
- `AgentToolResult` 与 provider-visible `ToolResultMessage` 的职责有什么区别?
- `bashExecution`、`custom`、`branchSummary`、`compactionSummary` 这些 harness 消息怎样进入 LLM context?
- `user`、`assistant`、`toolResult` 和 system prompt 在 agent-core 消息模型里的边界在哪里?

## 职责边界

`AgentMessage` 是 agent-core 的 transcript union:它等于 provider 层 `Message` 加上 `CustomAgentMessages[keyof CustomAgentMessages]`。[E: packages/agent/src/types.ts:8][E: packages/agent/src/types.ts:305][E: packages/agent/src/types.ts:314] `CustomAgentMessages` 在 core 类型文件中先作为空接口存在,再由 harness 的 module augmentation 加入 `bashExecution`、`custom`、`branchSummary`、`compactionSummary` 四个 custom role。[E: packages/agent/src/types.ts:305][E: packages/agent/src/harness/messages.ts:54][E: packages/agent/src/harness/messages.ts:55][E: packages/agent/src/harness/messages.ts:56][E: packages/agent/src/harness/messages.ts:57][E: packages/agent/src/harness/messages.ts:58][E: packages/agent/src/harness/messages.ts:59]

`AgentLoopConfig.convertToLlm` 是 AgentMessage 到 provider-compatible `Message[]` 的显式类型边界:它接收 `AgentMessage[]`,返回 `Message[] | Promise<Message[]>`。[E: packages/agent/src/types.ts:140][E: packages/agent/src/types.ts:169] default harness converter 则把每个 `AgentMessage` 映射为 `Message | undefined`,最后过滤掉 `undefined`。[E: packages/agent/src/harness/messages.ts:120][E: packages/agent/src/harness/messages.ts:121][E: packages/agent/src/harness/messages.ts:122][E: packages/agent/src/harness/messages.ts:159][E: packages/agent/src/harness/messages.ts:160][E: packages/agent/src/harness/messages.ts:163]

`packages/agent/src/harness/messages.ts` 同时定义 harness custom message interfaces、把它们注入 `CustomAgentMessages`,并提供 default `convertToLlm(messages)` 实现。[E: packages/agent/src/harness/messages.ts:19][E: packages/agent/src/harness/messages.ts:31][E: packages/agent/src/harness/messages.ts:40][E: packages/agent/src/harness/messages.ts:47][E: packages/agent/src/harness/messages.ts:54][E: packages/agent/src/harness/messages.ts:120]

## 类型结构

`AgentMessage` 的标准侧来自 `@earendil-works/pi-ai` 的 imported `Message`;本节点不展开 `Message` 的字段级定义,只记录 agent-core 对它的使用边界:default converter 对 `user`、`assistant`、`toolResult` 直接返回原消息。[E: packages/agent/src/types.ts:8][E: packages/agent/src/types.ts:314][E: packages/agent/src/harness/messages.ts:155][E: packages/agent/src/harness/messages.ts:156][E: packages/agent/src/harness/messages.ts:157][E: packages/agent/src/harness/messages.ts:158]

`AgentContext.messages` 和 `AgentState.messages` 都使用 `AgentMessage[]`;`AgentState` 同时暴露 setter/getter,所以 public state 与 low-level request context 使用同一个 message union。[E: packages/agent/src/types.ts:322][E: packages/agent/src/types.ts:333][E: packages/agent/src/types.ts:334][E: packages/agent/src/types.ts:397][E: packages/agent/src/types.ts:401]

`BashExecutionMessage` 是一条 custom harness 消息,字段包含 `role: "bashExecution"`、command、output、exitCode、cancelled、truncated、可选 fullOutputPath、timestamp 和可选 `excludeFromContext`。[E: packages/agent/src/harness/messages.ts:19][E: packages/agent/src/harness/messages.ts:20][E: packages/agent/src/harness/messages.ts:21][E: packages/agent/src/harness/messages.ts:22][E: packages/agent/src/harness/messages.ts:23][E: packages/agent/src/harness/messages.ts:24][E: packages/agent/src/harness/messages.ts:25][E: packages/agent/src/harness/messages.ts:26][E: packages/agent/src/harness/messages.ts:27][E: packages/agent/src/harness/messages.ts:28]

`CustomMessage<T>` 是 role 为 `"custom"` 的 generic custom message,带 `customType`、字符串或 text/image content array、`display`、可选 `details` 和 timestamp。[E: packages/agent/src/harness/messages.ts:31][E: packages/agent/src/harness/messages.ts:32][E: packages/agent/src/harness/messages.ts:33][E: packages/agent/src/harness/messages.ts:34][E: packages/agent/src/harness/messages.ts:35][E: packages/agent/src/harness/messages.ts:36][E: packages/agent/src/harness/messages.ts:37]

`BranchSummaryMessage` 和 `CompactionSummaryMessage` 是 harness summary 消息:branch summary 存 `summary`、`fromId`、timestamp,compaction summary 存 `summary`、`tokensBefore`、timestamp。[E: packages/agent/src/harness/messages.ts:40][E: packages/agent/src/harness/messages.ts:41][E: packages/agent/src/harness/messages.ts:42][E: packages/agent/src/harness/messages.ts:43][E: packages/agent/src/harness/messages.ts:44][E: packages/agent/src/harness/messages.ts:47][E: packages/agent/src/harness/messages.ts:48][E: packages/agent/src/harness/messages.ts:49][E: packages/agent/src/harness/messages.ts:50][E: packages/agent/src/harness/messages.ts:51]

## assistant/user/system 语义

Default `convertToLlm` 对 `user`、`assistant`、`toolResult` 三种标准 LLM message 不改写,直接返回原消息。[E: packages/agent/src/harness/messages.ts:155][E: packages/agent/src/harness/messages.ts:156][E: packages/agent/src/harness/messages.ts:157][E: packages/agent/src/harness/messages.ts:158]

Harness custom 消息在进入 LLM context 时统一降级成 `role: "user"`:非排除的 `bashExecution` 变成一个 text content part,`custom` 变成 user message,`branchSummary` 和 `compactionSummary` 也变成包裹 summary 文本的 user message。[E: packages/agent/src/harness/messages.ts:124][E: packages/agent/src/harness/messages.ts:125][E: packages/agent/src/harness/messages.ts:128][E: packages/agent/src/harness/messages.ts:129][E: packages/agent/src/harness/messages.ts:130][E: packages/agent/src/harness/messages.ts:133][E: packages/agent/src/harness/messages.ts:134][E: packages/agent/src/harness/messages.ts:135][E: packages/agent/src/harness/messages.ts:136][E: packages/agent/src/harness/messages.ts:141][E: packages/agent/src/harness/messages.ts:143][E: packages/agent/src/harness/messages.ts:144][E: packages/agent/src/harness/messages.ts:147][E: packages/agent/src/harness/messages.ts:149][E: packages/agent/src/harness/messages.ts:151]

System prompt 在 agent-core public state 与 request context 中是独立字段:`AgentState.systemPrompt` 和 `AgentContext.systemPrompt` 都是 `string`;default harness converter 的 switch 处理 message roles,没有单独的 `system` case,未匹配分支会返回 `undefined`。[E: packages/agent/src/types.ts:324][E: packages/agent/src/types.ts:399][E: packages/agent/src/harness/messages.ts:123][E: packages/agent/src/harness/messages.ts:155][E: packages/agent/src/harness/messages.ts:156][E: packages/agent/src/harness/messages.ts:157][E: packages/agent/src/harness/messages.ts:159][E: packages/agent/src/harness/messages.ts:160]

## tool call / result 模型

`AgentToolCall` 不是单独定义的新 shape,而是从 `AssistantMessage["content"][number]` 中抽取 `{ type: "toolCall" }` content block;这把 agent-core 的 tool call 锚定在 assistant message content part 上。[E: packages/agent/src/types.ts:3][E: packages/agent/src/types.ts:52]

`BeforeToolCallContext` 和 `AfterToolCallContext` 都携带触发工具的 `assistantMessage`、原始 `toolCall`、validated `args` 和当前 `AgentContext`;`AfterToolCallContext` 额外携带执行后的 `result` 与 `isError`。[E: packages/agent/src/types.ts:89][E: packages/agent/src/types.ts:91][E: packages/agent/src/types.ts:93][E: packages/agent/src/types.ts:95][E: packages/agent/src/types.ts:97][E: packages/agent/src/types.ts:101][E: packages/agent/src/types.ts:103][E: packages/agent/src/types.ts:105][E: packages/agent/src/types.ts:107][E: packages/agent/src/types.ts:109][E: packages/agent/src/types.ts:111][E: packages/agent/src/types.ts:113]

`AgentToolResult<T>` 是 tool implementation 返回的 final 或 partial envelope:它包含 text/image `content`、泛型 `details` 和可选 `terminate`。[E: packages/agent/src/types.ts:350][E: packages/agent/src/types.ts:352][E: packages/agent/src/types.ts:354][E: packages/agent/src/types.ts:359] partial update callback 也复用同一个 `AgentToolResult<T>` shape。[E: packages/agent/src/types.ts:368]

`AgentTool.execute` 接收 `toolCallId`、validated params、可选 abort signal、可选 partial update callback,并返回 `Promise<AgentToolResult<TDetails>>`。[E: packages/agent/src/types.ts:371][E: packages/agent/src/types.ts:380][E: packages/agent/src/types.ts:381][E: packages/agent/src/types.ts:382][E: packages/agent/src/types.ts:383][E: packages/agent/src/types.ts:384][E: packages/agent/src/types.ts:385]

`AgentToolResult` 自身不包含 `isError`;本 source 范围内的 local error flag 出现在 `AfterToolCallResult.isError` 和 `tool_execution_end.isError` 上。[E: packages/agent/src/types.ts:77][E: packages/agent/src/types.ts:80][E: packages/agent/src/types.ts:350][E: packages/agent/src/types.ts:352][E: packages/agent/src/types.ts:354][E: packages/agent/src/types.ts:359][E: packages/agent/src/types.ts:428] Turn contexts 携带 provider-visible `ToolResultMessage[]`,但 `ToolResultMessage` 的字段级定义来自 `@earendil-works/pi-ai`,不在本节点 source 范围内展开。[E: packages/agent/src/types.ts:13][E: packages/agent/src/types.ts:121]

## conversion 边界

`convertToLlm(messages)` 的实现是 map + filter:每个 `AgentMessage` 被映射成 `Message | undefined`,最后过滤掉 `undefined`。[E: packages/agent/src/harness/messages.ts:120][E: packages/agent/src/harness/messages.ts:121][E: packages/agent/src/harness/messages.ts:122][E: packages/agent/src/harness/messages.ts:159][E: packages/agent/src/harness/messages.ts:160][E: packages/agent/src/harness/messages.ts:163]

`bashExecution` conversion 会尊重 `excludeFromContext`:为 true 时返回 `undefined`,否则把 `bashExecutionToText(m)` 包成 `{ type: "text" }` user content。[E: packages/agent/src/harness/messages.ts:124][E: packages/agent/src/harness/messages.ts:125][E: packages/agent/src/harness/messages.ts:126][E: packages/agent/src/harness/messages.ts:128][E: packages/agent/src/harness/messages.ts:129][E: packages/agent/src/harness/messages.ts:130]

`bashExecutionToText` 把 command、输出、取消状态、非零 exit code、截断 full output path 串成一段 text;因此 shell execution 的 model-visible 形态在 message converter 内完成。[E: packages/agent/src/harness/messages.ts:63][E: packages/agent/src/harness/messages.ts:64][E: packages/agent/src/harness/messages.ts:66][E: packages/agent/src/harness/messages.ts:68][E: packages/agent/src/harness/messages.ts:70][E: packages/agent/src/harness/messages.ts:72][E: packages/agent/src/harness/messages.ts:75][E: packages/agent/src/harness/messages.ts:76][E: packages/agent/src/harness/messages.ts:78]

`custom` conversion 会把字符串 content 包成 single text content part,而已经是 text/image content array 的 content 会原样作为 user content 传入。[E: packages/agent/src/harness/messages.ts:133][E: packages/agent/src/harness/messages.ts:134][E: packages/agent/src/harness/messages.ts:135][E: packages/agent/src/harness/messages.ts:136][E: packages/agent/src/harness/messages.ts:137]

`createBranchSummaryMessage`、`createCompactionSummaryMessage` 和 `createCustomMessage` 都在创建时把 timestamp 字符串转成 `new Date(timestamp).getTime()` 数字 timestamp;这些 message interfaces 的 `timestamp` 字段也声明为 number。[E: packages/agent/src/harness/messages.ts:37][E: packages/agent/src/harness/messages.ts:44][E: packages/agent/src/harness/messages.ts:51][E: packages/agent/src/harness/messages.ts:81][E: packages/agent/src/harness/messages.ts:86][E: packages/agent/src/harness/messages.ts:90][E: packages/agent/src/harness/messages.ts:99][E: packages/agent/src/harness/messages.ts:103][E: packages/agent/src/harness/messages.ts:116]

## gotcha

Default `convertToLlm` 的 default 分支返回 `undefined`,所以未被标准 role pass-through 或 custom conversion 覆盖的 extension message 会被过滤出 LLM context。[E: packages/agent/src/harness/messages.ts:155][E: packages/agent/src/harness/messages.ts:159][E: packages/agent/src/harness/messages.ts:160][E: packages/agent/src/harness/messages.ts:163]

`AgentLoopConfig.convertToLlm` 的类型边界允许同步或异步返回 `Message[]`;源码注释还约定它不应 throw/reject,而应返回安全 fallback。[E: packages/agent/src/types.ts:169][I]

## 跨包边界

`subsys.agent-core.message-conversion` 应详写 `convertToLlm` 每个 custom role 的转换流程;本节点只把 `convertToLlm` 作为 `AgentMessage[] -> Message[]` 的边界来定位。[E: packages/agent/src/types.ts:169][E: packages/agent/src/harness/messages.ts:120]

`ref.agent.message-types` 应枚举 `AgentMessage` 相关消息类型;本节点覆盖 `AgentMessage`、`AgentToolCall`、`AgentToolResult` 三个核心符号的结构与语义边界。[E: packages/agent/src/types.ts:314][E: packages/agent/src/types.ts:52][E: packages/agent/src/types.ts:350]

## Sources

- packages/agent/src/types.ts
- packages/agent/src/harness/messages.ts

## 相关

- [subsys.agent-core.message-conversion](message-conversion.md) - `convertToLlm` 的逐 role 转换管线。
- [ref.agent.message-types](../../reference/message-types.md) - agent message 类型目录。
