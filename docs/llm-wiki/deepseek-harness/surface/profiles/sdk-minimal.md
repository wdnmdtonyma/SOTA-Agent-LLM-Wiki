---
id: surface.profiles.sdk-minimal
title: sdk-minimal profile
kind: surface
tier: T1
pkg: composition
source:
  - packages/boot/app-boot/src/profile.ts
  - packages/boot/app-boot/tests/profile.spec.ts
  - packages/bundle/sdk-minimal/cordis.patch.yml
  - packages/bundle/sdk-minimal/package.json
  - packages/bundle/sdk-minimal/src/index.ts
  - packages/bundle/sdk-minimal/tests/sdk-minimal.spec.ts
  - packages/bundle/sdk-app/src/index.ts
  - packages/bundle/sdk-app/package.json
  - apps/cli/src/args.ts
  - apps/cli/src/bin.ts
  - apps/cli/src/dump-config.ts
  - apps/cli/src/profile-boot.ts
  - apps/cli/tests/built-bin.e2e.ts
  - apps/cli/tests/profile-hmr.spec.ts
symbols:
  - PROFILE_TEMPLATES
  - name
related:
  - surface.cli.overview
  - surface.profiles.web
  - surface.profiles.headless
  - surface.profiles.sdk
  - surface.sdk.typescript
  - spine.composition-boot
  - surface.presets.overview
evidence: explicit
status: verified
updated: d347e70390
---

> `sdk-minimal` 是五个 shipped profile 里**唯一不叠 `@deepseek-ai/dsh-base`** 的模板：`PROFILE_TEMPLATES['sdk-minimal']` 的 `bundles` 只有 `@deepseek-ai/dsh-sdk-minimal`，`patchReload: 'startup'`。bundle 的 `cordis.patch.yml` 是**完整** Cordis 树（stdio JSON-RPC + 一份 DeepSeek adapter + persistent shell + editor + JSONL sessions），不是 overlay。入口是 `dsh --profile sdk-minimal`，没有 `dsh sdk-minimal` 子命令。

## 能回答的问题

- 为什么 `sdk-minimal` 不叠 `dsh-base`？dump 真树里会出现哪些 `id`、不会出现哪些？
- `dsh --profile sdk-minimal` 第一次启动会不会 `initProfile`？help 程序名怎么写？
- 模型看见的工具名是哪些？和 `sdk`（`dsh-base` + `dsh-sdk-app`）差在哪一层？
- `danger-full-access`、无 `agent-presets`、无 SQLite、无 `hmr` 行是不是代码事实？
- `DSH_SYSTEM_PROMPT` / `DEEPSEEK_API_KEY` / `DSH_CONTEXT_WINDOW` 在这棵树里落到哪一行？

## 是什么

DSH 是 **Cordis 组合运行时**（`profile → bundle → agent preset`）。**profile** 是 `$DSH_HOME/profiles/<name>`：`dsh.profile.bundles` 排 bundle 层，同目录 `cordis.patch.yml` 是用户层。**bundle** 是声明 `dsh.bundle.patch` 的 npm 包。**agent preset** 是每会话 `agent.cordis.yml`；本 profile **不** insert `agent-presets`。

五个 shipped 模板键在 `PROFILE_TEMPLATES`：`acp` / `web` / `headless` / `sdk` / `sdk-minimal`。[E: packages/boot/app-boot/src/profile.ts:137] `sdk-minimal` 是单 bundle：`['@deepseek-ai/dsh-sdk-minimal']` + `patchReload: 'startup'`。[E: packages/boot/app-boot/src/profile.ts:154] [E: packages/boot/app-boot/src/profile.ts:155] [E: packages/boot/app-boot/src/profile.ts:156] 测试钉死同一对象。[E: packages/boot/app-boot/tests/profile.spec.ts:203] [E: packages/boot/app-boot/tests/profile.spec.ts:204] [E: packages/boot/app-boot/tests/profile.spec.ts:205]

