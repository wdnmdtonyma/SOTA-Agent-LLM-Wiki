---
id: ref.config-keys
title: Config 键目录
kind: catalog
tier: T3
pkg: persistence
source:
  - packages/settings/settings/src/index.ts
  - packages/settings/settings-file/src/index.ts
  - packages/llm/llm/src/retry-policy.ts
  - packages/preset/agent-presets/src/index.ts
  - packages/preset/agent-presets/src/discovery.ts
  - packages/boot/app-boot/src/profile.ts
  - packages/core/agent-loop/src/index.ts
  - packages/core/agent-default-model/src/index.ts
  - packages/core/agent-tool-presentation/src/index.ts
  - packages/core/tools/src/index.ts
  - packages/core/system-prompt/src/index.ts
  - packages/acp/acp/src/index.ts
  - packages/attachment/attachment-local/src/index.ts
  - packages/bundle/headless/src/index.ts
  - packages/bundle/web-app/src/index.ts
  - packages/bundle/sdk-app/src/index.ts
  - packages/bundle/base/cordis.patch.yml
  - packages/client/connection/src/index.ts
  - packages/client/ui-theme/src/theme-settings.ts
  - packages/client/locale/src/locale-settings.ts
  - packages/client/ui-conversation/src/submission-settings.ts
  - packages/client/ui-settings-general/src/index.ts
  - packages/compaction/compaction-basic/src/index.ts
  - packages/context/agent-instructions/src/config.ts
  - packages/context/file-reference-local/src/index.ts
  - packages/credentials/credentials-local/src/index.ts
  - packages/experimental/agent-team/src/index.ts
  - packages/experimental/tool-agent-team/src/index.ts
  - packages/experimental/inspector/src/index.ts
  - packages/host/webserver/src/index.ts
  - packages/host/frontend-static/src/index.ts
  - packages/host/directory-picker-browse/src/index.ts
  - packages/host/open-in-app/src/index.ts
  - packages/api/workspace-files/src/index.ts
  - packages/fs/tool-present/src/index.ts
  - packages/preset/persona/src/index.ts
  - packages/interaction/permission-presets/src/index.ts
  - packages/llm/llm-deepseek/src/index.ts
  - packages/llm/llm-pi-ai/src/config.ts
  - packages/llm/llm-retry/src/index.ts
  - packages/llm/token-meter/src/index.ts
  - packages/llm/plugin-package-inventory-deepseek/src/index.ts
  - packages/mcp/mcp-client/src/index.ts
  - packages/sandbox/sandbox-policy/src/index.ts
  - packages/sdk/server/src/index.ts
  - packages/session/session-log-deepseek/src/index.ts
  - packages/session-query/session-log-export/src/index.ts
  - packages/shell/tool-pwsh-persistent/src/index.ts
  - packages/web/web-search-deepseek/src/index.ts
  - packages/webhook/webhook-github/src/index.ts
  - apps/cli/src/args.ts
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
updated: c291e7961a
---

> 每个可 load 的 harness 插件把 **部署轴** 写成 `export const Config` 或 `static Config`（`@deepseek-ai/schemastery` 的 `z.object` / `z.union` / `z.intersect`）。本页按包列出 **schema 接受的键**（嵌套写成 `parent.child` / `parent[]`）。这是 Cordis 组合运行时的 `cordis.yml` `config:` 词表，不是 session log，也不是用户 `settings.yaml` 文档键表。

## 能回答的问题

- 某个 `@deepseek-ai/dsh-*` 插件的 `Config` 有哪些顶层键？默认是什么？
- 空 `z.object({})` 的包是漏了键，还是故意不接受用户键？
- schema default、composition `base`、用户 `settings.yaml` 哪一层赢？`replace({})` 回到哪一层？
- `llm-deepseek` 的 `baseURL` 和 `web-search-deepseek` 的 `baseURL` 是不是同一条环境变量？
- `agent-loop` 的 `agents` 会不会进 settings 文档？`agent-presets` 用户能改哪些键？
- PTC `mode` / Agent Teams / webhook-github / persistent `pwsh` 各有哪些部署键？

## 范围与 ground truth

本页是 **T3 grouped-catalog**。实例 = 一个 schema 键路径（或一行「本包无用户键」）。分组按 `packages/<group>/<pkg>`。

**认哪份源**：`packages/` 里（跳过 tests）每一处 `export const Config` / `static Config` 的 schemastery 表达式。官方 `docs/config-catalog.md` **只当查漏，不当 [E]**。`apps/` 没有插件 `Config`；launcher 旗标在 [`ref.cli-flags`](cli-flags.md)；环境变量在 [`ref.env-vars`](env-vars.md)。

**不要**把已删除包当 source：`packages/host/apiproxy`、`packages/client/runtime`、`packages/client/web-react`、`packages/examples/acp-demo`、`packages/session/session-persistence-sqlite`、`packages/subagent/tool-subagent-report`、`packages/examples/agent-spine-demo`、`packages/code-runtime/code-runtime-python`。旧 `apps/cli/config/agent-presets/` 与 `code-mode.ts` 亦不存在。

DSH 是 **Cordis 组合运行时**（`profile → bundle → agent preset`）。五个 shipped profile 在 `PROFILE_TEMPLATES`：`acp` / `web` / `headless` / `sdk` / `sdk-minimal`。[E: packages/boot/app-boot/src/profile.ts:105] `web` 是唯一 `patchReload: 'live'` 模板。[E: packages/boot/app-boot/src/profile.ts:112] `sdk-minimal` 的 bundles 只有 `@deepseek-ai/dsh-sdk-minimal`，不叠 `dsh-base`。[E: packages/boot/app-boot/src/profile.ts:123] `desktop` 不是该表成员；`dsh --profile desktop` 被拒。[E: apps/cli/src/args.ts:68] 入口除 `dsh web` 外还有 `dsh --profile <name>`（required）。[E: apps/cli/src/args.ts:145] `web` 是 `--profile web` 的别名。[E: apps/cli/src/args.ts:175]

