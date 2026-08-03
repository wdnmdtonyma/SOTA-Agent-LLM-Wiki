---
id: session-v2.compaction
title: V2 自动/溢出压缩
kind: subsystem
tier: T2
v: v2
source: [packages/core/src/session/compaction.ts, packages/core/src/session/runner/llm.ts, packages/core/src/session/message-updater.ts, packages/core/src/session/projector.ts, packages/core/src/session/history.ts, packages/core/src/session/runner/to-llm-message.ts, packages/schema/src/session-event.ts, packages/core/src/session.ts, specs/v2/session.md]
symbols: [SessionCompaction, SessionCompaction.make, compactIfNeeded, compactAfterOverflow, buildPrompt, serialize, select]
related: [spine.trace-compaction-overflow, session-v1.compaction-overflow]
evidence: explicit
status: verified
updated: 89130db6b0
---

> V2 compaction 有两条执行路径:provider request 前的 `compactIfNeeded` 估算触发,以及 provider context overflow 且 assistant 尚未 started 时的 `compactAfterOverflow` recovery。

## 能回答的问题
- V2 自动压缩什么时候触发?
- provider overflow 后为什么只允许一次 recovery?
- compaction summary prompt 的结构是什么?
- `Compaction.Started/Ended` 哪个事件会投影成 provider-visible checkpoint?
- `SessionV2.compact` manual API 当前是否可用?

## 职责边界

`SessionCompaction.make` 接收 EventV2 publisher、LLM stream function 与 config documents,返回 `compactIfNeeded` 和 `compactAfterOverflow` 两个函数。[E: packages/core/src/session/compaction.ts:60][E: packages/core/src/session/compaction.ts:62][E: packages/core/src/session/compaction.ts:64][E: packages/core/src/session/compaction.ts:238][E: packages/core/src/session/compaction.ts:239] Runner 在 pre-turn 直接调用 `compactIfNeeded`;首次 `runTurn` 把 `compactAfterOverflow` 作为 `recoverOverflow` callback 传入 `runTurnAttempt`,而 post-compaction retry path 调 `runTurnAttempt(sessionID, promotion, step)` 时不再传第四参。history selection 与 message lowering 决定 completed compaction 后的 active model representation。[E: packages/core/src/session/runner/llm.ts:215][E: packages/core/src/session/runner/llm.ts:283][E: packages/core/src/session/runner/llm.ts:286][E: packages/core/src/session/runner/llm.ts:370][E: packages/core/src/session/runner/llm.ts:356][E: packages/core/src/session/history.ts:38][E: packages/core/src/session/history.ts:95][E: packages/core/src/session/runner/to-llm-message.ts:147][E: packages/core/src/session/runner/to-llm-message.ts:149][E: packages/core/src/session/runner/to-llm-message.ts:152]

V2 session spec 说明 completed compaction 保留 durable full transcript,但把 active model representation 替换为一个 checkpoint,包含 rolling summary 和 token-bounded recent context。[E: specs/v2/session.md:115]

## 数据模型与设置

| 常量/字段 | 值或来源 | 含义 |
|---|---|---|
| `DEFAULT_BUFFER` | `20_000` | context reserve fallback。[E: packages/core/src/session/compaction.ts:12] |
| `DEFAULT_KEEP_TOKENS` | `8_000` | recent context keep budget fallback。[E: packages/core/src/session/compaction.ts:13] |
| `TOOL_OUTPUT_MAX_CHARS` | `2_000` | summary serialization 内 tool/shell output preview cap。[E: packages/core/src/session/compaction.ts:14][E: packages/core/src/session/compaction.ts:77] |
| `SUMMARY_OUTPUT_TOKENS` | `4_096` | summary generation max cap。[E: packages/core/src/session/compaction.ts:15] |
| `Settings.auto` | config `compaction.auto`,default true | 是否允许 `compactIfNeeded` pre-turn auto compaction。[E: packages/core/src/session/compaction.ts:117][E: packages/core/src/session/compaction.ts:120][E: packages/core/src/session/compaction.ts:124] |
| `Settings.buffer` | config `compaction.buffer`,default `DEFAULT_BUFFER` | request budget reserve。[E: packages/core/src/session/compaction.ts:121][E: packages/core/src/session/compaction.ts:124] |
| `Settings.tokens` | config `compaction.keep.tokens`,default `DEFAULT_KEEP_TOKENS` | recent serialized context keep budget。[E: packages/core/src/session/compaction.ts:122][E: packages/core/src/session/compaction.ts:124] |

