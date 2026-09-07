---
id: surface.profiles.web
title: web profile
kind: surface
tier: T1
pkg: composition
source:
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/web-app/src/startup.ts
  - packages/bundle/web-app/src/index.ts
  - packages/bundle/web-app/package.json
  - packages/bundle/web-app/tests/startup.spec.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/boot/app-boot/src/profile.ts
  - packages/boot/app-boot/src/index.ts
  - packages/boot/app-boot/tests/profile.spec.ts
  - packages/host/webserver/src/index.ts
  - packages/core/tools/src/index.ts
  - packages/preset/agent-presets/src/index.ts
  - packages/preset/agent-presets/src/discovery.ts
  - packages/preset/agent-presets/src/mount.ts
  - apps/cli/src/args.ts
  - apps/cli/src/bin.ts
  - apps/cli/src/dump-config.ts
  - apps/cli/src/profile-boot.ts
  - apps/cli/tests/args.spec.ts
  - apps/cli/tests/built-bin.e2e.ts
symbols:
  - PROFILE_TEMPLATES
  - WEB_STARTUP_SERVICE
  - webStartup
  - WebStartupValues
  - loadProfile
  - initProfile
related:
  - surface.cli.overview
  - surface.presets.overview
  - surface.profiles.headless
  - spine.composition-boot
  - surface.web.workbench
  - spine.trace-web-first-prompt
evidence: explicit
status: verified
updated: d347e70390
---

> `web` 是 shipped **Cordis 组合**模板：`PROFILE_TEMPLATES.web` 把 `@deepseek-ai/dsh-base` 叠上 `@deepseek-ai/dsh-web-app`，`patchReload: 'live'`（五个 shipped 模板里唯一 live）。进程级 **host 面**挂 webserver / 三个 API controller / 浏览器 roster，并把 base 上的模型可见工具行 `disabled: true`，改由每会话 **agent-preset 面**（默认 `standard`）再挂。`dsh web` 是 `--profile web` 的 alias；其它宿主入口是 `dsh --profile headless|sdk|sdk-minimal|acp`。本仓没有 shipped TUI 模板。

## 能回答的问题

- `dsh web` 和 `dsh --profile web` 是不是同一次 profile boot？app 旗标 `--host` / `--port` / `--trusted-host` / `--no-open` 谁解析？缺省 bind 是什么？
- 为什么 `--host 0.0.0.0` 会在提供 `webStartup` 之前被拒？`--help` 为什么不 bind 端口？
- `PROFILE_TEMPLATES.web` 的两个 bundle 与 `patchReload` 是什么？第一次启动如何写出 `$DSH_HOME/profiles/web/`？
- web overlay 整表 disable 了哪些 base `id`？`shell-env` / `jobs` / `skill` / `goal` / `token-meter` / `subagent` 为什么仍留在 host 面？
- `agent-presets` 行怎样进树？`default: standard` 谁写的？shipped root 是包内 `presets/` 而不是 launcher overlay？
- `DSH_TOOLS_MODE`、base 的 `hmr` disable、以及 launcher 的 watch-only HMR 各管哪一层？

## 是什么

DSH 是 **Cordis 组合运行时**。一次 `web` 启动走主线 `profile → bundle → agent preset`：

1. **profile**：`$DSH_HOME/profiles/web/`，`package.json` 的 `dsh.profile.bundles` 列出有序 bundle 层，同目录 `cordis.patch.yml` 是用户层。
2. **bundle**：npm 包装层。`@deepseek-ai/dsh-web-app` 的 `dsh.bundle.patch` 指向自己的 `cordis.patch.yml` [E: packages/bundle/web-app/package.json:43]。
3. **agent preset**：会话级 composition。web 在 host 树里 insert `agent-presets`，`default: standard` [E: packages/bundle/web-app/cordis.patch.yml:445]。shipped 根是包内 `SHIPPED_PRESET_ROOT`（`presets/`，相对 discovery 模块）[E: packages/preset/agent-presets/src/discovery.ts:60]；该目录下四个 shipped 子目录是 `minimal` / `standard` / `ptc` / `cordis`，各带 `agent.cordis.yml`。不认「仓库里有这个包」。旧路径 `apps/cli/config/agent-presets/` 与旧目录名 `code` 已不存在。

