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
  - packages/preset/agent-presets/src/discovery.ts
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
  - packages/preset/agent-presets/presets/minimal/agent.cordis.yml
  - packages/preset/agent-presets/presets/standard/agent.cordis.yml
  - packages/preset/agent-presets/presets/ptc/agent.cordis.yml
  - packages/preset/agent-presets/presets/cordis/agent.cordis.yml
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
  - SHIPPED_PRESET_ROOT
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
updated: c291e7961a
---

> monorepo 包索引把每个 workspace 包钉成一行：npm name、目录、seam 角色（Definition / Provider / Consumer / bundle / app / library）、以及它是否出现在 shipped composition。DSH 是 **Cordis 组合运行时**，主线 `profile → bundle → agent preset`；有 `package.json` 不等于进了产品树。已删除包 `packages/host/apiproxy`、`packages/client/runtime`、`packages/client/web-react`、`packages/session/session-persistence-sqlite`、`packages/subagent/tool-subagent-report`、`packages/examples/agent-spine-demo`、`packages/code-runtime/code-runtime-python` 不再成行。`packages/**/package.json` 共 **275**（含 typert generator 下 **7** 个 `@fixture/*`）；产品叶 `packages/*/*` **268**。产品版本 `0.1.5-rc.2`。

## 能回答的问题

- `packages/*/*` 冻结树里有哪些包？某个 `@deepseek-ai/dsh-*` 落在哪个目录？
- 这个包是 Definition、Provider、Consumer，还是 bundle / app / library？
- 它出现在六个 bundle patch（`dsh-base` / `dsh-web-app` / `dsh-headless` / `dsh-sdk-app` / `dsh-sdk-minimal` / `dsh-acp-app`）还是四个 shipped preset，还是仓库里有、yml 都没点名？
- `apps/cli`、`vendor/*`、`python/sdk-runtime`、`native/system`、`apps/desktop` 分别是不是 build target？
- web 默认装哪一层？headless / sdk / acp 会不会挂 `agent-presets`？`sdk-minimal` 叠不叠 `dsh-base`？本仓有没有 shipped TUI 包？

## 范围与 ground truth

本页是 T3 **reference**：实例 = 冻结树里每一个 `packages/<group>/<pkg>/package.json`（不含 typert generator 的 `@fixture/*`），外加 workspace 里但不在该 glob 下的入口。分组是为了按 group 读，不是为了丢包。

**shipped 位置只认** 六份 bundle patch 与四份 preset composition 里的插件 `name:`（子路径导出先收成 npm name：`@scope/pkg/export` → `@scope/pkg`）：

- `packages/bundle/{base,web-app,headless,sdk-app,sdk-minimal,acp-app}/cordis.patch.yml`
- `packages/preset/agent-presets/presets/{minimal,standard,ptc,cordis}/agent.cordis.yml`

不认「目录里有 package.json」、不认 bundle `dependencies`、不认 README 表格。根 workspace 把 `packages/*/*` 与 `native/system` / `native/system/packages/*` 收进 pnpm；那只说明能被解析，不说明进了 `dsh web` / `dsh --profile headless|sdk|sdk-minimal|acp`。[E: package.json:13][E: package.json:14][E: pnpm-workspace.yaml:3][E: pnpm-workspace.yaml:6]

五个 shipped profile 名在 `PROFILE_TEMPLATES`：`acp` / `web` / `headless` / `sdk` / `sdk-minimal`。`web` 是唯一 `patchReload: live` 的模板。[E: packages/boot/app-boot/src/profile.ts:105][E: packages/boot/app-boot/src/profile.ts:112] `desktop` 不是该表成员。

四个 shipped preset 目录在 `SHIPPED_PRESET_ROOT` 下：`minimal` / `standard` / `ptc` / `cordis`。没有 `presets/code/`；旧 code 预设就是 PTC。wiki id `surface.presets.code` 与 `subsys.core.code-mode` 是稳定别名。[E: packages/preset/agent-presets/src/discovery.ts:60][E: packages/preset/agent-presets/presets/minimal/agent.cordis.yml:9][E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:24][E: packages/preset/agent-presets/presets/ptc/agent.cordis.yml:31][E: packages/preset/agent-presets/presets/cordis/agent.cordis.yml:17]

`@deepseek-ai/dsh-base` 是 **base-backed** profile 的第一层 patch：`dsh.bundle.patch` 指向那份 yml，`insert` 从 `id: timer` 起铺 host 面。[E: packages/bundle/base/package.json:2][E: packages/bundle/base/package.json:33][E: packages/bundle/base/cordis.patch.yml:17]

`sdk-minimal` **不**叠 base：模板 `bundles` 只有 `@deepseek-ai/dsh-sdk-minimal`，其 patch 是完整 `insert`。[E: packages/boot/app-boot/src/profile.ts:123][E: packages/bundle/sdk-minimal/package.json:2][E: packages/bundle/sdk-minimal/cordis.patch.yml:5]

web-app / headless / sdk-app / acp-app **叠在 base 上**。web-app 把一批 host 面 tool 行 `disabled: true`，再 insert `agent-presets`（`default: standard`），让每会话走 agent-preset 面。headless **不** insert roster，只加 `code-runtime` 与自己的 startup/runner。[E: packages/bundle/web-app/cordis.patch.yml:481][E: packages/bundle/web-app/cordis.patch.yml:482][E: packages/bundle/web-app/cordis.patch.yml:484][E: packages/bundle/headless/cordis.patch.yml:20][E: packages/bundle/headless/cordis.patch.yml:27]

preset-only 的例子：`dsh-persona` 四个 shipped preset 都有；persistent bash+pwsh 在 `minimal`（也在 `sdk-minimal`）；`dsh-tool-present` 在 standard / ptc / cordis；`dsh-agent-tool-presentation` 只在 `ptc`；`dsh-tool-cordis` 只在 `cordis`。`dsh-fs-local` / `dsh-tool-str-replace-editor` 仓库有、出厂 yml **不挂**。[E: packages/preset/agent-presets/presets/minimal/agent.cordis.yml:9][E: packages/preset/agent-presets/presets/ptc/agent.cordis.yml:269][E: packages/preset/agent-presets/presets/cordis/agent.cordis.yml:246][E: packages/preset/agent-presets/presets/standard/agent.cordis.yml:254]

角色列是 seam 三角加三类非三角包：

- **Definition** — 占 `ctx.<key>` 的合同 / 注册表词汇。
- **Provider** — 实现并 `provide` 的后端。
- **Consumer** — inject 之后登记 tool / command / UI / 策略门。
- **bundle** — `dsh.bundle.patch` 层。
- **app** — 可执行入口或 demo bin。
- **library** — 零 plugin 行的工具库、协议纯类型、testkit。

列约定：`shipped` = 十份 yml（六 bundle + 四 preset）的并集标签。`base` 的包会被叠在 base 上的 profile **继承**（除非后来的 patch 把那一行 disabled）。web 禁用后若四个 preset 之一重新 `name:` 了同一包，`为什么` 会写 remount，`shipped` 仍记 `base`。只出现在 `sdk-minimal` 的记 `sdk-minimal`。base 默认模型是 `provider: deepseek-official` / `model: deepseek-flash`；acp-app 仍硬编码 `deepseek-v4-flash`。[E: packages/bundle/base/cordis.patch.yml:78][E: packages/bundle/base/cordis.patch.yml:79]

官方 `packages/README.md` 只当查漏，**不当 [E]**。T0 组合叙事在 [spine.overview](../spine/overview.md) 与 [spine.composition-boot](../spine/composition-boot.md)；preset 成员对照在 [ref.presets](presets.md)。本页不把 help 例子里的 `tui` 写成 shipped profile。`dsh web` 不是唯一宿主入口：还有 `dsh --profile sdk|sdk-minimal|acp|headless`。

## 实例表

每个 `packages/*/*` 一行。`含义` 取该包 `package.json` `description` 的压缩句。

### core/（8）

产品 API 脊柱：session / tools / agent / loop。PTC `run_code` 实现在 `dsh-tools` 的 `ptc.ts`。

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-agent` | `packages/core/agent` | Definition | base | Agent interface, registry, initiator scope, and event vocabulary | host 面登记 ctx 键 | `packages/core/agent/package.json` |
| `@deepseek-ai/dsh-agent-default-model` | `packages/core/agent-default-model` | Provider | base | Default model selection shared by Agent entry points | host 面默认后端 | `packages/core/agent-default-model/package.json` |
| `@deepseek-ai/dsh-agent-loop` | `packages/core/agent-loop` | Provider | base | The concrete agent loop plugin | host 面默认后端 | `packages/core/agent-loop/package.json` |
| `@deepseek-ai/dsh-agent-tool-presentation` | `packages/core/agent-tool-presentation` | Consumer | preset-only | Agent-plane presentation selector: PTC / native / both | 只在 agent-preset 面（ptc） | `packages/core/agent-tool-presentation/package.json` |
| `@deepseek-ai/dsh-scope` | `packages/core/scope` | library | 仓库有但不 shipped | Scoped-context registration primitive | 被依赖的库 | `packages/core/scope/package.json` |
| `@deepseek-ai/dsh-session` | `packages/core/session` | Definition | base | Event-sourced session store | host 面登记 ctx 键 | `packages/core/session/package.json` |
| `@deepseek-ai/dsh-system-prompt` | `packages/core/system-prompt` | Definition | base | System prompt assembly registry | host 面登记 ctx 键 | `packages/core/system-prompt/package.json` |
| `@deepseek-ai/dsh-tools` | `packages/core/tools` | Definition | base | Tool registry、execution pipeline、PTC `run_code` | host 面登记 ctx 键 | `packages/core/tools/package.json` |

### boot/（2）

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-app-boot` | `packages/boot/app-boot` | library | 仓库有但不 shipped | Shared boot glue：.env、Loader guards、`PROFILE_TEMPLATES` | 被 launcher 依赖，不是 plugin 行 | `packages/boot/app-boot/package.json` |
| `@deepseek-ai/dsh-cmdline` | `packages/boot/cmdline` | library | 仓库有但不 shipped | Immutable command-line handoff | 被依赖的库 | `packages/boot/cmdline/package.json` |

