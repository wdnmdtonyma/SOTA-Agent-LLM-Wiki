---
id: surface.tools.pwsh
title: pwsh
kind: tool
tier: T1
pkg: execution
source:
  - packages/shell/tool-pwsh/src/index.ts
  - packages/shell/tool-pwsh/src/background.ts
  - packages/shell/tool-pwsh/src/render.ts
  - packages/shell/tool-pwsh/package.json
  - packages/shell/tool-pwsh/tests/tools.spec.ts
  - packages/shell/tool-pwsh/tests/integration.spec.ts
  - packages/shell/tool-pwsh/tests/loader.spec.ts
  - packages/shell/pwsh-local/src/index.ts
  - packages/shell/pwsh-local/src/resolve.ts
  - packages/shell/pwsh-local/tests/executor.spec.ts
  - packages/shell/pwsh-sandbox/src/index.ts
  - packages/shell/pwsh-sandbox/tests/sandbox.spec.ts
  - packages/shell/shell/src/index.ts
  - packages/shell/shell-env/src/index.ts
  - packages/shell/tool-bash/src/index.ts
  - packages/sandbox/sandbox/src/escalation.ts
  - packages/sandbox/sandbox/src/index.ts
  - packages/core/tools/src/index.ts
  - packages/core/agent-loop/src/tool-calls.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/web-app/cordis.patch.yml
  - apps/cli/config/agent-presets/minimal/agent.cordis.yml
  - apps/cli/config/agent-presets/standard/agent.cordis.yml
  - apps/cli/config/agent-presets/code/agent.cordis.yml
  - apps/cli/config/agent-presets/cordis/agent.cordis.yml
  - apps/cli/tests/windows-shell.spec.ts
  - scripts/gen-tool-catalog.ts
symbols:
  - name
  - inject
  - apply
  - Config
  - processOutcome
  - renderPwshResult
  - renderPwshProcessRead
  - PwshLocalExecutor
  - resolvePwshPath
  - ENCODING_PREAMBLE
related:
  - spine.tool-call-anatomy
  - ref.tools-catalog
evidence: explicit
status: verified
updated: 47f943859b
---

> `pwsh` 是模型可见的一次性 PowerShell 工具：实现包 `@deepseek-ai/dsh-tool-pwsh`，经 `ctx.shell` 每次拉起一个新的 `pwsh -NoLogo -NoProfile -NonInteractive -Command` 进程，把 stdout/stderr 与退出标记还给模型。它与 one-shot `bash`（`@deepseek-ai/dsh-tool-bash`）共享同一条 `ctx.shell` 缝，但 wire 名是 `pwsh`，不是 `bash`；也不是 `dsh-tool-bash-persistent` 那条 `ctx.terminals` PTY。

## 能回答的问题

- 模型看见的 wire 名是 `pwsh` 还是 `bash`？哪个包注册它？`inject` 要哪些 seam？
- 默认 Config 下 schema 有哪些字段？`sandbox_permissions` / `justification` 什么时候才广告？
- `run_in_background` 如何进 `ctx.jobs`？job kind 是什么？谁去 `job_output` / `job_kill`？
- 四个 shipped preset 谁装 `@deepseek-ai/dsh-tool-pwsh`？win32 上谁 `disabled`？`minimal` 装了没有？
- 一次 `execute()` 怎样解析 workdir、收集 `DSH_*`、走 escalation、再 `ctx.shell.run` / `ctx.shell.start`？
- 相对 `dsh-tool-bash`，「减了哪些 sandbox 控件」在源码里到底指什么？官方 catalog 文案和 shipped win32 组合是否一致？

## Identity

模型看见的 `name` 是字面量 `'pwsh'`，由 `apply()` 里 `ctx.tools.register(defineTool({ name: 'pwsh', ... }))` 写入工具登记表。[E: packages/shell/tool-pwsh/src/index.ts:253] 插件自身的 Cordis 导出名是 `export const name = 'tool-pwsh'`，npm 包是 `@deepseek-ai/dsh-tool-pwsh`。[E: packages/shell/tool-pwsh/src/index.ts:48][E: packages/shell/tool-pwsh/package.json:2]

