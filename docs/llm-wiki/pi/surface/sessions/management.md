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
symbols:
  - SessionManager
  - fork
  - clone
  - navigateTree
  - exportSessionToJsonl
  - exportSessionForShare
  - shareSession
related:
  - spine.session-state-model
  - subsys.coding-agent.session-manager
  - ref.coding-agent.session-format
evidence: explicit
status: verified
updated: bbb61e34aa
---

> 会话管理面是 pi-coding-agent 暴露给用户的 session lifecycle:自动保存 JSONL 会话、浏览并恢复历史会话、在同一 session tree 内移动 active leaf,以及把已有路径复制到新的 session 文件继续工作。

## 能回答的问题

- `pi -c`、`pi -r`、`--session <path|id>`、`--fork <path|id>`、`--no-session`、`--name` 在用户文档中分别代表什么入口?
- `/resume` 的 picker 能做哪些用户可见操作?
- `/tree`、`/fork`、`/clone` 的用户语义差异是什么:同一文件内继续,还是新文件继续?
- `/share` 与 `/export` 分别写出什么?Radius 与 gh gist 谁先谁后?
- `exportSessionForShare()` 为什么要追加 `customType: "pi.share"`?
- `SessionManager` 如何用 `id` / `parentId` / `leafId` 表达树和 active branch?
- 新建 session、branched session、cross-project fork 如何记录 `parentSession`?
- session display name 在文件里如何持久化和读取?

## 用户入口

用户文档把 session 存储描述为自动保存到 `~/.pi/agent/sessions/`,按 working directory 组织,每个 session 是 tree-structured JSONL 文件 [E: packages/coding-agent/docs/sessions.md:7]。同一段示例列出 `pi -c` 继续最近 session、`pi -r` 浏览选择历史 session、`pi --no-session` 进入不保存的 ephemeral mode、`pi --name` 设置启动 display name、`pi --session <path|id>` 指定 session file 或 partial session ID、`pi --fork <path|id>` fork session file 或 partial session ID 到新 session [E: packages/coding-agent/docs/sessions.md:10] [E: packages/coding-agent/docs/sessions.md:11] [E: packages/coding-agent/docs/sessions.md:12] [E: packages/coding-agent/docs/sessions.md:13] [E: packages/coding-agent/docs/sessions.md:14] [E: packages/coding-agent/docs/sessions.md:15]。

交互命令表把 `/resume`、`/new`、`/name <name>`、`/session`、`/tree`、`/fork`、`/clone`、`/export`、`/share` 列为 session commands [E: packages/coding-agent/docs/sessions.md:26] [E: packages/coding-agent/docs/sessions.md:27] [E: packages/coding-agent/docs/sessions.md:28] [E: packages/coding-agent/docs/sessions.md:29] [E: packages/coding-agent/docs/sessions.md:30] [E: packages/coding-agent/docs/sessions.md:31] [E: packages/coding-agent/docs/sessions.md:32] [E: packages/coding-agent/docs/sessions.md:34] [E: packages/coding-agent/docs/sessions.md:35]。官方 `docs/sessions.md` 仍把 `/export` 写成 “Export session to HTML”、把 `/share` 写成 “Upload as private GitHub gist”;运行时行为以 `session-export.ts` / `session-share.ts` 为准,见本页 `/share` 与 `/export` 节 [I] [U]。CLI 参数互斥、`--session` path-vs-id 解析和 slash command handler dispatch 不在本节点 index source 内,因此这里只记录文档暴露的入口语义 [U]。

## 存储模型与 resume 索引

`SessionHeader` 是文件级 header,包含 `type: "session"`、可选 `version`、`id`、`timestamp`、`cwd` 和可选 `parentSession` [E: packages/coding-agent/src/core/session-manager.ts:32] [E: packages/coding-agent/src/core/session-manager.ts:38]。`SessionEntryBase` 为非 header entry 提供 `type`、`id`、`parentId`、`timestamp`,而 `SessionEntry` union 覆盖 message、thinking/model change、compaction、branch summary、custom/custom_message、label、session_info 等 tree entry [E: packages/coding-agent/src/core/session-manager.ts:46] [E: packages/coding-agent/src/core/session-manager.ts:49] [E: packages/coding-agent/src/core/session-manager.ts:144] [E: packages/coding-agent/src/core/session-manager.ts:153]。

