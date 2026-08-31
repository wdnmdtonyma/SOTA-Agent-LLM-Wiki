# Extra architecture facts for wiki fillers (`0a53fb55be`)

Target SHA: `0a53fb55be` (`0.1.2-alpha.2`). Paths and `[E:]` lines are relative to `deepseek-harness/`. These facts are for rewriting existing wiki nodes in place. Do **not** treat this file as `[E]`. Do **not** keep `packages/host/apiproxy/**`, `packages/client/runtime/**`, `packages/client/web-react/**`, or `packages/core/tools/src/code-mode.ts` in `source:` / `[E:]`.

Stable node ids that stay (titles/source change): `subsys.core.code-mode`, `surface.presets.code`, `subsys.host.apiproxy`, `subsys.client.runtime`.

## Packages gone (confirmed)

`packages/host/apiproxy/` does not exist (no `package.json`, no directory). `packages/client/runtime/` does not exist (no `package.json`, no directory). `packages/client/web-react/` does not exist. Workspace `pnpm-workspace.yaml` is `packages/*/*` plus apps/vendor/native; neither `apiproxy` nor `client/runtime` is a current package.

Do not confuse `@deepseek-ai/dsh-client-test-runtime` (`packages/test-support/client-runtime`) with the deleted `@deepseek-ai/dsh-client-runtime`. Invariants README still mentions the old family name `dsh-client-runtime`; that is stale prose, not a live package.

---

## PTC

PTC is the current name of the old Code Mode transport. The authority file is `packages/core/tools/src/ptc.ts` (not `code-mode.ts`). Model-facing tool name is `run_code`. [E: packages/core/tools/src/ptc.ts:20]

Shipped SDK languages are `'typescript' | 'python'`. [E: packages/core/tools/src/ptc.ts:79] Flavor table and SDK renderer table are pinned to that union. [E: packages/core/tools/src/ptc.ts:82] [E: packages/core/tools/src/index.ts:53]

Presentation modes: `'native' | 'ptc' | 'both'`. [E: packages/core/tools/src/index.ts:644] Config default is `'native'`. [E: packages/core/tools/src/index.ts:784] `maxParallelSubCalls` default is `10`. [E: packages/core/tools/src/index.ts:785]

Mode semantics:

- `native`: every visible schema is sent; no `run_code` transport is inserted. [E: packages/core/tools/src/index.ts:975]
- `ptc`: wire schemas collapse to only `run_code`; `knownNames` is `[RUN_CODE_NAME]`. [E: packages/core/tools/src/index.ts:986]
- `both`: native schemas plus the reserved transport; `knownNames` appends `run_code`. [E: packages/core/tools/src/index.ts:992]

`run_code` is reserved presentation infrastructure, not a filterable capability. Registration of that name throws. [E: packages/core/tools/src/index.ts:1045] `tools.restrict()` cannot name it. [E: packages/core/tools/src/index.ts:1076] The visibility resolver inserts the transport last, and only when `modeFor(scope) !== 'native'`. [E: packages/core/tools/src/index.ts:1180]

Executor collapse: a **model-direct** call under effective `ptc` may only name `run_code`. Nested SDK sub-dispatches (`parent` token set) may call any visible tool. The predicate uses `modeFor(scope)`, not the deployment default. [E: packages/core/tools/src/index.ts:1316] A collapsed direct call is denied **before** the policy pipeline as `UNKNOWN_TOOL`, with a route string telling the model to call the name from inside `run_code`. [E: packages/core/tools/src/index.ts:1430] [E: packages/core/tools/src/index.ts:1432] A preset that `presentAs('ptc')` under a native deployment is still collapsed. [E: packages/core/tools/src/index.ts:938]

Prompt: under a non-native default, the registry registers `tools:ptc-only` and `tools:sdk`. [E: packages/core/tools/src/index.ts:826] `tools:ptc-only` renders only when the calling scope's mode is `'ptc'`; `both` leaves it empty because native calls do execute. [E: packages/core/tools/src/index.ts:853] Instruction text: `` `run_code` is the only tool you can call directly ``. [E: packages/core/tools/src/index.ts:51]

Sub-dispatch path: `createRunCodeTool` binds every visible schema except `run_code` onto a `tools` global. [E: packages/core/tools/src/ptc.ts:611] Each binding re-enters `TOOL_RUNTIME_SCHEDULER` (`prepare` / `dispatch` / `finalize` or `finish`). [E: packages/core/tools/src/ptc.ts:480] Nested input sets `parent: exec.token`. [E: packages/core/tools/src/ptc.ts:476] Sub-call ids are `<parentCallId>:code:<n>`. [E: packages/core/tools/src/ptc.ts:469] The inner scheduler follows native concurrency: only `isConcurrencySafe === true` overlaps, up to `maxParallel`; exclusive calls are barriers through commit. [E: packages/core/tools/src/ptc.ts:419]

Durable log (not model history): start event `tool/code-dispatch-start`, settle event `tool/code-dispatch`. [E: packages/core/tools/src/types.ts:40] [E: packages/core/tools/src/types.ts:56] Settle content may be reshaped by `tools/ptc-dispatch-log` for the **logged copy only**; the program already received the full value. [E: packages/core/tools/src/index.ts:181] Image-bearing nested results are deferred as plugin context with source plugin id `'tools-code-mode'` (legacy string; file is `ptc.ts`). [E: packages/core/tools/src/ptc.ts:564]

Program failure class is `CodeRunFailedError` / `CODE_RUN_FAILED`. [E: packages/core/tools/src/ptc.ts:140] `presentCall` uses the model-authored `description` as the UI title. [E: packages/core/tools/src/ptc.ts:650]

