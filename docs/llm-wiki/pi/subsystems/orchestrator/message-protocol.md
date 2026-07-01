---
id: subsys.orchestrator.message-protocol
title: IPC/RPC 消息协议
kind: subsystem
tier: T2
pkg: orchestrator
source:
  - packages/orchestrator/src/ipc/protocol.ts
  - packages/orchestrator/README.md
symbols:
  - OrchestratorRequest
  - OrchestratorResponse
evidence: explicit
status: verified
updated: 8c943640
---

> Orchestrator message protocol 是 orchestrator 进程与客户端之间的 JSONL IPC/RPC 消息类型层:它定义请求 union、响应 union、RPC stream 两端消息和最小的 encode/parse 函数。

## 能回答的问题

- orchestrator IPC 支持哪些 request type,每种 request 携带什么字段?
- `OrchestratorRequest`、`RequestMap`、`OrchestratorResponse`、`ResponseMap` 之间是什么关系?
- 普通 IPC request 和 `rpc_stream` 的响应类型有什么差别?
- IPC wire format 是 JSON、JSONL,还是其它 framing?
- orchestrator 的消息协议是否稳定?
- 这个协议和 `pi-coding-agent` 的 `RpcCommand`、`RpcResponse` 如何跨包连接?

## 职责边界

`packages/orchestrator/src/ipc/protocol.ts` 定义 TypeScript message schema 与 JSONL framing helper:请求目录 `RequestMap`、响应目录 `ResponseMap`、`ResponseFor<T>`、`encodeMessage()`、`parseRequestLine()`、`parseResponseLine()` 都在这个文件里定义 [E: packages/orchestrator/src/ipc/protocol.ts:43] [E: packages/orchestrator/src/ipc/protocol.ts:105] [E: packages/orchestrator/src/ipc/protocol.ts:124] [E: packages/orchestrator/src/ipc/protocol.ts:130] [E: packages/orchestrator/src/ipc/protocol.ts:134] [E: packages/orchestrator/src/ipc/protocol.ts:139]。它不实现 Unix socket 生命周期、请求 dispatch、实例 supervisor 或 CLI 参数解析;这些是相邻 subsystem 的职责 [I]。

orchestrator 包整体稳定性应标为 experimental:包 README 明确说该包仍在 active development,CLI、API 和行为尚不稳定,可能变更或移除 [E: packages/orchestrator/README.md:3]。

## 关键文件

- `packages/orchestrator/src/ipc/protocol.ts`:消息协议的权威文件,定义 `SpawnRequest`、`ListRequest`、`StopRequest`、`StatusRequest`、`RpcRequest`、`RpcStreamRequest`、`RequestMap`、`OrchestratorRequest`、响应接口、`ResponseMap`、`OrchestratorResponse`、RPC stream message union 与 JSONL helper [E: packages/orchestrator/src/ipc/protocol.ts:10] [E: packages/orchestrator/src/ipc/protocol.ts:18] [E: packages/orchestrator/src/ipc/protocol.ts:22] [E: packages/orchestrator/src/ipc/protocol.ts:27] [E: packages/orchestrator/src/ipc/protocol.ts:32] [E: packages/orchestrator/src/ipc/protocol.ts:38] [E: packages/orchestrator/src/ipc/protocol.ts:43] [E: packages/orchestrator/src/ipc/protocol.ts:52] [E: packages/orchestrator/src/ipc/protocol.ts:69] [E: packages/orchestrator/src/ipc/protocol.ts:74] [E: packages/orchestrator/src/ipc/protocol.ts:79] [E: packages/orchestrator/src/ipc/protocol.ts:84] [E: packages/orchestrator/src/ipc/protocol.ts:89] [E: packages/orchestrator/src/ipc/protocol.ts:94] [E: packages/orchestrator/src/ipc/protocol.ts:105] [E: packages/orchestrator/src/ipc/protocol.ts:114] [E: packages/orchestrator/src/ipc/protocol.ts:115] [E: packages/orchestrator/src/ipc/protocol.ts:116] [E: packages/orchestrator/src/ipc/protocol.ts:130] [E: packages/orchestrator/src/ipc/protocol.ts:134] [E: packages/orchestrator/src/ipc/protocol.ts:139]。
- `packages/orchestrator/README.md`:稳定性声明来源,用于把本节点的稳定性如实降级为 experimental [E: packages/orchestrator/README.md:3]。

## 数据模型

### OrchestratorRequest 与 RequestMap

