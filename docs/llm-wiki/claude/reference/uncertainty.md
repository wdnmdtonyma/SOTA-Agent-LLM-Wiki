---
id: ref.uncertainty
path: reference/uncertainty.md
title: 不确定项日志
kind: reference
tier: T3
source: []
status: draft
updated: 2026-06-14
evidence: unknown
---

> 全仓 `[U]`(待查/待证实)汇总,由各填充任务的 _staging/uncertainty-*.md 合并而来;每次 reconcile 重新生成。

## uncertainty-1

# Uncertainty staging 1

- `tool.repl`: 当前源码树 `claude/tools/REPLTool/` 只包含 `constants.ts` 和 `primitiveTools.ts`; `tools.ts` 在 ant 条件下 require `./tools/REPLTool/REPLTool.js`, 但本 dump 没有对应 `REPLTool.ts`/`REPLTool.tsx` implementation, 因此 `REPLTool` 的 input schema、output schema、permission、`call()` 和 render 细节均不可核实。[U]
- `tool.repl`: `utils/collapseReadSearch.ts` 的注释描述 `REPL` 会返回 `isVirtual: true` 的 inner tool messages / `newMessages`, 但当前 dump 中缺少实际生成这些 messages 的 `REPLTool.js` 实现。已将相关实现级断言从硬证据降级为不确定, 只保留 display/collapse 层可观察行为为证据。[U]

## uncertainty-10

# uncertainty-10

本任务未记录 [U] 项。

## uncertainty-3

# Uncertainty staging 3

本文件仅收集本批节点产生的 `[U]`。截至 2026-06-14, 本批节点暂未产生需要记录的 `[U]`。

## uncertainty-4

# Uncertainty staging 4

本文件仅汇总本批 assigned nodes 的 `[U]`, 按并行任务要求不写入 `reference/uncertainty.md`。

## tool.sleep

- `tools/SleepTool/` 在当前 dump 中只有 `prompt.ts`; `tools.ts` 会 require `tools/SleepTool/SleepTool.js`, 但实现文件不在 source tree 中, 因此 `Sleep` 的 input schema、output schema、`maxResultSizeChars`、`isEnabled()`、`shouldDefer`、`isConcurrencySafe()`、`isReadOnly()`、`interruptBehavior()`、permissions、`call()` 和 rendering 都不可核实。[U]

## uncertainty-5

# Uncertainty staging 5

本文件只收集本批 14 个注册级薄页中的 `[U]`; 按任务约束, 不写入 `reference/uncertainty.md`。

