---
id: ref.prompt-catalog
title: 后台与 subagent Prompt 目录
kind: reference
tier: T3
source: [services/compact/prompt.ts, services/extractMemories/prompts.ts, services/SessionMemory/prompts.ts, services/PromptSuggestion/promptSuggestion.ts, services/autoDream/consolidationPrompt.ts, services/MagicDocs/prompts.ts, services/toolUseSummary/toolUseSummaryGenerator.ts, tools/AgentTool/built-in/exploreAgent.ts, tools/AgentTool/built-in/planAgent.ts, tools/AgentTool/built-in/generalPurposeAgent.ts, tools/AgentTool/built-in/verificationAgent.ts, tools/AgentTool/built-in/claudeCodeGuideAgent.ts, tools/AgentTool/built-in/statuslineSetup.ts, components/agents/generateAgent.ts, memdir/findRelevantMemories.ts, utils/claudemd.ts, utils/sessionTitle.ts, utils/agenticSessionSearch.ts, utils/swarm/teammatePromptAddendum.ts, utils/permissions/yoloClassifier.ts, coordinator/coordinatorMode.ts, commands/init.ts, commands/insights.ts, constants/outputStyles.ts, constants/prompts.ts, cli/handlers/autoMode.ts, cli/print.ts, skills/bundled/remember.ts, skills/bundled/simplify.ts, skills/bundled/skillify.ts, skills/bundled/stuck.ts, tools/AskUserQuestionTool/prompt.ts]
symbols: [getCompactPrompt, getPartialCompactPrompt, formatCompactSummary, getCompactUserSummaryMessage, EXPLORE_AGENT, PLAN_AGENT, GENERAL_PURPOSE_AGENT, VERIFICATION_AGENT, CLAUDE_CODE_GUIDE_AGENT, STATUSLINE_SETUP_AGENT, VERIFICATION_SYSTEM_PROMPT, STATUSLINE_SYSTEM_PROMPT, DEFAULT_SESSION_MEMORY_TEMPLATE, SELECT_MEMORIES_SYSTEM_PROMPT, MEMORY_INSTRUCTION_PROMPT, AGENT_CREATION_SYSTEM_PROMPT, AGENT_MEMORY_INSTRUCTIONS, TEAMMATE_SYSTEM_PROMPT_ADDENDUM, SHUTDOWN_TEAM_PROMPT, DEFAULT_AGENT_PROMPT, getCoordinatorSystemPrompt, SESSION_TITLE_PROMPT, SESSION_SEARCH_SYSTEM_PROMPT, SUMMARIZE_CHUNK_PROMPT, FACET_EXTRACTION_PROMPT, TOOL_USE_SUMMARY_SYSTEM_PROMPT, CRITIQUE_SYSTEM_PROMPT, SUGGESTION_PROMPT, buildConsolidationPrompt, NEW_INIT_PROMPT, OLD_INIT_PROMPT, SKILL_PROMPT, SIMPLIFY_PROMPT, SKILLIFY_PROMPT, STUCK_PROMPT, EXPLANATORY_FEATURE_PROMPT, PREVIEW_FEATURE_PROMPT, buildDefaultExternalSystemPrompt]
related: [subsys.system-prompt, subsys.compaction, subsys.memory, subsys.swarm, tool.agent, spine.agent-loop, subsys.command-system]
status: verified
updated: 2026-06-14
evidence: explicit
---

> Claude Code 里除主 system prompt 外,还有几十个"看不见的 LLM 调用"各自带 prompt——会话压缩、记忆抽取、标题生成、内置 subagent 的人格、建议、洞察分类等。本节点把它们逐条编目(住哪 · 干啥 · 触发),并对压缩与 subagent 这两类高价值 prompt 贴关键原文。

## 能回答的问题

