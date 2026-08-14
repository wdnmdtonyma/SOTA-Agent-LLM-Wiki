---
id: surface.tools.edit
title: edit 字符串替换
kind: tool
tier: T1
pkg: execution
source:
  - packages/fs/tool-fs/src/edit.ts
  - packages/fs/tool-fs/src/diff.ts
  - packages/fs/tool-fs/src/index.ts
  - packages/fs/tool-fs/src/sandbox.ts
  - packages/fs/tool-fs/src/error.ts
  - packages/fs/tool-fs/src/session-cwd.ts
  - packages/fs/tool-fs/package.json
  - packages/fs/tool-fs/tests/tools.spec.ts
  - packages/fs/tool-fs/tests/integration.spec.ts
  - packages/fs/tool-fs/tests/error.spec.ts
  - packages/fs/tool-fs/tests/diff.spec.ts
  - packages/fs/fs-observation-policy/src/index.ts
  - packages/fs/fs-observation-policy/tests/policy.spec.ts
  - packages/fs/fs/src/index.ts
  - packages/fs/fs/src/types.ts
  - packages/fs/fs-local/src/index.ts
  - packages/fs/fs-local/src/fsio.ts
  - packages/fs/fs-sandbox/src/index.ts
  - packages/sandbox/sandbox/src/escalation.ts
  - packages/core/tools/src/index.ts
  - packages/core/tools/src/schema.ts
  - packages/core/agent-loop/src/tool-calls.ts
  - packages/guard/timeout-policy/src/index.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/web-app/cordis.patch.yml
  - apps/cli/config/agent-presets/minimal/agent.cordis.yml
  - apps/cli/config/agent-presets/standard/agent.cordis.yml
  - apps/cli/config/agent-presets/code/agent.cordis.yml
  - apps/cli/config/agent-presets/cordis/agent.cordis.yml
symbols:
  - applyEditTool
  - parseEditArgs
  - formatEditOutput
  - computeHunkDiffs
  - diffsFromMeta
related:
  - spine.tool-call-anatomy
  - ref.tools-catalog
evidence: explicit
status: verified
updated: 47f943859b
---

> `edit` 是 `@deepseek-ai/dsh-tool-fs` 注册的 model-visible 工具：对**已有** UTF-8 文本文件做字面 `old_string` → `new_string` 替换，默认要求唯一匹配。DSH 没有 first-class `apply_patch`。

## 能回答的问题

- `edit` 的 wire `name`、实现包、`export const name` / `inject`、谁调用 `ctx.tools.register(defineTool(...))`？
- 默认 Config 下模型看见哪些字段？`replace_all` 默认值、`old_string === new_string`、空 `old_string` / 空 `new_string` 各怎样？
- `sandbox_permissions` / `justification` 何时进入 schema？escalation 的 approval grant 是什么？
- 没先 `read` 为什么得到 `FS_NOT_OBSERVED`？observation policy 会不会改 schema？
- 成功时模型看见什么文案？canonical `before`/`after` 会不会整文件回模型？有没有 tool-owned spill / `timeoutMs`？
- `minimal` / `standard` / `code` / `cordis` 谁装 `@deepseek-ai/dsh-tool-fs`？`minimal` 的编辑方言是什么？

## Identity

模型看见的 wire 名是 `edit`。`applyEditTool` 用 `defineTool({ name: 'edit', ... })` 经 `ctx.tools.register` 挂进 `ctx.tools`。[E: packages/fs/tool-fs/src/edit.ts:84][E: packages/fs/tool-fs/src/edit.ts:83]

实现包是 `@deepseek-ai/dsh-tool-fs`（Cordis 插件名 `tool-fs`）。[E: packages/fs/tool-fs/package.json:2][E: packages/fs/tool-fs/src/index.ts:19]

`inject` 是 `['tools', 'fs', 'systemPrompt']`：没有 `ctx.fs` 时插件保持 pending，catalog 长度为 0，不会出现 `edit`。[E: packages/fs/tool-fs/src/index.ts:22][E: packages/fs/tool-fs/tests/tools.spec.ts:182]

