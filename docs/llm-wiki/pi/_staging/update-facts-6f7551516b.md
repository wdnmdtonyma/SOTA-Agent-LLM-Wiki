# 本轮硬事实（6f7551516b）— filler 读，勿当 [E] 照抄

对照源码写。SHA `6f7551516b`。产品仍 0.87.1 / Unreleased。跨度 `ff72faba28` → `6f7551516b`，7 commits。

- System theme：`SYSTEM_THEME_NAME = "system"`。启动灰度直到 `queryTerminalColors` 返回。OKHSL，三级生成。默认 fallback 是 `system`，不再“只有 dark/light”。
- `parseAutoThemeSetting` 仍解析 `light/dark` slash 配对。
- 启动 banner 去掉 `[Themes]`。
- 新组件 `pi-logo.ts`、`themed-text.ts`。
- Fireworks 默认：`accounts/fireworks/models/kimi-k3`（不是 `kimi-k2p6`）。
- OpenAI `service_tier: "fast"` 与 `"priority"` 同倍率（gpt-5.5 → 2.5，其它 → 2）。
- `@earendil-works/pi-ai` 依赖 `openai` **7.19.0**。
- Durable：`Id<Kind>` / `Seq` branded numbers；`idFromNumber`/`seqFromNumber`；`ConversationOwnership` ownerless|task；`createConversation` 与 `forkConversation` 拆开。
- providers 42 / buckets 42 / slash 24 / RPC 33 / extension on() 40 / tools 8。
- 不要写 pico。不要新建节点。
