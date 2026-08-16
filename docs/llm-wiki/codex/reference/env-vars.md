---
id: ref.env-vars
title: 环境变量索引
kind: reference
tier: T3
source: [codex-rs/login/src/auth/manager.rs, codex-rs/login/src/auth/workload_identity.rs, codex-rs/protocol/src/shell_environment.rs, codex-rs/workload-identity/src/lib.rs, codex-rs/model-provider-info/src/lib.rs, codex-rs/model-provider/src/amazon_bedrock/auth.rs, codex-rs/utils/home-dir/src/lib.rs, codex-rs/app-server/src/main.rs, codex-rs/app-server/src/request_processors/account_processor.rs, codex-rs/cli/src/main.rs, codex-rs/cloud-tasks/src/lib.rs, codex-rs/core/src/spawn.rs, codex-rs/exec-server/src/lib.rs, codex-rs/exec-server/src/environment.rs, codex-rs/exec-server/src/environment_provider.rs, codex-rs/http-client/src/custom_ca.rs, codex-rs/codex-mcp/src/mcp/mod.rs, codex-rs/codex-mcp/src/connection_manager.rs, codex-rs/rmcp-client/src/protocol_mode.rs, codex-rs/rmcp-client/src/rmcp_client.rs, codex-rs/network-proxy/src/proxy.rs, codex-rs/network-proxy/src/runtime.rs, codex-rs/shell-escalation/src/unix/escalate_protocol.rs, codex-rs/tui/src/session_log.rs, codex-rs/tui/src/tui/keyboard_modes.rs, codex-rs/cloud-tasks/src/ui.rs, codex-rs/tui/src/external_editor.rs, codex-rs/tui/src/clipboard_copy.rs, codex-rs/install-context/src/lib.rs, codex-rs/state/src/lib.rs, codex-rs/core/src/config/mod.rs, codex-rs/config/src/config_toml.rs, codex-rs/utils/absolute-path/src/lib.rs, codex-rs/utils/cargo-bin/src/lib.rs, codex-rs/otel/src/trace_context.rs]
symbols: [OPENAI_API_KEY_ENV_VAR, CODEX_API_KEY_ENV_VAR, CODEX_ACCESS_TOKEN_ENV_VAR, CLIENT_ID_OVERRIDE_ENV_VAR, REFRESH_TOKEN_URL_OVERRIDE_ENV_VAR, REVOKE_TOKEN_URL_OVERRIDE_ENV_VAR, AWS_BEARER_TOKEN_BEDROCK_ENV_VAR, AWS_REGION_ENV_VAR, AWS_DEFAULT_REGION_ENV_VAR, CODEX_SANDBOX_NETWORK_DISABLED_ENV_VAR, CODEX_SANDBOX_ENV_VAR, CODEX_EXEC_SERVER_URL_ENV_VAR, CODEX_EXEC_SERVER_NOISE_REGISTRY_URL_ENV_VAR, CODEX_EXEC_SERVER_NOISE_ENVIRONMENT_ID_ENV_VAR, CODEX_EXEC_SERVER_NOISE_AUTH_TOKEN_ENV_VAR, CODEX_EXEC_SERVER_NOISE_CHATGPT_ACCOUNT_ID_ENV_VAR, CODEX_EXEC_SERVER_EXIT_ON_STDIN_CLOSE_ENV_VAR, CODEX_CA_CERT_ENV, SSL_CERT_FILE_ENV, CODEX_CONNECTORS_TOKEN_ENV_VAR, PROXY_URL_ENV_KEYS, PROXY_ACTIVE_ENV_KEY, ALLOW_LOCAL_BINDING_ENV_KEY, CODEX_TUI_RECORD_SESSION, CODEX_TUI_SESSION_LOG_PATH, SQLITE_HOME_ENV]
related: [config.auth-account, config.model-provider, config.approval-sandbox, subsys.platform.network-proxy, ref.crate-index]
evidence: explicit
status: verified
updated: 9ded177ce7
---

> 本节点列出 Codex 源码中对 runtime/config/debug/test 有可见行为的环境变量；每个变量行都标注读取或常量定义位置，debug-only/test-only 变量显式标明适用范围。[I]

## 能回答的问题

- Codex auth 和 provider 读取哪些 API key / organization / project 环境变量?
- `CODEX_HOME`、state DB、managed config 和 app-server debug hooks 如何工作?
- sandbox、exec-server、network proxy、custom CA、MCP connector token 使用哪些变量?
- TUI session log、keyboard enhancement、editor、terminal detection 读哪些变量?
- 哪些变量只用于 debug/test/build support?

## Auth / provider 环境变量

