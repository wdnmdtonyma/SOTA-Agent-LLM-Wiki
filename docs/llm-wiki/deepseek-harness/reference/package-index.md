---
id: ref.package-index
title: monorepo 包索引
kind: reference
tier: T3
pkg: cross
source:
  - package.json
  - packages/README.md
  - packages/AGENTS.md
  - pnpm-workspace.yaml
  - apps/cli/package.json
  - apps/web/package.json
  - packages/bundle/base/package.json
  - packages/bundle/web-app/package.json
  - packages/bundle/headless/package.json
  - packages/bundle/base/cordis.patch.yml
  - packages/bundle/web-app/cordis.patch.yml
  - packages/bundle/headless/cordis.patch.yml
  - apps/cli/config/agent-presets/minimal/agent.cordis.yml
  - apps/cli/config/agent-presets/standard/agent.cordis.yml
  - apps/cli/config/agent-presets/code/agent.cordis.yml
  - apps/cli/config/agent-presets/cordis/agent.cordis.yml
  - vendor/cordis/package.json
  - vendor/cosmokit/package.json
  - vendor/group/package.json
  - vendor/hmr/package.json
  - vendor/include/package.json
  - vendor/loader/package.json
  - vendor/logger-console/package.json
  - vendor/schemastery/package.json
  - vendor/timer/package.json
  - python/sdk-runtime/package.json
  - website/package.json
  - native/landlock-run/package.json
  - native/landlock-run/packages/entry/package.json
  - native/landlock-run/packages/linux-arm64/package.json
  - native/landlock-run/packages/linux-x64/package.json
  - examples/package.json
  - packages/acp/acp/package.json
  - packages/api/gateway/package.json
  - packages/api/remotes/package.json
  - packages/attachment/attachment/package.json
  - packages/attachment/attachment-local/package.json
  - packages/boot/app-boot/package.json
  - packages/boot/cmdline/package.json
  - packages/client/connection/package.json
  - packages/client/hmr/package.json
  - packages/client/locale/package.json
  - packages/client/modules/package.json
  - packages/client/runtime/package.json
  - packages/client/schema-form/package.json
  - packages/client/ui-agent-preset/package.json
  - packages/client/ui-attachment/package.json
  - packages/client/ui-commands/package.json
  - packages/client/ui-conversation/package.json
  - packages/client/ui-deliverables/package.json
  - packages/client/ui-directory-picker-browse/package.json
  - packages/client/ui-directory-picker-native/package.json
  - packages/client/ui-goal/package.json
  - packages/client/ui-input-trigger/package.json
  - packages/client/ui-jobs/package.json
  - packages/client/ui-layout/package.json
  - packages/client/ui-message-feedback/package.json
  - packages/client/ui-model-selection/package.json
  - packages/client/ui-permission-presets/package.json
  - packages/client/ui-plan/package.json
  - packages/client/ui-primitives/package.json
  - packages/client/ui-settings/package.json
  - packages/client/ui-settings-general/package.json
  - packages/client/ui-settings-models/package.json
  - packages/client/ui-settings-plugin-inventory/package.json
  - packages/client/ui-settings-plugins/package.json
  - packages/client/ui-sidebar/package.json
  - packages/client/ui-skill/package.json
  - packages/client/ui-slots/package.json
  - packages/client/ui-subagent/package.json
  - packages/client/ui-theme/package.json
  - packages/client/ui-tool/package.json
  - packages/client/ui-trajectory/package.json
  - packages/client/ui-user-questions/package.json
  - packages/client/ui-workflow-run/package.json
  - packages/client/ui-workspace/package.json
  - packages/client/web/package.json
  - packages/client/web-react/package.json
  - packages/code-runtime/code-runtime/package.json
  - packages/code-runtime/code-runtime-worker-thread/package.json
  - packages/compaction/command-compact/package.json
  - packages/compaction/compaction/package.json
  - packages/compaction/compaction-basic/package.json
  - packages/compaction/compaction-tool-result-pruner/package.json
  - packages/context/agent-instructions/package.json
  - packages/context/session-reference/package.json
  - packages/context/time-context/package.json
  - packages/context/tmux-context/package.json
  - packages/core/agent/package.json
  - packages/core/agent-default-model/package.json
  - packages/core/agent-loop/package.json
  - packages/core/agent-tool-presentation/package.json
  - packages/core/scope/package.json
  - packages/core/session/package.json
  - packages/core/system-prompt/package.json
  - packages/core/tools/package.json
  - packages/credentials/credentials/package.json
  - packages/credentials/credentials-local/package.json
  - packages/e2b/e2b/package.json
  - packages/e2b/fs-e2b/package.json
  - packages/e2b/subprocess-e2b/package.json
  - packages/examples/acp-demo/package.json
  - packages/examples/agent-spine-demo/package.json
  - packages/examples/jsonrpc-demo/package.json
  - packages/extensions/cordis-client-runner/package.json
  - packages/extensions/cordis-host-runner/package.json
  - packages/extensions/tool-cordis/package.json
  - packages/extensions/ui-cordis/package.json
  - packages/feedback/command-feedback/package.json
  - packages/feedback/message-feedback/package.json
  - packages/fs/fs/package.json
  - packages/fs/fs-local/package.json
  - packages/fs/fs-observation-policy/package.json
  - packages/fs/fs-sandbox/package.json
  - packages/fs/tool-fs/package.json
  - packages/fs/tool-fs-search/package.json
  - packages/fs/tool-str-replace-editor/package.json
  - packages/goal/command-goal/package.json
  - packages/goal/goal/package.json
  - packages/goal/goal-round-driver/package.json
  - packages/goal/tool-goal/package.json
  - packages/guard/repeat-tool-reminder/package.json
  - packages/guard/timeout-policy/package.json
  - packages/hooks/hook-protocol/package.json
  - packages/hooks/hooks-claude-code/package.json
  - packages/hooks/hooks-codex/package.json
  - packages/host/apiproxy/package.json
  - packages/host/directory-picker/package.json
  - packages/host/directory-picker-auto/package.json
  - packages/host/directory-picker-browse/package.json
  - packages/host/directory-picker-native/package.json
  - packages/host/frontend-static/package.json
  - packages/host/plugin-inventory/package.json
  - packages/host/webserver/package.json
  - packages/identity/anonymous-user-id/package.json
  - packages/interaction/commands/package.json
  - packages/interaction/permission-presets/package.json
  - packages/interaction/tool-ask-user/package.json
  - packages/interaction/user-approval/package.json
  - packages/interaction/user-questions/package.json
  - packages/jobs/jobs/package.json
  - packages/jobs/jobs-local/package.json
  - packages/jobs/tool-jobs/package.json
  - packages/llm/llm/package.json
  - packages/llm/llm-deepseek/package.json
  - packages/llm/llm-pi-ai/package.json
  - packages/llm/llm-retry/package.json
  - packages/llm/token-meter/package.json
  - packages/lsp/lsp/package.json
  - packages/lsp/lsp-stdio/package.json
  - packages/lsp/tool-lsp/package.json
  - packages/mcp/mcp-client/package.json
  - packages/plan/plan-mode/package.json
  - packages/preset/agent-presets/package.json
  - packages/preset/persona/package.json
  - packages/runtime-diagnostics/invariants/package.json
  - packages/sandbox/sandbox/package.json
  - packages/sandbox/sandbox-local/package.json
  - packages/sandbox/sandbox-policy/package.json
  - packages/sandbox/sandbox-windows-acl/package.json
  - packages/schedule/schedule/package.json
  - packages/sdk/client/package.json
  - packages/sdk/protocol/package.json
  - packages/sdk/server/package.json
  - packages/session-query/session-log-export/package.json
  - packages/session-query/session-query/package.json
  - packages/session-query/session-query-sqlite/package.json
  - packages/session-query/tool-session-query/package.json
  - packages/session/session-checkpoint-policy/package.json
  - packages/session/session-persistence/package.json
  - packages/session/session-persistence-jsonl/package.json
  - packages/session/session-persistence-sqlite/package.json
  - packages/session/session-projection/package.json
  - packages/session/session-projection-cache/package.json
  - packages/session/session-stats/package.json
  - packages/session/session-telemetry/package.json
  - packages/session/session-telemetry-otel/package.json
  - packages/session/session-title/package.json
  - packages/session/session-title-all-prompts-llm/package.json
  - packages/session/session-title-first-prompt-llm/package.json
  - packages/session/session-title-llm/package.json
  - packages/settings/settings/package.json
  - packages/settings/settings-file/package.json
  - packages/shell/bash-local/package.json
  - packages/shell/bash-sandbox/package.json
  - packages/shell/pwsh-local/package.json
  - packages/shell/pwsh-sandbox/package.json
  - packages/shell/shell/package.json
  - packages/shell/shell-env/package.json
  - packages/shell/tool-bash/package.json
  - packages/shell/tool-bash-persistent/package.json
  - packages/shell/tool-pwsh/package.json
  - packages/skill/skill/package.json
  - packages/skill/skill-badge/package.json
  - packages/skill/skill-filesystem/package.json
  - packages/skill/tool-skill/package.json
  - packages/spill/spill/package.json
  - packages/spill/spill-local/package.json
  - packages/spill/spill-policy/package.json
  - packages/storage/storage/package.json
  - packages/storage/storage-domain/package.json
  - packages/storage/storage-json/package.json
  - packages/storage/storage-sqlite/package.json
  - packages/subagent/subagent/package.json
  - packages/subagent/subagent-acp/package.json
  - packages/subagent/subagent-claude-code/package.json
  - packages/subagent/subagent-codex/package.json
  - packages/subagent/subagent-dsh-sdk/package.json
  - packages/subagent/subagent-fork-in-process/package.json
  - packages/subagent/subagent-in-process-driver/package.json
  - packages/subagent/subagent-spawn-in-process/package.json
  - packages/subagent/tool-subagent/package.json
  - packages/subagent/tool-subagent-control/package.json
  - packages/subagent/tool-subagent-report/package.json
  - packages/subprocess/subprocess/package.json
  - packages/subprocess/subprocess-local/package.json
  - packages/terminal/terminal/package.json
  - packages/terminal/terminal-bash/package.json
  - packages/terminal/tool-terminal/package.json
  - packages/test-support/acp-snapshot/package.json
  - packages/test-support/agent-loop-testkit/package.json
  - packages/test-support/client-runtime/package.json
  - packages/test-support/llm-mock-server/package.json
  - packages/test-support/llm-replay/package.json
  - packages/test-support/loader-smoke/package.json
  - packages/todo/tool-todo/package.json
  - packages/typert/generator/package.json
  - packages/typert/loader/package.json
  - packages/typert/protocol/package.json
  - packages/typert/registry/package.json
  - packages/util/atomic-write/package.json
  - packages/util/brand/package.json
  - packages/util/home-paths/package.json
  - packages/util/launch-environment/package.json
  - packages/util/native-command/package.json
  - packages/util/output-retention/package.json
  - packages/util/timeout/package.json
  - packages/web/tool-web/package.json
  - packages/web/web/package.json
  - packages/web/web-fetch-http/package.json
  - packages/web/web-search-deepseek/package.json
  - packages/web/web-search-exa/package.json
  - packages/web/web-search-perplexity/package.json
  - packages/workflow/tool-ralph/package.json
  - packages/workflow/tool-workflow/package.json
  - packages/workflow/workflow/package.json
  - packages/workflow/workflow-worker-thread/package.json
  - packages/workspace/workspace/package.json