对照：`sdk` 叠 `dsh-base` + `dsh-sdk-app`。[E: packages/boot/app-boot/src/profile.ts:150] `web` 是唯一 `live`。[E: packages/boot/app-boot/src/profile.ts:144] `INSTALLATION_OWNED_PROFILE_TUPLES` **没有** `sdk-minimal` 条目，`normalizeShippedProfile` 不会改它的 bundle 列表。[E: packages/boot/app-boot/src/profile.ts:161]

`@deepseek-ai/dsh-sdk-minimal` 的 `dsh.bundle.patch` 是 `./cordis.patch.yml`。[E: packages/bundle/sdk-minimal/package.json:33] 包描述写明 standalone：JSON-RPC、一份 DeepSeek adapter、persistent shell、editor、JSONL sessions。[E: packages/bundle/sdk-minimal/package.json:3] TypeScript 入口 `src/index.ts` **没有**运行时接口，只 `export {}`。[E: packages/bundle/sdk-minimal/src/index.ts:9] 物质全在 patch 列表。

`dsh web` 是唯一硬编码 profile alias；sdk-minimal 必须 `--profile`。[E: apps/cli/src/args.ts:156] 本仓没有 shipped TUI；help 里的 `tui` 只是自定义名。[E: apps/cli/src/args.ts:68]

built-bin：`--dump-default-config` 打印的 `id`/`name` 表与 bundle 测试完全一致，stdout 含 `# == @deepseek-ai/dsh-sdk-minimal`，**不含** `@deepseek-ai/dsh-base` 与 `@deepseek-ai/dsh-web-app`。[E: apps/cli/tests/built-bin.e2e.ts:945] [E: apps/cli/tests/built-bin.e2e.ts:966] [E: apps/cli/tests/built-bin.e2e.ts:967] [E: apps/cli/tests/built-bin.e2e.ts:968]

## 入口

1. **Launcher**：`dsh --profile sdk-minimal`。`parseDshArgs` 只吃 `--profile` / `--patch` / dump / `-V`；第一个不认识的 token 起交给 app。[E: apps/cli/src/args.ts:131]
2. **Dispatch**：`bin.ts` 在 `mode: 'profile'` `import('./profile-boot.ts')` 并 `runProfile`。[E: apps/cli/src/bin.ts:27] [E: apps/cli/src/bin.ts:31]
3. **Boot**：目录尚无 `package.json` 且名字在 `PROFILE_TEMPLATES` 时 `initProfile(dir, template.bundles, template.patchReload)`。[E: packages/boot/app-boot/src/profile.ts:817] 未知名第一次 **不会**自动 init。[E: packages/boot/app-boot/src/profile.ts:814]
4. **App**：inner args 冻成 `ctx.cmdlineArgs`。stdio 启动器来自 **复用的** `@deepseek-ai/dsh-sdk-app`（符号权威在 [`surface.profiles.sdk`](sdk.md) / `packages/bundle/sdk-app/src/index.ts`）：`Config.profile` 默认 `'sdk'`。[E: packages/bundle/sdk-app/src/index.ts:30] 本树把该行写成 `config.profile: sdk-minimal`，help 名变成 `` `dsh --profile ${profile}` ``。[E: packages/bundle/sdk-minimal/cordis.patch.yml:9] [E: packages/bundle/sdk-app/src/index.ts:40] 成功 parse 后 `provide('sdkAppStartup', { accepted: true })` 并 `exitOnStdinEnd`。[E: packages/bundle/sdk-app/src/index.ts:59]
5. **真树**：`dsh --profile sdk-minimal --dump-default-config` 走 `runDumpConfig`；`defaultOnly` 时 `prepareProfile(profile, false)`，不叠用户层。[E: apps/cli/src/dump-config.ts:30] [E: apps/cli/src/dump-config.ts:31]

## 关键字段

