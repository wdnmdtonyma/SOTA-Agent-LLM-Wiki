---
id: agent.builtins
title: Built-in Agents
status: verified
owner: surface-config-cli
v: v1
kind: surface
tier: T1
schema: node
source:
  - packages/opencode/src/agent/agent.ts
  - packages/opencode/src/agent/prompt/
updated: 92c70c9c3
evidence: explicit
---

> `agent.builtins` 描述 V1 当前活跑的 7 个内建 agent：`build`、`plan`、`general`、`explore`、`compaction`、`title`、`summary`。这些 agent 在 `packages/opencode/src/agent/agent.ts` 的 `agents` 初始表中构造，不属于 V2 `packages/core/src` 的 durable session kernel。

## 能回答的问题

- 当前默认可见主 agent 是什么，哪些 agent 是 hidden。
- `plan`、`explore`、`general` 的权限为什么不同。
- 自定义 agent 覆盖内建 agent 时，哪些字段会被合并。
- `compaction`、`title`、`summary` 这些隐藏 agent 的 prompt 从哪里来。

## V1 运行位置

V1 agent service 的公开接口是 `get`、`list`、`defaultInfo`、`defaultAgent` 和 `generate`，接口定义直接返回 `Info` 或生成 agent JSON 所需的结构。[E: packages/opencode/src/agent/agent.ts:64] `Info` schema 把 runtime agent 统一成 `name`、`description`、`mode`、`native`、`hidden`、`topP`、`temperature`、`color`、`permission`、`model`、`variant`、`prompt`、`options` 和 `steps`。[E: packages/opencode/src/agent/agent.ts:35]

agent state 初始化时会先计算 `whitelistedDirs`，包括 truncation glob、临时目录、skill 目录和 reference 目录。[E: packages/opencode/src/agent/agent.ts:106] 默认 permission 允许所有工具，但把 `doom_loop` 设为 `ask`，把 `question`、`plan_enter`、`plan_exit` 设为 `deny`，并把 `.env` 读取改成 `ask`。[E: packages/opencode/src/agent/agent.ts:117] 用户级 `cfg.permission` 会作为 `user` ruleset 合并进内建 agent。[E: packages/opencode/src/agent/agent.ts:136]

## 内建 Agent Catalog

| agent | mode | hidden | native | prompt | permission shape | 设计动机 |
| --- | --- | --- | --- | --- | --- | --- |
| `build` | `primary` [E: packages/opencode/src/agent/agent.ts:151] | 否 | `true` [E: packages/opencode/src/agent/agent.ts:152] | 无内置 prompt override | `question` 和 `plan_enter` 在默认 deny 上改为 allow。[E: packages/opencode/src/agent/agent.ts:145] | 默认执行 agent；描述说它按配置权限执行工具。[E: packages/opencode/src/agent/agent.ts:141] |
| `plan` | `primary` [E: packages/opencode/src/agent/agent.ts:177] | 否 | `true` [E: packages/opencode/src/agent/agent.ts:178] | 无内置 prompt override；plan reminder 在 session 层注入 | `question`、`plan_exit` allow，`task.general` deny，普通 edit deny，但 `.opencode/plans/*.md` 和 data plans markdown allow。[E: packages/opencode/src/agent/agent.ts:160] | 计划模式；源码描述明确说 disallows all edit tools。[E: packages/opencode/src/agent/agent.ts:156] |
| `general` | `subagent` [E: packages/opencode/src/agent/agent.ts:191] | 否 | `true` [E: packages/opencode/src/agent/agent.ts:192] | 无内置 prompt override | 继承 defaults/user，但把 `todowrite` 设为 `deny`。[E: packages/opencode/src/agent/agent.ts:185] | 供复杂研究和多步任务使用，描述建议并行执行多个 work units。[E: packages/opencode/src/agent/agent.ts:182] |
| `explore` | `subagent` [E: packages/opencode/src/agent/agent.ts:214] | 否 | `true` [E: packages/opencode/src/agent/agent.ts:215] | `PROMPT_EXPLORE` [E: packages/opencode/src/agent/agent.ts:212] | 先 `* deny`，再 allow `grep`、`glob`、`list`、`bash`、`webfetch`、`websearch`、`read`，外部目录按 readonly whitelist 处理。[E: packages/opencode/src/agent/agent.ts:198] | 快速探索 codebase；描述要求调用方给出 thoroughness level。[E: packages/opencode/src/agent/agent.ts:211] |
| `compaction` | `primary` [E: packages/opencode/src/agent/agent.ts:219] | `true` [E: packages/opencode/src/agent/agent.ts:221] | `true` [E: packages/opencode/src/agent/agent.ts:220] | `PROMPT_COMPACTION` [E: packages/opencode/src/agent/agent.ts:222] | `* deny` 后再合并用户权限。[E: packages/opencode/src/agent/agent.ts:225] | hidden compaction worker；prompt 文本要求生成 anchored conversation summary。[E: packages/opencode/src/agent/prompt/compaction.txt:1] |
| `title` | `primary` [E: packages/opencode/src/agent/agent.ts:234] | `true` [E: packages/opencode/src/agent/agent.ts:237] | `true` [E: packages/opencode/src/agent/agent.ts:236] | `PROMPT_TITLE` [E: packages/opencode/src/agent/agent.ts:246] | `* deny` 后再合并用户权限，且 temperature 固定为 `0.5`。[E: packages/opencode/src/agent/agent.ts:238] | hidden title worker；prompt 限制 title 不超过 50 个字符。[E: packages/opencode/src/agent/prompt/title.txt:4] |
| `summary` | `primary` [E: packages/opencode/src/agent/agent.ts:250] | `true` [E: packages/opencode/src/agent/agent.ts:253] | `true` [E: packages/opencode/src/agent/agent.ts:252] | `PROMPT_SUMMARY` [E: packages/opencode/src/agent/agent.ts:261] | `* deny` 后再合并用户权限。[E: packages/opencode/src/agent/agent.ts:256] | hidden summary worker；prompt 要求写 2-3 句 PR-description 风格摘要。[E: packages/opencode/src/agent/prompt/summary.txt:1] |

