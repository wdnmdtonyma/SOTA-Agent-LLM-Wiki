---
id: subsys.orchestrator.storage
title: 实例存储
kind: subsystem
tier: T2
pkg: orchestrator
source:
  - packages/orchestrator/src/storage.ts
  - packages/orchestrator/src/config.ts
  - packages/orchestrator/src/types.ts
  - packages/orchestrator/src/supervisor.ts
  - packages/orchestrator/README.md
symbols:
  - loadInstances
  - saveInstances
  - upsertInstance
related:
  - subsys.orchestrator.supervisor
  - ref.orchestrator.instance-status
evidence: explicit
status: verified
updated: 5a073885
---

> Orchestrator storage 是 experimental orchestrator 的同步 JSON 文件持久化层: 它把 machine record 与 instance records 写到 orchestrator 配置目录下, 其中 instance persistence 的权威文件是 `instances.json`。

## 能回答的问题

- orchestrator instance persistence 的文件名、目录和 JSON 形状是什么?
- `loadInstances()` 在文件不存在时返回什么, 在文件存在时怎样解析?
- `saveInstances()`、`upsertInstance()` 和 `removeInstance()` 分别怎样写入、替换或删除 instance record?
- storage 的路径依赖来自哪些环境变量?
- 这个存储层对 schema validation、并发写入和 crash consistency 做了什么或没有做什么?
- experimental orchestrator 的稳定性应该怎样标注?

## 职责边界

`packages/orchestrator/src/storage.ts` 是本地 JSON 文件 I/O helper: 它读取并解析 `machine.json`, 写入和删除 `machine.json`, 读取并解析 `instances.json`, 写入 `instances.json`, 并提供按 `InstanceRecord.id` 查找、upsert 和 remove 的 helper [E: packages/orchestrator/src/storage.ts:13] [E: packages/orchestrator/src/storage.ts:18] [E: packages/orchestrator/src/storage.ts:19] [E: packages/orchestrator/src/storage.ts:23] [E: packages/orchestrator/src/storage.ts:24] [E: packages/orchestrator/src/storage.ts:28] [E: packages/orchestrator/src/storage.ts:32] [E: packages/orchestrator/src/storage.ts:36] [E: packages/orchestrator/src/storage.ts:41] [E: packages/orchestrator/src/storage.ts:42] [E: packages/orchestrator/src/storage.ts:47] [E: packages/orchestrator/src/storage.ts:51] [E: packages/orchestrator/src/storage.ts:56] [E: packages/orchestrator/src/storage.ts:68] [E: packages/orchestrator/src/storage.ts:69]。

这个 storage 层不启动 child process、不维护 live subscriptions、不决定状态迁移 [I]; 这些行为在 `OrchestratorSupervisor` 中发生, supervisor 导入 storage helpers 并通过 `upsertInstance()`、`loadInstances()`、`saveInstances()` 和 `removeInstance()` 持久化它的运行时判断 [E: packages/orchestrator/src/supervisor.ts:12] [E: packages/orchestrator/src/supervisor.ts:72] [E: packages/orchestrator/src/supervisor.ts:87] [E: packages/orchestrator/src/supervisor.ts:194] [E: packages/orchestrator/src/supervisor.ts:246] [E: packages/orchestrator/src/supervisor.ts:254] [E: packages/orchestrator/src/supervisor.ts:285] [E: packages/orchestrator/src/supervisor.ts:316]。

Orchestrator package 本身明确标为 Experimental, CLI、API 和行为都尚未稳定, 因此本节点把 instance storage 视为 experimental persistence 而不是稳定磁盘格式承诺 [E: packages/orchestrator/README.md:3] [I]。

## 关键文件

