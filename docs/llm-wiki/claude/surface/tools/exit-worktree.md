---
id: tool.exit-worktree
path: surface/tools/exit-worktree.md
title: ExitWorktree
kind: tool
tier: T1
status: verified
source: [tools/ExitWorktreeTool/ExitWorktreeTool.ts]
symbols: [ExitWorktreeTool]
related: [tool.enter-worktree]
updated: 2026-06-14
evidence: explicit
---

`ExitWorktree` 是退出当前 session 的 `EnterWorktree` worktree, 并按 `keep` 或 `remove` 决定保留 worktree 或清理 worktree; git-backed remove 还会删除临时 branch。[E: tools/ExitWorktreeTool/constants.ts:1][E: tools/ExitWorktreeTool/ExitWorktreeTool.ts:148][E: tools/ExitWorktreeTool/ExitWorktreeTool.ts:167][E: tools/ExitWorktreeTool/ExitWorktreeTool.ts:261][E: tools/ExitWorktreeTool/ExitWorktreeTool.ts:290][E: utils/worktree.ts:825][E: utils/worktree.ts:867]

## 能回答的问题

- `ExitWorktree` 如何防止误删非当前 session 创建的 worktree?
- `discard_changes` 在什么条件下必需?
- `keep` 和 `remove` 分支分别修改哪些 session state?

## 1 Identity

- Tool name: `ExitWorktree`。[E: tools/ExitWorktreeTool/constants.ts:1][E: tools/ExitWorktreeTool/ExitWorktreeTool.ts:149]
- `tools.ts` 仅在 `isWorktreeModeEnabled()` 为真时把 `ExitWorktreeTool` 放入 base tools。[E: tools.ts:225]
- `searchHint`: `exit a worktree session and return to the original directory`。[E: tools/ExitWorktreeTool/ExitWorktreeTool.ts:150]
- `maxResultSizeChars`: `100_000`。[E: tools/ExitWorktreeTool/ExitWorktreeTool.ts:151]
- `userFacingName()`: `Exiting worktree`。[E: tools/ExitWorktreeTool/ExitWorktreeTool.ts:164][E: tools/ExitWorktreeTool/ExitWorktreeTool.ts:165]

## 2 用途定位

`ExitWorktree` 只操作 `EnterWorktree` 在当前 session 设置的 `currentWorktreeSession`; 如果没有 active session, validation 返回 no-op error, 不会触碰手动创建或旧 session 的 worktree。[E: tools/ExitWorktreeTool/ExitWorktreeTool.ts:180][E: tools/ExitWorktreeTool/ExitWorktreeTool.ts:185][E: tools/ExitWorktreeTool/ExitWorktreeTool.ts:186]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| `action` | `keep | remove` | 是 | 无 | `keep` 保留 worktree/branch; `remove` 清理 worktree, git-backed cleanup 才会删除临时 branch。[E: tools/ExitWorktreeTool/ExitWorktreeTool.ts:32][E: tools/ExitWorktreeTool/ExitWorktreeTool.ts:35][E: utils/worktree.ts:867] |
| `discard_changes` | `boolean` | 否 | `undefined` | 当 `action="remove"` 且 worktree 有 uncommitted files 或 unmerged commits 时需要显式 true。[E: tools/ExitWorktreeTool/ExitWorktreeTool.ts:37][E: tools/ExitWorktreeTool/ExitWorktreeTool.ts:42] |

## 4 输出 & maxResultSizeChars

输出 schema 包含 action、originalCwd、worktreePath、可选 branch/tmux session、discarded file/commit counts 和 message。[E: tools/ExitWorktreeTool/ExitWorktreeTool.ts:49][E: tools/ExitWorktreeTool/ExitWorktreeTool.ts:56] `mapToolResultToToolResultBlockParam()` 把 message 原样返回给模型。[E: tools/ExitWorktreeTool/ExitWorktreeTool.ts:322][E: tools/ExitWorktreeTool/ExitWorktreeTool.ts:325]

## 5 行为标志

| 标志 | 实际值 | 原因 |
| --- | --- | --- |
| `shouldDefer` | `true` | 工具定义显式设置 deferred loading。[E: tools/ExitWorktreeTool/ExitWorktreeTool.ts:167] |
| `isDestructive(input)` | `input.action === 'remove'` | 只有 remove 分支被标为 destructive。[E: tools/ExitWorktreeTool/ExitWorktreeTool.ts:168][E: tools/ExitWorktreeTool/ExitWorktreeTool.ts:169] |
| `isConcurrencySafe()` | 默认 `false` | 未看到工具自定义该方法[I]; `buildTool` 默认 false, 且 `call()` 切换 cwd 并清理 worktree state。[E: tools/ExitWorktreeTool/ExitWorktreeTool.ts:290][E: tools/ExitWorktreeTool/ExitWorktreeTool.ts:291][E: Tool.ts:759] |
| `isReadOnly()` | 默认 `false` | 未看到工具自定义该方法[I]; `buildTool` 默认 false, 且 remove 分支会清理 worktree。[E: tools/ExitWorktreeTool/ExitWorktreeTool.ts:290][E: Tool.ts:760] |
| `checkPermissions()` | 默认 allow | 未看到工具自定义该方法[I]; `buildTool` 默认 allow; destructive 标记来自 `isDestructive()`。[E: tools/ExitWorktreeTool/ExitWorktreeTool.ts:168][E: Tool.ts:762][E: Tool.ts:766] |

