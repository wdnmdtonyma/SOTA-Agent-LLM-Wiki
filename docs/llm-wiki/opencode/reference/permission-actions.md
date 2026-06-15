---
id: ref.permission-actions
title: 权限 action catalog(V1 keys↔V2 actions)
kind: reference
tier: T3
v: shared
source:
  - packages/core/src/v1/config/permission.ts
  - packages/opencode/src/permission/index.ts
  - packages/core/src/permission.ts
  - packages/core/src/permission/schema.ts
  - packages/core/src/permission/saved.ts
  - packages/core/src/tool/builtins.ts
  - packages/core/src/plugin/agent.ts
status: verified
symbols:
  - PermissionConfig.Rule
  - Permission.evaluate
  - Permission.assert
  - Permission.Reply
  - PermissionSaved.Info
evidence: explicit
updated: 92c70c9c3
---

> 这份节点是给检索 agent 用的权限 action 逐实例总账：V1 写的是 config key 与 runtime `permission` 名称，V2 写的是 `action/resources/save/effect/reply` 词汇。

## 能回答的问题

- V1 `permission` config 支持哪些 key，每个 key 对应哪个工具或守卫？
- V2 `Permission.assert` 的 `action`、`resources`、`save` 与 `effect` 如何组合？
- `allow`、`deny`、`ask`、`once`、`always`、`reject` 分别在哪一代出现，语义边界是什么？
- 哪些名字容易误解，例如 V2 `write` tool 仍走 `edit` action，V1 `message-v2.ts` 不是 V2 session core？

## V1

### V1 权限词汇

V1 config 的 action 字面量只有 `ask`、`allow`、`deny`；config schema 把这三个字符串定义成 `Action`，`Rule` 是 action 字符串或 pattern 到 action 的对象。[E: packages/core/src/v1/config/permission.ts:5][E: packages/core/src/v1/config/permission.ts:8][E: packages/core/src/v1/config/permission.ts:11] `read/edit/glob/grep/list/bash/task/external_directory/lsp/skill` 等 key 使用 `Rule`，而 `todowrite/question/webfetch/websearch/doom_loop` 只接受 `Action`。[E: packages/core/src/v1/config/permission.ts:19][E: packages/core/src/v1/config/permission.ts:27][E: packages/core/src/v1/config/permission.ts:28][E: packages/core/src/v1/config/permission.ts:29][E: packages/core/src/v1/config/permission.ts:30][E: packages/core/src/v1/config/permission.ts:32][E: packages/core/src/v1/config/permission.ts:33] V1 runtime 的 `Rule` 是三元组：`permission`、`pattern`、`action`，其中 `permission` 是工具或守卫使用的权限名，`pattern` 是 wildcard 匹配用的资源模式，`action` 仍是 `ask|allow|deny`。[E: packages/core/src/v1/permission.ts:19][E: packages/core/src/v1/permission.ts:20][E: packages/core/src/v1/permission.ts:21]

V1 `Permission.evaluate` 对 rulesets 使用 `findLast`，因此后出现的匹配 rule 覆盖先出现的 rule；没有匹配时默认返回 `ask`。[E: packages/opencode/src/permission/index.ts:43][E: packages/opencode/src/permission/index.ts:44] `Permission.ask` 遇到 `deny` 会直接失败，遇到 `allow` 会继续处理下一条 pattern，只有需要人工决策时才发布 `permission.asked` 并等待 reply。[E: packages/opencode/src/permission/index.ts:86][E: packages/opencode/src/permission/index.ts:91][E: packages/opencode/src/permission/index.ts:111][E: packages/opencode/src/permission/index.ts:113]

V1 reply 只有 `once`、`always`、`reject` 三种；`reject` 会拒绝同一 session 内所有 pending 请求，`always` 会把本次批准转成 `action: "allow"` 的 rules 追加回 approved ruleset。[E: packages/core/src/v1/permission.ts:42][E: packages/opencode/src/permission/index.ts:140][E: packages/opencode/src/permission/index.ts:141][E: packages/opencode/src/permission/index.ts:148][E: packages/opencode/src/permission/index.ts:156][E: packages/opencode/src/permission/index.ts:160]

