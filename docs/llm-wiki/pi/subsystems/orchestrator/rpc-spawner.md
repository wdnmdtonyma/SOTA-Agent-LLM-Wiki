---
id: subsys.orchestrator.rpc-spawner
title: RPC 进程生成
kind: subsystem
tier: T2
pkg: orchestrator
source:
  - packages/orchestrator/src/rpc-process.ts
  - packages/orchestrator/src/supervisor.ts
  - packages/orchestrator/src/config.ts
  - packages/orchestrator/package.json
  - packages/coding-agent/src/rpc-entry.ts
symbols:
  - RpcProcessInstance
  - getSpawnCommand
  - createRpcProcessInstance
related:
  - subsys.orchestrator.supervisor
  - surface.modes.rpc
evidence: explicit
status: verified
updated: 5a073885
---

> `subsys.orchestrator.rpc-spawner` 是 `pi-orchestrator` 的 child process adapter: 它把一个工作目录 `cwd` 包装成独立 RPC mode 子进程,用 stdin/stdout JSONL 发送 `RpcCommand`、接收 `RpcResponse`、agent events 和 extension UI requests。

## 能回答的问题

- orchestrator 什么时候创建 `RpcProcessInstance`,以及它和 `subsys.orchestrator.supervisor` 的边界是什么?
- Bun binary 和 Node package 两种运行形态分别用什么 command/args 启动 RPC 子进程?
- RPC 子进程继承哪些环境变量,stdio 如何配置?
- `send()` 如何给 command 补 request id,并把 response 匹配回 Promise?
- stdout 的 `response`、`extension_ui_request` 和 agent event 如何分流?
- RPC 子进程退出、写入失败或 dispose 时,未完成请求会怎样收敛?

## 职责边界

`RpcProcessInstance` 持有一个 `readonly process: ChildProcess`,并在构造函数里根据 `options.cwd` spawn 出 RPC 子进程;该类负责进程生命周期、JSONL I/O、pending response map、event listener set 和 UI request handler。[E: packages/orchestrator/src/rpc-process.ts:25][E: packages/orchestrator/src/rpc-process.ts:26][E: packages/orchestrator/src/rpc-process.ts:37][E: packages/orchestrator/src/rpc-process.ts:39][E: packages/orchestrator/src/rpc-process.ts:40][E: packages/orchestrator/src/rpc-process.ts:32][E: packages/orchestrator/src/rpc-process.ts:33][E: packages/orchestrator/src/rpc-process.ts:35]

`RpcProcessInstance` 没有按具体 `RpcCommand["type"]` 实现业务分支;它 import `AgentSessionEvent`、`RpcCommand`、`RpcExtensionUIRequest`、`RpcExtensionUIResponse` 和 `RpcResponse` 类型,并在 `send()` / `handleLine()` 中把对象按 JSONL 写入或分发。[E: packages/orchestrator/src/rpc-process.ts:6][E: packages/orchestrator/src/rpc-process.ts:7][E: packages/orchestrator/src/rpc-process.ts:8][E: packages/orchestrator/src/rpc-process.ts:9][E: packages/orchestrator/src/rpc-process.ts:10][E: packages/orchestrator/src/rpc-process.ts:11][E: packages/orchestrator/src/rpc-process.ts:101][E: packages/orchestrator/src/rpc-process.ts:151][I] `surface.modes.rpc` 是对方节点 id,负责解释 `pi-coding-agent` 端 `--mode rpc` 的 stdin/stdout protocol;本节点只解释 orchestrator 如何 spawn 和驱动这个 RPC 子进程。[I]

`subsys.orchestrator.supervisor` 是直接上游: `spawnInstance()` 调用 `createRpcProcessInstance({ cwd: options.cwd })`,随后 `bindRpcProcess()` 接上事件、exit 和 UI request,再同步 session metadata。[E: packages/orchestrator/src/supervisor.ts:270][E: packages/orchestrator/src/supervisor.ts:288][E: packages/orchestrator/src/supervisor.ts:289][E: packages/orchestrator/src/supervisor.ts:290] orchestrator 包自身在 package metadata 里描述为 `experimental orchestrator package for pi`,所以本 subsystem 的稳定性应按 experimental 处理,不能当作成熟公共 API。[E: packages/orchestrator/package.json:4][I]

## 关键文件

