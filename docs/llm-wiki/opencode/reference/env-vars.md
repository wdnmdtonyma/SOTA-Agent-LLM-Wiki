---
id: ref.env-vars
title: Env var / feature flag catalog(~80)
kind: reference
tier: T3
v: shared
source:
  - packages/core/src/flag/flag.ts
  - packages/opencode/src/effect/runtime-flags.ts
  - packages/core/src/database/database.ts
  - packages/core/src/database/migration.ts
  - packages/core/src/plugin/provider/
  - packages/opencode/src/provider/provider.ts
  - packages/core/src/pty.ts
  - packages/core/src/shell.ts
status: verified
symbols:
  - Flag
  - RuntimeFlags
  - OPENCODE_EXPERIMENTAL
evidence: explicit
updated: 355a0bcf5
---

> 这份节点是 env var 与 feature flag 的 catalog；它覆盖 core `Flag.*`、V1 runtime flags、loader/database env、provider env 与 GitHub automation env。

## 能回答的问题

- `OPENCODE_EXPERIMENTAL` 是如何作为伞形开关影响特定 experimental flag 的？
- 哪些 env 只属于 V1 runtime，哪些被 V2 core `Flag` 读取？
- DB、config、server auth、models.dev、provider credentials 各自读取哪些变量？
- `OPENCODE_EXPERIMENTAL_NATIVE_LLM` 的含义是什么？

## 解析规则

core `truthy(key)` 只把 env 值 `"true"` 或 `"1"` 识别为 true，且比较前会转小写。[E: packages/core/src/flag/flag.ts:4][E: packages/core/src/flag/flag.ts:5] core `enabledByExperimental(key)` 在特定 env 未设置时回退到 `OPENCODE_EXPERIMENTAL`，特定 env 设置后只读特定 env。[E: packages/core/src/flag/flag.ts:12]

V1 runtime flags 也有独立的 `bool`、`positiveInteger` 与 `enabledByExperimental`；其中 `experimental` 常量读取 `OPENCODE_EXPERIMENTAL`，多个 `experimental*` flag 会使用这把伞。[E: packages/opencode/src/effect/runtime-flags.ts:4][E: packages/opencode/src/effect/runtime-flags.ts:5][E: packages/opencode/src/effect/runtime-flags.ts:10][E: packages/opencode/src/effect/runtime-flags.ts:13]

## V2/core Flag catalog