### V1 config key catalog

| V1 permission key | 默认 schema 位置 | 运行时用途 | 备注 |
|---|---:|---|---|
| `read` | [E: packages/core/src/v1/config/permission.ts:19] | schema 声明的稳定 key。 | 运行时由读文件工具消费。[I] |
| `edit` | [E: packages/core/src/v1/config/permission.ts:20] | schema 声明的稳定 key；禁用工具映射把 `write` 和 `apply_patch` 转成 `edit`。[E: packages/opencode/src/permission/index.ts:216][E: packages/opencode/src/permission/index.ts:219] | V1 的用户配置表面可写 `edit`。 |
| `glob` | [E: packages/core/src/v1/config/permission.ts:21] | schema 声明的稳定 key。 | 运行时由 glob 工具消费。[I] |
| `grep` | [E: packages/core/src/v1/config/permission.ts:22] | schema 声明的稳定 key。 | 运行时由 grep 工具消费。[I] |
| `list` | [E: packages/core/src/v1/config/permission.ts:23] | schema 声明的稳定 key。 | 运行时由目录 listing 相关路径消费。[I] |
| `bash` | [E: packages/core/src/v1/config/permission.ts:24] | schema 声明的稳定 key。 | V1 shell 审批还使用 bash arity 表做命令前缀归一化。[I] |
| `task` | [E: packages/core/src/v1/config/permission.ts:25] | schema 声明的稳定 key。 | V2 builtins 尚未装配 task。[E: packages/core/src/tool/builtins.ts:31] |
| `external_directory` | [E: packages/core/src/v1/config/permission.ts:26] | schema 声明的稳定 key。 | V2 也保留这个 action。[E: packages/core/src/location-mutation.ts:142] |
| `todowrite` | [E: packages/core/src/v1/config/permission.ts:27] | schema 声明的稳定 key。 | V2 内置 general agent 默认 deny。[E: packages/core/src/plugin/agent.ts:161] |
| `question` | [E: packages/core/src/v1/config/permission.ts:28] | schema 声明的稳定 key。 | V2 内置 build/plan agent 默认 allow。[E: packages/core/src/plugin/agent.ts:132][E: packages/core/src/plugin/agent.ts:143] |
| `webfetch` | [E: packages/core/src/v1/config/permission.ts:29] | schema 声明的稳定 key。 | V2 也有同名 action。[E: packages/core/src/tool/webfetch.ts:148] |
| `websearch` | [E: packages/core/src/v1/config/permission.ts:30] | schema 声明的稳定 key。 | V1 是否装配还受 provider/runtime flag 影响。[I] |
| `lsp` | [E: packages/core/src/v1/config/permission.ts:31] | schema 声明的稳定 key。 | V1 experimental LSP tool；V2 builtins TODO 里仍列为 remaining。[E: packages/core/src/tool/builtins.ts:31] |
| `doom_loop` | [E: packages/core/src/v1/config/permission.ts:32] | V1 config 保留 key。 | 源码只在 permission config schema 中列出，运行语义需按具体调用点再核。[I] |
| `skill` | [E: packages/core/src/v1/config/permission.ts:33] | skill 工具权限。 | V2 skill tool 也用同名 action。[E: packages/core/src/tool/skill.ts:79] |
| `*` | [E: packages/core/src/v1/config/permission.ts:41] | 顶层字符串形式会被 normalize 成 `{ "*": input }`。 | 这是 pattern wildcard，不是独立工具。 |

V1 config schema 对未知 permission key 还开放了 `Schema.Record({ key: Schema.String, value: Rule })`，因此 loader 不会只接受上表 key；不过逐实例 catalog 里的稳定键应以上表为准。[E: packages/core/src/v1/config/permission.ts:35]

## V2

### V2 权限词汇

