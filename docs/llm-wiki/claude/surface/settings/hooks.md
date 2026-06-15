---
id: setting.hooks
title: Settings hooks catalog
kind: setting
tier: T1
source: [utils/settings/types.ts, utils/settings/schemaOutput.ts, utils/settings/constants.ts]
symbols: [SettingsSchema, HooksSchema]
related: [subsys.config-settings]
evidence: explicit
status: verified
updated: 2026-06-14
---

> `setting.hooks` catalog 覆盖 `settings.json` 中注册 hook commands、限制 hook execution 与约束 HTTP hooks 的配置键。

## 能回答的问题

- `hooks` 在 settings schema 中使用什么 schema?
- 如何禁用所有 hooks?
- managed settings 如何限制用户/project/local hooks?
- HTTP hooks 的 URL allowlist 与 env var allowlist 在哪里配置?
- `statusLine` 和 hook disable 开关的关系是什么?

## 范围与证据

`types.ts` 从 centralized hook schema re-export `HooksSchema` 与 hook 相关类型,用于 backward compatibility。[E: utils/settings/types.ts:14] `SettingsSchema` 将 `hooks` 作为 `HooksSchema()` optional field 接入。[E: utils/settings/types.ts:435] [E: utils/settings/types.ts:436] JSON Schema 输出由 `schemaOutput.ts` 对同一个 `SettingsSchema` 执行 `toJSONSchema`。[E: utils/settings/schemaOutput.ts:6] settings source catalog 包含 user/project/local/flag/policy 五类 source。[E: utils/settings/constants.ts:9] [E: utils/settings/constants.ts:12] [E: utils/settings/constants.ts:15] [E: utils/settings/constants.ts:18] [E: utils/settings/constants.ts:21]

scope 标签: `schema-wide` 表示该 key 是 `SettingsSchema` 接受的顶层 key;`managed/policy intended` 表示 description 明确把该 key 的约束绑定到 managed settings;`arrays-merge` 表示 description 明确声明 arrays merge across settings sources。

| key | 类型 | 默认 | 含义 | scope |
|---|---|---|---|---|
| `hooks` | `HooksSchema()` object [E: utils/settings/types.ts:435] | 未设置; `.optional()` [E: utils/settings/types.ts:436] | Custom commands to run before/after tool executions。[E: utils/settings/types.ts:437] | schema-wide |
| `disableAllHooks` | boolean [E: utils/settings/types.ts:460] | 未设置; `.optional()` [E: utils/settings/types.ts:461] | Disable all hooks and statusLine execution。[E: utils/settings/types.ts:462] | schema-wide |
| `allowManagedHooksOnly` | boolean [E: utils/settings/types.ts:473] | 未设置; `.optional()` [E: utils/settings/types.ts:474] | 当 true 且设置于 managed settings 时,只运行 managed settings 中的 hooks。[E: utils/settings/types.ts:476] | managed/policy intended |
| `allowedHttpHookUrls` | `string[]` [E: utils/settings/types.ts:481] | undefined 时允许所有 URL; empty array 时不允许 HTTP hooks [E: utils/settings/types.ts:487] | HTTP hooks 可访问的 URL pattern allowlist,支持 `*` wildcard。[E: utils/settings/types.ts:484] | arrays-merge across settings sources [E: utils/settings/types.ts:488] |
| `httpHookAllowedEnvVars` | `string[]` [E: utils/settings/types.ts:492] | undefined 时没有 restriction [E: utils/settings/types.ts:497] | HTTP hooks 可插入到 headers 的 environment variable names allowlist。[E: utils/settings/types.ts:495] | arrays-merge across settings sources [E: utils/settings/types.ts:498] |
| `statusLine` | object `{ type: "command", command: string, padding?: number }` [E: utils/settings/types.ts:551] [E: utils/settings/types.ts:552] [E: utils/settings/types.ts:553] [E: utils/settings/types.ts:554] | 未设置; `.optional()` [E: utils/settings/types.ts:556] | Custom status line display configuration。[E: utils/settings/types.ts:557] | schema-wide; execution is disabled by `disableAllHooks` [E: utils/settings/types.ts:462] |

## Sources

- `utils/settings/types.ts`
- `utils/settings/schemaOutput.ts`
- `utils/settings/constants.ts`

## 相关

- [配置与设置子系统](../../subsystems/config-settings.md)
