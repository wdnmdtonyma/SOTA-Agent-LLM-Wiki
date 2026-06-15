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
updated: 92c70c9c3
evidence: explicit
---

> `cli.run` 描述 V1 `opencode run [message..]` command。实现包含三种行为路径：non-interactive 默认路径、`--interactive` local 路径、`--interactive --attach` attach 路径。[E: packages/opencode/src/cli/cmd/run.ts:763]

## 能回答的问题

- `opencode run` 的三种执行模式分别启动什么。
- 哪些 flags 只能 interactive 使用，哪些 flags 在 non-interactive 下自动禁用权限。
- message、stdin、file attachments、session resume/fork 如何进入 session。
- `--format json` 的 event stream 包含哪些事件。

## Command 与 Options

`RunCommand` 的 yargs command 是 `run [message..]`，description 是 `Run opencode with a message`。[E: packages/opencode/src/cli/cmd/run.ts:123] command 定义的 `instance` 条件是 `!args.attach`，说明 attach 模式不创建本地 instance。[E: packages/opencode/src/cli/cmd/run.ts:127]

| option | type/default | 含义 | 约束 |
| --- | --- | --- | --- |
| `message..` | positional string array | prompt text parts。[E: packages/opencode/src/cli/cmd/run.ts:133] | non-interactive 需要 message/stdin text 或 `--command`；file-only 不满足这个 guard。[E: packages/opencode/src/cli/cmd/run.ts:355] |
| `--command` | string | 执行 command 而不是 prompt。[E: packages/opencode/src/cli/cmd/run.ts:139] | 不能与 `--interactive` 同用。[E: packages/opencode/src/cli/cmd/run.ts:268] |
| `--continue` | boolean | continue last session。[E: packages/opencode/src/cli/cmd/run.ts:145] | `--fork` 需要 `--continue` 或 `--session`。[E: packages/opencode/src/cli/cmd/run.ts:360] |
| `--session` | string | 指定 session id。[E: packages/opencode/src/cli/cmd/run.ts:151] | 可与 fork/attach 分支组合。 |
| `--fork` | boolean | fork existing session。[E: packages/opencode/src/cli/cmd/run.ts:157] | 必须配合 `--continue` 或 `--session`。[E: packages/opencode/src/cli/cmd/run.ts:360] |
| `--share` | boolean | share session。[E: packages/opencode/src/cli/cmd/run.ts:163] | 会触发 `share` flow 或由 config 自动 share。[E: packages/opencode/src/cli/cmd/run.ts:470] |
| `--model` | string | override model。[E: packages/opencode/src/cli/cmd/run.ts:161] | non-interactive prompt 会把 picked model 传给 session prompt。[E: packages/opencode/src/cli/cmd/run.ts:793] |
| `--agent` | string | use specific agent。[E: packages/opencode/src/cli/cmd/run.ts:166] | local/attach 都拒绝 subagent。[E: packages/opencode/src/cli/cmd/run.ts:530] |
| `--format` | `default`/`json`, default `default` | output format。[E: packages/opencode/src/cli/cmd/run.ts:170] | `json` 不能与 interactive 同用。[E: packages/opencode/src/cli/cmd/run.ts:276] |
| `--file` | string array | attach files。[E: packages/opencode/src/cli/cmd/run.ts:176] | 每个文件验证存在后构造成 `file` part，包含 file URL、filename 和 MIME。[E: packages/opencode/src/cli/cmd/run.ts:333] [E: packages/opencode/src/cli/cmd/run.ts:340] [E: packages/opencode/src/cli/cmd/run.ts:342] |
| `--title` | string | session title。[E: packages/opencode/src/cli/cmd/run.ts:182] | fresh session create 时传入。[E: packages/opencode/src/cli/cmd/run.ts:493] |
| `--attach` | string | attach server URL。[E: packages/opencode/src/cli/cmd/run.ts:186] | 与 `--interactive` 组合进入 attach interactive。 |
| `--password` | string | server password。[E: packages/opencode/src/cli/cmd/run.ts:190] | attach headers 使用。[E: packages/opencode/src/cli/cmd/run.ts:318] |
| `--username` | string | attach server basic-auth username。[E: packages/opencode/src/cli/cmd/run.ts:195] | attach headers 使用。[E: packages/opencode/src/cli/cmd/run.ts:318] |
| `--dir` | string | working directory。[E: packages/opencode/src/cli/cmd/run.ts:200] | 解析成 absolute cwd。[E: packages/opencode/src/cli/cmd/run.ts:305] |
| `--port` | number | local server port option is declared。[E: packages/opencode/src/cli/cmd/run.ts:204] | handler 中未发现读取 `args.port`，当前按 declared option 记录。[I] |
| `--variant` | string | model variant。[E: packages/opencode/src/cli/cmd/run.ts:208] | non-interactive prompt body 传入 model variant；interactive create helper 也把 variant 写入 model object。[E: packages/opencode/src/cli/cmd/run.ts:798] [E: packages/opencode/src/cli/cmd/run.ts:496] |
| `--thinking` | boolean | show thinking blocks。[E: packages/opencode/src/cli/cmd/run.ts:212] | interactive runtime receives resolved `thinking` value。[E: packages/opencode/src/cli/cmd/run.ts:827] |
| `--replay` | boolean default true | interactive replay prior events。[E: packages/opencode/src/cli/cmd/run.ts:216] | 只对 interactive 有意义。[I] |
| `--replay-limit` | number | replay event limit。[E: packages/opencode/src/cli/cmd/run.ts:221] | 只能 interactive；必须 positive integer。[E: packages/opencode/src/cli/cmd/run.ts:280] |
| `--interactive` / `-i` | boolean default false | split-footer interactive mode。[E: packages/opencode/src/cli/cmd/run.ts:225] | 需要 stdout TTY。[E: packages/opencode/src/cli/cmd/run.ts:291] |
| `--dangerously-skip-permissions` | boolean default false | skip permission prompts。[E: packages/opencode/src/cli/cmd/run.ts:231] | 与 session permission merge 相关。[I] |
| `--demo` | boolean default false | demo mode。[E: packages/opencode/src/cli/cmd/run.ts:236] | 必须 interactive。[E: packages/opencode/src/cli/cmd/run.ts:272] |

