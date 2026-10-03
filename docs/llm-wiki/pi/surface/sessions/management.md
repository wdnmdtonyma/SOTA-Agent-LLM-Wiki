---
id: surface.sessions.management
title: 会话管理(fork/tree/clone/resume)
kind: surface
tier: T1
pkg: coding-agent
source:
 - packages/coding-agent/src/core/session-manager.ts
 - packages/coding-agent/src/core/session-export.ts
 - packages/coding-agent/src/modes/interactive/session-share.ts
 - packages/coding-agent/docs/sessions.md
 - packages/coding-agent/src/cli/session-picker.ts
 - packages/coding-agent/test/export-jsonl-share.test.ts
 - packages/coding-agent/CHANGELOG.md
symbols:
 - SessionManager
 - fork
 - clone
 - navigateTree
 - exportSessionToJsonl
 - exportSessionForShare
 - shareSession
 - ContextEditEntry
 - appendContextEdit
related:
 - spine.session-state-model
 - subsys.coding-agent.session-manager
 - ref.coding-agent.session-format
 - subsys.coding-agent.usage-accounting
evidence: explicit
status: verified
updated: 4c6fb7cfe8
---

> 会话管理面是 pi-coding-agent 暴露给用户的 session lifecycle：自动保存 JSONL 会话、浏览并恢复历史会话、在同一 session tree 内移动 active leaf，以及把已有路径复制到新的 session 文件继续工作。磁盘权威是 `SessionManager`。

## 能回答的问题

- `pi --continue`、`pi --resume`、`--session <path|id>`、`--fork <path|id>`、`--no-session`、`--name` 在用户文档中分别代表什么入口?
- `/resume` 的 picker 能做哪些用户可见操作?
- `/tree`、`/fork`、`/clone` 的用户语义差异是什么：同一文件内继续，还是新文件继续?
- `/share` 与 `/export` 分别写出什么? Radius 与 gh gist 谁先谁后?
- `exportSessionForShare()` 为什么要追加 `customType: "pi.share"`?
- `SessionManager` 如何用 `id` / `parentId` / `leafId` 表达树和 active branch?
- 新建 session、branched session、cross-project fork 如何记录 `parentSession`?
- 新 session 文件为什么在第一条 user/assistant 消息之前不落盘?
- `ContextEditEntry` 怎样改未来 provider context 而不改 raw history?
- session display name 在文件里如何持久化和读取?

## 用户入口

用户文档把 session 存储描述为自动保存（除非 `--no-session`），默认按 working directory 组织到 `~/.pi/agent/sessions/`。[E: packages/coding-agent/docs/sessions.md:7] [E: packages/coding-agent/docs/sessions.md:50] 启动入口：`pi --continue` 打开当前 cwd 最近 session，`pi --resume` 打开 session picker。[E: packages/coding-agent/docs/sessions.md:10] [E: packages/coding-agent/docs/sessions.md:14] 交互里 `/resume` 打开同一个 picker，`/new` 开始新 session。[E: packages/coding-agent/docs/sessions.md:14] `/name` 或 `--name` 设置 display name；`/session` 用来核对当前 session file、ID、message count、token usage 和 cost。[E: packages/coding-agent/docs/sessions.md:16] `--session` 接受已知 path 或 ID；`--fork` 在进入 interactive mode 之前从已有 session 创建新 session。[E: packages/coding-agent/docs/sessions.md:54] `--no-session` 是 ephemeral run，退出后不能 resume。[E: packages/coding-agent/docs/sessions.md:52] 另可用 `--session-dir`、`PI_CODING_AGENT_SESSION_DIR` 或 `sessionDir` setting 改存储位置，CLI 选项优先。[E: packages/coding-agent/docs/sessions.md:50]

