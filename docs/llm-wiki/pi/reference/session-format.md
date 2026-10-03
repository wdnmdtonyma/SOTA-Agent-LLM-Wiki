---
id: ref.coding-agent.session-format
title: 会话文件格式(JSONL v3)
kind: reference
tier: T3
pkg: coding-agent
batch: surface
source:
 - packages/coding-agent/src/core/session-manager.ts
 - packages/coding-agent/docs/session-format.md
symbols:
 - SessionHeader
 - SessionEntry
 - SessionMessageEntry
 - CompactionEntry
 - ContextEditEntry
related:
 - subsys.coding-agent.session-manager
 - spine.session-state-model
 - subsys.coding-agent.usage-accounting
evidence: explicit
status: verified
updated: 4c6fb7cfe8
---

> `ref.coding-agent.session-format` 是 pi-coding-agent 会话 JSONL 文件的字段级目录：第一行是 `SessionHeader`，后续每行是带 `id` / `parentId` / `timestamp` 的 append-only tree entry。当前产品格式版本是 v3。权威读写器是 `SessionManager`。

## 能回答的问题

- pi-coding-agent session JSONL 文件第一行和后续行分别是什么 shape?
- JSONL v3 支持哪些 entry `type`，每种 entry 的字段、含义和写入入口是什么?
- v1/v2 legacy session 会怎样迁移到当前 v3?
- `compaction`、`context_edit`、`branch_summary`、`custom`、`custom_message`、`label`、`session_info` 这些非普通消息 entry 如何进入上下文或 UI?
- `ContextEditEntry` 的 `replacement: null` 与 content replacement 分别做什么?
- coding-agent 产品层 `SessionEntry`、`FileEntry`、leaf 内存状态和 JSONL 文件行之间有什么格式边界?
- 新 session 文件何时真正出现在磁盘上?

## 文件外壳

session 文件是 JSON Lines：每一行都是带 `type` 字段的 JSON object；entry 通过 `id` / `parentId` 形成 tree，因此同一个文件能保留 branch 而不改写历史。[E: packages/coding-agent/docs/session-format.md:3] 默认文档位置写作 `~/.pi/agent/sessions/--<path>--/<timestamp>_<session-id>.jsonl`；`<session-id>` 默认是 UUID，也可由 SDK 或 `--session-id` 自定义。[E: packages/coding-agent/docs/session-format.md:11] [E: packages/coding-agent/docs/session-format.md:14] 文档里的 `<path>` 会去掉 leading separator，再把 `/`、`\`、`:` 换成 `-`。[E: packages/coding-agent/docs/session-format.md:14] `SessionManager` 的默认目录编码实现会先 resolve cwd，再生成 `--...--`，并把文件放在 agent dir 的 `sessions/<encoded-cwd>/` 下。[E: packages/coding-agent/src/core/session-manager.ts:589] [E: packages/coding-agent/src/core/session-manager.ts:592] [E: packages/coding-agent/src/core/session-manager.ts:593] 官方文档的源码链接指向 `https://github.com/earendil-works/pi`。[E: packages/coding-agent/docs/session-format.md:34]

当前产品格式版本常量是 `CURRENT_SESSION_VERSION = 3`。[E: packages/coding-agent/src/core/session-manager.ts:41] `SessionHeader` 的字段是 `type: "session"`、可选 `version?: number`、`id`、`timestamp`、`cwd` 和可选 `parentSession`；`version` 可选是为了读取没有 version 的 v1 session。[E: packages/coding-agent/src/core/session-manager.ts:43] [E: packages/coding-agent/src/core/session-manager.ts:45] [E: packages/coding-agent/src/core/session-manager.ts:49] 新 session header 会写入当前 version、session id、ISO timestamp、`SessionManager` 持有的 cwd 和可选 parent session path；构造函数会把传入 cwd 解析后保存到 `this.cwd`。[E: packages/coding-agent/src/core/session-manager.ts:1008] [E: packages/coding-agent/src/core/session-manager.ts:1063] [E: packages/coding-agent/src/core/session-manager.ts:1065] [E: packages/coding-agent/src/core/session-manager.ts:1069]

