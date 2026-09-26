---
id: subsys.persistence.session-format
title: Session format v4 与 adjacent migration
kind: subsystem
tier: T2
pkg: persistence
source:
  - packages/core/session/src/types.ts
  - packages/core/session/src/surface.ts
  - packages/session/session-format/src/index.ts
  - packages/session/session-format/src/chain.ts
  - packages/session/session-format/src/catalog.ts
  - packages/session/session-format/src/filename.ts
  - packages/session/session-format/package.json
  - packages/session/session-format-catalog/src/index.ts
  - packages/session/session-format-catalog/src/generated.ts
  - packages/session/session-format-catalog/src/children.ts
  - packages/session/session-format-catalog/package.json
  - packages/session/session-format-v0-to-v1/src/migration.ts
  - packages/session/session-format-v0-to-v1/package.json
  - packages/session/session-format-v1-to-v2/src/migration.ts
  - packages/session/session-format-v1-to-v2/package.json
  - packages/session/session-format-v2-to-v3/src/migration.ts
  - packages/session/session-format-v2-to-v3/package.json
  - packages/session/session-format-v3-to-v4/src/migration.ts
  - packages/session/session-format-v3-to-v4/src/tool-role.ts
  - packages/session/session-format-v3-to-v4/src/retired-syntax.ts
  - packages/session/session-format-v3-to-v4/package.json
  - packages/session/session-persistence-jsonl/src/index.ts
symbols:
  - SESSION_FORMAT_VERSION
  - createSessionFormatChain
  - defineSessionFormatMigration
  - createSessionFormatCatalog
  - sessionFormatCatalog
  - createSessionFormatCatalogWithChildren
  - createSessionFormatV3ToV4
  - liftToolResult
  - sessionFormatV0ToV1
  - sessionFormatV1ToV2
  - sessionFormatV2ToV3
  - sessionFormatV3ToV4
  - sessionFormatLogFilename
related:
  - subsys.persistence.jsonl
  - subsys.persistence.session-persistence
  - subsys.core.session
  - spine.session-log
evidence: explicit
status: verified
updated: 477b4f4205
---

> Session 盘的**逻辑 generation** 是 `SESSION_FORMAT_VERSION = 4`。adjacent 链 `v0→v1→v2→v3→v4` 由 `@deepseek-ai/dsh-session-format` 规划、`@deepseek-ai/dsh-session-format-catalog` 安装、JSONL Provider 在 load 时执行。比 4 新的盘拒绝。v3→v4 的 `liftToolResult` 把 `tool/result` 里 user 消息的单一 `tool-result` wrapper 抬成 first-class `role: 'tool'`。v4 仍拒绝 `request/header.system`。`createSessionFormatV3ToV4(children)` 需要显式 child evidence（空数组 = 无子会话）。没有「version 0 且无 migration」这条路径。

## 能回答的问题

- `SESSION_FORMAT_VERSION` 现在是几？谁拥有这个常量？
- adjacent 是什么意思？`to !== from + 1` 会怎样？
- catalog 里有几条 codec、几条 migration？JSONL 何时调用它？为什么 v3→v4 还要 `createSessionFormatCatalogWithChildren`？
- 盘上文件名 `session.jsonl` 与 `session.v4.jsonl` 怎么对应 generation？
- v3→v4 怎样 `liftToolResult`？v4 会不会再接受 `header.system`？
- 比当前版本更新的日志会不会被静默读成 v4？

## 职责边界

本页拥有：**逻辑 format 版本**、**adjacent 规划器**、**installed catalog**、**v2→v3 语义**（system prompt 出 header、preset `code`→`ptc`）、**v3→v4 语义**（`liftToolResult`、child evidence、retired `header.system`），以及 **JSONL load 接缝**（catalog `createRestore` / `readHeader`）。

本页**不**拥有：`SessionHandle` / lease / 物理 JSONL 编码（[subsys.persistence.jsonl](jsonl.md)）；`Session.append` / `deriveMessages`（[subsys.core.session](../core/session.md)）；已删除的 SQLite session persistence（[subsys.persistence.sqlite](sqlite.md)）。不要为 `session-format-v3-to-v4` 另建节点。

