---
id: ref.glossary
title: 术语表与 codename
kind: reference
tier: T3
path: reference/glossary.md
source: []
evidence: explicit
status: verified
updated: 2026-06-14
---

> 术语表记录 Claude Code dump 中可 grep 到的 codename、内部功能名和缩写；有源码定义的写 `[E]`，只能从 gate/event/path 推断的写 `[I]`，源码无法解释的语义写 `[U]`。

## 能回答的问题

- `CCR`、`teleport`、`remote-control` 在源码里分别指什么？
- `tengu_*` 命名空间出现在 telemetry、GrowthBook 和 feature gates 中代表什么范围？
- `Kairos`、`Clawd`、`Grove`、`Tungsten`、`dream`、`swarm` 在源码中各指哪类功能？
- 哪些 codename 只有注册级证据，缺少实现文件？
- `marble-origami`、`hawthorn`、`pear`、`amber` 等名称在源码里落在哪个功能点？

## Core codenames

| 术语 | 源码含义 | 证据 |
|---|---|---|
| `tengu` | `tengu_*` 是大量 telemetry event / GrowthBook flag 的命名空间；例如 auto mode config、strict tools gate、JSON tools value、auto dream events、memdir events、attribution header 都使用 `tengu_` 前缀。[E: utils/betas.ts:173][E: utils/betas.ts:319][E: utils/betas.ts:325][E: services/autoDream/autoDream.ts:195][E: memdir/memdir.ts:174][E: constants/system.ts:56] `tengu` 的产品/项目全称未在当前 dump 中显式定义。[U] |
| `Kairos` / `KAIROS` | `KAIROS` 是一个 build feature gate，和 proactive autonomous mode、Brief tool prompt、remote-control continuation args、channel UI 等功能绑定。[E: constants/prompts.ts:73][E: constants/prompts.ts:77][E: constants/prompts.ts:552][E: bridge/bridgeMain.ts:1526][E: components/LogoV2/LogoV2.tsx:36] 源码未直接定义 Kairos 的业务全称；从功能组合看，它像 ant/internal autonomous/remote/mobile work bundle。[I] |
| `Clawd` | `Clawd` 是 LogoV2 的 ASCII/Ink mascot component，支持 `default`、`arms-up`、`look-left`、`look-right` pose。[E: components/LogoV2/Clawd.tsx:5][E: components/LogoV2/Clawd.tsx:34][E: components/LogoV2/Clawd.tsx:73] | `components/LogoV2/Clawd.tsx` |
| `Grove` | Grove 是 consumer privacy/terms settings 与 notice flow：API type `AccountSettings` 包含 `grove_enabled` 和 `grove_notice_viewed_at`，`GroveConfig` 包含 notice grace period/frequency，UI 文案说明可选择是否允许使用 chats/coding sessions 改进模型及 data retention 影响。[E: services/api/grove.ts:25][E: services/api/grove.ts:26][E: services/api/grove.ts:27][E: services/api/grove.ts:30][E: services/api/grove.ts:31][E: services/api/grove.ts:33][E: services/api/grove.ts:34][E: components/grove/Grove.tsx:56][E: components/grove/Grove.tsx:116] | `services/api/grove.ts`, `components/grove/Grove.tsx` |
| `Tungsten` | `TungstenTool` 在 `tools.ts` 中被 import，并且只在 `USER_TYPE === 'ant'` 时加入 base tools；tmux socket 中的 `markTmuxToolUsed()` 会设置 `tmuxToolUsed = true`，Prompt footer 使用 `tungstenActiveSession` 显示 tmux pill。[E: tools.ts:60][E: tools.ts:215][E: utils/tmuxSocket.ts:187][E: utils/tmuxSocket.ts:188][E: components/PromptInput/PromptInputFooterLeftSide.tsx:263][E: components/PromptInput/PromptInputFooterLeftSide.tsx:368] `tools/TungstenTool/` 实现文件在当前 dump 中缺失，因此实现细节未知。[U] |
| `dream` | `TaskType` 包含 `dream`，task id prefix 为 `d`；`autoDream` 使用 `registerDreamTask`、`buildConsolidationPrompt` 和 `runForkedAgent` 做 background memory consolidation。[E: Task.ts:13][E: Task.ts:86][E: services/autoDream/autoDream.ts:204][E: services/autoDream/autoDream.ts:222][E: services/autoDream/autoDream.ts:224] | `Task.ts`, `services/autoDream/autoDream.ts` |
| `swarm` | `swarm` 是 agent teams/teammates 子系统；`isAgentSwarmsEnabled()` 是集中 gate，ant always on，external 需要 `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` 或 `--agent-teams` 且 `tengu_amber_flint` killswitch 允许；backend registry 的 `detectAndGetBackend()` 与 `getTeammateExecutor()` 负责选择 pane/in-process teammate executor。[E: utils/agentSwarmsEnabled.ts:24][E: utils/agentSwarmsEnabled.ts:31][E: utils/agentSwarmsEnabled.ts:39][E: utils/swarm/backends/registry.ts:136][E: utils/swarm/backends/registry.ts:425] | `utils/agentSwarmsEnabled.ts`, `utils/swarm/` |
| `teleport` | `teleport` 是 remote session transfer/resume flow：`TeleportResult` 返回 messages 和 branchName；`createTeleportResumeUserMessage` 告诉 model session 正从另一台机器继续；print mode 里 `options.teleport` 会触发 `teleportResumeCodeSession()` 并 checkout teleported branch。[E: utils/teleport.tsx:43][E: utils/teleport.tsx:44][E: utils/teleport.tsx:45][E: utils/teleport.tsx:66][E: utils/teleport.tsx:68][E: cli/print.ts:4989][E: cli/print.ts:5010][E: cli/print.ts:5011][E: cli/print.ts:5012] | `utils/teleport.tsx`, `cli/print.ts` |
| `CCR` | 源码以 `CCRClient` 类和 `ccr-byoc-2025-07-29` beta header 命名 remote-control / code-session 通道；`CCRClient` 持有 worker epoch、heartbeat timer 和 session URL/ID 状态，remote-control bridge 与 session history helper 使用该 beta header 创建或读取 sessions。[E: cli/transports/ccrClient.ts:262][E: cli/transports/ccrClient.ts:263][E: cli/transports/ccrClient.ts:266][E: cli/transports/ccrClient.ts:271][E: cli/transports/ccrClient.ts:272][E: bridge/createSession.ts:140][E: assistant/sessionHistory.ts:39] `CCR` 与 `BYOC` 的全称未在当前 dump 中展开。[U] |
| `remote-control` | `remote-control` 是 CLI/REPL bridge command，用于把本地 CLI session 连接到 web/app remote session；源码 help 文案说 Remote Control lets you access this CLI session from web/mobile and disconnect via `/remote-control`。[E: commands/bridge/index.ts:14][E: commands/bridge/index.ts:16][E: bridge/bridgeMain.ts:2125] | `commands/bridge/`, `bridge/` |