四个 shipped preset 目录名：`minimal` / `standard` / `ptc` / `cordis`（`SHIPPED_PRESET_ROOT` 指向包内 `presets/`）。[E: packages/preset/agent-presets/src/discovery.ts:60] 旧名 `code` 就是 PTC。wiki 节点 id `surface.presets.code` 保持稳定别名。Code Mode 权威文件是 `packages/core/tools/src/ptc.ts`。

默认模型（base 组合）是 `deepseek-official` / `deepseek-flash`（见 [`ref.presets`](presets.md) 与 `dsh-agent-default-model`）。schema 本身 required、无 default；acp-app 仍硬编码 `deepseek-v4-flash`。

### settings 分层（不要和插件 Config 混表）

`SettingsService.get` 返回该 namespace 的 `registration.resolved`。[E: packages/settings/settings/src/index.ts:547] `resolve` 是 `schema(mergeLayers(base, section))`：先深合并 composition `base` 与 user section，再跑 schema 填 default。[E: packages/settings/settings/src/index.ts:748]

`installSection` 把 entry Config 登记成 `base`，并把运行时 source 指到 `scope.get()`。[E: packages/settings/settings/src/index.ts:480][E: packages/settings/settings/src/index.ts:483]

物理文档在 `@deepseek-ai/dsh-settings-file`：省略 `path` 时是 `<$DSH_HOME 或 ~/.dsh>/settings.yaml`；`watch` 默认 `true`，`debounceMs` 默认 `100`。[E: packages/settings/settings-file/src/index.ts:57][E: packages/settings/settings-file/src/index.ts:65][E: packages/settings/settings-file/src/index.ts:66] schema 声明在 `static Config`。[E: packages/settings/settings-file/src/index.ts:107]

**不要**把下列东西写进本页插件 Config 表（它们是用户文档 section，不是插件 `Config`）：

| namespace | schema 符号 | 与插件 Config 的关系 | 源 |
|---|---|---|---|
| `ui-theme` | `ThemeSettingsSchema` | `preference` + `fontSize`；client 包 **没有** `export const Config` | [E: packages/client/ui-theme/src/theme-settings.ts:41] |
| `locale` | `LocaleSettingsSchema` | `preference`；无插件 Config | [E: packages/client/locale/src/locale-settings.ts:30] |
| `ui-conversation` | `ConversationSettingsSchema` | `busyEnter`；无插件 Config | [E: packages/client/ui-conversation/src/submission-settings.ts:27] |
| `ui-onboarding` | `OnboardingSettingsSchema` | `welcomeNoticeVersion`；`apply` 不收 Config | [E: packages/client/ui-settings-general/src/index.ts:15] |
| `agent-presets` | `AgentPresetSettingsSchema` | 用户可改 `default` 与 `modeSelectionEnabled` | [E: packages/preset/agent-presets/src/index.ts:73] |
| `agent-loop` | `AGENT_LOOP_SETTINGS_SCHEMA` | 用户只能改 `maxParallelToolCalls`；`agents` 是 boot 一次的 composition 数组 | [E: packages/core/agent-loop/src/index.ts:307] |
| `agent-default-model` | `AGENT_DEFAULT_MODEL_SETTINGS_SCHEMA` | 比插件 Config **多** 可选 `reasoningEffort` | [E: packages/core/agent-default-model/src/index.ts:34] |

若干插件把 **同一份** `Config` schema 交给 `installSection`（`llm-deepseek`、`llm-pi-ai`、`web-search-deepseek`、`bash-local`、`pwsh-local`、`permission-presets`）。那些键在本页插件表里出现一次。控制流与 redact 在 [`subsys.persistence.settings`](../subsystems/persistence/settings.md)。

`replace({})` 清掉用户层，resolved 回到 schema default ⊕ composition `base`。实现是 `SettingsService.replace` → `write(..., 'replace')`。[E: packages/settings/settings/src/index.ts:581][E: packages/settings/settings/src/index.ts:586]

### host 面 vs agent-preset 面

- **host 面** Config：webserver / persistence / sandbox / credentials / settings-file / LLM adapter / search / webhook。随 profile / bundle 加载，所有会话共享。
- **agent-preset 面** Config：被 `packages/preset/agent-presets/presets/{minimal,standard,ptc,cordis}/agent.cordis.yml` 装上的工具与 persona。对照表在 [`ref.presets`](presets.md)。
- `dsh --dump-config` 看到的是叠层后的 **组合树**，不是 `settings.yaml`。

search 的 `baseURL` **不**回退到 `DEEPSEEK_BASE_URL`。`web-search-deepseek` 读的是 `DEEPSEEK_SEARCH_BASE_URL`。[E: packages/web/web-search-deepseek/src/index.ts:82][E: packages/web/web-search-deepseek/src/index.ts:111]

`retryPolicy` 嵌套键的权威 schema 在 `@deepseek-ai/dsh-llm` 的 `RetryPolicySchema`（library，自己不是插件 Config）。[E: packages/llm/llm/src/retry-policy.ts:100]

## 包索引（Config 声明行）

