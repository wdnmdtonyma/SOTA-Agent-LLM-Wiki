---
id: peripheral.slack
title: Slack 集成
kind: subsystem
tier: T2
v: na
source:
  - packages/slack/src/index.ts
  - packages/slack/package.json
  - packages/slack/README.md
  - packages/sdk/js/src/index.ts
  - packages/sdk/js/src/server.ts
symbols: [App, createOpencode, handleToolUpdate]
related: [server.http-server]
evidence: explicit
status: verified
updated: 92c70c9c3
---

> `@opencode-ai/slack` 是一个 Slack Bolt Socket Mode bot：它为 Slack thread 维护一个 opencode session，并把工具完成事件、分享链接和 assistant response 回贴到同一个 thread。

## 能回答的问题

- Slack bot 需要哪些 token、scope 和启动命令？
- Slack thread 如何映射到 opencode session？
- Slack 集成调用的是 V1 SDK 还是 V2 SDK？
- 工具调用状态如何回传到 Slack？
- Slack bot 和 opencode server 的边界在哪里？

## 职责边界

`packages/slack` 只负责 Slack 事件接入和 SDK 调用，不实现 opencode session runner、tool registry 或 HTTP server。包依赖 `@slack/bolt` 与 `@opencode-ai/sdk`，没有依赖 `@opencode-ai/core` 或 V2 embedded API [E: packages/slack/package.json:10] [E: packages/slack/package.json:11] [E: packages/slack/package.json:12]。Slack README 把它定义为“creates threaded conversations”的 Slack bot，并要求 `SLACK_BOT_TOKEN`、`SLACK_SIGNING_SECRET`、`SLACK_APP_TOKEN` 三个环境变量 [E: packages/slack/README.md:3] [E: packages/slack/README.md:15] [E: packages/slack/README.md:16] [E: packages/slack/README.md:17] [E: packages/slack/README.md:18]。

`packages/slack/src/index.ts` 从 `@opencode-ai/sdk` 导入默认 `createOpencode`，而不是从 `@opencode-ai/sdk/v2` 导入 V2 client [E: packages/slack/src/index.ts:2]。默认 SDK 的 `createOpencode` 先 `createOpencodeServer(...)`，再用 returned `server.url` 创建 client [E: packages/sdk/js/src/index.ts:9] [E: packages/sdk/js/src/index.ts:14]。默认 SDK server 通过 `cross-spawn` 启动 `opencode serve --hostname=... --port=...`，并等待 stdout 中的 `opencode server listening` URL [E: packages/sdk/js/src/server.ts:32] [E: packages/sdk/js/src/server.ts:35] [E: packages/sdk/js/src/server.ts:56]。因此 Slack 节点属于 `v: na` 的外围 package，但它嵌入的是默认 opencode CLI server 面，运行行为跟 V1 活跑 server 更接近 [I]。

## 关键文件

| 文件 | 角色 |
|---|---|
| `packages/slack/src/index.ts` | Bolt App 初始化、opencode SDK server/client 启动、Slack message handler、tool update listener。 |
| `packages/slack/package.json` | 声明 `@opencode-ai/sdk` 与 `@slack/bolt` 依赖，并把 `bun run src/index.ts` 作为 dev 入口 [E: packages/slack/package.json:6] [E: packages/slack/package.json:11] [E: packages/slack/package.json:12]。 |
| `packages/slack/README.md` | 记录 Slack app setup、OAuth scopes 和 runtime env。 |
| `packages/sdk/js/src/index.ts` | 证明 `createOpencode` 返回 `{ client, server }` [E: packages/sdk/js/src/index.ts:18] [E: packages/sdk/js/src/index.ts:19]。 |
| `packages/sdk/js/src/server.ts` | 证明 SDK server 不是内嵌函数调用，而是 spawn `opencode serve` 子进程 [E: packages/sdk/js/src/server.ts:35]。 |

## 数据模型

Slack bot 用内存 `Map<string, { client; server; sessionId; channel; thread }>` 保存 Slack thread 到 opencode session 的映射 [E: packages/slack/src/index.ts:22]。`sessionKey` 由 Slack `channel` 和 thread timestamp 拼成，thread timestamp 优先取 `message.thread_ts`，没有 thread 时退回 `message.ts` [E: packages/slack/src/index.ts:68] [E: packages/slack/src/index.ts:69] [E: packages/slack/src/index.ts:70]。这个映射没有持久化；进程重启后 Slack thread 与 opencode session 的关联会丢失 [I]。

`handleToolUpdate(part, channel, thread)` 只处理 `part.state.status === "completed"` 的 tool part，回贴文本为 `*${part.tool}* - ${part.state.title}` [E: packages/slack/src/index.ts:41] [E: packages/slack/src/index.ts:42] [E: packages/slack/src/index.ts:43]。tool update 监听来自 `opencode.client.event.subscribe()` 的 async stream，只消费 `event.type === "message.part.updated"` 且 `part.type === "tool"` 的事件 [E: packages/slack/src/index.ts:24] [E: packages/slack/src/index.ts:26] [E: packages/slack/src/index.ts:28] [E: packages/slack/src/index.ts:30]。

