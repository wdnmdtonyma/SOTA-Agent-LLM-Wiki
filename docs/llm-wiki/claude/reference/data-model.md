---
id: ref.data-model
title: 数据模型
kind: reference
tier: T3
path: reference/data-model.md
source: [types/, types/hooks.ts, types/permissions.ts]
evidence: explicit
status: verified
updated: 2026-06-14
---

> 数据模型 reference 汇总 `Best/claude/types/` 下可见的 command、hook、permission、plugin、log、ID、text input 与 generated event 类型；chat message 的权威 `types/message.ts` 在当前源码 dump 缺失，运行时 message 形状由 `utils/messages.ts` 构造函数补证。

## 能回答的问题

- `PermissionResult`、`PermissionDecisionReason`、`ToolPermissionContext` 的 union 结构是什么？
- hook JSON 输出支持哪些 `hookSpecificOutput.hookEventName` 分支？
- `Command` 如何把 prompt/local/local-jsx 三类命令合成一个 union？
- session transcript 的 `Entry` union 包含哪些持久化记录？
- `types/message.ts` 不存在时，当前 dump 里哪里能核到 message 的运行时对象形状？
- generated telemetry event 里有哪些 environment/account/message 函数模型？

## Message 模型

`Tool.ts`、`utils/messages.ts`、`types/hooks.ts` 等文件都从 `./types/message.js` 或 `src/types/message.js` 导入 `Message`、`UserMessage`、`AssistantMessage`、`ProgressMessage` 等类型，但 `Best/claude/types/` 目录下没有 `message.ts` 文件；当前 dump 可见的 `types/` 文件列表只包含 `command.ts`、`generated/`、`hooks.ts`、`ids.ts`、`logs.ts`、`permissions.ts`、`plugin.ts`、`textInputTypes.ts`。[E: Tool.ts:33][E: Tool.ts:35][E: Tool.ts:36][E: Tool.ts:39][E: Tool.ts:40][E: utils/messages.ts:42][E: utils/messages.ts:44][E: utils/messages.ts:50][E: utils/messages.ts:72][E: utils/messages.ts:73][E: types/hooks.ts:15][U] 因此，本页把 chat message 的 TypeScript 权威定义标为缺失，把 `utils/messages.ts` 的构造函数视为运行时形状证据。[I]

| 类型/函数 | 签名/形状 | 含义 | 定义处 |
|---|---|---|---|
| `createAssistantMessage` | `content: string | BetaContentBlock[]` → `AssistantMessage` | 创建 `type: 'assistant'`、`uuid`、`timestamp`、`message.role: 'assistant'`、`message.content` 的 assistant message；空字符串会变成 `NO_CONTENT_MESSAGE`。[E: utils/messages.ts:387][E: utils/messages.ts:388][E: utils/messages.ts:389][E: utils/messages.ts:394][E: utils/messages.ts:399][E: utils/messages.ts:426] | `utils/messages.ts` |
| `createUserMessage` | `content: string | ContentBlockParam[]` → `UserMessage` | 创建 `type: 'user'`、`message.role: 'user'`、`uuid`、`timestamp`，并携带 `toolUseResult`、`mcpMeta`、`permissionMode`、`origin` 等可选元数据。[E: utils/messages.ts:503][E: utils/messages.ts:505][E: utils/messages.ts:513][E: utils/messages.ts:514][E: utils/messages.ts:515][E: utils/messages.ts:516][E: utils/messages.ts:519][E: utils/messages.ts:520] | `utils/messages.ts` |
| `createProgressMessage` | `{ toolUseID, parentToolUseID, data }` → `ProgressMessage<P>` | 创建 `type: 'progress'` 的进度消息，绑定当前 tool use 与 parent tool use，并附 `uuid`/`timestamp`。[E: utils/messages.ts:613][E: utils/messages.ts:614][E: utils/messages.ts:615][E: utils/messages.ts:616][E: utils/messages.ts:617][E: utils/messages.ts:618] | `utils/messages.ts` |
| `normalizeMessages` | overload: assistant/user/mixed/message arrays → normalized arrays | 把 assistant/user 多 content blocks 拆成单 block message；`deriveUUID` 用 parent UUID 与 index 生成稳定派生 UUID。[E: utils/messages.ts:731][E: utils/messages.ts:740][E: utils/messages.ts:725][E: utils/messages.ts:752][E: utils/messages.ts:797] | `utils/messages.ts` |
| `isToolUseRequestMessage` | `Message` → type guard | 判断 assistant message content 是否包含 `tool_use`；源码注释说明 `stop_reason === 'tool_use'` 不可靠，因此检查 content block。[E: utils/messages.ts:829][E: utils/messages.ts:833][E: utils/messages.ts:835] | `utils/messages.ts` |
| `isToolUseResultMessage` | `Message` → type guard | 判断 user message 是否是 `tool_result` content block，或是否带 `toolUseResult`。[E: utils/messages.ts:843][E: utils/messages.ts:847][E: utils/messages.ts:849][E: utils/messages.ts:850] | `utils/messages.ts` |
| `normalizeMessagesForAPI` | `(messages: Message[], tools?: Tools)` → `(UserMessage | AssistantMessage)[]` | API 发送前过滤 display-only virtual user/assistant messages，并只保留 user/assistant message 类型。[E: utils/messages.ts:1989][E: utils/messages.ts:1992][E: utils/messages.ts:1999][E: utils/messages.ts:2000] | `utils/messages.ts` |

