---
id: surface.tools.write
title: write 整文件写
kind: tool
tier: T1
pkg: execution
source:
  - packages/fs/tool-fs/src/index.ts
  - packages/fs/tool-fs/src/write.ts
  - packages/fs/tool-fs/src/sandbox.ts
  - packages/fs/tool-fs/src/error.ts
  - packages/fs/tool-fs/src/session-cwd.ts
  - packages/fs/tool-fs/src/diff.ts
  - packages/fs/tool-fs/package.json
  - packages/fs/fs/src/index.ts
  - packages/fs/fs/src/types.ts
  - packages/fs/fs-local/src/index.ts
  - packages/fs/fs-sandbox/src/index.ts
  - packages/fs/fs-observation-policy/src/index.ts
  - packages/fs/fs-observation-policy/tests/policy.spec.ts
  - packages/fs/tool-fs/tests/tools.spec.ts
  - packages/fs/tool-fs/tests/integration.spec.ts
  - packages/fs/tool-fs/tests/error.spec.ts
  - packages/core/tools/src/index.ts
  - packages/core/tools/src/schema.ts
  - packages/sandbox/sandbox/src/escalation.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/web-app/cordis.patch.yml
  - apps/cli/config/agent-presets/minimal/agent.cordis.yml
  - apps/cli/config/agent-presets/standard/agent.cordis.yml
  - apps/cli/config/agent-presets/code/agent.cordis.yml
  - apps/cli/config/agent-presets/cordis/agent.cordis.yml
symbols: [applyWriteTool, parseWriteArgs, formatWriteOutput]
related: [spine.tool-call-anatomy, ref.tools-catalog]
evidence: explicit
status: verified
updated: 47f943859b
---

> `write` 是 `@deepseek-ai/dsh-tool-fs` 注册的 model-visible 整文件写入工具：一次调用按 `file_path` + `content` 做 UTF-8 **create-or-overwrite**，经 `ctx.fs.writeText` 与单槽 `fs/write-intent` 落地；DSH 没有 first-class `apply_patch`。

## 能回答的问题

- 模型看见的 wire 名是 `write` 还是 `tool-fs`？哪个包、哪个工厂注册它？
- `file_path` / `content` 的必填与空串规则是什么？`sandbox_permissions` 何时才进 schema？
- 成功时模型看到什么文本？会不会把整份 `content` 回显？有没有 spill / `timeoutMs`？
- `write` 消费哪条 `ctx.*` seam？`fs/write-intent` 与 `dsh-fs-observation-policy` 怎样做成 read-before-write？
- 四个 shipped preset 谁装 `@deepseek-ai/dsh-tool-fs`？`minimal` 用什么替代？
- 一次 `write` 从 `tools/pre-execute` 走到 `writeText` 的编号步骤里，approval / sandbox / observation 各挂在哪？

## Identity

模型看见的工具名是 **`write`**，写在 `defineTool({ name: 'write' })`。[E: packages/fs/tool-fs/src/write.ts:70] Cordis 插件名是 **`tool-fs`**，实现包是 **`@deepseek-ai/dsh-tool-fs`**。[E: packages/fs/tool-fs/src/index.ts:19][E: packages/fs/tool-fs/package.json:2]

`export const inject = ['tools', 'fs', 'systemPrompt']`：没有挂上 `ctx.fs` 时插件保持 pending，catalog 里不会出现 `write`。[E: packages/fs/tool-fs/src/index.ts:22][E: packages/fs/tool-fs/tests/tools.spec.ts:182] `read_image` 另走 `ctx.inject(['attachments'])`，与 `write` 无关；`apply()` 在 attachments 条件块之后无条件调用 `applyWriteTool(ctx, sandbox)`。[E: packages/fs/tool-fs/src/index.ts:77]

工厂是 `applyWriteTool`：先挂 system-prompt section `tool:write`（`order: 101`），再 `ctx.tools.register(defineTool({...}))`。[E: packages/fs/tool-fs/src/write.ts:64][E: packages/fs/tool-fs/src/write.ts:69] 同一 `apply()` 还构造 **一份** `FsSandboxController`，供 `write` 与 `edit` 共用 escalation 广告 / 决议 / denial 映射。[E: packages/fs/tool-fs/src/index.ts:76]

注册测试钉死默认 boot 后的 schema 名为 `edit` / `read` / `write`。[E: packages/fs/tool-fs/tests/tools.spec.ts:156]