### 模板

| 符号 | 值 |
|---|---|
| `PROFILE_TEMPLATES['sdk-minimal']` | `bundles: ['@deepseek-ai/dsh-sdk-minimal']`，`patchReload: 'startup'` [E: packages/boot/app-boot/src/profile.ts:154] |
| `PROFILE_TEMPLATES.sdk`（对照） | `dsh-base` + `dsh-sdk-app`，`startup` [E: packages/boot/app-boot/src/profile.ts:150] |
| `@deepseek-ai/dsh-sdk-app` `dsh.bundle.patch` | 另一份 overlay，叠在 base 上 [E: packages/bundle/sdk-app/package.json:33] |

`sdk-app-startup` 的 Cordis 插件 `name` 是 `'sdk-app-startup'`；`SDK_APP_STARTUP_SERVICE` 字面量 `'sdkAppStartup'`。本页不占有这些符号，只消费 Config `profile`。[E: packages/bundle/sdk-app/src/index.ts:14] [E: packages/bundle/sdk-app/src/index.ts:20]

### 完整 insert 树（每一行）

`packages/bundle/sdk-minimal/cordis.patch.yml` 顶部注释：unlike ordinary SDK，本 bundle **不** layer over `dsh-base`；这一份 insert 就是完整树；用户 profile / home / `--patch` 仍叠在上面。[E: packages/bundle/sdk-minimal/cordis.patch.yml:2] 测试要求 `patches` 长度 1，且 `id`/`name` 序如下。[E: packages/bundle/sdk-minimal/tests/sdk-minimal.spec.ts:22] [E: packages/bundle/sdk-minimal/tests/sdk-minimal.spec.ts:24] `package.json` `dependencies` 的集合等于这些行的 `name`。[E: packages/bundle/sdk-minimal/tests/sdk-minimal.spec.ts:86]

