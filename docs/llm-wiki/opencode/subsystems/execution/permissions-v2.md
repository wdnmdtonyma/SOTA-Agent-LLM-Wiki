---
id: execution.permissions-v2
title: V2 权限模型(assert/action/resources/save)
kind: subsystem
tier: T2
v: v2
source:
  - packages/core/src/permission.ts
  - packages/core/src/permission/saved.ts
  - packages/core/src/permission/sql.ts
  - packages/core/src/permission/schema.ts
  - packages/core/src/tool/tool.ts
  - packages/core/src/tool/edit.ts
  - packages/core/src/tool/write.ts
  - packages/core/src/tool/apply-patch.ts
  - packages/core/src/agent.ts
symbols:
  - PermissionV2.Service
  - PermissionV2.assert
  - PermissionV2.ask
  - PermissionSaved.Service
  - PermissionTable
  - Tool.withPermission
related:
  - execution.permissions-v1
  - ref.permission-actions
evidence: explicit
status: verified
updated: 355a0bcf5
---

> V2 权限模型是 Location-scoped core service：工具自己构造 `PermissionV2.assert({ action, resources, save, source, agent })`，服务先查 agent ruleset，再叠加 SQLite saved approvals，并把用户 `always` 持久化为 project 级 allow rule。

## 能回答的问题

- V2 `assert`、`ask`、`reply` 各自返回或阻塞在哪里？
- agent 没有权限配置时为什么是 deny-all，而不是 ask-all？
- `save` 字段如何变成 SQLite `permission` 表记录？
- `Tool.withPermission("write", "edit")` 与实际 `permission.assert({ action: "edit" })` 有什么出入？
- V2 reject 是否也会级联拒绝同 session 的 pending 请求？

## 职责边界

`PermissionV2.Service` 的 service tag 是 `@opencode/v2/Permission`，并由 `locationLayer` 提供 Location-scoped layer [E: packages/core/src/permission.ts:127] [E: packages/core/src/permission.ts:329]。V2 权限 request 以 `action + resources` 表达，而不是 V1 的 `permission + patterns`；`AssertInput` 还可以携带 `save`、`metadata`、`source` 与可选 `agent` [E: packages/core/src/permission.ts:36] [E: packages/core/src/permission.ts:54]。

`PermissionSaved.Service` 是单独的 SQLite-backed registry，记录 project 级 `{ projectID, action, resource }` [E: packages/core/src/permission/saved.ts:17]。底层 Drizzle 表名是 `"permission"`，并用 `(project_id, action, resource)` 建 unique index 防重复 [E: packages/core/src/permission/sql.ts:7] [E: packages/core/src/permission/sql.ts:19]。

## 数据模型

| 实体 | 字段 | 作用 | 证据 |
|---|---|---|---|
| `PermissionSchema.Rule` | `action`, `resource`, `effect` | V2 ruleset 的最小单位 | [E: packages/core/src/permission/schema.ts:8] |
| `PermissionV2.Request` | `id`, `sessionID`, `action`, `resources`, `save?`, `metadata?`, `source?` | pending permission request 与 event payload | [E: packages/core/src/permission.ts:45] |
| `PermissionV2.Source` | `{ type: "tool", messageID, callID }` | 把 permission request 绑定到 durable assistant/tool call identity | [E: packages/core/src/permission.ts:27] |
| `PermissionSaved.Info` | `id`, `projectID`, `action`, `resource` | 用户回复 `always` 后可跨进程读取的 saved approval | [E: packages/core/src/permission/saved.ts:17] |

## 求值顺序