- `tool.web-browser`: `tools.ts` 未暴露 `WebBrowserTool` 的模型可见 `Tool.name`、aliases、searchHint、description、input schema、output schema、`maxResultSizeChars`、permission hooks、`call()` 控制流、render 函数和 `WEB_BROWSER_TOOL` gate 动机。
- `tool.monitor`: `tools.ts` 未暴露 `MonitorTool` 的模型可见 `Tool.name`、aliases、searchHint、description、input schema、output schema、`maxResultSizeChars`、permission hooks、`call()` 控制流、render 函数、monitor task 行为和 `MONITOR_TOOL` gate 动机。
- `tool.workflow`: `tools.ts` 未暴露 `WorkflowTool` 的模型可见 `Tool.name`、aliases、searchHint、description、input schema、output schema、`maxResultSizeChars`、permission hooks、workflow `call()` 控制流、render 函数、bundled workflow 初始化副作用内容和 `WORKFLOW_SCRIPTS` gate 动机。
- `tool.snip`: `tools.ts` 未暴露 `SnipTool` 的模型可见 `Tool.name`、aliases、searchHint、description、input schema、output schema、`maxResultSizeChars`、permission hooks、`call()` 控制流、render 函数、历史片段选择算法和 `HISTORY_SNIP` gate 动机。
- `tool.list-peers`: `tools.ts` 未暴露 `ListPeersTool` 的模型可见 `Tool.name`、aliases、searchHint、description、input schema、output schema、`maxResultSizeChars`、permission hooks、`call()` 控制流、render 函数、peer 来源、地址格式和 `UDS_INBOX` gate 动机。
- `tool.tungsten`: `tools.ts` 未暴露 `TungstenTool` 的模型可见 `Tool.name`、aliases、searchHint、description、input schema、output schema、`maxResultSizeChars`、permission hooks、`call()` 控制流、render 函数、系统自省行为和 ant-only gate 动机。
- `tool.ctx-inspect`: `tools.ts` 未暴露 `CtxInspectTool` 的模型可见 `Tool.name`、aliases、searchHint、description、input schema、output schema、`maxResultSizeChars`、permission hooks、`call()` 控制流、render 函数、上下文检查内容和 `CONTEXT_COLLAPSE` gate 动机。
- `tool.overflow-test`: `tools.ts` 未暴露 `OverflowTestTool` 的模型可见 `Tool.name`、aliases、searchHint、description、input schema、output schema、`maxResultSizeChars`、permission hooks、`call()` 控制流、render 函数、overflow 测试场景和 `OVERFLOW_TEST_TOOL` gate 动机。
- `tool.verify-plan-execution`: `tools.ts` 未暴露 `VerifyPlanExecutionTool` 的模型可见 `Tool.name`、aliases、searchHint、description、input schema、output schema、`maxResultSizeChars`、permission hooks、`call()` 控制流、render 函数、plan verification 算法和 `CLAUDE_CODE_VERIFY_PLAN` env gate 动机。
- `tool.push-notification`: `tools.ts` 未暴露 `PushNotificationTool` 的模型可见 `Tool.name`、aliases、searchHint、description、input schema、output schema、`maxResultSizeChars`、permission hooks、`call()` 控制流、render 函数、notification payload/channel 和 push notification gates 动机。
- `tool.send-user-file`: `tools.ts` 未暴露 `SendUserFileTool` 的模型可见 `Tool.name`、aliases、searchHint、description、input schema、output schema、`maxResultSizeChars`、permission hooks、`call()` 控制流、render 函数、文件来源、大小限制、传输通道和 `KAIROS` gate 动机。
- `tool.subscribe-pr`: `tools.ts` 未暴露 `SubscribePRTool` 的模型可见 `Tool.name`、aliases、searchHint、description、input schema、output schema、`maxResultSizeChars`、permission hooks、`call()` 控制流、render 函数、PR subscription 对象、鉴权、回调语义和 `KAIROS_GITHUB_WEBHOOKS` gate 动机。
- `tool.suggest-background-pr`: `tools.ts` 未暴露 `SuggestBackgroundPRTool` 的模型可见 `Tool.name`、aliases、searchHint、description、input schema、output schema、`maxResultSizeChars`、permission hooks、`call()` 控制流、render 函数、PR suggestion 触发条件、GitHub 行为和 ant-only gate 动机。
- `tool.terminal-capture`: `tools.ts` 未暴露 `TerminalCaptureTool` 的模型可见 `Tool.name`、aliases、searchHint、description、input schema、output schema、`maxResultSizeChars`、permission hooks、`call()` 控制流、render 函数、terminal capture 范围、数据格式、安全约束和 `TERMINAL_PANEL` gate 动机。

## uncertainty-6

# uncertainty-6

本批 `subsys.tool-system`、`subsys.shell-parsing`、`subsys.permissions`、`subsys.command-system`、`subsys.compaction`、`subsys.model-api`、`subsys.mcp`、`subsys.cli-modes` 暂无需要上升为 `[U]` 的未决项。

## uncertainty-7

# Uncertainty 7

本批次暂无需要登记的 [U] 条目。

## uncertainty-8

# Uncertainty staging 8

本文件只记录本批节点的 `[U]` 项,供后续统一 reconcile。

## subsys.ink-runtime

- 未在本批 source (`ink/`, `ink.ts`) 中找到 upstream npm Ink 的版本、commit 或 patch queue, 因此只能把本地实现判断为 vendored/fork-like runtime, 不能证明精确 fork baseline。

## uncertainty-9

- [ref.data-model] `types/message.ts` 在当前 `Best/claude/types/` dump 中缺失，但大量文件导入 `types/message.js`; chat message TypeScript 权威定义无法核实，只能用 `utils/messages.ts` 构造函数说明运行时形状。
- [ref.glossary] `tengu`、`Kairos`、`amber`、`pear`、`slate/prism`、`hive/evidence`、`hawthorn/window`、`onyx/plover` 等 codename 的业务全称未在当前 dump 中定义；只能从 gate/event/path 的使用点推断功能范围。
- [ref.glossary] `tools/TungstenTool/` 实现文件在当前 dump 中缺失；只能核到 `tools.ts` ant-only 注册和 tmux 相关调用/注释。
- [ref.glossary] `CCR`、`BYOC`、`CSE` 缩写在当前 dump 中没有展开全称；只能核到 remote-control/code-session/bridge 相关用法。

## uncertainty-prompt-catalog

- **auto-mode/yolo 权限分类器 prompt 原文缺失** — `utils/permissions/yoloClassifier.ts` 在 `feature('TRANSCRIPT_CLASSIFIER')` 下用 `require()` 从 `yolo-classifier-prompts/auto_mode_system_prompt.txt` / `permissions_external.txt` / `permissions_anthropic.txt` 加载分类器 system prompt [E: utils/permissions/yoloClassifier.ts:54]。该目录不在本 dump 内,`.txt` 实际文本无法核验。来源:ref.prompt-catalog §H。

