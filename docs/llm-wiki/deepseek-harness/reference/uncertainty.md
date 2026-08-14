---
id: ref.uncertainty
title: 不确定项日志([U] 汇总)
kind: reference
tier: T3
pkg: cross
source: []
symbols: []
related: []
evidence: unknown
status: verified
updated: 47f943859b
---

# 不确定项日志([U] 汇总)

> 本文件由 tools/reconcile.mjs 从 _staging/uncertainty-*.md 自动合并生成,请勿手改。

## a-trace-code-mode

- spine.trace-code-mode：`dsh-agent-tool-presentation` 模块 JSDoc 与 `agent-tool-presentation.spec.ts` 的注释写「缺 codeRuntime 则 mount 失败、审计点名该行」。可执行断言与 `inactiveRows` 只读静态 `inject: ['tools']`：`row.await()` 成功，assemble 保持 native `echo`。以测试断言 / `mount.ts:295` 为准；注释与代码是否会再对齐待查。

## c1-subagent-fork

# uncertainty · C1 · surface.tools.subagent-fork

- **shipped fork 的 `backgroundMode` 意图**：`packages/bundle/base/cordis.patch.yml` 的 host 行是 `backgroundMode: one-shot`。三个 shipped preset（`standard` / `code` / `cordis`）把同一 `id: tool-subagent-fork` 写成 `continuable`。`packages/subagent/subagent-fork-in-process/src/index.ts` 的 `prepareContinuable` TODO 仍写「no shipped composition calls this — they bind fork to `backgroundMode: one-shot`」。三处文件同时存在；哪一份是当前产品意图未核。wiki Preset 表只认四个 `agent.cordis.yml`。

## c2-cordis

# uncertainty · C2 · surface.tools.cordis

- `apps/cli/config/agent-presets/cordis/agent.cordis.yml` 头注释仍写 `cordis_mount` 对 live runtime 求值模型 JS；`editing-cordis-compositions/SKILL.md` 仍教 `cordis_mount` / `cordis_unmount`。现行 `defineTool` 登记名是 `cordis_define` / `cordis_run` / `cordis_stop` / `cordis_undefine` / 三条 `cordis_inspect_*`，没有 mount/unmount。
- （已核到代码，不再是 [U]）`packages/extensions/cordis-host-runner/src/lifecycle.ts:39` 的 `already registered` 教学文案仍指向 `cordis_runtime_inspect what:"temporary"`，现行工具是 `cordis_inspect_self`。页内已改标 `[E]`。
- `packages/extensions/tool-cordis/src/inspect.ts` 模块注释仍写 `cordis_runtime_inspect`；`present.ts` 仍导出未被 `index.ts` 引用的 `presentRuntimeInspectCall` / `presentPackageInspectCall`。
- `@deepseek-ai/dsh-tool-cordis` 的 `package.json` description 仍写 “mount and dispose model-written plugins”，与现行七个名字不一致。

## c2-run-code

- surface.tools.run-code：`packages/core/agent-tool-presentation/src/index.ts` 模块 JSDoc 与 `apply` 旁注释写「缺 `codeRuntime` 则 preset 在 mount 失败、审计点名该行」。可执行路径：静态 `inject` 只有 `['tools']`；`code`/`both` 的 `ctx.inject(['codeRuntime'])` 是动态 wait。`inactiveRows`（`packages/preset/agent-presets/src/mount.ts:295`）只读 `fiber.inject`，因此缺 runtime 时审计**不会**点名 `tool-presentation`。`agent-tool-presentation.spec.ts`：`row.ctx.get('codeRuntime')` 为 `undefined` 时 `assemble` 仍返回 native `echo`。以测试断言 / `inactiveRows` 为准；注释与代码是否再对齐待查。

## d-agent-tool-presentation

# uncertainty · subsys.core.agent-tool-presentation

