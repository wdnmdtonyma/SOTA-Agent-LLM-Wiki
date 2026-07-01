---
id: surface.modes.rpc-protocol
title: RPC 协议与传输
kind: surface
tier: T1
pkg: coding-agent
source:
  - packages/coding-agent/src/modes/rpc/rpc-types.ts
  - packages/coding-agent/src/modes/rpc/jsonl.ts
  - packages/coding-agent/src/modes/rpc/rpc-client.ts
  - packages/coding-agent/src/modes/rpc/rpc-mode.ts
  - packages/coding-agent/docs/rpc.md
  - packages/coding-agent/test/rpc-jsonl.test.ts
  - packages/coding-agent/test/rpc-prompt-response-semantics.test.ts
  - packages/coding-agent/test/suite/regressions/5868-rpc-unknown-command-id.test.ts
symbols:
  - RpcResponse
  - RpcExtensionUIRequest
  - RpcSessionState
  - RpcClient
related:
  - surface.modes.rpc
  - ref.coding-agent.rpc-methods
  - ref.coding-agent.json-events
evidence: explicit
status: verified
updated: 8c943640
---

> RPC protocol 是 pi-coding-agent 的无头 JSONL wire surface: client 在 stdin 逐行写 `RpcCommand`, runtime 在 stdout 逐行写 `RpcResponse`、agent events 和 extension UI requests。

## 能回答的问题

- RPC mode 的 stdin/stdout record framing 是什么, 为什么不能用 Node `readline`?
- `RpcResponse` 怎样用 `id`、`command`、`success`、`data` 或 `error` 表示同步 command 结果?
- `prompt` 为什么先返回一次 acceptance response, 后续内容又从事件流继续出来?
- `RpcSessionState` 暴露哪些 session/model/queue/compaction 字段?
- extension UI 在 RPC mode 下怎样把 `select`、`confirm`、`input`、`editor` 和 fire-and-forget UI 操作转成协议消息?
- `RpcClient` 如何生成 request id、区分 response 与 event、处理进程退出和 response timeout?

## 1 协议边界

RPC mode 的协议包含三类 stdout 记录: `type: "response"` 的 command response、`AgentSessionEvent` 事件流、以及 extension UI request/response 子协议; 用户文档把它概括为 stdin 上的 commands、stdout 上的 responses 和 stdout 上的 events [E: packages/coding-agent/docs/rpc.md:20] [E: packages/coding-agent/docs/rpc.md:22] [E: packages/coding-agent/docs/rpc.md:23] [E: packages/coding-agent/docs/rpc.md:24]。服务端实现用 `output(obj)` 统一把 `RpcResponse | RpcExtensionUIRequest | object` 写成 stdout JSON line, 并把 session event subscription 直接转发到这个 output 函数 [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:59] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:60] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:354] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:355]。用户文档把 RPC mode 定位为通过 stdin/stdout JSON protocol 嵌入 agent 到其它应用、IDE 或自定义 UI [E: packages/coding-agent/docs/rpc.md:3]。

每个 command 都可以带可选 `id`, 对应 response 会带回同一个 `id` 以便 request/response correlation [E: packages/coding-agent/docs/rpc.md:26]。服务端 `handleCommand()` 先取 `const id = command.id`, 再把这个 `id` 传入 success/error response helper [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:382] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:383] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:63] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:74]。未知 command 也保留原 request id: default branch 使用 `unknownCommand.type` 构造 `Unknown command: ...` error response [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:686] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:688], 回归测试固定了 `{ id: "test", type: "foobar" }` 会得到同 id 的 failure response [E: packages/coding-agent/test/suite/regressions/5868-rpc-unknown-command-id.test.ts:97] [E: packages/coding-agent/test/suite/regressions/5868-rpc-unknown-command-id.test.ts:100] [E: packages/coding-agent/test/suite/regressions/5868-rpc-unknown-command-id.test.ts:105]。

`surface.modes.rpc` 应覆盖 RPC mode 的进程入口、生命周期和命令分发全貌; 本节点只覆盖 wire protocol、JSONL framing、response/event shape、extension UI sub-protocol 和 typed client 行为 [I]。`ref.coding-agent.rpc-methods` 应逐项展开 `RpcCommand` union 和 `rpc-mode.ts` dispatch 的所有命令; 本节点只按协议形态分组说明, 不替代方法目录 [I]。

## 2 JSONL framing