- `packages/orchestrator/src/storage.ts`: 本节点覆盖的权威实现, 包含 `loadInstances()`、`saveInstances()`、`upsertInstance()`、`removeInstance()` 和 `ensureOrchestratorDir()` [E: packages/orchestrator/src/storage.ts:5] [E: packages/orchestrator/src/storage.ts:35] [E: packages/orchestrator/src/storage.ts:45] [E: packages/orchestrator/src/storage.ts:54] [E: packages/orchestrator/src/storage.ts:67]。
- `packages/orchestrator/src/config.ts`: storage 的路径函数来源, `getOrchestratorDir()`、`getMachinePath()` 和 `getInstancesPath()` 决定实际磁盘位置 [E: packages/orchestrator/src/config.ts:45] [E: packages/orchestrator/src/config.ts:59] [E: packages/orchestrator/src/config.ts:63]。
- `packages/orchestrator/src/types.ts`: `InstanceStatus` 和 `InstanceRecord` 定义了 `instances.json` 数组元素的 TypeScript 形状 [E: packages/orchestrator/src/types.ts:1] [E: packages/orchestrator/src/types.ts:15]。
- `packages/orchestrator/src/supervisor.ts`: storage 的主要调用者, 负责在 spawn、metadata refresh、restart recovery 和 stop 时写入或移除 records [E: packages/orchestrator/src/supervisor.ts:87] [E: packages/orchestrator/src/supervisor.ts:146] [E: packages/orchestrator/src/supervisor.ts:151] [E: packages/orchestrator/src/supervisor.ts:246] [E: packages/orchestrator/src/supervisor.ts:254] [E: packages/orchestrator/src/supervisor.ts:285] [E: packages/orchestrator/src/supervisor.ts:316]。
- `packages/orchestrator/README.md`: package 稳定性说明, 明确声明 experimental 和行为不稳定 [E: packages/orchestrator/README.md:3]。

## 数据模型

`instances.json` 的文件格式是一个 JSON array, 因为 `loadInstances()` 把整个文件 `JSON.parse(data) as InstanceRecord[]`, `saveInstances()` 接收 `InstanceRecord[]` 并把整个数组 `JSON.stringify(instances, null, 2)` 写回 [E: packages/orchestrator/src/storage.ts:41] [E: packages/orchestrator/src/storage.ts:42] [E: packages/orchestrator/src/storage.ts:45] [E: packages/orchestrator/src/storage.ts:47]。

每个 `InstanceRecord` 至少包含 `id`、`status`、`cwd` 和 `createdAt`; 可选字段包括 `lastSeenAt`、`label`、`sessionId`、`sessionFile` 与 `radiusPiId` [E: packages/orchestrator/src/types.ts:15] [E: packages/orchestrator/src/types.ts:16] [E: packages/orchestrator/src/types.ts:17] [E: packages/orchestrator/src/types.ts:18] [E: packages/orchestrator/src/types.ts:19] [E: packages/orchestrator/src/types.ts:20] [E: packages/orchestrator/src/types.ts:21] [E: packages/orchestrator/src/types.ts:22] [E: packages/orchestrator/src/types.ts:23] [E: packages/orchestrator/src/types.ts:24]。

`InstanceStatus` 的枚举值是 `"starting" | "online" | "stopping" | "stopped" | "error"`, 状态清单的权威引用节点是 [ref.orchestrator.instance-status](../../reference/instance-status.md) [E: packages/orchestrator/src/types.ts:1]。

路径依赖有三层: `PI_ORCHESTRATOR_DIR` 设置时直接作为 orchestrator directory; 否则 `PI_CONFIG_DIR` 设置时作为 `.pi` 根目录并追加 `orchestrator`; 两者都没有时使用 `join(homedir(), ".pi", "orchestrator")` [E: packages/orchestrator/src/config.ts:6] [E: packages/orchestrator/src/config.ts:7] [E: packages/orchestrator/src/config.ts:45] [E: packages/orchestrator/src/config.ts:46] [E: packages/orchestrator/src/config.ts:47] [E: packages/orchestrator/src/config.ts:48] [E: packages/orchestrator/src/config.ts:51] [E: packages/orchestrator/src/config.ts:52]。

`instances.json` 的完整路径来自 `join(getOrchestratorDir(), "instances.json")`, `machine.json` 的完整路径来自 `join(getOrchestratorDir(), "machine.json")` [E: packages/orchestrator/src/config.ts:59] [E: packages/orchestrator/src/config.ts:60] [E: packages/orchestrator/src/config.ts:63] [E: packages/orchestrator/src/config.ts:64]。

## 控制流

