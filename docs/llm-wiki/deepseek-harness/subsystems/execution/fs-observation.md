---
id: subsys.execution.fs-observation
title: fs 观察策略
kind: subsystem
tier: T2
pkg: execution
source:
  - packages/fs/fs-observation-policy/src/index.ts
  - packages/fs/fs-observation-policy/src/types.ts
  - packages/fs/fs-observation-policy/tests/policy.spec.ts
  - packages/fs/fs/src/index.ts
  - packages/fs/fs/src/types.ts
  - packages/fs/tool-fs/src/index.ts
  - packages/fs/tool-fs/src/write.ts
  - packages/fs/tool-fs/src/edit.ts
  - packages/fs/tool-fs/src/read.ts
  - packages/fs/tool-fs/src/read-target.ts
  - packages/fs/tool-fs/src/read-image.ts
  - packages/fs/tool-fs/src/error.ts
  - packages/fs/tool-fs/tests/integration.spec.ts
  - packages/fs/fs-local/src/index.ts
  - packages/fs/tool-str-replace-editor/src/index.ts
  - packages/skill/skill-filesystem/src/index.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/web-app/cordis.patch.yml
  - apps/cli/config/agent-presets/standard/agent.cordis.yml
  - vendor/cordis/src/events.ts
symbols:
  - ObservedStateGate
  - apply
  - fs/write-intent
  - fs/edit-intent
  - fs/observed
related:
  - spine.overview
  - spine.capability-seams
  - subsys.execution.fs
  - surface.tools.write
  - surface.tools.edit
  - surface.tools.read
  - surface.tools.str-replace-editor
  - subsys.execution.fs-sandbox
  - subsys.composition.bundle-base
  - subsys.core.tools
evidence: explicit
status: verified
updated: 47f943859b
---

> `@deepseek-ai/dsh-fs-observation-policy` 是 **host 面**事件门，不是 `ctx.fs` Provider：`apply(ctx)` 不 `inject`、不 `provide`，只占 `fs/write-intent` / `fs/edit-intent` 单槽（不调用 `next()`）并同步记录 `fs/observed`。观察按 `actor.agent.session` 做 `WeakMap` 键；未见/confirmed absent 的 write 走 `createIfAbsent`，confirmed present 走 `replaceIfVersion`；edit 未见抛 `FS_NOT_OBSERVED`，confirmed absent 抛 `FS_NOT_FOUND`。卸掉插件，provider 回到无条件 mutation。不换 `ctx.fs`，也不改 `write` / `edit` schema。

## 能回答的问题

- `fs-observation-policy` 是不是一条新的 `ctx.*` Provider？它 `inject` / `provide` 了什么？
- `fs/write-intent` / `fs/edit-intent` 谁 `next()`？不调用时后注册的 listener 会不会跑？
- 未见、confirmed absent、confirmed present 分别把 write / edit 判成什么？`FS_NOT_OBSERVED` 和 `FS_STALE_VERSION` 谁抛？
- owner 从哪来？没有 `actor.agent.session` 的直调还能不能 overwrite / edit？
- `fs/observed` 为什么必须同步、不抛？emit 会不会等 listener 的 promise？
- `dsh-base` 哪一行挂它？`dsh-web-app` 关掉 `tool-fs` 时这行还在不在？

## 职责边界

本包 `@deepseek-ai/dsh-fs-observation-policy` 拥有：一次 `apply()` 里私有的 `ObservedStateGate`、三枚 `fs/*` listener、以及按 session owner 记的先验观察。`export const name = 'fs-observation-policy'`；入口是 `export function apply(ctx)`，没有 `inject` 数组，没有 `Config`。[E: packages/fs/fs-observation-policy/src/index.ts:98] [E: packages/fs/fs-observation-policy/src/index.ts:106] 空 Context 上 `ctx.plugin(FsPolicy)` 立刻挂上，listener 已能给无 owner 的 write 判 `createIfAbsent`。[E: packages/fs/fs-observation-policy/tests/policy.spec.ts:41] [E: packages/fs/fs-observation-policy/tests/policy.spec.ts:43] 测试断言不存在 `ctx.fsPolicy`。[E: packages/fs/fs-observation-policy/tests/policy.spec.ts:35]

本包**不**拥有：