### bundle/（6）

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-base` | `packages/bundle/base` | bundle | base | 每个 base-backed profile 的第一层 patch | profile 的 patch 层 [E: packages/bundle/base/package.json:2] | `packages/bundle/base/package.json` |
| `@deepseek-ai/dsh-web-app` | `packages/bundle/web-app` | bundle | web-app | 浏览器面 overlay + web-runtime | 叠在 base 上 [E: packages/bundle/web-app/package.json:2] | `packages/bundle/web-app/package.json` |
| `@deepseek-ai/dsh-headless` | `packages/bundle/headless` | bundle | headless | 无 Host/HTTP/浏览器的 one-shot runner | 叠在 base 上 [E: packages/bundle/headless/package.json:2] | `packages/bundle/headless/package.json` |
| `@deepseek-ai/dsh-sdk-app` | `packages/bundle/sdk-app` | bundle | sdk-app | stdio JSON-RPC + 进程生命周期 overlay | 叠在 base 上 [E: packages/bundle/sdk-app/package.json:2] | `packages/bundle/sdk-app/package.json` |
| `@deepseek-ai/dsh-sdk-minimal` | `packages/bundle/sdk-minimal` | bundle | sdk-minimal | 独立最小 SDK：不叠 base | 模板 bundles 只有它自己 [E: packages/bundle/sdk-minimal/package.json:2] | `packages/bundle/sdk-minimal/package.json` |
| `@deepseek-ai/dsh-acp-app` | `packages/bundle/acp-app` | bundle | acp-app | ACP JSON-RPC stdio overlay | 叠在 base 上 [E: packages/bundle/acp-app/package.json:2] | `packages/bundle/acp-app/package.json` |

### preset/（2）

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-agent-presets` | `packages/preset/agent-presets` | Provider | web-app | Per-session agent composition from preset cordis.yml | 五个 shipped profile 里只有 web insert roster | `packages/preset/agent-presets/package.json` |
| `@deepseek-ai/dsh-persona` | `packages/preset/persona` | Consumer | preset-only | Composition-authored deployment persona | 四个 preset 都有 | `packages/preset/persona/package.json` |

### llm/（7）

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-llm` | `packages/llm/llm` | Definition | base | Provider-neutral LLM seam | host 面 | `packages/llm/llm/package.json` |
| `@deepseek-ai/dsh-llm-deepseek` | `packages/llm/llm-deepseek` | Provider | base + sdk-minimal | DeepSeek chat-completions adapter | host 面默认后端 | `packages/llm/llm-deepseek/package.json` |
| `@deepseek-ai/dsh-llm-pi-ai` | `packages/llm/llm-pi-ai` | Provider | base | pi-ai 适配（零 route 直到 Settings 加 profile） | host 面 | `packages/llm/llm-pi-ai/package.json` |
| `@deepseek-ai/dsh-llm-retry` | `packages/llm/llm-retry` | Provider | base | Provider-routed retry | host 面 | `packages/llm/llm-retry/package.json` |
| `@deepseek-ai/dsh-token-meter` | `packages/llm/token-meter` | Provider | base | Replay-aware token measurement | host 面 | `packages/llm/token-meter/package.json` |
| `@deepseek-ai/dsh-deepseek-llm-api-extensions` | `packages/llm/deepseek-llm-api-extensions` | Provider | base + sdk-minimal | 官方 DeepSeek 请求字段注册表 | host 面 | `packages/llm/deepseek-llm-api-extensions/package.json` |
| `@deepseek-ai/dsh-plugin-package-inventory-deepseek` | `packages/llm/plugin-package-inventory-deepseek` | Provider | base + sdk-minimal | Loader 插件清单进官方 API 请求 | host 面 | `packages/llm/plugin-package-inventory-deepseek/package.json` |

### fs/（8）

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-fs` | `packages/fs/fs` | Definition | 仓库有但不 shipped | `ctx.fs` 合同 | 合同包 | `packages/fs/fs/package.json` |
| `@deepseek-ai/dsh-fs-local` | `packages/fs/fs-local` | Provider | 仓库有但不 shipped | 本地文件系统实现 | 出厂 preset / bundle yml 都不挂 | `packages/fs/fs-local/package.json` |
| `@deepseek-ai/dsh-fs-observation-policy` | `packages/fs/fs-observation-policy` | Consumer | base | observed-state / read-before-edit | host 面 | `packages/fs/fs-observation-policy/package.json` |
| `@deepseek-ai/dsh-fs-sandbox` | `packages/fs/fs-sandbox` | Provider | base | 沙箱围栏的 fs 实现 | host 面默认后端 | `packages/fs/fs-sandbox/package.json` |
| `@deepseek-ai/dsh-tool-fs` | `packages/fs/tool-fs` | Consumer | base | read/write/edit | web 禁用后 preset remount | `packages/fs/tool-fs/package.json` |
| `@deepseek-ai/dsh-tool-fs-search` | `packages/fs/tool-fs-search` | Consumer | base | glob/grep | web 禁用后 preset remount | `packages/fs/tool-fs-search/package.json` |
| `@deepseek-ai/dsh-tool-str-replace-editor` | `packages/fs/tool-str-replace-editor` | Consumer | 仓库有但不 shipped | view/create/replace；wire `str_replace_editor` | 包在、出厂不挂 | `packages/fs/tool-str-replace-editor/package.json` |
| `@deepseek-ai/dsh-tool-present` | `packages/fs/tool-present` | Consumer | preset-only | wire `present`；成功后 `deliverables/presented` | standard / ptc / cordis | `packages/fs/tool-present/package.json` |

### shell/（10）

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-bash-local` | `packages/shell/bash-local` | Provider | 仓库有但不 shipped | 本地 bash executor | 可选后端 | `packages/shell/bash-local/package.json` |
| `@deepseek-ai/dsh-bash-sandbox` | `packages/shell/bash-sandbox` | Provider | base | 沙箱 bash | host 面 | `packages/shell/bash-sandbox/package.json` |
| `@deepseek-ai/dsh-pwsh-local` | `packages/shell/pwsh-local` | Provider | 仓库有但不 shipped | 本地 pwsh | 可选后端 | `packages/shell/pwsh-local/package.json` |
| `@deepseek-ai/dsh-pwsh-sandbox` | `packages/shell/pwsh-sandbox` | Provider | base | 沙箱 pwsh | host 面 | `packages/shell/pwsh-sandbox/package.json` |
| `@deepseek-ai/dsh-shell` | `packages/shell/shell` | Definition | 仓库有但不 shipped | `ctx.shell` 合同 | 合同包 | `packages/shell/shell/package.json` |
| `@deepseek-ai/dsh-shell-env` | `packages/shell/shell-env` | Provider | base | 托管 DSH_* 环境 | host 面 | `packages/shell/shell-env/package.json` |
| `@deepseek-ai/dsh-tool-bash` | `packages/shell/tool-bash` | Consumer | base | one-shot `bash` | web 禁用后 std/ptc/cordis remount | `packages/shell/tool-bash/package.json` |
| `@deepseek-ai/dsh-tool-bash-persistent` | `packages/shell/tool-bash-persistent` | Consumer | preset-only + sdk-minimal | 持久 `bash`（`ctx.terminals`） | min / sdk-minimal | `packages/shell/tool-bash-persistent/package.json` |
| `@deepseek-ai/dsh-tool-pwsh` | `packages/shell/tool-pwsh` | Consumer | base | one-shot `pwsh` | web 禁用后 remount | `packages/shell/tool-pwsh/package.json` |
| `@deepseek-ai/dsh-tool-pwsh-persistent` | `packages/shell/tool-pwsh-persistent` | Consumer | preset-only + sdk-minimal | 持久 `pwsh`（模型名仍是 `pwsh`） | min / sdk-minimal | `packages/shell/tool-pwsh-persistent/package.json` |

### subprocess/（3）

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-subprocess` | `packages/subprocess/subprocess` | Definition | 仓库有但不 shipped | `ctx.subprocess` 合同 | 合同包 | `packages/subprocess/subprocess/package.json` |
| `@deepseek-ai/dsh-subprocess-local` | `packages/subprocess/subprocess-local` | Provider | base + sdk-minimal | 本地进程树 | host / sdk-minimal | `packages/subprocess/subprocess-local/package.json` |
| `@deepseek-ai/dsh-win32-process` | `packages/subprocess/win32-process` | library | 仓库有但不 shipped | Win32 Job Object 原语 | 被 Windows sandbox 依赖 | `packages/subprocess/win32-process/package.json` |

