---
id: agent.config
title: Agent Config
status: verified
owner: surface-config-cli
v: shared
kind: surface
tier: T1
schema: node
source:
  - packages/opencode/src/agent/agent.ts
  - packages/core/src/v1/config/agent.ts
  - packages/core/src/config/agent.ts
updated: 355a0bcf5
evidence: explicit
---

> `agent.config` 描述 V1 `agent` 配置如何变成 runtime `Agent.Info`，以及 V2 `agents` 配置 shape 如何重命名字段。V1 当前活跑；V2 是 `@opencode/v2` config schema 的一部分。

## 能回答的问题

- V1 agent 配置有哪些字段，unknown keys 会放到哪里。
- `tools`、`maxSteps`、`disable` 这些 V1 字段如何兼容。
- V2 agent 配置字段如何把 V1 的 `prompt`、`temperature`、`top_p`、`permission` 改名。
- `Agent.generate` 使用 LLM 生成 agent 配置时，输入和输出 schema 是什么。

## V1 Agent Config

V1 config schema 的单个 agent 使用 `ConfigAgentV1.Info`，该 schema 位于 `packages/core/src/v1/config/agent.ts`。[E: packages/core/src/v1/config/agent.ts:83] 顶层 V1 config 允许 `agent.plan`、`agent.build`、`agent.general`、`agent.explore`、`agent.title`、`agent.summary`、`agent.compaction` 以及任意自定义 agent key。[E: packages/core/src/v1/config/config.ts:93]

