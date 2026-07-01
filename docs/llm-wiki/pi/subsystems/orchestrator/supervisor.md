---
id: subsys.orchestrator.supervisor
title: 多实例监督(experimental)
kind: subsystem
tier: T2
pkg: orchestrator
source:
  - packages/orchestrator/src/supervisor.ts
symbols:
  - OrchestratorSupervisor
  - spawnInstance
  - LiveInstance
related:
  - subsys.orchestrator.rpc-spawner
  - subsys.orchestrator.storage
evidence: explicit
status: verified
updated: 8c943640
---

> `subsys.orchestrator.supervisor` 是 `@earendil-works/pi-orchestrator` 的实验性多实例 supervisor:它把每个 live Pi instance 绑定到一个 coding-agent RPC 子进程、一个持久化 `InstanceRecord`、一组 event subscribers 和可选 Radius presence。[E: packages/orchestrator/package.json:4][E: packages/orchestrator/src/supervisor.ts:16][E: packages/orchestrator/src/supervisor.ts:17][E: packages/orchestrator/src/supervisor.ts:22][E: packages/orchestrator/src/supervisor.ts:24][E: packages/orchestrator/src/supervisor.ts:63][E: packages/orchestrator/src/supervisor.ts:64][E: packages/orchestrator/src/supervisor.ts:288][E: packages/orchestrator/src/supervisor.ts:289]

## 能回答的问题

- `OrchestratorSupervisor` 如何从 `spawnInstance()` 建立一个受监督的 Pi instance?
- supervisor 如何把 RPC 子进程事件、extension UI request 和 command response 转给上层 IPC handler?
- instance record 什么时候写入 `instances.json`,什么时候只保留在 live map?
- orchestrator 重启后为什么不会恢复原来的 RPC 子进程?
- Radius 云端 registration、heartbeat 和 disconnect 在 supervisor 生命周期里何时触发?
- `--mode rpc` 子进程和 IPC Unix socket 分别属于哪个边界?

## 职责边界与稳定性

`@earendil-works/pi-orchestrator` 的 package description 明确写作 "experimental orchestrator package for pi",所以该 subsystem 的稳定性应标为 experimental,不能把当前 API 描述成长期兼容契约。[E: packages/orchestrator/package.json:2][E: packages/orchestrator/package.json:4] `OrchestratorSupervisor` 只管理当前 orchestrator 进程内的 live instances:内存状态保存在 `liveInstances: Map<string, LiveInstance>`,持久状态通过 storage helpers 写入实例记录。[E: packages/orchestrator/src/supervisor.ts:63][E: packages/orchestrator/src/supervisor.ts:64][E: packages/orchestrator/src/supervisor.ts:72][E: packages/orchestrator/src/supervisor.ts:87]

`OrchestratorSupervisor` 不直接监听 IPC Unix socket;`serve()` 通过 `getSocketPath()` 得到 socket path 并调用 `startIpcServer(...)`,再把 `handleIpcRequest`/`openRpcStream` 接给 IPC server。[E: packages/orchestrator/src/config.ts:67][E: packages/orchestrator/src/config.ts:68][E: packages/orchestrator/src/serve.ts:9][E: packages/orchestrator/src/serve.ts:10][E: packages/orchestrator/src/serve.ts:12][E: packages/orchestrator/src/serve.ts:13][E: packages/orchestrator/src/serve.ts:14] IPC request handler 是 supervisor 的上层 adapter:`spawn` 调 `supervisor.spawnInstance`, `stop` 调 `supervisor.stopInstance`, `rpc` 调 `supervisor.handleRpc`, `rpc_stream` 先返回 ready 再由 `openRpcStream()` 建立长连接桥。[E: packages/orchestrator/src/handler.ts:57][E: packages/orchestrator/src/handler.ts:59][E: packages/orchestrator/src/handler.ts:60][E: packages/orchestrator/src/handler.ts:92][E: packages/orchestrator/src/handler.ts:93][E: packages/orchestrator/src/handler.ts:105][E: packages/orchestrator/src/handler.ts:106][E: packages/orchestrator/src/handler.ts:118][E: packages/orchestrator/src/handler.ts:123][E: packages/orchestrator/src/handler.ts:124][E: packages/orchestrator/src/handler.ts:132][E: packages/orchestrator/src/handler.ts:143]

