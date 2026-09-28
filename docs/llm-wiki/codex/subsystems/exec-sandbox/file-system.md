---
id: subsys.exec-sandbox.file-system
title: Executor file system
kind: subsystem
tier: T2
source: [codex-rs/file-system/src/lib.rs, codex-rs/exec-server/src/remote_file_system.rs, codex-rs/exec-server/src/local_file_system.rs, codex-rs/exec-server/src/capability_discovery.rs, codex-rs/exec-server/src/capability_discovery_cache.rs]
symbols: [ExecutorFileSystem, FileSystemSandboxContext, ExecPermissionProfile, ExecManagedFileSystemPermissions, ExecFileSystemSandboxEntry, ExecFileSystemPath, FileSystemReadStream, FILE_READ_CHUNK_SIZE, CreateDirectoryOptions, RemoveOptions, CopyOptions, FileMetadata, ReadDirectoryEntry, WalkOptions, WalkOutcome, RemoteFileSystem, ExecutorCapabilityDiscoveryCache]
related: [subsys.exec-sandbox.overview, subsys.exec-sandbox.exec-server, spine.shell-exec-flow]
evidence: explicit
status: verified
updated: 1cc7e23612
---

> `file-system` defines the host-neutral filesystem boundary for execution components: callers use `PathUri` plus optional `FileSystemSandboxContext`, and implementations expose async file primitives, chunked reads, and a bounded recursive walk.[E: codex-rs/file-system/src/lib.rs:348][E: codex-rs/file-system/src/lib.rs:627][E: codex-rs/file-system/src/lib.rs:643][E: codex-rs/file-system/src/lib.rs:691]

## 能回答的问题

- `ExecutorFileSystem` 把哪些文件操作抽象成 async boundary？
- `FileSystemSandboxContext` 如何把 legacy `SandboxPolicy` 投影成 permission profile？
- 哪些 permission profile 需要真正跑 sandbox，哪些 cwd/workspace roots 可以被丢弃？
- read-stream chunk size、metadata、directory entry、walk option/outcome 的 public shape 是什么？
- remote backend 怎样保留 `PathUri`、隔离 sandboxed metadata，并执行 sandbox-aware capability discovery？

## 职责边界

本节点以 `codex-rs/file-system` trait/context/value types 为主，并补充 exec-server remote backend 对这一契约的关键安全语义。具体 JSON-RPC session lifecycle 仍归 `subsys.exec-sandbox.exec-server`，shell command argv 生成归各 OS sandbox 节点。[E: codex-rs/file-system/src/lib.rs:627][E: codex-rs/file-system/src/lib.rs:629][E: codex-rs/file-system/src/lib.rs:662][E: codex-rs/file-system/src/lib.rs:691]

## 关键 crate/文件

- `codex-rs/file-system/src/lib.rs`: option structs、metadata/directory-entry structs、walk structs、sandbox context、read stream wrapper、`ExecutorFileSystem` trait 全部集中在单文件。[E: codex-rs/file-system/src/lib.rs:93][E: codex-rs/file-system/src/lib.rs:111][E: codex-rs/file-system/src/lib.rs:131][E: codex-rs/file-system/src/lib.rs:172][E: codex-rs/file-system/src/lib.rs:348][E: codex-rs/file-system/src/lib.rs:604][E: codex-rs/file-system/src/lib.rs:627]
- `codex-rs/exec-server/src/remote_file_system.rs`: 把 trait primitive 映射为 remote RPC，并对 streaming、metadata sharing 和 mutations 施加额外边界。[E: codex-rs/exec-server/src/remote_file_system.rs:47][E: codex-rs/exec-server/src/remote_file_system.rs:78][E: codex-rs/exec-server/src/remote_file_system.rs:102][E: codex-rs/exec-server/src/remote_file_system.rs:162]
- `codex-rs/exec-server/src/capability_discovery.rs`: 在同一 sandbox context 下 bounded walk/read plugin 与 skill manifests。[E: codex-rs/exec-server/src/capability_discovery.rs:51][E: codex-rs/exec-server/src/capability_discovery.rs:64][E: codex-rs/exec-server/src/capability_discovery.rs:110][E: codex-rs/exec-server/src/capability_discovery.rs:166]

