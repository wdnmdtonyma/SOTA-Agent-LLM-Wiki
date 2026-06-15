---
id: tool.powershell
title: PowerShell
kind: tool
tier: T1
path: surface/tools/powershell.md
status: verified
source: [tools/PowerShellTool/PowerShellTool.tsx, tools/PowerShellTool/toolName.ts, tools/PowerShellTool/prompt.ts, tools/PowerShellTool/UI.tsx, tools/PowerShellTool/powershellPermissions.ts, tools/PowerShellTool/readOnlyValidation.ts, utils/shell/shellToolUtils.ts, tools.ts, Tool.ts]
symbols: [PowerShellTool, PowerShellToolInput, Out, POWERSHELL_TOOL_NAME]
related: [tool.bash, tool.grep, tool.glob]
updated: 2026-06-14
evidence: explicit
---

`PowerShell` 是 Windows PowerShell command execution tool, 通过 Windows-only runtime gate 加入工具池, 并复用 shell task/progress/large-output 框架但使用 PowerShell 专属的 read-only 和 permission engine。[E: tools/PowerShellTool/toolName.ts:2][E: utils/shell/shellToolUtils.ts:17][E: tools.ts:150][E: tools/PowerShellTool/PowerShellTool.tsx:272]

## 能回答的问题

- `PowerShell` 在什么环境下出现在工具列表?
- `PowerShell` 的 `isReadOnly` 为什么只是同步启发式, 真正自动放行在哪里发生?
- `PowerShell` 和 `Bash` 的 background/progress/large-output 行为有哪些相同点和不同点?
- PowerShell permission flow 怎样处理 parse failure、sub-command deny、path constraints 和 read-only allowlist?

## 1 Identity

- Tool name: `PowerShell`。[E: tools/PowerShellTool/toolName.ts:2]
- `tools.ts` 通过 `getPowerShellTool()` lazy require `PowerShellTool`; `getAllBaseTools()` 只在 `getPowerShellTool()` 返回非 null 时加入该工具。[E: tools.ts:150][E: tools.ts:153][E: tools.ts:242]
- `isPowerShellToolEnabled()` 要求平台是 windows; ant 用户默认启用但可用 `CLAUDE_CODE_USE_POWERSHELL_TOOL=0` opt out, external 用户默认关闭且需 env truthy opt in。[E: utils/shell/shellToolUtils.ts:17][E: utils/shell/shellToolUtils.ts:18][E: utils/shell/shellToolUtils.ts:19][E: utils/shell/shellToolUtils.ts:20][E: utils/shell/shellToolUtils.ts:21]
- `searchHint`: `execute Windows PowerShell commands`。[E: tools/PowerShellTool/PowerShellTool.tsx:274]
- `maxResultSizeChars`: `30_000`。[E: tools/PowerShellTool/PowerShellTool.tsx:275]
- `strict`: `true`。[E: tools/PowerShellTool/PowerShellTool.tsx:276]
- `description(input)`: 有 `description` 时返回它, 否则返回 `Run PowerShell command`。[E: tools/PowerShellTool/PowerShellTool.tsx:277][E: tools/PowerShellTool/PowerShellTool.tsx:280]

## 2 用途定位

