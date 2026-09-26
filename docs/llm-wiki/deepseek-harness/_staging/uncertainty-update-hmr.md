# uncertainty · update · client-hmr @ 477b4f4205

- **伴随 invariant 仍数 `StatWatcher`。** `packages/client/hmr/src/invariant.ts` 注释与计数仍按 `fs.watchFile`。现行 node 半边是 `setInterval` + `statSync`，不会产生 `StatWatcher`。行为测试（dispose 后再写文件不再 `rebuilt`）仍成立。页内标 `[U]`。与既有 `_staging/uncertainty-i-hmr.md` 同一笔。

- **浏览器现消费 `graph` 帧。** 旧页写「忽略 graph 帧」。现行 `packages/client/hmr/src/client/index.ts` 把 `graph` 交给 `entries.sync`、`rebuilt` 交给 `entries.reload`。已改正，不进 uncertainty。
