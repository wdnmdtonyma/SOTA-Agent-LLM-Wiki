# uncertainty · E · subsys.orchestration.subagent-fork

- **shipped fork 的 `backgroundMode` 意图**：`packages/bundle/base/cordis.patch.yml` 的 host 行 `id: tool-subagent-fork` 是 `backgroundMode: one-shot`。三个 shipped preset（`standard` / `code` / `cordis`）把同一 `id` 写成 `continuable`。`packages/subagent/subagent-fork-in-process/src/index.ts` 的 `prepareContinuable` 上方 TODO 仍写「no shipped composition calls this — they bind fork to `backgroundMode: one-shot`」。三处同时存在；哪一份是当前产品意图未核。本页两边都写，不把 host 默认抄成 preset 行为。