Wiki: keep node id `subsys.core.code-mode`; retitle to PTC; remap `source:` from `code-mode.ts` to `ptc.ts`. Preset directory `presets/ptc/` is the old `code` preset (`surface.presets.code` id stays).

---

## AgentTeams

Experimental implicit-root Teams. Host service is `ctx.agentTeams` / `TeamService`. [E: packages/experimental/agent-team/src/index.ts:40] Package `@deepseek-ai/dsh-experimental-agent-team`. [E: packages/experimental/agent-team/package.json:2] Injects `agents`, `sessions`, `sessionPersistence`, `sessionProjections`, `subagents`. [E: packages/experimental/agent-team/src/index.ts:60]

One Team is rooted at one ordinary top-level Session. `TeamId` is the branded Lead Session id. [E: packages/experimental/agent-team/src/types.ts:16] Membership: Lead is any live root (or a child that is not a rostered teammate / subagent); teammates are durable roster children of that Lead. [E: packages/experimental/agent-team/src/roster.ts:91]

Internal owners composed by `TeamService`: `TeamActivity`, `TeamRuntimeLifecycle`, `TeamJournal`, `TeamRoster`, `TeamMailbox`, `TeamTaskBoard`. [E: packages/experimental/agent-team/src/index.ts:96]

Defaults: `maxMembers=8`, `maxTasks=256`, `maxPendingMessagesPerMember=64`, `maxMessageBytes=65536`, `disposalTimeoutMs=5000`. [E: packages/experimental/agent-team/src/index.ts:44]

Durability: Team mutations append to the **Lead** Session log, then `sessions.flush`. [E: packages/experimental/agent-team/src/journal.ts:69] Event types: `team/member`, `team/task`, `team/message/queued`, `team/message/delivered`. [E: packages/experimental/agent-team/src/types.ts:223] Host projection key is `'agentTeam'`, `stateVersion: 2`. [E: packages/experimental/agent-team/src/projection.ts:309]

Roster: teammates are continuable subagent children via `ctx.subagents.startContinuable`. [E: packages/experimental/agent-team/src/roster.ts:281] Spawn is Lead-only. [E: packages/experimental/agent-team/src/roster.ts:250] Interrupt is Lead-only; it samples status then `subagents.interrupt(..., { kind: 'ancestor' })` and does not drain the inbox. [E: packages/experimental/agent-team/src/roster.ts:205] [E: packages/experimental/agent-team/src/roster.ts:212]

Mailbox: `send_message` is `delivery: 'quiet'` (inject, do not start an idle member). `followup_task` is `delivery: 'wakeup'` (`followup` / `subagents.followup`). [E: packages/experimental/tool-agent-team/src/index.ts:222] [E: packages/experimental/agent-team/src/mailbox.ts:243] Quiet delivery to a missing live target returns queued (`false`) rather than starting the member. [E: packages/experimental/agent-team/src/mailbox.ts:250] Wakeup of a missing live teammate uses `subagents.followup`. [E: packages/experimental/agent-team/src/mailbox.ts:263] A successful send is already durable even when status is `'queued'`. [E: packages/experimental/agent-team/src/mailbox.ts:151] Message source kind is `'team-message'`. [E: packages/experimental/agent-team/src/types.ts:117]

Task board: unowned pending create; CAS update via `expectedRevision`. Actions: `claim | release | edit | set_dependencies | complete | reopen | reassign | delete`. [E: packages/experimental/agent-team/src/types.ts:183] Write scopes are advisory overlap warnings, not locks. [E: packages/experimental/tool-agent-team/src/index.ts:33]

Wait: service `waitForChange` only returns `{ timedOut }`. [E: packages/experimental/agent-team/src/types.ts:217] Timeout must be a safe integer in `[10000, 3600000]`. [E: packages/experimental/agent-team/src/activity.ts:23] The **tool** `wait_agent` adds a model-only `noProgress` shortcut when no other member is `running` or `provisioning`; that shortcut never calls the service wait. [E: packages/experimental/tool-agent-team/src/index.ts:255]

Typert Remote (browser): `view`, `createTask`, `updateTask`. [E: packages/experimental/agent-team/src/index.ts:242] [E: packages/experimental/agent-team/src/index.ts:256] [E: packages/experimental/agent-team/src/index.ts:267] Task rejections become `{ ok: false, error: { code: 'team-task-conflict' | 'team-rejected' } }`. [E: packages/experimental/agent-team/src/index.ts:281]

Opt-in composition:

- Host profile `@deepseek-ai/dsh-experimental-agent-team-profile` **disables** global `tool-subagent-control`, `tool-subagent-list-agents`, `tool-subagent-report` (name overlap with Team tools), keeps one-shot `subagent` / `subagent_fork`, inserts `agent-team` + `tool-agent-team`. [E: packages/experimental/agent-team-profile/cordis.patch.yml:5]
- Web profile inserts `@deepseek-ai/dsh-experimental-client-ui-agent-team`. [E: packages/experimental/agent-team-web-profile/cordis.patch.yml:6] That UI package's host `apply()` is empty. [E: packages/experimental/client-ui-agent-team/src/index.ts:4]

Tool plugin `@deepseek-ai/dsh-experimental-tool-agent-team` installs **only in exact Agent scopes that have Team membership**, on `agent/created`, and tears down on `agent/disposed`. [E: packages/experimental/tool-agent-team/src/index.ts:405] [E: packages/experimental/tool-agent-team/src/index.ts:409] [E: packages/experimental/tool-agent-team/src/index.ts:410] Fresh/fork providers default `spawn` / `fork`. [E: packages/experimental/tool-agent-team/src/index.ts:26]