## 6 权限

`validateInput()` 先调用 `getCurrentWorktreeSession()`, 没有 session 时返回 errorCode 1 且 message 明确说没有 filesystem changes。[E: tools/ExitWorktreeTool/ExitWorktreeTool.ts:180][E: tools/ExitWorktreeTool/ExitWorktreeTool.ts:185][E: tools/ExitWorktreeTool/ExitWorktreeTool.ts:186] `action="remove"` 且未传 `discard_changes` 时, 工具会统计 changed files 和 commits; 无法可靠统计时返回 errorCode 3, 存在未提交文件或 commits 时返回 errorCode 2。[E: tools/ExitWorktreeTool/ExitWorktreeTool.ts:190][E: tools/ExitWorktreeTool/ExitWorktreeTool.ts:199][E: tools/ExitWorktreeTool/ExitWorktreeTool.ts:218]

## 7 call() 走读

`call()` 再次读取 current session, 如果 validation 和 execution 之间 session 丢失则抛出 `Not in a worktree session`。[E: tools/ExitWorktreeTool/ExitWorktreeTool.ts:228][E: tools/ExitWorktreeTool/ExitWorktreeTool.ts:232] keep 分支调用 `keepWorktree()`, 再 `restoreSessionToOriginalCwd(...)`, 记录 `tengu_worktree_kept`, 并返回保留路径和可选 tmux reattach 提示。[E: tools/ExitWorktreeTool/ExitWorktreeTool.ts:262][E: tools/ExitWorktreeTool/ExitWorktreeTool.ts:263][E: tools/ExitWorktreeTool/ExitWorktreeTool.ts:265][E: tools/ExitWorktreeTool/ExitWorktreeTool.ts:281]

remove 分支先 kill tmux session, 再 `cleanupWorktree()`, 恢复原 cwd/session state, 记录 `tengu_worktree_removed`, 并把 discarded commits/files 写进输出。[E: tools/ExitWorktreeTool/ExitWorktreeTool.ts:288][E: tools/ExitWorktreeTool/ExitWorktreeTool.ts:290][E: tools/ExitWorktreeTool/ExitWorktreeTool.ts:291][E: tools/ExitWorktreeTool/ExitWorktreeTool.ts:293][E: tools/ExitWorktreeTool/ExitWorktreeTool.ts:297][E: tools/ExitWorktreeTool/ExitWorktreeTool.ts:316][E: tools/ExitWorktreeTool/ExitWorktreeTool.ts:318] `restoreSessionToOriginalCwd()` 会设置 shell cwd/original cwd/project root、清空 worktree state、清空 prompt/memory/plans caches。[E: tools/ExitWorktreeTool/ExitWorktreeTool.ts:126][E: tools/ExitWorktreeTool/ExitWorktreeTool.ts:129][E: tools/ExitWorktreeTool/ExitWorktreeTool.ts:136][E: tools/ExitWorktreeTool/ExitWorktreeTool.ts:142][E: tools/ExitWorktreeTool/ExitWorktreeTool.ts:145]

## 8 渲染

工具定义挂载从 `UI.js` 导入的 `renderToolUseMessage` 和 `renderToolResultMessage`。[E: tools/ExitWorktreeTool/ExitWorktreeTool.ts:28][E: tools/ExitWorktreeTool/ExitWorktreeTool.ts:225][E: tools/ExitWorktreeTool/ExitWorktreeTool.ts:226] 模型侧结果只包含最终 message。[E: tools/ExitWorktreeTool/ExitWorktreeTool.ts:322][E: tools/ExitWorktreeTool/ExitWorktreeTool.ts:327]

## 9 设计动机·edge·历史

- `countWorktreeChanges()` 对 git status/rev-list 失败或没有 baseline commit 返回 `null`, validation 把 null 当 unsafe 处理。[E: tools/ExitWorktreeTool/ExitWorktreeTool.ts:90][E: tools/ExitWorktreeTool/ExitWorktreeTool.ts:97][E: tools/ExitWorktreeTool/ExitWorktreeTool.ts:108][E: tools/ExitWorktreeTool/ExitWorktreeTool.ts:195]
- validation 时和 execution 时都会检查 session; 这是因为 `currentWorktreeSession` 是 module-level mutable state[I]。[E: utils/worktree.ts:156][E: tools/ExitWorktreeTool/ExitWorktreeTool.ts:180][E: tools/ExitWorktreeTool/ExitWorktreeTool.ts:228]
- remove 分支的 analytics 使用 execution-time recount, validation-time state 只承担 safety gate[I]。[E: tools/ExitWorktreeTool/ExitWorktreeTool.ts:256][E: tools/ExitWorktreeTool/ExitWorktreeTool.ts:259][E: tools/ExitWorktreeTool/ExitWorktreeTool.ts:293][E: tools/ExitWorktreeTool/ExitWorktreeTool.ts:297]

## Sources

- `tools/ExitWorktreeTool/ExitWorktreeTool.ts`
- `tools/ExitWorktreeTool/constants.ts`
- `tools.ts`
- `Tool.ts`

## 相关

- [EnterWorktree](enter-worktree.md)