## 用途定位

`write` 的 description 是 `Create or fully replace a UTF-8 text file.`[E: packages/fs/tool-fs/src/write.ts:71] 语义是整文件 **create 或 overwrite**：不存在则创建，存在则用本次 `content` 整份替换。prompt section 明确要求先 `read` 已有文件（默认 `dsh-fs-observation-policy` 会强制），局部改动优先 `edit`。[E: packages/fs/tool-fs/src/write.ts:66]

`write` **不是** patch 方言，也不是 `old_string`/`new_string` 字面替换。Codex `apply_patch`、Claude `Edit`、Pi `edit` 走各自的 hunk / 替换协议；DSH shipped 产品没有 `apply_patch` 工具，整文件写就是本页的 `write`，定点替换是 sibling [`edit`](edit.md)。

`minimal` preset 不装 `@deepseek-ai/dsh-tool-fs`，因此默认 catalog 里没有 `write`；该 preset 用 `str_replace_editor` 覆盖文件编辑（见 Preset 装配）。

## 输入 schema

以插件 **默认 `Config`** boot 后的 schema 为准。`tool-fs` 的 `Config` 只有 `readLimit` / `readMaxLineLength` / `readMaxBytes` / `readStreamMinSize`，**不改** `write` 的参数名或字段集。[E: packages/fs/tool-fs/src/index.ts:36] 会改广告字段的是 **`ctx.fs.sandboxMode`**：confining backend（`sandboxMode !== undefined`）才把 escalation 两字段 spread 进 `parameters`。[E: packages/fs/tool-fs/src/write.ts:75][E: packages/fs/tool-fs/src/sandbox.ts:45]

| 字段 | 类型 | 必填 | 默认 | 约束 | 说明 |
|---|---|---:|---|---|---|
| `file_path` | `string` | 是 | 无 | schema `required: true`；`parseWriteArgs` 再拒 `trim()` 后空串 | 后端 `ctx.fs.resolve` 解析的目标路径，相对路径相对 session cwd（或 sandbox policy 的 `workspaceRoot`）。[E: packages/fs/tool-fs/src/write.ts:73][E: packages/fs/tool-fs/src/write.ts:26] |
| `content` | `string` | 是 | 无 | 键必须在；空串 `""` 合法 | 要写入的完整 UTF-8 文本。`parseWriteArgs` 对 `content` 原样透传，不查非空。[E: packages/fs/tool-fs/src/write.ts:74][E: packages/fs/tool-fs/src/write.ts:27] |
| `sandbox_permissions` | `string` | 否 | 不广告则字段不存在 | 仅 confining `ctx.fs` 时进入 schema；`enum` = `ESCALATION_TARGETS`（`workspace-write`、`danger-full-access`） | 一次性加宽 sandbox 的目标 mode。必须与 `justification` 成对；execute 时还要 **严格宽于** 当前有效 mode。[E: packages/fs/tool-fs/src/sandbox.ts:61][E: packages/sandbox/sandbox/src/escalation.ts:41] |
| `justification` | `string` | 否 | 不广告则字段不存在 | 与 `sandbox_permissions` 成对；trim 后非空 | 给用户看的一句理由，进入 `ctx.approval.request` 的 `reason`。[E: packages/fs/tool-fs/src/sandbox.ts:67] |

非 confining backend（基类 `FileSystem.sandboxMode` 默认 `undefined`；`dsh-fs-local` 源码里没有覆盖该 getter [I]）时，schema **没有** 这两字段。[E: packages/fs/fs/src/index.ts:103][E: packages/fs/tool-fs/tests/tools.spec.ts:834] confining 时测试钉死 `sandbox_permissions.enum === ['workspace-write', 'danger-full-access']`。[E: packages/fs/tool-fs/tests/tools.spec.ts:843]

未广告字段若仍被塞进 arguments（例如测试直接 `execute`），`resolvePolicy` 在 `escalationModes.length === 0` 时抛 `sandbox_permissions is not available in this composition`。[E: packages/fs/tool-fs/src/sandbox.ts:94] 只给其中一个 escalation 字段会在 `validateEscalationArgs` 失败。[E: packages/sandbox/sandbox/src/escalation.ts:52]

## 输出 & 截断 / spill

`write` **没有** 自己的 spill、`maxOutputChars` 或输出截断。`defineTool` 未传 `timeoutMs`。[I] registry 对未声明者不定工具级截止；取消只靠 `exec.signal` 传到 `resolve` / `writeText` / escalation。

