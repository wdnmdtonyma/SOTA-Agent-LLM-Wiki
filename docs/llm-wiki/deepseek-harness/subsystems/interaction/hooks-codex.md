---
id: subsys.interaction.hooks-codex
title: Codex hooks 桥
kind: subsystem
tier: T2
pkg: interaction
source:
  - packages/hooks/hooks-codex/src/index.ts
  - packages/hooks/hooks-codex/src/config.ts
  - packages/hooks/hooks-codex/src/invariant.ts
  - packages/hooks/hooks-codex/package.json
  - packages/hooks/hooks-codex/tests/bridge.spec.ts
  - packages/hooks/hooks-codex/tests/config.spec.ts
  - packages/hooks/hooks-codex/tests/coverage-cases.ts
  - packages/hooks/hook-protocol/src/index.ts
  - packages/hooks/hook-protocol/src/types.ts
  - packages/hooks/hook-protocol/src/matcher.ts
  - packages/hooks/hook-protocol/src/runner.ts
  - packages/hooks/hook-protocol/src/codec.ts
  - packages/hooks/hook-protocol/src/merge.ts
  - packages/hooks/hook-protocol/src/events.ts
  - packages/hooks/hook-protocol/src/detached.ts
  - packages/hooks/hook-protocol/tests/matcher.spec.ts
  - packages/hooks/hooks-claude-code/src/index.ts
  - packages/core/agent/src/runtime-types.ts
  - examples/acp-agent/cordis.yml
  - examples/package.json
  - python/sdk-runtime/package.json
  - vendor/cordis/src/events.ts
symbols:
  - hooks-codex
  - parseCodexConfig
  - CODEX_EVENTS
related:
  - spine.overview
  - subsys.interaction.hooks-protocol
  - subsys.interaction.hooks-claude
  - surface.hooks.bridges
evidence: explicit
status: verified
updated: 47f943859b
---

> `@deepseek-ai/dsh-hooks-codex` 是一座 **host 面桥**：把一份未改过的 Codex `hooks.json` 里 **5 个** 命令 hook 点（`PreToolUse` / `PostToolUse` / `SessionStart` / `UserPromptSubmit` / `Stop`）接到 Cordis 监听点。它 **不是** Codex 全量 HookEvent 再实现，**没有** `SubagentStart` / `SubagentStop`，**不在** shipped `dsh-base` / `dsh-web-app` / `dsh-headless` / 任一 shipped preset。执行、decode、restrictive merge 在共享库 [subsys.interaction.hooks-protocol](./hooks-protocol.md)；本包只拥有方言。

## 能回答的问题

- 仓库里有 `@deepseek-ai/dsh-hooks-codex`，`dsh web` / `dsh-base` 会不会默认跑 Codex hooks？
- 桥认哪 5 个点？`SubagentStart` / `SubagentStop` 写进 `hooks.json` 会怎样？
- matcher 是字面量还是正则？`async: true`、非 `command` type 去哪？
- PreToolUse 会不会变成 `approval` 的 `ask`？`allow` / `updatedInput` 会不会改工具入参？
- SessionStart 为什么是唯一 detached / emit 点？卸插件会不会留下 hook 进程？
- stdin payload 是 camelCase 还是 snake_case？有没有 hook env、命令替换、尾换行？

## 职责边界

本包拥有：插件名 `hooks-codex`、`inject = ['shell']`、进程级 `Config.configPath` 的一次读入、`parseCodexConfig` / `CODEX_EVENTS` 五事件子集、snake_case payload、regex-only matcher 方言、以及把 merge 后的 **blocking**（`decision === 'deny'`）映射到 Cordis 决策。 [E: packages/hooks/hooks-codex/src/index.ts:40] [E: packages/hooks/hooks-codex/src/index.ts:41] [E: packages/hooks/hooks-codex/src/config.ts:11]