## uncertainty-r2t1

# R2T1 uncertainty staging

本文件仅用于本轮 command catalog 节点的 `[U]` 暂存。当前批次没有新增 `[U]` 条目。

## uncertainty-r2t2

# uncertainty-r2t2

- `[cmd.feature-flagged]` `commands.ts` references feature-gated command implementations that are absent from the current source dump: `commands/proactive.js`, `commands/assistant/index.js`, `commands/remoteControlServer/index.js`, `commands/force-snip.js`, `commands/workflows/index.js`, `commands/subscribe-pr.js`, `commands/torch.js`, `commands/peers/index.js`, `commands/fork/index.js`, and `commands/buddy/index.js`. Only registry facts are documented; command metadata and behavior remain `[U]`.
- `[cmd.internal-only]` Many `INTERNAL_ONLY_COMMANDS` entries resolve to disabled hidden `name: 'stub'` objects in the current source dump. Their original internal command names, parameters, and behavior remain `[U]`.
- `[cmd.internal-only]` `agentsPlatform` is conditionally required from `commands/agents-platform/index.js` when `USER_TYPE === 'ant'`, but that implementation directory is absent from the current source dump. Its command metadata and behavior remain `[U]`.

## uncertainty-r2t3

# uncertainty-r2t3

本批 UI family 节点暂无不确定项。

## uncertainty-r2t4

# uncertainty-r2t4

本批暂无未决项。

## uncertainty-r2t5

# R2T5 uncertainty staging

本批暂未产生 `[U]` 条目。

## uncertainty-r2t6

# uncertainty-r2t6

暂无不确定项。

## uncertainty-r2t7

# Uncertainty staging r2t7

本文件只记录本批 settings 节点产生的 `[U]` 项,供后续统一 reconcile。

截至 2026-06-14, 本批节点暂未产生需要登记的 `[U]`。

## uncertainty-r3t1

# Uncertainty — round r3t1 (subsystems/buddy.md)

本文件汇总 `subsystems/buddy.md` 写作中标 `[U]` 的待证实项。源码根:`Best/claude/`,相对本目录 `../../../claude/`。

## buddy 子系统 [U] 项

- **`/buddy` slash command 实现**:`commands.ts:120` 通过 `require('./commands/buddy/index.js')` feature-gated 加载,但 `commands/buddy/` 目录未含在 dump 中(`ls commands/buddy/` 不存在)。因此 `/buddy`、`/buddy pet`、孵化(hatch)写 `config.companion` 的具体流程、soul(name/personality)由哪个模型/prompt 生成、`companionPetAt` 由谁写入,均 **无法从所给 6 文件证实**。属注册级薄页之外的实现细节,记 `[U]`,不臆造。 [U]

- **`companionReaction` 的来源 observer**:`state/AppStateStore.ts:168` 注释指向 `src/buddy/observer.ts`(“friend observer”),`screens/REPL.tsx:2805` 调 `fireCompanionObserver(...)` 把 reaction 写进 AppState。`buddy/observer.ts` 与 `fireCompanionObserver` 的定义均未含在 dump 的 6 文件中,reaction 文本如何按 per-turn 生成(模型调用?prompt?节流?)**未知**。 [U]

- **`companionIntroText` 中 “its bubble will answer” 的 bubble 应答链路**:prompt.ts 注入的系统提示让主模型在用户点名 companion 时“让位、一行内回答”,但“bubble 自己回答”所依赖的 observer/soul 生成不在本 dump,端到端对话链路 **部分未知**。 [U]

- **`hatchedAt` 写入时机**:`types.ts:118` 定义 `Companion.hatchedAt: number`、`StoredCompanion` 持久化它,但写入发生在缺失的 `/buddy` 孵化命令中,**无法证实**。 [U]

- **species canary / `excluded-strings.txt`**:`types.ts:10-13` 注释称某 species 名与 `excluded-strings.txt` 里的 model-codename canary 撞名,故用 `String.fromCharCode` 运行时构造以避免字面量进 bundle。`excluded-strings.txt` 与该构建检查脚本不在 dump,注释所述构建机制 **无法独立核对**,按 `[I]` 采信注释意图。 [U]

## uncertainty-r3t2

# Uncertainty log — round 3, task 2 (reference/react-contexts.md)

来源任务:`context/` 目录 9 个 React Context providers 的 catalog 表。

