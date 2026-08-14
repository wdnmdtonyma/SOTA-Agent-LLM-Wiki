---
id: surface.tools.lsp
title: lsp
kind: tool
tier: T1
pkg: execution
source:
  - packages/lsp/tool-lsp/src/index.ts
  - packages/lsp/tool-lsp/src/render.ts
  - packages/lsp/tool-lsp/src/session-cwd.ts
  - packages/lsp/tool-lsp/package.json
  - packages/lsp/tool-lsp/tests/tool-lsp.spec.ts
  - packages/lsp/tool-lsp/tests/render.spec.ts
  - packages/lsp/tool-lsp/tests/integration.spec.ts
  - packages/lsp/tool-lsp/tests/load-path.spec.ts
  - packages/lsp/lsp/src/index.ts
  - packages/lsp/lsp/src/types.ts
  - packages/lsp/lsp/package.json
  - packages/lsp/lsp/tests/lsp.spec.ts
  - packages/lsp/lsp-stdio/src/index.ts
  - packages/lsp/lsp-stdio/src/instance.ts
  - packages/lsp/lsp-stdio/src/translate.ts
  - packages/lsp/lsp-stdio/src/host.ts
  - packages/core/tools/src/index.ts
  - packages/core/tools/src/schema.ts
  - packages/guard/timeout-policy/src/index.ts
  - packages/session/session-checkpoint-policy/src/index.ts
  - packages/util/timeout/src/index.ts
  - apps/cli/config/agent-presets/minimal/agent.cordis.yml
  - apps/cli/config/agent-presets/standard/agent.cordis.yml
  - apps/cli/config/agent-presets/code/agent.cordis.yml
  - apps/cli/config/agent-presets/cordis/agent.cordis.yml
  - examples/acp-agent/tests/lsp.cordis.yml
  - examples/headless-agent/e2b.cordis.yml
symbols:
  - apply
  - name
  - inject
  - Config
  - DEFAULT_LSP_TOOL_TIMEOUT_MS
  - LSP_OPERATIONS
  - LSP_PROMPT_TEXT
  - parseLspArgs
  - presentLspCall
  - formatLocations
  - formatHover
  - sessionCwd
  - LspError
  - Lsp
  - finalExtension
related:
  - spine.tool-call-anatomy
  - ref.tools-catalog
  - subsys.execution.lsp
evidence: explicit
status: verified
updated: 47f943859b
---

> `lsp` 是 `@deepseek-ai/dsh-tool-lsp` 向模型注册的**只读**导航工具：单一 wire 名 `lsp`，四个 `operation`（`goToDefinition` / `findReferences` / `goToImplementation` / `hover`），经 `ctx.lsp` 查 language server。坐标是模型侧 **one-based UTF-16**，工具在 execute 里减 1 交给缝的 zero-based 位置。四个 shipped preset **都不装**；包存在不等于产品默认 catalog 里有它。

## 能回答的问题

- `lsp` 的 wire `name`、实现包、`inject` 和 `defineTool` 注册点在哪？缺 `ctx.lsp` 时 catalog 里会不会出现这个名字？
- 模型可见字段是哪四个？`line` / `character` 从几开始、什么编码？内部怎样变成 `ctx.lsp.query` 的 `position`？
- 四个 `operation` 各自返回 `locations` 还是 `hover`？截断帽改不改规范值？有没有 spill？
- 为什么没有 session cwd 就直接 `LSP_WORKSPACE_REQUIRED`，而不像 `read` 那样回退到 provider `cwd`？
- `minimal` / `standard` / `code` / `cordis` 装不装 `@deepseek-ai/dsh-tool-lsp`？要 opt-in 该挂哪几行？
- timeout / approval / sandbox / 并发分别挂在哪？`findReferences` 能不能关掉 declaration？

## Identity

模型看见的工具名是字面量 `'lsp'`，由 `apply` 交给 `ctx.tools.register(defineTool({ name: 'lsp', … }))`。[E: packages/lsp/tool-lsp/src/index.ts:107][E: packages/lsp/tool-lsp/src/index.ts:106]

实现包是 `@deepseek-ai/dsh-tool-lsp`。Cordis 插件名 `export const name = 'tool-lsp'`，`inject = ['tools', 'lsp', 'systemPrompt']`：三者缺一，这一行保持 pending，catalog 里不会出现 `lsp`。[E: packages/lsp/tool-lsp/package.json:2][E: packages/lsp/tool-lsp/src/index.ts:45][E: packages/lsp/tool-lsp/src/index.ts:48][E: packages/lsp/tool-lsp/tests/load-path.spec.ts:19][E: packages/lsp/tool-lsp/tests/load-path.spec.ts:20]