capability seam 仍是 **Definition / Provider / Consumer**。host 面提供 `ctx.webServer`、`ctx.shellEnv`、`ctx.jobs`、`ctx.skill`、`ctx.goals`、`ctx.subagents` 以及 `ctx.sessionController` / `ctx.settingsController` / `ctx.workspaceController`；preset 面提供模型可见的 tool / persona / isolate。**model-visible ⟺ logged**：会话实际挂上的 preset 与模型看见的工具集必须写进 session log。

两面切开是 web 相对 base 的核心 overlay：base 为单会话进程把工具行直接插在 host 上；web 是多会话 GUI，必须把那些行 disable，让每个 Agent factory 在 `setup` 里 join 一份 preset。

五个 shipped profile 键在 `PROFILE_TEMPLATES`：`acp` / `web` / `headless` / `sdk` / `sdk-minimal` [E: packages/boot/app-boot/src/profile.ts:137]。`web` 是其中唯一 `patchReload: 'live'` [E: packages/boot/app-boot/src/profile.ts:144]。

## 入口

用户碰到 `web` 的方式：

| 入口 | 行为 |
|---|---|
| `dsh web [app args...]` | 子命令 action 调用 `resolveBoot(web, 'web', options, args)` [E: apps/cli/src/args.ts:168]；无 dump 旗标时得到 `mode: 'profile'` [E: apps/cli/tests/args.spec.ts:28] |
| `dsh --profile web [app args...]` | 显式 profile 名，同一条 `mode: 'profile'` 路径 |
| `dsh --profile web --help` / `dsh web --help` | launcher 把 `-h` 放进 inner `args` [E: apps/cli/tests/args.spec.ts:38]；app 打 `Usage: dsh --profile web`，stdout 不含 `dsh web: http://` [E: apps/cli/tests/built-bin.e2e.ts:355] [E: apps/cli/tests/built-bin.e2e.ts:357] |
| `dsh --profile web --dump-config` | `mode: 'dump-config'`，不 boot、不跑 `web-startup` |
| `$DSH_HOME/profiles/web/cordis.patch.yml` | 用户层，叠在两个 bundle 之后 |
| `$DSH_HOME/cordis.patch.yml` | home 层，对每个 profile 再生效 |
| `--patch <path>`（可重复） | launcher overlay，再往后叠 |

`parse(['web'])` 的解析结果是 `{ mode: 'profile', profile: 'web', patches: [], args: [] }` [E: apps/cli/tests/args.spec.ts:28]。`bin.ts` 在 `mode: 'profile'` 下 `import('./profile-boot.ts')` [E: apps/cli/src/bin.ts:28]，并以 `profile: invocation.profile` 调用 `runProfile` [E: apps/cli/src/bin.ts:31]。

Launcher 只吃 `--profile` / `--patch` / `--dump-config` / `--dump-default-config` / `-V|--version`；`--host` / `--port` / `--trusted-host` / `--no-open` 作为 inner args 交给树里的 `web-startup`（`@deepseek-ai/dsh-web-app/startup`）。help 例子里的 `tui` 只是自定义 profile 名，不在 `PROFILE_TEMPLATES` 里。其它 shipped 表面走 `dsh --profile sdk|sdk-minimal|acp|headless`，没有 `dsh sdk` 这类硬编码子命令。

第一次 `dsh web`：`loadProfile` 发现 `$DSH_HOME/profiles/web/package.json` 不存在，且 `name === 'web'` 命中模板，调用 `initProfile(dir, template.bundles, template.patchReload)` [E: packages/boot/app-boot/src/profile.ts:817]。模板写出的 bundles 就是 `PROFILE_TEMPLATES.web` [E: packages/boot/app-boot/src/profile.ts:143]。未知名字（没有模板）第一次 `--profile <unknown>` **不会**自动 init，而是报错让你走 `dsh plugin --profile <name> add` [E: packages/boot/app-boot/src/profile.ts:814]。

## 关键字段

### App 旗标（`web-startup`）

