---
id: ref.orchestrator.ipc-messages
title: IPC 消息目录
kind: catalog
tier: T3
pkg: orchestrator
source:
  - packages/orchestrator/src/ipc/protocol.ts
  - packages/orchestrator/README.md
symbols:
  - OrchestratorRequest
  - OrchestratorResponse
  - RequestMap
  - ResponseMap
evidence: explicit
status: verified
updated: 8c943640
related:
  - subsys.orchestrator.message-protocol
---

> `ref.orchestrator.ipc-messages` 是 orchestrator IPC/RPC message catalog:逐实例列出 `RequestMap`、`ResponseMap`、`OrchestratorRequest`、`OrchestratorResponse` 以及 RPC stream 内的 client/server message 变体。

## 能回答的问题

- orchestrator IPC 当前支持哪些 request `type`?
- 每个 IPC request 对应哪个 success response `type`?
- `OrchestratorRequest` 和 `RequestMap` 是什么关系?
- `OrchestratorResponse`、`ResponseMap` 和 `ErrorResponse` 是什么关系?
- `rpc_stream` 打开后,stream 内允许哪些 client/server message?
- orchestrator IPC 协议稳定吗?

## Catalog 口径与稳定性

本目录以 `packages/orchestrator/src/ipc/protocol.ts` 为消息全集的 ground truth:`RequestMap` 当前列出 6 个 request key,`ResponseMap` 当前列出 6 个 success response key [E: packages/orchestrator/src/ipc/protocol.ts:44] [E: packages/orchestrator/src/ipc/protocol.ts:45] [E: packages/orchestrator/src/ipc/protocol.ts:46] [E: packages/orchestrator/src/ipc/protocol.ts:47] [E: packages/orchestrator/src/ipc/protocol.ts:48] [E: packages/orchestrator/src/ipc/protocol.ts:49] [E: packages/orchestrator/src/ipc/protocol.ts:106] [E: packages/orchestrator/src/ipc/protocol.ts:107] [E: packages/orchestrator/src/ipc/protocol.ts:108] [E: packages/orchestrator/src/ipc/protocol.ts:109] [E: packages/orchestrator/src/ipc/protocol.ts:110] [E: packages/orchestrator/src/ipc/protocol.ts:111]。`OrchestratorRequest` 由 `RequestMap[keyof RequestMap]` 派生,所以本目录把 `RequestMap` 的每个 key 视为一个 IPC request 实例 [E: packages/orchestrator/src/ipc/protocol.ts:52]。`OrchestratorResponse` 由 `ResponseMap[keyof ResponseMap] | ErrorResponse` 派生,所以本目录把 6 个 success response 与统一 `error` response 都列入 response 变体 [E: packages/orchestrator/src/ipc/protocol.ts:99] [E: packages/orchestrator/src/ipc/protocol.ts:114]。

orchestrator 包稳定性是 experimental:包 README 明确说该 package 处于 active development,CLI、API 和 behavior 尚不稳定,可能无通知变更或移除 [E: packages/orchestrator/README.md:3]。本节点只记录当前 `5a073885` 源码快照的 message shape,不把这些 IPC 字段描述成稳定外部 API [I]。

## IPC request 逐实例目录