- `packages/orchestrator/src/rpc-process.ts`: 定义 `PendingRequest`、`RpcProcessInstance`、private `getSpawnCommand()`、`send()`、UI response/event/exit listener 和 `createRpcProcessInstance()` 工厂。[E: packages/orchestrator/src/rpc-process.ts:14][E: packages/orchestrator/src/rpc-process.ts:25][E: packages/orchestrator/src/rpc-process.ts:50][E: packages/orchestrator/src/rpc-process.ts:143][E: packages/orchestrator/src/rpc-process.ts:161][E: packages/orchestrator/src/rpc-process.ts:172][E: packages/orchestrator/src/rpc-process.ts:179][E: packages/orchestrator/src/rpc-process.ts:199]
- `packages/orchestrator/src/config.ts`: 提供 `isBunBinary`,用 `import.meta.url` 是否包含 `$bunfs`、`~BUN` 或 `%7EBUN` 来识别 Bun compiled binary 运行形态。[E: packages/orchestrator/src/config.ts:16][E: packages/orchestrator/src/config.ts:17]
- `packages/coding-agent/src/rpc-entry.ts`: Node/package 分支执行的 coding-agent RPC entry;该 entry 设置 process title、`PI_CODING_AGENT=true`,并调用 `main(["--mode", "rpc", ...process.argv.slice(2)])`。[E: packages/coding-agent/src/rpc-entry.ts:6][E: packages/coding-agent/src/rpc-entry.ts:7][E: packages/coding-agent/src/rpc-entry.ts:12]
- `packages/orchestrator/src/supervisor.ts`: 证明 spawner 被 supervisor 的 `spawnInstance()` 使用,并通过 `bindRpcProcess()` 将子进程事件连接到 live instance。[E: packages/orchestrator/src/supervisor.ts:99][E: packages/orchestrator/src/supervisor.ts:101][E: packages/orchestrator/src/supervisor.ts:102][E: packages/orchestrator/src/supervisor.ts:107][E: packages/orchestrator/src/supervisor.ts:110][E: packages/orchestrator/src/supervisor.ts:288]
- `packages/orchestrator/package.json`: 标记 `@earendil-works/pi-orchestrator` 的包描述为 experimental。[E: packages/orchestrator/package.json:2][E: packages/orchestrator/package.json:4]

## 数据模型

`PendingRequest` 是 request/response correlation 的内部记录,包含 `resolve(response: RpcResponse)` 和 `reject(error: Error)` 两个回调;`pendingRequests` 用 string id 映射到这个记录。[E: packages/orchestrator/src/rpc-process.ts:14][E: packages/orchestrator/src/rpc-process.ts:15][E: packages/orchestrator/src/rpc-process.ts:16][E: packages/orchestrator/src/rpc-process.ts:32]

`RpcProcessInstance` 的运行态字段包括 `exited`、`nextRequestId`、`stdoutBuffer`、`stderrBuffer`、`pendingRequests`、`eventListeners`、`exitListeners` 和 `uiRequestHandler`;这些字段共同支持 child process 状态、line buffering、stderr diagnostics、Promise correlation、agent event fanout、exit notification 和 extension UI bridge。[E: packages/orchestrator/src/rpc-process.ts:28][E: packages/orchestrator/src/rpc-process.ts:29][E: packages/orchestrator/src/rpc-process.ts:30][E: packages/orchestrator/src/rpc-process.ts:31][E: packages/orchestrator/src/rpc-process.ts:32][E: packages/orchestrator/src/rpc-process.ts:33][E: packages/orchestrator/src/rpc-process.ts:34][E: packages/orchestrator/src/rpc-process.ts:35]

`createRpcProcessInstance(options)` 是公开工厂,目前只返回 `new RpcProcessInstance(options)`;因此构造函数里的 spawn 行为就是该 subsystem 的实际创建路径。[E: packages/orchestrator/src/rpc-process.ts:199][E: packages/orchestrator/src/rpc-process.ts:200]

## Spawn command 与运行环境

构造函数先调用 private `getSpawnCommand()`,再执行 `spawn(rpcCommand.command, rpcCommand.args, { cwd: options.cwd, env: process.env, stdio: ["pipe", "pipe", "pipe"] })`。[E: packages/orchestrator/src/rpc-process.ts:38][E: packages/orchestrator/src/rpc-process.ts:39][E: packages/orchestrator/src/rpc-process.ts:40][E: packages/orchestrator/src/rpc-process.ts:41][E: packages/orchestrator/src/rpc-process.ts:42] 这意味着 orchestrator 把 caller 提供的 `cwd` 设为子进程工作目录,把父进程的 `process.env` 作为 child env,并把 stdin/stdout/stderr 全部配置成 pipe。[E: packages/orchestrator/src/rpc-process.ts:40][E: packages/orchestrator/src/rpc-process.ts:41][E: packages/orchestrator/src/rpc-process.ts:42]