`inject = ['tools', 'shell', 'systemPrompt', 'shellEnv']`：没有 `ctx.shell` 时插件保持 pending，catalog 为空。[E: packages/shell/tool-pwsh/src/index.ts:49][E: packages/shell/tool-pwsh/tests/tools.spec.ts:326] 工厂是 `export function apply(ctx, config = {})`；`Config.enableRunInBackground` 默认 `true`，`apply()` 对裸 `{}` 再用 `?? true` 兜底。[E: packages/shell/tool-pwsh/src/index.ts:59][E: packages/shell/tool-pwsh/src/index.ts:196][E: packages/shell/tool-pwsh/src/index.ts:197]

`jobs` / `approval` / `sandboxPolicy` 不在 `inject` 里：后台路径 `ctx.get('jobs')`，escalation 路径 `ctx.get('approval')`，禁闭执行器路径 `ctx.get('sandboxPolicy')`。缺 `jobs` 会在 `run_in_background: true` 时抛错；禁闭执行器缺 `sandboxPolicy` 会在**加载**时抛 `tool-pwsh: the mounted bash executor confines but ctx.sandboxPolicy is missing`。[E: packages/shell/tool-pwsh/src/index.ts:202][E: packages/shell/tool-pwsh/src/index.ts:373]

假执行器套件钉死：无沙箱时 schema 含 `command` / `description` / `timeoutMs` / `workdir` / `run_in_background`，`required` 只有前两个；`systemPrompt` 段名 `tool:pwsh`、order `105`。[E: packages/shell/tool-pwsh/tests/tools.spec.ts:305][E: packages/shell/tool-pwsh/tests/tools.spec.ts:315][E: packages/shell/tool-pwsh/src/index.ts:246]

`declare module '@deepseek-ai/dsh-jobs'` 把 job kind `pwsh` 加进 `JobKindMap`；后台 id 形如 `pwsh-1`。[E: packages/shell/tool-pwsh/src/index.ts:44][E: packages/shell/tool-pwsh/tests/tools.spec.ts:705]

## 用途定位

`pwsh` 面向 Windows 组合：模型写 PowerShell 方言（原生 `C:\...` 路径、`$env:NAME`），每次调用是**新进程**，cwd / 变量 / 函数不跨调用保留，要用 `workdir` 而不是 `cd`。[E: packages/shell/tool-pwsh/src/index.ts:107] 命令字符串作为 **一个** `-Command` argv 元素交给 PowerShell 自己解析，中间没有 `bash -c` 那种二次 quoting 层。[E: packages/shell/pwsh-local/src/index.ts:218]

它镜像 one-shot `bash` 的前台 / `run_in_background` / `ctx.jobs` / sandbox escalation 管线，不是 persistent PTY。`minimal` 装的是 `@deepseek-ai/dsh-tool-bash-persistent`（wire 名仍是 `bash`，走 `ctx.terminals`），**不**装本包。[E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:33][E: apps/cli/tests/windows-shell.spec.ts:134]

非零退出、超时杀进程，都渲染成标记，**不是** `isError`。只有 abort、参数非法、escalation 失败、spawn / `SANDBOX_UNAVAILABLE` 这类基础设施失败才走错误通道。[E: packages/shell/tool-pwsh/tests/integration.spec.ts:90][E: packages/shell/tool-pwsh/tests/tools.spec.ts:496]

## 输入 schema

