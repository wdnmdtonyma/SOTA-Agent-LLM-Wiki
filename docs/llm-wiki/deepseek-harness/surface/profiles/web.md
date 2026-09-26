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
  - packages/bundle/web-app/presets/standard.patch.yml
  - packages/bundle/web-app/presets/ptc.patch.yml
  - packages/bundle/web-app/presets/minimal.patch.yml
  - packages/bundle/web-app/presets/cordis.patch.yml
  - packages/bundle/web-app/tests/startup.spec.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/boot/app-boot/src/profile.ts
  - packages/boot/app-boot/src/profile-context.ts
  - packages/boot/app-boot/src/index.ts
  - packages/boot/app-boot/tests/profile.spec.ts
  - packages/host/webserver/src/index.ts
  - packages/core/tools/src/index.ts
  - packages/preset/agent-preset-registry/src/index.ts
  - packages/preset/agent-preset-registry/src/mount.ts
  - apps/cli/src/args.ts
  - apps/cli/src/bin.ts
  - apps/cli/src/dump-config.ts
  - apps/cli/src/profile-boot.ts
  - apps/cli/tests/args.spec.ts
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
updated: 477b4f4205
---

> `web` 是 shipped **Cordis 组合**模板：`PROFILE_TEMPLATES.web` 把 `@deepseek-ai/dsh-base` 叠上 `@deepseek-ai/dsh-web-app`。进程级 **host 面**挂 webserver / API controller / 浏览器 roster，并把 base 上的模型可见工具行 `disabled: true`，改由每会话 **agent-preset 面**（默认 `standard`）再挂。四个 shipped preset 声明只作为本 bundle `dsh.bundle.patch` 列表的后续文件叠上。`dsh web` 与 `dsh --profile web` 是同一条 profile boot（通用 `dsh <name>` 简写）。`desktop` 不是第六个 CLI profile。

## 能回答的问题

- `dsh web` 和 `dsh --profile web` 是不是同一次 profile boot？app 旗标 `--host` / `--port` / `--trusted-host` / `--no-open` 谁解析？缺省 bind 是什么？
- 为什么 `--host 0.0.0.0` 会在提供 `webStartup` 之前被拒？`--help` 为什么不 bind 端口？
- `PROFILE_TEMPLATES.web` 的两个 bundle 是什么？第一次启动如何写出 `$DSH_HOME/profiles/web/`？
- web overlay 整表 disable 了哪些 base `id`？`shell-env` / `jobs` / `skill` / `goal` / `token-meter` / `subagent` / `ptc-runtime` 为什么仍留在 host 面？
- `agent-preset-registry` 行怎样进树？`default: standard` 谁写的？四个 `presets/*.patch.yml` 为什么只叠在 `dsh-web-app`？
- 部署 persona 现在是 `personaPrefix` / `personaSuffix` 还是旧的单字段 `persona`？默认模型是什么？

## 是什么

DSH 是 **Cordis 组合运行时**。一次 `web` 启动走主线 `profile → bundle → agent preset`：

1. **profile**：`$DSH_HOME/profiles/web/`，`package.json` 的 `dsh.profile.bundles` 列出有序 bundle 层，同目录 `cordis.patch.yml` 是用户层。
2. **bundle**：npm 包装层。`@deepseek-ai/dsh-web-app` 的 `dsh.bundle.patch` 是**有序列表**：`./cordis.patch.yml` 之后叠 `./presets/{standard,ptc,minimal,cordis}.patch.yml`。[E: packages/bundle/web-app/package.json:43]
3. **agent preset**：会话级 composition。web 在 host 树里 insert `agent-preset-registry`，`default: standard`。[E: packages/bundle/web-app/cordis.patch.yml:559] [E: packages/bundle/web-app/cordis.patch.yml:562] 四个 shipped 声明行是同一 bundle 层里的 `@deepseek-ai/dsh-agent-preset` 插件，roster id 是 `minimal` / `standard` / `ptc` / `cordis`。旧包 `packages/preset/agent-presets` 与目录 `presets/*/agent.cordis.yml` 已删除。

