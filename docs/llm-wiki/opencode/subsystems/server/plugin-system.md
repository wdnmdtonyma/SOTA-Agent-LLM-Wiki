---
id: server.plugin-system
title: Plugin System
kind: subsystem
tier: T2
v: shared
source:
  - packages/opencode/src/plugin/index.ts
  - packages/opencode/src/plugin/loader.ts
  - packages/core/src/plugin.ts
symbols:
  - Plugin
  - PluginLoader
  - PluginV2
  - PluginBoot
  - TuiPluginHost
related:
  - plugin-api.v1-hooks
  - plugin-api.v2-hooks
  - plugin-api.tui
evidence: explicit
status: verified
updated: 355a0bcf5
---

`server.plugin-system` 分成三条线: V1 server callback plugins、V1 TUI plugin host、V2 Effect-native `PluginV2`。V1 server service tag 是 `@opencode/Plugin`，V2 service tag 是 `@opencode/v2/Plugin`。[E: packages/opencode/src/plugin/index.ts:58][E: packages/core/src/plugin.ts:90]

## V1

### Server service and built-ins

V1 `Plugin.Interface.trigger` 必须传 `name`、`input`、`output`，返回 `Effect<Output>`；`list()` 返回 hooks，`init()` 初始化 plugin state。[E: packages/opencode/src/plugin/index.ts:45][E: packages/opencode/src/plugin/index.ts:55] `experimentalWebSocketsEnabled` 在显式 enabled 或 channel 为 local/dev/beta 时返回 true。[E: packages/opencode/src/plugin/index.ts:60][E: packages/opencode/src/plugin/index.ts:61]

内建 server plugins 在 `internalPlugins(flags)` 中直接组装；列表包括 Codex、Copilot、Gitlab、Poe、Cloudflare Workers、Cloudflare AI Gateway、Azure、DigitalOcean、Xai。[E: packages/opencode/src/plugin/index.ts:65][E: packages/opencode/src/plugin/index.ts:69][E: packages/opencode/src/plugin/index.ts:80] Codex built-in 会收到 `experimentalWebSockets` option。[E: packages/opencode/src/plugin/index.ts:68][E: packages/opencode/src/plugin/index.ts:70]

Plugin input 里的 `client` 用 `createOpencodeClient`，base URL 是 `http://localhost:4096`，但 fetch 是 `Server.Default().app.fetch`，也就是进程内调用 V1 server handler。[E: packages/opencode/src/plugin/index.ts:142][E: packages/opencode/src/plugin/index.ts:143] input 还包含 project、worktree、directory、experimental workspace adapter registration、serverUrl getter 和 Bun `$`。[E: packages/opencode/src/plugin/index.ts:149][E: packages/opencode/src/plugin/index.ts:163]

### Loading and lifecycle

Internal plugins 的加载方式是直接调用 `plugin(input)`，成功后 push 到 `hooks`；这一步受 `flags.disableDefaultPlugins` 控制。[E: packages/opencode/src/plugin/index.ts:166][E: packages/opencode/src/plugin/index.ts:174] External plugin origins 来自 `cfg.plugin_origins`，但 `flags.pure` 时为空；如果存在 external plugins，会先 `config.waitForDependencies()`。[E: packages/opencode/src/plugin/index.ts:177][E: packages/opencode/src/plugin/index.ts:180]

External plugin apply 是顺序执行的: `for (const load of loaded)` 逐项调用 `applyPlugin(load, input, hooks)`；deterministic hook registration/execution order 是从这个循环形态得出的结论。[E: packages/opencode/src/plugin/index.ts:215][E: packages/opencode/src/plugin/index.ts:221][I] `PluginLoader.loadExternal` 内部把 attempt push 到 promise list 后 `Promise.all(list)`，最后只把有 value 的 item 按 out 顺序 push 到 `ready`。[E: packages/opencode/src/plugin/loader.ts:209][E: packages/opencode/src/plugin/loader.ts:212][E: packages/opencode/src/plugin/loader.ts:214][E: packages/opencode/src/plugin/loader.ts:233][E: packages/opencode/src/plugin/loader.ts:234]