`SessionManager` 内部维护 `fileEntries`、`byId`、label maps 和 `leafId`;打开文件后 `_buildIndex()` 会遍历非 header entry,把 entry 放进 `byId`,并把最后遍历到的 entry 作为当前 `leafId` [E: packages/coding-agent/src/core/session-manager.ts:863] [E: packages/coding-agent/src/core/session-manager.ts:864] [E: packages/coding-agent/src/core/session-manager.ts:867] [E: packages/coding-agent/src/core/session-manager.ts:977] [E: packages/coding-agent/src/core/session-manager.ts:980]。`appendMessage()`、`appendThinkingLevelChange()`、`appendModelChange()`、`appendCompaction()` 等 append 方法都把新 entry 的 `parentId` 设为当前 `leafId`,然后 `_appendEntry()` 将 `leafId` 前移到新 entry [E: packages/coding-agent/src/core/session-manager.ts:1072] [E: packages/coding-agent/src/core/session-manager.ts:1075] [E: packages/coding-agent/src/core/session-manager.ts:1085] [E: packages/coding-agent/src/core/session-manager.ts:1088] [E: packages/coding-agent/src/core/session-manager.ts:1119] [E: packages/coding-agent/src/core/session-manager.ts:1122] [E: packages/coding-agent/src/core/session-manager.ts:1058] [E: packages/coding-agent/src/core/session-manager.ts:1061]。

`buildSessionContext(entries, leafId, byId)` 从 leaf 沿 `parentId` 走到 root,反转路径后只把 path 上的 message、custom_message、branch_summary 和 compaction summary 投影进 LLM messages;因此 session 文件可以保存多条分支,而当前上下文来自 active leaf path [E: packages/coding-agent/src/core/session-manager.ts:461] [E: packages/coding-agent/src/core/session-manager.ts:344] [E: packages/coding-agent/src/core/session-manager.ts:352] [E: packages/coding-agent/src/core/session-manager.ts:1280] [E: packages/coding-agent/src/core/session-manager.ts:358] [E: packages/coding-agent/src/core/session-manager.ts:160] [E: packages/coding-agent/src/core/session-manager.ts:402] [E: packages/coding-agent/src/core/session-manager.ts:469]。

默认 session 目录由 cwd 编码成 `--<resolved-cwd-with-separators-replaced>--`,放在 agent dir 的 `sessions` 子目录下;`getDefaultSessionDir()` 会在目录不存在时创建它 [E: packages/coding-agent/src/core/session-manager.ts:476] [E: packages/coding-agent/src/core/session-manager.ts:479] [E: packages/coding-agent/src/core/session-manager.ts:480] [E: packages/coding-agent/src/core/session-manager.ts:483] [E: packages/coding-agent/src/core/session-manager.ts:486]。`SessionManager.list(cwd, sessionDir?)` 从目录读 `.jsonl`,构造 `SessionInfo`,必要时按 cwd 过滤,并按 `modified` 新到旧排序;`SessionManager.listAll()` 默认扫描 `getSessionsDir()` 下各 project 子目录,收集 `.jsonl` 后同样按 `modified` 新到旧排序 [E: packages/coding-agent/src/core/session-manager.ts:812] [E: packages/coding-agent/src/core/session-manager.ts:825] [E: packages/coding-agent/src/core/session-manager.ts:1670] [E: packages/coding-agent/src/core/session-manager.ts:1674] [E: packages/coding-agent/src/core/session-manager.ts:1677] [E: packages/coding-agent/src/core/session-manager.ts:1700] [E: packages/coding-agent/src/core/session-manager.ts:1706] [E: packages/coding-agent/src/core/session-manager.ts:1740]。

