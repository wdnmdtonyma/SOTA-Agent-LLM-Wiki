---
id: tool.ask-user-question
path: surface/tools/ask-user-question.md
title: AskUserQuestion
kind: tool
tier: T1
status: verified
source: [tools/AskUserQuestionTool/AskUserQuestionTool.tsx]
symbols: [AskUserQuestionTool]
related: [tool.exit-plan-mode]
updated: 2026-06-14
evidence: explicit
---

`AskUserQuestion` 是让 Claude 在执行中向用户发起 1-4 个选择题的 deferred、read-only、requires user interaction 工具, 结果会回到模型上下文作为 `tool_result`。[E: tools/AskUserQuestionTool/prompt.ts:3][E: tools/AskUserQuestionTool/AskUserQuestionTool.tsx:63][E: tools/AskUserQuestionTool/AskUserQuestionTool.tsx:113][E: tools/AskUserQuestionTool/AskUserQuestionTool.tsx:149][E: tools/AskUserQuestionTool/AskUserQuestionTool.tsx:155][E: tools/AskUserQuestionTool/AskUserQuestionTool.tsx:240][E: tools/AskUserQuestionTool/AskUserQuestionTool.tsx:241]

## 能回答的问题

- `AskUserQuestion` 的问题、选项、preview 和 multi-select 字段如何校验?
- `AskUserQuestion` 什么时候会从工具列表中禁用?
- `AskUserQuestion` 如何把用户答案映射成模型可读的 `tool_result`?

## 1 Identity

- Tool name: `AskUserQuestion`。[E: tools/AskUserQuestionTool/prompt.ts:3]
- `tools.ts` 在 base tools 中注册 `AskUserQuestionTool`。[E: tools.ts:211]
- `searchHint`: `prompt the user with a multiple-choice question`。[E: tools/AskUserQuestionTool/AskUserQuestionTool.tsx:111]
- `maxResultSizeChars`: `100_000`。[E: tools/AskUserQuestionTool/AskUserQuestionTool.tsx:112]
- `shouldDefer`: `true`。[E: tools/AskUserQuestionTool/AskUserQuestionTool.tsx:113]
- prompt 会按 `getQuestionPreviewFormat()` 决定是否拼接 markdown/html preview 指南。[E: tools/AskUserQuestionTool/AskUserQuestionTool.tsx:117][E: tools/AskUserQuestionTool/AskUserQuestionTool.tsx:124]

## 2 用途定位

`AskUserQuestion` 的 prompt 要求在执行中收集偏好、澄清歧义、取得实现选择或给用户方向选择; 在 plan mode 里, prompt 要求把该工具用于澄清需求或选择方案, plan approval 则交给 `ExitPlanMode`。[E: tools/AskUserQuestionTool/prompt.ts:32][E: tools/AskUserQuestionTool/prompt.ts:43]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| `questions` | `Question[]` | 是 | 无 | 1-4 个问题, 顶层 `strictObject` 只接受 schema 内字段。[E: tools/AskUserQuestionTool/AskUserQuestionTool.tsx:62][E: tools/AskUserQuestionTool/AskUserQuestionTool.tsx:63] |
| `questions[].question` | `string` | 是 | 无 | 完整问题文本, schema 描述要求清楚、具体并以问号结束。[E: tools/AskUserQuestionTool/AskUserQuestionTool.tsx:20] |
| `questions[].header` | `string` | 是 | 无 | 短 chip/tag 文本, 由 schema 描述约束为最多 `ASK_USER_QUESTION_TOOL_CHIP_WIDTH` 字符。[E: tools/AskUserQuestionTool/AskUserQuestionTool.tsx:21] |
| `questions[].options` | `QuestionOption[]` | 是 | 无 | 每题 2-4 个选项, schema 描述要求互斥且不要包含 `Other`。[E: tools/AskUserQuestionTool/AskUserQuestionTool.tsx:22] |
| `questions[].options[].label` | `string` | 是 | 无 | 用户看到并选择的选项文本。[E: tools/AskUserQuestionTool/AskUserQuestionTool.tsx:15] |
| `questions[].options[].description` | `string` | 是 | 无 | 解释选项含义、后果或 trade-off。[E: tools/AskUserQuestionTool/AskUserQuestionTool.tsx:16] |
| `questions[].options[].preview` | `string` | 否 | `undefined` | 聚焦选项时渲染的可选 preview 内容。[E: tools/AskUserQuestionTool/AskUserQuestionTool.tsx:17] |
| `questions[].multiSelect` | `boolean` | 否 | `false` | 为 `true` 时允许多选。[E: tools/AskUserQuestionTool/AskUserQuestionTool.tsx:23] |
| `answers` | `Record<string,string>` | 否 | `{}` in `call()` | permission component 收集到的答案, key 是问题文本。[E: tools/AskUserQuestionTool/AskUserQuestionTool.tsx:56][E: tools/AskUserQuestionTool/AskUserQuestionTool.tsx:211] |
| `annotations` | `Record<string,{preview?,notes?}>` | 否 | `undefined` | 用户对每个问题的 preview/notes 注释。[E: tools/AskUserQuestionTool/AskUserQuestionTool.tsx:27][E: tools/AskUserQuestionTool/AskUserQuestionTool.tsx:28][E: tools/AskUserQuestionTool/AskUserQuestionTool.tsx:30] |
| `metadata.source` | `string` | 否 | `undefined` | analytics tracking 用的可选来源标识, 不展示给用户。[E: tools/AskUserQuestionTool/AskUserQuestionTool.tsx:59][E: tools/AskUserQuestionTool/AskUserQuestionTool.tsx:60] |

