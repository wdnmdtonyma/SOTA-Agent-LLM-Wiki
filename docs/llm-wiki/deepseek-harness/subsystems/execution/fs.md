---
id: subsys.execution.fs
title: fs 服务缝
kind: subsystem
tier: T2
pkg: execution
source:
  - packages/fs/fs/src/index.ts
  - packages/fs/fs/src/types.ts
  - packages/fs/fs/src/invariant.ts
  - packages/fs/fs/package.json
  - packages/fs/fs/tests/service.spec.ts
  - packages/fs/tool-fs/src/index.ts
  - packages/fs/tool-fs/src/write.ts
  - packages/fs/tool-fs/src/edit.ts
  - packages/fs/tool-fs/src/read.ts
  - packages/fs/tool-fs/src/read-target.ts
  - packages/fs/tool-fs/src/sandbox.ts
  - packages/sandbox/sandbox/src/escalation.ts
  - packages/fs/tool-fs/tests/tools.spec.ts
  - packages/fs/tool-fs-search/src/index.ts
  - packages/fs/tool-str-replace-editor/src/index.ts
  - packages/fs/fs-local/src/index.ts
  - packages/fs/fs-sandbox/src/index.ts
  - packages/fs/fs-observation-policy/src/index.ts
  - packages/lsp/lsp-stdio/src/index.ts
  - packages/context/agent-instructions/src/index.ts
  - packages/context/agent-instructions/tests/agent-instructions.spec.ts
  - packages/skill/skill-filesystem/src/index.ts
  - packages/e2b/fs-e2b/src/index.ts
  - packages/shell/bash-local/src/index.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/base/package.json
  - packages/bundle/web-app/cordis.patch.yml
  - apps/cli/config/agent-presets/standard/agent.cordis.yml
  - apps/cli/config/agent-presets/minimal/agent.cordis.yml
  - vendor/cordis/src/service.ts
  - vendor/cordis/src/events.ts
symbols:
  - ctx.fs
  - FileSystem
  - FsTarget
  - FsVersion
related:
  - spine.overview
  - spine.capability-seams
  - subsys.execution.fs-local
  - subsys.execution.fs-sandbox
  - subsys.execution.fs-observation
  - spine.tool-call-anatomy
  - subsys.execution.subprocess
  - subsys.execution.sandbox
  - subsys.execution.e2b
  - subsys.composition.bundle-base
  - subsys.composition.bundle-web-app
  - subsys.core.tools
  - surface.tools.read
  - surface.tools.write
  - surface.tools.edit
  - surface.tools.glob
  - surface.tools.grep
  - surface.tools.str-replace-editor
  - surface.presets.minimal
  - surface.misc.security
evidence: explicit
status: verified
updated: 47f943859b
---

> `@deepseek-ai/dsh-fs` 的 `FileSystem` 是 **host 面** filesystem capability 的 **Definition**：抽象类构造里 `super(ctx, 'fs')` 把自身登记为 Cordis service `ctx.fs`，augmentation 声明 `Context.fs` 与三个事件 `fs/write-intent` / `fs/edit-intent`（waterfall）/ `fs/observed`（emit）。本包是 TypeScript 库，不是 shipped Loader 行；默认 Provider 是 `dsh-base` 的 `id: fs-sandbox`。模型面主 Consumer 是 `dsh-tool-fs`（`inject = ['tools', 'fs', 'systemPrompt']`）。

## 能回答的问题

- `ctx.fs` 由哪个包声明、哪个插件 `provide`、哪个插件 `inject`？`@deepseek-ai/dsh-fs` 自己是不是 `dsh-base` 的一行？
- `FsTarget.targetKey` 能不能当本地绝对路径解析？`processPath` / `fileUrl` / `contains` 各自给谁用？
- `writeText` / `editText` 的 `expected` 与最后一参 `sandboxPolicy` 分别谁读？裸 backend 与 `fs-sandbox` 差在哪一层？
- `fs/write-intent` 的 listener 不调用 `next()` 会怎样？`fs-observation-policy` 是不是第二份 `ctx.fs` Provider？
- `glob` / `grep` 走不走 `ctx.fs`？只换 `ctx.fs` 会不会把 `bash -c` 搬到远程？
- host 上的 `fs-sandbox` 与 agent-preset 面上的 `tool-fs` / `minimal` 的 `isolate.fs` 怎么切？

## 职责边界

本包 `@deepseek-ai/dsh-fs` 拥有：`FileSystem` 抽象类与 `ctx.fs` 这个 service 名、`FsTarget` / `FsVersion` / `FsWriteIntent` / `FsObservation` / `FsError` 词汇、以及 `fs/write-intent` · `fs/edit-intent` · `fs/observed` 的事件形状。它**不**打开磁盘、**不**做 realpath、**不**执行围栏、**不**记观察、**不**注册模型可见工具。