Bun compiled binary 分支由 `isBunBinary` 触发;它把 command 设为 `join(dirname(process.execPath), process.platform === "win32" ? "pi.exe" : "pi")`,args 设为 `["--mode", "rpc"]`。[E: packages/orchestrator/src/rpc-process.ts:51][E: packages/orchestrator/src/rpc-process.ts:53][E: packages/orchestrator/src/rpc-process.ts:54] 因此在 Bun binary 运行形态下,orchestrator 显式启动同目录下的 `pi` 或 `pi.exe`,并通过 CLI 参数要求子进程进入 RPC mode。[E: packages/orchestrator/src/rpc-process.ts:53][E: packages/orchestrator/src/rpc-process.ts:54][I]

非 Bun 分支把 command 设为当前 Node executable `process.execPath`,args 只包含 `require.resolve("@earendil-works/pi-coding-agent/rpc-entry")`。[E: packages/orchestrator/src/rpc-process.ts:58][E: packages/orchestrator/src/rpc-process.ts:59] `rpc-entry` 自身调用 `main(["--mode", "rpc", ...process.argv.slice(2)])`,所以 Node/package 运行形态不是在 `getSpawnCommand()` 里直接传 `--mode rpc`,而是通过专用 entry point 强制进入 RPC mode。[E: packages/coding-agent/src/rpc-entry.ts:12][I]

构造函数在 spawn 后立即检查 `this.process.stdin` 和 `this.process.stdout`;如果任一缺失,抛出 `Failed to create RPC process stdio`,否则调用 `attachListeners()`。[E: packages/orchestrator/src/rpc-process.ts:44][E: packages/orchestrator/src/rpc-process.ts:45][E: packages/orchestrator/src/rpc-process.ts:47]

## 控制流

