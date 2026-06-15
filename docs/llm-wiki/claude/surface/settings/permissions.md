---
id: setting.permissions
title: Settings permissions catalog
kind: setting
tier: T1
source: [utils/settings/types.ts, utils/settings/schemaOutput.ts, utils/settings/constants.ts]
symbols: [SettingsSchema, PermissionsSchema]
related: [subsys.config-settings]
evidence: explicit
status: verified
updated: 2026-06-14
---

> `setting.permissions` catalog 解释 `settings.json` 中控制 tool permission、sandbox 与 auto mode 的配置键。

## 能回答的问题

- `settings.json` 里 permission rule 应该放在哪些键?
- `permissions.defaultMode` 和 `disableBypassPermissionsMode` 的 schema 约束是什么?
- 哪些 permission 设置只在 `TRANSCRIPT_CLASSIFIER` 或 Anthropic 内部用户条件下出现?
- `sandbox` 在 settings schema 里如何接入?
- 哪些 opt-in 标志影响 bypass permissions mode 和 auto mode?

## 范围与证据

`SettingsSchema` 是统一的 settings file schema,用于 `.claude/settings.json` 这类配置文件。[E: utils/settings/types.ts:210] [E: utils/settings/types.ts:214] `generateSettingsJSONSchema()` 通过 `toJSONSchema(SettingsSchema(), { unrepresentable: 'any' })` 生成 JSON Schema 输出。[E: utils/settings/schemaOutput.ts:6] `SETTING_SOURCES` 枚举 `userSettings`、`projectSettings`、`localSettings`、`flagSettings`、`policySettings`,且注释说明后面的 source 会覆盖前面的 source。[E: utils/settings/constants.ts:5] [E: utils/settings/constants.ts:9] [E: utils/settings/constants.ts:12] [E: utils/settings/constants.ts:15] [E: utils/settings/constants.ts:18] [E: utils/settings/constants.ts:21]

scope 标签: `schema-wide` 表示该 key 是 `SettingsSchema` 或 `PermissionsSchema` 接受的 settings key;`feature-gated` 表示该 key 被 feature/env 条件 spread 进 schema;`ant-gated` 表示该 key 只在 `process.env.USER_TYPE === 'ant'` 条件下进入 schema。

