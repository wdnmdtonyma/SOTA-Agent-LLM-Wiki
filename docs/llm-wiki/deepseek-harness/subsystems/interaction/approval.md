---
id: subsys.interaction.approval
title: user-approval
kind: subsystem
tier: T2
pkg: interaction
source:
  - packages/interaction/user-approval/src/index.ts
  - packages/interaction/user-approval/src/types.ts
  - packages/interaction/user-approval/src/invariant.ts
  - packages/interaction/user-approval/tests/approval.spec.ts
  - packages/interaction/user-approval/tests/invariant.spec.ts
  - packages/core/tools/src/index.ts
  - packages/core/tools/tests/tools.spec.ts
  - packages/sandbox/sandbox/src/escalation.ts
  - packages/fs/tool-fs/src/sandbox.ts
  - packages/shell/tool-bash/src/index.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/web-app/cordis.patch.yml
  - packages/interaction/permission-presets/src/index.ts
  - packages/core/session/src/surface.ts
  - packages/core/system-prompt/src/index.ts
  - packages/core/agent-loop/src/runtime-context.ts
  - packages/subagent/subagent/src/child-agent.ts
  - packages/host/apiproxy/src/api-proxy.ts
  - packages/host/apiproxy/src/api/approvals.ts
  - packages/acp/acp/src/index.ts
  - vendor/cordis/src/events.ts
  - vendor/cordis/src/service.ts
symbols:
  - ctx.approval
  - ApprovalService
  - ApprovalPolicy
  - ApprovalOutcome
  - approval/request
related:
  - spine.tool-call-anatomy
  - spine.trace-tool-approval
  - subsys.core.tools
  - subsys.interaction.permission-presets
  - spine.overview
  - spine.capability-seams
  - subsys.execution.sandbox
  - subsys.composition.bundle-base
  - subsys.core.system-prompt
  - subsys.core.session
  - subsys.orchestration.subagent
  - subsys.integration.acp
  - surface.misc.security
evidence: explicit
status: verified
updated: 47f943859b
---

> `ctx.approval`（`ApprovalService`）是 **host 面**一次性审批缝：会话政策只有 `ask | never`，`approval/request` waterfall 把只读问题交给组合答者；唯一 grant 是 `'allowed-once'`。没有答者时叶子返回 `'unavailable'`（fail-closed）。`'never'` 在进 waterfall **之前**就 `'rejected'`。这是 Cordis 组合运行时上的 Definition，不是一份常驻白名单。

## 能回答的问题

- `ctx.approval` 是 host 面还是 agent-preset 面？preset 会不会再挂一份？
- 政策词表为什么只有 `ask | never`？`'never'` 在哪一步短路，`prepend: true` 的答者看不看得见？
- `approval/request` 叶子是什么？抛错 / 非法返回 / 无答者分别落到哪个 outcome？
- 工具层 `serviceAsk` 与 body 里 `approveEscalation` 怎样共用这一缝？grant 有没有 `allow-always`？
- `approval/asked` + `approval/decided` 会不会进 `deriveMessages()`？模型从哪读到当前政策？
- 无应答者、缺 `ctx.approval`、缺 `exec.agent` 三条 fail-closed 路径分别返回什么？

## 职责边界

本包 `@deepseek-ai/dsh-user-approval` 拥有：`ctx.approval` 键、`ApprovalService.request` / `setPolicy` / `overrideOf`、闭合词表 `ApprovalPolicy` / `ApprovalOutcome`、waterfall `approval/request`、log-only 事件 `approval/asked` + `approval/decided` + `approval/policy`、纯 fold `effectiveApprovalPolicy`、运行时写路径 `setApprovalPolicy`、以及名为 `approval:policy` 的 runtime-context 贡献。

本包**不**拥有：

