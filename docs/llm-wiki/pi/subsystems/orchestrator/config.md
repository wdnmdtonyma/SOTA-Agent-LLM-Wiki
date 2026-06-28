---
id: subsys.orchestrator.config
title: orchestrator 配置与路径
kind: subsystem
tier: T2
pkg: orchestrator
source:
  - packages/orchestrator/src/config.ts
  - packages/orchestrator/src/cli.ts
  - packages/orchestrator/src/types.ts
  - packages/orchestrator/package.json
symbols:
  - getOrchestratorDir
  - getSocketPath
  - isBunBinary
related:
  - subsys.orchestrator.storage
  - subsys.orchestrator.ipc-transport
  - surface.modes.rpc
  - ref.coding-agent.rpc-methods
evidence: explicit
status: verified
updated: 5a073885
---

> `subsys.orchestrator.config` 描述 experimental `pi-orchestrator` 的本地路径 contract:配置根目录如何由 env 解析,auth/machine/instances/socket 文件如何派生,CLI 如何使用 socket,以及公开类型如何约束 instance metadata。

## 能回答的问题

- orchestrator 的配置目录默认在哪里,`PI_ORCHESTRATOR_DIR` 和 `PI_CONFIG_DIR` 谁优先?
- Unix socket path 是怎样从配置目录派生出来的?
- auth、machine、instances 三个 JSON 文件的固定文件名是什么?
- `orchestrator` CLI 有哪些子命令,哪些命令会连接 socket?
- `InstanceRecord` 和 `MachineRecord` 公开哪些 instance/machine metadata 字段?
- `isBunBinary` 用什么信号判断当前代码运行在 Bun compiled binary 里?

## 职责边界

本节点只覆盖 `packages/orchestrator/src/config.ts` 的路径解析、`packages/orchestrator/src/cli.ts` 暴露的 CLI command surface,以及 `packages/orchestrator/src/types.ts` 中与 instance/machine 持久化相关的 TypeScript types;实际 JSON 文件读写属于 `subsys.orchestrator.storage`,Unix socket server/client framing 属于 `subsys.orchestrator.ipc-transport`。[I]

`@earendil-works/pi-orchestrator` 当前包描述包含 `experimental orchestrator package for pi`,因此本节点把稳定性标记为 experimental,不把这些路径 contract 写成长期稳定 API。[E: packages/orchestrator/package.json:2][E: packages/orchestrator/package.json:4][I]

## 关键文件

- `packages/orchestrator/src/config.ts`:定义 `.pi` 默认目录名、`PI_ORCHESTRATOR_DIR` env、Bun binary detection、版本读取、orchestrator dir 和派生文件路径。[E: packages/orchestrator/src/config.ts:6][E: packages/orchestrator/src/config.ts:7][E: packages/orchestrator/src/config.ts:17][E: packages/orchestrator/src/config.ts:37][E: packages/orchestrator/src/config.ts:43][E: packages/orchestrator/src/config.ts:51][E: packages/orchestrator/src/config.ts:52][E: packages/orchestrator/src/config.ts:56][E: packages/orchestrator/src/config.ts:60][E: packages/orchestrator/src/config.ts:64][E: packages/orchestrator/src/config.ts:68]
- `packages/orchestrator/src/cli.ts`:定义 `orchestrator` 可执行入口、help text、子命令分发、`spawn --cwd/--label` flags、普通 IPC request 和 `rpc-stream` 的 raw socket 流。[E: packages/orchestrator/src/cli.ts:1][E: packages/orchestrator/src/cli.ts:21][E: packages/orchestrator/src/cli.ts:38][E: packages/orchestrator/src/cli.ts:80][E: packages/orchestrator/src/cli.ts:82][E: packages/orchestrator/src/cli.ts:87][E: packages/orchestrator/src/cli.ts:98][E: packages/orchestrator/src/cli.ts:103][E: packages/orchestrator/src/cli.ts:104][E: packages/orchestrator/src/cli.ts:105][E: packages/orchestrator/src/cli.ts:115][E: packages/orchestrator/src/cli.ts:125][E: packages/orchestrator/src/cli.ts:137]
- `packages/orchestrator/src/types.ts`:定义 `InstanceStatus` union、`MachineRecord`、`RadiusRegistration`、`InstanceRecord` 这些 instance/machine metadata 形状。[E: packages/orchestrator/src/types.ts:1][E: packages/orchestrator/src/types.ts:3][E: packages/orchestrator/src/types.ts:10][E: packages/orchestrator/src/types.ts:15]

