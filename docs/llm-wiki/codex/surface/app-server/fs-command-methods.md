---
id: rpc.fs-command-methods
title: fs/command/process/fuzzyFileSearch 方法
kind: rpc
tier: T1
source: [codex-rs/app-server-protocol/src/protocol/common.rs, codex-rs/app-server-protocol/src/protocol/v2/fs.rs, codex-rs/app-server-protocol/src/protocol/v2/command_exec.rs, codex-rs/app-server-protocol/src/protocol/v2/process.rs]
symbols: [FsReadFileParams, FsWriteFileParams, FsWatchParams, FsChangedNotification, CommandExecParams, CommandExecResponse, ProcessSpawnParams, FuzzyFileSearchParams]
related: [rpc.overview, rpc.notifications-system, subsys.app-server.transport, subsys.exec-sandbox.exec-server]
evidence: explicit
status: verified
updated: db887d03e1
---

> fs/command/process/fuzzyFileSearch 方法是 app-server 暴露给客户端的 host filesystem、standalone command/process execution 和 fuzzy file search 控制面。

## 能回答的问题

- fs、command、process、fuzzyFileSearch 当前各有哪些 wire method？
- 哪些请求按 process id、watch id、fuzzy session id 序列化？
- command/process 输出对应哪些 server notifications？
- fuzzy file search 的一次性和 session 模式分别是什么？

## 字段模型

fs params/notification 定义在 `v2/fs.rs`，包括 `FsReadFileParams`、`FsWriteFileParams`、`FsWatchParams` 和 `FsChangedNotification`；command exec 和 process exec 的 params/notification 分别在 `v2/command_exec.rs` 与 `v2/process.rs`。[E: codex-rs/app-server-protocol/src/protocol/v2/fs.rs:11][E: codex-rs/app-server-protocol/src/protocol/v2/fs.rs:29][E: codex-rs/app-server-protocol/src/protocol/v2/fs.rs:164][E: codex-rs/app-server-protocol/src/protocol/v2/fs.rs:199][E: codex-rs/app-server-protocol/src/protocol/v2/command_exec.rs:30][E: codex-rs/app-server-protocol/src/protocol/v2/command_exec.rs:115][E: codex-rs/app-server-protocol/src/protocol/v2/process.rs:28][E: codex-rs/app-server-protocol/src/protocol/v2/process.rs:165]

`ClientRequestSerializationScope` 明确有 command process、process handle、fuzzy file search session 和 fs watch scope，宏调用里相应方法使用这些 serialization 函数。[E: codex-rs/app-server-protocol/src/protocol/common.rs:114][E: codex-rs/app-server-protocol/src/protocol/common.rs:115][E: codex-rs/app-server-protocol/src/protocol/common.rs:116][E: codex-rs/app-server-protocol/src/protocol/common.rs:117][E: codex-rs/app-server-protocol/src/protocol/common.rs:155][E: codex-rs/app-server-protocol/src/protocol/common.rs:166][E: codex-rs/app-server-protocol/src/protocol/common.rs:171][E: codex-rs/app-server-protocol/src/protocol/common.rs:176]

## 方法 catalog

