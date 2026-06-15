---
id: config.v1-core
title: V1 Core Config
status: verified
owner: surface-config-cli
v: v1
kind: surface
tier: T1
schema: grouped-catalog
source:
  - packages/core/src/v1/config/config.ts
  - packages/core/src/v1/config/agent.ts
  - packages/core/src/v1/config/permission.ts
updated: 92c70c9c3
evidence: explicit
---

> `config.v1-core` 描述 V1 `ConfigV1.Info` 的核心顶层字段、agent container、permission shorthand。V1 schema 文件虽然位于 `packages/core/src/v1/config/**`，但它服务的是当前 V1 `packages/opencode/src` runtime；公开的 `opencode.ai/config.json` 仍由 `ConfigV1.Info` 生成。

## 能回答的问题

- V1 顶层 config key 的类型、schema default 和 V2 关系是什么。
- `agent` 与 deprecated `mode` 有何区别。
- V1 `permission` 支持哪些 action key，如何接受 string shorthand。
- `tools` 为什么只是 deprecated compatibility input。

## 顶层 Core Catalog

| key | type/default | 含义 | V1-V2 关系 |
| --- | --- | --- | --- |
| `$schema` | optional string；schema default omitted | JSON schema reference，用于 editor validation。[E: packages/core/src/v1/config/config.ts:33] | V2 仍保留 `$schema`。[E: packages/core/src/config.ts:29] |
| `shell` | optional string；schema default omitted | terminal 和 bash tool 的默认 shell。[E: packages/core/src/v1/config/config.ts:36] | V2 仍保留 `shell`。[E: packages/core/src/config.ts:32] |
| `logLevel` | optional log level；schema default omitted | 日志级别配置。[E: packages/core/src/v1/config/config.ts:37] | V2 config schema 不含 `logLevel`；V2 设计规范标为 remove，因为 logging 从 CLI input 初始化。[E: specs/v2/config.md:31] |
| `watcher.ignore` | optional string array；schema default omitted | filesystem watcher ignore patterns。[E: packages/core/src/v1/config/config.ts:51] | V2 保留 `watcher.ignore`。[E: packages/core/src/config/watcher.ts:5] |
| `snapshot` | optional boolean；说明默认 true | 启用 snapshot tracking；false 时 undo/revert 不记录文件变化。[E: packages/core/src/v1/config/config.ts:52] | V2 改名为 `snapshots`。[E: packages/core/src/config.ts:65] |
| `share` | optional `manual`/`auto`/`disabled` | session sharing 行为。[E: packages/core/src/v1/config/config.ts:57] | V2 仍保留 `share`。[E: packages/core/src/config.ts:46] |
| `autoshare` | optional boolean；deprecated | 旧的自动分享 flag。[E: packages/core/src/v1/config/config.ts:61] | V2 不保留，migration 将 truthy `autoshare` 转成 `share: "auto"`。[E: packages/core/src/v1/config/migrate.ts:43] |
| `autoupdate` | optional boolean 或 `"notify"` | 自动更新或通知。[E: packages/core/src/v1/config/config.ts:64] | V2 仍保留 `autoupdate`。[E: packages/core/src/config.ts:41] |
| `model` | optional string；schema default omitted | 默认 model，格式 `provider/model`。[E: packages/core/src/v1/config/config.ts:74] | V2 仍保留 `model`。[E: packages/core/src/config.ts:35] |
| `small_model` | optional string；schema default omitted | title generation 等小任务 model。[E: packages/core/src/v1/config/config.ts:77] | V2 schema 不含 `small_model`；V2 设计规范标为 remove。[E: specs/v2/config.md:177] |
| `default_agent` | optional string；schema default omitted | 未指定 agent 时的默认 primary agent。[E: packages/core/src/v1/config/config.ts:80] | 当前 V2 code 仍保留 `default_agent`。[E: packages/core/src/config.ts:38] 但 V2 设计规范曾标为 remove，属于规范与当前代码不同步的迁移痕迹。[E: specs/v2/config.md:243] |
| `username` | optional string；schema default omitted | conversation display/telemetry identity override。[E: packages/core/src/v1/config/config.ts:84] | V2 仍保留 `username`。[E: packages/core/src/config.ts:56] |
| `mode` | optional struct/rest；deprecated | 旧的 agent alias，只显式列 `build` 和 `plan`，其余走 rest map。[E: packages/core/src/v1/config/config.ts:87] | V2 不保留顶层 `mode`；migration 把它合并到 `agents` 并强制 `mode: "primary"`。[E: packages/core/src/v1/config/migrate.ts:98] |
| `agent` | optional builtins/rest map | 配置 `plan`、`build`、`general`、`explore`、`title`、`summary`、`compaction` 和 custom agents。[E: packages/core/src/v1/config/config.ts:93] | V2 改名为 `agents`。[E: packages/core/src/config.ts:62] |
| `instructions` | optional string array | additional instruction files/patterns。[E: packages/core/src/v1/config/config.ts:121] | V2 仍保留 `instructions` string array。[E: packages/core/src/config.ts:95] |
| `layout` | optional layout；deprecated | 旧 TUI layout setting，说明写着 always uses stretch layout。[E: packages/core/src/v1/config/config.ts:124] | V2 schema 不含 `layout`；`isV1` 只用它识别 legacy config。[E: packages/core/src/v1/config/migrate.ts:28] |
| `permission` | optional `ConfigPermissionV1.Info` | 全局 tool permission map。[E: packages/core/src/v1/config/config.ts:125] | V2 改名为 `permissions` ordered ruleset。[E: packages/core/src/config.ts:59] |
| `tools` | optional record boolean | deprecated tool enable/disable map。[E: packages/core/src/v1/config/config.ts:126] | V2 不保留；migration 将 boolean map 转成 permission rules。[E: packages/core/src/v1/config/migrate.ts:75] |
| `enterprise.url` | optional string | enterprise URL。[E: packages/core/src/v1/config/config.ts:130] | V2 仍保留 `enterprise.url`。[E: packages/core/src/config.ts:49] |