| 包 | 目录 | schema | Config 声明 |
|---|---|---|---|
| `@deepseek-ai/dsh-acp` | `packages/acp/acp` | object | [E: packages/acp/acp/src/index.ts:86] |
| `@deepseek-ai/dsh-attachment-local` | `packages/attachment/attachment-local` | object | [E: packages/attachment/attachment-local/src/index.ts:147] |
| `@deepseek-ai/dsh-headless` | `packages/bundle/headless` | object | [E: packages/bundle/headless/src/index.ts:39] |
| `@deepseek-ai/dsh-web-app` | `packages/bundle/web-app` | object | [E: packages/bundle/web-app/src/index.ts:60] |
| `@deepseek-ai/dsh-sdk-app` | `packages/bundle/sdk-app` | object | [E: packages/bundle/sdk-app/src/index.ts:29] |
| `@deepseek-ai/dsh-client-connection` | `packages/client/connection` | object | [E: packages/client/connection/src/index.ts:87] |
| `@deepseek-ai/dsh-compaction-basic` | `packages/compaction/compaction-basic` | object | [E: packages/compaction/compaction-basic/src/index.ts:107] |
| `@deepseek-ai/dsh-agent-instructions` | `packages/context/agent-instructions` | object | [E: packages/context/agent-instructions/src/config.ts:39] |
| `@deepseek-ai/dsh-file-reference-local` | `packages/context/file-reference-local` | object | [E: packages/context/file-reference-local/src/index.ts:46] |
| `@deepseek-ai/dsh-agent-default-model` | `packages/core/agent-default-model` | object | [E: packages/core/agent-default-model/src/index.ts:65] |
| `@deepseek-ai/dsh-agent-loop` | `packages/core/agent-loop` | object | [E: packages/core/agent-loop/src/index.ts:354] |
| `@deepseek-ai/dsh-agent-tool-presentation` | `packages/core/agent-tool-presentation` | object | [E: packages/core/agent-tool-presentation/src/index.ts:50] |
| `@deepseek-ai/dsh-system-prompt` | `packages/core/system-prompt` | object | [E: packages/core/system-prompt/src/index.ts:400] |
| `@deepseek-ai/dsh-tools` | `packages/core/tools` | object | [E: packages/core/tools/src/index.ts:783] |
| `@deepseek-ai/dsh-experimental-agent-team` | `packages/experimental/agent-team` | object | [E: packages/experimental/agent-team/src/index.ts:62] |
| `@deepseek-ai/dsh-experimental-tool-agent-team` | `packages/experimental/tool-agent-team` | object | [E: packages/experimental/tool-agent-team/src/index.ts:25] |
| `@deepseek-ai/dsh-experimental-inspector` | `packages/experimental/inspector` | object | [E: packages/experimental/inspector/src/index.ts:74] |
| `@deepseek-ai/dsh-host-frontend-static` | `packages/host/frontend-static` | object | [E: packages/host/frontend-static/src/index.ts:35] |
| `@deepseek-ai/dsh-host-directory-picker-browse` | `packages/host/directory-picker-browse` | object | [E: packages/host/directory-picker-browse/src/index.ts:196] |
| `@deepseek-ai/dsh-host-webserver` | `packages/host/webserver` | object | [E: packages/host/webserver/src/index.ts:125] |
| `@deepseek-ai/dsh-permission-presets` | `packages/interaction/permission-presets` | object | [E: packages/interaction/permission-presets/src/index.ts:165] |
| `@deepseek-ai/dsh-llm-deepseek` | `packages/llm/llm-deepseek` | object | [E: packages/llm/llm-deepseek/src/index.ts:177] |
| `@deepseek-ai/dsh-llm-pi-ai` | `packages/llm/llm-pi-ai` | object | [E: packages/llm/llm-pi-ai/src/config.ts:340] |
| `@deepseek-ai/dsh-llm-retry` | `packages/llm/llm-retry` | empty object | [E: packages/llm/llm-retry/src/index.ts:28] |
| `@deepseek-ai/dsh-token-meter` | `packages/llm/token-meter` | empty object | [E: packages/llm/token-meter/src/index.ts:103] |
| `@deepseek-ai/dsh-plugin-package-inventory-deepseek` | `packages/llm/plugin-package-inventory-deepseek` | object | [E: packages/llm/plugin-package-inventory-deepseek/src/index.ts:37] |
| `@deepseek-ai/dsh-mcp-client` | `packages/mcp/mcp-client` | union | [E: packages/mcp/mcp-client/src/index.ts:113] |
| `@deepseek-ai/dsh-agent-presets` | `packages/preset/agent-presets` | object | [E: packages/preset/agent-presets/src/index.ts:107] |
| `@deepseek-ai/dsh-persona` | `packages/preset/persona` | object | [E: packages/preset/persona/src/index.ts:49] |
| `@deepseek-ai/dsh-tool-present` | `packages/fs/tool-present` | object | [E: packages/fs/tool-present/src/index.ts:21] |
| `@deepseek-ai/dsh-api-workspace-files` | `packages/api/workspace-files` | object | [E: packages/api/workspace-files/src/index.ts:185] |
| `@deepseek-ai/dsh-host-open-in-app` | `packages/host/open-in-app` | object | [E: packages/host/open-in-app/src/index.ts:72] |
| `@deepseek-ai/dsh-sandbox-policy` | `packages/sandbox/sandbox-policy` | object | [E: packages/sandbox/sandbox-policy/src/index.ts:111] |
| `@deepseek-ai/dsh-sdk-jsonrpc-server` | `packages/sdk/server` | object | [E: packages/sdk/server/src/index.ts:36] |
| `@deepseek-ai/dsh-session-log-deepseek` | `packages/session/session-log-deepseek` | object | [E: packages/session/session-log-deepseek/src/index.ts:28] |
| `@deepseek-ai/dsh-session-log-export` | `packages/session-query/session-log-export` | object | [E: packages/session-query/session-log-export/src/index.ts:48] |
| `@deepseek-ai/dsh-settings-file` | `packages/settings/settings-file` | object | [E: packages/settings/settings-file/src/index.ts:107] |
| `@deepseek-ai/dsh-tool-pwsh-persistent` | `packages/shell/tool-pwsh-persistent` | object | [E: packages/shell/tool-pwsh-persistent/src/index.ts:484] |
| `@deepseek-ai/dsh-web-search-deepseek` | `packages/web/web-search-deepseek` | object | [E: packages/web/web-search-deepseek/src/index.ts:63] |
| `@deepseek-ai/dsh-webhook-github` | `packages/webhook/webhook-github` | object | [E: packages/webhook/webhook-github/src/index.ts:28] |