`apply()` 构造一份共享的 `FsSandboxController`，再调用 `applyWriteTool` 与 `applyEditTool`。`read_image` 走另一条 `ctx.inject(['attachments'], …)`，与 `edit` 无关。[E: packages/fs/tool-fs/src/index.ts:76][E: packages/fs/tool-fs/src/index.ts:78]

同一次 `apply()` 还注册 system-prompt 段 `tool:edit`（`order: 102`），告诉模型：字面替换、默认唯一匹配、默认 observation policy 要求先读（本 session 刚 `write`/`edit` 过的文件除外）。[E: packages/fs/tool-fs/src/edit.ts:78][E: packages/fs/tool-fs/src/edit.ts:80]

注册测试断言 catalog 名为 `['edit', 'read', 'write']`（无 attachments 时没有 `read_image`）。[E: packages/fs/tool-fs/tests/tools.spec.ts:156]

`edit` 未声明 `isConcurrencySafe`，调度为 `exclusive`。[E: packages/fs/tool-fs/tests/tools.spec.ts:165][E: packages/core/tools/src/index.ts:1278]

## 用途定位

`edit` 只改**已经存在**的 UTF-8 文本文件。它不是整文件覆盖（那是同包的 `write`），也不是 unified-diff / multi-file patch。description 写的是 “Edit an existing UTF-8 text file by replacing literal text.”[E: packages/fs/tool-fs/src/edit.ts:85]

匹配是字面量，不是 regex，也不是 fuzzy replacer。默认 `replace_all === false` 时，`old_string` 必须在文件里恰好出现一次；多处匹配要嘛加长 `old_string`，要嘛显式 `replace_all: true`。[E: packages/fs/tool-fs/src/edit.ts:90]

`new_string` 可以为空字符串，用来删除那一处匹配。[E: packages/fs/tool-fs/src/edit.ts:89]

真正的读-匹配-写发生在 `ctx.fs.editText` 的临界区里，不在工具层拼 `readText` + `writeText`。[E: packages/fs/fs/src/index.ts:243]

## 输入 schema

`@deepseek-ai/dsh-tool-fs` 的 `Config` 只有 `readLimit` / `readMaxLineLength` / `readMaxBytes` / `readStreamMinSize`，**不改** `edit` 的参数名或字段集。[E: packages/fs/tool-fs/src/index.ts:36]

下列是 `defineTool` 默认 parameters（再叠加 `parseEditArgs` 的值约束）。escalation 两字段是否出现，取决于挂载的 `ctx.fs.sandboxMode`，不是 Config。[E: packages/fs/tool-fs/src/edit.ts:91][E: packages/fs/tool-fs/src/sandbox.ts:45]

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---|---|---|---|
| `file_path` | `string` | 是 | 无 | trim 后非空 | 由 filesystem backend `resolve`；相对路径相对 session cwd（有 sandbox policy 时用其 `workspaceRoot`）。[E: packages/fs/tool-fs/src/edit.ts:87][E: packages/fs/tool-fs/src/edit.ts:48] |
| `old_string` | `string` | 是 | 无 | 长度 > 0；必须 ≠ `new_string` | 字面查找文本。空串在 execute 被拒，不能当「创建文件」。[E: packages/fs/tool-fs/src/edit.ts:88][E: packages/fs/tool-fs/src/edit.ts:49] |
| `new_string` | `string` | 是 | 无 | 必须 ≠ `old_string`；空串合法 | 字面替换文本。空串删除匹配。[E: packages/fs/tool-fs/src/edit.ts:89][E: packages/fs/tool-fs/src/edit.ts:50] |
| `replace_all` | `boolean` | 否 | `false`（`parseEditArgs` 里 `?? false`） | schema 无 `required` | `false`：必须唯一匹配。`true`：替换全部出现。[E: packages/fs/tool-fs/src/edit.ts:90][E: packages/fs/tool-fs/src/edit.ts:55] |

`parseEditArgs` 在 schema 通过之后再跑：空白 `file_path`、空 `old_string`、`old_string === new_string` 分别抛普通 `Error`（文案含 `must be a non-empty string` / `must differ`），变成 `isError` 工具结果。[E: packages/fs/tool-fs/src/edit.ts:47][E: packages/fs/tool-fs/tests/tools.spec.ts:445]

