# uncertainty: subsys.coding-agent.codemode @ 4c6fb7cfe8

节点: `subsys.coding-agent.codemode`

## [U]

- Windows worker 相对路径回归 (`#10204`) 只覆盖 `bun-binary` + `file:///B:/~BUN/root/config.js` → `./src/extensions/codemode/worker.ts`。`bundled-node` 仍构造 `new URL("./codemode-worker.js", moduleUrl)`，`unbundled` 回落 `pi-codemode` 的 `defaultWorkerUrl()`（`file:` URL）。这两条路径在 Windows 上是否也会撞 Bun 1.3 的绝对 `B:\~BUN` 映射失败，本树没有对应测试。

## [I]

- `Bm25Ranker.rank()` 对同分文档依赖 `Array.sort` 稳定性；源码注释写 “Ties keep document order”，实现没有显式 tie-break 字段。
- `omitReplacedExtensions` 的 `taken` 只收 `!replaceable` 扩展：两个 replaceable 扩展注册同名 tool 时两边都会留下。产品意图是「第三方非 replaceable 顶替 builtin」，不是 replaceable 互斥。
