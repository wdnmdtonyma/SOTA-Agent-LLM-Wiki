---
id: subsys.coding-agent.bash-executor
title: bash 执行(流式/取消)
kind: subsystem
tier: T2
pkg: coding-agent
source:
  - packages/coding-agent/src/core/bash-executor.ts
  - packages/coding-agent/src/core/exec.ts
symbols:
  - executeBashWithOperations
  - execCommand
  - BashResult
related:
  - surface.tools.bash
  - subsys.coding-agent.output-truncation
  - subsys.agent-core.exec-env
evidence: explicit
status: verified
updated: 5a073885
---

> `bash-executor` 是 pi-coding-agent 的命令执行子系统: `executeBashWithOperations()` 负责 bash 风格命令的流式输出、取消和 tail 截断, `execCommand()` 负责扩展/custom tool runtime 里的 argv 进程执行。

## 能回答的问题

- `executeBashWithOperations()` 返回的 `BashResult` 有哪些字段, 哪些字段表示取消和截断?
- bash 执行如何把 stdout/stderr chunk 流式传给 UI 或 RPC 调用方?
- 大输出什么时候写入 `pi-bash-*.log`, 返回值什么时候带 `fullOutputPath`?
- `AbortSignal` 取消和 `execCommand()` timeout 分别在哪里处理?
- 这个子系统有没有自己分配 PTY, 与模型可见的 `bash` tool 是什么关系?
- `execCommand()` 和 `executeBashWithOperations()` 的职责为什么不合并?

## 职责边界

`packages/coding-agent/src/core/bash-executor.ts` 只定义 direct bash helper: 它接受命令、cwd、可插拔 `BashOperations` 和可选 `onChunk`/`AbortSignal`, 返回 `Promise<BashResult>` [E: packages/coding-agent/src/core/bash-executor.ts:50] [E: packages/coding-agent/src/core/bash-executor.ts:51] [E: packages/coding-agent/src/core/bash-executor.ts:52] [E: packages/coding-agent/src/core/bash-executor.ts:53] [E: packages/coding-agent/src/core/bash-executor.ts:54] [E: packages/coding-agent/src/core/bash-executor.ts:55]。

`packages/coding-agent/src/core/exec.ts` 是另一条更小的 process helper: 它的 `execCommand(command, args, cwd, options)` 通过 `spawn(command, args, { shell: false })` 执行 argv, 收集分离的 stdout/stderr/code/killed, 适合 extension/custom tool API 而不是模型 `bash` tool 的合并流式输出 [E: packages/coding-agent/src/core/exec.ts:34] [E: packages/coding-agent/src/core/exec.ts:41] [E: packages/coding-agent/src/core/exec.ts:43] [E: packages/coding-agent/src/core/exec.ts:82] [E: packages/coding-agent/src/core/exec.ts:86] [E: packages/coding-agent/src/core/exec.ts:97] [I]。

模型可见的 `bash` tool 不在本节点权威覆盖范围内; 本节点只记录它与执行 helper 的边界。`executeBashWithOperations()` 接收 `BashOperations`, 因此 direct bash helper 复用 bash tool 定义的可插拔执行后端契约, 但 `createBashToolDefinition()` 的 schema、renderer 和 tool-call lifecycle 属于 [surface.tools.bash](../../surface/tools/bash.md) [E: packages/coding-agent/src/core/bash-executor.ts:53] [I]。

## 关键文件

- `packages/coding-agent/src/core/bash-executor.ts`: `BashExecutorOptions`、`BashResult` 和 `executeBashWithOperations()` 的权威实现 [E: packages/coding-agent/src/core/bash-executor.ts:22] [E: packages/coding-agent/src/core/bash-executor.ts:29] [E: packages/coding-agent/src/core/bash-executor.ts:50]。
- `packages/coding-agent/src/core/exec.ts`: `ExecOptions`、`ExecResult` 和 `execCommand()` 的权威实现 [E: packages/coding-agent/src/core/exec.ts:11] [E: packages/coding-agent/src/core/exec.ts:23] [E: packages/coding-agent/src/core/exec.ts:34]。
- `packages/coding-agent/src/core/agent-session.ts`: 调用点背景, `AgentSession.executeBash()` 把 settings prefix/shellPath 转成 `executeBashWithOperations()` 调用, 并把结果写成 bash execution history [E: packages/coding-agent/src/core/agent-session.ts:2596] [E: packages/coding-agent/src/core/agent-session.ts:2597] [E: packages/coding-agent/src/core/agent-session.ts:2601] [E: packages/coding-agent/src/core/agent-session.ts:2611]。
- `packages/coding-agent/src/modes/rpc/rpc-mode.ts`: 调用点背景, RPC `"bash"` command 调 `session.executeBash()` 并把 `BashResult` 放进 success response [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:551] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:554]。
- `packages/coding-agent/src/core/extensions/loader.ts`: 调用点背景, extension runtime 的 `exec()` 包装 `execCommand()` [E: packages/coding-agent/src/core/extensions/loader.ts:310] [E: packages/coding-agent/src/core/extensions/loader.ts:312]。

