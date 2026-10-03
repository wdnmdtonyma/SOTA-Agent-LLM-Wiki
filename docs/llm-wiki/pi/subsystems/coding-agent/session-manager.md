---
id: subsys.coding-agent.session-manager
title: 会话管理(磁盘 JSONL)
kind: subsystem
tier: T2
pkg: coding-agent
source:
 - packages/coding-agent/src/core/session-manager.ts
 - packages/coding-agent/src/core/session-cwd.ts
 - packages/coding-agent/src/core/session-export.ts
 - packages/coding-agent/src/modes/interactive/session-share.ts
 - packages/coding-agent/test/export-jsonl-share.test.ts
 - packages/coding-agent/test/session-manager/file-operations.test.ts
 - packages/coding-agent/test/session-context-edit.test.ts
 - packages/coding-agent/CHANGELOG.md
symbols:
 - SessionManager
 - _appendEntry
 - _hasConversation
 - appendContextEdit
 - appendCompaction
 - buildSessionProjection
 - getEntries
 - getBranch
 - exportSessionToJsonl
related:
 - surface.sessions.management
 - ref.coding-agent.session-format
 - spine.session-state-model
evidence: explicit
status: verified
updated: 4c6fb7cfe8
---

> `SessionManager` 是 pi-coding-agent 产品层的 **canonical** session store：一个 JSONL 文件读成 `SessionHeader + SessionEntry[]`，内存里维护 `id`/`parentId` tree、current `leafId` 和 label cache，并把 append / branch / `buildSessionProjection()` 交给 `AgentSession`、CLI resume/fork/tree 和 extension context。产品 JSONL 没有第二套 agent-core disk repo。

## 能回答的问题

- pi-coding-agent 的 session JSONL 第一行和后续 entry 如何进入 `SessionManager`?
- `appendMessage()`、`appendCompaction()`、`appendContextEdit()` 如何维护 tree leaf?
- `buildSessionProjection()` / `buildSessionContext()` 怎样从 current leaf 还原发给 LLM 的 messages，`ContextEditEntry` 如何省略或替换 content?
- 新 session 文件何时真正创建？`_hasConversation()` 认哪些 message role?
- retain-none compaction 传入 `appendCompaction(summary, null, tokensBefore)` 时 `firstKeptEntryId` 写成什么?
- `branch()`、`branchWithSummary()`、`createBranchedSession()`、`forkFrom()` 分别改当前文件还是创建新文件?
- session list / resume 如何按 cwd、modified time 和 session name 读索引?
- `exportSessionToJsonl()` / `exportSessionForShare()` 如何用 `getBranch()` 写出线性 JSONL 而不改原文件?
- session header 里的 cwd 丢失时在哪里被阻断?

## 职责边界

`SessionManager` 管的是 coding-agent 产品层的 session file 和 branch tree，不是 provider streaming、agent-core loop 或 TUI 展示。它的 state 包括 `sessionId`、`sessionFile`、`sessionDir`、`cwd`、`persist`、`flushed`、`fileEntries`、`byId`、`labelsById`、`labelTimestampsById` 和 `leafId`。[E: packages/coding-agent/src/core/session-manager.ts:987] [E: packages/coding-agent/src/core/session-manager.ts:988] [E: packages/coding-agent/src/core/session-manager.ts:993] [E: packages/coding-agent/src/core/session-manager.ts:994] [E: packages/coding-agent/src/core/session-manager.ts:998]

文件格式由 `SessionHeader` 和 `SessionEntry` union 共同定义：header 保存 `type: "session"`、可选 `version`、`id`、`timestamp`、`cwd`、`parentSession`；entry union 包含 message、thinking/model change、usage、compaction、branch summary、extension custom/custom_message、`context_edit`、label 和 session info。[E: packages/coding-agent/src/core/session-manager.ts:43] [E: packages/coding-agent/src/core/session-manager.ts:175] [E: packages/coding-agent/src/core/session-manager.ts:183] [E: packages/coding-agent/src/core/session-manager.ts:192] [E: packages/coding-agent/src/core/session-manager.ts:197]

