---
id: tool.skill
path: surface/tools/skill.md
title: Skill
kind: tool
tier: T1
status: verified
source: [tools/SkillTool/SkillTool.ts]
symbols: [SkillTool]
related: [subsys.skills]
updated: 2026-06-14
evidence: explicit
---

`Skill` 是把 prompt-based skill 注入主对话或 forked sub-agent 的工具:本地/插件/MCP skill 通过 command registry 查找,`context: "fork"` 的 skill 交给 `runAgent()` 独立执行,普通 skill 返回 `newMessages` 和可选 context modifier。[E: tools/SkillTool/constants.ts:1][E: tools/SkillTool/SkillTool.ts:399][E: tools/SkillTool/SkillTool.ts:402][E: tools/SkillTool/SkillTool.ts:622][E: tools/SkillTool/SkillTool.ts:774][E: tools/SkillTool/SkillTool.ts:775]

## 能回答的问题

- `Skill` 怎样校验 skill name、leading slash 和 prompt command 类型?
- `Skill` 的 permission rules 如何匹配 exact skill 与 `:*` prefix?
- `Skill` 什么时候 inline 注入消息,什么时候 fork 到 sub-agent?
- `Skill` 如何把 `allowedTools`、`model`、`effort` 带入后续上下文?

## 1 Identity

- Tool name: `Skill`。[E: tools/SkillTool/constants.ts:1]
- `searchHint`: `invoke a slash-command skill`。[E: tools/SkillTool/SkillTool.ts:333]
- `maxResultSizeChars`: `100_000`。[E: tools/SkillTool/SkillTool.ts:334]
- `description(input)`: 返回 `Execute skill: ${skill}`。[E: tools/SkillTool/SkillTool.ts:342]
- `prompt()`: 使用 `getPrompt(getProjectRoot())`, prompt 文本把 slash command 或 `/<something>` 解释为 skill invocation。[E: tools/SkillTool/SkillTool.ts:344][E: tools/SkillTool/prompt.ts:173][E: tools/SkillTool/prompt.ts:178]
- 注册与可见性: `getAllBaseTools()` 无条件包含 `SkillTool`; `SkillTool` 未自定义 `isEnabled()`,因此使用 `buildTool` 默认 `true`。[E: tools.ts:212][E: Tool.ts:758]

## 2 用途定位

`Skill` 不是直接执行 shell command 的工具,而是把 prompt command 转换成主循环可消费的 messages 或 forked agent 运行结果。Skill prompt 要求模型在匹配用户请求时先调用 `Skill` tool,不要只提及 skill 名称。[E: tools/SkillTool/prompt.ts:188][E: tools/SkillTool/prompt.ts:190][E: tools/SkillTool/prompt.ts:191] 可用 skill 集合来自 `getAllCommands(context)`:本地 commands 与 `loadedFrom === "mcp"` 的 MCP prompt skills 合并并按 `name` 去重。[E: tools/SkillTool/SkillTool.ts:86][E: tools/SkillTool/SkillTool.ts:89][E: tools/SkillTool/SkillTool.ts:91][E: tools/SkillTool/SkillTool.ts:93]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 | 校验 |
| --- | --- | --- | --- | --- | --- |
| `skill` | `string` | 是 | 无 | skill name,示例包含 `commit`、`review-pr`、`pdf`。[E: tools/SkillTool/SkillTool.ts:293] | `trim()` 后不能为空; leading slash 会被剥离后再查找 command。[E: tools/SkillTool/SkillTool.ts:356][E: tools/SkillTool/SkillTool.ts:366][E: tools/SkillTool/SkillTool.ts:370] |
| `args` | `string` | 否 | `undefined` | skill 的可选参数字符串。[E: tools/SkillTool/SkillTool.ts:296] | inline 路径把 `args || ""` 传给 `processPromptSlashCommand()`; fork 路径把 `args` 传给 `executeForkedSkill()`。[E: tools/SkillTool/SkillTool.ts:626][E: tools/SkillTool/SkillTool.ts:640] |

## 4 输出 & maxResultSizeChars

输出是 inline/forked union: inline output 包含 `success`、`commandName`、可选 `allowedTools`、可选 `model` 和可选 `status: "inline"`; forked output 包含 `success`、`commandName`、`status: "forked"`、`agentId`、`result`。[E: tools/SkillTool/SkillTool.ts:304][E: tools/SkillTool/SkillTool.ts:305][E: tools/SkillTool/SkillTool.ts:306][E: tools/SkillTool/SkillTool.ts:310][E: tools/SkillTool/SkillTool.ts:311][E: tools/SkillTool/SkillTool.ts:316][E: tools/SkillTool/SkillTool.ts:317][E: tools/SkillTool/SkillTool.ts:318][E: tools/SkillTool/SkillTool.ts:319][E: tools/SkillTool/SkillTool.ts:322] inline mapper 给模型返回 `Launching skill: ${commandName}`; forked mapper 返回 skill 完成文本和 forked result。[E: tools/SkillTool/SkillTool.ts:848][E: tools/SkillTool/SkillTool.ts:852][E: tools/SkillTool/SkillTool.ts:857][E: tools/SkillTool/SkillTool.ts:860] `maxResultSizeChars=100_000` 是 tool 声明值。[E: tools/SkillTool/SkillTool.ts:334]