## 数据模型

`BashExecutorOptions` 只有两个字段: `onChunk?: (chunk: string) => void` 用于接收已经 sanitize 的 streaming chunk, `signal?: AbortSignal` 用于取消 [E: packages/coding-agent/src/core/bash-executor.ts:22] [E: packages/coding-agent/src/core/bash-executor.ts:24] [E: packages/coding-agent/src/core/bash-executor.ts:26]。

`BashResult` 是 direct bash helper 的返回模型: `output` 是合并 stdout/stderr 后的 sanitized 文本, `exitCode` 在 killed/cancelled 时可以是 `undefined`, `cancelled` 标记是否由 signal 取消, `truncated` 标记返回 preview 是否被裁剪, `fullOutputPath` 指向超过阈值时写出的完整临时日志 [E: packages/coding-agent/src/core/bash-executor.ts:29] [E: packages/coding-agent/src/core/bash-executor.ts:31] [E: packages/coding-agent/src/core/bash-executor.ts:33] [E: packages/coding-agent/src/core/bash-executor.ts:35] [E: packages/coding-agent/src/core/bash-executor.ts:37] [E: packages/coding-agent/src/core/bash-executor.ts:39]。

`ExecOptions` 是 argv helper 的控制模型: 它支持 `signal`、毫秒级 `timeout` 和可选 `cwd`; `execCommand()` 形参要求一个 `cwd: string`, extension loader 会用 `options.cwd ?? cwd` 选择传给 `execCommand()` 的工作目录 [E: packages/coding-agent/src/core/exec.ts:13] [E: packages/coding-agent/src/core/exec.ts:15] [E: packages/coding-agent/src/core/exec.ts:17] [E: packages/coding-agent/src/core/exec.ts:37] [E: packages/coding-agent/src/core/exec.ts:78] [E: packages/coding-agent/src/core/extensions/loader.ts:312]。

`ExecResult` 保留 stdout 和 stderr 分离, 返回 `code` 与 `killed` 布尔值; 这与 `BashResult.output` 合并 stdout/stderr 的设计不同, 因为 extension runtime 的 process exec 更接近传统 child_process wrapper [E: packages/coding-agent/src/core/exec.ts:24] [E: packages/coding-agent/src/core/exec.ts:25] [E: packages/coding-agent/src/core/exec.ts:26] [E: packages/coding-agent/src/core/exec.ts:27] [I]。

## 控制流

