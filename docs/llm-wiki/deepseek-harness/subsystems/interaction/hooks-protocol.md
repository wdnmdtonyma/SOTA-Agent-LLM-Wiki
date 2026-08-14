---
id: subsys.interaction.hooks-protocol
title: hook-protocol 库
kind: subsystem
tier: T2
pkg: interaction
source:
  - packages/hooks/hook-protocol/src/index.ts
  - packages/hooks/hook-protocol/src/types.ts
  - packages/hooks/hook-protocol/src/matcher.ts
  - packages/hooks/hook-protocol/src/codec.ts
  - packages/hooks/hook-protocol/src/runner.ts
  - packages/hooks/hook-protocol/src/merge.ts
  - packages/hooks/hook-protocol/src/events.ts
  - packages/hooks/hook-protocol/src/detached.ts
  - packages/hooks/hook-protocol/src/invariant.ts
  - packages/hooks/hook-protocol/package.json
  - packages/hooks/hook-protocol/tests/matcher.spec.ts
  - packages/hooks/hook-protocol/tests/codec.spec.ts
  - packages/hooks/hook-protocol/tests/runner.spec.ts
  - packages/hooks/hook-protocol/tests/merge.spec.ts
  - packages/hooks/hook-protocol/tests/events.spec.ts
  - packages/hooks/hook-protocol/tests/detached.spec.ts
  - packages/hooks/hook-protocol/tests/invariant.spec.ts
  - packages/hooks/hooks-claude-code/src/index.ts
  - packages/hooks/hooks-claude-code/src/config.ts
  - packages/hooks/hooks-codex/src/index.ts
  - packages/hooks/hooks-codex/src/config.ts
  - packages/core/session/src/known-event-types.ts
  - examples/acp-agent/cordis.yml
symbols:
  - runHook
  - mergeHookOutputs
  - matchesMatcher
  - appendHookInvoked
  - appendHookResult
  - DEFAULT_HOOK_TIMEOUT_MS
related:
  - spine.overview
  - subsys.interaction.hooks-claude
  - subsys.interaction.hooks-codex
  - surface.hooks.bridges
evidence: explicit
status: verified
updated: 47f943859b
---

> `@deepseek-ai/dsh-hook-protocol` 是 Claude Code / Codex **两座桥共用的非插件库**：matcher、command 执行与 decode、restrictive merge、`hook/invoked` + `hook/result` 耐久事件、detached 停稳。主入口只 re-export 函数与类型，**不** `apply`、**不** publish `ctx.*`，也不进 `dsh-base` / `dsh-web-app` / `dsh-headless`。它不是 Claude 那 27 个 HookEvent 的再实现；`point` 是自由字符串，扩展点映射属于两座桥。

## 能回答的问题

- 这是 Cordis 插件还是共享库？有没有 `ctx.hooks`？默认产品树会不会加载它？
- `DEFAULT_HOOK_TIMEOUT_MS` 是多少？`CommandHook.timeoutSec` 和 `defaultTimeoutMs` 单位差在哪？
- `matchesMatcher` 在 `claude-code` / `codex` 两种 `MatcherMode` 下怎么解释 pattern？谁传入 mode？
- `parseHookOutput` 对 exit 0 / 1 / 2 / `undefined` 各解码成什么？顶层 `decision: "deny"` 为什么被丢掉？
- `mergeHookOutputs` 的权限优先级是什么？`continue:false` 怎样变 sticky？reason 取哪一档？
- `hook/invoked` / `hook/result` 带不带 `surfaceOp`？没有开 turn 时 helper 会不会自己拒写？
- `createDetachedRuns().drain()` 会不会杀掉还在跑的 hook 进程？

## 职责边界

本包 `@deepseek-ai/dsh-hook-protocol` 拥有：方言中立的 `CommandHook` / `MatcherGroup` / `HookOutput`、`matchesMatcher` / `matcherDiagnostic`、`runHook` + `parseHookOutput`、`mergeHookOutputs`（deny 赢）、`appendHookInvoked` / `appendHookResult`、`createDetachedRuns`，以及可选 companion `@deepseek-ai/dsh-hook-protocol/invariant`（`hook/*` 必须落在开 turn 里且 invoked/result 成对）。