重启恢复是 conservative: `recoverAfterRestart()` 把持久记录里 `online` 或 `starting` 的 instance 改成 `stopped`,更新 `lastSeenAt`,逐个调用 Radius disconnect,再保存记录;该方法没有重建 RPC 子进程或重新注册 live map。[E: packages/orchestrator/src/supervisor.ts:244][E: packages/orchestrator/src/supervisor.ts:246][E: packages/orchestrator/src/supervisor.ts:248][E: packages/orchestrator/src/supervisor.ts:249][E: packages/orchestrator/src/supervisor.ts:252][E: packages/orchestrator/src/supervisor.ts:254][I]

## 关键文件与实体

`packages/orchestrator/src/supervisor.ts` 定义 `LiveInstanceResources`,其中 `rpcProcess` 是可选 `RpcProcessInstance`, `radiusPiId` 和 `sessionId` 是 supervisor 追踪的外部/会话资源标识。[E: packages/orchestrator/src/supervisor.ts:15][E: packages/orchestrator/src/supervisor.ts:16][E: packages/orchestrator/src/supervisor.ts:17][E: packages/orchestrator/src/supervisor.ts:18] `LiveInstance` 把 `InstanceRecord`、resources、event subscribers、可选 UI request handler、event unsubscribe 和 exit unsubscribe 放在同一个内存对象里。[E: packages/orchestrator/src/supervisor.ts:21][E: packages/orchestrator/src/supervisor.ts:22][E: packages/orchestrator/src/supervisor.ts:23][E: packages/orchestrator/src/supervisor.ts:24][E: packages/orchestrator/src/supervisor.ts:25][E: packages/orchestrator/src/supervisor.ts:26][E: packages/orchestrator/src/supervisor.ts:27]

`SESSION_METADATA_COMMANDS` 是 supervisor 认为可能改变持久 session metadata 的 RPC command 集合,当前包含 `new_session`、`switch_session`、`fork`、`clone`、`set_session_name` 和 `prompt`。[E: packages/orchestrator/src/supervisor.ts:41][E: packages/orchestrator/src/supervisor.ts:42][E: packages/orchestrator/src/supervisor.ts:43][E: packages/orchestrator/src/supervisor.ts:44][E: packages/orchestrator/src/supervisor.ts:45][E: packages/orchestrator/src/supervisor.ts:46][E: packages/orchestrator/src/supervisor.ts:47] `shouldRefreshSessionMetadata(command)` 只按该 set 检查 command type,命中后才触发后续 `get_state` 同步。[E: packages/orchestrator/src/supervisor.ts:50][E: packages/orchestrator/src/supervisor.ts:51][E: packages/orchestrator/src/supervisor.ts:218][E: packages/orchestrator/src/supervisor.ts:219][E: packages/orchestrator/src/supervisor.ts:329][E: packages/orchestrator/src/supervisor.ts:330]

## 数据模型

`InstanceStatus` 的枚举值是 `starting | online | stopping | stopped | error`;`InstanceRecord` 包含 `id`、`status`、`cwd`、`createdAt`,以及可选 `lastSeenAt`、`label`、`sessionId`、`sessionFile`、`radiusPiId`。[E: packages/orchestrator/src/types.ts:1][E: packages/orchestrator/src/types.ts:15][E: packages/orchestrator/src/types.ts:16][E: packages/orchestrator/src/types.ts:17][E: packages/orchestrator/src/types.ts:18][E: packages/orchestrator/src/types.ts:19][E: packages/orchestrator/src/types.ts:20][E: packages/orchestrator/src/types.ts:21][E: packages/orchestrator/src/types.ts:22][E: packages/orchestrator/src/types.ts:23][E: packages/orchestrator/src/types.ts:24]