RPC framing 是 strict JSONL: command、response 和 event 都是 JSON object, 每条记录以 LF `\n` 分隔 [E: packages/coding-agent/docs/rpc.md:22] [E: packages/coding-agent/docs/rpc.md:23] [E: packages/coding-agent/docs/rpc.md:24] [E: packages/coding-agent/docs/rpc.md:30]。client 必须只按 `\n` 切分记录, 输入端可以接受 CRLF, 但只剥掉 line 尾部的 `\r` [E: packages/coding-agent/docs/rpc.md:33] [E: packages/coding-agent/docs/rpc.md:34] [E: packages/coding-agent/src/modes/rpc/jsonl.ts:25] [E: packages/coding-agent/src/modes/rpc/jsonl.ts:26]。

`serializeJsonLine(value)` 的全部行为就是 `JSON.stringify(value)` 后追加一个 `\n` [E: packages/coding-agent/src/modes/rpc/jsonl.ts:10] [E: packages/coding-agent/src/modes/rpc/jsonl.ts:11]。`attachJsonlLineReader(stream, onLine)` 使用 UTF-8 `StringDecoder`, 把 chunk 追加到 buffer, 循环搜索 `buffer.indexOf("\n")`, 并把 LF 之前的字符串交给 `onLine` [E: packages/coding-agent/src/modes/rpc/jsonl.ts:21] [E: packages/coding-agent/src/modes/rpc/jsonl.ts:22] [E: packages/coding-agent/src/modes/rpc/jsonl.ts:30] [E: packages/coding-agent/src/modes/rpc/jsonl.ts:33] [E: packages/coding-agent/src/modes/rpc/jsonl.ts:38]。stream end 时如果 buffer 里还有没有 trailing LF 的内容, reader 仍会 emit 最后一行 [E: packages/coding-agent/src/modes/rpc/jsonl.ts:43] [E: packages/coding-agent/src/modes/rpc/jsonl.ts:45] [E: packages/coding-agent/src/modes/rpc/jsonl.ts:46]。

协议显式禁止把 Node `readline` 当作 RPC line reader, 因为 `readline` 还会按 `U+2028` 和 `U+2029` 断行, 但这两个 Unicode separator 可以合法出现在 JSON string payload 中 [E: packages/coding-agent/docs/rpc.md:37]。`attachJsonlLineReader()` 的实现只搜索 `"\n"`, 这就是它保持 LF-only framing 的运行时依据 [E: packages/coding-agent/src/modes/rpc/jsonl.ts:21] [E: packages/coding-agent/src/modes/rpc/jsonl.ts:33]。测试覆盖了 `serializeJsonLine({ text: "a\u2028b\u2029c" })` 保留这些字符、reader 只产出一条 line、CRLF 输入会变成不带 `\r` 的两条 JSON line、无 trailing LF 的最终 line 也会 emit [E: packages/coding-agent/test/rpc-jsonl.test.ts:7] [E: packages/coding-agent/test/rpc-jsonl.test.ts:9] [E: packages/coding-agent/test/rpc-jsonl.test.ts:28] [E: packages/coding-agent/test/rpc-jsonl.test.ts:46] [E: packages/coding-agent/test/rpc-jsonl.test.ts:63]。

## 3 Command 与 response shape

`RpcCommand` 是 discriminated union, 以 `type` 字段覆盖 prompting、state、model、thinking、queue modes、compaction、retry、bash、session、messages 和 commands 这些命令组 [E: packages/coding-agent/src/modes/rpc/rpc-types.ts:20] [E: packages/coding-agent/src/modes/rpc/rpc-types.ts:22] [E: packages/coding-agent/src/modes/rpc/rpc-types.ts:29] [E: packages/coding-agent/src/modes/rpc/rpc-types.ts:32] [E: packages/coding-agent/src/modes/rpc/rpc-types.ts:37] [E: packages/coding-agent/src/modes/rpc/rpc-types.ts:41] [E: packages/coding-agent/src/modes/rpc/rpc-types.ts:45] [E: packages/coding-agent/src/modes/rpc/rpc-types.ts:49] [E: packages/coding-agent/src/modes/rpc/rpc-types.ts:53] [E: packages/coding-agent/src/modes/rpc/rpc-types.ts:57] [E: packages/coding-agent/src/modes/rpc/rpc-types.ts:69] [E: packages/coding-agent/src/modes/rpc/rpc-types.ts:72]。每个 union member 都有可选 `id?: string`, 所以 correlation 是通用协议字段, 不是某个 command 的私有字段 [E: packages/coding-agent/src/modes/rpc/rpc-types.ts:22] [E: packages/coding-agent/src/modes/rpc/rpc-types.ts:72]。