本包 **不** publish `ctx.*`。不拥有：`runHook` / `mergeHookOutputs` / `hook/invoked`+`hook/result` / detached quiescence（[subsys.interaction.hooks-protocol](./hooks-protocol.md)）；Claude 七事件方言、hook env、`${CLAUDE_*}` 替换、`PreToolUse` 的 `ask`（[subsys.interaction.hooks-claude](./hooks-claude.md)）；`ctx.shell` 实现（[subsys.execution.shell](../execution/shell.md)）；`tools/pre-execute` 末端默认 `{ kind: 'allow' }` 与 `serviceAsk`（[spine.tool-call-anatomy](../../spine/tool-call-anatomy.md)）。companion `hooks-codex-invariant` 是空 installer：桥只写 hook-protocol 的 session 事件，配对不变量归协议库。 [E: packages/hooks/hooks-codex/src/invariant.ts:21]

**不在 shipped 产品树。** `dsh-base` / `dsh-web-app` / `dsh-headless` 的 `cordis.patch.yml`、以及全部 shipped `agent.cordis.yml`，都没有 `id: hooks-codex`（本页不给不存在的行伪造 `[E]`）。仓库里能核到的组合行是 ACP example overlay：`id: hooks-codex` / `name: '@deepseek-ai/dsh-hooks-codex'`，`configPath: ./codex-hooks.json`。 [E: examples/acp-agent/cordis.yml:189] [E: examples/acp-agent/cordis.yml:190] [E: examples/acp-agent/cordis.yml:192] 包名写在自己的 manifest 上。 [E: packages/hooks/hooks-codex/package.json:2] `examples/` 工作区与 Python deploy 闭包把该包列进 `dependencies`，只为 overlay / 自定义 patch 能 resolve，**不等于** 默认 `dsh web` 已挂桥。 [E: examples/package.json:38] [E: python/sdk-runtime/package.json:41]

