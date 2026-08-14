---
id: surface.misc.security
title: 审批与沙箱产品面
kind: surface
tier: T1
pkg: execution
source:
  - packages/sandbox/sandbox/src/index.ts
  - packages/sandbox/sandbox/src/escalation.ts
  - packages/sandbox/sandbox/src/roots.ts
  - packages/sandbox/sandbox/tests/escalation.spec.ts
  - packages/sandbox/sandbox/tests/roots.spec.ts
  - packages/sandbox/sandbox/tests/vocabulary.spec.ts
  - packages/sandbox/sandbox-policy/src/index.ts
  - packages/sandbox/sandbox-policy/src/session-mode.ts
  - packages/sandbox/sandbox-policy/tests/policy.spec.ts
  - packages/sandbox/sandbox-local/src/index.ts
  - packages/interaction/user-approval/src/index.ts
  - packages/interaction/user-approval/src/types.ts
  - packages/interaction/user-approval/tests/approval.spec.ts
  - packages/interaction/permission-presets/src/index.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/fs/fs-sandbox/src/index.ts
  - packages/fs/tool-fs/src/index.ts
  - packages/fs/tool-fs/src/sandbox.ts
  - packages/fs/tool-fs/src/write.ts
  - packages/shell/tool-bash/src/index.ts
  - packages/shell/bash-sandbox/src/index.ts
  - packages/core/tools/src/index.ts
  - packages/host/apiproxy/src/api/approvals.ts
symbols:
  - ctx.sandbox
  - ctx.approval
  - ctx.sandboxPolicy
  - SandboxMode
  - ApprovalPolicy
  - ApprovalOutcome
  - SANDBOX_UNAVAILABLE
  - writableRoots
  - ESCALATION_TARGETS
related: []
evidence: explicit
status: verified
updated: 47f943859b
---

> DSH 是 **Cordis 组合运行时**。审批与沙箱是 **host 面**两颗独立旋钮：`SandboxMode` 只罩**文件副作用**（`read-only` / `workspace-write` / `danger-full-access`），`ApprovalPolicy` 只有 `ask | never`；人点一次只给 `'allowed-once'`，没有 `allow-always`。围栏不可用则 `SANDBOX_UNAVAILABLE`（fail-closed，不静默裸跑）；无答者则 `'unavailable'`（同样 fail-closed）。默认产品路径是本地 Web GUI（`dsh web`），本仓没有 shipped TUI。

## 能回答的问题

- 用户能选哪几档沙箱、哪两档审批？有没有 `allow-always` / 第四档 / 网络隔离档？
- 沙箱罩什么？`read-only` 时 `writableRoots` 是不是空？runner 不可用会不会裸跑？
- `never` 和无答者分别让人/模型看见什么？两者能混成一句「自动拒绝」吗？
- 模型怎样申请升权？grant 改不改下一轮 standing？升权挂在 `tools/pre-execute` 吗？
- `/permission` 和 `DSH_PERMISSION_MODE` 各自改什么？这三颗服务是 host 面还是 preset isolate？

## 是什么

产品上这是**两颗旋钮 + 一次一次性提问**，不是一份常驻白名单，也不是 Codex 那种带网络 / 进程可见性的 OS sandbox。

| 旋钮 | ctx 键 | 人能选的闭合词 |
|---|---|---|
| 文件副作用档 | `ctx.sandboxPolicy` 解析、`ctx.sandbox` 执行 | `read-only` / `workspace-write` / `danger-full-access` [E: packages/sandbox/sandbox/src/index.ts:29] |
| 提问政策 | `ctx.approval` | `ask` / `never` [E: packages/interaction/user-approval/src/index.ts:94] |
| 一次提问的结局 | `ApprovalOutcome` | `'allowed-once'` / `'rejected'` / `'cancelled'` / `'unavailable'` [E: packages/interaction/user-approval/src/types.ts:29]；升权路径 **唯一 grant** 是 `'allowed-once'` [E: packages/sandbox/sandbox/src/escalation.ts:183] |

`SandboxMode` 闭合类型只有这三档，**没有** network / process-visibility 取值。[E: packages/sandbox/sandbox/src/index.ts:29] `read-only` / `workspace-write` 走 `confine`；`danger-full-access` 不调用 `confine`。[E: packages/shell/bash-sandbox/src/index.ts:91] [I]

