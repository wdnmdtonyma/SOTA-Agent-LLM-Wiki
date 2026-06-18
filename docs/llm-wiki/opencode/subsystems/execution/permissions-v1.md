---
id: execution.permissions-v1
title: V1 权限模型(ask/allow/deny)
kind: subsystem
tier: T2
v: v1
source:
  - packages/opencode/src/permission/index.ts
  - packages/core/src/v1/permission.ts
  - packages/core/src/v1/config/permission.ts
  - packages/opencode/src/tool/shell/id.ts
symbols:
  - Permission.Service
  - Permission.evaluate
  - Permission.fromConfig
  - Permission.disabled
  - PermissionV1.Request
related:
  - execution.permissions-v2
  - ref.permission-actions
evidence: explicit
status: verified
updated: 355a0bcf5
---

> V1 权限模型是 `packages/opencode/src` 活跑路径里的进程内 approval gate：工具通过 `ctx.ask`/`Permission.Service.ask` 提交 `permission + patterns + always`，规则用 `ask|allow|deny` 三态和 wildcard last-match-wins 解析。

## 能回答的问题

- V1 的 `ask`、`allow`、`deny` 是在哪里定义和执行的？
- `always` 为什么不会写入 SQLite 或配置文件？
- `Wildcard.match` 的 last-match-wins 如何影响权限规则优先级？
- 用户 reject 一个 permission request 后，为什么同一个 session 的其它 pending 请求也会被拒绝？
- V1 工具里的 `edit`、`write`、`apply_patch` 如何共用 `edit` 权限？

## 职责边界

V1 `Permission.Service` 只管理当前 opencode 进程和当前 instance 的 pending request 与临时批准，不负责持久化用户授权；状态对象只有 `pending: Map<PermissionV1.ID, PendingEntry>` 与 `approved: PermissionV1.Rule[]` 两块内存数据 [E: packages/opencode/src/permission/index.ts:35] [E: packages/opencode/src/permission/index.ts:36]。`PermissionV1.Request` 的 schema 记录 `sessionID`、`permission`、`patterns`、`metadata`、`always` 与可选 `tool`，但没有 project/persistence 字段 [E: packages/core/src/v1/permission.ts:30] [E: packages/core/src/v1/permission.ts:31] [E: packages/core/src/v1/permission.ts:32] [E: packages/core/src/v1/permission.ts:33] [E: packages/core/src/v1/permission.ts:34] [E: packages/core/src/v1/permission.ts:35] [E: packages/core/src/v1/permission.ts:38]。

V1 配置层把权限值约束为 `ask|allow|deny`，并允许 known permission keys 与任意自定义 key 混合；已知 key 包括 `read`、`edit`、`bash`、`task`、`external_directory`、`skill` 等，rest schema 也接受自定义 key [E: packages/core/src/v1/config/permission.ts:5] [E: packages/core/src/v1/config/permission.ts:17] [E: packages/core/src/v1/config/permission.ts:19] [E: packages/core/src/v1/config/permission.ts:20] [E: packages/core/src/v1/config/permission.ts:24] [E: packages/core/src/v1/config/permission.ts:25] [E: packages/core/src/v1/config/permission.ts:26] [E: packages/core/src/v1/config/permission.ts:33] [E: packages/core/src/v1/config/permission.ts:35]。配置加载对 V1 config decode 使用 `propertyOrder: "original"`，因此 permission object 的用户 key 顺序可以参与后续 precedence 语义 [E: packages/core/src/config.ts:142] [E: packages/core/src/config.ts:144]。

## 数据模型

| 实体 | 字段 | 作用 | 证据 |
|---|---|---|---|
| `PermissionV1.Rule` | `permission`, `pattern`, `action` | 单条规则匹配一个 permission key 与 resource pattern，并产生 `ask|allow|deny` | [E: packages/core/src/v1/permission.ts:19] [E: packages/core/src/v1/permission.ts:20] [E: packages/core/src/v1/permission.ts:21] |
| `PermissionV1.Request` | `id`, `sessionID`, `permission`, `patterns`, `metadata`, `always`, `tool?` | 发给 UI/客户端的 pending approval payload | [E: packages/core/src/v1/permission.ts:29] [E: packages/core/src/v1/permission.ts:30] [E: packages/core/src/v1/permission.ts:31] [E: packages/core/src/v1/permission.ts:32] [E: packages/core/src/v1/permission.ts:33] [E: packages/core/src/v1/permission.ts:34] [E: packages/core/src/v1/permission.ts:38] |
| `PermissionV1.Reply` | `once`, `always`, `reject` | 用户回复一次、永久本进程批准、拒绝 | [E: packages/core/src/v1/permission.ts:42] |
| `State.approved` | `PermissionV1.Rule[]` | `always` 回复生成的内存 allow ruleset | [E: packages/opencode/src/permission/index.ts:36] |

## 规则求值

`Permission.evaluate(permission, pattern, ...rulesets)` 会把所有 ruleset `flat()` 后用 `findLast` 查找最后一条同时匹配 `permission` 与 `pattern` 的规则，因此后出现的匹配规则覆盖先出现的匹配规则 [E: packages/opencode/src/permission/index.ts:42] [E: packages/opencode/src/permission/index.ts:43]。匹配使用 `Wildcard.match(permission, rule.permission)` 和 `Wildcard.match(pattern, rule.pattern)`，没有命中时返回默认 `{ action: "ask", permission, pattern: "*" }` [E: packages/opencode/src/permission/index.ts:43] [E: packages/opencode/src/permission/index.ts:44]。