`RpcResponse` 也是 union: success variants 固定 `type: "response"`、`command: "<command>"`、`success: true`, 并按命令选择是否带 `data`; failure variant 是任意 command 的 `{ type: "response"; command: string; success: false; error: string }` [E: packages/coding-agent/src/modes/rpc/rpc-types.ts:114] [E: packages/coding-agent/src/modes/rpc/rpc-types.ts:116] [E: packages/coding-agent/src/modes/rpc/rpc-types.ts:123] [E: packages/coding-agent/src/modes/rpc/rpc-types.ts:131] [E: packages/coding-agent/src/modes/rpc/rpc-types.ts:171] [E: packages/coding-agent/src/modes/rpc/rpc-types.ts:223]。服务端 `success()` helper 在 `data === undefined` 时省略 data 字段, 否则写入 `data`, 这解释了为什么 `abort`/`set_*` 类命令通常只有 success flag, 而 `get_state`/`bash`/`export_html` 有 payload [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:63] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:68] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:71] [I]。

parse error 不属于某个有效 command, 因此服务端用 `id: undefined` 和 `command: "parse"` 写 failure response [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:723] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:726] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:728] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:731] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:732]。命令执行抛出的异常会在 `catch` 中转换为同 command/id 的 failure response [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:763] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:766] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:767] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:768]。

## 4 Prompt acceptance 与事件流

`prompt` command 是异步语义: `RpcResponse` 只表示 prompt 被 accepted、queued 或 immediately handled; 后续生成内容继续作为 event stream 输出 [E: packages/coding-agent/docs/rpc.md:45] [E: packages/coding-agent/docs/rpc.md:76]。`runRpcMode()` 对 `prompt` 不等待整轮 agent 完成; 它调用 `session.prompt(..., { source: "rpc", preflightResult })`, 在 preflight 成功时输出一次 `success(id, "prompt")`, preflight 之前失败时输出一次 failure response [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:390] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:394] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:398] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:399] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:402] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:407] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:408]。

测试把这条语义钉死为 "one response": preflight reject 时同一个 request id 只有一个 failure response, preflight success 时只有一个 success response, streaming 期间带 `streamingBehavior: "followUp"` 入队的 prompt 也只有一个 success response [E: packages/coding-agent/test/rpc-prompt-response-semantics.test.ts:212] [E: packages/coding-agent/test/rpc-prompt-response-semantics.test.ts:216] [E: packages/coding-agent/test/rpc-prompt-response-semantics.test.ts:221] [E: packages/coding-agent/test/rpc-prompt-response-semantics.test.ts:236] [E: packages/coding-agent/test/rpc-prompt-response-semantics.test.ts:240] [E: packages/coding-agent/test/rpc-prompt-response-semantics.test.ts:245] [E: packages/coding-agent/test/rpc-prompt-response-semantics.test.ts:263] [E: packages/coding-agent/test/rpc-prompt-response-semantics.test.ts:274] [E: packages/coding-agent/test/rpc-prompt-response-semantics.test.ts:279]。

所有 `AgentSessionEvent` 由 `session.subscribe()` 直接 output 到 stdout JSONL [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:354] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:355]。RPC docs 明确说明事件在 agent operation 期间流式输出, 且 event 不带 request `id`; 只有 response 带 id [E: packages/coding-agent/docs/rpc.md:802] [E: packages/coding-agent/docs/rpc.md:804]。`ref.coding-agent.json-events` 应覆盖 event payload catalog; 本节点只说明 RPC protocol 如何承载这些 events [I]。

## 5 RpcSessionState

`RpcSessionState` 是 `get_state` 的 response data shape: 它包含 `model`、`thinkingLevel`、`isStreaming`、`isCompacting`、`steeringMode`、`followUpMode`、`sessionFile`、`sessionId`、`sessionName`、`autoCompactionEnabled`、`messageCount` 和 `pendingMessageCount` [E: packages/coding-agent/src/modes/rpc/rpc-types.ts:94] [E: packages/coding-agent/src/modes/rpc/rpc-types.ts:95] [E: packages/coding-agent/src/modes/rpc/rpc-types.ts:96] [E: packages/coding-agent/src/modes/rpc/rpc-types.ts:97] [E: packages/coding-agent/src/modes/rpc/rpc-types.ts:98] [E: packages/coding-agent/src/modes/rpc/rpc-types.ts:99] [E: packages/coding-agent/src/modes/rpc/rpc-types.ts:100] [E: packages/coding-agent/src/modes/rpc/rpc-types.ts:101] [E: packages/coding-agent/src/modes/rpc/rpc-types.ts:102] [E: packages/coding-agent/src/modes/rpc/rpc-types.ts:103] [E: packages/coding-agent/src/modes/rpc/rpc-types.ts:104] [E: packages/coding-agent/src/modes/rpc/rpc-types.ts:105] [E: packages/coding-agent/src/modes/rpc/rpc-types.ts:106]。