| Env | Shape | 用途 | Evidence |
|---|---|---|---|
| `OPENCODE_AUTO_HEAP_SNAPSHOT` | truthy | 自动 heap snapshot 开关。 | [E: packages/core/src/flag/flag.ts:19] |
| `OPENCODE_GIT_BASH_PATH` | string | Windows/git bash path override。 | [E: packages/core/src/flag/flag.ts:20] |
| `OPENCODE_CONFIG` | string | 显式 config file path。 | [E: packages/core/src/flag/flag.ts:21] |
| `OPENCODE_CONFIG_CONTENT` | string | 直接提供 config JSON/YAML 内容。 | [E: packages/core/src/flag/flag.ts:22] |
| `OPENCODE_DISABLE_AUTOUPDATE` | truthy | 禁用 auto update。 | [E: packages/core/src/flag/flag.ts:23] |
| `OPENCODE_ALWAYS_NOTIFY_UPDATE` | truthy | 强制 update notification。 | [E: packages/core/src/flag/flag.ts:24] |
| `OPENCODE_DISABLE_PRUNE` | truthy | 禁用 prune。 | [E: packages/core/src/flag/flag.ts:25] |
| `OPENCODE_DISABLE_TERMINAL_TITLE` | truthy | 禁用 terminal title。 | [E: packages/core/src/flag/flag.ts:26] |
| `OPENCODE_SHOW_TTFD` | truthy | 显示 first delta timing。 | [E: packages/core/src/flag/flag.ts:27] |
| `OPENCODE_DISABLE_AUTOCOMPACT` | truthy | 禁用 auto compaction。 | [E: packages/core/src/flag/flag.ts:28] |
| `OPENCODE_DISABLE_MODELS_FETCH` | truthy | 禁用 models.dev fetch。 | [E: packages/core/src/flag/flag.ts:29] |
| `OPENCODE_DISABLE_MOUSE` | truthy | 禁用 TUI mouse。 | [E: packages/core/src/flag/flag.ts:30] |
| `OPENCODE_FAKE_VCS` | string | fake VCS 类型。 | [E: packages/core/src/flag/flag.ts:31] |
| `OPENCODE_SERVER_PASSWORD` | string | server basic auth password。 | [E: packages/core/src/flag/flag.ts:32] |
| `OPENCODE_SERVER_USERNAME` | string | server basic auth username。 | [E: packages/core/src/flag/flag.ts:33] |
| `OPENCODE_DISABLE_FFF` | truthy / Windows default true | 禁用 fff search layer。 | [E: packages/core/src/flag/flag.ts:34] |
| `OPENCODE_EXPERIMENTAL_FILEWATCHER` | Effect boolean | 启用 experimental file watcher。 | [E: packages/core/src/flag/flag.ts:37] |
| `OPENCODE_EXPERIMENTAL_DISABLE_FILEWATCHER` | Effect boolean | 禁用 file watcher。 | [E: packages/core/src/flag/flag.ts:40] |
| `OPENCODE_EXPERIMENTAL_DISABLE_COPY_ON_SELECT` | truthy / Windows default true | 禁用 copy-on-select。 | [E: packages/core/src/flag/flag.ts:44] |
| `OPENCODE_MODELS_URL` | string | models.dev URL override。 | [E: packages/core/src/flag/flag.ts:45] |
| `OPENCODE_MODELS_PATH` | string | local models file path。 | [E: packages/core/src/flag/flag.ts:46] |
| `OPENCODE_DB` | string | SQLite path or `:memory:`。 | [E: packages/core/src/flag/flag.ts:47][E: packages/core/src/database/database.ts:45] |
| `OPENCODE_WORKSPACE_ID` | string | workspace routing/fencing。 | [E: packages/core/src/flag/flag.ts:49] |
| `OPENCODE_EXPERIMENTAL_WORKSPACES` | experimental truthy | workspaces feature。 | [E: packages/core/src/flag/flag.ts:50] |
| `OPENCODE_DISABLE_PROJECT_CONFIG` | dynamic truthy | 禁用 project config/instructions。 | [E: packages/core/src/flag/flag.ts:55] |
| `OPENCODE_EXPERIMENTAL_REFERENCES` | experimental truthy | references feature。 | [E: packages/core/src/flag/flag.ts:58] |
| `OPENCODE_TUI_CONFIG` | string | TUI config override。 | [E: packages/core/src/flag/flag.ts:61] |
| `OPENCODE_CONFIG_DIR` | string | config directory override。 | [E: packages/core/src/flag/flag.ts:64] |
| `OPENCODE_PURE` | truthy | pure mode。 | [E: packages/core/src/flag/flag.ts:67] |
| `OPENCODE_PERMISSION` | string | permission behavior override。 | [E: packages/core/src/flag/flag.ts:70] |
| `OPENCODE_PLUGIN_META_FILE` | string | plugin metadata file override。 | [E: packages/core/src/flag/flag.ts:73] |
| `OPENCODE_CLIENT` | string default `cli` | client identity/user-agent。 | [E: packages/core/src/flag/flag.ts:76][E: packages/core/src/models-dev.ts:17] |

## V1 runtime flags

