---
id: surface.modes.rpc
title: RPC 无头模式
kind: surface
tier: T1
pkg: coding-agent
source:
  - packages/coding-agent/src/modes/rpc/rpc-mode.ts
  - packages/coding-agent/src/rpc-entry.ts
  - packages/coding-agent/docs/rpc.md
symbols:
  - runRpcMode
  - RpcCommand
related:
  - surface.modes.rpc-protocol
  - ref.coding-agent.rpc-methods
evidence: explicit
status: verified
updated: 086c32e745
---

> `surface.modes.rpc` 是 `pi-coding-agent` 的无头 stdin/stdout JSONL 控制面:host 向 stdin 写 JSON command,从 stdout 读 command response、agent events 和 extension UI request;`runRpcMode(runtimeHost)` 负责把这些协议对象接到当前 `AgentSessionRuntime` 的 session、extension、命令分发和关闭流程上。[E: packages/coding-agent/docs/rpc.md:3][E: packages/coding-agent/docs/rpc.md:20][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:54][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:60][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:61][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:319][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:355][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:355][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:806][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:807]

## 能回答的问题

- `pi --mode rpc` 和 `rpc-entry` 分别怎样进入 RPC mode?
- RPC mode 的 stdin/stdout 数据边界是什么,哪些输出走 response,哪些输出走 event?
- `runRpcMode` 在哪里 dispatch command,并怎样返回 response?
- RPC mode 如何把 extension UI 交给 headless host 实现?
- session 切换、fork、clone 后为什么需要重新绑定 session?
- RPC mode 的关闭路径如何处理 stdin end、signal 和 extension shutdown request?

## 入口与模式选择

开发文档把启动方式写成 `pi --mode rpc [options]`,并把 RPC mode 定义为通过 stdin/stdout JSON protocol 嵌入 agent 的 headless operation。[E: packages/coding-agent/docs/rpc.md:3][E: packages/coding-agent/docs/rpc.md:7][E: packages/coding-agent/docs/rpc.md:9][E: packages/coding-agent/docs/rpc.md:10] `packages/coding-agent/src/rpc-entry.ts` 是专用进程入口:它设置进程标题、设置 `PI_CODING_AGENT=true`,屏蔽 `process.emitWarning`,配置 HTTP dispatcher,然后调用 `main(["--mode", "rpc", ...process.argv.slice(2)])`。[E: packages/coding-agent/src/rpc-entry.ts:6][E: packages/coding-agent/src/rpc-entry.ts:7][E: packages/coding-agent/src/rpc-entry.ts:9][E: packages/coding-agent/src/rpc-entry.ts:11][E: packages/coding-agent/src/rpc-entry.ts:13] 在 index source 范围内,可以确认 `rpc-entry` 是把普通 `main()` 强制带入 RPC mode 的 thin wrapper;`main.ts` 的 mode 解析细节不属于本节点 source。[I]

`runRpcMode(runtimeHost)` 是运行时入口,函数体先接管 stdout,随后用 `output(...)` 写 JSONL 输出,并在底部把 stdin JSONL reader 接到 `handleInputLine(line)`。[E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:54][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:55][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:60][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:61][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:806][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:807]

## I/O 与 JSONL 协议边界

`runRpcMode` 进入后先 `takeOverStdout()`,保存当前 `runtimeHost.session`,并把所有协议输出收敛到 `output(obj)`,由 `writeRawStdout(serializeJsonLine(obj))` 写出。[E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:54][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:55][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:56][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:60][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:61] 开发文档把 wire protocol 分成 commands、responses、events,并说明 command 可带可选 `id`,对应 response 会带同一个 `id`。[E: packages/coding-agent/docs/rpc.md:20][E: packages/coding-agent/docs/rpc.md:22][E: packages/coding-agent/docs/rpc.md:23][E: packages/coding-agent/docs/rpc.md:24][E: packages/coding-agent/docs/rpc.md:26]

framing 采用 strict JSONL:只用 LF (`\n`) 作为 record delimiter,client 应只按 `\n` 分割、可剥离输入端尾随 `\r`,且不要使用会把 `U+2028`/`U+2029` 当换行的 generic line reader。[E: packages/coding-agent/docs/rpc.md:28][E: packages/coding-agent/docs/rpc.md:30][E: packages/coding-agent/docs/rpc.md:33][E: packages/coding-agent/docs/rpc.md:34][E: packages/coding-agent/docs/rpc.md:35][E: packages/coding-agent/docs/rpc.md:37] `attachJsonlLineReader(process.stdin, ...)` 在进程 stdin 上接线,每条 line 交给 `handleInputLine(line)`。[E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:806][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:807]

