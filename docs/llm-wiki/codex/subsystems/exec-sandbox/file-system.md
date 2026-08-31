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
updated: a9519cbcdd
---

> `file-system` defines the host-neutral filesystem boundary for execution components: callers use `PathUri` plus optional `FileSystemSandboxContext`, and implementations expose async file primitives, chunked reads, and a bounded recursive walk.[E: codex-rs/file-system/src/lib.rs:19][E: codex-rs/file-system/src/lib.rs:330][E: codex-rs/file-system/src/lib.rs:477][E: codex-rs/file-system/src/lib.rs:493][E: codex-rs/file-system/src/lib.rs:541]

## 能回答的问题

- `ExecutorFileSystem` 把哪些文件操作抽象成 async boundary？
- `FileSystemSandboxContext` 如何把 legacy `SandboxPolicy` 投影成 permission profile？
- 哪些 permission profile 需要真正跑 sandbox，哪些 cwd/workspace roots 可以被丢弃？
- read-stream chunk size、metadata、directory entry、walk option/outcome 的 public shape 是什么？
- remote backend 怎样保留 `PathUri`、隔离 sandboxed metadata，并执行 sandbox-aware capability discovery？

## 职责边界

本节点以 `codex-rs/file-system` trait/context/value types 为主，并补充 exec-server remote backend 对这一契约的关键安全语义。具体 JSON-RPC session lifecycle 仍归 `subsys.exec-sandbox.exec-server`，shell command argv 生成归各 OS sandbox 节点。[E: codex-rs/file-system/src/lib.rs:477][E: codex-rs/file-system/src/lib.rs:479][E: codex-rs/file-system/src/lib.rs:512][E: codex-rs/file-system/src/lib.rs:541]

## 关键 crate/文件

- `codex-rs/file-system/src/lib.rs`: option structs、metadata/directory-entry structs、walk structs、sandbox context、read stream wrapper、`ExecutorFileSystem` trait 全部集中在单文件。[E: codex-rs/file-system/src/lib.rs:87][E: codex-rs/file-system/src/lib.rs:105][E: codex-rs/file-system/src/lib.rs:125][E: codex-rs/file-system/src/lib.rs:166][E: codex-rs/file-system/src/lib.rs:330][E: codex-rs/file-system/src/lib.rs:454][E: codex-rs/file-system/src/lib.rs:477]
- `codex-rs/exec-server/src/remote_file_system.rs`: 把 trait primitive 映射为 remote RPC，并对 streaming、metadata sharing 和 mutations 施加额外边界。[E: codex-rs/exec-server/src/remote_file_system.rs:47][E: codex-rs/exec-server/src/remote_file_system.rs:78][E: codex-rs/exec-server/src/remote_file_system.rs:102][E: codex-rs/exec-server/src/remote_file_system.rs:162]
- `codex-rs/exec-server/src/capability_discovery.rs`: 在同一 sandbox context 下 bounded walk/read plugin 与 skill manifests。[E: codex-rs/exec-server/src/capability_discovery.rs:50][E: codex-rs/exec-server/src/capability_discovery.rs:63][E: codex-rs/exec-server/src/capability_discovery.rs:104][E: codex-rs/exec-server/src/capability_discovery.rs:160]

## 数据模型

- `FILE_READ_CHUNK_SIZE` is 1 MiB; `read_file_stream` returns a `FileSystemReadStream` value from the trait surface.[E: codex-rs/file-system/src/lib.rs:35][E: codex-rs/file-system/src/lib.rs:493][E: codex-rs/file-system/src/lib.rs:497]
- `CreateDirectoryOptions`, `RemoveOptions`, and `CopyOptions` carry only the recursive/force knobs needed by the trait methods.[E: codex-rs/file-system/src/lib.rs:87][E: codex-rs/file-system/src/lib.rs:93][E: codex-rs/file-system/src/lib.rs:100]
- `FileMetadata` records directory/file/symlink booleans, byte size, and creation/modification timestamps in milliseconds; `ReadDirectoryEntry` records file name plus directory/file booleans.[E: codex-rs/file-system/src/lib.rs:105][E: codex-rs/file-system/src/lib.rs:110][E: codex-rs/file-system/src/lib.rs:111][E: codex-rs/file-system/src/lib.rs:112][E: codex-rs/file-system/src/lib.rs:116]
- `WalkOptions`, `WalkEntryKind`, `WalkEntry`, `WalkError`, and `WalkOutcome` model bounded directory traversal, entry kind, recoverable errors, and truncation；`prune_hidden_directories=true` 会返回但不继续遍历名字以 `.` 开头的目录。[E: codex-rs/file-system/src/lib.rs:125][E: codex-rs/file-system/src/lib.rs:136][E: codex-rs/file-system/src/lib.rs:142][E: codex-rs/file-system/src/lib.rs:150][E: codex-rs/file-system/src/lib.rs:158][E: codex-rs/file-system/src/lib.rs:166]
- executor wire model 不直接序列化 host-native `PermissionProfile`：`ExecFileSystemPath` 用 `PathUri` 表示绝对路径，`ExecManagedFileSystemPermissions` 与 `ExecPermissionProfile` 提供双向转换，`FileSystemSandboxContext.permissions` 保存这个可跨 host 的 exec profile。[E: codex-rs/file-system/src/lib.rs:172][E: codex-rs/file-system/src/lib.rs:190][E: codex-rs/file-system/src/lib.rs:235][E: codex-rs/file-system/src/lib.rs:261][E: codex-rs/file-system/src/lib.rs:281][E: codex-rs/file-system/src/lib.rs:310][E: codex-rs/file-system/src/lib.rs:330][E: codex-rs/file-system/src/lib.rs:331]

