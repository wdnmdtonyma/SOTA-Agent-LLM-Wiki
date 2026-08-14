---
id: surface.tools.terminal
title: terminal_* 六件套
kind: tool
tier: T1
pkg: execution
source:
  - packages/terminal/tool-terminal/src/index.ts
  - packages/terminal/tool-terminal/src/render.ts
  - packages/terminal/tool-terminal/package.json
  - packages/terminal/tool-terminal/tests/tools.spec.ts
  - packages/terminal/tool-terminal/tests/render.spec.ts
  - packages/terminal/tool-terminal/tests/loader-composition.spec.ts
  - packages/terminal/terminal/src/index.ts
  - packages/terminal/terminal/src/types.ts
  - packages/terminal/terminal-bash/src/index.ts
  - packages/terminal/terminal-bash/src/config.ts
  - packages/terminal/terminal-bash/src/session.ts
  - packages/shell/tool-bash-persistent/src/index.ts
  - packages/jobs/jobs/src/types.ts
  - packages/jobs/jobs-local/src/index.ts
  - packages/core/tools/src/index.ts
  - packages/core/tools/src/schema.ts
  - packages/guard/timeout-policy/src/index.ts
  - packages/subprocess/subprocess-local/src/terminal.ts
  - apps/cli/config/agent-presets/minimal/agent.cordis.yml
  - apps/cli/config/agent-presets/standard/agent.cordis.yml
  - apps/cli/config/agent-presets/code/agent.cordis.yml
  - apps/cli/config/agent-presets/cordis/agent.cordis.yml
  - examples/headless-agent/e2b.cordis.yml
  - examples/acp-agent/pty.cordis.yml
symbols:
  - terminal_open
  - terminal_list
  - terminal_read
  - terminal_send
  - terminal_signal
  - terminal_close
  - apply
  - inject
  - Config
  - DEFAULT_MAX_RESULT_BYTES
  - name
related:
  - spine.tool-call-anatomy
  - ref.tools-catalog
  - surface.tools.bash
  - surface.tools.bash-persistent
  - surface.tools.jobs
  - subsys.execution.terminal
  - subsys.orchestration.jobs
evidence: explicit
status: verified
updated: 47f943859b
---

> 六个模型可见名 `terminal_open` / `terminal_send` / `terminal_read` / `terminal_signal` / `terminal_close` / `terminal_list`；实现包 `@deepseek-ai/dsh-tool-terminal`（Cordis 插件名 `tool-terminal`）。按 owning `Agent` 操作 `ctx.terminals` 上的持久 PTY；后台 send 的 id 走 `ctx.jobs`，kind 是 `pty-send`。四个 shipped preset **都不装**本包。

## 能回答的问题

- 模型目录里的 `terminal_*` 六个名字各自干什么？和 `minimal` 的 persistent `bash`（`dsh-tool-bash-persistent`）是不是同一套工具？
- 默认 `Config` 下每个 wire 名有哪些参数？`run_in_background` 何时从 `terminal_send` 消失？
- 前台 / 后台 send 的输出怎么截断？有没有 spill 文件？`inferred_idle` / `timeout` 能不能当成命令已经退出？
- `ctx.terminals`、`ctx.jobs`、`ctx.sandboxPolicy` 各自给本套工具提供什么？换 PTY backend 会带走哪一段？
- `minimal` / `standard` / `code` / `cordis` 四个 shipped preset 谁装 `@deepseek-ai/dsh-tool-terminal`？
- 一次 `execute()` 怎样分 `spawn` / 前台 `startSend` / `jobs.start({ kind: 'pty-send' })` / `read` / `signal` / `kill`？

## Identity

实现包是 `@deepseek-ai/dsh-tool-terminal`。[E: packages/terminal/tool-terminal/package.json:2] Cordis 插件导出名是 `tool-terminal`，`inject` 是 `['terminals', 'tools', 'systemPrompt']`。没有 `ctx.terminals` 时插件挂起，catalog 里不会出现这六个名字。[E: packages/terminal/tool-terminal/src/index.ts:25] [E: packages/terminal/tool-terminal/src/index.ts:27] [E: packages/terminal/tool-terminal/tests/tools.spec.ts:493]

工厂是 `apply(ctx, config = {})`：读 `Config.enableRunInBackground`（schema 默认 `true`，裸 `{}` 再 `?? true`）和 `Config.maxResultBytes`（默认 `DEFAULT_MAX_RESULT_BYTES = 256 * 1024`，下限 `MIN_MAX_RESULT_BYTES = 64`），然后连续 `ctx.tools.register(defineTool(...))` 六次。[E: packages/terminal/tool-terminal/src/index.ts:146] [E: packages/terminal/tool-terminal/src/index.ts:147] [E: packages/terminal/tool-terminal/src/index.ts:30] [E: packages/terminal/tool-terminal/src/index.ts:44] [E: packages/terminal/tool-terminal/src/index.ts:45]

