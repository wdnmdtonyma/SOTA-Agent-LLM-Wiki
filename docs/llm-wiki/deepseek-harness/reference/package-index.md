---
id: ref.package-index
title: monorepo 包索引
kind: reference
tier: T3
pkg: cross
source:
  - package.json
  - pnpm-workspace.yaml
  - apps/cli/package.json
  - apps/web/package.json
  - packages/boot/app-boot/src/profile.ts
  - packages/bundle/base/package.json
  - packages/bundle/web-app/package.json
  - packages/bundle/headless/package.json
  - packages/bundle/sdk-app/package.json
  - packages/bundle/sdk-minimal/package.json
  - packages/bundle/acp-app/package.json
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/headless/cordis.patch.yml
  - packages/bundle/sdk-app/cordis.patch.yml
  - packages/bundle/sdk-minimal/cordis.patch.yml
  - packages/bundle/acp-app/cordis.patch.yml
  - packages/bundle/web-app/presets/minimal.patch.yml
  - packages/bundle/web-app/presets/standard.patch.yml
  - packages/bundle/web-app/presets/ptc.patch.yml
  - packages/bundle/web-app/presets/cordis.patch.yml
  - vendor/cordis/package.json
  - vendor/timer/package.json
  - python/sdk-runtime/package.json
  - website/package.json
  - native/system/package.json
  - native/system/packages/entry/package.json
  - apps/desktop/package.json
  - apps/desktop-host/package.json
symbols:
  - packages/*/*
  - vendor/*
  - '@deepseek-ai/dsh-root'
  - workspaces
  - PROFILE_TEMPLATES
  - OPTIONAL_BUNDLES
related:
  - spine.overview
  - ref.glossary
  - spine.composition-boot
  - ref.presets
  - surface.presets.code
  - subsys.core.code-mode
  - subsys.host.apiproxy
  - subsys.client.runtime
evidence: explicit
status: verified
updated: 477b4f4205
---

> monorepo 包索引把每个 workspace 包钉成一行：npm name、目录、seam 角色（Definition / Provider / Consumer / bundle / app / library）、以及它是否出现在 shipped composition。DSH 是 **Cordis 组合运行时**，主线 `profile → bundle → agent preset`；有 `package.json` 不等于进了产品树。已删除包 `packages/e2b/**`、`packages/code-runtime/**`、`packages/preset/agent-presets`、`packages/fs/tool-present`、`packages/experimental/code-runtime-python`、`packages/workflow/workflow-worker-thread`、`packages/settings/settings-file`、`packages/host/apiproxy`、`packages/client/runtime` 不再成行。`packages/**/package.json` 共 **321**（7 个 typert `@fixture/*` + 2 个 skill template）；产品叶 `packages/*/*` **312**。产品版本 `0.1.7-rc.2`。Node `^22.19.0 || >=24.0.0`、pnpm `11.7.0`。

## 能回答的问题

- `packages/*/*` 冻结树里有哪些包？某个 `@deepseek-ai/dsh-*` 落在哪个目录？
- 这个包是 Definition、Provider、Consumer，还是 bundle / app / library？
- 它出现在六个 bundle patch（`dsh-base` / `dsh-web-app` / `dsh-headless` / `dsh-sdk-app` / `dsh-sdk-minimal` / `dsh-acp-app`）还是四个 shipped web preset，还是仓库里有、yml 都没点名？
- `apps/cli`、`vendor/*`、`python/sdk-runtime`、`native/system`、`apps/desktop` 分别是不是 build target？
- web 默认装哪一层？headless / sdk / acp 会不会挂 `agent-preset-registry`？`sdk-minimal` 叠不叠 `dsh-base`？本仓有没有 shipped TUI 包？
- `ctx.ptcRuntime` / `packages/ssh/*` 对应哪些包？E2B 还在不在？

## 范围与 ground truth

本页是 T3 **reference**：实例 = 冻结树里每一个 `packages/<group>/<pkg>/package.json`（不含 typert generator 的 `@fixture/*` 与 skill template），外加 workspace 里但不在该 glob 下的入口。分组是为了按 group 读，不是为了丢包。

**shipped 位置只认** 六份 bundle patch 与四份 web preset patch 里的插件 `name:`（子路径导出先收成 npm name：`@scope/pkg/export` → `@scope/pkg`）：

- `packages/bundle/{base,web-app,headless,sdk-app,sdk-minimal,acp-app}/cordis.patch.yml`
- `packages/bundle/web-app/presets/{minimal,standard,ptc,cordis}.patch.yml`

不认「目录里有 package.json」、不认 bundle `dependencies`、不认 README 表格。根 workspace 把 `packages/*/*` 与 `native/system` / `native/system/packages/*` 收进 pnpm；那只说明能被解析，不说明进了 `dsh web` / `dsh --profile headless|sdk|sdk-minimal|acp`。[E: package.json:13][E: package.json:14][E: pnpm-workspace.yaml:3][E: pnpm-workspace.yaml:6]

五个 shipped profile 名在 `PROFILE_TEMPLATES`：`acp` / `web` / `headless` / `sdk` / `sdk-minimal`。[E: packages/boot/app-boot/src/profile.ts:179] `desktop` 不是该表成员。`OPTIONAL_BUNDLES`：`dsh-experimental-agent-team-profile` / `dsh-experimental-voice-input-bundle` / `dsh-experimental-auto-review`。[E: packages/boot/app-boot/src/profile.ts:213]

四个 shipped preset 声明只叠在 `dsh-web-app`：`dsh.bundle.patch` 是 `cordis.patch.yml` + 四份 `presets/*.patch.yml`。没有 `presets/code/`；旧 code 预设就是 PTC。wiki id `surface.presets.code` 与 `subsys.core.code-mode` 是稳定别名。[E: packages/bundle/web-app/package.json:43][E: packages/bundle/web-app/cordis.patch.yml:559]

`@deepseek-ai/dsh-base` 是 **base-backed** profile 的第一层 patch：`dsh.bundle.patch` 指向那份 yml。[E: packages/bundle/base/package.json:2]

`sdk-minimal` **不**叠 base：模板 `bundles` 只有 `@deepseek-ai/dsh-sdk-minimal`，其 patch 是完整 `insert`。[E: packages/boot/app-boot/src/profile.ts:192][E: packages/bundle/sdk-minimal/package.json:2][E: packages/bundle/sdk-minimal/package.json:33]

web-app / headless / sdk-app / acp-app **叠在 base 上**。web-app insert `agent-preset-registry`（`default: standard`），再叠四份 preset 声明。headless **不** insert roster。[E: packages/bundle/web-app/cordis.patch.yml:559][E: packages/bundle/web-app/cordis.patch.yml:562][E: packages/bundle/headless/cordis.patch.yml:21]

preset-only 的例子：`dsh-persona` 四个 shipped preset 都有；persistent bash+pwsh 在 `minimal`（也在 `sdk-minimal`）；`dsh-tool-present` 在 standard / ptc / cordis；`dsh-agent-tool-presentation` 只在 `ptc`；`dsh-tool-cordis` 只在 `cordis`。`dsh-fs-local` / `dsh-tool-str-replace-editor` 仓库有、出厂 yml **不挂**。`packages/ssh/*` 仓库有、**不**进 shipped yml（E2B 包已删除）。[E: packages/bundle/web-app/presets/minimal.patch.yml:11][E: packages/bundle/web-app/presets/ptc.patch.yml:144][E: packages/bundle/web-app/presets/cordis.patch.yml:141][E: packages/bundle/web-app/presets/standard.patch.yml:142]

角色列是 seam 三角加三类非三角包：

- **Definition** — 占 `ctx.<key>` 的合同 / 注册表词汇。
- **Provider** — 实现并 `provide` 的后端。
- **Consumer** — inject 之后登记 tool / command / UI / 策略门。
- **bundle** — `dsh.bundle.patch` 层。
- **app** — 可执行入口或 demo bin。
- **library** — 零 plugin 行的工具库、协议纯类型、testkit。

列约定：`shipped` = 十份 yml（六 bundle + 四 preset）的并集标签。`base` 的包会被叠在 base 上的 profile **继承**（除非后来的 patch 把那一行 disabled）。只出现在 `sdk-minimal` 的记 `sdk-minimal`。base 默认模型是 `provider: deepseek-official` / `model: deepseek-flash`；acp-app 仍硬编码 `deepseek-v4-flash`。[E: packages/bundle/base/cordis.patch.yml:85][E: packages/bundle/base/cordis.patch.yml:86][E: packages/bundle/acp-app/cordis.patch.yml:21]

`pnpm-workspace.yaml` 另含 `benchmarks` 与 `python/sdk-runtime`，根 `package.json` `workspaces` 不含这两项。[E: pnpm-workspace.yaml:11][E: pnpm-workspace.yaml:15][E: package.json:11]

官方 `packages/README.md` 只当查漏，**不当 [E]**。T0 组合叙事在 [spine.overview](../spine/overview.md) 与 [spine.composition-boot](../spine/composition-boot.md)；preset 成员对照在 [ref.presets](presets.md)。本页不把 help 例子里的 `tui` 写成 shipped profile。`dsh web` 不是唯一宿主入口：还有 `dsh --profile sdk|sdk-minimal|acp|headless`。

## 实例表

每个 `packages/*/*` 一行。`含义` 取该包 `package.json` `description` 的压缩句。产品叶 **312**，按 group 分表。

### core/（8）

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-agent` | `packages/core/agent` | Definition | base+sdk-minimal | Agent interface, registry, initiator scope, and event vocabulary for the DeepSeek Harness | base（sdk-minimal 也 insert） | `packages/core/agent/package.json` |
| `@deepseek-ai/dsh-agent-default-model` | `packages/core/agent-default-model` | Provider | base | Default model selection shared by Agent entry points | host 面默认后端 | `packages/core/agent-default-model/package.json` |
| `@deepseek-ai/dsh-agent-loop` | `packages/core/agent-loop` | Provider | base+sdk-minimal | The concrete agent loop plugin for the DeepSeek Harness | base（sdk-minimal 也 insert） | `packages/core/agent-loop/package.json` |
| `@deepseek-ai/dsh-agent-tool-presentation` | `packages/core/agent-tool-presentation` | Consumer | preset-only | Agent-plane presentation selector: composes one agent's tools as PTC mode, native, or both | 只在 agent-preset 面 | `packages/core/agent-tool-presentation/package.json` |
| `@deepseek-ai/dsh-scope` | `packages/core/scope` | library | sdk-minimal | Scoped-context registration primitive (scope tags, scope-filtered event dispatch) for the DeepSeek Harness | sdk-minimal 独立 insert | `packages/core/scope/package.json` |
| `@deepseek-ai/dsh-session` | `packages/core/session` | Definition | base+sdk-minimal | Event-sourced session store for the DeepSeek Harness | base（sdk-minimal 也 insert） | `packages/core/session/package.json` |
| `@deepseek-ai/dsh-system-prompt` | `packages/core/system-prompt` | Definition | base+sdk-minimal | System prompt assembly registry for the DeepSeek Harness | base（sdk-minimal 也 insert） | `packages/core/system-prompt/package.json` |
| `@deepseek-ai/dsh-tools` | `packages/core/tools` | Definition | base+sdk-minimal | Tool registry and execution pipeline for the DeepSeek Harness | base（sdk-minimal 也 insert） | `packages/core/tools/package.json` |

### boot/（5）

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-app-boot` | `packages/boot/app-boot` | library | 仓库有但不 shipped | Shared boot glue for the app bins: .env loading, fail-loud Loader guards, snapshot-aware config resolution, and the Loader boot sequence | 被依赖的库 | `packages/boot/app-boot/package.json` |
| `@deepseek-ai/dsh-cmdline` | `packages/boot/cmdline` | library | 仓库有但不 shipped | Immutable command-line handoff from a dsh launcher to any app plugin that injects cmdlineArgs | 被依赖的库 | `packages/boot/cmdline/package.json` |
| `@deepseek-ai/dsh-config-editor` | `packages/boot/config-editor` | Provider | base | Persist plugin configuration through profile patches and Loader reconciliation | host 面默认后端 | `packages/boot/config-editor/package.json` |
| `@deepseek-ai/dsh-hmr` | `packages/boot/hmr` | Provider | base | Coordinated module and profile configuration hot reload | host 面默认后端 | `packages/boot/hmr/package.json` |
| `@deepseek-ai/dsh-plugin-manager` | `packages/boot/plugin-manager` | Provider | base | Current-profile plugin and bundle management shared by dsh CLI, Web and agent tools | host 面默认后端 | `packages/boot/plugin-manager/package.json` |

### bundle/（6）

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-acp-app` | `packages/bundle/acp-app` | bundle | acp-app | The dsh ACP profile bundle: automation-only JSON-RPC stdio and process lifecycle over dsh-base | profile 的 patch 层 | `packages/bundle/acp-app/package.json` |
| `@deepseek-ai/dsh-base` | `packages/bundle/base` | bundle | 仓库有但不 shipped | The shared dsh core as a profile bundle: the first patch layer of base-backed profiles, inserting core rows over the empty profile root | profile 的 patch 层 | `packages/bundle/base/package.json` |
| `@deepseek-ai/dsh-headless` | `packages/bundle/headless` | bundle | headless | The dsh one-shot bundle: a direct core Agent/Session runner over dsh-base with no Host, HTTP, or browser layer | profile 的 patch 层 | `packages/bundle/headless/package.json` |
| `@deepseek-ai/dsh-sdk-app` | `packages/bundle/sdk-app` | bundle | sdk-app+sdk-minimal | The dsh SDK profile bundle: stdio JSON-RPC serving and process lifecycle over dsh-base | profile 的 patch 层 | `packages/bundle/sdk-app/package.json` |
| `@deepseek-ai/dsh-sdk-minimal` | `packages/bundle/sdk-minimal` | bundle | 仓库有但不 shipped | The standalone minimal SDK profile bundle: JSON-RPC, one DeepSeek adapter, persistent shell, and JSONL sessions | profile 的 patch 层 | `packages/bundle/sdk-minimal/package.json` |
| `@deepseek-ai/dsh-web-app` | `packages/bundle/web-app` | bundle | web-app | The dsh browser-surface bundle: the web patch layer over dsh-base plus the runtime glue plugin (frontend dist serving, web-surface prompt, bash runtime variables, URL line) | profile 的 patch 层 | `packages/bundle/web-app/package.json` |