| request `type` | TypeScript interface | 字段 | `RequestMap` key | 语义 | 证据 |
| --- | --- | --- | --- | --- | --- |
| `spawn` | `SpawnRequest` | `cwd: string`; optional `label?: string`; optional `provider?: string`; optional `model?: string` | `spawn` | 请求 orchestrator 为一个工作目录创建实例,并可携带展示 label 与模型选择字段。 | interface [E: packages/orchestrator/src/ipc/protocol.ts:10] [E: packages/orchestrator/src/ipc/protocol.ts:11] [E: packages/orchestrator/src/ipc/protocol.ts:12] [E: packages/orchestrator/src/ipc/protocol.ts:13] [E: packages/orchestrator/src/ipc/protocol.ts:14] [E: packages/orchestrator/src/ipc/protocol.ts:15]; map [E: packages/orchestrator/src/ipc/protocol.ts:44] |
| `list` | `ListRequest` | 无额外字段 | `list` | 请求列出 orchestrator 已知实例。 | interface [E: packages/orchestrator/src/ipc/protocol.ts:18] [E: packages/orchestrator/src/ipc/protocol.ts:19]; map [E: packages/orchestrator/src/ipc/protocol.ts:45] |
| `stop` | `StopRequest` | `instanceId: string` | `stop` | 请求停止指定实例。 | interface [E: packages/orchestrator/src/ipc/protocol.ts:22] [E: packages/orchestrator/src/ipc/protocol.ts:23] [E: packages/orchestrator/src/ipc/protocol.ts:24]; map [E: packages/orchestrator/src/ipc/protocol.ts:46] |
| `status` | `StatusRequest` | `instanceId: string` | `status` | 请求读取指定实例状态。 | interface [E: packages/orchestrator/src/ipc/protocol.ts:27] [E: packages/orchestrator/src/ipc/protocol.ts:28] [E: packages/orchestrator/src/ipc/protocol.ts:29]; map [E: packages/orchestrator/src/ipc/protocol.ts:47] |
| `rpc` | `RpcRequest` | `instanceId: string`; `command: RpcCommand` | `rpc` | 对指定实例发送一次 coding-agent RPC command,并在普通 IPC response 中返回 `RpcResponse`。 | interface [E: packages/orchestrator/src/ipc/protocol.ts:32] [E: packages/orchestrator/src/ipc/protocol.ts:33] [E: packages/orchestrator/src/ipc/protocol.ts:34] [E: packages/orchestrator/src/ipc/protocol.ts:35]; map [E: packages/orchestrator/src/ipc/protocol.ts:48]; response payload [E: packages/orchestrator/src/ipc/protocol.ts:91] |
| `rpc_stream` | `RpcStreamRequest` | `instanceId: string` | `rpc_stream` | 请求打开 RPC stream,初始 success response 是 `rpc_ready`。 | interface [E: packages/orchestrator/src/ipc/protocol.ts:38] [E: packages/orchestrator/src/ipc/protocol.ts:39] [E: packages/orchestrator/src/ipc/protocol.ts:40]; map [E: packages/orchestrator/src/ipc/protocol.ts:49]; response map [E: packages/orchestrator/src/ipc/protocol.ts:111] |

## IPC response 逐实例目录

`ResponseBase` 定义 `ok: boolean` 和 optional `error?: string`;下表 6 个 success response interface 均以 `extends ResponseBase` 声明。`ErrorResponse` 也继承 `ResponseBase`,但固定为 `type: "error"`、`ok: false`、`error: string` [E: packages/orchestrator/src/ipc/protocol.ts:64] [E: packages/orchestrator/src/ipc/protocol.ts:65] [E: packages/orchestrator/src/ipc/protocol.ts:66] [E: packages/orchestrator/src/ipc/protocol.ts:69] [E: packages/orchestrator/src/ipc/protocol.ts:74] [E: packages/orchestrator/src/ipc/protocol.ts:79] [E: packages/orchestrator/src/ipc/protocol.ts:84] [E: packages/orchestrator/src/ipc/protocol.ts:89] [E: packages/orchestrator/src/ipc/protocol.ts:94] [E: packages/orchestrator/src/ipc/protocol.ts:99] [E: packages/orchestrator/src/ipc/protocol.ts:100] [E: packages/orchestrator/src/ipc/protocol.ts:101] [E: packages/orchestrator/src/ipc/protocol.ts:102]。

