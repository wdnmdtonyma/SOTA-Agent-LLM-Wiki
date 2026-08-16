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
updated: 9ded177ce7
---

> fs/command/process/fuzzyFileSearch 方法是 app-server 暴露给客户端的 host filesystem、standalone command/process execution 和 fuzzy file search 控制面。

## 能回答的问题

- fs、command、process、fuzzyFileSearch 当前各有哪些 wire method？
- 哪些请求按 process id、watch id、fuzzy session id 序列化？
- command/process 输出对应哪些 server notifications？
- fuzzy file search 的一次性和 session 模式分别是什么？

## 字段模型

fs params/notification 定义在 `v2/fs.rs`，包括 `FsReadFileParams`、`FsWriteFileParams`、`FsWatchParams` 和 `FsChangedNotification`；command exec 和 process exec 的 params/notification 分别在 `v2/command_exec.rs` 与 `v2/process.rs`。[E: codex-rs/app-server-protocol/src/protocol/v2/fs.rs:11][E: codex-rs/app-server-protocol/src/protocol/v2/fs.rs:29][E: codex-rs/app-server-protocol/src/protocol/v2/fs.rs:164][E: codex-rs/app-server-protocol/src/protocol/v2/fs.rs:199][E: codex-rs/app-server-protocol/src/protocol/v2/command_exec.rs:30][E: codex-rs/app-server-protocol/src/protocol/v2/command_exec.rs:115][E: codex-rs/app-server-protocol/src/protocol/v2/process.rs:28][E: codex-rs/app-server-protocol/src/protocol/v2/process.rs:165]

`ClientRequestSerializationScope` 明确有 command process、process handle、fuzzy file search session 和 fs watch scope，宏调用里相应方法使用这些 serialization 函数。[E: codex-rs/app-server-protocol/src/protocol/common.rs:125][E: codex-rs/app-server-protocol/src/protocol/common.rs:126][E: codex-rs/app-server-protocol/src/protocol/common.rs:127][E: codex-rs/app-server-protocol/src/protocol/common.rs:128][E: codex-rs/app-server-protocol/src/protocol/common.rs:895][E: codex-rs/app-server-protocol/src/protocol/common.rs:1180][E: codex-rs/app-server-protocol/src/protocol/common.rs:1186][E: codex-rs/app-server-protocol/src/protocol/common.rs:1205][E: codex-rs/app-server-protocol/src/protocol/common.rs:1307]

本 catalog 仍是 21 个方法：9 个 fs、4 个 command/exec、4 个 process、4 个 fuzzyFileSearch。本轮没有新增 fs/command/process/fuzzy-search wire。[E: codex-rs/app-server-protocol/src/protocol/common.rs:858][E: codex-rs/app-server-protocol/src/protocol/common.rs:1177][E: codex-rs/app-server-protocol/src/protocol/common.rs:1203][E: codex-rs/app-server-protocol/src/protocol/common.rs:1299]

## 方法 catalog