这三颗服务（`ctx.sandbox` / `ctx.sandboxPolicy` / `ctx.approval`）是 **host 面**（进程级，session 出现之前就要 `inject`）。agent-preset 只登记模型可见工具；**不是** preset isolate 域。换 `minimal` / `standard` 卸不掉审批服务。

默认安装面是 `dsh web`。`--host 0.0.0.0` 被拒属于 [web profile](../profiles/web.md)（`surface.profiles.web`）的 launcher，不是 `ctx.sandbox` 行为。

## 入口

人 / 模型 / 部署碰到这组旋钮的路径：

| 入口 | 谁用 | 改什么 |
|---|---|---|
| `/permission`（`ctx.commands` 名 `permission`） | 人命令，不经模型 turn | 登记名是 `permission`。[E: packages/interaction/permission-presets/src/index.ts:259] 切 preset 后，服务经 `setSandboxMode` / `setApproval` 写 `sandbox/mode` + `approval/policy`。[E: packages/interaction/permission-presets/src/index.ts:386] [E: packages/interaction/permission-presets/src/index.ts:390] |
| `permissions` session projection | Web 选择器（提交同一条 `/permission` 行） | 读当前 preset；写路径仍是那条人命令 |
| `DSH_PERMISSION_MODE` | 部署环境变量 | shipped `dsh-base` 把 `sandbox-policy.mode` 写成 `DSH_PERMISSION_MODE ?? 'workspace-write'`；approval 仅当该值等于 `'danger-full-access'` 时配 `'never'`，否则 `'ask'`。[E: packages/bundle/base/cordis.patch.yml:175] [E: packages/bundle/base/cordis.patch.yml:191] |
| 模型参数 `sandbox_permissions` + `justification` | `write` / `edit` / `bash` 的一次性重试 | 必须成对且理由非空；目标只能是升权枚举，不能升到 `read-only`。[E: packages/sandbox/sandbox/src/escalation.ts:41] [E: packages/sandbox/sandbox/src/escalation.ts:52] |
| Web 审批面板 | 人点 Allow / Reject | client 可写 outcome 只有 `'allowed-once' \| 'rejected'`；`'cancelled'` / `'unavailable'` 是 host 侧词。[E: packages/host/apiproxy/src/api/approvals.ts:20] |

`/permission` 与 `permission-presets` 是人命令面：点名即可。本页不抄 shipped 三档 preset 表（哪档捆哪对旋钮见 `subsys.interaction.permission-presets`）。执行与 replay **只读**两颗旋钮的 fold，不读 preset 名。

失败时人 / 模型看见的不是同一句话：

| 情况 | 谁看见 | 文案 / 码 |
|---|---|---|
| 围栏拦住写 | 模型 `tool/result` | `[sandbox: file access denied under ${mode} mode]`，并附「用 `sandbox_permissions` + `justification` 再试一次」的 hint。[E: packages/sandbox/sandbox/src/escalation.ts:72] [E: packages/sandbox/sandbox/src/escalation.ts:85] 结构化码仍是 `FS_SANDBOX_DENIED`。[E: packages/fs/tool-fs/src/sandbox.ts:129] |
| 请求了 confined 档但没有 usable runner | 模型 / 操作者 | `SandboxUnavailableError`，`code: SANDBOX_UNAVAILABLE`；正文点名 refused mode，并写「refusing to run the command unconfined」。[E: packages/sandbox/sandbox/src/index.ts:124] [E: packages/sandbox/sandbox/src/index.ts:135] [E: packages/sandbox/sandbox/tests/vocabulary.spec.ts:16] |
| 人点拒绝 / 政策 `never` | 升权路径 throw | `the user rejected escalating this ${subject} to "${mode}"`（`never` 的 outcome 是 `'rejected'`，**不**弹窗）。[E: packages/sandbox/sandbox/src/escalation.ts:184] [E: packages/interaction/user-approval/src/index.ts:312] |
| 无答者 / 答者抛错 / 非法返回 | 升权路径 throw | `sandbox escalation to "${mode}" requires approval, but no approval channel is available`（outcome `'unavailable'`）。[E: packages/sandbox/sandbox/src/escalation.ts:186] [E: packages/interaction/user-approval/src/index.ts:320] |
| 人撤走提问 / abort | throw | `approval for escalating to "${mode}" was cancelled`。[E: packages/sandbox/sandbox/src/escalation.ts:185] |

