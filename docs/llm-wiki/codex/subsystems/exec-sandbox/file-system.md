---
id: subsys.exec-sandbox.file-system
title: Executor file system
kind: subsystem
tier: T2
source: [codex-rs/file-system/src/lib.rs]
symbols: [ExecutorFileSystem, FileSystemSandboxContext, FileSystemReadStream, FILE_READ_CHUNK_SIZE, CreateDirectoryOptions, RemoveOptions, CopyOptions, FileMetadata, ReadDirectoryEntry, WalkOptions, WalkOutcome]
related: [subsys.exec-sandbox.overview, subsys.exec-sandbox.exec-server, spine.shell-exec-flow]
evidence: explicit
status: verified
updated: db887d03e1
---

> `file-system` defines the host-neutral filesystem boundary for execution components: callers use `PathUri` plus optional `FileSystemSandboxContext`, and implementations expose async file primitives, chunked reads, and a bounded recursive walk.[E: codex-rs/file-system/src/lib.rs:19][E: codex-rs/file-system/src/lib.rs:121][E: codex-rs/file-system/src/lib.rs:253][E: codex-rs/file-system/src/lib.rs:268][E: codex-rs/file-system/src/lib.rs:313]

## 能回答的问题

- `ExecutorFileSystem` 把哪些文件操作抽象成 async boundary？
- `FileSystemSandboxContext` 如何把 legacy `SandboxPolicy` 投影成 permission profile？
- 哪些 permission profile 需要真正跑 sandbox，哪些 cwd/workspace roots 可以被丢弃？
- read-stream chunk size、metadata、directory entry、walk option/outcome 的 public shape 是什么？

## 职责边界

本节点覆盖 `codex-rs/file-system` crate 的 trait、context 和 value types。它不描述某个具体 backend 如何访问磁盘或远端主机，也不描述 shell command sandbox backend 的 argv 生成；那些分别归 `exec-server`、Linux/Seatbelt/Windows sandbox 节点覆盖。[E: codex-rs/file-system/src/lib.rs:253][E: codex-rs/file-system/src/lib.rs:255][E: codex-rs/file-system/src/lib.rs:286][E: codex-rs/file-system/src/lib.rs:313]

## 关键 crate/文件

- `codex-rs/file-system/src/lib.rs`: option structs、metadata/directory-entry structs、walk structs、sandbox context、read stream wrapper、`ExecutorFileSystem` trait 全部集中在单文件。[E: codex-rs/file-system/src/lib.rs:39][E: codex-rs/file-system/src/lib.rs:55][E: codex-rs/file-system/src/lib.rs:75][E: codex-rs/file-system/src/lib.rs:113][E: codex-rs/file-system/src/lib.rs:121][E: codex-rs/file-system/src/lib.rs:230][E: codex-rs/file-system/src/lib.rs:253]

## 数据模型

- `FILE_READ_CHUNK_SIZE` is 1 MiB; `read_file_stream` returns a `FileSystemReadStream` value from the trait surface.[E: codex-rs/file-system/src/lib.rs:31][E: codex-rs/file-system/src/lib.rs:268][E: codex-rs/file-system/src/lib.rs:272]
- `CreateDirectoryOptions`, `RemoveOptions`, and `CopyOptions` carry only the recursive/force knobs needed by the trait methods.[E: codex-rs/file-system/src/lib.rs:39][E: codex-rs/file-system/src/lib.rs:44][E: codex-rs/file-system/src/lib.rs:50]
- `FileMetadata` records directory/file/symlink booleans, byte size, and creation/modification timestamps in milliseconds; `ReadDirectoryEntry` records file name plus directory/file booleans.[E: codex-rs/file-system/src/lib.rs:55][E: codex-rs/file-system/src/lib.rs:60][E: codex-rs/file-system/src/lib.rs:61][E: codex-rs/file-system/src/lib.rs:62][E: codex-rs/file-system/src/lib.rs:66]
- `WalkOptions`, `WalkEntryKind`, `WalkEntry`, `WalkError`, and `WalkOutcome` model bounded directory traversal, entry kind, recoverable errors, and truncation.[E: codex-rs/file-system/src/lib.rs:75][E: codex-rs/file-system/src/lib.rs:89][E: codex-rs/file-system/src/lib.rs:97][E: codex-rs/file-system/src/lib.rs:105][E: codex-rs/file-system/src/lib.rs:113]
- `FileSystemSandboxContext` serializes camelCase fields for `permissions`, optional `cwd`, `workspace_roots`, Windows sandbox level/private desktop, and legacy Landlock selection.[E: codex-rs/file-system/src/lib.rs:120][E: codex-rs/file-system/src/lib.rs:122][E: codex-rs/file-system/src/lib.rs:124][E: codex-rs/file-system/src/lib.rs:126][E: codex-rs/file-system/src/lib.rs:127][E: codex-rs/file-system/src/lib.rs:129][E: codex-rs/file-system/src/lib.rs:131]

## 控制流