capability seam 仍是 **Definition / Provider / Consumer**。host 面提供 `ctx.webServer`、`ctx.shellEnv`、`ctx.jobs`、`ctx.skills`、`ctx.goals`、`ctx.subagents`、`ctx.ptcRuntime` 以及 session / workspace-files / settings / workspace controller；preset 面提供模型可见的 tool / persona / isolate。**model-visible ⟺ logged**。

五个 shipped CLI profile 键在 `PROFILE_TEMPLATES`：`acp` / `web` / `headless` / `sdk` / `sdk-minimal`。[E: packages/boot/app-boot/src/profile.ts:179] 模板只有 `bundles`，没有 `patchReload` 字段。[E: packages/boot/app-boot/src/profile.ts:43] `desktop` 不在这张表里。HMR 是 `dsh-base` 的 YAML 行（有 `profileContext` 时启用），不是 launcher watcher。

## 入口

用户碰到 `web` 的方式：

| 入口 | 行为 |
|---|---|
| `dsh web [app args...]` | 第一个非 `-` token 展开成 `--profile web` [E: apps/cli/src/args.ts:201]；无 dump 旗标时得到 `mode: 'profile'` [E: apps/cli/tests/args.spec.ts:30] |
| `dsh --profile web [app args...]` | 显式 profile 名，同一条 `mode: 'profile'` 路径 |
| `dsh --profile web --help` / `dsh web --help` | launcher 把 `-h` 放进 inner `args` [E: apps/cli/tests/args.spec.ts:40]；app 打 `Usage: dsh --profile web` |
| `dsh --profile web --dump-config` | `mode: 'dump-config'`，不 boot、不跑 `web-startup` |
| `$DSH_HOME/profiles/web/cordis.patch.yml` | 用户层，叠在 web-app 那一层（五份文件已拼接）之后 |
| `$DSH_HOME/cordis.patch.yml` | home 层，对每个 profile 再生效 |
| `--patch <path>`（可重复） | launcher overlay，再往后叠 |

`parse(['web'])` 的解析结果是 `{ mode: 'profile', profile: 'web', patches: [], args: [] }`。[E: apps/cli/tests/args.spec.ts:30] `bin.ts` 在 `mode: 'profile'` 下 `import('./profile-boot.ts')`，并以 `profile` / `fromDefaultProfile` 调用 `runProfile`。[E: apps/cli/src/bin.ts:24] [E: apps/cli/src/bin.ts:26]

Launcher 吃 `--profile` / `--from-default-profile` / `--patch` / `--dump-config` / `--dump-default-config` / `--dump-config-schema` / `-V|--version`；`--host` / `--port` / `--trusted-host` / `--no-open` 作为 inner args 交给树里的 `web-startup`。help 例子里的 `tui` 只是自定义 profile 名，不在 `PROFILE_TEMPLATES` 里。`dsh --profile desktop` 在 launcher 就被拒，见 [`surface.cli.overview`](../cli/overview.md)。

第一次 `dsh web`：`loadProfile` 发现 `$DSH_HOME/profiles/web/package.json` 不存在，且 `name === 'web'` 命中模板，调用 `initProfile(dir, template.bundles)`。[E: packages/boot/app-boot/src/profile.ts:709] [E: packages/boot/app-boot/src/profile.ts:715] 未知名字第一次 `--profile <unknown>` **不会**自动 init。[E: packages/boot/app-boot/src/profile.ts:712]

## 关键字段

### App 旗标（`web-startup`）

`WEB_STARTUP_SERVICE` 的字面量是 `'webStartup'`。[E: packages/bundle/web-app/src/startup.ts:20] commander action 里 `ctx.provide(WEB_STARTUP_SERVICE, …)`。[E: packages/bundle/web-app/src/startup.ts:80] `openBrowser` 来自 commander 的 `--no-open`（默认打开）。[E: packages/bundle/web-app/src/startup.ts:81]

