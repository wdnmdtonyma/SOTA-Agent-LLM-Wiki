---
id: subsys.tool-system
path: subsystems/tool-system.md
title: 工具系统机制
kind: subsystem
tier: T2
status: verified
source: [Tool.ts, tools.ts]
symbols: [Tool, ToolUseContext, ToolResult, Tools, getTools, assembleToolPool, buildTool]
related: [ref.tool-interface, spine.tool-call-anatomy]
evidence: explicit
updated: 2026-06-14
---

> 工具系统把 Claude Code 的 built-in tools、MCP tools、权限上下文、并发标志和执行结果统一成 `Tool` contract, 再把可见工具池交给模型与工具调度层。

## 能回答的问题

- 一个 `Tool` 最少要定义哪些 schema、权限和执行入口?
- `getTools()` 为什么会在 simple/bare、REPL、deny rules、feature gate 下返回不同工具池?
- built-in tools 与 MCP tools 在哪里合并、排序、去重?
- `ToolResult.contextModifier` 如何回写到下一轮上下文?
- 工具执行细节与 [Tool call anatomy](../spine/tool-call-anatomy.md) 的边界在哪里?

## 职责边界

工具系统的职责是定义工具契约、构造工具池、把权限上下文传给工具, 并为执行层提供并发和读写标志; 它不负责模型请求参数拼装, 也不直接控制 agent loop 的下一轮递归。[E: Tool.ts:362][E: tools.ts:271] 模型请求和 deferred tool schema 的发送属于 [模型与 API 层](model-api.md), 工具块执行批处理属于 [Tool call anatomy](../spine/tool-call-anatomy.md) 覆盖的执行路径。[I]

`tools.ts` 的 `getAllBaseTools()` 是 built-in tool catalog, `getTools()` 是当前 permission context 下可暴露给模型的 built-in 工具子集, `assembleToolPool()` 才是 built-in 与 MCP tools 的合并入口。[E: tools.ts:193][E: tools.ts:271][E: tools.ts:345]

## 关键文件

| 文件 | 作用 |
| --- | --- |
| `Tool.ts` | 定义 `ToolPermissionContext`、`ToolUseContext`、`ToolResult`、`Tool`、`Tools` 和 `buildTool()` 的默认行为。[E: Tool.ts:123][E: Tool.ts:158][E: Tool.ts:321][E: Tool.ts:362][E: Tool.ts:783] |
| `tools.ts` | 维护 built-in tool catalog, 根据 mode、deny rules、REPL 状态、`isEnabled()` 输出当前工具池, 并合并 MCP tools。[E: tools.ts:193][E: tools.ts:262][E: tools.ts:271][E: tools.ts:325][E: tools.ts:345] |
| `services/tools/toolOrchestration.ts` | 非 streaming 路径按 `isConcurrencySafe()` 分批, 并在批次结束或串行执行时应用 context modifiers。[E: services/tools/toolOrchestration.ts:19][E: services/tools/toolOrchestration.ts:101][E: services/tools/toolOrchestration.ts:109][E: services/tools/toolOrchestration.ts:112][E: services/tools/toolOrchestration.ts:60][E: services/tools/toolOrchestration.ts:141] |
| `services/tools/StreamingToolExecutor.ts` | streaming tool execution 在模型流期间排队和启动工具, 以并发安全性控制执行互斥。[E: services/tools/StreamingToolExecutor.ts:40][E: services/tools/StreamingToolExecutor.ts:76][E: services/tools/StreamingToolExecutor.ts:131][E: services/tools/StreamingToolExecutor.ts:133] |

## 数据模型

`ToolPermissionContext` 保存当前 `mode`、additional working directories、always allow/deny/ask rule buckets, 以及 bypass/auto mode 可用性等权限状态; 空上下文默认 `mode: 'default'`, 三类规则为空, bypass 不可用。[E: Tool.ts:124][E: Tool.ts:125][E: Tool.ts:126][E: Tool.ts:127][E: Tool.ts:128][E: Tool.ts:129][E: Tool.ts:130][E: Tool.ts:142][E: Tool.ts:144][E: Tool.ts:145][E: Tool.ts:146][E: Tool.ts:147]

