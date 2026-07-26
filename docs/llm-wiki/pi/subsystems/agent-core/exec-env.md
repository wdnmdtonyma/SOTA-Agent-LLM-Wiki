---
id: subsys.agent-core.exec-env
title: 执行环境抽象(Node)
kind: subsystem
tier: T2
pkg: agent
source:
  - packages/agent/src/harness/env/nodejs.ts
  - packages/agent/src/node.ts
  - packages/agent/src/harness/utils/truncate.ts
symbols:
  - NodeExecutionEnv
  - truncateHead
  - truncateTail
related:
  - subsys.coding-agent.bash-executor
  - ref.agent.error-codes
evidence: explicit
status: verified
updated: cee5ff7520
---

> `subsys.agent-core.exec-env` 描述 `pi-agent-core` 的本地 Node execution environment: `NodeExecutionEnv` 实现 shell/process 执行与文件系统 API, `truncateHead()` / `truncateTail()` 提供 harness 层可复用的输出裁剪语义。

## 能回答的问题

- `NodeExecutionEnv` 怎样解析 cwd、shellPath、shell env 和 relative path?
- `exec()` 怎样选择 bash/sh、传 command、处理 timeout、abort、stdout/stderr callback?
- 文件 API 覆盖哪些读写、目录、metadata、canonical path、temp path 能力?
- `FileError` / `ExecutionError` 在 Node 实现里怎样构造和返回?
- `truncateHead()` 和 `truncateTail()` 的默认 line/byte limit 与 edge case 是什么?
- 本节点与 `subsys.coding-agent.bash-executor` 的边界在哪里?

## 职责边界

`NodeExecutionEnv` 是 `packages/agent` 中以 Node APIs 落地的 execution environment: 源码将 `ExecutionEnv` 类型、`ExecutionError`、`FileError`、`Result` helper 从 `../types.ts` 引入, 并由 `NodeExecutionEnv implements ExecutionEnv` 绑定到本地实现 [E: packages/agent/src/harness/env/nodejs.ts:21] [E: packages/agent/src/harness/env/nodejs.ts:22] [E: packages/agent/src/harness/env/nodejs.ts:24] [E: packages/agent/src/harness/env/nodejs.ts:28] [E: packages/agent/src/harness/env/nodejs.ts:344]。

`NodeExecutionEnv` 的构造参数只保存 `cwd`、可选 `shellPath` 和可选 `shellEnv`; `packages/agent/src/node.ts` 是 Node-facing public export, 重新导出 `NodeExecutionEnv` 并透传 package index [E: packages/agent/src/harness/env/nodejs.ts:350] [E: packages/agent/src/harness/env/nodejs.ts:351] [E: packages/agent/src/harness/env/nodejs.ts:352] [E: packages/agent/src/harness/env/nodejs.ts:353] [E: packages/agent/src/node.ts:1] [E: packages/agent/src/node.ts:2]。

本节点只覆盖 `packages/agent` harness 层的 Node execution env 和 truncation helpers。能从本轮 source 直接证明的是 agent-core 的 `exec(command, options)` 接收 shell command string, spawn 后返回 stdout、stderr 和 exitCode; coding-agent 的 tool schema、argv helper、UI 和 product-level bash policy 不在本节点 source 范围内 [E: packages/agent/src/harness/env/nodejs.ts:364] [E: packages/agent/src/harness/env/nodejs.ts:367] [E: packages/agent/src/harness/env/nodejs.ts:415] [E: packages/agent/src/harness/env/nodejs.ts:417] [E: packages/agent/src/harness/env/nodejs.ts:492]。

## 关键文件

- `packages/agent/src/harness/env/nodejs.ts`: `NodeExecutionEnv`、path helpers、Node errno 到 `FileError` 的映射、shell discovery、process tree kill、file/process API 的本地实现 [E: packages/agent/src/harness/env/nodejs.ts:50] [E: packages/agent/src/harness/env/nodejs.ts:96] [E: packages/agent/src/harness/env/nodejs.ts:193] [E: packages/agent/src/harness/env/nodejs.ts:250] [E: packages/agent/src/harness/env/nodejs.ts:344]。
- `packages/agent/src/node.ts`: Node-facing public export, 重新导出 `NodeExecutionEnv` 并导出 package index [E: packages/agent/src/node.ts:1] [E: packages/agent/src/node.ts:2]。
- `packages/agent/src/harness/utils/truncate.ts`: harness 层 truncation constants、`TruncationResult`、UTF-8 byte counting、`truncateHead()` 和 `truncateTail()` [E: packages/agent/src/harness/utils/truncate.ts:11] [E: packages/agent/src/harness/utils/truncate.ts:12] [E: packages/agent/src/harness/utils/truncate.ts:15] [E: packages/agent/src/harness/utils/truncate.ts:54] [E: packages/agent/src/harness/utils/truncate.ts:132] [E: packages/agent/src/harness/utils/truncate.ts:222]。

