---
id: subsys.composition.cmdline
title: cmdline 启动胶
kind: subsystem
tier: T2
pkg: composition
source:
  - packages/boot/cmdline/src/index.ts
  - packages/boot/cmdline/src/invariant.ts
  - packages/boot/cmdline/package.json
  - packages/boot/cmdline/tests/cmdline.spec.ts
  - apps/cli/src/args.ts
  - apps/cli/src/bin.ts
  - apps/cli/src/profile-boot.ts
  - apps/cli/src/process-shutdown.ts
  - apps/cli/src/dump-config.ts
  - apps/cli/package.json
  - apps/cli/tests/args.spec.ts
  - packages/boot/app-boot/src/index.ts
  - packages/boot/app-boot/src/profile.ts
  - packages/bundle/web-app/src/startup.ts
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/web-app/package.json
  - packages/bundle/web-app/tests/startup.spec.ts
  - packages/bundle/headless/src/startup.ts
  - packages/bundle/headless/src/index.ts
  - packages/bundle/headless/cordis.patch.yml
  - packages/bundle/headless/tests/startup.spec.ts
  - packages/preset/agent-presets/src/mount.ts
  - packages/bundle/base/tests/base.spec.ts
  - vendor/cordis/src/events.ts
  - vendor/cordis/src/reflect.ts
symbols:
  - provideCmdline
  - parseCmdline
  - ctx.cmdlineArgs
  - ctx.appExit
related:
  - spine.composition-boot
  - surface.cli.overview
  - subsys.composition.app-boot
  - spine.overview
  - surface.profiles.web
  - surface.profiles.headless
  - spine.capability-seams
evidence: explicit
status: verified
updated: 47f943859b
---

> `@deepseek-ai/dsh-cmdline` 是 **host 面**启动胶：launcher 只切开 `--profile` / `--patch` / dump，把其余 argv 冻成 `ctx.cmdlineArgs`；树内 app 用自己的 commander 调 `parseCmdline`，help / version / 语法错走 `ctx.appExit`，不 `process.exit`。

DSH 是 Cordis 组合运行时（`profile → bundle → agent preset`），不是「又一个 coding agent」的固定 CLI。capability seam 是 Definition / Provider / Consumer。本胶坐在 **host 面**（进程级：和 webserver / persistence / sandbox / subagent **backends** 同一层），不进 agent-preset 的 tools / persona / isolate 树。默认产品路径是本地 Web GUI（`dsh web`），本仓没有 shipped TUI 包。`cmdlineArgs` 本身不是模型可见内容；模型看见的消息必须能从 session log 重建（`model-visible ⟺ logged`），那是 loop / session 的合同。

## 能回答的问题

- `dsh` launcher 自己吃哪些 token？第一个它不认识的 token 之后去哪？
- `provideCmdline` 在哪一层、相对 Loader 树行的什么时刻挂上？为什么 dump / plugin 路径不挂？
- `parseCmdline` 的 help / version / `program.error` 为什么走 `ctx.appExit` 而不是 `process.exit`？
- `isCommanderError` 为什么必须结构性检测，不能 `instanceof CommanderError`？
- `--host` / `--port` 和 headless task positional 是谁的旗标？本胶会不会把它们收成 launcher option？
- 把 `cmdlineArgs` / `webStartup` 再挂进 preset、不写 `isolate`，撞的是 `already registered` 还是 `leakedServices`？

## 职责边界

本包 `@deepseek-ai/dsh-cmdline` 拥有： [E: packages/boot/cmdline/package.json:2]