明确不拥有：

- 本地原子写 / 按 `targetKey` 串行锁 / symlink 跟随：[`subsys.execution.fs-local`](fs-local.md)（`subsys.execution.fs-local`）。
- 对 `writeText` / `editText` 的 `SandboxMode` 围栏：[`subsys.execution.fs-sandbox`](fs-sandbox.md)（`subsys.execution.fs-sandbox`）。
- prior-observation 门（`createIfAbsent` / `replaceIfVersion` / `FS_NOT_OBSERVED`）：[`subsys.execution.fs-observation`](fs-observation.md)（`subsys.execution.fs-observation`）。
- `read` / `write` / `edit` / `read_image` 的 schema、行窗口、升权广告：[`surface.tools.read`](../../surface/tools/read.md) / [`surface.tools.write`](../../surface/tools/write.md) / [`surface.tools.edit`](../../surface/tools/edit.md)。本页不写字段表。
- `glob` / `grep`：它们 `inject` `subprocess`，**不**走 `ctx.fs`。[`surface.tools.glob`](../../surface/tools/glob.md) / [`surface.tools.grep`](../../surface/tools/grep.md) / [`subsys.execution.subprocess`](subprocess.md)。
- `SandboxMode` 词汇、`approveEscalation`、`writableRoots`：[`subsys.execution.sandbox`](sandbox.md)。沙箱只罩**文件副作用**；网络与进程可见性不在这个词汇里。
- 远程 one-world 的 `E2BFileSystem`：[`subsys.execution.e2b`](e2b.md)。
- `tools/pre-execute` 管线：[`subsys.core.tools`](../core/tools.md) / [`spine.tool-call-anatomy`](../../spine/tool-call-anatomy.md)。`FileSystem` **不**挂 pre-execute。

DSH 是 Cordis 组合运行时（`profile → bundle → agent preset`），不是「又一个内置了一堆文件工具的 coding agent」。`ctx.fs` 坐在 **host 面**（进程级，与 `ctx.sandbox` / `ctx.sandboxPolicy` / `ctx.subprocess` 同级）。**agent-preset 面**挂的是 `tool-fs` 这类 Consumer（只 `register` 进 host 的 `ctx.tools`），或 `minimal` 那种必须 `isolate.fs` 的 per-session Provider。默认产品路径是 `dsh web`（本地 Web GUI）；本仓没有 shipped TUI。浏览器 client 不实现 `FileSystem`。

