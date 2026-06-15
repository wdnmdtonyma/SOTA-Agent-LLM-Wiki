---
id: tool.agent
title: Agent tool
kind: tool
tier: T1
status: verified
source: [tools/AgentTool/AgentTool.tsx, coordinator/, utils/swarm/]
symbols: [AgentTool, runAgent, spawnTeammate, isCoordinatorMode, createSubagentContext]
related: [subsys.swarm]
updated: 2026-06-13
evidence: explicit
---

`Agent` 是 delegation 工具, 可以启动普通 subagent、后台 async agent、fork/worktree agent, 也可以在 agent swarms 中通过 `name`/`team_name` 生成 teammate。[E: tools/AgentTool/constants.ts:1][E: tools/AgentTool/AgentTool.tsx:196][E: tools/AgentTool/AgentTool.tsx:282][E: tools/AgentTool/AgentTool.tsx:686]

## 能回答的问题

- `Agent` 的 schema 字段如何被 feature gate 隐藏?
- `call()` 如何在 teammate、fork、sync、async、worktree 分支之间路由?
- subagent 的 tool pool、system prompt、permission mode 和 abort controller 如何构造?

## 1 Identity

- Tool name: `Agent`。[E: tools/AgentTool/constants.ts:1]
- Legacy alias: `Task`。[E: tools/AgentTool/constants.ts:2][E: tools/AgentTool/AgentTool.tsx:228]
- `searchHint`: `delegate work to a subagent`。[E: tools/AgentTool/AgentTool.tsx:227]
- `description`: `Launch a new agent`。[E: tools/AgentTool/AgentTool.tsx:230]
- `maxResultSizeChars`: `100_000`。[E: tools/AgentTool/AgentTool.tsx:229]

## 2 用途定位

`Agent` 的 prompt 会过滤 MCP requirements 未满足的 agents, 再按 Agent permission deny rules 过滤, coordinator mode 下使用 coordinator prompt 变体。[E: tools/AgentTool/AgentTool.tsx:197][E: tools/AgentTool/AgentTool.tsx:217][E: tools/AgentTool/AgentTool.tsx:221] coordinator mode 由 `CLAUDE_CODE_COORDINATOR_MODE` feature/env 决定, coordinator user context 会告诉主 agent worker 可用工具和 MCP server。[E: coordinator/coordinatorMode.ts:36][E: coordinator/coordinatorMode.ts:80]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 模型可见 | 说明 |
| --- | --- | --- | --- | --- | --- |
| `description` | `string` | 是 | 无 | 是 | 3-5 word task description, 用于 activity/background task。[E: tools/AgentTool/AgentTool.tsx:82] |
| `prompt` | `string` | 是 | 无 | 是 | 交给 agent 执行的任务。[E: tools/AgentTool/AgentTool.tsx:84] |
| `subagent_type` | `string` | 否 | general-purpose 或 fork path | 是 | 指定 agent type; 省略时 gate off 使用 general-purpose, fork gate on 走 fork path。[E: tools/AgentTool/AgentTool.tsx:85][E: tools/AgentTool/AgentTool.tsx:318] |
| `model` | enum `sonnet|opus|haiku` | 否 | agent definition 或 parent | 是 | normal subagent / teammate 路径可传 model override; coordinator mode 会清空 `modelParam`, fork path 也传 `undefined` 并使用 inherit model。[E: tools/AgentTool/AgentTool.tsx:86][E: tools/AgentTool/AgentTool.tsx:252][E: tools/AgentTool/AgentTool.tsx:610][E: tools/AgentTool/forkSubagent.ts:66] |
| `run_in_background` | `boolean` | 否 | 无 | 条件可见 | 未设置时该参数本身不请求 background; 最终是否 async 由 `shouldRunAsync` 综合 `run_in_background`、agent background、coordinator、fork、assistant mode、proactive 和 background task 禁用状态决定。[E: tools/AgentTool/AgentTool.tsx:87][E: tools/AgentTool/AgentTool.tsx:122][E: tools/AgentTool/AgentTool.tsx:557][E: tools/AgentTool/AgentTool.tsx:567] |
| `name` | `string` | 否 | 无 | 是 | 可命名 async agent 以便 SendMessage 路由; 只有与有效 `team_name` 或 current team context 组合成 `teamName && name` 时才 spawn teammate。[E: tools/AgentTool/AgentTool.tsx:93][E: tools/AgentTool/AgentTool.tsx:284][E: tools/AgentTool/AgentTool.tsx:700][E: tools/SendMessageTool/SendMessageTool.ts:800] |
| `team_name` | `string` | 否 | 当前 team context | 是 | teammate spawn 的 team 名称, 省略时使用 current team context。[E: tools/AgentTool/AgentTool.tsx:94][E: tools/AgentTool/AgentTool.tsx:269] |
| `mode` | `permissionModeSchema` | 否 | 无 | 是 | schema 接受 permission mode; teammate spawn 目前只把 `mode === "plan"` 转成 `plan_mode_required`。[E: tools/AgentTool/AgentTool.tsx:96][E: tools/AgentTool/AgentTool.tsx:296] |
| `isolation` | enum `worktree` 或 ant-only `worktree|remote` | 否 | agent definition | 是 | worktree 创建临时 git worktree; remote 分支在 external build 通过 dead-code guard 不可达。[E: tools/AgentTool/AgentTool.tsx:98][E: tools/AgentTool/AgentTool.tsx:430][E: tools/AgentTool/AgentTool.tsx:433] |
| `cwd` | `string` | 否 | 当前 cwd | KAIROS 下可见 | 覆盖 agent 文件系统/shell 工作目录, 与 worktree isolation 互斥意图在 schema 描述中表达。[E: tools/AgentTool/AgentTool.tsx:100][E: tools/AgentTool/AgentTool.tsx:110] |

