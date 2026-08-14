---
id: surface.tools.str-replace-editor
title: str_replace_editor
kind: tool
tier: T1
pkg: execution
source:
  - packages/fs/tool-str-replace-editor/src/index.ts
  - packages/fs/tool-str-replace-editor/src/invariant.ts
  - packages/fs/tool-str-replace-editor/tests/tools.spec.ts
  - packages/fs/tool-str-replace-editor/package.json
  - packages/fs/fs/src/index.ts
  - packages/fs/fs-observation-policy/src/index.ts
  - packages/core/tools/src/index.ts
  - packages/core/tools/src/schema.ts
  - packages/core/agent-loop/src/agent.ts
  - packages/core/agent-loop/src/tool-calls.ts
  - packages/guard/timeout-policy/src/index.ts
  - packages/sandbox/sandbox/src/escalation.ts
  - packages/session/session-checkpoint-policy/src/index.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/web-app/cordis.patch.yml
  - apps/cli/config/agent-presets/minimal/agent.cordis.yml
  - apps/cli/config/agent-presets/minimal/preset.yml
  - apps/cli/config/agent-presets/standard/agent.cordis.yml
  - apps/cli/config/agent-presets/code/agent.cordis.yml
  - apps/cli/config/agent-presets/cordis/agent.cordis.yml
  - apps/cli/tests/web-agent-presets.e2e.ts
  - vendor/cordis/src/events.ts
symbols: [apply, Config, name, inject]
related: [spine.tool-call-anatomy, ref.tools-catalog]
evidence: explicit
status: verified
updated: 47f943859b
---

> `str_replace_editor` 是 `@deepseek-ai/dsh-tool-str-replace-editor` 面向模型的 **一条** 编辑器工具：用 `command` 分发 `view` / `create` / `str_replace` / `insert`，全部经 `ctx.fs` 读写，不经 `ctx.shell` / `ctx.terminals`。

## 能回答的问题

- 模型看见的 wire `name`、Cordis 插件 `name`、实现包分别是什么？
- `view` / `create` / `str_replace` / `insert` 各自要哪些字段？schema 必填和 execute 期必填差在哪？
- 为什么 `path` 必须是绝对路径？相对路径会怎样？
- 四个 shipped preset 里谁装了这个包？`minimal` 的 `isolate.fs` / `maxOutputChars` 是什么？
- 输出如何截断？有没有 spill？有没有 `timeoutMs` / `sandbox_permissions` / `replace_all`？
- 和 `dsh-tool-fs` 的 `edit` / `write`、Codex `apply_patch`、Claude `Edit` 方言差在哪？

## Identity

实现包 `@deepseek-ai/dsh-tool-str-replace-editor`。[E: packages/fs/tool-str-replace-editor/package.json:2] Cordis 插件导出 `name = 'tool-str-replace-editor'`，`inject = ['tools', 'fs']`，入口是 `apply(ctx, config)`。[E: packages/fs/tool-str-replace-editor/src/index.ts:493] [E: packages/fs/tool-str-replace-editor/src/index.ts:494] [E: packages/fs/tool-str-replace-editor/src/index.ts:511]

`apply` 校验完 `Config` 后调用 `registerStrReplaceEditor`，用 `ctx.tools.register(defineTool({ ... }))` 挂上 **模型可见名** `str_replace_editor`。[E: packages/fs/tool-str-replace-editor/src/index.ts:422] [E: packages/fs/tool-str-replace-editor/src/index.ts:423] [E: packages/fs/tool-str-replace-editor/src/index.ts:522] 测试里 `ctx.tools.schemas()` 只出现这一条名字；`fiber.dispose()` 后 schema 清空。[E: packages/fs/tool-str-replace-editor/tests/tools.spec.ts:91] [E: packages/fs/tool-str-replace-editor/tests/tools.spec.ts:155]

这不是 CLI 命令。模型 turn 里点名 `str_replace_editor`，由 `dsh-tools` 注册表执行。companion `@deepseek-ai/dsh-tool-str-replace-editor/invariant` 的 installer 是空函数：适配器自己不持有可持久化状态，文件真相在 `ctx.fs` provider 与 observation / sandbox 插件上。[E: packages/fs/tool-str-replace-editor/src/invariant.ts:21]

## 用途定位

