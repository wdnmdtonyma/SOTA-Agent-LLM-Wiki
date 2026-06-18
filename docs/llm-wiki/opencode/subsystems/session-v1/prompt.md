---
id: session-v1.prompt
title: SessionPrompt 编排器(V1)
kind: subsystem
tier: T2
v: v1
source: [packages/opencode/src/session/prompt.ts, packages/opencode/src/session/run-state.ts, packages/opencode/src/session/tools.ts, packages/opencode/src/session/message-v2.ts, packages/opencode/src/effect/runtime-flags.ts]
symbols: [SessionPrompt, SessionPrompt.prompt, SessionPrompt.loop, SessionPrompt.command, SessionPrompt.shell, SessionPrompt.resolvePromptParts, SessionRunState.ensureRunning, SessionTools.resolve]
related: [spine.v1-turn-loop, session-v1.processor]
evidence: explicit
status: verified
updated: 355a0bcf5
---

> `SessionPrompt` 是 V1 当前活跑的 session 编排器:它创建 user message,驱动 assistant `runLoop`,并把 command、subtask、shell 这些入口统一写成 V1 `SessionV1` message/part 历史。

## 能回答的问题
- V1 prompt 入口什么时候只写 user message,什么时候进入 assistant loop?
- `SessionPrompt.runLoop` 的 step 机怎样决定继续、停止、压缩或执行 subtask?
- slash command 怎样变成普通 prompt 或 subtask prompt?
- 用户直接执行 shell 时为什么也会写入 V1 message/part?
- V1 prompt 层在哪些地方向 V2 EventV2 做临时 dual-write?

## 职责边界

`SessionPrompt.Interface` 暴露 `cancel`、`prompt`、`loop`、`shell`、`command`、`resolvePromptParts` 六个操作;其中 `prompt` 和 `loop` 是聊天主线,`shell` 和 `command` 是用户显式触发的旁路入口。[E: packages/opencode/src/session/prompt.ts:87][E: packages/opencode/src/session/prompt.ts:88][E: packages/opencode/src/session/prompt.ts:89][E: packages/opencode/src/session/prompt.ts:90][E: packages/opencode/src/session/prompt.ts:91][E: packages/opencode/src/session/prompt.ts:92]

`SessionPrompt.layer` 注入 V1 session loop 所需的服务:Session CRUD、Agent、Provider、SessionProcessor、SessionCompaction、Plugin、Command、Permission、ToolRegistry、Instruction、SessionRunState、SessionRevert、SystemPrompt、LLM、EventV2Bridge、RuntimeFlags 和 core Database 都在同一个 Effect layer 中被读取。[E: packages/opencode/src/session/prompt.ts:97][E: packages/opencode/src/session/prompt.ts:101][E: packages/opencode/src/session/prompt.ts:102][E: packages/opencode/src/session/prompt.ts:103][E: packages/opencode/src/session/prompt.ts:104][E: packages/opencode/src/session/prompt.ts:105][E: packages/opencode/src/session/prompt.ts:106][E: packages/opencode/src/session/prompt.ts:107][E: packages/opencode/src/session/prompt.ts:109][E: packages/opencode/src/session/prompt.ts:113][E: packages/opencode/src/session/prompt.ts:118][E: packages/opencode/src/session/prompt.ts:119][E: packages/opencode/src/session/prompt.ts:120][E: packages/opencode/src/session/prompt.ts:122][E: packages/opencode/src/session/prompt.ts:123][E: packages/opencode/src/session/prompt.ts:124][E: packages/opencode/src/session/prompt.ts:125][E: packages/opencode/src/session/prompt.ts:126]

`SessionRunState.ensureRunning` 是同一 V1 session 的 run-loop gate:它按 `sessionID` 复用或创建 `Runner`,并用 runner 的 `ensureRunning(work)` 执行主 loop。[E: packages/opencode/src/session/run-state.ts:52][E: packages/opencode/src/session/run-state.ts:57][E: packages/opencode/src/session/run-state.ts:59][E: packages/opencode/src/session/run-state.ts:67][E: packages/opencode/src/session/run-state.ts:88][E: packages/opencode/src/session/run-state.ts:93] `SessionPrompt.loop` 直接把 `runLoop(input.sessionID)` 交给这个 gate,中断 fallback 是 `lastAssistant(input.sessionID)`。[E: packages/opencode/src/session/prompt.ts:1404][E: packages/opencode/src/session/prompt.ts:1407]