**Confined `ctx.fs`（`sandboxMode !== undefined`）才广告的字段。** `FsSandboxController` 在 apply 时读 `ctx.fs.sandboxMode`：有值则 `escalationModes = ESCALATION_TARGETS`，并把 `schemaFields()` spread 进 parameters；无值则 `escalationModes = []`，模型可见 schema 不含这两键。[E: packages/fs/tool-fs/src/sandbox.ts:44][E: packages/fs/tool-fs/src/sandbox.ts:45][E: packages/sandbox/sandbox/src/escalation.ts:41]

参数根是 implicit open object：`parameterSchemaSpecToJsonSchema` 不写 `additionalProperties: false`。未广告的 escalation 字段仍能到达 `execute`；`resolvePolicy` 在 `escalationModes.length === 0` 时 throw `not available in this composition`。[E: packages/core/tools/src/schema.ts:451][E: packages/fs/tool-fs/src/sandbox.ts:94][E: packages/fs/tool-fs/tests/tools.spec.ts:923]

shipped host 挂 `@deepseek-ai/dsh-fs-sandbox`，该 backend 覆盖 `sandboxMode` 为部署默认模式，因此 **standard/code/cordis 在默认产品组合里会看到 escalation 字段**。[E: packages/bundle/base/cordis.patch.yml:443][E: packages/fs/fs-sandbox/src/index.ts:69]

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---|---|---|---|
| `sandbox_permissions` | `string` | 否 | 无 | enum：`workspace-write`、`danger-full-access` | 一次性更宽 sandbox mode。必须与 `justification` 成对；只作为刚被拒绝后的 retry。[E: packages/fs/tool-fs/src/sandbox.ts:61][E: packages/sandbox/sandbox/src/escalation.ts:41] |
| `justification` | `string` | 否 | 无 | 与 `sandbox_permissions` 成对；trim 后非空 | 给用户看的一句理由。单独出现或空句都会在 `validateEscalationArgs` 被拒。[E: packages/fs/tool-fs/src/sandbox.ts:67][E: packages/sandbox/sandbox/src/escalation.ts:52] |

测试钉死：非 confined backend 的 schema 没有这两字段；confined 时 enum 正好是 `['workspace-write', 'danger-full-access']`。[E: packages/fs/tool-fs/tests/tools.spec.ts:832][E: packages/fs/tool-fs/tests/tools.spec.ts:843]

`read-only` 不是 escalation 目标（`ESCALATION_TARGETS` 只有 `workspace-write` 与 `danger-full-access`）。严格更宽检查发生在 execute，不写进 schema enum。[E: packages/sandbox/sandbox/src/escalation.ts:41]

## 输出 & 截断 / spill

成功 body 的 canonical value 是 `{ path, before, after }`，三者都是 required string：`path` 用 backend 的 `displayPath`，`before`/`after` 是 LF-normalized 的整文件文本。[E: packages/fs/tool-fs/src/edit.ts:98][E: packages/fs/tool-fs/src/edit.ts:142]

模型**不**吃这份全文。`ToolRuntime.createSuccessResult` 用 `output.render` 投影成 Native `content`；agent-loop 把 `result.content` 写进 `tool/result` 消息，不把 canonical `value` 回给模型。`edit` 的 render 只调用 `formatEditOutput`：[E: packages/core/tools/src/index.ts:1800][E: packages/core/agent-loop/src/tool-calls.ts:278]

- 单次替换：`The file ${displayPath} has been updated successfully.`[E: packages/fs/tool-fs/src/edit.ts:68]
- `replace_all`：`The file ${displayPath} has been updated. All occurrences were successfully replaced.`[E: packages/fs/tool-fs/src/edit.ts:67]

`replace_all` 的渲染读的是**原始 args** 的 `args.replace_all ?? false`，不是 parse 后的 camelCase。[E: packages/fs/tool-fs/src/edit.ts:105]

`presentationMeta`（仅 top-level call）用 `computeHunkDiffs(file_path, before, after)` 生成 `meta.diffs`：每个 applied hunk 两侧各 `DIFF_CONTEXT = 3` 行，供 UI `presentResult` 画 diff card。这是 session 可 JSON 持久化的展示数据，不是模型正文。[E: packages/fs/tool-fs/src/diff.ts:11][E: packages/fs/tool-fs/src/edit.ts:108][E: packages/fs/tool-fs/tests/tools.spec.ts:611]