## 三种模式

1. Non-interactive default：进入 execute 后，non-interactive 分支订阅 session events。[E: packages/opencode/src/cli/cmd/run.ts:764] 如果 `--command` 为真，它调用 `client.session.command`。[E: packages/opencode/src/cli/cmd/run.ts:775] 否则调用 `client.session.prompt`。[E: packages/opencode/src/cli/cmd/run.ts:793]

2. Interactive local：fresh local interactive 分支使用 `Server.Default().app.fetch` 创建 in-process client transport，然后调用 `runInteractiveLocalMode`。[E: packages/opencode/src/cli/cmd/run.ts:837]

3. Interactive attach：attach 分支先创建 attach SDK，再调用共享 `execute()`；在 interactive 分支内由 `runInteractiveMode` 接管远端 session。[E: packages/opencode/src/cli/cmd/run.ts:870] [E: packages/opencode/src/cli/cmd/run.ts:810]

## Session 与 Permission Flow

handler 会解析 cwd；attach 执行时使用 `--dir`、session directory 或远端 `path.get()`，非 attach 时使用 resolved directory 或 local root。[E: packages/opencode/src/cli/cmd/run.ts:755] `--file` 用 local root 或 resolved directory 解析路径并构造 `type: "file"` 的 prompt part，不把文件正文读入 message。[E: packages/opencode/src/cli/cmd/run.ts:333] [E: packages/opencode/src/cli/cmd/run.ts:342] 如果 stdin 有内容，会追加到 message。[E: packages/opencode/src/cli/cmd/run.ts:351]

non-interactive 默认把 `question`、`plan_enter`、`plan_exit` 设为 `deny`，避免 terminal prompt 卡住 unattended run。[E: packages/opencode/src/cli/cmd/run.ts:365] permission asked events 只有在 `--dangerously-skip-permissions` 时回复 `once`，否则打印 warning 并回复 `reject`。[E: packages/opencode/src/cli/cmd/run.ts:735] [E: packages/opencode/src/cli/cmd/run.ts:746]

普通 fresh session helper `session()` 创建 session 时只发送 title 和 permission。[E: packages/opencode/src/cli/cmd/run.ts:453] interactive runtime 使用的 `createFreshSession()` helper 才会发送 agent、model、variant 和 permission。[E: packages/opencode/src/cli/cmd/run.ts:489] message parts 在 non-interactive prompt call 中发送。[E: packages/opencode/src/cli/cmd/run.ts:794] local agent 校验要求指定 agent 存在，且 `mode` 不能是 `subagent`。[E: packages/opencode/src/cli/cmd/run.ts:530] attach agent 校验通过远端 `client.app.agents()` 获取 agent 列表，也拒绝 subagent。[E: packages/opencode/src/cli/cmd/run.ts:556]

## JSON/Event Output

`--format json` 事件输出通过 `emit(type, data)` 写 JSON line。[E: packages/opencode/src/cli/cmd/run.ts:613] JSON mode 会 emit completed/error tool part 的 `tool_use`、`step_start`、`step_finish`、completed text part 的 `text`、completed reasoning part 的 `reasoning` 和 `session.error` 的 `error`。[E: packages/opencode/src/cli/cmd/run.ts:654] [E: packages/opencode/src/cli/cmd/run.ts:675] [E: packages/opencode/src/cli/cmd/run.ts:679] [E: packages/opencode/src/cli/cmd/run.ts:683] [E: packages/opencode/src/cli/cmd/run.ts:696] [E: packages/opencode/src/cli/cmd/run.ts:711]

## Sources

- `packages/opencode/src/cli/cmd/run.ts`

## 相关

- `cli.opencode-yargs`
- `prompt.system-prompts`
- `agent.config`