一套 Anthropic computer-use 风格的 **单工具四命令** 编辑器，覆盖「看文件 / 列目录 / 创建新文件 / 唯一字面量替换 / 按行插入」。包描述写成 view、create、literal replace、line insert。[E: packages/fs/tool-str-replace-editor/package.json:3]

默认 `description`（`DEFAULT_DESCRIPTION`）告诉模型：状态跨调用持久（指磁盘上的文件，不是工具内存）、`view` 文件像 `cat -n`、目录只列两层、`create` 不能覆盖已存在文件、长输出带 `<response clipped>`、`str_replace` 的 `old_str` 必须精确且唯一。[E: packages/fs/tool-str-replace-editor/src/index.ts:19] [E: packages/fs/tool-str-replace-editor/src/index.ts:507]

`apply` **不**往 `ctx.systemPrompt` 注册 section，模型只靠这条 tool description 和参数 schema。`Config.description` 可整段替换；空字符串会在 boot 时抛错。[E: packages/fs/tool-str-replace-editor/src/index.ts:519] [E: packages/fs/tool-str-replace-editor/tests/tools.spec.ts:92]

shipped 产品里它是 `minimal`（极简模式）的文件系统面：和持久 PTY 的 `bash`（包是 `dsh-tool-bash-persistent`，wire 名仍是 `bash`）组成双工具 agent。`standard` / `code` / `cordis` 走的是另一套方言：`dsh-tool-fs` 的 `read` / `write` / `edit`。

## 输入 schema

以插件 **默认 `Config`** boot 后的 `defineTool({ parameters })` 为准。字段集合是静态的：`ctx.fs.sandboxMode` **不会**给本工具加 `sandbox_permissions` / `justification`，也不会改名。[E: packages/fs/tool-str-replace-editor/src/index.ts:425] schema 编译是 implicit open object：只有标了 `required: true` 的键进入 JSON Schema `required`。[E: packages/core/tools/src/schema.ts:103] [E: packages/core/tools/src/schema.ts:449]

| 字段 | 类型 | schema 必填 | 默认 | 约束 | 说明 |
|---|---|---:|---|---|---|
| `command` | `string` | 是 | 无 | enum 仅 `view` \| `create` \| `str_replace` \| `insert` | 四选一；**没有** `undo_edit` / `grep`。[E: packages/fs/tool-str-replace-editor/src/index.ts:428] [E: packages/fs/tool-str-replace-editor/src/index.ts:429] |
| `path` | `string` | 是 | 无 | schema 文案写绝对路径；execute 用 `isAbsolute` 再拒相对路径 | 文件或目录。[E: packages/fs/tool-str-replace-editor/src/index.ts:432] [E: packages/fs/tool-str-replace-editor/src/index.ts:435] |
| `file_text` | `string` | 否 | 无 | `create` 时 execute 必填；允许空串 | 新文件全文。[E: packages/fs/tool-str-replace-editor/src/index.ts:437] [E: packages/fs/tool-str-replace-editor/src/index.ts:246] |
| `insert_line` | `integer` | 否 | 无 | `insert` 时 execute 必填；整数，范围 `[0, 当前行数]` | `new_str` 插在该行 **之后**（`0` = 文件头）。[E: packages/fs/tool-str-replace-editor/src/index.ts:441] [E: packages/fs/tool-str-replace-editor/src/index.ts:333] |
| `new_str` | `string` | 否 | `str_replace` 缺省当 `''` | `insert` 时 execute 必填（允许空串）；`str_replace` 可省略（等于删除 `old_str`） | 替换文本或插入文本。[E: packages/fs/tool-str-replace-editor/src/index.ts:445] [E: packages/fs/tool-str-replace-editor/src/index.ts:286] |
| `old_str` | `string` | 否 | 无 | `str_replace` 时 execute 必填且 **禁止空串** | 必须在文件里字面量恰好出现一次。[E: packages/fs/tool-str-replace-editor/src/index.ts:449] [E: packages/fs/tool-str-replace-editor/src/index.ts:285] |
| `view_range` | `integer[]` | 否 | 全文 | 仅文件 `view`；必须两个整数；1-based；第二元 `-1` = 到末尾 | 目录 `view` 带此字段直接失败。[E: packages/fs/tool-str-replace-editor/src/index.ts:453] [E: packages/fs/tool-str-replace-editor/src/index.ts:226] |