`PowerShell` prompt 定位为执行 PowerShell terminal operations, 包括 git、npm、docker 和 PS cmdlets; prompt 明确要求文件读写搜索优先使用 dedicated tools, 不要用 PowerShell 替代 `Glob`、`Grep`、`Read`、`Edit` 或 `Write`。[E: tools/PowerShellTool/prompt.ts:78][E: tools/PowerShellTool/prompt.ts:80][E: tools/PowerShellTool/prompt.ts:127][E: tools/PowerShellTool/prompt.ts:128][E: tools/PowerShellTool/prompt.ts:129][E: tools/PowerShellTool/prompt.ts:130][E: tools/PowerShellTool/prompt.ts:131][E: tools/PowerShellTool/prompt.ts:132]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 模型可见 | 说明 |
| --- | --- | --- | --- | --- | --- |
| `command` | `string` | 是 | 无 | 是 | 要执行的 PowerShell command。[E: tools/PowerShellTool/PowerShellTool.tsx:228] |
| `timeout` | semantic number | 否 | `getDefaultTimeoutMs()` | 是 | 毫秒超时, schema 描述包含 `getMaxTimeoutMs()` 上限, 执行时再用 `Math.min(timeout || default, max)` 兜底。[E: tools/PowerShellTool/PowerShellTool.tsx:230][E: tools/PowerShellTool/PowerShellTool.tsx:698] |
| `description` | `string` | 否 | 无 | 是 | 主动语态描述, 用于 summary/activity/background task description。[E: tools/PowerShellTool/PowerShellTool.tsx:231][E: tools/PowerShellTool/PowerShellTool.tsx:329][E: tools/PowerShellTool/PowerShellTool.tsx:769] |
| `run_in_background` | semantic boolean | 否 | `false` 行为 | 条件可见 | 背景任务未禁用时可见; `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS` truthy 时从 schema omit。[E: tools/PowerShellTool/PowerShellTool.tsx:232][E: tools/PowerShellTool/PowerShellTool.tsx:237] |
| `dangerouslyDisableSandbox` | semantic boolean | 否 | `false` 行为 | 是 | 可请求绕过 sandbox, 实际是否 sandbox 由 `shouldUseSandbox(...)` 和 platform/policy 决定。[E: tools/PowerShellTool/PowerShellTool.tsx:233][E: tools/PowerShellTool/PowerShellTool.tsx:746] |

## 4 输出 & maxResultSizeChars

输出包含 `stdout`、`stderr`、`interrupted`、可选 `returnCodeInterpretation`、`isImage`、`persistedOutputPath`、`persistedOutputSize`、`backgroundTaskId`、`backgroundedByUser` 和 `assistantAutoBackgrounded`。[E: tools/PowerShellTool/PowerShellTool.tsx:245][E: tools/PowerShellTool/PowerShellTool.tsx:248][E: tools/PowerShellTool/PowerShellTool.tsx:249][E: tools/PowerShellTool/PowerShellTool.tsx:250][E: tools/PowerShellTool/PowerShellTool.tsx:251][E: tools/PowerShellTool/PowerShellTool.tsx:253][E: tools/PowerShellTool/PowerShellTool.tsx:254][E: tools/PowerShellTool/PowerShellTool.tsx:255] `mapToolResultToToolResultBlockParam()` 对 image stdout 生成 image block, 对 persisted output 生成 preview/path message, 对 interrupted 命令追加 error marker, 对 background task 返回 task id 和 output path 信息。[E: tools/PowerShellTool/PowerShellTool.tsx:395][E: tools/PowerShellTool/PowerShellTool.tsx:400][E: tools/PowerShellTool/PowerShellTool.tsx:415][E: tools/PowerShellTool/PowerShellTool.tsx:420]

`maxResultSizeChars=30_000`; 大输出持久化上限是 `64 * 1024 * 1024` bytes, 超过时先 truncate 再 hardlink/copy 到 tool-results path。[E: tools/PowerShellTool/PowerShellTool.tsx:275][E: tools/PowerShellTool/PowerShellTool.tsx:596][E: tools/PowerShellTool/PowerShellTool.tsx:605][E: tools/PowerShellTool/PowerShellTool.tsx:609]

## 5 行为标志

