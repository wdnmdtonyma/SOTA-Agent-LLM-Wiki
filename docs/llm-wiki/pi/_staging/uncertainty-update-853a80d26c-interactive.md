# uncertainty-update-853a80d26c-interactive

batch: 853a80d26c interactive / sessions / settings-diagnostics
nodes: surface.modes.interactive, subsys.coding-agent.interactive-orchestration, surface.sessions.management, subsys.coding-agent.session-manager, subsys.coding-agent.html-export
updated: 853a80d26c
status: draft

本轮只改 interactive / sessions 面,并把 settings-diagnostics + Ctrl+S persist 写进 interactive 两页(不改 `surface.config.settings` / `settings-manager.md`)。下列 `[U]` 是官方文档或 index source 无法在本批闭合的点。

## [U] 官方 sessions.md 的 `/share` / `/export` 漂移

- 节点: `surface.sessions.management`
- `packages/coding-agent/docs/sessions.md` 仍写 `/export [file]` = Export session to HTML、`/share` = Upload as private GitHub gist [E: packages/coding-agent/docs/sessions.md:34] [E: packages/coding-agent/docs/sessions.md:35]。
- 代码:`exportSessionForShare()` 先写带 `customType: "pi.share"` 的 JSONL,`shareSession()` 先 Radius 再 gist;`tryShareViaRadius()` 一旦开始上传失败也不回退 gist;`/export` 以 `.jsonl` 后缀分流 JSONL/HTML。
- `docs/usage.md` 对 `/thinking` Ctrl+S 更准,但对 `/share` 仍写 gist-only。本批以代码为 ground truth,官方页不当 `[E]` 行为源。

## [U] `docs/keybindings.md` Models and Thinking 表不写 Ctrl+S persist

- 节点: `surface.modes.interactive`、`subsys.coding-agent.interactive-orchestration`
- CHANGELOG 0.84.3 指向 `packages/coding-agent/docs/keybindings.md` 的 Models and Thinking 节,但该表只有 `app.model.select` / cycle / `app.thinking.cycle` / `app.thinking.toggle`。
- `/model` 与 `/thinking` selector 的 Ctrl+S 是组件内 `matchesKey(keyData, "ctrl+s")`,不是 `app.models.save`(`app.models.save` 只服务 `/scoped-models`)。
- 不知道上游是否打算把 persist 提成可配置 keybinding,还是有意保持硬编码。

## [U] CLI `--export` / RPC `export_html` 与 `/share` 的精确 dispatch

- 节点: `subsys.coding-agent.html-export`、`surface.sessions.management`
- 本批核到 interactive `/export` 的 `.jsonl` 分流和 `/share` 的 Radius/gist 分流。
- CLI `--export`、RPC `export_html` 是否也走 `exportSessionToJsonl()`,以及 RPC 有没有 share 等价命令,不在本批 interactive/session-export source 的完整 CLI/RPC 文件集内。

## 本轮处理

- settings-diagnostics 与 Ctrl+S persist 只写进 `surface.modes.interactive` 与 `subsys.coding-agent.interactive-orchestration`,避免和 catalog agent 的 settings 页冲突。
- `pi.share` / `exportSessionToJsonl()` / Radius-then-gist 写入 sessions 三页。
- llama unloaded presets `if autoload` 写在 interactive `/model` catalog 段,权威过滤在 `extensions/llama/provider.ts`。
- 未改 `index.json` / `llms.txt` / `settings-manager.md` / `surface/config/settings.md`。