`parameters` 只声明 `command` / `path` / `file_text` / `insert_line` / `new_str` / `old_str` / `view_range`，没有 `old_string` / `new_string` / `file_path` / `offset` / `limit` / `sandbox_permissions`。[E: packages/fs/tool-str-replace-editor/src/index.ts:425] 测试另外钉死 schema **没有** `replace_all`；`insert_line` 的 JSON 类型是 `integer`。[E: packages/fs/tool-str-replace-editor/tests/tools.spec.ts:96] [E: packages/fs/tool-str-replace-editor/tests/tools.spec.ts:97]

`Config`（插件配置，不是模型参数）：

| 键 | 类型 | 默认 | 作用 |
|---|---|---|---|
| `maxOutputChars` | `number` | `16000` | `view` 返回文本在拼好之后的字符上限；必须是正 `safe integer`。[E: packages/fs/tool-str-replace-editor/src/index.ts:506] [E: packages/fs/tool-str-replace-editor/src/index.ts:516] |
| `description` | `string` | `DEFAULT_DESCRIPTION` | 覆盖模型看见的 tool description；trim 后不能空。[E: packages/fs/tool-str-replace-editor/src/index.ts:507] |

`minimal` 显式写了 `maxOutputChars: 16000`，与默认相同；未改 `description`。[E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:62]

## 输出 & 截断 / spill

`output.schema` 是 `{ type: 'string' }`，`render` 把返回值收成一块 `text`。[E: packages/fs/tool-str-replace-editor/src/index.ts:459] [E: packages/fs/tool-str-replace-editor/src/index.ts:461] 本工具 **没有** spill / attachment；长输出就地 clip。

`maybeTruncate`：`content.length <= maxOutputChars` 原样返回，否则 `slice(0, maxOutputChars)` 再拼 `TRUNCATED_MESSAGE`（以 `<response clipped>` 开头，并提示用 `grep -n` 找行号）。[E: packages/fs/tool-str-replace-editor/src/index.ts:17] [E: packages/fs/tool-str-replace-editor/src/index.ts:33] 测试把 `maxOutputChars` 设成 `10` 后 `view` 大文件，正文含 `<response clipped>`。[E: packages/fs/tool-str-replace-editor/tests/tools.spec.ts:287]

文件 `view` 把提示头和编号正文一起送进 `maybeTruncate`。[E: packages/fs/tool-str-replace-editor/src/index.ts:182] 目录 `view` 只 clip 列表行，外面再包一层 “Here're the files and directories up to 2 levels deep …” 头，所以目录结果总长可以略大于 `maxOutputChars`。[E: packages/fs/tool-str-replace-editor/src/index.ts:212] [E: packages/fs/tool-str-replace-editor/src/index.ts:213]

成功短句（不截断）：

- `create` → `New file created successfully at: ${displayPath}` [E: packages/fs/tool-str-replace-editor/src/index.ts:271]
- `str_replace` / `insert` → `The file ${displayPath} has been edited successfully.` [E: packages/fs/tool-str-replace-editor/src/index.ts:322] [E: packages/fs/tool-str-replace-editor/src/index.ts:364]

失败走 `dsh-tools` 的 `toolErrorResult`：`isError: true`，模型看见 `Error` 文本。本工具会抛的 `FsError.code` 包括 `FS_NOT_FOUND`、`FS_NOT_REGULAR_FILE`、`FS_EDIT_NOT_FOUND`、`FS_AMBIGUOUS_EDIT`、`FS_SANDBOX_DENIED`；observation 插件还可再抛 `FS_NOT_OBSERVED`。[E: packages/fs/tool-str-replace-editor/src/index.ts:111] [E: packages/fs/tool-str-replace-editor/src/index.ts:304] [E: packages/fs/fs-observation-policy/src/index.ts:82]

`presentCall`（UI，不进模型 schema）：`view` → `card: 'generic'` + `kind: 'read'`；`create` / `str_replace` → `card: 'diff'`；`insert` → `card: 'generic'` + `kind: 'edit'`，`line` 为 `max(1, insert_line + 1)`。[E: packages/fs/tool-str-replace-editor/src/index.ts:385] [E: packages/fs/tool-str-replace-editor/src/index.ts:395] [E: packages/fs/tool-str-replace-editor/src/index.ts:410] [E: packages/fs/tool-str-replace-editor/src/index.ts:413]

## 背后的 seam