Config hook 初始化是直接遍历 hooks 并调用 `hook.config?.(cfg)`。[E: packages/opencode/src/plugin/index.ts:241][E: packages/opencode/src/plugin/index.ts:243] Event hook 使用 `events.listen`，只处理 `event.location?.directory === ctx.directory` 的事件，并向 hook 传 `{ id, type, properties }`。[E: packages/opencode/src/plugin/index.ts:251][E: packages/opencode/src/plugin/index.ts:252][E: packages/opencode/src/plugin/index.ts:255] finalizer 会先 unsubscribe，再遍历 hooks 调 `hook.dispose?.()`。[E: packages/opencode/src/plugin/index.ts:259][E: packages/opencode/src/plugin/index.ts:266]

`trigger(name, input, output)` 按当前 state 的 hooks 顺序执行；hook 上没有该 name 就跳过，最终返回同一个 output object。[E: packages/opencode/src/plugin/index.ts:286][E: packages/opencode/src/plugin/index.ts:287][E: packages/opencode/src/plugin/index.ts:289][E: packages/opencode/src/plugin/index.ts:292]

### Loader behavior

`PluginLoader.attempt` 对 missing entrypoint 返回 `{ retry: false }`；deprecated plugin packages 也直接 skipped。[E: packages/opencode/src/plugin/loader.ts:161][E: packages/opencode/src/plugin/loader.ts:175] retry 只针对 file plugin 的 pre-import setup failures: 重试分支要求 previous `retry === true`、`pluginSource(candidate.plan.spec) === "file"`，然后等待 dependency 并再次 attempt。[E: packages/opencode/src/plugin/loader.ts:220][E: packages/opencode/src/plugin/loader.ts:225][E: packages/opencode/src/plugin/loader.ts:226][E: packages/opencode/src/plugin/loader.ts:228]

V1 server hook surface 很宽: dispose/event/config/tool/auth/provider，以及 chat、permission、command、tool execution、shell env、compaction、text completion、tool definition 等 callback hooks。[E: packages/plugin/src/index.ts:222][E: packages/plugin/src/index.ts:334]

## V1 TUI host

TUI runtime state 直接追踪 directory、api、view、dispose、slots、plugins、plugins_by_id、pending、dispose timeout。[E: packages/opencode/src/plugin/tui/runtime.ts:109][E: packages/opencode/src/plugin/tui/runtime.ts:118] TUI public API type 暴露 app、attention、command legacy API、keys、keymap、mode、route、ui、tuiConfig、kv、state、theme、client、event、renderer、slots、plugins 和 lifecycle。[E: packages/plugin/src/tui.ts:581][E: packages/plugin/src/tui.ts:625]

TUI host slot map 包含 app、app_bottom、home_logo、home_prompt、session_prompt、sidebar_title、sidebar_content、sidebar_footer 等 host slots。[E: packages/plugin/src/tui.ts:455][E: packages/plugin/src/tui.ts:456][E: packages/plugin/src/tui.ts:463][E: packages/plugin/src/tui.ts:475][E: packages/plugin/src/tui.ts:483]

TUI load 时先把 internal TUI plugins 加入 runtime state，然后 resolve external plugins 并加入 entries。[E: packages/opencode/src/plugin/tui/runtime.ts:1092][E: packages/opencode/src/plugin/tui/runtime.ts:1105][E: packages/opencode/src/plugin/tui/runtime.ts:1106] 初始 activation 顺序执行: runtime 遍历 `next.plugins`，跳过 disabled plugin，再 `await activatePluginEntry(...)`。[E: packages/opencode/src/plugin/tui/runtime.ts:1109][E: packages/opencode/src/plugin/tui/runtime.ts:1110][E: packages/opencode/src/plugin/tui/runtime.ts:1115] dispose 时 runtime 按 reverse plugin list deactivate，然后调用 state dispose、slots dispose、view clear。[E: packages/opencode/src/plugin/tui/runtime.ts:1036][E: packages/opencode/src/plugin/tui/runtime.ts:1038][E: packages/opencode/src/plugin/tui/runtime.ts:1045][E: packages/opencode/src/plugin/tui/runtime.ts:1046]

## V2

### Hook engine

V2 `HookSpec` 当前只有 `catalog.transform`、`aisdk.language`、`aisdk.sdk` 三个 hook。[E: packages/core/src/plugin.ts:23][E: packages/core/src/plugin.ts:28][E: packages/core/src/plugin.ts:38] `PluginV2.define` 的签名是 `define({ id, effect })`，原样返回 input。[E: packages/core/src/plugin.ts:67][E: packages/core/src/plugin.ts:68] `PluginV2.Interface.add` 的签名是 `add({ id, effect })`，effect 需要 `Scope.Scope`，返回 `Effect<void>`。[E: packages/core/src/plugin.ts:71][E: packages/core/src/plugin.ts:75]

