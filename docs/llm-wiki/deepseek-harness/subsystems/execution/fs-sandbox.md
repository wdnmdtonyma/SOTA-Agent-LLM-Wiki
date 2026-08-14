---
id: subsys.execution.fs-sandbox
title: fs-sandbox 包装
kind: subsystem
tier: T2
pkg: execution
source:
  - packages/fs/fs-sandbox/src/index.ts
  - packages/fs/fs-sandbox/src/containment.ts
  - packages/fs/fs-sandbox/tests/fs-sandbox.spec.ts
  - packages/fs/fs-sandbox/tests/containment.spec.ts
  - packages/sandbox/sandbox/src/roots.ts
  - packages/sandbox/sandbox/src/index.ts
  - packages/sandbox/sandbox/src/escalation.ts
  - packages/sandbox/sandbox/tests/roots.spec.ts
  - packages/sandbox/sandbox-policy/src/index.ts
  - packages/sandbox/sandbox-local/src/profiles.ts
  - packages/fs/fs/src/index.ts
  - packages/fs/fs/src/types.ts
  - packages/fs/fs/tests/service.spec.ts
  - packages/fs/fs-local/src/index.ts
  - packages/fs/fs-local/src/fsio.ts
  - packages/fs/tool-fs/src/index.ts
  - packages/fs/tool-fs/src/write.ts
  - packages/fs/tool-fs/src/sandbox.ts
  - packages/fs/fs-observation-policy/src/index.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/web-app/cordis.patch.yml
  - apps/cli/config/agent-presets/minimal/agent.cordis.yml
  - vendor/cordis/src/events.ts
symbols:
  - SandboxedFileSystem
  - checkedTarget
  - FS_SANDBOX_DENIED
  - isPathUnder
related:
  - spine.overview
  - spine.tool-call-anatomy
  - spine.capability-seams
  - subsys.execution.fs
  - subsys.execution.fs-local
  - subsys.execution.fs-observation
  - subsys.execution.sandbox-policy
  - subsys.execution.sandbox
  - subsys.execution.sandbox-local
  - surface.tools.write
  - surface.tools.edit
  - surface.presets.minimal
  - surface.misc.security
  - subsys.composition.bundle-base
evidence: explicit
status: verified
updated: 47f943859b
---

> `@deepseek-ai/dsh-fs-sandbox` 的 `SandboxedFileSystem` 是 **host 面默认 `ctx.fs` Provider**：它 `extends LocalFileSystem`，`static inject = ['sandboxPolicy']`，只在 `writeText` / `editText` 上做 per-call 文件副作用围栏。读路径全部走继承实现。这是可信代码里对模型控制路径的 policy check，**不是** kernel 边界，也不调用 `ctx.sandbox.confine`。

## 能回答的问题

- 默认 `dsh web` 组合里谁独占 `ctx.fs`？`dsh-fs-local` 有没有作为 shipped base 的独立行？
- `SandboxedFileSystem` 围栏罩哪些方法？`readText` / `stat` / `listDir` 会不会被 `read-only` 挡住？
- `checkedTarget` 对 `read-only` / `workspace-write` / `danger-full-access` 各做什么？拒绝码是什么？
- `writableRoots` 是谁的 allow-list？为什么 workspace-write 测例外面目录必须放在 `$HOME` 下而不是 `os.tmpdir()`？
- 升权重试发生在哪一层？本包会不会挂 `tools/pre-execute` 或调用 `ctx.sandbox.confine`？
- `minimal` preset 的 `isolate.fs` 换掉的是哪一份 `ctx.fs`？host 上的 `fs-sandbox` 还在吗？

## 职责边界

本包 `@deepseek-ai/dsh-fs-sandbox` 拥有：默认 host Provider `SandboxedFileSystem`、私有方法 `checkedTarget`、以及 containment helper `isPathUnder`。它继承 `LocalFileSystem` 的 resolve / lock / 原子写 / 读，不重写那些机械。

本包**不**拥有：