### sandbox/（4）

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-sandbox` | `packages/sandbox/sandbox` | Definition | 仓库有但不 shipped | `ctx.sandbox` 合同 | 合同包 | `packages/sandbox/sandbox/package.json` |
| `@deepseek-ai/dsh-sandbox-local` | `packages/sandbox/sandbox-local` | Provider | base + sdk-minimal | bwrap / landlock-run | host / sdk-minimal | `packages/sandbox/sandbox-local/package.json` |
| `@deepseek-ai/dsh-sandbox-policy` | `packages/sandbox/sandbox-policy` | Provider | base + sdk-minimal | per-call sandbox policy | host / sdk-minimal | `packages/sandbox/sandbox-policy/package.json` |
| `@deepseek-ai/dsh-sandbox-windows-acl` | `packages/sandbox/sandbox-windows-acl` | Provider | 仓库有但不 shipped | Windows ACL 后端 | 可选 | `packages/sandbox/sandbox-windows-acl/package.json` |

### terminal/（3）

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-terminal` | `packages/terminal/terminal` | Definition | preset-only + sdk-minimal | 持久 PTY seam | min / sdk-minimal | `packages/terminal/terminal/package.json` |
| `@deepseek-ai/dsh-terminal-bash` | `packages/terminal/terminal-bash` | Provider | preset-only + sdk-minimal | PTY backend | min / sdk-minimal | `packages/terminal/terminal-bash/package.json` |
| `@deepseek-ai/dsh-tool-terminal` | `packages/terminal/tool-terminal` | Consumer | 仓库有但不 shipped | 六件 `terminal_*` | shipped composition 未点名 | `packages/terminal/tool-terminal/package.json` |

### code-runtime/（2）

Python 实现已迁到 `packages/experimental/code-runtime-python`。

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-code-runtime` | `packages/code-runtime/code-runtime` | Definition | 仓库有但不 shipped | `ctx.codeRuntime` 合同 | 合同包 | `packages/code-runtime/code-runtime/package.json` |
| `@deepseek-ai/dsh-code-runtime-worker-thread` | `packages/code-runtime/code-runtime-worker-thread` | Provider | web-app + headless | TypeScript worker-thread 实现 | overlay insert | `packages/code-runtime/code-runtime-worker-thread/package.json` |

### lsp/（3）

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-lsp` | `packages/lsp/lsp` | Definition | 仓库有但不 shipped | `ctx.lsp` 合同 | 合同包 | `packages/lsp/lsp/package.json` |
| `@deepseek-ai/dsh-lsp-stdio` | `packages/lsp/lsp-stdio` | Provider | 仓库有但不 shipped | stdio language-server | 可选 | `packages/lsp/lsp-stdio/package.json` |
| `@deepseek-ai/dsh-tool-lsp` | `packages/lsp/tool-lsp` | Consumer | 仓库有但不 shipped | 模型可见 `lsp` | 未点名 | `packages/lsp/tool-lsp/package.json` |

### skill/（4）

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-skill` | `packages/skill/skill` | Definition | base | skill 注册表 | host 面 | `packages/skill/skill/package.json` |
| `@deepseek-ai/dsh-skill-badge` | `packages/skill/skill-badge` | Provider | base | bundled badge skill | base 有行但 `disabled: true` [E: packages/bundle/base/cordis.patch.yml:280][E: packages/bundle/base/cordis.patch.yml:281] | `packages/skill/skill-badge/package.json` |
| `@deepseek-ai/dsh-skill-filesystem` | `packages/skill/skill-filesystem` | Provider | base | 本地 skill 发现 | web 禁用后 remount | `packages/skill/skill-filesystem/package.json` |
| `@deepseek-ai/dsh-tool-skill` | `packages/skill/tool-skill` | Consumer | base | 模型可见 `skill` | remount | `packages/skill/tool-skill/package.json` |

### compaction/（4）

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-command-compact` | `packages/compaction/command-compact` | Consumer | base | `/compact` | remount | `packages/compaction/command-compact/package.json` |
| `@deepseek-ai/dsh-compaction` | `packages/compaction/compaction` | Definition | 仓库有但不 shipped | `ctx.compaction` | 合同包 | `packages/compaction/compaction/package.json` |
| `@deepseek-ai/dsh-compaction-basic` | `packages/compaction/compaction-basic` | Provider | base | LLM summarization | remount | `packages/compaction/compaction-basic/package.json` |
| `@deepseek-ai/dsh-compaction-tool-result-pruner` | `packages/compaction/compaction-tool-result-pruner` | Provider | base | tool-result 剪枝 | remount | `packages/compaction/compaction-tool-result-pruner/package.json` |

### context/（6）

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-agent-instructions` | `packages/context/agent-instructions` | Consumer | base | AGENTS.md/CLAUDE.md | remount | `packages/context/agent-instructions/package.json` |
| `@deepseek-ai/dsh-session-reference` | `packages/context/session-reference` | Provider | web-app | 跨会话 snapshot 引用 | web-app insert | `packages/context/session-reference/package.json` |
| `@deepseek-ai/dsh-file-reference` | `packages/context/file-reference` | Definition | 仓库有但不 shipped | `@file` 语法合同 | 合同包 | `packages/context/file-reference/package.json` |
| `@deepseek-ai/dsh-file-reference-local` | `packages/context/file-reference-local` | Provider | web-app | 本地文件引用 | web-app insert | `packages/context/file-reference-local/package.json` |
| `@deepseek-ai/dsh-time-context` | `packages/context/time-context` | Consumer | 仓库有但不 shipped | 逐步时间 context | 未点名 | `packages/context/time-context/package.json` |
| `@deepseek-ai/dsh-tmux-context` | `packages/context/tmux-context` | Consumer | 仓库有但不 shipped | tmux pane context | 未点名 | `packages/context/tmux-context/package.json` |

### guard/（2）

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-repeat-tool-reminder` | `packages/guard/repeat-tool-reminder` | Consumer | base | 重复调用提醒 | host 面 | `packages/guard/repeat-tool-reminder/package.json` |
| `@deepseek-ai/dsh-tool-call-timeout-policy` | `packages/guard/timeout-policy` | Consumer | base | tool deadline | host 面 | `packages/guard/timeout-policy/package.json` |

