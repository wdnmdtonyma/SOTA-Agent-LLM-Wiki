---
id: plugin-api.v1-hooks
title: V1 plugin hooks
kind: catalog
tier: T1
v: v1
source: [packages/plugin/src/index.ts, packages/plugin/src/tool.ts, packages/opencode/src/plugin/index.ts, packages/opencode/src/plugin/xai.ts, packages/opencode/src/plugin/cerebras.ts, packages/opencode/src/plugin/azure.ts, packages/opencode/src/plugin/github-copilot/copilot.ts, packages/opencode/src/tool/registry.ts, packages/opencode/src/tool/code-mode.ts, packages/opencode/src/provider/auth.ts, packages/opencode/src/provider/provider.ts, packages/opencode/src/session/llm/request.ts, packages/opencode/src/session/prompt.ts, packages/opencode/src/session/tools.ts, packages/opencode/src/session/compaction.ts, packages/opencode/src/session/processor.ts, packages/opencode/src/tool/shell.ts, packages/opencode/src/server/routes/instance/httpapi/handlers/pty.ts, packages/opencode/src/plugin/pty-environment.ts, packages/opencode/src/agent/agent.ts]
symbols: [Plugin, Hooks, AuthHook, ProviderHook, ToolDefinition, Plugin.Service, XaiAuthPlugin, CerebrasPlugin]
related: [server.plugin-system, plugin-api.tui]
evidence: explicit
status: verified
updated: e207624c48
---

> V1 plugin hooks are Promise-based callbacks returned by `@opencode-ai/plugin` server plugins; opencode loads internal and external plugins into `Plugin.Service`, and `Plugin.trigger()` executes matching hooks sequentially in registration order.

## 能回答的问题

- V1 server plugin entrypoint receives which `PluginInput` fields?
- V1 `Hooks` interface exposes which callback names and signatures?
- Each V1 hook is triggered by which opencode source location?
- Plugin-provided tools and provider/auth extensions enter the runtime through which list/registry path?
- Which declared hook currently lacks an observed trigger point?

## Plugin shape

`PluginInput` contains SDK client, project, directory, worktree, experimental workspace adapter registration, serverUrl and Bun shell `$`.[E: packages/plugin/src/index.ts:56][E: packages/plugin/src/index.ts:65] A V1 server plugin is `Plugin = (input, options?) => Promise<Hooks>`; a module can export `{ id?, server, tui?: never }`.[E: packages/plugin/src/index.ts:74][E: packages/plugin/src/index.ts:76][E: packages/plugin/src/index.ts:79]

`packages/opencode/src/plugin/index.ts` loads built-in plugins first, then external plugins from config, and executes plugin loading sequentially so hook registration order remains deterministic.[E: packages/opencode/src/plugin/index.ts:67][E: packages/opencode/src/plugin/index.ts:170][E: packages/opencode/src/plugin/index.ts:181][E: packages/opencode/src/plugin/index.ts:219][E: packages/opencode/src/plugin/index.ts:224] `Plugin.trigger()` loops through `s.hooks`, skips missing hook functions, and awaits each matching callback with `(input, output)`.[E: packages/opencode/src/plugin/index.ts:284][E: packages/opencode/src/plugin/index.ts:291][E: packages/opencode/src/plugin/index.ts:292][E: packages/opencode/src/plugin/index.ts:293][E: packages/opencode/src/plugin/index.ts:294] The `event` hook is an exception to the `Plugin.trigger()` path because the EventV2 bridge invokes `hook["event"]?.(...)` directly inside the listener.[E: packages/opencode/src/plugin/index.ts:255][E: packages/opencode/src/plugin/index.ts:259]

## Hook catalog