这是 **namespace 插件**：没有 `export default apply`。Loader `unwrapExports` 必须保住 `name` / `inject` / `Config` / `apply`；单测钉死模块上不存在 `default`。[E: packages/lsp/tool-lsp/tests/load-path.spec.ts:14][E: packages/lsp/tool-lsp/tests/tool-lsp.spec.ts:92]

`apply(ctx, config)` 先把 `maxLocations` / `maxResultChars` / `timeoutMs` 当成正整数校验（`timeoutMs` 还不得大于 `MAX_TIMER_DELAY_MS`），再挂 prompt 段并注册工具。工具插件**不 import 任何 LSP provider**；它只消费 `ctx.lsp`。[E: packages/lsp/tool-lsp/src/index.ts:100][E: packages/lsp/tool-lsp/src/index.ts:102]

同一次 `apply` 写 `systemPrompt` section `name: 'tool:lsp'`、`order: 112`，正文是 `LSP_PROMPT_TEXT`：日常导航用 search/read；只有文本匹配含糊、或改动前需要精确定义 / 实现 / 引用时才用 `lsp`。位置是 cursor 处的 one-based UTF-16；点在符号外可能空结果；`findReferences` 总是带上 declaration。[E: packages/lsp/tool-lsp/src/index.ts:104][E: packages/lsp/tool-lsp/src/index.ts:54][E: packages/lsp/tool-lsp/tests/tool-lsp.spec.ts:72]

`defineTool` **没有** `isConcurrencySafe`。registry `executionMode` 对未声明或非精确 `true` 的分类器一律 `exclusive`，所以两个 `lsp` 调用不会并行重叠。[E: packages/core/tools/src/index.ts:1278]

`timeoutMs` 写在工具定义上，默认 `DEFAULT_LSP_TOOL_TIMEOUT_MS = 60_000`。host 上的 `@deepseek-ai/dsh-tool-call-timeout-policy` 读到这个字段才会给 `tools/execute` 套 deadline。[E: packages/lsp/tool-lsp/src/index.ts:51][E: packages/lsp/tool-lsp/src/index.ts:179][E: packages/lsp/tool-lsp/tests/tool-lsp.spec.ts:77]

## 用途定位

`lsp` 是 **language-server 精度查询**，不是文本搜索，也不是文件系统读。四个封闭 `operation` 对应缝上的同一组语义，没有 rename、没有 symbols、没有 call hierarchy、没有 JSON-RPC 逃生舱。[E: packages/lsp/tool-lsp/src/render.ts:15][E: packages/lsp/lsp/src/types.ts:17]

相对 `read` / `grep` / `glob`：本工具要求调用 agent 带 `session.header.cwd`，用它当 `workspaceRoot` 交给 provider 去 canonicalize 并启动 / 复用 server。相对路径按这个 workspace 解析；**没有**「无 agent 就回退到 `ctx.fs` 默认 cwd」这条路。[E: packages/lsp/tool-lsp/src/session-cwd.ts:18][E: packages/lsp/tool-lsp/src/index.ts:184]

它不改文件、不经 `ctx.shell` / `ctx.terminals`、不发 `fs/observed`。sandbox 只罩文件副作用，本工具没有 per-call sandbox stamp，也不广告 `sandbox_permissions`。

## 输入 schema

