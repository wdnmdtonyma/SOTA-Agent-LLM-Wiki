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
  - packages/agent/src/harness/types.ts
symbols:
  - NodeExecutionEnv
  - TextLineReader
  - openTextLineReader
  - truncateHead
  - truncateTail
related:
  - subsys.coding-agent.bash-executor
  - ref.agent.error-codes
evidence: explicit
status: verified
updated: bbb61e34aa
---

> `subsys.agent-core.exec-env` 描述 `pi-agent-core` 的本地 Node execution environment：`NodeExecutionEnv` 实现 shell/process 执行与文件系统 API；`openTextLineReader` / `NodeTextLineReader` 提供严格 LF、带 `terminated` 的拉式读行；`truncateHead()` / `truncateTail()` 提供 harness 层可复用的输出裁剪语义。

## 能回答的问题

- `NodeExecutionEnv` 怎样解析 cwd、shellPath、shell env 和 relative path?
- `exec()` 怎样选择 bash/sh、传 command、处理 timeout、abort，以及输出怎样离开进程？
- `TextLineReader` / `openTextLineReader` 的 LF 与 `terminated` 语义是什么，`readTextLines` 怎么用它？
- 文件 API 覆盖哪些读写、目录、metadata、canonical path、temp path 能力?
- `FileError` / `ExecutionError` 在 Node 实现里怎样构造和返回?
- `truncateHead()` 和 `truncateTail()` 的默认 line/byte limit 与 edge case 是什么?
- 本节点与 `subsys.coding-agent.bash-executor` 的边界在哪里?

## 职责边界

`NodeExecutionEnv` 是 `packages/agent` 中以 Node APIs 落地的 execution environment：从 `../types.ts` 引入 `ExecutionEnv`、`ExecutionError`、`FileError`、`TextLine` / `TextLineReader`、`Result` helper，并由 `NodeExecutionEnv implements ExecutionEnv` 绑定到本地实现。[E: packages/agent/src/harness/env/nodejs.ts:23] [E: packages/agent/src/harness/env/nodejs.ts:34] [E: packages/agent/src/harness/env/nodejs.ts:438]

`NodeExecutionEnv` 的构造参数只保存 `cwd`、可选 `shellPath` 和可选 `shellEnv`；`packages/agent/src/node.ts` 是 Node-facing public export，重新导出 `NodeExecutionEnv` 并透传 package index。[E: packages/agent/src/harness/env/nodejs.ts:444] [E: packages/agent/src/node.ts:1] [E: packages/agent/src/node.ts:2]

`FileSystem.openTextLineReader` 是契约方法；Node 实现返回 `NodeTextLineReader`（文件内私有 class，不从 `node.ts` 再导出）。[E: packages/agent/src/harness/types.ts:286] [E: packages/agent/src/harness/env/nodejs.ts:374] [E: packages/agent/src/harness/env/nodejs.ts:699]

本节点只覆盖 `packages/agent` harness 层的 Node execution env 和 truncation helpers。`exec(command, options)` 接收 shell command string 并 spawn；完成结果是 `ShellExecResult`（`exitCode` + truncation metadata），正文经 `capture` / `onUpdate` 离开，而不是返回 stdout/stderr 字符串。coding-agent 的 tool schema、argv helper、UI 和 product-level bash policy 不在本节点范围内。[E: packages/agent/src/harness/env/nodejs.ts:458] [E: packages/agent/src/harness/types.ts:374] [E: packages/agent/src/harness/env/nodejs.ts:686]

## 关键文件