## 数据模型

- `FILE_READ_CHUNK_SIZE` is 1 MiB; `read_file_stream` returns a `FileSystemReadStream` value from the trait surface.[E: codex-rs/file-system/src/lib.rs:41][E: codex-rs/file-system/src/lib.rs:643][E: codex-rs/file-system/src/lib.rs:647]
- `CreateDirectoryOptions`, `RemoveOptions`, and `CopyOptions` carry only the recursive/force knobs needed by the trait methods.[E: codex-rs/file-system/src/lib.rs:93][E: codex-rs/file-system/src/lib.rs:99][E: codex-rs/file-system/src/lib.rs:106]
- `FileMetadata` records directory/file/symlink booleans, byte size, and creation/modification timestamps in milliseconds; `ReadDirectoryEntry` records file name plus directory/file booleans.[E: codex-rs/file-system/src/lib.rs:111][E: codex-rs/file-system/src/lib.rs:116][E: codex-rs/file-system/src/lib.rs:117][E: codex-rs/file-system/src/lib.rs:118][E: codex-rs/file-system/src/lib.rs:122]
- `WalkOptions`, `WalkEntryKind`, `WalkEntry`, `WalkError`, and `WalkOutcome` model bounded directory traversal, entry kind, recoverable errors, and truncation；`prune_hidden_directories=true` 会返回但不继续遍历名字以 `.` 开头的目录。[E: codex-rs/file-system/src/lib.rs:131][E: codex-rs/file-system/src/lib.rs:142][E: codex-rs/file-system/src/lib.rs:148][E: codex-rs/file-system/src/lib.rs:156][E: codex-rs/file-system/src/lib.rs:164][E: codex-rs/file-system/src/lib.rs:172]
- executor wire model 不直接序列化 host-native `PermissionProfile`：`ExecFileSystemPath` 用 `PathUri` 表示绝对路径，`ExecManagedFileSystemPermissions` 与 `ExecPermissionProfile` 提供双向转换，`FileSystemSandboxContext.permissions` 保存这个可跨 host 的 exec profile。[E: codex-rs/file-system/src/lib.rs:178][E: codex-rs/file-system/src/lib.rs:190][E: codex-rs/file-system/src/lib.rs:234][E: codex-rs/file-system/src/lib.rs:261][E: codex-rs/file-system/src/lib.rs:276][E: codex-rs/file-system/src/lib.rs:310][E: codex-rs/file-system/src/lib.rs:348][E: codex-rs/file-system/src/lib.rs:331]

## 控制流