成功时 canonical `value` 是 `{ path, operation, before, after }`：`operation` ∈ `create` | `update`；`before` 为写入前文本或 `null`；`after` 为写入后 LF-normalized 文本。[E: packages/fs/tool-fs/src/write.ts:82][E: packages/fs/tool-fs/src/write.ts:123] 模型看见的 **不是** 这份 `after`，而是 `output.render` → `formatWriteOutput` 的短 envelope：`<path>…</path>` / `<type>file</type>` / `<content>Created file` 或 `Updated file`。envelope **不回显** 文件正文。[E: packages/fs/tool-fs/src/write.ts:37][E: packages/fs/tool-fs/src/write.ts:94]

`presentationMeta` 在 `before !== null` 时用 `computeHunkDiffs` 挂 `meta.diffs`（每 hunk `DIFF_CONTEXT = 3` 行上下文）；create 或相同内容覆盖时 diffs 为空数组，`presentResult` 回退到 `oldText: null` 的整文件 diff 卡，避免完成态把 pending diff 换成 envelope 文本。[E: packages/fs/tool-fs/src/write.ts:96][E: packages/fs/tool-fs/src/diff.ts:11][E: packages/fs/tool-fs/tests/tools.spec.ts:648] `presentCall` 始终是 `card: 'diff'`、`oldText: null`、`newText: args.content`。[E: packages/fs/tool-fs/src/write.ts:136]

provider 侧 `before` 可能为 `null`：create、或旧文件 / 新 `content` 触及 `diffBasisMaxBytes`（local backend 的展示上限，不是模型输出 cap）。[E: packages/fs/fs-local/src/index.ts:197][E: packages/fs/fs/src/types.ts:141]

失败走 `isError`。`FS_STALE_VERSION` / `FS_NOT_OBSERVED` 在模型边界被 `remediateFsError` 追加 `— re-read the file, then retry` / `— read the file, then retry`，**保留** 原 `FsError` code。[E: packages/fs/tool-fs/src/error.ts:15][E: packages/fs/tool-fs/src/error.ts:33] `FS_SANDBOX_DENIED` 先被 `FsSandboxController.mapError` 换成共享 `[sandbox: file access denied under <mode> mode]` + `escalationHintMarker('operation')`。[E: packages/fs/tool-fs/src/sandbox.ts:129][E: packages/sandbox/sandbox/src/escalation.ts:72]

## 背后的 seam

三角角色：

| 角色 | 实体 | 位置 |
|---|---|---|
| Definition | `ctx.fs: FileSystem`，事件 `fs/write-intent` / `fs/observed` | `@deepseek-ai/dsh-fs` [E: packages/fs/fs/src/index.ts:46][E: packages/fs/fs/src/index.ts:58] |
| Provider | 默认产品是 `@deepseek-ai/dsh-fs-sandbox`（`SandboxedFileSystem` 继承 `LocalFileSystem`，只在 mutation 上加 fence）；`minimal` 在 `isolate.fs` 里改挂 `@deepseek-ai/dsh-fs-local` | [E: packages/bundle/base/cordis.patch.yml:443][E: packages/fs/fs-sandbox/src/index.ts:84][E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:55] |
| Consumer | `@deepseek-ai/dsh-tool-fs` 的 `applyWriteTool` | [E: packages/fs/tool-fs/src/write.ts:114] |
| Policy（可选） | `@deepseek-ai/dsh-fs-observation-policy`：无 service API，只占 `fs/write-intent` 单槽并听 `fs/observed` | [E: packages/fs/fs-observation-policy/src/index.ts:119][E: packages/bundle/base/cordis.patch.yml:222] |

换掉 `ctx.fs` provider 会带走：路径 identity / `displayPath`、原子 create-or-overwrite、`FsWriteIntent` 的 CAS 语义、以及（sandbox provider）`sandboxMode` 与 `FS_SANDBOX_DENIED` fence。工具层不 stat、不自己写盘。[E: packages/fs/tool-fs/tests/integration.spec.ts:369]

换掉或卸掉 observation policy，waterfall 默认 thunk 返回 `undefined`，`writeText` 变成无条件 create-or-overwrite。[E: packages/fs/tool-fs/src/write.ts:111][E: packages/fs/tool-fs/tests/integration.spec.ts:338]

