---
id: subsys.persistence.session-format
title: Session format v2 与 adjacent migration
kind: subsystem
tier: T2
pkg: persistence
source:
  - packages/core/session/src/types.ts
  - packages/session/session-format/src/index.ts
  - packages/session/session-format/src/chain.ts
  - packages/session/session-format/src/catalog.ts
  - packages/session/session-format/src/filename.ts
  - packages/session/session-format/package.json
  - packages/session/session-format-catalog/src/index.ts
  - packages/session/session-format-catalog/src/generated.ts
  - packages/session/session-format-catalog/package.json
  - packages/session/session-format-v0-to-v1/src/migration.ts
  - packages/session/session-format-v0-to-v1/package.json
  - packages/session/session-format-v1-to-v2/src/migration.ts
  - packages/session/session-format-v1-to-v2/package.json
  - packages/session/session-persistence-jsonl/src/index.ts
symbols:
  - SESSION_FORMAT_VERSION
  - createSessionFormatChain
  - defineSessionFormatMigration
  - createSessionFormatCatalog
  - sessionFormatCatalog
  - sessionFormatV0ToV1
  - sessionFormatV1ToV2
  - sessionFormatLogFilename
related:
  - subsys.persistence.jsonl
  - subsys.persistence.session-persistence
  - subsys.core.session
  - spine.session-log
evidence: explicit
status: verified
updated: d347e70390
---

> Session 盘的**逻辑 generation** 是 `SESSION_FORMAT_VERSION = 2`。adjacent 链 `v0→v1→v2` 由 `@deepseek-ai/dsh-session-format` 规划、`@deepseek-ai/dsh-session-format-catalog` 安装、JSONL Provider 在 load 时执行。比 2 新的盘拒绝。没有「version 0 且无 migration」这条路径。

## 能回答的问题

- `SESSION_FORMAT_VERSION` 现在是几？谁拥有这个常量？
- adjacent 是什么意思？`to !== from + 1` 会怎样？
- catalog 里有几条 codec、几条 migration？JSONL 何时调用它？
- 盘上文件名 `session.jsonl` 与 `session.v2.jsonl` 怎么对应 generation？
- 比当前版本更新的日志会不会被静默读成 v2？

## 职责边界

本页拥有：**逻辑 format 版本**、**adjacent 规划器**、**installed catalog**、以及 **JSONL load 接缝**（catalog `migrate` / `decode*`）。

本页**不**拥有：`SessionHandle` / lease / 物理 JSONL 编码（[subsys.persistence.jsonl](jsonl.md)）；`Session.append` / `deriveMessages`（[subsys.core.session](../core/session.md)）；已删除的 SQLite session persistence（[subsys.persistence.sqlite](sqlite.md)）。

