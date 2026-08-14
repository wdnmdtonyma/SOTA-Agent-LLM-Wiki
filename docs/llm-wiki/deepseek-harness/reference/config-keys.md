---
id: ref.config-keys
title: Config 键目录
kind: catalog
tier: T3
pkg: persistence
source:
  - docs/config-catalog.md
  - packages/settings/settings/src/types.ts
  - packages/settings/settings/src/index.ts
  - packages/settings/settings-file/src/index.ts
  - packages/llm/llm/src/retry-policy.ts
  - packages/compaction/compaction-basic/src/types.ts
  - packages/session/session-title-llm/src/index.ts
  - packages/preset/agent-presets/src/preset.ts
  - packages/session-query/session-query/src/config.ts
  - packages/context/session-reference/src/config.ts
  - packages/compaction/compaction-tool-result-pruner/src/types.ts
  - packages/client/ui-theme/src/theme-settings.ts
  - packages/client/locale/src/locale-settings.ts
  - packages/client/ui-conversation/src/submission-settings.ts
  - packages/client/ui-settings-general/src/index.ts
  - packages/shell/bash-sandbox/src/index.ts
  - packages/fs/fs-sandbox/src/index.ts
  - packages/shell/pwsh-sandbox/src/index.ts
  - packages/plan/plan-mode/src/index.ts
  - packages/test-support/llm-replay/src/index.ts
  - packages/acp/acp/src/index.ts
  - packages/attachment/attachment-local/src/index.ts
  - packages/bundle/headless/src/index.ts
  - packages/bundle/web-app/src/index.ts
  - packages/client/connection/src/index.ts
  - packages/client/hmr/src/index.ts
  - packages/code-runtime/code-runtime-worker-thread/src/index.ts
  - packages/compaction/compaction-basic/src/index.ts
  - packages/compaction/compaction-tool-result-pruner/src/index.ts
  - packages/context/agent-instructions/src/config.ts
  - packages/context/session-reference/src/index.ts
  - packages/context/time-context/src/index.ts
  - packages/context/tmux-context/src/index.ts
  - packages/core/agent-default-model/src/index.ts
  - packages/core/agent-loop/src/index.ts
  - packages/core/agent-tool-presentation/src/index.ts
  - packages/core/system-prompt/src/index.ts
  - packages/core/tools/src/index.ts
  - packages/credentials/credentials-local/src/index.ts
  - packages/e2b/e2b/src/index.ts
  - packages/e2b/subprocess-e2b/src/index.ts
  - packages/examples/acp-demo/src/index.ts
  - packages/examples/agent-spine-demo/src/index.ts
  - packages/extensions/cordis-host-runner/src/index.ts
  - packages/feedback/message-feedback/src/index.ts
  - packages/fs/fs-local/src/index.ts
  - packages/fs/tool-fs-search/src/index.ts
  - packages/fs/tool-fs/src/index.ts
  - packages/fs/tool-str-replace-editor/src/index.ts
  - packages/goal/goal/src/index.ts
  - packages/goal/tool-goal/src/index.ts
  - packages/guard/repeat-tool-reminder/src/index.ts
  - packages/hooks/hooks-claude-code/src/index.ts
  - packages/hooks/hooks-codex/src/index.ts
  - packages/host/apiproxy/src/index.ts
  - packages/host/directory-picker-browse/src/index.ts
  - packages/host/frontend-static/src/index.ts
  - packages/host/webserver/src/index.ts
  - packages/interaction/permission-presets/src/index.ts
  - packages/interaction/user-approval/src/index.ts
  - packages/jobs/jobs-local/src/index.ts
  - packages/jobs/tool-jobs/src/index.ts
  - packages/llm/llm-deepseek/src/index.ts
  - packages/llm/llm-pi-ai/src/config.ts
  - packages/llm/llm-retry/src/index.ts
  - packages/llm/token-meter/src/index.ts
  - packages/lsp/lsp-stdio/src/index.ts
  - packages/lsp/tool-lsp/src/index.ts
  - packages/mcp/mcp-client/src/index.ts
  - packages/mcp/mcp-client/src/connection.ts
  - packages/preset/agent-presets/src/index.ts
  - packages/preset/persona/src/index.ts
  - packages/runtime-diagnostics/invariants/src/index.ts
  - packages/sandbox/sandbox-local/src/index.ts
  - packages/sandbox/sandbox-policy/src/index.ts
  - packages/sdk/server/src/index.ts
  - packages/session-query/session-query-sqlite/src/index.ts
  - packages/session-query/tool-session-query/src/index.ts
  - packages/session/session-persistence-jsonl/src/index.ts
  - packages/session/session-persistence-sqlite/src/index.ts
  - packages/session/session-projection-cache/src/index.ts
  - packages/session/session-telemetry-otel/src/index.ts
  - packages/session/session-title-all-prompts-llm/src/index.ts
  - packages/session/session-title-first-prompt-llm/src/index.ts
  - packages/session/session-title/src/index.ts
  - packages/shell/bash-local/src/index.ts
  - packages/shell/pwsh-local/src/index.ts
  - packages/shell/shell-env/src/index.ts
  - packages/shell/tool-bash-persistent/src/index.ts
  - packages/shell/tool-bash/src/index.ts
  - packages/shell/tool-pwsh/src/index.ts
  - packages/skill/skill-filesystem/src/index.ts
  - packages/skill/skill/src/index.ts
  - packages/skill/tool-skill/src/index.ts
  - packages/spill/spill-local/src/index.ts
  - packages/spill/spill-policy/src/index.ts
  - packages/storage/storage-domain/src/index.ts
  - packages/storage/storage-json/src/index.ts
  - packages/storage/storage-sqlite/src/index.ts
  - packages/subagent/subagent-acp/src/index.ts
  - packages/subagent/subagent-claude-code/src/index.ts
  - packages/subagent/subagent-codex/src/index.ts
  - packages/subagent/subagent-dsh-sdk/src/index.ts
  - packages/subagent/subagent-fork-in-process/src/index.ts
  - packages/subagent/subagent-spawn-in-process/src/index.ts
  - packages/subagent/tool-subagent-report/src/index.ts
  - packages/subagent/tool-subagent/src/index.ts
  - packages/terminal/terminal-bash/src/config.ts
  - packages/terminal/tool-terminal/src/index.ts
  - packages/todo/tool-todo/src/index.ts
  - packages/typert/loader/src/index.ts
  - packages/web/tool-web/src/index.ts
  - packages/web/web-fetch-http/src/index.ts
  - packages/web/web-search-deepseek/src/index.ts
  - packages/web/web-search-exa/src/index.ts
  - packages/web/web-search-perplexity/src/index.ts
  - packages/web/web/src/index.ts
  - packages/workflow/tool-ralph/src/index.ts
  - packages/workflow/tool-workflow/src/index.ts
  - packages/workflow/workflow-worker-thread/src/index.ts
symbols:
  - Config
  - SettingsScope
related:
  - subsys.persistence.settings
  - surface.config.settings
  - spine.composition-boot
  - ref.presets
  - ref.env-vars
evidence: explicit
status: verified
updated: 47f943859b
---

> 每个可 load 的 harness 插件把 **部署轴** 写成 `export const Config` 或 `static Config`（`@deepseek-ai/schemastery` 的 `z.object` / `z.union` / `z.intersect`）。本页按包列出 **schema 接受的每一个键**（嵌套写成 `parent.child` / `parent[]` / `parent.*`）。这是 Cordis 组合运行时的 `cordis.yml` `config:` 词表，不是 session log，也不是用户 `settings.yaml` 文档键表。

## 能回答的问题

- 某个 `@deepseek-ai/dsh-*` 插件的 `Config` 有哪些顶层键？嵌套键怎么写？默认是什么？
- 空 `z.object({})` 的包是漏了键，还是故意不接受用户键？
- schema default、composition `base`（entry Config）、用户 `settings.yaml` 哪一层赢？`SettingsScope.replace({})` 回到哪一层？
- `llm-deepseek` 的 `baseURL` 和 `web-search-deepseek` 的 `baseURL` 是不是同一条环境变量？
- 官方 `docs/config-catalog.md` 里有、但仓库里没有 `export const Config` / `static Config` 的包怎么处理？
- `agent-loop` 的 `agents` 会不会进 settings 文档？`agent-presets` 用户能改哪些键？

## 范围与 ground truth

本页是 **T3 grouped-catalog**。实例 = 一个 schema 键路径（或一行「本包无用户键」）。分组按 `packages/<group>/<pkg>`，是为了读，不是为了丢实例。

**认哪份源**：`packages/` 与 `apps/` 里（跳过 tests 与 `tool-cordis` 生成物 `api-catalog.ts`）每一处 `export const Config` / `static Config` 的 schemastery 表达式。键、类型、`.default()` / `.required()` 以那一行 `z.object` / `z.union` / `z.intersect` 为准。冻结树用 `rg -l "export const Config|static Config"` 枚举到 **100** 个产品源文件，对应 **100** 个 npm 包。

官方生成物 `docs/config-catalog.md`（约 105 个带 TypeScript Config **类型** 的包）**只当查漏，不当 [E]**。默认值 / 类型不抄官方粘贴块。

`apps/` 在冻结树 **没有** `export const Config` / `static Config`。launcher 旗标在 [`ref.cli-flags`](cli-flags.md)；环境变量在 [`ref.env-vars`](env-vars.md)。

DSH 是 **Cordis 组合运行时**（`profile → bundle → agent preset`），不是固定 CLI agent。capability seam 是 Definition / Provider / Consumer。模型看见的内容必须能从 session 日志重建（`model-visible ⟺ logged`）。本页键本身是 **部署合同**，多数坐在 **host 面**（bundle / profile `cordis.yml` 的 `config:`）。只有被四个 shipped `agent.cordis.yml` 装上的插件 Config 才进入 **agent-preset 面**；成员资格只认那些 yml，不认「仓库里有这个包」。默认产品路径是本地 Web GUI（`dsh web`）。本仓没有 shipped TUI 包。

### settings 分层（不要和插件 Config 混表）

`ctx.settings` 按 namespace 切用户文档。`SettingsScope.get` 的 resolved 值是三层，后者覆盖前者：schema defaults → composition `base`（插件 entry Config）→ 用户文档 section。登记后 `get` 返回 `registration.resolved`。[E: packages/settings/settings/src/index.ts:458] `resolve` 实现是 `schema(mergeLayers(base, section))`：先深合并 `base` 与 user section，再跑 schema（schema 自己填 default）。[E: packages/settings/settings/src/index.ts:297][E: packages/settings/settings/src/index.ts:697][E: packages/settings/settings/src/index.ts:705]

`installSettingsSection` 在存在 `ctx.settings` 时，把 entry Config 登记成该 namespace 的 `base`，并把运行时 source 指到 `scope.get()`；没有 settings 服务时，消费者继续用 composition entry。[E: packages/settings/settings/src/index.ts:863][E: packages/settings/settings/src/index.ts:872]

物理文档在 `@deepseek-ai/dsh-settings-file`：省略 `path` 时是 `<$DSH_HOME 或 ~/.dsh>/settings.yaml`，`watch` 默认 `true`，`debounceMs` 默认 `100`。[E: packages/settings/settings-file/src/index.ts:56][E: packages/settings/settings-file/src/index.ts:106]

**不要**把下列东西写进本页插件 Config 表（它们是用户文档 section，不是插件 `Config`）：

| namespace | schema 符号 | 与插件 Config 的关系 | 源 |
|---|---|---|---|
| `ui-theme` | `ThemeSettingsSchema` | `preference`；client 包 **没有** `export const Config` | `packages/client/ui-theme/src/theme-settings.ts` |
| `locale` | `LocaleSettingsSchema` | `preference`；client 包 **没有** `Config` | `packages/client/locale/src/locale-settings.ts` |
| `ui-conversation` | `ConversationSettingsSchema` | `busyEnter`；client 包 **没有** `Config` | `packages/client/ui-conversation/src/submission-settings.ts` |
| `ui-onboarding` | `OnboardingSettingsSchema` | `welcomeNoticeVersion`；`apply` 不收 Config 参数 | `packages/client/ui-settings-general/src/index.ts` |
| `agent-presets` | `AgentPresetSettingsSchema` | 用户只能改 `default`；`roots` / `includeUserRoot` 仍只在插件 Config | [E: packages/preset/agent-presets/src/index.ts:49] |
| agent-loop settings | `AGENT_LOOP_SETTINGS_SCHEMA` | 用户只能改 `maxParallelToolCalls`；`agents` 是 boot 一次的 composition 数组 | [E: packages/core/agent-loop/src/index.ts:250] |
| agent-default-model settings | `AGENT_DEFAULT_MODEL_SETTINGS_SCHEMA` | 比插件 Config **多** 可选 `reasoningEffort` | `packages/core/agent-default-model/src/index.ts` |

若干插件把 **同一份** `Config` schema 交给 `installSettingsSection`（`llm-deepseek`、`llm-pi-ai`、`web-search-deepseek`、`bash-local`、`pwsh-local`、`permission-presets`）。那些键在本页插件表里出现一次，并在「为什么」里标明也是 settings namespace。控制流与 redact 在 [`subsys.persistence.settings`](../subsystems/persistence/settings.md) 与 [`surface.config.settings`](../surface/config/settings.md)。

`replace({})` 清掉用户层，resolved 回到 schema default ⊕ composition `base`。实现是 `SettingsService.replace` → `write(..., 'replace')`。[E: packages/settings/settings/src/index.ts:548]

### host 面 vs agent-preset 面

- **host 面** Config：webserver / persistence / sandbox / credentials / settings-file / LLM adapter / search provider。随 profile / bundle 加载，所有会话共享。
- **agent-preset 面** Config：被 `apps/cli/config/agent-presets/{minimal,standard,code,cordis}/agent.cordis.yml` 装上的工具与 persona。对照表在 [`ref.presets`](presets.md)。
- `dsh --dump-config` 看到的是叠层后的 **组合树**，不是 `settings.yaml`。

search 的 `baseURL` **不**回退到 `DEEPSEEK_BASE_URL`。`web-search-deepseek` 读的是 `DEEPSEEK_SEARCH_BASE_URL`。[E: packages/web/web-search-deepseek/src/index.ts:82]

## 实例表

一行 = 一个 schema 键路径。`parent.child` 是对象嵌套；`parent[]` 是数组元素；`parent.*` 是 `z.dict` 的值对象。union（如 MCP）去重后在「含义」里标明变体。`z.intersect`（`agent-spine-demo`）把被交 schema 的顶层键一并列出。

`retryPolicy` 嵌套键的权威 schema 在 `@deepseek-ai/dsh-llm` 的 `RetryPolicySchema`（library，自己不是插件 Config）。[E: packages/llm/llm/src/retry-policy.ts:100]

### 包索引

| 包 | 目录 | schema | 键数 | Config 声明 |
|---|---|---|---|---|
| `@deepseek-ai/dsh-acp` | `packages/acp/acp` | object | 2 | `packages/acp/acp/src/index.ts:79` |
| `@deepseek-ai/dsh-attachment-local` | `packages/attachment/attachment-local` | object | 5 | `packages/attachment/attachment-local/src/index.ts:39` |
| `@deepseek-ai/dsh-headless` | `packages/bundle/headless` | object | 1 | `packages/bundle/headless/src/index.ts:36` |
| `@deepseek-ai/dsh-web-app` | `packages/bundle/web-app` | object | 3 | `packages/bundle/web-app/src/index.ts:52` |
| `@deepseek-ai/dsh-client-connection` | `packages/client/connection` | object | 2 | `packages/client/connection/src/index.ts:64` |
| `@deepseek-ai/dsh-client-hmr` | `packages/client/hmr` | object | 1 | `packages/client/hmr/src/index.ts:36` |
| `@deepseek-ai/dsh-code-runtime-worker-thread` | `packages/code-runtime/code-runtime-worker-thread` | object | 4 | `packages/code-runtime/code-runtime-worker-thread/src/index.ts:239` |
| `@deepseek-ai/dsh-compaction-basic` | `packages/compaction/compaction-basic` | object | 20 | `packages/compaction/compaction-basic/src/index.ts:106` |
| `@deepseek-ai/dsh-compaction-tool-result-pruner` | `packages/compaction/compaction-tool-result-pruner` | object | 3 | `packages/compaction/compaction-tool-result-pruner/src/index.ts:49` |
| `@deepseek-ai/dsh-agent-instructions` | `packages/context/agent-instructions` | object | 6 | `packages/context/agent-instructions/src/config.ts:39` |
| `@deepseek-ai/dsh-session-reference` | `packages/context/session-reference` | object | 3 | `packages/context/session-reference/src/index.ts:72` |
| `@deepseek-ai/dsh-time-context` | `packages/context/time-context` | object | 2 | `packages/context/time-context/src/index.ts:35` |
| `@deepseek-ai/dsh-tmux-context` | `packages/context/tmux-context` | object | 1 | `packages/context/tmux-context/src/index.ts:40` |
| `@deepseek-ai/dsh-agent-default-model` | `packages/core/agent-default-model` | object | 2 | `packages/core/agent-default-model/src/index.ts:65` |
| `@deepseek-ai/dsh-agent-loop` | `packages/core/agent-loop` | object | 9 | `packages/core/agent-loop/src/index.ts:300` |
| `@deepseek-ai/dsh-agent-tool-presentation` | `packages/core/agent-tool-presentation` | object | 1 | `packages/core/agent-tool-presentation/src/index.ts:50` |
| `@deepseek-ai/dsh-system-prompt` | `packages/core/system-prompt` | object | 4 | `packages/core/system-prompt/src/index.ts:339` |
| `@deepseek-ai/dsh-tools` | `packages/core/tools` | object | 2 | `packages/core/tools/src/index.ts:790` |
| `@deepseek-ai/dsh-credentials-local` | `packages/credentials/credentials-local` | object | 4 | `packages/credentials/credentials-local/src/index.ts:211` |
| `@deepseek-ai/dsh-e2b` | `packages/e2b/e2b` | object | 3 | `packages/e2b/e2b/src/index.ts:75` |
| `@deepseek-ai/dsh-subprocess-e2b` | `packages/e2b/subprocess-e2b` | object | 1 | `packages/e2b/subprocess-e2b/src/index.ts:55` |
| `@deepseek-ai/dsh-acp-demo` | `packages/examples/acp-demo` | object | 17 | `packages/examples/acp-demo/src/index.ts:79` |
| `@deepseek-ai/dsh-agent-spine-demo` | `packages/examples/agent-spine-demo` | intersect | 29 | `packages/examples/agent-spine-demo/src/index.ts:160` |
| `@deepseek-ai/dsh-cordis-host-runner` | `packages/extensions/cordis-host-runner` | object | 1 | `packages/extensions/cordis-host-runner/src/index.ts:127` |
| `@deepseek-ai/dsh-message-feedback` | `packages/feedback/message-feedback` | object | 1 | `packages/feedback/message-feedback/src/index.ts:154` |
| `@deepseek-ai/dsh-fs-local` | `packages/fs/fs-local` | object | 2 | `packages/fs/fs-local/src/index.ts:65` |
| `@deepseek-ai/dsh-tool-fs` | `packages/fs/tool-fs` | object | 4 | `packages/fs/tool-fs/src/index.ts:36` |
| `@deepseek-ai/dsh-tool-fs-search` | `packages/fs/tool-fs-search` | object | 9 | `packages/fs/tool-fs-search/src/index.ts:97` |
| `@deepseek-ai/dsh-tool-str-replace-editor` | `packages/fs/tool-str-replace-editor` | object | 2 | `packages/fs/tool-str-replace-editor/src/index.ts:505` |
| `@deepseek-ai/dsh-goal` | `packages/goal/goal` | object | 1 | `packages/goal/goal/src/index.ts:186` |
| `@deepseek-ai/dsh-tool-goal` | `packages/goal/tool-goal` | object | 1 | `packages/goal/tool-goal/src/index.ts:32` |
| `@deepseek-ai/dsh-repeat-tool-reminder` | `packages/guard/repeat-tool-reminder` | object | 4 | `packages/guard/repeat-tool-reminder/src/index.ts:45` |
| `@deepseek-ai/dsh-hooks-claude-code` | `packages/hooks/hooks-claude-code` | object | 5 | `packages/hooks/hooks-claude-code/src/index.ts:72` |
| `@deepseek-ai/dsh-hooks-codex` | `packages/hooks/hooks-codex` | object | 4 | `packages/hooks/hooks-codex/src/index.ts:60` |
| `@deepseek-ai/dsh-host-apiproxy` | `packages/host/apiproxy` | object | 3 | `packages/host/apiproxy/src/index.ts:75` |
| `@deepseek-ai/dsh-host-directory-picker-browse` | `packages/host/directory-picker-browse` | object | 1 | `packages/host/directory-picker-browse/src/index.ts:195` |
| `@deepseek-ai/dsh-host-frontend-static` | `packages/host/frontend-static` | object | 1 | `packages/host/frontend-static/src/index.ts:33` |
| `@deepseek-ai/dsh-host-webserver` | `packages/host/webserver` | object | 2 | `packages/host/webserver/src/index.ts:60` |
| `@deepseek-ai/dsh-permission-presets` | `packages/interaction/permission-presets` | object | 6 | `packages/interaction/permission-presets/src/index.ts:161` |
| `@deepseek-ai/dsh-user-approval` | `packages/interaction/user-approval` | object | 1 | `packages/interaction/user-approval/src/index.ts:193` |
| `@deepseek-ai/dsh-jobs-local` | `packages/jobs/jobs-local` | object | 1 | `packages/jobs/jobs-local/src/index.ts:92` |
| `@deepseek-ai/dsh-tool-jobs` | `packages/jobs/tool-jobs` | object | 4 | `packages/jobs/tool-jobs/src/index.ts:48` |
| `@deepseek-ai/dsh-llm-deepseek` | `packages/llm/llm-deepseek` | object | 21 | `packages/llm/llm-deepseek/src/index.ts:91` |
| `@deepseek-ai/dsh-llm-pi-ai` | `packages/llm/llm-pi-ai` | object | 42 | `packages/llm/llm-pi-ai/src/config.ts:255` |
| `@deepseek-ai/dsh-llm-retry` | `packages/llm/llm-retry` | empty object | 1 | `packages/llm/llm-retry/src/index.ts:27` |
| `@deepseek-ai/dsh-token-meter` | `packages/llm/token-meter` | empty object | 1 | `packages/llm/token-meter/src/index.ts:77` |
| `@deepseek-ai/dsh-lsp-stdio` | `packages/lsp/lsp-stdio` | object | 12 | `packages/lsp/lsp-stdio/src/index.ts:105` |
| `@deepseek-ai/dsh-tool-lsp` | `packages/lsp/tool-lsp` | object | 3 | `packages/lsp/tool-lsp/src/index.ts:67` |
| `@deepseek-ai/dsh-mcp-client` | `packages/mcp/mcp-client` | union | 15 | `packages/mcp/mcp-client/src/index.ts:107` |
| `@deepseek-ai/dsh-agent-presets` | `packages/preset/agent-presets` | object | 5 | `packages/preset/agent-presets/src/index.ts:86` |
| `@deepseek-ai/dsh-persona` | `packages/preset/persona` | object | 3 | `packages/preset/persona/src/index.ts:48` |
| `@deepseek-ai/dsh-invariants` | `packages/runtime-diagnostics/invariants` | object | 3 | `packages/runtime-diagnostics/invariants/src/index.ts:95` |
| `@deepseek-ai/dsh-sandbox-local` | `packages/sandbox/sandbox-local` | object | 3 | `packages/sandbox/sandbox-local/src/index.ts:252` |
| `@deepseek-ai/dsh-sandbox-policy` | `packages/sandbox/sandbox-policy` | object | 2 | `packages/sandbox/sandbox-policy/src/index.ts:93` |
| `@deepseek-ai/dsh-sdk-jsonrpc-server` | `packages/sdk/server` | object | 1 | `packages/sdk/server/src/index.ts:36` |
| `@deepseek-ai/dsh-session-persistence-jsonl` | `packages/session/session-persistence-jsonl` | object | 5 | `packages/session/session-persistence-jsonl/src/index.ts:126` |
| `@deepseek-ai/dsh-session-persistence-sqlite` | `packages/session/session-persistence-sqlite` | object | 4 | `packages/session/session-persistence-sqlite/src/index.ts:104` |
| `@deepseek-ai/dsh-session-projection-cache` | `packages/session/session-projection-cache` | object | 2 | `packages/session/session-projection-cache/src/index.ts:49` |
| `@deepseek-ai/dsh-session-telemetry-otel` | `packages/session/session-telemetry-otel` | object | 4 | `packages/session/session-telemetry-otel/src/index.ts:120` |
| `@deepseek-ai/dsh-session-title` | `packages/session/session-title` | object | 3 | `packages/session/session-title/src/index.ts:263` |
| `@deepseek-ai/dsh-session-title-all-prompts-llm` | `packages/session/session-title-all-prompts-llm` | object | 7 | `packages/session/session-title-all-prompts-llm/src/index.ts:18` |
| `@deepseek-ai/dsh-session-title-first-prompt-llm` | `packages/session/session-title-first-prompt-llm` | object | 7 | `packages/session/session-title-first-prompt-llm/src/index.ts:18` |
| `@deepseek-ai/dsh-session-query-sqlite` | `packages/session-query/session-query-sqlite` | object | 8 | `packages/session-query/session-query-sqlite/src/index.ts:199` |
| `@deepseek-ai/dsh-tool-session-query` | `packages/session-query/tool-session-query` | object | 2 | `packages/session-query/tool-session-query/src/index.ts:37` |
| `@deepseek-ai/dsh-settings-file` | `packages/settings/settings-file` | object | 4 | `packages/settings/settings-file/src/index.ts:106` |
| `@deepseek-ai/dsh-bash-local` | `packages/shell/bash-local` | object | 6 | `packages/shell/bash-local/src/index.ts:105` |
| `@deepseek-ai/dsh-pwsh-local` | `packages/shell/pwsh-local` | object | 7 | `packages/shell/pwsh-local/src/index.ts:131` |
| `@deepseek-ai/dsh-shell-env` | `packages/shell/shell-env` | object | 1 | `packages/shell/shell-env/src/index.ts:35` |
| `@deepseek-ai/dsh-tool-bash` | `packages/shell/tool-bash` | object | 1 | `packages/shell/tool-bash/src/index.ts:40` |
| `@deepseek-ai/dsh-tool-bash-persistent` | `packages/shell/tool-bash-persistent` | object | 4 | `packages/shell/tool-bash-persistent/src/index.ts:417` |
| `@deepseek-ai/dsh-tool-pwsh` | `packages/shell/tool-pwsh` | object | 1 | `packages/shell/tool-pwsh/src/index.ts:58` |
| `@deepseek-ai/dsh-skill` | `packages/skill/skill` | object | 1 | `packages/skill/skill/src/index.ts:358` |
| `@deepseek-ai/dsh-skill-filesystem` | `packages/skill/skill-filesystem` | object | 12 | `packages/skill/skill-filesystem/src/index.ts:76` |
| `@deepseek-ai/dsh-tool-skill` | `packages/skill/tool-skill` | object | 1 | `packages/skill/tool-skill/src/index.ts:67` |
| `@deepseek-ai/dsh-spill-local` | `packages/spill/spill-local` | object | 1 | `packages/spill/spill-local/src/index.ts:38` |
| `@deepseek-ai/dsh-spill-policy` | `packages/spill/spill-policy` | object | 1 | `packages/spill/spill-policy/src/index.ts:75` |
| `@deepseek-ai/dsh-storage-domain` | `packages/storage/storage-domain` | object | 2 | `packages/storage/storage-domain/src/index.ts:59` |
| `@deepseek-ai/dsh-storage-json` | `packages/storage/storage-json` | object | 1 | `packages/storage/storage-json/src/index.ts:33` |
| `@deepseek-ai/dsh-storage-sqlite` | `packages/storage/storage-sqlite` | object | 2 | `packages/storage/storage-sqlite/src/index.ts:45` |
| `@deepseek-ai/dsh-subagent-acp` | `packages/subagent/subagent-acp` | object | 8 | `packages/subagent/subagent-acp/src/index.ts:66` |
| `@deepseek-ai/dsh-subagent-claude-code` | `packages/subagent/subagent-claude-code` | object | 2 | `packages/subagent/subagent-claude-code/src/index.ts:42` |
| `@deepseek-ai/dsh-subagent-codex` | `packages/subagent/subagent-codex` | object | 2 | `packages/subagent/subagent-codex/src/index.ts:40` |
| `@deepseek-ai/dsh-subagent-dsh-sdk` | `packages/subagent/subagent-dsh-sdk` | object | 11 | `packages/subagent/subagent-dsh-sdk/src/index.ts:71` |
| `@deepseek-ai/dsh-subagent-fork-in-process` | `packages/subagent/subagent-fork-in-process` | object | 1 | `packages/subagent/subagent-fork-in-process/src/index.ts:36` |
| `@deepseek-ai/dsh-subagent-spawn-in-process` | `packages/subagent/subagent-spawn-in-process` | object | 1 | `packages/subagent/subagent-spawn-in-process/src/index.ts:30` |
| `@deepseek-ai/dsh-tool-subagent` | `packages/subagent/tool-subagent` | object | 13 | `packages/subagent/tool-subagent/src/index.ts:81` |
| `@deepseek-ai/dsh-tool-subagent-report` | `packages/subagent/tool-subagent-report` | object | 1 | `packages/subagent/tool-subagent-report/src/index.ts:36` |
| `@deepseek-ai/dsh-terminal-bash` | `packages/terminal/terminal-bash` | object | 14 | `packages/terminal/terminal-bash/src/config.ts:44` |
| `@deepseek-ai/dsh-tool-terminal` | `packages/terminal/tool-terminal` | object | 2 | `packages/terminal/tool-terminal/src/index.ts:43` |
| `@deepseek-ai/dsh-tool-todo` | `packages/todo/tool-todo` | object | 1 | `packages/todo/tool-todo/src/index.ts:41` |
| `@deepseek-ai/dsh-typert-loader` | `packages/typert/loader` | object | 1 | `packages/typert/loader/src/index.ts:53` |
| `@deepseek-ai/dsh-tool-web` | `packages/web/tool-web` | object | 6 | `packages/web/tool-web/src/index.ts:52` |
| `@deepseek-ai/dsh-web` | `packages/web/web` | object | 2 | `packages/web/web/src/index.ts:80` |
| `@deepseek-ai/dsh-web-fetch-http` | `packages/web/web-fetch-http` | object | 6 | `packages/web/web-fetch-http/src/index.ts:49` |
| `@deepseek-ai/dsh-web-search-deepseek` | `packages/web/web-search-deepseek` | object | 7 | `packages/web/web-search-deepseek/src/index.ts:63` |
| `@deepseek-ai/dsh-web-search-exa` | `packages/web/web-search-exa` | object | 5 | `packages/web/web-search-exa/src/index.ts:51` |
| `@deepseek-ai/dsh-web-search-perplexity` | `packages/web/web-search-perplexity` | object | 5 | `packages/web/web-search-perplexity/src/index.ts:45` |
| `@deepseek-ai/dsh-tool-ralph` | `packages/workflow/tool-ralph` | object | 4 | `packages/workflow/tool-ralph/src/index.ts:35` |
| `@deepseek-ai/dsh-tool-workflow` | `packages/workflow/tool-workflow` | object | 2 | `packages/workflow/tool-workflow/src/index.ts:40` |
| `@deepseek-ai/dsh-workflow-worker-thread` | `packages/workflow/workflow-worker-thread` | object | 6 | `packages/workflow/workflow-worker-thread/src/index.ts:115` |

