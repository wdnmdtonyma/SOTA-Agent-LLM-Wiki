---
id: ref.env-vars
title: 环境变量索引
kind: reference
tier: T3
source: [codex-rs/login/src/auth/manager.rs, codex-rs/model-provider-info/src/lib.rs, codex-rs/model-provider/src/amazon_bedrock/auth.rs, codex-rs/utils/home-dir/src/lib.rs, codex-rs/app-server/src/main.rs, codex-rs/app-server/src/codex_message_processor.rs, codex-rs/cloud-tasks/src/lib.rs, codex-rs/core/src/spawn.rs, codex-rs/exec-server/src/environment.rs, codex-rs/codex-client/src/custom_ca.rs, codex-rs/codex-mcp/src/mcp/mod.rs, codex-rs/network-proxy/src/proxy.rs, codex-rs/network-proxy/src/runtime.rs, codex-rs/core/src/tools/js_repl/mod.rs, codex-rs/shell-escalation/src/unix/escalate_protocol.rs, codex-rs/tui/src/session_log.rs, codex-rs/tui/src/tui.rs, codex-rs/cloud-tasks/src/ui.rs, codex-rs/tui/src/external_editor.rs, codex-rs/tui/src/clipboard_copy.rs, codex-rs/install-context/src/lib.rs, codex-rs/state/src/lib.rs, codex-rs/core/src/config/mod.rs, codex-rs/config/src/config_toml.rs, codex-rs/utils/absolute-path/src/lib.rs, codex-rs/utils/cargo-bin/src/lib.rs, codex-rs/otel/src/trace_context.rs]
symbols: [OPENAI_API_KEY_ENV_VAR, CODEX_API_KEY_ENV_VAR, REFRESH_TOKEN_URL_OVERRIDE_ENV_VAR, REVOKE_TOKEN_URL_OVERRIDE_ENV_VAR, CODEX_SANDBOX_NETWORK_DISABLED_ENV_VAR, CODEX_SANDBOX_ENV_VAR, CODEX_EXEC_SERVER_URL_ENV_VAR, CODEX_CA_CERT_ENV, SSL_CERT_FILE_ENV, CODEX_CONNECTORS_TOKEN_ENV_VAR, PROXY_URL_ENV_KEYS, PROXY_ACTIVE_ENV_KEY, ALLOW_LOCAL_BINDING_ENV_KEY, CODEX_TUI_RECORD_SESSION, CODEX_TUI_SESSION_LOG_PATH, SQLITE_HOME_ENV]
related: [config.auth-account, config.model-provider, config.approval-sandbox, subsys.platform.network-proxy, ref.crate-index]
evidence: explicit
status: verified
updated: 37aadeaa13
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
| `OPENAI_API_KEY` | Auth/API key | `read_openai_api_key_from_env()` 读取并 trim，空字符串被过滤。[E: codex-rs/login/src/auth/manager.rs:470][E: codex-rs/login/src/auth/manager.rs:473][E: codex-rs/login/src/auth/manager.rs:474][E: codex-rs/login/src/auth/manager.rs:476][E: codex-rs/login/src/auth/manager.rs:477] | `login/src/auth/manager.rs` |
| `CODEX_API_KEY` | Auth/API key | `read_codex_api_key_from_env()` 读取 Codex-specific API key。[E: codex-rs/login/src/auth/manager.rs:471][E: codex-rs/login/src/auth/manager.rs:480][E: codex-rs/login/src/auth/manager.rs:481] | `login/src/auth/manager.rs` |
| `CODEX_REFRESH_TOKEN_URL_OVERRIDE` | Auth debug/config override | OAuth refresh token endpoint override constant。[E: codex-rs/login/src/auth/manager.rs:93] | `login/src/auth/manager.rs` |
| `CODEX_REVOKE_TOKEN_URL_OVERRIDE` | Auth debug/config override | OAuth revoke token endpoint override constant。[E: codex-rs/login/src/auth/manager.rs:94] | `login/src/auth/manager.rs` |
| `OPENAI_ORGANIZATION` | OpenAI provider headers | mapped to `OpenAI-Organization` HTTP header in provider info。[E: codex-rs/model-provider-info/src/lib.rs:332][E: codex-rs/model-provider-info/src/lib.rs:333] | `model-provider-info/src/lib.rs` |
| `OPENAI_PROJECT` | OpenAI provider headers | mapped to `OpenAI-Project` HTTP header in provider info。[E: codex-rs/model-provider-info/src/lib.rs:335] | `model-provider-info/src/lib.rs` |
| `CODEX_OSS_PORT` | OSS provider experimental | used to build default OSS base URL port when non-empty and parseable; comment marks `CODEX_OSS_` variables experimental。[E: codex-rs/model-provider-info/src/lib.rs:468][E: codex-rs/model-provider-info/src/lib.rs:472][E: codex-rs/model-provider-info/src/lib.rs:474][E: codex-rs/model-provider-info/src/lib.rs:475] | `model-provider-info/src/lib.rs` |
| `CODEX_OSS_BASE_URL` | OSS provider experimental | overrides default OSS base URL when non-empty。[E: codex-rs/model-provider-info/src/lib.rs:479][E: codex-rs/model-provider-info/src/lib.rs:481][E: codex-rs/model-provider-info/src/lib.rs:482] | `model-provider-info/src/lib.rs` |
| `AWS_BEARER_TOKEN_BEDROCK` | Amazon Bedrock provider | Bedrock auth first checks bearer token from env and derives region from config。[E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:22][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:31][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:32][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:65][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:66][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:68][E: codex-rs/model-provider/src/amazon_bedrock/auth.rs:69] | `model-provider/src/amazon_bedrock/auth.rs` |