### preset/（3）

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-agent-preset` | `packages/preset/agent-preset` | Consumer | preset-only | Declare an Agent capability composition in Cordis YAML | 只在 agent-preset 面 | `packages/preset/agent-preset/package.json` |
| `@deepseek-ai/dsh-agent-preset-registry` | `packages/preset/agent-preset-registry` | Provider | web-app | Declarative Agent preset registry and profile-backed editing | web overlay | `packages/preset/agent-preset-registry/package.json` |
| `@deepseek-ai/dsh-persona` | `packages/preset/persona` | Consumer | preset-only | Composition-authored deployment persona section for the DeepSeek Harness | 只在 agent-preset 面 | `packages/preset/persona/package.json` |

### ptc-runtime/（2）

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-ptc-runtime` | `packages/ptc-runtime/ptc-runtime` | Definition | 仓库有但不 shipped | Abstract PTC execution seam (ctx.ptcRuntime) for the DeepSeek Harness | 仓库有、yml 未点名 | `packages/ptc-runtime/ptc-runtime/package.json` |
| `@deepseek-ai/dsh-ptc-runtime-node` | `packages/ptc-runtime/ptc-runtime-node` | Provider | base | Sandboxed Node process implementation of the DeepSeek Harness PTC execution capability | host 面默认后端 | `packages/ptc-runtime/ptc-runtime-node/package.json` |

### ssh/（4）

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-fs-ssh` | `packages/ssh/fs-ssh` | Provider | 仓库有但不 shipped | Filesystem provider over the shared POSIX SSH helper | 仓库有、yml 未点名 | `packages/ssh/fs-ssh/package.json` |
| `@deepseek-ai/dsh-sandbox-ssh` | `packages/ssh/sandbox-ssh` | Provider | 仓库有但不 shipped | Remote POSIX sandbox argv provider over the shared SSH helper | 仓库有、yml 未点名 | `packages/ssh/sandbox-ssh/package.json` |
| `@deepseek-ai/dsh-ssh` | `packages/ssh/ssh` | Definition | 仓库有但不 shipped | Shared OpenSSH connection and versioned POSIX remote helper | 仓库有、yml 未点名 | `packages/ssh/ssh/package.json` |
| `@deepseek-ai/dsh-subprocess-ssh` | `packages/ssh/subprocess-ssh` | Provider | 仓库有但不 shipped | Subprocess and terminal provider over the shared POSIX SSH helper | 仓库有、yml 未点名 | `packages/ssh/subprocess-ssh/package.json` |

### llm/（9）

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-deepseek-llm-api-extensions` | `packages/llm/deepseek-llm-api-extensions` | Provider | base+sdk-minimal | Additive request-field registry for the official DeepSeek LLM API adapter | base（sdk-minimal 也 insert） | `packages/llm/deepseek-llm-api-extensions/package.json` |
| `@deepseek-ai/dsh-llm` | `packages/llm/llm` | Definition | base+sdk-minimal | Provider-neutral LLM service interface for the DeepSeek Harness | base（sdk-minimal 也 insert） | `packages/llm/llm/package.json` |
| `@deepseek-ai/dsh-llm-deepseek` | `packages/llm/llm-deepseek` | library | 仓库有但不 shipped | DeepSeek Messages adapter | 被依赖的库 | `packages/llm/llm-deepseek/package.json` |
| `@deepseek-ai/dsh-llm-deepseek-account` | `packages/llm/llm-deepseek-account` | Consumer | base | DeepSeek account provider authentication and discovery | host 面 | `packages/llm/llm-deepseek-account/package.json` |
| `@deepseek-ai/dsh-llm-deepseek-api-key` | `packages/llm/llm-deepseek-api-key` | Consumer | base+sdk-minimal | DeepSeek api-key provider authentication and discovery | base（sdk-minimal 也 insert） | `packages/llm/llm-deepseek-api-key/package.json` |
| `@deepseek-ai/dsh-llm-pi-ai` | `packages/llm/llm-pi-ai` | Consumer | base | pi-ai-backed DeepSeek adapter for the DeepSeek Harness LLM seam (design-verification twin of dsh-llm-deepseek) | host 面 | `packages/llm/llm-pi-ai/package.json` |
| `@deepseek-ai/dsh-llm-retry` | `packages/llm/llm-retry` | Consumer | base+sdk-minimal | Provider-routed LLM request retry policy for the DeepSeek Harness | base（sdk-minimal 也 insert） | `packages/llm/llm-retry/package.json` |
| `@deepseek-ai/dsh-plugin-package-inventory-deepseek` | `packages/llm/plugin-package-inventory-deepseek` | Consumer | base+sdk-minimal | Active Loader-backed plugin package inventory for official DeepSeek LLM API requests | base（sdk-minimal 也 insert） | `packages/llm/plugin-package-inventory-deepseek/package.json` |
| `@deepseek-ai/dsh-token-meter` | `packages/llm/token-meter` | Provider | base | Replay-aware token measurement service (ctx.tokenMeter) for the DeepSeek Harness | host 面默认后端 | `packages/llm/token-meter/package.json` |

### fs/（7）

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-fs` | `packages/fs/fs` | Definition | 仓库有但不 shipped | Abstract filesystem capability seam (ctx.fs) for the DeepSeek Harness — vocabulary types, the FileSystem service (text IO + optional version-guarded atomic mutations), and the fs/* | 仓库有、yml 未点名 | `packages/fs/fs/package.json` |
| `@deepseek-ai/dsh-fs-local` | `packages/fs/fs-local` | Provider | 仓库有但不 shipped | Local-filesystem implementation of the DeepSeek Harness filesystem seam (ctx.fs) | 仓库有、yml 未点名 | `packages/fs/fs-local/package.json` |
| `@deepseek-ai/dsh-fs-observation-policy` | `packages/fs/fs-observation-policy` | Consumer | base | File-context policy plugin for the DeepSeek Harness — observed-state, read-before-edit, and version-guarded write/edit added over the ctx.fs provider seam through the fs/* event ga | host 面 | `packages/fs/fs-observation-policy/package.json` |
| `@deepseek-ai/dsh-fs-sandbox` | `packages/fs/fs-sandbox` | library | base | Sandbox-enforcing implementation of the DeepSeek Harness filesystem seam: fences write/edit by the per-call sandbox mode (read-only denies mutation, workspace-write contains it to  | host 面 | `packages/fs/fs-sandbox/package.json` |
| `@deepseek-ai/dsh-tool-fs` | `packages/fs/tool-fs` | Consumer | base | Model-facing filesystem tools (read, write, edit) over the DeepSeek Harness filesystem seam (ctx.fs) | host 面 | `packages/fs/tool-fs/package.json` |
| `@deepseek-ai/dsh-tool-fs-search` | `packages/fs/tool-fs-search` | Consumer | base | Model-facing filesystem discovery tools (glob, grep) backed by the packaged ripgrep binary (@vscode/ripgrep) | host 面 | `packages/fs/tool-fs-search/package.json` |
| `@deepseek-ai/dsh-tool-str-replace-editor` | `packages/fs/tool-str-replace-editor` | Consumer | 仓库有但不 shipped | Model-facing view, create, literal replace, and line insert tool over the Harness filesystem service | 仓库有、yml 未点名 | `packages/fs/tool-str-replace-editor/package.json` |

### shell/（10）

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-bash-local` | `packages/shell/bash-local` | library | 仓库有但不 shipped | Local-subprocess implementation of the DeepSeek Harness bash executor seam | 被依赖的库 | `packages/shell/bash-local/package.json` |
| `@deepseek-ai/dsh-bash-sandbox` | `packages/shell/bash-sandbox` | library | base | Sandbox-consuming implementation of the DeepSeek Harness bash executor seam (confines every command via ctx.sandbox, reports denial/enforcement result facts) | host 面 | `packages/shell/bash-sandbox/package.json` |
| `@deepseek-ai/dsh-pwsh-local` | `packages/shell/pwsh-local` | library | 仓库有但不 shipped | Local PowerShell implementation of the DeepSeek Harness bash executor seam | 被依赖的库 | `packages/shell/pwsh-local/package.json` |
| `@deepseek-ai/dsh-pwsh-sandbox` | `packages/shell/pwsh-sandbox` | library | base | Sandbox-consuming implementation of the DeepSeek Harness PowerShell executor seam (confines every command via ctx.sandbox, reports denial/enforcement result facts) | host 面 | `packages/shell/pwsh-sandbox/package.json` |
| `@deepseek-ai/dsh-shell` | `packages/shell/shell` | Definition | 仓库有但不 shipped | Abstract bash executor seam (ctx.shell) for the DeepSeek Harness | 仓库有、yml 未点名 | `packages/shell/shell/package.json` |
| `@deepseek-ai/dsh-shell-env` | `packages/shell/shell-env` | Provider | base | Tool-independent managed DSH_* shell environment registry | host 面默认后端 | `packages/shell/shell-env/package.json` |
| `@deepseek-ai/dsh-tool-bash` | `packages/shell/tool-bash` | Consumer | base | Model-facing bash tool with optional generic background-job and sandbox-escalation support | host 面 | `packages/shell/tool-bash/package.json` |
| `@deepseek-ai/dsh-tool-bash-persistent` | `packages/shell/tool-bash-persistent` | Consumer | sdk-minimal+preset-only | Model-facing owner-scoped persistent Bash tool backed by the Harness PTY service | minimal preset + sdk-minimal | `packages/shell/tool-bash-persistent/package.json` |
| `@deepseek-ai/dsh-tool-pwsh` | `packages/shell/tool-pwsh` | Consumer | base | Model-facing pwsh tool over the bash executor seam | host 面 | `packages/shell/tool-pwsh/package.json` |
| `@deepseek-ai/dsh-tool-pwsh-persistent` | `packages/shell/tool-pwsh-persistent` | Consumer | sdk-minimal+preset-only | Model-facing owner-scoped persistent PowerShell tool backed by the Harness PTY service | minimal preset + sdk-minimal | `packages/shell/tool-pwsh-persistent/package.json` |

### subprocess/（3）

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-subprocess` | `packages/subprocess/subprocess` | Definition | 仓库有但不 shipped | Subprocess seam (ctx.subprocess) for the DeepSeek Harness — managed process groups, bounded spill-backed output, and escalated kills behind one abstract service | 仓库有、yml 未点名 | `packages/subprocess/subprocess/package.json` |
| `@deepseek-ai/dsh-subprocess-local` | `packages/subprocess/subprocess-local` | library | base+sdk-minimal | Local-subprocess implementation of the DeepSeek Harness subprocess seam | base（sdk-minimal 也 insert） | `packages/subprocess/subprocess-local/package.json` |
| `@deepseek-ai/dsh-win32-process` | `packages/subprocess/win32-process` | library | 仓库有但不 shipped | Shared low-level Win32 process, stdio, and Job Object primitives | 被依赖的库 | `packages/subprocess/win32-process/package.json` |

### sandbox/（4）

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-sandbox` | `packages/sandbox/sandbox` | Definition | 仓库有但不 shipped | Abstract process-sandbox seam (ctx.sandbox) for the DeepSeek Harness: same-world confinement vocabulary and the SandboxProvider contract | 仓库有、yml 未点名 | `packages/sandbox/sandbox/package.json` |
| `@deepseek-ai/dsh-sandbox-local` | `packages/sandbox/sandbox-local` | library | base+sdk-minimal | Local process-sandbox backends for the DeepSeek Harness sandbox seam: bwrap, the npm-distributed landlock-run launcher, macOS Seatbelt, or the Windows ACL restricted-token runner — | base（sdk-minimal 也 insert） | `packages/sandbox/sandbox-local/package.json` |
| `@deepseek-ai/dsh-sandbox-policy` | `packages/sandbox/sandbox-policy` | Provider | base+sdk-minimal | Per-call sandbox policy resolver and current model context: deployment fallbacks plus each session's mode and workspace root, shared by every enforcing capability family | base（sdk-minimal 也 insert） | `packages/sandbox/sandbox-policy/package.json` |
| `@deepseek-ai/dsh-sandbox-windows-acl` | `packages/sandbox/sandbox-windows-acl` | library | 仓库有但不 shipped | Windows ACL write-restriction sandbox backend (restricted-token spawn with capability-SID write allowlist) for the DeepSeek Harness sandbox seam | 被依赖的库 | `packages/sandbox/sandbox-windows-acl/package.json` |