`edit` 自己没有 spill、没有 maxOutputChars、没有行/字节截断。host `spill-policy`（`maxInlineBytes: 50000`）罩的是通用 inline 结果；本工具模型面是一句确认，不会走出 tool-owned overflow 路径。[E: packages/bundle/base/cordis.patch.yml:352]

失败时 registry 把 throw 收成 `isError`。`FS_NOT_OBSERVED` / `FS_STALE_VERSION` 会经 `remediateFsError` 在原文后追加 `— read the file, then retry` / `— re-read the file, then retry`，`FsError.code` 保留给 retry/UI。[E: packages/fs/tool-fs/src/error.ts:15][E: packages/fs/tool-fs/src/error.ts:16][E: packages/fs/tool-fs/tests/error.spec.ts:21]

`FS_EDIT_NOT_FOUND` / `FS_AMBIGUOUS_EDIT` 不追加 remedy。[E: packages/fs/tool-fs/tests/error.spec.ts:27]

调用期 UI：`presentCall` 用 args 画 `card: 'diff'`。replay 时若 logged `old_string` 为空，`oldText` 变成 `null`（execute 路径到不了这里，因为 `parseEditArgs` 已拒空串）。[E: packages/fs/tool-fs/src/edit.ts:155][E: packages/fs/tool-fs/tests/tools.spec.ts:588]

## 背后的 seam

| 角色 | 实体 | 换 provider 带走什么 |
|---|---|---|
| Definition | `@deepseek-ai/dsh-fs` 的 `FileSystem`：`resolve` / `editText` / `sandboxMode`；Events `fs/edit-intent`、`fs/observed` | 稳定 `FsTarget`、原子字面编辑合同、可选 version guard |
| Provider | 默认 host：`@deepseek-ai/dsh-fs-sandbox`（继承 `@deepseek-ai/dsh-fs-local`） | 围栏 + 本地读匹配写；LF 归一化匹配、按文件恢复 CRLF/LF、`FS_*` 码 |
| Consumer | `@deepseek-ai/dsh-tool-fs` 的 `applyEditTool` | schema、校验、sandbox 广告、model 文案、hunk meta |
| Policy（可选） | `@deepseek-ai/dsh-fs-observation-policy` | read-before-edit；**不改 schema** |
| Escalation vocab | `@deepseek-ai/dsh-sandbox` 的 `approveEscalation` / `ESCALATION_TARGETS` | 与 bash 同一套更宽阶梯、`[sandbox: …]` marker、`allowed-once` |

`edit` 消费 `ctx.fs`、`ctx.tools`、`ctx.systemPrompt`，以及 confined 时的 `ctx.sandboxPolicy` 与 `ctx.get('approval')`。它不走 `ctx.shell`、`ctx.terminals`、`ctx.subprocess`。[E: packages/fs/tool-fs/src/index.ts:22][E: packages/fs/tool-fs/src/sandbox.ts:46]

`fs/edit-intent` 是单槽 waterfall：`next()` 的默认 thunk 返回 `undefined`（无条件编辑）。observation policy 占用该槽且**不**调用 `next()`。[E: packages/fs/fs/src/index.ts:66][E: packages/fs/fs-observation-policy/src/index.ts:122]

`ObservedStateGate.editIntent`：无 owner 或未见 → `FS_NOT_OBSERVED`；已观测为 `absent` → `FS_NOT_FOUND`；`present` → `{ version: prior.version }` 作为 CAS 基础。[E: packages/fs/fs-observation-policy/src/index.ts:81][E: packages/fs/fs-observation-policy/src/index.ts:85][E: packages/fs/fs-observation-policy/src/index.ts:87]

成功后 `ctx.emit('fs/observed', target, { kind: 'present', version }, exec)` 刷新该 session 的观测。直接 `ctx.fs.readText` **不会**发这个事件，所以绕过 `read` 工具的读取不能授权后续 `edit`。[E: packages/fs/tool-fs/src/edit.ts:141][E: packages/fs/tool-fs/tests/integration.spec.ts:231]