`SUMMARY_TEMPLATE` 现在要求输出固定 Markdown sections:`Objective`、`Important Details`、`Work State`(`Completed`/`Active`/`Blocked`)、`Next Move` 与 `Relevant Files`；规则还明确要保留 exact paths、symbols、commands、errors、URLs 和 identifiers。[E: packages/core/src/session/compaction.ts:18][E: packages/core/src/session/compaction.ts:21][E: packages/core/src/session/compaction.ts:24][E: packages/core/src/session/compaction.ts:25][E: packages/core/src/session/compaction.ts:28][E: packages/core/src/session/compaction.ts:31][E: packages/core/src/session/compaction.ts:34][E: packages/core/src/session/compaction.ts:38][E: packages/core/src/session/compaction.ts:45]

## 控制流

1. `settings@packages/core/src/session/compaction.ts:119` 从 config documents 中收集 document-level `info.compaction`,用 reduce 合并 auto/buffer/keep.tokens,默认 `{ auto: true, buffer: 20000, tokens: 8000 }`。[E: packages/core/src/session/compaction.ts:116][E: packages/core/src/session/compaction.ts:117][E: packages/core/src/session/compaction.ts:120][E: packages/core/src/session/compaction.ts:121][E: packages/core/src/session/compaction.ts:122][E: packages/core/src/session/compaction.ts:124]

2. `serialize@packages/core/src/session/compaction.ts:91` 把 user/assistant/system/synthetic/shell messages 转成 plain text transcript;assistant completed tool call 包含 bounded tool result,error tool call 包含 raw error message。[E: packages/core/src/session/compaction.ts:89][E: packages/core/src/session/compaction.ts:94][E: packages/core/src/session/compaction.ts:99][E: packages/core/src/session/compaction.ts:100][E: packages/core/src/session/compaction.ts:103][E: packages/core/src/session/compaction.ts:108][E: packages/core/src/session/compaction.ts:109][E: packages/core/src/session/compaction.ts:110][E: packages/core/src/session/compaction.ts:77]

3. `select@packages/core/src/session/compaction.ts:133` 过滤掉 existing compaction messages,从 conversation 尾部向前累计 token estimate,把 older prefix 放入 `head`,把 retained suffix 放入 `recent`。[E: packages/core/src/session/compaction.ts:133][E: packages/core/src/session/compaction.ts:134][E: packages/core/src/session/compaction.ts:141][E: packages/core/src/session/compaction.ts:142][E: packages/core/src/session/compaction.ts:156][E: packages/core/src/session/compaction.ts:157]

4. `buildPrompt@packages/core/src/session/compaction.ts:166` 在已有 previous summary 时要求 update anchored summary,否则要求 create new anchored summary;随后拼接 `SUMMARY_TEMPLATE` 与 selected context。[E: packages/core/src/session/compaction.ts:164][E: packages/core/src/session/compaction.ts:165][E: packages/core/src/session/compaction.ts:166][E: packages/core/src/session/compaction.ts:167]

5. `compactAfterOverflow@packages/core/src/session/compaction.ts:177` 先读取 model context limit;没有 context limit 或 limit <= 0 返回 false。[E: packages/core/src/session/compaction.ts:173][E: packages/core/src/session/compaction.ts:174]

6. `compactAfterOverflow` 选择 recent/head 与 previous compaction summary;如果没有 selected head 且也没有 previous compaction summary,返回 false。[E: packages/core/src/session/compaction.ts:176][E: packages/core/src/session/compaction.ts:177][E: packages/core/src/session/compaction.ts:178]

7. `compactAfterOverflow` 构造 summary prompt,把 summary output 限到 `Math.min(output || 4096, 4096)`,其中 `output` 来自 request maxTokens、model output default 或 0;当 prompt 估算超过 `context - summaryOutput` 时返回 false。[E: packages/core/src/session/compaction.ts:175][E: packages/core/src/session/compaction.ts:179][E: packages/core/src/session/compaction.ts:183][E: packages/core/src/session/compaction.ts:184]

8. compaction 尝试开始时创建 `SessionMessage.ID`,发布 `SessionEvent.Compaction.Started` with reason `"auto"`。[E: packages/core/src/session/compaction.ts:185][E: packages/core/src/session/compaction.ts:186][E: packages/core/src/session/compaction.ts:190]

