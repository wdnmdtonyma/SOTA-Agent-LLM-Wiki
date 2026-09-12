---
id: surface.tools.present
title: present 交付物声明
kind: tool
tier: T1
pkg: execution
source:
  - packages/fs/tool-present/src/index.ts
  - packages/fs/tool-present/src/types.ts
  - packages/fs/tool-present/package.json
  - packages/fs/tool-present/tests/present.spec.ts
  - packages/fs/tool-present/tests/built-errors.e2e.ts
  - packages/core/session/src/known-event-types.ts
  - packages/core/session/src/surface.ts
  - packages/core/tools/src/index.ts
  - packages/core/tools/src/schema.ts
  - packages/core/agent-loop/src/index.ts
  - packages/guard/timeout-policy/src/index.ts
  - packages/session/session-checkpoint-policy/src/index.ts
  - packages/preset/agent-presets/presets/minimal/agent.cordis.yml
  - packages/preset/agent-presets/presets/standard/agent.cordis.yml
  - packages/preset/agent-presets/presets/ptc/agent.cordis.yml
  - packages/preset/agent-presets/presets/cordis/agent.cordis.yml
  - apps/cli/tests/web-agent-presets.e2e.ts
symbols:
  - present
  - apply
  - Config
  - name
  - inject
  - PresentedFile
related:
  - spine.tool-call-anatomy
  - ref.tools-catalog
  - surface.presets.standard
  - surface.presets.code
  - surface.web.workbench
evidence: explicit
status: verified
updated: c291e7961a
---

> 模型可见名 `present`；实现包 `@deepseek-ai/dsh-tool-present`（Cordis 插件名 `tool-present`）。一次调用声明 **已经存在** 的工作区常规文件为交付物；成功的最终结果之后才 append `deliverables/presented`。不读、不拷内容。

## 能回答的问题

- 模型目录里的 `present` 是哪个包、哪个 Cordis 插件名、`inject` 要什么？
- 输入只有 `files[]` 吗？`path` / `description` 谁必填？`maxFiles` 改 schema 还是 execute 门？
- 没有 owning agent、没有 open turn、没有 `header.cwd` 时 execute 会怎样？拒绝的调用会不会写出 `deliverables/presented`？
- 声明走哪条 seam？`ctx.fs` 读不读字节？符号链接 / 目录 / 会话目录外的绝对路径呢？
- `minimal` / `standard` / `ptc` / `cordis` 谁装本包？`ptc` 下模型能不能直调 `present`？
- 交付事件何时 append？`tools/post-execute` block 之后还会不会落盘？

## Identity

| 面 | 值 |
|---|---|
| wire `name` | `present` [E: packages/fs/tool-present/src/index.ts:39] |
| 实现包 | `@deepseek-ai/dsh-tool-present` [E: packages/fs/tool-present/package.json:2] |
| Cordis 插件名 | `tool-present` [E: packages/fs/tool-present/src/index.ts:12] |
| `inject` | `['tools', 'fs', 'sessionProjections']` [E: packages/fs/tool-present/src/index.ts:26] |
| 工厂 | `apply(ctx, config: Config)` [E: packages/fs/tool-present/src/index.ts:33] |
| 注册 | `ctx.tools.register(defineTool({ name: 'present', ... }))` [E: packages/fs/tool-present/src/index.ts:38] |

本页只有这一条 model-visible 名。没有 `present_read` / 增量 patch。

`Config` 只有 `maxFiles: number`，schemastery 默认 `8`。[E: packages/fs/tool-present/src/index.ts:22] `apply` 在注册前要求 `Number.isSafeInteger(config.maxFiles) && config.maxFiles >= 1`，否则 throw `present requires a positive integer maxFiles`。[E: packages/fs/tool-present/src/index.ts:34] [E: packages/fs/tool-present/src/index.ts:35] `0` / `1.5` / `Infinity` 在 load 时失败，进不了 running tool。[E: packages/fs/tool-present/tests/present.spec.ts:152] [E: packages/fs/tool-present/tests/present.spec.ts:153]

四个 shipped yml 里装了本包的三份都 **省略** `config:`，boot 吃默认 `maxFiles: 8`。[E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:254] 单元测试把 Config 设成 `2`，第三次文件走 execute 门而不是 schema。[E: packages/fs/tool-present/tests/present.spec.ts:65] [E: packages/fs/tool-present/tests/present.spec.ts:140]

## 用途定位

本工具让模型把 **已经写好** 的文件标成用户可打开的交付物。描述要求：文件必须已存在；用户打开的是当前源路径，内容不被拷贝或冻结；只在回复里提路径 **不能** 替代这次调用。[E: packages/fs/tool-present/src/index.ts:40] [E: packages/fs/tool-present/src/index.ts:42] [E: packages/fs/tool-present/src/index.ts:43]

