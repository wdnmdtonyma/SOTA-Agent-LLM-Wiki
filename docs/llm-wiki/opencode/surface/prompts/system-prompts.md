---
id: prompt.system-prompts
title: System Prompts
status: verified
owner: surface-config-cli
v: v1
kind: surface
tier: T1
schema: node
source:
  - packages/opencode/src/session/system.ts
  - packages/opencode/src/session/llm/request.ts
  - packages/opencode/src/session/reminders.ts
  - packages/opencode/src/session/prompt/
  - packages/core/src/session/runner/max-steps.ts
updated: 8b68dc0d7
evidence: explicit
---

> `prompt.system-prompts` 描述 V1 session request 的 system prompt family 选择、agent prompt override、environment/skills/reminder 注入。注意：`packages/opencode/src/session/message-v2.ts` 是 V1 和 AI SDK message 转换层，不是 V2 core system-prompt 实现。

## 能回答的问题

- 一个 model 会拿到 `anthropic`、`beast`、`codex`、`gpt`、`gemini`、`kimi`、`trinity` 还是 `default` prompt。
- agent-level `prompt` 如何覆盖 model-family prompt。
- plan/build mode reminder 如何作为 synthetic text part 注入。
- `session/prompt/*.txt` 里哪些文件被源码引用，哪些疑似 orphan。

## Model Family 选择

`SystemPrompt.provider(model)` 根据 `model.api.id` 选择 prompt family，而不是根据 provider name 选择。[E: packages/opencode/src/session/system.ts:26]

| match 条件 | prompt family | source line |
| --- | --- | --- |
| `model.api.id` 包含 `gpt-4`、`o1` 或 `o3` | `beast.txt` | [E: packages/opencode/src/session/system.ts:27] |
| `model.api.id` 包含 `gpt` 且包含 `codex` | `codex.txt` | [E: packages/opencode/src/session/system.ts:31] |
| `model.api.id` 包含 `gpt` 但不包含 `codex` | `gpt.txt` | [E: packages/opencode/src/session/system.ts:33] |
| `model.api.id` 包含 `gemini-` | `gemini.txt` | [E: packages/opencode/src/session/system.ts:35] |
| `model.api.id` 包含 `claude` | `anthropic.txt` | [E: packages/opencode/src/session/system.ts:36] |
| lower-case `model.api.id` 包含 `trinity` | `trinity.txt` | [E: packages/opencode/src/session/system.ts:37] |
| lower-case `model.api.id` 包含 `kimi` | `kimi.txt` | [E: packages/opencode/src/session/system.ts:38] |
| 以上条件都不满足 | `default.txt` | [E: packages/opencode/src/session/system.ts:39] |

导入表显示这些 family prompt 的真实 `.txt` 文件：`anthropic.txt`、`default.txt`、`beast.txt`、`gemini.txt`、`gpt.txt`、`kimi.txt`、`codex.txt` 和 `trinity.txt`。[E: packages/opencode/src/session/system.ts:6][E: packages/opencode/src/session/system.ts:14]

## LLM Request 拼装

`LLMRequestPrep.prepare` 构造的 `system` 数组只有一个字符串：agent prompt 或 model-family prompt、调用方传入的 `input.system`、用户自定义 `input.user.system` 会先拼进同一个字符串。[E: packages/opencode/src/session/llm/request.ts:58] 如果 `input.agent.prompt` 存在，就使用 agent prompt；否则调用 `SystemPrompt.provider(input.model)`。[E: packages/opencode/src/session/llm/request.ts:60]

plugin hook `experimental.chat.system.transform` 可以修改 system 数组。[E: packages/opencode/src/session/llm/request.ts:68] 若 hook 追加了多个 system fragment，且第一个 fragment 没变，源码会把追加内容合并成第二个 system fragment，减少 system message 数量。[E: packages/opencode/src/session/llm/request.ts:74]

OpenAI OAuth 或 workflow 请求不会把 system prompt 放进 AI SDK `messages`，其中 OpenAI OAuth 把 instructions 放到 options 上。[E: packages/opencode/src/session/llm/request.ts:99] 普通请求会把 system 数组映射成 `role: "system"` message 后再接原始 `input.messages`。[E: packages/opencode/src/session/llm/request.ts:101]

## Environment 与 Skills

environment prompt 会写入精确 model id、working directory、workspace root、git repo 状态、platform 和当天日期。[E: packages/opencode/src/session/system.ts:65][E: packages/opencode/src/session/system.ts:68][E: packages/opencode/src/session/system.ts:72] 如果 reference service 返回带 description 的 references，environment prompt 会附加 `<available_references>`，每条 reference 带 name、path 和可选 description。[E: packages/opencode/src/session/system.ts:75][E: packages/opencode/src/session/system.ts:79][E: packages/opencode/src/session/system.ts:84][E: packages/opencode/src/session/system.ts:88]

skills prompt 先检查 agent permission：如果 `skill` permission disabled，就直接不注入 skills 文字。[E: packages/opencode/src/session/system.ts:97] 未禁用时，源码调用 `skill.available(agent)`，并以 verbose 格式加入 skills 列表。[E: packages/opencode/src/session/system.ts:99][E: packages/opencode/src/session/system.ts:106]

## Reminder 注入

`SessionReminders` 不修改 system message；它找到最后一条 user message，并把 reminder 作为 `synthetic: true` text part 推入该 user message。[E: packages/opencode/src/session/reminders.ts:23][E: packages/opencode/src/session/reminders.ts:28][E: packages/opencode/src/session/reminders.ts:34]