- `provideCmdline`：在任何 Loader 树行挂上之前，把 inner argv 冻成只读快照并 `provide('cmdlineArgs')` / `provide('appExit')`。 [E: packages/boot/cmdline/src/index.ts:68] [E: packages/boot/cmdline/src/index.ts:70] [E: packages/boot/cmdline/src/index.ts:71]
- `parseCmdline`：用 app 自己的 commander 解析那份快照；成功则跑 action（app 在 action 里 `provide` 自己的服务）；help / version / 语法错 / `program.error` 请求 `ctx.appExit`。 [E: packages/boot/cmdline/src/index.ts:98] [E: packages/boot/cmdline/src/index.ts:117]
- Context 合并：`ctx.cmdlineArgs?`、`ctx.appExit?`（都是 optional host 值）。 [E: packages/boot/cmdline/src/index.ts:47] [E: packages/boot/cmdline/src/index.ts:49]
- 测试可替换的 `internals.stdout` / `internals.stderr`，以及包内 `isCommanderError` / `hasAction` / `configureExitAndOutput`（后三个不导出）。

本包 **不** 拥有：

- launcher 语法与三种 `DshInvocation` mode 的完整旗标表 — [surface.cli.overview](../../surface/cli/overview.md)。本页只写「切开」和「交接」。
- `boot` / `loadProfile` / `composeEntries` / 空 `cordis.yml` — [subsys.composition.app-boot](./app-boot.md)。
- web `--host` / `--port` / `--trusted-host` 语义与 bind 安全门 — [surface.profiles.web](../../surface/profiles/web.md)。
- headless task 空串拒绝、runner `whenIdle`、退出码按 `turn/end` — [surface.profiles.headless](../../surface/profiles/headless.md)。
- `createProcessShutdown` 的 5s grace / SIGINT 130 — launcher 只把 `shutdown.shutdown` 塞进 `AppExit`。 [E: apps/cli/src/profile-boot.ts:257]
- preset 发现、`mountPreset`、`leakedServices` 实现 — roster 节点。本页只写：cmdline 是 host 事实，shipped `agent.cordis.yml` 没有这行。
- 模型可见工具字段、`dsh-base` 行表。`dsh-base` **没有** `subagent-codex` / `subagent-claude-code` 行，也不是「装了但 dormant」：`base.spec.ts` 要求这两行长度为 0，且 manifest 不依赖对应包。 [E: packages/bundle/base/tests/base.spec.ts:38] [E: packages/bundle/base/tests/base.spec.ts:39] [E: packages/bundle/base/tests/base.spec.ts:40] [E: packages/bundle/base/tests/base.spec.ts:41]
- 任何 `Events.waterfall` listener。本包不挂 `agent/*` / `tools/*` / `system-prompt/*`。

companion `./invariant` 的 installer 是空函数：`cmdlineArgs` 是不可变 launcher 事实，缺依赖由 Loader settlement 报，不另做 runtime 断言。 [E: packages/boot/cmdline/src/invariant.ts:22]

## 关键文件

| 路径 | 角色 |
|---|---|
| `packages/boot/cmdline/src/index.ts` | `provideCmdline` / `parseCmdline` / `CmdlineArgs` / `AppExit` |
| `packages/boot/cmdline/src/invariant.ts` | 空 invariant companion，占 `@deepseek-ai/dsh-cmdline` |
| `packages/boot/cmdline/tests/cmdline.spec.ts` | 真 Loader 树：flag 赢过 `!!js` 默认、help 不启动 consumer、快照不可变 |
| `apps/cli/src/args.ts` | `parseDshArgs`：launcher 旗标边界，inner argv 进 `ProfileInvocation.args` |
| `apps/cli/src/bin.ts` | `profile` → `runProfile({ args })`；`plugin` / `dump-config` 不挂本胶 |
| `apps/cli/src/profile-boot.ts` | `boot` 的 `prepare` 里调用 `provideCmdline`，`exit` 接到 `shutdown.shutdown` |
| `apps/cli/src/process-shutdown.ts` | `AppExit` 的实现：先 dispose 再记 `exitCode` |
| `apps/cli/src/dump-config.ts` | dump **不** `boot`，因此没有 `cmdlineArgs` |
| `packages/boot/app-boot/src/index.ts` | `prepare` 在 `mountRootInclude` 之前跑 |
| `packages/boot/app-boot/src/profile.ts` | `PROFILE_TEMPLATES` 只有 `web` / `headless` |
| `packages/bundle/web-app/src/startup.ts` | Consumer：`inject: ['cmdlineArgs']`，action `provide('webStartup')` |
| `packages/bundle/headless/src/startup.ts` | Consumer：action `provide('headlessStartup')` |
| `packages/bundle/headless/src/index.ts` | runner 用 `ctx.get('appExit')`，不把它写进 `inject` |
| `packages/preset/agent-presets/src/mount.ts` | `leakedServices`：preset 把服务写进 root realm 则拒 |
| `vendor/cordis/src/events.ts` | `waterfall`：不调传入的 `next()` 就不会 `shift` |
| `vendor/cordis/src/reflect.ts` | `provide`：root isolate 符号；同名二次注册抛错 |