权威副作用是 calling agent 的 `Session` 事件 `deliverables/presented`，不是独立 `ctx.deliverables` 服务，也不是 attachment 副本。测试对二进制 `.docx` spy `ctx.fs.readBytes`，成功路径 **不** 调用；`ctx.get('attachments')` 为 `undefined`。[E: packages/fs/tool-present/tests/present.spec.ts:89] [E: packages/fs/tool-present/tests/present.spec.ts:90]

没有 owning agent、没有 open turn、没有 `session.header.cwd` 就无处声明，插件 throw 而不是静默 no-op。[E: packages/fs/tool-present/src/index.ts:76] [E: packages/fs/tool-present/src/index.ts:78] [E: packages/fs/tool-present/src/index.ts:81]

浏览器里 Open In / 右侧栏如何画出这些文件，权威在 [`surface.web.workbench`](../web/workbench.md) 的 `ui-deliverables` 行；本页不展开。

## 输入 schema

以插件默认 Config（`maxFiles: 8`）boot 后的 `ctx.tools.schemas()` 为准。properties **只有** `files`。`maxFiles` **不** 出现在广告字段里。

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---|---|---|---|
| `files` | `array` | 是 | 无 | 元素是 object；schema **没有** `minItems` / `maxItems` | 一次声明的文件列表。[E: packages/fs/tool-present/src/index.ts:45] |
| `files[].path` | `string` | 是 | 无 | schema 只要求 string；execute 再 `trim`，空串 / 纯空白拒绝 | 已存在的常规文件。相对路径相对 Session `cwd`。[E: packages/fs/tool-present/src/index.ts:50] [E: packages/fs/tool-present/src/index.ts:85] |
| `files[].description` | `string` | 否 | 无 | 可选 | 给用户看的短说明。[E: packages/fs/tool-present/src/index.ts:51] |

条目 object 设 `additionalProperties: false`。[E: packages/fs/tool-present/src/index.ts:48] `path: 42` 在 schema 边界变成 `INVALID_ARGS`，进不了用户 body。[E: packages/fs/tool-present/tests/built-errors.e2e.ts:39]

**Config 不改广告字段。** `maxFiles` 只改 execute：`files.length === 0 || files.length > config.maxFiles` → `present accepts 1 to ${maxFiles} files`。[E: packages/fs/tool-present/src/index.ts:79] 空数组能过 schema（无 `minItems`），在 body 里失败。

`defineTool` 先把 ParameterSchemaSpec 编成 JSON Schema，包装 `execute` 里 `validateJsonSchemaValue`；通过后才进用户 body。[E: packages/core/tools/src/schema.ts:566] [E: packages/core/tools/src/schema.ts:586]

## 输出 & 截断 / spill

`output.schema` 是 `additionalProperties: false` 的 object，两块都 required：

| 字段 | 含义 |
|---|---|
| `turn` | 声明时所在 turn，来自 `turnBoundary.lastTurn`。[E: packages/fs/tool-present/src/index.ts:60] [E: packages/fs/tool-present/src/index.ts:96] |
| `files` | 与输入同形的 `PresentedFile[]`：`path` 原样留下（不 trim），可选 `description`。[E: packages/fs/tool-present/src/index.ts:61] [E: packages/fs/tool-present/src/index.ts:92] |

`output.render` 把模型可见文本收成每行一句：`Presented ${file.path}`。[E: packages/fs/tool-present/src/index.ts:73]

没有字节预算、没有 spill、没有截断标记。没有 `presentCall` / `presentResult`。

## 背后的 seam

本工具 **不** 声明 `ctx.deliverables`。权威状态是 calling agent 的 `Session` 事件日志；路径存在性走 `ctx.fs`。