| 场景 | 注入内容 | 证据 |
| --- | --- | --- |
| 未开启 experimental plan mode 且当前 agent 是 `plan` | `plan.txt` | [E: packages/opencode/src/session/reminders.ts:26] |
| 未开启 experimental plan mode，历史 assistant 有 `plan` 且当前 agent 是 `build` | `build-switch.txt` | [E: packages/opencode/src/session/reminders.ts:37] |
| 开启 experimental plan mode，从 `plan` 切到非 plan | `build-switch.txt`，若存在 plan file 还附加 plan path | [E: packages/opencode/src/session/reminders.ts:52][E: packages/opencode/src/session/reminders.ts:61] |
| 开启 experimental plan mode，进入 `plan` 且上一条 assistant 不是 `plan` | `plan-mode.txt`，替换 `${planInfo}` | [E: packages/opencode/src/session/reminders.ts:70][E: packages/opencode/src/session/reminders.ts:81] |

session loop 在构造 model request 前调用 `SessionReminders.apply()`；当 `isLastStep` 为真时，model messages 尾部追加来自 `MAX_STEPS_PROMPT` 的 assistant message。[E: packages/opencode/src/session/prompt.ts:1180][E: packages/opencode/src/session/prompt.ts:1280] `MAX_STEPS_PROMPT` 现在来自 core runner 常量，而不是 `session/prompt/max-steps.txt` 文件。[E: packages/opencode/src/session/prompt.ts:19][E: packages/core/src/session/runner/max-steps.ts:1]

## Prompt File Catalog

| file | 已核使用状态 | 用途 |
| --- | --- | --- |
| `anthropic.txt` | imported by `system.ts` | Claude-family base system prompt。[E: packages/opencode/src/session/system.ts:6] |
| `beast.txt` | imported by `system.ts` | `gpt-4`/`o1`/`o3` prompt family。[E: packages/opencode/src/session/system.ts:8] |
| `codex.txt` | imported by `system.ts` | `gpt` model id containing `codex` 的 prompt family。[E: packages/opencode/src/session/system.ts:13] |
| `default.txt` | imported by `system.ts` | fallback prompt family。[E: packages/opencode/src/session/system.ts:7] |
| `gemini.txt` | imported by `system.ts` | Gemini prompt family。[E: packages/opencode/src/session/system.ts:9] |
| `gpt.txt` | imported by `system.ts` | non-codex GPT prompt family。[E: packages/opencode/src/session/system.ts:10] |
| `kimi.txt` | imported by `system.ts` | Kimi prompt family。[E: packages/opencode/src/session/system.ts:11] |
| `trinity.txt` | imported by `system.ts` | Trinity prompt family。[E: packages/opencode/src/session/system.ts:14] |
| `build-switch.txt` | imported by `reminders.ts` | 从 plan 切回 build 时提醒执行 plan。[E: packages/opencode/src/session/reminders.ts:12] |
| `plan-mode.txt` | imported by `reminders.ts` | experimental plan mode 进入 plan 时的长 reminder。[E: packages/opencode/src/session/reminders.ts:13] |
| `plan.txt` | imported by `reminders.ts` | 非 experimental plan mode 的 plan reminder。[E: packages/opencode/src/session/reminders.ts:11] |
| `MAX_STEPS_PROMPT` | imported by `prompt.ts` from core runner | step 超限时的 text-only reminder；当前不是 `session/prompt/*.txt` 文件。[E: packages/opencode/src/session/prompt.ts:19][E: packages/core/src/session/runner/max-steps.ts:1] |
| `copilot-gpt-5.txt` | 未发现 TypeScript import | `rg` 未找到 `copilot-gpt-5` import/use，当前按疑似 orphan 处理。[I] |
| `plan-reminder-anthropic.txt` | 未发现 TypeScript import | `rg` 未找到 `plan-reminder-anthropic` import/use，当前按疑似 orphan 处理。[I] |

## V2 关系

这个节点是 `v: v1`。`packages/core/src` 的 V2 durable session core 不在本节点 source 中提供上述 family prompt selector；当前活跑的 model-family prompt selection 位于 V1 `packages/opencode/src/session/system.ts`。[I]

## Sources

- `packages/opencode/src/session/system.ts`
- `packages/opencode/src/session/llm/request.ts`
- `packages/opencode/src/session/reminders.ts`
- `packages/opencode/src/session/prompt.ts`
- `packages/core/src/session/runner/max-steps.ts`
- `packages/opencode/src/session/prompt/anthropic.txt`
- `packages/opencode/src/session/prompt/beast.txt`
- `packages/opencode/src/session/prompt/build-switch.txt`
- `packages/opencode/src/session/prompt/codex.txt`
- `packages/opencode/src/session/prompt/copilot-gpt-5.txt`
- `packages/opencode/src/session/prompt/default.txt`
- `packages/opencode/src/session/prompt/gemini.txt`
- `packages/opencode/src/session/prompt/gpt.txt`
- `packages/opencode/src/session/prompt/kimi.txt`
- `packages/opencode/src/session/prompt/plan-mode.txt`
- `packages/opencode/src/session/prompt/plan-reminder-anthropic.txt`
- `packages/opencode/src/session/prompt/plan.txt`
- `packages/opencode/src/session/prompt/trinity.txt`

## 相关

- `agent.builtins`
- `agent.config`
- `cli.run`
