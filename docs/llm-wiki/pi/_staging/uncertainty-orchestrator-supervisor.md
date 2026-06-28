# uncertainty-orchestrator-supervisor

## 本轮 [U]

- 无。`subsys.orchestrator.supervisor` 中无法完全由 `packages/orchestrator/src/supervisor.ts` 单文件说明的 `--mode rpc`、IPC Unix socket、Radius enabled/registration 事实,已改用相邻源码文件落 `[E]`;对源码控制流含义的解释保留为 `[I]`。

## 本轮 [I]

- `recoverAfterRestart()` 不重建 RPC 子进程或 live map:源码只加载并保存 records、disconnect Radius,未出现 spawn/bind live process 的调用。
- `failSpawn()` 可能留下 `stopped` record:源码路径没有 `removeInstance()`;这是从 `setStatus()` 会 upsert 和 fail path 未删除 storage record 推导。
- `surface.modes.rpc` 是 orchestrator child process 的 headless host surface:该关系由 `rpc-process.ts` 的 spawn/stdin/stdout 与 coding-agent `rpc-mode.ts` 的 stdout event 输出共同推导。