## 配置目录与环境变量

`getOrchestratorDir()` 第一优先级读取 `process.env.PI_ORCHESTRATOR_DIR`;只要该 env 有 truthy 值,函数直接返回它,不会再追加 `orchestrator` 子目录。[E: packages/orchestrator/src/config.ts:46][E: packages/orchestrator/src/config.ts:47][E: packages/orchestrator/src/config.ts:48][E: packages/orchestrator/src/config.ts:52] 这意味着 `PI_ORCHESTRATOR_DIR=/tmp/pi-orch` 的最终目录就是 `/tmp/pi-orch`,不是 `/tmp/pi-orch/orchestrator`。[I]

没有 `PI_ORCHESTRATOR_DIR` 时,`getOrchestratorDir()` 读取 `process.env.PI_CONFIG_DIR`,否则使用 `join(homedir(), ".pi")`,最后在这个 `piDir` 下追加固定子目录 `orchestrator`。[E: packages/orchestrator/src/config.ts:6][E: packages/orchestrator/src/config.ts:46][E: packages/orchestrator/src/config.ts:47][E: packages/orchestrator/src/config.ts:48][E: packages/orchestrator/src/config.ts:51][E: packages/orchestrator/src/config.ts:52] 默认未设置 env 的路径可推导为 `~/.pi/orchestrator`,其中 `~` 来自 Node `homedir()`。[E: packages/orchestrator/src/config.ts:2][E: packages/orchestrator/src/config.ts:51][I]

`PI_ORCHESTRATOR_DIR` 是 orchestrator package 自己的专用 override,`PI_CONFIG_DIR` 是更通用的 pi config root override;源码顺序说明前者覆盖后者。[E: packages/orchestrator/src/config.ts:7][E: packages/orchestrator/src/config.ts:46][E: packages/orchestrator/src/config.ts:51][I]

## 派生文件与 socket path

`getAuthPath()` 返回 `join(getOrchestratorDir(), "auth.json")`,所以 auth metadata 的固定文件名是 `auth.json`。[E: packages/orchestrator/src/config.ts:56] `getMachinePath()` 返回 `machine.json`,`getInstancesPath()` 返回 `instances.json`。[E: packages/orchestrator/src/config.ts:60][E: packages/orchestrator/src/config.ts:64]

`getSocketPath()` 返回 `join(getOrchestratorDir(), "orchestrator.sock")`,因此 Unix socket path 与 JSON 文件共享同一个 orchestrator dir。[E: packages/orchestrator/src/config.ts:56][E: packages/orchestrator/src/config.ts:60][E: packages/orchestrator/src/config.ts:64][E: packages/orchestrator/src/config.ts:68] 如果没有 env override,默认 socket path 可推导为 `~/.pi/orchestrator/orchestrator.sock`;如果设置 `PI_ORCHESTRATOR_DIR=/tmp/pi-orch`,socket path 可推导为 `/tmp/pi-orch/orchestrator.sock`。[I]

## CLI surface 与配置消费

`cli.ts` 通过 shebang 暴露 Node executable,help text 中列出的 command surface 是 `serve`、`list`、`spawn [--cwd <path>] [--label <label>]`、`status <instance-id>`、`stop <instance-id>`、`rpc <instance-id> <json-command>`、`rpc-stream <instance-id>`、`--help` 和 `--version`。[E: packages/orchestrator/src/cli.ts:1][E: packages/orchestrator/src/cli.ts:21]

