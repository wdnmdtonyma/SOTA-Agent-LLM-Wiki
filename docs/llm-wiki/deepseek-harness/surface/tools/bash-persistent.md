---
id: surface.tools.bash-persistent
title: bash 持久 PTY
kind: tool
tier: T1
pkg: execution
source:
  - packages/shell/tool-bash-persistent/src/index.ts
  - packages/shell/tool-bash-persistent/package.json
  - packages/shell/tool-bash-persistent/tests/tools.spec.ts
  - packages/shell/tool-bash-persistent/tests/loader-composition.spec.ts
  - packages/terminal/terminal/src/index.ts
  - packages/terminal/terminal-bash/src/index.ts
  - packages/terminal/terminal-bash/src/config.ts
  - packages/core/tools/src/index.ts
  - packages/guard/timeout-policy/src/index.ts
  - packages/session/session-checkpoint-policy/src/index.ts
  - packages/util/timeout/src/index.ts
  - packages/preset/agent-presets/src/mount.ts
  - apps/cli/config/agent-presets/minimal/agent.cordis.yml
  - apps/cli/config/agent-presets/standard/agent.cordis.yml
  - apps/cli/config/agent-presets/code/agent.cordis.yml
  - apps/cli/config/agent-presets/cordis/agent.cordis.yml
symbols:
  - name
  - apply
  - Config
  - inject
  - DEFAULT_DESCRIPTION
  - registerPersistentBash
  - executeCommand
  - persistentShells
related:
  - spine.tool-call-anatomy
  - ref.tools-catalog
  - surface.tools.bash
  - subsys.execution.terminal
evidence: explicit
status: verified
updated: 47f943859b
---

> 模型可见名是 `bash`（不是 `bash_persistent`），实现包是 `@deepseek-ai/dsh-tool-bash-persistent`：按 owning `Agent` 复用一条 `ctx.terminals` PTY，cwd 与 exported 环境跨调用持久。它与 one-shot 包 `@deepseek-ai/dsh-tool-bash` 共享 wire 名、不是后者的 Config 开关。

## 能回答的问题

- 模型看到的 `bash` 在 `minimal` 里是哪一个包？为什么不是 `bash_persistent`？
- 默认 Config boot 后，模型可见 schema 有哪些字段？`timeoutMs` / `maxOutputChars` / `description` 会不会进 parameters？
- 状态（cwd、`export`）怎样跨调用保留？`exit` / 超时 / abort 之后下一次从哪开始？
- 输出怎样截断？有没有 spill 文件？丢失 scrollback 开头时模型看到什么？
- `tools/pre-execute → execute → post-execute` 上，本工具挂了 approval / sandbox / `ToolDefinition.timeoutMs` 吗？
- 四个 shipped preset 谁装 `@deepseek-ai/dsh-tool-bash-persistent`？`isolate.terminals` 包了哪些行？

## Identity

包名是 `@deepseek-ai/dsh-tool-bash-persistent`。[E: packages/shell/tool-bash-persistent/package.json:2] Cordis 插件名是 `export const name = 'tool-bash-persistent'`，`inject` 是 `['tools', 'terminals']`。[E: packages/shell/tool-bash-persistent/src/index.ts:401] [E: packages/shell/tool-bash-persistent/src/index.ts:402]

`apply(ctx, config)` 校验 Config 后调用 `registerPersistentBash`。[E: packages/shell/tool-bash-persistent/src/index.ts:425] 注册点是 `ctx.tools.register(defineTool({ name: 'bash', ... }))`：模型 catalog / `ctx.tools.execute({ name: 'bash' })` 用的 wire 名是 `bash`。[E: packages/shell/tool-bash-persistent/src/index.ts:374] [E: packages/shell/tool-bash-persistent/src/index.ts:375] 默认 description 常量 `DEFAULT_DESCRIPTION` 写明 state（含 cwd 与 exported env）对本 agent 跨调用持久。[E: packages/shell/tool-bash-persistent/src/index.ts:25]

