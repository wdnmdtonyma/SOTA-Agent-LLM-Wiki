---
id: ref.cli-flags
title: CLI 旗标目录
kind: catalog
tier: T3
pkg: composition
source:
  - apps/cli/src/args.ts
  - apps/cli/src/bin.ts
  - apps/cli/src/plugin.ts
  - apps/cli/src/profile-boot.ts
  - apps/cli/src/dump-config.ts
  - apps/cli/package.json
  - apps/cli/tests/args.spec.ts
  - apps/cli/tests/built-bin.e2e.ts
  - packages/boot/cmdline/src/index.ts
  - packages/boot/app-boot/src/profile.ts
  - packages/bundle/web-app/src/startup.ts
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/web-app/tests/startup.spec.ts
  - packages/bundle/headless/src/startup.ts
  - packages/bundle/headless/cordis.patch.yml
  - packages/bundle/headless/tests/startup.spec.ts
  - packages/bundle/sdk-app/src/index.ts
  - packages/bundle/acp-app/src/index.ts
symbols:
  - parseDshArgs
  - DshInvocation
  - parseCmdline
  - provideCmdline
  - PROFILE_TEMPLATES
related:
  - surface.cli.overview
  - surface.cli.plugin
  - spine.composition-boot
  - surface.profiles.web
  - surface.profiles.headless
  - subsys.composition.cmdline
evidence: explicit
status: verified
updated: c291e7961a
---

> `dsh` 把 argv 切成两层：`parseDshArgs` 只拥有 `--profile` / `--patch` / dump / `-V` / 子命令 `web`·`plugin` 以及 leftover `[args...]`；`runProfile` 把 leftover 冻成 `ctx.cmdlineArgs`。web 再 `parseCmdline` 解析 `--host`·`--no-open`·`--port`·`--trusted-host`；headless 解析 `[task...]`；sdk / sdk-minimal / acp 是零额外旗标的 stdio app。

## 能回答的问题

- launcher 自己登记了哪些 option / 子命令 / positional？第一个它不认识的 token 之后去哪？
- `--dump-config` 与 `--dump-default-config` 如何互斥？后者能不能再带 `--patch`？dump 能不能带 app args？
- `dsh web` 和 `dsh --profile web` 是不是同一种 `DshInvocation.mode`？`--host` / `--no-open` 谁 parse？有没有 `dsh sdk` 子命令？
- help 例子里的 `tui` 是不是 shipped profile？裸 `dsh tui` 会怎样？
- `--host 0.0.0.0` 会不会被接受？省略 `--host` / `--port` 时 bind 落到哪？
- `plugin` 自己的 `--profile` 和根命令的 `--profile` 是不是同一个 option？未知名字首次 `plugin add` 叠哪份 bundle？

## 范围与 ground truth

本页是 **T3 catalog**：逐实例列出 `dsh` 进程入口上能键入的旗标、子命令、positional。谁 parse、默认、互斥、为什么这样切，以登记行和测试为准。

DSH 是 **Cordis 组合运行时**（`profile → bundle → agent preset`）。capability seam 是 Definition / Provider / Consumer。本页实例全是 **host 面**（进程级：选哪个 profile、叠哪层 `--patch`、web 绑哪个口、headless 提交哪句 task、stdio app 是否 accepted）。它们不改 agent-preset 成员资格（tools / persona / isolate 仍只认四个 shipped `agent.cordis.yml`：`minimal` / `standard` / `ptc` / `cordis`）。模型看见的内容必须能从 session 日志重建（`model-visible ⟺ logged`）；旗标本身不是 model-visible 工具。