| Variable | Scope | 行为 | 定义/读取处 |
|---|---|---|---|
| `OPENAI_API_KEY` | Auth/API key | `read_openai_api_key_from_env()` 读取并 trim，空字符串被过滤。[E: codex-rs/login/src/auth/manager.rs:838][E: codex-rs/login/src/auth/manager.rs:841][E: codex-rs/login/src/auth/manager.rs:841][E: codex-rs/login/src/auth/manager.rs:841][E: codex-rs/login/src/auth/manager.rs:846] | `login/src/auth/manager.rs` |
| `CODEX_API_KEY` | Auth/API key | `read_codex_api_key_from_env()` 读取 Codex-specific API key。[E: codex-rs/login/src/auth/manager.rs:839][E: codex-rs/login/src/auth/manager.rs:849][E: codex-rs/login/src/auth/manager.rs:849] | `login/src/auth/manager.rs` |
| `CODEX_ACCESS_TOKEN` | Auth/API key | `read_codex_access_token_from_env()` 读取非空 Codex access token。[E: codex-rs/login/src/auth/manager.rs:840][E: codex-rs/login/src/auth/manager.rs:853][E: codex-rs/login/src/auth/manager.rs:853] | `login/src/auth/manager.rs` |
| `CODEX_REFRESH_TOKEN_URL_OVERRIDE` | Auth debug/config override | OAuth refresh token endpoint override constant。[E: codex-rs/login/src/auth/manager.rs:193] | `login/src/auth/manager.rs` |
| `CODEX_REVOKE_TOKEN_URL_OVERRIDE` | Auth debug/config override | OAuth revoke token endpoint override constant。[E: codex-rs/login/src/auth/manager.rs:194] | `login/src/auth/manager.rs` |
| `CODEX_APP_SERVER_LOGIN_CLIENT_ID` | Auth/app-server login override | overrides the OAuth client id when set to a non-empty value。[E: codex-rs/login/src/auth/manager.rs:195][E: codex-rs/login/src/auth/manager.rs:1450][E: codex-rs/login/src/auth/manager.rs:1451][E: codex-rs/login/src/auth/manager.rs:1453][E: codex-rs/login/src/auth/manager.rs:1454] | `login/src/auth/manager.rs` |
| `OPENAI_ORGANIZATION` | OpenAI provider headers | mapped to `OpenAI-Organization` HTTP header in provider info。[E: codex-rs/model-provider-info/src/lib.rs:348][E: codex-rs/model-provider-info/src/lib.rs:350][E: codex-rs/model-provider-info/src/lib.rs:352] | `model-provider-info/src/lib.rs` |
| `OPENAI_PROJECT` | OpenAI provider headers | mapped to `OpenAI-Project` HTTP header in provider info。[E: codex-rs/model-provider-info/src/lib.rs:348][E: codex-rs/model-provider-info/src/lib.rs:354] | `model-provider-info/src/lib.rs` |
| `CODEX_OSS_PORT` | OSS provider experimental | used to build default OSS base URL port when non-empty and parseable; comment marks `CODEX_OSS_` variables experimental。[E: codex-rs/model-provider-info/src/lib.rs:515][E: codex-rs/model-provider-info/src/lib.rs:516][E: codex-rs/model-provider-info/src/lib.rs:518][E: codex-rs/model-provider-info/src/lib.rs:519] | `model-provider-info/src/lib.rs` [I] |
| `CODEX_OSS_BASE_URL` | OSS provider experimental | overrides default OSS base URL when non-empty。[E: codex-rs/model-provider-info/src/lib.rs:522][E: codex-rs/model-provider-info/src/lib.rs:522][E: codex-rs/model-provider-info/src/lib.rs:522][E: codex-rs/model-provider-info/src/lib.rs:525] | `model-provider-info/src/lib.rs` |
| `AWS_BEARER_TOKEN_BEDROCK` | Amazon Bedrock provider | 在 managed Bedrock auth 未提供时读取非空 env bearer token；若两者都没有则回退 AWS SDK auth。[E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:23][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:32][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:37][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:43][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:49] | `model-provider/src/amazon_bedrock/auth.rs` |
| `AWS_REGION` | Amazon Bedrock provider | env bearer-token region fallback；优先级在 `model_providers.amazon-bedrock.aws.region` 之后、`AWS_DEFAULT_REGION` 之前。[E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:23][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:83][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:87][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:88] | `model-provider/src/amazon_bedrock/auth.rs` |
| `AWS_DEFAULT_REGION` | Amazon Bedrock provider | env bearer-token region 的末级 fallback；三处都缺失时返回 fatal configuration error。[E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:25][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:88][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:88][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:93] | `model-provider/src/amazon_bedrock/auth.rs` |
| `OPENAI_FEDERATION_RULE_ID` | Workload identity | 与 `OPENAI_IDENTITY_TOKEN_FILE` / `OPENAI_WORKLOAD_IDENTITY_CONTEXT` 一起作为 process marker；任一 marker 选中 workload identity，部分配置会校验失败而不是回退。[E: codex-rs/protocol/src/shell_environment.rs:8][E: codex-rs/login/src/auth/workload_identity.rs:127][E: codex-rs/login/src/auth/workload_identity.rs:255] | `protocol/src/shell_environment.rs` |
| `OPENAI_IDENTITY_TOKEN_FILE` | Workload identity | workload identity assertion file 路径；必须是绝对路径。[E: codex-rs/protocol/src/shell_environment.rs:9][E: codex-rs/login/src/auth/workload_identity.rs:256][E: codex-rs/workload-identity/src/lib.rs:44] | `protocol/src/shell_environment.rs` |
| `OPENAI_WORKLOAD_IDENTITY_CONTEXT` | Workload identity | optional workload identity context marker。[E: codex-rs/protocol/src/shell_environment.rs:10][E: codex-rs/login/src/auth/workload_identity.rs:257] | `protocol/src/shell_environment.rs` |

