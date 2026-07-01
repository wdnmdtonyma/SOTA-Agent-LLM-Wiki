---
id: integrations.acp
title: ACP server integration
kind: subsystem
tier: T2
v: v1
status: verified
updated: 8b68dc0d7
source:
  - packages/opencode/src/acp/service.ts
  - packages/opencode/src/acp/agent.ts
  - packages/opencode/src/acp/tool.ts
  - packages/opencode/src/acp/session.ts
  - packages/opencode/src/acp/event.ts
  - packages/opencode/src/acp/content.ts
  - packages/opencode/src/acp/permission.ts
  - packages/opencode/src/acp/directory.ts
  - packages/opencode/src/cli/cmd/acp.ts
  - packages/opencode/package.json
symbols:
  - ACP.init
  - Agent
  - ACPService.make
  - ACPSession.Service
  - ACPEvent.Subscription
  - ACPTool.toToolKind
related:
  - cli.opencode-yargs
  - sdk.overview
evidence: explicit
---

> ACP integration 是 V1 opencode CLI/runtime 作为 Agent Client Protocol server 的 stdio + NDJSON host；它启动本地 opencode server，创建 `@opencode-ai/sdk/v2` client，并把 ACP RPC 映射到 opencode session API。

## 能回答的问题

- `opencode acp` 命令如何启动 ACP server。
- opencode 暴露了哪些 ACP request/notification。
- ACP session 与 opencode SDK session 如何映射。
- MCP server、slash command、permission、tool update 在 ACP bridge 中如何转换。
- 为什么 ACP 节点不属于 V2 core 默认执行路径。

## 职责

`packages/opencode/src/cli/cmd/acp.ts` 是 yargs CLI 的 ACP 入口，它启动 opencode server，创建 `@opencode-ai/sdk/v2` 的 `createOpencodeClient` client，然后把 stdin/stdout 包装成 `@agentclientprotocol/sdk` 的 NDJSON stream。[E: packages/opencode/src/cli/cmd/acp.ts:9] [E: packages/opencode/src/cli/cmd/acp.ts:25] [E: packages/opencode/src/cli/cmd/acp.ts:27] [E: packages/opencode/src/cli/cmd/acp.ts:55]

`packages/opencode/src/acp/agent.ts` 实现 ACP Agent 侧 connection object，把 protocol method 转发给 `ACPService`。[E: packages/opencode/src/acp/agent.ts:24] `packages/opencode/src/acp/service.ts` 是核心 bridge：它维护 ACP session snapshot、调用 opencode SDK session API、注册 MCP servers、发送 command list、处理 prompt/cancel/fork/config option。[E: packages/opencode/src/acp/service.ts:75]

ACP SDK 依赖来自 `@agentclientprotocol/sdk`，这是 package dependency，不是手写协议 parser。[E: packages/opencode/package.json:57]

## 关键文件

| 文件 | 角色 |
| --- | --- |
| `packages/opencode/src/cli/cmd/acp.ts` | `opencode acp` CLI 入口、stdio/NDJSON wiring、`createOpencodeClient` client 创建。 |
| `packages/opencode/src/acp/agent.ts` | ACP Agent method table 和 error mapping。 |
| `packages/opencode/src/acp/service.ts` | session bridge、directory snapshot、prompt/command/MCP/config mapping。 |
| `packages/opencode/src/acp/session.ts` | ACP-side session snapshot store。 |
| `packages/opencode/src/acp/event.ts` | V1 global event stream 到 ACP session update 的转换。 |
| `packages/opencode/src/acp/tool.ts` | opencode tool part 到 ACP tool call update 的转换。 |
| `packages/opencode/src/acp/content.ts` | ACP prompt content 与 opencode prompt part/chunk 互转。 |
| `packages/opencode/src/acp/permission.ts` | ACP permission request/reply queue。 |
| `packages/opencode/src/acp/directory.ts` | provider/model/agent/command snapshot builder。 |

## 数据模型

ACP session snapshot `Info` 包含 ACP session id、cwd、MCP server list、createdAt、model、variant、modeId、knownParts。[E: packages/opencode/src/acp/session.ts:24] snapshot store 是内存 `Map`，通过 `Ref.make(new Map())` 创建；它不是持久化 database。[E: packages/opencode/src/acp/session.ts:100]

`Directory.Snapshot` 包含 providers、modelOptions、variants、availableModes、defaultModeID、availableCommands、defaultModel。[E: packages/opencode/src/acp/directory.ts:33] 这个 snapshot 是 ACP client 可见的目录能力视图，来自 opencode provider、agent、command、config 组合加载。[E: packages/opencode/src/acp/directory.ts:120]

ACP service 的初始化响应声明 protocol version 1、loadSession/MCP/prompt/session capabilities、auth methods、agent info。[E: packages/opencode/src/acp/service.ts:110] MCP capabilities 同时声明 `http` 和 `sse`。[E: packages/opencode/src/acp/service.ts:114]

## 控制流