| V1 key | type/default | 含义 | V1 runtime effect | V1-V2 关系 |
| --- | --- | --- | --- | --- |
| `model` | optional string | agent 绑定的默认模型，格式由 provider/model parser 解释。[E: packages/core/src/v1/config/agent.ts:14] | runtime 通过 `Provider.parseModel(value.model)` 写入 `item.model`。[E: packages/opencode/src/agent/agent.ts:279] | V2 仍叫 `model`。[E: packages/core/src/config/agent.ts:14] |
| `variant` | optional string | agent 使用自身配置模型时的默认 variant。[E: packages/core/src/v1/config/agent.ts:15] | runtime 写入 `item.variant`。[E: packages/opencode/src/agent/agent.ts:280] | V2 仍叫 `variant`。[E: packages/core/src/config/agent.ts:15] |
| `temperature` | optional finite | AI SDK generation body option。[E: packages/core/src/v1/config/agent.ts:18] | runtime 写入 `item.temperature`。[E: packages/opencode/src/agent/agent.ts:283] | V2 放到 `request.body.temperature`，migration 在 body 中展开。[E: packages/core/src/v1/config/migrate.ts:108] |
| `top_p` | optional finite | AI SDK generation body option。[E: packages/core/src/v1/config/agent.ts:19] | runtime 写入 camel-case `item.topP`。[E: packages/opencode/src/agent/agent.ts:284] | V2 放到 `request.body.top_p`，migration 在 body 中展开。[E: packages/core/src/v1/config/migrate.ts:111] |
| `prompt` | optional string | agent-level system prompt override。[E: packages/core/src/v1/config/agent.ts:20] | runtime 写入 `item.prompt`；LLM request 若有 `agent.prompt` 就不用 model-family prompt。[E: packages/opencode/src/session/llm/request.ts:60] | V2 改名为 `system`。[E: packages/core/src/config/agent.ts:17] |
| `tools` | optional record boolean, deprecated | 旧工具开关。[E: packages/core/src/v1/config/agent.ts:21] | normalize 把 `tools` 转成 permission；`write`、`edit`、`patch` 都折叠为 `edit` action。[E: packages/core/src/v1/config/agent.ts:68] | V2 没有 `tools`；migration 转成 `permissions` rules。[E: packages/core/src/v1/config/migrate.ts:75] |
| `disable` | optional boolean | 禁用内建或自定义 agent。[E: packages/core/src/v1/config/agent.ts:24] | runtime 看到 `value.disable` 会删除对应 agent。[E: packages/opencode/src/agent/agent.ts:266] | V2 改名为 `disabled`。[E: packages/core/src/config/agent.ts:23] |
| `description` | optional string | 向用户或 agent selection 描述何时使用。[E: packages/core/src/v1/config/agent.ts:25] | runtime 写入 `item.description`。[E: packages/opencode/src/agent/agent.ts:282] | V2 仍叫 `description`。[E: packages/core/src/config/agent.ts:18] |
| `mode` | `subagent`/`primary`/`all` | agent 可作为主 agent、子 agent 或两者。[E: packages/core/src/v1/config/agent.ts:26] | runtime 写入 `item.mode`；默认自定义 agent 是 `all`。[E: packages/opencode/src/agent/agent.ts:274] | V2 仍叫 `mode`。[E: packages/core/src/config/agent.ts:19] |
| `hidden` | optional boolean | 从 subagent autocomplete 中隐藏。[E: packages/core/src/v1/config/agent.ts:27] | runtime 写入 `item.hidden`。[E: packages/opencode/src/agent/agent.ts:287] | V2 仍叫 `hidden`。[E: packages/core/src/config/agent.ts:20] |
| `options` | optional record any | 传给 provider/model 的 generation options。[E: packages/core/src/v1/config/agent.ts:30] | runtime deep merge 到 `item.options`。[E: packages/opencode/src/agent/agent.ts:290] | V2 改到 `request.body`，migration 合并 unknown options、`temperature`、`top_p`。[E: packages/core/src/v1/config/migrate.ts:108] |
| unknown key | rest record any | V1 schema 接受未知字段。[E: packages/core/src/v1/config/agent.ts:40] | normalize 把未知字段复制到 `options`。[E: packages/core/src/v1/config/agent.ts:62] | V2 不用 unknown-agent-options seam；迁移时这些值会随 `info.options` 进入 request body。[I] |
| `color` | hex 或 theme color | UI 显示颜色。[E: packages/core/src/v1/config/agent.ts:31] | runtime 写入 `item.color`。[E: packages/opencode/src/agent/agent.ts:286] | V2 仍叫 `color`，同样使用 color union。[E: packages/core/src/config/agent.ts:21] |
| `steps` | optional positive int | agentic iteration 上限。[E: packages/core/src/v1/config/agent.ts:34] | runtime 写入 `item.steps`。[E: packages/opencode/src/agent/agent.ts:289] | V2 仍叫 `steps`。[E: packages/core/src/config/agent.ts:22] |
| `maxSteps` | optional positive int, deprecated | `steps` 的旧名。[E: packages/core/src/v1/config/agent.ts:37] | normalize 使用 `agent.steps ?? agent.maxSteps`。[E: packages/core/src/v1/config/agent.ts:79] | V2 只保留 `steps`；migration 输出 `steps`。[E: packages/core/src/v1/config/migrate.ts:122] |
| `permission` | optional V1 permission info | agent-specific permission overrides。[E: packages/core/src/v1/config/agent.ts:38] | runtime 把当前 permission 与 `Permission.fromConfig(value.permission ?? {})` 合并。[E: packages/opencode/src/agent/agent.ts:291] | V2 改名为 `permissions` ordered ruleset。[E: packages/core/src/config/agent.ts:24] |

V1 normalize 先从 `agent.options` 开始收集 provider options，再把所有未知 key 放进去。[E: packages/core/src/v1/config/agent.ts:63] `agent.permission` 会覆盖由 deprecated `tools` 推出的 permission，因为 normalize 最后把 `agent.permission` assign 到同一个 permission object。[E: packages/core/src/v1/config/agent.ts:77]

## V2 Agent Config

V2 agent schema 是 `Schema.Class<Info>("ConfigV2.Agent")`，文件位于 `packages/core/src/config/agent.ts`，使用 `@opencode/v2` config 系统消费。[E: packages/core/src/config/agent.ts:13]