持久化由 `subsys.orchestrator.storage` 覆盖:storage helpers 在 `getInstancesPath()` 指向的 JSON 文件读写 `InstanceRecord[]`,缺文件时 `loadInstances()` 返回空数组,`upsertInstance()` 按 `id` 插入或替换,`removeInstance()` 过滤掉指定 id 后保存。[E: packages/orchestrator/src/storage.ts:35][E: packages/orchestrator/src/storage.ts:36][E: packages/orchestrator/src/storage.ts:37][E: packages/orchestrator/src/storage.ts:38][E: packages/orchestrator/src/storage.ts:41][E: packages/orchestrator/src/storage.ts:42][E: packages/orchestrator/src/storage.ts:45][E: packages/orchestrator/src/storage.ts:47][E: packages/orchestrator/src/storage.ts:54][E: packages/orchestrator/src/storage.ts:56][E: packages/orchestrator/src/storage.ts:58][E: packages/orchestrator/src/storage.ts:59][E: packages/orchestrator/src/storage.ts:63][E: packages/orchestrator/src/storage.ts:64][E: packages/orchestrator/src/storage.ts:67][E: packages/orchestrator/src/storage.ts:68][E: packages/orchestrator/src/storage.ts:69]

## 控制流

1. `spawnInstance(options)@packages/orchestrator/src/supervisor.ts:270` 生成当前时间,构造 `LiveInstance` record:UUID id、`starting` status、`cwd`、`createdAt`、`lastSeenAt` 和可选 label。[E: packages/orchestrator/src/supervisor.ts:270][E: packages/orchestrator/src/supervisor.ts:271][E: packages/orchestrator/src/supervisor.ts:272][E: packages/orchestrator/src/supervisor.ts:274][E: packages/orchestrator/src/supervisor.ts:275][E: packages/orchestrator/src/supervisor.ts:276][E: packages/orchestrator/src/supervisor.ts:277][E: packages/orchestrator/src/supervisor.ts:278][E: packages/orchestrator/src/supervisor.ts:279]
2. `spawnInstance()` 先把 live object 放入 `liveInstances`,再 `upsertInstance(live.record)` 写入 starting record。[E: packages/orchestrator/src/supervisor.ts:284][E: packages/orchestrator/src/supervisor.ts:285]
3. `spawnInstance()` 调 `createRpcProcessInstance({ cwd })`,再用 `bindRpcProcess()` 绑定 event、exit 和 extension UI request handler。[E: packages/orchestrator/src/supervisor.ts:288][E: packages/orchestrator/src/supervisor.ts:289] 具体 RPC 进程生成属于 `subsys.orchestrator.rpc-spawner`:Bun compiled binary 路径使用 `pi --mode rpc`,非 Bun 路径执行 `@earendil-works/pi-coding-agent/rpc-entry`,而 `rpc-entry` 自身调用 `main(["--mode", "rpc", ...])`。[E: packages/orchestrator/src/rpc-process.ts:50][E: packages/orchestrator/src/rpc-process.ts:51][E: packages/orchestrator/src/rpc-process.ts:53][E: packages/orchestrator/src/rpc-process.ts:54][E: packages/orchestrator/src/rpc-process.ts:58][E: packages/orchestrator/src/rpc-process.ts:59][E: packages/coding-agent/src/rpc-entry.ts:12]
4. `syncInstanceRecord()` 对 RPC 子进程发送 `{ type: "get_state" }`;只有 response 被 `isGetStateSuccess()` 判定为 `get_state` success 时,才把 `sessionId` 和 `sessionFile` 写回 record。[E: packages/orchestrator/src/supervisor.ts:140][E: packages/orchestrator/src/supervisor.ts:146][E: packages/orchestrator/src/supervisor.ts:147][E: packages/orchestrator/src/supervisor.ts:151][E: packages/orchestrator/src/supervisor.ts:152][E: packages/orchestrator/src/supervisor.ts:153]
5. `spawnInstance()` 调 `radiusPresence.registerPi(live.record)`,用返回 record 的 `radiusPiId` 更新 local record,然后把 status 设为 `online` 并返回 clone。[E: packages/orchestrator/src/supervisor.ts:291][E: packages/orchestrator/src/supervisor.ts:292][E: packages/orchestrator/src/supervisor.ts:293][E: packages/orchestrator/src/supervisor.ts:294] Radius registration 本身只在 `isRadiusEnabled()` 为 true 时执行远端 `pis/register`;未启用时 `registerPi()` 直接返回原 instance。[E: packages/orchestrator/src/radius.ts:194][E: packages/orchestrator/src/radius.ts:195][E: packages/orchestrator/src/radius.ts:196][E: packages/orchestrator/src/radius.ts:202][E: packages/orchestrator/src/radius.ts:208][E: packages/orchestrator/src/radius.ts:209][E: packages/orchestrator/src/radius.ts:212][E: packages/orchestrator/src/radius.ts:213]
6. `openRpcStream(instanceId, ...)` 查 live map 和 RPC process,失败返回 `undefined`;成功后把 caller 的 event callback 加入 subscribers,把 live 的 `onUiRequest` 指向当前 stream,并返回 `handleRpc`、`handleUiResponse`、`close` 三个闭包。[E: packages/orchestrator/src/supervisor.ts:197][E: packages/orchestrator/src/supervisor.ts:208][E: packages/orchestrator/src/supervisor.ts:209][E: packages/orchestrator/src/supervisor.ts:210][E: packages/orchestrator/src/supervisor.ts:211][E: packages/orchestrator/src/supervisor.ts:213][E: packages/orchestrator/src/supervisor.ts:214][E: packages/orchestrator/src/supervisor.ts:216][E: packages/orchestrator/src/supervisor.ts:223][E: packages/orchestrator/src/supervisor.ts:226]
7. `handleRpc(instanceId, command)` 是单次 RPC bridge:它找到 live RPC process 后 `send(command)`,并对 session metadata command 做一次 `syncInstanceRecord()`。[E: packages/orchestrator/src/supervisor.ts:321][E: packages/orchestrator/src/supervisor.ts:322][E: packages/orchestrator/src/supervisor.ts:323][E: packages/orchestrator/src/supervisor.ts:324][E: packages/orchestrator/src/supervisor.ts:328][E: packages/orchestrator/src/supervisor.ts:329][E: packages/orchestrator/src/supervisor.ts:330][E: packages/orchestrator/src/supervisor.ts:332]
8. `stopInstance(instanceId)` 把 live record 设为 `stopping`,调用 `cleanupAcquiredResources()`,然后把返回用 record 改成 `stopped`,从 live map 删除 instance,并从 storage 删除该 id。[E: packages/orchestrator/src/supervisor.ts:300][E: packages/orchestrator/src/supervisor.ts:306][E: packages/orchestrator/src/supervisor.ts:308][E: packages/orchestrator/src/supervisor.ts:312][E: packages/orchestrator/src/supervisor.ts:315][E: packages/orchestrator/src/supervisor.ts:316][E: packages/orchestrator/src/supervisor.ts:318]