`'never'` ≠ 无答者：前者是政策短路，outcome `'rejected'`，答者计数为零；后者是 waterfall 叶子 `'unavailable'`。两者文案不同，不要混成一句「自动拒绝」。[E: packages/interaction/user-approval/tests/approval.spec.ts:409] [E: packages/interaction/user-approval/tests/approval.spec.ts:65]

## 关键字段

### `SandboxMode`（三档，只罩文件副作用）

| 值 | 产品含义 | 围栏怎么做 |
|---|---|---|
| `read-only` | 站桩不允许改文件 | `writeText` / `editText` 立刻 `FS_SANDBOX_DENIED`。[E: packages/fs/fs-sandbox/src/index.ts:131] `writableRoots` **空数组**。[E: packages/sandbox/sandbox/src/roots.ts:53] [E: packages/sandbox/sandbox/tests/roots.spec.ts:27] 读不被本缝挡住。 |
| `workspace-write` | 可写 session workspace + 平台临时区 | `writableRoots` = canonical 去重的 `workspaceRoot` + `/tmp` + `os.tmpdir()`。[E: packages/sandbox/sandbox/src/roots.ts:54] 工作区外写被拒。bash / pwsh 走 `ctx.sandbox.confine`。 |
| `danger-full-access` | 显式满权 | **不**调用 `confine`；fs 原样放行。[E: packages/shell/bash-sandbox/src/index.ts:91] [E: packages/fs/fs-sandbox/src/index.ts:129] `writableRoots` 同样返回 `[]`（满权不靠这份 allow-list）。[E: packages/sandbox/sandbox/src/roots.ts:53] |

闭合三元，没有第四档。类型里没有 network / process 位。[E: packages/sandbox/sandbox/src/index.ts:29]

### `ApprovalPolicy`（两档）

| 值 | 进 waterfall 之前 | 人看见什么 |
|---|---|---|
| `ask` | 交给组合答者；没人 claim → `'unavailable'` [E: packages/interaction/user-approval/src/index.ts:320] | `dsh web` 弹出审批；卸掉答者则 fail-closed，不偷偷放行 |
| `never` | 直接 `'rejected'`，连 `prepend: true` 的答者也看不到 [E: packages/interaction/user-approval/src/index.ts:312] [E: packages/interaction/user-approval/tests/approval.spec.ts:433] | **不弹窗**。模型 runtime-context 写明不要设 `sandbox_permissions`。[E: packages/interaction/user-approval/src/index.ts:100] |

没有 `always` / `auto`。[E: packages/interaction/user-approval/src/index.ts:94]

### `ApprovalOutcome` / 升权目标

| 符号 | 取值 | 产品含义 |
|---|---|---|
| `ApprovalOutcome` / `EscalationOutcome` | `'allowed-once' \| 'rejected' \| 'cancelled' \| 'unavailable'` | 词表里**没有** `allow-always`。[E: packages/interaction/user-approval/src/types.ts:29] [E: packages/sandbox/sandbox/src/escalation.ts:93] |
| 唯一 grant | `'allowed-once'` | 只盖**这一次** call 的 `policy.mode`，不 `append` `sandbox/mode`。[E: packages/sandbox/sandbox/src/escalation.ts:183] [E: packages/fs/tool-fs/src/sandbox.ts:107] |
| `ESCALATION_TARGETS` | `workspace-write`、`danger-full-access` | 模型 schema 枚举。`read-only` 是地板，没有人升到它。[E: packages/sandbox/sandbox/src/escalation.ts:41] |
| `WIDER_MODES` | `read-only` → 两档更宽；`workspace-write` → 只到满权；满权无出口 | 非严格更宽**从不弹人**。[E: packages/sandbox/sandbox/src/escalation.ts:29] [E: packages/sandbox/sandbox/tests/escalation.spec.ts:24] [E: packages/sandbox/sandbox/tests/escalation.spec.ts:91] |

