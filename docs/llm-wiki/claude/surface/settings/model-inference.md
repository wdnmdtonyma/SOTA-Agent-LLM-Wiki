---
id: setting.model-inference
title: Settings model inference catalog
kind: setting
tier: T1
source: [utils/settings/types.ts, utils/settings/schemaOutput.ts, utils/settings/constants.ts]
symbols: [SettingsSchema]
related: [subsys.config-settings]
evidence: explicit
status: verified
updated: 2026-06-14
---

> `setting.model-inference` catalog 覆盖 `settings.json` 中影响 model selection、thinking、fast mode 与 main-thread agent 的配置键。

## 能回答的问题

- `model`、`availableModels`、`modelOverrides` 分别约束什么?
- `alwaysThinkingEnabled` 和 `effortLevel` 如何进入 settings schema?
- fast mode 的持久化设置有哪些?
- `agent`、`assistant`、`assistantName` 如何影响 main thread?
- 哪些 inference key 是 feature-gated 或 Anthropic-internal gated?

## 范围与证据

`SettingsSchema` 是统一的 settings file schema,用于 `.claude/settings.json` 这类配置文件。[E: utils/settings/types.ts:210] [E: utils/settings/types.ts:214] JSON Schema 输出来自 `toJSONSchema(SettingsSchema(), { unrepresentable: 'any' })`。[E: utils/settings/schemaOutput.ts:6] `SETTING_SOURCES` 是 settings 的 source catalog,其中后面的 source 会覆盖前面的 source。[E: utils/settings/constants.ts:5] [E: utils/settings/constants.ts:9] [E: utils/settings/constants.ts:12] [E: utils/settings/constants.ts:15] [E: utils/settings/constants.ts:18] [E: utils/settings/constants.ts:21]

scope 标签: `schema-wide` 表示该 key 是 `SettingsSchema` 接受的顶层 key;`managed/policy intended` 表示 description 明确说 typical managed settings 或 enterprise administrators;`feature-gated` 表示该 key 被 feature spread 进 schema;`ant-gated` 表示该 key 只在 `process.env.USER_TYPE === 'ant'` 条件下进入 schema。

| key | 类型 | 默认 | 含义 | scope |
|---|---|---|---|---|
| `model` | string [E: utils/settings/types.ts:376] | 未设置; `.optional()` [E: utils/settings/types.ts:377] | Override Claude Code 默认使用的 model。[E: utils/settings/types.ts:378] | schema-wide |
| `availableModels` | `string[]` [E: utils/settings/types.ts:381] | 未设置时 all models available; empty array 时 only default model available [E: utils/settings/types.ts:388] | Enterprise allowlist of selectable models;接受 family aliases、version prefixes、full model IDs。[E: utils/settings/types.ts:384] [E: utils/settings/types.ts:385] [E: utils/settings/types.ts:386] [E: utils/settings/types.ts:387] | managed/policy intended [E: utils/settings/types.ts:389] |
| `modelOverrides` | `Record<string,string>` [E: utils/settings/types.ts:392] | 未设置; `.optional()` [E: utils/settings/types.ts:393] | 将 Anthropic model ID 映射到 provider-specific model ID。[E: utils/settings/types.ts:395] [E: utils/settings/types.ts:396] | managed/policy intended [E: utils/settings/types.ts:397] |
| `alwaysThinkingEnabled` | boolean [E: utils/settings/types.ts:697] | absent 或 true 时对 supported models 自动启用 thinking; false disables thinking [E: utils/settings/types.ts:700] [E: utils/settings/types.ts:701] | 控制 supported models 的 thinking enablement。[E: utils/settings/types.ts:700] [E: utils/settings/types.ts:701] | schema-wide |
| `effortLevel` | enum `low`/`medium`/`high`, Anthropic internal 还允许 `max` [E: utils/settings/types.ts:705] [E: utils/settings/types.ts:706] [E: utils/settings/types.ts:707] | 未设置; `.optional()` [E: utils/settings/types.ts:709] | Persisted effort level for supported models。[E: utils/settings/types.ts:711] | schema-wide with ant-gated enum value [E: utils/settings/types.ts:705] |
| `advisorModel` | string [E: utils/settings/types.ts:713] | 未设置; `.optional()` [E: utils/settings/types.ts:714] | Server-side advisor tool 的 advisor model。[E: utils/settings/types.ts:715] | schema-wide |
| `fastMode` | boolean [E: utils/settings/types.ts:717] | absent 或 false 时 fast mode off; true 时 enabled [E: utils/settings/types.ts:720] | 启用 fast mode。[E: utils/settings/types.ts:720] | schema-wide |
| `fastModePerSessionOptIn` | boolean [E: utils/settings/types.ts:723] | 未设置; `.optional()` [E: utils/settings/types.ts:724] | true 时 fast mode 不跨 session 持久化,每个 session 从 off 开始。[E: utils/settings/types.ts:726] | schema-wide |
| `agent` | string [E: utils/settings/types.ts:742] | 未设置; `.optional()` [E: utils/settings/types.ts:743] | 指定 main thread 使用的 built-in 或 custom agent,应用其 system prompt、tool restrictions 与 model。[E: utils/settings/types.ts:745] [E: utils/settings/types.ts:746] | schema-wide |
| `assistant` | boolean [E: utils/settings/types.ts:875] | 未设置; `.optional()` [E: utils/settings/types.ts:876] | 以 assistant mode 启动 Claude,使用 custom system prompt、brief view 与 scheduled check-in skills。[E: utils/settings/types.ts:878] | feature-gated by `KAIROS` [E: utils/settings/types.ts:872] |
| `assistantName` | string [E: utils/settings/types.ts:881] | 未设置; `.optional()` [E: utils/settings/types.ts:882] | Assistant display name,显示在 claude.ai session list。[E: utils/settings/types.ts:884] | feature-gated by `KAIROS` [E: utils/settings/types.ts:872] |

## Sources

- `utils/settings/types.ts`
- `utils/settings/schemaOutput.ts`
- `utils/settings/constants.ts`

## 相关

- [配置与设置子系统](../../subsystems/config-settings.md)
