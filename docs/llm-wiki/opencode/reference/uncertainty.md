---
id: ref.uncertainty
title: 不确定项日志([U] 汇总)
kind: reference
tier: T3
v: na
source: []
symbols: []
related: []
evidence: unknown
status: verified
updated: b3f1a96c6d
---

# 不确定项日志([U] 汇总)

> 本文件由 tools/reconcile.mjs 从 _staging/uncertainty-*.md 自动合并生成,请勿手改。

## batch-ai

# uncertainty-batch-ai

- `plugin-api.v1-hooks`: `permission.ask` is declared in `packages/plugin/src/index.ts`, but this batch did not find a V1 call site matching `plugin.trigger("permission.ask", ...)`. Verify whether the hook is intentionally vestigial, invoked through another mechanism, or awaiting implementation. [U]

## batch-ar

# Uncertainty Batch AR

- `server.plugin-system`: 目标源码树中没有 `packages/core/src/plugin/boot.ts`；当前可证 boot path 是 `packages/core/src/plugin/internal.ts` 的 `PluginInternal`，但旧 `PluginBoot` 名称没有直接 replacement。
- `tool.grep`: V2 `grep` 的 `path` schema 字段使用 `RelativePath`，但 `packages/schema/src/schema.ts` 中 `RelativePath` 当前只是 string brand；`packages/core/src/tool/grep.ts` 使用 `path.resolve(location.directory, input.path ?? ".")`，所以 relative input 可证以 Location 为根，但 absolute input 是否会被上游 codec/schema 拒绝、或是否对应 description 中的 absolute managed tool-output file，本轮未完全确认。
- `tool.grep`: V1 symlink-alias 输出测试在 Windows 明确跳过，平台一致性尚未验证；symlink-to-file 也没有测试，当前“搜索 real file 的父目录、按 requested file dirname 重建结果”的组合可能产生 sibling-style 展示路径。[U]

## batch-aw

# Uncertainty Batch AW

- `tui.theming`: OpenTUI palette detection 的内部算法不在 opencode 源码内；当前只能核到 TUI 调用 `renderer.getPalette()`、监听 `THEME_MODE`/terminal color-scheme notification 并合成 `ThemeJson` 的行为。[U]

## batch-clients

# uncertainty-batch-clients

- `clients.app-compatibility`: timeline turns 仍按传入的 current `session_message` source 顺序构造；optimistic user 才按 `compareMessages`（`time.created + id`）插入。该 source 顺序是否总等于 durable aggregate sequence 尚未在 App 层证明。[U]
- `clients.app-compatibility`: current SSE 重连不发送 `Last-Event-ID`，仓内只看到 missed promoted input 的单条 hydrate；一般事件缺口最终能否收敛没有可证的客户端 contract。[U]
- `clients.app-compatibility`: migration checklist 把 current PTY connect-token 标为完成，但 App 源码不能证明 ticketless current handshake 能成功，也不能证明这条 path 的预期 authorization contract。[U]

## batch-hosted

# uncertainty-batch-hosted

- `clients.console`: Google usage normalization 把 `thoughtsTokenCount` 加进 `outputTokens`，同时仍单独保留 `reasoningTokens`。generic trial limiter 把 `outputTokens + reasoningTokens` 再相加，Stats `buildTokenCost` 也用 `outputTokens + reasoningTokens` 做 output cost-per-million。对 Google usage 是否二次计算 thoughts、下游契约应否改，当前源码无法判定。[U]
  - [E: packages/console/app/src/routes/zen/util/provider/google.ts:68]
  - [E: packages/console/app/src/routes/zen/util/trialLimiter.ts:31]
  - [E: packages/console/app/src/routes/zen/util/trialLimiter.ts:33]
  - [E: packages/console/app/src/routes/zen/util/trialLimiter.ts:34]
  - [E: packages/stats/core/src/domain/home.ts:743]

## batch-session

# Uncertainty batch: session (3fd77ae980)

- `session-v2.projector` / `spine.v2-context-epoch`: `SessionContextEpoch.reset` 仍导出并会删除 epoch row,但当前 `packages/core` production path 没有 caller。`SessionProjector` 的 `Moved` 只更新 location fields,`RevertEvent.Committed` 删除 boundary 之后的 messages/inputs,两者都不再 reset epoch。无法从本轮源码确认这是有意让 destination Location 复用旧 baseline,还是漏掉的 call site。[U]

## clients

# uncertainty-clients