## 控制流

1. `from_legacy_sandbox_policy` converts the incoming `PathUri` cwd to a native absolute path, derives a `FileSystemSandboxPolicy`, wraps it in a `PermissionProfile` with sandbox/network enforcement, and returns a context retaining the original URI cwd.[E: codex-rs/file-system/src/lib.rs:352][E: codex-rs/file-system/src/lib.rs:358][E: codex-rs/file-system/src/lib.rs:359][E: codex-rs/file-system/src/lib.rs:364][E: codex-rs/file-system/src/lib.rs:369]
2. `from_permission_profile` and `from_permission_profile_with_cwd` share `from_permissions_and_cwd`，把 native permission profile 转成 exec wire profile；给出 cwd 时，`workspace_roots` 初始就包含该 cwd，Windows sandbox 默认 disabled、private desktop/legacy Landlock 默认 false。[E: codex-rs/file-system/src/lib.rs:372][E: codex-rs/file-system/src/lib.rs:376][E: codex-rs/file-system/src/lib.rs:380][E: codex-rs/file-system/src/lib.rs:381][E: codex-rs/file-system/src/lib.rs:383][E: codex-rs/file-system/src/lib.rs:387][E: codex-rs/file-system/src/lib.rs:388][E: codex-rs/file-system/src/lib.rs:391]
3. `should_run_in_sandbox` first converts the exec wire profile back to a host `PermissionProfile`; conversion failure selects sandboxed execution, while successful conversion requires a restricted policy without full-disk write access.[E: codex-rs/file-system/src/lib.rs:395][E: codex-rs/file-system/src/lib.rs:396][E: codex-rs/file-system/src/lib.rs:398][E: codex-rs/file-system/src/lib.rs:400][E: codex-rs/file-system/src/lib.rs:401]
4. `has_cwd_dependent_permissions` is true for relative glob patterns and project-root special paths; `drop_cwd_if_unused` clears cwd and workspace roots only when those cwd-dependent permissions are absent.[E: codex-rs/file-system/src/lib.rs:417][E: codex-rs/file-system/src/lib.rs:419][E: codex-rs/file-system/src/lib.rs:423][E: codex-rs/file-system/src/lib.rs:424][E: codex-rs/file-system/src/lib.rs:438][E: codex-rs/file-system/src/lib.rs:439][E: codex-rs/file-system/src/lib.rs:440][E: codex-rs/file-system/src/lib.rs:441]
5. `ExecutorFileSystem::walk` 现在是必实现 trait 方法，**没有** crate 内 `walk_via_directory_reads` 默认实现。本地 unsandboxed 实现是 `DirectFileSystem::sync_walk`：校验 depth/directory/entry 上限，`spawn_blocking` 跑同步 BFS，拒绝 sandbox context，可被 cancellation token 打断；`prune_hidden_directories` 仍返回 `.` 目录但不下降，超 count 或 4 MiB response budget 时设 `truncated`。[E: codex-rs/file-system/src/lib.rs:541][E: codex-rs/exec-server/src/local_file_system.rs:1012][E: codex-rs/exec-server/src/local_file_system.rs:703][E: codex-rs/exec-server/src/local_file_system.rs:709][E: codex-rs/exec-server/src/local_file_system.rs:1019][E: codex-rs/exec-server/src/local_file_system.rs:824][E: codex-rs/exec-server/src/local_file_system.rs:1130]

## Trait surface