## 数据模型

四个名字不要混：包 `@deepseek-ai/dsh-cmdline`、服务键 `cmdlineArgs` / `appExit`、launcher 字段 `DshInvocation.args`、app 自己再 `provide` 的 `webStartup` / `headlessStartup`。

| 符号 | 字段 | 含义 |
|---|---|---|
| `CmdlineArgs` | `get(): readonly string[]` | inner argv 快照；调用方数组事后 `push` 看不见 |
| `AppExit` | `(code: number) => void` | 请求「树 dispose 之后」退出；不是立刻 `process.exit` |
| `CmdlineHost` | `args`, `exit` | `provideCmdline` 的入参 |
| `ProfileInvocation.args` | `string[]` | launcher 切开后原样交给 `runProfile` 的那段 |
| `Context.cmdlineArgs?` | optional | 类型是 optional，所以 `parseCmdline` 走 `ctx.get`，不走属性代理 |
| `Context.appExit?` | optional | 同样 optional；**不要**写进 `export const inject` |

`provideCmdline` 做 `Object.freeze([...host.args])`，`get()` 永远返回同一份冻结数组。 [E: packages/boot/cmdline/src/index.ts:69] [E: packages/boot/cmdline/tests/cmdline.spec.ts:187] [E: packages/boot/cmdline/tests/cmdline.spec.ts:230]

`dsh-cmdline` 对 commander 只 `import type { Command }`；运行时 `Command` 实例由 app 传入。web-app / headless 各自依赖自己的 `commander` 副本。 [E: packages/boot/cmdline/src/index.ts:19] [E: packages/bundle/web-app/package.json:105]

## 控制流

```mermaid
flowchart TD
  Argv["process.argv.slice 2"] --> Parse["parseDshArgs"]
  Parse -->|help/version/error| LExit["process.exit CommanderError"]
  Parse -->|plugin| Pnpm["runPlugin 不挂 cmdline"]
  Parse -->|dump-config| Dump["runDumpConfig 不 boot"]
  Parse -->|profile| Run["runProfile"]
  Run --> Boot["boot prepare"]
  Boot --> Provide["provideCmdline freeze args + appExit"]
  Provide --> Mount["mountRootInclude 树行"]
  Mount --> Startup["web-startup / headless-startup inject cmdlineArgs"]
  Startup --> ParseApp["parseCmdline program.parse from user"]
  ParseApp -->|action ok| Pub["provide webStartup / headlessStartup"]
  ParseApp -->|help/error| AppExit["ctx.appExit = shutdown.shutdown"]
  Pub --> Consumer["webserver / headless-runner !!js 读服务"]
  AppExit --> Dispose["fiber.dispose 再记 exitCode"]
```