## Entry catalog

| 实例 | Discriminator / 字段 | 写入入口或来源 | 上下文 / tree 语义 | 源码证据 |
| --- | --- | --- | --- | --- |
| `SessionHeader` | `type: "session"`; `version?: number`; `id`; `timestamp`; `cwd`; `parentSession?` | `newSession()` 生成 header；`forkFrom()` 会生成新 header 并把 `parentSession` 指向 source file。[E: packages/coding-agent/src/core/session-manager.ts:1063] [E: packages/coding-agent/src/core/session-manager.ts:1848] [E: packages/coding-agent/src/core/session-manager.ts:1854] | header 是文件第一行 metadata，不是 `SessionEntry` tree 成员；`FileEntry` 才是 `SessionHeader \| SessionEntry`。[E: packages/coding-agent/docs/session-format.md:66] [E: packages/coding-agent/src/core/session-manager.ts:197] | `packages/coding-agent/src/core/session-manager.ts:43` |
| `SessionEntryBase` | `type: string`; `id: string`; `parentId: string \| null`; `timestamp: string` | 所有产品层 non-header entry 都继承这组 tree identity 字段。[E: packages/coding-agent/src/core/session-manager.ts:57] [E: packages/coding-agent/src/core/session-manager.ts:59] | `parentId: null` 表示 **root**；文档说明 navigation API 可以造出多棵 root，第一条 entry 只是初始 root，不是唯一 root。[E: packages/coding-agent/docs/session-format.md:211] [E: packages/coding-agent/docs/session-format.md:215] | `packages/coding-agent/src/core/session-manager.ts:57` |
| `SessionMessageEntry` | `type: "message"`; `message: AgentMessage` | `appendMessage(message)` 写入 message entry，生成 id、使用当前 `leafId` 作为 `parentId`，再推进 leaf。[E: packages/coding-agent/src/core/session-manager.ts:1204] [E: packages/coding-agent/src/core/session-manager.ts:1208] | `sessionEntryToContextMessages()` 对 `message` entry 直接把 `entry.message` 加入 LLM message list（null content 会补成 `""` 或 `[]`）。[E: packages/coding-agent/src/core/session-manager.ts:439] [E: packages/coding-agent/src/core/session-manager.ts:444] [E: packages/coding-agent/src/core/session-manager.ts:451] 产品文档把嵌入的 `AgentMessage` 写成可带 system sections / toolsAdded，并把 assistant `stopReason` 留给 message-types 目录；本 catalog 不展开整份 AgentMessage。[E: packages/coding-agent/docs/session-format.md:80] [I] | `packages/coding-agent/src/core/session-manager.ts:64` |
| `ThinkingLevelChangeEntry` | `type: "thinking_level_change"`; `thinkingLevel: string` | `appendThinkingLevelChange(thinkingLevel)` 写入当前 branch 上的 thinking level 变更。[E: packages/coding-agent/src/core/session-manager.ts:1217] [E: packages/coding-agent/src/core/session-manager.ts:1223] | context 构建沿当前 path 扫描，遇到该 entry 就把 `thinkingLevel` 更新为 entry 字段值。[E: packages/coding-agent/src/core/session-manager.ts:423] [E: packages/coding-agent/src/core/session-manager.ts:424] | `packages/coding-agent/src/core/session-manager.ts:69` |
| `ModelChangeEntry` | `type: "model_change"`; `provider: string`; `modelId: string` | `appendModelChange(provider, modelId)` 写入 provider/model id 变更。[E: packages/coding-agent/src/core/session-manager.ts:1230] [E: packages/coding-agent/src/core/session-manager.ts:1236] | context 构建沿当前 path 扫描，遇到该 entry 就把 model 设为 `{ provider, modelId }`；assistant message 也会刷新 model snapshot。[E: packages/coding-agent/src/core/session-manager.ts:425] [E: packages/coding-agent/src/core/session-manager.ts:427] | `packages/coding-agent/src/core/session-manager.ts:74` |
| `CompactionEntry<T>` | `type: "compaction"`; `summary`; `firstKeptEntryId: string`; `tokensBefore`; `details?`; `usage?`; `fromHook?`; `systemMessage?` | `appendCompaction(summary, firstKeptEntryId, tokensBefore, details?, fromHook?, usage?)` 的 `firstKeptEntryId` 参数是 `string \| null`：非 null 写入该 id；`null`（retain-none）把 kept boundary 写成 compaction **自己的** id，使投影不保留任何前置 entry。[E: packages/coding-agent/src/core/session-manager.ts:1261] [E: packages/coding-agent/src/core/session-manager.ts:1263] [E: packages/coding-agent/src/core/session-manager.ts:1278] 可选 `systemMessage` 是该边界上的 prompt/tool checkpoint。[E: packages/coding-agent/src/core/session-manager.ts:103] [E: packages/coding-agent/src/core/session-manager.ts:1270] [E: packages/coding-agent/src/core/session-manager.ts:1283] | context 构建仍按最后一个 compaction 与 `firstKeptEntryId` 投影消息；retain-none 时 `firstKeptEntryId === compaction.id`，`buildContextEntries()` 找不到前置 kept 范围，只保留 compaction 自身及其后 entries。[E: packages/coding-agent/src/core/session-manager.ts:94] [E: packages/coding-agent/src/core/session-manager.ts:499] [E: packages/coding-agent/src/core/session-manager.ts:503] [I] retained range 里若还有更旧 compaction（projection index > 0），那条不贡献 checkpoint/summary。[E: packages/coding-agent/src/core/session-manager.ts:562] `usage` 是 accounting metadata，不直接加入 LLM context。[E: packages/coding-agent/src/core/session-manager.ts:99] [I] | `packages/coding-agent/src/core/session-manager.ts:91` |
| `BranchSummaryEntry<T>` | `type: "branch_summary"`; `fromId`; `summary`; `details?`; `usage?`; `fromHook?` | `branchWithSummary(branchFromId, summary, details?, fromHook?, usage?)` 先移动 leaf，再把 summary usage 持久化到新 entry。[E: packages/coding-agent/src/core/session-manager.ts:1600] [E: packages/coding-agent/src/core/session-manager.ts:1611] [E: packages/coding-agent/src/core/session-manager.ts:1620] | context 构建会把有 summary 的 `branch_summary` 转成 branch summary message；usage 留给 session stats/cost breakdown。[E: packages/coding-agent/src/core/session-manager.ts:106] [E: packages/coding-agent/src/core/session-manager.ts:458] [I] | `packages/coding-agent/src/core/session-manager.ts:106` |
| `UsageEntry` | `type: "usage"`; `kind`; `provider`; `model`; `usage`; `note?` | `appendUsage(kind, provider, model, usage, note?)` 写入不参与 LLM context 的 model-attributed usage（例如 cache warming 的 `"cache_warm"`）。[E: packages/coding-agent/src/core/session-manager.ts:80] [E: packages/coding-agent/src/core/session-manager.ts:1244] | `sessionEntryToContextMessages()` 对 `usage` 返回 `[]`，因此它只进 session token/cost totals，不进模型消息。[E: packages/coding-agent/src/core/session-manager.ts:465] [I] | `packages/coding-agent/src/core/session-manager.ts:80` |
| `ContextEditEntry` | `type: "context_edit"`; `targetId`; `replacement: { content } \| null` | `appendContextEdit(targetId, replacement)` 在当前 leaf 后追加一条 branch-local edit。target 必须在 active branch 上，且是 user/assistant/toolResult message 或 `custom_message`。[E: packages/coding-agent/src/core/session-manager.ts:175] [E: packages/coding-agent/src/core/session-manager.ts:1360] [E: packages/coding-agent/src/core/session-manager.ts:1371] [E: packages/coding-agent/src/core/session-manager.ts:1374] assistant / toolResult 的 string replacement 会归一成 `[{ type: "text", text }]`。[E: packages/coding-agent/src/core/session-manager.ts:1382] | **不改 raw history**。`replacement: null` 表示从未来模型 context **省略**该 target（`projectContextEntry` 返回 `[]`）；非 null 只替换 content，保留 role/metadata。同一 target 多条 edit 时，active branch 上最新一条生效。`context_edit` 自身不产生 context message。[E: packages/coding-agent/src/core/session-manager.ts:179] [E: packages/coding-agent/src/core/session-manager.ts:519] [E: packages/coding-agent/src/core/session-manager.ts:523] [E: packages/coding-agent/src/core/session-manager.ts:553] [E: packages/coding-agent/docs/session-format.md:141] | `packages/coding-agent/src/core/session-manager.ts:175` |
| `CustomEntry<T>` | `type: "custom"`; `customType`; `data?` | `appendCustomEntry(customType, data?)` 为 extension 写入自定义持久化状态。[E: packages/coding-agent/src/core/session-manager.ts:1290] [E: packages/coding-agent/src/core/session-manager.ts:1293] | 产品文档说明 `CustomEntry` 不参与 LLM context；`sessionEntryToContextMessages()` 对 `custom` 返回 `[]`。[E: packages/coding-agent/docs/session-format.md:166] [E: packages/coding-agent/src/core/session-manager.ts:465] [I] | `packages/coding-agent/src/core/session-manager.ts:128` |
| `CustomMessageEntry<T>` | `type: "custom_message"`; `customType`; `content`; `details?`; `display` | `appendCustomMessageEntry(customType, content, display, details?)` 写入 extension 注入的 message entry。[E: packages/coding-agent/src/core/session-manager.ts:1339] [E: packages/coding-agent/src/core/session-manager.ts:1346] | context 构建会把 `custom_message` 通过 `createCustomMessage(...)` 转成 LLM/user-visible message；`display` 是否渲染由消息/UI 层解释，不是 JSONL parser 自身的约束。[E: packages/coding-agent/src/core/session-manager.ts:453] [E: packages/coding-agent/src/core/session-manager.ts:455] [I] | `packages/coding-agent/src/core/session-manager.ts:159` |
| `LabelEntry` | `type: "label"`; `targetId`; `label: string \| undefined` | `appendLabelChange(targetId, label)` 校验 target entry 存在后写入 label entry。[E: packages/coding-agent/src/core/session-manager.ts:1441] [E: packages/coding-agent/src/core/session-manager.ts:1442] [E: packages/coding-agent/src/core/session-manager.ts:1450] | label 是普通 tree entry，但索引会把有值 label 存入 `labelsById`，falsy label 会删除 target 的缓存 label；`createBranchedSession()` 抽取 branch 时会过滤 path 内 label entry 并按 resolved label map 重写。[E: packages/coding-agent/src/core/session-manager.ts:1112] [E: packages/coding-agent/src/core/session-manager.ts:1117] [E: packages/coding-agent/src/core/session-manager.ts:1642] [E: packages/coding-agent/src/core/session-manager.ts:1687] | `packages/coding-agent/src/core/session-manager.ts:135` |
| `SessionInfoEntry` | `type: "session_info"`; `name?` | `appendSessionInfo(name)` 会把换行替换为空格并 trim，再写入 session display name entry。[E: packages/coding-agent/src/core/session-manager.ts:1304] [E: packages/coding-agent/src/core/session-manager.ts:1305] [E: packages/coding-agent/src/core/session-manager.ts:1311] | `getSessionName()` 从后往前找最新 `session_info`，空白名会被解释为清除 display name；文档把它描述为 `/name`、`--name`/`-n` 和 extension API 的 session metadata。[E: packages/coding-agent/src/core/session-manager.ts:1318] [E: packages/coding-agent/src/core/session-manager.ts:1324] [E: packages/coding-agent/docs/session-format.md:201] [E: packages/coding-agent/docs/session-format.md:207] | `packages/coding-agent/src/core/session-manager.ts:142` |
| `SessionEntry` union | `SessionMessageEntry \| ThinkingLevelChangeEntry \| ModelChangeEntry \| UsageEntry \| CompactionEntry \| BranchSummaryEntry \| CustomEntry \| CustomMessageEntry \| ContextEditEntry \| LabelEntry \| SessionInfoEntry` | `getEntries()` 返回所有非 header 的 `SessionEntry[]`，并声明 session append-only：entry 不能被修改或删除。[E: packages/coding-agent/src/core/session-manager.ts:183] [E: packages/coding-agent/src/core/session-manager.ts:192] [E: packages/coding-agent/src/core/session-manager.ts:1520] | 产品层 union 包含上述十一类 non-header entry；`leaf` 是 `SessionManager` 内存字段 `leafId`，不是 `SessionEntry` 成员。[E: packages/coding-agent/src/core/session-manager.ts:183] [E: packages/coding-agent/src/core/session-manager.ts:998] [I] | `packages/coding-agent/src/core/session-manager.ts:183` |
| `FileEntry` union | `SessionHeader \| SessionEntry` | `parseSessionEntries(content)` 和 `loadEntriesFromFile(filePath)` 读出的数组都使用 `FileEntry[]`。[E: packages/coding-agent/src/core/session-manager.ts:197] [E: packages/coding-agent/src/core/session-manager.ts:355] [E: packages/coding-agent/src/core/session-manager.ts:627] | `loadEntriesFromFile()` 会跳过 malformed JSON line；但返回前要求第一条 parsed entry 是 `type: "session"` 且有 string id，否则把文件视为无有效 entries。[E: packages/coding-agent/src/core/session-manager.ts:619] [E: packages/coding-agent/src/core/session-manager.ts:664] [E: packages/coding-agent/src/core/session-manager.ts:665] | `packages/coding-agent/src/core/session-manager.ts:197` |