`RequestMap` 是请求目录:`spawn`、`list`、`stop`、`status`、`rpc`、`rpc_stream` 分别映射到对应 request interface [E: packages/orchestrator/src/ipc/protocol.ts:43] [E: packages/orchestrator/src/ipc/protocol.ts:44] [E: packages/orchestrator/src/ipc/protocol.ts:45] [E: packages/orchestrator/src/ipc/protocol.ts:46] [E: packages/orchestrator/src/ipc/protocol.ts:47] [E: packages/orchestrator/src/ipc/protocol.ts:48] [E: packages/orchestrator/src/ipc/protocol.ts:49]。`OrchestratorRequest` 不是手写 union,而是 `RequestMap[keyof RequestMap]`,因此新增或删除 request key 会自动改变 orchestrator 入口请求 union [E: packages/orchestrator/src/ipc/protocol.ts:52] [I]。

| request type | TypeScript interface | 关键字段 | 语义 |
| --- | --- | --- | --- |
| `spawn` | `SpawnRequest` | `type: "spawn"`, `cwd`,可选 `label`/`provider`/`model` | 协议层只定义该 request shape;创建实例的业务语义来自命名与相邻 handler [E: packages/orchestrator/src/ipc/protocol.ts:10] [E: packages/orchestrator/src/ipc/protocol.ts:11] [E: packages/orchestrator/src/ipc/protocol.ts:12] [E: packages/orchestrator/src/ipc/protocol.ts:13] [E: packages/orchestrator/src/ipc/protocol.ts:14] [E: packages/orchestrator/src/ipc/protocol.ts:15] [I] |
| `list` | `ListRequest` | `type: "list"`;无额外字段 | 协议层只定义该 request shape;列出实例是按 `type` 名称给出的语义 [E: packages/orchestrator/src/ipc/protocol.ts:18] [E: packages/orchestrator/src/ipc/protocol.ts:19] [I] |
| `stop` | `StopRequest` | `type: "stop"`, `instanceId` | 协议层只定义该 request shape;停止实例是按 `type` 与字段名给出的语义 [E: packages/orchestrator/src/ipc/protocol.ts:22] [E: packages/orchestrator/src/ipc/protocol.ts:23] [E: packages/orchestrator/src/ipc/protocol.ts:24] [I] |
| `status` | `StatusRequest` | `type: "status"`, `instanceId` | 协议层只定义该 request shape;读取状态是按 `type` 与字段名给出的语义 [E: packages/orchestrator/src/ipc/protocol.ts:27] [E: packages/orchestrator/src/ipc/protocol.ts:28] [E: packages/orchestrator/src/ipc/protocol.ts:29] [I] |
| `rpc` | `RpcRequest` | `type: "rpc"`, `instanceId`, `command: RpcCommand` | 对指定实例发送一次 coding-agent RPC command 是由字段 shape 直接表达的协议语义 [E: packages/orchestrator/src/ipc/protocol.ts:32] [E: packages/orchestrator/src/ipc/protocol.ts:33] [E: packages/orchestrator/src/ipc/protocol.ts:34] [E: packages/orchestrator/src/ipc/protocol.ts:35] |
| `rpc_stream` | `RpcStreamRequest` | `type: "rpc_stream"`, `instanceId` | 协议层定义 stream request shape;“切换为持续 RPC stream”还依赖相邻 transport/handler 行为 [E: packages/orchestrator/src/ipc/protocol.ts:38] [E: packages/orchestrator/src/ipc/protocol.ts:39] [E: packages/orchestrator/src/ipc/protocol.ts:40] [I] |

### OrchestratorResponse 与 ResponseMap

