---
id: surface.tools.read
title: read 读文件
kind: tool
tier: T1
pkg: execution
source:
  - packages/fs/tool-fs/src/index.ts
  - packages/fs/tool-fs/src/read.ts
  - packages/fs/tool-fs/src/read-render.ts
  - packages/fs/tool-fs/src/read-target.ts
  - packages/fs/tool-fs/src/session-cwd.ts
  - packages/fs/tool-fs/src/sandbox.ts
  - packages/fs/tool-fs/src/write.ts
  - packages/fs/tool-fs/package.json
  - packages/fs/tool-fs/tests/tools.spec.ts
  - packages/fs/tool-fs/tests/integration.spec.ts
  - packages/fs/tool-fs/tests/read-render.spec.ts
  - packages/fs/fs/src/index.ts
  - packages/fs/fs/src/types.ts
  - packages/fs/fs-local/src/index.ts
  - packages/fs/fs-local/src/fsio.ts
  - packages/fs/fs-observation-policy/src/index.ts
  - packages/core/tools/src/index.ts
  - packages/core/tools/src/schema.ts
  - packages/guard/timeout-policy/src/index.ts
  - packages/session/session-checkpoint-policy/src/index.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/web-app/cordis.patch.yml
  - apps/cli/config/agent-presets/minimal/agent.cordis.yml
  - apps/cli/config/agent-presets/standard/agent.cordis.yml
  - apps/cli/config/agent-presets/code/agent.cordis.yml
  - apps/cli/config/agent-presets/cordis/agent.cordis.yml
symbols:
  - applyReadTool
  - parseReadArgs
  - READ_LIMIT
  - STREAM_MIN_SIZE
  - apply
  - name
  - inject
  - Config
  - resolveRegularReadTarget
  - buildWindow
  - formatReadOutput
  - READ_MAX_BYTES
  - READ_MAX_LINE_LENGTH
  - sessionCwd
  - sessionResolveOptions
related:
  - spine.tool-call-anatomy
  - ref.tools-catalog
  - surface.tools.edit
  - surface.tools.write
  - subsys.execution.fs
evidence: explicit
status: verified
updated: 47f943859b
---

> `read` 是 `@deepseek-ai/dsh-tool-fs` 向模型注册的 UTF-8 文本读工具：wire 名 `read`，经 `ctx.fs` 取一份行号窗口，并在成功或缺文件时发出 `fs/observed`。

## 能回答的问题

- `read` 的 wire `name`、实现包、`inject` 和 `defineTool` 注册点在哪？
- 模型可见字段是 `file_path` / `offset` / `limit` 还是别的？默认 `READ_LIMIT`、`STREAM_MIN_SIZE`、单行/字节帽各是多少？
- 输出信封长什么样？超行、超字节、空文件、越界 `offset` 分别怎样？会不会 spill 到磁盘？
- `read` 消费哪些 `ctx.*` seam？换 `ctx.fs` provider 会带走什么？observation policy 怎样用这次 read 去守 `write`/`edit`？
- 四个 shipped preset 谁装 `@deepseek-ai/dsh-tool-fs`？`minimal` 为什么没有 `read`？
- `execute()` 何时 `readText`、何时 `streamText`？目录、二进制、相对路径、并行调度怎么处理？

## Identity

模型看见的工具名是字面量 `'read'`，由 `applyReadTool` 交给 `ctx.tools.register(defineTool({ name: 'read', … }))`。[E: packages/fs/tool-fs/src/read.ts:77][E: packages/fs/tool-fs/src/read.ts:76]

实现包是 `@deepseek-ai/dsh-tool-fs`。Cordis 插件名 `export const name = 'tool-fs'`，`inject = ['tools', 'fs', 'systemPrompt']`：没有挂上 `ctx.fs` 时插件保持 pending，catalog 里不会出现 `read`。[E: packages/fs/tool-fs/package.json:2][E: packages/fs/tool-fs/src/index.ts:19][E: packages/fs/tool-fs/src/index.ts:22][E: packages/fs/tool-fs/tests/tools.spec.ts:182][E: packages/fs/tool-fs/tests/tools.spec.ts:156]