交互命令表把 `/tree`、`/fork`、`/clone` 列为 branch 动作：`/tree` 在当前 session file 内移动，`/fork` 从 earlier user message 创建新 session，`/clone` 把 active branch 复制到新 session。[E: packages/coding-agent/docs/sessions.md:26] [E: packages/coding-agent/docs/sessions.md:27] [E: packages/coding-agent/docs/sessions.md:28] `/export` 写出 HTML 或 JSONL；`/share` 上传并给出 viewer link，有 Radius authentication 时走 Radius artifact，否则 private GitHub gist。[E: packages/coding-agent/docs/sessions.md:58] CLI 参数互斥、`--session` path-vs-id 解析和 slash command handler dispatch 不在本节点 index source 内，因此这里只记录文档暴露的入口语义。[U]

## 存储模型与 resume 索引

`SessionHeader` 是文件级 header，包含 `type: "session"`、可选 `version`、`id`、`timestamp`、`cwd` 和可选 `parentSession`。[E: packages/coding-agent/src/core/session-manager.ts:43] [E: packages/coding-agent/src/core/session-manager.ts:49] `SessionEntryBase` 为非 header entry 提供 `type`、`id`、`parentId`、`timestamp`，而 `SessionEntry` union 覆盖 message、thinking/model change、usage、compaction、branch summary、custom/custom_message、`context_edit`、label、session_info 等 tree entry。[E: packages/coding-agent/src/core/session-manager.ts:57] [E: packages/coding-agent/src/core/session-manager.ts:175] [E: packages/coding-agent/src/core/session-manager.ts:183] [E: packages/coding-agent/src/core/session-manager.ts:192]

新 persist session **不会**在 `SessionManager.create()` 时立刻写文件。`_persist()` 在 `flushed === false` 时先调 `_hasConversation()`：只有存在 `type:"message"` 且 role 为 `user` 或 `assistant` 的 entry 才 `openSync(..., "wx")` 把已累积的 entries 一次写出；仅有 model/thinking/system setup 的打开-关闭不会留下文件。从 user 消息开始（而不是等第一条 assistant reply）是为了第一轮没完成时仍把 prompt 留在盘上（#10000）。[E: packages/coding-agent/src/core/session-manager.ts:1166] [E: packages/coding-agent/src/core/session-manager.ts:1168] [E: packages/coding-agent/src/core/session-manager.ts:1176] [E: packages/coding-agent/src/core/session-manager.ts:1177] [E: packages/coding-agent/CHANGELOG.md:207] `createBranchedSession()` 复用同一规则：抽出的 path 已有 conversation 才立刻 `_rewriteFile()`，否则 `flushed = false` 等后续 `_persist()`。[E: packages/coding-agent/src/core/session-manager.ts:1719] [E: packages/coding-agent/src/core/session-manager.ts:1720] [E: packages/coding-agent/src/core/session-manager.ts:1723]

`ContextEditEntry` 是 append-only 的 model-context 编辑：`targetId` 指向当前 branch 上一条可编辑 entry，`replacement: null` 从未来 provider context 省略该条，非 null 只替换 content，不改 raw history / UI history / 已记账 usage。可编辑目标是 `custom_message` 或 role 为 user/assistant/toolResult 的 `message`；`buildSessionProjection()` 对每个 target 只应用最新一条 edit。[E: packages/coding-agent/src/core/session-manager.ts:175] [E: packages/coding-agent/src/core/session-manager.ts:179] [E: packages/coding-agent/src/core/session-manager.ts:1360] [E: packages/coding-agent/src/core/session-manager.ts:1374] [E: packages/coding-agent/src/core/session-manager.ts:1388] [E: packages/coding-agent/src/core/session-manager.ts:519] [E: packages/coding-agent/src/core/session-manager.ts:551] [E: packages/coding-agent/src/core/session-manager.ts:553] `buildSessionContext()` 只是这份 projection 的 messages/thinking/model 视图，`SessionManager` 是 canonical。[E: packages/coding-agent/src/core/session-manager.ts:576] [E: packages/coding-agent/src/core/session-manager.ts:1497]

