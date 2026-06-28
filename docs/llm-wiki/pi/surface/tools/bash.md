---
id: surface.tools.bash
title: bash 执行工具
kind: tool
tier: T1
pkg: coding-agent
source:
  - packages/coding-agent/src/core/tools/bash.ts
  - packages/coding-agent/src/core/bash-executor.ts
  - packages/coding-agent/src/core/tools/index.ts
  - packages/coding-agent/src/core/agent-session.ts
symbols:
  - createBashTool
  - createBashToolDefinition
  - BashToolInput
  - BashOperations
related:
  - spine.tool-call-anatomy
  - subsys.coding-agent.bash-executor
  - subsys.coding-agent.output-truncation
  - ref.tools-catalog
evidence: explicit
status: verified
updated: 5a073885
---

> `bash` 是 pi-coding-agent 暴露给模型的 shell command tool: 它在当前工作目录执行命令, 合并 stdout/stderr, 流式更新 UI, 并把过长输出裁成 tail preview 加临时完整日志文件。

## 能回答的问题

- `bash` tool 的 wire name、工厂函数和 TypeBox 参数是什么?
- `timeout` 的单位、默认行为和失败文本是什么?
- bash 输出如何截断, 什么时候写 `fullOutputPath`?
- `executionMode` 是 sequential 还是 parallel, 这个结论来自哪里?
- `bash` 怎样从 `createAllToolDefinitions()` 装配进 `AgentSession._buildRuntime()`?
- 模型工具 `bash` 与 `AgentSession.executeBash()` 这条直接执行路径有什么区别?

## 1 Identity

模型看到的 tool name 是 `bash`, UI label 也是 `bash`, `createBashToolDefinition()` 返回的 `ToolDefinition` 直接设置这两个字段 [E: packages/coding-agent/src/core/tools/bash.ts:282] [E: packages/coding-agent/src/core/tools/bash.ts:283]。`createBashTool(cwd, options)` 是把该 `ToolDefinition` 交给 `wrapToolDefinition()` 后得到 agent-core `AgentTool` 的便捷工厂 [E: packages/coding-agent/src/core/tools/bash.ts:452]。`BashToolInput` 是 `bashSchema` 的 TypeBox static type, 所以它随 schema 自动约束输入形状 [E: packages/coding-agent/src/core/tools/bash.ts:24] [E: packages/coding-agent/src/core/tools/bash.ts:29]。

`BashOperations` 是可插拔执行后端: `exec(command, cwd, options)` 接收 `onData`、`AbortSignal`、`timeout` 和可选 `env`, 返回 `{ exitCode: number | null }` [E: packages/coding-agent/src/core/tools/bash.ts:40] [E: packages/coding-agent/src/core/tools/bash.ts:48]。`BashToolOptions.operations` 可覆盖默认本地后端, 所以这个接口不是只绑定本机 shell [E: packages/coding-agent/src/core/tools/bash.ts:148] [E: packages/coding-agent/src/core/tools/bash.ts:278]。

## 2 用途定位

`bash` 用于让模型在当前工作目录运行 shell command, 返回合并后的 stdout 和 stderr; tool description 还明确说明输出会按最后 `DEFAULT_MAX_LINES` 行或 `DEFAULT_MAX_BYTES / 1024` KB 截断, 截断时完整输出保存到临时文件 [E: packages/coding-agent/src/core/tools/bash.ts:284]。默认截断常量是 2000 lines 和 50KB, 两个限制谁先命中谁生效 [E: packages/coding-agent/src/core/tools/truncate.ts:11] [E: packages/coding-agent/src/core/tools/truncate.ts:12]。