`UNIQUENESS_REFINE` 要求所有 question text 全局唯一, 且同一问题内 option label 唯一。[E: tools/AskUserQuestionTool/AskUserQuestionTool.tsx:42][E: tools/AskUserQuestionTool/AskUserQuestionTool.tsx:47][E: tools/AskUserQuestionTool/AskUserQuestionTool.tsx:65]

## 4 输出 & maxResultSizeChars

输出 schema 包含 `questions`、`answers` 和可选 `annotations`。[E: tools/AskUserQuestionTool/AskUserQuestionTool.tsx:70][E: tools/AskUserQuestionTool/AskUserQuestionTool.tsx:71][E: tools/AskUserQuestionTool/AskUserQuestionTool.tsx:72] `call()` 返回同一组 `questions`、`answers` 和存在时的 `annotations`。[E: tools/AskUserQuestionTool/AskUserQuestionTool.tsx:216][E: tools/AskUserQuestionTool/AskUserQuestionTool.tsx:220] `mapToolResultToToolResultBlockParam()` 把每个答案序列化为 `"question"="answer"`, 并把选中 preview 与 user notes 拼进 `tool_result.content`。[E: tools/AskUserQuestionTool/AskUserQuestionTool.tsx:230][E: tools/AskUserQuestionTool/AskUserQuestionTool.tsx:231][E: tools/AskUserQuestionTool/AskUserQuestionTool.tsx:235][E: tools/AskUserQuestionTool/AskUserQuestionTool.tsx:240][E: tools/AskUserQuestionTool/AskUserQuestionTool.tsx:241]

## 5 行为标志

| 标志 | 实际值 | 原因 |
| --- | --- | --- |
| `shouldDefer` | `true` | 工具定义显式设置 deferred loading。[E: tools/AskUserQuestionTool/AskUserQuestionTool.tsx:113] |
| `isEnabled()` | channels 场景可禁用 | 当 `feature('KAIROS') || feature('KAIROS_CHANNELS')` 且 `getAllowedChannels().length > 0` 时返回 `false`, 否则返回 `true`。[E: tools/AskUserQuestionTool/AskUserQuestionTool.tsx:141][E: tools/AskUserQuestionTool/AskUserQuestionTool.tsx:142][E: tools/AskUserQuestionTool/AskUserQuestionTool.tsx:144] |
| `isConcurrencySafe()` | `true` | 源码直接返回 true。[E: tools/AskUserQuestionTool/AskUserQuestionTool.tsx:146][E: tools/AskUserQuestionTool/AskUserQuestionTool.tsx:147] |
| `isReadOnly()` | `true` | 源码直接返回 true; 工具通过 permission UI 收集答案, 不修改 workspace 文件。[E: tools/AskUserQuestionTool/AskUserQuestionTool.tsx:149][E: tools/AskUserQuestionTool/AskUserQuestionTool.tsx:150] |
| `requiresUserInteraction()` | `true` | 源码直接声明需要用户交互。[E: tools/AskUserQuestionTool/AskUserQuestionTool.tsx:155][E: tools/AskUserQuestionTool/AskUserQuestionTool.tsx:156] |
| `isDestructive` | 默认 `false` | 该工具定义没有显式 destructive 行为[I]; `buildTool` 默认 `isDestructive=false`。[E: Tool.ts:761] |