## 数据模型

`fileInfoFromStats(path, stats)` 返回的 `FileInfo` payload 包含 `name`、`path`、`kind`、`size` 和 `mtimeMs`; `kind` 只由 `isFile()`、`isDirectory()`、`isSymbolicLink()` 映射为 `"file"`、`"directory"`、`"symlink"`, 其它类型返回 `FileError("invalid", ...)` [E: packages/agent/src/harness/env/nodejs.ts:66] [E: packages/agent/src/harness/env/nodejs.ts:71] [E: packages/agent/src/harness/env/nodejs.ts:72] [E: packages/agent/src/harness/env/nodejs.ts:73] [E: packages/agent/src/harness/env/nodejs.ts:81] [E: packages/agent/src/harness/env/nodejs.ts:82] [E: packages/agent/src/harness/env/nodejs.ts:83] [E: packages/agent/src/harness/env/nodejs.ts:88]。

`toFileError()` 将 Node errno 映射为 stable file error code: `ABORT_ERR` -> `aborted`, `ENOENT` -> `not_found`, `EACCES`/`EPERM` -> `permission_denied`, `ENOTDIR` -> `not_directory`, `EISDIR` -> `is_directory`, `EINVAL` -> `invalid`, otherwise `unknown` [E: packages/agent/src/harness/env/nodejs.ts:96] [E: packages/agent/src/harness/env/nodejs.ts:101] [E: packages/agent/src/harness/env/nodejs.ts:102] [E: packages/agent/src/harness/env/nodejs.ts:104] [E: packages/agent/src/harness/env/nodejs.ts:106] [E: packages/agent/src/harness/env/nodejs.ts:107] [E: packages/agent/src/harness/env/nodejs.ts:109] [E: packages/agent/src/harness/env/nodejs.ts:111] [E: packages/agent/src/harness/env/nodejs.ts:113] [E: packages/agent/src/harness/env/nodejs.ts:117]。

`TruncationResult` carries the returned content, truncation flag, winning limit, original/output line and byte counts, the `lastLinePartial` and `firstLineExceedsLimit` edge flags, and the applied `maxLines` / `maxBytes` values [E: packages/agent/src/harness/utils/truncate.ts:15] [E: packages/agent/src/harness/utils/truncate.ts:17] [E: packages/agent/src/harness/utils/truncate.ts:19] [E: packages/agent/src/harness/utils/truncate.ts:21] [E: packages/agent/src/harness/utils/truncate.ts:23] [E: packages/agent/src/harness/utils/truncate.ts:25] [E: packages/agent/src/harness/utils/truncate.ts:27] [E: packages/agent/src/harness/utils/truncate.ts:29] [E: packages/agent/src/harness/utils/truncate.ts:31] [E: packages/agent/src/harness/utils/truncate.ts:33] [E: packages/agent/src/harness/utils/truncate.ts:35] [E: packages/agent/src/harness/utils/truncate.ts:37]。

## Process API

`getShellConfig()` first honors a custom shell path if it exists, returns `ExecutionError("shell_unavailable", ...)` if that custom path is missing, then on Windows checks Git Bash install paths and `bash.exe` on PATH, while non-Windows prefers `/bin/bash`, then PATH bash, then falls back to `sh -c` [E: packages/agent/src/harness/env/nodejs.ts:193] [E: packages/agent/src/harness/env/nodejs.ts:194] [E: packages/agent/src/harness/env/nodejs.ts:195] [E: packages/agent/src/harness/env/nodejs.ts:198] [E: packages/agent/src/harness/env/nodejs.ts:200] [E: packages/agent/src/harness/env/nodejs.ts:203] [E: packages/agent/src/harness/env/nodejs.ts:205] [E: packages/agent/src/harness/env/nodejs.ts:211] [E: packages/agent/src/harness/env/nodejs.ts:218] [E: packages/agent/src/harness/env/nodejs.ts:227] [E: packages/agent/src/harness/env/nodejs.ts:230] [E: packages/agent/src/harness/env/nodejs.ts:234]。