## Home / app-server / cloud task 环境变量

| Variable | Scope | 行为 | 定义/读取处 |
|---|---|---|---|
| `CODEX_HOME` | Config/storage root | `find_codex_home()` honors non-empty `CODEX_HOME`; set value must exist, be directory, and is canonicalized; unset defaults to `~/.codex` without existence check。[E: codex-rs/utils/home-dir/src/lib.rs:14][E: codex-rs/utils/home-dir/src/lib.rs:16][E: codex-rs/utils/home-dir/src/lib.rs:24][E: codex-rs/utils/home-dir/src/lib.rs:26][E: codex-rs/utils/home-dir/src/lib.rs:37][E: codex-rs/utils/home-dir/src/lib.rs:43][E: codex-rs/utils/home-dir/src/lib.rs:59] | `utils/home-dir/src/lib.rs` |
| `CODEX_APP_SERVER_MANAGED_CONFIG_PATH` | app-server debug-only test hook | debug builds can point app-server at a temporary managed config path。[E: codex-rs/app-server/src/main.rs:17][E: codex-rs/app-server/src/main.rs:79][E: codex-rs/app-server/src/main.rs:82][E: codex-rs/app-server/src/main.rs:83][E: codex-rs/app-server/src/main.rs:130][E: codex-rs/app-server/src/main.rs:131][E: codex-rs/app-server/src/main.rs:133][E: codex-rs/app-server/src/main.rs:137] | `app-server/src/main.rs` |
| `CODEX_APP_SERVER_DISABLE_MANAGED_CONFIG` | app-server debug-only test hook | debug builds treat `1/true/TRUE/yes/YES` as disabling managed config。[E: codex-rs/app-server/src/main.rs:18][E: codex-rs/app-server/src/main.rs:79][E: codex-rs/app-server/src/main.rs:119][E: codex-rs/app-server/src/main.rs:120][E: codex-rs/app-server/src/main.rs:122][E: codex-rs/app-server/src/main.rs:123] | `app-server/src/main.rs` |
| `CODEX_APP_SERVER_LOGIN_ISSUER` | app-server debug-only login hook | debug builds override login issuer when env value is non-empty。[E: codex-rs/app-server/src/request_processors/account_processor.rs:20][E: codex-rs/app-server/src/request_processors/account_processor.rs:20][E: codex-rs/app-server/src/request_processors/account_processor.rs:484][E: codex-rs/app-server/src/request_processors/account_processor.rs:489] | `app-server/src/request_processors/account_processor.rs` |
| `CODEX_CLOUD_TASKS_MODE` | cloud tasks debug-only | debug builds use mock mode when value is `mock` or `MOCK`。[E: codex-rs/cloud-tasks/src/lib.rs:50][E: codex-rs/cloud-tasks/src/lib.rs:51][E: codex-rs/cloud-tasks/src/lib.rs:52] | `cloud-tasks/src/lib.rs` |
| `CODEX_CLOUD_TASKS_BASE_URL` | cloud tasks backend | overrides cloud tasks backend base URL; default is `https://chatgpt.com/backend-api`。[E: codex-rs/cloud-tasks/src/lib.rs:54][E: codex-rs/cloud-tasks/src/lib.rs:55] | `cloud-tasks/src/lib.rs` |
| `CODEX_CLOUD_TASKS_FORCE_INTERNAL` | cloud tasks UI/runtime | values `1/true/TRUE` force internal mode flag。[E: codex-rs/cloud-tasks/src/lib.rs:818][E: codex-rs/cloud-tasks/src/lib.rs:821] | `cloud-tasks/src/lib.rs` |

## Execution / sandbox / network 环境变量