1. `parseDshArgs@apps/cli/src/args.ts` 只认识 launcher 自己的 token：`--profile`、可重复非 variadic 的 `--patch`、`--dump-config` / `--dump-default-config`、子命令 `web` / `plugin`、以及根上的 `-V`。`helpOption(false)` + `allowUnknownOption` + `passThroughOptions` + `enablePositionalOptions`：第一个它不认识的 token 起全部进入 leftover，包括 app 的 `-h`。`dsh web` 的 action 把 profile 写成 `'web'`，仍是 `mode: 'profile'`（带 dump 旗标时变成 `mode: 'dump-config'`）。无 `--profile` 且 leftover 也不是 launcher help 则 `program.error`。 [E: apps/cli/src/args.ts:126] [E: apps/cli/src/args.ts:127] [E: apps/cli/src/args.ts:128] [E: apps/cli/src/args.ts:129] [E: apps/cli/src/args.ts:168] [E: apps/cli/src/args.ts:140]

2. leftover 原样成为 `ProfileInvocation.args`。测试钉死：`['web', '--host', '127.0.0.1', '--port', '8080', '--dev']` 的 `args` 含这三项；`['--profile', 'headless', 'run', 'the', 'tests']` 的 `args` 是 `['run', 'the', 'tests']`；边界之后再出现的 `--patch` 也归 app。`--host` / `--port` / headless task **不是** launcher 旗标，本页不展开成 option 表。 [E: apps/cli/src/args.ts:87] [E: apps/cli/tests/args.spec.ts:40] [E: apps/cli/tests/args.spec.ts:42] [E: apps/cli/tests/args.spec.ts:45]

3. launcher 自己的 help / version / 语法错在树还不存在时发生，所以 `parseDshArgs` 用 `instanceof CommanderError` 然后 `process.exit`。这和树内 `parseCmdline` 的退出路径不是同一条。 [E: apps/cli/src/args.ts:186]

4. `bin.ts` 的 `switch`：`mode: 'profile'` 把 `invocation.args` 传给 `runProfile`；`plugin` 把剩余 argv 转给 pnpm 并 `process.exit`；`dump-config` 调 `runDumpConfig`。`runDumpConfig` 只 `prepareProfile` 再 `renderConfigDump` 写 stdout，函数体没有 `boot` / `provideCmdline`。后两条永远不会挂本胶。 [E: apps/cli/src/bin.ts:36] [E: apps/cli/src/bin.ts:42] [E: apps/cli/src/dump-config.ts:31] [E: apps/cli/src/dump-config.ts:51]

5. `boot@packages/boot/app-boot/src/index.ts`：`new Context` → `provide('dshHomePath')` → `ctx.plugin(Loader)` → **`await prepare?.(ctx)`** → 然后才 `mountRootInclude`。`runProfile` 的 `prepare` 在这一刀里调用 `provideCmdline(hostCtx, { args: options.args, exit: code => void shutdown.shutdown(code) })`。树行此时还没挂，所以 `inject: ['cmdlineArgs']` 的 startup 行不会 pending 在一个还不存在的服务上。 [E: packages/boot/app-boot/src/index.ts:772] [E: packages/boot/app-boot/src/index.ts:774] [E: apps/cli/src/profile-boot.ts:255] [E: apps/cli/src/profile-boot.ts:257]

6. `provide` 是可逆 `fiber.effect`：在当前 isolate 表占名；host 根上 `root[symbols.isolate][name] ??= Symbol(name)`；同名二次 `provide` 抛 `service "<name>" has been registered at <…>`。`cmdlineArgs` / `appExit` 没有对应的 `cordis.patch.yml` 行，也没有 `isolate:`——它们是 launcher 写进 root realm 的事实，不是 bundle insert。 [E: vendor/cordis/src/reflect.ts:278] [E: vendor/cordis/src/reflect.ts:286] [E: vendor/cordis/src/reflect.ts:290]