`writableRoots` 在 `read-only` 时为空：测试按字面钉死 `[]`。[E: packages/sandbox/sandbox/tests/roots.spec.ts:27] 实现是 `mode !== 'workspace-write'` 一律 `[]`，所以满权也空——满权靠跳过围栏，不靠空名单「拒绝一切」。[E: packages/sandbox/sandbox/src/roots.ts:53]

## 装配与门控

DSH 组合主线是 `profile → bundle → agent preset`。沙箱 / 审批的 Provider 在 **host** `dsh-base`：

- `id: sandbox` = `@deepseek-ai/dsh-sandbox-local`（`ctx.sandbox`）[E: packages/bundle/base/cordis.patch.yml:169] [E: packages/bundle/base/cordis.patch.yml:170]
- `id: sandbox-policy` = `@deepseek-ai/dsh-sandbox-policy`（`ctx.sandboxPolicy`）[E: packages/bundle/base/cordis.patch.yml:172]
- `id: approval` = `@deepseek-ai/dsh-user-approval`（`ctx.approval`）[E: packages/bundle/base/cordis.patch.yml:188]
- `id: permission` = `@deepseek-ai/dsh-permission-presets`（人命令面，点名即可）[E: packages/bundle/base/cordis.patch.yml:193]

两套默认必须分开写：

1. **裸 plugin / schema**：sandbox-policy `mode` 默认 `'read-only'`；approval `policy` 默认 `'ask'`。[E: packages/sandbox/sandbox-policy/src/index.ts:94] [E: packages/sandbox/sandbox-policy/tests/policy.spec.ts:45] [E: packages/interaction/user-approval/src/index.ts:194]
2. **shipped `dsh web` 真树**：未设 `DSH_PERMISSION_MODE` 时站桩是 `workspace-write` + `ask`。[E: packages/bundle/base/cordis.patch.yml:175] [E: packages/bundle/base/cordis.patch.yml:191]

门控位置（产品要记住的三句）：

1. **沙箱不挂在 `tools/pre-execute`。** 围栏在 fs / shell **provider**：`SandboxedFileSystem` `inject = ['sandboxPolicy']`，只挡 `writeText` / `editText`；`SandboxBashExecutor` 对 `['bash', '-c', command]` 调 `ctx.sandbox.confine`。[E: packages/fs/fs-sandbox/src/index.ts:60] [E: packages/fs/fs-sandbox/src/index.ts:84] [E: packages/fs/fs-sandbox/src/index.ts:105] [E: packages/shell/bash-sandbox/src/index.ts:178] `dsh-tool-fs` / `dsh-tool-bash` 的 `inject` 没有 `sandbox`。[E: packages/fs/tool-fs/src/index.ts:22] [E: packages/shell/tool-bash/src/index.ts:31]
2. **升权在 tool body 开头，副作用之前。** `write.execute` 先 `resolvePolicy`；`bash.execute` 先 `approveBashEscalation`（内部 `approveEscalation` → `ctx.get('approval').request`）。[E: packages/fs/tool-fs/src/write.ts:107] [E: packages/shell/tool-bash/src/index.ts:223] [E: packages/shell/tool-bash/src/index.ts:335] 另一条提问入口是 `tools/pre-execute` 返回 `{ kind: 'ask' }` 才进 `serviceAsk`——同样只放行 `'allowed-once'`。[E: packages/core/tools/src/index.ts:1479] [E: packages/core/tools/src/index.ts:1714] shipped `dsh-base` 没有把 hook 答成 `ask` 的插件；默认产品路径是 body 里的升权。
3. **审批走 `approval/request` waterfall。** `'never'` 在进 waterfall **之前**就 `'rejected'`。[E: packages/interaction/user-approval/src/index.ts:312] 叶子是 `'unavailable'`：无答者 fail-closed，不偷偷 `'allowed-once'`。[E: packages/interaction/user-approval/src/index.ts:320] [E: packages/interaction/user-approval/tests/approval.spec.ts:65]

围栏不可用必须 fail-loud。`LocalSandboxProvider.selectRunner` 在平台链判 `'unavailable'` 时 `throw new SandboxUnavailableError(mode)`，命令从未跑。[E: packages/sandbox/sandbox-local/src/index.ts:494] 执行期 runner 没把命令拉起来，bash-sandbox 再抛同一 `code`。[E: packages/shell/bash-sandbox/src/index.ts:103] **禁止**把「没有 runner」写成静默退回 host 裸跑。