六个 wire 名全部写死在 `defineTool({ name })`，不是 load-time `toolName`：

| 模型可见 `name` | 一句话 | 注册点 |
|---|---|---|
| `terminal_open` | 按已注册 backend `type` 创建一条 owner-isolated 会话 | [E: packages/terminal/tool-terminal/src/index.ts:163] |
| `terminal_send` | 往会话写 UTF-8；默认同提交 Enter 并等到就绪 / 超时 / 退出 | [E: packages/terminal/tool-terminal/src/index.ts:198] |
| `terminal_read` | 不写输入，读一页保留的 scrollback | [E: packages/terminal/tool-terminal/src/index.ts:297] |
| `terminal_signal` | 向当前前台进程组投递允许的 POSIX 信号 | [E: packages/terminal/tool-terminal/src/index.ts:330] |
| `terminal_close` | 关闭会话并等到 captured owned process tree 消失 | [E: packages/terminal/tool-terminal/src/index.ts:355] |
| `terminal_list` | 列出**当前** `exec.agent` 拥有的会话 | [E: packages/terminal/tool-terminal/src/index.ts:386] |

测试把这六个名字钉成 `TOOL_NAMES`，并断言 `ctx.tools.get(name)` 全部存在。[E: packages/terminal/tool-terminal/tests/tools.spec.ts:122] [E: packages/terminal/tool-terminal/tests/tools.spec.ts:139]

`apply()` 还往 `ctx.systemPrompt` 登记 section `tool:pty`（`order: 106`）。正文要求：只有需要持久终端状态或交互 stdin 时才用这套工具；跟踪每个 session id；不再需要的会话要 close；`inferred_idle` 或 `timeout` **不能**证明前台命令已经退出。[E: packages/terminal/tool-terminal/src/index.ts:157] [E: packages/terminal/tool-terminal/src/index.ts:159]

它**不是** `minimal` 里那个同缝不同包的 `bash`：`@deepseek-ai/dsh-tool-bash-persistent` 也走 `ctx.terminals`，但只注册一个 wire 名 `bash`，把 spawn / send / 读回包装成一次命令调用。[E: packages/shell/tool-bash-persistent/src/index.ts:375] 本页只写六件套。

## 用途定位

本套工具把「一条 owner-scoped 持久 PTY」拆成六个 model-facing 操作：创建、写、读、信号、关、列。描述写明：用它保存跨 tool-call 的 shell / REPL 状态；bounded 的一次性操作应优先走 shell / read / write / edit。[E: packages/terminal/tool-terminal/src/index.ts:164] [E: packages/terminal/tool-terminal/src/index.ts:159]

会话 id 由 registry 铸造，形状是 `pty-${++nextId}`（测试里第一次是 `pty-1`）。[E: packages/terminal/terminal/src/index.ts:166] [E: packages/terminal/tool-terminal/tests/tools.spec.ts:146] 所有权是**精确 `Agent` 引用**，不是 session id 字符串：别的 agent 拿同一 `sessionId` 会吃 `FOREIGN_SESSION`。[E: packages/terminal/terminal/src/index.ts:390]

`terminal_send` 默认前台：等到 backend 给出 `waitReason` 才返回 viewport。`run_in_background: true` 时立刻回 `{ kind: 'background', jobId }`；模型用 `job_output` / `job_kill` 收增量、停这次 send（不是关整条 PTY）。[E: packages/terminal/tool-terminal/src/index.ts:256] [E: packages/terminal/tool-terminal/src/index.ts:275] [E: packages/terminal/tool-terminal/tests/tools.spec.ts:410]

Loader 组合测试钉死真实 `type: 'shell'` 会话上 `export KEEP=loader; cd /` 之后再 send `printf`，仍能读到 `cwd=/ keep=loader`。[E: packages/terminal/tool-terminal/tests/loader-composition.spec.ts:122] [E: packages/terminal/tool-terminal/tests/loader-composition.spec.ts:127]

## 输入 schema

以插件默认 `Config`（`enableRunInBackground: true`，`maxResultBytes: 262144`）boot 为准。`Config` 数字键**不会**变成模型参数；模型只看见每个 `defineTool.parameters`。[E: packages/terminal/tool-terminal/src/index.ts:44] [E: packages/core/tools/src/index.ts:1257] `defineTool` 先按 schema 校验类型 / required；空 `type` / 空 `sessionId` 这类值约束在各自 `execute` 里再抛一次。[E: packages/core/tools/src/schema.ts:587] [E: packages/terminal/tool-terminal/src/index.ts:183] [E: packages/terminal/tool-terminal/src/index.ts:123]

六个工具**没有**公共参数对象。`maxResultBytes` / `enableRunInBackground` 只在插件 Config。