`WEB_STARTUP_SERVICE` 的字面量是 `'webStartup'` [E: packages/bundle/web-app/src/startup.ts:20]。commander action 里 `ctx.provide(WEB_STARTUP_SERVICE, …)` [E: packages/bundle/web-app/src/startup.ts:80]；`openBrowser` 来自 commander 的 `--no-open`（默认打开）[E: packages/bundle/web-app/src/startup.ts:81]；`host` 只在旗标出现时展开 [E: packages/bundle/web-app/src/startup.ts:82]，`port` 同样 [E: packages/bundle/web-app/src/startup.ts:83]，`trustedHosts` 缺省 `[]` [E: packages/bundle/web-app/src/startup.ts:84]。

| 旗标 | 解析 | 缺省 | 门控 |
|---|---|---|---|
| `--host <host>` | `WebStartupValues.host?: string` | 不提供该字段；`webserver` 用 `ctx.webStartup.host ?? '127.0.0.1'` [E: packages/bundle/web-app/cordis.patch.yml:115] | 等于 `'0.0.0.0'` 时 `program.error`，不 provide 服务 [E: packages/bundle/web-app/src/startup.ts:75] |
| `--port <port>` | `Number(options.port)` | 不提供该字段；`webserver` 用 `ctx.webStartup.port ?? 3080` [E: packages/bundle/web-app/cordis.patch.yml:116] | 非 `/^\d+$/` 则 error；`0` 表示让 OS 选空闲端口 [E: packages/bundle/web-app/src/startup.ts:78] |
| `--trusted-host <authority...>` | 可重复；拼进 `trustedHosts: string[]` | `[]` [E: packages/bundle/web-app/src/startup.ts:84] | 作为 `/api` browser-trust 的额外 authority（`host` 或 `host:port`） |
| `--no-open` | `openBrowser: options.open` | 缺省打开浏览器 [E: packages/bundle/web-app/src/startup.ts:52] | `web-runtime` 读 `openBrowser: !!js ctx.webStartup.openBrowser` [E: packages/bundle/web-app/cordis.patch.yml:134] |

无旗标 boot 时服务值是 `{ openBrowser: true, trustedHosts: [] }` [E: packages/bundle/web-app/tests/startup.spec.ts:110]；fixture consumer 的 `??` 把 bind 读成 `host: '127.0.0.1'`、`port: 3080` [E: packages/bundle/web-app/tests/startup.spec.ts:113]。`--help` 走 commander help：action 不跑，`webStartup` 为 `undefined` [E: packages/bundle/web-app/tests/startup.spec.ts:124]，consumer 的 `readerConfig` 也不出现 [E: packages/bundle/web-app/tests/startup.spec.ts:125]。

`WebServer.Config.host` 只接受 `'127.0.0.1' | '0.0.0.0'` [E: packages/host/webserver/src/index.ts:61]。所以 `--host 1.2.3.4` 能过 `web-startup`，但会在 `webserver` 行的 schema 校验上失败。旗标路径上真正能用的 bind host 是省略（回退 loopback）或显式 `127.0.0.1`。后续 `--patch` 若整行改写 `webserver.config.host`，schema 仍允许 `0.0.0.0`——那是 composition overlay，不是 `--host` 旗标。

内建 bin 验收：`dsh web --host 0.0.0.0` 的 stderr 含 safety 句子 [E: apps/cli/tests/built-bin.e2e.ts:365]，stdout 为空 [E: apps/cli/tests/built-bin.e2e.ts:364]。

### 模板 bundles

```ts
web: {
  bundles: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app'],
  patchReload: 'live',
}
```

[E: packages/boot/app-boot/src/profile.ts:142] [E: packages/boot/app-boot/src/profile.ts:144]

同表还有 `headless` / `sdk` / `sdk-minimal` / `acp` [E: packages/boot/app-boot/src/profile.ts:137]。测试断言 `PROFILE_TEMPLATES.web.bundles` 含 `dsh-base` 且 `patchReload` 为 `'live'` [E: packages/boot/app-boot/tests/profile.spec.ts:193] [E: packages/boot/app-boot/tests/profile.spec.ts:193]。bundle 解析安装锚点优先于 profile 目录，保证 in-box 的 `@deepseek-ai/dsh-base` / `@deepseek-ai/dsh-web-app` 来自当前 dsh 安装。