- `FileSystem` 抽象、`ctx.fs` 键名、`fs/write-intent` / `fs/edit-intent` / `fs/observed` 事件声明：[subsys.execution.fs](fs.md)（`subsys.execution.fs`）。
- 本地 I/O、`cwd` 解析默认、原子 publish：[subsys.execution.fs-local](fs-local.md)（`subsys.execution.fs-local`）。`cwd` **不是** containment 边界。
- `SandboxMode` 词汇、`writableRoots` 定义、`approveEscalation` 合同：[subsys.execution.sandbox](sandbox.md)（`subsys.execution.sandbox`）。
- per-session `ctx.sandboxPolicy.resolve` 与 `sandbox/mode` fold：[subsys.execution.sandbox-policy](sandbox-policy.md)（`subsys.execution.sandbox-policy`）。
- bwrap / Landlock / Seatbelt / Windows ACL runner 选择链：[subsys.execution.sandbox-local](sandbox-local.md)（`subsys.execution.sandbox-local`）。本页只引用 Seatbelt profile 也调用同一份 `writableRoots`。
- 模型可见 `write` / `edit` 字段、body 内升权、`[sandbox: …]` 文案：[surface.tools.write](../../surface/tools/write.md)（`surface.tools.write`）/ [surface.tools.edit](../../surface/tools/edit.md)（`surface.tools.edit`）。
- 观察策略（占 `fs/write-intent` 且不 `next()`）：[subsys.execution.fs-observation](fs-observation.md)（`subsys.execution.fs-observation`）。它不是换 Provider。