| 标志 | 实际值 | 说明 |
| --- | --- | --- |
| `isEnabled()` | `true` | registry gate 已在 `tools.ts`/`isPowerShellToolEnabled()` 完成, tool object 自身 always enabled。[E: tools/PowerShellTool/PowerShellTool.tsx:350] |
| `isReadOnly(input)` | 同步启发式 | 先用 `hasSyncSecurityConcerns()` 拒绝 subexpression/splat/member invocation/assignment/UNC/static method 等风险, 再调用没有 AST 的 `isReadOnlyCommand(input.command)`; 没有 parsed AST 时 `isReadOnlyCommand` 保守返回 false。[E: tools/PowerShellTool/PowerShellTool.tsx:300][E: tools/PowerShellTool/PowerShellTool.tsx:306][E: tools/PowerShellTool/PowerShellTool.tsx:315][E: tools/PowerShellTool/readOnlyValidation.ts:1112][E: tools/PowerShellTool/readOnlyValidation.ts:1177] |
| `isConcurrencySafe(input)` | 等于 `isReadOnly(input)` | 源码返回 `this.isReadOnly?.(input) ?? false`。[E: tools/PowerShellTool/PowerShellTool.tsx:286] |
| `isDestructive` | 默认 `false` | 未看到自定义 `isDestructive`; `buildTool` 默认 `false`, 风险由 permission engine 和 mode/path validation 判断。[I][E: Tool.ts:761][E: tools/PowerShellTool/powershellPermissions.ts:1271] |
| `shouldDefer` | 未声明 | `PowerShellTool` 未看到 `shouldDefer: true`; 它是 registry-gated shell tool, 不是 ToolSearch deferred tool。[I][E: tools.ts:242] |
| `isSearchOrReadCommand(input)` | 动态 | 空 command 返回 false; 非空 command 调用 `isSearchOrReadPowerShellCommand()` 识别 search/read cmdlets。[E: tools/PowerShellTool/PowerShellTool.tsx:288][E: tools/PowerShellTool/PowerShellTool.tsx:292][E: tools/PowerShellTool/PowerShellTool.tsx:298] |
| `isResultTruncated(output)` | stdout 或 stderr line truncated | 返回 `isOutputLineTruncated(output.stdout) || isOutputLineTruncated(output.stderr)`。[E: tools/PowerShellTool/PowerShellTool.tsx:660] |

## 6 权限

`validateInput()` 先检查 native Windows sandbox policy violation; 如果 enterprise policy 要求 sandbox 但 native Windows 不支持 sandbox 且不允许 unsandboxed commands, validation 返回 errorCode 11。[E: tools/PowerShellTool/PowerShellTool.tsx:352][E: tools/PowerShellTool/PowerShellTool.tsx:354][E: tools/PowerShellTool/PowerShellTool.tsx:358] `MONITOR_TOOL` 开启、背景任务未禁用且未显式后台时, `detectBlockedSleepPattern()` 会拦截前置 `Start-Sleep`/`sleep` 大于等于 2 秒的阻塞命令。[E: tools/PowerShellTool/PowerShellTool.tsx:189][E: tools/PowerShellTool/PowerShellTool.tsx:200][E: tools/PowerShellTool/PowerShellTool.tsx:361]

`checkPermissions()` 委托 `powershellToolHasPermission(input, context)`。[E: tools/PowerShellTool/PowerShellTool.tsx:375] permission 主流程先取 `toolPermissionContext` 和 trimmed command, 空 command 直接 allow, 然后 parse PowerShell command。[E: tools/PowerShellTool/powershellPermissions.ts:643][E: tools/PowerShellTool/powershellPermissions.ts:647][E: tools/PowerShellTool/powershellPermissions.ts:659] explicit exact deny 优先返回 deny; prefix deny 也优先返回 deny; prefix ask 和 raw UNC ask 会先暂存, 以便后续 sub-command deny 仍能压过 ask。[E: tools/PowerShellTool/powershellPermissions.ts:665][E: tools/PowerShellTool/powershellPermissions.ts:671][E: tools/PowerShellTool/powershellPermissions.ts:676][E: tools/PowerShellTool/powershellPermissions.ts:683][E: tools/PowerShellTool/powershellPermissions.ts:701][E: tools/PowerShellTool/powershellPermissions.ts:717]