| Runtime flag field | Env | Shape | Evidence |
|---|---|---|---|
| `autoShare` | `OPENCODE_AUTO_SHARE` | bool | [E: packages/opencode/src/effect/runtime-flags.ts:17] |
| `pure` | `OPENCODE_PURE` | bool | [E: packages/opencode/src/effect/runtime-flags.ts:18] |
| `disableDefaultPlugins` | `OPENCODE_DISABLE_DEFAULT_PLUGINS` | bool | [E: packages/opencode/src/effect/runtime-flags.ts:19] |
| `disableEmbeddedWebUi` | `OPENCODE_DISABLE_EMBEDDED_WEB_UI` | bool | [E: packages/opencode/src/effect/runtime-flags.ts:20] |
| `disableExternalSkills` | `OPENCODE_DISABLE_EXTERNAL_SKILLS` | bool | [E: packages/opencode/src/effect/runtime-flags.ts:21] |
| `disableLspDownload` | `OPENCODE_DISABLE_LSP_DOWNLOAD` | bool | [E: packages/opencode/src/effect/runtime-flags.ts:22] |
| `disableClaudeCodePrompt.broad` | `OPENCODE_DISABLE_CLAUDE_CODE` | bool | [E: packages/opencode/src/effect/runtime-flags.ts:24] |
| `disableClaudeCodePrompt.direct` | `OPENCODE_DISABLE_CLAUDE_CODE_PROMPT` | bool | [E: packages/opencode/src/effect/runtime-flags.ts:25] |
| `disableClaudeCodeSkills.broad` | `OPENCODE_DISABLE_CLAUDE_CODE` | bool | [E: packages/opencode/src/effect/runtime-flags.ts:28] |
| `disableClaudeCodeSkills.direct` | `OPENCODE_DISABLE_CLAUDE_CODE_SKILLS` | bool | [E: packages/opencode/src/effect/runtime-flags.ts:29] |
| `enableExa.enabled` | `OPENCODE_ENABLE_EXA` | bool | [E: packages/opencode/src/effect/runtime-flags.ts:33] |
| `enableExa.legacy` | `OPENCODE_EXPERIMENTAL_EXA` | bool | [E: packages/opencode/src/effect/runtime-flags.ts:34] |
| `enableParallel.enabled` | `OPENCODE_ENABLE_PARALLEL` | bool | [E: packages/opencode/src/effect/runtime-flags.ts:37] |
| `enableParallel.legacy` | `OPENCODE_EXPERIMENTAL_PARALLEL` | bool | [E: packages/opencode/src/effect/runtime-flags.ts:38] |
| `enableExperimentalModels` | `OPENCODE_ENABLE_EXPERIMENTAL_MODELS` | bool | [E: packages/opencode/src/effect/runtime-flags.ts:40] |
| `enableQuestionTool` | `OPENCODE_ENABLE_QUESTION_TOOL` | bool | [E: packages/opencode/src/effect/runtime-flags.ts:41] |
| `experimentalReferences` | `OPENCODE_EXPERIMENTAL_REFERENCES` | experimental truthy | [E: packages/opencode/src/effect/runtime-flags.ts:42] |
| `experimentalBackgroundSubagents` | `OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS` | experimental truthy | [E: packages/opencode/src/effect/runtime-flags.ts:43] |
| `experimentalLspTy` | `OPENCODE_EXPERIMENTAL_LSP_TY` | bool | [E: packages/opencode/src/effect/runtime-flags.ts:44] |
| `experimentalLspTool` | `OPENCODE_EXPERIMENTAL_LSP_TOOL` | experimental truthy | [E: packages/opencode/src/effect/runtime-flags.ts:45] |
| `experimentalOxfmt` | `OPENCODE_EXPERIMENTAL_OXFMT` | experimental truthy | [E: packages/opencode/src/effect/runtime-flags.ts:46] |
| `experimentalPlanMode` | `OPENCODE_EXPERIMENTAL_PLAN_MODE` | experimental truthy | [E: packages/opencode/src/effect/runtime-flags.ts:47] |
| `experimentalEventSystem` | `OPENCODE_EXPERIMENTAL_EVENT_SYSTEM` | experimental truthy | [E: packages/opencode/src/effect/runtime-flags.ts:48] |
| `experimentalWorkspaces` | `OPENCODE_EXPERIMENTAL_WORKSPACES` | experimental truthy | [E: packages/opencode/src/effect/runtime-flags.ts:49] |
| `experimentalIconDiscovery` | `OPENCODE_EXPERIMENTAL_ICON_DISCOVERY` | experimental truthy | [E: packages/opencode/src/effect/runtime-flags.ts:50] |
| `outputTokenMax` | `OPENCODE_EXPERIMENTAL_OUTPUT_TOKEN_MAX` | positive integer | [E: packages/opencode/src/effect/runtime-flags.ts:51] |
| `bashDefaultTimeoutMs` | `OPENCODE_EXPERIMENTAL_BASH_DEFAULT_TIMEOUT_MS` | positive integer | [E: packages/opencode/src/effect/runtime-flags.ts:52] |
| `experimentalNativeLlm` | `OPENCODE_EXPERIMENTAL_NATIVE_LLM` | bool | [E: packages/opencode/src/effect/runtime-flags.ts:53] |
| `experimentalWebSockets` | `OPENCODE_EXPERIMENTAL_WEBSOCKETS` | bool | [E: packages/opencode/src/effect/runtime-flags.ts:54] |
| `client` | `OPENCODE_CLIENT` | string default `cli` | [E: packages/opencode/src/effect/runtime-flags.ts:55] |