以插件**默认 Config** boot 后的模型可见参数为准。`defineTool` 把 `parameters` 编成隐式开放 object；四个字段都进 JSON Schema `required`。schema **不填默认值**——四个字段都必填。[E: packages/lsp/tool-lsp/src/index.ts:111][E: packages/core/tools/src/schema.ts:451]

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---:|---|---|---|
| `operation` | `string` | 是 | 无 | schema `enum` = `LSP_OPERATIONS`：`goToDefinition`、`findReferences`、`goToImplementation`、`hover` | 不在枚举里的名字（例如 `rename`）在 `defineTool` 包装器里变成 `INVALID_ARGS`，进不了 `parseLspArgs`。[E: packages/lsp/tool-lsp/src/index.ts:114][E: packages/lsp/tool-lsp/tests/tool-lsp.spec.ts:88][E: packages/lsp/tool-lsp/tests/tool-lsp.spec.ts:208] |
| `file_path` | `string` | 是 | 无 | schema 只要 string；`parseLspArgs` 再拒 `trim().length === 0` | schema 文案写「相对 workspace 或绝对」。工具层原样传 `filePath: args.file_path`，不调用 `ctx.fs.resolve`。stdio provider 才 `canonicalizeWorkspace` / `readHostSource`。[E: packages/lsp/tool-lsp/src/index.ts:117][E: packages/lsp/tool-lsp/src/render.ts:50][E: packages/lsp/tool-lsp/src/render.ts:55][E: packages/lsp/lsp-stdio/src/index.ts:264] |
| `line` | `number` | 是 | 无 | schema 是 `number` 不是 `integer`、也没有 `minimum`；execute 再要求正整数 | **one-based** 行号。[E: packages/lsp/tool-lsp/src/index.ts:118][E: packages/lsp/tool-lsp/src/render.ts:68] |
| `character` | `number` | 是 | 无 | schema 是 `number` 不是 `integer`、也没有 `minimum`；execute 再要求正整数 | **one-based UTF-16** 列（code unit）。[E: packages/lsp/tool-lsp/src/index.ts:119] |

`line: 0`、`character: 0`、小数坐标、空白 `file_path` 都在 `parseLspArgs` 抛普通 `Error`（不是 `LspError`）。未知 `operation` 若已过 schema，文案是 `operation must be one of goToDefinition, findReferences, goToImplementation, hover`。[E: packages/lsp/tool-lsp/tests/render.spec.ts:33][E: packages/lsp/tool-lsp/tests/render.spec.ts:38][E: packages/lsp/tool-lsp/tests/render.spec.ts:43]

坐标换算发生在 `parseLspArgs`：`position = { line: line - 1, character: character - 1 }`。模型写 `line: 3, character: 5` 时，缝收到 `{ line: 2, character: 4 }`。[E: packages/lsp/tool-lsp/src/render.ts:57][E: packages/lsp/tool-lsp/tests/tool-lsp.spec.ts:121]

**Config 改帽和超时，不改字段名、不加字段。** 三个键都是可选正整数：

| Config 键 | 默认常量 | 作用 |
|---|---|---|
| `maxLocations` | `DEFAULT_MAX_LOCATIONS` = `100` | 渲染时最多列出多少条 location，超出追加 omission 行。[E: packages/lsp/tool-lsp/src/index.ts:68][E: packages/lsp/tool-lsp/src/render.ts:18] |
| `maxResultChars` | `DEFAULT_MAX_RESULT_CHARS` = `16_000` | 整段渲染文本（含截断标记）的字符帽。[E: packages/lsp/tool-lsp/src/index.ts:69][E: packages/lsp/tool-lsp/src/render.ts:21] |
| `timeoutMs` | `DEFAULT_LSP_TOOL_TIMEOUT_MS` = `60_000` | 写进 `definition.timeoutMs`；上限 `MAX_TIMER_DELAY_MS` = `2_147_483_647`。[E: packages/lsp/tool-lsp/src/index.ts:70][E: packages/util/timeout/src/index.ts:25] |

非正 / 非整 Config，或 `timeoutMs` 超出 Node 定时器范围，在 `apply()` 里直接让插件 load 失败，不会带着坏预算进 catalog。[E: packages/lsp/tool-lsp/src/index.ts:233][E: packages/lsp/tool-lsp/tests/tool-lsp.spec.ts:96][E: packages/lsp/tool-lsp/tests/tool-lsp.spec.ts:101]

四个 shipped preset 都不挂本插件，因此**没有** shipped yml 覆盖这些键。仓库里的 opt-in 例子：ACP 测试 composition 把 `maxLocations` 写成 `1`。[E: examples/acp-agent/tests/lsp.cordis.yml:25]

## 输出 & 截断 / spill

`execute` 返回封闭 union，registry 用 `output.schema` 校验后再 `render`。[E: packages/lsp/tool-lsp/src/index.ts:121][E: packages/core/tools/src/index.ts:1795]

