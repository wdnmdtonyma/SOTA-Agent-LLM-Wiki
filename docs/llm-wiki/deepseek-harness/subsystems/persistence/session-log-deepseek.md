---
id: subsys.persistence.session-log-deepseek
title: DeepSeek session-log 方言
kind: subsystem
tier: T2
pkg: persistence
source:
  - packages/session/session-log-deepseek/src/index.ts
  - packages/session/session-log-deepseek/src/types.ts
  - packages/session/session-log-deepseek/src/invariant.ts
  - packages/session/session-log-deepseek/package.json
  - packages/session/session-log-deepseek/tests/upload.spec.ts
  - packages/session/session-log-deepseek/tests/invariant.spec.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/base/package.json
  - packages/bundle/sdk-minimal/cordis.patch.yml
  - packages/bundle/sdk-minimal/package.json
  - packages/llm/deepseek-llm-api-extensions/src/index.ts
  - packages/llm/llm-deepseek/src/index.ts
  - packages/llm/llm-deepseek/src/adapter.ts
  - packages/llm/llm-deepseek/tests/loader-composition.spec.ts
symbols:
  - apply
  - acceptedThrough
  - DeepSeekSessionLogExtension
  - Config
  - name
  - inject
related:
  - spine.session-log
  - subsys.core.session
  - subsys.llm.deepseek
  - ref.session-events
  - ref.capability-seams
  - ref.ctx-keys
  - spine.capability-seams
  - subsys.composition.bundle-base
  - subsys.persistence.session-persistence
  - subsys.persistence.projection
evidence: explicit
status: verified
updated: c291e7961a
---

> `@deepseek-ai/dsh-session-log-deepseek` 在 **host 面**把**同一本** canonical session log 投影成官方 DeepSeek 请求顶层字段 `dsh_session_log`。它**不是**第二份日志、也不是 `ctx.sessionProjections` 的 unit。水位线事件 `session-log-deepseek/delivery-accepted` 写回同一本 log，重启后从事件重折 `acceptedThrough`，不另开 store。默认 `enabled: false`：bundle 挂插件，不等于开上传。

## 能回答的问题

- `dsh-session-log-deepseek` 和 `packages/core/session` 的 JSONL / `deriveMessages` 是什么关系？有没有第二份 log？
- `dsh_session_log` 何时出现在 HTTP body？`enabled` 默认是什么？谁在 HTTP 2xx 后 `accept()`？
- `afterSeq` / `throughSeq` / `events` 怎么切 suffix？fork 的 inherited watermark 算不算本会话水位？
- `session-log-deepseek/delivery-accepted` 的 invariant 拦什么？malformed 水位会不会 fail-closed？
- `dsh-base` 与 `sdk-minimal` 各挂哪一行？`ctx.deepseekLlmApiExtensions` 是谁提供的？

## 职责边界

本包拥有：

- Cordis plugin 名 `session-log-deepseek`，`inject = ['deepseekLlmApiExtensions', 'sessions']`。 [E: packages/session/session-log-deepseek/src/index.ts:18] [E: packages/session/session-log-deepseek/src/index.ts:20]
- 配置键 `enabled`（boolean，默认 `false`）。`apply` 仅在 `config.enabled === true` 时 `register('dsh_session_log', …)`。 [E: packages/session/session-log-deepseek/src/index.ts:30] [E: packages/session/session-log-deepseek/src/index.ts:72] [E: packages/session/session-log-deepseek/src/index.ts:72]
- 导出 `acceptedThrough(session)`：扫描本会话 identity 的 acceptance 事件，返回最大 `throughSeq`，从未 accept 为 `-1`。 [E: packages/session/session-log-deepseek/src/index.ts:45] [E: packages/session/session-log-deepseek/src/index.ts:48]
- 线型 `DeepSeekSessionLogExtension` 与 `SessionEventMap['session-log-deepseek/delivery-accepted']`、`DeepSeekLlmApiExtensionMap.dsh_session_log` 的 declaration merge。 [E: packages/session/session-log-deepseek/src/types.ts:7] [E: packages/session/session-log-deepseek/src/types.ts:21] [E: packages/session/session-log-deepseek/src/types.ts:23]
- companion `session-log-deepseek-invariant`（`inject = ['invariants']`），包名 `@deepseek-ai/dsh-session-log-deepseek`。 [E: packages/session/session-log-deepseek/src/invariant.ts:9] [E: packages/session/session-log-deepseek/src/invariant.ts:12] [E: packages/session/session-log-deepseek/src/invariant.ts:14]