| 角色 | 实体 | 本工具怎么用 |
|---|---|---|
| Definition（工具注册表） | `ctx.tools` / `ToolRuntime` | `inject` 含 `tools`；`register(defineTool(...))`。[E: packages/fs/tool-present/src/index.ts:26] |
| Definition（文件系统） | `ctx.fs` | `lstat` → `resolve` → `stat`。不 `readBytes`。[E: packages/fs/tool-present/src/index.ts:86] [E: packages/fs/tool-present/src/index.ts:88] [E: packages/fs/tool-present/src/index.ts:89] |
| Consumer | `@deepseek-ai/dsh-tool-present` | 校验通过后把 `{ session, turn, files }` 放进 `WeakMap`；`tools/result` 且 `!result.isError` 时 `session.append('deliverables/presented', { turn, callId, files })`。[E: packages/fs/tool-present/src/index.ts:95] [E: packages/fs/tool-present/src/index.ts:104] |
| Provider（日志） | `Session.append` | 载荷类型在本包 `src/types.ts` 合并进 `SessionEventMap`。[E: packages/fs/tool-present/src/types.ts:15] |
| Provider（投影） | `ctx.sessionProjections` | **不** 登记自己的 unit。只 `stateOf(session, 'turnBoundary')` 读 open turn。[E: packages/fs/tool-present/src/index.ts:77] `turnBoundary` 由 `@deepseek-ai/dsh-agent-loop` 登记。[E: packages/core/agent-loop/src/index.ts:56] [E: packages/core/agent-loop/src/index.ts:416] |

换掉 `ctx.fs` 会带走：相对路径怎么解析、符号链接 / 非常规文件怎么分类、缺文件是不是 `FsError('FS_NOT_FOUND')`。换掉 session / projection 会带走：事件能否 append、`deliverables/presented` 是否仍是 known type、有没有 `turnBoundary` 可读。

`PresentedFile` 只有 `path` + 可选 `description`。[E: packages/fs/tool-present/src/types.ts:5] [E: packages/fs/tool-present/src/types.ts:9] `KNOWN_SESSION_EVENT_TYPES` 含 `'deliverables/presented'`。[E: packages/core/session/src/known-event-types.ts:36]

`deliverables/presented` **不是** surface 事件：`SURFACE_EVENT_TYPES` 只有 `system/message` / `user/message` / `assistant/message` / `tool/result`；`deriveEventMessage` 对其它 type 走 `default` 返回 `null`。[E: packages/core/session/src/surface.ts:22] [E: packages/core/session/src/surface.ts:124] 模型下一轮看见的是 `tool/result` 那几行 `Presented …`，不是交付事件回放。

## 执行管线

`ctx.tools.execute` 走 `tools/pre-execute` →（可选 `serviceAsk`）→ 单调 guard → `tools/execute` waterfall（叶子 `ToolDefinition.execute`）→ `tools/post-execute` → `tools/result`。[E: packages/core/tools/src/index.ts:1466] [E: packages/core/tools/src/index.ts:1564] [E: packages/core/tools/src/index.ts:1601] [E: packages/core/tools/src/index.ts:1656] 本插件 **不** 自己挂 pre-execute / post-execute；它挂 `tools/result`。[E: packages/fs/tool-present/src/index.ts:99]

对本工具的挂点：

- **approval：** `defineTool` 没有声明会触发 `ask` 的策略。普通调用不经过 `ctx.approval.request`。[I]
- **sandbox：** 不读 `ctx.sandbox` / `ctx.sandboxPolicy`。路径检查只碰 `ctx.fs`。[I]
- **timeout：** `defineTool` **没有** 设 `timeoutMs`。`dsh-tool-call-timeout-policy` 读到 `undefined` 就原样 `next()`。[E: packages/guard/timeout-policy/src/index.ts:57] [E: packages/guard/timeout-policy/src/index.ts:59]
- **checkpoint：** host `dsh-session-checkpoint-policy` 在 top-level（有 `exec.agent` 且无 `parent`）`tools/execute` 里先 `flush` 再 `next()`。本工具的 durable append 发生在 flush **之后** 的 `tools/result` 观察者里。[E: packages/session/session-checkpoint-policy/src/index.ts:70] [E: packages/session/session-checkpoint-policy/src/index.ts:72]
- **并行：** 未声明 `isConcurrencySafe`，`executionMode` fail-closed 为 exclusive。[E: packages/core/tools/src/index.ts:1268]
- **PTC：** `ptc` preset 仍装本包，但 `mode: ptc` 时无 `parent` 的模型直调 `present` 在进 waterfall 前 `collapses`（名字不是 `run_code`），必须从 `run_code` 程序里子调度。[E: packages/preset/agent-presets/presets/ptc/agent.cordis.yml:274] [E: packages/core/tools/src/index.ts:1315] execute **不** 读 `exec.parent`：嵌套调用只要有 agent + open turn + cwd 就能声明。

## Preset 装配

成员资格只认 `packages/preset/agent-presets/presets/{minimal,standard,ptc,cordis}/agent.cordis.yml`。装了的三份都是顶层 consumer 行，**没有** `disabled`，**没有** `isolate:`，**没有** 覆盖 `maxFiles`。