`apply(ctx, config)` 在 schemastery 填完默认值后，把 `readLimit` / `readMaxLineLength` / `readMaxBytes` / `readStreamMinSize` 传给 `applyReadTool`。同一 `apply` 还会无条件注册 `write`/`edit`，并用 `ctx.inject(['attachments'], …)` 有条件注册 `read_image`——那是另一条 composition-conditional 工具，本页不展开。[E: packages/fs/tool-fs/src/index.ts:61][E: packages/fs/tool-fs/src/index.ts:70]

注册时顺带挂一条 `systemPrompt` section，名 `tool:read`，order `100`，要求模型用 `read` 而不是 `cat` 一类 shell 命令去看文本。[E: packages/fs/tool-fs/src/read.ts:70][E: packages/fs/tool-fs/src/read.ts:71]

`isConcurrencySafe: () => true` 让 registry 把这次调用标成 `parallel`；`write`/`edit` 没有该分类器，默认 `exclusive`。[E: packages/fs/tool-fs/src/read.ts:135][E: packages/fs/tool-fs/tests/tools.spec.ts:161][E: packages/core/tools/src/index.ts:1280]

`defineTool({ name: 'read', … })` **没有** `timeoutMs` 字段。host 上的 `@deepseek-ai/dsh-tool-call-timeout-policy` 读到 `undefined` 就原样 `next()`，不会给 `read` 套截止时间。[E: packages/guard/timeout-policy/src/index.ts:57][E: packages/guard/timeout-policy/src/index.ts:59]

## 用途定位

`read` 只读**普通 UTF-8 文本文件**的一个行窗口，返回带行号的模型可见文本。它不做目录列表（目录会 `FS_NOT_REGULAR_FILE`），不解码图片/PDF（NUL 样本走 provider 的 `FS_NOT_TEXT`；读图是同包的 `read_image`），也不经 `ctx.shell` / `ctx.subprocess`。[E: packages/fs/tool-fs/src/read-target.ts:31][E: packages/fs/fs-local/src/fsio.ts:380][E: packages/fs/tool-fs/tests/integration.spec.ts:128]

一次成功的 `read`（或缺文件时的失败路径）会 `ctx.emit('fs/observed', …)`。默认挂上的 `@deepseek-ai/dsh-fs-observation-policy` 用这条记录给后续 `write`/`edit` 做 read-before-write / CAS 守卫；`read` 自己的 schema **不因此增减字段**。[E: packages/fs/tool-fs/src/read.ts:162][E: packages/fs/tool-fs/src/read-target.ts:27][E: packages/fs/fs-observation-policy/src/index.ts:127]

相对路径按调用 agent 的 `session.header.cwd` 解析，对齐 one-shot `bash` 默认 workdir 的会话工作区，而不是进程启动目录。[E: packages/fs/tool-fs/src/session-cwd.ts:24]

## 输入 schema

以插件**默认 Config** boot 后的模型可见参数为准。`defineTool` 把 `parameters` 编成隐式开放 object：`file_path` 进入 JSON Schema `required`；`offset`/`limit` 可选。schema **不填默认值**，默认发生在 `parseReadArgs`。[E: packages/fs/tool-fs/src/read.ts:80][E: packages/core/tools/src/schema.ts:451][E: packages/fs/tool-fs/src/read.ts:58]

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---:|---|---|---|
| `file_path` | `string` | 是 | 无 | schema 只要 string；`parseReadArgs` 再拒 `trim().length === 0` | 交给 `ctx.fs.resolve` 的路径，相对或绝对都合法。[E: packages/fs/tool-fs/src/read.ts:80][E: packages/fs/tool-fs/src/read.ts:57] |
| `offset` | `number` | 否 | `1` | 省略则 1；给出则必须是有限正整数（schema 是 `number` 不是 `integer`） | 1-based 起始行。[E: packages/fs/tool-fs/src/read.ts:81][E: packages/fs/tool-fs/src/read.ts:58] |
| `limit` | `number` | 否 | `caps.limit`（默认 Config 下等于 `READ_LIMIT` = `2000`） | 正整数，且 `<= maxLimit`；超过 cap 的调用在 execute 里抛错 | 本窗最多返回多少行。schema 描述文本会写成 `Defaults to ${caps.limit}.`。[E: packages/fs/tool-fs/src/read.ts:82][E: packages/fs/tool-fs/src/read.ts:16][E: packages/fs/tool-fs/src/read.ts:59][E: packages/fs/tool-fs/src/read.ts:60] |