### `terminal_open`

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---|---|---|---|
| `type` | `string` | 是 | 无 | schema 要 string；execute 再拒 `length === 0` | 已注册 backend 类型。shipped `dsh-terminal-bash` 默认登记为 `"shell"`。[E: packages/terminal/tool-terminal/src/index.ts:166] [E: packages/terminal/tool-terminal/src/index.ts:183] [E: packages/terminal/terminal-bash/src/config.ts:45] |
| `name` | `string` | 否 | 无显示名 | 有值则 `length !== 0`；同一 owner 已发布或正在 spawn 的同名会 `DUPLICATE_NAME` | owner-local 显示名，例如 `"main"` / `"gdb"`。[E: packages/terminal/tool-terminal/src/index.ts:167] [E: packages/terminal/terminal/src/index.ts:160] [E: packages/terminal/terminal/src/index.ts:338] |
| `cwd` | `string` | 否 | backend 用 `sandboxPolicy.workspaceRoot` | 由 backend 解释 | 初始工作目录。[E: packages/terminal/tool-terminal/src/index.ts:168] [E: packages/terminal/terminal-bash/src/index.ts:127] |

### `terminal_send`

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---|---|---|---|
| `sessionId` | `string` | 是 | 无 | 非空 | `terminal_open` / `terminal_list` 返回的 id。[E: packages/terminal/tool-terminal/src/index.ts:202] [E: packages/terminal/tool-terminal/src/index.ts:123] |
| `text` | `string` | 是 | 无 | UTF-8 字符串（允许空串） | 写入终端的文本。空串后台 label 变成 `(input)`。[E: packages/terminal/tool-terminal/src/index.ts:203] [E: packages/terminal/tool-terminal/src/index.ts:257] |
| `submit` | `boolean` | 否 | `true`（execute 里 `?? true`） | — | `true` 在 text 后提交 Enter；控制字符或不完整 REPL 输入设 `false`。[E: packages/terminal/tool-terminal/src/index.ts:204] [E: packages/terminal/tool-terminal/src/index.ts:249] |
| `run_in_background` | `boolean` | 否 | 不传 = 前台 | 仅当 `enableRunInBackground` 为真时广告 | `true` 立刻回 job id。[E: packages/terminal/tool-terminal/src/index.ts:207] |

**Config 改广告：** `enableRunInBackground: false` 时 `parameters` 没有 `run_in_background`，description 也不含 `Background mode`；execute 若仍收到该键会抛 `background terminal sends are disabled by tool-terminal configuration`。[E: packages/terminal/tool-terminal/tests/tools.spec.ts:312] [E: packages/terminal/tool-terminal/src/index.ts:251]

**组合改行为（不是 schema）：** 缺 `ctx.jobs` 时前台 send 仍可用；`run_in_background: true` 抛 `background terminal sends require @deepseek-ai/dsh-jobs and @deepseek-ai/dsh-tool-jobs`，并且**不会**先 `startSend`。[E: packages/terminal/tool-terminal/src/index.ts:253] [E: packages/terminal/tool-terminal/tests/tools.spec.ts:275]

### `terminal_read`

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---|---|---|---|
| `sessionId` | `string` | 是 | 无 | 非空 | 目标会话。[E: packages/terminal/tool-terminal/src/index.ts:300] |
| `offset` | `number` | 否 | backend 默认 `0` | 非负安全整数 | 相对**最新**一行的偏移。[E: packages/terminal/tool-terminal/src/index.ts:301] [E: packages/terminal/terminal-bash/src/session.ts:321] |
| `count` | `number` | 否 | backend 默认 `500` | 正安全整数；再被 `maxReadBytes` 截 | 请求行数。[E: packages/terminal/tool-terminal/src/index.ts:302] [E: packages/terminal/terminal-bash/src/session.ts:322] |

### `terminal_signal`

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---|---|---|---|
| `sessionId` | `string` | 是 | 无 | 非空 | 目标会话。[E: packages/terminal/tool-terminal/src/index.ts:333] |
| `signal` | `string` | 是 | 无 | enum：`SIGINT` \| `SIGTERM` \| `SIGKILL` \| `SIGTSTP` \| `SIGHUP` | 交给前台进程组。schema 文案写明：对着 **shell 自己**的 `SIGKILL` 会被拒，应改 `terminal_close`。[E: packages/terminal/tool-terminal/src/index.ts:334] [E: packages/terminal/terminal/src/types.ts:36] |

### `terminal_close`

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---|---|---|---|
| `sessionId` | `string` | 是 | 无 | 非空 | 要关的会话。[E: packages/terminal/tool-terminal/src/index.ts:358] |

### `terminal_list`

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---|---|---|---|
| （无） | — | — | — | `parameters: {}` | 只列 calling agent 自己的会话。[E: packages/terminal/tool-terminal/src/index.ts:388] |

## 输出 & 截断 / spill