**Definition**：`@deepseek-ai/dsh-fs` 的 `FileSystem`（`ctx.fs`）以及 `fs/write-intent` / `fs/edit-intent` / `fs/observed`。[E: packages/fs/fs/src/index.ts:58] [E: packages/fs/fs/src/index.ts:66] [E: packages/fs/fs/src/index.ts:76]

**Provider**：谁 `provide` 了 `ctx.fs`。`minimal` 在 `isolate.fs` 里挂 `@deepseek-ai/dsh-fs-local`，shadow 掉 host 上那份可能带 sandbox 的 provider。[E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:52] [E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:55] 测试也可以改挂 `SandboxedFileSystem`。[E: packages/fs/tool-str-replace-editor/tests/tools.spec.ts:80]

**Consumer**：本插件。`inject` 只要 `tools` 和 `fs`。[E: packages/fs/tool-str-replace-editor/src/index.ts:494] execute 里调用 `ctx.fs.resolve` / `stat` / `readText` / `writeText` / `listDir`，经 `ctx.waterfall('fs/write-intent' | 'fs/edit-intent', …)` 取 guard，经 `ctx.emit('fs/observed', …)` 记账。换掉 `ctx.fs`（例如远端 / E2B provider）会带走路径解析、原子写和 sandbox fence；本工具不自己碰 Node `fs`。

`MutationPolicy`：仅当 `ctx.fs.sandboxMode !== undefined` 才 `ctx.get('sandboxPolicy')`；confined 却没有 `sandboxPolicy` 会在 **插件启动** 时抛 `the mounted filesystem confines but ctx.sandboxPolicy is missing`。[E: packages/fs/tool-str-replace-editor/src/index.ts:69] [E: packages/fs/tool-str-replace-editor/src/index.ts:71] 裸 `FileSystem` / `dsh-fs-local` 的 `sandboxMode` 是 `undefined`。[E: packages/fs/fs/src/index.ts:104] 每次 mutation 把 `policy.resolve(exec)` 得到的 `SandboxExecutionPolicy` 传给 `writeText`；`FS_SANDBOX_DENIED` 被改写成 `sandboxDenialMarker(mode)`，例如 `[sandbox: file access denied under read-only mode]`。[E: packages/fs/tool-str-replace-editor/src/index.ts:84] [E: packages/sandbox/sandbox/src/escalation.ts:72] 本工具 **不用** `escalationHintMarker`，schema 也没有升级字段，模型不能通过本工具做 `sandbox_permissions` 重试。

`dsh-fs-observation-policy`（host `dsh-base` 默认挂上）占用 `fs/write-intent` / `fs/edit-intent` 单槽，并监听 `fs/observed`。[E: packages/bundle/base/cordis.patch.yml:222] [E: packages/fs/fs-observation-policy/src/index.ts:119] [E: packages/fs/fs-observation-policy/src/index.ts:122] [E: packages/fs/fs-observation-policy/src/index.ts:127] 未见过的 target 上 `editIntent` 抛 `FS_NOT_OBSERVED`（“edit requires reading … first”）。[E: packages/fs/fs-observation-policy/src/index.ts:82] 本工具在 `view` 命中文件后、以及成功 mutation 后 `emit` `present`；`stat` 未命中则先 `emit` `absent` 再抛 `FS_NOT_FOUND`。[E: packages/fs/tool-str-replace-editor/src/index.ts:108] [E: packages/fs/tool-str-replace-editor/src/index.ts:235] 目录 `view` **不** emit。测试在显式 `ctx.plugin(FsPolicy)` 时覆盖：盲 `str_replace` → `FS_NOT_OBSERVED`；先 `view` 再改；`create` 不要求先验 observation。[E: packages/fs/tool-str-replace-editor/tests/tools.spec.ts:455] [E: packages/fs/tool-str-replace-editor/tests/tools.spec.ts:479]

Cordis `EventsService.dispatch` 把 listener 放在 **一份** `_hooks` 表里；本工具的 `ctx.waterfall('fs/…')` 第一个实参是事件名字符串，不会带 scope `thisArg`，因此 isolate 只隔离 `fs` **服务**，不隔离这些事件。[E: vendor/cordis/src/events.ts:172] [I] 因而 `dsh-base` 挂上的 observation-policy 也会接到 `minimal` isolate 组里打出的 waterfall。没有单独的 minimal e2e 打盲 edit。