`ResponseBase` 提供 `ok: boolean` 与可选 `error` 字段 [E: packages/orchestrator/src/ipc/protocol.ts:64] [E: packages/orchestrator/src/ipc/protocol.ts:65] [E: packages/orchestrator/src/ipc/protocol.ts:66]。`ResponseMap` 按 request key 映射正常响应:`spawn -> SpawnResponse`、`list -> ListResponse`、`stop -> StopResponse`、`status -> StatusResponse`、`rpc -> RpcBridgeResponse`、`rpc_stream -> RpcReadyResponse` [E: packages/orchestrator/src/ipc/protocol.ts:105] [E: packages/orchestrator/src/ipc/protocol.ts:106] [E: packages/orchestrator/src/ipc/protocol.ts:107] [E: packages/orchestrator/src/ipc/protocol.ts:108] [E: packages/orchestrator/src/ipc/protocol.ts:109] [E: packages/orchestrator/src/ipc/protocol.ts:110] [E: packages/orchestrator/src/ipc/protocol.ts:111]。这些 mapped response interface 都扩展 `ResponseBase` [E: packages/orchestrator/src/ipc/protocol.ts:69] [E: packages/orchestrator/src/ipc/protocol.ts:74] [E: packages/orchestrator/src/ipc/protocol.ts:79] [E: packages/orchestrator/src/ipc/protocol.ts:84] [E: packages/orchestrator/src/ipc/protocol.ts:89] [E: packages/orchestrator/src/ipc/protocol.ts:94]。`OrchestratorResponse` 等于 `ResponseMap[keyof ResponseMap] | ErrorResponse`,所以普通 response union 还包含统一的 `{ type: "error", ok: false, error }` 失败形态 [E: packages/orchestrator/src/ipc/protocol.ts:99] [E: packages/orchestrator/src/ipc/protocol.ts:100] [E: packages/orchestrator/src/ipc/protocol.ts:101] [E: packages/orchestrator/src/ipc/protocol.ts:102] [E: packages/orchestrator/src/ipc/protocol.ts:114]。

| request key | success response type | response `type` | payload |
| --- | --- | --- | --- |
| `spawn` | `SpawnResponse` | `spawn_result` | 可选 `instance?: InstanceSummary` [E: packages/orchestrator/src/ipc/protocol.ts:69] [E: packages/orchestrator/src/ipc/protocol.ts:70] [E: packages/orchestrator/src/ipc/protocol.ts:71] |
| `list` | `ListResponse` | `list_result` | 可选 `instances?: InstanceSummary[]` [E: packages/orchestrator/src/ipc/protocol.ts:74] [E: packages/orchestrator/src/ipc/protocol.ts:75] [E: packages/orchestrator/src/ipc/protocol.ts:76] |
| `stop` | `StopResponse` | `stop_result` | 可选 `instanceId?: string` [E: packages/orchestrator/src/ipc/protocol.ts:79] [E: packages/orchestrator/src/ipc/protocol.ts:80] [E: packages/orchestrator/src/ipc/protocol.ts:81] |
| `status` | `StatusResponse` | `status_result` | 可选 `instance?: InstanceSummary` [E: packages/orchestrator/src/ipc/protocol.ts:84] [E: packages/orchestrator/src/ipc/protocol.ts:85] [E: packages/orchestrator/src/ipc/protocol.ts:86] |
| `rpc` | `RpcBridgeResponse` | `rpc_result` | `response: RpcResponse` [E: packages/orchestrator/src/ipc/protocol.ts:89] [E: packages/orchestrator/src/ipc/protocol.ts:90] [E: packages/orchestrator/src/ipc/protocol.ts:91] |
| `rpc_stream` | `RpcReadyResponse` | `rpc_ready` | 可选 `instance?: InstanceSummary` [E: packages/orchestrator/src/ipc/protocol.ts:94] [E: packages/orchestrator/src/ipc/protocol.ts:95] [E: packages/orchestrator/src/ipc/protocol.ts:96] |

`InstanceSummary` 是 IPC 响应里暴露给客户端的实例摘要,包括 `id`、`status`、`cwd`,以及可选 `label`、`sessionId`、`sessionFile`、`radiusPiId` [E: packages/orchestrator/src/ipc/protocol.ts:54] [E: packages/orchestrator/src/ipc/protocol.ts:55] [E: packages/orchestrator/src/ipc/protocol.ts:56] [E: packages/orchestrator/src/ipc/protocol.ts:57] [E: packages/orchestrator/src/ipc/protocol.ts:58] [E: packages/orchestrator/src/ipc/protocol.ts:59] [E: packages/orchestrator/src/ipc/protocol.ts:60] [E: packages/orchestrator/src/ipc/protocol.ts:61]。

### RPC stream message union

普通 request/response union 之外,协议还把 stream 内的客户端消息定义为 `RpcCommand | RpcExtensionUIResponse`,把 stream 内的服务端消息定义为 `RpcReadyResponse | RpcResponse | AgentSessionEvent | RpcExtensionUIRequest | ErrorResponse` [E: packages/orchestrator/src/ipc/protocol.ts:115] [E: packages/orchestrator/src/ipc/protocol.ts:116] [E: packages/orchestrator/src/ipc/protocol.ts:117] [E: packages/orchestrator/src/ipc/protocol.ts:118] [E: packages/orchestrator/src/ipc/protocol.ts:119] [E: packages/orchestrator/src/ipc/protocol.ts:120] [E: packages/orchestrator/src/ipc/protocol.ts:121]。`ProtocolMessage` 是最宽的 wire message union,覆盖 `OrchestratorRequest`、`OrchestratorResponse`、`RpcClientMessage`、`RpcServerMessage` [E: packages/orchestrator/src/ipc/protocol.ts:122]。

