---
id: setting.ui-output
title: Settings UI output catalog
kind: setting
tier: T1
source: [utils/settings/types.ts, utils/settings/schemaOutput.ts, utils/settings/constants.ts]
symbols: [SettingsSchema]
related: [subsys.config-settings]
evidence: explicit
status: verified
updated: 2026-06-14
---

> `setting.ui-output` catalog 覆盖 `settings.json` 中影响 assistant response style、terminal display、spinner、prompt suggestions、voice 与 transcript view 的配置键。

## 能回答的问题

- 如何配置 assistant response 的 output style 和 language?
- spinner tips 与 spinner verbs 的 schema 是什么?
- 哪些 settings 会影响 terminal title、syntax highlighting 或 reduced motion?
- prompt suggestions、survey、announcements 如何由 settings 控制?
- voice mode 和 transcript default view 哪些 feature gate 保护?

## 范围与证据

`SettingsSchema` 是统一的 settings file schema。[E: utils/settings/types.ts:210] JSON Schema 输出函数直接序列化 `SettingsSchema`。[E: utils/settings/schemaOutput.ts:6] settings source catalog 包含 user/project/local/flag/policy sources,并声明 later sources override earlier sources。[E: utils/settings/constants.ts:5] [E: utils/settings/constants.ts:9] [E: utils/settings/constants.ts:12] [E: utils/settings/constants.ts:15] [E: utils/settings/constants.ts:18] [E: utils/settings/constants.ts:21]

scope 标签: `schema-wide` 表示该 key 是 `SettingsSchema` 接受的顶层 key;`feature-gated` 表示该 key 被 feature spread 进 schema。