9. summary generation 调 `dependencies.llm.stream(LLM.request({ model, messages: [Message.user(summaryPrompt)], tools: [], generation: { maxTokens } }))`,只收集 `textDelta`,providerError 或 `LLM.Error` 会让 compaction 返回 false。[E: packages/core/src/session/compaction.ts:196][E: packages/core/src/session/compaction.ts:197][E: packages/core/src/session/compaction.ts:198][E: packages/core/src/session/compaction.ts:199][E: packages/core/src/session/compaction.ts:200][E: packages/core/src/session/compaction.ts:201][E: packages/core/src/session/compaction.ts:206][E: packages/core/src/session/compaction.ts:207][E: packages/core/src/session/compaction.ts:211][E: packages/core/src/session/compaction.ts:214]

10. summary 非空时发布 `SessionEvent.Compaction.Ended`,payload 包含 summary text 与 selected recent context,并返回 true。[E: packages/core/src/session/compaction.ts:214][E: packages/core/src/session/compaction.ts:215][E: packages/core/src/session/compaction.ts:220][E: packages/core/src/session/compaction.ts:221][E: packages/core/src/session/compaction.ts:223]

11. `compactIfNeeded@packages/core/src/session/compaction.ts:230` 若 config auto 为 false、无 context limit、或 request estimate 不超过 `context - max(output, buffer)`,返回 false。[E: packages/core/src/session/compaction.ts:226][E: packages/core/src/session/compaction.ts:228][E: packages/core/src/session/compaction.ts:231][E: packages/core/src/session/compaction.ts:232]

12. pre-turn request 超出 budget 时,`compactIfNeeded` 复用 `compactAfterOverflow(input)` 执行实际 compaction。[E: packages/core/src/session/compaction.ts:235]

13. `SessionRunner.runTurnAttempt@packages/core/src/session/runner/llm.ts:210` 在 provider stream 前调用 `compactIfNeeded`;如果返回 true,runner die `continueAfterCompaction(currentStep)`,下一轮转入重新准备路径并再次读取 projected history。[E: packages/core/src/session/runner/llm.ts:205][E: packages/core/src/session/runner/llm.ts:215][E: packages/core/src/session/runner/llm.ts:216][E: packages/core/src/session/runner/llm.ts:377][I]

14. provider stream 中如果发现 context overflow 且 assistant 尚未 started,runner 只记录 `overflowFailure` 并 early return;正常 publish 位于该分支之后。[E: packages/core/src/session/runner/llm.ts:236][E: packages/core/src/session/runner/llm.ts:237][E: packages/core/src/session/runner/llm.ts:238][E: packages/core/src/session/runner/llm.ts:239][E: packages/core/src/session/runner/llm.ts:242]

15. stream exit 后,如果 recoverOverflow callback 存在、assistant 仍未 started、failure 是 context overflow,并且该 callback 成功,runner die `ContinueAfterOverflowCompaction`;这个 callback 是首次 `runTurn` 传给 `runTurnAttempt` 的 `compaction.compactAfterOverflow`。[E: packages/core/src/session/runner/llm.ts:283][E: packages/core/src/session/runner/llm.ts:284][E: packages/core/src/session/runner/llm.ts:285][E: packages/core/src/session/runner/llm.ts:286][E: packages/core/src/session/runner/llm.ts:288][E: packages/core/src/session/runner/llm.ts:370]

16. `runTurn` 对 `ContinueAfterOverflowCompaction` 进入 `runAfterOverflowCompaction`;`runAfterOverflowCompaction` 调 `runTurnAttempt(sessionID, promotion, step)` 时不传 recovery callback,并且若仍收到第二次 overflow transition 会 die `"Post-compaction provider attempt cannot recover another overflow"`。[E: packages/core/src/session/runner/llm.ts:370][E: packages/core/src/session/runner/llm.ts:375][E: packages/core/src/session/runner/llm.ts:355][E: packages/core/src/session/runner/llm.ts:356][E: packages/core/src/session/runner/llm.ts:360][E: packages/core/src/session/runner/llm.ts:361]

17. `SessionMessageUpdater` 只在 `Compaction.Ended` append `SessionMessage.Compaction`;`Compaction.Started` 和 `Compaction.Delta` 不改变 read model。[E: packages/core/src/session/message-updater.ts:375][E: packages/core/src/session/message-updater.ts:376][E: packages/core/src/session/message-updater.ts:377][E: packages/core/src/session/message-updater.ts:379]