## 控制流

1. 普通 request union 的合法 shape 来自 `RequestMap[keyof RequestMap]` [E: packages/orchestrator/src/ipc/protocol.ts:52]。
2. 调用 `encodeMessage(message)` 时,该函数接收 `ProtocolMessage`,对 message 做 `JSON.stringify(message)` 并追加单个换行符;把它称为 newline-delimited JSON(JSONL) framing 是对该返回值的协议层归纳 [E: packages/orchestrator/src/ipc/protocol.ts:130] [E: packages/orchestrator/src/ipc/protocol.ts:131] [I]。
3. 普通请求入口可用 `parseRequestLine(line)` 把一行 JSON parse 为 `OrchestratorRequest`;当前实现只是 `JSON.parse` 加 type assertion,不做运行时 schema 校验 [E: packages/orchestrator/src/ipc/protocol.ts:134] [E: packages/orchestrator/src/ipc/protocol.ts:135] [I]。
4. 响应侧可用 `parseResponseLine(line)` 把一行 JSON parse 为 `OrchestratorResponse`;当前实现同样只是 `JSON.parse` 加 TypeScript assertion [E: packages/orchestrator/src/ipc/protocol.ts:139] [E: packages/orchestrator/src/ipc/protocol.ts:140] [I]。
5. Type-level helper `ResponseFor<T>` 通过请求的 `type` 推导 `ResponseMap[K] | ErrorResponse`,让调用侧在类型层表达 request 与 response 的对应关系 [E: packages/orchestrator/src/ipc/protocol.ts:124] [E: packages/orchestrator/src/ipc/protocol.ts:125] [E: packages/orchestrator/src/ipc/protocol.ts:126]。

## 设计动机与权衡

`RequestMap`/`ResponseMap` 把 request key 和 success response key 集中在 map 里 [E: packages/orchestrator/src/ipc/protocol.ts:43] [E: packages/orchestrator/src/ipc/protocol.ts:44] [E: packages/orchestrator/src/ipc/protocol.ts:45] [E: packages/orchestrator/src/ipc/protocol.ts:46] [E: packages/orchestrator/src/ipc/protocol.ts:47] [E: packages/orchestrator/src/ipc/protocol.ts:48] [E: packages/orchestrator/src/ipc/protocol.ts:49] [E: packages/orchestrator/src/ipc/protocol.ts:105] [E: packages/orchestrator/src/ipc/protocol.ts:106] [E: packages/orchestrator/src/ipc/protocol.ts:107] [E: packages/orchestrator/src/ipc/protocol.ts:108] [E: packages/orchestrator/src/ipc/protocol.ts:109] [E: packages/orchestrator/src/ipc/protocol.ts:110] [E: packages/orchestrator/src/ipc/protocol.ts:111]。这比在多个位置维护分散 union 更容易 grep 和扩展 [I]。代价是 parse 函数不验证字段合法性:无效 JSON 会在 `JSON.parse` 抛错,但字段缺失、未知 `type` 或 payload shape 错误不会在协议层被 TypeScript 自动拦下 [E: packages/orchestrator/src/ipc/protocol.ts:135] [E: packages/orchestrator/src/ipc/protocol.ts:140] [I]。

`ErrorResponse` 定义在 `ResponseMap` 之外,并被并入 `OrchestratorResponse` 与 `ResponseFor<T>`;在类型层,每个 `ResponseFor<T>` 分支都允许 `ErrorResponse` [E: packages/orchestrator/src/ipc/protocol.ts:99] [E: packages/orchestrator/src/ipc/protocol.ts:105] [E: packages/orchestrator/src/ipc/protocol.ts:114] [E: packages/orchestrator/src/ipc/protocol.ts:126] [E: packages/orchestrator/src/ipc/protocol.ts:127]。`rpc_stream` 的 success response 是 `rpc_ready`,随后同一 stream 可继续传递 `RpcResponse`、`AgentSessionEvent`、extension UI request 与 error;client stream message 还可传 `RpcExtensionUIResponse` [E: packages/orchestrator/src/ipc/protocol.ts:94] [E: packages/orchestrator/src/ipc/protocol.ts:95] [E: packages/orchestrator/src/ipc/protocol.ts:115] [E: packages/orchestrator/src/ipc/protocol.ts:116] [E: packages/orchestrator/src/ipc/protocol.ts:118] [E: packages/orchestrator/src/ipc/protocol.ts:119] [E: packages/orchestrator/src/ipc/protocol.ts:120] [E: packages/orchestrator/src/ipc/protocol.ts:121]。因此 `rpc_stream` 是协议里显式连接普通 IPC request 与持续 RPC stream message union 的 request [I]。