这个节点只把 `bash` 作为模型工具详写; `AgentSession.executeBash()` 是会话层可直接调用的命令执行 API, 它复用 `executeBashWithOperations()` 并把结果记入 session, 但它不是模型通过 tool call 进入的 `createBashToolDefinition().execute()` 主路径 [E: packages/coding-agent/src/core/agent-session.ts:2588] [E: packages/coding-agent/src/core/agent-session.ts:2601] [E: packages/coding-agent/src/core/agent-session.ts:2611] [I]。

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
| --- | --- | --- | --- | --- | --- |
| `command` | `string` | 是 | 无 | TypeBox `Type.String` | 要执行的 bash command; schema description 是 `Bash command to execute` [E: packages/coding-agent/src/core/tools/bash.ts:25]。 |
| `timeout` | `number` | 否 | 无默认超时 | TypeBox `Type.Optional(Type.Number)`; local backend 只在 `timeout !== undefined && timeout > 0` 时启动 timer | 单位是 seconds; schema description 写着 `Timeout in seconds (optional, no default timeout)` [E: packages/coding-agent/src/core/tools/bash.ts:26], local backend 把它乘以 1000 传给 `setTimeout()` [E: packages/coding-agent/src/core/tools/bash.ts:100] [E: packages/coding-agent/src/core/tools/bash.ts:104]。 |

`commandPrefix` 不是模型输入字段, 而是 `BashToolOptions` 上的产品配置: `execute()` 会在运行前把 prefix 和模型传入的 command 用换行拼接 [E: packages/coding-agent/src/core/tools/bash.ts:150] [E: packages/coding-agent/src/core/tools/bash.ts:294]。`operations`、`shellPath`、`spawnHook` 也都属于 `BashToolOptions`, 不进入模型 schema [E: packages/coding-agent/src/core/tools/bash.ts:148] [E: packages/coding-agent/src/core/tools/bash.ts:152] [E: packages/coding-agent/src/core/tools/bash.ts:154]。

## 4 输出 & 截断

成功时 `execute()` 返回一个 text content block; 空输出会显示 `(no output)` [E: packages/coding-agent/src/core/tools/bash.ts:358] [E: packages/coding-agent/src/core/tools/bash.ts:408]。非零 exit code 被转成 thrown Error, 错误文本会追加已经收集到的输出和 `Command exited with code N` [E: packages/coding-agent/src/core/tools/bash.ts:406]。abort 和 timeout 同样会先 `finishOutput()`, 再分别抛出 `Command aborted` 或 `Command timed out after N seconds` [E: packages/coding-agent/src/core/tools/bash.ts:391] [E: packages/coding-agent/src/core/tools/bash.ts:394] [E: packages/coding-agent/src/core/tools/bash.ts:398]。

输出由 `OutputAccumulator({ tempFilePrefix: "pi-bash" })` 收集 [E: packages/coding-agent/src/core/tools/bash.ts:296]。`OutputAccumulator` 使用 streaming UTF-8 decoder, 保存 bounded tail, 并在需要保留完整输出时打开 temp file [E: packages/coding-agent/src/core/tools/output-accumulator.ts:40] [E: packages/coding-agent/src/core/tools/output-accumulator.ts:70] [E: packages/coding-agent/src/core/tools/output-accumulator.ts:155] [E: packages/coding-agent/src/core/tools/output-accumulator.ts:158] [E: packages/coding-agent/src/core/tools/output-accumulator.ts:216]。它的 `snapshot({ persistIfTruncated: true })` 在截断时调用 `ensureTempFile()`, 返回 `content`、`truncation` 和 `fullOutputPath` [E: packages/coding-agent/src/core/tools/output-accumulator.ts:91] [E: packages/coding-agent/src/core/tools/output-accumulator.ts:110] [E: packages/coding-agent/src/core/tools/output-accumulator.ts:115] [E: packages/coding-agent/src/core/tools/output-accumulator.ts:116] [E: packages/coding-agent/src/core/tools/output-accumulator.ts:117]。