### 启动

1. CLI command 名是 `acp`，描述是启动 ACP server。[E: packages/opencode/src/cli/cmd/acp.ts:10] [E: packages/opencode/src/cli/cmd/acp.ts:11]
2. handler 设置 `OPENCODE_CLIENT = "acp"`，然后启动本地 opencode server。[E: packages/opencode/src/cli/cmd/acp.ts:23] [E: packages/opencode/src/cli/cmd/acp.ts:25]
3. handler 用 `createOpencodeClient` 创建 SDK client，baseUrl 指向本地 server，auth header 来自 `ServerAuth`。[E: packages/opencode/src/cli/cmd/acp.ts:27] [E: packages/opencode/src/cli/cmd/acp.ts:29]
4. stdout 被包装成 `WritableStream`，stdin 被包装成 `ReadableStream`，然后传入 `ndJsonStream(input, output)`。[E: packages/opencode/src/cli/cmd/acp.ts:32] [E: packages/opencode/src/cli/cmd/acp.ts:45] [E: packages/opencode/src/cli/cmd/acp.ts:55]
5. `ACP.init({ sdk })` 创建 AgentSideConnection 使用的 agent handler。[E: packages/opencode/src/cli/cmd/acp.ts:56] [E: packages/opencode/src/cli/cmd/acp.ts:58]

### ACP method table

`Agent` class 暴露 12 个 request/response RPC：`initialize`、`authenticate`、`newSession`、`loadSession`、`listSessions`、`resumeSession`、`closeSession`、`unstable_forkSession`、`setSessionConfigOption`、`setSessionMode`、`unstable_setSessionModel`、`prompt`。[E: packages/opencode/src/acp/agent.ts:35] [E: packages/opencode/src/acp/agent.ts:79] `cancel` 单独实现为 notification handler。[E: packages/opencode/src/acp/agent.ts:83]

所有 handler 经过 `run(effect)` 执行，并把非 ACP `RequestError` 转成 internal error。[E: packages/opencode/src/acp/agent.ts:88]

### Session bridge

1. `newSession` 先读取 directory snapshot，选择默认 model、variant、mode。[E: packages/opencode/src/acp/service.ts:162] [E: packages/opencode/src/acp/service.ts:163] [E: packages/opencode/src/acp/service.ts:165]
2. service 通过 SDK `session.create` 创建 backing session，并把 MCP servers、model、variant、modeId 写入 ACP snapshot store。[E: packages/opencode/src/acp/service.ts:170] [E: packages/opencode/src/acp/service.ts:184] [E: packages/opencode/src/acp/service.ts:190]
3. 创建或加载 session 后，service 调用 `registerMcpServers`，再调用 `sendAvailableCommands` 给 ACP client 推送 slash command list。[E: packages/opencode/src/acp/service.ts:194]
4. `listSessions` 同时读取 SDK session list 和内存 live ACP session list，合并后按 `updatedAt` 倒序分页。[E: packages/opencode/src/acp/service.ts:244] [E: packages/opencode/src/acp/service.ts:266] [E: packages/opencode/src/acp/service.ts:275]
5. `resumeSession` 使用传入的 existing `sessionId` load ACP session state，注册 MCP servers，发送 available commands，并 replay 最近 messages。[E: packages/opencode/src/acp/service.ts:290] [E: packages/opencode/src/acp/service.ts:306] [E: packages/opencode/src/acp/service.ts:316] [E: packages/opencode/src/acp/service.ts:317]
6. `closeSession` 和 `cancel` 都会调用 `abortBackingSession`，后者使用 SDK session abort API 停止 backing session。[E: packages/opencode/src/acp/service.ts:328] [E: packages/opencode/src/acp/service.ts:339] [E: packages/opencode/src/acp/service.ts:349]

### Prompt 与 slash command

1. `prompt` 读取 current ACP session、directory snapshot、model、variant、mode，并把 ACP content 转成 opencode prompt parts。[E: packages/opencode/src/acp/service.ts:493] [E: packages/opencode/src/acp/service.ts:501]
2. 如果 prompt 文本被 `detectSlashCommand` 识别为 `/name args`，service 会进入 command path；否则调用 `sdk.session.prompt`。[E: packages/opencode/src/acp/service.ts:502] [E: packages/opencode/src/acp/service.ts:507] [E: packages/opencode/src/acp/service.ts:803]
3. command path 会在 snapshot.availableCommands 中查找命令，命中普通命令时调用 `sdk.session.command`。[E: packages/opencode/src/acp/service.ts:527] [E: packages/opencode/src/acp/service.ts:531]
4. `/compact` 是 special case，会调用 `sdk.session.summarize`。[E: packages/opencode/src/acp/service.ts:549] [E: packages/opencode/src/acp/service.ts:552]

### MCP server 转换

