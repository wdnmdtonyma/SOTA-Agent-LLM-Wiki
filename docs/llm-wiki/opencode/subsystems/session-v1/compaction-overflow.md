---
id: session-v1.compaction-overflow
title: V1 压缩/剪枝/溢出
kind: subsystem
tier: T2
v: v1
source: [packages/opencode/src/session/compaction.ts, packages/opencode/src/session/overflow.ts, packages/opencode/src/session/summary.ts, packages/opencode/src/session/prompt.ts, packages/opencode/src/session/processor.ts, packages/opencode/src/session/message-v2.ts, specs/v2/session.md]
symbols: [SessionCompaction, SessionCompaction.create, SessionCompaction.process, SessionCompaction.prune, SessionCompaction.isOverflow, isOverflow, usable, SessionSummary.computeDiff, MessageV2.filterCompacted]
related: [session-v2.compaction]
evidence: explicit
status: verified
updated: 92c70c9c3
---

> V1 compaction 是 `SessionPrompt.runLoop` 内的历史缩短机制:overflow 或 queued compaction 会写一个 V1 compaction user part,再用 compaction agent 生成 assistant summary,最后由 `MessageV2.filterCompacted` 选择下一次 provider request 的 active history。

## 能回答的问题
- V1 什么时候判定上下文溢出并触发 auto compaction?
- `SessionCompaction.create` 写入的 compaction user part 长什么样?
- `SessionCompaction.process` 怎样选择 head、tail、previous summary 和 replay prompt?
- V1 prune 只清哪些旧 tool output?
- V1 compaction 与 V2 `session-v2.compaction` 的模型表示差异在哪里?

## 职责边界

`SessionCompaction.Interface` 暴露四个操作:`isOverflow` 读取 config/model 判断 usage 是否超预算;`prune` 后台清旧 tool output;`process` 执行 queued compaction task;`create` 写入 queued compaction user part。[E: packages/opencode/src/session/compaction.ts:140][E: packages/opencode/src/session/compaction.ts:145][E: packages/opencode/src/session/compaction.ts:146][E: packages/opencode/src/session/compaction.ts:153]

V1 overflow 判断的数学规则在 `overflow.ts`:如果 `compaction.auto === false` 或 model context 为 0,永远不 overflow;否则 token count 使用 `tokens.total` 或 input+output+cache.read+cache.write,并与 `usable(input)` 比较。[E: packages/opencode/src/session/overflow.ts:22][E: packages/opencode/src/session/overflow.ts:28][E: packages/opencode/src/session/overflow.ts:29][E: packages/opencode/src/session/overflow.ts:31][E: packages/opencode/src/session/overflow.ts:32][E: packages/opencode/src/session/overflow.ts:33]

`usable(input)` 对有 `model.limit.input` 的模型从 input limit 扣掉 `reserved`;`reserved` 来自 config `compaction.reserved`,否则取 `min(20_000, ProviderTransform.maxOutputTokens(...))`。没有 input limit 时,usable context 是 `context - ProviderTransform.maxOutputTokens(...)`,不使用 config reserved。[E: packages/opencode/src/session/overflow.ts:8][E: packages/opencode/src/session/overflow.ts:10][E: packages/opencode/src/session/overflow.ts:14][E: packages/opencode/src/session/overflow.ts:15][E: packages/opencode/src/session/overflow.ts:16][E: packages/opencode/src/session/overflow.ts:17][E: packages/opencode/src/session/overflow.ts:18][E: packages/opencode/src/session/overflow.ts:19]

## 数据模型与常量