解析失败时, permission flow 会做 fallback fragment deny scan、危险 `Remove-Item` raw path deny, 然后优先返回 pre-parse ask, 否则返回 malformed syntax ask。[E: tools/PowerShellTool/powershellPermissions.ts:764][E: tools/PowerShellTool/powershellPermissions.ts:787][E: tools/PowerShellTool/powershellPermissions.ts:833][E: tools/PowerShellTool/powershellPermissions.ts:858][E: tools/PowerShellTool/powershellPermissions.ts:865] 解析成功后, post-parse decisions 收集 security ask、using/#Requires ask、provider/UNC ask、per-sub-command deny/ask、cd+git ask、git safety ask、path constraints、exact allow、read-only allow、file redirection ask 和 mode result, 最后按 deny > ask > allow > passthrough reduce。[E: tools/PowerShellTool/powershellPermissions.ts:900][E: tools/PowerShellTool/powershellPermissions.ts:912][E: tools/PowerShellTool/powershellPermissions.ts:940][E: tools/PowerShellTool/powershellPermissions.ts:1003][E: tools/PowerShellTool/powershellPermissions.ts:1059][E: tools/PowerShellTool/powershellPermissions.ts:1088][E: tools/PowerShellTool/powershellPermissions.ts:1097][E: tools/PowerShellTool/powershellPermissions.ts:1139][E: tools/PowerShellTool/powershellPermissions.ts:1271][E: tools/PowerShellTool/powershellPermissions.ts:1307][E: tools/PowerShellTool/powershellPermissions.ts:1322][E: tools/PowerShellTool/powershellPermissions.ts:1337][E: tools/PowerShellTool/powershellPermissions.ts:1349][E: tools/PowerShellTool/powershellPermissions.ts:1357]

## 7 call() 走读

`call()` 第一行 load-bearing guard 再次执行 native Windows sandbox policy refusal, 因为 `promptShellExecution.ts` 和 `processBashCommand.tsx` 可能直接调用 `PowerShellTool.call()` 而绕过 validation。[E: tools/PowerShellTool/PowerShellTool.tsx:440][E: tools/PowerShellTool/PowerShellTool.tsx:444] 然后 `call()` 创建 `runPowerShellCommand(...)` generator, 循环消费 progress 并通过 `onProgress` 发送 `powershell_progress`。[E: tools/PowerShellTool/PowerShellTool.tsx:455][E: tools/PowerShellTool/PowerShellTool.tsx:468][E: tools/PowerShellTool/PowerShellTool.tsx:472][E: tools/PowerShellTool/PowerShellTool.tsx:475]

命令完成后, `call()` 跳过 pre-flight sentinel 的 git tracking, 区分 user interrupt, 在主线程检查是否需要 reset cwd, 背景任务则提前返回 task id 和 stripped hints。[E: tools/PowerShellTool/PowerShellTool.tsx:502][E: tools/PowerShellTool/PowerShellTool.tsx:511][E: tools/PowerShellTool/PowerShellTool.tsx:520][E: tools/PowerShellTool/PowerShellTool.tsx:531][E: tools/PowerShellTool/PowerShellTool.tsx:536] 非背景路径会解释 return code, preSpawnError 直接 throw, semantic error 且非 user interrupt 时抛 `ShellError`, 然后处理 large output persistence、image resize、analytics 和最终 output。[E: tools/PowerShellTool/PowerShellTool.tsx:555][E: tools/PowerShellTool/PowerShellTool.tsx:580][E: tools/PowerShellTool/PowerShellTool.tsx:583][E: tools/PowerShellTool/PowerShellTool.tsx:599][E: tools/PowerShellTool/PowerShellTool.tsx:622][E: tools/PowerShellTool/PowerShellTool.tsx:637][E: tools/PowerShellTool/PowerShellTool.tsx:644]

