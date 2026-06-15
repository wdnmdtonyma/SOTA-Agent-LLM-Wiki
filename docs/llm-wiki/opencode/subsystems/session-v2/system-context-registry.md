---
id: session-v2.system-context-registry
title: System Context registry 与 built-ins
kind: subsystem
tier: T2
v: v2
source:
  - packages/core/src/system-context/registry.ts
  - packages/core/src/system-context/builtins.ts
  - packages/core/src/instruction-context.ts
  - packages/core/src/location-layer.ts
  - packages/core/src/session/runner/llm.ts
  - CONTEXT.md
symbols:
  - SystemContextRegistry.Service
  - SystemContextRegistry.Entry
  - SystemContextRegistry.layer
  - SystemContextBuiltIns.layer
  - SystemContextBuiltIns.locationLayer
related:
  - session-v2.system-context-algebra
evidence: explicit
status: verified
updated: 92c70c9c3
---

> System Context registry 是 Location-scoped scoped contribution registry: built-ins 与 instruction context register keyed producers;runner 在 provider-turn preparation 中调 `load()` 并把 registry context、skill guidance、reference guidance 用 `SystemContext.combine(...)` 合成 deterministic context。[E: packages/core/src/system-context/builtins.ts:39][E: packages/core/src/instruction-context.ts:73][E: packages/core/src/session/runner/llm.ts:171][E: packages/core/src/session/runner/llm.ts:173][E: packages/core/src/system-context/registry.ts:39][E: packages/core/src/system-context/registry.ts:41] Plugin-defined context registration 仍是后续工作。[E: CONTEXT.md:85]

## 能回答的问题

- `SystemContextRegistry.Entry` 的 `key` 与 `load` 分别表示什么?
- duplicate contribution key 在 register 阶段如何失败?
- registry 的 deterministic ordering 如何实现?
- built-in environment/date source 的 key、codec、baseline/update text 是什么?
- instruction context 如何通过 registry 贡献 `core/instructions` source?

## 职责边界

`SystemContextRegistry.Service` 只维护 scoped producer entries,提供 `register(entry)` 和 `load()` 两个操作;从该 service interface 看,它不比较 snapshots、不发布 context update events、不持久化 Context Epoch。[E: packages/core/src/system-context/registry.ts:12][E: packages/core/src/system-context/registry.ts:13][I]

## 数据模型

| 实体/字段 | 含义 | 证据 |
| --- | --- | --- |
| `Entry.key` | registry contribution identity,不是每个 nested source 的全部 key set。 | [E: packages/core/src/system-context/registry.ts:7][E: packages/core/src/system-context/builtins.ts:21][E: packages/core/src/system-context/builtins.ts:23][E: packages/core/src/system-context/builtins.ts:31][E: packages/core/src/system-context/builtins.ts:39] |
| `Entry.load` | returns one `SystemContext.SystemContext`;一个 contribution 可以返回 composed context。 | [E: packages/core/src/system-context/registry.ts:8][E: packages/core/src/system-context/builtins.ts:21][E: packages/core/src/system-context/builtins.ts:39] |
| `register` | scope-bound registration,finalizer removes exactly that entry。 | [E: packages/core/src/system-context/registry.ts:25][E: packages/core/src/system-context/registry.ts:35] |
| `load` | snapshots current entries,sorts by key,loads all entries concurrently,then combines results。 | [E: packages/core/src/system-context/registry.ts:39][E: packages/core/src/system-context/registry.ts:40][E: packages/core/src/system-context/registry.ts:41] |
| `core/builtins` | built-in contribution key used to register environment/date composed context。 | [E: packages/core/src/system-context/builtins.ts:21][E: packages/core/src/system-context/builtins.ts:23][E: packages/core/src/system-context/builtins.ts:31][E: packages/core/src/system-context/builtins.ts:39] |
| `core/environment` | source key for working directory, workspace root, git repo flag, platform。 | [E: packages/core/src/system-context/builtins.ts:15][E: packages/core/src/system-context/builtins.ts:16][E: packages/core/src/system-context/builtins.ts:17][E: packages/core/src/system-context/builtins.ts:18][E: packages/core/src/system-context/builtins.ts:23] |
| `core/date` | source key for host date string。 | [E: packages/core/src/system-context/builtins.ts:31][E: packages/core/src/system-context/builtins.ts:33] |
| `core/instructions` | instruction aggregate source key registered by `InstructionContext.layer`。 | [E: packages/core/src/instruction-context.ts:19][E: packages/core/src/instruction-context.ts:73][E: packages/core/src/instruction-context.ts:74] |