bash 截断保留 tail; `truncateTail()` 从末尾向前收集输出行, 适合看命令结尾的错误或最终结果 [E: packages/coding-agent/src/core/tools/truncate.ts:168] [E: packages/coding-agent/src/core/tools/truncate.ts:199] [E: packages/coding-agent/src/core/tools/truncate.ts:216] [I]。最终文本会按 `truncatedBy` 生成三种 footer: 行数截断、字节截断、或者最后一行本身超过 byte limit 的 partial-line case [E: packages/coding-agent/src/core/tools/bash.ts:368] [E: packages/coding-agent/src/core/tools/bash.ts:370] [E: packages/coding-agent/src/core/tools/bash.ts:372]。测试覆盖了 4000 行输出只返回 2000 行、footer 指向完整输出路径、且不会把 trailing newline 算作额外一行 [E: packages/coding-agent/test/tools.test.ts:671] [E: packages/coding-agent/test/tools.test.ts:672] [E: packages/coding-agent/test/tools.test.ts:682] [E: packages/coding-agent/test/tools.test.ts:683] [E: packages/coding-agent/test/tools.test.ts:686]。

流式 UI 更新被 100ms throttle: `BASH_UPDATE_THROTTLE_MS` 为 100, `scheduleOutputUpdate()` 根据距离上次更新时间决定立即 emit 或 setTimeout [E: packages/coding-agent/src/core/tools/bash.ts:158] [E: packages/coding-agent/src/core/tools/bash.ts:326] [E: packages/coding-agent/src/core/tools/bash.ts:329] [E: packages/coding-agent/src/core/tools/bash.ts:332]。chatty output 的测试期望 5000 行输出时 updates 少于 25 次, 说明该 throttle 是可观察行为 [E: packages/coding-agent/test/tools.test.ts:651] [E: packages/coding-agent/test/tools.test.ts:652] [E: packages/coding-agent/test/tools.test.ts:664]。

## 5 执行模式

`bash` 的 `ToolDefinition` 没有设置 `executionMode` 字段: 返回对象包含 `name`、`label`、`description`、`promptSnippet`、`parameters`、`execute` 和 renderer, 但没有 `executionMode` property [E: packages/coding-agent/src/core/tools/bash.ts:281] [I]。agent-core 的 `ToolExecutionMode` 默认是 `parallel`, per-tool `executionMode` 只有显式写 `"sequential"` 时才让整批 tool calls 走 sequential 分支 [E: packages/agent/src/agent.ts:218] [E: packages/agent/src/agent-loop.ts:382] [E: packages/agent/src/agent-loop.ts:384]。因此 `bash` 继承默认 parallel executionMode, 除非外层 agent config 把整轮工具执行改为 sequential [I]。

这个设计意味着多个 tool call 可以并发执行, 但 `bash` 本身没有像 file mutation tool 那样在 tool definition 上声明强制串行 [I]。如果一个命令会修改共享文件或依赖另一个工具结果, 顺序性需要由模型或更高层流程约束, 当前 `bash` tool definition 没有内建 per-command serialization [I]。

## 6 注册与装配

内置工具集的 ground truth 在 `packages/coding-agent/src/core/tools/index.ts`: `ToolName` union 包含 `"bash"`, `allToolNames` 也包含 `"bash"` [E: packages/coding-agent/src/core/tools/index.ts:83] [E: packages/coding-agent/src/core/tools/index.ts:84]。`createToolDefinition("bash", cwd, options)` 分派到 `createBashToolDefinition(cwd, options?.bash)`, `createTool("bash", ...)` 分派到 `createBashTool(cwd, options?.bash)` [E: packages/coding-agent/src/core/tools/index.ts:101] [E: packages/coding-agent/src/core/tools/index.ts:122]。`createCodingToolDefinitions()` 的默认 coding preset 包含 read/bash/edit/write, 而 read-only preset 不含 bash [E: packages/coding-agent/src/core/tools/index.ts:140] [E: packages/coding-agent/src/core/tools/index.ts:141] [E: packages/coding-agent/src/core/tools/index.ts:142] [E: packages/coding-agent/src/core/tools/index.ts:143] [E: packages/coding-agent/src/core/tools/index.ts:149] [E: packages/coding-agent/src/core/tools/index.ts:150] [E: packages/coding-agent/src/core/tools/index.ts:151] [E: packages/coding-agent/src/core/tools/index.ts:152]。