| preset | 装 `@deepseek-ai/dsh-tool-present`？ | `disabled` | isolate | 关键 Config |
|---|---|---|---|---|
| `minimal` | **否**。e2e catalog 只有 persistent `bash` [E: apps/cli/tests/web-agent-presets.e2e.ts:323] | — | 本包未出现。文件里的 model-facing 行是 `dsh-tool-bash-persistent` / `dsh-tool-pwsh-persistent` [E: packages/preset/agent-presets/presets/minimal/agent.cordis.yml:37] [E: packages/preset/agent-presets/presets/minimal/agent.cordis.yml:58] | — |
| `standard` | 是 | 无 [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:254] | 无 | 省略 → `maxFiles: 8` [E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:255] |
| `ptc` | 是 | 无 [E: packages/preset/agent-presets/presets/ptc/agent.cordis.yml:274] | 无。旁边的 `tool-presentation` 是另一行，`mode: ptc` [E: packages/preset/agent-presets/presets/ptc/agent.cordis.yml:269] | 同 standard [E: packages/preset/agent-presets/presets/ptc/agent.cordis.yml:275] |
| `cordis` | 是 | 无 [E: packages/preset/agent-presets/presets/cordis/agent.cordis.yml:265] | 无 | 同 standard [E: packages/preset/agent-presets/presets/cordis/agent.cordis.yml:266] |

`standard` 的 e2e 精确 catalog（去掉依赖本机 ripgrep 的 `glob`/`grep`）含 `present`。[E: apps/cli/tests/web-agent-presets.e2e.ts:245]

`dsh-base` 的 `cordis.patch.yml` **没有** insert `id: present`。成员资格以 preset yml 为准，不以 `package.json` 把 `@deepseek-ai/dsh-tool-present` 列进 workspace 依赖为准。[I]

## execute() 走读

1. `defineTool` 包装的 `execute` 先 `validateJsonSchemaValue`：缺 `files`、条目未知键、`path` 非 string 在这里变成 `ToolArgsError`，用户 body 未跑。[E: packages/core/tools/src/schema.ts:587] [E: packages/fs/tool-present/tests/built-errors.e2e.ts:39]
2. `if (exec.agent === undefined)` throw `present requires an agent Session`。裸 `ctx.tools.execute`（测试 callId `detached`）是 `isError`，不写事件。[E: packages/fs/tool-present/src/index.ts:76] [E: packages/fs/tool-present/tests/present.spec.ts:159]
3. `ctx.sessionProjections.stateOf(exec.agent.session, 'turnBoundary')`。`boundary === undefined` 或 `openTurnStartSeq === null` → `present requires an open turn`。`turn/end` 之后再调同样失败。[E: packages/fs/tool-present/src/index.ts:78] [E: packages/fs/tool-present/tests/present.spec.ts:162]
4. `files.length === 0` 或 `> maxFiles` → throw。[E: packages/fs/tool-present/src/index.ts:79]
5. `exec.agent.session.header.cwd === undefined` → `present requires a workspace`。[E: packages/fs/tool-present/src/index.ts:81] [E: packages/fs/tool-present/tests/present.spec.ts:166]
6. 对每个条目：`path.trim()` 长度为 0 → `present requires a non-empty file path`。[E: packages/fs/tool-present/src/index.ts:85] `lstat` 得到非 `file`（目录、指向目录的 symlink、指向普通文件的 symlink）→ `Cannot present …: not a regular file`。[E: packages/fs/tool-present/src/index.ts:87] [E: packages/fs/tool-present/tests/present.spec.ts:185] `resolve` 后再 `stat`：缺文件 → `FsError` / `FS_NOT_FOUND`；resolve 后变成目录 → 再抛 not a regular file。[E: packages/fs/tool-present/src/index.ts:90] [E: packages/fs/tool-present/src/index.ts:91] [E: packages/fs/tool-present/tests/built-errors.e2e.ts:39]
7. 通过的条目 `files.push({ ...file })`，**不** trim `path`，**不** 读内容。[E: packages/fs/tool-present/src/index.ts:92]
8. `pending.set(exec, { session, turn: boundary.lastTurn, files })`，返回 `{ turn, files }`。[E: packages/fs/tool-present/src/index.ts:95] [E: packages/fs/tool-present/src/index.ts:96] 此时 **还没有** append。
9. `tools/post-execute` 若 `block`，最终 `isError === true`，`tools/result` 观察者看到 error 后 `return`，不写 `deliverables/presented`。[E: packages/fs/tool-present/src/index.ts:102] [E: packages/fs/tool-present/tests/present.spec.ts:132] [E: packages/fs/tool-present/tests/present.spec.ts:133]
10. 最终结果成功：`session.append('deliverables/presented', { turn, callId: exec.callId, files })`。[E: packages/fs/tool-present/src/index.ts:104] [E: packages/fs/tool-present/tests/present.spec.ts:87]
11. 祖先 scope 与 agent scope 各 mount 一次时，成功调用只写 **一条** 交付事件。[E: packages/fs/tool-present/tests/present.spec.ts:121] agent scope 换成另一个同名 `present` 定义时，本插件的 `WeakMap` 没有这笔 exec，不写交付事件。[E: packages/fs/tool-present/tests/present.spec.ts:112]
12. 卸载插件 fiber 会 `unregister`：`ctx.tools.get('present', owner)` 为 `undefined`。[E: packages/fs/tool-present/tests/present.spec.ts:92]