默认产品路径仍是本地 Web GUI（`dsh web`），没有 shipped TUI。本仓 DSH 是 Cordis 组合运行时（`profile → bundle → agent preset`）；这座桥若被挂上，坐在 **host 面**（进程级读一次 `hooks.json`，相对路径相对 **进程启动 cwd**，不是 session cwd）。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/hooks/hooks-codex/src/index.ts` | `name` / `inject` / `Config` / `apply`；五条监听；`runPoint`；snake_case payload |
| `packages/hooks/hooks-codex/src/config.ts` | `CODEX_EVENTS`、`parseCodexConfig`、`SkippedHook` |
| `packages/hooks/hooks-codex/src/invariant.ts` | 空 companion：`hooks-codex-invariant` |
| `packages/hooks/hooks-codex/package.json` | `@deepseek-ai/dsh-hooks-codex` |
| `packages/hooks/hooks-codex/tests/bridge.spec.ts` | 五事件子集、regex 子串 deny、Stop 续跑、dispose drain |
| `packages/hooks/hooks-codex/tests/config.spec.ts` | 丢 `SubagentStop`、无 substitution、`async: true` → skipped |
| `packages/hooks/hooks-codex/tests/coverage-cases.ts` | 只 honoring deny；`continue:false` 记而不停；plain stdout → context |
| `packages/hooks/hook-protocol/src/matcher.ts` | `mode: 'codex'` = 未锚定正则，无 literal 快路径 |
| `packages/hooks/hook-protocol/src/runner.ts` | `runHook`；`DEFAULT_HOOK_TIMEOUT_MS`；`trailingNewline` / 可选 `env` |
| `packages/hooks/hook-protocol/src/codec.ts` | exit 2 → `block`；结构化 stdout 只在 exit 0 |
| `packages/hooks/hook-protocol/src/merge.ts` | restrictive merge（deny 赢）；本桥只消费 `deny` |
| `packages/hooks/hook-protocol/src/events.ts` | `appendHookInvoked` / `appendHookResult` |
| `packages/hooks/hook-protocol/src/detached.ts` | `createDetachedRuns`：SessionStart 的 abort + drain |
| `packages/hooks/hooks-claude-code/src/index.ts` | 对照：Claude `PreToolUse` **会** 把 `ask` 映射成 `{ kind: 'ask' }` |
| `packages/core/agent/src/runtime-types.ts` | `agent/session-start` emit；`agent/pre-step` waterfall；`agent/turn-stopping` serial |
| `examples/acp-agent/cordis.yml` | 仓库里唯一 shipped-tree 之外的组合行 |

## 数据模型

| 符号 | 要点 |
|---|---|
| `CODEX_EVENTS` | 封闭五元组：`PreToolUse` `PostToolUse` `SessionStart` `UserPromptSubmit` `Stop`。解析器 **只** 遍历这张表；`SubagentStop` / `Notification` 等键被丢掉，不进 `skipped`。 [E: packages/hooks/hooks-codex/src/config.ts:11] [E: packages/hooks/hooks-codex/tests/config.spec.ts:11] |
| `parseCodexConfig` | 接受 `{ hooks: … }` 包装或裸 event map。非 `command` type → `skipped`（`unsupported "<type>" hook`）；`async: true` → `skipped`（`async hook`）；缺 `type` 当 command。`timeout` 与别名 `timeoutSec` 都收成 `timeoutSec`。 [E: packages/hooks/hooks-codex/src/config.ts:65] [E: packages/hooks/hooks-codex/src/config.ts:67] [E: packages/hooks/hooks-codex/src/config.ts:70] [E: packages/hooks/hooks-codex/src/config.ts:71] |
| `SkippedHook` | `{ event, reason }`。`apply` 对每条 `ctx.logger.warn`，不注册。 |
| 无 matcher 主体 | `UserPromptSubmit` / `Stop` 的 `matcher` 在校验 **之前** 丢弃（非法正则也不会炸）。其余三点把 `matcher` 交给 `matcherDiagnostic(…, 'codex')`；无效正则抛 `SyntaxError`，整份 config 作废。 [E: packages/hooks/hooks-codex/src/config.ts:75] [E: packages/hooks/hooks-codex/src/config.ts:78] [E: packages/hooks/hooks-codex/tests/config.spec.ts:72] |
| `Config` | 必填 `configPath`；`model` 默认 `''`（打进每条 payload）；`defaultTimeoutMs` 默认 `DEFAULT_HOOK_TIMEOUT_MS`（`600_000`）；`stderrSummaryMaxChars` 默认 `500`，必须正整数。 [E: packages/hooks/hooks-codex/src/index.ts:61] [E: packages/hooks/hook-protocol/src/runner.ts:20] [E: packages/hooks/hook-protocol/src/events.ts:53] |
| Codex payload | 每条都是 **snake_case**，**无** 尾换行：`session_id` / `transcript_path` / `cwd` / `hook_event_name` / `model` / `permission_mode: 'default'`。turn 作用域再加 `turn_id`。`transcript_path` 来自机会主义 `ctx.get('sessionPersistence')?.locate(…)`，没有 persistence 则为 `null`。 [E: packages/hooks/hooks-codex/src/index.ts:294] [E: packages/hooks/hooks-codex/src/index.ts:301] [E: packages/hooks/hooks-codex/src/index.ts:146] |
| 工具 payload | `tool_name` = **真实** `exec.name`（与 matcher 主体一致）；`tool_input` 固定 `{ command }`，从 args 里抽 string `command`，否则 `''`；`tool_use_id` = `exec.callId`。Post 再加 `tool_response`（result 文本块拼接）。 [E: packages/hooks/hooks-codex/src/index.ts:324] [E: packages/hooks/hooks-codex/src/index.ts:328] |
| Stop payload | `stop_hook_active: false`（恒为假）、`last_assistant_message: null`。 [E: packages/hooks/hooks-codex/src/index.ts:261] |
| 本桥 honoring | merge 结果只有 `decision === 'deny'` 改控制流。`allow` / `ask` / `none` 都走 `next()`（或 Stop 不续跑）。`continue:false` 只写进 `hook/result.decision === 'stop'`，**不停** turn。 [E: packages/hooks/hooks-codex/src/index.ts:229] [E: packages/hooks/hooks-codex/tests/coverage-cases.ts:410] |
| `hook/*` 事件 | 仅当 `agent` 在场 **且** `turn !== undefined` 才 `appendHookInvoked` / `appendHookResult`。`dialect: 'codex'`。SessionStart 是 detached、不带 turn，不写这对事件。 [E: packages/hooks/hooks-codex/src/index.ts:135] [E: packages/hooks/hooks-codex/src/index.ts:136] [E: packages/hooks/hooks-codex/src/index.ts:137] |
| `PLUGIN_SOURCE` | `{ kind: 'plugin', plugin: 'hooks-codex' }`，给 `inject` / `steer` 的 user message。 [E: packages/hooks/hooks-codex/src/index.ts:72] |

映射（本桥只这五条；**没有** `subagent/start` / `subagent/end`）：

| Codex 点 | Cordis 监听点 | 模式 | matcher 主体 | 本桥 honoring |
|---|---|---|---|---|
| `SessionStart` | `agent/session-start` | emit + detached | `source`（`'startup'` / `'resume'` / …） | 只 `inject` context；不能 block |
| `UserPromptSubmit` | `agent/pre-step` | waterfall | `''`（无主体） | `deny` → `{ kind: 'reject' }`；否则 `next()` 再叠 context |
| `PreToolUse` | `tools/pre-execute` | waterfall | `exec.name` | `deny` → `{ kind: 'deny' }`；**无** `ask` / rewrite |
| `PostToolUse` | `tools/post-execute` | waterfall | `exec.name` | `deny` → `{ kind: 'block', feedback }`；否则 `next()` 再叠 context |
| `Stop` | `agent/turn-stopping` | serial | `''`（无主体） | `deny` → `agent.steer(…)` 逼下一 step |

## 控制流

1. **组合行只在 overlay。** `apply@index.ts` 要进进程，必须有人 insert `name: '@deepseek-ai/dsh-hooks-codex'`。仓库示例是 `examples/acp-agent/cordis.yml` 的 `id: hooks-codex`，和 Claude 桥并列、各用各的 json（`./codex-hooks.json` vs `./hooks.json`）。Loader 认 named export：`name` / `inject` / `apply`，**没有** `default`。 [E: examples/acp-agent/cordis.yml:189] [E: packages/hooks/hooks-codex/tests/bridge.spec.ts:228] [E: packages/hooks/hooks-codex/tests/bridge.spec.ts:230]

2. **load 期先校验再 parse。** `apply@index.ts` 在读文件之前断言 `stderrSummaryMaxChars` 是正整数，避免坏值被「读失败提前 return」藏住。然后 `JSON.parse(readFileSync(configPath))` → `parseCodexConfig@config.ts`。缺文件 / 非法 JSON / 无效 regex → warn 一句、`return`，**零 listener**。skipped 的 async / 非 command 只 warn，同步 command 仍注册。 [E: packages/hooks/hooks-codex/src/index.ts:84] [E: packages/hooks/hooks-codex/src/index.ts:88] [E: packages/hooks/hooks-codex/src/index.ts:95] [E: packages/hooks/hooks-codex/tests/bridge.spec.ts:169]

3. **解析只认五事件、只收同步 command。** `parseCodexConfig` 对 `CODEX_EVENTS` 做 `for`，其它键（含测试里写进 json 的 `SubagentStop`）直接消失。`async: true` 记 `skipped`，命令字符串原样保留——**无** `${…}` 替换。非法 regex 在「会被用到的 matcher」上抛 `SyntaxError`，整桥不挂。 [E: packages/hooks/hooks-codex/src/config.ts:50] [E: packages/hooks/hooks-codex/src/config.ts:67] [E: packages/hooks/hooks-codex/tests/config.spec.ts:13] [E: packages/hooks/hooks-codex/tests/config.spec.ts:22]

4. **SessionStart 是唯一 detached / emit 点。** `createDetachedRuns@detached.ts` 建一份 tracker；`ctx.effect` 的 disposer 调 `detached.drain()`。`ctx.on('agent/session-start')` **没有** `next`（事件合同是 emit）。`runPoint('SessionStart', source, …)` 用 `detached.signal`，`plainStdoutAsContext: true`；resolve 后 `agent.inject(context)`，失败只 warn。慢 hook 可能赶不上第一次请求（没有 startup gate）。卸 fiber 必须杀掉仍在跑的 hook 进程并等到 chain settle。 [E: packages/hooks/hooks-codex/src/index.ts:104] [E: packages/hooks/hooks-codex/src/index.ts:105] [E: packages/hooks/hooks-codex/src/index.ts:188] [E: packages/core/agent/src/runtime-types.ts:217] [E: packages/hooks/hooks-codex/tests/bridge.spec.ts:221]

5. **`runPoint@index.ts`：regex 选组，stdin 无换行、无 env。** 对每个 group 调 `matchesMatcher(group.matcher, matchQuery, 'codex')`——Codex **没有** Claude 那种 `[A-Za-z0-9_|]+` literal 快路径，`"Bash"` 是 `/Bash/`，会匹配 `BashOutput`。命中则 `runHook(ctx.shell, hook, { payload, cwd: session.header.cwd, signal, trailingNewline: false, expectedEventName: point })`。不传 `env`；共享 runner 只有调用方给了 `options.env` 才写进 `ShellExecRequest`。workdir 是 **session cwd**，不是 server 启动目录。 [E: packages/hooks/hooks-codex/src/index.ts:131] [E: packages/hooks/hook-protocol/src/matcher.ts:64] [E: packages/hooks/hook-protocol/tests/matcher.spec.ts:41] [E: packages/hooks/hooks-codex/src/index.ts:146] [E: packages/hooks/hook-protocol/src/runner.ts:75] [E: packages/hooks/hook-protocol/src/runner.ts:83]

6. **decode + merge 在协议库；本桥再过滤。** exit 2 → `decision: 'block'`（stderr 当 reason）；exit 0 才解析 JSON；其它 exit / 基础设施 reject 是非阻塞错误（无 exitCode）。`mergeHookOutputs` 按 deny > ask > allow 折叠。本桥随后 **只看** `merged.decision === 'deny'`。`systemMessage` 只 warn「not yet surfaced」。clean exit + 非 JSON stdout 仅在 `plainStdoutAsContext` 为真时升成 `additionalContext`（JSON 开头 `{` 的 stdout 不当散文）。 [E: packages/hooks/hook-protocol/src/codec.ts:67] [E: packages/hooks/hooks-codex/src/index.ts:169] [E: packages/hooks/hooks-codex/src/index.ts:162] [E: packages/hooks/hooks-codex/src/index.ts:152]

7. **UserPromptSubmit → `agent/pre-step`。** 空 `messages` 直接 `return next()`，不跑 hook。否则 payload 带 `turn_id` 与拼起来的 `prompt`。`deny` → `{ kind: 'reject' }`（**不** `next()`，本 turn 无 step、模型 0 次请求）。非 deny **必须** `await next()`，再把本桥 context 追加到下游 `kind: 'enter'` 的 `messages` 尾；下游 `reject` / `rewrite` 仍生效。本桥自己不 rewrite、不 ask。 [E: packages/hooks/hooks-codex/src/index.ts:199] [E: packages/hooks/hooks-codex/src/index.ts:200] [E: packages/hooks/hooks-codex/src/index.ts:211] [E: packages/hooks/hooks-codex/src/index.ts:215] [E: packages/hooks/hooks-codex/tests/coverage-cases.ts:91] [E: packages/core/agent/src/runtime-types.ts:231]

8. **PreToolUse → `tools/pre-execute`：只 block，无 approval、无 rewrite。** `deny` 返回 `{ kind: 'deny', reason }`（默认文案 `blocked by PreToolUse hook`），工具 `execute` 不跑。其它决策（含 merge 出来的 `ask` / `allow`）一律 `return next()`。对照：Claude 桥在同一缝上把 `ask` 映射成 `{ kind: 'ask' }`。本桥不读 `updatedInput`。 [E: packages/hooks/hooks-codex/src/index.ts:225] [E: packages/hooks/hooks-codex/src/index.ts:229] [E: packages/hooks/hooks-codex/src/index.ts:230] [E: packages/hooks/hooks-claude-code/src/index.ts:242] [E: packages/hooks/hooks-codex/tests/bridge.spec.ts:83]

9. **PostToolUse → `tools/post-execute`。** 工具 body **已经**跑完。`deny` 返回 `{ kind: 'block', feedback }`（可附带 context），结果进模型时是 `isError`。非 deny 先 `await next()`，再 `prependContext` 把本桥 context 叠到下游 `accept` **或** `block` 上。 [E: packages/hooks/hooks-codex/src/index.ts:234] [E: packages/hooks/hooks-codex/src/index.ts:240] [E: packages/hooks/hooks-codex/src/index.ts:244] [E: packages/hooks/hooks-codex/tests/coverage-cases.ts:229]

10. **Stop → `agent/turn-stopping`（serial，不是 waterfall）。** 合同没有 `next`。`deny`（含 exit 2 且 stderr 空）`agent.steer` 一条 user message，机器看见 pending input 再跑一步；默认文案 `continue: blocked by Stop hook`。`stop_hook_active` 恒 `false`：一条永远 block 的 Stop hook 会逼每个 step 续跑，直到 hook 自己限流（测试用 marker 文件只 block 一次）。 [E: packages/hooks/hooks-codex/src/index.ts:260] [E: packages/hooks/hooks-codex/src/index.ts:268] [E: packages/core/agent/src/runtime-types.ts:278] [E: packages/hooks/hooks-codex/tests/coverage-cases.ts:503]

11. **waterfall 必须 `next()`。** Cordis `Events.waterfall` 靠传入的 `next()` 才 `shift` 到下一层。UserPromptSubmit / PreToolUse / PostToolUse 在非 deny 路径上都调用 `next()`；漏掉等于停掉 pre-step / 工具执行 / post-execute 链。SessionStart 与 Stop 不是 waterfall，没有 `next` 可漏。 [E: vendor/cordis/src/events.ts:237] [E: vendor/cordis/src/events.ts:238] [E: packages/hooks/hooks-codex/src/index.ts:215] [E: packages/hooks/hooks-codex/src/index.ts:230]

12. **dispose 卸 listener + drain detached。** `fiber.dispose()` 之后同一份 `hooks.json` 的 blocking UserPromptSubmit **不再**否决 prompt；仍在跑的 SessionStart hook 被 abort，且 **不会** 打 `SessionStart hook failed`（aborted run 是非阻塞 error）。turn cancel 同样经 `signal` 杀掉正在跑的 UserPromptSubmit 进程。 [E: packages/hooks/hooks-codex/tests/bridge.spec.ts:194] [E: packages/hooks/hooks-codex/tests/bridge.spec.ts:224] [E: packages/hooks/hooks-codex/tests/bridge.spec.ts:126]

## 设计动机

DSH 不把「Claude / Codex 的 hook 运行时」做成第二套 agent。拦截缝已经在 `agent/*` 与 `tools/*`；两座桥只是把对方产品的 `hooks.json` 方言投到这些缝上。共享的执行、decode、merge、耐久事件放进 `dsh-hook-protocol`（它自己也不是插件），避免两座桥各写一份 bash runner。

五事件子集是显式裁剪：`CODEX_EVENTS` 写死五名，测试钉死 `SubagentStop` 不在表里。子代理生命周期有自己的 Cordis 点（`subagent/start` / `subagent/end`），本桥不认、不挂。regex-only、snake_case、无 env、无 substitution、stdin 无尾换行，都是跟 Claude 桥分叉的方言，故意留在本包而不是协议库。

只 honoring blocking：Codex 这一侧在 DSH 缝上没有「hook 要求人点一次」的产品合同（那是 `ctx.approval` 的 `ask | never`），也没有「hook 改写 tool_input」的实现。merge 仍可能产出 `ask` / `allow`；本桥把它们当成「没否决」，交给 `next()`。`continue:false` 先记在 log，等有 run-level halt 原语再接。

SessionStart 走 emit + detached，是因为 `agent/session-start` 的合同不是 waterfall：listener 不能挡住 agent 构造。用 `createDetachedRuns` 换来的是 dispose 能杀进程、能等到 inject/warn 结束，而不是 10 分钟超时自己死。

## Gotcha

- **包在仓库里 ≠ 产品在跑。** shipped bundle / preset 没有这一行。写成「默认 `dsh web` 跑 Codex hooks」整页作废。example overlay 与 Python deploy 闭包里的 dependency 只保证 **能 load**。 [E: examples/acp-agent/cordis.yml:189] [E: python/sdk-runtime/package.json:41]
- **没有 SubagentStart / SubagentStop。** 写进 json 会被 `parseCodexConfig` 静默丢掉，loop 当没这回事。 [E: packages/hooks/hooks-codex/tests/bridge.spec.ts:133]
- **`"Bash"` 是子串正则。** 要精确匹配必须写 `^Bash$`。Claude 桥对纯字面量是 exact-match，两份同一 matcher 字符串语义不同。 [E: packages/hooks/hook-protocol/tests/matcher.spec.ts:41]
- **只 honoring `deny`。** PreToolUse 的 `ask` **不会** 进 `ctx.approval.request`。`allow` / `updatedInput` 不改工具入参。`continue:false` 的 `hook/result.decision` 是 `'stop'`，工具照跑。 [E: packages/hooks/hooks-codex/src/index.ts:230] [E: packages/hooks/hooks-codex/tests/coverage-cases.ts:411]
- **`async: true` 进 skipped，不是后台跑。** warn 里写 `only sync command hooks run`。 [E: packages/hooks/hooks-codex/src/index.ts:92]
- **一份非法 regex 毁掉整桥。** `UserPromptSubmit` 合法、`PreToolUse` matcher 为 `[` → load 失败、**两个点都不注册**。 [E: packages/hooks/hooks-codex/tests/bridge.spec.ts:169]
- **`configPath` 相对启动 cwd，hook 命令相对 session cwd。** 缺文件 = 零 hook，不崩。 [E: packages/hooks/hooks-codex/src/index.ts:128] [E: packages/hooks/hooks-codex/tests/bridge.spec.ts:153]
- **SessionStart 赶不上第一轮。** 没有 gate；测试要 `waitFor` inbox / marker。exit 2 的 stdout **不会** 变成 context。 [E: packages/hooks/hooks-codex/tests/coverage-cases.ts:531]
- **`stop_hook_active` 永远 false。** 无条件 block 的 Stop hook 会逼 turn 一直续，直到 hook 自己停。 [E: packages/hooks/hooks-codex/src/index.ts:261]
- **`systemMessage` 被忽略。** warn 一句，不进模型。 [E: packages/hooks/hooks-codex/src/index.ts:162]
- **PostToolUse deny 发生在 body 之后。** 副作用已经产生，模型只看到 `isError` feedback。要拦副作用必须用 PreToolUse。 [E: packages/hooks/hooks-codex/tests/coverage-cases.ts:229]
- **waterfall 漏 `next()` = 整条链停。** 非 deny 路径都要 `next()`。 [E: vendor/cordis/src/events.ts:238]
- **无 agent 的 `ctx.tools.execute` 仍跑 hook。** `lastTurn` 无 agent 返回 `0`；`cwd` 退回 `process.cwd()`；没有 session 就不写 `hook/*`。测试：直接 `execute` 仍被 PreToolUse deny。 [E: packages/hooks/hooks-codex/src/index.ts:280] [E: packages/hooks/hooks-codex/src/index.ts:298] [E: packages/hooks/hooks-codex/tests/coverage-cases.ts:463]

## Seam 三角

| 角色 | 包 | ctx 键 / 合同 | bundle / preset 行 |
|---|---|---|---|
| Definition | 无。拦截缝是 `dsh-agent` / `dsh-tools` 的事件合同；协议词汇在 `dsh-hook-protocol`（库，不 publish 服务） | 无 `ctx.hooks` | 协议库不出现在 shipped bundle |
| Provider | 无。本包不 `provide` 任何服务 | — | — |
| Consumer | `@deepseek-ai/dsh-hooks-codex`（`hooks-codex`） | `inject = ['shell']`；听 `agent/session-start`、`agent/pre-step`、`tools/pre-execute`、`tools/post-execute`、`agent/turn-stopping`；`ctx.get('sessionPersistence')` 机会主义 | **不在** `dsh-base` / `dsh-web-app` / `dsh-headless` / shipped preset。唯一树内行：`examples/acp-agent/cordis.yml` 的 `id: hooks-codex` |

换 `ctx.shell` 的 Provider 会带走 hook 命令怎么跑（credential scrub、process-group kill、timeout）。换 Claude 桥不会改本包的五事件表或 snake_case payload。preset isolate 不能复制一座桥：`configPath` 是进程级的。

## Sources

- packages/hooks/hooks-codex/src/index.ts
- packages/hooks/hooks-codex/src/config.ts
- packages/hooks/hooks-codex/src/invariant.ts
- packages/hooks/hooks-codex/package.json
- packages/hooks/hooks-codex/tests/bridge.spec.ts
- packages/hooks/hooks-codex/tests/config.spec.ts
- packages/hooks/hooks-codex/tests/coverage-cases.ts
- packages/hooks/hook-protocol/src/index.ts
- packages/hooks/hook-protocol/src/types.ts
- packages/hooks/hook-protocol/src/matcher.ts
- packages/hooks/hook-protocol/src/runner.ts
- packages/hooks/hook-protocol/src/codec.ts
- packages/hooks/hook-protocol/src/merge.ts
- packages/hooks/hook-protocol/src/events.ts
- packages/hooks/hook-protocol/src/detached.ts
- packages/hooks/hook-protocol/tests/matcher.spec.ts
- packages/hooks/hooks-claude-code/src/index.ts
- packages/core/agent/src/runtime-types.ts
- examples/acp-agent/cordis.yml
- examples/package.json
- python/sdk-runtime/package.json
- vendor/cordis/src/events.ts

## 相关

- [spine.overview](../../spine/overview.md)：`profile → bundle → preset`；host 面 vs agent-preset 面。
- [subsys.interaction.hooks-protocol](./hooks-protocol.md)：共享库（matcher / `runHook` / merge / `hook/*` / detached），不是插件。
- [subsys.interaction.hooks-claude](./hooks-claude.md)：七事件 Claude 桥；`ask`、hook env、substitution、literal matcher。
- [surface.hooks.bridges](../../surface/hooks/bridges.md)：T1 可见面（两座桥怎么被用户挂上）。
- [spine.tool-call-anatomy](../../spine/tool-call-anatomy.md)：`tools/pre-execute` → execute → `post-execute`；approval 只接受 `allowed-once`。
- [subsys.execution.shell](../execution/shell.md)：`ctx.shell`；本桥 `inject = ['shell']`，hook stdin 走 `ShellExecRequest.stdin`。