- `clients.app-compatibility`: current SSE 重连不发送 `Last-Event-ID`，仓内只看到 missed promoted input 的单条 hydrate；一般事件缺口最终能否收敛没有可证的客户端 contract。[U]
- `clients.app-compatibility`: timeline rows 按传入的 current message source 顺序构造，不自行按 timestamp 或 event sequence 排序；该输入顺序是否总等于 durable aggregate sequence 尚未在 App 层证明。[U]
- `clients.app-compatibility`: migration checklist 把 current PTY connect-token 标为完成，但目标 App 中 `api.pty.connectToken` 调用与 no-ticket guard 仍被注释，同时仍尝试创建 current WebSocket；App 源码不能证明 ticketless handshake 能成功，也不能证明这条 path 的预期 authorization contract。[U]

## execution

# uncertainty-execution

本批次当前没有降级为 `[U]` 的条目。

## integrations

# uncertainty-integrations

本批次暂无需要降级为 `[U]` 的结论。

已在节点正文中用 `[I]` 标注的源码计数/解释性判断包括：

- `integrations.lsp`: 当前源码内建 LSP server id 列表按 `packages/core/src/v1/config/lsp.ts` 计数为 38；这与批次提示中的 40 不一致，节点以源码为准。
- `integrations.formatters`: 当前 `packages/opencode/src/format/formatter.ts` 的 `Formatter` object 按条目计数为 26；这与批次提示中的 27 不一致，节点以源码为准。

## opencode-89130db6b0

# uncertainty-opencode-89130db6b0

- `clients.console`: Google usage normalization now includes `thoughtsTokenCount` inside `outputTokens` while generic trial-limiter and Stats presentation paths still add `reasoningTokens` separately. Whether those downstream consumers should change to avoid double-counting Google thoughts is unresolved. [U]
- `clients.console`: `packages/console/app/test/providerUsage.test.ts` still expects Google candidate tokens without thoughts in `outputTokens`, while the target implementation returns candidates plus thoughts. The intended test/contract update is unresolved. [U]

## peripheral

# uncertainty-peripheral

本批次暂无需要登记为 `[U]` 的存疑项。正文中无法由当前 lint 安全引用 bracket route 文件行号的 SolidStart route 事实已降级为 `[I]`，未登记为 `[U]`。

## persistence

# persistence batch uncertainty

- `persistence.repository-cache`: branchless refresh 依赖本地 `refs/remotes/origin/HEAD`；upstream 默认分支变化或 symbolic ref 缺失时的长期行为没有测试覆盖。[U]
- `persistence.repository-cache`: branch 名只做 URI encoding 后进入 cache path；大小写不敏感文件系统上的 branch-name case collision 尚未覆盖。[U]

## ref-exec-persist

# uncertainty-ref-exec-persist

本批次暂无 `[U]` 项。

## ref-integrations-tui-global

# uncertainty-ref-integrations-tui-global

本批次当前没有保留的 `[U]` 项。

## server

# Uncertainty - server batch

本批次暂无需要登记到 reference/uncertainty.md 的 `[U]` 项。

## session-v2

# uncertainty-session-v2

本批次暂无需要登记的 unknown 项。正文中少量 `[I]` 只表示基于当前源码的未来/意图推断,没有升级为 unknown。

## surface-api

# uncertainty · surface-api

- `plugin-api.v1-hooks`: `permission.ask` is declared in `packages/plugin/src/index.ts`, but this batch did not find a V1 call site matching `plugin.trigger("permission.ask", ...)`. Verify whether the hook is intentionally vestigial, invoked through another mechanism, or awaiting implementation.

## tui

# uncertainty-tui

- `subsystems/tui/architecture.md`: OpenTUI renderer/keymap/slot registry internals live in external `@opentui/*` packages, not in `Best/opencode`; wiki can only verify how opencode calls those APIs. [U]
- `subsystems/tui/theming.md`: OpenTUI palette detection internals are external; wiki can verify `renderer.getPalette()` and TUI's ThemeJson synthesis, not the terminal probing algorithm. [U]
- `subsystems/tui/keybindings.md`: `@opentui/keymap` parser/resolver/layer internals are external; wiki can verify opencode registration and config mappings, not the library's internal conflict resolution. [U]
- `subsystems/tui/run-scrollback.md`: OpenTUI retained scrollback and markdown stable-block internals are external; wiki can verify opencode's use of `_stableBlockCount` and commitRows, not the renderer's internal layout algorithm. [U]

## update-console

# uncertainty-update-console

- SHA: `b3f1a96c6d`
- node: `clients.console`

## 仍 [U]

Google normalizer 已把 `thoughtsTokenCount` 加进 `outputTokens`，但 trial limiter / Stats `buildTokenCost` 仍做 `outputTokens + reasoningTokens`。对 Google 行可能二次计入 thoughts；是否应改契约未确认。详见 `uncertainty-batch-hosted`。[E: packages/stats/core/src/domain/home.ts:743]

