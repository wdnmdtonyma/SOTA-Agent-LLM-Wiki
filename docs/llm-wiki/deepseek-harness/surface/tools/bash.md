---
id: surface.tools.bash
title: bash 一次性执行
kind: tool
tier: T1
pkg: execution
source:
  - packages/shell/tool-bash/package.json
  - packages/shell/tool-bash/src/index.ts
  - packages/shell/tool-bash/src/background.ts
  - packages/shell/tool-bash/src/render.ts
  - packages/shell/tool-bash/tests/tools.spec.ts
  - packages/shell/tool-bash/tests/integration.spec.ts
  - packages/shell/shell/src/index.ts
  - packages/shell/bash-local/src/index.ts
  - packages/shell/bash-sandbox/src/index.ts
  - packages/shell/shell-env/src/index.ts
  - packages/shell/tool-bash-persistent/src/index.ts
  - packages/sandbox/sandbox/src/escalation.ts
  - packages/sandbox/sandbox/src/index.ts
  - packages/core/tools/src/index.ts
  - packages/core/tools/src/schema.ts
  - packages/jobs/jobs/src/view.ts
  - packages/util/timeout/src/index.ts
  - packages/guard/timeout-policy/src/index.ts
  - packages/interaction/user-approval/src/index.ts
  - packages/subprocess/subprocess/src/types.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/web-app/presets/minimal.patch.yml
  - packages/bundle/web-app/presets/standard.patch.yml
  - packages/bundle/web-app/presets/ptc.patch.yml
  - packages/bundle/web-app/presets/cordis.patch.yml
symbols:
  - name
  - apply
  - inject
  - Config
  - processOutcome
  - renderResult
  - renderJobRead
  - LocalBashExecutor
  - ShellExecutor
related:
  - spine.tool-call-anatomy
  - ref.tools-catalog
  - surface.tools.bash-persistent
  - subsys.execution.shell
evidence: explicit
status: verified
updated: 477b4f4205
---

> 模型可见名 `bash`；实现包 `@deepseek-ai/dsh-tool-bash`（Cordis 插件名 `tool-bash`）。每次调用新开 `bash -c`，走 `ctx.shell.execute` 的 one-shot 执行器，**不**记忆 cwd / 变量 / 函数。

## 能回答的问题

- 模型目录里的 `bash` 到底是 `@deepseek-ai/dsh-tool-bash` 还是 `@deepseek-ai/dsh-tool-bash-persistent`？
- 默认 Config 下模型能看见哪些参数？`run_in_background` / `sandbox_permissions` 何时从 schema 消失或出现？超时后会不会变成 job？
- 前台输出如何截断、spill 到哪？非零退出是不是 `isError`？
- `ctx.shell`、`ctx.shellEnv`、`ctx.jobs`、`ctx.sandboxPolicy` 各自给本工具提供什么？换 provider 会带走哪一段？
- `minimal` / `standard` / `ptc` / `cordis` 四个 shipped preset 谁装本包？win32 怎样 `disabled`？
- 一次 `execute()` 怎样分前台 `ctx.shell.execute`、后台 `ctx.jobs.start`、以及 body 内 `approveEscalation`？

## Identity

Wire 名是 `bash`，写在 `defineTool({ name: 'bash', ... })`。[E: packages/shell/tool-bash/src/index.ts:372] Cordis 插件导出名是 `tool-bash`，实现包是 `@deepseek-ai/dsh-tool-bash`。[E: packages/shell/tool-bash/src/index.ts:33] [E: packages/shell/tool-bash/package.json:2] 工厂是 `apply(ctx, config = {})`：读 `Config.enableRunInBackground`（schema 默认 `true`，裸 `{}` 再 `?? true`）和 `Config.promoteOnTimeout`（同样默认 `true`，且必须后台可用才生效），然后按 `ctx.jobs` 是否在场注册前台-only 或 job-backed 定义。[E: packages/shell/tool-bash/src/index.ts:57] [E: packages/shell/tool-bash/src/index.ts:209] [E: packages/shell/tool-bash/src/index.ts:212]

`inject` 是 `['tools', 'shell', 'systemPrompt', 'shellEnv']`。没有 `ctx.shell` 时插件挂起，catalog 里不会出现 `bash`。[E: packages/shell/tool-bash/src/index.ts:34] [E: packages/shell/tool-bash/tests/tools.spec.ts:459]