### subagent/（10）

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-subagent` | `packages/subagent/subagent` | Definition | base | `ctx.subagents` | host 面 | `packages/subagent/subagent/package.json` |
| `@deepseek-ai/dsh-subagent-acp` | `packages/subagent/subagent-acp` | Provider | 仓库有但不 shipped | 进程外 ACP 子代理 | 可选 | `packages/subagent/subagent-acp/package.json` |
| `@deepseek-ai/dsh-subagent-claude-code` | `packages/subagent/subagent-claude-code` | Provider | 仓库有但不 shipped | Claude Code SDK | 可选 | `packages/subagent/subagent-claude-code/package.json` |
| `@deepseek-ai/dsh-subagent-codex` | `packages/subagent/subagent-codex` | Provider | 仓库有但不 shipped | Codex app-server | 可选 | `packages/subagent/subagent-codex/package.json` |
| `@deepseek-ai/dsh-subagent-dsh-sdk` | `packages/subagent/subagent-dsh-sdk` | Provider | 仓库有但不 shipped | 进程外 DSH SDK 子代理 | 可选 | `packages/subagent/subagent-dsh-sdk/package.json` |
| `@deepseek-ai/dsh-subagent-fork-in-process` | `packages/subagent/subagent-fork-in-process` | Provider | base | in-process fork | host 面 | `packages/subagent/subagent-fork-in-process/package.json` |
| `@deepseek-ai/dsh-subagent-in-process-driver` | `packages/subagent/subagent-in-process-driver` | library | 仓库有但不 shipped | spawn/fork 共享 driver | 库 | `packages/subagent/subagent-in-process-driver/package.json` |
| `@deepseek-ai/dsh-subagent-spawn-in-process` | `packages/subagent/subagent-spawn-in-process` | Provider | base | in-process spawn | host 面 | `packages/subagent/subagent-spawn-in-process/package.json` |
| `@deepseek-ai/dsh-tool-subagent` | `packages/subagent/tool-subagent` | Consumer | base | 模型可见委托 | remount | `packages/subagent/tool-subagent/package.json` |
| `@deepseek-ai/dsh-tool-subagent-control` | `packages/subagent/tool-subagent-control` | Consumer | base | send_message / interrupt / list_agents | remount | `packages/subagent/tool-subagent-control/package.json` |

### jobs/（3）· workflow/（4）· goal/（4）· plan/（1）· schedule/（1）· todo/（1）

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-jobs` | `packages/jobs/jobs` | Definition | 仓库有但不 shipped | `ctx.jobs` | 合同包 | `packages/jobs/jobs/package.json` |
| `@deepseek-ai/dsh-jobs-local` | `packages/jobs/jobs-local` | Provider | base | 进程内 job 注册表 | host 面 | `packages/jobs/jobs-local/package.json` |
| `@deepseek-ai/dsh-tool-jobs` | `packages/jobs/tool-jobs` | Consumer | base | `job_*` | remount | `packages/jobs/tool-jobs/package.json` |
| `@deepseek-ai/dsh-workflow` | `packages/workflow/workflow` | Definition | 仓库有但不 shipped | `ctx.workflowEngine` | 合同包 | `packages/workflow/workflow/package.json` |
| `@deepseek-ai/dsh-workflow-worker-thread` | `packages/workflow/workflow-worker-thread` | Provider | base | worker-thread 引擎 | remount | `packages/workflow/workflow-worker-thread/package.json` |
| `@deepseek-ai/dsh-tool-workflow` | `packages/workflow/tool-workflow` | Consumer | base | `workflow` | remount | `packages/workflow/tool-workflow/package.json` |
| `@deepseek-ai/dsh-tool-ralph` | `packages/workflow/tool-ralph` | Consumer | base | Ralph loop | remount | `packages/workflow/tool-ralph/package.json` |
| `@deepseek-ai/dsh-goal` | `packages/goal/goal` | Definition | base | 同会话 goal | host 面 | `packages/goal/goal/package.json` |
| `@deepseek-ai/dsh-goal-round-driver` | `packages/goal/goal-round-driver` | Provider | base | goal-round driver | host 面 | `packages/goal/goal-round-driver/package.json` |
| `@deepseek-ai/dsh-command-goal` | `packages/goal/command-goal` | Consumer | base | `/goal` | remount | `packages/goal/command-goal/package.json` |
| `@deepseek-ai/dsh-tool-goal` | `packages/goal/tool-goal` | Consumer | base | 模型可见 goal | remount | `packages/goal/tool-goal/package.json` |
| `@deepseek-ai/dsh-plan-mode` | `packages/plan/plan-mode` | Provider | base | plan mode + `exit_plan_mode` | remount | `packages/plan/plan-mode/package.json` |
| `@deepseek-ai/dsh-schedule` | `packages/schedule/schedule` | Provider | 仓库有但不 shipped | `schedule_*` | 未点名 | `packages/schedule/schedule/package.json` |
| `@deepseek-ai/dsh-tool-todo` | `packages/todo/tool-todo` | Consumer | base | `todo_write` | remount | `packages/todo/tool-todo/package.json` |

### web/（6）

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-web` | `packages/web/web` | Definition | base | `ctx.web` | host 面 | `packages/web/web/package.json` |
| `@deepseek-ai/dsh-tool-web` | `packages/web/tool-web` | Consumer | base | `web_search` / `web_fetch` | remount | `packages/web/tool-web/package.json` |
| `@deepseek-ai/dsh-web-fetch-http` | `packages/web/web-fetch-http` | Provider | base | 匿名 HTTP fetch | base insert | `packages/web/web-fetch-http/package.json` |
| `@deepseek-ai/dsh-web-search-deepseek` | `packages/web/web-search-deepseek` | Provider | base | DeepSeek search | host 面 | `packages/web/web-search-deepseek/package.json` |
| `@deepseek-ai/dsh-web-search-exa` | `packages/web/web-search-exa` | Provider | 仓库有但不 shipped | Exa | 可选 | `packages/web/web-search-exa/package.json` |
| `@deepseek-ai/dsh-web-search-perplexity` | `packages/web/web-search-perplexity` | Provider | 仓库有但不 shipped | Perplexity | 可选 | `packages/web/web-search-perplexity/package.json` |

### attachment / spill / session（19） / session-query / settings / credentials / storage / workspace

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-attachment` | `packages/attachment/attachment` | Definition | 仓库有但不 shipped | 附件 seam | 合同包 | `packages/attachment/attachment/package.json` |
| `@deepseek-ai/dsh-attachment-local` | `packages/attachment/attachment-local` | Provider | base | `$DSH_HOME` 内容寻址 | host 面 | `packages/attachment/attachment-local/package.json` |
| `@deepseek-ai/dsh-spill` | `packages/spill/spill` | Definition | 仓库有但不 shipped | `ctx.spillStore` | 合同包 | `packages/spill/spill/package.json` |
| `@deepseek-ai/dsh-spill-local` | `packages/spill/spill-local` | Provider | base | 本地 spill | host 面 | `packages/spill/spill-local/package.json` |
| `@deepseek-ai/dsh-spill-policy` | `packages/spill/spill-policy` | Consumer | base | 超大 tool 文本外溢 | host 面 | `packages/spill/spill-policy/package.json` |
| `@deepseek-ai/dsh-session-checkpoint-policy` | `packages/session/session-checkpoint-policy` | Consumer | base | 请求/副作用前 checkpoint | host 面 | `packages/session/session-checkpoint-policy/package.json` |
| `@deepseek-ai/dsh-session-persistence` | `packages/session/session-persistence` | Definition | 仓库有但不 shipped | 持久化 seam | 合同包 | `packages/session/session-persistence/package.json` |
| `@deepseek-ai/dsh-session-persistence-jsonl` | `packages/session/session-persistence-jsonl` | Provider | base + sdk-minimal | JSONL + write lease | host / sdk-minimal | `packages/session/session-persistence-jsonl/package.json` |
| `@deepseek-ai/dsh-session-format` | `packages/session/session-format` | library | 仓库有但不 shipped | adjacent 迁移规划器 | 被 catalog / jsonl 依赖 | `packages/session/session-format/package.json` |
| `@deepseek-ai/dsh-session-format-v0-to-v1` | `packages/session/session-format-v0-to-v1` | library | 仓库有但不 shipped | v0→v1 adjacent migrator | catalog 边 | `packages/session/session-format-v0-to-v1/package.json` |
| `@deepseek-ai/dsh-session-format-v1-to-v2` | `packages/session/session-format-v1-to-v2` | library | 仓库有但不 shipped | v1→v2 adjacent migrator | catalog 边 | `packages/session/session-format-v1-to-v2/package.json` |
| `@deepseek-ai/dsh-session-format-v2-to-v3` | `packages/session/session-format-v2-to-v3` | library | 仓库有但不 shipped | v2→v3 adjacent migrator（`code`→`ptc`、插入 `system/message`） | catalog 边 | `packages/session/session-format-v2-to-v3/package.json` |
| `@deepseek-ai/dsh-session-format-catalog` | `packages/session/session-format-catalog` | library | 仓库有但不 shipped | `currentVersion: 3` 已安装 catalog | jsonl load 导入 | `packages/session/session-format-catalog/package.json` |
| `@deepseek-ai/dsh-session-projection` | `packages/session/session-projection` | Definition | base + sdk-minimal | 投影注册表 | host / sdk-minimal | `packages/session/session-projection/package.json` |
| `@deepseek-ai/dsh-session-projection-cache` | `packages/session/session-projection-cache` | Provider | base | 投影缓存 | 现已在 base insert | `packages/session/session-projection-cache/package.json` |
| `@deepseek-ai/dsh-session-stats` | `packages/session/session-stats` | Provider | web-app | conversation 计数投影 | web-app | `packages/session/session-stats/package.json` |
| `@deepseek-ai/dsh-session-turn-outline` | `packages/session/session-turn-outline` | Consumer | web-app | `turnOutline` 投影单元 | web-app insert | `packages/session/session-turn-outline/package.json` |
| `@deepseek-ai/dsh-session-telemetry` | `packages/session/session-telemetry` | Definition | 仓库有但不 shipped | telemetry seam | 合同包 | `packages/session/session-telemetry/package.json` |
| `@deepseek-ai/dsh-session-telemetry-otel` | `packages/session/session-telemetry-otel` | Provider | base | OTel backend | host 面 | `packages/session/session-telemetry-otel/package.json` |
| `@deepseek-ai/dsh-session-title` | `packages/session/session-title` | Definition | base | 标题服务 | host 面 | `packages/session/session-title/package.json` |
| `@deepseek-ai/dsh-session-title-all-prompts-llm` | `packages/session/session-title-all-prompts-llm` | Provider | 仓库有但不 shipped | 全 prompt 标题 | 可选 | `packages/session/session-title-all-prompts-llm/package.json` |
| `@deepseek-ai/dsh-session-title-first-prompt-llm` | `packages/session/session-title-first-prompt-llm` | Provider | base | 首条消息标题 | host 面 | `packages/session/session-title-first-prompt-llm/package.json` |
| `@deepseek-ai/dsh-session-title-llm` | `packages/session/session-title-llm` | library | 仓库有但不 shipped | 共享 LLM 标题策略 | 库 | `packages/session/session-title-llm/package.json` |
| `@deepseek-ai/dsh-session-log-deepseek` | `packages/session/session-log-deepseek` | Provider | base + sdk-minimal | 增量 `dsh_session_log` 扩展（默认 disabled） | host / sdk-minimal | `packages/session/session-log-deepseek/package.json` |
| `@deepseek-ai/dsh-session-log-export` | `packages/session-query/session-log-export` | Consumer | web-app | 日志导出命令 | web-app | `packages/session-query/session-log-export/package.json` |
| `@deepseek-ai/dsh-session-query` | `packages/session-query/session-query` | Definition | 仓库有但不 shipped | 查询合同 | 合同包 | `packages/session-query/session-query/package.json` |
| `@deepseek-ai/dsh-session-query-sqlite` | `packages/session-query/session-query-sqlite` | Provider | base | FTS5 | host 面 | `packages/session-query/session-query-sqlite/package.json` |
| `@deepseek-ai/dsh-tool-session-query` | `packages/session-query/tool-session-query` | Consumer | 仓库有但不 shipped | 模型可见历史查询 | 未点名 | `packages/session-query/tool-session-query/package.json` |
| `@deepseek-ai/dsh-settings` | `packages/settings/settings` | Definition | 仓库有但不 shipped | `ctx.settings` | 合同包 | `packages/settings/settings/package.json` |
| `@deepseek-ai/dsh-settings-file` | `packages/settings/settings-file` | Provider | base | `settings.yaml` | host 面 | `packages/settings/settings-file/package.json` |
| `@deepseek-ai/dsh-credentials` | `packages/credentials/credentials` | Definition | 仓库有但不 shipped | `ctx.credentials` | 合同包 | `packages/credentials/credentials/package.json` |
| `@deepseek-ai/dsh-credentials-local` | `packages/credentials/credentials-local` | Provider | base | `$DSH_HOME/.env` | host 面 | `packages/credentials/credentials-local/package.json` |
| `@deepseek-ai/dsh-authorization` | `packages/credentials/authorization` | Definition | 仓库有但不 shipped | `ctx.authorization` 人机拿凭证 | 合同包 | `packages/credentials/authorization/package.json` |
| `@deepseek-ai/dsh-storage` | `packages/storage/storage` | Definition | base | `ctx.storage` | 现已在 base | `packages/storage/storage/package.json` |
| `@deepseek-ai/dsh-storage-domain` | `packages/storage/storage-domain` | Provider | base | domain KV | base | `packages/storage/storage-domain/package.json` |
| `@deepseek-ai/dsh-storage-json` | `packages/storage/storage-json` | Provider | base | JSON KV backend | base | `packages/storage/storage-json/package.json` |
| `@deepseek-ai/dsh-storage-sqlite` | `packages/storage/storage-sqlite` | Provider | 仓库有但不 shipped | SQLite KV | 可选 | `packages/storage/storage-sqlite/package.json` |
| `@deepseek-ai/dsh-workspace` | `packages/workspace/workspace` | Provider | web-app | `ctx.workspaceRegistry` | web-app | `packages/workspace/workspace/package.json` |