## 设计动机与权衡

`bindRpcProcess()` 每次绑定前先 `clearBindings()`,避免旧 event subscription、exit subscription 和 UI request handler 继续挂在旧 RPC process 上。[E: packages/orchestrator/src/supervisor.ts:90][E: packages/orchestrator/src/supervisor.ts:91][E: packages/orchestrator/src/supervisor.ts:92][E: packages/orchestrator/src/supervisor.ts:95][E: packages/orchestrator/src/supervisor.ts:96][E: packages/orchestrator/src/supervisor.ts:99][E: packages/orchestrator/src/supervisor.ts:100] RPC process event fan-out 是 per-instance subscribers set:收到 event 后逐个调用 subscriber;extension UI request 不是 set,而是当前 `live.onUiRequest` 单槽转发。[E: packages/orchestrator/src/supervisor.ts:102][E: packages/orchestrator/src/supervisor.ts:103][E: packages/orchestrator/src/supervisor.ts:104][E: packages/orchestrator/src/supervisor.ts:110][E: packages/orchestrator/src/supervisor.ts:111]

`handleUnexpectedRpcExit()` 只处理仍然绑定到 live map 的 current live object,且跳过 `stopping` 或 `stopped` 状态;非预期 exit 会把 status 设为 `error`,清理 bindings,清空 RPC process,尽力 disconnect Radius,然后从 live map 删除 instance。[E: packages/orchestrator/src/supervisor.ts:115][E: packages/orchestrator/src/supervisor.ts:116][E: packages/orchestrator/src/supervisor.ts:119][E: packages/orchestrator/src/supervisor.ts:122][E: packages/orchestrator/src/supervisor.ts:123][E: packages/orchestrator/src/supervisor.ts:124][E: packages/orchestrator/src/supervisor.ts:125][E: packages/orchestrator/src/supervisor.ts:127][E: packages/orchestrator/src/supervisor.ts:128][E: packages/orchestrator/src/supervisor.ts:133]