## 执行管线

模型 step 若含 `tool-call`，`ReactLoopAgent` 调 `executeToolCalls`。[E: packages/core/agent-loop/src/agent.ts:395] 调度器用 `ctx.tools[TOOL_RUNTIME_SCHEDULER].prepare` →（允许的话）`dispatch` → `finalize` / `finish`。[E: packages/core/agent-loop/src/tool-calls.ts:169] [E: packages/core/agent-loop/src/tool-calls.ts:173] 单测 / 直接调用走 `ctx.tools.execute`，内部是同一条 `prepareExecution` → `completeScheduledExecution`。[E: packages/core/tools/src/index.ts:1342] [E: packages/fs/tool-str-replace-editor/tests/tools.spec.ts:56]

对本工具：

1. **`tools/pre-execute`**：registry 默认 `next()` 是 `{ kind: 'allow' }`。[E: packages/core/tools/src/index.ts:1475] [E: packages/core/tools/src/index.ts:1477] 本插件 **不**注册 pre-execute listener，也 **不**返回 `ask`。只有别的插件（hooks 等）对这次 call 投 `ask` 时，才会进 `ctx.approval.request`；grant 语义是 `allowed-once`。[E: packages/core/tools/src/index.ts:1706] [E: packages/core/tools/src/index.ts:1714]
2. **timeout**：`defineTool({ … })` 未传 `timeoutMs`。`dsh-tool-call-timeout-policy` 读到 `undefined` 就原样 `next()`，不加 deadline。[E: packages/guard/timeout-policy/src/index.ts:57] [E: packages/guard/timeout-policy/src/index.ts:59]
3. **checkpoint**：host `session-checkpoint-policy` 在 top-level `tools/execute` 里、tool body 之前 `sessions.flush`；嵌套 dispatch（`exec.parent`）跳过。[E: packages/session/session-checkpoint-policy/src/index.ts:70] [E: packages/session/session-checkpoint-policy/src/index.ts:71]
4. **`tools/execute` / body**：waterfall 包住 `dispatchToolBody` → `tool.execute(args, exec)`。[E: packages/core/tools/src/index.ts:1573] [E: packages/core/tools/src/index.ts:1549] `defineTool` 先 `validateJsonSchemaValue`，违规抛 `ToolArgsError`。[E: packages/core/tools/src/schema.ts:586] [E: packages/core/tools/src/schema.ts:587]
5. **sandbox**：不在 registry 层。body 里 `writeText(..., sandboxPolicy)`；`minimal` 的 `fs-local` 忽略该参数。测试把 provider 换成 confined 时，`create` 得到 `FS_SANDBOX_DENIED`。[E: packages/fs/tool-str-replace-editor/tests/tools.spec.ts:491]
6. **并发**：未实现 `isConcurrencySafe`，`executionMode` 一律 `exclusive`，同 step 里和其他 tool-call 串行。[E: packages/core/tools/src/index.ts:1278]
7. **`tools/post-execute`**：本插件不注册 listener；成功字符串经 `output.render` 变成 text block。

## Preset 装配

成员资格只认 `apps/cli/config/agent-presets/{minimal,standard,code,cordis}/agent.cordis.yml`。包在 workspace 里存在、或 `dsh-base` 曾列出过该行，都不算「产品默认装了」。

| preset | 是否装 `@deepseek-ai/dsh-tool-str-replace-editor` | `disabled` | isolate | 配置 |
|---|---|---|---|---|
| `minimal` | 是。组 id `filesystem` 内 id `str-replace-editor`。[E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:59] [E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:60] | 无 | 与 `dsh-fs-local` 同组，`isolate.fs: true`。[E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:52] | `maxOutputChars: 16000`。[E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:62] |
| `standard` | 否。filesystem 段只挂 `dsh-tool-fs` / `dsh-tool-fs-search`。[E: apps/cli/config/agent-presets/standard/agent.cordis.yml:57] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:60] | — | — | — |
| `code` | 否。同样只挂 `dsh-tool-fs` / `dsh-tool-fs-search`。[E: apps/cli/config/agent-presets/code/agent.cordis.yml:64] [E: apps/cli/config/agent-presets/code/agent.cordis.yml:67] | — | — | Code Mode assemble 给模型的 wire 工具是 `['run_code']`；SDK 段不含 `str_replace_editor`。[E: apps/cli/tests/web-agent-presets.e2e.ts:301] [E: apps/cli/tests/web-agent-presets.e2e.ts:304] |
| `cordis` | 否。filesystem 段同 `standard`。[E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:58] | — | — | e2e 断言 catalog 有 `edit` 且 **没有** `str_replace_editor`。[E: apps/cli/tests/web-agent-presets.e2e.ts:274] [E: apps/cli/tests/web-agent-presets.e2e.ts:275] |