stub 与真实 Loader 组合都断言 `ctx.tools.schemas()` 只有一项且 `name === 'bash'`。[E: packages/shell/tool-bash-persistent/tests/tools.spec.ts:305] [E: packages/shell/tool-bash-persistent/tests/loader-composition.spec.ts:133] `presentCall` 产出 `{ card: 'terminal', title: args.command }`。[E: packages/shell/tool-bash-persistent/src/index.ts:397]

同名不同包：`standard` / `code` / `cordis` 装的是 `@deepseek-ai/dsh-tool-bash`（one-shot，`ctx.shell`），见 [bash 一次性执行](bash.md)。本页只描述 persistent 这一包。

## 用途定位

本工具把「一次 bash 调用」映射成对**同一条** owner-scoped PTY 的一次 `startSend`。第一次调用按 `owner.session.header.cwd` spawn；Loader 组合测试钉死随后的 `cd` 与 `export KEEP` 仍在下一次 `bash` 里可见。[E: packages/shell/tool-bash-persistent/src/index.ts:233] [E: packages/shell/tool-bash-persistent/tests/loader-composition.spec.ts:134]

它**不是** one-shot `bash -c`：没有模型可见的 `workdir` / `run_in_background` / `sandbox_permissions`，也不走 `ctx.jobs`。长命令若要脱离这次 tool-call 的墙钟，只能在 bash 里 `&`——`minimal` 用 `description: |-` 覆盖默认文案，其中写明用 background 跑长命令。[E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:36]

同一 `Agent` 上的并发 `bash` 调用被 `serialized()` 排成单队列；不同 `Agent` 各有自己的 live session。[E: packages/shell/tool-bash-persistent/src/index.ts:362] [E: packages/shell/tool-bash-persistent/src/index.ts:238]

## 输入 schema

模型可见 schema 由 `defineTool.parameters` 投影；`schemaOf` 只拿出 `name` / `description` / `parameters`，Config 数字键不会变成模型参数。[E: packages/core/tools/src/index.ts:1257] 默认 Config 下 parameters **只有** `command`：

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---|---|---|---|
| `command` | `string` | 是 | 无 | `trim()` 后非空，否则 `execute` 抛 `command must be a non-empty string` | 交给 persistent bash 的命令；description 建议相对路径。[E: packages/shell/tool-bash-persistent/src/index.ts:378] [E: packages/shell/tool-bash-persistent/src/index.ts:389] |

测试钉死 `required: ['command']` 且 `properties.command.type === 'string'`。[E: packages/shell/tool-bash-persistent/tests/tools.spec.ts:308]

`ctx.fs.sandboxMode` **不**改本工具的参数名。没有 `timeout` / `timeoutMs` / `workdir` / `run_in_background` / `sandbox_permissions` / `justification` 模型字段。

插件 Config（Schemastery，部署改的是 description 与墙钟，不是 schema 形状）：

| Config 键 | 类型 | 默认 | 约束 | 作用 |
|---|---|---|---|---|
| `backendType` | `string` | `'shell'` | trim 后非空 | `ctx.terminals.spawn(..., { type })` 选哪个 PTY backend。[E: packages/shell/tool-bash-persistent/src/index.ts:418] |
| `timeoutMs` | `number` | `300000` | 正 safe integer | **单条命令**墙钟，经 `deadline(..., TIMEOUT_CODE)`；不是 `defineTool.timeoutMs`。[E: packages/shell/tool-bash-persistent/src/index.ts:419] [E: packages/shell/tool-bash-persistent/src/index.ts:280] |
| `maxOutputChars` | `number` | `16000` | 正 safe integer | 命令输出字符上限，超出则 clip。[E: packages/shell/tool-bash-persistent/src/index.ts:420] |
| `description` | `string` | `DEFAULT_DESCRIPTION` | trim 后非空 | 模型看见的 tool description；`minimal` 整段覆盖。[E: packages/shell/tool-bash-persistent/src/index.ts:421] |