| request key | success response interface | response `type` | payload 字段 | `ResponseMap` key | 语义 | 证据 |
| --- | --- | --- | --- | --- | --- | --- |
| `spawn` | `SpawnResponse` | `spawn_result` | optional `instance?: InstanceSummary` | `spawn` | 返回 spawn 请求的结果,成功 payload 可包含新实例摘要。 | interface [E: packages/orchestrator/src/ipc/protocol.ts:69] [E: packages/orchestrator/src/ipc/protocol.ts:70] [E: packages/orchestrator/src/ipc/protocol.ts:71]; map [E: packages/orchestrator/src/ipc/protocol.ts:106] |
| `list` | `ListResponse` | `list_result` | optional `instances?: InstanceSummary[]` | `list` | 返回实例列表结果。 | interface [E: packages/orchestrator/src/ipc/protocol.ts:74] [E: packages/orchestrator/src/ipc/protocol.ts:75] [E: packages/orchestrator/src/ipc/protocol.ts:76]; map [E: packages/orchestrator/src/ipc/protocol.ts:107] |
| `stop` | `StopResponse` | `stop_result` | optional `instanceId?: string` | `stop` | 返回 stop 请求结果,可回传被停止的 instance id。 | interface [E: packages/orchestrator/src/ipc/protocol.ts:79] [E: packages/orchestrator/src/ipc/protocol.ts:80] [E: packages/orchestrator/src/ipc/protocol.ts:81]; map [E: packages/orchestrator/src/ipc/protocol.ts:108] |
| `status` | `StatusResponse` | `status_result` | optional `instance?: InstanceSummary` | `status` | 返回单个实例状态查询结果。 | interface [E: packages/orchestrator/src/ipc/protocol.ts:84] [E: packages/orchestrator/src/ipc/protocol.ts:85] [E: packages/orchestrator/src/ipc/protocol.ts:86]; map [E: packages/orchestrator/src/ipc/protocol.ts:109] |
| `rpc` | `RpcBridgeResponse` | `rpc_result` | `response: RpcResponse` | `rpc` | 返回一次 coding-agent RPC command 的 `RpcResponse`,orchestrator 没有重新定义该 payload。 | interface [E: packages/orchestrator/src/ipc/protocol.ts:89] [E: packages/orchestrator/src/ipc/protocol.ts:90] [E: packages/orchestrator/src/ipc/protocol.ts:91]; map [E: packages/orchestrator/src/ipc/protocol.ts:110] |
| `rpc_stream` | `RpcReadyResponse` | `rpc_ready` | optional `instance?: InstanceSummary` | `rpc_stream` | `ResponseMap.rpc_stream` 的 success response,且属于 stream server message union。 | interface [E: packages/orchestrator/src/ipc/protocol.ts:94] [E: packages/orchestrator/src/ipc/protocol.ts:95] [E: packages/orchestrator/src/ipc/protocol.ts:96]; map [E: packages/orchestrator/src/ipc/protocol.ts:111]; stream union [E: packages/orchestrator/src/ipc/protocol.ts:117] |
| any request | `ErrorResponse` | `error` | `ok: false`; `error: string` | 不在 `ResponseMap` 中 | 统一失败 envelope 可作为任意 `OrchestratorResponse` 或任意 `ResponseFor<T>` 的失败形态。 | interface [E: packages/orchestrator/src/ipc/protocol.ts:99]; union [E: packages/orchestrator/src/ipc/protocol.ts:114]; helper [E: packages/orchestrator/src/ipc/protocol.ts:124] [E: packages/orchestrator/src/ipc/protocol.ts:126] |

## InstanceSummary payload

`InstanceSummary` 是 IPC response 中复用的实例摘要 payload,字段为 `id: string`、`status: InstanceStatus`、`cwd: string`,以及 optional `label?: string`、`sessionId?: string`、`sessionFile?: string`、`radiusPiId?: string` [E: packages/orchestrator/src/ipc/protocol.ts:54] [E: packages/orchestrator/src/ipc/protocol.ts:55] [E: packages/orchestrator/src/ipc/protocol.ts:56] [E: packages/orchestrator/src/ipc/protocol.ts:57] [E: packages/orchestrator/src/ipc/protocol.ts:58] [E: packages/orchestrator/src/ipc/protocol.ts:59] [E: packages/orchestrator/src/ipc/protocol.ts:60] [E: packages/orchestrator/src/ipc/protocol.ts:61]。`status` 的具体取值来自 orchestrator 内部 `InstanceStatus` 类型,本目录只在 IPC 层记录该字段引用,不展开实例状态生命周期 [E: packages/orchestrator/src/ipc/protocol.ts:8] [I]。