本包**不**拥有：

- append-only log、`SessionEventMap` 总表、`deriveMessages()` / `surfaceOp`（[subsys.core.session](../core/session.md)、[spine.session-log](../../spine/session-log.md)、[ref.session-events](../../reference/session-events.md)）。
- `ctx.deepseekLlmApiExtensions` 注册表本身（`DeepSeekLlmApiExtensionRegistry`，权威在 [ref.capability-seams](../../reference/capability-seams.md) / [ref.ctx-keys](../../reference/ctx-keys.md)）。
- `deepseek-official` HTTP 与 SSE（[subsys.llm.deepseek](../llm/deepseek.md)）。本页只点 adapter 在 2xx 后调 `extensions.accept()`。
- host projection registry / cache（[subsys.persistence.projection](projection.md)）。
- JSONL / SQLite 写窗（[subsys.persistence.session-persistence](session-persistence.md)）。

`dsh-base` 与不叠 base 的 `sdk-minimal` 都 insert `id: session-log-deepseek`，**没有**写出 `config.enabled`，因此走默认 `false`。真实 Loader 组合测：默认请求体**没有** `dsh_session_log`；显式 enable 才上传 suffix。 [E: packages/bundle/base/cordis.patch.yml:36] [E: packages/bundle/base/cordis.patch.yml:37] [E: packages/bundle/sdk-minimal/cordis.patch.yml:20] [E: packages/bundle/sdk-minimal/cordis.patch.yml:21] [E: packages/llm/llm-deepseek/tests/loader-composition.spec.ts:153] [E: packages/llm/llm-deepseek/tests/loader-composition.spec.ts:184]

