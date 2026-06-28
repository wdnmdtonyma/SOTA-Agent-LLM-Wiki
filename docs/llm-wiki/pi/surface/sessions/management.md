---
id: surface.sessions.management
title: 会话管理(fork/tree/clone/resume)
kind: surface
tier: T1
pkg: coding-agent
source:
  - packages/coding-agent/src/core/session-manager.ts
  - packages/coding-agent/docs/sessions.md
  - packages/coding-agent/src/cli/session-picker.ts
symbols:
  - SessionManager
  - fork
  - clone
  - navigateTree
related:
  - spine.session-state-model
  - subsys.coding-agent.session-manager
  - ref.coding-agent.session-format
evidence: explicit
status: verified
updated: 5a073885
---

> 会话管理面是 pi-coding-agent 暴露给用户的 session lifecycle:自动保存 JSONL 会话、浏览并恢复历史会话、在同一 session tree 内移动 active leaf,以及把已有路径复制到新的 session 文件继续工作。

## 能回答的问题

- `pi -c`、`pi -r`、`--session <path|id>`、`--fork <path|id>`、`--no-session`、`--name` 在用户文档中分别代表什么入口?
- `/resume` 的 picker 能做哪些用户可见操作?
- `/tree`、`/fork`、`/clone` 的用户语义差异是什么:同一文件内继续,还是新文件继续?
- `SessionManager` 如何用 `id` / `parentId` / `leafId` 表达树和 active branch?
- 新建 session、branched session、cross-project fork 如何记录 `parentSession`?
- session display name 在文件里如何持久化和读取?

## 用户入口

用户文档把 session 存储描述为自动保存到 `~/.pi/agent/sessions/`,按 working directory 组织,每个 session 是 tree-structured JSONL 文件 [E: packages/coding-agent/docs/sessions.md:7]。同一段示例列出 `pi -c` 继续最近 session、`pi -r` 浏览选择历史 session、`pi --no-session` 进入不保存的 ephemeral mode、`pi --name` 设置启动 display name、`pi --session <path|id>` 指定 session file 或 partial session ID、`pi --fork <path|id>` fork session file 或 partial session ID 到新 session [E: packages/coding-agent/docs/sessions.md:10] [E: packages/coding-agent/docs/sessions.md:11] [E: packages/coding-agent/docs/sessions.md:12] [E: packages/coding-agent/docs/sessions.md:13] [E: packages/coding-agent/docs/sessions.md:14] [E: packages/coding-agent/docs/sessions.md:15]。

交互命令表把 `/resume`、`/new`、`/name <name>`、`/session`、`/tree`、`/fork`、`/clone` 列为 session commands:分别用于选择历史 session、新建 session、设置 display name、显示 session 信息、导航当前 session tree、从之前 user message 创建新 session、复制当前 active branch 到新 session [E: packages/coding-agent/docs/sessions.md:26] [E: packages/coding-agent/docs/sessions.md:27] [E: packages/coding-agent/docs/sessions.md:28] [E: packages/coding-agent/docs/sessions.md:29] [E: packages/coding-agent/docs/sessions.md:30] [E: packages/coding-agent/docs/sessions.md:31] [E: packages/coding-agent/docs/sessions.md:32]。CLI 参数互斥、`--session` path-vs-id 解析和 slash command handler dispatch 不在本节点 index source 内,因此这里只记录文档暴露的入口语义 [U]。

## 存储模型与 resume 索引

`SessionHeader` 是文件级 header,包含 `type: "session"`、可选 `version`、`id`、`timestamp`、`cwd` 和可选 `parentSession` [E: packages/coding-agent/src/core/session-manager.ts:32] [E: packages/coding-agent/src/core/session-manager.ts:38]。`SessionEntryBase` 为非 header entry 提供 `type`、`id`、`parentId`、`timestamp`,而 `SessionEntry` union 覆盖 message、thinking/model change、compaction、branch summary、custom/custom_message、label、session_info 等 tree entry [E: packages/coding-agent/src/core/session-manager.ts:46] [E: packages/coding-agent/src/core/session-manager.ts:49] [E: packages/coding-agent/src/core/session-manager.ts:140] [E: packages/coding-agent/src/core/session-manager.ts:149]。