`danger-full-access` 是显式档位，不是 runner 缺失时的降级：类型把这一档剔出 `confine` 入参。[E: packages/sandbox/sandbox/src/index.ts:32]

## 跨包关系

- [`spine.trace-tool-approval`](../../spine/trace-tool-approval.md)（`spine.trace-tool-approval`）：一条已带 `sandbox_permissions` 的 `write`，从 `ask|never` 走到 `'allowed-once'` 再 `writeText`。本页不重写那条走读。
- [`spine.tool-call-anatomy`](../../spine/tool-call-anatomy.md)（`spine.tool-call-anatomy`）：`tools/pre-execute → execute → post-execute`。沙箱围栏在 body / provider，不在 pre-execute。
- [`subsys.execution.sandbox`](../../subsystems/execution/sandbox.md)（`subsys.execution.sandbox`）：`ctx.sandbox`、`confine`、`approveEscalation`、`SANDBOX_UNAVAILABLE` 的 T2 权威。
- [`subsys.execution.sandbox-policy`](../../subsystems/execution/sandbox-policy.md)（`subsys.execution.sandbox-policy`）：`resolve` / `sandbox/mode` fold / `sandbox:policy` 快照。
- [`subsys.interaction.approval`](../../subsystems/interaction/approval.md)（`subsys.interaction.approval`）：`ApprovalService.request`、`approval/request` 答者合同、审计对。
- [`surface.profiles.web`](../profiles/web.md)（`surface.profiles.web`）：默认 `dsh web` 组合；`--host 0.0.0.0` 拒绝写在那一页。
- [`surface.tools.bash`](../tools/bash.md)（`surface.tools.bash`）：one-shot `bash` 如何在 execute 里 `ask` 升权、怎样渲染 denial。

## Sources

- packages/sandbox/sandbox/src/index.ts
- packages/sandbox/sandbox/src/escalation.ts
- packages/sandbox/sandbox/src/roots.ts
- packages/sandbox/sandbox/tests/escalation.spec.ts
- packages/sandbox/sandbox/tests/roots.spec.ts
- packages/sandbox/sandbox/tests/vocabulary.spec.ts
- packages/sandbox/sandbox-policy/src/index.ts
- packages/sandbox/sandbox-policy/src/session-mode.ts
- packages/sandbox/sandbox-policy/tests/policy.spec.ts
- packages/sandbox/sandbox-local/src/index.ts
- packages/interaction/user-approval/src/index.ts
- packages/interaction/user-approval/src/types.ts
- packages/interaction/user-approval/tests/approval.spec.ts
- packages/interaction/permission-presets/src/index.ts
- packages/bundle/base/cordis.patch.yml
- packages/fs/fs-sandbox/src/index.ts
- packages/fs/tool-fs/src/index.ts
- packages/fs/tool-fs/src/sandbox.ts
- packages/fs/tool-fs/src/write.ts
- packages/shell/tool-bash/src/index.ts
- packages/shell/bash-sandbox/src/index.ts
- packages/core/tools/src/index.ts
- packages/host/apiproxy/src/api/approvals.ts

## 相关

无 index related。邻居（index 里已有 id）：

- [spine.trace-tool-approval](../../spine/trace-tool-approval.md)（`spine.trace-tool-approval`）：带审批的 `write` 走读。
- [spine.tool-call-anatomy](../../spine/tool-call-anatomy.md)（`spine.tool-call-anatomy`）：工具管线；沙箱不在 pre-execute。
- [subsys.execution.sandbox](../../subsystems/execution/sandbox.md)（`subsys.execution.sandbox`）：`ctx.sandbox` T2。
- [subsys.interaction.approval](../../subsystems/interaction/approval.md)（`subsys.interaction.approval`）：`ctx.approval` T2。
- [surface.profiles.web](../profiles/web.md)（`surface.profiles.web`）：`dsh web`；`--host 0.0.0.0` 不是沙箱。
- [surface.tools.bash](../tools/bash.md)（`surface.tools.bash`）：bash 升权字段与 denial 渲染。