宿主入口不只是 `dsh web`：`dsh --profile web|headless|sdk|sdk-minimal|acp` 都能 boot。`PROFILE_TEMPLATES` 有五个键：`acp`、`web`、`headless`、`sdk`、`sdk-minimal`。[E: packages/boot/app-boot/src/profile.ts:105][E: packages/boot/app-boot/src/profile.ts:110][E: packages/boot/app-boot/src/profile.ts:114][E: packages/boot/app-boot/src/profile.ts:118][E: packages/boot/app-boot/src/profile.ts:122] `desktop` **不是**第六个 CLI profile：`--profile desktop` 被 `rejectElectronProfile` 拒绝。[E: apps/cli/src/args.ts:68][E: apps/cli/src/args.ts:70][E: apps/cli/src/args.ts:159] 本仓没有 shipped TUI 包。`HELP_EXAMPLES` 里的 `tui` 只是自定义 profile 名。[E: apps/cli/src/args.ts:81] launcher **没有** `dsh sdk` / `dsh acp` / `dsh headless` 子命令；唯一硬编码 profile alias 是 `web`。[E: apps/cli/src/args.ts:187]

认哪份源：

- launcher 语法：`apps/cli/src/args.ts` 的 `parseDshArgs`，类型 `DshInvocation`；dispatch 在 `apps/cli/src/bin.ts`。[E: apps/cli/src/args.ts:52][E: apps/cli/src/args.ts:126][E: apps/cli/src/bin.ts:31]
- leftover 交接：`provideCmdline` 冻快照，`parseCmdline` 交给 app 自己的 commander。[E: packages/boot/cmdline/src/index.ts:84][E: packages/boot/cmdline/src/index.ts:165][E: apps/cli/src/profile-boot.ts:330]
- web / headless / sdk / acp 旗标：只认各自 `startup.ts` 或 bundle 入口的 `.option` / `.argument`，再由 bundle `cordis.patch.yml` 的 `!!js` 读服务。
- 互斥与「第一未知 token」边界：`apps/cli/tests/args.spec.ts`、`apps/cli/tests/built-bin.e2e.ts`。

官方 `apps/cli/README.md` / 生成 catalog **不当 [E]**。控制流、叠层顺序、信号与 fail-loud 在 [`surface.cli.overview`](../surface/cli/overview.md) 与 [`spine.composition-boot`](../spine/composition-boot.md)；`dsh plugin` 的 pnpm reconcile 在 [`surface.cli.plugin`](../surface/cli/plugin.md)。本页不收环境变量（`DSH_HOME` 只作为 `--profile` 目录前缀出现）。

`--host 0.0.0.0` **不是**支持的 bind：`web-startup` 在 `provide` 之前就 `program.error`。[E: packages/bundle/web-app/src/startup.ts:74][E: packages/bundle/web-app/src/startup.ts:75]

## 实例表

bin 名 `dsh` 来自 `@deepseek-ai/dsh` 的 `package.json` `bin` 字段，指向构建产物 `lib/bin.js`。[E: apps/cli/package.json:2][E: apps/cli/package.json:15] 冻结树版本字符串是 `0.1.5-rc.2`。[E: apps/cli/package.json:4]

### launcher 拥有（`parseDshArgs`）

根 `program`：`helpOption(false)` + `allowUnknownOption` + `passThroughOptions` + `enablePositionalOptions`。launcher 旗标必须写在前面；第一个它不认识的 token 起全部进入 leftover `args`，包括 app 的 `-h`。[E: apps/cli/src/args.ts:140][E: apps/cli/src/args.ts:141][E: apps/cli/src/args.ts:142][E: apps/cli/src/args.ts:143]