`createAllToolDefinitions()` 返回 record 时把 key `bash` 绑定到 `createBashToolDefinition(cwd, options?.bash)` [E: packages/coding-agent/src/core/tools/index.ts:156] [E: packages/coding-agent/src/core/tools/index.ts:159]。`AgentSession._buildRuntime()` 读取 settings 里的 `imageAutoResize`、`shellCommandPrefix` 和 `shellPath`, 然后调用 `createAllToolDefinitions(this._cwd, { read: { autoResizeImages }, bash: { commandPrefix: shellCommandPrefix, shellPath } })` [E: packages/coding-agent/src/core/agent-session.ts:2408] [E: packages/coding-agent/src/core/agent-session.ts:2409] [E: packages/coding-agent/src/core/agent-session.ts:2410] [E: packages/coding-agent/src/core/agent-session.ts:2418] [E: packages/coding-agent/src/core/agent-session.ts:2420]。

`_buildRuntime()` 默认 active tools 是 `["read", "bash", "edit", "write"]`, 然后 `_refreshToolRegistry()` 会把 built-in tool definitions 通过 `wrapRegisteredTools()` 转成 agent-core `AgentTool` 并写入 `_toolRegistry` [E: packages/coding-agent/src/core/agent-session.ts:2449] [E: packages/coding-agent/src/core/agent-session.ts:2451] [E: packages/coding-agent/src/core/agent-session.ts:2362] [E: packages/coding-agent/src/core/agent-session.ts:2376]。`wrapRegisteredTools()` 最终复用 `wrapToolDefinition()`, 后者把 `name`、`description`、`parameters`、`executionMode` 和 `execute` 映射成 core runtime 的 `AgentTool` shape [E: packages/coding-agent/src/core/extensions/wrapper.ts:26] [E: packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:10] [E: packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:12] [E: packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:13] [E: packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:15] [E: packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:16]。

## 7 execute() 走读

1. 工厂阶段选择执行后端: `options.operations` 优先, 否则使用 `createLocalBashOperations({ shellPath: options?.shellPath })` [E: packages/coding-agent/src/core/tools/bash.ts:278]。
2. 执行开始时把 `commandPrefix` 拼到 command 前面, 再通过 `resolveSpawnContext(resolvedCommand, cwd, spawnHook)` 允许调用方调整 command/cwd/env [E: packages/coding-agent/src/core/tools/bash.ts:294] [E: packages/coding-agent/src/core/tools/bash.ts:295]。
3. `OutputAccumulator` 接收每个 `onData` buffer; 如果 `acceptingOutput` 已经关闭, late callbacks 会被忽略 [E: packages/coding-agent/src/core/tools/bash.ts:342] [E: packages/coding-agent/src/core/tools/bash.ts:343]。回归测试确认 operations resolve 之后再触发的 `onData("late")` 不会进入最终结果 [E: packages/coding-agent/test/suite/regressions/5208-late-bash-output.test.ts:16] [E: packages/coding-agent/test/suite/regressions/5208-late-bash-output.test.ts:18] [E: packages/coding-agent/test/suite/regressions/5208-late-bash-output.test.ts:27]。
4. `ops.exec()` 接收 command、cwd、`onData`、`signal`、`timeout` 和 resolved env, 返回 exit code [E: packages/coding-agent/src/core/tools/bash.ts:383] [E: packages/coding-agent/src/core/tools/bash.ts:384] [E: packages/coding-agent/src/core/tools/bash.ts:385] [E: packages/coding-agent/src/core/tools/bash.ts:386] [E: packages/coding-agent/src/core/tools/bash.ts:387]。
5. 成功结束后 `finishOutput()` 停止接收输出、flush 最后一次 partial update、snapshot 并关闭 temp file [E: packages/coding-agent/src/core/tools/bash.ts:349] [E: packages/coding-agent/src/core/tools/bash.ts:352] [E: packages/coding-agent/src/core/tools/bash.ts:353] [E: packages/coding-agent/src/core/tools/bash.ts:354]。
6. `exitCode !== 0 && exitCode !== null` 会抛错; `exitCode === 0` 或 `null` 会按成功路径返回 text result [E: packages/coding-agent/src/core/tools/bash.ts:405] [E: packages/coding-agent/src/core/tools/bash.ts:406] [E: packages/coding-agent/src/core/tools/bash.ts:408]。

