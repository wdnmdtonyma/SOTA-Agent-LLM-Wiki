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
updated: 4d7a5c7c73
---

> fs/command/process/fuzzyFileSearch 方法是 app-server 暴露给客户端的 host filesystem、standalone command/process execution 和 fuzzy file search 控制面。

## 能回答的问题

- fs、command、process、fuzzyFileSearch 当前各有哪些 wire method？
- 哪些请求按 process id、watch id、fuzzy session id 序列化？
- command/process 输出对应哪些 server notifications？
- fuzzy file search 的一次性和 session 模式分别是什么？

## 字段模型

fs params/notification 定义在 `v2/fs.rs`，包括 `FsReadFileParams`、`FsWriteFileParams`、`FsWatchParams` 和 `FsChangedNotification`；command exec 和 process exec 的 params/notification 分别在 `v2/command_exec.rs` 与 `v2/process.rs`。[E: codex-rs/app-server-protocol/src/protocol/v2/fs.rs:11][E: codex-rs/app-server-protocol/src/protocol/v2/fs.rs:29][E: codex-rs/app-server-protocol/src/protocol/v2/fs.rs:164][E: codex-rs/app-server-protocol/src/protocol/v2/fs.rs:199][E: codex-rs/app-server-protocol/src/protocol/v2/command_exec.rs:30][E: codex-rs/app-server-protocol/src/protocol/v2/command_exec.rs:115][E: codex-rs/app-server-protocol/src/protocol/v2/process.rs:28][E: codex-rs/app-server-protocol/src/protocol/v2/process.rs:165]

`ClientRequestSerializationScope` 明确有 command process、process handle、fuzzy file search session 和 fs watch scope，宏调用里相应方法使用这些 serialization 函数。[E: codex-rs/app-server-protocol/src/protocol/common.rs:120][E: codex-rs/app-server-protocol/src/protocol/common.rs:121][E: codex-rs/app-server-protocol/src/protocol/common.rs:122][E: codex-rs/app-server-protocol/src/protocol/common.rs:123][E: codex-rs/app-server-protocol/src/protocol/common.rs:161][E: codex-rs/app-server-protocol/src/protocol/common.rs:172][E: codex-rs/app-server-protocol/src/protocol/common.rs:177][E: codex-rs/app-server-protocol/src/protocol/common.rs:182]

本轮新增的 4 个 client request 不属于 fs/command/process/fuzzy-search 域，因此该 catalog 的 21 个方法集合未变；`AppsRead`/`AppsInstalled` 插入在 fs methods 之前只造成后续宏行号漂移。[E: codex-rs/app-server-protocol/src/protocol/common.rs:745][E: codex-rs/app-server-protocol/src/protocol/common.rs:755][E: codex-rs/app-server-protocol/src/protocol/common.rs:760][E: codex-rs/app-server-protocol/src/protocol/common.rs:762]

## 方法 catalog