- `packages/core/agent-tool-presentation/src/index.ts` 在 `apply` 的 `code`/`both` 分支旁注释写：缺 `codeRuntime` 时 entry pending，`dsh-agent-presets` 激活审计会点名该行。同包测试注释重复这一合同，但测试本身只 `plugin()` 本行，不断言 `mountPreset` 抛错。
- 可执行路径：静态 `inject = ['tools']`。`ctx.inject(['codeRuntime'], …)` 建的是子 fiber。`inactiveRows`（`packages/preset/agent-presets/src/mount.ts`）只读 loader entry 的 `fiber.inject` 键。缺 runtime 时 entry 的 `tools` 已满足，审计**不会**写出 `tool-presentation … waiting for codeRuntime`。
- 单测钉死的可见后果：`row.ctx.get('codeRuntime') === undefined`，`assemble` 仍是部署默认（native `echo`）；runtime 后到再投影。
- 以测试 / `inactiveRows` 实现为准写正文；「mount 一定失败并点名本 id」标 `[U]`。若后续让 `inactiveRows` 下钻动态 `ctx.inject` 子 fiber，或把 `codeRuntime` 写进 yml/`inject` 元数据，删这条。

## d-bundle-base

# uncertainty · bundle-base

- **官方 README 与测试冲突。** `packages/bundle/base/README.md` 写 “Codex and Claude Code providers load dormant”。`packages/bundle/base/tests/base.spec.ts` 要求 `id: subagent-codex` / `id: subagent-claude-code` 行数为 0，且 `package.json` `dependencies` 不含 `@deepseek-ai/dsh-subagent-codex` / `@deepseek-ai/dsh-subagent-claude-code`。wiki 跟测试：没有行就是没装，不是 dormant。preset 里对应 tool 行 `disabled: true` 也不等于 base 已加载后端。

## d-code-mode

# uncertainty · subsys.core.code-mode

- `dsh-agent-tool-presentation` 模块 JSDoc 与 `agent-tool-presentation.spec.ts` 注释写：缺 `codeRuntime` 时 Code Mode 行在 **mount 失败**，且 `dsh-agent-presets` 激活审计会点名该 `id`。可执行断言与 `inactiveRows` 只读静态 `entry.fiber.inject`（该行是 `inject: ['tools']`）：`row.await()` 成功，`assemble` 保持 native `echo`，直到之后 `ctx.plugin(StubRuntime)` 才切到 `[run_code]`。以测试断言 / `packages/preset/agent-presets/src/mount.ts:295` 为准。注释、JSDoc、以及 `code/agent.cordis.yml` 里「fails this preset at mount」是否会再对齐待查。

## e-code-runtime

# uncertainty · subsys.execution.code-runtime

- **yml / JSDoc 写「缺 runtime 则 mount 失败」，可执行路径是 pending + native 回落。** `apps/cli/config/agent-presets/code/agent.cordis.yml` 头注释与 `packages/core/agent-tool-presentation/src/index.ts` 的 `apply` 旁注释写：缺 host `codeRuntime` 时本行 pending，激活审计点名 `tool-presentation`。静态 `inject = ['tools']`；`ctx.inject(['codeRuntime'], …)` 建的是子 fiber。`inactiveRows` 只读 loader entry 的 `fiber.inject`。单测钉死 `row.ctx.get('codeRuntime') === undefined` 且 `assemble` 仍是 native `echo`。wiki 跟测试；「mount 一定失败」标 `[U]`。与 `_staging/uncertainty-d-agent-tool-presentation.md` 同一条漂移，从本缝 Consumer 角再记一次。
- **`dsh-base` 无 `code-runtime` 没有对称单测。** `packages/bundle/base/tests/base.spec.ts` 只断言 `subagent-codex` / `subagent-claude-code` 行数为 0。本页「不在 dsh-base」来自对 `cordis.patch.yml` / `package.json` 的全文检索（无 `code-runtime`、无 `@deepseek-ai/dsh-code-runtime*`），标 `[I]`。若以后 `base.spec.ts` 补一行 `rows.filter(id === 'code-runtime').toHaveLength(0)`，可升为 `[E]`。

## e-e2b

# uncertainty · subsys.execution.e2b