V2 schema 仍使用 `allow|deny|ask` 三个 `effect` 字面量，但 rule 字段变成 `action/resource/effect`。[E: packages/core/src/permission/schema.ts:5][E: packages/core/src/permission/schema.ts:9][E: packages/core/src/permission/schema.ts:10][E: packages/core/src/permission/schema.ts:11] V2 请求字段是 `sessionID`、`action`、`resources`、可选 `save`、可选 `metadata` 与 `source`，所以 V2 权限判断是“一个 action 对多个 resource 取聚合 effect”。[E: packages/core/src/permission.ts:37][E: packages/core/src/permission.ts:38][E: packages/core/src/permission.ts:39][E: packages/core/src/permission.ts:40][E: packages/core/src/permission.ts:41][E: packages/core/src/permission.ts:42][E: packages/core/src/permission.ts:185][E: packages/core/src/permission.ts:186]

V2 reply 仍是 `once|always|reject`；`always` 不保存整条 request，而是把 request 中的 `save` 列表逐项保存为 `action+resource`，后续再以 `effect: "allow"` 的 saved rules 参与评估。[E: packages/core/src/permission.ts:51][E: packages/core/src/permission.ts:275][E: packages/core/src/permission.ts:276][E: packages/core/src/permission.ts:279][E: packages/core/src/permission/saved.ts:67][E: packages/core/src/permission/saved.ts:70][E: packages/core/src/permission/saved.ts:71][E: packages/core/src/permission.ts:157][E: packages/core/src/permission.ts:159] V2 `evaluateInput` 先取 agent config 权限，再取数据库保存权限；聚合规则是任一 `deny` 优先，其次任一 `ask`，否则为 `allow`。[E: packages/core/src/permission.ts:182][E: packages/core/src/permission.ts:184][E: packages/core/src/permission.ts:186]

V2 permission request 会发布 `permission.v2.asked` 和 `permission.v2.replied` 事件，request ID 使用 `per_` 前缀。[E: packages/core/src/permission.ts:23][E: packages/core/src/permission.ts:75][E: packages/core/src/permission.ts:77]

### V2 action catalog