Radius 的 supervisor coupling 是双向但显式:supervisor 在 spawn/exit/cleanup/recovery 时调用 `radiusPresence`,同时 module 底部把 singleton supervisor 作为 Radius coordinator,供 Radius 读取 live instance、列出 live instances、回写 instance record。[E: packages/orchestrator/src/supervisor.ts:291][E: packages/orchestrator/src/supervisor.ts:127][E: packages/orchestrator/src/supervisor.ts:161][E: packages/orchestrator/src/supervisor.ts:252][E: packages/orchestrator/src/supervisor.ts:344][E: packages/orchestrator/src/supervisor.ts:345][E: packages/orchestrator/src/supervisor.ts:348][E: packages/orchestrator/src/supervisor.ts:351]

## Gotcha

显式 stop 和 spawn 失败的持久化结果不同: `stopInstance()` 最终 `removeInstance(instanceId)`,所以正常停止后 storage 不再保留该 id;`failSpawn()` 先设 `error`,清理资源,再设 `stopped` 并删除 live map,但没有调用 `removeInstance()`,因此失败 spawn 可能留下 `stopped` record。[E: packages/orchestrator/src/supervisor.ts:176][E: packages/orchestrator/src/supervisor.ts:177][E: packages/orchestrator/src/supervisor.ts:179][E: packages/orchestrator/src/supervisor.ts:181][E: packages/orchestrator/src/supervisor.ts:182][E: packages/orchestrator/src/supervisor.ts:306][E: packages/orchestrator/src/supervisor.ts:316][I]

`openRpcStream()` 支持多个 event subscribers,但 `onUiRequest` 是 `LiveInstance` 上的单个可选函数;后打开的 stream 会覆盖 UI request handler,关闭时只有匹配当前 handler 的 stream 才会清空该槽。[E: packages/orchestrator/src/supervisor.ts:24][E: packages/orchestrator/src/supervisor.ts:25][E: packages/orchestrator/src/supervisor.ts:213][E: packages/orchestrator/src/supervisor.ts:214][E: packages/orchestrator/src/supervisor.ts:227][E: packages/orchestrator/src/supervisor.ts:228][E: packages/orchestrator/src/supervisor.ts:230]

Radius enabled 的前提不是 supervisor 自己决定的: `isRadiusEnabled()` 只检查 stored Radius credential 或 `PI_RADIUS_API_KEY`,`serve()` 在 enabled 时调用 `radiusPresence.start()` 注册 machine;`registerPi()` 在 enabled 但找不到 registered machine 时会抛出 "No registered machine available for Pi registration"。[E: packages/orchestrator/src/radius.ts:144][E: packages/orchestrator/src/radius.ts:145][E: packages/orchestrator/src/serve.ts:20][E: packages/orchestrator/src/serve.ts:21][E: packages/orchestrator/src/radius.ts:198][E: packages/orchestrator/src/radius.ts:199][E: packages/orchestrator/src/radius.ts:200]

## 跨包边界

