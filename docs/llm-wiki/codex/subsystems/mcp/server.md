---
id: subsys.mcp.server
title: MCP server（已退役）
kind: subsystem
tier: T2
source: [codex-rs/cli/src/main.rs, codex-rs/Cargo.toml]
symbols: [mcp-server-removed]
related: [subsys.mcp.client, subsys.mcp.transports, subsys.core.session-lifecycle, subsys.core.tool-router]
evidence: explicit
status: verified
updated: 02a8f038b8
---

> `codex-rs/mcp-server` 与 CLI 子命令 `codex mcp-server` 已从仓库移除。外部 MCP client 通过 stdio 把 Codex 当 MCP server 调用的路径已下线；Codex **作为 client 连接外部 MCP server** 的方向仍在，由 `codex-mcp` / `rmcp-client` 与 `Subcommand::Mcp` 承担。[E: codex-rs/cli/src/main.rs:148][E: codex-rs/cli/src/main.rs:166][E: codex-rs/Cargo.toml:82][E: codex-rs/Cargo.toml:97]

## 能回答的问题

- `codex mcp-server` 现在还是 CLI 子命令吗？
- workspace 还包含 `codex-rs/mcp-server` crate 吗？
- 退役后，外部 MCP client 还能把 Codex 当 stdio server 调吗？
- `codex mcp` 现在做什么，和已删除的 `mcp-server` 有何不同？
- MCP **client**（连外部 server）还在哪些 crate？

## 退役映射

`enum Subcommand` 从 `Agents` 到 `Features` 共 29 个变体（含 macos/windows 上 cfg 的 `App`），**没有** `McpServer`。[E: codex-rs/cli/src/main.rs:148][E: codex-rs/cli/src/main.rs:179][E: codex-rs/cli/src/main.rs:241]

仍存在的 MCP 相关 CLI 是 `Mcp(McpCli)`，doc comment 是 “Manage external MCP servers for Codex”——管理 Codex 要连接的**外部** MCP server，不是把 Codex 自己暴露成 MCP server。[E: codex-rs/cli/src/main.rs:166][E: codex-rs/cli/src/main.rs:166]

workspace `members` 数组从 `aws-auth` 到 `model-provider`（`Cargo.toml` L3–L149，共 147 条），包含 `codex-mcp` 与 `rmcp-client`，**不包含** `mcp-server`。[E: codex-rs/Cargo.toml:3][E: codex-rs/Cargo.toml:82][E: codex-rs/Cargo.toml:97][E: codex-rs/Cargo.toml:149]

历史上该 crate 向外部 MCP client 暴露 `codex` / `codex-reply` 两个 tool、把 Codex events 转成 MCP notifications，并把 cancellation 映射到 `Op::Interrupt`。那些源文件已不在树里；本节点不再引用已删除路径。

## 仍存在的 MCP 方向

MCP **client** runtime（连外部 server、工具/资源聚合、transport）见 [MCP client runtime](client.md) 与 [MCP transports](transports.md)。扩展系统把 hosted/executor plugin MCP server **注入 client 层**，见 [Ext 扩展插件系统](../../spine/extension-system.md)；那不是已删除的 `codex mcp-server` host。

## Sources

- `codex-rs/cli/src/main.rs`
- `codex-rs/Cargo.toml`

## 相关

- [MCP client runtime](client.md)
- [MCP transports](transports.md)
- [Session 生命周期](../core/session-lifecycle.md)
- [Tool router 与并行执行](../core/tool-router.md)
