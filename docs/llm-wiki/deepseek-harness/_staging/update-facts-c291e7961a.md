# Extra architecture facts — c291e7961a (`0.1.5-rc.2`)

Filler 辅助。冲突时以源码为准，不要把本页当 `[E]`。

## Session format v3

- `SESSION_FORMAT_VERSION = 3` in `packages/core/session/src/types.ts`.
- Catalog: `packages/session/session-format-catalog/src/generated.ts` — `currentVersion: 3`；migrations `[v0→v1, v1→v2, v2→v3]`。
- 新包：`packages/session/session-format-v2-to-v3`。
- v3：`system/message` 是 surface 事件；`EpochHeader` 无 `system` 字段。
- v2→v3：preset id `code` → `ptc`；插入 synthetic system messages。
- 比 3 新的盘拒绝。加普通事件 type **不** bump 版本（`ignorable`）。

## Persistence

- 仍是 `SessionHandle` + JSONL + `SessionWriteLease`。无 `coordinator.ts`。
- `dsh-session-persistence-sqlite` 仍不存在。`session-query-sqlite` / `storage-sqlite` 仍在。

## Default model

- base `agent-default-model`: `provider: deepseek-official`, `model: deepseek-flash`（`packages/bundle/base/cordis.patch.yml`）。
- catalog 同时有 `deepseek-flash`（V41）与 `deepseek-v4-flash`（V4）。
- acp-app 默认仍 `deepseek-v4-flash`。

## Tools / presets

- 新工具 `present`：`packages/fs/tool-present`；wire `present`；append `deliverables/presented`。
- 挂载：standard / ptc / cordis 的 `agent.cordis.yml` 有 `id: present`。minimal **没有**。
- `str_replace_editor`：包在，preset/bundle yml **无挂载**。
- minimal：complete persona + 仅 persistent bash/pwsh。无 compaction、无 fs 工具。
- ptc：`tool-workflow` 仍 `disabled: true`。
- persona：preset `prefix`/`suffix`；bundle system-prompt `personaPrefix`/`personaSuffix`。

## Inbox / agent

- `ReactLoopInbox` 在 `packages/core/agent-loop/src/inbox.ts`。
- `packages/core/agent/src/inbox.ts` 已删除。

## Feedback

- `feedback/message-put`、`feedback/message-delete`、`feedback/record` 在 `known-event-types.ts`。
- message-feedback 不再依赖 `src/spec.ts` 或 storage-domain sidecar。

## Desktop

- `apps/desktop`：Electron，不开监听端口，独占 `$DSH_HOME/profiles/desktop`。
- `apps/cli/src/args.ts` `rejectElectronProfile`：CLI `--profile desktop` 报错。
- `PROFILE_TEMPLATES` 仍只有 acp / web / headless / sdk / sdk-minimal。

## Web-app inserts（fold，不新建页）

- `workspace-files`、`file-upload`、`resources`、`open-in-app` / `ui-open-in-app`、`ui-sidebar-right` / `ui-sidebar-documentpreview` / `ui-sidebar-files`、`ui-dockkit`。

## Inventory

- 产品版本 `0.1.5-rc.2`。
- `packages/**/package.json` **275**（含 7 个 `@fixture/*`）；产品叶 **268**。本轮 +13，无删包。
- 新包 fold：`session-format-v2-to-v3` → session-format；`tool-present` → 新工具页；`package-manifest` → app-boot；`chunked-list` → package-index 一行；`remote-mock` → 不写产品 wiki。
- native：`native/system`；不要把空壳 `native/landlock-run` 当 source。

## Unchanged

- 五 profile / 四 preset / 六 bundle 名字。
- JSONL-only session disk；report 工具包仍删；python runtime 仍 experimental Provider。
- http-proxy / file-upload 路径。
- Node / pnpm engines。
