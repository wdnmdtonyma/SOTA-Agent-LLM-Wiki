---
id: hook.stop
path: surface/hooks/stop.md
title: Stop Hook 事件
kind: hook-event
tier: T1
source: [types/hooks.ts, utils/hooks.ts]
symbols: [Stop]
related: [subsys.hooks-feature]
evidence: explicit
status: verified
updated: 2026-06-14
---

> `Stop` 是 Claude Code hooks 系统的 hook event; 本节点覆盖它的触发入口、输入 JSON、响应 JSON 和 block 语义。

## 能回答的问题

- `Stop` hook 什么时候触发?
- `Stop` hook 的输入 JSON 有哪些字段?
- `Stop` hook 可以返回哪些 sync/async 响应字段?
- `Stop` hook 是否能 block 当前流程?

## 1 事件身份

`Stop` 的 fire 入口在 `utils/hooks.ts` 的 `executeStopHooks()`; 该入口构造的 `hookInput.hook_event_name` 是 `Stop`。[E: utils/hooks.ts:3639][E: utils/hooks.ts:3682] `types/hooks.ts` 通过 `isHookEvent(value)` 调用 `HOOK_EVENTS.includes(...)` 校验字符串是否属于 hook event 集合。[E: types/hooks.ts:22][E: types/hooks.ts:23]

## 2 触发时机与 fire 点

主 agent 即将 stop 时, `executeStopHooks()` 在没有 subagentId 的分支构造 `Stop` 输入。 [E: utils/hooks.ts:3639][E: utils/hooks.ts:3682] `executeStopHooks()` 构造输入后调用 hook executor, 因此 `utils/hooks.ts:3688` 是本节点记录的源码 fire 点。[E: utils/hooks.ts:3688]

## 3 输入 JSON 字段

公共输入字段由 `createBaseHookInput()` 生成: `session_id` 来自解析后的 session id, `transcript_path` 来自该 session 的 transcript 路径, `cwd` 来自当前工作目录, `permission_mode` 保留传入的权限模式, `agent_id` 和 `agent_type` 来自 agent 信息或主线程 agent 类型。[E: utils/hooks.ts:315][E: utils/hooks.ts:321][E: utils/hooks.ts:322][E: utils/hooks.ts:323][E: utils/hooks.ts:324][E: utils/hooks.ts:325][E: utils/hooks.ts:326]

事件专属字段如下:

| 字段 | 含义 | 证据 |
| --- | --- | --- |
| `hook_event_name` | `Stop` literal | [E: utils/hooks.ts:3682] |
| `stop_hook_active` | 是否已在 stop hook 内部 | [E: utils/hooks.ts:3683] |
| `last_assistant_message` | 可选的最后一条 assistant 文本 | [E: utils/hooks.ts:3684] |

## 4 匹配与 IO

该事件没有事件特定 matcher query; `executeStopHooks()` 调用 `executeHooks()` 时没有传 `matchQuery`。[E: utils/hooks.ts:3688]
`Stop` 使用 REPL generator path; `executeHooks()` 会 yield progress、message、blockingError、additional context、permission/update 等聚合结果。[E: utils/hooks.ts:1952][E: utils/hooks.ts:2096][E: utils/hooks.ts:2744][E: utils/hooks.ts:2759]

`Stop` 在 REPL 路径中由 `executeHooks()` 惰性生成 `jsonInput`。[E: utils/hooks.ts:2133] command hook 通过 stdin 收到 `jsonInput + '\n'`。[E: utils/hooks.ts:1210] prompt hook 只在 `toolUseContext` guard 通过后把 `jsonInput` 传给 `execPromptHook()`。[E: utils/hooks.ts:2224][E: utils/hooks.ts:2230][E: utils/hooks.ts:2234] agent hook 只在 `toolUseContext` 和 `messages` guard 通过后把 `jsonInput` 传给 `execAgentHook()`。[E: utils/hooks.ts:2256][E: utils/hooks.ts:2262][E: utils/hooks.ts:2267][E: utils/hooks.ts:2271] HTTP hook 把 `jsonInput` 传给 `execHttpHook()`, 但 `SessionStart` 和 `Setup` 会在匹配后过滤 HTTP hooks。[E: utils/hooks.ts:2302][E: utils/hooks.ts:2305][E: utils/hooks.ts:1853][E: utils/hooks.ts:1854] stdout 以 `{` 开头时按 `HookJSONOutput` 解析, 非 JSON stdout 被当作 plain text; HTTP hook 的空 body 可当作空 JSON 对象, 非 JSON body 会成为 validation error。[E: utils/hooks.ts:404][E: utils/hooks.ts:411][E: utils/hooks.ts:459][E: utils/hooks.ts:469]

## 5 响应 JSON

Sync JSON response 接受 `continue?`, `suppressOutput?`, `stopReason?`, `decision?`, `reason?`, `systemMessage?` 和 `hookSpecificOutput?`; async JSON response 是 `{ async: true, asyncTimeout?: number }`。[E: types/hooks.ts:50][E: types/hooks.ts:52][E: types/hooks.ts:56][E: types/hooks.ts:60][E: types/hooks.ts:64][E: types/hooks.ts:65][E: types/hooks.ts:66][E: types/hooks.ts:70][E: types/hooks.ts:171][E: types/hooks.ts:172][E: types/hooks.ts:173] `continue:false` 会产生 `preventContinuation`, `stopReason` 会随结果传出; 顶层 `decision:'approve'` 映射为 `permissionBehavior:'allow'`, 顶层 `decision:'block'` 映射为 `permissionBehavior:'deny'` 并生成 `blockingError`。[E: utils/hooks.ts:518][E: utils/hooks.ts:521][E: utils/hooks.ts:527][E: utils/hooks.ts:528][E: utils/hooks.ts:530][E: utils/hooks.ts:531][E: utils/hooks.ts:532] command hook 如果第一行输出 async JSON 且没有强制同步, 会被登记到 background async hook 流程。[E: utils/hooks.ts:1127][E: utils/hooks.ts:1133]

事件专属响应字段: `Stop` 在 `types/hooks.ts` 的 hookSpecificOutput union 中没有事件专属分支; 该事件仍可使用顶层 sync 字段和 async 字段。[I]

## 6 是否能 block

能 block。公共 blocking result 会被聚合层 yield; `getStopHookMessage()` 会把阻断反馈格式化为 `Stop hook feedback`。[E: utils/hooks.ts:2759][E: utils/hooks.ts:2761][E: utils/hooks.ts:1894][E: utils/hooks.ts:1895]

## Sources

- `types/hooks.ts`
- `utils/hooks.ts`

## 相关

- [Hooks feature](../../subsystems/hooks-feature.md)
