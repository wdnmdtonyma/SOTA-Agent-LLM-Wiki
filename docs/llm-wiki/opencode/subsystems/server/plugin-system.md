---
id: server.plugin-system
title: Plugin System
kind: subsystem
tier: T2
v: shared
source:
  - packages/opencode/src/plugin/index.ts
  - packages/opencode/src/plugin/loader.ts
  - packages/opencode/src/plugin/tui/runtime.ts
  - packages/plugin/src/index.ts
  - packages/plugin/src/tui.ts
  - packages/plugin/src/v2/effect/index.ts
  - packages/plugin/src/v2/effect/context.ts
  - packages/plugin/src/v2/effect/plugin.ts
  - packages/core/src/plugin.ts
  - packages/core/src/plugin/host.ts
  - packages/core/src/plugin/internal.ts
  - packages/core/src/plugin/provider.ts
  - packages/core/src/plugin/provider/github-copilot.ts
  - packages/core/src/plugin/provider/azure.ts
  - packages/core/src/plugin/provider/cloudflare-workers-ai.ts
  - packages/core/src/plugin/provider/cloudflare-ai-gateway.ts
  - packages/core/src/plugin/provider/xai.ts
symbols:
  - Plugin
  - PluginLoader
  - PluginV2
  - PluginInternal
  - PluginHost
  - TuiPluginHost
related:
  - plugin-api.v1-hooks
  - plugin-api.v2-hooks
  - plugin-api.tui
evidence: explicit
status: verified
updated: 8b68dc0d7
---

`server.plugin-system` 分成三条线: V1 server callback plugins、V1 TUI plugin host、V2 Effect-native `PluginV2` plus `PluginInternal` boot. V1 server service tag 是 `@opencode/Plugin`，V2 service tag 是 `@opencode/v2/Plugin`。[E: packages/opencode/src/plugin/index.ts:58][E: packages/core/src/plugin.ts:29]

## 能回答的问题
- V1 server plugin hooks 如何 load、trigger、dispose?
- TUI plugin host 如何按顺序 activate/deactivate plugin?
- 8b68dc0d7 下 V2 plugin boot 从 `PluginBoot` 改成了什么?
- V2 plugin host 暴露哪些 transform / AISDK / integration capabilities?

## V1 server plugins

`Plugin.Interface.trigger` 传 `name`、`input`、`output` 并返回 `Effect<Output>`；`list()` 返回 hooks，`init()` 初始化 plugin state。[E: packages/opencode/src/plugin/index.ts:45][E: packages/opencode/src/plugin/index.ts:55] `experimentalWebSocketsEnabled` 在显式 enabled 或 channel 为 local/dev/beta 时返回 true。[E: packages/opencode/src/plugin/index.ts:60][E: packages/opencode/src/plugin/index.ts:61]

内建 server plugins 在 `internalPlugins(flags)` 中组装，包含 Codex、Copilot、Gitlab、Poe、Cloudflare Workers、Cloudflare AI Gateway、Azure、DigitalOcean、Xai；Codex built-in 收到 `experimentalWebSockets` option。[E: packages/opencode/src/plugin/index.ts:65][E: packages/opencode/src/plugin/index.ts:68][E: packages/opencode/src/plugin/index.ts:80]

Plugin input 的 `client` 通过 `createOpencodeClient` 构造，base URL 是 `http://localhost:4096`，但 fetch 使用 `Server.Default().app.fetch`，所以 server plugin client 是进程内调用 V1 server handler。[E: packages/opencode/src/plugin/index.ts:142][E: packages/opencode/src/plugin/index.ts:143]

Internal plugins 直接 `plugin(input)` load，受 `flags.disableDefaultPlugins` 控制。[E: packages/opencode/src/plugin/index.ts:166][E: packages/opencode/src/plugin/index.ts:174] External origins 来自 `cfg.plugin_origins`，但 `flags.pure` 时为空；存在 external plugins 时会先 `config.waitForDependencies()`。[E: packages/opencode/src/plugin/index.ts:177][E: packages/opencode/src/plugin/index.ts:180]

External plugin apply 是顺序执行: `for (const load of loaded)` 后逐项 `applyPlugin(load, input, hooks)`。[E: packages/opencode/src/plugin/index.ts:215][E: packages/opencode/src/plugin/index.ts:221] `PluginLoader.loadExternal` 内部并行收集 attempts，`Promise.all(list)` 完成后把成功 item push 到 ready。[E: packages/opencode/src/plugin/loader.ts:209][E: packages/opencode/src/plugin/loader.ts:212][E: packages/opencode/src/plugin/loader.ts:233]

`trigger(name, input, output)` 按当前 hooks 顺序执行，hook 上没有该 name 就跳过，最后返回 output。[E: packages/opencode/src/plugin/index.ts:286][E: packages/opencode/src/plugin/index.ts:289][E: packages/opencode/src/plugin/index.ts:292]

V1 server hook surface 覆盖 dispose/event/config/tool/auth/provider，以及 chat、permission、command、tool execution、shell env、compaction、text completion、tool definition 等 callback hooks。[E: packages/plugin/src/index.ts:222][E: packages/plugin/src/index.ts:334]