本包**不**拥有：

- Claude / Codex 的 stdin payload、env、`${CLAUDE_*}` 替换、以及把 `MergedHookOutcome` 映射到 `PreToolDecision` 等扩展点 Decision —— [`subsys.interaction.hooks-claude`](hooks-claude.md) / [`subsys.interaction.hooks-codex`](hooks-codex.md)。
- 产品面「装哪一座桥、认哪几个 point 名」—— [`surface.hooks.bridges`](../../surface/hooks/bridges.md)。本库没有 HookEvent 枚举。
- `ctx.shell` 的 resolve / run / 凭据擦除 —— [`subsys.execution.shell`](../execution/shell.md)。`runHook` 只吃传入的 `ShellExecutor`。
- `Session` 日志本体与 `deriveMessages()` —— [`subsys.core.session`](../core/session.md)。`hook/*` 是 log-only，不进 surface。

DSH 是 Cordis 组合运行时（`profile → bundle → agent preset`）。本库**不坐** host 面也不坐 agent-preset 面：它没有组合行。两座桥才是 overlay 插件（`inject = ['shell']`），只出现在 `examples/acp-agent/cordis.yml` 这类树，不在 shipped `dsh-base` / `dsh-web-app` / `dsh-headless`。默认产品路径是 `dsh web`（本地 Web GUI），本仓没有 shipped TUI。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/hooks/hook-protocol/src/index.ts` | 主入口：纯 re-export，无 `name` / `inject` / `apply` |
| `packages/hooks/hook-protocol/src/types.ts` | `HookDialect` / `CommandHook` / `MatcherMode` / `HookOutput`；merge 进 `SessionEventMap` 的 `hook/*` |
| `packages/hooks/hook-protocol/src/matcher.ts` | `matchesMatcher` / `matcherDiagnostic` |
| `packages/hooks/hook-protocol/src/codec.ts` | `parseHookOutput` |
| `packages/hooks/hook-protocol/src/runner.ts` | `DEFAULT_HOOK_TIMEOUT_MS`、`runHook` |
| `packages/hooks/hook-protocol/src/merge.ts` | `mergeHookOutputs` / `MergedHookOutcome` |
| `packages/hooks/hook-protocol/src/events.ts` | `appendHookInvoked` / `appendHookResult` / `summarizeStderr` |
| `packages/hooks/hook-protocol/src/detached.ts` | `createDetachedRuns` |
| `packages/hooks/hook-protocol/src/invariant.ts` | 可选 companion：turn 封闭 + invoked/result 配对 |
| `packages/hooks/hook-protocol/tests/*.spec.ts` | matcher / codec / runner / merge / events / detached / invariant |
| `packages/hooks/hooks-claude-code/src/index.ts` | Consumer：`matchesMatcher(..., 'claude-code')` + `runHook` + `mergeHookOutputs` |
| `packages/hooks/hooks-codex/src/index.ts` | Consumer：同一套函数，`mode: 'codex'`，`trailingNewline: false` |
| `examples/acp-agent/cordis.yml` | overlay 只挂两座**桥**，不挂本库 |

## 数据模型

| 符号 | 要点 |
|---|---|
| `HookDialect` | 只有 `'claude-code' \| 'codex'`。事件上的方言戳，不是 27 个 HookEvent 表。 [E: packages/hooks/hook-protocol/src/types.ts:48] |
| `MatcherMode` | 同样两个字符串。桥传入；本库按 mode 解释 pattern，不替桥挑选方言。 [E: packages/hooks/hook-protocol/src/types.ts:79] |
| `CommandHook` | `{ command, timeoutSec? }`。`timeoutSec` 是 **秒**（wire 单位）。非 command 类型到不了 runner。 [E: packages/hooks/hook-protocol/src/types.ts:60] |
| `MatcherGroup` | 可选 `matcher` + `hooks: CommandHook[]`。缺省 / `''` / `'*'` = match-all。 [E: packages/hooks/hook-protocol/src/types.ts:69] [E: packages/hooks/hook-protocol/src/matcher.ts:14] |
| `HookOutput` | 方言中立结果。字段全可选（除 `exitCode` / `stderr` / `stdout`）。`decision` 只允许 `'approve' \| 'allow' \| 'block' \| 'deny' \| 'ask'`。`updatedInput` 只解析，本库不改 tool 入参。 [E: packages/hooks/hook-protocol/src/types.ts:119] [E: packages/hooks/hook-protocol/src/types.ts:136] |
| `MergedDecision` | `'allow' \| 'ask' \| 'deny' \| 'none'`。`block`/`deny` 都折成 `deny`；`approve`/`allow` 都折成 `allow`。 [E: packages/hooks/hook-protocol/src/merge.ts:12] [E: packages/hooks/hook-protocol/src/merge.ts:47] |
| `DEFAULT_HOOK_TIMEOUT_MS` | `600_000`（10 分钟）。两座桥的 `defaultTimeoutMs` config 默认都指它。 [E: packages/hooks/hook-protocol/src/runner.ts:20] [E: packages/hooks/hooks-claude-code/src/index.ts:76] [E: packages/hooks/hooks-codex/src/index.ts:63] |
| `DEFAULT_STDERR_SUMMARY_MAX_CHARS` | `500`。截断规则在本库；桥把 config 值传进 `appendHookResult`。 [E: packages/hooks/hook-protocol/src/events.ts:53] |
| `hook/invoked` | `{ turn, point, dialect, handlerId, matcher? }`。声明 merge 进 `SessionEventMap`。无 `surfaceOp`。 [E: packages/hooks/hook-protocol/src/types.ts:19] |
| `hook/result` | `{ turn, point, handlerId, decision, exitCode?, stderrSummary?, durationMs }`。与 invoked 靠 `handlerId`（invariant 还加上 turn+point）配对。 [E: packages/hooks/hook-protocol/src/types.ts:31] [E: packages/core/session/src/known-event-types.ts:36] |

`HookOutput.decision` 来自两条**分开的**通道：顶层 legacy `decision` 只认 `approve`/`block`；`hookSpecificOutput.permissionDecision` 只认 `allow`/`deny`/`ask`。后者覆盖前者。 [E: packages/hooks/hook-protocol/src/codec.ts:39] [E: packages/hooks/hook-protocol/src/codec.ts:44] [E: packages/hooks/hook-protocol/src/codec.ts:126]

## 控制流

1. **主入口不是插件。** `index.ts` 只 re-export `matchesMatcher` / `runHook` / `mergeHookOutputs` / `appendHookInvoked` / `createDetachedRuns` 等。没有 `export const name`、没有 `inject`、没有 `apply`。调用方 `import` 即可，不会出现 `ctx.hooks`。 [E: packages/hooks/hook-protocol/src/index.ts:16] [E: packages/hooks/hook-protocol/src/index.ts:18] [E: packages/hooks/hook-protocol/src/index.ts:20] [E: packages/hooks/hook-protocol/package.json:2]

2. **组合树上没有本库行。** shipped `dsh-base` / `dsh-web-app` / `dsh-headless` 的 `cordis.patch.yml` 与 `package.json` 都不含 `@deepseek-ai/dsh-hook-protocol`、也不含两座桥（本页不伪造指向不存在的 YAML 行）。overlay 只挂桥：`id: hooks-claude-code` / `id: hooks-codex`。桥再 import 本库。 [E: examples/acp-agent/cordis.yml:181] [E: examples/acp-agent/cordis.yml:189]

3. **parse 时用 `matcherDiagnostic`，runtime 用 `matchesMatcher`。** 缺省 / `''` / `'*'` 对两种 mode 都是 match-all。`claude-code` 下纯 `[A-Za-z0-9_|]+` 走字面量：`'Bash'` 精确匹配，**不**匹配 `'BashOutput'`；`'Edit|Write'` 是精确交替。其余 pattern（以及 `codex` 的全部非空 pattern）是未锚定正则：`'Bash'` 在 Codex 下**会**匹配 `'BashOutput'`。非法正则：diagnostic 返回稳定字符串，runtime 返回 `false`、不抛。 [E: packages/hooks/hook-protocol/src/matcher.ts:14] [E: packages/hooks/hook-protocol/src/matcher.ts:18] [E: packages/hooks/hook-protocol/src/matcher.ts:61] [E: packages/hooks/hook-protocol/src/matcher.ts:62] [E: packages/hooks/hook-protocol/src/matcher.ts:64] [E: packages/hooks/hook-protocol/tests/matcher.spec.ts:18] [E: packages/hooks/hook-protocol/tests/matcher.spec.ts:41]

4. **桥在 load 期拒非法 regex。** Claude 解析器对消费 matcher 的事件调 `matcherDiagnostic(matcher, 'claude-code')`，非空则 `throw new SyntaxError`。Codex 同样，mode 换成 `'codex'`。UserPromptSubmit / Stop 的 matcher 在 parse 时被丢掉（传入 `undefined`）。谁当 mode、哪些事件丢掉 matcher，是桥的方言，本库只提供谓词。 [E: packages/hooks/hooks-claude-code/src/config.ts:112] [E: packages/hooks/hooks-codex/src/config.ts:78]

5. **一次 point：先 match，再逐条 `runHook`，最后 `mergeHookOutputs`。** Claude 桥 `runPoint` 对每个 group 调 `matchesMatcher(..., 'claude-code')`，命中则 `appendHookInvoked`（仅当有 session 且 `opts.turn` 有值）→ `runHook(ctx.shell, …)` → `appendHookResult` → 全部输出交给 `mergeHookOutputs`。Codex 桥同一骨架，mode 是 `'codex'`，`trailingNewline: false`。本库不注册 `tools/pre-execute` 等 listener；waterfall 必须 `next()` 是桥的事。 [E: packages/hooks/hooks-claude-code/src/index.ts:153] [E: packages/hooks/hooks-claude-code/src/index.ts:186] [E: packages/hooks/hooks-codex/src/index.ts:131] [E: packages/hooks/hooks-codex/src/index.ts:169]

6. **`runHook@runner.ts` 永不抛。** 必填 `options.signal`。超时：有 `hook.timeoutSec` 则 `* 1000`，否则 `options.defaultTimeoutMs`。stdin = `JSON.stringify(payload)`，仅当 `trailingNewline` 才加 `'\n'`。然后 `bash.run(bash.resolve(request))`。`exitCode === null`（信号死）折成 `undefined`。executor reject（坏 workdir / 缺 shell）变成 `parseHookOutput(undefined, '', message)`，turn 继续。 [E: packages/hooks/hook-protocol/src/runner.ts:31] [E: packages/hooks/hook-protocol/src/runner.ts:67] [E: packages/hooks/hook-protocol/src/runner.ts:74] [E: packages/hooks/hook-protocol/src/runner.ts:75] [E: packages/hooks/hook-protocol/src/runner.ts:87] [E: packages/hooks/hook-protocol/src/runner.ts:91] [E: packages/hooks/hook-protocol/src/runner.ts:102] [E: packages/hooks/hook-protocol/tests/runner.spec.ts:130]

7. **`parseHookOutput@codec.ts` 按 exit 分流。** exit 2 → `decision: 'block'`，非空 stderr 当 `reason`；此时**不**读 stdout JSON。exit 0 且 trimmed stdout 以 `'{'` 开头才尝试 JSON；畸形 JSON / 纯文本留下 `stdout`，不抛。其它非零或 `undefined` exit = 非阻塞：有 stderr 记录、无 decision。`expectedEventName` 有值时，`hookSpecificOutput.hookEventName` 缺失或不同则丢掉 permission / additionalContext / updatedInput，但顶层 `decision`/`continue` 保留，claimed `hookEventName` 仍写入输出。 [E: packages/hooks/hook-protocol/src/codec.ts:66] [E: packages/hooks/hook-protocol/src/codec.ts:67] [E: packages/hooks/hook-protocol/src/codec.ts:72] [E: packages/hooks/hook-protocol/src/codec.ts:122] [E: packages/hooks/hook-protocol/src/codec.ts:123] [E: packages/hooks/hook-protocol/tests/codec.spec.ts:13] [E: packages/hooks/hook-protocol/tests/codec.spec.ts:58] [E: packages/hooks/hook-protocol/tests/codec.spec.ts:188]

8. **`mergeHookOutputs@merge.ts` 是 restrictive。** 权限秩 `deny|block=3 > ask=2 > allow|approve=1`；空列表 → `decision: 'none'`、`stop: false`。reason 只收集秩 2/3，并且只取出**获胜秩**、用 `\n\n` 拼接（deny 赢时丢掉 ask 的 reason）。`continue === false` 第一次出现时 `stop` 变 true，只记下那一次的 `stopReason`。`additionalContext` / `systemMessages` 按 hook 顺序累积，空串跳过。桥拿到 `MergedHookOutcome` 之后自己映射 Decision；本库到此结束。 [E: packages/hooks/hook-protocol/src/merge.ts:37] [E: packages/hooks/hook-protocol/src/merge.ts:62] [E: packages/hooks/hook-protocol/src/merge.ts:74] [E: packages/hooks/hook-protocol/src/merge.ts:79] [E: packages/hooks/hook-protocol/src/merge.ts:94] [E: packages/hooks/hook-protocol/tests/merge.spec.ts:25] [E: packages/hooks/hook-protocol/tests/merge.spec.ts:11]

9. **耐久事件是 log-only。** `appendHookInvoked` 在 matcher 缺省时省略该键。`appendHookResult` 的 `decision` = `output.decision`，否则 `continue === false` → `'stop'`，再否则 `'pass'`；无 exit / 空 stderr 时省略对应键。`summarizeStderr` 先 trim，超 `maxChars` 切一刀加 `…`。helper **自己不检查**开 turn：events 测试在无 `turn/start` 的 `Session.create` 上也能 append，且事件没有 `surfaceOp`。 [E: packages/hooks/hook-protocol/src/events.ts:81] [E: packages/hooks/hook-protocol/src/events.ts:99] [E: packages/hooks/hook-protocol/src/events.ts:67] [E: packages/hooks/hook-protocol/tests/events.spec.ts:21] [E: packages/hooks/hook-protocol/tests/events.spec.ts:59]

10. **配对不变量是可选 companion，不是主入口。** `@deepseek-ai/dsh-hook-protocol/invariant` 才有 `name = 'hook-protocol-invariant'`、`inject = ['invariants']`、`apply`。它要求 `hook/*` 落在开 turn、`data.turn` 等于当前 turn、dialect 只能是那两个值；result 必须有匹配的 invoked（键是 `turn + point + handlerId`），`durationMs` 非负有限。测试用 `ctx.plugin` 显式挂上。shipped bundle 没有这条 companion 行。 [E: packages/hooks/hook-protocol/src/invariant.ts:11] [E: packages/hooks/hook-protocol/src/invariant.ts:37] [E: packages/hooks/hook-protocol/src/invariant.ts:46] [E: packages/hooks/hook-protocol/tests/invariant.spec.ts:80]

11. **detached 停稳。** `createDetachedRuns()` 给每个桥一份 tracker：`track` 登记整条 Promise 链（hook + continuation），settled 后从 Set 删掉。`drain` 先 `abort(new Error('hook bridge disposed'))`，再 `while (inflight.size > 0)` `allSettled`——drain 过程中新 track 的链也要等完。拒绝的链被 bookkeeping 吞掉，调用方仍须自己 `.catch`。Claude / Codex 桥把 `drain` 注册成 effect disposer，并把 `detached.signal` 传进不 await 的 `runPoint`（再进 `runHook`）。 [E: packages/hooks/hook-protocol/src/detached.ts:48] [E: packages/hooks/hook-protocol/src/detached.ts:54] [E: packages/hooks/hook-protocol/src/detached.ts:57] [E: packages/hooks/hook-protocol/tests/detached.spec.ts:18] [E: packages/hooks/hooks-claude-code/src/index.ts:126] [E: packages/hooks/hooks-claude-code/src/index.ts:207]

## 设计动机

两座桥要对齐「怎么跑一条 command hook」，又必须各写各的 payload / env / 扩展点 Decision。把 matcher、codec、merge、事件、停稳抽成无 `ctx.*` 的库，桥才能保持方言差在自己包里，而不复制一份 10 分钟超时和 deny 赢的规则。

restrictive merge 是安全取向：多条 hook 同时说话时，禁止压过允许。reason 只暴露获胜秩，避免 deny 赢了还把「请审批」的 ask 文案拼进同一条异议。

`runHook` 永不抛，是为了让坏 workdir / 被 SIGKILL 的 hook 变成非阻塞记录，而不是炸掉正在跑的 turn。超时默认 10 分钟、signal 必填，是为了和 Claude / Codex 参考引擎的「没写 timeout 就等很久」对齐，同时让 dispose 能杀掉还在跑的进程，而不是干等到 `DEFAULT_HOOK_TIMEOUT_MS`。

本库故意没有 HookEvent 表。DSH 的拦截面是 Cordis 扩展点；Claude 的 27 个事件名不是本仓的运行时词汇。原生插件应直接挂那些扩展点，不必经本协议，也不必写 `hook/*`。

## Gotcha

- **不是插件，没有 `ctx.hooks`。** 在 `dsh-base` 里找 `id: hook-protocol` 会落空。要跑 Claude / Codex 命令 hook，装的是桥，不是本库。 [E: packages/hooks/hook-protocol/src/index.ts:18]
- **不是 27 个 HookEvent。** `point` 是 string。本库不实现、不枚举 Claude 那张事件表。
- **`timeoutSec` 是秒，`defaultTimeoutMs` 是毫秒。** `timeoutSec: 3` → `timeoutMs: 3000`。忘了换算会把默认 10 分钟当成 600 秒或 600 ms。 [E: packages/hooks/hook-protocol/src/runner.ts:74] [E: packages/hooks/hook-protocol/tests/runner.spec.ts:93]
- **`trailingNewline` 由桥决定。** Claude 传 `true`，Codex 传 `false`。本库不猜方言。 [E: packages/hooks/hook-protocol/src/runner.ts:75] [E: packages/hooks/hooks-codex/src/index.ts:146]
- **顶层 `{"decision":"deny"}` 是无效的，会被丢掉。** `allow`/`deny`/`ask` 只能来自 `permissionDecision`。 [E: packages/hooks/hook-protocol/tests/codec.spec.ts:58]
- **`'Bash'` 在两种 mode 下不是同一谓词。** Claude 字面量精确匹配；Codex 当 `/Bash/`，会打中 `BashOutput`。 [E: packages/hooks/hook-protocol/tests/matcher.spec.ts:18] [E: packages/hooks/hook-protocol/tests/matcher.spec.ts:41]
- **merge 是 deny 赢，不是先到先得。** 空列表是 `none`，不是 `allow`。allow 的 reason 根本不会进桶。 [E: packages/hooks/hook-protocol/tests/merge.spec.ts:11] [E: packages/hooks/hook-protocol/src/merge.ts:74]
- **`appendHook*` 不强制检查 turn。** 没挂 invariant companion 时，裸 `Session` 也能写出 `hook/invoked`。桥约定：只有带 `opts.turn` 的 mid-turn 点才写对；SessionStart 这类 detached 点不写 `hook/*`。 [E: packages/hooks/hook-protocol/tests/events.spec.ts:13] [E: packages/hooks/hook-protocol/tests/invariant.spec.ts:80]
- **信号死 = 非阻塞。** `exitCode: null` → `undefined`，没有 `decision: 'block'`。只有数值 2 才 block。 [E: packages/hooks/hook-protocol/src/runner.ts:91] [E: packages/hooks/hook-protocol/tests/runner.spec.ts:125]
- **`updatedInput` 解析了也不应用。** 它只是 `HookOutput` 上的字段。Claude 桥打 warn 后忽略；本库没有 rewrite API。 [E: packages/hooks/hook-protocol/src/types.ts:136]
- **`drain` 必须 track 整条链。** 只 track `runHook`、把 inject/warn 放在未登记的 `.then` 里，dispose 会在副作用跑完前返回。拒绝必须由调用方 `.catch`，tracker 只做结算记账。 [E: packages/hooks/hook-protocol/src/detached.ts:48] [E: packages/hooks/hook-protocol/tests/detached.spec.ts:57]

## Seam 三角

| 角色 | 包 | ctx 键 / 合同 | bundle / preset 行 |
|---|---|---|---|
| Definition | `@deepseek-ai/dsh-hook-protocol` | **无** `ctx.*`。合同是 `runHook` / `parseHookOutput` / `mergeHookOutputs` / `matchesMatcher` / `appendHook*` / `createDetachedRuns` | 无。主入口不是 Cordis 插件 |
| Provider | 无（本库不 `provide`） | hook 进程经调用方传入的 `ShellExecutor`（通常是 host 面 `ctx.shell`） | shell 行在 `dsh-base`；与本库无关 |
| Consumer | `@deepseek-ai/dsh-hooks-claude-code`、`@deepseek-ai/dsh-hooks-codex` | `inject = ['shell']`；import 本库；自己挂 Cordis 监听点并必须 `next()` | 不在 shipped bundle。overlay：`examples/acp-agent/cordis.yml` 的 `id: hooks-claude-code` / `id: hooks-codex` |

换桥 = 换 payload / env / Decision 映射，不换 matcher 引擎和 merge 规则。换 `ctx.shell` Provider 会带走 hook 命令的真实 spawn 世界。原生插件要拦同一批扩展点，应直接挂 listener，不要假扮成第三种 `HookDialect`。

## Sources

- packages/hooks/hook-protocol/src/index.ts
- packages/hooks/hook-protocol/src/types.ts
- packages/hooks/hook-protocol/src/matcher.ts
- packages/hooks/hook-protocol/src/codec.ts
- packages/hooks/hook-protocol/src/runner.ts
- packages/hooks/hook-protocol/src/merge.ts
- packages/hooks/hook-protocol/src/events.ts
- packages/hooks/hook-protocol/src/detached.ts
- packages/hooks/hook-protocol/src/invariant.ts
- packages/hooks/hook-protocol/package.json
- packages/hooks/hook-protocol/tests/matcher.spec.ts
- packages/hooks/hook-protocol/tests/codec.spec.ts
- packages/hooks/hook-protocol/tests/runner.spec.ts
- packages/hooks/hook-protocol/tests/merge.spec.ts
- packages/hooks/hook-protocol/tests/events.spec.ts
- packages/hooks/hook-protocol/tests/detached.spec.ts
- packages/hooks/hook-protocol/tests/invariant.spec.ts
- packages/hooks/hooks-claude-code/src/index.ts
- packages/hooks/hooks-claude-code/src/config.ts
- packages/hooks/hooks-codex/src/index.ts
- packages/hooks/hooks-codex/src/config.ts
- packages/core/session/src/known-event-types.ts
- examples/acp-agent/cordis.yml

## 相关

- [spine.overview](../../spine/overview.md)（`spine.overview`）：`profile → bundle → preset`；host 面 vs agent-preset 面。本库两面都不坐。
- [subsys.interaction.hooks-claude](hooks-claude.md)（`subsys.interaction.hooks-claude`）：Claude 桥；7 个 CC 事件 → Cordis 监听点；`updatedInput` 只 warn。
- [subsys.interaction.hooks-codex](hooks-codex.md)（`subsys.interaction.hooks-codex`）：Codex 桥；5 个点；regex-only；stdin 无尾换行。
- [surface.hooks.bridges](../../surface/hooks/bridges.md)（`surface.hooks.bridges`）：两座桥的产品面装配（planned）。