`ToolUseContext` 是工具执行的 runtime context: `options` 内有 commands、main loop model、当前 tools、MCP clients/resources、non-interactive 标志、agent definitions 和 `refreshTools()`; context 本体还提供 abort controller、read file cache、AppState 读写、elicitation handler、tool JSX/progress/notification 通道。[E: Tool.ts:160][E: Tool.ts:162][E: Tool.ts:163][E: Tool.ts:166][E: Tool.ts:167][E: Tool.ts:168][E: Tool.ts:169][E: Tool.ts:178][E: Tool.ts:181][E: Tool.ts:182][E: Tool.ts:183][E: Tool.ts:198][E: Tool.ts:203][E: Tool.ts:204]

`ToolResult<T>` 的必需字段是 `data`; 工具还可以返回 `newMessages`、`contextModifier` 和 `mcpMeta`。`contextModifier` 不是纯元数据, 非 streaming 执行器会把并发安全批次的 modifiers 暂存到批次结束再应用, 串行工具则在每条 update 时应用。[E: Tool.ts:322][E: Tool.ts:323][E: Tool.ts:330][E: Tool.ts:332][E: services/tools/toolOrchestration.ts:47][E: services/tools/toolOrchestration.ts:60][E: services/tools/toolOrchestration.ts:141]

`Tool` contract 包含 `call()`、`description()`、Zod `inputSchema`、可选 JSON Schema、输出 schema、并发/启用/只读/破坏性/interrupt/open-world/MCP/LSP/defer 标志、权限检查、路径解析和渲染入口。[E: Tool.ts:379][E: Tool.ts:386][E: Tool.ts:394][E: Tool.ts:397][E: Tool.ts:400][E: Tool.ts:402][E: Tool.ts:403][E: Tool.ts:404][E: Tool.ts:406][E: Tool.ts:416][E: Tool.ts:434][E: Tool.ts:436][E: Tool.ts:437][E: Tool.ts:442][E: Tool.ts:489][E: Tool.ts:500][E: Tool.ts:506][E: Tool.ts:566][E: Tool.ts:605]

`TOOL_DEFAULTS` 让工具默认 enabled、非并发安全、非只读、非破坏性, 默认权限结果为 allow, `buildTool()` 再用这些 defaults 和工具定义对象做 runtime spread。[E: Tool.ts:757][E: Tool.ts:758][E: Tool.ts:759][E: Tool.ts:760][E: Tool.ts:761][E: Tool.ts:766][E: Tool.ts:783][E: Tool.ts:788][E: Tool.ts:790]

## 控制流

