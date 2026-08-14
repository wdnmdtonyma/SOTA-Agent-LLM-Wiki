---
id: subsys.execution.lsp
title: lsp 缝
kind: subsystem
tier: T2
pkg: execution
source:
  - packages/lsp/lsp/src/index.ts
  - packages/lsp/lsp/src/types.ts
  - packages/lsp/lsp/package.json
  - packages/lsp/lsp/tests/lsp.spec.ts
  - packages/lsp/lsp-stdio/src/index.ts
  - packages/lsp/lsp-stdio/src/instance.ts
  - packages/lsp/lsp-stdio/src/host.ts
  - packages/lsp/lsp-stdio/src/connection.ts
  - packages/lsp/lsp-stdio/src/translate.ts
  - packages/lsp/lsp-stdio/package.json
  - packages/lsp/lsp-stdio/tests/provider.spec.ts
  - packages/lsp/lsp-stdio/tests/host.spec.ts
  - packages/lsp/tool-lsp/src/index.ts
  - packages/lsp/tool-lsp/src/session-cwd.ts
  - packages/lsp/tool-lsp/package.json
  - examples/headless-agent/e2b.cordis.yml
  - packages/e2b/e2b/tests/composition.e2e.ts
  - apps/cli/config/agent-presets/minimal/agent.cordis.yml
  - apps/cli/config/agent-presets/standard/agent.cordis.yml
  - apps/cli/config/agent-presets/code/agent.cordis.yml
  - apps/cli/config/agent-presets/cordis/agent.cordis.yml
  - vendor/cordis/src/service.ts
  - vendor/cordis/src/events.ts
symbols:
  - ctx.lsp
  - Lsp
  - lsp-stdio
  - LspError
  - LspProvider
  - finalExtension
related:
  - spine.overview
  - spine.capability-seams
  - subsys.execution.fs
  - subsys.execution.subprocess
  - surface.tools.lsp
  - subsys.execution.e2b
  - spine.tool-call-anatomy
  - subsys.core.tools
evidence: explicit
status: verified
updated: 47f943859b
---

> `ctx.lsp`（`Lsp`）是 **provider 注册表 + 按文件最终扩展名选路** 的 capability 缝：恰好四个操作 `goToDefinition` / `findReferences` / `goToImplementation` / `hover`，没有 JSON-RPC 逃生舱。本仓唯一 shipped 后端是 namespace 插件 `lsp-stdio`（`inject = ['fs', 'lsp', 'subprocess']`），同时吃 `ctx.fs` 与 `ctx.subprocess`。四个 shipped preset 与 `dsh-base` **不挂** `dsh-lsp` / `dsh-lsp-stdio` / `dsh-tool-lsp`；E2B POC overlay 才插入这三行。

## 能回答的问题

- `ctx.lsp` 由哪个包 `provide`？`lsp-stdio` 是不是第二份 `Lsp` Service？
- 四个操作是哪四个？模型能不能发任意 JSON-RPC / rename / symbols？
- 选路看路径的哪一段扩展名？`foo.d.ts`、`Makefile`、`.bashrc` 各走哪条？
- `lsp-stdio` 怎样同时消费 `ctx.fs` 与 `ctx.subprocess`？只换 `ctx.fs` 会不会把 language server 搬到远程？
- `minimal` / `standard` / `code` / `cordis` 挂不挂本缝？E2B overlay 插入哪三行？
- 注册失败会不会留下半份路由？disposer / fiber dispose 释放什么？

## 职责边界

本页覆盖 **Definition**（`@deepseek-ai/dsh-lsp` 的 `Lsp`）与 **stdio 后端**（`@deepseek-ai/dsh-lsp-stdio`）。`Lsp` 是 `Service` 子类，构造 `super(ctx, 'lsp')` 独占 `ctx.lsp`。[E: packages/lsp/lsp/src/index.ts:87] 它不像 `dsh-fs`：使用时必须有一行 Loader 加载 `dsh-lsp` 本身，后端 **不** `extends Lsp`，只 `registerProvider`。

