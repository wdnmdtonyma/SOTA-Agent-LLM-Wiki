---
id: subsys.system-prompt
title: System Prompt 组装与 system-reminder 注入
kind: subsystem
tier: T2
source: [constants/prompts.ts, constants/systemPromptSections.ts, constants/cyberRiskInstruction.ts, utils/systemPrompt.ts, utils/systemPromptType.ts, utils/queryContext.ts, utils/api.ts, utils/messages.ts]
symbols: [getSystemPrompt, buildEffectiveSystemPrompt, systemPromptSection, DANGEROUS_uncachedSystemPromptSection, resolveSystemPromptSections, clearSystemPromptSections, SYSTEM_PROMPT_DYNAMIC_BOUNDARY, CYBER_RISK_INSTRUCTION, computeEnvInfo, computeSimpleEnvInfo, enhanceSystemPromptWithEnvDetails, asSystemPrompt]
related: [spine.agent-loop, ref.prompt-catalog, subsys.compaction, subsys.memory, ref.feature-flags]
status: verified
updated: 2026-06-14
evidence: explicit
---

> 主 agent 的 system prompt 不是一个常量,而是 `getSystemPrompt()` 在每个会话按"静态可缓存段 + 边界标记 + 动态注册段"拼出的 `string[]`;`buildEffectiveSystemPrompt()` 再按优先级在它之上叠加 coordinator / agent / custom / append 变体,`<system-reminder>` 则是另一条独立通道在消息侧注入的。

## 能回答的问题

- Claude Code 的主 system prompt 是怎么拼出来的?有哪些 section、顺序如何?
- 哪些段是"静态跨会话可缓存"、哪些是"每会话/每轮动态"?`SYSTEM_PROMPT_DYNAMIC_BOUNDARY` 是干嘛的?
- `--system-prompt` / `--append-system-prompt` / agent / coordinator / loop override 之间谁覆盖谁?
- `<env>` 环境块、模型名、knowledge cutoff 从哪来?subagent 的 system prompt 和主会话有何不同?
- `<system-reminder>` 标签是 system prompt 的一部分吗?它在哪里被真正注入?
- 安全/网络风险那段(CYBER_RISK)是谁拥有的、能不能随便改?

## 职责边界

本子系统只管 **system prompt 文本的组装与分层**(静态/动态、缓存边界、优先级叠加、env 注入),以及 **system-reminder 的注入点**。各后台 LLM 调用自己的 prompt(compaction、记忆抽取、会话标题、subagent 的 system prompt 等)是另一条内容轴,集中编目在 [后台与 subagent Prompt 目录](../reference/prompt-catalog.md)。主 loop 怎么把 system prompt 喂给模型在 [Agent loop](../spine/agent-loop.md)。

## 关键文件(证据)

- **`constants/prompts.ts`** — 主组装器 `getSystemPrompt()` [E: constants/prompts.ts:444] + 所有静态 section 构造函数 + env 计算 + 边界常量。
- **`constants/systemPromptSections.ts`** — 动态 section 的注册/记忆化原语:`systemPromptSection` [E: constants/systemPromptSections.ts:20]、`DANGEROUS_uncachedSystemPromptSection` [E: constants/systemPromptSections.ts:32]、`resolveSystemPromptSections` [E: constants/systemPromptSections.ts:43]、`clearSystemPromptSections` [E: constants/systemPromptSections.ts:65]。
- **`constants/cyberRiskInstruction.ts`** — Safeguards team 拥有的安全边界指令 `CYBER_RISK_INSTRUCTION` [E: constants/cyberRiskInstruction.ts:24]。
- **`utils/systemPrompt.ts`** — 优先级叠加器 `buildEffectiveSystemPrompt()` [E: utils/systemPrompt.ts:41]。
- **`utils/systemPromptType.ts`** — 防混淆的 branded 类型 `SystemPrompt` + `asSystemPrompt()` [E: utils/systemPromptType.ts:8][E: utils/systemPromptType.ts:12]。
- **`utils/queryContext.ts`** — 主会话调用点:`getSystemPrompt(tools, mainLoopModel, …)` [E: utils/queryContext.ts:64]。
- **`utils/api.ts`** — 消费边界标记、把 prompt 切成 static/dynamic 缓存块 [E: utils/api.ts:362]。
- **`utils/messages.ts`** — `<system-reminder>` 的实际包裹点 [E: utils/messages.ts:3098]。