`session-cwd.ts` 只处理一个边界：对已打开的 session manager，如果 `getSessionFile()` 有值、header cwd 非空且路径不存在，`assertSessionCwdExists()` 抛 `MissingSessionCwdError`；session file 不存在或 cwd 为空/仍存在时不报错。[E: packages/coding-agent/src/core/session-cwd.ts:18] [E: packages/coding-agent/src/core/session-cwd.ts:24] [E: packages/coding-agent/src/core/session-cwd.ts:54] [E: packages/coding-agent/src/core/session-cwd.ts:57]

## 关键文件

- `packages/coding-agent/src/core/session-manager.ts`：`SessionHeader`、`SessionEntry`、migration、JSONL load/list helpers、`buildSessionProjection()` / `buildSessionContext()` 和 `SessionManager` 的权威实现。[E: packages/coding-agent/src/core/session-manager.ts:41] [E: packages/coding-agent/src/core/session-manager.ts:183] [E: packages/coding-agent/src/core/session-manager.ts:337] [E: packages/coding-agent/src/core/session-manager.ts:543] [E: packages/coding-agent/src/core/session-manager.ts:987]
- `packages/coding-agent/src/core/session-cwd.ts`：session cwd 失效检测、错误文案、prompt 文案和 `MissingSessionCwdError`。[E: packages/coding-agent/src/core/session-cwd.ts:35] [E: packages/coding-agent/src/core/session-cwd.ts:44]
- `packages/coding-agent/src/core/session-export.ts`：`exportSessionToJsonl()` 把 `getBranch()` 写成线性 JSONL，并允许 trailing export-only entries；`session-share.ts` 用它注入 `pi.share`。[E: packages/coding-agent/src/core/session-export.ts:32] [E: packages/coding-agent/src/modes/interactive/session-share.ts:50]

## 数据模型

每个非 header entry 都继承 `SessionEntryBase`：`type`、`id`、`parentId`、`timestamp`。`SessionTreeNode` 是 `getTree()` 返回的 defensive tree node，包含原 entry、children 和可选 resolved label/timestamp。[E: packages/coding-agent/src/core/session-manager.ts:57] [E: packages/coding-agent/src/core/session-manager.ts:59] [E: packages/coding-agent/src/core/session-manager.ts:200] [E: packages/coding-agent/src/core/session-manager.ts:202]

`SessionProjection` / `SessionContext` 是 read-time projection，不是磁盘 entry。`buildSessionProjection()` 返回带 `sourceEntry` 的 `ProjectedSessionEntry[]` 以及 flatten 后的 `messages`、`thinkingLevel` 和可选 `{ provider, modelId }`；`buildSessionContext()` 是后者的精简视图。[E: packages/coding-agent/src/core/session-manager.ts:209] [E: packages/coding-agent/src/core/session-manager.ts:216] [E: packages/coding-agent/src/core/session-manager.ts:223] [E: packages/coding-agent/src/core/session-manager.ts:1493] [E: packages/coding-agent/src/core/session-manager.ts:1497]

`SessionInfo` 是 list/resume 索引用的摘要，包含 path、id、cwd、name、parentSessionPath、created/modified、messageCount、firstMessage 和 allMessagesText。[E: packages/coding-agent/src/core/session-manager.ts:229] [E: packages/coding-agent/src/core/session-manager.ts:235] [E: packages/coding-agent/src/core/session-manager.ts:241]

`ReadonlySessionManager` 是 extension / host 可读 session view 的类型裁剪，只暴露 cwd、session path/id、leaf、entry lookup、label、branch、`buildContextEntries` / `buildSessionProjection`、header、entries、tree 和 session name 等 getter。[E: packages/coding-agent/src/core/session-manager.ts:245] [E: packages/coding-agent/src/core/session-manager.ts:256] [E: packages/coding-agent/src/core/session-manager.ts:261]