以插件默认 Config（`enableRunInBackground: true`）boot 后的 schema 为准。`timeoutMs` / `workdir` / `run_in_background` 在 parameters 里都不是 `required`。[E: packages/shell/tool-pwsh/src/index.ts:257][E: packages/shell/tool-pwsh/tests/tools.spec.ts:315]

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---|---|---|---|
| `command` | `string` | 是 | 无 | `trim()` 后非空 | 交给 `pwsh -Command` 的 PowerShell 文本。[E: packages/shell/tool-pwsh/src/index.ts:257][E: packages/shell/tool-pwsh/src/index.ts:88] |
| `description` | `string` | 是 | 无 | `trim()` 后非空 | UI 用 5–10 词主动语态摘要，不进执行器。[E: packages/shell/tool-pwsh/src/index.ts:258][E: packages/shell/tool-pwsh/src/index.ts:91] |
| `timeoutMs` | `number` | 否 | 执行器 `Config.timeoutMs`（`PwshLocalExecutor` 默认 `120_000`，上限 `maxTimeoutMs` 默认 `600_000`） | 正有限数；`validatePwshArgs` 拒 `<= 0` / 非有限 | 只作用于前台。schema 文案写执行器会套默认与 cap。[E: packages/shell/tool-pwsh/src/index.ts:265][E: packages/shell/pwsh-local/src/index.ts:133][E: packages/shell/tool-pwsh/src/index.ts:94] |
| `workdir` | `string` | 否 | `exec.agent.session.header.cwd`；二者皆缺则省略，由执行器落到 `config.cwd ?? process.cwd()` | 相对路径相对 session header cwd | 不走 `canonicalPath`，也不改写成 sandbox policy 的 `workspaceRoot`。[E: packages/shell/tool-pwsh/src/index.ts:266][E: packages/shell/tool-pwsh/src/index.ts:151] |
| `run_in_background` | `boolean` | 否 | 省略 = 前台 | 仅当 `enableRunInBackground !== false` 时广告；execute 对未广告键仍强制拒绝 | `true` 立即返回 `jobId`，**不**套 `timeoutMs`。[E: packages/shell/tool-pwsh/src/index.ts:268][E: packages/shell/tool-pwsh/src/index.ts:369] |

### Config 会改掉的字段

`Config.enableRunInBackground: false` 从 parameters 里拿掉 `run_in_background`，并把 description 改成 “Background execution is not available”；若模型仍传入该键，execute 抛 `run_in_background is disabled for this deployment`。[E: packages/shell/tool-pwsh/src/index.ts:59][E: packages/shell/tool-pwsh/tests/tools.spec.ts:796]

### 组合条件字段（`ctx.shell.sandboxMode`）

`sandbox_permissions` / `justification` **不是**默认 Config 的函数，而是 `ctx.shell.sandboxMode` 是否有值的函数：`undefined` → `escalationModes = []`，两字段不进 schema、description 不含 escalation 条款；有值 → enum 为共享的 `ESCALATION_TARGETS`（`workspace-write`、`danger-full-access`），并追加 Windows 禁闭条款（ConstrainedLanguage / named pipe EPERM）。[E: packages/shell/tool-pwsh/src/index.ts:198][E: packages/shell/tool-pwsh/src/index.ts:270][E: packages/sandbox/sandbox/src/escalation.ts:41][E: packages/shell/tool-pwsh/tests/tools.spec.ts:559]

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---|---|---|---|
| `sandbox_permissions` | `string` | 否 | 无 | 仅禁闭执行器广告；须与 `justification` 成对；execute 再查是否严格更宽 | 一次性加宽本调用的 sandbox mode。[E: packages/shell/tool-pwsh/src/index.ts:271][E: packages/sandbox/sandbox/src/escalation.ts:51] |
| `justification` | `string` | 否 | 无 | 非空一句；单独出现即非法 | 给用户看的加宽理由，经 `ctx.approval.request`。[E: packages/shell/tool-pwsh/src/index.ts:276][E: packages/sandbox/sandbox/src/escalation.ts:58] |

schema 校验只检查**已广告**键。无沙箱组合里模型仍可能塞进 `sandbox_permissions`；execute 会抛 `sandbox_permissions is not available in this composition`。[E: packages/shell/tool-pwsh/src/index.ts:229][E: packages/shell/tool-pwsh/tests/tools.spec.ts:586]

官方 catalog 采集挂的是**无沙箱**的 `PwshLocalExecutor`，所以生成文案写 “mirrors the bash tool call-for-call minus sandbox controls”。那是采集组合，不是 `apply()` 在禁闭执行器下的 schema。[E: scripts/gen-tool-catalog.ts:251][E: scripts/gen-tool-catalog.ts:255]

