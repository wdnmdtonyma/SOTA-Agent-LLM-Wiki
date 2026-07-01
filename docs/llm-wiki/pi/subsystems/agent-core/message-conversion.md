---
id: subsys.agent-core.message-conversion
title: 消息转换管线(convertToLlm)
kind: subsystem
tier: T2
pkg: agent
source:
  - packages/agent/src/harness/messages.ts
symbols:
  - convertToLlm
  - bashExecutionToText
related:
  - subsys.agent-core.message-model
  - subsys.agent-core.compaction
evidence: explicit
status: verified
updated: 8c943640
---

> `subsys.agent-core.message-conversion` 描述 `pi-agent-core` 如何把 harness 层的 `AgentMessage[]` 转成 `@earendil-works/pi-ai` 的 `Message[]`, 并把 bash execution、custom message、branch summary 与 compaction summary 包装成模型可读的 user message。

## 能回答的问题

- `convertToLlm(messages)` 接收什么,返回什么?
- `bashExecution` history 如何变成模型可见文本,哪些字段会影响输出?
- `custom`、`branchSummary`、`compactionSummary` 如何映射到 LLM message?
- `user`、`assistant`、`toolResult` 为什么在这一层不重写?
- `excludeFromContext` 和 unknown custom roles 在转换时会怎样?
- compaction summary 的生成与 summary message 的模型上下文化边界在哪里?

## 职责边界

`convertToLlm(messages: AgentMessage[])` 是 harness message 到 ai package `Message[]` 的结构转换层: 输入来自 `../types.ts` 的 `AgentMessage`, 输出类型是 `@earendil-works/pi-ai` 的 `Message[]`。[E: packages/agent/src/harness/messages.ts:1] [E: packages/agent/src/harness/messages.ts:2] [E: packages/agent/src/harness/messages.ts:120]

本文件通过 module augmentation 给 `AgentMessage` 增加四类 harness custom roles: `bashExecution`、`custom`、`branchSummary`、`compactionSummary`。[E: packages/agent/src/harness/messages.ts:54] [E: packages/agent/src/harness/messages.ts:56] [E: packages/agent/src/harness/messages.ts:57] [E: packages/agent/src/harness/messages.ts:58] [E: packages/agent/src/harness/messages.ts:59] `convertToLlm` 只识别这些 role 加上原生 `user`、`assistant`、`toolResult`; default 分支返回 `undefined`,最后用 type guard 过滤掉。[E: packages/agent/src/harness/messages.ts:123] [E: packages/agent/src/harness/messages.ts:155] [E: packages/agent/src/harness/messages.ts:157] [E: packages/agent/src/harness/messages.ts:159] [E: packages/agent/src/harness/messages.ts:163]

## 关键文件

- `packages/agent/src/harness/messages.ts`:定义 summary wrapper 常量、四类 custom message interface、creation helpers、`bashExecutionToText()` 和 `convertToLlm()`。[E: packages/agent/src/harness/messages.ts:4] [E: packages/agent/src/harness/messages.ts:12] [E: packages/agent/src/harness/messages.ts:19] [E: packages/agent/src/harness/messages.ts:31] [E: packages/agent/src/harness/messages.ts:40] [E: packages/agent/src/harness/messages.ts:47] [E: packages/agent/src/harness/messages.ts:63] [E: packages/agent/src/harness/messages.ts:120]

## 数据模型

`BashExecutionMessage` 保存 command、output、exitCode、cancelled、truncated、optional `fullOutputPath`、timestamp 和 optional `excludeFromContext`;这些字段决定它是否进入 context 以及模型看到的文字 footer。[E: packages/agent/src/harness/messages.ts:19] [E: packages/agent/src/harness/messages.ts:21] [E: packages/agent/src/harness/messages.ts:22] [E: packages/agent/src/harness/messages.ts:23] [E: packages/agent/src/harness/messages.ts:24] [E: packages/agent/src/harness/messages.ts:25] [E: packages/agent/src/harness/messages.ts:26] [E: packages/agent/src/harness/messages.ts:28]

`CustomMessage` 的 `content` 可以是 string,也可以已经是 `(TextContent | ImageContent)[]`;`display` 和 `details` 保留在 harness message 上,但 `convertToLlm` 只读取 `content` 与 `timestamp`。[E: packages/agent/src/harness/messages.ts:31] [E: packages/agent/src/harness/messages.ts:34] [E: packages/agent/src/harness/messages.ts:35] [E: packages/agent/src/harness/messages.ts:36] [E: packages/agent/src/harness/messages.ts:133] [E: packages/agent/src/harness/messages.ts:138]

