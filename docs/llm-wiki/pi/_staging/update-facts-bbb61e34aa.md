# 本轮硬事实（bbb61e34aa）— filler 读，勿当 [E] 照抄

对照源码写。SHA `bbb61e34aa`。产品仍 0.85.1 / Unreleased。

- JSONL fork：`resolveForkInput` → `runJsonlFork`（`jsonl/fork.ts`）→ `JsonlStorage.open`。kind = open | closed | legacy-v3。
- 打开的 legacy v3 **不能** fork；未打开的 v3 **能** fork。
- Memory fork：`MemoryStorage.fork` / `InMemoryStorageState.createFork`。`createForkSnapshot` 仍导出，生产 repo 不用。
- IO：`parseJsonlTransaction` / `publishJsonl` 在 `jsonl/io.ts`。
- `compaction.modelOverrides` 精确 `"provider/modelId"`；字段独立回退到 16384 / 20000。`enabled` 不能 per-model。
- `retry.maxAgentDelayMs` 默认 60000。config-keys **86**。
- `navigateTree` 在 `isCompacting` 时 **throw**。
- RPC steer/follow_up 走 `_queueUserInput` + input handlers，`source: "rpc"`。
- `registerTool` 必须 object schema。`ModelRegistry.stream` / `streamSimple`。
- TUI：compaction/retry/summary/working 可嵌 editor 边框；fullscreen 不加 IdleStatus。
- OpenCode header `x-opencode-session`（有 sessionId 就发）。OpenRouter `x-session-id` 受 `cacheRetention !== "none"` 门控。
- Codex Off 仍发 reasoning（map.off 或 "none"；off===null 才省略）。
- Mistral Medium / small-2603 / small-latest → `reasoning_effort`。
- Copilot 全部 `gpt-*` → openai-responses。
- EventStream = FifoQueue。providers 40 / buckets 39 / tools 8。
- 不要写 pico。不要新建节点。
