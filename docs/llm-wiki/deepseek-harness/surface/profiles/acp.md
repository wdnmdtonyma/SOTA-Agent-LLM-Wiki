---
id: surface.profiles.acp
title: acp profile
kind: surface
tier: T1
pkg: composition
source:
  - packages/boot/app-boot/src/profile.ts
  - packages/boot/app-boot/tests/profile.spec.ts
  - packages/bundle/acp-app/cordis.patch.yml
  - packages/bundle/acp-app/package.json
  - packages/bundle/acp-app/src/index.ts
  - packages/bundle/acp-app/tests/acp-app.spec.ts
  - packages/bundle/acp-app/tests/startup.spec.ts
  - packages/boot/cmdline/src/index.ts
  - apps/cli/src/args.ts
  - apps/cli/src/bin.ts
  - apps/cli/src/dump-config.ts
  - apps/cli/src/profile-boot.ts
  - apps/cli/tests/built-bin.e2e.ts
symbols:
  - ACP_APP_STARTUP_SERVICE
  - acp-app-startup
related:
  - surface.cli.overview
  - surface.profiles.web
  - surface.profiles.headless
  - surface.acp.server
  - spine.composition-boot
  - surface.presets.overview
evidence: explicit
status: verified
updated: d347e70390
---

> `acp` 是 shipped **stdio 宿主 profile**：`PROFILE_TEMPLATES.acp` 把 `@deepseek-ai/dsh-base` 叠上 `@deepseek-ai/dsh-acp-app`，`patchReload: 'startup'`。overlay 只改 host 面 persona、关掉 `session-title-llm`，再 insert 零 extra-flag 的 `acp-app-startup` 与 `inject: [acpAppStartup]` 的 `dsh-acp` 桥。stdout 归 ACP JSON-RPC；`--help` 不 provide 服务、不占 stdio。没有 `dsh acp` 子命令 alias，没有 `agent-presets` roster。

## 能回答的问题

- `dsh --profile acp` 第一次启动会不会自动 `initProfile`？bundles 是哪两个包？
- 为什么 `dsh --profile acp --help` 不占 stdin / stdout、也不启动 ACP 桥？
- overlay 改了哪些 id？`session-title-llm` 为什么 disable？默认模型写在哪一行？
- 相对 `web` / `headless` / `sdk` / `sdk-minimal`：有没有 HTTP、preset roster、live HMR？
- stdin EOF 时进程怎么退？`ACP_APP_STARTUP_SERVICE` 的字面量是什么？

## 是什么

DSH 是 **Cordis 组合运行时**（`profile → bundle → agent preset`）。**profile** 是 `$DSH_HOME/profiles/<name>`：`dsh.profile.bundles` 定 bundle 顺序，`dsh.profile.patchReload` 定用户 patch 是 boot 一次还是 live watch。五个 shipped 模板键在 `PROFILE_TEMPLATES`：`acp` / `web` / `headless` / `sdk` / `sdk-minimal`。[E: packages/boot/app-boot/src/profile.ts:137] `acp` 是：

```ts
acp: {
  bundles: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-acp-app'],
  patchReload: 'startup',
}
```

[E: packages/boot/app-boot/src/profile.ts:138] [E: packages/boot/app-boot/src/profile.ts:139] [E: packages/boot/app-boot/src/profile.ts:140] 测试按对象相等锁死这张表。[E: packages/boot/app-boot/tests/profile.spec.ts:195]

`@deepseek-ai/dsh-acp-app` 的 manifest 把 bundle patch 指到本包 `./cordis.patch.yml`。[E: packages/bundle/acp-app/package.json:2] [E: packages/bundle/acp-app/package.json:33] 描述是 automation-only JSON-RPC stdio + 进程生命周期，叠在 `dsh-base` 上。[E: packages/bundle/acp-app/package.json:3]

本 overlay **不** insert `agent-presets`，**不** disable base 的 `tool-*`。模型可见工具留在 **host 面**（与 headless 同类）；协议桥 `agents.create` 的权威走读在 [`surface.acp.server`](../acp/server.md)，本页不复述 ACP 方法表。`sdk-minimal` 是唯一不叠 `dsh-base` 的 shipped bundle；`acp` 叠 base。

## 入口

