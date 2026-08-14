---
id: subsys.interaction.hooks-claude
title: Claude Code hooks 桥
kind: subsystem
tier: T2
pkg: interaction
source:
  - packages/hooks/hooks-claude-code/src/index.ts
  - packages/hooks/hooks-claude-code/src/config.ts
  - packages/hooks/hooks-claude-code/src/invariant.ts
  - packages/hooks/hooks-claude-code/package.json
  - packages/hooks/hooks-claude-code/tests/bridge.spec.ts
  - packages/hooks/hooks-claude-code/tests/config.spec.ts
  - packages/hooks/hooks-claude-code/tests/coverage-cases.ts
  - packages/hooks/hook-protocol/src/runner.ts
  - packages/hooks/hook-protocol/src/matcher.ts
  - packages/hooks/hook-protocol/src/merge.ts
  - packages/hooks/hook-protocol/src/events.ts
  - packages/hooks/hook-protocol/src/detached.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/base/package.json
  - examples/acp-agent/cordis.yml
  - examples/package.json
  - packages/core/tools/src/index.ts
  - packages/core/agent/src/runtime-types.ts
  - vendor/cordis/src/events.ts
symbols:
  - hooks-claude-code
  - parseClaudeCodeConfig
  - substituteCommand
  - apply
related:
  - spine.overview
  - subsys.interaction.hooks-protocol
  - subsys.interaction.hooks-codex
  - surface.hooks.bridges
  - spine.tool-call-anatomy
evidence: explicit
status: verified
updated: 47f943859b
---

> `@deepseek-ai/dsh-hooks-claude-code` 是 **host 面 overlay 插件**：把一份未改写的 Claude Code `hooks.json` / settings `hooks` 映射到 Cordis 已有监听点。它是桥，不是 Claude Code 全套 HookEvent 的再实现，也不是默认产品树里的一行。

## 能回答的问题

- 本包是 27 个 Claude HookEvent 的再实现，还是只认 7 个事件的桥？`CLAUDE_EVENTS` 导出了吗？
- `dsh-base` / `dsh-web-app` / `dsh-headless` / shipped preset 有没有 `hooks-claude-code` 行？真装点在哪？
- 7 个 CC 事件分别接到哪条 Cordis 扩展点？哪些是 waterfall（必须 `next()`），哪些是 emit / serial？
- `updatedInput` / `systemMessage` / `continue:false` 会不会改工具参数、进模型、停 turn？
- 非 `command` hook、不在 7 事件表里的名字、非法 regex matcher，load 期各怎样？
- `${CLAUDE_PLUGIN_ROOT}` / `${CLAUDE_PROJECT_DIR}` 何时替换？hook 进程的 cwd / `CLAUDE_PROJECT_DIR` env 跟谁走？

## 职责边界

本包拥有：Claude Code 方言的 **7 事件表**、stdin payload、parse 期命令替换、`inject = ['shell']` 的插件 `apply`、以及把 `MergedHookOutcome` 折成 `PreStepDecision` / `PreToolDecision` / `PostToolDecision` / `steer` / `inject`。插件名是 `hooks-claude-code`。[E: packages/hooks/hooks-claude-code/src/index.ts:39] [E: packages/hooks/hooks-claude-code/src/index.ts:42]

本包**不**拥有：

- 共享执行器、restrictive merge、`hook/invoked` + `hook/result` 耐久事件、detached quiescence — [subsys.interaction.hooks-protocol](./hooks-protocol.md)（`subsys.interaction.hooks-protocol`）。本桥只调用那些符号。
- Codex 五事件方言、regex-only matcher、无 trailing newline — [subsys.interaction.hooks-codex](./hooks-codex.md)（`subsys.interaction.hooks-codex`）。
- T1 对照表（两座桥并排）— [surface.hooks.bridges](../../surface/hooks/bridges.md)（`surface.hooks.bridges`）。
- `ctx.tools` 的 `tools/pre-execute` 叶子 `{ kind: 'allow' }`、`serviceAsk`、`ask` 无审批服务时 fail-closed — [spine.tool-call-anatomy](../../spine/tool-call-anatomy.md)。
- `ctx.shell` 实现、shipped `dsh-base` insert 清单。