## 5 行为标志

| 标志 | 实际值 | 原因 |
| --- | --- | --- |
| `isEnabled()` | 默认 `true` | `SkillTool` 在 base tools 中无条件注册,且未覆盖 `buildTool` 的 default `isEnabled`。[E: tools.ts:212][E: Tool.ts:758] |
| `isReadOnly()` | 默认 `false` | `SkillTool` 没有显式只读声明; `buildTool` 的 default `isReadOnly` 返回 false。[I][E: Tool.ts:760] |
| `isConcurrencySafe()` | 默认 `false` | `SkillTool` 没有并发安全声明; `buildTool` 的 default `isConcurrencySafe` 返回 false。[I][E: Tool.ts:759] |
| `isDestructive()` | 默认 `false` | `SkillTool` 没有自定义 destructive flag; `buildTool` 的 default `isDestructive` 返回 false。[I][E: Tool.ts:761] |
| `shouldDefer` | 未声明 | `SkillTool` object 没有设置 `shouldDefer`;该判断来自字段缺省。[I] |
| `toAutoClassifierInput` | skill name | classifier input 只记录 `skill` 字符串,用于避免 skill-coach 误报未调用 skill。[E: tools/SkillTool/SkillTool.ts:352] |

## 6 权限

`validateInput()` 先规范化 skill name,再处理 ant-only `EXPERIMENTAL_SKILL_SEARCH` 的 `_canonical_<slug>` remote skill; remote slug 未被本 session discover 时返回 errorCode 6。[E: tools/SkillTool/SkillTool.ts:377][E: tools/SkillTool/SkillTool.ts:381][E: tools/SkillTool/SkillTool.ts:385][E: tools/SkillTool/SkillTool.ts:389][E: tools/SkillTool/SkillTool.ts:390] 本地/MCP skill 校验通过 `findCommand(...)` 查找 command,拒绝 unknown skill、`disableModelInvocation` skill 和非 `prompt` 类型 command。[E: tools/SkillTool/SkillTool.ts:399][E: tools/SkillTool/SkillTool.ts:402][E: tools/SkillTool/SkillTool.ts:412][E: tools/SkillTool/SkillTool.ts:421]

`checkPermissions()` 先剥离 leading slash,读取 `toolPermissionContext`,并用 exact match 或 `:*` prefix match 处理 `Skill(...)` rule content。[E: tools/SkillTool/SkillTool.ts:437][E: tools/SkillTool/SkillTool.ts:440][E: tools/SkillTool/SkillTool.ts:451][E: tools/SkillTool/SkillTool.ts:458][E: tools/SkillTool/SkillTool.ts:462] deny rules 优先返回 `behavior: "deny"`; remote canonical skill 在 deny 之后 auto-allow; allow rules 命中后返回 `behavior: "allow"`。[E: tools/SkillTool/SkillTool.ts:470][E: tools/SkillTool/SkillTool.ts:477][E: tools/SkillTool/SkillTool.ts:492][E: tools/SkillTool/SkillTool.ts:498][E: tools/SkillTool/SkillTool.ts:507][E: tools/SkillTool/SkillTool.ts:514] 若 prompt command 只含 allowlist 中的 safe properties,权限也 auto-allow;否则默认 `ask`,并给出 exact skill 与 prefix 两种 localSettings rule suggestion。[E: tools/SkillTool/SkillTool.ts:529][E: tools/SkillTool/SkillTool.ts:533][E: tools/SkillTool/SkillTool.ts:542][E: tools/SkillTool/SkillTool.ts:570][E: tools/SkillTool/SkillTool.ts:571]

## 7 call() 走读

`call()` 再次规范化 skill name,在 remote canonical gate 命中时执行 `executeRemoteSkill(...)`,否则从 command registry 中查找 command 并记录 skill usage。[E: tools/SkillTool/SkillTool.ts:595][E: tools/SkillTool/SkillTool.ts:605][E: tools/SkillTool/SkillTool.ts:611][E: tools/SkillTool/SkillTool.ts:615][E: tools/SkillTool/SkillTool.ts:619] 当 command 是 `type: "prompt"` 且 `context === "fork"` 时,`call()` 进入 `executeForkedSkill(...)`; forked skill 用 `prepareForkedCommandContext(...)` 构造 prompt messages 和 modified app state,再同步调用 `runAgent(...)` 收集 agent messages。[E: tools/SkillTool/SkillTool.ts:622][E: tools/SkillTool/SkillTool.ts:623][E: tools/SkillTool/SkillTool.ts:205][E: tools/SkillTool/SkillTool.ts:223][E: tools/SkillTool/SkillTool.ts:231] forked 路径会把 tool-use progress 转成 `skill_progress`,提取最终 result 文本,并在 finally 中清理 invoked skill state。[E: tools/SkillTool/SkillTool.ts:250][E: tools/SkillTool/SkillTool.ts:254][E: tools/SkillTool/SkillTool.ts:264][E: tools/SkillTool/SkillTool.ts:276][E: tools/SkillTool/SkillTool.ts:287]