## 版本与兼容

文档声明 v1 是 legacy linear entry sequence，v2 增加 `id` / `parentId` tree linking，v3 把 `hookMessage` role 改名为 `custom`；既有 session load 时会自动迁移到 v3。[E: packages/coding-agent/docs/session-format.md:26] [E: packages/coding-agent/docs/session-format.md:27] [E: packages/coding-agent/docs/session-format.md:28] [E: packages/coding-agent/docs/session-format.md:30]

`migrateToCurrentVersion(entries)` 用 header version 或默认 `1` 判定迁移起点；小于 2 跑 v1→v2，小于 3 跑 v2→v3。[E: packages/coding-agent/src/core/session-manager.ts:337] [E: packages/coding-agent/src/core/session-manager.ts:339] [E: packages/coding-agent/src/core/session-manager.ts:343] [E: packages/coding-agent/src/core/session-manager.ts:344] v1→v2 会给每个 non-header entry 生成 id、把 `parentId` 串到前一个 entry id，并把 legacy `firstKeptEntryIndex` 转成 `firstKeptEntryId` 后删除旧字段。[E: packages/coding-agent/src/core/session-manager.ts:287] [E: packages/coding-agent/src/core/session-manager.ts:297] [E: packages/coding-agent/src/core/session-manager.ts:304] [E: packages/coding-agent/src/core/session-manager.ts:309] v2→v3 会把 message role `hookMessage` 改写为 `custom`。[E: packages/coding-agent/src/core/session-manager.ts:316] [E: packages/coding-agent/src/core/session-manager.ts:326] [E: packages/coding-agent/src/core/session-manager.ts:327]