18. `SessionProjector` 投影 `Compaction.Ended`;该 projection 会进入 read-model updater append compaction message,从而让后续 context epoch/history selection 看到 completed compaction。[E: packages/core/src/session/projector.ts:395][E: packages/core/src/session/message-updater.ts:377][E: packages/core/src/session/message-updater.ts:379][I]

19. `SessionV2.compact` manual API 当前直接返回 `OperationUnavailableError({ operation: "compact" })`,所以本节点的 running code path 是 auto/overflow,不是 user-triggered manual compact。[E: packages/core/src/session.ts:419]

## active history 与 lowering

`SessionHistory.latestCompaction` 查找最新 compaction message;`messageRows` 在有 compaction 时保留 `seq >= compaction.seq` 的 rows,并且当 `baselineSeq` 存在时也可通过 system-row 分支保留 `seq > baselineSeq` 的 later system rows。[E: packages/core/src/session/history.ts:17][E: packages/core/src/session/history.ts:18][E: packages/core/src/session/history.ts:19][E: packages/core/src/session/history.ts:38][E: packages/core/src/session/history.ts:39][E: packages/core/src/session/history.ts:41] lowering 把 compaction message 转成 user role `<conversation-checkpoint>` block,包含 summary 与 recent context。[E: packages/core/src/session/runner/to-llm-message.ts:147][E: packages/core/src/session/runner/to-llm-message.ts:149][E: packages/core/src/session/runner/to-llm-message.ts:152][E: packages/core/src/session/runner/to-llm-message.ts:159]

## 设计动机与权衡

- V2 spec 定义两路:request estimate 超预算时 pre-turn compaction,provider context overflow 且 durable assistant/tool activity 尚未发生时 overflow-triggered compaction;源码 gate 对应到 `!publisher.hasAssistantStarted()`。[E: specs/v2/session.md:109][E: specs/v2/session.md:117][E: packages/core/src/session/runner/llm.ts:237][E: packages/core/src/session/runner/llm.ts:284]
- recovery 不循环:同一 logical provider turn 的 overflow recovery 只有一次 physical retry;源码实现为 retry path 不传 `recoverOverflow`,且第二次 `ContinueAfterOverflowCompaction` transition 会 die。[E: specs/v2/session.md:117][E: packages/core/src/session/runner/llm.ts:283][E: packages/core/src/session/runner/llm.ts:286][E: packages/core/src/session/runner/llm.ts:356][E: packages/core/src/session/runner/llm.ts:361]
- provider-native assistant/reasoning/tool messages 不跨 compaction boundary 保留,避免 earlier prefix 改变后触发 signature 或 encrypted-reasoning failure。[E: specs/v2/session.md:115]

## gotcha

- `compactAfterOverflow` 的 `reason` 也写 `"auto"`,当前 event schema 支持 `"manual"`,但 manual `SessionV2.compact` 未开放。[E: packages/core/src/session/compaction.ts:190][E: packages/schema/src/session-event.ts:405][E: packages/core/src/session.ts:419]
- `Compaction.Started` durable identifies attempt,但只有 `Compaction.Ended` version 2 projects visible compaction message。[E: packages/schema/src/session-event.ts:399][E: packages/schema/src/session-event.ts:420][E: packages/schema/src/session-event.ts:472][E: packages/schema/src/session-event.ts:473][E: packages/core/src/session/message-updater.ts:377][E: packages/core/src/session/message-updater.ts:379][E: packages/core/src/session/projector.ts:395]
- `select` 过滤掉旧 compaction messages 后再 serialize conversation,但 `compactAfterOverflow` 仍会读取 previous compaction summary/recent 用来 update anchored summary。[E: packages/core/src/session/compaction.ts:133][E: packages/core/src/session/compaction.ts:134][E: packages/core/src/session/compaction.ts:177][E: packages/core/src/session/compaction.ts:180][E: packages/core/src/session/compaction.ts:181]

## Sources
- packages/core/src/session/compaction.ts
- packages/core/src/session/runner/llm.ts
- packages/core/src/session/message-updater.ts
- packages/core/src/session/projector.ts
- packages/core/src/session/history.ts
- packages/core/src/session/runner/to-llm-message.ts
- packages/schema/src/session-event.ts
- packages/core/src/session.ts
- specs/v2/session.md

## 相关
- [spine.trace-compaction-overflow](../../spine/trace-compaction-overflow.md)
- [session-v1.compaction-overflow](../session-v1/compaction-overflow.md)