## Permission 模型

| 类型/常量 | 签名/形状 | 含义 | 定义处 |
|---|---|---|---|
| `EXTERNAL_PERMISSION_MODES` | `['acceptEdits','bypassPermissions','default','dontAsk','plan']` | 用户可见 permission mode 基础集合。[E: types/permissions.ts:16] | `types/permissions.ts` |
| `ExternalPermissionMode` | `(typeof EXTERNAL_PERMISSION_MODES)[number]` | 从 `EXTERNAL_PERMISSION_MODES` 派生的外部 mode union。[E: types/permissions.ts:24] | `types/permissions.ts` |
| `InternalPermissionMode` | `ExternalPermissionMode | 'auto' | 'bubble'` | 内部 mode 在外部 mode 之外增加 `auto` 和 `bubble`。[E: types/permissions.ts:28] | `types/permissions.ts` |
| `PermissionMode` | `InternalPermissionMode` | permission mode 的统一类型别名。[E: types/permissions.ts:29] | `types/permissions.ts` |
| `INTERNAL_PERMISSION_MODES` | external modes + gated `auto` | 运行时 validation set 在 `TRANSCRIPT_CLASSIFIER` feature 打开时追加 `auto`。[E: types/permissions.ts:33][E: types/permissions.ts:35] | `types/permissions.ts` |
| `PERMISSION_MODES` | `INTERNAL_PERMISSION_MODES` | 对外导出的 runtime mode 列表别名。[E: types/permissions.ts:38] | `types/permissions.ts` |
| `PermissionBehavior` | `'allow' | 'deny' | 'ask'` | permission rule/decision 的三态行为。[E: types/permissions.ts:44] | `types/permissions.ts` |
| `PermissionRuleSource` | settings/flag/policy/cli/command/session union | permission rule 来源包括 user/project/local/flag/policy settings、CLI arg、command、session。[E: types/permissions.ts:54] | `types/permissions.ts` |
| `PermissionRuleValue` | `{ toolName; ruleContent? }` | permission rule 指向一个 tool，可选附带内容 pattern。[E: types/permissions.ts:67] | `types/permissions.ts` |
| `PermissionRule` | `{ source; ruleBehavior; ruleValue }` | permission rule 同时携带来源、行为和 tool/pattern 值。[E: types/permissions.ts:75] | `types/permissions.ts` |
| `PermissionUpdateDestination` | user/project/local/session/cli union | permission update 可持久化到 user/project/local/session/cliArg。[E: types/permissions.ts:88] | `types/permissions.ts` |
| `PermissionUpdate` | `addRules`/`replaceRules`/`removeRules`/`setMode`/`addDirectories`/`removeDirectories` union | permission update 覆盖规则增删替换、mode 设置和 additional directory 增删。[E: types/permissions.ts:98][E: types/permissions.ts:117][E: types/permissions.ts:123][E: types/permissions.ts:128] | `types/permissions.ts` |
| `WorkingDirectorySource` | `PermissionRuleSource` | additional working directory 的 source 目前复用 permission rule source。[E: types/permissions.ts:138] | `types/permissions.ts` |
| `AdditionalWorkingDirectory` | `{ path; source }` | permission scope 里的额外目录条目。[E: types/permissions.ts:143] | `types/permissions.ts` |
| `PermissionCommandMetadata` | `{ name; description?; [key:string]: unknown }` | permission metadata 使用 command 的最小形状以避免 import cycle。[E: types/permissions.ts:157] | `types/permissions.ts` |
| `PermissionMetadata` | `{ command: PermissionCommandMetadata } | undefined` | permission decision 可附 command metadata。[E: types/permissions.ts:167] | `types/permissions.ts` |
| `PermissionAllowDecision` | `{ behavior:'allow'; updatedInput?; userModified?; ... }` | allow 结果可回传 updated input、userModified、decisionReason、toolUseID、feedback、content blocks。[E: types/permissions.ts:174][E: types/permissions.ts:177][E: types/permissions.ts:183] | `types/permissions.ts` |
| `PendingClassifierCheck` | `{ command; cwd; descriptions }` | ask/passthrough 可以附一个异步 classifier 检查请求。[E: types/permissions.ts:190] | `types/permissions.ts` |
| `PermissionAskDecision` | `{ behavior:'ask'; message; updatedInput?; suggestions?; ... }` | ask 结果包含展示消息、可选 updated input、建议、blocked path、metadata、classifier check 与 content blocks。[E: types/permissions.ts:199][E: types/permissions.ts:202][E: types/permissions.ts:220][E: types/permissions.ts:225] | `types/permissions.ts` |
| `PermissionDenyDecision` | `{ behavior:'deny'; message; decisionReason; toolUseID? }` | deny 结果必须携带 message 与 decisionReason。[E: types/permissions.ts:231][E: types/permissions.ts:232][E: types/permissions.ts:234] | `types/permissions.ts` |
| `PermissionDecision` | allow/ask/deny union | tool permission 的核心三分支 decision union。[E: types/permissions.ts:241][E: types/permissions.ts:244] | `types/permissions.ts` |
| `PermissionResult` | `PermissionDecision | { behavior:'passthrough'; ... }` | permission result 在三分支 decision 外增加 `passthrough` 分支。[E: types/permissions.ts:251][E: types/permissions.ts:256] | `types/permissions.ts` |
| `PermissionDecisionReason` | rule/mode/subcommand/tool/hook/asyncAgent/sandbox/classifier/workingDir/safety/other union | decision reason 统一记录规则命中、mode、subcommand results、permission prompt tool、hook、async agent、sandbox override、classifier、working dir、安全检查和 other 来源。[E: types/permissions.ts:271][E: types/permissions.ts:277][E: types/permissions.ts:281][E: types/permissions.ts:285][E: types/permissions.ts:290][E: types/permissions.ts:296][E: types/permissions.ts:300][E: types/permissions.ts:304][E: types/permissions.ts:309][E: types/permissions.ts:313][E: types/permissions.ts:322] | `types/permissions.ts` |
| `ClassifierResult` | `{ matches; matchedDescription?; confidence; reason }` | bash classifier 的基础判断结果。[E: types/permissions.ts:330] | `types/permissions.ts` |
| `ClassifierBehavior` | `'deny' | 'ask' | 'allow'` | classifier 输出可映射为 deny/ask/allow。[E: types/permissions.ts:337] | `types/permissions.ts` |
| `ClassifierUsage` | token usage fields | classifier API 调用的 token usage 结构。[E: types/permissions.ts:339] | `types/permissions.ts` |
| `YoloClassifierResult` | blocker/thinking/model/usage/duration/stage fields | auto/yolo classifier 结果包括 thinking、是否 block、模型、usage、duration、stage 与 request/message id。[E: types/permissions.ts:346][E: types/permissions.ts:347][E: types/permissions.ts:348][E: types/permissions.ts:358][E: types/permissions.ts:360][E: types/permissions.ts:362][E: types/permissions.ts:372][E: types/permissions.ts:382][E: types/permissions.ts:388][E: types/permissions.ts:394][E: types/permissions.ts:396] | `types/permissions.ts` |
| `RiskLevel` | `'LOW' | 'MEDIUM' | 'HIGH'` | permission explainer 的风险等级。[E: types/permissions.ts:403] | `types/permissions.ts` |
| `PermissionExplanation` | `{ riskLevel; explanation; reasoning; risk }` | permission explainer 的结构化输出。[E: types/permissions.ts:405] | `types/permissions.ts` |
| `ToolPermissionRulesBySource` | mapped source → string array | 按 permission source 分组的 rule 字符串集合。[E: types/permissions.ts:419] | `types/permissions.ts` |
| `ToolPermissionContext` | readonly mode/directories/rules/flags | tool permission checking 所需的只读 context，包含 mode、additional dirs、allow/deny/ask rules、bypass availability 与 prompt 控制 flags。[E: types/permissions.ts:427][E: types/permissions.ts:428][E: types/permissions.ts:433][E: types/permissions.ts:438] | `types/permissions.ts` |