换掉 `ctx.fs` 会带走：路径解析与 `displayPath`、version 算法、是否 confined（从而 schema 是否含 escalation）、字面匹配的换行归一化、缺失目标/多匹配的错误码。工具层的 wire 名和 parameters 不变。

## 执行管线

`edit` 没有工具专属的 `tools/pre-execute` listener。一次调用走 `ToolRuntime` 的通用 `prepare → dispatch → finalize`：

1. `tools/pre-execute` waterfall，默认 `allow`。`edit` 的 `defineTool` 不声明 per-call `ask`。日常编辑不弹审批。[E: packages/core/tools/src/index.ts:1476]
2. 若某 listener 返回 `ask`，registry 经 `ctx.approval` 解析；grant 是 `allowed-once`。这是通用门，不是 `edit` 默认路径。[E: packages/core/tools/src/index.ts:1714]
3. `tools/execute` around-dispatch。host 挂了 `@deepseek-ai/dsh-tool-call-timeout-policy`：它读 `ToolDefinition.timeoutMs`；`edit` **未**声明 `timeoutMs`，wrapper 直接 `next()`，没有 deadline。[E: packages/guard/timeout-policy/src/index.ts:57][E: packages/guard/timeout-policy/src/index.ts:59]
4. `dispatchToolBody` 调 `definition.execute`。[E: packages/core/tools/src/index.ts:1549]
5. `tools/post-execute` 默认 `accept`。`edit` 没有 tool-owned post 改写。[E: packages/core/tools/src/index.ts:1744]

**挂在 `execute()` 内部、在 `editText` 之前的门：**

- `FsSandboxController.resolvePolicy('edit', args, exec)`：先 `validateEscalationArgs`；无 escalation 字段则盖 standing session mode（host `sandbox-policy` 默认 `DSH_PERMISSION_MODE ?? 'workspace-write'`）；有字段则 `approveEscalation`，成功只接受 `allowed-once`，把更宽 mode 盖到这一次 policy 上。拒绝/取消/无 approval 服务/无 agent 全部 throw，磁盘未动。[E: packages/fs/tool-fs/src/edit.ts:116][E: packages/fs/tool-fs/src/sandbox.ts:88][E: packages/sandbox/sandbox/src/escalation.ts:183][E: packages/bundle/base/cordis.patch.yml:175]
- Sandbox 只围栏**文件副作用**。`SandboxedFileSystem.editText` 先 `checkedTarget`：`read-only` 拒一切 mutation；`workspace-write` 要求目标落在 writable roots；`danger-full-access` 不围栏。拒绝抛 `FS_SANDBOX_DENIED`，工具层映射成与 bash 相同的 `[sandbox: file access denied under … mode]` 再加 escalation hint。不可用的进程沙箱是 shell 家族的 `SANDBOX_UNAVAILABLE`；fs 围栏走结构化 `FS_SANDBOX_DENIED`，不静默裸跑。[E: packages/fs/fs-sandbox/src/index.ts:105][E: packages/fs/tool-fs/src/sandbox.ts:129]

相对路径：`sessionResolveOptions` 优先 `sandboxPolicy.workspaceRoot`，否则 `exec.agent.session.header.cwd`。[E: packages/fs/tool-fs/src/session-cwd.ts:41]

## Preset 装配

成员资格只认 `apps/cli/config/agent-presets/*/agent.cordis.yml`。包存在 ≠ 该 preset 装了 `edit`。

| Preset | 是否装 `@deepseek-ai/dsh-tool-fs`（从而有 `edit`） | `disabled` | isolate |
|---|---|---|---|
| `minimal` | 否。工具行是 `dsh-tool-bash-persistent`（wire 名仍是 `bash`）+ `dsh-tool-str-replace-editor` | 无 `tool-fs` 行 | `isolate.terminals` + `isolate.fs`（`fs-local` + editor）[E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:52][E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:59] |
| `standard` | 是，`id: tool-fs` | 无 | 该行不在 isolate 组；`fs` 与 observation policy 留在 host [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:56] |
| `code` | 是，工具行仍是 `id: tool-fs`；另挂 `tool-presentation` `mode: code` | 无 | 无 isolate [E: apps/cli/config/agent-presets/code/agent.cordis.yml:63][E: apps/cli/config/agent-presets/code/agent.cordis.yml:262] |
| `cordis` | 是 | 无 | 同 standard [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:57] |