1. `from_legacy_sandbox_policy` converts the incoming `PathUri` cwd to a native absolute path, derives a `FileSystemSandboxPolicy`, wraps it in a `PermissionProfile` with sandbox/network enforcement, and returns a context retaining the original URI cwd.[E: codex-rs/file-system/src/lib.rs:135][E: codex-rs/file-system/src/lib.rs:141][E: codex-rs/file-system/src/lib.rs:142][E: codex-rs/file-system/src/lib.rs:147][E: codex-rs/file-system/src/lib.rs:153]
2. `from_permission_profile` and `from_permission_profile_with_cwd` share `from_permissions_and_cwd`, which converts absolute-path permissions into URI permissions and initializes workspace roots empty, Windows sandbox disabled, private desktop false, and legacy Landlock false.[E: codex-rs/file-system/src/lib.rs:156][E: codex-rs/file-system/src/lib.rs:160][E: codex-rs/file-system/src/lib.rs:167][E: codex-rs/file-system/src/lib.rs:171][E: codex-rs/file-system/src/lib.rs:174][E: codex-rs/file-system/src/lib.rs:175][E: codex-rs/file-system/src/lib.rs:176][E: codex-rs/file-system/src/lib.rs:177]
3. `should_run_in_sandbox` returns true when URI permissions cannot be converted to host absolute paths, or when the file-system sandbox policy is restricted without full disk write access.[E: codex-rs/file-system/src/lib.rs:181][E: codex-rs/file-system/src/lib.rs:182][E: codex-rs/file-system/src/lib.rs:186][E: codex-rs/file-system/src/lib.rs:188][E: codex-rs/file-system/src/lib.rs:190]
4. `has_cwd_dependent_permissions` is true for relative glob patterns and project-root special paths; `drop_cwd_if_unused` clears cwd and workspace roots only when those cwd-dependent permissions are absent.[E: codex-rs/file-system/src/lib.rs:193][E: codex-rs/file-system/src/lib.rs:198][E: codex-rs/file-system/src/lib.rs:199][E: codex-rs/file-system/src/lib.rs:201][E: codex-rs/file-system/src/lib.rs:214][E: codex-rs/file-system/src/lib.rs:215][E: codex-rs/file-system/src/lib.rs:216][E: codex-rs/file-system/src/lib.rs:217]
5. `walk` defaults to `walk_via_directory_reads`, which validates bounds, reads directories in sorted order, skips non-file/non-directory entries, tracks visited directories, and sets `truncated` when count or response-byte limits are reached.[E: codex-rs/file-system/src/lib.rs:313][E: codex-rs/file-system/src/lib.rs:319][E: codex-rs/file-system/src/lib.rs:350][E: codex-rs/file-system/src/lib.rs:356][E: codex-rs/file-system/src/lib.rs:408][E: codex-rs/file-system/src/lib.rs:484][E: codex-rs/file-system/src/lib.rs:487][E: codex-rs/file-system/src/lib.rs:524]

## Trait surface

- `ExecutorFileSystemFuture<'a, T>` is a pinned boxed send future returning `io::Result<T>`; `FileSystemReadStream` wraps a boxed send stream of immutable `Bytes` chunks and delegates `poll_next` to the inner stream.[E: codex-rs/file-system/src/lib.rs:223][E: codex-rs/file-system/src/lib.rs:226][E: codex-rs/file-system/src/lib.rs:230][E: codex-rs/file-system/src/lib.rs:231][E: codex-rs/file-system/src/lib.rs:236][E: codex-rs/file-system/src/lib.rs:243][E: codex-rs/file-system/src/lib.rs:247]
- The trait requires `canonicalize`, `read_file`, `read_file_stream`, `write_file`, `create_directory`, `get_metadata`, `read_directory`, `walk`, `remove`, and `copy`; every primitive method receives an optional sandbox context.[E: codex-rs/file-system/src/lib.rs:255][E: codex-rs/file-system/src/lib.rs:261][E: codex-rs/file-system/src/lib.rs:268][E: codex-rs/file-system/src/lib.rs:286][E: codex-rs/file-system/src/lib.rs:293][E: codex-rs/file-system/src/lib.rs:300][E: codex-rs/file-system/src/lib.rs:306][E: codex-rs/file-system/src/lib.rs:313][E: codex-rs/file-system/src/lib.rs:334][E: codex-rs/file-system/src/lib.rs:341]
- `read_file_text` is the default helper: it awaits `read_file` and converts bytes with `String::from_utf8`, mapping invalid UTF-8 to `io::ErrorKind::InvalidData`.[E: codex-rs/file-system/src/lib.rs:275][E: codex-rs/file-system/src/lib.rs:280][E: codex-rs/file-system/src/lib.rs:281][E: codex-rs/file-system/src/lib.rs:282]

## gotcha

- A sandbox context for another host intentionally selects sandboxed execution when it cannot be converted to host absolute paths; that branch prevents falling back to an unsandboxed local filesystem by accident.[E: codex-rs/file-system/src/lib.rs:182][E: codex-rs/file-system/src/lib.rs:184][E: codex-rs/file-system/src/lib.rs:186]
- `drop_cwd_if_unused` may erase both `cwd` and `workspace_roots`; callers that depend on relative glob patterns or project roots must keep those permissions represented before calling it.[E: codex-rs/file-system/src/lib.rs:193][E: codex-rs/file-system/src/lib.rs:214][E: codex-rs/file-system/src/lib.rs:216][E: codex-rs/file-system/src/lib.rs:217]
- The default walk response is bounded not only by entry and directory counts, but also by a 4 MiB response byte cap with per-item overhead.[E: codex-rs/file-system/src/lib.rs:34][E: codex-rs/file-system/src/lib.rs:36][E: codex-rs/file-system/src/lib.rs:519][E: codex-rs/file-system/src/lib.rs:524]

## Sources

- `codex-rs/file-system/src/lib.rs`

## 相关

- `subsys.exec-sandbox.overview`
- `subsys.exec-sandbox.exec-server`
- `spine.shell-exec-flow`
