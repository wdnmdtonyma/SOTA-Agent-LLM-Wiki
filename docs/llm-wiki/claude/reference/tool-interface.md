---
id: ref.tool-interface
title: Tool 接口字段 catalog
kind: reference
tier: T3
path: reference/tool-interface.md
source: [Tool.ts]
symbols: [Tool]
related: [subsys.tool-system]
evidence: explicit
status: verified
updated: 2026-06-14
---

> `Tool.ts` 定义 Claude Code 工具系统的核心类型：`ToolUseContext` 是执行上下文，`ToolResult` 是工具返回 envelope，`Tool` interface 是每个工具必须或可选实现的 catalog，`buildTool` 为常见字段补默认值。

## 能回答的问题

- `Tool` interface 里每个字段/方法的签名、可选性和职责是什么？
- 哪些 `Tool` 字段控制 deferral、strict schema、MCP/LSP 标记和 result persistence？
- `buildTool` 会给哪些方法填默认值，默认值是什么？
- `ToolUseContext` 暴露哪些 session、UI、permission、message 和 subagent 相关状态？
- 工具如何渲染 tool use、progress、result、error、reject 和 grouped views？

## 支撑类型表

| symbol | 签名 | 含义 | 定义处 |
|---|---|---|---|
| `ToolInputJSONSchema` | object JSON schema with `type:'object'` | MCP tool 可直接提供 JSON Schema input，而不是从 Zod 转换。[E: Tool.ts:15] | `Tool.ts` |
| `QueryChainTracking` | `{ chainId; depth }` | 跟踪 query chain id 与 nesting depth。[E: Tool.ts:90] | `Tool.ts` |
| `ValidationResult` | `{ result:true } | { result:false; message; errorCode }` | `validateInput` 的 allow/error 结果。[E: Tool.ts:95] | `Tool.ts` |
| `SetToolJSXFn` | `(args | null) => void` | UI 设置 tool JSX、隐藏 prompt input、spinner、local JSX command 等状态。[E: Tool.ts:103] | `Tool.ts` |
| `ToolPermissionContext` | `DeepImmutable<{ mode; additionalWorkingDirectories; rules; flags }>` | tool permission context 含 mode、额外工作目录、allow/deny/ask rules、bypass/auto/prompt 控制字段。[E: Tool.ts:123][E: Tool.ts:124][E: Tool.ts:126][E: Tool.ts:133] | `Tool.ts` |
| `getEmptyToolPermissionContext` | `() => ToolPermissionContext` | 创建默认 permission context：mode=`default`，rules 为空，bypass unavailable。[E: Tool.ts:140][E: Tool.ts:142][E: Tool.ts:147] | `Tool.ts` |
| `CompactProgressEvent` | hooks/compact start/end union | compaction progress event 覆盖 hooks_start、compact_start、compact_end。[E: Tool.ts:150][E: Tool.ts:152][E: Tool.ts:155] | `Tool.ts` |
| `ToolUseContext` | execution context object | tool call 的上下文对象，包含 options、AbortController、AppState、UI callbacks、message list、permission decisions、subagent/thread state 等。[E: Tool.ts:158][E: Tool.ts:159][E: Tool.ts:180][E: Tool.ts:250] | `Tool.ts` |
| `Progress` | `ToolProgressData | HookProgress` | progress payload 可来自 tool 或 hook。[E: Tool.ts:305] | `Tool.ts` |
| `ToolProgress<P>` | `{ toolUseID; data }` | 单条 tool progress 的 ID 与 payload wrapper。[E: Tool.ts:307] | `Tool.ts` |
| `filterToolProgressMessages` | `(ProgressMessage[]) => ProgressMessage<ToolProgressData>[]` | 从 progress messages 中过滤掉 `hook_progress`。[E: Tool.ts:312][E: Tool.ts:317] | `Tool.ts` |
| `ToolResult<T>` | `{ data; newMessages?; contextModifier?; mcpMeta? }` | tool 返回 data，可附新消息、context modifier 和 MCP metadata。[E: Tool.ts:321][E: Tool.ts:323][E: Tool.ts:330][E: Tool.ts:332] | `Tool.ts` |
| `ToolCallProgress<P>` | `(progress: ToolProgress<P>) => void` | tool `call` 用于发送 progress 的 callback 类型。[E: Tool.ts:338] | `Tool.ts` |
| `AnyObject` | `z.ZodType<{ [key:string]: unknown }>` | Tool input schema 的基础 Zod object 类型。[E: Tool.ts:343] | `Tool.ts` |
| `toolMatchesName` | primary name or alias match | 判断 tool primary name 或 aliases 是否匹配输入 name。[E: Tool.ts:348][E: Tool.ts:352] | `Tool.ts` |
| `findToolByName` | `Tools, name` → `Tool | undefined` | 在 tool collection 中按 name/alias 查找 tool。[E: Tool.ts:358][E: Tool.ts:359] | `Tool.ts` |
| `Tools` | `readonly Tool[]` | 工具集合类型，源码注释要求使用 `Tools` 追踪 tool sets 的装配、传递和过滤。[E: Tool.ts:701] | `Tool.ts` |
| `ToolDef` | `Tool` minus defaultable keys + optional defaults | `buildTool` 输入 shape，默认字段可省略。[E: Tool.ts:721][E: Tool.ts:725] | `Tool.ts` |
| `buildTool` | `(def) => { ...TOOL_DEFAULTS, userFacingName: () => def.name, ...def }` | 从 partial definition 构建 complete tool，runtime spread 把 defaults 放在 def 前面，def 覆盖默认值。[E: Tool.ts:783][E: Tool.ts:788][E: Tool.ts:789][E: Tool.ts:790] | `Tool.ts` |

