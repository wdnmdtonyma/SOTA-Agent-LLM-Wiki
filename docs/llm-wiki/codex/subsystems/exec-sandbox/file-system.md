---
id: subsys.exec-sandbox.file-system
title: Executor file system
kind: subsystem
tier: T2
source: [codex-rs/file-system/src/lib.rs]
symbols: [ExecutorFileSystem, FileSystemSandboxContext, ExecPermissionProfile, ExecManagedFileSystemPermissions, ExecFileSystemSandboxEntry, ExecFileSystemPath, FileSystemReadStream, FILE_READ_CHUNK_SIZE, CreateDirectoryOptions, RemoveOptions, CopyOptions, FileMetadata, ReadDirectoryEntry, WalkOptions, WalkOutcome]
related: [subsys.exec-sandbox.overview, subsys.exec-sandbox.exec-server, spine.shell-exec-flow]
evidence: explicit
status: verified
updated: 61a44880a8
---

> `file-system` defines the host-neutral filesystem boundary for execution components: callers use `PathUri` plus optional `FileSystemSandboxContext`, and implementations expose async file primitives, chunked reads, and a bounded recursive walk.[E: codex-rs/file-system/src/lib.rs:18][E: codex-rs/file-system/src/lib.rs:286][E: codex-rs/file-system/src/lib.rs:413][E: codex-rs/file-system/src/lib.rs:428][E: codex-rs/file-system/src/lib.rs:473]

## 能回答的问题

- `ExecutorFileSystem` 把哪些文件操作抽象成 async boundary？
- `FileSystemSandboxContext` 如何把 legacy `SandboxPolicy` 投影成 permission profile？
- 哪些 permission profile 需要真正跑 sandbox，哪些 cwd/workspace roots 可以被丢弃？
- read-stream chunk size、metadata、directory entry、walk option/outcome 的 public shape 是什么？

## 职责边界

本节点覆盖 `codex-rs/file-system` crate 的 trait、context 和 value types。它不描述某个具体 backend 如何访问磁盘或远端主机，也不描述 shell command sandbox backend 的 argv 生成；那些分别归 `exec-server`、Linux/Seatbelt/Windows sandbox 节点覆盖。[E: codex-rs/file-system/src/lib.rs:413][E: codex-rs/file-system/src/lib.rs:415][E: codex-rs/file-system/src/lib.rs:446][E: codex-rs/file-system/src/lib.rs:473]

## 关键 crate/文件

- `codex-rs/file-system/src/lib.rs`: option structs、metadata/directory-entry structs、walk structs、sandbox context、read stream wrapper、`ExecutorFileSystem` trait 全部集中在单文件。[E: codex-rs/file-system/src/lib.rs:44][E: codex-rs/file-system/src/lib.rs:60][E: codex-rs/file-system/src/lib.rs:80][E: codex-rs/file-system/src/lib.rs:121][E: codex-rs/file-system/src/lib.rs:286][E: codex-rs/file-system/src/lib.rs:390][E: codex-rs/file-system/src/lib.rs:413]

## 数据模型