- `packages/agent/src/harness/env/nodejs.ts`：`NodeExecutionEnv`、`NodeTextLineReader`、path helpers、Node errno 到 `FileError` 的映射、shell discovery、process tree kill、file/process API。[E: packages/agent/src/harness/env/nodejs.ts:59] [E: packages/agent/src/harness/env/nodejs.ts:105] [E: packages/agent/src/harness/env/nodejs.ts:206] [E: packages/agent/src/harness/env/nodejs.ts:374] [E: packages/agent/src/harness/env/nodejs.ts:438]
- `packages/agent/src/harness/types.ts`：`TextLine`、`TextLineReader`、`FileSystem.openTextLineReader`、`ShellExecResult`。[E: packages/agent/src/harness/types.ts:253] [E: packages/agent/src/harness/types.ts:260] [E: packages/agent/src/harness/types.ts:286]
- `packages/agent/src/node.ts`：Node-facing public export，重新导出 `NodeExecutionEnv` 并导出 package index。[E: packages/agent/src/node.ts:1] [E: packages/agent/src/node.ts:2]
- `packages/agent/src/harness/utils/truncate.ts`：harness 层 truncation constants、`TruncationResult`、UTF-8 byte counting、`truncateHead()` 和 `truncateTail()`。[E: packages/agent/src/harness/utils/truncate.ts:11] [E: packages/agent/src/harness/utils/truncate.ts:15] [E: packages/agent/src/harness/utils/truncate.ts:132] [E: packages/agent/src/harness/utils/truncate.ts:222]

## 数据模型

`fileInfoFromStats(path, stats)` 返回的 `FileInfo` payload 包含 `name`、`path`、`kind`、`size` 和 `mtimeMs`；`kind` 只由 `isFile()`、`isDirectory()`、`isSymbolicLink()` 映射为 `"file"`、`"directory"`、`"symlink"`，其它类型返回 `FileError("invalid", ...)`。[E: packages/agent/src/harness/env/nodejs.ts:86] [E: packages/agent/src/harness/env/nodejs.ts:91] [E: packages/agent/src/harness/env/nodejs.ts:92]

`toFileError()` 将 Node errno 映射为 stable file error code：`ABORT_ERR` -> `aborted`，`ENOENT` -> `not_found`，`EACCES`/`EPERM` -> `permission_denied`，`ENOTDIR` -> `not_directory`，`EISDIR` -> `is_directory`，`EINVAL` -> `invalid`，otherwise `unknown`。[E: packages/agent/src/harness/env/nodejs.ts:105] [E: packages/agent/src/harness/env/nodejs.ts:115] [E: packages/agent/src/harness/env/nodejs.ts:128]

`TextLine` 是 `{ text, terminated }`：`terminated` 表示该行是否以 `\n` 结束，调用方用它丢掉 torn 末记录。[E: packages/agent/src/harness/types.ts:253] [E: packages/agent/src/harness/types.ts:256]

`TruncationResult` 带返回 content、truncation flag、winning limit、original/output line 与 byte counts、`lastLinePartial` / `firstLineExceedsLimit`，以及实际套用的 `maxLines` / `maxBytes`。[E: packages/agent/src/harness/utils/truncate.ts:15] [E: packages/agent/src/harness/utils/truncate.ts:31] [E: packages/agent/src/harness/utils/truncate.ts:33]

## TextLineReader

`TextLineReader` 是 pull-based UTF-8 读行：`readLine` 返回 `Result<TextLine | undefined, FileError>`，`close` 必须 best-effort 且不得 throw/reject。[E: packages/agent/src/harness/types.ts:261] [E: packages/agent/src/harness/types.ts:263]

`NodeTextLineReader` 自己扫 buffer 里的 `\n`，不用 Node `readline`（后者不报告末行是否换行终止）。读到 `\n` 则 `terminated: true` 并丢掉换行符本身；EOF 时若 buffer 非空则返回 `terminated: false`；EOF 且 buffer 空则 `undefined`。[E: packages/agent/src/harness/env/nodejs.ts:374] [E: packages/agent/src/harness/env/nodejs.ts:396] [E: packages/agent/src/harness/env/nodejs.ts:402] [E: packages/agent/src/harness/env/nodejs.ts:406]

已 close 的 reader 再 `readLine` 返回 `FileError("invalid", "Text line reader is closed")`。`close` 吞掉 `file.close()` 异常。[E: packages/agent/src/harness/env/nodejs.ts:392] [E: packages/agent/src/harness/env/nodejs.ts:426]