`OPENCODE_EXPERIMENTAL_NATIVE_LLM` 是 V1 可选 native LLM seam 的开关；V2 则把 `packages/llm` 作为原生 provider 协议引擎使用。[I]

## Loader, DB, server, models

本节若同一个 env 被 V1 与 V2 双读，会在用途中显式标注 `V1` / `V2`，避免把迁移期的两个执行路径混成一个 runtime 行为。

| Env | 用途 | Evidence |
|---|---|---|
| `OPENCODE_TEST_HOME` | core global home override。 | [E: packages/core/src/global.ts:19] |
| `OPENCODE_DISABLE_CHANNEL_DB` | 禁用 channel DB 条件之一。 | [E: packages/core/src/database/database.ts:50] |
| `OPENCODE_SKIP_MIGRATIONS` | 跳过 migration `up()`。 | [E: packages/core/src/database/migration.ts:51] |
| `OPENCODE_MODELS_DEV` | bundler/global models.dev injection。 | [E: packages/core/src/models-dev.ts:118][E: packages/core/src/models-dev.ts:181] |
| `OPENCODE_LOG_LEVEL` | logging level。 | [E: packages/core/src/observability/logging.ts:57] |
| `OPENCODE_PRINT_LOGS` | 打印 stderr logs。 | [E: packages/core/src/observability/logging.ts:68] |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OTLP endpoint flag。 | [E: packages/core/src/flag/flag.ts:16] |
| `OTEL_EXPORTER_OTLP_HEADERS` | OTLP headers flag。 | [E: packages/core/src/flag/flag.ts:17] |
| `OTEL_RESOURCE_ATTRIBUTES` | OTLP resource attributes。 | [E: packages/core/src/observability/otlp.ts:21] |
| `OPENCODE_AUTH_CONTENT` | V1 auth JSON injection。 | [E: packages/opencode/src/auth/index.ts:59][E: packages/opencode/src/auth/index.ts:61] |
| `OPENCODE_DISABLE_SHARE` | disables share-next when `true` or `1`。 | [E: packages/opencode/src/share/share-next.ts:23] |
| `OPENCODE_REPO_CLONE_GITHUB_BASE_URL` | V2 core repository clone URL base override；V1 util repository 也读取同名 override。 | [E: packages/core/src/repository.ts:169][E: packages/opencode/src/util/repository.ts:100] |
| `OPENCODE_ACP_PROFILE` | ACP profiling flag。 | [E: packages/opencode/src/acp/profile.ts:1] |
| `OPENCODE_TERMINAL` | spawned terminal marker。 | [E: packages/core/src/pty.ts:204] |
| `OPENCODE_CALLER` | VS Code caller detection。 | [E: packages/opencode/src/ide/index.ts:40] |
| `OPENCODE_WEBSEARCH_PROVIDER` | V2 WebSearch tool 与 V1 websearch tool 都读取同名 provider override。 | [E: packages/core/src/tool/websearch.ts:72][E: packages/opencode/src/tool/websearch.ts:31] |
| `OPENCODE_LIBC` | watcher native library selection。 | [E: packages/core/src/filesystem/watcher.ts:18][E: packages/core/src/filesystem/watcher.ts:34] |
| `COMSPEC` | V2 Bash tool 与 core shell helper 的 Windows shell fallback。 | [E: packages/core/src/tool/bash.ts:51][E: packages/core/src/shell.ts:101] |
| `SHELL` | preferred shell on non-Windows path. | [E: packages/core/src/shell.ts:207] |
| `PATH` / `Path` | executable lookup path. | [E: packages/core/src/util/which.ts:6] |
| `PATHEXT` / `PathExt` | Windows executable extension lookup. | [E: packages/core/src/util/which.ts:11] |
| `TERM`, `TERM_PROGRAM`, `TERM_PROGRAM_VERSION` | V1 yargs debug command terminal metadata。 | [E: packages/opencode/src/cli/cmd/debug/index.ts:56][E: packages/opencode/src/cli/cmd/debug/index.ts:57][E: packages/opencode/src/cli/cmd/debug/index.ts:59] |
| `DOTNET_CLI_HOME` | LSP server environment fallback。 | [E: packages/opencode/src/lsp/server.ts:779] |
| `VSCODE_EXTENSIONS` | LSP server VS Code extension path input。 | [E: packages/opencode/src/lsp/server.ts:789] |
| `http_proxy` / `https_proxy` / `all_proxy` / `no_proxy` | V1 proxy helper reads lowercase and uppercase forms through `env()` helper。 | [E: packages/opencode/src/util/proxy-env.ts:68][E: packages/opencode/src/util/proxy-env.ts:69] |

