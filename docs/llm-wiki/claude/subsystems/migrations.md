---
id: subsys.migrations
path: subsystems/migrations.md
title: 迁移系统
kind: subsystem
tier: T2
status: verified
source: [migrations/]
symbols: [runMigrations, CURRENT_MIGRATION_VERSION, migrateAutoUpdatesToSettings, migrateBypassPermissionsAcceptedToSettings, migrateEnableAllProjectMcpServersToSettings, resetProToOpusDefault, migrateSonnet1mToSonnet45, migrateLegacyOpusToCurrent, migrateSonnet45ToSonnet46, migrateOpusToOpus1m, migrateReplBridgeEnabledToRemoteControlAtStartup, resetAutoModeOptInForDefaultOffer, migrateFennecToOpus]
related: []
updated: 2026-06-14
evidence: explicit
---

迁移系统是一组启动期同步配置修补函数: `main.tsx` 用 `CURRENT_MIGRATION_VERSION` gate 执行 migrations 目录中的函数, 成功后把 global config 的 `migrationVersion` 写到当前版本; 当前源码表现为 `runMigrations` 内顺序调用函数, 没有看到集中式迁移表或 per-migration registry。[E: main.tsx:325][E: main.tsx:326][E: main.tsx:327][E: main.tsx:328][E: main.tsx:343][I]

## 能回答的问题

- 哪些迁移会在当前版本 gate 下执行, 顺序是什么?
- 每个迁移读写 global config、user settings、local settings 还是 project config?
- 哪些迁移靠 completion flag 幂等, 哪些靠源字段消失或条件判断幂等?
- model alias 迁移和 remote-control setting 迁移各自保护什么用户意图?

## 职责边界

`migrations/` 中的函数只负责修补已有配置和默认值; 迁移触发时机、版本 gate 和最终 `migrationVersion` 写入在 `main.tsx` 的 `runMigrations` 中。[E: main.tsx:326][E: main.tsx:328][E: main.tsx:343] 多个迁移函数会捕获错误并记录日志以避免启动失败; 由于 `runMigrations` 在调用迁移后仍写当前 `migrationVersion`, 被迁移函数内部 catch 掉的失败可能不会在下次启动自动重试, 这表示迁移不是强事务系统。[E: migrations/migrateAutoUpdatesToSettings.ts:55][E: migrations/migrateEnableAllProjectMcpServersToSettings.ts:113][E: migrations/resetAutoModeOptInForDefaultOffer.ts:47][E: main.tsx:343][I]

## 关键文件

- `main.tsx`: 导入迁移函数, 定义 `CURRENT_MIGRATION_VERSION = 11`, 按顺序执行迁移并写回 migrationVersion。[E: main.tsx:174][E: main.tsx:325][E: main.tsx:328][E: main.tsx:343]
- `migrations/migrateAutoUpdatesToSettings.ts`: 把用户显式禁用 autoUpdates 迁到 user settings env `DISABLE_AUTOUPDATER`。[E: migrations/migrateAutoUpdatesToSettings.ts:18][E: migrations/migrateAutoUpdatesToSettings.ts:30]
- `migrations/migrateBypassPermissionsAcceptedToSettings.ts`: 把 global config 的 bypass permission prompt 接受标记迁到 user settings。[E: migrations/migrateBypassPermissionsAcceptedToSettings.ts:14][E: migrations/migrateBypassPermissionsAcceptedToSettings.ts:22]
- `migrations/migrateEnableAllProjectMcpServersToSettings.ts`: 把 project config 的 MCP approval 字段迁到 local settings 并去重 merge server lists。[E: migrations/migrateEnableAllProjectMcpServersToSettings.ts:17][E: migrations/migrateEnableAllProjectMcpServersToSettings.ts:64]
- model migrations: reset Pro/Opus 默认、Sonnet 1M/4.5/4.6、legacy Opus、Opus 1M merge 和 Fennec alias 迁移。[E: migrations/resetProToOpusDefault.ts:7][E: migrations/migrateSonnet1mToSonnet45.ts:25][E: migrations/migrateLegacyOpusToCurrent.ts:29][E: migrations/migrateSonnet45ToSonnet46.ts:29][E: migrations/migrateOpusToOpus1m.ts:24][E: migrations/migrateFennecToOpus.ts:18]
- `migrations/migrateReplBridgeEnabledToRemoteControlAtStartup.ts`: 把旧 `replBridgeEnabled` key 迁到 `remoteControlAtStartup`, 并删除旧 key。[E: migrations/migrateReplBridgeEnabledToRemoteControlAtStartup.ts:10][E: migrations/migrateReplBridgeEnabledToRemoteControlAtStartup.ts:18][E: migrations/migrateReplBridgeEnabledToRemoteControlAtStartup.ts:19]
- `migrations/resetAutoModeOptInForDefaultOffer.ts`: 在 transcript classifier feature 下清除特定用户的 auto mode opt-in skip 标记并写 completion flag。[E: migrations/resetAutoModeOptInForDefaultOffer.ts:25][E: migrations/resetAutoModeOptInForDefaultOffer.ts:26][E: migrations/resetAutoModeOptInForDefaultOffer.ts:43]