`code` 的 catalog 仍含 `edit`，但 `mode: code` 会把模型顶层直呼塌缩成 `UNKNOWN_TOOL`（文案要求从 `run_code` 程序里调用）；SDK 子分发带 `parent`，仍执行 `edit` 本体。[E: packages/core/tools/src/index.ts:1381][E: packages/core/tools/src/index.ts:1441]

Web host 把 base 里那份 `tool-fs` 设为 `disabled: true`，由 preset 再挂，所以 Web 会话看不看得到 `edit` 以 preset 表为准。[E: packages/bundle/web-app/cordis.patch.yml:312][E: packages/bundle/web-app/cordis.patch.yml:313]

host `dsh-base` 仍 insert `fs-observation-policy` + `tool-fs` + `fs-sandbox`：默认组合里 read-before-edit 与 mutation 围栏是开的，schema 不因此增减字段。[E: packages/bundle/base/cordis.patch.yml:221][E: packages/bundle/base/cordis.patch.yml:224]

`minimal` 的编辑入口是 `str_replace_editor`（另一包、另一方言），不是把 `edit` 改个名。

## execute() 走读

入口：`applyEditTool` 注册的 `execute(args, exec)`。[E: packages/fs/tool-fs/src/edit.ts:112]

1. **`parseEditArgs@packages/fs/tool-fs/src/edit.ts`** — 空白 `file_path`、空 `old_string`、`old_string === new_string` 立刻 throw。`replaceAll` 默认 `false`。[E: packages/fs/tool-fs/src/edit.ts:113][E: packages/fs/tool-fs/src/edit.ts:50]
2. **`FsSandboxController.resolvePolicy@packages/fs/tool-fs/src/sandbox.ts`** — 在任何磁盘 mutation 之前盖好 per-call `SandboxExecutionPolicy`（approved mode > session override > backend default，并带 session cwd 作 workspace root）。escalation 失败在这一步结束。[E: packages/fs/tool-fs/src/edit.ts:116]
3. **`ctx.fs.resolve` + `sessionResolveOptions@packages/fs/tool-fs/src/session-cwd.ts`** — 得到稳定 `FsTarget`。工具层**不** `stat`。[E: packages/fs/tool-fs/src/edit.ts:117]
4. **`ctx.waterfall('fs/edit-intent', target, exec, () => undefined)`** — 默认 `undefined`（无条件编辑）。host 加载了 `@deepseek-ai/dsh-fs-observation-policy` 时，`editIntent` 要么给 `{ version }`，要么抛 `FS_NOT_OBSERVED` / `FS_NOT_FOUND`。这条 waterfall 放在 try 里，好让 policy 拒绝也走同一套 model-facing remedy。[E: packages/fs/tool-fs/src/edit.ts:126][E: packages/fs/fs-observation-policy/src/index.ts:82]
5. **`ctx.fs.editText(target, { oldString, newString, replaceAll }, intent, exec.signal, sandboxPolicy)`** — 工具仍不 stat。CAS、字面匹配、原子写都在 provider 锁里。[E: packages/fs/tool-fs/src/edit.ts:127][E: packages/fs/tool-fs/tests/integration.spec.ts:284]
6. **`SandboxedFileSystem.checkedTarget` 然后 `LocalFileSystem.editText`** — 先围栏。缺失目标（无论有没有 version guard）报 `FS_STALE_VERSION`，文案是 `file changed since it was read`，避免对「已被别人删掉」报 `FS_EDIT_NOT_FOUND`。[E: packages/fs/fs-sandbox/src/index.ts:112][E: packages/fs/fs-local/src/index.ts:232]
7. **version 对不上 → `FS_STALE_VERSION`，发生在字面匹配之前**，所以过期的 `old_string` 不会变成 `FS_EDIT_NOT_FOUND` / `FS_AMBIGUOUS_EDIT`。[E: packages/fs/fs-local/src/index.ts:237]
8. **`applyLiteralEdit@packages/fs/fs-local/src/fsio.ts`** — 先把 `old_string`/`new_string` LF-normalize 再在已归一化的文件内容上 `split`/`join`。0 次 → `FS_EDIT_NOT_FOUND`；`!replaceAll && replacements > 1` → `FS_AMBIGUOUS_EDIT`（文案点名 `replace_all`）。然后按原文件主换行风格写回。[E: packages/fs/fs-local/src/fsio.ts:766][E: packages/fs/fs-local/src/fsio.ts:773][E: packages/fs/fs-local/src/fsio.ts:776]
9. **`catch`：`remediateFsError(sandbox.mapError(...))`** — `FS_SANDBOX_DENIED` 换成共享 `[sandbox: …]` marker；stale / not-observed 追加 remedy；其余原样抛出。[E: packages/fs/tool-fs/src/edit.ts:138]
10. **`ctx.emit('fs/observed', … present, outcome.version)`** — 刷新观测，使同 session 下一次 `edit`/`write` 不必再 `read`。无 policy plugin 时这是空操作。listener 约定同步；它 throw 会变成这次 call 的 `isError`，但磁盘已经写下。[E: packages/fs/tool-fs/src/edit.ts:141]
11. **return `{ path: displayPath, before, after }`** — registry 校验 output schema，`formatEditOutput` 生成模型句，`computeHunkDiffs` 写入 `meta`。[E: packages/fs/tool-fs/src/edit.ts:142]