另有一个**同名不同包**：`@deepseek-ai/dsh-tool-bash-persistent` 也 `defineTool({ name: 'bash' })`，但走 `ctx.terminals` 的 owner-scoped PTY，状态跨调用持久。本页只写 one-shot 包；持久页是 [bash-persistent.md](bash-persistent.md)。[E: packages/shell/tool-bash-persistent/src/index.ts:414] [E: packages/shell/tool-bash-persistent/src/index.ts:440]

`apply()` 还往 `ctx.systemPrompt` 登记 section `tool:bash`（`order: ctx.systemPrompt.getSectionOrder('TOOL_BASH')`），正文只要求模型检查 `[exit code: N]`。[E: packages/shell/tool-bash/src/index.ts:258] [E: packages/shell/tool-bash/src/index.ts:260] [E: packages/shell/tool-bash/tests/tools.spec.ts:440]

## 用途定位

本工具让模型执行**一条** bash 命令并拿回 stdout/stderr。描述字符串写明：每次调用是新 shell，cwd / 变量 / 函数不跨调用；要用 `workdir`，不要靠 `cd` 留下状态。[E: packages/shell/tool-bash/src/index.ts:91] 执行器把命令落成 argv `['bash', '-c', spec.command]`。[E: packages/shell/bash-local/src/index.ts:188]

有 job registry 时，**每一次**调用都在 spawn 前 `jobs.start({ kind: 'bash', ... })`：`run_in_background: true` 立刻回 `jobId`；前台则 `wait` 到结束或超时。超时且 `promoteOnTimeout` 为真时，命令继续当 background job 跑，模型拿到 `kind: 'promoted'` 而不是被杀掉。[E: packages/shell/tool-bash/src/index.ts:275] [E: packages/shell/tool-bash/src/index.ts:507] [E: packages/shell/tool-bash/src/index.ts:350] 没有 registry 时工具是 foreground-only，执行器 deadline 杀进程。[E: packages/shell/tool-bash/src/index.ts:407]

它**不是** persistent PTY，也**不是** first-class `apply_patch`。文件改动靠 `edit` / `write` 或命令自己的重定向。

## 输入 schema

以插件默认 `Config`（`enableRunInBackground: true`、`promoteOnTimeout: true`）boot、且 **已组成 `ctx.jobs`**、`ctx.shell.sandboxMode === undefined`（`LocalBashExecutor` 不覆盖该 getter）为准。必填只有 `command` + `description`；`run_in_background` 在 properties 里。[E: packages/shell/tool-bash/tests/tools.spec.ts:392] [E: packages/shell/tool-bash/tests/tools.spec.ts:399] [E: packages/shell/shell/src/index.ts:74]

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---|---|---|---|
| `command` | `string` | 是 | 无 | trim 后非空 | 交给 `bash -c` 的命令。[E: packages/shell/tool-bash/src/index.ts:375] [E: packages/shell/tool-bash/src/index.ts:74] |
| `description` | `string` | 是 | 无 | trim 后非空 | UI 标题用的 5–10 词主动语态说明；不进执行器。[E: packages/shell/tool-bash/src/index.ts:376] [E: packages/shell/tool-bash/src/index.ts:77] |
| `timeoutMs` | `number` | 否 | schema 无默认；由 executor `resolve()` 填 | 有值则必须是正有限数；再被 `clampTimeout` 封顶 | 前台等待毫秒。job-backed 且 `promoteOnTimeout` 时，到期把命令挪到后台而不是杀掉。[E: packages/shell/tool-bash/src/index.ts:383] [E: packages/shell/tool-bash/src/index.ts:80] |
| `workdir` | `string` | 否 | session workspace（见 `resolveWorkdir`） | 相对路径相对 session cwd / policy root | 本调用工作目录。[E: packages/shell/tool-bash/src/index.ts:389] |
| `run_in_background` | `boolean` | 否 | 不传 = 前台 | 仅当 `enableRunInBackground` 为真 **且** `ctx.jobs` 在场时广告 | `true` 立刻回 job id；描述写 No timeout applies。[E: packages/shell/tool-bash/src/index.ts:391] |

`defineTool` 先按 ParameterSchemaSpec 校验类型 / required；空串、`timeoutMs <= 0` 这类值约束在 `validateBashArgs`。[E: packages/core/tools/src/schema.ts:599] [E: packages/shell/tool-bash/tests/tools.spec.ts:372]