| Variable | Scope | 行为 | 定义/读取处 |
|---|---|---|---|
| `CODEX_SANDBOX_NETWORK_DISABLED` | spawned process sandbox marker | child process env marker for Codex-spawned shell calls with restricted network sandbox。[E: codex-rs/core/src/spawn.rs:21] | `core/src/spawn.rs` |
| `CODEX_SANDBOX` | spawned process sandbox marker | set when process runs under sandbox; comment states current macOS value is `seatbelt` but may change。[E: codex-rs/core/src/spawn.rs:26] | `core/src/spawn.rs` [I] |
| `CODEX_EXEC_SERVER_URL` | execution environments | websocket URL creates remote environment and makes it default; value `none` disables default environment access。[E: codex-rs/exec-server/src/environment.rs:45][E: codex-rs/exec-server/src/environment_provider.rs:64][E: codex-rs/exec-server/src/environment_provider.rs:69][E: codex-rs/exec-server/src/environment_provider.rs:71][E: codex-rs/exec-server/src/environment_provider.rs:84][E: codex-rs/exec-server/src/environment_provider.rs:85][E: codex-rs/exec-server/src/environment_provider.rs:87][E: codex-rs/exec-server/src/environment_provider.rs:90][E: codex-rs/exec-server/src/environment_provider.rs:107][E: codex-rs/exec-server/src/environment_provider.rs:110][E: codex-rs/exec-server/src/environment.rs:713][E: codex-rs/exec-server/src/environment.rs:662] | `exec-server/src/environment.rs`, `exec-server/src/environment_provider.rs` |
| `CODEX_EXEC_SERVER_NOISE_REGISTRY_URL` | Noise remote execution | Noise rendezvous registry URL；必须与 environment id、auth token 同时提供，否则 remote environment config fail closed。[E: codex-rs/exec-server/src/environment.rs:46][E: codex-rs/exec-server/src/environment.rs:595][E: codex-rs/exec-server/src/environment.rs:599][E: codex-rs/exec-server/src/environment.rs:609][E: codex-rs/exec-server/src/environment.rs:619] | `exec-server/src/environment.rs` |
| `CODEX_EXEC_SERVER_NOISE_ENVIRONMENT_ID` | Noise remote execution | Noise rendezvous environment identity；与 registry URL、auth token 构成 required triple。[E: codex-rs/exec-server/src/environment.rs:48][E: codex-rs/exec-server/src/environment.rs:599][E: codex-rs/exec-server/src/environment.rs:609][E: codex-rs/exec-server/src/environment.rs:615][E: codex-rs/exec-server/src/environment.rs:622] | `exec-server/src/environment.rs` |
| `CODEX_EXEC_SERVER_NOISE_AUTH_TOKEN` | Noise remote execution | Noise rendezvous registration token；required triple 缺一项就拒绝配置。[E: codex-rs/exec-server/src/environment.rs:50][E: codex-rs/exec-server/src/environment.rs:599][E: codex-rs/exec-server/src/environment.rs:609][E: codex-rs/exec-server/src/environment.rs:615][E: codex-rs/exec-server/src/environment.rs:622] | `exec-server/src/environment.rs` |
| `CODEX_EXEC_SERVER_NOISE_CHATGPT_ACCOUNT_ID` | Noise remote execution | optional ChatGPT account id，随 Noise rendezvous config 传入；不属于 required triple。[E: codex-rs/exec-server/src/environment.rs:51][E: codex-rs/exec-server/src/environment.rs:599][E: codex-rs/exec-server/src/environment.rs:609][E: codex-rs/exec-server/src/environment.rs:627][E: codex-rs/exec-server/src/environment.rs:629] | `exec-server/src/environment.rs` |
| `CODEX_EXEC_SERVER_EXIT_ON_STDIN_CLOSE` | remote exec-server parent lifetime | process-local opt-in used by `codex exec-server --exit-on-stdin-close`; when true it requires remote registration, selects stdin-pipe parent lifetime and uses graceful shutdown。[E: codex-rs/exec-server/src/lib.rs:42][E: codex-rs/exec-server/src/lib.rs:45][E: codex-rs/cli/src/main.rs:595][E: codex-rs/cli/src/main.rs:596][E: codex-rs/cli/src/main.rs:599][E: codex-rs/cli/src/main.rs:1739][E: codex-rs/cli/src/main.rs:1745][E: codex-rs/cli/src/main.rs:1756][E: codex-rs/cli/src/main.rs:1757] | `exec-server/src/lib.rs`, `cli/src/main.rs` |
| `CODEX_CA_CERTIFICATE` | TLS custom CA | Codex-specific CA bundle path; wins over `SSL_CERT_FILE`。[E: codex-rs/http-client/src/custom_ca.rs:61][E: codex-rs/http-client/src/custom_ca.rs:387][E: codex-rs/http-client/src/custom_ca.rs:390] | `http-client/src/custom_ca.rs` |
| `SSL_CERT_FILE` | TLS custom CA fallback | fallback CA bundle env when `CODEX_CA_CERTIFICATE` is unset/empty。[E: codex-rs/http-client/src/custom_ca.rs:62][E: codex-rs/http-client/src/custom_ca.rs:387][E: codex-rs/http-client/src/custom_ca.rs:390] | `http-client/src/custom_ca.rs` |
| `CODEX_CONNECTORS_TOKEN` | MCP apps connector auth | non-empty or non-Unicode value marks Codex apps MCP bearer token env var as present。[E: codex-rs/codex-mcp/src/mcp/mod.rs:62][E: codex-rs/codex-mcp/src/mcp/mod.rs:466][E: codex-rs/codex-mcp/src/mcp/mod.rs:467][E: codex-rs/codex-mcp/src/mcp/mod.rs:467] | `codex-mcp/src/mcp/mod.rs` |
| `CODEX_MCP_PROTOCOL_VERSION` | configured stdio MCP server compatibility selector | only when the session enables MCP 2026 mode, Codex removes this key from that server's configured env and accepts exact value `2026-07-28`; missing falls back to legacy, other values fail validation。它是 per-server selector，不会被传给 child process。[E: codex-rs/rmcp-client/src/rmcp_client.rs:402][E: codex-rs/rmcp-client/src/rmcp_client.rs:406][E: codex-rs/rmcp-client/src/rmcp_client.rs:408][E: codex-rs/rmcp-client/src/protocol_mode.rs:36][E: codex-rs/rmcp-client/src/protocol_mode.rs:39][E: codex-rs/rmcp-client/src/protocol_mode.rs:40][E: codex-rs/rmcp-client/src/protocol_mode.rs:46][E: codex-rs/codex-mcp/src/connection_manager.rs:306][E: codex-rs/codex-mcp/src/connection_manager.rs:307][E: codex-rs/codex-mcp/src/connection_manager.rs:311] | `rmcp-client/src/rmcp_client.rs`, `rmcp-client/src/protocol_mode.rs` |
| `HTTP_PROXY`, `HTTPS_PROXY`, `WS_PROXY`, `WSS_PROXY`, `ALL_PROXY`, `FTP_PROXY`, `YARN_HTTP_PROXY`, `YARN_HTTPS_PROXY`, `NPM_CONFIG_HTTP_PROXY`, `NPM_CONFIG_HTTPS_PROXY`, `NPM_CONFIG_PROXY`, `BUNDLE_HTTP_PROXY`, `BUNDLE_HTTPS_PROXY`, `PIP_PROXY`, `DOCKER_HTTP_PROXY`, `DOCKER_HTTPS_PROXY` | managed network proxy | `PROXY_URL_ENV_KEYS` lists proxy URL vars; managed proxy code detects them and overrides HTTP/WS/no-proxy/all-proxy/FTP proxy variables for child process env。[E: codex-rs/network-proxy/src/proxy.rs:502][E: codex-rs/network-proxy/src/proxy.rs:503][E: codex-rs/network-proxy/src/proxy.rs:504][E: codex-rs/network-proxy/src/proxy.rs:505][E: codex-rs/network-proxy/src/proxy.rs:506][E: codex-rs/network-proxy/src/proxy.rs:506][E: codex-rs/network-proxy/src/proxy.rs:506][E: codex-rs/network-proxy/src/proxy.rs:509][E: codex-rs/network-proxy/src/proxy.rs:510][E: codex-rs/network-proxy/src/proxy.rs:511][E: codex-rs/network-proxy/src/proxy.rs:512][E: codex-rs/network-proxy/src/proxy.rs:513][E: codex-rs/network-proxy/src/proxy.rs:514][E: codex-rs/network-proxy/src/proxy.rs:515][E: codex-rs/network-proxy/src/proxy.rs:516][E: codex-rs/network-proxy/src/proxy.rs:517][E: codex-rs/network-proxy/src/proxy.rs:518][E: codex-rs/network-proxy/src/proxy.rs:672][E: codex-rs/network-proxy/src/proxy.rs:684][E: codex-rs/network-proxy/src/proxy.rs:701][E: codex-rs/network-proxy/src/proxy.rs:707][E: codex-rs/network-proxy/src/proxy.rs:581][E: codex-rs/network-proxy/src/proxy.rs:731][E: codex-rs/network-proxy/src/proxy.rs:734] | `network-proxy/src/proxy.rs` |
| `ALL_PROXY`, `all_proxy` | managed network proxy | `ALL_PROXY_ENV_KEYS` captures uppercase/lowercase all-proxy variants。[E: codex-rs/network-proxy/src/proxy.rs:521] | `network-proxy/src/proxy.rs` |
| `CODEX_NETWORK_PROXY_ACTIVE` | managed network proxy marker | `PROXY_ACTIVE_ENV_KEY` marker inserted into proxy env key set and written as `"1"` in managed proxy env。[E: codex-rs/network-proxy/src/proxy.rs:522][E: codex-rs/network-proxy/src/proxy.rs:532][E: codex-rs/network-proxy/src/proxy.rs:532][E: codex-rs/network-proxy/src/proxy.rs:672] | `network-proxy/src/proxy.rs` |
| `CODEX_NETWORK_ALLOW_LOCAL_BINDING` | managed network proxy marker | network proxy allow-local-binding env key。[E: codex-rs/network-proxy/src/proxy.rs:522][E: codex-rs/network-proxy/src/proxy.rs:537][E: codex-rs/network-proxy/src/proxy.rs:674] | `network-proxy/src/proxy.rs` |
| `ELECTRON_GET_USE_PROXY` | managed network proxy / Electron integration | Electron proxy env key constant is part of proxy env handling and is written as `"true"` for managed proxy env。[E: codex-rs/network-proxy/src/proxy.rs:529][E: codex-rs/network-proxy/src/proxy.rs:540][E: codex-rs/network-proxy/src/proxy.rs:720][E: codex-rs/network-proxy/src/proxy.rs:721] | `network-proxy/src/proxy.rs` |
| `NODE_USE_ENV_PROXY` | managed network proxy / Node.js integration | Node.js built-in HTTP clients only honor proxy env vars when this marker is set, so managed proxy env writes it as `"1"`。[E: codex-rs/network-proxy/src/proxy.rs:530][E: codex-rs/network-proxy/src/proxy.rs:540][E: codex-rs/network-proxy/src/proxy.rs:724] | `network-proxy/src/proxy.rs` |
| `GIT_SSH_COMMAND` | network proxy on macOS/test | macOS/test-specific Git SSH command env key constant。[E: codex-rs/network-proxy/src/proxy.rs:532][E: codex-rs/network-proxy/src/proxy.rs:599] | `network-proxy/src/proxy.rs` |
| `NO_PROXY`, `no_proxy`, `npm_config_noproxy`, `NPM_CONFIG_NOPROXY`, `YARN_NO_PROXY`, `BUNDLE_NO_PROXY` | managed network proxy exclusions | `NO_PROXY_ENV_KEYS` lists no-proxy exclusion variables。[E: codex-rs/network-proxy/src/proxy.rs:604][E: codex-rs/network-proxy/src/proxy.rs:605][E: codex-rs/network-proxy/src/proxy.rs:606][E: codex-rs/network-proxy/src/proxy.rs:607][E: codex-rs/network-proxy/src/proxy.rs:608][E: codex-rs/network-proxy/src/proxy.rs:609][E: codex-rs/network-proxy/src/proxy.rs:610] | `network-proxy/src/proxy.rs` |
| `CODEX_ESCALATE_SOCKET` | shell escalation | exec wrappers read this inherited FD env var for escalation socket。[E: codex-rs/shell-escalation/src/unix/escalate_protocol.rs:11] | `shell-escalation/src/unix/escalate_protocol.rs` |
| `EXEC_WRAPPER` | shell escalation | patched shells use this to wrap `exec()` calls。[E: codex-rs/shell-escalation/src/unix/escalate_protocol.rs:14] | `shell-escalation/src/unix/escalate_protocol.rs` |