## Provider and integration env

Provider env rows likewise mark V1/V2 when a variable is consumed by both the V2 core provider/tool stack and the V1 opencode package stack.

| Env | Provider/integration | Evidence |
|---|---|---|
| `AWS_PROFILE` | Bedrock profile. | [E: packages/core/src/plugin/provider/amazon-bedrock.ts:83] |
| `AWS_REGION` | Bedrock region fallback. | [E: packages/core/src/plugin/provider/amazon-bedrock.ts:84] |
| `AWS_BEARER_TOKEN_BEDROCK` | Bedrock bearer token. | [E: packages/core/src/plugin/provider/amazon-bedrock.ts:86] |
| `AWS_CONTAINER_CREDENTIALS_RELATIVE_URI` | AWS container credentials. | [E: packages/core/src/plugin/provider/amazon-bedrock.ts:90] |
| `AWS_CONTAINER_CREDENTIALS_FULL_URI` | AWS container credentials. | [E: packages/core/src/plugin/provider/amazon-bedrock.ts:90] |
| `AWS_ACCESS_KEY_ID` | V1 provider AWS credential path. | [E: packages/opencode/src/provider/provider.ts:296] |
| `AWS_WEB_IDENTITY_TOKEN_FILE` | V1 provider AWS OIDC credential path. | [E: packages/opencode/src/provider/provider.ts:311] |
| `AZURE_RESOURCE_NAME` | Azure resource name. | [E: packages/core/src/plugin/provider/azure.ts:23] |
| `AZURE_COGNITIVE_SERVICES_RESOURCE_NAME` | Azure Cognitive Services resource. | [E: packages/core/src/plugin/provider/azure.ts:59] |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account. | [E: packages/core/src/plugin/provider/cloudflare-ai-gateway.ts:47][E: packages/core/src/plugin/provider/cloudflare-workers-ai.ts:46] |
| `CLOUDFLARE_GATEWAY_ID` | Cloudflare AI Gateway id. | [E: packages/core/src/plugin/provider/cloudflare-ai-gateway.ts:51] |
| `CLOUDFLARE_API_TOKEN` | Cloudflare AI Gateway token. | [E: packages/core/src/plugin/provider/cloudflare-ai-gateway.ts:52] |
| `CF_AIG_TOKEN` | Cloudflare AI Gateway token alias. | [E: packages/core/src/plugin/provider/cloudflare-ai-gateway.ts:52] |
| `CLOUDFLARE_API_KEY` | Cloudflare Workers AI key. | [E: packages/core/src/plugin/provider/cloudflare-workers-ai.ts:61] |
| `EXA_API_KEY` | V2 WebSearch Exa key；V1 MCP websearch Exa key。 | [E: packages/core/src/tool/websearch.ts:77][E: packages/opencode/src/tool/mcp-websearch.ts:4] |
| `PARALLEL_API_KEY` | V2 WebSearch Parallel key；V1 websearch Parallel key。 | [E: packages/core/src/tool/websearch.ts:78][E: packages/opencode/src/tool/websearch.ts:56] |
| `GITLAB_INSTANCE_URL` | GitLab provider instance URL. | [E: packages/core/src/plugin/provider/gitlab.ts:19] |
| `GITLAB_TOKEN` | GitLab provider token. | [E: packages/core/src/plugin/provider/gitlab.ts:20] |
| `GOOGLE_VERTEX_PROJECT` | Vertex project. | [E: packages/core/src/plugin/provider/google-vertex.ts:10] |
| `GOOGLE_CLOUD_PROJECT` | Vertex/project fallback. | [E: packages/core/src/plugin/provider/google-vertex.ts:11] |
| `GCP_PROJECT` | Vertex/project fallback. | [E: packages/core/src/plugin/provider/google-vertex.ts:12] |
| `GCLOUD_PROJECT` | Vertex/project fallback. | [E: packages/core/src/plugin/provider/google-vertex.ts:13] |
| `GOOGLE_VERTEX_LOCATION` | Vertex location. | [E: packages/core/src/plugin/provider/google-vertex.ts:20] |
| `GOOGLE_CLOUD_LOCATION` | Vertex location fallback. | [E: packages/core/src/plugin/provider/google-vertex.ts:21] |
| `VERTEX_LOCATION` | Vertex location fallback. | [E: packages/core/src/plugin/provider/google-vertex.ts:22] |
| `OPENCODE_API_KEY` | opencode provider API key. | [E: packages/core/src/plugin/provider/opencode.ts:14] |
| `AICORE_SERVICE_KEY` | SAP AI Core service key. | [E: packages/core/src/plugin/provider/sap-ai-core.ts:15] |
| `AICORE_DEPLOYMENT_ID` | SAP AI Core deployment id. | [E: packages/core/src/plugin/provider/sap-ai-core.ts:34] |
| `AICORE_RESOURCE_GROUP` | SAP AI Core resource group. | [E: packages/core/src/plugin/provider/sap-ai-core.ts:34] |
| `SNOWFLAKE_CORTEX_PAT` | Snowflake Cortex PAT. | [E: packages/core/src/plugin/provider/snowflake-cortex.ts:74] |
| `SNOWFLAKE_ACCOUNT` | V1 Snowflake account. | [E: packages/opencode/src/provider/provider.ts:854] |