`offset: 0`、小数、`NaN`、空白 `file_path`、`limit > cap` 都变成 `isError`。`NaN` 在到达 `parseReadArgs` 之前就被 registry 的 lossless JSON 快照拒掉。[E: packages/fs/tool-fs/tests/tools.spec.ts:240][E: packages/fs/tool-fs/tests/tools.spec.ts:260][E: packages/fs/tool-fs/tests/tools.spec.ts:267][E: packages/fs/tool-fs/tests/tools.spec.ts:274]

**Config 会改行为、部分改 schema 文案，不改字段名。** 四个键都是可选正整数，schemastery 默认如下：

| Config 键 | 默认常量 | 作用 |
|---|---|---|
| `readLimit` | `READ_LIMIT` = `2000` | 既是省略 `limit` 时的默认，也是最大可请求行数；会写进 `limit` 字段 description。[E: packages/fs/tool-fs/src/index.ts:37][E: packages/fs/tool-fs/tests/tools.spec.ts:711] |
| `readMaxLineLength` | `READ_MAX_LINE_LENGTH` = `2000` | 单行字符帽，超出追加 `... (line truncated to N chars)`。[E: packages/fs/tool-fs/src/index.ts:38][E: packages/fs/tool-fs/src/read-render.ts:11] |
| `readMaxBytes` | `READ_MAX_BYTES` = `50 * 1024` | 已选中行的 UTF-8 字节帽。[E: packages/fs/tool-fs/src/index.ts:39][E: packages/fs/tool-fs/src/read-render.ts:14] |
| `readStreamMinSize` | `STREAM_MIN_SIZE` = `10 * 1024 * 1024` | `stat.size >=` 此值，或 `size === undefined`，走 `streamText`。[E: packages/fs/tool-fs/src/index.ts:40][E: packages/fs/tool-fs/src/read.ts:22] |

非正或非整 Config 在 `apply()` 里 `assertPositiveInteger` 直接让插件 load 失败。[E: packages/fs/tool-fs/src/index.ts:57][E: packages/fs/tool-fs/tests/tools.spec.ts:754]

`read` **从不**广告 `sandbox_permissions` / `justification`。那两个 escalation 字段只由 `FsSandboxController` 塞进 `write`/`edit`，且仅当 `ctx.fs.sandboxMode` 表示后端在 confine。[E: packages/fs/tool-fs/src/sandbox.ts:45][E: packages/fs/tool-fs/src/index.ts:76][E: packages/fs/tool-fs/src/write.ts:75]

shipped 四个 preset 的 `tool-fs` 行都没有 `config:`，因此产品默认就是这张表。[E: apps/cli/config/agent-presets/standard/agent.cordis.yml:57]

## 输出 & 截断 / spill

`execute` 返回的**规范值**是封闭 object：`path`（`target.displayPath`）、`offset`、`lines: { number, text }[]`、`totalLines`。registry 用 `output.schema` 校验后再调用 `render`。[E: packages/fs/tool-fs/src/read.ts:153][E: packages/core/tools/src/index.ts:1795][E: packages/core/tools/src/index.ts:1800]

模型看见的是 `formatReadOutput` 的 OpenCode 风格信封，不是裸规范值：

```
<path>{displayPath}</path>
<type>file</type>
<content>
{N}: {text}
…
{footer}
</content>
```

每行写成 `{number}: {text}`（`text` 已去掉行尾 `\n`，CRLF 的 `\r` 也会剥掉）。footer 三选一：[E: packages/fs/tool-fs/src/read-render.ts:165][E: packages/fs/tool-fs/src/read-render.ts:91][E: packages/fs/tool-fs/src/read-render.ts:155]