## 数据模型

system prompt 在内部始终是 **`string[]`**(每个元素是一段,最终由 API 层拼成 system blocks),并用 branded 类型 `SystemPrompt = readonly string[] & { __brand:'SystemPrompt' }` 防止和普通字符串数组混用 [E: utils/systemPromptType.ts:8]。

数组里有一个**哨兵字符串** `SYSTEM_PROMPT_DYNAMIC_BOUNDARY = '__SYSTEM_PROMPT_DYNAMIC_BOUNDARY__'` [E: constants/prompts.ts:114]:它之前的元素是跨组织可缓存的静态内容(`scope:'global'`),之后是 user/session 相关内容、不应缓存 [E: constants/prompts.ts:106]。注释明确警告:不更新 `utils/api.ts` 和 `services/api/claude.ts` 的缓存逻辑就不要动这个标记 [E: constants/prompts.ts:110]。

动态 section 是 `{ name, compute, cacheBreak }` 三元组;`compute` 是惰性函数,结果被 `bootstrap/state.ts` 的 section cache 记忆化,直到 `/clear` 或 `/compact` 清空 [E: constants/systemPromptSections.ts:20][E: constants/systemPromptSections.ts:50]。

## 控制流

### 1. `getSystemPrompt()` —— 主组装(constants/prompts.ts:444)

两条短路 fast-path 先走:
- `CLAUDE_CODE_SIMPLE` 环境变量为真 → 返回单段极简 prompt(只有身份 + CWD + Date)[E: constants/prompts.ts:450]。
- PROACTIVE / KAIROS 自治模式激活 → 返回"autonomous agent"精简 prompt(身份 + reminders + memory + env + proactive 段)[E: constants/prompts.ts:466]。

否则进入标准组装,返回数组按此顺序(静态在前,边界,动态在后)[E: constants/prompts.ts:560]:

**静态段(可缓存)**,均为 `constants/prompts.ts` 内的纯函数:
1. `getSimpleIntroSection` — 身份 + 安全 + URL 警告 [E: constants/prompts.ts:562]
2. `getSimpleSystemSection` — `# System` [E: constants/prompts.ts:563]
3. `getSimpleDoingTasksSection` — `# Doing tasks`(outputStyle 可关闭)[E: constants/prompts.ts:566]
4. `getActionsSection` — `# Executing actions with care` [E: constants/prompts.ts:568]
5. `getUsingYourToolsSection` — `# Using your tools` [E: constants/prompts.ts:569]
6. `getSimpleToneAndStyleSection` — `# Tone and style` [E: constants/prompts.ts:570]
7. `getOutputEfficiencySection` — `# Output efficiency`(ant 变体为 `# Communicating with the user`)[E: constants/prompts.ts:571]

**边界**:`shouldUseGlobalCacheScope()` 为真时插入 `SYSTEM_PROMPT_DYNAMIC_BOUNDARY` [E: constants/prompts.ts:573]。

**动态段(registry-managed)**:由 `dynamicSections` 数组定义、经 `resolveSystemPromptSections()` 解析 [E: constants/prompts.ts:491][E: constants/prompts.ts:557]。包含 `session_guidance`、`memory`、`ant_model_override`、`env_info_simple`、`language`、`output_style`、`mcp_instructions`(唯一的 `DANGEROUS_uncached`,因 MCP 可能跨轮连断)、`scratchpad`、`frc`、`summarize_tool_results`,以及 feature-gated 的 `numeric_length_anchors`(ant)、`token_budget`、`brief` [E: constants/prompts.ts:492][E: constants/prompts.ts:513][E: constants/prompts.ts:538]。

身份段原文(最能定位"这是 Claude Code"的一段)[E: constants/prompts.ts:180]:

```
You are an interactive agent that helps users with software engineering tasks. Use the instructions below and the tools available to you to assist the user.

<CYBER_RISK_INSTRUCTION>
IMPORTANT: You must NEVER generate or guess URLs for the user unless you are confident that the URLs are for helping the user with programming...
```