| 名称 | 值/来源 | 含义 |
|---|---|---|
| `PRUNE_MINIMUM` | `20_000` | 旧 tool output 被估算可释放超过此值才实际标记 compacted。[E: packages/opencode/src/session/compaction.ts:38][E: packages/opencode/src/session/compaction.ts:288] |
| `PRUNE_PROTECT` | `40_000` | prune 从后往前累计 tool output,先保护最近约 40k token。[E: packages/opencode/src/session/compaction.ts:39][E: packages/opencode/src/session/compaction.ts:281] |
| `TOOL_OUTPUT_MAX_CHARS` | `2_000` | summary prompt 构建时 tool output preview 最大字符数。[E: packages/opencode/src/session/compaction.ts:40][E: packages/opencode/src/session/compaction.ts:361][E: packages/opencode/src/session/compaction.ts:363] |
| `DEFAULT_TAIL_TURNS` | `2` | 没有 config override 时,select 以最近 2 个 user turns 作为 tail candidate。[E: packages/opencode/src/session/compaction.ts:42][E: packages/opencode/src/session/compaction.ts:203][E: packages/opencode/src/session/compaction.ts:208] |
| `MIN/MAX_PRESERVE_RECENT_TOKENS` | `2_000` / `8_000` | tail budget fallback clamp,默认取 usable context 的 25%。[E: packages/opencode/src/session/compaction.ts:43][E: packages/opencode/src/session/compaction.ts:44][E: packages/opencode/src/session/compaction.ts:90][E: packages/opencode/src/session/compaction.ts:93] |
| `SessionV1.CompactionPart` | `type: "compaction"`, `auto`, `overflow`, optional `tail_start_id` | queued compaction 是 V1 user message 的 part;summary 完成后可能写入 retained tail 起点。[E: packages/opencode/src/session/compaction.ts:569][E: packages/opencode/src/session/compaction.ts:573][E: packages/opencode/src/session/compaction.ts:574][E: packages/opencode/src/session/compaction.ts:575][E: packages/opencode/src/session/compaction.ts:437][E: packages/opencode/src/session/compaction.ts:440] |

## 控制流

1. provider stream 正常结束时,`SessionProcessor` 在 `step-finish` 计算 usage 后调用 `isOverflow({ cfg, tokens, model })`;命中则把 `ctx.needsCompaction` 设为 true。[E: packages/opencode/src/session/processor.ts:693][E: packages/opencode/src/session/processor.ts:696][E: packages/opencode/src/session/processor.ts:750][E: packages/opencode/src/session/processor.ts:752][E: packages/opencode/src/session/processor.ts:754]

2. provider 或 adapter 抛出 context overflow 时,`SessionProcessor.halt` 通过 local `parse(e)` 调 `MessageV2.fromError(...)`。如果 `compaction.auto === false` 且 assistant 不是 summary,它把 assistant 置为 terminal error 并设 idle;其它 context-overflow 情况设置 `ctx.needsCompaction = true` 并发布 session error。[E: packages/opencode/src/session/processor.ts:132][E: packages/opencode/src/session/processor.ts:133][E: packages/opencode/src/session/processor.ts:924][E: packages/opencode/src/session/processor.ts:926][E: packages/opencode/src/session/processor.ts:927][E: packages/opencode/src/session/processor.ts:928][E: packages/opencode/src/session/processor.ts:929][E: packages/opencode/src/session/processor.ts:931][E: packages/opencode/src/session/processor.ts:934][E: packages/opencode/src/session/processor.ts:935]

3. `SessionProcessor.process` 因 `ctx.needsCompaction` 返回 `"compact"`;`SessionPrompt.runLoop` 收到 `"compact"` 后调用 `compaction.create({ auto: true, overflow: !handle.message.finish })`。[E: packages/opencode/src/session/processor.ts:1030][E: packages/opencode/src/session/prompt.ts:1368][E: packages/opencode/src/session/prompt.ts:1369][E: packages/opencode/src/session/prompt.ts:1370][E: packages/opencode/src/session/prompt.ts:1375]

4. `SessionPrompt.runLoop` 在新 step 开始时也会检查上一个 finished assistant 的 tokens;如果不是 summary 且 `compaction.isOverflow(...)` 命中,它创建 auto compaction task 并继续下一轮。[E: packages/opencode/src/session/prompt.ts:1214][E: packages/opencode/src/session/prompt.ts:1215][E: packages/opencode/src/session/prompt.ts:1216][E: packages/opencode/src/session/prompt.ts:1217][E: packages/opencode/src/session/prompt.ts:1219]

