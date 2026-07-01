---
id: session-v2.system-context-algebra
title: System Context 代数
kind: subsystem
tier: T2
v: v2
source:
  - packages/core/src/system-context/index.ts
  - CONTEXT.md
  - packages/core/src/session/context-epoch.ts
  - packages/core/src/session/runner/llm.ts
  - packages/core/src/system-context/registry.ts
  - packages/core/src/instruction-context.ts
  - specs/v2/session.md
symbols:
  - SystemContext.Source
  - SystemContext.make
  - SystemContext.combine
  - SystemContext.initialize
  - SystemContext.reconcile
  - SystemContext.replace
  - SystemContext.Snapshot
related:
  - spine.v2-context-epoch
  - session-v2.system-context-registry
evidence: explicit
status: verified
updated: 8b68dc0d7
---

> System Context 代数把 privileged runtime context 建模成可独立观测、可比较、可渲染的 typed `Source<A>` 集合; runner 在 safe provider-turn boundary 用 `initialize/reconcile/replace` 把它准入为 baseline 或 chronological system message。

## 能回答的问题

- `Source<A>`、`Snapshot`、`Generation`、`ReconcileResult` 分别保存什么?
- `unavailable` 与 source removal 为什么是不同状态?
- `initialize`、`reconcile`、`replace` 各在什么场景返回什么?
- duplicate source key 在哪里被拒绝?
- System Context 与 Session History、Context Epoch 的边界是什么?

## 职责边界

`SystemContext` 只负责组合 source、观察 source、比较 snapshot、渲染 baseline/update/removal text;它不直接描述 DB 持久化、agent/model 选择或 event publish 接口。[E: packages/core/src/system-context/index.ts:198][I] 持久化与 `ContextUpdated` publish 在 `SessionContextEpoch.prepare` 中完成,runner 在 `runTurnAttempt` 内 load/compose context 后交给 Context Epoch initialize/prepare。[E: packages/core/src/session/context-epoch.ts:72][E: packages/core/src/session/runner/llm.ts:163][E: packages/core/src/session/runner/llm.ts:178][E: packages/core/src/session/runner/llm.ts:193]

`CONTEXT.md` 的术语边界是: System Context 是模型初始 instructions 和 chronological updates 的 structured facts; Session History 是应用 compaction 与 Context Epoch cutoff 后为 provider turn 选择的 projected conversation; Context Snapshot 是 model-hidden JSON comparison state。[E: CONTEXT.md:8][E: CONTEXT.md:12][E: CONTEXT.md:34]

## 数据模型

| 符号/字段 | 含义 | 证据 |
| --- | --- | --- |
| `SystemContext.Key` | namespaced stable key,格式要求包含 `/` 分隔的 namespace/resource。 | [E: packages/core/src/system-context/index.ts:22] |
| `Source<A>.codec` | source value 与 JSON snapshot 之间的 codec。 | [E: packages/core/src/system-context/index.ts:34] |
| `Source<A>.load` | 观测当前值,可返回 `A` 或 `Unavailable`。 | [E: packages/core/src/system-context/index.ts:35] |
| `Source<A>.baseline` | first generation baseline rendering。 | [E: packages/core/src/system-context/index.ts:36] |
| `Source<A>.update` | previous/current value 变化时的 chronological update rendering。 | [E: packages/core/src/system-context/index.ts:37] |
| `Source<A>.removed` | source 被移除时的 optional removal text。 | [E: packages/core/src/system-context/index.ts:38] |
| `SourceSnapshot.value` | codec-encoded JSON value。 | [E: packages/core/src/system-context/index.ts:50][E: CONTEXT.md:96] |
| `SourceSnapshot.removed` | model-visible removal text cached with snapshot。 | [E: packages/core/src/system-context/index.ts:51][E: CONTEXT.md:96] |
| `Snapshot` | record from source key to source snapshot。 | [E: packages/core/src/system-context/index.ts:56] |
| `Generation` | `{ baseline, snapshot }`,用于一个完整 baseline epoch。 | [E: packages/core/src/system-context/index.ts:60][E: packages/core/src/system-context/index.ts:61] |
| `Updated` | `{ text, snapshot }`,用于 chronological update plus snapshot advance。 | [E: packages/core/src/system-context/index.ts:66][E: packages/core/src/system-context/index.ts:67] |
| `ReplacementResult` | `ReplacementReady(generation)` 或 `ReplacementBlocked`。 | [E: packages/core/src/system-context/index.ts:72][E: packages/core/src/system-context/index.ts:76][E: packages/core/src/system-context/index.ts:79] |

