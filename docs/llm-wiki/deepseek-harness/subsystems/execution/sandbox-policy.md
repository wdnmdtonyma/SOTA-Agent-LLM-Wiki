---
id: subsys.execution.sandbox-policy
title: sandboxPolicy
kind: subsystem
tier: T2
pkg: execution
source:
  - packages/sandbox/sandbox-policy/src/index.ts
  - packages/sandbox/sandbox-policy/src/session-mode.ts
  - packages/sandbox/sandbox-policy/tests/policy.spec.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/interaction/permission-presets/src/index.ts
  - packages/sandbox/sandbox/src/index.ts
  - packages/sandbox/sandbox/src/roots.ts
  - packages/fs/fs-sandbox/src/index.ts
  - packages/shell/bash-sandbox/src/index.ts
  - packages/shell/pwsh-sandbox/src/index.ts
  - packages/terminal/terminal-bash/src/index.ts
  - packages/fs/tool-fs/src/sandbox.ts
  - packages/shell/tool-bash/src/index.ts
  - packages/core/session/src/surface.ts
  - packages/core/agent-loop/src/agent.ts
  - packages/subagent/subagent/src/child-agent.ts
  - packages/bundle/web-app/cordis.patch.yml
  - vendor/cordis/src/service.ts
  - examples/headless-agent/e2b.cordis.yml
symbols:
  - ctx.sandboxPolicy
  - SandboxPolicyService
  - effectiveSandboxMode
  - setSandboxMode
  - overrideOf
related:
  - spine.overview
  - spine.tool-call-anatomy
  - spine.trace-tool-approval
  - spine.capability-seams
  - spine.session-log
  - subsys.execution.sandbox
  - subsys.execution.fs-sandbox
  - subsys.execution.terminal
  - subsys.interaction.permission-presets
  - subsys.interaction.approval
  - subsys.core.system-prompt
  - surface.misc.security
evidence: explicit
status: verified
updated: 47f943859b
---

> `ctx.sandboxPolicy`（`SandboxPolicyService`）是 **host 面政策家**：拥有部署默认的文件副作用档位 + fallback workspace 根，以及 per-session `sandbox/mode` 的 fold / 写路径。执行方（`fs-sandbox` / `bash-sandbox` / `pwsh-sandbox` / `terminal-bash`）和升权工具都读**同一份** `resolve({ session })` 结果。`sandbox/mode` 事件本身是 log-only（不是 surface，没有 `surfaceOp`）；模型看见的是 runtime-context 快照里的 `sandbox:policy` 文案。

## 能回答的问题

- `Config` 类型默认 mode 是什么？shipped `dsh-base` 又覆写成什么？这两层为什么不能混成一句？
- `resolve({ session })` 怎样拼出 `mode` + `workspaceRoot`？升权 grant 怎样盖过 session fold，却不改下一 call？
- `sandbox/mode` 是 surface 事件吗？`effectiveSandboxMode` / `setSandboxMode` 各做什么？
- 谁往 session log 写 mode？permission presets 和 subagent delegation 走同一条函数吗？
- `renderPolicyContext` 怎样进 runtime-context 快照，replay 怎样看见当时的 mode / root？
- 直调 `ctx.fs.writeText` / `ctx.shell.resolve` 不带 session 时，读的是哪一档？

## 职责边界

本包 `@deepseek-ai/dsh-sandbox-policy` 拥有：`ctx.sandboxPolicy` 键、部署默认 `defaultMode` / `workspaceRoot`、`resolve` / `overrideOf`、`sandbox/mode` 事件声明、纯 fold `effectiveSandboxMode`、运行时写路径 `setSandboxMode`、以及名为 `sandbox:policy` 的 runtime-context 贡献。

本包**不**拥有：

