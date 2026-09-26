---
id: surface.profiles.sdk
title: sdk profile
kind: surface
tier: T1
pkg: composition
source:
  - packages/boot/app-boot/src/profile.ts
  - packages/boot/app-boot/tests/profile.spec.ts
  - packages/bundle/sdk-app/cordis.patch.yml
  - packages/bundle/sdk-app/package.json
  - packages/bundle/sdk-app/src/index.ts
  - packages/bundle/sdk-app/tests/startup.spec.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/web-app/cordis.patch.yml
  - packages/sdk/server/src/index.ts
  - packages/boot/cmdline/src/index.ts
  - packages/boot/app-boot/src/profile-context.ts
  - packages/bundle/web-app/package.json
  - apps/cli/src/bin.ts
  - apps/cli/src/args.ts
  - apps/cli/src/dump-config.ts
  - apps/cli/src/profile-boot.ts
  - apps/cli/tests/args.spec.ts
  - apps/cli/tests/built-bin.e2e.ts
symbols:
  - SDK_APP_STARTUP_SERVICE
  - sdk-app-startup
related:
  - surface.cli.overview
  - surface.profiles.web
  - surface.profiles.headless
  - spine.composition-boot
  - surface.sdk.typescript
  - surface.presets.overview
  - subsys.composition.app-boot
evidence: explicit
status: verified
updated: 477b4f4205
---

> `sdk` 是 shipped **stdio JSON-RPC 宿主 profile**：`PROFILE_TEMPLATES.sdk` 把 `@deepseek-ai/dsh-base` 叠上 `@deepseek-ai/dsh-sdk-app`。overlay 插入 `sdk-app-startup`（解析零 extra-flag 的 commander、stdin EOF 触发 bounded exit）和 `sdk-jsonrpc-server`（stdout 专属 NDJSON），并在有 bundled runtime 时机会主义挂 `load_workspace_dependencies`。**不**挂 `agent-preset-registry`、**不**叠四份 shipped preset 文件、**不** bind HTTP。入口是 `dsh sdk` 或 `dsh --profile sdk`（通用 `dsh <name>` 简写）。协议客户端面见 [`surface.sdk.typescript`](../sdk/typescript.md)。

## 能回答的问题

- `PROFILE_TEMPLATES.sdk` 的两个 bundle 是什么？第一次启动如何写出 `$DSH_HOME/profiles/sdk/`？
- `dsh sdk` 与 `dsh --profile sdk` / `web` / `headless` / `sdk-minimal` / `acp` 差在哪一层？
- `dsh-sdk-app` patch 覆盖哪些 id、insert 哪两行？stdout 为什么不能当任务文本通道？
- 模型可见 `tool-*` 来自 host 面 `dsh-base` 还是某份 shipped preset？
- `--help` 会不会启动 JSON-RPC？stdin EOF 怎么退？

## 是什么

DSH 是 **Cordis 组合运行时**（`profile → bundle → agent preset`）。capability seam 仍是 Definition / Provider / Consumer。**profile** 是进程级目录 `$DSH_HOME/profiles/<name>`：`package.json` 的 `dsh.profile.bundles` 排 bundle 层。**bundle** 声明 `"dsh": { "bundle": { "patch": "./cordis.patch.yml" } }`（或 web-app 那种有序列表）。四个 shipped agent preset **只叠在 `dsh-web-app`**。[E: packages/bundle/web-app/package.json:43]

五个 shipped 模板键在 `PROFILE_TEMPLATES`：`acp` / `web` / `headless` / `sdk` / `sdk-minimal`。[E: packages/boot/app-boot/src/profile.ts:179] `sdk` 是 `bundles: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-sdk-app']`。[E: packages/boot/app-boot/src/profile.ts:189] `sdk-minimal` **只**叠 `@deepseek-ai/dsh-sdk-minimal`，不叠 `dsh-base`。[E: packages/boot/app-boot/src/profile.ts:193] 模板没有 `patchReload` 字段。[E: packages/boot/app-boot/src/profile.ts:43]

`@deepseek-ai/dsh-sdk-app` 的 manifest 把 patch 指到本包 `./cordis.patch.yml`。[E: packages/bundle/sdk-app/package.json:33]

相对其它入口：`dsh <name>` 是通用 `--profile` 简写，所以 `dsh sdk` 与 `dsh --profile sdk` 同一条 profile 模式。[E: apps/cli/src/args.ts:201] 本仓没有 shipped TUI；help 里的 `tui` 只是自定义名。[E: apps/cli/src/args.ts:96]