非法 Config 在 `apply` 立刻抛，例如 `timeoutMs: 0` → `timeoutMs must be a positive safe integer`。[E: packages/shell/tool-bash-persistent/src/index.ts:436] [E: packages/shell/tool-bash-persistent/tests/tools.spec.ts:564]

## 输出 & 截断 / spill

canonical output 是 `string`；`render` 变成单块 `{ type: 'text', text: value }`。[E: packages/shell/tool-bash-persistent/src/index.ts:385] 本包**不写 spill 文件**，也不报告「完整输出已存到某路径」。截断全在进程内：

1. `maybeTruncate`：长度 `<= maxOutputChars` 且 `incomplete === false` 原样返回；否则保留**前缀** `slice(0, maxOutputChars)` 再拼 `TRUNCATED_MESSAGE`（`<response clipped>…grep -n…`）。[E: packages/shell/tool-bash-persistent/src/index.ts:59]
2. `incomplete === true` 且正文非空时，再在前面加 `LOST_PREFIX_MESSAGE`（scrollback 丢掉了命令开头）。[E: packages/shell/tool-bash-persistent/src/index.ts:174]
3. 命令以标记完整结束且 `exitCode !== 0` 时追加 `[exit code: N]`。[E: packages/shell/tool-bash-persistent/src/index.ts:178]
4. PTY 在报出命令 status 前死掉：改用 `[shell exited: code N]` / `[shell killed by signal: SIG]` / `[shell exited]`，再追加 `SHELL_RESET_MESSAGE`。[E: packages/shell/tool-bash-persistent/src/index.ts:193] [E: packages/shell/tool-bash-persistent/src/index.ts:17]
5. 墙钟超时：三行拼起来——timeout 文案（含 “or experienced an OOM error” 字面）、bounded 部分输出、`SHELL_RESET_MESSAGE`。[E: packages/shell/tool-bash-persistent/src/index.ts:317]

旧 scrollback 页上的 `truncated` 旗标**不会**算到一条已经拿齐 start/end 标记的当前命令上。[E: packages/shell/tool-bash-persistent/tests/tools.spec.ts:451] Loader 组合里 `seq 1 12050` 以 `'1\n2\n3\n'` 开头并含 `<response clipped>`，不含 “beginning of this command output was dropped”。[E: packages/shell/tool-bash-persistent/tests/loader-composition.spec.ts:154]

诊断字符串（clip note、lost-prefix、`[exit code:]`、timeout 头、reset 句）加在 `maxOutputChars` 切完之后，结果可以比 16000 更长。[I]

## 背后的 seam

| 角色 | 实体 | 位置 |
|---|---|---|
| Definition | `Context.terminals: TerminalSessionService` | `packages/terminal/terminal` 给 Cordis `Context` 扩 `terminals`。[E: packages/terminal/terminal/src/index.ts:50] |
| Provider | `TerminalSessionService`（`super(ctx, 'terminals')`）+ 已注册 `TerminalBackend` | spawn / startSend / read / kill / list 都要求 **exact** owning `Agent`。[E: packages/terminal/terminal/src/index.ts:116] [E: packages/terminal/terminal/src/index.ts:154] |
| Consumer | `@deepseek-ai/dsh-tool-bash-persistent` | `inject = ['tools', 'terminals']`；body 只打 `ctx.terminals.*`，不碰 `ctx.shell`。[E: packages/shell/tool-bash-persistent/src/index.ts:402] |
| 默认 backend | `@deepseek-ai/dsh-terminal-bash` | `registerBackend`；`type` 来自自身 Config `backendType`，默认 `'shell'`，与本工具默认 `backendType: 'shell'` 对齐。[E: packages/terminal/terminal-bash/src/index.ts:152] [E: packages/terminal/terminal-bash/src/config.ts:45] |

换掉 `ctx.terminals` 的 Provider（或 `isolate.terminals` 里另一份实例）会带走：session id 分配、owner 鉴权、scrollback 分页、`startSend` 互斥（`SEND_ACTIVE`）、kill/list。换掉 `type: 'shell'` 的 backend 会带走 argv / env / 是否 `sandbox.confine`。

