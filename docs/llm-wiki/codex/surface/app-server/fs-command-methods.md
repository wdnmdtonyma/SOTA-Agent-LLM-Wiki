---
id: rpc.fs-command-methods
title: fs/command/process/fuzzyFileSearch 方法
kind: rpc
tier: T1
source: [codex-rs/app-server-protocol/src/protocol/common.rs, codex-rs/app-server-protocol/src/protocol/v2/fs.rs, codex-rs/app-server-protocol/src/protocol/v2/command_exec.rs, codex-rs/app-server-protocol/src/protocol/v2/process.rs]
symbols: [FsReadFileParams, FsWriteFileParams, FsWatchParams, CommandExecParams, CommandExecResponse, ProcessSpawnParams, FuzzyFileSearchParams]
related: [rpc.overview, rpc.notifications-system, subsys.app-server.transport, subsys.exec-sandbox.exec-server]
evidence: explicit
status: verified
updated: 7750465934
---

> fs/command/process/fuzzyFileSearch 方法是 app-server 暴露给客户端的 host filesystem、standalone command/process execution 和 fuzzy file search 控制面。

## 能回答的问题

- fs、command、process、fuzzyFileSearch 当前各有哪些 wire method？
- 哪些请求按 process id、watch id、fuzzy session id 序列化？
- command/process 输出对应哪些 server notifications？
- fuzzy file search 的一次性和 session 模式分别是什么？

## 字段模型

fs params/notification 定义在 `v2/fs.rs`，包括 `FsReadFileParams`、`FsWriteFileParams`、`FsWatchParams` 和 `FsChangedNotification`；command exec 和 process exec 的 params/notification 分别在 `v2/command_exec.rs` 与 `v2/process.rs`。[E: codex-rs/app-server-protocol/src/protocol/v2/fs.rs:11][E: codex-rs/app-server-protocol/src/protocol/v2/fs.rs:29][E: codex-rs/app-server-protocol/src/protocol/v2/fs.rs:164][E: codex-rs/app-server-protocol/src/protocol/v2/fs.rs:199][E: codex-rs/app-server-protocol/src/protocol/v2/command_exec.rs:30][E: codex-rs/app-server-protocol/src/protocol/v2/command_exec.rs:115][E: codex-rs/app-server-protocol/src/protocol/v2/process.rs:28][E: codex-rs/app-server-protocol/src/protocol/v2/process.rs:165]

`ClientRequestSerializationScope` 明确有 command process、process handle、fuzzy file search session 和 fs watch scope，宏调用里相应方法使用这些 serialization 函数。[E: codex-rs/app-server-protocol/src/protocol/common.rs:125][E: codex-rs/app-server-protocol/src/protocol/common.rs:126][E: codex-rs/app-server-protocol/src/protocol/common.rs:127][E: codex-rs/app-server-protocol/src/protocol/common.rs:128][E: codex-rs/app-server-protocol/src/protocol/common.rs:166][E: codex-rs/app-server-protocol/src/protocol/common.rs:177][E: codex-rs/app-server-protocol/src/protocol/common.rs:182][E: codex-rs/app-server-protocol/src/protocol/common.rs:187]

本轮新增的 6 个 client request 属于 thread section 与 plugin search，不属于 fs/command/process/fuzzy-search 域，因此该 catalog 的 21 个方法集合未变；新增方法只造成后续宏行号漂移。[E: codex-rs/app-server-protocol/src/protocol/common.rs:561][E: codex-rs/app-server-protocol/src/protocol/common.rs:634][E: codex-rs/app-server-protocol/src/protocol/common.rs:732][E: codex-rs/app-server-protocol/src/protocol/common.rs:795]

## 方法 catalog