| Variant | Wire method | Params type | Response type | Gate | Evidence |
|---|---|---|---|---|---|
| `FsReadFile` | `fs/readFile` | `v2::FsReadFileParams` | `v2::FsReadFileResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:762][E: codex-rs/app-server-protocol/src/protocol/common.rs:763][E: codex-rs/app-server-protocol/src/protocol/common.rs:765] |
| `FsWriteFile` | `fs/writeFile` | `v2::FsWriteFileParams` | `v2::FsWriteFileResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:767][E: codex-rs/app-server-protocol/src/protocol/common.rs:768][E: codex-rs/app-server-protocol/src/protocol/common.rs:770] |
| `FsCreateDirectory` | `fs/createDirectory` | `v2::FsCreateDirectoryParams` | `v2::FsCreateDirectoryResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:772][E: codex-rs/app-server-protocol/src/protocol/common.rs:773][E: codex-rs/app-server-protocol/src/protocol/common.rs:775] |
| `FsGetMetadata` | `fs/getMetadata` | `v2::FsGetMetadataParams` | `v2::FsGetMetadataResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:777][E: codex-rs/app-server-protocol/src/protocol/common.rs:778][E: codex-rs/app-server-protocol/src/protocol/common.rs:780] |
| `FsReadDirectory` | `fs/readDirectory` | `v2::FsReadDirectoryParams` | `v2::FsReadDirectoryResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:782][E: codex-rs/app-server-protocol/src/protocol/common.rs:783][E: codex-rs/app-server-protocol/src/protocol/common.rs:785] |
| `FsRemove` | `fs/remove` | `v2::FsRemoveParams` | `v2::FsRemoveResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:787][E: codex-rs/app-server-protocol/src/protocol/common.rs:788][E: codex-rs/app-server-protocol/src/protocol/common.rs:790] |
| `FsCopy` | `fs/copy` | `v2::FsCopyParams` | `v2::FsCopyResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:792][E: codex-rs/app-server-protocol/src/protocol/common.rs:793][E: codex-rs/app-server-protocol/src/protocol/common.rs:795] |
| `FsWatch` | `fs/watch` | `v2::FsWatchParams` | `v2::FsWatchResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:797][E: codex-rs/app-server-protocol/src/protocol/common.rs:798][E: codex-rs/app-server-protocol/src/protocol/common.rs:800] |
| `FsUnwatch` | `fs/unwatch` | `v2::FsUnwatchParams` | `v2::FsUnwatchResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:802][E: codex-rs/app-server-protocol/src/protocol/common.rs:803][E: codex-rs/app-server-protocol/src/protocol/common.rs:805] |
| `OneOffCommandExec` | `command/exec` | `v2::CommandExecParams` | `v2::CommandExecResponse` | params-inspected | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1081][E: codex-rs/app-server-protocol/src/protocol/common.rs:1082][E: codex-rs/app-server-protocol/src/protocol/common.rs:1083][E: codex-rs/app-server-protocol/src/protocol/common.rs:1085] |
| `CommandExecWrite` | `command/exec/write` | `v2::CommandExecWriteParams` | `v2::CommandExecWriteResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1088][E: codex-rs/app-server-protocol/src/protocol/common.rs:1089][E: codex-rs/app-server-protocol/src/protocol/common.rs:1091] |
| `CommandExecTerminate` | `command/exec/terminate` | `v2::CommandExecTerminateParams` | `v2::CommandExecTerminateResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1094][E: codex-rs/app-server-protocol/src/protocol/common.rs:1095][E: codex-rs/app-server-protocol/src/protocol/common.rs:1097] |
| `CommandExecResize` | `command/exec/resize` | `v2::CommandExecResizeParams` | `v2::CommandExecResizeResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1100][E: codex-rs/app-server-protocol/src/protocol/common.rs:1101][E: codex-rs/app-server-protocol/src/protocol/common.rs:1103] |
| `ProcessSpawn` | `process/spawn` | `v2::ProcessSpawnParams` | `v2::ProcessSpawnResponse` | experimental: process/spawn | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1105][E: codex-rs/app-server-protocol/src/protocol/common.rs:1107][E: codex-rs/app-server-protocol/src/protocol/common.rs:1108][E: codex-rs/app-server-protocol/src/protocol/common.rs:1110] |
| `ProcessWriteStdin` | `process/writeStdin` | `v2::ProcessWriteStdinParams` | `v2::ProcessWriteStdinResponse` | experimental: process/writeStdin | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1112][E: codex-rs/app-server-protocol/src/protocol/common.rs:1114][E: codex-rs/app-server-protocol/src/protocol/common.rs:1115][E: codex-rs/app-server-protocol/src/protocol/common.rs:1117] |
| `ProcessKill` | `process/kill` | `v2::ProcessKillParams` | `v2::ProcessKillResponse` | experimental: process/kill | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1119][E: codex-rs/app-server-protocol/src/protocol/common.rs:1121][E: codex-rs/app-server-protocol/src/protocol/common.rs:1122][E: codex-rs/app-server-protocol/src/protocol/common.rs:1124] |
| `ProcessResizePty` | `process/resizePty` | `v2::ProcessResizePtyParams` | `v2::ProcessResizePtyResponse` | experimental: process/resizePty | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1126][E: codex-rs/app-server-protocol/src/protocol/common.rs:1128][E: codex-rs/app-server-protocol/src/protocol/common.rs:1129][E: codex-rs/app-server-protocol/src/protocol/common.rs:1131] |
| `FuzzyFileSearch` | `fuzzyFileSearch` | `FuzzyFileSearchParams` | `FuzzyFileSearchResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1198][E: codex-rs/app-server-protocol/src/protocol/common.rs:1199][E: codex-rs/app-server-protocol/src/protocol/common.rs:1201] |
| `FuzzyFileSearchSessionStart` | `fuzzyFileSearch/sessionStart` | `FuzzyFileSearchSessionStartParams` | `FuzzyFileSearchSessionStartResponse` | experimental: fuzzyFileSearch/sessionStart | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1203][E: codex-rs/app-server-protocol/src/protocol/common.rs:1204][E: codex-rs/app-server-protocol/src/protocol/common.rs:1205][E: codex-rs/app-server-protocol/src/protocol/common.rs:1207] |
| `FuzzyFileSearchSessionUpdate` | `fuzzyFileSearch/sessionUpdate` | `FuzzyFileSearchSessionUpdateParams` | `FuzzyFileSearchSessionUpdateResponse` | experimental: fuzzyFileSearch/sessionUpdate | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1209][E: codex-rs/app-server-protocol/src/protocol/common.rs:1210][E: codex-rs/app-server-protocol/src/protocol/common.rs:1211][E: codex-rs/app-server-protocol/src/protocol/common.rs:1213] |
| `FuzzyFileSearchSessionStop` | `fuzzyFileSearch/sessionStop` | `FuzzyFileSearchSessionStopParams` | `FuzzyFileSearchSessionStopResponse` | experimental: fuzzyFileSearch/sessionStop | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1215][E: codex-rs/app-server-protocol/src/protocol/common.rs:1216][E: codex-rs/app-server-protocol/src/protocol/common.rs:1217][E: codex-rs/app-server-protocol/src/protocol/common.rs:1219] |

## Sources

- `codex-rs/app-server-protocol/src/protocol/common.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/fs.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/command_exec.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/process.rs`

## 相关

- `rpc.overview` -> [App-Server 协议总览](overview.md)
- `rpc.notifications-system` -> [server notifications: system](notifications-system.md)