## 控制流

1. `SystemContext.make(source)` hides the concrete source value type by packing `load` into an opaque carrier and stores encode/decode/equivalence derived from `source.codec`。[E: packages/core/src/system-context/index.ts:135][E: packages/core/src/system-context/index.ts:136][E: packages/core/src/system-context/index.ts:137][E: packages/core/src/system-context/index.ts:138][E: packages/core/src/system-context/index.ts:142]
2. During `make`, an available value can render a baseline with `source.baseline(value)` and snapshot `{ value: encode(value), removed? }`; empty rendered text throws through `requireText`。[E: packages/core/src/system-context/index.ts:145][E: packages/core/src/system-context/index.ts:151][E: packages/core/src/system-context/index.ts:147][E: packages/core/src/system-context/index.ts:309]
3. During comparison, decode failure returns `Incompatible`; equivalent decoded/current values return `Unchanged`; changed values return `Updated` with update rendering and new snapshot。[E: packages/core/src/system-context/index.ts:154][E: packages/core/src/system-context/index.ts:155][E: packages/core/src/system-context/index.ts:156][E: packages/core/src/system-context/index.ts:158][E: packages/core/src/system-context/index.ts:159][E: packages/core/src/system-context/index.ts:161]
4. `SystemContext.combine(values)` concatenates packed source arrays, calls `assertUniqueKeys`, then returns a new opaque context preserving caller order。[E: packages/core/src/system-context/index.ts:176][E: packages/core/src/system-context/index.ts:177][E: packages/core/src/system-context/index.ts:178][E: packages/core/src/system-context/index.ts:179]
5. `observe(value)` loads all packed sources with unbounded concurrency and normalizes each loaded result to `Available` or `Unavailable` entry。[E: packages/core/src/system-context/index.ts:182][E: packages/core/src/system-context/index.ts:186][E: packages/core/src/system-context/index.ts:188][E: packages/core/src/system-context/index.ts:190][E: packages/core/src/system-context/index.ts:194]
6. `initialize(value)` observes once; if any entry is unavailable it fails with `InitializationBlocked({ keys })`, otherwise it renders every available source baseline and builds a fresh `Generation`。[E: packages/core/src/system-context/index.ts:198][E: packages/core/src/system-context/index.ts:200][E: packages/core/src/system-context/index.ts:201][E: packages/core/src/system-context/index.ts:202][E: packages/core/src/system-context/index.ts:203][E: packages/core/src/system-context/index.ts:208]
7. `reconcile(value, previous)` observes once and calls `reconcileObservation`; if reconcile produces `Replace`, it falls through to `replaceObservation` with the same observation。[E: packages/core/src/system-context/index.ts:218][E: packages/core/src/system-context/index.ts:221][E: packages/core/src/system-context/index.ts:223]
8. `reconcileObservation` skips unavailable current entries but keeps their stored snapshot, treats newly appearing sources as update text via baseline rendering, and renders changed sources through their update renderer。[E: packages/core/src/system-context/index.ts:251][E: packages/core/src/system-context/index.ts:252][E: packages/core/src/system-context/index.ts:255][E: packages/core/src/system-context/index.ts:256][E: packages/core/src/system-context/index.ts:258][E: packages/core/src/system-context/index.ts:268][E: packages/core/src/system-context/index.ts:270][E: packages/core/src/system-context/index.ts:163]
9. If a previous key is absent from current entries and no cached `removed` text exists, reconcile returns `Replace`; if removal text exists, it appends that text to updates。[E: packages/core/src/system-context/index.ts:242][E: packages/core/src/system-context/index.ts:244][E: packages/core/src/system-context/index.ts:272][E: packages/core/src/system-context/index.ts:276]
10. `replace(value, previous)` also observes once but calls `replaceObservation`; if a source that existed in previous snapshot is currently unavailable, replacement is blocked, otherwise a complete new `Generation` is ready。[E: packages/core/src/system-context/index.ts:283][E: packages/core/src/system-context/index.ts:284][E: packages/core/src/system-context/index.ts:288][E: packages/core/src/system-context/index.ts:290]
11. `SessionContextEpoch.prepare` initializes when no stored epoch exists, otherwise uses `SystemContext.replace` only when latest compaction sequence is newer than the stored baseline; ordinary turns use `SystemContext.reconcile`。[E: packages/core/src/session/context-epoch.ts:50][E: packages/core/src/session/context-epoch.ts:51][E: packages/core/src/session/context-epoch.ts:59][E: packages/core/src/session/context-epoch.ts:61][E: packages/core/src/session/context-epoch.ts:62]
12. When reconcile returns `Updated`, `SessionContextEpoch.prepare` publishes `SessionEvent.ContextUpdated` with exact rendered text and advances the hidden snapshot in the event commit hook。[E: packages/core/src/session/context-epoch.ts:72][E: packages/core/src/session/context-epoch.ts:74][E: packages/core/src/session/context-epoch.ts:75][E: packages/core/src/session/context-epoch.ts:161][E: packages/core/src/session/context-epoch.ts:168]

