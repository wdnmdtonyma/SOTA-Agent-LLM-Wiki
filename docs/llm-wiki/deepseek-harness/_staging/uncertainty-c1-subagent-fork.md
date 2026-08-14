# uncertainty · C1 · surface.tools.subagent-fork

- **shipped fork 的 `backgroundMode` 意图**：`packages/bundle/base/cordis.patch.yml` 的 host 行是 `backgroundMode: one-shot`。三个 shipped preset（`standard` / `code` / `cordis`）把同一 `id: tool-subagent-fork` 写成 `continuable`。`packages/subagent/subagent-fork-in-process/src/index.ts` 的 `prepareContinuable` TODO 仍写「no shipped composition calls this — they bind fork to `backgroundMode: one-shot`」。三处文件同时存在；哪一份是当前产品意图未核。wiki Preset 表只认四个 `agent.cordis.yml`。