### Overlay：改写已有 id

web patch 在 base insert 之后按 id 整行覆盖 `config`（不 merge）。shipped 改写：

| `id` | web 写出的值 | 作用 |
|---|---|---|
| `system-prompt` | `persona` 固定英文句（`{{model}}` / `{{cwd}}`） | 部署级 persona；preset 仍可再叠自己的 `persona` |
| `session-query-sqlite` | `path: ':memory:'`，`openAt: never` | 与 base 同值的再陈述，方便更后层只改 `openAt` |
| `tools` | `mode: !!js process.env.DSH_TOOLS_MODE` [E: packages/bundle/web-app/cordis.patch.yml:37] | 进程级 PTC 呈现开关。unset 时表达式是 `undefined`，`ToolRuntime.Config.mode` 回落到 `'native'` [E: packages/core/tools/src/index.ts:784] |

web overlay **不再**改写 `hmr`。base 已把 `hmr` 行 `disabled: true`、`root: ['.']` [E: packages/bundle/base/cordis.patch.yml:23]。live 用户层热更新靠 launcher 的 watch-only 实例（见装配节）。

### Overlay：host 插入行

第一段 `insert` 是 web 独有的 host / transport / 浏览器 roster。`ui-*` 是 `dsh.client` 行：node 半边扫进 `window.__DSH_BOOT__`，浏览器半边是壳模块。下表列出全部 shipped id，不当独立子系统展开。旧 `api-gateway: dsh-host-apiproxy` 与 `client-runtime: dsh-client-runtime` 行已不存在。

| `id` | `name` |
|---|---|
| `subagent-model-selection-settings` | `@deepseek-ai/dsh-tool-subagent/model-selection-settings` |
| `code-runtime` | `@deepseek-ai/dsh-code-runtime-worker-thread` |
| `message-feedback` | `@deepseek-ai/dsh-message-feedback` |
| `session-log-download` | `@deepseek-ai/dsh-session-log-export` |
| `workspace` | `@deepseek-ai/dsh-workspace` |
| `session-reference` | `@deepseek-ai/dsh-session-reference` |
| `file-reference-local` | `@deepseek-ai/dsh-file-reference-local` |
| `session-stats` | `@deepseek-ai/dsh-session-stats` |
| `directory-picker` | `@deepseek-ai/dsh-host-directory-picker-auto` |
| `plugin-inventory` | `@deepseek-ai/dsh-host-plugin-inventory` |
| `session-controller` | `@deepseek-ai/dsh-api-session-controller` |
| `settings-controller` | `@deepseek-ai/dsh-api-settings-controller` |
| `workspace-controller` | `@deepseek-ai/dsh-api-workspace-controller` |
| `cordis-host-runner` | `@deepseek-ai/dsh-cordis-host-runner` |
| `web-startup` | `@deepseek-ai/dsh-web-app/startup` |
| `webserver` | `@deepseek-ai/dsh-host-webserver` |
| `web-runtime` | `@deepseek-ai/dsh-web-app` |
| `client-hmr` | `@deepseek-ai/dsh-client-hmr` |
| `modules` | `@deepseek-ai/dsh-client-modules` |
| `connection` | `@deepseek-ai/dsh-client-connection` |
| `api-remotes` | `@deepseek-ai/dsh-api-remotes` |
| `cordis-client-runner` | `@deepseek-ai/dsh-cordis-client-runner` |
| `ui-theme` | `@deepseek-ai/dsh-client-ui-theme` |
| `locale` | `@deepseek-ai/dsh-client-locale` |
| `ui-layout` | `@deepseek-ai/dsh-client-ui-layout` |
| `ui-renderer` | `@deepseek-ai/dsh-client-ui-renderer` |
| `ui-session` | `@deepseek-ai/dsh-client-ui-session` |
| `ui-sidebar` | `@deepseek-ai/dsh-client-ui-sidebar` |
| `ui-settings` | `@deepseek-ai/dsh-client-ui-settings` |
| `ui-settings-general` | `@deepseek-ai/dsh-client-ui-settings-general` |
| `ui-settings-models` | `@deepseek-ai/dsh-client-ui-settings-models` |
| `ui-settings-plugin-inventory` | `@deepseek-ai/dsh-client-ui-settings-plugin-inventory` |
| `ui-conversation` | `@deepseek-ai/dsh-client-ui-conversation` |
| `ui-approval` | `@deepseek-ai/dsh-client-ui-approval` |
| `ui-chat` | `@deepseek-ai/dsh-client-ui-chat` |
| `ui-brand-official` | `@deepseek-ai/dsh-client-ui-brand-official` |
| `ui-attachment` | `@deepseek-ai/dsh-client-ui-attachment` |
| `ui-tool` | `@deepseek-ai/dsh-client-ui-tool` |
| `ui-cordis` | `@deepseek-ai/dsh-client-ui-cordis` |
| `ui-workflow-run` | `@deepseek-ai/dsh-client-ui-workflow-run` |
| `ui-deliverables` | `@deepseek-ai/dsh-client-ui-deliverables` |
| `ui-workspace` | `@deepseek-ai/dsh-client-ui-workspace` |
| `ui-input-trigger` | `@deepseek-ai/dsh-client-ui-input-trigger` |
| `ui-commands` | `@deepseek-ai/dsh-client-ui-commands` |
| `ui-skill` | `@deepseek-ai/dsh-client-ui-skill` |
| `ui-subagent` | `@deepseek-ai/dsh-client-ui-subagent` |
| `ui-reference` | `@deepseek-ai/dsh-client-ui-reference` |
| `ui-schedule` | `@deepseek-ai/dsh-client-ui-schedule`（行内 `disabled: true`） |
| `ui-jobs` | `@deepseek-ai/dsh-client-ui-jobs` |
| `ui-goal` | `@deepseek-ai/dsh-client-ui-goal` |
| `ui-message-feedback` | `@deepseek-ai/dsh-client-ui-message-feedback` |
| `ui-model-selection` | `@deepseek-ai/dsh-client-ui-model-selection` |
| `ui-permission` | `@deepseek-ai/dsh-client-ui-permission-presets` |
| `ui-agent-preset` | `@deepseek-ai/dsh-client-ui-agent-preset` |
| `ui-settings-plugins` | `@deepseek-ai/dsh-client-ui-settings-plugins` |
| `ui-plan` | `@deepseek-ai/dsh-client-ui-plan` |
| `ui-user-questions` | `@deepseek-ai/dsh-client-ui-user-questions` |
| `ui-trajectory` | `@deepseek-ai/dsh-client-ui-trajectory` |

