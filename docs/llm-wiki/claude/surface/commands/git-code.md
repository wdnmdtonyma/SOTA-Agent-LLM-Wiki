---
id: cmd.git-code
title: Git and code review command catalog
kind: command
tier: T1
source: [commands.ts, types/command.ts, commands/commit.ts, commands/commit-push-pr.ts, commands/review.ts, commands/review/ultrareviewCommand.tsx, commands/review/reviewRemote.ts, commands/review/ultrareviewEnabled.ts, commands/security-review.ts, commands/createMovedToPluginCommand.ts, commands/init-verifiers.ts, commands/diff/index.ts, commands/init.ts, commands/pr_comments/index.ts]
symbols: [commit, commitPushPr, review, ultrareview, securityReview, initVerifiers, diff, init, pr_comments]
related: [subsys.command-system, group.commands]
evidence: explicit
status: verified
updated: 2026-06-14
---

> Git and code review command catalog 覆盖 commit、PR、review、security review、diff、项目初始化和 PR comment 拉取相关 slash commands。

## 能回答的问题

- 哪些 git/code commands 是 prompt command，哪些是 local JSX command？
- `/commit`、`/commit-push-pr`、`/init-verifiers` 为什么只在 internal ant 条件下注册？
- `/ultrareview` 与 `/review` 的执行路径有什么本质差异？
- `/security-review` 和 `/pr-comments` 如何迁移到 plugin command？
- `/init` 的新旧 prompt 如何选择？

## 清单边界

本节点只覆盖 `cmd.git-code` 分配的 9 个命令。`PromptCommand` 的 `getPromptForCommand` 返回 `ContentBlockParam[]` [E: types/command.ts:53] [E: types/command.ts:56]，`local-jsx` command 通过 `load()` lazy-load command module [E: types/command.ts:151]。表中 `未声明` 表示当前 command object 没有显式字段，属于局部读源结论 [I]。

## Catalog

| 命令 | aliases | kind | 来源 / availability | 参数 | 行为一句话 |
|---|---|---|---|---|---|
| `/commit` | 未声明 [I] | `prompt` [E: commands/commit.ts:58] | `INTERNAL_ONLY_COMMANDS` entry [E: commands.ts:229]，仅 `USER_TYPE === 'ant' && !IS_DEMO` 时追加 [E: commands.ts:343] [E: commands.ts:344] [E: commands.ts:345] | 未声明 [I] | 生成 git commit 的 prompt，并允许预定义 git Bash tools [E: commands/commit.ts:60] [E: commands/commit.ts:61]。 |
| `/commit-push-pr` | 未声明 [I] | `prompt` [E: commands/commit-push-pr.ts:109] | `INTERNAL_ONLY_COMMANDS` entry [E: commands.ts:230]，仅 `USER_TYPE === 'ant' && !IS_DEMO` 时追加 [E: commands.ts:343] [E: commands.ts:344] [E: commands.ts:345] | args 作为 Additional instructions 追加 [E: commands/commit-push-pr.ts:128] [E: commands/commit-push-pr.ts:130] | commit、push 并 open PR [E: commands/commit-push-pr.ts:111]。 |
| `/review` | 未声明 [I] | `prompt` [E: commands/review.ts:34] | `COMMANDS` builtin entry [E: commands.ts:308]; `source: 'builtin'` [E: commands/review.ts:39] | PR number args 注入 prompt [E: commands/review.ts:30] | review pull request [E: commands/review.ts:36]。 |
| `/ultrareview` | 未声明 [I] | `local-jsx` [E: commands/review.ts:49] | `COMMANDS` builtin entry [E: commands.ts:309]; visibility 由 `isUltrareviewEnabled()` 控制 [E: commands/review.ts:52] | args 传给 remote review launcher [E: commands/review/ultrareviewCommand.tsx:10] [E: commands/review/ultrareviewCommand.tsx:44] [E: commands/review/ultrareviewCommand.tsx:55] | 远端运行约 10-20 分钟的 branch review，PR number mode 由 launcher 支持 [E: commands/review.ts:51] [E: commands/review/reviewRemote.ts:162] [E: commands/review/reviewRemote.ts:208]。 |
| `/security-review` | 未声明 [I] | moved-to-plugin `prompt` [E: commands/createMovedToPluginCommand.ts:31] | `COMMANDS` builtin entry [E: commands.ts:311]; wrapper `source: 'builtin'` [E: commands/createMovedToPluginCommand.ts:39] | fallback prompt args 传入 private-marketplace handler [E: commands/createMovedToPluginCommand.ts:62] | 对当前 branch pending changes 做 security review [E: commands/security-review.ts:199] [E: commands/security-review.ts:201]。 |
| `/init-verifiers` | 未声明 [I] | `prompt` [E: commands/init-verifiers.ts:4] | `INTERNAL_ONLY_COMMANDS` entry [E: commands.ts:234]，仅 `USER_TYPE === 'ant' && !IS_DEMO` 时追加 [E: commands.ts:343] [E: commands.ts:344] [E: commands.ts:345] | 未声明 [I] | 创建用于 code changes automated verification 的 verifier skills [E: commands/init-verifiers.ts:7]。 |
| `/diff` | 未声明 [I] | `local-jsx` [E: commands/diff/index.ts:4] | `COMMANDS` builtin entry [E: commands.ts:274] | 未声明 [I] | 查看 uncommitted changes 和 per-turn diffs [E: commands/diff/index.ts:6]。 |
| `/init` | 未声明 [I] | `prompt` [E: commands/init.ts:227] | `COMMANDS` builtin entry [E: commands.ts:283]; `source: 'builtin'` [E: commands/init.ts:238] | 未声明 [I] | 默认初始化 CLAUDE.md；`NEW_INIT` 且 ant 用户或 `CLAUDE_CODE_NEW_INIT` 为真时可设置 skills/hooks [E: commands/init.ts:230] [E: commands/init.ts:231] [E: commands/init.ts:232] [E: commands/init.ts:233]。 |
| `/pr-comments` | 未声明 [I] | moved-to-plugin `prompt` [E: commands/createMovedToPluginCommand.ts:31] | `COMMANDS` builtin entry [E: commands.ts:294]; wrapper `source: 'builtin'` [E: commands/createMovedToPluginCommand.ts:39] | fallback handler 接收 args [E: commands/pr_comments/index.ts:9] | 从 GitHub PR 获取 comments [E: commands/pr_comments/index.ts:5]。 |

