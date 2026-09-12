---
id: subsys.persistence.session-format
title: Session format v3 与 adjacent migration
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
  - packages/session/session-format-v2-to-v3/src/migration.ts
  - packages/session/session-format-v2-to-v3/package.json
  - packages/session/session-persistence-jsonl/src/index.ts
symbols:
  - SESSION_FORMAT_VERSION
  - createSessionFormatChain
  - defineSessionFormatMigration
  - createSessionFormatCatalog
  - sessionFormatCatalog
  - sessionFormatV0ToV1
  - sessionFormatV1ToV2
  - sessionFormatV2ToV3
  - sessionFormatLogFilename
related:
  - subsys.persistence.jsonl
  - subsys.persistence.session-persistence
  - subsys.core.session
  - spine.session-log
evidence: explicit
status: verified
updated: c291e7961a
---

> Session 盘的**逻辑 generation** 是 `SESSION_FORMAT_VERSION = 3`。adjacent 链 `v0→v1→v2→v3` 由 `@deepseek-ai/dsh-session-format` 规划、`@deepseek-ai/dsh-session-format-catalog` 安装、JSONL Provider 在 load 时执行。比 3 新的盘拒绝。v2→v3 把 `request/header.system` 提升为 `system/message`，并把旧 preset id `code` 重写为 `ptc`。没有「version 0 且无 migration」这条路径。

## 能回答的问题

- `SESSION_FORMAT_VERSION` 现在是几？谁拥有这个常量？
- adjacent 是什么意思？`to !== from + 1` 会怎样？
- catalog 里有几条 codec、几条 migration？JSONL 何时调用它？
- 盘上文件名 `session.jsonl` 与 `session.v3.jsonl` 怎么对应 generation？
- v2→v3 怎样插入 synthetic `system/message`、怎样把 `code` 改成 `ptc`？
- 比当前版本更新的日志会不会被静默读成 v3？

## 职责边界

本页拥有：**逻辑 format 版本**、**adjacent 规划器**、**installed catalog**、**v2→v3 语义**（system prompt 出 header、preset `code`→`ptc`），以及 **JSONL load 接缝**（catalog `createRestore` / `readHeader`）。

本页**不**拥有：`SessionHandle` / lease / 物理 JSONL 编码（[subsys.persistence.jsonl](jsonl.md)）；`Session.append` / `deriveMessages`（[subsys.core.session](../core/session.md)）；已删除的 SQLite session persistence（[subsys.persistence.sqlite](sqlite.md)）。不要为 `session-format-v2-to-v3` 另建节点。