## 设计动机与权衡

- `CONTEXT.md` says Context Source loaders return one coherent typed value; `SystemContext.make(...)` hides that value type so differently typed sources compose uniformly, and codec stores/compares that value。[E: CONTEXT.md:110]
- `CONTEXT.md` says context changes are sampled lazily at safe provider-turn boundaries, never pushed asynchronously when a source changes; in the current runner path, `systemContext.load()` is called through `loadSystemContext(agent)` during `runTurnAttempt` and passed to Context Epoch initialize/prepare。[E: CONTEXT.md:98][E: packages/core/src/session/runner/llm.ts:163][E: packages/core/src/session/runner/llm.ts:178][E: packages/core/src/session/runner/llm.ts:193] The absence of an async subscription in this path is an implementation inference rather than a global codebase proof。[I]
- `unavailable` implements stale-while-revalidate semantics: ordinary reconcile retains prior admitted snapshot while replacement waits for a complete admitted context。[E: CONTEXT.md:114][E: packages/core/src/system-context/index.ts:251][E: packages/core/src/system-context/index.ts:288][E: packages/core/src/system-context/index.ts:289]
- Replacement is stricter than update because it creates a new baseline for a baseline-replacing transition; current `SessionContextEpoch.prepare` uses replacement when completed compaction is newer than the stored baseline。[E: CONTEXT.md:113][E: packages/core/src/session/context-epoch.ts:59][E: packages/core/src/session/context-epoch.ts:61][I]

## Gotcha

- `Source<A>.load` is typed as `Effect.Effect<A | Unavailable>`, and project terminology describes the loader as infallible; `observe` maps source load results with no local recovery branch in that mapping path [I], while `InstructionContext` is one producer that catches expected errors/defects and returns `SystemContext.unavailable`。[E: packages/core/src/system-context/index.ts:35][E: CONTEXT.md:16][E: packages/core/src/system-context/index.ts:182][E: packages/core/src/system-context/index.ts:186][E: packages/core/src/instruction-context.ts:84][E: packages/core/src/instruction-context.ts:85]
- `SystemContext.combine` is order-preserving for callers, while `SystemContextRegistry.load` sorts registry entries by contribution key before combining; deterministic registry ordering belongs to registry, not the algebra primitive。[E: packages/core/src/system-context/index.ts:176][E: packages/core/src/system-context/registry.ts:40][I]

## Sources

- `packages/core/src/system-context/index.ts`
- `packages/core/src/system-context/registry.ts`
- `packages/core/src/session/context-epoch.ts`
- `packages/core/src/session/runner/llm.ts`
- `packages/core/src/instruction-context.ts`
- `CONTEXT.md`
- `specs/v2/session.md`

## 相关

- [V2 Context Epoch 生命周期](../../spine/v2-context-epoch.md)
- [System Context registry 与 built-ins](system-context-registry.md)