`add` 用 keyed lock；如果同 id plugin 已存在，先 close 旧 scope，再 fork child scope，运行 `input.effect`，记录 hooks/scope，并 publish `plugin.added` event。[E: packages/core/src/plugin.ts:106][E: packages/core/src/plugin.ts:109][E: packages/core/src/plugin.ts:110][E: packages/core/src/plugin.ts:111][E: packages/core/src/plugin.ts:120][E: packages/core/src/plugin.ts:128] `remove(id)` 也用 lock，过滤 hooks，并 close existing scope。[E: packages/core/src/plugin.ts:169][E: packages/core/src/plugin.ts:170][E: packages/core/src/plugin.ts:173][E: packages/core/src/plugin.ts:174]

`trigger(name, input, output)` 调 `triggerFor("*", ...)`。[E: packages/core/src/plugin.ts:132][E: packages/core/src/plugin.ts:133] `triggerFor` 只把非空 object-valued output 字段做 draft，按 hooks array 顺序匹配 id/hook name，执行 hook 时加 span `Plugin.hook.${name}`，最后 `finishDraft`。[E: packages/core/src/plugin.ts:142][E: packages/core/src/plugin.ts:145][E: packages/core/src/plugin.ts:149][E: packages/core/src/plugin.ts:154][E: packages/core/src/plugin.ts:163]

### Boot and providers

`PluginBoot` 的 plugin effect 可依赖 Catalog、Command、Credential、Integration、Agent、Npm、EventV2、FSUtil、Global、Location、PluginV2、Config、ModelsDev、Skill、Reference 等服务。[E: packages/core/src/plugin/boot.ts:33][E: packages/core/src/plugin/boot.ts:36][E: packages/core/src/plugin/boot.ts:47] Boot 顺序 add AgentPlugin、CommandPlugin、SkillPlugin、ProviderPlugins、ModelsDevPlugin、config provider/agent/command/skill/reference plugins。[E: packages/core/src/plugin/boot.ts:101][E: packages/core/src/plugin/boot.ts:112] `PluginBoot.wait()` 返回 boot completion deferred。[E: packages/core/src/plugin/boot.ts:121][E: packages/core/src/plugin/boot.ts:122]

`ProviderPlugins` 列表包含 Azure、Cloudflare AI Gateway、Cloudflare Workers AI、GitHub Copilot、OpenAI、OpenRouter、XAI、DynamicProviderPlugin 等多个 provider plugin；当前 provider list 没有 `DigitalOcean` entry，因此 DigitalOcean 在本节点读取范围内是 V1 内建 plugin。[E: packages/core/src/plugin/provider.ts:39][E: packages/core/src/plugin/provider.ts:41][E: packages/core/src/plugin/provider.ts:42][E: packages/core/src/plugin/provider.ts:46][E: packages/core/src/plugin/provider.ts:59][E: packages/core/src/plugin/provider.ts:66][E: packages/core/src/plugin/provider.ts:68][I] 例如 GitHub Copilot plugin 定义 `aisdk.sdk`、`aisdk.language` 和 `catalog.transform` hooks。[E: packages/core/src/plugin/provider/github-copilot.ts:18][E: packages/core/src/plugin/provider/github-copilot.ts:23][E: packages/core/src/plugin/provider/github-copilot.ts:33] Azure plugin 定义 catalog transform、SDK creation 和 language selection hooks。[E: packages/core/src/plugin/provider/azure.ts:17][E: packages/core/src/plugin/provider/azure.ts:44][E: packages/core/src/plugin/provider/azure.ts:46]

Cloudflare Workers AI plugin 定义 catalog transform、`aisdk.sdk`、`aisdk.language`；Cloudflare AI Gateway plugin 定义 `aisdk.sdk`；XAI plugin 定义 `aisdk.sdk` 和 `aisdk.language`。[E: packages/core/src/plugin/provider/cloudflare-workers-ai.ts:13][E: packages/core/src/plugin/provider/cloudflare-workers-ai.ts:37][E: packages/core/src/plugin/provider/cloudflare-ai-gateway.ts:10][E: packages/core/src/plugin/provider/xai.ts:9][E: packages/core/src/plugin/provider/xai.ts:14]