- `ExecutorFileSystemFuture<'a, T>` is a pinned boxed send future returning `io::Result<T>`; `FileSystemReadStream` wraps a boxed send stream of immutable `Bytes` chunks and delegates `poll_next` to the inner stream.[E: codex-rs/file-system/src/lib.rs:447][E: codex-rs/file-system/src/lib.rs:450][E: codex-rs/file-system/src/lib.rs:454][E: codex-rs/file-system/src/lib.rs:455][E: codex-rs/file-system/src/lib.rs:460][E: codex-rs/file-system/src/lib.rs:467][E: codex-rs/file-system/src/lib.rs:471]
- The trait requires `canonicalize`, `read_file`, `read_file_stream`, `write_file`, `create_directory`, `get_metadata`, `read_directory`, `walk`, `remove`, and `copy`; every primitive method receives an optional sandbox context.[E: codex-rs/file-system/src/lib.rs:479][E: codex-rs/file-system/src/lib.rs:485][E: codex-rs/file-system/src/lib.rs:493][E: codex-rs/file-system/src/lib.rs:512][E: codex-rs/file-system/src/lib.rs:520][E: codex-rs/file-system/src/lib.rs:527][E: codex-rs/file-system/src/lib.rs:534][E: codex-rs/file-system/src/lib.rs:541][E: codex-rs/file-system/src/lib.rs:548][E: codex-rs/file-system/src/lib.rs:555]
- `read_file_text` is the default helper: it awaits `read_file` and converts bytes with `String::from_utf8`, mapping invalid UTF-8 to `io::ErrorKind::InvalidData`.[E: codex-rs/file-system/src/lib.rs:500][E: codex-rs/file-system/src/lib.rs:506][E: codex-rs/file-system/src/lib.rs:507][E: codex-rs/file-system/src/lib.rs:508]

## Remote backend 与 capability discovery

Remote backend 保留 `PathUri` 的 executor 语义，不会在 app host 上先把 foreign executor path 转为本机绝对路径；optional `FileSystemSandboxContext` 在写入 RPC 前会 clone 并执行 transport compaction，移除执行端不需要的 `cwd`/workspace roots，而不是逐字段原样复制。[E: codex-rs/exec-server/src/remote_file_system.rs:61][E: codex-rs/exec-server/src/remote_file_system.rs:69][E: codex-rs/exec-server/src/remote_file_system.rs:78][E: codex-rs/exec-server/src/remote_file_system.rs:87][E: codex-rs/exec-server/src/remote_file_system.rs:415][E: codex-rs/exec-server/src/remote_file_system.rs:415][E: codex-rs/exec-server/src/remote_file_system.rs:420][E: codex-rs/file-system/src/lib.rs:438][E: codex-rs/file-system/src/lib.rs:441]

`read_file_stream` 在 sandbox context 真正需要 platform sandbox 时返回 `Unsupported`，调用者必须使用 bounded/full read path。Metadata sharing 只覆盖同一 URI、sandbox context 缺省且尚未完成的 RPC；只要 context 存在就永远 fresh（即使它最终不要求 platform sandbox），完成后 entry 立即删除，write/create 等 mutation 也会清空 map。[E: codex-rs/exec-server/src/remote_file_system.rs:102][E: codex-rs/exec-server/src/remote_file_system.rs:107][E: codex-rs/exec-server/src/remote_file_system.rs:119][E: codex-rs/exec-server/src/remote_file_system.rs:135][E: codex-rs/exec-server/src/remote_file_system.rs:162][E: codex-rs/exec-server/src/remote_file_system.rs:167][E: codex-rs/exec-server/src/remote_file_system.rs:171][E: codex-rs/exec-server/src/remote_file_system.rs:188]

Capability discovery request 逐 root 携带 sandbox context，metadata、walk 和 manifest read 复用它；Windows 上请求需要 sandbox 而 restricted-token backend disabled 时明确返回 unavailable。Caller cache identity 同时包含 selected root 与 sandbox，避免跨权限上下文复用结果。[E: codex-rs/exec-server/src/capability_discovery.rs:63][E: codex-rs/exec-server/src/capability_discovery.rs:79][E: codex-rs/exec-server/src/capability_discovery.rs:89][E: codex-rs/exec-server/src/capability_discovery.rs:104][E: codex-rs/exec-server/src/capability_discovery.rs:160][E: codex-rs/exec-server/src/capability_discovery_cache.rs:60][E: codex-rs/exec-server/src/capability_discovery_cache.rs:69][E: codex-rs/exec-server/src/capability_discovery_cache.rs:96]

## gotcha

- A sandbox context for another host intentionally selects sandboxed execution when its `ExecPermissionProfile` cannot be converted to host paths; that branch prevents falling back to an unsandboxed local filesystem by accident.[E: codex-rs/file-system/src/lib.rs:190][E: codex-rs/file-system/src/lib.rs:310][E: codex-rs/file-system/src/lib.rs:396][E: codex-rs/file-system/src/lib.rs:398]
- `drop_cwd_if_unused` may erase both `cwd` and `workspace_roots`; callers that depend on relative glob patterns or project roots must keep those permissions represented before calling it.[E: codex-rs/file-system/src/lib.rs:417][E: codex-rs/file-system/src/lib.rs:438][E: codex-rs/file-system/src/lib.rs:440][E: codex-rs/file-system/src/lib.rs:441]
- Walk response 仍受 entry/directory 上限和 4 MiB response byte cap（含 per-item overhead）约束，但执行逻辑在 `exec-server` 的 local/sandboxed/remote backend，不再在 `file-system` trait 默认方法里。[E: codex-rs/file-system/src/lib.rs:43][E: codex-rs/file-system/src/lib.rs:45][E: codex-rs/exec-server/src/local_file_system.rs:1130]

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