- **「API key 不进 sandbox」的范围。** `Config` JSDoc 写 never forwarded into the sandbox。可证路径是：`apiKey` 只交给 `Sandbox.create`；控制面 `e2bControlEnvs` 只钉 `HOME`；用户进程 env 先 `scrubRemoteEnvironment`（剥 `DSH_*` 与 `SENSITIVE_ENV_PATTERN`）再叠 `spec.env`。E2B SaaS / SDK 是否在 VM 元数据或 login 环境里留一份 key，本仓没有 SDK 源可核。wiki 只写 DSH 这一侧。
- **POC overlay 的 disable 目标是 example 的 `id`，不是 `dsh-base`。** `e2b.cordis.yml` disable `subprocess` / `fs-local`。`dsh-base` 的 fs 行是 `id: fs-sandbox`。把同一份 overlay 叠到 `dsh web` 不会关掉 host `fs-sandbox`。

## e-retry

# uncertainty · subsys.llm.retry

- **官方 README 与 loop 代码冲突（重试是否新开 turn）。** `packages/llm/llm-retry/README.md` / `README.zh.md` 写：plugin 不包 `ctx.llm.stream()`（这句与代码一致），但又写 “every retry opens a fresh numbered turn” / “The loop then closes the failed turn and opens a retry turn”，中文作「随后循环关闭失败轮次，并在同一持久历史上开启重试轮次」。还把挂钩写成 “closed-step `agent/request-error`”。源码：`ReactLoopAgent.step` 在同一 `while (true)` 里对 `{ kind: 'retry' }` 做 `continue`（`packages/core/agent-loop/src/agent.ts`）；`packages/llm/llm-retry/tests/retry.spec.ts` 断言全程只有一条 `step/start { turn: 1, step: 1 }`。companion 要求 `llm/retry` 时最近边界是开着的 `step/start`，不是 `step/end`（`packages/llm/llm-retry/src/invariant.ts`）。wiki 跟代码：同 step 再打；README 当官方漂移，不标 `[E]`。

## e-sandbox-policy

# uncertainty · subsys.execution.sandbox-policy

- **`setSandboxMode` JSDoc 写 THE write path，代码还有第二条 append。** `packages/sandbox/sandbox-policy/src/session-mode.ts` 注释称 `setSandboxMode` 是「THE write path」。`packages/subagent/subagent/src/child-agent.ts` 的 `appendDelegatedPolicyOverrides` 直接 `session.append('sandbox/mode', { mode, source: 'delegation' })`，不经过该函数。wiki 跟两条可执行路径：运行时开关走 `setSandboxMode`（无 `source`）；delegation 带 `source`。fold 不区分。
- **`resolve({ mode })` 是政策家合同，shipped 工具不走这个参数。** `SandboxPolicyRequest.mode` 与测试 `resolve({ session, mode: 'danger-full-access' })` 证明批准档盖过 session fold。`FsSandboxController.resolvePolicy` / `tool-bash` execute 先 `resolve({ session })`，再 `{ ...standing, mode: approved }`。效果等价（保留 cwd / sessionId），但生产路径没有调用 `resolve({ mode })`。
- **`./invariant` companion 未核进 shipped boot。** 包导出 `@deepseek-ai/dsh-sandbox-policy/invariant`，测试钉死未知 `sandbox/mode` 抛 `InvariantError`。`dsh-base` 的 `cordis.patch.yml` 没有单独 invariant 行；是否被 invariants 自动发现未核。wiki 正文不写这条 companion。

## e-shell

# uncertainty · subsys.execution.shell

- **官方 README 与代码冲突（namespace 名）。** `packages/shell/shell/README.md` / `README.zh.md` 写 `SHELL_SETTINGS_NAMESPACE`（`bash`）。源码是 `settingsNamespace('shell')`（`packages/shell/shell/src/index.ts`）。wiki 跟代码：品牌串是 `shell`。
- **YAML / 事后分析仍写 `DSH_WEB_MODE`。** `packages/bundle/web-app/cordis.patch.yml` 与 shipped preset 头注释、`docs/postmortem/0003-web-agent-gui-feedback-loop.md` 并列 `$DSH_WEB_URL` / `$DSH_WEB_MODE`。`packages/bundle/web-app/src/index.ts` 的 `web-runtime` contributor 只 `register` `DSH_WEB_URL`。wiki 只写源码里存在的那一个。