`runPowerShellCommand()` 会用 `getCachedPowerShellPath()` 做 pre-flight; 找不到 PowerShell 时返回 code 0 + stderr, 让 call 以普通 stderr 显示而不是抛 `ShellError`。[E: tools/PowerShellTool/PowerShellTool.tsx:717][E: tools/PowerShellTool/PowerShellTool.tsx:722] 真正执行时调用 `exec(command, abortController.signal, 'powershell', { timeout, onProgress, preventCwdChanges, shouldUseSandbox, shouldAutoBackground })`; native Windows 下 `shouldUseSandbox` 强制 false, 非 Windows/WSL/macOS/Linux 下才委托 Bash sandbox policy。[E: tools/PowerShellTool/PowerShellTool.tsx:731][E: tools/PowerShellTool/PowerShellTool.tsx:746] 显式 `run_in_background` 且背景任务未禁用时, generator 立即 spawn background task 并返回 `backgroundTaskId`。[E: tools/PowerShellTool/PowerShellTool.tsx:845][E: tools/PowerShellTool/PowerShellTool.tsx:846][E: tools/PowerShellTool/PowerShellTool.tsx:850]

## 8 渲染

`PowerShellTool` 使用 `renderToolUseMessage`、`renderToolUseProgressMessage`、`renderToolUseQueuedMessage`、`renderToolResultMessage` 和 `renderToolUseErrorMessage`。[E: tools/PowerShellTool/PowerShellTool.tsx:378][E: tools/PowerShellTool/PowerShellTool.tsx:379][E: tools/PowerShellTool/PowerShellTool.tsx:380][E: tools/PowerShellTool/PowerShellTool.tsx:381][E: tools/PowerShellTool/PowerShellTool.tsx:382] UI 中 command 非 verbose 时最多显示 2 行或 160 chars; result UI 对 image 输出显示 image notice, 对 stdout/stderr 使用 shell `OutputLine`, 对 background task 显示 "Running in the background" 管理提示。[E: tools/PowerShellTool/UI.tsx:17][E: tools/PowerShellTool/UI.tsx:18][E: tools/PowerShellTool/UI.tsx:33][E: tools/PowerShellTool/UI.tsx:99][E: tools/PowerShellTool/UI.tsx:104][E: tools/PowerShellTool/UI.tsx:107]

## 9 设计动机·edge·历史

- `PowerShellTool.isReadOnly()` 由于同步接口拿不到 AST, 因而只适合 quick classification; permission engine 在 `powershellToolHasPermission()` 中拿到 parsed AST 后才执行 read-only auto-allow。[E: tools/PowerShellTool/PowerShellTool.tsx:309][E: tools/PowerShellTool/powershellPermissions.ts:1322]
- `isReadOnlyCommand()` 要求 parsed AST valid、无 script blocks/subexpressions/splatting/member invocations/assignments/stop-parsing 等风险, 并且每条 pipeline 的 first command 必须 allowlisted。[E: tools/PowerShellTool/readOnlyValidation.ts:1182][E: tools/PowerShellTool/readOnlyValidation.ts:1187][E: tools/PowerShellTool/readOnlyValidation.ts:1191][E: tools/PowerShellTool/readOnlyValidation.ts:1259]
- compound command 中包含 cwd-changing cmdlet 与其它 command 时, read-only auto-allow 会 fail closed, 避免后续 relative path 按运行时 cwd 解析而绕过 validator cwd。[E: tools/PowerShellTool/readOnlyValidation.ts:1227][E: tools/PowerShellTool/readOnlyValidation.ts:1228][E: tools/PowerShellTool/readOnlyValidation.ts:1231]
- PowerShell prompt 会根据 `getPowerShellEdition()` 给 Windows PowerShell 5.1、PowerShell 7+ 或 unknown edition 不同语法指导。[E: tools/PowerShellTool/prompt.ts:51][E: tools/PowerShellTool/prompt.ts:52][E: tools/PowerShellTool/prompt.ts:60][E: tools/PowerShellTool/prompt.ts:68]

## Sources

- `tools/PowerShellTool/PowerShellTool.tsx`
- `tools/PowerShellTool/toolName.ts`
- `tools/PowerShellTool/prompt.ts`
- `tools/PowerShellTool/UI.tsx`
- `tools/PowerShellTool/powershellPermissions.ts`
- `tools/PowerShellTool/readOnlyValidation.ts`
- `utils/shell/shellToolUtils.ts`
- `tools.ts`
- `Tool.ts`

## 相关

- [Bash](bash.md)
- [Grep](grep.md)
- [Glob](glob.md)