1. `from_legacy_sandbox_policy` converts the incoming `PathUri` cwd to a native absolute path, derives a `FileSystemSandboxPolicy`, wraps it in a `PermissionProfile` with sandbox/network enforcement, and returns a context retaining the original URI cwd.[E: codex-rs/file-system/src/lib.rs:372][E: codex-rs/file-system/src/lib.rs:378][E: codex-rs/file-system/src/lib.rs:379][E: codex-rs/file-system/src/lib.rs:384][E: codex-rs/file-system/src/lib.rs:368]
2. `from_permission_profile` 把 native `PermissionProfile` 装进 context：`workspace_roots` 初始包含 cwd，`windows_sandbox_selection` 默认 `Disabled`，`use_legacy_landlock` 默认 false。不存在 `from_permission_profile_with_cwd` / `from_permissions_and_cwd`。[E: codex-rs/file-system/src/lib.rs:392][E: codex-rs/file-system/src/lib.rs:394][E: codex-rs/file-system/src/lib.rs:395][E: codex-rs/file-system/src/lib.rs:399][E: codex-rs/file-system/src/lib.rs:401]
3. `should_read_from_sandbox` / `should_write_into_sandbox` decide whether the selected executor needs a platform sandbox: each is true when the permission profile's filesystem policy lacks full-disk read or write for the cwd path convention. `from_permission_profile` defaults `windows_sandbox_selection` to `Disabled` and does not implement a conversion-failure-implies-sandbox gate.[E: codex-rs/file-system/src/lib.rs:399][E: codex-rs/file-system/src/lib.rs:406][E: codex-rs/file-system/src/lib.rs:414]
4. `WireFileSystemSandboxContext` compaction lives on `From<FileSystemSandboxContext>`: `legacy_needs_cwd` is true for relative globs (pattern cannot parse as an absolute URI) and `ProjectRoots` specials; only then does the wire keep legacy `cwd`/`workspace_roots`. `requires_cwd` is the ingress check for relative globs / project-root specials. Host path validation is `validate_file_system_paths_for_current_host`, not cwd drop.[E: codex-rs/file-system/src/lib.rs:507][E: codex-rs/file-system/src/lib.rs:532][E: codex-rs/file-system/src/lib.rs:561][E: codex-rs/file-system/src/lib.rs:570][E: codex-rs/file-system/src/lib.rs:428]
5. `ExecutorFileSystem::walk` 现在是必实现 trait 方法，**没有** crate 内 `walk_via_directory_reads` 默认实现。本地 unsandboxed 实现是 `DirectFileSystem::sync_walk`：校验 depth/directory/entry 上限，`spawn_blocking` 跑同步 BFS，拒绝 sandbox context，可被 cancellation token 打断；`prune_hidden_directories` 仍返回 `.` 目录但不下降，超 count 或 4 MiB response budget 时设 `truncated`。[E: codex-rs/file-system/src/lib.rs:691][E: codex-rs/exec-server/src/local_file_system.rs:1047][E: codex-rs/exec-server/src/local_file_system.rs:738][E: codex-rs/exec-server/src/local_file_system.rs:744][E: codex-rs/exec-server/src/local_file_system.rs:1054][E: codex-rs/exec-server/src/local_file_system.rs:859][E: codex-rs/exec-server/src/local_file_system.rs:1165]

## Trait surface

- `ExecutorFileSystemFuture<'a, T>` is a pinned boxed send future returning `io::Result<T>`; `FileSystemReadStream` wraps a boxed send stream of immutable `Bytes` chunks and delegates `poll_next` to the inner stream.[E: codex-rs/file-system/src/lib.rs:597][E: codex-rs/file-system/src/lib.rs:600][E: codex-rs/file-system/src/lib.rs:604][E: codex-rs/file-system/src/lib.rs:605][E: codex-rs/file-system/src/lib.rs:610][E: codex-rs/file-system/src/lib.rs:617][E: codex-rs/file-system/src/lib.rs:621]
- The trait requires `canonicalize`, `read_file`, `read_file_stream`, `write_file`, `create_directory`, `get_metadata`, `read_directory`, `walk`, `remove`, and `copy`; every primitive method receives an optional sandbox context.[E: codex-rs/file-system/src/lib.rs:629][E: codex-rs/file-system/src/lib.rs:635][E: codex-rs/file-system/src/lib.rs:643][E: codex-rs/file-system/src/lib.rs:662][E: codex-rs/file-system/src/lib.rs:670][E: codex-rs/file-system/src/lib.rs:677][E: codex-rs/file-system/src/lib.rs:684][E: codex-rs/file-system/src/lib.rs:691][E: codex-rs/file-system/src/lib.rs:698][E: codex-rs/file-system/src/lib.rs:705]
- `read_file_text` is the default helper: it awaits `read_file` and converts bytes with `String::from_utf8`, mapping invalid UTF-8 to `io::ErrorKind::InvalidData`.[E: codex-rs/file-system/src/lib.rs:650][E: codex-rs/file-system/src/lib.rs:656][E: codex-rs/file-system/src/lib.rs:657][E: codex-rs/file-system/src/lib.rs:658]

## Remote backend 与 capability discovery

