---
id: subsys.execution.fs-local
title: fs-local provider
kind: subsystem
tier: T2
pkg: execution
source:
  - packages/fs/fs-local/src/index.ts
  - packages/fs/fs-local/src/fsio.ts
  - packages/fs/fs-local/src/win32.ts
  - packages/fs/fs-local/tests/filesystem.spec.ts
  - packages/fs/fs-local/tests/fsio.spec.ts
  - packages/fs/fs-local/package.json
  - packages/fs/fs/src/index.ts
  - packages/fs/fs/src/types.ts
  - packages/fs/fs/tests/service.spec.ts
  - packages/fs/fs-sandbox/src/index.ts
  - packages/fs/tool-fs/src/index.ts
  - packages/fs/tool-fs/src/write.ts
  - packages/fs/tool-str-replace-editor/src/index.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/base/package.json
  - packages/preset/agent-presets/src/mount.ts
  - apps/cli/config/agent-presets/minimal/agent.cordis.yml
  - vendor/cordis/src/service.ts
  - vendor/cordis/src/events.ts
symbols:
  - LocalFileSystem
  - resolveLocalTarget
  - writeFileAtomic
related:
  - spine.overview
  - spine.capability-seams
  - subsys.execution.fs
  - subsys.execution.fs-sandbox
  - subsys.execution.fs-observation
  - surface.presets.minimal
  - surface.tools.write
  - surface.tools.str-replace-editor
  - subsys.composition.bundle-base
evidence: explicit
status: verified
updated: 47f943859b
---

> `@deepseek-ai/dsh-fs-local` 的 `LocalFileSystem` 是 `ctx.fs` 的 **本地磁盘 Provider**：继承 `FileSystem`，用 realpath 当 `targetKey`，按 key 串行锁，经同目录私有 staging 原子发布。`Config.cwd` 只是相对路径解析默认，**不是** containment。shipped `dsh-base` **不**把本包挂成 host `ctx.fs`（默认是 extends 本类的 `fs-sandbox`）；`minimal` preset 用 `isolate.fs: true` 再挂一份，只影子该会话。

## 能回答的问题

- shipped `dsh-base` 的 host `ctx.fs` 是 `dsh-fs-local` 还是 `dsh-fs-sandbox`？本包为什么还在 base 的 `dependencies` 里？
- `Config.cwd` 会不会挡住写出 workspace？`resolve('..')` 和绝对路径怎么走？
- `targetKey` 从哪来？经 symlink 读写会不会换掉链接本身？
- `writeText` / `editText` 的 resolve → lock → intent/version 检查 → `writeFileAtomic` 怎么串？`createIfAbsent` 为什么走 hard-link？
- `minimal` 为什么必须 `isolate.fs: true` 再挂 `dsh-fs-local`？host 上的 `fs-sandbox` 还在不在？
- 裸 backend 的 `sandboxMode` 和 `writeText` 最后一参 `sandboxPolicy` 各是什么？waterfall `fs/write-intent` 是谁 `next()`？

## 职责边界

本包 `@deepseek-ai/dsh-fs-local` 拥有：**host 文件系统上的** `ctx.fs` 实现 `LocalFileSystem`（默认导出，Cordis 当 Service 插件加载），以及无 Cordis 的 I/O 层 `resolveLocalTarget` / `probe` / `writeFileAtomic` / 字面 edit。[E: packages/fs/fs-local/package.json:2] [E: packages/fs/fs-local/src/index.ts:64] [E: packages/fs/fs-local/src/index.ts:265] 它 `provide` 的服务名是 Definition 钉死的 `'fs'`，不是 yml 行 id `fs-local`。[E: packages/fs/fs/src/index.ts:88] [E: vendor/cordis/src/service.ts:57]

本包**不**拥有：