| V2 key | type/default | 含义 | V1 来源 |
| --- | --- | --- | --- |
| `model` | optional string | agent 默认模型。[E: packages/core/src/config/agent.ts:14] | V1 `model` 原样迁移。[E: packages/core/src/v1/config/migrate.ts:114] |
| `variant` | optional string | agent 默认模型 variant。[E: packages/core/src/config/agent.ts:15] | V1 `variant` 原样迁移。[E: packages/core/src/v1/config/migrate.ts:115] |
| `request` | optional `ModelRequest.Options` | provider request 级配置。[E: packages/core/src/config/agent.ts:16] | V1 `options`、`temperature`、`top_p` 合并成 `request.body`。[E: packages/core/src/v1/config/migrate.ts:116] |
| `system` | optional string | agent prompt override。[E: packages/core/src/config/agent.ts:17] | V1 `prompt` 迁移为 `system`。[E: packages/core/src/v1/config/migrate.ts:117] |
| `description` | optional string | agent 使用说明。[E: packages/core/src/config/agent.ts:18] | V1 `description` 原样迁移。[E: packages/core/src/v1/config/migrate.ts:118] |
| `mode` | optional `primary`/`subagent`/`all` | agent 可见模式。[E: packages/core/src/config/agent.ts:19] | V1 `mode` 原样迁移。[E: packages/core/src/v1/config/migrate.ts:119] |
| `hidden` | optional boolean | UI 隐藏标记。[E: packages/core/src/config/agent.ts:20] | V1 `hidden` 原样迁移。[E: packages/core/src/v1/config/migrate.ts:120] |
| `color` | optional hex/theme color | UI color。[E: packages/core/src/config/agent.ts:21] | V1 `color` 原样迁移。[E: packages/core/src/v1/config/migrate.ts:121] |
| `steps` | optional positive int | iteration 上限。[E: packages/core/src/config/agent.ts:22] | V1 `steps` 或 `maxSteps` 已在 V1 decode 阶段规范化。[E: packages/core/src/v1/config/agent.ts:79] |
| `disabled` | optional boolean | 禁用 agent。[E: packages/core/src/config/agent.ts:23] | V1 `disable` 迁移为 `disabled`。[E: packages/core/src/v1/config/migrate.ts:123] |
| `permissions` | optional V2 ruleset | ordered tool permission rules。[E: packages/core/src/config/agent.ts:24] | V1 `permission` 通过 migration 转成 `{action, resource, effect}` rules。[E: packages/core/src/v1/config/migrate.ts:124] |

## Agent.generate

`Agent.generate` 是 V1 服务上的 LLM 辅助配置生成器，不是 V2 schema migration。[E: packages/opencode/src/agent/agent.ts:366] 若调用方未传 model，它会使用 provider default model。[E: packages/opencode/src/agent/agent.ts:371] 生成时 system prompt 固定从 `PROMPT_GENERATE` 开始，并允许 plugin hook `experimental.chat.system.transform` 修改 system 数组。[E: packages/opencode/src/agent/agent.ts:378] `PROMPT_GENERATE` 的 import 指向 `packages/opencode/src/agent/generate.txt`。[E: packages/opencode/src/agent/agent.ts:12]

生成器把已有 agent 名称拼进 user message，要求新 identifier 不要与现有名称冲突。[E: packages/opencode/src/agent/agent.ts:405] 输出 schema 是 `GeneratedAgent`，即 `identifier`、`whenToUse`、`systemPrompt` 三字段。[E: packages/opencode/src/agent/agent.ts:58] 对 OpenAI OAuth provider，源码走 `streamObject` 并把 instructions 放在 provider options；其他 provider 走 `generateObject`。[E: packages/opencode/src/agent/agent.ts:416]

## Sources

- `packages/opencode/src/agent/agent.ts`
- `packages/opencode/src/session/llm/request.ts`
- `packages/core/src/v1/config/agent.ts`
- `packages/core/src/v1/config/config.ts`
- `packages/core/src/v1/config/migrate.ts`
- `packages/core/src/config/agent.ts`

## 相关

- `agent.builtins`
- `config.v1-core`
- `config.v2-schema`
- `config.migration`