`@deepseek-ai/dsh-webhook`（`ctx.webhookRuntime`）**没有**插件 `Config`：规则由 adapter `register(rule)` 注入。`@deepseek-ai/dsh-acp-app` 的 `apply` 也不收 Config。[U: 其余大量 `packages/*/src/index.ts` 的 Config 行仍存在；本页正文按组列出已核顶层键，未逐行展开的包以源文件 `export const Config` / `static Config` 为准。]

## 实例表（按组）

一行 = 一个 schema 键路径。

### `acp`

#### `@deepseek-ai/dsh-acp`

| 键 | 类型 | 默认 | 含义 | 为什么 | 源 |
|---|---|---|---|---|---|
| `provider` | `Schema.string()` | — | 创建 agent 的 provider route | composition `config:` | [E: packages/acp/acp/src/index.ts:87] |
| `model` | `Schema.string()` | — | 创建 agent 的 model | composition `config:` | [E: packages/acp/acp/src/index.ts:88] |
| `sessionListPageSize` | `Schema.natural().min(1).default(...)` | `DEFAULT_SESSION_LIST_PAGE_SIZE` | ACP session 列表页大小 | 省略走 schema default | [E: packages/acp/acp/src/index.ts:89] |

### `attachment`

#### `@deepseek-ai/dsh-attachment-local`

| 键 | 默认要点 | 源 |
|---|---|---|
| `dshHome` | 省略则 `$DSH_HOME` / `~/.dsh` | [E: packages/attachment/attachment-local/src/index.ts:147] |
| `maxImageBytes` | schema default `DEFAULT_MAX_IMAGE_BYTES` | [E: packages/attachment/attachment-local/src/index.ts:147] |
| `maxImagesPerMessage` | `DEFAULT_MAX_IMAGES_PER_MESSAGE` | [E: packages/attachment/attachment-local/src/index.ts:147] |
| `maxMessageImageBytes` | `DEFAULT_MAX_MESSAGE_IMAGE_BYTES` | [E: packages/attachment/attachment-local/src/index.ts:148] |
| `maxImagePixels` | `DEFAULT_MAX_IMAGE_PIXELS` | [E: packages/attachment/attachment-local/src/index.ts:149] |
| `maxImageDimension` | `DEFAULT_MAX_IMAGE_DIMENSION` | [E: packages/attachment/attachment-local/src/index.ts:150] |
| `normalizedImageMaxPixels` | `DEFAULT_NORMALIZED_IMAGE_MAX_PIXELS` | [E: packages/attachment/attachment-local/src/index.ts:151] |
| `normalizedImageMaxDimension` | `DEFAULT_NORMALIZED_IMAGE_MAX_DIMENSION` | [E: packages/attachment/attachment-local/src/index.ts:152] |
| `normalizedImageMaxBytes` | `DEFAULT_NORMALIZED_IMAGE_MAX_BYTES` | [E: packages/attachment/attachment-local/src/index.ts:153] |
| `imageCompressionConcurrency` | `DEFAULT_IMAGE_COMPRESSION_CONCURRENCY` | [E: packages/attachment/attachment-local/src/index.ts:154] |

### `bundle`

#### `@deepseek-ai/dsh-headless`

| 键 | 类型 | 默认 | 含义 | 源 |
|---|---|---|---|---|
| `task` | `z.string().required()` | required | 单次 run 的 prompt | [E: packages/bundle/headless/src/index.ts:39] |

#### `@deepseek-ai/dsh-web-app`

| 键 | 默认 | 含义 | 源 |
|---|---|---|---|
| `openBrowser` | `true` | 启动后是否开浏览器（CLI `--no-open` 映射） | [E: packages/bundle/web-app/src/index.ts:61] |
| `printUrl` | `true` | 激活时是否打印 URL | [E: packages/bundle/web-app/src/index.ts:62] |
| `surfaceContext` | `true` | 是否登记 `app:web-surface` 与 `DSH_WEB_URL` | [E: packages/bundle/web-app/src/index.ts:63] |
| `trustedHosts` | `[]` | 本调用 `--trusted-host` | [E: packages/bundle/web-app/src/index.ts:64] |

#### `@deepseek-ai/dsh-sdk-app`

| 键 | 默认 | 含义 | 源 |
|---|---|---|---|
| `profile` | `'sdk'` | help 名 `dsh --profile ${profile}`（sdk 或 sdk-minimal） | [E: packages/bundle/sdk-app/src/index.ts:30] |

`dsh-acp-app` / `dsh-sdk-minimal` 作为 bundle 入口不声明插件 Config；ACP 启动 `apply` 无 config 参数。

### `client`

#### `@deepseek-ai/dsh-client-connection`

| 键 | 默认 | 含义 | 源 |
|---|---|---|---|
| `trustedHosts` | `[]` | 非 loopback Host 白名单 | [E: packages/client/connection/src/index.ts:87] |
| `cookieMaxAgeDays` | `30` | 浏览器 cookie 寿命 | [E: packages/client/connection/src/index.ts:87] |
| `maxRequestBodyBytes` | `DEFAULT_MAX_REQUEST_BODY_BYTES` | `/api` JSON body 上限 | [E: packages/client/connection/src/index.ts:90] |

