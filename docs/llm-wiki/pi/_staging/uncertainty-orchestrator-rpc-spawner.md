# uncertainty-orchestrator-rpc-spawner

本轮没有需要上升为 `[U]` 的源码缺口;下列项目是节点正文中保留为 `[I]` 的推断或风险说明。

- `[I]` `surface.modes.rpc` 与 `subsys.orchestrator.rpc-spawner` 的边界:源码证明 orchestrator import coding-agent RPC 类型并通过 JSONL 驱动子进程,但边界归纳来自节点职责划分;protocol 细节不在本节点源码中展开。
- `[I]` experimental 稳定性: `packages/orchestrator/package.json` 明确 description 为 `experimental orchestrator package for pi`,节点把该包级描述降级为 subsystem 稳定性判断。
- `[I]` Bun binary 分支显式启动同目录 `pi` / `pi.exe` 并传 `--mode rpc`:源码给出 command/args,把它解释成“同目录 CLI binary”是路径构造语义。
- `[I]` Node/package 分支通过 `rpc-entry` 而不是 `getSpawnCommand()` 自身传 `--mode rpc`:已用 `rpc-entry.ts` 核到 entry 调用 `main(["--mode", "rpc", ...])`,但这是跨包入口语义归纳;因此节点正文只把“字面 `pi --mode rpc`”用于 Bun 分支。
- `[I]` stderrBuffer 增长、JSON.parse 未捕获、dispose 无 timeout、stray response 静默忽略等 gotcha:源码能核到对应代码路径,影响描述是风险推断。
