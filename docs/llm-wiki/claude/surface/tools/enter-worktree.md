---
id: tool.enter-worktree
path: surface/tools/enter-worktree.md
title: EnterWorktree
kind: tool
tier: T1
status: verified
source: [tools/EnterWorktreeTool/EnterWorktreeTool.ts]
symbols: [EnterWorktreeTool]
related: [tool.exit-worktree]
updated: 2026-06-14
evidence: explicit
---

`EnterWorktree` 是通过 git 或 configured hooks 创建隔离 worktree 并把当前 Claude session 切入该 worktree 的 deferred 工具。[E: tools/EnterWorktreeTool/constants.ts:1][E: tools/EnterWorktreeTool/EnterWorktreeTool.ts:52][E: tools/EnterWorktreeTool/EnterWorktreeTool.ts:57][E: tools/EnterWorktreeTool/EnterWorktreeTool.ts:71][E: tools/EnterWorktreeTool/EnterWorktreeTool.ts:92][E: tools/EnterWorktreeTool/EnterWorktreeTool.ts:94][E: utils/worktree.ts:715][E: utils/worktree.ts:742]

## 能回答的问题

- `EnterWorktree` 的 `name` slug 如何校验?
- `EnterWorktree` 会修改哪些 cwd/session cache?
- `EnterWorktree` 如何防止在同一 session 中重复进入 worktree?

## 1 Identity

- Tool name: `EnterWorktree`。[E: tools/EnterWorktreeTool/constants.ts:1][E: tools/EnterWorktreeTool/EnterWorktreeTool.ts:53]
- `tools.ts` 仅在 `isWorktreeModeEnabled()` 为真时把 `EnterWorktreeTool` 放入 base tools。[E: tools.ts:225]
- `searchHint`: `create an isolated git worktree and switch into it`。[E: tools/EnterWorktreeTool/EnterWorktreeTool.ts:54]
- `maxResultSizeChars`: `100_000`。[E: tools/EnterWorktreeTool/EnterWorktreeTool.ts:55]
- `userFacingName()`: `Creating worktree`。[E: tools/EnterWorktreeTool/EnterWorktreeTool.ts:68][E: tools/EnterWorktreeTool/EnterWorktreeTool.ts:69]

## 2 用途定位

`EnterWorktree` 用于创建 session-scoped isolated worktree via git or configured hooks, 然后切换 process cwd、shell cwd、original cwd、worktree state 和 prompt/memory caches, 让后续工具在 worktree 内执行。[E: tools/EnterWorktreeTool/EnterWorktreeTool.ts:57][E: tools/EnterWorktreeTool/EnterWorktreeTool.ts:92][E: tools/EnterWorktreeTool/EnterWorktreeTool.ts:94][E: tools/EnterWorktreeTool/EnterWorktreeTool.ts:95][E: tools/EnterWorktreeTool/EnterWorktreeTool.ts:96][E: tools/EnterWorktreeTool/EnterWorktreeTool.ts:97][E: tools/EnterWorktreeTool/EnterWorktreeTool.ts:99][E: tools/EnterWorktreeTool/EnterWorktreeTool.ts:101][E: tools/EnterWorktreeTool/EnterWorktreeTool.ts:102]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| `name` | `string` | 否 | `getPlanSlug()` | worktree name; 每个 `/` 分隔 segment 只能包含 letters、digits、dots、underscores、dashes, 总长最多 64。[E: tools/EnterWorktreeTool/EnterWorktreeTool.ts:25][E: tools/EnterWorktreeTool/EnterWorktreeTool.ts:34][E: tools/EnterWorktreeTool/EnterWorktreeTool.ts:36][E: tools/EnterWorktreeTool/EnterWorktreeTool.ts:90] |

`name` 的 `superRefine` 调用 `validateWorktreeSlug(s)`, 失败时把错误 message 加到 zod issue。[E: tools/EnterWorktreeTool/EnterWorktreeTool.ts:29][E: tools/EnterWorktreeTool/EnterWorktreeTool.ts:31] `validateWorktreeSlug()` 会拒绝长度超过 64、`.`/`..` segment 和不匹配 allowlist 的 segment。[E: utils/worktree.ts:67][E: utils/worktree.ts:76][E: utils/worktree.ts:81]

## 4 输出 & maxResultSizeChars

输出 schema 包含 `worktreePath`、可选 `worktreeBranch` 和 `message`。[E: tools/EnterWorktreeTool/EnterWorktreeTool.ts:44][E: tools/EnterWorktreeTool/EnterWorktreeTool.ts:45][E: tools/EnterWorktreeTool/EnterWorktreeTool.ts:46] `mapToolResultToToolResultBlockParam()` 把 `message` 原样返回给模型。[E: tools/EnterWorktreeTool/EnterWorktreeTool.ts:120][E: tools/EnterWorktreeTool/EnterWorktreeTool.ts:123]

## 5 行为标志