每个工具都挂同一份 `finalizeContent`：若结果恰好一块 `text`，用 `boundTerminalText` 按 `maxResultBytes` 截断；多块 / 非 text 则不动。[E: packages/terminal/tool-terminal/src/index.ts:152] [E: packages/core/tools/src/index.ts:1652] 截断标记是字面量 `\n[output truncated]`。完整文本超预算时**保留头部**再接标记；**不写 spill 文件**。[E: packages/terminal/tool-terminal/src/render.ts:50] [E: packages/terminal/tool-terminal/src/render.ts:93] 测试把 `maxResultBytes: 64` 钉在错误文本、超长 `name` 的 spawn 回执、以及 `pty-send-1` 后台 ack 上，并要求截断后仍能读出 `pty-1` / `pty-send-1`。[E: packages/terminal/tool-terminal/tests/tools.spec.ts:329] [E: packages/terminal/tool-terminal/tests/tools.spec.ts:336] [E: packages/terminal/tool-terminal/tests/tools.spec.ts:341]

`output.render`（模型看见的文本）按名字：

| 名字 | 成功渲染 | 结构化 `value` |
|---|---|---|
| `terminal_open` | `started terminal session <id[(name)]> [type: …]\n` + motd；空 motd 是 `(no startup output)` | snapshot + 必填 `motd`。[E: packages/terminal/tool-terminal/src/render.ts:108] [E: packages/terminal/tool-terminal/src/index.ts:177] |
| `terminal_send` 后台 | `started background job ${jobId}` | `{ kind: 'background', jobId }`。[E: packages/terminal/tool-terminal/src/index.ts:234] [E: packages/terminal/tool-terminal/tests/tools.spec.ts:410] |
| `terminal_send` 前台 | viewport（空则 `(no new output)`）+ `\n[wait: …]\n[session: running\|exited code=… signal=…]` + 可选截断标记 | `{ kind: 'foreground', viewport, waitReason, sessionStatus, truncated }`。`waitReason` enum：`stdin_read` \| `inferred_idle` \| `timeout` \| `session_exit`。[E: packages/terminal/tool-terminal/src/render.ts:121] [E: packages/terminal/tool-terminal/src/index.ts:223] |
| `terminal_read` | 页文本（空则 `(no retained output)`）+ `\n[lines: begin-end of total]` | `{ text, totalLines, lineBegin, lineEnd, truncated }`。[E: packages/terminal/tool-terminal/src/render.ts:151] |
| `terminal_signal` | `delivered ${signal} to foreground process group ${targetPgid}` | `{ delivered: true, targetPgid }`。[E: packages/terminal/tool-terminal/src/index.ts:346] [E: packages/terminal/tool-terminal/tests/tools.spec.ts:161] |
| `terminal_close` | `closed terminal session ${id}` 或 `… was already closing` | `{ sessionId, outcome: 'closed' \| 'already-closing' }`。[E: packages/terminal/tool-terminal/src/index.ts:373] [E: packages/terminal/tool-terminal/tests/tools.spec.ts:475] |
| `terminal_list` | 一行一个会话，或 `(no terminal sessions)` | snapshot 数组。[E: packages/terminal/tool-terminal/src/render.ts:166] [E: packages/terminal/tool-terminal/src/render.ts:167] |

后台 job 的增量走 `renderSendRead`：delta + 可选 `[output truncated]`。`jobs.start` 把 `outputLimitBytes` 设成同一 `maxResultBytes`，所以 `job_output` 也受这个帽约束；测试要求截断标记只出现一次，且紧挨 `[status: completed`。[E: packages/terminal/tool-terminal/src/render.ts:139] [E: packages/terminal/tool-terminal/src/index.ts:259] [E: packages/terminal/tool-terminal/tests/tools.spec.ts:430]

`presentCall` / `presentResult` 只服务 UI：前台 send 用 `card: 'terminal'`，后台 send 和其余五个名字用 `card: 'generic'`。模型看到的仍是 `output.render` 再经 `finalizeContent` 的文本。[E: packages/terminal/tool-terminal/tests/tools.spec.ts:291]

`waitReason` **不是**子进程退出码。`inferred_idle` 是「静默够久」；`timeout` 是 backend 的绝对 send 墙钟（`dsh-terminal-bash` 默认 `timeoutMs: 30_000`）。会话仍可能 `status.kind === 'running'`。[E: packages/terminal/terminal-bash/src/session.ts:465] [E: packages/terminal/terminal-bash/src/session.ts:253] [E: packages/terminal/terminal-bash/src/config.ts:57] [E: packages/terminal/tool-terminal/src/index.ts:159]

## 背后的 seam

