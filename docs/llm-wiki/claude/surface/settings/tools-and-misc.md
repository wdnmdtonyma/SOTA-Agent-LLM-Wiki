---
id: setting.tools-and-misc
title: Settings tools and misc catalog
kind: setting
tier: T1
source: [utils/settings/types.ts, utils/settings/schemaOutput.ts, utils/settings/constants.ts]
symbols: [SettingsSchema, ExtraKnownMarketplaceSchema, CUSTOMIZATION_SURFACES]
related: [subsys.config-settings]
evidence: explicit
status: verified
updated: 2026-06-14
---

> `setting.tools-and-misc` catalog 覆盖 `settings.json` 中 schema reference、Git/worktree、plugins/marketplaces、memory、plans、auto-updates 与其他工具行为配置键。

## 能回答的问题

- `settings.json` 的 `$schema` 应该指向哪里?
- Git attribution、gitignore、cleanup 与 worktree settings 的 schema 是什么?
- plugin 和 marketplace allowlist/blocklist settings 如何表达?
- auto-memory、plans directory、Sleep tool duration limit 在哪些 key 中配置?
- 哪些 miscellaneous key 是 feature-gated 或 policy-only?

## 范围与证据

`SettingsSchema` 是统一的 settings file schema,并在根对象末尾使用 `.passthrough()`。[E: utils/settings/types.ts:210] [E: utils/settings/types.ts:1072] `CLAUDE_CODE_SETTINGS_SCHEMA_URL` 的常量值是 `https://json.schemastore.org/claude-code-settings.json`。[E: utils/settings/constants.ts:202] JSON Schema 输出函数序列化同一个 `SettingsSchema`。[E: utils/settings/schemaOutput.ts:6] settings source catalog 声明 later sources override earlier sources。[E: utils/settings/constants.ts:5]

scope 标签: `schema-wide` 表示该 key 是 `SettingsSchema` 接受的顶层 key;`managed/policy intended` 表示 description 明确提到 managed settings、policy settings 或 enterprise administrators;`feature-gated` 表示该 key 被 feature spread 进 schema。