`ContextEditEntry` 是 append-only 的 branch-local 编辑：`type: "context_edit"`、`targetId`、`replacement: { content } | null`。它不改 target 的 raw JSONL 行。[E: packages/coding-agent/src/core/session-manager.ts:175] [E: packages/coding-agent/src/core/session-manager.ts:177] [E: packages/coding-agent/src/core/session-manager.ts:179]

## 控制流

1. `SessionManager.create(cwd, sessionDir?, options?)` 选择显式 sessionDir 或默认 session dir，然后创建 persisted manager。默认目录由 resolved cwd 编码到 `agentDir/sessions/--...--`，并确保目录存在。[E: packages/coding-agent/src/core/session-manager.ts:1755] [E: packages/coding-agent/src/core/session-manager.ts:1756] [E: packages/coding-agent/src/core/session-manager.ts:589] [E: packages/coding-agent/src/core/session-manager.ts:592] [E: packages/coding-agent/src/core/session-manager.ts:596]
2. constructor 规范化 cwd/sessionDir，按需创建目录；有 sessionFile 时走 `_setSessionFile(sessionFile, preloadedFileEntries)`，没有 sessionFile 时走 `newSession()`。[E: packages/coding-agent/src/core/session-manager.ts:1008] [E: packages/coding-agent/src/core/session-manager.ts:1015] [E: packages/coding-agent/src/core/session-manager.ts:1020] 公开 `setSessionFile()` 只转发 `_setSessionFile(sessionFile)`，不接收 preload。[E: packages/coding-agent/src/core/session-manager.ts:1025] [E: packages/coding-agent/src/core/session-manager.ts:1026]
3. `_setSessionFile()` 对存在文件优先使用 preload，否则 `loadEntriesFromFile()`。空文件（size 0）会 `newSession()` 后立刻 `_rewriteFile()` 并 `flushed = true`；非空但无有效 pi header 会抛错。成功加载后取 header id、按需 migration rewrite，再 `_buildIndex()`。[E: packages/coding-agent/src/core/session-manager.ts:1032] [E: packages/coding-agent/src/core/session-manager.ts:1036] [E: packages/coding-agent/src/core/session-manager.ts:1039] [E: packages/coding-agent/src/core/session-manager.ts:1043] [E: packages/coding-agent/src/core/session-manager.ts:1092] [E: packages/coding-agent/src/core/session-manager.ts:1100] 文件尚不存在时（例如 `--session` 指定新路径）只 `newSession()` 并保留显式 path，不立刻写盘。[E: packages/coding-agent/src/core/session-manager.ts:1051] [E: packages/coding-agent/src/core/session-manager.ts:1053]
4. `loadEntriesFromFile()` 用 1 MiB buffer streaming read JSONL，逐行 `JSON.parse`，跳过 malformed/blank line，最后要求第一条 entry 是带 string id 的 `session` header；不满足时返回空数组。[E: packages/coding-agent/src/core/session-manager.ts:604] [E: packages/coding-agent/src/core/session-manager.ts:627] [E: packages/coding-agent/src/core/session-manager.ts:646] [E: packages/coding-agent/src/core/session-manager.ts:664] [E: packages/coding-agent/src/core/session-manager.ts:665]
5. `newSession()` 校验可选 id，生成 v3 header，把 `fileEntries` 重置为 `[header]`，清空 indexes 和 leaf，`flushed = false`。persisted mode 文件名是 `${timestamp}_${sessionId}.jsonl`，但实际写盘由后续 persist path 决定。[E: packages/coding-agent/src/core/session-manager.ts:1057] [E: packages/coding-agent/src/core/session-manager.ts:1063] [E: packages/coding-agent/src/core/session-manager.ts:1065] [E: packages/coding-agent/src/core/session-manager.ts:1071] [E: packages/coding-agent/src/core/session-manager.ts:1076] [E: packages/coding-agent/src/core/session-manager.ts:1080]
6. 各 append API 在各自方法里构造带 `id: generateId(this.byId)`、`parentId: this.leafId`、ISO timestamp 的 entry，然后进 `_appendEntry()`。`_appendEntry()` 把 entry 加到 `fileEntries`、`byId`，把 `leafId` 推进到新 entry，最后调用 `_persist()`。[E: packages/coding-agent/src/core/session-manager.ts:1191] [E: packages/coding-agent/src/core/session-manager.ts:1194] [E: packages/coding-agent/src/core/session-manager.ts:1204] [E: packages/coding-agent/src/core/session-manager.ts:1208] [E: packages/coding-agent/src/core/session-manager.ts:1261] [E: packages/coding-agent/src/core/session-manager.ts:1360]
7. `_persist()` 在 `_hasConversation()` 为 false 时延迟创建文件。`_hasConversation()` 扫描 `fileEntries`，只有出现 `type: "message"` 且 `message.role` 为 `"user"` 或 `"assistant"` 才返回 true；仅 model/thinking/system 等 setup entries 留在内存，打开再关闭且从未聊天不会留下文件。[E: packages/coding-agent/src/core/session-manager.ts:1166] [E: packages/coding-agent/src/core/session-manager.ts:1168] [E: packages/coding-agent/src/core/session-manager.ts:1176] [E: packages/coding-agent/test/session-manager/file-operations.test.ts:447] [E: packages/coding-agent/test/session-manager/file-operations.test.ts:452] 从第一条 user **或** assistant message 起落盘：changelog #10000 明确第一轮若未完成仍把 prompt 留在磁盘。[E: packages/coding-agent/src/core/session-manager.ts:1168] [E: packages/coding-agent/test/session-manager/file-operations.test.ts:456] [E: packages/coding-agent/test/session-manager/file-operations.test.ts:462] [E: packages/coding-agent/CHANGELOG.md:207] 一旦 `_hasConversation()` 为 true 且尚未 flushed，用 `"wx"` 写出全部 `fileEntries`，之后只 append 新 entry 行。[E: packages/coding-agent/src/core/session-manager.ts:1177] [E: packages/coding-agent/src/core/session-manager.ts:1187]
8. `appendCompaction(summary, firstKeptEntryId, tokensBefore, ...)` 的 `firstKeptEntryId` 可为 `null`：写入时 `firstKeptEntryId ?? id`，retain-none 把 kept boundary 设成 compaction 自己的 id，投影不再保留任何前置 entry。[E: packages/coding-agent/src/core/session-manager.ts:1261] [E: packages/coding-agent/src/core/session-manager.ts:1263] [E: packages/coding-agent/src/core/session-manager.ts:1278] [E: packages/coding-agent/test/session-context-edit.test.ts:132] `appendContextEdit(targetId, replacement)` 校验 target 在 active branch 且贡献可编辑模型内容后追加 `type: "context_edit"`；`replacement: null` 表示省略，非 null 只换 content。assistant / toolResult 的 string replacement 会先归一成单元素 text block。[E: packages/coding-agent/src/core/session-manager.ts:1360] [E: packages/coding-agent/src/core/session-manager.ts:1371] [E: packages/coding-agent/src/core/session-manager.ts:1374] [E: packages/coding-agent/src/core/session-manager.ts:1382] [E: packages/coding-agent/src/core/session-manager.ts:1388]
9. `buildSessionPath()` 从 leaf 沿 `parentId` 回溯到 root 再反转；`getSessionContextSettings()` 沿 path 收集最后的 thinking/model，assistant message 会把 model 推成其 provider/model。[E: packages/coding-agent/src/core/session-manager.ts:390] [E: packages/coding-agent/src/core/session-manager.ts:418] [E: packages/coding-agent/src/core/session-manager.ts:425] `buildContextEntries()` 若 path 上有 compaction，先放最新 compaction，再从 `firstKeptEntryId` 起到 compaction 之前追加非 system 的 retained entries，最后追加 compaction 之后的 entries。[E: packages/coding-agent/src/core/session-manager.ts:476] [E: packages/coding-agent/src/core/session-manager.ts:499] [E: packages/coding-agent/src/core/session-manager.ts:503] [E: packages/coding-agent/src/core/session-manager.ts:510] `buildSessionProjection()` 再把选中 entries 上每个 target 的最新 `context_edit` 应用到 `projectContextEntry()`：`replacement === null` 产出空 messages，content replacement 只改 content。若 retained range 里还有更旧的 compaction（index > 0），那条不贡献 checkpoint/summary。[E: packages/coding-agent/src/core/session-manager.ts:543] [E: packages/coding-agent/src/core/session-manager.ts:551] [E: packages/coding-agent/src/core/session-manager.ts:519] [E: packages/coding-agent/src/core/session-manager.ts:523] [E: packages/coding-agent/src/core/session-manager.ts:562] `sessionEntryToContextMessages()` 对 `custom` / `usage` / `context_edit` / label / session_info 等返回 `[]`。[E: packages/coding-agent/src/core/session-manager.ts:465]
10. `branch(entryId)` 只移动内存 leaf 到已有 entry；`resetLeaf()` 把 leaf 置为 null；`branchWithSummary()` 先把 leaf 设到目标，再 append 一条 `branch_summary` entry，所以它会产生新 tree node。[E: packages/coding-agent/src/core/session-manager.ts:1579] [E: packages/coding-agent/src/core/session-manager.ts:1583] [E: packages/coding-agent/src/core/session-manager.ts:1591] [E: packages/coding-agent/src/core/session-manager.ts:1600] [E: packages/coding-agent/src/core/session-manager.ts:1611]
11. `createBranchedSession(leafId)` 从当前 tree 抽取 root-to-leaf path，过滤 label entry 后重新串接 retained path 的 parent chain，再把 resolved labels 作为尾部 label entries 重写进新 session。persisted mode 会创建新 session file 并记录 `parentSession` 为旧文件；落盘仍走 `_hasConversation()`：抽出的 path 已有 user/assistant 才立刻 `_rewriteFile()`。[E: packages/coding-agent/src/core/session-manager.ts:1632] [E: packages/coding-agent/src/core/session-manager.ts:1642] [E: packages/coding-agent/src/core/session-manager.ts:1681] [E: packages/coding-agent/src/core/session-manager.ts:1719] [E: packages/coding-agent/src/core/session-manager.ts:1720]
12. `SessionManager.list()` 读取一个 session dir 中的 `.jsonl`，构造 `SessionInfo`，必要时按 cwd 过滤，并按 `modified` 新到旧排序。`listAll()` 默认扫描 `getSessionsDir()` 下各 project 子目录，收集 `.jsonl` 后同样按 `modified` 排序。[E: packages/coding-agent/src/core/session-manager.ts:1900] [E: packages/coding-agent/src/core/session-manager.ts:1907] [E: packages/coding-agent/src/core/session-manager.ts:1914] [E: packages/coding-agent/src/core/session-manager.ts:1949] [E: packages/coding-agent/src/core/session-manager.ts:1953]
13. `getBranch(fromId?)` 从 leaf（或指定 id）沿 `parentId` 走到 root 再 reverse，返回路径上**全部** entry type，不经过 compaction 过滤；`buildSessionProjection()` 才做 LLM 投影。[E: packages/coding-agent/src/core/session-manager.ts:1469] [E: packages/coding-agent/src/core/session-manager.ts:1477] [E: packages/coding-agent/src/core/session-manager.ts:1493] `exportSessionToJsonl()` 经 `serializeSessionBranch()` 消费这条 branch：写新 header，把每条 entry 的 `parentId` 重写成线性链，再可选追加 trailing export-only entries。[E: packages/coding-agent/src/core/session-export.ts:9] [E: packages/coding-agent/src/core/session-export.ts:23] [E: packages/coding-agent/src/core/session-export.ts:32] `exportSessionForShare()` 的 trailing entry 是 `customType: "pi.share"`（`systemPrompt` + tools）；它写到独立输出文件，不调用 `appendCustomEntry()`，因此不推进 live session 的 `leafId`。[E: packages/coding-agent/src/modes/interactive/session-share.ts:50] [E: packages/coding-agent/src/modes/interactive/session-share.ts:33] [E: packages/coding-agent/test/export-jsonl-share.test.ts:95] `sessionEntryToContextMessages()` 对 `type: "custom"` 返回 `[]`，所以 share metadata 不会变成 LLM message。[E: packages/coding-agent/src/core/session-manager.ts:465] [E: packages/coding-agent/test/export-jsonl-share.test.ts:113]