## 数据模型 / 状态

版本级幂等来自 global config 的 `migrationVersion`; 当当前值不等于 `CURRENT_MIGRATION_VERSION` 时执行整组同步迁移, 结束时保存当前版本。[E: main.tsx:325][E: main.tsx:327][E: main.tsx:343] 部分迁移还有自己的 completion flag: `sonnet1m45MigrationComplete`、`opusProMigrationComplete`、`hasResetAutoModeOptInForDefaultOffer`。[E: migrations/migrateSonnet1mToSonnet45.ts:27][E: migrations/resetProToOpusDefault.ts:10][E: migrations/resetAutoModeOptInForDefaultOffer.ts:28]

配置 source 边界很关键: auto-updates 和 bypass permissions 从 global config 迁到 user settings; MCP approval 从 current project config 迁到 local settings; model alias migrations 多数只读写 `userSettings.model`, 避免把 project/local/policy pin 提升成全局默认。[E: migrations/migrateAutoUpdatesToSettings.ts:14][E: migrations/migrateAutoUpdatesToSettings.ts:26][E: migrations/migrateBypassPermissionsAcceptedToSettings.ts:15][E: migrations/migrateBypassPermissionsAcceptedToSettings.ts:23][E: migrations/migrateEnableAllProjectMcpServersToSettings.ts:18][E: migrations/migrateEnableAllProjectMcpServersToSettings.ts:34][E: migrations/migrateLegacyOpusToCurrent.ts:38]

## 控制流

当前同步迁移顺序是: auto updates、bypass permissions accepted、project MCP approvals、Pro Opus default、Sonnet 1M to 4.5、legacy Opus、Sonnet 4.5 to 4.6、Opus to Opus 1M、REPL bridge setting rename, 然后在 feature gate 下 reset AutoMode opt-in, 在编译期 USER_TYPE 条件下 Fennec to Opus。[E: main.tsx:328][E: main.tsx:329][E: main.tsx:330][E: main.tsx:331][E: main.tsx:332][E: main.tsx:333][E: main.tsx:334][E: main.tsx:335][E: main.tsx:336][E: main.tsx:337][E: main.tsx:340]

`migrateAutoUpdatesToSettings` 只在 `globalConfig.autoUpdates === false` 且 native protection flag 不为 true 时执行; 它写 `DISABLE_AUTOUPDATER: '1'`, 设置当前进程 env, 然后从 global config 删除 autoUpdates 字段。[E: migrations/migrateAutoUpdatesToSettings.ts:18][E: migrations/migrateAutoUpdatesToSettings.ts:30][E: migrations/migrateAutoUpdatesToSettings.ts:44][E: migrations/migrateAutoUpdatesToSettings.ts:47] `migrateBypassPermissionsAcceptedToSettings` 只在 global config 有 bypass accepted 时执行, 若 settings 尚未有 skip prompt 则写 user settings, 最后删除旧字段。[E: migrations/migrateBypassPermissionsAcceptedToSettings.ts:17][E: migrations/migrateBypassPermissionsAcceptedToSettings.ts:22][E: migrations/migrateBypassPermissionsAcceptedToSettings.ts:30]

`migrateEnableAllProjectMcpServersToSettings` 检测 enableAll/enabled/disabled 三类 project config 字段, 写入或 merge local settings, 然后从 project config 删除这些字段。[E: migrations/migrateEnableAllProjectMcpServersToSettings.ts:21][E: migrations/migrateEnableAllProjectMcpServersToSettings.ts:34][E: migrations/migrateEnableAllProjectMcpServersToSettings.ts:47][E: migrations/migrateEnableAllProjectMcpServersToSettings.ts:60][E: migrations/migrateEnableAllProjectMcpServersToSettings.ts:74][E: migrations/migrateEnableAllProjectMcpServersToSettings.ts:98]