`SessionManager` 内部维护 `fileEntries`、`byId`、label maps 和 `leafId`；打开文件后 `_buildIndex()` 会遍历非 header entry，把 entry 放进 `byId`，并把最后遍历到的 entry 作为当前 `leafId`。[E: packages/coding-agent/src/core/session-manager.ts:994] [E: packages/coding-agent/src/core/session-manager.ts:998] [E: packages/coding-agent/src/core/session-manager.ts:1108] [E: packages/coding-agent/src/core/session-manager.ts:1111] `appendMessage()`、`appendThinkingLevelChange()`、`appendModelChange()`、`appendCompaction()` 等 append 方法都把新 entry 的 `parentId` 设为当前 `leafId`，然后 `_appendEntry()` 将 `leafId` 前移到新 entry。[E: packages/coding-agent/src/core/session-manager.ts:1204] [E: packages/coding-agent/src/core/session-manager.ts:1208] [E: packages/coding-agent/src/core/session-manager.ts:1217] [E: packages/coding-agent/src/core/session-manager.ts:1275] [E: packages/coding-agent/src/core/session-manager.ts:1191] [E: packages/coding-agent/src/core/session-manager.ts:1194]

`buildSessionContext()` 委托 `buildSessionProjection()`：先沿 leaf 走到 root 选 path，再对每条 source entry 套最新 `context_edit`，最后扁平化 `messages`。session 文件可以保存多条分支，当前上下文来自 active leaf path 的投影，不是 raw `fileEntries`。[E: packages/coding-agent/src/core/session-manager.ts:543] [E: packages/coding-agent/src/core/session-manager.ts:551] [E: packages/coding-agent/src/core/session-manager.ts:576] [E: packages/coding-agent/src/core/session-manager.ts:1497]

默认 session 目录由 cwd 编码成 `--<resolved-cwd-with-separators-replaced>--`，放在 agent dir 的 `sessions` 子目录下；`getDefaultSessionDir()` 会在目录不存在时创建它。[E: packages/coding-agent/src/core/session-manager.ts:589] [E: packages/coding-agent/src/core/session-manager.ts:592] [E: packages/coding-agent/src/core/session-manager.ts:596] `SessionManager.list(cwd, sessionDir?)` 从目录读 `.jsonl`，构造 `SessionInfo`，必要时按 cwd 过滤，并按 `modified` 新到旧排序；`SessionManager.listAll()` 默认扫描 `getSessionsDir()` 下各 project 子目录，收集 `.jsonl` 后同样按 `modified` 新到旧排序。[E: packages/coding-agent/src/core/session-manager.ts:1900] [E: packages/coding-agent/src/core/session-manager.ts:1907] [E: packages/coding-agent/src/core/session-manager.ts:1914] [E: packages/coding-agent/src/core/session-manager.ts:1949] [E: packages/coding-agent/src/core/session-manager.ts:1953]

`buildSessionInfo()` 读取 header、message count、first user message、全文搜索文本、latest `session_info` name、`parentSessionPath` 和 created/modified 时间；这些字段是 resume 列表、搜索、命名显示和 threaded 展示可用的数据基础。[E: packages/coding-agent/src/core/session-manager.ts:799] [E: packages/coding-agent/src/core/session-manager.ts:829] [E: packages/coding-agent/src/core/session-manager.ts:848] [E: packages/coding-agent/src/core/session-manager.ts:859] [E: packages/coding-agent/src/core/session-manager.ts:871] [I]

## `/resume` 与 session picker

用户文档说明 `/resume` 会为当前 project 打开 interactive session picker，`pi --resume` 在启动时打开同一个 picker。[E: packages/coding-agent/docs/sessions.md:14] picker 的可见能力包括搜索、rename、delete，以及显示 paths、切换 sort、只看 named sessions；具体快捷键文档指向 keybindings。[E: packages/coding-agent/docs/sessions.md:18]

`selectSession()` 的 index source 只证明 picker 封装层：它接收 current/all 两个 `SessionsLoader`，创建 startup TUI，实例化 `SessionSelectorComponent`，选中时停止 UI 并 resolve path，取消时停止 UI 并 resolve `null`。[E: packages/coding-agent/src/cli/session-picker.ts:15] [E: packages/coding-agent/src/cli/session-picker.ts:20] [E: packages/coding-agent/src/cli/session-picker.ts:26] [E: packages/coding-agent/src/cli/session-picker.ts:32] [E: packages/coding-agent/src/cli/session-picker.ts:40] `SessionSelectorComponent` 内部的 threaded/recent/fuzzy 排序实现、active-session 删除拦截和 rename UI 细节不在本节点 index source 内，本页只把它们作为用户文档级能力或相邻实现边界处理。[U]