| 旗标 | 解析 | 缺省 | 门控 |
|---|---|---|---|
| `--host <host>` | `WebStartupValues.host?: string` | 不提供该字段；`webserver` 用 `ctx.webStartup.host ?? '127.0.0.1'` [E: packages/bundle/web-app/cordis.patch.yml:167] | 等于 `'0.0.0.0'` 时 `program.error`，不 provide 服务 [E: packages/bundle/web-app/src/startup.ts:74] |
| `--port <port>` | `Number(options.port)` | 不提供该字段；`webserver` 用 `ctx.webStartup.port ?? 3080` [E: packages/bundle/web-app/cordis.patch.yml:168] | 非 `/^\d+$/` 则 error；`0` 表示让 OS 选空闲端口 [E: packages/bundle/web-app/src/startup.ts:77] |
| `--trusted-host <authority...>` | 可重复；拼进 `trustedHosts: string[]` | `[]` [E: packages/bundle/web-app/src/startup.ts:84] | 作为 `/api` browser-trust 的额外 authority |
| `--no-open` | `openBrowser: options.open` | 缺省打开浏览器 [E: packages/bundle/web-app/src/startup.ts:52] | `web-runtime` 读 `openBrowser` |

`WebServer.Config.host` 只接受 `'127.0.0.1' | '0.0.0.0'`。[E: packages/host/webserver/src/index.ts:61] 所以 `--host 1.2.3.4` 能过 `web-startup`，但会在 `webserver` 行的 schema 校验上失败。

### 模板 bundles

```ts
web: {
  bundles: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app'],
}
```

[E: packages/boot/app-boot/src/profile.ts:183] [E: packages/boot/app-boot/src/profile.ts:184]

同表还有 `headless` / `sdk` / `sdk-minimal` / `acp`。[E: packages/boot/app-boot/src/profile.ts:179] bundle 解析安装锚点优先于 profile 目录。五个 shipped CLI profile 里**只有 web** 叠 `dsh-web-app`，因此也只有 web 带四份 preset 文件。

### Overlay：改写已有 id

web patch 在 base insert 之后按 id 整行覆盖 `config`（不 merge）。shipped 改写：

| `id` | web 写出的值 | 作用 |
|---|---|---|
| `system-prompt` | `personaPrefix` + `personaSuffix`（`{{model}}` / `{{cwd}}`） | 部署级 persona **两字段**；不是旧的单字段 `persona` / `text`。[E: packages/bundle/web-app/cordis.patch.yml:16] |
| `session-query-sqlite` | `path: ':memory:'`，`openAt: never` | 与 base 同值的再陈述 |
| `tools` | `mode: !!js process.env.DSH_TOOLS_MODE` [E: packages/bundle/web-app/cordis.patch.yml:32] | 进程级 PTC 呈现开关。unset 时表达式是 `undefined`，schema 回落到 `'native'` |

web overlay **不再**改写 `hmr`。base 已把 `hmr` 行写成 `disabled: !!js "!ctx.get('profileContext')"`：带 profile 的 web 进程启用 watch-only HMR。

### Overlay：host 插入行

第一段 `insert` 是 web 独有的 host / transport / 浏览器 roster。`ui-*` 是 `dsh.client` 行。下表列出关键 shipped id，不当独立子系统展开。旧 `api-gateway: dsh-host-apiproxy` 与 `client-runtime: dsh-client-runtime` 行已不存在。**没有**独立的 `code-runtime` 行（TypeScript runtime 是 base 的 `ptc-runtime`）。

| `id` | `name` |
|---|---|
| `web-startup` | `@deepseek-ai/dsh-web-app/startup` [E: packages/bundle/web-app/cordis.patch.yml:155] |
| `webserver` | `@deepseek-ai/dsh-host-webserver`，`inject: [webStartup]` [E: packages/bundle/web-app/cordis.patch.yml:163] |
| `web-runtime` | `@deepseek-ai/dsh-web-app` |
| `client-hmr` | `@deepseek-ai/dsh-client-hmr` |
| `connection` | `@deepseek-ai/dsh-client-connection` |
| `session-controller` / `settings-controller` / `workspace-controller` | API controller |
| `ui-*` | 浏览器 chrome（与工作台表同序） |

完整 `ui-*` 一句职责见 [`surface.web.workbench`](../web/workbench.md)。

第二段 `insert` 只有 roster：

| `id` | `name` | `config` |
|---|---|---|
| `agent-preset-registry` | `@deepseek-ai/dsh-agent-preset-registry` | `default: standard` [E: packages/bundle/web-app/cordis.patch.yml:562] |