| 名 | 类型/签名 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `--profile <name>` | 根 `program.option`；`parseDshArgs` | 无。根命令缺它则 `error: --profile <name> is required`；空串则 `--profile needs a name` | 选 `$DSH_HOME/profiles/<name>`。解析期**不**查目录是否存在：`parse(['--profile', 'tui'])` 已是合法 `mode: 'profile'` | launcher 只切开要 boot 的 profile；`web` / `headless` / `sdk` / `sdk-minimal` / `acp` 在 `PROFILE_TEMPLATES` 里首次可 `initProfile`，其它名字要先 `dsh plugin` | `apps/cli/src/args.ts` [E: apps/cli/src/args.ts:145][E: apps/cli/src/args.ts:155][E: apps/cli/src/args.ts:158][E: apps/cli/tests/args.spec.ts:25] |
| `--patch <path>` | 根命令与 `web` 子命令各登记一次；单值 repeatable collector `collect` | `[]`（`options.patch ?? []`） | argv 序的 overlay 路径，叠在 profile 用户层之后 | **禁止 variadic**：variadic `--patch` 会吞掉 inner args。空 path 报 `--patch needs a path`。越过第一未知 token 之后的 `--patch` 归 app，不再进 `patches` | `apps/cli/src/args.ts` [E: apps/cli/src/args.ts:66][E: apps/cli/src/args.ts:147][E: apps/cli/src/args.ts:98][E: apps/cli/tests/args.spec.ts:47] |
| `--dump-config` | 根命令与 `web` 各登记一次；boolean option | 未给出。与 `--dump-default-config` **互斥** | `mode: 'dump-config'`、`defaultOnly: false`：打印含用户层、home 层、`--patch` 的组成树，**不** `boot` | dump 从不跑 app command-line provider，所以拒绝 leftover app args（含 `-h` / `--port`），避免印出和同一次 boot 不一致的树 | `apps/cli/src/args.ts` [E: apps/cli/src/args.ts:148][E: apps/cli/src/args.ts:104][E: apps/cli/src/args.ts:110] |
| `--dump-default-config` | 根命令与 `web` 各登记一次；boolean option | 未给出。与 `--dump-config` **互斥**；**不接受** `--patch` | `mode: 'dump-config'`、`defaultOnly: true`：只打印 bundle 层；`prepareProfile(name, false)` → `loadProfile(..., { userLayer: false })`，用户 `cordis.patch.yml` 不读、`patches` 为空数组 | 给坏掉的用户层做恢复诊断；再叠 `--patch` 就不再是「default」 | `apps/cli/src/args.ts` [E: apps/cli/src/args.ts:149][E: apps/cli/src/args.ts:114][E: apps/cli/src/dump-config.ts:31][E: packages/boot/app-boot/src/profile.ts:795] |
| `-V, --version` | 根 `program.version` | 无；打印 `readVersion()` | stdout 写出 `@deepseek-ai/dsh` 的 `package.json` `version`（冻结树 `0.1.5-rc.2`；非 string 回退 `'0.0.0'`） | `parseDshArgs` 内部 exit，到不了 `case 'profile'` 里的 `loadLayeredEnv` | `apps/cli/src/args.ts` [E: apps/cli/src/args.ts:133][E: apps/cli/src/bin.ts:21][E: apps/cli/src/bin.ts:29][E: apps/cli/tests/args.spec.ts:132] |
| `-h` / `--help`（launcher） | **不是**登记的 `helpOption`；`helpOption(false)` 之后的特殊路径 | 无 | leftover 含 `-h` 或 `--help` **且**没有 `--profile` 时，`program.help()` 打 launcher help（含 `HELP_EXAMPLES`）并 exit 0 | 有 profile 时 `-h` 必须原样进 `args` 交给 app；无 profile 可交时才由 launcher 自己响应裸 help | `apps/cli/src/args.ts` [E: apps/cli/src/args.ts:140][E: apps/cli/src/args.ts:154][E: apps/cli/tests/args.spec.ts:131] |
| `[args...]` | 根命令与 `web` 子命令的 leftover positional | `[]` | profile 模式下经 `provideCmdline` 交给 app；dump 模式下长度必须为 0 | 这是切开点：`--host`、`--no-open`、`--port`、`--trusted-host`、headless 词、app 的 `-h` 都走这里，launcher **不**登记它们 | `apps/cli/src/args.ts` [E: apps/cli/src/args.ts:144][E: apps/cli/src/args.ts:181][E: apps/cli/src/profile-boot.ts:331] |

