---
id: ref.db-schema
title: DB schema catalog(19 tables + 33 migrations)
kind: reference
tier: T3
v: v2
source:
  - packages/core/src/account/sql.ts
  - packages/core/src/control-plane/workspace.sql.ts
  - packages/core/src/credential/sql.ts
  - packages/core/src/data-migration.sql.ts
  - packages/core/src/event/sql.ts
  - packages/core/src/permission/sql.ts
  - packages/core/src/project/sql.ts
  - packages/core/src/session/sql.ts
  - packages/core/src/share/sql.ts
  - packages/core/src/database/migration.gen.ts
status: verified
symbols:
  - AccountTable
  - WorkspaceTable
  - EventTable
  - SessionTable
  - SessionMessageTable
  - SessionInputTable
  - Migrations
evidence: explicit
updated: 92c70c9c3
---

> 这份节点是 V2 core SQLite/Drizzle schema 的逐表逐迁移总账；V1 当前仍有自己的 legacy 存储路径，本节点只描述 `packages/core/src` 的 V2 durable storage。[I]

## 能回答的问题

- V2 core 当前有哪些 SQLite table，每列是什么？
- session/message/part 与新的 event-sourced `session_message/session_input/session_context_epoch` 怎么并存？
- 33 个 migration 的顺序与作用是什么？
- migration runner 如何处理当前 `migration` journal、旧 `__drizzle_migrations` 与跳过迁移 env？

## Schema 总览

V2 core schema 分散在各 domain 的 `*.sql.ts` 文件中，当前直接定义 19 张 `sqliteTable`。[E: packages/core/src/account/sql.ts:6][E: packages/core/src/session/sql.ts:167][I] 通用 `Timestamps` helper 提供 `time_created` 与 `time_updated` 两列，其中 `time_updated` 使用 `$onUpdate(() => Date.now())` 自动更新。[E: packages/core/src/database/schema.sql.ts:3][E: packages/core/src/database/schema.sql.ts:9]

## Table catalog