`AgentPresetRegistry.Config.default` 必填。web 没写 settings 时，新会话就落到 `standard`。五个 shipped CLI profile 里只有 web overlay insert 这份 roster。

### Overlay：整表 disable 的 base 行

disable 而不是删除：base 被多个 profile 共享。web 对下列 **每一个** id 写了 `disabled: true`（无平台条件）。**没有** `tool-str-replace-editor` 行——base 已不挂该包，无需再 disable。

| `id` | 行 |
|---|---|
| `tool-plugin-manager` | [E: packages/bundle/web-app/cordis.patch.yml:444] |
| `tool-bash` | [E: packages/bundle/web-app/cordis.patch.yml:447] |
| `tool-pwsh` | [E: packages/bundle/web-app/cordis.patch.yml:450] |
| `tool-jobs` | [E: packages/bundle/web-app/cordis.patch.yml:463] |
| `tool-fs` / `tool-fs-search` | [E: packages/bundle/web-app/cordis.patch.yml:466] |
| `skill-filesystem` / `tool-skill` | [E: packages/bundle/web-app/cordis.patch.yml:481] |
| `command-goal` / `tool-goal` / `plan-mode` | [E: packages/bundle/web-app/cordis.patch.yml:490] |
| `compaction-basic` / `command-compact` / `tool-result-pruner` | [E: packages/bundle/web-app/cordis.patch.yml:506] |
| `tool-subagent-control` / `tool-subagent-list-agents` / `tool-subagent` / `tool-subagent-fork` | [E: packages/bundle/web-app/cordis.patch.yml:522] |
| `workflow-ptc` / `tool-workflow` / `tool-ralph` | [E: packages/bundle/web-app/cordis.patch.yml:534] |
| `agent-instructions` / `tool-todo` / `tool-web` | [E: packages/bundle/web-app/cordis.patch.yml:546] |

标准产品里这些行由 `standard` / `ptc` / `cordis` / `minimal` 的 preset 声明再挂。`minimal` 现在只提供持久 shell。`plugin_manager` 在 shipped preset 行默认仍 `disabled`。

### Host 面留下的 registry / service

web patch **没有**对下列 base `id` 写 `disabled: true`。它们继续作为进程级 Provider：`shell-env`、`jobs`、`skill`、`goal`、`token-meter`、`subagent` backends、`ptc-runtime`、`approval` / `permission` / `commands`。就绪行是 `console.log(\`dsh web: ${authenticatedUrl}…\`)`。[E: packages/bundle/web-app/src/index.ts:271] 默认模型来自 base：`provider: deepseek-official` / `model: deepseek-flash`。[E: packages/bundle/base/cordis.patch.yml:85] [E: packages/bundle/base/cordis.patch.yml:86] **不是** `deepseek-v4-flash`（acp-app 仍硬编码那个字面量，不在本页）。

## 装配与门控

叠层顺序（`apps/cli/src/profile-boot.ts` 文件内函数 `composeProfile`，**未导出**）：

1. `prepareProfile`（把 profile 根 `cordis.yml` 重写成空数组）+ `loadProfile`。
2. bundle layers：`dsh-base` 的 insert，然后 `dsh-web-app` 的五份文件（同一层已拼接）。`readProfilePatches` 四段是 bundle → profile `cordis.patch.yml` → home → overlays。[E: packages/boot/app-boot/src/profile-context.ts:65]
3. `$DSH_HOME/profiles/web/cordis.patch.yml`。
4. `$DSH_HOME/cordis.patch.yml`。
5. 每个 `--patch` overlay，argv 顺序。
6. `DSH_TELEMETRY_DISABLED` 非空且树里有 `session-telemetry-otel` 时，再 disable 该行。

`dsh --profile web --dump-config` 走 `runDumpConfig`：不 mount 入口表、不跑 `web-startup`。[E: apps/cli/src/dump-config.ts:32]

`web-startup` 是普通 plugin：`inject: ['cmdlineArgs']`，成功 parse 才 `provide('webStartup')`。[E: packages/bundle/web-app/src/startup.ts:17] 失败与 `--help` 都走 `parseCmdline` 的 `ctx.appExit`，服务不出现。`webserver` / `web-runtime` 因 `inject: [webStartup]` 不会激活，进程不 bind。