无 dump 旗标时 `resolveBoot` 返回 `{ mode: 'profile', profile, patches, args }`。[E: apps/cli/src/args.ts:101] `bin.ts` 再按 `mode` 动态 import：`profile` → `runProfile`，`plugin` → `runPlugin` 后 `process.exit`，`dump-config` → `runDumpConfig`。[E: apps/cli/src/bin.ts:32][E: apps/cli/src/bin.ts:43][E: apps/cli/src/bin.ts:48]

`HELP_EXAMPLES` 里的 `--resume` **不是** launcher 旗标，也不是 shipped web/headless/sdk/acp 的 `.option`；它只演示「第一未知 token 之后归 app」。`parse(['--profile', 'tui', '--resume', 'abc'])` 得到 `args: ['--resume', 'abc']`。[E: apps/cli/tests/args.spec.ts:37]

已删除、解析期即 exit 1 的入口（**不是**本表实例）：裸 `tui`、`--config`、`-p`、`run <task>`。[E: apps/cli/tests/args.spec.ts:95][E: apps/cli/tests/args.spec.ts:96][E: apps/cli/tests/args.spec.ts:97][E: apps/cli/tests/args.spec.ts:98]

### 子命令 `web` / `plugin`

两个子命令都先 `rejectParentOptions`：父级已出现 `--profile` / `--patch` / `--dump-config` / `--dump-default-config` 任一，则报该子命令 `takes none of parent ...`。[E: apps/cli/src/args.ts:166][E: apps/cli/src/args.ts:186]

| 名 | 类型/签名 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `web` | `program.command('web')`；action 调 `resolveBoot(web, 'web', options, args)` | 固定 profile 名 `'web'` | `--profile web` 的 alias。无 dump 时仍是 `mode: 'profile'`；带 dump 旗标则 `mode: 'dump-config'` | 默认产品入口是本地 Web GUI，给一条短命令。测试：`parse(['web'])` ≡ `{ mode: 'profile', profile: 'web', patches: [], args: [] }` | `apps/cli/src/args.ts` [E: apps/cli/src/args.ts:175][E: apps/cli/src/args.ts:187][E: apps/cli/tests/args.spec.ts:30] |
| `plugin` | `program.command('plugin')` → `mode: 'plugin'` | 无 | 不 boot Cordis 树；把剩余 argv 转到 profile 目录里的 pnpm | host 面装 / 卸 bundle，不碰 agent-preset 成员 | `apps/cli/src/args.ts` [E: apps/cli/src/args.ts:190][E: apps/cli/src/args.ts:200][E: apps/cli/src/bin.ts:45] |
| `plugin --profile <name>` | `plugin.requiredOption('--profile <name>')` | 无，必填；空串报 `--profile needs a name` | 指定要管的 profile。目录尚无 `package.json` 时 `initProfile(dir, template?.bundles ?? DEFAULT_PROFILE_BUNDLES, template?.patchReload)` | **不是**根命令那个 `--profile`。必须写在 `plugin` **后面**。未知名字（包括 `tui`）走 `DEFAULT_PROFILE_BUNDLES = ['@deepseek-ai/dsh-base']` 与 `DEFAULT_PROFILE_PATCH_RELOAD = 'live'`，不会套 web/headless/sdk/acp 模板 | `apps/cli/src/args.ts` [E: apps/cli/src/args.ts:192][E: apps/cli/src/args.ts:197][E: apps/cli/src/plugin.ts:126][E: packages/boot/app-boot/src/profile.ts:134] |
| `plugin [args...]` | `plugin.argument` + `allowUnknownOption()` | 无；长度为 0 则 `plugin needs pnpm arguments to forward` | 原样转给 `spawnSync('pnpm', …)` 的 argv（`add` / `remove` / `why` / `--save-dev` 等） | 相对 path spec 按调用 cwd 锚定，避免 `add .` 在 profile 目录自链 | `apps/cli/src/args.ts` [E: apps/cli/src/args.ts:178][E: apps/cli/src/args.ts:194][E: apps/cli/src/args.ts:199][E: apps/cli/tests/args.spec.ts:67] |