- `/compact`(以及自动压缩)到底用什么 prompt 让模型写 summary?summary 有哪 9 个 section?
- 6 个内置 subagent(Explore / Plan / general-purpose / verification / claude-code-guide / statusline-setup)各自的 system prompt 是什么?各用什么模型?
- 生成会话标题、记忆抽取、下一句建议、洞察(insights)分类分别用哪个 prompt、在哪个文件?
- 团队/协调/teammate 模式给 agent 叠了什么 prompt?
- `/init` 生成 CLAUDE.md、bundled skills(/remember /simplify /skillify /stuck)的 prompt 在哪?
- auto-mode/yolo 权限分类器的 prompt 为什么 grep 不到原文?

> 主 system prompt 的组装、缓存边界、优先级叠加不在这里,见 [System Prompt 组装与 system-reminder 注入](../subsystems/system-prompt.md)。每个 tool 自己的描述 prompt(`tools/<X>Tool/prompt.ts`)在各 T1 工具节点里。

## A. 会话压缩 Compaction(`services/compact/prompt.ts`)

`/compact`、自动压缩、microcompact 等都从这里取 prompt。两个入口 `getCompactPrompt()`(整段)[E: services/compact/prompt.ts:293] 和 `getPartialCompactPrompt()`(部分,`from`/`up_to` 两个方向)[E: services/compact/prompt.ts:274] 都把 `NO_TOOLS_PREAMBLE` + 模板 + `NO_TOOLS_TRAILER` 拼起来。

`NO_TOOLS_PREAMBLE` 放在最前、明确"工具调用会被拒绝并浪费你唯一的一轮",因为压缩走 `maxTurns:1` 的 fork,被拒的工具调用会导致空输出 [E: services/compact/prompt.ts:19][E: services/compact/prompt.ts:15]:

```
CRITICAL: Respond with TEXT ONLY. Do NOT call any tools.
...
- Tool calls will be REJECTED and will waste your only turn — you will fail the task.
- Your entire response must be plain text: an <analysis> block followed by a <summary> block.
```

主模板 `BASE_COMPACT_PROMPT` 要求模型先在 `<analysis>` 里逐条过一遍对话,再产出固定 9 段 summary [E: services/compact/prompt.ts:61][E: services/compact/prompt.ts:68]:

```
1. Primary Request and Intent   2. Key Technical Concepts
3. Files and Code Sections      4. Errors and fixes
5. Problem Solving              6. All user messages
7. Pending Tasks                8. Current Work
9. Optional Next Step  (含"verbatim 引用最近任务以防 drift"的硬要求)
```

变体:`PARTIAL_COMPACT_PROMPT`(只总结保留上下文之后的近段)[E: services/compact/prompt.ts:145];`PARTIAL_COMPACT_UP_TO_PROMPT`(summary 置于续接会话开头,故第 8/9 段改为 Work Completed / Context for Continuing Work)[E: services/compact/prompt.ts:208]。产出后 `formatCompactSummary()` 剥掉 `<analysis>` 草稿、把 `<summary>` 换成可读标题 [E: services/compact/prompt.ts:311];`getCompactUserSummaryMessage()` 再包成 "This session is being continued…" 的续接消息,`suppressFollowUpQuestions` 时追加"直接继续、别复述 summary" [E: services/compact/prompt.ts:337][E: services/compact/prompt.ts:358]。压缩机制本身见 [压缩家族](../subsystems/compaction.md)。

## B. 内置 subagent system prompts(6 个,`tools/AgentTool/built-in/`)

经 `Agent` 工具按 `subagent_type` spawn;每个 `BuiltInAgentDefinition` 用 `getSystemPrompt` 返回人格串。详见 [Agent 工具](../surface/tools/agent.md)、[多 agent 与 Swarm](../subsystems/swarm.md)。