`ToolDefinition.timeoutMs` 是可选的定义级字段；`pwsh` 的 `defineTool({ name: 'pwsh', ... })` 未传入它，登记表因此不会给这件工具挂调用预算。前台期限只走参数 `timeoutMs` → `ctx.shell.resolve`。[E: packages/shell/tool-pwsh/src/index.ts:252]

## 输出 & 截断 / spill

`output.schema` 是 `oneOf`：后台 `{ kind: 'background', jobId }`，或前台 `kind: 'foreground'` 加上 `exitCode` / `signal` / `timedOut` / `aborted` / `timeoutMs` 与两路 `{ text, truncated, spillPath? }`，以及可选 `sandbox: { mode, denied, enforcement?, runnerFailed? }`。[E: packages/shell/tool-pwsh/src/index.ts:289][E: packages/shell/tool-pwsh/src/index.ts:299]

`output.render`：后台渲染 `started background job ${jobId}`；前台走 `renderPwshResult`。[E: packages/shell/tool-pwsh/src/index.ts:342] 登记表 `createSuccessResult` 在 body 返回后调用 `tool.output.render`。[E: packages/core/tools/src/index.ts:1800]

`renderPwshResult` 拼：stdout 文本 → 非空 stderr 前加 `[stderr]` → 空 body 写成 `(no output)` → 标记行（sandbox 拒绝、escalation hint、`[timed out after Nms]`、`[killed by signal: X]` 或 `[exit code: N]`）。干净退出 0 且无 signal **不加**退出标记。[E: packages/shell/tool-pwsh/src/render.ts:59][E: packages/shell/tool-pwsh/src/render.ts:74][E: packages/shell/tool-pwsh/tests/tools.spec.ts:440]

截断：`truncated === true` 时在该流文本后追加 `[output truncated; full output: <spillPath|(unavailable)>]`。[E: packages/shell/tool-pwsh/src/render.ts:22] 执行器默认每流内存帽 `maxOutputBytes = 64_000`，spill 文件帽 `maxSpillBytes = 64 * 1024 * 1024`；溢出后内存只留尾巴，全量在 spill 文件。[E: packages/shell/pwsh-local/src/index.ts:135][E: packages/shell/pwsh-local/src/index.ts:55]

后台 `job_output` 读增量走 `renderPwshProcessRead`：lossy 时加 `[some output was dropped from memory; full output: ...]`；`runnerFailed` 优先于 denial。[E: packages/shell/tool-pwsh/src/render.ts:98][E: packages/shell/tool-pwsh/src/render.ts:102]

UI：`presentCall` 前台是 `card: 'terminal'`（title=command，可带 `cwd`），后台是 `card: 'generic'`；`presentResult` 用共享 `parseExitStatus` 把退出标记抠成 terminal 卡片的 exit pill。[E: packages/shell/tool-pwsh/src/index.ts:423][E: packages/shell/tool-pwsh/src/index.ts:441]

## 背后的 seam

| 角色 | 实体 | 位置 |
|---|---|---|
| Definition | `ShellExecutor` 注册为 `ctx.shell`；`sandboxMode` 默认 `undefined` | `packages/shell/shell/src/index.ts` [E: packages/shell/shell/src/index.ts:67][E: packages/shell/shell/src/index.ts:75] |
| Provider（本地） | `PwshLocalExecutor`，`static inject = ['subprocess']` | `@deepseek-ai/dsh-pwsh-local` [E: packages/shell/pwsh-local/src/index.ts:129] |
| Provider（禁闭） | `SandboxPwshExecutor`，`inject = ['subprocess', 'sandbox', 'sandboxPolicy']`，覆盖 `sandboxMode` | `@deepseek-ai/dsh-pwsh-sandbox` [E: packages/shell/pwsh-sandbox/src/index.ts:53][E: packages/shell/pwsh-sandbox/src/index.ts:83] |
| Consumer | `dsh-tool-pwsh` 的 `apply()` / `execute()` | 本页 |

换掉 `ctx.shell` 的 provider 会带走：可执行文件解析（`resolvePwshPath`：PowerShell 7 → PATH 上的 `pwsh.exe` → `powershell.exe` 5.1，非 win32 回落裸 `pwsh`）、argv 形状、默认 timeout / 输出帽、以及是否广告 escalation。[E: packages/shell/pwsh-local/src/resolve.ts:73][E: packages/shell/pwsh-local/src/index.ts:218]