`buildSessionInfo()` 读取 header、message count、first user message、全文搜索文本、latest `session_info` name、`parentSessionPath` 和 created/modified 时间;这些字段是 resume 列表、搜索、命名显示和 threaded 展示可用的数据基础 [E: packages/coding-agent/src/core/session-manager.ts:688] [E: packages/coding-agent/src/core/session-manager.ts:714] [E: packages/coding-agent/src/core/session-manager.ts:715] [E: packages/coding-agent/src/core/session-manager.ts:719] [E: packages/coding-agent/src/core/session-manager.ts:733] [E: packages/coding-agent/src/core/session-manager.ts:735] [E: packages/coding-agent/src/core/session-manager.ts:741] [E: packages/coding-agent/src/core/session-manager.ts:756] [I]。

## `/resume` 与 session picker

用户文档说明 `/resume` 会为当前 project 打开 interactive session picker,`pi -r` 在启动时打开同一个 picker [E: packages/coding-agent/docs/sessions.md:39]。picker 的可见能力包括键入搜索、Ctrl+P 切换 path display、Ctrl+S 切换 sort mode、Ctrl+N 只看 named sessions、Ctrl+R rename、Ctrl+D 后确认删除 [E: packages/coding-agent/docs/sessions.md:41] [E: packages/coding-agent/docs/sessions.md:48]。删除行为的用户文档边界是:可用时使用 `trash` CLI,而不是永久删除文件 [E: packages/coding-agent/docs/sessions.md:50]。

`selectSession()` 的 index source 只证明 picker 封装层:它接收 current/all 两个 `SessionsLoader`,创建 startup TUI,实例化 `SessionSelectorComponent`,选中时停止 UI 并 resolve path,取消时停止 UI 并 resolve `null` [E: packages/coding-agent/src/cli/session-picker.ts:15] [E: packages/coding-agent/src/cli/session-picker.ts:16] [E: packages/coding-agent/src/cli/session-picker.ts:17] [E: packages/coding-agent/src/cli/session-picker.ts:20] [E: packages/coding-agent/src/cli/session-picker.ts:26] [E: packages/coding-agent/src/cli/session-picker.ts:29] [E: packages/coding-agent/src/cli/session-picker.ts:32] [E: packages/coding-agent/src/cli/session-picker.ts:33] [E: packages/coding-agent/src/cli/session-picker.ts:36] [E: packages/coding-agent/src/cli/session-picker.ts:40]。`SessionSelectorComponent` 内部的 threaded/recent/fuzzy 排序实现、active-session 删除拦截和 rename UI 细节不在本节点 index source 内,本页只把它们作为用户文档级能力或相邻实现边界处理 [U]。

## `/tree`:同文件内移动 leaf

用户文档把 `/tree` 定义为在当前 session tree 中跳到任意 previous point 并继续,且不会创建新文件 [E: packages/coding-agent/docs/sessions.md:69] [E: packages/coding-agent/docs/sessions.md:71]。`/tree`、`/fork`、`/clone` 对照表进一步写明 `/tree` 的 Output 是 same session file,View 是 full tree,Summary 可选 branch summary;`/fork` 和 `/clone` 的 Output 都是 new session file [E: packages/coding-agent/docs/sessions.md:118] [E: packages/coding-agent/docs/sessions.md:122] [E: packages/coding-agent/docs/sessions.md:123] [E: packages/coding-agent/docs/sessions.md:125]。