## Secondary codenames and flag names

| 术语 | 源码含义 | 证据 |
|---|---|---|
| `amber` | 出现在 `tengu_amber_json_tools` 和 `tengu_amber_flint`：前者控制 token-efficient JSON tool_use beta，后者是 external agent swarms killswitch。[E: utils/betas.ts:325][E: utils/agentSwarmsEnabled.ts:39] 名称本身无源码展开。[U] |
| `pear` | `tengu_tool_pear` 是 strict tools / structured outputs beta gate；strict 开启时 token-efficient tools 被互斥关闭。[E: utils/betas.ts:319][E: utils/betas.ts:323] 名称本身无源码展开。[U] |
| `slate/prism` | `tengu_slate_prism` 是 connector-text summarization GrowthBook value；env 未强制时决定是否加入 summarization beta。[E: utils/betas.ts:293][E: utils/betas.ts:295] 名称本身无源码展开。[U] |
| `hive/evidence` | `tengu_hive_evidence` 与 `VERIFICATION_AGENT` gate 一起控制 session guidance，要求非平凡实现后由 verification agent 独立核验。[E: constants/prompts.ts:390][E: constants/prompts.ts:393] 名称本身无源码展开。[U] |
| `hawthorn/window` | `tengu_hawthorn_window` 是 tool result per-message aggregate budget 的 GrowthBook override 名称；读取到 finite positive number 时 `getPerMessageBudgetLimit()` 返回 override，否则回退 `MAX_TOOL_RESULTS_PER_MESSAGE_CHARS`。[E: utils/toolResultStorage.ts:421][E: utils/toolResultStorage.ts:423][E: utils/toolResultStorage.ts:431][E: utils/toolResultStorage.ts:433] 名称本身无源码展开。[U] |
| `onyx/plover` | `tengu_onyx_plover` 是 auto dream scheduling knobs 的 GrowthBook value，提供 `minHours` 与 `minSessions`。[E: services/autoDream/autoDream.ts:76][E: services/autoDream/autoDream.ts:80][E: services/autoDream/autoDream.ts:86] 名称本身无源码展开。[U] |
| `marble-origami` | `types/logs.ts` 用 `marble-origami-commit` 与 `marble-origami-snapshot` 作为 context-collapse persistence entry discriminator。[E: types/logs.ts:255][E: types/logs.ts:256][E: types/logs.ts:282][E: types/logs.ts:283] | `types/logs.ts` |
| `claubbit` | generated `EnvironmentMetadata` 含 `is_claubbit` 字段，表示 environment/runtime metadata 的一个 boolean 维度。[E: types/generated/events_mono/claude_code/v1/claude_code_internal_event.ts:30] 业务含义未在当前 dump 中展开。[U] |
| `Conductor` | `utils/env.ts` 用 `__CFBundleIdentifier === 'com.conductor.app'` 判断是否运行在 Conductor；generated environment metadata 也有 `is_conductor` 字段。[E: utils/env.ts:111][E: utils/env.ts:112][E: types/generated/events_mono/claude_code/v1/claude_code_internal_event.ts:51] | `utils/env.ts`, generated event schema |
| `Foundry` | beta logic 中的 API provider；Foundry 对 interleaved thinking/context management 返回 true，并被 firstParty-only betas 逻辑视为可包含 experimental betas。[E: utils/betas.ts:103][E: utils/betas.ts:128][E: utils/betas.ts:217] | `utils/betas.ts` |
| `Vertex` | beta logic 中的 API provider；Vertex/Bedrock 使用 3P tool-search beta header，Vertex Claude 4+ model 才加 web search beta。[E: utils/betas.ts:204][E: utils/betas.ts:346] | `utils/betas.ts` |
| `Bedrock` | beta logic 中的 API provider；Bedrock 的部分 betas 从普通 headers 过滤，改走 extra body params。[E: utils/betas.ts:373][E: utils/betas.ts:379][E: constants/betas.ts:38] | `utils/betas.ts`, `constants/betas.ts` |
| `Brief` | Brief 是 Kairos/Kairos Brief gate 下的 model-facing tool/prompt mode；system prompt section 会在 `KAIROS` 或 `KAIROS_BRIEF` 打开时加入 brief section，UI 提供 `filterForBriefTool` 和 `dropTextInBriefTurns` 两个 Brief transcript filter 函数。[E: constants/prompts.ts:552][E: constants/prompts.ts:843][E: components/Messages.tsx:93][E: components/Messages.tsx:169] | `constants/prompts.ts`, `components/Messages.tsx` |
| `proactive` | proactive module 在 `PROACTIVE` 或 `KAIROS` gate 下加载；autonomous work section 将 `<tick>` prompts 描述为保持模型循环的唤醒提示。[E: constants/prompts.ts:72][E: constants/prompts.ts:860][E: constants/prompts.ts:866] | `constants/prompts.ts` |