## Hook 模型

| 类型/函数/schema | 签名/形状 | 含义 | 定义处 |
|---|---|---|---|
| `isHookEvent` | `(value: string) => value is HookEvent` | 通过 `HOOK_EVENTS.includes` 判断字符串是否是合法 HookEvent。[E: types/hooks.ts:22][E: types/hooks.ts:23] | `types/hooks.ts` |
| `promptRequestSchema` | `{ prompt; message; options[] }` | prompt elicitation 请求 schema，`prompt` 字段是 request id discriminator。[E: types/hooks.ts:28][E: types/hooks.ts:30][E: types/hooks.ts:32] | `types/hooks.ts` |
| `PromptRequest` | `z.infer<promptRequestSchema>` | 从 Zod schema 推导 prompt request 类型。[E: types/hooks.ts:42] | `types/hooks.ts` |
| `PromptResponse` | `{ prompt_response; selected }` | prompt elicitation 响应包含 request id 与 selected key。[E: types/hooks.ts:44] | `types/hooks.ts` |
| `syncHookResponseSchema` | object schema | sync hook response 支持 `continue`、`suppressOutput`、`stopReason`、`decision`、`reason`、`systemMessage` 与 `hookSpecificOutput`。[E: types/hooks.ts:50][E: types/hooks.ts:52][E: types/hooks.ts:64][E: types/hooks.ts:70] | `types/hooks.ts` |
| `hookSpecificOutput.PreToolUse` | `permissionDecision?`, `permissionDecisionReason?`, `updatedInput?`, `additionalContext?` | PreToolUse hook 可影响 permission decision、更新输入并追加上下文。[E: types/hooks.ts:72][E: types/hooks.ts:74][E: types/hooks.ts:76][E: types/hooks.ts:77] | `types/hooks.ts` |
| `hookSpecificOutput.UserPromptSubmit` | `additionalContext?` | UserPromptSubmit hook 可追加上下文。[E: types/hooks.ts:79][E: types/hooks.ts:81] | `types/hooks.ts` |
| `hookSpecificOutput.SessionStart` | `additionalContext?`, `initialUserMessage?`, `watchPaths?` | SessionStart hook 可追加上下文、设置初始用户消息和文件 watch paths。[E: types/hooks.ts:83][E: types/hooks.ts:86][E: types/hooks.ts:87] | `types/hooks.ts` |
| `hookSpecificOutput.Setup` | `additionalContext?` | Setup hook 输出可追加上下文。[E: types/hooks.ts:92][E: types/hooks.ts:94] | `types/hooks.ts` |
| `hookSpecificOutput.SubagentStart` | `additionalContext?` | SubagentStart hook 输出可追加上下文。[E: types/hooks.ts:96][E: types/hooks.ts:98] | `types/hooks.ts` |
| `hookSpecificOutput.PostToolUse` | `additionalContext?`, `updatedMCPToolOutput?` | PostToolUse hook 可追加上下文并更新 MCP tool output。[E: types/hooks.ts:100][E: types/hooks.ts:102][E: types/hooks.ts:103] | `types/hooks.ts` |
| `hookSpecificOutput.PostToolUseFailure` | `additionalContext?` | PostToolUseFailure hook 输出可追加上下文。[E: types/hooks.ts:108][E: types/hooks.ts:110] | `types/hooks.ts` |
| `hookSpecificOutput.PermissionDenied` | `retry?` | PermissionDenied hook 可请求 retry。[E: types/hooks.ts:112][E: types/hooks.ts:114] | `types/hooks.ts` |
| `hookSpecificOutput.Notification` | `additionalContext?` | Notification hook 可追加上下文。[E: types/hooks.ts:116][E: types/hooks.ts:118] | `types/hooks.ts` |
| `hookSpecificOutput.PermissionRequest` | allow/deny decision union | PermissionRequest hook 可返回 allow with `updatedInput`/`updatedPermissions` 或 deny with optional `message`/`interrupt`。[E: types/hooks.ts:120][E: types/hooks.ts:123][E: types/hooks.ts:128] | `types/hooks.ts` |
| `hookSpecificOutput.Elicitation` | `action?`, `content?` | Elicitation hook 可返回 accept/decline/cancel 与 structured content。[E: types/hooks.ts:135][E: types/hooks.ts:137][E: types/hooks.ts:138] | `types/hooks.ts` |
| `hookSpecificOutput.ElicitationResult` | `action?`, `content?` | ElicitationResult hook 形状与 Elicitation 对齐。[E: types/hooks.ts:140][E: types/hooks.ts:142][E: types/hooks.ts:143] | `types/hooks.ts` |
| `hookSpecificOutput.CwdChanged` | `watchPaths?` | CwdChanged hook 可更新 watched paths。[E: types/hooks.ts:145][E: types/hooks.ts:147] | `types/hooks.ts` |
| `hookSpecificOutput.FileChanged` | `watchPaths?` | FileChanged hook 可更新 watched paths。[E: types/hooks.ts:152][E: types/hooks.ts:154] | `types/hooks.ts` |
| `hookSpecificOutput.WorktreeCreate` | `worktreePath` | WorktreeCreate hook 输出包含 worktree path。[E: types/hooks.ts:159][E: types/hooks.ts:161] | `types/hooks.ts` |
| `hookJSONOutputSchema` | async union syncHookResponse | hook JSON output 是 `{ async:true, asyncTimeout? }` 或 sync hook response union。[E: types/hooks.ts:169][E: types/hooks.ts:171][E: types/hooks.ts:175] | `types/hooks.ts` |
| `isSyncHookJSONOutput` | type guard | 非 `async:true` 时判为 sync hook output。[E: types/hooks.ts:182][E: types/hooks.ts:185] | `types/hooks.ts` |
| `isAsyncHookJSONOutput` | type guard | `async:true` 时判为 async hook output。[E: types/hooks.ts:189][E: types/hooks.ts:192] | `types/hooks.ts` |
| `_assertSDKTypesMatch` | `IsEqual<SchemaHookJSONOutput, HookJSONOutput>` | 编译期断言 Zod 推导类型与 SDK hook JSON output 类型一致。[E: types/hooks.ts:198][E: types/hooks.ts:199] | `types/hooks.ts` |
| `HookCallbackContext` | `{ getAppState; updateAttributionState }` | callback hooks 可访问 app state 与 attribution state updater。[E: types/hooks.ts:203] | `types/hooks.ts` |
| `HookCallback` | `{ type:'callback'; callback(...); timeout?; internal? }` | callback hook 接收 `HookInput`、toolUseID、AbortSignal、hookIndex、context，返回 `HookJSONOutput`。[E: types/hooks.ts:211][E: types/hooks.ts:213][E: types/hooks.ts:221][E: types/hooks.ts:223] | `types/hooks.ts` |
| `HookCallbackMatcher` | `{ matcher?; hooks; pluginName? }` | matcher 下挂一组 hook callback，可记录 pluginName。[E: types/hooks.ts:228] | `types/hooks.ts` |
| `HookProgress` | `{ type:'hook_progress'; hookEvent; hookName; command; ... }` | hook progress message 的 data payload。[E: types/hooks.ts:234] | `types/hooks.ts` |
| `HookBlockingError` | `{ blockingError; command }` | blocking hook error 的结构。[E: types/hooks.ts:243] | `types/hooks.ts` |
| `PermissionRequestResult` | allow/deny union | PermissionRequest hook 的结果结构，allow 可带 updated permissions，deny 可带 message/interrupt。[E: types/hooks.ts:248][E: types/hooks.ts:250][E: types/hooks.ts:255] | `types/hooks.ts` |
| `HookResult` | outcome + message/error/context/update fields | hook 执行结果包含 message/systemMessage/blockingError、outcome、permission 行为、additionalContext、updated input/MCP output 等。[E: types/hooks.ts:260][E: types/hooks.ts:264][E: types/hooks.ts:267][E: types/hooks.ts:272] | `types/hooks.ts` |
| `AggregatedHookResult` | grouped hook result | 多 hook 聚合结果把 blocking errors、additional contexts、permission behavior 与 updated values 汇总。[E: types/hooks.ts:277][E: types/hooks.ts:279][E: types/hooks.ts:283][E: types/hooks.ts:287] | `types/hooks.ts` |