## V1 TUI host

TUI runtime state 追踪 directory、api、view、dispose、slots、plugins、plugins_by_id、pending 和 dispose timeout。[E: packages/opencode/src/plugin/tui/runtime.ts:110][E: packages/opencode/src/plugin/tui/runtime.ts:119] TUI public API type 暴露 app、attention、command legacy API、keys、keymap、mode、route、ui、tuiConfig、kv、state、theme、client、event、renderer、slots、plugins 和 lifecycle。[E: packages/plugin/src/tui.ts:581][E: packages/plugin/src/tui.ts:625]

TUI load 先 add internal TUI plugins，再 resolve external plugins 并 add entries；初始 activation 遍历 `next.plugins`，跳过 disabled plugin 后顺序 `await activatePluginEntry(...)`。[E: packages/opencode/src/plugin/tui/runtime.ts:1093][E: packages/opencode/src/plugin/tui/runtime.ts:1106][E: packages/opencode/src/plugin/tui/runtime.ts:1110][E: packages/opencode/src/plugin/tui/runtime.ts:1116]

TUI dispose 把 plugins reverse 后逐个 deactivate，再调用 state dispose、slots dispose 和 view clear。[E: packages/opencode/src/plugin/tui/runtime.ts:1037][E: packages/opencode/src/plugin/tui/runtime.ts:1039][E: packages/opencode/src/plugin/tui/runtime.ts:1044][E: packages/opencode/src/plugin/tui/runtime.ts:1047]

## V2 PluginV2 core

V2 plugin package exports an Effect plugin shape: `PluginContext`, `define`, and `Plugin` type。[E: packages/plugin/src/v2/effect/index.ts:1][E: packages/plugin/src/v2/effect/index.ts:3] The runtime `PluginV2.Interface` now has `add(id, effect)`, `remove(id)`, and `wait(id)`; old `HookSpec` and generic `trigger(...)` are no longer in `packages/core/src/plugin.ts`。[E: packages/core/src/plugin.ts:23][E: packages/core/src/plugin.ts:24][E: packages/core/src/plugin.ts:25][E: packages/core/src/plugin.ts:26][I]

`PluginV2.add` uses a keyed lock, rejects load cycles, closes an existing active scope for the same id, forks a child scope, runs the plugin effect with `PluginHost`, publishes `Event.Added`, stores active scope, and resolves waiters。[E: packages/core/src/plugin.ts:43][E: packages/core/src/plugin.ts:46][E: packages/core/src/plugin.ts:54][E: packages/core/src/plugin.ts:58][E: packages/core/src/plugin.ts:59][E: packages/core/src/plugin.ts:64][E: packages/core/src/plugin.ts:65]

`PluginV2.remove` also uses the keyed lock, deletes active/failure state, and closes the active scope if present。[E: packages/core/src/plugin.ts:85][E: packages/core/src/plugin.ts:88][E: packages/core/src/plugin.ts:91][E: packages/core/src/plugin.ts:94] `wait(id)` creates a deferred waiter unless plugin is already active or has a stored failure exit。[E: packages/core/src/plugin.ts:100][E: packages/core/src/plugin.ts:104][E: packages/core/src/plugin.ts:106][E: packages/core/src/plugin.ts:115]

`PluginHost.make` adapts core services into the v2 plugin context. It exposes agent transform/reload, AISDK sdk/language hooks, catalog transform/reload, command transform/reload, integration connection/transform, plugin add/remove, reference transform/reload, and skill transform/reload。[E: packages/core/src/plugin/host.ts:31][E: packages/core/src/plugin/host.ts:44][E: packages/core/src/plugin/host.ts:72][E: packages/core/src/plugin/host.ts:99][E: packages/core/src/plugin/host.ts:103][E: packages/core/src/plugin/host.ts:193][E: packages/core/src/plugin/host.ts:197][E: packages/core/src/plugin/host.ts:208]

## V2 internal boot

`packages/core/src/plugin/boot.ts` was removed before 8b68dc0d7; current built-in boot is `PluginInternal` in `packages/core/src/plugin/internal.ts`。[U] `PluginInternal.Requirements` includes AgentV2, Catalog, CommandV2, Config, EventV2, FileSystem, FSUtil, Global, HttpClient, Integration, Location, ModelsDev, Npm, Reference and SkillV2 services。[E: packages/core/src/plugin/internal.ts:37][E: packages/core/src/plugin/internal.ts:52]

`PluginInternal` wraps each internal plugin effect with concrete services using `Effect.provideService(...)`, then calls `plugin.add(PluginV2.ID.make(loaded.id), loaded.effect)`。[E: packages/core/src/plugin/internal.ts:81][E: packages/core/src/plugin/internal.ts:88][E: packages/core/src/plugin/internal.ts:105]