## TUI / terminal 环境变量

| Variable | Scope | 行为 | 定义/读取处 |
|---|---|---|---|
| `CODEX_TUI_RECORD_SESSION` | TUI session log | values `1/true/TRUE/yes/YES` enable session log recording。[E: codex-rs/tui/src/session_log.rs:85][E: codex-rs/tui/src/session_log.rs:86][E: codex-rs/tui/src/session_log.rs:87] | `tui/src/session_log.rs` |
| `CODEX_TUI_SESSION_LOG_PATH` | TUI session log | overrides session log output path when recording is enabled。[E: codex-rs/tui/src/session_log.rs:92][E: codex-rs/tui/src/session_log.rs:93] | `tui/src/session_log.rs` |
| `CODEX_TUI_DISABLE_KEYBOARD_ENHANCEMENT` | TUI keyboard | disables keyboard enhancement detection/path when set to accepted truthy values; otherwise WSL VS Code terminal detection can also disable enhancement。[E: codex-rs/tui/src/tui/keyboard_modes.rs:18][E: codex-rs/tui/src/tui/keyboard_modes.rs:20][E: codex-rs/tui/src/tui/keyboard_modes.rs:21][E: codex-rs/tui/src/tui/keyboard_modes.rs:32][E: codex-rs/tui/src/tui/keyboard_modes.rs:44][E: codex-rs/tui/src/tui/keyboard_modes.rs:45][E: codex-rs/tui/src/tui/keyboard_modes.rs:46][E: codex-rs/tui/src/tui/keyboard_modes.rs:47][E: codex-rs/tui/src/tui/keyboard_modes.rs:48][E: codex-rs/tui/src/tui/keyboard_modes.rs:49] | `tui/src/tui/keyboard_modes.rs` |
| `TERM_PROGRAM` | TUI terminal detection | used to detect VS Code terminal context, including a WSL-side probe through `cmd.exe set TERM_PROGRAM`。[E: codex-rs/tui/src/tui/keyboard_modes.rs:66][E: codex-rs/tui/src/tui/keyboard_modes.rs:68][E: codex-rs/tui/src/tui/keyboard_modes.rs:77][E: codex-rs/tui/src/tui/keyboard_modes.rs:80][E: codex-rs/tui/src/tui/keyboard_modes.rs:81][E: codex-rs/tui/src/tui/keyboard_modes.rs:102][E: codex-rs/tui/src/tui/keyboard_modes.rs:103][E: codex-rs/tui/src/tui/keyboard_modes.rs:117] | `tui/src/tui/keyboard_modes.rs` |
| `CODEX_TUI_ROUNDED` | cloud tasks TUI rendering | `CODEX_TUI_ROUNDED=1` enables rounded UI; unset defaults true。[E: codex-rs/cloud-tasks/src/ui.rs:64][E: codex-rs/cloud-tasks/src/ui.rs:66][E: codex-rs/cloud-tasks/src/ui.rs:67] | `cloud-tasks/src/ui.rs` |
| `VISUAL`, `EDITOR` | external editor | external editor resolution prefers `VISUAL` over `EDITOR`。[E: codex-rs/tui/src/external_editor.rs:35][E: codex-rs/tui/src/external_editor.rs:35] | `tui/src/external_editor.rs` |
| `SSH_TTY`, `SSH_CONNECTION` | clipboard/SSH detection | `is_ssh_session()` returns true if either variable exists。[E: codex-rs/tui/src/clipboard_copy.rs:200][E: codex-rs/tui/src/clipboard_copy.rs:201] | `tui/src/clipboard_copy.rs` |