`ctx.shellEnv.collect(exec)` 提供托管 `DSH_*`（至少 `DSH_HOME`、`DSH_SHELL=1`，有 agent 时再加 `DSH_SESSION_ID`），执行器把它叠在 `NO_COLOR=1` / `PAGER=cat` / `GIT_PAGER=cat` 之后。[E: packages/shell/shell-env/src/index.ts:152][E: packages/shell/pwsh-local/src/index.ts:34][E: packages/shell/pwsh-local/src/index.ts:240][E: packages/shell/tool-pwsh/tests/tools.spec.ts:369]

`ctx.jobs` 是后台所有权：kind `'pwsh'`，`owner` 为调用 agent；匿名 `job_output` 读别人的 job 会失败。[E: packages/shell/tool-pwsh/src/index.ts:383][E: packages/shell/tool-pwsh/tests/tools.spec.ts:736]

`ctx.approval` 只服务 escalation，**不是** `tools/pre-execute` 的 `ask` 门。grant 只认 `allowed-once`。[E: packages/sandbox/sandbox/src/escalation.ts:183][E: packages/shell/tool-pwsh/src/index.ts:235]

`ctx.sandbox` / `ctx.sandboxPolicy` 属于禁闭 provider。`danger-full-access` 不 wrap argv；其余 mode 把 `this.argv(spec)` 交给 `ctx.sandbox.confine`。runner 起不来就抛 `SandboxUnavailableError`（code `SANDBOX_UNAVAILABLE`），**不会**裸跑。[E: packages/shell/pwsh-sandbox/src/index.ts:99][E: packages/shell/pwsh-sandbox/src/index.ts:184][E: packages/shell/pwsh-sandbox/src/index.ts:111][E: packages/sandbox/sandbox/src/index.ts:124][E: packages/shell/pwsh-sandbox/tests/sandbox.spec.ts:234]

shipped CLI：`dsh-base` 在 win32 挂 `pwsh-sandbox`、在 POSIX 挂 `bash-sandbox`。`pwsh-sandbox` 行**没有**覆盖 `timeoutMs`，因此沿用 `PwshLocalExecutor` 的 `120_000`；对照 `bash-sandbox` 行显式写了 `timeoutMs: 60000`。[E: packages/bundle/base/cordis.patch.yml:184][E: packages/bundle/base/cordis.patch.yml:182]

## 执行管线

agent-loop 把助手 step 里的 tool call 编成 `ToolExecutionInput`（`name` 来自模型，对这件工具是 `'pwsh'`），再进 `ctx.tools.execute`。[E: packages/core/agent-loop/src/tool-calls.ts:75][E: packages/core/tools/src/index.ts:1342]

1. **`tools/pre-execute`**：waterfall，默认 `{ kind: 'allow' }`。本包**不**注册 pre-execute 监听器，也不把 escalation 做成 `ask` 门。[E: packages/core/tools/src/index.ts:1476]
2. **定义级 `timeoutMs` / 登记表 deadline**：`pwsh` 的 `defineTool({ name: 'pwsh', ... })` 未传定义级 `timeoutMs`，登记表不会给这件工具套一层调用预算。前台期限是参数 → 执行器 `clampTimeout`。[E: packages/shell/tool-pwsh/src/index.ts:252][E: packages/shell/pwsh-local/src/index.ts:190]
3. **`tools/execute` waterfall → `tool.execute`**：真正的 `validatePwshArgs` / escalation / `ctx.shell.run|start` 发生在这里。[E: packages/core/tools/src/index.ts:1574][E: packages/core/tools/src/index.ts:1549]
4. **approval**：普通调用不经 `serviceAsk`。只有模型带了成对的 `sandbox_permissions` + `justification` 时，`execute()` **在 spawn 之前**调用 `approveEscalation` → `ctx.approval.request({ toolName: 'pwsh', ... })`。非加宽请求永不弹窗。[E: packages/shell/tool-pwsh/src/index.ts:352][E: packages/sandbox/sandbox/src/escalation.ts:162]
5. **sandbox**：站立 policy 来自 `ctx.sandboxPolicy.resolve({ session })`，stamp 到 `request.sandboxPolicy`。无禁闭执行器则整字段省略。[E: packages/shell/tool-pwsh/src/index.ts:207][E: packages/shell/tool-pwsh/tests/tools.spec.ts:531]
6. **`tools/post-execute`**：默认 `accept`。本包不注册 post-execute 监听器。成功路径随后 `output.render`。[E: packages/core/tools/src/index.ts:1744]