`minimal` 的 `preset.yml` 把该 preset 标成「仅提供持久 bash 与 str_replace_editor 的双工具编码 Agent。」[E: apps/cli/config/agent-presets/minimal/preset.yml:2] e2e：`minimal` assemble 出的 tool 名恰好 `['bash', 'str_replace_editor']`，且 parameters JSON 含 `Absolute path`。[E: apps/cli/tests/web-agent-presets.e2e.ts:227] [E: apps/cli/tests/web-agent-presets.e2e.ts:230]

Web host 把 `dsh-base` 里那行 host 级 `tool-str-replace-editor` 设成 `disabled: true`，避免进程全局再注册一份；真正露出给模型的是 `minimal` 在 agent scope 里的重挂。[E: packages/bundle/web-app/cordis.patch.yml:318] [E: packages/bundle/web-app/cordis.patch.yml:319]

## execute() 走读

`execute(args, exec)` 按 `args.command` 分四支。[E: packages/fs/tool-str-replace-editor/src/index.ts:464]

1. **共同：解析 `path`。** `resolveTarget` 拒空串；`!isAbsolute(path)` 抛 `The path ${path} is not an absolute path, it should start with \`/\`. Maybe you meant /${path}?`，然后才 `ctx.fs.resolve`。[E: packages/fs/tool-str-replace-editor/src/index.ts:93] [E: packages/fs/tool-str-replace-editor/src/index.ts:94] `isAbsolute` 来自 `node:path`（平台相关）；报错文案按 POSIX 写。相对路径测试：`view` `ambiguous.txt` → `isError`，正文含 `is not an absolute path`。[E: packages/fs/tool-str-replace-editor/tests/tools.spec.ts:381] [E: packages/fs/tool-str-replace-editor/tests/tools.spec.ts:383]

2. **`view` → `viewPath`。** `statExisting(..., 'view')`：不存在则 `emit` `absent` 并 `FS_NOT_FOUND`。[E: packages/fs/tool-str-replace-editor/src/index.ts:108] [E: packages/fs/tool-str-replace-editor/src/index.ts:110] 目录禁止 `view_range`，否则抛 “not allowed when path points to a directory”。[E: packages/fs/tool-str-replace-editor/src/index.ts:227] 目录走 `listDirectory`：跳过 `.` 前缀、`node_modules`、`__pycache__`，递归 `depth < 2`，类型标 `d`/`f`/`?`，按 displayPath codepoint 排序。[E: packages/fs/tool-str-replace-editor/src/index.ts:195] [E: packages/fs/tool-str-replace-editor/src/index.ts:200] 文件则 `readText`，`emit` `present`，`formatFileView` 做成 6 宽行号 + 两空格 + 原文（`cat -n` 风格）。[E: packages/fs/tool-str-replace-editor/src/index.ts:180] `view_range` 必须两整数；首元在 `[1, 行数]`；次元 `> 行数` 非法；次元不是 `-1` 且 `<` 首元非法；`-1` 表示切到末尾。[E: packages/fs/tool-str-replace-editor/src/index.ts:174] 空文件 `split('\n')` 得到 1 行空串，测试断言 `total of 1 lines`。[E: packages/fs/tool-str-replace-editor/tests/tools.spec.ts:300]

3. **`create` → `createFile`。** `file_text` 缺失抛 `Parameter \`file_text\` is required for command: create`（空串合法）。[E: packages/fs/tool-str-replace-editor/src/index.ts:129] [E: packages/fs/tool-str-replace-editor/src/index.ts:246] `stat !== undefined` 则 **拒绝覆盖**：`Cannot overwrite files using command \`create\``。[E: packages/fs/tool-str-replace-editor/src/index.ts:249] [E: packages/fs/tool-str-replace-editor/src/index.ts:250] 然后 `waterfall('fs/write-intent', …, () => ({ kind: 'createIfAbsent' }))`，`writeText`，成功 `emit` `present`。[E: packages/fs/tool-str-replace-editor/src/index.ts:252] [E: packages/fs/tool-str-replace-editor/src/index.ts:260]