`plugin` 没有调用 `helpOption(false)`。`dsh plugin --help` 是否仍要求 `--profile`、文案由 commander 默认 help 还是转发 pnpm，本页没有测试钉死。[I]

### web app 拥有（`web-startup` + `parseCmdline`）

插件名 `web-startup`，`inject: ['cmdlineArgs']`，在 action 里 `provide(WEB_STARTUP_SERVICE, …)`。[E: packages/bundle/web-app/src/startup.ts:14][E: packages/bundle/web-app/src/startup.ts:17][E: packages/bundle/web-app/src/startup.ts:80] commander 程序名是 `dsh --profile web`。[E: packages/bundle/web-app/src/startup.ts:48]

缺省 bind **不是**写在 `.option` 的 default 上：省略时 `WebStartupValues` 不带 `host` / `port`，`webserver` 行用 `!!js` 回退。[E: packages/bundle/web-app/src/startup.ts:82][E: packages/bundle/web-app/src/startup.ts:83][E: packages/bundle/web-app/tests/startup.spec.ts:110] 省略 `--no-open` 时 Commander 的 `--open` 语义使 `openBrowser: true`。[E: packages/bundle/web-app/src/startup.ts:81][E: packages/bundle/web-app/tests/startup.spec.ts:110]

| 名 | 类型/签名 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `--host <host>` | `webCommand().option`；`parseCmdline` | 省略则服务对象无 `host`；`webserver` 行 `ctx.webStartup.host ?? '127.0.0.1'`。字面 `0.0.0.0` **拒绝** | 绑定 host | 全接口暴露等于把远程代码执行面到网上；错误文案要求改用 `127.0.0.1`。built-bin 在打出 `dsh web: http://` 之前就 exit 1 | `packages/bundle/web-app/src/startup.ts` [E: packages/bundle/web-app/src/startup.ts:51][E: packages/bundle/web-app/src/startup.ts:74][E: packages/bundle/web-app/cordis.patch.yml:135][E: apps/cli/tests/built-bin.e2e.ts:365] |
| `--no-open` | `option('--no-open')`；Commander 发布 `open: boolean` | 省略则 `openBrowser: true` | 不在默认浏览器打开 Web UI | `web-runtime` 行读 `openBrowser: !!js ctx.webStartup.openBrowser` | `packages/bundle/web-app/src/startup.ts` [E: packages/bundle/web-app/src/startup.ts:52][E: packages/bundle/web-app/src/startup.ts:81][E: packages/bundle/web-app/cordis.patch.yml:154][E: packages/bundle/web-app/tests/startup.spec.ts:100] |
| `--port <port>` | `option('--port <port>')`；字符串进 commander，action 里 `Number` | 省略则无 `port`；`webserver` 行 `?? 3080`。必须整段 `/^\d+$/`，否则 usage error | 监听端口。登记文案允许 `0` 让 OS 选空闲端口 | 非数字（如 `abc`）在 `provide` 之前拒绝，consumer 行保持 pending | `packages/bundle/web-app/src/startup.ts` [E: packages/bundle/web-app/src/startup.ts:53][E: packages/bundle/web-app/src/startup.ts:77][E: packages/bundle/web-app/cordis.patch.yml:135][E: packages/bundle/web-app/tests/startup.spec.ts:130] |
| `--trusted-host <authority...>` | variadic + 可重复；收成 `trustedHosts: string[]` | `[]`（`options.trustedHost ?? []`） | 额外 authority，按参数序交给 `/api` browser-trust fence（`host` 或 `host:port`） | 这是 **app** 旗标，出现在 leftover 里，variadic 不会吞 launcher token。与 `--patch` 的「单值 collector」相反 | `packages/bundle/web-app/src/startup.ts` [E: packages/bundle/web-app/src/startup.ts:54][E: packages/bundle/web-app/src/startup.ts:84][E: packages/bundle/web-app/tests/startup.spec.ts:103] |
| `-h, --help`（web app） | `helpOption('-h, --help', 'show this help')` | 无 | 打 `Usage: dsh --profile web` 与 `--port` / `--no-open` / `--trusted-host` 文案，**不** bind、不打印 `dsh web: http://`，`appExit(0)` | launcher 把 `-h` 放进 leftover；app 拥有自己的 help。`--help` 时 action 不跑，不 `provide` `webStartup` | `packages/bundle/web-app/src/startup.ts` [E: packages/bundle/web-app/src/startup.ts:50][E: apps/cli/tests/built-bin.e2e.ts:355][E: packages/bundle/web-app/tests/startup.spec.ts:124] |

