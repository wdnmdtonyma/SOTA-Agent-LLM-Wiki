# TUI batch uncertainty — `9ded177ce7`

本批次 assigned TUI 节点没有留下未核证的 `[U]`。

## Remaining `[I]`

- `config.ui-tui`: `ConfigToml` 顶层 `pub` 字段从 96 变成 97；本节点只覆盖其中 12 个 key。其它 config catalog 节点是否已覆盖第 97 个字段，本批次未核。
- `subsys.tui.streaming-pipeline`: chunking policy 的 non-responsibilities（不看 source identity / 不 mutate UI）是从代码边界推断，不是单独的 policy contract 类型。
- `subsys.tui.event-system`: stale history/usage response 按 request/log identity 丢弃，是跨多个 async 完成路径的共性，不是单一 helper。
- `subsys.tui.rendering-theming`: `set_theme_override` 二次调用不改 OnceLock 值，但已初始化 theme 仍会 live-update。

## Verified, not `[U]`

- TUI 仍没有 thread-section CRUD UI。resume picker / named lookup / agent picker 都发 `section_id: None`；`ThreadSortKey::SectionPosition` 只当 Updated 处理。
- `/export` 已存在，不是未实现面。
- first-login 会 delay composer；非 first-login 的 startup composer 可编辑但不可提交。