## Dispatch 与 response 语义

`handleInputLine` 先 `JSON.parse(line)`,parse 失败时输出 `command:"parse"` 的 error response;parse 成功后先处理 `type:"extension_ui_response"`,普通 command 才 cast 成 `RpcCommand` 并进入 `handleCommand(command)`。[E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:748][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:751][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:753][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:756][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:765][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:769][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:771][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:780][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:782] 失败 command response 的 shape 也在文档中示例为 `type:"response"`,带 `command`、`success:false`、`error`。[E: packages/coding-agent/docs/rpc.md:1347][E: packages/coding-agent/docs/rpc.md:1349][E: packages/coding-agent/docs/rpc.md:1351][E: packages/coding-agent/docs/rpc.md:1353][E: packages/coding-agent/docs/rpc.md:1354][E: packages/coding-agent/docs/rpc.md:1355][E: packages/coding-agent/docs/rpc.md:1356]

`handleCommand` 是实际 dispatch 点:它对 `command.type` 做 switch,按源码 case 覆盖 prompting、state、model、thinking、queue modes、compaction、retry、bash、session、messages、commands,未知 command 返回 `Unknown command` error。[E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:386][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:389][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:394][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:446][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:468][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:495][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:517][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:531][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:545][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:559][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:591][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:670][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:678][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:711][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:713] 逐命令字段和 response payload 的完整目录属于 `ref.coding-agent.rpc-methods`;本节点只按 `runRpcMode` 的 dispatch 区块归纳命令面。[I]

本轮 thinking dispatch 新增 `get_available_thinking_levels`，把当前 session 的可用 thinking levels 回传给 host；它与 `set_thinking_level`、`cycle_thinking_level` 同属无头控制面，不依赖 interactive selector [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:495] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:508] [E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:510]。

大多数 command branch 返回 `success(id, command, data?)`,随后 `handleInputLine` 输出 response 并等待 stdout backpressure。[E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:64][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:70][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:72][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:782][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:783][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:784][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:785] `prompt` 是特殊 branch:它 fire-and-catch 调用 `session.prompt(...)`,在 preflight 成功回调中输出 prompt success response,随后 `handleCommand` 返回 `undefined`;文档说明 prompt response 表示 accepted、queued 或 handled immediately,acceptance 后的失败走 normal event/message stream,不会为同一个 request id 再发第二个 response。[E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:394][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:398][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:403][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:406][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:410][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:411][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:412][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:415][E: packages/coding-agent/docs/rpc.md:45][E: packages/coding-agent/docs/rpc.md:76]

## Session rebind 与 event 输出

`runRpcMode` 把 `runtimeHost.session` 保存到局部 `session`,并通过 `runtimeHost.setRebindSession()` 暴露重新绑定回调。[E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:56][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:313][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:314] `rebindSession()` 重新读取 `runtimeHost.session`,以 `{ uiContext, mode:"rpc", commandContextActions, shutdownHandler, onError }` 绑定 extensions,随后取消旧订阅并订阅新 session events,把每个 event 交给 `output(event)`。[E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:317][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:318][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:319][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:320][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:321][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:322][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:345][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:348][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:353][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:355][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:355]

`new_session`、`switch_session`、`fork`、`clone` 在 runtimeHost 返回未取消时都会调用 `rebindSession()`。[E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:433][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:435][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:436][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:437][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:601][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:604][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:609][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:612][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:617][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:622][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:624] 这些 branch 使用 runtimeHost 级 session 操作,因此需要重新读取并重新订阅当前 session;这是从控制流与 `runtimeHost.session` 的重新赋值方式归纳出的原因。[I]

RPC mode 的 event 一般不带 request `id`,但 `bash_execution_update` 是明确例外：`bash` command 的 envelope id 会传入 `executeBash`,后续 update event 可用同一可选 `id` 做 streaming correlation。[E: packages/coding-agent/docs/rpc.md:832][E: packages/coding-agent/docs/rpc.md:834][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:574][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:576][E: packages/coding-agent/src/core/agent-session.ts:183] 其它异步生命周期仍由 response `id` 关联 command 接受/失败，再由无 id 的 event stream 观察。[I]

## Extension UI bridge

