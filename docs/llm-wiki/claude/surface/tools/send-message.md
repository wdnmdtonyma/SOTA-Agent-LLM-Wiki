---
id: tool.send-message
path: surface/tools/send-message.md
title: SendMessage
kind: tool
tier: T1
status: verified
source: [tools/SendMessageTool/SendMessageTool.ts]
symbols: [SendMessageTool]
related: [subsys.swarm]
updated: 2026-06-14
evidence: explicit
---

`SendMessage` 是 agent swarms 的 message routing 工具:它能给 teammate name、broadcast `*`、UDS peer 或 bridge peer 发送 plain text,也能处理 shutdown/plan approval 这类 structured protocol response。[E: tools/SendMessageTool/constants.ts:1][E: tools/SendMessageTool/SendMessageTool.ts:67][E: tools/SendMessageTool/SendMessageTool.ts:72][E: tools/SendMessageTool/SendMessageTool.ts:82][E: tools/SendMessageTool/SendMessageTool.ts:887]

## 能回答的问题

- `SendMessage` 什么时候可见,为什么它还受 `agentSwarms` gate 影响?
- plain text message 与 structured message 的 validation 差异是什么?
- bridge/UDS cross-session 消息为何有额外权限和校验?
- `SendMessage` 如何唤醒 running/stopped local agent task?

## 1 Identity

- Tool name: `SendMessage`。[E: tools/SendMessageTool/constants.ts:1]
- `searchHint`: `send messages to agent teammates (swarm protocol)`。[E: tools/SendMessageTool/SendMessageTool.ts:523]
- `description`: `Send a message to another agent`。[E: tools/SendMessageTool/SendMessageTool.ts:720][E: tools/SendMessageTool/prompt.ts:3]
- `maxResultSizeChars`: `100_000`。[E: tools/SendMessageTool/SendMessageTool.ts:524]
- `userFacingName()`: `SendMessage`。[E: tools/SendMessageTool/SendMessageTool.ts:526]
- 注册与可见性: `getAllBaseTools()` 固定加入 `SendMessageTool`,simple coordinator mode 也会加入;工具自身 `isEnabled()` 返回 `isAgentSwarmsEnabled()`。[E: tools.ts:226][E: tools.ts:283][E: tools.ts:295][E: tools/SendMessageTool/SendMessageTool.ts:535] external 用户需要 `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` 或 `--agent-teams`,并且 GrowthBook `tengu_amber_flint` killswitch 为 true;ant 用户直接 enabled。[E: utils/agentSwarmsEnabled.ts:24][E: utils/agentSwarmsEnabled.ts:26][E: utils/agentSwarmsEnabled.ts:32][E: utils/agentSwarmsEnabled.ts:39][E: utils/agentSwarmsEnabled.ts:43]

## 2 用途定位

`SendMessage` prompt 明确说 agent 的普通文本输出不会被其它 agent 看见,要沟通必须调用该工具;teammate 通过 name 引用,不要用 UUID。[E: tools/SendMessageTool/prompt.ts:23][E: tools/SendMessageTool/prompt.ts:25][E: tools/SendMessageTool/prompt.ts:36] 当 `UDS_INBOX` feature 打开时,prompt 增加 `uds:/path/to.sock` 和 `bridge:session_...` 两类 cross-session target,并要求用 `ListPeers` discovery。[E: tools/SendMessageTool/prompt.ts:6][E: tools/SendMessageTool/prompt.ts:7][E: tools/SendMessageTool/prompt.ts:8][E: tools/SendMessageTool/prompt.ts:11][E: tools/SendMessageTool/prompt.ts:13]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 | 校验 |
| --- | --- | --- | --- | --- | --- |
| `to` | `string` | 是 | 无 | teammate name、`*` broadcast;`UDS_INBOX` 时还可为 `uds:<socket-path>` 或 `bridge:<session-id>`。[E: tools/SendMessageTool/SendMessageTool.ts:69][E: tools/SendMessageTool/SendMessageTool.ts:72][E: tools/SendMessageTool/SendMessageTool.ts:73][E: tools/SendMessageTool/SendMessageTool.ts:74] | 不能为空;`bridge`/`uds` target 不能为空;不能包含 `@`。[E: tools/SendMessageTool/SendMessageTool.ts:604][E: tools/SendMessageTool/SendMessageTool.ts:612][E: tools/SendMessageTool/SendMessageTool.ts:623] |
| `summary` | `string` | 否 | `undefined` | plain string message 的 5-10 word UI preview。[E: tools/SendMessageTool/SendMessageTool.ts:76][E: tools/SendMessageTool/SendMessageTool.ts:80] | plain string message 在普通 teammate route 下必须提供非空 summary;UDS/bridge plain text 可跳过 summary 特例。[E: tools/SendMessageTool/SendMessageTool.ts:657][E: tools/SendMessageTool/SendMessageTool.ts:667][E: tools/SendMessageTool/SendMessageTool.ts:668] |
| `message` | `string` 或 structured union | 是 | 无 | plain text 或 `shutdown_request`、`shutdown_response`、`plan_approval_response`。[E: tools/SendMessageTool/SendMessageTool.ts:82][E: tools/SendMessageTool/SendMessageTool.ts:46][E: tools/SendMessageTool/SendMessageTool.ts:49][E: tools/SendMessageTool/SendMessageTool.ts:53][E: tools/SendMessageTool/SendMessageTool.ts:59] | structured message 不能 broadcast,不能 cross-session,shutdown rejection 必须有 reason,shutdown_response 必须发给 `team-lead`。[E: tools/SendMessageTool/SendMessageTool.ts:678][E: tools/SendMessageTool/SendMessageTool.ts:685][E: tools/SendMessageTool/SendMessageTool.ts:694][E: tools/SendMessageTool/SendMessageTool.ts:705] |