| 角色 | 实体 | 本套工具怎么用 |
|---|---|---|
| Definition | `TerminalSessionService` / `ctx.terminals` | `super(ctx, 'terminals')`；`spawn` / `startSend` / `read` / `signal` / `kill` / `list`。[E: packages/terminal/terminal/src/index.ts:117] |
| Provider（常见本地） | `BashTerminalBackend`（`@deepseek-ai/dsh-terminal-bash`，插件名 `terminal-bash`） | `inject = ['terminals', 'sandboxPolicy', 'subprocess']`；`registerBackend` 的 `type` 默认 `'shell'`；`spawnTerminal` + confine。[E: packages/terminal/terminal-bash/src/index.ts:23] [E: packages/terminal/terminal-bash/src/index.ts:25] [E: packages/terminal/terminal-bash/src/index.ts:152] |
| Consumer | `@deepseek-ai/dsh-tool-terminal` | 六个 `execute` 只调 `ctx.terminals.*`；后台再 `ctx.get('jobs')`。 |

换掉 `ctx.terminals` 的 backend 会带走：`type` 字符串（默认是不是 `"shell"`）、初始 cwd 回退、argv / confine、scrollback 默认 `offset`/`count`、send 的 `waitReason` 判定、对着 shell 的 `SIGKILL` 是否拒绝、MOTD 怎么采集。工具代码本身不选 runner。

其它消费：

- `ctx.get('jobs')`：**只有** `terminal_send` 且 `run_in_background === true` 才取。`inject` **不含** `jobs`，缺服务就失败，不静默改前台。[E: packages/terminal/tool-terminal/src/index.ts:27] [E: packages/terminal/tool-terminal/src/index.ts:252]
- `jobs.start` 的 `kind: 'pty-send'` 是本包对 `JobKindMap` 的 declaration merge；`dsh-jobs-local` 用 `` `${kind}-${count}` `` 铸 id，所以测试里第一次是 `pty-send-1`。[E: packages/terminal/tool-terminal/src/index.ts:20] [E: packages/jobs/jobs-local/src/index.ts:153] [E: packages/terminal/tool-terminal/tests/tools.spec.ts:411] 基线 `JobKindMap` 只预置了 `bash` / `subagent`，`pty-send` 不在 jobs 包里。[E: packages/jobs/jobs/src/types.ts:24]
- `ctx.sandboxPolicy` / `ctx.sandbox`：工具 body **不**读。`terminal-bash` 在 `spawn` 时 `sandboxPolicy.resolve({ session: owner.session })`，非 `danger-full-access` 再 `ctx.sandbox.confine`。[E: packages/terminal/terminal-bash/src/index.ts:122] [E: packages/terminal/terminal-bash/src/index.ts:73]
- `ctx.systemPrompt`：只登记 `tool:pty` section，不参与 execute。
- `ctx.approval`：本套工具**不**调用。

`expectOwned` 把未知 id 映射成 `NO_SESSION`，把非本 agent 映射成 `FOREIGN_SESSION`（文案 `belongs to another agent`）。[E: packages/terminal/terminal/src/index.ts:389] [E: packages/terminal/terminal/src/index.ts:390] 同一会话上第二个并发 send 是 `SEND_ACTIVE`。[E: packages/terminal/terminal/src/index.ts:246]

## 执行管线

`ctx.tools.execute` 走 `tools/pre-execute` →（可选 `serviceAsk`）→ 单调 guard → `tools/execute` waterfall（叶子 `ToolDefinition.execute`）→ `tools/post-execute`。[E: packages/core/tools/src/index.ts:1342] [E: packages/core/tools/src/index.ts:1476] [E: packages/core/tools/src/index.ts:1574] [E: packages/core/tools/src/index.ts:1744] 本包**不**自己挂 pre-execute / post-execute listener。测试证明 listener 换掉 / deny / 抛错的文本仍会再走 `finalizeContent` 的 64-byte 帽。[E: packages/terminal/tool-terminal/tests/tools.spec.ts:347]

对本套工具的挂点：

- **timeout（工具定义）：** 六个 `defineTool` **都没有**设 `timeoutMs`。`dsh-tool-call-timeout-policy` 读到 `undefined` 就原样 `next()`。[E: packages/guard/timeout-policy/src/index.ts:57] [E: packages/guard/timeout-policy/src/index.ts:59] 真正的 send 墙钟在 `LocalPtySession.startSend` 的 `setTimeout(..., this.config.timeoutMs)`，settle 成 `waitReason: 'timeout'`，**不是** `TOOL_TIMEOUT`。[E: packages/terminal/terminal-bash/src/session.ts:251]
- **approval：** 普通调用不 `ask`。没有 sandbox escalation 字段。
- **sandbox：** 不挂 pre-execute。confine 发生在 backend `spawn`，之后的 send / read / signal 复用那条已 confine 的 PTY。owner 仍有 live / pending 会话时，`terminal-bash` 用 `internal/dispatch` 拦住 `sandbox/mode` 变更。[E: packages/terminal/terminal-bash/src/index.ts:49]
- **并行：** 六个名字都未声明 `isConcurrencySafe`，`executionMode` fail-closed 为 exclusive。[E: packages/core/tools/src/index.ts:1278] registry 层还会在 `SEND_ACTIVE` 上拒绝同一 session 的重叠 send。
- **Code Mode：** 四个 shipped preset 都不装本包，所以默认产品 catalog 不会把这六个名字 fold 进 `run_code`。若某组合在 `mode: code` 下再挂本包，无 `parent` 的模型直调会在进 waterfall 前 `collapses`（`name !== RUN_CODE_NAME`）。[E: packages/core/tools/src/index.ts:1325]