- `SandboxMode` 三元词汇、`writableRoots`、`approveEscalation`、`SANDBOX_UNAVAILABLE` —— [`subsys.execution.sandbox`](sandbox.md)（`subsys.execution.sandbox`）。
- 平台 runner 选择链（bwrap / Landlock / Seatbelt / Windows ACL）—— [`subsys.execution.sandbox-local`](sandbox-local.md)（`subsys.execution.sandbox-local`）。本页不写那条链。
- `writeText` / `editText` 围栏 —— [`subsys.execution.fs-sandbox`](fs-sandbox.md)（`subsys.execution.fs-sandbox`）。
- `bash -c` / pwsh 怎样 `confine` —— `subsys.execution.bash-local` / `subsys.execution.pwsh-local`。
- live PTY 在 mode 切换时的 fence —— [`subsys.execution.terminal`](terminal.md)（`subsys.execution.terminal`）。
- 产品级 Permissions 选择器、`permission/preset` 与 `approval/policy` 捆 —— [`subsys.interaction.permission-presets`](../interaction/permission-presets.md)（`subsys.interaction.permission-presets`）。该页只是 `setSandboxMode` 的 shipped 调用方。
- `approval/request` waterfall —— [`subsys.interaction.approval`](../interaction/approval.md)（`subsys.interaction.approval`）。
- `tools/pre-execute` / `tools/execute` —— [`subsys.core.tools`](../core/tools.md)（`subsys.core.tools`）/ [`spine.tool-call-anatomy`](../../spine/tool-call-anatomy.md)（`spine.tool-call-anatomy`）。
- `read` / `write` / `edit` / `bash` 字段表 —— `surface.tools.*`。

DSH 是 Cordis 组合运行时（`profile → bundle → agent preset`）。`ctx.sandboxPolicy` 是 **host 面**（进程级，session 出现之前就要 `inject`）。默认产品路径是本地 Web GUI（`dsh web`）；本仓没有 shipped TUI。`dsh-web-app` 把模型可见 `tool-fs` / `tool-bash` 行 `disabled: true`，policy Provider **留在 host**。[E: packages/bundle/web-app/cordis.patch.yml:294] [E: packages/bundle/web-app/cordis.patch.yml:313]