`serve` 直接调用 `serve()`,其 socket binding 细节由 `subsys.orchestrator.ipc-transport` 与 request handler 相关节点覆盖;本节点只确认 CLI 把 `serve` 子命令交给 server path。[E: packages/orchestrator/src/cli.ts:92][E: packages/orchestrator/src/cli.ts:93][I]

`list`、`spawn`、`status`、`stop`、`rpc` 都通过 `sendIpcRequest(...)` 发送 typed IPC request;`spawn` 的 cwd 默认值来自当前进程 `cwd()`,也可以用 `--cwd`,label 只从 `--label` 读取。[E: packages/orchestrator/src/cli.ts:98][E: packages/orchestrator/src/cli.ts:103][E: packages/orchestrator/src/cli.ts:104][E: packages/orchestrator/src/cli.ts:105][E: packages/orchestrator/src/cli.ts:115][E: packages/orchestrator/src/cli.ts:125][E: packages/orchestrator/src/cli.ts:137]

`rpc-stream` 不走普通 CLI request helper 的调用路径;它用 `createConnection(getSocketPath())` 直接连接 socket,在 connect 后写入 `{ type: "rpc_stream", instanceId }`,随后把 socket data 透传到 stdout,把 stdin 中每一行非空 JSON 解析为 `RpcCommand | RpcExtensionUIResponse` 并用 IPC protocol `encodeMessage()` 写回 socket。[E: packages/orchestrator/src/cli.ts:38][E: packages/orchestrator/src/cli.ts:43][E: packages/orchestrator/src/cli.ts:44][E: packages/orchestrator/src/cli.ts:50][E: packages/orchestrator/src/cli.ts:51][E: packages/orchestrator/src/cli.ts:61][E: packages/orchestrator/src/cli.ts:68][E: packages/orchestrator/src/cli.ts:70][E: packages/orchestrator/src/cli.ts:73][E: packages/orchestrator/src/cli.ts:74][I]

## 数据模型

`InstanceStatus` 只允许 `"starting" | "online" | "stopping" | "stopped" | "error"` 这五个 status string。[E: packages/orchestrator/src/types.ts:1] `MachineRecord` 包含必填 `id`、`createdAt`,以及可选 `lastSeenAt`、`label`;`RadiusRegistration` 包含 heartbeat interval 与 expiry 毫秒数。[E: packages/orchestrator/src/types.ts:4][E: packages/orchestrator/src/types.ts:5][E: packages/orchestrator/src/types.ts:6][E: packages/orchestrator/src/types.ts:7][E: packages/orchestrator/src/types.ts:11][E: packages/orchestrator/src/types.ts:12]

`InstanceRecord` 的必填字段是 `id`、`status`、`cwd`、`createdAt`,可选 metadata 包括 `lastSeenAt`、`label`、`sessionId`、`sessionFile`、`radiusPiId`。[E: packages/orchestrator/src/types.ts:16][E: packages/orchestrator/src/types.ts:17][E: packages/orchestrator/src/types.ts:18][E: packages/orchestrator/src/types.ts:19][E: packages/orchestrator/src/types.ts:20][E: packages/orchestrator/src/types.ts:21][E: packages/orchestrator/src/types.ts:22][E: packages/orchestrator/src/types.ts:23][E: packages/orchestrator/src/types.ts:24] `cwd` 和 `label` 与 CLI `spawn --cwd/--label` request 字段同名且被放入 `spawn` request;具体写入时机属于 storage/supervisor 节点核验范围。[E: packages/orchestrator/src/cli.ts:103][E: packages/orchestrator/src/cli.ts:104][E: packages/orchestrator/src/cli.ts:105][E: packages/orchestrator/src/types.ts:18][E: packages/orchestrator/src/types.ts:21][I]

