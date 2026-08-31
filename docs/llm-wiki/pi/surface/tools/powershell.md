---
id: surface.tools.powershell
title: powershell 执行工具
kind: tool
tier: T1
pkg: coding-agent
source:
  - packages/coding-agent/src/core/tools/powershell.ts
  - packages/coding-agent/src/core/tools/bash.ts
  - packages/coding-agent/src/core/tools/index.ts
  - packages/coding-agent/src/core/agent-session.ts
  - packages/coding-agent/src/core/system-prompt.ts
  - packages/coding-agent/src/utils/shell.ts
  - packages/coding-agent/docs/windows.md
  - packages/coding-agent/docs/environment-variables.md
symbols:
  - createPowerShellTool
  - createPowerShellToolDefinition
  - createLocalPowerShellOperations
  - PowerShellToolInput
  - PowerShellOperations
  - PowerShellToolOptions
  - powershellToolSystemPromptContribution
related:
  - surface.tools.bash
  - spine.tool-call-anatomy
  - subsys.coding-agent.output-truncation
  - ref.tools-catalog
  - ref.coding-agent.env-vars
evidence: explicit
status: verified
updated: 853a80d26c
---

> `powershell` 是 pi-coding-agent 暴露给模型的可选 Windows PowerShell command tool: 它是 `bash.ts` shared shell factory 的薄封装, 本地 backend 会给 command 加 UTF-8 `OutputEncoding` prefix, 并复用 bash 的 schema、截断和 renderer。

## 能回答的问题

- `powershell` tool 的 wire name、工厂函数和 TypeBox 参数是什么?
- `powershell` 怎样复用 `createShellToolDefinition` / `createLocalShellOperations`, 哪些类型只是 `Bash*` 别名?
- 本地 backend 为什么以及怎样给 command 加 UTF-8 prefix?
- `powershell` 在 `createCodingToolDefinitions` / `createReadOnlyToolDefinitions` 里吗, 又怎样进入 `allToolNames` / `createAllToolDefinitions`?
- `defaultTools` 怎样可选启用 `powershell`, 默认 active set 含不含它?
- `executionMode` 是 sequential 还是 parallel, 这个结论来自哪里?

## 1 Identity

模型看到的 tool name 是 `powershell`, UI label 也是 `powershell`; 这两个字段写在 `powershellToolConfig` 上, 再交给 `createShellToolDefinition()` [E: packages/coding-agent/src/core/tools/powershell.ts:40] [E: packages/coding-agent/src/core/tools/powershell.ts:41] [E: packages/coding-agent/src/core/tools/bash.ts:348] [E: packages/coding-agent/src/core/tools/bash.ts:349]。`createPowerShellToolDefinition(cwd, options)` 不自写 execute/renderer, 而是调用 `createShellToolDefinition(cwd, powershellToolConfig, { ...options, operations })` [E: packages/coding-agent/src/core/tools/powershell.ts:49] [E: packages/coding-agent/src/core/tools/powershell.ts:53]。`createPowerShellTool(cwd, options)` 把该 `ToolDefinition` 交给 `wrapToolDefinition()`, 再 `Object.assign` `promptSnippet` / `promptGuidelines`, 得到 agent-core `AgentTool` [E: packages/coding-agent/src/core/tools/powershell.ts:59] [E: packages/coding-agent/src/core/tools/powershell.ts:61] [E: packages/coding-agent/src/core/tools/powershell.ts:62]。

`PowerShellOperations`、`PowerShellSpawnContext`、`PowerShellSpawnHook`、`PowerShellToolDetails`、`PowerShellToolInput` 都是对应 `Bash*` 类型的别名, 所以 I/O 形状与 bash 相同 [E: packages/coding-agent/src/core/tools/powershell.ts:23] [E: packages/coding-agent/src/core/tools/powershell.ts:24] [E: packages/coding-agent/src/core/tools/powershell.ts:25] [E: packages/coding-agent/src/core/tools/powershell.ts:26] [E: packages/coding-agent/src/core/tools/powershell.ts:27]。`PowerShellToolInput` 因此也是 `bashSchema` 的 TypeBox static type [E: packages/coding-agent/src/core/tools/bash.ts:42] [E: packages/coding-agent/src/core/tools/bash.ts:52]。`PowerShellToolOptions` 只 `Pick` `BashToolOptions` 的 `operations`、`exposeSessionEnvironment`、`spawnHook`, 不含 `commandPrefix` / `shellPath` [E: packages/coding-agent/src/core/tools/powershell.ts:29] [E: packages/coding-agent/src/core/tools/powershell.ts:30]。