### `compaction` / `context` / `core`

#### `@deepseek-ai/dsh-compaction-basic`

顶层：`thresholdRatio` / `retainRatio` / `retainTokens` / `summarizationProvider` / `summarizationModel` / `maxTokens` / `compactionRetries` / `maxOverflowRetries` / `modelPolicies` / `auto`。[E: packages/compaction/compaction-basic/src/index.ts:108]–[E: packages/compaction/compaction-basic/src/index.ts:117]

#### `@deepseek-ai/dsh-agent-instructions`

`dshHome` / `projectRootMarkers` / `maxBytes`（required）/ `maxSourceBytes` / `instructionFileCandidates` / `localInstructionFileCandidates`。[E: packages/context/agent-instructions/src/config.ts:39]

#### `@deepseek-ai/dsh-file-reference-local`

| 键 | 默认符号 | 源 |
|---|---|---|
| `maxResults` | `DEFAULT_FILE_SEARCH_MAX_RESULTS` | [E: packages/context/file-reference-local/src/index.ts:47] |
| `maxEntries` | `DEFAULT_FILE_SEARCH_MAX_ENTRIES` | [E: packages/context/file-reference-local/src/index.ts:48] |
| `excludedDirectories` | `DEFAULT_FILE_SEARCH_EXCLUDED_DIRECTORIES` | [E: packages/context/file-reference-local/src/index.ts:49] |

#### `@deepseek-ai/dsh-agent-default-model`

| 键 | 约束 | 源 |
|---|---|---|
| `provider` | `z.string().required()` | [E: packages/core/agent-default-model/src/index.ts:66] |
| `model` | `z.string().required()` | [E: packages/core/agent-default-model/src/index.ts:67] |

Settings 切片额外允许 `reasoningEffort`。[E: packages/core/agent-default-model/src/index.ts:37] base 组合写入 `deepseek-official` / `deepseek-flash`。[E: packages/bundle/base/cordis.patch.yml:78]

#### `@deepseek-ai/dsh-agent-loop`

| 键 | 默认 | 含义 | 源 |
|---|---|---|---|
| `maxParallelToolCalls` | `DEFAULT_MAX_PARALLEL_TOOL_CALLS` | 每 step 并行安全调用上限；用户 settings 可改 | [E: packages/core/agent-loop/src/index.ts:359] |
| `agents` | `[]` | boot 一次的声明式 agent 数组；**不进**用户 settings | [E: packages/core/agent-loop/src/index.ts:359] |
| `agents[].id` | required | 配置标签 | [E: packages/core/agent-loop/src/index.ts:359] |
| `agents[].sessionId` | 可选 | 新鲜会话精确 id | [E: packages/core/agent-loop/src/index.ts:360] |
| `agents[].provider` | 可选 | 路由 | [E: packages/core/agent-loop/src/index.ts:360] |
| `agents[].model` / `reasoningEffort` / `maxTokens` / `cwd` / `resumeSessionId` | 可选 | 模型、effort、token、cwd、resume | [E: packages/core/agent-loop/src/index.ts:363][E: packages/core/agent-loop/src/index.ts:366] |

#### `@deepseek-ai/dsh-agent-tool-presentation`

| 键 | 类型 | 默认 | 含义 | 源 |
|---|---|---|---|---|
| `mode` | `'native' \| 'ptc' \| 'both'` | required | preset 面 `presentAs`；ptc 预设写 `ptc` | [E: packages/core/agent-tool-presentation/src/index.ts:51] |

#### `@deepseek-ai/dsh-tools`（含 PTC 传输）

| 键 | 默认 | 含义 | 源 |
|---|---|---|---|
| `mode` | `'native'` | 部署默认呈现：`native` / `ptc` / `both` | [E: packages/core/tools/src/index.ts:784] |
| `maxParallelSubCalls` | `10` | `run_code` 子调用并行上限 | [E: packages/core/tools/src/index.ts:785] |

PTC 模型可见工具名仍是 `run_code`；权威实现 `packages/core/tools/src/ptc.ts`。

#### `@deepseek-ai/dsh-system-prompt`

| 键 | 默认 | 源 |
|---|---|---|
| `includeHarnessIdentity` | `true` | [E: packages/core/system-prompt/src/index.ts:401] |
| `includeRuntimeContext` | `true` | [E: packages/core/system-prompt/src/index.ts:402] |
| `personaPrefix` | `''` | [E: packages/core/system-prompt/src/index.ts:403] |
| `personaSuffix` | `''` | [E: packages/core/system-prompt/src/index.ts:404] |
| `toolOrder` | 省略保留 | [E: packages/core/system-prompt/src/index.ts:406] |

#### `@deepseek-ai/dsh-persona`

preset 行 schema，不是 host `system-prompt` 那两个键。

| 键 | 默认 | 源 |
|---|---|---|
| `prefix` | required | [E: packages/preset/persona/src/index.ts:50] |
| `suffix` | `''` | [E: packages/preset/persona/src/index.ts:51] |
| `complete` | `false` | [E: packages/preset/persona/src/index.ts:52] |
| `includeRuntimeContext` | `true` | [E: packages/preset/persona/src/index.ts:53] |

### `experimental`

#### `@deepseek-ai/dsh-experimental-agent-team`

| 键 | 默认常量 | 源 |
|---|---|---|
| `maxMembers` | `8` | [E: packages/experimental/agent-team/src/index.ts:63] |
| `maxTasks` | `256` | [E: packages/experimental/agent-team/src/index.ts:64] |
| `maxPendingMessagesPerMember` | `64` | [E: packages/experimental/agent-team/src/index.ts:65] |
| `maxMessageBytes` | `65536` | [E: packages/experimental/agent-team/src/index.ts:66] |
| `disposalTimeoutMs` | `5000` | [E: packages/experimental/agent-team/src/index.ts:67] |