## Preset 装配

成员资格只认 `apps/cli/config/agent-presets/{minimal,standard,code,cordis}/agent.cordis.yml`。四个文件全文都**没有** `@deepseek-ai/dsh-tool-terminal` / `tool-terminal` 行 [I]（对每个文件搜索无命中）。因此 Preset 表每一格都是「未装」——不要把 `minimal` 的 `dsh-terminal` + `dsh-terminal-bash` 误当成装了这六件套。

| preset | 装 `@deepseek-ai/dsh-tool-terminal`？ | `disabled` | isolate / 对照行 |
|---|---|---|---|
| `minimal` | **否**。同组装的是 `@deepseek-ai/dsh-terminal` + `@deepseek-ai/dsh-terminal-bash` + `@deepseek-ai/dsh-tool-bash-persistent`（模型看见的是 `bash`，不是 `terminal_*`） | — | `isolate.terminals: true` 包住 registry / backend / persistent bash [E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:22] [E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:25] [E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:28] [E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:33] |
| `standard` | **否**。shell 行是 one-shot `@deepseek-ai/dsh-tool-bash` | — | [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:45] |
| `code` | **否**。同样只挂 `dsh-tool-bash` | — | [E: apps/cli/config/agent-presets/code/agent.cordis.yml:52] |
| `cordis` | **否**。同样只挂 `dsh-tool-bash` | — | [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:46] |

组合旁注（**不是** preset 成员资格）：

- shipped host `dsh-base` 也不 insert 本包 [I]（`packages/bundle/base/cordis.patch.yml` 无 `@deepseek-ai/dsh-tool-terminal`）。
- 非 shipped 装配会显式 insert。`examples/headless-agent/e2b.cordis.yml` 在 E2B overlay 里挂 `dsh-terminal` + `dsh-terminal-bash` + `dsh-tool-terminal`。[E: examples/headless-agent/e2b.cordis.yml:40] [E: examples/headless-agent/e2b.cordis.yml:41] `examples/acp-agent/pty.cordis.yml` 同样 insert `id: tool-terminal` / `name: '@deepseek-ai/dsh-tool-terminal'`，并给 `terminal-bash` 配了短 poll / idle / timeout 以便 snapshot。[E: examples/acp-agent/pty.cordis.yml:20] [E: examples/acp-agent/pty.cordis.yml:21]

## execute() 走读

公共前缀对六个名字都成立。

1. `defineTool` 包装的 `execute` 先 `validateJsonSchemaValue`，违规抛 `ToolArgsError`，再进用户 `execute`。[E: packages/core/tools/src/schema.ts:586]
2. `requireAgent(exec.agent)`：没有 initiating agent 直接抛 `terminal tools require an initiating agent`。测试：无 agent 的 `terminal_open` 是 `isError`。[E: packages/terminal/tool-terminal/src/index.ts:118] [E: packages/terminal/tool-terminal/tests/tools.spec.ts:271]
3. 带 `sessionId` 的五个名字走 `sessionId(args)`：空串抛 `sessionId must be a non-empty string`，否则 `TerminalSessionId(...)` 品牌化。[E: packages/terminal/tool-terminal/src/index.ts:123]

### `terminal_open`

4. 空 `type` 抛 `type must be a non-empty string`。[E: packages/terminal/tool-terminal/src/index.ts:183]
5. `ctx.terminals.spawn(owner, { type, name?, cwd? }, exec.signal)`。registry 查 backend；未知 `type` → `NO_BACKEND`。成功则 `sessions.set` 并返回 snapshot + `motd`。[E: packages/terminal/tool-terminal/src/index.ts:184] [E: packages/terminal/terminal/src/index.ts:159] [E: packages/terminal/terminal/src/index.ts:194]
6. `terminal-bash` 路径：`ensureSandboxModeFence` → `sandboxPolicy.resolve` → 组 argv（可能 `sandbox.confine`）→ `subprocess.spawnTerminal`，`cwd` 回退 `policy.workspaceRoot`，env 带 `TERM=dumb` / 受控 `PS1` / `DSH_PTY_SESSION_ID` → `LocalPtySession.initialize`（一次空 send 采 MOTD）。[E: packages/terminal/terminal-bash/src/index.ts:121] [E: packages/terminal/terminal-bash/src/index.ts:127] [E: packages/terminal/terminal-bash/src/session.ts:212]

### `terminal_send`