Legacy WSL `bash.exe` paths are detected with a Windows path regexp and run with command transport over stdin; other bash paths use `-c` argv transport [E: packages/agent/src/harness/env/nodejs.ts:184] [E: packages/agent/src/harness/env/nodejs.ts:185] [E: packages/agent/src/harness/env/nodejs.ts:186] [E: packages/agent/src/harness/env/nodejs.ts:189] [E: packages/agent/src/harness/env/nodejs.ts:190]。

`exec(command, options)` resolves `options.cwd` relative to environment cwd, obtains shell config, spawns the shell with process-group detaching on non-Windows, merges environment as `process.env`, constructor `shellEnv`, then per-call `options.env`, and wires stdin only for stdin transport [E: packages/agent/src/harness/env/nodejs.ts:364] [E: packages/agent/src/harness/env/nodejs.ts:371] [E: packages/agent/src/harness/env/nodejs.ts:373] [E: packages/agent/src/harness/env/nodejs.ts:374] [E: packages/agent/src/harness/env/nodejs.ts:415] [E: packages/agent/src/harness/env/nodejs.ts:417] [E: packages/agent/src/harness/env/nodejs.ts:419] [E: packages/agent/src/harness/env/nodejs.ts:420] [E: packages/agent/src/harness/env/nodejs.ts:421] [E: packages/agent/src/harness/env/nodejs.ts:422] [E: packages/agent/src/harness/env/nodejs.ts:427] [E: packages/agent/src/harness/env/nodejs.ts:429]。

`exec()` treats `options.timeout` as seconds in this implementation: it multiplies the value by 1000 for `setTimeout`, kills the child tree, then returns `ExecutionError("timeout", "timeout:N")` on close [E: packages/agent/src/harness/env/nodejs.ts:437] [E: packages/agent/src/harness/env/nodejs.ts:438] [E: packages/agent/src/harness/env/nodejs.ts:440] [E: packages/agent/src/harness/env/nodejs.ts:442] [E: packages/agent/src/harness/env/nodejs.ts:444] [E: packages/agent/src/harness/env/nodejs.ts:484] [E: packages/agent/src/harness/env/nodejs.ts:485]。

Abort and callback errors both terminate the child tree: abort listeners call `killProcessTree`, stdout/stderr callback exceptions become `ExecutionError("callback_error", ...)`, and close handling returns `ExecutionError("aborted", "aborted")` if the abort signal is set [E: packages/agent/src/harness/env/nodejs.ts:398] [E: packages/agent/src/harness/env/nodejs.ts:400] [E: packages/agent/src/harness/env/nodejs.ts:447] [E: packages/agent/src/harness/env/nodejs.ts:451] [E: packages/agent/src/harness/env/nodejs.ts:457] [E: packages/agent/src/harness/env/nodejs.ts:460] [E: packages/agent/src/harness/env/nodejs.ts:463] [E: packages/agent/src/harness/env/nodejs.ts:464] [E: packages/agent/src/harness/env/nodejs.ts:467] [E: packages/agent/src/harness/env/nodejs.ts:470] [E: packages/agent/src/harness/env/nodejs.ts:473] [E: packages/agent/src/harness/env/nodejs.ts:474] [E: packages/agent/src/harness/env/nodejs.ts:488] [E: packages/agent/src/harness/env/nodejs.ts:489]。

`killProcessTree()` uses `taskkill /F /T /PID` on Windows, and on non-Windows tries `process.kill(-pid, "SIGKILL")` before falling back to killing the single pid [E: packages/agent/src/harness/env/nodejs.ts:250] [E: packages/agent/src/harness/env/nodejs.ts:251] [E: packages/agent/src/harness/env/nodejs.ts:253] [E: packages/agent/src/harness/env/nodejs.ts:264] [E: packages/agent/src/harness/env/nodejs.ts:265] [E: packages/agent/src/harness/env/nodejs.ts:268]。