- `FILE_READ_CHUNK_SIZE` is 1 MiB; `read_file_stream` returns a `FileSystemReadStream` value from the trait surface.[E: codex-rs/file-system/src/lib.rs:36][E: codex-rs/file-system/src/lib.rs:428][E: codex-rs/file-system/src/lib.rs:432]
- `CreateDirectoryOptions`, `RemoveOptions`, and `CopyOptions` carry only the recursive/force knobs needed by the trait methods.[E: codex-rs/file-system/src/lib.rs:44][E: codex-rs/file-system/src/lib.rs:49][E: codex-rs/file-system/src/lib.rs:55]
- `FileMetadata` records directory/file/symlink booleans, byte size, and creation/modification timestamps in milliseconds; `ReadDirectoryEntry` records file name plus directory/file booleans.[E: codex-rs/file-system/src/lib.rs:60][E: codex-rs/file-system/src/lib.rs:65][E: codex-rs/file-system/src/lib.rs:66][E: codex-rs/file-system/src/lib.rs:67][E: codex-rs/file-system/src/lib.rs:71]
- `WalkOptions`, `WalkEntryKind`, `WalkEntry`, `WalkError`, and `WalkOutcome` model bounded directory traversal, entry kind, recoverable errors, and truncation；`prune_hidden_directories=true` 会返回但不继续遍历名字以 `.` 开头的目录。[E: codex-rs/file-system/src/lib.rs:80][E: codex-rs/file-system/src/lib.rs:97][E: codex-rs/file-system/src/lib.rs:105][E: codex-rs/file-system/src/lib.rs:113][E: codex-rs/file-system/src/lib.rs:121][E: codex-rs/file-system/src/lib.rs:625]
- executor wire model 不直接序列化 host-native `PermissionProfile`：`ExecFileSystemPath` 用 `PathUri` 表示绝对路径，`ExecManagedFileSystemPermissions` 与 `ExecPermissionProfile` 提供双向转换，`FileSystemSandboxContext.permissions` 保存这个可跨 host 的 exec profile。[E: codex-rs/file-system/src/lib.rs:127][E: codex-rs/file-system/src/lib.rs:147][E: codex-rs/file-system/src/lib.rs:191][E: codex-rs/file-system/src/lib.rs:217][E: codex-rs/file-system/src/lib.rs:237][E: codex-rs/file-system/src/lib.rs:266][E: codex-rs/file-system/src/lib.rs:286][E: codex-rs/file-system/src/lib.rs:287]

## 控制流

1. `from_legacy_sandbox_policy` converts the incoming `PathUri` cwd to a native absolute path, derives a `FileSystemSandboxPolicy`, wraps it in a `PermissionProfile` with sandbox/network enforcement, and returns a context retaining the original URI cwd.[E: codex-rs/file-system/src/lib.rs:302][E: codex-rs/file-system/src/lib.rs:308][E: codex-rs/file-system/src/lib.rs:309][E: codex-rs/file-system/src/lib.rs:314][E: codex-rs/file-system/src/lib.rs:319]
2. `from_permission_profile` and `from_permission_profile_with_cwd` share `from_permissions_and_cwd`，把 native permission profile 转成 exec wire profile；给出 cwd 时，`workspace_roots` 初始就包含该 cwd，Windows sandbox 默认 disabled、private desktop/legacy Landlock 默认 false。[E: codex-rs/file-system/src/lib.rs:322][E: codex-rs/file-system/src/lib.rs:326][E: codex-rs/file-system/src/lib.rs:330][E: codex-rs/file-system/src/lib.rs:331][E: codex-rs/file-system/src/lib.rs:333][E: codex-rs/file-system/src/lib.rs:335][E: codex-rs/file-system/src/lib.rs:336][E: codex-rs/file-system/src/lib.rs:339]
3. `should_run_in_sandbox` first converts the exec wire profile back to a host `PermissionProfile`; conversion failure selects sandboxed execution, while successful conversion requires a restricted policy without full-disk write access.[E: codex-rs/file-system/src/lib.rs:343][E: codex-rs/file-system/src/lib.rs:344][E: codex-rs/file-system/src/lib.rs:346][E: codex-rs/file-system/src/lib.rs:348][E: codex-rs/file-system/src/lib.rs:349]
4. `has_cwd_dependent_permissions` is true for relative glob patterns and project-root special paths; `drop_cwd_if_unused` clears cwd and workspace roots only when those cwd-dependent permissions are absent.[E: codex-rs/file-system/src/lib.rs:353][E: codex-rs/file-system/src/lib.rs:355][E: codex-rs/file-system/src/lib.rs:359][E: codex-rs/file-system/src/lib.rs:360][E: codex-rs/file-system/src/lib.rs:374][E: codex-rs/file-system/src/lib.rs:375][E: codex-rs/file-system/src/lib.rs:376][E: codex-rs/file-system/src/lib.rs:377]
5. `walk` defaults to `walk_via_directory_reads`, which validates bounds, reads directories in sorted order, skips non-file/non-directory entries, tracks visited directories, optionally prunes hidden directories, and sets `truncated` when count or response-byte limits are reached.[E: codex-rs/file-system/src/lib.rs:473][E: codex-rs/file-system/src/lib.rs:479][E: codex-rs/file-system/src/lib.rs:510][E: codex-rs/file-system/src/lib.rs:516][E: codex-rs/file-system/src/lib.rs:568][E: codex-rs/file-system/src/lib.rs:625][E: codex-rs/file-system/src/lib.rs:648][E: codex-rs/file-system/src/lib.rs:651][E: codex-rs/file-system/src/lib.rs:688]