## 数据模型

| 实体 | 关键字段/值 | 说明 |
|---|---|---|
| `PromptInput.parts` | `text` / `file` / `agent` / `subtask` | `createUserMessage` 将这些输入 part 解析成 `SessionV1.Part`,再写入 message/part 存储。[E: packages/opencode/src/session/prompt.ts:1607][E: packages/opencode/src/session/prompt.ts:1609][E: packages/opencode/src/session/prompt.ts:1610][E: packages/opencode/src/session/prompt.ts:1611][E: packages/opencode/src/session/prompt.ts:1612][E: packages/opencode/src/session/prompt.ts:712][E: packages/opencode/src/session/prompt.ts:978][E: packages/opencode/src/session/prompt.ts:1029][E: packages/opencode/src/session/prompt.ts:1030] |
| `SessionV1.User` | `agent`, `model.providerID`, `model.modelID`, optional `variant`, `system`, `format`, `tools` | `createUserMessage` 把 agent/model/variant/format/tools 固化到 user message 上;run loop 用最新 user message 的 agent/model/variant/format 作为执行上下文,而 prompt-level `tools` override 另在 `prompt()` 中写回 session permission。[E: packages/opencode/src/session/prompt.ts:663][E: packages/opencode/src/session/prompt.ts:668][E: packages/opencode/src/session/prompt.ts:669][E: packages/opencode/src/session/prompt.ts:671][E: packages/opencode/src/session/prompt.ts:672][E: packages/opencode/src/session/prompt.ts:673][E: packages/opencode/src/session/prompt.ts:675][E: packages/opencode/src/session/prompt.ts:676][E: packages/opencode/src/session/prompt.ts:1114][E: packages/opencode/src/session/prompt.ts:1119][E: packages/opencode/src/session/prompt.ts:1194][E: packages/opencode/src/session/prompt.ts:1223][E: packages/opencode/src/session/prompt.ts:1334][E: packages/opencode/src/session/prompt.ts:1337] |
| `SessionV1.Assistant` | `parentID`, `mode`, `agent`, `path`, `tokens`, `modelID`, `providerID` | 每个 assistant step 都新建一个 assistant message,其 parent 指向 last user,并记录 cwd/root 与 provider model。[E: packages/opencode/src/session/prompt.ts:1241][E: packages/opencode/src/session/prompt.ts:1243][E: packages/opencode/src/session/prompt.ts:1244][E: packages/opencode/src/session/prompt.ts:1246][E: packages/opencode/src/session/prompt.ts:1248][E: packages/opencode/src/session/prompt.ts:1249][E: packages/opencode/src/session/prompt.ts:1250][E: packages/opencode/src/session/prompt.ts:1254] |
| `SessionV1.CompactionPart` / `SessionV1.SubtaskPart` | queued work | `MessageV2.latest` 返回 `tasks`,run loop 每 step 先 pop task;`subtask` 走 `handleSubtask`, `compaction` 走 `compaction.process`。[E: packages/opencode/src/session/prompt.ts:1149][E: packages/opencode/src/session/message-v2.ts:606][E: packages/opencode/src/session/message-v2.ts:609][E: packages/opencode/src/session/prompt.ts:1195][E: packages/opencode/src/session/prompt.ts:1197][E: packages/opencode/src/session/prompt.ts:1198][E: packages/opencode/src/session/prompt.ts:1202][E: packages/opencode/src/session/prompt.ts:1203] |
| `StructuredOutput` tool | dynamic AI SDK tool | 当 last user 的 `format.type === "json_schema"` 时,run loop 临时注入 `StructuredOutput` tool,并把 `toolChoice` 设为 `"required"`。[E: packages/opencode/src/session/prompt.ts:1295][E: packages/opencode/src/session/prompt.ts:1296][E: packages/opencode/src/session/prompt.ts:1346] |