### Model-visible tool names from `tool-agent-team`

Complete list (every `defineTool({ name: ... })` in `install()`). No other model-facing names are registered by this plugin.

| Tool name | Notes |
|---|---|
| `spawn_teammate` | Lead only; `context` `fresh`\|`fork` [E: packages/experimental/tool-agent-team/src/index.ts:174] |
| `send_message` | quiet delivery [E: packages/experimental/tool-agent-team/src/index.ts:222] |
| `followup_task` | wakeup delivery [E: packages/experimental/tool-agent-team/src/index.ts:223] |
| `list_agents` | Lead + teammates [E: packages/experimental/tool-agent-team/src/index.ts:227] |
| `wait_agent` | never wakes; may return `noProgress` [E: packages/experimental/tool-agent-team/src/index.ts:237] |
| `interrupt_agent` | Lead only [E: packages/experimental/tool-agent-team/src/index.ts:272] |
| `team_task_create` | [E: packages/experimental/tool-agent-team/src/index.ts:287] |
| `team_task_list` | [E: packages/experimental/tool-agent-team/src/index.ts:310] |
| `team_task_get` | [E: packages/experimental/tool-agent-team/src/index.ts:343] |
| `team_task_update` | CAS; actions listed above [E: packages/experimental/tool-agent-team/src/index.ts:358] |

Also registers system-prompt section `team:policy`. [E: packages/experimental/tool-agent-team/src/index.ts:165] That is not a tool.

---

## Webhook

Provider-neutral runtime `@deepseek-ai/dsh-webhook`, service `ctx.webhookRuntime` / `WebhookRuntime`. [E: packages/webhook/webhook/src/index.ts:15] Fire-and-forget: `dispatch()` starts matching rules and returns before callbacks settle. [E: packages/webhook/webhook/src/index.ts:126] The only runtime action is `createWebhookSession` when a rule returns a request. [E: packages/webhook/webhook/src/index.ts:142]

Inject: `agents`, `agentDefaultModel`, `agentPresets`, `permissionPresets`, `sessionTitle`, `workspaceRegistry`. [E: packages/webhook/webhook/src/index.ts:59]

`register(rule)` is effect-scoped; duplicate id throws. [E: packages/webhook/webhook/src/index.ts:108] `dispatch` snapshots the delivery (lossless JSON), then starts every live rule whose `kind` matches. [E: packages/webhook/webhook/src/index.ts:129] A rule `run()` returning `null` is a no-op; a `WebhookSessionRequest` calls `createWebhookSession`. [E: packages/webhook/webhook/src/index.ts:141]

Session request fields: absolute `workspacePath`, `title`, `prompt`, `agentPreset`, `permissionPreset`, optional `model`. [E: packages/webhook/webhook/src/types.ts:38] Omitted model uses `ctx.agentDefaultModel.currentSelection()`. [E: packages/webhook/webhook/src/session.ts:64] Created Session id is `webhook-${randomUUID()}`. [E: packages/webhook/webhook/src/session.ts:135] Prompt is admitted with `followup` and source kind `'webhook'`, `form: 'notice'`. [E: packages/webhook/webhook/src/session.ts:155] [E: packages/webhook/webhook/src/session.ts:158] [E: packages/webhook/webhook/src/session.ts:163]

GitHub adapter `@deepseek-ai/dsh-webhook-github` registers an **exact** `webServer` route. [E: packages/webhook/webhook-github/src/index.ts:50] Inject: `webServer`, `webhookRuntime`, `credentials`. [E: packages/webhook/webhook-github/src/index.ts:14] Handler: POST + `application/json` only; bounded UTF-8 body; requires `x-hub-signature-256`, `x-github-delivery`, `x-github-event`; verifies with Octokit `Webhooks.verify`; then `webhookRuntime.dispatch` and answers **202 before rule settlement**. [E: packages/webhook/webhook-github/src/handler.ts:115] [E: packages/webhook/webhook-github/src/handler.ts:120] Delivery `kind` is `'github'`. [E: packages/webhook/webhook-github/src/handler.ts:108] Failed signature is 401. [E: packages/webhook/webhook-github/src/handler.ts:105] Missing secret is 503. [E: packages/webhook/webhook-github/src/handler.ts:97] Dispatch while the runtime is unavailable is 503. [E: packages/webhook/webhook-github/src/handler.ts:118]

---

## ClientHostApiRemaps

Old BFF package `packages/host/apiproxy` is gone. Host HTTP API is three Typert Remote owners plus the still-living webserver/gateway:

| Concern | Live package | ctx / namespace |
|---|---|---|
| Session commands, cold list/search, history follow, live control | `@deepseek-ai/dsh-api-session-controller` [E: packages/api/session-controller/package.json:2] | `ctx.sessionController`, Remote namespace `'session'` [E: packages/api/session-controller/src/index.ts:62] [E: packages/api/session-controller/src/index.ts:115] |
| Settings + credentials | `@deepseek-ai/dsh-api-settings-controller` [E: packages/api/settings-controller/package.json:2] | `ctx.settingsController`, namespace `'settings'`; mounts `CredentialsController` [E: packages/api/settings-controller/src/index.ts:77] [E: packages/api/settings-controller/src/index.ts:107] |
| Workspace commands + follow | `@deepseek-ai/dsh-api-workspace-controller` [E: packages/api/workspace-controller/package.json:2] | `ctx.workspaceController`, namespace `'workspace'` [E: packages/api/workspace-controller/src/index.ts:29] [E: packages/api/workspace-controller/src/index.ts:42] |
| node:http routes / gzip / index inject | `@deepseek-ai/dsh-host-webserver` [E: packages/host/webserver/package.json:2] | `ctx.webServer` [E: packages/host/webserver/src/index.ts:24] |
| Typert Remote HTTP/WS mux | `@deepseek-ai/dsh-api-gateway` [E: packages/api/gateway/package.json:2] | `TypertGatewayService` [E: packages/api/gateway/src/index.ts:169] |
| SPA dist fallback | `@deepseek-ai/dsh-host-frontend-static` | claims `webServer` fallback [E: packages/host/frontend-static/src/index.ts:27] |