## 2 用途定位

`powershell` 用于让模型在当前工作目录跑 PowerShell command, 返回合并后的 stdout/stderr; shared factory 的 description 会写成 `Execute a PowerShell command...`, 并说明输出按最后 `DEFAULT_MAX_LINES` 行或 `DEFAULT_MAX_BYTES / 1024` KB 截断 [E: packages/coding-agent/src/core/tools/powershell.ts:42] [E: packages/coding-agent/src/core/tools/bash.ts:350]。prompt snippet 是 `Execute PowerShell commands` [E: packages/coding-agent/src/core/tools/powershell.ts:19] [E: packages/coding-agent/src/core/tools/powershell.ts:44]。

产品文档把 `powershell` 标成 optional native PowerShell: 通过 `pwsh.exe`(优先)或 Windows PowerShell 执行, 启动参数是 `-NoProfile -NonInteractive -ExecutionPolicy Bypass`; administrator-enforced execution policy 仍可能覆盖 process-local Bypass [E: packages/coding-agent/docs/windows.md:13] [E: packages/coding-agent/src/utils/shell.ts:122] [E: packages/coding-agent/src/utils/shell.ts:130] [E: packages/coding-agent/src/utils/shell.ts:135]。Windows 文档给出用 `defaultTools` 替换模型面 `bash`, 或同时启用 `bash` 与 `powershell` 的 settings 示例 [E: packages/coding-agent/docs/windows.md:15] [E: packages/coding-agent/docs/windows.md:19] [E: packages/coding-agent/docs/windows.md:27]。`!` / `!!` editor command 仍走 Bash, 不走这个 tool [E: packages/coding-agent/docs/windows.md:31]。

`AgentSession.executeBash()` 是会话层直接 bash API, 没有对等的 `executePowerShell()`; 模型 tool call 进入的是 `createPowerShellToolDefinition().execute()` [E: packages/coding-agent/src/core/agent-session.ts:2976] [E: packages/coding-agent/src/core/tools/powershell.ts:53] [I]。

## 3 输入 schema 表

`createShellToolDefinition()` 把 `parameters` 设为 `bashSchema`, `powershell` 因此与 `bash` 共用同一 TypeBox object [E: packages/coding-agent/src/core/tools/bash.ts:353] [E: packages/coding-agent/src/core/tools/powershell.ts:53]。

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
| --- | --- | --- | --- | --- | --- |
| `command` | `string` | 是 | 无 | TypeBox `Type.String` | 要执行的 PowerShell command; schema description 是 `Shell command to execute` [E: packages/coding-agent/src/core/tools/bash.ts:43]。 |
| `timeout` | `number` | 否 | 无默认超时 | TypeBox `Type.Optional(Type.Number)`; local backend 要求 finite 且 `> 0`, 并限制在 Node timer 上限内 | 单位是 seconds; schema description 写着 `Timeout in seconds (optional, no default timeout)` [E: packages/coding-agent/src/core/tools/bash.ts:44]。`resolveTimeoutMs()` 把秒转成毫秒, 非法值抛 `Invalid timeout...` [E: packages/coding-agent/src/core/tools/bash.ts:29] [E: packages/coding-agent/src/core/tools/bash.ts:31] [E: packages/coding-agent/src/core/tools/bash.ts:35] [E: packages/coding-agent/src/core/tools/bash.ts:36]。 |

`commandPrefix` 不是 `PowerShellToolOptions` 字段, 也不是模型 schema 字段 [E: packages/coding-agent/src/core/tools/powershell.ts:29] [E: packages/coding-agent/src/core/tools/powershell.ts:30]。本地 backend 会在模型 `command` 前拼接 UTF-8 OutputEncoding prefix, 这一步发生在 `createLocalPowerShellOperations().exec`, 不进入 TypeBox 参数 [E: packages/coding-agent/src/core/tools/powershell.ts:16] [E: packages/coding-agent/src/core/tools/powershell.ts:35]。

