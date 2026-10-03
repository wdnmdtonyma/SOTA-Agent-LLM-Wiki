# uncertainty-update-4c6fb7cfe8-codemode-runtime

本批：`subsys.codemode.runtime`。

未安装上游 `node_modules`，没有跑 `packages/codemode` 的 vitest，不宣称 sandbox / source / declarations 测试在本机通过。[U]

## [I]

- `memoryLimitBytes` 省略时 host 传 `undefined` 给 `QuickJS.create({ memoryLimit })`。types 注释写默认不超过 wasm32 的 4 GiB；源码没有把 4 GiB 写成常量。
- README 写每轮 worker+VM 大约 20 ms，源码没有该数字。
- 嵌套 tool 不进 LLM context 是本包结果形状（`output` / `value` / 无 payload 的 `calls`）加上 README 约定。coding-agent 如何把 `CodemodeResult` 投影进 session / provider 消息由 `subsys.coding-agent.codemode` 覆盖，本节点未读 `packages/coding-agent/src/extensions/codemode/**`。
- Prelude 缺 tool 提示语里的 `searchTools(query)` 只是字符串；本包不实现该函数。是否由 coding-agent 注入为 tool/global，本节点不核。

## [U]

- 未跑 runtime tests：output/store 上限、Bun interrupt、`timeoutMs: Infinity`、identifier 碰撞在 target HEAD 是否全绿，本 filler 未核。
- 动态 `import("node:fs")` 测试只断言不会成功，没有钉死错误类型。