`SessionManager` 内部维护 `fileEntries`、`byId`、label maps 和 `leafId`;打开文件后 `_buildIndex()` 会遍历非 header entry,把 entry 放进 `byId`,并把最后遍历到的 entry 作为当前 `leafId` [E: packages/coding-agent/src/core/session-manager.ts:765] [E: packages/coding-agent/src/core/session-manager.ts:766] [E: packages/coding-agent/src/core/session-manager.ts:769] [E: packages/coding-agent/src/core/session-manager.ts:860] [E: packages/coding-agent/src/core/session-manager.ts:863]。`appendMessage()`、`appendThinkingLevelChange()`、`appendModelChange()`、`appendCompaction()` 等 append 方法都把新 entry 的 `parentId` 设为当前 `leafId`,然后 `_appendEntry()` 将 `leafId` 前移到新 entry [E: packages/coding-agent/src/core/session-manager.ts:955] [E: packages/coding-agent/src/core/session-manager.ts:958] [E: packages/coding-agent/src/core/session-manager.ts:968] [E: packages/coding-agent/src/core/session-manager.ts:971] [E: packages/coding-agent/src/core/session-manager.ts:1001] [E: packages/coding-agent/src/core/session-manager.ts:1004] [E: packages/coding-agent/src/core/session-manager.ts:941] [E: packages/coding-agent/src/core/session-manager.ts:944]。

`buildSessionContext(entries, leafId, byId)` 从 leaf 沿 `parentId` 走到 root,反转路径后只把 path 上的 message、custom_message、branch_summary 和 compaction summary 投影进 LLM messages;因此 session 文件可以保存多条分支,而当前上下文来自 active leaf path [E: packages/coding-agent/src/core/session-manager.ts:325] [E: packages/coding-agent/src/core/session-manager.ts:344] [E: packages/coding-agent/src/core/session-manager.ts:357] [E: packages/coding-agent/src/core/session-manager.ts:361] [E: packages/coding-agent/src/core/session-manager.ts:363] [E: packages/coding-agent/src/core/session-manager.ts:389] [E: packages/coding-agent/src/core/session-manager.ts:397] [E: packages/coding-agent/src/core/session-manager.ts:432]。

默认 session 目录由 cwd 编码成 `--<resolved-cwd-with-separators-replaced>--`,放在 agent dir 的 `sessions` 子目录下;`getDefaultSessionDir()` 会在目录不存在时创建它 [E: packages/coding-agent/src/core/session-manager.ts:439] [E: packages/coding-agent/src/core/session-manager.ts:442] [E: packages/coding-agent/src/core/session-manager.ts:443] [E: packages/coding-agent/src/core/session-manager.ts:446] [E: packages/coding-agent/src/core/session-manager.ts:449]。`SessionManager.list(cwd, sessionDir?)` 从目录读 `.jsonl`,构造 `SessionInfo`,必要时按 cwd 过滤,并按 `modified` 新到旧排序;`SessionManager.listAll()` 默认扫描 `getSessionsDir()` 下各 project 子目录,收集 `.jsonl` 后同样按 `modified` 新到旧排序 [E: packages/coding-agent/src/core/session-manager.ts:714] [E: packages/coding-agent/src/core/session-manager.ts:727] [E: packages/coding-agent/src/core/session-manager.ts:1507] [E: packages/coding-agent/src/core/session-manager.ts:1511] [E: packages/coding-agent/src/core/session-manager.ts:1514] [E: packages/coding-agent/src/core/session-manager.ts:1537] [E: packages/coding-agent/src/core/session-manager.ts:1543] [E: packages/coding-agent/src/core/session-manager.ts:1575]。