| key | 类型 | 默认 | 含义 | scope |
|---|---|---|---|---|
| `fileSuggestion` | object `{ type: "command", command: string }` [E: utils/settings/types.ts:312] [E: utils/settings/types.ts:313] [E: utils/settings/types.ts:314] | 未设置; `.optional()` [E: utils/settings/types.ts:316] | Custom file suggestion configuration for `@` mentions。[E: utils/settings/types.ts:317] | schema-wide |
| `outputStyle` | string [E: utils/settings/types.ts:640] | 未设置; `.optional()` [E: utils/settings/types.ts:641] | Controls output style for assistant responses。[E: utils/settings/types.ts:642] | schema-wide |
| `language` | string [E: utils/settings/types.ts:644] | 未设置; `.optional()` [E: utils/settings/types.ts:645] | Preferred language for Claude responses and voice dictation。[E: utils/settings/types.ts:647] | schema-wide |
| `feedbackSurveyRate` | number constrained min 0 max 1 [E: utils/settings/types.ts:657] [E: utils/settings/types.ts:658] [E: utils/settings/types.ts:659] | 未设置; `.optional()` [E: utils/settings/types.ts:660] | Eligible 时 session quality survey 出现的 probability;description 给出 0.05 as reasonable starting point。[E: utils/settings/types.ts:662] | schema-wide |
| `spinnerTipsEnabled` | boolean [E: utils/settings/types.ts:665] | 未设置; `.optional()` [E: utils/settings/types.ts:666] | 是否在 spinner 中显示 tips。[E: utils/settings/types.ts:667] | schema-wide |
| `spinnerVerbs` | object `{ mode, verbs }` [E: utils/settings/types.ts:669] [E: utils/settings/types.ts:670] [E: utils/settings/types.ts:671] | 未设置; `.optional()` [E: utils/settings/types.ts:673] | Customize spinner verbs;`append` adds verbs to defaults,`replace` uses only custom verbs。[E: utils/settings/types.ts:675] | schema-wide |
| `spinnerVerbs.mode` | enum `"append"`/`"replace"` [E: utils/settings/types.ts:670] | required within `spinnerVerbs` [I] | 控制 spinner verbs 是追加还是替换默认 verbs。[E: utils/settings/types.ts:675] | schema-wide |
| `spinnerVerbs.verbs` | `string[]` [E: utils/settings/types.ts:671] | required within `spinnerVerbs` [I] | Custom spinner verb strings。[E: utils/settings/types.ts:675] | schema-wide |
| `spinnerTipsOverride` | object `{ excludeDefault?, tips }` [E: utils/settings/types.ts:678] [E: utils/settings/types.ts:679] [E: utils/settings/types.ts:680] | 未设置; `.optional()` [E: utils/settings/types.ts:682] | Override spinner tips。[E: utils/settings/types.ts:684] | schema-wide |
| `spinnerTipsOverride.excludeDefault` | boolean [E: utils/settings/types.ts:679] | default false [E: utils/settings/types.ts:684] | true 时 only show custom tips。[E: utils/settings/types.ts:684] | schema-wide |
| `spinnerTipsOverride.tips` | `string[]` [E: utils/settings/types.ts:680] | required within `spinnerTipsOverride` [I] | Custom spinner tip strings。[E: utils/settings/types.ts:684] | schema-wide |
| `syntaxHighlightingDisabled` | boolean [E: utils/settings/types.ts:687] | 未设置; `.optional()` [E: utils/settings/types.ts:688] | 是否 disable syntax highlighting in diffs。[E: utils/settings/types.ts:689] | schema-wide |
| `terminalTitleFromRename` | boolean [E: utils/settings/types.ts:691] | defaults to true [E: utils/settings/types.ts:694] | `/rename` 是否更新 terminal tab title。[E: utils/settings/types.ts:694] | schema-wide |
| `promptSuggestionEnabled` | boolean [E: utils/settings/types.ts:729] | absent 或 true 时 enabled; false disables prompt suggestions [E: utils/settings/types.ts:732] [E: utils/settings/types.ts:733] | 控制 prompt suggestions。[E: utils/settings/types.ts:732] [E: utils/settings/types.ts:733] | schema-wide |
| `showClearContextOnPlanAccept` | boolean [E: utils/settings/types.ts:736] | default false [E: utils/settings/types.ts:739] | Plan-approval dialog 是否提供 clear context option。[E: utils/settings/types.ts:739] | schema-wide |
| `companyAnnouncements` | `string[]` [E: utils/settings/types.ts:749] | 未设置; `.optional()` [E: utils/settings/types.ts:750] | Startup 时展示 company announcements;多个时随机选一个。[E: utils/settings/types.ts:752] | schema-wide |
| `voiceEnabled` | boolean [E: utils/settings/types.ts:867] | 未设置; `.optional()` [E: utils/settings/types.ts:868] | Enable voice mode,即 hold-to-talk dictation。[E: utils/settings/types.ts:869] | feature-gated by `VOICE_MODE` [E: utils/settings/types.ts:864] |
| `defaultView` | enum `"chat"`/`"transcript"` [E: utils/settings/types.ts:925] | 未设置; `.optional()` [E: utils/settings/types.ts:926] | Default transcript view;`chat` 仅 SendUserMessage checkpoints,`transcript` 为 full view。[E: utils/settings/types.ts:928] | feature-gated by `KAIROS` or `KAIROS_BRIEF` [E: utils/settings/types.ts:922] |
| `prefersReducedMotion` | boolean [E: utils/settings/types.ts:933] | 未设置; `.optional()` [E: utils/settings/types.ts:934] | Reduce or disable animations for accessibility。[E: utils/settings/types.ts:936] | schema-wide |
| `showThinkingSummaries` | boolean [E: utils/settings/types.ts:957] | default false [E: utils/settings/types.ts:960] | Transcript view `ctrl+o` 中是否 show thinking summaries。[E: utils/settings/types.ts:960] | schema-wide |

## Sources

- `utils/settings/types.ts`
- `utils/settings/schemaOutput.ts`
- `utils/settings/constants.ts`

## 相关

- [配置与设置子系统](../../subsystems/config-settings.md)