| key | 类型 | 默认 | 含义 | scope |
|---|---|---|---|---|
| `$schema` | literal `CLAUDE_CODE_SETTINGS_SCHEMA_URL` [E: utils/settings/types.ts:259] | 未设置; `.optional()` [E: utils/settings/types.ts:260] | JSON Schema reference for Claude Code settings。[E: utils/settings/types.ts:261] | schema-wide |
| `respectGitignore` | boolean [E: utils/settings/types.ts:319] | description says default true [E: utils/settings/types.ts:322] | File picker 是否 respect `.gitignore`;`.ignore` files always respected。[E: utils/settings/types.ts:323] | schema-wide |
| `cleanupPeriodDays` | nonnegative integer number [E: utils/settings/types.ts:326] [E: utils/settings/types.ts:327] [E: utils/settings/types.ts:328] | description says default 30; `0` disables session persistence [E: utils/settings/types.ts:331] | Retain chat transcripts 的天数。[E: utils/settings/types.ts:331] | schema-wide |
| `attribution` | object `{ commit?, pr? }` [E: utils/settings/types.ts:338] [E: utils/settings/types.ts:339] [E: utils/settings/types.ts:346] | 未设置; `.optional()` [E: utils/settings/types.ts:354] | Customize attribution text for commits and PRs;unset fields use standard Claude Code attribution。[E: utils/settings/types.ts:356] [E: utils/settings/types.ts:357] | schema-wide |
| `attribution.commit` | string [E: utils/settings/types.ts:340] | 未设置; `.optional()` [E: utils/settings/types.ts:341] | Git commits 的 attribution text;empty string hides attribution。[E: utils/settings/types.ts:343] [E: utils/settings/types.ts:344] | schema-wide |
| `attribution.pr` | string [E: utils/settings/types.ts:347] | 未设置; `.optional()` [E: utils/settings/types.ts:348] | Pull request descriptions 的 attribution text;empty string hides attribution。[E: utils/settings/types.ts:350] [E: utils/settings/types.ts:351] | schema-wide |
| `includeCoAuthoredBy` | boolean [E: utils/settings/types.ts:360] | description says defaults to true [E: utils/settings/types.ts:364] | Deprecated;use `attribution` instead;controls Claude co-authored-by attribution。[E: utils/settings/types.ts:363] [E: utils/settings/types.ts:364] | schema-wide |
| `includeGitInstructions` | boolean [E: utils/settings/types.ts:367] | description says default true [E: utils/settings/types.ts:370] | 是否在 Claude system prompt 中 include built-in commit and PR workflow instructions。[E: utils/settings/types.ts:370] | schema-wide |
| `worktree` | object [E: utils/settings/types.ts:439] | 未设置; `.optional()` [E: utils/settings/types.ts:456] | Git worktree configuration for `--worktree` flag。[E: utils/settings/types.ts:457] | schema-wide |
| `worktree.symlinkDirectories` | `string[]` [E: utils/settings/types.ts:441] | no directories are symlinked by default [E: utils/settings/types.ts:445] | 从 main repository symlink 到 worktrees 的 directories,用于避免 disk bloat。[E: utils/settings/types.ts:443] | schema-wide |
| `worktree.sparsePaths` | `string[]` [E: utils/settings/types.ts:449] | 未设置; `.optional()` [E: utils/settings/types.ts:450] | 使用 git sparse-checkout cone mode 创建 worktrees 时包含的 directories。[E: utils/settings/types.ts:452] | schema-wide |
| `defaultShell` | enum `"bash"`/`"powershell"` [E: utils/settings/types.ts:465] | defaults to `bash` on all platforms [E: utils/settings/types.ts:469] | Input-box `!` commands 使用的 shell。[E: utils/settings/types.ts:468] | schema-wide |
| `strictPluginOnlyCustomization` | boolean 或 `CUSTOMIZATION_SURFACES[]` [E: utils/settings/types.ts:532] | 未设置; `.optional()` [E: utils/settings/types.ts:534] | Managed settings 中设置时,阻止 listed surfaces 的 non-plugin customization sources;array form 可锁定 `skills`/`agents`/`hooks`/`mcp`。[E: utils/settings/types.ts:542] [E: utils/settings/types.ts:249] [E: utils/settings/types.ts:250] [E: utils/settings/types.ts:251] [E: utils/settings/types.ts:252] | managed/policy intended |
| `enabledPlugins` | record keyed by `plugin-id@marketplace-id` [E: utils/settings/types.ts:560] [E: utils/settings/types.ts:562] [E: utils/settings/types.ts:563] | 未设置; `.optional()` [E: utils/settings/types.ts:564] | Enabled plugins use `plugin-id@marketplace-id` format;value 支持 boolean 或 extended version constraints。[E: utils/settings/types.ts:566] | schema-wide |
| `extraKnownMarketplaces` | record of `ExtraKnownMarketplaceSchema` [E: utils/settings/types.ts:570] | 未设置; `.optional()` [E: utils/settings/types.ts:597] | Repository settings 中 additional marketplaces,用于让 team members 获得 required plugin sources。[E: utils/settings/types.ts:599] | schema-wide |
| `extraKnownMarketplaces.*.source` | `MarketplaceSourceSchema()` [E: utils/settings/types.ts:93] | required within marketplace entry [I] | Marketplace fetch source。[E: utils/settings/types.ts:94] | schema-wide |
| `extraKnownMarketplaces.*.installLocation` | string [E: utils/settings/types.ts:97] | auto-generated if not provided [E: utils/settings/types.ts:100] | Marketplace manifest 的 local cache path。[E: utils/settings/types.ts:100] | schema-wide |
| `extraKnownMarketplaces.*.autoUpdate` | boolean [E: utils/settings/types.ts:103] | 未设置; `.optional()` [E: utils/settings/types.ts:104] | Startup 时是否自动 update marketplace 及其 installed plugins。[E: utils/settings/types.ts:106] | schema-wide |
| `strictKnownMarketplaces` | `MarketplaceSourceSchema[]` [E: utils/settings/types.ts:604] | 未设置; `.optional()` [E: utils/settings/types.ts:605] | Enterprise strict list of allowed marketplace sources;check happens before downloading,so blocked sources never touch filesystem。[E: utils/settings/types.ts:607] [E: utils/settings/types.ts:608] [E: utils/settings/types.ts:609] | managed/policy intended |
| `blockedMarketplaces` | `MarketplaceSourceSchema[]` [E: utils/settings/types.ts:616] | 未设置; `.optional()` [E: utils/settings/types.ts:617] | Enterprise blocklist of marketplace sources;blocked before download touches filesystem。[E: utils/settings/types.ts:619] [E: utils/settings/types.ts:620] [E: utils/settings/types.ts:621] | managed/policy intended |
| `skipWebFetchPreflight` | boolean [E: utils/settings/types.ts:650] | 未设置; `.optional()` [E: utils/settings/types.ts:651] | Enterprise environments with restrictive security policies 可 skip WebFetch blocklist check。[E: utils/settings/types.ts:653] | managed/policy intended |
| `autoUpdatesChannel` | enum `"latest"`/`"stable"` [E: utils/settings/types.ts:805] | 未设置; `.optional()` [E: utils/settings/types.ts:806] | Auto-updates release channel。[E: utils/settings/types.ts:807] | schema-wide |
| `disableDeepLinkRegistration` | enum literal `"disable"` [E: utils/settings/types.ts:811] | 未设置; `.optional()` [E: utils/settings/types.ts:812] | Prevent `claude-cli://` protocol handler registration with the OS。[E: utils/settings/types.ts:814] | feature-gated by `LODESTONE` [E: utils/settings/types.ts:808] |
| `minimumVersion` | string [E: utils/settings/types.ts:819] | 未设置; `.optional()` [E: utils/settings/types.ts:820] | Minimum version to stay on;prevents downgrades when switching to stable channel。[E: utils/settings/types.ts:822] | schema-wide |
| `plansDirectory` | string [E: utils/settings/types.ts:825] | defaults to `~/.claude/plans/` if unset [E: utils/settings/types.ts:829] | Custom directory for plan files,relative to project root。[E: utils/settings/types.ts:828] | schema-wide |
| `minSleepDurationMs` | nonnegative integer number [E: utils/settings/types.ts:844] [E: utils/settings/types.ts:845] [E: utils/settings/types.ts:846] | 未设置; `.optional()` [E: utils/settings/types.ts:847] | Sleep tool 最小 sleep duration,用于 throttle proactive tick frequency。[E: utils/settings/types.ts:849] [E: utils/settings/types.ts:850] | feature-gated by `PROACTIVE` or `KAIROS` [E: utils/settings/types.ts:841] |
| `maxSleepDurationMs` | integer number with min `-1` [E: utils/settings/types.ts:853] [E: utils/settings/types.ts:854] [E: utils/settings/types.ts:855] | `-1` means indefinite sleep [E: utils/settings/types.ts:859] | Sleep tool 最大 sleep duration,用于限制 remote/managed environments idle time。[E: utils/settings/types.ts:858] [E: utils/settings/types.ts:860] | feature-gated by `PROACTIVE` or `KAIROS` [E: utils/settings/types.ts:841] |
| `autoMemoryEnabled` | boolean [E: utils/settings/types.ts:939] | 未设置; `.optional()` [E: utils/settings/types.ts:940] | false 时 Claude 不读写 auto-memory directory。[E: utils/settings/types.ts:942] | schema-wide |
| `autoMemoryDirectory` | string [E: utils/settings/types.ts:945] | unset 时 defaults to `~/.claude/projects/<sanitized-cwd>/memory/` [E: utils/settings/types.ts:948] | Custom auto-memory storage directory;projectSettings 中该值被忽略以满足 security。[E: utils/settings/types.ts:948] | schema-wide |
| `autoDreamEnabled` | boolean [E: utils/settings/types.ts:951] | 未设置时 server-side default applies [E: utils/settings/types.ts:954] | Enable background memory consolidation,即 auto-dream。[E: utils/settings/types.ts:954] | schema-wide |
| `claudeMdExcludes` | `string[]` [E: utils/settings/types.ts:1054] | 未设置; `.optional()` [E: utils/settings/types.ts:1055] | Exclude CLAUDE.md files by glob patterns or absolute paths;Managed/policy files cannot be excluded。[E: utils/settings/types.ts:1057] [E: utils/settings/types.ts:1059] | schema-wide |
| `pluginTrustMessage` | string [E: utils/settings/types.ts:1063] | 未设置; `.optional()` [E: utils/settings/types.ts:1064] | Append custom organization context to plugin trust warning before installation。[E: utils/settings/types.ts:1066] | policy-only read path [E: utils/settings/types.ts:1067] |

## Sources

- `utils/settings/types.ts`
- `utils/settings/schemaOutput.ts`
- `utils/settings/constants.ts`

## 相关

- [配置与设置子系统](../../subsystems/config-settings.md)
