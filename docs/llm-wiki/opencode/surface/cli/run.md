---
id: cli.run
title: run Command
status: verified
owner: surface-config-cli
v: v1
kind: surface
tier: T1
schema: node
source:
  - packages/opencode/src/cli/cmd/run.ts
  - packages/opencode/src/cli/cmd/run/
updated: 8b68dc0d7
evidence: explicit
---

> `cli.run` 描述 V1 `opencode run [message..]` command。实现包含三种行为路径：non-interactive 默认路径、`--mini` local 路径、`--mini --attach` attach 路径。[E: packages/opencode/src/cli/cmd/run.ts:828] [E: packages/opencode/src/cli/cmd/run.ts:902] [E: packages/opencode/src/cli/cmd/run.ts:938]

## 能回答的问题

- `opencode run` 的三种执行模式分别启动什么。
- 哪些 flags 只能 interactive 使用，哪些 flags 在 non-interactive 下自动禁用权限。
- message、stdin、file attachments、session resume/fork 如何进入 session。
- `--format json` 的 event stream 包含哪些事件。

## Command 与 Options

`RunCommand` 的 yargs command 是 `run [message..]`，description 是 `run opencode with a message`。[E: packages/opencode/src/cli/cmd/run.ts:127] [E: packages/opencode/src/cli/cmd/run.ts:128] command 定义的 `instance` 条件是 `!args.attach`，说明 attach 模式不创建本地 instance。[E: packages/opencode/src/cli/cmd/run.ts:131]