本包**不** `provide` 任何 `ctx.*`。`./invariant` companion 的 installer 是空函数：invocation/result 配对由 hook-protocol 的 companion 管。[E: packages/hooks/hooks-claude-code/src/invariant.ts:21] [E: packages/hooks/hooks-claude-code/src/invariant.ts:29]

**不在 shipped 产品树。** `dsh-base` insert 从 `id: timer` 到 `id: llm-deepseek`，没有 `hooks-claude-code`。[E: packages/bundle/base/cordis.patch.yml:16] [E: packages/bundle/base/cordis.patch.yml:450] `dependencies` 闭包从 `cordis-plugin-hmr` 到 `dsh-agent-instructions`，不含 `@deepseek-ai/dsh-hooks-claude-code`。[E: packages/bundle/base/package.json:42] [E: packages/bundle/base/package.json:118] `dsh-web-app` / `dsh-headless` / shipped preset 同样没有该行（不要给缺失行编 `[E]`）。真挂点是 examples overlay：`id: hooks-claude-code` / `name: '@deepseek-ai/dsh-hooks-claude-code'` / `configPath: ./hooks.json`。[E: examples/acp-agent/cordis.yml:181] [E: examples/acp-agent/cordis.yml:182] [E: examples/acp-agent/cordis.yml:184] 工作区依赖在 `examples/package.json`。[E: examples/package.json:37]