## GitHub automation env

| Env | 用途 | Evidence |
|---|---|---|
| `VARIANT` | GitHub command variant input. | [E: packages/opencode/src/cli/cmd/github.handler.ts:406] |
| `GITHUB_TOKEN` | GitHub API token when `use_github_token` is enabled. | [E: packages/opencode/src/cli/cmd/github.handler.ts:470][E: packages/opencode/src/cli/cmd/github.handler.ts:471] |
| `MODEL` | GitHub automation model input. | [E: packages/opencode/src/cli/cmd/github.handler.ts:656] |
| `GITHUB_RUN_ID` | GitHub run id. | [E: packages/opencode/src/cli/cmd/github.handler.ts:667] |
| `SHARE` | GitHub automation share input. | [E: packages/opencode/src/cli/cmd/github.handler.ts:673] |
| `USE_GITHUB_TOKEN` | GitHub token mode input. | [E: packages/opencode/src/cli/cmd/github.handler.ts:681] |
| `OIDC_BASE_URL` | GitHub OIDC base URL input. | [E: packages/opencode/src/cli/cmd/github.handler.ts:689] |
| `PROMPT` | GitHub automation custom prompt. | [E: packages/opencode/src/cli/cmd/github.handler.ts:724] |
| `MENTIONS` | GitHub mention trigger list. | [E: packages/opencode/src/cli/cmd/github.handler.ts:739] |

## 设计动机与坑位

- `OPENCODE_EXPERIMENTAL` 是 umbrella only when a specific experimental flag is absent；设置了具体 env 后，具体 env 的 true/false 优先级更高。[E: packages/core/src/flag/flag.ts:12][E: packages/opencode/src/effect/runtime-flags.ts:13]
- 同名 env 可能被 V1 与 V2 双读，例如 `OPENCODE_CLIENT` 同时出现在 core `Flag` 与 V1 `RuntimeFlags`，因此排查 client identity 时要看当前执行路径属于 V1 CLI 还是 V2 embedded core。[E: packages/core/src/flag/flag.ts:75][E: packages/opencode/src/effect/runtime-flags.ts:55]
- provider env 同时存在 `packages/core/src/plugin/provider/*` 与 `packages/opencode/src/provider/provider.ts` 两套 adapter；这反映 V1/V2 迁移期间 provider 入口并存。[E: packages/core/src/plugin/provider/google-vertex.ts:10][E: packages/opencode/src/provider/provider.ts:491][I]

## Sources

- `packages/core/src/flag/flag.ts`
- `packages/opencode/src/effect/runtime-flags.ts`
- `packages/core/src/database/database.ts`
- `packages/core/src/database/migration.ts`
- `packages/core/src/models-dev.ts`
- `packages/core/src/plugin/provider/`
- `packages/opencode/src/provider/provider.ts`
- `packages/core/src/pty.ts`
- `packages/core/src/shell.ts`
- `packages/opencode/src/cli/cmd/github.handler.ts`

## 相关

- `persistence.config-loading`
- `config.v1-core`
- `config.v2-schema`
- `provider.resolution`
