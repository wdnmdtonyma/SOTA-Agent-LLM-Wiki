# UPDATE INSTRUCTIONS — opencode wiki df23b7f948 → 03e67171ab

> 给 filler / L2 verifier 用。事实以 `opencode/` checkout `03e67171ab` 为准，不以本文件或 update-facts 转述为准。写前必须打开被引用的源文件。

## 目标

- **base（上一轮 verified）**: `df23b7f9488a38e6f8064a0739d4f8cde86d7cfb`
- **target（官方 `origin/dev`）**: `03e67171ab2dc1e7f16e8cebfbc7f778f61b89f0`
- **短 SHA**: `03e67171ab`
- **跨度**: 86 commits · 214 files · +5956 / -2576
- **发布版本**: **`1.18.33`**（`packages/opencode`、`packages/core`、`packages/cli`）
- **节点影响**: 0 A-BROKEN / 1 B-HEAVY（`ref.package-index` 的 `packages/` 伞形 source） / 58 C-DRIFT / 130 D-CLEAN；**不新增、不退役节点**（189 保持）
- **workspace**: 仍 **36** 个 package；根仍 `bun@1.3.14`

## 硬规则

1. 中文讲解，英文标识符。节点自包含。套 `docs/llm-wiki/opencode/conventions.md` 对应模板。
2. 每条 load-bearing 论断就近 `[E: relative/path:line]`，相对 `opencode/`。行号必须落在**被断言的代码行本身**，不是上方注释、空行、或 lone `}`。
3. frontmatter: `status: verified`、`updated: 03e67171ab`、`evidence: explicit`（除非真是 inferred）。
4. 只写你被分配的 node `.md`，以及可选 `docs/llm-wiki/opencode/_staging/uncertainty-update-<batch>.md`。
5. **不要**改 `index.json`、`llms.txt`、`reference/uncertainty.md`、其它节点、`opencode/` 源码、`README.md`、`conventions.md`、`RUN.md`、`tools/*`。
6. 发布版本是 **1.18.33**。不要把 zen/go 营销文档或 `go-models.ts` 里的模型名写成硬编码 live catalog。`deepseek-flash` 只是 stats 归一名。
7. SessionV2 / SessionRunner **仍不是默认执行路径**。两个 server 仍是 Effect HttpApi，不是 Hono。
8. 本轮**没有**新增/删除/改名模型可见 tool wire name。
9. 写完后抽 3 条 `[E]` 用 Read 对一下行号。
10. `rewrite` = 刷新 load-bearing 论断与 source/symbols，保留有用问句。`refresh` = 修正假话并重落 `[E]` 行号，不扩写。

## 拒绝这些过时说法

- 发布版本仍是 `1.18.30` / `1.18.31` / `1.18.32`
- Cloudflare AI Gateway 的 `headerTimeout`/`chunkTimeout` 只在 `resolveSDK` 里包一层 fetch，gateway loader 自己的 `createAiGateway` 不走 timeout
- Gemini thinking default 仍用 `id.includes("gemini-3")` 判断；`includes("2.5")` 当 Gemini 2.5 检测
- Codex `ALLOWED_MODELS` 不含 `gpt-6-sol` / `gpt-6-luna`
- Bedrock 普通 `@ai-sdk/amazon-bedrock` 对所有 image MIME 都 hoist 进 tool result
- `opencode debug config` 把完整 resolved config（含 secret）打到 stdout
- MCP / TUI / account / web / snowflake / digitalocean 直接 `import open from "open"`，不经 `openUrl`
- MCP OAuth 会打开任意 protocol 的 authorization URL
- MCP browser launcher 在 Windows/WSL 上 `open()` 已退出后不再检查 `exitCode`
- R2 SQL `query` 仍是单次 POST、无 cursor 分页、无 40005/429/5xx retry
- Stats home 只有 weekly ranking；`1D` ranking 会显示 10× 以上的伪变化
- Radar reasoning/tool-use 缺 benchmark 时用 `reasoning ? 100 : 0`，`reasoning`/`toolCall` 是必填 boolean
- `hy4-preview` 仍归 unknown provider
- Console inference proxy 只转发 `migratedAt` 的 legacy key；新 `oc_sk_` key 也去查 legacy 表
- Console 仍接受无 Black subscription 的账号留在旧 Console
- Console 仍能创建 Go subscription
- Console download 仍从 GitHub releases 代理并改 `content-disposition`
- 安装链接仍是 `opencode.ai/install` / `npm i -g opencode-ai`
- Node 下 `Npm.resolveEntryPoint` 仍 `import.meta.resolve(dir)`

## D-CLEAN / 轻量节点

source 未命中或只碰 `package.json` / nix hashes：保留正文，只把 `updated` 改成 `03e67171ab`。若正文写了 `1.18.30`，改成 `1.18.33`。