launcher 侧：`parse(['web', '--host', '127.0.0.1', '--port', '8080', '--no-open', '--future-web-flag'])` 的 `args` 原样含这四项。[E: apps/cli/tests/args.spec.ts:41] `--future-web-flag` 不在 `webCommand()` 的四个 `.option` 之列；web-startup 也没有 `allowUnknownOption`，未知 token 会在 `parseCmdline` 变成 commander 语法错。[I]

### headless 拥有（`headless-startup` + `parseCmdline`）

插件名 `headless-startup`，`inject: ['cmdlineArgs']`，action 里 `provide('headlessStartup', { task })`。[E: packages/bundle/headless/src/startup.ts:13][E: packages/bundle/headless/src/startup.ts:16][E: packages/bundle/headless/src/startup.ts:54] 程序名 `dsh --profile headless`。[E: packages/bundle/headless/src/startup.ts:33] runner 行读 `task: !!js ctx.headlessStartup.task`。[E: packages/bundle/headless/cordis.patch.yml:31]

| 名 | 类型/签名 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `[task...]` | `headlessCommand().argument`；`program.args.join(' ')` | 无。join 后 `trim() === ''`（含零参数或纯空白）则 usage error | 一次性任务文本；多个词用空格拼成一句，写入 `HeadlessStartupValues.task` | one-shot 进程只提交这一句 user message。launcher 只把词放进 leftover：`parse(['--profile', 'headless', 'run', 'the', 'tests'])` → `args: ['run', 'the', 'tests']` | `packages/bundle/headless/src/startup.ts` [E: packages/bundle/headless/src/startup.ts:36][E: packages/bundle/headless/src/startup.ts:52][E: packages/bundle/headless/src/startup.ts:53][E: apps/cli/tests/args.spec.ts:43] |
| `-h, --help`（headless app） | `helpOption('-h, --help', 'show this help')` | 无 | 打 `Usage: dsh --profile headless`，不跑 runner，`appExit(0)` | 有 `--profile headless` 时 help 属于 app，不属于 launcher | `packages/bundle/headless/src/startup.ts` [E: packages/bundle/headless/src/startup.ts:35][E: apps/cli/tests/built-bin.e2e.ts:374][E: packages/bundle/headless/tests/startup.spec.ts:101] |

built-bin：`dsh --profile headless` 无 task 时 stderr 含 `a task is required`，exit 1。[E: apps/cli/tests/built-bin.e2e.ts:397]

### sdk / sdk-minimal / acp（零额外旗标 stdio app）

没有 `dsh sdk` / `dsh acp` 子命令。入口是 `dsh --profile sdk|sdk-minimal|acp`；inner args 仍经 leftover 交给 `parseCmdline`。