escalation 还消费 `ctx.sandboxPolicy`（confining 时构造 `FsSandboxController` 必有，否则 load 失败）和 `ctx.get('approval')`（只在调用带齐 escalation 字段时）。[E: packages/fs/tool-fs/src/sandbox.ts:48][E: packages/fs/tool-fs/src/sandbox.ts:100]

相对路径的 cwd：`sessionResolveOptions` 优先 `sandboxPolicy.workspaceRoot`，否则 `exec.agent.session.header.cwd`；无 agent 则不传 cwd，留给 provider 自己的默认。[E: packages/fs/tool-fs/src/session-cwd.ts:41]

## 执行管线

`write` 没有自己的 `tools/pre-execute` / `tools/post-execute` 监听器，也不在 `defineTool` 上声明 `timeoutMs` 或 `isConcurrencySafe`。一次调用仍走 registry 的通用三段 waterfall：

1. **`tools/pre-execute`**：默认 thunk 是 `{ kind: 'allow' }`。没有监听器 `ask` 时，**不会**为普通 `write` 弹用户审批。[E: packages/core/tools/src/index.ts:152][E: packages/core/tools/src/index.ts:1476]
2. **`tools/execute`**：around-dispatch 之后 `dispatchToolBody` 调 `tool.execute`（即 `applyWriteTool` 里的 body）。[E: packages/core/tools/src/index.ts:163][E: packages/core/tools/src/index.ts:1549]
3. **`tools/post-execute`**：成功 / 工具抛错都会进入；`write` 不在这里改结果。[E: packages/core/tools/src/index.ts:175]

**approval 挂点**：不在 pre-execute，而在 execute body 开头的 `sandbox.resolvePolicy('write', args, exec)`。只有 `sandbox_permissions` **和** `justification` 都在时才 `approveEscalation`；grant 必须是 `allowed-once`，否则 throw，**尚未**调用 `writeText`。[E: packages/fs/tool-fs/src/write.ts:107][E: packages/fs/tool-fs/src/sandbox.ts:97][E: packages/sandbox/sandbox/src/escalation.ts:183]

**sandbox 挂点**：policy 作为最后一参传入 `ctx.fs.writeText`。`SandboxedFileSystem.writeText` 先 `checkedTarget`：`read-only` 立即 `FS_SANDBOX_DENIED`；`workspace-write` 按 `writableRoots` 做 containment；`danger-full-access` 不围栏。fence 失败不静默改走裸写。[E: packages/fs/fs-sandbox/src/index.ts:91][E: packages/fs/fs-sandbox/src/index.ts:131]

**timeout**：无工具级 `timeoutMs`。body 把 `exec.signal` 传给 `ctx.fs.resolve` 与 `writeText`。[E: packages/fs/tool-fs/src/write.ts:108][E: packages/core/tools/src/schema.ts:584]

**调度**：未声明 `isConcurrencySafe` 时 `executionMode` 为 `{ kind: 'exclusive' }`；测试钉死 `write` exclusive（`read` 才是 parallel）。[E: packages/core/tools/src/index.ts:1278][E: packages/fs/tool-fs/tests/tools.spec.ts:164]

## Preset 装配

成员资格只认 `apps/cli/config/agent-presets/{minimal,standard,code,cordis}/agent.cordis.yml`。`dsh-web-app` 把 host 面 base 里的 `tool-fs` 标 `disabled: true`，避免和 preset 面重复注册；web 会话里 `write` 是否出现，看 preset 是否再挂上该包。[E: packages/bundle/web-app/cordis.patch.yml:312][E: packages/bundle/web-app/cordis.patch.yml:313][E: packages/bundle/base/cordis.patch.yml:225]

| preset | 装 `@deepseek-ai/dsh-tool-fs`？ | `disabled` | isolate | 证据 |
|---|---|---|---|---|
| `minimal` | **否**。装的是 isolate 域里的 `@deepseek-ai/dsh-tool-str-replace-editor` | 无 tool-fs 行 | `isolate.fs: true`（`fs-local` + editor） | [E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:52][E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:60] |
| `standard` | 是 | 无 | 无（注册进 host `tools`，`fs` / policy 留在 host） | [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:57] |
| `code` | 是（standard 同款工具行 + Code Mode 呈现） | 无 | 无 | [E: apps/cli/config/agent-presets/code/agent.cordis.yml:64] |
| `cordis` | 是 | 无 | 无 | [E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:58] |