## Dev / test / build support 环境变量

| Variable | Scope | 行为 | 定义/读取处 |
|---|---|---|---|
| `CODEX_MANAGED_BY_PNPM` | install context | presence marks install context as managed by pnpm；它优先于 npm/bun markers。[E: codex-rs/install-context/src/lib.rs:114][E: codex-rs/install-context/src/lib.rs:115] | `install-context/src/lib.rs` |
| `CODEX_MANAGED_BY_NPM` | install context | presence marks install context as managed by npm。[E: codex-rs/install-context/src/lib.rs:115][E: codex-rs/install-context/src/lib.rs:115] | `install-context/src/lib.rs` |
| `CODEX_MANAGED_BY_BUN` | install context | presence marks install context as managed by bun。[E: codex-rs/install-context/src/lib.rs:115] | `install-context/src/lib.rs` |
| `CODEX_APP_SERVER_DEV_OPEN_APP_URL` | app-server login (debug only) | debug build 中覆盖 hosted login success page 的 open-app URL；空值忽略，非法 URL 作为 internal error 返回。[E: codex-rs/app-server/src/request_processors/account_processor.rs:22][E: codex-rs/app-server/src/request_processors/account_processor.rs:493][E: codex-rs/app-server/src/request_processors/account_processor.rs:498] | `app-server/src/request_processors/account_processor.rs` |
| `CODEX_SQLITE_HOME` | state DB | overrides SQLite state database home directory when `config.toml` `sqlite_home` is absent; relative env value is resolved against cwd, otherwise default is `$CODEX_HOME`。[E: codex-rs/state/src/lib.rs:90][E: codex-rs/core/src/config/mod.rs:276][E: codex-rs/core/src/config/mod.rs:277][E: codex-rs/core/src/config/mod.rs:277][E: codex-rs/core/src/config/mod.rs:277][E: codex-rs/core/src/config/mod.rs:284][E: codex-rs/core/src/config/mod.rs:284][E: codex-rs/core/src/config/mod.rs:3892][E: codex-rs/core/src/config/mod.rs:3807][E: codex-rs/core/src/config/mod.rs:3813][E: codex-rs/config/src/config_toml.rs:320] | `state/src/lib.rs`, `core/src/config/mod.rs`, `config/src/config_toml.rs` |
| `CODEX_ABSOLUTE_PATH_REMOVED_CWD_CHILD` | test-only absolute path utility | ignored test child process uses this variable in the removed-current-directory absolute path test。[E: codex-rs/utils/absolute-path/src/lib.rs:399][E: codex-rs/utils/absolute-path/src/lib.rs:410] | `utils/absolute-path/src/lib.rs` |
| `BAZEL_PACKAGE` | build/runfiles | compile-time env var used by Bazel runfile resolution。[E: codex-rs/utils/cargo-bin/src/lib.rs:132] | `utils/cargo-bin/src/lib.rs` |
| `CODEX_REPO_ROOT_MARKER` | build/runfiles | compile-time env var used to locate repo root marker under Bazel runfiles。[E: codex-rs/utils/cargo-bin/src/lib.rs:177][E: codex-rs/utils/cargo-bin/src/lib.rs:182] | `utils/cargo-bin/src/lib.rs` |
| `TRACEPARENT`, `TRACESTATE` | OpenTelemetry trace context | W3C trace context env variable names。[E: codex-rs/otel/src/trace_context.rs:20][E: codex-rs/otel/src/trace_context.rs:21] | `otel/src/trace_context.rs` |