## File API

Path helpers are syntactic unless explicitly canonicalized: `absolutePath()` resolves relative paths against `cwd`, `joinPath()` delegates to `path.join`, and `canonicalPath()` calls `realpath()` on the resolved path [E: packages/agent/src/harness/env/nodejs.ts:50] [E: packages/agent/src/harness/env/nodejs.ts:356] [E: packages/agent/src/harness/env/nodejs.ts:357] [E: packages/agent/src/harness/env/nodejs.ts:360] [E: packages/agent/src/harness/env/nodejs.ts:361] [E: packages/agent/src/harness/env/nodejs.ts:615] [E: packages/agent/src/harness/env/nodejs.ts:618]。

Text and binary reads resolve the requested path against `cwd`, check for an already-aborted signal before touching the filesystem, pass the abort signal to Node read APIs, and convert thrown errors through `toFileError()` [E: packages/agent/src/harness/env/nodejs.ts:499] [E: packages/agent/src/harness/env/nodejs.ts:500] [E: packages/agent/src/harness/env/nodejs.ts:501] [E: packages/agent/src/harness/env/nodejs.ts:504] [E: packages/agent/src/harness/env/nodejs.ts:506] [E: packages/agent/src/harness/env/nodejs.ts:541] [E: packages/agent/src/harness/env/nodejs.ts:543] [E: packages/agent/src/harness/env/nodejs.ts:546] [E: packages/agent/src/harness/env/nodejs.ts:548]。

`readTextLines()` streams UTF-8 through `createReadStream()` and `readline.createInterface()`, returns early for `maxLines <= 0`, checks abort during iteration, stops after `maxLines`, then closes the line reader and destroys the stream in `finally` [E: packages/agent/src/harness/env/nodejs.ts:510] [E: packages/agent/src/harness/env/nodejs.ts:517] [E: packages/agent/src/harness/env/nodejs.ts:521] [E: packages/agent/src/harness/env/nodejs.ts:522] [E: packages/agent/src/harness/env/nodejs.ts:524] [E: packages/agent/src/harness/env/nodejs.ts:525] [E: packages/agent/src/harness/env/nodejs.ts:527] [E: packages/agent/src/harness/env/nodejs.ts:528] [E: packages/agent/src/harness/env/nodejs.ts:536] [E: packages/agent/src/harness/env/nodejs.ts:537]。

Writes and appends auto-create parent directories before writing; `writeFile()` supports abort checks before and after mkdir, while `appendFile()` has no abort-signal parameter in this implementation [E: packages/agent/src/harness/env/nodejs.ts:552] [E: packages/agent/src/harness/env/nodejs.ts:555] [E: packages/agent/src/harness/env/nodejs.ts:557] [E: packages/agent/src/harness/env/nodejs.ts:558] [E: packages/agent/src/harness/env/nodejs.ts:561] [E: packages/agent/src/harness/env/nodejs.ts:562] [E: packages/agent/src/harness/env/nodejs.ts:564] [E: packages/agent/src/harness/env/nodejs.ts:571] [E: packages/agent/src/harness/env/nodejs.ts:574] [E: packages/agent/src/harness/env/nodejs.ts:575]。

Metadata and directory APIs use `lstat()` rather than following symlinks: `fileInfo()` wraps `lstat`, `listDir()` uses `readdir(..., { withFileTypes: true })`, then lstat per child and returns supported file/directory/symlink entries [E: packages/agent/src/harness/env/nodejs.ts:66] [E: packages/agent/src/harness/env/nodejs.ts:71] [E: packages/agent/src/harness/env/nodejs.ts:73] [E: packages/agent/src/harness/env/nodejs.ts:77] [E: packages/agent/src/harness/env/nodejs.ts:81] [E: packages/agent/src/harness/env/nodejs.ts:82] [E: packages/agent/src/harness/env/nodejs.ts:582] [E: packages/agent/src/harness/env/nodejs.ts:585] [E: packages/agent/src/harness/env/nodejs.ts:591] [E: packages/agent/src/harness/env/nodejs.ts:596] [E: packages/agent/src/harness/env/nodejs.ts:603] [E: packages/agent/src/harness/env/nodejs.ts:604]。