这是 **host 面**纯库 + JSONL 消费，不是 Cordis 插件行。agent-preset 不另造一份 format。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/core/session/src/types.ts` | `SESSION_FORMAT_VERSION = 2` |
| `packages/session/session-format/src/chain.ts` | `defineSessionFormatMigration`、`createSessionFormatChain` |
| `packages/session/session-format/src/catalog.ts` | `createSessionFormatCatalog`：codec + chain |
| `packages/session/session-format/src/filename.ts` | `sessionFormatLogFilename`：v0=`session.jsonl`，vN=`session.vN.jsonl` |
| `packages/session/session-format-catalog/src/generated.ts` | `sessionFormatCatalog`：`currentVersion: 2` |
| `packages/session/session-format-v0-to-v1/src/migration.ts` | `sessionFormatV0ToV1`（`fromVersion: 0`） |
| `packages/session/session-format-v1-to-v2/src/migration.ts` | `sessionFormatV1ToV2`（`fromVersion: 1`） |
| `packages/session/session-persistence-jsonl/src/index.ts` | load 时 `sessionFormatCatalog.migrate` |

## 数据模型

| 符号 | 要点 |
|---|---|
| `SESSION_FORMAT_VERSION` | **2**。当前逻辑 header / 当前 generation 都钉这个数。 [E: packages/core/session/src/types.ts:86] |
| `defineSessionFormatMigration` | `to === from + 1`，否则抛 `SessionFormatError`。 [E: packages/session/session-format/src/chain.ts:27] |
| `createSessionFormatChain` | 从 0 一直到 `currentVersion-1` 每档必须有一条 adjacent migration。 [E: packages/session/session-format/src/chain.ts:38] [E: packages/session/session-format/src/chain.ts:64] |
| `plan(from)` | `from > currentVersion` → `SessionFormatUnsupportedMigrationError`（newer-than-current 拒读）。 [E: packages/session/session-format/src/chain.ts:80] [E: packages/session/session-format/src/chain.ts:82] |
| `sessionFormatCatalog` | `currentVersion: 2`；codecs v0/v1/v2；migrations `[sessionFormatV0ToV1, sessionFormatV1ToV2]`。 [E: packages/session/session-format-catalog/src/generated.ts:13] [E: packages/session/session-format-catalog/src/generated.ts:14] [E: packages/session/session-format-catalog/src/generated.ts:17] |
| `sessionFormatV0ToV1` | `fromVersion: 0`，`toVersion: 1`。 [E: packages/session/session-format-v0-to-v1/src/migration.ts:26] |
| `sessionFormatV1ToV2` | `fromVersion: 1`，`toVersion: 2`；把 v1 top-level Assistant chunk 嵌进 v2 attempt。 [E: packages/session/session-format-v1-to-v2/src/migration.ts:36] |
| `sessionFormatLogFilename` | generation 0 → `session.jsonl`；否则 `session.v${generation}.jsonl`。 [E: packages/session/session-format/src/filename.ts:16] |

## 控制流

1. **常量与 catalog 必须同版本。** JSONL 构造时 `sessionFormatCatalog.currentVersion !== SESSION_FORMAT_VERSION` 直接 throw。 [E: packages/session/session-persistence-jsonl/src/index.ts:172]
2. **load 走 catalog，不手写 if-version。** `generationFormat.migrate`：`decodeRecoverableArtifact` → `sessionFormatCatalog.migrate` → `encodeCurrent`。 [E: packages/session/session-persistence-jsonl/src/index.ts:184] [E: packages/session/session-persistence-jsonl/src/index.ts:185] [E: packages/session/session-persistence-jsonl/src/index.ts:186]
3. **已经是 v2** 的 artifact 走 `restoreCurrent`，不再跑 migrator。 [E: packages/session/session-format/src/chain.ts:91]
4. **v0 盘** `plan(0)` 切出两条 adjacent：v0→v1 再 v1→v2。缺档在 chain 构造期就失败。 [E: packages/session/session-format/src/chain.ts:66]
5. **比 2 新** 的 stored version：`plan` 抛 unsupported；catalog `readHeader` 也标 `status: 'unsupported'`。 [E: packages/session/session-format/src/chain.ts:80] [E: packages/session/session-format/src/catalog.ts:47]

## 设计动机

- **adjacent only**：禁止跳版本，避免「一份 migrator 吃所有历史」。
- **catalog 独立于插件**：generated 直接 import 两条 frozen migrator，JSONL 不依赖运行时挂载 format 插件。
- **newer-than-current 拒**：新 runtime 写的盘不能被旧 runtime 静默降级。

## Gotcha

- **v0 仍存在于链上，但当前写入是 v2。** 不要把「支持读 v0」写成「产品现在写 version 0」。
- **JSONL 文件名 generation 与 header.version 对齐**，压缩后缀 `.zstd` 不是 format 版本。物理细节在 [subsys.persistence.jsonl](jsonl.md)。
- **没有 shipped SQLite session persistence** 去跑同一条 catalog。query/storage sqlite 是别的包。

## Seam 三角

| 角色 | 落点 |
|---|---|
| **Definition** | `dsh-session` 的 `SESSION_FORMAT_VERSION` + `dsh-session-format` 的 chain/catalog API |
| **Provider（installed codecs）** | `dsh-session-format-catalog` + `v0-to-v1` / `v1-to-v2` |
| **Consumer** | `dsh-session-persistence-jsonl` load / generation 发表 |

## Sources

- packages/core/session/src/types.ts
- packages/session/session-format/src/index.ts
- packages/session/session-format/src/chain.ts
- packages/session/session-format/src/catalog.ts
- packages/session/session-format/src/filename.ts
- packages/session/session-format/package.json
- packages/session/session-format-catalog/src/index.ts
- packages/session/session-format-catalog/src/generated.ts
- packages/session/session-format-catalog/package.json
- packages/session/session-format-v0-to-v1/src/migration.ts
- packages/session/session-format-v0-to-v1/package.json
- packages/session/session-format-v1-to-v2/src/migration.ts
- packages/session/session-format-v1-to-v2/package.json
- packages/session/session-persistence-jsonl/src/index.ts

## 相关

- [subsys.persistence.jsonl](jsonl.md) — JSONL 盘、lease、generation 文件。
- [subsys.persistence.session-persistence](session-persistence.md) — `SessionHandle` 缝。
- [subsys.core.session](../core/session.md) — 内存 `Session` / `SurfaceOp`。
- [spine.session-log](../../spine/session-log.md) — 日志脊柱。