## 复杂命令深挖

`/ultrareview` 是本类最复杂的 UI command。`/review` command 是 `prompt` 并直接返回 `LOCAL_REVIEW_PROMPT(args)` [E: commands/review.ts:34] [E: commands/review.ts:41]；`/ultrareview` command 是 `local-jsx` 并加载 `./review/ultrareviewCommand.js` [E: commands/review.ts:49] [E: commands/review.ts:53]。runtime gate 从 GrowthBook config 读取 `tengu_review_bughunter_config`，只有 `enabled === true` 才显示命令 [E: commands/review/ultrareviewEnabled.ts:9] [E: commands/review/ultrareviewEnabled.ts:12] [E: commands/review/ultrareviewEnabled.ts:13]。执行时先调用 `checkOverageGate()` [E: commands/review/ultrareviewCommand.tsx:29]；free reviews 用尽、balance 过低或需要确认时分别走 system message 或 overage dialog [E: commands/review/ultrareviewCommand.tsx:31] [E: commands/review/ultrareviewCommand.tsx:37] [E: commands/review/ultrareviewCommand.tsx:43]。remote launcher 支持 PR number mode 和 branch mode：PR mode 检查 GitHub repo 并以 `refs/pull/<n>/head` teleport [E: commands/review/reviewRemote.ts:162] [E: commands/review/reviewRemote.ts:163] [E: commands/review/reviewRemote.ts:208] [E: commands/review/reviewRemote.ts:211] [E: commands/review/reviewRemote.ts:215] [E: commands/review/reviewRemote.ts:219]；branch mode 计算 merge-base、拒绝空 diff，并用 bundle teleport [E: commands/review/reviewRemote.ts:237] [E: commands/review/reviewRemote.ts:239] [E: commands/review/reviewRemote.ts:260] [E: commands/review/reviewRemote.ts:270] [E: commands/review/reviewRemote.ts:274]。成功后注册 `RemoteAgentTask` 并返回 tracking URL message [E: commands/review/reviewRemote.ts:298] [E: commands/review/reviewRemote.ts:306] [E: commands/review/reviewRemote.ts:313]。

`/commit-push-pr` 的 prompt 强制把 context 中的 `git status`、`git diff HEAD`、当前分支、base diff 和 `gh pr view` 注入 prompt shell snippets [E: commands/commit-push-pr.ts:61] [E: commands/commit-push-pr.ts:62] [E: commands/commit-push-pr.ts:63] [E: commands/commit-push-pr.ts:64] [E: commands/commit-push-pr.ts:65]。任务步骤要求必要时创建分支、生成 commit、push、创建或更新 PR [E: commands/commit-push-pr.ts:81] [E: commands/commit-push-pr.ts:82] [E: commands/commit-push-pr.ts:89] [E: commands/commit-push-pr.ts:90]。执行前动态获取 default branch 和 enhanced PR attribution [E: commands/commit-push-pr.ts:122] [E: commands/commit-push-pr.ts:123]，并把 `ALLOWED_TOOLS` 注入 `alwaysAllowRules.command` [E: commands/commit-push-pr.ts:143] [E: commands/commit-push-pr.ts:145]。

`/init` 在同一个 command object 中保留旧 prompt 和新 prompt：`description` 根据 `feature('NEW_INIT')`、`USER_TYPE === 'ant'` 或 `CLAUDE_CODE_NEW_INIT` 切换 [E: commands/init.ts:230] [E: commands/init.ts:231] [E: commands/init.ts:232]，`getPromptForCommand` 也用同一条件在 `NEW_INIT_PROMPT` 和 `OLD_INIT_PROMPT` 中选择 [E: commands/init.ts:246] [E: commands/init.ts:247] [E: commands/init.ts:248] [E: commands/init.ts:249] [E: commands/init.ts:250]。新 prompt 明确包括 Phase 1 询问 CLAUDE.md/skills/hooks 设置 [E: commands/init.ts:30]，Phase 2 使用 subagent survey codebase [E: commands/init.ts:44]，Phase 6 创建 skills [E: commands/init.ts:154]，Phase 7 建议 hooks 和其他优化 [E: commands/init.ts:184]。

## Sources

- commands.ts
- types/command.ts
- commands/commit.ts
- commands/commit-push-pr.ts
- commands/review.ts
- commands/review/ultrareviewCommand.tsx
- commands/review/reviewRemote.ts
- commands/review/ultrareviewEnabled.ts
- commands/security-review.ts
- commands/createMovedToPluginCommand.ts
- commands/init-verifiers.ts
- commands/diff/index.ts
- commands/init.ts
- commands/pr_comments/index.ts

## 相关

- [命令系统机制](../../subsystems/command-system.md)