`webserver` `inject: [webStartup]` [E: packages/bundle/web-app/cordis.patch.yml:113]；`web-runtime` 同样 `inject: [webStartup]` [E: packages/bundle/web-app/cordis.patch.yml:132]。`connection` 再 `inject: [webRuntime]`，把 LAN 快照和 `--trusted-host` 写进 `/api` trust fence。`client-hmr` 始终挂着，空闲直到 `pnpm run dev:web` 改写 client bundle；它和 base 被 disable 的共享 `hmr` 行不是同一条。

第二段 `insert` 只有 roster：

| `id` | `name` | `config` |
|---|---|---|
| `agent-presets` | `@deepseek-ai/dsh-agent-presets` | `default: standard` [E: packages/bundle/web-app/cordis.patch.yml:445] |

`AgentPresets.defaultId` = settings 文档 `default`，否则 `config.default` [E: packages/preset/agent-presets/src/index.ts:241]。web 没写 settings 时，新会话就落到 `standard`。web 行不重写 `includeShippedRoot` / `includeUserRoot`；schema 默认都是 `true` [E: packages/preset/agent-presets/src/index.ts:110]。shipped 根是包内 `SHIPPED_PRESET_ROOT`（`presets/`）[E: packages/preset/agent-presets/src/discovery.ts:60]，不是 launcher 往 `config.roots` 塞路径。五个 shipped profile 里只有 web overlay insert 这份 roster。

### Overlay：整表 disable 的 base 行

disable 而不是删除：base 被多个 profile 共享，缺行会在以后重排 composition 时静默回归。web 对下列 **每一个** id 写了 `disabled: true`（无平台条件，覆盖 base 里 `tool-bash` / `tool-pwsh` 的 `process.platform` 表达式）：

