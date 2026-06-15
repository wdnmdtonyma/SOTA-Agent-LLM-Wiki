---
id: ref.id-prefixes
title: ID 前缀 catalog + project-ID hashing
kind: reference
tier: T3
v: shared
source:
  - packages/core/src/id/id.ts
  - packages/core/src/project.ts
  - packages/core/src/util/hash.ts
  - packages/core/src/session/schema.ts
  - packages/core/src/session/message-id.ts
status: verified
symbols:
  - Identifier
  - Project.ID
  - Session.ID
  - SessionMessageID
evidence: explicit
updated: 92c70c9c3
---

> 这份节点是 ID wire format 的小总账：哪些前缀是 core `Identifier` 管理的，哪些是 domain-specific 本地 ID，以及 project ID 如何由 Git root/remote 派生。

## 能回答的问题

- `ses_...`、`msg_...`、`evt_...` 这类 ID 的格式是什么？
- core `Identifier.given` 如何验证前缀？
- 10 个 canonical prefix 是哪些？
- project ID 为什么有时不是带下划线的 prefixed ID，而是 hash？

## V2

### ID format

core `Identifier` 的 canonical prefix 表包含 10 个条目：`job`、`evt`、`ses`、`msg`、`per`、`que`、`prt`、`pty`、`tool`、`wrk`。[E: packages/core/src/id/id.ts:4][E: packages/core/src/id/id.ts:5][E: packages/core/src/id/id.ts:6][E: packages/core/src/id/id.ts:7][E: packages/core/src/id/id.ts:8][E: packages/core/src/id/id.ts:9][E: packages/core/src/id/id.ts:10][E: packages/core/src/id/id.ts:11][E: packages/core/src/id/id.ts:12][E: packages/core/src/id/id.ts:13] ID body 长度常量是 26；`create` 组合 timestamp/counter，descending ID 会先做 bitwise inversion，随后把 6 bytes 序列化成 12 hex 字符，再追加 `randomBase62(LENGTH - 12)`。[E: packages/core/src/id/id.ts:16][E: packages/core/src/id/id.ts:60][E: packages/core/src/id/id.ts:62][E: packages/core/src/id/id.ts:64][E: packages/core/src/id/id.ts:69] 因此 prefixed ID 的可见长度是 prefix 长度、一个 `_`、再加 26 个 body 字符。[I]

当 `given` 传给 `Identifier.ascending(prefix, given?)` 或 `Identifier.descending(prefix, given?)` 时，私有 `generateID` 会要求 value 以该 type 的 prefix 开头；实现检查的是 `startsWith(prefix)` 本身，而不是完整 `prefix_` 分隔符。[E: packages/core/src/id/id.ts:22][E: packages/core/src/id/id.ts:26][E: packages/core/src/id/id.ts:30][E: packages/core/src/id/id.ts:35][E: packages/core/src/id/id.ts:36]

`timestamp(id)` 从下划线前读 prefix，再取 body 前 12 个 hex 字符并除以 `0x1000`。[E: packages/core/src/id/id.ts:73][E: packages/core/src/id/id.ts:74][E: packages/core/src/id/id.ts:75][E: packages/core/src/id/id.ts:76][E: packages/core/src/id/id.ts:77]

### Canonical prefix catalog

| Type | Prefix | 常见 domain | Evidence |
|---|---|---|---|
| `job` | `job_` | background job | [E: packages/core/src/id/id.ts:4] |
| `event` | `evt_` | EventV2 event ID | [E: packages/core/src/id/id.ts:5][E: packages/core/src/event.ts:13] |
| `session` | `ses_` | session ID | [E: packages/core/src/id/id.ts:6][E: packages/core/src/session/schema.ts:12][E: packages/core/src/session/schema.ts:15] |
| `message` | `msg_` | message ID | [E: packages/core/src/id/id.ts:7][E: packages/core/src/session/message-id.ts:7] |
| `permission` | `per_` | V2 permission request ID | [E: packages/core/src/id/id.ts:8][E: packages/core/src/permission.ts:21][E: packages/core/src/permission.ts:23] |
| `question` | `que_` | question request ID | [E: packages/core/src/id/id.ts:9][E: packages/core/src/question.ts:9][E: packages/core/src/question.ts:11] |
| `part` | `prt_` | message part ID | [E: packages/core/src/id/id.ts:10] |
| `pty` | `pty_` | PTY connection/session | [E: packages/core/src/id/id.ts:11] |
| `tool` | `tool_` | tool call identity | [E: packages/core/src/id/id.ts:12] |
| `workspace` | `wrk_` | control-plane workspace | [E: packages/core/src/id/id.ts:13][E: packages/core/src/workspace.ts:7][E: packages/core/src/workspace.ts:11][E: packages/core/src/workspace.ts:15] |