1. `OrchestratorSupervisor.spawnInstance@packages/orchestrator/src/supervisor.ts:270` 创建 live instance record 后,调用 `createRpcProcessInstance({ cwd: options.cwd })` 并绑定 RPC process。[E: packages/orchestrator/src/supervisor.ts:270][E: packages/orchestrator/src/supervisor.ts:272][E: packages/orchestrator/src/supervisor.ts:284][E: packages/orchestrator/src/supervisor.ts:288][E: packages/orchestrator/src/supervisor.ts:289]
2. `RpcProcessInstance.constructor@packages/orchestrator/src/rpc-process.ts:37` 调用 `getSpawnCommand()`,然后以 `cwd`、`env: process.env`、`stdio: ["pipe","pipe","pipe"]` spawn 子进程。[E: packages/orchestrator/src/rpc-process.ts:37][E: packages/orchestrator/src/rpc-process.ts:38][E: packages/orchestrator/src/rpc-process.ts:39][E: packages/orchestrator/src/rpc-process.ts:40][E: packages/orchestrator/src/rpc-process.ts:41][E: packages/orchestrator/src/rpc-process.ts:42]
3. `attachListeners@packages/orchestrator/src/rpc-process.ts:63` 把 stdout/stderr encoding 设为 utf8;stdout data 被追加进 `stdoutBuffer`,按 `\n` 找完整行,`trim()` 后跳过空行并交给 `handleLine(line)`。[E: packages/orchestrator/src/rpc-process.ts:63][E: packages/orchestrator/src/rpc-process.ts:64][E: packages/orchestrator/src/rpc-process.ts:65][E: packages/orchestrator/src/rpc-process.ts:66][E: packages/orchestrator/src/rpc-process.ts:68][E: packages/orchestrator/src/rpc-process.ts:72][E: packages/orchestrator/src/rpc-process.ts:74][E: packages/orchestrator/src/rpc-process.ts:75][E: packages/orchestrator/src/rpc-process.ts:77]
4. stderr 也先设为 utf8;stderr data 只追加到 `stderrBuffer`;process `error` 和 `exit` 都会把 `stderrBuffer` 拼进 Error message,然后 reject all pending requests 并通知 exit listeners。[E: packages/orchestrator/src/rpc-process.ts:81][E: packages/orchestrator/src/rpc-process.ts:82][E: packages/orchestrator/src/rpc-process.ts:83][E: packages/orchestrator/src/rpc-process.ts:86][E: packages/orchestrator/src/rpc-process.ts:88][E: packages/orchestrator/src/rpc-process.ts:89][E: packages/orchestrator/src/rpc-process.ts:90][E: packages/orchestrator/src/rpc-process.ts:93][E: packages/orchestrator/src/rpc-process.ts:95][E: packages/orchestrator/src/rpc-process.ts:96][E: packages/orchestrator/src/rpc-process.ts:97]
5. `send(command)` 在进程未退出时补齐 id: 若 caller 没给 `command.id`,就生成 `orchestrator_${++nextRequestId}_${randomUUID()}`;随后把 `{ ...command, id }` 存进 `pendingRequests`,并向 stdin 写入一行 JSON 加 `\n`。[E: packages/orchestrator/src/rpc-process.ts:143][E: packages/orchestrator/src/rpc-process.ts:144][E: packages/orchestrator/src/rpc-process.ts:147][E: packages/orchestrator/src/rpc-process.ts:148][E: packages/orchestrator/src/rpc-process.ts:149][E: packages/orchestrator/src/rpc-process.ts:150][E: packages/orchestrator/src/rpc-process.ts:151]
6. stdin write callback 收到 error 时删除对应 pending entry 并 reject;没有 write error 时 Promise 继续等待 stdout 中 matching response。[E: packages/orchestrator/src/rpc-process.ts:151][E: packages/orchestrator/src/rpc-process.ts:152][E: packages/orchestrator/src/rpc-process.ts:155][E: packages/orchestrator/src/rpc-process.ts:156]
7. `handleLine(line)` 先 `JSON.parse(line)`,然后按 `parsed.type` 分流: `response` 用 `parsed.id` 查找 pending request 并 resolve,`extension_ui_request` 交给 `uiRequestHandler`,其它类型作为 `AgentSessionEvent` fan out 到 `eventListeners`。[E: packages/orchestrator/src/rpc-process.ts:101][E: packages/orchestrator/src/rpc-process.ts:102][E: packages/orchestrator/src/rpc-process.ts:103][E: packages/orchestrator/src/rpc-process.ts:104][E: packages/orchestrator/src/rpc-process.ts:108][E: packages/orchestrator/src/rpc-process.ts:112][E: packages/orchestrator/src/rpc-process.ts:113][E: packages/orchestrator/src/rpc-process.ts:117][E: packages/orchestrator/src/rpc-process.ts:118][E: packages/orchestrator/src/rpc-process.ts:123][E: packages/orchestrator/src/rpc-process.ts:124]
8. `handleUiResponse(response)` 在进程未退出时把 extension UI response 序列化为 JSONL 写回 stdin;`setUiRequestHandler(handler)` 只替换当前 handler。[E: packages/orchestrator/src/rpc-process.ts:161][E: packages/orchestrator/src/rpc-process.ts:162][E: packages/orchestrator/src/rpc-process.ts:165][E: packages/orchestrator/src/rpc-process.ts:168][E: packages/orchestrator/src/rpc-process.ts:169]
9. `dispose()` 先清空 UI handler 并用 `RPC process disposed` reject 所有 pending requests;如果进程未退出,发送 `SIGTERM` 后等待一次 `exit` 事件。[E: packages/orchestrator/src/rpc-process.ts:186][E: packages/orchestrator/src/rpc-process.ts:187][E: packages/orchestrator/src/rpc-process.ts:188][E: packages/orchestrator/src/rpc-process.ts:189][E: packages/orchestrator/src/rpc-process.ts:192][E: packages/orchestrator/src/rpc-process.ts:193][E: packages/orchestrator/src/rpc-process.ts:194]

## 设计动机与权衡

spawner 使用 child process 而不是 in-process object: Bun binary 分支启动同目录 `pi` / `pi.exe` 并传 `--mode rpc`,Node/package 分支启动 `process.execPath` 执行 `rpc-entry`,再由 entry 注入 `--mode rpc`;这使 orchestrator 可以用 OS process 边界隔离每个 live instance 的 working directory、stdio stream 和 lifecycle。[E: packages/orchestrator/src/rpc-process.ts:39][E: packages/orchestrator/src/rpc-process.ts:40][E: packages/orchestrator/src/rpc-process.ts:42][E: packages/orchestrator/src/rpc-process.ts:53][E: packages/orchestrator/src/rpc-process.ts:54][E: packages/orchestrator/src/rpc-process.ts:58][E: packages/orchestrator/src/rpc-process.ts:59][E: packages/coding-agent/src/rpc-entry.ts:12][I]