5. `SessionCompaction.create` 写一个新的 V1 user message,再写 `type: "compaction"` part;如果 `experimentalEventSystem` 开启,它同时发布 V2 `SessionEvent.Compaction.Started`。[E: packages/opencode/src/session/compaction.ts:554][E: packages/opencode/src/session/compaction.ts:561][E: packages/opencode/src/session/compaction.ts:563][E: packages/opencode/src/session/compaction.ts:569][E: packages/opencode/src/session/compaction.ts:573][E: packages/opencode/src/session/compaction.ts:577][E: packages/opencode/src/session/compaction.ts:578]

6. 下一轮 `runLoop` 读取 `MessageV2.latest(msgs)` 的 tasks;若 pop 到 compaction task,调用 `compaction.process({ messages, parentID, auto, overflow })`。[E: packages/opencode/src/session/prompt.ts:1149][E: packages/opencode/src/session/prompt.ts:1195][E: packages/opencode/src/session/prompt.ts:1202][E: packages/opencode/src/session/prompt.ts:1203][E: packages/opencode/src/session/prompt.ts:1207][E: packages/opencode/src/session/prompt.ts:1208]

7. `processCompaction` 要求 parent 是 user message,并读取 parent 上的 compaction part;overflow 模式会尝试向前寻找最近一个非 compaction user message 作为 `replay`,同时把待总结 messages 截断到 replay 之前;若截断后没有更早的 non-compaction user content,则放弃 replay 并恢复完整 messages。[E: packages/opencode/src/session/compaction.ts:299][E: packages/opencode/src/session/compaction.ts:306][E: packages/opencode/src/session/compaction.ts:307][E: packages/opencode/src/session/compaction.ts:311][E: packages/opencode/src/session/compaction.ts:320][E: packages/opencode/src/session/compaction.ts:324][E: packages/opencode/src/session/compaction.ts:325][E: packages/opencode/src/session/compaction.ts:326][E: packages/opencode/src/session/compaction.ts:330][E: packages/opencode/src/session/compaction.ts:331][E: packages/opencode/src/session/compaction.ts:333][E: packages/opencode/src/session/compaction.ts:334]

8. compaction agent 选择 agent `"compaction"`;如果该 agent 有 model 用 agent model,否则复用 user message model。[E: packages/opencode/src/session/compaction.ts:338][E: packages/opencode/src/session/compaction.ts:339][E: packages/opencode/src/session/compaction.ts:340][E: packages/opencode/src/session/compaction.ts:341]

9. `select` 以 configured `tail_turns` 和 `preserve_recent_tokens`/fallback budget 选择需要总结的 `head` 与可保留的 `tail_start_id`;当最新完整 turns 超预算时,它会尝试在一个 turn 内 `splitTurn` 找可保留尾部。[E: packages/opencode/src/session/compaction.ts:198][E: packages/opencode/src/session/compaction.ts:203][E: packages/opencode/src/session/compaction.ts:205][E: packages/opencode/src/session/compaction.ts:208][E: packages/opencode/src/session/compaction.ts:221][E: packages/opencode/src/session/compaction.ts:230][E: packages/opencode/src/session/compaction.ts:237][E: packages/opencode/src/session/compaction.ts:244][E: packages/opencode/src/session/compaction.ts:246]

10. `processCompaction` 隐藏已完成 compaction 的 user/assistant pair,读取 previous summary,触发 `experimental.session.compacting` plugin hook,然后用 core `buildPrompt({ previousSummary, context })` 或 plugin prompt 作为 summary prompt。[E: packages/opencode/src/session/compaction.ts:343][E: packages/opencode/src/session/compaction.ts:344][E: packages/opencode/src/session/compaction.ts:345][E: packages/opencode/src/session/compaction.ts:346][E: packages/opencode/src/session/compaction.ts:348][E: packages/opencode/src/session/compaction.ts:353][E: packages/opencode/src/session/compaction.ts:358]

11. summary prompt 的历史输入来自 `MessageV2.toModelMessagesEffect(msgs, model, { stripMedia: true, toolOutputMaxChars: 2000 })`;retained recent context 也用相同转换后 JSON.stringify。[E: packages/opencode/src/session/compaction.ts:359][E: packages/opencode/src/session/compaction.ts:361][E: packages/opencode/src/session/compaction.ts:362][E: packages/opencode/src/session/compaction.ts:363][E: packages/opencode/src/session/compaction.ts:368][E: packages/opencode/src/session/compaction.ts:371][E: packages/opencode/src/session/compaction.ts:372]