五个 shipped profile 仍是 `web` / `headless` / `sdk` / `sdk-minimal` / `acp`。叠 base 的 profile 继承这一行；`sdk-minimal` 自己 insert。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/session/session-log-deepseek/src/index.ts` | `Config`、`acceptedThrough`、`apply` 登记 `dsh_session_log` |
| `packages/session/session-log-deepseek/src/types.ts` | `DeepSeekSessionLogExtension` 与两处 module merge |
| `packages/session/session-log-deepseek/src/invariant.ts` | 水位线 fail-closed；允许 fork seed 里 inherited parent id |
| `packages/session/session-log-deepseek/tests/upload.spec.ts` | 默认关、增量 suffix、fork 忽略 parent watermark、乱序 accept 取 max、malformed throw、HMR 撤字段 |
| `packages/session/session-log-deepseek/tests/invariant.spec.ts` | live / late-load / inherited fork |
| `packages/bundle/base/cordis.patch.yml` | host 面 insert `session-log-deepseek`（紧挨 `session` 与 `deepseek-llm-api-extensions`） |
| `packages/bundle/sdk-minimal/cordis.patch.yml` | 不叠 base 的完整 insert |
| `packages/llm/deepseek-llm-api-extensions/src/index.ts` | `register` / `prepare` / 联合 `accept` |
| `packages/llm/llm-deepseek/src/adapter.ts` | 请求前 `prepareExtensions`；`response.ok` 后 `extensions.accept()` |

## 数据模型

| 符号 | 要点 |
|---|---|
| `DeepSeekSessionLogExtension` | `{ version: 1, session: SessionHeader, afterSeq, throughSeq, events }`。`events` 是 `afterSeq + 1` … `throughSeq` 的**完整** `SessionEvent` 信封，不是 `deriveMessages` 面。 [E: packages/session/session-log-deepseek/src/types.ts:7] [E: packages/session/session-log-deepseek/src/types.ts:14] |
| `session-log-deepseek/delivery-accepted` | `{ sessionId, throughSeq }`。`throughSeq` 必须是**更早**的 canonical seq。fork seed 里可带父会话 `sessionId`。 [E: packages/session/session-log-deepseek/src/types.ts:23] [E: packages/session/session-log-deepseek/src/types.ts:30] |
| `AcceptanceFold` | 进程内 `WeakMap<Session, { scannedEvents, throughSeq }>`，只加速扫描，**不是**权威。权威是 log 里的 acceptance 事件。 [E: packages/session/session-log-deepseek/src/index.ts:33] [E: packages/session/session-log-deepseek/src/index.ts:38] |
| `Config.enabled` | 默认 `false`。未 `=== true` 时 `apply` 直接 return，registry 里没有 `dsh_session_log`。 [E: packages/session/session-log-deepseek/src/index.ts:30] [E: packages/session/session-log-deepseek/src/index.ts:72] |

suffix 构造：`afterSeq = acceptedThrough(session)`，`throughSeq = snapshot.length - 1`，空 log（`throughSeq < 0`）不贡献字段；`sessionId` 缺失或 `sessions.get`  miss 也不贡献。 [E: packages/session/session-log-deepseek/src/index.ts:75] [E: packages/session/session-log-deepseek/src/index.ts:79] [E: packages/session/session-log-deepseek/src/index.ts:82] [E: packages/session/session-log-deepseek/src/index.ts:83]

`accept` 回调：`session.append('session-log-deepseek/delivery-accepted', { sessionId: session.id, throughSeq })`。HTTP 失败路径不调 `accept`，水位不前进，下次会重发不确定尾巴。源码 TODO：2xx 后 crash 窗口内重复 replay 若不可接受，再加 lightweight checkpoint。 [E: packages/session/session-log-deepseek/src/index.ts:95] [E: packages/session/session-log-deepseek/src/index.ts:95]

## 控制流

1. `dsh-base`（或 `sdk-minimal`）insert `deepseek-llm-api-extensions` 再 insert `session-log-deepseek`。 [E: packages/bundle/base/cordis.patch.yml:30] [E: packages/bundle/base/cordis.patch.yml:36]
2. `apply`：`enabled !== true` → 结束。否则 `ctx.deepseekLlmApiExtensions.register('dsh_session_log', { prepare })`。登记是 `ctx.effect`，卸插件即删字段。 [E: packages/session/session-log-deepseek/src/index.ts:72] [E: packages/llm/deepseek-llm-api-extensions/src/index.ts:89]
3. `DeepSeekAdapter` 组完 chat body 后 `prepareExtensions({ body, signal, sessionId? })`。 [E: packages/llm/llm-deepseek/src/adapter.ts:621] [E: packages/llm/llm-deepseek/src/index.ts:465]
4. `prepare` 读 canonical `session.events`，切 suffix；registry 用 `freezeJson(structuredClone(result.value))` 写入 `fields.dsh_session_log`。不读 request messages。 [E: packages/session/session-log-deepseek/src/index.ts:83] [E: packages/llm/deepseek-llm-api-extensions/src/index.ts:119] [E: packages/session/session-log-deepseek/tests/upload.spec.ts:154]
5. `JSON.stringify({ ...body, ...extensions.fields })` POST `/chat/completions`。字段与 base body 撞名 → `REQUEST_EXTENSION`。 [E: packages/llm/llm-deepseek/src/adapter.ts:638] [E: packages/llm/llm-deepseek/src/adapter.ts:632]
6. `!response.ok` → throw，**不** `accept`。`response.ok` 后 `await extensions.accept()`，才 append 水位线。 [E: packages/llm/llm-deepseek/src/adapter.ts:658] [E: packages/llm/llm-deepseek/src/adapter.ts:695]
7. `acceptedThrough`：跳过 `sessionId !== session.id` 的事件（fork seed 里的父水位因此为 `-1`）；畸形 `throughSeq`（非安全整数、`< 0`、或 `>= event.seq`）throw。并发乱序 accept 取 `Math.max`。 [E: packages/session/session-log-deepseek/src/index.ts:58] [E: packages/session/session-log-deepseek/src/index.ts:56] [E: packages/session/session-log-deepseek/src/index.ts:59] [E: packages/session/session-log-deepseek/tests/upload.spec.ts:89] [E: packages/session/session-log-deepseek/tests/upload.spec.ts:103]

## 设计动机

官方 API 要无损增量会话。把 watermark **写进同一本 append-only log**，persist/reload 后 `acceptedThrough` 能重建 cursor，不必第二份 store。suffix 含 acceptance 事件本身，对端能看见水位前进。默认关：bundle 依赖与 insert 只保证 seam 在位，产品上传是显式 `enabled: true`。

## Gotcha

- **不是第二份日志。** 投影读 `session.events`，accept 也 `session.append`。compaction / surface 仍只在 [spine.session-log](../../spine/session-log.md)。
- **默认不上传。** `dsh-base` 挂插件但无 `config`；Loader 组合断言默认 body 无 `dsh_session_log`。 [E: packages/llm/llm-deepseek/tests/loader-composition.spec.ts:153]
- **fork：** `acceptedThrough` 忽略父 `sessionId`；invariant 允许 `parentSession` + `seedLength` 且 `event.seq < seedLength` 的 inherited 事件。 [E: packages/session/session-log-deepseek/src/invariant.ts:18] [E: packages/session/session-log-deepseek/src/invariant.ts:21]
- **direct / stale：** 无 `sessionId`、session 不在 store、空 log → 省略字段。 [E: packages/session/session-log-deepseek/tests/upload.spec.ts:140]
- **malformed persist：** `throughSeq >= seq` 等在 `acceptedThrough` throw，fail-closed，不静默从 0 重传。 [E: packages/session/session-log-deepseek/tests/upload.spec.ts:169]
- **HMR：** dispose contributing plugin 后字段消失。 [E: packages/session/session-log-deepseek/tests/upload.spec.ts:178]
- **2xx 后、checkpoint 前 crash：** accept 已 append，但 TODO 指出尚未强制 lightweight checkpoint；重复 replay 窗口存在。 [E: packages/session/session-log-deepseek/src/index.ts:95]
- **invariant companion 不是 bundle 行。** 由 `dsh-invariants` 按包 companion 装；测试里要显式 `plugin(InvariantRegistry, { enabled: true })`。 [E: packages/session/session-log-deepseek/tests/invariant.spec.ts:17]

## Seam 三角

| 角色 | 谁 | 卸掉会怎样 |
|---|---|---|
| **Definition** | `DeepSeekLlmApiExtensionMap.dsh_session_log` + `SessionEventMap['session-log-deepseek/delivery-accepted']`（本包 `types.ts`） | 编译期字段与事件类型消失 |
| **Provider** | 本包 `apply` → `ctx.deepseekLlmApiExtensions.register('dsh_session_log')`；registry 服务由 `@deepseek-ai/dsh-deepseek-llm-api-extensions` 提供 | 请求不再带 `dsh_session_log`；log 仍完整 |
| **Consumer** | `DeepSeekAdapter.prepareExtensions` / `extensions.accept()`（`llm-deepseek`）；可选 invariant companion | 不消费则字段永不进 HTTP；水位永不前进 |

Hub 键是 `ctx.deepseekLlmApiExtensions`（[ref.ctx-keys](../../reference/ctx-keys.md)）。同 registry 上另有 `dsh_plugin_packages`（`plugin-package-inventory-deepseek`），与本字段独立、默认可开。

## Sources

- `packages/session/session-log-deepseek/src/index.ts`
- `packages/session/session-log-deepseek/src/types.ts`
- `packages/session/session-log-deepseek/src/invariant.ts`
- `packages/session/session-log-deepseek/package.json`
- `packages/session/session-log-deepseek/tests/upload.spec.ts`
- `packages/session/session-log-deepseek/tests/invariant.spec.ts`
- `packages/bundle/base/cordis.patch.yml`
- `packages/bundle/base/package.json`
- `packages/bundle/sdk-minimal/cordis.patch.yml`
- `packages/bundle/sdk-minimal/package.json`
- `packages/llm/deepseek-llm-api-extensions/src/index.ts`
- `packages/llm/llm-deepseek/src/index.ts`
- `packages/llm/llm-deepseek/src/adapter.ts`
- `packages/llm/llm-deepseek/tests/loader-composition.spec.ts`

## 相关

- [spine.session-log](../../spine/session-log.md) — append / `deriveMessages` / checkpoint；本页不重写那条脊柱。
- [subsys.core.session](../core/session.md) — canonical `Session` / `SessionEvent`。
- [subsys.llm.deepseek](../llm/deepseek.md) — `deepseek-official` 何时 `prepare`/`accept`。
- [ref.session-events](../../reference/session-events.md) — `session-log-deepseek/delivery-accepted` 词条。
- [ref.capability-seams](../../reference/capability-seams.md) / [spine.capability-seams](../../spine/capability-seams.md) — `ctx.deepseekLlmApiExtensions`。
- [ref.ctx-keys](../../reference/ctx-keys.md) — hub 键。
- [subsys.composition.bundle-base](../composition/bundle-base.md) — `dsh-base` insert。
- [subsys.persistence.session-persistence](session-persistence.md) — 盘上同一本 log。
- [subsys.persistence.projection](projection.md) — host fold，不是本方言字段。