### Session 环境注入

shared factory 默认 `exposeSessionEnvironment === true` [E: packages/coding-agent/src/core/tools/bash.ts:345]。`resolveSpawnContext()` 先从 shell env 副本删除 `PI_SESSION_ID`、`PI_SESSION_FILE`、`PI_PROVIDER`、`PI_MODEL`、`PI_REASONING_LEVEL`, 再在 `exposeSessionEnvironment && ctx` 时写回当前 session/model/thinking [E: packages/coding-agent/src/core/tools/bash.ts:178] [E: packages/coding-agent/src/core/tools/bash.ts:183] [E: packages/coding-agent/src/core/tools/bash.ts:185]。`powershell` 的 prompt guidelines 在 expose 打开时才会拷进 definition: `You can inspect PI_* environment variables for current model and session details.` [E: packages/coding-agent/src/core/tools/powershell.ts:20] [E: packages/coding-agent/src/core/tools/bash.ts:352]。产品环境变量文档把这五个变量同时归给 LLM-callable `bash` 和 `powershell`, 并明确 `!` / `!!` 不注入 [E: packages/coding-agent/docs/environment-variables.md:22] [E: packages/coding-agent/docs/environment-variables.md:49]。

## 4 输出 & 截断

成功/失败/abort/timeout 文本路径全部在 `createShellToolDefinition().execute()`: 空输出显示 `(no output)`; 非零 exit code 抛 `Command exited with code N`; abort 抛 `Command aborted`; timeout 抛 `Command timed out after N seconds` [E: packages/coding-agent/src/core/tools/bash.ts:426] [E: packages/coding-agent/src/core/tools/bash.ts:474] [E: packages/coding-agent/src/core/tools/bash.ts:462] [E: packages/coding-agent/src/core/tools/bash.ts:466]。`PowerShellToolDetails` 就是 `BashToolDetails`, 含 optional `truncation` 与 `fullOutputPath` [E: packages/coding-agent/src/core/tools/powershell.ts:26] [E: packages/coding-agent/src/core/tools/bash.ts:54] [E: packages/coding-agent/src/core/tools/bash.ts:55] [E: packages/coding-agent/src/core/tools/bash.ts:56]。

`powershell` 的 temp file prefix 是 `pi-powershell`, 由 `powershellToolConfig.tempFilePrefix` 传给 `OutputAccumulator` [E: packages/coding-agent/src/core/tools/powershell.ts:46] [E: packages/coding-agent/src/core/tools/bash.ts:364]。截断常量仍是 2000 lines / 50KB, 谁先命中谁生效 [E: packages/coding-agent/src/core/tools/truncate.ts:11] [E: packages/coding-agent/src/core/tools/truncate.ts:12]。截断 footer 与 bash 相同: last-line partial、按行、按字节三种 [E: packages/coding-agent/src/core/tools/bash.ts:436] [E: packages/coding-agent/src/core/tools/bash.ts:438] [E: packages/coding-agent/src/core/tools/bash.ts:440]。流式 UI 更新 throttle 也是共享的 `BASH_UPDATE_THROTTLE_MS = 100` [E: packages/coding-agent/src/core/tools/bash.ts:212] [E: packages/coding-agent/src/core/tools/bash.ts:394]。

TUI call 行的 prompt 是 `PS>` 而不是 bash 的 `$` [E: packages/coding-agent/src/core/tools/powershell.ts:43] [E: packages/coding-agent/src/core/tools/bash.ts:523] [E: packages/coding-agent/src/core/tools/bash.ts:488]。

## 5 执行模式