这是 **host 面**纯库 + JSONL 消费，不是 Cordis 插件行。agent-preset 不另造一份 format。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/core/session/src/types.ts` | `SESSION_FORMAT_VERSION = 3`；`EpochHeader` 无 `system`；`system/message` 是 surface |
| `packages/session/session-format/src/chain.ts` | `defineSessionFormatMigration`、`createSessionFormatChain` |
| `packages/session/session-format/src/catalog.ts` | `createSessionFormatCatalog`：codec + chain |
| `packages/session/session-format/src/filename.ts` | `sessionFormatLogFilename`：v0=`session.jsonl`，vN=`session.vN.jsonl` |
| `packages/session/session-format-catalog/src/generated.ts` | `sessionFormatCatalog`：`currentVersion: 3` |
| `packages/session/session-format-v0-to-v1/src/migration.ts` | `sessionFormatV0ToV1`（`fromVersion: 0`） |
| `packages/session/session-format-v1-to-v2/src/migration.ts` | `sessionFormatV1ToV2`（`fromVersion: 1`） |
| `packages/session/session-format-v2-to-v3/src/migration.ts` | `sessionFormatV2ToV3`（`fromVersion: 2`） |
| `packages/session/session-persistence-jsonl/src/index.ts` | 构造时核对 catalog；load 走 `createRestore` |

## 数据模型

| 符号 | 要点 |
|---|---|
| `SESSION_FORMAT_VERSION` | **3**。当前逻辑 header / 当前 generation 都钉这个数。加普通事件 type **不** bump（`ignorable`）。 [E: packages/core/session/src/types.ts:88] |
| `EpochHeader` | `config` + 可选 `adapterDefaults` / `tools`。**没有 `system` 字段**；system prompt 是 surface 上的 `system/message`。 [E: packages/core/session/src/types.ts:232] [E: packages/core/session/src/types.ts:310] |
| `defineSessionFormatMigration` | `to === from + 1`，否则抛 `SessionFormatError`。 [E: packages/session/session-format/src/chain.ts:30] |
| `createSessionFormatChain` | 从 0 一直到 `currentVersion-1` 每档必须有一条 adjacent migration。 [E: packages/session/session-format/src/chain.ts:41] [E: packages/session/session-format/src/chain.ts:65] |
| `plan(from)` | `from > currentVersion` → `SessionFormatUnsupportedMigrationError`（newer-than-current 拒读）。 [E: packages/session/session-format/src/chain.ts:81] [E: packages/session/session-format/src/chain.ts:82] |
| `sessionFormatCatalog` | `currentVersion: 3`；codecs v0/v1/v2/v3；migrations `[sessionFormatV0ToV1, sessionFormatV1ToV2, sessionFormatV2ToV3]`。 [E: packages/session/session-format-catalog/src/generated.ts:15] [E: packages/session/session-format-catalog/src/generated.ts:16] [E: packages/session/session-format-catalog/src/generated.ts:18] |
| `sessionFormatV0ToV1` | `fromVersion: 0`，`toVersion: 1`。 [E: packages/session/session-format-v0-to-v1/src/migration.ts:27] |
| `sessionFormatV1ToV2` | `fromVersion: 1`，`toVersion: 2`；把 v1 top-level Assistant chunk 嵌进 v2 attempt。 [E: packages/session/session-format-v1-to-v2/src/migration.ts:44] [E: packages/session/session-format-v1-to-v2/src/migration.ts:150] |
| `sessionFormatV2ToV3` | `fromVersion: 2`，`toVersion: 3`。header 上 `agentPreset === 'code'` 写成 `'ptc'`；事件流插入 synthetic `system/message`，并从 `request/header` 剥掉 `system`。 [E: packages/session/session-format-v2-to-v3/src/migration.ts:14] [E: packages/session/session-format-v2-to-v3/src/migration.ts:18] [E: packages/session/session-format-v2-to-v3/src/migration.ts:53] [E: packages/session/session-format-v2-to-v3/src/migration.ts:73] |
| `sessionFormatLogFilename` | generation 0 → `session.jsonl`；否则 `session.v${generation}.jsonl`。 [E: packages/session/session-format/src/filename.ts:16] |

## 控制流

1. **常量与 catalog 必须同版本。** JSONL 构造时 `sessionFormatCatalog.currentVersion !== SESSION_FORMAT_VERSION` 直接 throw。 [E: packages/session/session-persistence-jsonl/src/index.ts:263]
2. **load 走 catalog，不手写 if-version。** JSONL 把 catalog 包成 `generationFormat`：`createRestore` / `encodeCurrentHeader` / `encodeCurrentEvent`。历史 generation 调 `prepareJsonlMigration`，再 `publish()` 成当前文件。 [E: packages/session/session-persistence-jsonl/src/index.ts:272] [E: packages/session/session-persistence-jsonl/src/index.ts:274] [E: packages/session/session-persistence-jsonl/src/index.ts:606]
3. **已经是 v3** 的 artifact 走 `CurrentSessionFormatRestore`（`restoreCurrent`），不再跑 migrator。 [E: packages/session/session-format/src/catalog.ts:131]
4. **v0 盘** `plan(0)` 切出三条 adjacent：v0→v1 → v1→v2 → v2→v3。缺档在 chain 构造期就失败。 [E: packages/session/session-format/src/chain.ts:65] [E: packages/session/session-format/src/chain.ts:68]
5. **比 3 新** 的 stored version：`plan` 抛 unsupported；catalog `readHeader` 也标 `status: 'unsupported'`。 [E: packages/session/session-format/src/chain.ts:81] [E: packages/session/session-format/src/catalog.ts:52]
6. **v2→v3 提升 system prompt。** 遇到 `request/header` 时拆出 `system` 字符串；prompt 相对上次变化则 `emitSystem` 一条 `system/message`（首次 `surfaceOp: 'append'`，之后 replace 同一个 head）。输出 header **不再带 `system`**。 [E: packages/session/session-format-v2-to-v3/src/migration.ts:50] [E: packages/session/session-format-v2-to-v3/src/migration.ts:53] [E: packages/session/session-format-v2-to-v3/src/migration.ts:54]
7. **v2→v3 重写 PTC 词汇。** header / `agent-preset/selected` 的 `code` → `ptc`；`tool/code-dispatch*` → `tool/ptc-dispatch*`；message `source.plugin === 'tools-code-mode'` → `'tools-ptc'`。 [E: packages/session/session-format-v2-to-v3/src/migration.ts:18] [E: packages/session/session-format-v2-to-v3/src/migration.ts:145] [E: packages/session/session-format-v2-to-v3/src/migration.ts:172]

## 设计动机

- **adjacent only**：禁止跳版本，避免「一份 migrator 吃所有历史」。
- **catalog 独立于插件**：generated 直接 import 三条 frozen migrator，JSONL 不依赖运行时挂载 format 插件。
- **newer-than-current 拒**：新 runtime 写的盘不能被旧 runtime 静默降级。
- **system 出 header**：v3 把渲染后的 system prompt 当成 surface 第 0 号节点，请求 header 只剩 call config / tools。旧盘靠 v2→v3 插入 synthetic `system/message` 保住 chronology。
- **`code`→`ptc`**：preset 目录已改名；迁盘时一起改 header 与事件，避免 resume 装到已不存在的 `code` preset。

## Gotcha

- **v0 仍存在于链上，但当前写入是 v3。** 不要把「支持读 v0」写成「产品现在写 version 0」，也不要写「链止于 v2」。
- **JSONL 文件名 generation 与 header.version 对齐**，压缩后缀 `.zstd` 不是 format 版本。当前 writer 写 `session.v3.jsonl[.zstd]`。物理细节在 [subsys.persistence.jsonl](jsonl.md)。
- **没有 shipped SQLite session persistence** 去跑同一条 catalog。query/storage sqlite 是别的包。
- **加事件 type 不 bump 版本。** 漏标 `ignorable` 的新 type 会让旧 runtime 拒读；那是词汇门，不是 format bump。

## Seam 三角

| 角色 | 落点 |
|---|---|
| **Definition** | `dsh-session` 的 `SESSION_FORMAT_VERSION` + `dsh-session-format` 的 chain/catalog API |
| **Provider（installed codecs）** | `dsh-session-format-catalog` + `v0-to-v1` / `v1-to-v2` / `v2-to-v3` |
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
- packages/session/session-format-v2-to-v3/src/migration.ts
- packages/session/session-format-v2-to-v3/package.json
- packages/session/session-persistence-jsonl/src/index.ts

## 相关

- [subsys.persistence.jsonl](jsonl.md) — JSONL 盘、lease、generation 文件。
- [subsys.persistence.session-persistence](session-persistence.md) — `SessionHandle` 缝。
- [subsys.core.session](../core/session.md) — 内存 `Session` / `SurfaceOp`。
- [spine.session-log](../../spine/session-log.md) — 日志脊柱。