### `acp`

#### `@deepseek-ai/dsh-acp`

export const Config 在 `packages/acp/acp/src/index.ts:79`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `provider` | `z.string()` | — | Provider route for created agents. | cordis.yml `config:` 可调。 | `packages/acp/acp/src/index.ts:80` |
| `model` | `z.string()` | — | Model name for created agents. | cordis.yml `config:` 可调。 | `packages/acp/acp/src/index.ts:81` |

### `attachment`

#### `@deepseek-ai/dsh-attachment-local`

static Config 在 `packages/attachment/attachment-local/src/index.ts:39`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `dshHome` | `z.string()` | — | Explicit harness home; omitted follows `DSH_HOME`, then `~/.dsh`. | 覆盖进程 home 解析，让 profile 钉死目录。 | `packages/attachment/attachment-local/src/index.ts:40` |
| `maxImageBytes` | `z.number().step(1).min(1).default(DEFAULT_MAX_IMAGE_BYTES)` | 5 * 1024 * 1024 | Maximum encoded bytes accepted for one image. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/attachment/attachment-local/src/index.ts:41` |
| `maxImagesPerMessage` | `z.number().step(1).min(1).default(DEFAULT_MAX_IMAGES_PER_MESSAGE)` | 20 | Maximum image count accepted in one submitted message. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/attachment/attachment-local/src/index.ts:42` |
| `maxMessageImageBytes` | `z.number().step(1).min(1).default(DEFAULT_MAX_MESSAGE_IMAGE_BYTES)` | 100 * 1024 * 1024 | Maximum aggregate encoded image bytes accepted in one submitted message. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/attachment/attachment-local/src/index.ts:43` |
| `maxImagePixels` | `z.number().step(1).min(1).default(DEFAULT_MAX_IMAGE_PIXELS)` | 40_000_000 | Maximum intrinsic width multiplied by height accepted for one image. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/attachment/attachment-local/src/index.ts:44` |

### `bundle`

#### `@deepseek-ai/dsh-headless`

export const Config 在 `packages/bundle/headless/src/index.ts:36`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `task` | `z.string().required()` | required（无 schema default） | The prompt text for the single run. | 省略则 schemastery / loader 拒载。 | `packages/bundle/headless/src/index.ts:37` |

#### `@deepseek-ai/dsh-web-app`

export const Config 在 `packages/bundle/web-app/src/index.ts:52`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `printUrl` | `z.boolean().default(true)` | true | Print the URL line on activation; a non-interactive layer can turn it off. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/bundle/web-app/src/index.ts:53` |
| `surfaceContext` | `z.boolean().default(true)` | true | Register the model-visible surface context (the `app:web-surface` prompt section and the `DSH_WEB_URL` bash variable). A one-shot non-interactive layer can turn it off when its user is not in the GUI, so the orientation text would be false. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/bundle/web-app/src/index.ts:54` |
| `trustedHosts` | `z.array(String).default([])` | [] | Explicit `--trusted-host` authorities from this invocation. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/bundle/web-app/src/index.ts:55` |

### `client`

#### `@deepseek-ai/dsh-client-connection`

export const Config 在 `packages/client/connection/src/index.ts:64`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `trustedHosts` | `z.array(String).default([])` | [] | Authorities this deployment serves beyond loopback: exact `host:port`, or port-less `host` matching any port. The /api trust fence refuses any request whose Host is neither loopback nor listed here, so a non-loopback (`0.0.0.0`) deployment must declare the names it is reached by (the dsh CLI derives the machine's LAN IP literals itself). An entry that is not a bare, canonical authority fails the plugin load. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/client/connection/src/index.ts:65` |
| `maxRequestBodyBytes` | `z.natural().min(1).default(DEFAULT_MAX_REQUEST_BODY_BYTES)` | DEFAULT_MAX_REQUEST_BODY_BYTES | Maximum buffered JSON body for every `/api` request. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/client/connection/src/index.ts:66` |

#### `@deepseek-ai/dsh-client-hmr`

export const Config 在 `packages/client/hmr/src/index.ts:36`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `pollIntervalMs` | `z.number().step(1).min(1).default(500)` | 500 | Bundle stat-poll interval in milliseconds (default 500, the build-side watcher's polling default). | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/client/hmr/src/index.ts:37` |

### `code-runtime`

#### `@deepseek-ai/dsh-code-runtime-worker-thread`