运行时构造 `get_state` payload 时逐项读取当前 `AgentSession`: `model` 来自 `session.model`, streaming/compacting flags 来自 session 状态, queue mode 来自 session queue settings, message count 来自 `session.messages.length`, pending count 来自 `session.pendingMessageCount` [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:442] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:444] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:446] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:447] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:448] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:449] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:454] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:455]。docs 的示例也把这些字段作为 `get_state` response data 展示; 源码类型把 `model` 声明为可选完整 `Model` object, `sessionName` 也为可选字段, 运行时分别把 `session.model` 与 `session.sessionName` 放入 state [E: packages/coding-agent/docs/rpc.md:170] [E: packages/coding-agent/docs/rpc.md:176] [E: packages/coding-agent/docs/rpc.md:177] [E: packages/coding-agent/docs/rpc.md:185] [E: packages/coding-agent/src/modes/rpc/rpc-types.ts:94] [E: packages/coding-agent/src/modes/rpc/rpc-types.ts:95] [E: packages/coding-agent/src/modes/rpc/rpc-types.ts:103] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:444] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:452]。

## 6 Extension UI sub-protocol

`RpcExtensionUIRequest` 是 stdout 上的 extension UI request union, method 覆盖 `select`、`confirm`、`input`、`editor`、`notify`、`setStatus`、`setWidget`、`setTitle` 和 `set_editor_text` [E: packages/coding-agent/src/modes/rpc/rpc-types.ts:230] [E: packages/coding-agent/src/modes/rpc/rpc-types.ts:231] [E: packages/coding-agent/src/modes/rpc/rpc-types.ts:232] [E: packages/coding-agent/src/modes/rpc/rpc-types.ts:236] [E: packages/coding-agent/src/modes/rpc/rpc-types.ts:241] [E: packages/coding-agent/src/modes/rpc/rpc-types.ts:245] [E: packages/coding-agent/src/modes/rpc/rpc-types.ts:252] [E: packages/coding-agent/src/modes/rpc/rpc-types.ts:259] [E: packages/coding-agent/src/modes/rpc/rpc-types.ts:264] [E: packages/coding-agent/src/modes/rpc/rpc-types.ts:265]。对应 stdin response union 是 `{ value: string }`、`{ confirmed: boolean }` 或 `{ cancelled: true }`, 三种都带相同 `id` [E: packages/coding-agent/src/modes/rpc/rpc-types.ts:272] [E: packages/coding-agent/src/modes/rpc/rpc-types.ts:273] [E: packages/coding-agent/src/modes/rpc/rpc-types.ts:274] [E: packages/coding-agent/src/modes/rpc/rpc-types.ts:275]。

dialog 类 UI 方法通过 `createDialogPromise()` 生成 UUID, 存入 `pendingExtensionRequests`, 然后输出 `extension_ui_request`; 收到 matching `extension_ui_response` 后 resolve 并 cleanup [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:90] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:98] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:121] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:122] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:124] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:128]。`select`、`confirm`、`input` 走这个 helper, 并分别把 cancelled/default case 转成 `undefined` 或 `false` [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:136] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:138] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:141] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:143] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:146] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:148]。`editor` 也阻塞等待 response, 但它在自己的 promise 中解析 `value` 或 `cancelled` [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:253] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:256] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:258] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:261] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:268]。

fire-and-forget UI 方法只 output request, 不等待 stdin response: `notify`、`setStatus`、`setWidget`、`setTitle` 和 `setEditorText` 都生成新 UUID 并写 `extension_ui_request` [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:151] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:153] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:167] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:169] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:194] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:197] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:217] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:219] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:237] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:239]。docs 把 extension UI methods 分成 dialog methods 和 fire-and-forget methods, 并说明 dialog timeout 由 agent-side auto-resolve, client 不需要自己追踪 timeout [E: packages/coding-agent/docs/rpc.md:1049] [E: packages/coding-agent/docs/rpc.md:1053] [E: packages/coding-agent/docs/rpc.md:1054] [E: packages/coding-agent/docs/rpc.md:1056]。