local backend `createLocalBashOperations()` 先解析 shell config, 检查 cwd 是否存在, 再用 `spawn()` 启动 shell [E: packages/coding-agent/src/core/tools/bash.ts:69] [E: packages/coding-agent/src/core/tools/bash.ts:71] [E: packages/coding-agent/src/core/tools/bash.ts:80]。它把 stdout 和 stderr 都绑定到同一个 `onData`, 所以 tool 输出是 combined output [E: packages/coding-agent/src/core/tools/bash.ts:107] [E: packages/coding-agent/src/core/tools/bash.ts:108]。timeout 和 abort 都会 kill process tree; timeout 抛 `timeout:N`, abort 在等待后抛 `aborted` [E: packages/coding-agent/src/core/tools/bash.ts:95] [E: packages/coding-agent/src/core/tools/bash.ts:103] [E: packages/coding-agent/src/core/tools/bash.ts:118] [E: packages/coding-agent/src/core/tools/bash.ts:121]。

`executeBashWithOperations()` 是 direct bash execution helper: 它也接收 `BashOperations`, 会 strip ANSI、sanitize binary output、normalize `\r`, 然后用 `truncateTail()` 产出 `BashResult` [E: packages/coding-agent/src/core/bash-executor.ts:50] [E: packages/coding-agent/src/core/bash-executor.ts:82] [E: packages/coding-agent/src/core/bash-executor.ts:114]。`AgentSession.executeBash()` 使用这条 helper, 并通过 `recordBashResult()` 写入 `bashExecution` message; streaming 期间记录会先进入 pending queue, 避免破坏 tool_use/tool_result ordering [E: packages/coding-agent/src/core/agent-session.ts:2611] [E: packages/coding-agent/src/core/agent-session.ts:2624] [E: packages/coding-agent/src/core/agent-session.ts:2636] [E: packages/coding-agent/src/core/agent-session.ts:2638]。

## 8 设计动机·edge