## 4 输出 & maxResultSizeChars

输出 union 包括 direct message、broadcast、request、response 四种形状;direct message 有 `success`、`message`、可选 `routing`,broadcast 额外有 `recipients`,request 有 `request_id` 与 `target`,response 有可选 `request_id`。[E: tools/SendMessageTool/SendMessageTool.ts:101][E: tools/SendMessageTool/SendMessageTool.ts:102][E: tools/SendMessageTool/SendMessageTool.ts:103][E: tools/SendMessageTool/SendMessageTool.ts:104][E: tools/SendMessageTool/SendMessageTool.ts:107][E: tools/SendMessageTool/SendMessageTool.ts:110][E: tools/SendMessageTool/SendMessageTool.ts:114][E: tools/SendMessageTool/SendMessageTool.ts:117][E: tools/SendMessageTool/SendMessageTool.ts:118][E: tools/SendMessageTool/SendMessageTool.ts:121][E: tools/SendMessageTool/SendMessageTool.ts:124][E: tools/SendMessageTool/SendMessageTool.ts:127][E: tools/SendMessageTool/SendMessageTool.ts:131] mapper 使用 `jsonStringify(data)` 包成 text content block。[E: tools/SendMessageTool/SendMessageTool.ts:728][E: tools/SendMessageTool/SendMessageTool.ts:732][E: tools/SendMessageTool/SendMessageTool.ts:735]

## 5 行为标志

| 标志 | 实际值 | 原因 |
| --- | --- | --- |
| `shouldDefer` | `true` | Swarm message tool schema 可延迟加载。[E: tools/SendMessageTool/SendMessageTool.ts:533] |
| `isEnabled()` | `isAgentSwarmsEnabled()` | 工具自身受 agent swarms runtime gate 控制。[E: tools/SendMessageTool/SendMessageTool.ts:535][E: tools/SendMessageTool/SendMessageTool.ts:536] |
| `isReadOnly(input)` | plain string 为 `true`,structured object 为 `false` | 源码按 `typeof input.message === "string"` 返回。[E: tools/SendMessageTool/SendMessageTool.ts:539][E: tools/SendMessageTool/SendMessageTool.ts:540] |
| `isConcurrencySafe()` | 默认 `false` | `SendMessageTool` 没有 concurrency-safe override;默认返回 false。[I][E: Tool.ts:759] |
| `isDestructive()` | 默认 `false` | `SendMessageTool` 没有 destructive flag override;默认返回 false。[I][E: Tool.ts:761] |
| `toAutoClassifierInput` | 根据 message type 格式化 | plain text 返回 `to <target>: <message>`,structured message 返回 shutdown/plan approval 摘要。[E: tools/SendMessageTool/SendMessageTool.ts:571][E: tools/SendMessageTool/SendMessageTool.ts:573][E: tools/SendMessageTool/SendMessageTool.ts:576][E: tools/SendMessageTool/SendMessageTool.ts:579][E: tools/SendMessageTool/SendMessageTool.ts:581] |

## 6 权限