`exists()` reports missing paths as `ok(false)` but propagates other file errors; `createDir()` defaults to recursive mkdir, `remove()` defaults to non-recursive and non-force rm, `createTempDir()` uses `mkdtemp(join(tmpdir(), prefix))`, and `createTempFile()` creates an empty randomUUID-named file inside a temp dir [E: packages/agent/src/harness/env/nodejs.ts:624] [E: packages/agent/src/harness/env/nodejs.ts:626] [E: packages/agent/src/harness/env/nodejs.ts:627] [E: packages/agent/src/harness/env/nodejs.ts:631] [E: packages/agent/src/harness/env/nodejs.ts:634] [E: packages/agent/src/harness/env/nodejs.ts:641] [E: packages/agent/src/harness/env/nodejs.ts:644] [E: packages/agent/src/harness/env/nodejs.ts:651] [E: packages/agent/src/harness/env/nodejs.ts:653] [E: packages/agent/src/harness/env/nodejs.ts:659] [E: packages/agent/src/harness/env/nodejs.ts:660] [E: packages/agent/src/harness/env/nodejs.ts:662] [E: packages/agent/src/harness/env/nodejs.ts:664]。

## Truncate Helpers

The default truncation policy is 2000 lines or 50KB, whichever is hit first by the function logic; both `truncateHead()` and `truncateTail()` read `options.maxLines ?? DEFAULT_MAX_LINES` and `options.maxBytes ?? DEFAULT_MAX_BYTES` [E: packages/agent/src/harness/utils/truncate.ts:11] [E: packages/agent/src/harness/utils/truncate.ts:12] [E: packages/agent/src/harness/utils/truncate.ts:133] [E: packages/agent/src/harness/utils/truncate.ts:134] [E: packages/agent/src/harness/utils/truncate.ts:223] [E: packages/agent/src/harness/utils/truncate.ts:224]。

`truncateHead(content, options)` keeps the beginning of content. It returns the input unchanged when both limits fit, returns empty content with `firstLineExceedsLimit=true` when the first line alone exceeds the byte cap, otherwise accumulates complete lines from the start until maxLines or maxBytes stops it [E: packages/agent/src/harness/utils/truncate.ts:132] [E: packages/agent/src/harness/utils/truncate.ts:84] [E: packages/agent/src/harness/utils/truncate.ts:141] [E: packages/agent/src/harness/utils/truncate.ts:143] [E: packages/agent/src/harness/utils/truncate.ts:158] [E: packages/agent/src/harness/utils/truncate.ts:159] [E: packages/agent/src/harness/utils/truncate.ts:161] [E: packages/agent/src/harness/utils/truncate.ts:169] [E: packages/agent/src/harness/utils/truncate.ts:180] [E: packages/agent/src/harness/utils/truncate.ts:184] [E: packages/agent/src/harness/utils/truncate.ts:189] [E: packages/agent/src/harness/utils/truncate.ts:198]。

`truncateTail(content, options)` keeps the end of content. It removes one trailing empty split line when content ends in newline, accumulates lines backward from the end, and if the first candidate line itself exceeds the byte cap it keeps a suffix of that line and marks `lastLinePartial=true` [E: packages/agent/src/harness/utils/truncate.ts:222] [E: packages/agent/src/harness/utils/truncate.ts:84] [E: packages/agent/src/harness/utils/truncate.ts:94] [E: packages/agent/src/harness/utils/truncate.ts:253] [E: packages/agent/src/harness/utils/truncate.ts:257] [E: packages/agent/src/harness/utils/truncate.ts:261] [E: packages/agent/src/harness/utils/truncate.ts:262] [E: packages/agent/src/harness/utils/truncate.ts:265] [E: packages/agent/src/harness/utils/truncate.ts:270] [E: packages/agent/src/harness/utils/truncate.ts:279]。