| 条件 | footer |
|---|---|
| 窗口撞上 `maxBytes`（`truncatedByBytes`） | `(Output capped. Showing lines A-B. Use offset=B+1 to continue.)` |
| 未撞字节帽，但 `endLine < totalLines` | `(Showing lines A-B of T. Use offset=B+1 to continue.)` |
| 已到 EOF（含空文件 `totalLines === 0`） | `(End of file - total T lines)` |

空文件在 `offset === 1` 时规范值是 `lines: []`、`totalLines: 0`，信封里只有 footer，没有 `N: ` 行。[E: packages/fs/tool-fs/tests/tools.spec.ts:232][E: packages/fs/tool-fs/src/read-render.ts:96]

`offset` 越过 EOF（空文件请求 `offset !== 1` 也算）抛 `FsError`，code 复用 `FS_NOT_FOUND`，文案是 `offset N is out of range for "…" (T lines)`。[E: packages/fs/tool-fs/src/read-render.ts:97][E: packages/fs/tool-fs/tests/read-render.spec.ts:66]

`buildWindow` 会扫完整份文件以得到精确 `totalLines`，但当前行缓冲只留 `maxLineLength + 1` 个字符，避免无换行巨行把内存撑爆。[E: packages/fs/tool-fs/src/read-render.ts:118][E: packages/fs/tool-fs/src/read-render.ts:78]

顶层成功调用还会把窗口写进 `output.presentationMeta`（`path` / `offset` / `lines` / `totalLines` / 可选 `lang`），随 `tool/result` 落盘；`presentResult` 再收成 UI 的 `card: 'read'`。规范值本身不进 session 回放。[E: packages/fs/tool-fs/src/read.ts:123][E: packages/core/tools/src/index.ts:1806][E: packages/fs/tool-fs/tests/tools.spec.ts:342]

`read` **没有**自己的 spill 路径：不读 `ctx.spillStore`，也不把正文卸到磁盘。截断全部发生在窗口算术里。`standard`/`code`/`cordis` 的 compaction `tool-result-pruner` 可能在事后把过长的 `tool/result` 内容换成 head/tail，那是 compaction 层，不是本工具的输出合同。

失败结果走 registry `toolErrorResult`：`content` 为 `Error: <message>`，`FsError` 的 `{ name, code }` 进 `error.info`（例如 `FS_NOT_FOUND` / `FS_NOT_REGULAR_FILE` / `FS_NOT_TEXT`）。[E: packages/core/tools/src/index.ts:1874][E: packages/fs/tool-fs/tests/tools.spec.ts:291][E: packages/fs/tool-fs/tests/integration.spec.ts:128]

## 背后的 seam

| 角色 | 落点 |
|---|---|
| Definition | `@deepseek-ai/dsh-fs` 的抽象 `FileSystem`：`resolve` / `stat` / `readText` / `streamText`，以及事件 `fs/observed`、`fs/write-intent`、`fs/edit-intent`。[E: packages/fs/fs/src/index.ts:46][E: packages/fs/fs/src/index.ts:116][E: packages/fs/fs/src/index.ts:176] |
| Provider | 默认本地后端 `@deepseek-ai/dsh-fs-local`（`LocalFileSystem`）。sandbox / 远程后端可以整棵替换 `ctx.fs`，工具 schema 不动。[E: packages/fs/fs-local/src/index.ts:106][E: packages/fs/fs-local/src/index.ts:143] |
| Consumer | `@deepseek-ai/dsh-tool-fs` 的 `read`/`write`/`edit`（及有条件的 `read_image`）；`@deepseek-ai/dsh-fs-observation-policy` 只听 `fs/*` 事件，不进 `inject`。[E: packages/fs/fs-observation-policy/src/index.ts:106] |

`read` 实际调用：