## 控制流

1. `resolvePromptParts` 从模板中提取 markdown file references;如果目标路径不存在但 agent 名存在,会产生 `{ type: "agent" }` part,否则会把命中的文件转成 `file:` URL part。[E: packages/opencode/src/session/prompt.ts:141][E: packages/opencode/src/session/prompt.ts:144][E: packages/opencode/src/session/prompt.ts:154][E: packages/opencode/src/session/prompt.ts:158][E: packages/opencode/src/session/prompt.ts:159][E: packages/opencode/src/session/prompt.ts:160][E: packages/opencode/src/session/prompt.ts:161][E: packages/opencode/src/session/prompt.ts:166][E: packages/opencode/src/session/prompt.ts:167][E: packages/opencode/src/session/prompt.ts:168]

2. `createUserMessage` 解析 agent 与当前模型:显式 `input.model` 优先,其次 agent model,最后 `currentModel(sessionID)`;agent variant 只在同一 agent model 且 provider catalog 中存在该 variant 时生效。[E: packages/opencode/src/session/prompt.ts:636][E: packages/opencode/src/session/prompt.ts:638][E: packages/opencode/src/session/prompt.ts:653][E: packages/opencode/src/session/prompt.ts:654][E: packages/opencode/src/session/prompt.ts:656][E: packages/opencode/src/session/prompt.ts:657][E: packages/opencode/src/session/prompt.ts:658][E: packages/opencode/src/session/prompt.ts:659][E: packages/opencode/src/session/prompt.ts:661]

3. `createUserMessage` 在保存 user message 前解析 file/resource/agent parts。MCP resource 会先读 resource 并生成 synthetic text parts,成功时保留原 file part;普通 file URL 会通过 V1 `read` tool 预读文本或目录;media file 会转成 data URL file part;agent part 会追加一段 synthetic prompt 要求模型调用 task tool。[E: packages/opencode/src/session/prompt.ts:716][E: packages/opencode/src/session/prompt.ts:719][E: packages/opencode/src/session/prompt.ts:723][E: packages/opencode/src/session/prompt.ts:728][E: packages/opencode/src/session/prompt.ts:735][E: packages/opencode/src/session/prompt.ts:739][E: packages/opencode/src/session/prompt.ts:753][E: packages/opencode/src/session/prompt.ts:796][E: packages/opencode/src/session/prompt.ts:837][E: packages/opencode/src/session/prompt.ts:847][E: packages/opencode/src/session/prompt.ts:892][E: packages/opencode/src/session/prompt.ts:913][E: packages/opencode/src/session/prompt.ts:928][E: packages/opencode/src/session/prompt.ts:932][E: packages/opencode/src/session/prompt.ts:944][E: packages/opencode/src/session/prompt.ts:946][E: packages/opencode/src/session/prompt.ts:947][E: packages/opencode/src/session/prompt.ts:957][E: packages/opencode/src/session/prompt.ts:968]

4. `createUserMessage` 先触发 `chat.message` plugin hook,再 normalize image attachments,再写 `sessions.updateMessage(info)` 和每个 `sessions.updatePart(part)`。[E: packages/opencode/src/session/prompt.ts:983][E: packages/opencode/src/session/prompt.ts:994][E: packages/opencode/src/session/prompt.ts:995][E: packages/opencode/src/session/prompt.ts:1029][E: packages/opencode/src/session/prompt.ts:1030]

5. 当 `RuntimeFlags.experimentalEventSystem` 为 true 时,`createUserMessage` 把 V1 prompt 同步发布成 `SessionEvent.Prompted` 且 delivery 固定为 `"steer"`;synthetic text 另发 `SessionEvent.Synthetic`。这些 V2 event publish 都被同一个 experimental gate 包住,因此是迁移 mirror,不是 V1 主写路径。[E: packages/opencode/src/session/prompt.ts:1077][E: packages/opencode/src/session/prompt.ts:1078][E: packages/opencode/src/session/prompt.ts:1082][E: packages/opencode/src/session/prompt.ts:1092][E: packages/opencode/src/session/prompt.ts:1093][E: packages/opencode/src/effect/runtime-flags.ts:48][I]