1. `registerMcpServers` 对 ACP session 的 MCP server list 去重，然后逐个调用 SDK MCP add API。[E: packages/opencode/src/acp/service.ts:950] [E: packages/opencode/src/acp/service.ts:966] [E: packages/opencode/src/acp/service.ts:974]
2. ACP MCP config 被映射成 opencode remote/local MCP config；remote 保留 url、headers，local 保留 command、environment。[E: packages/opencode/src/acp/service.ts:1005] [E: packages/opencode/src/acp/service.ts:1009] [E: packages/opencode/src/acp/service.ts:1015]
3. 去重 key 由稳定 JSON string 生成，`stableStringify` 对 object key 排序。[E: packages/opencode/src/acp/service.ts:1001] [E: packages/opencode/src/acp/service.ts:1024]

### Event 与 tool update

1. `ACPEvent.Subscription` 跟踪 abort controller、shell output snapshots、tool start set、permission handler。[E: packages/opencode/src/acp/event.ts:39]
2. subscription 读取 `sdk.global.event`，过滤目标 session event 并转换为 ACP session update。[E: packages/opencode/src/acp/event.ts:116]
3. `message.part.updated` 中 tool part 被交给 `ACPTool`；pending state 生成 `ToolCall`，running/completed/error state 生成 `ToolCallUpdate`。[E: packages/opencode/src/acp/event.ts:131] [E: packages/opencode/src/acp/tool.ts:124] [E: packages/opencode/src/acp/tool.ts:140]
4. shell tool running 时，event bridge 会发送 shell output snapshot，并用本地 map 去重。[E: packages/opencode/src/acp/event.ts:284][E: packages/opencode/src/acp/event.ts:286][E: packages/opencode/src/acp/event.ts:301][E: packages/opencode/src/acp/event.ts:304]
5. `ACPTool.toToolKind` 把 bash/shell 归为 execute，把 webfetch 归为 fetch，把 edit/apply_patch/patch/write 归为 edit，把 grep/glob/context 等归为 search。[E: packages/opencode/src/acp/tool.ts:38] [E: packages/opencode/src/acp/tool.ts:46] [E: packages/opencode/src/acp/tool.ts:49] [E: packages/opencode/src/acp/tool.ts:55]

## 设计动机与权衡

ACP bridge 复用 V1 opencode server host 和 SDK client，而不是直接调用 core V2 runner。[I] 这个判断来自 CLI handler 启动 `Server.listen` 后创建 `createOpencodeClient` client，并把 ACP service 的 `sdk` 依赖传入。[E: packages/opencode/src/cli/cmd/acp.ts:25] [E: packages/opencode/src/cli/cmd/acp.ts:27] [E: packages/opencode/src/acp/service.ts:75]

Directory snapshot 把 provider/model/agent/command 聚合成 ACP client 可消费的能力列表，减少 client 多次 round-trip。[I] snapshot builder 并行加载 provider、agent、default agent、command、default model，然后构造统一 snapshot。[E: packages/opencode/src/acp/directory.ts:120] [E: packages/opencode/src/acp/directory.ts:62]

permission bridge 把 opencode permission ask 变成 ACP `requestPermission`，并用 per-session queue 防止多个 permission prompt 相互覆盖。[E: packages/opencode/src/acp/permission.ts:20] [E: packages/opencode/src/acp/permission.ts:39]

## 易踩坑

- `opencode acp` 是 V1 yargs CLI 命令；`packages/cli` 的新 host binary 名是 `lildax`。[E: packages/opencode/src/cli/cmd/acp.ts:9] [I]
- ACP protocol transport 走 stdio + NDJSON stream；CLI 同时会启动本地 opencode HTTP server 供 SDK client 调用。[E: packages/opencode/src/cli/cmd/acp.ts:25] [E: packages/opencode/src/cli/cmd/acp.ts:55]
- `cancel` 在 agent method table 中是 notification，不计入 12 个 request/response RPC。[E: packages/opencode/src/acp/agent.ts:83]
- ACP session snapshot store 是内存 map；`loadSession`/`resumeSession` 使用 SDK `session.get` 和 `session.messages` 读取既有 session，但 ACP snapshot 本身不是 durable store。[E: packages/opencode/src/acp/session.ts:100] [E: packages/opencode/src/acp/service.ts:293] [E: packages/opencode/src/acp/service.ts:298]
- prompt content 支持 text、image、resource_link、resource text/file 等块；Zed 的 `zed://` link 会被转换成 file path 资源。[E: packages/opencode/src/acp/content.ts:31] [E: packages/opencode/src/acp/content.ts:154]

## Sources

- packages/opencode/src/acp/service.ts
- packages/opencode/src/acp/agent.ts
- packages/opencode/src/acp/tool.ts
- packages/opencode/src/acp/session.ts
- packages/opencode/src/acp/event.ts
- packages/opencode/src/acp/content.ts
- packages/opencode/src/acp/permission.ts
- packages/opencode/src/acp/directory.ts
- packages/opencode/src/cli/cmd/acp.ts
- packages/opencode/package.json

## 相关

- cli.opencode-yargs
- sdk.overview