**Config 改广告：** `enableRunInBackground: false` 时 properties 只剩 `command` / `description` / `timeoutMs` / `workdir`；execute 里再拒一次 `run_in_background: true`。[E: packages/shell/tool-bash/tests/tools.spec.ts:649] [E: packages/shell/tool-bash/src/index.ts:499] 没有 `ctx.jobs` 时同样不广告 `run_in_background`，timeout 文案改成 “kills the command on expiry”。[E: packages/shell/tool-bash/tests/tools.spec.ts:407]

**`ctx.shell.sandboxMode` 改广告：** getter 有值（shipped `SandboxBashExecutor` 读 `ctx.sandboxPolicy.defaultMode`）时，schema 追加 `sandbox_permissions`（`enum` = `ESCALATION_TARGETS` = `workspace-write` \| `danger-full-access`）和 `justification`。两个字段必须成对且 justification trim 非空。[E: packages/shell/tool-bash/src/index.ts:214] [E: packages/shell/bash-sandbox/src/index.ts:76] [E: packages/sandbox/sandbox/src/escalation.ts:41]

无沙箱执行器时这两个键不广告；schema 只校验已广告键，所以模型仍可能塞进来，execute 会抛「sandbox_permissions is not available in this composition」。[E: packages/shell/tool-bash/src/index.ts:241]

**executor 侧数字（不是模型 schema 默认）：** `LocalBashExecutor` 的 `timeoutMs` 默认 `120_000`，`maxTimeoutMs` 默认 `600_000`，`maxOutputBytes` 默认 `64_000`。[E: packages/shell/bash-local/src/index.ts:102] [E: packages/shell/bash-local/src/index.ts:103] [E: packages/shell/bash-local/src/index.ts:104] 有效超时是 `min(requested ?? def, max)`。[E: packages/util/timeout/src/index.ts:45] shipped host `bash-sandbox` 行把 `timeoutMs` 配成 `60000`。[E: packages/bundle/base/cordis.patch.yml:238]

`stdin` / `env` / `stdoutMaxBytes` **不是**模型参数。工具按具名字段组 `ShellExecRequest`，多出来的键不会 forward 进 executor。[E: packages/shell/tool-bash/tests/tools.spec.ts:1413]

## 输出 & 截断 / spill

`output.schema` 是 `oneOf`：后台 `{ kind: 'background', jobId }`，超时晋升 `{ kind: 'promoted', jobId, timeoutMs, output }`，或前台 `{ kind: 'foreground', exitCode, signal, timedOut, aborted, timeoutMs, stdout, stderr, sandbox? }`。[E: packages/shell/tool-bash/src/index.ts:408] [E: packages/shell/tool-bash/src/index.ts:418] [E: packages/shell/tool-bash/src/index.ts:428]

`output.render`：后台渲染 `started background job ${jobId}`；晋升走 `renderPromoted`；前台走 `renderResult`。[E: packages/shell/tool-bash/src/index.ts:471] [E: packages/shell/tool-bash/src/index.ts:474] 集成测试钉死前台成功文本是 `integration-ok\n`，后台 ack 是 `started background job bash-1`。[E: packages/shell/tool-bash/tests/integration.spec.ts:140] [E: packages/shell/tool-bash/tests/integration.spec.ts:199]

`renderResult` 把 stdout 与带 `[stderr]` 标记的 stderr 拼成 body；全空则 `(no output)`。截断流在尾部追加 `[output truncated; full output: <spillPath|(unavailable)>]`。[E: packages/shell/tool-bash/src/render.ts:14] [E: packages/shell/tool-bash/src/render.ts:41] 标记顺序：沙箱拒绝（可选 escalation hint）→ `[timed out after Nms]` → 可选 `[stopped: …]` → `[killed by signal: X]` 或非零 `[exit code: N]`。[E: packages/shell/tool-bash/src/render.ts:53] [E: packages/shell/tool-bash/src/render.ts:60] 非零退出**不是** `isError`；spawn / abort 才是。[E: packages/shell/tool-bash/tests/tools.spec.ts:277] [E: packages/shell/tool-bash/tests/integration.spec.ts:153]