## e-subagent-codex

# uncertainty · subsys.orchestration.subagent-codex

- **包 README 与 shipped 组合冲突（「host 上 load 一次」）。** `packages/subagent/subagent-codex/README.md` / `README.zh.md` 写：Shipped profiles load this provider once on the host and start no Codex process until a tool call。`packages/bundle/base/tests/base.spec.ts` 要求 `id: subagent-codex` insert 长度为 0，且 `dependencies` 不含 `@deepseek-ai/dsh-subagent-codex`。`dsh-base` / `dsh-web-app` / `dsh-headless` 都没有该行。wiki 跟代码：包存在、base 不装；preset 只留 `tool-subagent-codex` `disabled: true`。旧 Agent Note「Keep dormant providers in the base bundle」已被 `2026-08-12-production-dsh-excludes-product-subagent-providers` 取代，不能再当组合真源。

## e-subagent-fork

# uncertainty · E · subsys.orchestration.subagent-fork

- **shipped fork 的 `backgroundMode` 意图**：`packages/bundle/base/cordis.patch.yml` 的 host 行 `id: tool-subagent-fork` 是 `backgroundMode: one-shot`。三个 shipped preset（`standard` / `code` / `cordis`）把同一 `id` 写成 `continuable`。`packages/subagent/subagent-fork-in-process/src/index.ts` 的 `prepareContinuable` 上方 TODO 仍写「no shipped composition calls this — they bind fork to `backgroundMode: one-shot`」。三处同时存在；哪一份是当前产品意图未核。本页两边都写，不把 host 默认抄成 preset 行为。

## e-terminal

# uncertainty · subsys.execution.terminal

- **官方 README 与代码冲突（inject 键名）。** `packages/terminal/terminal-bash/README.md` / `README.zh.md` 写插件 inject `pty`、`sandboxPolicy`、`subprocess`。可加载源是 `export const inject = ['terminals', 'sandboxPolicy', 'subprocess']`（`packages/terminal/terminal-bash/src/index.ts`），Loader 单测钉死同一数组（`packages/terminal/terminal-bash/tests/index.spec.ts`）。wiki 跟代码：键名是 `terminals`。`pty` 只是 `minimal` / E2B overlay 里那一行的 yml `id`，不是 Cordis service 名。

## g-attachment

# uncertainty · attachment

- **attachment-local README 写「读取也完整 decode」，源码读路径只 `probeImage`。** `packages/attachment/attachment-local/README.md` / `README.zh.md` 说 write admission **and reads** fully decode the raster。`packages/attachment/attachment-local/src/store.ts` 的 `readImageFile` 在 digest 对上之后调用 `probeImage`；`packages/attachment/attachment-local/src/image.ts` 的 `probeImage` 明确只解析 header（`limitInputPixels: false` 的 `metadata()`），注释写不再付完整 raster decode。wiki 跟代码：准入 `detectImage` + `raw().toBuffer()`，重放 `probeImage`。
- **`store.spec.ts` 标题写 stricter limits，body 不改限额。** `it('keeps admitted history readable after deployment limits become stricter')`（`packages/attachment/attachment-local/tests/store.spec.ts` :137）对 `saveImageFile(..., LIMITS)` 再用 `readImageFile(root, ref)` 读回同一份 `LIMITS` 产出的 ref。`readImageFile` 签名没有 `ImageAttachmentLimits`，这条测试不能证明部署后收紧 `maxImagePixels` 旧对象仍可读。该命题只是签名推论，页内标 `[I]`。

## g-projection

# uncertainty · projection

- **`projectionCacheDomainSpec` 注释写「version bump 丢整份 medium」，json backend 实际是拒开。** `packages/session/session-projection-cache/src/spec.ts` 在 `version: 3` 旁写 cache 语义：stale / 不可读只让下次 tail 更长。`packages/storage/storage-json/src/format.ts` 对 `stored version != expected` 抛 `version-mismatch`；`SessionProjectionCache` 的 `Service.init` 直接 `storageDomain.open(projectionCacheDomainSpec)`，没有把 mismatch 收成空盘重建。wiki 只钉 domain 名为 `session_projcache`、version 为 3、行级过期靠 unit `stateVersion`；介质 version 不匹配时插件会不会起不来，留给 storage 页与实装验证。