| V2 action | 产生者 | `resources` | `save` | 默认/门控语义 |
|---|---|---|---|---|
| `bash` | Bash tool。[E: packages/core/src/tool/bash.ts:144] | shell command 字符串。[E: packages/core/src/tool/bash.ts:145] | shell command 字符串。[E: packages/core/src/tool/bash.ts:146] | tool name 就是 `bash`。[E: packages/core/src/tool/bash.ts:16] |
| `edit` | Edit tool。[E: packages/core/src/tool/edit.ts:152] | 待编辑文件路径。[E: packages/core/src/tool/edit.ts:153] | `"*"`。[E: packages/core/src/tool/edit.ts:154] | Edit tool name 是 `edit`。[E: packages/core/src/tool/edit.ts:18] |
| `edit` | Write tool。[E: packages/core/src/tool/write.ts:78] | 写入目标文件路径。[E: packages/core/src/tool/write.ts:79] | `"*"`。[E: packages/core/src/tool/write.ts:80] | 命名陷阱：V2 `write` tool 的 permission action 不是 `write`，而是 `edit`。[E: packages/core/src/tool/write.ts:17] |
| `edit` | ApplyPatch tool。[E: packages/core/src/tool/apply-patch.ts:104] | patch 影响的文件路径集合。[E: packages/core/src/tool/apply-patch.ts:105] | `"*"`。[E: packages/core/src/tool/apply-patch.ts:106] | 命名陷阱：V2 `apply_patch` tool 的 permission action 也是 `edit`。[E: packages/core/src/tool/apply-patch.ts:13] |
| `external_directory` | Location mutation helper | `resolve` 在外部路径时返回 `Target.externalDirectory`，helper 再把它映射为 permission request 片段。[E: packages/core/src/location-mutation.ts:37][E: packages/core/src/location-mutation.ts:40][E: packages/core/src/location-mutation.ts:140] | workspace 外部路径。[E: packages/core/src/location-mutation.ts:136][E: packages/core/src/location-mutation.ts:145] | action/resource/save 都来自 `externalDirectory` 对象。[E: packages/core/src/location-mutation.ts:142][E: packages/core/src/location-mutation.ts:144][E: packages/core/src/location-mutation.ts:145] |
| `glob` | Glob tool。[E: packages/core/src/tool/glob.ts:61] | glob pattern。[E: packages/core/src/tool/glob.ts:62] | `"*"`。[E: packages/core/src/tool/glob.ts:63] | 搜索类 action。 |
| `grep` | Grep tool。[E: packages/core/src/tool/grep.ts:80] | grep pattern。[E: packages/core/src/tool/grep.ts:81] | `"*"`。[E: packages/core/src/tool/grep.ts:82] | 搜索类 action。 |
| `question` | Question tool。[E: packages/core/src/tool/question.ts:63] | `"*"`。[E: packages/core/src/tool/question.ts:64] | assert object 未设置 `save`。[E: packages/core/src/tool/question.ts:62][E: packages/core/src/tool/question.ts:67] | build/plan 默认 allow question。[E: packages/core/src/plugin/agent.ts:132][E: packages/core/src/plugin/agent.ts:143] |
| `read` | Read tool。[E: packages/core/src/tool/read.ts:68] | 目标文件路径。[E: packages/core/src/tool/read.ts:69] | `"*"`。[E: packages/core/src/tool/read.ts:70] | 默认 agent 允许 read，但 `.env` 与 `.env.*` ask，`.env.example` allow。[E: packages/core/src/plugin/agent.ts:119][E: packages/core/src/plugin/agent.ts:120][E: packages/core/src/plugin/agent.ts:122] |
| `skill` | Skill tool。[E: packages/core/src/tool/skill.ts:79] | skill 名称。[E: packages/core/src/tool/skill.ts:80] | skill 名称。[E: packages/core/src/tool/skill.ts:81] | Skill tool name 是 `skill`。 |
| `todowrite` | TodoWrite tool。[E: packages/core/src/tool/todowrite.ts:40] | `"*"`。[E: packages/core/src/tool/todowrite.ts:41] | `"*"`。[E: packages/core/src/tool/todowrite.ts:42] | general agent 默认 deny todowrite。[E: packages/core/src/plugin/agent.ts:161] |
| `webfetch` | WebFetch tool。[E: packages/core/src/tool/webfetch.ts:148] | URL。[E: packages/core/src/tool/webfetch.ts:149] | `"*"`。[E: packages/core/src/tool/webfetch.ts:150] | explore agent 默认 allow webfetch。[E: packages/core/src/plugin/agent.ts:176] |
| `websearch` | WebSearch tool。[E: packages/core/src/tool/websearch.ts:202] | query 字符串。[E: packages/core/src/tool/websearch.ts:203] | `"*"`。[E: packages/core/src/tool/websearch.ts:204] | explore agent 默认 allow websearch。[E: packages/core/src/plugin/agent.ts:177] |
| `plan_enter` | Agent permission rule | `"*"`。[E: packages/core/src/plugin/agent.ts:133] | 不适用。 | build agent 默认 allow plan_enter。[E: packages/core/src/plugin/agent.ts:133] |
| `plan_exit` | Agent permission rule | `"*"`。[E: packages/core/src/plugin/agent.ts:144] | 不适用。 | plan agent 默认 allow plan_exit。[E: packages/core/src/plugin/agent.ts:144] |
| `*` | Agent permission rule | `"*"`。[E: packages/core/src/plugin/agent.ts:114] | 不适用。 | 默认 rules 先 allow all，再叠加更具体规则；explore/compaction/title/summary 也用 deny-all 基线。[E: packages/core/src/plugin/agent.ts:173][E: packages/core/src/plugin/agent.ts:189][E: packages/core/src/plugin/agent.ts:196][E: packages/core/src/plugin/agent.ts:203] |

