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
updated: 5670360009
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
| `OneOffCommandExec` | `command/exec` | `v2::CommandExecParams` | `v2::CommandExecResponse` | params-inspected | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1038][E: codex-rs/app-server-protocol/src/protocol/common.rs:1039][E: codex-rs/app-server-protocol/src/protocol/common.rs:1040][E: codex-rs/app-server-protocol/src/protocol/common.rs:1042] |
| `CommandExecWrite` | `command/exec/write` | `v2::CommandExecWriteParams` | `v2::CommandExecWriteResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1045][E: codex-rs/app-server-protocol/src/protocol/common.rs:1046][E: codex-rs/app-server-protocol/src/protocol/common.rs:1048] |
| `CommandExecTerminate` | `command/exec/terminate` | `v2::CommandExecTerminateParams` | `v2::CommandExecTerminateResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1051][E: codex-rs/app-server-protocol/src/protocol/common.rs:1052][E: codex-rs/app-server-protocol/src/protocol/common.rs:1054] |
| `CommandExecResize` | `command/exec/resize` | `v2::CommandExecResizeParams` | `v2::CommandExecResizeResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1057][E: codex-rs/app-server-protocol/src/protocol/common.rs:1058][E: codex-rs/app-server-protocol/src/protocol/common.rs:1060] |
| `ProcessSpawn` | `process/spawn` | `v2::ProcessSpawnParams` | `v2::ProcessSpawnResponse` | experimental: process/spawn | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1062][E: codex-rs/app-server-protocol/src/protocol/common.rs:1064][E: codex-rs/app-server-protocol/src/protocol/common.rs:1065][E: codex-rs/app-server-protocol/src/protocol/common.rs:1067] |
| `ProcessWriteStdin` | `process/writeStdin` | `v2::ProcessWriteStdinParams` | `v2::ProcessWriteStdinResponse` | experimental: process/writeStdin | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1069][E: codex-rs/app-server-protocol/src/protocol/common.rs:1071][E: codex-rs/app-server-protocol/src/protocol/common.rs:1072][E: codex-rs/app-server-protocol/src/protocol/common.rs:1074] |
| `ProcessKill` | `process/kill` | `v2::ProcessKillParams` | `v2::ProcessKillResponse` | experimental: process/kill | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1076][E: codex-rs/app-server-protocol/src/protocol/common.rs:1078][E: codex-rs/app-server-protocol/src/protocol/common.rs:1079][E: codex-rs/app-server-protocol/src/protocol/common.rs:1081] |
| `ProcessResizePty` | `process/resizePty` | `v2::ProcessResizePtyParams` | `v2::ProcessResizePtyResponse` | experimental: process/resizePty | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1083][E: codex-rs/app-server-protocol/src/protocol/common.rs:1085][E: codex-rs/app-server-protocol/src/protocol/common.rs:1086][E: codex-rs/app-server-protocol/src/protocol/common.rs:1088] |
| `FuzzyFileSearch` | `fuzzyFileSearch` | `FuzzyFileSearchParams` | `FuzzyFileSearchResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:209][E: codex-rs/app-server-protocol/src/protocol/common.rs:1155][E: codex-rs/app-server-protocol/src/protocol/common.rs:1156][E: codex-rs/app-server-protocol/src/protocol/common.rs:1158] |
| `FuzzyFileSearchSessionStart` | `fuzzyFileSearch/sessionStart` | `FuzzyFileSearchSessionStartParams` | `FuzzyFileSearchSessionStartResponse` | experimental: fuzzyFileSearch/sessionStart | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1160][E: codex-rs/app-server-protocol/src/protocol/common.rs:1161][E: codex-rs/app-server-protocol/src/protocol/common.rs:1162][E: codex-rs/app-server-protocol/src/protocol/common.rs:1164] |
| `FuzzyFileSearchSessionUpdate` | `fuzzyFileSearch/sessionUpdate` | `FuzzyFileSearchSessionUpdateParams` | `FuzzyFileSearchSessionUpdateResponse` | experimental: fuzzyFileSearch/sessionUpdate | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1166][E: codex-rs/app-server-protocol/src/protocol/common.rs:1167][E: codex-rs/app-server-protocol/src/protocol/common.rs:1168][E: codex-rs/app-server-protocol/src/protocol/common.rs:1170] |
| `FuzzyFileSearchSessionStop` | `fuzzyFileSearch/sessionStop` | `FuzzyFileSearchSessionStopParams` | `FuzzyFileSearchSessionStopResponse` | experimental: fuzzyFileSearch/sessionStop | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1172][E: codex-rs/app-server-protocol/src/protocol/common.rs:1173][E: codex-rs/app-server-protocol/src/protocol/common.rs:1174][E: codex-rs/app-server-protocol/src/protocol/common.rs:1176] |

## Sources

- `codex-rs/app-server-protocol/src/protocol/common.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/fs.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/command_exec.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/process.rs`

## 相关

- `rpc.overview` -> [App-Server 协议总览](overview.md)
- `rpc.notifications-system` -> [server notifications: system](notifications-system.md)