### terminal/（3）

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-terminal` | `packages/terminal/terminal` | Provider | sdk-minimal+preset-only | Persistent PTY session seam for the DeepSeek Harness — owner-scoped ids, backend registry, interactive sends, reads, signals, and awaited cleanup | minimal preset + sdk-minimal | `packages/terminal/terminal/package.json` |
| `@deepseek-ai/dsh-terminal-bash` | `packages/terminal/terminal-bash` | Consumer | sdk-minimal+preset-only | Persistent shell PTY backend over the DeepSeek Harness subprocess terminal primitive | minimal preset + sdk-minimal | `packages/terminal/terminal-bash/package.json` |
| `@deepseek-ai/dsh-tool-terminal` | `packages/terminal/tool-terminal` | Consumer | 仓库有但不 shipped | Six model-facing persistent PTY tools with owner isolation and generic background-job integration | 仓库有、yml 未点名 | `packages/terminal/tool-terminal/package.json` |

### lsp/（3）

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-lsp` | `packages/lsp/lsp` | Provider | 仓库有但不 shipped | Abstract LSP capability seam (ctx.lsp) for the DeepSeek Harness — language-server provider registry keyed by branded id and extension mapping, order-independent per-query selection | 仓库有、yml 未点名 | `packages/lsp/lsp/package.json` |
| `@deepseek-ai/dsh-lsp-stdio` | `packages/lsp/lsp-stdio` | Consumer | 仓库有但不 shipped | Generic stdio language-server provider for the DeepSeek Harness LSP capability seam (ctx.lsp) — spawns configured servers, translates JSON-RPC, and serves transient-open goToDefini | 仓库有、yml 未点名 | `packages/lsp/lsp-stdio/package.json` |
| `@deepseek-ai/dsh-tool-lsp` | `packages/lsp/tool-lsp` | Consumer | 仓库有但不 shipped | Model-facing lsp tool over the DeepSeek Harness LSP capability seam (ctx.lsp) — one read-only tool with goToDefinition/findReferences/goToImplementation/hover operations, one-based | 仓库有、yml 未点名 | `packages/lsp/tool-lsp/package.json` |

### skill/（6）

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-skill` | `packages/skill/skill` | Provider | base | Agent skill provider registry for the DeepSeek Harness | host 面默认后端 | `packages/skill/skill/package.json` |
| `@deepseek-ai/dsh-skill-badge` | `packages/skill/skill-badge` | Consumer | base | Bundled dsh badge skill provider for DeepSeek Harness | host 面 | `packages/skill/skill-badge/package.json` |
| `@deepseek-ai/dsh-skill-filesystem` | `packages/skill/skill-filesystem` | Consumer | base | Local filesystem skill provider for the DeepSeek Harness | host 面 | `packages/skill/skill-filesystem/package.json` |
| `@deepseek-ai/dsh-skill-office` | `packages/skill/skill-office` | Consumer | sdk-app | Bundled Word, PowerPoint, and Excel workflows and structural checks | sdk overlay | `packages/skill/skill-office/package.json` |
| `@deepseek-ai/dsh-tool-skill` | `packages/skill/tool-skill` | Consumer | base | Model-facing skill loading tool for the DeepSeek Harness | host 面 | `packages/skill/tool-skill/package.json` |
| `@deepseek-ai/dsh-tool-workspace-dependencies` | `packages/skill/tool-workspace-dependencies` | Consumer | sdk-app | The load_workspace_dependencies tool: absolute paths into a bundled Python, Node.js, and pnpm payload | sdk overlay | `packages/skill/tool-workspace-dependencies/package.json` |

### plan/（1）

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-plan-mode` | `packages/plan/plan-mode` | Consumer | base | Logged per-agent plan mode with deployment guidance, a direct slash command, and a user-reviewed exit | host 面 | `packages/plan/plan-mode/package.json` |

### todo/（1）

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-tool-todo` | `packages/todo/tool-todo` | Consumer | base | Model-facing todo_write tool over the DeepSeek Harness event-sourced session log | host 面 | `packages/todo/tool-todo/package.json` |

### goal/（4）

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-command-goal` | `packages/goal/command-goal` | Consumer | base | Human-facing slash command for persisted same-session goals | host 面 | `packages/goal/command-goal/package.json` |
| `@deepseek-ai/dsh-goal` | `packages/goal/goal` | Provider | base | Event-sourced same-session goal state and lifecycle service for the DeepSeek Harness | host 面默认后端 | `packages/goal/goal/package.json` |
| `@deepseek-ai/dsh-goal-round-driver` | `packages/goal/goal-round-driver` | Consumer | base | Race-fenced same-session goal-round driver | host 面 | `packages/goal/goal-round-driver/package.json` |
| `@deepseek-ai/dsh-tool-goal` | `packages/goal/tool-goal` | Consumer | base | Model-facing same-session goal tools with execution-time authority checks | host 面 | `packages/goal/tool-goal/package.json` |