7. **host 组合里的 Consumer。** `dsh-web-app` insert `id: web-startup`（`name: '@deepseek-ai/dsh-web-app/startup'`），插件 `inject = ['cmdlineArgs']`，action 里 `ctx.provide('webStartup', …)`，最后 `parseCmdline(ctx, program)`。`id: webserver` `inject: [webStartup]`，`config.host` / `config.port` 是 `!!js ctx.webStartup.host ?? '127.0.0.1'` / `ctx.webStartup.port ?? 3080`——旗标赢过写在旁边的部署默认。`dsh-headless` 对称：`id: headless-startup` inject `cmdlineArgs`；`id: headless-runner` inject `headlessStartup`，`task: !!js ctx.headlessStartup.task`。headless **不** insert `agent-presets`，工具留在 host 全局层。 [E: packages/bundle/web-app/src/startup.ts:17] [E: packages/bundle/web-app/src/startup.ts:81] [E: packages/bundle/web-app/cordis.patch.yml:107] [E: packages/bundle/web-app/cordis.patch.yml:117] [E: packages/bundle/web-app/cordis.patch.yml:119] [E: packages/bundle/web-app/cordis.patch.yml:120] [E: packages/bundle/headless/src/startup.ts:16] [E: packages/bundle/headless/src/startup.ts:56] [E: packages/bundle/headless/cordis.patch.yml:27] [E: packages/bundle/headless/cordis.patch.yml:33] [E: packages/bundle/headless/cordis.patch.yml:35]

8. `parseCmdline@packages/boot/cmdline/src/index.ts` 用 `ctx.get('cmdlineArgs')` / `ctx.get('appExit')`，缺任一就抛 `the launcher must provide ctx.cmdlineArgs and ctx.appExit before the tree mounts`。`appExit` 是 optional host 值，不写进 `export const inject`，只 `ctx.get`。然后 `hasAction` 结构性读 `_actionHandler`：程序忘了 action 的话 parse 会「成功」却谁也不 `provide`，下游行永远 pending。`configureExitAndOutput` 对**已经注册的子命令**也套 `exitOverride` + 把输出改到 `internals`——只配 root 的话，子命令拒绝会自己 `process.exit`，绕开 `ctx.appExit`。 [E: packages/boot/cmdline/src/index.ts:101] [E: packages/boot/cmdline/src/index.ts:102] [E: packages/boot/cmdline/src/index.ts:104] [E: packages/boot/cmdline/src/index.ts:107] [E: packages/boot/cmdline/src/index.ts:133] [E: packages/boot/cmdline/src/index.ts:148] [E: packages/boot/cmdline/tests/cmdline.spec.ts:215]

9. `program.parse(args.get(), { from: 'user' })`。commander 在 `exitOverride` 下把 help / version / 语法错 / action 的 `program.error()` 变成带 `code: 'commander.*'` 与 `exitCode` 的对象。`isCommanderError` **不** `instanceof`：只检查 `code` 是以 `commander.` 开头的 string，且 `exitCode` 是 number。out-of-tree 插件自带另一份 commander，`CommanderError` 类身份不同；身份检查会把已经打印过的 `--help` 重抛成 fatal load failure。非 commander 抛出原样 rethrow（测试钉死 `Error` 和裸 string）。命中则 `exit(error.exitCode)`，接到 `shutdown.shutdown`：`start(code, false)` 先 `dispose`，再 `completeOnce` → 默认 `complete` 写 `process.exitCode`，不是立刻 `process.exit`。 [E: packages/boot/cmdline/src/index.ts:111] [E: packages/boot/cmdline/src/index.ts:116] [E: packages/boot/cmdline/src/index.ts:170] [E: packages/boot/cmdline/src/index.ts:171] [E: apps/cli/src/process-shutdown.ts:66] [E: apps/cli/src/process-shutdown.ts:67] [E: apps/cli/src/process-shutdown.ts:58] [E: apps/cli/src/process-shutdown.ts:25]