### Domain-specific IDs outside canonical table

| ID | Prefix | Source | 备注 |
|---|---|---|---|
| Credential ID | `cred_` | [E: packages/core/src/credential.ts:18] | credential table primary key uses local helper, not `id/id.ts` prefix table。 |
| Saved permission ID | `psv_` | [E: packages/core/src/permission/saved.ts:13] | saved allow rule ID differs from interactive `per_` permission request ID。 |
| Connector attempt ID | `con_` | [E: packages/core/src/connector.ts:21] | 命名陷阱：`packages/core/src/connector.ts` 是本地凭据注册表的 connector/attempt helper，不是云连接器。[I] |

## Project ID hashing and fallback

`Project.ID` 是 branded string，唯一内置常量是 `"global"`。[E: packages/core/src/project.ts:15][E: packages/core/src/project.ts:18] 这意味着 project ID 不必是 `xxx_` prefixed ID；git project 的 ID 可能来自 remote hash、repo-local cache，或直接来自 git root path。[E: packages/core/src/project.ts:141][I]

Project resolve 流程：

1. 如果不是 git repository，`resolve` 返回 `Project.ID.global` 并把 directory 设为 filesystem root。[E: packages/core/src/project.ts:136][E: packages/core/src/project.ts:138]
2. 如果是 git repository，先读取 repo-local cache 到 `previous`，然后按 `remote(repo) ?? previous ?? root(repo)` 选择 ID。[E: packages/core/src/project.ts:140][E: packages/core/src/project.ts:141]
3. `remote(repo)` 读取 git remote URL，normalize 后返回 `Hash.fast("git-remote:" + normalized)`。[E: packages/core/src/project.ts:100][E: packages/core/src/project.ts:102][E: packages/core/src/project.ts:104]
4. URL normalize 会拒绝 `file:` URL、处理 SCP-style URL、lowercase host、去掉结尾 `.git` 或 slash。[E: packages/core/src/project.ts:113][E: packages/core/src/project.ts:116][E: packages/core/src/project.ts:117][E: packages/core/src/project.ts:125][E: packages/core/src/project.ts:128]
5. `root(repo)` 使用第一个 git root 路径本身作为 fallback project ID，不再额外 hash。[E: packages/core/src/project.ts:132][E: packages/core/src/project.ts:133]
6. `Hash.fast` 当前实现是 sha1 hex digest。[E: packages/core/src/util/hash.ts:4][E: packages/core/src/util/hash.ts:5]

`commit` 会把 project ID 写入 repo-local cache 文件名 `opencode`，后续 resolve 可用该缓存维持稳定 ID。[E: packages/core/src/project.ts:151]

## V1

V1 live code 仍有自己历史上的 `Identifier.create("evt","ascending")` 用法，例如 GlobalBus 在 payload 没有 id 时填入事件 ID。[E: packages/opencode/src/bus/global.ts:2][E: packages/opencode/src/bus/global.ts:15][E: packages/opencode/src/bus/global.ts:16] 但本节点的 10 prefix canonical 表来自 `packages/core/src/id/id.ts`，不要把 V1 legacy helper 的所有 prefix 假定为 V2 canonical。[I]

## Sources

- `packages/core/src/id/id.ts`
- `packages/core/src/util/identifier.ts`
- `packages/core/src/session/schema.ts`
- `packages/core/src/session/message-id.ts`
- `packages/core/src/event.ts`
- `packages/core/src/project.ts`
- `packages/core/src/util/hash.ts`
- `packages/core/src/permission.ts`
- `packages/core/src/question.ts`
- `packages/core/src/workspace.ts`
- `packages/core/src/credential.ts`
- `packages/core/src/permission/saved.ts`
- `packages/core/src/connector.ts`
- `packages/opencode/src/bus/global.ts`

## 相关

- `persistence.project-instance-location`
- `spine.v2-event-sourcing`
- `ref.events`
- `ref.db-schema`