RPC mode 为 extensions 提供专用 `ExtensionUIContext`:select/confirm/input 通过 `createDialogPromise(...)` 建 pending request、输出 `extension_ui_request`,再等待 host 写回 matching `extension_ui_response`;editor 也创建 pending request 并输出 `method:"editor"` request。[E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:80][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:91][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:99][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:122][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:129][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:136][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:137][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:142][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:147][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:254][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:257][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:269] 文档把这些称为 dialog methods:stdout 发 `extension_ui_request`,并阻塞到 client 以相同 `id` 发回 `extension_ui_response`。[E: packages/coding-agent/docs/rpc.md:1155][E: packages/coding-agent/docs/rpc.md:1157][E: packages/coding-agent/docs/rpc.md:1159][E: packages/coding-agent/docs/rpc.md:1161]

notify/status/widget/title/editor-text 这类方法直接发 `extension_ui_request`,文档称为 fire-and-forget methods,host 可以展示也可以忽略。[E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:152][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:154][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:168][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:170][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:195][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:198][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:218][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:220][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:238][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:240][E: packages/coding-agent/docs/rpc.md:1162] 部分 TUI-only 能力在 RPC mode 明确不可用或降级,包括 custom UI、working indicators、footer/header、editor component、tool expansion、theme switching 等。[E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:163][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:179][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:187][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:191][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:210][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:214][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:228][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:298][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:303][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:308][E: packages/coding-agent/docs/rpc.md:1166][E: packages/coding-agent/docs/rpc.md:1167][E: packages/coding-agent/docs/rpc.md:1168][E: packages/coding-agent/docs/rpc.md:1169][E: packages/coding-agent/docs/rpc.md:1170][E: packages/coding-agent/docs/rpc.md:1171][E: packages/coding-agent/docs/rpc.md:1172][E: packages/coding-agent/docs/rpc.md:1173][E: packages/coding-agent/docs/rpc.md:1174]

## 生命周期与关闭

RPC mode 会注册 `SIGTERM`,并在非 Windows 平台注册 `SIGHUP`;handler 先 `killTrackedDetachedChildren()`,再调用 shutdown,其中 `SIGHUP` 映射 exit code 129,`SIGTERM` 映射 exit code 143。[E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:366][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:367][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:368][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:374][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:375] `shutdown()` 会移除 signal handler、取消 session subscriptions、dispose runtimeHost、detach stdin、pause stdin,并在非 SIGTERM 路径 flush stdout 后退出。[E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:724][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:729][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:732][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:733][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:734][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:735][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:736][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:737][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:738][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:740]

stdin `end` 也触发 shutdown;每个 command 处理后会检查 extension shutdown request,如果 extension handler 设置了 `shutdownRequested`,RPC loop 会关闭进程。[E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:345][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:346][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:743][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:744][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:745][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:787][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:800][E: packages/coding-agent/src/modes/rpc/rpc-mode.ts:801]

## 跨包关系

开发文档的 Python client 示例通过 `subprocess.Popen(["pi", "--mode", "rpc", "--no-session"], stdin=PIPE, stdout=PIPE, text=True)` 启动 RPC 子进程,说明 RPC mode 的公开嵌入面仍是 stdin/stdout 子进程协议,不是 server package 的 listener/service。[E: packages/coding-agent/docs/rpc.md:1497][E: packages/coding-agent/docs/rpc.md:1503][E: packages/coding-agent/docs/rpc.md:1504][E: packages/coding-agent/docs/rpc.md:1505][E: packages/coding-agent/docs/rpc.md:1506][E: packages/coding-agent/docs/rpc.md:1507]

`surface.modes.rpc-protocol` 应负责 JSONL framing、response/event shape、extension UI request/response 与 typed client 的字段语义;本节点只覆盖 `runRpcMode` 作为 mode surface 的启动、dispatch、绑定与生命周期。[I] `ref.coding-agent.rpc-methods` 应负责逐项列出 `RpcCommand` 和 `RpcResponse` shape;本节点只把命令面按 `runRpcMode` 的源码区块归纳。[I]

## Sources

- packages/coding-agent/src/modes/rpc/rpc-mode.ts
- packages/coding-agent/src/rpc-entry.ts
- packages/coding-agent/docs/rpc.md

## 相关

- [surface.modes.rpc-protocol](rpc-protocol.md) - RPC JSONL framing、response/event shape 与 extension UI request/response 的协议层。
- [ref.coding-agent.rpc-methods](../../reference/rpc-methods.md) - `RpcCommand` 和 `RpcResponse` 的逐命令目录。