| option | type/default | 含义 | 约束 |
| --- | --- | --- | --- |
| `message..` | positional string array | prompt text parts。[E: packages/opencode/src/cli/cmd/run.ts:137] | non-interactive 需要 message/stdin text 或 `--command`；file-only 不满足这个 guard。[E: packages/opencode/src/cli/cmd/run.ts:420] |
| `--command` | string | 执行 command 而不是 prompt。[E: packages/opencode/src/cli/cmd/run.ts:143] | 不能与 `--mini` 同用。[E: packages/opencode/src/cli/cmd/run.ts:292] |
| `--continue` | boolean | continue last session。[E: packages/opencode/src/cli/cmd/run.ts:147] | `--fork` 需要 `--continue` 或 `--session`。[E: packages/opencode/src/cli/cmd/run.ts:425] |
| `--session` | string | 指定 session id。[E: packages/opencode/src/cli/cmd/run.ts:152] | 可与 fork/attach 分支组合。 |
| `--fork` | boolean | fork existing session。[E: packages/opencode/src/cli/cmd/run.ts:157] | 必须配合 `--continue` 或 `--session`。[E: packages/opencode/src/cli/cmd/run.ts:425] |
| `--share` | boolean | share session。[E: packages/opencode/src/cli/cmd/run.ts:161] | 会触发 `share` flow 或由 config/flag 自动 share。[E: packages/opencode/src/cli/cmd/run.ts:538] |
| `--model` | string | override model。[E: packages/opencode/src/cli/cmd/run.ts:165] | non-interactive prompt 会把 picked model 传给 session prompt。[E: packages/opencode/src/cli/cmd/run.ts:858] [E: packages/opencode/src/cli/cmd/run.ts:862] |
| `--agent` | string | use specific agent。[E: packages/opencode/src/cli/cmd/run.ts:170] | local/attach 都拒绝 subagent。[E: packages/opencode/src/cli/cmd/run.ts:610] [E: packages/opencode/src/cli/cmd/run.ts:649] |
| `--format` | `default`/`json`, default `default` | output format。[E: packages/opencode/src/cli/cmd/run.ts:174] | `json` 不能与 `--mini` 同用。[E: packages/opencode/src/cli/cmd/run.ts:304] |
| `--file` | string array | attach files。[E: packages/opencode/src/cli/cmd/run.ts:180] | 每个文件验证存在后构造成 `file` part，包含 file URL、filename 和 MIME。[E: packages/opencode/src/cli/cmd/run.ts:363] [E: packages/opencode/src/cli/cmd/run.ts:407] [E: packages/opencode/src/cli/cmd/run.ts:409] [E: packages/opencode/src/cli/cmd/run.ts:410] [E: packages/opencode/src/cli/cmd/run.ts:411] |
| `--title` | string | session title。[E: packages/opencode/src/cli/cmd/run.ts:186] | fresh session create 时传入。[E: packages/opencode/src/cli/cmd/run.ts:519] [E: packages/opencode/src/cli/cmd/run.ts:520] |
| `--attach` | string | attach server URL。[E: packages/opencode/src/cli/cmd/run.ts:190] | 与 `--mini` 组合进入 attach interactive。[E: packages/opencode/src/cli/cmd/run.ts:938] |
| `--password` | string | server password。[E: packages/opencode/src/cli/cmd/run.ts:194] | attach headers 使用。[E: packages/opencode/src/cli/cmd/run.ts:347] |
| `--username` | string | attach server basic-auth username。[E: packages/opencode/src/cli/cmd/run.ts:199] | attach headers 使用。[E: packages/opencode/src/cli/cmd/run.ts:347] |
| `--dir` | string | working directory。[E: packages/opencode/src/cli/cmd/run.ts:204] | non-attach 会 `chdir` 到 absolute/relative target；attach 直接把 dir 作为 remote directory。[E: packages/opencode/src/cli/cmd/run.ts:336] [E: packages/opencode/src/cli/cmd/run.ts:339] |
| `--port` | number | local server port option is declared。[E: packages/opencode/src/cli/cmd/run.ts:208] | handler 中未发现读取 `args.port`，当前按 declared option 记录。[I] |
| `--variant` | string | model variant。[E: packages/opencode/src/cli/cmd/run.ts:212] | non-interactive prompt body 传入 model variant；interactive create helper 也把 variant 写入 model object。[E: packages/opencode/src/cli/cmd/run.ts:863] [E: packages/opencode/src/cli/cmd/run.ts:561] |
| `--thinking` | boolean | show thinking blocks。[E: packages/opencode/src/cli/cmd/run.ts:216] | interactive runtime receives resolved `thinking` value。[E: packages/opencode/src/cli/cmd/run.ts:892] [E: packages/opencode/src/cli/cmd/run.ts:929] |
| `--mini` | boolean hidden default false | split-footer interactive mode 的当前实际开关。[E: packages/opencode/src/cli/cmd/run.ts:220] | handler 用 `args.mini` 派生 `interactive`。[E: packages/opencode/src/cli/cmd/run.ts:273] |
| `--replay` | boolean default true | interactive replay prior events。[E: packages/opencode/src/cli/cmd/run.ts:225] | 只对 `--mini` interactive 有意义。[I] |
| `--replay-limit` | number | replay event limit。[E: packages/opencode/src/cli/cmd/run.ts:231] | 只能 `--mini`；必须 positive integer。[E: packages/opencode/src/cli/cmd/run.ts:308] [E: packages/opencode/src/cli/cmd/run.ts:314] |
| `--interactive` / `-i` | boolean default false | declared split-footer interactive option。[E: packages/opencode/src/cli/cmd/run.ts:236] | 当前 handler 的 interactive 分支由 `args.mini` 决定，而不是 `args.interactive`。[E: packages/opencode/src/cli/cmd/run.ts:273] |
| `--auto` | boolean default false | auto-approve not explicitly denied permissions。[E: packages/opencode/src/cli/cmd/run.ts:242] | 与 `--yolo`、`--dangerously-skip-permissions` 一起派生 `auto`。[E: packages/opencode/src/cli/cmd/run.ts:274] |
| `--dangerously-skip-permissions` | boolean default false | skip permission prompts。[E: packages/opencode/src/cli/cmd/run.ts:252] | 与 `--auto`、`--yolo` 一起派生 permission reply 行为。[E: packages/opencode/src/cli/cmd/run.ts:274] |
| `--demo` | boolean default false | demo mode。[E: packages/opencode/src/cli/cmd/run.ts:257] | 必须 `--mini`。[E: packages/opencode/src/cli/cmd/run.ts:300] |

## 三种模式

1. Non-interactive default：进入 execute 后，non-interactive 分支订阅 session events。[E: packages/opencode/src/cli/cmd/run.ts:828] 如果 `--command` 为真，它调用 `client.session.command`。[E: packages/opencode/src/cli/cmd/run.ts:840] [E: packages/opencode/src/cli/cmd/run.ts:841] 否则调用 `client.session.prompt`。[E: packages/opencode/src/cli/cmd/run.ts:859]