## 4 输出 & maxResultSizeChars

公开 output schema 是 `completed` 与 `async_launched` union; `completed` 扩展 `agentToolResultSchema()` 并包含 `prompt`, `async_launched` 包含 `agentId`、`description`、`prompt`、`outputFile` 和可选 `canReadOutputFile`。[E: tools/AgentTool/AgentTool.tsx:140] 运行时还有 schema 外 internal status outputs: `teammate_spawned` 和 `remote_launched`, 通过 `InternalOutput` 在 mapper 中处理; `async_launched` data 还带 schema 外 `isAsync`, `completed` data 可能 spread worktree runtime fields。[E: tools/AgentTool/AgentTool.tsx:159][E: tools/AgentTool/AgentTool.tsx:183][E: tools/AgentTool/AgentTool.tsx:191][E: tools/AgentTool/AgentTool.tsx:754][E: tools/AgentTool/AgentTool.tsx:1254][E: tools/AgentTool/AgentTool.tsx:1298][E: tools/AgentTool/AgentTool.tsx:1341]

`maxResultSizeChars=100_000` 是声明值; `completed` mapper 通常会把 subagent content 加 agentId/usage trailer, one-shot built-ins `Explore` 和 `Plan` 只有在没有 worktree info text 时才省略 trailer 以节省 token。[E: tools/AgentTool/AgentTool.tsx:229][E: tools/AgentTool/AgentTool.tsx:1340][E: tools/AgentTool/AgentTool.tsx:1351][E: tools/AgentTool/AgentTool.tsx:1356]

## 5 行为标志

| 标志 | 实际值 | 原因 |
| --- | --- | --- |
| `isReadOnly()` | `true` | Agent 自身只委派, 权限由底层 tools 负责。[E: tools/AgentTool/AgentTool.tsx:1264] |
| `isConcurrencySafe()` | `true` | Agent spawn 可并发, 源码直接返回 true。[E: tools/AgentTool/AgentTool.tsx:1273] |
| `isDestructive` | 默认 `false` | 未声明, `buildTool` 默认 false; worker 内部工具各自承担写权限。[E: tools/AgentTool/AgentTool.tsx:196][E: Tool.ts:757] |
| `shouldDefer` | 未声明 | 工具定义未提供该字段。[E: tools/AgentTool/AgentTool.tsx:196][E: Tool.ts:442] |
| `aliases` | `["Task"]` | legacy wire name 兼容 permission rules、hooks、resume sessions。[E: tools/AgentTool/constants.ts:2][E: tools/AgentTool/AgentTool.tsx:228] |
| `toAutoClassifierInput` | prompt plus tags | 将 `subagent_type` 和 `mode` 拼成 tag prefix 后接 prompt。[E: tools/AgentTool/AgentTool.tsx:1267] |

## 6 权限

