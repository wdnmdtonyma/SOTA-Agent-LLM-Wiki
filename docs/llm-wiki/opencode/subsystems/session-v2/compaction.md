---
id: session-v2.compaction
title: V2 自动/溢出压缩
kind: subsystem
tier: T2
v: v2
source: [packages/core/src/session/compaction.ts, packages/core/src/session/runner/llm.ts, packages/core/src/session/message-updater.ts, packages/core/src/session/projector.ts, packages/core/src/session/history.ts, packages/core/src/session/runner/to-llm-message.ts, packages/core/src/session/event.ts, packages/core/src/session.ts, specs/v2/session.md]
symbols: [SessionCompaction, SessionCompaction.make, compactIfNeeded, compactAfterOverflow, buildPrompt, serialize, select]
related: [spine.trace-compaction-overflow, session-v1.compaction-overflow]
evidence: explicit
status: verified
updated: 92c70c9c3
---

> V2 compaction 有两条执行路径:provider request 前的 `compactIfNeeded` 估算触发,以及 provider context overflow 且 assistant 尚未 started 时的 `compactAfterOverflow` recovery。

## 能回答的问题
- V2 自动压缩什么时候触发?
- provider overflow 后为什么只允许一次 recovery?
- compaction summary prompt 的结构是什么?
- `Compaction.Started/Ended` 哪个事件会投影成 provider-visible checkpoint?
- `SessionV2.compact` manual API 当前是否可用?

## 职责边界

`SessionCompaction.make` 接收 EventV2 publisher、LLM stream function 与 config documents,返回 `compactIfNeeded` 和 `compactAfterOverflow` 两个函数。[E: packages/core/src/session/compaction.ts:65][E: packages/core/src/session/compaction.ts:67][E: packages/core/src/session/compaction.ts:69][E: packages/core/src/session/compaction.ts:243][E: packages/core/src/session/compaction.ts:244] Runner 在 pre-turn 直接调用 `compactIfNeeded`;首次 `runTurn` 把 `compactAfterOverflow` 作为 `recoverOverflow` callback 传入 `runTurnAttempt`,而 post-compaction retry path 调 `runTurnAttempt(sessionID, promotion)` 时不再传第三参。history selection 与 message lowering 决定 completed compaction 后的 active model representation。[E: packages/core/src/session/runner/llm.ts:228][E: packages/core/src/session/runner/llm.ts:292][E: packages/core/src/session/runner/llm.ts:295][E: packages/core/src/session/runner/llm.ts:360][E: packages/core/src/session/runner/llm.ts:346][E: packages/core/src/session/history.ts:38][E: packages/core/src/session/history.ts:95][E: packages/core/src/session/runner/to-llm-message.ts:130][E: packages/core/src/session/runner/to-llm-message.ts:134][E: packages/core/src/session/runner/to-llm-message.ts:138]

V2 session spec 说明 completed compaction 保留 durable full transcript,但把 active model representation 替换为一个 checkpoint,包含 rolling summary 和 token-bounded recent context。[E: specs/v2/session.md:111]

## 数据模型与设置

| 常量/字段 | 值或来源 | 含义 |
|---|---|---|
| `DEFAULT_BUFFER` | `20_000` | context reserve fallback。[E: packages/core/src/session/compaction.ts:12] |
| `DEFAULT_KEEP_TOKENS` | `8_000` | recent context keep budget fallback。[E: packages/core/src/session/compaction.ts:13] |
| `TOOL_OUTPUT_MAX_CHARS` | `2_000` | summary serialization 内 tool/shell output preview cap。[E: packages/core/src/session/compaction.ts:14][E: packages/core/src/session/compaction.ts:82] |
| `SUMMARY_OUTPUT_TOKENS` | `4_096` | summary generation max cap。[E: packages/core/src/session/compaction.ts:15] |
| `Settings.auto` | config `compaction.auto`,default true | 是否允许 `compactIfNeeded` pre-turn auto compaction。[E: packages/core/src/session/compaction.ts:122][E: packages/core/src/session/compaction.ts:125][E: packages/core/src/session/compaction.ts:129] |
| `Settings.buffer` | config `compaction.buffer`,default `DEFAULT_BUFFER` | request budget reserve。[E: packages/core/src/session/compaction.ts:126][E: packages/core/src/session/compaction.ts:129] |
| `Settings.tokens` | config `compaction.keep.tokens`,default `DEFAULT_KEEP_TOKENS` | recent serialized context keep budget。[E: packages/core/src/session/compaction.ts:127][E: packages/core/src/session/compaction.ts:129] |

