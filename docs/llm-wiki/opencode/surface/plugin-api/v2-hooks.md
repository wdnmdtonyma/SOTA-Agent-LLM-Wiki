---
id: plugin-api.v2-hooks
title: V2 Effect-native plugin hooks
kind: surface
tier: T1
v: v2
source:
  - packages/core/src/plugin.ts
  - packages/core/src/plugin/host.ts
  - packages/core/src/plugin/internal.ts
  - packages/core/src/plugin/promise.ts
  - packages/core/src/catalog.ts
  - packages/core/src/aisdk.ts
  - packages/core/src/state.ts
  - packages/plugin/src/v2/effect/context.ts
  - packages/plugin/src/v2/effect/registration.ts
  - packages/plugin/src/v2/effect/aisdk.ts
  - packages/plugin/src/v2/effect/catalog.ts
  - packages/plugin/src/v2/effect/plugin.ts
symbols: [PluginV2, PluginV2.Service, PluginHost, PluginInternal]
related: [server.plugin-system, model-layer.model-catalog-v2]
evidence: explicit
status: verified
updated: 8b68dc0d7
---

> V2 plugin hooks are Effect-native registration functions exposed through `@opencode-ai/plugin/v2/effect` `PluginContext`; the current context groups hook-like APIs under `agent`, `aisdk`, `catalog`, `command`, `integration`, `reference`, and `skill`, plus a `plugin` domain for loading and unloading plugins。[E: packages/plugin/src/v2/effect/context.ts:12][E: packages/plugin/src/v2/effect/context.ts:14][E: packages/plugin/src/v2/effect/context.ts:15][E: packages/plugin/src/v2/effect/context.ts:16][E: packages/plugin/src/v2/effect/context.ts:17][E: packages/plugin/src/v2/effect/context.ts:18][E: packages/plugin/src/v2/effect/context.ts:19][E: packages/plugin/src/v2/effect/context.ts:20][E: packages/plugin/src/v2/effect/context.ts:21]

## 能回答的问题

- V2 plugin context domains and hook payload shapes are defined where?
- `PluginV2.Service.add()` expects what Effect plugin shape?
- `catalog.transform` and state transform registrations rebuild catalog state when?
- `aisdk.sdk` and `aisdk.language` are triggered by which model initialization path?
- Effect plugins and Promise plugins are adapted into one loader how?

## Public Context Surface

`packages/plugin/src/v2/effect/context.ts` is the public type surface for Effect plugins: `PluginContext` exposes `options`, `agent`, `aisdk`, `catalog`, `command`, `integration`, `plugin`, `reference`, and `skill`.[E: packages/plugin/src/v2/effect/context.ts:12][E: packages/plugin/src/v2/effect/context.ts:13][E: packages/plugin/src/v2/effect/context.ts:21] Hook-like domains use the generic `Hooks<Spec>` type, where each key is a registration function accepting `(input) => Effect.Effect<void> | void` and returning `Effect.Effect<Registration, never, Scope.Scope>`.[E: packages/plugin/src/v2/effect/registration.ts:11][E: packages/plugin/src/v2/effect/registration.ts:13][E: packages/plugin/src/v2/effect/registration.ts:14]

| domain hook | public input shape | core adapter |
|---|---|---|
| `aisdk.sdk` | `{ model, package, options, sdk? }`; `sdk` is the mutable output field.[E: packages/plugin/src/v2/effect/aisdk.ts:5][E: packages/plugin/src/v2/effect/aisdk.ts:6][E: packages/plugin/src/v2/effect/aisdk.ts:10] | `PluginHost.make()` registers the callback with `aisdk.hook.sdk`, copies `event.sdk` into `output.sdk`, then writes `output.sdk` back to `event.sdk` after the callback.[E: packages/core/src/plugin/host.ts:44][E: packages/core/src/plugin/host.ts:46][E: packages/core/src/plugin/host.ts:51][E: packages/core/src/plugin/host.ts:55] |
| `aisdk.language` | `{ model, sdk, options, language? }`; `language` is the mutable output field.[E: packages/plugin/src/v2/effect/aisdk.ts:12][E: packages/plugin/src/v2/effect/aisdk.ts:14][E: packages/plugin/src/v2/effect/aisdk.ts:16] | `PluginHost.make()` registers the callback with `aisdk.hook.language`, copies `event.language` into `output.language`, then writes `output.language` back to `event.language` after the callback.[E: packages/core/src/plugin/host.ts:58][E: packages/core/src/plugin/host.ts:59][E: packages/core/src/plugin/host.ts:64][E: packages/core/src/plugin/host.ts:68] |
| `catalog.transform` | `CatalogDraft` with provider list/get/update/remove and model get/update/remove/default APIs.[E: packages/plugin/src/v2/effect/catalog.ts:9][E: packages/plugin/src/v2/effect/catalog.ts:10][E: packages/plugin/src/v2/effect/catalog.ts:16][E: packages/plugin/src/v2/effect/catalog.ts:20] | `PluginHost.make()` maps public string IDs into core `ProviderV2.ID` and `ModelV2.ID` values before delegating to `catalog.transform`.[E: packages/core/src/plugin/host.ts:72][E: packages/core/src/plugin/host.ts:74][E: packages/core/src/plugin/host.ts:79][E: packages/core/src/plugin/host.ts:85][E: packages/core/src/plugin/host.ts:93] |
| `agent.transform`, `command.transform`, `reference.transform`, `skill.transform` | These domains are present on `PluginContext` as hook groups combined with `reload`.[E: packages/plugin/src/v2/effect/context.ts:14][E: packages/plugin/src/v2/effect/context.ts:17][E: packages/plugin/src/v2/effect/context.ts:20][E: packages/plugin/src/v2/effect/context.ts:21] | `PluginHost.make()` delegates each public transform API to the matching core service transform/reload pair.[E: packages/core/src/plugin/host.ts:31][E: packages/core/src/plugin/host.ts:33][E: packages/core/src/plugin/host.ts:99][E: packages/core/src/plugin/host.ts:101][E: packages/core/src/plugin/host.ts:197][E: packages/core/src/plugin/host.ts:199][E: packages/core/src/plugin/host.ts:208][E: packages/core/src/plugin/host.ts:210] |