晋升文本是 `[still running after Nms; moved to background job id]`，并告诉模型用 `job_output` / `job_kill`。[E: packages/shell/tool-bash/src/render.ts:81]

每流内存预算默认 `maxOutputBytes`（64000）；溢出写 spill，spill 文件再受 `maxSpillBytes`（默认 64 MiB）限制。[E: packages/shell/bash-local/src/index.ts:38] [E: packages/shell/bash-local/src/index.ts:104] 后台 / 晋升的 `job_output` 走 `renderJobRead`：lossy 时追加 `[some output was dropped from memory; full output: ...]`。[E: packages/shell/tool-bash/src/render.ts:108]

`presentCall` / `presentResult` 只服务 UI：前台是 `card: 'terminal'`，后台 ack 是 generic console fence；`parseExitStatus` 把末行 exit/signal marker 抽成 pill。模型看到的仍是 `output.render` 文本。[E: packages/shell/tool-bash/src/index.ts:116] [E: packages/shell/tool-bash/src/index.ts:139]

## 背后的 seam

| 角色 | 实体 | 本工具怎么用 |
|---|---|---|
| Definition | `ShellExecutor` / `ctx.shell` | `super(ctx, 'shell')`；`resolve` / `execute`（返回 `ShellExecution` handle）。[E: packages/shell/shell/src/index.ts:65] [E: packages/shell/shell/src/index.ts:93] |
| Provider（本地） | `LocalBashExecutor` | `inject = ['subprocess']`；`bash -c`；不 confine，`sandboxMode` 继承为 `undefined`。[E: packages/shell/bash-local/src/index.ts:98] |
| Provider（shipped） | `SandboxBashExecutor` | `inject = ['subprocess', 'sandbox', 'sandboxPolicy']`；覆盖 `sandboxMode`；`ctx.sandbox.confine(['bash', '-c', command], policy)`。[E: packages/shell/bash-sandbox/src/index.ts:45] [E: packages/shell/bash-sandbox/src/index.ts:188] |
| Consumer | `@deepseek-ai/dsh-tool-bash` | `ctx.shell.resolve` + `execute`；广告与升权看 `ctx.shell.sandboxMode`。 |

换掉 `ctx.shell` provider 会带走：默认/封顶超时、cwd 回退、`bash -c` vs 别的 argv、是否 confine、前台 runner 失败是抛 `SandboxUnavailableError` 还是普通 spawn 错。工具代码本身不选 runner。

其它消费：

- `ctx.shellEnv.collect(exec)` 组本调用的受管 `DSH_*`（前缀 `DSH_`）。内置至少 `DSH_HOME`、`DSH_SHELL=1`，有 agent 再加 `DSH_SESSION_ID`。[E: packages/subprocess/subprocess/src/types.ts:13] [E: packages/shell/shell-env/src/index.ts:156] [E: packages/shell/shell-env/src/index.ts:159]
- `ctx.inject(['jobs'])`：后台 / 超时晋升才用 registry。缺服务就走 foreground-only 定义，不静默改前台。[E: packages/shell/tool-bash/src/index.ts:544]
- `ctx.get('sandboxPolicy')`：执行器 confine 时必须存在，否则 `apply()` 直接抛。[E: packages/shell/tool-bash/src/index.ts:216]
- `ctx.get('approval')`：只在 body 内 `approveEscalation` 用，不经过 `tools/pre-execute` 的 `ask`。[E: packages/shell/tool-bash/src/index.ts:247]

`jobs.start` 的 `kind: 'bash'` 是 `JobKindMap` 的声明合并项，id 前缀因此是 `bash-N`。[E: packages/jobs/jobs/src/view.ts:33] [E: packages/shell/tool-bash/src/index.ts:276]

## 执行管线

`ctx.tools.execute` 走 `tools/pre-execute` →（可选 `serviceAsk`）→ 单调 guard → `tools/execute` waterfall（叶子 `ToolDefinition.execute`）→ `tools/post-execute`。[E: packages/core/tools/src/index.ts:1507] [E: packages/core/tools/src/index.ts:1565] [E: packages/core/tools/src/index.ts:1782] 本工具**不**自己挂 pre-execute listener。

对本工具的挂点：