## 读写边界

`SessionManager` 维护 `fileEntries`、`byId`、`labelsById`、`labelTimestampsById` 和 `leafId`；这些内存索引来自 JSONL 文件，但不是单独的 JSONL 行格式字段。[E: packages/coding-agent/src/core/session-manager.ts:994] [E: packages/coding-agent/src/core/session-manager.ts:998] [I] `_appendEntry(entry)` 把 entry push 到 `fileEntries`，写入 `byId`，把 `leafId` 推进到该 entry id，再调用 `_persist(entry)`。[E: packages/coding-agent/src/core/session-manager.ts:1191] [E: packages/coding-agent/src/core/session-manager.ts:1194] [E: packages/coding-agent/src/core/session-manager.ts:1195]

持久化不是每个新 session header 都立即写盘：`_persist()` 在 `_hasConversation()` 为 false 且文件尚未 flush 时直接 return。`_hasConversation()` 只在 `fileEntries` 里出现 `type: "message"` 且 role 为 `user` 或 `assistant` 时为 true。首次满足后用 `"wx"` 写出全部 `fileEntries`；已经 flush 的 session 后续只 append 新行。[E: packages/coding-agent/src/core/session-manager.ts:1166] [E: packages/coding-agent/src/core/session-manager.ts:1168] [E: packages/coding-agent/src/core/session-manager.ts:1176] [E: packages/coding-agent/src/core/session-manager.ts:1177] [E: packages/coding-agent/src/core/session-manager.ts:1187] 因此 `getSessionFile()` 返回路径不等同于该路径已经存在于磁盘。[E: packages/coding-agent/src/core/session-manager.ts:1156] [I]

