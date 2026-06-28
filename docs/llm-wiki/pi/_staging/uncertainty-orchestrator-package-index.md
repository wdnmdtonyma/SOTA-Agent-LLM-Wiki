# uncertainty-orchestrator-package-index

本批次填充 `ref.package-index` 没有新增 `[U]`。

## 降级为 `[I]` 的判断

- `pi-coding-agent` 是把 runtime、provider 和 terminal UI 组合成产品 CLI 的 package：依赖关系可由 package metadata 直接核到，但“组合成产品 CLI”是基于 package description、dependencies 与 `spine.layered-architecture` 的归纳。
- `pi-tui` 的 `get-east-asian-width` / `marked` 分别对应 terminal width 与 Markdown rendering：依赖名和 entrypoint exports 可核到，但用途对应关系是语义归纳。
- 根 build 顺序与依赖方向相容：build script 与 package dependencies 可核到，但“相容”是跨文件推断。
- `pi-agent-core` 的 entrypoint 可支撑 `spine.layered-architecture` 中 reusable runtime API 面的归纳：导出项可核到，但与 spine 节点的对应关系不是本节点 source 直接事实。
- `pi-coding-agent` 的 entrypoint 可归纳为产品层 API 面：导出项和 CLI package description 可核到，但“产品层(product assembly)”是跨证据解释。
- `pi-orchestrator` 的 runtime model 可归纳为 experimental instance orchestration：experimental 标记与 serve/supervisor 行为可核到，但 “runtime model” 是对这些行为的概括。
- `spine.layered-architecture` / `spine.overview` 应如何使用本 catalog：这是 wiki 导览判断，不是单一源码事实。