## Effect-native execution model

Effect plugins are defined as `{ id, effect }`, where `effect(context)` returns `Effect.Effect<void, never, R>`.[E: packages/plugin/src/v2/effect/plugin.ts:4][E: packages/plugin/src/v2/effect/plugin.ts:5][E: packages/plugin/src/v2/effect/plugin.ts:6] The helper `define(plugin)` returns the plugin object unchanged.[E: packages/plugin/src/v2/effect/plugin.ts:9][E: packages/plugin/src/v2/effect/plugin.ts:10]

`PluginV2.Service.add(id, effect)` rejects load cycles, removes any existing active scope for the same plugin id, forks a child scope, runs `effect(host)` inside the child scope, publishes `plugin.added`, and stores the child scope as active.[E: packages/core/src/plugin.ts:43][E: packages/core/src/plugin.ts:44][E: packages/core/src/plugin.ts:54][E: packages/core/src/plugin.ts:56][E: packages/core/src/plugin.ts:58][E: packages/core/src/plugin.ts:59][E: packages/core/src/plugin.ts:64][E: packages/core/src/plugin.ts:65] `PluginHost.make(service)` is created after the `PluginV2.Service` object is assembled, so every plugin effect receives the same host context shape.[E: packages/core/src/plugin.ts:135][E: packages/core/src/plugin.ts:140]

`PluginInternal` replaces the deleted `packages/core/src/plugin/boot.ts` boot layer. It defines internal plugin objects with `{ id, effect }`, captures core services such as Catalog, Command, Integration, Agent, Config, Location, ModelsDev, Npm, EventV2, FSUtil, Global, Skill, and Reference, provides those services into each internal plugin effect, and then calls `plugin.add()`.[E: packages/core/src/plugin/internal.ts:54][E: packages/core/src/plugin/internal.ts:56][E: packages/core/src/plugin/internal.ts:65][E: packages/core/src/plugin/internal.ts:80][E: packages/core/src/plugin/internal.ts:81][E: packages/core/src/plugin/internal.ts:88][E: packages/core/src/plugin/internal.ts:102][E: packages/core/src/plugin/internal.ts:105] Boot now registers config, agent, command, skill, models.dev, provider, external, and variant plugins inside a `State.batch(...).forkScoped(...)` block.[E: packages/core/src/plugin/internal.ts:108][E: packages/core/src/plugin/internal.ts:110][E: packages/core/src/plugin/internal.ts:118][E: packages/core/src/plugin/internal.ts:121][E: packages/core/src/plugin/internal.ts:123]

## Trigger Paths

`AISDK.Service` stores registered `sdk` and `language` callbacks in arrays, exposes `runSDK` and `runLanguage`, and calls `runSDK` during `AISDK.language()` when no cached SDK exists for the provider/model/options key.[E: packages/core/src/aisdk.ts:152][E: packages/core/src/aisdk.ts:153][E: packages/core/src/aisdk.ts:185][E: packages/core/src/aisdk.ts:196][E: packages/core/src/aisdk.ts:214][E: packages/core/src/aisdk.ts:216] After an SDK exists, `AISDK.language()` calls `runLanguage`, falls back to `sdk.languageModel(model.api.id)` if the hook leaves `language` empty, and caches the resulting language model.[E: packages/core/src/aisdk.ts:223][E: packages/core/src/aisdk.ts:224][E: packages/core/src/aisdk.ts:227]

`Catalog.Service` is `State.Transformable<Catalog.Draft>`, so `catalog.transform()` registers a scoped transform and `catalog.reload()` rematerializes state.[E: packages/core/src/catalog.ts:47][E: packages/core/src/state.ts:24][E: packages/core/src/state.ts:25][E: packages/core/src/state.ts:26] `State.create()` applies active transforms during materialization, commits the rebuilt state, and removes a transform when its owning scope finalizes.[E: packages/core/src/state.ts:78][E: packages/core/src/state.ts:81][E: packages/core/src/state.ts:82][E: packages/core/src/state.ts:117]

The Promise plugin bridge does not add a separate runtime. `PluginPromise.fromPromise()` wraps a Promise plugin with the Effect `define()` helper, registers Promise callbacks through the Effect host, and runs `plugin.setup(context2)` inside the plugin effect.[E: packages/core/src/plugin/promise.ts:20][E: packages/core/src/plugin/promise.ts:21][E: packages/core/src/plugin/promise.ts:29][E: packages/core/src/plugin/promise.ts:45][E: packages/core/src/plugin/promise.ts:90]

## Sources

- packages/core/src/plugin.ts
- packages/core/src/plugin/host.ts
- packages/core/src/plugin/internal.ts
- packages/core/src/plugin/promise.ts
- packages/core/src/catalog.ts
- packages/core/src/aisdk.ts
- packages/core/src/state.ts
- packages/plugin/src/v2/effect/context.ts
- packages/plugin/src/v2/effect/registration.ts
- packages/plugin/src/v2/effect/aisdk.ts
- packages/plugin/src/v2/effect/catalog.ts
- packages/plugin/src/v2/effect/plugin.ts

## 相关

- [Plugin system](../../subsystems/server/plugin-system.md)
- [V2 model catalog](../../subsystems/model-layer/model-catalog-v2.md)