1. `ctx.fs.resolve(path, { cwd?, signal })` — `cwd` 来自 `sessionCwd`（`exec.agent?.session.header.cwd`）；无 agent 则省略，交给 provider 自己的默认（本地后端是其 `config.cwd`）。路径或 cwd 含 `..` 时先 `canonicalPath(cwd)`，避免 symlink cwd 在 parent traversal 下暴露错误身份。[E: packages/fs/tool-fs/src/read-target.ts:24][E: packages/fs/tool-fs/src/session-cwd.ts:41][E: packages/fs/tool-fs/src/session-cwd.ts:26][E: packages/fs/fs-local/src/index.ts:108]
2. `ctx.fs.stat(target, signal)` — 一次 stat 同时做存在性、`type === 'file'`、`size` 路由和 present `version`。[E: packages/fs/tool-fs/src/read-target.ts:25][E: packages/fs/fs/src/types.ts:82]
3. `ctx.fs.streamText` 或 `ctx.fs.readText` — 文本语义（UTF-8、NUL 二进制拒绝、非普通文件拒绝）由 **provider** 拥有，不在 tool-fs 里重做。[E: packages/fs/tool-fs/src/read.ts:144][E: packages/fs/fs-local/src/fsio.ts:379]
4. `ctx.emit('fs/observed', target, observation, exec)` — 缺文件发 `{ kind: 'absent' }`，成功发 `{ kind: 'present', version: info.version }`。无 listener 时是空操作。[E: packages/fs/tool-fs/src/read-target.ts:27][E: packages/fs/tool-fs/src/read.ts:162]

换 provider 会带走：路径规范化 / `displayPath` 形态、symlink 跟随、`size` 是否可得、二进制/非法 UTF-8 的探测、I/O 与取消码（本地是前 8192 字节找 NUL → `FS_NOT_TEXT`）。不会带走：行窗口、信封、`READ_*` cap、observation 事件形状。

observation policy 按 `actor.agent.session` 做 owner，`target.targetKey` 做键。窗口读也记**整文件** version，所以 `limit: 1` 的 read 足以授权后续 `edit`——守卫的是 freshness，不是「模型看过全文」。直接 `ctx.fs.readText` 不发事件，后续 `edit` 仍会 `FS_NOT_OBSERVED`。[E: packages/fs/fs-observation-policy/src/index.ts:40][E: packages/fs/tool-fs/tests/integration.spec.ts:164][E: packages/fs/tool-fs/tests/integration.spec.ts:229]

`read` 不消费 `ctx.shell`、`ctx.subprocess`、`ctx.terminals`、`ctx.approval`、`ctx.sandboxPolicy`。sandbox 只罩文件**副作用**；`read` 没有 per-call sandbox stamp。

## 执行管线

模型发出 `read` 后，loop 经 `ctx.tools.execute` 进入 registry：`tools/pre-execute` → monotonic `guard` → `tools/execute`（around-dispatch）→ 工具 body → `tools/post-execute` → `output.render` / `presentationMeta` → `tools/result`。[E: packages/core/tools/src/index.ts:1342][E: packages/core/tools/src/index.ts:1475][E: packages/core/tools/src/index.ts:1573]

对本工具的挂点：

- **`tools/pre-execute`**：`read` 自己不注册 listener，也不 `ask`。waterfall 默认 `{ kind: 'allow' }`。没有 escalation 字段，不会走到 `ctx.approval`。[E: packages/core/tools/src/index.ts:1477]
- **`isConcurrencySafe`**：恒 `true`，调度器可与其它 parallel 调用重叠。注释合同是 observation 竞态 fail-closed——后续 guarded mutation 会在锁内再对 version 做 CAS。[E: packages/fs/tool-fs/src/read.ts:135][E: packages/core/tools/src/index.ts:1280]
- **`tools/execute` 包装**：
  - `session-checkpoint-policy` 仅在「有 `exec.agent` 且 `exec.parent === undefined`」时 `flush` session，再 `next()`；flush 后若已 abort，返回 `ABORTED_BEFORE_DISPATCH`，body 不跑。[E: packages/session/session-checkpoint-policy/src/index.ts:70][E: packages/session/session-checkpoint-policy/src/index.ts:71]
  - `timeout-policy` 读 `definition.timeoutMs`；`read` 未声明该字段，包装器直接 `next()`。[E: packages/guard/timeout-policy/src/index.ts:57][E: packages/guard/timeout-policy/src/index.ts:59]