Model migrations 分散保护不同 rollout: `resetProToOpusDefault` 只对 first-party Pro 且无 custom model 的用户打 timestamp, 有 custom model 只标记完成; `migrateSonnet1mToSonnet45` 把 `sonnet[1m]` user setting 和 in-memory override pin 到 explicit Sonnet 4.5 1M; `migrateLegacyOpusToCurrent` 在 first-party 且 legacy remap enabled 时把显式 Opus 4.0/4.1 字符串改成 `opus`; `migrateSonnet45ToSonnet46` 把 first-party Pro/Max/Team Premium 的 Sonnet 4.5 字符串改回 `sonnet`/`sonnet[1m]`; `migrateOpusToOpus1m` 在 Opus 1M merge enabled 且 userSettings.model 正好是 `opus` 时改成 `opus[1m]` 或清空成默认; `migrateFennecToOpus` 只在 `USER_TYPE === 'ant'` 时迁移 fennec aliases。[E: migrations/resetProToOpusDefault.ts:17][E: migrations/resetProToOpusDefault.ts:29][E: migrations/migrateSonnet1mToSonnet45.ts:31][E: migrations/migrateSonnet1mToSonnet45.ts:39][E: migrations/migrateLegacyOpusToCurrent.ts:30][E: migrations/migrateLegacyOpusToCurrent.ts:38][E: migrations/migrateLegacyOpusToCurrent.ts:48][E: migrations/migrateSonnet45ToSonnet46.ts:30][E: migrations/migrateSonnet45ToSonnet46.ts:34][E: migrations/migrateSonnet45ToSonnet46.ts:48][E: migrations/migrateOpusToOpus1m.ts:25][E: migrations/migrateOpusToOpus1m.ts:29][E: migrations/migrateOpusToOpus1m.ts:34][E: migrations/migrateFennecToOpus.ts:19][E: migrations/migrateFennecToOpus.ts:27]

`migrateReplBridgeEnabledToRemoteControlAtStartup` 在 global config 里存在旧 key 且新 key 未设置时复制布尔值并删除旧 key。[E: migrations/migrateReplBridgeEnabledToRemoteControlAtStartup.ts:11][E: migrations/migrateReplBridgeEnabledToRemoteControlAtStartup.ts:15][E: migrations/migrateReplBridgeEnabledToRemoteControlAtStartup.ts:17][E: migrations/migrateReplBridgeEnabledToRemoteControlAtStartup.ts:18][E: migrations/migrateReplBridgeEnabledToRemoteControlAtStartup.ts:19] `resetAutoModeOptInForDefaultOffer` 在 feature gate 打开、未完成、AutoMode 状态为 enabled 时, 对 skipAutoPermissionPrompt 且 default mode 不是 auto 的 user settings 清空 skip 标记, 再写 global completion flag。[E: migrations/resetAutoModeOptInForDefaultOffer.ts:26][E: migrations/resetAutoModeOptInForDefaultOffer.ts:28][E: migrations/resetAutoModeOptInForDefaultOffer.ts:29][E: migrations/resetAutoModeOptInForDefaultOffer.ts:34][E: migrations/resetAutoModeOptInForDefaultOffer.ts:37][E: migrations/resetAutoModeOptInForDefaultOffer.ts:43]

## 设计动机与权衡

- 版本 gate 会重跑整组同步迁移, 所以迁移函数需要自己具备幂等条件; 源码通过字段存在性、completion flag 和只写特定 source 来做到这一点。[E: main.tsx:327][E: migrations/migrateBypassPermissionsAcceptedToSettings.ts:17][E: migrations/migrateSonnet1mToSonnet45.ts:27][E: migrations/migrateLegacyOpusToCurrent.ts:38][I]
- Model migrations 多数只改 userSettings, 这是为了修正 `/model` 写入的全局用户选择, 同时避免改 project/local/policy pin。[E: migrations/migrateLegacyOpusToCurrent.ts:38][E: migrations/migrateSonnet45ToSonnet46.ts:38][E: migrations/migrateOpusToOpus1m.ts:29][I]
- MCP approval 迁移选择 local settings 而不是 user settings, 说明项目 MCP 信任意图被保留在当前项目边界内。[E: migrations/migrateEnableAllProjectMcpServersToSettings.ts:34][E: migrations/migrateEnableAllProjectMcpServersToSettings.ts:89][I]

## Gotchas

- `migrateFennecToOpus` 在当前编译输出里由 `"external" === 'ant'` 包围调用, 因此外部构建不会实际执行该调用路径。[E: main.tsx:340][E: migrations/migrateFennecToOpus.ts:19]
- `migrateOpusToOpus1m` 可能把 userSettings.model 写成 `undefined`, 因为如果 `opus[1m]` 等于当前默认模型, 它会清掉显式设置。[E: migrations/migrateOpusToOpus1m.ts:34][E: migrations/migrateOpusToOpus1m.ts:40]
- `resetAutoModeOptInForDefaultOffer` 的 completion flag 在 global config, 不是 settings, 因此 settings reset 不会自动重新触发该 migration。[E: migrations/resetAutoModeOptInForDefaultOffer.ts:43]

## Sources

- `migrations/`