| id | name | 要点 |
|---|---|---|
| `sdk-app-startup` | `@deepseek-ai/dsh-sdk-app` | `config.profile: sdk-minimal` [E: packages/bundle/sdk-minimal/cordis.patch.yml:9] |
| `sdk-jsonrpc-server` | `@deepseek-ai/dsh-sdk-jsonrpc-server` | `inject: [sdkAppStartup, loader]`；`maxTokensAsSuccess: false` [E: packages/bundle/sdk-minimal/cordis.patch.yml:13] [E: packages/bundle/sdk-minimal/cordis.patch.yml:15] |
| `deepseek-llm-api-extensions` | `@deepseek-ai/dsh-deepseek-llm-api-extensions` | DeepSeek API 方言扩展 |
| `session-log-deepseek` | `@deepseek-ai/dsh-session-log-deepseek` | DeepSeek 会话日志投影，不是第二份日志 |
| `plugin-package-inventory-deepseek` | `@deepseek-ai/dsh-plugin-package-inventory-deepseek` | 插件清单 |
| `llm-deepseek` | `@deepseek-ai/dsh-llm-deepseek` | `apiKeyEnv: DEEPSEEK_API_KEY`；`defaultContextWindow: !!js Number(process.env.DSH_CONTEXT_WINDOW ?? 1000000)`；`streamIdleTimeoutMs: 172800000` [E: packages/bundle/sdk-minimal/cordis.patch.yml:29] [E: packages/bundle/sdk-minimal/cordis.patch.yml:30] |
| `sandbox` | `@deepseek-ai/dsh-sandbox-local` | 本地 sandbox provider |
| `session-projection` | `@deepseek-ai/dsh-session-projection` | sandbox-policy / terminal-bash 的硬注入 |
| `sandbox-policy` | `@deepseek-ai/dsh-sandbox-policy` | `mode: danger-full-access`；`workspaceRoot: !!js process.cwd()` [E: packages/bundle/sdk-minimal/cordis.patch.yml:44] [E: packages/bundle/sdk-minimal/cordis.patch.yml:45] |
| `subprocess` | `@deepseek-ai/dsh-subprocess-local` | |
| `pty` | `@deepseek-ai/dsh-terminal` | |
| `terminal-bash` | `@deepseek-ai/dsh-terminal-bash` | `disabled` 当 `win32`；`timeoutMs: 300000` [E: packages/bundle/sdk-minimal/cordis.patch.yml:55] |
| `terminal-pwsh` | `@deepseek-ai/dsh-terminal-bash` | `disabled` 当非 `win32`；`shellDialect: pwsh` [E: packages/bundle/sdk-minimal/cordis.patch.yml:61] [E: packages/bundle/sdk-minimal/cordis.patch.yml:63] |
| `fs-local` | `@deepseek-ai/dsh-fs-local` | `cwd: !!js process.cwd()` [E: packages/bundle/sdk-minimal/cordis.patch.yml:71] |
| `timer` / `llm` / `session` / `system-prompt` / `tools` / `agent` / `agent-loop` | kernel 行 | 本树自己 insert Definition；`system-prompt` 关 identity / runtime context [E: packages/bundle/sdk-minimal/cordis.patch.yml:91] |
| `persistent-bash` | `@deepseek-ai/dsh-tool-bash-persistent` | `disabled` 当 `win32`；`timeoutMs: 300000` [E: packages/bundle/sdk-minimal/cordis.patch.yml:130] |
| `persistent-pwsh` | `@deepseek-ai/dsh-tool-pwsh-persistent` | `disabled` 当非 `win32` [E: packages/bundle/sdk-minimal/cordis.patch.yml:145] |
| `str-replace-editor` | `@deepseek-ai/dsh-tool-str-replace-editor` | `maxOutputChars: 16000` [E: packages/bundle/sdk-minimal/cordis.patch.yml:162] |
| `sessions` | `@deepseek-ai/dsh-session-persistence-jsonl` | `root: !!js dshHomePath('sessions')`；`compression: none` [E: packages/bundle/sdk-minimal/cordis.patch.yml:167] [E: packages/bundle/sdk-minimal/cordis.patch.yml:168] |

没有 `id: hmr`。`composeEntries` 只叠 sdk-minimal 时找不到 `hmr`。[E: apps/cli/tests/profile-hmr.spec.ts:44]

### `system-prompt` Config

| 键 | 值 | 源 |
|---|---|---|
| `includeHarnessIdentity` | `false` | [E: packages/bundle/sdk-minimal/cordis.patch.yml:94] |
| `includeRuntimeContext` | `false` | [E: packages/bundle/sdk-minimal/cordis.patch.yml:95] |
| `persona` | `!!js process.env.DSH_SYSTEM_PROMPT ?? 'You are a helpful software engineer assistant.'` | [E: packages/bundle/sdk-minimal/cordis.patch.yml:96] |

这棵树 **没有** `plan-mode` / `run_code` / `agent-presets` / SQLite query / one-shot `dsh-tool-bash`。默认模型 **不**来自 `dsh-base` 的 `agent-default-model` 行（那一行不在本树）。LLM 路由来自本树的 `llm-deepseek`。`dsh-agent-spine-demo` 已删除。

### 模型可见工具名（host 面直挂）

权威实现在对应 `surface.tools.*` 节点；本页只列本树实际 insert 的 wire 名：

| composition `id` | 包 | 模型看见的 `name` |
|---|---|---|
| `persistent-bash` | `@deepseek-ai/dsh-tool-bash-persistent` | `bash`（非 win32） |
| `persistent-pwsh` | `@deepseek-ai/dsh-tool-pwsh-persistent` | `pwsh`（win32） |
| `str-replace-editor` | `@deepseek-ai/dsh-tool-str-replace-editor` | `str_replace_editor` |

`dsh-experimental-tool-agent-team` **不**在这棵 insert 里。

## 装配与门控