## 控制流

1. `App@packages/slack/src/index.ts` 用 bot token、signing secret、Socket Mode 和 app token 初始化 Slack Bolt app [E: packages/slack/src/index.ts:4] [E: packages/slack/src/index.ts:5] [E: packages/slack/src/index.ts:6] [E: packages/slack/src/index.ts:7] [E: packages/slack/src/index.ts:8]。
2. `createOpencode@packages/slack/src/index.ts` 以 `port: 0` 参数启动 opencode server/client pair [E: packages/slack/src/index.ts:17] [E: packages/slack/src/index.ts:18]。
3. 事件监听 fiber 调用 `opencode.client.event.subscribe()`，收到 completed tool part 后遍历 `sessions`，按 `part.sessionID` 找到 Slack channel/thread 并回贴 tool title [E: packages/slack/src/index.ts:24] [E: packages/slack/src/index.ts:30] [E: packages/slack/src/index.ts:31] [E: packages/slack/src/index.ts:32] [E: packages/slack/src/index.ts:42]。
4. `app.message` 过滤有 subtype 或无 `text` 的 Slack message [E: packages/slack/src/index.ts:58] [E: packages/slack/src/index.ts:61]。
5. 如果 `sessions` 中没有当前 `channel-thread`，bot 调用 `client.session.create({ title: "Slack thread ..." })` 创建 session [E: packages/slack/src/index.ts:72] [E: packages/slack/src/index.ts:78] [E: packages/slack/src/index.ts:79]。
6. 新 session 创建成功后，bot 调用 `client.session.share({ path: { id } })`；当 share response 没有 error 且存在 `data` 时，代码读取 `data.share?.url` 并把 `sessionUrl` 贴到 Slack thread [E: packages/slack/src/index.ts:96] [E: packages/slack/src/index.ts:97] [E: packages/slack/src/index.ts:98] [E: packages/slack/src/index.ts:100]。
7. 每条 Slack 文本通过 `client.session.prompt({ path: { id }, body: { parts: [{ type: "text", text }] } })` 发给 session [E: packages/slack/src/index.ts:105] [E: packages/slack/src/index.ts:106] [E: packages/slack/src/index.ts:107]。
8. 成功 response 优先使用 `response.info?.content`，否则拼接 `response.parts` 中的 text part；没有 response text 时回退固定提示 [E: packages/slack/src/index.ts:125] [E: packages/slack/src/index.ts:127] [E: packages/slack/src/index.ts:128] [E: packages/slack/src/index.ts:130]。

## 设计动机与权衡

Slack integration 选择“每个 Slack thread 一个 opencode session”的映射，适配 Slack thread 的对话结构；README 也明确说 bot 会为每个 thread 创建 separate opencode sessions [E: packages/slack/README.md:27]。它在新 session 创建后用 share URL 把 terminal agent 的 web share 面暴露给 Slack 参与者；没有把完整 session transcript 直接复制进 Slack 的行为属于从当前源码路径得到的结论 [E: packages/slack/src/index.ts:96] [E: packages/slack/src/index.ts:100] [I]。

这个 package 不是 V2 embedded API 示例。V2 SDK 也有 `packages/sdk/js/src/v2/index.ts` 的 `createOpencode`，但 Slack 的 import 没有 `/v2` 后缀 [E: packages/slack/src/index.ts:2] [E: packages/sdk/js/src/v2/index.ts:10]。如果迁移 Slack 到 V2，应显式改 import 和生成 client surface，而不是只改 server runtime [I]。

## Gotcha

- `createOpencode({ port: 0 })` 会 spawn `opencode serve`，不是直接在 Slack 进程里 import `packages/opencode/src/server` [E: packages/slack/src/index.ts:17] [E: packages/sdk/js/src/server.ts:35]。
- `sessions` 是进程内 `Map`，没有 durable storage；Slack bot 重启后无法从 Slack thread 自动恢复旧 session id [E: packages/slack/src/index.ts:22] [I]。
- `/test` slash command 只是健康检查，ack 后直接 `say("Bot is working...")`；没有接入 opencode session 是从 handler body 得出的结论 [E: packages/slack/src/index.ts:139] [E: packages/slack/src/index.ts:141] [I]。

## Sources

- `packages/slack/src/index.ts`
- `packages/slack/package.json`
- `packages/slack/README.md`
- `packages/sdk/js/src/index.ts`
- `packages/sdk/js/src/server.ts`
- `packages/sdk/js/src/v2/index.ts`

## 相关

- `server.http-server`：Slack SDK spawn 的 `opencode serve` 最终进入 opencode HTTP server 面；本节点只覆盖 Slack 包的外围 glue。