1. `executeBashWithOperations@packages/coding-agent/src/core/bash-executor.ts:50` 初始化 rolling output buffer、byte counters、可选 temp file path/stream, 并把内存保留上限设为 `DEFAULT_MAX_BYTES * 2` [E: packages/coding-agent/src/core/bash-executor.ts:56] [E: packages/coding-agent/src/core/bash-executor.ts:57] [E: packages/coding-agent/src/core/bash-executor.ts:58] [E: packages/coding-agent/src/core/bash-executor.ts:60] [E: packages/coding-agent/src/core/bash-executor.ts:61] [E: packages/coding-agent/src/core/bash-executor.ts:62]。
2. `ensureTempFile@packages/coding-agent/src/core/bash-executor.ts:64` 用 `randomBytes(8)` 生成 `pi-bash-<id>.log`, 放在 `tmpdir()`, 并把已经在内存里的 chunks 先写进去 [E: packages/coding-agent/src/core/bash-executor.ts:68] [E: packages/coding-agent/src/core/bash-executor.ts:69] [E: packages/coding-agent/src/core/bash-executor.ts:71] [E: packages/coding-agent/src/core/bash-executor.ts:72]。
3. `onData@packages/coding-agent/src/core/bash-executor.ts:78` 每收到一个 `Buffer` 就累加 raw byte 数, 用 streaming `TextDecoder` decode, 再依次 strip ANSI、sanitize binary output、把 `\r` 去掉 [E: packages/coding-agent/src/core/bash-executor.ts:76] [E: packages/coding-agent/src/core/bash-executor.ts:79] [E: packages/coding-agent/src/core/bash-executor.ts:82]。
4. `onData@packages/coding-agent/src/core/bash-executor.ts:78` 在 raw bytes 超过 `DEFAULT_MAX_BYTES` 后打开 temp file, 后续 sanitized text 同步写入 temp file [E: packages/coding-agent/src/core/bash-executor.ts:85] [E: packages/coding-agent/src/core/bash-executor.ts:89] [E: packages/coding-agent/src/core/bash-executor.ts:90]。
5. `onData@packages/coding-agent/src/core/bash-executor.ts:78` 同时维护滚动内存 buffer: 新 text 入队, `outputBytes > maxOutputBytes` 且还有多个 chunk 时从头移除旧 chunk, 然后把 sanitized text 传给 `options.onChunk` [E: packages/coding-agent/src/core/bash-executor.ts:94] [E: packages/coding-agent/src/core/bash-executor.ts:95] [E: packages/coding-agent/src/core/bash-executor.ts:96] [E: packages/coding-agent/src/core/bash-executor.ts:97] [E: packages/coding-agent/src/core/bash-executor.ts:103]。
6. `operations.exec@packages/coding-agent/src/core/bash-executor.ts:108` 接收原始 command/cwd 和 `{ onData, signal }`; timeout 不由 `executeBashWithOperations()` 注入, 需要由调用方选择的 `BashOperations` 契约或上层 tool path 提供 [E: packages/coding-agent/src/core/bash-executor.ts:108] [E: packages/coding-agent/src/core/bash-executor.ts:109] [E: packages/coding-agent/src/core/bash-executor.ts:110] [I]。
7. 正常结束时 helper 将 rolling chunks join 成 `fullOutput`, 调 `truncateTail(fullOutput)`, 若截断就确保 temp file 存在, 关闭 temp stream, 并把 aborted signal 映射为 `cancelled` 与 `exitCode: undefined` [E: packages/coding-agent/src/core/bash-executor.ts:113] [E: packages/coding-agent/src/core/bash-executor.ts:114] [E: packages/coding-agent/src/core/bash-executor.ts:115] [E: packages/coding-agent/src/core/bash-executor.ts:116] [E: packages/coding-agent/src/core/bash-executor.ts:119] [E: packages/coding-agent/src/core/bash-executor.ts:121] [E: packages/coding-agent/src/core/bash-executor.ts:125]。
8. `operations.exec` 抛错时, 如果 signal 已 aborted, helper 走同样的 snapshot/truncate/temp-file 收尾并返回 `cancelled: true`; 如果不是 abort, helper 只关闭 temp stream 后重新抛错 [E: packages/coding-agent/src/core/bash-executor.ts:130] [E: packages/coding-agent/src/core/bash-executor.ts:132] [E: packages/coding-agent/src/core/bash-executor.ts:133] [E: packages/coding-agent/src/core/bash-executor.ts:134] [E: packages/coding-agent/src/core/bash-executor.ts:136] [E: packages/coding-agent/src/core/bash-executor.ts:144] [E: packages/coding-agent/src/core/bash-executor.ts:151] [E: packages/coding-agent/src/core/bash-executor.ts:154]。
9. `execCommand@packages/coding-agent/src/core/exec.ts:34` 用 `spawn(command, args)` 创建非 shell 子进程, stdio 配置为 ignore stdin 与 pipe stdout/stderr, 然后把 data events 追加进两个 string accumulator [E: packages/coding-agent/src/core/exec.ts:41] [E: packages/coding-agent/src/core/exec.ts:43] [E: packages/coding-agent/src/core/exec.ts:44] [E: packages/coding-agent/src/core/exec.ts:82] [E: packages/coding-agent/src/core/exec.ts:86]。
10. `killProcess@packages/coding-agent/src/core/exec.ts:52` 对 abort 或 timeout 先发 `SIGTERM`, 5 秒后如果 `proc.killed` 仍不成立则发 `SIGKILL`; timeout only 在 `options.timeout > 0` 时启用 [E: packages/coding-agent/src/core/exec.ts:52] [E: packages/coding-agent/src/core/exec.ts:55] [E: packages/coding-agent/src/core/exec.ts:57] [E: packages/coding-agent/src/core/exec.ts:58] [E: packages/coding-agent/src/core/exec.ts:59] [E: packages/coding-agent/src/core/exec.ts:75]。
11. `waitForChildProcess@packages/coding-agent/src/core/exec.ts:91` 返回后清理 timeout 和 abort listener, 成功 resolve `{ stdout, stderr, code: code ?? 0, killed }`, 异常时 resolve fallback `{ stdout, stderr, code: 1, killed }` [E: packages/coding-agent/src/core/exec.ts:91] [E: packages/coding-agent/src/core/exec.ts:93] [E: packages/coding-agent/src/core/exec.ts:95] [E: packages/coding-agent/src/core/exec.ts:97] [E: packages/coding-agent/src/core/exec.ts:99] [E: packages/coding-agent/src/core/exec.ts:100] [E: packages/coding-agent/src/core/exec.ts:102] [E: packages/coding-agent/src/core/exec.ts:104]。