`checkPermissions()` 对 `UDS_INBOX` 且 target scheme 为 `bridge` 的消息返回 `ask`,message 说明消息会经 Anthropic servers 到达 Remote Control session;该 decisionReason 是 `safetyCheck` 且 `classifierApprovable:false`。[E: tools/SendMessageTool/SendMessageTool.ts:585][E: tools/SendMessageTool/SendMessageTool.ts:586][E: tools/SendMessageTool/SendMessageTool.ts:588][E: tools/SendMessageTool/SendMessageTool.ts:589][E: tools/SendMessageTool/SendMessageTool.ts:594][E: tools/SendMessageTool/SendMessageTool.ts:596][E: tools/SendMessageTool/SendMessageTool.ts:597] 其它路径默认 allow。[E: tools/SendMessageTool/SendMessageTool.ts:601]

`validateInput()` 拒绝空 `to`、空 address target 和包含 `@` 的 target;`@` 错误文案说明每 session 只有一个 team,因此 `to` 必须是 bare teammate name 或 `*`。[E: tools/SendMessageTool/SendMessageTool.ts:604][E: tools/SendMessageTool/SendMessageTool.ts:614][E: tools/SendMessageTool/SendMessageTool.ts:623][E: tools/SendMessageTool/SendMessageTool.ts:627] bridge route 只允许 plain text,且要求 Remote Control bridge handle 存在并 active;UDS route 对 plain text 直接 allow,structured message 会进入后续 cross-session rejection。[E: tools/SendMessageTool/SendMessageTool.ts:631][E: tools/SendMessageTool/SendMessageTool.ts:635][E: tools/SendMessageTool/SendMessageTool.ts:647][E: tools/SendMessageTool/SendMessageTool.ts:655][E: tools/SendMessageTool/SendMessageTool.ts:657][E: tools/SendMessageTool/SendMessageTool.ts:665]

plain string message 在普通 route 下要求 summary;structured message 不能 broadcast,不能走 UDS/bridge,shutdown response 必须发给 `team-lead`,拒绝 shutdown 时必须给 reason。[E: tools/SendMessageTool/SendMessageTool.ts:667][E: tools/SendMessageTool/SendMessageTool.ts:671][E: tools/SendMessageTool/SendMessageTool.ts:678][E: tools/SendMessageTool/SendMessageTool.ts:681][E: tools/SendMessageTool/SendMessageTool.ts:685][E: tools/SendMessageTool/SendMessageTool.ts:695][E: tools/SendMessageTool/SendMessageTool.ts:700][E: tools/SendMessageTool/SendMessageTool.ts:706][E: tools/SendMessageTool/SendMessageTool.ts:712]

## 7 call() 走读

`call()` 对 `UDS_INBOX` plain string 先解析 address:bridge route 重新检查 bridge handle 和 active 状态,然后 dynamic require `postInterClaudeMessage(...)`;UDS route dynamic require `sendToUdsSocket(...)`,成功或失败都返回 structured data。[E: tools/SendMessageTool/SendMessageTool.ts:741][E: tools/SendMessageTool/SendMessageTool.ts:743][E: tools/SendMessageTool/SendMessageTool.ts:744][E: tools/SendMessageTool/SendMessageTool.ts:749][E: tools/SendMessageTool/SendMessageTool.ts:758][E: tools/SendMessageTool/SendMessageTool.ts:761][E: tools/SendMessageTool/SendMessageTool.ts:766][E: tools/SendMessageTool/SendMessageTool.ts:771][E: tools/SendMessageTool/SendMessageTool.ts:775][E: tools/SendMessageTool/SendMessageTool.ts:777][E: tools/SendMessageTool/SendMessageTool.ts:781][E: tools/SendMessageTool/SendMessageTool.ts:783][E: tools/SendMessageTool/SendMessageTool.ts:789][E: tools/SendMessageTool/SendMessageTool.ts:793]

对于 plain string 且 `to !== "*"`,`SendMessage` 先尝试把 `to` 解析为 registered agent name 或 raw agentId;如果 task 是 running local agent,消息通过 `queuePendingMessage(...)` 排队到下一个 tool round;如果 local agent stopped,则调用 `resumeAgentBackground(...)` 用该消息后台恢复 agent。[E: tools/SendMessageTool/SendMessageTool.ts:802][E: tools/SendMessageTool/SendMessageTool.ts:804][E: tools/SendMessageTool/SendMessageTool.ts:805][E: tools/SendMessageTool/SendMessageTool.ts:808][E: tools/SendMessageTool/SendMessageTool.ts:809][E: tools/SendMessageTool/SendMessageTool.ts:810][E: tools/SendMessageTool/SendMessageTool.ts:818][E: tools/SendMessageTool/SendMessageTool.ts:824] 如果 task 已从 state 驱逐但 agentId 可解析,它尝试从 disk transcript 恢复 background agent。[E: tools/SendMessageTool/SendMessageTool.ts:850][E: tools/SendMessageTool/SendMessageTool.ts:851][E: tools/SendMessageTool/SendMessageTool.ts:861]