Remote backend 保留 `PathUri` 的 executor 语义，不会在 app host 上先把 foreign executor path 转为本机绝对路径；RPC params 用 `sandbox.cloned()` 原样带上 `FileSystemSandboxContext`。Cwd/workspace compaction 发生在 `WireFileSystemSandboxContext::from`（`legacy_needs_cwd`），不是 remote RPC 路径上的独立 helper。[E: codex-rs/exec-server/src/remote_file_system.rs:61][E: codex-rs/exec-server/src/remote_file_system.rs:69][E: codex-rs/exec-server/src/remote_file_system.rs:71][E: codex-rs/exec-server/src/remote_file_system.rs:90][E: codex-rs/file-system/src/lib.rs:492][E: codex-rs/file-system/src/lib.rs:507]

Remote `read_file_stream` 调用 `file_stream::open`，该文件不返回 `Unsupported`。本地 unsandboxed `DirectFileSystem` 在带 sandbox context 时经 `reject_sandbox_context` 返回 `InvalidInput`；需要 platform sandbox 的读会由 `LocalFileSystem::file_system_for_reads` 转给 sandboxed backend。Metadata sharing 只覆盖同一 URI、sandbox context 缺省且尚未完成的 RPC；只要 context 存在就永远 fresh，完成后 entry 立即删除，write/create 等 mutation 也会清空 map。[E: codex-rs/exec-server/src/remote_file_system.rs:102][E: codex-rs/exec-server/src/remote_file_system.rs:109][E: codex-rs/exec-server/src/local_file_system.rs:105][E: codex-rs/exec-server/src/local_file_system.rs:1173][E: codex-rs/exec-server/src/local_file_system.rs:1175][E: codex-rs/exec-server/src/remote_file_system.rs:119][E: codex-rs/exec-server/src/remote_file_system.rs:135][E: codex-rs/exec-server/src/remote_file_system.rs:162]

Capability discovery request 逐 root 携带 sandbox context，metadata、walk 和 manifest read 复用它；Windows 上请求需要 sandbox 而 restricted-token backend disabled 时明确返回 unavailable。Caller cache identity 同时包含 selected root 与 sandbox，避免跨权限上下文复用结果。[E: codex-rs/exec-server/src/capability_discovery.rs:64][E: codex-rs/exec-server/src/capability_discovery.rs:87][E: codex-rs/exec-server/src/capability_discovery.rs:95][E: codex-rs/exec-server/src/capability_discovery.rs:110][E: codex-rs/exec-server/src/capability_discovery.rs:166][E: codex-rs/exec-server/src/capability_discovery_cache.rs:60][E: codex-rs/exec-server/src/capability_discovery_cache.rs:69][E: codex-rs/exec-server/src/capability_discovery_cache.rs:96]

## gotcha

- Read/write sandbox selection is `should_read_from_sandbox` / `should_write_into_sandbox` against full-disk access; there is no `should_run_in_sandbox` conversion-failure branch.[E: codex-rs/file-system/src/lib.rs:406][E: codex-rs/file-system/src/lib.rs:414]
- Wire conversion may omit legacy `cwd`/`workspace_roots` when `legacy_needs_cwd` is false; relative globs and `ProjectRoots` still need those fields for old executors. `requires_cwd` is the matching ingress predicate.[E: codex-rs/file-system/src/lib.rs:507][E: codex-rs/file-system/src/lib.rs:532][E: codex-rs/file-system/src/lib.rs:561]
- Walk response 仍受 entry/directory 上限和 4 MiB response byte cap（含 per-item overhead）约束，但执行逻辑在 `exec-server` 的 local/sandboxed/remote backend，不再在 `file-system` trait 默认方法里。[E: codex-rs/file-system/src/lib.rs:49][E: codex-rs/file-system/src/lib.rs:51][E: codex-rs/exec-server/src/local_file_system.rs:1165]

## Sources

- `codex-rs/file-system/src/lib.rs`
- `codex-rs/exec-server/src/local_file_system.rs`
- `codex-rs/exec-server/src/remote_file_system.rs`
- `codex-rs/exec-server/src/capability_discovery.rs`
- `codex-rs/exec-server/src/capability_discovery_cache.rs`

## 相关

- `subsys.exec-sandbox.overview`
- `subsys.exec-sandbox.exec-server`
- `spine.shell-exec-flow`