## Gotcha

- `encodeMessage()` 的换行符来自返回值里的 `\n`;把它作为协议 framing 使用是对 helper 的归纳,具体读端行为要看 transport 节点 [E: packages/orchestrator/src/ipc/protocol.ts:131] [I]。
- `parseRequestLine()` 与 `parseResponseLine()` 不返回 validation result,也没有 discriminated-union runtime guard;它们把 JSON parse 结果直接断言为目标类型 [E: packages/orchestrator/src/ipc/protocol.ts:135] [E: packages/orchestrator/src/ipc/protocol.ts:140] [I]。
- `SpawnRequest` 暴露 `provider` 与 `model`,但协议文件本身只定义字段,不保证 handler 当前一定消费这两个字段 [E: packages/orchestrator/src/ipc/protocol.ts:14] [E: packages/orchestrator/src/ipc/protocol.ts:15] [I]。
- `RpcBridgeResponse.response` 是 coding-agent 的 `RpcResponse`,不是 orchestrator 自己重新定义的 RPC payload [E: packages/orchestrator/src/ipc/protocol.ts:6] [E: packages/orchestrator/src/ipc/protocol.ts:91]。

## 跨包边界

本节点属于 `pkg: orchestrator`,但协议类型直接从 `@earendil-works/pi-coding-agent` 导入 `AgentSessionEvent`、`RpcCommand`、`RpcExtensionUIRequest`、`RpcExtensionUIResponse`、`RpcResponse`,说明 orchestrator IPC/RPC message protocol 复用 coding-agent 的 RPC 与 session event 类型;“没有在 orchestrator 包内复制这些 payload schema”是基于本协议文件未出现这些 payload 本地定义的归纳 [E: packages/orchestrator/src/ipc/protocol.ts:1] [E: packages/orchestrator/src/ipc/protocol.ts:2] [E: packages/orchestrator/src/ipc/protocol.ts:3] [E: packages/orchestrator/src/ipc/protocol.ts:4] [E: packages/orchestrator/src/ipc/protocol.ts:5] [E: packages/orchestrator/src/ipc/protocol.ts:6] [E: packages/orchestrator/src/ipc/protocol.ts:7] [I]。

`subsys.orchestrator.ipc-transport` 是本协议的传输层相邻节点:本节点说明 message shape 与 JSONL framing,传输层节点应说明 Unix socket 连接、读写循环和 socket lifecycle [I]。`ref.orchestrator.ipc-messages` 是跨包显式相关的 catalog 节点:它应逐条枚举 `RequestMap`/`ResponseMap` 中每个 IPC message,而本节点解释这些 message 如何组成协议 [E: packages/orchestrator/src/ipc/protocol.ts:43] [E: packages/orchestrator/src/ipc/protocol.ts:44] [E: packages/orchestrator/src/ipc/protocol.ts:45] [E: packages/orchestrator/src/ipc/protocol.ts:46] [E: packages/orchestrator/src/ipc/protocol.ts:47] [E: packages/orchestrator/src/ipc/protocol.ts:48] [E: packages/orchestrator/src/ipc/protocol.ts:49] [E: packages/orchestrator/src/ipc/protocol.ts:105] [E: packages/orchestrator/src/ipc/protocol.ts:106] [E: packages/orchestrator/src/ipc/protocol.ts:107] [E: packages/orchestrator/src/ipc/protocol.ts:108] [E: packages/orchestrator/src/ipc/protocol.ts:109] [E: packages/orchestrator/src/ipc/protocol.ts:110] [E: packages/orchestrator/src/ipc/protocol.ts:111]。

## Sources

- packages/orchestrator/src/ipc/protocol.ts
- packages/orchestrator/README.md

## 相关

- [subsys.orchestrator.ipc-transport](../../subsystems/orchestrator/ipc-transport.md)
- [ref.orchestrator.ipc-messages](../../reference/ipc-messages.md)