`openTextLineReader` 相对 cwd resolve 路径，尊重 abort，`fsPromises.open(..., "r")` 后若已 abort 则关掉 fd 再返回 aborted。[E: packages/agent/src/harness/env/nodejs.ts:699] [E: packages/agent/src/harness/env/nodejs.ts:704] [E: packages/agent/src/harness/env/nodejs.ts:706]

`readTextLines()` 改走 `openTextLineReader`：`maxLines <= 0` 直接 `ok([])`；循环 `readLine`，把 `line.text` 推进数组（**不**看 `terminated`），`finally` close reader。[E: packages/agent/src/harness/env/nodejs.ts:728] [E: packages/agent/src/harness/env/nodejs.ts:734] [E: packages/agent/src/harness/env/nodejs.ts:742]

JSONL fork / header 读则会在 `!line.terminated` 时当 EOF，与 `readTextLines` 保留 torn 末行不同。那条语义在 [subsys.agent-core.jsonl-storage](jsonl-storage.md)。[I]

## Process API

`getShellConfig()` first honors a custom shell path if it exists, returns `ExecutionError("shell_unavailable", ...)` if that custom path is missing, then on Windows checks Git Bash install paths and `bash.exe` on PATH, while non-Windows prefers `/bin/bash`, then PATH bash, then falls back to `sh -c`。[E: packages/agent/src/harness/env/nodejs.ts:204] [E: packages/agent/src/harness/env/nodejs.ts:211] [E: packages/agent/src/harness/env/nodejs.ts:211] [E: packages/agent/src/harness/env/nodejs.ts:238] [E: packages/agent/src/harness/env/nodejs.ts:245]

Legacy WSL `bash.exe` paths are detected with a Windows path regexp and run with command transport over stdin；other bash paths use `-c` argv transport。[E: packages/agent/src/harness/env/nodejs.ts:197] [E: packages/agent/src/harness/env/nodejs.ts:201]

`exec(command, options)` resolves `options.cwd` relative to environment cwd, obtains shell config, spawns the shell with process-group detaching on non-Windows, and sets spawn `env` via `getShellEnv(this.shellEnv, options?.env, options?.inheritEnv)`：when `inheritEnv` is true (default) it merges `process.env`, constructor `shellEnv`, then per-call `options.env`；when `inheritEnv` is false it returns only `{ ...extraEnv }`，omitting `process.env` and `shellEnv`。stdin is wired only for stdin transport。[E: packages/agent/src/harness/env/nodejs.ts:458] [E: packages/agent/src/harness/env/nodejs.ts:469] [E: packages/agent/src/harness/env/nodejs.ts:248] [E: packages/agent/src/harness/env/nodejs.ts:253] [E: packages/agent/src/harness/env/nodejs.ts:598]

`exec()` treats `options.timeout` as seconds：`resolveTimeoutMs` 乘 1000，超时后 `killProcessTree`，close 时返回 `ExecutionError("timeout", "timeout:N")`。[E: packages/agent/src/harness/env/nodejs.ts:52] [E: packages/agent/src/harness/env/nodejs.ts:615] [E: packages/agent/src/harness/env/nodejs.ts:669]

Abort and capture errors both terminate the child tree：abort listeners call `killProcessTree`；`OutputCapture` / `onUpdate` 异常变成 `ExecutionError("callback_error", ...)`；close 时若 abort signal 已置位则 `ExecutionError("aborted", "aborted")`。[E: packages/agent/src/harness/env/nodejs.ts:499] [E: packages/agent/src/harness/env/nodejs.ts:505] [E: packages/agent/src/harness/env/nodejs.ts:672]

stdout/stderr 都喂进同一个 `capture.push`；`ShellExecResult` 只有 `exitCode`、`truncation`、可选 `spillPath` / `lastLineBytes`。正文通过 `options.onUpdate` 增量送达；`capture` 与 `onUpdate` 都缺省时输出被丢弃。[E: packages/agent/src/harness/env/nodejs.ts:646] [E: packages/agent/src/harness/env/nodejs.ts:686] [E: packages/agent/src/harness/types.ts:374] [E: packages/agent/src/harness/types.ts:389]