### jobs/（3）

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-jobs` | `packages/jobs/jobs` | Definition | 仓库有但不 shipped | Background job registry (ctx.jobs) for the DeepSeek Harness — shared ids, owner isolation, polling, cancellation, and completion listeners for long-running tool work | 仓库有、yml 未点名 | `packages/jobs/jobs/package.json` |
| `@deepseek-ai/dsh-jobs-local` | `packages/jobs/jobs-local` | library | base+sdk-minimal | Process-local implementation of the DeepSeek Harness background job registry seam | base（sdk-minimal 也 insert） | `packages/jobs/jobs-local/package.json` |
| `@deepseek-ai/dsh-tool-jobs` | `packages/jobs/tool-jobs` | Consumer | base | Model-facing background job control tools (job_output, job_list, job_kill) over the ctx.jobs registry | host 面 | `packages/jobs/tool-jobs/package.json` |

### workflow/（4）

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-tool-ralph` | `packages/workflow/tool-ralph` | Consumer | base | Model-facing fresh-agent Ralph loop over the workflow and subagent seams | host 面 | `packages/workflow/tool-ralph/package.json` |
| `@deepseek-ai/dsh-tool-workflow` | `packages/workflow/tool-workflow` | Consumer | base | Model-facing workflow tool: run a JavaScript orchestration script over ctx.workflowEngine | host 面 | `packages/workflow/tool-workflow/package.json` |
| `@deepseek-ai/dsh-workflow` | `packages/workflow/workflow` | Definition | 仓库有但不 shipped | Workflow capability seam: ctx.workflowEngine service, run vocabulary, and workflow/* events | 仓库有、yml 未点名 | `packages/workflow/workflow/package.json` |
| `@deepseek-ai/dsh-workflow-ptc` | `packages/workflow/workflow-ptc` | library | base | Workflow orchestration in the shared sandboxed Node PTC runtime | host 面 | `packages/workflow/workflow-ptc/package.json` |

### subagent/（10）

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-subagent` | `packages/subagent/subagent` | Provider | base | Abstract subagent seam (ctx.subagents): named-provider registry for delegating to child agents | host 面默认后端 | `packages/subagent/subagent/package.json` |
| `@deepseek-ai/dsh-subagent-acp` | `packages/subagent/subagent-acp` | Consumer | 仓库有但不 shipped | Out-of-process ACP subagent backend: drives a child agent in a spawned subprocess over the Agent Client Protocol | 仓库有、yml 未点名 | `packages/subagent/subagent-acp/package.json` |
| `@deepseek-ai/dsh-subagent-claude-code` | `packages/subagent/subagent-claude-code` | Consumer | 仓库有但不 shipped | One-shot Claude Code subagent provider over the official Agent SDK | 仓库有、yml 未点名 | `packages/subagent/subagent-claude-code/package.json` |
| `@deepseek-ai/dsh-subagent-codex` | `packages/subagent/subagent-codex` | Consumer | 仓库有但不 shipped | One-shot Codex subagent provider over the official app-server protocol | 仓库有、yml 未点名 | `packages/subagent/subagent-codex/package.json` |
| `@deepseek-ai/dsh-subagent-dsh-sdk` | `packages/subagent/subagent-dsh-sdk` | Consumer | 仓库有但不 shipped | Out-of-process SDK subagent backend: drives a child DeepSeek Harness runtime subprocess over stdio JSON-RPC through the TypeScript SDK client | 仓库有、yml 未点名 | `packages/subagent/subagent-dsh-sdk/package.json` |
| `@deepseek-ai/dsh-subagent-fork-in-process` | `packages/subagent/subagent-fork-in-process` | Consumer | base | In-process fork subagent backend: runs a child agent seeded with a prefix of the parent's log | host 面 | `packages/subagent/subagent-fork-in-process/package.json` |
| `@deepseek-ai/dsh-subagent-in-process-driver` | `packages/subagent/subagent-in-process-driver` | Consumer | 仓库有但不 shipped | Shared in-process subagent run driver: drives a child agent on ctx.agents (used by the spawn and fork backends) | 仓库有、yml 未点名 | `packages/subagent/subagent-in-process-driver/package.json` |
| `@deepseek-ai/dsh-subagent-spawn-in-process` | `packages/subagent/subagent-spawn-in-process` | Consumer | base | In-process spawn subagent backend: runs a fresh child agent on ctx.agents | host 面 | `packages/subagent/subagent-spawn-in-process/package.json` |
| `@deepseek-ai/dsh-tool-subagent` | `packages/subagent/tool-subagent` | Consumer | base+web-app | Model-facing subagent delegation tool over the ctx.subagents seam | base，web 再叠 | `packages/subagent/tool-subagent/package.json` |
| `@deepseek-ai/dsh-tool-subagent-control` | `packages/subagent/tool-subagent-control` | Consumer | base | Globally named send_message, interrupt_agent, and list_agents tools over ctx.subagents continuations | host 面 | `packages/subagent/tool-subagent-control/package.json` |

### compaction/（5）

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-command-compact` | `packages/compaction/command-compact` | Consumer | base | Human-facing slash command for explicit session compaction | host 面 | `packages/compaction/command-compact/package.json` |
| `@deepseek-ai/dsh-compaction` | `packages/compaction/compaction` | Definition | 仓库有但不 shipped | Abstract compaction service seam (ctx.compaction) for the DeepSeek Harness | 仓库有、yml 未点名 | `packages/compaction/compaction/package.json` |
| `@deepseek-ai/dsh-compaction-basic` | `packages/compaction/compaction-basic` | library | base | Token-meter-driven compaction policy and LLM summarization backend for the DeepSeek Harness | host 面 | `packages/compaction/compaction-basic/package.json` |
| `@deepseek-ai/dsh-compaction-image-offload` | `packages/compaction/compaction-image-offload` | Consumer | base | Durable image offload for image-capable routes: replace over-budget request images with placeholders and retry | host 面 | `packages/compaction/compaction-image-offload/package.json` |
| `@deepseek-ai/dsh-compaction-tool-result-pruner` | `packages/compaction/compaction-tool-result-pruner` | Provider | base | Replay-safe model-free head/middle/tail pruning for tool-result surface nodes | host 面默认后端 | `packages/compaction/compaction-tool-result-pruner/package.json` |

### context/（6）

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-agent-instructions` | `packages/context/agent-instructions` | Consumer | base | Workspace context loader for AGENTS.md/CLAUDE.md instruction files | host 面 | `packages/context/agent-instructions/package.json` |
| `@deepseek-ai/dsh-file-reference` | `packages/context/file-reference` | Definition | 仓库有但不 shipped | File-reference discovery contract and shared @file grammar | 仓库有、yml 未点名 | `packages/context/file-reference/package.json` |
| `@deepseek-ai/dsh-file-reference-local` | `packages/context/file-reference-local` | library | web-app | Local-filesystem ctx.fileReferences provider with bounded fuzzy indexes | web overlay | `packages/context/file-reference-local/package.json` |
| `@deepseek-ai/dsh-session-reference` | `packages/context/session-reference` | Provider | web-app | Cross-session snapshot references and durable untrusted model context (ctx.sessionReferenceResolver) | web overlay | `packages/context/session-reference/package.json` |
| `@deepseek-ai/dsh-time-context` | `packages/context/time-context` | Consumer | web-app | Durable per-step context with the current time and elapsed time | web overlay | `packages/context/time-context/package.json` |
| `@deepseek-ai/dsh-tmux-context` | `packages/context/tmux-context` | Consumer | 仓库有但不 shipped | Opt-in durable per-step context with this agent's tmux pane and window location | 仓库有、yml 未点名 | `packages/context/tmux-context/package.json` |

### interaction/（5）

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-commands` | `packages/interaction/commands` | Provider | base | Plugin-owned human command registry for DeepSeek Harness UIs | host 面默认后端 | `packages/interaction/commands/package.json` |
| `@deepseek-ai/dsh-permission-presets` | `packages/interaction/permission-presets` | Provider | base | User-facing permission presets (ctx.permissionPresets) for the DeepSeek Harness: one product-level Permissions select bundling the sandbox-mode and approval-policy knobs, written t | host 面默认后端 | `packages/interaction/permission-presets/package.json` |
| `@deepseek-ai/dsh-tool-ask-user` | `packages/interaction/tool-ask-user` | Consumer | preset-only | Model-facing ask_user_question tool over the ctx.userQuestions seam | 只在 agent-preset 面 | `packages/interaction/tool-ask-user/package.json` |
| `@deepseek-ai/dsh-user-approval` | `packages/interaction/user-approval` | Provider | base | User-approval seam (ctx.approval) for the DeepSeek Harness: one-shot permission decisions dispatched to composed answerers over the approval/request waterfall, fail-closed by defau | host 面默认后端 | `packages/interaction/user-approval/package.json` |
| `@deepseek-ai/dsh-user-questions` | `packages/interaction/user-questions` | Provider | base | Abstract user-questions seam (ctx.userQuestions) for asking the human during agent runs | host 面默认后端 | `packages/interaction/user-questions/package.json` |

### session/（20）

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-session-checkpoint-policy` | `packages/session/session-checkpoint-policy` | Consumer | base | Semantic session durability checkpoints before model requests and tool side effects | host 面 | `packages/session/session-checkpoint-policy/package.json` |
| `@deepseek-ai/dsh-session-format` | `packages/session/session-format` | library | 仓库有但不 shipped | Streaming adjacent Session format migration machinery | 被依赖的库 | `packages/session/session-format/package.json` |
| `@deepseek-ai/dsh-session-format-catalog` | `packages/session/session-format-catalog` | library | 仓库有但不 shipped | Build-static first-party Session format codec and migration catalog | 被依赖的库 | `packages/session/session-format-catalog/package.json` |
| `@deepseek-ai/dsh-session-format-v0-to-v1` | `packages/session/session-format-v0-to-v1` | library | 仓库有但不 shipped | Frozen released-v0 Session codec and identity migration to v1 | 被依赖的库 | `packages/session/session-format-v0-to-v1/package.json` |
| `@deepseek-ai/dsh-session-format-v1-to-v2` | `packages/session/session-format-v1-to-v2` | library | 仓库有但不 shipped | Frozen released-v1 Session codec and assistant-stream migration to v2 | 被依赖的库 | `packages/session/session-format-v1-to-v2/package.json` |
| `@deepseek-ai/dsh-session-format-v2-to-v3` | `packages/session/session-format-v2-to-v3` | library | 仓库有但不 shipped | Streaming system-prompt, canonical-envelope and PTC migration into V3 | 被依赖的库 | `packages/session/session-format-v2-to-v3/package.json` |
| `@deepseek-ai/dsh-session-format-v3-to-v4` | `packages/session/session-format-v3-to-v4` | library | 仓库有但不 shipped | Streaming tool-role migration and delivery validation from Session V3 to V4 | 被依赖的库 | `packages/session/session-format-v3-to-v4/package.json` |
| `@deepseek-ai/dsh-session-log-deepseek` | `packages/session/session-log-deepseek` | Consumer | base+sdk-minimal | Incremental lossless session-log request extension for the official DeepSeek LLM API | base（sdk-minimal 也 insert） | `packages/session/session-log-deepseek/package.json` |
| `@deepseek-ai/dsh-session-persistence` | `packages/session/session-persistence` | Definition | 仓库有但不 shipped | Abstract durable session persistence seam (ctx.sessionPersistence) for the DeepSeek Harness | 仓库有、yml 未点名 | `packages/session/session-persistence/package.json` |
| `@deepseek-ai/dsh-session-persistence-jsonl` | `packages/session/session-persistence-jsonl` | library | base+sdk-minimal | JSONL durable session persistence backend for the DeepSeek Harness | base（sdk-minimal 也 insert） | `packages/session/session-persistence-jsonl/package.json` |
| `@deepseek-ai/dsh-session-projection` | `packages/session/session-projection` | Provider | base+sdk-minimal | Session-projection seam: the merge-extensible projection type table, the provider contract, and the ctx.sessionProjections registry serving whole current values of log-derived per- | base（sdk-minimal 也 insert） | `packages/session/session-projection/package.json` |
| `@deepseek-ai/dsh-session-projection-cache` | `packages/session/session-projection-cache` | Provider | base | Persisted projection cache (ctx.sessionProjectionCache): durable per-session checkpoint records on the session_projcache storage domain (per-record layout), throttled write-behind, | host 面默认后端 | `packages/session/session-projection-cache/package.json` |
| `@deepseek-ai/dsh-session-stats` | `packages/session/session-stats` | Consumer | web-app | Whole-log conversation counts and wall times projection (sessionStats) for the DeepSeek Harness | web overlay | `packages/session/session-stats/package.json` |
| `@deepseek-ai/dsh-session-telemetry` | `packages/session/session-telemetry` | Definition | 仓库有但不 shipped | SessionTelemetryBackend seam for the DeepSeek Harness: session-event capture, projection, redaction, and handoff to a reporting backend | 仓库有、yml 未点名 | `packages/session/session-telemetry/package.json` |
| `@deepseek-ai/dsh-session-telemetry-otel` | `packages/session/session-telemetry-otel` | library | base | OpenTelemetry backend for the DeepSeek Harness telemetry seam: hands captured session records to the OTel JS SDK's log pipeline | host 面 | `packages/session/session-telemetry-otel/package.json` |
| `@deepseek-ai/dsh-session-title` | `packages/session/session-title` | Provider | base+sdk-minimal | Log-backed session title service and provider registry for the DeepSeek Harness | base（sdk-minimal 也 insert） | `packages/session/session-title/package.json` |
| `@deepseek-ai/dsh-session-title-all-prompts-llm` | `packages/session/session-title-all-prompts-llm` | Consumer | 仓库有但不 shipped | All-user-messages LLM provider plugin for DeepSeek Harness session titles | 仓库有、yml 未点名 | `packages/session/session-title-all-prompts-llm/package.json` |
| `@deepseek-ai/dsh-session-title-first-prompt-llm` | `packages/session/session-title-first-prompt-llm` | Consumer | base | First-message LLM provider plugin for DeepSeek Harness session titles | host 面 | `packages/session/session-title-first-prompt-llm/package.json` |
| `@deepseek-ai/dsh-session-title-llm` | `packages/session/session-title-llm` | library | 仓库有但不 shipped | Shared LLM generation policy for DeepSeek Harness session-title providers | 被依赖的库 | `packages/session/session-title-llm/package.json` |
| `@deepseek-ai/dsh-session-turn-outline` | `packages/session/session-turn-outline` | Consumer | web-app | Whole-log turn outline projection (turnOutline) for the DeepSeek Harness | web overlay | `packages/session/session-turn-outline/package.json` |

### session-query/（4）

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-session-log-export` | `packages/session-query/session-log-export` | Consumer | web-app | Web Session-log export command and shared download dialog | web overlay | `packages/session-query/session-log-export/package.json` |
| `@deepseek-ai/dsh-session-query` | `packages/session-query/session-query` | Definition | 仓库有但不 shipped | Combined session query service contract with concrete reads, traces, and filters | 仓库有、yml 未点名 | `packages/session-query/session-query/package.json` |
| `@deepseek-ai/dsh-session-query-sqlite` | `packages/session-query/session-query-sqlite` | library | base | Concrete ctx.sessionQuery backend with SQLite FTS5 search | host 面 | `packages/session-query/session-query-sqlite/package.json` |
| `@deepseek-ai/dsh-tool-session-query` | `packages/session-query/tool-session-query` | Consumer | 仓库有但不 shipped | Workspace-authorized model-facing session history search, trace, and event read tools | 仓库有、yml 未点名 | `packages/session-query/tool-session-query/package.json` |

### settings/（1）

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-settings` | `packages/settings/settings` | Definition | base | Abstract user-settings seam (ctx.settings) for the DeepSeek Harness | host 面登记 ctx 键 | `packages/settings/settings/package.json` |

### storage/（4）

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-storage` | `packages/storage/storage` | Provider | base | Storage hub (ctx.storage): named backend registry plus mounted data-form facilities for the DeepSeek Harness | host 面默认后端 | `packages/storage/storage/package.json` |
| `@deepseek-ai/dsh-storage-domain` | `packages/storage/storage-domain` | Consumer | base | Domain data form (ctx.storage.domain): schema-validated, event-emitting KV domains over storage backends for the DeepSeek Harness | host 面 | `packages/storage/storage-domain/package.json` |
| `@deepseek-ai/dsh-storage-json` | `packages/storage/storage-json` | Consumer | base | JSON file KV storage backend for the DeepSeek Harness storage hub | host 面 | `packages/storage/storage-json/package.json` |
| `@deepseek-ai/dsh-storage-sqlite` | `packages/storage/storage-sqlite` | Consumer | 仓库有但不 shipped | SQLite storage backend (kv facet) for the DeepSeek Harness storage hub | 仓库有、yml 未点名 | `packages/storage/storage-sqlite/package.json` |

### spill/（3）

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-spill` | `packages/spill/spill` | Definition | 仓库有但不 shipped | Abstract spill storage seam (ctx.spillStore) for the DeepSeek Harness — save oversized tool text and return a retrieval locator | 仓库有、yml 未点名 | `packages/spill/spill/package.json` |
| `@deepseek-ai/dsh-spill-local` | `packages/spill/spill-local` | library | base | Local-filesystem implementation of the DeepSeek Harness spill storage seam (private session-scoped files) | host 面 | `packages/spill/spill-local/package.json` |
| `@deepseek-ai/dsh-spill-policy` | `packages/spill/spill-policy` | Consumer | base | Token-budgeted tool-result retention with recoverable text and image paths | host 面 | `packages/spill/spill-policy/package.json` |

### attachment/（2）

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-attachment` | `packages/attachment/attachment` | Definition | 仓库有但不 shipped | Durable immutable attachment storage seam for the DeepSeek Harness | 仓库有、yml 未点名 | `packages/attachment/attachment/package.json` |
| `@deepseek-ai/dsh-attachment-local` | `packages/attachment/attachment-local` | library | base | Private content-addressed DSH_HOME attachment storage | host 面 | `packages/attachment/attachment-local/package.json` |

### credentials/（5）

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-authorization` | `packages/credentials/authorization` | Provider | base | Authorization seam (ctx.authorization): plugin-owned flows that obtain a credential through a conversation with the human | host 面默认后端 | `packages/credentials/authorization/package.json` |
| `@deepseek-ai/dsh-credentials` | `packages/credentials/credentials` | Definition | 仓库有但不 shipped | Abstract credential seam (ctx.credentials): settings carry references to secrets, providers own the values | 仓库有、yml 未点名 | `packages/credentials/credentials/package.json` |
| `@deepseek-ai/dsh-credentials-local` | `packages/credentials/credentials-local` | library | base | File-backed credentials provider ($DSH_HOME/.env under the live process environment) for the DeepSeek Harness | host 面 | `packages/credentials/credentials-local/package.json` |
| `@deepseek-ai/dsh-deepseek-account` | `packages/credentials/deepseek-account` | Definition | 仓库有但不 shipped | Read account state and resolve official API credentials | 仓库有、yml 未点名 | `packages/credentials/deepseek-account/package.json` |
| `@deepseek-ai/dsh-deepseek-account-platform` | `packages/credentials/deepseek-account-platform` | library | base | Authorize DeepSeek accounts through browser PKCE | host 面 | `packages/credentials/deepseek-account-platform/package.json` |

### workspace/（1）

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-workspace` | `packages/workspace/workspace` | Provider | web-app | Workspace entity registry (ctx.workspaceRegistry): durable workspace records with validated session attachment over the domain data form for the DeepSeek Harness | web overlay | `packages/workspace/workspace/package.json` |

### deliverables/（2）

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-tool-present` | `packages/deliverables/tool-present` | Consumer | preset-only | Explicit workspace file delivery declarations for the DeepSeek Harness | 只在 agent-preset 面 | `packages/deliverables/tool-present/package.json` |
| `@deepseek-ai/dsh-workspace-changes` | `packages/deliverables/workspace-changes` | Consumer | web-app | Per-turn workspace file changes recorded from git working-tree snapshots and whole-file captures, with per-file comparisons, for the DeepSeek Harness | web overlay | `packages/deliverables/workspace-changes/package.json` |

### schedule/（1）

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-schedule` | `packages/schedule/schedule` | Consumer | web-app | Host-wide durable reminders with shared management and original-Session delivery | web overlay | `packages/schedule/schedule/package.json` |

### web/（6）

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-tool-web` | `packages/web/tool-web` | Consumer | base | Model-facing web tools (web_search, web_fetch) over the DeepSeek Harness web capability seam (ctx.web) | host 面 | `packages/web/tool-web/package.json` |
| `@deepseek-ai/dsh-web` | `packages/web/web` | Provider | base | Abstract web access capability seam (ctx.web) for the DeepSeek Harness — search/fetch provider registry, registration-order-independent selection, request/result vocabulary, and th | host 面默认后端 | `packages/web/web/package.json` |
| `@deepseek-ai/dsh-web-fetch-http` | `packages/web/web-fetch-http` | Consumer | base | Anonymous public HTTP(S) fetch provider for the DeepSeek Harness web capability seam (ctx.web) | host 面 | `packages/web/web-fetch-http/package.json` |
| `@deepseek-ai/dsh-web-search-deepseek` | `packages/web/web-search-deepseek` | Consumer | base | DeepSeek-backed search provider (native web_search via the Anthropic-compatible API) for the DeepSeek Harness web capability seam (ctx.web) | host 面 | `packages/web/web-search-deepseek/package.json` |
| `@deepseek-ai/dsh-web-search-exa` | `packages/web/web-search-exa` | Consumer | 仓库有但不 shipped | Exa-backed search provider for the DeepSeek Harness web capability seam (ctx.web) | 仓库有、yml 未点名 | `packages/web/web-search-exa/package.json` |
| `@deepseek-ai/dsh-web-search-perplexity` | `packages/web/web-search-perplexity` | Consumer | 仓库有但不 shipped | Perplexity-backed search provider for the DeepSeek Harness web capability seam (ctx.web) | 仓库有、yml 未点名 | `packages/web/web-search-perplexity/package.json` |

### webhook/（2）

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-webhook` | `packages/webhook/webhook` | Provider | 仓库有但不 shipped | Fire-and-forget webhook rule runtime that creates Workspace-backed DeepSeek Harness Sessions | 仓库有、yml 未点名 | `packages/webhook/webhook/package.json` |
| `@deepseek-ai/dsh-webhook-github` | `packages/webhook/webhook-github` | Consumer | 仓库有但不 shipped | Signed GitHub HTTP webhook adapter for the DeepSeek Harness webhook runtime | 仓库有、yml 未点名 | `packages/webhook/webhook-github/package.json` |

### mcp/（2）

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-mcp-client` | `packages/mcp/mcp-client` | Consumer | 仓库有但不 shipped | MCP client bridge: connects to MCP servers and registers their tools on ctx.tools | 仓库有、yml 未点名 | `packages/mcp/mcp-client/package.json` |
| `@deepseek-ai/dsh-mcp-resources` | `packages/mcp/mcp-resources` | Consumer | base+sdk-minimal | Scoped MCP resource discovery and reading through shared model tools | base（sdk-minimal 也 insert） | `packages/mcp/mcp-resources/package.json` |

### acp/（1）

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-acp` | `packages/acp/acp` | Consumer | acp-app | Automation-only Agent Client Protocol server for driving DeepSeek Harness agents over JSON-RPC stdio | acp overlay | `packages/acp/acp/package.json` |

### sdk/（3）

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-sdk-client` | `packages/sdk/client` | library | 仓库有但不 shipped | TypeScript client SDK for driving a DeepSeek Harness runtime subprocess over stdio JSON-RPC: the DeepSeekHarness high-level turns API and the lower-level HarnessClient | 被依赖的库 | `packages/sdk/client/package.json` |
| `@deepseek-ai/dsh-sdk-protocol` | `packages/sdk/protocol` | library | 仓库有但不 shipped | Shared wire protocol for the DeepSeek Harness SDK runtime: the newline-delimited JSON-RPC stdio transport and the named request, result, and notification types spoken between the r | 被依赖的库 | `packages/sdk/protocol/package.json` |
| `@deepseek-ai/dsh-sdk-jsonrpc-server` | `packages/sdk/server` | Consumer | sdk-app+sdk-minimal | Stdio JSON-RPC server plugin for out-of-process DeepSeek Harness SDK clients | sdk 面 | `packages/sdk/server/package.json` |

### api/（9）

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-api-account-controller` | `packages/api/account-controller` | library | web-app | Expose safe account operations over authenticated Remote | web overlay | `packages/api/account-controller/package.json` |
| `@deepseek-ai/dsh-api-gateway` | `packages/api/gateway` | Definition | base | Typert Remote Host dispatcher and Client API endpoint | host 面登记 ctx 键 | `packages/api/gateway/package.json` |
| `@deepseek-ai/dsh-api-job-controller` | `packages/api/job-controller` | Provider | web-app | Job Remote observation stream and the reference-counted client job-output service | web overlay | `packages/api/job-controller/package.json` |
| `@deepseek-ai/dsh-api-remotes` | `packages/api/remotes` | Consumer | web-app | Remote BFF assembly for application-selected Host capabilities | web overlay | `packages/api/remotes/package.json` |
| `@deepseek-ai/dsh-api-session-controller` | `packages/api/session-controller` | Provider | web-app | Session Remote commands, cold reads, and live control transport | web overlay | `packages/api/session-controller/package.json` |
| `@deepseek-ai/dsh-api-settings-controller` | `packages/api/settings-controller` | Provider | web-app | Remote owner for the configuration surfaces over the settings-domain seams | web overlay | `packages/api/settings-controller/package.json` |
| `@deepseek-ai/dsh-api-terminal-controller` | `packages/api/terminal-controller` | Provider | web-app | Session-owned interactive terminals with shell discovery, screen recovery and typed Remote control | web overlay | `packages/api/terminal-controller/package.json` |
| `@deepseek-ai/dsh-api-workspace-controller` | `packages/api/workspace-controller` | Provider | web-app | Workspace Remote commands and reconnect-safe state transport | web overlay | `packages/api/workspace-controller/package.json` |
| `@deepseek-ai/dsh-api-workspace-files` | `packages/api/workspace-files` | Provider | web-app | Workspace file service and Client resource provider: bounded reads, directory listing, and live metadata over the workspaceFiles Remote namespace | web overlay | `packages/api/workspace-files/package.json` |

### host/（9）

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-host-directory-picker` | `packages/host/directory-picker` | Definition | 仓库有但不 shipped | Abstract workspace-directory picking seam (ctx.directoryPicker) for the DeepSeek Harness web GUI host | 仓库有、yml 未点名 | `packages/host/directory-picker/package.json` |
| `@deepseek-ai/dsh-host-directory-picker-auto` | `packages/host/directory-picker-auto` | Consumer | web-app | Adaptive chooser of the directory-picker seam: resolves the host situation at boot and mounts the native or browse backend for the DeepSeek Harness web GUI host | web overlay | `packages/host/directory-picker-auto/package.json` |
| `@deepseek-ai/dsh-host-directory-picker-browse` | `packages/host/directory-picker-browse` | Provider | 仓库有但不 shipped | In-app browsing backend of the directory-picker seam (listing/creation primitives over the host filesystem) | 仓库有、yml 未点名 | `packages/host/directory-picker-browse/package.json` |
| `@deepseek-ai/dsh-host-directory-picker-native` | `packages/host/directory-picker-native` | Consumer | 仓库有但不 shipped | Native-OS-chooser backend of the directory-picker seam for the DeepSeek Harness web GUI host | 仓库有、yml 未点名 | `packages/host/directory-picker-native/package.json` |
| `@deepseek-ai/dsh-host-frontend-static` | `packages/host/frontend-static` | Consumer | 仓库有但不 shipped | SPA dist server for the Web shell: owns the webserver fallback seat, serving explicit index entries and static assets with traversal rejection and 404 misses | 仓库有、yml 未点名 | `packages/host/frontend-static/package.json` |
| `@deepseek-ai/dsh-host-open-in-app` | `packages/host/open-in-app` | Consumer | web-app | Host half of open-in-app: resolved application catalog, icons, and the launch endpoint as three webServer routes | web overlay | `packages/host/open-in-app/package.json` |
| `@deepseek-ai/dsh-host-plugin-inventory` | `packages/host/plugin-inventory` | library | web-app | Read-only Remote projection of current Cordis Loader plugin state | web overlay | `packages/host/plugin-inventory/package.json` |
| `@deepseek-ai/dsh-host-product-telemetry-otel` | `packages/host/product-telemetry-otel` | Provider | 仓库有但不 shipped | Explicit product usage events exported through OpenTelemetry HTTP logs | 仓库有、yml 未点名 | `packages/host/product-telemetry-otel/package.json` |
| `@deepseek-ai/dsh-host-webserver` | `packages/host/webserver` | Provider | web-app | Web route-registration plugin: HTTP and upgrade routes, index transform taps, and static dist fallback; knows no harness concepts | web overlay | `packages/host/webserver/package.json` |

### client/（61）

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-client-connection` | `packages/client/connection` | Provider | web-app | Authenticated RPC transport and generation lifecycle | web overlay | `packages/client/connection/package.json` |
| `@deepseek-ai/dsh-client-file-upload` | `packages/client/file-upload` | Provider | web-app | Agent-scoped browser file upload, streaming intake, and staged receipt service | web overlay | `packages/client/file-upload/package.json` |
| `@deepseek-ai/dsh-client-hmr` | `packages/client/hmr` | Consumer | web-app | Web client graph synchronization and rebuilt-bundle reload transport | web overlay | `packages/client/hmr/package.json` |
| `@deepseek-ai/dsh-client-locale` | `packages/client/locale` | Consumer | web-app | Locale plugin: Host-backed preference, extensible language catalog, browser fallback, and typed built-in dictionaries | web overlay | `packages/client/locale/package.json` |
| `@deepseek-ai/dsh-client-modules` | `packages/client/modules` | Provider | web-app | Client module system, dual-face: node half composes the __DSH_BOOT__ entry graph (incremental dsh.client scan, bundle route, index tap, webPlugins service); browser half is the laz | web overlay | `packages/client/modules/package.json` |
| `@deepseek-ai/dsh-client-resources` | `packages/client/resources` | Consumer | web-app | Unified client resource model: protocol-registered providers turn URL addresses into live values, consumed through the useResource global standard hook | web overlay | `packages/client/resources/package.json` |
| `@deepseek-ai/dsh-client-shortcuts` | `packages/client/shortcuts` | Provider | web-app | Application keyboard command registry and physical-key routing | web overlay | `packages/client/shortcuts/package.json` |
| `@deepseek-ai/dsh-client-store` | `packages/client/store` | library | 仓库有但不 shipped | React-free observable and snapshot-store contracts with the shared Zustand/Immer engine | 被依赖的库 | `packages/client/store/package.json` |
| `@deepseek-ai/dsh-client-ui-agent-preset` | `packages/client/ui-agent-preset` | Consumer | web-app | Agent-preset surfaces: the default for later sessions, this session's seat, and the composition editor | web overlay | `packages/client/ui-agent-preset/package.json` |
| `@deepseek-ai/dsh-client-ui-approval` | `packages/client/ui-approval` | Consumer | web-app | Approval composer takeover over the scoped Remote Event waterfall | web overlay | `packages/client/ui-approval/package.json` |
| `@deepseek-ai/dsh-client-ui-attachment` | `packages/client/ui-attachment` | Consumer | web-app | Dynamic attachment presentation plugin for conversation input, message-image, and trajectory image slots | web overlay | `packages/client/ui-attachment/package.json` |
| `@deepseek-ai/dsh-client-ui-brand-official` | `packages/client/ui-brand-official` | Consumer | web-app | Official DeepSeek Harness brand occupants for the Web client's sidebar slots | web overlay | `packages/client/ui-brand-official/package.json` |
| `@deepseek-ai/dsh-client-ui-chat` | `packages/client/ui-chat` | Consumer | web-app | Chat Conversation target, node definitions, renderers, and details surface | web overlay | `packages/client/ui-chat/package.json` |
| `@deepseek-ai/dsh-client-ui-commands` | `packages/client/ui-commands` | Provider | web-app | Client command surface: global directory cache, '/' source, three command UI kinds, popupSelect registry | web overlay | `packages/client/ui-commands/package.json` |
| `@deepseek-ai/dsh-client-ui-conversation` | `packages/client/ui-conversation` | Definition | web-app | Target-neutral Conversation assembly, shell, composer, queue, and view navigation | web overlay | `packages/client/ui-conversation/package.json` |
| `@deepseek-ai/dsh-client-ui-deliverables` | `packages/client/ui-deliverables` | Consumer | web-app | Changed-files card with per-file comparison tabs, delivery cards, and clickable final-response file references for Web | web overlay | `packages/client/ui-deliverables/package.json` |
| `@deepseek-ai/dsh-client-ui-directory-picker-browse` | `packages/client/ui-directory-picker-browse` | Consumer | 仓库有但不 shipped | In-app directory browsing surface: the workspace directory-flow owner rendering the host's listing and creation primitives | 仓库有、yml 未点名 | `packages/client/ui-directory-picker-browse/package.json` |
| `@deepseek-ai/dsh-client-ui-directory-picker-native` | `packages/client/ui-directory-picker-native` | Consumer | 仓库有但不 shipped | Native directory-picker surface: the renderless workspace directory-flow occupant driving the local Desktop or Host OS chooser | 仓库有、yml 未点名 | `packages/client/ui-directory-picker-native/package.json` |
| `@deepseek-ai/dsh-client-ui-dockkit` | `packages/client/ui-dockkit` | Consumer | 仓库有但不 shipped | Docking layout kit: split-tree engine with invertible operations, and the React components that render and drive it (zero cordis) | 仓库有、yml 未点名 | `packages/client/ui-dockkit/package.json` |
| `@deepseek-ai/dsh-client-ui-goal` | `packages/client/ui-goal` | Consumer | web-app | Session goal surface: GoalBar docked over the composer, read from the goal session projection | web overlay | `packages/client/ui-goal/package.json` |
| `@deepseek-ai/dsh-client-ui-input-trigger` | `packages/client/ui-input-trigger` | Provider | web-app | Input trigger pipeline: '/' and '@' detection, candidate menu, pick routing to registered sources | web overlay | `packages/client/ui-input-trigger/package.json` |
| `@deepseek-ai/dsh-client-ui-jobs` | `packages/client/ui-jobs` | Consumer | web-app | Session-header background-job list with on-demand streaming record panels | web overlay | `packages/client/ui-jobs/package.json` |
| `@deepseek-ai/dsh-client-ui-layout` | `packages/client/ui-layout` | Consumer | web-app | Shell plugin: three-column AppFrame with drag handles, ctx.layout viewing-state service (navigation + panels) | web overlay | `packages/client/ui-layout/package.json` |
| `@deepseek-ai/dsh-client-ui-message-feedback` | `packages/client/ui-message-feedback` | Consumer | web-app | The Web feedback surface: per-message Like/Dislike in the assistant-message action strip and the feedback dialog behind both ratings and /feedback, backed by the messageFeedback an | web overlay | `packages/client/ui-message-feedback/package.json` |
| `@deepseek-ai/dsh-client-ui-model-selection` | `packages/client/ui-model-selection` | Provider | web-app | Model selection over the shared model catalog, Session projection, and session.selectModel | web overlay | `packages/client/ui-model-selection/package.json` |
| `@deepseek-ai/dsh-client-ui-open-in-app` | `packages/client/ui-open-in-app` | Consumer | web-app | Web "Open In..." controls: the Session-header split button opening the workspace directory in an installed application, and the document preview's default-application controls for  | web overlay | `packages/client/ui-open-in-app/package.json` |
| `@deepseek-ai/dsh-client-ui-permission-presets` | `packages/client/ui-permission-presets` | Consumer | web-app | Permission surfaces: a new-session default in General settings and a current-session /permission popup over the permissions projection | web overlay | `packages/client/ui-permission-presets/package.json` |
| `@deepseek-ai/dsh-client-ui-plan` | `packages/client/ui-plan` | Consumer | web-app | Plan mode controls, persistent transcript plan cards, and sidebar Markdown previews | web overlay | `packages/client/ui-plan/package.json` |
| `@deepseek-ai/dsh-client-ui-plugin-manager` | `packages/client/ui-plugin-manager` | Provider | web-app | Plugin management for the dsh web client: the sidebar Plugins panel installs, enables, disables, retries, and composes installed plugin packages | web overlay | `packages/client/ui-plugin-manager/package.json` |
| `@deepseek-ai/dsh-client-ui-primitives` | `packages/client/ui-primitives` | Consumer | 仓库有但不 shipped | Pure React atoms for the dsh web UI: controls, icons, markdown, and JSON inspectors (zero cordis) | 仓库有、yml 未点名 | `packages/client/ui-primitives/package.json` |
| `@deepseek-ai/dsh-client-ui-reference` | `packages/client/ui-reference` | Consumer | web-app | Unified Web @file and @session reference source | web overlay | `packages/client/ui-reference/package.json` |
| `@deepseek-ai/dsh-client-ui-renderer` | `packages/client/ui-renderer` | Provider | web-app | Browser UI renderer: React slot bindings, ctx.uiRenderer, and the assembled application root | web overlay | `packages/client/ui-renderer/package.json` |
| `@deepseek-ai/dsh-client-ui-schedule` | `packages/client/ui-schedule` | Consumer | web-app | Host task management page and Session reminder catalog | web overlay | `packages/client/ui-schedule/package.json` |
| `@deepseek-ai/dsh-client-ui-session` | `packages/client/ui-session` | Provider | web-app | Session Controller adapter for React and session-scoped slots | web overlay | `packages/client/ui-session/package.json` |
| `@deepseek-ai/dsh-client-ui-settings` | `packages/client/ui-settings` | Provider | web-app | Settings domain base plugin: shared configuration forms and the canonical settings slot-type contract | web overlay | `packages/client/ui-settings/package.json` |
| `@deepseek-ai/dsh-client-ui-settings-account` | `packages/client/ui-settings-account` | Consumer | web-app | Manage DeepSeek login and open Platform billing pages | web overlay | `packages/client/ui-settings-account/package.json` |
| `@deepseek-ai/dsh-client-ui-settings-agent-loop` | `packages/client/ui-settings-agent-loop` | Consumer | web-app | Settings page of the agent loop on the dsh web client's Plugins page: the parallel tool-call cap of the agent-loop namespace | web overlay | `packages/client/ui-settings-agent-loop/package.json` |
| `@deepseek-ai/dsh-client-ui-settings-general` | `packages/client/ui-settings-general` | Consumer | web-app | Settings ownerless-copy and product onboarding plugin: the General section, shell trigger/header chrome content, settings dictionaries, and the versioned welcome notice | web overlay | `packages/client/ui-settings-general/package.json` |
| `@deepseek-ai/dsh-client-ui-settings-models` | `packages/client/ui-settings-models` | Consumer | web-app | Models settings and shared product-onboarding dialogs over existing settings and credential joins | web overlay | `packages/client/ui-settings-models/package.json` |
| `@deepseek-ai/dsh-client-ui-settings-plugin-inventory` | `packages/client/ui-settings-plugin-inventory` | Consumer | web-app | Read-only Cordis Loader inventory tab in Web Plugins settings | web overlay | `packages/client/ui-settings-plugin-inventory/package.json` |
| `@deepseek-ai/dsh-client-ui-settings-plugins` | `packages/client/ui-settings-plugins` | Consumer | web-app | Built-in plugins settings section for the dsh web client: the Settings navigation entry and the tab chrome feature-owned tabs register into | web overlay | `packages/client/ui-settings-plugins/package.json` |
| `@deepseek-ai/dsh-client-ui-settings-shell` | `packages/client/ui-settings-shell` | Consumer | web-app | Settings page of the shell executor on the dsh web client's Plugins page: the command timeout and the per-stream output cap of the shell namespace | web overlay | `packages/client/ui-settings-shell/package.json` |
| `@deepseek-ai/dsh-client-ui-settings-subagent` | `packages/client/ui-settings-subagent` | Consumer | web-app | Settings page of Subagent delegation on the dsh web client's Plugins page: recursion depth, parallel capacity, and the models agents may choose for subagents | web overlay | `packages/client/ui-settings-subagent/package.json` |
| `@deepseek-ai/dsh-client-ui-settings-web-search` | `packages/client/ui-settings-web-search` | Consumer | web-app | Settings page of the DeepSeek web-search provider on the dsh web client's Plugins page: its API key, endpoint, and per-request search budget | web overlay | `packages/client/ui-settings-web-search/package.json` |
| `@deepseek-ai/dsh-client-ui-shortcuts` | `packages/client/ui-shortcuts` | Consumer | web-app | Keyboard shortcut reference, recording, and local preference editing | web overlay | `packages/client/ui-shortcuts/package.json` |
| `@deepseek-ai/dsh-client-ui-sidebar` | `packages/client/ui-sidebar` | Consumer | web-app | Sidebar plugin: session multi-level tree, search, grouping, state dots | web overlay | `packages/client/ui-sidebar/package.json` |
| `@deepseek-ai/dsh-client-ui-sidebar-browser` | `packages/client/ui-sidebar-browser` | Consumer | web-app | Sandboxed Web browser tabs for the right Sidebar | web overlay | `packages/client/ui-sidebar-browser/package.json` |
| `@deepseek-ai/dsh-client-ui-sidebar-documentpreview` | `packages/client/ui-sidebar-documentpreview` | Consumer | web-app | Extensible Sidebar previews for Office documents, spreadsheets, Markdown, code, images, PDF, HTML, and plain text | web overlay | `packages/client/ui-sidebar-documentpreview/package.json` |
| `@deepseek-ai/dsh-client-ui-sidebar-files` | `packages/client/ui-sidebar-files` | Consumer | web-app | Workspace file tree tab type for the right Sidebar: lazy directory listing over the workspaceFiles Remote namespace, opening files into the Sidebar | web overlay | `packages/client/ui-sidebar-files/package.json` |
| `@deepseek-ai/dsh-client-ui-sidebar-right` | `packages/client/ui-sidebar-right` | Consumer | web-app | Right Sidebar: the docking surface's session-bound state, its panel and header expand control, and the navigation service over it | web overlay | `packages/client/ui-sidebar-right/package.json` |
| `@deepseek-ai/dsh-client-ui-sidebar-terminal` | `packages/client/ui-sidebar-terminal` | Consumer | web-app | Interactive shell tabs for the right Sidebar | web overlay | `packages/client/ui-sidebar-terminal/package.json` |
| `@deepseek-ai/dsh-client-ui-skill` | `packages/client/ui-skill` | Consumer | web-app | Web skill references and the dedicated skill tool row | web overlay | `packages/client/ui-skill/package.json` |
| `@deepseek-ai/dsh-client-ui-slots` | `packages/client/ui-slots` | library | 仓库有但不 shipped | Slot registry pure core: typed ordinary Slots and reusable Component Factories, derived props, Store seats, and renderer installation | 被依赖的库 | `packages/client/ui-slots/package.json` |
| `@deepseek-ai/dsh-client-ui-subagent` | `packages/client/ui-subagent` | Consumer | web-app | Subagent conversation catalog, continuation routing UI, and '@' reference source | web overlay | `packages/client/ui-subagent/package.json` |
| `@deepseek-ai/dsh-client-ui-theme` | `packages/client/ui-theme` | Consumer | web-app | Theme plugin: Host bootstrap for the pre-plugin palette; DOM-free ThemeRuntime for light/dark/system state; --dsw-* token styles and Appearance settings row | web overlay | `packages/client/ui-theme/package.json` |
| `@deepseek-ai/dsh-client-ui-tool` | `packages/client/ui-tool` | Consumer | web-app | Client Tool call-tree renderer and keyed per-tool presentation slot | web overlay | `packages/client/ui-tool/package.json` |
| `@deepseek-ai/dsh-client-ui-trajectory` | `packages/client/ui-trajectory` | Consumer | web-app | Trajectory event ledger with an interactive timing overview: pure-consumer plugin registering into the conversation ViewMap (no service) | web overlay | `packages/client/ui-trajectory/package.json` |
| `@deepseek-ai/dsh-client-ui-user-questions` | `packages/client/ui-user-questions` | Consumer | web-app | Web ask_user_question composer takeover and plan-review presentation UI | web overlay | `packages/client/ui-user-questions/package.json` |
| `@deepseek-ai/dsh-client-ui-workflow-run` | `packages/client/ui-workflow-run` | Consumer | web-app | Durable workflow-run Conversation Node and nested member disclosure for dsh web | web overlay | `packages/client/ui-workflow-run/package.json` |
| `@deepseek-ai/dsh-client-ui-workspace` | `packages/client/ui-workspace` | Provider | web-app | Workspace picker plugin: one WorkspacePicker registered into the sidebar and empty-state workspace slots | web overlay | `packages/client/ui-workspace/package.json` |
| `@deepseek-ai/dsh-client-web` | `packages/client/web` | Consumer | 仓库有但不 shipped | Web boot kernel: static module table, Cordis loader, framework-free boot page, and UI-renderer handoff | 仓库有、yml 未点名 | `packages/client/web/package.json` |

### extensions/（4）

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-cordis-client-runner` | `packages/extensions/cordis-client-runner` | Provider | web-app | Browser half of dynamic dual-half plugin packages: event subscription, closure evaluation, guard facade, and loader entries | web overlay | `packages/extensions/cordis-client-runner/package.json` |
| `@deepseek-ai/dsh-cordis-host-runner` | `packages/extensions/cordis-host-runner` | Consumer | web-app | Dynamic package definition registry, host-half sandbox lifecycle, and invoke handler table for model-mounted dual-half packages | web overlay | `packages/extensions/cordis-host-runner/package.json` |
| `@deepseek-ai/dsh-tool-cordis` | `packages/extensions/tool-cordis` | Consumer | web-app | Read-only runtime API inspection for Harness plugin development | web overlay | `packages/extensions/tool-cordis/package.json` |
| `@deepseek-ai/dsh-client-ui-cordis` | `packages/extensions/ui-cordis` | Consumer | web-app | Cordis dynamic-plugin definition card: the keyed cordis_define tool row with its run/stop switch | web overlay | `packages/extensions/ui-cordis/package.json` |

### experimental/（20）

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-experimental-agent-team` | `packages/experimental/agent-team` | Provider | 仓库有但不 shipped | Implicit-root Agent Teams roster, durable peer mailbox, and shared task DAG | 仓库有、yml 未点名 | `packages/experimental/agent-team/package.json` |
| `@deepseek-ai/dsh-experimental-agent-team-profile` | `packages/experimental/agent-team-profile` | library | optional-bundle | Agent Teams collaboration, tools, and Web UI in one experimental bundle | OPTIONAL_BUNDLES，默认关 | `packages/experimental/agent-team-profile/package.json` |
| `@deepseek-ai/dsh-experimental-api-speech-to-text` | `packages/experimental/api-speech-to-text` | Provider | 仓库有但不 shipped | Authenticated experimental speech transcription for browser clients | 仓库有、yml 未点名 | `packages/experimental/api-speech-to-text/package.json` |
| `@deepseek-ai/dsh-experimental-auto-review` | `packages/experimental/auto-review` | Consumer | optional-bundle | Per-tool LLM authorization review for the DeepSeek Harness Auto permission preset | OPTIONAL_BUNDLES，默认关 | `packages/experimental/auto-review/package.json` |
| `@deepseek-ai/dsh-experimental-browser-use-chrome-devtools-mcp` | `packages/experimental/browser-use-chrome-devtools-mcp` | Consumer | 仓库有但不 shipped | Experimental per-Session Chromium browser tools through chrome-devtools-mcp | 仓库有、yml 未点名 | `packages/experimental/browser-use-chrome-devtools-mcp/package.json` |
| `@deepseek-ai/dsh-experimental-browser-use-playwright-mcp` | `packages/experimental/browser-use-playwright-mcp` | Consumer | 仓库有但不 shipped | Experimental per-Session Chromium browser tools through @playwright/mcp | 仓库有、yml 未点名 | `packages/experimental/browser-use-playwright-mcp/package.json` |
| `@deepseek-ai/dsh-experimental-browser-use-runtime` | `packages/experimental/browser-use-runtime` | library | 仓库有但不 shipped | Session-owned browser resource lifecycles and MCP integration for experimental providers | 被依赖的库 | `packages/experimental/browser-use-runtime/package.json` |
| `@deepseek-ai/dsh-experimental-browser-use-stagehand-native` | `packages/experimental/browser-use-stagehand-native` | Consumer | 仓库有但不 shipped | Experimental Stagehand browser tools with separately configured native models | 仓库有、yml 未点名 | `packages/experimental/browser-use-stagehand-native/package.json` |
| `@deepseek-ai/dsh-experimental-client-ui-agent-team` | `packages/experimental/client-ui-agent-team` | Consumer | 仓库有但不 shipped | Web Agent Teams roster, task board, and teammate navigation | 仓库有、yml 未点名 | `packages/experimental/client-ui-agent-team/package.json` |
| `@deepseek-ai/dsh-experimental-client-ui-voice-input` | `packages/experimental/client-ui-voice-input` | Consumer | 仓库有但不 shipped | Record speech and insert editable text into the conversation draft | 仓库有、yml 未点名 | `packages/experimental/client-ui-voice-input/package.json` |
| `@deepseek-ai/dsh-experimental-computer-use-cua-driver-mcp` | `packages/experimental/computer-use-cua-driver-mcp` | Consumer | 仓库有但不 shipped | Experimental computer use through an installed Cua Driver MCP executable | 仓库有、yml 未点名 | `packages/experimental/computer-use-cua-driver-mcp/package.json` |
| `@deepseek-ai/dsh-experimental-computer-use-cua-driver-native` | `packages/experimental/computer-use-cua-driver-native` | Consumer | 仓库有但不 shipped | Experimental computer-use provider embedding the Cua Driver native npm SDK | 仓库有、yml 未点名 | `packages/experimental/computer-use-cua-driver-native/package.json` |
| `@deepseek-ai/dsh-experimental-inspector` | `packages/experimental/inspector` | Definition | 仓库有但不 shipped | Experimental cross-realm CDP hub for Host debugging and Client Runtime inspection | 仓库有、yml 未点名 | `packages/experimental/inspector/package.json` |
| `@deepseek-ai/dsh-experimental-ptc-runtime-python` | `packages/experimental/ptc-runtime-python` | library | 仓库有但不 shipped | CPython subprocess implementation of the DeepSeek Harness PTC execution seam | 被依赖的库 | `packages/experimental/ptc-runtime-python/package.json` |
| `@deepseek-ai/dsh-experimental-speech-to-text` | `packages/experimental/speech-to-text` | Provider | 仓库有但不 shipped | Experimental speech recognition with independently selectable providers | 仓库有、yml 未点名 | `packages/experimental/speech-to-text/package.json` |
| `@deepseek-ai/dsh-experimental-speech-to-text-sensevoice` | `packages/experimental/speech-to-text-sensevoice` | Consumer | 仓库有但不 shipped | Local SenseVoice ONNX transcription with a managed sherpa-onnx process | 仓库有、yml 未点名 | `packages/experimental/speech-to-text-sensevoice/package.json` |
| `@deepseek-ai/dsh-experimental-tool-agent-team` | `packages/experimental/tool-agent-team` | Consumer | 仓库有但不 shipped | Scoped model-facing Agent Teams tools over ctx.agentTeams | 仓库有、yml 未点名 | `packages/experimental/tool-agent-team/package.json` |
| `@deepseek-ai/dsh-experimental-voice-input-bundle` | `packages/experimental/voice-input-bundle` | library | optional-bundle | Experimental voice input with local SenseVoice; downloads its runtime on first use | OPTIONAL_BUNDLES，默认关 | `packages/experimental/voice-input-bundle/package.json` |
| `@deepseek-ai/dsh-experimental-webworker-packer` | `packages/experimental/webworker-packer` | library | 仓库有但不 shipped | Build-time packer for the browser runtime's base VFS image and ordered data-overlay archives | 被依赖的库 | `packages/experimental/webworker-packer/package.json` |
| `@deepseek-ai/dsh-experimental-webworker-runtime` | `packages/experimental/webworker-runtime` | Consumer | 仓库有但不 shipped | Browser-only harness runtime: in-memory VFS, module transform and loader, postMessage tunnel, and the dedicated Web Worker assembly, with the Node-compatibility layer that lets the | 仓库有、yml 未点名 | `packages/experimental/webworker-runtime/package.json` |

### browser-use/（1）

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-browser-use` | `packages/browser-use/browser-use` | Provider | 仓库有但不 shipped | Exclusive named browser-use provider registration | 仓库有、yml 未点名 | `packages/browser-use/browser-use/package.json` |

### computer-use/（1）

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-computer-use` | `packages/computer-use/computer-use` | Provider | 仓库有但不 shipped | Exclusive named computer-use provider registration | 仓库有、yml 未点名 | `packages/computer-use/computer-use/package.json` |

### document/（1）

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-office-to-pdf` | `packages/document/office-to-pdf` | Provider | web-app | Shared Office-to-PDF conversion with bounded queues and caching | web overlay | `packages/document/office-to-pdf/package.json` |

### feedback/（2）

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-command-feedback` | `packages/feedback/command-feedback` | Provider | base | Log-only session feedback: the record event, the sessionFeedback Host Remote, and the human-facing slash command | host 面默认后端 | `packages/feedback/command-feedback/package.json` |
| `@deepseek-ai/dsh-message-feedback` | `packages/feedback/message-feedback` | Provider | web-app | Canonical Session-log ratings and notes for finalized assistant messages | web overlay | `packages/feedback/message-feedback/package.json` |

### guard/（2）

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-repeat-tool-reminder` | `packages/guard/repeat-tool-reminder` | Consumer | base | Repeat-tool-call guard plugin: advisory reminders when an agent loops on identical tool calls | host 面 | `packages/guard/repeat-tool-reminder/package.json` |
| `@deepseek-ai/dsh-tool-call-timeout-policy` | `packages/guard/timeout-policy` | Consumer | base | Tool-call timeout policy: a tools/execute wrapper that arms a per-tool deadline on exec.signal and returns TOOL_TIMEOUT when it wins | host 面 | `packages/guard/timeout-policy/package.json` |

### hooks/（3）

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-hook-protocol` | `packages/hooks/hook-protocol` | library | 仓库有但不 shipped | Shared Claude Code / Codex hook wire protocol: matcher engine, stdin/exit-code/stdout codec, multi-hook merge, and hook/* session events | 被依赖的库 | `packages/hooks/hook-protocol/package.json` |
| `@deepseek-ai/dsh-hooks-claude-code` | `packages/hooks/hooks-claude-code` | Consumer | 仓库有但不 shipped | Bridge plugin: run a Claude Code hooks.json / settings hook config on the DeepSeek Harness interception seams | 仓库有、yml 未点名 | `packages/hooks/hooks-claude-code/package.json` |
| `@deepseek-ai/dsh-hooks-codex` | `packages/hooks/hooks-codex` | Consumer | 仓库有但不 shipped | Bridge plugin: run a Codex hooks.json hook config on the DeepSeek Harness interception seams | 仓库有、yml 未点名 | `packages/hooks/hooks-codex/package.json` |

### identity/（1）

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-anonymous-user-id` | `packages/identity/anonymous-user-id` | library | 仓库有但不 shipped | Shared anonymous user identity for DeepSeek Harness telemetry and feedback correlation | 被依赖的库 | `packages/identity/anonymous-user-id/package.json` |

### runtime-diagnostics/（1）

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-invariants` | `packages/runtime-diagnostics/invariants` | Provider | sdk-minimal | Registry service for package-owned DeepSeek Harness runtime invariants | sdk-minimal 独立 insert | `packages/runtime-diagnostics/invariants/package.json` |

### typert/（4）

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-typert-generator` | `packages/typert/generator` | library | 仓库有但不 shipped | TypeScript project analyzer and model-driven Typert artifact generator | 被依赖的库 | `packages/typert/generator/package.json` |
| `@deepseek-ai/dsh-typert-loader` | `packages/typert/loader` | Consumer | base | Loader integration for generated Typert package contributions | host 面 | `packages/typert/loader/package.json` |
| `@deepseek-ai/dsh-typert-protocol` | `packages/typert/protocol` | Definition | 仓库有但不 shipped | Compiler-independent Remote metadata and Typert provider protocols | 仓库有、yml 未点名 | `packages/typert/protocol/package.json` |
| `@deepseek-ai/dsh-typert-registry` | `packages/typert/registry` | Provider | base | Runtime registry for generated package reflection and Zod schemas | host 面默认后端 | `packages/typert/registry/package.json` |

### util/（17）

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-atomic-write` | `packages/util/atomic-write` | library | 仓库有但不 shipped | Zero-dependency atomic file replacement: exclusive-create random-suffix temp + rename carrying the caller-stated permissions (writeFileAtomic) | 被依赖的库 | `packages/util/atomic-write/package.json` |
| `@deepseek-ai/dsh-brand` | `packages/util/brand` | library | 仓库有但不 shipped | Stateless branded primitive types for the DeepSeek Harness | 被依赖的库 | `packages/util/brand/package.json` |
| `@deepseek-ai/dsh-chunked-list` | `packages/util/chunked-list` | library | 仓库有但不 shipped | Persistent append-only chunked lists with bounded copying and JSON checkpoint validation | 被依赖的库 | `packages/util/chunked-list/package.json` |
| `@deepseek-ai/dsh-util-code-language` | `packages/util/code-language` | library | 仓库有但不 shipped | Single file-extension to syntax-highlighting language table shared by Client code surfaces and the Host read card | 被依赖的库 | `packages/util/code-language/package.json` |
| `@deepseek-ai/dsh-util-crypto` | `packages/util/crypto` | library | 仓库有但不 shipped | Zero-dependency browser-safe UUID and byte-encoding helpers | 被依赖的库 | `packages/util/crypto/package.json` |
| `@deepseek-ai/dsh-deque` | `packages/util/deque` | library | 仓库有但不 shipped | Zero-dependency circular deque with amortized constant-time end operations and bounded vacant storage | 被依赖的库 | `packages/util/deque/package.json` |
| `@deepseek-ai/dsh-home-paths` | `packages/util/home-paths` | library | 仓库有但不 shipped | Shared filesystem path helpers for the DeepSeek Harness | 被依赖的库 | `packages/util/home-paths/package.json` |
| `@deepseek-ai/dsh-http-proxy` | `packages/util/http-proxy` | library | 仓库有但不 shipped | Process-wide outbound HTTP proxy policy for DeepSeek Harness: resolve it from the launch environment and install it as undici's global dispatcher | 被依赖的库 | `packages/util/http-proxy/package.json` |
| `@deepseek-ai/dsh-launch-environment` | `packages/util/launch-environment` | library | 仓库有但不 shipped | Immutable DeepSeek Harness launch environment that records which layer supplied each value | 被依赖的库 | `packages/util/launch-environment/package.json` |
| `@deepseek-ai/dsh-lazy-require` | `packages/util/lazy-require` | library | 仓库有但不 shipped | Caller-relative, success-cached lazy loading for CommonJS-compatible Host dependencies | 被依赖的库 | `packages/util/lazy-require/package.json` |
| `@deepseek-ai/dsh-native-command` | `packages/util/native-command` | library | 仓库有但不 shipped | Host-native command and path-opening utilities with shell-free execution, cancellation, desktop detection, and WSL handoff | 被依赖的库 | `packages/util/native-command/package.json` |
| `@deepseek-ai/dsh-output-retention` | `packages/util/output-retention` | library | 仓库有但不 shipped | Zero-dependency bounded-retention primitive: ItemRetainer/TextRetainer + neutral notice helpers (what did we keep, what did we omit) | 被依赖的库 | `packages/util/output-retention/package.json` |
| `@deepseek-ai/dsh-package-manifest` | `packages/util/package-manifest` | library | 仓库有但不 shipped | Shared type declarations for package.json.dsh configuration fields | 被依赖的库 | `packages/util/package-manifest/package.json` |
| `@deepseek-ai/dsh-util-time` | `packages/util/time` | library | 仓库有但不 shipped | Zero-dependency time vocabulary shared by wire boundaries: canonicalClientTimeZone (IANA zone validation and canonicalization only, no formatting) | 被依赖的库 | `packages/util/time/package.json` |
| `@deepseek-ai/dsh-timeout` | `packages/util/timeout` | library | 仓库有但不 shipped | Zero-dependency timeout/deadline primitive: clampTimeout, deadline, timeoutOf, TimeoutReason (timing + classification only, no termination) | 被依赖的库 | `packages/util/timeout/package.json` |
| `@deepseek-ai/dsh-util-values` | `packages/util/values` | library | 仓库有但不 shipped | Duplicate-install-safe value primitives for the DeepSeek Harness | 被依赖的库 | `packages/util/values/package.json` |
| `@deepseek-ai/dsh-util-workspace-path` | `packages/util/workspace-path` | library | 仓库有但不 shipped | Browser-safe Workspace path and display helpers | 被依赖的库 | `packages/util/workspace-path/package.json` |

### test-support/（7）

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-agent-loop-testkit` | `packages/test-support/agent-loop-testkit` | library | 仓库有但不 shipped | Prerequisite mounting, production AgentLoop drivers, and Inbox stubs for tests | 被依赖的库 | `packages/test-support/agent-loop-testkit/package.json` |
| `@deepseek-ai/dsh-client-test-runtime` | `packages/test-support/client-runtime` | library | 仓库有但不 shipped | Browser test runtimes: a jsdom slot bench with test-owned Session and Workspace doubles, and a whole-client tier that boots the web roster through the production bootClient over an | 被依赖的库 | `packages/test-support/client-runtime/package.json` |
| `@deepseek-ai/dsh-llm-mock-server` | `packages/test-support/llm-mock-server` | library | 仓库有但不 shipped | Scriptable Messages HTTP/SSE fault server for LLM recovery tests | 被依赖的库 | `packages/test-support/llm-mock-server/package.json` |
| `@deepseek-ai/dsh-llm-replay` | `packages/test-support/llm-replay` | Consumer | 仓库有但不 shipped | Replay LLM plugin: short-circuits llm/stream with model chunks reconstructed from a recorded session JSONL (keyless snapshot tests) | 仓库有、yml 未点名 | `packages/test-support/llm-replay/package.json` |
| `@deepseek-ai/dsh-loader-smoke` | `packages/test-support/loader-smoke` | library | 仓库有但不 shipped | Shared subprocess and direct-agent harness for keyless real-Loader example smoke tests | 被依赖的库 | `packages/test-support/loader-smoke/package.json` |
| `@deepseek-ai/dsh-remote-mock` | `packages/test-support/remote-mock` | library | 仓库有但不 shipped | Endpoint-named mock for Typert Remote traffic: unary answers and stream scripts per <namespace>/<method>, live stream control, a log, and the Connection carrier face whole-client s | 被依赖的库 | `packages/test-support/remote-mock/package.json` |
| `@deepseek-ai/dsh-session-snapshot` | `packages/test-support/session-snapshot` | library | 仓库有但不 shipped | Session-log snapshot core with an ACP protocol adapter, expected-output normalization, and fixture invariants | 被依赖的库 | `packages/test-support/session-snapshot/package.json` |

### 非产品叶（7 fixture + 2 skill template）

计入 `packages/**/package.json` 的 321，但不计入产品叶 312。

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@local/my-decoration` | `packages/preset/agent-preset/skills/cordis-plugin-development/templates/decoration` | fixture | 不 shipped | skill template | 测试/模板，不是产品叶 | `packages/preset/agent-preset/skills/cordis-plugin-development/templates/decoration/package.json` |
| `@local/demo-mcp` | `packages/preset/agent-preset/skills/cordis-plugin-development/templates/mcp` | fixture | 不 shipped | skill template | 测试/模板，不是产品叶 | `packages/preset/agent-preset/skills/cordis-plugin-development/templates/mcp/package.json` |
| `@fixture/workspace` | `packages/typert/generator/tests/fixtures/type-model` | fixture | 不 shipped | typert fixture | 测试/模板，不是产品叶 | `packages/typert/generator/tests/fixtures/type-model/package.json` |
| `@fixture/write` | `packages/typert/generator/tests/fixtures/type-model/packages/write` | fixture | 不 shipped | typert fixture | 测试/模板，不是产品叶 | `packages/typert/generator/tests/fixtures/type-model/packages/write/package.json` |
| `@fixture/host` | `packages/typert/generator/tests/fixtures/type-model/packages/host` | fixture | 不 shipped | typert fixture | 测试/模板，不是产品叶 | `packages/typert/generator/tests/fixtures/type-model/packages/host/package.json` |
| `@fixture/client` | `packages/typert/generator/tests/fixtures/type-model/packages/client` | fixture | 不 shipped | typert fixture | 测试/模板，不是产品叶 | `packages/typert/generator/tests/fixtures/type-model/packages/client/package.json` |
| `@fixture/remote-workspace` | `packages/typert/generator/tests/fixtures/remote-model` | fixture | 不 shipped | typert fixture | 测试/模板，不是产品叶 | `packages/typert/generator/tests/fixtures/remote-model/package.json` |
| `@fixture/domain` | `packages/typert/generator/tests/fixtures/remote-model/packages/domain` | fixture | 不 shipped | typert fixture | 测试/模板，不是产品叶 | `packages/typert/generator/tests/fixtures/remote-model/packages/domain/package.json` |
| `@fixture/remote` | `packages/typert/generator/tests/fixtures/remote-model/packages/remote` | fixture | 不 shipped | typert fixture | 测试/模板，不是产品叶 | `packages/typert/generator/tests/fixtures/remote-model/packages/remote/package.json` |