- Remote execution hook: `BashOperations` 和 `spawnHook` 让调用方可以替换执行后端或重写 spawn context; SSH、container 或自定义环境属于这两个接口可支持的执行目标 [E: packages/coding-agent/src/core/tools/bash.ts:148] [E: packages/coding-agent/src/core/tools/bash.ts:154] [E: packages/coding-agent/src/core/tools/bash.ts:278] [E: packages/coding-agent/src/core/tools/bash.ts:295] [I]。
- Shell resolution: `getShellConfig()` 的顺序是 custom `shellPath`, Windows Git Bash/`bash.exe` on PATH, Unix `/bin/bash`/PATH bash, 最后 fallback `sh` [E: packages/coding-agent/src/utils/shell.ts:69] [E: packages/coding-agent/src/utils/shell.ts:88] [E: packages/coding-agent/src/utils/shell.ts:95] [E: packages/coding-agent/src/utils/shell.ts:110] [E: packages/coding-agent/src/utils/shell.ts:114] [E: packages/coding-agent/src/utils/shell.ts:119]。旧 WSL `C:\Windows\System32\bash.exe` 会使用 stdin transport 而不是 argv `-c` [E: packages/coding-agent/src/utils/shell.ts:17] [E: packages/coding-agent/src/utils/shell.ts:21]。
- Process lifetime: local backend 在非 Windows 上用 detached process group, abort/timeout 通过 `killProcessTree()` 清理整棵进程树 [E: packages/coding-agent/src/core/tools/bash.ts:82] [E: packages/coding-agent/src/core/tools/bash.ts:95] [E: packages/coding-agent/src/core/tools/bash.ts:103] [E: packages/coding-agent/src/utils/shell.ts:200] [E: packages/coding-agent/src/utils/shell.ts:215]。`waitForChildProcess()` 在 child exit 后继续等 stdout/stderr idle, 避免 descendant 仍在写 pipe 时过早销毁 stream [E: packages/coding-agent/src/utils/child-process.ts:116] [E: packages/coding-agent/src/utils/child-process.ts:121] [E: packages/coding-agent/src/utils/child-process.ts:93] [E: packages/coding-agent/src/utils/child-process.ts:96] [E: packages/coding-agent/src/utils/child-process.ts:76] [E: packages/coding-agent/src/utils/child-process.ts:77]。
- Full-output spillover: `OutputAccumulator.shouldUseTempFile()` 在 raw bytes、decoded bytes 或 line count 超限时启用 temp file [E: packages/coding-agent/src/core/tools/output-accumulator.ts:207]。测试覆盖了按行截断时 `fullOutputPath` 存在, 且完整文件包含开头和结尾输出 [E: packages/coding-agent/test/tools.test.ts:730] [E: packages/coding-agent/test/tools.test.ts:746] [E: packages/coding-agent/test/tools.test.ts:749] [E: packages/coding-agent/test/tools.test.ts:750]。
- Renderer edge: 非 expanded 状态只展示最近 5 条 visual lines 并显示 skipped hint; expanded 状态展示完整当前 text preview [E: packages/coding-agent/src/core/tools/bash.ts:157] [E: packages/coding-agent/src/core/tools/bash.ts:222] [E: packages/coding-agent/src/core/tools/bash.ts:228] [E: packages/coding-agent/src/core/tools/bash.ts:233] [E: packages/coding-agent/src/core/tools/bash.ts:237]。最终渲染会剥掉正文里重复的 full-output footer, 再在 warning 行显示 `Full output` 和 truncation summary [E: packages/coding-agent/src/core/tools/bash.ts:209] [E: packages/coding-agent/src/core/tools/bash.ts:212] [E: packages/coding-agent/src/core/tools/bash.ts:253] [E: packages/coding-agent/src/core/tools/bash.ts:257] [E: packages/coding-agent/src/core/tools/bash.ts:260]。

## Sources

- packages/coding-agent/src/core/tools/bash.ts
- packages/coding-agent/src/core/bash-executor.ts
- packages/coding-agent/src/core/tools/index.ts
- packages/coding-agent/src/core/agent-session.ts
- packages/coding-agent/src/core/tools/output-accumulator.ts
- packages/coding-agent/src/core/tools/truncate.ts
- packages/coding-agent/src/core/tools/tool-definition-wrapper.ts
- packages/coding-agent/src/core/extensions/wrapper.ts
- packages/coding-agent/src/utils/shell.ts
- packages/coding-agent/src/utils/child-process.ts
- packages/agent/src/agent.ts
- packages/agent/src/types.ts
- packages/agent/src/agent-loop.ts
- packages/coding-agent/test/tools.test.ts
- packages/coding-agent/test/tool-execution-component.test.ts
- packages/coding-agent/test/suite/regressions/5208-late-bash-output.test.ts
- packages/coding-agent/test/suite/agent-session-bash-persistence.test.ts

## 相关

- [spine.tool-call-anatomy](../../spine/tool-call-anatomy.md): agent-core 如何准备、执行和回填 tool call; `bash` 通过 `AgentTool` shape 进入这条 loop。
- [subsys.coding-agent.bash-executor](../../subsystems/coding-agent/bash-executor.md): `executeBashWithOperations()` 直接执行路径, 也是 `AgentSession.executeBash()` 的核心 helper。
- [subsys.coding-agent.output-truncation](../../subsystems/coding-agent/output-truncation.md): `OutputAccumulator`、`truncateTail()` 和 `fullOutputPath` 的共享截断机制。
- [ref.tools-catalog](../../reference/tools-catalog.md): 内置工具 ground truth catalog, 覆盖 `ToolName`、presets 和 registry。