| Variant | Wire method | Params type | Response type | Gate | Evidence |
|---|---|---|---|---|---|
| `FsReadFile` | `fs/readFile` | `v2::FsReadFileParams` | `v2::FsReadFileResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:739][E: codex-rs/app-server-protocol/src/protocol/common.rs:740][E: codex-rs/app-server-protocol/src/protocol/common.rs:742] |
| `FsWriteFile` | `fs/writeFile` | `v2::FsWriteFileParams` | `v2::FsWriteFileResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:744][E: codex-rs/app-server-protocol/src/protocol/common.rs:745][E: codex-rs/app-server-protocol/src/protocol/common.rs:747] |
| `FsCreateDirectory` | `fs/createDirectory` | `v2::FsCreateDirectoryParams` | `v2::FsCreateDirectoryResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:749][E: codex-rs/app-server-protocol/src/protocol/common.rs:750][E: codex-rs/app-server-protocol/src/protocol/common.rs:752] |
| `FsGetMetadata` | `fs/getMetadata` | `v2::FsGetMetadataParams` | `v2::FsGetMetadataResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:754][E: codex-rs/app-server-protocol/src/protocol/common.rs:755][E: codex-rs/app-server-protocol/src/protocol/common.rs:757] |
| `FsReadDirectory` | `fs/readDirectory` | `v2::FsReadDirectoryParams` | `v2::FsReadDirectoryResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:759][E: codex-rs/app-server-protocol/src/protocol/common.rs:760][E: codex-rs/app-server-protocol/src/protocol/common.rs:762] |
| `FsRemove` | `fs/remove` | `v2::FsRemoveParams` | `v2::FsRemoveResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:764][E: codex-rs/app-server-protocol/src/protocol/common.rs:765][E: codex-rs/app-server-protocol/src/protocol/common.rs:767] |
| `FsCopy` | `fs/copy` | `v2::FsCopyParams` | `v2::FsCopyResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:769][E: codex-rs/app-server-protocol/src/protocol/common.rs:770][E: codex-rs/app-server-protocol/src/protocol/common.rs:772] |
| `FsWatch` | `fs/watch` | `v2::FsWatchParams` | `v2::FsWatchResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:774][E: codex-rs/app-server-protocol/src/protocol/common.rs:775][E: codex-rs/app-server-protocol/src/protocol/common.rs:777] |
| `FsUnwatch` | `fs/unwatch` | `v2::FsUnwatchParams` | `v2::FsUnwatchResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:779][E: codex-rs/app-server-protocol/src/protocol/common.rs:780][E: codex-rs/app-server-protocol/src/protocol/common.rs:782] |
| `OneOffCommandExec` | `command/exec` | `v2::CommandExecParams` | `v2::CommandExecResponse` | params-inspected | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1051][E: codex-rs/app-server-protocol/src/protocol/common.rs:1052][E: codex-rs/app-server-protocol/src/protocol/common.rs:1053][E: codex-rs/app-server-protocol/src/protocol/common.rs:1055] |
| `CommandExecWrite` | `command/exec/write` | `v2::CommandExecWriteParams` | `v2::CommandExecWriteResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1058][E: codex-rs/app-server-protocol/src/protocol/common.rs:1059][E: codex-rs/app-server-protocol/src/protocol/common.rs:1061] |
| `CommandExecTerminate` | `command/exec/terminate` | `v2::CommandExecTerminateParams` | `v2::CommandExecTerminateResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1064][E: codex-rs/app-server-protocol/src/protocol/common.rs:1065][E: codex-rs/app-server-protocol/src/protocol/common.rs:1067] |
| `CommandExecResize` | `command/exec/resize` | `v2::CommandExecResizeParams` | `v2::CommandExecResizeResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1070][E: codex-rs/app-server-protocol/src/protocol/common.rs:1071][E: codex-rs/app-server-protocol/src/protocol/common.rs:1073] |
| `ProcessSpawn` | `process/spawn` | `v2::ProcessSpawnParams` | `v2::ProcessSpawnResponse` | experimental: process/spawn | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1075][E: codex-rs/app-server-protocol/src/protocol/common.rs:1077][E: codex-rs/app-server-protocol/src/protocol/common.rs:1078][E: codex-rs/app-server-protocol/src/protocol/common.rs:1080] |
| `ProcessWriteStdin` | `process/writeStdin` | `v2::ProcessWriteStdinParams` | `v2::ProcessWriteStdinResponse` | experimental: process/writeStdin | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1082][E: codex-rs/app-server-protocol/src/protocol/common.rs:1084][E: codex-rs/app-server-protocol/src/protocol/common.rs:1085][E: codex-rs/app-server-protocol/src/protocol/common.rs:1087] |
| `ProcessKill` | `process/kill` | `v2::ProcessKillParams` | `v2::ProcessKillResponse` | experimental: process/kill | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1089][E: codex-rs/app-server-protocol/src/protocol/common.rs:1091][E: codex-rs/app-server-protocol/src/protocol/common.rs:1092][E: codex-rs/app-server-protocol/src/protocol/common.rs:1094] |
| `ProcessResizePty` | `process/resizePty` | `v2::ProcessResizePtyParams` | `v2::ProcessResizePtyResponse` | experimental: process/resizePty | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1096][E: codex-rs/app-server-protocol/src/protocol/common.rs:1098][E: codex-rs/app-server-protocol/src/protocol/common.rs:1099][E: codex-rs/app-server-protocol/src/protocol/common.rs:1101] |
| `FuzzyFileSearch` | `fuzzyFileSearch` | `FuzzyFileSearchParams` | `FuzzyFileSearchResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1168][E: codex-rs/app-server-protocol/src/protocol/common.rs:1169][E: codex-rs/app-server-protocol/src/protocol/common.rs:1171] |
| `FuzzyFileSearchSessionStart` | `fuzzyFileSearch/sessionStart` | `FuzzyFileSearchSessionStartParams` | `FuzzyFileSearchSessionStartResponse` | experimental: fuzzyFileSearch/sessionStart | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1173][E: codex-rs/app-server-protocol/src/protocol/common.rs:1174][E: codex-rs/app-server-protocol/src/protocol/common.rs:1175][E: codex-rs/app-server-protocol/src/protocol/common.rs:1177] |
| `FuzzyFileSearchSessionUpdate` | `fuzzyFileSearch/sessionUpdate` | `FuzzyFileSearchSessionUpdateParams` | `FuzzyFileSearchSessionUpdateResponse` | experimental: fuzzyFileSearch/sessionUpdate | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1179][E: codex-rs/app-server-protocol/src/protocol/common.rs:1180][E: codex-rs/app-server-protocol/src/protocol/common.rs:1181][E: codex-rs/app-server-protocol/src/protocol/common.rs:1183] |
| `FuzzyFileSearchSessionStop` | `fuzzyFileSearch/sessionStop` | `FuzzyFileSearchSessionStopParams` | `FuzzyFileSearchSessionStopResponse` | experimental: fuzzyFileSearch/sessionStop | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1185][E: codex-rs/app-server-protocol/src/protocol/common.rs:1186][E: codex-rs/app-server-protocol/src/protocol/common.rs:1187][E: codex-rs/app-server-protocol/src/protocol/common.rs:1189] |

## Sources

- `codex-rs/app-server-protocol/src/protocol/common.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/fs.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/command_exec.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/process.rs`

## 相关

- `rpc.overview` -> [App-Server 协议总览](overview.md)
- `rpc.notifications-system` -> [server notifications: system](notifications-system.md)