- **timeout（工具定义）：** `defineTool` **没有**设 `timeoutMs`。`dsh-tool-call-timeout-policy` 读到 `undefined` 就原样 `next()`。[E: packages/guard/timeout-policy/src/index.ts:57] [E: packages/guard/timeout-policy/src/index.ts:59] 真正的前台超时在 `LocalBashExecutor.executeArgv` 的 `deadline(..., spec.timeoutMs, 'BASH_TIMEOUT')`；job-backed 前台则用 `onExpiry: 'none'` 把墙钟交给 `jobs.wait`。[E: packages/shell/bash-local/src/index.ts:216] [E: packages/shell/tool-bash/src/index.ts:515]
- **approval：** 普通调用不 `ask`。升权在 body 开头 `approveEscalation`；唯一放行值 `'allowed-once'`。[E: packages/sandbox/sandbox/src/escalation.ts:202] host `ApprovalPolicy` 是 `'ask' | 'never'`。[E: packages/interaction/user-approval/src/index.ts:67]
- **sandbox：** 不挂 pre-execute。policy 在 body 里 `sandboxPolicy.resolve({ session })`；confine 在 `SandboxBashExecutor`。runner 不可用抛 `SandboxUnavailableError`（`code: SANDBOX_UNAVAILABLE`），拒绝裸跑。[E: packages/sandbox/sandbox/src/index.ts:125] [E: packages/sandbox/sandbox/src/index.ts:132] [E: packages/shell/bash-sandbox/src/index.ts:122]
- **并行：** 未声明 `isConcurrencySafe`，`executionMode` fail-closed 为 exclusive。[E: packages/core/tools/src/index.ts:1305]
- **PTC：** `ptc` preset 仍装本包，但 `mode: ptc` 时无 `parent` 的模型直调 `bash` 在进 waterfall 前 `collapses`，必须从 `run_code` 程序里调。[E: packages/bundle/web-app/presets/ptc.patch.yml:147] [E: packages/core/tools/src/index.ts:1352]

## Preset 装配

成员资格只认 `packages/bundle/web-app/presets/{minimal,standard,ptc,cordis}.patch.yml`。四个 shipped 文件里，本包行都**没有** `isolate:`，也**没有**改 `enableRunInBackground`（保持插件默认 `true`）。

| preset | 装 `@deepseek-ai/dsh-tool-bash`？ | `disabled` | isolate |
|---|---|---|---|
| `minimal` | **否**。同名 `bash` 来自 `@deepseek-ai/dsh-tool-bash-persistent` | — | 本包未出现。persistent 行在 `isolate.terminals: true` 组里 [E: packages/bundle/web-app/presets/minimal.patch.yml:21] [E: packages/bundle/web-app/presets/minimal.patch.yml:30] |
| `standard` | 是 | `!!js process.platform === 'win32'` [E: packages/bundle/web-app/presets/standard.patch.yml:20] [E: packages/bundle/web-app/presets/standard.patch.yml:22] | 无。顶层 consumer 行，好让 `ctx.get('jobs')` 看见 host 上的 registry |
| `ptc` | 是（工具行仍在；呈现改成 PTC `run_code`） | 同 standard [E: packages/bundle/web-app/presets/ptc.patch.yml:20] [E: packages/bundle/web-app/presets/ptc.patch.yml:22] | 无 |
| `cordis` | 是 | 同 standard [E: packages/bundle/web-app/presets/cordis.patch.yml:23] [E: packages/bundle/web-app/presets/cordis.patch.yml:25] | 无 |

组合旁注（不是 preset 成员资格）：`dsh-base` 也 insert 了 host 行 `tool-bash`（同样 win32 disabled），并挂 `bash-sandbox`（`timeoutMs: 60000`）。[E: packages/bundle/base/cordis.patch.yml:266] [E: packages/bundle/base/cordis.patch.yml:238] `dsh-web-app` overlay 把 host `tool-bash` 设 `disabled: true`，改由每个 session 的 preset remount。[E: packages/bundle/web-app/cordis.patch.yml:448] shipped profiles 里只有 `web` 叠四份 preset patch；`headless` / `sdk` / `acp` 仍吃 base 的 host `tool-bash` 行，`sdk-minimal` 装的是 persistent bash 而非本包。

win32 上本包 disabled；同预设改挂 `@deepseek-ai/dsh-tool-pwsh`（`disabled: !!js process.platform !== 'win32'`）。那是另一页。

## execute() 走读