6. `SessionPrompt.prompt` 先读取 session,调用 `SessionRevert.cleanup(session)`,创建 user message,`touch` session;如果输入 tools override 非空,会把 `allow`/`deny` ruleset 写回 session permission。[E: packages/opencode/src/session/prompt.ts:1108][E: packages/opencode/src/session/prompt.ts:1109][E: packages/opencode/src/session/prompt.ts:1110][E: packages/opencode/src/session/prompt.ts:1111][E: packages/opencode/src/session/prompt.ts:1113][E: packages/opencode/src/session/prompt.ts:1115][E: packages/opencode/src/session/prompt.ts:1119]

7. `SessionPrompt.prompt` 在 `input.noReply === true` 时直接返回 user message,否则调用 `loop({ sessionID })` 进入 assistant run loop。[E: packages/opencode/src/session/prompt.ts:1122][E: packages/opencode/src/session/prompt.ts:1123]

8. `runLoop` 每轮把 session status 设为 busy,读取 `MessageV2.filterCompactedEffect(sessionID)` 的 active history,再用 `MessageV2.latest` 找 last user、last assistant、last finished assistant 和 queued tasks。[E: packages/opencode/src/session/prompt.ts:1141][E: packages/opencode/src/session/prompt.ts:1142][E: packages/opencode/src/session/prompt.ts:1145][E: packages/opencode/src/session/prompt.ts:1149]

9. `runLoop` 的退出条件是:latest assistant 有 finish,finish 不是 `"tool-calls"`,没有非 provider-executed tool parts(忽略 cleanup-marked interrupted orphans),并且 last user id 早于 last assistant id。[E: packages/opencode/src/session/prompt.ts:1159][E: packages/opencode/src/session/prompt.ts:1161][E: packages/opencode/src/session/prompt.ts:1165][E: packages/opencode/src/session/prompt.ts:1166][E: packages/opencode/src/session/prompt.ts:1167][E: packages/opencode/src/session/prompt.ts:1168]

10. 每个 step 先解析当前 user message 的 model,再 pop 一个 queued task;如果 task 是 `subtask` 或 `compaction`,run loop 处理后 `continue`,因此只有没有 queued task 被处理时才检查上一个 finished assistant 是否 overflow 并创建 auto compaction。[E: packages/opencode/src/session/prompt.ts:1194][E: packages/opencode/src/session/prompt.ts:1195][E: packages/opencode/src/session/prompt.ts:1197][E: packages/opencode/src/session/prompt.ts:1198][E: packages/opencode/src/session/prompt.ts:1199][E: packages/opencode/src/session/prompt.ts:1202][E: packages/opencode/src/session/prompt.ts:1203][E: packages/opencode/src/session/prompt.ts:1211][E: packages/opencode/src/session/prompt.ts:1214][E: packages/opencode/src/session/prompt.ts:1217][E: packages/opencode/src/session/prompt.ts:1219]

11. 普通 assistant step 创建 assistant message,创建 `SessionProcessor.Handle`,调用 `SessionTools.resolve` 把 ToolRegistry 与 MCP tools 变成 AI SDK tool map,再组装 system/context/model messages 并调用 `handle.process(...)`。[E: packages/opencode/src/session/prompt.ts:1239][E: packages/opencode/src/session/prompt.ts:1254][E: packages/opencode/src/session/prompt.ts:1266][E: packages/opencode/src/session/prompt.ts:1279][E: packages/opencode/src/session/tools.ts:33][E: packages/opencode/src/session/tools.ts:37][E: packages/opencode/src/session/tools.ts:38][E: packages/opencode/src/session/tools.ts:74][E: packages/opencode/src/session/tools.ts:79][E: packages/opencode/src/session/tools.ts:80][E: packages/opencode/src/session/tools.ts:117][E: packages/opencode/src/session/tools.ts:121][E: packages/opencode/src/session/tools.ts:123][E: packages/opencode/src/session/tools.ts:201][E: packages/opencode/src/session/tools.ts:204][E: packages/opencode/src/session/prompt.ts:1327][E: packages/opencode/src/session/prompt.ts:1333][E: packages/opencode/src/session/prompt.ts:1336]