Do not write `ctx.apiProxy` / `ApiProxy`. Session Controller emits `api-session/added|removed|status|error|activity` (Remote Event selection). [E: packages/api/session-controller/src/remote-events.ts:2] [E: packages/api/session-controller/src/index.ts:137]

Session Host Remote verbs (authoritative list): `list`, `search`, `create`, `selectModel`, `modelCatalog`, `canOpenWorkspacePath`, `openWorkspacePath`, `rename`, `fork`, `prompt`, `attachment`, `updateQueue`, `cancel`, `page`, stream `follow`, stream `control`. [E: packages/api/session-controller/src/index.ts:208] [E: packages/api/session-controller/src/index.ts:374]

Workspace Host Remote verbs: `create`, `rename`, `delete`, `insertBefore`, `insertSessionBefore`, `archiveSession`, stream `follow`. [E: packages/api/workspace-controller/src/index.ts:57] [E: packages/api/workspace-controller/src/index.ts:117]

Settings Host Remote verbs include `describe` (always `redactSecrets: true`), `update`, `replace`, `mutate`, `canOpenAgentPresetDirectory`. [E: packages/api/settings-controller/src/index.ts:118] [E: packages/api/settings-controller/src/index.ts:122] [E: packages/api/settings-controller/src/index.ts:131]

`WebServer` is a node:http route registrar; it serves no files and the composing app owns dist. [E: packages/host/webserver/package.json:3] Listen host is only `'127.0.0.1' | '0.0.0.0'`. [E: packages/host/webserver/src/index.ts:61] Duplicate named routes throw; one fallback seat. [E: packages/host/webserver/src/index.ts:168] [E: packages/host/webserver/src/index.ts:197]

Old `packages/client/runtime` is gone. Split:

| Old runtime concern | Live path |
|---|---|
| Snapshot store engine (zustand vanilla + immer, no React hook) | `@deepseek-ai/dsh-client-store` [E: packages/client/store/package.json:3] `defineStore` [E: packages/client/store/src/index.ts:217] |
| Slot contracts / `SlotMap` | still `@deepseek-ai/dsh-client-ui-slots`; imports store types from `dsh-client-store` [E: packages/client/ui-slots/src/index.ts:18] |
| Slot renderer + `ctx.uiRenderer.mount` | `@deepseek-ai/dsh-client-ui-renderer` **client** entry [E: packages/client/ui-renderer/src/client/index.ts:88] Host `apply()` is a no-op [E: packages/client/ui-renderer/src/index.ts:4] Assembled app is `ctx.slots.renderSlot('root', {})` [E: packages/client/ui-renderer/src/client/app.tsx:21] |
| Client Session object layer, Agent scopes, control stream | `packages/api/session-controller/src/client/` [E: packages/api/session-controller/src/client/index.ts:88] installs `ctx.sessions` [E: packages/api/session-controller/src/client/index.ts:70] |
| Client Workspace object layer | `packages/api/workspace-controller/src/client/` [E: packages/api/workspace-controller/src/client/index.ts:33] |
| Web boot kernel | `packages/client/web/src/boot.ts` (`AppWebEntry`), not a guessed `boot.tsx` [E: packages/client/web/src/boot.ts:22] After loader quiescence, `ctx.inject(['uiRenderer'], ... mount(container))` [E: packages/client/web/src/boot.ts:97] |

Old `packages/client/web-react` is gone; do not cite it. Session client `apply` requires `typert`, `remote`, `remote.commands`, `remote.session`, `remote.subagents`, and starts `createSessionControlStream`. [E: packages/api/session-controller/src/client/index.ts:76] [E: packages/api/session-controller/src/client/index.ts:107] Store contract: `StoreInstance` is a snapshot source plus baked actions; the engine store is a framework/test API components never see. [E: packages/client/store/src/index.ts:180]

Wiki: rewrite `subsys.host.apiproxy` as Host HTTP API (three controllers + webserver). Rewrite `subsys.client.runtime` as store + session-controller client + ui-renderer + `client/web` boot. Keep those node ids.

---

## NewTools

### Persistent `pwsh`

Package `@deepseek-ai/dsh-tool-pwsh-persistent`. [E: packages/shell/tool-pwsh-persistent/package.json:2] Cordis name `tool-pwsh-persistent`. [E: packages/shell/tool-pwsh-persistent/src/index.ts:468] Inject `tools`, `terminals`. [E: packages/shell/tool-pwsh-persistent/src/index.ts:469] Model-visible tool name is **`pwsh`** (not `pwsh-persistent`). [E: packages/shell/tool-pwsh-persistent/src/index.ts:442]