`dsh-terminal-bash` 在 spawn 时 `sandboxPolicy.resolve({ session })`；`mode === 'danger-full-access'` 直接跑配置里的 shell argv，否则必须有 `ctx.sandbox`，用 `sandbox.confine` 的 argv，缺 provider 抛错而不是裸跑。[E: packages/terminal/terminal-bash/src/index.ts:73] [E: packages/terminal/terminal-bash/src/index.ts:76] 本工具 schema **不**广告 escalation 字段；升权不是这条 `bash` 的模型参数。

本包不 `inject` `systemPrompt` / `shellEnv` / `jobs` / `approval`。

## 执行管线

模型写出 `name: 'bash'` 的 `tool-call` 后，默认 loop 经 `executeToolCalls` 调 `ctx.tools.execute`。`ToolRuntime.execute` 先 `prepare`（`tools/pre-execute` → 可选 `ask` → 单调 guard），再 `dispatch`（`tools/execute` waterfall，叶子 `ToolDefinition.execute`），成功/deny 的 `post-result` 再走 `tools/post-execute`。[E: packages/core/tools/src/index.ts:1342] [E: packages/core/tools/src/index.ts:1475] [E: packages/core/tools/src/index.ts:1573]

本包**不**注册 `tools/pre-execute` / `tools/post-execute` listener，也不在 body 里 `approval.request` / `approveEscalation`。默认 `pre-execute` 的 `next()` 是 `{ kind: 'allow' }`。[E: packages/core/tools/src/index.ts:1477] 没有 listener 返回 `ask` 时，这条 `bash` 不经过 `ctx.approval`。

`defineTool({...})` **省略** `timeoutMs`。host 上的 `@deepseek-ai/dsh-tool-call-timeout-policy` 读 `ctx.tools.get(name)?.timeoutMs`，为 `undefined` 时原样 `next()`，**不会**套 `TOOL_TIMEOUT`。[E: packages/guard/timeout-policy/src/index.ts:59] 墙钟只在 `executeCommand` 里：`deadline(upstream, config.timeoutMs, 'PERSISTENT_BASH_TIMEOUT')`。[E: packages/shell/tool-bash-persistent/src/index.ts:280] [E: packages/util/timeout/src/index.ts:91]

Sandbox **不**挂在 `pre-execute`。文件/进程 confinement 若发生，是 `dsh-terminal-bash` spawn 时的 `ctx.sandbox.confine`，不是本工具的 schema 字段。

Top-level（无 `parent`）调用仍会撞上 host `dsh-session-checkpoint-policy`：`exec.parent !== undefined` 直接 `next()`，否则 `sessions.flush`，已 abort 则 `ABORTED_BEFORE_DISPATCH`。[E: packages/session/session-checkpoint-policy/src/index.ts:71] [E: packages/session/session-checkpoint-policy/src/index.ts:72]

`isConcurrencySafe` 未声明 → `executionMode` 为 `exclusive`，调度层一次只放行一条。[E: packages/core/tools/src/index.ts:1278] 即便将来被标成 parallel，`serialized(owner)` 仍按 owner 串行化 send。

## Preset 装配

成员资格只认 `apps/cli/config/agent-presets/*/agent.cordis.yml`，不以 workspace 里有没有这个 package 为准。

| preset | 是否装本包 | `disabled` | isolate | 本包 Config |
|---|---|---|---|---|
| `minimal` | 是：`id: persistent-bash`，`name: '@deepseek-ai/dsh-tool-bash-persistent'` | 无（yml 未写 `disabled`） | 外层 group `id: persistent-shell`，`isolate.terminals: true` | `timeoutMs: 300000`；`description: |-` 整段覆盖 [E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:22] [E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:33] [E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:35] [E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:36] |
| `standard` | 否。shell 行是 `@deepseek-ai/dsh-tool-bash` | 不适用本包 | 无 `isolate.terminals` 组 | — [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:45] |
| `code` | 否。同样是 `@deepseek-ai/dsh-tool-bash` | 不适用本包 | 无本包组 | — [E: apps/cli/config/agent-presets/code/agent.cordis.yml:52] |
| `cordis` | 否。同样是 `@deepseek-ai/dsh-tool-bash` | 不适用本包 | 无本包组 | — [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:46] |