| `kind` | 何时 | 规范值 | 模型看见的文本 |
|---|---|---|---|
| `locations` | `goToDefinition` / `findReferences` / `goToImplementation` | `{ kind, locations: [{ uri, range }], resolvedWorkspaceUri }`。`range` 仍是缝的 **zero-based** UTF-16。[E: packages/lsp/tool-lsp/src/index.ts:195] | `formatLocations`：按文件分组，每条写成 one-based `path:line:character`（用 `range.start`）。空列表是 `No results.`。[E: packages/lsp/tool-lsp/src/render.ts:91][E: packages/lsp/tool-lsp/src/render.ts:100][E: packages/lsp/tool-lsp/tests/render.spec.ts:112] |
| `hover` | `operation === 'hover'` | `{ kind: 'hover', hover: null \| { contents, range? } }`。`range` 若有，同样 zero-based，原样拷进 value。[E: packages/lsp/tool-lsp/src/index.ts:206] | `formatHover`：`null` → `No hover information.`；否则只吐 `contents`，**不**把 range 写进文本。[E: packages/lsp/tool-lsp/src/render.ts:118][E: packages/lsp/tool-lsp/tests/tool-lsp.spec.ts:187] |

`path` 由 `renderUri(location.uri, resolvedWorkspaceUri)` 决定，**不**用 session cwd 做相对化：workspace 内的 `file:` URI 变成相对路径（正斜杠）；workspace 外变成 URI 派生的绝对路径；非 `file:`（`untitled:` / `jdt://`）原样保留。[E: packages/lsp/tool-lsp/src/render.ts:139][E: packages/lsp/tool-lsp/tests/tool-lsp.spec.ts:166][E: packages/lsp/tool-lsp/tests/render.spec.ts:99]

截断分两层，都只动 **渲染文本**：

1. `maxLocations`：`locations.slice(0, maxLocations)`，再追加 `… N more location(s) omitted (limit M).`[E: packages/lsp/tool-lsp/src/render.ts:92][E: packages/lsp/tool-lsp/src/render.ts:106]
2. `maxResultChars`：`boundResult` 把整段（含 omission 行）再切一刀，截断标记本身也算进帽里。[E: packages/lsp/tool-lsp/src/render.ts:124]

规范值保留 provider 交来的**全部** location。`maxLocations: 1` 时模型文本只剩第一条加 omission 行，但 `result.value.locations` 仍是完整数组。[E: packages/lsp/tool-lsp/tests/tool-lsp.spec.ts:151]

`lsp` **没有** spill 路径：不读 `ctx.spillStore`，不把正文卸到磁盘。也没有 `output.presentationMeta`。失败走 registry `toolErrorResult`：`content` 为 `Error: <message>`；`LspError` / `ToolArgsError` 这类 `HarnessError` 的 `{ name, code }` 进 `error.info`（例如 `LSP_WORKSPACE_REQUIRED` / `LSP_UNAVAILABLE` / `INVALID_ARGS` / `TOOL_TIMEOUT`）。[E: packages/core/tools/src/index.ts:1874][E: packages/core/tools/src/index.ts:644][E: packages/lsp/tool-lsp/tests/tool-lsp.spec.ts:194]

UI 待定卡片是 `presentLspCall`：`card: 'generic'`、`kind: 'search'`，title 形如 `LSP hover a.ts:2:3`，`locations[0].line` 只有行、没有列（列留在 title 里）。[E: packages/lsp/tool-lsp/src/render.ts:186][E: packages/lsp/tool-lsp/tests/tool-lsp.spec.ts:232]

## 背后的 seam

| 角色 | 落点 |
|---|---|
| Definition | `@deepseek-ai/dsh-lsp` 的 `ctx.lsp`（`Lsp` Service）：`registerProvider` + `query`。缝上的 `LspPosition` 是 `line` + `character` 两个整数；模型侧减 1 之后原样传入，stdio host 按 LSP 的 zero-based UTF-16 使用。没有 protocol 类型、没有进程/文档控制、没有通用 JSON-RPC。[E: packages/lsp/lsp/package.json:2][E: packages/lsp/lsp/src/index.ts:82][E: packages/lsp/lsp/src/types.ts:20] |
| Provider | 本仓 shipped 实现是 `@deepseek-ai/dsh-lsp-stdio`（插件名 `lsp-stdio`）。`inject = ['fs', 'lsp', 'subprocess']`：读源走 `ctx.fs`，拉 server 走 `ctx.subprocess`。每个 Config `servers` 条目注册一个 `LspProvider`（扩展名互斥、按最终扩展名路由，与注册顺序无关）。[E: packages/lsp/lsp-stdio/src/index.ts:44][E: packages/lsp/lsp-stdio/src/index.ts:47][E: packages/lsp/lsp/src/index.ts:144] |
| Consumer | `@deepseek-ai/dsh-tool-lsp` 的 `lsp` 工具。它 **不** inject `fs` / `subprocess`；换掉 stdio provider 不会改工具 schema。[E: packages/lsp/tool-lsp/src/index.ts:48][E: packages/lsp/tool-lsp/src/index.ts:186] |