10. **成功 parse 才 publish。** fixture / web / headless 都在 action 里 `provide`。`--help` 不跑 action：web 测试里 `webStartup` 为 `undefined`、reader 行不启动、`exits === [0]`；`--port abc` / `--host 0.0.0.0` 同样不 publish，`exits === [1]`。headless 空 task / 纯空白 / `--help` 同理，runner 的 `!!js` 配置永远评不到。无旗标时 web action 仍 publish `{ trustedHosts: [] }`，consumer 用 `??` 回落到 `127.0.0.1:3080`。 [E: packages/boot/cmdline/tests/cmdline.spec.ts:145] [E: packages/bundle/web-app/tests/startup.spec.ts:119] [E: packages/bundle/web-app/tests/startup.spec.ts:121] [E: packages/bundle/web-app/tests/startup.spec.ts:129] [E: packages/bundle/headless/tests/startup.spec.ts:94] [E: packages/bundle/headless/tests/startup.spec.ts:96] [E: packages/bundle/headless/tests/startup.spec.ts:104]

11. **waterfall 必须 `next()`。** `@deepseek-ai/dsh-cmdline` 自己不注册任何 `Events.waterfall` listener。`parseCmdline` 是同步 `program.parse`，不是 waterfall。组合运行时里其它事件（`system-prompt/assemble`、`agent/request`、`tools/pre-execute`）走 `Events.waterfall`：最后一个参数是 innermost `next`；listener 不调用传入的 `next()` 就不会 `cbs.shift()`，内层 listener 和 inner seed 全部停住。cmdline 的排序靠的是 Loader **inject 门**（startup 等 `cmdlineArgs`，webserver / runner 等 app 服务），不是 `next()`。漏掉 `next()` 不会让 `parseCmdline` 假成功，但会让已经 boot 起来的 turn 停在那一层。 [E: vendor/cordis/src/events.ts:234] [E: vendor/cordis/src/events.ts:238] [E: vendor/cordis/src/events.ts:242]

12. **isolate / `leakedServices`。** `provideCmdline` 写的是 root realm。preset 再 `provide('cmdlineArgs')` 且不 `isolate: { cmdlineArgs: true }`：host 已占 root 符号，二次 `provide` 先抛 already registered。preset 若 `provide` 一个 host 还没有的名字（例如把 `web-startup` 整行搬进 `agent.cordis.yml` 且不 isolate `webStartup`），`leakedServices` 会扫到「实现 fiber 在 mount 子树内、且 store key 等于 `rootIsolate[name]`」，抛 `row(s) published process-global service(s) […]; a preset service must sit behind an isolate realm or move to the host composition`。shipped `apps/cli/config/agent-presets/{minimal,standard,code,cordis}/agent.cordis.yml` 没有 `web-startup` / `headless-startup` / `dsh-cmdline` 行。需要进程级一份 argv 快照，就留在 host；不要为「每会话一份 CLI」去 isolate 它。 [E: packages/preset/agent-presets/src/mount.ts:189] [E: packages/preset/agent-presets/src/mount.ts:200] [E: packages/preset/agent-presets/src/mount.ts:363]

用户层 `cordis.patch.yml` 热更新走 `composeLive`（bundle + 两个用户文件 + overlays 的 clone），**不含** argv。inner args 活在 `cmdlineArgs` / `webStartup` 这些服务里，recompose 挤不走。 [E: apps/cli/src/profile-boot.ts:240]

## 设计动机

- **App 拥有自己的旗标族和 `--help`。** launcher 若预知 `--host` / task positional，每加一个 surface 就要改 `parseDshArgs`，并且 `dsh --profile web -h` 会打出 launcher help。切开之后，每个 bundle 的 startup 行是普通 plugin：`inject cmdlineArgs`、自己的 commander、自己的 help 文本。 [I]
- **双份 commander 是组合现实。** `dsh-cmdline` 不把 commander 当 runtime 依赖；web-app 与 headless 各带一份。结构性 `isCommanderError` 让 out-of-tree 插件的 `--help` 仍能走 `appExit(0)`，而不是被当成 load 失败。
- **有界退出，才能 dispose。** 树已经挂上时直接 `process.exit` 会跳过 fiber 倒序 cleanup（session flush、端口释放、HMR watcher）。`AppExit` 接到 `shutdown.shutdown`：先 dispose，再记退出码。launcher 层的 `process.exit` 只发生在树还不存在的时候。
- **旗标赢过写在旁边的值。** Loader 等 inject 齐了再评 `!!js`。`port: !!js ctx.webStartup.port ?? 3080` 让 `--port 8080` 压过 yml 默认，缺旗标时部署值仍在。cmdline 测试用同一模式钉死 `demoStartup.port`。
- **不是 coding-agent 的 argv 总线。** inner args 不进 session log，也不决定模型可见工具集。工具集是 preset / host 组合的事；本胶只把进程启动参数交给 host 面的普通服务。