`minimal` 的 `persistent-shell` group 同一 `isolate.terminals` 域里还有：`@deepseek-ai/dsh-terminal`（`id: pty`）和 `@deepseek-ai/dsh-terminal-bash`（`id: terminal-bash`，`timeoutMs: 300000`，这是 **backend send 等待上限**；该包默认是 `30_000`）。[E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:25] [E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:30] [E: packages/terminal/terminal-bash/src/config.ts:57] 预设若把 service 发到 root realm，`leakedServices` 会把它算进 `root[Context.isolate]` 并让 `mountPreset` 失败，所以 `terminals` 必须留在 `isolate` 域里。[E: packages/preset/agent-presets/src/mount.ts:200] [E: packages/preset/agent-presets/src/mount.ts:365]

`minimal` 另有 `isolate.fs` 组给 `str_replace_editor`，与本工具无关。`maxOutputChars` 在 shipped `minimal` **未**覆盖，保持默认 16000。

## execute() 走读

1. `registerPersistentBash@packages/shell/tool-bash-persistent/src/index.ts` 建 `persistentShells(ctx, config)`（owner → `TerminalSessionId` 缓存）和 `WeakMap<Agent, Promise<void>>` 队列，然后 `defineTool` 注册 `bash`。[E: packages/shell/tool-bash-persistent/src/index.ts:359]

2. `execute(args, exec)`：`command.trim()` 为空抛错；`exec.agent` 缺失抛 `bash requires an owning agent session`；否则 `serialized(owner, …)`，进队列后立刻 `exec.signal.throwIfAborted()`，再 `executeCommand`。[E: packages/shell/tool-bash-persistent/src/index.ts:388] 已 abort 的调用不会 spawn。[E: packages/shell/tool-bash-persistent/tests/tools.spec.ts:557]

3. `serialized`：`prior.then(operation, operation)`——上一次失败也会放行下一次。settled 后若队列尾仍是自己则 `delete`。[E: packages/shell/tool-bash-persistent/src/index.ts:364]

4. `executeCommand`：`using commandDeadline = deadline(upstream, config.timeoutMs, 'PERSISTENT_BASH_TIMEOUT')`，再 `shells.get(owner, commandDeadline.signal)`。[E: packages/shell/tool-bash-persistent/src/index.ts:280]

5. `persistentShells.get`：已有 `pending` Promise 则复用。否则 `AbortSignal.any([signal, lifecycle.signal])`，`ctx.terminals.spawn(owner, { type: config.backendType, cwd? })`（仅当 `owner.session.header.cwd` 有值才传 `cwd`），写入 `live`。[E: packages/shell/tool-bash-persistent/src/index.ts:234] 首次成功后给 `owner.ctx` 挂 cache cleanup（只删 map，不 kill PTY）。[E: packages/shell/tool-bash-persistent/src/index.ts:241]

6. spawn 成功立刻 `startSend` 一行初始化：`stty -echo; PS1=<quoted SHELL_PROMPT>`，`submit: true`。`sessionStatus.kind === 'exited'` 或 `waitReason === 'timeout'` 视为初始化失败，`reset(owner, 'persistent bash initialization failed')` 再抛。[E: packages/shell/tool-bash-persistent/src/index.ts:247] [E: packages/shell/tool-bash-persistent/src/index.ts:252] `SHELL_PROMPT` 是 `__DSH_PERSISTENT_BASH_PROMPT__ `。[E: packages/shell/tool-bash-persistent/src/index.ts:18]

7. 命令侧：`markers()` 用 `randomUUID()` 生成 `__DSH_PERSISTENT_BASH_START_<nonce>__` 与 `__DSH_PERSISTENT_BASH_END_<nonce>:`。`wrapCommand` 把整条用户命令 `$'…'` 引用后放进**单行** `printf start; eval -- cmd; status=$?; printf end$status`，避免交互 bash 打 PS2 把包装源码漏进结果。[E: packages/shell/tool-bash-persistent/src/index.ts:82]