1. `defineTool` 包装的 `execute` 先 `validate`（schema 违规抛 `ToolArgsError`），再进用户 `execute`。[E: packages/core/tools/src/schema.ts:599]
2. `validateBashArgs@packages/shell/tool-bash/src/index.ts`：空 `command` / `description`、非正 `timeoutMs`、不成对的 escalation 参数直接抛。[E: packages/shell/tool-bash/src/index.ts:73] [E: packages/shell/tool-bash/src/index.ts:87]
3. `resolveSandboxPolicy`：有 agent 则 `sandboxPolicy.resolve({ session })`，否则 `{}`（部署默认）。[E: packages/shell/tool-bash/src/index.ts:220]
4. 两个 escalation 字段都在时，**任何 spawn 之前** `approveBashEscalation` → `approveEscalation({ subject: 'command' }, { toolName: 'bash', ... })`。无沙箱执行器、非严格更宽、无 approval、无 agent、`rejected` / `cancelled` / `unavailable` 都抛，body 尚未跑。[E: packages/shell/tool-bash/src/index.ts:244] [E: packages/sandbox/sandbox/src/escalation.ts:171] [E: packages/sandbox/sandbox/src/escalation.ts:178]
5. 批准后只覆盖 `policy.mode`；`resolveWorkdir` 仍用 **standing** `workspaceRoot`（不是升权后的根）。相对 `workdir` 拼在 session cwd / policy root 上；绝对路径原样用。[E: packages/shell/tool-bash/src/index.ts:488] [E: packages/shell/tool-bash/src/index.ts:148]
6. `dshEnv = ctx.shellEnv.collect(exec)`，request 只带 `command` / 可选 `workdir` / 可选 `timeoutMs` / `dshEnv` / 可选 `sandboxPolicy`。[E: packages/shell/tool-bash/src/index.ts:489]
7. **后台** `run_in_background === true`：检查开关与 `ctx.jobs`；`exec.signal.aborted` 则 `TOOL_ABORTED`（升权之后、spawn 之前也能拦住）。`startJob` 的 `run()` 里才 `ctx.shell.execute({ ...spec, signal })`；`onExpiry: 'none'`。返回 `{ kind: 'background', jobId }`。[E: packages/shell/tool-bash/src/index.ts:497] [E: packages/shell/tool-bash/src/index.ts:507] `processOutcome`：`killed` 带 signal 细节，其它（含非零退出）是 `completed`。[E: packages/shell/tool-bash/src/background.ts:50] [E: packages/shell/tool-bash/src/background.ts:52]
8. **job-backed 前台**（有 jobs 且 `promoteOnTimeout`）：同样 `startJob` + `onExpiry: 'none'`，再 `waitOnJob`。等到超时且进程已起来 → `{ kind: 'promoted', jobId, ... }`；等到 settle → `{ kind: 'foreground', ... }`。admission 被拒则退回 deadline-kill 前台。[E: packages/shell/tool-bash/src/index.ts:514] [E: packages/shell/tool-bash/src/index.ts:349] [E: packages/shell/tool-bash/src/index.ts:522]
9. **无 jobs 前台** `ctx.shell.execute(ctx.shell.resolve({ ...request, signal: exec.signal }))`，再 `foreground.result()`。[E: packages/shell/tool-bash/src/index.ts:524] `result.aborted` 转 `TOOL_ABORTED`；否则 `kind: 'foreground'` + `canonicalBashResult`。[E: packages/shell/tool-bash/src/index.ts:526] [E: packages/shell/tool-bash/src/index.ts:527]
10. 执行器：`resolve` 填 cwd（`request.workdir ?? config.cwd ?? process.cwd()`）并 `clampTimeout`。[E: packages/shell/bash-local/src/index.ts:122] 前台 `onExpiry: 'kill'` 走 `deadline` + `bash -c`；后台 / 晋升路径 `onExpiry: 'none'` 不把 `timeoutMs` 送进 timer，靠 `kill()` / `spec.signal` 停。[E: packages/shell/bash-local/src/index.ts:188] [E: packages/shell/bash-local/src/index.ts:225]
11. confine 路径：`danger-full-access` 不 wrap；其它模式 `ctx.sandbox.confine`。前台 runner spawn 失败抛 `SandboxUnavailableError`。[E: packages/shell/bash-sandbox/src/index.ts:92] [E: packages/shell/bash-sandbox/src/index.ts:122]