| hook | signature / fields | trigger point |
|---|---|---|
| `dispose` | `() => Promise<void>` [E: packages/plugin/src/index.ts:223] | finalizer calls `hook.dispose?.()` for every loaded hook [E: packages/opencode/src/plugin/index.ts:265][E: packages/opencode/src/plugin/index.ts:270] |
| `event` | `(input: { event: Event }) => Promise<void>` [E: packages/plugin/src/index.ts:224] | EventV2 bridge listener filters same directory and calls `hook["event"]?.({ event })` [E: packages/opencode/src/plugin/index.ts:255][E: packages/opencode/src/plugin/index.ts:259] |
| `config` | `(input: Config) => Promise<void>` [E: packages/plugin/src/index.ts:225] | after plugin load, current config is sent to each `hook.config?.(cfg)` [E: packages/opencode/src/plugin/index.ts:245][E: packages/opencode/src/plugin/index.ts:247] |
| `tool` | record of `ToolDefinition` by tool id [E: packages/plugin/src/index.ts:226][E: packages/plugin/src/tool.ts:45] | `ToolRegistry` iterates `plugin.list()` and pushes `p.tool` definitions into custom tools [E: packages/opencode/src/tool/registry.ts:199][E: packages/opencode/src/tool/registry.ts:201][E: packages/opencode/src/tool/registry.ts:202] |
| `auth` | `AuthHook` with provider, optional loader, oauth/api methods [E: packages/plugin/src/index.ts:88][E: packages/plugin/src/index.ts:91] | `ProviderAuth` indexes `x.auth.provider`; provider resolution also invokes `plugin.auth.loader` for stored auth [E: packages/opencode/src/provider/auth.ts:116][E: packages/opencode/src/provider/auth.ts:120][E: packages/opencode/src/provider/provider.ts:1612][E: packages/opencode/src/provider/provider.ts:1615] |
| `provider` | `ProviderHook` with `id` and optional `models(provider, ctx)` [E: packages/plugin/src/index.ts:214][E: packages/plugin/src/index.ts:216] | V1 provider resolution calls `hook.provider.models(toPublicInfo(provider), { auth })` and rewrites provider models [E: packages/opencode/src/provider/provider.ts:1450][E: packages/opencode/src/provider/provider.ts:1462][E: packages/opencode/src/provider/provider.ts:1463]。`AzureAuthPlugin` 不再实现该 hook，只留 `auth` [E: packages/opencode/src/plugin/azure.ts:54][E: packages/opencode/src/plugin/azure.ts:55] |
| `chat.message` | `(input: { sessionID; agent?; model?; messageID?; variant? }, output: { message; parts })` [E: packages/plugin/src/index.ts:234][E: packages/plugin/src/index.ts:242] | `SessionPrompt` triggers after resolving user message parts [E: packages/opencode/src/session/prompt.ts:999][E: packages/opencode/src/session/prompt.ts:1008] |
| `chat.params` | `(input: { sessionID; agent; model; provider; message }, output: { temperature; topP; topK; maxOutputTokens; options })` [E: packages/plugin/src/index.ts:247][E: packages/plugin/src/index.ts:254] | LLM request construction triggers before stream request parameters are used [E: packages/opencode/src/session/llm/request.ts:114][E: packages/opencode/src/session/llm/request.ts:130] |
| `chat.headers` | `(input: { sessionID; agent; model; provider; message }, output: { headers })` [E: packages/plugin/src/index.ts:257][E: packages/plugin/src/index.ts:259] | LLM request construction triggers after params to let plugins add request headers [E: packages/opencode/src/session/llm/request.ts:134][E: packages/opencode/src/session/llm/request.ts:144]。`CopilotAuthPlugin` 在此写入 `X-GitHub-Api-Version` 与 `X-Interaction-Id = incoming.sessionID` [E: packages/opencode/src/plugin/github-copilot/copilot.ts:363][E: packages/opencode/src/plugin/github-copilot/copilot.ts:364] |
| `permission.ask` | `(input: Permission, output: { status: "ask" | "deny" | "allow" }) => Promise<void>` [E: packages/plugin/src/index.ts:261] | Declared in public type, but this batch found no `plugin.trigger("permission.ask", ...)` call in V1 source [U] |
| `command.execute.before` | `(input: { command; sessionID; arguments }, output: { parts })` [E: packages/plugin/src/index.ts:262][E: packages/plugin/src/index.ts:265] | `SessionPrompt` triggers before command prompt execution [E: packages/opencode/src/session/prompt.ts:1460][E: packages/opencode/src/session/prompt.ts:1461] |
| `tool.execute.before` | `(input: { tool; sessionID; callID }, output: { args })` [E: packages/plugin/src/index.ts:266][E: packages/plugin/src/index.ts:269] | triggered before task tool execution, normal tool execution, MCP resource list/list-templates/read tools, wrapped MCP tool execution, and CodeMode child-tool invocation [E: packages/opencode/src/session/prompt.ts:307][E: packages/opencode/src/session/tools.ts:106][E: packages/opencode/src/session/tools.ts:175][E: packages/opencode/src/session/tools.ts:259][E: packages/opencode/src/session/tools.ts:339][E: packages/opencode/src/session/tools.ts:402][E: packages/opencode/src/tool/code-mode.ts:141][E: packages/opencode/src/tool/code-mode.ts:142] |
| `shell.env` | `(input: { cwd; sessionID?; callID? }, output: { env })` [E: packages/plugin/src/index.ts:270][E: packages/plugin/src/index.ts:272] | triggered by `SessionPrompt` shell command flow, `ShellTool` env construction, PTY create handler, and `PluginPtyEnvironment` service [E: packages/opencode/src/session/prompt.ts:555][E: packages/opencode/src/tool/shell.ts:417][E: packages/opencode/src/server/routes/instance/httpapi/handlers/pty.ts:71][E: packages/opencode/src/plugin/pty-environment.ts:18] |
| `tool.execute.after` | `(input: { tool; sessionID; callID; args }, output: { title; output; metadata })` [E: packages/plugin/src/index.ts:274][E: packages/plugin/src/index.ts:279] | triggered after task tool execution, normal tool execution, MCP resource list/list-templates/read tools, wrapped MCP tool execution, and CodeMode child-tool invocation [E: packages/opencode/src/session/prompt.ts:389][E: packages/opencode/src/session/tools.ts:121][E: packages/opencode/src/session/tools.ts:208][E: packages/opencode/src/session/tools.ts:291][E: packages/opencode/src/session/tools.ts:373][E: packages/opencode/src/session/tools.ts:420][E: packages/opencode/src/tool/code-mode.ts:180][E: packages/opencode/src/tool/code-mode.ts:181] |
| `experimental.chat.messages.transform` | `(input: {}, output: { messages: { info; parts }[] })` [E: packages/plugin/src/index.ts:282][E: packages/plugin/src/index.ts:285] | triggered during compaction and prompt message preparation before model message conversion [E: packages/opencode/src/session/compaction.ts:379][E: packages/opencode/src/session/prompt.ts:1255] |
| `experimental.chat.system.transform` | `(input: { sessionID?; model }, output: { system: string[] })` [E: packages/plugin/src/index.ts:291][E: packages/plugin/src/index.ts:294] | triggered in agent prompt construction and LLM request system construction [E: packages/opencode/src/agent/agent.ts:381][E: packages/opencode/src/session/llm/request.ts:69] |
| `experimental.provider.small_model` | `(input: { provider }, output: { model? })` [E: packages/plugin/src/index.ts:297] | provider default small-model selection calls this hook before fallback priority list [E: packages/opencode/src/provider/provider.ts:1949][E: packages/opencode/src/provider/provider.ts:1950] |
| `experimental.session.compacting` | `(input: { sessionID }, output: { context: string[]; prompt?: string })` [E: packages/plugin/src/index.ts:305][E: packages/plugin/src/index.ts:308] | compaction flow lets plugins inject context or replace compaction prompt [E: packages/opencode/src/session/compaction.ts:373][E: packages/opencode/src/session/compaction.ts:374] |
| `experimental.compaction.autocontinue` | `(input: { sessionID; agent; model; provider; message; overflow }, output: { enabled })` [E: packages/plugin/src/index.ts:316][E: packages/plugin/src/index.ts:325] | compaction flow checks this hook before adding synthetic auto-continue message [E: packages/opencode/src/session/compaction.ts:500][E: packages/opencode/src/session/compaction.ts:501] |
| `experimental.text.complete` | `(input: { sessionID; messageID; partID }, output: { text })` [E: packages/plugin/src/index.ts:327][E: packages/plugin/src/index.ts:330] | session processor triggers at `text-end` before finalizing current text part [E: packages/opencode/src/session/processor.ts:526][E: packages/opencode/src/session/processor.ts:531] |
| `tool.definition` | `(input: { toolID }, output: { description; parameters })` [E: packages/plugin/src/index.ts:334] | `ToolRegistry` triggers while building model-facing tool definitions [E: packages/opencode/src/tool/registry.ts:313][E: packages/opencode/src/tool/registry.ts:318] |