## Gotcha

- **两层 commander、两种退出。** `parseDshArgs`：`instanceof CommanderError` + `process.exit`。`parseCmdline`：结构检测 + `ctx.appExit`。不要把 launcher 的 `-h`（无 profile）和 `dsh web -h`（inner `['-h']`，web 自己的 help）写成同一条路径。 [E: apps/cli/src/args.ts:186] [E: apps/cli/tests/args.spec.ts:38]
- **第一未知 token 是硬边界。** `--patch` 必须写在边界前才是 launcher overlay；`dsh --profile tui --resume b --patch late.yml` 里后一个 `--patch` 进 app args。`--patch` collector 故意非 variadic，避免吞掉 inner argv。 [E: apps/cli/src/args.ts:61] [E: apps/cli/tests/args.spec.ts:45]
- **dump 拒绝任何 app leftover。** `--dump-config --port 8080` 在 launcher 就 exit 1：dump 不跑 command-line provider，打印一棵和同一次 boot 不一致的树会误导。 [E: apps/cli/src/args.ts:96]
- **`appExit` 不能 `inject`。** `Context.appExit?` 是 optional。headless-runner 的 `inject` 只有 `agentDefaultModel` / `agents` / `sessions`，缺 `appExit` 时 `ctx.get` 后自己抛。 [E: packages/bundle/headless/src/index.ts:28] [E: packages/bundle/headless/src/index.ts:144] [E: packages/bundle/headless/src/index.ts:146]
- **action 里 `program.error` 之前的语句已经跑过。** 必须先校验再 `provide`。web 在 publish 前拒绝 `0.0.0.0` 和非数字 port；headless 在 publish 前拒绝空白 task。
- **没有 action 的 program 是 load-time 失败，不是 usage 错误。** `hasAction` 为 false 时抛的是 Error，不是 commander 控制流，不会 `appExit(1)`。 [E: packages/boot/cmdline/tests/cmdline.spec.ts:193]
- **help 让下游行保持 pending。** action 没跑，`webStartup` / `headlessStartup` 不存在，consumer 的 `!!js` 评不了。`appExit` → `shutdown.shutdown` 会 dispose 整棵树；`boot` 在 `loader.await()` 之后若发现 `ctx.get('loader') === undefined` 就直接返回，**不会**再跑 `assertEntriesActivated`。help 是「按请求退出」，不是 load 失败。 [E: packages/boot/app-boot/src/index.ts:782] [E: packages/boot/app-boot/src/index.ts:783]
- **`tui` 不是 shipped profile，也不是 launcher 子命令。** `HELP_EXAMPLES` 把它写成 custom profile + `--patch` 的例子；裸 `dsh tui` 按缺 `--profile` 退出 1。`PROFILE_TEMPLATES` 只有 `web` / `headless` 两个键。 [E: apps/cli/src/args.ts:68] [E: apps/cli/tests/args.spec.ts:75] [E: packages/boot/app-boot/src/profile.ts:114] [E: packages/boot/app-boot/src/profile.ts:115] [E: packages/boot/app-boot/src/profile.ts:116]
- **不要把 cmdline 搬进 preset。** isolate 一份会让每个 standing mount 看见不同的（或空的）argv；不 isolate 则 already registered 或 `leakedServices`。
- **`dsh-base` 不 dormant 加载 Codex / Claude 子代理。** 和本胶无关，但同一条 host 启动路径里不要按 README 写成「后端装着、preset 再 disable」。 [E: packages/bundle/base/tests/base.spec.ts:39]