`buildSessionInfo()` 读取 header、message count、first user message、全文搜索文本、latest `session_info` name、`parentSessionPath` 和 created/modified 时间;这些字段是 resume 列表、搜索、命名显示和 threaded 展示可用的数据基础 [E: packages/coding-agent/src/core/session-manager.ts:590] [E: packages/coding-agent/src/core/session-manager.ts:616] [E: packages/coding-agent/src/core/session-manager.ts:617] [E: packages/coding-agent/src/core/session-manager.ts:621] [E: packages/coding-agent/src/core/session-manager.ts:635] [E: packages/coding-agent/src/core/session-manager.ts:637] [E: packages/coding-agent/src/core/session-manager.ts:643] [E: packages/coding-agent/src/core/session-manager.ts:658] [I]。

## `/resume` 与 session picker

用户文档说明 `/resume` 会为当前 project 打开 interactive session picker,`pi -r` 在启动时打开同一个 picker [E: packages/coding-agent/docs/sessions.md:39]。picker 的可见能力包括键入搜索、Ctrl+P 切换 path display、Ctrl+S 切换 sort mode、Ctrl+N 只看 named sessions、Ctrl+R rename、Ctrl+D 后确认删除 [E: packages/coding-agent/docs/sessions.md:41] [E: packages/coding-agent/docs/sessions.md:48]。删除行为的用户文档边界是:可用时使用 `trash` CLI,而不是永久删除文件 [E: packages/coding-agent/docs/sessions.md:50]。

`selectSession()` 的 index source 只证明 picker 封装层:它接收 current/all 两个 `SessionsLoader`,创建 startup TUI,实例化 `SessionSelectorComponent`,选中时停止 UI 并 resolve path,取消时停止 UI 并 resolve `null` [E: packages/coding-agent/src/cli/session-picker.ts:15] [E: packages/coding-agent/src/cli/session-picker.ts:16] [E: packages/coding-agent/src/cli/session-picker.ts:17] [E: packages/coding-agent/src/cli/session-picker.ts:20] [E: packages/coding-agent/src/cli/session-picker.ts:26] [E: packages/coding-agent/src/cli/session-picker.ts:29] [E: packages/coding-agent/src/cli/session-picker.ts:32] [E: packages/coding-agent/src/cli/session-picker.ts:33] [E: packages/coding-agent/src/cli/session-picker.ts:36] [E: packages/coding-agent/src/cli/session-picker.ts:40]。`SessionSelectorComponent` 内部的 threaded/recent/fuzzy 排序实现、active-session 删除拦截和 rename UI 细节不在本节点 index source 内,本页只把它们作为用户文档级能力或相邻实现边界处理 [U]。

## `/tree`:同文件内移动 leaf

用户文档把 `/tree` 定义为在当前 session tree 中跳到任意 previous point 并继续,且不会创建新文件 [E: packages/coding-agent/docs/sessions.md:69] [E: packages/coding-agent/docs/sessions.md:71]。`/tree`、`/fork`、`/clone` 对照表进一步写明 `/tree` 的 Output 是 same session file,View 是 full tree,Summary 可选 branch summary;`/fork` 和 `/clone` 的 Output 都是 new session file [E: packages/coding-agent/docs/sessions.md:118] [E: packages/coding-agent/docs/sessions.md:122] [E: packages/coding-agent/docs/sessions.md:123] [E: packages/coding-agent/docs/sessions.md:125]。