- `ctx.fs` 的 Definition 与原语（`resolve` / `writeText` / `editText` / `FsTarget`）— [`subsys.execution.fs`](fs.md)（`subsys.execution.fs`）。
- 默认 host Provider。shipped `dsh-base` 的 `ctx.fs` 仍是 `id: fs-sandbox`，不是本插件。[E: packages/bundle/base/cordis.patch.yml:443]
- 原子发布与 `expected` 的磁盘侧 CAS（`createIfAbsent` 撞到已有文件、`replaceIfVersion` 版本漂移）— `LocalFileSystem.writeText` / `editText`，见 [`subsys.execution.fs-local`](fs-local.md)（`subsys.execution.fs-local`）。
- `write` / `edit` / `read` 的模型字段与 remedy 文案 — [`surface.tools.write`](../../surface/tools/write.md) / [`surface.tools.edit`](../../surface/tools/edit.md) / [`surface.tools.read`](../../surface/tools/read.md)。
- 文件副作用围栏（`read-only` / `workspace-write` / `danger-full-access`）— [`subsys.execution.fs-sandbox`](fs-sandbox.md)（`subsys.execution.fs-sandbox`）。沙箱罩 mutation 路径，不罩观察表。
- `tools/pre-execute` / `tools/execute` — [`subsys.core.tools`](../core/tools.md)（`subsys.core.tools`）。观察门挂在 tool body 里的 `fs/*` 事件，不挂 pre-execute。
- `glob` / `grep` / `bash`。它们吃 `ctx.subprocess`（Bash 还隔着 `ctx.shell`），不走 `ctx.fs`，本门看不见。

