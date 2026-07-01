---
id: integrations.lsp
title: LSP integration
kind: subsystem
tier: T2
v: v1
status: verified
updated: 8b68dc0d7
source:
  - packages/opencode/src/lsp/lsp.ts
  - packages/opencode/src/lsp/client.ts
  - packages/opencode/src/lsp/server.ts
  - packages/opencode/src/tool/lsp.ts
  - packages/opencode/src/tool/registry.ts
  - packages/core/src/v1/config/lsp.ts
symbols:
  - LSP.Service
  - LSPClient.create
  - LSPServer.Info
  - LspTool
  - ConfigLSPV1.Info
related:
  - tool.lsp
  - ref.lsp-servers
evidence: explicit
---

> LSP integration 是 V1 当前活跑的 language-server pool；它按 `(serverID, root)` 复用 client，把 diagnostics、definition、references、symbols 等 LSP request 暴露给内部工具和实验性 `lsp` tool。

## 能回答的问题

- V1 如何决定某个文件要启动哪些 language server。
- LSP client pool 的 key 是什么，什么时候会复用或标记 broken。
- diagnostics 为什么既支持 push diagnostic，也支持 pull diagnostic。
- `lsp` tool 何时注册给模型，permission key 是什么。
- 内建 server 数量为什么不能按旧描述写死为 40。

## 职责

`packages/opencode/src/lsp/lsp.ts` 定义 `LSP.Service`，它管理 server 配置、client pool、spawning map、broken server set，并暴露 hover/definition/references/implementation/documentSymbol/workspaceSymbol/callHierarchy/diagnostics 等方法。[E: packages/opencode/src/lsp/lsp.ts:119] `packages/opencode/src/lsp/client.ts` 包装 JSON-RPC connection，负责 initialize、document open/change、diagnostics 等 LSP protocol 细节。[E: packages/opencode/src/lsp/client.ts:132] `packages/opencode/src/lsp/server.ts` 定义每个 built-in language server 的 `Info`，包含 `id`、`extensions`、`root`、`spawn` 等字段。[E: packages/opencode/src/lsp/server.ts:80]

V1 `lsp` tool 在执行具体 LSP operation 前会调用 `lsp.touchFile(file, "document")`，确保目标文件被 language server 打开并等待 document diagnostics；编辑/写入/patch 与 formatter 的完整链路不由本节点 source 证明。[E: packages/opencode/src/tool/lsp.ts:80] [I]

## 关键文件

| 文件 | 角色 |
| --- | --- |
| `packages/opencode/src/lsp/lsp.ts` | LSP service、server config merge、pooling、method dispatch。 |
| `packages/opencode/src/lsp/client.ts` | 单个 LSP process 的 JSON-RPC protocol wrapper。 |
| `packages/opencode/src/lsp/server.ts` | built-in language server catalog 和 root detection helper。 |
| `packages/opencode/src/tool/lsp.ts` | 模型可调用的实验性 `lsp` tool。 |
| `packages/opencode/src/tool/registry.ts` | `experimentalLspTool` gating 和 `LSP.init()` 触发点。 |
| `packages/core/src/v1/config/lsp.ts` | V1 LSP config schema 和 builtin server id list。 |

## 数据模型

`LSP.Status` 输出 `id`、`name`、`root`、`status`，其中 status 只能是 `connected` 或 `error`。[E: packages/opencode/src/lsp/lsp.ts:50] `SymbolKind` 是 local enum，覆盖 LSP symbol kind 的 1 到 26 值。[E: packages/opencode/src/lsp/lsp.ts:58] workspace symbol 只保留 class、function、method、interface、variable、constant、struct、enum 这些 kind。[E: packages/opencode/src/lsp/lsp.ts:87]

`LSPServer.Info` 的 `root` 是函数，`spawn(root, ctx, flags)` 返回包含 process/initialization 的 `Handle | undefined`。[E: packages/opencode/src/lsp/server.ts:84] [E: packages/opencode/src/lsp/server.ts:85] V1 config `Entry` 支持 `command`、`extensions`、`disabled`、`env`、`initialization` 字段。[E: packages/core/src/v1/config/lsp.ts:9]