| Variant | Wire method | Params type | Response type | Gate | Evidence |
|---|---|---|---|---|---|
| `FsReadFile` | `fs/readFile` | `v2::FsReadFileParams` | `v2::FsReadFileResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:858][E: codex-rs/app-server-protocol/src/protocol/common.rs:859][E: codex-rs/app-server-protocol/src/protocol/common.rs:861] |
| `FsWriteFile` | `fs/writeFile` | `v2::FsWriteFileParams` | `v2::FsWriteFileResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:863][E: codex-rs/app-server-protocol/src/protocol/common.rs:864][E: codex-rs/app-server-protocol/src/protocol/common.rs:866] |
| `FsCreateDirectory` | `fs/createDirectory` | `v2::FsCreateDirectoryParams` | `v2::FsCreateDirectoryResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:868][E: codex-rs/app-server-protocol/src/protocol/common.rs:869][E: codex-rs/app-server-protocol/src/protocol/common.rs:871] |
| `FsGetMetadata` | `fs/getMetadata` | `v2::FsGetMetadataParams` | `v2::FsGetMetadataResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:873][E: codex-rs/app-server-protocol/src/protocol/common.rs:874][E: codex-rs/app-server-protocol/src/protocol/common.rs:876] |
| `FsReadDirectory` | `fs/readDirectory` | `v2::FsReadDirectoryParams` | `v2::FsReadDirectoryResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:878][E: codex-rs/app-server-protocol/src/protocol/common.rs:879][E: codex-rs/app-server-protocol/src/protocol/common.rs:881] |
| `FsRemove` | `fs/remove` | `v2::FsRemoveParams` | `v2::FsRemoveResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:883][E: codex-rs/app-server-protocol/src/protocol/common.rs:884][E: codex-rs/app-server-protocol/src/protocol/common.rs:886] |
| `FsCopy` | `fs/copy` | `v2::FsCopyParams` | `v2::FsCopyResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:888][E: codex-rs/app-server-protocol/src/protocol/common.rs:889][E: codex-rs/app-server-protocol/src/protocol/common.rs:891] |
| `FsWatch` | `fs/watch` | `v2::FsWatchParams` | `v2::FsWatchResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:893][E: codex-rs/app-server-protocol/src/protocol/common.rs:894][E: codex-rs/app-server-protocol/src/protocol/common.rs:896] |
| `FsUnwatch` | `fs/unwatch` | `v2::FsUnwatchParams` | `v2::FsUnwatchResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:898][E: codex-rs/app-server-protocol/src/protocol/common.rs:899][E: codex-rs/app-server-protocol/src/protocol/common.rs:901] |
| `OneOffCommandExec` | `command/exec` | `v2::CommandExecParams` | `v2::CommandExecResponse` | params-inspected | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1177][E: codex-rs/app-server-protocol/src/protocol/common.rs:1178][E: codex-rs/app-server-protocol/src/protocol/common.rs:1179][E: codex-rs/app-server-protocol/src/protocol/common.rs:1181] |
| `CommandExecWrite` | `command/exec/write` | `v2::CommandExecWriteParams` | `v2::CommandExecWriteResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1184][E: codex-rs/app-server-protocol/src/protocol/common.rs:1185][E: codex-rs/app-server-protocol/src/protocol/common.rs:1187] |
| `CommandExecTerminate` | `command/exec/terminate` | `v2::CommandExecTerminateParams` | `v2::CommandExecTerminateResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1190][E: codex-rs/app-server-protocol/src/protocol/common.rs:1191][E: codex-rs/app-server-protocol/src/protocol/common.rs:1193] |
| `CommandExecResize` | `command/exec/resize` | `v2::CommandExecResizeParams` | `v2::CommandExecResizeResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1196][E: codex-rs/app-server-protocol/src/protocol/common.rs:1197][E: codex-rs/app-server-protocol/src/protocol/common.rs:1199] |
| `ProcessSpawn` | `process/spawn` | `v2::ProcessSpawnParams` | `v2::ProcessSpawnResponse` | experimental: process/spawn | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1201][E: codex-rs/app-server-protocol/src/protocol/common.rs:1203][E: codex-rs/app-server-protocol/src/protocol/common.rs:1204][E: codex-rs/app-server-protocol/src/protocol/common.rs:1206] |
| `ProcessWriteStdin` | `process/writeStdin` | `v2::ProcessWriteStdinParams` | `v2::ProcessWriteStdinResponse` | experimental: process/writeStdin | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1208][E: codex-rs/app-server-protocol/src/protocol/common.rs:1210][E: codex-rs/app-server-protocol/src/protocol/common.rs:1211][E: codex-rs/app-server-protocol/src/protocol/common.rs:1213] |
| `ProcessKill` | `process/kill` | `v2::ProcessKillParams` | `v2::ProcessKillResponse` | experimental: process/kill | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1215][E: codex-rs/app-server-protocol/src/protocol/common.rs:1217][E: codex-rs/app-server-protocol/src/protocol/common.rs:1218][E: codex-rs/app-server-protocol/src/protocol/common.rs:1220] |
| `ProcessResizePty` | `process/resizePty` | `v2::ProcessResizePtyParams` | `v2::ProcessResizePtyResponse` | experimental: process/resizePty | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1222][E: codex-rs/app-server-protocol/src/protocol/common.rs:1224][E: codex-rs/app-server-protocol/src/protocol/common.rs:1225][E: codex-rs/app-server-protocol/src/protocol/common.rs:1227] |
| `FuzzyFileSearch` | `fuzzyFileSearch` | `FuzzyFileSearchParams` | `FuzzyFileSearchResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1299][E: codex-rs/app-server-protocol/src/protocol/common.rs:1300][E: codex-rs/app-server-protocol/src/protocol/common.rs:1302] |
| `FuzzyFileSearchSessionStart` | `fuzzyFileSearch/sessionStart` | `FuzzyFileSearchSessionStartParams` | `FuzzyFileSearchSessionStartResponse` | experimental: fuzzyFileSearch/sessionStart | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1304][E: codex-rs/app-server-protocol/src/protocol/common.rs:1305][E: codex-rs/app-server-protocol/src/protocol/common.rs:1306][E: codex-rs/app-server-protocol/src/protocol/common.rs:1308] |
| `FuzzyFileSearchSessionUpdate` | `fuzzyFileSearch/sessionUpdate` | `FuzzyFileSearchSessionUpdateParams` | `FuzzyFileSearchSessionUpdateResponse` | experimental: fuzzyFileSearch/sessionUpdate | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1310][E: codex-rs/app-server-protocol/src/protocol/common.rs:1311][E: codex-rs/app-server-protocol/src/protocol/common.rs:1312][E: codex-rs/app-server-protocol/src/protocol/common.rs:1314] |
| `FuzzyFileSearchSessionStop` | `fuzzyFileSearch/sessionStop` | `FuzzyFileSearchSessionStopParams` | `FuzzyFileSearchSessionStopResponse` | experimental: fuzzyFileSearch/sessionStop | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1316][E: codex-rs/app-server-protocol/src/protocol/common.rs:1317][E: codex-rs/app-server-protocol/src/protocol/common.rs:1318][E: codex-rs/app-server-protocol/src/protocol/common.rs:1320] |

## Sources

- `codex-rs/app-server-protocol/src/protocol/common.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/fs.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/command_exec.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/process.rs`

## 相关

- `rpc.overview` -> [App-Server 协议总览](overview.md)
- `rpc.notifications-system` -> [server notifications: system](notifications-system.md)