**叠层**：`allPatches` 按 bundle（只有 sdk-minimal）→ profile `$DSH_HOME/profiles/sdk-minimal/cordis.patch.yml` → home `$DSH_HOME/cordis.patch.yml` → `--patch` overlays。[E: apps/cli/src/profile-boot.ts:138] [E: apps/cli/src/profile-boot.ts:139] [E: apps/cli/src/profile-boot.ts:140] [E: apps/cli/src/profile-boot.ts:141] `DSH_TELEMETRY_DISABLED` 仅当树里已有 `session-telemetry-otel` 才再 disable；本树默认 **没有** 该行，开关无目标。[E: apps/cli/src/profile-boot.ts:170]

**HMR**：模板 `startup`。`runProfile` **只在** `patchReload === 'live'` 时装 watcher。[E: apps/cli/src/profile-boot.ts:271] 用户层仍在 boot 时叠一次。本 bundle 自己也不 insert `hmr`。

**stdio 门控**：JSON-RPC 行 `inject: [sdkAppStartup, loader]`，help 路径不 provide 服务，transport 不占 stdio。无 `--host` / `--port` / `[task...]`。

**权限**：`sandbox-policy.mode` 钉死 `danger-full-access`；树里没有 approval / permission-settings 服务行。[E: packages/bundle/sdk-minimal/cordis.patch.yml:44]

**isolate / preset**：没有 `agent-presets`，也就没有 shipped `minimal` / `standard` / `ptc` / `cordis` roster。工具与 kernel 同在 host 面。

## 跨包关系

- [`surface.cli.overview`](../cli/overview.md)：launcher 三种 mode。sdk-minimal 零 extra-flag 的 stdio 面在 app 侧。`dsh --profile sdk|sdk-minimal|acp|headless` 与 `dsh web` 并列。
- [`surface.profiles.sdk`](sdk.md)：`PROFILE_TEMPLATES.sdk` = `dsh-base` + `dsh-sdk-app`。同一份 `sdk-app-startup` 插件，Config `profile` 默认 `'sdk'`。sdk-minimal 只改那一行并换完整树。
- [`surface.profiles.web`](web.md) / [`surface.profiles.headless`](headless.md)：都叠 `dsh-base`。web 再 disable host `tool-*` 并 insert roster；headless 把 base 工具留在 host。
- [`surface.sdk.typescript`](../sdk/typescript.md)：client 协议与类型；本页是进程组合树。
- [`spine.composition-boot`](../../spine/composition-boot.md)：`loadProfile` / `composeEntries`；五个模板名与「谁不叠 base」。
- [`surface.presets.overview`](../presets/overview.md)：四个 shipped preset 目录存在 **不等于** 本 profile 会 mount 它们。

## Sources

- packages/boot/app-boot/src/profile.ts
- packages/boot/app-boot/tests/profile.spec.ts
- packages/bundle/sdk-minimal/cordis.patch.yml
- packages/bundle/sdk-minimal/package.json
- packages/bundle/sdk-minimal/src/index.ts
- packages/bundle/sdk-minimal/tests/sdk-minimal.spec.ts
- packages/bundle/sdk-app/src/index.ts
- packages/bundle/sdk-app/package.json
- apps/cli/src/args.ts
- apps/cli/src/bin.ts
- apps/cli/src/dump-config.ts
- apps/cli/src/profile-boot.ts
- apps/cli/tests/built-bin.e2e.ts
- apps/cli/tests/profile-hmr.spec.ts

## 相关

- [`surface.cli.overview`](../cli/overview.md)
- [`surface.profiles.web`](web.md)
- [`surface.profiles.headless`](headless.md)
- [`surface.profiles.sdk`](sdk.md)
- [`surface.sdk.typescript`](../sdk/typescript.md)
- [`spine.composition-boot`](../../spine/composition-boot.md)
- [`surface.presets.overview`](../presets/overview.md)