当前源码中的内建 server id list 有 38 个条目：`builtinServerIds` 从 `deno` 到 `julials`。[E: packages/core/src/v1/config/lsp.ts:22] [E: packages/core/src/v1/config/lsp.ts:60] 这是根据当前 HEAD 的源码列表计数得到；如果外部批次说明写 40，应以源码为准。[I]

## 控制流

### 初始化

1. service 读取 `config.get().lsp`。如果没有配置，所有 built-in server 默认 disabled。[E: packages/opencode/src/lsp/lsp.ts:151]
2. 如果有 LSP 配置，service 先把 `Object.values(LSPServer)` 加进 server map，再应用实验开关过滤。[E: packages/opencode/src/lsp/lsp.ts:154] [E: packages/opencode/src/lsp/lsp.ts:158]
3. `filterExperimentalServers` 在 `experimentalLspTy` 为 false 时删除 `ty`，为 true 时删除 `pyright`；这让 Python server 选择保持互斥。[E: packages/opencode/src/lsp/lsp.ts:98] [I]
4. object config 中某个 server 配置 `disabled: true` 时会从 server map 删除。[E: packages/opencode/src/lsp/lsp.ts:162]
5. object config 也可以用 `command` 和 `extensions` 覆盖或创建 server；custom server 没有 extensions 会在 config schema transform 阶段被拒绝。[E: packages/opencode/src/lsp/lsp.ts:168] [E: packages/core/src/v1/config/lsp.ts:63]

### Client pool

1. `getClients(file)` 首先拒绝 instance directory 之外的路径。[E: packages/opencode/src/lsp/lsp.ts:210]
2. 文件扩展名来自 `path.parse(file).ext || file`，所以无扩展名文件会把完整路径作为匹配 fallback。[E: packages/opencode/src/lsp/lsp.ts:213]
3. service 只考虑 extension 匹配的 server，并用 server root 函数计算 root。[E: packages/opencode/src/lsp/lsp.ts:255] [E: packages/opencode/src/lsp/lsp.ts:257]
4. pool 复用条件是 `client.root === root && client.serverID === server.id`；命中后直接返回 existing client。[E: packages/opencode/src/lsp/lsp.ts:261]
5. 如果同一个 `(root, server.id)` 已经在 spawning，后续请求等待同一个 deferred，不会再启动进程。[E: packages/opencode/src/lsp/lsp.ts:267]
6. 如果新启动出的 client 和已有 client 撞 `(root, server.id)`，新进程会 shutdown，返回旧 client。[E: packages/opencode/src/lsp/lsp.ts:244]
7. 启动失败会把 `root + server.id` 加入 broken set，后续相同 key 跳过。[E: packages/opencode/src/lsp/lsp.ts:225] [E: packages/opencode/src/lsp/lsp.ts:237]
8. `schedule` 把新 client push 到 pool；`getClients` 会按本次新增 client 数发布 `lsp.updated` event。[E: packages/opencode/src/lsp/lsp.ts:250] [E: packages/opencode/src/lsp/lsp.ts:293]

### LSP protocol client

1. `LSPClient.create` 用 child process 的 stdout/stdin 建立 VSCode JSON-RPC message connection。[E: packages/opencode/src/lsp/client.ts:132]
2. initialize request 发送 processId、rootUri、workspaceFolders，以及 text document sync、diagnostics 等 capabilities。[E: packages/opencode/src/lsp/client.ts:211] [E: packages/opencode/src/lsp/client.ts:237] [E: packages/opencode/src/lsp/client.ts:242]
3. push diagnostics 通过 `textDocument/publishDiagnostics` notification 更新 per-document diagnostics map。[E: packages/opencode/src/lsp/client.ts:160]
4. pull diagnostics 通过 `textDocument/diagnostic` 和 `workspace/diagnostic` request 支持 document/workspace pull model。[E: packages/opencode/src/lsp/client.ts:293] [E: packages/opencode/src/lsp/client.ts:329]
5. `notify.open` 对已打开文档发 `didChangeWatchedFiles` + `didChange`，对首次打开文档发 `didChangeWatchedFiles` + `didOpen`。[E: packages/opencode/src/lsp/client.ts:568] [E: packages/opencode/src/lsp/client.ts:579] [E: packages/opencode/src/lsp/client.ts:600] [E: packages/opencode/src/lsp/client.ts:611]
6. `waitForDiagnostics` 根据 mode 等待 document/full diagnostics，并对超时做 bounded wait。[E: packages/opencode/src/lsp/client.ts:630] [E: packages/opencode/src/lsp/client.ts:635] [E: packages/opencode/src/lsp/client.ts:638] [E: packages/opencode/src/lsp/client.ts:499]