1. `getAllBaseTools()` 先构造 built-in tool catalog, 其中 Glob/Grep、LSP、REPL、workflow、PowerShell、ToolSearch 等工具受环境、feature 或可选模块影响。[E: tools.ts:193][E: tools.ts:201][E: tools.ts:224][E: tools.ts:232][E: tools.ts:233][E: tools.ts:242][E: tools.ts:249]
2. `getTools(permissionContext)` 在 simple mode 只返回 REPL 或 Bash/Read/Edit 子集; coordinator mode 会补 Agent/TaskStop/SendMessage; 普通路径移除 resource helper 和 synthetic output 等 special tools。[E: tools.ts:273][E: tools.ts:277][E: tools.ts:287][E: tools.ts:295][E: tools.ts:302][E: tools.ts:303][E: tools.ts:304][E: tools.ts:307]
3. `filterToolsByDenyRules()` 在工具进入模型 surface 前按 blanket deny rules 过滤, 普通路径之后再隐藏 REPL primitives 并执行每个工具的 `isEnabled()`。[E: tools.ts:262][E: tools.ts:310][E: tools.ts:319][E: tools.ts:320][E: tools.ts:325]
4. `assembleToolPool()` 用 `getTools()` 得到 built-ins, 再过滤 MCP tools, 按 name 排序后 concat, 最后 `uniqBy(..., 'name')`; 因为 built-ins 在 concat 前缀中, 同名冲突由 built-in 胜出。[E: tools.ts:349][E: tools.ts:352][E: tools.ts:362][E: tools.ts:364][E: tools.ts:365]
5. 非 streaming 执行通过 `runTools()` 先 `partitionToolCalls()`; `partitionToolCalls()` 会安全解析 input 并调用 `tool.isConcurrencySafe(parsedInput)`, 解析失败或函数抛错时降级为非并发安全。[E: services/tools/toolOrchestration.ts:19][E: services/tools/toolOrchestration.ts:26][E: services/tools/toolOrchestration.ts:97][E: services/tools/toolOrchestration.ts:101][E: services/tools/toolOrchestration.ts:105]
6. streaming 执行通过 `StreamingToolExecutor.addTool()` 入队, unknown tool 生成 synthetic error result, 已知工具解析 input 后计算并发安全性, `processQueue()` 只在互斥条件满足时启动工具。[E: services/tools/StreamingToolExecutor.ts:76][E: services/tools/StreamingToolExecutor.ts:77][E: services/tools/StreamingToolExecutor.ts:91][E: services/tools/StreamingToolExecutor.ts:92][E: services/tools/StreamingToolExecutor.ts:104][E: services/tools/StreamingToolExecutor.ts:144]

## 设计动机与权衡

工具池在模型可见前做 deny filtering, 这样被 blanket-denied 的工具不会只是在 call time 被拒绝, 而是直接从 prompt surface 移除。[E: tools.ts:262][E: tools.ts:310] 这个设计把“可见性”和“运行时权限”拆成两层: 前者减少模型误用, 后者仍由 `Tool.checkPermissions()` 和 permission subsystem 做细粒度决策。[I]

并发安全性由工具函数而不是静态布尔值决定, 允许工具按输入判断是否可并行; 调度层捕获异常并保守降级为串行, 避免 parser/permission 异常扩大为并发副作用。[E: Tool.ts:402][E: services/tools/toolOrchestration.ts:97][E: services/tools/toolOrchestration.ts:105][I]

`assembleToolPool()` 把 built-ins 排在 MCP tools 前面并按 name 分区排序, 既稳定 prompt cache, 又让 built-in 在同名冲突时保留优先级。[E: tools.ts:362][E: tools.ts:363][E: tools.ts:364][I]

## Gotcha

- `ToolResult.contextModifier` 对 concurrency-safe 工具不会在并发执行中即时改写当前 context; 非 streaming 路径把 modifier 排到批次后应用, streaming executor 也需要保持结果释放顺序, 所以依赖 contextModifier 的工具不应轻易声明并发安全。[E: services/tools/toolOrchestration.ts:42][E: services/tools/toolOrchestration.ts:60][E: services/tools/StreamingToolExecutor.ts:379][E: services/tools/StreamingToolExecutor.ts:391][E: services/tools/StreamingToolExecutor.ts:393][I]
- `getTools()` 不包含 MCP tools; REPL/interactive 和 headless 路径需要再通过 MCP connection state 或 `assembleToolPool()` 合并。[E: tools.ts:345][E: tools.ts:349][E: tools.ts:352][E: tools.ts:364]
- `toolMatchesName()` 会匹配 aliases, 所以 rename/backcompat 场景下按 name 查找工具不能只比较 `tool.name`。[E: Tool.ts:348][E: Tool.ts:352]

## Sources

- `Tool.ts`
- `tools.ts`
- `services/tools/toolOrchestration.ts`
- `services/tools/StreamingToolExecutor.ts`

## 相关

- [Tool call anatomy](../spine/tool-call-anatomy.md)
- [Agent loop](../spine/agent-loop.md)
- [权限系统](permissions.md)
- [MCP](mcp.md)