## ToolUseContext 字段表

| 字段 | 类型/签名 | 含义 | 定义处 |
|---|---|---|---|
| `options.commands` | `Command[]` | 当前 query 可用 slash/local commands。[E: Tool.ts:160] | `Tool.ts` |
| `options.debug` | `boolean` | debug mode flag。[E: Tool.ts:161] | `Tool.ts` |
| `options.mainLoopModel` | `string` | main loop 使用的模型名。[E: Tool.ts:162] | `Tool.ts` |
| `options.tools` | `Tools` | 当前可用 tools 集合。[E: Tool.ts:163] | `Tool.ts` |
| `options.verbose` | `boolean` | verbose rendering / transcript 控制输入。[E: Tool.ts:164] | `Tool.ts` |
| `options.thinkingConfig` | `ThinkingConfig` | thinking 配置透传给 tool/system prompt。[E: Tool.ts:165] | `Tool.ts` |
| `options.mcpClients` | `MCPServerConnection[]` | 当前连接的 MCP clients。[E: Tool.ts:166] | `Tool.ts` |
| `options.mcpResources` | `Record<string, ServerResource[]>` | MCP resources by server。[E: Tool.ts:167] | `Tool.ts` |
| `options.isNonInteractiveSession` | `boolean` | SDK/print 等非交互 session 标记。[E: Tool.ts:168] | `Tool.ts` |
| `options.agentDefinitions` | `AgentDefinitionsResult` | 可用 agent definitions。[E: Tool.ts:169] | `Tool.ts` |
| `options.maxBudgetUsd` | `number?` | 可选 USD budget 上限。[E: Tool.ts:170] | `Tool.ts` |
| `options.customSystemPrompt` | `string?` | 替换默认 system prompt 的自定义 prompt。[E: Tool.ts:172] | `Tool.ts` |
| `options.appendSystemPrompt` | `string?` | 追加到主 system prompt 后的 prompt。[E: Tool.ts:174] | `Tool.ts` |
| `options.querySource` | `QuerySource?` | analytics tracking 的 querySource override。[E: Tool.ts:176] | `Tool.ts` |
| `options.refreshTools` | `() => Tools` | MCP mid-query connect 后刷新 tools 的 callback。[E: Tool.ts:178] | `Tool.ts` |
| `abortController` | `AbortController` | tool call 取消信号来源。[E: Tool.ts:180] | `Tool.ts` |
| `readFileState` | `FileStateCache` | 文件读取状态 cache。[E: Tool.ts:181] | `Tool.ts` |
| `getAppState` | `() => AppState` | 读取当前 AppState。[E: Tool.ts:182] | `Tool.ts` |
| `setAppState` | `(f) => void` | 更新当前 AppState。[E: Tool.ts:183] | `Tool.ts` |
| `setAppStateForTasks` | `(f) => void` optional | session-scoped background task infrastructure 的 root store 更新入口。[E: Tool.ts:192] | `Tool.ts` |
| `handleElicitation` | `(serverName, params, signal) => Promise<ElicitResult>` optional | MCP URL elicitation handler；print/SDK mode 可委托 structured IO。[E: Tool.ts:198] | `Tool.ts` |
| `setToolJSX` | `SetToolJSXFn?` | 设置 tool JSX UI。[E: Tool.ts:203] | `Tool.ts` |
| `addNotification` | `(notif: Notification) => void` optional | 添加 UI notification。[E: Tool.ts:204] | `Tool.ts` |
| `appendSystemMessage` | `(msg: Exclude<SystemMessage,SystemLocalCommandMessage>) => void` optional | 向 REPL message list 追加 UI-only system message。[E: Tool.ts:207] | `Tool.ts` |
| `sendOSNotification` | `(opts) => void` optional | 发送 OS-level notification。[E: Tool.ts:211] | `Tool.ts` |
| `nestedMemoryAttachmentTriggers` | `Set<string>?` | nested memory attachment trigger set。[E: Tool.ts:215] | `Tool.ts` |
| `loadedNestedMemoryPaths` | `Set<string>?` | 已注入 CLAUDE.md nested memory paths 的去重集合。[E: Tool.ts:222] | `Tool.ts` |
| `dynamicSkillDirTriggers` | `Set<string>?` | dynamic skill dir trigger set。[E: Tool.ts:223] | `Tool.ts` |
| `discoveredSkillNames` | `Set<string>?` | skill discovery 已展示名称集合，用于 telemetry。[E: Tool.ts:225] | `Tool.ts` |
| `userModified` | `boolean?` | permission/hook 后输入是否被用户修改的标记。[E: Tool.ts:226] | `Tool.ts` |
| `setInProgressToolUseIDs` | `(f) => void` | 更新 in-progress tool use ID 集合。[E: Tool.ts:227] | `Tool.ts` |
| `setHasInterruptibleToolInProgress` | `(v: boolean) => void` optional | 交互 REPL 中标记存在可 interrupt tool。[E: Tool.ts:229] | `Tool.ts` |
| `setResponseLength` | `(f) => void` | 更新 response length 计数。[E: Tool.ts:230] | `Tool.ts` |
| `pushApiMetricsEntry` | `(ttftMs) => void` optional | ant-only API metrics entry for OTPS tracking。[E: Tool.ts:233] | `Tool.ts` |
| `setStreamMode` | `(mode: SpinnerMode) => void` optional | 设置 spinner/stream mode。[E: Tool.ts:234] | `Tool.ts` |
| `onCompactProgress` | `(event: CompactProgressEvent) => void` optional | compaction progress callback。[E: Tool.ts:235] | `Tool.ts` |
| `setSDKStatus` | `(status: SDKStatus) => void` optional | 更新 SDK status。[E: Tool.ts:236] | `Tool.ts` |
| `openMessageSelector` | `() => void` optional | 打开 message selector。[E: Tool.ts:237] | `Tool.ts` |
| `updateFileHistoryState` | `(updater) => void` | 更新 file history state。[E: Tool.ts:238] | `Tool.ts` |
| `updateAttributionState` | `(updater) => void` | 更新 commit attribution state。[E: Tool.ts:241] | `Tool.ts` |
| `setConversationId` | `(id: UUID) => void` optional | 设置 conversation id。[E: Tool.ts:244] | `Tool.ts` |
| `agentId` | `AgentId?` | 仅 subagent context 设置，用于区分 hook/tool 调用来源。[E: Tool.ts:245] | `Tool.ts` |
| `agentType` | `string?` | subagent type 名称；main thread agent type 另有 fallback。[E: Tool.ts:246] | `Tool.ts` |
| `requireCanUseTool` | `boolean?` | 要求即使 hooks auto-approve 也调用 canUseTool，speculation 使用该字段重写 overlay file path。[E: Tool.ts:249] | `Tool.ts` |
| `messages` | `Message[]` | 当前 context 的 message 列表。[E: Tool.ts:250] | `Tool.ts` |
| `fileReadingLimits` | `{ maxTokens?; maxSizeBytes? }` | 文件读取限制。[E: Tool.ts:251] | `Tool.ts` |
| `globLimits` | `{ maxResults? }` | glob 结果限制。[E: Tool.ts:255] | `Tool.ts` |
| `toolDecisions` | `Map<string,{ source; decision; timestamp }>` optional | 记录 tool decision accept/reject 来源和时间。[E: Tool.ts:258][E: Tool.ts:262] | `Tool.ts` |
| `queryTracking` | `QueryChainTracking?` | query chain tracking。[E: Tool.ts:266] | `Tool.ts` |
| `requestPrompt` | `(sourceName, summary?) => prompt callback` optional | interactive prompt callback factory，仅 REPL contexts 可用。[E: Tool.ts:270] | `Tool.ts` |
| `toolUseId` | `string?` | 当前 tool use id。[E: Tool.ts:274] | `Tool.ts` |
| `criticalSystemReminder_EXPERIMENTAL` | `string?` | experimental critical system reminder。[E: Tool.ts:275] | `Tool.ts` |
| `preserveToolUseResults` | `boolean?` | subagent 中保留 toolUseResult，in-process teammates 使用该字段让 transcript 可见。[E: Tool.ts:278] | `Tool.ts` |
| `localDenialTracking` | `DenialTrackingState?` | async subagent 本地 denial counter 状态。[E: Tool.ts:283] | `Tool.ts` |
| `contentReplacementState` | `ContentReplacementState?` | per conversation thread 的 tool result budget replacement state。[E: Tool.ts:292] | `Tool.ts` |
| `renderedSystemPrompt` | `SystemPrompt?` | turn start 冻结的 rendered system prompt，用于 fork subagent 共享 prompt cache。[E: Tool.ts:299] | `Tool.ts` |