## Seam 三角

| 角色 | 包 / 符号 | ctx 键 | bundle / preset 行 |
|---|---|---|---|
| Definition | `@deepseek-ai/dsh-cmdline` 的 `CmdlineArgs` / `AppExit` / `CmdlineHost`，以及 `Context` 上的 optional 合并 | `cmdlineArgs`、`appExit` | 无 yml 行（类型在包内 `declare module`） |
| Provider | launcher：`runProfile` → `boot(prepare)` → `provideCmdline`；`AppExit` 接到 `createProcessShutdown.shutdown` | `cmdlineArgs`、`appExit`（root realm，无 `isolate`） | **不是** bundle insert。`plugin` / `dump-config` 不提供。嵌入式 host 可 `provideCmdline(ctx, { args: [], exit })` |
| Consumer | `@deepseek-ai/dsh-web-app/startup`（再 `provide('webStartup')`）；`@deepseek-ai/dsh-headless/startup`（再 `provide('headlessStartup')`）；`headless-runner` 另 `get('appExit')`。普通行用 `inject` + `!!js` 读 app 服务 | startup：`inject: ['cmdlineArgs']`；webserver / runner：`inject: [webStartup]` / `[headlessStartup]` | **host** `dsh-web-app`：`id: web-startup`、`id: webserver`。**host** `dsh-headless`：`id: headless-startup`、`id: headless-runner`。shipped preset **不**消费、也 **不** 再 provide 这组键 |

换掉 Provider（换 launcher、或测试里自己 `provideCmdline`）会带走所有 app 旗标与有界退出；不会带走已经 `provide` 出去的 `webStartup` 值（那是另一次 provide）。换掉 `id: web-startup` 只失去 Web 旗标族，`cmdlineArgs` 快照仍在。

## Sources

- packages/boot/cmdline/src/index.ts
- packages/boot/cmdline/src/invariant.ts
- packages/boot/cmdline/package.json
- packages/boot/cmdline/tests/cmdline.spec.ts
- apps/cli/src/args.ts
- apps/cli/src/bin.ts
- apps/cli/src/profile-boot.ts
- apps/cli/src/process-shutdown.ts
- apps/cli/src/dump-config.ts
- apps/cli/package.json
- apps/cli/tests/args.spec.ts
- packages/boot/app-boot/src/index.ts
- packages/boot/app-boot/src/profile.ts
- packages/bundle/web-app/src/startup.ts
- packages/bundle/web-app/cordis.patch.yml
- packages/bundle/web-app/package.json
- packages/bundle/web-app/tests/startup.spec.ts
- packages/bundle/headless/src/startup.ts
- packages/bundle/headless/src/index.ts
- packages/bundle/headless/cordis.patch.yml
- packages/bundle/headless/tests/startup.spec.ts
- packages/preset/agent-presets/src/mount.ts
- packages/bundle/base/tests/base.spec.ts
- vendor/cordis/src/events.ts
- vendor/cordis/src/reflect.ts

## 相关

- [spine.composition-boot](../../spine/composition-boot.md) — `profile → bundle → preset` 端到端；本胶是 `boot.prepare` 里那一刀。
- [surface.cli.overview](../../surface/cli/overview.md) — `parseDshArgs` 旗标表、`dsh plugin`、dump 互斥。
- [subsys.composition.app-boot](./app-boot.md) — `boot` / `loadProfile` / 空根 `cordis.yml` / fail-loud。
- [spine.overview](../../spine/overview.md) — Cordis 组合主线、host 面 vs agent-preset 面、`model-visible ⟺ logged`。
- [surface.profiles.web](../../surface/profiles/web.md) — `--host` / `--port` / `--trusted-host` 与 `0.0.0.0` 拒绝。
- [surface.profiles.headless](../../surface/profiles/headless.md) — task positional 与 runner 退出。
- [spine.capability-seams](../../spine/capability-seams.md) — Definition / Provider / Consumer 通例。