12. `handle.process` 返回 `"stop"` 时 run loop break;返回 `"compact"` 时 run loop 创建 auto compaction user part,其中 `overflow` 取 `!handle.message.finish`;其它返回值继续下一轮。[E: packages/opencode/src/session/prompt.ts:1380][E: packages/opencode/src/session/prompt.ts:1381][E: packages/opencode/src/session/prompt.ts:1382][E: packages/opencode/src/session/prompt.ts:1387][E: packages/opencode/src/session/prompt.ts:1390]

13. loop 结束后,`runLoop` 后台 fork `compaction.prune({ sessionID })`,然后返回最新 assistant message。[E: packages/opencode/src/session/prompt.ts:1399][E: packages/opencode/src/session/prompt.ts:1400]

## subtask、command、shell 旁路

`handleSubtask` 人工创建 assistant message 与 `task` tool part,再直接执行 registry 中的 `task` tool;tool context 的 `ask` 会合并 subagent permission 与 session permission。[E: packages/opencode/src/session/prompt.ts:239][E: packages/opencode/src/session/prompt.ts:250][E: packages/opencode/src/session/prompt.ts:252][E: packages/opencode/src/session/prompt.ts:253][E: packages/opencode/src/session/prompt.ts:258][E: packages/opencode/src/session/prompt.ts:263][E: packages/opencode/src/session/prompt.ts:264][E: packages/opencode/src/session/prompt.ts:267][E: packages/opencode/src/session/prompt.ts:273][E: packages/opencode/src/session/prompt.ts:308][E: packages/opencode/src/session/prompt.ts:309][E: packages/opencode/src/session/prompt.ts:325][E: packages/opencode/src/session/prompt.ts:330] subtask 完成后 assistant finish 固定为 `"tool-calls"`;如果 command-subtask 存在,还会追加 synthetic user message 要求总结 task tool 输出并继续。[E: packages/opencode/src/session/prompt.ts:379][E: packages/opencode/src/session/prompt.ts:383][E: packages/opencode/src/session/prompt.ts:414][E: packages/opencode/src/session/prompt.ts:416][E: packages/opencode/src/session/prompt.ts:424][E: packages/opencode/src/session/prompt.ts:430]

`SessionPrompt.command` 读取 slash command 模板,替换 `$1`/`$ARGUMENTS`,执行模板中的 shell interpolation,然后用 `(agent.mode === "subagent" && cmd.subtask !== false) || cmd.subtask === true` 决定写 `subtask` part 或普通 prompt parts。[E: packages/opencode/src/session/prompt.ts:1423][E: packages/opencode/src/session/prompt.ts:1435][E: packages/opencode/src/session/prompt.ts:1444][E: packages/opencode/src/session/prompt.ts:1452][E: packages/opencode/src/session/prompt.ts:1458][E: packages/opencode/src/session/prompt.ts:1462][E: packages/opencode/src/session/prompt.ts:1468][E: packages/opencode/src/session/prompt.ts:1497][E: packages/opencode/src/session/prompt.ts:1500][E: packages/opencode/src/session/prompt.ts:1501][E: packages/opencode/src/session/prompt.ts:1502][E: packages/opencode/src/session/prompt.ts:1494] command 最终仍调用 `prompt(...)`,随后发布 `Command.Event.Executed`。[E: packages/opencode/src/session/prompt.ts:1527][E: packages/opencode/src/session/prompt.ts:1535]

`SessionPrompt.shell` 通过 `SessionRunState.startShell` 运行 `shellImpl`,并在 `shellImpl` 中写入 synthetic user message、assistant message 和 `bash` tool part;进程输出会不断更新 tool part metadata,完成时把 output 写入 completed tool state。[E: packages/opencode/src/session/prompt.ts:1410][E: packages/opencode/src/session/prompt.ts:1414][E: packages/opencode/src/session/prompt.ts:462][E: packages/opencode/src/session/prompt.ts:471][E: packages/opencode/src/session/prompt.ts:487][E: packages/opencode/src/session/prompt.ts:494][E: packages/opencode/src/session/prompt.ts:502][E: packages/opencode/src/session/prompt.ts:568][E: packages/opencode/src/session/prompt.ts:572][E: packages/opencode/src/session/prompt.ts:540][E: packages/opencode/src/session/prompt.ts:546]