1. `ensureOrchestratorDir@packages/orchestrator/src/storage.ts:5` 调 `getOrchestratorDir()`, 若目录不存在则 `mkdirSync(orchestratorDir, { recursive: true })`, 因而写 machine 或 instances 前会创建目录 [E: packages/orchestrator/src/storage.ts:5] [E: packages/orchestrator/src/storage.ts:6] [E: packages/orchestrator/src/storage.ts:7] [E: packages/orchestrator/src/storage.ts:8]。
2. `loadInstances@packages/orchestrator/src/storage.ts:35` 先取 `getInstancesPath()`, 文件不存在时返回空数组; 文件存在时同步读 UTF-8 文本并直接 `JSON.parse` 成 `InstanceRecord[]` [E: packages/orchestrator/src/storage.ts:35] [E: packages/orchestrator/src/storage.ts:36] [E: packages/orchestrator/src/storage.ts:37] [E: packages/orchestrator/src/storage.ts:38] [E: packages/orchestrator/src/storage.ts:41] [E: packages/orchestrator/src/storage.ts:42]。
3. `saveInstances@packages/orchestrator/src/storage.ts:45` 先确保目录存在, 再用 two-space pretty JSON 同步覆盖 `instances.json` [E: packages/orchestrator/src/storage.ts:45] [E: packages/orchestrator/src/storage.ts:46] [E: packages/orchestrator/src/storage.ts:47]。
4. `getInstance@packages/orchestrator/src/storage.ts:50` 每次重新 `loadInstances()`, 然后用 `Array.find` 返回 `id === instanceId` 的第一条 record [E: packages/orchestrator/src/storage.ts:50] [E: packages/orchestrator/src/storage.ts:51]。
5. `upsertInstance@packages/orchestrator/src/storage.ts:54` 先加载全量数组, 用 `findIndex((existing) => existing.id === instance.id)` 定位; 找不到就 `push(instance)` 并保存, 找到就原位置替换并保存 [E: packages/orchestrator/src/storage.ts:54] [E: packages/orchestrator/src/storage.ts:55] [E: packages/orchestrator/src/storage.ts:56] [E: packages/orchestrator/src/storage.ts:57] [E: packages/orchestrator/src/storage.ts:58] [E: packages/orchestrator/src/storage.ts:59] [E: packages/orchestrator/src/storage.ts:63] [E: packages/orchestrator/src/storage.ts:64]。
6. `removeInstance@packages/orchestrator/src/storage.ts:67` 重新加载全量数组, 过滤掉 `id === instanceId` 的元素, 然后保存过滤后的数组; 停止 live instance 时 supervisor 在 finally 分支删除 live map entry 后调用它 [E: packages/orchestrator/src/storage.ts:67] [E: packages/orchestrator/src/storage.ts:68] [E: packages/orchestrator/src/storage.ts:69] [E: packages/orchestrator/src/supervisor.ts:310] [E: packages/orchestrator/src/supervisor.ts:315] [E: packages/orchestrator/src/supervisor.ts:316]。
7. `recoverAfterRestart@packages/orchestrator/src/supervisor.ts:244` 加载全部 persisted instances, 将 `"online"` 或 `"starting"` 改成 `"stopped"`, 更新 `lastSeenAt`, 断开 Radius presence, 再整批 `saveInstances(instances)` [E: packages/orchestrator/src/supervisor.ts:244] [E: packages/orchestrator/src/supervisor.ts:246] [E: packages/orchestrator/src/supervisor.ts:248] [E: packages/orchestrator/src/supervisor.ts:249] [E: packages/orchestrator/src/supervisor.ts:252] [E: packages/orchestrator/src/supervisor.ts:254]。

## 设计动机与权衡

storage 的实现选择 whole-file JSON array: `loadInstances()`/`getInstance()` 读取该数组, `saveInstances()` 整体写回该数组, `upsertInstance()`/`removeInstance()` 则先读全量数组再保存修改后的全量数组; 代码路径很短且没有额外 storage abstraction [E: packages/orchestrator/src/storage.ts:35] [E: packages/orchestrator/src/storage.ts:41] [E: packages/orchestrator/src/storage.ts:42] [E: packages/orchestrator/src/storage.ts:47] [E: packages/orchestrator/src/storage.ts:51] [E: packages/orchestrator/src/storage.ts:55] [E: packages/orchestrator/src/storage.ts:59] [E: packages/orchestrator/src/storage.ts:64] [E: packages/orchestrator/src/storage.ts:68] [E: packages/orchestrator/src/storage.ts:69] [I]。

`upsertInstance()` 以 `id` 作为匹配键, 找不到匹配项时追加 record; 找到时只替换 `findIndex` 命中的数组位置并整体覆盖该 record, storage 不做 field-level merge, 也不清理既有重复 id [E: packages/orchestrator/src/storage.ts:56] [E: packages/orchestrator/src/storage.ts:57] [E: packages/orchestrator/src/storage.ts:58] [E: packages/orchestrator/src/storage.ts:63] [I]。