UTF-8 byte accounting prefers `Buffer.byteLength` when `globalThis.Buffer` exists; otherwise it manually counts ASCII, two-byte characters, BMP three-byte characters, surrogate pairs as four bytes, and unpaired surrogates as three bytes, while tail byte slicing replaces unpaired surrogate output via `replaceUnpairedSurrogates()` [E: packages/agent/src/harness/utils/truncate.ts:51] [E: packages/agent/src/harness/utils/truncate.ts:54] [E: packages/agent/src/harness/utils/truncate.ts:55] [E: packages/agent/src/harness/utils/truncate.ts:57] [E: packages/agent/src/harness/utils/truncate.ts:63] [E: packages/agent/src/harness/utils/truncate.ts:65] [E: packages/agent/src/harness/utils/truncate.ts:67] [E: packages/agent/src/harness/utils/truncate.ts:70] [E: packages/agent/src/harness/utils/truncate.ts:73] [E: packages/agent/src/harness/utils/truncate.ts:76] [E: packages/agent/src/harness/utils/truncate.ts:89] [E: packages/agent/src/harness/utils/truncate.ts:102] [E: packages/agent/src/harness/utils/truncate.ts:301] [E: packages/agent/src/harness/utils/truncate.ts:334] [E: packages/agent/src/harness/utils/truncate.ts:335]。

## Coding-Agent Bash-Executor Boundary

Agent-core `exec()` returns separate stdout/stderr strings and an exit code, and invokes optional stdout/stderr callbacks per stream. This source set does not define the product-level `bash` tool UI/schema or coding-agent bash executor policy, so those details remain owned by `subsys.coding-agent.bash-executor` [E: packages/agent/src/harness/env/nodejs.ts:367] [E: packages/agent/src/harness/env/nodejs.ts:457] [E: packages/agent/src/harness/env/nodejs.ts:467] [E: packages/agent/src/harness/env/nodejs.ts:492]。

The only public Node boundary in this source set is `NodeExecutionEnv` exported from `packages/agent/src/node.ts`; `truncateHead()` and `truncateTail()` are exported by their utility module but not re-exported from `node.ts` in these files [E: packages/agent/src/node.ts:1] [E: packages/agent/src/node.ts:2] [E: packages/agent/src/harness/utils/truncate.ts:132] [E: packages/agent/src/harness/utils/truncate.ts:222]。

## Gotcha

- `NodeExecutionEnv.exec()` does not throw on nonzero exit; it returns `ok({ stdout, stderr, exitCode: code ?? 0 })`, so callers decide whether a nonzero exit is an error [E: packages/agent/src/harness/env/nodejs.ts:479] [E: packages/agent/src/harness/env/nodejs.ts:492]。
- `cleanup()` is a no-op for the local Node implementation [E: packages/agent/src/harness/env/nodejs.ts:671]。
- `truncateHead()` counts a trailing newline as producing a trailing empty split line, while `truncateTail()` explicitly removes one trailing empty split line before counting tail lines [E: packages/agent/src/harness/utils/truncate.ts:84] [E: packages/agent/src/harness/utils/truncate.ts:138] [E: packages/agent/src/harness/utils/truncate.ts:84] [E: packages/agent/src/harness/utils/truncate.ts:94]。
- `createTempFile(options)` currently accepts only prefix/suffix at the implementation signature and does not read an abort signal field in this implementation [E: packages/agent/src/harness/env/nodejs.ts:659] [E: packages/agent/src/harness/env/nodejs.ts:662] [E: packages/agent/src/harness/env/nodejs.ts:664]。

## L2 证伪结论

- Removed all `[E]` citations to files outside the requested source set (`types.ts` and `shell-output.ts`), because the node frontmatter and this verifier batch only authorize `nodejs.ts`, `node.ts`, and `truncate.ts`.
- Tightened interface-contract claims to implementation-visible facts: `NodeExecutionEnv implements ExecutionEnv`, constructor state, process/file behavior, and returned shapes that are directly visible in `nodejs.ts`.
- Tightened coding-agent boundary language: product-level `bash` tool UI/schema and capture policy are explicitly outside this node's source set.
- Line anchors were checked against the three source files and shifted away from comment-only evidence where practical; remaining anchors point to code declarations, branches, calls, or returned payload fields.

## Sources

- packages/agent/src/harness/env/nodejs.ts
- packages/agent/src/node.ts
- packages/agent/src/harness/utils/truncate.ts

## 相关

- [subsys.coding-agent.bash-executor](../coding-agent/bash-executor.md): pi-coding-agent direct bash helper 与 extension argv helper; 本节点只定义 agent-core execution env 边界。
- [ref.agent.error-codes](../../reference/error-codes.md): `FileErrorCode`、`ExecutionErrorCode`、`AgentHarnessErrorCode` 的目录节点。