8. 循环：第一次 `startSend({ text: wrapped, submit: true, signal: commandDeadline.signal })`；之后 `text: ''`、`submit: false` 只是再等。[E: packages/shell/tool-bash-persistent/src/index.ts:292] `startSend` 抛错 → `reset(..., 'persistent bash send failed')` 再抛，下次 `get` 会新开壳。[E: packages/shell/tool-bash-persistent/src/index.ts:300]

9. 每次 settled 后拼 fallback（优先 `readOutput().delta`），`read` 一页 `SCROLLBACK_PAGE_LINES`（1000）最新行。`timeoutOf(commandDeadline.signal, TIMEOUT_CODE)` 命中：`retainedScrollback` + `partialOutput` → `renderCaptured`，`reset(..., 'persistent bash command timed out')`，返回 timeout 头 + 部分输出 + reset 句。[E: packages/shell/tool-bash-persistent/src/index.ts:307] [E: packages/shell/tool-bash-persistent/src/index.ts:314]

10. 若是调用方 abort 而不是本工具的 timeout code：`reset(..., 'persistent bash command aborted')` 然后 `throwIfAborted()`。[E: packages/shell/tool-bash-persistent/src/index.ts:322] 队列里下一条会在新壳上跑。[E: packages/shell/tool-bash-persistent/tests/tools.spec.ts:487]

11. `latest.text` 含 end marker 时 `commandOutput(retainedScrollback(...))`：从 end 后面读 `^(\d+)\r?\n` 当 exit code；缺数字（torn status）返回 `undefined`，继续 poll。齐了则 `renderCaptured` 返回，**不** reset 壳。[E: packages/shell/tool-bash-persistent/src/index.ts:326] [E: packages/shell/tool-bash-persistent/src/index.ts:99]

12. `sessionStatus.kind === 'exited'`：partial + `renderShellExitStatus` + `SHELL_RESET_MESSAGE`，`reset(..., 'persistent bash shell exited')`。下一次从 workspace cwd 新壳开始；Loader 测试里 `exit` 后再 `printf "$PWD"` 等于当初的 root。[E: packages/shell/tool-bash-persistent/src/index.ts:330] [E: packages/shell/tool-bash-persistent/tests/loader-composition.spec.ts:159]

13. viewport 以 `SHELL_PROMPT` / `PROMPT\r\n` / `PROMPT\n` 结尾（语法错误等没打出 end marker）：按 `partialOutput` 出结果，剥掉 prompt 文本，**不** reset。[E: packages/shell/tool-bash-persistent/src/index.ts:110] [E: packages/shell/tool-bash-persistent/src/index.ts:342]

14. 若仍未 settle 则 `pause()` 25ms 再 poll。[E: packages/shell/tool-bash-persistent/src/index.ts:23] 插件 `ctx.effect` dispose 会 `lifecycle.abort`、等 in-flight create、对 `live` 里仍列在 `terminals.list` 的 session `kill(..., 'tool-bash-persistent disposed')`。[E: packages/shell/tool-bash-persistent/src/index.ts:213] [E: packages/shell/tool-bash-persistent/src/index.ts:215]

`retainedScrollback` 从最新页往更旧的 `lineEnd` 翻页拼接；缺 start marker 时 `commandOutput.incomplete` / `partialOutput` 走 lost-prefix 路径。[E: packages/shell/tool-bash-persistent/src/index.ts:150]

## 设计动机·edge

DSH **没有** first-class `apply_patch`；本工具也不是 editor，只是 persistent PTY 上的 `eval`。和 Codex `apply_patch` / Claude `Edit` / Pi edit 无关——`minimal` 的文件面是 `str_replace_editor`，不是这条 `bash`。

独有 / 易踩点：