`isConcurrencySafe` 未声明：默认与兄弟调用互斥，本页不展开并行调度。

## Preset 装配

成员资格只认 `apps/cli/config/agent-presets/{minimal,standard,code,cordis}/agent.cordis.yml`。四份里的 `tool-pwsh` 行都**不**在 `isolate` group 内（`planMode` / `compaction` / `workflowEngine` / `terminals` / `fs` 与它无关），注册进 host `tools` 表。

| preset | 装 `@deepseek-ai/dsh-tool-pwsh`？ | `disabled` | isolate |
|---|---|---|---|
| `minimal` | 否。shell 是 `dsh-tool-bash-persistent`（wire `bash`）+ `isolate.terminals` | 无此行 | 无 pwsh 行。[E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:21][E: apps/cli/tests/windows-shell.spec.ts:134] |
| `standard` | 是 | `!!js process.platform !== 'win32'`（非 win32 禁用） | 无。[E: apps/cli/config/agent-presets/standard/agent.cordis.yml:48][E: apps/cli/config/agent-presets/standard/agent.cordis.yml:50] |
| `code` | 是（与 standard 同一行；另加 Code Mode 呈现，不删工具行） | 同 standard | 无。[E: apps/cli/config/agent-presets/code/agent.cordis.yml:55][E: apps/cli/config/agent-presets/code/agent.cordis.yml:57] |
| `cordis` | 是 | 同 standard | 无。[E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:49][E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:51] |

win32 上 `tool-bash` 的 `disabled` 表达式与 `tool-pwsh` 相反，同一 preset 只亮一只 one-shot shell。[E: apps/cli/config/agent-presets/standard/agent.cordis.yml:46][E: apps/cli/tests/windows-shell.spec.ts:120]

Web profile 会把 host 平面的 `tool-pwsh` 行改成无条件 `disabled: true`，改由 session 挂上的 preset 行注册工具；`pwsh-sandbox` 仍留在 host，作为 `ctx.shell`。[E: packages/bundle/web-app/cordis.patch.yml:296][E: apps/cli/tests/windows-shell.spec.ts:64]

## execute() 走读

`execute@packages/shell/tool-pwsh/src/index.ts`：