| agentType | 模型 | system prompt | 定位 |
|---|---|---|---|
| `Explore` | ant=inherit / 外部=haiku [E: tools/AgentTool/built-in/exploreAgent.ts:78] | `getExploreSystemPrompt` [E: tools/AgentTool/built-in/exploreAgent.ts:13] | 只读文件搜索专家;强 READ-ONLY 禁改 [E: tools/AgentTool/built-in/exploreAgent.ts:26] |
| `Plan` | inherit [E: tools/AgentTool/built-in/planAgent.ts:87] | `getPlanV2SystemPrompt` [E: tools/AgentTool/built-in/planAgent.ts:14] | 只读架构/规划 [E: tools/AgentTool/built-in/planAgent.ts:21],末尾列 Critical Files [E: tools/AgentTool/built-in/planAgent.ts:64] |
| `general-purpose` | 默认 subagent 模型 | `getGeneralPurposeSystemPrompt` [E: tools/AgentTool/built-in/generalPurposeAgent.ts:19] | 通用研究/多步检索;`SHARED_PREFIX`+`SHARED_GUIDELINES` [E: tools/AgentTool/built-in/generalPurposeAgent.ts:3] |
| `verification` | inherit [E: tools/AgentTool/built-in/verificationAgent.ts:148],background [E: tools/AgentTool/built-in/verificationAgent.ts:138] | `VERIFICATION_SYSTEM_PROMPT` [E: tools/AgentTool/built-in/verificationAgent.ts:10] | 对抗式验收,必须 `VERDICT: PASS/FAIL/PARTIAL` [E: tools/AgentTool/built-in/verificationAgent.ts:117] |
| `claude-code-guide` | haiku [E: tools/AgentTool/built-in/claudeCodeGuideAgent.ts:119] | `getClaudeCodeGuideBasePrompt` [E: tools/AgentTool/built-in/claudeCodeGuideAgent.ts:23] | 答 Claude Code/SDK/API 三域文档问题 [E: tools/AgentTool/built-in/claudeCodeGuideAgent.ts:30] |
| `statusline-setup` | sonnet [E: tools/AgentTool/built-in/statuslineSetup.ts:141] | `STATUSLINE_SYSTEM_PROMPT` [E: tools/AgentTool/built-in/statuslineSetup.ts:3] | PS1→statusLine 配置;内含完整 stdin JSON schema [E: tools/AgentTool/built-in/statuslineSetup.ts:35] |

verification agent 的开场把"不要确认它能跑,而是设法弄坏它"作为使命,并点名两种失败模式(verification avoidance、被前 80% 迷惑)[E: tools/AgentTool/built-in/verificationAgent.ts:10][E: tools/AgentTool/built-in/verificationAgent.ts:12]:

```
You are a verification specialist. Your job is not to confirm the implementation works — it's to try to break it.
...
The first 80% is the easy part. Your entire value is in finding the last 20%.
```

它强制每个 check 带 `Command run` / `Output observed` / `Result`,无命令块的 PASS 视为跳过、会被驳回 [E: tools/AgentTool/built-in/verificationAgent.ts:81]。Explore/Plan 共享同一段 READ-ONLY 禁令(禁 Write/Edit/rm/mv/重定向/改状态)[E: tools/AgentTool/built-in/exploreAgent.ts:26][E: tools/AgentTool/built-in/planAgent.ts:23]。subagent 的 default 身份串(无自定义 agent 时)是 `DEFAULT_AGENT_PROMPT` [E: constants/prompts.ts:758]。

## C. 记忆 Memory prompts

| 符号 | 定义处 | 用途 |
|---|---|---|
| extractMemories `opener()` | [E: services/extractMemories/prompts.ts:29] | 后台记忆抽取 subagent(主 agent 本轮没自己写记忆时才触发);"You are now acting as the memory extraction subagent" [E: services/extractMemories/prompts.ts:35] |
| `DEFAULT_SESSION_MEMORY_TEMPLATE` | [E: services/SessionMemory/prompts.ts:11] | session memory 文件的默认模板骨架 |
| `SELECT_MEMORIES_SYSTEM_PROMPT` | [E: memdir/findRelevantMemories.ts:18] | 按 query 从记忆清单里挑相关记忆喂给主 loop |
| `MEMORY_INSTRUCTION_PROMPT` | [E: utils/claudemd.ts:89] | CLAUDE.md/记忆机制注入主 prompt 的指令段 |
| `AGENT_MEMORY_INSTRUCTIONS` | [E: components/agents/generateAgent.ts:100] | 自定义 agent 的记忆使用说明 |