## 设计动机与权衡

`executeBashWithOperations()` 接收 `BashOperations` 而不是直接 spawn, 让 interactive/RPC direct execution 可以复用 bash tool 的执行后端契约 [E: packages/coding-agent/src/core/bash-executor.ts:53] [E: packages/coding-agent/src/core/bash-executor.ts:108]。这种设计把“如何启动进程/远程命令”留给 operations, 把“如何 sanitize、stream、truncate、mark cancelled”集中在 helper 内 [I]。

滚动内存 buffer 与 temp file 双轨是为了兼顾实时 UI/RPC 反馈和超大输出保真: helper 一边把每个 chunk 交给 `onChunk`, 一边在超过默认字节阈值时 spill 到 temp file, 最终返回 tail preview 和可选完整日志路径 [E: packages/coding-agent/src/core/bash-executor.ts:85] [E: packages/coding-agent/src/core/bash-executor.ts:103] [E: packages/coding-agent/src/core/bash-executor.ts:128]。测试覆盖 `executeBashWithOperations("seq 3000", ...)` 返回 `truncated: true` 和存在的 `fullOutputPath`, 且完整文件同时含开头和结尾输出 [E: packages/coding-agent/test/tools.test.ts:754] [E: packages/coding-agent/test/tools.test.ts:757] [E: packages/coding-agent/test/tools.test.ts:765] [E: packages/coding-agent/test/tools.test.ts:767] [E: packages/coding-agent/test/tools.test.ts:768]。

`execCommand()` 保持简单 argv 语义, 不走 shell, 不合并 stdout/stderr, 并把 `timeout` 直接交给 `setTimeout()`; 这让 extension runtime 能显式传 command/args, 避免 bash helper 的 shell semantics 和 output truncation policy 进入所有 extension subprocess 调用 [E: packages/coding-agent/src/core/exec.ts:35] [E: packages/coding-agent/src/core/exec.ts:36] [E: packages/coding-agent/src/core/exec.ts:43] [E: packages/coding-agent/src/core/exec.ts:76] [E: packages/coding-agent/src/core/exec.ts:78] [E: packages/coding-agent/src/core/exec.ts:97] [I]。

本子系统没有在 `bash-executor.ts` 或 `exec.ts` 分配 PTY: 两个文件处理的是 Buffer/pipe streams, `execCommand()` 明确使用 `stdio: ["ignore", "pipe", "pipe"]`, `executeBashWithOperations()` 的唯一 I/O hook 是 `onData(data: Buffer)` [E: packages/coding-agent/src/core/exec.ts:44] [E: packages/coding-agent/src/core/bash-executor.ts:78] [I]。需要真实 terminal/PTY 语义的地方不应从这两个 symbol 推断存在 [I]。

## Gotcha

