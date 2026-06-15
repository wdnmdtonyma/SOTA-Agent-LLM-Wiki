---
id: cmd.session-nav
title: Session navigation command catalog
kind: command
tier: T1
source: [commands.ts, types/command.ts, commands/add-dir/index.ts, commands/branch/index.ts, commands/resume/index.ts, commands/rename/index.ts, commands/session/index.ts, commands/clear/index.ts, commands/compact/index.ts, commands/compact/compact.ts, commands/clear/clear.ts, commands/rewind/index.ts, commands/rewind/rewind.ts, commands/tag/index.ts, commands/session/session.tsx]
symbols: [addDir, branch, resume, rename, session, clear, compact, rewind, tag]
related: [subsys.command-system, group.commands]
evidence: explicit
status: verified
updated: 2026-06-14
---

> Session navigation command catalog 覆盖改变当前会话、恢复历史会话、压缩上下文和标记会话的 slash commands。

## 能回答的问题

- `/clear`、`/compact`、`/rewind` 分别如何改变会话历史或上下文？
- `/resume` 和 `/branch` 有哪些 aliases？
- `/session` 为什么只在 remote mode 可见？
- 哪些 session navigation commands 是 `local`，哪些是 `local-jsx`？
- `/tag` 的可用性为什么只面向 ant 用户？

## 清单边界

本节点只覆盖 `cmd.session-nav` 分配的 9 个命令，权威清单来自 `COMMANDS` 和 `INTERNAL_ONLY_COMMANDS` 注册表；`Command` 是 `CommandBase` 与 `PromptCommand | LocalCommand | LocalJSXCommand` 的组合 [E: types/command.ts:205] [E: types/command.ts:206]。表中 `未声明` 表示当前 command object 没有显式字段，属于局部读源结论 [I]。没有 `availability` 字段的命令在 `meetsAvailabilityRequirement` 中直接通过 [E: commands.ts:418]。

## Catalog

| 命令 | aliases | kind | 来源 / availability | 参数 | 行为一句话 |
|---|---|---|---|---|---|
| `/add-dir` | 未声明 [I] | `local-jsx` [E: commands/add-dir/index.ts:4] | `COMMANDS` builtin entry [E: commands.ts:259] | `<path>` [E: commands/add-dir/index.ts:7] | 添加新的 working directory，并 lazy-load `./add-dir.js` 执行 UI flow [E: commands/add-dir/index.ts:6] [E: commands/add-dir/index.ts:8]。 |
| `/branch` | `fork` 仅在 `FORK_SUBAGENT` feature 未启用时提供 [E: commands/branch/index.ts:8] | `local-jsx` [E: commands/branch/index.ts:5] | `COMMANDS` builtin entry [E: commands.ts:262] | `[name]` [E: commands/branch/index.ts:10] | 在当前点创建 conversation branch [E: commands/branch/index.ts:9]。 |
| `/resume` | `continue` [E: commands/resume/index.ts:7] | `local-jsx` [E: commands/resume/index.ts:4] | `COMMANDS` builtin entry [E: commands.ts:298] | `[conversation id or search term]` [E: commands/resume/index.ts:8] | 恢复 previous conversation [E: commands/resume/index.ts:6]。 |
| `/rename` | 未声明 [I] | `local-jsx` [E: commands/rename/index.ts:4] | `COMMANDS` builtin entry [E: commands.ts:297]; `immediate` [E: commands/rename/index.ts:7] | `[name]` [E: commands/rename/index.ts:8] | 重命名当前 conversation [E: commands/rename/index.ts:6]。 |
| `/session` | `remote` [E: commands/session/index.ts:7] | `local-jsx` [E: commands/session/index.ts:5] | `COMMANDS` builtin entry [E: commands.ts:299]; `isEnabled` 依赖 `getIsRemoteMode()` [E: commands/session/index.ts:9] | 未声明 [I] | 展示 remote session URL 和 QR code [E: commands/session/index.ts:8]。 |
| `/clear` | `reset`, `new` [E: commands/clear/index.ts:14] | `local` [E: commands/clear/index.ts:11] | `COMMANDS` builtin entry [E: commands.ts:265]; non-interactive 不支持 [E: commands/clear/index.ts:15] | 未声明 [I] | 清空 conversation history 并释放 context [E: commands/clear/index.ts:13]。 |
| `/compact` | 未声明 [I] | `local` [E: commands/compact/index.ts:5] | `COMMANDS` builtin entry [E: commands.ts:267]; `DISABLE_COMPACT` 为真时禁用 [E: commands/compact/index.ts:9] | `<optional custom summarization instructions>` [E: commands/compact/index.ts:11] | 清空历史但保留 summary in context [E: commands/compact/index.ts:8]。 |
| `/rewind` | `checkpoint` [E: commands/rewind/index.ts:6] | `local` [E: commands/rewind/index.ts:8] | `COMMANDS` builtin entry [E: commands.ts:310]; non-interactive 不支持 [E: commands/rewind/index.ts:9] | 空 hint [E: commands/rewind/index.ts:7] | 将代码或 conversation 恢复到 previous point [E: commands/rewind/index.ts:4]。 |
| `/tag` | 未声明 [I] | `local-jsx` [E: commands/tag/index.ts:4] | `COMMANDS` builtin entry [E: commands.ts:305]; `USER_TYPE === 'ant'` 时启用 [E: commands/tag/index.ts:7] | `<tag-name>` [E: commands/tag/index.ts:8] | 切换当前 session 的 searchable tag [E: commands/tag/index.ts:6]。 |

## 复杂命令深挖

`/compact` 是本类最重的 `local` command：实现先截掉 compact boundary 之前的 messages [E: commands/compact/compact.ts:46]，空消息直接报错 [E: commands/compact/compact.ts:48] [E: commands/compact/compact.ts:49]，无自定义指令时先尝试 session memory compaction [E: commands/compact/compact.ts:57] [E: commands/compact/compact.ts:58]，再在传统路径里先 microcompact 后调用 `compactConversation` [E: commands/compact/compact.ts:98] [E: commands/compact/compact.ts:101]。成功结果返回 `type: 'compact'` 和 `compactionResult` [E: commands/compact/compact.ts:121] [E: commands/compact/compact.ts:122]。

`/session` 是 remote-mode UI command：组件从 AppState 读取 `remoteSessionUrl` [E: commands/session/session.tsx:19]，没有 URL 时渲染 “Not in remote mode” 提示 [E: commands/session/session.tsx:57] [E: commands/session/session.tsx:60]，有 URL 时生成 QR code [E: commands/session/session.tsx:30] 并显示 browser URL [E: commands/session/session.tsx:99]。

`/clear` 和 `/rewind` 都是低输出的本地状态命令：`/clear` 调用 `clearConversation(context)` 并返回空 text result [E: commands/clear/clear.ts:5] [E: commands/clear/clear.ts:6]；`/rewind` 只在 context 提供 `openMessageSelector` 时打开 selector，然后返回 `skip` 避免追加消息 [E: commands/rewind/rewind.ts:8] [E: commands/rewind/rewind.ts:9] [E: commands/rewind/rewind.ts:12]。

## Sources

- commands.ts
- types/command.ts
- commands/add-dir/index.ts
- commands/branch/index.ts
- commands/resume/index.ts
- commands/rename/index.ts
- commands/session/index.ts
- commands/clear/index.ts
- commands/compact/index.ts
- commands/compact/compact.ts
- commands/clear/clear.ts
- commands/rewind/index.ts
- commands/rewind/rewind.ts
- commands/tag/index.ts
- commands/session/session.tsx

## 相关

- [命令系统机制](../../subsystems/command-system.md)