### interaction / feedback / hooks

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-commands` | `packages/interaction/commands` | Definition | base | 人命令注册表 | host 面 | `packages/interaction/commands/package.json` |
| `@deepseek-ai/dsh-permission-presets` | `packages/interaction/permission-presets` | Provider | base | 权限预设 | host 面 | `packages/interaction/permission-presets/package.json` |
| `@deepseek-ai/dsh-tool-ask-user` | `packages/interaction/tool-ask-user` | Consumer | preset-only | `ask_user_question` | std/ptc/cordis | `packages/interaction/tool-ask-user/package.json` |
| `@deepseek-ai/dsh-user-approval` | `packages/interaction/user-approval` | Definition | base | `ctx.approval` | host 面 | `packages/interaction/user-approval/package.json` |
| `@deepseek-ai/dsh-user-questions` | `packages/interaction/user-questions` | Definition | base | `ctx.userQuestions` | host 面 | `packages/interaction/user-questions/package.json` |
| `@deepseek-ai/dsh-command-feedback` | `packages/feedback/command-feedback` | Consumer | base | `/feedback` | host 面 | `packages/feedback/command-feedback/package.json` |
| `@deepseek-ai/dsh-message-feedback` | `packages/feedback/message-feedback` | Provider | web-app | 消息评分进 Session log（`feedback/message-put` / `delete`） | web-app | `packages/feedback/message-feedback/package.json` |
| `@deepseek-ai/dsh-hook-protocol` | `packages/hooks/hook-protocol` | library | 仓库有但不 shipped | Claude/Codex hook 协议 | 库 | `packages/hooks/hook-protocol/package.json` |
| `@deepseek-ai/dsh-hooks-claude-code` | `packages/hooks/hooks-claude-code` | Consumer | 仓库有但不 shipped | Claude hooks 桥 | 未点名 | `packages/hooks/hooks-claude-code/package.json` |
| `@deepseek-ai/dsh-hooks-codex` | `packages/hooks/hooks-codex` | Consumer | 仓库有但不 shipped | Codex hooks 桥 | 未点名 | `packages/hooks/hooks-codex/package.json` |

### api/（6）· typert/（4）

旧 BFF `dsh-host-apiproxy` 已删除。HTTP API 是三个 controller + gateway + webserver。

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-api-gateway` | `packages/api/gateway` | Provider | base | Typert Remote dispatcher | host 面 | `packages/api/gateway/package.json` |
| `@deepseek-ai/dsh-api-remotes` | `packages/api/remotes` | Consumer | web-app | Client Remote 装配 | web-app | `packages/api/remotes/package.json` |
| `@deepseek-ai/dsh-api-session-controller` | `packages/api/session-controller` | Provider | web-app | Session Remote + 客户端 `ctx.sessions` | web-app | `packages/api/session-controller/package.json` |
| `@deepseek-ai/dsh-api-settings-controller` | `packages/api/settings-controller` | Provider | web-app | Settings + credentials Remote | web-app | `packages/api/settings-controller/package.json` |
| `@deepseek-ai/dsh-api-workspace-controller` | `packages/api/workspace-controller` | Provider | web-app | Workspace Remote | web-app | `packages/api/workspace-controller/package.json` |
| `@deepseek-ai/dsh-api-workspace-files` | `packages/api/workspace-files` | Provider | web-app | Host `ctx.workspaceFiles` Remote | web-app [E: packages/bundle/web-app/cordis.patch.yml:111] | `packages/api/workspace-files/package.json` |
| `@deepseek-ai/dsh-typert-generator` | `packages/typert/generator` | library | 仓库有但不 shipped | Typert 生成器 | 库 | `packages/typert/generator/package.json` |
| `@deepseek-ai/dsh-typert-loader` | `packages/typert/loader` | Provider | base | 装载生成物 | host 面 | `packages/typert/loader/package.json` |
| `@deepseek-ai/dsh-typert-protocol` | `packages/typert/protocol` | Definition | 仓库有但不 shipped | Remote 元数据协议 | 合同包 | `packages/typert/protocol/package.json` |
| `@deepseek-ai/dsh-typert-registry` | `packages/typert/registry` | Provider | base | 运行时反射注册表 | host 面 | `packages/typert/registry/package.json` |

