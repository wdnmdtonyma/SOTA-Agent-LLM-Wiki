# uncertainty-orchestrator-config

- `subsys.orchestrator.config`: `socket 与 JSON state 文件共享一个 orchestrator dir` 是源码明确事实,但“没有展示跨进程锁或迁移策略”只基于本节点 source 未见相关逻辑;真正的锁/清理语义需要 `subsys.orchestrator.ipc-transport` 和 storage 节点继续核验。[U]
- `subsys.orchestrator.config`: `rpc-stream` stdin loop 对无效 JSON line 的进程级表现未跑集成测试;源码显示 loop 内直接 `JSON.parse(line)`,但具体 unhandled exception/exit 行为需测试确认。[U]
- `subsys.orchestrator.config`: `isBunBinary` 对未来 Bun compiled binary virtual path 的兼容性未知;当前只能证实它匹配 `"$bunfs"`, `"~BUN"`, `"%7EBUN"` 三种字符串片段。[U]