## 设计动机与权衡

`SessionManager` 使用 append-only tree entry 而不是原地修改历史：普通 append 将新 entry 接到 current leaf，branch 只移动内存 leaf，后续 append 自然形成 sibling branch。这让一个 JSONL 文件可以保留多条候选路径。[E: packages/coding-agent/src/core/session-manager.ts:1191] [E: packages/coding-agent/src/core/session-manager.ts:1208] [E: packages/coding-agent/src/core/session-manager.ts:1579] [E: packages/coding-agent/src/core/session-manager.ts:1583] [I]

磁盘持久化有一个延迟写入策略：出现 user 或 assistant message 之前，新 session 的文件可能还没真正落盘。这减少只有 header 或 setup entries 的空文件，但也意味着依赖 `getSessionFile()` 的调用方不能把路径存在性等同于文件已创建。`createBranchedSession()` 复用同一规则。[E: packages/coding-agent/src/core/session-manager.ts:1156] [E: packages/coding-agent/src/core/session-manager.ts:1166] [E: packages/coding-agent/src/core/session-manager.ts:1176] [E: packages/coding-agent/src/core/session-manager.ts:1719] [I]

`buildSessionInfo()` 用 user/assistant message timestamp 作为 preferred modified time，否则回退 header timestamp，最后才回退 filesystem mtime。这让 resume list 的排序更贴近会话内最后一次 user/assistant activity，而不是单纯文件 mtime。[E: packages/coding-agent/src/core/session-manager.ts:785] [E: packages/coding-agent/src/core/session-manager.ts:859] [E: packages/coding-agent/src/core/session-manager.ts:864] [I]