| `id` | 行 |
|---|---|
| `tool-bash` | [E: packages/bundle/web-app/cordis.patch.yml:321] |
| `tool-pwsh` | [E: packages/bundle/web-app/cordis.patch.yml:324] |
| `tool-jobs` | [E: packages/bundle/web-app/cordis.patch.yml:337] |
| `tool-fs` | [E: packages/bundle/web-app/cordis.patch.yml:340] |
| `tool-fs-search` | [E: packages/bundle/web-app/cordis.patch.yml:343] |
| `tool-str-replace-editor` | [E: packages/bundle/web-app/cordis.patch.yml:346] |
| `skill-filesystem` | [E: packages/bundle/web-app/cordis.patch.yml:358] |
| `tool-skill` | [E: packages/bundle/web-app/cordis.patch.yml:361] |
| `command-goal` | [E: packages/bundle/web-app/cordis.patch.yml:367] |
| `tool-goal` | [E: packages/bundle/web-app/cordis.patch.yml:370] |
| `plan-mode` | [E: packages/bundle/web-app/cordis.patch.yml:373] |
| `compaction-basic` | [E: packages/bundle/web-app/cordis.patch.yml:383] |
| `command-compact` | [E: packages/bundle/web-app/cordis.patch.yml:386] |
| `tool-result-pruner` | [E: packages/bundle/web-app/cordis.patch.yml:389] |
| `tool-subagent-control` | [E: packages/bundle/web-app/cordis.patch.yml:399] |
| `tool-subagent-list-agents` | [E: packages/bundle/web-app/cordis.patch.yml:402] |
| `tool-subagent` | [E: packages/bundle/web-app/cordis.patch.yml:405] |
| `tool-subagent-fork` | [E: packages/bundle/web-app/cordis.patch.yml:408] |
| `workflow-worker-thread` | [E: packages/bundle/web-app/cordis.patch.yml:417] |
| `tool-workflow` | [E: packages/bundle/web-app/cordis.patch.yml:420] |
| `tool-ralph` | [E: packages/bundle/web-app/cordis.patch.yml:423] |
| `agent-instructions` | [E: packages/bundle/web-app/cordis.patch.yml:426] |
| `tool-todo` | [E: packages/bundle/web-app/cordis.patch.yml:429] |
| `tool-web` | [E: packages/bundle/web-app/cordis.patch.yml:432] |

这些行里既有模型可见 tool（`tool-*`），也有会跟着 agent 走的后端 / prompt 段（`plan-mode`、`compaction-basic`、`workflow-worker-thread`、`agent-instructions`、`skill-filesystem`）。标准产品里它们由 `standard` / `ptc` / `cordis` / `minimal` 的 `agent.cordis.yml` 再挂；本页不把仓库里存在的包装成「web 默认就有」。`command-goal` 也随 tool 一起 disable（旧页漏了这一行）。

### Host 面留下的 registry / service

web patch **没有**对下列 base `id` 写 `disabled: true`。它们继续作为进程级 Provider，供每个 preset Consumer `ctx.get`：

| host `id` | base 行 | web 只 disable 的对应模型可见 / 每会话行 |
|---|---|---|
| `shell-env` | [E: packages/bundle/base/cordis.patch.yml:249] | 无对应 tool 行。`web-runtime` 在 bind 后 `shellEnv.register` `DSH_WEB_URL` [E: packages/bundle/web-app/src/index.ts:255] |
| `jobs` | [E: packages/bundle/base/cordis.patch.yml:81] | `tool-jobs` |
| `skill` | [E: packages/bundle/base/cordis.patch.yml:279] | `skill-filesystem`、`tool-skill`（preset 再挂自己的 `skill-filesystem` 进 per-scope 层） |
| `goal` | [E: packages/bundle/base/cordis.patch.yml:298] | `tool-goal` / `command-goal`。`goal-round-driver` 未 disable |
| `token-meter` | [E: packages/bundle/base/cordis.patch.yml:323] | `compaction-basic`、`command-compact`、`tool-result-pruner` |
| `subagent` | [E: packages/bundle/base/cordis.patch.yml:334] | `tool-subagent*`、`tool-workflow`、`tool-ralph`、`workflow-worker-thread`。`subagent-spawn-in-process` / `subagent-fork-in-process` 未 disable——registry 是跨会话单例。`tool-subagent-report` 已删除 |

