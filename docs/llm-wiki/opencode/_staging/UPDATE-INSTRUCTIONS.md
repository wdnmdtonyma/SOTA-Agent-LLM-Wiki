# UPDATE INSTRUCTIONS — opencode wiki e207624c48 → b3f1a96c6d

> 给 filler / L2 verifier 用。事实以 `opencode/` checkout `b3f1a96c6d` 为准，不以本文件或 update-facts 转述为准。写前必须打开被引用的源文件。

## 目标

- **base（上一轮 verified）**: `e207624c48159b03dbe17dbc8e51bbcf23e72df5`
- **target（官方 `origin/dev`）**: `b3f1a96c6dd7adeb28b36dd11add1998fc84d67b`
- **短 SHA**: `b3f1a96c6d`
- **跨度**: 23 commits · 88 files · +2802 / -1653
- **发布版本**: `1.18.29` → **`1.18.30`**
- **节点影响**: 0 A-BROKEN / 1 B-HEAVY（`ref.package-index` 的 `packages/` 伞形 source） / 40 C-DRIFT / 148 D-CLEAN；**不新增、不退役节点**（189 保持）

## 硬规则

1. 中文讲解，英文标识符。节点自包含。套 `docs/llm-wiki/opencode/conventions.md` 对应模板。
2. 每条 load-bearing 论断就近 `[E: relative/path:line]`，相对 `opencode/`。行号必须落在**被断言的代码行本身**，不是上方注释、空行、或 lone `}`。
3. frontmatter: `status: verified`、`updated: b3f1a96c6d`、`evidence: explicit`（除非真是 inferred）。
4. 只写你被分配的 node `.md`，以及可选 `docs/llm-wiki/opencode/_staging/uncertainty-update-<id-last-segment>.md`。
5. **不要**改 `index.json`、`llms.txt`、`reference/uncertainty.md`、其它节点、`opencode/` 源码。
6. 发布版本现为 **1.18.30**；`bun@1.3.14`；workspace 仍 **36** 个 package。不要把 zen/go 营销文档或 `go-models.ts` 里的模型名写成硬编码 live catalog。
7. SessionV2 / SessionRunner **仍不是默认执行路径**。两个 server 仍是 Effect HttpApi，不是 Hono。
8. 本轮**没有**新增/删除/改名模型可见 tool wire name。
9. 写完后抽 3 条 `[E]` 用 Read 对一下行号。
10. `rewrite` = 刷新 load-bearing 论断与 source/symbols，保留有用问句。`refresh` = 修正假话并重落 `[E]` 行号，不扩写。`remap` = 只删失效 source / 改假句。

## 拒绝这些过时说法

- 发布版本仍是 `1.18.29`
- `proxyInference` **只**在 `modelList === "full"` 时调用
- `proxyInference` 不覆盖 Go/lite（`/zen/go/*`）
- `GET /zen/v1/models` 仍有独立 `proxyModels()` helper
- Go `GET /zen/go/v1/models` / `GET /zen/go/v1/usage` 从不走 migration proxy
- Bedrock US 前缀规则仍对任意 `deepseek` 子串加 `us.`（现为 `deepseek.r1`；`deepseek.v3.2` 不加）
- Bedrock `arn:` model ID 还会被加 region prefix
- Copilot adaptive thinking 只对 `opus-4.7` 写 `display: "summarized"`
- `gpt` family 只有 `beast` / `codex` / `gpt.txt`，没有 `gpt-6` → `gpt-astra.txt`
- Go 营销 FAQ / lite 列表仍含 `Omen Alpha`
- 把 `go-models.ts` 或 web `docs/go.mdx` 的模型名单写成 live zen catalog

## D-CLEAN / 轻量节点

source 未命中或只碰 `package.json` / nix hashes：保留正文，只把 `updated` 改成 `b3f1a96c6d`；若正文写死了 `1.18.29` 则改为 `1.18.30`。