`subsys.orchestrator.rpc-spawner` 负责 `RpcProcessInstance` 的 child process、stdio JSONL parsing、pending response map、event fan-out 和 process disposal。[E: packages/orchestrator/src/rpc-process.ts:39][E: packages/orchestrator/src/rpc-process.ts:42][E: packages/orchestrator/src/rpc-process.ts:102][E: packages/orchestrator/src/rpc-process.ts:150][E: packages/orchestrator/src/rpc-process.ts:123][E: packages/orchestrator/src/rpc-process.ts:124][E: packages/orchestrator/src/rpc-process.ts:186][E: packages/orchestrator/src/rpc-process.ts:192] supervisor 在 live resources 中持有 `RpcProcessInstance`,并通过 `send()`、`onEvent()`、`onExit()`、`handleUiResponse()` 与它交互。[E: packages/orchestrator/src/supervisor.ts:16][E: packages/orchestrator/src/supervisor.ts:101][E: packages/orchestrator/src/supervisor.ts:102][E: packages/orchestrator/src/supervisor.ts:107][E: packages/orchestrator/src/supervisor.ts:217][E: packages/orchestrator/src/supervisor.ts:224]

`surface.modes.rpc` 属于 `@earendil-works/pi-coding-agent`:RPC mode 把 extension binding mode 标为 `"rpc"` 并把 session events 输出到 stdout;orchestrator supervisor 只是该 headless surface 的 host,通过 child process stdin/stdout 间接使用 coding-agent。[E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:318][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:320][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:354][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:355][E: packages/orchestrator/src/rpc-process.ts:39][E: packages/orchestrator/src/rpc-process.ts:42][I]

`subsys.orchestrator.storage` 负责 `instances.json` 的 load/save/upsert/remove;supervisor 的 `setStatus()`、`updateRecord()`、`listInstances()`、`getInstance()` 和 restart recovery 都通过这些 helpers 读写持久 record。[E: packages/orchestrator/src/storage.ts:35][E: packages/orchestrator/src/storage.ts:45][E: packages/orchestrator/src/storage.ts:54][E: packages/orchestrator/src/storage.ts:67][E: packages/orchestrator/src/supervisor.ts:72][E: packages/orchestrator/src/supervisor.ts:87][E: packages/orchestrator/src/supervisor.ts:246][E: packages/orchestrator/src/supervisor.ts:254][E: packages/orchestrator/src/supervisor.ts:257][E: packages/orchestrator/src/supervisor.ts:258][E: packages/orchestrator/src/supervisor.ts:266]

`subsys.orchestrator.radius` 负责 Radius cloud API、machine registration、Pi registration、heartbeats 和 disconnect;supervisor 只在 lifecycle 边界调用 `registerPi()`/`disconnectPi()` 并暴露 coordinator callbacks。[E: packages/orchestrator/src/radius.ts:166][E: packages/orchestrator/src/radius.ts:167][E: packages/orchestrator/src/radius.ts:194][E: packages/orchestrator/src/radius.ts:202][E: packages/orchestrator/src/radius.ts:213][E: packages/orchestrator/src/radius.ts:217][E: packages/orchestrator/src/radius.ts:229][E: packages/orchestrator/src/supervisor.ts:291][E: packages/orchestrator/src/supervisor.ts:344]

## Sources

- packages/orchestrator/src/supervisor.ts
- packages/orchestrator/src/rpc-process.ts
- packages/orchestrator/src/radius.ts
- packages/orchestrator/src/config.ts
- packages/orchestrator/src/serve.ts
- packages/orchestrator/src/handler.ts
- packages/orchestrator/src/storage.ts
- packages/orchestrator/src/types.ts
- packages/orchestrator/package.json
- packages/coding-agent/src/rpc-entry.ts
- packages/coding-agent/src/modes/rpc/rpc-mode.ts

## 相关

- [subsys.orchestrator.rpc-spawner](rpc-spawner.md) - `RpcProcessInstance` 如何启动并驱动 coding-agent RPC 子进程。
- [subsys.orchestrator.storage](storage.md) - `instances.json` 和 machine record 的持久化 helpers。
- [surface.modes.rpc](../../surface/modes/rpc.md) - coding-agent 的 `--mode rpc` headless JSONL surface。
- [subsys.orchestrator.radius](radius.md) - Radius cloud registration、heartbeat 和 disconnect 的实现边界。