| # | Table | Columns | Constraints / indexes | Evidence |
|---:|---|---|---|---|
| 1 | `account` | `id`, `email`, `url`, `access_token`, `refresh_token`, `token_expiry`, `time_created`, `time_updated` | `id` primary key | [E: packages/core/src/account/sql.ts:6][E: packages/core/src/account/sql.ts:13] |
| 2 | `account_state` | `id`, `active_account_id`, `active_org_id` | `active_account_id` references `account.id` with `onDelete: set null` | [E: packages/core/src/account/sql.ts:16][E: packages/core/src/account/sql.ts:21] |
| 3 | `control_account` | `email`, `url`, `access_token`, `refresh_token`, `token_expiry`, `active`, `time_created`, `time_updated` | composite primary key `email,url` | [E: packages/core/src/account/sql.ts:25][E: packages/core/src/account/sql.ts:38] |
| 4 | `workspace` | `id`, `type`, `name`, `branch`, `directory`, `extra`, `project_id`, `time_used` | `project_id` references `project.id` cascade | [E: packages/core/src/control-plane/workspace.sql.ts:6][E: packages/core/src/control-plane/workspace.sql.ts:19] |
| 5 | `credential` | `id`, `connector_id`, `method_id`, `label`, `value`, `active`, `time_created`, `time_updated` | unique active credential per connector via partial index | [E: packages/core/src/credential/sql.ts:7][E: packages/core/src/credential/sql.ts:20][E: packages/core/src/credential/sql.ts:21] |
| 6 | `data_migration` | `name`, `time_completed` | `name` primary key | [E: packages/core/src/data-migration.sql.ts:3][E: packages/core/src/data-migration.sql.ts:5] |
| 7 | `event_sequence` | `aggregate_id`, `seq`, `owner_id` | `aggregate_id` primary key | [E: packages/core/src/event/sql.ts:4][E: packages/core/src/event/sql.ts:7] |
| 8 | `event` | `id`, `aggregate_id`, `seq`, `type`, `data` | `aggregate_id` references `event_sequence`; unique `(aggregate_id,seq)`; index on `(aggregate_id,type,seq)` | [E: packages/core/src/event/sql.ts:10][E: packages/core/src/event/sql.ts:23] |
| 9 | `permission` | `id`, `project_id`, `action`, `resource`, `time_created`, `time_updated` | `project_id` references `project.id` cascade; unique `(project_id,action,resource)` | [E: packages/core/src/permission/sql.ts:7][E: packages/core/src/permission/sql.ts:19] |
| 10 | `project` | `id`, `worktree`, `vcs`, `name`, `icon_url`, `icon_url_override`, `icon_color`, `time_created`, `time_updated`, `time_initialized`, `sandboxes`, `commands` | `id` primary key | [E: packages/core/src/project/sql.ts:6][E: packages/core/src/project/sql.ts:17] |
| 11 | `project_directory` | `project_id`, `directory`, `type`, `time_created` | composite primary key `(project_id,directory)`; `project_id` references project cascade | [E: packages/core/src/project/sql.ts:20][E: packages/core/src/project/sql.ts:33] |
| 12 | `session` | `id`, `project_id`, `workspace_id`, `parent_id`, `slug`, `directory`, `path`, `title`, `version`, `share_url`, `summary_additions`, `summary_deletions`, `summary_files`, `summary_diffs`, `metadata`, `cost`, `tokens_*`, `revert`, `permission`, `agent`, `model`, `time_created`, `time_updated`, `time_compacting`, `time_archived` | indexes on project/workspace/parent | [E: packages/core/src/session/sql.ts:21][E: packages/core/src/session/sql.ts:61][E: packages/core/src/session/sql.ts:62][E: packages/core/src/session/sql.ts:63] |
| 13 | `message` | `id`, `session_id`, `time_created`, `time_updated`, `data` | `session_id` references session cascade; index on session/time | [E: packages/core/src/session/sql.ts:67][E: packages/core/src/session/sql.ts:78] |
| 14 | `part` | `id`, `message_id`, `session_id`, `time_created`, `time_updated`, `data` | `message_id` references message cascade; indexes on message/session | [E: packages/core/src/session/sql.ts:81][E: packages/core/src/session/sql.ts:95] |
| 15 | `todo` | `session_id`, `content`, `status`, `priority`, `position`, `time_created`, `time_updated` | composite primary key `(session_id,position)`; session index | [E: packages/core/src/session/sql.ts:99][E: packages/core/src/session/sql.ts:113][E: packages/core/src/session/sql.ts:114] |
| 16 | `session_message` | `id`, `session_id`, `type`, `seq`, `time_created`, `time_updated`, `data` | unique `(session_id,seq)` plus session/time index | [E: packages/core/src/session/sql.ts:118][E: packages/core/src/session/sql.ts:135] |
| 17 | `session_input` | `id`, `session_id`, `prompt`, `delivery`, `admitted_seq`, `promoted_seq`, `time_created` | pending-delivery index plus unique admitted/promoted sequence indexes | [E: packages/core/src/session/sql.ts:139][E: packages/core/src/session/sql.ts:163] |
| 18 | `session_context_epoch` | `session_id`, `baseline`, `agent`, `snapshot`, `baseline_seq`, `replacement_seq`, `revision` | `session_id` primary key; default agent is `AgentV2.defaultID` | [E: packages/core/src/session/sql.ts:167][E: packages/core/src/session/sql.ts:177] |
| 19 | `session_share` | `session_id`, `id`, `secret`, `url`, `time_created`, `time_updated` | `session_id` primary key and references session cascade | [E: packages/core/src/share/sql.ts:5][E: packages/core/src/share/sql.ts:12] |

## Session storage split

`message` and `part` are still present as V1 row shapes because their `data` columns use `V1MessageData` and `V1PartData` aliases; `session_message`, `session_input`, and `session_context_epoch` are the newer V2 session-next storage/projection tables.[E: packages/core/src/session/sql.ts:18][E: packages/core/src/session/sql.ts:19][E: packages/core/src/session/sql.ts:76][E: packages/core/src/session/sql.ts:91][E: packages/core/src/session/sql.ts:118][E: packages/core/src/session/sql.ts:139][E: packages/core/src/session/sql.ts:167][I] This split is why readers must not assume every message-like object is stored in one table during the migration window.[I]

## Migration runner

`migration.gen.ts` imports migrations in a fixed array order from `20260127222353_familiar_lady_ursula` through `20260611035744_credential`.[E: packages/core/src/database/migration.gen.ts:5][E: packages/core/src/database/migration.gen.ts:37] The runner creates the current `migration` journal table, seeds it from legacy `__drizzle_migrations` when that legacy table exists, and only calls `migration.up(tx)` when `OPENCODE_SKIP_MIGRATIONS` is not set.[E: packages/core/src/database/migration.ts:23][E: packages/core/src/database/migration.ts:33][E: packages/core/src/database/migration.ts:51]