Owner-scoped persistent PTY tool over `ctx.terminals`, serialized per agent, counterpart to `tool-bash-persistent`'s `bash`. [E: packages/shell/tool-pwsh-persistent/src/index.ts:469] [E: packages/shell/tool-pwsh-persistent/src/index.ts:429] Defaults: `backendType: 'shell'`, `timeoutMs: 300_000`, `maxOutputChars: 16_000`. [E: packages/shell/tool-pwsh-persistent/src/index.ts:484] Parameter: required `command` string. [E: packages/shell/tool-pwsh-persistent/src/index.ts:445] Requires `exec.agent`. [E: packages/shell/tool-pwsh-persistent/src/index.ts:458] `presentCall` is a terminal card titled with the command. [E: packages/shell/tool-pwsh-persistent/src/index.ts:464]

Wrapper uses `Invoke-Expression` plus START/END markers; PSReadLine-safe quoting. [E: packages/shell/tool-pwsh-persistent/src/index.ts:91] Owner-scoped spawn via `ctx.terminals.spawn`. [E: packages/shell/tool-pwsh-persistent/src/index.ts:298] Timeout/abort/exit reset the shell and tell the model the next call starts fresh. [E: packages/shell/tool-pwsh-persistent/src/index.ts:19]

Wiki surface node already exists as `surface/tools/pwsh.md`; retarget evidence to this package (one-shot `pwsh` vs persistent `pwsh` must not be conflated).

### Agent Teams tools

See AgentTeams. Package `@deepseek-ai/dsh-experimental-tool-agent-team`. [E: packages/experimental/tool-agent-team/package.json:2] Opt-in; not in `dsh-base` unless the experimental profile is applied.

### DeepSeek official request extensions + incremental session log

`@deepseek-ai/dsh-deepseek-llm-api-extensions`: `ctx.deepseekLlmApiExtensions` registry of independently owned top-level request fields. [E: packages/llm/deepseek-llm-api-extensions/src/index.ts:19] `register(field, provider)` is effect-scoped; duplicate field throws. [E: packages/llm/deepseek-llm-api-extensions/src/index.ts:91] `prepare(request)` clones/freezes field values; `accept()` is the joint post-2xx commit. [E: packages/llm/deepseek-llm-api-extensions/src/index.ts:108]

`@deepseek-ai/dsh-session-log-deepseek` contributes field `dsh_session_log` when `enabled: true` (default **false**). [E: packages/session/session-log-deepseek/src/index.ts:24] [E: packages/session/session-log-deepseek/src/index.ts:72] Suffix is events after `acceptedThrough(session)` (watermark event `session-log-deepseek/delivery-accepted`). [E: packages/session/session-log-deepseek/src/index.ts:79] [E: packages/session/session-log-deepseek/src/index.ts:52] On HTTP accept, appends that watermark. [E: packages/session/session-log-deepseek/src/index.ts:94] Direct/stale-session requests with no `sessionId` contribute nothing. [E: packages/session/session-log-deepseek/src/index.ts:75]

---

## Composition

### Five shipped profiles and `patchReload`

`PROFILE_TEMPLATES` has **five** first-use auto-init names. There is no sixth shipped template and no TUI template. [E: packages/boot/app-boot/src/profile.ts:137]

| profile | `dsh.profile.bundles` | `patchReload` |
|---|---|---|
| `acp` | `@deepseek-ai/dsh-base`, `@deepseek-ai/dsh-acp-app` | `startup` [E: packages/boot/app-boot/src/profile.ts:138] [E: packages/boot/app-boot/src/profile.ts:140] |
| `web` | `@deepseek-ai/dsh-base`, `@deepseek-ai/dsh-web-app` | **`live`** — the only shipped live template [E: packages/boot/app-boot/src/profile.ts:142] [E: packages/boot/app-boot/src/profile.ts:144] |
| `headless` | `@deepseek-ai/dsh-base`, `@deepseek-ai/dsh-headless` | `startup` [E: packages/boot/app-boot/src/profile.ts:146] [E: packages/boot/app-boot/src/profile.ts:148] |
| `sdk` | `@deepseek-ai/dsh-base`, `@deepseek-ai/dsh-sdk-app` | `startup` [E: packages/boot/app-boot/src/profile.ts:150] [E: packages/boot/app-boot/src/profile.ts:152] |
| `sdk-minimal` | `@deepseek-ai/dsh-sdk-minimal` **only** | `startup` [E: packages/boot/app-boot/src/profile.ts:154] [E: packages/boot/app-boot/src/profile.ts:155] [E: packages/boot/app-boot/src/profile.ts:156] |

`ProfilePatchReload` is `'live' | 'startup'`. [E: packages/boot/app-boot/src/profile.ts:64] A malformed value fail-louds in `loadProfile`. [E: packages/boot/app-boot/src/profile.ts:823]

Custom / unknown profile names are **not** in `PROFILE_TEMPLATES`. First `dsh --profile <unknown>` fail-louds unless the directory already exists; `dsh plugin --profile <unknown> add …` inits with `DEFAULT_PROFILE_BUNDLES = ['@deepseek-ai/dsh-base']` and `DEFAULT_PROFILE_PATCH_RELOAD = 'live'`. [E: packages/boot/app-boot/src/profile.ts:166] [E: packages/boot/app-boot/src/profile.ts:169] [E: packages/boot/app-boot/src/profile.ts:812] [E: apps/cli/src/plugin.ts:123] [E: apps/cli/src/plugin.ts:126]

`loadProfile` copies the template's `bundles` **and** `patchReload` on first open. [E: packages/boot/app-boot/src/profile.ts:817] If the written manifest later omits `patchReload`, the loader falls back to `'live'` (the custom default), not the template value. [E: packages/boot/app-boot/src/profile.ts:828]