`ContextEditEntry` 把“改未来模型 context”从“改 raw history”里拆出来：省略或替换只作用在 `buildSessionProjection()`，切到 edit 之前的 leaf 会再次看到原始 content。[E: packages/coding-agent/src/core/session-manager.ts:175] [E: packages/coding-agent/test/session-context-edit.test.ts:37] [E: packages/coding-agent/test/session-context-edit.test.ts:55] [E: packages/coding-agent/test/session-context-edit.test.ts:119] [I]

## Gotcha

- `parseSessionEntries()` 和 `loadEntriesFromFile()` 都跳过 malformed line，但 `loadEntriesFromFile()` 还要求第一条有效 entry 是 session header。坏行不会抛 parse error；非 pi session 会变成空 entries，或在 `_setSessionFile()` 中对非空文件抛错。[E: packages/coding-agent/src/core/session-manager.ts:355] [E: packages/coding-agent/src/core/session-manager.ts:364] [E: packages/coding-agent/src/core/session-manager.ts:664] [E: packages/coding-agent/src/core/session-manager.ts:1039]
- v1 session 没有 `version`；migration 用 `header?.version ?? 1`。v1 → v2 会给每个 entry 生成 id/parentId 并把 legacy `firstKeptEntryIndex` 转成 `firstKeptEntryId`；v2 → v3 会把 message role `hookMessage` 改成 `custom`。[E: packages/coding-agent/src/core/session-manager.ts:287] [E: packages/coding-agent/src/core/session-manager.ts:297] [E: packages/coding-agent/src/core/session-manager.ts:304] [E: packages/coding-agent/src/core/session-manager.ts:316] [E: packages/coding-agent/src/core/session-manager.ts:326] [E: packages/coding-agent/src/core/session-manager.ts:339]
- label 是普通 tree entry，但 `_buildIndex()` 把最新 label value 另存到 `labelsById`。清空 label 通过写一条 `label` falsy 的 label entry 完成，不是删除旧 entry。[E: packages/coding-agent/src/core/session-manager.ts:1112] [E: packages/coding-agent/src/core/session-manager.ts:1117] [E: packages/coding-agent/src/core/session-manager.ts:1441] [E: packages/coding-agent/src/core/session-manager.ts:1458]
- `getTree()` 对 orphaned entries 采取宽容策略：parentId 缺失时把 node 当作 root 返回；它还用 iterative stack 排序 children，避免深树递归。[E: packages/coding-agent/src/core/session-manager.ts:1529] [E: packages/coding-agent/src/core/session-manager.ts:1552] [E: packages/coding-agent/src/core/session-manager.ts:1559]
- `SessionManager.open(path, sessionDir?, cwdOverride?)` 只在 `cwdOverride === undefined` 时调用 `readSessionHeader()`（扫描失败则 `loadEntriesFromFile` preload）；有 override 时不扫 header，cwd 直接用 override。`sessionDir` 不传时从 session file 的 parent directory 派生；preload 只传给 constructor 的 `_setSessionFile`，不经过公开 `setSessionFile()`。[E: packages/coding-agent/src/core/session-manager.ts:1766] [E: packages/coding-agent/src/core/session-manager.ts:1770] [E: packages/coding-agent/src/core/session-manager.ts:1782] [E: packages/coding-agent/src/core/session-manager.ts:1784] [E: packages/coding-agent/src/core/session-manager.ts:1785]
- `forkFrom()` **立刻** `writeFileSync(..., { flag: "wx" })` 写出新 header 并复制全部非 header entry，不走 `_hasConversation()` 延迟。这与 `create()` / `createBranchedSession()` 的延迟落盘不同。[E: packages/coding-agent/src/core/session-manager.ts:1848] [E: packages/coding-agent/src/core/session-manager.ts:1856] [E: packages/coding-agent/src/core/session-manager.ts:1859]
- `appendContextEdit` 不改 target 的 raw JSONL 行。`replacement: null` 只让未来 `buildSessionProjection()` 省略该 target；切到 edit 之前的 leaf 会再次看到原始 content。[E: packages/coding-agent/src/core/session-manager.ts:175] [E: packages/coding-agent/src/core/session-manager.ts:523] [E: packages/coding-agent/src/core/session-manager.ts:553] [E: packages/coding-agent/test/session-context-edit.test.ts:125]