`fromConfig` 会把字符串形式的 config 值转成 `{ permission: key, action: value, pattern: "*" }`，把对象形式转成每个 pattern 一条 rule；`~/` 和 `$HOME` 会在 `expand` 里替换成 `os.homedir()` [E: packages/opencode/src/permission/index.ts:199] [E: packages/opencode/src/permission/index.ts:201] [E: packages/opencode/src/permission/index.ts:204] [E: packages/opencode/src/permission/index.ts:205] [E: packages/opencode/src/permission/index.ts:190] [E: packages/opencode/src/permission/index.ts:192]。

## 控制流

1. 工具调用 `ctx.ask` 后进入 `Permission.Service.ask`，服务从 `InstanceState` 拿到当前 `approved` 与 `pending` [E: packages/opencode/src/permission/index.ts:79]。
2. `ask` 对 request 的每个 pattern 先调用 `evaluate(request.permission, pattern, ruleset, approved)`，也就是工具/agent 传入 ruleset 在前，内存 approved 在后；因为 `evaluate` 使用 `findLast`，内存 approved 可以覆盖传入 ruleset 中匹配的 ask/deny rule [E: packages/opencode/src/permission/index.ts:84] [E: packages/opencode/src/permission/index.ts:42] [E: packages/opencode/src/permission/index.ts:43]。
3. 任一 pattern 命中 `deny` 时，`ask` 立即抛 `PermissionV1.DeniedError`，错误里只返回同 permission 相关的 ruleset 片段 [E: packages/opencode/src/permission/index.ts:86] [E: packages/opencode/src/permission/index.ts:88]。
4. 所有 pattern 命中 `allow` 时，`needsAsk` 保持 false，`ask` 直接返回，不创建 pending request [E: packages/opencode/src/permission/index.ts:91] [E: packages/opencode/src/permission/index.ts:95]。
5. 至少一个 pattern 需要询问时，服务创建 `PermissionV1.ID`、构造 `PermissionV1.Request`、放入 `pending`，并 publish `permission.asked` 事件 [E: packages/opencode/src/permission/index.ts:97] [E: packages/opencode/src/permission/index.ts:98] [E: packages/opencode/src/permission/index.ts:100] [E: packages/opencode/src/permission/index.ts:101] [E: packages/opencode/src/permission/index.ts:102] [E: packages/opencode/src/permission/index.ts:103] [E: packages/opencode/src/permission/index.ts:104] [E: packages/opencode/src/permission/index.ts:105] [E: packages/opencode/src/permission/index.ts:109] [E: packages/opencode/src/permission/index.ts:110] [E: packages/opencode/src/permission/index.ts:111]。
6. 调用方等待 `Deferred.await(deferred)`；无论成功或失败，`Effect.ensuring` 都会从 `pending` 删除 request [E: packages/opencode/src/permission/index.ts:113] [E: packages/opencode/src/permission/index.ts:115]。
7. `reply("once")` 只 `Deferred.succeed` 当前 request，不追加 rule [E: packages/opencode/src/permission/index.ts:153] [E: packages/opencode/src/permission/index.ts:154]。
8. `reply("always")` 会把 `existing.info.always` 中每个 pattern push 为 `{ permission, pattern, action: "allow" }` 到 `approved` 数组 [E: packages/opencode/src/permission/index.ts:156] [E: packages/opencode/src/permission/index.ts:157] [E: packages/opencode/src/permission/index.ts:158] [E: packages/opencode/src/permission/index.ts:159] [E: packages/opencode/src/permission/index.ts:160]。
9. `reply("reject")` 会先 fail 当前 deferred；随后遍历同 `sessionID` 的 pending request，publish `reply: "reject"` 并 fail 它们，形成同 session 级联拒绝 [E: packages/opencode/src/permission/index.ts:132] [E: packages/opencode/src/permission/index.ts:140]。

## 设计动机与权衡

V1 选择内存 `approved` 让 `always` 在同一进程内减少重复询问，但不会跨进程或重启保留，因为 `approved` 只存在于 `InstanceState` 的 `State` 对象中，代码没有调用数据库或配置写入 [E: packages/opencode/src/permission/index.ts:57] [I]。这种设计适合 V1 活跑路径的交互式 approval loop，但不适合 V2 durable/event-sourced 目标；V2 对应节点 `execution.permissions-v2` 把 saved approvals 写入 SQLite。

V1 的 permission key 与工具 wire id 并不总是一一对应：`disabled(tools, ruleset)` 把 `edit`、`write`、`apply_patch` 三个工具归并成 `edit` 权限后检查全局 deny [E: packages/opencode/src/permission/index.ts:216] [E: packages/opencode/src/permission/index.ts:219] [E: packages/opencode/src/permission/index.ts:220]。shell 的 exposed tool id 是兼容 wire id `"bash"`，对应 `ShellID.ToolID` 常量 [E: packages/opencode/src/tool/shell/id.ts:16]。

## Gotcha

- `always` 是进程内批准，不是持久保存；要找持久化 approval，请看 V2 `PermissionSaved`。
- `findLast` 使规则顺序是语义的一部分；把 deny 放在 ruleset 后面会覆盖前面的 allow。
- reject 不是只拒当前工具调用；同 session pending request 会被级联拒绝。
- V1 `packages/opencode/src/session/message-v2.ts` 是 V1 和 AI SDK 消息转换层，不代表这里的权限服务属于 V2。

## Sources

- packages/opencode/src/permission/index.ts
- packages/core/src/v1/permission.ts
- packages/core/src/v1/config/permission.ts
- packages/opencode/src/tool/shell/id.ts

## 相关

- [V2 权限模型](permissions-v2.md)
- [权限 action catalog](../../reference/permission-actions.md)
