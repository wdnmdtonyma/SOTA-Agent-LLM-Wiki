---
id: ref.uncertainty
path: reference/uncertainty.md
title: 不确定项日志
kind: reference
tier: T3
source: []
status: verified
updated: 5670360009
evidence: unknown
---

> 全仓 `[U]`(待查/待证实)汇总,由各填充任务的 _staging/uncertainty-*.md 合并而来;每次 reconcile 重新生成。

## uncertainty-config-cloud-platform

# uncertainty-config-cloud-platform

本批次当前没有需要降级为 `[U]` 的事项。

## uncertainty-core-state

# core-state uncertainty

本批次没有新增不确定项。

## uncertainty-exec-sandbox

# uncertainty: exec-sandbox

本批次当前没有 `[U]` 项。

## uncertainty-reference

# uncertainty-reference

本批次当前没有需要合并到 `reference/uncertainty.md` 的 `[U]` 项。

## uncertainty-spine

# uncertainty-spine

本批次暂无 `[U]` 项。

## uncertainty-surface-cat-b

# uncertainty surface-cat-b

No unresolved `[U]` items recorded after the source-reading pass for this batch.

## uncertainty-tools-update

### Removed tool nodes at codex 5670360009

- `tool.shell`: removed from wiki target because current `spec_plan.rs` exposes shell execution through `shell_command` or unified exec handlers; the old `tools/src/local_tool.rs` source path is gone.
- `tool.local-shell`: removed from wiki target because `ToolSpec::LocalShell` is not present in current `codex-rs/tools/src/tool_spec.rs`.
- `tool.list-dir`: removed from wiki target because no current `handlers/list_dir.rs` or list-dir registration exists under `codex-rs/core/src/tools/spec_plan.rs`.
- `tool.js-repl` and `tool.js-repl-reset`: removed from wiki target because JS REPL sources and docs are gone in current HEAD.
- `tool.tool-suggest`: removed from wiki target because plugin install suggestion is now split across `list_available_plugins_to_install` and `request_plugin_install`.
- `tool.close-agent-v2`: removed from wiki target because current MultiAgent V2 registers `interrupt_agent` and `list_agents`, while V2 `close_agent` is absent.

## uncertainty-tui-appserver

# Uncertainty: tui-appserver

本批次暂无需要登记到总表的 `[U]` 项。