## `/tree`:同文件内移动 leaf

用户文档把 `/tree` 定义为在当前 session file 内移动到 earlier point；对照表写明 `/tree` 的 Result 是 Moves within the current session file，而 `/fork` 和 `/clone` 都创建新 session。[E: packages/coding-agent/docs/sessions.md:26] [E: packages/coding-agent/docs/sessions.md:27] [E: packages/coding-agent/docs/sessions.md:28] 选择 user message 会把文本放回 editor；选择 assistant 或其它 entry 则在该点继续、editor 为空。[E: packages/coding-agent/docs/sessions.md:30] 离开一条 branch 时可以附带 LLM 生成的 branch summary。[E: packages/coding-agent/docs/sessions.md:32]

`SessionManager.branch(branchFromId)` 校验目标 entry 存在后只把 `leafId` 移到该 entry；`resetLeaf()` 把 `leafId` 设为 `null`，用于下一次 append 创建新的 root entry。[E: packages/coding-agent/src/core/session-manager.ts:1579] [E: packages/coding-agent/src/core/session-manager.ts:1583] [E: packages/coding-agent/src/core/session-manager.ts:1591] `branchWithSummary(branchFromId, summary, ...)` 先把 `leafId` 设到目标位置，再 append 一个 `branch_summary` entry；该 entry 的 `parentId` 是 `branchFromId`，并记录 `fromId`、`summary`、可选 `details` 和 `fromHook`。[E: packages/coding-agent/src/core/session-manager.ts:1600] [E: packages/coding-agent/src/core/session-manager.ts:1611] [E: packages/coding-agent/src/core/session-manager.ts:1615] [E: packages/coding-agent/src/core/session-manager.ts:1617]

选择 user/custom message 时回填编辑器、选择 non-user entry 时只移动 leaf 的具体 handler 逻辑不在本节点 index source 内；本页只能引用用户文档的 selection behavior，不把 runtime handler 行为标为 `[E]`。[U]

## `/fork` 与 `/clone`:新文件继续

用户文档把 `/fork` 定义为从 previous user message 创建 new session，把 `/clone` 定义为 duplicate current active branch into a new session；两者都产出独立 session file。[E: packages/coding-agent/docs/sessions.md:27] [E: packages/coding-agent/docs/sessions.md:28] `SessionManager.createBranchedSession(leafId)` 是 index source 中可核到的底层文件抽取能力：它取 root-to-leaf path，过滤 label entry 并重新串接 retained path 的 `parentId`，创建新 header，并在持久化模式下让 `parentSession` 指向旧 session file。[E: packages/coding-agent/src/core/session-manager.ts:1632] [E: packages/coding-agent/src/core/session-manager.ts:1642] [E: packages/coding-agent/src/core/session-manager.ts:1665] [E: packages/coding-agent/src/core/session-manager.ts:1675] [E: packages/coding-agent/src/core/session-manager.ts:1681]

`createBranchedSession()` 还会把 path 上已有 label 作为新文件尾部的 label entries 重建；落盘规则与 `_persist()` 相同：抽出的 path 已有 user 或 assistant message 才立刻 `_rewriteFile()`，否则 `flushed = false`。[E: packages/coding-agent/src/core/session-manager.ts:1685] [E: packages/coding-agent/src/core/session-manager.ts:1719] [E: packages/coding-agent/src/core/session-manager.ts:1723] `SessionManager.forkFrom(sourcePath, targetCwd, sessionDir?, options?)` 是跨 project/source file 的文件级 fork：读取 source entries，生成 target cwd 下的新 header，把 `parentSession` 设为 source path，再复制所有非 header entry，并且 **立刻** `writeFileSync(..., { flag: "wx" })`。[E: packages/coding-agent/src/core/session-manager.ts:1815] [E: packages/coding-agent/src/core/session-manager.ts:1848] [E: packages/coding-agent/src/core/session-manager.ts:1854] [E: packages/coding-agent/src/core/session-manager.ts:1856] [E: packages/coding-agent/src/core/session-manager.ts:1859]