## 已关闭

- `providerUsage.test.ts` 现期待 `candidates=3, thoughts=2` → `outputTokens=5`，与 `google.ts:68` 一致；上一轮“测试期待 3 / 实现返回 5”张力已消失。[E: packages/console/app/test/providerUsage.test.ts:29]
- `proxyInference` 只覆盖 full catalog / 不覆盖 Go-lite：已否。handler 在 truthy `model` 时即调用；paths 含 `/zen/go/v1/*` 与 models/usage GET。

## verify-app-compatibility

# uncertainty-verify-app-compatibility

- node: `clients.app-compatibility`
- SHA: `9f69463f1d`

## current source turn order

- claim: current session source turn order is not resorted by timestamp or durable sequence; App layer does not prove that input order equals aggregate seq.
- status: still `[U]`
- inspected: `packages/app/src/pages/session/timeline/projection.ts:32-40` feeds `input.sessionMessages()` into `constructSessionMessageRows`, which walks source order (`rows.ts:47`).

## current PTY connect-token

- claim: active `connectToken()` only calls the legacy endpoint on protocol V1; current path returns `undefined` ticket. Source cannot prove ticketless current handshake succeeds.
- status: still `[U]`
- inspected:
  - `packages/app/src/components/terminal.tsx:560-586` V1-only live call; current branch is commented out
  - `packages/app/src/components/terminal.tsx:611-627` continues WebSocket open with optional ticket
  - `packages/app/V1_API_MIGRATION.md:193` checklist marks connect-token migrated

## verify-console

# uncertainty-verify-console

- batch: `L2-console-sst`
- nodes: `clients.console`, `infra.sst`
- SHA: `b3f1a96c6d`

## Still [U]: Google thoughts double-count

- claim: Google normalizer already folds `thoughtsTokenCount` into `outputTokens`, but trial limiter and Stats `buildTokenCost` still add `outputTokens + reasoningTokens`.
- status: still `[U]`
- inspected:
  - `packages/console/app/src/routes/zen/util/provider/google.ts:68` `outputTokens: outputTokens + reasoningTokens`
  - `packages/console/app/src/routes/zen/util/trialLimiter.ts:31-34` sums `outputTokens + (reasoningTokens ?? 0)`
  - `packages/stats/core/src/domain/home.ts:743` `item.outputTokens + item.reasoningTokens`
- unresolved: whether that double-count is intended contract.

## L2-console-sst @ b3f1a96c6d

Must-confirm items held after source read:

- handler `if (model)` → `proxyInference` before validate/rate-limit/auth; BYOK provider/native model only when `modelList === "full"`.
- `paths` includes Go POST + `GET /zen/v1/models` + `GET /zen/go/v1/{models,usage}`.
- `/zen/go/` sets `go=true` so ProviderTable join is `sql\`false\``.
- `generation` optional; GET is `new Request(destination, request)`.
- `inferenceUnavailable` 503 message is exact: `Inference routing is unavailable. Please retry later.`
- `proxyModels()` gone from tree.
- `GET /oauth/opencode/client.json`: `client_id = origin + PATH`, `native`, loopback no port, `token_endpoint_auth_method: none`.
- `go-models.ts` is UI allowance table, not live zen catalog; `deepseek-flash` / DeepSeek V4.1 Flash / `bonus: 4`; no Omen Alpha.
- `ZEN_LITE_PRICE` dev hardcodes `prod_U1tUscpmwtV2bG` / `price_1T3phhE7fOCwHSD4zS6w2NPy`; other stages use `zenLiteProduct.id` / `zenLitePrice.id`.
- `infra/console.ts` migration URLs still at 226/228/230/231 after the preview-branch comment.

Fixed in `clients.console` (wording / [E] only): GET Request init, Google BYOK `/models/${model}` path, `inferenceUnavailable` cite 114, google normalize cite 62, go models proxy cite 11.

## verify-light

# L2-light verify notes — e207624c48

抽核 `opencode/` `e207624c48`，不信任 filler 转述。

## 拒绝项

- 这批节点没有把 SessionV2 写成默认活跑路径；`embedded-public-api` 只描述 V2 embedding surface。
- 没有残留 `1.18.25`。
- V1/V2 model-visible tool wire name 无增删改名；`execute` 仍是 experimental Code Mode。
- 没有 Azure `provider.models` / deployment auto-discover 说法。
- 没有把 opencode 两个 HTTP server 写成 Hono；`function` / `enterprise` 的 Hono 明确是外围 Worker / SolidStart。