这是 **host 面**纯库 + JSONL 消费，不是 Cordis 插件行。agent-preset 不另造一份 format。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/core/session/src/types.ts` | `SESSION_FORMAT_VERSION = 4`；`EpochHeader.system?: never`；`system/message` 是 surface |
| `packages/session/session-format/src/chain.ts` | `defineSessionFormatMigration`、`createSessionFormatChain` |
| `packages/session/session-format/src/catalog.ts` | `createSessionFormatCatalog`：codec + chain |
| `packages/session/session-format/src/filename.ts` | `sessionFormatLogFilename`：v0=`session.jsonl`，vN=`session.vN.jsonl` |
| `packages/session/session-format-catalog/src/generated.ts` | `sessionFormatCatalog`：`currentVersion: 4` |
| `packages/session/session-format-catalog/src/children.ts` | `createSessionFormatCatalogWithChildren`：把 child facts 绑进 v3→v4 |
| `packages/session/session-format-v0-to-v1/src/migration.ts` | `sessionFormatV0ToV1`（`fromVersion: 0`） |
| `packages/session/session-format-v1-to-v2/src/migration.ts` | `sessionFormatV1ToV2`（`fromVersion: 1`） |
| `packages/session/session-format-v2-to-v3/src/migration.ts` | `sessionFormatV2ToV3`（`fromVersion: 2`） |
| `packages/session/session-format-v3-to-v4/src/migration.ts` | `sessionFormatV3ToV4` / `createSessionFormatV3ToV4` |
| `packages/session/session-format-v3-to-v4/src/tool-role.ts` | `liftToolResult` / `assertV4ToolResultMessage` |
| `packages/session/session-format-v3-to-v4/src/retired-syntax.ts` | v4 拒绝 `header.system` 与 retired `tool/code-dispatch*` |
| `packages/session/session-persistence-jsonl/src/index.ts` | 构造时核对 catalog；历史 generation 走 child-bound `createRestore` |

## 数据模型

| 符号 | 要点 |
|---|---|
| `SESSION_FORMAT_VERSION` | **4**。当前逻辑 header / 当前 generation 都钉这个数。加普通事件 type **不** bump（`ignorable`）。 [E: packages/core/session/src/types.ts:89] |
| `EpochHeader` | `config` + 可选 `adapterDefaults` / `tools`。`system?: never`；system prompt 是 surface 上的 `system/message`。 [E: packages/core/session/src/types.ts:240] [E: packages/core/session/src/types.ts:250] |
| `defineSessionFormatMigration` | `to === from + 1`，否则抛 `SessionFormatError`。 [E: packages/session/session-format/src/chain.ts:30] |
| `createSessionFormatChain` | 从 0 一直到 `currentVersion-1` 每档必须有一条 adjacent migration。 [E: packages/session/session-format/src/chain.ts:41] [E: packages/session/session-format/src/chain.ts:65] |
| `plan(from)` | `from > currentVersion` → `SessionFormatUnsupportedMigrationError`（newer-than-current 拒读）。 [E: packages/session/session-format/src/chain.ts:81] [E: packages/session/session-format/src/chain.ts:82] |
| `sessionFormatCatalog` | `currentVersion: 4`；codecs v0/v1/v2/v3/v4；migrations `[sessionFormatV0ToV1, sessionFormatV1ToV2, sessionFormatV2ToV3, sessionFormatV3ToV4]`。 [E: packages/session/session-format-catalog/src/generated.ts:17] [E: packages/session/session-format-catalog/src/generated.ts:23] [E: packages/session/session-format-catalog/src/generated.ts:30] |
| `sessionFormatV0ToV1` | `fromVersion: 0`，`toVersion: 1`。 [E: packages/session/session-format-v0-to-v1/src/migration.ts:29] |
| `sessionFormatV1ToV2` | `fromVersion: 1`，`toVersion: 2`；把 v1 top-level Assistant chunk 嵌进 v2 attempt。 [E: packages/session/session-format-v1-to-v2/src/migration.ts:45] |
| `sessionFormatV2ToV3` | `fromVersion: 2`，`toVersion: 3`。header 上 `agentPreset === 'code'` 写成 `'ptc'`；事件流插入 synthetic `system/message`，并从 `request/header` 剥掉 `system`。 [E: packages/session/session-format-v2-to-v3/src/migration.ts:12] [E: packages/session/session-format-v2-to-v3/src/migration.ts:18] |
| `sessionFormatV3ToV4` | `fromVersion: 3`，`toVersion: 4`。静态声明的 `createStage()` **抛**：必须改走 `createSessionFormatV3ToV4(children)`。 [E: packages/session/session-format-v3-to-v4/src/migration.ts:15] [E: packages/session/session-format-v3-to-v4/src/migration.ts:24] |
| `createSessionFormatV3ToV4` | 绑定一份不变的 child evidence；空数组声明「这个父会话没有孩子」。 [E: packages/session/session-format-v3-to-v4/src/migration.ts:34] |
| `liftToolResult` | 仅处理 `tool/result` 且 `message.role === 'user'` 的 v3 wrapper：恰好一块 `type: 'tool-result'`、`toolCallId` 与 `source.callId` 一致，抬成 `role: 'tool'` + 顶层 `toolCallId` + wrapper 的 `content`。已经是 `role: 'tool'` 的行原样返回。 [E: packages/session/session-format-v3-to-v4/src/tool-role.ts:36] [E: packages/session/session-format-v3-to-v4/src/tool-role.ts:40] [E: packages/session/session-format-v3-to-v4/src/tool-role.ts:61] |
| `sessionFormatLogFilename` | generation 0 → `session.jsonl`；否则 `session.v${generation}.jsonl`。当前 writer 写 `session.v4.jsonl`。 [E: packages/session/session-format/src/filename.ts:16] |

## 控制流

1. **常量与 catalog 必须同版本。** JSONL 构造时 `sessionFormatCatalog.currentVersion !== SESSION_FORMAT_VERSION` 直接 throw。 [E: packages/session/session-persistence-jsonl/src/index.ts:273]
2. **load 走 catalog，不手写 if-version。** JSONL 把 catalog 包成 `generationFormat`：`encodeCurrentHeader` / `encodeCurrentEvent`。历史 generation 调 `prepareJsonlMigration`，`createRestore` 用 `createSessionFormatCatalogWithChildren(related.facts)`，再 `publish()` 成当前文件。 [E: packages/session/session-persistence-jsonl/src/index.ts:282] [E: packages/session/session-persistence-jsonl/src/index.ts:648] [E: packages/session/session-persistence-jsonl/src/index.ts:655]
3. **已经是 v4** 的 artifact 走 `CurrentSessionFormatRestore`（`restoreCurrent`），不再跑 migrator。 [E: packages/session/session-format/src/catalog.ts:131]
4. **v0 盘** `plan(0)` 切出四条 adjacent：v0→v1 → v1→v2 → v2→v3 → v3→v4。缺档在 chain 构造期就失败。 [E: packages/session/session-format/src/chain.ts:65] [E: packages/session/session-format/src/chain.ts:68]
5. **比 4 新** 的 stored version：`plan` 抛 unsupported；catalog `readHeader` 也标 `status: 'unsupported'`。 [E: packages/session/session-format/src/chain.ts:81] [E: packages/session/session-format/src/catalog.ts:52]
6. **v3→v4 需要 child evidence。** 静态 `sessionFormatV3ToV4.createStage` 抛 `V3 catalog migration requires explicit historical child facts, including an empty array for a parent without children`。`createSessionFormatCatalogWithChildren` 用 `createSessionFormatV3ToV4(children)` 替换 catalog 里那条 edge。 [E: packages/session/session-format-v3-to-v4/src/migration.ts:24] [E: packages/session/session-format-catalog/src/children.ts:13] [E: packages/session/session-format-catalog/src/children.ts:17]
7. **`liftToolResult` 在每条已知 v3 事件上跑。** `ReleasedV3ToV4Stage.transformEvent` 在 remap / source rewrite 之后 `emitEvent(migrateV3EventContent(liftToolResult(rewritten)))`。嵌套 `tool-result` 块抛 `SessionFormatUnsupportedMigrationError`。 [E: packages/session/session-format-v3-to-v4/src/migration.ts:110] [E: packages/session/session-format-v3-to-v4/src/tool-role.ts:20]
8. **v4 仍拒绝 `header.system`。** `assertV4RetiredSyntax` 在 `request/header` 上 `Object.hasOwn(data['header'], 'system')` 则抛 `format v4 request/header rejects retired header.system`。live Session 的 `surface.ts` 同样拒。 [E: packages/session/session-format-v3-to-v4/src/retired-syntax.ts:34] [E: packages/core/session/src/surface.ts:210]
9. **v2→v3 仍在链上。** 遇到 `request/header` 时拆出 `system` 字符串；prompt 相对上次变化则插入 `system/message`。输出 header **不再带 `system`**。header / `agent-preset/selected` 的 `code` → `ptc`。 [E: packages/session/session-format-v2-to-v3/src/migration.ts:18]

## 设计动机

- **adjacent only**：禁止跳版本，避免「一份 migrator 吃所有历史」。
- **catalog 独立于插件**：generated 直接 import 四条 frozen migrator，JSONL 不依赖运行时挂载 format 插件。
- **newer-than-current 拒**：新 runtime 写的盘不能被旧 runtime 静默降级。
- **system 出 header**：v3 把渲染后的 system prompt 当成 surface 第 0 号节点；v4 继续拒绝把 `system` 塞回 `request/header`。
- **tool 角色 first-class**：v3 把工具结果包在 user 消息的 `tool-result` block 里；v4 让模型历史与 LLM wire 的 `role: 'tool'` 对齐，migrator 校验 wrapper 再丢掉它，避免静默截断。
- **child evidence 显式**：v3→v4 会改写子会话目录事实。空数组与「忘了收集孩子」必须区分，所以 `createStage` 不能默默当无孩子。

## Gotcha

- **v0 仍存在于链上，但当前写入是 v4。** 不要把「支持读 v0」写成「产品现在写 version 0」，也不要写「链止于 v3」。
- **JSONL 文件名 generation 与 header.version 对齐**，压缩后缀 `.zstd` 不是 format 版本。当前 writer 写 `session.v4.jsonl[.zstd]`。物理细节在 [subsys.persistence.jsonl](jsonl.md)。
- **静态 `sessionFormatCatalog` 不够读历史正文。** header / 当前 generation 可以走它；v3 正文 restore 必须 `createSessionFormatCatalogWithChildren`。孤立回放显式传 `[]`。
- **没有 shipped SQLite session persistence** 去跑同一条 catalog。query/storage sqlite 是别的包。
- **加事件 type 不 bump 版本。** 漏标 `ignorable` 的新 type 会让旧 runtime 拒读；那是词汇门，不是 format bump。
- **v4 native `tool/result` 不得再含 `tool-result` wrapper。** `assertV4ToolResultMessage` 要求 `role === 'tool'`。 [E: packages/session/session-format-v3-to-v4/src/tool-role.ts:95]

## Seam 三角

| 角色 | 落点 |
|---|---|
| **Definition** | `dsh-session` 的 `SESSION_FORMAT_VERSION` + `dsh-session-format` 的 chain/catalog API |
| **Provider（installed codecs）** | `dsh-session-format-catalog` + `v0-to-v1` / `v1-to-v2` / `v2-to-v3` / `v3-to-v4` |
| **Consumer** | `dsh-session-persistence-jsonl` load / generation 发表；历史 restore 经 `createSessionFormatCatalogWithChildren` |

## Sources

- packages/core/session/src/types.ts
- packages/core/session/src/surface.ts
- packages/session/session-format/src/index.ts
- packages/session/session-format/src/chain.ts
- packages/session/session-format/src/catalog.ts
- packages/session/session-format/src/filename.ts
- packages/session/session-format/package.json
- packages/session/session-format-catalog/src/index.ts
- packages/session/session-format-catalog/src/generated.ts
- packages/session/session-format-catalog/src/children.ts
- packages/session/session-format-catalog/package.json
- packages/session/session-format-v0-to-v1/src/migration.ts
- packages/session/session-format-v0-to-v1/package.json
- packages/session/session-format-v1-to-v2/src/migration.ts
- packages/session/session-format-v1-to-v2/package.json
- packages/session/session-format-v2-to-v3/src/migration.ts
- packages/session/session-format-v2-to-v3/package.json
- packages/session/session-format-v3-to-v4/src/migration.ts
- packages/session/session-format-v3-to-v4/src/tool-role.ts
- packages/session/session-format-v3-to-v4/src/retired-syntax.ts
- packages/session/session-format-v3-to-v4/package.json
- packages/session/session-persistence-jsonl/src/index.ts

## 相关

- [subsys.persistence.jsonl](jsonl.md) — JSONL 盘、lease、generation 文件。
- [subsys.persistence.session-persistence](session-persistence.md) — `SessionHandle` 缝。
- [subsys.core.session](../core/session.md) — 内存 `Session` / `SurfaceOp` / live `role: 'tool'`。
- [spine.session-log](../../spine/session-log.md) — 日志脊柱。