`Lsp.query`：用 `finalExtension(filePath)` 查表。`dot <= 0`（无点或 leading-dot dotfile）返回 `''`；否则取最后一段扩展名并小写（`foo.d.ts` → `.ts`）。`''` 匹配不到路由，再抛 `LspError` `LSP_UNAVAILABLE`。[E: packages/lsp/lsp/src/index.ts:65][E: packages/lsp/lsp/src/index.ts:66][E: packages/lsp/lsp/src/index.ts:145][E: packages/lsp/lsp/tests/lsp.spec.ts:49][E: packages/lsp/lsp/tests/lsp.spec.ts:54][E: packages/lsp/tool-lsp/tests/tool-lsp.spec.ts:201]

stdio provider 收到查询后：`canonicalizeWorkspace` 要求 `workspaceRoot` 解析成目录；`readHostSource` 用该 workspace 当 `cwd` 解析 `filePath`，并拒绝 workspace 外的源；再对每个 canonical workspace 单飞一个 server，transient `didOpen` → 四个 `textDocument/*` 之一 → `didClose`。[E: packages/lsp/lsp-stdio/src/index.ts:264][E: packages/lsp/lsp-stdio/src/host.ts:51][E: packages/lsp/lsp-stdio/src/host.ts:91][E: packages/lsp/lsp-stdio/src/translate.ts:34]

`findReferences` 在模型侧**没有** include-declaration 开关。stdio host 发 `textDocument/references` 时硬写 `context: { includeDeclaration: true }`。[E: packages/lsp/lsp-stdio/src/instance.ts:203][E: packages/lsp/lsp-stdio/src/translate.ts:35]

换 provider 会带走：扩展名路由、怎样 canonicalize workspace / 读源、server 进程生命周期、capability 检查（`LSP_UNSUPPORTED_OPERATION`）、hover 文本怎么从 markup 拼起来。不会带走：四个 `operation`、one-based 模型坐标、渲染帽、`LSP_WORKSPACE_REQUIRED`。

## 执行管线

模型发出 `lsp` 后，loop 经 `ctx.tools.execute` 进入 registry：`tools/pre-execute` → monotonic `guard` → `tools/execute`（around-dispatch）→ 工具 body → `tools/post-execute` → `output.render`。[E: packages/core/tools/src/index.ts:1476][E: packages/core/tools/src/index.ts:1574][E: packages/core/tools/src/index.ts:1744]

对本工具的挂点：

- **`tools/pre-execute`**：`lsp` 自己不注册 listener，也不 `ask`。waterfall 默认 `{ kind: 'allow' }`。没有 escalation 字段，不会走到 `ctx.approval`。[E: packages/core/tools/src/index.ts:1477]
- **并发**：未声明 `isConcurrencySafe` → `exclusive`。stdio 侧每个 workspace 还有自己的查询队列，那是 provider 内部串行，不是 registry 调度。[E: packages/core/tools/src/index.ts:1278][E: packages/lsp/lsp-stdio/src/instance.ts:93]
- **`tools/execute` 包装**：
  - `session-checkpoint-policy` 仅在「有 `exec.agent` 且 `exec.parent === undefined`」时 `flush` session，再 `next()`。[E: packages/session/session-checkpoint-policy/src/index.ts:71]
  - `timeout-policy` 读 `definition.timeoutMs`（默认 60s）。到期把结果换成 `TOOL_TIMEOUT`（`tool call timed out after Nms`），集成测试用挂起的 definition server + `timeoutMs: 300` 钉死这条。[E: packages/guard/timeout-policy/src/index.ts:57][E: packages/guard/timeout-policy/src/index.ts:25][E: packages/lsp/tool-lsp/tests/integration.spec.ts:97]
- **body**：`defineTool` 先 `validateArgs`（enum / required），再进 `apply` 里的 `execute`。`exec.signal` 原样传给 `ctx.lsp.query`。[E: packages/core/tools/src/schema.ts:587][E: packages/lsp/tool-lsp/src/index.ts:191]
- **`tools/post-execute`**：本工具不注册 listener，默认 `accept`。[E: packages/core/tools/src/index.ts:1745]
- **sandbox / approval**：不挂。