`BranchSummaryMessage` 存 `summary`、`fromId`、`timestamp`;`CompactionSummaryMessage` 存 `summary`、`tokensBefore`、`timestamp`。[E: packages/agent/src/harness/messages.ts:40] [E: packages/agent/src/harness/messages.ts:42] [E: packages/agent/src/harness/messages.ts:43] [E: packages/agent/src/harness/messages.ts:44] [E: packages/agent/src/harness/messages.ts:47] [E: packages/agent/src/harness/messages.ts:49] [E: packages/agent/src/harness/messages.ts:50] [E: packages/agent/src/harness/messages.ts:51] 创建 helper 会把 timestamp string 转成 epoch milliseconds,不保留原始 timestamp string。[E: packages/agent/src/harness/messages.ts:81] [E: packages/agent/src/harness/messages.ts:86] [E: packages/agent/src/harness/messages.ts:90] [E: packages/agent/src/harness/messages.ts:99] [E: packages/agent/src/harness/messages.ts:103] [E: packages/agent/src/harness/messages.ts:116]

## 控制流

1. `convertToLlm@packages/agent/src/harness/messages.ts:120` 对输入 messages 执行 `.map()`,每个 `AgentMessage` 按 `m.role` 转成 `Message | undefined`。[E: packages/agent/src/harness/messages.ts:120] [E: packages/agent/src/harness/messages.ts:121] [E: packages/agent/src/harness/messages.ts:122] [E: packages/agent/src/harness/messages.ts:123]
2. `bashExecution` role 如果带 `excludeFromContext`,当前 message 直接返回 `undefined`,不会进入最终 `Message[]`。[E: packages/agent/src/harness/messages.ts:124] [E: packages/agent/src/harness/messages.ts:125] [E: packages/agent/src/harness/messages.ts:126] 否则它被包装成 `role: "user"`、单个 text content block,文本来自 `bashExecutionToText(m)`,timestamp 透传。[E: packages/agent/src/harness/messages.ts:128] [E: packages/agent/src/harness/messages.ts:129] [E: packages/agent/src/harness/messages.ts:130] [E: packages/agent/src/harness/messages.ts:131]
3. `custom` role 会把 string content 转成 `[{ type: "text", text: m.content }]`;如果 content 已经是 text/image content array,则原 array 直接作为 user message content。[E: packages/agent/src/harness/messages.ts:133] [E: packages/agent/src/harness/messages.ts:134] [E: packages/agent/src/harness/messages.ts:136] [E: packages/agent/src/harness/messages.ts:137] [E: packages/agent/src/harness/messages.ts:138]
4. `branchSummary` role 被包装成 user text,文本是 `BRANCH_SUMMARY_PREFIX + m.summary + BRANCH_SUMMARY_SUFFIX`;prefix/suffix 把 summary 放进 `<summary>` 标签,并说明这是返回某个 branch 后带回来的 summary。[E: packages/agent/src/harness/messages.ts:12] [E: packages/agent/src/harness/messages.ts:14] [E: packages/agent/src/harness/messages.ts:17] [E: packages/agent/src/harness/messages.ts:141] [E: packages/agent/src/harness/messages.ts:143] [E: packages/agent/src/harness/messages.ts:144]
5. `compactionSummary` role 被包装成 user text,文本是 `COMPACTION_SUMMARY_PREFIX + m.summary + COMPACTION_SUMMARY_SUFFIX`;prefix/suffix 把 summary 放进 `<summary>` 标签,并说明此点之前的 conversation history 已被 compacted。[E: packages/agent/src/harness/messages.ts:4] [E: packages/agent/src/harness/messages.ts:6] [E: packages/agent/src/harness/messages.ts:9] [E: packages/agent/src/harness/messages.ts:147] [E: packages/agent/src/harness/messages.ts:149] [E: packages/agent/src/harness/messages.ts:151]
6. 原生 `user`、`assistant`、`toolResult` message 原样返回,不在 agent-core conversion 层重写 content、timestamp、tool call 或 tool result 字段。[E: packages/agent/src/harness/messages.ts:155] [E: packages/agent/src/harness/messages.ts:156] [E: packages/agent/src/harness/messages.ts:157] [E: packages/agent/src/harness/messages.ts:158]
7. 所有返回 `undefined` 的 message,包括 excluded bash execution 和未知 role,都会在 `.filter((m): m is Message => m !== undefined)` 阶段被删除。[E: packages/agent/src/harness/messages.ts:159] [E: packages/agent/src/harness/messages.ts:160] [E: packages/agent/src/harness/messages.ts:163]

## `bashExecutionToText`

`bashExecutionToText(msg)` 先生成 `Ran \`<command>\`` 标题;如果 `msg.output` 非空,它把 output 放进无语言标记的 fenced code block,否则追加 `(no output)`。[E: packages/agent/src/harness/messages.ts:63] [E: packages/agent/src/harness/messages.ts:64] [E: packages/agent/src/harness/messages.ts:65] [E: packages/agent/src/harness/messages.ts:66] [E: packages/agent/src/harness/messages.ts:68]

取消和非零退出码是互斥优先级: `cancelled` 为 true 时追加 `(command cancelled)`,否则只有 `exitCode` 非 null/undefined 且非 0 时才追加 `Command exited with code N`。[E: packages/agent/src/harness/messages.ts:70] [E: packages/agent/src/harness/messages.ts:71] [E: packages/agent/src/harness/messages.ts:72] [E: packages/agent/src/harness/messages.ts:73]

