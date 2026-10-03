# 本轮硬事实（4c6fb7cfe8）— filler 读，勿当 [E] 照抄

对照源码写。SHA `4c6fb7cfe8`。产品 **1.0.1** + Unreleased。覆盖上游 v0.99.0–v1.0.1。

- 一阶 `packages/*` **13**：chord、tui、telemetry、**codemode**、**mcp**、ai、durable、agent、protocol、client、server、coding-agent、evals。**删除** `packages/session-backends`。
- 根 build：chord → tui → telemetry → **codemode → mcp** → ai → durable → agent → protocol → client → server → coding-agent。公开包版本 **1.0.1**。
- `@earendil-works/pi-agent-core` 1.0 breaking：只导出 `Agent`、agent loop、proxy stream、types。删除 `AgentHarness`、sessions/storage、pico3、harness tools、compaction、skills、prompt templates、system prompt helpers、telemetry schemas、search、`./node` / `./harness/*` / `./experimental/pico3`。可复用 durable session 用 `pi-durable`。
- `@earendil-works/pi-durable`：`createSession` / `Harness` / `defineTask` / `defineTool` / `MemoryStorage` + JSONL/SQLite（含 **async** SQLite adapter）+ `./tools`（bash/read/edit/write/image）+ `./env`。不要写成 coding-agent SessionManager JSONL 的替代。
- `@earendil-works/pi-mcp`：独立 MCP client（不依赖官方 MCP SDK）。`McpClient` + stdio / Streamable HTTP / in-memory transport + OAuth。
- `@earendil-works/pi-codemode`：QuickJS WASM sandbox。无 pi 依赖。`CodemodeSandbox.execute()`。输出上限 `MAX_OUTPUT_CHARS` / `MAX_OUTPUT_ITEMS`。
- coding-agent 内置 replaceable 扩展：`codemode`、`tool-search`、`mcp`（另有不可替换 `llama.cpp`）。
- `/mcp` **不是** `BUILTIN_SLASH_COMMANDS`（仍 24 个）；由 mcp 扩展 `registerCommand`。
- Extension `on()` **41**：+`mcp_servers_change`。
- Virtual models：`VIRTUAL_MODEL_API = "pi-virtual"`；路由后 provider 只看见物理模型。
- Image 仍走 `Models.generateImages()`；codemode 脚本也可 `models.generateImages()`。
- Classifier：`KnownClassifierApi` = `typesafe-system-one` | `cloudflare-workers-ai-system-one` | **`llama-cpp-classify`**。Cloudflare Clef 在 Workers AI。
- Providers **42**、model shards **42**、KnownApi **10**、tools **8**。
- TUI 默认 `tuiMode: "fullscreen"`。`quietStartup: "header"` 只留启动 header。
- Session JSONL 仍在第一条 user/assistant 消息时创建（`_hasConversation`）。
- `finishTurn` / `prepareRequest` 仍在。不要写 `shouldStopAfterTurn`。
- 不要写 pico。不要 cite `packages/agent/src/harness/**`、`packages/session-backends/**`、`daxnuts.ts`、`deferred-tools.ts`、`ImagesModels`。
- DeepSeek 硬编码仍核 `generate-models.ts`（上一轮是 `deepseek-flash` + `deepseek-v4-pro`）。
- `PROTOCOL_VERSION` 仍为 **8**（须再核 `packages/protocol/src/protocol.ts`）。