若某个 composition 同时挂了 `lsp` 和 `code` preset 的 `tool-presentation` `mode: code`：模型能直接调的唯一 wire 名仍是 `run_code`。非嵌套且 `mode === 'code'` 时，除 `run_code` 外的名字在 `createExecution` 里 collapse，在 **policy 之前**变成 `UNKNOWN_TOOL`，不进 `tools/pre-execute`。SDK 子分发带 `parent`（`nested === true`），不 collapse，仍走完整管线。[E: packages/core/tools/src/index.ts:1325][E: packages/core/tools/src/index.ts:1381]

## Preset 装配

成员资格只认 `apps/cli/config/agent-presets/{minimal,standard,code,cordis}/agent.cordis.yml`。仓库里有 `@deepseek-ai/dsh-tool-lsp` **不等于**产品默认装。四个 shipped 文件的全部 top-level `id:` 如下，其中**没有** `tool-lsp`，也没有 `@deepseek-ai/dsh-lsp` / `@deepseek-ai/dsh-lsp-stdio`。

| preset | 装 `@deepseek-ai/dsh-tool-lsp`？ | `disabled` | isolate | 说明 |
|---|---|---|---|---|
| `minimal` | **否** | — | — | top-level 只有 `persona` / `persistent-shell` / `filesystem`。文本读写是 `str_replace_editor`，不是 `lsp`。[E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:8][E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:18][E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:48] |
| `standard` | **否** | — | — | 以 `tool-web` 收束（`fetch: false`，`searchTimeoutMs: 60000`）。16 个 top-level `id` 无 `tool-lsp`。[E: apps/cli/config/agent-presets/standard/agent.cordis.yml:247][E: apps/cli/config/agent-presets/standard/agent.cordis.yml:250] |
| `code` | **否** | — | — | 相对 `standard` 的增量是末尾 `tool-presentation` `mode: code`，模型直调只剩 `run_code`。没有 `tool-lsp` 行。[E: apps/cli/config/agent-presets/code/agent.cordis.yml:259][E: apps/cli/config/agent-presets/code/agent.cordis.yml:262] |
| `cordis` | **否** | — | — | 增量是 `tool-cordis` + 带 `customSkillDirs` 的 skill 两行。收束 `id` 是 `tool-skill`，不是 `tool-lsp`。[E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:245][E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:261] |

opt-in 出现在 **example / 测试 composition**，以及用户自己的 preset / `--patch`，不是 shipped roster：

- ACP 测试 overlay `examples/acp-agent/tests/lsp.cordis.yml`：`insert` `lsp`（`@deepseek-ai/dsh-lsp`）+ `lsp-stdio`（fixture `lsp-server.mjs`，`.ts` → `typescript`）+ `timeout-policy` + `tool-lsp`（`maxLocations: 1`）。[E: examples/acp-agent/tests/lsp.cordis.yml:10][E: examples/acp-agent/tests/lsp.cordis.yml:22]
- headless E2B POC `examples/headless-agent/e2b.cordis.yml`：同样 insert `lsp` + `lsp-stdio`（`npx typescript-language-server@5.0.0 --stdio`，`.ts/.tsx/.js/.jsx`）+ `tool-lsp`（无 Config 覆盖，用插件默认帽）。[E: examples/headless-agent/e2b.cordis.yml:43][E: examples/headless-agent/e2b.cordis.yml:56]

只挂 `tool-lsp`、不挂 `dsh-lsp` Provider，插件会卡在 `inject: lsp`。只挂缝、不挂 `lsp-stdio`（或其它 `registerProvider`），工具看得到，但查询会 `LSP_UNAVAILABLE`。

## execute() 走读

符号：`apply` @ `packages/lsp/tool-lsp/src/index.ts`，`parseLspArgs` / `formatLocations` / `formatHover` @ `render.ts`，`sessionCwd` @ `session-cwd.ts`，`Lsp.query` @ `packages/lsp/lsp/src/index.ts`。

1. **schema 校验。** `defineTool` 包装器 `validateArgs`：缺字段或 `operation` 不在四元 enum，抛 `ToolArgsError`（`INVALID_ARGS`）。[E: packages/core/tools/src/schema.ts:466][E: packages/core/tools/src/schema.ts:587][E: packages/lsp/tool-lsp/tests/tool-lsp.spec.ts:208]

2. **参数与坐标。** `parseLspArgs(args)`：确认 `operation` ∈ `LSP_OPERATIONS`、非空 `file_path`、正整数 `line`/`character`，再减 1 得到缝的 `LspPosition`。[E: packages/lsp/tool-lsp/src/index.ts:181][E: packages/lsp/tool-lsp/src/render.ts:57][E: packages/lsp/tool-lsp/tests/render.spec.ts:28]