## 跨包边界

[surface.sessions.management](../../surface/sessions/management.md) 覆盖 `/resume`、`/tree`、`/fork`、`/clone` 等用户可见 session workflow；本节点只解释这些 workflow 依赖的 `SessionManager` storage/tree primitive。[I]

[ref.coding-agent.session-format](../../reference/session-format.md) 做 entry/file format catalog；本节点只解释 `SessionManager` 如何读取、迁移、append、branch、list 和 project cwd 校验。[I]

[spine.session-state-model](../../spine/session-state-model.md) 把产品 `SessionManager` JSONL、durable `createSession`/`Storage`、以及 `pi-agent-core` 进程内 `AgentState.messages` 分成三套互不替代的系统。本节点是产品 JSONL 的权威实现：canonical provider context 来自 `buildSessionProjection()`，不是另一套 disk repo。[I]

## Sources

- packages/coding-agent/src/core/session-manager.ts
- packages/coding-agent/src/core/session-cwd.ts
- packages/coding-agent/src/core/session-export.ts
- packages/coding-agent/src/modes/interactive/session-share.ts
- packages/coding-agent/test/export-jsonl-share.test.ts
- packages/coding-agent/test/session-manager/file-operations.test.ts
- packages/coding-agent/test/session-context-edit.test.ts
- packages/coding-agent/CHANGELOG.md

## 相关

- [surface.sessions.management](../../surface/sessions/management.md): session 的用户可见 resume/tree/fork/clone 工作流。
- [ref.coding-agent.session-format](../../reference/session-format.md): coding-agent session JSONL v3 文件格式 catalog。
- [spine.session-state-model](../../spine/session-state-model.md): 产品 SessionManager、durable session 与进程内 AgentState 的分层。