默认产品路径是 `dsh web`（本地 Web GUI），没有 shipped TUI。把本包写成「开箱即跑 Claude 全套 HookEvent」整页作废。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/hooks/hooks-claude-code/src/index.ts` | `name` / `inject` / `Config` / `apply`；7 点映射；`runPoint`；payload 构造 |
| `packages/hooks/hooks-claude-code/src/config.ts` | 未导出的 7 事件表；`parseClaudeCodeConfig`；`substituteCommand` |
| `packages/hooks/hooks-claude-code/src/invariant.ts` | 空 installer；只 `register` 包名 |
| `packages/hooks/hooks-claude-code/tests/bridge.spec.ts` | 全环路：prompt/tool/stop/session/subagent、缺文件、非法 regex、dispose、export 形状 |
| `packages/hooks/hooks-claude-code/tests/config.spec.ts` | parse / 替换 / skip / 丢 matcher |
| `packages/hooks/hooks-claude-code/tests/coverage-cases.ts` | `updatedInput` 不 honoring、`continue:false` 只记账、Stop 续步、`next()` 委托 |
| `packages/bundle/base/cordis.patch.yml` | shipped host insert；**无**本桥行 |
| `examples/acp-agent/cordis.yml` | 唯一 in-tree 组合样例 |

## 数据模型

| 符号 | 要点 |
|---|---|
| `hooks-claude-code` | 插件 `name`。`inject = ['shell']` 才能跑 hook 命令；`agents` / `sessionPersistence` 走 `ctx.get`，缺席不挡 load。[E: packages/hooks/hooks-claude-code/src/index.ts:39] [E: packages/hooks/hooks-claude-code/src/index.ts:42] |
| config.ts 内 7 事件表 | **未导出**的 `CLAUDE_EVENTS`：`SessionStart` `UserPromptSubmit` `PreToolUse` `PostToolUse` `Stop` `SubagentStart` `SubagentStop`。parse 只扫这张表，其它事件名（如 `Setup`）直接丢掉。[E: packages/hooks/hooks-claude-code/src/config.ts:11] [E: packages/hooks/hooks-claude-code/src/config.ts:86] |
| `parseClaudeCodeConfig` | 接受裸 event map 或 `{ hooks: … }` settings 包装。畸形 group/hook 忽略不抛；非 `command` 进 `skipped`；缺 `type` 当 `command`。[E: packages/hooks/hooks-claude-code/src/config.ts:83] [E: packages/hooks/hooks-claude-code/src/config.ts:97] [E: packages/hooks/hooks-claude-code/src/config.ts:98] |
| `substituteCommand` | parse 期把 `${CLAUDE_PLUGIN_ROOT}` / `${CLAUDE_PROJECT_DIR}` 全部替换；变量未设则 token 原样留下。[E: packages/hooks/hooks-claude-code/src/config.ts:59] [E: packages/hooks/hooks-claude-code/src/config.ts:60] |
| `Config` | `configPath` 必填；可选 `pluginRoot` / `projectDir`；`defaultTimeoutMs` 默认 `DEFAULT_HOOK_TIMEOUT_MS`（600000）；`stderrSummaryMaxChars` 默认 500。相对路径相对 **进程启动 cwd**，一次 load 读一份。[E: packages/hooks/hooks-claude-code/src/index.ts:73] [E: packages/hooks/hooks-claude-code/src/index.ts:76] [E: packages/hooks/hook-protocol/src/runner.ts:20] |
| `ClaudeCodeHookConfig` | `Record<event, MatcherGroup[]>`，只含活下来的 command hooks。`timeout`（秒）→ `timeoutSec`。[E: packages/hooks/hooks-claude-code/src/config.ts:105] |
| `SUBAGENT_TYPE` | 写死 `'general-purpose'`。子代理缝没有 per-kind 标签；matcher 对 `code-reviewer` 这类具体 kind **不会**命中。[E: packages/hooks/hooks-claude-code/src/index.ts:304] |
| `PLUGIN_SOURCE` | 注入 / steer 的 `MessageSource`：`{ kind: 'plugin', plugin: 'hooks-claude-code' }`。[E: packages/hooks/hooks-claude-code/src/index.ts:87] |

stdin 是 CC 方言对象（本桥拥有）：`session_id` / `transcript_path` / `cwd` / `hook_event_name`，再加各事件字段。`transcript_path` 来自 `ctx.get('sessionPersistence')?.locate(…)`，没有 persistence 就是 `''`。[E: packages/hooks/hooks-claude-code/src/index.ts:323] [E: packages/hooks/hooks-claude-code/src/index.ts:327] [E: packages/hooks/hooks-claude-code/src/index.ts:329]

## 控制流

1. **overlay 才进树。** 产品 profile 的第一层是 `dsh-base`，没有本插件。要把未改写的 `hooks.json` 接到 DSH，必须另叠一行，例如 `examples/acp-agent/cordis.yml` 的 `id: hooks-claude-code`。`configPath` 在 **load 时**读一次，相对 server 启动 cwd，不是每个 `session/new.cwd`。[E: examples/acp-agent/cordis.yml:181] [E: examples/acp-agent/cordis.yml:184] [E: packages/hooks/hooks-claude-code/src/index.ts:104]

2. **`apply@index.ts` 先校验再 parse。** `stderrSummaryMaxChars` 必须是正整数，否则 load 抛错。[E: packages/hooks/hooks-claude-code/src/index.ts:99] [E: packages/hooks/hooks-claude-code/tests/coverage-cases.ts:183] 然后 `JSON.parse(readFileSync(configPath))` + `parseClaudeCodeConfig`。读失败 / 抛 `SyntaxError`：打 warn，`return`，**一个 listener 都不挂**，loop 照跑。[E: packages/hooks/hooks-claude-code/src/index.ts:114] [E: packages/hooks/hooks-claude-code/src/index.ts:115] [E: packages/hooks/hooks-claude-code/tests/bridge.spec.ts:367] 带 matcher 的支持事件若 regex 非法，parse 抛 `SyntaxError`，整份 config 作废（连合法的 `UserPromptSubmit` 也不注册）。[E: packages/hooks/hooks-claude-code/src/config.ts:113] [E: packages/hooks/hooks-claude-code/tests/bridge.spec.ts:382] 不支持事件上的非法 matcher **不会**拖垮支持事件。[E: packages/hooks/hooks-claude-code/tests/bridge.spec.ts:405]

3. **只跑 command hooks。** `type !== 'command'` 记入 `skipped`，`apply` 对每条 warn `only command hooks run`。[E: packages/hooks/hooks-claude-code/src/config.ts:98] [E: packages/hooks/hooks-claude-code/src/index.ts:111] [E: packages/hooks/hooks-claude-code/tests/config.spec.ts:41] `prompt` / `http` / `agent` 不会进 `runHook`。

4. **matcher 方言与丢弃。** `UserPromptSubmit` / `Stop` 在 parse 时丢掉 group.matcher（非法 `[` 也不炸）。[E: packages/hooks/hooks-claude-code/src/config.ts:109] [E: packages/hooks/hooks-claude-code/tests/config.spec.ts:80] 运行时 `matchesMatcher(..., 'claude-code')`：空 / `*` / 缺省 = 全匹配；纯 `[A-Za-z0-9_|]+` 是 pipe 精确交替；其它当未锚定 regex。[E: packages/hooks/hooks-claude-code/src/index.ts:153] [E: packages/hooks/hook-protocol/src/matcher.ts:61]

5. **`runPoint` 跑命令并 fold。** cwd = `agent.session.header.cwd`（不是 executor 默认 / 进程启动目录）。[E: packages/hooks/hooks-claude-code/src/index.ts:147] `CLAUDE_PROJECT_DIR` env = `config.projectDir ?? workdir`。[E: packages/hooks/hooks-claude-code/src/index.ts:150] [E: packages/hooks/hooks-claude-code/src/index.ts:151] stdin：`JSON.stringify(payload) + '\n'`（`trailingNewline: true`），`expectedEventName` 钉成正在开火的事件名。[E: packages/hooks/hooks-claude-code/src/index.ts:169] [E: packages/hooks/hooks-claude-code/src/index.ts:172] [E: packages/hooks/hook-protocol/src/runner.ts:75] 开着的 turn 才写 `hook/invoked` / `hook/result`（`dialect: 'claude-code'`，`handlerId` 形如 `claude-code:${point}:${n}`）。[E: packages/hooks/hooks-claude-code/src/index.ts:158] [E: packages/hooks/hooks-claude-code/src/index.ts:182] 然后 `mergeHookOutputs`（deny > ask > allow）。[E: packages/hooks/hooks-claude-code/src/index.ts:186] [E: packages/hooks/hook-protocol/src/merge.ts:62]

6. **`updatedInput` logged + warned，不 honoring。** `runHook` 会把 `hookSpecificOutput.updatedInput` 解出来；本桥只 `logger.warn(… not yet honored (ignored))`，工具仍拿到原始 `exec.arguments`。[E: packages/hooks/hooks-claude-code/src/index.ts:176] [E: packages/hooks/hooks-claude-code/tests/coverage-cases.ts:129] [E: packages/hooks/hooks-claude-code/tests/coverage-cases.ts:130] `systemMessage` 同样 warn、不进模型请求。[E: packages/hooks/hooks-claude-code/src/index.ts:179] [E: packages/hooks/hooks-claude-code/tests/coverage-cases.ts:738] `{"continue":false}` 在 `hook/result` 里记 `decision: 'stop'`，**不**停 turn、不挡工具（`TODO(hook-continue-false)`）。[E: packages/hooks/hooks-claude-code/tests/coverage-cases.ts:432] [E: packages/hooks/hooks-claude-code/tests/coverage-cases.ts:433]

7. **`SessionStart` → `agent/session-start`（emit，detached）。** matchQuery 是 `source`（例如 `'startup'`）。跑完若有 `additionalContext`，`agent.inject`。慢 hook 可能赶不上第一轮请求；没有 startup gate。[E: packages/hooks/hooks-claude-code/src/index.ts:206] [E: packages/hooks/hooks-claude-code/src/index.ts:210] [E: packages/core/agent/src/runtime-types.ts:217] [E: packages/hooks/hooks-claude-code/tests/coverage-cases.ts:757] 失败进 `.catch` warn，不炸 loop。没有开 turn，所以不写 `hook/*` 对。

8. **`UserPromptSubmit` → `agent/pre-step`（waterfall）。** `messages.length === 0` 直接 `next()`（工具续步空批次不跑 hook）。[E: packages/hooks/hooks-claude-code/src/index.ts:220] matchQuery 是 `''`。`merged.decision === 'deny'` → `{ kind: 'reject' }`，**不** `next()`，turn 在任何 model step 之前关上。[E: packages/hooks/hooks-claude-code/src/index.ts:224] [E: packages/hooks/hooks-claude-code/tests/bridge.spec.ts:112] 否则 `await next()`，只在下游仍是 `enter` 时把本桥 context **接到** `downstream.messages` 末尾；下游 `reject` 则原样返回，不注入。[E: packages/hooks/hooks-claude-code/src/index.ts:228] [E: packages/hooks/hooks-claude-code/src/index.ts:230] [E: packages/hooks/hooks-claude-code/tests/coverage-cases.ts:508]

9. **`PreToolUse` → `tools/pre-execute`（waterfall）。** matchQuery = `exec.name`。`deny` → `{ kind: 'deny' }`（默认理由 `blocked by PreToolUse hook`），工具 body 不跑。[E: packages/hooks/hooks-claude-code/src/index.ts:241] [E: packages/hooks/hooks-claude-code/tests/bridge.spec.ts:154] `ask` → `{ kind: 'ask' }`，**不** `next()`；叶子本是 `{ kind: 'allow' }`，但本桥先截住。shipped 树若没把 hook 答成 `ask` 的旁路，`serviceAsk` 在 `ctx.approval` 缺失时 fail-closed 成 deny。[E: packages/hooks/hooks-claude-code/src/index.ts:242] [E: packages/core/tools/src/index.ts:1477] [E: packages/core/tools/src/index.ts:1694] [E: packages/hooks/hooks-claude-code/tests/bridge.spec.ts:245] 其它决策 `return next()`，把审批 / 叶子留给下游。[E: packages/hooks/hooks-claude-code/src/index.ts:243] `hookSpecificOutput.hookEventName` 对不上开火事件时，event-scoped `permissionDecision` 被丢掉，工具照跑。[E: packages/hooks/hooks-claude-code/tests/coverage-cases.ts:468]

10. **`PostToolUse` → `tools/post-execute`（waterfall）。** 工具 **已经**跑完。本桥 `deny` → `{ kind: 'block', feedback }`（可带 additionalContexts），不 `next()`。[E: packages/hooks/hooks-claude-code/src/index.ts:252] [E: packages/hooks/hooks-claude-code/tests/bridge.spec.ts:201] 否则 `await next()`，再把本桥 context **前置**到下游 `additionalContexts`（下游 `block` 也带着）。[E: packages/hooks/hooks-claude-code/src/index.ts:256] [E: packages/hooks/hooks-claude-code/src/index.ts:259]

11. **`Stop` → `agent/turn-stopping`（serial，无 `next`）。** matchQuery `''`。`deny` 时 `agent.steer` 一条 plugin user 消息（理由或缺省 `continue: blocked by Stop hook`），机器看见 pending input 再跑一步。没有连续续步上限。[E: packages/hooks/hooks-claude-code/src/index.ts:270] [E: packages/hooks/hooks-claude-code/src/index.ts:275] [E: packages/core/agent/src/runtime-types.ts:278] [E: packages/hooks/hooks-claude-code/tests/coverage-cases.ts:213] payload 带 `stop_hook_active: false`。[E: packages/hooks/hooks-claude-code/src/index.ts:346]

12. **`SubagentStart` / `SubagentStop` → `subagent/start` / `subagent/end`（emit，detached）。** start 边用 `ctx.get('agents')?.get(info.id)` 把 child 记进 `subagentChildren`，好在 handle 注销后 stop 仍用 **子会话** cwd。[E: packages/hooks/hooks-claude-code/src/index.ts:283] [E: packages/hooks/hooks-claude-code/src/index.ts:292] matchQuery 永远是 `general-purpose`。Start 可 `child.inject`；Stop 只观察。payload 含 `agent_id` / `agent_type`；Stop 另有 `stop_hook_active: false`。[E: packages/hooks/hooks-claude-code/src/index.ts:357] [E: packages/hooks/hooks-claude-code/src/index.ts:359]

13. **waterfall 必须 `next()`。** Cordis `Events.waterfall` 靠传入的 `next()` 才 `shift` 下一层；不调用 = 下游 listener 和内建叶子都不跑。[E: vendor/cordis/src/events.ts:238] [E: vendor/cordis/src/events.ts:242] 本桥在 **自己要否决** 时故意不 `next()`（prompt reject / pre-tool deny|ask / post-tool block）；放行路径必须 `await next()`。

14. **卸纤维。** `ctx.effect` 的 disposer 调 `detached.drain()`：abort 仍在跑的 hook 进程，等到 continuation 静默。[E: packages/hooks/hooks-claude-code/src/index.ts:126] [E: packages/hooks/hook-protocol/src/detached.ts:54] dispose 后 listener 不再挡 prompt。[E: packages/hooks/hooks-claude-code/tests/bridge.spec.ts:427] 模块 **没有** `export default`，Loader `unwrapExports` 才能保住 `name` / `inject` / `apply`。[E: packages/hooks/hooks-claude-code/tests/bridge.spec.ts:436] [E: packages/hooks/hooks-claude-code/tests/bridge.spec.ts:438]

## 设计动机

DSH 是 Cordis 组合运行时，拦截点已经在 agent / tools / subagent 上。要兼容一份现成的 Claude Code `hooks.json`，最短路径是 **桥**：parse 它认识的 7 个事件，stdin 做成 CC 形状，命令丢给 `ctx.shell`，决策折回已有 Decision 类型。再实现整张 HookEvent 表会把 Claude 运行时搬进 DSH，也和「bespoke 行为请写 typed native plugin」冲突。

所以本包故意窄：只 command、只 7 点、`updatedInput` 解了也不改 `exec.arguments`。改输入 / 加 27 事件是另一条产品决策，不是这座桥的工作。

`inject` 只钉 `shell`，其余 `ctx.get`，是为了 overlay 能在缺 persistence / 缺 subagent 的测试或瘦部署里仍然 load。config 进程级读一次，是诚实的限制（源码里的 `TODO(per-session-hook-config)`），不是「每个会话自动发现项目根 hooks.json」。

restrictive merge + 放行时 `next()`，让后注册的策略 listener 仍能 reject / block。本桥 deny 时不 `next()`，是因为 deny 已经是最严结果。

## Gotcha

- **默认产品不跑这座桥。** 仓库里有包 ≠ `dsh web` / `dsh-base` 已装。要跑，显式 overlay。
- **7 ≠ 全表。** `PreCompact` / `Notification` / `Setup` 这类名字 parse 阶段就被跳过，不会 warn 成「未实现事件」，只是当它们不存在。
- **`updatedInput` 看起来成功、参数不变。** warn 在 logger，工具 `execute` 仍见原始 args。[E: packages/hooks/hooks-claude-code/tests/coverage-cases.ts:129]
- **`continue:false` 只出现在 `hook/result.decision === 'stop'`。** turn 照样 `completed`。[E: packages/hooks/hooks-claude-code/tests/coverage-cases.ts:432]
- **SessionStart 是 best-effort。** 立刻 `followup` 的第一轮可以看不见 inject 的 context。[E: packages/hooks/hooks-claude-code/tests/coverage-cases.ts:757]
- **子代理 matcher 不是真实 kind。** 配置 `matcher: 'code-reviewer'` 的 SubagentStart **不会**因 DSH 子代理开火。
- **一份非法 regex 废掉整桥。** 支持事件上的 `(` 让 `apply` 早退；不要指望「其它事件还在」。[E: packages/hooks/hooks-claude-code/tests/bridge.spec.ts:382]
- **`ask` 在无 `ctx.approval` 时就是 deny。** 本桥只返回 `{ kind: 'ask' }`；fail-closed 是 tools `serviceAsk`。[E: packages/core/tools/src/index.ts:1694]
- **exit 2 才 block；127 不 block。** 找不到命令是 non-blocking error，工具继续。[E: packages/hooks/hooks-claude-code/tests/coverage-cases.ts:397]
- **替换 vs env。** `${CLAUDE_PROJECT_DIR}` 在 **parse** 时替换；进程里的 `$CLAUDE_PROJECT_DIR` 是 run 时 env，默认等于 session cwd。[E: packages/hooks/hooks-claude-code/src/config.ts:60] [E: packages/hooks/hooks-claude-code/src/index.ts:150]
- **不要 `export default apply`。** 有 `inject` 的 namespace 插件被 `unwrapExports` 塌成函数会丢掉 `inject`，load 直接炸。[E: packages/hooks/hooks-claude-code/tests/bridge.spec.ts:436]

## Seam 三角

| 角色 | 包 | ctx 键 / 合同 | bundle / preset 行 |
|---|---|---|---|
| Definition | 本包 `config.ts` + payload 函数；共享 `CommandHook` / `HookOutput` 在 `dsh-hook-protocol` | **无** `ctx.hooks`。合同是 7 个 CC 事件名 ↔ Cordis 扩展点 | 无 shipped 行 |
| Provider | 不是服务 Provider。`apply` 只 `ctx.on` 已有点 | 决策类型归 agent / tools；本桥是 listener | 仅 `examples/acp-agent/cordis.yml` `id: hooks-claude-code` |
| Consumer | 本桥 `inject = ['shell']`；`ctx.get('agents')` / `ctx.get('sessionPersistence')` | hook 命令走 `runHook(ctx.shell, …)` | 需要 host 已有 `ctx.shell`（base 的 bash/pwsh sandbox 行） |

换 Codex 方言换另一座桥，不要改这张 7 事件表。换 hook 执行实现只动 hook-protocol。给某个扩展点写 typed native plugin 不必经过本包，也不会留下 `hook/*` 记录。

## Sources

- packages/hooks/hooks-claude-code/src/index.ts
- packages/hooks/hooks-claude-code/src/config.ts
- packages/hooks/hooks-claude-code/src/invariant.ts
- packages/hooks/hooks-claude-code/package.json
- packages/hooks/hooks-claude-code/tests/bridge.spec.ts
- packages/hooks/hooks-claude-code/tests/config.spec.ts
- packages/hooks/hooks-claude-code/tests/coverage-cases.ts
- packages/hooks/hook-protocol/src/runner.ts
- packages/hooks/hook-protocol/src/matcher.ts
- packages/hooks/hook-protocol/src/merge.ts
- packages/hooks/hook-protocol/src/events.ts
- packages/hooks/hook-protocol/src/detached.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/base/package.json
- examples/acp-agent/cordis.yml
- examples/package.json
- packages/core/tools/src/index.ts
- packages/core/agent/src/runtime-types.ts
- vendor/cordis/src/events.ts

## 相关

- [spine.overview](../../spine/overview.md)：`profile → bundle → preset`；host 面 vs agent-preset 面。
- [subsys.interaction.hooks-protocol](./hooks-protocol.md)：`runHook` / `mergeHookOutputs` / `matchesMatcher` / `hook/*` 事件 / detached drain。
- [subsys.interaction.hooks-codex](./hooks-codex.md)：5 事件、无 SubagentStart/Stop、regex-only、stdin 不带 trailing newline。
- [surface.hooks.bridges](../../surface/hooks/bridges.md)：两座桥的 T1 对照入口。
- [spine.tool-call-anatomy](../../spine/tool-call-anatomy.md)：`tools/pre-execute` → 可选 `ask` → execute → `tools/post-execute`。