symbols:
  - packages/*/*
  - vendor/*
  - '@deepseek-ai/dsh-root'
  - workspaces
related:
  - spine.overview
  - ref.glossary
  - spine.composition-boot
  - ref.presets
evidence: explicit
status: verified
updated: 47f943859b
---

> monorepo 包索引把每个 workspace 包钉成一行：npm name、目录、seam 角色（Definition / Provider / Consumer / bundle / app / library）、以及它是否出现在 shipped composition（base / web-app / headless / preset-only / 仓库有但不 shipped）。DSH 是 **Cordis 组合运行时**，主线 `profile → bundle → agent preset`；有 `package.json` 不等于进了产品树。

## 能回答的问题

- `packages/*/*` 冻结树里有哪些包？某个 `@deepseek-ai/dsh-*` 落在哪个目录？
- 这个包是 Definition、Provider、Consumer，还是 bundle / app / library？
- 它出现在 `dsh-base`、`dsh-web-app`、`dsh-headless`，还是只在四个 `agent.cordis.yml`，还是仓库里有、七份 yml 都没点名？
- `apps/cli`、`vendor/*`、`examples`、`python/sdk-runtime`、`native/landlock-run` 分别是不是 build target？
- web 默认安装路径装的是哪一层？headless 会不会挂 `agent-presets`？本仓有没有 shipped TUI 包？

## 范围与 ground truth

本页是 T3 **reference**：实例 = 冻结树里每一个 `packages/<group>/<pkg>/package.json`（**219** 个），外加 workspace 里但不在该 glob 下的入口。分组是为了按 group 读，不是为了丢包。

**shipped 位置只认** 三份 bundle patch 与四份 preset composition 里的插件 `name:`（子路径导出先收成 npm name：`@scope/pkg/export` → `@scope/pkg`）：

- `packages/bundle/base/cordis.patch.yml`
- `packages/bundle/web-app/cordis.patch.yml`
- `packages/bundle/headless/cordis.patch.yml`
- `apps/cli/config/agent-presets/{minimal,standard,code,cordis}/agent.cordis.yml`

不认「目录里有 package.json」、不认 bundle `dependencies`、不认 README 表格。根 workspace 把 `packages/*/*` 收进 pnpm；那只说明能被解析，不说明进了 `dsh web` / `dsh --profile headless`。[E: package.json:2][E: package.json:13][E: pnpm-workspace.yaml:3]

`@deepseek-ai/dsh-base` 是每个 profile 的第一层 patch：`dsh.bundle.patch` 指向那份 yml，`insert` 从 `id: timer` 起铺 host 面。[E: packages/bundle/base/package.json:2][E: packages/bundle/base/package.json:38][E: packages/bundle/base/cordis.patch.yml:17]

web-app / headless **叠在 base 上**：后来的 patch 按 `id:` 整行覆盖。web-app 把一批 host 面 tool 行 `disabled: true`，再 insert `agent-presets`（`default: standard`），让每会话走 agent-preset 面。headless **不** insert roster，只加 `code-runtime` 与自己的 startup/runner；模型可见行继续坐在 base 的 host 面上。[E: packages/bundle/web-app/cordis.patch.yml:293][E: packages/bundle/web-app/cordis.patch.yml:294][E: packages/bundle/web-app/cordis.patch.yml:422][E: packages/bundle/headless/cordis.patch.yml:24][E: packages/bundle/headless/cordis.patch.yml:32]

preset-only 的例子：`dsh-persona` 四个 shipped preset 都有；`dsh-fs-local` / persistent bash 只在 `minimal`；`dsh-agent-tool-presentation` 只在 `code`；`dsh-tool-cordis` 只在 `cordis`。[E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:9][E: apps/cli/config/agent-presets/minimal/agent.cordis.yml:55][E: apps/cli/config/agent-presets/code/agent.cordis.yml:260][E: apps/cli/config/agent-presets/cordis/agent.cordis.yml:246]

角色列是 seam 三角加三类非三角包：

- **Definition** — 占 `ctx.<key>` 的合同 / 注册表词汇。
- **Provider** — 实现并 `provide` 的后端。
- **Consumer** — inject 之后登记 tool / command / UI / 策略门。
- **bundle** — `dsh.bundle.patch` 层。
- **app** — 可执行入口或 demo bin。
- **library** — 零 plugin 行的工具库、协议纯类型、testkit。这不是第五种 shipped 位置；只说明它通常不会单独出现在 patch `name:`。

官方 `packages/README.md` / `packages/AGENTS.md` 只当查漏，**不当 [E]**。T0 组合叙事在 [spine.overview](../spine/overview.md) 与 [spine.composition-boot](../spine/composition-boot.md)；preset 成员对照在 [ref.presets](presets.md)；词表在 [ref.glossary](glossary.md)。本页不写 T1 工具字段，也不把 help 例子里的 `tui` 写成 shipped profile。

列约定：`shipped` = 七份 yml 的并集标签。`base` 的包会被 web / headless **继承**（除非后来的 patch 把那一行 disabled）。web 禁用后若四个 preset 之一重新 `name:` 了同一包，`为什么` 会写 remount，`shipped` 仍记 `base`——因为它首先是 host 面的 base 行，不是 preset-only。

## 实例表

每个 `packages/*/*` 一行。`含义` 取该包 `package.json` `description` 的压缩句。

### core/（8）

产品 API 脊柱：session / tools / agent / loop。

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-agent` | `packages/core/agent` | Definition | base | Agent interface, registry, initiator scope, and event vocabulary for the DeepSeek Harness | host 面登记 ctx 键 / 注册表 | `packages/core/agent/package.json` |
| `@deepseek-ai/dsh-agent-default-model` | `packages/core/agent-default-model` | Provider | base | Default model selection shared by Agent entry points | host 面默认后端 | `packages/core/agent-default-model/package.json` |
| `@deepseek-ai/dsh-agent-loop` | `packages/core/agent-loop` | Provider | base | The concrete agent loop plugin for the DeepSeek Harness | host 面默认后端 | `packages/core/agent-loop/package.json` |
| `@deepseek-ai/dsh-agent-tool-presentation` | `packages/core/agent-tool-presentation` | Consumer | preset-only | Agent-plane presentation selector: composes one agent's tools as Code Mode, native, or both | 只在 agent-preset 面（code） [E: packages/core/agent-tool-presentation/package.json:2] | `packages/core/agent-tool-presentation/package.json` |
| `@deepseek-ai/dsh-scope` | `packages/core/scope` | library | 仓库有但不 shipped | Scoped-context registration primitive (scope tags, scope-filtered event dispatch) for the DeepSeek Harness | 被依赖的库或 testkit，不是 plugin 行 | `packages/core/scope/package.json` |
| `@deepseek-ai/dsh-session` | `packages/core/session` | Definition | base | Event-sourced session store for the DeepSeek Harness | host 面登记 ctx 键 / 注册表 | `packages/core/session/package.json` |
| `@deepseek-ai/dsh-system-prompt` | `packages/core/system-prompt` | Definition | base | System prompt assembly registry for the DeepSeek Harness | host 面登记 ctx 键 / 注册表 | `packages/core/system-prompt/package.json` |
| `@deepseek-ai/dsh-tools` | `packages/core/tools` | Definition | base | Tool registry and execution pipeline for the DeepSeek Harness | host 面登记 ctx 键 / 注册表 [E: packages/core/tools/package.json:2] | `packages/core/tools/package.json` |

### boot/（2）

launcher 与 app 之间的 boot / cmdline 胶水。

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-app-boot` | `packages/boot/app-boot` | library | 仓库有但不 shipped | Shared boot glue for the app bins: .env loading, fail-loud Loader guards, snapshot-aware config resolution,… | 被依赖的库或 testkit，不是 plugin 行 | `packages/boot/app-boot/package.json` |
| `@deepseek-ai/dsh-cmdline` | `packages/boot/cmdline` | library | 仓库有但不 shipped | Immutable command-line handoff from a dsh launcher to any app plugin that injects cmdlineArgs | 被依赖的库或 testkit，不是 plugin 行 | `packages/boot/cmdline/package.json` |

### bundle/（3）

`--profile` 的 patch 层：base → web-app 或 headless。

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-base` | `packages/bundle/base` | bundle | base | The shared dsh core as a profile bundle: every profile's first patch layer, inserting the base plugin rows … | profile 的 patch 层，不是普通 plugin 行 [E: packages/bundle/base/package.json:2] | `packages/bundle/base/package.json` |
| `@deepseek-ai/dsh-headless` | `packages/bundle/headless` | bundle | headless | The dsh one-shot bundle: a direct core Agent/Session runner over dsh-base with no Host, HTTP, or browser layer | profile 的 patch 层，不是普通 plugin 行 [E: packages/bundle/headless/package.json:2] | `packages/bundle/headless/package.json` |
| `@deepseek-ai/dsh-web-app` | `packages/bundle/web-app` | bundle | web-app | The dsh browser-surface bundle: the web patch layer over dsh-base plus the runtime glue plugin (frontend di… | profile 的 patch 层，不是普通 plugin 行 [E: packages/bundle/web-app/package.json:2] | `packages/bundle/web-app/package.json` |

### preset/（2）

agent-preset roster 与 persona。

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-agent-presets` | `packages/preset/agent-presets` | Provider | web-app | Per-session agent composition from preset cordis.yml files for the DeepSeek Harness | 只在 web-app insert 成行 [E: packages/preset/agent-presets/package.json:2] | `packages/preset/agent-presets/package.json` |
| `@deepseek-ai/dsh-persona` | `packages/preset/persona` | Consumer | preset-only | Composition-authored deployment persona section for the DeepSeek Harness | 只在 agent-preset 面（min+std+code+cordis） [E: packages/preset/persona/package.json:2] | `packages/preset/persona/package.json` |

### llm/（5）

`ctx.llm`、DeepSeek / pi-ai 适配、retry、token-meter。

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-llm` | `packages/llm/llm` | Definition | base | Provider-neutral LLM service interface for the DeepSeek Harness | host 面登记 ctx 键 / 注册表 | `packages/llm/llm/package.json` |
| `@deepseek-ai/dsh-llm-deepseek` | `packages/llm/llm-deepseek` | Provider | base | DeepSeek chat-completions adapter for the DeepSeek Harness LLM seam | host 面默认后端 | `packages/llm/llm-deepseek/package.json` |
| `@deepseek-ai/dsh-llm-pi-ai` | `packages/llm/llm-pi-ai` | Provider | base | pi-ai-backed DeepSeek adapter for the DeepSeek Harness LLM seam (design-verification twin of dsh-llm-deepseek) | host 面默认后端 | `packages/llm/llm-pi-ai/package.json` |
| `@deepseek-ai/dsh-llm-retry` | `packages/llm/llm-retry` | Provider | base | Provider-routed LLM request retry policy for the DeepSeek Harness | host 面默认后端 | `packages/llm/llm-retry/package.json` |
| `@deepseek-ai/dsh-token-meter` | `packages/llm/token-meter` | Provider | base | Replay-aware token measurement service (ctx.tokenMeter) for the DeepSeek Harness | host 面默认后端 | `packages/llm/token-meter/package.json` |

### fs/（7）

`ctx.fs` 家族：合同、本地/沙箱 Provider、文件工具。

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-fs` | `packages/fs/fs` | Definition | 仓库有但不 shipped | Abstract filesystem capability seam (ctx.fs) for the DeepSeek Harness — vocabulary types, the FileSystem se… | seam 合同包，不单独占 composition 行 [E: packages/fs/fs/package.json:2] | `packages/fs/fs/package.json` |
| `@deepseek-ai/dsh-fs-local` | `packages/fs/fs-local` | Provider | preset-only | Local-filesystem implementation of the DeepSeek Harness filesystem seam (ctx.fs) | 只在 agent.cordis.yml（min） | `packages/fs/fs-local/package.json` |
| `@deepseek-ai/dsh-fs-observation-policy` | `packages/fs/fs-observation-policy` | Consumer | base | File-context policy plugin for the DeepSeek Harness — observed-state, read-before-edit, and version-guarded… | host 面 Consumer | `packages/fs/fs-observation-policy/package.json` |
| `@deepseek-ai/dsh-fs-sandbox` | `packages/fs/fs-sandbox` | Provider | base | Sandbox-enforcing implementation of the DeepSeek Harness filesystem seam: fences write/edit by the per-call… | host 面默认后端 [E: packages/fs/fs-sandbox/package.json:2] | `packages/fs/fs-sandbox/package.json` |
| `@deepseek-ai/dsh-tool-fs` | `packages/fs/tool-fs` | Consumer | base | Model-facing filesystem tools (read, write, edit) over the DeepSeek Harness filesystem seam (ctx.fs) | host 面 Consumer；web 宿主 disabled 后由 preset(std+code+cordis) 重挂 | `packages/fs/tool-fs/package.json` |
| `@deepseek-ai/dsh-tool-fs-search` | `packages/fs/tool-fs-search` | Consumer | base | Model-facing filesystem discovery tools (glob, grep) backed by the packaged ripgrep binary (@vscode/ripgrep) | host 面 Consumer；web 宿主 disabled 后由 preset(std+code+cordis) 重挂 | `packages/fs/tool-fs-search/package.json` |
| `@deepseek-ai/dsh-tool-str-replace-editor` | `packages/fs/tool-str-replace-editor` | Consumer | base | Model-facing view, create, literal replace, and line insert tool over the Harness filesystem service | host 面 Consumer；web 宿主 disabled 后由 preset(min) 重挂 | `packages/fs/tool-str-replace-editor/package.json` |

### shell/（9）

`ctx.shell`、bash/pwsh 后端、两个 `bash` Consumer。

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-bash-local` | `packages/shell/bash-local` | Provider | 仓库有但不 shipped | Local-subprocess implementation of the DeepSeek Harness bash executor seam | 可选后端，七份 yml 无 name 行 | `packages/shell/bash-local/package.json` |
| `@deepseek-ai/dsh-bash-sandbox` | `packages/shell/bash-sandbox` | Provider | base | Sandbox-consuming implementation of the DeepSeek Harness bash executor seam (confines every command via ctx… | host 面默认后端 | `packages/shell/bash-sandbox/package.json` |
| `@deepseek-ai/dsh-pwsh-local` | `packages/shell/pwsh-local` | Provider | 仓库有但不 shipped | Local PowerShell implementation of the DeepSeek Harness bash executor seam | 可选后端，七份 yml 无 name 行 | `packages/shell/pwsh-local/package.json` |
| `@deepseek-ai/dsh-pwsh-sandbox` | `packages/shell/pwsh-sandbox` | Provider | base | Sandbox-consuming implementation of the DeepSeek Harness PowerShell executor seam (confines every command v… | host 面默认后端 | `packages/shell/pwsh-sandbox/package.json` |
| `@deepseek-ai/dsh-shell` | `packages/shell/shell` | Definition | 仓库有但不 shipped | Abstract bash executor seam (ctx.shell) for the DeepSeek Harness | seam 合同包，不单独占 composition 行 | `packages/shell/shell/package.json` |
| `@deepseek-ai/dsh-shell-env` | `packages/shell/shell-env` | Provider | base | Tool-independent managed DSH_* shell environment registry | host 面默认后端 | `packages/shell/shell-env/package.json` |
| `@deepseek-ai/dsh-tool-bash` | `packages/shell/tool-bash` | Consumer | base | Model-facing bash tool with optional generic background-job and sandbox-escalation support | host 面 Consumer；web 宿主 disabled 后由 preset(std+code+cordis) 重挂 [E: packages/shell/tool-bash/package.json:2] | `packages/shell/tool-bash/package.json` |
| `@deepseek-ai/dsh-tool-bash-persistent` | `packages/shell/tool-bash-persistent` | Consumer | preset-only | Model-facing owner-scoped persistent Bash tool backed by the Harness PTY service | 只在 agent-preset 面（min） [E: packages/shell/tool-bash-persistent/package.json:2] | `packages/shell/tool-bash-persistent/package.json` |
| `@deepseek-ai/dsh-tool-pwsh` | `packages/shell/tool-pwsh` | Consumer | base | Model-facing pwsh tool over the bash executor seam | host 面 Consumer；web 宿主 disabled 后由 preset(std+code+cordis) 重挂 | `packages/shell/tool-pwsh/package.json` |

### subprocess/（2）

`ctx.subprocess` 合同与本地进程树。

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-subprocess` | `packages/subprocess/subprocess` | Definition | 仓库有但不 shipped | Subprocess seam (ctx.subprocess) for the DeepSeek Harness — managed process groups, bounded spill-backed ou… | seam 合同包，不单独占 composition 行 | `packages/subprocess/subprocess/package.json` |
| `@deepseek-ai/dsh-subprocess-local` | `packages/subprocess/subprocess-local` | Provider | base | Local-subprocess implementation of the DeepSeek Harness subprocess seam | host 面默认后端 | `packages/subprocess/subprocess-local/package.json` |

### sandbox/（4）

进程隔离 seam 与本地 / Windows ACL 后端。

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-sandbox` | `packages/sandbox/sandbox` | Definition | 仓库有但不 shipped | Abstract process-sandbox seam (ctx.sandbox) for the DeepSeek Harness: same-world confinement vocabulary and… | seam 合同包，不单独占 composition 行 | `packages/sandbox/sandbox/package.json` |
| `@deepseek-ai/dsh-sandbox-local` | `packages/sandbox/sandbox-local` | Provider | base | Local process-sandbox backends for the DeepSeek Harness sandbox seam: bwrap, the npm-distributed landlock-r… | host 面默认后端 | `packages/sandbox/sandbox-local/package.json` |
| `@deepseek-ai/dsh-sandbox-policy` | `packages/sandbox/sandbox-policy` | Provider | base | Per-call sandbox policy resolver and current model context: deployment fallbacks plus each session's mode a… | host 面默认后端 | `packages/sandbox/sandbox-policy/package.json` |
| `@deepseek-ai/dsh-sandbox-windows-acl` | `packages/sandbox/sandbox-windows-acl` | Provider | 仓库有但不 shipped | Windows ACL write-restriction sandbox backend (restricted-token spawn with capability-SID write allowlist) … | 可选后端，七份 yml 无 name 行 | `packages/sandbox/sandbox-windows-acl/package.json` |

### terminal/（3）

持久 PTY：Definition、bash 后端、`terminal_*` 工具。

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-terminal` | `packages/terminal/terminal` | Definition | preset-only | Persistent PTY session seam for the DeepSeek Harness — owner-scoped ids, backend registry, interactive send… | Definition · preset-only（min） | `packages/terminal/terminal/package.json` |
| `@deepseek-ai/dsh-terminal-bash` | `packages/terminal/terminal-bash` | Provider | preset-only | Persistent shell PTY backend over the DeepSeek Harness subprocess terminal primitive | 只在 agent.cordis.yml（min） | `packages/terminal/terminal-bash/package.json` |
| `@deepseek-ai/dsh-tool-terminal` | `packages/terminal/tool-terminal` | Consumer | 仓库有但不 shipped | Six model-facing persistent PTY tools with owner isolation and generic background-job integration | 库存 Consumer，shipped composition 未点名 | `packages/terminal/tool-terminal/package.json` |

### code-runtime/（2）

Code Mode 执行世界：Definition + worker-thread Provider。

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-code-runtime` | `packages/code-runtime/code-runtime` | Definition | 仓库有但不 shipped | Abstract code-execution seam (ctx.codeRuntime) for the DeepSeek Harness | seam 合同包，不单独占 composition 行 | `packages/code-runtime/code-runtime/package.json` |
| `@deepseek-ai/dsh-code-runtime-worker-thread` | `packages/code-runtime/code-runtime-worker-thread` | Provider | web-app + headless | Worker-thread implementation of the DeepSeek Harness code-execution seam | web / headless overlay 才 insert | `packages/code-runtime/code-runtime-worker-thread/package.json` |

### lsp/（3）

LSP seam、stdio Provider、`lsp` 工具。

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-lsp` | `packages/lsp/lsp` | Definition | 仓库有但不 shipped | Abstract LSP capability seam (ctx.lsp) for the DeepSeek Harness — language-server provider registry keyed b… | seam 合同包，不单独占 composition 行 | `packages/lsp/lsp/package.json` |
| `@deepseek-ai/dsh-lsp-stdio` | `packages/lsp/lsp-stdio` | Provider | 仓库有但不 shipped | Generic stdio language-server provider for the DeepSeek Harness LSP capability seam (ctx.lsp) — spawns conf… | 可选后端，七份 yml 无 name 行 | `packages/lsp/lsp-stdio/package.json` |
| `@deepseek-ai/dsh-tool-lsp` | `packages/lsp/tool-lsp` | Consumer | 仓库有但不 shipped | Model-facing lsp tool over the DeepSeek Harness LSP capability seam (ctx.lsp) — one read-only tool with goT… | 库存 Consumer，shipped composition 未点名 | `packages/lsp/tool-lsp/package.json` |

### skill/（4）

skill 注册表、文件系统发现、`skill` 工具。

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-skill` | `packages/skill/skill` | Definition | base | Agent skill provider registry for the DeepSeek Harness | host 面登记 ctx 键 / 注册表 | `packages/skill/skill/package.json` |
| `@deepseek-ai/dsh-skill-badge` | `packages/skill/skill-badge` | Provider | base | Bundled dsh badge skill provider for DeepSeek Harness | base 有 `name:` 行但 `disabled: true`，默认不激活 | `packages/skill/skill-badge/package.json` |
| `@deepseek-ai/dsh-skill-filesystem` | `packages/skill/skill-filesystem` | Provider | base | Local filesystem skill provider for the DeepSeek Harness | host 面默认后端；web 宿主 disabled 后由 preset(std+code+cordis) 重挂 | `packages/skill/skill-filesystem/package.json` |
| `@deepseek-ai/dsh-tool-skill` | `packages/skill/tool-skill` | Consumer | base | Model-facing skill loading tool for the DeepSeek Harness | host 面 Consumer；web 宿主 disabled 后由 preset(std+code+cordis) 重挂 | `packages/skill/tool-skill/package.json` |

### compaction/（4）

压缩 seam、basic 后端、tool-result 剪枝、`/compact`。

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-command-compact` | `packages/compaction/command-compact` | Consumer | base | Human-facing slash command for explicit session compaction | host 面 Consumer；web 宿主 disabled 后由 preset(std+code+cordis) 重挂 | `packages/compaction/command-compact/package.json` |
| `@deepseek-ai/dsh-compaction` | `packages/compaction/compaction` | Definition | 仓库有但不 shipped | Abstract compaction service seam (ctx.compaction) for the DeepSeek Harness | seam 合同包，不单独占 composition 行 | `packages/compaction/compaction/package.json` |
| `@deepseek-ai/dsh-compaction-basic` | `packages/compaction/compaction-basic` | Provider | base | Token-meter-driven compaction policy and LLM summarization backend for the DeepSeek Harness | host 面默认后端；web 宿主 disabled 后由 preset(std+code+cordis) 重挂 | `packages/compaction/compaction-basic/package.json` |
| `@deepseek-ai/dsh-compaction-tool-result-pruner` | `packages/compaction/compaction-tool-result-pruner` | Provider | base | Replay-safe model-free head/middle/tail pruning for tool-result surface nodes | host 面默认后端；web 宿主 disabled 后由 preset(std+code+cordis) 重挂 | `packages/compaction/compaction-tool-result-pruner/package.json` |

### context/（4）

工作区指令与逐步 context 段。

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-agent-instructions` | `packages/context/agent-instructions` | Consumer | base | Workspace context loader for AGENTS.md/CLAUDE.md instruction files | host 面 Consumer；web 宿主 disabled 后由 preset(std+code+cordis) 重挂 | `packages/context/agent-instructions/package.json` |
| `@deepseek-ai/dsh-session-reference` | `packages/context/session-reference` | Provider | 仓库有但不 shipped | Cross-session snapshot references and durable untrusted model context (ctx.sessionReferenceResolver) | 可选后端，七份 yml 无 name 行 | `packages/context/session-reference/package.json` |
| `@deepseek-ai/dsh-time-context` | `packages/context/time-context` | Consumer | 仓库有但不 shipped | Opt-in durable per-step context with the current time and elapsed time | 库存 Consumer，shipped composition 未点名 | `packages/context/time-context/package.json` |
| `@deepseek-ai/dsh-tmux-context` | `packages/context/tmux-context` | Consumer | 仓库有但不 shipped | Opt-in durable per-step context with this agent's tmux pane and window location | 库存 Consumer，shipped composition 未点名 | `packages/context/tmux-context/package.json` |

### guard/（2）

重复调用提醒与 tool deadline。

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-repeat-tool-reminder` | `packages/guard/repeat-tool-reminder` | Consumer | base | Repeat-tool-call guard plugin: advisory reminders when an agent loops on identical tool calls | host 面 Consumer | `packages/guard/repeat-tool-reminder/package.json` |
| `@deepseek-ai/dsh-tool-call-timeout-policy` | `packages/guard/timeout-policy` | Consumer | base | Tool-call timeout policy: a tools/execute wrapper that arms a per-tool deadline on exec.signal and returns … | host 面 Consumer | `packages/guard/timeout-policy/package.json` |

### subagent/（11）

委托注册表、in-process / 产品 Provider、委托工具。

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-subagent` | `packages/subagent/subagent` | Definition | base | Abstract subagent seam (ctx.subagents): named-provider registry for delegating to child agents | host 面登记 ctx 键 / 注册表 | `packages/subagent/subagent/package.json` |
| `@deepseek-ai/dsh-subagent-acp` | `packages/subagent/subagent-acp` | Provider | 仓库有但不 shipped | Out-of-process ACP subagent backend: drives a child agent in a spawned subprocess over the Agent Client Pro… | 可选后端，七份 yml 无 name 行 | `packages/subagent/subagent-acp/package.json` |
| `@deepseek-ai/dsh-subagent-claude-code` | `packages/subagent/subagent-claude-code` | Provider | 仓库有但不 shipped | One-shot Claude Code subagent provider over the official Agent SDK | 可选后端，七份 yml 无 name 行 | `packages/subagent/subagent-claude-code/package.json` |
| `@deepseek-ai/dsh-subagent-codex` | `packages/subagent/subagent-codex` | Provider | 仓库有但不 shipped | One-shot Codex subagent provider over the official app-server protocol | 可选后端，七份 yml 无 name 行 | `packages/subagent/subagent-codex/package.json` |
| `@deepseek-ai/dsh-subagent-dsh-sdk` | `packages/subagent/subagent-dsh-sdk` | Provider | 仓库有但不 shipped | Out-of-process SDK subagent backend: drives a child DeepSeek Harness runtime subprocess over stdio JSON-RPC… | 可选后端，七份 yml 无 name 行 | `packages/subagent/subagent-dsh-sdk/package.json` |
| `@deepseek-ai/dsh-subagent-fork-in-process` | `packages/subagent/subagent-fork-in-process` | Provider | base | In-process fork subagent backend: runs a child agent seeded with a prefix of the parent's log | host 面默认后端 | `packages/subagent/subagent-fork-in-process/package.json` |
| `@deepseek-ai/dsh-subagent-in-process-driver` | `packages/subagent/subagent-in-process-driver` | library | 仓库有但不 shipped | Shared in-process subagent run driver: drives a child agent on ctx.agents (used by the spawn and fork backe… | 被依赖的库或 testkit，不是 plugin 行 | `packages/subagent/subagent-in-process-driver/package.json` |
| `@deepseek-ai/dsh-subagent-spawn-in-process` | `packages/subagent/subagent-spawn-in-process` | Provider | base | In-process spawn subagent backend: runs a fresh child agent on ctx.agents | host 面默认后端 | `packages/subagent/subagent-spawn-in-process/package.json` |
| `@deepseek-ai/dsh-tool-subagent` | `packages/subagent/tool-subagent` | Consumer | base | Model-facing subagent delegation tool over the ctx.subagents seam | host 面 Consumer；web 宿主 disabled 后由 preset(std+code+cordis) 重挂 | `packages/subagent/tool-subagent/package.json` |
| `@deepseek-ai/dsh-tool-subagent-control` | `packages/subagent/tool-subagent-control` | Consumer | base | Globally named send_message, interrupt_agent, and list_agents tools over ctx.subagents continuations | host 面 Consumer；web 宿主 disabled 后由 preset(std+code+cordis) 重挂 | `packages/subagent/tool-subagent-control/package.json` |
| `@deepseek-ai/dsh-tool-subagent-report` | `packages/subagent/tool-subagent-report` | Consumer | base | Child-scoped report tool over ctx.subagents continuations | host 面 Consumer | `packages/subagent/tool-subagent-report/package.json` |

### jobs/（3）

后台 job 注册表与 `job_*`。

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-jobs` | `packages/jobs/jobs` | Definition | 仓库有但不 shipped | Background job registry (ctx.jobs) for the DeepSeek Harness — shared ids, owner isolation, polling, cancell… | seam 合同包，不单独占 composition 行 | `packages/jobs/jobs/package.json` |
| `@deepseek-ai/dsh-jobs-local` | `packages/jobs/jobs-local` | Provider | base | Process-local implementation of the DeepSeek Harness background job registry seam | host 面默认后端 | `packages/jobs/jobs-local/package.json` |
| `@deepseek-ai/dsh-tool-jobs` | `packages/jobs/tool-jobs` | Consumer | base | Model-facing background job control tools (job_output, job_list, job_kill) over the ctx.jobs registry | host 面 Consumer；web 宿主 disabled 后由 preset(std+code+cordis) 重挂 | `packages/jobs/tool-jobs/package.json` |

### workflow/（4）

workflow seam、worker-thread 引擎、`workflow` / `ralph`。

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-tool-ralph` | `packages/workflow/tool-ralph` | Consumer | base | Model-facing fresh-agent Ralph loop over the workflow and subagent seams | host 面 Consumer；web 宿主 disabled 后由 preset(std+code+cordis) 重挂 | `packages/workflow/tool-ralph/package.json` |
| `@deepseek-ai/dsh-tool-workflow` | `packages/workflow/tool-workflow` | Consumer | base | Model-facing workflow tool: run a JavaScript orchestration script over ctx.workflowEngine | host 面 Consumer；web 宿主 disabled 后由 preset(std+code+cordis) 重挂 | `packages/workflow/tool-workflow/package.json` |
| `@deepseek-ai/dsh-workflow` | `packages/workflow/workflow` | Definition | 仓库有但不 shipped | Workflow capability seam: ctx.workflowEngine service, run vocabulary, and workflow/* events | seam 合同包，不单独占 composition 行 | `packages/workflow/workflow/package.json` |
| `@deepseek-ai/dsh-workflow-worker-thread` | `packages/workflow/workflow-worker-thread` | Provider | base | worker-thread workflow engine: executes model-written orchestration scripts off the host event loop, bridgi… | host 面默认后端；web 宿主 disabled 后由 preset(std+code+cordis) 重挂 | `packages/workflow/workflow-worker-thread/package.json` |

### goal/（4）

同会话 goal 域、driver、tool、`/goal`。

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-command-goal` | `packages/goal/command-goal` | Consumer | base | Human-facing slash command for persisted same-session goals | host 面 Consumer | `packages/goal/command-goal/package.json` |
| `@deepseek-ai/dsh-goal` | `packages/goal/goal` | Definition | base | Event-sourced same-session goal state and lifecycle service for the DeepSeek Harness | host 面登记 ctx 键 / 注册表 | `packages/goal/goal/package.json` |
| `@deepseek-ai/dsh-goal-round-driver` | `packages/goal/goal-round-driver` | Provider | base | Race-fenced same-session goal-round driver | host 面默认后端 | `packages/goal/goal-round-driver/package.json` |
| `@deepseek-ai/dsh-tool-goal` | `packages/goal/tool-goal` | Consumer | base | Model-facing same-session goal tools with execution-time authority checks | host 面 Consumer；web 宿主 disabled 后由 preset(std+code+cordis) 重挂 | `packages/goal/tool-goal/package.json` |

### plan/（1）

plan mode 状态与 `exit_plan_mode`。

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-plan-mode` | `packages/plan/plan-mode` | Provider | base | Logged per-agent plan mode with deployment guidance, a direct slash command, and a user-reviewed exit | host 面默认后端；web 宿主 disabled 后由 preset(std+code+cordis) 重挂 | `packages/plan/plan-mode/package.json` |

### schedule/（1）

会话内定时 follow-up（模型可见 `schedule_*`）。

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-schedule` | `packages/schedule/schedule` | Provider | 仓库有但不 shipped | Agent-scoped durable after, at, and fixed-rate reminders over the session event log | 可选后端，七份 yml 无 name 行 | `packages/schedule/schedule/package.json` |

### todo/（1）

`todo_write`。

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-tool-todo` | `packages/todo/tool-todo` | Consumer | base | Model-facing todo_write tool over the DeepSeek Harness event-sourced session log | host 面 Consumer；web 宿主 disabled 后由 preset(std+code+cordis) 重挂 | `packages/todo/tool-todo/package.json` |

### web/（6）

`ctx.web`、search/fetch Provider、`web_search` / `web_fetch`。

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-tool-web` | `packages/web/tool-web` | Consumer | base | Model-facing web tools (web_search, web_fetch) over the DeepSeek Harness web capability seam (ctx.web) | host 面 Consumer；web 宿主 disabled 后由 preset(std+code+cordis) 重挂 | `packages/web/tool-web/package.json` |
| `@deepseek-ai/dsh-web` | `packages/web/web` | Definition | base | Abstract web access capability seam (ctx.web) for the DeepSeek Harness — search/fetch provider registry, re… | host 面登记 ctx 键 / 注册表 | `packages/web/web/package.json` |
| `@deepseek-ai/dsh-web-fetch-http` | `packages/web/web-fetch-http` | Provider | 仓库有但不 shipped | Anonymous public HTTP(S) fetch provider for the DeepSeek Harness web capability seam (ctx.web) | 可选后端，七份 yml 无 name 行 | `packages/web/web-fetch-http/package.json` |
| `@deepseek-ai/dsh-web-search-deepseek` | `packages/web/web-search-deepseek` | Provider | base | DeepSeek-backed search provider (native web_search via the Anthropic-compatible API) for the DeepSeek Harne… | host 面默认后端 | `packages/web/web-search-deepseek/package.json` |
| `@deepseek-ai/dsh-web-search-exa` | `packages/web/web-search-exa` | Provider | 仓库有但不 shipped | Exa-backed search provider for the DeepSeek Harness web capability seam (ctx.web) | 可选后端，七份 yml 无 name 行 | `packages/web/web-search-exa/package.json` |
| `@deepseek-ai/dsh-web-search-perplexity` | `packages/web/web-search-perplexity` | Provider | 仓库有但不 shipped | Perplexity-backed search provider for the DeepSeek Harness web capability seam (ctx.web) | 可选后端，七份 yml 无 name 行 | `packages/web/web-search-perplexity/package.json` |

### attachment/（2）

附件 identity / 本地内容寻址存储。

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-attachment` | `packages/attachment/attachment` | Definition | 仓库有但不 shipped | Durable immutable attachment storage seam for the DeepSeek Harness | seam 合同包，不单独占 composition 行 | `packages/attachment/attachment/package.json` |
| `@deepseek-ai/dsh-attachment-local` | `packages/attachment/attachment-local` | Provider | base | Private content-addressed DSH_HOME attachment storage | host 面默认后端 | `packages/attachment/attachment-local/package.json` |

### spill/（3）

超大 tool 文本外溢。

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-spill` | `packages/spill/spill` | Definition | 仓库有但不 shipped | Abstract spill storage seam (ctx.spillStore) for the DeepSeek Harness — save oversized tool text and return… | seam 合同包，不单独占 composition 行 | `packages/spill/spill/package.json` |
| `@deepseek-ai/dsh-spill-local` | `packages/spill/spill-local` | Provider | base | Local-filesystem implementation of the DeepSeek Harness spill storage seam (private session-scoped files) | host 面默认后端 | `packages/spill/spill-local/package.json` |
| `@deepseek-ai/dsh-spill-policy` | `packages/spill/spill-policy` | Consumer | base | Tool-result spill policy for the DeepSeek Harness — replaces oversized plain-text tool results with a retai… | host 面 Consumer | `packages/spill/spill-policy/package.json` |

### session/（13）

持久化、投影、标题、telemetry、checkpoint。

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-session-checkpoint-policy` | `packages/session/session-checkpoint-policy` | Consumer | base | Semantic session durability checkpoints before model requests and tool side effects | host 面 Consumer | `packages/session/session-checkpoint-policy/package.json` |
| `@deepseek-ai/dsh-session-persistence` | `packages/session/session-persistence` | Definition | 仓库有但不 shipped | Abstract durable session persistence seam (ctx.sessionPersistence) for the DeepSeek Harness | seam 合同包，不单独占 composition 行 | `packages/session/session-persistence/package.json` |
| `@deepseek-ai/dsh-session-persistence-jsonl` | `packages/session/session-persistence-jsonl` | Provider | base | JSONL durable session persistence backend for the DeepSeek Harness | host 面默认后端 | `packages/session/session-persistence-jsonl/package.json` |
| `@deepseek-ai/dsh-session-persistence-sqlite` | `packages/session/session-persistence-sqlite` | Provider | 仓库有但不 shipped | SQLite durable session persistence backend for the DeepSeek Harness | 可选后端，七份 yml 无 name 行 | `packages/session/session-persistence-sqlite/package.json` |
| `@deepseek-ai/dsh-session-projection` | `packages/session/session-projection` | Definition | base | Session-projection seam: the merge-extensible projection type table, the provider contract, and the ctx.ses… | host 面登记 ctx 键 / 注册表 | `packages/session/session-projection/package.json` |
| `@deepseek-ai/dsh-session-projection-cache` | `packages/session/session-projection-cache` | Provider | web-app | Persisted projection cache (ctx.sessionProjectionCache): durable per-session projection checkpoints over th… | 只在 web-app insert 成行 | `packages/session/session-projection-cache/package.json` |
| `@deepseek-ai/dsh-session-stats` | `packages/session/session-stats` | Provider | web-app | Whole-log conversation counts and wall times projection (sessionStats) for the DeepSeek Harness | 只在 web-app insert 成行 | `packages/session/session-stats/package.json` |
| `@deepseek-ai/dsh-session-telemetry` | `packages/session/session-telemetry` | Definition | 仓库有但不 shipped | SessionTelemetryBackend seam for the DeepSeek Harness: session-event capture, projection, redaction, and ha… | seam 合同包，不单独占 composition 行 | `packages/session/session-telemetry/package.json` |
| `@deepseek-ai/dsh-session-telemetry-otel` | `packages/session/session-telemetry-otel` | Provider | base | OpenTelemetry backend for the DeepSeek Harness telemetry seam: hands captured session records to the OTel J… | host 面默认后端 | `packages/session/session-telemetry-otel/package.json` |
| `@deepseek-ai/dsh-session-title` | `packages/session/session-title` | Definition | base | Log-backed session title service and provider registry for the DeepSeek Harness | host 面登记 ctx 键 / 注册表 | `packages/session/session-title/package.json` |
| `@deepseek-ai/dsh-session-title-all-prompts-llm` | `packages/session/session-title-all-prompts-llm` | Provider | 仓库有但不 shipped | All-user-messages LLM provider plugin for DeepSeek Harness session titles | 可选后端，七份 yml 无 name 行 | `packages/session/session-title-all-prompts-llm/package.json` |
| `@deepseek-ai/dsh-session-title-first-prompt-llm` | `packages/session/session-title-first-prompt-llm` | Provider | base | First-message LLM provider plugin for DeepSeek Harness session titles | host 面默认后端 | `packages/session/session-title-first-prompt-llm/package.json` |
| `@deepseek-ai/dsh-session-title-llm` | `packages/session/session-title-llm` | library | 仓库有但不 shipped | Shared LLM generation policy for DeepSeek Harness session-title providers | 被依赖的库或 testkit，不是 plugin 行 | `packages/session/session-title-llm/package.json` |

### session-query/（4）

会话检索合同、SQLite 后端、导出、模型可见查询工具。

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-session-log-export` | `packages/session-query/session-log-export` | Consumer | web-app | Web Session-log export command and shared download dialog | web 浏览器面插件行 | `packages/session-query/session-log-export/package.json` |
| `@deepseek-ai/dsh-session-query` | `packages/session-query/session-query` | Definition | 仓库有但不 shipped | Combined session query service contract with concrete reads, traces, and filters | seam 合同包，不单独占 composition 行 | `packages/session-query/session-query/package.json` |
| `@deepseek-ai/dsh-session-query-sqlite` | `packages/session-query/session-query-sqlite` | Provider | base | Concrete ctx.sessionQuery backend with SQLite FTS5 search | host 面默认后端 | `packages/session-query/session-query-sqlite/package.json` |
| `@deepseek-ai/dsh-tool-session-query` | `packages/session-query/tool-session-query` | Consumer | 仓库有但不 shipped | Workspace-authorized model-facing session history search, trace, and event read tools | 库存 Consumer，shipped composition 未点名 | `packages/session-query/tool-session-query/package.json` |

### settings/（2）

用户设置 seam + `settings.yaml`。

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-settings` | `packages/settings/settings` | Definition | 仓库有但不 shipped | Abstract user-settings seam (ctx.settings) for the DeepSeek Harness | seam 合同包，不单独占 composition 行 | `packages/settings/settings/package.json` |
| `@deepseek-ai/dsh-settings-file` | `packages/settings/settings-file` | Provider | base | File-backed settings provider (settings.yaml) for the DeepSeek Harness | host 面默认后端 | `packages/settings/settings-file/package.json` |

### credentials/（2）

密钥引用 seam + 本地 Provider。

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-credentials` | `packages/credentials/credentials` | Definition | 仓库有但不 shipped | Abstract credential seam (ctx.credentials): settings carry references to secrets, providers own the values | seam 合同包，不单独占 composition 行 | `packages/credentials/credentials/package.json` |
| `@deepseek-ai/dsh-credentials-local` | `packages/credentials/credentials-local` | Provider | base | File-backed credentials provider ($DSH_HOME/.env under the live process environment) for the DeepSeek Harness | host 面默认后端 | `packages/credentials/credentials-local/package.json` |

### storage/（4）

非会话存储枢纽与后端。

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-storage` | `packages/storage/storage` | Definition | web-app | Storage hub (ctx.storage): named backend registry plus mounted data-form facilities for the DeepSeek Harness | Definition · web-app | `packages/storage/storage/package.json` |
| `@deepseek-ai/dsh-storage-domain` | `packages/storage/storage-domain` | Provider | web-app | Domain data form (ctx.storage.domain): schema-validated, event-emitting KV domains over storage backends fo… | 只在 web-app insert 成行 | `packages/storage/storage-domain/package.json` |
| `@deepseek-ai/dsh-storage-json` | `packages/storage/storage-json` | Provider | web-app | JSON file KV storage backend for the DeepSeek Harness storage hub | 只在 web-app insert 成行 | `packages/storage/storage-json/package.json` |
| `@deepseek-ai/dsh-storage-sqlite` | `packages/storage/storage-sqlite` | Provider | 仓库有但不 shipped | SQLite storage backend (kv facet) for the DeepSeek Harness storage hub | 可选后端，七份 yml 无 name 行 | `packages/storage/storage-sqlite/package.json` |

### workspace/（1）

workspace 实体注册表。

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-workspace` | `packages/workspace/workspace` | Provider | web-app | Workspace entity registry (ctx.workspaceRegistry): durable workspace records with validated session attachm… | 只在 web-app insert 成行 | `packages/workspace/workspace/package.json` |

### interaction/（5）

人命令、审批、提问、权限预设。

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-commands` | `packages/interaction/commands` | Definition | base | Plugin-owned human command registry for DeepSeek Harness UIs | host 面登记 ctx 键 / 注册表 | `packages/interaction/commands/package.json` |
| `@deepseek-ai/dsh-permission-presets` | `packages/interaction/permission-presets` | Provider | base | User-facing permission presets (ctx.permissionPresets) for the DeepSeek Harness: one product-level Permissi… | host 面默认后端 | `packages/interaction/permission-presets/package.json` |
| `@deepseek-ai/dsh-tool-ask-user` | `packages/interaction/tool-ask-user` | Consumer | preset-only | Model-facing ask_user_question tool over the ctx.userQuestions seam | 只在 agent-preset 面（std+code+cordis） | `packages/interaction/tool-ask-user/package.json` |
| `@deepseek-ai/dsh-user-approval` | `packages/interaction/user-approval` | Definition | base | User-approval seam (ctx.approval) for the DeepSeek Harness: one-shot permission decisions dispatched to com… | host 面登记 ctx 键 / 注册表 | `packages/interaction/user-approval/package.json` |
| `@deepseek-ai/dsh-user-questions` | `packages/interaction/user-questions` | Definition | base | Abstract user-questions seam (ctx.userQuestions) for asking the human during agent runs | host 面登记 ctx 键 / 注册表 | `packages/interaction/user-questions/package.json` |

### feedback/（2）

会话 / 消息反馈。

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-command-feedback` | `packages/feedback/command-feedback` | Consumer | base | Log-only session feedback producer and human-facing slash command | host 面 Consumer | `packages/feedback/command-feedback/package.json` |
| `@deepseek-ai/dsh-message-feedback` | `packages/feedback/message-feedback` | Provider | web-app | Lifecycle-bound per-message rating and note sidecar for the DeepSeek Harness | 只在 web-app insert 成行 | `packages/feedback/message-feedback/package.json` |

### hooks/（3）

Claude Code / Codex hook 桥 + 共享协议库。

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-hook-protocol` | `packages/hooks/hook-protocol` | library | 仓库有但不 shipped | Shared Claude Code / Codex hook wire protocol: matcher engine, stdin/exit-code/stdout codec, multi-hook mer… | 被依赖的库或 testkit，不是 plugin 行 | `packages/hooks/hook-protocol/package.json` |
| `@deepseek-ai/dsh-hooks-claude-code` | `packages/hooks/hooks-claude-code` | Consumer | 仓库有但不 shipped | Bridge plugin: run a Claude Code hooks.json / settings hook config on the DeepSeek Harness interception seams | 库存 Consumer，shipped composition 未点名 | `packages/hooks/hooks-claude-code/package.json` |
| `@deepseek-ai/dsh-hooks-codex` | `packages/hooks/hooks-codex` | Consumer | 仓库有但不 shipped | Bridge plugin: run a Codex hooks.json hook config on the DeepSeek Harness interception seams | 库存 Consumer，shipped composition 未点名 | `packages/hooks/hooks-codex/package.json` |

### api/（2）

Typert Remote 网关与 BFF 装配。

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-api-gateway` | `packages/api/gateway` | Provider | base | Typert Remote Host dispatcher and Client API endpoint | host 面默认后端 | `packages/api/gateway/package.json` |
| `@deepseek-ai/dsh-api-remotes` | `packages/api/remotes` | Consumer | web-app | Remote BFF assembly and Host Agent/Session lookup policy | web 浏览器面插件行 | `packages/api/remotes/package.json` |

### typert/（4）

类型图生成、装载、运行时注册表。

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-typert-generator` | `packages/typert/generator` | library | 仓库有但不 shipped | TypeScript project analyzer and model-driven Typert artifact generator | 被依赖的库或 testkit，不是 plugin 行 | `packages/typert/generator/package.json` |
| `@deepseek-ai/dsh-typert-loader` | `packages/typert/loader` | Provider | base | Loader integration for generated Typert package contributions | host 面默认后端 | `packages/typert/loader/package.json` |
| `@deepseek-ai/dsh-typert-protocol` | `packages/typert/protocol` | Definition | 仓库有但不 shipped | Compiler-independent Remote metadata and Typert provider protocols | seam 合同包，不单独占 composition 行 | `packages/typert/protocol/package.json` |
| `@deepseek-ai/dsh-typert-registry` | `packages/typert/registry` | Provider | base | Runtime registry for generated package reflection and Zod schemas | host 面默认后端 | `packages/typert/registry/package.json` |

### host/（8）

Web GUI 宿主半边。

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-host-apiproxy` | `packages/host/apiproxy` | Provider | web-app | API gateway: the ApiProxy contract (api/), the fetch carrier pair (fetch/), and the host-side gateway plugi… | 只在 web-app insert 成行 | `packages/host/apiproxy/package.json` |
| `@deepseek-ai/dsh-host-directory-picker` | `packages/host/directory-picker` | Definition | 仓库有但不 shipped | Abstract workspace-directory picking seam (ctx.directoryPicker) for the DeepSeek Harness web GUI host | seam 合同包，不单独占 composition 行 | `packages/host/directory-picker/package.json` |
| `@deepseek-ai/dsh-host-directory-picker-auto` | `packages/host/directory-picker-auto` | Provider | web-app | Adaptive chooser of the directory-picker seam: resolves the host situation at boot and mounts the native or… | 只在 web-app insert 成行 | `packages/host/directory-picker-auto/package.json` |
| `@deepseek-ai/dsh-host-directory-picker-browse` | `packages/host/directory-picker-browse` | Provider | 仓库有但不 shipped | In-app browsing backend of the directory-picker seam (listing/creation primitives over the host filesystem) | 可选后端，七份 yml 无 name 行 | `packages/host/directory-picker-browse/package.json` |
| `@deepseek-ai/dsh-host-directory-picker-native` | `packages/host/directory-picker-native` | Provider | 仓库有但不 shipped | Native-OS-chooser backend of the directory-picker seam for the DeepSeek Harness web GUI host | 可选后端，七份 yml 无 name 行 | `packages/host/directory-picker-native/package.json` |
| `@deepseek-ai/dsh-host-frontend-static` | `packages/host/frontend-static` | Provider | 仓库有但不 shipped | SPA dist server for the Web shell: owns the webserver fallback seat, serving the built frontend with index-… | 可选后端，七份 yml 无 name 行 | `packages/host/frontend-static/package.json` |
| `@deepseek-ai/dsh-host-plugin-inventory` | `packages/host/plugin-inventory` | Provider | web-app | Read-only Remote projection of current Cordis Loader plugin state | 只在 web-app insert 成行 | `packages/host/plugin-inventory/package.json` |
| `@deepseek-ai/dsh-host-webserver` | `packages/host/webserver` | Provider | web-app | Web route-registration plugin: HTTP and upgrade routes, index transform taps, and static dist fallback; kno… | 只在 web-app insert 成行 | `packages/host/webserver/package.json` |

### client/（39）

Web GUI 浏览器半边。多数 `ui-*` 是 web-app insert；若干原子库不单独成行。

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-client-connection` | `packages/client/connection` | Provider | web-app | Wire consumer layer: HTTP-up/WebSocket-down client, ConnectionController dual streams with reconnect, and f… | 只在 web-app insert 成行 | `packages/client/connection/package.json` |
| `@deepseek-ai/dsh-client-hmr` | `packages/client/hmr` | Provider | web-app | Dev-only hot-reload driver for script-loaded client entries: SSE rebuilt frames → invalidate/prefetch → fib… | 只在 web-app insert 成行 | `packages/client/hmr/package.json` |
| `@deepseek-ai/dsh-client-locale` | `packages/client/locale` | Provider | web-app | Locale plugin: Host-backed zh/en preference, browser-derived fallback, locale snapshots, and typed namespac… | 只在 web-app insert 成行 | `packages/client/locale/package.json` |
| `@deepseek-ai/dsh-client-modules` | `packages/client/modules` | Provider | web-app | Client module system, dual-face: node half composes the __DSH_BOOT__ entry graph (incremental dsh.client sc… | 只在 web-app insert 成行 | `packages/client/modules/package.json` |
| `@deepseek-ai/dsh-client-runtime` | `packages/client/runtime` | Provider | web-app | Client core services: SlotRegistry, SessionRuntime (scope tree + object layer) | 只在 web-app insert 成行 | `packages/client/runtime/package.json` |
| `@deepseek-ai/dsh-client-schema-form` | `packages/client/schema-form` | library | 仓库有但不 shipped | Schema/draft model layer for settings editors: rehydrates a serialized schemastery schema, validates drafts… | 被依赖的库或 testkit，不是 plugin 行 | `packages/client/schema-form/package.json` |
| `@deepseek-ai/dsh-client-ui-agent-preset` | `packages/client/ui-agent-preset` | Consumer | web-app | Agent-preset surfaces: the default for later sessions, this session's seat, and the composition editor | web 浏览器面插件行 | `packages/client/ui-agent-preset/package.json` |
| `@deepseek-ai/dsh-client-ui-attachment` | `packages/client/ui-attachment` | library | 仓库有但不 shipped | Pure React attachment atoms for the dsh web UI: draft-image rail, message image gallery, and original-image… | 被依赖的库或 testkit，不是 plugin 行 | `packages/client/ui-attachment/package.json` |
| `@deepseek-ai/dsh-client-ui-commands` | `packages/client/ui-commands` | Consumer | web-app | Client command surface: global directory cache, '/' source, three command UI kinds, popupSelect registry | web 浏览器面插件行 | `packages/client/ui-commands/package.json` |
| `@deepseek-ai/dsh-client-ui-conversation` | `packages/client/ui-conversation` | Consumer | web-app | Conversation domain: skeleton, ordered chat flow, composer with the Host-backed busy-Enter preference, and … | web 浏览器面插件行 | `packages/client/ui-conversation/package.json` |
| `@deepseek-ai/dsh-client-ui-deliverables` | `packages/client/ui-deliverables` | Consumer | web-app | Produced-files turn tail and clickable final-response file references for Web | web 浏览器面插件行 | `packages/client/ui-deliverables/package.json` |
| `@deepseek-ai/dsh-client-ui-directory-picker-browse` | `packages/client/ui-directory-picker-browse` | Consumer | 仓库有但不 shipped | In-app directory browsing surface: the workspace directory-flow owner rendering the host's listing and crea… | 库存 Consumer，shipped composition 未点名 | `packages/client/ui-directory-picker-browse/package.json` |
| `@deepseek-ai/dsh-client-ui-directory-picker-native` | `packages/client/ui-directory-picker-native` | Consumer | 仓库有但不 shipped | Native directory-picker surface: the renderless workspace directory-flow occupant driving the host's OS cho… | 库存 Consumer，shipped composition 未点名 | `packages/client/ui-directory-picker-native/package.json` |
| `@deepseek-ai/dsh-client-ui-goal` | `packages/client/ui-goal` | Consumer | web-app | Session goal surface: GoalBar docked on the composer, read from the goal session projection | web 浏览器面插件行 | `packages/client/ui-goal/package.json` |
| `@deepseek-ai/dsh-client-ui-input-trigger` | `packages/client/ui-input-trigger` | Consumer | web-app | Input trigger pipeline: '/' and '@' detection, candidate menu, pick routing to registered sources | web 浏览器面插件行 | `packages/client/ui-input-trigger/package.json` |
| `@deepseek-ai/dsh-client-ui-jobs` | `packages/client/ui-jobs` | Consumer | web-app | Session-header background-job list: live registry state mirrored from session/jobs frames | web 浏览器面插件行 | `packages/client/ui-jobs/package.json` |
| `@deepseek-ai/dsh-client-ui-layout` | `packages/client/ui-layout` | Consumer | web-app | Shell plugin: three-column AppFrame with drag handles, ctx.layout viewing-state service (navigation + panels) | web 浏览器面插件行 | `packages/client/ui-layout/package.json` |
| `@deepseek-ai/dsh-client-ui-message-feedback` | `packages/client/ui-message-feedback` | Consumer | web-app | Per-message feedback controls contributed to the assistant-message action strip, backed by the messageFeedb… | web 浏览器面插件行 | `packages/client/ui-message-feedback/package.json` |
| `@deepseek-ai/dsh-client-ui-model-selection` | `packages/client/ui-model-selection` | Consumer | web-app | Model selection: the /model popupSelect over session.models / session.selectModel | web 浏览器面插件行 | `packages/client/ui-model-selection/package.json` |
| `@deepseek-ai/dsh-client-ui-permission-presets` | `packages/client/ui-permission-presets` | Consumer | web-app | Permission surfaces: a new-session default in General settings and a current-session /permission popup over… | web 浏览器面插件行 | `packages/client/ui-permission-presets/package.json` |
| `@deepseek-ai/dsh-client-ui-plan` | `packages/client/ui-plan` | Consumer | web-app | Plan-mode composer control: the conversation.input.plan seat over the plan projection and the /plan command… | web 浏览器面插件行 | `packages/client/ui-plan/package.json` |
| `@deepseek-ai/dsh-client-ui-primitives` | `packages/client/ui-primitives` | library | 仓库有但不 shipped | Pure React atoms for the dsh web UI: controls, icons, markdown, and JSON inspectors (zero cordis) | 被依赖的库或 testkit，不是 plugin 行 | `packages/client/ui-primitives/package.json` |
| `@deepseek-ai/dsh-client-ui-settings` | `packages/client/ui-settings` | Consumer | web-app | Settings domain base plugin: the settings-namespace scope service and the canonical settings slot-type cont… | web 浏览器面插件行 | `packages/client/ui-settings/package.json` |
| `@deepseek-ai/dsh-client-ui-settings-general` | `packages/client/ui-settings-general` | Consumer | web-app | Settings ownerless-copy and product onboarding plugin: the General section, shell trigger/header chrome con… | web 浏览器面插件行 | `packages/client/ui-settings-general/package.json` |
| `@deepseek-ai/dsh-client-ui-settings-models` | `packages/client/ui-settings-models` | Consumer | web-app | Models settings and shared product-onboarding dialogs over existing settings and credential joins | web 浏览器面插件行 | `packages/client/ui-settings-models/package.json` |
| `@deepseek-ai/dsh-client-ui-settings-plugin-inventory` | `packages/client/ui-settings-plugin-inventory` | Consumer | web-app | Read-only Cordis Loader inventory tab in Web Plugins settings | web 浏览器面插件行 | `packages/client/ui-settings-plugin-inventory/package.json` |
| `@deepseek-ai/dsh-client-ui-settings-plugins` | `packages/client/ui-settings-plugins` | Consumer | web-app | Plugins settings section with feature-owned tabs and configurable host-plane plugin cards | web 浏览器面插件行 | `packages/client/ui-settings-plugins/package.json` |
| `@deepseek-ai/dsh-client-ui-sidebar` | `packages/client/ui-sidebar` | Consumer | web-app | Sidebar plugin: session multi-level tree, search, grouping, state dots | web 浏览器面插件行 | `packages/client/ui-sidebar/package.json` |
| `@deepseek-ai/dsh-client-ui-skill` | `packages/client/ui-skill` | Consumer | web-app | Web skill references and the dedicated skill tool row | web 浏览器面插件行 | `packages/client/ui-skill/package.json` |
| `@deepseek-ai/dsh-client-ui-slots` | `packages/client/ui-slots` | library | 仓库有但不 shipped | Slot registry pure core: SlotMap declaration merging, single register composition API, four-share props typ… | 被依赖的库或 testkit，不是 plugin 行 | `packages/client/ui-slots/package.json` |
| `@deepseek-ai/dsh-client-ui-subagent` | `packages/client/ui-subagent` | Consumer | web-app | Subagent conversation catalog, continuation routing UI, and '@' reference source | web 浏览器面插件行 | `packages/client/ui-subagent/package.json` |
| `@deepseek-ai/dsh-client-ui-theme` | `packages/client/ui-theme` | Consumer | web-app | Theme plugin: Host bootstrap for the pre-plugin palette; DOM-free ThemeRuntime for light/dark/system state;… | web 浏览器面插件行 | `packages/client/ui-theme/package.json` |
| `@deepseek-ai/dsh-client-ui-tool` | `packages/client/ui-tool` | Consumer | web-app | Client Tool call-tree renderer and keyed per-tool presentation slot | web 浏览器面插件行 | `packages/client/ui-tool/package.json` |
| `@deepseek-ai/dsh-client-ui-trajectory` | `packages/client/ui-trajectory` | Consumer | web-app | Trajectory event ledger with an interactive timing overview: pure-consumer plugin registering into the conv… | web 浏览器面插件行 | `packages/client/ui-trajectory/package.json` |
| `@deepseek-ai/dsh-client-ui-user-questions` | `packages/client/ui-user-questions` | Consumer | web-app | Web ask_user_question feature: host tool mount plus composer-takeover question UI | web 浏览器面插件行 | `packages/client/ui-user-questions/package.json` |
| `@deepseek-ai/dsh-client-ui-workflow-run` | `packages/client/ui-workflow-run` | Consumer | web-app | Durable workflow-run Conversation Node and nested member disclosure for dsh web | web 浏览器面插件行 | `packages/client/ui-workflow-run/package.json` |
| `@deepseek-ai/dsh-client-ui-workspace` | `packages/client/ui-workspace` | Consumer | web-app | Workspace picker plugin: one WorkspacePicker registered into the sidebar and empty-state workspace slots | web 浏览器面插件行 | `packages/client/ui-workspace/package.json` |
| `@deepseek-ai/dsh-client-web` | `packages/client/web` | Provider | 仓库有但不 shipped | Web shell kernel: bootWebShell (module system holding + seed table + two-stage boot + AppRoot gate + app-sh… | 可选后端，七份 yml 无 name 行 | `packages/client/web/package.json` |
| `@deepseek-ai/dsh-client-web-react` | `packages/client/web-react` | library | 仓库有但不 shipped | Shell-side React glue: createSlotRenderer, SessionProvider, bindSnapshotSelector (uSES bridge), useInvoke | 被依赖的库或 testkit，不是 plugin 行 | `packages/client/web-react/package.json` |

### extensions/（4）

自指 Cordis 工具与双半 runner。

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-cordis-client-runner` | `packages/extensions/cordis-client-runner` | Provider | web-app | Browser half of dynamic dual-half plugin packages: event subscription, closure evaluation, guard facade, an… | 只在 web-app insert 成行 | `packages/extensions/cordis-client-runner/package.json` |
| `@deepseek-ai/dsh-cordis-host-runner` | `packages/extensions/cordis-host-runner` | Provider | web-app | Dynamic package definition registry, host-half sandbox lifecycle, and invoke handler table for model-mounte… | 只在 web-app insert 成行 | `packages/extensions/cordis-host-runner/package.json` |
| `@deepseek-ai/dsh-tool-cordis` | `packages/extensions/tool-cordis` | Consumer | preset-only | Self-referential cordis toolset: inspect the live runtime, mount and dispose model-written plugins | 只在 agent-preset 面（cordis） [E: packages/extensions/tool-cordis/package.json:2] | `packages/extensions/tool-cordis/package.json` |
| `@deepseek-ai/dsh-client-ui-cordis` | `packages/extensions/ui-cordis` | Consumer | web-app | Cordis dynamic-plugin definition card: the keyed cordis_define tool row with its run/stop switch | web 浏览器面插件行 | `packages/extensions/ui-cordis/package.json` |

### sdk/（3）

进程外 JSON-RPC SDK。

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-sdk-client` | `packages/sdk/client` | library | 仓库有但不 shipped | TypeScript client SDK for driving a DeepSeek Harness runtime subprocess over stdio JSON-RPC: the DeepSeekHa… | 被依赖的库或 testkit，不是 plugin 行 | `packages/sdk/client/package.json` |
| `@deepseek-ai/dsh-sdk-protocol` | `packages/sdk/protocol` | Definition | 仓库有但不 shipped | Shared wire protocol for the DeepSeek Harness SDK runtime: the newline-delimited JSON-RPC stdio transport a… | seam 合同包，不单独占 composition 行 | `packages/sdk/protocol/package.json` |
| `@deepseek-ai/dsh-sdk-jsonrpc-server` | `packages/sdk/server` | Provider | 仓库有但不 shipped | Stdio JSON-RPC server plugin for out-of-process DeepSeek Harness SDK clients | 可选后端，七份 yml 无 name 行 | `packages/sdk/server/package.json` |

### acp/（1）

Automation-only ACP 服务器。

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-acp` | `packages/acp/acp` | app | 仓库有但不 shipped | Automation-only Agent Client Protocol server for driving DeepSeek Harness agents over JSON-RPC stdio | 可执行 demo / 入口，不是默认产品 composition | `packages/acp/acp/package.json` |

### mcp/（1）

MCP 客户端桥。

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-mcp-client` | `packages/mcp/mcp-client` | Consumer | 仓库有但不 shipped | MCP client bridge: connects to MCP servers and registers their tools on ctx.tools | 库存 Consumer，shipped composition 未点名 | `packages/mcp/mcp-client/package.json` |

### e2b/（3）

E2B 远程执行世界（POC，默认 composition 不装）。

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-e2b` | `packages/e2b/e2b` | Provider | 仓库有但不 shipped | Shared E2B sandbox lifecycle for DeepSeek Harness provider adapters | 可选后端，七份 yml 无 name 行 | `packages/e2b/e2b/package.json` |
| `@deepseek-ai/dsh-fs-e2b` | `packages/e2b/fs-e2b` | Provider | 仓库有但不 shipped | E2B filesystem implementation for DeepSeek Harness | 可选后端，七份 yml 无 name 行 | `packages/e2b/fs-e2b/package.json` |
| `@deepseek-ai/dsh-subprocess-e2b` | `packages/e2b/subprocess-e2b` | Provider | 仓库有但不 shipped | E2B subprocess implementation for DeepSeek Harness | 可选后端，七份 yml 无 name 行 | `packages/e2b/subprocess-e2b/package.json` |

### identity/（1）

匿名用户 id。

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-anonymous-user-id` | `packages/identity/anonymous-user-id` | library | 仓库有但不 shipped | Shared anonymous user identity for DeepSeek Harness telemetry and feedback correlation | 被依赖的库或 testkit，不是 plugin 行 | `packages/identity/anonymous-user-id/package.json` |

### runtime-diagnostics/（1）

运行时 invariant 注册表。

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-invariants` | `packages/runtime-diagnostics/invariants` | library | 仓库有但不 shipped | Registry service for package-owned DeepSeek Harness runtime invariants | 被依赖的库或 testkit，不是 plugin 行 | `packages/runtime-diagnostics/invariants/package.json` |

### util/（7）

零依赖工具库。

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-atomic-write` | `packages/util/atomic-write` | library | 仓库有但不 shipped | Zero-dependency atomic file replacement: exclusive-create random-suffix temp + rename carrying the caller-s… | 被依赖的库或 testkit，不是 plugin 行 | `packages/util/atomic-write/package.json` |
| `@deepseek-ai/dsh-brand` | `packages/util/brand` | library | 仓库有但不 shipped | Type-only Branded<B> nominal-typing primitive for the DeepSeek Harness | 被依赖的库或 testkit，不是 plugin 行 | `packages/util/brand/package.json` |
| `@deepseek-ai/dsh-home-paths` | `packages/util/home-paths` | library | 仓库有但不 shipped | Shared filesystem path helpers for the DeepSeek Harness | 被依赖的库或 testkit，不是 plugin 行 | `packages/util/home-paths/package.json` |
| `@deepseek-ai/dsh-launch-environment` | `packages/util/launch-environment` | library | 仓库有但不 shipped | Immutable DeepSeek Harness launch environment that records which layer supplied each value | 被依赖的库或 testkit，不是 plugin 行 | `packages/util/launch-environment/package.json` |
| `@deepseek-ai/dsh-native-command` | `packages/util/native-command` | library | 仓库有但不 shipped | Zero-dependency no-shell execFile runner for host-native OS integrations: utf8 stdio capture, abort propaga… | 被依赖的库或 testkit，不是 plugin 行 | `packages/util/native-command/package.json` |
| `@deepseek-ai/dsh-output-retention` | `packages/util/output-retention` | library | 仓库有但不 shipped | Zero-dependency bounded-retention primitive: ItemRetainer/TextRetainer + neutral notice helpers (what did w… | 被依赖的库或 testkit，不是 plugin 行 | `packages/util/output-retention/package.json` |
| `@deepseek-ai/dsh-timeout` | `packages/util/timeout` | library | 仓库有但不 shipped | Zero-dependency timeout/deadline primitive: clampTimeout, deadline, timeoutOf, TimeoutReason (timing + clas… | 被依赖的库或 testkit，不是 plugin 行 | `packages/util/timeout/package.json` |

### examples/（3）

可跑的 demo 装配，不是 `dsh web` 默认树。

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-acp-demo` | `packages/examples/acp-demo` | app | 仓库有但不 shipped | ACP automation server app: agent spine + JSONL persistence + ACP transport, with a JSON-RPC stdio bin | 可执行 demo / 入口，不是默认产品 composition | `packages/examples/acp-demo/package.json` |
| `@deepseek-ai/dsh-agent-spine-demo` | `packages/examples/agent-spine-demo` | app | 仓库有但不 shipped | The default executor-less/UI-less agent spine with fallback session titles, provider-routed retry, and opti… | 可执行 demo / 入口，不是默认产品 composition | `packages/examples/agent-spine-demo/package.json` |
| `@deepseek-ai/dsh-sdk-jsonrpc-demo` | `packages/examples/jsonrpc-demo` | app | 仓库有但不 shipped | Bin that boots an external Cordis config for the stdio JSON-RPC SDK runtime | 可执行 demo / 入口，不是默认产品 composition | `packages/examples/jsonrpc-demo/package.json` |

### test-support/（6）

测试夹具，不是产品 composition。

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh-acp-snapshot` | `packages/test-support/acp-snapshot` | library | 仓库有但不 shipped | ACP test kit: shared subprocess launcher, snapshot scenario harness, expected-output normalizers, and suite… | 被依赖的库或 testkit，不是 plugin 行 | `packages/test-support/acp-snapshot/package.json` |
| `@deepseek-ai/dsh-agent-loop-testkit` | `packages/test-support/agent-loop-testkit` | library | 仓库有但不 shipped | Shared prerequisite mounting for tests that exercise the concrete agent loop | 被依赖的库或 testkit，不是 plugin 行 | `packages/test-support/agent-loop-testkit/package.json` |
| `@deepseek-ai/dsh-client-test-runtime` | `packages/test-support/client-runtime` | library | 仓库有但不 shipped | jsdom slot test runtime: real Cordis Context + SlotRegistry + web-react renderer with test-owned session/wo… | 被依赖的库或 testkit，不是 plugin 行 | `packages/test-support/client-runtime/package.json` |
| `@deepseek-ai/dsh-llm-mock-server` | `packages/test-support/llm-mock-server` | library | 仓库有但不 shipped | Scriptable OpenAI-compatible HTTP/SSE fault server for LLM recovery tests | 被依赖的库或 testkit，不是 plugin 行 | `packages/test-support/llm-mock-server/package.json` |
| `@deepseek-ai/dsh-llm-replay` | `packages/test-support/llm-replay` | library | 仓库有但不 shipped | Replay LLM plugin: short-circuits llm/stream with model chunks reconstructed from a recorded session JSONL … | 被依赖的库或 testkit，不是 plugin 行 | `packages/test-support/llm-replay/package.json` |
| `@deepseek-ai/dsh-loader-smoke` | `packages/test-support/loader-smoke` | library | 仓库有但不 shipped | Shared subprocess and direct-agent harness for keyless real-Loader example smoke tests | 被依赖的库或 testkit，不是 plugin 行 | `packages/test-support/loader-smoke/package.json` |

### 表外 workspace 成员

这些路径在 `pnpm-workspace.yaml` / 根 `workspaces` 里，但**不是** `packages/*/*`。`examples` 成员只为依赖解析存在，tsdown 的 build glob（`vendor/*`、`packages/*/*`）把它排除在外。[E: pnpm-workspace.yaml:2][E: pnpm-workspace.yaml:18][E: pnpm-workspace.yaml:21][E: examples/package.json:6]

| npm name | 目录 | 角色 | shipped | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|---|
| `@deepseek-ai/dsh` | `apps/cli` | app | 仓库有但不 shipped | dsh CLI：profile boot、plugin 管理、`dsh web` 别名 | 产品入口；不是 bundle patch 里的 plugin 行 [E: apps/cli/package.json:2] | `apps/cli/package.json` |
| `@deepseek-ai/dsh-web-frontend` | `apps/web` | app | 仓库有但不 shipped | Vite 入口，打出 dist，由 web-app 的 frontend-static / web-runtime 提供 | 浏览器产物，不是 Cordis plugin `name:` [E: apps/web/package.json:2] | `apps/web/package.json` |
| `@deepseek-ai/cordis` | `vendor/cordis` | library | 仓库有但不 shipped | vendored Cordis 运行时（Context / Service / 事件） | 框架本身；loader 装的是 plugin，不是这个包名成行 [E: vendor/cordis/package.json:2] | `vendor/cordis/package.json` |
| `@deepseek-ai/cosmokit` | `vendor/cosmokit` | library | 仓库有但不 shipped | vendored 工具函数集 | 被框架与插件依赖，不是 composition 行 | `vendor/cosmokit/package.json` |
| `@deepseek-ai/cordis-plugin-group` | `vendor/group` | Provider | 仓库有但不 shipped | Cordis 嵌套 group（preset 里的 `cordis:group`） | 内建 kind，yml 写 `name: cordis:group` 而不是本 npm name | `vendor/group/package.json` |
| `@deepseek-ai/cordis-plugin-hmr` | `vendor/hmr` | Provider | base | 模块热替换 plugin | base 插入 `id: hmr`；web-app / headless 把同一 id disabled | `vendor/hmr/package.json` |
| `@deepseek-ai/cordis-plugin-include` | `vendor/include` | Provider | 仓库有但不 shipped | 在 cordis 配置里 include 文件 | CLI / examples 会依赖，三份 bundle patch 无此 `name:` | `vendor/include/package.json` |
| `@deepseek-ai/cordis-plugin-loader` | `vendor/loader` | Provider | 仓库有但不 shipped | Cordis plugin loader | boot 装载器，不是 base insert 的一行 plugin | `vendor/loader/package.json` |
| `@deepseek-ai/cordis-plugin-logger-console` | `vendor/logger-console` | Provider | 仓库有但不 shipped | 控制台 logger exporter | examples 解析依赖；产品三份 patch 未点名 | `vendor/logger-console/package.json` |
| `@deepseek-ai/schemastery` | `vendor/schemastery` | library | 仓库有但不 shipped | 类型驱动 schema（插件 Config） | 库，不是 plugin 行 | `vendor/schemastery/package.json` |
| `@deepseek-ai/cordis-plugin-timer` | `vendor/timer` | Provider | base | Cordis timer 服务 | base insert 第一行 `id: timer` [E: packages/bundle/base/cordis.patch.yml:17] | `vendor/timer/package.json` |
| `@deepseek-ai/website` | `website` | app | 仓库有但不 shipped | VitePress 文档站 | 文档构建，不是 agent composition | `website/package.json` |
| `dsh-jsonrpc-agent-pkg` | `python/sdk-runtime` | app | 仓库有但不 shipped | Python runtime / 单 exe 的依赖闭包根 | deploy manifest，pnpm-workspace 成员但不是 plugin 行 [E: python/sdk-runtime/package.json:2] | `python/sdk-runtime/package.json` |
| `@deepseek-ai/node-addon-landlock-run-workspace` | `native/landlock-run` | library | 仓库有但不 shipped | Landlock launcher 工作区根；子包 entry / linux-arm64 / linux-x64 | sandbox-local 的 native 依赖，不是 cordis `name:` | `native/landlock-run/package.json` |
| `dsh-examples` | `examples` | app | 仓库有但不 shipped | 可跑 demo 的 workspace 伞包：声明 leaf cordis.yml 的 workspace:* 依赖 | 只为解析用，不是 tsdown build target [E: examples/package.json:2] | `examples/package.json` |

`native/landlock-run/packages/entry` = `@deepseek-ai/node-addon-landlock-run`；`linux-arm64` / `linux-x64` 是预编译二进制包。它们是 workspace 子包（`native/landlock-run/packages/*`），同样不是 composition `name:`。

## 对照 / 分家 / 装配

- **host 面 vs agent-preset 面**：base 行是进程级（webserver 之前就要 settle 的 Provider / 注册表）。web 默认产品把模型可见 Consumer 挪到 preset；headless 没有 roster，同一批 Consumer 仍挂在 base。
- **两个 `bash`**：`@deepseek-ai/dsh-tool-bash` 在 base（以及 standard/code/cordis remount）；`@deepseek-ai/dsh-tool-bash-persistent` 只在 `minimal`，是 preset-only。
- **无 shipped TUI 包**：workspace 没有 TUI group；`tui` 只是自定义 profile 名。
- **Definition 常常「仓库有但不 shipped」**：例如 `dsh-fs` / `dsh-shell` / `dsh-sandbox` 是合同包，patch 点名的是 `dsh-fs-sandbox` / `dsh-bash-sandbox` / `dsh-sandbox-local`。
- **bundle 自己**：`dsh-base` / `dsh-web-app` / `dsh-headless` 的角色是 bundle。后两个还在各自 overlay 里以 plugin `name:` 出现（`web-runtime` / `headless-runner`）。
- **`skill-badge`** 在 base 有 `name:` 但 `disabled: true`，仍算 shipped = base（行在树上，默认不激活）。[E: packages/bundle/base/cordis.patch.yml:244][E: packages/bundle/base/cordis.patch.yml:245]

## Sources

- `package.json`
- `packages/README.md`
- `packages/AGENTS.md`
- `pnpm-workspace.yaml`
- `apps/cli/package.json`
- `apps/web/package.json`
- `packages/bundle/base/package.json`
- `packages/bundle/web-app/package.json`
- `packages/bundle/headless/package.json`
- `packages/bundle/base/cordis.patch.yml`
- `packages/bundle/web-app/cordis.patch.yml`
- `packages/bundle/headless/cordis.patch.yml`
- `apps/cli/config/agent-presets/minimal/agent.cordis.yml`
- `apps/cli/config/agent-presets/standard/agent.cordis.yml`
- `apps/cli/config/agent-presets/code/agent.cordis.yml`
- `apps/cli/config/agent-presets/cordis/agent.cordis.yml`
- `vendor/cordis/package.json`
- `vendor/cosmokit/package.json`
- `vendor/group/package.json`
- `vendor/hmr/package.json`
- `vendor/include/package.json`
- `vendor/loader/package.json`
- `vendor/logger-console/package.json`
- `vendor/schemastery/package.json`
- `vendor/timer/package.json`
- `python/sdk-runtime/package.json`
- `website/package.json`
- `native/landlock-run/package.json`
- `native/landlock-run/packages/entry/package.json`
- `native/landlock-run/packages/linux-arm64/package.json`
- `native/landlock-run/packages/linux-x64/package.json`
- `examples/package.json`
- `packages/acp/acp/package.json`
- `packages/api/gateway/package.json`
- `packages/api/remotes/package.json`
- `packages/attachment/attachment/package.json`
- `packages/attachment/attachment-local/package.json`
- `packages/boot/app-boot/package.json`
- `packages/boot/cmdline/package.json`
- `packages/client/connection/package.json`
- `packages/client/hmr/package.json`
- `packages/client/locale/package.json`
- `packages/client/modules/package.json`
- `packages/client/runtime/package.json`
- `packages/client/schema-form/package.json`
- `packages/client/ui-agent-preset/package.json`
- `packages/client/ui-attachment/package.json`
- `packages/client/ui-commands/package.json`
- `packages/client/ui-conversation/package.json`
- `packages/client/ui-deliverables/package.json`
- `packages/client/ui-directory-picker-browse/package.json`
- `packages/client/ui-directory-picker-native/package.json`
- `packages/client/ui-goal/package.json`
- `packages/client/ui-input-trigger/package.json`
- `packages/client/ui-jobs/package.json`
- `packages/client/ui-layout/package.json`
- `packages/client/ui-message-feedback/package.json`
- `packages/client/ui-model-selection/package.json`
- `packages/client/ui-permission-presets/package.json`
- `packages/client/ui-plan/package.json`
- `packages/client/ui-primitives/package.json`
- `packages/client/ui-settings/package.json`
- `packages/client/ui-settings-general/package.json`
- `packages/client/ui-settings-models/package.json`
- `packages/client/ui-settings-plugin-inventory/package.json`
- `packages/client/ui-settings-plugins/package.json`
- `packages/client/ui-sidebar/package.json`
- `packages/client/ui-skill/package.json`
- `packages/client/ui-slots/package.json`
- `packages/client/ui-subagent/package.json`
- `packages/client/ui-theme/package.json`
- `packages/client/ui-tool/package.json`
- `packages/client/ui-trajectory/package.json`
- `packages/client/ui-user-questions/package.json`
- `packages/client/ui-workflow-run/package.json`
- `packages/client/ui-workspace/package.json`
- `packages/client/web/package.json`
- `packages/client/web-react/package.json`
- `packages/code-runtime/code-runtime/package.json`
- `packages/code-runtime/code-runtime-worker-thread/package.json`
- `packages/compaction/command-compact/package.json`
- `packages/compaction/compaction/package.json`
- `packages/compaction/compaction-basic/package.json`
- `packages/compaction/compaction-tool-result-pruner/package.json`
- `packages/context/agent-instructions/package.json`
- `packages/context/session-reference/package.json`
- `packages/context/time-context/package.json`
- `packages/context/tmux-context/package.json`
- `packages/core/agent/package.json`
- `packages/core/agent-default-model/package.json`
- `packages/core/agent-loop/package.json`
- `packages/core/agent-tool-presentation/package.json`
- `packages/core/scope/package.json`
- `packages/core/session/package.json`
- `packages/core/system-prompt/package.json`
- `packages/core/tools/package.json`
- `packages/credentials/credentials/package.json`
- `packages/credentials/credentials-local/package.json`
- `packages/e2b/e2b/package.json`
- `packages/e2b/fs-e2b/package.json`
- `packages/e2b/subprocess-e2b/package.json`
- `packages/examples/acp-demo/package.json`
- `packages/examples/agent-spine-demo/package.json`
- `packages/examples/jsonrpc-demo/package.json`
- `packages/extensions/cordis-client-runner/package.json`
- `packages/extensions/cordis-host-runner/package.json`
- `packages/extensions/tool-cordis/package.json`
- `packages/extensions/ui-cordis/package.json`
- `packages/feedback/command-feedback/package.json`
- `packages/feedback/message-feedback/package.json`
- `packages/fs/fs/package.json`
- `packages/fs/fs-local/package.json`
- `packages/fs/fs-observation-policy/package.json`
- `packages/fs/fs-sandbox/package.json`
- `packages/fs/tool-fs/package.json`
- `packages/fs/tool-fs-search/package.json`
- `packages/fs/tool-str-replace-editor/package.json`
- `packages/goal/command-goal/package.json`
- `packages/goal/goal/package.json`
- `packages/goal/goal-round-driver/package.json`
- `packages/goal/tool-goal/package.json`
- `packages/guard/repeat-tool-reminder/package.json`
- `packages/guard/timeout-policy/package.json`
- `packages/hooks/hook-protocol/package.json`
- `packages/hooks/hooks-claude-code/package.json`
- `packages/hooks/hooks-codex/package.json`
- `packages/host/apiproxy/package.json`
- `packages/host/directory-picker/package.json`
- `packages/host/directory-picker-auto/package.json`
- `packages/host/directory-picker-browse/package.json`
- `packages/host/directory-picker-native/package.json`
- `packages/host/frontend-static/package.json`
- `packages/host/plugin-inventory/package.json`
- `packages/host/webserver/package.json`
- `packages/identity/anonymous-user-id/package.json`
- `packages/interaction/commands/package.json`
- `packages/interaction/permission-presets/package.json`
- `packages/interaction/tool-ask-user/package.json`
- `packages/interaction/user-approval/package.json`
- `packages/interaction/user-questions/package.json`
- `packages/jobs/jobs/package.json`
- `packages/jobs/jobs-local/package.json`
- `packages/jobs/tool-jobs/package.json`
- `packages/llm/llm/package.json`
- `packages/llm/llm-deepseek/package.json`
- `packages/llm/llm-pi-ai/package.json`
- `packages/llm/llm-retry/package.json`
- `packages/llm/token-meter/package.json`
- `packages/lsp/lsp/package.json`
- `packages/lsp/lsp-stdio/package.json`
- `packages/lsp/tool-lsp/package.json`
- `packages/mcp/mcp-client/package.json`
- `packages/plan/plan-mode/package.json`
- `packages/preset/agent-presets/package.json`
- `packages/preset/persona/package.json`
- `packages/runtime-diagnostics/invariants/package.json`
- `packages/sandbox/sandbox/package.json`
- `packages/sandbox/sandbox-local/package.json`
- `packages/sandbox/sandbox-policy/package.json`
- `packages/sandbox/sandbox-windows-acl/package.json`
- `packages/schedule/schedule/package.json`
- `packages/sdk/client/package.json`
- `packages/sdk/protocol/package.json`
- `packages/sdk/server/package.json`
- `packages/session-query/session-log-export/package.json`
- `packages/session-query/session-query/package.json`
- `packages/session-query/session-query-sqlite/package.json`
- `packages/session-query/tool-session-query/package.json`
- `packages/session/session-checkpoint-policy/package.json`
- `packages/session/session-persistence/package.json`
- `packages/session/session-persistence-jsonl/package.json`
- `packages/session/session-persistence-sqlite/package.json`
- `packages/session/session-projection/package.json`
- `packages/session/session-projection-cache/package.json`
- `packages/session/session-stats/package.json`
- `packages/session/session-telemetry/package.json`
- `packages/session/session-telemetry-otel/package.json`
- `packages/session/session-title/package.json`
- `packages/session/session-title-all-prompts-llm/package.json`
- `packages/session/session-title-first-prompt-llm/package.json`
- `packages/session/session-title-llm/package.json`
- `packages/settings/settings/package.json`
- `packages/settings/settings-file/package.json`
- `packages/shell/bash-local/package.json`
- `packages/shell/bash-sandbox/package.json`
- `packages/shell/pwsh-local/package.json`
- `packages/shell/pwsh-sandbox/package.json`
- `packages/shell/shell/package.json`
- `packages/shell/shell-env/package.json`
- `packages/shell/tool-bash/package.json`
- `packages/shell/tool-bash-persistent/package.json`
- `packages/shell/tool-pwsh/package.json`
- `packages/skill/skill/package.json`
- `packages/skill/skill-badge/package.json`
- `packages/skill/skill-filesystem/package.json`
- `packages/skill/tool-skill/package.json`
- `packages/spill/spill/package.json`
- `packages/spill/spill-local/package.json`
- `packages/spill/spill-policy/package.json`
- `packages/storage/storage/package.json`
- `packages/storage/storage-domain/package.json`
- `packages/storage/storage-json/package.json`
- `packages/storage/storage-sqlite/package.json`
- `packages/subagent/subagent/package.json`
- `packages/subagent/subagent-acp/package.json`
- `packages/subagent/subagent-claude-code/package.json`
- `packages/subagent/subagent-codex/package.json`
- `packages/subagent/subagent-dsh-sdk/package.json`
- `packages/subagent/subagent-fork-in-process/package.json`
- `packages/subagent/subagent-in-process-driver/package.json`
- `packages/subagent/subagent-spawn-in-process/package.json`
- `packages/subagent/tool-subagent/package.json`
- `packages/subagent/tool-subagent-control/package.json`
- `packages/subagent/tool-subagent-report/package.json`
- `packages/subprocess/subprocess/package.json`
- `packages/subprocess/subprocess-local/package.json`
- `packages/terminal/terminal/package.json`
- `packages/terminal/terminal-bash/package.json`
- `packages/terminal/tool-terminal/package.json`
- `packages/test-support/acp-snapshot/package.json`
- `packages/test-support/agent-loop-testkit/package.json`
- `packages/test-support/client-runtime/package.json`
- `packages/test-support/llm-mock-server/package.json`
- `packages/test-support/llm-replay/package.json`
- `packages/test-support/loader-smoke/package.json`
- `packages/todo/tool-todo/package.json`
- `packages/typert/generator/package.json`
- `packages/typert/loader/package.json`
- `packages/typert/protocol/package.json`
- `packages/typert/registry/package.json`
- `packages/util/atomic-write/package.json`
- `packages/util/brand/package.json`
- `packages/util/home-paths/package.json`
- `packages/util/launch-environment/package.json`
- `packages/util/native-command/package.json`
- `packages/util/output-retention/package.json`
- `packages/util/timeout/package.json`
- `packages/web/tool-web/package.json`
- `packages/web/web/package.json`
- `packages/web/web-fetch-http/package.json`
- `packages/web/web-search-deepseek/package.json`
- `packages/web/web-search-exa/package.json`
- `packages/web/web-search-perplexity/package.json`
- `packages/workflow/tool-ralph/package.json`
- `packages/workflow/tool-workflow/package.json`
- `packages/workflow/workflow/package.json`
- `packages/workflow/workflow-worker-thread/package.json`
- `packages/workspace/workspace/package.json`

## 相关

- [spine.overview](../spine/overview.md) — 源码总览与 `profile → bundle → preset` 主线
- [ref.glossary](glossary.md) — seam / host 面 / isolate 等术语
- [spine.composition-boot](../spine/composition-boot.md) — profile 发现与 patch 叠层
- [ref.presets](presets.md) — 四个 shipped `agent.cordis.yml` 成员对照