4. **`str_replace` → `replaceInFile`。** `waterfall('fs/edit-intent', …, () => undefined)`；`old_str` 必填且非空；`new_str ?? ''`。[E: packages/fs/tool-str-replace-editor/src/index.ts:284] [E: packages/fs/tool-str-replace-editor/src/index.ts:285] [E: packages/fs/tool-str-replace-editor/src/index.ts:286] 目录或非 regular file → `FS_NOT_REGULAR_FILE`。[E: packages/fs/tool-str-replace-editor/src/index.ts:114] `readText` 后 `indexOf` 找 **所有** 不重叠出现：0 次 → `FS_EDIT_NOT_FOUND`（文案用 `old_str`，不用 `old_string`）；≥2 次 → `FS_AMBIGUOUS_EDIT`，并列出行号。[E: packages/fs/tool-str-replace-editor/src/index.ts:296] [E: packages/fs/tool-str-replace-editor/src/index.ts:303] 恰好一次则 `before.slice(0, offset) + newValue + before.slice(offset + oldValue.length)`，**不是** `String.replace`，所以 `$&` / `$$` 按字面写入。[E: packages/fs/tool-str-replace-editor/src/index.ts:311] [E: packages/fs/tool-str-replace-editor/tests/tools.spec.ts:240] CAS：`intent === undefined` 用刚 `stat` 的 `info.version`，否则用 intent 的 version。[E: packages/fs/tool-str-replace-editor/src/index.ts:312] **没有** `old_str === new_str` 检查。

5. **`insert` → `insertInFile`。** 缺 `insert_line` 立刻失败；`new_str` 必填（可空）。[E: packages/fs/tool-str-replace-editor/src/index.ts:333] [E: packages/fs/tool-str-replace-editor/src/index.ts:334] 同样走 `fs/edit-intent` + `statExisting(..., 'insert')`。`insert_line` 必须是整数且落在 `[0, lines.length]`。[E: packages/fs/tool-str-replace-editor/src/index.ts:344] 实现是 `lines.slice(0, insertLine) + new_str.split('\n') + lines.slice(insertLine)` 再 `join('\n')`。[E: packages/fs/tool-str-replace-editor/src/index.ts:349] 测试：`one\ntwo` 上 `insert_line: 2` 得到 `one\ntwo\nthree`；tab 出现在未编辑区域时原样保留。[E: packages/fs/tool-str-replace-editor/tests/tools.spec.ts:324] [E: packages/fs/tool-str-replace-editor/tests/tools.spec.ts:525]

6. **无 owner 的 execute。** `view` / `create` 在 `agent` 缺失时仍可跑（测试 `call(ctx, undefined, …)`）；observation 的 owner 来自 `exec.agent.session`，没有 agent 就记不进 WeakMap，也就满足不了 read-before-edit。[E: packages/fs/tool-str-replace-editor/tests/tools.spec.ts:312] [E: packages/fs/fs-observation-policy/src/index.ts:40]

## 设计动机·edge

DSH **没有** first-class `apply_patch`。产品默认编码面是 `dsh-tool-fs` 的字面 `edit`（`old_string` / `new_string`，可选 `replace_all`）和整文件 `write`。`str_replace_editor` 是另一套 **Anthropic 方言**，只给 `minimal` / 评测最小 agent 用。

和 [`edit`](edit.md) / [`write`](write.md) 的硬差别：

- 一个 wire 名、四个 `command`，而不是 `read`+`write`+`edit` 三工具。
- 字段是 `path` / `old_str` / `new_str` / `file_text` / `insert_line` / `view_range`，不是 `file_path` / `old_string` / `new_string` / `content`。错误文案也不提 `old_string` 或 `replace_all`。[E: packages/fs/tool-str-replace-editor/tests/tools.spec.ts:349] [E: packages/fs/tool-str-replace-editor/tests/tools.spec.ts:359]
- **禁止相对路径**；`edit`/`write` 可由 session cwd resolve。本工具在 `resolve` 之前就用 `isAbsolute` 挡掉。[E: packages/fs/tool-str-replace-editor/src/index.ts:94]
- **没有** `replace_all`：重复 `old_str` 一律 `FS_AMBIGUOUS_EDIT`。
- **没有** `undo_edit`（Anthropic `text_editor` 常见第五命令不在 enum 里）。
- `create` 不能覆盖；`write` 可以 overwrite。
- `new_str` 可省略（删除）；`edit` 的 `new_string` schema 必填（空串表示删除）。
- 不检查 `old_str === new_str`；`edit` 会拒相同对。
- 多了 `insert`（按行插入）和目录两层 listing。
- confined `ctx.fs` 时 **不**广告 escalation 字段；`edit`/`write` 会。
- `minimal` 用 `isolate.fs` + 裸 `fs-local`，host sandbox 不罩这份磁盘。