## 设计动机·edge

- **声明，不是快照。** 描述写明用户打开的是当前源文件；测试用二进制内容证明不 `readBytes`、不走 attachments。[E: packages/fs/tool-present/src/index.ts:43] [E: packages/fs/tool-present/tests/present.spec.ts:89]
- **commit 点在最终 result，不在 body。** execute 只填 `WeakMap`；`tools/result` 且成功才 append。这样 post-execute 还能否决一次已经校验过的声明。[E: packages/fs/tool-present/src/index.ts:99] [E: packages/fs/tool-present/src/index.ts:102]
- **需要 agent + open turn + workspace。** `turnBoundary.openTurnStartSeq === null`（含 `turn/end` 之后）与缺 `header.cwd` 都拒绝。[E: packages/fs/tool-present/tests/present.spec.ts:162] [E: packages/fs/tool-present/tests/present.spec.ts:166] 缺文件 / 空 path / 超 `maxFiles` 的拒绝同样不写事件。[E: packages/fs/tool-present/tests/present.spec.ts:144]
- **常规文件，跟随 symlink。** `lstat` 先拒绝 symlink / 目录；`stat` 再确认 resolve 后仍是 file。指向普通文件的最终 symlink 也被拒。[E: packages/fs/tool-present/tests/present.spec.ts:185]
- **会话目录不是牢笼。** 会话 cwd 外的绝对路径、以及相对跳出 cwd 的路径，只要 resolve 到常规文件就可以声明。[E: packages/fs/tool-present/tests/present.spec.ts:176] [E: packages/fs/tool-present/tests/present.spec.ts:178]
- **空表不合法。** 与 `todo_write` 不同：`files: []` 在 execute 失败。上限是部署 `maxFiles`，不是 schema `maxItems`。
- **log-only UI 状态。** `deliverables/presented` 不进 `deriveMessages()`。模型看见的是 `tool/result` 文本；UI 从事件读交付列表。
- **与 Codex / Claude「把文件交给用户」方言。** 这里没有拷贝进会话附件、没有把字节写进 tool result。一次参数就是一组活路径。

## Sources

- packages/fs/tool-present/src/index.ts
- packages/fs/tool-present/src/types.ts
- packages/fs/tool-present/package.json
- packages/fs/tool-present/tests/present.spec.ts
- packages/fs/tool-present/tests/built-errors.e2e.ts
- packages/core/session/src/known-event-types.ts
- packages/core/session/src/surface.ts
- packages/core/tools/src/index.ts
- packages/core/tools/src/schema.ts
- packages/core/agent-loop/src/index.ts
- packages/guard/timeout-policy/src/index.ts
- packages/session/session-checkpoint-policy/src/index.ts
- packages/preset/agent-presets/presets/minimal/agent.cordis.yml
- packages/preset/agent-presets/presets/standard/agent.cordis.yml
- packages/preset/agent-presets/presets/ptc/agent.cordis.yml
- packages/preset/agent-presets/presets/cordis/agent.cordis.yml
- apps/cli/tests/web-agent-presets.e2e.ts

## 相关

- [工具调用解剖](../../spine/tool-call-anatomy.md)（`spine.tool-call-anatomy`）：`tools/pre-execute → execute → post-execute → result`、timeout wrapper、PTC collapse。
- [模型可见工具目录](../../reference/tools-catalog.md)（`ref.tools-catalog`）：boot 后 `ctx.tools.schemas()` 名录。
- [standard preset](../presets/standard.md)（`surface.presets.standard`）：Web 默认 preset；本工具的出厂挂载行。
- [PTC preset (`ptc`)](../presets/code.md)（`surface.presets.code`）：同样挂本包；模型直调被 collapse 成必须走 `run_code`。
- [Web 工作台可见面](../web/workbench.md)（`surface.web.workbench`）：`ui-deliverables` 如何画交付物；本页只覆盖模型工具与 session 事件。