## Home / app-server / cloud task 环境变量

| Variable | Scope | 行为 | 定义/读取处 |
|---|---|---|---|
| `CODEX_HOME` | Config/storage root | `find_codex_home()` honors non-empty `CODEX_HOME`; set value must exist, be directory, and is canonicalized; unset defaults to `~/.codex` without existence check。[E: codex-rs/utils/home-dir/src/lib.rs:5][E: codex-rs/utils/home-dir/src/lib.rs:9][E: codex-rs/utils/home-dir/src/lib.rs:10][E: codex-rs/utils/home-dir/src/lib.rs:11][E: codex-rs/utils/home-dir/src/lib.rs:12][E: codex-rs/utils/home-dir/src/lib.rs:14][E: codex-rs/utils/home-dir/src/lib.rs:16][E: codex-rs/utils/home-dir/src/lib.rs:24][E: codex-rs/utils/home-dir/src/lib.rs:26][E: codex-rs/utils/home-dir/src/lib.rs:37][E: codex-rs/utils/home-dir/src/lib.rs:43][E: codex-rs/utils/home-dir/src/lib.rs:59] | `utils/home-dir/src/lib.rs` |
| `CODEX_APP_SERVER_MANAGED_CONFIG_PATH` | app-server debug-only test hook | debug builds can point app-server at a temporary managed config path。[E: codex-rs/app-server/src/main.rs:14][E: codex-rs/app-server/src/main.rs:47][E: codex-rs/app-server/src/main.rs:48][E: codex-rs/app-server/src/main.rs:80][E: codex-rs/app-server/src/main.rs:81][E: codex-rs/app-server/src/main.rs:83] | `app-server/src/main.rs` |
| `CODEX_APP_SERVER_DISABLE_MANAGED_CONFIG` | app-server debug-only test hook | debug builds treat `1/true/TRUE/yes/YES` as disabling managed config。[E: codex-rs/app-server/src/main.rs:15][E: codex-rs/app-server/src/main.rs:44][E: codex-rs/app-server/src/main.rs:45][E: codex-rs/app-server/src/main.rs:69][E: codex-rs/app-server/src/main.rs:70][E: codex-rs/app-server/src/main.rs:72][E: codex-rs/app-server/src/main.rs:73] | `app-server/src/main.rs` |
| `CODEX_APP_SERVER_LOGIN_ISSUER` | app-server debug-only login hook | debug builds override login issuer when env value is non-empty。[E: codex-rs/app-server/src/codex_message_processor.rs:411][E: codex-rs/app-server/src/codex_message_processor.rs:1333][E: codex-rs/app-server/src/codex_message_processor.rs:1336][E: codex-rs/app-server/src/codex_message_processor.rs:1337][E: codex-rs/app-server/src/codex_message_processor.rs:1339] | `app-server/src/codex_message_processor.rs` |
| `CODEX_CLOUD_TASKS_MODE` | cloud tasks debug-only | debug builds use mock mode when value is `mock` or `MOCK`。[E: codex-rs/cloud-tasks/src/lib.rs:44][E: codex-rs/cloud-tasks/src/lib.rs:46][E: codex-rs/cloud-tasks/src/lib.rs:47] | `cloud-tasks/src/lib.rs` |
| `CODEX_CLOUD_TASKS_BASE_URL` | cloud tasks backend | overrides cloud tasks backend base URL; default is `https://chatgpt.com/backend-api`。[E: codex-rs/cloud-tasks/src/lib.rs:49][E: codex-rs/cloud-tasks/src/lib.rs:50] | `cloud-tasks/src/lib.rs` |
| `CODEX_CLOUD_TASKS_FORCE_INTERNAL` | cloud tasks UI/runtime | values `1/true/TRUE` force internal mode flag。[E: codex-rs/cloud-tasks/src/lib.rs:799][E: codex-rs/cloud-tasks/src/lib.rs:800][E: codex-rs/cloud-tasks/src/lib.rs:803] | `cloud-tasks/src/lib.rs` |