inline 路径动态 import `processPromptSlashCommand(...)`,过滤 progress 和 command-message 后用 `tagMessagesWithToolUseID(...)` 生成 transient `newMessages`。[E: tools/SkillTool/SkillTool.ts:635][E: tools/SkillTool/SkillTool.ts:638][E: tools/SkillTool/SkillTool.ts:735][E: tools/SkillTool/SkillTool.ts:745][E: tools/SkillTool/SkillTool.ts:746][E: tools/SkillTool/SkillTool.ts:754] inline result 的 `contextModifier` 会把 skill-provided `allowedTools` 合并到 `alwaysAllowRules.command`,用 `resolveSkillModelOverride(...)` 设置 model override,并在存在 `effort` 时覆盖 app state 的 `effortValue`。[E: tools/SkillTool/SkillTool.ts:779][E: tools/SkillTool/SkillTool.ts:794][E: tools/SkillTool/SkillTool.ts:810][E: tools/SkillTool/SkillTool.ts:815][E: tools/SkillTool/SkillTool.ts:824][E: tools/SkillTool/SkillTool.ts:832]

remote skill 路径只在 `EXPERIMENTAL_SKILL_SEARCH` 且 ant 用户分支中可达;它加载 discovered remote skill,剥离 frontmatter,插入 base directory header,替换 `${CLAUDE_SKILL_DIR}` 与 `${CLAUDE_SESSION_ID}`,注册 invoked skill,再把 final content 包成 meta user message 返回。[E: tools/SkillTool/SkillTool.ts:605][E: tools/SkillTool/SkillTool.ts:607][E: tools/SkillTool/SkillTool.ts:611][E: tools/SkillTool/SkillTool.ts:969][E: tools/SkillTool/SkillTool.ts:991][E: tools/SkillTool/SkillTool.ts:1068][E: tools/SkillTool/SkillTool.ts:1073][E: tools/SkillTool/SkillTool.ts:1077][E: tools/SkillTool/SkillTool.ts:1078][E: tools/SkillTool/SkillTool.ts:1080][E: tools/SkillTool/SkillTool.ts:1088][E: tools/SkillTool/SkillTool.ts:1101]

## 8 渲染

`Skill` 使用 `renderToolResultMessage`、`renderToolUseMessage`、`renderToolUseProgressMessage`、`renderToolUseRejectedMessage` 和 `renderToolUseErrorMessage`。[E: tools/SkillTool/SkillTool.ts:864][E: tools/SkillTool/SkillTool.ts:865][E: tools/SkillTool/SkillTool.ts:866][E: tools/SkillTool/SkillTool.ts:867][E: tools/SkillTool/SkillTool.ts:868] UI 中 forked result 显示 `Done`,inline result 显示 `Successfully loaded skill` 并可追加 allowed tool 数和 model; progress UI 最多展示最近 3 条非 verbose subagent messages。[E: tools/SkillTool/UI.tsx:20][E: tools/SkillTool/UI.tsx:22][E: tools/SkillTool/UI.tsx:25][E: tools/SkillTool/UI.tsx:29][E: tools/SkillTool/UI.tsx:32][E: tools/SkillTool/UI.tsx:38][E: tools/SkillTool/UI.tsx:76]

## 9 设计动机·edge·历史

- MCP prompt 只有在 `loadedFrom === "mcp"` 时才被 SkillTool 纳入,普通 MCP prompts 不会被猜名调用。[E: tools/SkillTool/SkillTool.ts:86][E: tools/SkillTool/SkillTool.ts:89]
- Permission allowlist 使用 property-level safe set;如果未来新增 PromptCommand 字段且带有 meaningful value,`skillHasOnlySafeProperties()` 会返回 false,从而走 ask 分支。[E: tools/SkillTool/SkillTool.ts:875][E: tools/SkillTool/SkillTool.ts:911][E: tools/SkillTool/SkillTool.ts:930]
- Remote skill content 在 remote branch 中直接作为 meta user message 注入;它没有进入 inline 路径的 `processPromptSlashCommand(...)` 调用。[E: tools/SkillTool/SkillTool.ts:605][E: tools/SkillTool/SkillTool.ts:611][E: tools/SkillTool/SkillTool.ts:635][E: tools/SkillTool/SkillTool.ts:1104]

## Sources

- `tools/SkillTool/SkillTool.ts`
- `tools/SkillTool/constants.ts`
- `tools/SkillTool/prompt.ts`
- `tools/SkillTool/UI.tsx`
- `tools.ts`
- `Tool.ts`

## 相关

- `subsys.skills`