## Tool 接口字段与方法全表

`Tool<Input, Output, P>` 是 object type；下表逐一列出从 `aliases` 到 `renderGroupedToolUse` 的直接成员。[E: Tool.ts:362][E: Tool.ts:371][E: Tool.ts:694]

| # | 成员 | 必填 | 类型/签名 | 含义 | 定义处 |
|---:|---|---|---|---|---|
| 1 | `aliases` | 否 | `string[]` | tool rename 后的 backward-compatible aliases，可被 lookup 使用。[E: Tool.ts:371] | `Tool.ts` |
| 2 | `searchHint` | 否 | `string` | ToolSearch keyword matching 的一句能力短语。[E: Tool.ts:378] | `Tool.ts` |
| 3 | `call` | 是 | `(args, context, canUseTool, parentMessage, onProgress?) => Promise<ToolResult<Output>>` | tool 执行入口，接收 parsed input、ToolUseContext、permission callback、parent assistant message 和 progress callback。[E: Tool.ts:379][E: Tool.ts:382][E: Tool.ts:384] | `Tool.ts` |
| 4 | `description` | 是 | `(input, { isNonInteractiveSession, toolPermissionContext, tools }) => Promise<string>` | 基于 input 与运行环境生成 tool use 描述。[E: Tool.ts:386][E: Tool.ts:389][E: Tool.ts:390] | `Tool.ts` |
| 5 | `inputSchema` | 是 | `readonly Input` | Zod input schema。[E: Tool.ts:394] | `Tool.ts` |
| 6 | `inputJSONSchema` | 否 | `ToolInputJSONSchema` | MCP tools 可直接指定 JSON Schema input。[E: Tool.ts:397] | `Tool.ts` |
| 7 | `outputSchema` | 否 | `z.ZodType<unknown>` | optional output schema；源码注释指出 TungstenTool 未定义该字段。[E: Tool.ts:400] | `Tool.ts` |
| 8 | `inputsEquivalent` | 否 | `(a, b) => boolean` | 判断两个 input 是否等价。[E: Tool.ts:401] | `Tool.ts` |
| 9 | `isConcurrencySafe` | 是 | `(input) => boolean` | 指示 tool 是否可并发安全执行。[E: Tool.ts:402] | `Tool.ts` |
| 10 | `isEnabled` | 是 | `() => boolean` | 当前 tool 是否启用。[E: Tool.ts:403] | `Tool.ts` |
| 11 | `isReadOnly` | 是 | `(input) => boolean` | 指示 tool 是否只读。[E: Tool.ts:404] | `Tool.ts` |
| 12 | `isDestructive` | 否 | `(input) => boolean` | 不可逆 delete/overwrite/send 操作才应设置 true；buildTool 默认 false。[E: Tool.ts:406][E: Tool.ts:761] | `Tool.ts` |
| 13 | `interruptBehavior` | 否 | `() => 'cancel' | 'block'` | 用户新消息到来时取消 tool 或阻塞等待；runtime 在未实现或抛错时返回 block。[E: Tool.ts:416][E: services/tools/StreamingToolExecutor.ts:235][E: services/tools/StreamingToolExecutor.ts:239] | `Tool.ts` |
| 14 | `isSearchOrReadCommand` | 否 | `(input) => { isSearch; isRead; isList? }` | 标注搜索、读取、列表类操作，UI 可折叠显示。[E: Tool.ts:429][E: Tool.ts:430][E: Tool.ts:432] | `Tool.ts` |
| 15 | `isOpenWorld` | 否 | `(input) => boolean` | 标注 tool 是否 open-world。[E: Tool.ts:434] | `Tool.ts` |
| 16 | `requiresUserInteraction` | 否 | `() => boolean` | 标注 tool 是否需要用户交互。[E: Tool.ts:435] | `Tool.ts` |
| 17 | `isMcp` | 否 | `boolean` | MCP tool marker。[E: Tool.ts:436] | `Tool.ts` |
| 18 | `isLsp` | 否 | `boolean` | LSP tool marker。[E: Tool.ts:437] | `Tool.ts` |
| 19 | `shouldDefer` | 否 | `readonly boolean` | true 时 tool 以 `defer_loading: true` 发送，调用前需要 ToolSearch。[E: Tool.ts:442] | `Tool.ts` |
| 20 | `alwaysLoad` | 否 | `readonly boolean` | true 时 tool 永不 deferred，初始 prompt 就带完整 schema；MCP 可通过 `_meta['anthropic/alwaysLoad']` 设置。[E: Tool.ts:449] | `Tool.ts` |
| 21 | `mcpInfo` | 否 | `{ serverName; toolName }` | MCP server/tool 原始未归一化名称。[E: Tool.ts:455] | `Tool.ts` |
| 22 | `name` | 是 | `readonly string` | tool primary name。[E: Tool.ts:456] | `Tool.ts` |
| 23 | `maxResultSizeChars` | 是 | `number` | tool result 超过该字符数时持久化到磁盘并给 Claude preview；`Infinity` 表示永不持久化。[E: Tool.ts:466] | `Tool.ts` |
| 24 | `strict` | 否 | `readonly boolean` | `tengu_tool_pear` 开启时启用 API strict mode，使 API 更严格遵循 tool instructions 与 schema。[E: Tool.ts:472] | `Tool.ts` |
| 25 | `backfillObservableInput` | 否 | `(input: Record<string, unknown>) => void` | 在 observer 看到 tool_use input 前，就地补 legacy/derived fields；必须 idempotent，且不修改 API-bound 原 input。[E: Tool.ts:481] | `Tool.ts` |
| 26 | `validateInput` | 否 | `(input, context) => Promise<ValidationResult>` | tool-specific input validation；失败原因反馈给 model，不直接展示 UI。[E: Tool.ts:489][E: Tool.ts:492] | `Tool.ts` |
| 27 | `checkPermissions` | 是 | `(input, context) => Promise<PermissionResult>` | validateInput 通过后执行的 tool-specific permission logic。[E: Tool.ts:500][E: Tool.ts:503] | `Tool.ts` |
| 28 | `getPath` | 否 | `(input) => string` | file-path 工具的 path extractor。[E: Tool.ts:506] | `Tool.ts` |
| 29 | `preparePermissionMatcher` | 否 | `(input) => Promise<(pattern) => boolean>` | hook `if` / permission-rule pattern matcher 的预编译入口。[E: Tool.ts:514][E: Tool.ts:516] | `Tool.ts` |
| 30 | `prompt` | 是 | `({ getToolPermissionContext, tools, agents, allowedAgentTypes? }) => Promise<string>` | 生成 model-facing tool prompt。[E: Tool.ts:518][E: Tool.ts:523] | `Tool.ts` |
| 31 | `userFacingName` | 是 | `(input?) => string` | UI 中展示的 tool 名称。[E: Tool.ts:524] | `Tool.ts` |
| 32 | `userFacingNameBackgroundColor` | 否 | `(input?) => keyof Theme | undefined` | UI 中 user-facing name 的背景色。[E: Tool.ts:525][E: Tool.ts:527] | `Tool.ts` |
| 33 | `isTransparentWrapper` | 否 | `() => boolean` | wrapper tool 可把渲染完全委托给 progress handler，自身不显示。[E: Tool.ts:533] | `Tool.ts` |
| 34 | `getToolUseSummary` | 否 | `(input?) => string | null` | compact view 的短摘要；返回 null 表示不展示。[E: Tool.ts:539] | `Tool.ts` |
| 35 | `getActivityDescription` | 否 | `(input?) => string | null` | spinner display 的 present-tense activity description。[E: Tool.ts:546][E: Tool.ts:548] | `Tool.ts` |
| 36 | `toAutoClassifierInput` | 是 | `(input) => unknown` | auto-mode security classifier 的 compact input；返回空字符串可跳过 classifier transcript。[E: Tool.ts:556] | `Tool.ts` |
| 37 | `mapToolResultToToolResultBlockParam` | 是 | `(content, toolUseID) => ToolResultBlockParam` | 将 tool output 转成 model/API-facing tool_result block。[E: Tool.ts:557][E: Tool.ts:560] | `Tool.ts` |
| 38 | `renderToolResultMessage` | 否 | `(content, progressMessages, options) => React.ReactNode` | 渲染 tool result；runtime optional-call 该方法并在省略或返回空值时得到 null。[E: Tool.ts:566][E: Tool.ts:580][E: components/messages/UserToolResultMessage/UserToolSuccessMessage.tsx:65][E: components/messages/UserToolResultMessage/UserToolSuccessMessage.tsx:73] | `Tool.ts` |
| 39 | `extractSearchText` | 否 | `(out) => string` | transcript search indexing 使用的可见文本提取器。[E: Tool.ts:599] | `Tool.ts` |
| 40 | `renderToolUseMessage` | 是 | `(input, options) => React.ReactNode` | tool parameters streaming 中尽早渲染 tool use message，因此 input 是 partial。[E: Tool.ts:605][E: Tool.ts:606] | `Tool.ts` |
| 41 | `isResultTruncated` | 否 | `(output) => boolean` | non-verbose result 是否被截断，控制 fullscreen click-to-expand affordance。[E: Tool.ts:615] | `Tool.ts` |
| 42 | `renderToolUseTag` | 否 | `(input) => React.ReactNode` | tool use message 后追加 timeout/model/resume ID 等 tag；返回 null 表示不显示。[E: Tool.ts:621] | `Tool.ts` |
| 43 | `renderToolUseProgressMessage` | 否 | `(progressMessages, options) => React.ReactNode` | tool running 时渲染 progress UI；runtime optional-call 该方法并在省略或返回空值时得到 null。[E: Tool.ts:625][E: Tool.ts:634][E: components/messages/AssistantToolUseMessage.tsx:342][E: components/messages/AssistantToolUseMessage.tsx:348] | `Tool.ts` |
| 44 | `renderToolUseQueuedMessage` | 否 | `() => React.ReactNode` | 渲染 queued tool use message。[E: Tool.ts:635] | `Tool.ts` |
| 45 | `renderToolUseRejectedMessage` | 否 | `(input, options) => React.ReactNode` | 自定义 rejection UI；runtime 在 tool 或方法缺失、input parse 失败或返回空值时 fallback 到 `FallbackToolUseRejectedMessage`。[E: Tool.ts:641][E: Tool.ts:653][E: components/messages/UserToolResultMessage/UserToolRejectMessage.tsx:36][E: components/messages/UserToolResultMessage/UserToolRejectMessage.tsx:39][E: components/messages/UserToolResultMessage/UserToolRejectMessage.tsx:56][E: components/messages/UserToolResultMessage/UserToolRejectMessage.tsx:73] | `Tool.ts` |
| 46 | `renderToolUseErrorMessage` | 否 | `(result, options) => React.ReactNode` | 自定义 error UI；runtime optional-call 该方法并在省略或返回空值时 fallback 到 `FallbackToolUseErrorMessage`。[E: Tool.ts:659][E: Tool.ts:667][E: components/messages/UserToolResultMessage/UserToolErrorMessage.tsx:85][E: components/messages/UserToolResultMessage/UserToolErrorMessage.tsx:90] | `Tool.ts` |
| 47 | `renderGroupedToolUse` | 否 | `(toolUses, options) => React.ReactNode | null` | non-verbose mode 下把多个 parallel tool uses 分组渲染；verbose mode 各自渲染。[E: Tool.ts:678][E: Tool.ts:694] | `Tool.ts` |

