# uncertainty-update-4c6fb7cfe8-spine-overview

本批：`spine.overview` rewrite（target `4c6fb7cfe8`）。未安装 `node_modules`，未跑 runtime tests。

## [I] `spine.layered-architecture` 的详细职责

`spine.overview` 只保留跨包入口、13 包 inventory、build 链、CLI→Agent loop→provider 主路径，以及 MCP/codemode/durable harness 的边界一句。package dependency direction 与 reusable/product 细表由 `spine.layered-architecture` / `ref.package-index` 展开。

## [I] TUI 交互渲染细节

本节点只核到 `pi-tui` package description 与 `main()` 在 interactive mode 创建 `InteractiveMode(runtime)` 并 `run()`。fullscreen 默认、`quietStartup: "header"`、组件层不在本节点展开。

## [I] StreamFn contract 与 coding-agent wrapper 的边界张力

`packages/agent/src/types.ts` 的 `StreamFn` 注释要求 request/model/runtime 失败不得 throw/reject，须编码进 stream 的 `stopReason "error" | "aborted"`。本节点把该注释标为 `[I]`：未再逐行核 `ModelRuntime.streamSimple()` / `Agent.runWithLifecycle()` 是否仍把 auth 失败转成 throw 再折成 assistant error。

## leftover [U]

无。README All Packages 表只列 7 个用户可见库、workspace 有 13 个一阶包，按源码 inventory 写 13，不把 README 表当成完整包清单。