这一缝只解析**文件副作用**政策（`read-only` / `workspace-write` / `danger-full-access`）。类型里没有 network / process-visibility 取值。[E: packages/sandbox/sandbox/src/index.ts:29]

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/sandbox/sandbox-policy/src/index.ts` | Definition + 唯一 shipped Provider：`SandboxPolicyService`、`resolve`、`renderPolicyContext` |
| `packages/sandbox/sandbox-policy/src/session-mode.ts` | `sandbox/mode` 事件、`effectiveSandboxMode`、`setSandboxMode`、`SANDBOX_MODES` |
| `packages/sandbox/sandbox-policy/tests/policy.spec.ts` | 钉死 Config 默认 `read-only`、fold 最后一条赢、grant 盖一次 call、snapshot 文案 |
| `packages/bundle/base/cordis.patch.yml` | host 真树：`id: sandbox-policy` 覆写 mode / workspaceRoot |
| `packages/interaction/permission-presets/src/index.ts` | shipped 写手：preset 切换与 `session/created` pin 调 `setSandboxMode` |
| `packages/fs/fs-sandbox/src/index.ts` | 文件围栏 Consumer：`inject = ['sandboxPolicy']` |
| `packages/shell/bash-sandbox/src/index.ts` | POSIX 进程围栏 Consumer |
| `packages/terminal/terminal-bash/src/index.ts` | PTY Consumer：spawn 时 `resolve({ session })` |
| `packages/fs/tool-fs/src/sandbox.ts` / `packages/shell/tool-bash/src/index.ts` | 升权工具层：standing `resolve` 后再盖 grant |

## 数据模型

| 符号 | 落点 | 含义 |
|---|---|---|
| `Config.mode` | `index.ts` schema | 部署默认档。schema 默认 `'read-only'`（fail-safe）。[E: packages/sandbox/sandbox-policy/src/index.ts:94] |
| `Config.workspaceRoot` | `index.ts` schema | fallback 根。**没有** schema 默认；构造里 `?? process.cwd()`。[E: packages/sandbox/sandbox-policy/src/index.ts:97] [E: packages/sandbox/sandbox-policy/src/index.ts:110] |
| `defaultMode` / `workspaceRoot` | service 字段 | 构造后的部署真相。无 session 的 `resolve()` 就落到这里。 |
| `SandboxPolicyRequest` | `session?` + `mode?` | 一次 capability call 的输入。`mode` 是「这一次批准档」，不是 session 新状态。 |
| `SandboxExecutionPolicy` | `dsh-sandbox` | `mode` + 绝对 `workspaceRoot` + 可选 `sessionId`。[E: packages/sandbox/sandbox/src/index.ts:39] |
| `sandbox/mode` | `SessionEventMap` | `{ mode, source?: 'delegation' }`。log-only。[E: packages/sandbox/sandbox-policy/src/session-mode.ts:33] |
| `SANDBOX_MODES` | `session-mode.ts` | `['read-only', 'workspace-write', 'danger-full-access']`。[E: packages/sandbox/sandbox-policy/src/session-mode.ts:42] |
| `sandbox:policy` | `systemPrompt.context` | runtime-context 段名，`order: 110`。[E: packages/sandbox/sandbox-policy/src/index.ts:114] [E: packages/sandbox/sandbox-policy/src/index.ts:115] |

两套默认必须分开写：

1. **类型 / 裸 plugin**：`mode` schema 默认 `'read-only'`。测试 `plugin(SandboxPolicyService, {})` 得到 `defaultMode === 'read-only'`、`workspaceRoot === resolve(process.cwd())`。[E: packages/sandbox/sandbox-policy/src/index.ts:94] [E: packages/sandbox/sandbox-policy/tests/policy.spec.ts:45] [E: packages/sandbox/sandbox-policy/tests/policy.spec.ts:46]
2. **shipped `dsh-base`**：`id: sandbox-policy` 把 `mode` 写成 `process.env.DSH_PERMISSION_MODE ?? 'workspace-write'`，并把 `workspaceRoot` 写成 `process.cwd()`。[E: packages/bundle/base/cordis.patch.yml:172] [E: packages/bundle/base/cordis.patch.yml:175] [E: packages/bundle/base/cordis.patch.yml:176]

不要把「Config 默认 read-only」说成产品默认，也不要把 `DSH_PERMISSION_MODE` 写进 schema。

## 控制流

1. **host 挂上唯一 Provider。** `dsh-base` 插入 `id: sandbox-policy` = `@deepseek-ai/dsh-sandbox-policy`，旁边是 `id: sandbox` 与 `id: permission`。[E: packages/bundle/base/cordis.patch.yml:169] [E: packages/bundle/base/cordis.patch.yml:172] [E: packages/bundle/base/cordis.patch.yml:173] [E: packages/bundle/base/cordis.patch.yml:193] 本包没有第二份 `*-local` 实现：`SandboxPolicyService` 自己就是可加载插件。`dsh-web-app` 关掉模型可见 `tool-bash` / `tool-fs` 行，不另写 `sandbox-policy`。[E: packages/bundle/web-app/cordis.patch.yml:294] [E: packages/bundle/web-app/cordis.patch.yml:313]

2. **`SandboxPolicyService`@packages/sandbox/sandbox-policy/src/index.ts 占 `ctx.sandboxPolicy`。** 构造 `super(ctx, 'sandboxPolicy')`；Cordis `Service` 随即 `ctx.reflect.provide(name, self, …)`。[E: packages/sandbox/sandbox-policy/src/index.ts:105] [E: vendor/cordis/src/service.ts:57] `defaultMode = config.mode`（schema 已填）；`workspaceRoot = resolvePath(canonicalPath(config.workspaceRoot ?? process.cwd()))`。[E: packages/sandbox/sandbox-policy/src/index.ts:109] [E: packages/sandbox/sandbox-policy/src/index.ts:110] 非法 mode 在 load 时被 schemastery 拒绝。[E: packages/sandbox/sandbox-policy/tests/policy.spec.ts:129]

3. **可选地贡献 runtime-context，不改稳定 system prompt。** 构造里 `ctx.inject(['systemPrompt'], …)` 登记 `systemPrompt.context({ name: 'sandbox:policy', order: 110, text })`。[E: packages/sandbox/sandbox-policy/src/index.ts:112] [E: packages/sandbox/sandbox-policy/src/index.ts:114] `text` 没有 `context.agent?.session` 时返回 `''`；有 session 则 `renderPolicyContext(this.resolve({ session }))`。[E: packages/sandbox/sandbox-policy/src/index.ts:118] [E: packages/sandbox/sandbox-policy/src/index.ts:120] 三档文案只报 mode / workspaceRoot，不盘点挂了哪些 tool。[E: packages/sandbox/sandbox-policy/src/index.ts:41] [E: packages/sandbox/sandbox-policy/src/index.ts:43] [E: packages/sandbox/sandbox-policy/src/index.ts:45] 测试按字面钉死三档，并钉死 `TMPDIR` 变化不进快照。[E: packages/sandbox/sandbox-policy/tests/policy.spec.ts:161] [E: packages/sandbox/sandbox-policy/tests/policy.spec.ts:176] [E: packages/sandbox/sandbox-policy/tests/policy.spec.ts:177] `ReactLoopAgent.preStep` 把 `renderContextSections(assembly)` 交给 `RuntimeContextProjection.project`；`project` 返回 `undefined` 时不追加，否则塞进 `agent/pre-step` 的 messages。[E: packages/core/agent-loop/src/agent.ts:232] [E: packages/core/agent-loop/src/agent.ts:233] [E: packages/core/agent-loop/src/agent.ts:238] 卸掉 fiber 后 `ctx.get('sandboxPolicy')` 与 `sandbox:policy` 段一起消失。[E: packages/sandbox/sandbox-policy/tests/policy.spec.ts:139] [E: packages/sandbox/sandbox-policy/tests/policy.spec.ts:140]

4. **`sandbox/mode` 是 log-only。** 事件类型在 `SessionEventMap` 里声明为 `{ mode, source?: 'delegation' }`。[E: packages/sandbox/sandbox-policy/src/session-mode.ts:33] [E: packages/sandbox/sandbox-policy/src/session-mode.ts:36] `SurfaceEventType` 只有 `user/message` / `assistant/message` / `tool/result`；`sandbox/mode` 不在集合里，因此没有 `surfaceOp`，`deriveMessages()` 不会把它投成模型消息。[E: packages/core/session/src/surface.ts:16] [E: packages/core/session/src/surface.ts:17] [E: packages/core/session/src/surface.ts:18] 模型若看见档位，来源是 `sandbox:policy` 的 snapshot 文案，不是这条事件。

5. **`effectiveSandboxMode`@packages/sandbox/sandbox-policy/src/session-mode.ts 从后往前 fold，最后一条赢。** 从 `events.length - 1` 往 0 扫，命中 `type === 'sandbox/mode'` 就返回 `event.data.mode`；扫完没有则 `undefined`。[E: packages/sandbox/sandbox-policy/src/session-mode.ts:53] [E: packages/sandbox/sandbox-policy/src/session-mode.ts:55] [E: packages/sandbox/sandbox-policy/src/session-mode.ts:57] fold **不**看 `source`。测试：空 log → `undefined`；先 `workspace-write` 再 `read-only` → `'read-only'`。[E: packages/sandbox/sandbox-policy/tests/policy.spec.ts:217] [E: packages/sandbox/sandbox-policy/tests/policy.spec.ts:220]

6. **`setSandboxMode`@packages/sandbox/sandbox-policy/src/session-mode.ts 只 `session.append`。** 载荷是 `{ mode }`，没有 `source`，没有平行的可变字段。[E: packages/sandbox/sandbox-policy/src/session-mode.ts:70] 测试钉死一次调用正好一条 `sandbox/mode`。[E: packages/sandbox/sandbox-policy/tests/policy.spec.ts:227] [E: packages/sandbox/sandbox-policy/tests/policy.spec.ts:228] 生效点是**下一次** `resolve` / `overrideOf`：没有缓存，消费者每次读都 fold。

7. **shipped 写手不只这一条函数。** `PermissionPresetService` 在 `session/created`（以及挂载时已存活的 session）上 `pinInitialPermission`。[E: packages/interaction/permission-presets/src/index.ts:220] [E: packages/interaction/permission-presets/src/index.ts:224] 全新会话写入 preset 名后 `setSandboxMode(session, spec.sandbox)`；缺 sandbox 事件则用 `ctx.shell.sandboxMode` 补一条。[E: packages/interaction/permission-presets/src/index.ts:410] [E: packages/interaction/permission-presets/src/index.ts:425] `/permission` 切换在 knob 变化时同样 `setSandboxMode`。[E: packages/interaction/permission-presets/src/index.ts:387] 子代理委托**不**走 `setSandboxMode`：`captureDelegatedPolicyOverrides` 只读 `overrideOf(parent.session)`（不要部署默认、不要一次性 grant），`appendDelegatedPolicyOverrides` 直接 `append('sandbox/mode', { mode, source: 'delegation' })`。[E: packages/subagent/subagent/src/child-agent.ts:201] [E: packages/subagent/subagent/src/child-agent.ts:220]

8. **`resolve`@packages/sandbox/sandbox-policy/src/index.ts 是 per-call 拼装。** `mode = request.mode ?? (session === undefined ? undefined : this.overrideOf(session)) ?? this.defaultMode`。[E: packages/sandbox/sandbox-policy/src/index.ts:138] `overrideOf` 就是 `effectiveSandboxMode(session.events)`。[E: packages/sandbox/sandbox-policy/src/index.ts:150] `workspaceRoot = resolveWorkspaceRoot(session?.header.cwd ?? this.workspaceRoot)`；有 session 才带 `sessionId`。[E: packages/sandbox/sandbox-policy/src/index.ts:139] [E: packages/sandbox/sandbox-policy/src/index.ts:140] 因此：批准档 `request.mode` 强过 session fold；session fold 强过部署默认；无 session 时 fold 整段跳过。测试：两个 session 各带自己的 cwd / override，agentless `resolve()` 仍是部署 fallback；`resolve({ session, mode: 'danger-full-access' })` 在 session 已是 `read-only` 时仍返回满权，**root 仍是该 session 的 cwd**。[E: packages/sandbox/sandbox-policy/tests/policy.spec.ts:69] [E: packages/sandbox/sandbox-policy/tests/policy.spec.ts:81] [E: packages/sandbox/sandbox-policy/tests/policy.spec.ts:114] 无 cwd 的 session 用配置根。[E: packages/sandbox/sandbox-policy/tests/policy.spec.ts:123]

9. **执行方读同一份政策，方言各管各的。** `SandboxedFileSystem` `static inject = ['sandboxPolicy']`；有传入的 per-call policy 就用，否则 `this.ctx.sandboxPolicy.resolve()`（无 session → 部署默认）。[E: packages/fs/fs-sandbox/src/index.ts:60] [E: packages/fs/fs-sandbox/src/index.ts:127] `SandboxBashExecutor` `static override inject = ['subprocess', 'sandbox', 'sandboxPolicy']`，`resolve` 在 request 没带政策时 `this.ctx.sandboxPolicy.resolve()`。[E: packages/shell/bash-sandbox/src/index.ts:45] [E: packages/shell/bash-sandbox/src/index.ts:85] `SandboxPwshExecutor` 同一模式。[E: packages/shell/pwsh-sandbox/src/index.ts:53] `BashTerminalBackend.spawn` 调 `this.ctx.sandboxPolicy.resolve({ session: spec.owner.session })`。[E: packages/terminal/terminal-bash/src/index.ts:25] [E: packages/terminal/terminal-bash/src/index.ts:122] 各家自己决定 `danger-full-access` 是否跳过 `confine`、`read-only` 如何拒绝；本页不写 runner 选择。

10. **升权 grant 盖在这一次 call 上，不写 `sandbox/mode`。** `resolve` 的 `request.mode` 写在 `overrideOf` 前面。产品路径里，`FsSandboxController.resolvePolicy` 先 `this.policy?.resolve({ session })` 得到 standing；`approveEscalation` 通过后 `return { ...policy, mode: approvedMode }`。[E: packages/fs/tool-fs/src/sandbox.ts:89] [E: packages/fs/tool-fs/src/sandbox.ts:107] `tool-bash` 同样：`standingPolicy = sandboxPolicy?.resolve({ session })`，再 `{ ...standingPolicy, mode: approvedMode }` 交给 `ctx.shell`。[E: packages/shell/tool-bash/src/index.ts:200] [E: packages/shell/tool-bash/src/index.ts:339] 下一 call 若不再带升权参数，又回到 session fold / 部署默认。`sandboxMode` getter（`fs` / `shell` 上那份）只是构造时抄下的 `defaultMode`，广告升权字段用，不是 per-call 真相。[E: packages/fs/fs-sandbox/src/index.ts:65] [E: packages/shell/bash-sandbox/src/index.ts:71]

11. **host 面 vs agent-preset 面。** Provider、`sandbox/mode` fold、permission pin、fs/bash/pwsh/terminal 执行器留在 host。默认 `dsh web` 组合里 preset 只 `register` 模型工具；工具 body 当 Consumer 调 `resolve` / 盖 grant。浏览器 client 不实现 `SandboxPolicyService`。E2B POC overlay（`examples/headless-agent/e2b.cordis.yml`）把同一 `id: sandbox-policy` 的 `mode` 写成 `danger-full-access`——远程世界自己隔离，不是 shipped 默认。[E: examples/headless-agent/e2b.cordis.yml:31] [E: examples/headless-agent/e2b.cordis.yml:34]

## 设计动机

- **一份政策，多家执行。** fs 围栏、bash/pwsh `confine`、PTY spawn 必须对模型说同一档 + 同一 workspace 根。mode 与 root 住在政策家；拒绝文案与 runner 方言留在各 Consumer。
- **fail-safe schema，显式产品覆写。** 裸 plugin 默认 `read-only`，避免「忘了写 config 就变成可写」。shipped `dsh-base` 用 `DSH_PERMISSION_MODE ?? 'workspace-write'` 选择产品默认，环境变量是部署出口，不是 schema 默认值。
- **session log 就是 store。** 没有外部 mode 文件。重启 = 重放；两个 session 互不可见；`undefined` fold 明确表示「用部署默认」。
- **grant 一次性、可审计。** 更宽档盖在这一次 `SandboxExecutionPolicy` 上，不 `append` `sandbox/mode`，避免一次批准把整段会话焊成满权。delegation 只复制 `overrideOf`，复制不了 grant。
- **政策进 runtime-context，不进稳定 system prompt。** `sandbox:policy` 是 named context 段；loop 只在快照变化时追加。replay 看见当时的 mode / root，prompt 缓存不被每换一档就整段作废。
- **相对 Codex / Claude / Pi。** Codex 的 OS sandbox 还带网络 / 进程面；本缝只解析文件档。Claude hooks 不挂在 `resolve` 上。Pi 没有 in-core 执行沙箱。[I]

## Gotcha

- **`Config` 默认 ≠ shipped 默认。** 只读 `static Config` 会以为产品是 `read-only`。`dsh web` / `dsh-base` 的真树是 `DSH_PERMISSION_MODE ?? 'workspace-write'`。[E: packages/sandbox/sandbox-policy/src/index.ts:94] [E: packages/bundle/base/cordis.patch.yml:175]
- **`sandbox/mode` 不是 surface；快照文案是。** 事件本身不进 `deriveMessages()`。模型看到的是 `Current DSH file policy: …` 那句 user/message snapshot。[E: packages/core/session/src/surface.ts:16] [E: packages/sandbox/sandbox-policy/src/index.ts:41]
- **省略 `session` 等于无视该会话的 override。** `checkedTarget` / `SandboxBashExecutor.resolve` 在调用方没盖章时走无 session 的 `resolve()`，落到 `defaultMode`。[E: packages/fs/fs-sandbox/src/index.ts:127] [E: packages/shell/bash-sandbox/src/index.ts:85]
- **升权不改 fold。** `resolve({ mode })` 与 tool 层 `{ ...standing, mode: approved }` 都只活在这一次 call。子 session 从 `overrideOf` 继承不到 grant。[E: packages/sandbox/sandbox-policy/src/index.ts:138] [E: packages/subagent/subagent/src/child-agent.ts:201]
- **`setSandboxMode` 不是唯一 `append` 点。** 运行时开关走它（无 `source`）。delegation 直接 `append` 且带 `source: 'delegation'`。fold 对两者一视同仁。[E: packages/sandbox/sandbox-policy/src/session-mode.ts:70] [E: packages/subagent/subagent/src/child-agent.ts:220]
- **shipped 新会话通常已经被 pin 过一条 `sandbox/mode`。** `dsh-permission-presets` 在 `session/created` 补齐。此时 `overrideOf` 有值，部署默认只还服务于 agentless 调用、以及从未 pin 的组合。[E: packages/interaction/permission-presets/src/index.ts:220] [E: packages/interaction/permission-presets/src/index.ts:410]
- **workspace 边界是 session `header.cwd`，不是执行器 Config。** `workspace-write` 的根随 session 走；无 cwd 才用部署 fallback。[E: packages/sandbox/sandbox-policy/src/index.ts:139]
- **symlink 敏感。** `resolveWorkspaceRoot` 先 `canonicalPath`（`realpathSync.native`）再 `path.resolve`。POSIX 测例：cwd 为 `link/..` 时落到物理父目录，而不是词法塌缩结果。[E: packages/sandbox/sandbox/src/roots.ts:36] [E: packages/sandbox/sandbox-policy/src/index.ts:34] [E: packages/sandbox/sandbox-policy/tests/policy.spec.ts:102]
- **live PTY 可以挡住 mode 切换。** `terminal-bash` 在 `internal/dispatch` 看到本 owner 的 `sandbox/mode` 且 `hasOwnerActivity` 仍为真、新 mode 又不同时抛错。细节在 [`subsys.execution.terminal`](terminal.md)。[E: packages/terminal/terminal-bash/src/index.ts:46] [E: packages/terminal/terminal-bash/src/index.ts:48] [E: packages/terminal/terminal-bash/src/index.ts:49]
- **E2B overlay 把部署默认改成 `danger-full-access`。** 这是 POC 组合，不是 `dsh-base` / shipped preset 成员。[E: examples/headless-agent/e2b.cordis.yml:34]
- **本页不选 runner。** `resolve` 从不返回 argv。没有 usable runner 时的 `SANDBOX_UNAVAILABLE` 属于 `ctx.sandbox` Provider。

## Seam 三角

| 缝 | Definition | Provider | Consumer |
|---|---|---|---|
| `ctx.sandboxPolicy` | `@deepseek-ai/dsh-sandbox-policy` 的 `SandboxPolicyService`；augmentation `Context.sandboxPolicy`；`resolve` / `overrideOf` | **host** `dsh-base` 行 `id: sandbox-policy`（同一包，没有第二份 backend） | **host** `SandboxedFileSystem` / `SandboxBashExecutor` / `SandboxPwshExecutor` / `terminal-bash`：`inject` 含 `sandboxPolicy`。**preset 面** `dsh-tool-fs` / `dsh-tool-bash`：`resolve({ session })` 后可盖 grant |
| `sandbox/mode` 事件 | 同包 `session-mode.ts` 的 `SessionEventMap` | 无独立 Provider。运行时写路径是 `setSandboxMode`；delegation 直接 `append` | `effectiveSandboxMode` / `overrideOf` / `resolve`；`dsh-permission-presets` 读 fold 再决定要不要写；`terminal-bash` 听 `internal/dispatch` |
| runtime-context 段 `sandbox:policy` | 同包 `renderPolicyContext` + `systemPrompt.context` | 随 service 生命周期登记 / dispose | [`subsys.core.system-prompt`](../core/system-prompt.md) 装配；`ReactLoopAgent.preStep` 投影进历史 |
| 邻缝 `ctx.sandbox` | `@deepseek-ai/dsh-sandbox` `SandboxProvider` | host `id: sandbox` | bash/pwsh/PTY 拿**已经 resolve 完**的政策去 `confine`。本页不写选择链 |

换世界 = 换 host 的 `id: sandbox-policy` config（或整行插件），不要改 `tool-bash` / `tool-fs`。

## Sources

- packages/sandbox/sandbox-policy/src/index.ts
- packages/sandbox/sandbox-policy/src/session-mode.ts
- packages/sandbox/sandbox-policy/tests/policy.spec.ts
- packages/bundle/base/cordis.patch.yml
- packages/interaction/permission-presets/src/index.ts
- packages/sandbox/sandbox/src/index.ts
- packages/sandbox/sandbox/src/roots.ts
- packages/fs/fs-sandbox/src/index.ts
- packages/shell/bash-sandbox/src/index.ts
- packages/shell/pwsh-sandbox/src/index.ts
- packages/terminal/terminal-bash/src/index.ts
- packages/fs/tool-fs/src/sandbox.ts
- packages/shell/tool-bash/src/index.ts
- packages/core/session/src/surface.ts
- packages/core/agent-loop/src/agent.ts
- packages/subagent/subagent/src/child-agent.ts
- packages/bundle/web-app/cordis.patch.yml
- vendor/cordis/src/service.ts
- examples/headless-agent/e2b.cordis.yml

## 相关

- [spine.overview](../../spine/overview.md)（`spine.overview`）：`profile → bundle → preset` 与 host / preset 切面。
- [spine.tool-call-anatomy](../../spine/tool-call-anatomy.md)（`spine.tool-call-anatomy`）：沙箱在 body 的 `resolve` / 升权，不挂 `tools/pre-execute`。
- [spine.trace-tool-approval](../../spine/trace-tool-approval.md)（`spine.trace-tool-approval`）：`allowed-once` 升权盖到这一次 policy 的走读。
- [spine.capability-seams](../../spine/capability-seams.md)（`spine.capability-seams`）：Definition / Provider / Consumer；`ctx.fs` 与 `ctx.subprocess` 无运行时耦合。
- [spine.session-log](../../spine/session-log.md)（`spine.session-log`）：append-only log、`deriveMessages()`、runtime-context snapshot。
- [subsys.execution.sandbox](sandbox.md)（`subsys.execution.sandbox`）：`SandboxMode`、`approveEscalation`、`writableRoots`、`SANDBOX_UNAVAILABLE`。
- [subsys.execution.fs-sandbox](fs-sandbox.md)（`subsys.execution.fs-sandbox`）：默认 `ctx.fs` 读本页 `resolve` 的结果围 `writeText` / `editText`。
- [subsys.execution.terminal](terminal.md)（`subsys.execution.terminal`）：PTY spawn 读同一份政策；live session 挡住 `sandbox/mode`。
- [subsys.interaction.permission-presets](../interaction/permission-presets.md)（`subsys.interaction.permission-presets`）：把 sandbox mode 与 approval policy 捆成产品选择器，写路径落到 `setSandboxMode`。
- [subsys.interaction.approval](../interaction/approval.md)（`subsys.interaction.approval`）：升权询问的 `ask|never`；本页只消费批准后的 mode。
- [subsys.core.system-prompt](../core/system-prompt.md)（`subsys.core.system-prompt`）：`systemPrompt.context` 与 runtime-context 装配。
- [surface.misc.security](../../surface/misc/security.md)（`surface.misc.security`）：审批与沙箱的产品面（planned）。