`/fork` 和 `/clone` 到 `createBranchedSession()` 的 exact interactive/RPC dispatch 不在 index source 中；当前源能直接证明用户文档语义和 `SessionManager` 的新文件抽取/复制能力，不能直接证明每个 UI 命令如何调用底层 API。[U]

## 命名、重命名与 session info

用户文档给出 `/name` 或 `--name` 作为设置 human-readable session name 的入口；named sessions 更容易在 `/resume` 和 `pi --resume` 中找到。[E: packages/coding-agent/docs/sessions.md:16] `appendSessionInfo(name)` 会把换行替换为空格并 trim，再 append `type: "session_info"` entry；`getSessionName()` 从后往前找最新 `session_info`，并把空名视为清除。[E: packages/coding-agent/src/core/session-manager.ts:1304] [E: packages/coding-agent/src/core/session-manager.ts:1305] [E: packages/coding-agent/src/core/session-manager.ts:1311] [E: packages/coding-agent/src/core/session-manager.ts:1318] [E: packages/coding-agent/src/core/session-manager.ts:1324] [E: packages/coding-agent/src/core/session-manager.ts:1325]

## `/share` 与 `/export`

`exportSessionToJsonl(sessionManager, outputPath?, createTrailingEntries?)` 写出一份 **current branch** JSONL：新 header（复用当前 session id/cwd、`version: CURRENT_SESSION_VERSION`）、再按 `getBranch()` 顺序复制 entry，并把 `parentId` 重写成从 `null` 起的线性链；可选 `createTrailingEntries(parentId, timestamp)` 接到最后一条之后。[E: packages/coding-agent/src/core/session-export.ts:32] [E: packages/coding-agent/src/core/session-export.ts:14] [E: packages/coding-agent/src/core/session-export.ts:23] [E: packages/coding-agent/src/core/session-export.ts:36] [E: packages/coding-agent/src/core/session-manager.ts:1469] 它不要求 session 文件已落盘。[E: packages/coding-agent/src/core/session-export.ts:43]

`exportSessionForShare()` 在这条 JSONL 末尾追加一条 `type: "custom"`、`customType: "pi.share"` 的 presentation entry：`data.systemPrompt` 是当前 `session.state.systemPrompt`，`data.tools` 是 active tools 的 name/description/parameters；不含 `renderedTools` / theme / version。[E: packages/coding-agent/src/modes/interactive/session-share.ts:50] [E: packages/coding-agent/src/modes/interactive/session-share.ts:33] [E: packages/coding-agent/src/modes/interactive/session-share.ts:38] [E: packages/coding-agent/test/export-jsonl-share.test.ts:95] [E: packages/coding-agent/test/export-jsonl-share.test.ts:107] 这条 custom entry **不进入** LLM context：`sessionEntryToContextMessages()` 对其它 type（含 `custom`）返回空数组；回归测试对 share 文件 `open()` 后的 context roles 只有 user/assistant/toolResult。[E: packages/coding-agent/src/core/session-manager.ts:465] [E: packages/coding-agent/src/core/session-manager.ts:128] [E: packages/coding-agent/test/export-jsonl-share.test.ts:113] 测试还断言 share 导出不改 conversation entry 的 id，只把 parentId 线性化，且普通 `exportToJsonl()` 不会写入 `pi.share`。[E: packages/coding-agent/test/export-jsonl-share.test.ts:72] [E: packages/coding-agent/test/export-jsonl-share.test.ts:83]