`runProfile` watches user patch files **only** when `composed.profile.patchReload === 'live'`. [E: apps/cli/src/profile-boot.ts:270] That path installs a watch-only HMR row (`root: []`) if none exists, then `watchUserPatches` on the profile `cordis.patch.yml` **and** `$DSH_HOME/cordis.patch.yml`. [E: apps/cli/src/profile-boot.ts:285] [E: apps/cli/src/profile-boot.ts:287] [E: apps/cli/src/profile-boot.ts:292] [E: packages/boot/app-boot/src/index.ts:235] `startup` profiles still apply those layers once at boot; they do not install the watchers.

Live recomposition order (frozen bundle layers below, frozen `--patch`/telemetry overlays above, re-read user files in the middle): bundle patches → profile `cordis.patch.yml` → home `cordis.patch.yml` → overlays. [E: apps/cli/src/profile-boot.ts:243] Boot-time `allPatches` is the same four slices. [E: apps/cli/src/profile-boot.ts:137]

Retired-tuple heal: an existing `headless` directory whose bundles are still `dsh-base` + `dsh-web-app` + `dsh-headless` is rewritten to the current two-bundle template. Fillers must **not** claim current `headless` stacks `dsh-web-app`. [E: packages/boot/app-boot/src/profile.ts:162] [E: packages/boot/app-boot/src/profile.ts:726]

### Six bundles; `sdk-minimal` does not stack `dsh-base`

Six packages under `packages/bundle/` declare `dsh.bundle.patch: ./cordis.patch.yml`:

| dir | package name | stacked on `dsh-base`? |
|---|---|---|
| `base/` | `@deepseek-ai/dsh-base` [E: packages/bundle/base/package.json:2] | is the base insert [E: packages/bundle/base/package.json:38] |
| `web-app/` | `@deepseek-ai/dsh-web-app` [E: packages/bundle/web-app/package.json:2] | yes (web template) [E: packages/bundle/web-app/package.json:43] |
| `headless/` | `@deepseek-ai/dsh-headless` [E: packages/bundle/headless/package.json:2] | yes [E: packages/bundle/headless/package.json:43] |
| `sdk-app/` | `@deepseek-ai/dsh-sdk-app` [E: packages/bundle/sdk-app/package.json:2] | yes [E: packages/bundle/sdk-app/package.json:38] |
| `sdk-minimal/` | `@deepseek-ai/dsh-sdk-minimal` [E: packages/bundle/sdk-minimal/package.json:2] | **no** [E: packages/bundle/sdk-minimal/package.json:38] |
| `acp-app/` | `@deepseek-ai/dsh-acp-app` [E: packages/bundle/acp-app/package.json:2] | yes [E: packages/bundle/acp-app/package.json:38] |

`sdk-minimal` is the exception: its template `bundles` array does not contain `@deepseek-ai/dsh-base`. [E: packages/boot/app-boot/src/profile.ts:155] Its patch file is a **complete** `insert` (startup + JSON-RPC + DeepSeek adapter + sandbox/pty/fs + `dsh-agent-spine-demo` + persistent shell + editor + JSONL sessions), not an overlay of base row ids. [E: packages/bundle/sdk-minimal/cordis.patch.yml:5] [E: packages/bundle/sdk-minimal/cordis.patch.yml:73]

Who mounts the agent-preset roster:

- **web only** among the five shipped profiles. After disabling the base agent-plane tool rows, web inserts `id: agent-presets` / `@deepseek-ai/dsh-agent-presets` with `default: standard`. [E: packages/bundle/web-app/cordis.patch.yml:442] [E: packages/bundle/web-app/cordis.patch.yml:443] [E: packages/bundle/web-app/cordis.patch.yml:445]
- headless overlay insert is `code-runtime` + `headless-startup` + `headless-runner` — no `agent-presets` row. [E: packages/bundle/headless/cordis.patch.yml:19] [E: packages/bundle/headless/cordis.patch.yml:22] [E: packages/bundle/headless/cordis.patch.yml:26]
- sdk overlay insert is `sdk-app-startup` + `sdk-jsonrpc-server`. [E: packages/bundle/sdk-app/cordis.patch.yml:12] [E: packages/bundle/sdk-app/cordis.patch.yml:17]
- acp overlay insert is `acp-app-startup` + `acp`. [E: packages/bundle/acp-app/cordis.patch.yml:12] [E: packages/bundle/acp-app/cordis.patch.yml:15]
- sdk-minimal uses `agent-spine-demo`, not the roster. [E: packages/bundle/sdk-minimal/cordis.patch.yml:73]

Headless / sdk / acp therefore run the **base** host-plane tool rows (not disabled by those overlays). Web is the surface that moves tools/persona behind presets.

Default model on base-backed profiles remains `provider: deepseek-official` / `model: deepseek-v4-flash`. [E: packages/bundle/base/cordis.patch.yml:78] [E: packages/bundle/base/cordis.patch.yml:79] ACP restates the same pair on its `acp` row. [E: packages/bundle/acp-app/cordis.patch.yml:19] [E: packages/bundle/acp-app/cordis.patch.yml:20]

### Four shipped presets (`ptc`, not `code`) and isolate rules

Shipped directory names (package-internal `SHIPPED_PRESET_ROOT`): `minimal` / `standard` / `ptc` / `cordis`. [E: packages/preset/agent-presets/src/discovery.ts:60] There is **no** `packages/preset/agent-presets/presets/code/` tree. Composition file is `agent.cordis.yml`; optional display metadata is `preset.yml`. [E: packages/preset/agent-presets/src/discovery.ts:37] [E: packages/preset/agent-presets/src/metadata.ts:25] User-authored presets live under `$DSH_HOME/.agent-presets`. [E: packages/preset/agent-presets/src/discovery.ts:51]