## 已就地修正

- `tool.read`：`SessionTools.resolve` 转 AI SDK tool 的 [E] 从 `tools.ts:81`（`ask`）改到 `:92`/`:99`。
- `tool.execute`：去掉落到 `registry.ts:328`（`.join`）的假 [E]；移除逻辑在 `:308`。
- `plugin-api.v2-hooks`：SDK cache key 是 `{providerID, api, options}`，language cache 是 `providerID/model.id/variant`，不是混成一个 provider/model/options key。
- `integrations.mcp-client`：SessionTools 路径下 `resource` blob 不是无条件 attachment，受 mime allowlist 与 10 MiB 限制。
- `peripheral.script-identity`：TEAM_MEMBERS 名单仍在，但本 range 未改该文件；去掉“本 SHA 新增”措辞。

## 未扩写

- `apply_patch` 省略空 `movePath`、`tools.ts` 复用 running `time.start`、processor thinking-dropped log：这批节点原先没有对应假话，按规则不扩写。

## verify-plugin-system

# uncertainty-verify-plugin-system

- node: `server.plugin-system`
- SHA: `9f69463f1d`
- claim: 目标源码中没有 `packages/core/src/plugin/boot.ts`；旧 `PluginBoot` 是否有一对一命名 replacement 仍不确定。
- status: still `[U]`
- inspected: `packages/core/src/plugin/` has `internal.ts` (`PluginInternal.boot`) but no `boot.ts`. Current built-in boot is `PluginInternal`, not a named `PluginBoot` successor.

## verify-projector

# uncertainty-verify-projector

- node: `session-v2.projector`
- SHA: `9f69463f1d`

## SessionContextEpoch.reset has no production caller

`SessionContextEpoch.reset` is exported at `packages/core/src/session/context-epoch.ts:111` and deletes the `session_context_epoch` row.

Production packages have no caller. `SessionProjector` `Moved` (`packages/core/src/session/projector.ts:242`) only updates `SessionTable` directory/path/workspace_id/time_updated. `RevertEvent.Committed` (`packages/core/src/session/projector.ts:413`) deletes later `session_message` rows and does not call `reset`.

`CONTEXT.md:118` still says moving a Session clears its active Context Epoch. Whether move/revert should reset epoch is unprovable from current call sites.

Already marked `[U]` in `subsystems/session-v2/projector.md`.

## verify-session

# L2 verify — L2-session-tools @ e207624c48

Mandatory claims (refute attempt; all confirmed against `opencode/` HEAD):

- `step-finish` logs `thinking blocks dropped by provider` only when `providerMetadata.anthropic` is a record **and** `inputTransformations` is a non-empty array. [E: packages/opencode/src/session/processor.ts:441][E: packages/opencode/src/session/processor.ts:444][E: packages/opencode/src/session/processor.ts:445]
- SessionTools running state reuses `match.state.time`; `Date.now()` only when status is not already `running`. [E: packages/opencode/src/session/tools.ts:77]
- `apply_patch` writes `movePath` only when truthy. [E: packages/opencode/src/tool/apply_patch.ts:201]
- SessionV2 / SessionRunner is still not the default CLI/kernel path (`client.session.prompt` → `SessionPrompt`). [E: packages/opencode/src/cli/cmd/run.ts:864][E: packages/opencode/src/server/routes/instance/httpapi/handlers/session.ts:300]
- No new/deleted/renamed model-visible tool wire names in 9f69463f1d..e207624c48 (`Tool.define` / V2 `export const name` lists identical).

Line-number fixes applied (claims were true, `[E]` pointed at the wrong line):

- `session-v1.prompt` step 1 cited `prompt.ts:141/144/154` (flags / ops / cancel). Now `157/160/175/177/181/183` (`resolvePromptParts`).
- `session-v1.store` MessageTable cited `sql.ts:18` (`SessionMessageData` V2). Now `19` (`V1MessageData`).
- `session-v1.processor` step-finish patch-part claim now also cites `processor.ts:474`.

No remaining `[U]` for this batch.

## verify-v1-hooks

# uncertainty-verify-v1-hooks

- node: `plugin-api.v1-hooks`
- SHA: `9f69463f1d`
- claim: `permission.ask` is declared on V1 `Hooks`, but no `plugin.trigger("permission.ask", ...)` call site exists in V1 source.
- status: still `[U]`
- inspected: `rg 'trigger\(["'\'']permission\.ask' opencode/packages` returned no matches. `packages/plugin/src/index.ts:261` still declares the hook. Nearby `permission.ask({` hits are the permission service, not the plugin hook.