`SUMMARY_TEMPLATE` 要求输出固定 Markdown sections:Goal、Constraints & Preferences、Progress、Key Decisions、Next Steps、Critical Context、Relevant Files,并要求保留 exact file paths、commands、error strings、identifiers。[E: packages/core/src/session/compaction.ts:18][E: packages/core/src/session/compaction.ts:21][E: packages/core/src/session/compaction.ts:24][E: packages/core/src/session/compaction.ts:34][E: packages/core/src/session/compaction.ts:37][E: packages/core/src/session/compaction.ts:40][E: packages/core/src/session/compaction.ts:43][E: packages/core/src/session/compaction.ts:50]

## 控制流

1. `settings@packages/core/src/session/compaction.ts:119` 从 config documents 中收集 document-level `info.compaction`,用 reduce 合并 auto/buffer/keep.tokens,默认 `{ auto: true, buffer: 20000, tokens: 8000 }`。[E: packages/core/src/session/compaction.ts:121][E: packages/core/src/session/compaction.ts:122][E: packages/core/src/session/compaction.ts:125][E: packages/core/src/session/compaction.ts:126][E: packages/core/src/session/compaction.ts:127][E: packages/core/src/session/compaction.ts:129]

2. `serialize@packages/core/src/session/compaction.ts:91` 把 user/assistant/system/synthetic/shell messages 转成 plain text transcript;assistant completed tool call 包含 bounded tool result,error tool call 包含 raw error message。[E: packages/core/src/session/compaction.ts:94][E: packages/core/src/session/compaction.ts:99][E: packages/core/src/session/compaction.ts:104][E: packages/core/src/session/compaction.ts:105][E: packages/core/src/session/compaction.ts:108][E: packages/core/src/session/compaction.ts:113][E: packages/core/src/session/compaction.ts:114][E: packages/core/src/session/compaction.ts:115][E: packages/core/src/session/compaction.ts:82]

3. `select@packages/core/src/session/compaction.ts:133` 过滤掉 existing compaction messages,从 conversation 尾部向前累计 token estimate,把 older prefix 放入 `head`,把 retained suffix 放入 `recent`。[E: packages/core/src/session/compaction.ts:138][E: packages/core/src/session/compaction.ts:139][E: packages/core/src/session/compaction.ts:146][E: packages/core/src/session/compaction.ts:147][E: packages/core/src/session/compaction.ts:161][E: packages/core/src/session/compaction.ts:162]

4. `buildPrompt@packages/core/src/session/compaction.ts:166` 在已有 previous summary 时要求 update anchored summary,否则要求 create new anchored summary;随后拼接 `SUMMARY_TEMPLATE` 与 selected context。[E: packages/core/src/session/compaction.ts:169][E: packages/core/src/session/compaction.ts:170][E: packages/core/src/session/compaction.ts:171][E: packages/core/src/session/compaction.ts:172]

5. `compactAfterOverflow@packages/core/src/session/compaction.ts:177` 先读取 model context limit;没有 context limit 或 limit <= 0 返回 false。[E: packages/core/src/session/compaction.ts:178][E: packages/core/src/session/compaction.ts:179]

6. `compactAfterOverflow` 选择 recent/head 与 previous compaction summary;如果没有 selected head 且也没有 previous compaction summary,返回 false。[E: packages/core/src/session/compaction.ts:181][E: packages/core/src/session/compaction.ts:182][E: packages/core/src/session/compaction.ts:183]

7. `compactAfterOverflow` 构造 summary prompt,把 summary output 限到 `Math.min(output || 4096, 4096)`,其中 `output` 来自 request maxTokens、model output default 或 0;当 prompt 估算超过 `context - summaryOutput` 时返回 false。[E: packages/core/src/session/compaction.ts:180][E: packages/core/src/session/compaction.ts:184][E: packages/core/src/session/compaction.ts:188][E: packages/core/src/session/compaction.ts:189]

8. compaction 尝试开始时创建 `SessionMessage.ID`,发布 `SessionEvent.Compaction.Started` with reason `"auto"`。[E: packages/core/src/session/compaction.ts:190][E: packages/core/src/session/compaction.ts:191][E: packages/core/src/session/compaction.ts:195]