若没有命中 local agent route,plain string `to === "*"` 进入 broadcast,其它 plain string 进入 direct mailbox message。[E: tools/SendMessageTool/SendMessageTool.ts:876][E: tools/SendMessageTool/SendMessageTool.ts:877][E: tools/SendMessageTool/SendMessageTool.ts:878][E: tools/SendMessageTool/SendMessageTool.ts:880] direct message 用 `writeToMailbox(recipientName, ...)` 写入 recipient inbox,broadcast 会读取 team file 并给除 sender 外的每个 member 写 mailbox。[E: tools/SendMessageTool/SendMessageTool.ts:161][E: tools/SendMessageTool/SendMessageTool.ts:170][E: tools/SendMessageTool/SendMessageTool.ts:205][E: tools/SendMessageTool/SendMessageTool.ts:221][E: tools/SendMessageTool/SendMessageTool.ts:238][E: tools/SendMessageTool/SendMessageTool.ts:239]

structured message route 按 `type` 分派:shutdown request 写 shutdown request 到 target mailbox;shutdown approval 写 confirmation 给 team lead,并对 in-process teammate abort controller 或调用 graceful shutdown;shutdown rejection 写 rejection 给 team lead;plan approval/rejection 只有 team lead 可执行,并写 plan approval response 到 recipient mailbox。[E: tools/SendMessageTool/SendMessageTool.ts:887][E: tools/SendMessageTool/SendMessageTool.ts:889][E: tools/SendMessageTool/SendMessageTool.ts:891][E: tools/SendMessageTool/SendMessageTool.ts:892][E: tools/SendMessageTool/SendMessageTool.ts:894][E: tools/SendMessageTool/SendMessageTool.ts:898][E: tools/SendMessageTool/SendMessageTool.ts:900][E: tools/SendMessageTool/SendMessageTool.ts:906][E: tools/SendMessageTool/SendMessageTool.ts:284][E: tools/SendMessageTool/SendMessageTool.ts:337][E: tools/SendMessageTool/SendMessageTool.ts:357][E: tools/SendMessageTool/SendMessageTool.ts:388][E: tools/SendMessageTool/SendMessageTool.ts:414][E: tools/SendMessageTool/SendMessageTool.ts:442][E: tools/SendMessageTool/SendMessageTool.ts:459][E: tools/SendMessageTool/SendMessageTool.ts:487][E: tools/SendMessageTool/SendMessageTool.ts:501]

## 8 渲染

`SendMessage` 使用 `renderToolUseMessage` 和 `renderToolResultMessage`。[E: tools/SendMessageTool/SendMessageTool.ts:915][E: tools/SendMessageTool/SendMessageTool.ts:916] UI 只对 `plan_approval_response` 显示 use message;有 `routing` 的 ordinary message result 和 request output result 不额外渲染,其它 result 渲染 dim message。[E: tools/SendMessageTool/UI.tsx:6][E: tools/SendMessageTool/UI.tsx:10][E: tools/SendMessageTool/UI.tsx:21][E: tools/SendMessageTool/UI.tsx:24][E: tools/SendMessageTool/UI.tsx:27]

## 9 设计动机·edge·历史

- `backfillObservableInput()` 把现代 schema 转成 legacy observable fields,如 broadcast/message/type/recipient/content/request_id/approve,供 hooks 或 transcript observer 使用。[E: tools/SendMessageTool/SendMessageTool.ts:543][E: tools/SendMessageTool/SendMessageTool.ts:547][E: tools/SendMessageTool/SendMessageTool.ts:551][E: tools/SendMessageTool/SendMessageTool.ts:562][E: tools/SendMessageTool/SendMessageTool.ts:564][E: tools/SendMessageTool/SendMessageTool.ts:567]
- Bridge 权限使用 `decisionReason.type: "safetyCheck"` 且 `classifierApprovable:false`。[E: tools/SendMessageTool/SendMessageTool.ts:594][E: tools/SendMessageTool/SendMessageTool.ts:597]
- Structured JSON status message 不应用于普通协作;prompt 要求用 plain text 沟通状态,用 `TaskUpdate` 标记任务完成。[E: tools/SendMessageTool/prompt.ts:47]

## Sources

- `tools/SendMessageTool/SendMessageTool.ts`
- `tools/SendMessageTool/constants.ts`
- `tools/SendMessageTool/prompt.ts`
- `tools/SendMessageTool/UI.tsx`
- `utils/agentSwarmsEnabled.ts`
- `tools.ts`
- `Tool.ts`

## 相关

- `subsys.swarm`
- `tool.team-create`
- `tool.team-delete`