## Execution / sandbox / network 环境变量

| Variable | Scope | 行为 | 定义/读取处 |
|---|---|---|---|
| `CODEX_SANDBOX_NETWORK_DISABLED` | spawned process sandbox marker | child process env marker for Codex-spawned shell calls with restricted network sandbox。[E: codex-rs/core/src/spawn.rs:12][E: codex-rs/core/src/spawn.rs:15][E: codex-rs/core/src/spawn.rs:16][E: codex-rs/core/src/spawn.rs:20] | `core/src/spawn.rs` |
| `CODEX_SANDBOX` | spawned process sandbox marker | set when process runs under sandbox; comment states current macOS value is `seatbelt` but may change。[E: codex-rs/core/src/spawn.rs:22][E: codex-rs/core/src/spawn.rs:23][E: codex-rs/core/src/spawn.rs:24][E: codex-rs/core/src/spawn.rs:25] | `core/src/spawn.rs` |
| `CODEX_EXEC_SERVER_URL` | execution environments | websocket URL creates remote environment and makes it default; value `none` disables default environment access。[E: codex-rs/exec-server/src/environment.rs:14][E: codex-rs/exec-server/src/environment.rs:20][E: codex-rs/exec-server/src/environment.rs:21][E: codex-rs/exec-server/src/environment.rs:24][E: codex-rs/exec-server/src/environment.rs:25][E: codex-rs/exec-server/src/environment.rs:88][E: codex-rs/exec-server/src/environment.rs:89][E: codex-rs/exec-server/src/environment.rs:93][E: codex-rs/exec-server/src/environment.rs:95][E: codex-rs/exec-server/src/environment.rs:97][E: codex-rs/exec-server/src/environment.rs:254] | `exec-server/src/environment.rs` |
| `CODEX_CA_CERTIFICATE` | TLS custom CA | Codex-specific CA bundle path; wins over `SSL_CERT_FILE`。[E: codex-rs/codex-client/src/custom_ca.rs:61][E: codex-rs/codex-client/src/custom_ca.rs:361][E: codex-rs/codex-client/src/custom_ca.rs:365] | `codex-client/src/custom_ca.rs` |
| `SSL_CERT_FILE` | TLS custom CA fallback | fallback CA bundle env when `CODEX_CA_CERTIFICATE` is unset/empty。[E: codex-rs/codex-client/src/custom_ca.rs:62][E: codex-rs/codex-client/src/custom_ca.rs:355][E: codex-rs/codex-client/src/custom_ca.rs:365][E: codex-rs/codex-client/src/custom_ca.rs:370][E: codex-rs/codex-client/src/custom_ca.rs:371] | `codex-client/src/custom_ca.rs` |
| `CODEX_CONNECTORS_TOKEN` | MCP apps connector auth | non-empty or non-Unicode value marks Codex apps MCP bearer token env var as present。[E: codex-rs/codex-mcp/src/mcp/mod.rs:47][E: codex-rs/codex-mcp/src/mcp/mod.rs:200][E: codex-rs/codex-mcp/src/mcp/mod.rs:201][E: codex-rs/codex-mcp/src/mcp/mod.rs:204] | `codex-mcp/src/mcp/mod.rs` |
| `HTTP_PROXY`, `HTTPS_PROXY`, `WS_PROXY`, `WSS_PROXY`, `ALL_PROXY`, `FTP_PROXY`, `YARN_HTTP_PROXY`, `YARN_HTTPS_PROXY`, `NPM_CONFIG_HTTP_PROXY`, `NPM_CONFIG_HTTPS_PROXY`, `NPM_CONFIG_PROXY`, `BUNDLE_HTTP_PROXY`, `BUNDLE_HTTPS_PROXY`, `PIP_PROXY`, `DOCKER_HTTP_PROXY`, `DOCKER_HTTPS_PROXY` | managed network proxy | `PROXY_URL_ENV_KEYS` lists proxy URL vars; managed proxy code detects them and overrides HTTP/WS/no-proxy/all-proxy/FTP proxy variables for child process env。[E: codex-rs/network-proxy/src/proxy.rs:346][E: codex-rs/network-proxy/src/proxy.rs:347][E: codex-rs/network-proxy/src/proxy.rs:348][E: codex-rs/network-proxy/src/proxy.rs:349][E: codex-rs/network-proxy/src/proxy.rs:350][E: codex-rs/network-proxy/src/proxy.rs:351][E: codex-rs/network-proxy/src/proxy.rs:352][E: codex-rs/network-proxy/src/proxy.rs:353][E: codex-rs/network-proxy/src/proxy.rs:354][E: codex-rs/network-proxy/src/proxy.rs:355][E: codex-rs/network-proxy/src/proxy.rs:356][E: codex-rs/network-proxy/src/proxy.rs:357][E: codex-rs/network-proxy/src/proxy.rs:358][E: codex-rs/network-proxy/src/proxy.rs:359][E: codex-rs/network-proxy/src/proxy.rs:360][E: codex-rs/network-proxy/src/proxy.rs:361][E: codex-rs/network-proxy/src/proxy.rs:362][E: codex-rs/network-proxy/src/proxy.rs:451][E: codex-rs/network-proxy/src/proxy.rs:452][E: codex-rs/network-proxy/src/proxy.rs:453][E: codex-rs/network-proxy/src/proxy.rs:496][E: codex-rs/network-proxy/src/proxy.rs:497][E: codex-rs/network-proxy/src/proxy.rs:498][E: codex-rs/network-proxy/src/proxy.rs:499][E: codex-rs/network-proxy/src/proxy.rs:500][E: codex-rs/network-proxy/src/proxy.rs:501][E: codex-rs/network-proxy/src/proxy.rs:502][E: codex-rs/network-proxy/src/proxy.rs:503][E: codex-rs/network-proxy/src/proxy.rs:504][E: codex-rs/network-proxy/src/proxy.rs:505][E: codex-rs/network-proxy/src/proxy.rs:506][E: codex-rs/network-proxy/src/proxy.rs:507][E: codex-rs/network-proxy/src/proxy.rs:508][E: codex-rs/network-proxy/src/proxy.rs:509][E: codex-rs/network-proxy/src/proxy.rs:510][E: codex-rs/network-proxy/src/proxy.rs:511][E: codex-rs/network-proxy/src/proxy.rs:512][E: codex-rs/network-proxy/src/proxy.rs:518][E: codex-rs/network-proxy/src/proxy.rs:523][E: codex-rs/network-proxy/src/proxy.rs:534][E: codex-rs/network-proxy/src/proxy.rs:537] | `network-proxy/src/proxy.rs` |
| `ALL_PROXY`, `all_proxy` | managed network proxy | `ALL_PROXY_ENV_KEYS` captures uppercase/lowercase all-proxy variants。[E: codex-rs/network-proxy/src/proxy.rs:365] | `network-proxy/src/proxy.rs` |
| `CODEX_NETWORK_PROXY_ACTIVE` | managed network proxy marker | `PROXY_ACTIVE_ENV_KEY` marker inserted into proxy env key set。[E: codex-rs/network-proxy/src/proxy.rs:366][E: codex-rs/network-proxy/src/proxy.rs:371][E: codex-rs/network-proxy/src/proxy.rs:372] | `network-proxy/src/proxy.rs` |
| `CODEX_NETWORK_ALLOW_LOCAL_BINDING` | managed network proxy marker | network proxy allow-local-binding env key。[E: codex-rs/network-proxy/src/proxy.rs:367] | `network-proxy/src/proxy.rs` |
| `ELECTRON_GET_USE_PROXY` | managed network proxy / Electron integration | Electron proxy env key constant is part of proxy env handling。[E: codex-rs/network-proxy/src/proxy.rs:368][E: codex-rs/network-proxy/src/proxy.rs:374][E: codex-rs/network-proxy/src/proxy.rs:525][E: codex-rs/network-proxy/src/proxy.rs:527] | `network-proxy/src/proxy.rs` |
| `GIT_SSH_COMMAND` | network proxy on macOS/test | macOS/test-specific Git SSH command env key constant。[E: codex-rs/network-proxy/src/proxy.rs:369][E: codex-rs/network-proxy/src/proxy.rs:370] | `network-proxy/src/proxy.rs` |
| `NO_PROXY`, `no_proxy`, `npm_config_noproxy`, `NPM_CONFIG_NOPROXY`, `YARN_NO_PROXY`, `BUNDLE_NO_PROXY` | managed network proxy exclusions | `NO_PROXY_ENV_KEYS` lists no-proxy exclusion variables。[E: codex-rs/network-proxy/src/proxy.rs:414][E: codex-rs/network-proxy/src/proxy.rs:415][E: codex-rs/network-proxy/src/proxy.rs:416][E: codex-rs/network-proxy/src/proxy.rs:417][E: codex-rs/network-proxy/src/proxy.rs:418][E: codex-rs/network-proxy/src/proxy.rs:419][E: codex-rs/network-proxy/src/proxy.rs:420] | `network-proxy/src/proxy.rs` |
| `CODEX_ESCALATE_SOCKET` | shell escalation | exec wrappers read this inherited FD env var for escalation socket。[E: codex-rs/shell-escalation/src/unix/escalate_protocol.rs:10][E: codex-rs/shell-escalation/src/unix/escalate_protocol.rs:11] | `shell-escalation/src/unix/escalate_protocol.rs` |
| `EXEC_WRAPPER` | shell escalation | patched shells use this to wrap `exec()` calls。[E: codex-rs/shell-escalation/src/unix/escalate_protocol.rs:13][E: codex-rs/shell-escalation/src/unix/escalate_protocol.rs:14] | `shell-escalation/src/unix/escalate_protocol.rs` |
| `CODEX_JS_TMP_DIR` | JS REPL child env | JS REPL inserts its temp dir into child env。[E: codex-rs/core/src/tools/js_repl/mod.rs:1038][E: codex-rs/core/src/tools/js_repl/mod.rs:1039][E: codex-rs/core/src/tools/js_repl/mod.rs:1040] | `core/src/tools/js_repl/mod.rs` |
| `CODEX_JS_REPL_NODE_MODULE_DIRS` | JS REPL child env | JS REPL joins configured node module dirs into env when non-empty and not already set。[E: codex-rs/core/src/tools/js_repl/mod.rs:1042][E: codex-rs/core/src/tools/js_repl/mod.rs:1043][E: codex-rs/core/src/tools/js_repl/mod.rs:1044][E: codex-rs/core/src/tools/js_repl/mod.rs:1046][E: codex-rs/core/src/tools/js_repl/mod.rs:1048] | `core/src/tools/js_repl/mod.rs` |
| `CODEX_JS_REPL_NODE_PATH` | JS REPL node resolver | `resolve_node()` checks this env path first and returns it when it exists。[E: codex-rs/core/src/tools/js_repl/mod.rs:2016][E: codex-rs/core/src/tools/js_repl/mod.rs:2018][E: codex-rs/core/src/tools/js_repl/mod.rs:2019] | `core/src/tools/js_repl/mod.rs` |