- `executeBashWithOperations()` 的 `BashExecutorOptions` 没有 timeout 字段, 因此 direct helper 本身只处理 `AbortSignal`; 模型 `bash` tool 的 `timeout` schema 和 local backend timeout 属于 [surface.tools.bash](../../surface/tools/bash.md) 的执行路径 [E: packages/coding-agent/src/core/bash-executor.ts:22] [E: packages/coding-agent/src/core/bash-executor.ts:24] [E: packages/coding-agent/src/core/bash-executor.ts:26] [I]。
- `exitCode` 在 `BashResult` 里是 `number | undefined`; 取消分支会返回 `exitCode: undefined`, 调用方不能把 undefined 当成功码 0 [E: packages/coding-agent/src/core/bash-executor.ts:33] [E: packages/coding-agent/src/core/bash-executor.ts:125] [E: packages/coding-agent/src/core/bash-executor.ts:143]。
- `onChunk` 收到的是每个 sanitized text chunk, 不是最终截断后的 tail; 最终 `output` 可能因为 `truncateTail()` 只保留 tail preview [E: packages/coding-agent/src/core/bash-executor.ts:103] [E: packages/coding-agent/src/core/bash-executor.ts:114] [I]。
- `ensureTempFile()` 用 sanitized chunks 写完整输出, 不是 raw bytes; binary garbage 和 ANSI 控制序列在写 temp file 前已经被处理 [E: packages/coding-agent/src/core/bash-executor.ts:72] [E: packages/coding-agent/src/core/bash-executor.ts:82] [E: packages/coding-agent/src/core/bash-executor.ts:90]。
- `execCommand()` 的 timeout kill 会把 `killed` 置 true, 但最终 `code` 仍来自 `waitForChildProcess()` 或 fallback 1; 调用方需要同时看 `killed` 和 `code` 才能区分普通非零退出与被 kill [E: packages/coding-agent/src/core/exec.ts:49] [E: packages/coding-agent/src/core/exec.ts:54] [E: packages/coding-agent/src/core/exec.ts:75] [E: packages/coding-agent/src/core/exec.ts:77] [E: packages/coding-agent/src/core/exec.ts:97] [I]。
- Windows close/hang 回归测试验证 `executeBashWithOperations()` 与 bash tool 都应在 shell exit 后 resolve, 即使 detached/inherited stdio descendant 仍保留句柄; 这条行为依赖 local `BashOperations` 与 shared child-process waiting, 不是 `bash-executor.ts` 单文件能完全证明 [E: packages/coding-agent/test/bash-close-hang-windows.test.ts:19] [E: packages/coding-agent/test/bash-close-hang-windows.test.ts:91] [E: packages/coding-agent/test/bash-close-hang-windows.test.ts:100] [E: packages/coding-agent/test/bash-close-hang-windows.test.ts:101] [E: packages/coding-agent/test/bash-close-hang-windows.test.ts:102] [E: packages/coding-agent/test/bash-close-hang-windows.test.ts:116] [E: packages/coding-agent/test/bash-close-hang-windows.test.ts:120] [I]。

## 跨包边界

[surface.tools.bash](../../surface/tools/bash.md) 是模型工具面节点: 它覆盖 `bash` wire name、TypeBox 输入 schema、tool renderer、tool timeout 和 `createLocalBashOperations()` local backend; 本节点只覆盖 direct helper `executeBashWithOperations()` 和 argv helper `execCommand()` [E: packages/coding-agent/src/core/bash-executor.ts:50] [E: packages/coding-agent/src/core/exec.ts:34] [I]。

[subsys.coding-agent.output-truncation](output-truncation.md) 是输出截断节点: `bash-executor.ts` 使用 `DEFAULT_MAX_BYTES` 和 `truncateTail()` 来决定 preview 与 `fullOutputPath`, 因此 tail preview 规则应在那里权威解释 [E: packages/coding-agent/src/core/bash-executor.ts:58] [E: packages/coding-agent/src/core/bash-executor.ts:85] [E: packages/coding-agent/src/core/bash-executor.ts:114] [E: packages/coding-agent/src/core/bash-executor.ts:128]。

[subsys.agent-core.exec-env](../agent-core/exec-env.md) 是 agent-core 执行环境边界节点: `execCommand()` 是 pi-coding-agent extension loader 暴露的 process helper, 不是 `packages/agent` harness 的 exec abstraction; 两者名字相近但 package 边界不同 [E: packages/coding-agent/src/core/exec.ts:34] [E: packages/coding-agent/src/core/extensions/loader.ts:310] [E: packages/coding-agent/src/core/extensions/loader.ts:312] [I]。

## Sources

- packages/coding-agent/src/core/bash-executor.ts
- packages/coding-agent/src/core/exec.ts
- packages/coding-agent/src/core/agent-session.ts
- packages/coding-agent/src/modes/rpc/rpc-mode.ts
- packages/coding-agent/src/core/extensions/loader.ts
- packages/coding-agent/test/tools.test.ts
- packages/coding-agent/test/bash-close-hang-windows.test.ts

## 相关

- [surface.tools.bash](../../surface/tools/bash.md): 模型可见 `bash` tool 的 schema、注册、renderer、local shell backend 与 tool-call 行为。
- [subsys.coding-agent.output-truncation](output-truncation.md): `DEFAULT_MAX_BYTES`、`truncateTail()`、tail preview 和完整输出临时文件策略。
- [subsys.agent-core.exec-env](../agent-core/exec-env.md): agent-core/harness 层的执行环境语义, 用来和 pi-coding-agent 的 extension `execCommand()` 区分。