`apps/cli/src/` 当下没有 `web.ts`。`DSH_WEB_URL` 的真实注册点是 `web-runtime`（`@deepseek-ai/dsh-web-app`）对 host 面 `shell-env` 的 `register` [E: packages/bundle/web-app/src/index.ts:252]。就绪行是 `console.log(\`dsh web: ${authenticatedUrl}…\`)` [E: packages/bundle/web-app/src/index.ts:280]。默认模型仍来自 base：`provider: deepseek-official` / `model: deepseek-v4-flash` [E: packages/bundle/base/cordis.patch.yml:78] [E: packages/bundle/base/cordis.patch.yml:79]。

## 装配与门控

叠层顺序（`apps/cli/src/profile-boot.ts` 文件内函数 `composeProfile`，**未导出**）：

1. `prepareProfile`（把 profile 根 `cordis.yml` 重写成空数组）+ `healProfilesModuleFallback` + `loadProfile`。
2. bundle layers：`dsh-base` 的 insert，然后 `dsh-web-app` 的 override / insert / disable。拼进 `allPatches` 的四段是 bundle → profile `cordis.patch.yml` → home → overlays [E: apps/cli/src/profile-boot.ts:137]。
3. `$DSH_HOME/profiles/web/cordis.patch.yml`。
4. `$DSH_HOME/cordis.patch.yml`。
5. 每个 `--patch` overlay，argv 顺序。
6. `DSH_TELEMETRY_DISABLED` 非空且树里有 `session-telemetry-otel` 时，再 disable 该行 [E: apps/cli/src/profile-boot.ts:170]。**不再**由 launcher overlay 注入 `SHIPPED_PRESET_ROOT`；那是 `dsh-agent-presets` 自己的 `includeShippedRoot`。

`dsh --profile web --dump-config` 走 `runDumpConfig`：layer 表从 `prepareProfile` 的 bundle 列表开始 [E: apps/cli/src/dump-config.ts:31]，非 `defaultOnly` 时再追加 profile / home / `--patch` 文件 [E: apps/cli/src/dump-config.ts:36]。dump 不 mount 入口表、不跑 `web-startup`，因此看不到 `--host` / `--port` 决议后的值。telemetry 开关是 `composeProfile`（`runProfile` 路径）另补的 overlay；dump 不套 `resolveTelemetryPatch`。

`web-startup` 是普通 plugin：`inject: ['cmdlineArgs']`，成功 parse 才 `provide('webStartup')`。失败与 `--help` 都走 `parseCmdline` 的 `ctx.appExit`，服务不出现。`webserver` / `web-runtime` 因 `inject: [webStartup]` 不会激活，进程不 bind。这就是「help 不挂服务器」。

`runProfile` 只在 `composed.profile.patchReload === 'live'` 时安装用户层 watcher [E: apps/cli/src/profile-boot.ts:271]。web 模板正是 live。此时若 `ctx.get('hmr') === undefined` [E: apps/cli/src/profile-boot.ts:283]（base 把共享 `hmr` 行 disable [E: packages/bundle/base/cordis.patch.yml:23]），会再 `loader.create` 一个 `config: { root: [] }` 的 `@deepseek-ai/cordis-plugin-hmr` [E: apps/cli/src/profile-boot.ts:285]，然后 `watchUserPatches` 同时盯 profile `cordis.patch.yml` 与 `$DSH_HOME/cordis.patch.yml` [E: apps/cli/src/profile-boot.ts:287] [E: apps/cli/src/profile-boot.ts:294]。client 插件热更新走另一条已 insert 的 `client-hmr`。live 重组合顺序与 boot 的 `allPatches` 相同：bundle → 用户两文件 → overlays [E: apps/cli/src/profile-boot.ts:243]。

