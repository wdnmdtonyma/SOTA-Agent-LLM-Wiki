# uncertainty: coding-agent footer-data-provider

本轮填充 `subsys.coding-agent.footer-data-provider` 时发现 1 个需要保留为 `[U]` 的源码不确定项:

- `.invalid` branch name 的外部来源未在 `packages/coding-agent/src/core/footer-data-provider.ts` 中解释。源码能确认 `.invalid` 会 fallback 到 `git symbolic-ref --quiet --short HEAD`, fallback 失败时返回 `"detached"`, 但不能仅凭本文件确认是谁或哪种 git backend 会把 `HEAD` branch 写成 `.invalid`。

保留为 `[I]` 的内容主要是设计层推断: lazy sync branch cache + debounced async refresh 的 UI 目的、watch directory/WSL polling/reftable watcher 的兼容性取舍、read-only provider 对 extension footer component 的能力边界、live map view 的调用方影响、available provider count 的语义正确性来自调用方, 以及 interactive orchestration planned 节点应覆盖的调用侧 wiring。