| id | `preset.yml` name | `order` |
|---|---|---|
| `standard` | 标准模式 | 1 [E: packages/preset/agent-presets/presets/standard/preset.yml:1] [E: packages/preset/agent-presets/presets/standard/preset.yml:3] |
| `ptc` | PTC 模式 | 2 [E: packages/preset/agent-presets/presets/ptc/preset.yml:1] [E: packages/preset/agent-presets/presets/ptc/preset.yml:3] |
| `minimal` | 极简模式 | 3 [E: packages/preset/agent-presets/presets/minimal/preset.yml:1] [E: packages/preset/agent-presets/presets/minimal/preset.yml:3] |
| `cordis` | 创造模式 | 4 [E: packages/preset/agent-presets/presets/cordis/preset.yml:1] [E: packages/preset/agent-presets/presets/cordis/preset.yml:3] |

Wiki node ids `surface.presets.code` and `subsys.core.code-mode` stay as **stable aliases**; titles/source/body must say PTC / `presets/ptc/` / `packages/core/tools/src/ptc.ts`. Do not write `apps/cli/config/agent-presets/code/`. CLI `files` no longer ships a `config/` tree; shipped compositions live under this package's `presets/` directory. [E: apps/cli/package.json:17] [E: packages/preset/agent-presets/src/discovery.ts:60]

Roster root order: shipped `system` root first (if `includeShippedRoot`, default `true`), then configured `roots`, then user root (if `includeUserRoot`, default `true`). Earlier root wins a duplicate id. [E: packages/preset/agent-presets/src/index.ts:110] [E: packages/preset/agent-presets/src/index.ts:179] [E: packages/preset/agent-presets/src/index.ts:181] Web's row does not restate those flags; schema defaults apply, and it only sets `default: standard`. [E: packages/bundle/web-app/cordis.patch.yml:445]

Isolate enforcement (not optional documentation):

1. `mountPreset` refuses an unscoped context. [E: packages/preset/agent-presets/src/mount.ts:382]
2. After the subtree settles, `leakedServices` lists names this mount published into the **root** isolate symbol. Non-empty → throw: a preset service must sit behind an `isolate` realm or move to the host composition. [E: packages/preset/agent-presets/src/mount.ts:210] [E: packages/preset/agent-presets/src/mount.ts:221] [E: packages/preset/agent-presets/src/mount.ts:407] [E: packages/preset/agent-presets/src/mount.ts:411]
3. The invariant companion re-checks every live mount on `internal/service` so a late `provide` cannot escape the one-shot audit. [E: packages/preset/agent-presets/src/invariant.ts:34] [E: packages/preset/agent-presets/src/invariant.ts:41]

A provider **without** `isolate` stores under the root symbol (leak). A provider **inside** `isolate` stores under a realm-private symbol and is absent from `leakedServices`. [E: packages/preset/agent-presets/src/mount.ts:221] Rows that only register into a host registry (tools, skills, commands) need no realm.

Shipped isolate maps:

- `minimal`: group `persistent-shell` `isolate.terminals`; group `filesystem` `isolate.fs`. [E: packages/preset/agent-presets/presets/minimal/agent.cordis.yml:24] [E: packages/preset/agent-presets/presets/minimal/agent.cordis.yml:25] [E: packages/preset/agent-presets/presets/minimal/agent.cordis.yml:77] [E: packages/preset/agent-presets/presets/minimal/agent.cordis.yml:78]
- `standard` / `ptc` / `cordis` share: `planning` → `planMode`; `compaction` → `compaction` + `toolResultPruner`; `delegation` → `workflowEngine`. Standard citations: [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:107] [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:108] [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:140] [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:177]
- `ptc` extra row (not an isolate group): `tool-presentation` / `@deepseek-ai/dsh-agent-tool-presentation` `mode: ptc`. [E: packages/preset/agent-presets/presets/ptc/agent.cordis.yml:264] [E: packages/preset/agent-presets/presets/ptc/agent.cordis.yml:268]
- `cordis` extra (no extra isolate): `tool-cordis` plus `skill-filesystem` with this preset's `skills/` directory. [E: packages/preset/agent-presets/presets/cordis/agent.cordis.yml:251] [E: packages/preset/agent-presets/presets/cordis/agent.cordis.yml:261]

`tokenMeter` stays on the host plane (not inside the compaction isolate). Host-plane also: `shell-env`, jobs/skill/subagent **registries**, `tool-subagent-report`.

Standing mount: one composition per preset id (`standing` map), joined by `bindScopeParent` — not one mount per session. [E: packages/preset/agent-presets/src/index.ts:391] [E: packages/preset/agent-presets/src/index.ts:420] [E: packages/preset/agent-presets/src/index.ts:425]

### CLI flags that changed (vs 47f943859b wiki)

Launcher option **set is unchanged**. `parseDshArgs` still owns only `--profile`, `--patch` (repeatable single-value collector), `--dump-config`, `--dump-default-config`, `-V/--version`, leftover `[args...]`, and subcommands `web` / `plugin`. [E: apps/cli/src/args.ts:131] [E: apps/cli/src/args.ts:132] [E: apps/cli/src/args.ts:133] [E: apps/cli/src/args.ts:134] [E: apps/cli/src/args.ts:119] [E: apps/cli/src/args.ts:156] [E: apps/cli/src/args.ts:171] Still `helpOption(false)` + `allowUnknownOption` + `passThroughOptions` + `enablePositionalOptions`. [E: apps/cli/src/args.ts:126] Bare `dsh` still errors `error: --profile <name> is required`. [E: apps/cli/src/args.ts:140] `dsh web` is still the **only** hardcoded profile alias (`resolveBoot(web, 'web', …)`). [E: apps/cli/src/args.ts:168] There is **no** `dsh sdk` / `dsh acp` / `dsh headless` subcommand.