### workspace 入口（不在 `packages/*/*`）

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/cordis` | `vendor/cordis` | vendor | workspace | Meta-Framework for Modern JavaScript Applications | pnpm workspace 成员 | `vendor/cordis/package.json` |
| `@deepseek-ai/cosmokit` | `vendor/cosmokit` | vendor | workspace | A collection of common utilities | pnpm workspace 成员 | `vendor/cosmokit/package.json` |
| `@deepseek-ai/cordis-plugin-group` | `vendor/group` | vendor | workspace | Nested plugin group for cordis | pnpm workspace 成员 | `vendor/group/package.json` |
| `@deepseek-ai/cordis-plugin-hmr` | `vendor/hmr` | vendor | workspace | Hot Module Replacement Plugin for Cordis | pnpm workspace 成员 | `vendor/hmr/package.json` |
| `@deepseek-ai/cordis-plugin-include` | `vendor/include` | vendor | workspace | Include files in cordis configurations | pnpm workspace 成员 | `vendor/include/package.json` |
| `@deepseek-ai/cordis-plugin-loader` | `vendor/loader` | vendor | workspace | Plugin loader for cordis | pnpm workspace 成员 | `vendor/loader/package.json` |
| `@deepseek-ai/cordis-plugin-logger-console` | `vendor/logger-console` | vendor | workspace | Console logger exporter for cordis | pnpm workspace 成员 | `vendor/logger-console/package.json` |
| `@deepseek-ai/schemastery` | `vendor/schemastery` | vendor | workspace | Type driven schema validator | pnpm workspace 成员 | `vendor/schemastery/package.json` |
| `@deepseek-ai/cordis-plugin-timer` | `vendor/timer` | vendor | workspace | Timer service for cordis | pnpm workspace 成员 | `vendor/timer/package.json` |
| `@deepseek-ai/dsh` | `apps/cli` | app | workspace | dsh CLI: profile launch, plugin management, and configuration inspection | pnpm workspace 成员 | `apps/cli/package.json` |
| `@deepseek-ai/dsh-desktop` | `apps/desktop` | app | workspace | Electron desktop shell for a bundled dsh runtime and external plugins | pnpm workspace 成员 | `apps/desktop/package.json` |
| `@deepseek-ai/dsh-desktop-host` | `apps/desktop-host` | app | workspace | Private Node-mode host process for the Electron desktop application | pnpm workspace 成员 | `apps/desktop-host/package.json` |
| `@deepseek-ai/dsh-web-frontend` | `apps/web` | app | workspace | Web application entry: vite build over the @deepseek-ai/dsh-client-web shell library; dist/ served by apps/cli's dsh web | pnpm workspace 成员 | `apps/web/package.json` |
| `@deepseek-ai/website` | `website` | workspace | workspace | — | pnpm workspace 成员 | `website/package.json` |
| `dsh-python-runtime-closure` | `python/sdk-runtime` | workspace | workspace | Dependency-only deploy root defining the dsh executable shipped by the Python runtime wheel. | pnpm workspace 成员 | `python/sdk-runtime/package.json` |
| `@deepseek-ai/node-addon-system-workspace` | `native/system` | workspace | workspace | — | pnpm workspace 成员 | `native/system/package.json` |
| `@deepseek-ai/node-addon-system-darwin-arm64` | `native/system/packages/darwin-arm64` | workspace | workspace | Prebuilt POSIX flock Node-API binding for macOS arm64 | pnpm workspace 成员 | `native/system/packages/darwin-arm64/package.json` |
| `@deepseek-ai/node-addon-system-darwin-x64` | `native/system/packages/darwin-x64` | workspace | workspace | Prebuilt POSIX flock Node-API binding for macOS x64 | pnpm workspace 成员 | `native/system/packages/darwin-x64/package.json` |
| `@deepseek-ai/node-addon-system` | `native/system/packages/entry` | workspace | workspace | Prebuilt system primitives: a Linux Landlock launcher and asynchronous POSIX flock through stable Node-API | pnpm workspace 成员 | `native/system/packages/entry/package.json` |
| `@deepseek-ai/node-addon-system-linux-arm64` | `native/system/packages/linux-arm64` | workspace | workspace | Linux arm64 system binaries: static Landlock launcher and glibc/musl Node-API flock addons | pnpm workspace 成员 | `native/system/packages/linux-arm64/package.json` |
| `@deepseek-ai/node-addon-system-linux-x64` | `native/system/packages/linux-x64` | workspace | workspace | Linux x64 system binaries: static Landlock launcher and glibc/musl Node-API flock addons | pnpm workspace 成员 | `native/system/packages/linux-x64/package.json` |
| `@deepseek-ai/dsh-benchmarks` | `benchmarks` | workspace | workspace | — | pnpm workspace 成员 | `benchmarks/package.json` |

## Sources

- `package.json`
- `pnpm-workspace.yaml`
- `apps/cli/package.json`
- `apps/web/package.json`
- `packages/boot/app-boot/src/profile.ts`
- `packages/bundle/base/package.json`
- `packages/bundle/web-app/package.json`
- `packages/bundle/headless/package.json`
- `packages/bundle/sdk-app/package.json`
- `packages/bundle/sdk-minimal/package.json`
- `packages/bundle/acp-app/package.json`
- `packages/bundle/base/cordis.patch.yml`
- `packages/bundle/web-app/cordis.patch.yml`
- `packages/bundle/headless/cordis.patch.yml`
- `packages/bundle/sdk-app/cordis.patch.yml`
- `packages/bundle/sdk-minimal/cordis.patch.yml`
- `packages/bundle/acp-app/cordis.patch.yml`
- `packages/bundle/web-app/presets/minimal.patch.yml`
- `packages/bundle/web-app/presets/standard.patch.yml`
- `packages/bundle/web-app/presets/ptc.patch.yml`
- `packages/bundle/web-app/presets/cordis.patch.yml`
- `vendor/cordis/package.json`
- `vendor/timer/package.json`
- `python/sdk-runtime/package.json`
- `website/package.json`
- `native/system/package.json`
- `native/system/packages/entry/package.json`
- `apps/desktop/package.json`
- `apps/desktop-host/package.json`

## 相关

- [spine.overview](../spine/overview.md) — 组合主线与产品画像
- [ref.glossary](glossary.md) — profile / bundle / preset / seam 词表
- [spine.composition-boot](../spine/composition-boot.md) — `profile → bundle → preset` 启动
- [ref.presets](presets.md) — 四个 web preset patch 成员对照
- [surface.presets.code](../surface/presets/code.md) — PTC 稳定别名
- [subsys.core.code-mode](../subsystems/core/code-mode.md) — PTC `run_code` 与 `ctx.ptcRuntime`
- [subsys.host.apiproxy](../subsystems/host/apiproxy.md) — 已退役 Host HTTP 代理
- [subsys.client.runtime](../subsystems/client/runtime.md) — 已退役 client runtime