3. **强制 session cwd。** `workspaceRoot = sessionCwd(exec)` 只读 `exec.agent?.session.header.cwd`。`undefined`（无 agent、或 header 没 cwd）立刻 `throw new LspError(..., 'LSP_WORKSPACE_REQUIRED')`，文案 `the lsp tool requires a session workspace cwd`。这里**没有** fallback。[E: packages/lsp/tool-lsp/src/index.ts:182][E: packages/lsp/tool-lsp/src/index.ts:184][E: packages/lsp/tool-lsp/src/session-cwd.ts:18][E: packages/lsp/tool-lsp/tests/tool-lsp.spec.ts:194]

4. **缝查询。** `ctx.lsp.query({ operation, filePath, position, workspaceRoot }, exec.signal)`。`Lsp.query` 按 `finalExtension(filePath)` 选 provider，把 `languageId` 填进 `LspProviderQuery` 再转发。[E: packages/lsp/tool-lsp/src/index.ts:186][E: packages/lsp/lsp/src/index.ts:148][E: packages/lsp/lsp/tests/lsp.spec.ts:67]

5. **stdio 路径（opt-in 时）。** `LocalLspProvider.query`：`canonicalizeWorkspace` → 在 workspace 内读源（默认 `maxDocumentBytes` 4_000_000）→ 取或建该 workspace 的 `LspInstance` → 排队 `runQuery`。缺 operation capability 或 `textDocumentSync` 不允许 transient open/close → `LspError` `LSP_UNSUPPORTED_OPERATION`。`negotiatePositionEncoding` 对非 `utf-16` 抛的是普通 `Error`（`server negotiated unsupported position encoding ...`），不是 `LSP_UNSUPPORTED_OPERATION`。导航结果经 `normalizeLocations`（`Location` / `LocationLink` / `null`）；hover 归一成 `{ contents, range? }` 或 `null`。[E: packages/lsp/lsp-stdio/src/index.ts:264][E: packages/lsp/lsp-stdio/src/instance.ts:147][E: packages/lsp/lsp-stdio/src/instance.ts:149][E: packages/lsp/lsp-stdio/src/translate.ts:99][E: packages/lsp/lsp-stdio/src/translate.ts:146]

6. **映射规范值。** `locations` 把每条 `uri` + `range` 拷出来，并带上 provider 的 `resolvedWorkspaceUri`（可能已解 symlink，和传入的 session cwd 不是同一字符串）。`hover` 把 `null` 留成显式 `null`；有 `range` 才展开。[E: packages/lsp/tool-lsp/src/index.ts:203][E: packages/lsp/tool-lsp/src/index.ts:208][E: packages/lsp/tool-lsp/tests/tool-lsp.spec.ts:166]

7. **渲染。** registry `createSuccessResult` → `formatLocations` / `formatHover`。集成测试走真实 stdio fixture：`goToDefinition` `a.ts` `line: 1, character: 7` 渲染成 `a.ts:1:1`。[E: packages/lsp/tool-lsp/src/index.ts:170][E: packages/lsp/tool-lsp/tests/integration.spec.ts:89]

8. **取消。** 工具把 `exec.signal` 穿到 `query`；timeout-policy 会在 deadline 内换成带 `TOOL_TIMEOUT` 的派生 signal。stdio 在 abort 时发 `$/cancelRequest`，grace 过后拆掉 instance，避免未完成请求和下一次 `didOpen` 重叠。[E: packages/lsp/tool-lsp/tests/tool-lsp.spec.ts:225][E: packages/lsp/lsp-stdio/src/instance.ts:221]

## 设计动机·edge

DSH 把 LSP 收成 **四个只读语义**，而不是把 language server 暴露成通用 RPC。模型不能发 `workspace/executeCommand`、不能改 server 配置、也不能做 rename。和 Claude / Codex 一类「有时把定义跳转藏进内部」的做法不同：这里是显式 model-visible 工具，但 **opt-in**，默认 catalog 故意没有它。

和 peer / 兄弟工具的差异：