| key | 类型 | 默认 | 含义 | scope |
|---|---|---|---|---|
| `permissions` | `PermissionsSchema()` object [E: utils/settings/types.ts:372] | 未设置; `.optional()` [E: utils/settings/types.ts:373] | Tool usage permissions configuration。[E: utils/settings/types.ts:374] | schema-wide |
| `permissions.allow` | `PermissionRuleSchema[]` [E: utils/settings/types.ts:46] | 未设置; `.optional()` [E: utils/settings/types.ts:47] | 允许的 operation permission rules。[E: utils/settings/types.ts:48] | schema-wide |
| `permissions.deny` | `PermissionRuleSchema[]` [E: utils/settings/types.ts:50] | 未设置; `.optional()` [E: utils/settings/types.ts:51] | 拒绝的 operation permission rules。[E: utils/settings/types.ts:52] | schema-wide |
| `permissions.ask` | `PermissionRuleSchema[]` [E: utils/settings/types.ts:54] | 未设置; `.optional()` [E: utils/settings/types.ts:55] | 总是 prompt confirmation 的 permission rules。[E: utils/settings/types.ts:57] | schema-wide |
| `permissions.defaultMode` | enum `PERMISSION_MODES` 或 `EXTERNAL_PERMISSION_MODES` [E: utils/settings/types.ts:61] [E: utils/settings/types.ts:62] [E: utils/settings/types.ts:63] | 未设置; `.optional()` [E: utils/settings/types.ts:65] | Claude Code 需要 access 时的 default permission mode。[E: utils/settings/types.ts:66] | schema-wide, with `TRANSCRIPT_CLASSIFIER` choosing enum source [E: utils/settings/types.ts:61] |
| `permissions.disableBypassPermissionsMode` | enum literal `"disable"` [E: utils/settings/types.ts:68] | 未设置; `.optional()` [E: utils/settings/types.ts:69] | 禁用 bypass permission prompts 的能力。[E: utils/settings/types.ts:70] | schema-wide |
| `permissions.disableAutoMode` | enum literal `"disable"` [E: utils/settings/types.ts:74] | 未设置; `.optional()` [E: utils/settings/types.ts:75] | 禁用 auto mode。[E: utils/settings/types.ts:76] | feature-gated by `TRANSCRIPT_CLASSIFIER` [E: utils/settings/types.ts:71] |
| `permissions.additionalDirectories` | `string[]` [E: utils/settings/types.ts:80] | 未设置; `.optional()` [E: utils/settings/types.ts:81] | 加入 permission scope 的额外目录。[E: utils/settings/types.ts:82] | schema-wide |
| `permissions.*` unknown fields | passthrough object [E: utils/settings/types.ts:84] | 保留未知字段 [E: utils/settings/types.ts:239] | `PermissionsSchema` 使用 `.passthrough()`,所以未知 permission 字段可在解析对象中保留。[E: utils/settings/types.ts:84] | schema-wide |
| `allowManagedPermissionRulesOnly` | boolean [E: utils/settings/types.ts:502] | 未设置; `.optional()` [E: utils/settings/types.ts:503] | 当在 managed settings 中为 true 时,只尊重 managed settings 的 `allow`/`deny`/`ask` permission rules。[E: utils/settings/types.ts:505] | managed/policy intended |
| `skipDangerousModePermissionPrompt` | boolean [E: utils/settings/types.ts:963] | 未设置; `.optional()` [E: utils/settings/types.ts:964] | 记录用户是否接受 bypass permissions mode dialog。[E: utils/settings/types.ts:966] | schema-wide |
| `skipAutoPermissionPrompt` | boolean [E: utils/settings/types.ts:971] | 未设置; `.optional()` [E: utils/settings/types.ts:972] | 记录用户是否接受 auto mode opt-in dialog。[E: utils/settings/types.ts:974] | feature-gated by `TRANSCRIPT_CLASSIFIER` [E: utils/settings/types.ts:968] |
| `useAutoModeDuringPlan` | boolean [E: utils/settings/types.ts:977] | 未设置; description says default true [E: utils/settings/types.ts:980] | auto mode 可用时,plan mode 是否使用 auto mode semantics。[E: utils/settings/types.ts:980] | feature-gated by `TRANSCRIPT_CLASSIFIER` [E: utils/settings/types.ts:968] |
| `autoMode` | object [E: utils/settings/types.ts:983] | 未设置; `.optional()` [E: utils/settings/types.ts:1005] | Auto mode classifier prompt customization。[E: utils/settings/types.ts:1006] | feature-gated by `TRANSCRIPT_CLASSIFIER` [E: utils/settings/types.ts:968] |
| `autoMode.allow` | `string[]` [E: utils/settings/types.ts:985] | 未设置; `.optional()` [E: utils/settings/types.ts:986] | Auto mode classifier allow section rules。[E: utils/settings/types.ts:987] | feature-gated |
| `autoMode.soft_deny` | `string[]` [E: utils/settings/types.ts:989] | 未设置; `.optional()` [E: utils/settings/types.ts:990] | Auto mode classifier deny section rules。[E: utils/settings/types.ts:991] | feature-gated |
| `autoMode.deny` | `string[]` [E: utils/settings/types.ts:995] | 未设置; `.optional()` [E: utils/settings/types.ts:995] | Anthropic internal back-compat alias; external users use `soft_deny`。[E: utils/settings/types.ts:994] | feature-gated and ant-gated |
| `autoMode.environment` | `string[]` [E: utils/settings/types.ts:999] | 未设置; `.optional()` [E: utils/settings/types.ts:1000] | Auto mode classifier environment section entries。[E: utils/settings/types.ts:1002] | feature-gated |
| `disableAutoMode` | enum literal `"disable"` [E: utils/settings/types.ts:1010] | 未设置; `.optional()` [E: utils/settings/types.ts:1011] | 禁用 auto mode。[E: utils/settings/types.ts:1012] | schema-wide |
| `classifierPermissionsEnabled` | boolean [E: utils/settings/types.ts:834] | 未设置; `.optional()` [E: utils/settings/types.ts:835] | 启用 AI-based classification for `Bash(prompt:...)` permission rules。[E: utils/settings/types.ts:837] | ant-gated [E: utils/settings/types.ts:831] |
| `sandbox` | `SandboxSettingsSchema()` object [E: utils/settings/types.ts:655] | 未设置; `.optional()` [E: utils/settings/types.ts:655] | Settings schema 只在本文件接入 `SandboxSettingsSchema`;具体 sandbox shape 由 imported schema 定义。[E: utils/settings/types.ts:3] | schema-wide |

## Sources

- `utils/settings/types.ts`
- `utils/settings/schemaOutput.ts`
- `utils/settings/constants.ts`

## 相关

- [配置与设置子系统](../../subsystems/config-settings.md)