2. Interactive local：fresh local `--mini` 分支使用 `Server.Default().app.fetch` 创建 in-process client transport，然后调用 `runInteractiveLocalMode`。[E: packages/opencode/src/cli/cmd/run.ts:902] [E: packages/opencode/src/cli/cmd/run.ts:911] [E: packages/opencode/src/cli/cmd/run.ts:915]

3. Interactive attach：attach 分支先创建 attach SDK，再调用共享 `execute()`；在 interactive 分支内由 `runInteractiveMode` 接管远端 session。[E: packages/opencode/src/cli/cmd/run.ts:938] [E: packages/opencode/src/cli/cmd/run.ts:878]

## Session 与 Permission Flow

handler 会解析 cwd；attach 执行时使用 `--dir`、session directory 或远端 `path.get()`，非 attach 时使用 resolved directory 或 local root。[E: packages/opencode/src/cli/cmd/run.ts:820] `--file` 用 local root 或 resolved directory 解析路径并构造 `type: "file"` 的 prompt part，文件作为独立 part 发送。[E: packages/opencode/src/cli/cmd/run.ts:333] [E: packages/opencode/src/cli/cmd/run.ts:362] [E: packages/opencode/src/cli/cmd/run.ts:407] 如果 stdin 有内容，会追加到 message。[E: packages/opencode/src/cli/cmd/run.ts:416] [E: packages/opencode/src/cli/cmd/run.ts:417]

non-interactive 默认把 `question`、`plan_enter`、`plan_exit` 设为 `deny`，避免 terminal prompt 卡住 unattended run。[E: packages/opencode/src/cli/cmd/run.ts:430] [E: packages/opencode/src/cli/cmd/run.ts:434] [E: packages/opencode/src/cli/cmd/run.ts:439] [E: packages/opencode/src/cli/cmd/run.ts:444] permission asked events 在 `auto` 为真时回复 `once`，否则打印 warning 并回复 `reject`。[E: packages/opencode/src/cli/cmd/run.ts:800] [E: packages/opencode/src/cli/cmd/run.ts:803] [E: packages/opencode/src/cli/cmd/run.ts:806] [E: packages/opencode/src/cli/cmd/run.ts:813]

普通 fresh session helper `session()` 创建 session 时只发送 title 和 permission。[E: packages/opencode/src/cli/cmd/run.ts:519] [E: packages/opencode/src/cli/cmd/run.ts:520] [E: packages/opencode/src/cli/cmd/run.ts:521] interactive runtime 使用的 `createFreshSession()` helper 才会发送 agent、model、variant 和 permission。[E: packages/opencode/src/cli/cmd/run.ts:554] [E: packages/opencode/src/cli/cmd/run.ts:556] [E: packages/opencode/src/cli/cmd/run.ts:557] [E: packages/opencode/src/cli/cmd/run.ts:561] [E: packages/opencode/src/cli/cmd/run.ts:564] message parts 在 non-interactive prompt call 中发送。[E: packages/opencode/src/cli/cmd/run.ts:864] local agent 校验要求指定 agent 存在，且 `mode` 不能是 `subagent`。[E: packages/opencode/src/cli/cmd/run.ts:599] [E: packages/opencode/src/cli/cmd/run.ts:610] attach agent 校验通过远端 `client.app.agents()` 获取 agent 列表，也拒绝 subagent。[E: packages/opencode/src/cli/cmd/run.ts:625] [E: packages/opencode/src/cli/cmd/run.ts:649]

## JSON/Event Output

`--format json` 事件输出通过 `emit(type, data)` 写 JSON line。[E: packages/opencode/src/cli/cmd/run.ts:678] [E: packages/opencode/src/cli/cmd/run.ts:679] JSON mode 会 emit completed/error tool part 的 `tool_use`、`step_start`、`step_finish`、completed text part 的 `text`、completed reasoning part 的 `reasoning` 和 `session.error` 的 `error`。[E: packages/opencode/src/cli/cmd/run.ts:719] [E: packages/opencode/src/cli/cmd/run.ts:720] [E: packages/opencode/src/cli/cmd/run.ts:741] [E: packages/opencode/src/cli/cmd/run.ts:745] [E: packages/opencode/src/cli/cmd/run.ts:749] [E: packages/opencode/src/cli/cmd/run.ts:762] [E: packages/opencode/src/cli/cmd/run.ts:784]

## Sources

- `packages/opencode/src/cli/cmd/run.ts`

## 相关

- `cli.opencode-yargs`
- `prompt.system-prompts`
- `agent.config`