## buildTool 默认值

`DefaultableToolKeys` 指定 `buildTool` 可补默认值的 keys：`isEnabled`、`isConcurrencySafe`、`isReadOnly`、`isDestructive`、`checkPermissions`、`toAutoClassifierInput`、`userFacingName`。[E: Tool.ts:707][E: Tool.ts:708][E: Tool.ts:709][E: Tool.ts:710][E: Tool.ts:711][E: Tool.ts:712][E: Tool.ts:713][E: Tool.ts:714] `TOOL_DEFAULTS` 的运行时默认是：`isEnabled` 返回 true，`isConcurrencySafe` false，`isReadOnly` false，`isDestructive` false，`checkPermissions` allow 并回传 `updatedInput`，`toAutoClassifierInput` 返回空字符串，`userFacingName` 在 spread 前是空字符串但 `buildTool` 覆盖为 `() => def.name`。[E: Tool.ts:757][E: Tool.ts:758][E: Tool.ts:759][E: Tool.ts:760][E: Tool.ts:761][E: Tool.ts:762][E: Tool.ts:766][E: Tool.ts:767][E: Tool.ts:768][E: Tool.ts:789]

## Sources

- `Tool.ts`
- `services/tools/StreamingToolExecutor.ts`
- `components/messages/AssistantToolUseMessage.tsx`
- `components/messages/UserToolResultMessage/UserToolSuccessMessage.tsx`
- `components/messages/UserToolResultMessage/UserToolRejectMessage.tsx`
- `components/messages/UserToolResultMessage/UserToolErrorMessage.tsx`

## 相关

- [工具系统机制](../subsystems/tool-system.md) 是 `Tool` interface 在 registry、deferral、permission、execution pipeline 中的系统级说明。