## 设计动机与权衡

- V1 仍把 provider turn orchestration 放在 `SessionPrompt.runLoop`,而不是 V2 的 durable `SessionExecution`/`SessionRunner`。根 AGENTS.md 对 V2 的约束明确要求 V2 保持 prompt admission 与 model execution 分离,并且不要桥回 legacy `SessionPrompt.loop(...)`;这反向说明 `SessionPrompt.loop` 是 legacy 活跑路径而非 V2 目标形态。[E: AGENTS.md:150][E: AGENTS.md:154]
- `SessionPrompt` 的 `Prompted`、`Synthetic`、`Shell.Started/Ended` 以及 processor assistant mirror events 都在 `experimentalEventSystem`/`mirrorAssistant` gate 下发布;`AgentSwitched` 与 `ModelSwitched` 不是这个 gate 的一部分,因此不要把所有 `SessionEvent.*` 都当作实验 mirror。[E: packages/opencode/src/session/prompt.ts:503][E: packages/opencode/src/session/prompt.ts:527][E: packages/opencode/src/session/prompt.ts:680][E: packages/opencode/src/session/prompt.ts:692][E: packages/opencode/src/session/prompt.ts:1077][E: packages/opencode/src/session/prompt.ts:1092][E: packages/opencode/src/session/prompt.ts:1093][E: packages/opencode/src/session/processor.ts:129][I]
- `MessageV2.toModelMessagesEffect` 虽然名字带 V2,但在 V1 run loop 中被用来把 V1 `SessionV1.WithParts[]` 转成 AI SDK `ModelMessage[]`;它不是 V2 session core。[E: packages/opencode/src/session/prompt.ts:1331][E: packages/opencode/src/session/message-v2.ts:3][E: packages/opencode/src/session/message-v2.ts:23][E: packages/opencode/src/session/message-v2.ts:142][E: packages/opencode/src/session/message-v2.ts:418][E: packages/opencode/src/session/message-v2.ts:419][I]

## gotcha

- `SessionPrompt.command` 中 `cmd.subtask === true` 可以把普通 agent command 强制变成 subtask;`cmd.subtask !== false` 也会让 `agent.mode === "subagent"` 的 command 默认走 subtask。[E: packages/opencode/src/session/prompt.ts:1500]
- run loop 在 step > 1 时会把新 user text 包进 `<system-reminder>` synthetic text,提醒模型处理用户插入的后续消息后继续任务。[E: packages/opencode/src/session/prompt.ts:1307][E: packages/opencode/src/session/prompt.ts:1313][E: packages/opencode/src/session/prompt.ts:1319]
- shell 旁路直接 spawn child process,把输出流写进 `bash` tool part metadata,完成时写成 completed tool output;该 tool output 后续会由 V1 message conversion 转成 model-facing tool output。[E: packages/opencode/src/session/prompt.ts:560][E: packages/opencode/src/session/prompt.ts:567][E: packages/opencode/src/session/prompt.ts:568][E: packages/opencode/src/session/prompt.ts:572][E: packages/opencode/src/session/prompt.ts:540][E: packages/opencode/src/session/prompt.ts:546][E: packages/opencode/src/session/message-v2.ts:301][E: packages/opencode/src/session/message-v2.ts:326][E: packages/opencode/src/session/message-v2.ts:331]

## Sources
- packages/opencode/src/session/prompt.ts
- packages/opencode/src/session/run-state.ts
- packages/opencode/src/session/tools.ts
- packages/opencode/src/session/message-v2.ts
- packages/opencode/src/session/processor.ts
- packages/opencode/src/effect/runtime-flags.ts
- AGENTS.md

## 相关
- [spine.v1-turn-loop](../../spine/v1-turn-loop.md)
- [session-v1.processor](processor.md)