RPC mode 下部分 TUI 依赖能力是 degraded/no-op: `custom()` 返回 `undefined`, working indicator/footer/header/editor component/tools expanded 等无法提供真实 TUI 访问, `getEditorText()` 返回空字符串, `setTheme()` 返回不支持错误 [E: packages/coding-agent/docs/rpc.md:1058] [E: packages/coding-agent/docs/rpc.md:1059] [E: packages/coding-agent/docs/rpc.md:1060] [E: packages/coding-agent/docs/rpc.md:1061] [E: packages/coding-agent/docs/rpc.md:1066]。docs 仍明确 `ctx.mode === "rpc"` 且 `ctx.hasUI === true`, 因为 dialog 和 fire-and-forget methods 经 extension UI sub-protocol 可用 [E: packages/coding-agent/docs/rpc.md:1068]。

## 7 RpcClient 行为

`RpcClient.start()` 默认用 `node dist/cli.js --mode rpc` 启动子进程, 并按 options 追加 `--provider`、`--model` 和额外 args [E: packages/coding-agent/src/modes/rpc/rpc-client.ts:73] [E: packages/coding-agent/src/modes/rpc/rpc-client.ts:80] [E: packages/coding-agent/src/modes/rpc/rpc-client.ts:81] [E: packages/coding-agent/src/modes/rpc/rpc-client.ts:83] [E: packages/coding-agent/src/modes/rpc/rpc-client.ts:87] [E: packages/coding-agent/src/modes/rpc/rpc-client.ts:90] [E: packages/coding-agent/src/modes/rpc/rpc-client.ts:93]。它把 child stdio 设成 pipe, 收集 stderr 供错误诊断, 并用同一个 strict JSONL reader 读 stdout [E: packages/coding-agent/src/modes/rpc/rpc-client.ts:96] [E: packages/coding-agent/src/modes/rpc/rpc-client.ts:101] [E: packages/coding-agent/src/modes/rpc/rpc-client.ts:102] [E: packages/coding-agent/src/modes/rpc/rpc-client.ts:127] [E: packages/coding-agent/src/modes/rpc/rpc-client.ts:128]。

`RpcClient.send()` 为每个 public method 生成递增 id `req_N`, 把 command body 扩展成 `RpcCommand`, 在 `pendingRequests` 里注册 30 秒 timeout, 然后用 `serializeJsonLine(fullCommand)` 写 stdin [E: packages/coding-agent/src/modes/rpc/rpc-client.ts:531] [E: packages/coding-agent/src/modes/rpc/rpc-client.ts:551] [E: packages/coding-agent/src/modes/rpc/rpc-client.ts:552] [E: packages/coding-agent/src/modes/rpc/rpc-client.ts:555] [E: packages/coding-agent/src/modes/rpc/rpc-client.ts:557] [E: packages/coding-agent/src/modes/rpc/rpc-client.ts:560] [E: packages/coding-agent/src/modes/rpc/rpc-client.ts:572]。stdout line 解析后, 如果 `data.type === "response"` 且 `data.id` 命中 pending map, client resolve 对应 request; 否则把这条 JSON 当作 `AgentEvent` 分发给所有 event listeners [E: packages/coding-agent/src/modes/rpc/rpc-client.ts:499] [E: packages/coding-agent/src/modes/rpc/rpc-client.ts:501] [E: packages/coding-agent/src/modes/rpc/rpc-client.ts:504] [E: packages/coding-agent/src/modes/rpc/rpc-client.ts:506] [E: packages/coding-agent/src/modes/rpc/rpc-client.ts:507] [E: packages/coding-agent/src/modes/rpc/rpc-client.ts:512] [E: packages/coding-agent/src/modes/rpc/rpc-client.ts:513]。