`standard` / `code` / `cordis` 的 `tool-fs` 行没有 `config`，因此走包内默认 `Config`（只影响 `read` 上限）。observation policy 与 `fs-sandbox` 是 host 面 base 行，不是这四份 yml 里的工具字段。[E: packages/bundle/base/cordis.patch.yml:222][E: packages/bundle/base/cordis.patch.yml:443]

## execute() 走读

`applyWriteTool` 的 `execute` 按下面编号走。每步都在 `writeText` 之前或之中，除第 7–8 步。

1. **`parseWriteArgs(args)`** — 只强制 `file_path.trim()` 非空；`content` 原样进入 `{ filePath, content }`。空白路径变成 `isError` 文本 `file_path must be a non-empty string`。[E: packages/fs/tool-fs/src/write.ts:103][E: packages/fs/tool-fs/src/write.ts:26][E: packages/fs/tool-fs/tests/tools.spec.ts:409]

2. **`sandbox.resolvePolicy('write', args, exec)`** — 先 `validateEscalationArgs`。缺任一 escalation 字段则返回 session 的 standing policy（再带 session cwd 作 `workspaceRoot`）。两字段齐全则 `approveEscalation`；非 grant 在此 throw，`writeText` 不会跑。[E: packages/fs/tool-fs/src/write.ts:107][E: packages/fs/tool-fs/src/sandbox.ts:88][E: packages/fs/tool-fs/tests/tools.spec.ts:906]

3. **`ctx.fs.resolve(filePath, sessionResolveOptions(...))`** — 相对路径相对 `policy.workspaceRoot ?? session.header.cwd`。工具层不 `stat`。[E: packages/fs/tool-fs/src/write.ts:108][E: packages/fs/tool-fs/src/session-cwd.ts:41]

4. **`ctx.waterfall('fs/write-intent', target, exec, () => undefined)`** — 单槽决策。默认 thunk 是 `undefined`（无条件写）。`dsh-fs-observation-policy` 的监听器 **不** `next()`：无 owner / 未见 / 已确认 absent → `{ kind: 'createIfAbsent' }`；已确认 present → `{ kind: 'replaceIfVersion', version }`。[E: packages/fs/tool-fs/src/write.ts:111][E: packages/fs/fs-observation-policy/src/index.ts:69][E: packages/fs/fs-observation-policy/tests/policy.spec.ts:50]

5. **`ctx.fs.writeText(target, content, intent, exec.signal, sandboxPolicy)`** — 仍不 stat。local provider 在锁内：`replaceIfVersion` 缺失或 version 不符 → `FS_STALE_VERSION`；`createIfAbsent` 且目标已存在 → `FS_NOT_OBSERVED`（`cannot overwrite existing "…" without reading it first`）；无 intent 则原子覆盖。[E: packages/fs/tool-fs/src/write.ts:114][E: packages/fs/fs-local/src/index.ts:182][E: packages/fs/fs-local/src/index.ts:186] sandbox provider 在委托前先 `checkedTarget`。[E: packages/fs/fs-sandbox/src/index.ts:91]

6. **catch** — `throw remediateFsError(sandbox.mapError(error, sandboxPolicy))`。sandbox denial 先改成共享 marker + operation 升级 hint；再给 stale / not-observed 追加 remedy。[E: packages/fs/tool-fs/src/write.ts:119][E: packages/fs/tool-fs/tests/tools.spec.ts:418][E: packages/fs/tool-fs/tests/tools.spec.ts:865]

7. **`ctx.emit('fs/observed', target, { kind: 'present', version: outcome.version }, exec)`** — 成功后记下新 version。policy 用它授权同 session 的下一次 `edit`/`write`，不必再 `read`。emit 不 await；抛错的 listener **回滚不了** 已经提交的写，只会把这次 tool result 变成 `isError`。[E: packages/fs/tool-fs/src/write.ts:122][E: packages/fs/fs-observation-policy/src/index.ts:127]

8. **return** `{ path: target.displayPath, operation, before, after }`，由 registry `render` 成 Created/Updated envelope。[E: packages/fs/tool-fs/src/write.ts:124][E: packages/fs/tool-fs/tests/tools.spec.ts:400]