## Bun binary detection 与版本读取

`isBunBinary` 是一个 module-level boolean export,当 `import.meta.url` 包含 `"$bunfs"`、`"~BUN"` 或 `"%7EBUN"` 任一片段时为 true。[E: packages/orchestrator/src/config.ts:16][E: packages/orchestrator/src/config.ts:17] 这只是运行环境探测,本文件未展示 `isBunBinary` 的消费方。[I]

`VERSION` 通过向上查找最近的 `package.json` 并读取其中 `version` 字段得到;如果 package file 不存在导致 `ENOENT`,源码会保留默认空 object,最终版本 fallback 为 `"0.0.0"`。[E: packages/orchestrator/src/config.ts:24][E: packages/orchestrator/src/config.ts:25][E: packages/orchestrator/src/config.ts:26][E: packages/orchestrator/src/config.ts:27][E: packages/orchestrator/src/config.ts:30][E: packages/orchestrator/src/config.ts:32][E: packages/orchestrator/src/config.ts:35][E: packages/orchestrator/src/config.ts:37][E: packages/orchestrator/src/config.ts:40][E: packages/orchestrator/src/config.ts:43]

## 控制流

1. `getOrchestratorDir@packages/orchestrator/src/config.ts:45` 解析 env:先看 `PI_ORCHESTRATOR_DIR`,否则计算 `PI_CONFIG_DIR || ~/.pi` 并追加 `orchestrator`。[E: packages/orchestrator/src/config.ts:46][E: packages/orchestrator/src/config.ts:47][E: packages/orchestrator/src/config.ts:48][E: packages/orchestrator/src/config.ts:51][E: packages/orchestrator/src/config.ts:52]
2. `getSocketPath@packages/orchestrator/src/config.ts:67` 在 orchestrator dir 下追加 `orchestrator.sock`,并被 CLI stream 直接用作 socket location。[E: packages/orchestrator/src/config.ts:68][E: packages/orchestrator/src/cli.ts:38]
3. `main@packages/orchestrator/src/cli.ts:79` 读取 `process.argv.slice(2)`,处理 help/version,再按第一个 argv 分发子命令。[E: packages/orchestrator/src/cli.ts:80][E: packages/orchestrator/src/cli.ts:82][E: packages/orchestrator/src/cli.ts:87][E: packages/orchestrator/src/cli.ts:92][E: packages/orchestrator/src/cli.ts:97][E: packages/orchestrator/src/cli.ts:102][E: packages/orchestrator/src/cli.ts:109][E: packages/orchestrator/src/cli.ts:119][E: packages/orchestrator/src/cli.ts:129][E: packages/orchestrator/src/cli.ts:146]
4. `rpcStream@packages/orchestrator/src/cli.ts:37` 连接 `getSocketPath()`,发送 `rpc_stream` open message,再桥接 stdin JSONL 与 socket data;它的 command payload 类型来自 `@earendil-works/pi-coding-agent` 的 `RpcCommand` 和 `RpcExtensionUIResponse`。[E: packages/orchestrator/src/cli.ts:7][E: packages/orchestrator/src/cli.ts:38][E: packages/orchestrator/src/cli.ts:44][E: packages/orchestrator/src/cli.ts:50][E: packages/orchestrator/src/cli.ts:51][E: packages/orchestrator/src/cli.ts:73]

## 设计动机与权衡

配置目录采用两级 env override:专用 `PI_ORCHESTRATOR_DIR` 适合把 orchestrator state/socket 完全迁移到独立目录,通用 `PI_CONFIG_DIR` 适合跟随 pi 的全局 config root 迁移;这个优先级来自源码顺序,动机是从命名和分支结构推断的。[E: packages/orchestrator/src/config.ts:7][E: packages/orchestrator/src/config.ts:46][E: packages/orchestrator/src/config.ts:51][I]