本缝拥有：品牌化 provider id 与扩展名路由表、按 `finalExtension` 的 order-independent 选路、封闭四操作与封闭结果 union、原子注册 / 一起释放、以及 `LspError` 稳定 `code`。`lsp-stdio` 另拥有：load 时 `resolveExecutable`、按 canonical workspace 池化的 stdio 进程、transient `didOpen` → 四个 `textDocument/*` 之一 → `didClose`、以及把 wire payload 收成缝上的 `locations` / `hover`。

明确不拥有：

- 模型可见 `lsp` 工具的 schema、one-based 坐标换算、渲染帽、`timeoutMs`：[surface.tools.lsp](../../surface/tools/lsp.md)（`surface.tools.lsp`）。`dsh-tool-lsp` 只 `inject` `tools` / `lsp` / `systemPrompt`，**不** `inject` `fs` 或 `subprocess`。[E: packages/lsp/tool-lsp/src/index.ts:48]
- `ctx.fs` 原语与 sandbox 围栏：[subsys.execution.fs](fs.md)（`subsys.execution.fs`）。stdio 读源走 `fs.resolve` / `fs.streamText` / `fs.contains`。
- `ctx.subprocess` 的 spawn 力学与 env scrub：[subsys.execution.subprocess](subprocess.md)（`subsys.execution.subprocess`）。stdio 把已解析的 argv 交给 `spawn`。
- `ctx.sandbox.confine` / `SandboxMode`。`lsp-stdio` **不** `inject` `sandbox` 或 `sandboxPolicy`；语言服务器进程不受 confine。[E: packages/lsp/lsp-stdio/src/index.ts:47]
- E2B 远程 one-world 怎么成对替换 fs+subprocess：[subsys.execution.e2b](e2b.md)（`subsys.execution.e2b`）。本页只写：stdio 同时挂在那两条缝上，所以只换一边会分裂世界。
- `ctx.tools` 注册表与 `tools/pre-execute` 管线：[subsys.core.tools](../core/tools.md)、[spine.tool-call-anatomy](../../spine/tool-call-anatomy.md)。

**host 面 vs agent-preset 面。** 默认安装是本地 Web GUI（`dsh web`），本仓没有 shipped TUI。`dsh-base` / `dsh-web-app` / 四个 shipped preset **都不**加载本缝。出现时（E2B POC overlay）三行插在与 `e2b` / `fs-e2b` / `subprocess-e2b` 同一 insert 列表，是该 example composition 的进程级服务，**没有** `isolate.lsp`。[E: examples/headless-agent/e2b.cordis.yml:42] [E: examples/headless-agent/e2b.cordis.yml:44] [E: examples/headless-agent/e2b.cordis.yml:56] 浏览器 client 不实现 `Lsp`。