`buildSessionProjection()` 先按最新 compaction 选出 context entries，再把每个 `context_edit` 按 `targetId` 收入 map（后者覆盖前者），投影时 `replacement === null` 产出空 messages、content replacement 只改 content。`buildSessionContext()` 是该投影的 `{ messages, thinkingLevel, model }` 视图。[E: packages/coding-agent/src/core/session-manager.ts:476] [E: packages/coding-agent/src/core/session-manager.ts:551] [E: packages/coding-agent/src/core/session-manager.ts:553] [E: packages/coding-agent/src/core/session-manager.ts:519] [E: packages/coding-agent/src/core/session-manager.ts:576]

## 产品层格式边界

JSONL 文件类型为 `FileEntry = SessionHeader | SessionEntry`，而当前 leaf 由 `SessionManager.leafId` 内存字段保存；`branch()` / `resetLeaf()` 只移动该字段，后续 append 用当前 `leafId` 作为 `parentId`。[E: packages/coding-agent/src/core/session-manager.ts:197] [E: packages/coding-agent/src/core/session-manager.ts:998] [E: packages/coding-agent/src/core/session-manager.ts:1579] [E: packages/coding-agent/src/core/session-manager.ts:1591] [E: packages/coding-agent/src/core/session-manager.ts:1208] [I]

产品 CLI / RPC / `AgentSession` 的磁盘会话就是这份 v3 JSONL。`SessionManager` 是 canonical 读写器；本 catalog 不描述其它包的 session 文件格式。[I]

## 关系边界

`subsys.coding-agent.session-manager` 解释 `SessionManager` 的 create/open/list/fork/branch 操作和延迟落盘；本节点只把 JSONL 文件头、entry variant、迁移字段和持久化边界做字段目录。[I]

`spine.session-state-model` 说明产品 `SessionManager` JSONL 与 durable session / 进程内 `AgentState.messages` 分层；本节点不展开那两套类型。[I]

## Sources

- packages/coding-agent/src/core/session-manager.ts
- packages/coding-agent/docs/session-format.md

## 相关

- [subsys.coding-agent.session-manager](../subsystems/coding-agent/session-manager.md): coding-agent 产品层会话管理器的读取、迁移、append、branch、list 行为。
- [spine.session-state-model](../spine/session-state-model.md): 产品 SessionManager、durable session 与进程内 AgentState 的分层。
- [subsys.coding-agent.usage-accounting](../subsystems/coding-agent/usage-accounting.md): compaction/branch-summary/`usage` entry 的持久化与汇总。