| 名 | 类型/签名 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `dsh --profile sdk`（及 `sdk-minimal`） | `sdkCommand(profile)`：只登记 `-h/--help`，无其它 `.option` | Config `profile` 默认 `'sdk'` | 成功 parse 后 `exitOnStdinEnd` + `provide('sdkAppStartup', { accepted: true })`；help 不启动 transport | help 名是 `` `dsh --profile ${profile}` ``，sdk-minimal 经 bundle Config 改写 | `packages/bundle/sdk-app/src/index.ts` [E: packages/bundle/sdk-app/src/index.ts:30][E: packages/bundle/sdk-app/src/index.ts:40][E: packages/bundle/sdk-app/src/index.ts:58][E: apps/cli/tests/built-bin.e2e.ts:382] |
| `dsh --profile acp` | `acpCommand()`：只登记 `-h/--help` | 无 | 成功 parse 后 `exitOnStdinEnd` + `provide('acpAppStartup', { accepted: true })` | help 名固定 `dsh --profile acp` | `packages/bundle/acp-app/src/index.ts` [E: packages/bundle/acp-app/src/index.ts:27][E: packages/bundle/acp-app/src/index.ts:44][E: packages/bundle/acp-app/src/index.ts:45][E: apps/cli/tests/built-bin.e2e.ts:390] |

## 对照 / 分家 / 装配

### 谁 parse

| 切片 | 解析器 | 冻存 / 发布 | 不经过 |
|---|---|---|---|
| `--profile` / `--patch` / dump / `-V` / `web` / `plugin` | `parseDshArgs`（`apps/cli/src/args.ts`） | `DshInvocation`；help / version / 语法错在函数内部 `process.exit` | 树内插件 |
| leftover `[args...]` | 不解析，只切开 | `provideCmdline` → `ctx.cmdlineArgs.get()` 只读快照 | dump / plugin 路径不调用 `runProfile`，也就不 `provideCmdline` |
| `--host` / `--no-open` / `--port` / `--trusted-host` / web `-h` | `web-startup` 的 commander + `parseCmdline` | `ctx.webStartup` | launcher |
| `[task...]` / headless `-h` | `headless-startup` 的 commander + `parseCmdline` | `ctx.headlessStartup` | launcher |
| sdk / acp 的 `-h`（无其它旗标） | `sdk-app-startup` / `acp-app-startup` + `parseCmdline` | `ctx.sdkAppStartup` / `ctx.acpAppStartup` | launcher |
| `plugin` 的 pnpm argv | `parseDshArgs` 只收成 `PluginInvocation.args`；真正执行是 `runPlugin` → `pnpm` | 无 Cordis 服务 | `parseCmdline` |

`parseCmdline` 的 help / version / `program.error` 走 `ctx.appExit`，不直接 `process.exit`。[E: packages/boot/cmdline/src/index.ts:184]

### dump 互斥

| argv 组合 | 结果 |
|---|---|
| `--dump-config` 与 `--dump-default-config` 同时出现（根或 `web`） | 互斥 error [E: apps/cli/src/args.ts:104][E: apps/cli/tests/args.spec.ts:103] |
| `--dump-default-config` + `--patch` | `takes no --patch` [E: apps/cli/src/args.ts:114][E: apps/cli/tests/args.spec.ts:104] |
| 任一 dump + leftover（`--port`、`-h`、task 词） | `config dumps take no app arguments` [E: apps/cli/src/args.ts:110][E: apps/cli/tests/args.spec.ts:114] |
| `--dump-config` + `--patch`（无 leftover） | 合法；`defaultOnly: false`，overlay 进 dump 层 [E: apps/cli/tests/args.spec.ts:84] |
| 无 dump 旗标 | `mode: 'profile'`，`--patch` 进 `runProfile` 的 `patchFiles` |

`runDumpConfig` 在 `defaultOnly === false` 时才追加 profile `cordis.patch.yml`、`$DSH_HOME/cordis.patch.yml`、以及 `--patch` 文件。[E: apps/cli/src/dump-config.ts:42] dump 层列表止于这些文件；`runDumpConfig` 正文没有 `agent-presets` shipped root，也没有 `DSH_TELEMETRY_DISABLED` 硬关。[I] `bin.ts` 的 `case 'dump-config'` **不**调用 `boot`。[E: apps/cli/src/bin.ts:48]

### `tui` 不是 shipped profile