## V1 Agent Entry Fields

单个 V1 agent entry 的 schema 详表在 `agent.config` 节点；本节点只登记 V1 config catalog 的 agent subkeys。V1 agent schema 接受 `model`、`variant`、`temperature`、`top_p`、`prompt`、deprecated `tools`、`disable`、`description`、`mode`、`hidden`、`options`、`color`、`steps`、deprecated `maxSteps`、`permission`。[E: packages/core/src/v1/config/agent.ts:12] unknown keys 通过 rest schema 接受。[E: packages/core/src/v1/config/agent.ts:40]

## Permission Catalog

V1 permission action effect 只能是 `ask`、`allow`、`deny`。[E: packages/core/src/v1/config/permission.ts:5] 单条 rule 可以写成 effect string，也可以写成 resource-to-effect object。[E: packages/core/src/v1/config/permission.ts:11] 整个 `permission` 如果直接写成 string，会 normalize 成 `{ "*": effect }`。[E: packages/core/src/v1/config/permission.ts:40]

| permission key | type/default | 含义 | V1-V2 关系 |
| --- | --- | --- | --- |
| `read` | rule；schema default omitted | read tool access。[E: packages/core/src/v1/config/permission.ts:19] | V2 rule `action: "read"`。 |
| `edit` | rule；schema default omitted | edit/write/patch-class file mutation access。[E: packages/core/src/v1/config/permission.ts:20] | 只有 deprecated V1 `tools` map 迁移时会把 `write`/`patch` action 规范化为 `edit`；V1 `permission` 的 custom action key 会按原名迁移。[E: packages/core/src/v1/config/migrate.ts:75] [E: packages/core/src/v1/config/migrate.ts:83] [E: packages/core/src/v1/config/migrate.ts:94] |
| `glob` | rule；schema default omitted | glob tool access。[E: packages/core/src/v1/config/permission.ts:21] | V2 rule `action: "glob"`。 |
| `grep` | rule；schema default omitted | grep tool access。[E: packages/core/src/v1/config/permission.ts:22] | V2 rule `action: "grep"`。 |
| `list` | rule；schema default omitted | list tool access。[E: packages/core/src/v1/config/permission.ts:23] | V2 rule `action: "list"`。 |
| `bash` | rule；schema default omitted | bash command access。[E: packages/core/src/v1/config/permission.ts:24] | V2 rule `action: "bash"`。 |
| `task` | rule；schema default omitted | subagent/task access by resource.[E: packages/core/src/v1/config/permission.ts:25] | V2 rule `action: "task"`。 |
| `external_directory` | rule；schema default omitted | external directory resource access。[E: packages/core/src/v1/config/permission.ts:26] | V2 rule `action: "external_directory"`。 |
| `todowrite` | effect；schema default omitted | todo write tool access。[E: packages/core/src/v1/config/permission.ts:27] | V2 rule `action: "todowrite"`。 |
| `question` | effect；schema default omitted | model asking user question access。[E: packages/core/src/v1/config/permission.ts:28] | V2 rule `action: "question"`。 |
| `webfetch` | effect；schema default omitted | web fetch access。[E: packages/core/src/v1/config/permission.ts:29] | V2 rule `action: "webfetch"`。 |
| `websearch` | effect；schema default omitted | web search access。[E: packages/core/src/v1/config/permission.ts:30] | V2 rule `action: "websearch"`。 |
| `lsp` | rule；schema default omitted | LSP tool access。[E: packages/core/src/v1/config/permission.ts:31] | V2 rule `action: "lsp"`。 |
| `doom_loop` | effect；schema default omitted | loop protection action。[E: packages/core/src/v1/config/permission.ts:32] | V2 rule `action: "doom_loop"`。 |
| `skill` | rule；schema default omitted | skill tool/list access。[E: packages/core/src/v1/config/permission.ts:33] | V2 rule `action: "skill"`。 |
| custom key / `*` | rule via rest record | schema accepts any additional permission key。[E: packages/core/src/v1/config/permission.ts:35] | V2 `PermissionSchema.Rule.action` is arbitrary string。[E: packages/core/src/permission/schema.ts:9] |

## Sources

- `packages/core/src/v1/config/config.ts`
- `packages/core/src/v1/config/agent.ts`
- `packages/core/src/v1/config/permission.ts`
- `packages/core/src/v1/config/migrate.ts`
- `packages/core/src/config.ts`
- `packages/core/src/permission/schema.ts`
- `specs/v2/config.md`

## 相关

- `agent.config`
- `config.migration`
- `config.v2-schema`