socket 与 JSON state 文件共享一个 orchestrator dir,这让 `subsys.orchestrator.storage` 和 `subsys.orchestrator.ipc-transport` 可以由同一个 path contract 定位运行时资源;源码只展示共享 `getOrchestratorDir()` 的派生路径,没有展示跨进程锁或迁移策略。[E: packages/orchestrator/src/config.ts:56][E: packages/orchestrator/src/config.ts:60][E: packages/orchestrator/src/config.ts:64][E: packages/orchestrator/src/config.ts:68][U]

## Gotcha

- `PI_ORCHESTRATOR_DIR` 是最终 orchestrator dir,不是 pi config root;设置后不会自动追加 `orchestrator`。[E: packages/orchestrator/src/config.ts:46][E: packages/orchestrator/src/config.ts:48][I]
- `PI_CONFIG_DIR` 只有在 `PI_ORCHESTRATOR_DIR` 不存在时才生效;同时设置两个 env 时应以 `PI_ORCHESTRATOR_DIR` 为准。[E: packages/orchestrator/src/config.ts:46][E: packages/orchestrator/src/config.ts:47][E: packages/orchestrator/src/config.ts:51]
- `rpc-stream` 的 stdin parser 对每个非空 line 直接 `JSON.parse`,源码没有在这个 loop 内捕获 parse error;无效 JSON line 会让 async stdin handler 抛错,具体进程表现未在本节点 source 中测试核验。[E: packages/orchestrator/src/cli.ts:68][E: packages/orchestrator/src/cli.ts:70][E: packages/orchestrator/src/cli.ts:73][U]
- `isBunBinary` 的判定依赖 `import.meta.url` 字符串片段,而不是 Node/Bun feature probe;这对当前 Bun virtual filesystem path 是 explicit,对未来 Bun path 变化的兼容性未知。[E: packages/orchestrator/src/config.ts:17][U]

## 跨包边界

`rpc-stream` 的 stdin payload 类型显式导入自 `@earendil-works/pi-coding-agent`:普通 RPC command 是 `RpcCommand`,extension UI 回包是 `RpcExtensionUIResponse`。[E: packages/orchestrator/src/cli.ts:7][E: packages/orchestrator/src/cli.ts:73] `surface.modes.rpc` 解释 coding-agent RPC mode 的进程协议、event stream 和 extension UI bridge;`ref.coding-agent.rpc-methods` 列出 `RpcCommand` 的逐命令目录,本节点只说明 orchestrator CLI 如何把这些 payload 送进 socket。[I]

`subsys.orchestrator.storage` 应覆盖 `instances.json` 等 JSON state 的创建、读写和 update 语义;本节点只把 `getInstancesPath()` 的文件名和目录来源作为路径 contract 记录。[E: packages/orchestrator/src/config.ts:64][I] `subsys.orchestrator.ipc-transport` 应覆盖 socket server/client、message framing 与 already-running 行为;本节点只记录 `getSocketPath()` 和 CLI 对该 path 的直接消费。[E: packages/orchestrator/src/config.ts:68][E: packages/orchestrator/src/cli.ts:38][I]

## Sources

- `packages/orchestrator/src/config.ts`
- `packages/orchestrator/src/cli.ts`
- `packages/orchestrator/src/types.ts`
- `packages/orchestrator/package.json`

## 相关

- [subsys.orchestrator.storage](storage.md): orchestrator JSON state 文件的读写、创建目录和 instance record 更新语义。
- [subsys.orchestrator.ipc-transport](ipc-transport.md): Unix socket 的 server/client、framing、连接错误和运行中实例检测。
- [surface.modes.rpc](../../surface/modes/rpc.md): coding-agent RPC mode 的 stdin/stdout JSONL 协议入口和生命周期。
- [ref.coding-agent.rpc-methods](../../reference/rpc-methods.md): `RpcCommand`/`RpcResponse` 的逐命令目录。