7. `request = { text, submit: args.submit ?? true }`。[E: packages/terminal/tool-terminal/src/index.ts:249]
8. **后台** `run_in_background === true`：检查开关与 `ctx.jobs`；`jobs.start({ kind: 'pty-send', owner, outputLimitBytes: maxResultBytes, run })`。`run()` **立刻** `startSend(owner, id, request)`（**不**把 `exec.signal` 传进 PTY）；`job_kill` 调 `operation.cancel()`（backend 侧是 SIGINT 打断），并把 outcome 标 `killed`。[E: packages/terminal/tool-terminal/src/index.ts:255] [E: packages/terminal/tool-terminal/src/index.ts:261] [E: packages/terminal/tool-terminal/src/index.ts:265] [E: packages/jobs/jobs-local/src/index.ts:150] 完成 detail 是 `wait: ${waitReason}`，或会话已退出时 `session exited: ${exitCode ?? signal ?? 'unknown'}`。[E: packages/terminal/tool-terminal/src/index.ts:141] [E: packages/terminal/tool-terminal/tests/tools.spec.ts:485]
9. **前台** `startSend(owner, id, { ...request, signal: exec.signal })`，`await operation.done`；若 `exec.signal.aborted` 再抛 `terminal send aborted`（测试：abort 后 cancel，结果 `isError`）。[E: packages/terminal/tool-terminal/src/index.ts:277] [E: packages/terminal/tool-terminal/src/index.ts:279] [E: packages/terminal/tool-terminal/tests/tools.spec.ts:463]
10. backend 在同一会话已有 active send / 正在 close / 写之前就 abort 时分别抛 `SEND_ACTIVE`、`PTY session … is closing`、`PTY send aborted before write`。[E: packages/terminal/terminal/src/index.ts:245] [E: packages/terminal/terminal/src/index.ts:246] [E: packages/terminal/terminal-bash/src/session.ts:236]
11. `terminal-bash` settle 顺序（决定模型看到的 `waitReason`）：session 已退出 → `session_exit`；prompt + shell 重新占前台 → `stdin_read`；exact probe 看到 stdin wait → `stdin_read`；静默 ≥ `idleSilenceMs` + 可选 `handoffGraceMs` → `inferred_idle`；墙钟 → `timeout`。[E: packages/terminal/terminal-bash/src/session.ts:438] [E: packages/terminal/terminal-bash/src/session.ts:448] [E: packages/terminal/terminal-bash/src/session.ts:456] [E: packages/terminal/terminal-bash/src/session.ts:465]

### `terminal_read`

12. `ctx.terminals.read(owner, id, { offset?, count? })`。`terminal-bash` 默认 `offset=0`、`count=500`，再按 `maxReadBytes`（默认 256 KiB）截尾。[E: packages/terminal/tool-terminal/src/index.ts:320] [E: packages/terminal/terminal-bash/src/session.ts:321] [E: packages/terminal/terminal-bash/src/config.ts:52]

### `terminal_signal`

13. `ctx.terminals.signal(owner, id, args.signal)` → backend `signalForeground`。本地 subprocess：解析不到前台组就抛；`SIGKILL` 且 `processGroupId === shell pid` 抛 `refusing to SIGKILL the terminal shell; terminate the terminal session instead`。[E: packages/terminal/tool-terminal/src/index.ts:349] [E: packages/subprocess/subprocess-local/src/terminal.ts:98] [E: packages/subprocess/subprocess-local/src/terminal.ts:99]

### `terminal_close`

14. `ctx.terminals.kill(owner, id)`（默认 reason `'model request'`）。第一次 close 等到 `session.close` 后 `sessions.delete`，回 `{ outcome: 'closed' }`；已有 `closing` Promise 则 await 它并回 `{ outcome: 'already-closing' }`。[E: packages/terminal/tool-terminal/src/index.ts:379] [E: packages/terminal/terminal/src/index.ts:285] [E: packages/terminal/terminal/src/index.ts:289]

### `terminal_list`

15. `ctx.terminals.list(owner)`：按 publication 顺序过滤 `record.owner === owner`，映射 snapshot。关光之后渲染 `(no terminal sessions)`。[E: packages/terminal/tool-terminal/src/index.ts:395] [E: packages/terminal/terminal/src/index.ts:310] [E: packages/terminal/tool-terminal/tests/tools.spec.ts:185]

## 设计动机·edge