## Command 模型

| 类型/函数 | 签名/形状 | 含义 | 定义处 |
|---|---|---|---|
| `LocalCommandResult` | text/compact/skip union | local command 可以返回文本、compact result 或 skip。[E: types/command.ts:16][E: types/command.ts:19][E: types/command.ts:23] | `types/command.ts` |
| `PromptCommand` | `type:'prompt'` + prompt metadata + `getPromptForCommand` | prompt command 包含进度文案、内容长度、可选 allowed tools/model/source/plugin/hooks/context/agent/effort/paths，并异步生成 content blocks。[E: types/command.ts:25][E: types/command.ts:32][E: types/command.ts:45][E: types/command.ts:53] | `types/command.ts` |
| `LocalCommandCall` | `(args, context) => Promise<LocalCommandResult>` | local command implementation 的 call signature。[E: types/command.ts:62] | `types/command.ts` |
| `LocalCommandModule` | `{ call: LocalCommandCall }` | lazy-loaded local command module shape。[E: types/command.ts:70] | `types/command.ts` |
| `LocalJSXCommandContext` | `ToolUseContext & { canUseTool?; setMessages; options; ... }` | local-jsx command 在 ToolUseContext 外扩 UI/IDE/MCP config/resume 回调。[E: types/command.ts:80][E: types/command.ts:82][E: types/command.ts:83][E: types/command.ts:93] | `types/command.ts` |
| `ResumeEntrypoint` | CLI/slash/fork union | resume 来源区分 CLI flag、slash command picker/session/title 与 fork。[E: types/command.ts:100] | `types/command.ts` |
| `CommandResultDisplay` | `'skip' | 'system' | 'user'` | local-jsx command completion 的 display 策略。[E: types/command.ts:107] | `types/command.ts` |
| `LocalJSXCommandOnDone` | completion callback | command 完成回调可控制 display、是否 query、meta messages、next input 与 auto submit。[E: types/command.ts:117][E: types/command.ts:120][E: types/command.ts:124] | `types/command.ts` |
| `LocalJSXCommandCall` | `(onDone, context, args) => Promise<React.ReactNode>` | local-jsx command implementation 的 call signature。[E: types/command.ts:131] | `types/command.ts` |
| `LocalJSXCommandModule` | `{ call: LocalJSXCommandCall }` | lazy-loaded local-jsx command module shape。[E: types/command.ts:140] | `types/command.ts` |
| `CommandAvailability` | `'claude-ai' | 'console'` | command static availability 按 OAuth subscriber 或 Console API key 用户划分。[E: types/command.ts:169][E: types/command.ts:171][E: types/command.ts:173] | `types/command.ts` |
| `CommandBase` | shared command metadata | 所有 command 共享 description/name/aliases/enabled/hidden/MCP/argument hint/sensitive/immediate/userFacingName 等字段。[E: types/command.ts:175][E: types/command.ts:180][E: types/command.ts:199][E: types/command.ts:202] | `types/command.ts` |
| `Command` | `CommandBase & (PromptCommand | LocalCommand | LocalJSXCommand)` | command 总 union 由 shared metadata 叠加三种 execution kind。[E: types/command.ts:205] | `types/command.ts` |
| `getCommandName` | fallback to `cmd.name` | 解析用户可见 command name，优先 `userFacingName()`。[E: types/command.ts:209][E: types/command.ts:210] | `types/command.ts` |
| `isCommandEnabled` | default true | command enabled 默认 true，仅在实现 `isEnabled` 时条件化。[E: types/command.ts:214][E: types/command.ts:215] | `types/command.ts` |