V2 builtins layer 当前装配 `apply_patch`、`bash`、`edit`、`glob`、`grep`、`question`、`read`、`skill`、`todowrite`、`webfetch`、`websearch`、`write`；源码 TODO 同时把 `task`、`LSP`、`repo_clone`、`repo_overview`、`plan_exit` 和 Rune/code mode 列为 remaining，因此不要把 V1 config key `task/lsp/list` 误认为已经是 V2 built-in action。[E: packages/core/src/tool/builtins.ts:31][E: packages/core/src/tool/builtins.ts:31][E: packages/core/src/tool/builtins.ts:32][E: packages/core/src/tool/builtins.ts:43]

## V1/V2 差异速查

| 维度 | V1 | V2 |
|---|---|---|
| rule 字段 | `permission + pattern + action`。[E: packages/core/src/v1/permission.ts:19][E: packages/core/src/v1/permission.ts:20][E: packages/core/src/v1/permission.ts:21] | `action + resource + effect`。[E: packages/core/src/permission/schema.ts:9][E: packages/core/src/permission/schema.ts:10][E: packages/core/src/permission/schema.ts:11] |
| 默认结果 | 无匹配时 `ask`。[E: packages/opencode/src/permission/index.ts:44] | 无匹配时 `ask`。[E: packages/core/src/permission.ts:109] |
| 批量资源 | `Permission.ask` 接受 `patterns` 并逐个 evaluate。[E: packages/core/src/v1/permission.ts:32][E: packages/opencode/src/permission/index.ts:83] | request 内置 `resources: string[]`。[E: packages/core/src/permission.ts:39] |
| 持久允许 | `always` 追加 approved ruleset。[E: packages/opencode/src/permission/index.ts:156][E: packages/opencode/src/permission/index.ts:160] | `always` 写入 saved permission 表。[E: packages/core/src/permission.ts:275][E: packages/core/src/permission/saved.ts:70] |
| 保存粒度 | pattern rule。[E: packages/core/src/v1/permission.ts:20] | `action + resource`，数据库有唯一索引。[E: packages/core/src/permission/sql.ts:15][E: packages/core/src/permission/sql.ts:19] |
| 事件名 | `permission.asked` / `permission.replied`。[E: packages/opencode/src/permission/index.ts:12][E: packages/opencode/src/permission/index.ts:14] | `permission.v2.asked` / `permission.v2.replied`。[E: packages/core/src/permission.ts:75][E: packages/core/src/permission.ts:77] |

## 设计动机与坑位

- V2 把 permission 名称改成 action/resource/effect，是为了让一个请求可以携带多个 resource 并在 `evaluateInput` 中统一折叠为单个 effect；`write`、`edit`、`apply_patch` 都复用 `edit` action 是工具层的事实。[E: packages/core/src/permission.ts:38][E: packages/core/src/permission.ts:185][E: packages/core/src/permission.ts:186][E: packages/core/src/tool/edit.ts:152][E: packages/core/src/tool/write.ts:78][E: packages/core/src/tool/apply-patch.ts:104][I]
- `packages/core/src/connector.ts` 是 V2 本地凭据注册表，不是云连接器；权限保存表的 `psv_` ID 和 connector/credential 的 ID 不应混淆。[I]
- `packages/opencode/src/session/message-v2.ts` 属于 V1 与 AI SDK 消息转换层，不是本节点所说的 V2 permission/event-sourced session core；该文件直接 import V1 `Session` 与 AI SDK `convertToModelMessages`。[E: packages/opencode/src/session/message-v2.ts:3][E: packages/opencode/src/session/message-v2.ts:23]

## Sources

- `packages/core/src/v1/config/permission.ts`
- `packages/core/src/v1/permission.ts`
- `packages/opencode/src/permission/index.ts`
- `packages/core/src/permission.ts`
- `packages/core/src/permission/schema.ts`
- `packages/core/src/permission/saved.ts`
- `packages/core/src/permission/sql.ts`
- `packages/core/src/tool/builtins.ts`
- `packages/core/src/plugin/agent.ts`

## 相关

- `execution.permissions-v1`
- `execution.permissions-v2`
- `ref.config-keys`
- `ref.events`