`SessionManager.branch(branchFromId)` 校验目标 entry 存在后只把 `leafId` 移到该 entry;`resetLeaf()` 把 `leafId` 设为 `null`,用于下一次 append 创建新的 root entry [E: packages/coding-agent/src/core/session-manager.ts:1374] [E: packages/coding-agent/src/core/session-manager.ts:1375] [E: packages/coding-agent/src/core/session-manager.ts:1378] [E: packages/coding-agent/src/core/session-manager.ts:1386] [E: packages/coding-agent/src/core/session-manager.ts:1387]。`branchWithSummary(branchFromId, summary, ...)` 先把 `leafId` 设到目标位置,再 append 一个 `branch_summary` entry;该 entry 的 `parentId` 是 `branchFromId`,并记录 `fromId`、`summary`、可选 `details` 和 `fromHook` [E: packages/coding-agent/src/core/session-manager.ts:1396] [E: packages/coding-agent/src/core/session-manager.ts:1406] [E: packages/coding-agent/src/core/session-manager.ts:1407] [E: packages/coding-agent/src/core/session-manager.ts:1410] [E: packages/coding-agent/src/core/session-manager.ts:1412] [E: packages/coding-agent/src/core/session-manager.ts:1413] [E: packages/coding-agent/src/core/session-manager.ts:1418]。

选择 user/custom message 时回填编辑器、选择 non-user entry 时只移动 leaf 的具体 handler 逻辑不在本节点 index source 内;本页只能引用用户文档的 selection behavior,不把 runtime handler 行为标为 `[E]` [E: packages/coding-agent/docs/sessions.md:102] [E: packages/coding-agent/docs/sessions.md:116] [U]。

## `/fork` 与 `/clone`:新文件继续

用户文档把 `/fork` 定义为从 previous user message 创建 new session,把 `/clone` 定义为 duplicate current active branch into a new session;对照表写明 `/fork` 的 View 是 user-message selector,`/clone` 的 View 是 current active branch,两者 Output 都是 new session file [E: packages/coding-agent/docs/sessions.md:31] [E: packages/coding-agent/docs/sessions.md:32] [E: packages/coding-agent/docs/sessions.md:120] [E: packages/coding-agent/docs/sessions.md:122] [E: packages/coding-agent/docs/sessions.md:123]。`SessionManager.createBranchedSession(leafId)` 是 index source 中可核到的底层文件抽取能力:它取 root-to-leaf path,过滤 label entry 并重新串接 retained path 的 `parentId`,创建新 header,并在持久化模式下让 `parentSession` 指向旧 session file [E: packages/coding-agent/src/core/session-manager.ts:1427] [E: packages/coding-agent/src/core/session-manager.ts:1429] [E: packages/coding-agent/src/core/session-manager.ts:1437] [E: packages/coding-agent/src/core/session-manager.ts:1442] [E: packages/coding-agent/src/core/session-manager.ts:1457] [E: packages/coding-agent/src/core/session-manager.ts:1467] [E: packages/coding-agent/src/core/session-manager.ts:1473]。

`createBranchedSession()` 还会把 path 上已有 label 作为新文件尾部的 label entries 重建;若新文件包含 assistant message,它立即 rewrite 新 JSONL 文件,否则延迟到后续 `_persist()` 路径写盘 [E: packages/coding-agent/src/core/session-manager.ts:1477] [E: packages/coding-agent/src/core/session-manager.ts:1479] [E: packages/coding-agent/src/core/session-manager.ts:1485] [E: packages/coding-agent/src/core/session-manager.ts:1504] [E: packages/coding-agent/src/core/session-manager.ts:1514] [E: packages/coding-agent/src/core/session-manager.ts:1516] [E: packages/coding-agent/src/core/session-manager.ts:1519]。`SessionManager.forkFrom(sourcePath, targetCwd, sessionDir?, options?)` 是跨 project/source file 的文件级 fork:读取 source entries,生成 target cwd 下的新 header,把 `parentSession` 设为 source path,再复制所有非 header entry [E: packages/coding-agent/src/core/session-manager.ts:1611] [E: packages/coding-agent/src/core/session-manager.ts:1619] [E: packages/coding-agent/src/core/session-manager.ts:1644] [E: packages/coding-agent/src/core/session-manager.ts:1649] [E: packages/coding-agent/src/core/session-manager.ts:1650] [E: packages/coding-agent/src/core/session-manager.ts:1655] [E: packages/coding-agent/src/core/session-manager.ts:1657]。

