---
id: spine.cli-to-session
title: V1 CLI 到 SessionPrompt
kind: flow
tier: T0
v: v1
source: [packages/opencode/src/cli/cmd/run.ts, packages/opencode/src/server/server.ts, packages/opencode/src/session/prompt.ts]
symbols: [RunCommand, Server.Default, SessionPrompt.prompt, SessionPrompt.loop]
related: [spine.v1-turn-loop, server.http-server, sdk.overview]
evidence: explicit
status: verified
updated: 92c70c9c3
---

> V1 CLI-to-session 节点描述 `opencode run` 如何解析 directory/session/mode,创建 SDK client,再经 process-local Effect HttpApi server 调到 `SessionPrompt.prompt`。

## 能回答的问题
- `opencode run` 何时 attach 到已有 server,何时使用进程内 server?
- 非交互模式怎样创建或复用 session?
- CLI 怎样调用 `session.prompt` 或 `session.command`?
- process-local `fetch` 到底落到哪个 server handler?

```mermaid
flowchart TD
  Args["RunCommand argv"] --> Mode["attach / interactive / noninteractive"]
  Mode --> Cwd["resolve directory / project instance"]
  Cwd --> SDK["createOpencodeClient"]
  SDK --> Fetch["fetchFn"]
  Fetch --> ServerDefault["Server.Default().app.fetch"]
  ServerDefault --> Route["Effect HttpApi routes"]
  Route --> SessionPrompt["SessionPrompt.prompt"]
  SessionPrompt --> RunLoop["SessionPrompt.loop -> runLoop"]
```

## 端到端步骤

1. `RunCommand@packages/opencode/src/cli/cmd/run.ts:122` 声明 command 名为 `run [message..]`,并把 `instance` 设为 `(args) => !args.attach`;也就是说 attach 模式会避免启动新的 instance。[E: packages/opencode/src/cli/cmd/run.ts:122][E: packages/opencode/src/cli/cmd/run.ts:123][E: packages/opencode/src/cli/cmd/run.ts:127]

2. `RunCommand.handler@packages/opencode/src/cli/cmd/run.ts:241` 进入 Effect generator 后解析服务,包括 `Agent.Service`、`RuntimeFlags.Service`、`InstanceRef.Service`、`ServerAuth.Service`。[E: packages/opencode/src/cli/cmd/run.ts:241][E: packages/opencode/src/cli/cmd/run.ts:246]

3. `handler@packages/opencode/src/cli/cmd/run.ts:305` 在 `args.dir` 存在时解析目标 root,并在非 attach 路径执行 `process.chdir(root)`;没有 `args.dir` 时使用当前工作目录作为 root。[E: packages/opencode/src/cli/cmd/run.ts:305][E: packages/opencode/src/cli/cmd/run.ts:307][E: packages/opencode/src/cli/cmd/run.ts:310][E: packages/opencode/src/cli/cmd/run.ts:311]

4. attach 模式通过 `attachSDK` 调 `createOpencodeClient({ baseUrl: args.attach!, directory, headers })` 连接已有 server;本地非 attach 模式会构造 `fetchFn` 调 `Server.Default().app.fetch(request)`。[E: packages/opencode/src/cli/cmd/run.ts:321][E: packages/opencode/src/cli/cmd/run.ts:322][E: packages/opencode/src/cli/cmd/run.ts:323][E: packages/opencode/src/cli/cmd/run.ts:840][E: packages/opencode/src/cli/cmd/run.ts:875]

5. `Server.Default@packages/opencode/src/server/server.ts:55` 返回的 `app.fetch` 调用 `HttpApiApp.webHandler().handler`,因此 CLI 的本地 fetch wrapper 进入同一个 V1 Effect HttpApi handler。[E: packages/opencode/src/server/server.ts:55][E: packages/opencode/src/server/server.ts:56][E: packages/opencode/src/server/server.ts:58]

6. `session(sdk)@packages/opencode/src/cli/cmd/run.ts:391` 根据 `--session`、`--continue`、`--fork` 等参数选择已有 session、fork session、continue 最近 session 或创建新 session。[E: packages/opencode/src/cli/cmd/run.ts:391][E: packages/opencode/src/cli/cmd/run.ts:397][E: packages/opencode/src/cli/cmd/run.ts:427][E: packages/opencode/src/cli/cmd/run.ts:454]

7. `execute@packages/opencode/src/cli/cmd/run.ts:605` 获取 session id;非交互分支订阅 event stream,再调用 `client.session.command` 或 `client.session.prompt`。[E: packages/opencode/src/cli/cmd/run.ts:605][E: packages/opencode/src/cli/cmd/run.ts:763][E: packages/opencode/src/cli/cmd/run.ts:775][E: packages/opencode/src/cli/cmd/run.ts:793]

8. `loop@packages/opencode/src/cli/cmd/run.ts:632` 消费 SDK event stream,打印 message part 增量,并在收到当前 session 的 `session.status` 且状态为 `idle` 时结束等待;permission asked 事件在同一 loop 后段处理。[E: packages/opencode/src/cli/cmd/run.ts:632][E: packages/opencode/src/cli/cmd/run.ts:650][E: packages/opencode/src/cli/cmd/run.ts:723][E: packages/opencode/src/cli/cmd/run.ts:731]

9. API 进入 `SessionPrompt.prompt@packages/opencode/src/session/prompt.ts:1105` 后会创建 user message、更新 session 时间、记录输入权限;如果 `noReply` 不是 true,最后调用 `loop({ sessionID: input.sessionID })` 进入 V1 turn loop。[E: packages/opencode/src/session/prompt.ts:1105][E: packages/opencode/src/session/prompt.ts:1114][E: packages/opencode/src/session/prompt.ts:1122][E: packages/opencode/src/session/prompt.ts:1123]

## 关键决策点

- 非交互模式会要求必须有 message 或 command,否则打印 `You must provide a message or a command` 并 `process.exit(1)`;同一段还把 question/plan permission 默认设为 deny,避免 headless run 卡在用户交互上。[E: packages/opencode/src/cli/cmd/run.ts:355][E: packages/opencode/src/cli/cmd/run.ts:356][E: packages/opencode/src/cli/cmd/run.ts:357][E: packages/opencode/src/cli/cmd/run.ts:365]
- 本地交互路径也使用同一个 process-local fetch trick:`runInteractiveLocalMode` 收到的 fetch handler 同样调用 `Server.Default().app.fetch(request)`。[E: packages/opencode/src/cli/cmd/run.ts:837][E: packages/opencode/src/cli/cmd/run.ts:840]
- `SessionPrompt.prompt` 的 `noReply` 分支会只写 user input 而不启动 assistant loop,这是 CLI/API 层能注入输入但不立即跑模型的 V1 控制点。[E: packages/opencode/src/session/prompt.ts:1123]

## 深挖入口
- V1 turn loop 的具体处理: `spine.v1-turn-loop`
- V1 HTTP API route 与 SDK client: `server.http-server`, `sdk.overview`

## Sources
- packages/opencode/src/cli/cmd/run.ts
- packages/opencode/src/server/server.ts
- packages/opencode/src/session/prompt.ts

## 相关
- [spine.v1-turn-loop](v1-turn-loop.md)
- [server.http-server](../subsystems/server/http-server.md)
- [sdk.overview](../surface/sdk/overview.md)
