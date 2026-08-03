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
updated: 89130db6b0
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