opt-in，不在 `dsh-base` 除非 experimental profile。

#### `@deepseek-ai/dsh-experimental-tool-agent-team`

| 键 | 默认 | 源 |
|---|---|---|
| `freshProvider` | `'spawn'` | [E: packages/experimental/tool-agent-team/src/index.ts:26] |
| `forkProvider` | `'fork'` | [E: packages/experimental/tool-agent-team/src/index.ts:27] |

#### `@deepseek-ai/dsh-experimental-inspector`

顶层含 `host`（仅 `'127.0.0.1'`）、`port`（默认 `9230`）、`clientOrigins`、`captureFetch` 以及若干 journal/body 上限。[E: packages/experimental/inspector/src/index.ts:75]

### `host`

Host HTTP API 在三个 `packages/api/*-controller`，**没有**已删除的 `dsh-host-apiproxy` Config。

#### `@deepseek-ai/dsh-host-webserver`

| 键 | 约束 | 默认 | 源 |
|---|---|---|---|
| `host` | `'127.0.0.1' \| '0.0.0.0'` required | — | [E: packages/host/webserver/src/index.ts:126] |
| `port` | `z.natural().max(65535)` required | — | [E: packages/host/webserver/src/index.ts:127] |
| `compression` | `'none' \| 'gzip'` | `'none'` | [E: packages/host/webserver/src/index.ts:128] |
| `compressionLevel` | 0–9 | `1` | [E: packages/host/webserver/src/index.ts:129] |
| `compressionThresholdBytes` | natural | `1024` | [E: packages/host/webserver/src/index.ts:130] |

#### `@deepseek-ai/dsh-host-frontend-static`

| 键 | 约束 | 源 |
|---|---|---|
| `distIndex` | required 绝对 `index.html` | [E: packages/host/frontend-static/src/index.ts:36] |

#### `@deepseek-ai/dsh-host-directory-picker-browse`

| 键 | 默认 | 源 |
|---|---|---|
| `maxEntries` | `1000` | [E: packages/host/directory-picker-browse/src/index.ts:196] |

#### `@deepseek-ai/dsh-host-open-in-app`

无 Context merge。三个超时都是 1–600000 的 required 正整数（无 schema default）。

| 键 | 约束 | 源 |
|---|---|---|
| `probeTimeoutMs` | required 有界 ms | [E: packages/host/open-in-app/src/index.ts:73] |
| `iconTimeoutMs` | required 有界 ms | [E: packages/host/open-in-app/src/index.ts:74] |
| `launchWatchMs` | required 有界 ms | [E: packages/host/open-in-app/src/index.ts:75] |

#### `@deepseek-ai/dsh-api-workspace-files`

| 键 | 默认 | 源 |
|---|---|---|
| `maxBytes` | `2 * 1024 * 1024` | [E: packages/api/workspace-files/src/index.ts:186] |
| `maxFileBytes` | `32 * 1024 * 1024` | [E: packages/api/workspace-files/src/index.ts:187] |
| `maxLines` | `5000` | [E: packages/api/workspace-files/src/index.ts:188] |
| `maxEntries` | `2000` | [E: packages/api/workspace-files/src/index.ts:189] |

### `interaction` / `llm` / `mcp`

#### `@deepseek-ai/dsh-permission-presets`

`presets` 是 `z.dict`：每条 `sandbox` / `approval` required，可选 `name` / `description`；默认含 `workspace-write` 等。[E: packages/interaction/permission-presets/src/index.ts:165] 另有可选 `defaultPreset`。[E: packages/interaction/permission-presets/src/index.ts:181]

#### `@deepseek-ai/dsh-llm-deepseek`

| 键 | 要点 | 源 |
|---|---|---|
| `apiKeyEnv` | credential-ref，默认 `DEFAULT_API_KEY_ENV` | [E: packages/llm/llm-deepseek/src/index.ts:178] |
| `baseURL` | 可选；运行时另读 `DEEPSEEK_BASE_URL` | [E: packages/llm/llm-deepseek/src/index.ts:179] |
| `thinking` | `'enabled' \| 'disabled'` | [E: packages/llm/llm-deepseek/src/index.ts:180] |
| `reasoningEffort` | `'off' \| 'low' \| 'high' \| 'max'` | [E: packages/llm/llm-deepseek/src/index.ts:181] |
| `maxTokens` | default `DEFAULT_MAX_TOKENS` | [E: packages/llm/llm-deepseek/src/index.ts:182] |
| `defaultContextWindow` | `DEFAULT_CONTEXT_WINDOW` | [E: packages/llm/llm-deepseek/src/index.ts:183] |
| `models` | catalog 数组，`DEFAULT_MODELS` | [E: packages/llm/llm-deepseek/src/index.ts:184] |
| `streamIdleTimeoutMs` / Files API / image offload 一串 | 均有 schema default | [E: packages/llm/llm-deepseek/src/index.ts:184] |
| `retryPolicy` | `RetryPolicySchema` | [E: packages/llm/llm-deepseek/src/index.ts:196] |

#### `@deepseek-ai/dsh-llm-pi-ai`

`export const Config` 在 `packages/llm/llm-pi-ai/src/config.ts:340`：多 profile / adapter 路由表（键很多）；始终加载，零 route 直到 Settings 加 profile。

#### `@deepseek-ai/dsh-llm-retry` / `@deepseek-ai/dsh-token-meter`