`ctx.fs` 与 `ctx.subprocess` **没有运行时耦合**。`LocalBashExecutor` 的 `inject` 只有 `subprocess`，不读 `ctx.fs`。[E: packages/shell/bash-local/src/index.ts:103] `glob` / `grep` 同样只 `inject` `subprocess`。[E: packages/fs/tool-fs-search/src/index.ts:70] 只换 `ctx.fs` 不会把 `bash -c` 或 ripgrep 搬到远程。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/fs/fs/src/index.ts` | `FileSystem` Definition：`super(ctx, 'fs')`、原语、`sandboxMode`、三个事件 |
| `packages/fs/fs/src/types.ts` | `FsTarget` / `FsVersion` / `FsWriteIntent` / `FsError` 词汇 |
| `packages/fs/fs/src/invariant.ts` | companion：校验 `fs/*` 事件的 `targetKey` / `displayPath` / observation |
| `packages/fs/fs/tests/service.spec.ts` | 登记、duplicate-service、dispose、基类 `sandboxMode === undefined` |
| `packages/fs/tool-fs/src/index.ts` | 主 Consumer：`inject = ['tools', 'fs', 'systemPrompt']` |
| `packages/fs/tool-fs/src/write.ts` | `waterfall('fs/write-intent')` → `ctx.fs.writeText` → `emit('fs/observed')` |
| `packages/fs/tool-fs/src/edit.ts` | 对称的 `fs/edit-intent` → `editText` |
| `packages/fs/fs-sandbox/src/index.ts` | 默认 host Provider：`SandboxedFileSystem extends LocalFileSystem` |
| `packages/fs/fs-local/src/index.ts` | 裸 local Provider：`writeText` 签名止于 `signal` |
| `packages/fs/fs-observation-policy/src/index.ts` | 占 intent 槽的政策插件；不 `inject`、不 `provide` |
| `packages/fs/tool-fs-search/src/index.ts` | `glob`/`grep`：`inject` 含 `subprocess`，不含 `fs` |
| `packages/bundle/base/cordis.patch.yml` | host 真树：`id: fs-sandbox`、`id: fs-observation-policy`、`id: tool-fs` |
| `packages/bundle/web-app/cordis.patch.yml` | 把 `tool-fs` / `tool-fs-search` `disabled: true`；Provider 留在 host |
| `apps/cli/config/agent-presets/standard/agent.cordis.yml` | Web 默认 preset 按会话挂回 `tool-fs` |
| `apps/cli/config/agent-presets/minimal/agent.cordis.yml` | `isolate.fs: true` + `dsh-fs-local` |
| `vendor/cordis/src/service.ts` | `Service` 构造 `ctx.reflect.provide(name, self)` |
| `vendor/cordis/src/events.ts` | waterfall 必须 `next()` 才会 `shift`；`emit` 不等待 promise |

## 数据模型

| 符号 | 落点 | 含义 |
|---|---|---|
| `FileSystem` | `packages/fs/fs/src/index.ts` | 抽象 `Service` 子类。构造只做 `super(ctx, 'fs')`，把 `this` 提供为 `ctx.fs`。[E: packages/fs/fs/src/index.ts:86] [E: packages/fs/fs/src/index.ts:88] |
| `Context.fs` | Cordis augmentation | 类型面的 `ctx.fs: FileSystem`。[E: packages/fs/fs/src/index.ts:46] |
| `FsTarget` | `types.ts` | `{ targetKey, displayPath }`。`resolve()` 产出；其余原语吃它。[E: packages/fs/fs/src/types.ts:60] |
| `FsTargetKey` / `FsVersion` | branded string | 工厂是恒等函数。`targetKey` 给 stale guard 与查找；`FsVersion` 给 freshness。[E: packages/fs/fs/src/types.ts:16] [E: packages/fs/fs/src/types.ts:24] [E: packages/fs/fs/src/types.ts:43] |
| `FsWriteIntent` | 两臂联合 | `createIfAbsent` 或 `replaceIfVersion`。从 `writeText` **省略** intent 是无条件 create-or-overwrite，不是第三臂。[E: packages/fs/fs/src/types.ts:123] |
| `FsObservation` | 两臂联合 | `{ kind: 'present', version }` 或 `{ kind: 'absent' }`。[E: packages/fs/fs/src/types.ts:52] |
| `sandboxMode` | 实例 getter | 基类返回 `undefined`（不围栏）。sandboxing backend 覆盖为部署默认 `SandboxMode`。[E: packages/fs/fs/src/index.ts:104] [E: packages/fs/fs/tests/service.spec.ts:90] [E: packages/fs/fs-sandbox/src/index.ts:69] |
| `FsError` / `FsErrorCode` | `HarnessError` 子类 | 稳定 `code`（含 `FS_NOT_FOUND` / `FS_STALE_VERSION` / `FS_NOT_OBSERVED` / `FS_SANDBOX_DENIED` / `FS_TOO_LARGE` 等）。[E: packages/fs/fs/src/types.ts:196] |
| `fs/write-intent` | waterfall | `(target, actor, next) → Promise<FsWriteIntent \| undefined>`。[E: packages/fs/fs/src/index.ts:58] |
| `fs/edit-intent` | waterfall | `(target, actor, next) → Promise<{ version: FsVersion } \| undefined>`。[E: packages/fs/fs/src/index.ts:66] |
| `fs/observed` | emit | `(target, observation, actor) => void`。同步记录；返回的 promise 不被等待。[E: packages/fs/fs/src/index.ts:76] [E: vendor/cordis/src/events.ts:195] |

原语（全部是 `FileSystem` 上的 abstract / getter，实现在 Provider）：

| 成员 | 合同要点 |
|---|---|
| `resolve(path, opts?)` | 模型/插件路径 → 稳定 `FsTarget`。可做 I/O，故 async。[E: packages/fs/fs/src/index.ts:116] |
| `processPath(target)` | 该执行世界里 subprocess 能 `open` 的绝对路径。与 `targetKey` **分开**。[E: packages/fs/fs/src/index.ts:126] |
| `fileUrl(target)` | 该执行世界的 `file:` URI。 |
| `contains(parent, child)` | 规范包含测试；两边必须来自**同一个** Provider。 |
| `stat` / `lstat` | `stat` 吃 `FsTarget`，缺席返回 `undefined`。`lstat` 是**路径形**：不跟随最后一段 symlink，让 Consumer 在 `resolve` 跟随之前拒绝链接。 |
| `readText` / `streamText` | 整份 UTF-8 文本；backend 负责跨 chunk 解码与拒二进制。 |
| `readBytes(target, signal, maxBytes)` | 原始字节、不解码。超过 `maxBytes` 必须 `FS_TOO_LARGE`，禁止截断返回。 |
| `listDir` | 直接子项 + 廉价元数据 + 已 resolve 的 child `FsTarget`；不读文件内容。 |
| `writeText(..., expected?, signal?, sandboxPolicy?)` | 原子整文件写。省略 `expected` = 无条件覆盖。[E: packages/fs/fs/src/index.ts:227] |
| `editText(..., expected?, signal?, sandboxPolicy?)` | 原子字面替换。省略 `expected` = 无条件按当前内容匹配。version 检查必须在 match 之前，以免 stale 内容报成 `FS_EDIT_NOT_FOUND`。[E: packages/fs/fs/src/index.ts:248] |

`targetKey` 在类型上是 `Branded<'FsTargetKey'>`，runtime 仍是普通 string（工厂不做校验）。[E: packages/fs/fs/src/types.ts:25] 消费者要把路径交给另一条 OS capability 时走 `processPath`，不要把 `targetKey` 当本地路径再 `path.resolve`。[I] 本地 backend 的 `processPath` 恰好是 `String(target.targetKey)`，那是 realpath 实现的巧合，不是 Definition 合同。[E: packages/fs/fs-local/src/index.ts:114]

companion `@deepseek-ai/dsh-fs/invariant` 在 `internal/dispatch` 上检查三个 `fs/*` 事件的 `targetKey` / `displayPath` 非空，以及 `fs/observed` 的 `kind` / present `version`。[E: packages/fs/fs/src/invariant.ts:16] [E: packages/fs/fs/src/invariant.ts:23] 它 `inject = ['invariants']`，`apply` 调 `ctx.invariants.register`。[E: packages/fs/fs/src/invariant.ts:12] [E: packages/fs/fs/src/invariant.ts:48] `dsh-base` 没有 `invariants` Loader 行（见 [`subsys.composition.bundle-base`](../composition/bundle-base.md)）；本 companion **不是**默认产品树里的一条 `id`。

## 控制流

1. `FileSystem`@packages/fs/fs/src/index.ts 是 Definition，不是 shipped 插件行。子类（测试里的 `FakeFileSystem`、产品里的 `LocalFileSystem` / `SandboxedFileSystem`）被 `ctx.plugin` 时，`Service` 构造调用 `ctx.reflect.provide('fs', self)`，于是 `ctx.fs` 指向该实例。[E: packages/fs/fs/src/index.ts:88] [E: vendor/cordis/src/service.ts:57]

2. 同一 realm 再挂第二个 `FileSystem` 子类会抛（duplicate service）。提供 fiber `dispose` 之后 `ctx.fs` 变为 `undefined`。[E: packages/fs/fs/tests/service.spec.ts:100] [E: packages/fs/fs/tests/service.spec.ts:108]

3. **host 面默认 Provider。** `dsh-base` 挂的是 `id: fs-sandbox` / `name: '@deepseek-ai/dsh-fs-sandbox'`，不是 `@deepseek-ai/dsh-fs`，也不是 `id: fs-local`。[E: packages/bundle/base/cordis.patch.yml:443] [E: packages/bundle/base/cordis.patch.yml:444] `SandboxedFileSystem extends LocalFileSystem`，`static inject = ['sandboxPolicy']`，仍独占 `ctx.fs`。[E: packages/fs/fs-sandbox/src/index.ts:59] [E: packages/fs/fs-sandbox/src/index.ts:60] `dsh-base` 的 `package.json` 把 `@deepseek-ai/dsh-fs-local` 列为依赖，因为 sandbox 包装 **import** 它；那不是第二份 Provider 行。[E: packages/bundle/base/package.json:57] [E: packages/bundle/base/package.json:59]

4. 同一份 host insert 还挂 `id: fs-observation-policy`（政策，不是 Provider）和 `id: tool-fs`（模型面 Consumer）。[E: packages/bundle/base/cordis.patch.yml:221] [E: packages/bundle/base/cordis.patch.yml:224]

5. **agent-preset 面。** 默认安装是 `dsh web`。`dsh-web-app` 把 `tool-fs` / `tool-fs-search` 设 `disabled: true`。[E: packages/bundle/web-app/cordis.patch.yml:312] [E: packages/bundle/web-app/cordis.patch.yml:313] [E: packages/bundle/web-app/cordis.patch.yml:315] 该 patch **没有** `id: fs-sandbox` / `id: fs-observation-policy` 的 disable 行，这两条仍留在 host。[I] `standard` preset 再按会话挂回 `id: tool-fs` / `name: '@deepseek-ai/dsh-tool-fs'`（该行不 `provide`，不必 `isolate`）。[E: apps/cli/config/agent-presets/standard/agent.cordis.yml:56] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:57]

6. `minimal` preset 用 `isolate.fs: true` 的 `cordis:group` 再挂一份 `id: fs-local` / `@deepseek-ai/dsh-fs-local`，只挡住加入该 preset 的会话；host 上的 `fs-sandbox` 仍给别的会话。[E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:51] [E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:52] [E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:54] [E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:55] `minimal` 的 yml 没有 `id: tool-fs` 行 [I]，改挂同组里的 `str-replace-editor`（`inject = ['tools', 'fs']`）。[E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:59] [E: packages/fs/tool-str-replace-editor/src/index.ts:494]

7. 主 Consumer `apply`@packages/fs/tool-fs/src/index.ts 声明 `inject = ['tools', 'fs', 'systemPrompt']`。没有 `ctx.fs` 时插件 pending，`ctx.tools.schemas()` 为空。[E: packages/fs/tool-fs/src/index.ts:22] [E: packages/fs/tool-fs/tests/tools.spec.ts:182] `apply()` 用 `ctx.fs.sandboxMode` 构造一份 `FsSandboxController`：基类 `undefined` → 不广告升权字段；sandboxing backend 有默认 mode → 才去 `ctx.get('sandboxPolicy')`。[E: packages/fs/tool-fs/src/sandbox.ts:44] [E: packages/fs/tool-fs/src/sandbox.ts:45]

8. **一次 `write`（`edit` 对称）。** `applyWriteTool` 的 `execute`：先 `sandbox.resolvePolicy`（内部在已有 `sandbox_permissions` 时调 `approveEscalation`；`allowed-once` 才返回加宽 mode）→ `ctx.fs.resolve` → `ctx.waterfall('fs/write-intent', target, exec, () => undefined)` → `ctx.fs.writeText(target, content, intent, exec.signal, sandboxPolicy)` → `ctx.emit('fs/observed', target, { kind: 'present', version }, exec)`。升权发生在 tool body，**不**挂 `tools/pre-execute`。[E: packages/fs/tool-fs/src/write.ts:107] [E: packages/fs/tool-fs/src/sandbox.ts:97] [E: packages/sandbox/sandbox/src/escalation.ts:183] [E: packages/fs/tool-fs/src/write.ts:108] [E: packages/fs/tool-fs/src/write.ts:111] [E: packages/fs/tool-fs/src/write.ts:114] [E: packages/fs/tool-fs/src/write.ts:122] `edit` 把 waterfall 换成 `fs/edit-intent`，mutation 换成 `editText`。[E: packages/fs/tool-fs/src/edit.ts:126] [E: packages/fs/tool-fs/src/edit.ts:127]

9. **waterfall 必须 `next()` 才会 `shift`。** `Events.waterfall` 把最后一个参数收成 `inner`，每次 `next()` 才 `cbs.shift() ?? inner`。[E: vendor/cordis/src/events.ts:236] [E: vendor/cordis/src/events.ts:238] tool 传入的 `inner` 是 `() => undefined`（无条件写/编）。没有 listener 时直接落到 `undefined`。第一个 listener 若不调用 `next()`，后续 listener 与 `inner` 都不会跑——这就是「单槽」的运行机制。Cordis **不**禁止注册第二个 listener；先注册且不 `next()` 的那个拥有决定。

10. `fs-observation-policy` 的 `apply(ctx)` **不**声明 `inject`、**不** `provide`。它占 `fs/write-intent` / `fs/edit-intent` 且不调用 `next()`。[E: packages/fs/fs-observation-policy/src/index.ts:106] [E: packages/fs/fs-observation-policy/src/index.ts:119] [E: packages/fs/fs-observation-policy/src/index.ts:122] 卸掉该插件，tool 的 `inner` 重新生效，Provider 回到无条件 write/edit。规则细节在 [`subsys.execution.fs-observation`](fs-observation.md)。

11. **读路径发观察，直调 `ctx.fs` 不发。** `resolveRegularReadTarget` 在 `stat === undefined` 时 `emit('fs/observed', …, { kind: 'absent' })` 再抛 `FS_NOT_FOUND`。[E: packages/fs/tool-fs/src/read-target.ts:27] 读成功后 `read` 再 `emit` present。[E: packages/fs/tool-fs/src/read.ts:162] `emit` 同步调用 listener，不等待返回的 promise。[E: vendor/cordis/src/events.ts:195] 插件外直接 `ctx.fs.readText` **不会**发出 `fs/observed`，后续受政策保护的 edit 会因未见而拒绝。[I]

12. **`sandboxPolicy` 最后一参。** Definition 把它标成可选；sandboxing backend 在 `writeText` / `editText` 里先 `checkedTarget`：`danger-full-access` 原样放行（不围栏），`read-only` 抛 `FS_SANDBOX_DENIED`，`workspace-write` 再 `resolve` 做 containment。[E: packages/fs/fs-sandbox/src/index.ts:91] [E: packages/fs/fs-sandbox/src/index.ts:129] [E: packages/fs/fs-sandbox/src/index.ts:131] **读全部放过**（`stat` / `readText` / `listDir` 不 override）。裸 `LocalFileSystem.writeText` 签名止于 `signal`，运行时忽略多传的第五参。[E: packages/fs/fs-local/src/index.ts:166] 围栏是可信代码里对模型控制路径的 policy check，不是 kernel 边界；进程围栏在 `ctx.shell` 调 `ctx.sandbox.confine`（[`subsys.execution.sandbox`](sandbox.md) / [`subsys.execution.bash-local`](bash-local.md)）。

13. **`glob` / `grep` 不走本缝。** `tool-fs-search` 的 `inject = ['tools', 'systemPrompt', 'subprocess']`，注释与代码都故意不含 `fs`。[E: packages/fs/tool-fs-search/src/index.ts:70] 换 `ctx.fs` 带不走它们。

14. 其它 Consumer（点到为止）：`lsp-stdio` `inject = ['fs', 'lsp', 'subprocess']`，每个 provider 持有 `ctx.fs`。[E: packages/lsp/lsp-stdio/src/index.ts:47] [E: packages/lsp/lsp-stdio/src/index.ts:154] `agent-instructions` **没有** static `inject`，用 `ctx.get('fs')`，缺 Provider 时该次 compose 直接 `return undefined`。[E: packages/context/agent-instructions/src/index.ts:116] [E: packages/context/agent-instructions/src/index.ts:117] [E: packages/context/agent-instructions/tests/agent-instructions.spec.ts:1000] `skill-filesystem` 同样 `ctx.get('fs')`；`fs !== undefined && !trustedHost` 才走缝，否则退回 host `readFile`。[E: packages/skill/skill-filesystem/src/index.ts:838] [E: packages/skill/skill-filesystem/src/index.ts:844] [E: packages/skill/skill-filesystem/src/index.ts:847] 远程替换是 `E2BFileSystem extends FileSystem` 且 `static inject = ['e2b']`，必须与 `subprocess-e2b` 成对换，细节在 [`subsys.execution.e2b`](e2b.md)。[E: packages/e2b/fs-e2b/src/index.ts:171] [E: packages/e2b/fs-e2b/src/index.ts:172]

## 设计动机

- **Definition / Provider / Consumer 拆开**，是为了换执行世界时不改模型工具。`tool-fs` 只认识 `ctx.fs` 与三个 `fs/*` 事件；把 `fs-sandbox` 换成 `fs-e2b`（或测试里的 `FakeFileSystem`）不必改 `write` 的 schema。
- **`FsTarget` 不透明**，是为了让 local realpath 与远程 file id 共用同一套 Consumer。执行世界里的绝对路径单独走 `processPath`，URI 走 `fileUrl`，包含关系走 `contains`，避免 Consumer 解析 `targetKey`。
- **`editText` 留在本缝**（而不是让 tool 先 `readText` 再 `writeText`），是为了让 version 检查、字面 match、rewrite 落在 Provider 的同一临界区。本地实现用 per-`targetKey` 锁串行化；Definition 只规定这组语义必须在一次 `editText` 里完成。
- **`sandboxPolicy` 做成 mutation 的最后一参**，是为了让同一个 Consumer 在裸 backend（忽略）与 sandboxing backend（围栏）上都能编译、都能跑。`sandboxMode` getter 则是 tool 层决定「要不要广告升权字段」的 capability fact。
- **观察是事件，不是第二份 `ctx.fs`。** 卸掉 `fs-observation-policy`，Provider 合同不变，只是 intent 槽回到 `undefined`。这与换 `SandboxedFileSystem` 是正交的两层。
- **发现工具不进本缝。** workspace `glob`/`grep` 是固定 argv 的 ripgrep 进程，世界跟着 `ctx.subprocess` 走。把它们做成 `FileSystem` 方法会在只换 fs、不换 subprocess 时制造假的 one-world。
- 相对 Codex：DSH 没有 first-class `apply_patch`；整文件写 / 字面替换是 `write` / `edit` 两个 Consumer，后端是这一条 `ctx.fs`。相对 Claude/Pi：本缝是可替换的 Cordis service，不是硬编码的 host `fs` 模块。相对 Codex 的 OS sandbox：本缝的围栏只罩文件 mutation，不宣称网络或进程隔离。

## Gotcha

- **同一 realm 只能一份 `ctx.fs`。** 再挂一个 `FileSystem` 子类会 duplicate-service 抛。要给某个 preset 另一份 fs，必须 `isolate.fs`（`minimal` 的做法），不能在 root 再插一行 `fs-local`。
- **`dsh-fs` 包本身不是 Loader 行。** 在 `cordis.patch.yml` 里找 `name: '@deepseek-ai/dsh-fs'` 会落空。搜 `id: fs-sandbox`。
- **「单槽」不是 Cordis 的 listener 数量上限。** 它是「第一个不 `next()` 的 listener 吃掉 `inner`」。更早 `prepend` 的决策器会赢过 `fs-observation-policy`。
- **`fs/observed` 在 mutation / 成功 read 之后才 `emit`。** listener 抛会变成该次 tool 的 `isError`，但写已经落盘。listener 必须同步且按合同不抛；返回 promise 没人 await。
- **直调 `ctx.fs` 不产生观察。** 测试夹具或 host 代码 `readText` 过的文件，对政策插件来说仍是未见。
- **`glob`/`grep` 与 `read`/`write` 可以分属两个世界。** 只换 `ctx.fs` 时，搜索仍在 host 的 `ctx.subprocess` 上跑 ripgrep。
- **`danger-full-access` 绕过围栏**（`checkedTarget` 直接 `return target`），不是换一种更松的 containment。`read-only` 拒绝一切 mutation，但读仍通。
- **升权在 tool body，不在 `tools/pre-execute`。** `sandbox_permissions` 只在 `ctx.fs.sandboxMode !== undefined` 时进入 schema；grant 只有 `allowed-once`。产品面入口见 [`surface.misc.security`](../../surface/misc/security.md)（该页在 index 里仍是 planned）。
- **`lstat` 与 `resolve` 对 symlink 的立场相反。** `resolve` 跟随以得到稳定身份；`lstat` 让信任边界在跟随之前拒绝路径本身。

## Seam 三角

| 角色 | 包 / 符号 | `ctx` 键或事件 | bundle / preset 行 |
|---|---|---|---|
| **Definition** | `@deepseek-ai/dsh-fs` · `FileSystem` | `ctx.fs`；声明 `fs/write-intent` · `fs/edit-intent` · `fs/observed` | **不是** Loader 行。库被 Provider import |
| **Provider（默认 host）** | `@deepseek-ai/dsh-fs-sandbox` · `SandboxedFileSystem` | 独占 `ctx.fs`；`inject = ['sandboxPolicy']` | `dsh-base` `id: fs-sandbox`。`dsh-web-app` **不** disable |
| **Provider（裸 local）** | `@deepseek-ai/dsh-fs-local` · `LocalFileSystem` | 同一 `ctx.fs` 键（与 sandbox 互斥） | **不**出现在 shipped `dsh-base` insert。`minimal` 在 `isolate.fs: true` 组内 `id: fs-local` |
| **Provider（远程，非默认）** | `@deepseek-ai/dsh-fs-e2b` · `E2BFileSystem` | `ctx.fs`；`inject = ['e2b']` | 例子 patch 关掉本地 fs 行再插入；必须与 `subprocess-e2b` 成对。见 [`subsys.execution.e2b`](e2b.md) |
| **Companion（不是 Provider）** | `@deepseek-ai/dsh-fs-observation-policy` · `apply(ctx)` | 占 `fs/write-intent` / `fs/edit-intent`（不 `next()`）；听 `fs/observed` | `dsh-base` `id: fs-observation-policy`。不 `inject`、不 `provide` |
| **Consumer（模型，默认 Web）** | `@deepseek-ai/dsh-tool-fs` | `inject = ['tools', 'fs', 'systemPrompt']` | `dsh-base` `id: tool-fs` → `dsh-web-app` `disabled: true` → `standard` / `code` / `cordis` preset 挂回 |
| **Consumer（模型，`minimal`）** | `@deepseek-ai/dsh-tool-str-replace-editor` | `inject = ['tools', 'fs']` | `minimal` 的 isolate 组；不装 `tool-fs` |
| **Consumer（发现）** | `@deepseek-ai/dsh-tool-fs-search` | **不** `inject` `fs`；`inject` `subprocess` | `id: tool-fs-search`。**不是**本缝 Consumer |
| **Consumer（LSP）** | `@deepseek-ai/dsh-lsp-stdio` | `inject = ['fs', 'lsp', 'subprocess']` | host 面；换 `ctx.fs` 会改它读源的世界 |
| **Consumer（可选读）** | `dsh-agent-instructions` / `dsh-skill-filesystem` | `ctx.get('fs')`，无 static `inject` | 缺 Provider 时 no-op / 退回 host `readFile` |

host 面 = 进程级 Provider + sandbox/policy + observation。agent-preset 面 = 每会话的 tool 行，以及必须带 `isolate` 才允许 publish 的 per-agent `ctx.fs`。client 面不持有这些键。

## Sources

- packages/fs/fs/src/index.ts
- packages/fs/fs/src/types.ts
- packages/fs/fs/src/invariant.ts
- packages/fs/fs/package.json
- packages/fs/fs/tests/service.spec.ts
- packages/fs/tool-fs/src/index.ts
- packages/fs/tool-fs/src/write.ts
- packages/fs/tool-fs/src/edit.ts
- packages/fs/tool-fs/src/read.ts
- packages/fs/tool-fs/src/read-target.ts
- packages/fs/tool-fs/src/sandbox.ts
- packages/sandbox/sandbox/src/escalation.ts
- packages/fs/tool-fs/tests/tools.spec.ts
- packages/fs/tool-fs-search/src/index.ts
- packages/fs/tool-str-replace-editor/src/index.ts
- packages/fs/fs-local/src/index.ts
- packages/fs/fs-sandbox/src/index.ts
- packages/fs/fs-observation-policy/src/index.ts
- packages/lsp/lsp-stdio/src/index.ts
- packages/context/agent-instructions/src/index.ts
- packages/context/agent-instructions/tests/agent-instructions.spec.ts
- packages/skill/skill-filesystem/src/index.ts
- packages/e2b/fs-e2b/src/index.ts
- packages/shell/bash-local/src/index.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/base/package.json
- packages/bundle/web-app/cordis.patch.yml
- apps/cli/config/agent-presets/standard/agent.cordis.yml
- apps/cli/config/agent-presets/minimal/agent.cordis.yml
- vendor/cordis/src/service.ts
- vendor/cordis/src/events.ts

## 相关

- [`spine.overview`](../../spine/overview.md) — 源码总览；host / preset / client 切面。
- [`spine.capability-seams`](../../spine/capability-seams.md) — Definition / Provider / Consumer 总机制；`ctx.fs` 与 `ctx.subprocess` 解耦。
- [`spine.tool-call-anatomy`](../../spine/tool-call-anatomy.md) — `tools/pre-execute → execute → post-execute`；本缝的围栏与升权不挂在 pre-execute。
- [`subsys.execution.fs-local`](fs-local.md) — 裸 `LocalFileSystem`：realpath `targetKey`、原子写、per-key 锁。
- [`subsys.execution.fs-sandbox`](fs-sandbox.md) — 默认 host Provider：只围栏 `writeText` / `editText`。
- [`subsys.execution.fs-observation`](fs-observation.md) — 占 intent 槽、不 `next()` 的观察政策。
- [`subsys.execution.subprocess`](subprocess.md) — `glob`/`grep` / Bash / PTY 真正吃的缝。
- [`subsys.execution.sandbox`](sandbox.md) — `SandboxMode`、`approveEscalation`、`writableRoots`。
- [`subsys.execution.e2b`](e2b.md) — 成对替换 `ctx.fs` + `ctx.subprocess` 的远程世界。
- [`subsys.composition.bundle-base`](../composition/bundle-base.md) — `id: fs-sandbox` 所在的 host insert。
- [`subsys.composition.bundle-web-app`](../composition/bundle-web-app.md) — disable 模型可见 `tool-fs` 行。
- [`subsys.core.tools`](../core/tools.md) — `ctx.tools` 注册表；`tool-fs` 把 `read`/`write`/`edit` `register` 进这里。
- [`surface.tools.read`](../../surface/tools/read.md) / [`surface.tools.write`](../../surface/tools/write.md) / [`surface.tools.edit`](../../surface/tools/edit.md) — 模型可见字段与 execute 走读。
- [`surface.tools.glob`](../../surface/tools/glob.md) / [`surface.tools.grep`](../../surface/tools/grep.md) — 不走 `ctx.fs` 的发现工具。
- [`surface.tools.str-replace-editor`](../../surface/tools/str-replace-editor.md) — `minimal` 用来替代 `tool-fs` 的 Consumer。
- [`surface.presets.minimal`](../../surface/presets/minimal.md) — `isolate.fs` + `dsh-fs-local`。
- [`surface.misc.security`](../../surface/misc/security.md) — 审批与沙箱产品面（index 里仍为 planned）。
