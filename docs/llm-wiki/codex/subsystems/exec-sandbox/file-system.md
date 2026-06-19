---
id: subsys.exec-sandbox.file-system
title: Executor file system
kind: subsystem
tier: T2
source: [codex-rs/file-system/src/lib.rs]
symbols: [ExecutorFileSystem, FileSystemSandboxContext, FileSystemReadStream, FILE_READ_CHUNK_SIZE, CreateDirectoryOptions, RemoveOptions, CopyOptions, FileMetadata, ReadDirectoryEntry]
related: [subsys.exec-sandbox.overview, subsys.exec-sandbox.exec-server, spine.shell-exec-flow]
evidence: explicit
status: verified
updated: 5670360009
---

> `file-system` defines the host-neutral filesystem boundary used by execution components that may operate against local or remote environments: callers pass `PathUri` values plus an optional `FileSystemSandboxContext`, and implementations provide async file operations plus a bounded chunked read stream.[E: codex-rs/file-system/src/lib.rs:13][E: codex-rs/file-system/src/lib.rs:23][E: codex-rs/file-system/src/lib.rs:191][E: codex-rs/file-system/src/lib.rs:193][E: codex-rs/file-system/src/lib.rs:197][E: codex-rs/file-system/src/lib.rs:198][E: codex-rs/file-system/src/lib.rs:208]

## 能回答的问题

- `ExecutorFileSystem` 把哪些文件操作抽象成 async boundary？
- `FileSystemSandboxContext` 如何把 legacy `SandboxPolicy` 投影成 permission profile？
- 哪些 permission profile 需要真正跑 sandbox，哪些 cwd/workspace roots 可以被丢弃？
- read-stream chunk size、metadata、directory entry、copy/remove/create options 的 public shape 是什么？

## 职责边界

本节点覆盖 `codex-rs/file-system` crate 的 trait、context 和 value types。它不描述某个具体 backend 如何访问磁盘或远端主机，也不描述 shell command sandbox backend 的 argv 生成；那些分别归 `exec-server`、Linux/Seatbelt/Windows sandbox 节点覆盖。[E: codex-rs/file-system/src/lib.rs:191][E: codex-rs/file-system/src/lib.rs:193][E: codex-rs/file-system/src/lib.rs:266]

## 关键 crate/文件

- `codex-rs/file-system/src/lib.rs`: option structs、metadata/directory-entry structs、sandbox context、read stream wrapper、`ExecutorFileSystem` trait 全部集中在单文件。[E: codex-rs/file-system/src/lib.rs:26][E: codex-rs/file-system/src/lib.rs:42][E: codex-rs/file-system/src/lib.rs:61][E: codex-rs/file-system/src/lib.rs:170][E: codex-rs/file-system/src/lib.rs:193]

## 数据模型

- `FILE_READ_CHUNK_SIZE` is 1 MiB and is the maximum chunk returned by `read_file_stream`.[E: codex-rs/file-system/src/lib.rs:22][E: codex-rs/file-system/src/lib.rs:23][E: codex-rs/file-system/src/lib.rs:208]
- `CreateDirectoryOptions`, `RemoveOptions`, and `CopyOptions` carry only the recursive/force knobs needed by the trait methods.[E: codex-rs/file-system/src/lib.rs:26][E: codex-rs/file-system/src/lib.rs:27][E: codex-rs/file-system/src/lib.rs:31][E: codex-rs/file-system/src/lib.rs:32][E: codex-rs/file-system/src/lib.rs:33][E: codex-rs/file-system/src/lib.rs:37][E: codex-rs/file-system/src/lib.rs:38]
- `FileMetadata` records directory/file/symlink booleans, byte size, and creation/modification timestamps in milliseconds; `ReadDirectoryEntry` records file name plus directory/file booleans.[E: codex-rs/file-system/src/lib.rs:42][E: codex-rs/file-system/src/lib.rs:43][E: codex-rs/file-system/src/lib.rs:44][E: codex-rs/file-system/src/lib.rs:45][E: codex-rs/file-system/src/lib.rs:47][E: codex-rs/file-system/src/lib.rs:48][E: codex-rs/file-system/src/lib.rs:49][E: codex-rs/file-system/src/lib.rs:53][E: codex-rs/file-system/src/lib.rs:54][E: codex-rs/file-system/src/lib.rs:55][E: codex-rs/file-system/src/lib.rs:56]
- `FileSystemSandboxContext` serializes camelCase fields for `permissions`, optional `cwd`, `workspace_roots`, Windows sandbox level/private desktop, and legacy Landlock selection.[E: codex-rs/file-system/src/lib.rs:59][E: codex-rs/file-system/src/lib.rs:60][E: codex-rs/file-system/src/lib.rs:61][E: codex-rs/file-system/src/lib.rs:62][E: codex-rs/file-system/src/lib.rs:64][E: codex-rs/file-system/src/lib.rs:66][E: codex-rs/file-system/src/lib.rs:67][E: codex-rs/file-system/src/lib.rs:69][E: codex-rs/file-system/src/lib.rs:71]

## 控制流