## 控制流

1. `SystemContextRegistry.layer` allocates a `Ref<ReadonlyArray<Entry>>` to hold active scoped entries。[E: packages/core/src/system-context/registry.ts:18][E: packages/core/src/system-context/registry.ts:21]
2. `register(entry)` uses `Effect.acquireRelease`: acquire appends the entry when no current item has the same key, duplicate key dies with `Duplicate system context entry key`, release filters out the same entry object。[E: packages/core/src/system-context/registry.ts:25][E: packages/core/src/system-context/registry.ts:27][E: packages/core/src/system-context/registry.ts:28][E: packages/core/src/system-context/registry.ts:31][E: packages/core/src/system-context/registry.ts:35]
3. `load()` reads the current Ref, sorts entries by key lexical order, runs each entry `load` concurrently, and calls `SystemContext.combine` on the returned contexts。[E: packages/core/src/system-context/registry.ts:39][E: packages/core/src/system-context/registry.ts:40][E: packages/core/src/system-context/registry.ts:41]
4. `SystemContextBuiltIns.layer` first obtains `Location.Service` and `SystemContextRegistry.Service`, then constructs environment text from `location.directory`, `location.project.directory`, `location.vcs`, and `process.platform`。[E: packages/core/src/system-context/builtins.ts:11][E: packages/core/src/system-context/builtins.ts:12][E: packages/core/src/system-context/builtins.ts:15][E: packages/core/src/system-context/builtins.ts:16][E: packages/core/src/system-context/builtins.ts:17][E: packages/core/src/system-context/builtins.ts:18]
5. Built-ins create `core/environment` with string codec, a baseline headed "Here is some useful information...", and an update headed "The environment you are running in is now:"。[E: packages/core/src/system-context/builtins.ts:23][E: packages/core/src/system-context/builtins.ts:24][E: packages/core/src/system-context/builtins.ts:25][E: packages/core/src/system-context/builtins.ts:27][E: packages/core/src/system-context/builtins.ts:28]
6. Built-ins create `core/date` with string codec and `DateTime.nowAsDate.pipe(Effect.map((date) => date.toDateString()))`; baseline/update text preserves host-local date wording。[E: packages/core/src/system-context/builtins.ts:31][E: packages/core/src/system-context/builtins.ts:32][E: packages/core/src/system-context/builtins.ts:33][E: packages/core/src/system-context/builtins.ts:34][E: packages/core/src/system-context/builtins.ts:35][E: CONTEXT.md:93]
7. Built-ins combine environment/date into one context and register it as one contribution under `core/builtins`。[E: packages/core/src/system-context/builtins.ts:21][E: packages/core/src/system-context/builtins.ts:39]
8. `SystemContextBuiltIns.layer` merges built-ins with `InstructionContext.layer` and provides `SystemContextRegistry.layer`, so instructions share the same registry instance。[E: packages/core/src/system-context/builtins.ts:43][E: packages/core/src/system-context/builtins.ts:44]
9. `InstructionContext.layer` discovers global and upward project `AGENTS.md` files unless `OPENCODE_DISABLE_PROJECT_CONFIG` blocks project discovery, returns `SystemContext.unavailable` when a discovered project instruction read fails, and registers `core/instructions`。[E: packages/core/src/instruction-context.ts:19][E: packages/core/src/instruction-context.ts:46][E: packages/core/src/instruction-context.ts:47][E: packages/core/src/instruction-context.ts:48][E: packages/core/src/instruction-context.ts:49][E: packages/core/src/instruction-context.ts:50][E: packages/core/src/instruction-context.ts:51][E: packages/core/src/instruction-context.ts:55][E: packages/core/src/instruction-context.ts:68][E: packages/core/src/instruction-context.ts:69][E: packages/core/src/instruction-context.ts:73][E: packages/core/src/instruction-context.ts:74]
10. `LocationServiceMap` includes `SystemContextBuiltIns.locationLayer` in the fresh Location layer;that built-ins layer provides `SystemContextRegistry.layer` to built-ins and instruction context。[E: packages/core/src/system-context/builtins.ts:43][E: packages/core/src/system-context/builtins.ts:44][E: packages/core/src/system-context/builtins.ts:47][E: packages/core/src/location-layer.ts:48][E: packages/core/src/location-layer.ts:54][E: packages/core/src/location-layer.ts:70][E: packages/core/src/location-layer.ts:113]
11. Runner loads registry context per provider-turn preparation through `systemContext.load()`, then combines it with selected-agent skill guidance and reference guidance before Context Epoch initialize/prepare。[E: packages/core/src/session/runner/llm.ts:171][E: packages/core/src/session/runner/llm.ts:173][E: packages/core/src/session/runner/llm.ts:184][E: packages/core/src/session/runner/llm.ts:186][E: packages/core/src/session/runner/llm.ts:206]