`checkPermissions()` 在 external build 中总是返回 allow; 源码里 `external === ant` guard 包住 auto mode passthrough 分支, 所以当前构建不会走该分支。[E: tools/AgentTool/AgentTool.tsx:1281][E: tools/AgentTool/AgentTool.tsx:1287][E: tools/AgentTool/AgentTool.tsx:1293] agent type 过滤由 prompt 和 call 内部的 `filterDeniedAgents(...)` 执行, 找到被 deny 的 agent type 会报出对应 `Agent(type)` 规则来源。[E: tools/AgentTool/AgentTool.tsx:217][E: tools/AgentTool/AgentTool.tsx:337][E: tools/AgentTool/AgentTool.tsx:347]

worker 的工具池权限上下文不是简单继承 parent restrictions; `AgentTool.call()` 构造给 `assembleToolPool(...)` 使用的 `workerPermissionContext` 时复制 app state permission context, 但 mode 使用 selected agent permission mode 或默认 `acceptEdits`。[E: tools/AgentTool/AgentTool.tsx:568][E: tools/AgentTool/AgentTool.tsx:573] worker 运行时的 permission context 在 `runAgent()` 的 `agentGetAppState()` 中另行构造, agent permission mode 会避开 parent `bypassPermissions`、`acceptEdits` 和 auto classifier mode 等例外。[E: tools/AgentTool/runAgent.ts:415][E: tools/AgentTool/runAgent.ts:420][E: tools/AgentTool/runAgent.ts:436]

## 7 call() 走读

`call()` 先解析 app state、permission mode、root setAppState, 校验 agent teams 权限、teammate 嵌套限制和 in-process teammate 背景限制。[E: tools/AgentTool/AgentTool.tsx:239][E: tools/AgentTool/AgentTool.tsx:254][E: tools/AgentTool/AgentTool.tsx:261][E: tools/AgentTool/AgentTool.tsx:266][E: tools/AgentTool/AgentTool.tsx:275] 若 `teamName && name`, 它调用 `spawnTeammate(...)`, 返回 internal `teammate_spawned` 输出。[E: tools/AgentTool/AgentTool.tsx:282][E: tools/AgentTool/AgentTool.tsx:290][E: tools/AgentTool/AgentTool.tsx:306]

普通 subagent 路径先决定 `effectiveType`: explicit `subagent_type` 优先, 省略时 fork gate on 走 fork path, gate off 使用 general-purpose。[E: tools/AgentTool/AgentTool.tsx:318] 它会检查 recursive fork guard、agent deny/not found、required MCP servers, 初始化 agent color, 记录选择 telemetry, 解析 isolation/worktree/remote。[E: tools/AgentTool/AgentTool.tsx:325][E: tools/AgentTool/AgentTool.tsx:337][E: tools/AgentTool/AgentTool.tsx:369][E: tools/AgentTool/AgentTool.tsx:412][E: tools/AgentTool/AgentTool.tsx:417][E: tools/AgentTool/AgentTool.tsx:430]

fork path 继承 parent system prompt 并使用 `buildForkedMessages(...)`; normal path 使用 selected agent 自己的 `getSystemPrompt(...)` 并通过 `enhanceSystemPromptWithEnvDetails(...)` 加环境细节。[E: tools/AgentTool/AgentTool.tsx:483][E: tools/AgentTool/AgentTool.tsx:495][E: tools/AgentTool/AgentTool.tsx:512][E: tools/AgentTool/AgentTool.tsx:514][E: tools/AgentTool/AgentTool.tsx:533] 是否 async 由 `run_in_background`、agent `background`、coordinator、fork、assistant mode、proactive active 和 background task 禁用状态共同决定。[E: tools/AgentTool/AgentTool.tsx:555][E: tools/AgentTool/AgentTool.tsx:559][E: tools/AgentTool/AgentTool.tsx:567]

async path 注册 background agent, 可把 `name` 写入 `agentNameRegistry`, 然后 fire-and-forget 调用 `runAsyncAgentLifecycle(...)` 包装 `runAgent(...)`, 并立即返回 `async_launched` 和 output file。[E: tools/AgentTool/AgentTool.tsx:686][E: tools/AgentTool/AgentTool.tsx:688][E: tools/AgentTool/AgentTool.tsx:700][E: tools/AgentTool/AgentTool.tsx:733][E: tools/AgentTool/AgentTool.tsx:753] sync path 则注册 foreground task, 可被 background signal 中途转后台, 持续消费 `runAgent(...)` 消息并 forward progress, 完成后 `finalizeAgentTool(...)` 返回 `completed`。[E: tools/AgentTool/AgentTool.tsx:765][E: tools/AgentTool/AgentTool.tsx:818][E: tools/AgentTool/AgentTool.tsx:845][E: tools/AgentTool/AgentTool.tsx:897][E: tools/AgentTool/AgentTool.tsx:1082][E: tools/AgentTool/AgentTool.tsx:1235]