## Union 与 map 关系

| symbol | 定义 | 当前包含的 message 变体 | 作用 | 证据 |
| --- | --- | --- | --- | --- |
| `RequestMap` | interface map | `spawn`, `list`, `stop`, `status`, `rpc`, `rpc_stream` | IPC request key 的权威目录。 | [E: packages/orchestrator/src/ipc/protocol.ts:44] [E: packages/orchestrator/src/ipc/protocol.ts:45] [E: packages/orchestrator/src/ipc/protocol.ts:46] [E: packages/orchestrator/src/ipc/protocol.ts:47] [E: packages/orchestrator/src/ipc/protocol.ts:48] [E: packages/orchestrator/src/ipc/protocol.ts:49] |
| `OrchestratorRequest` | `RequestMap[keyof RequestMap]` | 6 个 request interface 的 union | 普通 IPC request parser 的返回类型。 | [E: packages/orchestrator/src/ipc/protocol.ts:52] [E: packages/orchestrator/src/ipc/protocol.ts:134] |
| `ResponseMap` | interface map | `spawn`, `list`, `stop`, `status`, `rpc`, `rpc_stream` | IPC success response key 的权威目录。 | [E: packages/orchestrator/src/ipc/protocol.ts:106] [E: packages/orchestrator/src/ipc/protocol.ts:107] [E: packages/orchestrator/src/ipc/protocol.ts:108] [E: packages/orchestrator/src/ipc/protocol.ts:109] [E: packages/orchestrator/src/ipc/protocol.ts:110] [E: packages/orchestrator/src/ipc/protocol.ts:111] |
| `OrchestratorResponse` | `ResponseMap[keyof ResponseMap] \| ErrorResponse` | 6 个 success response interface 加 `ErrorResponse` | 普通 IPC response parser 的返回类型。 | [E: packages/orchestrator/src/ipc/protocol.ts:114] [E: packages/orchestrator/src/ipc/protocol.ts:139] |
| `ResponseFor<T>` | conditional type | `ResponseMap[K] \| ErrorResponse` 或 `ErrorResponse` | 在类型层把 request `type` 映射到对应 response。 | [E: packages/orchestrator/src/ipc/protocol.ts:124] [E: packages/orchestrator/src/ipc/protocol.ts:125] [E: packages/orchestrator/src/ipc/protocol.ts:126] [E: packages/orchestrator/src/ipc/protocol.ts:127] |

`parseRequestLine(line)` 和 `parseResponseLine(line)` 都是 `JSON.parse` 加 TypeScript assertion,没有在协议文件里做 discriminated-union runtime validation [E: packages/orchestrator/src/ipc/protocol.ts:134] [E: packages/orchestrator/src/ipc/protocol.ts:135] [E: packages/orchestrator/src/ipc/protocol.ts:139] [E: packages/orchestrator/src/ipc/protocol.ts:140] [I]。`encodeMessage(message)` 接收最宽的 `ProtocolMessage`,输出 `JSON.stringify(message)` 后追加换行,所以 wire framing 是 newline-delimited JSON / JSONL [E: packages/orchestrator/src/ipc/protocol.ts:122] [E: packages/orchestrator/src/ipc/protocol.ts:130] [E: packages/orchestrator/src/ipc/protocol.ts:131]。

## RPC stream message 逐实例目录

`rpc_stream` request 的 initial success response 是 `RpcReadyResponse`,但 stream 内 message union 不是 `OrchestratorRequest`/`OrchestratorResponse` 的简单重复:client message 和 server message 各自有独立 union [E: packages/orchestrator/src/ipc/protocol.ts:94] [E: packages/orchestrator/src/ipc/protocol.ts:111] [E: packages/orchestrator/src/ipc/protocol.ts:115] [E: packages/orchestrator/src/ipc/protocol.ts:116]。