Preset 挂载门控：`mountPreset` 拒绝无 scope 的 context [E: packages/preset/agent-presets/src/mount.ts:382]；`leakedServices` 非空则抛错 [E: packages/preset/agent-presets/src/mount.ts:407]，要求该服务放进 `isolate` realm 或搬回 host composition [E: packages/preset/agent-presets/src/mount.ts:411]。这就是 web 把 `jobs` / `skill` / `goal` / `subagent` / `token-meter` / `shell-env` 留在 host 的组合原因：Host Remote 与跨会话查询要从 host 解析这些名字；搬进 per-session realm 会变成 `service-unavailable` 或第二次会话撞名。

失败怎么响：

| 条件 | 响应 |
|---|---|
| `--host 0.0.0.0` | usage error，exit 1，不 provide `webStartup` |
| 非数字 `--port` | 同上 |
| `--help` | 打印 `dsh --profile web` 自己的 help，exit 0，不 bind |
| 未知 profile 名且无目录 | `loadProfile` 抛错，指向 `dsh plugin --profile <name> add` |
| frontend 包解析失败 | `web-runtime` 抛 `web-app: @deepseek-ai/dsh-web-frontend is not resolvable from this composition` [E: packages/bundle/web-app/src/index.ts:177] |
| listen 失败 | `WebServer` 初始化 reject，boot fail-loud |
| preset 行泄漏服务 | `mountPreset` 整次 create 回滚 |

## 跨包关系

- `surface.cli.overview`（[../cli/overview.md](../cli/overview.md)）— launcher 三种 mode 与旗标边界；`dsh web` 在那里只是 alias，本页展开 web 的 app 旗标与 bind。其它宿主用 `dsh --profile sdk|sdk-minimal|acp|headless`。
- `surface.presets.overview`（[../presets/overview.md](../presets/overview.md)）— roster 发现、`mountPreset`、`defaultId`、四个 shipped preset（`minimal` / `standard` / `ptc` / `cordis`）。web 只负责把 `agent-presets` 插进 host 树并给出 `default: standard`。
- `surface.profiles.headless`（[headless.md](headless.md)）— 另一份 `PROFILE_TEMPLATES` 键：`dsh-base` + `dsh-headless`，`patchReload: startup`，**不** insert `agent-presets`；模型可见工具留在 base 的 host 行。
- `spine.composition-boot`（[../../spine/composition-boot.md](../../spine/composition-boot.md)）— `profile → bundle → preset` 的端到端叠层与 `composeEntries`。
- `surface.web.workbench`（[../web/workbench.md](../web/workbench.md)）— 浏览器壳、槽位与 chrome；本页只覆盖进程组合与 bind，不走第一轮 turn。
- `spine.trace-web-first-prompt`（[../../spine/trace-web-first-prompt.md](../../spine/trace-web-first-prompt.md)）— 从 `dsh web` 到第一轮提问的控制流。

## Sources

- `packages/bundle/web-app/cordis.patch.yml`
- `packages/bundle/web-app/src/startup.ts`
- `packages/bundle/web-app/src/index.ts`
- `packages/bundle/web-app/package.json`
- `packages/bundle/web-app/tests/startup.spec.ts`
- `packages/bundle/base/cordis.patch.yml`
- `packages/boot/app-boot/src/profile.ts`
- `packages/boot/app-boot/src/index.ts`
- `packages/boot/app-boot/tests/profile.spec.ts`
- `packages/host/webserver/src/index.ts`
- `packages/core/tools/src/index.ts`
- `packages/preset/agent-presets/src/index.ts`
- `packages/preset/agent-presets/src/discovery.ts`
- `packages/preset/agent-presets/src/mount.ts`
- `apps/cli/src/args.ts`
- `apps/cli/src/bin.ts`
- `apps/cli/src/dump-config.ts`
- `apps/cli/src/profile-boot.ts`
- `apps/cli/tests/args.spec.ts`
- `apps/cli/tests/built-bin.e2e.ts`

## 相关

- `surface.cli.overview`：[CLI 入口与旗标](../cli/overview.md)
- `surface.presets.overview`：[agent preset 总览](../presets/overview.md)
- `surface.profiles.headless`：[headless profile](headless.md)
- `spine.composition-boot`：[组合启动(profile→bundle→preset)](../../spine/composition-boot.md)
- `surface.web.workbench`：[Web 工作台可见面](../web/workbench.md)
- `spine.trace-web-first-prompt`：[trace: Web 第一次提问](../../spine/trace-web-first-prompt.md)