`SessionManager.branch(branchFromId)` 校验目标 entry 存在后只把 `leafId` 移到该 entry;`resetLeaf()` 把 `leafId` 设为 `null`,用于下一次 append 创建新的 root entry [E: packages/coding-agent/src/core/session-manager.ts:1247] [E: packages/coding-agent/src/core/session-manager.ts:1248] [E: packages/coding-agent/src/core/session-manager.ts:1251] [E: packages/coding-agent/src/core/session-manager.ts:1259] [E: packages/coding-agent/src/core/session-manager.ts:1260]。`branchWithSummary(branchFromId, summary, ...)` 先把 `leafId` 设到目标位置,再 append 一个 `branch_summary` entry;该 entry 的 `parentId` 是 `branchFromId`,并记录 `fromId`、`summary`、可选 `details` 和 `fromHook` [E: packages/coding-agent/src/core/session-manager.ts:1268] [E: packages/coding-agent/src/core/session-manager.ts:1272] [E: packages/coding-agent/src/core/session-manager.ts:1273] [E: packages/coding-agent/src/core/session-manager.ts:1276] [E: packages/coding-agent/src/core/session-manager.ts:1278] [E: packages/coding-agent/src/core/session-manager.ts:1279] [E: packages/coding-agent/src/core/session-manager.ts:1283]。

选择 user/custom message 时回填编辑器、选择 non-user entry 时只移动 leaf 的具体 handler 逻辑不在本节点 index source 内;本页只能引用用户文档的 selection behavior,不把 runtime handler 行为标为 `[E]` [E: packages/coding-agent/docs/sessions.md:102] [E: packages/coding-agent/docs/sessions.md:116] [U]。

## `/fork` 与 `/clone`:新文件继续

用户文档把 `/fork` 定义为从 previous user message 创建 new session,把 `/clone` 定义为 duplicate current active branch into a new session;对照表写明 `/fork` 的 View 是 user-message selector,`/clone` 的 View 是 current active branch,两者 Output 都是 new session file [E: packages/coding-agent/docs/sessions.md:31] [E: packages/coding-agent/docs/sessions.md:32] [E: packages/coding-agent/docs/sessions.md:120] [E: packages/coding-agent/docs/sessions.md:122] [E: packages/coding-agent/docs/sessions.md:123]。`SessionManager.createBranchedSession(leafId)` 是 index source 中可核到的底层文件抽取能力:它取 root-to-leaf path,过滤 label entry 并重新串接 retained path 的 `parentId`,创建新 header,并在持久化模式下让 `parentSession` 指向旧 session file [E: packages/coding-agent/src/core/session-manager.ts:1292] [E: packages/coding-agent/src/core/session-manager.ts:1294] [E: packages/coding-agent/src/core/session-manager.ts:1302] [E: packages/coding-agent/src/core/session-manager.ts:1305] [E: packages/coding-agent/src/core/session-manager.ts:1306] [E: packages/coding-agent/src/core/session-manager.ts:1315] [E: packages/coding-agent/src/core/session-manager.ts:1321]。

`createBranchedSession()` 还会把 path 上已有 label 作为新文件尾部的 label entries 重建;若新文件包含 assistant message,它立即 rewrite 新 JSONL 文件,否则延迟到后续 `_persist()` 路径写盘 [E: packages/coding-agent/src/core/session-manager.ts:1325] [E: packages/coding-agent/src/core/session-manager.ts:1327] [E: packages/coding-agent/src/core/session-manager.ts:1333] [E: packages/coding-agent/src/core/session-manager.ts:1352] [E: packages/coding-agent/src/core/session-manager.ts:1362] [E: packages/coding-agent/src/core/session-manager.ts:1364] [E: packages/coding-agent/src/core/session-manager.ts:1367]。`SessionManager.forkFrom(sourcePath, targetCwd, sessionDir?, options?)` 是跨 project/source file 的文件级 fork:读取 source entries,生成 target cwd 下的新 header,把 `parentSession` 设为 source path,再复制所有非 header entry [E: packages/coding-agent/src/core/session-manager.ts:1448] [E: packages/coding-agent/src/core/session-manager.ts:1456] [E: packages/coding-agent/src/core/session-manager.ts:1481] [E: packages/coding-agent/src/core/session-manager.ts:1486] [E: packages/coding-agent/src/core/session-manager.ts:1487] [E: packages/coding-agent/src/core/session-manager.ts:1492] [E: packages/coding-agent/src/core/session-manager.ts:1494]。

