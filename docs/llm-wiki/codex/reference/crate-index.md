---
id: ref.crate-index
title: codex-rs crate workspace 索引
kind: reference
tier: T3
source: [codex-rs/Cargo.toml]
symbols: [workspace.members, workspace.package, workspace.dependencies]
related: [spine.overview, ref.key-types, ref.feature-flags, ref.env-vars]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> `codex-rs/Cargo.toml` 定义 Rust workspace：`members` 数组从 line 2 开始并在 line 100 闭合，当前表格计数为 97 个 workspace crate[I]；resolver 是 `"2"`，workspace package edition 是 Rust 2024，license 是 Apache-2.0。[E: codex-rs/Cargo.toml:1][E: codex-rs/Cargo.toml:2][E: codex-rs/Cargo.toml:100][E: codex-rs/Cargo.toml:101][E: codex-rs/Cargo.toml:109][E: codex-rs/Cargo.toml:110]

## 能回答的问题

- codex-rs workspace 中有哪些 crate?
- 某个 crate 在 workspace `members` 的哪一行登记?
- `utils/*` 子 crate 有哪些?
- workspace package 的 edition/license 是什么?
- workspace dependencies 从哪里开始定义?

## Workspace 元数据

| Symbol | 值 | 含义 | 定义处 |
|---|---|---|---|
| `[workspace].members` | 97 entries [I] | Cargo workspace member list；`members` 从 line 2 开始，成员行覆盖 line 3 到 line 99，line 100 闭合。[E: codex-rs/Cargo.toml:1][E: codex-rs/Cargo.toml:2][E: codex-rs/Cargo.toml:3][E: codex-rs/Cargo.toml:99][E: codex-rs/Cargo.toml:100] | `codex-rs/Cargo.toml` |
| `[workspace].resolver` | `"2"` | 使用 Cargo resolver 2。[E: codex-rs/Cargo.toml:101] | `codex-rs/Cargo.toml` |
| `[workspace.package].edition` | `"2024"` | 注释说明 `cargo new -w ...` 创建的新 crate 会自动继承 Rust 2024 edition。[E: codex-rs/Cargo.toml:103][E: codex-rs/Cargo.toml:107][E: codex-rs/Cargo.toml:108][E: codex-rs/Cargo.toml:109] | `codex-rs/Cargo.toml` |
| `[workspace.package].license` | `"Apache-2.0"` | workspace package license。[E: codex-rs/Cargo.toml:110] | `codex-rs/Cargo.toml` |
| `[workspace.dependencies]` | starts at line 112 | workspace dependency table；内部 path dependency 从 internal section 开始，external version dependency 从 external section 开始。[E: codex-rs/Cargo.toml:112][E: codex-rs/Cargo.toml:113][E: codex-rs/Cargo.toml:114][E: codex-rs/Cargo.toml:212][E: codex-rs/Cargo.toml:213] | `codex-rs/Cargo.toml` |

## Workspace members 全量表