`/fork` 和 `/clone` 到 `createBranchedSession()` 的 exact interactive/RPC dispatch 不在 index source 中;当前三源能直接证明用户文档语义和 `SessionManager` 的新文件抽取/复制能力,不能直接证明每个 UI 命令如何调用底层 API [U]。

## 命名、重命名与 session info

用户文档给出 `/name <name>` 作为设置 human-readable session name 的命令,并说明启动时也可以用 `--name` 或 `-n`;named sessions 更容易在 `/resume` 和 `pi -r` 中找到 [E: packages/coding-agent/docs/sessions.md:52] [E: packages/coding-agent/docs/sessions.md:54] [E: packages/coding-agent/docs/sessions.md:60] [E: packages/coding-agent/docs/sessions.md:67]。`appendSessionInfo(name)` 会把换行替换为空格并 trim,再 append `type: "session_info"` entry;`getSessionName()` 从后往前找最新 `session_info`,并把空名视为清除 [E: packages/coding-agent/src/core/session-manager.ts:1150] [E: packages/coding-agent/src/core/session-manager.ts:1151] [E: packages/coding-agent/src/core/session-manager.ts:1153] [E: packages/coding-agent/src/core/session-manager.ts:1157] [E: packages/coding-agent/src/core/session-manager.ts:1164] [E: packages/coding-agent/src/core/session-manager.ts:1168] [E: packages/coding-agent/src/core/session-manager.ts:1170] [E: packages/coding-agent/src/core/session-manager.ts:1171]。

## `/share` 与 `/export`

`exportSessionToJsonl(sessionManager, outputPath?, createTrailingEntries?)` 写出一份 **current branch** JSONL:新 header(复用当前 session id/cwd、`version: CURRENT_SESSION_VERSION`)、再按 `getBranch()` 顺序复制 entry,并把 `parentId` 重写成从 `null` 起的线性链;可选 `createTrailingEntries(parentId, timestamp)` 接到最后一条之后 [E: packages/coding-agent/src/core/session-export.ts:7] [E: packages/coding-agent/src/core/session-export.ts:22] [E: packages/coding-agent/src/core/session-export.ts:32] [E: packages/coding-agent/src/core/session-export.ts:36] [E: packages/coding-agent/src/core/session-manager.ts:1274]。它不要求 session 文件已落盘,与 HTML export 的 “must have session file” 门控不同 [E: packages/coding-agent/src/core/session-export.ts:40]。

`exportSessionForShare()` 在这条 JSONL 末尾追加一条 `type: "custom"`、`customType: "pi.share"` 的 presentation entry:`data.systemPrompt` 是当前 `session.state.systemPrompt`,`data.tools` 是 active tools 的 name/description/parameters;不含 `renderedTools` / theme / version [E: packages/coding-agent/src/modes/interactive/session-share.ts:25] [E: packages/coding-agent/src/modes/interactive/session-share.ts:29] [E: packages/coding-agent/src/modes/interactive/session-share.ts:34] [E: packages/coding-agent/test/export-jsonl-share.test.ts:95] [E: packages/coding-agent/test/export-jsonl-share.test.ts:107]。这条 custom entry **不进入** LLM context:`sessionEntryToContextMessages()` 只投影 `message` / `custom_message` / `branch_summary` / `compaction`,其它 type(含 `custom`)返回空数组;回归测试对 share 文件 `open()` 后的 context roles 只有 user/assistant/toolResult [E: packages/coding-agent/src/core/session-manager.ts:383] [E: packages/coding-agent/src/core/session-manager.ts:407] [E: packages/coding-agent/src/core/session-manager.ts:104] [E: packages/coding-agent/test/export-jsonl-share.test.ts:113]。测试还断言 share 导出不改 conversation entry 的 id,只把 parentId 线性化,且普通 `exportToJsonl()` 不会写入 `pi.share` [E: packages/coding-agent/test/export-jsonl-share.test.ts:72] [E: packages/coding-agent/test/export-jsonl-share.test.ts:83]。