`createShellToolDefinition()` 返回的对象有 `name`、`label`、`description`、`promptSnippet`、`promptGuidelines`、`parameters`、`constrainedSampling`、`execute`、`renderCall`、`renderResult`, 没有 `executionMode` property [E: packages/coding-agent/src/core/tools/bash.ts:347] [E: packages/coding-agent/src/core/tools/bash.ts:348] [E: packages/coding-agent/src/core/tools/bash.ts:353] [I]。`wrapToolDefinition` 把 `definition.executionMode` 原样转给 `AgentTool` [E: packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:16]。agent-core `AgentTool.executionMode` 是 optional; `Agent` 构造时默认 `toolExecution` 为 `"parallel"` [E: packages/agent/src/types.ts:409] [E: packages/agent/src/agent.ts:237]。agent loop 只有全局 sequential 或某个被调工具显式 `executionMode === "sequential"` 时才整批串行 [E: packages/agent/src/agent-loop.ts:418] [E: packages/agent/src/agent-loop.ts:420]。因此 `powershell` 继承默认 parallel executionMode [I]。

## 6 注册与装配

内置工具集 ground truth 在 `packages/coding-agent/src/core/tools/index.ts`。`ToolName` union 包含 `"powershell"` [E: packages/coding-agent/src/core/tools/index.ts:95]。`allToolNames` 是八个 wire name 的 `Set`, 其中第三项是 `"powershell"` [E: packages/coding-agent/src/core/tools/index.ts:96] [E: packages/coding-agent/src/core/tools/index.ts:99]。`ToolsOptions` 有 `powershell?: PowerShellToolOptions` [E: packages/coding-agent/src/core/tools/index.ts:110]。`createToolDefinition("powershell", cwd, options)` 分派到 `createPowerShellToolDefinition(cwd, options?.powershell)`, `createTool("powershell", ...)` 分派到 `createPowerShellTool(cwd, options?.powershell)` [E: packages/coding-agent/src/core/tools/index.ts:124] [E: packages/coding-agent/src/core/tools/index.ts:125] [E: packages/coding-agent/src/core/tools/index.ts:147] [E: packages/coding-agent/src/core/tools/index.ts:148]。

`createCodingToolDefinitions()` 只返回 `read` / `bash` / `edit` / `write`, 数组里没有 `createPowerShellToolDefinition` [E: packages/coding-agent/src/core/tools/index.ts:164] [E: packages/coding-agent/src/core/tools/index.ts:166] [E: packages/coding-agent/src/core/tools/index.ts:167] [E: packages/coding-agent/src/core/tools/index.ts:168] [E: packages/coding-agent/src/core/tools/index.ts:169]。`createReadOnlyToolDefinitions()` 只返回 `read` / `grep` / `find` / `ls`, 同样没有 powershell [E: packages/coding-agent/src/core/tools/index.ts:173] [E: packages/coding-agent/src/core/tools/index.ts:175] [E: packages/coding-agent/src/core/tools/index.ts:176] [E: packages/coding-agent/src/core/tools/index.ts:177] [E: packages/coding-agent/src/core/tools/index.ts:178]。`createCodingTools()` / `createReadOnlyTools()` 的成员集合分别与对应 definition preset 相同, 也不含 powershell [E: packages/coding-agent/src/core/tools/index.ts:195] [E: packages/coding-agent/src/core/tools/index.ts:197] [E: packages/coding-agent/src/core/tools/index.ts:198] [E: packages/coding-agent/src/core/tools/index.ts:204] [E: packages/coding-agent/src/core/tools/index.ts:206]。

`createAllToolDefinitions()` 的 record 有 `powershell: createPowerShellToolDefinition(cwd, options?.powershell)` [E: packages/coding-agent/src/core/tools/index.ts:182] [E: packages/coding-agent/src/core/tools/index.ts:186]。`createAllTools()` 同样有 `powershell: createPowerShellTool(cwd, options?.powershell)` [E: packages/coding-agent/src/core/tools/index.ts:213] [E: packages/coding-agent/src/core/tools/index.ts:217]。barrel 从 `powershell.ts` re-export `createLocalPowerShellOperations`、`createPowerShellTool`、`createPowerShellToolDefinition` 和全部 `PowerShell*` 类型 [E: packages/coding-agent/src/core/tools/index.ts:46] [E: packages/coding-agent/src/core/tools/index.ts:47] [E: packages/coding-agent/src/core/tools/index.ts:48] [E: packages/coding-agent/src/core/tools/index.ts:49]。