## Session、Log、Plugin、Text Input 与 Generated 类型

| 类型/函数 | 签名/形状 | 含义 | 定义处 |
|---|---|---|---|
| `SessionId` | branded string | session ID 的 branded type，避免和普通 string 混用。[E: types/ids.ts:10] | `types/ids.ts` |
| `AgentId` | branded string | subagent ID 的 branded type，存在时表示 subagent context。[E: types/ids.ts:17] | `types/ids.ts` |
| `asSessionId` | cast helper | 把 raw string cast 成 `SessionId`。[E: types/ids.ts:23] | `types/ids.ts` |
| `asAgentId` | cast helper | 把 raw string cast 成 `AgentId`。[E: types/ids.ts:31] | `types/ids.ts` |
| `toAgentId` | regex validation | 只接受 `a` + optional label + 16 hex 的 agent id，否则返回 null。[E: types/ids.ts:35][E: types/ids.ts:42] | `types/ids.ts` |
| `SerializedMessage` | `Message & cwd/userType/sessionId/version/...` | transcript 中的 serialized message 在 `Message` 上追加 cwd、userType、sessionId、version、gitBranch 等持久化元数据。[E: types/logs.ts:8][E: types/logs.ts:9][E: types/logs.ts:14][E: types/logs.ts:15] | `types/logs.ts` |
| `LogOption` | loaded session log summary | `/resume` 等列表项包含 messages、path、timestamps、firstPrompt、team/agent metadata、worktree/content replacement 等字段。[E: types/logs.ts:19][E: types/logs.ts:21][E: types/logs.ts:22][E: types/logs.ts:24][E: types/logs.ts:25][E: types/logs.ts:26][E: types/logs.ts:32][E: types/logs.ts:52] | `types/logs.ts` |
| `Entry` | transcript metadata union | log entry union 覆盖 transcript、summary/title/tag/agent metadata、PR link、file/attribution snapshots、queue op、mode、worktree、content replacement、context collapse entries。[E: types/logs.ts:297][E: types/logs.ts:304][E: types/logs.ts:311][E: types/logs.ts:317] | `types/logs.ts` |
| `sortLogs` | sort by modified then created desc | log 排序先按 modified 降序，再按 created 降序。[E: types/logs.ts:319][E: types/logs.ts:322][E: types/logs.ts:328] | `types/logs.ts` |
| `BuiltinPluginDefinition` | built-in plugin manifest | built-in plugin 包含 name/description/version、skills/hooks/MCP servers、availability 与 defaultEnabled。[E: types/plugin.ts:18][E: types/plugin.ts:26][E: types/plugin.ts:30][E: types/plugin.ts:34] | `types/plugin.ts` |
| `PluginRepository` | `{ url; branch; lastUpdated?; commitSha? }` | plugin repository pinning metadata。[E: types/plugin.ts:37] | `types/plugin.ts` |
| `PluginConfig` | repositories map | plugin config 是 source/repository id 到 repository metadata 的 map。[E: types/plugin.ts:44] | `types/plugin.ts` |
| `LoadedPlugin` | normalized loaded plugin | loaded plugin 带 manifest/path/source/repository/enabled/builtin/sha 以及 commands/agents/skills/output-styles/hooks/MCP/LSP/settings 路径或配置。[E: types/plugin.ts:48][E: types/plugin.ts:57][E: types/plugin.ts:66][E: types/plugin.ts:69] | `types/plugin.ts` |
| `PluginComponent` | commands/agents/skills/hooks/output-styles union | plugin component 类型用于错误定位。[E: types/plugin.ts:72] | `types/plugin.ts` |
| `PluginError` | discriminated error union | plugin error 是按 `type` 分支区分的结构化 union，覆盖 path/git/network/manifest/marketplace/MCP/LSP/dependency/cache/generic 等失败。[E: types/plugin.ts:101][E: types/plugin.ts:103][E: types/plugin.ts:110][E: types/plugin.ts:117][E: types/plugin.ts:124][E: types/plugin.ts:131][E: types/plugin.ts:138][E: types/plugin.ts:145][E: types/plugin.ts:151][E: types/plugin.ts:157][E: types/plugin.ts:163][E: types/plugin.ts:177][E: types/plugin.ts:266][E: types/plugin.ts:273][E: types/plugin.ts:279] | `types/plugin.ts` |
| `PluginLoadResult` | `{ enabled; disabled; errors }` | plugin loader 输出 enabled/disabled plugin 列表与错误列表。[E: types/plugin.ts:285] | `types/plugin.ts` |
| `getPluginErrorMessage` | switch on `PluginError.type` | plugin error 的展示文本 helper 按 error.type 分支生成 message。[E: types/plugin.ts:295][E: types/plugin.ts:296] | `types/plugin.ts` |
| `InlineGhostText` | ghost text display config | text input ghost text 支持要展示的 `text`、完整命令 `fullCommand` 和插入位置 `insertPosition`。[E: types/textInputTypes.ts:15][E: types/textInputTypes.ts:17][E: types/textInputTypes.ts:19][E: types/textInputTypes.ts:21] | `types/textInputTypes.ts` |
| `BaseTextInputProps` | core prompt input props | text input props 覆盖 history callbacks、placeholder/multiline/focus/mask、value/change/submit/exit、paste/image paste、cursor/columns/highlights/inline ghost text/input filter 等 UI/behavior hooks。[E: types/textInputTypes.ts:27][E: types/textInputTypes.ts:31][E: types/textInputTypes.ts:36][E: types/textInputTypes.ts:41][E: types/textInputTypes.ts:46][E: types/textInputTypes.ts:52][E: types/textInputTypes.ts:57][E: types/textInputTypes.ts:72][E: types/textInputTypes.ts:77][E: types/textInputTypes.ts:82][E: types/textInputTypes.ts:87][E: types/textInputTypes.ts:112][E: types/textInputTypes.ts:123][E: types/textInputTypes.ts:134][E: types/textInputTypes.ts:157][E: types/textInputTypes.ts:183][E: types/textInputTypes.ts:194][E: types/textInputTypes.ts:201] | `types/textInputTypes.ts` |
| `VimTextInputProps` | `BaseTextInputProps & vim flags` | Vim text input props 在 base props 上增加 initial vim mode 与 mode change callback 控制。[E: types/textInputTypes.ts:207][E: types/textInputTypes.ts:211][E: types/textInputTypes.ts:216] | `types/textInputTypes.ts` |
| `VimMode` | `'INSERT' | 'NORMAL'` | Vim input mode union。[E: types/textInputTypes.ts:222] | `types/textInputTypes.ts` |
| `PromptInputMode` | bash/prompt/orphaned-permission/task-notification union | prompt input mode 区分 bash、普通 prompt、orphaned permission 与 task notification。[E: types/textInputTypes.ts:265][E: types/textInputTypes.ts:266][E: types/textInputTypes.ts:267][E: types/textInputTypes.ts:268][E: types/textInputTypes.ts:269] | `types/textInputTypes.ts` |
| `QueuePriority` | `'now' | 'next' | 'later'` | queued command priority 支持立即打断、当前 turn 中途发送、turn 结束后发送三档。[E: types/textInputTypes.ts:294] | `types/textInputTypes.ts` |
| `QueuedCommand` | queued prompt command | queued command 含 `value`、`mode`、可选 `priority`、`uuid`、`orphanedPermission`、`pastedContents`、pre-expansion value、slash/bridge 来源控制等排队输入信息。[E: types/textInputTypes.ts:299][E: types/textInputTypes.ts:300][E: types/textInputTypes.ts:301][E: types/textInputTypes.ts:303][E: types/textInputTypes.ts:304][E: types/textInputTypes.ts:305][E: types/textInputTypes.ts:307][E: types/textInputTypes.ts:314][E: types/textInputTypes.ts:320][E: types/textInputTypes.ts:328] | `types/textInputTypes.ts` |
| `GitHubActionsMetadata` | generated interface | generated event schema 包含 actor/repository/repository owner id 等 GitHub Actions metadata。[E: types/generated/events_mono/claude_code/v1/claude_code_internal_event.ts:12][E: types/generated/events_mono/claude_code/v1/claude_code_internal_event.ts:13][E: types/generated/events_mono/claude_code/v1/claude_code_internal_event.ts:14][E: types/generated/events_mono/claude_code/v1/claude_code_internal_event.ts:15] | `types/generated/.../claude_code_internal_event.ts` |
| `EnvironmentMetadata` | generated interface | generated event schema 的 environment metadata 包含 platform、node_version、terminal、package managers、CI、remote、tags、build 等字段。[E: types/generated/events_mono/claude_code/v1/claude_code_internal_event.ts:22][E: types/generated/events_mono/claude_code/v1/claude_code_internal_event.ts:23][E: types/generated/events_mono/claude_code/v1/claude_code_internal_event.ts:24][E: types/generated/events_mono/claude_code/v1/claude_code_internal_event.ts:25][E: types/generated/events_mono/claude_code/v1/claude_code_internal_event.ts:26][E: types/generated/events_mono/claude_code/v1/claude_code_internal_event.ts:27][E: types/generated/events_mono/claude_code/v1/claude_code_internal_event.ts:29][E: types/generated/events_mono/claude_code/v1/claude_code_internal_event.ts:45][E: types/generated/events_mono/claude_code/v1/claude_code_internal_event.ts:49][E: types/generated/events_mono/claude_code/v1/claude_code_internal_event.ts:50][E: types/generated/events_mono/claude_code/v1/claude_code_internal_event.ts:54] | `types/generated/.../claude_code_internal_event.ts` |
| `SlackContext` | generated interface | Claude-in-Slack events 的 context 包含 team、enterprise install、trigger、creation method。[E: types/generated/events_mono/claude_code/v1/claude_code_internal_event.ts:68][E: types/generated/events_mono/claude_code/v1/claude_code_internal_event.ts:69][E: types/generated/events_mono/claude_code/v1/claude_code_internal_event.ts:70][E: types/generated/events_mono/claude_code/v1/claude_code_internal_event.ts:71][E: types/generated/events_mono/claude_code/v1/claude_code_internal_event.ts:72] | `types/generated/.../claude_code_internal_event.ts` |
| `ClaudeCodeInternalEvent` | generated interface | Statsig internal event schema 包含 event_name、timestamp、model、session_id、betas、env、auth、agent/team/plugin/marketplace 等 metadata。[E: types/generated/events_mono/claude_code/v1/claude_code_internal_event.ts:80][E: types/generated/events_mono/claude_code/v1/claude_code_internal_event.ts:82][E: types/generated/events_mono/claude_code/v1/claude_code_internal_event.ts:84][E: types/generated/events_mono/claude_code/v1/claude_code_internal_event.ts:85][E: types/generated/events_mono/claude_code/v1/claude_code_internal_event.ts:86][E: types/generated/events_mono/claude_code/v1/claude_code_internal_event.ts:88][E: types/generated/events_mono/claude_code/v1/claude_code_internal_event.ts:90][E: types/generated/events_mono/claude_code/v1/claude_code_internal_event.ts:108][E: types/generated/events_mono/claude_code/v1/claude_code_internal_event.ts:121][E: types/generated/events_mono/claude_code/v1/claude_code_internal_event.ts:126][E: types/generated/events_mono/claude_code/v1/claude_code_internal_event.ts:128][E: types/generated/events_mono/claude_code/v1/claude_code_internal_event.ts:129] | `types/generated/.../claude_code_internal_event.ts` |
| `MessageFns<T>` | generated codec interface | generated protobuf-style helpers 统一提供 `fromJSON`、`toJSON`、`create`、`fromPartial`。[E: types/generated/events_mono/claude_code/v1/claude_code_internal_event.ts:860][E: types/generated/events_mono/claude_code/v1/claude_code_internal_event.ts:861][E: types/generated/events_mono/claude_code/v1/claude_code_internal_event.ts:862][E: types/generated/events_mono/claude_code/v1/claude_code_internal_event.ts:863][E: types/generated/events_mono/claude_code/v1/claude_code_internal_event.ts:864] | `types/generated/.../claude_code_internal_event.ts` |

## Sources

- `types/`
- `types/hooks.ts`
- `types/permissions.ts`
- `utils/messages.ts`
- `types/generated/events_mono/claude_code/v1/claude_code_internal_event.ts`

## 相关

- `ref.tool-interface` 记录 `ToolUseContext`、`ToolResult`、`Tool` interface 与 `buildTool` defaults 的 tool 层类型。