默认 policy 部署下的集成行为：

- 未 `read` 的 `edit` → `FS_NOT_OBSERVED`，文件不动，文案含 `edit requires reading` 与 `read the file, then retry`。[E: packages/fs/tool-fs/tests/integration.spec.ts:151]
- 窗口 `read`（只看第一行）也能授权编辑窗口外的行：观测的是 version，不是「模型看见的行」。[E: packages/fs/tool-fs/tests/integration.spec.ts:160]
- 读后磁盘被改 → `FS_STALE_VERSION`；再 `read` 然后重试可通过。[E: packages/fs/tool-fs/tests/integration.spec.ts:178]
- 无 `replace_all` 的多处匹配 → `FS_AMBIGUOUS_EDIT`；`replace_all: true` 把 `a a a` 写成 `b b b`。[E: packages/fs/tool-fs/tests/integration.spec.ts:203][E: packages/fs/tool-fs/tests/integration.spec.ts:212]
- 同 session 刚 `write` 过的文件可以直接 `edit`，不必中间再 `read`（write 已 emit `fs/observed`）。[E: packages/fs/tool-fs/tests/integration.spec.ts:217]
- 观测为缺失之后，`edit` 仍是 `FS_NOT_FOUND`；重建走 `write` 的 `createIfAbsent`。[E: packages/fs/tool-fs/tests/integration.spec.ts:258]
- 卸掉 observation policy 的 bare 部署：未读文件也能 `edit`；缺文件仍是 `FS_STALE_VERSION`。[E: packages/fs/tool-fs/tests/integration.spec.ts:343]

escalation 测试：用户拒绝 `sandbox_permissions` 时 `edit` 为 `isError`，provider 未被 stamp / 未 mutation。[E: packages/fs/tool-fs/tests/tools.spec.ts:896]

## 设计动机·edge

DSH 没有 `apply_patch`。`edit` 是精确字面替换，不是 Codex 的 hunk 方言，也不是 Claude Code V1 那种 9 路 fuzzy replacer。空 `old_string` 不能创建文件（那是 `write`）。[E: packages/fs/tool-fs/src/edit.ts:49]

相对 Anthropic 风格的 `str_replace_editor`：那是 **另一个包**，只出现在 `minimal`；`edit`/`write`/`read` 是 `dsh-tool-fs` 的三件套。不要把 `minimal` 的 editor 读成 `edit` 的配置变体。[E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:59]

本工具独有 / 易踩的边：