## h-approval

# uncertainty · subsys.interaction.approval

- **`setApprovalPolicy` JSDoc 写 sole durable representation，delegation 另有一条 append。** `packages/interaction/user-approval/src/index.ts` 的 `setApprovalPolicy` 注释称它是会话 override 的 sole durable representation。`packages/subagent/subagent/src/child-agent.ts` 的 `appendDelegatedPolicyOverrides` 直接 `session.append('approval/policy', { policy, source: 'delegation' })`，不经该函数，也不经 `ApprovalService.setPolicy`。wiki 跟两条可执行路径：pin / `set(session)` 走 `setApprovalPolicy`（无 `source`）；live `/permission` 走 `setPolicy`（无 `source`，另 `inject` 通知）；delegation 带 `source: 'delegation'`。`effectiveApprovalPolicy` 不区分 `source`。

## h-user-questions

# uncertainty · user-questions

- **官方 README 把 permission plugin 写成调用方，shipped 源码没有这条边。** `packages/interaction/user-questions/README.md` 开篇写：`ctx.userQuestions` 是「model-facing tool or permission plugin」在需要问人时用的服务。本仓 `packages/interaction/permission-presets/` 与其它 permission 包不 `import` / 不 `ctx.get('userQuestions')`。生产 Consumer 是 `@deepseek-ai/dsh-tool-ask-user`（`ask_user_question`）和 `@deepseek-ai/dsh-plan-mode`（`exit_plan_mode` 里 `ctx.get('userQuestions')`）。wiki 跟代码，页内标 `[U]`。

## i-hmr

# uncertainty · client-hmr

- **官方 client-modules 页与 web-app patch 冲突。** `docs/subsystems/client-modules.md`（及 `.zh.md`）写 production graphs omit the HMR row。`packages/bundle/web-app/cordis.patch.yml` 无条件 `insert` `id: client-hmr`。wiki 跟代码：行始终在树上；没有 rebuild watcher 时 poll 空闲。不把官方页当 `[E]`。

- **伴随 invariant 的可观测量过时。** `packages/client/hmr/src/invariant.ts` 用 `process.getActiveResourcesInfo()` 里的 `StatWatcher` 数作为「bundle stat watcher 必须随 fiber 死掉」的代理，注释仍写 `fs.watchFile`。现行 `packages/client/hmr/src/index.ts` 的监视是 `setInterval` + `statSync`，不会产生 `StatWatcher`。行为测试（`node-half.client.spec.ts` dispose 后再写文件不再 `rebuilt`）仍成立；invariant 在当前实现上几乎是空核。

## i-ui-layout

# uncertainty · subsys.client.ui-layout

- **官方 README 仍写第四个子槽是 `conversation.empty`。** `packages/client/ui-layout/README.md` / `README.zh.md` 说 `register` 进 `'root'` 后声明 `sidebar` / `conversation` / `details` / `conversation.empty`。源码 `packages/client/ui-layout/src/client/index.ts` 的 `children` 表第四项是 `'shell.overlay': { kind: 'list', scope: 'root' }`，SlotMap 同期合并也是这四个键。`AppFrame` 的测试 stub 仍能接到 `conversation.empty` 这个 key，但生产 `renderSlot` 只点名那四个声明键。wiki 跟代码。

- **`apply.client.spec.ts` 只钉三个子槽 spec。** 「provides ctx.layout and registers AppFrame…」用例断言 `sidebar` / `conversation` / `details`，注释写 “three child declarations”，没有 `slots.spec('shell.overlay')`。ledger 里仍有第四个 list 声明；wiki 跟 `register` 实参。

- **runtime `SlotMap['root']` 注释称动态条目会被赋更低 priority 从而赢。** `packages/client/runtime/src/client/slots.ts` 的 JSDoc 说 second entry shadows、dynamically registered entry 被 assign 更低 priority。`SlotCore.register` 只在相同 `priority`（缺省 0）抛 `already has a registration`；没有检索到自动改 priority 的赋值。阴影要调用方显式传更低 `priority`。wiki 跟可执行合同，不跟那句 JSDoc 的自动赋值。

