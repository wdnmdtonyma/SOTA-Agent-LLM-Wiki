---
id: plugin-api.v2-hooks
title: V2 Effect-native plugin hooks
kind: surface
tier: T1
v: v2
source: [packages/core/src/plugin.ts, packages/core/src/catalog.ts, packages/core/src/aisdk.ts, packages/core/src/plugin/boot.ts]
symbols: [PluginV2, PluginV2.Hooks, PluginV2.Service, PluginBoot]
related: [server.plugin-system, model-layer.model-catalog-v2]
evidence: explicit
status: verified
updated: 355a0bcf5
---

> V2 plugin hooks are Effect-native functions scoped by `@opencode/v2/Plugin`; current hook surface has exactly three hook names: `catalog.transform`, `aisdk.sdk`, and `aisdk.language`。[E: packages/core/src/plugin.ts:23][E: packages/core/src/plugin.ts:24][E: packages/core/src/plugin.ts:28][E: packages/core/src/plugin.ts:38][I]

## 能回答的问题

- V2 plugin hook names and payload shapes are defined where?
- V2 `PluginV2.define()` and `PluginV2.Service.add()` expect what effect shape?
- `catalog.transform` is triggered by which catalog lifecycle?
- `aisdk.sdk` and `aisdk.language` are triggered by which model initialization path?
- V2 hook execution differs from V1 Promise callback hooks in what way?

## Hook spec

| hook | input | output | trigger |
|---|---|---|---|
| `catalog.transform` | `Catalog.Editor` [E: packages/core/src/plugin.ts:24][E: packages/core/src/plugin.ts:25] | no explicit output fields [E: packages/core/src/plugin.ts:26] | catalog finalize triggers it unless reason is `plugin.added`; plugin-added event triggers `triggerFor(id, "catalog.transform", ...)` for the added plugin [E: packages/core/src/catalog.ts:189][E: packages/core/src/catalog.ts:190][E: packages/core/src/catalog.ts:201][E: packages/core/src/catalog.ts:208] |
| `aisdk.sdk` | `{ model: ModelV2.Info; package: string; options: Record<string, any> }` [E: packages/core/src/plugin.ts:38][E: packages/core/src/plugin.ts:42] | `{ sdk?: any }` [E: packages/core/src/plugin.ts:44][E: packages/core/src/plugin.ts:45] | `AISDK.language()` calls it when no cached SDK exists for provider/model/options [E: packages/core/src/aisdk.ts:149][E: packages/core/src/aisdk.ts:152][E: packages/core/src/aisdk.ts:153] |
| `aisdk.language` | `{ model: ModelV2.Info; sdk: any; options: Record<string, any> }` [E: packages/core/src/plugin.ts:28][E: packages/core/src/plugin.ts:32] | `{ language?: LanguageModelV3 }` [E: packages/core/src/plugin.ts:34][E: packages/core/src/plugin.ts:35] | `AISDK.language()` calls it after obtaining SDK; fallback is `sdk.languageModel(model.api.id)` if hook leaves `language` empty [E: packages/core/src/aisdk.ts:160][E: packages/core/src/aisdk.ts:171] |

## Effect-native execution model

`PluginV2.define()` takes `{ id, effect }`, where `effect` returns hook functions or void inside Effect runtime.[E: packages/core/src/plugin.ts:67][E: packages/core/src/plugin.ts:68] `PluginV2.HookFunctions` maps each hook name to an optional `(input) => Effect.Effect<void>` function, not a Promise callback with separate input/output arguments.[E: packages/core/src/plugin.ts:58][E: packages/core/src/plugin.ts:59]

`PluginV2.Service.add()` closes any existing plugin scope for the same id, forks a child scope, runs the plugin effect inside that child scope, stores returned hooks, and publishes `plugin.added`.[E: packages/core/src/plugin.ts:105][E: packages/core/src/plugin.ts:108][E: packages/core/src/plugin.ts:110][E: packages/core/src/plugin.ts:111][E: packages/core/src/plugin.ts:120][E: packages/core/src/plugin.ts:128] `PluginBoot.add()` provides core services such as Catalog, Command, Credential, Integration, Agent, Config, Location, ModelsDev, Npm, EventV2, FSUtil, Global, Skill, Reference and Plugin service into each plugin effect.[E: packages/core/src/plugin/boot.ts:77][E: packages/core/src/plugin/boot.ts:81][E: packages/core/src/plugin/boot.ts:84][E: packages/core/src/plugin/boot.ts:95]

`PluginV2.Service.trigger()` delegates to `triggerFor("*", ...)`, while `triggerFor(id, ...)` optionally targets a single plugin id.[E: packages/core/src/plugin.ts:132][E: packages/core/src/plugin.ts:135][E: packages/core/src/plugin.ts:149][E: packages/core/src/plugin.ts:150] `triggerFor()` merges input and output into one event object; object output fields are converted to Immer drafts before hook execution and finished after all hooks run.[E: packages/core/src/plugin.ts:136][E: packages/core/src/plugin.ts:142][E: packages/core/src/plugin.ts:153][E: packages/core/src/plugin.ts:163] This is the key V2 difference from V1: V2 hooks mutate fields on a single Effect event object, while V1 hooks receive `(input, output)` Promise arguments [I].

## Sources

- packages/core/src/plugin.ts
- packages/core/src/catalog.ts
- packages/core/src/aisdk.ts
- packages/core/src/plugin/boot.ts

## 相关

- [Plugin system](../../subsystems/server/plugin-system.md)
- [V2 model catalog](../../subsystems/model-layer/model-catalog-v2.md)
