---
id: subsys.config-settings
path: subsystems/config-settings.md
title: 配置与设置
kind: subsystem
tier: T2
source: [utils/settings/, utils/config.ts]
symbols: [SettingsSchema, getSettingsForSource, loadSettingsFromDisk, getGlobalConfig, saveGlobalConfig]
related: [group.settings]
status: verified
evidence: explicit
updated: 2026-06-14
---

> 配置与设置子系统分成 typed settings 文件层和 persisted config 层: `utils/settings/` 负责 settings source、schema、merge、policy 和 change detection, `utils/config.ts` 负责 global/project config 持久化与 trust/auth 状态。[E: utils/settings/settings.ts:312][E: utils/settings/types.ts:255][E: utils/settings/changeDetector.ts:95][E: utils/config.ts:111][E: utils/config.ts:187][E: utils/config.ts:224][E: utils/config.ts:229][E: utils/config.ts:812]

## 能回答的问题

- user/project/local/flag/policy settings 的读取、合并和优先级在哪里定义?
- 哪些 settings source 可编辑, 哪些只能由 policy/flag 注入?
- settings schema、validation、invalid permission rule filtering 如何工作?
- global config 与 project config 如何保存, 以及为什么有 auth-loss guard?

## 职责边界

`utils/settings/` 面向 declarative settings: 它读取多个 source, 用 Zod schema validation, merge arrays, 处理 managed policy、flag inline settings 和 change notifications。[E: utils/settings/settings.ts:217][E: utils/settings/settings.ts:219][E: utils/settings/types.ts:255][E: utils/settings/settings.ts:542][E: utils/settings/settings.ts:543][E: utils/settings/changeDetector.ts:438][E: utils/settings/changeDetector.ts:439] `utils/config.ts` 面向 runtime persisted config: 它保存 global config、project config、auth fields、model usage、trust 状态等 CLI 运行状态。[E: utils/config.ts:77][E: utils/config.ts:80][E: utils/config.ts:83][E: utils/config.ts:95][E: utils/config.ts:111][E: utils/config.ts:187][E: utils/config.ts:197][E: utils/config.ts:224][E: utils/config.ts:229][E: utils/config.ts:812][E: utils/config.ts:1602]

## 关键文件

- `utils/settings/settings.ts`: settings file path、source resolution、policy precedence、merge、update、load from disk 和 trusted-source helpers。[E: utils/settings/settings.ts:239][E: utils/settings/settings.ts:319][E: utils/settings/settings.ts:416][E: utils/settings/settings.ts:660][E: utils/settings/settings.ts:882]
- `utils/settings/types.ts`: `SettingsSchema`、permission schema、environment variable schema 和 customization surface enums。[E: utils/settings/types.ts:35][E: utils/settings/types.ts:42][E: utils/settings/types.ts:248][E: utils/settings/types.ts:255]
- `utils/settings/constants.ts`: source ordering、display names、flag parsing、enabled/editable source filters 和 schema URL。[E: utils/settings/constants.ts:9][E: utils/settings/constants.ts:12][E: utils/settings/constants.ts:15][E: utils/settings/constants.ts:18][E: utils/settings/constants.ts:21][E: utils/settings/constants.ts:26][E: utils/settings/constants.ts:46][E: utils/settings/constants.ts:128][E: utils/settings/constants.ts:159][E: utils/settings/constants.ts:182][E: utils/settings/constants.ts:201]
- `utils/settings/mdm/settings.ts`: macOS/Windows MDM/HKCU policy loading、cache 和 managed file detection。[E: utils/settings/mdm/settings.ts:67][E: utils/settings/mdm/settings.ts:124][E: utils/settings/mdm/settings.ts:132][E: utils/settings/mdm/settings.ts:280]
- `utils/config.ts`: global/project config schema defaults、save/load lock、auth-loss guard、trust helpers 和 current project config。[E: utils/config.ts:138][E: utils/config.ts:585][E: utils/config.ts:783][E: utils/config.ts:812][E: utils/config.ts:1602]

## 数据模型

settings source 顺序包括 user、project、local、flag、policy; policy 和 flag 总是被加入 enabled sources, 但 editable sources 会排除 policy/flag。[E: utils/settings/constants.ts:9][E: utils/settings/constants.ts:12][E: utils/settings/constants.ts:15][E: utils/settings/constants.ts:18][E: utils/settings/constants.ts:21][E: utils/settings/constants.ts:163][E: utils/settings/constants.ts:164][E: utils/settings/constants.ts:165][E: utils/settings/constants.ts:182][E: utils/settings/constants.ts:184] `SettingsSchema` 覆盖 api key helper、cloud auth toggles、file suggestions、gitignore、cleanup、env、attribution 和 permission 等配置域。[E: utils/settings/types.ts:262][E: utils/settings/types.ts:266][E: utils/settings/types.ts:311][E: utils/settings/types.ts:318][E: utils/settings/types.ts:325][E: utils/settings/types.ts:333][E: utils/settings/types.ts:337][E: utils/settings/types.ts:372]