### host/（8）

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-host-directory-picker` | `packages/host/directory-picker` | Definition | 仓库有但不 shipped | `ctx.directoryPicker` | 合同包 | `packages/host/directory-picker/package.json` |
| `@deepseek-ai/dsh-host-directory-picker-auto` | `packages/host/directory-picker-auto` | Provider | web-app | native/browse 自适应 | web-app | `packages/host/directory-picker-auto/package.json` |
| `@deepseek-ai/dsh-host-directory-picker-browse` | `packages/host/directory-picker-browse` | Provider | 仓库有但不 shipped | 应用内浏览 | 可选 | `packages/host/directory-picker-browse/package.json` |
| `@deepseek-ai/dsh-host-directory-picker-native` | `packages/host/directory-picker-native` | Provider | 仓库有但不 shipped | OS chooser | 可选 | `packages/host/directory-picker-native/package.json` |
| `@deepseek-ai/dsh-host-frontend-static` | `packages/host/frontend-static` | Provider | 仓库有但不 shipped | SPA dist fallback | web-runtime 可消费；patch 未单独点名 | `packages/host/frontend-static/package.json` |
| `@deepseek-ai/dsh-host-plugin-inventory` | `packages/host/plugin-inventory` | Provider | web-app | Loader 状态 Remote | web-app | `packages/host/plugin-inventory/package.json` |
| `@deepseek-ai/dsh-host-webserver` | `packages/host/webserver` | Provider | web-app | node:http 路由登记 | web-app | `packages/host/webserver/package.json` |
| `@deepseek-ai/dsh-host-open-in-app` | `packages/host/open-in-app` | Provider | web-app | 本机应用探测/启动；无 Context merge | web-app [E: packages/bundle/web-app/cordis.patch.yml:66] | `packages/host/open-in-app/package.json` |

### client/（51）

旧 `dsh-client-runtime` / `dsh-client-web-react` / `dsh-client-schema-form` 已删除。快照引擎是 `dsh-client-store`；slot 渲染是 `dsh-client-ui-renderer`；Session 对象层在 session-controller 的 `src/client/`。

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-client-file-upload` | `packages/client/file-upload` | Provider | web-app | 浏览器 staged 上传；非模型工具 | web-app | `packages/client/file-upload/package.json` |
| `@deepseek-ai/dsh-client-connection` | `packages/client/connection` | Provider | web-app | HTTP-up / WS-down | web-app | `packages/client/connection/package.json` |
| `@deepseek-ai/dsh-client-hmr` | `packages/client/hmr` | Provider | web-app | 客户端 HMR | web-app | `packages/client/hmr/package.json` |
| `@deepseek-ai/dsh-client-locale` | `packages/client/locale` | Provider | web-app | zh/en | web-app | `packages/client/locale/package.json` |
| `@deepseek-ai/dsh-client-modules` | `packages/client/modules` | Provider | web-app | `__DSH_BOOT__` 模块图 | web-app | `packages/client/modules/package.json` |
| `@deepseek-ai/dsh-client-resources` | `packages/client/resources` | Provider | web-app | `ctx.resources` 资源模型 | web-app [E: packages/bundle/web-app/cordis.patch.yml:218] | `packages/client/resources/package.json` |
| `@deepseek-ai/dsh-client-ui-dockkit` | `packages/client/ui-dockkit` | library | 仓库有但不 shipped | 停靠 kit；yml 无独立 `name:` 行 | 被右侧栏注释引用 | `packages/client/ui-dockkit/package.json` |
| `@deepseek-ai/dsh-client-ui-open-in-app` | `packages/client/ui-open-in-app` | Consumer | web-app | 在本机应用打开 | web-app [E: packages/bundle/web-app/cordis.patch.yml:73] | `packages/client/ui-open-in-app/package.json` |
| `@deepseek-ai/dsh-client-store` | `packages/client/store` | library | 仓库有但不 shipped | zustand/immer 快照引擎 | 被 UI 依赖，不是 patch 行 | `packages/client/store/package.json` |
| `@deepseek-ai/dsh-client-ui-renderer` | `packages/client/ui-renderer` | Consumer | web-app | `ctx.uiRenderer.mount` | web-app | `packages/client/ui-renderer/package.json` |
| `@deepseek-ai/dsh-client-ui-slots` | `packages/client/ui-slots` | library | 仓库有但不 shipped | SlotMap | 库 | `packages/client/ui-slots/package.json` |
| `@deepseek-ai/dsh-client-ui-primitives` | `packages/client/ui-primitives` | library | 仓库有但不 shipped | 纯 React atoms | 库 | `packages/client/ui-primitives/package.json` |
| `@deepseek-ai/dsh-client-web` | `packages/client/web` | Provider | 仓库有但不 shipped | `boot.ts` 内核 | 被 frontend 依赖 | `packages/client/web/package.json` |
| `@deepseek-ai/dsh-client-ui-agent-preset` | `packages/client/ui-agent-preset` | Consumer | web-app | preset UI | web-app | `packages/client/ui-agent-preset/package.json` |
| `@deepseek-ai/dsh-client-ui-approval` | `packages/client/ui-approval` | Consumer | web-app | 审批 UI | web-app | `packages/client/ui-approval/package.json` |
| `@deepseek-ai/dsh-client-ui-attachment` | `packages/client/ui-attachment` | Consumer | web-app | 附件 UI | web-app insert（不再只是纯库） | `packages/client/ui-attachment/package.json` |
| `@deepseek-ai/dsh-client-ui-brand-official` | `packages/client/ui-brand-official` | Consumer | web-app | 官方品牌皮 | web-app | `packages/client/ui-brand-official/package.json` |
| `@deepseek-ai/dsh-client-ui-chat` | `packages/client/ui-chat` | Consumer | web-app | Chat Conversation 目标 | web-app | `packages/client/ui-chat/package.json` |
| `@deepseek-ai/dsh-client-ui-commands` | `packages/client/ui-commands` | Consumer | web-app | `/` 命令 | web-app | `packages/client/ui-commands/package.json` |
| `@deepseek-ai/dsh-client-ui-conversation` | `packages/client/ui-conversation` | Consumer | web-app | 会话骨架 | web-app | `packages/client/ui-conversation/package.json` |
| `@deepseek-ai/dsh-client-ui-deliverables` | `packages/client/ui-deliverables` | Consumer | web-app | 产物尾栏 | web-app | `packages/client/ui-deliverables/package.json` |
| `@deepseek-ai/dsh-client-ui-directory-picker-browse` | `packages/client/ui-directory-picker-browse` | Consumer | 仓库有但不 shipped | 应用内目录 UI | 未点名 | `packages/client/ui-directory-picker-browse/package.json` |
| `@deepseek-ai/dsh-client-ui-directory-picker-native` | `packages/client/ui-directory-picker-native` | Consumer | 仓库有但不 shipped | 原生目录 UI | 未点名 | `packages/client/ui-directory-picker-native/package.json` |
| `@deepseek-ai/dsh-client-ui-goal` | `packages/client/ui-goal` | Consumer | web-app | GoalBar | web-app | `packages/client/ui-goal/package.json` |
| `@deepseek-ai/dsh-client-ui-input-trigger` | `packages/client/ui-input-trigger` | Consumer | web-app | `/` `@` 管线 | web-app | `packages/client/ui-input-trigger/package.json` |
| `@deepseek-ai/dsh-client-ui-jobs` | `packages/client/ui-jobs` | Consumer | web-app | job 列表 | web-app | `packages/client/ui-jobs/package.json` |
| `@deepseek-ai/dsh-client-ui-layout` | `packages/client/ui-layout` | Consumer | web-app | 三栏 AppFrame | web-app | `packages/client/ui-layout/package.json` |
| `@deepseek-ai/dsh-client-ui-message-feedback` | `packages/client/ui-message-feedback` | Consumer | web-app | 消息反馈控件 | web-app | `packages/client/ui-message-feedback/package.json` |
| `@deepseek-ai/dsh-client-ui-model-selection` | `packages/client/ui-model-selection` | Consumer | web-app | `/model` | web-app | `packages/client/ui-model-selection/package.json` |
| `@deepseek-ai/dsh-client-ui-permission-presets` | `packages/client/ui-permission-presets` | Consumer | web-app | 权限 UI | web-app | `packages/client/ui-permission-presets/package.json` |
| `@deepseek-ai/dsh-client-ui-plan` | `packages/client/ui-plan` | Consumer | web-app | plan 控件 | web-app | `packages/client/ui-plan/package.json` |
| `@deepseek-ai/dsh-client-ui-reference` | `packages/client/ui-reference` | Consumer | web-app | `@` 引用 | web-app | `packages/client/ui-reference/package.json` |
| `@deepseek-ai/dsh-client-ui-schedule` | `packages/client/ui-schedule` | Consumer | web-app | schedule UI | web-app | `packages/client/ui-schedule/package.json` |
| `@deepseek-ai/dsh-client-ui-session` | `packages/client/ui-session` | Consumer | web-app | session 面 | web-app | `packages/client/ui-session/package.json` |
| `@deepseek-ai/dsh-client-ui-settings` | `packages/client/ui-settings` | Consumer | web-app | settings 域 | web-app | `packages/client/ui-settings/package.json` |
| `@deepseek-ai/dsh-client-ui-settings-general` | `packages/client/ui-settings-general` | Consumer | web-app | General | web-app | `packages/client/ui-settings-general/package.json` |
| `@deepseek-ai/dsh-client-ui-settings-models` | `packages/client/ui-settings-models` | Consumer | web-app | Models | web-app | `packages/client/ui-settings-models/package.json` |
| `@deepseek-ai/dsh-client-ui-settings-plugin-inventory` | `packages/client/ui-settings-plugin-inventory` | Consumer | web-app | inventory tab | web-app | `packages/client/ui-settings-plugin-inventory/package.json` |
| `@deepseek-ai/dsh-client-ui-settings-plugins` | `packages/client/ui-settings-plugins` | Consumer | web-app | Plugins | web-app | `packages/client/ui-settings-plugins/package.json` |
| `@deepseek-ai/dsh-client-ui-sidebar` | `packages/client/ui-sidebar` | Consumer | web-app | 侧栏 | web-app | `packages/client/ui-sidebar/package.json` |
| `@deepseek-ai/dsh-client-ui-sidebar-right` | `packages/client/ui-sidebar-right` | Consumer | web-app | 右侧栏导航 + tab 注册表 | web-app [E: packages/bundle/web-app/cordis.patch.yml:225] | `packages/client/ui-sidebar-right/package.json` |
| `@deepseek-ai/dsh-client-ui-sidebar-documentpreview` | `packages/client/ui-sidebar-documentpreview` | Consumer | web-app | 文档预览 tab | web-app [E: packages/bundle/web-app/cordis.patch.yml:231] | `packages/client/ui-sidebar-documentpreview/package.json` |
| `@deepseek-ai/dsh-client-ui-sidebar-files` | `packages/client/ui-sidebar-files` | Consumer | web-app | 文件树 tab | web-app [E: packages/bundle/web-app/cordis.patch.yml:235] | `packages/client/ui-sidebar-files/package.json` |
| `@deepseek-ai/dsh-client-ui-skill` | `packages/client/ui-skill` | Consumer | web-app | skill UI | web-app | `packages/client/ui-skill/package.json` |
| `@deepseek-ai/dsh-client-ui-subagent` | `packages/client/ui-subagent` | Consumer | web-app | 子代理 UI | web-app | `packages/client/ui-subagent/package.json` |
| `@deepseek-ai/dsh-client-ui-theme` | `packages/client/ui-theme` | Consumer | web-app | 主题 | web-app | `packages/client/ui-theme/package.json` |
| `@deepseek-ai/dsh-client-ui-tool` | `packages/client/ui-tool` | Consumer | web-app | tool 树 | web-app | `packages/client/ui-tool/package.json` |
| `@deepseek-ai/dsh-client-ui-trajectory` | `packages/client/ui-trajectory` | Consumer | web-app | trajectory | web-app | `packages/client/ui-trajectory/package.json` |
| `@deepseek-ai/dsh-client-ui-user-questions` | `packages/client/ui-user-questions` | Consumer | web-app | 提问 UI | web-app | `packages/client/ui-user-questions/package.json` |
| `@deepseek-ai/dsh-client-ui-workflow-run` | `packages/client/ui-workflow-run` | Consumer | web-app | workflow-run 节点 | web-app | `packages/client/ui-workflow-run/package.json` |
| `@deepseek-ai/dsh-client-ui-workspace` | `packages/client/ui-workspace` | Consumer | web-app | workspace picker | web-app | `packages/client/ui-workspace/package.json` |