`removeInstance()` 是硬删除 persisted record, 因为它把目标 id 过滤掉后保存; supervisor 的 `stopInstance()` 在返回 stopped clone 前调用 remove, 所以 stopped live instance 不会保留在 `instances.json` 中 [E: packages/orchestrator/src/storage.ts:68] [E: packages/orchestrator/src/storage.ts:69] [E: packages/orchestrator/src/supervisor.ts:310] [E: packages/orchestrator/src/supervisor.ts:316] [E: packages/orchestrator/src/supervisor.ts:318] [I]。

## Gotcha

`loadInstances()` 对存在但格式错误的 `instances.json` 没有 catch 或 fallback; `JSON.parse` 的异常会向调用者传播 [E: packages/orchestrator/src/storage.ts:41] [E: packages/orchestrator/src/storage.ts:42] [I]。

`saveInstances()` 直接 `writeFileSync(getInstancesPath(), JSON.stringify(...))`, 没有 visible temp-file rename、file lock 或 schema migration step; 因此本节点不把 crash consistency、多进程写入一致性或历史格式兼容性描述为已实现能力 [E: packages/orchestrator/src/storage.ts:47] [I]。

`ensureOrchestratorDir()` 只在保存 machine 或 instances 时调用; 纯读取路径不会创建目录, `loadInstances()` 在文件不存在时只返回 `[]` [E: packages/orchestrator/src/storage.ts:23] [E: packages/orchestrator/src/storage.ts:35] [E: packages/orchestrator/src/storage.ts:37] [E: packages/orchestrator/src/storage.ts:38] [E: packages/orchestrator/src/storage.ts:45] [E: packages/orchestrator/src/storage.ts:46]。

## 跨包边界

`subsys.orchestrator.storage` 属于 `orchestrator` package, 但它持久化的 `sessionId` 和 `sessionFile` 来自 child RPC process 的 `get_state` response; supervisor 在 spawn 期间以及特定 RPC command 后刷新这些 metadata 并写回 storage [E: packages/orchestrator/src/types.ts:22] [E: packages/orchestrator/src/types.ts:23] [E: packages/orchestrator/src/supervisor.ts:41] [E: packages/orchestrator/src/supervisor.ts:87] [E: packages/orchestrator/src/supervisor.ts:146] [E: packages/orchestrator/src/supervisor.ts:151] [E: packages/orchestrator/src/supervisor.ts:152] [E: packages/orchestrator/src/supervisor.ts:153] [E: packages/orchestrator/src/supervisor.ts:218] [E: packages/orchestrator/src/supervisor.ts:219] [E: packages/orchestrator/src/supervisor.ts:290]。

`ref.orchestrator.instance-status` 是 `InstanceStatus` 和 `InstanceRecord` 的权威 catalog 节点; 本节点只解释这些 records 如何落盘、读回、替换和移除, 不重复展开每个状态值的生命周期语义 [E: packages/orchestrator/src/types.ts:1] [E: packages/orchestrator/src/types.ts:15] [I]。

`subsys.orchestrator.supervisor` 是 storage 的主要业务调用方: 它把 live process lifecycle 投影成 persisted records, 而 storage 本身只按数组和 id 执行读写 [E: packages/orchestrator/src/supervisor.ts:72] [E: packages/orchestrator/src/supervisor.ts:87] [E: packages/orchestrator/src/supervisor.ts:194] [E: packages/orchestrator/src/supervisor.ts:285] [E: packages/orchestrator/src/supervisor.ts:316] [E: packages/orchestrator/src/storage.ts:54] [E: packages/orchestrator/src/storage.ts:67] [I]。

## Sources

- `packages/orchestrator/src/storage.ts`
- `packages/orchestrator/src/config.ts`
- `packages/orchestrator/src/types.ts`
- `packages/orchestrator/src/supervisor.ts`
- `packages/orchestrator/README.md`

## 相关

- [subsys.orchestrator.supervisor](supervisor.md): supervisor 负责 spawn/recover/stop/live RPC lifecycle, 并调用本节点的 persistence helpers。
- [ref.orchestrator.instance-status](../../reference/instance-status.md): `InstanceStatus` 与 `InstanceRecord` 字段清单的权威 catalog。