- **六件套 vs 一个 `bash`：** 同一条 `ctx.terminals` 缝上有两套模型 API。本包暴露 session 生命周期，让模型自己 track id、做 REPL / gdb 这类跨调用交互。`dsh-tool-bash-persistent` 把 spawn/send/读回藏进单次 `bash`，是 `minimal` 的选择，不是把 `timeoutMs` 调大之后的 six-tool 模式。[E: packages/shell/tool-bash-persistent/src/index.ts:375] [E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:33]
- **四个 shipped preset 故意不装。** 默认产品里要么 one-shot `bash`（standard/code/cordis），要么 persistent `bash`（minimal）。要六件套必须像 e2b / acp 示例那样自己 insert。
- **`inferred_idle` / `timeout` ≠ 命令结束。** prompt section 把这句话写给模型；`waitReason` 只说明这次 send 为什么把控制权交回来。长命令、pager、等 stdin 的 REPL 都可能在 `running` 时返回。[E: packages/terminal/tool-terminal/src/index.ts:159]
- **对着 shell 的硬杀走 `terminal_close`。** schema 仍广告 `SIGKILL`（可以杀前台**子**进程组）；本地 `signalForeground` 拒绝 `processGroupId === this.pid` 的 `SIGKILL`。[E: packages/terminal/tool-terminal/src/index.ts:334] [E: packages/subprocess/subprocess-local/src/terminal.ts:99]
- **精确 Agent 所有权。** `list` 不会看到别人的 PTY；错 owner 不是「不属于本 session」而是 `belongs to another agent`。owner dispose 时 registry `abortAndClose` 整棵树。[E: packages/terminal/terminal/src/index.ts:390] [E: packages/terminal/terminal/src/index.ts:425]
- **同一会话一次 send。** 重叠 send 是 `SEND_ACTIVE`，不是排队。后台 send 占着 active slot，直到 job 完成或 `job_kill` cancel。
- **没有 spill。** 和大输出的 one-shot `bash` 不同，这里只有内存 `TextRetainer` + `[output truncated]`。`MIN_MAX_RESULT_BYTES = 64` 是为了让 `pty-N` / `pty-send-N` 回执在最小帽下仍能辨认。[E: packages/terminal/tool-terminal/src/index.ts:32]
- **后台依赖 jobs 组合，但不 inject。** 只装本包、不装 `dsh-jobs` + `dsh-tool-jobs` 时，六个名字仍注册，唯独后台 send 失败。id 前缀是 `pty-send`，不是 `bash`。
- **sandbox 模式不能在 PTY 活着时改。** `terminal-bash` 在 owner 上挂 fence：有 published 或 pending spawn 时拒绝 `sandbox/mode` 事件。[E: packages/terminal/terminal-bash/src/index.ts:49]
- **请求形状是白名单。** 模型不能把 `env` / `rows` / `timeoutMs` 塞进这六个 schema；那些是 backend / 插件 Config。

## Sources

- packages/terminal/tool-terminal/src/index.ts
- packages/terminal/tool-terminal/src/render.ts
- packages/terminal/tool-terminal/package.json
- packages/terminal/tool-terminal/tests/tools.spec.ts
- packages/terminal/tool-terminal/tests/render.spec.ts
- packages/terminal/tool-terminal/tests/loader-composition.spec.ts
- packages/terminal/terminal/src/index.ts
- packages/terminal/terminal/src/types.ts
- packages/terminal/terminal-bash/src/index.ts
- packages/terminal/terminal-bash/src/config.ts
- packages/terminal/terminal-bash/src/session.ts
- packages/shell/tool-bash-persistent/src/index.ts
- packages/jobs/jobs/src/types.ts
- packages/jobs/jobs-local/src/index.ts
- packages/core/tools/src/index.ts
- packages/core/tools/src/schema.ts
- packages/guard/timeout-policy/src/index.ts
- packages/subprocess/subprocess-local/src/terminal.ts
- apps/cli/config/agent-presets/minimal/agent.cordis.yml
- apps/cli/config/agent-presets/standard/agent.cordis.yml
- apps/cli/config/agent-presets/code/agent.cordis.yml
- apps/cli/config/agent-presets/cordis/agent.cordis.yml
- examples/headless-agent/e2b.cordis.yml
- examples/acp-agent/pty.cordis.yml

## 相关

- [工具调用解剖](../../spine/tool-call-anatomy.md)（`spine.tool-call-anatomy`）：`tools/pre-execute → execute → post-execute`、approval / timeout wrapper / Code Mode collapse。
- [模型可见工具目录](../../reference/tools-catalog.md)（`ref.tools-catalog`）：boot 后 `ctx.tools.schemas()` 名录。
- [bash 一次性执行](bash.md)（`surface.tools.bash`）：`dsh-tool-bash`、`ctx.shell`、one-shot `bash -c`；standard/code/cordis 的默认 shell。
- [bash 持久 PTY](bash-persistent.md)（`surface.tools.bash-persistent`）：同缝 `ctx.terminals`、单 wire 名 `bash`；minimal 装的是它而不是本六件套。
- [job_list / job_output / job_kill](jobs.md)（`surface.tools.jobs`）：收集 / 停止 `pty-send` 后台 send。
- [terminals PTY 缝](../../subsystems/execution/terminal.md)（`subsys.execution.terminal`）：`ctx.terminals` Definition / Provider，不是本页的模型 schema。
- [jobs 运行时](../../subsystems/orchestration/jobs.md)（`subsys.orchestration.jobs`）：`ctx.jobs` registry 与 id 前缀。