## Trait surface

- `ExecutorFileSystemFuture<'a, T>` is a pinned boxed send future returning `io::Result<T>`; `FileSystemReadStream` wraps a boxed send stream of immutable `Bytes` chunks and delegates `poll_next` to the inner stream.[E: codex-rs/file-system/src/lib.rs:383][E: codex-rs/file-system/src/lib.rs:386][E: codex-rs/file-system/src/lib.rs:390][E: codex-rs/file-system/src/lib.rs:391][E: codex-rs/file-system/src/lib.rs:396][E: codex-rs/file-system/src/lib.rs:403][E: codex-rs/file-system/src/lib.rs:407]
- The trait requires `canonicalize`, `read_file`, `read_file_stream`, `write_file`, `create_directory`, `get_metadata`, `read_directory`, `walk`, `remove`, and `copy`; every primitive method receives an optional sandbox context.[E: codex-rs/file-system/src/lib.rs:415][E: codex-rs/file-system/src/lib.rs:421][E: codex-rs/file-system/src/lib.rs:428][E: codex-rs/file-system/src/lib.rs:446][E: codex-rs/file-system/src/lib.rs:453][E: codex-rs/file-system/src/lib.rs:460][E: codex-rs/file-system/src/lib.rs:466][E: codex-rs/file-system/src/lib.rs:473][E: codex-rs/file-system/src/lib.rs:494][E: codex-rs/file-system/src/lib.rs:501]
- `read_file_text` is the default helper: it awaits `read_file` and converts bytes with `String::from_utf8`, mapping invalid UTF-8 to `io::ErrorKind::InvalidData`.[E: codex-rs/file-system/src/lib.rs:435][E: codex-rs/file-system/src/lib.rs:440][E: codex-rs/file-system/src/lib.rs:441][E: codex-rs/file-system/src/lib.rs:442]

## gotcha

- A sandbox context for another host intentionally selects sandboxed execution when its `ExecPermissionProfile` cannot be converted to host paths; that branch prevents falling back to an unsandboxed local filesystem by accident.[E: codex-rs/file-system/src/lib.rs:147][E: codex-rs/file-system/src/lib.rs:266][E: codex-rs/file-system/src/lib.rs:344][E: codex-rs/file-system/src/lib.rs:346]
- `drop_cwd_if_unused` may erase both `cwd` and `workspace_roots`; callers that depend on relative glob patterns or project roots must keep those permissions represented before calling it.[E: codex-rs/file-system/src/lib.rs:353][E: codex-rs/file-system/src/lib.rs:374][E: codex-rs/file-system/src/lib.rs:376][E: codex-rs/file-system/src/lib.rs:377]
- The default walk response is bounded not only by entry and directory counts, but also by a 4 MiB response byte cap with per-item overhead.[E: codex-rs/file-system/src/lib.rs:39][E: codex-rs/file-system/src/lib.rs:41][E: codex-rs/file-system/src/lib.rs:682][E: codex-rs/file-system/src/lib.rs:687]

## Sources

- `codex-rs/file-system/src/lib.rs`

## 相关

- `subsys.exec-sandbox.overview`
- `subsys.exec-sandbox.exec-server`
- `spine.shell-exec-flow`