| 入口 | 行为 |
|---|---|
| `dsh --profile acp` | launcher `parseDshArgs` → `resolveBoot` 得到 `mode: 'profile'` 与传入的 profile 名。[E: apps/cli/src/args.ts:87] [E: apps/cli/src/args.ts:112] `dsh web` 是唯一硬编码 profile 子命令；acp 没有 `dsh acp`。[E: apps/cli/src/args.ts:156] |
| `dsh --profile acp --help` / `-h` | inner args 交给 app commander；stdout 含 `Usage: dsh --profile acp`，exit 0。[E: apps/cli/tests/built-bin.e2e.ts:390] 不 provide `acpAppStartup`。[E: packages/bundle/acp-app/tests/startup.spec.ts:60] |
| `dsh --profile acp --dump-config` / `--dump-default-config` | dump 树后退出，不跑 startup。[E: apps/cli/src/dump-config.ts:30] |
| `$DSH_HOME/profiles/acp/cordis.patch.yml`、`$DSH_HOME/cordis.patch.yml`、`--patch` | 用户层，叠在两个 bundle 之后。 |

`bin.ts` 在 `mode: 'profile'` 动态 `import('./profile-boot.ts')` 并 `runProfile`。[E: apps/cli/src/bin.ts:27] [E: apps/cli/src/bin.ts:29] 目录尚无 `package.json` 且名字命中模板时，`initProfile(dir, template.bundles, template.patchReload)` 写出 `$DSH_HOME/profiles/acp/`。[E: packages/boot/app-boot/src/profile.ts:817] 未知名字第一次 **不会** 自动 init。[E: packages/boot/app-boot/src/profile.ts:814]

`provideCmdline` 冻 `ctx.cmdlineArgs` 与 `ctx.appExit`。[E: apps/cli/src/profile-boot.ts:258] `acp-app-startup` 的 commander 程序名是 `dsh --profile acp`，零 extra-flag。[E: packages/bundle/acp-app/src/index.ts:27]

## 关键字段

### 插件符号（本 bundle 权威）

| 符号 | 值 | 源 |
|---|---|---|
| `name` | `'acp-app-startup'` | [E: packages/bundle/acp-app/src/index.ts:13] |
| `inject` | `['cmdlineArgs']` | [E: packages/bundle/acp-app/src/index.ts:16] |
| `ACP_APP_STARTUP_SERVICE` | `'acpAppStartup'` | [E: packages/bundle/acp-app/src/index.ts:19] |
| provide 值 | `{ accepted: true }` | [E: packages/bundle/acp-app/src/index.ts:45] |

`apply` 成功 parse 后先 `exitOnStdinEnd(ctx, 'acp-app.stdin')`，再 provide 服务。[E: packages/bundle/acp-app/src/index.ts:44] [E: packages/bundle/acp-app/src/index.ts:45] 然后 `parseCmdline`。[E: packages/bundle/acp-app/src/index.ts:47] `--help` 不跑 action：服务 `undefined`，stdin `end` 也不再追加 exit。[E: packages/bundle/acp-app/tests/startup.spec.ts:60] [E: packages/bundle/acp-app/tests/startup.spec.ts:63] 无参启动：EOF 请求 `exit(0)`。[E: packages/bundle/acp-app/tests/startup.spec.ts:51] [E: packages/bundle/acp-app/tests/startup.spec.ts:53] `exitOnStdinEnd` 要求 launcher 已 provide `appExit` 与 `appReady`。[E: packages/boot/cmdline/src/index.ts:123] [E: packages/boot/cmdline/src/index.ts:129]

ACP 桥插件本身的 `name` / `inject` / `Config` 权威在 [`surface.acp.server`](../acp/server.md)，本页不占用那些符号。

### Overlay 每一行

`packages/bundle/acp-app/cordis.patch.yml` 叠在 `dsh-base` 之后。测试断言 **不** 改写 `hmr`（继承 base 的 disable + `patchReload: startup`）。[E: packages/bundle/acp-app/tests/acp-app.spec.ts:27]