## Abbreviations and generated names

| 缩写/术语 | 源码含义 | 证据 |
|---|---|---|
| `GB` / `GrowthBook` | `getFeatureValue_CACHED_MAY_BE_STALE` 与 `checkStatsigFeatureGate_CACHED_MAY_BE_STALE` 用于读取 runtime feature values/gates；`ENABLE_GROWTHBOOK_DEV` 会选择 dev client key。[E: utils/betas.ts:4][E: utils/betas.ts:5][E: constants/keys.ts:5][E: constants/keys.ts:7] | `utils/betas.ts`, `constants/keys.ts` |
| `ISP` | `modelSupportsISP` 的函数名指 interleaved thinking support；该函数读取 3P capability override key `interleaved_thinking`。[E: utils/betas.ts:92][E: utils/betas.ts:95] | `utils/betas.ts` |
| `BYOC` | remote/CCR session calls 使用 `ccr-byoc-2025-07-29` beta header；缩写未在 dump 中展开。[E: bridge/createSession.ts:140][E: assistant/sessionHistory.ts:39][U] | `bridge/createSession.ts`, `assistant/sessionHistory.ts` |
| `CSE` | bridge compat 代码会把 `session_*` 转成 `cse_*` infrastructure-layer id 候选，用于 reconnect lookup；缩写未在 dump 中展开。[E: bridge/sessionIdCompat.ts:54][E: bridge/sessionIdCompat.ts:56][E: bridge/bridgeMain.ts:2498][E: bridge/bridgeMain.ts:2500][U] | `bridge/sessionIdCompat.ts`, `bridge/bridgeMain.ts` |
| `FRC` | constants prompt 内变量 `getCachedMCConfigForFRC` 指向 cached microcompact config，`frc` system prompt section 调用 `getFunctionResultClearingSection`。[E: constants/prompts.ts:66][E: constants/prompts.ts:522][E: constants/prompts.ts:821] 名称可推断为 Function Result Clearing。[I] |

## Sources

- `Task.ts`
- `tools.ts`
- `utils/betas.ts`
- `constants/`
- `utils/env.ts`
- `utils/teleport.tsx`
- `bridge/`
- `cli/transports/ccrClient.ts`
- `services/api/grove.ts`
- `components/grove/Grove.tsx`
- `components/LogoV2/Clawd.tsx`
- `services/autoDream/autoDream.ts`
- `utils/swarm/`
- `utils/toolResultStorage.ts`

## 相关

- `ref.feature-flags` 记录 `tengu_*`、`KAIROS`、`PROACTIVE` 等 gate 的具体开关逻辑。
- `ref.env-vars` 记录 Conductor、terminal、CI、cloud/container detection 相关 env var。