`RpcClient` 的 public methods 基本是一层 typed wrapper: 例如 `prompt()` 发送 `{ type: "prompt", message, images }`, `getState()` 发送 `get_state` 并返回 `RpcSessionState`, `bash()` 发送 `{ type: "bash", command }` 并返回 `BashResult`, `getCommands()` 返回 `RpcSlashCommand[]` [E: packages/coding-agent/src/modes/rpc/rpc-client.ts:197] [E: packages/coding-agent/src/modes/rpc/rpc-client.ts:198] [E: packages/coding-agent/src/modes/rpc/rpc-client.ts:235] [E: packages/coding-agent/src/modes/rpc/rpc-client.ts:236] [E: packages/coding-agent/src/modes/rpc/rpc-client.ts:329] [E: packages/coding-agent/src/modes/rpc/rpc-client.ts:330] [E: packages/coding-agent/src/modes/rpc/rpc-client.ts:434] [E: packages/coding-agent/src/modes/rpc/rpc-client.ts:435]。`getData()` 对 `success: false` response 抛出 `error`, 对 success response 则信任 command-specific generic type 取 `data` [E: packages/coding-agent/src/modes/rpc/rpc-client.ts:582] [E: packages/coding-agent/src/modes/rpc/rpc-client.ts:583] [E: packages/coding-agent/src/modes/rpc/rpc-client.ts:585] [E: packages/coding-agent/src/modes/rpc/rpc-client.ts:589] [E: packages/coding-agent/src/modes/rpc/rpc-client.ts:590]。

进程失败会传播给 pending requests: child exit、child error 和 stdin error 都设置 `exitError` 并调用 `rejectPendingRequests()` [E: packages/coding-agent/src/modes/rpc/rpc-client.ts:106] [E: packages/coding-agent/src/modes/rpc/rpc-client.ts:109] [E: packages/coding-agent/src/modes/rpc/rpc-client.ts:110] [E: packages/coding-agent/src/modes/rpc/rpc-client.ts:112] [E: packages/coding-agent/src/modes/rpc/rpc-client.ts:115] [E: packages/coding-agent/src/modes/rpc/rpc-client.ts:116] [E: packages/coding-agent/src/modes/rpc/rpc-client.ts:118] [E: packages/coding-agent/src/modes/rpc/rpc-client.ts:122] [E: packages/coding-agent/src/modes/rpc/rpc-client.ts:123]。`stop()` 会 detach stdout reader、SIGTERM 子进程、最多等 1000ms, 超时后 SIGKILL, 最后清空 pendingRequests [E: packages/coding-agent/src/modes/rpc/rpc-client.ts:144] [E: packages/coding-agent/src/modes/rpc/rpc-client.ts:147] [E: packages/coding-agent/src/modes/rpc/rpc-client.ts:149] [E: packages/coding-agent/src/modes/rpc/rpc-client.ts:153] [E: packages/coding-agent/src/modes/rpc/rpc-client.ts:154] [E: packages/coding-agent/src/modes/rpc/rpc-client.ts:165]。

## 8 服务端 stdout 与 backpressure

`runRpcMode()` 开始时调用 `takeOverStdout()`, 然后通过 `writeRawStdout(serializeJsonLine(obj))` 输出所有 response、event 和 extension UI request [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:53] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:54] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:59] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:60]。这表示 RPC stdout 是协议通道, 普通 UI/log output 不应混入 stdout [I]。

服务端在写出普通 command response 后会 `await waitForRawStdoutBackpressure()`, parse error 和 command exception path 也会等待 backpressure [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:758] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:760] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:735] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:771]。`session.agent.subscribe()` 也注册了 backpressure callback, agent event flow 可以等待 raw stdout backpressure [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:357] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:358]。这些代码只说明 RPC mode 尝试尊重 stdout backpressure; 具体 `output-guard` 实现属于 coding-agent 输出守卫子系统, 不在本节点展开 [I]。

## Sources

- packages/coding-agent/src/modes/rpc/rpc-types.ts
- packages/coding-agent/src/modes/rpc/jsonl.ts
- packages/coding-agent/src/modes/rpc/rpc-client.ts
- packages/coding-agent/src/modes/rpc/rpc-mode.ts
- packages/coding-agent/docs/rpc.md
- packages/coding-agent/test/rpc-jsonl.test.ts
- packages/coding-agent/test/rpc-prompt-response-semantics.test.ts
- packages/coding-agent/test/suite/regressions/5868-rpc-unknown-command-id.test.ts

## 相关

- [surface.modes.rpc](rpc.md): RPC 无头模式的启动入口、进程生命周期和 command dispatch 总览。
- [ref.coding-agent.rpc-methods](../../reference/rpc-methods.md): `RpcCommand` union 与 `rpc-mode.ts` dispatch 的逐命令 catalog。
- [ref.coding-agent.json-events](../../reference/json-events.md): `AgentSessionEvent`/JSON event payload 的 catalog; RPC protocol 只是承载这些 event。
