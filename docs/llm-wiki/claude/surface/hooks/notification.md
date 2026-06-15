---
id: hook.notification
path: surface/hooks/notification.md
title: Notification Hook 事件
kind: hook-event
tier: T1
source: [types/hooks.ts, utils/hooks.ts]
symbols: [Notification]
related: [subsys.hooks-feature]
evidence: explicit
status: verified
updated: 2026-06-14
---

> `Notification` 是 Claude Code hooks 系统的 hook event; 本节点覆盖它的触发入口、输入 JSON、响应 JSON 和 block 语义。

## 能回答的问题

- `Notification` hook 什么时候触发?
- `Notification` hook 的输入 JSON 有哪些字段?
- `Notification` hook 可以返回哪些 sync/async 响应字段?
- `Notification` hook 是否能 block 当前流程?

## 1 事件身份

`Notification` 的 fire 入口在 `utils/hooks.ts` 的 `executeNotificationHooks()`; 该入口构造的 `hookInput.hook_event_name` 是 `Notification`。[E: utils/hooks.ts:3570][E: utils/hooks.ts:3581] `types/hooks.ts` 通过 `isHookEvent(value)` 调用 `HOOK_EVENTS.includes(...)` 校验字符串是否属于 hook event 集合。[E: types/hooks.ts:22][E: types/hooks.ts:23]

## 2 触发时机与 fire 点

CLI 需要发通知时, 调用方把 message、title 和 notificationType 交给 `executeNotificationHooks()`。 [E: utils/hooks.ts:3570][E: utils/hooks.ts:3581] `executeNotificationHooks()` 构造输入后调用 hook executor, 因此 `utils/hooks.ts:3587` 是本节点记录的源码 fire 点。[E: utils/hooks.ts:3587]

## 3 输入 JSON 字段

公共输入字段由 `createBaseHookInput()` 生成: `session_id` 来自解析后的 session id, `transcript_path` 来自该 session 的 transcript 路径, `cwd` 来自当前工作目录, `permission_mode` 保留传入的权限模式, `agent_id` 和 `agent_type` 来自 agent 信息或主线程 agent 类型。[E: utils/hooks.ts:315][E: utils/hooks.ts:321][E: utils/hooks.ts:322][E: utils/hooks.ts:323][E: utils/hooks.ts:324][E: utils/hooks.ts:325][E: utils/hooks.ts:326]

事件专属字段如下:

| 字段 | 含义 | 证据 |
| --- | --- | --- |
| `hook_event_name` | `Notification` literal | [E: utils/hooks.ts:3581] |
| `message` | 通知正文 | [E: utils/hooks.ts:3582] |
| `title` | 可选通知标题 | [E: utils/hooks.ts:3583] |
| `notification_type` | 通知类型, 也是 matcher query | [E: utils/hooks.ts:3584] |

## 4 匹配与 IO

matcher query 使用 `notification_type`; wrapper 把 `notificationType` 作为 `matchQuery` 传入, `getMatchingHooks()` 在 `Notification` case 中把 `hookInput.notification_type` 作为匹配值。[E: utils/hooks.ts:3590][E: utils/hooks.ts:1634][E: utils/hooks.ts:1635]
`Notification` 使用 outside-REPL executor 或专用 outside-REPL wrapper; `executeHooksOutsideREPL()` 会把 hookInput 序列化后并行执行 matched hooks, 并返回 `HookOutsideReplResult[]` 或由 wrapper 消费该数组。[E: utils/hooks.ts:3003][E: utils/hooks.ts:3077][E: utils/hooks.ts:3380]

`Notification` 在 outside-REPL 路径中由 `executeHooksOutsideREPL()` 直接序列化 `hookInput`; command hook 调用 `execCommandHook(..., jsonInput, ...)` 后通过 stdin 收到 `jsonInput + '\n'`, HTTP hook 调用 `execHttpHook(..., jsonInput, ...)`。[E: utils/hooks.ts:3077][E: utils/hooks.ts:3286][E: utils/hooks.ts:3290][E: utils/hooks.ts:1210][E: utils/hooks.ts:3193][E: utils/hooks.ts:3196] outside-REPL 的 prompt hook 和 agent hook 会返回 unsupported 结果, function hook 也被视为 outside-REPL 内部错误路径。[E: utils/hooks.ts:3153][E: utils/hooks.ts:3157][E: utils/hooks.ts:3163][E: utils/hooks.ts:3167][E: utils/hooks.ts:3174][E: utils/hooks.ts:3183]

## 5 响应 JSON

Sync JSON response 仍由 `hookJSONOutputSchema` 校验, async JSON response 仍是 `{ async: true, asyncTimeout?: number }`。[E: types/hooks.ts:169][E: types/hooks.ts:171][E: types/hooks.ts:172][E: types/hooks.ts:173] outside-REPL callback hook 会把 `systemMessage` 或 WorktreeCreate 的 `worktreePath` 投影成 `output`, 并只用顶层 `decision:'block'` 计算 `blocked`。[E: utils/hooks.ts:3117][E: utils/hooks.ts:3121][E: utils/hooks.ts:3122][E: utils/hooks.ts:3123][E: utils/hooks.ts:3124] outside-REPL HTTP hook 会把 sync JSON 的顶层 `decision:'block'` 投影成 `blocked`, 返回字段是 `command`, `succeeded`, `output`, `blocked`。[E: utils/hooks.ts:3237][E: utils/hooks.ts:3241][E: utils/hooks.ts:3257][E: utils/hooks.ts:3261] outside-REPL command hook 会用 stdout 解析 JSON, 把 exit code 2 或 sync JSON `decision:'block'` 投影成 `blocked`, 并返回 `command`, `succeeded`, `output`, `blocked`, `watchPaths`, `systemMessage`。[E: utils/hooks.ts:3316][E: utils/hooks.ts:3333][E: utils/hooks.ts:3334][E: utils/hooks.ts:3351][E: utils/hooks.ts:3355][E: utils/hooks.ts:3356][E: utils/hooks.ts:3357] outside-REPL wrapper 不把顶层 `continue`, `stopReason` 或 `decision:'approve'` 转成 REPL 的 `AggregatedHookResult` 字段。[I]

事件专属响应字段: `hookSpecificOutput.hookEventName` 可以是 `Notification`, schema 接受 `additionalContext`; 但 `executeNotificationHooks()` 使用 outside-REPL 路径且不读取返回值, 因此该 wrapper 不把 additional context 送入模型上下文。[E: types/hooks.ts:117][E: types/hooks.ts:118][E: utils/hooks.ts:3570][E: utils/hooks.ts:3587][I]

## 6 是否能 block

不能通过该 wrapper 阻断主流程。`executeNotificationHooks()` 返回 `Promise<void>`, 调用 `executeHooksOutsideREPL()` 后不检查 `blocked`。[E: utils/hooks.ts:3570][E: utils/hooks.ts:3577][E: utils/hooks.ts:3587]

## Sources

- `types/hooks.ts`
- `utils/hooks.ts`

## 相关

- [Hooks feature](../../subsystems/hooks-feature.md)