1. **`validatePwshArgs`**：空 `command` / 空 `description` / 非正 `timeoutMs` 立刻抛；再跑共享 `validateEscalationArgs`（两字段必须成对且 justification 非空）。[E: packages/shell/tool-pwsh/src/index.ts:87][E: packages/shell/tool-pwsh/src/index.ts:99]
2. **`resolveSandboxPolicy(exec)`**：仅当加载时见到禁闭执行器。有 agent 则 `sandboxPolicy.resolve({ session })`（mode + canonical workspaceRoot + sessionId）；无 agent 回落部署默认。[E: packages/shell/tool-pwsh/src/index.ts:207][E: packages/shell/tool-pwsh/tests/tools.spec.ts:512]
3. **escalation（可选，spawn 之前）**：两字段都在 → `approvePwshEscalation`，`toolName: 'pwsh'`，`subject: 'command'`。成功则把 `standingPolicy.mode` 换成批准 mode，只影响这一次。[E: packages/shell/tool-pwsh/src/index.ts:238][E: packages/shell/tool-pwsh/src/index.ts:357]
4. **`resolveWorkdir`**：显式绝对路径原样用；相对路径 `resolve(headerCwd, modelWorkdir)`；未传则用 `headerCwd`。没有 `policyWorkspaceRoot`、没有 `canonicalPath`。[E: packages/shell/tool-pwsh/src/index.ts:151][E: packages/shell/tool-pwsh/src/index.ts:358]
5. **组 `request`**：`command` + 可选 `workdir` / `timeoutMs` + `dshEnv: ctx.shellEnv.collect(exec)` + 可选 `sandboxPolicy`。[E: packages/shell/tool-pwsh/src/index.ts:359]
6. **后台**（`run_in_background === true`）：检查开关与 `ctx.jobs`；若 `exec.signal` 已 abort 则抛 `TOOL_ABORTED`（不 `start`）；`jobs.start({ kind: 'pwsh', label: command, owner?, run })` 里 `ctx.shell.start(ctx.shell.resolve(request))`。`startArgv` 把 `spec.signal` 传给 spawn，不用 `spec.timeoutMs` 做 deadline。返回 `{ kind: 'background', jobId }`。[E: packages/shell/tool-pwsh/src/index.ts:366][E: packages/shell/tool-pwsh/src/index.ts:382][E: packages/shell/pwsh-local/src/index.ts:286]
7. **`processOutcome`**：后台结算 `killed` → `{ status: 'killed', detail: signal 或 'killed before exit' }`；其余 `completed` + `exit code: N`（含非零，不当 `failed`）。[E: packages/shell/tool-pwsh/src/background.ts:26][E: packages/shell/tool-pwsh/src/background.ts:29]
8. **前台**：`ctx.shell.run(ctx.shell.resolve({ ...request, signal: exec.signal }))`。`result.aborted` → `TOOL_ABORTED`。否则 `canonicalPwshResult`（含可选 sandbox 事实；执行器没给出的 `enforcement` / `runnerFailed` 不会编造）。[E: packages/shell/tool-pwsh/src/index.ts:397][E: packages/shell/tool-pwsh/src/index.ts:401][E: packages/shell/tool-pwsh/src/index.ts:161]
9. **真实进程**：`PwshLocalExecutor.argv` = `[pwshPath, '-NoLogo', '-NoProfile', '-NonInteractive', '-Command', ENCODING_PREAMBLE + command]`。UTF-8 preamble 钉住 Windows PowerShell 5.1 的 OEM 代码页。集成测试：干净 `Write-Output hi` 无标记；`exit 3` 为 `[exit code: 3]` 且 `isError === false`；`timeoutMs: 100` 的 `Start-Sleep` 带 `[timed out after 100ms]`，win32 上强制结束常为 exit 1 且无 signal。[E: packages/shell/pwsh-local/src/index.ts:218][E: packages/shell/pwsh-local/src/index.ts:48][E: packages/shell/tool-pwsh/tests/integration.spec.ts:82][E: packages/shell/tool-pwsh/tests/integration.spec.ts:114]

## 设计动机·edge

DSH 没有 first-class `apply_patch`。`pwsh` 是一次性 shell 执行，不是 Claude Edit / Codex patch / Pi edit 那种文件方言。

与 one-shot `bash`（[bash 一次性执行](bash.md)）同缝、不同 wire 名。相对 `dsh-tool-bash`，工具层**没有**减掉 `sandbox_permissions` / `justification` / `approveEscalation` / denial 标记——禁闭执行器下这些齐。[E: packages/shell/tool-pwsh/src/index.ts:270][E: packages/sandbox/sandbox/src/escalation.ts:157]

真正少掉、或与 bash 分叉的控件：