V2 `evaluate(action, resource, ...rulesets)` 仍使用 wildcard last-match-wins：所有 ruleset `flat()` 后用 `findLast` 查最后一条 action 与 resource 同时匹配的 rule；未命中时默认 `effect: "ask"` [E: packages/core/src/permission.ts:106] [E: packages/core/src/permission.ts:109]。与 V1 的关键差异是 `evaluateInput` 先只用 configured agent rules 检查 deny；一旦 configured rules 对任一 resource deny，函数直接返回 deny，不会让 saved approvals 覆盖 agent deny [E: packages/core/src/permission.ts:182] [E: packages/core/src/permission.ts:183]。只有没有 configured deny 时，服务才把 configured rules 与 `savedRules()` 合并，并计算最终 `allow|ask|deny` [E: packages/core/src/permission.ts:184] [E: packages/core/src/permission.ts:185] [E: packages/core/src/permission.ts:186]。

缺省 agent 权限不是 ask-all。`missingAgentPermissions` 是一条 `{ action: "*", resource: "*", effect: "deny" }`，当 `agents.resolve(...)` 找不到 agent 时，`configured` 返回这个 deny-all ruleset [E: packages/core/src/permission.ts:19] [E: packages/core/src/permission.ts:170]。`AgentV2.Info.empty` 自身默认 `permissions: []`，但权限服务针对 missing agent 另行 deny-all [E: packages/core/src/agent.ts:41]。

## 控制流

1. 工具调用 `permission.assert(input)` 或 `permission.ask(input)`，input 可带 `agent`；服务通过 `SessionStore.get(sessionID)` 查 session，并用 `agents.resolve(agentID ?? session.agent)` 解析有效 agent [E: packages/core/src/permission.ts:167] [E: packages/core/src/permission.ts:169]。
2. `savedRules()` 按当前 Location 的 `location.project.id` 读取 saved approvals，并映射成 allow rules [E: packages/core/src/permission.ts:158] [E: packages/core/src/permission.ts:159]。
3. `ask` 只做 non-blocking request 创建：如果求值结果是 `ask`，`create` pending request 并 publish `permission.v2.asked`，随后返回 `{ id, effect }` [E: packages/core/src/permission.ts:217] [E: packages/core/src/permission.ts:218] [E: packages/core/src/permission.ts:219] [E: packages/core/src/permission.ts:220]。
4. `assert` 是 blocking gate：`deny` 抛 `PermissionV2.DeniedError`，`allow` 直接返回，`ask` 创建 pending request 并等待 deferred [E: packages/core/src/permission.ts:227] [E: packages/core/src/permission.ts:232] [E: packages/core/src/permission.ts:233] [E: packages/core/src/permission.ts:234]。
5. `create` 在 `uninterruptible` 区域创建 deferred、检查重复 request id、写入 `pending`，并在 publish event 出错时删除 pending [E: packages/core/src/permission.ts:205] [E: packages/core/src/permission.ts:207] [E: packages/core/src/permission.ts:208] [E: packages/core/src/permission.ts:210] [E: packages/core/src/permission.ts:211]。
6. `reply("reject")` fail 当前 deferred，然后遍历同 session pending request，逐个 publish `reply: "reject"`、fail deferred、从 pending 删除，实现级联拒绝 [E: packages/core/src/permission.ts:256] [E: packages/core/src/permission.ts:262]。
7. `reply("always")` 且 request 带 `save` 时，服务调用 `PermissionSaved.add({ projectID, action, resources: save })` [E: packages/core/src/permission.ts:275] [E: packages/core/src/permission.ts:276] [E: packages/core/src/permission.ts:277] [E: packages/core/src/permission.ts:278] [E: packages/core/src/permission.ts:279]。
8. `PermissionSaved.add` 对每个 resource 插入一行 `(id, project_id, action, resource)`，并 `onConflictDoNothing()` 去重 [E: packages/core/src/permission/saved.ts:67] [E: packages/core/src/permission/saved.ts:70] [E: packages/core/src/permission/saved.ts:71] [E: packages/core/src/permission/saved.ts:74]。
9. saved approvals 写入后，服务重算其它 pending request；如果 agent configured rules 不 deny 且 remembered rules 让所有 resources allow，就自动 publish `reply: "always"` 并 unblock [E: packages/core/src/permission.ts:286] [E: packages/core/src/permission.ts:289] [E: packages/core/src/permission.ts:293] [E: packages/core/src/permission.ts:296] [E: packages/core/src/permission.ts:301] [E: packages/core/src/permission.ts:306]。