- **body**：`defineTool` 先 `validateArgs`，再进 `applyReadTool` 的 `execute`。取消信号经 `exec.signal` 传给 `resolve`/`stat`/`readText`/`streamText`。[E: packages/core/tools/src/schema.ts:586][E: packages/fs/tool-fs/src/read.ts:136]
- **`tools/post-execute`**：`read` 不注册 listener，默认 `accept`。规范值由 registry `createSuccessResult` 冻结后 `render`。[E: packages/core/tools/src/index.ts:1745][E: packages/core/tools/src/index.ts:1800]
- **sandbox / approval**：不挂。confine 后端只影响同包的 `write`/`edit` 广告字段。

Code Mode 下模型不能直呼 `read`：非嵌套且 `mode === 'code'` 时，除 `run_code` 外的名字在 `createExecution` 里 collapse；`if (collapsed)` 直接返回 `final-result`，不进 `tools/pre-execute`。SDK 子分发带 `parent`（`nested === true`），不 collapse，仍走完整管线，但 checkpoint 在 `exec.parent !== undefined` 时直接 `next()`、不再 flush。[E: packages/core/tools/src/index.ts:1325][E: packages/core/tools/src/index.ts:1423][E: packages/session/session-checkpoint-policy/src/index.ts:71]

## Preset 装配

成员资格只认 `apps/cli/config/agent-presets/{minimal,standard,code,cordis}/agent.cordis.yml`，不以 package 存在为准。

| preset | 装 `@deepseek-ai/dsh-tool-fs`？ | `disabled` | isolate | 说明 |
|---|---|---|---|---|
| `minimal` | **否** | — | `isolate.fs: true` 只罩 `dsh-fs-local` + `dsh-tool-str-replace-editor` | yml 没有 `tool-fs` 行。文本读写走 Anthropic 方言 `str_replace_editor`（含 `view`），不是 wire `read`。[E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:51][E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:55][E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:60] |
| `standard` | **是** | 无 | 无（注释写明注册进 host `tools` registry，不需要 realm） | `- id: tool-fs` / `name: '@deepseek-ai/dsh-tool-fs'`，无 `config`。[E: apps/cli/config/agent-presets/standard/agent.cordis.yml:56][E: apps/cli/config/agent-presets/standard/agent.cordis.yml:57] |
| `code` | **是** | 无 | 无 | 与 standard 同一行；Code Mode 只换呈现（`run_code`），工具行仍在。[E: apps/cli/config/agent-presets/code/agent.cordis.yml:63][E: apps/cli/config/agent-presets/code/agent.cordis.yml:64] |
| `cordis` | **是** | 无 | 无 | 同样 remount `tool-fs`。[E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:57][E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:58] |

shipped web/cli 组合里，host `dsh-base` 也曾列出 `tool-fs`，但 `web-app` patch 把它（以及 `tool-fs-search`）设成 `disabled: true`，让 catalog 跟 preset remount 走。因此 `minimal` 会话在产品面上没有 `read`。[E: packages/bundle/base/cordis.patch.yml:224][E: packages/bundle/web-app/cordis.patch.yml:312][E: packages/bundle/web-app/cordis.patch.yml:313]

`fs-observation-policy` 在 host `dsh-base` 上，不在四个 preset 文件里。standard/code/cordis 的 `read` 默认会留下 observation；卸掉该插件则 `read` 仍工作，只是不再守 mutation。[E: packages/bundle/base/cordis.patch.yml:221][E: packages/fs/tool-fs/tests/integration.spec.ts:323]

## execute() 走读

符号：`applyReadTool` @ `packages/fs/tool-fs/src/read.ts`，`resolveRegularReadTarget` @ `read-target.ts`，`buildWindow` / `formatReadOutput` @ `read-render.ts`。

1. **校验参数。** `parseReadArgs(args, caps.limit)`：空白 `file_path` 抛 `file_path must be a non-empty string`；省略的 `offset`/`limit` 变成 `1` / `maxLimit`；非正整数或 `limit > maxLimit` 抛错。这些 Error 不是 `FsError`，registry 收成普通 `isError` 文本。[E: packages/fs/tool-fs/src/read.ts:137][E: packages/fs/tool-fs/src/read.ts:57][E: packages/fs/tool-fs/src/read.ts:60]