## 6 权限

`validateInput()` 只在 `getQuestionPreviewFormat() === 'html'` 时检查 option preview; 非 html preview format 直接通过。[E: tools/AskUserQuestionTool/AskUserQuestionTool.tsx:161][E: tools/AskUserQuestionTool/AskUserQuestionTool.tsx:163] HTML preview 校验会拒绝 full document 标签、`script/style` 标签, 并要求 preview 至少包含一个 HTML tag。[E: tools/AskUserQuestionTool/AskUserQuestionTool.tsx:252][E: tools/AskUserQuestionTool/AskUserQuestionTool.tsx:258][E: tools/AskUserQuestionTool/AskUserQuestionTool.tsx:261] `checkPermissions()` 固定返回 `behavior: 'ask'` 和 `message: 'Answer questions?'`。[E: tools/AskUserQuestionTool/AskUserQuestionTool.tsx:184][E: tools/AskUserQuestionTool/AskUserQuestionTool.tsx:185][E: tools/AskUserQuestionTool/AskUserQuestionTool.tsx:186]

## 7 call() 走读

`call()` 接收 `questions`、默认 `{}` 的 `answers` 与可选 `annotations`, 直接把这些字段放进 `data` 返回。[E: tools/AskUserQuestionTool/AskUserQuestionTool.tsx:209][E: tools/AskUserQuestionTool/AskUserQuestionTool.tsx:221] `toAutoClassifierInput()` 把所有 question text 用 ` | ` 连接, 让权限分类器看到问题摘要。[E: tools/AskUserQuestionTool/AskUserQuestionTool.tsx:152][E: tools/AskUserQuestionTool/AskUserQuestionTool.tsx:153]

## 8 渲染

`renderToolUseMessage()` 和 `renderToolUseProgressMessage()` 都返回 `null`。[E: tools/AskUserQuestionTool/AskUserQuestionTool.tsx:190][E: tools/AskUserQuestionTool/AskUserQuestionTool.tsx:193] `renderToolResultMessage()` 渲染 `AskUserQuestionResultMessage`, 该组件显示 `User answered Claude's questions:` 并逐条列出 question/answer。[E: tools/AskUserQuestionTool/AskUserQuestionTool.tsx:90][E: tools/AskUserQuestionTool/AskUserQuestionTool.tsx:97][E: tools/AskUserQuestionTool/AskUserQuestionTool.tsx:195][E: tools/AskUserQuestionTool/AskUserQuestionTool.tsx:198] 拒绝时使用自定义 rejected message: `User declined to answer questions`。[E: tools/AskUserQuestionTool/AskUserQuestionTool.tsx:200][E: tools/AskUserQuestionTool/AskUserQuestionTool.tsx:203]

## 9 设计动机·edge·历史

- SDK input/output schema 直接导出内部 schema; 这意味着 SDK 暴露的 shape 与工具内部 schema 保持一致。[E: tools/AskUserQuestionTool/AskUserQuestionTool.tsx:78][E: tools/AskUserQuestionTool/AskUserQuestionTool.tsx:79][I]
- prompt 明确禁止把该工具当作 plan approval; plan approval 应调用 `ExitPlanMode`。[E: tools/AskUserQuestionTool/prompt.ts:43]
- `isEnabled()` 的 channels gate 与 `requiresUserInteraction()` 同时存在; 该组合说明工具依赖可达的交互路径[I]。[E: tools/AskUserQuestionTool/AskUserQuestionTool.tsx:141][E: tools/AskUserQuestionTool/AskUserQuestionTool.tsx:155]

## Sources

- `tools/AskUserQuestionTool/AskUserQuestionTool.tsx`
- `tools/AskUserQuestionTool/prompt.ts`
- `tools.ts`
- `Tool.ts`

## 相关

- [ExitPlanMode](exit-plan-mode.md)