12. compaction 自身创建 `summary: true` assistant message,用 `SessionProcessor` 执行一次无工具、无 system 的 model call,消息列表为 selected head 的 model messages 加一条 user summary prompt。[E: packages/opencode/src/session/compaction.ts:378][E: packages/opencode/src/session/compaction.ts:383][E: packages/opencode/src/session/compaction.ts:386][E: packages/opencode/src/session/compaction.ts:404][E: packages/opencode/src/session/compaction.ts:405][E: packages/opencode/src/session/compaction.ts:410][E: packages/opencode/src/session/compaction.ts:414][E: packages/opencode/src/session/compaction.ts:415][E: packages/opencode/src/session/compaction.ts:417][E: packages/opencode/src/session/compaction.ts:419][E: packages/opencode/src/session/compaction.ts:420]

13. 如果 compaction model call 自己又返回 `"compact"`,V1 将 summary assistant 标成 `ContextOverflowError` 并停止,避免递归压缩。[E: packages/opencode/src/session/compaction.ts:426][E: packages/opencode/src/session/compaction.ts:427][E: packages/opencode/src/session/compaction.ts:432][E: packages/opencode/src/session/compaction.ts:433][E: packages/opencode/src/session/compaction.ts:434]

14. compaction 成功且 auto 时,overflow replay 会把原始 user prompt 克隆成新的 user message;非 replay auto compaction 可能追加 synthetic continue user message,其文本要求模型继续下一步或请求澄清。[E: packages/opencode/src/session/compaction.ts:444][E: packages/opencode/src/session/compaction.ts:445][E: packages/opencode/src/session/compaction.ts:447][E: packages/opencode/src/session/compaction.ts:458][E: packages/opencode/src/session/compaction.ts:473][E: packages/opencode/src/session/compaction.ts:495][E: packages/opencode/src/session/compaction.ts:503][E: packages/opencode/src/session/compaction.ts:507][E: packages/opencode/src/session/compaction.ts:516]

15. compaction 成功时,experimental event system gate 下只有 `summary` 非空才发布 `SessionEvent.Compaction.Ended`,payload 含 summary text 和 recent serialized context;无论 experimental gate 与否都会发布 legacy-ish `session.compacted` event。[E: packages/opencode/src/session/compaction.ts:528][E: packages/opencode/src/session/compaction.ts:538][E: packages/opencode/src/session/compaction.ts:539][E: packages/opencode/src/session/compaction.ts:540][E: packages/opencode/src/session/compaction.ts:545][E: packages/opencode/src/session/compaction.ts:546][E: packages/opencode/src/session/compaction.ts:549]

## active history 过滤

`MessageV2.filterCompacted` 从数据库 stream 中找 completed summary assistant 和 compaction user part;如果 compaction part 有 `tail_start_id`,它把 active model history 重排成 compaction user、summary assistant、retained tail、后续消息。[E: packages/opencode/src/session/message-v2.ts:532][E: packages/opencode/src/session/message-v2.ts:542][E: packages/opencode/src/session/message-v2.ts:552][E: packages/opencode/src/session/message-v2.ts:556][E: packages/opencode/src/session/message-v2.ts:574][E: packages/opencode/src/session/message-v2.ts:575][E: packages/opencode/src/session/message-v2.ts:576][E: packages/opencode/src/session/message-v2.ts:578]

`MessageV2.latest` 用 max message id 而不是数组位置来找 latest user/assistant/finished;这与 `filterCompacted` 可能重排 active history 的实现相匹配。[I] queued tasks 只来自最新 finished assistant 之后的 compaction/subtask parts。[E: packages/opencode/src/session/message-v2.ts:596][E: packages/opencode/src/session/message-v2.ts:602][E: packages/opencode/src/session/message-v2.ts:603][E: packages/opencode/src/session/message-v2.ts:604][E: packages/opencode/src/session/message-v2.ts:606][E: packages/opencode/src/session/message-v2.ts:607][E: packages/opencode/src/session/message-v2.ts:609]

## prune 与 diff summary