### extensions/（4）· sdk/（3）· acp/（1）· mcp/（1）· e2b/（3）

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-cordis-client-runner` | `packages/extensions/cordis-client-runner` | Provider | web-app | 动态插件浏览器半边 | web-app | `packages/extensions/cordis-client-runner/package.json` |
| `@deepseek-ai/dsh-cordis-host-runner` | `packages/extensions/cordis-host-runner` | Provider | web-app | 动态插件宿主半边 | web-app | `packages/extensions/cordis-host-runner/package.json` |
| `@deepseek-ai/dsh-tool-cordis` | `packages/extensions/tool-cordis` | Consumer | preset-only | `cordis_*` | 只在 cordis preset | `packages/extensions/tool-cordis/package.json` |
| `@deepseek-ai/dsh-client-ui-cordis` | `packages/extensions/ui-cordis` | Consumer | web-app | cordis 卡片 | web-app | `packages/extensions/ui-cordis/package.json` |
| `@deepseek-ai/dsh-sdk-client` | `packages/sdk/client` | library | 仓库有但不 shipped | TS SDK 客户端 | 库 | `packages/sdk/client/package.json` |
| `@deepseek-ai/dsh-sdk-protocol` | `packages/sdk/protocol` | Definition | 仓库有但不 shipped | JSON-RPC 协议 | 合同包 | `packages/sdk/protocol/package.json` |
| `@deepseek-ai/dsh-sdk-jsonrpc-server` | `packages/sdk/server` | Provider | sdk-app + sdk-minimal | stdio JSON-RPC server | overlay | `packages/sdk/server/package.json` |
| `@deepseek-ai/dsh-acp` | `packages/acp/acp` | Provider | acp-app | ACP 服务器 | acp overlay | `packages/acp/acp/package.json` |
| `@deepseek-ai/dsh-mcp-client` | `packages/mcp/mcp-client` | Consumer | 仓库有但不 shipped | MCP 桥 | 未点名 | `packages/mcp/mcp-client/package.json` |
| `@deepseek-ai/dsh-e2b` | `packages/e2b/e2b` | Provider | 仓库有但不 shipped | E2B 生命周期 | 可选 | `packages/e2b/e2b/package.json` |
| `@deepseek-ai/dsh-fs-e2b` | `packages/e2b/fs-e2b` | Provider | 仓库有但不 shipped | E2B fs | 可选 | `packages/e2b/fs-e2b/package.json` |
| `@deepseek-ai/dsh-subprocess-e2b` | `packages/e2b/subprocess-e2b` | Provider | 仓库有但不 shipped | E2B subprocess | 可选 | `packages/e2b/subprocess-e2b/package.json` |

### webhook/（2）· experimental/（9）

均不在六个 shipped bundle 的默认 yml 里（experimental profile 是 opt-in 叠加）。

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-webhook` | `packages/webhook/webhook` | Provider | 仓库有但不 shipped | `ctx.webhookRuntime` | 未点名 | `packages/webhook/webhook/package.json` |
| `@deepseek-ai/dsh-webhook-github` | `packages/webhook/webhook-github` | Consumer | 仓库有但不 shipped | GitHub 签名 HTTP 适配 | 未点名 | `packages/webhook/webhook-github/package.json` |
| `@deepseek-ai/dsh-experimental-agent-team` | `packages/experimental/agent-team` | Provider | 仓库有但不 shipped | `ctx.agentTeams` | opt-in profile | `packages/experimental/agent-team/package.json` |
| `@deepseek-ai/dsh-experimental-tool-agent-team` | `packages/experimental/tool-agent-team` | Consumer | 仓库有但不 shipped | Teams 模型工具 | opt-in | `packages/experimental/tool-agent-team/package.json` |
| `@deepseek-ai/dsh-experimental-agent-team-profile` | `packages/experimental/agent-team-profile` | bundle | 仓库有但不 shipped | Teams 私有 profile | opt-in | `packages/experimental/agent-team-profile/package.json` |
| `@deepseek-ai/dsh-experimental-agent-team-web-profile` | `packages/experimental/agent-team-web-profile` | bundle | 仓库有但不 shipped | Teams Web 层 | opt-in | `packages/experimental/agent-team-web-profile/package.json` |
| `@deepseek-ai/dsh-experimental-client-ui-agent-team` | `packages/experimental/client-ui-agent-team` | Consumer | 仓库有但不 shipped | Teams UI | opt-in | `packages/experimental/client-ui-agent-team/package.json` |
| `@deepseek-ai/dsh-experimental-inspector` | `packages/experimental/inspector` | Provider | 仓库有但不 shipped | CDP hub | experimental | `packages/experimental/inspector/package.json` |
| `@deepseek-ai/dsh-experimental-webworker-packer` | `packages/experimental/webworker-packer` | library | 仓库有但不 shipped | browser VFS packer | experimental | `packages/experimental/webworker-packer/package.json` |
| `@deepseek-ai/dsh-experimental-webworker-runtime` | `packages/experimental/webworker-runtime` | Provider | 仓库有但不 shipped | 浏览器内 harness | experimental | `packages/experimental/webworker-runtime/package.json` |
| `@deepseek-ai/dsh-experimental-code-runtime-python` | `packages/experimental/code-runtime-python` | Provider | 仓库有但不 shipped | CPython `CodeRuntime`（fd-3 JSON-lines） | 实验 Python flavor | `packages/experimental/code-runtime-python/package.json` |