记忆系统整体见 [记忆与 CLAUDE.md](../subsystems/memory.md)。

## D. 标题 / 搜索 / 摘要 / 洞察

| 符号 | 定义处 | 用途 |
|---|---|---|
| `SESSION_TITLE_PROMPT` | [E: utils/sessionTitle.ts:56] | 后台给会话生成 3–7 词标题 |
| `SESSION_SEARCH_SYSTEM_PROMPT` | [E: utils/agenticSessionSearch.ts:15] | agentic 会话搜索:按 query 找相关历史会话 |
| `SUMMARIZE_CHUNK_PROMPT` | [E: commands/insights.ts:870] | `/insights` 分块摘要 transcript |
| `FACET_EXTRACTION_PROMPT` | [E: commands/insights.ts:430] | `/insights` 从会话抽结构化 facet |
| `TOOL_USE_SUMMARY_SYSTEM_PROMPT` | [E: services/toolUseSummary/toolUseSummaryGenerator.ts:15] | 给一组工具调用写 ≈30 字单行 label(移动端展示)|

## E. 建议 / 后台维护

| 符号 | 定义处 | 用途 |
|---|---|---|
| `SUGGESTION_PROMPT` | [E: services/PromptSuggestion/promptSuggestion.ts:258] | 预测用户下一句会输入什么(SUGGESTION MODE)|
| `buildConsolidationPrompt` | [E: services/autoDream/consolidationPrompt.ts:10] | autoDream 后台整合 |
| `getUpdatePromptTemplate` | [E: services/MagicDocs/prompts.ts:8] | Magic Docs 据对话就地更新文档,强调"非 changelog、保持 CURRENT" |
| `CRITIQUE_SYSTEM_PROMPT` | [E: cli/handlers/autoMode.ts:49] | 评审用户写的 auto-mode 分类器规则(allow/soft_deny/environment)的清晰度/完备性/冲突 |

## F. 创建 / 团队 / 协调

| 符号 | 定义处 | 用途 |
|---|---|---|
| `AGENT_CREATION_SYSTEM_PROMPT` | [E: components/agents/generateAgent.ts:26] | 新建自定义 agent 向导:把需求翻成 agent 规格 |
| `TEAMMATE_SYSTEM_PROMPT_ADDENDUM` | [E: utils/swarm/teammatePromptAddendum.ts:8] | teammate 模式叠加在 agent prompt 上的附录 |
| `getCoordinatorSystemPrompt` | [E: coordinator/coordinatorMode.ts:111] | coordinator 模式整段替换 default(见 [Swarm](../subsystems/swarm.md))|
| `SHUTDOWN_TEAM_PROMPT` | [E: cli/print.ts:379] | 关闭团队时注入的 `<system-reminder>` |

## G. `/init` · bundled skills · output styles