- 产品级 Permissions 选择器、三档 preset 表、`permission/preset` —— [`subsys.interaction.permission-presets`](permission-presets.md)（`subsys.interaction.permission-presets`）。该页只是 `setApprovalPolicy` / `ApprovalService.setPolicy` 的 shipped 写手。
- `SandboxMode` fold、`writableRoots`、`approveEscalation` 的严格加宽表 —— [`subsys.execution.sandbox`](../execution/sandbox.md)（`subsys.execution.sandbox`）/ [`subsys.execution.sandbox-policy`](../execution/sandbox-policy.md)（`subsys.execution.sandbox-policy`）。本页只写升权也走 `approval.request` 这一条缝。
- `tools/pre-execute` 决策词表与 `serviceAsk` 映射 —— [`subsys.core.tools`](../core/tools.md)（`subsys.core.tools`）。
- mux 帧 `approval/requested`、浏览器 `ApprovalPanel` —— host / client 页。本页只把 `apiproxy` 标成 shipped web 答者。
- 人命令注册表 —— `ctx.commands` 是另一条 host 缝。

DSH 是 Cordis 组合运行时（`profile → bundle → agent preset`）。`ctx.approval` 是 **host 面**（进程级，session 出现之前就要能 `inject`）。默认产品路径是本地 Web GUI（`dsh web`）；本仓没有 shipped TUI。`dsh-web-app` 关掉模型可见 `tool-bash` / `tool-fs` 行，**不** disable `id: approval`。[E: packages/bundle/web-app/cordis.patch.yml:294] [E: packages/bundle/web-app/cordis.patch.yml:313] shipped preset（`minimal` / `standard` / `code` / `cordis`）没有 `id: approval` 行，不重挂这份服务。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/interaction/user-approval/src/index.ts` | Definition + 唯一 shipped Provider：`ApprovalService`、`decide`、事件声明、runtime-context |
| `packages/interaction/user-approval/src/types.ts` | 浏览器可进的 `ApprovalRequestId` / `ApprovalOutcome`（无 cordis import） |
| `packages/interaction/user-approval/src/invariant.ts` | 配对 / 闭合词表 companion；`inject = ['invariants']`。默认 `dsh-base` **没有** `id: invariants`，产品树不跑它 |
| `packages/interaction/user-approval/tests/approval.spec.ts` | 钉死 fail-closed、`'never'` 不咨询答者、`prepend` 也绕不过、审计对、abort 丢晚到答案 |
| `packages/interaction/user-approval/tests/invariant.spec.ts` | 审计事件必须包在开 turn 里；未知 outcome / policy 拒 |
| `packages/core/tools/src/index.ts` | 通用层 Consumer：`gate.kind === 'ask'` → `serviceAsk` |
| `packages/core/tools/tests/tools.spec.ts` | 没装缝时 `ask` 退化成 deny；`'allowed-once'` 才跑 body |
| `packages/sandbox/sandbox/src/escalation.ts` | 产品层升权：`approveEscalation` 只把 `'allowed-once'` 收成 granted mode |
| `packages/fs/tool-fs/src/sandbox.ts` / `packages/shell/tool-bash/src/index.ts` | body 里把 `ctx.get('approval')` 交给 `approveEscalation` |
| `packages/bundle/base/cordis.patch.yml` | host 真树：`id: approval`，`policy` 看 `DSH_PERMISSION_MODE` |
| `packages/interaction/permission-presets/src/index.ts` | shipped 写手：pin / `/permission` / `set()` |
| `packages/host/apiproxy/src/api-proxy.ts` | shipped `dsh web` 答者：听 `approval/request` |
| `packages/acp/acp/src/index.ts` | overlay 答者：只 claim 自己拥有的 agent，否则 `next()` |
| `packages/subagent/subagent/src/child-agent.ts` | 委派孩子钉 `approval/policy: never`（`source: 'delegation'`） |

## 数据模型

| 符号 | 落点 | 含义 |
|---|---|---|
| `ApprovalPolicy` | `index.ts` | `'ask' \| 'never'`。没有 `always` / `auto`。[E: packages/interaction/user-approval/src/index.ts:94] |
| `APPROVAL_POLICIES` | `index.ts` | `['ask', 'never']`，给 schema 与 `setApprovalPolicy` 校验。[E: packages/interaction/user-approval/src/index.ts:97] |
| `Config.policy` | `ApprovalService.Config` | 部署默认。schema 默认 `'ask'`。[E: packages/interaction/user-approval/src/index.ts:194] |
| `ApprovalOutcome` | `types.ts` | `'allowed-once' \| 'rejected' \| 'cancelled' \| 'unavailable'`。唯一 grant 是 `'allowed-once'`。[E: packages/interaction/user-approval/src/types.ts:29] |
| `ApprovalRequest` | `index.ts` | 只读同进程问题：`agent` / `toolName` / 可选 `callId` / `reason` / `signal`。参数不在这里复制。 |
| `approval/request` | Cordis Events | waterfall。listener 返回 outcome 即 claim，或 `next()` 下放。 |
| `approval/asked` | `SessionEventMap` | `{ id, toolName, callId?, reason? }`。log-only，无 `surfaceOp`。 |
| `approval/decided` | `SessionEventMap` | `{ id, outcome }`。每个 asked 恰好一条。 |
| `approval/policy` | `SessionEventMap` | `{ policy, source?: 'delegation' }`。log-only；**最后一条**赢。 |
| `approval:policy` | `systemPrompt.context` | runtime-context 段名，`order: 115`。不是 system section。[E: packages/interaction/user-approval/src/index.ts:206] [E: packages/interaction/user-approval/src/index.ts:207] |
| `NEVER_SENTENCE` / `ASK_SENTENCE` | `index.ts` | 模型可见整句。`never` 明确叫模型不要设 `sandbox_permissions`。[E: packages/interaction/user-approval/src/index.ts:100] [E: packages/interaction/user-approval/src/index.ts:102] |

两套默认必须分开写：

1. **类型 / 裸 plugin**：`policy` schema 默认 `'ask'`。直接 `new ApprovalService(ctx, {})` 也按 `'ask'` 进 waterfall。[E: packages/interaction/user-approval/src/index.ts:194] [E: packages/interaction/user-approval/tests/approval.spec.ts:392]
2. **shipped `dsh-base`**：`id: approval` 把 `policy` 写成 `(DSH_PERMISSION_MODE ?? 'workspace-write') === 'danger-full-access' ? 'never' : 'ask'`。[E: packages/bundle/base/cordis.patch.yml:188] [E: packages/bundle/base/cordis.patch.yml:191]

`SURFACE_EVENT_TYPES` 只有 `user/message` / `assistant/message` / `tool/result`。三类 `approval/*` 都不在里面，所以不进 `deriveMessages()`。[E: packages/core/session/src/surface.ts:16] [E: packages/core/session/src/surface.ts:17] [E: packages/core/session/src/surface.ts:18]

## 控制流

1. **host 面挂唯一 Provider。** `dsh-base` 插入 `id: approval` = `@deepseek-ai/dsh-user-approval`，紧挨 `sandbox-policy` 与 `id: permission`。[E: packages/bundle/base/cordis.patch.yml:188] [E: packages/bundle/base/cordis.patch.yml:189] [E: packages/bundle/base/cordis.patch.yml:193] 本包没有第二份 `*-local` 实现：`ApprovalService` 自己就是可加载插件。`dsh-web-app` / `dsh-headless` 不另写、不 disable 这一行。

2. **`ApprovalService`@packages/interaction/user-approval/src/index.ts 占 `ctx.approval`。** 构造 `super(ctx, 'approval')`；Cordis `Service` 随即 `ctx.reflect.provide(name, self, …)`。[E: packages/interaction/user-approval/src/index.ts:198] [E: vendor/cordis/src/service.ts:57] 服务本身没有 `static inject`；runtime-context 用 `ctx.inject(['systemPrompt'], …)` 机会主义挂上。[E: packages/interaction/user-approval/src/index.ts:204]

3. **模型看见的是 runtime-context，不是 system section。** `systemPrompt.context({ name: 'approval:policy', order: 115 })`：有 `context.agent` 时，`never` 吐 `NEVER_SENTENCE`，否则吐 `ASK_SENTENCE`；裸 `assemble()` 返回 `''`。[E: packages/interaction/user-approval/src/index.ts:205] [E: packages/interaction/user-approval/src/index.ts:211] [E: packages/interaction/user-approval/src/index.ts:213] `joinContextSections` 把各段拼进以 `Current runtime context. This snapshot supersedes…` 开头的 user 角色快照；`RuntimeContextProjection.project` 文本没变就不再投。[E: packages/core/system-prompt/src/index.ts:239] [E: packages/core/agent-loop/src/runtime-context.ts:68] 卸掉服务后该段消失。[E: packages/interaction/user-approval/tests/approval.spec.ts:512]

4. **会话钉政策走邻缝写手。** `PermissionPresetService` `inject = ['shell', 'approval', 'sessions']`，在 `session/created`（以及 mount 时已存活会话）上 `pinInitialPermission`：新鲜会话按 preset 表写 `permission/preset` + sandbox + `setApprovalPolicy`；缺审批事实时回退 `ctx.approval.config.policy ?? 'ask'`。[E: packages/interaction/permission-presets/src/index.ts:180] [E: packages/interaction/permission-presets/src/index.ts:220] [E: packages/interaction/permission-presets/src/index.ts:411] [E: packages/interaction/permission-presets/src/index.ts:428] `/permission` 对人命令走 `ApprovalService.setPolicy`（会 `inject` 切换通知）；`set(session)` 只调 `setApprovalPolicy`。[E: packages/interaction/permission-presets/src/index.ts:273] [E: packages/interaction/permission-presets/src/index.ts:376] 三档表的权威在 permission 页，本页只消费旋钮。

5. **两层提问，同一条 `request`。** 通用层：`tools/pre-execute` waterfall 默认 `next()` 得到 `{ kind: 'allow' }`；`gate.kind === 'ask'` 才进 `serviceAsk`。[E: packages/core/tools/src/index.ts:1475] [E: packages/core/tools/src/index.ts:1479] 产品层：`write` / `edit` / `bash` 在 **execute body** 里调 `approveEscalation`（不在 pre-execute），`approver` 是 `ctx.get('approval')`。[E: packages/fs/tool-fs/src/sandbox.ts:97] [E: packages/fs/tool-fs/src/sandbox.ts:100] [E: packages/shell/tool-bash/src/index.ts:223] [E: packages/sandbox/sandbox/src/escalation.ts:173] 升权的严格加宽、字段配对、mode stamp 在 sandbox 页。

6. **`request` 先要求开 turn，再写审计对。** 没有未闭合的 `turn/start`（空 log、或最后一条是 `turn/end`）立刻 throw，**不** append。[E: packages/interaction/user-approval/src/index.ts:259] [E: packages/interaction/user-approval/tests/approval.spec.ts:47] 通过后发新 `ApprovalRequestId`，append `approval/asked`，`decide` 完再 append `approval/decided`。[E: packages/interaction/user-approval/src/index.ts:267] [E: packages/interaction/user-approval/src/index.ts:274] append 自己在 commit 前失败会把错误抛给调用方；`session/event` observer 在 commit 后抛只打 log，对仍会写完。[E: packages/interaction/user-approval/tests/approval.spec.ts:172] [E: packages/interaction/user-approval/tests/approval.spec.ts:129]

7. **`decide`：abort / `never` 都在 waterfall 之前。** 信号已经 abort → `'cancelled'`，答者一个都不跑。[E: packages/interaction/user-approval/src/index.ts:306] [E: packages/interaction/user-approval/tests/approval.spec.ts:278] `effectivePolicy === 'never'` → `'rejected'`，连 `prepend: true` 的 listener 也看不到请求（测试 `consulted` 为零）。[E: packages/interaction/user-approval/src/index.ts:312] [E: packages/interaction/user-approval/tests/approval.spec.ts:410] [E: packages/interaction/user-approval/tests/approval.spec.ts:433] 政策放在服务路径里，而不是再挂一层 gate listener：Cordis `prepend` 会 unshift 到现有 listener **前面**，listener 形 gate 守不住「`never` 与注册顺序无关」。

8. **`ask` 才进 `approval/request`。** `scopeTarget(this, req.agent)` 做 scope 过滤：global + 匹配该 agent 的 scoped listener 能听到，隔壁 agent 的听不到。[E: packages/interaction/user-approval/src/index.ts:319] [E: packages/interaction/user-approval/tests/approval.spec.ts:224] 叶子是 `() => Promise.resolve('unavailable')`。[E: packages/interaction/user-approval/src/index.ts:320] Cordis `Events.waterfall` 必须调用传入的 `next()` 才会 `shift` 到下一层；第一个直接返回 outcome 的 listener 占住决策槽，后面的不跑。[E: vendor/cordis/src/events.ts:238] [E: packages/interaction/user-approval/tests/approval.spec.ts:186] 只 `next()`、没人 claim → 叶子 `'unavailable'`。[E: packages/interaction/user-approval/tests/approval.spec.ts:194]

9. **非法返回与抛错归一成 `'unavailable'`。** `OUTCOMES.includes` 失败（例如 `'yolo'`）不当成 grant；同步 throw 与 Promise reject 都进同一条 containment（`Promise.resolve().then(() => waterfall…)`，避免 sync throw 逃出）。[E: packages/interaction/user-approval/src/index.ts:325] [E: packages/interaction/user-approval/src/index.ts:328] [E: packages/interaction/user-approval/tests/approval.spec.ts:264] [E: packages/interaction/user-approval/tests/approval.spec.ts:400] 带 `signal` 时 abort 与答案赛跑：abort 先到则 `'cancelled'`，晚到的 resolve / reject 被丢掉，不会写出第二条 `approval/decided`。[E: packages/interaction/user-approval/tests/approval.spec.ts:293] [E: packages/interaction/user-approval/tests/approval.spec.ts:298]

10. **通用层 `serviceAsk` 只放行 `'allowed-once'`。** `ctx.get('approval')` 为 `undefined` 时 deny：有 `ask.reason` 用 reason，否则 `tool "…" requires approval (not yet supported)`。[E: packages/core/tools/src/index.ts:1693] [E: packages/core/tools/src/index.ts:1696] [E: packages/core/tools/tests/tools.spec.ts:706] [E: packages/core/tools/tests/tools.spec.ts:717] 没有 `exec.agent` 同样 deny（没有 session 可审计、没有 UI 可路由）。[E: packages/core/tools/src/index.ts:1700] 否则 `approval.request({ agent, toolName: exec.name, callId, reason?, signal })`。[E: packages/core/tools/src/index.ts:1706] `'allowed-once'` → `{ kind: 'allow' }`；`'rejected'` / `'cancelled'` / `'unavailable'` 各一句 deny 文案；`cancelled` 另外把 `approvalCancelled: true`，好让调用方 abort 抢先时走 `ABORTED_BEFORE_DISPATCH`。[E: packages/core/tools/src/index.ts:1714] [E: packages/core/tools/src/index.ts:1720] 测试：答者 grant 后 echo body 才跑。[E: packages/core/tools/tests/tools.spec.ts:755]

11. **升权层同样只认 `'allowed-once'`。** `approveEscalation` 先查严格加宽、再查缺 approver / 缺 agent，通过后才 `approver.request`；`switch` 里只有 `'allowed-once'` 返回目标 mode，其余三档各抛固定英文。[E: packages/sandbox/sandbox/src/escalation.ts:183] [E: packages/sandbox/sandbox/src/escalation.ts:184] 缺缝在这里是 **throw**（`no approval service is composed`），不是 tools 那句 `(not yet supported)` deny。grant 只盖这一次 call 的 policy，不改下一轮 standing mode。

12. **live 切换走 `setPolicy`。** 与当前 `effectivePolicy` 相同则 no-op；否则 `setApprovalPolicy` 再 `agent.inject` 一条 `source: { kind: 'plugin', plugin: 'user-approval' }` 的 user 通知（`The approval policy changed from "ask" to "never" (changed by the user).`）。[E: packages/interaction/user-approval/src/index.ts:228] [E: packages/interaction/user-approval/src/index.ts:230] [E: packages/interaction/user-approval/tests/approval.spec.ts:466] `effectiveApprovalPolicy` 从后往前找最后一条 `approval/policy`，没有则 `undefined`（调用方再叠 Config 默认）。[E: packages/interaction/user-approval/src/index.ts:115] [E: packages/interaction/user-approval/src/index.ts:286] 非法 policy 在 append 之前抛，log 不变。[E: packages/interaction/user-approval/tests/approval.spec.ts:381]

13. **进程内子代理钉 `'never'`。** `captureDelegatedPolicyOverrides`：父进程装了 `approval` 就把孩子钉成 `'never'`（与父自己的政策无关）；没装缝则不写。[E: packages/subagent/subagent/src/child-agent.ts:202] `appendDelegatedPolicyOverrides` 在孩子 unpublished 窗口直接 `session.append('approval/policy', { policy, source: 'delegation' })`，**不**经 `setApprovalPolicy`。[E: packages/subagent/subagent/src/child-agent.ts:223] [U] fold 不读 `source`。细节在 [`subsys.orchestration.subagent`](../orchestration/subagent.md)。

14. **shipped web 答者是 `apiproxy`，不是 TUI。** `ctx.get('approval')` 存在时监听 `approval/request`：已 abort 同步 `'cancelled'`；否则配对尚未 decided 的 `approval/asked`，推 mux `approval/requested`。[E: packages/host/apiproxy/src/api-proxy.ts:1414] [E: packages/host/apiproxy/src/api-proxy.ts:1422] [E: packages/host/apiproxy/src/api-proxy.ts:1427] client 可写 outcome 只有 `'allowed-once' | 'rejected'`；`'cancelled'` / `'unavailable'` 是 host 侧词。[E: packages/host/apiproxy/src/api/approvals.ts:20] ACP 桥是 **overlay**（不在 `dsh-base` / `dsh-web-app` / `dsh-headless`）：只 claim 自己拥有且带 `callId` 的请求，否则 `return next()`。[E: packages/acp/acp/src/index.ts:217] 卸掉答者插件后链回到叶子 `'unavailable'`。[E: packages/interaction/user-approval/tests/approval.spec.ts:348]

端到端「带 `sandbox_permissions` 的 `write`」走读见 [`spine.trace-tool-approval`](../../spine/trace-tool-approval.md)。本页不重写那条脊柱。

## 设计动机

DSH 把审批做成可替换答者的 host 缝，而不是写死在 `tool-bash` / `tool-fs` 里。同一条 `request` 同时服务 hooks/`tools/pre-execute` 的 `ask` 和产品升权，词表才不会在两家漂移。

`'never'` 必须活在服务路径里。答者是组合上去的 listener，`prepend: true` 可以坐到任何 gate listener 前面；只有 `decide()` 自己短路，才能对 CI / 无人值守 / 子代理给出与注册顺序无关的确定性拒绝。

fail-closed 选 `'unavailable'` 而不是偷偷 `'allowed-once'`，是为了让模型（和人）分清「没有人看门」和「人按了拒绝」。`serviceAsk` 三档非 grant 各有文案；升权再把同一闭合词映射成 throw。

grant 只有一次性：没有 `allow-always`。一次批准不能把整段会话焊成满权；standing 政策仍由 `approval/policy` / sandbox mode 旋钮管。

审计对必须包在开 turn 里。turn 是耐久 log 的 commit/replay 边界；夹在 turn 之间的裸事件在 reload 时看起来像 crash tail，会被丢掉。所以 `request` 在 idle / 两 turn 之间直接 throw。

政策切换写 log-only 事件，模型从 runtime-context 快照读完整当前值。这样换政策不必改 stable system-prompt 前缀。

## Gotcha

- **`'never'` ≠ 无答者。** `'never'` 是政策短路，outcome 是 `'rejected'`，答者计数为零。无答者（或只 `next()`）是 `'unavailable'`。两者文案不同，不要混成一句「自动拒绝」。[E: packages/interaction/user-approval/tests/approval.spec.ts:409] [E: packages/interaction/user-approval/tests/approval.spec.ts:65]
- **`'never'` 仍写 `asked` + `decided`。** 短路发生在 `decide` 里，append 已经发生。不要以为不弹人就不审计。[E: packages/interaction/user-approval/tests/approval.spec.ts:412]
- **grant 只有 `'allowed-once'`。** 词表里没有 `allow-always` / `allowed`。client 也只能回 `'allowed-once' | 'rejected'`。[E: packages/interaction/user-approval/src/types.ts:29] [E: packages/host/apiproxy/src/api/approvals.ts:20]
- **缺缝在两层问法上不一致。** `serviceAsk` 没装 `ctx.approval` → deny（历史文案 `(not yet supported)`）。`approveEscalation` 没装 → throw。不要用同一句错误文本概括。[E: packages/core/tools/src/index.ts:1696] [E: packages/sandbox/sandbox/src/escalation.ts:166]
- **waterfall 漏 `next()` = 自己当最终答者。** 非拥有者必须 `return next()`，否则下游（含叶子 `'unavailable'`、以及真正的 UI 答者）永远轮不到。[E: vendor/cordis/src/events.ts:238]
- **开 turn 是硬前置。** idle 或两 turn 之间 `request` throw，审计一对都没有。companion 同样拒绝 turn 外的 `approval/asked` / `approval/decided`。[E: packages/interaction/user-approval/tests/approval.spec.ts:47] [E: packages/interaction/user-approval/tests/invariant.spec.ts:69]
- **`setApprovalPolicy` 不是唯一可执行写路径。** 函数注释写 sole durable representation；委派孩子直接 `append` 带 `source: 'delegation'` 的同名事件。[U] live `/permission` 走 `setPolicy`（额外 `inject` 通知）；pin / `set(session)` 走 `setApprovalPolicy`（无通知）。
- **preset 不要重挂 `approval`。** 服务留在 host。子代理要「别弹无人看的窗」，靠孩子 log 上的 `'never'`，不是再 publish 一份 `ctx.approval`。
- **`./invariant` companion 默认不在产品树。** 它能钉配对与闭合词表，但 `inject = ['invariants']`，而 `dsh-base` 没有 `id: invariants`。不要写成「`dsh web` 启动就会拒未知 outcome」。
- **HMR 卸答者 = 下一次 ask fail-closed。** 测试：dispose 掉 grant 插件后，同一服务回到 `'unavailable'`。[E: packages/interaction/user-approval/tests/approval.spec.ts:348]

## Seam 三角

| 角色 | 包 | ctx 键 / 合同 | bundle / preset 行 |
|---|---|---|---|
| Definition | `@deepseek-ai/dsh-user-approval`（`index.ts` + `/types`） | `ApprovalService` / `ApprovalPolicy` / `ApprovalOutcome` / `approval/request` | 类型子路径可进浏览器；无 preset 行 |
| Provider | `ApprovalService` 自身 | `ctx.approval` | **host** `dsh-base` 的 `id: approval`。没有 `*-local` 第二份实现 |
| 答者 Consumer | `dsh-apiproxy`（shipped web）；`dsh-acp`（overlay） | 听 `approval/request`，必须 `next()` 才能下放 | apiproxy 在 web-app host；ACP **不在** shipped bundle |
| 提问 Consumer | `dsh-tools.serviceAsk`；`approveEscalation`（`dsh-sandbox`）经 `tool-fs` / `tool-bash` body | `ctx.get('approval')` 机会主义 | tools / sandbox 是 host 行；模型可见 tool 在 web 上由 preset 再挂 |
| 旋钮写手 | `dsh-permission-presets`；委派 `appendDelegatedPolicyOverrides` | `setApprovalPolicy` / `setPolicy` / 直接 append | **host** `id: permission`；preset **不**重挂 approval |

换答者 = 换 `approval/request` listener（web mux、ACP、测试 stub），不必改 `ApprovalService`。换提问点 = 在 pre-execute 返回 `ask`，或在 body 调 `approveEscalation`。卸掉 Provider 后，`serviceAsk` 退化 deny，升权 throw。

## Sources

- packages/interaction/user-approval/src/index.ts
- packages/interaction/user-approval/src/types.ts
- packages/interaction/user-approval/src/invariant.ts
- packages/interaction/user-approval/tests/approval.spec.ts
- packages/interaction/user-approval/tests/invariant.spec.ts
- packages/core/tools/src/index.ts
- packages/core/tools/tests/tools.spec.ts
- packages/sandbox/sandbox/src/escalation.ts
- packages/fs/tool-fs/src/sandbox.ts
- packages/shell/tool-bash/src/index.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/web-app/cordis.patch.yml
- packages/interaction/permission-presets/src/index.ts
- packages/core/session/src/surface.ts
- packages/core/system-prompt/src/index.ts
- packages/core/agent-loop/src/runtime-context.ts
- packages/subagent/subagent/src/child-agent.ts
- packages/host/apiproxy/src/api-proxy.ts
- packages/host/apiproxy/src/api/approvals.ts
- packages/acp/acp/src/index.ts
- vendor/cordis/src/events.ts
- vendor/cordis/src/service.ts

## 相关

- [spine.tool-call-anatomy](../../spine/tool-call-anatomy.md)（`spine.tool-call-anatomy`）：`tools/pre-execute → execute → post-execute`；`ask` 在哪一层变成 `serviceAsk`。
- [spine.trace-tool-approval](../../spine/trace-tool-approval.md)（`spine.trace-tool-approval`）：一条真实 `write` 升权路径，从 `ask|never` 到 `allowed-once`。
- [spine.overview](../../spine/overview.md)（`spine.overview`）：`profile → bundle → preset`；host 面 vs agent-preset 面。
- [spine.capability-seams](../../spine/capability-seams.md)（`spine.capability-seams`）：Definition / Provider / Consumer；approval 与 sandbox 同属 host 缝。
- [subsys.core.tools](../core/tools.md)（`subsys.core.tools`）：`PreToolDecision.ask` 与 `serviceAsk` 的 deny 文案。
- [subsys.interaction.permission-presets](permission-presets.md)（`subsys.interaction.permission-presets`）：三档 preset 如何写 `approval/policy` 旋钮。
- [subsys.execution.sandbox](../execution/sandbox.md)（`subsys.execution.sandbox`）：`approveEscalation` 的加宽表与 throw 文案；本页只写它调用 `request`。
- [subsys.composition.bundle-base](../composition/bundle-base.md)（`subsys.composition.bundle-base`）：`id: approval` 在 host 行表里的位置。
- [subsys.core.system-prompt](../core/system-prompt.md)（`subsys.core.system-prompt`）：`systemPrompt.context` 与 runtime-context 快照。
- [subsys.core.session](../core/session.md)（`subsys.core.session`）：三类 surface；`approval/*` 为什么不进 `deriveMessages()`。
- [subsys.orchestration.subagent](../orchestration/subagent.md)（`subsys.orchestration.subagent`）：委派孩子钉 `'never'`。
- [subsys.integration.acp](../integration/acp.md)（`subsys.integration.acp`）：overlay 机器答者；必须 `next()` 非己请求。
- [surface.misc.security](../../surface/misc/security.md)（`surface.misc.security`）：审批与沙箱的产品面（planned）。