截断 footer 只有在 `truncated` 且 `fullOutputPath` 同时存在时出现,格式是 `[Output truncated. Full output: <path>]`;单独 `truncated: true` 但没有 path 不会生成完整输出提示。[E: packages/agent/src/harness/messages.ts:75] [E: packages/agent/src/harness/messages.ts:76]

## 设计动机与权衡

`bashExecution` 被转成 user message,而不是 toolResult message;这说明它代表 harness/session history 中一次已记录的 shell execution 观察值,不是当前 assistant tool call 正在等待的 provider-native tool result。[E: packages/agent/src/harness/messages.ts:124] [E: packages/agent/src/harness/messages.ts:129] [E: packages/agent/src/harness/messages.ts:155] [E: packages/agent/src/harness/messages.ts:157] [I]

`custom` message 的 string-to-text-content 转换发生在 agent-core conversion 层,但 image content array 会直接传给 ai `Message`;因此图片是否能被某个 provider/model 接受,不在本函数内判断。[E: packages/agent/src/harness/messages.ts:1] [E: packages/agent/src/harness/messages.ts:34] [E: packages/agent/src/harness/messages.ts:134] [I]

`display`、`customType`、`details`、`fromId`、`tokensBefore` 是 harness/history 元数据;`convertToLlm` 没有把这些字段写进最终 `Message` 对象,只有 summary 文本或 content 与 timestamp 进入 provider context。[E: packages/agent/src/harness/messages.ts:33] [E: packages/agent/src/harness/messages.ts:35] [E: packages/agent/src/harness/messages.ts:36] [E: packages/agent/src/harness/messages.ts:43] [E: packages/agent/src/harness/messages.ts:50] [E: packages/agent/src/harness/messages.ts:134] [E: packages/agent/src/harness/messages.ts:144] [E: packages/agent/src/harness/messages.ts:151]

## Compaction 边界

本节点覆盖的是 `compactionSummary` message 如何变成模型可见 user text,不是 compaction cut point、summary 生成或 session entry 持久化。源码证据是本文件只定义 `CompactionSummaryMessage`、`createCompactionSummaryMessage()` 和 `convertToLlm` 的 `compactionSummary` 分支;这些代码读取已经存在的 `summary` 并包上固定 prefix/suffix。[E: packages/agent/src/harness/messages.ts:47] [E: packages/agent/src/harness/messages.ts:90] [E: packages/agent/src/harness/messages.ts:96] [E: packages/agent/src/harness/messages.ts:97] [E: packages/agent/src/harness/messages.ts:147] [E: packages/agent/src/harness/messages.ts:151] [I]

`branchSummary` 使用同样的 conversion 边界:本文件不决定 abandoned branch collection 或 summary 生成,只把已有 `summary` 包装成 user text 并保留 timestamp。[E: packages/agent/src/harness/messages.ts:40] [E: packages/agent/src/harness/messages.ts:81] [E: packages/agent/src/harness/messages.ts:83] [E: packages/agent/src/harness/messages.ts:84] [E: packages/agent/src/harness/messages.ts:141] [E: packages/agent/src/harness/messages.ts:144] [I]

## Gotcha

- `excludeFromContext` 只在 `bashExecution` 分支被读取;`custom`、`branchSummary`、`compactionSummary` 没有对应跳过逻辑。[E: packages/agent/src/harness/messages.ts:124] [E: packages/agent/src/harness/messages.ts:125] [E: packages/agent/src/harness/messages.ts:133] [E: packages/agent/src/harness/messages.ts:141] [E: packages/agent/src/harness/messages.ts:147]
- `bashExecutionToText` 在 output 周围固定加 fenced code block,但没有语言标签,也没有对 output 内容中的 backticks 做 escaping。[E: packages/agent/src/harness/messages.ts:66]
- `exitCode` 为 `null` 时不会追加 failure footer,虽然 `BashExecutionMessage.exitCode` 的 interface 写的是 `number | undefined`;运行时 guard 同时检查了 `null` 和 `undefined`。[E: packages/agent/src/harness/messages.ts:23] [E: packages/agent/src/harness/messages.ts:72]

## 跨包边界

`subsys.agent-core.message-model` 应覆盖 `AgentMessage`、原生 message role、tool call 和 tool result 的字段级模型;本节点只覆盖这些 message 被送入 provider 前的 conversion 行为。[E: packages/agent/src/harness/messages.ts:2] [E: packages/agent/src/harness/messages.ts:120] [I]

`subsys.agent-core.compaction` 应覆盖 compaction 何时触发、如何选择边界、如何生成 summary;本节点只覆盖 `compactionSummary` 已经成为 `AgentMessage` 后如何被包成 user text。[E: packages/agent/src/harness/messages.ts:47] [E: packages/agent/src/harness/messages.ts:90] [E: packages/agent/src/harness/messages.ts:147] [I]

## Sources

- packages/agent/src/harness/messages.ts

## 相关

- [subsys.agent-core.message-model](message-model.md): `AgentMessage` 与 agent-core message 数据模型。
- [subsys.agent-core.compaction](compaction.md): compaction 准备、summary 生成和 session context 边界。