## 权限与排序规则

每个 agent 会检查是否已经显式 deny `Truncate.GLOB`。[E: packages/opencode/src/agent/agent.ts:297] 如果没有显式 deny，agent permission 会再 merge 一条 `external_directory` allow 规则给 `Truncate.GLOB`。[E: packages/opencode/src/agent/agent.ts:304] 这条规则解释了为什么工具输出被截断到磁盘后仍可被 agent 读取：它不是单个 tool 的例外，而是 agent permission ruleset 的尾部补丁。[I]

`list()` 会把配置的 `default_agent` 放到第一位；没有 `default_agent` 时把 `build` 放到第一位，然后按 name 升序排序。[E: packages/opencode/src/agent/agent.ts:314] `defaultInfo()` 要求配置的默认 agent 必须存在、不能是 `subagent`、不能 hidden，否则抛错；未配置时选择第一个非 subagent 且非 hidden 的 agent。[E: packages/opencode/src/agent/agent.ts:326]

## Prompt 文件

| prompt file | 被哪个 agent 使用 | 关键约束 |
| --- | --- | --- |
| `packages/opencode/src/agent/prompt/explore.txt` | `explore` | 文件说明自己是 file search specialist，并明确禁止创建文件或运行会修改系统状态的 bash 命令。[E: packages/opencode/src/agent/prompt/explore.txt:1] [E: packages/opencode/src/agent/prompt/explore.txt:16] |
| `packages/opencode/src/agent/prompt/compaction.txt` | `compaction` | 要求写 structured summary，供 future AI agents 继续工作。[E: packages/opencode/src/agent/prompt/compaction.txt:1] |
| `packages/opencode/src/agent/prompt/title.txt` | `title` | title 必须帮助用户稍后找回对话、不超过 50 字符、不能包含 tool names。[E: packages/opencode/src/agent/prompt/title.txt:4] [E: packages/opencode/src/agent/prompt/title.txt:10] [E: packages/opencode/src/agent/prompt/title.txt:17] |
| `packages/opencode/src/agent/prompt/summary.txt` | `summary` | 要求 summary 面向 pull request description。[E: packages/opencode/src/agent/prompt/summary.txt:1] |
| `packages/opencode/src/agent/generate.txt` | `Agent.generate` | 生成器必须返回 `identifier`、`whenToUse`、`systemPrompt` 三个字段的 JSON object。[E: packages/opencode/src/agent/agent.ts:12] [E: packages/opencode/src/agent/generate.txt:59] |

## V2 关系

这个节点是 `v: v1`。V2 `packages/core/src/config/agent.ts` 目前只定义 agent 配置 shape，不在本节点 source 中定义这 7 个 runtime built-in agents。[I] V2 的真正执行入口需要通过 `packages/core/src/public/opencode.ts` 的 embedded API 接通，而本节点描述的是 V1 yargs/TUI/session loop 当前使用的 agent registry。[I]

## Sources

- `packages/opencode/src/agent/agent.ts`
- `packages/opencode/src/agent/generate.txt`
- `packages/opencode/src/agent/prompt/compaction.txt`
- `packages/opencode/src/agent/prompt/explore.txt`
- `packages/opencode/src/agent/prompt/summary.txt`
- `packages/opencode/src/agent/prompt/title.txt`

## 相关

- `agent.config`
- `prompt.system-prompts`
- `config.v1-core`