| id | 操作 | 含义 |
|---|---|---|
| `system-prompt` | 覆盖 `config.persona` | `You are a coding agent powered by the {{model}} model. Your working directory is {{cwd}}.` [E: packages/bundle/acp-app/cordis.patch.yml:3] [E: packages/bundle/acp-app/cordis.patch.yml:6] |
| `session-title-llm` | `disabled: true` | 标题生成会另开 LLM 调用并污染 stdout；ACP 占用 stdout。[E: packages/bundle/acp-app/cordis.patch.yml:8] [E: packages/bundle/acp-app/tests/acp-app.spec.ts:28] |
| `acp-app-startup` | insert `name: '@deepseek-ai/dsh-acp-app'` | 零 extra-flag commander + startup latch。[E: packages/bundle/acp-app/cordis.patch.yml:12] [E: packages/bundle/acp-app/cordis.patch.yml:13] |
| `acp` | insert `name: '@deepseek-ai/dsh-acp'`，`inject: [acpAppStartup]` | 等 latch 后再占 stdio；`config.provider: deepseek-official`，`config.model: deepseek-v4-flash`。[E: packages/bundle/acp-app/cordis.patch.yml:15] [E: packages/bundle/acp-app/cordis.patch.yml:17] [E: packages/bundle/acp-app/cordis.patch.yml:19] [E: packages/bundle/acp-app/cordis.patch.yml:20] |

没有 `webserver` / `dsh-client-*` / `agent-presets` 行。默认模型与 base 的 `agent-default-model` 一致，但 **ACP 会话创建**读的是这条 `acp` 行上的 `provider` / `model`（细节见 ACP server 节点）。

## 装配与门控

叠层（CLI 文件内 `composeProfile`）：bundle（先 `dsh-base` 再 `dsh-acp-app`）→ profile `cordis.patch.yml` → home → `--patch`。[E: apps/cli/src/profile-boot.ts:166] `DSH_TELEMETRY_DISABLED` 非空且树里有 `session-telemetry-otel` 时再 disable 该行。[E: apps/cli/src/profile-boot.ts:170]

`runProfile` **只在** `composed.profile.patchReload === 'live'` 时装用户层 watcher。[E: apps/cli/src/profile-boot.ts:271] 模板是 `startup`，默认 **不** 装 live HMR。用户手改 manifest 写成 `live` 才会走 watcher。

**help 不挂桥**：`acp` 行 `inject: [acpAppStartup]`；help 不 provide 服务，桥不激活，stdout 只打 usage。

**isolate / preset**：默认不 mount preset，没有 `leakedServices` 检查。host 面上的 `tool-*` / registry 与桥同树。五个 shipped profile 里只有 web overlay insert `agent-presets`。

失败怎么响：未知 profile 名且无目录 → `loadProfile` 指向 `dsh plugin --profile <name> add`；`--help` → exit 0、无服务；缺 `appExit`/`appReady` 时 `exitOnStdinEnd` 同步抛错。

## 跨包关系

- [`surface.cli.overview`](../cli/overview.md)：launcher 三种 mode；`dsh --profile acp` 与 `dsh web` / `--profile headless|sdk|sdk-minimal` 并列。acp 无 extra app 旗标。
- [`surface.profiles.web`](web.md)：唯一 `live` + 唯一硬编码 alias；disable base `tool-*` 再 insert roster。acp 反向：工具留 host，`startup` 冻结 patch。
- [`surface.profiles.headless`](headless.md)：同样 `dsh-base` + overlay、`startup`、无 roster。headless 是 one-shot task + stdout 文本；acp 是长驻 stdio JSON-RPC。
- [`surface.acp.server`](../acp/server.md)：`@deepseek-ai/dsh-acp` 方法表、session/new、stdio codec。本页只覆盖 profile 模板与 overlay latch。
- [`spine.composition-boot`](../../spine/composition-boot.md)：`loadProfile` / `composeEntries` / `!!js`。
- [`surface.presets.overview`](../presets/overview.md)：四个 shipped preset 目录存在 **不等于** acp 默认会 mount。

## Sources

- packages/boot/app-boot/src/profile.ts
- packages/boot/app-boot/tests/profile.spec.ts
- packages/bundle/acp-app/cordis.patch.yml
- packages/bundle/acp-app/package.json
- packages/bundle/acp-app/src/index.ts
- packages/bundle/acp-app/tests/acp-app.spec.ts
- packages/bundle/acp-app/tests/startup.spec.ts
- packages/boot/cmdline/src/index.ts
- apps/cli/src/args.ts
- apps/cli/src/bin.ts
- apps/cli/src/dump-config.ts
- apps/cli/src/profile-boot.ts
- apps/cli/tests/built-bin.e2e.ts

## 相关

- [`surface.cli.overview`](../cli/overview.md)
- [`surface.profiles.web`](web.md)
- [`surface.profiles.headless`](headless.md)
- [`surface.acp.server`](../acp/server.md)
- [`spine.composition-boot`](../../spine/composition-boot.md)
- [`surface.presets.overview`](../presets/overview.md)