## Migration catalog

| # | Migration | Main effect | Evidence |
|---:|---|---|---|
| 1 | `20260127222353_familiar_lady_ursula` | Initial project/message/part/permission/session/todo/session_share schema. | [E: packages/core/src/database/migration/20260127222353_familiar_lady_ursula.ts:5][E: packages/core/src/database/migration/20260127222353_familiar_lady_ursula.ts:89] |
| 2 | `20260211171708_add_project_commands` | Adds `project.commands`. | [E: packages/core/src/database/migration/20260211171708_add_project_commands.ts:8] |
| 3 | `20260213144116_wakeful_the_professor` | Creates `control_account`. | [E: packages/core/src/database/migration/20260213144116_wakeful_the_professor.ts:9] |
| 4 | `20260225215848_workspace` | Creates `workspace`. | [E: packages/core/src/database/migration/20260225215848_workspace.ts:9] |
| 5 | `20260227213759_add_session_workspace_id` | Adds `session.workspace_id` and workspace index. | [E: packages/core/src/database/migration/20260227213759_add_session_workspace_id.ts:8][E: packages/core/src/database/migration/20260227213759_add_session_workspace_id.ts:9] |
| 6 | `20260228203230_blue_harpoon` | Creates `account` and `account_state`. | [E: packages/core/src/database/migration/20260228203230_blue_harpoon.ts:9][E: packages/core/src/database/migration/20260228203230_blue_harpoon.ts:22] |
| 7 | `20260303231226_add_workspace_fields` | Adds workspace type/name/directory/extra and drops config. | [E: packages/core/src/database/migration/20260303231226_add_workspace_fields.ts:8][E: packages/core/src/database/migration/20260303231226_add_workspace_fields.ts:12] |
| 8 | `20260309230000_move_org_to_state` | Moves selected org to account_state. | [E: packages/core/src/database/migration/20260309230000_move_org_to_state.ts:8][E: packages/core/src/database/migration/20260309230000_move_org_to_state.ts:12] |
| 9 | `20260312043431_session_message_cursor` | Reworks message/part indexes. | [E: packages/core/src/database/migration/20260312043431_session_message_cursor.ts:8][E: packages/core/src/database/migration/20260312043431_session_message_cursor.ts:13] |
| 10 | `20260323234822_events` | Creates event sourcing tables. | [E: packages/core/src/database/migration/20260323234822_events.ts:9][E: packages/core/src/database/migration/20260323234822_events.ts:15] |
| 11 | `20260410174513_workspace-name` | Rebuilds workspace with `name`. | [E: packages/core/src/database/migration/20260410174513_workspace-name.ts:10][E: packages/core/src/database/migration/20260410174513_workspace-name.ts:25] |
| 12 | `20260413175956_chief_energizer` | Creates `session_entry`; migration #14 later drops that table. | [E: packages/core/src/database/migration/20260413175956_chief_energizer.ts:9][E: packages/core/src/database/migration/20260413175956_chief_energizer.ts:21][E: packages/core/src/database/migration/20260427172553_slow_nightmare.ts:27] |
| 13 | `20260423070820_add_icon_url_override` | Adds `project.icon_url_override`. | [E: packages/core/src/database/migration/20260423070820_add_icon_url_override.ts:9][E: packages/core/src/database/migration/20260423070820_add_icon_url_override.ts:10] |
| 14 | `20260427172553_slow_nightmare` | Creates `session_message` and drops `session_entry`. | [E: packages/core/src/database/migration/20260427172553_slow_nightmare.ts:9][E: packages/core/src/database/migration/20260427172553_slow_nightmare.ts:27] |
| 15 | `20260428004200_add_session_path` | Adds `session.path`. | [E: packages/core/src/database/migration/20260428004200_add_session_path.ts:8] |
| 16 | `20260501142318_next_venus` | Adds `session.agent` and `session.model`. | [E: packages/core/src/database/migration/20260501142318_next_venus.ts:8][E: packages/core/src/database/migration/20260501142318_next_venus.ts:9] |
| 17 | `20260504145000_add_sync_owner` | Adds `event_sequence.owner_id`. | [E: packages/core/src/database/migration/20260504145000_add_sync_owner.ts:8] |
| 18 | `20260507164347_add_workspace_time` | Adds `workspace.time_used`. | [E: packages/core/src/database/migration/20260507164347_add_workspace_time.ts:8] |
| 19 | `20260510033149_session_usage` | Adds session cost/token usage columns and backfill. | [E: packages/core/src/database/migration/20260510033149_session_usage.ts:8][E: packages/core/src/database/migration/20260510033149_session_usage.ts:15] |
| 20 | `20260511000411_data_migration_state` | Creates `data_migration`. | [E: packages/core/src/database/migration/20260511000411_data_migration_state.ts:9] |
| 21 | `20260511173437_session-metadata` | Adds `session.metadata` if missing. | [E: packages/core/src/database/migration/20260511173437_session-metadata.ts:10][E: packages/core/src/database/migration/20260511173437_session-metadata.ts:13] |
| 22 | `20260601010001_normalize_storage_paths` | Normalizes stored path separators. | [E: packages/core/src/database/migration/20260601010001_normalize_storage_paths.ts:9][E: packages/core/src/database/migration/20260601010001_normalize_storage_paths.ts:18] |
| 23 | `20260601202201_amazing_prowler` | Drops old permission table. | [E: packages/core/src/database/migration/20260601202201_amazing_prowler.ts:8] |
| 24 | `20260602002951_lowly_union_jack` | Recreates permission table with V2 columns and unique index. | [E: packages/core/src/database/migration/20260602002951_lowly_union_jack.ts:9][E: packages/core/src/database/migration/20260602002951_lowly_union_jack.ts:20] |
| 25 | `20260602182828_add_project_directories` | Creates `project_directory`. | [E: packages/core/src/database/migration/20260602182828_add_project_directories.ts:9][E: packages/core/src/database/migration/20260602182828_add_project_directories.ts:15] |
| 26 | `20260603001617_session_message_projection_indexes` | Adds event/session_message projection indexes. | [E: packages/core/src/database/migration/20260603001617_session_message_projection_indexes.ts:8][E: packages/core/src/database/migration/20260603001617_session_message_projection_indexes.ts:15] |
| 27 | `20260603040000_session_message_projection_order` | Rebuilds session_message ordering around `seq`. | [E: packages/core/src/database/migration/20260603040000_session_message_projection_order.ts:10][E: packages/core/src/database/migration/20260603040000_session_message_projection_order.ts:15] |
| 28 | `20260603141458_session_input_inbox` | Creates `session_input`. | [E: packages/core/src/database/migration/20260603141458_session_input_inbox.ts:9][E: packages/core/src/database/migration/20260603141458_session_input_inbox.ts:21] |
| 29 | `20260603160727_jittery_ezekiel_stane` | Updates session_input/event/session_message indexes. | [E: packages/core/src/database/migration/20260603160727_jittery_ezekiel_stane.ts:8][E: packages/core/src/database/migration/20260603160727_jittery_ezekiel_stane.ts:16] |
| 30 | `20260604172448_event_sourced_session_input` | Deletes event/session/workspace projection state and rebuilds event-sourced session input indexes. | [E: packages/core/src/database/migration/20260604172448_event_sourced_session_input.ts:8][E: packages/core/src/database/migration/20260604172448_event_sourced_session_input.ts:13][E: packages/core/src/database/migration/20260604172448_event_sourced_session_input.ts:43] |
| 31 | `20260605003541_add_session_context_snapshot` | Creates `session_context_epoch`. | [E: packages/core/src/database/migration/20260605003541_add_session_context_snapshot.ts:9][E: packages/core/src/database/migration/20260605003541_add_session_context_snapshot.ts:16] |
| 32 | `20260605042240_add_context_epoch_agent` | Adds context epoch agent default. | [E: packages/core/src/database/migration/20260605042240_add_context_epoch_agent.ts:8] |
| 33 | `20260611035744_credential` | Creates credential table and active unique index. | [E: packages/core/src/database/migration/20260611035744_credential.ts:9][E: packages/core/src/database/migration/20260611035744_credential.ts:21] |

## Sources

- `packages/core/src/account/sql.ts`
- `packages/core/src/control-plane/workspace.sql.ts`
- `packages/core/src/credential/sql.ts`
- `packages/core/src/data-migration.sql.ts`
- `packages/core/src/event/sql.ts`
- `packages/core/src/permission/sql.ts`
- `packages/core/src/project/sql.ts`
- `packages/core/src/session/sql.ts`
- `packages/core/src/share/sql.ts`
- `packages/core/src/database/migration.ts`
- `packages/core/src/database/migration.gen.ts`
- `packages/core/src/database/migration/`

## 相关

- `persistence.database`
- `spine.v2-event-sourcing`
- `ref.events`
- `ref.data-model`