2. **一次 resolve + 一次 stat。** `resolveRegularReadTarget(ctx, exec, input.filePath)` 用 `sessionResolveOptions` 解析，再 `stat`。`info === undefined`：先 `emit('fs/observed', target, { kind: 'absent' }, exec)`，再抛 `FS_NOT_FOUND`。`info.type !== 'file'`：抛 `FS_NOT_REGULAR_FILE`，**不**发 observation。[E: packages/fs/tool-fs/src/read.ts:140][E: packages/fs/tool-fs/src/read-target.ts:26][E: packages/fs/tool-fs/src/read-target.ts:27][E: packages/fs/tool-fs/src/read-target.ts:31][E: packages/fs/tool-fs/tests/tools.spec.ts:300]

3. **按 size 选读法。** `info.size === undefined || info.size >= caps.streamMinSize` → `ctx.fs.streamText(target, exec.signal)`；否则把 `readText` 的整串包成单元素数组。size-less 后端绝不会被诱导去缓冲任意大文件。[E: packages/fs/tool-fs/src/read.ts:144][E: packages/fs/tool-fs/tests/tools.spec.ts:308][E: packages/fs/tool-fs/tests/tools.spec.ts:320]

4. **provider 文本合同。** 本地后端 `readWholeText` / `streamWholeText` 在前 `BINARY_SAMPLE_BYTES`（8192）字节里发现 NUL 就抛 `FS_NOT_TEXT`（`cannot read "…": binary file`）；非法 UTF-8 同样拒绝。PNG 走 `read` 会失败，必须换 `read_image`。[E: packages/fs/fs-local/src/fsio.ts:17][E: packages/fs/fs-local/src/fsio.ts:380][E: packages/fs/tool-fs/tests/integration.spec.ts:126]

5. **切窗口。** `buildWindow(chunks, { offset, limit, maxLineLength, maxBytes }, target.displayPath)` 按 `\n` 分行、剥 `\r`、截长行、用 UTF-8 字节累计（行间多计 1 字节）碰到 `maxBytes` 就设 `truncatedByBytes` 并停止纳入新行，但仍扫到 EOF 以填 `totalLines`。[E: packages/fs/tool-fs/src/read.ts:147][E: packages/fs/tool-fs/src/read-render.ts:83][E: packages/fs/tool-fs/src/read-render.ts:73]

6. **越界 offset。** `finish` 在未字节截断且 `offset > totalLines`（空文件 + `offset === 1` 除外）时抛 `FS_NOT_FOUND`。[E: packages/fs/tool-fs/src/read-render.ts:96]

7. **记 present observation，返回规范值。** `emit('fs/observed', target, { kind: 'present', version: info.version }, exec)` 必须同步；listener 抛错会让这次已经读成功的调用变成 `isError`（mutation 路径另有「已落盘」测试，read 没有副作用可残留）。返回 `{ path, offset, lines, totalLines }`。[E: packages/fs/tool-fs/src/read.ts:162][E: packages/fs/tool-fs/src/read.ts:153][E: packages/fs/fs-observation-policy/src/index.ts:127]

8. **registry 投影。** `render` 再跑一遍 `parseReadArgs`，用 `lines.length < input.limit && endLine < totalLines` 推断 `truncatedByBytes`，调用 `formatReadOutput`。`presentationMeta` 用 `langFromPath` 给 UI 语法高亮提示（`.ts` → `ts`；无扩展名则省略 `lang`）。[E: packages/fs/tool-fs/src/read.ts:107][E: packages/fs/tool-fs/src/read.ts:109][E: packages/fs/tool-fs/src/read.ts:124][E: packages/fs/tool-fs/src/read-render.ts:209]

