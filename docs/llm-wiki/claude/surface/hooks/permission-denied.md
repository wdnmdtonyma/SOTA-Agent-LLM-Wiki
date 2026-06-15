---
id: hook.permission-denied
path: surface/hooks/permission-denied.md
title: PermissionDenied Hook 事件
kind: hook-event
tier: T1
source: [types/hooks.ts, utils/hooks.ts]
symbols: [PermissionDenied]
related: [subsys.hooks-feature]
evidence: explicit
status: verified
updated: 2026-06-14
---

> `PermissionDenied` 是 Claude Code hooks 系统的 hook event; 本节点覆盖它的触发入口、输入 JSON、响应 JSON 和 block 语义。

## 能回答的问题

- `PermissionDenied` hook 什么时候触发?
- `PermissionDenied` hook 的输入 JSON 有哪些字段?
- `PermissionDenied` hook 可以返回哪些 sync/async 响应字段?
- `PermissionDenied` hook 是否能 block 当前流程?

## 1 事件身份

`PermissionDenied` 的 fire 入口在 `utils/hooks.ts` 的 `executePermissionDeniedHooks()`; 该入口构造的 `hookInput.hook_event_name` 是 `PermissionDenied`。[E: utils/hooks.ts:3529][E: utils/hooks.ts:3547] `types/hooks.ts` 通过 `isHookEvent(value)` 调用 `HOOK_EVENTS.includes(...)` 校验字符串是否属于 hook event 集合。[E: types/hooks.ts:22][E: types/hooks.ts:23]

## 2 触发时机与 fire 点

工具权限被拒绝后, 调用方把 tool name、输入、tool use id 和拒绝原因交给 `executePermissionDeniedHooks()`。 [E: utils/hooks.ts:3529][E: utils/hooks.ts:3547] `executePermissionDeniedHooks()` 构造输入后调用 hook executor, 因此 `utils/hooks.ts:3554` 是本节点记录的源码 fire 点。[E: utils/hooks.ts:3554]

## 3 输入 JSON 字段

公共输入字段由 `createBaseHookInput()` 生成: `session_id` 来自解析后的 session id, `transcript_path` 来自该 session 的 transcript 路径, `cwd` 来自当前工作目录, `permission_mode` 保留传入的权限模式, `agent_id` 和 `agent_type` 来自 agent 信息或主线程 agent 类型。[E: utils/hooks.ts:315][E: utils/hooks.ts:321][E: utils/hooks.ts:322][E: utils/hooks.ts:323][E: utils/hooks.ts:324][E: utils/hooks.ts:325][E: utils/hooks.ts:326]

事件专属字段如下:

| 字段 | 含义 | 证据 |
| --- | --- | --- |
| `hook_event_name` | `PermissionDenied` literal | [E: utils/hooks.ts:3547] |
| `tool_name` | 权限被拒绝的工具名 | [E: utils/hooks.ts:3548] |
| `tool_input` | 工具输入 | [E: utils/hooks.ts:3549] |
| `tool_use_id` | 当前 tool use id | [E: utils/hooks.ts:3550] |
| `reason` | 拒绝原因 | [E: utils/hooks.ts:3551] |

## 4 匹配与 IO

matcher query 使用 `tool_name`; wrapper 把 `toolName` 作为 `matchQuery` 传入, `getMatchingHooks()` 在 `PermissionDenied` case 中把 `hookInput.tool_name` 作为匹配值。[E: utils/hooks.ts:3557][E: utils/hooks.ts:1621][E: utils/hooks.ts:1622]
`PermissionDenied` 使用 REPL generator path; `executeHooks()` 会 yield progress、message、blockingError、additional context、permission/update 等聚合结果。[E: utils/hooks.ts:1952][E: utils/hooks.ts:2096][E: utils/hooks.ts:2744][E: utils/hooks.ts:2759]

`PermissionDenied` 在 REPL 路径中由 `executeHooks()` 惰性生成 `jsonInput`。[E: utils/hooks.ts:2133] command hook 通过 stdin 收到 `jsonInput + '\n'`。[E: utils/hooks.ts:1210] prompt hook 只在 `toolUseContext` guard 通过后把 `jsonInput` 传给 `execPromptHook()`。[E: utils/hooks.ts:2224][E: utils/hooks.ts:2230][E: utils/hooks.ts:2234] agent hook 只在 `toolUseContext` 和 `messages` guard 通过后把 `jsonInput` 传给 `execAgentHook()`。[E: utils/hooks.ts:2256][E: utils/hooks.ts:2262][E: utils/hooks.ts:2267][E: utils/hooks.ts:2271] HTTP hook 把 `jsonInput` 传给 `execHttpHook()`, 但 `SessionStart` 和 `Setup` 会在匹配后过滤 HTTP hooks。[E: utils/hooks.ts:2302][E: utils/hooks.ts:2305][E: utils/hooks.ts:1853][E: utils/hooks.ts:1854] stdout 以 `{` 开头时按 `HookJSONOutput` 解析, 非 JSON stdout 被当作 plain text; HTTP hook 的空 body 可当作空 JSON 对象, 非 JSON body 会成为 validation error。[E: utils/hooks.ts:404][E: utils/hooks.ts:411][E: utils/hooks.ts:459][E: utils/hooks.ts:469]

## 5 响应 JSON

Sync JSON response 接受 `continue?`, `suppressOutput?`, `stopReason?`, `decision?`, `reason?`, `systemMessage?` 和 `hookSpecificOutput?`; async JSON response 是 `{ async: true, asyncTimeout?: number }`。[E: types/hooks.ts:50][E: types/hooks.ts:52][E: types/hooks.ts:56][E: types/hooks.ts:60][E: types/hooks.ts:64][E: types/hooks.ts:65][E: types/hooks.ts:66][E: types/hooks.ts:70][E: types/hooks.ts:171][E: types/hooks.ts:172][E: types/hooks.ts:173] `continue:false` 会产生 `preventContinuation`, `stopReason` 会随结果传出; 顶层 `decision:'approve'` 映射为 `permissionBehavior:'allow'`, 顶层 `decision:'block'` 映射为 `permissionBehavior:'deny'` 并生成 `blockingError`。[E: utils/hooks.ts:518][E: utils/hooks.ts:521][E: utils/hooks.ts:527][E: utils/hooks.ts:528][E: utils/hooks.ts:530][E: utils/hooks.ts:531][E: utils/hooks.ts:532] command hook 如果第一行输出 async JSON 且没有强制同步, 会被登记到 background async hook 流程。[E: utils/hooks.ts:1127][E: utils/hooks.ts:1133]

事件专属响应字段: `hookSpecificOutput.hookEventName` 必须是 `PermissionDenied`; 可返回 `retry`, 并由 `processHookJSONOutput()` 写入结果的 `retry` 字段。[E: types/hooks.ts:113][E: types/hooks.ts:114][E: utils/hooks.ts:654][E: utils/hooks.ts:655]

## 6 是否能 block

能通过公共机制 yield blockingError, 但事件专属字段是 `retry` 而不是 block; `retry` 被聚合层单独 yield 给调用方。[E: utils/hooks.ts:2648][E: utils/hooks.ts:2660][E: utils/hooks.ts:2888][E: utils/hooks.ts:2890]

## Sources

- `types/hooks.ts`
- `utils/hooks.ts`

## 相关

- [Hooks feature](../../subsystems/hooks-feature.md)