**host 面 vs agent-preset 面。** `id: fs-sandbox` 与 `id: sandbox-policy` 挂在 `dsh-base` 的 root realm，会话出现之前就要 `inject`。`dsh-web-app` 把模型可见的 `tool-fs` 行 `disabled: true`，Provider 留下。默认产品路径是本地 Web GUI（`dsh web`），本仓没有 shipped TUI。只换 `ctx.fs` **不会**把 `bash -c` 搬到远程：Bash / PTY / `glob`/`grep` 吃 `ctx.subprocess`（Bash 还隔着 `ctx.shell`）。

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/fs/fs-sandbox/src/index.ts` | `SandboxedFileSystem`：inject、`sandboxMode`、围栏后的 `writeText` / `editText`、私有 `checkedTarget` |
| `packages/fs/fs-sandbox/src/containment.ts` | `isPathUnder`：词法快路径 + `dev`/`ino` 祖先回退 |
| `packages/fs/fs-sandbox/tests/fs-sandbox.spec.ts` | 三模式、symlink 逃逸、stale `targetKey`、per-call 盖章、读放行、登记可逆 |
| `packages/fs/fs-sandbox/tests/containment.spec.ts` | 相等 / 子孙 / 大小写 / 别名根 / 缺失根 |
| `packages/sandbox/sandbox/src/roots.ts` | 共用 `writableRoots` / `canonicalPath` |
| `packages/sandbox/sandbox-policy/src/index.ts` | `ctx.sandboxPolicy.defaultMode` 与 `resolve()` |
| `packages/bundle/base/cordis.patch.yml` | 真树：`id: fs-sandbox` 独占 host `ctx.fs` |
| `packages/fs/tool-fs/src/sandbox.ts` | 工具层 `resolvePolicy` / `approveEscalation` / `mapError` |
| `apps/cli/config/agent-presets/minimal/agent.cordis.yml` | `isolate.fs: true` + `dsh-fs-local` 只换该 preset 的 `ctx.fs` |

## 数据模型

| 符号 / 键 | 落点 | 含义 |
|---|---|---|
| `SandboxedFileSystem` | 本包 class，`export default` | Cordis 插件；`extends LocalFileSystem`，构造 `super(ctx, 'fs')` 后仍是唯一的 `ctx.fs`。[E: packages/fs/fs-sandbox/src/index.ts:59] [E: packages/fs/fs/src/index.ts:88] |
| `static inject` | `['sandboxPolicy']` | 等 host 的 `ctx.sandboxPolicy`。不 `inject` `sandbox` / `subprocess`。[E: packages/fs/fs-sandbox/src/index.ts:60] |
| `Config` | `export type Config = LocalConfig` | 只有 `cwd` 与 `diffBasisMaxBytes`。mode / workspace root **不**在本包 Config。[E: packages/fs/fs-sandbox/src/index.ts:49] |
| `sandboxMode` | override getter | 构造时抄下的 `ctx.sandboxPolicy.defaultMode`。这是部署默认，不是 session override，也不是这一次 call 的 mode。[E: packages/fs/fs-sandbox/src/index.ts:65] [E: packages/fs/fs-sandbox/src/index.ts:70] [E: packages/fs/fs-sandbox/tests/fs-sandbox.spec.ts:62] |
| `SandboxMode` | `@deepseek-ai/dsh-sandbox` | `'read-only' \| 'workspace-write' \| 'danger-full-access'`。网络与进程可见性在词汇外。[E: packages/sandbox/sandbox/src/index.ts:29] |
| `SandboxExecutionPolicy` | `mode` + `workspaceRoot` + 可选 `sessionId` | `writeText` / `editText` 最后一参。省略则 `checkedTarget` 调无 session 的 `resolve()`，落到部署 default。[E: packages/fs/fs-sandbox/src/index.ts:89] [E: packages/fs/fs-sandbox/src/index.ts:127] [E: packages/sandbox/sandbox-policy/src/index.ts:138] |
| `checkedTarget` | 私有方法 | 按 mode 放行或抛 `FS_SANDBOX_DENIED`；`workspace-write` 返回**新** `resolve(displayPath)` 的 target。[E: packages/fs/fs-sandbox/src/index.ts:126] |
| `FS_SANDBOX_DENIED` | `FsErrorCode` | 围栏拒绝。与 host `FS_PERMISSION_DENIED`、进程缝 `SANDBOX_UNAVAILABLE` 不是同一个码。[E: packages/fs/fs/src/types.ts:182] [E: packages/fs/fs-sandbox/src/index.ts:131] [E: packages/fs/fs-sandbox/tests/fs-sandbox.spec.ts:234] |
| `writableRoots(policy)` | `dsh-sandbox` | 仅 `workspace-write` 给出 canonical `[workspaceRoot, '/tmp', os.tmpdir()]`（去重）；其它 mode 返回 `[]`。[E: packages/sandbox/sandbox/src/roots.ts:53] [E: packages/sandbox/sandbox/src/roots.ts:54] [E: packages/sandbox/sandbox/tests/roots.spec.ts:27] |

基类 `FileSystem.sandboxMode` 返回 `undefined`；裸 `LocalFileSystem` 不 override，所以不 confine。[E: packages/fs/fs/src/index.ts:103] [E: packages/fs/fs/src/index.ts:104]

## 控制流

1. **host 真树挂上这份 Provider。** `dsh-base`@packages/bundle/base/cordis.patch.yml 在 root realm 插入 `id: sandbox-policy`（`name: '@deepseek-ai/dsh-sandbox-policy'`，默认 `mode` 来自 `DSH_PERMISSION_MODE` 否则 `'workspace-write'`），再插入 `id: fs-sandbox`（`name: '@deepseek-ai/dsh-fs-sandbox'`）。[E: packages/bundle/base/cordis.patch.yml:172] [E: packages/bundle/base/cordis.patch.yml:173] [E: packages/bundle/base/cordis.patch.yml:175] [E: packages/bundle/base/cordis.patch.yml:443] [E: packages/bundle/base/cordis.patch.yml:444] 真树**没有**并行的 `id: fs-local` 行：sandbox 包装继承 local 并独占同一 `ctx.fs` 键。同名 service 同一 realm 再挂第二个会抛。[E: packages/fs/fs/tests/service.spec.ts:100]

2. **构造：继承 local，登记 `ctx.fs`，记下部署默认 mode。** `SandboxedFileSystem`@packages/fs/fs-sandbox/src/index.ts `extends LocalFileSystem`，`static inject = ['sandboxPolicy']`。[E: packages/fs/fs-sandbox/src/index.ts:59] [E: packages/fs/fs-sandbox/src/index.ts:60] `FileSystem` 构造 `super(ctx, 'fs')` 占键；子类再 `this.defaultMode = ctx.sandboxPolicy.defaultMode`，`sandboxMode` getter 只返回这份快照。[E: packages/fs/fs/src/index.ts:88] [E: packages/fs/fs-sandbox/src/index.ts:65] [E: packages/fs/fs-sandbox/src/index.ts:70] 测试：boot `workspace-write` 后 `fs.sandboxMode === 'workspace-write'`；`dispose` 后 `ctx.get('fs')` 为 `undefined`，可再挂。[E: packages/fs/fs-sandbox/tests/fs-sandbox.spec.ts:62] [E: packages/fs/fs-sandbox/tests/fs-sandbox.spec.ts:220] [E: packages/fs/fs-sandbox/tests/fs-sandbox.spec.ts:222]

3. **模型 Consumer 在 tool body 里带上 per-call policy，不经 `tools/pre-execute`。** `dsh-tool-fs`@packages/fs/tool-fs/src/index.ts 的 `inject = ['tools', 'fs', 'systemPrompt']`。[E: packages/fs/tool-fs/src/index.ts:22] `applyWriteTool` 的 `execute`：先 `FsSandboxController.resolvePolicy('write', args, exec)`（无升权参数则 session standing policy；有则 `approveEscalation`），再 `ctx.fs.resolve`，再 `ctx.waterfall('fs/write-intent', …)`，最后 `ctx.fs.writeText(..., sandboxPolicy)`。[E: packages/fs/tool-fs/src/write.ts:107] [E: packages/fs/tool-fs/src/write.ts:111] [E: packages/fs/tool-fs/src/write.ts:114] `FsSandboxController` 在 apply 时读一次 `ctx.fs.sandboxMode`：`undefined` 则不要求 `sandboxPolicy`、不广告升权字段；已定义却拿不到 `ctx.sandboxPolicy` 则构造期抛。[E: packages/fs/tool-fs/src/sandbox.ts:44] [E: packages/fs/tool-fs/src/sandbox.ts:48] 升权 grant 只有 `'allowed-once'`，通过后把更宽 `mode` 盖到**这一次** policy 上，不是改 `sandboxMode` getter。[E: packages/fs/tool-fs/src/sandbox.ts:97] [E: packages/fs/tool-fs/src/sandbox.ts:107] [E: packages/sandbox/sandbox/src/escalation.ts:183]

4. **`fs/write-intent` waterfall 与围栏正交，必须有人 `next()` 才会 `shift`。** `Events.waterfall`@vendor/cordis/src/events.ts 把最后一个参数当 innermost：每次 `next()` 才 `cbs.shift()`；不调用则剩余 listener 与内建行为都到不了。[E: vendor/cordis/src/events.ts:237] [E: vendor/cordis/src/events.ts:238] tool-fs 传入的 innermost 是 `() => undefined`（无条件 write）。[E: packages/fs/tool-fs/src/write.ts:111] `fs-observation-policy` 的 `apply(ctx)` 对 `fs/write-intent` / `fs/edit-intent` `ctx.on` 且**不**把 `next` 传进 gate——占单槽，卸掉插件后 provider 回到无条件 write/edit。[E: packages/fs/fs-observation-policy/src/index.ts:119] [E: packages/fs/fs-observation-policy/src/index.ts:122] `SandboxedFileSystem` 不订阅这些事件。围栏发生在 waterfall **之后**的 `writeText` / `editText`。

5. **只有两条 mutation 进围栏；读全部继承。** `writeText` / `editText` 先 `await this.checkedTarget(target, sandboxPolicy)`，再 `super.*`——最后一参 **不**传给 `LocalFileSystem`（local 的 `writeText` 最后一参是 `signal`，没有 `sandboxPolicy`）。[E: packages/fs/fs-sandbox/src/index.ts:91] [E: packages/fs/fs-sandbox/src/index.ts:112] [E: packages/fs/fs-local/src/index.ts:170] 本类不再 override `readText` / `stat` / `listDir`。`read-only` 测例：`writeText` / `editText` 抛 `FS_SANDBOX_DENIED` 且盘上无新文件 / 原文不变；同文件 `readText` 返回 `'hello'`。[E: packages/fs/fs-sandbox/tests/fs-sandbox.spec.ts:71] [E: packages/fs/fs-sandbox/tests/fs-sandbox.spec.ts:79] [E: packages/fs/fs-sandbox/tests/fs-sandbox.spec.ts:80] [E: packages/fs/fs-sandbox/tests/fs-sandbox.spec.ts:86]

6. **`checkedTarget` 三分支。** `policy = sandboxPolicy ?? this.ctx.sandboxPolicy.resolve()`（无 session → 部署 default，**不**读该会话的 `sandbox/mode` 覆盖）。[E: packages/fs/fs-sandbox/src/index.ts:127] [E: packages/sandbox/sandbox-policy/src/index.ts:138]
   - `danger-full-access`：原样 `return target`，不重 resolve，不看 `writableRoots`。[E: packages/fs/fs-sandbox/src/index.ts:129] 测例：workspace 外的绝对路径写成功。[E: packages/fs/fs-sandbox/tests/fs-sandbox.spec.ts:192]
   - `read-only`：立刻 `throw new FsError(..., 'FS_SANDBOX_DENIED')`。[E: packages/fs/fs-sandbox/src/index.ts:131]
   - 其余（类型上即 `workspace-write`）：`const fresh = await this.resolve(target.displayPath)`，对 `writableRoots(policy)` 逐个 `isPathUnder(fresh.targetKey, root)`；无一命中则同样抛 `FS_SANDBOX_DENIED`；命中则 `return fresh`。[E: packages/fs/fs-sandbox/src/index.ts:136] [E: packages/fs/fs-sandbox/src/index.ts:138] [E: packages/fs/fs-sandbox/src/index.ts:139] [E: packages/fs/fs-sandbox/src/index.ts:145] [E: packages/fs/fs-sandbox/src/index.ts:147]

7. **`workspace-write` 用新鲜 identity 做 containment，并拿这份 identity 去写。** `LocalFileSystem.resolve` 调 `resolveLocalTarget`：已存在则 `realpath` 目标；缺失则 realpath 最近祖先再拼回后缀——所以 workspace 内 symlink 指到外面时，`targetKey` 已经在外面。[E: packages/fs/fs-local/src/index.ts:108] [E: packages/fs/fs-local/src/fsio.ts:151] 测例：`workspace/link → outside` 上写 `link/f.txt` 或 `link/newdir/deep.txt` 都被拒，outside 不出现文件。[E: packages/fs/fs-sandbox/tests/fs-sandbox.spec.ts:122] [E: packages/fs/fs-sandbox/tests/fs-sandbox.spec.ts:129] 另一测例把 `displayPath` 放在 workspace 内、把 `targetKey` 伪造成 outside：围栏按 `displayPath` 重 resolve，字节落在 inside，outside 无文件。[E: packages/fs/fs-sandbox/tests/fs-sandbox.spec.ts:157] [E: packages/fs/fs-sandbox/tests/fs-sandbox.spec.ts:158] [E: packages/fs/fs-sandbox/tests/fs-sandbox.spec.ts:159] `..` 逃出与 workspace 外绝对路径同样 `FS_SANDBOX_DENIED`。[E: packages/fs/fs-sandbox/tests/fs-sandbox.spec.ts:108] [E: packages/fs/fs-sandbox/tests/fs-sandbox.spec.ts:114]

8. **allow-list 是 `writableRoots`，不是本包 Config。** `workspace-write` 授予 canonical 的 workspace 根、`/tmp`、`os.tmpdir()`。[E: packages/sandbox/sandbox/src/roots.ts:54] [E: packages/sandbox/sandbox/tests/roots.spec.ts:32] 因此测「外面」目录时把 fixture 放在 `$HOME` 下：放进 `tmpdir()` 会被合法放行。[E: packages/fs/fs-sandbox/tests/fs-sandbox.spec.ts:43] [E: packages/fs/fs-sandbox/tests/fs-sandbox.spec.ts:102] Seatbelt profile 也 `const roots = writableRoots(policy)`，两家不会各写一份根。[E: packages/sandbox/sandbox-local/src/profiles.ts:53] `isPathUnder` 先做（可关大小写的）词法前缀；对不上再 `stat` 根与目标祖先的 `dev`/`ino`。[E: packages/fs/fs-sandbox/src/containment.ts:63] [E: packages/fs/fs-sandbox/src/containment.ts:71] 测例：路径相等 / 子孙为真；symlink 别名根下的缺失文件为真；无关目录与缺失根为假。[E: packages/fs/fs-sandbox/tests/containment.spec.ts:23] [E: packages/fs/fs-sandbox/tests/containment.spec.ts:24] [E: packages/fs/fs-sandbox/tests/containment.spec.ts:38] [E: packages/fs/fs-sandbox/tests/containment.spec.ts:46] [E: packages/fs/fs-sandbox/tests/containment.spec.ts:47]

9. **拒绝是结构化 `FsError`；模型文案在 tool 层。** 围栏抛出的对象 `instanceof FsError` 且 `code === 'FS_SANDBOX_DENIED'`。[E: packages/fs/fs-sandbox/tests/fs-sandbox.spec.ts:233] [E: packages/fs/fs-sandbox/tests/fs-sandbox.spec.ts:234] `FsSandboxController.mapError` 把它换成带 `[sandbox: …]` + 升权 hint 的同码 `FsError`；其它错误原样返回。[E: packages/fs/tool-fs/src/sandbox.ts:125] [E: packages/fs/tool-fs/src/sandbox.ts:129] 本包**不**抛 `SANDBOX_UNAVAILABLE`：那个码属于 `ctx.sandbox.confine` 找不到 runner。本包也**从不**调用 `confine`。

10. **per-call 盖章只活在这一次 mutation。** 部署 `read-only` 时传入 `{ mode: 'workspace-write', workspaceRoot }` 可让 contained 路径落地；紧接着不带最后一参的邻居 `writeText` 仍按 default 拒绝。[E: packages/fs/fs-sandbox/tests/fs-sandbox.spec.ts:202] [E: packages/fs/fs-sandbox/tests/fs-sandbox.spec.ts:206] `danger-full-access` 盖章则连 workspace 外也写成功。[E: packages/fs/fs-sandbox/tests/fs-sandbox.spec.ts:212]

11. **preset 面只换 Consumer 或隔离另一份 `ctx.fs`。** `dsh-web-app` 写 `id: tool-fs` / `disabled: true`，不碰 `fs-sandbox`。[E: packages/bundle/web-app/cordis.patch.yml:312] [E: packages/bundle/web-app/cordis.patch.yml:313] `minimal` 用 `cordis:group` + `isolate.fs: true` 再挂 `id: fs-local` / `@deepseek-ai/dsh-fs-local`：只给加入该 preset 的 agent 一份不 confine 的 `ctx.fs`；host 上的 `fs-sandbox` 仍给别的会话。[E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:51] [E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:52] [E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:54] [E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:55]

## 设计动机

- **围栏贴在 mutation 原语上，而不是 `tools/pre-execute`。** 换 Consumer（另一套 tool 名、Code Mode SDK、直调 `ctx.fs`）也走同一条 `checkedTarget`。官方管线图若把 sandbox 画进 pre-execute，跟这份可执行源不一致。
- **可信代码 + 模型控制的路径：canonicalize-then-contain 就是这一面的完整答案。** 打开 / rename 的是 seam 自己；不信任的是 target。进程里跑的不可信代码归 `ctx.shell` + `ctx.sandbox.confine`（`dsh-bash-sandbox` / `dsh-pwsh-sandbox`）。
- **继承 local，只加两条 override。** 原子写、按 `targetKey` 串行锁、symlink 跟随写目标，全部留在 `LocalFileSystem`。围栏失败时 local 还没跑，所以 `read-only` / 逃逸路径在盘上零副作用。
- **一份 `writableRoots`，避免「write 工具不能写 /tmp 但 bash 能」。** fs 围栏与 Seatbelt profile 都从 `dsh-sandbox` 派生 allow-list。bwrap / Landlock 的拼写差异是 runner 页的事。
- **结构化拒绝，不靠 stderr 猜。** 进程围栏要从 runner 方言里抠 denial；in-process 围栏自己知道拒了什么。
- **相对 Codex / Claude / Pi。** Codex 是 OS sandbox，还带网络 / 进程面；DSH 这一缝的 `SandboxMode` 只罩文件副作用，`danger-full-access` 在本包是显式不围栏，不是静默退回 host。Pi 没有 in-core 执行沙箱。Claude 的 hooks 也不挂在这条 `ctx.fs` 上。

## Gotcha

- **读从来不被这个 mode 挡住。** `read-only` 的意思是「禁止本缝的 write/edit」，不是「文件对模型不可见」。
- **`cwd` 不是围栏。** `LocalFileSystem` 的 `cwd` 只解析相对路径。containment 看 `writableRoots` + `isPathUnder`。
- **省略最后一参 ≠ session 政策。** 直调 `ctx.fs.writeText(target, content)` 走 `sandboxPolicy.resolve()` 无 session，用部署 `defaultMode`。session override 必须由 Consumer 先 `resolve({ session })` 再传入。
- **`danger-full-access` 连重 resolve 都跳过。** 它返回调用方手里那份 `target`。stale-`targetKey` 测例只覆盖 `workspace-write`。
- **`workspace-write` 含平台临时区。** 把「应该被拒」的路径放进 `os.tmpdir()` / `/tmp` 会假绿。
- **本包不 fail 成 `SANDBOX_UNAVAILABLE`，也不静默裸跑。** 拒绝是 `FS_SANDBOX_DENIED`。`confine` 找不到 runner 才是 `SANDBOX_UNAVAILABLE`，而且那是 bash/pwsh 的路。
- **围栏不是 kernel。** 本进程里另一段可信代码仍可直接 `node:fs` 写盘。祖先 symlink 在「重 resolve」与「syscall」之间被换掉的残余 TOCTOU，源码按威胁模型接受；测例钉死的是「委托必须用 fresh target」这一方向。[I]
- **同一 realm 不能同时挂 `fs-sandbox` 与 `fs-local`。** `minimal` 靠 `isolate.fs: true` 另开一份。漏 isolate 会被 `mountPreset` 当泄漏拒绝。
- **`glob` / `grep` 不走 `ctx.fs`。** 换这份 Provider 不会改 ripgrep 的世界。

## Seam 三角

| 角色 | 包 / 符号 | `ctx` 键 | bundle / preset 行 |
|---|---|---|---|
| **Definition** | `@deepseek-ai/dsh-fs` `FileSystem` `super(ctx, 'fs')`；`writeText`/`editText` 末参 `sandboxPolicy` | `ctx.fs` | shipped **不**挂 Definition 包本身 |
| **Provider（默认 host）** | `@deepseek-ai/dsh-fs-sandbox` `SandboxedFileSystem`；`inject = ['sandboxPolicy']` | 仍是 `ctx.fs`（独占） | `dsh-base` `id: fs-sandbox` |
| **政策输入（并列 host）** | `@deepseek-ai/dsh-sandbox-policy` `SandboxPolicyService` | `ctx.sandboxPolicy` | `dsh-base` `id: sandbox-policy` |
| **allow-list 定义** | `@deepseek-ai/dsh-sandbox` `writableRoots` | 无独立键 | 被 fs 围栏与 Seatbelt profile 调用 |
| **Consumer（模型面）** | `@deepseek-ai/dsh-tool-fs` `inject = ['tools', 'fs', 'systemPrompt']` | 读 `ctx.fs`，不 `provide` | base 列出 `id: tool-fs`；`dsh-web-app` `disabled: true`；preset 按会话挂回 |
| **升权（tool body，非 pre-execute）** | `FsSandboxController` + `approveEscalation` | 可选 `ctx.approval` | grant 仅 `allowed-once` |
| **Companion（不是 Provider）** | `dsh-fs-observation-policy` `apply`：占 `fs/write-intent` / `fs/edit-intent`，不 `next()` | 无 `ctx.*` 键 | `dsh-base` `id: fs-observation-policy` |
| **例外 Provider（preset 隔离）** | `@deepseek-ai/dsh-fs-local` | 该 realm 的 `ctx.fs` | `minimal` `isolate.fs: true` + `id: fs-local`；host `fs-sandbox` 仍在 |

## Sources

- packages/fs/fs-sandbox/src/index.ts
- packages/fs/fs-sandbox/src/containment.ts
- packages/fs/fs-sandbox/tests/fs-sandbox.spec.ts
- packages/fs/fs-sandbox/tests/containment.spec.ts
- packages/sandbox/sandbox/src/roots.ts
- packages/sandbox/sandbox/src/index.ts
- packages/sandbox/sandbox/src/escalation.ts
- packages/sandbox/sandbox/tests/roots.spec.ts
- packages/sandbox/sandbox-policy/src/index.ts
- packages/sandbox/sandbox-local/src/profiles.ts
- packages/fs/fs/src/index.ts
- packages/fs/fs/src/types.ts
- packages/fs/fs/tests/service.spec.ts
- packages/fs/fs-local/src/index.ts
- packages/fs/fs-local/src/fsio.ts
- packages/fs/tool-fs/src/index.ts
- packages/fs/tool-fs/src/write.ts
- packages/fs/tool-fs/src/sandbox.ts
- packages/fs/fs-observation-policy/src/index.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/web-app/cordis.patch.yml
- apps/cli/config/agent-presets/minimal/agent.cordis.yml
- vendor/cordis/src/events.ts

## 相关

- [spine.overview](../../spine/overview.md)（`spine.overview`）：组合主线与 host / preset 切面。
- [spine.tool-call-anatomy](../../spine/tool-call-anatomy.md)（`spine.tool-call-anatomy`）：`tools/pre-execute → execute → body`；sandbox 不挂 pre-execute。
- [spine.capability-seams](../../spine/capability-seams.md)（`spine.capability-seams`）：Definition / Provider / Consumer；`ctx.fs` 与 `ctx.subprocess` 无运行时耦合。
- [subsys.execution.fs](fs.md)（`subsys.execution.fs`）：`FileSystem` 原语与 `fs/*` 事件。
- [subsys.execution.fs-local](fs-local.md)（`subsys.execution.fs-local`）：被继承的本地 backend；`minimal` 隔离挂的那一份。
- [subsys.execution.fs-observation](fs-observation.md)（`subsys.execution.fs-observation`）：占 intent 槽且不 `next()` 的 companion。
- [subsys.execution.sandbox-policy](sandbox-policy.md)（`subsys.execution.sandbox-policy`）：`ctx.sandboxPolicy.resolve` 与 session mode。
- [subsys.execution.sandbox](sandbox.md)（`subsys.execution.sandbox`）：`SandboxMode`、`approveEscalation`、`writableRoots` 合同。
- [subsys.execution.sandbox-local](sandbox-local.md)（`subsys.execution.sandbox-local`）：`ctx.sandbox.confine` 的 runner 链。
- [surface.tools.write](../../surface/tools/write.md)（`surface.tools.write`）：模型可见 write 与升权参数。
- [surface.tools.edit](../../surface/tools/edit.md)（`surface.tools.edit`）：模型可见 edit。
- [surface.presets.minimal](../../surface/presets/minimal.md)（`surface.presets.minimal`）：`isolate.fs` + `dsh-fs-local`。
- [surface.misc.security](../../surface/misc/security.md)（`surface.misc.security`）：审批与沙箱产品面（index 仍 planned）。
- [subsys.composition.bundle-base](../composition/bundle-base.md)（`subsys.composition.bundle-base`）：`dsh-base` 真树。
