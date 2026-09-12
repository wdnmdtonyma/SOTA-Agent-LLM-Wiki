---
id: subsys.client.file-upload
title: client file-upload
kind: subsystem
tier: T2
pkg: client
source:
  - packages/client/file-upload/package.json
  - packages/client/file-upload/src/index.ts
  - packages/client/file-upload/src/http-route.ts
  - packages/client/file-upload/src/protocol.ts
  - packages/client/file-upload/src/types.ts
  - packages/client/file-upload/src/client/index.ts
  - packages/client/file-upload/src/client/runtime.ts
  - packages/bundle/web-app/cordis.patch.yml
symbols:
  - FileUploads
  - FileUploadRuntime
  - FILE_UPLOAD_PATH
  - FileUploadValue
  - FileUploadReceiptId
  - handleFileUploadHttp
related:
  - subsys.composition.bundle-web-app
  - subsys.persistence.attachment
  - subsys.client.store
  - surface.profiles.web
evidence: explicit
status: verified
updated: c291e7961a
---

> `@deepseek-ai/dsh-client-file-upload` 是 **web-app 挂载的浏览器上传服务**：host 占 `ctx.fileUploads`，client 占 `ctx.fileUpload`。走 Connection 上的 raw POST（`/api/session/uploadFileBinary`）或 Typert Remote `upload`，得到 Agent-scoped **staged receipt**，不是模型可见工具。

## 能回答的问题

- 这是不是一条 `dsh-tool-*`？模型能不能点名 `file-upload`？
- host 与 client 各自的 `ctx` 键是什么？谁 `inject` 谁？
- 流式字节路径和 base64 Remote 路径差在哪？
- receipt 怎样绑进 prompt、怎样失效？
- 五个 profile 里谁挂这一行？

## 职责边界

本包拥有：host `FileUploads`（staged map、HTTP 路由、command receipt resolver）、client `FileUploadRuntime`（Blob XHR / ReadableStream fetch worker）、协议路径 `FILE_UPLOAD_PATH`、receipt 类型。

本包**不**拥有：attachment 字节盘（[subsys.persistence.attachment](../persistence/attachment.md)）；Connection 认证（[subsys.client.connection](connection.md) 若存在则引用 host connection）；模型 turn。

**不是模型工具。** shipped `dsh-web-app` insert `id: file-upload`。 [E: packages/bundle/web-app/cordis.patch.yml:173] [E: packages/bundle/web-app/cordis.patch.yml:174]

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/client/file-upload/src/index.ts` | host `FileUploads` |
| `packages/client/file-upload/src/http-route.ts` | `handleFileUploadHttp` |
| `packages/client/file-upload/src/protocol.ts` | `FILE_UPLOAD_PATH` |
| `packages/client/file-upload/src/client/index.ts` | client `apply` → `FileUploadRuntime` |
| `packages/client/file-upload/package.json` | `dsh.client` immediately web |

## 数据模型

| 符号 | 要点 |
|---|---|
| `FILE_UPLOAD_PATH` | `'/api/session/uploadFileBinary'`。 [E: packages/client/file-upload/src/protocol.ts:2] |
| `FileUploads` | `TypertRemoteService`，键 `'fileUploads'`；静态 `inject = ['agents', 'attachments', 'commands', 'connection']`。 [E: packages/client/file-upload/src/index.ts:57] [E: packages/client/file-upload/src/index.ts:58] [E: packages/client/file-upload/src/index.ts:65] |
| `FileUploadValue` | `{ receiptId, file }`。 [E: packages/client/file-upload/src/types.ts:15] |
| `EncodedFileUploadRequest` | `{ data: base64, name? }`。 [E: packages/client/file-upload/src/types.ts:7] |
| `FileUploadRuntime` | client 键 `'fileUpload'`。 [E: packages/client/file-upload/src/client/runtime.ts:162] [E: packages/client/file-upload/src/client/runtime.ts:168] |

## 控制流

1. **web-app insert。** `id: file-upload` / `@deepseek-ai/dsh-client-file-upload`。注释写明 Blob / ReadableStream 不走 Connection RPC generation。 [E: packages/bundle/web-app/cordis.patch.yml:173]
2. **host 注册流式路由。** `ctx.connection.fetch.register({ path: FILE_UPLOAD_PATH, methods: ['POST'], requestBody: 'streaming', … })`。 [E: packages/client/file-upload/src/index.ts:74]
3. **HTTP 入站。** 仅 POST；`content-type` 必须是 `application/octet-stream`；query 要 `sessionId`。 [E: packages/client/file-upload/src/http-route.ts:23] [E: packages/client/file-upload/src/http-route.ts:27] [E: packages/client/file-upload/src/http-route.ts:31]
4. **落盘。** `uploadStream` → `attachments.saveFileStream`；Remote `upload` → `attachments.admitEncodedFile`。 [E: packages/client/file-upload/src/index.ts:126] [E: packages/client/file-upload/src/index.ts:108]
5. **client。** `apply` `inject = ['remote']`，`ctx.plugin(FileUploadRuntime)`。 [E: packages/client/file-upload/src/client/index.ts:18] [E: packages/client/file-upload/src/client/index.ts:25] `dsh.client.immediately: true`、`platform: web`。 [E: packages/client/file-upload/package.json:40]
6. **Blob 进度。** worker 里 `XMLHttpRequest` POST + `withCredentials`。 [E: packages/client/file-upload/src/client/runtime.ts:87] [E: packages/client/file-upload/src/client/runtime.ts:89]
7. **prompt 绑定。** `bindPrompt` 把 receipt 标上 `requestId`；未 `commit()` 则 dispose 回滚。 [E: packages/client/file-upload/src/index.ts:152]

## 设计动机

- 大文件不走 RPC 编码：独立 streaming route。
- receipt 是 Agent-scope 权威，不是把 bytes 再塞进 session 事件。
- fixture 页可关掉 background upload（`available === false`）。

## Gotcha

- **不是 tool。** 不要写进 tools-catalog 活行。
- **headless / sdk / acp / sdk-minimal 默认不 insert 本行。** 只在 `dsh-web-app`。
- 同一 host 只能 `registerAgentResolver` 一次。 [E: packages/client/file-upload/src/index.ts:91]

## Seam 三角

| 角色 | 落点 |
|---|---|
| **Definition** | host `ctx.fileUploads` / client `ctx.fileUpload` |
| **Provider** | 本包；web-app 行 `id: file-upload` |
| **Consumer** | commands receipt resolver、prompt 组装、attachment store |

## Sources

- packages/client/file-upload/package.json
- packages/client/file-upload/src/index.ts
- packages/client/file-upload/src/http-route.ts
- packages/client/file-upload/src/protocol.ts
- packages/client/file-upload/src/types.ts
- packages/client/file-upload/src/client/index.ts
- packages/client/file-upload/src/client/runtime.ts
- packages/bundle/web-app/cordis.patch.yml

## 相关

- [subsys.composition.bundle-web-app](../composition/bundle-web-app.md) — 挂载行。
- [subsys.persistence.attachment](../persistence/attachment.md) — 字节存储。
- [subsys.client.store](store.md) — 浏览器状态引擎（本包不实现 store）。
- [surface.profiles.web](../../surface/profiles/web.md) — 唯一默认挂本服务的 profile。