## 设计动机速记

- Codex-specific overrides often use `CODEX_` prefix (`CODEX_HOME`, `CODEX_CA_CERTIFICATE`, `CODEX_EXEC_SERVER_URL`, `CODEX_NETWORK_PROXY_ACTIVE`) while standard ecosystem variables (`OPENAI_API_KEY`, `HTTP_PROXY`, `NO_PROXY`, `VISUAL`, `EDITOR`, `TRACEPARENT`) are honored where they align with user expectations。[I]
- Debug-only app-server/cloud-task variables are guarded by `#[cfg(debug_assertions)]` at read sites, so release behavior should not be inferred from those hooks。[E: codex-rs/app-server/src/main.rs:122][E: codex-rs/app-server/src/main.rs:133][E: codex-rs/app-server/src/request_processors/account_processor.rs:484][E: codex-rs/cloud-tasks/src/lib.rs:50][I]
- Env vars that alter security boundaries are modeled as markers or explicit URLs/paths; examples include sandbox markers, exec-server URL, custom CA path, connector token marker, network proxy markers, and shell escalation socket/wrapper。[E: codex-rs/core/src/spawn.rs:21][E: codex-rs/core/src/spawn.rs:26][E: codex-rs/exec-server/src/environment.rs:45][E: codex-rs/http-client/src/custom_ca.rs:61][E: codex-rs/codex-mcp/src/mcp/mod.rs:58][E: codex-rs/network-proxy/src/proxy.rs:522][E: codex-rs/shell-escalation/src/unix/escalate_protocol.rs:11][E: codex-rs/shell-escalation/src/unix/escalate_protocol.rs:14][I]