`killProcessTree()` uses `taskkill /F /T /PID` on Windows, and on non-Windows tries `process.kill(-pid, "SIGKILL")` before falling back to killing the single pid。[E: packages/agent/src/harness/env/nodejs.ts:261] [E: packages/agent/src/harness/env/nodejs.ts:282] [E: packages/agent/src/harness/env/nodejs.ts:285]

## File API

Path helpers are syntactic unless explicitly canonicalized：`absolutePath()` resolves relative paths against `cwd`（含 `~` / `file://`），`joinPath()` delegates to `path.join`，`canonicalPath()` calls `realpath()` on the resolved path。[E: packages/agent/src/harness/env/nodejs.ts:59] [E: packages/agent/src/harness/env/nodejs.ts:450] [E: packages/agent/src/harness/env/nodejs.ts:454] [E: packages/agent/src/harness/env/nodejs.ts:844]

Text and binary reads resolve the requested path against `cwd`, check for an already-aborted signal before touching the filesystem, pass the abort signal to Node read APIs, and convert thrown errors through `toFileError()`。[E: packages/agent/src/harness/env/nodejs.ts:716] [E: packages/agent/src/harness/env/nodejs.ts:750] [E: packages/agent/src/harness/env/nodejs.ts:722]

Writes and appends auto-create parent directories before writing；`writeFile()` 与 `appendFile()` 都在 mkdir 前后检查 abort（append 在 `appendFile` 之后再查一次）。[E: packages/agent/src/harness/env/nodejs.ts:762] [E: packages/agent/src/harness/env/nodejs.ts:769] [E: packages/agent/src/harness/env/nodejs.ts:778] [E: packages/agent/src/harness/env/nodejs.ts:788]

Metadata and directory APIs use `lstat()` rather than following symlinks：`fileInfo()` wraps `lstat`，`listDir()` uses `readdir(..., { withFileTypes: true })`，then lstat per child and returns supported file/directory/symlink entries。[E: packages/agent/src/harness/env/nodejs.ts:808] [E: packages/agent/src/harness/env/nodejs.ts:813] [E: packages/agent/src/harness/env/nodejs.ts:825] [E: packages/agent/src/harness/env/nodejs.ts:832]

`exists()` reports missing paths as `ok(false)` but propagates other file errors；`createDir()` defaults to recursive mkdir，`remove()` defaults to non-recursive and non-force rm，`createTempDir()` uses `mkdtemp(join(tmpdir(), prefix))`，`createTempFile()` creates an empty randomUUID-named file inside a temp dir。[E: packages/agent/src/harness/env/nodejs.ts:855] [E: packages/agent/src/harness/env/nodejs.ts:858] [E: packages/agent/src/harness/env/nodejs.ts:871] [E: packages/agent/src/harness/env/nodejs.ts:887] [E: packages/agent/src/harness/env/nodejs.ts:899] [E: packages/agent/src/harness/env/nodejs.ts:911]

## Truncate Helpers

The default truncation policy is 2000 lines or 50KB, whichever is hit first；both `truncateHead()` and `truncateTail()` read `options.maxLines ?? DEFAULT_MAX_LINES` and `options.maxBytes ?? DEFAULT_MAX_BYTES`。[E: packages/agent/src/harness/utils/truncate.ts:11] [E: packages/agent/src/harness/utils/truncate.ts:12] [E: packages/agent/src/harness/utils/truncate.ts:133] [E: packages/agent/src/harness/utils/truncate.ts:223]

`truncateHead(content, options)` keeps the beginning of content. It returns the input unchanged when both limits fit, returns empty content with `firstLineExceedsLimit=true` when the first line alone exceeds the byte cap, otherwise accumulates complete lines from the start until maxLines or maxBytes stops it。[E: packages/agent/src/harness/utils/truncate.ts:132] [E: packages/agent/src/harness/utils/truncate.ts:141]