- **精度工具，不是搜索。** prompt 明确要求先 `search`/`read`；`lsp` 处理歧义和改前确认。点在符号外可以合法地 `No results.` / `No hover information.`，不是错误。[E: packages/lsp/tool-lsp/src/index.ts:55]
- **坐标方言。** 模型 one-based UTF-16；缝和 LSP 协议 zero-based UTF-16。stdio host 对非 `utf-16` 的 `positionEncoding` 抛普通 `Error`，不是 `LSP_UNSUPPORTED_OPERATION`。[E: packages/lsp/tool-lsp/src/render.ts:57][E: packages/lsp/lsp-stdio/src/translate.ts:99]
- **cwd 无 fallback。** `read` 在无 agent 时把 cwd 交给 `ctx.fs`；`lsp` 不行，因为本地 provider 必须先 canonicalize 真实 workspace 才能拉 server。[E: packages/lsp/tool-lsp/src/session-cwd.ts:18][E: packages/lsp/tool-lsp/src/index.ts:184]
- **相对化跟 provider URI，不跟 session cwd。** symlink alias 当 cwd 时，location 仍相对 `resolvedWorkspaceUri` 显示成 `a.ts`，不会被误判成 workspace 外。[E: packages/lsp/tool-lsp/tests/tool-lsp.spec.ts:166]
- **帽只切展示。** 完整 location 留在 `value` 里，但下一轮模型只看见截断后的 `content`（除非别的层再投影 `value`）。
- **declaration 不是参数。** `findReferences` 永远带 defining site；想排除声明，换工具或自己滤文本，不要幻想有个 flag。
- **扩展名路由，不是语言探测。** `Makefile` / `.bashrc` / 无扩展名的 `finalExtension` 是 `''`，随后 `Lsp.query` 因无路由抛 `LSP_UNAVAILABLE`。`foo.d.ts` 走 `.ts` 那条 provider，不是 `.d.ts`。[E: packages/lsp/lsp/src/index.ts:65][E: packages/lsp/lsp/src/index.ts:145][E: packages/lsp/lsp/tests/lsp.spec.ts:49][E: packages/lsp/lsp/tests/lsp.spec.ts:54]
- **独占调度。** 两个 `lsp` 不会被标成 `parallel`；再叠加 stdio 的 per-workspace 队列。不要指望靠并发打满多个 server。
- **不是产品默认。** 四个 shipped preset 都不装。要在会话里看见 `lsp`，必须像 example composition 那样同时挂缝、至少一个 provider、以及 `tool-lsp`。

## Sources

- packages/lsp/tool-lsp/src/index.ts
- packages/lsp/tool-lsp/src/render.ts
- packages/lsp/tool-lsp/src/session-cwd.ts
- packages/lsp/tool-lsp/package.json
- packages/lsp/tool-lsp/tests/tool-lsp.spec.ts
- packages/lsp/tool-lsp/tests/render.spec.ts
- packages/lsp/tool-lsp/tests/integration.spec.ts
- packages/lsp/tool-lsp/tests/load-path.spec.ts
- packages/lsp/lsp/src/index.ts
- packages/lsp/lsp/src/types.ts
- packages/lsp/lsp/package.json
- packages/lsp/lsp/tests/lsp.spec.ts
- packages/lsp/lsp-stdio/src/index.ts
- packages/lsp/lsp-stdio/src/instance.ts
- packages/lsp/lsp-stdio/src/translate.ts
- packages/lsp/lsp-stdio/src/host.ts
- packages/core/tools/src/index.ts
- packages/core/tools/src/schema.ts
- packages/guard/timeout-policy/src/index.ts
- packages/session/session-checkpoint-policy/src/index.ts
- packages/util/timeout/src/index.ts
- apps/cli/config/agent-presets/minimal/agent.cordis.yml
- apps/cli/config/agent-presets/standard/agent.cordis.yml
- apps/cli/config/agent-presets/code/agent.cordis.yml
- apps/cli/config/agent-presets/cordis/agent.cordis.yml
- examples/acp-agent/tests/lsp.cordis.yml
- examples/headless-agent/e2b.cordis.yml

## 相关

- [工具调用解剖](../../spine/tool-call-anatomy.md) — `tools/pre-execute` → execute → `tools/post-execute`；本页的 timeout / checkpoint / Code Mode collapse 都挂在这条管线上。
- [工具 catalog](../../reference/tools-catalog.md) — 全量 model-visible 工具表；`lsp` 是 opt-in 行，不是四个 shipped preset 的默认成员。
- [lsp 缝](../../subsystems/execution/lsp.md) — `ctx.lsp` Service Definition、provider 注册 / 扩展名路由、stdio host 的进程与 transient-open 生命周期。