- `FileSystem` 抽象、`Context.fs` augmentation、`fs/write-intent` / `fs/edit-intent` / `fs/observed` 词表 — [`subsys.execution.fs`](fs.md)。
- 写/edit 围栏、`checkedTarget`、`FS_SANDBOX_DENIED`、`sandboxMode` 覆盖 — [`subsys.execution.fs-sandbox`](fs-sandbox.md)。`SandboxedFileSystem extends LocalFileSystem`，独占同一 `ctx.fs` 键。[E: packages/fs/fs-sandbox/src/index.ts:59]
- `fs/write-intent` 单槽决策（占槽且不 `next()`）— [`subsys.execution.fs-observation`](fs-observation.md)。本 Provider 不监听这些事件。
- 模型可见 `read` / `write` / `edit` 字段 — [`surface.tools.write`](../../surface/tools/write.md) 等 `surface.tools.*`。
- `ctx.subprocess` / `bash -c` / `glob`/`grep`。`LocalFileSystem` 构造只收 `ctx` + `Config`，不 `inject` `subprocess`；只换 `ctx.fs` 不会把 shell 搬到远程。[E: packages/fs/fs-local/src/index.ts:79] [E: packages/fs/fs-local/src/index.ts:80]

**host 面 vs agent-preset 面。** 默认安装是本地 Web GUI（`dsh web`），本仓没有 shipped TUI。host 面（进程级）的 `ctx.fs` 由 `dsh-base` 的 `id: fs-sandbox` 提供。[E: packages/bundle/base/cordis.patch.yml:443] [E: packages/bundle/base/cordis.patch.yml:444] 同一份 `cordis.patch.yml` **没有** `id: fs-local` / `name: '@deepseek-ai/dsh-fs-local'` 的 plugin 行。base `package.json` 仍依赖本包，因为 `dsh-fs-sandbox` 继承它。[E: packages/bundle/base/package.json:57] agent-preset 面：shipped 四份 preset 里只有 `minimal` 再挂 `dsh-fs-local`，而且必须进 `isolate.fs: true` 的 `cordis:group`，否则 `mountPreset` 视 `ctx.fs` 泄漏到 root 并拒绝。[E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:51] [E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:52] [E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:54] [E: packages/preset/agent-presets/src/mount.ts:361] [E: packages/preset/agent-presets/src/mount.ts:365]

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/fs/fs-local/src/index.ts` | `LocalFileSystem`：登记 `ctx.fs`、cwd 解析、`withLock`、intent/version 检查、把 I/O 交给 fsio |
| `packages/fs/fs-local/src/fsio.ts` | Cordis-free：`resolveLocalTarget`、`probe`/`probeNoFollow`、读/流、`writeFileAtomic`、字面 edit |
| `packages/fs/fs-local/src/win32.ts` | 惰性 koffi：替换写的 DACL 拷贝与 `ReplaceFileW` |
| `packages/fs/fs-local/tests/filesystem.spec.ts` | 经 `ctx.fs`：cwd、containment 查询、锁、symlink 身份、dispose |
| `packages/fs/fs-local/tests/fsio.spec.ts` | 经 fsio：realpath 键、staging 互斥、POSIX/Win32 发布 |
| `packages/bundle/base/cordis.patch.yml` | host 挂 `id: fs-sandbox`，不挂 `fs-local` |
| `apps/cli/config/agent-presets/minimal/agent.cordis.yml` | preset 面 `isolate.fs` + `id: fs-local` |

## 数据模型

| 符号 | 要点 |
|---|---|
| `LocalTarget` | `displayPath`（调用方看到的绝对路径，不 realpath）+ `targetKey`（realpath 身份，也是 I/O 路径）[E: packages/fs/fs-local/src/fsio.ts:108] [E: packages/fs/fs-local/src/fsio.ts:110] |
| `Config.cwd` | 相对路径解析默认，缺省 `process.cwd()`。[E: packages/fs/fs-local/src/index.ts:66] [E: packages/fs/fs-local/tests/filesystem.spec.ts:57] |
| `Config.diffBasisMaxBytes` | 覆盖写 contextual-diff 单侧上限，默认 10 MiB；新内容达到上限则不算 `diffable`，`before` 走 `null` 分支，`writeFileAtomic` 仍执行。[E: packages/fs/fs-local/src/index.ts:67] [E: packages/fs/fs-local/src/index.ts:196] [E: packages/fs/fs-local/src/index.ts:199] [E: packages/fs/fs-local/tests/filesystem.spec.ts:519] |
| `FsWriteIntent` | `createIfAbsent` 或 `replaceIfVersion`；省略 = 无条件 create-or-overwrite，不是第三种 union 臂。[E: packages/fs/fs/src/types.ts:124] [E: packages/fs/fs/src/types.ts:125] |
| `FsVersion`（本 backend） | `dev:ino:size:mtimeNs:ctimeNs`。[E: packages/fs/fs-local/src/fsio.ts:75] |
| `sandboxMode` | 基类 getter 返回 `undefined`；`LocalFileSystem` 不覆盖。[E: packages/fs/fs/src/index.ts:104] |
| `sandboxPolicy`（`writeText`/`editText` 末参） | Definition 可选；本类 override **不声明**该参，裸 backend 忽略。[E: packages/fs/fs/src/index.ts:227] [E: packages/fs/fs-local/src/index.ts:170] |

## 控制流

1. **host 挂的是包装，不是本包。** `dsh-base` insert `id: fs-sandbox` / `name: '@deepseek-ai/dsh-fs-sandbox'`。[E: packages/bundle/base/cordis.patch.yml:443] [E: packages/bundle/base/cordis.patch.yml:444] `SandboxedFileSystem@packages/fs/fs-sandbox/src/index.ts` `extends LocalFileSystem`，`static inject = ['sandboxPolicy']`，覆盖 `sandboxMode`，只在 `writeText`/`editText` 上 `checkedTarget` 再 `super`。[E: packages/fs/fs-sandbox/src/index.ts:59] [E: packages/fs/fs-sandbox/src/index.ts:60] [E: packages/fs/fs-sandbox/src/index.ts:91] 同一 realm 再挂第二个名为 `'fs'` 的 Service 会抛（Definition 测试用第二份 `FakeFileSystem` 钉死；`LocalFileSystem` 走同一 `super(ctx, 'fs')` 槽）。[E: packages/fs/fs/tests/service.spec.ts:100]

2. **preset 要再 `provide` `ctx.fs`，必须 isolate。** `minimal` 的 `id: filesystem` 是 `cordis:group`，`isolate.fs: true`，子行 `id: fs-local` / `name: '@deepseek-ai/dsh-fs-local'`，`cwd: !!js process.env.DSH_CWD ?? process.cwd()`。[E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:51] [E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:52] [E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:54] [E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:55] [E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:57] `mountPreset@packages/preset/agent-presets/src/mount.ts` 在子树激活后扫 `leakedServices`：写进 root isolate 符号的服务会抛，要求「sit behind an `isolate` realm or move to the host composition」。[E: packages/preset/agent-presets/src/mount.ts:361] [E: packages/preset/agent-presets/src/mount.ts:365] host 上的 `fs-sandbox` 仍给其它会话；本 group 的 `str-replace-editor` `inject = ['tools', 'fs']` 吃到的是这份裸 local。[E: packages/fs/tool-str-replace-editor/src/index.ts:494] 它看 `ctx.fs.sandboxMode === undefined` 就不去要 `sandboxPolicy`。[E: packages/fs/tool-str-replace-editor/src/index.ts:69]

3. **插件登记。** 测试与 Loader 都是 `ctx.plugin(LocalFileSystem, config)`。[E: packages/fs/fs-local/tests/filesystem.spec.ts:28] 构造 `super(ctx)` → `FileSystem` `super(ctx, 'fs')` → `Service` `ctx.reflect.provide('fs', self, …)`。[E: packages/fs/fs-local/src/index.ts:80] [E: packages/fs/fs/src/index.ts:88] [E: vendor/cordis/src/service.ts:57] fiber `dispose` 后 `ctx.fs` 变为 `undefined`。[E: packages/fs/fs-local/tests/filesystem.spec.ts:778] [E: packages/fs/fs-local/tests/filesystem.spec.ts:779]

4. **`resolve` → `resolveLocalTarget`。** `LocalFileSystem.resolve@packages/fs/fs-local/src/index.ts` 用 `opts?.cwd ?? this.config.cwd` 当相对路径底，**不**把 cwd 当可写根。[E: packages/fs/fs-local/src/index.ts:108] `resolveLocalTarget@packages/fs/fs-local/src/fsio.ts` 先 `path.resolve(cwd, path)` 得 `displayPath`，再 `realpath(displayPath)` 当 `targetKey`；文件尚不存在则 realpath 最近祖先再拼回缺失后缀，创建前后键稳定。[E: packages/fs/fs-local/src/fsio.ts:148] [E: packages/fs/fs-local/src/fsio.ts:151] [E: packages/fs/fs-local/src/fsio.ts:181] 绝对路径忽略 `opts.cwd`；`resolve('..')` 成功，只是 `contains(root, outside)` 为 false——那是查询，不是写门。[E: packages/fs/fs-local/tests/filesystem.spec.ts:101] [E: packages/fs/fs-local/tests/filesystem.spec.ts:122] [E: packages/fs/fs-local/tests/filesystem.spec.ts:128] `processPath` 返回 `String(target.targetKey)`（本世界的 OS 路径）；`fileUrl` 对它做 `pathToFileURL`。[E: packages/fs/fs-local/src/index.ts:114] [E: packages/fs/fs-local/src/index.ts:118]

5. **读不锁。** `readText` / `streamText` / `readBytes` / `stat` / `listDir` 直接用 `target.targetKey` 走 fsio，不进 `withLock`。[E: packages/fs/fs-local/src/index.ts:144] `lstat` 是 path 形：对 `resolve(opts?.cwd ?? cwd, path)` 做 `probeNoFollow`，**不**跟随最后一段 symlink。[E: packages/fs/fs-local/src/index.ts:137]

6. **写进 per-`targetKey` FIFO 锁。** `writeText` / `editText` 都 `withLock(target.targetKey, …)`。[E: packages/fs/fs-local/src/index.ts:172] [E: packages/fs/fs-local/src/index.ts:227] `withLock@packages/fs/fs-local/src/index.ts` 把同一 key 的 op 接到上一个 promise 尾巴上；本 op 的结果/抛错不传给下一等待者。[E: packages/fs/fs-local/src/index.ts:91] [E: packages/fs/fs-local/src/index.ts:93] 并发 `replaceIfVersion` 写 vs 同 version 的 edit：恰好一个 fulfilled，另一个 `FS_STALE_VERSION`，锁表清空。[E: packages/fs/fs-local/tests/filesystem.spec.ts:738] [E: packages/fs/fs-local/tests/filesystem.spec.ts:743]

7. **锁内：probe → intent/version →（可选）diff basis → 原子发布。** `writeText` 先 `probe(target.targetKey)`；已存在且非 regular file 抛 `FS_NOT_REGULAR_FILE`。[E: packages/fs/fs-local/src/index.ts:173] [E: packages/fs/fs-local/src/index.ts:175] `replaceIfVersion`：缺失或 version 不等 → `FS_STALE_VERSION`。[E: packages/fs/fs-local/src/index.ts:178] [E: packages/fs/fs-local/src/index.ts:180] [E: packages/fs/fs-local/src/index.ts:182] `createIfAbsent` 且已存在 → `FS_NOT_OBSERVED`。[E: packages/fs/fs-local/src/index.ts:184] [E: packages/fs/fs-local/src/index.ts:186] 无 `expected` = 无条件原子写。[E: packages/fs/fs-local/tests/filesystem.spec.ts:446] [E: packages/fs/fs-local/tests/filesystem.spec.ts:454] 然后 `writeFileAtomic(target.targetKey, content, existing?.mode, signal, internals, createIfAbsent ? { displayPath } : undefined)`。[E: packages/fs/fs-local/src/index.ts:200] [E: packages/fs/fs-local/src/index.ts:206] `editText` 在锁内：缺失一律 `FS_STALE_VERSION`（有无 version guard 都一样），再 `readForEdit` → `applyLiteralEdit` → 按原 line-ending 写回 → 同一 `writeFileAtomic`（无 `createIfAbsent`）。[E: packages/fs/fs-local/src/index.ts:232] [E: packages/fs/fs-local/src/index.ts:244]

8. **`writeFileAtomic@packages/fs/fs-local/src/fsio.ts`：stage 然后 publish。** 先 `mkdir` 父目录；再在同目录建 `.<basename>.<pid>.<uuid>.tmpdir`（`0o700`），里面 `wx` 打开 `0o600` temp。[E: packages/fs/fs-local/src/fsio.ts:543] [E: packages/fs/fs-local/src/fsio.ts:561] [E: packages/fs/fs-local/src/fsio.ts:565] 预存在的 staging 名会 `EEXIST`，绝不覆盖别人的文件。[E: packages/fs/fs-local/tests/fsio.spec.ts:832] [E: packages/fs/fs-local/tests/fsio.spec.ts:839] 写+`sync` 之后：
   - `createIfAbsent`：`link(temp, dest)`（hard-link no-replace）；碰撞经 `lstat` 判成 `FS_NOT_OBSERVED` 或 `FS_NOT_REGULAR_FILE`，竞争者的文件留下。[E: packages/fs/fs-local/src/fsio.ts:578] [E: packages/fs/fs-local/src/fsio.ts:580] [E: packages/fs/fs-local/tests/filesystem.spec.ts:370]
   - win32 且 `mode !== undefined`（视为替换）：先 `copyFileDacl` 把目标 DACL 拷到空 temp，再 `replaceFile`（`ReplaceFileW`）；目标在 staging 期间消失（`ENOENT`）则 fallback `rename`。[E: packages/fs/fs-local/src/fsio.ts:567] [E: packages/fs/fs-local/src/fsio.ts:568] [E: packages/fs/fs-local/src/fsio.ts:586] [E: packages/fs/fs-local/src/fsio.ts:590] [E: packages/fs/fs-local/src/fsio.ts:591] [E: packages/fs/fs-local/src/win32.ts:108] [E: packages/fs/fs-local/src/win32.ts:122]
   - 其余：`rename(temp, dest)`。[E: packages/fs/fs-local/src/fsio.ts:594]
   提交后再清 staging；`catch` 吞掉清失败，不把已提交的写改成失败。[E: packages/fs/fs-local/src/fsio.ts:598] [E: packages/fs/fs-local/tests/fsio.spec.ts:822]

9. **symlink：键跟目标，写跟目标，链接留下。** 两条路径（真文件 / 指向它的 symlink）`resolve` 出同一个 `targetKey`。[E: packages/fs/fs-local/tests/fsio.spec.ts:67] [E: packages/fs/fs-local/tests/filesystem.spec.ts:754] 经 link 做 `editText` 改的是 real 文件内容，链接节点仍在。[E: packages/fs/fs-local/tests/filesystem.spec.ts:757] [E: packages/fs/fs-local/tests/filesystem.spec.ts:758] 悬挂 symlink：`realpath` 失败后 `targetKey` 落在链接路径；跟随的 `probe` 得到 absent，所以 `writeText` 的 `createIfAbsent && existing` 检查放过；`writeFileAtomic` 的 `link` 撞上已有目录项，经 `lstat` 判成 `FS_NOT_REGULAR_FILE`，链接留下。[E: packages/fs/fs-local/tests/filesystem.spec.ts:405] [E: packages/fs/fs-local/tests/filesystem.spec.ts:406]

10. **waterfall 不在本 Provider。** 模型面 Consumer `dsh-tool-fs` `inject = ['tools', 'fs', 'systemPrompt']`。[E: packages/fs/tool-fs/src/index.ts:22] `applyWriteTool` 在 `writeText` **之前** `ctx.waterfall('fs/write-intent', target, exec, () => undefined)`，再把返回的 intent 当 `expected` 传入，末参带上 tool 层算好的 `sandboxPolicy`。[E: packages/fs/tool-fs/src/write.ts:111] [E: packages/fs/tool-fs/src/write.ts:114] `Events.waterfall@vendor/cordis/src/events.ts` 把最后一个参数当 innermost `next`：每次 `next()` 才 `cbs.shift()`；listener 不调用就否决剩余链（含默认 `undefined` = 无条件写）。[E: vendor/cordis/src/events.ts:236] [E: vendor/cordis/src/events.ts:237] [E: vendor/cordis/src/events.ts:238] `fs-observation-policy` 占单槽且不 `next()`——那是 [`subsys.execution.fs-observation`](fs-observation.md)，不是换 Provider。本类 `writeText` 不声明 `sandboxPolicy`，即便 caller 传入也忽略；围栏在 `SandboxedFileSystem` 进 `super` 之前做完。[E: packages/fs/fs-local/src/index.ts:166] [E: packages/fs/fs-sandbox/src/index.ts:91]

## 设计动机

DSH 是 Cordis 组合运行时（`profile → bundle → agent preset`），不是「又一个 coding agent 内置本地磁盘」。存储语义（realpath 身份、原子发布、按 key 串行）放在可被继承的 `LocalFileSystem`；围栏放在 `SandboxedFileSystem` 的 mutation override。默认 host 挂包装而不是裸 local：同一 `ctx.fs` 键、同一 Consumer（`tool-fs`），换的是政策，不是 I/O 方言。

`targetKey = realpath` 让别名共享 stale guard：经 link 读到的 version 挡住经真路径的并发写，反之亦然。原子 staging + exclusive `wx` 避免半写入暴露给读者；`createIfAbsent` 用 hard-link no-replace，而不是「probe 后再 rename」——后者会在 probe 与 publish 之间把竞争者的文件盖掉。

`cwd` 刻意不是围栏。相对路径底可以是 session workspace 或 `opts.cwd`；containment 是 `fs-sandbox` 对 `writableRoots` 的再 `resolve`，不是本包的 `contains()` 查询。把围栏焊进 cwd，远程 / E2B backend 就无法复用同一套 Consumer。

`minimal` 要一份**不 confine** 的 `ctx.fs` 给 `str_replace_editor`，但不能拆掉 host `fs-sandbox`（别的会话、host 行仍要围栏）。解法是 preset 面 `isolate.fs: true` 再 `provide` 一份 `LocalFileSystem`，不是在 root 并列第二行。

对照：Codex 的磁盘策略和 OS sandbox 绑在一起；Pi 没有 in-core `ctx.fs` seam。DSH 把「磁盘怎么写」和「这次许不许写」拆成 Provider 继承 vs 包装。

## Gotcha

- **`cwd` 不是 sandbox。** `resolve('..')`、绝对路径、`opts.cwd` 指到别的 tmp 目录，都会做真 I/O。[E: packages/fs/fs-local/tests/filesystem.spec.ts:89] [E: packages/fs/fs-local/tests/filesystem.spec.ts:122] `contains()` 只比较两个已解析 target 的 `processPath`，`writeText` 不调用它。[E: packages/fs/fs-local/src/index.ts:123]
- **同 realm 不能并列 `fs-local` 与 `fs-sandbox`。** 两者都 `provide` `'fs'`。要换世界 = patch 掉 `id: fs-sandbox` 再挂另一行，或像 `minimal` 那样 isolate。
- **卸掉 observation-policy，本 Provider 无条件覆盖。** `writeText(target, content)` 没有 `expected` 就是 overwrite。[E: packages/fs/fs-local/tests/filesystem.spec.ts:454]
- **悬挂 symlink ≠ absent。** `createIfAbsent` 不会把它「创建成普通文件」；结果是 `FS_NOT_REGULAR_FILE`，链接留下。[E: packages/fs/fs-local/tests/filesystem.spec.ts:406]
- **写走链接目标，不替换链接。** I/O 路径是 `targetKey`（realpath），不是 `displayPath`。[E: packages/fs/fs-local/src/index.ts:201]
- **读不加锁。** 并发读者可以看见 publish 前的旧字节；新鲜度靠写侧 version / `createIfAbsent` 的 link，不靠读锁。
- **`diffBasisMaxBytes` 只影响 `before`。** 超限或非文本旧内容 → `before: null`，写照样提交。
- **Win32 替换语义靠 `mode !== undefined`。** `probe` 到已有文件才把 POSIX mode 传进 `writeFileAtomic`；新文件走目录 DACL 继承，不调 `ReplaceFileW`。[E: packages/fs/fs-local/src/fsio.ts:584]
- **只换本 Provider 不改 Bash / PTY / `glob`/`grep`。** 那些吃 `ctx.subprocess`（Bash 还隔着 `ctx.shell`）。E2B 要 one-world 必须配对换 fs+subprocess，留给 `subsys.execution.e2b`。

## Seam 三角

| 角色 | 落点 | ctx 键 / bundle / preset 行 |
|---|---|---|
| **Definition** | `@deepseek-ai/dsh-fs` 的 `FileSystem`：`super(ctx, 'fs')`，augmentation `Context.fs`，原语 + `sandboxMode` 默认 `undefined` + 三个 `fs/*` 事件。权威页 [`subsys.execution.fs`](fs.md) | `ctx.fs`。base **不**挂 Definition 包本身。[E: packages/fs/fs/src/index.ts:88] [E: packages/fs/fs/src/index.ts:104] |
| **Provider（本页）** | `@deepseek-ai/dsh-fs-local` 的 `LocalFileSystem`。无 `static inject`。shipped **host** 默认不是这一行：`dsh-base` 挂 `id: fs-sandbox`（`SandboxedFileSystem extends LocalFileSystem`，`inject ['sandboxPolicy']`）。**preset** 例外：`minimal` `id: fs-local` + `isolate.fs: true` | host：`packages/bundle/base/cordis.patch.yml` `id: fs-sandbox`。preset：`apps/cli/config/agent-presets/minimal/agent.cordis.yml` `id: fs-local`。同一 realm 第二份 `ctx.fs` 抛。[E: packages/bundle/base/cordis.patch.yml:443] [E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:54] [E: packages/fs/fs-sandbox/src/index.ts:59] |
| **Consumer** | 模型面：`dsh-tool-fs` `inject = ['tools', 'fs', 'systemPrompt']`，execute 里 waterfall 再 `ctx.fs.writeText` / `editText` / `readText`（字段表在 `surface.tools.*`，本页不写）。`minimal` 同组：`dsh-tool-str-replace-editor` `inject = ['tools', 'fs']`。政策插件 `fs-observation-policy` **不是** Consumer-of-Provider：不 `inject` `fs`、不 `provide` | `dsh-web-app` 把 host `id: tool-fs` 设 `disabled: true`，改由 preset 挂回。`minimal` 不挂 `tool-fs`，只挂 `str-replace-editor`。[E: packages/bundle/web-app/cordis.patch.yml:312] [E: packages/bundle/web-app/cordis.patch.yml:313] [E: packages/fs/tool-fs/src/index.ts:22] [E: packages/fs/tool-fs/src/write.ts:114] [E: packages/fs/tool-str-replace-editor/src/index.ts:494] |

换 Provider = 换 bundle / `--patch` / preset isolate 行，不改 `tool-fs` schema。把本包挂进 preset 却漏 `isolate.fs`，失败在 `mountPreset`，不是静默共用 host `fs-sandbox`。

## Sources

- packages/fs/fs-local/src/index.ts
- packages/fs/fs-local/src/fsio.ts
- packages/fs/fs-local/src/win32.ts
- packages/fs/fs-local/tests/filesystem.spec.ts
- packages/fs/fs-local/tests/fsio.spec.ts
- packages/fs/fs-local/package.json
- packages/fs/fs/src/index.ts
- packages/fs/fs/src/types.ts
- packages/fs/fs/tests/service.spec.ts
- packages/fs/fs-sandbox/src/index.ts
- packages/fs/tool-fs/src/index.ts
- packages/fs/tool-fs/src/write.ts
- packages/fs/tool-str-replace-editor/src/index.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/base/package.json
- packages/preset/agent-presets/src/mount.ts
- apps/cli/config/agent-presets/minimal/agent.cordis.yml
- vendor/cordis/src/service.ts
- vendor/cordis/src/events.ts

## 相关

- [spine.overview](../../spine/overview.md) — host 面 vs agent-preset 面；`profile → bundle → agent preset`。
- [spine.capability-seams](../../spine/capability-seams.md) — Definition / Provider / Consumer；`ctx.fs` 与 `ctx.subprocess` 无运行时耦合。
- [subsys.execution.fs](fs.md) — `FileSystem` Definition、原语、`fs/*` 事件。
- [subsys.execution.fs-sandbox](fs-sandbox.md) — 默认 host Provider：继承本类，只围栏 `writeText`/`editText`。
- [subsys.execution.fs-observation](fs-observation.md) — 占 `fs/write-intent` / `fs/edit-intent` 且不 `next()`；不是换 `ctx.fs`。
- [surface.presets.minimal](../../surface/presets/minimal.md) — `isolate.fs` + `dsh-fs-local` + `str_replace_editor` 的 preset 成员资格。
- [surface.tools.write](../../surface/tools/write.md) — 模型可见 `write`：waterfall 之后才调本 Provider。
- [surface.tools.str-replace-editor](../../surface/tools/str-replace-editor.md) — `minimal` 里吃隔离 `ctx.fs` 的编辑器。
- [subsys.composition.bundle-base](../composition/bundle-base.md) — host insert 真树：`id: fs-sandbox`，无 `fs-local` 行。
