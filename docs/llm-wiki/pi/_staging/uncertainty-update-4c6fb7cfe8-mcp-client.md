# uncertainty-update-4c6fb7cfe8-mcp-client

本批：`subsys.mcp.client`。

未安装上游 `node_modules`，没有跑 `packages/mcp` 的 vitest，不宣称 client / stdio / HTTP / OAuth 测试在本机通过。[U]

## [I]

- `StreamableHttpTransport.send` 对 `application/json` 响应若 body 是 array，会逐项 `parseJsonRpcMessage` 再 `emitMessage`。这是收包拆条，不是 client 发送 JSON-RPC batch 的 API。README 仍把 “Batch JSON-RPC messages” 标为 initial core 之外。
- `ClientCapabilities` 类型含可选 `sampling` / `elicitation` 字段，但 `McpClient` 没有 sampling / tasks helper；与 README “sampling, and tasks are outside the initial core” 一致，不要写成已实现的协议面。
- `toLlmContent` 的 `LlmContent` 形状与 `@earendil-works/pi-ai` 的 text/image 对齐写在 README / JSDoc；`pi-mcp` 不 import `pi-ai`，类型层没有 `import type` 约束。
- OAuth “改编自 typescript-sdk v1.29.0” 以 README 与 `LICENSES/` 为据，未逐行 diff 上游 SDK。

## [U]

- 未跑 runtime tests：`packages/mcp/test/*.test.ts` 在 target HEAD 是否全绿，本 filler 未核。
- stdio process-group shutdown 在 Windows 上的 `taskkill` 路径仅读源码；`stdio.test.ts` 的 grandchild kill case `skipIf(win32)`，本机也未执行。