其中安全那段是独立常量,由 Safeguards team 拥有、注释明令非该团队评审不得修改 [E: constants/cyberRiskInstruction.ts:8],原文 [E: constants/cyberRiskInstruction.ts:24]:

```
IMPORTANT: Assist with authorized security testing, defensive security, CTF challenges, and educational contexts. Refuse requests for destructive techniques, DoS attacks, mass targeting, supply chain compromise, or detection evasion for malicious purposes. Dual-use security tools (C2 frameworks, credential testing, exploit development) require clear authorization context: pentesting engagements, CTF competitions, security research, or defensive use cases.
```

`# System` 段的要点 bullet(权限模式、prompt 注入、hooks、自动压缩)[E: constants/prompts.ts:187]:输出文本全部展示给用户、用 GitHub-flavored markdown [E: constants/prompts.ts:188];工具在用户选定的 permission mode 下执行、被拒后不要重试同一调用 [E: constants/prompts.ts:189];`<system-reminder>` 等标签来自 system、与所在 tool result/消息无直接关系 [E: constants/prompts.ts:190];怀疑 tool result 含 prompt injection 要先报告用户 [E: constants/prompts.ts:191];hooks 反馈(含 `<user-prompt-submit-hook>`)当作用户输入 [E: constants/prompts.ts:127];接近上下文上限会自动压缩历史 [E: constants/prompts.ts:193]。

### 2. `buildEffectiveSystemPrompt()` —— 优先级叠加(utils/systemPrompt.ts:41)

`getSystemPrompt()` 给的是 **default** prompt;真正发给模型的"有效 prompt"由 `buildEffectiveSystemPrompt()` 按优先级决定 [E: utils/systemPrompt.ts:28]:

1. **override**(如 loop 模式)存在 → 完全替换其它一切 [E: utils/systemPrompt.ts:56]。
2. **coordinator 模式**(`COORDINATOR_MODE` + 环境变量 + 无 mainThreadAgentDefinition)→ 用 `getCoordinatorSystemPrompt()` 替换 default [E: utils/systemPrompt.ts:62]。
3. **agent system prompt**(`mainThreadAgentDefinition` 存在):非 proactive 时**替换** default;proactive 时**追加**在 default 之后(`# Custom Agent Instructions`)[E: utils/systemPrompt.ts:103][E: utils/systemPrompt.ts:115]。
4. **custom**(`--system-prompt`)→ 替换 default [E: utils/systemPrompt.ts:118]。
5. **default** → 即 `getSystemPrompt()` 的结果 [E: utils/systemPrompt.ts:120]。

无论走哪条,`appendSystemPrompt`(`--append-system-prompt`)总在末尾追加(override 路径除外)[E: utils/systemPrompt.ts:121]。

### 3. env 注入与 subagent 差异

主会话用 `computeSimpleEnvInfo()` 生成 `# Environment` 段(primary cwd、是否 git repo、平台、shell、OS Version、模型名、knowledge cutoff、最新模型家族提示等)[E: constants/prompts.ts:651][E: constants/prompts.ts:705]。subagent 走另一条:`enhanceSystemPromptWithEnvDetails()` 在 agent prompt 末尾追加一段 `Notes:`(绝对路径、final response 共享文件路径、禁 emoji)再加 `computeEnvInfo()` 的 `<env>…</env>` 块 [E: constants/prompts.ts:760][E: constants/prompts.ts:784][E: constants/prompts.ts:640]。模型名/ID 在 undercover 模式下会被整段抹掉,避免未公布模型泄漏进可公开的 commit [E: constants/prompts.ts:621][E: constants/prompts.ts:694]。subagent 的 default 身份串则是 `DEFAULT_AGENT_PROMPT` [E: constants/prompts.ts:758]。

### 4. `<system-reminder>` 注入(独立通道)