9. summary generation 调 `dependencies.llm.stream(LLM.request({ model, messages: [Message.user(summaryPrompt)], tools: [], generation: { maxTokens } }))`,只收集 `textDelta`,providerError 或 `LLM.Error` 会让 compaction 返回 false。[E: packages/core/src/session/compaction.ts:201][E: packages/core/src/session/compaction.ts:202][E: packages/core/src/session/compaction.ts:203][E: packages/core/src/session/compaction.ts:204][E: packages/core/src/session/compaction.ts:205][E: packages/core/src/session/compaction.ts:206][E: packages/core/src/session/compaction.ts:211][E: packages/core/src/session/compaction.ts:212][E: packages/core/src/session/compaction.ts:216][E: packages/core/src/session/compaction.ts:219]

10. summary 非空时发布 `SessionEvent.Compaction.Ended`,payload 包含 summary text 与 selected recent context,并返回 true。[E: packages/core/src/session/compaction.ts:219][E: packages/core/src/session/compaction.ts:220][E: packages/core/src/session/compaction.ts:225][E: packages/core/src/session/compaction.ts:226][E: packages/core/src/session/compaction.ts:228]

11. `compactIfNeeded@packages/core/src/session/compaction.ts:230` 若 config auto 为 false、无 context limit、或 request estimate 不超过 `context - max(output, buffer)`,返回 false。[E: packages/core/src/session/compaction.ts:231][E: packages/core/src/session/compaction.ts:233][E: packages/core/src/session/compaction.ts:236][E: packages/core/src/session/compaction.ts:237]

12. pre-turn request 超出 budget 时,`compactIfNeeded` 复用 `compactAfterOverflow(input)` 执行实际 compaction。[E: packages/core/src/session/compaction.ts:240]

13. `SessionRunner.runTurnAttempt@packages/core/src/session/runner/llm.ts:228` 在 provider stream 前调用 `compactIfNeeded`;如果返回 true,runner die `rebuildPreparedTurn()`,下一轮转入重新准备路径并再次读取 projected history。[E: packages/core/src/session/runner/llm.ts:215][E: packages/core/src/session/runner/llm.ts:228][E: packages/core/src/session/runner/llm.ts:229][E: packages/core/src/session/runner/llm.ts:367][I]

14. provider stream 中如果发现 context overflow 且 assistant 尚未 started,runner 只记录 `overflowFailure` 并 early return;正常 publish 位于该分支之后。[E: packages/core/src/session/runner/llm.ts:249][E: packages/core/src/session/runner/llm.ts:250][E: packages/core/src/session/runner/llm.ts:251][E: packages/core/src/session/runner/llm.ts:252][E: packages/core/src/session/runner/llm.ts:255]

15. stream exit 后,如果 recoverOverflow callback 存在、assistant 仍未 started、failure 是 context overflow,并且该 callback 成功,runner die `ContinueAfterOverflowCompaction`;这个 callback 是首次 `runTurn` 传给 `runTurnAttempt` 的 `compaction.compactAfterOverflow`。[E: packages/core/src/session/runner/llm.ts:292][E: packages/core/src/session/runner/llm.ts:293][E: packages/core/src/session/runner/llm.ts:294][E: packages/core/src/session/runner/llm.ts:295][E: packages/core/src/session/runner/llm.ts:297][E: packages/core/src/session/runner/llm.ts:360]

16. `runTurn` 对 `ContinueAfterOverflowCompaction` 进入 `runAfterOverflowCompaction`;`runAfterOverflowCompaction` 调 `runTurnAttempt(sessionID, promotion)` 时不传 recovery callback,并且若仍收到第二次 overflow transition 会 die `"Post-compaction provider attempt cannot recover another overflow"`。[E: packages/core/src/session/runner/llm.ts:365][E: packages/core/src/session/runner/llm.ts:366][E: packages/core/src/session/runner/llm.ts:346][E: packages/core/src/session/runner/llm.ts:350][E: packages/core/src/session/runner/llm.ts:351]

17. `SessionMessageUpdater` 只在 `Compaction.Ended` append `SessionMessage.Compaction`;`Compaction.Started` 和 `Compaction.Delta` 不改变 read model。[E: packages/core/src/session/message-updater.ts:370][E: packages/core/src/session/message-updater.ts:371][E: packages/core/src/session/message-updater.ts:373][E: packages/core/src/session/message-updater.ts:374]