| stream direction | message 变体 | 来源类型 | 含义 | 证据 |
| --- | --- | --- | --- | --- |
| client -> server | `RpcCommand` | imported from `@earendil-works/pi-coding-agent` | stream client 可直接发送 coding-agent RPC command。 | import [E: packages/orchestrator/src/ipc/protocol.ts:3]; union [E: packages/orchestrator/src/ipc/protocol.ts:115] |
| client -> server | `RpcExtensionUIResponse` | imported from `@earendil-works/pi-coding-agent` | stream client 可回复 extension UI request。 | import [E: packages/orchestrator/src/ipc/protocol.ts:5]; union [E: packages/orchestrator/src/ipc/protocol.ts:115] |
| server -> client | `RpcReadyResponse` | orchestrator local interface | server 可发送 `rpc_ready` 表示 stream ready。 | interface [E: packages/orchestrator/src/ipc/protocol.ts:94]; union [E: packages/orchestrator/src/ipc/protocol.ts:117] |
| server -> client | `RpcResponse` | imported from `@earendil-works/pi-coding-agent` | server 可转发 coding-agent RPC response。 | import [E: packages/orchestrator/src/ipc/protocol.ts:6]; union [E: packages/orchestrator/src/ipc/protocol.ts:118] |
| server -> client | `AgentSessionEvent` | imported from `@earendil-works/pi-coding-agent` | server 可转发 coding-agent session event。 | import [E: packages/orchestrator/src/ipc/protocol.ts:2]; union [E: packages/orchestrator/src/ipc/protocol.ts:119] |
| server -> client | `RpcExtensionUIRequest` | imported from `@earendil-works/pi-coding-agent` | server 可发起 extension UI request。 | import [E: packages/orchestrator/src/ipc/protocol.ts:4]; union [E: packages/orchestrator/src/ipc/protocol.ts:120] |
| server -> client | `ErrorResponse` | orchestrator local interface | server 可在 stream 内发送统一 error envelope。 | interface [E: packages/orchestrator/src/ipc/protocol.ts:99]; union [E: packages/orchestrator/src/ipc/protocol.ts:121] |

`ProtocolMessage` 是当前协议文件里最宽的 wire message union,覆盖 `OrchestratorRequest`、`OrchestratorResponse`、`RpcClientMessage`、`RpcServerMessage` 四类消息 [E: packages/orchestrator/src/ipc/protocol.ts:122]。

## 跨包关系

`subsys.orchestrator.message-protocol` 是本 catalog 的上层协议节点:该节点解释 JSONL framing、parse/encode helper 和 request/response 如何组成 orchestrator IPC/RPC 协议;本 catalog 只负责逐实例枚举 message 变体 [I]。

orchestrator IPC stream 直接导入 `@earendil-works/pi-coding-agent` 的 `RpcCommand`、`RpcResponse`、`AgentSessionEvent`、`RpcExtensionUIRequest` 和 `RpcExtensionUIResponse`,所以本目录只把这些 imported type 作为跨包 payload 边界点列出,不在 orchestrator 节点内复写 coding-agent RPC command 或 session event 的完整 catalog [E: packages/orchestrator/src/ipc/protocol.ts:2] [E: packages/orchestrator/src/ipc/protocol.ts:3] [E: packages/orchestrator/src/ipc/protocol.ts:4] [E: packages/orchestrator/src/ipc/protocol.ts:5] [E: packages/orchestrator/src/ipc/protocol.ts:6] [E: packages/orchestrator/src/ipc/protocol.ts:7] [I]。

## Sources

- `packages/orchestrator/src/ipc/protocol.ts`
- `packages/orchestrator/README.md`

## 相关

- [subsys.orchestrator.message-protocol](../subsystems/orchestrator/message-protocol.md): orchestrator IPC/RPC message protocol 的 framing、parse/encode helper、类型关系和跨包边界。