## k-python

# uncertainty · surface.sdk.python

- **官方 README 把默认孩子简写成 `dsh-jsonrpc-agent`。** `python/sdk/README.md` 写 bundled single-file `dsh-jsonrpc-agent`。`HarnessClient._default_launch_args` 没有这个字面量：无 `runtime_bin` / `bridge_bin` / `launch_args_override` 时调用 `deepseek_harness_runtime.resolve_bundled_launch_args()`，exe mode 的 argv[0] 是 `runtime/dsh-jsonrpc-agent-pkg-<plat>-<arch>`。wiki 跟 `client.py` / `sdk-runtime` 解析路径。

## l-capability-seams

# uncertainty · ref.capability-seams

官方 `docs/capability-seams.md`（`scripts/gen-doc-graphs.ts` 的 `SERVICE_ROLES`）与冻结源码的漂移；wiki 跟代码。

- `ctx.lsp` implementations 写成 `lsp-local`。`packages/lsp/` 只有 `lsp` / `lsp-stdio` / `tool-lsp`，npm 名 `@deepseek-ai/dsh-lsp-stdio`。
- `ctx.codeRuntime` implementations 写成 `code-runtime-worker`。真实包是 `@deepseek-ai/dsh-code-runtime-worker-thread`（web-app / headless 插入行）。
- `ctx.shell` implementations 列出 `bash-local` / `bash-sandbox` / `pwsh-local`，漏了 base 默认 win32 行 `@deepseek-ai/dsh-pwsh-sandbox`。
- `ctx.attachments` consumers 写 `host-runtime`。冻结树无此包；`inject`/`ctx.attachments` 落在 `dsh-host-apiproxy`、`dsh-llm-pi-ai`、`dsh-tool-fs`（`read_image`）。
- `ctx.approval` implementations 写 `acp`。`ApprovalService` 自己 `super(ctx, 'approval')`；ACP 是 `approval/request` waterfall 应答者，不占该键。
- `ctx.pluginInventory`（`PluginInventoryGateway` / web-app `plugin-inventory`）是真实 `super(ctx, 'pluginInventory')`，官方 `svc_*` 表没收。
- `storageDomain` 用 `ctx.provide` 挂 `DomainFacility`，不是 `Service.super`。官方仍画 `svc_storageDomain`，本页按 provide 行落地。

## l-ctx-keys

# uncertainty · ref.ctx-keys

- `launcherSessionQueryPath` / `SESSION_QUERY_SQLITE_PATH_KEY` 在 `packages/session-query/session-query-sqlite/src/index.ts` 声明并导出，冻结树没有任何产品 `ctx.provide` / `ctx.get` / `ctx.launcherSessionQueryPath` 读取。默认 web 用 row `config.path`。wiki 按声明收行，标「无产品 provide」。
- `configuredAgentIdentities` 只在 `agent-loop` 声明 + 测试 `provide`；`apps/cli` 不写。产品 CLI 靠 row 上的 `sessionId` / `resumeSessionId`。wiki 按声明收，标「dsh 不 provide」。
- `pluginInventory` 只有 `super(ctx, 'pluginInventory')`，没有 `interface Context` merge。Typert Remote 仍按这个服务键走。wiki 按 provide/super 收。
- 官方 `docs/capability-seams.md` 把 `ctx.terminals` / `ctx.lsp` / `ctx.e2b` / `ctx.invariants` 画进产品缝图。源码：`dsh-base` + `dsh-web-app` + shipped `standard`/`code`/`cordis` **都不**挂 terminal / lsp / e2b / invariants 行。`terminals` 只在 `minimal` 的 isolate 组。wiki 跟 yml，不把它们写成默认 `dsh web` 已装。
- 官方主表约 56 个 `ctx.*`，不含 launcher/provide-only 键（`dshHomePath` / `cmdlineArgs` / `appExit` / `webStartup` / `storage.backend.*` 等）和整张 client 表。catalog 跟源码补，不当官方遗漏去改代码。