`shareSession()` 先 Radius 后 gist：有 `radius` provider 且能取到 token 时 POST organization-visible artifact，状态行只显示 `canonical_url` hyperlink；provider/token 缺失才检查 `gh auth status`，把 **HTML**（`exportToHtml`）做成 `--public=false` gist。[E: packages/coding-agent/src/modes/interactive/session-share.ts:57] [E: packages/coding-agent/src/modes/interactive/session-share.ts:69] [E: packages/coding-agent/src/modes/interactive/session-share.ts:99] [E: packages/coding-agent/src/modes/interactive/session-share.ts:83] [E: packages/coding-agent/src/modes/interactive/session-share.ts:175] Radius 上传一旦开始，失败也不会自动改走 gist。[E: packages/coding-agent/src/modes/interactive/session-share.ts:143]

用户文档把 `/export` 写成 HTML 或 JSONL；interactive `/export` 的分流（路径是否以 `.jsonl` 结尾）在 `interactive-mode.ts`，不在本节点 source 内，这里只记录 export helper 本身与文档语义。[E: packages/coding-agent/docs/sessions.md:58] [U]

## Gotcha

- `--session <path|id>` 的 path/id 解析、全局匹配后是否 fork 到当前 cwd、以及参数互斥校验都不在本节点 index source 中；这些事实需要用 CLI 入口节点或更宽 source 复核。[U]
- `/clone` 是否在 interactive mode 中复用 fork runtime、以及 RPC wire 命令如何映射 fork/clone，不在本节点 index source 中；本页只保留用户文档语义和 `SessionManager.createBranchedSession()` 的文件级能力。[U]
- 新 session / branched session 文件可能延迟写盘：`_hasConversation()` 要求 user **或** assistant message，不只是 assistant。只有 setup entries 的打开-关闭不会留下 JSONL。跨项目 `forkFrom()` 则立刻写盘。[E: packages/coding-agent/src/core/session-manager.ts:1166] [E: packages/coding-agent/src/core/session-manager.ts:1719] [E: packages/coding-agent/src/core/session-manager.ts:1856]
- `appendContextEdit()` 不改 raw `fileEntries` 里的目标 message；省略后 `/session` 用量仍会计入那条 assistant usage，threshold compaction 则改走投影估算。详见 [subsys.coding-agent.usage-accounting](../../subsystems/coding-agent/usage-accounting.md)。[I]

## 跨包关系

[subsys.coding-agent.session-manager](../../subsystems/coding-agent/session-manager.md) 是本节点的存储/树 API 下钻页：它应解释 `SessionManager` 如何 load、migrate、append、branch、list 和 build context；本节点只覆盖用户可见 resume/tree/fork/clone/name/delete workflow。[I]

[spine.session-state-model](../../spine/session-state-model.md) 说明产品 `SessionManager` JSONL、durable session 与进程内 `AgentState.messages` 分层。本节点的 index source 只能证明 coding-agent `SessionManager` 的 root-to-leaf context 投影；产品路径上 canonical provider context 就是这份投影。[I]

[ref.coding-agent.session-format](../../reference/session-format.md) 应列全 JSONL v3 entry schema、版本迁移和兼容字段；本节点只引用 header、`parentSession`、`session_info`、`branch_summary`、`ContextEditEntry` 等会话管理面直接触达的字段。[I]

## Sources

- packages/coding-agent/src/core/session-manager.ts
- packages/coding-agent/src/core/session-export.ts
- packages/coding-agent/src/modes/interactive/session-share.ts
- packages/coding-agent/docs/sessions.md
- packages/coding-agent/src/cli/session-picker.ts
- packages/coding-agent/test/export-jsonl-share.test.ts
- packages/coding-agent/CHANGELOG.md

## 相关

- [spine.session-state-model](../../spine/session-state-model.md): 会话树如何从 current leaf 投影为 LLM context。
- [subsys.coding-agent.session-manager](../../subsystems/coding-agent/session-manager.md): `SessionManager` 的 JSONL 读写、tree index、branch 和 list 机制。
- [ref.coding-agent.session-format](../../reference/session-format.md): session JSONL v3 文件格式和 entry catalog。
- [subsys.coding-agent.usage-accounting](../../subsystems/coding-agent/usage-accounting.md): context-edit 不改 raw usage totals，但会让 threshold 估算丢弃 edit 前的 assistant usage。