## Sources

- `codex-rs/login/src/auth/manager.rs`
- `codex-rs/login/src/auth/workload_identity.rs`
- `codex-rs/protocol/src/shell_environment.rs`
- `codex-rs/workload-identity/src/lib.rs`
- `codex-rs/model-provider-info/src/lib.rs`
- `codex-rs/model-provider/src/amazon_bedrock/auth.rs`
- `codex-rs/utils/home-dir/src/lib.rs`
- `codex-rs/app-server/src/main.rs`
- `codex-rs/app-server/src/request_processors/account_processor.rs`
- `codex-rs/cli/src/main.rs`
- `codex-rs/cloud-tasks/src/lib.rs`
- `codex-rs/core/src/spawn.rs`
- `codex-rs/exec-server/src/lib.rs`
- `codex-rs/exec-server/src/environment.rs`
- `codex-rs/exec-server/src/environment_provider.rs`
- `codex-rs/http-client/src/custom_ca.rs`
- `codex-rs/codex-mcp/src/mcp/mod.rs`
- `codex-rs/codex-mcp/src/connection_manager.rs`
- `codex-rs/rmcp-client/src/protocol_mode.rs`
- `codex-rs/rmcp-client/src/rmcp_client.rs`
- `codex-rs/network-proxy/src/proxy.rs`
- `codex-rs/network-proxy/src/runtime.rs`
- `codex-rs/shell-escalation/src/unix/escalate_protocol.rs`
- `codex-rs/tui/src/session_log.rs`
- `codex-rs/tui/src/tui/keyboard_modes.rs`
- `codex-rs/cloud-tasks/src/ui.rs`
- `codex-rs/tui/src/external_editor.rs`
- `codex-rs/tui/src/clipboard_copy.rs`
- `codex-rs/install-context/src/lib.rs`
- `codex-rs/state/src/lib.rs`
- `codex-rs/core/src/config/mod.rs`
- `codex-rs/config/src/config_toml.rs`
- `codex-rs/utils/absolute-path/src/lib.rs`
- `codex-rs/utils/cargo-bin/src/lib.rs`
- `codex-rs/otel/src/trace_context.rs`

## 相关

- [config.auth-account](../surface/config/auth-account.md)
- [config.model-provider](../surface/config/model-provider.md)
- [config.approval-sandbox](../surface/config/approval-sandbox.md)
- [subsys.platform.network-proxy](../subsystems/platform/network-proxy.md)
- [ref.crate-index](crate-index.md)