空 object：retry 由各 provider 的 `retryPolicy` 拥有；token-meter 拒绝任何键。[E: packages/llm/llm-retry/src/index.ts:28][E: packages/llm/token-meter/src/index.ts:103]

#### `@deepseek-ai/dsh-plugin-package-inventory-deepseek`

| 键 | 默认 | 源 |
|---|---|---|
| `enabled` | `true` | [E: packages/llm/plugin-package-inventory-deepseek/src/index.ts:38] |

#### `@deepseek-ai/dsh-mcp-client`

union：`transport: 'stdio'` 需要 `command`；`transport: 'streamable-http'` 需要 `url`。共享 `serverName` / `toolCallTimeoutMs` / `failOnStartupError` / `reconnect`。[E: packages/mcp/mcp-client/src/index.ts:113]

### `preset` / `sandbox` / `sdk`

#### `@deepseek-ai/dsh-agent-presets`

| 键 | 默认 | 含义 | 源 |
|---|---|---|---|
| `default` | required | 未点名 preset 时挂哪一个（web 组合写 `standard`） | [E: packages/preset/agent-presets/src/index.ts:108] |
| `roots[]` | `[]` | 额外扫描根；`path` required，`trust` 默认 `'user'` | [E: packages/preset/agent-presets/src/index.ts:109] |
| `includeShippedRoot` | `true` | 是否扫 `SHIPPED_PRESET_ROOT` | [E: packages/preset/agent-presets/src/index.ts:113] |
| `includeUserRoot` | `true` | 是否扫 `$DSH_HOME/.agent-presets` | [E: packages/preset/agent-presets/src/index.ts:114] |

用户 settings 可改 `default` 与 `modeSelectionEnabled`。[E: packages/preset/agent-presets/src/index.ts:73][E: packages/preset/agent-presets/src/index.ts:75]

#### `@deepseek-ai/dsh-sandbox-policy`

| 键 | 默认 | 源 |
|---|---|---|
| `mode` | `'read-only'` | [E: packages/sandbox/sandbox-policy/src/index.ts:112] |
| `workspaceRoot` | 无 schema default；构造器落到 `process.cwd()` | [E: packages/sandbox/sandbox-policy/src/index.ts:115] |

#### `@deepseek-ai/dsh-sdk-jsonrpc-server`

| 键 | 默认 | 源 |
|---|---|---|
| `maxTokensAsSuccess` | `false` | [E: packages/sdk/server/src/index.ts:37] |

### `fs` / `session` / `settings` / `shell` / `web` / `webhook`

#### `@deepseek-ai/dsh-tool-present`

| 键 | 默认 | 含义 | 源 |
|---|---|---|---|
| `maxFiles` | `8` | 一次 `present` 最多几个文件 | [E: packages/fs/tool-present/src/index.ts:22] |

#### `@deepseek-ai/dsh-session-log-deepseek`

| 键 | 默认 | 含义 | 源 |
|---|---|---|---|
| `enabled` | `false` | 是否向官方请求贡献 `dsh_session_log` | [E: packages/session/session-log-deepseek/src/index.ts:30] |

#### `@deepseek-ai/dsh-session-log-export`

| 键 | 默认 | 源 |
|---|---|---|
| `compressionLevel` | `DEFAULT_SESSION_LOG_COMPRESSION_LEVEL`（0–9） | [E: packages/session-query/session-log-export/src/index.ts:52] |

#### `@deepseek-ai/dsh-settings-file`

| 键 | 默认 | 源 |
|---|---|---|
| `path` | 省略 | [E: packages/settings/settings-file/src/index.ts:108] |
| `dshHome` | 省略 | [E: packages/settings/settings-file/src/index.ts:109] |
| `watch` | `true` | [E: packages/settings/settings-file/src/index.ts:110] |
| `debounceMs` | `100` | [E: packages/settings/settings-file/src/index.ts:111] |

#### `@deepseek-ai/dsh-tool-pwsh-persistent`

模型可见名是 `pwsh`（不是 `pwsh-persistent`）。对标 `tool-bash-persistent`。

| 键 | 默认 | 源 |
|---|---|---|
| `backendType` | `'shell'` | [E: packages/shell/tool-pwsh-persistent/src/index.ts:485] |
| `timeoutMs` | `300_000` | [E: packages/shell/tool-pwsh-persistent/src/index.ts:486] |
| `maxOutputChars` | `16_000` | [E: packages/shell/tool-pwsh-persistent/src/index.ts:487] |
| `description` | `DEFAULT_DESCRIPTION` | [E: packages/shell/tool-pwsh-persistent/src/index.ts:488] |

#### `@deepseek-ai/dsh-web-search-deepseek`

| 键 | 要点 | 源 |
|---|---|---|
| `apiKey` | secret | [E: packages/web/web-search-deepseek/src/index.ts:64] |
| `apiKeyEnv` | credential-ref | [E: packages/web/web-search-deepseek/src/index.ts:65] |
| `baseURL` | 可选；回退 `DEEPSEEK_SEARCH_BASE_URL` | [E: packages/web/web-search-deepseek/src/index.ts:69] |
| `model` / `apiVersion` / `maxTokens` / `maxUses` | schema default | [E: packages/web/web-search-deepseek/src/index.ts:70] |

#### `@deepseek-ai/dsh-webhook-github`

| 键 | 约束 | 源 |
|---|---|---|
| `source` | required 非空 trimmed | [E: packages/webhook/webhook-github/src/index.ts:29] |
| `path` | schema 是 required string；`assertConfig` 要求绝对非根 pathname | [E: packages/webhook/webhook-github/src/index.ts:30][E: packages/webhook/webhook-github/src/index.ts:40] |
| `secretEnv` | credential-ref required | [E: packages/webhook/webhook-github/src/index.ts:31] |
| `maxBodyBytes` | required 正整数 | [E: packages/webhook/webhook-github/src/index.ts:32] |