system prompt 里只是**描述** reminder 的存在 [E: constants/prompts.ts:190];真正的 `<system-reminder>` 标签是在消息侧由 attachment 渲染时包裹的——`utils/messages.ts` 的包裹函数返回 `` `<system-reminder>\n${content}\n</system-reminder>` `` [E: utils/messages.ts:3098]。也就是说 reminder 不进缓存的 system prefix,而是逐轮随 user/tool 消息注入(本会话上下文里出现的那些 `<system-reminder>` 即来自此)。

### 5. 缓存切分(消费边界标记)

`utils/api.ts` 找到 `SYSTEM_PROMPT_DYNAMIC_BOUNDARY` 的下标,把数组切成 boundary 之前的 `staticBlocks` 和之后的 `dynamicBlocks`,分别打 `cacheScope`,边界本身被跳过不进 prompt [E: utils/api.ts:363][E: utils/api.ts:374][E: utils/api.ts:380]。这就是静态段能跨组织共享缓存、动态段每会话独立的落地点。

## 设计动机与权衡

- **缓存友好的静态/动态分层**:把所有 user/session 易变内容挪到边界之后,静态前缀的 Blake2b hash 才稳定、才能命中跨组织 `scope:'global'` 缓存。`getSessionSpecificGuidanceSection` 的注释专门解释:每个运行期 bit 若放在边界前都会让前缀 hash 变体翻倍(2^N)[E: constants/prompts.ts:347]。
- **section 记忆化**:`systemPromptSection` 默认 `cacheBreak:false`、跨轮记忆化;只有 `mcp_instructions` 用 `DANGEROUS_uncachedSystemPromptSection` 并强制写一句 reason,因为 MCP server 会跨轮连/断 [E: constants/prompts.ts:513]。
- **feature() = tree-shaking 边界**:大量段用 `feature('KAIROS'|'TOKEN_BUDGET'|…)` 包裹,外部构建会被 DCE 整段消除(连字符串字面量一起),所以同一份 `prompts.ts` 在 ant/external 构建下产出不同 prompt。详见 [Feature flags](../reference/feature-flags.md)。
- **`process.env.USER_TYPE === 'ant'` 内联**:很多 bullet(写注释纪律、faithful reporting、numeric length anchors 等)只在 ant 构建出现,且注释要求必须在每个 callsite 内联该判断、不得提成 const,否则 bundler 折不掉分支 [E: constants/prompts.ts:617]。

## gotcha

- **没有一个叫 `SYSTEM_PROMPT` 的"主 prompt 常量"**:主 prompt 是 `getSystemPrompt()` 运行期拼出来的数组,不是单个可 grep 的字符串;想看全文要把静态各 `get*Section()` 的返回拼起来读。
- **`<system-reminder>` 不是 system prompt 的一部分**:它在边界之后、甚至根本不在 system prefix 里,而是逐轮注入的消息附件 [E: utils/messages.ts:3098];改 system prompt 不会改 reminder 行为。
- **agent 默认替换、proactive 下却是追加**:同一个 `mainThreadAgentDefinition`,proactive 模式语义相反(追加到 autonomous 默认串之上)[E: utils/systemPrompt.ts:103],排查"为什么 agent 指令没生效/重复"时要分清模式。
- **section cache 只在 `/clear`、`/compact` 清**:`clearSystemPromptSections()` 同时重置 beta header latches [E: constants/systemPromptSections.ts:65];会话中途翻 gate 不会立刻反映到已缓存的 section。

## Sources

- `constants/prompts.ts`
- `constants/systemPromptSections.ts`
- `constants/cyberRiskInstruction.ts`
- `utils/systemPrompt.ts`
- `utils/systemPromptType.ts`
- `utils/queryContext.ts`
- `utils/api.ts`
- `utils/messages.ts`

## 相关

- [Agent loop](../spine/agent-loop.md) —— system prompt 在每轮怎么喂给模型
- [后台与 subagent Prompt 目录](../reference/prompt-catalog.md) —— 所有非主 prompt 的 LLM 调用文本
- [Compaction 压缩](compaction.md) —— `/clear`·`/compact` 清 section cache;压缩自身的 prompt 见目录节点
- [记忆系统](memory.md) —— `memory` 动态段、`loadMemoryPrompt()`
- [Feature flags](../reference/feature-flags.md) —— `feature()` DCE 如何决定段的取舍