- **同名碰撞。** catalog 里都叫 `bash`。看 preset 行是 `@deepseek-ai/dsh-tool-bash-persistent` 还是 `@deepseek-ai/dsh-tool-bash`，不能只看 wire 名。
- **只在 `minimal`。** `standard` / `code` / `cordis` 的 `bash` 是 one-shot `ctx.shell`，每次新进程、无 cwd 记忆。
- **超时会拆壳。** Config `timeoutMs` 到期会 kill 当前 PTY 并告诉模型「next bash call starts from the workspace」。timeout 文案带 “or experienced an OOM error”，进入该分支的条件只有 `timeoutOf(..., 'PERSISTENT_BASH_TIMEOUT')`，没有单独的 OOM 探测器。[E: packages/shell/tool-bash-persistent/src/index.ts:307] [I]
- **abort 同样拆壳。** 即使 abort 瞬间 end marker 已经出现（`end-on-abort` stub），实现仍 reset，结果走 isError，不把那次输出交给模型。[E: packages/shell/tool-bash-persistent/tests/tools.spec.ts:472]
- **截断留前缀。** 对比 one-shot bash（常见是 tail + spill 路径），这里是 head clip、无 spill。
- **包装必须单行。** 多行用户命令被 `$'…\n…'` 引用后仍是一条 wrapper；heredoc / 内嵌引号由 `quoteForBash` 处理。Loader 测试覆盖 `value="line one"\nprintf…` 与 `cat <<'EOF'`。[E: packages/shell/tool-bash-persistent/tests/loader-composition.spec.ts:139]
- **两口钟。** 工具 Config `timeoutMs`（默认 300s）管整条命令；同组 `dsh-terminal-bash` 的 `timeoutMs` 管单次 `startSend` 等待。命令循环不把 backend `waitReason === 'timeout'` 当完成，只在 init 把它当失败。
- **无 win32 `disabled`。** shipped `minimal` 不按 `process.platform` 关掉本包；Loader 集成套件在非 `linux`/`darwin` 上 `describe.skip`。[E: packages/shell/tool-bash-persistent/tests/loader-composition.spec.ts:66] 默认 backend 的 `shellPath` 是 `/bin/bash`。[E: packages/terminal/terminal-bash/src/config.ts:46]
- **需要 owning agent。** 没有 `exec.agent` 直接失败；PTY API 全部 owner-scoped。
- **fiber dispose 拆工具。** 卸载插件后 `ctx.tools.get('bash')` 为 `undefined`。[E: packages/shell/tool-bash-persistent/tests/tools.spec.ts:325]

## Sources

- packages/shell/tool-bash-persistent/src/index.ts
- packages/shell/tool-bash-persistent/package.json
- packages/shell/tool-bash-persistent/tests/tools.spec.ts
- packages/shell/tool-bash-persistent/tests/loader-composition.spec.ts
- packages/terminal/terminal/src/index.ts
- packages/terminal/terminal-bash/src/index.ts
- packages/terminal/terminal-bash/src/config.ts
- packages/core/tools/src/index.ts
- packages/guard/timeout-policy/src/index.ts
- packages/session/session-checkpoint-policy/src/index.ts
- packages/util/timeout/src/index.ts
- packages/preset/agent-presets/src/mount.ts
- apps/cli/config/agent-presets/minimal/agent.cordis.yml
- apps/cli/config/agent-presets/standard/agent.cordis.yml
- apps/cli/config/agent-presets/code/agent.cordis.yml
- apps/cli/config/agent-presets/cordis/agent.cordis.yml

## 相关

- [工具调用解剖](../../spine/tool-call-anatomy.md) — `tools/pre-execute` / `execute` / `post-execute`、approval、`ToolDefinition.timeoutMs`、checkpoint。
- [模型可见工具目录](../../reference/tools-catalog.md) — wire 名全集；`bash` 会因 preset 落到不同包。
- [bash 一次性执行](bash.md) — `@deepseek-ai/dsh-tool-bash` + `ctx.shell`，`standard` / `code` / `cordis` 的那条 `bash`。
- [terminals PTY 缝](../../subsystems/execution/terminal.md) — `ctx.terminals` Definition / Provider、owner 鉴权、backend 注册。