## `withPermission` 与实际 assert action

V2 `Tool.withPermission(tool, permission)` 只给 tool runtime 附加一个 permission tag，`Tool.permission(tool, name)` 会优先返回该 tag，否则返回注册名 [E: packages/core/src/tool/tool.ts:121] [E: packages/core/src/tool/tool.ts:130]。但是当前 built-in mutation tools 仍在 `execute` 内显式调用 `PermissionV2.assert`，所以要以 assert payload 为准判断实际 action。

`edit` 工具用 `Tool.withPermission(..., "edit")` 注册，同时 `execute` 里也 assert `action: "edit"` [E: packages/core/src/tool/edit.ts:194] [E: packages/core/src/tool/edit.ts:151] [E: packages/core/src/tool/edit.ts:152]。`write` 工具的 wire name 是 `"write"`，但它用 `Tool.withPermission(..., "edit")`，实际 assert 也发送 `action: "edit"` [E: packages/core/src/tool/write.ts:17] [E: packages/core/src/tool/write.ts:88] [E: packages/core/src/tool/write.ts:77] [E: packages/core/src/tool/write.ts:78]。`apply_patch` 的 wire name 是 `"apply_patch"`，同样 `withPermission(..., "edit")` 并在 batch approval 中 assert `action: "edit"` [E: packages/core/src/tool/apply-patch.ts:13] [E: packages/core/src/tool/apply-patch.ts:172] [E: packages/core/src/tool/apply-patch.ts:103] [E: packages/core/src/tool/apply-patch.ts:104]。因此，V2 里 edit/write/apply_patch 的 model-facing name 不同，但 mutation approval action 当前统一是 `edit`。

## 设计动机与权衡

V2 tools spec 要求 trusted tools 自己构造 permission request，registry 不注入 `assertPermission` helper；spec 示例也把 `permission.assert` 放在 tool executor 内部 [E: specs/v2/tools.md:111] [E: specs/v2/tools.md:131]。这样做让每个工具能把 action、resources、save、metadata 与 durable source 绑定到具体业务语义，而不是让 registry 猜测资源边界 [I]。

V2 session spec 还要求 local tool authorization 保留发起 tool call 时的 effective agent，即使之后 agent switch，也不能改变该 call 的 policy [E: CONTEXT.md:92]。`AssertInput.agent` 与 pending item 存储 `agent?: AgentV2.ID` 支持这一点：pending item 在自动 remembered approval 时仍用原 agent 重新 configured [E: packages/core/src/permission.ts:129] [E: packages/core/src/permission.ts:289]。

## Gotcha

- `ask` 与 `assert` 都会求值，但 `ask` 不等待用户回复；`assert` 会阻塞到 deferred 被 reply。
- saved approval 只追加 allow rules，不能覆盖 configured agent deny，因为 configured deny 在合并 saved rules 之前就短路。
- `write` 与 `apply_patch` 的 `withPermission` tag 是 `"edit"`，实际 `assert.action` 也是 `"edit"`；不要把 wire name `"write"` 或 `"apply_patch"` 当作 mutation policy action。
- V2 Integration/Credential 是本地凭据注册表，不是云连接器；V2 permission persistence 在 `permission/saved.ts` 与 `permission/sql.ts`。

## Sources

- packages/core/src/permission.ts
- packages/core/src/permission/saved.ts
- packages/core/src/permission/sql.ts
- packages/core/src/permission/schema.ts
- packages/core/src/tool/tool.ts
- packages/core/src/tool/edit.ts
- packages/core/src/tool/write.ts
- packages/core/src/tool/apply-patch.ts
- packages/core/src/agent.ts
- specs/v2/tools.md
- CONTEXT.md

## 相关

- [V1 权限模型](permissions-v1.md)
- [权限 action catalog](../../reference/permission-actions.md)
