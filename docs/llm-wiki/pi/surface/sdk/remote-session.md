---
id: surface.sdk.remote-session
title: RemoteSession 已退役（re-export pi-client）
kind: surface
tier: T1
pkg: coding-agent
source:
  - packages/coding-agent/package.json
  - packages/coding-agent/src/client/index.ts
  - packages/coding-agent/test/package-distribution.test.ts
  - packages/client/src/index.ts
  - packages/client/src/client.ts
symbols:
  - Client
  - createClientServiceTransport
related:
  - surface.sdk.embedding
  - subsys.protocol.wire-protocol
  - subsys.client.remote-session-client
evidence: explicit
status: verified
updated: bbb61e34aa
---

> `surface.sdk.remote-session` 记录 `@earendil-works/pi-coding-agent/client` 的退役：`RemoteSession` / transcript reducer 已删除；该 subpath 只 source-only re-export `@earendil-works/pi-client` 的 Chord 风格 `Client`。

## 能回答的问题

- coding-agent 的 `./client` subpath 现在导出什么？还存在 `RemoteSession` 吗？
- 远程会话 SDK 应该从哪个 package 导入？
- `./client` 为什么不是 shipped npm runtime export？
- 旧的 attach / prompt / transcript reducer 语义去哪了？

## 退役面

`packages/coding-agent/src/client/` 只剩 `index.ts`，整文件是 `export * from "@earendil-works/pi-client"` [E: packages/coding-agent/src/client/index.ts:1]。不再存在 `remote-session.ts` / `transcript.ts`，因此没有 `RemoteSession`、`RemoteSessionLifecycle`、`applyTranscriptSnapshot` 或 `selectTranscript`。

package manifest 把 `./client` 标成 `{ source: "./src/client/index.ts" }`，与 `./experimental/plugin` 一样是 source-only 条件；`files` 显式排除 `dist/client` [E: packages/coding-agent/package.json:22] [E: packages/coding-agent/package.json:25] [E: packages/coding-agent/package.json:31]。发布回归测试锁住这两条 export 不得变成 runtime `import` [E: packages/coding-agent/test/package-distribution.test.ts:28] [E: packages/coding-agent/test/package-distribution.test.ts:29]。`pi-client` / `pi-protocol` / `pi-server` 只出现在 coding-agent 的 `devDependencies`，不在 shipped `dependencies` [E: packages/coding-agent/package.json:76] [E: packages/coding-agent/package.json:77] [E: packages/coding-agent/package.json:78] [I]。

调用远程协议应直接依赖 `@earendil-works/pi-client`。其 root export 是 `Client`、`createClientServiceTransport` 与 `ServerError` / `DisconnectedError` / `ClientDisposedError` [E: packages/client/src/index.ts:1] [E: packages/client/src/index.ts:2]。

## 现行公开面（re-export 的真实符号）

`Client` 是 transport-neutral Chord client：构造时校验 canonical lowercase UUIDv4 `serverId`，再通过 `ByteTransportFactory` 建连 [E: packages/client/src/client.ts:62] [E: packages/client/src/client.ts:77] [E: packages/client/src/client.ts:78]。公开操作是 `connect` / `reconnect` / `request` / `serviceCatalogue` / `subscribeService`，以及 `onAttachmentChange`；没有 `acquireSession` / `createSession` / `prompt` [E: packages/client/src/client.ts:117] [E: packages/client/src/client.ts:155] [E: packages/client/src/client.ts:159] [E: packages/client/src/client.ts:172] [E: packages/client/src/client.ts:148]。

`createClientServiceTransport(client, getTarget)` 把懒解析的 `RpcTarget` 适配成 Chord `RemoteServiceTransport`（`invoke` + `subscribe`）[E: packages/client/src/client.ts:448] [E: packages/client/src/client.ts:458] [E: packages/client/src/client.ts:459]。Transcript / models / session directory 是应用层 Chord service，不在 coding-agent `./client` 里做 snapshot reducer [I]。

## 装配与门控

发布 CLI entry `packages/coding-agent/src/cli.ts` 只调用 `main()`，不 import `src/client` 或 experimental 树 [E: packages/coding-agent/src/cli.ts:6]。`tsconfig.build.json` 排除 `src/client`、`src/experimental`、`src/cli/experimental`，这些树不会进 shipped `dist` [E: packages/coding-agent/tsconfig.build.json:19]。workspace / `pi-test.sh` 开发入口才能解析 source export。

## Gotcha

- 不要把 `@earendil-works/pi-coding-agent/client` 当成 npm tarball 的稳定 runtime API；它与 experimental plugin 一样是 source-only [E: packages/coding-agent/test/package-distribution.test.ts:28] [E: packages/coding-agent/package.json:22]。
- 本地产品会话仍是主包导出的 `AgentSession`（`surface.sdk.embedding`）。`Client` 只搬运 routed envelope 与 Chord service 调用，不执行模型请求 [I]。
- 旧文档里的 exclusive `PiSessionHandle` lease、`submit()`/`steer()` 门控、client-side transcript overlay 都已删除；现行 attachment / subscription 写在 `subsys.client.session-leases` [I]。

## Sources

- packages/coding-agent/package.json
- packages/coding-agent/src/client/index.ts
- packages/coding-agent/src/cli.ts
- packages/coding-agent/tsconfig.build.json
- packages/coding-agent/test/package-distribution.test.ts
- packages/client/src/index.ts
- packages/client/src/client.ts

## 相关

- [surface.sdk.embedding](embedding.md): 本地 `AgentSession` embedding API，不是远程 `Client`。
- [subsys.protocol.wire-protocol](../../subsystems/protocol/wire-protocol.md): version-8 routed envelope（hello / request / cancel / attachment / service_update）。
- [subsys.client.remote-session-client](../../subsystems/client/remote-session-client.md): `@earendil-works/pi-client` 的 `Client` 与 `createClientServiceTransport`。