config 层有 `GlobalConfig` 与 `ProjectConfig`: project config 包含 allowed tools、MCP context URIs/servers、last cost/token/model usage/trust 等项目态; global config 包含 primaryApiKey、oauthAccount、theme、editor mode、autoCompact、env 等用户态。[E: utils/config.ts:77][E: utils/config.ts:78][E: utils/config.ts:79][E: utils/config.ts:83][E: utils/config.ts:87][E: utils/config.ts:95][E: utils/config.ts:111][E: utils/config.ts:187][E: utils/config.ts:197][E: utils/config.ts:224][E: utils/config.ts:229][E: utils/config.ts:231][E: utils/config.ts:234][E: utils/config.ts:239]

## 控制流

1. `getSettingsForSource` 先检查 cache, 再按 source 读取 policy、flag inline 或 settings file; policy 采用 remote/MDM/managed file/HKCU first-source-wins 逻辑。[E: utils/settings/settings.ts:312][E: utils/settings/settings.ts:314][E: utils/settings/settings.ts:323][E: utils/settings/settings.ts:329][E: utils/settings/settings.ts:334][E: utils/settings/settings.ts:339][E: utils/settings/settings.ts:353][E: utils/settings/settings.ts:356]
2. `loadSettingsFromDisk` 先加载 plugin base settings, 再遍历 enabled sources, 对 policy source 与 file source 分别 merge, 并记录 diagnostics。[E: utils/settings/settings.ts:660][E: utils/settings/settings.ts:674][E: utils/settings/settings.ts:677][E: utils/settings/settings.ts:741][E: utils/settings/settings.ts:786]
3. `updateSettingsForSource` 拒绝 policy/flag source, 读取现有 JSON, merge update/delete/array rules, 写回文件并 reset cache; local source 会确保 `.gitignore`。[E: utils/settings/settings.ts:421][E: utils/settings/settings.ts:422][E: utils/settings/settings.ts:424][E: utils/settings/settings.ts:440][E: utils/settings/settings.ts:473][E: utils/settings/settings.ts:484][E: utils/settings/settings.ts:489][E: utils/settings/settings.ts:500][E: utils/settings/settings.ts:506][E: utils/settings/settings.ts:508]
4. settings change detector 监听 watch targets, 对 internal writes 做 suppress, 再 fan-out reset cache 与 `ConfigChange` hooks。[E: utils/settings/changeDetector.ts:95][E: utils/settings/changeDetector.ts:103][E: utils/settings/changeDetector.ts:143][E: utils/settings/changeDetector.ts:284][E: utils/settings/changeDetector.ts:437]
5. `saveGlobalConfig` 与 project config save 都有 lock/fallback 路径, 并在写入前用 `wouldLoseAuthState` 避免 stale write 清掉 auth state。[E: utils/config.ts:812][E: utils/config.ts:842][E: utils/config.ts:846][E: utils/config.ts:1641][E: utils/config.ts:1672][E: utils/config.ts:1673]

## 设计动机与权衡

settings 文件层用 merge 而不是覆盖: array merge 会 concatenate/dedupe, 这让 user/project/local/policy 能组合权限、hooks 或 env-like list。[E: utils/settings/settings.ts:530][E: utils/settings/settings.ts:542][E: utils/settings/settings.ts:543][I] policy 与 flag source 被排除在 editable source 外; 它们来自 managed/CLI injection 而不是用户可写文件是本页对 source 语义的推断。[E: utils/settings/constants.ts:184][I]

config save 的 auth-loss guard 会检测并拒绝丢失现有 auth state 的写入, 同时记录 analytics/log; 这使 config auth references 成为写入保护对象。[E: utils/config.ts:846][E: utils/config.ts:847][E: utils/config.ts:851][I]

## Gotcha

- `parseSettingsFile` 有 file cache, 如果测试或工具直接改文件, 需要走 reset cache 或 change detector 路径才能读到最新值。[E: utils/settings/settings.ts:182][E: utils/settings/settings.ts:191][E: utils/settings/settingsCache.ts:45][E: utils/settings/settingsCache.ts:47][E: utils/settings/settingsCache.ts:51]
- managed file settings 支持 base file 和 drop-in `.json` 目录, drop-ins 会按文件名排序后 merge。[E: utils/settings/settings.ts:82][E: utils/settings/settings.ts:91][E: utils/settings/settings.ts:102][E: utils/settings/settings.ts:104][E: utils/settings/settings.ts:109]
- dangerous prompt 与 auto-mode opt-in 等配置只从 trusted sources 读取, project settings 会被 helper 排除。[E: utils/settings/settings.ts:884][E: utils/settings/settings.ts:887][E: utils/settings/settings.ts:898][E: utils/settings/settings.ts:903]
- global config 与 current project config 是不同文件语义, 但两者都要考虑 auth-loss guard。[E: utils/config.ts:846][E: utils/config.ts:1673]

## Sources

- `utils/settings/`
- `utils/config.ts`
- `utils/settings/settings.ts`
- `utils/settings/types.ts`
- `utils/settings/constants.ts`
- `utils/settings/validation.ts`
- `utils/settings/settingsCache.ts`
- `utils/settings/changeDetector.ts`
- `utils/settings/mdm/settings.ts`
- `utils/settings/managedPath.ts`

## 相关

- group.settings
