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
updated: 355a0bcf5
---

# 不确定项日志([U] 汇总)

> 本文件由 tools/reconcile.mjs 从 _staging/uncertainty-*.md 自动合并生成,请勿手改。

## execution

# uncertainty-execution

本批次当前没有降级为 `[U]` 的条目。

## integrations

# uncertainty-integrations

本批次暂无需要降级为 `[U]` 的结论。

已在节点正文中用 `[I]` 标注的源码计数/解释性判断包括：

- `integrations.lsp`: 当前源码内建 LSP server id 列表按 `packages/core/src/v1/config/lsp.ts` 计数为 38；这与批次提示中的 40 不一致，节点以源码为准。
- `integrations.formatters`: 当前 `packages/opencode/src/format/formatter.ts` 的 `Formatter` object 按条目计数为 26；这与批次提示中的 27 不一致，节点以源码为准。

## peripheral

# uncertainty-peripheral

本批次暂无需要登记为 `[U]` 的存疑项。正文中无法由当前 lint 安全引用 bracket route 文件行号的 SolidStart route 事实已降级为 `[I]`，未登记为 `[U]`。

## persistence

# persistence batch uncertainty

No unresolved uncertainty items were added in this batch.

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