| 标志 | 实际值 | 原因 |
| --- | --- | --- |
| `shouldDefer` | `true` | 工具定义显式设置 deferred loading。[E: tools/EnterWorktreeTool/EnterWorktreeTool.ts:71] |
| `isConcurrencySafe()` | 默认 `false` | 未看到工具自定义该方法[I]; `buildTool` 默认 false, 且 `call()` 会切换 process/session cwd。[E: tools/EnterWorktreeTool/EnterWorktreeTool.ts:94][E: Tool.ts:759] |
| `isReadOnly()` | 默认 `false` | 未看到工具自定义该方法[I]; `buildTool` 默认 false, 且 `call()` 创建 worktree 并写 session state。[E: tools/EnterWorktreeTool/EnterWorktreeTool.ts:92][E: tools/EnterWorktreeTool/EnterWorktreeTool.ts:97][E: Tool.ts:760] |
| `checkPermissions()` | 默认 allow | 未看到工具自定义该方法[I]; `buildTool` 默认 allow。[E: Tool.ts:762][E: Tool.ts:766] |
| `toAutoClassifierInput()` | `input.name ?? ''` | 分类器只接收显式 worktree name。[E: tools/EnterWorktreeTool/EnterWorktreeTool.ts:72][E: tools/EnterWorktreeTool/EnterWorktreeTool.ts:73] |

## 6 权限

未看到 `EnterWorktree` 自定义 `validateInput()` 或 `checkPermissions()`[I]; schema 层通过 `validateWorktreeSlug()` 限制 `name`, permission 采用 `buildTool` 默认 allow。[E: tools/EnterWorktreeTool/EnterWorktreeTool.ts:29][E: tools/EnterWorktreeTool/EnterWorktreeTool.ts:31][E: Tool.ts:762][E: Tool.ts:766]

## 7 call() 走读

`call()` 首先检查 `getCurrentWorktreeSession()`, 如果当前 session 已在 worktree 中就抛出 `Already in a worktree session`。[E: tools/EnterWorktreeTool/EnterWorktreeTool.ts:79][E: tools/EnterWorktreeTool/EnterWorktreeTool.ts:80] 接着通过 `findCanonicalGitRoot(getCwd())` 回到 main repo root, 必要时调用 `process.chdir()` 和 `setCwd()`。[E: tools/EnterWorktreeTool/EnterWorktreeTool.ts:84][E: tools/EnterWorktreeTool/EnterWorktreeTool.ts:86][E: tools/EnterWorktreeTool/EnterWorktreeTool.ts:87]

工具用传入 `name` 或 `getPlanSlug()` 作为 slug, 调用 `createWorktreeForSession(getSessionId(), slug)` 创建 session worktree。[E: tools/EnterWorktreeTool/EnterWorktreeTool.ts:90][E: tools/EnterWorktreeTool/EnterWorktreeTool.ts:92] 创建后它切换 process cwd、shell cwd、original cwd, 保存 worktree state, 清空 system prompt sections、memory caches 和 plans directory cache。[E: tools/EnterWorktreeTool/EnterWorktreeTool.ts:94][E: tools/EnterWorktreeTool/EnterWorktreeTool.ts:95][E: tools/EnterWorktreeTool/EnterWorktreeTool.ts:96][E: tools/EnterWorktreeTool/EnterWorktreeTool.ts:97][E: tools/EnterWorktreeTool/EnterWorktreeTool.ts:99][E: tools/EnterWorktreeTool/EnterWorktreeTool.ts:101][E: tools/EnterWorktreeTool/EnterWorktreeTool.ts:102]

## 8 渲染

工具定义挂载从 `UI.js` 导入的 `renderToolUseMessage` 和 `renderToolResultMessage`。[E: tools/EnterWorktreeTool/EnterWorktreeTool.ts:21][E: tools/EnterWorktreeTool/EnterWorktreeTool.ts:75][E: tools/EnterWorktreeTool/EnterWorktreeTool.ts:76] 模型侧结果只包含 `message`, 由 `mapToolResultToToolResultBlockParam()` 返回。[E: tools/EnterWorktreeTool/EnterWorktreeTool.ts:120][E: tools/EnterWorktreeTool/EnterWorktreeTool.ts:123]

## 9 设计动机·edge·历史

- `name` 支持 `/` 分层, 但 `utils/worktree.ts` 会把嵌套 slug flatten 成 `+`; 这样做避免 git ref 和目录 D/F conflict[I]。[E: utils/worktree.ts:217][E: utils/worktree.ts:218]
- `EnterWorktree` 只设置 `setOriginalCwd(getCwd())`, 对应 `ExitWorktree` 会恢复真实 original cwd。[E: tools/EnterWorktreeTool/EnterWorktreeTool.ts:96][E: tools/ExitWorktreeTool/ExitWorktreeTool.ts:126][E: tools/ExitWorktreeTool/ExitWorktreeTool.ts:129]
- 创建后清空 prompt/memory/plans caches; 目的是让后续 context 重新计算[I]。[E: tools/EnterWorktreeTool/EnterWorktreeTool.ts:99][E: tools/EnterWorktreeTool/EnterWorktreeTool.ts:101][E: tools/EnterWorktreeTool/EnterWorktreeTool.ts:102]

## Sources

- `tools/EnterWorktreeTool/EnterWorktreeTool.ts`
- `tools/EnterWorktreeTool/constants.ts`
- `tools/ExitWorktreeTool/ExitWorktreeTool.ts`
- `utils/worktree.ts`
- `tools.ts`
- `Tool.ts`

## 相关

- [ExitWorktree](exit-worktree.md)