### identity / runtime-diagnostics / util（15） / examples / test-support（7）

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-anonymous-user-id` | `packages/identity/anonymous-user-id` | library | 仓库有但不 shipped | 匿名用户 id | 库 | `packages/identity/anonymous-user-id/package.json` |
| `@deepseek-ai/dsh-invariants` | `packages/runtime-diagnostics/invariants` | library | 仓库有但不 shipped | invariant 注册表 | 库 | `packages/runtime-diagnostics/invariants/package.json` |
| `@deepseek-ai/dsh-atomic-write` | `packages/util/atomic-write` | library | 仓库有但不 shipped | 原子写 | 库 | `packages/util/atomic-write/package.json` |
| `@deepseek-ai/dsh-brand` | `packages/util/brand` | library | 仓库有但不 shipped | Branded 类型 | 库 | `packages/util/brand/package.json` |
| `@deepseek-ai/dsh-home-paths` | `packages/util/home-paths` | library | 仓库有但不 shipped | 路径助手 | 库 | `packages/util/home-paths/package.json` |
| `@deepseek-ai/dsh-http-proxy` | `packages/util/http-proxy` | library | 仓库有但不 shipped | 进程级 undici dispatcher；不是 Cordis 插件 | CLI `profile-boot` 调用 | `packages/util/http-proxy/package.json` |
| `@deepseek-ai/dsh-launch-environment` | `packages/util/launch-environment` | library | 仓库有但不 shipped | 启动环境记录 | 库 | `packages/util/launch-environment/package.json` |
| `@deepseek-ai/dsh-native-command` | `packages/util/native-command` | library | 仓库有但不 shipped | execFile runner | 库 | `packages/util/native-command/package.json` |
| `@deepseek-ai/dsh-output-retention` | `packages/util/output-retention` | library | 仓库有但不 shipped | 有界保留 | 库 | `packages/util/output-retention/package.json` |
| `@deepseek-ai/dsh-timeout` | `packages/util/timeout` | library | 仓库有但不 shipped | deadline 原语 | 库 | `packages/util/timeout/package.json` |
| `@deepseek-ai/dsh-util-values` | `packages/util/values` | library | 仓库有但不 shipped | 值工具 | 库 | `packages/util/values/package.json` |
| `@deepseek-ai/dsh-util-crypto` | `packages/util/crypto` | library | 仓库有但不 shipped | crypto 工具 | 库 | `packages/util/crypto/package.json` |
| `@deepseek-ai/dsh-util-time` | `packages/util/time` | library | 仓库有但不 shipped | 时间工具 | 库 | `packages/util/time/package.json` |
| `@deepseek-ai/dsh-deque` | `packages/util/deque` | library | 仓库有但不 shipped | deque | 库 | `packages/util/deque/package.json` |
| `@deepseek-ai/dsh-util-workspace-path` | `packages/util/workspace-path` | library | 仓库有但不 shipped | workspace 路径 | 库 | `packages/util/workspace-path/package.json` |
| `@deepseek-ai/dsh-chunked-list` | `packages/util/chunked-list` | library | 仓库有但不 shipped | 有界拷贝的 append-only chunked list | 库 | `packages/util/chunked-list/package.json` |
| `@deepseek-ai/dsh-package-manifest` | `packages/util/package-manifest` | library | 仓库有但不 shipped | `package.json.dsh` 字段类型 | 被 app-boot 消费 | `packages/util/package-manifest/package.json` |
| `@deepseek-ai/dsh-session-snapshot` | `packages/test-support/session-snapshot` | library | 仓库有但不 shipped | session-log snapshot + ACP adapter | testkit | `packages/test-support/session-snapshot/package.json` |
| `@deepseek-ai/dsh-agent-loop-testkit` | `packages/test-support/agent-loop-testkit` | library | 仓库有但不 shipped | loop 测试前置 | testkit | `packages/test-support/agent-loop-testkit/package.json` |
| `@deepseek-ai/dsh-client-test-runtime` | `packages/test-support/client-runtime` | library | 仓库有但不 shipped | jsdom slot 测试运行时 | 勿与已删 `dsh-client-runtime` 混淆 | `packages/test-support/client-runtime/package.json` |
| `@deepseek-ai/dsh-llm-mock-server` | `packages/test-support/llm-mock-server` | library | 仓库有但不 shipped | mock LLM HTTP | testkit | `packages/test-support/llm-mock-server/package.json` |
| `@deepseek-ai/dsh-llm-replay` | `packages/test-support/llm-replay` | library | 仓库有但不 shipped | replay LLM | testkit | `packages/test-support/llm-replay/package.json` |
| `@deepseek-ai/dsh-loader-smoke` | `packages/test-support/loader-smoke` | library | 仓库有但不 shipped | Loader smoke | testkit | `packages/test-support/loader-smoke/package.json` |
| `@deepseek-ai/dsh-remote-mock` | `packages/test-support/remote-mock` | library | 仓库有但不 shipped | Typert Remote mock | testkit | `packages/test-support/remote-mock/package.json` |

根 `examples/` 伞包与 `packages/examples/{acp-demo,jsonrpc-demo}` 已不在 git 树。

### 表外 workspace 成员

这些路径在 `pnpm-workspace.yaml` / 根 `workspaces` 里，但**不是** `packages/*/*`。[E: pnpm-workspace.yaml:3][E: pnpm-workspace.yaml:6][E: package.json:13]

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh` | `apps/cli` | app | 仓库有但不 shipped | `dsh` CLI：`--profile`、`plugin`、`dsh web` 别名 | 产品入口；`files` 只有 `lib/*.js`，不再 ship `config/` [E: apps/cli/package.json:2][E: apps/cli/package.json:17] | `apps/cli/package.json` |
| `@deepseek-ai/dsh-web-frontend` | `apps/web` | app | 仓库有但不 shipped | Vite dist | 浏览器产物 | `apps/web/package.json` |
| `@deepseek-ai/cordis` | `vendor/cordis` | library | 仓库有但不 shipped | vendored Cordis | 框架 | `vendor/cordis/package.json` |
| `@deepseek-ai/cosmokit` | `vendor/cosmokit` | library | 仓库有但不 shipped | vendored 工具 | 依赖 | `vendor/cosmokit/package.json` |
| `@deepseek-ai/cordis-plugin-group` | `vendor/group` | Provider | 仓库有但不 shipped | `cordis:group` | yml 写 kind 名 | `vendor/group/package.json` |
| `@deepseek-ai/cordis-plugin-hmr` | `vendor/hmr` | Provider | base | 模块热替换 | base `id: hmr` | `vendor/hmr/package.json` |
| `@deepseek-ai/cordis-plugin-include` | `vendor/include` | Provider | 仓库有但不 shipped | include 文件 | 非 bundle 行 | `vendor/include/package.json` |
| `@deepseek-ai/cordis-plugin-loader` | `vendor/loader` | Provider | 仓库有但不 shipped | plugin loader | boot 装载器 | `vendor/loader/package.json` |
| `@deepseek-ai/cordis-plugin-logger-console` | `vendor/logger-console` | Provider | 仓库有但不 shipped | 控制台 logger | 未点名 | `vendor/logger-console/package.json` |
| `@deepseek-ai/schemastery` | `vendor/schemastery` | library | 仓库有但不 shipped | Config schema | 库 | `vendor/schemastery/package.json` |
| `@deepseek-ai/cordis-plugin-timer` | `vendor/timer` | Provider | base | timer 服务 | base 第一行 [E: packages/bundle/base/cordis.patch.yml:17] | `vendor/timer/package.json` |
| `@deepseek-ai/website` | `website` | app | 仓库有但不 shipped | VitePress | 文档站 | `website/package.json` |
| `dsh-python-runtime-closure` | `python/sdk-runtime` | app | 仓库有但不 shipped | 单 exe / Python wheel 依赖闭包 | workspace 成员但不是 plugin 行 [E: python/sdk-runtime/package.json:2] | `python/sdk-runtime/package.json` |
| `@deepseek-ai/dsh-desktop` | `apps/desktop` | app | 仓库有但不 shipped | Electron 桌面壳 | 不是 `PROFILE_TEMPLATES` 成员 | `apps/desktop/package.json` |
| `@deepseek-ai/dsh-desktop-host` | `apps/desktop-host` | app | 仓库有但不 shipped | Electron 上游 Node host | desktop 私有进程 | `apps/desktop-host/package.json` |
| `@deepseek-ai/node-addon-system-workspace` | `native/system` | library | 仓库有但不 shipped | Landlock / flock 工作区根 | native 依赖 | `native/system/package.json` |
| `@deepseek-ai/node-addon-system` | `native/system/packages/entry` | library | 仓库有但不 shipped | 预编译 system primitives 入口 | native 依赖 | `native/system/packages/entry/package.json` |

`native/system/packages/{linux-arm64,linux-x64,darwin-arm64,darwin-x64}` 是预编译二进制包。`desktop` 不是 CLI `--profile` 模板。

## 对照 / 分家 / 装配

- **host 面 vs agent-preset 面**：base 行是进程级。web 默认产品把模型可见 Consumer 挪到 preset；headless / sdk / acp 没有 roster，同一批 Consumer 仍挂在 base。sdk-minimal 自带完整 insert，**没有** `agent-spine-demo`。
- **两个 `bash` / 两个 `pwsh`**：one-shot 在 base；persistent 在 `minimal` 与 `sdk-minimal`。minimal **没有** filesystem / `str_replace_editor`。
- **无 shipped TUI 包**：`tui` 只是自定义 profile 名。`desktop` 是 Electron 独占目录，不是第六个 CLI profile。
- **六个 bundle**：`dsh-base` / `dsh-web-app` / `dsh-headless` / `dsh-sdk-app` / `dsh-sdk-minimal` / `dsh-acp-app`。
- **`skill-badge`** 在 base 有 `name:` 但 `disabled: true`，仍算 shipped = base。[E: packages/bundle/base/cordis.patch.yml:280][E: packages/bundle/base/cordis.patch.yml:281]

## Sources

- `package.json`
- `pnpm-workspace.yaml`
- `apps/cli/package.json`
- `apps/web/package.json`
- `packages/boot/app-boot/src/profile.ts`
- `packages/preset/agent-presets/src/discovery.ts`
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
- `packages/preset/agent-presets/presets/minimal/agent.cordis.yml`
- `packages/preset/agent-presets/presets/standard/agent.cordis.yml`
- `packages/preset/agent-presets/presets/ptc/agent.cordis.yml`
- `packages/preset/agent-presets/presets/cordis/agent.cordis.yml`
- `vendor/cordis/package.json`
- `vendor/timer/package.json`
- `python/sdk-runtime/package.json`
- `website/package.json`
- `native/system/package.json`
- `native/system/packages/entry/package.json`
- `apps/desktop/package.json`
- `apps/desktop-host/package.json`

## 相关

- [spine.overview](../spine/overview.md)
- [spine.composition-boot](../spine/composition-boot.md)
- [ref.glossary](glossary.md)
- [ref.presets](presets.md)
- [surface.presets.code](../surface/presets/code.md)（PTC 预设，稳定 id）
- [subsys.core.code-mode](../subsystems/core/code-mode.md)（PTC 运行时，稳定 id）
- [subsys.host.apiproxy](../subsystems/host/apiproxy.md)（现为 Host HTTP API）
- [subsys.client.runtime](../subsystems/client/runtime.md)（现为 store + controller client）
