---
id: spine.turn-end-to-end
title: Turn end to end
kind: flow
tier: T0
status: verified
source: [query.ts]
symbols: [queryLoop, messagesForQuery, callModel, toolUseBlocks, toolResults, next_turn]
related: [spine.agent-loop, spine.tool-call-anatomy]
updated: 2026-06-13
evidence: explicit
---

一个 turn 在 `query.ts` 中从 `messagesForQuery` 构造开始, 经过模型流、工具结果、hooks/attachments, 最后用追加后的 assistant/tool/user messages 递归进入 `next_turn` 或返回 terminal transition。[E: query.ts:365][E: query.ts:657][E: query.ts:1360][E: query.ts:1714]

## 能回答的问题

- 单个 turn 的输入上下文如何被裁剪、压缩、发送给模型?
- 工具调用结果如何回到下一轮模型输入?
- 哪些条件会在 turn 内提前终止?

```mermaid
sequenceDiagram
  participant Loop as queryLoop
  participant Compact as compact/microcompact
  participant Model as callModel
  participant Tools as tool executor
  participant State as next state
  Loop->>Compact: messagesForQuery
  Compact-->>Loop: compacted messages or unchanged
  Loop->>Model: messages + systemPrompt + tools
  Model-->>Loop: assistant stream + tool_use blocks
  alt no tool_use
    Loop-->>State: stop hooks / continuation / completed
  else tool_use
    Loop->>Tools: execute tool_use blocks
    Tools-->>Loop: tool_result messages + context
    Loop-->>State: assistantMessages + toolResults + queued user messages
  end
```

## 1. Turn 输入

每轮开始, `queryLoop()` 调用 `getMessagesAfterCompactBoundary(messages)` 得到 `messagesForQuery`; 该 helper 名称和调用位置表明本轮候选输入来自 compact boundary 之后的消息。[E: query.ts:365][I] 之后依次应用 tool result budget、snip feature、microcompact、context collapse projection 和 auto-compact。[E: query.ts:369][E: query.ts:396][E: query.ts:412][E: query.ts:428][E: query.ts:453]

auto-compact 返回结果时, loop 会更新 task budget、重置 tracking, 调用 `buildPostCompactMessages(...)`, yield compact 后消息, 并把 `messagesForQuery` 替换为 compact 后上下文。[E: query.ts:470][E: query.ts:504][E: query.ts:517][E: query.ts:528][E: query.ts:530][E: query.ts:535]

## 2. 模型流

在模型调用前, loop 把 `messagesForQuery` 写入 `toolUseContext.messages`, 再构造 runtime model 并检查 context blocking limit。[E: query.ts:545][E: query.ts:570][E: query.ts:592] `deps.callModel(...)` 发送经过 `prependUserContext(...)` 的消息, 并附带 `systemPrompt`、`thinkingConfig`、`tools`、`signal` 与 token/model 选项。[E: query.ts:657]

流式 fallback 会把孤立消息 tombstone 掉, 清空本轮 assistant/tool 状态并 discard executor, 然后进入 fallback 模型路径。[E: query.ts:709] loop 对 assistant message clone 回填 `tool_use` input 后 yield, 原始消息保持不被回填以避免污染内部状态。[E: query.ts:742]

## 3. 工具块收集

assistant message 会被加入 `assistantMessages`; message content 中的 `tool_use` block 会被加入 `toolUseBlocks`, streaming executor 存在时也会立即 `addTool(...)`。[E: query.ts:826][E: query.ts:839] executor 已完成结果会在模型流期间取出并 yield, 同时被规范化为下一轮要发送的 `toolResults`。[E: query.ts:847][E: query.ts:858]

如果流结束后需要工具 follow-up, loop 要么消费 streaming executor 的剩余结果, 要么调用 `runTools(...)`; 两条路径都会 yield tool update message 并追加 normalized tool result, 只有 `update.newContext` 存在时才更新 tool context。[E: query.ts:1360][E: query.ts:1380][E: query.ts:1384][E: query.ts:1395][E: query.ts:1402]

## 4. 无工具结束

当没有 `needsFollowUp` 时, loop 处理 withheld 413/media、reactive compact、stop hooks、token budget continuation 和最终 completed transition。[E: query.ts:1070][E: query.ts:1082][E: query.ts:1119][E: query.ts:1267][E: query.ts:1316][E: query.ts:1357] abort 分支会在 streaming executor 存在时消费剩余 synthetic results 或构造 missing tool result blocks, 清理状态并返回 `aborted_streaming`。[E: query.ts:1011]

## 5. 有工具后的下一轮

工具批结束后, loop 异步生成 tool use summary, 检查 abort 和 hook stop, 处理 queued commands、memory prefetch、skill attachments、consumed command lifecycle、refreshTools 和 maxTurns。[E: query.ts:1411][E: query.ts:1484][E: query.ts:1518][E: query.ts:1535][E: query.ts:1592][E: query.ts:1616][E: query.ts:1630][E: query.ts:1659][E: query.ts:1704] 下一轮状态把 `messagesForQuery`、本轮 `assistantMessages` 与 `toolResults` 串接为新的 `messages`, 设置 `transition: { reason: "next_turn" }`, 并写回 `state`。[E: query.ts:1714][E: query.ts:1725][E: query.ts:1727]

## Sources

- `query.ts`

## 相关

- [Agent loop](agent-loop.md)
- [Tool call anatomy](tool-call-anatomy.md)