What **did** change:

1. **Three new shipped `--profile` names** auto-init from `PROFILE_TEMPLATES`: `sdk`, `sdk-minimal`, `acp` (plus existing `web` / `headless`). Fillers that still write “only web and headless” are wrong. [E: packages/boot/app-boot/src/profile.ts:137]
2. **Web app gained `--no-open`.** `webCommand()` now registers `--host`, `--no-open`, `--port`, `--trusted-host`. [E: packages/bundle/web-app/src/startup.ts:51] [E: packages/bundle/web-app/src/startup.ts:52] [E: packages/bundle/web-app/src/startup.ts:53] [E: packages/bundle/web-app/src/startup.ts:54] Commander’s `--no-open` publishes `openBrowser: options.open` (default open). [E: packages/bundle/web-app/src/startup.ts:81] The `web-runtime` row reads `openBrowser: !!js ctx.webStartup.openBrowser`. [E: packages/bundle/web-app/cordis.patch.yml:134] `--host 0.0.0.0` is still rejected. [E: packages/bundle/web-app/src/startup.ts:74]
3. **New zero-extra-flag app CLIs** (stdio surfaces). SDK help name is `dsh --profile ${profile}` (`sdk` or `sdk-minimal` via bundle config). [E: packages/bundle/sdk-app/src/index.ts:40] [E: packages/bundle/sdk-app/src/index.ts:30] ACP help name is `dsh --profile acp`. [E: packages/bundle/acp-app/src/index.ts:27] Both only add `-h/--help`, then `provide` a startup service and `exitOnStdinEnd`. [E: packages/bundle/sdk-app/src/index.ts:58] [E: packages/bundle/acp-app/src/index.ts:44]
4. Headless still owns `[task...]` only (plus its `-h`). [E: packages/bundle/headless/src/startup.ts:36]
5. `HELP_EXAMPLES` still uses `tui` as a **custom** profile illustration (`dsh --profile tui --patch …`). `tui` is not a `PROFILE_TEMPLATES` key. [E: apps/cli/src/args.ts:68]
6. Dispatch is still three modes: `profile` → `runProfile`, `plugin` → `runPlugin`, `dump-config` → `runDumpConfig`. [E: apps/cli/src/bin.ts:27] [E: apps/cli/src/bin.ts:29] [E: apps/cli/src/bin.ts:42]

Inner args after the first unknown token still go to `ctx.cmdlineArgs` via `provideCmdline`; launcher flags must come first. [E: apps/cli/src/profile-boot.ts:258]

### `dump-config` still exists

Do not retire or “removed in this SHA” the dump path. All three pieces are live:

- Flags: `--dump-config` and `--dump-default-config` on the root command and on `web`. [E: apps/cli/src/args.ts:133] [E: apps/cli/src/args.ts:134] [E: apps/cli/src/args.ts:164] They remain mutually exclusive. [E: apps/cli/src/args.ts:90] Dump still rejects leftover app args. [E: apps/cli/src/args.ts:96] `--dump-default-config` still rejects `--patch`. [E: apps/cli/src/args.ts:100]
- Dispatch: `bin.ts` `case 'dump-config'` dynamically imports `./dump-config.ts` and calls `runDumpConfig`. [E: apps/cli/src/bin.ts:42] [E: apps/cli/src/bin.ts:44] It does **not** `boot`.
- Implementation: `apps/cli/src/dump-config.ts` still exports `runDumpConfig`. [E: apps/cli/src/dump-config.ts:30] It `prepareProfile`s (rewriting the empty root), then `renderConfigDump`s bundle layers, and unless `defaultOnly`: profile `cordis.patch.yml`, home `$DSH_HOME/cordis.patch.yml`, then each `--patch` file. [E: apps/cli/src/dump-config.ts:31] [E: apps/cli/src/dump-config.ts:36] [E: apps/cli/src/dump-config.ts:51] [E: packages/boot/app-boot/src/index.ts:394] `defaultOnly` passes `userLayer: false` into `loadProfile` so a broken user layer cannot fail the default dump. [E: packages/boot/app-boot/src/profile.ts:840]

Dump still does **not** apply `resolveTelemetryPatch` / `DSH_TELEMETRY_DISABLED` (that patch is only pushed in `composeProfile` during `runProfile`). [E: apps/cli/src/profile-boot.ts:170] Dump still does not evaluate `!!js`. Shipped preset roots never appear in the dump: they are a web-bundle row, not a launcher-injected overlay.

### Stale claims to kill in composition nodes

- “`PROFILE_TEMPLATES` 只有 `web` 与 `headless`” → five names, `web` is the only `live` shipped template.
- “四个 preset: minimal / standard / **code** / cordis” or source `apps/cli/config/agent-presets/code/` → `ptc` at `packages/preset/agent-presets/presets/ptc/`.
- “`dsh web` 是唯一宿主入口” → also `dsh --profile sdk|sdk-minimal|acp|headless` (and custom profiles via `dsh plugin`).
- “`sdk-minimal` 叠在 `dsh-base` 上” → it does not; its `bundles` is only `@deepseek-ai/dsh-sdk-minimal`.
- “`--dump-config` 已删除” → file, flags, and `bin.ts` case all remain.
- “web 旗标只有 `--host` / `--port` / `--trusted-host`” → add `--no-open`.
- “headless 的 bundles 含 `dsh-web-app`” → only as a retired tuple that `normalizeShippedProfile` rewrites away.
)