Boot order is explicit: config reference, AgentPlugin, CommandPlugin, SkillPlugin, ModelsDevPlugin, config agent/command/skill, ProviderPlugins, ConfigExternalPlugin, ConfigProviderPlugin, VariantPlugin。[E: packages/core/src/plugin/internal.ts:110][E: packages/core/src/plugin/internal.ts:121] The whole boot batch is wrapped in `State.batch(...)` and forked scoped with span `PluginInternal.boot`。[E: packages/core/src/plugin/internal.ts:108][E: packages/core/src/plugin/internal.ts:123]

`ProviderPlugins` now includes Alibaba, Amazon Bedrock, Anthropic, Azure Cognitive Services, Azure, Cerebras, Cloudflare AI Gateway, Cloudflare Workers AI, Cohere, DeepInfra, Gateway, GitHub Copilot, GitLab, Google, Google Vertex, Groq, Kilo, LLMGateway, Mistral, Nvidia, Opencode, Snowflake Cortex, OpenAI-compatible, OpenAI, OpenRouter, Perplexity, SAP AI Core, TogetherAI, Vercel, Venice, XAI, Zenmux and DynamicProviderPlugin。[E: packages/core/src/plugin/provider.ts:36][E: packages/core/src/plugin/provider.ts:70]

Provider plugin examples use the new context hooks: GitHub Copilot registers catalog transform, AISDK SDK hook and AISDK language hook; Azure registers catalog transform, SDK hook and language hook; Cloudflare Workers AI registers catalog transform, SDK hook and language hook; Cloudflare AI Gateway registers SDK hook; XAI registers SDK and language hooks。[E: packages/core/src/plugin/provider/github-copilot.ts:17][E: packages/core/src/plugin/provider/github-copilot.ts:28][E: packages/core/src/plugin/provider/github-copilot.ts:35][E: packages/core/src/plugin/provider/azure.ts:16][E: packages/core/src/plugin/provider/azure.ts:31][E: packages/core/src/plugin/provider/azure.ts:49][E: packages/core/src/plugin/provider/cloudflare-workers-ai.ts:12][E: packages/core/src/plugin/provider/cloudflare-workers-ai.ts:24][E: packages/core/src/plugin/provider/cloudflare-workers-ai.ts:40][E: packages/core/src/plugin/provider/cloudflare-ai-gateway.ts:9][E: packages/core/src/plugin/provider/xai.ts:8][E: packages/core/src/plugin/provider/xai.ts:15]

## V1 / V2 对照

| 维度 | V1 server/TUI plugins | V2 PluginV2 |
| --- | --- | --- |
| Hook surface | V1 server callback hooks cover config, auth/provider, chat, permission, command, tools, shell and more; TUI has separate host slots/API。[E: packages/plugin/src/index.ts:222][E: packages/plugin/src/tui.ts:581] | V2 host exposes transform/reload domains plus AISDK sdk/language hooks through `PluginContext`。[E: packages/core/src/plugin/host.ts:31][E: packages/core/src/plugin/host.ts:44][E: packages/core/src/plugin/host.ts:72] |
| Loading | Built-ins call plugin factory directly; external plugins resolve/load then apply in ready order。[E: packages/opencode/src/plugin/index.ts:166][E: packages/opencode/src/plugin/index.ts:215] | `PluginInternal` adds built-ins/providers/config plugins through `PluginV2.add` and forked scoped boot。[E: packages/core/src/plugin/internal.ts:105][E: packages/core/src/plugin/internal.ts:123] |
| Lifetime | V1 finalizer unsubscribes event listener and calls dispose hooks; TUI dispose reverse-deactivates plugins。[E: packages/opencode/src/plugin/index.ts:259][E: packages/opencode/src/plugin/index.ts:266][E: packages/opencode/src/plugin/tui/runtime.ts:1037] | V2 add/remove owns plugin lifetime through child scopes and keyed locks。[E: packages/core/src/plugin.ts:58][E: packages/core/src/plugin.ts:94] |

## Sources

- `packages/opencode/src/plugin/index.ts`
- `packages/opencode/src/plugin/loader.ts`
- `packages/opencode/src/plugin/tui/runtime.ts`
- `packages/plugin/src/index.ts`
- `packages/plugin/src/tui.ts`
- `packages/plugin/src/v2/effect/context.ts`
- `packages/plugin/src/v2/effect/plugin.ts`
- `packages/plugin/src/v2/effect/index.ts`
- `packages/core/src/plugin.ts`
- `packages/core/src/plugin/host.ts`
- `packages/core/src/plugin/internal.ts`
- `packages/core/src/plugin/provider.ts`
- `packages/core/src/plugin/provider/github-copilot.ts`
- `packages/core/src/plugin/provider/azure.ts`
- `packages/core/src/plugin/provider/cloudflare-workers-ai.ts`
- `packages/core/src/plugin/provider/cloudflare-ai-gateway.ts`
- `packages/core/src/plugin/provider/xai.ts`

## Related

- [plugin-api.v1-hooks](../../surface/plugin-api/v1-hooks.md)
- [plugin-api.v2-hooks](../../surface/plugin-api/v2-hooks.md)
- [plugin-api.tui](../../surface/plugin-api/tui.md)