9. **展示。** `presentCall` 是纯函数：`Read a.ts (12 - 51)` / `Read a.txt (from line 5)` / 省略窗口时裸 `Read a.txt`，`kind: 'read'`，`locations[0].line` 为 `offset ?? 1`。`presentResult` 从 persisted `meta` + 信封正则抽出 body；缺 meta、多段 content、或信封不匹配则返回 `undefined`，回退通用卡片。[E: packages/fs/tool-fs/src/read.ts:203][E: packages/fs/tool-fs/src/read.ts:180][E: packages/fs/tool-fs/tests/tools.spec.ts:487]

## 设计动机·edge

DSH **没有** first-class `apply_patch`。`read` 也不走 Claude `Edit` / Pi edit 那种「读+补丁」合一方言：它只取文本窗。产品面上的字面替换是同包 `edit`（`old_string`/`new_string`），整文件写是 `write`；`minimal` 则换成 `str_replace_editor` 的 `view`/`create`/`str_replace`。

和常见 peer `Read` 的关键差异：

- **不做目录页。** `type !== 'file'` 直接 `FS_NOT_REGULAR_FILE`，没有 entries 列表。[E: packages/fs/tool-fs/src/read-target.ts:31]
- **不做媒体。** 二进制/非 UTF-8 是 provider 错误，不是 attachment 成功路径。[E: packages/fs/fs-local/src/fsio.ts:380]
- **信封有行号和续读 footer**，明确提示下一 `offset`，而不是丢给模型自己数。
- **observation 是事件，不是 schema。** 卸掉 policy 插件，`read` 行为不变，`write`/`edit` 退回无条件 mutation。[E: packages/fs/tool-fs/tests/integration.spec.ts:323]
- **窗口读仍授权整文件 mutation**（freshness ≠ full-view）。[E: packages/fs/tool-fs/tests/integration.spec.ts:160]
- **越界 `offset` 复用 `FS_NOT_FOUND`**，不要按「文件不存在」误路由。
- **并行安全是显式 opt-in。** 两个 `read` 可重叠；写仍 exclusive。
- **相对路径跟 session cwd，不跟 process.cwd()**；无 agent 的直接 `ctx.tools.execute` 则把 cwd 留给 provider。[E: packages/fs/tool-fs/src/session-cwd.ts:24][E: packages/fs/tool-fs/tests/tools.spec.ts:135]

## Sources

- packages/fs/tool-fs/src/index.ts
- packages/fs/tool-fs/src/read.ts
- packages/fs/tool-fs/src/read-render.ts
- packages/fs/tool-fs/src/read-target.ts
- packages/fs/tool-fs/src/session-cwd.ts
- packages/fs/tool-fs/src/sandbox.ts
- packages/fs/tool-fs/src/write.ts
- packages/fs/tool-fs/package.json
- packages/fs/tool-fs/tests/tools.spec.ts
- packages/fs/tool-fs/tests/integration.spec.ts
- packages/fs/tool-fs/tests/read-render.spec.ts
- packages/fs/fs/src/index.ts
- packages/fs/fs/src/types.ts
- packages/fs/fs-local/src/index.ts
- packages/fs/fs-local/src/fsio.ts
- packages/fs/fs-observation-policy/src/index.ts
- packages/core/tools/src/index.ts
- packages/core/tools/src/schema.ts
- packages/guard/timeout-policy/src/index.ts
- packages/session/session-checkpoint-policy/src/index.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/web-app/cordis.patch.yml
- apps/cli/config/agent-presets/minimal/agent.cordis.yml
- apps/cli/config/agent-presets/standard/agent.cordis.yml
- apps/cli/config/agent-presets/code/agent.cordis.yml
- apps/cli/config/agent-presets/cordis/agent.cordis.yml

## 相关

- [工具调用解剖](../../spine/tool-call-anatomy.md) — `tools/pre-execute` → execute → `tools/post-execute` 脊柱
- [工具 catalog](../../reference/tools-catalog.md) — 全量 model-visible 工具表
- [edit 字符串替换](edit.md) — 同包字面替换；默认要求本页留下的 observation
- [write 整文件写](write.md) — 同包 create-or-overwrite；默认同样受 observation 守卫
- [fs 子系统](../../subsystems/execution/fs.md) — `ctx.fs` Service Definition、provider 与 observation 事件