### 模型工具

1. `packages/opencode/src/tool/lsp.ts` 定义的 tool id 是 `lsp`。[E: packages/opencode/src/tool/lsp.ts:37] [E: packages/opencode/src/tool/lsp.ts:38]
2. 支持的 operation 包括 `goToDefinition`、`findReferences`、`hover`、`documentSymbol`、`workspaceSymbol`、`goToImplementation`、`prepareCallHierarchy`、`incomingCalls`、`outgoingCalls`。[E: packages/opencode/src/tool/lsp.ts:11]
3. 运行前会询问 permission，permission id 是 `lsp`，pattern 固定是 `*`。[E: packages/opencode/src/tool/lsp.ts:56] [E: packages/opencode/src/tool/lsp.ts:57] [E: packages/opencode/src/tool/lsp.ts:58]
4. tool 会先检查目标文件是否存在以及是否有可用 LSP client；失败时抛 `File not found` 或 `No LSP server available for this file type.`。[E: packages/opencode/src/tool/lsp.ts:74] [E: packages/opencode/src/tool/lsp.ts:77]
5. registry 中 `lsp` tool 只在 `flags.experimentalLspTool` 开启时加入模型工具集合。[E: packages/opencode/src/tool/registry.ts:233]

## 设计动机与权衡

LSP pool 使用 `(serverID, root)` 作为复用边界，这是语言服务常见的 workspace 粒度：同一个 server 在同一个 root 下复用，避免每个文件都启动新进程。[I] 源码里复用判断、spawning map、duplicate shutdown 都围绕 root 和 server id 做判断。[E: packages/opencode/src/lsp/lsp.ts:261] [E: packages/opencode/src/lsp/lsp.ts:267] [E: packages/opencode/src/lsp/lsp.ts:244]

diagnostics 同时支持 push 和 pull，是为了适配不同 LSP server 能力；初始化后会读取 server capability 决定 `syncKind` 和 static diagnostics 支持。[E: packages/opencode/src/lsp/client.ts:257] [E: packages/opencode/src/lsp/client.ts:258] push/pull 结果在 `diagnostics` getter 中合并输出。[E: packages/opencode/src/lsp/client.ts:623]

`experimentalLspTool` gating 说明暴露给模型的 `lsp` tool 仍是实验功能；LSP service 作为 V1 runtime layer 初始化，但模型不一定能主动调用 `lsp` tool。[E: packages/opencode/src/tool/registry.ts:212] [E: packages/opencode/src/tool/registry.ts:233] [I]

## 易踩坑

- “40 内建 server”是陈旧批次提示；当前 `builtinServerIds` 源码列表是 38 个条目。[E: packages/core/src/v1/config/lsp.ts:22] [E: packages/core/src/v1/config/lsp.ts:60]
- custom LSP server 必须声明 extensions；schema transform 会拒绝没有 extensions 的 custom command。[E: packages/core/src/v1/config/lsp.ts:71]
- `ty` 和 `pyright` 在实验开关下互斥，不会同时从 built-in server map 保留。[E: packages/opencode/src/lsp/lsp.ts:98] [I]
- `getClients` 只接受 instance directory 内的文件，跨目录文件不会触发 LSP。[E: packages/opencode/src/lsp/lsp.ts:210]
- `lsp` tool 的 permission 粒度是全局 `*`，不是按文件路径。[E: packages/opencode/src/tool/lsp.ts:57]

## Sources

- packages/opencode/src/lsp/lsp.ts
- packages/opencode/src/lsp/client.ts
- packages/opencode/src/lsp/server.ts
- packages/opencode/src/tool/lsp.ts
- packages/opencode/src/tool/registry.ts
- packages/core/src/v1/config/lsp.ts

## 相关

- tool.lsp
- ref.lsp-servers
