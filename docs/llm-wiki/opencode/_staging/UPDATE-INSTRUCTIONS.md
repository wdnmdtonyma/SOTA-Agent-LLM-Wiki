# UPDATE INSTRUCTIONS — opencode wiki b3f1a96c6d → df23b7f948

> 给 filler / L2 verifier 用。事实以 `opencode/` checkout `df23b7f948` 为准，不以本文件或 update-facts 转述为准。写前必须打开被引用的源文件。

## 目标

- **base（上一轮 verified）**: `b3f1a96c6dd7adeb28b36dd11add1998fc84d67b`
- **target（官方 `origin/dev`）**: `df23b7f9488a38e6f8064a0739d4f8cde86d7cfb`
- **短 SHA**: `df23b7f948`
- **跨度**: 11 commits · 39 files · +2033 / -1319
- **发布版本**: 仍是 **`1.18.30`**
- **节点影响**: 0 A-BROKEN / 1 B-HEAVY（`ref.package-index` 的 `packages/` 伞形 source） / 9 C-DRIFT / 179 D-CLEAN；**不新增、不退役节点**（189 保持）

## 硬规则

1. 中文讲解，英文标识符。节点自包含。套 `docs/llm-wiki/opencode/conventions.md` 对应模板。
2. 每条 load-bearing 论断就近 `[E: relative/path:line]`，相对 `opencode/`。行号必须落在**被断言的代码行本身**，不是上方注释、空行、或 lone `}`。
3. frontmatter: `status: verified`、`updated: df23b7f948`、`evidence: explicit`（除非真是 inferred）。
4. 只写你被分配的 node `.md`，以及可选 `docs/llm-wiki/opencode/_staging/uncertainty-update-<id-last-segment>.md`。
5. **不要**改 `index.json`、`llms.txt`、`reference/uncertainty.md`、其它节点、`opencode/` 源码。
6. 发布版本仍是 **1.18.30**；`bun@1.3.14`；workspace 仍 **36** 个 package。不要把 zen/go 营销文档或 `go-models.ts` 里的模型名写成硬编码 live catalog。`deepseek-flash` 只是 stats 归一名。
7. SessionV2 / SessionRunner **仍不是默认执行路径**。两个 server 仍是 Effect HttpApi，不是 Hono。
8. 本轮**没有**新增/删除/改名模型可见 tool wire name。
9. 写完后抽 3 条 `[E]` 用 Read 对一下行号。
10. `rewrite` = 刷新 load-bearing 论断与 source/symbols，保留有用问句。`refresh` = 修正假话并重落 `[E]` 行号，不扩写。`remap` = 只删失效 source / 改假句。

## 拒绝这些过时说法

- 发布版本变成了 `1.18.31`（没有）
- ACP load/resume/fork 仍只从 **message history** 恢复 model/variant/mode（现为 durable session 优先）
- effort 选项不允许 `"default"` / `"default"` 必须出现在 variants map 里
- reasoning chunk 的 ACP `messageId` 仍是 assistant message id
- Support 只有 `reset-quota`，没有 batch block/unblock
- 存在单条 `Workspace.block` 导出（没有；只有 `unblock` + 两个 Batch）
- 缺 workspace ID 会让 batch block 整批 404
- `proxyInference` / Go billing 头与 `modelList === "full"` 绑定（`x-zen-billing-source` 只在 lite 新 inference 上）
- `buildRetentionQueries` 仍把整个 display window 合成 **一条** SQL
- R2 SQL 仍走 Bun 默认 5 分钟 idle、没有 15 分钟 timeout
- 把 `deepseek-flash` 写成 zen/go live catalog

## D-CLEAN / 轻量节点

source 未命中或只碰 `package.json` / nix hashes：保留正文，只把 `updated` 改成 `df23b7f948`。版本号仍是 `1.18.30`。