默认带 policy 的集成测试：未 `read` 就覆盖已有文件 → `FS_NOT_OBSERVED`，磁盘不变；`read` 之后允许覆盖；读后被外部改写 → `FS_STALE_VERSION`，再 `read` 可恢复。[E: packages/fs/tool-fs/tests/integration.spec.ts:73][E: packages/fs/tool-fs/tests/integration.spec.ts:83][E: packages/fs/tool-fs/tests/integration.spec.ts:94] 卸掉 policy 后，未读覆盖成功。[E: packages/fs/tool-fs/tests/integration.spec.ts:338]

## 设计动机·edge

- **没有 `apply_patch`**。整文件替换是 `write`；定点字面替换是 `edit`。和 Codex `apply_patch`、Claude `Edit`、Pi `edit` 的差异就是：DSH 这一支不解析 patch，只把 `content` 交给 `writeText`。
- **read-before-write 不进 schema**。默认产品靠 host 面 `dsh-fs-observation-policy` 填 `FsWriteIntent`；卸掉插件后工具 API 不变，行为变成无条件覆盖。[E: packages/fs/fs-observation-policy/src/index.ts:65]
- **空 `content` 写出空文件**。`parseWriteArgs` 只拦空 `file_path`。[E: packages/fs/tool-fs/src/write.ts:27]
- **工具层零 stat**。freshness / no-clobber 是 provider 在 mutation 临界区里做的。[E: packages/fs/tool-fs/tests/integration.spec.ts:369]
- **无 session owner 的调用永远 `createIfAbsent`**，因此不能通过 gate 覆盖已有文件。[E: packages/fs/fs-observation-policy/src/index.ts:70][E: packages/fs/fs-observation-policy/tests/policy.spec.ts:55]
- **escalation 与 bash 共用词汇**（`ESCALATION_TARGETS`、`[sandbox: …]`、`allowed-once`），subject 名词是 `operation` 不是 `command`。[E: packages/sandbox/sandbox/src/escalation.ts:85]
- **confining 但缺少 `ctx.sandboxPolicy` 会在 load 时 throw**，不会带着残缺 schema 跑。[E: packages/fs/tool-fs/src/sandbox.ts:48]
- **成功 `write` 会刷新 observation**，因此 `write` → `edit` 中间不必再 `read`。[E: packages/fs/tool-fs/tests/integration.spec.ts:218]
- **`write` exclusive**，不能和 sibling 并行；避免两个整文件写交错覆盖同一 target 时只靠 provider 锁兜底调度。[E: packages/fs/tool-fs/tests/tools.spec.ts:164]

## Sources

- packages/fs/tool-fs/src/index.ts
- packages/fs/tool-fs/src/write.ts
- packages/fs/tool-fs/src/sandbox.ts
- packages/fs/tool-fs/src/error.ts
- packages/fs/tool-fs/src/session-cwd.ts
- packages/fs/tool-fs/src/diff.ts
- packages/fs/tool-fs/package.json
- packages/fs/fs/src/index.ts
- packages/fs/fs/src/types.ts
- packages/fs/fs-local/src/index.ts
- packages/fs/fs-sandbox/src/index.ts
- packages/fs/fs-observation-policy/src/index.ts
- packages/fs/fs-observation-policy/tests/policy.spec.ts
- packages/fs/tool-fs/tests/tools.spec.ts
- packages/fs/tool-fs/tests/integration.spec.ts
- packages/fs/tool-fs/tests/error.spec.ts
- packages/core/tools/src/index.ts
- packages/core/tools/src/schema.ts
- packages/sandbox/sandbox/src/escalation.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/web-app/cordis.patch.yml
- apps/cli/config/agent-presets/minimal/agent.cordis.yml
- apps/cli/config/agent-presets/standard/agent.cordis.yml
- apps/cli/config/agent-presets/code/agent.cordis.yml
- apps/cli/config/agent-presets/cordis/agent.cordis.yml

## 相关

- [工具调用解剖](../../spine/tool-call-anatomy.md) — `tools/pre-execute → execute → post-execute` 与 registry 调度。
- [模型可见工具目录](../../reference/tools-catalog.md) — `write` 在 catalog 中的位置。
- [read 读文件](read.md) — 同包 `dsh-tool-fs`；observation 的主要写入方。
- [edit 字符串替换](edit.md) — 同包定点替换；共享 `FsSandboxController` 与 observation gate。
- [str_replace_editor](str-replace-editor.md) — `minimal` 用来替代 `read`/`write`/`edit` 的 Anthropic 风格编辑器。
- [fs 服务缝](../../subsystems/execution/fs.md) — `ctx.fs` Definition / `writeText` / `FsWriteIntent`。
