# uncertainty: subsys.orchestrator.storage

本轮未新增 `[U]`。`storage.ts`、`config.ts`、`types.ts`、`supervisor.ts` 和 `packages/orchestrator/README.md` 足以核验 instance persistence 的文件格式、读写路径、upsert/remove 行为、路径依赖与 experimental 稳定性。

本轮改正/降级的内容主要是: 把 storage 只做本地 I/O 的概括标成解释性判断并把证据挪到实际读写行; 把 supervisor 调用证据挪到导入和调用行; 把 whole-file JSON array 的表述改成 load/get 读数组、save/upsert/remove 写回数组; 把 `upsertInstance()` 的“唯一键”降为源码可证的“匹配键”, 并明确它不清理既有重复 id; 把 `ensureOrchestratorDir()` 的保存路径证据挪到实际调用行; 把 session metadata “只在特定 RPC command 后刷新”改成 spawn 期间以及特定 RPC command 后刷新。

仍保留为 `[I]` 的内容主要是解释性判断: whole-file JSON array 是一种简化存储取舍; storage.ts 没有 process/subscription/status-transition 逻辑; `upsertInstance()` 不做 field-level merge; `removeInstance()` 对 persisted record 执行硬删除后 stopped record 不保留在 `instances.json`; `loadInstances()` 的 parse error 会传播; `saveInstances()` 未展示 temp-file rename、file lock、schema migration, 因而不宣称 crash consistency、多进程写入一致性或历史格式兼容性; `ref.orchestrator.instance-status` 承担状态语义 catalog, 本节点只覆盖落盘行为。