- **schema 不编码 read-before-edit。** 默认 policy 在 `fs/edit-intent` 上拒绝未见目标；卸掉 plugin 就变成无条件 `editText`。模型必须先走会 emit `fs/observed` 的 `read`/`write`/`edit`，直接 `ctx.fs.readText` 不算数。[E: packages/fs/fs-observation-policy/src/index.ts:82][E: packages/fs/tool-fs/tests/integration.spec.ts:226]
- **`old_string === new_string` 在进磁盘前拒掉**，避免保证 no-op 的调用。[E: packages/fs/tool-fs/src/edit.ts:50]
- **匹配在 LF 归一化后做**，再按原文件主换行写回。CRLF 文件可以按 LF 风格的 `old_string` 命中。[E: packages/fs/fs-local/src/fsio.ts:766]
- **缺失目标与 stale 共用 `FS_STALE_VERSION`**，包括 bare 无 guard 路径。模型收到的是「re-read then retry」，不是「not found」。[E: packages/fs/fs-local/src/index.ts:232]
- **ambiguous 必须模型改口**：加长 `old_string` 或设 `replace_all`。工具不会自行挑第一处。[E: packages/fs/fs-local/src/fsio.ts:776]
- **escalation 字段只在 confined fs 广告**；未广告时字段仍可能到达 `execute`，由 `resolvePolicy` 以「not available in this composition」fail-closed（`edit.ts` 注释写「validator 先拒」与测试不一致，以测试与 schema 编译为准）。[E: packages/fs/tool-fs/src/sandbox.ts:94][E: packages/fs/tool-fs/tests/tools.spec.ts:923]
- **grant 是 `allowed-once`**，只盖这一次 mutation，不是 session 永久升权。[E: packages/sandbox/sandbox/src/escalation.ts:183]
- **无 `timeoutMs`**，与 search/web 不同；取消只靠调用方 `exec.signal` 传到 `resolve` / `editText`。[E: packages/guard/timeout-policy/src/index.ts:59]
- **`exclusive`**：并行组里的 `edit` 单独成障，避免同文件交叉写。[E: packages/fs/tool-fs/tests/tools.spec.ts:165]
- **窗口 read 授权的是 version，不是可见行。** 只读了第 1 行也可以改第 12 行，只要文件没在中间被改。[E: packages/fs/tool-fs/tests/integration.spec.ts:169]

## Sources

- packages/fs/tool-fs/src/edit.ts
- packages/fs/tool-fs/src/diff.ts
- packages/fs/tool-fs/src/index.ts
- packages/fs/tool-fs/src/sandbox.ts
- packages/fs/tool-fs/src/error.ts
- packages/fs/tool-fs/src/session-cwd.ts
- packages/fs/tool-fs/package.json
- packages/fs/tool-fs/tests/tools.spec.ts
- packages/fs/tool-fs/tests/integration.spec.ts
- packages/fs/tool-fs/tests/error.spec.ts
- packages/fs/tool-fs/tests/diff.spec.ts
- packages/fs/fs-observation-policy/src/index.ts
- packages/fs/fs-observation-policy/tests/policy.spec.ts
- packages/fs/fs/src/index.ts
- packages/fs/fs/src/types.ts
- packages/fs/fs-local/src/index.ts
- packages/fs/fs-local/src/fsio.ts
- packages/fs/fs-sandbox/src/index.ts
- packages/sandbox/sandbox/src/escalation.ts
- packages/core/tools/src/index.ts
- packages/core/tools/src/schema.ts
- packages/core/agent-loop/src/tool-calls.ts
- packages/guard/timeout-policy/src/index.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/web-app/cordis.patch.yml
- apps/cli/config/agent-presets/minimal/agent.cordis.yml
- apps/cli/config/agent-presets/standard/agent.cordis.yml
- apps/cli/config/agent-presets/code/agent.cordis.yml
- apps/cli/config/agent-presets/cordis/agent.cordis.yml

## 相关

- [工具调用解剖](../../spine/tool-call-anatomy.md)（`spine.tool-call-anatomy`）
- [模型可见工具目录](../../reference/tools-catalog.md)（`ref.tools-catalog`）
- [write 整文件写](write.md)
- [read 读文件](read.md)
- [str_replace_editor](str-replace-editor.md)（`minimal` 的另一套编辑方言）
- [fs 服务缝](../../subsystems/execution/fs.md)