| Variant | Wire method | Params type | Response type | Gate | Evidence |
|---|---|---|---|---|---|
| `FsReadFile` | `fs/readFile` | `v2::FsReadFileParams` | `v2::FsReadFileResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:795][E: codex-rs/app-server-protocol/src/protocol/common.rs:796][E: codex-rs/app-server-protocol/src/protocol/common.rs:798] |
| `FsWriteFile` | `fs/writeFile` | `v2::FsWriteFileParams` | `v2::FsWriteFileResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:800][E: codex-rs/app-server-protocol/src/protocol/common.rs:801][E: codex-rs/app-server-protocol/src/protocol/common.rs:803] |
| `FsCreateDirectory` | `fs/createDirectory` | `v2::FsCreateDirectoryParams` | `v2::FsCreateDirectoryResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:805][E: codex-rs/app-server-protocol/src/protocol/common.rs:806][E: codex-rs/app-server-protocol/src/protocol/common.rs:808] |
| `FsGetMetadata` | `fs/getMetadata` | `v2::FsGetMetadataParams` | `v2::FsGetMetadataResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:810][E: codex-rs/app-server-protocol/src/protocol/common.rs:811][E: codex-rs/app-server-protocol/src/protocol/common.rs:813] |
| `FsReadDirectory` | `fs/readDirectory` | `v2::FsReadDirectoryParams` | `v2::FsReadDirectoryResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:815][E: codex-rs/app-server-protocol/src/protocol/common.rs:816][E: codex-rs/app-server-protocol/src/protocol/common.rs:818] |
| `FsRemove` | `fs/remove` | `v2::FsRemoveParams` | `v2::FsRemoveResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:820][E: codex-rs/app-server-protocol/src/protocol/common.rs:821][E: codex-rs/app-server-protocol/src/protocol/common.rs:823] |
| `FsCopy` | `fs/copy` | `v2::FsCopyParams` | `v2::FsCopyResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:825][E: codex-rs/app-server-protocol/src/protocol/common.rs:826][E: codex-rs/app-server-protocol/src/protocol/common.rs:828] |
| `FsWatch` | `fs/watch` | `v2::FsWatchParams` | `v2::FsWatchResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:830][E: codex-rs/app-server-protocol/src/protocol/common.rs:831][E: codex-rs/app-server-protocol/src/protocol/common.rs:833] |
| `FsUnwatch` | `fs/unwatch` | `v2::FsUnwatchParams` | `v2::FsUnwatchResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:835][E: codex-rs/app-server-protocol/src/protocol/common.rs:836][E: codex-rs/app-server-protocol/src/protocol/common.rs:838] |
| `OneOffCommandExec` | `command/exec` | `v2::CommandExecParams` | `v2::CommandExecResponse` | params-inspected | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1114][E: codex-rs/app-server-protocol/src/protocol/common.rs:1115][E: codex-rs/app-server-protocol/src/protocol/common.rs:1116][E: codex-rs/app-server-protocol/src/protocol/common.rs:1118] |
| `CommandExecWrite` | `command/exec/write` | `v2::CommandExecWriteParams` | `v2::CommandExecWriteResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1121][E: codex-rs/app-server-protocol/src/protocol/common.rs:1122][E: codex-rs/app-server-protocol/src/protocol/common.rs:1124] |
| `CommandExecTerminate` | `command/exec/terminate` | `v2::CommandExecTerminateParams` | `v2::CommandExecTerminateResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1127][E: codex-rs/app-server-protocol/src/protocol/common.rs:1128][E: codex-rs/app-server-protocol/src/protocol/common.rs:1130] |
| `CommandExecResize` | `command/exec/resize` | `v2::CommandExecResizeParams` | `v2::CommandExecResizeResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1133][E: codex-rs/app-server-protocol/src/protocol/common.rs:1134][E: codex-rs/app-server-protocol/src/protocol/common.rs:1136] |
| `ProcessSpawn` | `process/spawn` | `v2::ProcessSpawnParams` | `v2::ProcessSpawnResponse` | experimental: process/spawn | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1138][E: codex-rs/app-server-protocol/src/protocol/common.rs:1140][E: codex-rs/app-server-protocol/src/protocol/common.rs:1141][E: codex-rs/app-server-protocol/src/protocol/common.rs:1143] |
| `ProcessWriteStdin` | `process/writeStdin` | `v2::ProcessWriteStdinParams` | `v2::ProcessWriteStdinResponse` | experimental: process/writeStdin | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1145][E: codex-rs/app-server-protocol/src/protocol/common.rs:1147][E: codex-rs/app-server-protocol/src/protocol/common.rs:1148][E: codex-rs/app-server-protocol/src/protocol/common.rs:1150] |
| `ProcessKill` | `process/kill` | `v2::ProcessKillParams` | `v2::ProcessKillResponse` | experimental: process/kill | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1152][E: codex-rs/app-server-protocol/src/protocol/common.rs:1154][E: codex-rs/app-server-protocol/src/protocol/common.rs:1155][E: codex-rs/app-server-protocol/src/protocol/common.rs:1157] |
| `ProcessResizePty` | `process/resizePty` | `v2::ProcessResizePtyParams` | `v2::ProcessResizePtyResponse` | experimental: process/resizePty | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1159][E: codex-rs/app-server-protocol/src/protocol/common.rs:1161][E: codex-rs/app-server-protocol/src/protocol/common.rs:1162][E: codex-rs/app-server-protocol/src/protocol/common.rs:1164] |
| `FuzzyFileSearch` | `fuzzyFileSearch` | `FuzzyFileSearchParams` | `FuzzyFileSearchResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1236][E: codex-rs/app-server-protocol/src/protocol/common.rs:1237][E: codex-rs/app-server-protocol/src/protocol/common.rs:1239] |
| `FuzzyFileSearchSessionStart` | `fuzzyFileSearch/sessionStart` | `FuzzyFileSearchSessionStartParams` | `FuzzyFileSearchSessionStartResponse` | experimental: fuzzyFileSearch/sessionStart | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1241][E: codex-rs/app-server-protocol/src/protocol/common.rs:1242][E: codex-rs/app-server-protocol/src/protocol/common.rs:1243][E: codex-rs/app-server-protocol/src/protocol/common.rs:1245] |
| `FuzzyFileSearchSessionUpdate` | `fuzzyFileSearch/sessionUpdate` | `FuzzyFileSearchSessionUpdateParams` | `FuzzyFileSearchSessionUpdateResponse` | experimental: fuzzyFileSearch/sessionUpdate | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1247][E: codex-rs/app-server-protocol/src/protocol/common.rs:1248][E: codex-rs/app-server-protocol/src/protocol/common.rs:1249][E: codex-rs/app-server-protocol/src/protocol/common.rs:1251] |
| `FuzzyFileSearchSessionStop` | `fuzzyFileSearch/sessionStop` | `FuzzyFileSearchSessionStopParams` | `FuzzyFileSearchSessionStopResponse` | experimental: fuzzyFileSearch/sessionStop | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1253][E: codex-rs/app-server-protocol/src/protocol/common.rs:1254][E: codex-rs/app-server-protocol/src/protocol/common.rs:1255][E: codex-rs/app-server-protocol/src/protocol/common.rs:1257] |

## Sources

- `codex-rs/app-server-protocol/src/protocol/common.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/fs.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/command_exec.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/process.rs`

## 相关

- `rpc.overview` -> [App-Server 协议总览](overview.md)
- `rpc.notifications-system` -> [server notifications: system](notifications-system.md)