- [U] `useVoiceStore`(voice.tsx:43)是 module-private(非 `export`),仅供同文件三个 `useVoiceState`/`useSetVoiceState`/`useGetVoiceState` 内部复用 —— 已在表中标注为内部 helper,不列为对外 hook。[E: context/voice.tsx:43] 确认无 `export` 前缀。
- [I] `notifications.tsx` 与 `overlayContext.tsx` 不在本文件内 `createContext`,而是复用 `state/AppState.js` 的 `AppStoreContext`/AppState store;因此严格说它们是"基于共享 AppState 的 hook 模块",非独立 Provider。已在表/正文显式标注此区分。权威 AppState 节点为 `subsys.session-state`。
- [U] 各 Provider 在组件树中的实际挂载点(谁渲染 `<XxxProvider>`)未在 `context/` 目录内体现,需查 REPL/根组件装配;本页只描述 context 模块自身的导出契约,不追挂载点。

## uncertainty-r3t3

# Uncertainty log — ref.native-ts (R3/T3)

- **color-diff consumer alias `color-diff-napi` → `native-ts/color-diff`**: `components/StructuredDiff/colorDiff.ts:1-6` imports `ColorDiff` / `ColorFile` / `getSyntaxTheme` / `SyntaxTheme` from the bare specifier `color-diff-napi`, not from a `native-ts/color-diff` path. No `tsconfig.*.json` / `package.json` in the dump maps `color-diff-napi` to `native-ts/color-diff/index.ts`, and no `color-diff-napi` package dir exists in the dump. The mapping is asserted only by the module header comment (`native-ts/color-diff/index.ts:1-8`, "Pure TypeScript port of vendor/color-diff-src … API matches vendor/color-diff-src/index.d.ts exactly so callers don't change") plus the exact symbol-name match. Marked `[I]` in the node. [U: build-time alias resolution not provable from dumped files]

## uncertainty-r3t4

# Uncertainty log — spine/trace-edit-permission.md (r3t4)

本文件汇总 trace-edit-permission.md 中标 `[U]` 的存疑项(无法在源码核实的流程细节)。

## [U] 项

(无。本 trace 全程落在真实源码上,无 `[U]` 项。)

## [I] 项(仅记录,不属 [U];已在节点内就近标注)

- streaming(`StreamingToolExecutor`)vs 非 streaming(`runTools`)哪条路径在运行时被选中:两条都存在且都汇入 `runToolUse`,具体选择属调度层,见 tool-call-anatomy.md。
- 交互式 `useCanUseTool` 闭包 vs headless `hasPermissionsToUseTool` 直用作 `canUseTool`:按运行模式分流(交互/headless/swarm),节点据 callsite 标 [I]。
- `validateInput` 的 `behavior:'ask'` 是校验失败消息(返回 is_error tool_result),与权限引擎的 `ask`(弹框)是不同机制——据 toolExecution.ts:687 的 `result === false` 短路推断。

## L2 独立证伪结果(148 条 [E] 全核)

- 1 处 DRIFT 已修:`[E: services/tools/toolExecution.ts:1397]`(指向注释 `// Run PostToolUse hooks`)→ 改为 **1483**(真实 `runPostToolUseHooks(` 调用行)。
- 其余 147 条 [E] 行号精确,落在被断言的代码行本身。

## uncertainty-r3t5

# uncertainty — spine.trace-subagent-spawn (r3t5)

- [U] async agent 完成后 `enqueuePendingNotification({mode:'task-notification'})` (tasks/LocalAgentTask/LocalAgentTask.tsx:258) 产出的 `<task-notification>` 消息，究竟在父 `queryLoop` 的哪一行被取出并作为新一轮用户输入注入，未逐行核到端到端连线。trace 中按 `spine.agent-loop` 已述的 "queued commands" 处理标为 [I]，未编造具体行号。
- [I] in-process teammate 的执行循环由 `startInProcessTeammate` (tools/shared/spawnMultiAgent.ts:912, fire-and-forget) 启动，最终在 inProcessRunner.ts:1175 进入 `runAgent()`；该 runner 在 prompt 不变的 `allMessages` 缓冲上反复调用 runAgent（inProcessRunner.ts:1036 注释），与 AgentTool 单次 runAgent 调用语义不同，trace 仅在 teammate 分支末端给出指针，不展开 runner 内部多轮逻辑。

## uncertainty-r3t6

# Uncertainty log — r3t6 (spine/trace-mcp-call.md)

任务: 写 `spine/trace-mcp-call.md`(MCP 工具调用端到端 trace)。

## [U] 项

- (none yet — trace 各步均落在可核实的源码行;若 L2 证伪出现 drift 再 append)