## Built-in xAI auth

`internalPlugins()` 直接 import `XaiAuthPlugin`。[E: packages/opencode/src/plugin/index.ts:22][E: packages/opencode/src/plugin/index.ts:83] 该 hook 的 `auth.provider` 是 `"xai"`，`methods` 只有两项：`type: "oauth"` 的 `SuperGrok Subscription`，以及 `type: "api"` 的 `Manually enter API Key`。[E: packages/opencode/src/plugin/xai.ts:208][E: packages/opencode/src/plugin/xai.ts:307][E: packages/opencode/src/plugin/xai.ts:308][E: packages/opencode/src/plugin/xai.ts:333][E: packages/opencode/src/plugin/xai.ts:334] OAuth 唯一路径是 RFC 8628 device-code：`requestDeviceCode()` 请求 `DEVICE_AUTHORIZATION_URL`，`pollDeviceCodeToken()` 用 `DEVICE_CODE_GRANT_TYPE`（`urn:ietf:params:oauth:grant-type:device_code`）轮询 token。methods 数组里没有第二条 OAuth method，因此不存在 loopback / browser authorization-code 路径；headless / VPS 与本机共用同一条 device flow。[E: packages/opencode/src/plugin/xai.ts:15][E: packages/opencode/src/plugin/xai.ts:16][E: packages/opencode/src/plugin/xai.ts:108][E: packages/opencode/src/plugin/xai.ts:166][E: packages/opencode/src/plugin/xai.ts:297][E: packages/opencode/src/plugin/xai.ts:309][E: packages/opencode/src/plugin/xai.ts:318]