**host 面 vs agent-preset 面。** 本插件是进程级 host 行：`dsh-base` `id: fs-observation-policy`。[E: packages/bundle/base/cordis.patch.yml:221] [E: packages/bundle/base/cordis.patch.yml:222] `dsh-web-app` 把模型可见的 `tool-fs` `disabled: true`，改由 preset 按会话挂回；**没有** disable 本行，Provider / 本事件门留在 host。[E: packages/bundle/web-app/cordis.patch.yml:312] [E: packages/bundle/web-app/cordis.patch.yml:313] 默认产品路径是 `dsh web`（本地 Web GUI），本仓没有 shipped TUI。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/fs/fs-observation-policy/src/index.ts` | `ObservedStateGate` + `apply`：三枚 listener、teardown |
| `packages/fs/fs-observation-policy/src/types.ts` | `FsObservationActor`：只从 opaque actor 收窄 `agent.session` |
| `packages/fs/fs-observation-policy/tests/policy.spec.ts` | 无 I/O：决策、owner、单槽、disposal |
| `packages/fs/fs/src/index.ts` | Definition：声明三枚 `Events`（waterfall ×2 + emit） |
| `packages/fs/fs/src/types.ts` | `FsObservation` / `FsWriteIntent` / `FS_NOT_OBSERVED` |
| `packages/fs/tool-fs/src/write.ts` | Consumer：`waterfall('fs/write-intent')` 再 `writeText`，成功后 emit |
| `packages/fs/tool-fs/src/edit.ts` | Consumer：`waterfall('fs/edit-intent')` 再 `editText` |
| `packages/fs/tool-fs/src/read.ts` / `read-target.ts` / `read-image.ts` | 成功读 emit `present`；`stat` 未命中先 emit `absent` |
| `packages/fs/tool-fs/tests/integration.spec.ts` | 有 policy / 无 policy 两条部署；直接 `ctx.fs.readText` 不算观察 |
| `packages/fs/fs-local/src/index.ts` | Provider 执行 `expected`：磁盘侧 no-clobber / CAS |
| `packages/bundle/base/cordis.patch.yml` | host 真树：`id: fs-observation-policy` 与 `id: fs-sandbox` 并列 |
| `vendor/cordis/src/events.ts` | waterfall 必须 `next()` 才会 `shift`；`emit` 不等待 promise |

## 数据模型

| 符号 / 事件 | 落点 | 含义 |
|---|---|---|
| `ObservedStateGate` | `index.ts` 未导出 class | 每次 `apply()` `new` 一份；disposal 换掉内部 `WeakMap`。[E: packages/fs/fs-observation-policy/src/index.ts:21] [E: packages/fs/fs-observation-policy/src/index.ts:107] |
| `observed` | `WeakMap<object, Map<string, FsObservation>>` | 外键 = owner 对象身份（弱引用）；内键 = `FsTarget.targetKey`。无条目 = 未见；`absent` ≠ 未见。[E: packages/fs/fs-observation-policy/src/index.ts:28] |
| `FsObservationActor` | 本包 `types.ts` | 结构收窄：`agent?: { session?: object }`。本包从不读 session 字段。[E: packages/fs/fs-observation-policy/src/types.ts:23] [E: packages/fs/fs-observation-policy/src/types.ts:27] |
| `FsObservation` | `@deepseek-ai/dsh-fs` | `{ kind: 'present', version }` 或 `{ kind: 'absent' }`。[E: packages/fs/fs/src/types.ts:52] [E: packages/fs/fs/src/types.ts:53] [E: packages/fs/fs/src/types.ts:54] |
| `FsWriteIntent` | `@deepseek-ai/dsh-fs` | `{ kind: 'createIfAbsent' }` 或 `{ kind: 'replaceIfVersion', version }`。省略 intent = 无条件写，不是第三臂。[E: packages/fs/fs/src/types.ts:123] [E: packages/fs/fs/src/types.ts:124] [E: packages/fs/fs/src/types.ts:125] |
| `fs/write-intent` | `Events`，`@mode waterfall` | 单槽：`(target, actor, next) → Promise<FsWriteIntent \| undefined>`。[E: packages/fs/fs/src/index.ts:58] |
| `fs/edit-intent` | `Events`，`@mode waterfall` | 单槽：返回 `{ version }` 或 `undefined`。[E: packages/fs/fs/src/index.ts:66] |
| `fs/observed` | `Events`，`@mode emit` | `(target, observation, actor) => void`。同步记录器。[E: packages/fs/fs/src/index.ts:76] |
| `FS_NOT_OBSERVED` | `FsErrorCode` | 门在 **edit 未见 / 无 owner** 时抛；provider 在 `createIfAbsent` 撞到已有文件时也抛同一码。[E: packages/fs/fs/src/types.ts:185] [E: packages/fs/fs-observation-policy/src/index.ts:82] [E: packages/fs/fs-local/src/index.ts:186] |
| `FS_NOT_FOUND` | 门 | edit 且 prior 为 `absent`。[E: packages/fs/fs-observation-policy/src/index.ts:85] |
| `FS_STALE_VERSION` | provider | `replaceIfVersion` 时目标已消失或 version 对不上。门不抛这码。[E: packages/fs/fs-local/src/index.ts:180] [E: packages/fs/fs-local/src/index.ts:182] |

## 控制流

1. **host 组合挂上插件，不换 `ctx.fs`。** `dsh-base` 根 `insert` 写 `id: fs-observation-policy` / `name: '@deepseek-ai/dsh-fs-observation-policy'`，与后面的 `id: fs-sandbox` 并列；没有 `isolate`，进 root realm。[E: packages/bundle/base/cordis.patch.yml:221] [E: packages/bundle/base/cordis.patch.yml:443] 这是 Companion 行，不是第二条 `FileSystem`。

2. **`apply`@packages/fs/fs-observation-policy/src/index.ts 只登记 effect + 三枚 `ctx.on`。** `const gate = new ObservedStateGate()` 之后：`ctx.effect` 在 dispose 时 `gate.clear()`；`fs/write-intent` / `fs/edit-intent` 用 `Promise.resolve().then(() => gate.*Intent(...))` 包一层，使抛错变成 rejected promise，而不是同步穿透 waterfall；`fs/observed` 直接 `gate.observe`。[E: packages/fs/fs-observation-policy/src/index.ts:107] [E: packages/fs/fs-observation-policy/src/index.ts:113] [E: packages/fs/fs-observation-policy/src/index.ts:119] [E: packages/fs/fs-observation-policy/src/index.ts:122] [E: packages/fs/fs-observation-policy/src/index.ts:128] 两个 intent listener 的形参是 `(target, actor)`，**不接收也不调用 `next`**。

3. **Consumer 不 `inject` 本插件。** `dsh-tool-fs` `export const inject = ['tools', 'fs', 'systemPrompt']`。[E: packages/fs/tool-fs/src/index.ts:22] 工具把 `exec` 当 opaque `actor` 丢进事件；本插件再收窄成 `FsObservationActor`。两边没有方法耦合。

4. **读路径留下观察（写路径不 stat）。** `resolveRegularReadTarget`：`stat === undefined` 时先 `ctx.emit('fs/observed', target, { kind: 'absent' }, exec)` 再抛 `FS_NOT_FOUND`。[E: packages/fs/tool-fs/src/read-target.ts:27] [E: packages/fs/tool-fs/src/read-target.ts:28] 读成功后 `read` emit `{ kind: 'present', version: info.version }`；`read_image` 在附件落盘后同样 emit `present`。[E: packages/fs/tool-fs/src/read.ts:162] [E: packages/fs/tool-fs/src/read-image.ts:200] 窗口读也记 **整文件** version（来自那次 `stat`），不是「模型看过的行」：`limit: 1` 足以授权改窗口外的字面量。[E: packages/fs/tool-fs/tests/integration.spec.ts:164] [E: packages/fs/tool-fs/tests/integration.spec.ts:169] [E: packages/fs/tool-fs/tests/integration.spec.ts:170] 直接 `ctx.fs.readText` **不** emit，后续 model-facing `edit` 仍 `FS_NOT_OBSERVED`。[E: packages/fs/tool-fs/tests/integration.spec.ts:229] [E: packages/fs/tool-fs/tests/integration.spec.ts:233]

5. **write：`waterfall` → `writeText` → `emit`。** `applyWriteTool` 在 sandbox policy 与 `ctx.fs.resolve` 之后：`const intent = await ctx.waterfall('fs/write-intent', target, exec, () => undefined)`，默认 thunk 是 `undefined`（无条件写）。[E: packages/fs/tool-fs/src/write.ts:111] 然后 `ctx.fs.writeText(..., intent, ...)`，成功再 `ctx.emit('fs/observed', target, { kind: 'present', version: outcome.version }, exec)`。[E: packages/fs/tool-fs/src/write.ts:114] [E: packages/fs/tool-fs/src/write.ts:122] `dsh-tool-str-replace-editor` 的 `create` 同样 dispatch `fs/write-intent`，默认 thunk 写成 `createIfAbsent`（本页不写它的字段表）。[E: packages/fs/tool-str-replace-editor/src/index.ts:253] [E: packages/fs/tool-str-replace-editor/src/index.ts:256]

6. **edit：intent 放进 try，因为门会抛。** `const intent = await ctx.waterfall('fs/edit-intent', target, exec, () => undefined)`，随即 `ctx.fs.editText`。[E: packages/fs/tool-fs/src/edit.ts:126] [E: packages/fs/tool-fs/src/edit.ts:127] 未见目标由门抛 `FS_NOT_OBSERVED`，与 provider 失败走同一 `remediateFsError`。成功后再 emit `present`。[E: packages/fs/tool-fs/src/edit.ts:141] 一次成功 `write` 留下的 version 足够授权紧接着的 `edit`，不必再 `read`。[E: packages/fs/tool-fs/tests/integration.spec.ts:219]

7. **Waterfall 必须 `next()` 才会 `shift`。** Cordis `waterfall` 把最后一个参数当 innermost `next`；`next()` 才 `cbs.shift()` 或落到 inner。[E: vendor/cordis/src/events.ts:238] 本插件不调 `next()`，测试里默认 thunk 的 `defaultRan` 保持 `false`，后注册的第二 decider 也跑不到。[E: packages/fs/fs-observation-policy/tests/policy.spec.ts:184] [E: packages/fs/fs-observation-policy/tests/policy.spec.ts:200] [E: packages/fs/fs-observation-policy/tests/policy.spec.ts:211] `register` 默认 `push`，`prepend: true` 才 `unshift`。[E: vendor/cordis/src/events.ts:255] 本插件 `ctx.on` 不 prepend：默认部署里它先挂所以占槽；更早注册或 `prepend` 的 listener 会先跑并同样可以吞掉 `next()`。这是注册顺序约定，不是事件层强制「只能有一个 listener」。

8. **`owner`@ObservedStateGate 只认 `actor.agent.session`。** `owner()` 返回 `(actor as FsObservationActor | undefined)?.agent?.session`。[E: packages/fs/fs-observation-policy/src/index.ts:40] `undefined`、`{}`、`{ agent: {} }` 都没有 owner：write 判 `createIfAbsent`，edit 抛 `FS_NOT_OBSERVED`。[E: packages/fs/fs-observation-policy/tests/policy.spec.ts:55] [E: packages/fs/fs-observation-policy/tests/policy.spec.ts:56] [E: packages/fs/fs-observation-policy/tests/policy.spec.ts:63] [E: packages/fs/fs-observation-policy/tests/policy.spec.ts:89] [E: packages/fs/fs-observation-policy/tests/policy.spec.ts:94] 无 owner 的 `fs/observed` 什么都不记。[E: packages/fs/fs-observation-policy/src/index.ts:93] [E: packages/fs/fs-observation-policy/tests/policy.spec.ts:135] 读工具本身不查这张表，所以无 owner 的直调仍可 `read`；只是写/edit **不能满足** prior-observation（write 最多盲 create，不能凭观察去 `replaceIfVersion`）。两个不同 session 对象互不授权。[E: packages/fs/fs-observation-policy/tests/policy.spec.ts:160] [E: packages/fs/fs-observation-policy/tests/policy.spec.ts:170] [E: packages/fs/fs-observation-policy/tests/policy.spec.ts:171]

9. **门只出 intent / 抛错，磁盘检查在 provider。** `writeIntent`：`prior?.kind === 'present'` → `{ kind: 'replaceIfVersion', version: prior.version }`，否则（未见、absent、无 owner）→ `{ kind: 'createIfAbsent' }`。[E: packages/fs/fs-observation-policy/src/index.ts:68] [E: packages/fs/fs-observation-policy/src/index.ts:69] [E: packages/fs/fs-observation-policy/src/index.ts:70] `editIntent`：`!owner || prior === undefined` → `FS_NOT_OBSERVED`；`prior.kind === 'absent'` → `FS_NOT_FOUND`；否则 `{ version: prior.version }`。[E: packages/fs/fs-observation-policy/src/index.ts:81] [E: packages/fs/fs-observation-policy/src/index.ts:82] [E: packages/fs/fs-observation-policy/src/index.ts:85] [E: packages/fs/fs-observation-policy/src/index.ts:87] 有 owner 的未见 write 测成 `createIfAbsent`；present 测成 `replaceIfVersion`；absent write 仍 `createIfAbsent`，absent edit 才 `FS_NOT_FOUND`。[E: packages/fs/fs-observation-policy/tests/policy.spec.ts:50] [E: packages/fs/fs-observation-policy/tests/policy.spec.ts:70] [E: packages/fs/fs-observation-policy/tests/policy.spec.ts:77] [E: packages/fs/fs-observation-policy/tests/policy.spec.ts:108] `LocalFileSystem.writeText` 在锁内执行：`createIfAbsent` 且目标已在 → `FS_NOT_OBSERVED`（「不能没读就覆盖」）；`replaceIfVersion` 对不上 → `FS_STALE_VERSION`。[E: packages/fs/fs-local/src/index.ts:184] [E: packages/fs/fs-local/src/index.ts:186] [E: packages/fs/fs-local/src/index.ts:182] 所以「盲 write 一个已存在文件」的 `FS_NOT_OBSERVED` 来自 **provider**，不是门。tool 层给这两码追加 remedy：`FS_NOT_OBSERVED` → `read the file, then retry`；`FS_STALE_VERSION` → `re-read the file, then retry`。[E: packages/fs/tool-fs/src/error.ts:16] [E: packages/fs/tool-fs/src/error.ts:15]

10. **`fs/observed` 是 emit，不是单槽。** `emit` 对 listener 做同步 `.map(cb => cb(...args))`，**不** `await` 返回的 promise。[E: vendor/cordis/src/events.ts:195] 写已经 `writeText` 成功之后才 emit；再挂一个抛错的 listener 会让 tool result 变 `isError`，但磁盘上的字节已经落盘。[E: packages/fs/tool-fs/tests/integration.spec.ts:513] 合同要求 listener 同步且不抛；本插件的 `WeakMap.set` 满足。另一条 host 插件 `dsh-skill-filesystem` 也 `ctx.on('fs/observed', …)` 做 skill 失效，与观察表正交（emit 允许多 listener）。[E: packages/skill/skill-filesystem/src/index.ts:139]

11. **卸掉插件 = 无条件 mutation。** `fiber.dispose()` 之后：`clear()` 丢掉 WeakMap；listener 随 `ctx.on` 的 effect 卸掉；同一 `waterfall(..., () => undefined)` 落到 bare default，write intent 为 `undefined`。[E: packages/fs/fs-observation-policy/tests/policy.spec.ts:226] [E: packages/fs/fs-observation-policy/tests/policy.spec.ts:234] 集成测试在不挂 `FsPolicy` 时：未读 `write` 覆盖已有文件，未读 `edit` 也改盘。[E: packages/fs/tool-fs/tests/integration.spec.ts:336] [E: packages/fs/tool-fs/tests/integration.spec.ts:340] schema 不变。

## 设计动机

- **政策是组合，不是 schema。** `write` / `edit` 的参数表不编码「你读过没有」。默认产品靠 host 插一行插件填 intent；测试 / 特殊部署卸掉它，工具 API 仍合法。这和换 `SandboxedFileSystem` 是正交两层：一个改 `expected`，一个改能不能写到这个 path。
- **Consumer 不依赖本包。** 事件只带 `dsh-fs` 词汇 + opaque `object` actor。policy 自己声明 `FsObservationActor`，不 import `dsh-tools` / `dsh-agent` / `dsh-session`。
- **先验观察按 session 对象隔离，而不是按进程或 path 字符串。** `WeakMap` 外键是 `session` 身份：会话被回收则观察表一并释放；两个 agent 读到同一 `targetKey` 也不会互相授权 CAS。
- **门出意图，provider 做原子性。** 插件不做 I/O。真正的 no-clobber / version check 留在 `writeText` / `editText` 的临界区，避免「先 stat 再写」的 TOCTOU。
- **相对 Codex / Claude / Pi。** Codex 的 `apply_patch`、Claude 的 Edit 把 freshness 织进工具方言；DSH 把 read-before-write/edit 做成可卸载的 `fs/*` 事件门，模型可见名仍是 `write` / `edit`。Pi 没有对等的 in-core 观察门。本缝也不是 Codex 级 Seatbelt/seccomp：网络与进程可见性不在 `SandboxMode` 词汇里。

## Gotcha

- **不是 Provider。** 不要找 `ctx.fsPolicy`，不要以为换观察策略等于换 `ctx.fs`。默认 `ctx.fs` 仍是 `fs-sandbox`。
- **占槽靠「不 `next()`」，不是「系统禁止第二个 listener」。** 后挂的 decider 测下来跑不到；先挂或 `prepend` 的会赢。不要把单槽写成内核不变量。
- **无 owner ≠ 拒绝一切写。** 无 `actor.agent.session` 时 write 仍返回 `createIfAbsent`：文件不存在可以创建；文件已存在由 provider 抛 `FS_NOT_OBSERVED`。edit 则直接 `FS_NOT_OBSERVED`，因为无法证明 prior-observation。
- **绕过 tool 就绕过门。** `ctx.fs.writeText` / `editText` 不经过 waterfall；`ctx.fs.readText` 不 emit。只有 dispatch 了 `fs/*` 的 Consumer（`dsh-tool-fs`、`dsh-tool-str-replace-editor`）才受门约束。
- **观察的是 freshness，不是「看过全文」。** 带 `offset`/`limit` 的 `read` 一样授权整文件 CAS。
- **`fs/observed` 回滚不了已经提交的写。** listener 抛错只污染这次 tool result。不要在这条 emit 上做异步 I/O 或可能失败的工作。
- **`danger-full-access` 绕过的是 sandbox confine，不是这张观察表。** 升权仍要先通过 `fs/write-intent` / `fs/edit-intent`。
- **HMR / dispose 从零开始。** 同一 owner 对象在新插件实例上视为未见。
- **`glob` / `grep` / `bash` 不进这张表。** 只换本插件不会改变 ripgrep 或 `bash -c` 的世界。

## Seam 三角

| 角 | 包 | ctx 键 / 事件 | bundle / preset 行 |
|---|---|---|---|
| Definition | `@deepseek-ai/dsh-fs` 的 `Events`（与 `FileSystem` 同模块） | **没有** `ctx.fsPolicy`。声明 `fs/write-intent`、`fs/edit-intent`（waterfall）、`fs/observed`（emit）。`FileSystem` 仍只 `super(ctx, 'fs')` 占 `ctx.fs`。[E: packages/fs/fs/src/index.ts:58] [E: packages/fs/fs/src/index.ts:88] | Definition 包本身不出现在 shipped insert |
| Provider | **本页不是。** `apply` 不 `provide`。默认实现仍是 `@deepseek-ai/dsh-fs-sandbox`（`extends LocalFileSystem`） | `ctx.fs` 不因本插件改变 | `dsh-base` `id: fs-sandbox`。[E: packages/bundle/base/cordis.patch.yml:443] |
| Companion（本页） | `@deepseek-ai/dsh-fs-observation-policy` `apply(ctx)` | 无 `inject`、无 service 键；占两个 intent 单槽且不 `next()`；听 `fs/observed` | `dsh-base` `id: fs-observation-policy`。`dsh-web-app` **不** disable 本行。preset 挂回的是 `tool-fs` Consumer，不是再挂一份本插件。[E: packages/bundle/base/cordis.patch.yml:221] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:56] |
| Consumer | `@deepseek-ai/dsh-tool-fs`（`read`/`read_image` emit；`write`/`edit` waterfall + emit）。`@deepseek-ai/dsh-tool-str-replace-editor` 同样 dispatch | `inject = ['tools', 'fs', 'systemPrompt']`；`exec` 当 actor | `dsh-base` `id: tool-fs`；`dsh-web-app` `disabled: true`；`standard` 按会话挂回 `id: tool-fs`。[E: packages/fs/tool-fs/src/index.ts:22] [E: packages/bundle/web-app/cordis.patch.yml:313] [E: apps/cli/config/agent-presets/standard/agent.cordis.yml:56] |

DSH 是 Cordis 组合运行时（`profile → bundle → agent preset`）。本页证明 **Companion 事件 ≠ 新 Provider**：换世界可以只卸事件门（mutation 变无条件），或只换 `ctx.fs`（E2B / local；观察表仍按 session 记），两层独立。

## Sources

- packages/fs/fs-observation-policy/src/index.ts
- packages/fs/fs-observation-policy/src/types.ts
- packages/fs/fs-observation-policy/tests/policy.spec.ts
- packages/fs/fs/src/index.ts
- packages/fs/fs/src/types.ts
- packages/fs/tool-fs/src/index.ts
- packages/fs/tool-fs/src/write.ts
- packages/fs/tool-fs/src/edit.ts
- packages/fs/tool-fs/src/read.ts
- packages/fs/tool-fs/src/read-target.ts
- packages/fs/tool-fs/src/read-image.ts
- packages/fs/tool-fs/src/error.ts
- packages/fs/tool-fs/tests/integration.spec.ts
- packages/fs/fs-local/src/index.ts
- packages/fs/tool-str-replace-editor/src/index.ts
- packages/skill/skill-filesystem/src/index.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/web-app/cordis.patch.yml
- apps/cli/config/agent-presets/standard/agent.cordis.yml
- vendor/cordis/src/events.ts

## 相关

- [`spine.overview`](../../spine/overview.md) — Cordis 组合主线、host 面 vs agent-preset 面。
- [`spine.capability-seams`](../../spine/capability-seams.md) — Definition / Provider / Consumer；Companion 事件不是新 Provider。
- [`subsys.execution.fs`](fs.md) — `ctx.fs` Definition：`FileSystem`、`FsTarget`、三枚 `fs/*` 事件声明。
- [`surface.tools.write`](../../surface/tools/write.md) — 模型可见 `write`：body 里 `fs/write-intent` + `writeText`。
- [`surface.tools.edit`](../../surface/tools/edit.md) — 模型可见 `edit`：body 里 `fs/edit-intent` + `editText`。
- [`surface.tools.read`](../../surface/tools/read.md) — 模型可见 `read`：成功/缺文件时 emit `fs/observed`。
- [`surface.tools.str-replace-editor`](../../surface/tools/str-replace-editor.md) — 另一 Consumer：同样 dispatch 两枚 intent。
- [`subsys.execution.fs-sandbox`](fs-sandbox.md) — 默认 host `ctx.fs`；只在 `writeText` / `editText` 加围栏。
- [`subsys.composition.bundle-base`](../composition/bundle-base.md) — `dsh-base` 真树，含 `fs-observation-policy` 行。
- [`subsys.core.tools`](../core/tools.md) — `ctx.tools` 管线；观察门不挂 `tools/pre-execute`。