`shareSession()` 先 Radius 后 gist:有 `radius` provider 且能取到 token 时 POST organization-visible artifact,状态行只显示 `canonical_url` hyperlink;provider/token 缺失才检查 `gh auth status`,把 **HTML**(`exportToHtml`)做成 `--public=false` gist [E: packages/coding-agent/src/modes/interactive/session-share.ts:46] [E: packages/coding-agent/src/modes/interactive/session-share.ts:58] [E: packages/coding-agent/src/modes/interactive/session-share.ts:88] [E: packages/coding-agent/src/modes/interactive/session-share.ts:61] [E: packages/coding-agent/src/modes/interactive/session-share.ts:72] [E: packages/coding-agent/src/modes/interactive/session-share.ts:164]。Radius 上传一旦开始,失败也不会自动改走 gist [E: packages/coding-agent/src/modes/interactive/session-share.ts:132]。

用户文档把 `/export [file]` 写成 HTML-only;interactive `/export` 的分流以输出路径是否以 `.jsonl` 结尾为准,JSONL 走 `exportSessionToJsonl()`,否则 HTML。该 dispatch 在 `interactive-mode.ts`,不在本节点旧三源内,这里只记录 export helper 本身与文档漂移 [I] [U]。

## Gotcha

- `--session <path|id>` 的 path/id 解析、全局匹配后是否 fork 到当前 cwd、以及参数互斥校验都不在本节点 index source 中;这些事实需要用 CLI 入口节点或更宽 source 复核 [U]。
- `/clone` 是否在 interactive mode 中复用 fork runtime、以及 RPC wire 命令如何映射 fork/clone,不在本节点 index source 中;本页只保留用户文档语义和 `SessionManager.createBranchedSession()` 的文件级能力 [U]。
- 新 branched session 文件可能延迟写盘:当抽取出的 path 没有 assistant message 时,`createBranchedSession()` 将 `flushed` 置为 false,等待后续 `_persist()` 路径创建文件 [E: packages/coding-agent/src/core/session-manager.ts:1514] [E: packages/coding-agent/src/core/session-manager.ts:1516] [E: packages/coding-agent/src/core/session-manager.ts:1519]。

## 跨包关系

[subsys.coding-agent.session-manager](../../subsystems/coding-agent/session-manager.md) 是本节点的存储/树 API 下钻页:它应解释 `SessionManager` 如何 load、migrate、append、branch、list 和 build context;本节点只覆盖用户可见 resume/tree/fork/clone/name/delete workflow [I]。

[spine.session-state-model](../../spine/session-state-model.md) 是跨 `pi-agent-core` 与 `pi-coding-agent` 的 session tree 总览:本节点的 index source 只能证明 coding-agent `SessionManager` 的 root-to-leaf context 投影,不能证明 agent-core session hierarchy [I]。

[ref.coding-agent.session-format](../../reference/session-format.md) 应列全 JSONL v3 entry schema、版本迁移和兼容字段;本节点只引用 header、`parentSession`、`session_info`、`branch_summary` 等会话管理面直接触达的字段 [I]。

## Sources

- packages/coding-agent/src/core/session-manager.ts
- packages/coding-agent/src/core/session-export.ts
- packages/coding-agent/src/modes/interactive/session-share.ts
- packages/coding-agent/docs/sessions.md
- packages/coding-agent/src/cli/session-picker.ts
- packages/coding-agent/test/export-jsonl-share.test.ts

## 相关

- [spine.session-state-model](../../spine/session-state-model.md): 会话树如何从 current leaf 投影为 LLM context。
- [subsys.coding-agent.session-manager](../../subsystems/coding-agent/session-manager.md): `SessionManager` 的 JSONL 读写、tree index、branch 和 list 机制。
- [ref.coding-agent.session-format](../../reference/session-format.md): session JSONL v3 文件格式和 entry catalog。