## 8 runAgent 子循环

`runAgent()` 会初始化 agent-specific MCP servers, 过滤 incomplete tool calls, 构造 initial messages 和 agent read file state, 读取 user/system context, 根据 agent 定义精简 CLAUDE.md 或 gitStatus, 按父 mode 例外处理 agent permission mode, resolve tools, 创建 agent system prompt, 决定 abort controller。[E: tools/AgentTool/runAgent.ts:95][E: tools/AgentTool/runAgent.ts:368][E: tools/AgentTool/runAgent.ts:375][E: tools/AgentTool/runAgent.ts:380][E: tools/AgentTool/runAgent.ts:385][E: tools/AgentTool/runAgent.ts:400][E: tools/AgentTool/runAgent.ts:412][E: tools/AgentTool/runAgent.ts:500][E: tools/AgentTool/runAgent.ts:508][E: tools/AgentTool/runAgent.ts:520]

agent context 由 `createSubagentContext(...)` 构建: async agent 隔离 setAppState, sync agent 共享 setAppState, 两者共享 response length, 并传入 agent id/type、messages、readFileState、abortController 与 getAppState。[E: tools/AgentTool/runAgent.ts:697] runAgent 最终调用通用 `query({...})`, 记录 sidechain transcript, yield recordable messages, finally 清理 MCP、hooks、prompt cache tracking、readFileState、messages、perfetto、transcript subdir、todos 和该 agent 的 background shell/monitor tasks。[E: tools/AgentTool/runAgent.ts:732][E: tools/AgentTool/runAgent.ts:748][E: tools/AgentTool/runAgent.ts:792][E: tools/AgentTool/runAgent.ts:816][E: tools/AgentTool/runAgent.ts:827][E: tools/AgentTool/runAgent.ts:844]

## 9 渲染

`Agent` 使用 `renderToolResultMessage`、`renderToolUseMessage`、`renderToolUseTag`、`renderToolUseProgressMessage`、`renderToolUseRejectedMessage`、`renderToolUseErrorMessage`, 并支持 grouped rendering。[E: tools/AgentTool/AgentTool.tsx:56][E: tools/AgentTool/AgentTool.tsx:1380] `mapToolResultToToolResultBlockParam()` 对 `teammate_spawned`、`remote_launched`、`async_launched` 和 `completed` 生成不同 tool_result 文本或 content blocks。[E: tools/AgentTool/AgentTool.tsx:1298]

## 10 设计动机·edge·历史

- Async agent 的 abort controller 不链接 parent abort controller, 注释说明背景 agent 应该在用户 ESC 取消主线程时继续存活, 只能通过 explicit kill 结束。[E: tools/AgentTool/AgentTool.tsx:688]
- Worktree isolation 会创建 `agent-${earlyAgentId.slice(0, 8)}` worktree; non-hook worktree 在有 `headCommit` 且无变更时删除, hook-based worktree 总是保留, 有变更时返回 path 和可选 branch。[E: tools/AgentTool/AgentTool.tsx:590][E: tools/AgentTool/AgentTool.tsx:659][E: tools/AgentTool/AgentTool.tsx:666][E: tools/AgentTool/AgentTool.tsx:681]
- teammate spawn 的 out-of-process pane/tmux/iTerm 路径会创建 Claude Code 进程、写 team file、再把初始 prompt 写入 mailbox; in-process 路径会在同进程启动 teammate, prompt 直接传入而不走 mailbox 初始消息。[E: tools/shared/spawnMultiAgent.ts:384][E: tools/shared/spawnMultiAgent.ts:399][E: tools/shared/spawnMultiAgent.ts:488][E: tools/shared/spawnMultiAgent.ts:511][E: tools/shared/spawnMultiAgent.ts:910][E: tools/shared/spawnMultiAgent.ts:1011][E: tools/shared/spawnMultiAgent.ts:1034][E: tools/shared/spawnMultiAgent.ts:1045]

## Sources

- `tools/AgentTool/AgentTool.tsx`
- `tools/AgentTool/runAgent.ts`
- `tools/shared/spawnMultiAgent.ts`
- `coordinator/coordinatorMode.ts`
- `utils/swarm/`

## 相关

- `subsys.swarm`