request id 默认带 `orchestrator_` 前缀、递增 counter 和 `randomUUID()`,这降低了同一进程内自动 id 冲突概率,同时允许 caller 自带 `command.id` 覆盖默认 id。[E: packages/orchestrator/src/rpc-process.ts:147][E: packages/orchestrator/src/rpc-process.ts:148][I]

stdout parser 对每行执行 `trim()` 并跳过空行;这让换行 framing 简单,但也意味着 orchestrator 端没有保留 JSONL record 外侧的 whitespace。[E: packages/orchestrator/src/rpc-process.ts:72][E: packages/orchestrator/src/rpc-process.ts:74][E: packages/orchestrator/src/rpc-process.ts:77][I]

`send()` 不根据 `RpcResponse.success` reject Promise;只要收到 matching `type: "response"` 就 resolve `RpcResponse`,业务失败需要 caller 检查 response payload。[E: packages/orchestrator/src/rpc-process.ts:104][E: packages/orchestrator/src/rpc-process.ts:108][E: packages/orchestrator/src/rpc-process.ts:113][I]

## Gotcha

- `stderrBuffer` 只追加、不截断;长时间运行且 stderr 很多的子进程会让 orchestrator 进程持有越来越长的 diagnostic string。[E: packages/orchestrator/src/rpc-process.ts:31][E: packages/orchestrator/src/rpc-process.ts:82][E: packages/orchestrator/src/rpc-process.ts:83][I]
- `handleLine()` 对 child stdout 的 `JSON.parse(line)` 没有局部 try/catch;如果 RPC 子进程输出非 JSON line,异常会从 stdout data handler 抛出,而不是通过 pending request error response 收敛。[E: packages/orchestrator/src/rpc-process.ts:101][E: packages/orchestrator/src/rpc-process.ts:102][I]
- `dispose()` 发送 `SIGTERM` 后等待 `exit` 事件,源码里没有 timeout 或 fallback kill;如果 child process 没有退出,dispose Promise 可能持续等待。[E: packages/orchestrator/src/rpc-process.ts:192][E: packages/orchestrator/src/rpc-process.ts:193][E: packages/orchestrator/src/rpc-process.ts:194][I]
- `response` 缺少 `id` 或找不到 pending request 时会被静默忽略;这符合 pending map correlation 的实现,但也意味着 stray response 不会触发错误日志。[E: packages/orchestrator/src/rpc-process.ts:104][E: packages/orchestrator/src/rpc-process.ts:105][E: packages/orchestrator/src/rpc-process.ts:108][E: packages/orchestrator/src/rpc-process.ts:109][I]

## 跨包边界

从 orchestrator 视角看,`surface.modes.rpc` 对应的是被 `rpc-entry` 注入 `--mode rpc` 的 coding-agent 进程;本节点只核到 orchestrator 侧通过 stdin 写 JSONL command、从 stdout 行解析 response/event/UI request,protocol 细节应由 `surface.modes.rpc` 节点解释。[E: packages/coding-agent/src/rpc-entry.ts:12][E: packages/orchestrator/src/rpc-process.ts:101][E: packages/orchestrator/src/rpc-process.ts:151][I]

`subsys.orchestrator.supervisor` 是 orchestrator 的多实例管理者: 它创建 `RpcProcessInstance`、订阅 agent events、转发 UI request、处理 unexpected RPC exit,并在 stop/shutdown 路径调用 `dispose()`。[E: packages/orchestrator/src/supervisor.ts:99][E: packages/orchestrator/src/supervisor.ts:102][E: packages/orchestrator/src/supervisor.ts:107][E: packages/orchestrator/src/supervisor.ts:110][E: packages/orchestrator/src/supervisor.ts:115][E: packages/orchestrator/src/supervisor.ts:172][E: packages/orchestrator/src/supervisor.ts:288][E: packages/orchestrator/src/supervisor.ts:308][E: packages/orchestrator/src/supervisor.ts:337]

## Sources

- packages/orchestrator/src/rpc-process.ts
- packages/orchestrator/src/supervisor.ts
- packages/orchestrator/src/config.ts
- packages/orchestrator/package.json
- packages/coding-agent/src/rpc-entry.ts

## 相关

- [subsys.orchestrator.supervisor](supervisor.md) - orchestrator 多实例管理者,负责创建、绑定、停止和恢复 live instances。
- [surface.modes.rpc](../../surface/modes/rpc.md) - coding-agent 侧 `--mode rpc` stdin/stdout JSONL protocol 和 command dispatch。