本 overlay **不挂 preset roster**。`packages/bundle/sdk-app/cordis.patch.yml` 的第一段 `insert` 是 `sdk-app-startup` 与 `sdk-jsonrpc-server`，没有 `id: agent-preset-registry`。[E: packages/bundle/sdk-app/cordis.patch.yml:13] [E: packages/bundle/sdk-app/cordis.patch.yml:18] 另有 `workspace-dependencies` / `skill-office` 两行，仅当 `DSH_PRIMARY_RUNTIME` 或 `DSH_BUNDLED_PRIMARY_RUNTIME` 有值时启用。[E: packages/bundle/sdk-app/cordis.patch.yml:30] overlay 把 `hmr` 写成 `disabled: true`。[E: packages/bundle/sdk-app/cordis.patch.yml:24] roster 只在 web-app 的 patch 列表里 insert，`default: standard`。[E: packages/bundle/web-app/cordis.patch.yml:559] 因此不要把 `minimal` / `standard` / `ptc` / `cordis` 说成 sdk 的默认装配。模型可见工具留在 **host 面**：`dsh-base` 已 insert 的 `tool-*` 行，sdk overlay **不** `disabled: true`。

patch 文件头写明：**Stdout belongs exclusively to JSON-RPC**。[E: packages/bundle/sdk-app/cordis.patch.yml:3] 这和 headless runner 把最后一条 assistant text 打到 stdout 相反。

## 入口

1. **Launcher**：`dsh sdk` 或 `dsh --profile sdk`。`parseDshArgs` 只吃 `--profile` / `--patch` / `--dump-*` / `-V`；第一个它不认识的 token 起全部交给 app。[E: apps/cli/src/args.ts:167] 裸 `dsh` 缺 `--profile` 报 required。[E: apps/cli/src/args.ts:178]
2. **Dispatch**：`apps/cli/src/bin.ts` 在 `mode: 'profile'` 动态 `import('./profile-boot.ts')`，调用 `runProfile({ profile, patchFiles, args, environment })`。[E: apps/cli/src/bin.ts:24] [E: apps/cli/src/bin.ts:26]
3. **Boot**：`runProfile` → `composeProfile` → `prepareProfile` → `loadProfile`。目录尚无 `package.json` 且名字命中 `PROFILE_TEMPLATES` 时，`initProfile(dir, template.bundles)` 写出 `$DSH_HOME/profiles/sdk/`。[E: packages/boot/app-boot/src/profile.ts:715] 未知名字第一次 **不会**自动 init。[E: packages/boot/app-boot/src/profile.ts:712]
4. **App 旗标**：inner args 经 `provideCmdline` 冻成 `ctx.cmdlineArgs`，并提供 `ctx.appExit`。[E: packages/boot/cmdline/src/index.ts:84] `sdk-app-startup` 用 commander 程序名 `dsh --profile ${profile}`（默认 `sdk`），零 extra option。[E: packages/bundle/sdk-app/src/index.ts:40]
5. **真树**：`dsh --profile sdk --dump-config` / `--dump-default-config` 走 `runDumpConfig`。[E: apps/cli/src/dump-config.ts:32]

进程外 TypeScript / Python 客户端默认 spawn 这份 profile；wire 形状不在本节点展开，见 [`surface.sdk.typescript`](../sdk/typescript.md)。

## 关键字段

### Launcher / app 旗标

| 实例 | 谁解析 | 含义 |
|---|---|---|
| `--profile sdk` 或简写 `dsh sdk` | launcher `parseDshArgs` | 选 `$DSH_HOME/profiles/sdk`。 |
| `-h` / `--help` | `sdk-app-startup` | 打 app help，**不** provide `sdkAppStartup`，JSON-RPC 行因 `inject: [sdkAppStartup]` 不挂，进程 `appExit(0)`。[E: packages/bundle/sdk-app/tests/startup.spec.ts:60] |
| `--patch <path>`（可重复） | launcher | 叠在 profile / home 用户层之后。 |
| `--dump-config` / `--dump-default-config` | launcher | 打印组合树后退出。 |

`--host` / `--port` / `--trusted-host` / `--no-open` 是 **web** app 旗标。headless 的 `[task...]` 是 headless-startup 的 positional；sdk commander **不**收 task。

### 模板

| 符号 | 值 | 作用 |
|---|---|---|
| `PROFILE_TEMPLATES.sdk` | `dsh-base` + `dsh-sdk-app` | 第一次 `loadProfile('sdk')` 自动 `initProfile`。[E: packages/boot/app-boot/src/profile.ts:189] [E: packages/boot/app-boot/src/profile.ts:715] |
| `INSTALLATION_OWNED_PROFILE_TUPLES` | 只有 `headless` 三元组 | **没有** sdk 条目；sdk 不会被改成含 `dsh-web-app` 的旧清单。[E: packages/boot/app-boot/src/profile.ts:198] |

### `@deepseek-ai/dsh-sdk-app` patch 每一行