| 符号 | 定义处 | 用途 |
|---|---|---|
| `NEW_INIT_PROMPT` | [E: commands/init.ts:28] | `/init` 新版:生成精简 CLAUDE.md(+ 可选 skills/hooks)|
| `OLD_INIT_PROMPT` | [E: commands/init.ts:6] | `/init` 旧版:分析代码库生成 CLAUDE.md |
| `SKILL_PROMPT` | [E: skills/bundled/remember.ts:9] | `/remember` 记忆复盘 |
| `SIMPLIFY_PROMPT` | [E: skills/bundled/simplify.ts:4] | `/simplify` 代码精简复审 |
| `SKILLIFY_PROMPT` | [E: skills/bundled/skillify.ts:22] | `/skillify` 把流程固化成 skill |
| `STUCK_PROMPT` | [E: skills/bundled/stuck.ts:6] | `/stuck` 诊断卡死/变慢会话 |
| `EXPLANATORY_FEATURE_PROMPT` | [E: constants/outputStyles.ts:30] | Explanatory output style 的注入段 |
| `PREVIEW_FEATURE_PROMPT` | [E: tools/AskUserQuestionTool/prompt.ts:10] | AskUserQuestion 的 preview 特性 prompt |

## H. 权限分类器(auto-mode / yolo)—— 原文不在 dump 内

auto-mode/yolo 的权限分类 prompt 不是内联字符串,而是 `feature('TRANSCRIPT_CLASSIFIER')` 时用 `require()` 从 `.txt` 资源加载:`BASE_PROMPT` ← `yolo-classifier-prompts/auto_mode_system_prompt.txt` [E: utils/permissions/yoloClassifier.ts:54],`EXTERNAL_PERMISSIONS_TEMPLATE` ← `permissions_external.txt` [E: utils/permissions/yoloClassifier.ts:61],由 `buildDefaultExternalSystemPrompt()` 拼出最终分类器 system prompt [E: utils/permissions/yoloClassifier.ts:125]。**但 `utils/permissions/yolo-classifier-prompts/` 目录不在本 dump 中**,故这些 `.txt` 的实际文本无法核验 [U]。

## 覆盖说明

本目录覆盖"主 system prompt 之外、由代码常量/模板定义的 LLM 调用 prompt"。已知边界:
- 各 tool 自身的描述 prompt(`tools/<X>Tool/prompt.ts`,约 40+)归各 T1 工具节点,不在此重列。
- auto-mode/yolo 分类器 `.txt` 原文缺失(见 §H)[U]。
- 极少数 feature-gated 实验 prompt(如 `BriefTool`、`DiscoverSkillsTool`)随 DCE 取舍,仅在对应 feature 构建出现。

## Sources

- `services/compact/prompt.ts`
- `services/extractMemories/prompts.ts` · `services/SessionMemory/prompts.ts` · `memdir/findRelevantMemories.ts` · `utils/claudemd.ts` · `components/agents/generateAgent.ts`
- `tools/AgentTool/built-in/{exploreAgent,planAgent,generalPurposeAgent,verificationAgent,claudeCodeGuideAgent,statuslineSetup}.ts`
- `utils/sessionTitle.ts` · `utils/agenticSessionSearch.ts` · `commands/insights.ts`
- `services/PromptSuggestion/promptSuggestion.ts` · `services/autoDream/consolidationPrompt.ts` · `services/MagicDocs/prompts.ts` · `services/toolUseSummary/toolUseSummaryGenerator.ts` · `cli/handlers/autoMode.ts`
- `utils/swarm/teammatePromptAddendum.ts` · `coordinator/coordinatorMode.ts` · `cli/print.ts` · `constants/prompts.ts`
- `commands/init.ts` · `skills/bundled/{remember,simplify,skillify,stuck}.ts` · `constants/outputStyles.ts` · `tools/AskUserQuestionTool/prompt.ts`
- `utils/permissions/yoloClassifier.ts`

## 相关

- [System Prompt 组装与 system-reminder 注入](../subsystems/system-prompt.md) —— 主 prompt 的分层与缓存
- [压缩家族](../subsystems/compaction.md) —— §A 压缩 prompt 的调用方
- [记忆与 CLAUDE.md](../subsystems/memory.md) —— §C 记忆 prompt 的调用方
- [多 agent 与 Swarm](../subsystems/swarm.md) —— §B subagent、§F 团队/协调
- [Agent 工具](../surface/tools/agent.md) —— §B 内置 subagent 的 spawn 入口