## Built-in Cerebras params

`CerebrasPlugin` 也在 `internalPlugins()` 里注册，不是新的模型可见 tool。[E: packages/opencode/src/plugin/index.ts:23][E: packages/opencode/src/plugin/index.ts:84][E: packages/opencode/src/plugin/cerebras.ts:3] 它只实现 `chat.params`：当 `input.model.api.npm === "@ai-sdk/cerebras"` 且 `output.options.max_completion_tokens` 已设时，把 `output.maxOutputTokens` 清成 `undefined`。[E: packages/opencode/src/plugin/cerebras.ts:5][E: packages/opencode/src/plugin/cerebras.ts:6][E: packages/opencode/src/plugin/cerebras.ts:7][E: packages/opencode/src/plugin/cerebras.ts:8]

## ToolDefinition helper

Plugin tools use `tool({ description, args, execute })`; `args` is a zod raw shape, `execute` receives parsed args plus `ToolContext` and returns `ToolResult`.[E: packages/plugin/src/tool.ts:45][E: packages/plugin/src/tool.ts:48] `ToolContext` gives sessionID, messageID, agent, directory, worktree, abort signal, metadata updater and permission ask helper.[E: packages/plugin/src/tool.ts:3][E: packages/plugin/src/tool.ts:18][E: packages/plugin/src/tool.ts:19] `ToolResult` is either a string or `{ title?, output, metadata?, attachments? }`; attachments are file URLs with mime and optional filename.[E: packages/plugin/src/tool.ts:29][E: packages/plugin/src/tool.ts:36][E: packages/plugin/src/tool.ts:42]

`tool.execute.after` has a narrower public `Hooks` output declaration than some runtime paths. Plugin `ToolResult` allows optional `title`, optional `metadata`, and optional `attachments`; `session/tools.ts` passes the actual tool result or attachment-augmented result into `plugin.trigger("tool.execute.after", ...)`, and CodeMode passes the MCP `CallToolResult` from the child-tool invoke.[E: packages/plugin/src/index.ts:274][E: packages/plugin/src/index.ts:279][E: packages/plugin/src/tool.ts:36][E: packages/plugin/src/tool.ts:42][E: packages/opencode/src/session/tools.ts:111][E: packages/opencode/src/session/tools.ts:112][E: packages/opencode/src/session/tools.ts:114][E: packages/opencode/src/session/tools.ts:121][E: packages/opencode/src/session/tools.ts:124][E: packages/opencode/src/tool/code-mode.ts:180][E: packages/opencode/src/tool/code-mode.ts:183]

## Sources

- packages/plugin/src/index.ts
- packages/plugin/src/tool.ts
- packages/opencode/src/plugin/index.ts
- packages/opencode/src/plugin/xai.ts
- packages/opencode/src/plugin/cerebras.ts
- packages/opencode/src/plugin/azure.ts
- packages/opencode/src/plugin/github-copilot/copilot.ts
- packages/opencode/src/tool/registry.ts
- packages/opencode/src/tool/code-mode.ts
- packages/opencode/src/provider/auth.ts
- packages/opencode/src/provider/provider.ts
- packages/opencode/src/session/llm/request.ts
- packages/opencode/src/session/prompt.ts
- packages/opencode/src/session/tools.ts
- packages/opencode/src/session/compaction.ts
- packages/opencode/src/session/processor.ts
- packages/opencode/src/tool/shell.ts
- packages/opencode/src/server/routes/instance/httpapi/handlers/pty.ts
- packages/opencode/src/plugin/pty-environment.ts
- packages/opencode/src/agent/agent.ts

## 相关

- [Plugin system](../../subsystems/server/plugin-system.md)
- [TUI plugin API](tui.md)