**没有 `lsp/*` 事件。** `Lsp` 的 module augmentation 只声明 `Context.lsp`，不声明 waterfall / emit。[E: packages/lsp/lsp/src/index.ts:40] Cordis 全局规则仍是：若将来有人挂 waterfall，listener 必须调用 `next()` 才会 `cbs.shift()`。[E: vendor/cordis/src/events.ts:238] 本缝的组合失败是「同 realm 第二份 `Lsp` 抛」和「Consumer `inject` 等到 `lsp`」，不是占槽不 `next()`。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/lsp/lsp/src/index.ts` | Definition：`Lsp`、`finalExtension`、`LspError`、原子 `registerProvider` / `query` |
| `packages/lsp/lsp/src/types.ts` | `LspOperation` / `LspQueryRequest` / `LspQueryResult` / `LspProvider` / `LspService` |
| `packages/lsp/lsp/tests/lsp.spec.ts` | 选路、冲突、原子回滚、fiber dispose、signal 原样转发 |
| `packages/lsp/lsp-stdio/src/index.ts` | `apply`：load 时 resolve、持有 `ctx.fs`、`spawn` 闭包、`registerProvider` |
| `packages/lsp/lsp-stdio/src/host.ts` | `canonicalizeWorkspace` / `readHostSource`（`ctx.fs`） |
| `packages/lsp/lsp-stdio/src/instance.ts` | 一个 `(provider, workspace)` 进程：initialize、transient open、四操作、teardown |
| `packages/lsp/lsp-stdio/src/connection.ts` | JSON-RPC framing；`spawner({ argv, cwd, stdio, graceMs, env })` |
| `packages/lsp/lsp-stdio/src/translate.ts` | `requestMethod` / capability 检查 / `normalizeLocations` / `normalizeHover` |
| `packages/lsp/tool-lsp/src/index.ts` | 模型面 Consumer：`ctx.lsp.query` |
| `examples/headless-agent/e2b.cordis.yml` | 唯一写入本仓产品路径之外的 POC 装配 |

## 数据模型

| 符号 | 要点 |
|---|---|
| `Lsp` / `LspService` | 键名 `'lsp'`。公开面只有 `registerProvider` 与 `query`，没有 raw RPC、没有进程/文档控制 API。[E: packages/lsp/lsp/src/types.ts:121] [E: packages/lsp/lsp/src/types.ts:129] |
| `LspOperation` | 封闭 union：`'goToDefinition' \| 'findReferences' \| 'goToImplementation' \| 'hover'`。[E: packages/lsp/lsp/src/types.ts:17] |
| `LspQueryRequest` | 四个必填字段：`operation` / `filePath` / `position` / `workspaceRoot`。没有 `resolve()`，没有默认 cwd。`languageId` 不在请求里。 |
| `LspProviderQuery` | 请求 + 注册表派生的 `languageId`。language id 只用于 `didOpen` 同步，不参与选路。 |
| `LspPosition` / `LspRange` | 缝上是 **zero-based UTF-16**。模型侧 one-based 换算在 `dsh-tool-lsp`，本页不写字段表。 |
| `LspQueryResult` | `kind: 'locations'`（带 `resolvedWorkspaceUri`）或 `kind: 'hover'`（`hover` 可为 `null`）。[E: packages/lsp/lsp/src/types.ts:86] [E: packages/lsp/lsp/src/types.ts:87] |
| `LspProvider` | `id` + `extensionToLanguage` + `query()`。本仓生产实现是未导出的 `LocalLspProvider`。 |
| `finalExtension` | 取 basename 最后一段扩展名并小写。`dot <= 0`（无点或 leading-dot 点文件）返回 `''`，匹配不到任何路由。[E: packages/lsp/lsp/src/index.ts:65] [E: packages/lsp/lsp/src/index.ts:66] |
| `EXTENSION_PATTERN` | `/^\.[^./\\]+$/`：一个点 + 一段不含点/分隔符的字符。`.tar.gz` / `.d.ts` 当**映射键**非法。[E: packages/lsp/lsp/src/index.ts:70] |
| `LspError` | `HarnessError` 子类；调用方按 `code` 路由，不解析 `message`。[E: packages/lsp/lsp/src/index.ts:50] 注册期：`LSP_INVALID_PROVIDER` / `LSP_CONFLICT`。查询期：`LSP_UNAVAILABLE`。stdio：`LSP_DISPOSED` / `LSP_UNSUPPORTED_OPERATION` / `LSP_MALFORMED_RESPONSE`。工具层另有 `LSP_WORKSPACE_REQUIRED`。 |
| `lsp-stdio` `Config.servers` | 非空表：provider id → `command` + `extensionToLanguage` + 可选 args/env/初始化选项/字节与 teardown 预算。空表在 `apply` 抛，不发布。[E: packages/lsp/lsp-stdio/src/index.ts:128] |
| `HostWorkspace` | `target`（`FsTarget`，池化键是 `targetKey`）+ `canonicalPath`（spawn cwd）+ `fileUrl`（initialize `rootUri`）。 |

本缝 **不**声明 Cordis `Events`。

## 控制流

1. `Lsp`@packages/lsp/lsp/src/index.ts 在 augmentation 里声明 `Context.lsp`，构造调用 `Service` → `ctx.reflect.provide('lsp', self)`。[E: packages/lsp/lsp/src/index.ts:40] [E: packages/lsp/lsp/src/index.ts:87] [E: vendor/cordis/src/service.ts:57]
2. 使用本缝的 composition 必须加载 `@deepseek-ai/dsh-lsp`（E2B overlay 的 `id: lsp`）。`lsp-stdio` 是 namespace 插件（`export const name = 'lsp-stdio'`），`inject = ['fs', 'lsp', 'subprocess']`：三者缺一，这一行 pending，不会 `registerProvider`。[E: packages/lsp/lsp-stdio/src/index.ts:44] [E: packages/lsp/lsp-stdio/src/index.ts:47] [E: examples/headless-agent/e2b.cordis.yml:43]
3. `apply`@packages/lsp/lsp-stdio/src/index.ts 先对 `config.servers` 每一项 `validateServerConfig`，再 `ctx.subprocess.resolveExecutable(command, env, setupAbort.signal)`。任一 lookup 失败会 abort 兄弟 lookup，**在调用 `registerProvider` 之前**退出；单测钉死「valid + missing」之后 `.ts` 仍 `LSP_UNAVAILABLE`。[E: packages/lsp/lsp-stdio/src/index.ts:146] [E: packages/lsp/lsp-stdio/tests/provider.spec.ts:183] [E: packages/lsp/lsp-stdio/tests/provider.spec.ts:194]
4. 每个条目构造 `LocalLspProvider`：持有 `ctx.fs`，并把 `spec => ctx.subprocess.spawn(spec)` 当作 spawner。进程按 query 懒启动，不在 load 时 spawn。[E: packages/lsp/lsp-stdio/src/index.ts:154] [E: packages/lsp/lsp-stdio/src/index.ts:157]
5. `ctx.effect` 里按表 `registerProvider`。中途 `LSP_CONFLICT` 会 `disposers.reverse()` 全部卸掉再抛；单测两个 server 都映射 `.ts` 时，查询仍 `LSP_UNAVAILABLE`。[E: packages/lsp/lsp-stdio/src/index.ts:174] [E: packages/lsp/lsp-stdio/src/index.ts:176] [E: packages/lsp/lsp-stdio/tests/provider.spec.ts:277] [E: packages/lsp/lsp-stdio/tests/provider.spec.ts:288]
6. `Lsp.registerProvider`@packages/lsp/lsp/src/index.ts **先**校验再突变：空 id / 空表 / 非法扩展名 / 空 language id / 同一 provider 内 `.ts` 与 `TS` 撞车 → `LSP_INVALID_PROVIDER`；id 或扩展名已被别人占用 → `LSP_CONFLICT`。全部通过才 `ctx.effect` 一次性写入 `providerIds` + `routes`；yield 的 disposer 同时删 id 与全部扩展名。[E: packages/lsp/lsp/src/index.ts:95] [E: packages/lsp/lsp/src/index.ts:98] [E: packages/lsp/lsp/src/index.ts:124] [E: packages/lsp/lsp/src/index.ts:131] [E: packages/lsp/lsp/src/index.ts:135]
7. 单测钉死原子性：后注册者 `.py` 空闲但 `.ts` 冲突，整次注册回滚，`.py` 仍 `LSP_UNAVAILABLE`；dispose 后 id 可再注册；两个 provider 的选路与注册顺序无关；贡献 fiber `dispose` 后查询 `LSP_UNAVAILABLE`。[E: packages/lsp/lsp/tests/lsp.spec.ts:125] [E: packages/lsp/lsp/tests/lsp.spec.ts:132] [E: packages/lsp/lsp/tests/lsp.spec.ts:142] [E: packages/lsp/lsp/tests/lsp.spec.ts:145] [E: packages/lsp/lsp/tests/lsp.spec.ts:177]
8. 模型面 `dsh-tool-lsp` `apply` 注册 wire 名 `'lsp'`，`execute` 用 `sessionCwd(exec)`（`exec.agent?.session.header.cwd`）当 `workspaceRoot`；缺失立刻 `LSP_WORKSPACE_REQUIRED`，没有 fs 默认 cwd 回退。然后 `ctx.lsp.query({ operation, filePath, position, workspaceRoot }, exec.signal)`。[E: packages/lsp/tool-lsp/src/index.ts:107] [E: packages/lsp/tool-lsp/src/session-cwd.ts:18] [E: packages/lsp/tool-lsp/src/index.ts:184] [E: packages/lsp/tool-lsp/src/index.ts:186]
9. `Lsp.query` 用 `finalExtension(filePath)` 查 `routes`。无路由 → `LSP_UNAVAILABLE`。命中则把 `languageId` 填进 `LspProviderQuery`，`signal` 原样交给 backend。[E: packages/lsp/lsp/src/index.ts:144] [E: packages/lsp/lsp/src/index.ts:146] [E: packages/lsp/lsp/src/index.ts:148] [E: packages/lsp/lsp/tests/lsp.spec.ts:49]
10. `LocalLspProvider.query`：`canonicalizeWorkspace(this.fs, workspaceRoot)` 要求解析结果 `stat.type === 'directory'`；再在 per-workspace 队列里 `readHostSource`。源路径相对 `canonicalPath` 解析，`fs.contains` 失败则拒（含 symlink 逃出）。默认完整文档帽 `DEFAULT_MAX_DOCUMENT_BYTES = 4_000_000`。[E: packages/lsp/lsp-stdio/src/index.ts:51] [E: packages/lsp/lsp-stdio/src/index.ts:264] [E: packages/lsp/lsp-stdio/src/host.ts:51] [E: packages/lsp/lsp-stdio/src/host.ts:91] [E: packages/lsp/lsp-stdio/tests/host.spec.ts:110]
11. 每个 `workspace.target.targetKey` 最多一个 `LspInstance`：`instanceFor` 命中 `instances` 则复用，否则 `createInstance`。[E: packages/lsp/lsp-stdio/src/index.ts:322] [E: packages/lsp/lsp-stdio/src/index.ts:323] `LspConnection` 调用 spawner：`argv = [已 resolve 的 command, ...args]`，`cwd = canonicalPath`，`stdio` 为 stdin/stdout `pipe`、stderr 有界 collect，`graceMs = killGraceMs`，`env` 交给 subprocess 缝在 scrub 之后 merge。[E: packages/lsp/lsp-stdio/src/connection.ts:92] [E: packages/lsp/lsp-stdio/src/connection.ts:93] [E: packages/lsp/lsp-stdio/src/connection.ts:94] [E: packages/lsp/lsp-stdio/src/connection.ts:100] [E: packages/lsp/lsp-stdio/src/connection.ts:103]
12. `initialize` 发 `processId: null`（子进程可能在另一 PID 命名空间 / 机器上，不能让 server 监视 host PID）、`rootUri` 用 `workspaceUri`。`CLIENT_CAPABILITIES.general.positionEncodings` 只列 `utf-16`。server 回非 `utf-16` 的 `positionEncoding` 是普通 `Error`，不是 `LSP_UNSUPPORTED_OPERATION`。[E: packages/lsp/lsp-stdio/src/instance.ts:114] [E: packages/lsp/lsp-stdio/src/instance.ts:115] [E: packages/lsp/lsp-stdio/src/instance.ts:338] [E: packages/lsp/lsp-stdio/src/translate.ts:99]
13. 一次查询：缺对应 capability 或 `textDocumentSync` 不允许 transient open/close → `LSP_UNSUPPORTED_OPERATION`。否则 `didOpen`（`languageId` + 刚读的完整文本）→ `requestMethod(operation)` → `didClose`。`findReferences` 硬写 `context.includeDeclaration: true`。导航结果收成 `locations` + `resolvedWorkspaceUri`；`hover` 收成 contents 或 `null`。`workspace/applyEdit` 被拒；其它未识别的 server→client request 同样拒。[E: packages/lsp/lsp-stdio/src/instance.ts:147] [E: packages/lsp/lsp-stdio/src/instance.ts:150] [E: packages/lsp/lsp-stdio/src/translate.ts:34] [E: packages/lsp/lsp-stdio/src/instance.ts:203] [E: packages/lsp/lsp-stdio/src/instance.ts:266]
14. **换世界。** 读源走 `ctx.fs`，可执行查找与进程走 `ctx.subprocess`。只换 `ctx.fs` 不会把 language server 搬到远程；只换 `ctx.subprocess` 会让 canonicalize 的路径与 spawn 世界分裂。E2B POC 关掉本地 `subprocess` / `fs-local`，插入 `e2b` + `subprocess-e2b` + `fs-e2b` 后再挂本缝；live e2e 在同一沙箱里断言 `hover` 与 `definition`。[E: examples/headless-agent/e2b.cordis.yml:17] [E: examples/headless-agent/e2b.cordis.yml:20] [E: examples/headless-agent/e2b.cordis.yml:28] [E: examples/headless-agent/e2b.cordis.yml:30] [E: packages/e2b/e2b/tests/composition.e2e.ts:151] [E: packages/e2b/e2b/tests/composition.e2e.ts:155]
15. **卸掉。** effect teardown 先 `registerProvider` disposer（路由立即 `LSP_UNAVAILABLE`），再 `disposeAll` 拆进程。插件 fiber dispose 后查询不到已卸的 backend。[E: packages/lsp/lsp-stdio/src/index.ts:181] [E: packages/lsp/lsp-stdio/tests/provider.spec.ts:87]

## 设计动机

- **注册表，不是可替换的第二份 Service。** `ctx.fs` / `ctx.subprocess` 换世界 = 换那个键上的 Provider 类。`ctx.lsp` 的键由 `Lsp` 自己占住；换语言服务器 = 换挂上的 `LspProvider`，换执行世界 = 换 stdio 底下的 fs+subprocess。官方文档把 `dsh-lsp-stdio` 叫 Service Provider，指的是 **language-server 后端**，不是它再 `provide('lsp')`。
- **四个只读语义，没有逃生舱。** 模型不能 `workspace/executeCommand`、不能 rename、不能把任意 JSON-RPC 塞进缝。`LspService` 只有 `registerProvider` / `query`；stdio host 拒绝 `workspace/applyEdit`。加第五个操作是跨缝 / 后端 / 工具的编译期变更。
- **按最终扩展名、与注册顺序无关。** 路由是 `Map` 查找，不是「先注册者赢」的列表。`foo.d.ts` 的最终扩展名是 `.ts`，避免为复合后缀再开一套探测。
- **先校验再发布。** 非法或冲突的 `registerProvider` 不碰表。stdio 在 resolve 完全部 command 之前不注册；表内后一项冲突会卸掉已挂上的前一项。半份 TypeScript + 半份 Python 路由不能进生产。
- **workspace 是调用方给的，不是缝默认的。** `workspaceRoot` 必填。工具层拒绝无 session cwd 的调用，因为 stdio 必须先 canonicalize 一个真目录才能当 spawn cwd / initialize root。
- **host 不泄漏 PID、不写回。** `processId: null` 避免远程 server 监视 harness 进程。查询是 transient 打开只读缓冲；编辑走 `ctx.fs` 那条缝。
- **opt-in。** 默认 `dsh web` 组合没有 language server 生命周期、没有额外 PATH 依赖。包存在不等于 catalog 里有 `lsp`。

相对 Codex / Claude：那些产品常把跳转藏在内部 harness，不暴露封闭四操作工具。相对 Pi：Pi 没有这条可替换的 `ctx.lsp` 注册表。相对本仓 `glob`/`grep`：搜索只吃 `ctx.subprocess`；本后端同时吃两条。

## Gotcha

- `foo.d.ts` → `.ts`，不是 `.d.ts`。把 `.d.ts` 写进 `extensionToLanguage` 会因 `EXTENSION_PATTERN` 在注册期 `LSP_INVALID_PROVIDER`。[E: packages/lsp/lsp/src/index.ts:66] [E: packages/lsp/lsp/src/index.ts:111] [E: packages/lsp/lsp/tests/lsp.spec.ts:49]
- `Makefile`、`.bashrc`、`dir.d/file` 的 `finalExtension` 是 `''`，查询直接 `LSP_UNAVAILABLE`，不会「猜语言」。[E: packages/lsp/lsp/tests/lsp.spec.ts:54] [E: packages/lsp/lsp/tests/lsp.spec.ts:55] [E: packages/lsp/lsp/tests/lsp.spec.ts:56]
- `lsp-stdio` **不是**第二份 `ctx.lsp`。漏挂 `dsh-lsp` 时它卡在 `inject: lsp`；挂了缝但没有任何 `registerProvider` 时，工具看得到，查询 `LSP_UNAVAILABLE`。
- 四个 shipped preset 的 top-level 行里没有 `lsp` / `lsp-stdio` / `tool-lsp`。`minimal` 是 `persona` / `persistent-shell` / `filesystem`；`standard` 收束 `tool-web`；`code` 增量是 `tool-presentation`；`cordis` 收束 `tool-skill`。[E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:8] [E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:18] [E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:48] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:247] [E: apps/cli/config/agent-presets/code/agent.cordis.yml:259] [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:261]
- E2B overlay 是 `examples/headless-agent/e2b.cordis.yml`，不是 shipped preset。它在同一 insert 里挂 `lsp` + `lsp-stdio`（`npx typescript-language-server@5.0.0 --stdio`，`.ts/.tsx/.js/.jsx`）+ `tool-lsp`。[E: examples/headless-agent/e2b.cordis.yml:43] [E: examples/headless-agent/e2b.cordis.yml:45] [E: examples/headless-agent/e2b.cordis.yml:57]
- 语言服务器进程 **不受** `ctx.sandbox.confine`。文件围栏是 `ctx.fs.contains` 拒绝 workspace 外的**查询源**；返回的 location URI 可以指向 workspace 外。
- `findReferences` 没有 include-declaration 开关。想排除定义处，换工具或自己滤文本。[E: packages/lsp/lsp-stdio/src/instance.ts:203]
- 非 `utf-16` 的 `positionEncoding` 抛的是普通 `Error`（文案带 `unsupported position encoding`），`code` 不是 `LSP_UNSUPPORTED_OPERATION`。[E: packages/lsp/lsp-stdio/src/translate.ts:99]
- 查询在同一 workspace 上串行。`dsh-tool-lsp` 也未声明 `isConcurrencySafe`，registry 侧是 exclusive。不要指望靠并行打满多个 server。
- abort 时 stdio 发 `$/cancelRequest`，grace 内 server 不收摊就拆掉 instance，避免未完成请求和下一次 `didOpen` 重叠。
- 显式 `env` 在 subprocess scrub **之后** merge：可以故意把密钥或 `DSH_*` 传进 language server；ambient 同名键会被剥。

## Seam 三角

| 角色 | 落点 | ctx 键 / bundle / preset 行 |
|---|---|---|
| **Definition** | `@deepseek-ai/dsh-lsp` 的 `Lsp`（也是唯一占键的 Service 实现） | `ctx.lsp`。使用时是 Loader 行 `id: lsp`。`dsh-base` / shipped preset **没有**这行 |
| **Provider（语言服务器后端）** | `@deepseek-ai/dsh-lsp-stdio` 的 `LocalLspProvider`，经 `ctx.lsp.registerProvider` 挂上 | **不** `provide('lsp')`。`inject = ['fs', 'lsp', 'subprocess']`。E2B overlay `id: lsp-stdio` |
| **Consumer（fs + subprocess）** | 同一个 `lsp-stdio`：load 时 `resolveExecutable`，读源 `ctx.fs`，进程 `ctx.subprocess.spawn` | 少数同时吃两条执行缝的插件。换世界必须成对替换 |
| **Consumer（模型）** | `@deepseek-ai/dsh-tool-lsp` | `inject = ['tools', 'lsp', 'systemPrompt']`。E2B overlay `id: tool-lsp`。四个 shipped preset 不挂 |
| **Consumer（测试 / 夹具）** | 脚本化 `LspProvider` 直接 `registerProvider` | 不经过 stdio。证明选路与原子性不依赖某个 command |

换 language-server 实现 = 换 `servers` 表或另写一个 `LspProvider` 插件，不改 `dsh-tool-lsp`。换执行世界 = 换 `ctx.fs` **和** `ctx.subprocess`（E2B 用共享 `ctx.e2b` 绑成一对）。把第二个 `Lsp` Service 挂进同一 realm 会抛，不会静默覆盖。

## Sources

- packages/lsp/lsp/src/index.ts
- packages/lsp/lsp/src/types.ts
- packages/lsp/lsp/package.json
- packages/lsp/lsp/tests/lsp.spec.ts
- packages/lsp/lsp-stdio/src/index.ts
- packages/lsp/lsp-stdio/src/instance.ts
- packages/lsp/lsp-stdio/src/host.ts
- packages/lsp/lsp-stdio/src/connection.ts
- packages/lsp/lsp-stdio/src/translate.ts
- packages/lsp/lsp-stdio/package.json
- packages/lsp/lsp-stdio/tests/provider.spec.ts
- packages/lsp/lsp-stdio/tests/host.spec.ts
- packages/lsp/tool-lsp/src/index.ts
- packages/lsp/tool-lsp/src/session-cwd.ts
- packages/lsp/tool-lsp/package.json
- examples/headless-agent/e2b.cordis.yml
- packages/e2b/e2b/tests/composition.e2e.ts
- apps/cli/config/agent-presets/minimal/agent.cordis.yml
- apps/cli/config/agent-presets/standard/agent.cordis.yml
- apps/cli/config/agent-presets/code/agent.cordis.yml
- apps/cli/config/agent-presets/cordis/agent.cordis.yml
- vendor/cordis/src/service.ts
- vendor/cordis/src/events.ts

## 相关

- [spine.overview](../../spine/overview.md)（`spine.overview`）：`profile → bundle → agent preset` 与 host / preset 切面。
- [spine.capability-seams](../../spine/capability-seams.md)（`spine.capability-seams`）：`fs` / `subprocess` 解耦；LSP 是少数同时 `inject` 两条的 consumer。
- [subsys.execution.fs](fs.md)（`subsys.execution.fs`）：stdio 读源与 workspace canonicalize 走 `ctx.fs`。
- [subsys.execution.subprocess](subprocess.md)（`subsys.execution.subprocess`）：`resolveExecutable` / `spawn` / scrub；stdio 是本缝的 Consumer。
- [surface.tools.lsp](../../surface/tools/lsp.md)（`surface.tools.lsp`）：模型可见 `lsp` 的 schema、one-based 坐标、渲染帽。
- [subsys.execution.e2b](e2b.md)（`subsys.execution.e2b`）：POC overlay 成对替换 fs+subprocess，并挂上本缝。
- [spine.tool-call-anatomy](../../spine/tool-call-anatomy.md)（`spine.tool-call-anatomy`）：`tools/pre-execute → execute → post-execute`；本工具的 timeout 挂在 execute wrapper。
- [subsys.core.tools](../core/tools.md)（`subsys.core.tools`）：`ctx.tools.register`；缺 `ctx.lsp` 时 `tool-lsp` pending。