`SessionCompaction.prune` 只有 config `compaction.prune` 打开才运行;它从最新消息向前扫描,跳过最近两个 user turns,遇到 summary assistant 或已经 compacted 的 tool output 就停止,并保护 `skill` tool。[E: packages/opencode/src/session/compaction.ts:253][E: packages/opencode/src/session/compaction.ts:255][E: packages/opencode/src/session/compaction.ts:268][E: packages/opencode/src/session/compaction.ts:270][E: packages/opencode/src/session/compaction.ts:271][E: packages/opencode/src/session/compaction.ts:272][E: packages/opencode/src/session/compaction.ts:277][E: packages/opencode/src/session/compaction.ts:278] 实际 prune 不是删除 part,而是在 completed tool part 的 `state.time.compacted` 上写时间戳;`MessageV2.toModelMessagesEffect` 看到该字段会把旧 output 替换成 `[Old tool result content cleared]`。[E: packages/opencode/src/session/compaction.ts:290][E: packages/opencode/src/session/compaction.ts:291][E: packages/opencode/src/session/message-v2.ts:304][E: packages/opencode/src/session/message-v2.ts:305]

`SessionSummary.computeDiff` 与 compaction 不是同一个 summary:`computeDiff` 根据 step-start/step-finish snapshot 计算文件 diff;`summarize` 调用它后把 diff 写回 user message summary。[E: packages/opencode/src/session/summary.ts:82][E: packages/opencode/src/session/summary.ts:88][E: packages/opencode/src/session/summary.ts:95][E: packages/opencode/src/session/summary.ts:98][E: packages/opencode/src/session/summary.ts:102][E: packages/opencode/src/session/summary.ts:124][E: packages/opencode/src/session/summary.ts:125][E: packages/opencode/src/session/summary.ts:126]

## V1 与 V2 对照

V1 compaction 的 durable model representation 仍是 V1 message/part history:queued compaction 是 user part,summary 是 assistant message,active history 由 `MessageV2.filterCompacted` 在读模型时重排。[E: packages/opencode/src/session/compaction.ts:561][E: packages/opencode/src/session/compaction.ts:573][E: packages/opencode/src/session/compaction.ts:378][E: packages/opencode/src/session/message-v2.ts:576]

V2 spec 的目标则是保持 full transcript durable,但把 active model representation 替换为一个 checkpoint;completed compaction event 才投影模型可见 checkpoint,失败或中断不会切换历史边界。[E: specs/v2/session.md:111][E: specs/v2/session.md:113] 因此本节点描述的是 V1 当前活跑路径,V2 细节属于 `session-v2.compaction`。

## gotcha

- `SessionCompaction.create` 只创建 queued compaction part,不直接生成 summary;真正 summary generation 发生在下一轮 `runLoop` pop 到 compaction task 后。[E: packages/opencode/src/session/compaction.ts:561][E: packages/opencode/src/session/compaction.ts:569][E: packages/opencode/src/session/compaction.ts:573][E: packages/opencode/src/session/compaction.ts:575][E: packages/opencode/src/session/prompt.ts:1203][E: packages/opencode/src/session/prompt.ts:1204][E: packages/opencode/src/session/prompt.ts:1208]
- compaction summary assistant 禁止 tool call,因为 processor 在 summary assistant 的 `tool-input-start` 和 `tool-call` path 都会抛错。[E: packages/opencode/src/session/processor.ts:428][E: packages/opencode/src/session/processor.ts:429][E: packages/opencode/src/session/processor.ts:469][E: packages/opencode/src/session/processor.ts:470]
- overflow replay 会把 media file part 降级成 text `[Attached mime: filename]`,避免压缩后继续携带过大的 media payload。[E: packages/opencode/src/session/compaction.ts:461][E: packages/opencode/src/session/compaction.ts:462]

## Sources
- packages/opencode/src/session/compaction.ts
- packages/opencode/src/session/overflow.ts
- packages/opencode/src/session/summary.ts
- packages/opencode/src/session/prompt.ts
- packages/opencode/src/session/processor.ts
- packages/opencode/src/session/message-v2.ts
- specs/v2/session.md

## 相关
- [session-v2.compaction](../session-v2/compaction.md)