## TUI / terminal 环境变量

| Variable | Scope | 行为 | 定义/读取处 |
|---|---|---|---|
| `CODEX_TUI_RECORD_SESSION` | TUI session log | values `1/true/TRUE/yes/YES` enable session log recording。[E: codex-rs/tui/src/session_log.rs:81][E: codex-rs/tui/src/session_log.rs:82] | `tui/src/session_log.rs` |
| `CODEX_TUI_SESSION_LOG_PATH` | TUI session log | overrides session log output path when recording is enabled。[E: codex-rs/tui/src/session_log.rs:84][E: codex-rs/tui/src/session_log.rs:85][E: codex-rs/tui/src/session_log.rs:88][E: codex-rs/tui/src/session_log.rs:89] | `tui/src/session_log.rs` |
| `CODEX_TUI_DISABLE_KEYBOARD_ENHANCEMENT` | TUI keyboard | disables keyboard enhancement detection/path when set to accepted truthy values downstream。[E: codex-rs/tui/src/tui.rs:60][E: codex-rs/tui/src/tui.rs:65][E: codex-rs/tui/src/tui.rs:66][E: codex-rs/tui/src/tui.rs:77][E: codex-rs/tui/src/tui.rs:78][E: codex-rs/tui/src/tui.rs:88][E: codex-rs/tui/src/tui.rs:89][E: codex-rs/tui/src/tui.rs:90][E: codex-rs/tui/src/tui.rs:91] | `tui/src/tui.rs` |
| `TERM_PROGRAM` | TUI terminal detection | used to detect VS Code terminal context。[E: codex-rs/tui/src/tui.rs:111][E: codex-rs/tui/src/tui.rs:113] | `tui/src/tui.rs` |
| `CODEX_TUI_ROUNDED` | cloud tasks TUI rendering | `CODEX_TUI_ROUNDED=1` enables rounded UI; unset defaults true。[E: codex-rs/cloud-tasks/src/ui.rs:64][E: codex-rs/cloud-tasks/src/ui.rs:66][E: codex-rs/cloud-tasks/src/ui.rs:67] | `cloud-tasks/src/ui.rs` |
| `VISUAL`, `EDITOR` | external editor | external editor resolution prefers `VISUAL` over `EDITOR`。[E: codex-rs/tui/src/external_editor.rs:32][E: codex-rs/tui/src/external_editor.rs:34][E: codex-rs/tui/src/external_editor.rs:35] | `tui/src/external_editor.rs` |
| `SSH_TTY`, `SSH_CONNECTION` | clipboard/SSH detection | `is_ssh_session()` returns true if either variable exists。[E: codex-rs/tui/src/clipboard_copy.rs:129][E: codex-rs/tui/src/clipboard_copy.rs:130] | `tui/src/clipboard_copy.rs` |

