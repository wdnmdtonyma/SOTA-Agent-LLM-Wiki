# uncertainty · client-hmr

- **官方 client-modules 页与 web-app patch 冲突。** `docs/subsystems/client-modules.md`（及 `.zh.md`）写 production graphs omit the HMR row。`packages/bundle/web-app/cordis.patch.yml` 无条件 `insert` `id: client-hmr`。wiki 跟代码：行始终在树上；没有 rebuild watcher 时 poll 空闲。不把官方页当 `[E]`。

- **伴随 invariant 的可观测量过时。** `packages/client/hmr/src/invariant.ts` 用 `process.getActiveResourcesInfo()` 里的 `StatWatcher` 数作为「bundle stat watcher 必须随 fiber 死掉」的代理，注释仍写 `fs.watchFile`。现行 `packages/client/hmr/src/index.ts` 的监视是 `setInterval` + `statSync`，不会产生 `StatWatcher`。行为测试（`node-half.client.spec.ts` dispose 后再写文件不再 `rebuilt`）仍成立；invariant 在当前实现上几乎是空核。