1. **workdir 不与 sandbox root 对齐。** `dsh-tool-bash` 的 `resolveWorkdir` 吃 `standingPolicy?.workspaceRoot`，否则 `canonicalPath(headerCwd)`，让 workdir 与禁闭根同一身份。[E: packages/shell/tool-bash/src/index.ts:150] `pwsh` 只用原始 `session.header.cwd`。[E: packages/shell/tool-pwsh/src/index.ts:152]
2. **catalog / 无沙箱采集看不到 escalation 字段。** `gen-tool-catalog.ts` 挂 `PwshLocalExecutor`，`sandboxMode` 为 `undefined`，于是生成说明写成 “minus sandbox controls”。shipped win32 的 `ctx.shell` 是 `pwsh-sandbox`，live schema **有**这两字段。[E: scripts/gen-tool-catalog.ts:255][E: packages/bundle/base/cordis.patch.yml:185]
3. **禁闭后端是 Windows ACL restricted-token，不是 bwrap / landlock / seatbelt。** `read-only` 下 PowerShell 进 ConstrainedLanguage（`.NET` 静态调用 / `Add-Type` / COM / 反射失败）；`workspace-write` 默认 FullLanguage。两种禁闭 mode 里孙进程 `stdio: 'pipe'` 的 named pipe 打开会 EPERM。这些句子写在工具 description 里，但门控是「`escalationModes` 非空」而不是 `process.platform === 'win32'`（源码注释承认与 Windows runner 绑在一起）。[E: packages/shell/tool-pwsh/src/index.ts:124]
4. **host timeout 默认不同。** `bash-sandbox` 行写死 `timeoutMs: 60000`；`pwsh-sandbox` 行不写，落到 `120_000`。[E: packages/bundle/base/cordis.patch.yml:182][E: packages/shell/pwsh-local/src/index.ts:133]
5. **win32 强杀没有 POSIX signal。** description 与 prompt 都要求把裸 `[exit code: 1]` 当成中断，不当命令逻辑失败。[E: packages/shell/tool-pwsh/src/index.ts:114][E: packages/shell/tool-pwsh/src/index.ts:249]
6. **每调用新进程。** 与 [bash 持久 PTY](bash-persistent.md) 的 `ctx.terminals` 无关；minimal 那条 wire 名也是 `bash`，不要和本页搞混。

## Sources

- `packages/shell/tool-pwsh/src/index.ts`
- `packages/shell/tool-pwsh/src/background.ts`
- `packages/shell/tool-pwsh/src/render.ts`
- `packages/shell/tool-pwsh/package.json`
- `packages/shell/tool-pwsh/tests/tools.spec.ts`
- `packages/shell/tool-pwsh/tests/integration.spec.ts`
- `packages/shell/tool-pwsh/tests/loader.spec.ts`
- `packages/shell/pwsh-local/src/index.ts`
- `packages/shell/pwsh-local/src/resolve.ts`
- `packages/shell/pwsh-local/tests/executor.spec.ts`
- `packages/shell/pwsh-sandbox/src/index.ts`
- `packages/shell/pwsh-sandbox/tests/sandbox.spec.ts`
- `packages/shell/shell/src/index.ts`
- `packages/shell/shell-env/src/index.ts`
- `packages/shell/tool-bash/src/index.ts`
- `packages/sandbox/sandbox/src/escalation.ts`
- `packages/sandbox/sandbox/src/index.ts`
- `packages/core/tools/src/index.ts`
- `packages/core/agent-loop/src/tool-calls.ts`
- `packages/bundle/base/cordis.patch.yml`
- `packages/bundle/web-app/cordis.patch.yml`
- `apps/cli/config/agent-presets/minimal/agent.cordis.yml`
- `apps/cli/config/agent-presets/standard/agent.cordis.yml`
- `apps/cli/config/agent-presets/code/agent.cordis.yml`
- `apps/cli/config/agent-presets/cordis/agent.cordis.yml`
- `apps/cli/tests/windows-shell.spec.ts`
- `scripts/gen-tool-catalog.ts`

## 相关

- [工具调用解剖](../../spine/tool-call-anatomy.md) — `spine.tool-call-anatomy`：`tools/pre-execute → execute → post-execute` 脊柱。
- [模型可见工具目录](../../reference/tools-catalog.md) — `ref.tools-catalog`：boot 后 `ctx.tools.schemas()` 总表。
- [bash 一次性执行](bash.md) — `surface.tools.bash`：同缝 POSIX 孪生，wire 名 `bash`。
- [bash 持久 PTY](bash-persistent.md) — `surface.tools.bash-persistent`：另一包、同名 `bash`、`ctx.terminals`；只在 `minimal`。
- [job_list / job_output / job_kill](jobs.md) — `surface.tools.jobs`：后台 `pwsh-*` job 的读/杀。
- [shell 执行缝](../../subsystems/execution/shell.md) — `subsys.execution.shell`：`ctx.shell` Definition / Provider。