## l-glossary

# uncertainty · ref.glossary

- 官方 `docs/glossary.md` 的 **scope** 仍写 “Two levels, flat: scoped registrations do not inherit down to subagents”。源码 `packages/core/scope/src/index.ts` 有 `bindScopeParent` / `scopeParents`：preset standing mount 是 agent key 的 parent，事件沿链向上，registry view 沿链向下。`composeFrom` 把子 agent 绑到**同一** standing key，子 agent 仍看不见父 agent 自己的 layer（这一层符合 “不 inherit 到 subagent”）。wiki 跟源码链，不跟官方 “flat” 字面。
- 官方 glossary 未收 profile / bundle / isolate / host 面 / Code Mode / 两个 `bash` / 无 shipped TUI。这些按源码补进 `reference/glossary.md`。
- `packages/subagent/subagent-fork-in-process/src/index.ts` 注释写 shipped 把 fork 绑成 `backgroundMode: one-shot`；四个 shipped 里 standard/code/cordis 的 `tool-subagent-fork` 实际是 `backgroundMode: continuable`。本页只钉 `toolName` + `inheritsParentContext`，不把 one-shot 写成 shipped 事实。

## l-tools-catalog

# uncertainty · ref.tools-catalog

- 官方 `docs/tool-catalog.md` 对 `@deepseek-ai/dsh-tool-cordis` 写 “Not in any shipped tree”。冻结树 `apps/cli/config/agent-presets/cordis/agent.cordis.yml` 有 `id: tool-cordis` / `name: '@deepseek-ai/dsh-tool-cordis'`。wiki 跟四个 `agent.cordis.yml`，不跟官方 deployment note。
- 官方 tool-web 节按包默认 Config（`fetch: true`）列出 `web_fetch`。`standard` / `code` / `cordis` 三份 yml 都写 `config.fetch: false`，`apply` 因此不调用 `applyWebFetchTool`。wiki 把 shipped 列标成「包装·fetch关」，不把出厂 Web 产品写成模型看得到 `web_fetch`。
- 官方 `list_agents` 行写 Requires `ctx.sessionProjections`。源码 `packages/subagent/tool-subagent-control/src/list-agents.ts` 的 `inject` 是 `['tools', 'subagents', 'agents']`，文件内无 `sessionProjections`。wiki 跟 `inject`。

## t1-preset-overview

# uncertainty · surface.presets.overview

- `cordis_mount` 只出现在 `apps/cli/config/agent-presets/cordis/agent.cordis.yml` 头注释与 skill 文案。`@deepseek-ai/dsh-tool-cordis` 当前登记的是 `cordis_inspect_list` / `cordis_inspect_query` / `cordis_inspect_self` / `cordis_define` / `cordis_run` / `cordis_stop` / `cordis_undefine`。旧 wire 名是否还在别的包里当 alias，未核。

## t1-preset-surface.presets.cordis

---
id: uncertainty.t1.surface.presets.cordis
status: open
updated: 47f943859b
---

# Uncertainty · surface.presets.cordis

## `cordis_mount` 名字与可执行工具集不一致

- **claim**: yml 头注释与 bundled skill `editing-cordis-compositions/SKILL.md` 仍写 `cordis_mount` / `cordis_unmount`（对 live runtime 求值模型 JS、探完再卸）。
- **code**: `packages/extensions/tool-cordis/src/index.ts` 登记的是 `cordis_inspect_{list,query,self}` / `cordis_define` / `cordis_run` / `cordis_stop` / `cordis_undefine`。全仓 `.ts` / `.yml` 里 `cordis_mount` 只出现在 `apps/cli/config/agent-presets/cordis/agent.cordis.yml` 的 `# TRUST:` 注释。
- **stance**: TRUST（模型 JS 连真实 runtime，本 preset ≈ shell access）由 `evaluateHostCode` + `CORDIS_SYSTEM_PROMPT` 成立。把当前模型可见动词叫 `cordis_mount` 标 `[U]`。
- **page**: `surface/presets/cordis.md` 把注释当 `[I]`，把 `tool-cordis` 行与 `evaluateHostCode` 当 `[E]`。