`truncateTail(content, options)` keeps the end of content. Both it and `truncateHead()` split via `splitLinesForCounting()`, which pops one trailing empty line when `content.endsWith("\n")`. Tail accumulation walks backward from the end；if the first candidate line itself exceeds the byte cap it keeps a suffix of that line and marks `lastLinePartial=true`。[E: packages/agent/src/harness/utils/truncate.ts:222] [E: packages/agent/src/harness/utils/truncate.ts:82] [E: packages/agent/src/harness/utils/truncate.ts:85]

UTF-8 byte accounting prefers `Buffer.byteLength` when `globalThis.Buffer` exists；otherwise it manually counts ASCII, two-byte characters, BMP three-byte characters, surrogate pairs as four bytes, and unpaired surrogates as three bytes。[E: packages/agent/src/harness/utils/truncate.ts:54] [E: packages/agent/src/harness/utils/truncate.ts:55] [E: packages/agent/src/harness/utils/truncate.ts:67]

## Coding-Agent Bash-Executor Boundary

Agent-core `exec()` 返回 `ShellExecResult`（exitCode + truncation metadata），并把可选 `onUpdate` 接到 `OutputCapture`。本 source set 不定义产品级 `bash` tool UI/schema 或 coding-agent bash executor policy，那些由 `subsys.coding-agent.bash-executor` 拥有。[E: packages/agent/src/harness/env/nodejs.ts:458] [E: packages/agent/src/harness/env/nodejs.ts:510] [E: packages/agent/src/harness/types.ts:374]

The only public Node boundary in this source set is `NodeExecutionEnv` exported from `packages/agent/src/node.ts`；`truncateHead()` / `truncateTail()` 由 utility module 导出，但不从 `node.ts` 再导出。`NodeTextLineReader` 同样不公开。[E: packages/agent/src/node.ts:1] [E: packages/agent/src/harness/utils/truncate.ts:132] [E: packages/agent/src/harness/env/nodejs.ts:374]

## Gotcha

- `NodeExecutionEnv.exec()` does not throw on nonzero exit；it returns `ok({ exitCode, truncation, ... })`，so callers decide whether a nonzero exit is an error。没有 exit code 时：有 signal 则 `128 + (osConstants.signals[signal] ?? 0)`，否则 1。[E: packages/agent/src/harness/env/nodejs.ts:684] [E: packages/agent/src/harness/env/nodejs.ts:686]
- `cleanup()` iterates `activeChildPids`, calls `killProcessTree` for each pid, then clears the set。[E: packages/agent/src/harness/env/nodejs.ts:920] [E: packages/agent/src/harness/env/nodejs.ts:921] [E: packages/agent/src/harness/env/nodejs.ts:922]
- `truncateHead()` and `truncateTail()` share `splitLinesForCounting()`, so a trailing newline does not produce a counted empty split line for either function。[E: packages/agent/src/harness/utils/truncate.ts:82] [E: packages/agent/src/harness/utils/truncate.ts:85]
- `createTempFile(options)` currently accepts only prefix/suffix at the implementation signature and does not read an abort signal field before `writeFile`（`createTempDir` 会看 abort）。[E: packages/agent/src/harness/env/nodejs.ts:905] [E: packages/agent/src/harness/env/nodejs.ts:913]
- `readTextLines` 会把 unterminated 末行收进字符串数组；需要丢掉 torn tail 的调用方必须自己用 `openTextLineReader` 看 `terminated`。[E: packages/agent/src/harness/env/nodejs.ts:742] [E: packages/agent/src/harness/types.ts:256]

## Sources

- packages/agent/src/harness/env/nodejs.ts
- packages/agent/src/node.ts
- packages/agent/src/harness/utils/truncate.ts
- packages/agent/src/harness/types.ts

## 相关

- [subsys.coding-agent.bash-executor](../coding-agent/bash-executor.md)：pi-coding-agent direct bash helper 与 extension argv helper；本节点只定义 agent-core execution env 边界。
- [ref.agent.error-codes](../../reference/error-codes.md)：`FileErrorCode`、`ExecutionErrorCode` 以及 `TextLineReader` 失败如何编码进 `FileError`。