## Dev / test / build support 环境变量

| Variable | Scope | 行为 | 定义/读取处 |
|---|---|---|---|
| `CODEX_MANAGED_BY_NPM` | install context | presence marks install context as managed by npm。[E: codex-rs/install-context/src/lib.rs:92] | `install-context/src/lib.rs` |
| `CODEX_MANAGED_BY_BUN` | install context | presence marks install context as managed by bun。[E: codex-rs/install-context/src/lib.rs:93] | `install-context/src/lib.rs` |
| `CODEX_SQLITE_HOME` | state DB | overrides SQLite state database home directory when `config.toml` `sqlite_home` is absent; relative env value is resolved against cwd, otherwise default is `$CODEX_HOME`。[E: codex-rs/state/src/lib.rs:57][E: codex-rs/state/src/lib.rs:58][E: codex-rs/core/src/config/mod.rs:136][E: codex-rs/core/src/config/mod.rs:137][E: codex-rs/core/src/config/mod.rs:138][E: codex-rs/core/src/config/mod.rs:141][E: codex-rs/core/src/config/mod.rs:142][E: codex-rs/core/src/config/mod.rs:145][E: codex-rs/core/src/config/mod.rs:2083][E: codex-rs/core/src/config/mod.rs:2084][E: codex-rs/core/src/config/mod.rs:2087][E: codex-rs/core/src/config/mod.rs:2088][E: codex-rs/config/src/config_toml.rs:231][E: codex-rs/config/src/config_toml.rs:232] | `state/src/lib.rs`, `core/src/config/mod.rs`, `config/src/config_toml.rs` |
| `CODEX_ABSOLUTE_PATH_REMOVED_CWD_CHILD` | test-only absolute path utility | ignored test child process uses this variable in the removed-current-directory absolute path test。[E: codex-rs/utils/absolute-path/src/lib.rs:348][E: codex-rs/utils/absolute-path/src/lib.rs:352][E: codex-rs/utils/absolute-path/src/lib.rs:361][E: codex-rs/utils/absolute-path/src/lib.rs:363][E: codex-rs/utils/absolute-path/src/lib.rs:364] | `utils/absolute-path/src/lib.rs` |
| `BAZEL_PACKAGE` | build/runfiles | compile-time env var used by Bazel runfile resolution。[E: codex-rs/utils/cargo-bin/src/lib.rs:124][E: codex-rs/utils/cargo-bin/src/lib.rs:127] | `utils/cargo-bin/src/lib.rs` |
| `CODEX_REPO_ROOT_MARKER` | build/runfiles | compile-time env var used to locate repo root marker under Bazel runfiles。[E: codex-rs/utils/cargo-bin/src/lib.rs:169][E: codex-rs/utils/cargo-bin/src/lib.rs:170][E: codex-rs/utils/cargo-bin/src/lib.rs:172][E: codex-rs/utils/cargo-bin/src/lib.rs:180] | `utils/cargo-bin/src/lib.rs` |
| `TRACEPARENT`, `TRACESTATE` | OpenTelemetry trace context | W3C trace context env variable names。[E: codex-rs/otel/src/trace_context.rs:15][E: codex-rs/otel/src/trace_context.rs:16] | `otel/src/trace_context.rs` |