`AgentSession._buildRuntime()` 在没有 `_baseToolsOverride` 时调用 `createAllToolDefinitions(this._cwd, { read: { autoResizeImages }, bash: { commandPrefix: shellCommandPrefix, shellPath } })`; 这个 options 对象没有 `powershell` key, 因此 session 装配使用 `createLocalPowerShellOperations()` 默认 backend, 也不会把 `shellCommandPrefix` / `shellPath` 传给 powershell [E: packages/coding-agent/src/core/agent-session.ts:2772] [E: packages/coding-agent/src/core/agent-session.ts:2773] [E: packages/coding-agent/src/core/agent-session.ts:2774] [E: packages/coding-agent/src/core/tools/powershell.ts:55]。默认 active built-in names 是 `["read", "bash", "edit", "write"]`, 不含 `powershell` [E: packages/coding-agent/src/core/agent-session.ts:2803]。`createAgentSession()` 的 SDK 回落 active set 同样是 `["read", "bash", "edit", "write"]`; 若 `settingsManager.getDefaultTools()` 有值, 就用它作为 initial built-in names [E: packages/coding-agent/src/core/sdk.ts:256] [E: packages/coding-agent/src/core/sdk.ts:257] [E: packages/coding-agent/src/core/sdk.ts:262]。`Settings.defaultTools` 的注释是 `Initial built-in tool selection`; `getDefaultTools()` 存在则浅拷贝返回 [E: packages/coding-agent/src/core/settings-manager.ts:128] [E: packages/coding-agent/src/core/settings-manager.ts:1273] [E: packages/coding-agent/src/core/settings-manager.ts:1275]。

测试覆盖: 配置 `defaultTools: ["read", "powershell", "edit", "write"]` 后, `getActiveToolNames()` 等于该列表, system prompt 含 `- powershell: Execute PowerShell commands`, 且不含 `- bash:` [E: packages/coding-agent/test/default-tools-setting.test.ts:73] [E: packages/coding-agent/test/default-tools-setting.test.ts:76] [E: packages/coding-agent/test/default-tools-setting.test.ts:77] [E: packages/coding-agent/test/default-tools-setting.test.ts:78]。同一测试里, 即便 active set 只有 `grep`/`find`, `getAllTools()` 仍包含 `powershell` 作为 registry 成员 [E: packages/coding-agent/test/default-tools-setting.test.ts:66]。CLI help 把 `powershell` 列进 Built-in Tool Names, 说明是 `Execute PowerShell commands on Windows` [E: packages/coding-agent/src/cli/args.ts:440]。

`buildSystemPrompt()` 用 `tools.includes("powershell")` 得到 `hasPowerShell`; 当存在 bash/powershell 且没有 grep/find/ls 时, 按组合写入 file-operations guideline [E: packages/coding-agent/src/core/system-prompt.ts:98] [E: packages/coding-agent/src/core/system-prompt.ts:105] [E: packages/coding-agent/src/core/system-prompt.ts:106] [E: packages/coding-agent/src/core/system-prompt.ts:108] [E: packages/coding-agent/src/core/system-prompt.ts:111]。

## 7 execute() 走读