18. `SessionProjector` 在 `Compaction.Ended` version 2 projection 后调用 `SessionContextEpoch.requestReplacement`,使 completed compaction 开启新的 baseline replacement request。[E: packages/core/src/session/projector.ts:439][E: packages/core/src/session/projector.ts:443][E: packages/core/src/session/projector.ts:444]

19. `SessionV2.compact` manual API 当前直接返回 `OperationUnavailableError({ operation: "compact" })`,所以本节点的 running code path 是 auto/overflow,不是 user-triggered manual compact。[E: packages/core/src/session.ts:397]

## active history 与 lowering

`SessionHistory.latestCompaction` 查找最新 compaction message;`messageRows` 在有 compaction 时保留 `seq >= compaction.seq` 的 rows,并且当 `baselineSeq` 存在时也可通过 system-row 分支保留 `seq > baselineSeq` 的 later system rows。[E: packages/core/src/session/history.ts:17][E: packages/core/src/session/history.ts:18][E: packages/core/src/session/history.ts:19][E: packages/core/src/session/history.ts:38][E: packages/core/src/session/history.ts:39][E: packages/core/src/session/history.ts:41] lowering 把 compaction message 转成 user role `<conversation-checkpoint>` block,包含 summary 与 recent context。[E: packages/core/src/session/runner/to-llm-message.ts:129][E: packages/core/src/session/runner/to-llm-message.ts:130][E: packages/core/src/session/runner/to-llm-message.ts:134][E: packages/core/src/session/runner/to-llm-message.ts:138]

## 设计动机与权衡

- V2 spec 定义两路:request estimate 超预算时 pre-turn compaction,provider context overflow 且 durable assistant/tool activity 尚未发生时 overflow-triggered compaction;源码 gate 对应到 `!publisher.hasAssistantStarted()`。[E: specs/v2/session.md:109][E: specs/v2/session.md:117][E: packages/core/src/session/runner/llm.ts:250][E: packages/core/src/session/runner/llm.ts:293]
- recovery 不循环:同一 logical provider turn 的 overflow recovery 只有一次 physical retry;源码实现为 retry path 不传 `recoverOverflow`,且第二次 `ContinueAfterOverflowCompaction` transition 会 die。[E: specs/v2/session.md:117][E: packages/core/src/session/runner/llm.ts:292][E: packages/core/src/session/runner/llm.ts:295][E: packages/core/src/session/runner/llm.ts:346][E: packages/core/src/session/runner/llm.ts:351]
- provider-native assistant/reasoning/tool messages 不跨 compaction boundary 保留,避免 earlier prefix 改变后触发 signature 或 encrypted-reasoning failure。[E: specs/v2/session.md:111]

## gotcha

- `compactAfterOverflow` 的 `reason` 也写 `"auto"`,当前 event schema 支持 `"manual"`,但 manual `SessionV2.compact` 未开放。[E: packages/core/src/session/compaction.ts:195][E: packages/core/src/session/event.ts:431][E: packages/core/src/session.ts:397]
- `Compaction.Started` durable identifies attempt,但只有 `Compaction.Ended` version 2 projects visible compaction message and requests Context Epoch replacement。[E: packages/core/src/session/event.ts:425][E: packages/core/src/session/event.ts:430][E: packages/core/src/session/event.ts:497][E: packages/core/src/session/message-updater.ts:373][E: packages/core/src/session/message-updater.ts:374][E: packages/core/src/session/projector.ts:439][E: packages/core/src/session/projector.ts:444]
- `select` 过滤掉旧 compaction messages 后再 serialize conversation,但 `compactAfterOverflow` 仍会读取 previous compaction summary/recent 用来 update anchored summary。[E: packages/core/src/session/compaction.ts:138][E: packages/core/src/session/compaction.ts:139][E: packages/core/src/session/compaction.ts:182][E: packages/core/src/session/compaction.ts:185][E: packages/core/src/session/compaction.ts:186]

## Sources
- packages/core/src/session/compaction.ts
- packages/core/src/session/runner/llm.ts
- packages/core/src/session/message-updater.ts
- packages/core/src/session/projector.ts
- packages/core/src/session/history.ts
- packages/core/src/session/runner/to-llm-message.ts
- packages/core/src/session/event.ts
- packages/core/src/session.ts
- specs/v2/session.md

## 相关
- [spine.trace-compaction-overflow](../../spine/trace-compaction-overflow.md)
- [session-v1.compaction-overflow](../session-v1/compaction-overflow.md)