`packages/bundle/sdk-app/cordis.patch.yml` 叠在 `dsh-base` 之后：

| id | 操作 | 字段 | 含义 |
|---|---|---|---|
| `system-prompt` | 覆盖 `config` | `personaPrefix` + `personaSuffix` | host 面 persona：`You are a coding agent powered by the {{model}} model.` / `Your working directory is {{cwd}}.` [E: packages/bundle/sdk-app/cordis.patch.yml:4] [E: packages/bundle/sdk-app/cordis.patch.yml:7] |
| `session-title-llm` | `disabled: true` | — | 关掉 LLM 会话标题，避免后台 completion 抢 stdout / 配额。[E: packages/bundle/sdk-app/cordis.patch.yml:9] [E: packages/bundle/sdk-app/cordis.patch.yml:10] |
| `sdk-app-startup` | insert | `name: '@deepseek-ai/dsh-sdk-app'`；`config.profile: sdk` | 解析 cmdline、provide `sdkAppStartup`。[E: packages/bundle/sdk-app/cordis.patch.yml:14] [E: packages/bundle/sdk-app/cordis.patch.yml:16] |
| `sdk-jsonrpc-server` | insert | `name: '@deepseek-ai/dsh-sdk-jsonrpc-server'`；`inject: [sdkAppStartup, loader]`；`maxTokensAsSuccess` 从 `DSH_MAX_TOKENS_AS_SUCCESS` | 等 startup + loader 再占 stdio。[E: packages/bundle/sdk-app/cordis.patch.yml:18] [E: packages/bundle/sdk-app/cordis.patch.yml:20] [E: packages/bundle/sdk-app/cordis.patch.yml:22] |
| `hmr` | `disabled: true` | — | overlay 关掉 base 的 watch 行。[E: packages/bundle/sdk-app/cordis.patch.yml:24] |
| `workspace-dependencies` | insert | `name: '@deepseek-ai/dsh-tool-workspace-dependencies'` | 无 `DSH_PRIMARY_RUNTIME` / `DSH_BUNDLED_PRIMARY_RUNTIME` 时 disabled。[E: packages/bundle/sdk-app/cordis.patch.yml:30] |

没有 `agent-preset-registry`、没有 `webserver` / `ui-*`。HMR 由 YAML 关掉，不是 launcher 的 `patchReload` watcher。

### 插件符号（本节点权威）

| 符号 | 文件 | 值 |
|---|---|---|
| `name` | `sdk-app/src/index.ts` | `'sdk-app-startup'` [E: packages/bundle/sdk-app/src/index.ts:14] |
| `inject` | 同文件 | `['cmdlineArgs']` [E: packages/bundle/sdk-app/src/index.ts:17] |
| `SDK_APP_STARTUP_SERVICE` | 同文件 | `'sdkAppStartup'` [E: packages/bundle/sdk-app/src/index.ts:20] |
| `Config.profile` | 同文件 | 默认 `'sdk'`；help 文案用这个名字 [E: packages/bundle/sdk-app/src/index.ts:30] |
| `apply` 成功路径 | 同文件 | `exitOnStdinEnd(ctx, 'sdk-app.stdin')` 然后 `provide(..., { accepted: true })` [E: packages/bundle/sdk-app/src/index.ts:58] [E: packages/bundle/sdk-app/src/index.ts:59] |

JSON-RPC 插件名 `sdk-jsonrpc-server`、`inject = ['agents']` 的权威在 server 包，不在本 profile 节点重复展开。[E: packages/sdk/server/src/index.ts:22] patch 额外要求 `sdkAppStartup` 与 `loader` 再挂，这样 `--help` 不会开 transport。[E: packages/bundle/sdk-app/cordis.patch.yml:20]

`sdk-minimal` 的 overlay 可把同一 `@deepseek-ai/dsh-sdk-app` 行的 `config.profile` 写成 `sdk-minimal`；startup 测试断言 help 渲染那个名字。[E: packages/bundle/sdk-app/tests/startup.spec.ts:67] 那是另一份 **不叠 base** 的 shipped 模板，不是本节点的默认树。

### Host 面工具（`dsh-base`，本 overlay 不 disable）

默认模型仍是 `provider: deepseek-official` / `model: deepseek-flash`。[E: packages/bundle/base/cordis.patch.yml:85] [E: packages/bundle/base/cordis.patch.yml:86] `tool-bash` / `tool-pwsh` 仍带平台 `disabled: !!js`。[E: packages/bundle/base/cordis.patch.yml:266] [E: packages/bundle/base/cordis.patch.yml:271] `tool-jobs`、`tool-fs` 等同层 insert 继续挂着。[E: packages/bundle/base/cordis.patch.yml:274] [E: packages/bundle/base/cordis.patch.yml:280] 完整 base 工具表与 web 的 disable 对照见 [`surface.profiles.headless`](headless.md) / [`surface.profiles.web`](web.md)。`dsh-experimental-tool-agent-team` 与 `tool-pwsh-persistent` **不**在 base insert 里。