1. 工厂阶段选择执行后端: `options.operations` 优先, 否则 `createLocalPowerShellOperations()` [E: packages/coding-agent/src/core/tools/powershell.ts:55]。
2. `createLocalPowerShellOperations()` 先用 `createLocalShellOperations("PowerShell", getPowerShellConfig)` 拿到共享 local spawn backend, 再把 `exec` 包一层: 实际 command 是 `` `${UTF8_OUTPUT_PREFIX}${command}` `` [E: packages/coding-agent/src/core/tools/powershell.ts:32] [E: packages/coding-agent/src/core/tools/powershell.ts:33] [E: packages/coding-agent/src/core/tools/powershell.ts:35]。`UTF8_OUTPUT_PREFIX` 是 `try { [Console]::OutputEncoding=[System.Text.Encoding]::UTF8 } catch {}\n` [E: packages/coding-agent/src/core/tools/powershell.ts:16]。
3. 进入 `createShellToolDefinition().execute()` 后, 若调用方传了 `commandPrefix` 会再拼到 command 前面; `PowerShellToolOptions` 类型不含该字段, `_buildRuntime` 也不传入 [E: packages/coding-agent/src/core/tools/bash.ts:362] [E: packages/coding-agent/src/core/tools/powershell.ts:30] [E: packages/coding-agent/src/core/agent-session.ts:2774]。
4. `resolveSpawnContext()` 清理/注入 `PI_*`, 然后 `OutputAccumulator({ tempFilePrefix: "pi-powershell" })` 收 `onData` [E: packages/coding-agent/src/core/tools/bash.ts:363] [E: packages/coding-agent/src/core/tools/bash.ts:364]。
5. `ops.exec()` 接收已加 UTF-8 prefix 的 command、cwd、`onData`、`signal`、`timeout` 和 resolved env [E: packages/coding-agent/src/core/tools/bash.ts:451] [E: packages/coding-agent/src/core/tools/powershell.ts:35]。
6. `getPowerShellConfig()` 在非 Windows 上立刻抛 `The powershell tool is only available on Windows.` [E: packages/coding-agent/src/utils/shell.ts:126] [E: packages/coding-agent/src/utils/shell.ts:127]。Windows 上按 PATH 找 `pwsh.exe`, 找不到再找 `powershell.exe`; 都没有则抛 `No PowerShell executable found...` [E: packages/coding-agent/src/utils/shell.ts:130] [E: packages/coding-agent/src/utils/shell.ts:132]。找到后返回 `{ shell, args: [...POWERSHELL_ARGS] }`, 其中 `POWERSHELL_ARGS` 是 `-NoProfile -NonInteractive -ExecutionPolicy Bypass -Command` [E: packages/coding-agent/src/utils/shell.ts:122] [E: packages/coding-agent/src/utils/shell.ts:135]。
7. `createLocalShellOperations()` 再 `spawn(shell, [...args, command])`, 合并 stdout/stderr, 并用 timeout/abort 杀进程树 [E: packages/coding-agent/src/core/tools/bash.ts:99] [E: packages/coding-agent/src/core/tools/bash.ts:126] [E: packages/coding-agent/src/core/tools/bash.ts:127] [E: packages/coding-agent/src/core/tools/bash.ts:120]。
8. 成功/非零/abort/timeout 的收尾与 bash 共享同一 `finishOutput()` / `formatOutput()` 路径 [E: packages/coding-agent/src/core/tools/bash.ts:471] [E: packages/coding-agent/src/core/tools/bash.ts:473] [E: packages/coding-agent/src/core/tools/bash.ts:476]。

Windows 集成测试在 `win32` 上执行 `Write-Output 'héllo €'; Get-ExecutionPolicy -Scope Process`, 期望输出含 `héllo €` 和 `Bypass`; 非 Windows 跳过该用例 [E: packages/coding-agent/test/powershell-tool.test.ts:17] [E: packages/coding-agent/test/powershell-tool.test.ts:23] [E: packages/coding-agent/test/powershell-tool.test.ts:27] [E: packages/coding-agent/test/powershell-tool.test.ts:28]。另一条测试断言 `POWERSHELL_ARGS` 精确等于那五个 argv token [E: packages/coding-agent/test/powershell-tool.test.ts:13] [E: packages/coding-agent/test/powershell-tool.test.ts:14]。

## 8 设计动机·edge