## 设计动机与权衡

- `CONTEXT.md` says registry uses stable-keyed scoped contributions and contributor removal naturally removes sources at the next safe provider-turn boundary; the scoped `acquireRelease` finalizer in `register` is the implementation hook for that behavior。[E: CONTEXT.md:59][E: packages/core/src/system-context/registry.ts:25][E: packages/core/src/system-context/registry.ts:35]
- `CONTEXT.md` says registry evaluates producers concurrently and combines them in stable contribution-key order; `load()` sorts current entries before `Effect.forEach(..., { concurrency: "unbounded" })`。[E: CONTEXT.md:71][E: packages/core/src/system-context/registry.ts:39][E: packages/core/src/system-context/registry.ts:41]
- Current code registers environment/date together under one `core/builtins` contribution and registers ambient instructions as the separate `core/instructions` contribution; registry evaluation is concurrent and stable-key ordered。[E: packages/core/src/system-context/builtins.ts:21][E: packages/core/src/system-context/builtins.ts:39][E: packages/core/src/instruction-context.ts:74][E: packages/core/src/system-context/registry.ts:39][E: packages/core/src/system-context/registry.ts:41]
- Plugin-defined context registration remains a follow-up; the registry is already scoped, but `SystemContextBuiltIns.layer` currently merges built-ins and instruction context, not a plugin-defined context hook。[E: CONTEXT.md:85][E: packages/core/src/system-context/builtins.ts:43][E: packages/core/src/system-context/builtins.ts:44][I]

## Gotcha

- `SystemContextRegistry.Entry.key` is a contribution key. A contribution can return `SystemContext.combine([...])` with multiple source keys, as `core/builtins` does for `core/environment` and `core/date`。[E: packages/core/src/system-context/builtins.ts:21][E: packages/core/src/system-context/builtins.ts:23][E: packages/core/src/system-context/builtins.ts:31][E: packages/core/src/system-context/builtins.ts:39]
- Built-in date uses `Date.toDateString()` from the host process; configured user timezone is documented as a later replacement possibility, not current code behavior。[E: packages/core/src/system-context/builtins.ts:33][E: CONTEXT.md:93]
- `InstructionContext` catches errors/defects and turns them into `SystemContext.unavailable`; the distinction between producer-level stale-while-revalidate and registry-level loading is an implementation inference from the registry only calling each entry load。[E: packages/core/src/instruction-context.ts:83][E: packages/core/src/instruction-context.ts:84][E: packages/core/src/system-context/registry.ts:41] [I]

## Sources

- `packages/core/src/system-context/registry.ts`
- `packages/core/src/system-context/builtins.ts`
- `packages/core/src/instruction-context.ts`
- `packages/core/src/location-layer.ts`
- `packages/core/src/session/runner/llm.ts`
- `CONTEXT.md`

## 相关

- [System Context 代数](system-context-algebra.md)