## 装配与门控

**叠层**：`readProfilePatches`：bundle（先 `dsh-base` 再 `dsh-sdk-app`）→ `$DSH_HOME/profiles/sdk/cordis.patch.yml` → `$DSH_HOME/cordis.patch.yml` → `--patch`。[E: packages/boot/app-boot/src/profile-context.ts:65] `DSH_TELEMETRY_DISABLED` 非空且树里有 `session-telemetry-otel` 时再 disable 该行。[E: packages/boot/app-boot/src/profile-context.ts:53]

**cmdline 门控**：`apply` 调 `parseCmdline`。[E: packages/bundle/sdk-app/src/index.ts:61] 成功 action 才 provide 服务并绑 stdin EOF。[E: packages/bundle/sdk-app/src/index.ts:58] `--help`：stdout 含 `dsh --profile sdk`，服务未提供，exit `[0]`；之后 stdin.end **不再**追加 exit。[E: packages/bundle/sdk-app/tests/startup.spec.ts:57] [E: packages/bundle/sdk-app/tests/startup.spec.ts:60] [E: packages/bundle/sdk-app/tests/startup.spec.ts:63] 空 argv 则 `ctx.get(SDK_APP_STARTUP_SERVICE) === { accepted: true }`，stdin.end → exit `0`。[E: packages/bundle/sdk-app/tests/startup.spec.ts:51] [E: packages/bundle/sdk-app/tests/startup.spec.ts:53]

**HMR**：sdk overlay 把 `id: hmr` 写成 `disabled: true`。[E: packages/bundle/sdk-app/cordis.patch.yml:24] launcher **不再**按 `patchReload` 另装 watcher。用户层仍在 boot 时叠一次。

**isolate**：默认不 mount preset，没有 preset isolate / `leakedServices`。host 面上的 registry 与 `tool-*` 同树。JSON-RPC server 用 `ctx.agents` 在 root realm 建会话（细节在 [`surface.sdk.typescript`](../sdk/typescript.md) / sdk-server 子系统）。

## 跨包关系

- [`surface.cli.overview`](../cli/overview.md)：launcher 四种 mode 与 `dsh <name>` 简写。`dsh sdk` 与 `dsh web` / `dsh headless` 并列。
- [`surface.profiles.web`](web.md)：`dsh-base + dsh-web-app`；disable host `tool-*` 再 insert `agent-preset-registry` 并叠四份 preset。sdk 反向：工具留在 host，stdout 给 JSON-RPC。
- [`surface.profiles.headless`](headless.md)：同样叠 base、同样不挂 roster；headless 把 **一次 task** 打到 stdout 后退出，sdk 则常驻 stdio 直到客户端 EOF。
- [`spine.composition-boot`](../../spine/composition-boot.md)：`loadProfile` / `composeEntries` / `composeProfile`。
- [`surface.sdk.typescript`](../sdk/typescript.md)：进程外 `HarnessClient` / protocol / server 插件权威。
- [`surface.presets.overview`](../presets/overview.md)：shipped preset 目录存在 **不等于** sdk 默认会 mount。
- [`subsys.composition.app-boot`](../../subsystems/composition/app-boot.md)：`PROFILE_TEMPLATES` 发现与 `initProfile`。

## Sources

- packages/boot/app-boot/src/profile.ts
- packages/boot/app-boot/tests/profile.spec.ts
- packages/bundle/sdk-app/cordis.patch.yml
- packages/bundle/sdk-app/package.json
- packages/bundle/sdk-app/src/index.ts
- packages/bundle/sdk-app/tests/startup.spec.ts
- packages/bundle/base/cordis.patch.yml
- packages/bundle/web-app/cordis.patch.yml
- packages/sdk/server/src/index.ts
- packages/boot/cmdline/src/index.ts
- packages/bundle/web-app/package.json
- apps/cli/src/bin.ts
- apps/cli/src/args.ts
- apps/cli/src/dump-config.ts
- apps/cli/src/profile-boot.ts
- apps/cli/tests/args.spec.ts
- apps/cli/tests/built-bin.e2e.ts

## 相关

- [`surface.cli.overview`](../cli/overview.md)
- [`surface.profiles.web`](web.md)
- [`surface.profiles.headless`](headless.md)
- [`spine.composition-boot`](../../spine/composition-boot.md)
- [`surface.sdk.typescript`](../sdk/typescript.md)
- [`surface.presets.overview`](../presets/overview.md)
- [`subsys.composition.app-boot`](../../subsystems/composition/app-boot.md)