### 其余仍有 `Config` 的产品包

下列包在 `c291e7961a` 仍声明 `export const Config` / `static Config`；键以各文件 schema 为准（本页未逐字段抄默认值，避免把过期行号当 [E]）：

`client/hmr`、`code-runtime-worker-thread`、`experimental/code-runtime-python`（`PythonCodeRuntime.static Config`：`cpuSeconds` / `maxWallMs` / `addressSpaceMb` / `maxLogBytes` / `maxValueBytes` / `graceMs` / `pythonBin`）、`compaction-tool-result-pruner`、`session-reference`、`time-context`、`tmux-context`、`credentials-local`、`e2b`、`subprocess-e2b`、`cordis-host-runner`、`message-feedback`、`fs-local`、`tool-fs`、`tool-fs-search`、`tool-str-replace-editor`、`goal`、`tool-goal`、`repeat-tool-reminder`、`hooks-claude-code`、`hooks-codex`、`user-approval`、`jobs-local`、`tool-jobs`、`lsp-stdio`、`tool-lsp`、`persona`、`invariants`、`sandbox-local`、`session-persistence-jsonl`（`root` required + `compression`）、`session-projection-cache`、`session-telemetry-otel`、`session-title`、`session-title-all-prompts-llm`、`session-title-first-prompt-llm`、`session-query-sqlite`、`tool-session-query`、`bash-local`、`pwsh-local`、`shell-env`、`tool-bash`、`tool-bash-persistent`、`tool-pwsh`、`skill`、`skill-filesystem`、`tool-skill`、`spill-local`、`spill-policy`、`storage-domain`、`storage-json`、`storage-sqlite`、`subagent-acp`、`subagent-claude-code`、`subagent-codex`、`subagent-dsh-sdk`、`subagent-fork-in-process`、`subagent-spawn-in-process`、`tool-subagent`、`terminal-bash`、`tool-terminal`、`tool-todo`、`typert-loader`、`tool-web`、`web`、`web-fetch-http`、`web-search-exa`、`web-search-perplexity`、`tool-ralph`、`tool-workflow`、`workflow-worker-thread`。

`@deepseek-ai/dsh-http-proxy` **没有**插件 `Config`（库，不是 Cordis 行）。`dsh-client-file-upload` / `dsh-session-format*` 也不是 schemastery Config 插件。

## Sources

- `packages/settings/settings/src/index.ts`
- `packages/settings/settings-file/src/index.ts`
- `packages/llm/llm/src/retry-policy.ts`
- `packages/preset/agent-presets/src/index.ts`
- `packages/preset/agent-presets/src/discovery.ts`
- `packages/boot/app-boot/src/profile.ts`
- `packages/core/agent-loop/src/index.ts`
- `packages/core/agent-default-model/src/index.ts`
- `packages/core/agent-tool-presentation/src/index.ts`
- `packages/core/tools/src/index.ts`
- `packages/core/system-prompt/src/index.ts`
- `packages/acp/acp/src/index.ts`
- `packages/attachment/attachment-local/src/index.ts`
- `packages/bundle/headless/src/index.ts`
- `packages/bundle/web-app/src/index.ts`
- `packages/bundle/sdk-app/src/index.ts`
- `packages/client/connection/src/index.ts`
- `packages/client/ui-theme/src/theme-settings.ts`
- `packages/client/locale/src/locale-settings.ts`
- `packages/client/ui-conversation/src/submission-settings.ts`
- `packages/client/ui-settings-general/src/index.ts`
- `packages/compaction/compaction-basic/src/index.ts`
- `packages/context/agent-instructions/src/config.ts`
- `packages/context/file-reference-local/src/index.ts`
- `packages/experimental/agent-team/src/index.ts`
- `packages/experimental/tool-agent-team/src/index.ts`
- `packages/experimental/inspector/src/index.ts`
- `packages/host/webserver/src/index.ts`
- `packages/host/frontend-static/src/index.ts`
- `packages/host/directory-picker-browse/src/index.ts`
- `packages/host/open-in-app/src/index.ts`
- `packages/api/workspace-files/src/index.ts`
- `packages/fs/tool-present/src/index.ts`
- `packages/preset/persona/src/index.ts`
- `packages/bundle/base/cordis.patch.yml`
- `packages/interaction/permission-presets/src/index.ts`
- `packages/llm/llm-deepseek/src/index.ts`
- `packages/llm/llm-pi-ai/src/config.ts`
- `packages/llm/llm-retry/src/index.ts`
- `packages/llm/token-meter/src/index.ts`
- `packages/llm/plugin-package-inventory-deepseek/src/index.ts`
- `packages/mcp/mcp-client/src/index.ts`
- `packages/sandbox/sandbox-policy/src/index.ts`
- `packages/sdk/server/src/index.ts`
- `packages/session/session-log-deepseek/src/index.ts`
- `packages/session-query/session-log-export/src/index.ts`
- `packages/shell/tool-pwsh-persistent/src/index.ts`
- `packages/web/web-search-deepseek/src/index.ts`
- `packages/webhook/webhook-github/src/index.ts`
- `apps/cli/src/args.ts`

## 相关

- [`subsys.persistence.settings`](../subsystems/persistence/settings.md) — settings 分层与 redact
- [`surface.config.settings`](../surface/config/settings.md) — 用户文档面
- [`spine.composition-boot`](../spine/composition-boot.md) — profile / bundle 叠层
- [`ref.presets`](presets.md) — shipped preset / profile / bundle
- [`ref.env-vars`](env-vars.md) — `DSH_HOME` / `DEEPSEEK_*`