Preset 挂载门控：`mountPreset` 拒绝无 scope 的 context；`leakedServices` 非空则抛错。[E: packages/preset/agent-preset-registry/src/mount.ts:86] 这就是 web 把 `jobs` / `skill` / `goal` / `subagent` / `token-meter` / `shell-env` / `ptc-runtime` 留在 host 的组合原因。

失败怎么响：

| 条件 | 响应 |
|---|---|
| `--host 0.0.0.0` | usage error，exit 1，不 provide `webStartup` |
| 非数字 `--port` | 同上 |
| `--help` | 打印 `dsh --profile web` 自己的 help，exit 0，不 bind |
| 未知 profile 名且无目录 | `loadProfile` 抛错，指向 `dsh plugin --profile <name> add` |
| frontend 包解析失败 | `web-runtime` 抛不可解析 |
| listen 失败 | `WebServer` 初始化 reject，boot fail-loud |
| preset 行泄漏服务 | `mountPreset` 整次 create 回滚 |

## 跨包关系

- `surface.cli.overview`（[../cli/overview.md](../cli/overview.md)）— launcher 四种 mode、`dsh <name>` 简写、`rejectElectronProfile`。`dsh web` 在那里只是通用简写的一个实例。
- `surface.presets.overview`（[../presets/overview.md](../presets/overview.md)）— roster 发现、`mountPreset`、四个 shipped preset。
- `surface.profiles.headless`（[headless.md](headless.md)）— 另一份 `PROFILE_TEMPLATES` 键：`dsh-base` + `dsh-headless`，**不** insert `agent-preset-registry`，也不含 `presets/*.patch.yml`。
- `spine.composition-boot`（[../../spine/composition-boot.md](../../spine/composition-boot.md)）— `profile → bundle → preset` 的端到端叠层。
- `surface.web.workbench`（[../web/workbench.md](../web/workbench.md)）— 浏览器壳、槽位与 chrome；本页只覆盖进程组合与 bind。
- `spine.trace-web-first-prompt`（[../../spine/trace-web-first-prompt.md](../../spine/trace-web-first-prompt.md)）— 从 `dsh web` 到第一轮提问的控制流。

## Sources

- `packages/bundle/web-app/cordis.patch.yml`
- `packages/bundle/web-app/src/startup.ts`
- `packages/bundle/web-app/src/index.ts`
- `packages/bundle/web-app/package.json`
- `packages/bundle/web-app/presets/standard.patch.yml`
- `packages/bundle/web-app/presets/ptc.patch.yml`
- `packages/bundle/web-app/presets/minimal.patch.yml`
- `packages/bundle/web-app/presets/cordis.patch.yml`
- `packages/bundle/web-app/tests/startup.spec.ts`
- `packages/bundle/base/cordis.patch.yml`
- `packages/boot/app-boot/src/profile.ts`
- `packages/boot/app-boot/src/profile-context.ts`
- `packages/boot/app-boot/src/index.ts`
- `packages/boot/app-boot/tests/profile.spec.ts`
- `packages/host/webserver/src/index.ts`
- `packages/core/tools/src/index.ts`
- `packages/preset/agent-preset-registry/src/index.ts`
- `packages/preset/agent-preset-registry/src/mount.ts`
- `apps/cli/src/args.ts`
- `apps/cli/src/bin.ts`
- `apps/cli/src/dump-config.ts`
- `apps/cli/src/profile-boot.ts`
- `apps/cli/tests/args.spec.ts`

## 相关

- `surface.cli.overview`：[CLI 入口与旗标](../cli/overview.md)
- `surface.presets.overview`：[agent preset 总览](../presets/overview.md)
- `surface.profiles.headless`：[headless profile](headless.md)
- `spine.composition-boot`：[组合启动(profile→bundle→preset)](../../spine/composition-boot.md)
- `surface.web.workbench`：[Web 工作台可见面](../web/workbench.md)
- `spine.trace-web-first-prompt`：[trace: Web 第一次提问](../../spine/trace-web-first-prompt.md)