和 Codex `apply_patch`：没有 unified-diff 语法、没有 `*** Begin Patch`。和 Claude `Edit` / Pi `edit`：名字和「唯一字面量替换」接近，但 Claude 产品栈是 `Edit`+`Write`+`Read`，不是单工具 `command` 枚举；本页这套是 computer-use `str_replace_editor` 的 Harness 适配。

其它 edge：

- `\r\n` 不归一化。`old_str` 写成 `alpha\r\nbeta` 才能匹配含 CRLF 的那段；测试据此只替换第一段。[E: packages/fs/tool-str-replace-editor/tests/tools.spec.ts:379]
- Makefile 风格的 tab 必须写进 `old_str` / `new_str`；未匹配区域的 tab 原样留下。[E: packages/fs/tool-str-replace-editor/tests/tools.spec.ts:525]
- `node_modules_old` / `__pycache__backup` 会进 listing，精确名 `node_modules` / `__pycache__` 不会。[E: packages/fs/tool-str-replace-editor/tests/tools.spec.ts:278]
- 非 file/directory 的 `stat` 类型（测试里的 `'other'`）→ `FS_NOT_REGULAR_FILE`。[E: packages/fs/tool-str-replace-editor/tests/tools.spec.ts:428]
- 非法 `maxOutputChars`（`0`）或空白 `description` 在 `apply` 期失败，工具不会注册。[E: packages/fs/tool-str-replace-editor/tests/tools.spec.ts:574]

## Sources

- packages/fs/tool-str-replace-editor/src/index.ts
- packages/fs/tool-str-replace-editor/src/invariant.ts
- packages/fs/tool-str-replace-editor/tests/tools.spec.ts
- packages/fs/tool-str-replace-editor/package.json
- packages/fs/fs/src/index.ts
- packages/fs/fs-observation-policy/src/index.ts
- packages/core/tools/src/index.ts
- packages/core/tools/src/schema.ts
- packages/core/agent-loop/src/agent.ts
- packages/core/agent-loop/src/tool-calls.ts
- packages/guard/timeout-policy/src/index.ts
- packages/sandbox/sandbox/src/escalation.ts
- packages/session/session-checkpoint-policy/src/index.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/web-app/cordis.patch.yml
- apps/cli/config/agent-presets/minimal/agent.cordis.yml
- apps/cli/config/agent-presets/minimal/preset.yml
- apps/cli/config/agent-presets/standard/agent.cordis.yml
- apps/cli/config/agent-presets/code/agent.cordis.yml
- apps/cli/config/agent-presets/cordis/agent.cordis.yml
- apps/cli/tests/web-agent-presets.e2e.ts
- vendor/cordis/src/events.ts

## 相关

- [`spine.tool-call-anatomy`](../../spine/tool-call-anatomy.md) — `tools/pre-execute` → execute → `tools/post-execute` 与 approval / timeout 挂点
- [`ref.tools-catalog`](../../reference/tools-catalog.md) — 模型可见工具总表
- [`surface.tools.edit`](edit.md) — `dsh-tool-fs` 的 `old_string`/`new_string`/`replace_all` 方言
- [`surface.tools.write`](write.md) — 整文件 create-or-overwrite
- [`surface.tools.bash-persistent`](bash-persistent.md) — `minimal` 里另一个模型可见工具（wire 名 `bash`）
- [`surface.presets.minimal`](../presets/minimal.md) — 极简 preset 组合
- [`subsys.execution.fs`](../../subsystems/execution/fs.md) — `ctx.fs` 缝
- [`subsys.execution.fs-observation`](../../subsystems/execution/fs-observation.md) — read-before-edit 观察策略