## 设计动机速记

- Codex-specific overrides often use `CODEX_` prefix (`CODEX_HOME`, `CODEX_CA_CERTIFICATE`, `CODEX_EXEC_SERVER_URL`, `CODEX_NETWORK_PROXY_ACTIVE`) while standard ecosystem variables (`OPENAI_API_KEY`, `HTTP_PROXY`, `NO_PROXY`, `VISUAL`, `EDITOR`, `TRACEPARENT`) are honored where they align with user expectations。[I]
- Debug-only app-server/cloud-task variables are guarded by `#[cfg(debug_assertions)]` at read sites, so release behavior should not be inferred from those hooks。[E: codex-rs/app-server/src/main.rs:70][E: codex-rs/app-server/src/main.rs:81][E: codex-rs/app-server/src/codex_message_processor.rs:1333][E: codex-rs/cloud-tasks/src/lib.rs:44][I]
- Env vars that alter security boundaries are modeled as markers or explicit URLs/paths; examples include sandbox markers, exec-server URL, custom CA path, connector token marker, network proxy markers, and shell escalation socket/wrapper。[E: codex-rs/core/src/spawn.rs:20][E: codex-rs/core/src/spawn.rs:25][E: codex-rs/exec-server/src/environment.rs:14][E: codex-rs/codex-client/src/custom_ca.rs:61][E: codex-rs/codex-mcp/src/mcp/mod.rs:47][E: codex-rs/network-proxy/src/proxy.rs:366][E: codex-rs/shell-escalation/src/unix/escalate_protocol.rs:11][E: codex-rs/shell-escalation/src/unix/escalate_protocol.rs:14][I]

## Sources

- `codex-rs/login/src/auth/manager.rs`
- `codex-rs/model-provider-info/src/lib.rs`
- `codex-rs/model-provider/src/amazon_bedrock/auth.rs`
- `codex-rs/utils/home-dir/src/lib.rs`
- `codex-rs/app-server/src/main.rs`
- `codex-rs/app-server/src/codex_message_processor.rs`
- `codex-rs/cloud-tasks/src/lib.rs`
- `codex-rs/core/src/spawn.rs`
- `codex-rs/exec-server/src/environment.rs`
- `codex-rs/codex-client/src/custom_ca.rs`
- `codex-rs/codex-mcp/src/mcp/mod.rs`
- `codex-rs/network-proxy/src/proxy.rs`
- `codex-rs/network-proxy/src/runtime.rs`
- `codex-rs/core/src/tools/js_repl/mod.rs`
- `codex-rs/shell-escalation/src/unix/escalate_protocol.rs`
- `codex-rs/tui/src/session_log.rs`
- `codex-rs/tui/src/tui.rs`
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