static Config 在 `packages/code-runtime/code-runtime-worker-thread/src/index.ts:239`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `computeMs` | `z.number().default(60_000)` | 60_000 | Busy-time budget in milliseconds: the run fails with kind `'timeout'` once the worker's MEASURED event-loop active time (`worker.performance.eventLoopUtilization()`) exceeds this. Metering measured busy time — not wall time, not host-side pending-call bookkeeping — is what makes the budget both fair (a program awaiting a slow tool accrues nothing) and ungameable (a hot loop accrues whether or not a decoy dispatch is in flight). | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/code-runtime/code-runtime-worker-thread/src/index.ts:240` |
| `maxWallMs` | `z.number().default(600_000)` | 600_000 | Wall-clock ceiling in milliseconds; never pauses for anything. The backstop for what busy-time cannot see (a program awaiting a promise nobody will resolve). At most `2_147_483_647` (Node's maximum `setTimeout` delay, about 24.9 days): a longer value is rejected at load because `setTimeout` would clamp it to 1 ms. | Wall-clock ceiling in milliseconds; never pauses for anything. | `packages/code-runtime/code-runtime-worker-thread/src/index.ts:241` |
| `maxOutputBytes` | `z.number().default(67_108_864)` | 67_108_864 | Hard cap for serialized log-array, completion-value, and failure-message payloads; fixed result-envelope syntax is excluded. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/code-runtime/code-runtime-worker-thread/src/index.ts:242` |
| `maxOldGenerationSizeMb` | `z.number().default(512)` | 512 | The worker's max old-generation heap in MiB (`resourceLimits`); overflow kills the worker, surfacing as kind `'worker-exit'`. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/code-runtime/code-runtime-worker-thread/src/index.ts:243` |

### `compaction`

#### `@deepseek-ai/dsh-compaction-basic`

static Config 在 `packages/compaction/compaction-basic/src/index.ts:106`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `thresholdRatio` | `z.number()` | — | 到达模型窗口的这一比例就 compact。默认 0.8。 | 到达模型窗口的这一比例就 compact。 | `packages/compaction/compaction-basic/src/index.ts:107` |
| `retainRatio` | `z.number()` | — | 按窗口比例保留最近上下文。默认 0.16。 | 按窗口比例保留最近上下文。 | `packages/compaction/compaction-basic/src/index.ts:108` |
| `retainTokens` | `z.number().step(1).min(0)` | — | 按绝对 token 保留最近上下文；与 retainRatio 互斥。 | 按绝对 token 保留最近上下文；与 retainRatio 互斥。 | `packages/compaction/compaction-basic/src/index.ts:109` |
| `summarizationProvider` | `z.string()` | — | 摘要用的 provider；与 summarizationModel 成对，或继承对话 target。 | 摘要用的 provider；与 summarizationModel 成对，或继承对话 target。 | `packages/compaction/compaction-basic/src/index.ts:110` |
| `summarizationModel` | `z.string()` | — | 摘要用的 model；与 summarizationProvider 成对，或继承对话 target。 | 摘要用的 model；与 summarizationProvider 成对，或继承对话 target。 | `packages/compaction/compaction-basic/src/index.ts:111` |
| `maxTokens` | `z.number().step(1).min(1)` | — | 摘要 generation cap。默认 8192。 | 摘要 generation cap。 | `packages/compaction/compaction-basic/src/index.ts:112` |
| `compactionRetries` | `z.number().step(1).min(0)` | — | 压力仍高时在第一次 compact 后再试几次。默认 1。 | 压力仍高时在第一次 compact 后再试几次。 | `packages/compaction/compaction-basic/src/index.ts:113` |
| `maxOverflowRetries` | `z.number().step(1).min(0)` | — | canonical overflow 后最多再试几次；0 关闭。默认 1。 | canonical overflow 后最多再试几次；0 关闭。 | `packages/compaction/compaction-basic/src/index.ts:114` |
| `modelPolicies` | `z.array(modelPolicy)` | — | 按精确 provider/model 覆盖默认政策；重复 target 拒载。 | 按精确 provider/model 覆盖默认政策；重复 target 拒载。 | `packages/compaction/compaction-basic/src/index.ts:115` |
| `modelPolicies[].provider` | `z.string().required()` | required（无 schema default） | Exact provider/model override merged over the default compaction policy. */ export interface ModelCompactPolicyConfig extends CompactionPolicyConfig { /** Registered provider route to match. | 省略则 schemastery / loader 拒载。 | `packages/compaction/compaction-basic/src/index.ts:83` |
| `modelPolicies[].model` | `z.string().required()` | required（无 schema default） | Exact routed model id to match within `provider`. | 省略则 schemastery / loader 拒载。 | `packages/compaction/compaction-basic/src/index.ts:84` |
| `modelPolicies[].thresholdRatio` | `z.number()` | — | 到达模型窗口的这一比例就 compact。默认 0.8。 | 到达模型窗口的这一比例就 compact。 | `packages/compaction/compaction-basic/src/index.ts:85` |
| `modelPolicies[].retainRatio` | `z.number()` | — | 按窗口比例保留最近上下文。默认 0.16。 | 按窗口比例保留最近上下文。 | `packages/compaction/compaction-basic/src/index.ts:86` |
| `modelPolicies[].retainTokens` | `z.number().step(1).min(0)` | — | 按绝对 token 保留最近上下文；与 retainRatio 互斥。 | 按绝对 token 保留最近上下文；与 retainRatio 互斥。 | `packages/compaction/compaction-basic/src/index.ts:87` |
| `modelPolicies[].summarizationProvider` | `z.string()` | — | 摘要用的 provider；与 summarizationModel 成对，或继承对话 target。 | 摘要用的 provider；与 summarizationModel 成对，或继承对话 target。 | `packages/compaction/compaction-basic/src/index.ts:88` |
| `modelPolicies[].summarizationModel` | `z.string()` | — | 摘要用的 model；与 summarizationProvider 成对，或继承对话 target。 | 摘要用的 model；与 summarizationProvider 成对，或继承对话 target。 | `packages/compaction/compaction-basic/src/index.ts:89` |
| `modelPolicies[].maxTokens` | `z.number().step(1).min(1)` | — | 摘要 generation cap。默认 8192。 | 摘要 generation cap。 | `packages/compaction/compaction-basic/src/index.ts:90` |
| `modelPolicies[].compactionRetries` | `z.number().step(1).min(0)` | — | 压力仍高时在第一次 compact 后再试几次。默认 1。 | 压力仍高时在第一次 compact 后再试几次。 | `packages/compaction/compaction-basic/src/index.ts:91` |
| `modelPolicies[].maxOverflowRetries` | `z.number().step(1).min(0)` | — | canonical overflow 后最多再试几次；0 关闭。默认 1。 | canonical overflow 后最多再试几次；0 关闭。 | `packages/compaction/compaction-basic/src/index.ts:92` |
| `auto` | `z.boolean()` | — | 是否挂自动 step-boundary / overflow 监听。默认 true。 | 是否挂自动 step-boundary / overflow 监听。 | `packages/compaction/compaction-basic/src/index.ts:116` |

#### `@deepseek-ai/dsh-compaction-tool-result-pruner`

static Config 在 `packages/compaction/compaction-tool-result-pruner/src/index.ts:49`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `thresholdChars` | `z.number().step(1).min(1).default(DEFAULTS.thresholdChars)` | DEFAULTS.thresholdChars | Character-budget policy for deterministic tool-result pruning. */ export interface ToolResultPruneConfig { /** Prune when total text exceeds this many Unicode code points. Defaults to `8192`. | Character-budget policy for deterministic tool-result pruning. | `packages/compaction/compaction-tool-result-pruner/src/index.ts:50` |
| `headChars` | `z.number().step(1).min(0).default(DEFAULTS.headChars)` | DEFAULTS.headChars | Maximum leading Unicode code points retained. Defaults to `4096`. | Maximum leading Unicode code points retained. | `packages/compaction/compaction-tool-result-pruner/src/index.ts:51` |
| `tailChars` | `z.number().step(1).min(0).default(DEFAULTS.tailChars)` | DEFAULTS.tailChars | Maximum trailing Unicode code points retained. Defaults to `1024`. | Maximum trailing Unicode code points retained. | `packages/compaction/compaction-tool-result-pruner/src/index.ts:52` |

### `context`

#### `@deepseek-ai/dsh-agent-instructions`

export const Config 在 `packages/context/agent-instructions/src/config.ts:39`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `dshHome` | `z.string()` | — | Harness home containing the fixed user-global `AGENTS.md`; defaults to `$DSH_HOME` or `~/.dsh`. | 覆盖进程 home 解析，让 profile 钉死目录。 | `packages/context/agent-instructions/src/config.ts:40` |
| `projectRootMarkers` | `z.array(z.string()).default([...DEFAULT_PROJECT_ROOT_MARKERS])` | […DEFAULT_PROJECT_ROOT_MARKERS] | Directory entries that identify the project root while walking upward from the session cwd. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/context/agent-instructions/src/config.ts:41` |
| `maxBytes` | `z.number().required()` | required（无 schema default） | UTF-8 byte cap for one rendered baseline or dynamic batch; non-positive or non-finite disables loading. | 省略则 schemastery / loader 拒载。 | `packages/context/agent-instructions/src/config.ts:42` |
| `maxSourceBytes` | `z.number().step(1).min(1).default(DEFAULT_MAX_SOURCE_BYTES)` | 1_048_576 | Maximum UTF-8 bytes read from one instruction file; larger files are ignored. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/context/agent-instructions/src/config.ts:43` |
| `instructionFileCandidates` | `z.array(z.string()).default([...DEFAULT_INSTRUCTION_FILE_CANDIDATES])` | […DEFAULT_INSTRUCTION_FILE_CANDIDATES] | Ordered same-directory project candidates; every existing file loads, with per-directory trimmed-content duplicates collapsed to the earliest candidate. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/context/agent-instructions/src/config.ts:44` |
| `localInstructionFileCandidates` | `z.array(z.string()).default([...DEFAULT_LOCAL_INSTRUCTION_FILE_CANDIDATES])` | […DEFAULT_LOCAL_INSTRUCTION_FILE_CANDIDATES] | Ordered same-directory local-overlay candidates loaded after the base files under the same per-directory trimmed-content dedup; empty disables the overlay. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/context/agent-instructions/src/config.ts:45` |

#### `@deepseek-ai/dsh-session-reference`

static Config 在 `packages/context/session-reference/src/index.ts:72`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `maxReferences` | `z.number().step(1).min(1).max(MAX_REFERENCES).default(MAX_REFERENCES)` | MAX_REFERENCES | Configuration and stable diagnostics for session references. */ /** Hard maximum references accepted by one message. */ export const MAX_REFERENCES = 3 /** Default number of discovery candidates returned to a host. */ export const DEFAULT_CANDIDATE_LIMIT = 50 /** Default UTF-8 budget for one rendered reference JSON object. */ export const DEFAULT_MAX_REFERENCE_BYTES = 65_536 /** Session-reference service configuration. */ export interface Config { /** Maximum distinct source sessions referenced by one message, from one to three. | Configuration and stable diagnostics for session references. | `packages/context/session-reference/src/index.ts:73` |
| `candidateLimit` | `z.number().step(1).min(1).default(DEFAULT_CANDIDATE_LIMIT)` | DEFAULT_CANDIDATE_LIMIT | Default host candidate-list limit. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/context/session-reference/src/index.ts:74` |
| `maxReferenceBytes` | `z.number().step(1).min(1).default(DEFAULT_MAX_REFERENCE_BYTES)` | DEFAULT_MAX_REFERENCE_BYTES | Maximum rendered UTF-8 bytes for one source snapshot. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/context/session-reference/src/index.ts:75` |

#### `@deepseek-ai/dsh-time-context`

export const Config 在 `packages/context/time-context/src/index.ts:35`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `timeZone` | `z.string()` | — | Fallback display zone when the open turn has no unique browser zone. Omit to use the process zone. | Fallback display zone when the open turn has no unique browser zone. | `packages/context/time-context/src/index.ts:36` |
| `refreshIntervalMs` | `z.number()` | — | Minimum milliseconds between durable injections in one session. Omit or set to 0 to inject at every eligible step. | Minimum milliseconds between durable injections in one session. | `packages/context/time-context/src/index.ts:37` |

#### `@deepseek-ai/dsh-tmux-context`

export const Config 在 `packages/context/tmux-context/src/index.ts:40`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `refreshIntervalMs` | `z.number()` | — | Minimum milliseconds between durable injections in one session. Omit or set to 0 to inject on every eligible change. | Minimum milliseconds between durable injections in one session. | `packages/context/tmux-context/src/index.ts:41` |

### `core`

#### `@deepseek-ai/dsh-agent-default-model`

static Config 在 `packages/core/agent-default-model/src/index.ts:65`。 [E: packages/core/agent-default-model/src/index.ts:65]

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `provider` | `z.string().required()` | required（无 schema default） | Registered provider route. | 省略则 schemastery / loader 拒载。 | `packages/core/agent-default-model/src/index.ts:66` |
| `model` | `z.string().required()` | required（无 schema default） | Provider-owned model id. | 省略则 schemastery / loader 拒载。 | `packages/core/agent-default-model/src/index.ts:67` |

#### `@deepseek-ai/dsh-agent-loop`

static Config 在 `packages/core/agent-loop/src/index.ts:300`。 [E: packages/core/agent-loop/src/index.ts:300]

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `maxParallelToolCalls` | `z.number().step(1).min(1).default(DEFAULT_MAX_PARALLEL_TOOL_CALLS)` | DEFAULT_MAX_PARALLEL_TOOL_CALLS | Maximum parallel-safe calls in flight per agent step. `1` is serial; omission defaults to {@link DEFAULT_MAX_PARALLEL_TOOL_CALLS}. | 限制一步内并行副作用，1 即串行。 | `packages/core/agent-loop/src/index.ts:301` |
| `agents` | `array` | [] | Agents created or resumed at plugin startup. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/core/agent-loop/src/index.ts:302` |
| `agents[].id` | `z.string().required()` | required（无 schema default） | Agents created or resumed at plugin startup. | 省略则 schemastery / loader 拒载。 | `packages/core/agent-loop/src/index.ts:303` |
| `agents[].sessionId` | `z.string().min(1)` | — | Agents created or resumed at plugin startup. | cordis.yml `config:` 可调。 | `packages/core/agent-loop/src/index.ts:304` |
| `agents[].provider` | `z.string()` | — | Agents created or resumed at plugin startup. | cordis.yml `config:` 可调。 | `packages/core/agent-loop/src/index.ts:305` |
| `agents[].model` | `z.string()` | — | Agents created or resumed at plugin startup. | cordis.yml `config:` 可调。 | `packages/core/agent-loop/src/index.ts:306` |
| `agents[].maxTokens` | `z.number().step(1).min(1).max(Number.MAX_SAFE_INTEGER)` | — | Agents created or resumed at plugin startup. | cordis.yml `config:` 可调。 | `packages/core/agent-loop/src/index.ts:307` |
| `agents[].cwd` | `z.string()` | — | Agents created or resumed at plugin startup. | cordis.yml `config:` 可调。 | `packages/core/agent-loop/src/index.ts:308` |
| `agents[].resumeSessionId` | `z.string()` | — | Agents created or resumed at plugin startup. | cordis.yml `config:` 可调。 | `packages/core/agent-loop/src/index.ts:309` |

#### `@deepseek-ai/dsh-agent-tool-presentation`

export const Config 在 `packages/core/agent-tool-presentation/src/index.ts:50`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `mode` | `z.union(['native', 'code', 'both']).required()` | required（无 schema default） | The form this agent's model sees. `native` sends every visible schema, `code` sends only `run_code` plus a generated SDK, `both` sends both. Required rather than defaulted: the deployment default is what a preset without this row already gets, so an omitted value would mean the row was composed for nothing. | 省略则 schemastery / loader 拒载。 | `packages/core/agent-tool-presentation/src/index.ts:51` |

#### `@deepseek-ai/dsh-system-prompt`

static Config 在 `packages/core/system-prompt/src/index.ts:339`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `includeHarnessIdentity` | `z.boolean().default(true)` | true | Include the fixed DeepSeek Harness identity before the deployment persona (default true). | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/core/system-prompt/src/index.ts:340` |
| `includeRuntimeContext` | `z.boolean().default(true)` | true | Include dynamic runtime-context snapshots in model history (default true). | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/core/system-prompt/src/index.ts:341` |
| `persona` | `z.string().default('')` | '' | Deployment-wide order-0 persona template. A scoped section named `deployment:persona` shadows it; `{variable}` references are strict. | Deployment-wide order-0 persona template. | `packages/core/system-prompt/src/index.ts:342` |
| `toolOrder` | `z.array(z.string()).default(undefined)` | undefined | Model-facing tool names in order, with {@link TOOL_ORDER_REST} exactly once. Invalid fields fail at load and unknown names fail at assembly; known names hidden in one scope may be absent there. Omitted means lexicographic order. | Model-facing tool names in order, with {@link TOOL_ORDER_REST} exactly once. | `packages/core/system-prompt/src/index.ts:344` |

#### `@deepseek-ai/dsh-tools`

static Config 在 `packages/core/tools/src/index.ts:790`。 [E: packages/core/tools/src/index.ts:790]

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `mode` | `z.union(['native', 'code', 'both']).default('native')` | 'native' | Model presentation. `native` (default) sends every visible schema; `code` sends only `run_code` plus a generated SDK prompt and collapses the executor to the same surface (a model-direct call may only name `run_code`; `run_code` SDK sub-dispatches keep every visible tool); `both` sends both forms. Code modes require a `ctx.codeRuntime` whose `language` has a registered SDK renderer (TypeScript or Python) and fail prompt assembly when it is absent or has no renderer. Under `code`, native names in `toolOrder` are invalid. | Model presentation. | `packages/core/tools/src/index.ts:791` |
| `maxParallelSubCalls` | `z.natural().min(1).default(10)` | 10 | Concurrency cap for a `run_code` program's overlapping sub-calls (default 10, the loop scheduler's own default). Sub-calls follow the native scheduling contract — only calls whose tools classify concurrency-safe overlap; exclusive calls form barriers — so `1` restores strictly serial dispatch. Must be a positive integer. | 限制一步内并行副作用，1 即串行。 | `packages/core/tools/src/index.ts:792` |

### `credentials`

#### `@deepseek-ai/dsh-credentials-local`

static Config 在 `packages/credentials/credentials-local/src/index.ts:211`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `path` | `z.string()` | — | Credentials document path; defaults to `.credentials.yaml` under the harness home. | cordis.yml `config:` 可调。 | `packages/credentials/credentials-local/src/index.ts:212` |
| `dshHome` | `z.string()` | — | Harness home used when `path` is omitted; defaults to `$DSH_HOME` or `~/.dsh`. | 覆盖进程 home 解析，让 profile 钉死目录。 | `packages/credentials/credentials-local/src/index.ts:213` |
| `watch` | `z.boolean().default(true)` | true | Watch the document and hot-publish external edits; defaults to true. | 外部改文件能否热发布，以及 settle 窗口。 | `packages/credentials/credentials-local/src/index.ts:214` |
| `debounceMs` | `z.number().min(0).default(100)` | 100 | Watcher write-settle window in milliseconds; defaults to 100. | 外部改文件能否热发布，以及 settle 窗口。 | `packages/credentials/credentials-local/src/index.ts:215` |

### `e2b`

#### `@deepseek-ai/dsh-e2b`

static Config 在 `packages/e2b/e2b/src/index.ts:75`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `apiKey` | `z.string()` | — | API key; omission reads `E2B_API_KEY`. It is never forwarded into the sandbox. | API key; omission reads `E2B_API_KEY`. | `packages/e2b/e2b/src/index.ts:76` |
| `cwd` | `z.string().default('/home/user/workspace')` | '/home/user/workspace' | Shared remote working directory, created before adapters receive the sandbox. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/e2b/e2b/src/index.ts:77` |
| `timeoutMs` | `z.number().default(300_000)` | 300_000 | E2B sandbox lifetime in milliseconds; expiry always deletes the sandbox. | 给一次 I/O 钉死上限，避免无限等。 | `packages/e2b/e2b/src/index.ts:78` |

#### `@deepseek-ai/dsh-subprocess-e2b`

static Config 在 `packages/e2b/subprocess-e2b/src/index.ts:55`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `pollMs` | `z.number().default(20)` | 20 | Remote status/liveness poll cadence in milliseconds; each tick is one control-plane request. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/e2b/subprocess-e2b/src/index.ts:56` |

### `examples`

#### `@deepseek-ai/dsh-acp-demo`

export const Config 在 `packages/examples/acp-demo/src/index.ts:79`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `provider` | `z.string().required()` | required（无 schema default） | Provider route for ACP-created agents. | 省略则 schemastery / loader 拒载。 | `packages/examples/acp-demo/src/index.ts:80` |
| `model` | `z.string().required()` | required（无 schema default） | Model name for ACP-created agents (must have a registered adapter). | 省略则 schemastery / loader 拒载。 | `packages/examples/acp-demo/src/index.ts:81` |
| `maxParallelToolCalls` | `z.number().step(1).min(1)` | — | Bundled agent-loop concurrency cap; `1` is serial and omission uses its default. | 限制一步内并行副作用，1 即串行。 | `packages/examples/acp-demo/src/index.ts:82` |
| `persona` | `z.string()` | — | Deployment persona (the system-prompt plugin's `persona` config). | cordis.yml `config:` 可调。 | `packages/examples/acp-demo/src/index.ts:83` |
| `toolOrder` | `z.array(z.string()).default(undefined)` | undefined | Explicit model-facing tool order (the system-prompt plugin's `toolOrder` config; see dsh-system-prompt). | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/examples/acp-demo/src/index.ts:87` |
| `tools` | `ToolRuntime.Config` | — | Tool-registry config — its presentation `mode` (forwarded through agent-spine-demo; see dsh-tools). | cordis.yml `config:` 可调。 | `packages/examples/acp-demo/src/index.ts:88` |
| `dshHome` | `z.string()` | — | DeepSeek Harness home directory exposed to bash and used for local skill discovery. | 覆盖进程 home 解析，让 profile 钉死目录。 | `packages/examples/acp-demo/src/index.ts:89` |
| `sessionTitle` | `agentCore.SessionTitleConfigSchema` | — | Fallback session-title limits forwarded through agent-spine-demo. | cordis.yml `config:` 可调。 | `packages/examples/acp-demo/src/index.ts:90` |
| `persistenceRoot` | `z.string().default(DEFAULT_PERSISTENCE_ROOT)` | './.sessions' | Directory for JSONL sessions and the derived query index. Defaults to `./.sessions`. | Directory for JSONL sessions and the derived query index. | `packages/examples/acp-demo/src/index.ts:91` |
| `packChunks` | `z.boolean().default(true)` | true | Write delta-chunk runs as packed storage rows (the JSONL backend's `packChunks`). Defaults to `true`. | Write delta-chunk runs as packed storage rows (the JSONL backend's `packChunks`). | `packages/examples/acp-demo/src/index.ts:92` |
| `persistenceCompression` | `JsonlCompressionSchema` | — | JSONL artifact encoding; defaults to checksummed Zstandard frames. | cordis.yml `config:` 可调。 | `packages/examples/acp-demo/src/index.ts:93` |
| `workspaceContext` | `z.union([z.const(false), workspaceContext.Config]).required()` | required（无 schema default） | Controls automatic AGENTS.md/CLAUDE.md loading; configure a byte budget or set `false`. | 省略则 schemastery / loader 拒载。 | `packages/examples/acp-demo/src/index.ts:94` |
| `skills` | `agentCore.SkillConfigSchema` | — | Skill registry, local-provider, and model-facing consumer config forwarded to agent-spine-demo. | cordis.yml `config:` 可调。 | `packages/examples/acp-demo/src/index.ts:95` |
| `toolBash` | `agentCore.ToolBashConfigSchema` | — | Model-facing bash tool config forwarded through agent-core. | cordis.yml `config:` 可调。 | `packages/examples/acp-demo/src/index.ts:96` |
| `jobs` | `agentCore.JobsConfigSchema` | — | Process-local background-job admission config forwarded through agent-core. | cordis.yml `config:` 可调。 | `packages/examples/acp-demo/src/index.ts:97` |
| `toolJobs` | `z.union([z.const(false), agentCore.ToolJobsConfigSchema])` | — | Generic background-job controls forwarded through agent-core; set false to omit their tools. | 用 false 卸掉整段能力，而不是留空对象。 | `packages/examples/acp-demo/src/index.ts:98` |
| `goals` | `z.union([z.const(false), agentCore.GoalConfigSchema])` | — | Persisted same-session goals; owner defaults enable them, or false disables the stack and tools. | cordis.yml `config:` 可调。 | `packages/examples/acp-demo/src/index.ts:99` |

#### `@deepseek-ai/dsh-agent-spine-demo`

export const Config 在 `packages/examples/agent-spine-demo/src/index.ts:160`。 schema 是 `z.intersect([AgentLoop.Config, SystemPrompt.Config, …])`。 [E: packages/examples/agent-spine-demo/src/index.ts:160]

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `maxParallelToolCalls` | `number` | DEFAULT_MAX_PARALLEL_TOOL_CALLS | 一步内并行安全 tool call 上限。 | z.intersect 并入 AgentLoop.Config。 | `packages/core/agent-loop/src/index.ts:301` |
| `agents` | `array` | [] | 启动时创建或 resume 的 agents。 | z.intersect 并入 AgentLoop.Config。 | `packages/core/agent-loop/src/index.ts:302` |
| `agents[].id` | `string` | required | agent 逻辑 id。 | z.intersect 并入 AgentLoop.Config。 | `packages/core/agent-loop/src/index.ts:303` |
| `agents[].sessionId` | `string` | — | 精确 session 身份；与 resumeSessionId 互斥。 | z.intersect 并入 AgentLoop.Config。 | `packages/core/agent-loop/src/index.ts:304` |
| `agents[].provider` | `string` | — | 该 agent 的 provider 路由。 | z.intersect 并入 AgentLoop.Config。 | `packages/core/agent-loop/src/index.ts:305` |
| `agents[].model` | `string` | — | 该 agent 的 model id。 | z.intersect 并入 AgentLoop.Config。 | `packages/core/agent-loop/src/index.ts:306` |
| `agents[].maxTokens` | `number` | — | 该 agent 的输出 cap。 | z.intersect 并入 AgentLoop.Config。 | `packages/core/agent-loop/src/index.ts:307` |
| `agents[].cwd` | `string` | — | 写入 session header 的 cwd。 | z.intersect 并入 AgentLoop.Config。 | `packages/core/agent-loop/src/index.ts:308` |
| `agents[].resumeSessionId` | `string` | — | resume 已有 session；与 sessionId 互斥。 | z.intersect 并入 AgentLoop.Config。 | `packages/core/agent-loop/src/index.ts:309` |
| `includeHarnessIdentity` | `boolean` | true | 是否注入 harness:identity prompt 段。 | z.intersect 并入 SystemPrompt.Config。 | `packages/core/system-prompt/src/index.ts:340` |
| `includeRuntimeContext` | `boolean` | true | 是否注入 runtime context。 | z.intersect 并入 SystemPrompt.Config。 | `packages/core/system-prompt/src/index.ts:341` |
| `persona` | `string` | '' | 部署 persona 名。 | z.intersect 并入 SystemPrompt.Config。 | `packages/core/system-prompt/src/index.ts:342` |
| `toolOrder` | `string[]` | undefined（省略 ≠ 空数组） | 模型可见工具序；空数组缺 rest marker。 | z.intersect 并入 SystemPrompt.Config。 | `packages/core/system-prompt/src/index.ts:344` |
| `tools` | `ToolRuntime.Config` | — | The tool registry's config — its presentation `mode` (see dsh-tools' `Config`). | cordis.yml `config:` 可调。 | `packages/examples/agent-spine-demo/src/index.ts:164` |
| `dshHome` | `z.string()` | — | DeepSeek Harness home directory shared by shell context and local skill discovery. | 覆盖进程 home 解析，让 profile 钉死目录。 | `packages/examples/agent-spine-demo/src/index.ts:165` |
| `sessionTitle` | `SessionTitleService.Config` | `EXAMPLE_SESSION_TITLE_CONFIG` | Deterministic fallback and accepted-title limits; omission uses the bundle's example policy. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/examples/agent-spine-demo/src/index.ts:166` |
| `skills` | `object` | — | Skill registry, local provider, and model-facing consumer config. Skills use `enabled` because one nested config controls a provider stack; single model-tool plugins use `Config / false` to disable that one consumer. | Skill registry, local provider, and model-facing consumer config. | `packages/examples/agent-spine-demo/src/index.ts:167` |
| `skills.enabled` | `z.boolean().default(true)` | true | Skill registry, local provider, and model-facing consumer config. Skills use `enabled` because one nested config controls a provider stack; single model-tool plugins use `Config / false` to disable that one consumer. | Skill registry, local provider, and model-facing consumer config. | `packages/examples/agent-spine-demo/src/index.ts:133` |
| `skills.registry` | `SkillRegistry.Config` | — | Skill registry, local provider, and model-facing consumer config. Skills use `enabled` because one nested config controls a provider stack; single model-tool plugins use `Config / false` to disable that one consumer. | Skill registry, local provider, and model-facing consumer config. | `packages/examples/agent-spine-demo/src/index.ts:134` |
| `skills.filesystem` | `SkillFileSystem.Config` | — | Skill registry, local provider, and model-facing consumer config. Skills use `enabled` because one nested config controls a provider stack; single model-tool plugins use `Config / false` to disable that one consumer. | Skill registry, local provider, and model-facing consumer config. | `packages/examples/agent-spine-demo/src/index.ts:135` |
| `skills.tool` | `toolSkill.Config` | — | Skill registry, local provider, and model-facing consumer config. Skills use `enabled` because one nested config controls a provider stack; single model-tool plugins use `Config / false` to disable that one consumer. | Skill registry, local provider, and model-facing consumer config. | `packages/examples/agent-spine-demo/src/index.ts:136` |
| `workspaceContext` | `z.union([z.const(false), workspaceContext.Config]).required()` | required（无 schema default） | Workspace-context loader controls with an explicit byte budget; set `false` for hermetic prompts. | 省略则 schemastery / loader 拒载。 | `packages/examples/agent-spine-demo/src/index.ts:168` |
| `toolBash` | `z.union([z.const(false), toolBash.Config])` | — | Model-facing bash tool config, or false when another plugin owns `bash`. | cordis.yml `config:` 可调。 | `packages/examples/agent-spine-demo/src/index.ts:169` |
| `jobs` | `LocalJobRegistry.Config` | — | Process-local background-job admission config. | cordis.yml `config:` 可调。 | `packages/examples/agent-spine-demo/src/index.ts:170` |
| `toolJobs` | `z.union([z.const(false), ToolJobsConfigSchema])` | — | Generic background-job controls; set false to keep the job service without model-facing job tools. | 用 false 卸掉整段能力，而不是留空对象。 | `packages/examples/agent-spine-demo/src/index.ts:171` |
| `invariants` | `InvariantRegistry.Config` | — | Global enablement and package-name filters for invariant companions. | cordis.yml `config:` 可调。 | `packages/examples/agent-spine-demo/src/index.ts:172` |
| `goals` | `z.union([z.const(false), GoalConfigSchema])` | — | Opt-in persisted same-session goal stack; set false or omit to leave it unmounted. | 用 false 卸掉整段能力，而不是留空对象。 | `packages/examples/agent-spine-demo/src/index.ts:173` |
| `goals.domain` | `GoalService.Config` | — | Opt-in persisted same-session goal stack; set false or omit to leave it unmounted. | 用 false 卸掉整段能力，而不是留空对象。 | `packages/examples/agent-spine-demo/src/index.ts:155` |
| `goals.tool` | `toolGoal.Config` | — | Opt-in persisted same-session goal stack; set false or omit to leave it unmounted. | 用 false 卸掉整段能力，而不是留空对象。 | `packages/examples/agent-spine-demo/src/index.ts:156` |

### `extensions`

#### `@deepseek-ai/dsh-cordis-host-runner`

static Config 在 `packages/extensions/cordis-host-runner/src/index.ts:127`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `vmTimeoutMs` | `z.number().min(1).default(5000)` | 5000 | Maximum synchronous VM evaluation time in milliseconds. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/extensions/cordis-host-runner/src/index.ts:128` |

### `feedback`

#### `@deepseek-ai/dsh-message-feedback`

static Config 在 `packages/feedback/message-feedback/src/index.ts:154`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `maxNoteBytes` | `s.number().step(1).min(1).required()` | required（无 schema default） | Maximum UTF-8 byte length accepted for one note. | 省略则 schemastery / loader 拒载。 | `packages/feedback/message-feedback/src/index.ts:155` |

### `fs`

#### `@deepseek-ai/dsh-fs-local`

static Config 在 `packages/fs/fs-local/src/index.ts:65`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `cwd` | `z.string().default(process.cwd())` | process.cwd() | Base directory for relative paths. Defaults to `process.cwd()`. | Base directory for relative paths. | `packages/fs/fs-local/src/index.ts:66` |
| `diffBasisMaxBytes` | `z.number().default(DEFAULT_DIFF_BASIS_MAX_BYTES)` | 10 * 1024 * 1024 | Exclusive UTF-8 byte limit on each overwrite-diff side, capped by the runtime's safe allocation/decode maximum. Defaults to 10 MiB. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/fs/fs-local/src/index.ts:67` |

#### `@deepseek-ai/dsh-tool-fs`

export const Config 在 `packages/fs/tool-fs/src/index.ts:36`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `readLimit` | `z.number().default(READ_LIMIT)` | READ_LIMIT | Default and maximum number of lines returned by one `read` call. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/fs/tool-fs/src/index.ts:37` |
| `readMaxLineLength` | `z.number().default(READ_MAX_LINE_LENGTH)` | READ_MAX_LINE_LENGTH | Maximum characters returned for a single line before truncation. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/fs/tool-fs/src/index.ts:38` |
| `readMaxBytes` | `z.number().default(READ_MAX_BYTES)` | READ_MAX_BYTES | Maximum bytes returned for the selected lines of one `read` call. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/fs/tool-fs/src/index.ts:39` |
| `readStreamMinSize` | `z.number().default(STREAM_MIN_SIZE)` | STREAM_MIN_SIZE | Files ≥ this size stream instead of loading whole into memory. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/fs/tool-fs/src/index.ts:40` |

#### `@deepseek-ai/dsh-tool-fs-search`

export const Config 在 `packages/fs/tool-fs-search/src/index.ts:97`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `sampleOverCapGlobResults` | `z.boolean().required()` | required（无 schema default） | Whether an over-cap `glob` page is sampled across top-level entries instead of taking the modification-time head. | 省略则 schemastery / loader 拒载。 | `packages/fs/tool-fs-search/src/index.ts:98` |
| `globMaxResults` | `z.number().default(GLOB_MAX_RESULTS)` | GLOB_MAX_RESULTS | Max paths one `glob` call retains inline; later paths go to the formatted spill file. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/fs/tool-fs-search/src/index.ts:99` |
| `grepMaxMatches` | `z.number().default(GREP_MAX_MATCHES)` | GREP_MAX_MATCHES | Max flat matches one `grep` call retains inline; later matches go to the formatted spill file. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/fs/tool-fs-search/src/index.ts:100` |
| `grepMaxLineBytes` | `z.number().default(GREP_MAX_LINE_BYTES)` | GREP_MAX_LINE_BYTES | Max bytes retained for one matched-line preview (the cut preserves UTF-8 boundaries). | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/fs/tool-fs-search/src/index.ts:101` |
| `searchMetaMaxBytes` | `z.number().default(SEARCH_META_MAX_BYTES)` | SEARCH_META_MAX_BYTES | Max bytes of one search's serialized `presentationMeta`; trailing groups/paths drop past it so the persisted card stays bounded. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/fs/tool-fs-search/src/index.ts:102` |
| `rawOutputMaxBytes` | `z.number().default(RAW_OUTPUT_MAX_BYTES)` | RAW_OUTPUT_MAX_BYTES | Max complete raw `rg` stdout bytes a search will parse; larger raw output fails with `SEARCH_RAW_OUTPUT_OVERFLOW`. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/fs/tool-fs-search/src/index.ts:103` |
| `graceMs` | `z.number().default(SEARCH_GRACE_MS)` | SEARCH_GRACE_MS | Terminate-escalation grace (ms), handed to the subprocess seam and bounded by `MAX_TIMER_DELAY_MS`. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/fs/tool-fs-search/src/index.ts:104` |
| `stderrMaxBytes` | `z.number().default(SEARCH_STDERR_MAX_BYTES)` | SEARCH_STDERR_MAX_BYTES | Max bytes retained for one search's stderr tail; the excerpt is embedded in `SEARCH_*` error messages, never shown on success. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/fs/tool-fs-search/src/index.ts:105` |
| `timeoutMs` | `z.number().default(SEARCH_TIMEOUT_MS)` | SEARCH_TIMEOUT_MS | Cooperative tool-call timeout budget (ms) on both tools, enforced by `@deepseek-ai/dsh-tool-call-timeout-policy` through `exec.signal`. | 给一次 I/O 钉死上限，避免无限等。 | `packages/fs/tool-fs-search/src/index.ts:106` |

#### `@deepseek-ai/dsh-tool-str-replace-editor`

export const Config 在 `packages/fs/tool-str-replace-editor/src/index.ts:505`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `maxOutputChars` | `z.number().default(16_000)` | 16_000 | Maximum returned view characters before clipping (default 16000). | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/fs/tool-str-replace-editor/src/index.ts:506` |
| `description` | `z.string().default(DEFAULT_DESCRIPTION)` | ` | Model-facing tool description. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/fs/tool-str-replace-editor/src/index.ts:507` |

### `goal`

#### `@deepseek-ai/dsh-goal`

static Config 在 `packages/goal/goal/src/index.ts:186`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `defaultMaxGoalRounds` | `z.number().default(256)` | 256 | Validated positive safe-integer default round cap. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/goal/goal/src/index.ts:187` |

#### `@deepseek-ai/dsh-tool-goal`

export const Config 在 `packages/goal/tool-goal/src/index.ts:32`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `blockedAfterConsecutiveRounds` | `z.number().step(1).min(1).default(3)` | 3 | Minimum admitted goal rounds before the model may self-report `blocked`. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/goal/tool-goal/src/index.ts:33` |

### `guard`

#### `@deepseek-ai/dsh-repeat-tool-reminder`

export const Config 在 `packages/guard/repeat-tool-reminder/src/index.ts:45`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `thresholds` | `z.array(z.number()).default([3, 5, 8])` | [3, 5, 8] | Consecutive-repeat counts that trigger a reminder (default `[3, 5, 8]`). | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/guard/repeat-tool-reminder/src/index.ts:46` |
| `include` | `z.array(z.string()).default([])` | [] | Tool-name patterns to track; empty means every tool is tracked. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/guard/repeat-tool-reminder/src/index.ts:47` |
| `exclude` | `z.array(z.string()).default([])` | [] | Tool-name patterns transparent to the chain (neither count nor reset). | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/guard/repeat-tool-reminder/src/index.ts:48` |
| `argumentsPreviewChars` | `z.number().default(500)` | 500 | Maximum characters of canonical arguments quoted in the DETAILED reminder (default 500). Large payloads (a `write` body, a long command) would otherwise ride into the next request unbounded — precisely in a loop scenario; the cap bounds the reminder, never the detection (the chain key always compares the FULL canonical string). | Maximum characters of canonical arguments quoted in the DETAILED reminder (default 500). | `packages/guard/repeat-tool-reminder/src/index.ts:49` |

### `hooks`

#### `@deepseek-ai/dsh-hooks-claude-code`

export const Config 在 `packages/hooks/hooks-claude-code/src/index.ts:72`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `configPath` | `z.string().required()` | required（无 schema default） | Path to a `hooks.json` or a settings file whose `hooks` key holds the config. Process-level: read once at load, a relative path resolves against the process launch cwd, so one config applies to the whole process. TODO(per-session-hook-config): per-session discovery of a project-local `hooks.json` from each `session/new.cwd`. | 省略则 schemastery / loader 拒载。 | `packages/hooks/hooks-claude-code/src/index.ts:73` |
| `pluginRoot` | `z.string()` | — | Replaces `${CLAUDE_PLUGIN_ROOT}` in command strings (the plugin's root dir). | cordis.yml `config:` 可调。 | `packages/hooks/hooks-claude-code/src/index.ts:74` |
| `projectDir` | `z.string()` | — | Replaces `${CLAUDE_PROJECT_DIR}` in command strings AND is exported as the `CLAUDE_PROJECT_DIR` env var for hook processes. When omitted, the env var defaults per-run to the agent's session workspace (`session.header.cwd`, the same dir the hook runs in) — Claude Code always exports this var, and common unmodified hooks reference `$CLAUDE_PROJECT_DIR` for project-relative paths. | cordis.yml `config:` 可调。 | `packages/hooks/hooks-claude-code/src/index.ts:75` |
| `defaultTimeoutMs` | `z.number().default(DEFAULT_HOOK_TIMEOUT_MS)` | DEFAULT_HOOK_TIMEOUT_MS | Default per-hook timeout in ms when a hook sets none (CC default: 600000). | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/hooks/hooks-claude-code/src/index.ts:76` |
| `stderrSummaryMaxChars` | `z.number().default(DEFAULT_STDERR_SUMMARY_MAX_CHARS)` | DEFAULT_STDERR_SUMMARY_MAX_CHARS | Character cap for the `hook/result` event's persisted stderr summary. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/hooks/hooks-claude-code/src/index.ts:77` |

#### `@deepseek-ai/dsh-hooks-codex`

export const Config 在 `packages/hooks/hooks-codex/src/index.ts:60`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `configPath` | `z.string().required()` | required（无 schema default） | Path to a Codex `hooks.json`. Process-level: read once at load, a relative path resolves against the process launch cwd. TODO(per-session-hook-config): per-session project-local discovery from each `session/new.cwd`. | 省略则 schemastery / loader 拒载。 | `packages/hooks/hooks-codex/src/index.ts:61` |
| `model` | `z.string().default('')` | '' | The model name stamped on every payload (Codex includes `model` on each event). | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/hooks/hooks-codex/src/index.ts:62` |
| `defaultTimeoutMs` | `z.number().default(DEFAULT_HOOK_TIMEOUT_MS)` | DEFAULT_HOOK_TIMEOUT_MS | Default per-hook timeout in ms when a hook sets none (Codex default: 600000). | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/hooks/hooks-codex/src/index.ts:63` |
| `stderrSummaryMaxChars` | `z.number().default(DEFAULT_STDERR_SUMMARY_MAX_CHARS)` | DEFAULT_STDERR_SUMMARY_MAX_CHARS | Character cap for the `hook/result` event's persisted stderr summary. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/hooks/hooks-codex/src/index.ts:64` |

### `host`

#### `@deepseek-ai/dsh-host-apiproxy`

static Config 在 `packages/host/apiproxy/src/index.ts:75`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `nativeOpen` | `z.boolean()` | — | Whether this deployment can hand paths to a native desktop opener — the `hasDocument` capability the agent-preset roster reports. Absent, the platform is asked (macOS/Windows/WSL yes; Linux only with a display server); set it explicitly where detection misleads, e.g. `false` in a container whose DISPLAY points nowhere a user can see. | cordis.yml `config:` 可调。 | `packages/host/apiproxy/src/index.ts:76` |
| `sessionExportCompressionLevel` | `z.number().step(1).min(0).max(9).default(DEFAULT_SESSION_LOG_COMPRESSION_LEVEL)` | DEFAULT_SESSION_LOG_COMPRESSION_LEVEL | DEFLATE level for every session-log ZIP entry: `0` stores without compression, `1` favors CPU/latency, and `9` favors archive size. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/host/apiproxy/src/index.ts:77` |
| `coldBlankProbeMaxBytes` | `z.natural().default(DEFAULT_COLD_BLANK_PROBE_MAX_BYTES)` | DEFAULT_COLD_BLANK_PROBE_MAX_BYTES | Maximum physical size of a cold Session artifact eligible for blankness verification. Zero disables probes. | Maximum physical size of a cold Session artifact eligible for blankness verification. | `packages/host/apiproxy/src/index.ts:79` |

#### `@deepseek-ai/dsh-host-directory-picker-browse`

static Config 在 `packages/host/directory-picker-browse/src/index.ts:195`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `maxEntries` | `z.natural().min(1).default(1000)` | 1000 | Complete-result bound of one listing level; see {@link BrowseDirectoryPicker.Config}. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/host/directory-picker-browse/src/index.ts:196` |

#### `@deepseek-ai/dsh-host-frontend-static`

export const Config 在 `packages/host/frontend-static/src/index.ts:33`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `distIndex` | `z.string().required()` | required（无 schema default） | Absolute path of index.html inside the dist root. | 省略则 schemastery / loader 拒载。 | `packages/host/frontend-static/src/index.ts:34` |

#### `@deepseek-ai/dsh-host-webserver`

static Config 在 `packages/host/webserver/src/index.ts:60`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `host` | `z.union([z.const('127.0.0.1'), z.const('0.0.0.0')]).required()` | required（无 schema default） | Listen host; the two supported values are loopback and all-interfaces. | 省略则 schemastery / loader 拒载。 | `packages/host/webserver/src/index.ts:61` |
| `port` | `z.natural().max(65535).required()` | required（无 schema default） | Listen port; zero requests an OS-assigned port. | 省略则 schemastery / loader 拒载。 | `packages/host/webserver/src/index.ts:62` |

### `interaction`

#### `@deepseek-ai/dsh-permission-presets`

static Config 在 `packages/interaction/permission-presets/src/index.ts:161`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `presets` | `dict` | { 'workspace-write': { sandbox: 'workspace-write', approval: 'ask',… | The preset table: name → knob bundle. Defaults to `workspace-write` (workspace-write + ask) and `danger-full-access` (danger-full-access + never). The name `custom` is reserved for the derived not-a-preset state. | The preset table: name → knob bundle. | `packages/interaction/permission-presets/src/index.ts:162` |
| `presets.*.sandbox` | `z.union(SANDBOX_MODES).required()` | required（无 schema default） | The preset table: name → knob bundle. Defaults to `workspace-write` (workspace-write + ask) and `danger-full-access` (danger-full-access + never). The name `custom` is reserved for the derived not-a-preset state. | 省略则 schemastery / loader 拒载。 | `packages/interaction/permission-presets/src/index.ts:163` |
| `presets.*.approval` | `z.union(APPROVAL_POLICIES).required()` | required（无 schema default） | The preset table: name → knob bundle. Defaults to `workspace-write` (workspace-write + ask) and `danger-full-access` (danger-full-access + never). The name `custom` is reserved for the derived not-a-preset state. | 省略则 schemastery / loader 拒载。 | `packages/interaction/permission-presets/src/index.ts:164` |
| `presets.*.name` | `z.string()` | — | The preset table: name → knob bundle. Defaults to `workspace-write` (workspace-write + ask) and `danger-full-access` (danger-full-access + never). The name `custom` is reserved for the derived not-a-preset state. | 改模型可见 / 注册名，而不改实现包。 | `packages/interaction/permission-presets/src/index.ts:165` |
| `presets.*.description` | `z.string()` | — | The preset table: name → knob bundle. Defaults to `workspace-write` (workspace-write + ask) and `danger-full-access` (danger-full-access + never). The name `custom` is reserved for the derived not-a-preset state. | The preset table: name → knob bundle. | `packages/interaction/permission-presets/src/index.ts:166` |
| `defaultPreset` | `z.string()` | — | Default for new sessions. When omitted, the preset matching the composed sandbox and approval defaults is used. | Default for new sessions. | `packages/interaction/permission-presets/src/index.ts:177` |

#### `@deepseek-ai/dsh-user-approval`

static Config 在 `packages/interaction/user-approval/src/index.ts:193`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `policy` | `z.union(['ask', 'never']).default('ask')` | 'ask' | The deployment's default {@link ApprovalPolicy} for sessions without an `approval/policy` override — `'ask'` delegates to the composed answerers (fail-closed with none); `'never'` auto-rejects every ask without prompting (the deterministic CI/unattended stance). | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/interaction/user-approval/src/index.ts:194` |

### `jobs`

#### `@deepseek-ai/dsh-jobs-local`

static Config 在 `packages/jobs/jobs-local/src/index.ts:92`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `maxConcurrentJobsPerOwner` | `z.number().step(1).min(1).max(Number.MAX_SAFE_INTEGER).default(DEFAULT_MAX_CONCURRENT_T…` | 10 | Maximum `running` plus `stopping` jobs per exact owner or in the shared unowned bucket; omission defaults to 10. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/jobs/jobs-local/src/index.ts:93` |

#### `@deepseek-ai/dsh-tool-jobs`

export const Config 在 `packages/jobs/tool-jobs/src/index.ts:48`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `waitTimeoutMs` | `z.number().min(1).default(30_000)` | 30_000 | Wait duration applied when `job_output` sets `wait` without `timeout_ms` (default 30s). | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/jobs/tool-jobs/src/index.ts:49` |
| `maxWaitTimeoutMs` | `z.number().min(1).default(600_000)` | 600_000 | Hard cap on any single wait; a larger model-supplied `timeout_ms` is clamped down to it (default 10min). | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/jobs/tool-jobs/src/index.ts:50` |
| `completionDelivery` | `z.union(['quiet', 'wakeup']).default('wakeup')` | 'wakeup' | Whether a completion opens a turn on an idle owner (default `wakeup`). | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/jobs/tool-jobs/src/index.ts:51` |
| `maxConsecutiveWakes` | `z.number().min(1).default(3)` | 3 | Turns one owner may have opened by completion wakes before the next notice degrades to injection, reset by any user-authored input (default 3). Bounds the self-exciting chain where a woken turn starts the job whose completion wakes it again. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/jobs/tool-jobs/src/index.ts:52` |

### `llm`

#### `@deepseek-ai/dsh-llm-deepseek`

export const Config 在 `packages/llm/llm-deepseek/src/index.ts:91`。 [E: packages/llm/llm-deepseek/src/index.ts:91]

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `apiKeyEnv` | `z.string().role('credential-ref').default(DEFAULT_API_KEY_ENV)` | 'DEEPSEEK_API_KEY' | Credential reference (environment-variable name) resolved per request; defaults to `DEEPSEEK_API_KEY`. | 只存凭证引用名，真值走 ctx.credentials。 | `packages/llm/llm-deepseek/src/index.ts:92` |
| `baseURL` | `z.string()` | — | Endpoint base; falls back to $DEEPSEEK_BASE_URL from a trusted environment layer, then the public API. | cordis.yml `config:` 可调。 | `packages/llm/llm-deepseek/src/index.ts:93` |
| `thinking` | `z.union(['enabled', 'disabled'])` | — | Deployment thinking policy; `disabled` limits every conversation request to `off`. | cordis.yml `config:` 可调。 | `packages/llm/llm-deepseek/src/index.ts:94` |
| `reasoningEffort` | `z.union(['off', 'high', 'max'])` | — | Default thinking effort (default `high`); `off` disables thinking per request. | cordis.yml `config:` 可调。 | `packages/llm/llm-deepseek/src/index.ts:95` |
| `maxTokens` | `z.number().step(1).min(1).max(Number.MAX_SAFE_INTEGER).default(DEFAULT_MAX_TOKENS)` | DEFAULT_MAX_TOKENS | Default per-request output cap (default 256,000); a model's own cap and explicit request values win. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/llm/llm-deepseek/src/index.ts:96` |
| `defaultContextWindow` | `z.number().step(1).min(1).default(DEFAULT_CONTEXT_WINDOW)` | DEFAULT_CONTEXT_WINDOW | Positive context capacity used when the selected model has no exact value (default 1,000,000). | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/llm/llm-deepseek/src/index.ts:97` |
| `models` | `z.array(catalogModel).default(DEFAULT_MODELS)` | [ | Advisory models shown by discovery consumers; defaults to V4 Flash and V4 Pro. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/llm/llm-deepseek/src/index.ts:98` |
| `models[].id` | `z.string().required()` | required（无 schema default） | Advisory models shown by discovery consumers; defaults to V4 Flash and V4 Pro. | 省略则 schemastery / loader 拒载。 | `packages/llm/llm-deepseek/src/index.ts:84` |
| `models[].name` | `z.string()` | — | Advisory models shown by discovery consumers; defaults to V4 Flash and V4 Pro. | 改模型可见 / 注册名，而不改实现包。 | `packages/llm/llm-deepseek/src/index.ts:85` |
| `models[].description` | `z.string()` | — | Advisory models shown by discovery consumers; defaults to V4 Flash and V4 Pro. | cordis.yml `config:` 可调。 | `packages/llm/llm-deepseek/src/index.ts:86` |
| `models[].contextWindow` | `z.number().step(1).min(1)` | — | Advisory models shown by discovery consumers; defaults to V4 Flash and V4 Pro. | cordis.yml `config:` 可调。 | `packages/llm/llm-deepseek/src/index.ts:87` |
| `models[].maxTokens` | `z.number().step(1).min(1)` | — | Advisory models shown by discovery consumers; defaults to V4 Flash and V4 Pro. | cordis.yml `config:` 可调。 | `packages/llm/llm-deepseek/src/index.ts:88` |
| `streamIdleTimeoutMs` | `z.number().min(Number.MIN_VALUE).max(MAX_TIMER_DELAY_MS).default(DEFAULT_STREAM_IDLE_TI…` | DEFAULT_STREAM_IDLE_TIMEOUT_MS | Maximum provider idle time while one stream read is outstanding (default five minutes). | 给一次 I/O 钉死上限，避免无限等。 | `packages/llm/llm-deepseek/src/index.ts:99` |
| `retryPolicy` | `RetryPolicySchema` | — | Provider-owned model-request retry policy; omission uses normal defaults. | 重试挂在 provider 路由上，不在 dsh-llm-retry 自己的 Config。 | `packages/llm/llm-deepseek/src/index.ts:100` |
| `retryPolicy.mode` | `'normal' / 'always'` | required | normal 只重试配置过的瞬态码；always 遇失败就重试。 | 把政策形状钉在 provider 路由上。 | `packages/llm/llm/src/retry-policy.ts:88` |
| `retryPolicy.maxRetries` | `number` | 2（normal） | 第一次请求之后最多再试几次。 | 只在 mode=normal 上有意义。 | `packages/llm/llm/src/retry-policy.ts:89` |
| `retryPolicy.retryableCodes` | `string[]` | EMPTY_RESPONSE / RATE_LIMIT / SERVER / TIMEOUT / TRANSPORT | normal 模式可重试的稳定失败码。 | 只在 mode=normal 上有意义。 | `packages/llm/llm/src/retry-policy.ts:90` |
| `retryPolicy.backoff` | `object` | — | 指数退避与抖动。 | 两种 mode 共用。 | `packages/llm/llm/src/retry-policy.ts:91` |
| `retryPolicy.backoff.initialDelayMs` | `number` | 500 | 本地指数退避的初始延迟（ms）。 | 钳在 MAX_TIMER_DELAY_MS 内。 | `packages/llm/llm/src/retry-policy.ts:82` |
| `retryPolicy.backoff.maxDelayMs` | `number` | 10000 | 本地调度或接受的最大延迟（ms）。 | 钳在 MAX_TIMER_DELAY_MS 内。 | `packages/llm/llm/src/retry-policy.ts:83` |
| `retryPolicy.backoff.jitterRatio` | `number` | 0.1 | 对称随机抖动比例。 | 避免雷鸣群重试。 | `packages/llm/llm/src/retry-policy.ts:84` |

#### `@deepseek-ai/dsh-llm-pi-ai`

export const Config 在 `packages/llm/llm-pi-ai/src/config.ts:255`。 [E: packages/llm/llm-pi-ai/src/config.ts:255]

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `providers` | `z.dict(profile).default({})` | {} | pi-ai provider routes, keyed by provider. An empty (or omitted) dict is the dormant settings-driven posture: the adapter mounts with no routes and registers them the moment a settings section supplies profiles. | pi-ai provider routes, keyed by provider. | `packages/llm/llm-pi-ai/src/config.ts:256` |
| `providers.*.apiKeyEnv` | `z.string().role('credential-ref')` | — | pi-ai provider routes, keyed by provider. An empty (or omitted) dict is the dormant settings-driven posture: the adapter mounts with no routes and registers them the moment a settings section supplies profiles. | 只存凭证引用名，真值走 ctx.credentials。 | `packages/llm/llm-pi-ai/src/config.ts:233` |
| `providers.*.displayName` | `z.string()` | — | pi-ai provider routes, keyed by provider. An empty (or omitted) dict is the dormant settings-driven posture: the adapter mounts with no routes and registers them the moment a settings section supplies profiles. | pi-ai provider routes, keyed by provider. | `packages/llm/llm-pi-ai/src/config.ts:234` |
| `providers.*.api` | `z.union(supportedProtocols())` | — | pi-ai provider routes, keyed by provider. An empty (or omitted) dict is the dormant settings-driven posture: the adapter mounts with no routes and registers them the moment a settings section supplies profiles. | pi-ai provider routes, keyed by provider. | `packages/llm/llm-pi-ai/src/config.ts:235` |
| `providers.*.baseURL` | `z.string()` | — | pi-ai provider routes, keyed by provider. An empty (or omitted) dict is the dormant settings-driven posture: the adapter mounts with no routes and registers them the moment a settings section supplies profiles. | pi-ai provider routes, keyed by provider. | `packages/llm/llm-pi-ai/src/config.ts:236` |
| `providers.*.models` | `z.array(modelProfile)` | — | pi-ai provider routes, keyed by provider. An empty (or omitted) dict is the dormant settings-driven posture: the adapter mounts with no routes and registers them the moment a settings section supplies profiles. | pi-ai provider routes, keyed by provider. | `packages/llm/llm-pi-ai/src/config.ts:237` |
| `providers.*.models[].id` | `z.string().required()` | required（无 schema default） | pi-ai provider routes, keyed by provider. An empty (or omitted) dict is the dormant settings-driven posture: the adapter mounts with no routes and registers them the moment a settings section supplies profiles. | 省略则 schemastery / loader 拒载。 | `packages/llm/llm-pi-ai/src/config.ts:225` |
| `providers.*.models[].name` | `z.string()` | — | pi-ai provider routes, keyed by provider. An empty (or omitted) dict is the dormant settings-driven posture: the adapter mounts with no routes and registers them the moment a settings section supplies profiles. | 改模型可见 / 注册名，而不改实现包。 | `packages/llm/llm-pi-ai/src/config.ts:210` |
| `providers.*.models[].contextWindow` | `z.number().step(1).min(1)` | — | pi-ai provider routes, keyed by provider. An empty (or omitted) dict is the dormant settings-driven posture: the adapter mounts with no routes and registers them the moment a settings section supplies profiles. | pi-ai provider routes, keyed by provider. | `packages/llm/llm-pi-ai/src/config.ts:211` |
| `providers.*.models[].maxTokens` | `z.number().step(1).min(1)` | — | pi-ai provider routes, keyed by provider. An empty (or omitted) dict is the dormant settings-driven posture: the adapter mounts with no routes and registers them the moment a settings section supplies profiles. | pi-ai provider routes, keyed by provider. | `packages/llm/llm-pi-ai/src/config.ts:212` |
| `providers.*.models[].input` | `z.array(z.union(MODALITIES))` | — | pi-ai provider routes, keyed by provider. An empty (or omitted) dict is the dormant settings-driven posture: the adapter mounts with no routes and registers them the moment a settings section supplies profiles. | pi-ai provider routes, keyed by provider. | `packages/llm/llm-pi-ai/src/config.ts:216` |
| `providers.*.models[].reasoningEfforts` | `z.union([z.const(false), reasoningEfforts])` | — | pi-ai provider routes, keyed by provider. An empty (or omitted) dict is the dormant settings-driven posture: the adapter mounts with no routes and registers them the moment a settings section supplies profiles. | pi-ai provider routes, keyed by provider. | `packages/llm/llm-pi-ai/src/config.ts:220` |
| `providers.*.models[].compat` | `object` | — | pi-ai provider routes, keyed by provider. An empty (or omitted) dict is the dormant settings-driven posture: the adapter mounts with no routes and registers them the moment a settings section supplies profiles. | pi-ai provider routes, keyed by provider. | `packages/llm/llm-pi-ai/src/config.ts:221` |
| `providers.*.models[].compat.thinkingFormat` | `z.union(SUPPORTED_THINKING_FORMATS)` | — | pi-ai provider routes, keyed by provider. An empty (or omitted) dict is the dormant settings-driven posture: the adapter mounts with no routes and registers them the moment a settings section supplies profiles. | pi-ai provider routes, keyed by provider. | `packages/llm/llm-pi-ai/src/config.ts:189` |
| `providers.*.models[].compat.supportsReasoningEffort` | `z.boolean()` | — | pi-ai provider routes, keyed by provider. An empty (or omitted) dict is the dormant settings-driven posture: the adapter mounts with no routes and registers them the moment a settings section supplies profiles. | pi-ai provider routes, keyed by provider. | `packages/llm/llm-pi-ai/src/config.ts:190` |
| `providers.*.modelOverrides` | `z.dict(modelOverride)` | — | pi-ai provider routes, keyed by provider. An empty (or omitted) dict is the dormant settings-driven posture: the adapter mounts with no routes and registers them the moment a settings section supplies profiles. | pi-ai provider routes, keyed by provider. | `packages/llm/llm-pi-ai/src/config.ts:238` |
| `providers.*.compat` | `object` | — | pi-ai provider routes, keyed by provider. An empty (or omitted) dict is the dormant settings-driven posture: the adapter mounts with no routes and registers them the moment a settings section supplies profiles. | pi-ai provider routes, keyed by provider. | `packages/llm/llm-pi-ai/src/config.ts:239` |
| `providers.*.compat.thinkingFormat` | `z.union(SUPPORTED_THINKING_FORMATS)` | — | pi-ai provider routes, keyed by provider. An empty (or omitted) dict is the dormant settings-driven posture: the adapter mounts with no routes and registers them the moment a settings section supplies profiles. | pi-ai provider routes, keyed by provider. | `packages/llm/llm-pi-ai/src/config.ts:189` |
| `providers.*.compat.supportsReasoningEffort` | `z.boolean()` | — | pi-ai provider routes, keyed by provider. An empty (or omitted) dict is the dormant settings-driven posture: the adapter mounts with no routes and registers them the moment a settings section supplies profiles. | pi-ai provider routes, keyed by provider. | `packages/llm/llm-pi-ai/src/config.ts:190` |
| `providers.*.defaultContextWindow` | `z.number().step(1).min(1).default(DEFAULT_CONTEXT_WINDOW)` | 262_144 | pi-ai provider routes, keyed by provider. An empty (or omitted) dict is the dormant settings-driven posture: the adapter mounts with no routes and registers them the moment a settings section supplies profiles. | pi-ai provider routes, keyed by provider. | `packages/llm/llm-pi-ai/src/config.ts:240` |
| `providers.*.defaultMaxTokens` | `z.number().step(1).min(1).default(DEFAULT_MAX_TOKENS)` | 32_768 | pi-ai provider routes, keyed by provider. An empty (or omitted) dict is the dormant settings-driven posture: the adapter mounts with no routes and registers them the moment a settings section supplies profiles. | pi-ai provider routes, keyed by provider. | `packages/llm/llm-pi-ai/src/config.ts:241` |
| `providers.*.defaultInput` | `z.array(z.union(MODALITIES)).default([...DEFAULT_INPUT])` | […DEFAULT_INPUT] | pi-ai provider routes, keyed by provider. An empty (or omitted) dict is the dormant settings-driven posture: the adapter mounts with no routes and registers them the moment a settings section supplies profiles. | pi-ai provider routes, keyed by provider. | `packages/llm/llm-pi-ai/src/config.ts:242` |
| `providers.*.headers` | `z.dict(z.string())` | — | pi-ai provider routes, keyed by provider. An empty (or omitted) dict is the dormant settings-driven posture: the adapter mounts with no routes and registers them the moment a settings section supplies profiles. | pi-ai provider routes, keyed by provider. | `packages/llm/llm-pi-ai/src/config.ts:243` |
| `providers.*.reasoning` | `z.union(THINKING_LEVELS)` | — | pi-ai provider routes, keyed by provider. An empty (or omitted) dict is the dormant settings-driven posture: the adapter mounts with no routes and registers them the moment a settings section supplies profiles. | pi-ai provider routes, keyed by provider. | `packages/llm/llm-pi-ai/src/config.ts:244` |
| `providers.*.thinkingBudgets` | `z.object({ minimal: z.number(), low: z.number(), medium: z.number(), high: z.number(), })` | — | pi-ai provider routes, keyed by provider. An empty (or omitted) dict is the dormant settings-driven posture: the adapter mounts with no routes and registers them the moment a settings section supplies profiles. | pi-ai provider routes, keyed by provider. | `packages/llm/llm-pi-ai/src/config.ts:245` |
| `providers.*.thinkingBudgets.minimal` | `z.number()` | — | pi-ai provider routes, keyed by provider. An empty (or omitted) dict is the dormant settings-driven posture: the adapter mounts with no routes and registers them the moment a settings section supplies profiles. | pi-ai provider routes, keyed by provider. | `packages/llm/llm-pi-ai/src/config.ts:182` |
| `providers.*.thinkingBudgets.low` | `z.number()` | — | pi-ai provider routes, keyed by provider. An empty (or omitted) dict is the dormant settings-driven posture: the adapter mounts with no routes and registers them the moment a settings section supplies profiles. | pi-ai provider routes, keyed by provider. | `packages/llm/llm-pi-ai/src/config.ts:183` |
| `providers.*.thinkingBudgets.medium` | `z.number()` | — | pi-ai provider routes, keyed by provider. An empty (or omitted) dict is the dormant settings-driven posture: the adapter mounts with no routes and registers them the moment a settings section supplies profiles. | pi-ai provider routes, keyed by provider. | `packages/llm/llm-pi-ai/src/config.ts:184` |
| `providers.*.thinkingBudgets.high` | `z.number()` | — | pi-ai provider routes, keyed by provider. An empty (or omitted) dict is the dormant settings-driven posture: the adapter mounts with no routes and registers them the moment a settings section supplies profiles. | pi-ai provider routes, keyed by provider. | `packages/llm/llm-pi-ai/src/config.ts:185` |
| `providers.*.cacheRetention` | `z.union(['none', 'short', 'long'])` | — | pi-ai provider routes, keyed by provider. An empty (or omitted) dict is the dormant settings-driven posture: the adapter mounts with no routes and registers them the moment a settings section supplies profiles. | pi-ai provider routes, keyed by provider. | `packages/llm/llm-pi-ai/src/config.ts:246` |
| `providers.*.transport` | `z.union(['sse', 'websocket', 'websocket-cached', 'auto'])` | — | pi-ai provider routes, keyed by provider. An empty (or omitted) dict is the dormant settings-driven posture: the adapter mounts with no routes and registers them the moment a settings section supplies profiles. | 选连接方言；union 变体靠这个判别。 | `packages/llm/llm-pi-ai/src/config.ts:247` |
| `providers.*.timeoutMs` | `z.natural()` | — | pi-ai provider routes, keyed by provider. An empty (or omitted) dict is the dormant settings-driven posture: the adapter mounts with no routes and registers them the moment a settings section supplies profiles. | 给一次 I/O 钉死上限，避免无限等。 | `packages/llm/llm-pi-ai/src/config.ts:248` |
| `providers.*.websocketConnectTimeoutMs` | `z.natural()` | — | pi-ai provider routes, keyed by provider. An empty (or omitted) dict is the dormant settings-driven posture: the adapter mounts with no routes and registers them the moment a settings section supplies profiles. | 给一次 I/O 钉死上限，避免无限等。 | `packages/llm/llm-pi-ai/src/config.ts:249` |
| `providers.*.streamIdleTimeoutMs` | `z.number().min(Number.MIN_VALUE).max(MAX_TIMER_DELAY_MS).default(DEFAULT_STREAM_IDLE_TI…` | 300_000 | pi-ai provider routes, keyed by provider. An empty (or omitted) dict is the dormant settings-driven posture: the adapter mounts with no routes and registers them the moment a settings section supplies profiles. | 给一次 I/O 钉死上限，避免无限等。 | `packages/llm/llm-pi-ai/src/config.ts:250` |
| `providers.*.retryPolicy` | `RetryPolicySchema` | — | pi-ai provider routes, keyed by provider. An empty (or omitted) dict is the dormant settings-driven posture: the adapter mounts with no routes and registers them the moment a settings section supplies profiles. | 重试挂在 provider 路由上，不在 dsh-llm-retry 自己的 Config。 | `packages/llm/llm-pi-ai/src/config.ts:251` |
| `providers.*.retryPolicy.mode` | `'normal' / 'always'` | required | normal 只重试配置过的瞬态码；always 遇失败就重试。 | 把政策形状钉在 provider 路由上。 | `packages/llm/llm/src/retry-policy.ts:88` |
| `providers.*.retryPolicy.maxRetries` | `number` | 2（normal） | 第一次请求之后最多再试几次。 | 只在 mode=normal 上有意义。 | `packages/llm/llm/src/retry-policy.ts:89` |
| `providers.*.retryPolicy.retryableCodes` | `string[]` | EMPTY_RESPONSE / RATE_LIMIT / SERVER / TIMEOUT / TRANSPORT | normal 模式可重试的稳定失败码。 | 只在 mode=normal 上有意义。 | `packages/llm/llm/src/retry-policy.ts:90` |
| `providers.*.retryPolicy.backoff` | `object` | — | 指数退避与抖动。 | 两种 mode 共用。 | `packages/llm/llm/src/retry-policy.ts:91` |
| `providers.*.retryPolicy.backoff.initialDelayMs` | `number` | 500 | 本地指数退避的初始延迟（ms）。 | 钳在 MAX_TIMER_DELAY_MS 内。 | `packages/llm/llm/src/retry-policy.ts:82` |
| `providers.*.retryPolicy.backoff.maxDelayMs` | `number` | 10000 | 本地调度或接受的最大延迟（ms）。 | 钳在 MAX_TIMER_DELAY_MS 内。 | `packages/llm/llm/src/retry-policy.ts:83` |
| `providers.*.retryPolicy.backoff.jitterRatio` | `number` | 0.1 | 对称随机抖动比例。 | 避免雷鸣群重试。 | `packages/llm/llm/src/retry-policy.ts:84` |

#### `@deepseek-ai/dsh-llm-retry`

export const Config 在 `packages/llm/llm-retry/src/index.ts:27`。 [E: packages/llm/llm-retry/src/index.ts:27]

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `（本包无用户键）` | `z.object({})` | — | 运行时 schema 不接受任何用户键；多余键由 validate 拒绝。 | 把可调键赶到真正拥有它的包（例如 retryPolicy 在 provider Config）。 | `packages/llm/llm-retry/src/index.ts:27` |

#### `@deepseek-ai/dsh-token-meter`

static Config 在 `packages/llm/token-meter/src/index.ts:77`。 [E: packages/llm/token-meter/src/index.ts:77]

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `（本包无用户键）` | `z.object({})` | — | 空 object schema 声明在 `static Config`。构造器另跑 `validateConfigKeys(config)` 拒绝用户键（空 schema 本身会保留 loader 多余键）。 [E: packages/llm/token-meter/src/index.ts:77] [E: packages/llm/token-meter/src/index.ts:83] | token 计量没有部署旋钮，避免把估算政策写成 Config。 | `packages/llm/token-meter/src/index.ts:77` |

### `lsp`

#### `@deepseek-ai/dsh-lsp-stdio`

export const Config 在 `packages/lsp/lsp-stdio/src/index.ts:105`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `servers` | `z.dict(LspLocalServerConfig).required()` | required（无 schema default） | Non-empty table of stable provider ids to independent local server configurations. | 省略则 schemastery / loader 拒载。 | `packages/lsp/lsp-stdio/src/index.ts:106` |
| `servers.*.command` | `z.string().required()` | required（无 schema default） | Non-empty table of stable provider ids to independent local server configurations. | 省略则 schemastery / loader 拒载。 | `packages/lsp/lsp-stdio/src/index.ts:92` |
| `servers.*.args` | `z.array(String).default([])` | [] | Non-empty table of stable provider ids to independent local server configurations. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/lsp/lsp-stdio/src/index.ts:93` |
| `servers.*.env` | `z.dict(String).default({})` | {} | Non-empty table of stable provider ids to independent local server configurations. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/lsp/lsp-stdio/src/index.ts:94` |
| `servers.*.extensionToLanguage` | `z.dict(String).required()` | required（无 schema default） | Non-empty table of stable provider ids to independent local server configurations. | 省略则 schemastery / loader 拒载。 | `packages/lsp/lsp-stdio/src/index.ts:95` |
| `servers.*.initializationOptions` | `z.any().default(null)` | null | Non-empty table of stable provider ids to independent local server configurations. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/lsp/lsp-stdio/src/index.ts:96` |
| `servers.*.configuration` | `z.any().default(null)` | null | Non-empty table of stable provider ids to independent local server configurations. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/lsp/lsp-stdio/src/index.ts:97` |
| `servers.*.maxMessageBytes` | `z.number().default(DEFAULT_MAX_MESSAGE_BYTES)` | 16_000_000 | Non-empty table of stable provider ids to independent local server configurations. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/lsp/lsp-stdio/src/index.ts:98` |
| `servers.*.maxStderrBytes` | `z.number().default(DEFAULT_MAX_STDERR_BYTES)` | 1_000_000 | Non-empty table of stable provider ids to independent local server configurations. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/lsp/lsp-stdio/src/index.ts:99` |
| `servers.*.maxDocumentBytes` | `z.number().default(DEFAULT_MAX_DOCUMENT_BYTES)` | 4_000_000 | Non-empty table of stable provider ids to independent local server configurations. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/lsp/lsp-stdio/src/index.ts:100` |
| `servers.*.shutdownTimeoutMs` | `z.number().max(MAX_TIMER_DELAY_MS).default(DEFAULT_SHUTDOWN_TIMEOUT_MS)` | 5_000 | Non-empty table of stable provider ids to independent local server configurations. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/lsp/lsp-stdio/src/index.ts:101` |
| `servers.*.killGraceMs` | `z.number().max(MAX_TIMER_DELAY_MS).default(DEFAULT_KILL_GRACE_MS)` | 2_000 | Non-empty table of stable provider ids to independent local server configurations. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/lsp/lsp-stdio/src/index.ts:102` |

#### `@deepseek-ai/dsh-tool-lsp`

export const Config 在 `packages/lsp/tool-lsp/src/index.ts:67`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `maxLocations` | `z.number().default(DEFAULT_MAX_LOCATIONS)` | DEFAULT_MAX_LOCATIONS | Largest number of rendered locations before an omission marker (default 100). | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/lsp/tool-lsp/src/index.ts:68` |
| `maxResultChars` | `z.number().default(DEFAULT_MAX_RESULT_CHARS)` | DEFAULT_MAX_RESULT_CHARS | Largest complete rendered result in characters, including truncation metadata (default 16000). | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/lsp/tool-lsp/src/index.ts:69` |
| `timeoutMs` | `z.number().max(MAX_TIMER_DELAY_MS).default(DEFAULT_LSP_TOOL_TIMEOUT_MS)` | 60_000 | Tool-call timeout budget in ms (default 60000). | 给一次 I/O 钉死上限，避免无限等。 | `packages/lsp/tool-lsp/src/index.ts:70` |

### `mcp`

#### `@deepseek-ai/dsh-mcp-client`

export const Config 在 `packages/mcp/mcp-client/src/index.ts:107`。 schema 是 `z.union`（stdio / streamable-http）。 [E: packages/mcp/mcp-client/src/index.ts:107]

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `transport` | `'stdio' / 'streamable-http'` | — | MCP 传输判别：stdio 子进程或 Streamable HTTP。 | 选连接方言；union 变体靠这个判别。 | `packages/mcp/mcp-client/src/index.ts:109` |
| `serverName` | `z.string().required().pattern(SERVER_NAME_PATTERN)` | required（无 schema default） | Stable local namespace for this server's model-facing tool names (`mcp__<serverName>__<rawName>`). Must match `[A-Za-z0-9_-]{1,32}` and be unique across live mcp-client instances. | 省略则 schemastery / loader 拒载。 | `packages/mcp/mcp-client/src/index.ts:110` |
| `command` | `z.string().required()` | required（无 schema default） | stdio 变体：启动 MCP server 的可执行文件。 | `transport='stdio'` 时省略则拒载。 | `packages/mcp/mcp-client/src/index.ts:111` |
| `args` | `z.array(String).default([])` | [] | stdio 变体：传给子进程的参数，不做 shell 插值。 | 仅 `transport='stdio'`。 | `packages/mcp/mcp-client/src/index.ts:112` |
| `env` | `z.dict(String).default({})` | {} | stdio 变体：叠在 scrubbed ambient env 上的额外环境变量。 | 仅 `transport='stdio'`。 | `packages/mcp/mcp-client/src/index.ts:113` |
| `cwd` | `z.string().default('')` | '' | stdio 变体：子进程工作目录。 | 仅 `transport='stdio'`。 | `packages/mcp/mcp-client/src/index.ts:114` |
| `toolCallTimeoutMs` | `z.number().default(DEFAULT_TOOL_CALL_TIMEOUT_MS)` | 60_000 | Per-tool-call timeout in milliseconds. | 给一次 I/O 钉死上限，避免无限等。 | `packages/mcp/mcp-client/src/index.ts:115` |
| `failOnStartupError` | `z.boolean().default(false)` | false | Fail plugin activation when the initial connection or tool synchronization fails. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/mcp/mcp-client/src/index.ts:116` |
| `reconnect` | `object` | — | Automatic reconnect policy after a lost connection; omission uses the defaults. | cordis.yml `config:` 可调。 | `packages/mcp/mcp-client/src/index.ts:117` |
| `reconnect.enabled` | `z.boolean().default(true)` | true | 丢失连接后是否自动重连。 | 省略走 schema default（`RECONNECT_DEFAULTS.enabled`）。 | `packages/mcp/mcp-client/src/index.ts:101` |
| `reconnect.initialDelayMs` | `z.number().min(1)` | 500 | 重连初始延迟（ms）。 | 省略走 `RECONNECT_DEFAULTS.initialDelayMs`。 | `packages/mcp/mcp-client/src/index.ts:102` |
| `reconnect.maxDelayMs` | `z.number().min(1)` | 30000 | 重连最大延迟（ms）。 | 省略走 `RECONNECT_DEFAULTS.maxDelayMs`。 | `packages/mcp/mcp-client/src/index.ts:103` |
| `reconnect.maxAttempts` | `z.number().step(1).min(1)` | 10 | 最多重连次数。 | 省略走 `RECONNECT_DEFAULTS.maxAttempts`。 | `packages/mcp/mcp-client/src/index.ts:104` |
| `url` | `z.string().required()` | required（无 schema default） | streamable-http 变体：MCP endpoint URL。 | `transport='streamable-http'` 时省略则拒载。 | `packages/mcp/mcp-client/src/index.ts:122` |
| `headers` | `z.dict(String).default({})` | {} | streamable-http 变体：附加到 MCP 请求的 headers。 | 仅 `transport='streamable-http'`。 | `packages/mcp/mcp-client/src/index.ts:123` |

### `preset`

#### `@deepseek-ai/dsh-agent-presets`

static Config 在 `packages/preset/agent-presets/src/index.ts:86`。 [E: packages/preset/agent-presets/src/index.ts:86]

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `default` | `z.string().required()` | required（无 schema default） | Plugin config: which preset is the default, and where presets live. */ export interface Config { /** Preset id mounted when a caller names none. Missing at mount time fails loud. | 省略则 schemastery / loader 拒载。 | `packages/preset/agent-presets/src/index.ts:87` |
| `roots` | `array` | [] | Scanned roots in precedence order; an earlier root wins a duplicate id. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/preset/agent-presets/src/index.ts:88` |
| `roots[].path` | `z.string().required()` | required（无 schema default） | Absolute path of the preset's agent composition file. | 省略则 schemastery / loader 拒载。 | `packages/preset/agent-presets/src/index.ts:89` |
| `roots[].trust` | `z.union(['system', 'user']).default('user')` | 'user' | Trust recorded from the root this preset was discovered under. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/preset/agent-presets/src/index.ts:90` |
| `includeUserRoot` | `z.boolean().default(true)` | true | Append the harness home's `USER_PRESET_DIR` as a `user` root, after every configured root. False mounts a roster over `roots` alone. | Append the harness home's `USER_PRESET_DIR` as a `user` root, after every configured root. | `packages/preset/agent-presets/src/index.ts:92` |

#### `@deepseek-ai/dsh-persona`

export const Config 在 `packages/preset/persona/src/index.ts:48`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `text` | `z.string().required()` | required（无 schema default） | Persona prose rendered as the `deployment:persona` section. A template: complete `{…}` groups interpolate strictly against registered prompt variables. Empty text drops the section at render, matching the registry. | 省略则 schemastery / loader 拒载。 | `packages/preset/persona/src/index.ts:49` |
| `complete` | `z.boolean().default(false)` | false | Make this persona the complete system prompt, suppressing every other section. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/preset/persona/src/index.ts:50` |
| `includeRuntimeContext` | `z.boolean().default(true)` | true | Suppress dynamic runtime-context snapshots for this persona's agent scope. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/preset/persona/src/index.ts:51` |

### `runtime-diagnostics`

#### `@deepseek-ai/dsh-invariants`

static Config 在 `packages/runtime-diagnostics/invariants/src/index.ts:95`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `enabled` | `z.boolean().default(true)` | true | Global switch; defaults to `true`. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/runtime-diagnostics/invariants/src/index.ts:96` |
| `package_allowlist` | `z.array(z.string()).default([])` | [] | Case-sensitive JavaScript regex sources that admit package names; empty admits all. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/runtime-diagnostics/invariants/src/index.ts:97` |
| `package_blocklist` | `z.array(z.string()).default([])` | [] | Case-sensitive JavaScript regex sources that exclude package names after allowlist matching. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/runtime-diagnostics/invariants/src/index.ts:98` |

### `sandbox`

#### `@deepseek-ai/dsh-sandbox-local`

static Config 在 `packages/sandbox/sandbox-local/src/index.ts:252`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `runnerCommand` | `z.array(z.string()).default([])` | [] | Override the runner argv; bwrap-compatible profile arguments are appended. A non-empty override asserts full enforcement and skips built-in selection and probing. A runner that starts but refuses its profile must be identifiable by {@link runnerFailureSignatures}. Consumers classify a spawn rejection only after confirming the workdir is usable. `ENOENT` or `EACCES` identifies the runner when `error.path` equals argv[0] and `error.syscall` is `spawn` or `spawn <runner>`, or when `error.path` is absent and `error.syscall` is exactly `spawn <runner>`. | Override the runner argv; bwrap-compatible profile arguments are appended. | `packages/sandbox/sandbox-local/src/index.ts:253` |
| `runnerFailureSignatures` | `z.array(z.string()).default([])` | [] | Case-insensitive stderr substrings emitted when a configured {@link runnerCommand} refuses its profile before executing the wrapped command. Required and non-empty with `runnerCommand`; rejected without it. Each entry is a non-empty, single-line, case-insensitive substring covering the executable runner's own failure dialect. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/sandbox/sandbox-local/src/index.ts:254` |
| `probeTimeoutMs` | `z.natural().default(5_000)` | 5_000 | Positive timeout for each functional probe; zero would mean unbounded to Node. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/sandbox/sandbox-local/src/index.ts:255` |

#### `@deepseek-ai/dsh-sandbox-policy`

static Config 在 `packages/sandbox/sandbox-policy/src/index.ts:93`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `mode` | `z.union(['read-only', 'workspace-write', 'danger-full-access']).default('read-only')` | 'read-only' | File-sandbox mode a session starts from (default: `read-only`). | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/sandbox/sandbox-policy/src/index.ts:94` |
| `workspaceRoot` | `z.string()` | — | Fallback root for agentless calls and sessions without a cwd (default: `process.cwd()`). Normal agent calls use their session cwd instead. | Fallback root for agentless calls and sessions without a cwd (default: `process.cwd()`). | `packages/sandbox/sandbox-policy/src/index.ts:97` |

### `sdk`

#### `@deepseek-ai/dsh-sdk-jsonrpc-server`

export const Config 在 `packages/sdk/server/src/index.ts:36`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `maxTokensAsSuccess` | `z.boolean().default(false)` | false | Report max-token turn/subagent termination as a successful SDK result. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/sdk/server/src/index.ts:37` |

### `session`

#### `@deepseek-ai/dsh-session-persistence-jsonl`

static Config 在 `packages/session/session-persistence-jsonl/src/index.ts:126`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `root` | `z.string().required()` | required（无 schema default） | Root directory for all session files. Required (no default): a default of `process.cwd()` would scatter session files as the process's cwd changes (bash calls, subprocesses). Sessions group under human-readable project directories, then per-session directories. An existing root must be a readable directory; an absent root is created on first materialization. | 省略则 schemastery / loader 拒载。 | `packages/session/session-persistence-jsonl/src/index.ts:127` |
| `packChunks` | `z.boolean().default(DEFAULT_PACK_CHUNKS)` | true | Write runs of consecutive `assistant/chunk` delta events as packed `text-chunks`/`reasoning-chunks`/`tool-call-chunks` rows (lossless, ~60% smaller logs measured on a real session). Defaults to true; false keeps one `SessionEvent` per line for diagnostics. Reading packed rows is unconditional: a log's layout never depends on this switch. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/session/session-persistence-jsonl/src/index.ts:128` |
| `compression` | `z.union([ z.const('zstd'), z.const('none'), ]).default(DEFAULT_COMPRESSION)` | 'zstd' | Physical encoding; defaults to checksummed Zstandard frames. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/session/session-persistence-jsonl/src/index.ts:129` |
| `preparedSessionCacheSize` | `z.number().step(1).min(1).default(DEFAULT_PREPARED_SESSION_CACHE_SIZE)` | DEFAULT_PREPARED_SESSION_CACHE_SIZE | Maximum cold Session preparations retained for history-to-resume reuse. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/session/session-persistence-jsonl/src/index.ts:130` |
| `writeBatchMaxDelayMs` | `z.number().step(1).min(1).max(MAX_WRITE_BATCH_DELAY_MS).default(DEFAULT_WRITE_BATCH_MAX…` | DEFAULT_WRITE_BATCH_MAX_DELAY_MS | Fixed live-event coalescing window; not a backend completion deadline. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/session/session-persistence-jsonl/src/index.ts:131` |

#### `@deepseek-ai/dsh-session-persistence-sqlite`

static Config 在 `packages/session/session-persistence-sqlite/src/index.ts:104`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `path` | `z.string().required()` | required（无 schema default） | Filesystem path to the SQLite database file. The special value `:memory:` opens an in-process database (tests). On filesystems with POSIX modes, missing directories and databases are created owner-only; existing path modes are preserved. Filesystem setup errors other than an existing database fail initialization. The backend does not protect confidentiality or integrity when another principal can replace the database entry in its parent directory. | 省略则 schemastery / loader 拒载。 | `packages/session/session-persistence-sqlite/src/index.ts:105` |
| `journalMode` | `z.union(['wal', 'delete', 'truncate', 'persist']).default('wal')` | 'wal' | SQLite `journal_mode` pragma. `wal` (the default) is the recorded durability model; pick a rollback-journal mode (`delete`/`truncate`/ `persist`) on filesystems where WAL's shared-memory files do not work (network mounts). See {@link JournalMode}. | SQLite `journal_mode` pragma. | `packages/session/session-persistence-sqlite/src/index.ts:106` |
| `preparedSessionCacheSize` | `z.number().step(1).min(1).default(DEFAULT_PREPARED_SESSION_CACHE_SIZE)` | DEFAULT_PREPARED_SESSION_CACHE_SIZE | Maximum cold Session preparations retained for history-to-resume reuse. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/session/session-persistence-sqlite/src/index.ts:107` |
| `writeBatchMaxDelayMs` | `z.number().step(1).min(1).max(MAX_WRITE_BATCH_DELAY_MS).default(DEFAULT_WRITE_BATCH_MAX…` | DEFAULT_WRITE_BATCH_MAX_DELAY_MS | Fixed live-event coalescing window; not a backend completion deadline. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/session/session-persistence-sqlite/src/index.ts:108` |

#### `@deepseek-ai/dsh-session-projection-cache`

export const Config（`static Config` 同名别名） 在 `packages/session/session-projection-cache/src/index.ts:49`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `writeEveryEvents` | `z.natural().min(1).required()` | required（无 schema default） | Committed events per session that force a durable checkpoint write between mandatory points. | 省略则 schemastery / loader 拒载。 | `packages/session/session-projection-cache/src/index.ts:50` |
| `writeIntervalMs` | `z.natural().min(1).required()` | required（无 schema default） | Longest time (milliseconds) a dirty checkpoint may stay unwritten between mandatory points. | 省略则 schemastery / loader 拒载。 | `packages/session/session-projection-cache/src/index.ts:51` |

#### `@deepseek-ai/dsh-session-telemetry-otel`

export const Config（`static Config` 同名别名） 在 `packages/session/session-telemetry-otel/src/index.ts:120`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `mode` | `z.union(Object.values(SessionTelemetryMode)).default(DEFAULT_TELEMETRY_MODE)` | SessionTelemetryMode.DISABLED | Sharing policy; defaults to local-only `DISABLED` behavior. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/session/session-telemetry-otel/src/index.ts:121` |
| `exporter` | `z.any()` | — | Passed verbatim to the SDK's OTLP/HTTP log exporter — the complete `OTLPExporterNodeConfigBase` shape (`headers`, `timeoutMillis`, `compression`, `keepAlive`, …), owned and documented by the SDK. `url` is the one field this package requires and validates itself. | cordis.yml `config:` 可调。 | `packages/session/session-telemetry-otel/src/index.ts:122` |
| `processor` | `z.any()` | — | Passed verbatim to `BatchLogRecordProcessor` (minus the exporter slot, which this plugin fills); the SDK owns and documents these knobs. | cordis.yml `config:` 可调。 | `packages/session/session-telemetry-otel/src/index.ts:123` |
| `shutdownTimeoutMillis` | `z.number()` | — | Maximum time spent awaiting the SDK provider's complete shutdown path. | 给一次 I/O 钉死上限，避免无限等。 | `packages/session/session-telemetry-otel/src/index.ts:124` |

#### `@deepseek-ai/dsh-session-title`

static Config 在 `packages/session/session-title/src/index.ts:263`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `fallbackMaxWords` | `z.number().step(1).min(1).required()` | required（无 schema default） | Maximum whitespace-delimited words in the built-in fallback. | 省略则 schemastery / loader 拒载。 | `packages/session/session-title/src/index.ts:264` |
| `fallbackMaxBytes` | `z.number().step(1).min(1).required()` | required（无 schema default） | Maximum UTF-8 bytes in the built-in fallback. | 省略则 schemastery / loader 拒载。 | `packages/session/session-title/src/index.ts:265` |
| `maxTitleBytes` | `z.number().step(1).min(1).required()` | required（无 schema default） | Maximum UTF-8 bytes in any accepted title. | 省略则 schemastery / loader 拒载。 | `packages/session/session-title/src/index.ts:266` |

#### `@deepseek-ai/dsh-session-title-all-prompts-llm`

export const Config 在 `packages/session/session-title-all-prompts-llm/src/index.ts:18`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `targetWords` | `SessionTitleLlmConfigFields.targetWords` | required（无 schema default） | 非 CJK 标题目标词数。required，无 library default。 | 省略则 schemastery / loader 拒载。 | `packages/session/session-title-all-prompts-llm/src/index.ts:19` |
| `targetCjkCharacters` | `SessionTitleLlmConfigFields.targetCjkCharacters` | required（无 schema default） | 中日韩标题目标字数。 | 省略则 schemastery / loader 拒载。 | `packages/session/session-title-all-prompts-llm/src/index.ts:20` |
| `maxInputBytes` | `SessionTitleLlmConfigFields.maxInputBytes` | required（无 schema default） | 最终 JSON-framed user prompt 的 UTF-8 字节上限。 | 省略则 schemastery / loader 拒载。 | `packages/session/session-title-all-prompts-llm/src/index.ts:21` |
| `maxOutputTokens` | `SessionTitleLlmConfigFields.maxOutputTokens` | required（无 schema default） | 辅助生成输出 token 上限。 | 省略则 schemastery / loader 拒载。 | `packages/session/session-title-all-prompts-llm/src/index.ts:22` |
| `timeoutMs` | `SessionTitleLlmConfigFields.timeoutMs` | required（无 schema default） | 辅助请求端到端 deadline（ms）。 | 给一次 I/O 钉死上限，避免无限等。 | `packages/session/session-title-all-prompts-llm/src/index.ts:23` |
| `provider` | `SessionTitleLlmConfigFields.provider` | — | 显式 provider 路由；必须与 model 成对。 | 显式 provider 路由；必须与 model 成对。 | `packages/session/session-title-all-prompts-llm/src/index.ts:24` |
| `model` | `SessionTitleLlmConfigFields.model` | — | 显式 model id；必须与 provider 成对。 | 显式 model id；必须与 provider 成对。 | `packages/session/session-title-all-prompts-llm/src/index.ts:25` |

#### `@deepseek-ai/dsh-session-title-first-prompt-llm`

export const Config 在 `packages/session/session-title-first-prompt-llm/src/index.ts:18`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `targetWords` | `SessionTitleLlmConfigFields.targetWords` | required（无 schema default） | 非 CJK 标题目标词数。required，无 library default。 | 省略则 schemastery / loader 拒载。 | `packages/session/session-title-first-prompt-llm/src/index.ts:19` |
| `targetCjkCharacters` | `SessionTitleLlmConfigFields.targetCjkCharacters` | required（无 schema default） | 中日韩标题目标字数。 | 省略则 schemastery / loader 拒载。 | `packages/session/session-title-first-prompt-llm/src/index.ts:20` |
| `maxInputBytes` | `SessionTitleLlmConfigFields.maxInputBytes` | required（无 schema default） | 最终 JSON-framed user prompt 的 UTF-8 字节上限。 | 省略则 schemastery / loader 拒载。 | `packages/session/session-title-first-prompt-llm/src/index.ts:21` |
| `maxOutputTokens` | `SessionTitleLlmConfigFields.maxOutputTokens` | required（无 schema default） | 辅助生成输出 token 上限。 | 省略则 schemastery / loader 拒载。 | `packages/session/session-title-first-prompt-llm/src/index.ts:22` |
| `timeoutMs` | `SessionTitleLlmConfigFields.timeoutMs` | required（无 schema default） | 辅助请求端到端 deadline（ms）。 | 给一次 I/O 钉死上限，避免无限等。 | `packages/session/session-title-first-prompt-llm/src/index.ts:23` |
| `provider` | `SessionTitleLlmConfigFields.provider` | — | 显式 provider 路由；必须与 model 成对。 | 显式 provider 路由；必须与 model 成对。 | `packages/session/session-title-first-prompt-llm/src/index.ts:24` |
| `model` | `SessionTitleLlmConfigFields.model` | — | 显式 model id；必须与 provider 成对。 | 显式 model id；必须与 provider 成对。 | `packages/session/session-title-first-prompt-llm/src/index.ts:25` |

### `session-query`

#### `@deepseek-ai/dsh-session-query-sqlite`

static Config 在 `packages/session-query/session-query-sqlite/src/index.ts:199`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `path` | `z.string().required()` | required（无 schema default） | Dedicated derived-index path; `:memory:` is supported for ephemeral indexes. Missing directories and database files are created owner-only on POSIX filesystems; existing modes are preserved. | 省略则 schemastery / loader 拒载。 | `packages/session-query/session-query-sqlite/src/index.ts:200` |
| `openAt` | `z.union(['startup', 'first-search', 'never']).default('startup')` | 'startup' | Open the SQLite module and handle at service activation or the first search, or `never` to disable full-text search: the inherited exact reads, filters, and traces stay available, while `searchSessions` and `searchEvents` fail with `SESSION_QUERY_SEARCH_DISABLED` and SQLite is never imported or opened. Defaults to `startup`. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/session-query/session-query-sqlite/src/index.ts:201` |
| `journalMode` | `z.union(['wal', 'delete', 'truncate', 'persist']).default('wal')` | 'wal' | SQLite journal mode. Defaults to `wal`. | SQLite journal mode. | `packages/session-query/session-query-sqlite/src/index.ts:202` |
| `defaultLimit` | `z.number().step(1).min(1).max(SQLITE_MAX_PAGE_LIMIT).default(SESSION_QUERY_SQLITE_DEFAU…` | 20 | Page size when a request omits `limit`. At most `Number.MAX_SAFE_INTEGER - 1`; defaults to 20. | Page size when a request omits `limit`. | `packages/session-query/session-query-sqlite/src/index.ts:203` |
| `maxLimit` | `z.number().step(1).min(1).max(SQLITE_MAX_PAGE_LIMIT).default(SESSION_QUERY_SQLITE_MAX_L…` | 100 | Largest accepted page size. At most `Number.MAX_SAFE_INTEGER - 1`; defaults to 100. | Largest accepted page size. | `packages/session-query/session-query-sqlite/src/index.ts:204` |
| `snippetChars` | `z.number().step(1).min(1).default(SESSION_QUERY_SQLITE_SNIPPET_CHARS)` | 240 | Maximum snippet length in Unicode code points. Defaults to 240. | Maximum snippet length in Unicode code points. | `packages/session-query/session-query-sqlite/src/index.ts:205` |
| `readWindowMax` | `z.number().step(1).min(0).default(SESSION_QUERY_READ_WINDOW_MAX)` | 50 | 一侧 raw-event 窗口上限。默认 50。 | 一侧 raw-event 窗口上限。 | `packages/session-query/session-query-sqlite/src/index.ts:206` |
| `persistedInspectConcurrency` | `z.number().step(1).min(1).max(Number.MAX_SAFE_INTEGER).default(SESSION_QUERY_DEFAULT_PE…` | 4 | Maximum concurrent persisted-log inspections in one inherited batch read. Defaults to 4. | Maximum concurrent persisted-log inspections in one inherited batch read. | `packages/session-query/session-query-sqlite/src/index.ts:207` |

#### `@deepseek-ai/dsh-tool-session-query`

export const Config 在 `packages/session-query/tool-session-query/src/index.ts:37`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `maxSearchResults` | `z.number().step(1).min(1).default(DEFAULT_MAX_SEARCH_RESULTS)` | 100 | Maximum authorized hits returned by one search call. Defaults to 100. | Maximum authorized hits returned by one search call. | `packages/session-query/tool-session-query/src/index.ts:38` |
| `searchTimeoutMs` | `z.number().step(1).min(1).max(MAX_TIMER_DELAY_MS).default(DEFAULT_SEARCH_TIMEOUT_MS)` | 30_000 | Cooperative full-text search deadline in milliseconds. Defaults to 30000. | Cooperative full-text search deadline in milliseconds. | `packages/session-query/tool-session-query/src/index.ts:39` |

### `settings`

#### `@deepseek-ai/dsh-settings-file`

static Config 在 `packages/settings/settings-file/src/index.ts:106`。 [E: packages/settings/settings-file/src/index.ts:106]

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `path` | `z.string()` | — | Settings document path; defaults to `settings.yaml` under the harness home. | cordis.yml `config:` 可调。 | `packages/settings/settings-file/src/index.ts:107` |
| `dshHome` | `z.string()` | — | Harness home used when `path` is omitted; defaults to `$DSH_HOME` or `~/.dsh`. | 覆盖进程 home 解析，让 profile 钉死目录。 | `packages/settings/settings-file/src/index.ts:108` |
| `watch` | `z.boolean().default(true)` | true | Watch the document and hot-publish external edits; defaults to true. | 外部改文件能否热发布，以及 settle 窗口。 | `packages/settings/settings-file/src/index.ts:109` |
| `debounceMs` | `z.number().min(0).default(100)` | 100 | Watcher write-settle window in milliseconds; defaults to 100. | 外部改文件能否热发布，以及 settle 窗口。 | `packages/settings/settings-file/src/index.ts:110` |

### `shell`

#### `@deepseek-ai/dsh-bash-local`

static Config 在 `packages/shell/bash-local/src/index.ts:105`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `cwd` | `z.string()` | — | Default working directory for commands (default: process.cwd()). | cordis.yml `config:` 可调。 | `packages/shell/bash-local/src/index.ts:106` |
| `timeoutMs` | `z.number().default(120_000)` | 120_000 | Default foreground timeout in milliseconds. | 给一次 I/O 钉死上限，避免无限等。 | `packages/shell/bash-local/src/index.ts:107` |
| `maxTimeoutMs` | `z.number().default(600_000)` | 600_000 | Upper bound for per-call timeout overrides. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/shell/bash-local/src/index.ts:108` |
| `maxOutputBytes` | `z.number().default(64_000)` | 64_000 | Per-stream in-memory output cap; overflow spills to a temp file. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/shell/bash-local/src/index.ts:109` |
| `maxSpillBytes` | `z.number().default(DEFAULT_MAX_SPILL_BYTES)` | 64 * 1024 * 1024 | Per-stream spill-file cap; larger streams retain only their in-memory tail. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/shell/bash-local/src/index.ts:110` |
| `graceMs` | `z.number().default(DEFAULT_GRACE_MS)` | 3_000 | Grace period for kill escalation and inherited pipes; at most `MAX_TIMER_DELAY_MS`. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/shell/bash-local/src/index.ts:111` |

#### `@deepseek-ai/dsh-pwsh-local`

static Config 在 `packages/shell/pwsh-local/src/index.ts:131`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `cwd` | `z.string()` | — | Default working directory for commands (default: process.cwd()). | cordis.yml `config:` 可调。 | `packages/shell/pwsh-local/src/index.ts:132` |
| `timeoutMs` | `z.number().default(120_000)` | 120_000 | Default foreground timeout in milliseconds. | 给一次 I/O 钉死上限，避免无限等。 | `packages/shell/pwsh-local/src/index.ts:133` |
| `maxTimeoutMs` | `z.number().default(600_000)` | 600_000 | Upper bound for per-call timeout overrides. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/shell/pwsh-local/src/index.ts:134` |
| `maxOutputBytes` | `z.number().default(64_000)` | 64_000 | Per-stream in-memory output cap; overflow spills to a temp file. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/shell/pwsh-local/src/index.ts:135` |
| `maxSpillBytes` | `z.number().default(DEFAULT_MAX_SPILL_BYTES)` | 64 * 1024 * 1024 | Per-stream spill-file cap; larger streams retain only their in-memory tail. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/shell/pwsh-local/src/index.ts:136` |
| `graceMs` | `z.number().default(DEFAULT_GRACE_MS)` | 3_000 | Grace period for kill escalation and inherited pipes; at most `MAX_TIMER_DELAY_MS`. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/shell/pwsh-local/src/index.ts:137` |
| `pwshPath` | `z.string()` | — | Explicit pwsh executable. When omitted, well-known Windows install locations and PATH entries are probed in order (PowerShell 7 install, PATH entries such as the Microsoft Store install, then Windows PowerShell 5.1), falling back to a bare `pwsh` resolved through PATH. | Explicit pwsh executable. | `packages/shell/pwsh-local/src/index.ts:138` |

#### `@deepseek-ai/dsh-shell-env`

export const Config 在 `packages/shell/shell-env/src/index.ts:35`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `dshHome` | `z.string()` | — | DeepSeek Harness home directory exposed as `DSH_HOME`; defaults to `$DSH_HOME` or `~/.dsh`. | 覆盖进程 home 解析，让 profile 钉死目录。 | `packages/shell/shell-env/src/index.ts:36` |

#### `@deepseek-ai/dsh-tool-bash`

export const Config 在 `packages/shell/tool-bash/src/index.ts:40`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `enableRunInBackground` | `z.boolean().default(true)` | true | Expose `run_in_background` (default true); disabled calls are also rejected. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/shell/tool-bash/src/index.ts:41` |

#### `@deepseek-ai/dsh-tool-bash-persistent`

export const Config 在 `packages/shell/tool-bash-persistent/src/index.ts:417`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `backendType` | `z.string().default('shell')` | 'shell' | PTY backend used for each owner-isolated persistent shell (default `shell`). | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/shell/tool-bash-persistent/src/index.ts:418` |
| `timeoutMs` | `z.number().default(300_000)` | 300_000 | Wall-clock limit for one command (default 300000). | 给一次 I/O 钉死上限，避免无限等。 | `packages/shell/tool-bash-persistent/src/index.ts:419` |
| `maxOutputChars` | `z.number().default(16_000)` | 16_000 | Maximum returned command-output characters before clipping (default 16000). | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/shell/tool-bash-persistent/src/index.ts:420` |
| `description` | `z.string().default(DEFAULT_DESCRIPTION)` | 'Run commands in a persistent bash shell. State, including the curr… | Model-facing tool description; deployments may describe their environment. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/shell/tool-bash-persistent/src/index.ts:421` |

#### `@deepseek-ai/dsh-tool-pwsh`

export const Config 在 `packages/shell/tool-pwsh/src/index.ts:58`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `enableRunInBackground` | `z.boolean().default(true)` | true | Expose `run_in_background` (default true); disabled calls are also rejected. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/shell/tool-pwsh/src/index.ts:59` |

### `skill`

#### `@deepseek-ai/dsh-skill`

static Config 在 `packages/skill/skill/src/index.ts:358`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `collectCacheMaxEntries` | `z.number().default(DEFAULT_COLLECT_CACHE_ENTRIES)` | 128 | Maximum number of completed cwd/provider catalogs kept in memory. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/skill/skill/src/index.ts:359` |

#### `@deepseek-ai/dsh-skill-filesystem`

export const Config 在 `packages/skill/skill-filesystem/src/index.ts:76`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `providerName` | `z.string().min(1).default('filesystem')` | `'filesystem'` | 本地 skill provider 注册名。schema 默认是 `'filesystem'`（接口 JSDoc 仍写 `local`，跟 schema）。 [E: packages/skill/skill-filesystem/src/index.ts:77] | 改注册名，而不改实现包。 | `packages/skill/skill-filesystem/src/index.ts:77` |
| `includeDefaultRoots` | `z.boolean().default(true)` | true | Whether project and user roots are included around custom roots. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/skill/skill-filesystem/src/index.ts:78` |
| `dshHome` | `z.string()` | — | DeepSeek Harness config root. Defaults to `$DSH_HOME` or `~/.dsh`. | 覆盖进程 home 解析，让 profile 钉死目录。 | `packages/skill/skill-filesystem/src/index.ts:79` |
| `agentsHome` | `z.string()` | — | Shared agent config root. Defaults to `$DSH_AGENTS_HOME` or `~/.agents`. | Shared agent config root. | `packages/skill/skill-filesystem/src/index.ts:80` |
| `customSkillDirs` | `z.array(z.string()).default([])` | [] | Additional skill roots scanned after project roots and before user roots. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/skill/skill-filesystem/src/index.ts:81` |
| `watch` | `z.boolean().default(true)` | true | Whether host-local skill roots are watched for catalog changes. | 外部改文件能否热发布，以及 settle 窗口。 | `packages/skill/skill-filesystem/src/index.ts:82` |
| `watchUsePolling` | `z.boolean().default(false)` | false | Whether Chokidar uses polling instead of native filesystem events. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/skill/skill-filesystem/src/index.ts:83` |
| `watchStabilityThresholdMs` | `z.number().default(DEFAULT_WATCH_STABILITY_THRESHOLD_MS)` | 200 | Milliseconds a changed skill entry must remain stable before it is observed. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/skill/skill-filesystem/src/index.ts:84` |
| `watchPollIntervalMs` | `z.number().default(DEFAULT_WATCH_POLL_INTERVAL_MS)` | 100 | Milliseconds between Chokidar stability or polling probes. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/skill/skill-filesystem/src/index.ts:85` |
| `watchMaxProjects` | `z.number().default(DEFAULT_WATCH_MAX_PROJECTS)` | 128 | Maximum distinct project roots whose skill directories remain watched. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/skill/skill-filesystem/src/index.ts:86` |
| `watchFollowSymlinks` | `z.boolean().default(true)` | true | Whether watched symbolic links follow their target files. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/skill/skill-filesystem/src/index.ts:87` |
| `bundledSkillDir` | `z.string()` | — | Bundled skill root; defaults to `$DSH_BUNDLED_SKILL_DIR` when default roots are included, otherwise mounts none. | cordis.yml `config:` 可调。 | `packages/skill/skill-filesystem/src/index.ts:88` |

#### `@deepseek-ai/dsh-tool-skill`

export const Config 在 `packages/skill/tool-skill/src/index.ts:67`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `catalogDescriptionMaxLength` | `z.number().default(DEFAULT_CATALOG_DESCRIPTION_MAX_LENGTH)` | 500 | Maximum normalized description length rendered in the session catalog; minimum 3. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/skill/tool-skill/src/index.ts:68` |

### `spill`

#### `@deepseek-ai/dsh-spill-local`

static Config 在 `packages/spill/spill-local/src/index.ts:38`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `root` | `z.string()` | — | Root directory for spill files. Omitted uses a lazily-created private (0700) per-process directory under the OS temp dir — the safe default for a local deployment. Set it to keep spill files under a known location. | Root directory for spill files. | `packages/spill/spill-local/src/index.ts:39` |

#### `@deepseek-ai/dsh-spill-policy`

export const Config 在 `packages/spill/spill-policy/src/index.ts:75`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `maxInlineBytes` | `z.number()` | — | The model-facing context cap for a plain-text tool result, in UTF-8 bytes. Omitted disables the policy entirely (no-op). When set, a result larger than this is spilled and replaced with a preview derived from this same budget. | The model-facing context cap for a plain-text tool result, in UTF-8 bytes. | `packages/spill/spill-policy/src/index.ts:76` |

### `storage`

#### `@deepseek-ai/dsh-storage-domain`

export const Config 在 `packages/storage/storage-domain/src/index.ts:59`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `backend` | `z.string().required()` | required（无 schema default） | Default backend name for every domain without an explicit route. Required: there is no universally correct medium. | 省略则 schemastery / loader 拒载。 | `packages/storage/storage-domain/src/index.ts:60` |
| `routes` | `z.dict(z.string()).default({})` | {} | Per-domain overrides: domain name → backend name. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/storage/storage-domain/src/index.ts:61` |

#### `@deepseek-ai/dsh-storage-json`

export const Config 在 `packages/storage/storage-json/src/index.ts:33`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `root` | `z.string().required()` | required（无 schema default） | Directory holding one `<unit>.json` file per unit. | 省略则 schemastery / loader 拒载。 | `packages/storage/storage-json/src/index.ts:34` |

#### `@deepseek-ai/dsh-storage-sqlite`

export const Config 在 `packages/storage/storage-sqlite/src/index.ts:45`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `path` | `z.string().required()` | required（无 schema default） | Filesystem path to the SQLite database file. The special value `:memory:` opens an in-process database (tests). On filesystems with POSIX modes, missing directories and databases are created owner-only; existing path modes are preserved. Filesystem setup errors other than an existing database fail the open. The backend does not protect confidentiality or integrity when another principal can replace the database entry in its parent directory. | 省略则 schemastery / loader 拒载。 | `packages/storage/storage-sqlite/src/index.ts:46` |
| `journalMode` | `z.union(['wal', 'delete', 'truncate', 'persist']).default('wal')` | 'wal' | SQLite `journal_mode` pragma. `wal` (the default) suits local disks; pick a rollback-journal mode (`delete`/`truncate`/`persist`) on filesystems where WAL's shared-memory files do not work (network mounts). See {@link JournalMode}. | SQLite `journal_mode` pragma. | `packages/storage/storage-sqlite/src/index.ts:47` |

### `subagent`

#### `@deepseek-ai/dsh-subagent-acp`

export const Config 在 `packages/subagent/subagent-acp/src/index.ts:66`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `providerName` | `z.string().default('acp')` | 'acp' | Provider name on `ctx.subagents` (default `acp`). | 改模型可见 / 注册名，而不改实现包。 | `packages/subagent/subagent-acp/src/index.ts:67` |
| `command` | `z.string().required()` | required（无 schema default） | The executable to spawn for each run (the child ACP agent). | 省略则 schemastery / loader 拒载。 | `packages/subagent/subagent-acp/src/index.ts:68` |
| `args` | `z.array(z.string()).default([])` | [] | Arguments passed to {@link command}. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/subagent/subagent-acp/src/index.ts:69` |
| `cwd` | `z.string()` | — | Working directory override for the child process and its ACP session. Must be non-empty; a relative path resolves against the harness launch directory at load, and the result must be an existing directory. When omitted, each child inherits its delegating parent session's cwd — and starting one from a parent session that has no cwd fails. | Working directory override for the child process and its ACP session. | `packages/subagent/subagent-acp/src/index.ts:70` |
| `permission` | `z.union(['allow', 'reject']).default('reject')` | 'reject' | How to auto-answer the child's `session/request_permission` prompts: `reject` (default — decline every prompt) or `allow` (approve via the first `allow_once` or `allow_always` option). No prompt is surfaced to a human. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/subagent/subagent-acp/src/index.ts:71` |
| `env` | `z.dict(z.string()).default({})` | {} | Extra environment variables for the child process — e.g. the child harness's own `DEEPSEEK_API_KEY`. Forwarded on top of a credential-scrubbed copy of the parent env, so an explicit key here reaches the child while ambient secrets do not leak implicitly. | Extra environment variables for the child process — e.g. | `packages/subagent/subagent-acp/src/index.ts:72` |
| `disposeEofGraceMs` | `z.number().default(DEFAULT_DISPOSE_EOF_GRACE_MS)` | DEFAULT_DISPOSE_EOF_GRACE_MS | Grace period (ms) for the child's EOF-driven quiesce on dispose — its window to flush persistence and tear down its own nested subprocesses before the parent escalates to a signal. Must not exceed `MAX_TIMER_DELAY_MS`. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/subagent/subagent-acp/src/index.ts:73` |
| `disposeGraceMs` | `z.number().default(DEFAULT_DISPOSE_GRACE_MS)` | DEFAULT_DISPOSE_GRACE_MS | Termination-escalation grace (ms); must not exceed `MAX_TIMER_DELAY_MS`. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/subagent/subagent-acp/src/index.ts:74` |

#### `@deepseek-ai/dsh-subagent-claude-code`

export const Config 在 `packages/subagent/subagent-claude-code/src/index.ts:42`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `env` | `z.dict(z.string()).default({})` | {} | Explicit environment entries layered over the subprocess seam's credential-scrubbed parent environment. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/subagent/subagent-claude-code/src/index.ts:43` |
| `disposeGraceMs` | `z.number().default(DEFAULT_DISPOSE_GRACE_MS)` | DEFAULT_DISPOSE_GRACE_MS | Grace in milliseconds for Claude Code process-tree termination. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/subagent/subagent-claude-code/src/index.ts:44` |

#### `@deepseek-ai/dsh-subagent-codex`

export const Config 在 `packages/subagent/subagent-codex/src/index.ts:40`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `env` | `z.dict(z.string()).default({})` | {} | Explicit environment entries layered over the subprocess seam's credential-scrubbed parent environment. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/subagent/subagent-codex/src/index.ts:41` |
| `disposeGraceMs` | `z.number().default(DEFAULT_DISPOSE_GRACE_MS)` | DEFAULT_DISPOSE_GRACE_MS | Grace in milliseconds for app-server process-tree termination. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/subagent/subagent-codex/src/index.ts:42` |

#### `@deepseek-ai/dsh-subagent-dsh-sdk`

export const Config 在 `packages/subagent/subagent-dsh-sdk/src/index.ts:71`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `providerName` | `z.string().default('dsh-sdk')` | 'dsh-sdk' | Provider name on `ctx.subagents` (default `dsh-sdk`). | 改模型可见 / 注册名，而不改实现包。 | `packages/subagent/subagent-dsh-sdk/src/index.ts:72` |
| `command` | `z.string().required()` | required（无 schema default） | The executable to spawn for each run (the child runtime bin or packaged exe). | 省略则 schemastery / loader 拒载。 | `packages/subagent/subagent-dsh-sdk/src/index.ts:73` |
| `args` | `z.array(z.string()).default([])` | [] | Arguments passed to {@link command} (typically the child's `cordis.yml` path). | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/subagent/subagent-dsh-sdk/src/index.ts:74` |
| `cwd` | `z.string()` | — | Working directory override for the child process and its SDK session workspace. Must be non-empty; a relative path resolves against the harness launch directory at load, and the result must be an existing directory. When omitted, each child inherits its delegating parent session's cwd — and starting one from a parent session that has no cwd fails. | Working directory override for the child process and its SDK session workspace. | `packages/subagent/subagent-dsh-sdk/src/index.ts:75` |
| `provider` | `z.string().default('deepseek-official')` | 'deepseek-official' | Provider route the child runtime initializes with (default `deepseek-official`). | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/subagent/subagent-dsh-sdk/src/index.ts:76` |
| `model` | `z.string().default('deepseek-v4-flash')` | 'deepseek-v4-flash' | Model the child runtime initializes with (default `deepseek-v4-flash`). | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/subagent/subagent-dsh-sdk/src/index.ts:77` |
| `maxTokens` | `z.number().step(1).min(1).max(Number.MAX_SAFE_INTEGER)` | — | Optional per-request output-token cap for the child runtime. | cordis.yml `config:` 可调。 | `packages/subagent/subagent-dsh-sdk/src/index.ts:78` |
| `env` | `z.dict(z.string()).default({})` | {} | Extra environment variables for the child process — e.g. the child runtime's own `DEEPSEEK_API_KEY`, or `DSH_CORDIS_CONFIG` naming its config. Forwarded on top of a credential-scrubbed copy of the parent env, so an explicit key here reaches the child while ambient secrets do not leak implicitly. | Extra environment variables for the child process — e.g. | `packages/subagent/subagent-dsh-sdk/src/index.ts:79` |
| `shutdownTimeoutMs` | `z.number().default(DEFAULT_SHUTDOWN_TIMEOUT_MS)` | DEFAULT_SHUTDOWN_TIMEOUT_MS | Bound (ms) on the protocol `shutdown` exchange during dispose. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/subagent/subagent-dsh-sdk/src/index.ts:80` |
| `disposeEofGraceMs` | `z.number().default(DEFAULT_DISPOSE_EOF_GRACE_MS)` | DEFAULT_DISPOSE_EOF_GRACE_MS | Grace period (ms) for the child's EOF-driven quiesce on dispose — its window to flush persistence and tear down its own nested subprocesses before the parent escalates to a signal. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/subagent/subagent-dsh-sdk/src/index.ts:81` |
| `disposeGraceMs` | `z.number().default(DEFAULT_DISPOSE_GRACE_MS)` | DEFAULT_DISPOSE_GRACE_MS | Termination confirmation window (ms), including forced exit on every platform. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/subagent/subagent-dsh-sdk/src/index.ts:82` |

#### `@deepseek-ai/dsh-subagent-fork-in-process`

export const Config 在 `packages/subagent/subagent-fork-in-process/src/index.ts:36`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `providerName` | `z.string().default('fork')` | 'fork' | Provider name on `ctx.subagents` (default `fork`). | 改模型可见 / 注册名，而不改实现包。 | `packages/subagent/subagent-fork-in-process/src/index.ts:37` |

#### `@deepseek-ai/dsh-subagent-spawn-in-process`

export const Config 在 `packages/subagent/subagent-spawn-in-process/src/index.ts:30`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `providerName` | `z.string().default('spawn')` | 'spawn' | Provider name on `ctx.subagents` (default `spawn`). | 改模型可见 / 注册名，而不改实现包。 | `packages/subagent/subagent-spawn-in-process/src/index.ts:31` |

#### `@deepseek-ai/dsh-tool-subagent`

export const Config 在 `packages/subagent/tool-subagent/src/index.ts:81`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `provider` | `z.string().required()` | required（无 schema default） | The `ctx.subagents` provider name to start runs on (e.g. `spawn`, `acp`). | 省略则 schemastery / loader 拒载。 | `packages/subagent/tool-subagent/src/index.ts:82` |
| `toolName` | `z.string().default('subagent')` | 'subagent' | Model-facing tool name (default `subagent`). Each loaded instance must use a distinct name. | 改模型可见 / 注册名，而不改实现包。 | `packages/subagent/tool-subagent/src/index.ts:83` |
| `enableRunInBackground` | `z.boolean().default(true)` | true | Expose `run_in_background` (default true). Disabled instances omit the parameter and reject forced background calls. | Expose `run_in_background` (default true). | `packages/subagent/tool-subagent/src/index.ts:84` |
| `backgroundMode` | `z.union(['one-shot', 'continuable']).default('one-shot')` | 'one-shot' | Background execution policy (default `one-shot`). `one-shot` defaults calls to foreground; `continuable` defaults them to background, requires a provider with the `prepareContinuable` capability, and returns the durable child id. Follow-up adapters remain independently optional. | Background execution policy (default `one-shot`). | `packages/subagent/tool-subagent/src/index.ts:85` |
| `agentOptions` | `object` | undefined | Agent options applied to every child; omitted fields use child-loop defaults. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/subagent/tool-subagent/src/index.ts:87` |
| `agentOptions.provider` | `z.string()` | — | Agent options applied to every child; omitted fields use child-loop defaults. | cordis.yml `config:` 可调。 | `packages/subagent/tool-subagent/src/index.ts:88` |
| `agentOptions.model` | `z.string()` | — | Agent options applied to every child; omitted fields use child-loop defaults. | cordis.yml `config:` 可调。 | `packages/subagent/tool-subagent/src/index.ts:89` |
| `agentOptions.maxTokens` | `z.number().step(1).min(1).max(Number.MAX_SAFE_INTEGER)` | — | Agent options applied to every child; omitted fields use child-loop defaults. | cordis.yml `config:` 可调。 | `packages/subagent/tool-subagent/src/index.ts:90` |
| `persona` | `z.string()` | — | Per-child persona that shadows `deployment:persona`. Requires the provider's `persona` capability; omission preserves the deployment persona. | Per-child persona that shadows `deployment:persona`. | `packages/subagent/tool-subagent/src/index.ts:92` |
| `toolFilter` | `z.object({ allow: z.array(z.string()).default(undefined` | undefined | Tool filter applied to every child. Filtered tools disappear from its prompt and reject execution. Requires the provider's `toolFilter` capability; unknown names fail startup. | Tool filter applied to every child. | `packages/subagent/tool-subagent/src/index.ts:94` |
| `toolFilter.allow` | `z.array(z.string()).default(undefined)` | undefined | Tool filter applied to every child. Filtered tools disappear from its prompt and reject execution. Requires the provider's `toolFilter` capability; unknown names fail startup. | Tool filter applied to every child. | `packages/subagent/tool-subagent/src/index.ts:95` |
| `toolFilter.deny` | `z.array(z.string()).default(undefined)` | undefined | Tool filter applied to every child. Filtered tools disappear from its prompt and reject execution. Requires the provider's `toolFilter` capability; unknown names fail startup. | Tool filter applied to every child. | `packages/subagent/tool-subagent/src/index.ts:96` |
| `maxDepth` | `union` | 3 | Maximum child depth: a non-negative safe integer (default `3`; `0` forbids delegation entirely), or `'provider-managed'` to send no cap. A numeric cap requires the provider's `depthLimit` capability (mount fails loud otherwise). The provider checks the calling agent's current depth at every start; the tool remains model-visible so runtime policy owns rejection. `'provider-managed'` is for an out-of-process provider whose recursion budget belongs to the child runtime or its own deployment. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/subagent/tool-subagent/src/index.ts:98` |

#### `@deepseek-ai/dsh-tool-subagent-report`

export const Config 在 `packages/subagent/tool-subagent-report/src/index.ts:36`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `reportDelivery` | `z.union(['quiet', 'wakeup']).default('wakeup')` | 'wakeup' | Parent scheduling (default `wakeup`). `wakeup` creates one ordinary later parent turn; `quiet` adds context without waking, so a parked parent learns of the report only when something else wakes it. | Parent scheduling (default `wakeup`). | `packages/subagent/tool-subagent-report/src/index.ts:37` |

### `terminal`

#### `@deepseek-ai/dsh-terminal-bash`

export const Config 在 `packages/terminal/terminal-bash/src/config.ts:44`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `backendType` | `z.string().default('shell')` | 'shell' | Backend registry type (default: `shell`). | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/terminal/terminal-bash/src/config.ts:45` |
| `shellPath` | `z.string().default('/bin/bash')` | '/bin/bash' | Interactive shell executable (default: `/bin/bash`). | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/terminal/terminal-bash/src/config.ts:46` |
| `shellArgs` | `z.array(z.string()).default(['--noprofile', '--norc', '-i'])` | ['--noprofile', '--norc', '-i'] | Shell arguments (default: `--noprofile --norc -i`). | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/terminal/terminal-bash/src/config.ts:47` |
| `rows` | `z.number().default(40)` | 40 | Terminal rows. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/terminal/terminal-bash/src/config.ts:48` |
| `cols` | `z.number().default(160)` | 160 | Terminal columns. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/terminal/terminal-bash/src/config.ts:49` |
| `scrollbackLines` | `z.number().default(10_000)` | 10_000 | Maximum retained logical lines. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/terminal/terminal-bash/src/config.ts:50` |
| `scrollbackMaxBytes` | `z.number().default(4 * 1024 * 1024)` | 4 * 1024 * 1024 | Maximum retained UTF-8 bytes. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/terminal/terminal-bash/src/config.ts:51` |
| `maxReadBytes` | `z.number().default(256 * 1024)` | 256 * 1024 | Maximum bytes returned by one read or settled viewport. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/terminal/terminal-bash/src/config.ts:52` |
| `pollIntervalMs` | `z.number().default(50)` | 50 | Readiness polling interval. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/terminal/terminal-bash/src/config.ts:53` |
| `exactProbeAfterMs` | `z.number().default(150)` | 150 | Delay before Linux exact syscall probes. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/terminal/terminal-bash/src/config.ts:54` |
| `idleSilenceMs` | `z.number().default(3_000)` | 3_000 | Silence duration that yields `inferred_idle`. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/terminal/terminal-bash/src/config.ts:55` |
| `handoffGraceMs` | `z.number().default(500)` | 500 | Extra wait beyond `idleSilenceMs`, once a prompt marker was seen, for the shell to regain the foreground before `inferred_idle` settles; at least one `pollIntervalMs`. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/terminal/terminal-bash/src/config.ts:56` |
| `timeoutMs` | `z.number().default(30_000)` | 30_000 | Absolute send wait bound. | 给一次 I/O 钉死上限，避免无限等。 | `packages/terminal/terminal-bash/src/config.ts:57` |
| `disposeGraceMs` | `z.number().default(3_000)` | 3_000 | Grace before teardown escalates to `SIGKILL`. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/terminal/terminal-bash/src/config.ts:58` |

#### `@deepseek-ai/dsh-tool-terminal`

export const Config 在 `packages/terminal/tool-terminal/src/index.ts:43`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `enableRunInBackground` | `z.boolean().default(true)` | true | Expose `run_in_background` and accept background sends (default true). | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/terminal/tool-terminal/src/index.ts:44` |
| `maxResultBytes` | `z.number().step(1).min(MIN_MAX_RESULT_BYTES).max(Number.MAX_SAFE_INTEGER).default(DEFAU…` | 256 * 1024 | Maximum UTF-8 bytes in one complete terminal or task-output result. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/terminal/tool-terminal/src/index.ts:45` |

### `todo`

#### `@deepseek-ai/dsh-tool-todo`

export const Config 在 `packages/todo/tool-todo/src/index.ts:41`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `allowParallelInProgress` | `z.boolean().required()` | required（无 schema default） | Required deployment choice for whether several todos may be `in_progress` at once. True suits agents that run work concurrently — subagents, background commands, workflow fan-out — and the description then instructs the model to mark every actively worked task. False restores the single-active discipline: the description asks for exactly one, and a call marking more is rejected. | 省略则 schemastery / loader 拒载。 | `packages/todo/tool-todo/src/index.ts:42` |

### `typert`

#### `@deepseek-ai/dsh-typert-loader`

export const Config 在 `packages/typert/loader/src/index.ts:53`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `packages` | `z.array(z.string().min(1)).default([])` | [] | Exact npm package names that must resolve and export `./typert`. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/typert/loader/src/index.ts:54` |

### `web`

#### `@deepseek-ai/dsh-tool-web`

export const Config 在 `packages/web/tool-web/src/index.ts:52`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `search` | `z.boolean().default(true)` | true | Register `web_search`. Defaults to true. | Register `web_search`. | `packages/web/tool-web/src/index.ts:53` |
| `fetch` | `z.boolean().default(true)` | true | Register `web_fetch`. Defaults to true. | Register `web_fetch`. | `packages/web/tool-web/src/index.ts:54` |
| `searchMaxResults` | `z.number().default(WEB_SEARCH_MAX_RESULTS)` | WEB_SEARCH_MAX_RESULTS | Upper bound on sources returned by one `web_search` call. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/web/tool-web/src/index.ts:55` |
| `fetchTimeoutMs` | `z.number().default(DEFAULT_WEB_TOOL_TIMEOUT_MS)` | 30_000 | Cooperative timeout budget (ms) for `web_fetch`. Defaults to 30000. | Cooperative timeout budget (ms) for `web_fetch`. | `packages/web/tool-web/src/index.ts:56` |
| `searchTimeoutMs` | `z.number().default(DEFAULT_WEB_TOOL_TIMEOUT_MS)` | 30_000 | Cooperative timeout budget (ms) for `web_search`. Defaults to 30000. | Cooperative timeout budget (ms) for `web_search`. | `packages/web/tool-web/src/index.ts:57` |
| `fetchMaxOutputChars` | `z.number().default(DEFAULT_FETCH_MAX_OUTPUT_CHARS)` | 200_000 | Cap on source characters converted and complete `web_fetch` output characters. Defaults to 200000. | Cap on source characters converted and complete `web_fetch` output characters. | `packages/web/tool-web/src/index.ts:58` |

#### `@deepseek-ai/dsh-web`

static Config 在 `packages/web/web/src/index.ts:80`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `searchProvider` | `z.string()` | — | Explicit search provider id. Omitted = auto-select when exactly one usable. | Explicit search provider id. | `packages/web/web/src/index.ts:81` |
| `fetchProvider` | `z.string()` | — | Explicit fetch provider id. Omitted = auto-select when exactly one usable. | Explicit fetch provider id. | `packages/web/web/src/index.ts:82` |

#### `@deepseek-ai/dsh-web-fetch-http`

export const Config 在 `packages/web/web-fetch-http/src/index.ts:49`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `maxUrlLength` | `z.number().default(2048)` | 2048 | Maximum accepted request URL length. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/web/web-fetch-http/src/index.ts:50` |
| `maxResponseBytes` | `z.number().default(5_000_000)` | 5_000_000 | Maximum response body size in bytes. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/web/web-fetch-http/src/index.ts:51` |
| `maxBodyChars` | `z.number().default(100_000)` | 100_000 | Maximum decoded body length in characters. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/web/web-fetch-http/src/index.ts:52` |
| `timeoutMs` | `z.number().default(30_000)` | 30_000 | Default fetch timeout in milliseconds, within Node's timer range. | 给一次 I/O 钉死上限，避免无限等。 | `packages/web/web-fetch-http/src/index.ts:53` |
| `maxRedirects` | `z.number().default(5)` | 5 | Maximum number of same-origin redirect hops to follow. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/web/web-fetch-http/src/index.ts:54` |
| `userAgent` | `z.string().default(DEFAULT_USER_AGENT)` | 'deepseek-harness/0.0.1 (+https://github.com/deepseek-ai)' | `User-Agent` header sent on every request. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/web/web-fetch-http/src/index.ts:55` |

#### `@deepseek-ai/dsh-web-search-deepseek`

export const Config 在 `packages/web/web-search-deepseek/src/index.ts:63`。 [E: packages/web/web-search-deepseek/src/index.ts:63]

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `apiKey` | `z.string().role('secret')` | — | Literal DeepSeek API key; prefer {@link apiKeyEnv} so no secret enters configuration files. | secret 角色：不得当 settings 明文下发，wire 必须 redact。 | `packages/web/web-search-deepseek/src/index.ts:64` |
| `apiKeyEnv` | `z.string().role('credential-ref').default(DEFAULT_API_KEY_ENV)` | 'DEEPSEEK_API_KEY' | Credential reference resolved for each search; defaults to `DEEPSEEK_API_KEY`. | 只存凭证引用名，真值走 ctx.credentials。 | `packages/web/web-search-deepseek/src/index.ts:65` |
| `baseURL` | `z.string()` | — | Anthropic-compatible endpoint base; `/messages` is appended. | cordis.yml `config:` 可调。 | `packages/web/web-search-deepseek/src/index.ts:69` |
| `model` | `z.string().default(DEEPSEEK_DEFAULT_MODEL)` | DEEPSEEK_DEFAULT_MODEL | Anthropic-format model name. Defaults to `deepseek-v4-flash`. | Anthropic-format model name. | `packages/web/web-search-deepseek/src/index.ts:70` |
| `apiVersion` | `z.string().default(DEEPSEEK_DEFAULT_API_VERSION)` | DEEPSEEK_DEFAULT_API_VERSION | `anthropic-version` header value. Defaults to `2023-06-01`. | `anthropic-version` header value. | `packages/web/web-search-deepseek/src/index.ts:71` |
| `maxTokens` | `z.number().step(1).min(1).default(DEEPSEEK_DEFAULT_MAX_TOKENS)` | DEEPSEEK_DEFAULT_MAX_TOKENS | Upper bound on generated tokens for the Messages request. Defaults to 4096. | Upper bound on generated tokens for the Messages request. | `packages/web/web-search-deepseek/src/index.ts:72` |
| `maxUses` | `z.number().step(1).min(1).default(DEEPSEEK_DEFAULT_MAX_USES)` | DEEPSEEK_DEFAULT_MAX_USES | Maximum `web_search` server-tool uses per request. Defaults to 5. | Maximum `web_search` server-tool uses per request. | `packages/web/web-search-deepseek/src/index.ts:73` |

#### `@deepseek-ai/dsh-web-search-exa`

export const Config 在 `packages/web/web-search-exa/src/index.ts:51`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `apiKey` | `z.string()` | — | Exa API key. Falls back to `$EXA_API_KEY`. Empty → provider unavailable. | Exa API key. | `packages/web/web-search-exa/src/index.ts:52` |
| `baseURL` | `z.string()` | — | Endpoint base; `/search` is appended. Defaults to the public API. | Endpoint base; `/search` is appended. | `packages/web/web-search-exa/src/index.ts:53` |
| `searchType` | `z.union(['auto', 'keyword', 'neural'])` | — | Retrieval mode sent as Exa's `type`. Defaults to `auto`. | Retrieval mode sent as Exa's `type`. | `packages/web/web-search-exa/src/index.ts:54` |
| `numResults` | `z.number().step(1).min(1)` | — | Default result count when a request carries no `maxResults`. Omitted = none. | Default result count when a request carries no `maxResults`. | `packages/web/web-search-exa/src/index.ts:55` |
| `highlightsPerResult` | `z.number().step(1).min(1)` | — | Highlight sentences requested per result. Defaults to 1. | Highlight sentences requested per result. | `packages/web/web-search-exa/src/index.ts:56` |

#### `@deepseek-ai/dsh-web-search-perplexity`

export const Config 在 `packages/web/web-search-perplexity/src/index.ts:45`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `apiKey` | `z.string()` | — | Perplexity API key. Falls back to `$PERPLEXITY_API_KEY`. Empty → unavailable. | Perplexity API key. | `packages/web/web-search-perplexity/src/index.ts:46` |
| `baseURL` | `z.string()` | — | Endpoint base; `/chat/completions` is appended. Defaults to the public API. | Endpoint base; `/chat/completions` is appended. | `packages/web/web-search-perplexity/src/index.ts:47` |
| `model` | `z.string()` | — | Search model name. Defaults to `sonar`. | Search model name. | `packages/web/web-search-perplexity/src/index.ts:48` |
| `maxTokens` | `z.number().step(1).min(1)` | — | Upper bound on generated answer tokens. Defaults to 1024. | Upper bound on generated answer tokens. | `packages/web/web-search-perplexity/src/index.ts:49` |
| `searchRecency` | `z.union(['day', 'week', 'month', 'year'])` | — | Recency window sent as `search_recency_filter`. Omitted = no filter. | Recency window sent as `search_recency_filter`. | `packages/web/web-search-perplexity/src/index.ts:50` |

### `workflow`

#### `@deepseek-ai/dsh-tool-ralph`

export const Config 在 `packages/workflow/tool-ralph/src/index.ts:35`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `subagentProvider` | `z.string().default('spawn')` | 'spawn' | Fresh structured-output provider used for every round (default `spawn`). | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/workflow/tool-ralph/src/index.ts:36` |
| `maxRounds` | `z.number().step(1).min(1).max(Number.MAX_SAFE_INTEGER).default(256)` | 256 | Default and deployment ceiling for one call's round count (default 256). | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/workflow/tool-ralph/src/index.ts:37` |
| `maxHandoffChars` | `z.number().step(1).min(1).max(Number.MAX_SAFE_INTEGER).default(16_384)` | 16_384 | Maximum serialized characters in one structured handoff (default 16384). | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/workflow/tool-ralph/src/index.ts:38` |
| `maxResultChars` | `z.number().step(1).min(1).max(Number.MAX_SAFE_INTEGER).default(16_384)` | 16_384 | Maximum characters in a successful parent-facing terminal text (default 16384). | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/workflow/tool-ralph/src/index.ts:39` |

#### `@deepseek-ai/dsh-tool-workflow`

export const Config 在 `packages/workflow/tool-workflow/src/index.ts:40`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `toolName` | `z.string().default('workflow')` | 'workflow' | The model-facing tool name to register (default `workflow`). | 改模型可见 / 注册名，而不改实现包。 | `packages/workflow/tool-workflow/src/index.ts:41` |
| `maxResultChars` | `z.natural().min(1).default(50_000)` | 50_000 | Rendered-result ceiling, in characters: a longer JSON value is truncated with a notice (default 50000). | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/workflow/tool-workflow/src/index.ts:42` |

#### `@deepseek-ai/dsh-workflow-worker-thread`

static Config 在 `packages/workflow/workflow-worker-thread/src/index.ts:115`。

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 path |
|---|---|---|---|---|---|
| `provider` | `z.string().default('spawn')` | 'spawn' | The `ctx.subagents` provider children run on (default `spawn`). | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/workflow/workflow-worker-thread/src/index.ts:116` |
| `maxConcurrentAgents` | `z.natural().default(0)` | 0 | Concurrent `agent()` ceiling; `0` (the default) auto-resolves to `min(16, max(1, cores - 2))`. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/workflow/workflow-worker-thread/src/index.ts:117` |
| `maxTotalAgents` | `z.natural().min(1).default(1000)` | 1000 | Total `agent()` calls one run may start — the runaway-loop backstop (default 1000). | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/workflow/workflow-worker-thread/src/index.ts:118` |
| `maxItemsPerCall` | `z.natural().min(1).default(4096)` | 4096 | Items accepted by a single `parallel()`/`pipeline()` call (default 4096). | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/workflow/workflow-worker-thread/src/index.ts:119` |
| `syncTimeoutMs` | `z.natural().min(1).default(5000)` | 5000 | vm timeout for the script's initial synchronous slice, inside the worker (default 5000 ms). | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/workflow/workflow-worker-thread/src/index.ts:120` |
| `disposeGraceMs` | `z.natural().default(5000)` | 5000 | How long after a cancellation an unsettled script may keep running before the run force-settles `cancelled` and its worker is TERMINATED (default 5000 ms); also bounds `dispose()`. | 省略走 schema default，composition `config:` 仍可覆盖。 | `packages/workflow/workflow-worker-thread/src/index.ts:121` |

## 对照 / 分家 / 装配

### 官方 catalog 有类型、本页没有 schema 的包

官方 `docs/config-catalog.md` 多出 **5** 个包：它们有 TypeScript Config **类型**（或别名），冻结树 **没有** `export const Config` / `static Config`。本页不把它们的字段写进插件 schema 表。跟代码，不跟生成物。

| 包 | 声明 | 含义 | 为什么不当成本页实例 | 源 |
|---|---|---|---|---|
| `@deepseek-ai/dsh-bash-sandbox` | `export type Config = LocalConfig` | 继承 `dsh-bash-local` 的 Config 类型 | 自己不声明 schema；sandbox mode 在 `ctx.sandboxPolicy` | [E: packages/shell/bash-sandbox/src/index.ts:35] |
| `@deepseek-ai/dsh-fs-sandbox` | `export type Config = LocalConfig` | 继承 `dsh-fs-local` | 自己不声明 schema；sandbox mode 在 `ctx.sandboxPolicy` | [E: packages/fs/fs-sandbox/src/index.ts:49] |
| `@deepseek-ai/dsh-pwsh-sandbox` | `export type Config = LocalConfig` | 继承 `dsh-pwsh-local` | 自己不声明 schema；sandbox mode 在 `ctx.sandboxPolicy` | [E: packages/shell/pwsh-sandbox/src/index.ts:40] |
| `@deepseek-ai/dsh-llm-replay` | `export interface Config` + `apply(ctx, config = {})` | 测试夹具路径 / 可选 providers | 无 schemastery `Config`；缺省走 `$DSH_SNAPSHOT_*` | [E: packages/test-support/llm-replay/src/index.ts:776] |
| `@deepseek-ai/dsh-plan-mode` | `export interface PlanModeConfig` | 只要 `section` 字符串 | 名字不是 `Config`，也没有 `export const Config` | [E: packages/plan/plan-mode/src/index.ts:70] |

本仓 **没有** 多出来、官方 catalog 没收的 `export const Config` / `static Config` 包。`tool-cordis/src/api-catalog.ts` 里的 `static Config` 出现在生成出来的 **字符串** 里，不是本包 schema，已跳过。

### 空 schema 不是漏包

`dsh-llm-retry` 的 `export const Config = z.object({})`：retry 政策属于各 provider 的 `retryPolicy`。[E: packages/llm/llm-retry/src/index.ts:27]
`dsh-token-meter` 的 `static Config = z.object({})`。[E: packages/llm/token-meter/src/index.ts:77] 构造器 `validateConfigKeys(config)` 拒绝任何用户键。[E: packages/llm/token-meter/src/index.ts:83]

### `baseURL` 分家

| 包 | Config 键 | 环境变量（不是 Config 键） | 用途 |
|---|---|---|---|
| `dsh-llm-deepseek` | `baseURL` | `DEEPSEEK_BASE_URL` | chat completions |
| `dsh-web-search-deepseek` | `baseURL` | `DEEPSEEK_SEARCH_BASE_URL` | Anthropic-compatible Messages / search |

两条键同名，**不**共用默认、**不**互相回退。LLM 侧环境名是 `BASE_URL_ENV = 'DEEPSEEK_BASE_URL'`；search 侧是 `SEARCH_BASE_URL_ENV = 'DEEPSEEK_SEARCH_BASE_URL'`，回退到自己的 `DEEPSEEK_DEFAULT_BASE_URL`，不读 chat 的 BASE_URL。[E: packages/llm/llm-deepseek/src/index.ts:107][E: packages/web/web-search-deepseek/src/index.ts:82]

### session-projection-cache / session-telemetry-otel

两包都是 `export const Config = z.object(…)`，再 `static Config = Config`。本页认 **export const** 那份 object 字面量。

## Sources

- `docs/config-catalog.md`
- `packages/settings/settings/src/types.ts`
- `packages/settings/settings/src/index.ts`
- `packages/settings/settings-file/src/index.ts`
- `packages/llm/llm/src/retry-policy.ts`
- `packages/compaction/compaction-basic/src/types.ts`
- `packages/session/session-title-llm/src/index.ts`
- `packages/preset/agent-presets/src/preset.ts`
- `packages/session-query/session-query/src/config.ts`
- `packages/context/session-reference/src/config.ts`
- `packages/compaction/compaction-tool-result-pruner/src/types.ts`
- `packages/client/ui-theme/src/theme-settings.ts`
- `packages/client/locale/src/locale-settings.ts`
- `packages/client/ui-conversation/src/submission-settings.ts`
- `packages/client/ui-settings-general/src/index.ts`
- `packages/shell/bash-sandbox/src/index.ts`
- `packages/fs/fs-sandbox/src/index.ts`
- `packages/shell/pwsh-sandbox/src/index.ts`
- `packages/plan/plan-mode/src/index.ts`
- `packages/test-support/llm-replay/src/index.ts`
- `packages/acp/acp/src/index.ts`
- `packages/attachment/attachment-local/src/index.ts`
- `packages/bundle/headless/src/index.ts`
- `packages/bundle/web-app/src/index.ts`
- `packages/client/connection/src/index.ts`
- `packages/client/hmr/src/index.ts`
- `packages/code-runtime/code-runtime-worker-thread/src/index.ts`
- `packages/compaction/compaction-basic/src/index.ts`
- `packages/compaction/compaction-tool-result-pruner/src/index.ts`
- `packages/context/agent-instructions/src/config.ts`
- `packages/context/session-reference/src/index.ts`
- `packages/context/time-context/src/index.ts`
- `packages/context/tmux-context/src/index.ts`
- `packages/core/agent-default-model/src/index.ts`
- `packages/core/agent-loop/src/index.ts`
- `packages/core/agent-tool-presentation/src/index.ts`
- `packages/core/system-prompt/src/index.ts`
- `packages/core/tools/src/index.ts`
- `packages/credentials/credentials-local/src/index.ts`
- `packages/e2b/e2b/src/index.ts`
- `packages/e2b/subprocess-e2b/src/index.ts`
- `packages/examples/acp-demo/src/index.ts`
- `packages/examples/agent-spine-demo/src/index.ts`
- `packages/extensions/cordis-host-runner/src/index.ts`
- `packages/feedback/message-feedback/src/index.ts`
- `packages/fs/fs-local/src/index.ts`
- `packages/fs/tool-fs-search/src/index.ts`
- `packages/fs/tool-fs/src/index.ts`
- `packages/fs/tool-str-replace-editor/src/index.ts`
- `packages/goal/goal/src/index.ts`
- `packages/goal/tool-goal/src/index.ts`
- `packages/guard/repeat-tool-reminder/src/index.ts`
- `packages/hooks/hooks-claude-code/src/index.ts`
- `packages/hooks/hooks-codex/src/index.ts`
- `packages/host/apiproxy/src/index.ts`
- `packages/host/directory-picker-browse/src/index.ts`
- `packages/host/frontend-static/src/index.ts`
- `packages/host/webserver/src/index.ts`
- `packages/interaction/permission-presets/src/index.ts`
- `packages/interaction/user-approval/src/index.ts`
- `packages/jobs/jobs-local/src/index.ts`
- `packages/jobs/tool-jobs/src/index.ts`
- `packages/llm/llm-deepseek/src/index.ts`
- `packages/llm/llm-pi-ai/src/config.ts`
- `packages/llm/llm-retry/src/index.ts`
- `packages/llm/token-meter/src/index.ts`
- `packages/lsp/lsp-stdio/src/index.ts`
- `packages/lsp/tool-lsp/src/index.ts`
- `packages/mcp/mcp-client/src/index.ts`
- `packages/mcp/mcp-client/src/connection.ts`
- `packages/preset/agent-presets/src/index.ts`
- `packages/preset/persona/src/index.ts`
- `packages/runtime-diagnostics/invariants/src/index.ts`
- `packages/sandbox/sandbox-local/src/index.ts`
- `packages/sandbox/sandbox-policy/src/index.ts`
- `packages/sdk/server/src/index.ts`
- `packages/session-query/session-query-sqlite/src/index.ts`
- `packages/session-query/tool-session-query/src/index.ts`
- `packages/session/session-persistence-jsonl/src/index.ts`
- `packages/session/session-persistence-sqlite/src/index.ts`
- `packages/session/session-projection-cache/src/index.ts`
- `packages/session/session-telemetry-otel/src/index.ts`
- `packages/session/session-title-all-prompts-llm/src/index.ts`
- `packages/session/session-title-first-prompt-llm/src/index.ts`
- `packages/session/session-title/src/index.ts`
- `packages/shell/bash-local/src/index.ts`
- `packages/shell/pwsh-local/src/index.ts`
- `packages/shell/shell-env/src/index.ts`
- `packages/shell/tool-bash-persistent/src/index.ts`
- `packages/shell/tool-bash/src/index.ts`
- `packages/shell/tool-pwsh/src/index.ts`
- `packages/skill/skill-filesystem/src/index.ts`
- `packages/skill/skill/src/index.ts`
- `packages/skill/tool-skill/src/index.ts`
- `packages/spill/spill-local/src/index.ts`
- `packages/spill/spill-policy/src/index.ts`
- `packages/storage/storage-domain/src/index.ts`
- `packages/storage/storage-json/src/index.ts`
- `packages/storage/storage-sqlite/src/index.ts`
- `packages/subagent/subagent-acp/src/index.ts`
- `packages/subagent/subagent-claude-code/src/index.ts`
- `packages/subagent/subagent-codex/src/index.ts`
- `packages/subagent/subagent-dsh-sdk/src/index.ts`
- `packages/subagent/subagent-fork-in-process/src/index.ts`
- `packages/subagent/subagent-spawn-in-process/src/index.ts`
- `packages/subagent/tool-subagent-report/src/index.ts`
- `packages/subagent/tool-subagent/src/index.ts`
- `packages/terminal/terminal-bash/src/config.ts`
- `packages/terminal/tool-terminal/src/index.ts`
- `packages/todo/tool-todo/src/index.ts`
- `packages/typert/loader/src/index.ts`
- `packages/web/tool-web/src/index.ts`
- `packages/web/web-fetch-http/src/index.ts`
- `packages/web/web-search-deepseek/src/index.ts`
- `packages/web/web-search-exa/src/index.ts`
- `packages/web/web-search-perplexity/src/index.ts`
- `packages/web/web/src/index.ts`
- `packages/workflow/tool-ralph/src/index.ts`
- `packages/workflow/tool-workflow/src/index.ts`
- `packages/workflow/workflow-worker-thread/src/index.ts`

## 相关

- [`subsys.persistence.settings`](../subsystems/persistence/settings.md) — `ctx.settings` 三层 resolve、`installSettingsSection`、redact
- [`surface.config.settings`](../surface/config/settings.md) — 用户怎么改 settings.yaml / Models / General
- [`spine.composition-boot`](../spine/composition-boot.md) — profile → bundle → patch 叠层，entry Config 从哪来
- [`ref.presets`](presets.md) — 四个 shipped `agent.cordis.yml` 装了哪些插件（preset 面 Config 的成员资格）
- [`ref.env-vars`](env-vars.md) — `DSH_HOME` / `DEEPSEEK_BASE_URL` / `DEEPSEEK_SEARCH_BASE_URL` 等进程环境