- `PROFILE_TEMPLATES` 的键是 `acp`、`web`、`headless`、`sdk`、`sdk-minimal`；没有 `tui`。[E: packages/boot/app-boot/src/profile.ts:105]
- `parse(['--profile', 'tui'])` 在解析期合法，得到 `mode: 'profile'`。[E: apps/cli/tests/args.spec.ts:25] 存在性检查在 `loadProfile`：名字不在模板且目录无 `package.json` 则抛 `does not exist`，提示 `dsh plugin --profile <name> add`。[E: packages/boot/app-boot/src/profile.ts:824][E: apps/cli/tests/built-bin.e2e.ts:644]
- 裸 `dsh tui`（没有 `--profile`）exit 1：那是 leftover，没有 app 可交。[E: apps/cli/tests/args.spec.ts:94]
- built-bin `--help` 不把 `tui` / `meta` / `upgrade` 列成子命令。[E: apps/cli/tests/built-bin.e2e.ts:339]
- `dsh plugin --profile tui add …` 会按 `DEFAULT_PROFILE_BUNDLES` 初始化一个只含 `@deepseek-ai/dsh-base` 的自定义 profile，仍然不是 shipped TUI 包。[E: packages/boot/app-boot/src/profile.ts:134]

### host 面 vs agent-preset 面

这些旗标只作用于进程：选 profile、叠 `--patch`、dump 真树、web bind、headless 提交一句 task、stdio app 等到 stdin EOF、用 pnpm 改 `dsh.profile.bundles`。web bundle 会 insert `id: agent-presets` 且 `default: standard`；[E: packages/bundle/web-app/cordis.patch.yml:480][E: packages/bundle/web-app/cordis.patch.yml:480] `packages/bundle/headless/cordis.patch.yml` 的 insert 是 `code-runtime` / `headless-startup` / `headless-runner`，没有 `agent-presets` 这一 id。[E: packages/bundle/headless/cordis.patch.yml:20][E: packages/bundle/headless/cordis.patch.yml:23][E: packages/bundle/headless/cordis.patch.yml:27] CLI 旗标不能把某个工具「加进」`minimal` / `standard` / `ptc` / `cordis`。

## Sources

- `apps/cli/src/args.ts`
- `apps/cli/src/bin.ts`
- `apps/cli/src/plugin.ts`
- `apps/cli/src/profile-boot.ts`
- `apps/cli/src/dump-config.ts`
- `apps/cli/package.json`
- `apps/cli/tests/args.spec.ts`
- `apps/cli/tests/built-bin.e2e.ts`
- `packages/boot/cmdline/src/index.ts`
- `packages/boot/app-boot/src/profile.ts`
- `packages/bundle/web-app/src/startup.ts`
- `packages/bundle/web-app/cordis.patch.yml`
- `packages/bundle/web-app/tests/startup.spec.ts`
- `packages/bundle/headless/src/startup.ts`
- `packages/bundle/headless/cordis.patch.yml`
- `packages/bundle/headless/tests/startup.spec.ts`
- `packages/bundle/sdk-app/src/index.ts`
- `packages/bundle/acp-app/src/index.ts`

## 相关

- [`surface.cli.overview`](../surface/cli/overview.md) — launcher 三种 `DshInvocation.mode`、切开边界、`runProfile` 叠层与信号。
- [`surface.cli.plugin`](../surface/cli/plugin.md) — `runPlugin`：cwd 锚定、pnpm 缺失 127、按已安装状态 reconcile `dsh.profile.bundles`。
- [`spine.composition-boot`](../spine/composition-boot.md) — `profile → bundle → preset` 端到端；`dsh --dump-config` 看真树。
- [`surface.profiles.web`](../surface/profiles/web.md) — `PROFILE_TEMPLATES.web`、`--host` / `--port` / `--no-open` 安全门、host 面 disable 工具行再按会话挂 preset。
- [`surface.profiles.headless`](../surface/profiles/headless.md) — one-shot runner、无 `agent-presets`、task 空串拒绝。
- [`subsys.composition.cmdline`](../subsystems/composition/cmdline.md) — `provideCmdline` / `parseCmdline` 胶；help 走 `ctx.appExit`。