## 设计动机·edge

- **同名拆包：** 模型只看见 `bash`。one-shot 是本页的 `ctx.shell`；persistent 是 `ctx.terminals` PTY。minimal 只装后者。不要把「改 timeout 配置」理解成从 one-shot 变成 persistent。
- **没有 `apply_patch`：** Codex 的补丁方言、Claude Edit、Pi edit 都不在这个工具里。bash 只跑命令；字面替换 / 整文件写是 `edit` / `write`（standard/ptc/cordis）；`minimal` 没有独立编辑工具，文件读写靠 persistent `bash`。
- **升权必须对着真实拒绝：** 描述禁止投机 `sandbox_permissions`；`never` 策略下升权会被拒。grant 只有 `allowed-once`，盖在这一次 call 上。
- **非零退出是结果，不是工具失败。** 模型要读 `[exit code: N]`。基础设施失败（ENOENT cwd、abort、SANDBOX_UNAVAILABLE）才 `isError`。
- **请求形状是白名单。** 模型就算塞 `env` / `stdin` / `stdoutMaxBytes` 也不会进 `ShellExecRequest`；shell 语法自己能设环境或 heredoc。
- **session cwd ≠ 进程 cwd。** 有 `session.header.cwd` 时默认在那里跑；相对 `workdir` 相对它解析。测试：`/usr` + `bin` → `/usr/bin`。[E: packages/shell/tool-bash/tests/tools.spec.ts:1014]
- **后台所有权。** job 挂 `owner: exec.agent`；别的 session 读会「belongs to another session」。[E: packages/shell/tool-bash/tests/tools.spec.ts:589]
- **超时陷阱。** 命令 trap SIGTERM 后 exit 0，无-jobs 前台仍报 `[timed out after Nms]`，不装成干净成功。[E: packages/shell/tool-bash/tests/tools.spec.ts:284] 有 jobs 时默认 `promoteOnTimeout`，超时变成 background job，不是杀进程。
- **PTC collapse：** `presets/ptc.patch.yml` 把 `dsh-agent-tool-presentation` 配成 `mode: ptc`；模型直调 `bash` 在 policy 之前变成 `UNKNOWN_TOOL`，须从 `run_code` 子调度进入。[E: packages/bundle/web-app/presets/ptc.patch.yml:147] [E: packages/core/tools/src/index.ts:1352]

## Sources

- packages/shell/tool-bash/package.json
- packages/shell/tool-bash/src/index.ts
- packages/shell/tool-bash/src/background.ts
- packages/shell/tool-bash/src/render.ts
- packages/shell/tool-bash/tests/tools.spec.ts
- packages/shell/tool-bash/tests/integration.spec.ts
- packages/shell/shell/src/index.ts
- packages/shell/bash-local/src/index.ts
- packages/shell/bash-sandbox/src/index.ts
- packages/shell/shell-env/src/index.ts
- packages/shell/tool-bash-persistent/src/index.ts
- packages/sandbox/sandbox/src/escalation.ts
- packages/sandbox/sandbox/src/index.ts
- packages/core/tools/src/index.ts
- packages/core/tools/src/schema.ts
- packages/jobs/jobs/src/view.ts
- packages/util/timeout/src/index.ts
- packages/guard/timeout-policy/src/index.ts
- packages/interaction/user-approval/src/index.ts
- packages/subprocess/subprocess/src/types.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/web-app/presets/minimal.patch.yml
- packages/bundle/web-app/presets/standard.patch.yml
- packages/bundle/web-app/presets/ptc.patch.yml
- packages/bundle/web-app/presets/cordis.patch.yml

## 相关

- [工具调用解剖](../../spine/tool-call-anatomy.md)（`spine.tool-call-anatomy`）：`tools/pre-execute → execute → post-execute`、approval / timeout wrapper / PTC collapse。
- [模型可见工具目录](../../reference/tools-catalog.md)（`ref.tools-catalog`）：boot 后 `ctx.tools.schemas()` 名录。
- [bash 持久 PTY](bash-persistent.md)（`surface.tools.bash-persistent`）：同 wire 名、`dsh-tool-bash-persistent`、`ctx.terminals`。
- [shell 执行缝](../../subsystems/execution/shell.md)（`subsys.execution.shell`）：`ctx.shell` Definition / Provider，不是本页的模型 schema。