- Thin wrapper: `powershell.ts` 自己只提供 config、UTF-8 prefix 和 Windows shell resolver; execute/截断/renderer 全部在 `createShellToolDefinition` / `createLocalShellOperations` [E: packages/coding-agent/src/core/tools/powershell.ts:39] [E: packages/coding-agent/src/core/tools/powershell.ts:53] [E: packages/coding-agent/src/core/tools/bash.ts:84] [E: packages/coding-agent/src/core/tools/bash.ts:338] [I]。
- UTF-8 prefix 只包在默认 local operations 上: 若调用方传入自定义 `operations`, prefix 不会自动加 [E: packages/coding-agent/src/core/tools/powershell.ts:35] [E: packages/coding-agent/src/core/tools/powershell.ts:55] [I]。
- Platform gate 在 `getPowerShellConfig()`, 不在 registry: 非 Windows 上 `createAllToolDefinitions()` 仍会创建 `powershell` definition, 真正 `exec` 才抛 Windows-only 错误 [E: packages/coding-agent/src/core/tools/index.ts:186] [E: packages/coding-agent/src/utils/shell.ts:126] [E: packages/coding-agent/src/utils/shell.ts:127]。
- Optional activation: 工具在八成员 registry 里, 但不在 coding/read-only preset, 也不在默认 active set; Windows 文档和 `defaultTools` 测试把它当成可替换 `bash` 的 optional native shell [E: packages/coding-agent/src/core/tools/index.ts:167] [E: packages/coding-agent/src/core/agent-session.ts:2803] [E: packages/coding-agent/docs/windows.md:13] [E: packages/coding-agent/test/default-tools-setting.test.ts:73]。
- No `shellPath` / `commandPrefix` on `PowerShellToolOptions`: settings 的 `shellPath` / `shellCommandPrefix` 只传给 `_buildRuntime` 的 `bash` options [E: packages/coding-agent/src/core/tools/powershell.ts:30] [E: packages/coding-agent/src/core/agent-session.ts:2774]。
- `!` / `!!` 与 `AgentSession.executeBash()` 仍走 bash executor, 不因启用 powershell tool 而改道 [E: packages/coding-agent/docs/windows.md:31] [E: packages/coding-agent/src/core/agent-session.ts:2976] [E: packages/coding-agent/src/core/agent-session.ts:2990]。
- Extension 事件有独立的 `PowerShellToolCallEvent` / `PowerShellToolResultEvent`, `toolName` 字面量是 `"powershell"` [E: packages/coding-agent/src/core/extensions/types.ts:899] [E: packages/coding-agent/src/core/extensions/types.ts:900] [E: packages/coding-agent/src/core/extensions/types.ts:971] [E: packages/coding-agent/src/core/extensions/types.ts:972]。

## Sources

- packages/coding-agent/src/core/tools/powershell.ts
- packages/coding-agent/src/core/tools/bash.ts
- packages/coding-agent/src/core/tools/index.ts
- packages/coding-agent/src/core/agent-session.ts
- packages/coding-agent/src/core/system-prompt.ts
- packages/coding-agent/src/core/sdk.ts
- packages/coding-agent/src/core/settings-manager.ts
- packages/coding-agent/src/core/tools/tool-definition-wrapper.ts
- packages/coding-agent/src/core/tools/truncate.ts
- packages/coding-agent/src/utils/shell.ts
- packages/coding-agent/src/cli/args.ts
- packages/coding-agent/src/core/extensions/types.ts
- packages/coding-agent/docs/windows.md
- packages/coding-agent/docs/environment-variables.md
- packages/agent/src/agent.ts
- packages/agent/src/agent-loop.ts
- packages/agent/src/types.ts
- packages/coding-agent/test/powershell-tool.test.ts
- packages/coding-agent/test/default-tools-setting.test.ts

## 相关

- [surface.tools.bash](./bash.md): shared shell factory (`createShellToolDefinition` / `createLocalShellOperations` / `ShellToolConfig`) 的权威节点; `powershell` 是该工厂的 Windows 薄封装。
- [spine.tool-call-anatomy](../../spine/tool-call-anatomy.md): agent-core 如何准备、执行和回填 tool call; `powershell` 通过 `AgentTool` shape 进入这条 loop。
- [subsys.coding-agent.output-truncation](../../subsystems/coding-agent/output-truncation.md): `OutputAccumulator`、`truncateTail()` 和 `fullOutputPath` 的共享截断机制。
- [ref.tools-catalog](../../reference/tools-catalog.md): 内置工具 ground truth catalog, 覆盖八个 `ToolName`、presets 和 registry。
- [ref.coding-agent.env-vars](../../reference/env-vars.md): `PI_SESSION_*`、model/provider/reasoning 子进程变量的逐实例目录。