`/fork` 和 `/clone` 到 `createBranchedSession()` 的 exact interactive/RPC dispatch 不在 index source 中;当前三源能直接证明用户文档语义和 `SessionManager` 的新文件抽取/复制能力,不能直接证明每个 UI 命令如何调用底层 API [U]。

## 命名、重命名与 session info

用户文档给出 `/name <name>` 作为设置 human-readable session name 的命令,并说明启动时也可以用 `--name` 或 `-n`;named sessions 更容易在 `/resume` 和 `pi -r` 中找到 [E: packages/coding-agent/docs/sessions.md:52] [E: packages/coding-agent/docs/sessions.md:54] [E: packages/coding-agent/docs/sessions.md:60] [E: packages/coding-agent/docs/sessions.md:67]。`appendSessionInfo(name)` 会把换行替换为空格并 trim,再 append `type: "session_info"` entry;`getSessionName()` 从后往前找最新 `session_info`,并把空名视为清除 [E: packages/coding-agent/src/core/session-manager.ts:1031] [E: packages/coding-agent/src/core/session-manager.ts:1032] [E: packages/coding-agent/src/core/session-manager.ts:1034] [E: packages/coding-agent/src/core/session-manager.ts:1038] [E: packages/coding-agent/src/core/session-manager.ts:1045] [E: packages/coding-agent/src/core/session-manager.ts:1049] [E: packages/coding-agent/src/core/session-manager.ts:1051] [E: packages/coding-agent/src/core/session-manager.ts:1052]。

## Gotcha

- `--session <path|id>` 的 path/id 解析、全局匹配后是否 fork 到当前 cwd、以及参数互斥校验都不在本节点 index source 中;这些事实需要用 CLI 入口节点或更宽 source 复核 [U]。
- `/clone` 是否在 interactive mode 中复用 fork runtime、以及 RPC wire 命令如何映射 fork/clone,不在本节点 index source 中;本页只保留用户文档语义和 `SessionManager.createBranchedSession()` 的文件级能力 [U]。
- 新 branched session 文件可能延迟写盘:当抽取出的 path 没有 assistant message 时,`createBranchedSession()` 将 `flushed` 置为 false,等待后续 `_persist()` 路径创建文件 [E: packages/coding-agent/src/core/session-manager.ts:1362] [E: packages/coding-agent/src/core/session-manager.ts:1364] [E: packages/coding-agent/src/core/session-manager.ts:1367]。

## 跨包关系

[subsys.coding-agent.session-manager](../../subsystems/coding-agent/session-manager.md) 是本节点的存储/树 API 下钻页:它应解释 `SessionManager` 如何 load、migrate、append、branch、list 和 build context;本节点只覆盖用户可见 resume/tree/fork/clone/name/delete workflow [I]。

[spine.session-state-model](../../spine/session-state-model.md) 是跨 `pi-agent-core` 与 `pi-coding-agent` 的 session tree 总览:本节点的 index source 只能证明 coding-agent `SessionManager` 的 root-to-leaf context 投影,不能证明 agent-core session hierarchy [I]。

[ref.coding-agent.session-format](../../reference/session-format.md) 应列全 JSONL v3 entry schema、版本迁移和兼容字段;本节点只引用 header、`parentSession`、`session_info`、`branch_summary` 等会话管理面直接触达的字段 [I]。

## Sources

- packages/coding-agent/src/core/session-manager.ts
- packages/coding-agent/docs/sessions.md
- packages/coding-agent/src/cli/session-picker.ts

## 相关

- [spine.session-state-model](../../spine/session-state-model.md): 会话树如何从 current leaf 投影为 LLM context。
- [subsys.coding-agent.session-manager](../../subsystems/coding-agent/session-manager.md): `SessionManager` 的 JSONL 读写、tree index、branch 和 list 机制。
- [ref.coding-agent.session-format](../../reference/session-format.md): session JSONL v3 文件格式和 entry catalog。