V2 catalog/plugin lifecycle spec 的 status 声明当前 core 选择了 replayable Location-scoped Catalog transforms；option B 进一步说明 plugins register transforms over `Catalog.Editor`，Catalog 从 active transforms rematerializes visible records。[E: specs/v2/catalog-config-plugin-lifecycle.md:3][E: specs/v2/catalog-config-plugin-lifecycle.md:193] Initial load 设计要求 configured plugin install/update 不阻塞 location readiness，slow plugins 后台 activate。[E: specs/v2/catalog-config-plugin-lifecycle.md:214] Tradeoffs 明确说 disablement、source refresh、policy re-evaluation 都是 transform replay operations，deferred plugin activation avoids blocking readiness。[E: specs/v2/catalog-config-plugin-lifecycle.md:316][E: specs/v2/catalog-config-plugin-lifecycle.md:323]

## V1 / V2 对照

| 维度 | V1 server/TUI plugins | V2 PluginV2 |
| --- | --- | --- |
| Hook surface | V1 server callback hook surface 覆盖 config、auth/provider、chat、permission、command、tools、shell 等。[E: packages/plugin/src/index.ts:222][E: packages/plugin/src/index.ts:334] TUI 另有独立 host API/slot surface。[E: packages/plugin/src/tui.ts:581][E: packages/plugin/src/tui.ts:625] | V2 当前 HookSpec 只有 catalog/AISDK 三个 hook。[E: packages/core/src/plugin.ts:23][E: packages/core/src/plugin.ts:28][E: packages/core/src/plugin.ts:38] |
| Loading | Internal server plugins 直接 `plugin(input)`；external plugins resolve/load 可并行，但 apply 顺序执行。[E: packages/opencode/src/plugin/index.ts:166][E: packages/opencode/src/plugin/loader.ts:214][E: packages/opencode/src/plugin/index.ts:215][E: packages/opencode/src/plugin/index.ts:221] | `PluginBoot` 用 Effect service dependencies add built-ins/providers/config plugins。[E: packages/core/src/plugin/boot.ts:77][E: packages/core/src/plugin/boot.ts:112] |
| Lifecycle | V1 server finalizer unsubscribe event listener 并调用 dispose hooks；TUI dispose reverse deactivate。[E: packages/opencode/src/plugin/index.ts:259][E: packages/opencode/src/plugin/index.ts:266][E: packages/opencode/src/plugin/tui/runtime.ts:1036] | V2 add/remove 通过 child scope 管 plugin lifetime。[E: packages/core/src/plugin.ts:110][E: packages/core/src/plugin.ts:174] |

## Design notes

V1 plugin system 优先服务当前 CLI/TUI 扩展面，所以 hook surface 很宽；V2 plugin system 当前把内核扩展集中在 catalog 与 AI SDK 选择/创建上。[E: packages/plugin/src/index.ts:222][E: packages/core/src/plugin.ts:23][I] V2 spec 的 replayable catalog transform 说明 provider/model catalog 可以通过 transform replay 响应配置、认证、source refresh 和 policy 变化；config/auth/source refresh/policy 在 spec 中分别以 transform/replay 流程展示。[E: specs/v2/catalog-config-plugin-lifecycle.md:193][E: specs/v2/catalog-config-plugin-lifecycle.md:246][E: specs/v2/catalog-config-plugin-lifecycle.md:267][E: specs/v2/catalog-config-plugin-lifecycle.md:316]

## Sources

- `packages/opencode/src/plugin/index.ts`
- `packages/opencode/src/plugin/loader.ts`
- `packages/plugin/src/index.ts`
- `packages/opencode/src/plugin/tui/runtime.ts`
- `packages/plugin/src/tui.ts`
- `packages/core/src/plugin.ts`
- `packages/core/src/plugin/boot.ts`
- `packages/core/src/plugin/provider.ts`
- `packages/core/src/plugin/provider/github-copilot.ts`
- `packages/core/src/plugin/provider/azure.ts`
- `packages/core/src/plugin/provider/cloudflare-workers-ai.ts`
- `packages/core/src/plugin/provider/cloudflare-ai-gateway.ts`
- `packages/core/src/plugin/provider/xai.ts`
- `specs/v2/catalog-config-plugin-lifecycle.md`

## Related

- [plugin-api.v1-hooks](../../surface/plugin-api/v1-hooks.md)
- [plugin-api.v2-hooks](../../surface/plugin-api/v2-hooks.md)
- [plugin-api.tui](../../surface/plugin-api/tui.md)