| # | Member path | 领域速记 | 定义处 |
|---:|---|---|---|
| 1 | `aws-auth` | AWS auth helper crate。[I] | [E: codex-rs/Cargo.toml:3] |
| 2 | `analytics` | analytics event/fact support。[I] | [E: codex-rs/Cargo.toml:4] |
| 3 | `agent-identity` | agent identity support。[I] | [E: codex-rs/Cargo.toml:5] |
| 4 | `backend-client` | backend client layer。[I] | [E: codex-rs/Cargo.toml:6] |
| 5 | `ansi-escape` | ANSI escape utility crate。[I] | [E: codex-rs/Cargo.toml:7] |
| 6 | `async-utils` | async helper utilities。[I] | [E: codex-rs/Cargo.toml:8] |
| 7 | `app-server` | Codex app-server binary/runtime。[I] | [E: codex-rs/Cargo.toml:9] |
| 8 | `app-server-client` | app-server client crate。[I] | [E: codex-rs/Cargo.toml:10] |
| 9 | `app-server-protocol` | app-server protocol types。[I] | [E: codex-rs/Cargo.toml:11] |
| 10 | `app-server-test-client` | app-server integration test client。[I] | [E: codex-rs/Cargo.toml:12] |
| 11 | `debug-client` | debug client tooling。[I] | [E: codex-rs/Cargo.toml:13] |
| 12 | `apply-patch` | patch parsing/application engine。[I] | [E: codex-rs/Cargo.toml:14] |
| 13 | `arg0` | argv0 dispatch/bootstrap support。[I] | [E: codex-rs/Cargo.toml:15] |
| 14 | `feedback` | feedback support crate。[I] | [E: codex-rs/Cargo.toml:16] |
| 15 | `features` | feature flag registry and resolver。[I] | [E: codex-rs/Cargo.toml:17] |
| 16 | `install-context` | install manager/source detection。[I] | [E: codex-rs/Cargo.toml:18] |
| 17 | `codex-backend-openapi-models` | generated/openapi backend models。[I] | [E: codex-rs/Cargo.toml:19] |
| 18 | `code-mode` | code mode runtime support。[I] | [E: codex-rs/Cargo.toml:20] |
| 19 | `cloud-requirements` | cloud task requirements support。[I] | [E: codex-rs/Cargo.toml:21] |
| 20 | `cloud-tasks` | cloud task UI/runtime。[I] | [E: codex-rs/Cargo.toml:22] |
| 21 | `cloud-tasks-client` | cloud task backend client。[I] | [E: codex-rs/Cargo.toml:23] |
| 22 | `cloud-tasks-mock-client` | mock cloud tasks client。[I] | [E: codex-rs/Cargo.toml:24] |
| 23 | `cli` | Codex CLI entrypoint。[I] | [E: codex-rs/Cargo.toml:25] |
| 24 | `collaboration-mode-templates` | collaboration mode prompt templates。[I] | [E: codex-rs/Cargo.toml:26] |
| 25 | `connectors` | connector/app integration support。[I] | [E: codex-rs/Cargo.toml:27] |
| 26 | `config` | shared config primitives。[I] | [E: codex-rs/Cargo.toml:28] |
| 27 | `device-key` | device key support。[I] | [E: codex-rs/Cargo.toml:29] |
| 28 | `shell-command` | shell command parsing/execution helpers。[I] | [E: codex-rs/Cargo.toml:30] |
| 29 | `shell-escalation` | shell exec escalation protocol。[I] | [E: codex-rs/Cargo.toml:31] |
| 30 | `skills` | Codex skill loading/runtime。[I] | [E: codex-rs/Cargo.toml:32] |
| 31 | `core` | Codex core session/turn/tool engine。[I] | [E: codex-rs/Cargo.toml:33] |
| 32 | `core-plugins` | core plugin integration。[I] | [E: codex-rs/Cargo.toml:34] |
| 33 | `core-skills` | core skill integration。[I] | [E: codex-rs/Cargo.toml:35] |
| 34 | `hooks` | lifecycle hook support。[I] | [E: codex-rs/Cargo.toml:36] |
| 35 | `secrets` | secrets management support。[I] | [E: codex-rs/Cargo.toml:37] |
| 36 | `exec` | exec tool implementation support。[I] | [E: codex-rs/Cargo.toml:38] |
| 37 | `exec-server` | remote/local execution environment server。[I] | [E: codex-rs/Cargo.toml:39] |
| 38 | `execpolicy` | exec policy DSL/runtime。[I] | [E: codex-rs/Cargo.toml:40] |
| 39 | `execpolicy-legacy` | legacy execpolicy support。[I] | [E: codex-rs/Cargo.toml:41] |
| 40 | `keyring-store` | credential keyring storage。[I] | [E: codex-rs/Cargo.toml:42] |
| 41 | `file-search` | file search subsystem。[I] | [E: codex-rs/Cargo.toml:43] |
| 42 | `linux-sandbox` | Linux sandbox runner/support。[I] | [E: codex-rs/Cargo.toml:44] |
| 43 | `lmstudio` | LM Studio provider integration。[I] | [E: codex-rs/Cargo.toml:45] |
| 44 | `login` | auth/login flows and auth manager。[I] | [E: codex-rs/Cargo.toml:46] |
| 45 | `codex-mcp` | MCP client/connector integration。[I] | [E: codex-rs/Cargo.toml:47] |
| 46 | `mcp-server` | MCP server implementation。[I] | [E: codex-rs/Cargo.toml:48] |
| 47 | `model-provider-info` | provider metadata/catalog。[I] | [E: codex-rs/Cargo.toml:49] |
| 48 | `models-manager` | model catalog/selection manager。[I] | [E: codex-rs/Cargo.toml:50] |
| 49 | `network-proxy` | managed network proxy/audit support。[I] | [E: codex-rs/Cargo.toml:51] |
| 50 | `ollama` | Ollama provider integration。[I] | [E: codex-rs/Cargo.toml:52] |
| 51 | `process-hardening` | process hardening utilities。[I] | [E: codex-rs/Cargo.toml:53] |
| 52 | `protocol` | shared wire protocol/data model。[I] | [E: codex-rs/Cargo.toml:54] |
| 53 | `realtime-webrtc` | realtime WebRTC support。[I] | [E: codex-rs/Cargo.toml:55] |
| 54 | `rollout` | rollout transcript persistence。[I] | [E: codex-rs/Cargo.toml:56] |
| 55 | `rollout-trace` | rollout trace support。[I] | [E: codex-rs/Cargo.toml:57] |
| 56 | `rmcp-client` | RMCP client wrapper。[I] | [E: codex-rs/Cargo.toml:58] |
| 57 | `responses-api-proxy` | Responses API proxy support。[I] | [E: codex-rs/Cargo.toml:59] |
| 58 | `response-debug-context` | response debug context support。[I] | [E: codex-rs/Cargo.toml:60] |
| 59 | `sandboxing` | cross-platform sandbox abstraction。[I] | [E: codex-rs/Cargo.toml:61] |
| 60 | `stdio-to-uds` | stdio-to-Unix-domain-socket bridge。[I] | [E: codex-rs/Cargo.toml:62] |
| 61 | `otel` | OpenTelemetry tracing/metrics support。[I] | [E: codex-rs/Cargo.toml:63] |
| 62 | `tui` | terminal UI app。[I] | [E: codex-rs/Cargo.toml:64] |
| 63 | `tools` | model-visible tool specs/config/registry plan。[I] | [E: codex-rs/Cargo.toml:65] |
| 64 | `v8-poc` | V8 proof-of-concept crate。[I] | [E: codex-rs/Cargo.toml:66] |
| 65 | `utils/absolute-path` | absolute path utility crate。[I] | [E: codex-rs/Cargo.toml:67] |
| 66 | `utils/cargo-bin` | locate cargo/bazel runfiles and binaries。[I] | [E: codex-rs/Cargo.toml:68] |
| 67 | `git-utils` | git utilities。[I] | [E: codex-rs/Cargo.toml:69] |
| 68 | `utils/cache` | cache utility crate。[I] | [E: codex-rs/Cargo.toml:70] |
| 69 | `utils/image` | image utility crate。[I] | [E: codex-rs/Cargo.toml:71] |
| 70 | `utils/json-to-toml` | JSON to TOML utility crate。[I] | [E: codex-rs/Cargo.toml:72] |
| 71 | `utils/home-dir` | `CODEX_HOME` / home-dir resolution utility。[I] | [E: codex-rs/Cargo.toml:73] |
| 72 | `utils/pty` | PTY utility crate。[I] | [E: codex-rs/Cargo.toml:74] |
| 73 | `utils/readiness` | readiness flag/token utilities。[I] | [E: codex-rs/Cargo.toml:75] |
| 74 | `utils/rustls-provider` | rustls provider utility。[I] | [E: codex-rs/Cargo.toml:76] |
| 75 | `utils/string` | string utilities。[I] | [E: codex-rs/Cargo.toml:77] |
| 76 | `utils/cli` | CLI utility helpers。[I] | [E: codex-rs/Cargo.toml:78] |
| 77 | `utils/elapsed` | elapsed-time utility crate。[I] | [E: codex-rs/Cargo.toml:79] |
| 78 | `utils/sandbox-summary` | sandbox summary utility。[I] | [E: codex-rs/Cargo.toml:80] |
| 79 | `utils/sleep-inhibitor` | prevent-idle-sleep utility。[I] | [E: codex-rs/Cargo.toml:81] |
| 80 | `utils/approval-presets` | approval preset helpers。[I] | [E: codex-rs/Cargo.toml:82] |
| 81 | `utils/oss` | OSS provider/runtime utility。[I] | [E: codex-rs/Cargo.toml:83] |
| 82 | `utils/output-truncation` | output truncation utility。[I] | [E: codex-rs/Cargo.toml:84] |
| 83 | `utils/path-utils` | path utility crate。[I] | [E: codex-rs/Cargo.toml:85] |
| 84 | `utils/plugins` | plugin utility crate。[I] | [E: codex-rs/Cargo.toml:86] |
| 85 | `utils/fuzzy-match` | fuzzy match utility。[I] | [E: codex-rs/Cargo.toml:87] |
| 86 | `utils/stream-parser` | streaming parser utility。[I] | [E: codex-rs/Cargo.toml:88] |
| 87 | `utils/template` | template rendering/parsing utility。[I] | [E: codex-rs/Cargo.toml:89] |
| 88 | `codex-client` | Codex HTTP/TLS client support。[I] | [E: codex-rs/Cargo.toml:90] |
| 89 | `codex-api` | Codex API crate。[I] | [E: codex-rs/Cargo.toml:91] |
| 90 | `state` | SQLite state/logs database support。[I] | [E: codex-rs/Cargo.toml:92] |
| 91 | `terminal-detection` | terminal environment detection。[I] | [E: codex-rs/Cargo.toml:93] |
| 92 | `test-binary-support` | test binary helper crate。[I] | [E: codex-rs/Cargo.toml:94] |
| 93 | `thread-store` | persisted thread storage。[I] | [E: codex-rs/Cargo.toml:95] |
| 94 | `uds` | Unix-domain-socket support。[I] | [E: codex-rs/Cargo.toml:96] |
| 95 | `codex-experimental-api-macros` | experimental API macros。[I] | [E: codex-rs/Cargo.toml:97] |
| 96 | `plugin` | plugin runtime/manifest support。[I] | [E: codex-rs/Cargo.toml:98] |
| 97 | `model-provider` | model provider trait/implementations。[I] | [E: codex-rs/Cargo.toml:99] |

## Crate group速查

- core runtime group: `core`, `protocol`, `tools`, `features`, `config`, `login`, `models-manager`, `model-provider`, `model-provider-info`。[I]
- execution/sandbox group: `exec`, `exec-server`, `execpolicy`, `execpolicy-legacy`, `sandboxing`, `linux-sandbox`, `shell-command`, `shell-escalation`, `process-hardening`。[I]
- UI/app/cloud group: `tui`, `app-server`, `app-server-client`, `app-server-protocol`, `cloud-tasks`, `cloud-tasks-client`, `cloud-requirements`。[I]
- integration group: `codex-mcp`, `mcp-server`, `connectors`, `skills`, `core-skills`, `plugin`, `core-plugins`, `hooks`。[I]
- utils group: every member under `utils/*` plus root utility crates like `git-utils`, `terminal-detection`, `state`, `thread-store`。[I]

## Sources

- `codex-rs/Cargo.toml`

## 相关

- [spine.overview](../spine/overview.md)
- [ref.key-types](key-types.md)
- [ref.feature-flags](feature-flags.md)
- [ref.env-vars](env-vars.md)