1. `from_legacy_sandbox_policy` converts the incoming `PathUri` cwd to a native absolute path, derives a `FileSystemSandboxPolicy`, wraps it in a `PermissionProfile` with sandbox/network enforcement, and returns a context retaining the original URI cwd.[E: codex-rs/file-system/src/lib.rs:75][E: codex-rs/file-system/src/lib.rs:81][E: codex-rs/file-system/src/lib.rs:82][E: codex-rs/file-system/src/lib.rs:83][E: codex-rs/file-system/src/lib.rs:87][E: codex-rs/file-system/src/lib.rs:88][E: codex-rs/file-system/src/lib.rs:91][E: codex-rs/file-system/src/lib.rs:93]
2. `from_permission_profile` and `from_permission_profile_with_cwd` share `from_permissions_and_cwd`, which converts absolute-path permissions into URI permissions and initializes workspace roots empty, Windows sandbox disabled, private desktop false, and legacy Landlock false.[E: codex-rs/file-system/src/lib.rs:96][E: codex-rs/file-system/src/lib.rs:100][E: codex-rs/file-system/src/lib.rs:107][E: codex-rs/file-system/src/lib.rs:111][E: codex-rs/file-system/src/lib.rs:112][E: codex-rs/file-system/src/lib.rs:114][E: codex-rs/file-system/src/lib.rs:115][E: codex-rs/file-system/src/lib.rs:116][E: codex-rs/file-system/src/lib.rs:117]
3. `should_run_in_sandbox` returns true when URI permissions cannot be converted to host absolute paths, or when the file-system sandbox policy is restricted without full disk write access.[E: codex-rs/file-system/src/lib.rs:121][E: codex-rs/file-system/src/lib.rs:122][E: codex-rs/file-system/src/lib.rs:126][E: codex-rs/file-system/src/lib.rs:128][E: codex-rs/file-system/src/lib.rs:129][E: codex-rs/file-system/src/lib.rs:130]
4. `has_cwd_dependent_permissions` is true for relative glob patterns and project-root special paths; `drop_cwd_if_unused` clears cwd and workspace roots only when those cwd-dependent permissions are absent.[E: codex-rs/file-system/src/lib.rs:133][E: codex-rs/file-system/src/lib.rs:138][E: codex-rs/file-system/src/lib.rs:139][E: codex-rs/file-system/src/lib.rs:140][E: codex-rs/file-system/src/lib.rs:141][E: codex-rs/file-system/src/lib.rs:154][E: codex-rs/file-system/src/lib.rs:155][E: codex-rs/file-system/src/lib.rs:156][E: codex-rs/file-system/src/lib.rs:157]

## Trait surface

- `ExecutorFileSystemFuture<'a, T>` is a pinned boxed send future returning `io::Result<T>`; `FileSystemReadStream` wraps a boxed send stream of immutable `Bytes` chunks and delegates `poll_next` to the inner stream.[E: codex-rs/file-system/src/lib.rs:163][E: codex-rs/file-system/src/lib.rs:166][E: codex-rs/file-system/src/lib.rs:170][E: codex-rs/file-system/src/lib.rs:171][E: codex-rs/file-system/src/lib.rs:176][E: codex-rs/file-system/src/lib.rs:183][E: codex-rs/file-system/src/lib.rs:186][E: codex-rs/file-system/src/lib.rs:187]
- The trait requires `canonicalize`, `read_file`, `read_file_stream`, `write_file`, `create_directory`, `get_metadata`, `read_directory`, `remove`, and `copy`; every method receives an optional sandbox context.[E: codex-rs/file-system/src/lib.rs:193][E: codex-rs/file-system/src/lib.rs:195][E: codex-rs/file-system/src/lib.rs:201][E: codex-rs/file-system/src/lib.rs:208][E: codex-rs/file-system/src/lib.rs:226][E: codex-rs/file-system/src/lib.rs:233][E: codex-rs/file-system/src/lib.rs:240][E: codex-rs/file-system/src/lib.rs:246][E: codex-rs/file-system/src/lib.rs:252][E: codex-rs/file-system/src/lib.rs:259]
- `read_file_text` is the default helper: it awaits `read_file` and converts bytes with `String::from_utf8`, mapping invalid UTF-8 to `io::ErrorKind::InvalidData`.[E: codex-rs/file-system/src/lib.rs:215][E: codex-rs/file-system/src/lib.rs:220][E: codex-rs/file-system/src/lib.rs:221][E: codex-rs/file-system/src/lib.rs:222]

## gotcha

- A sandbox context for another host intentionally selects sandboxed execution when it cannot be converted to host absolute paths; that branch prevents falling back to an unsandboxed local filesystem by accident.[E: codex-rs/file-system/src/lib.rs:122][E: codex-rs/file-system/src/lib.rs:125][E: codex-rs/file-system/src/lib.rs:126]
- `drop_cwd_if_unused` may erase both `cwd` and `workspace_roots`; callers that depend on relative glob patterns or project roots must keep those permissions represented before calling it.[E: codex-rs/file-system/src/lib.rs:133][E: codex-rs/file-system/src/lib.rs:154][E: codex-rs/file-system/src/lib.rs:156][E: codex-rs/file-system/src/lib.rs:157]

## Sources

- `codex-rs/file-system/src/lib.rs`

## 相关

- `subsys.exec-sandbox.overview`
- `subsys.exec-sandbox.exec-server`
- `spine.shell-exec-flow`
