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
updated: 9ded177ce7
---

> `codex-rs/Cargo.toml` defines the Rust workspace: the current `members` array contains 134 workspace member paths through line 136, uses Cargo resolver `"2"`, and centralizes workspace package version, edition, license, and dependency declarations.[E: codex-rs/Cargo.toml:1][E: codex-rs/Cargo.toml:2][E: codex-rs/Cargo.toml:3][E: codex-rs/Cargo.toml:136][E: codex-rs/Cargo.toml:138][E: codex-rs/Cargo.toml:140][E: codex-rs/Cargo.toml:141][E: codex-rs/Cargo.toml:146][E: codex-rs/Cargo.toml:147][E: codex-rs/Cargo.toml:149]

## 能回答的问题

- 当前 `codex-rs` workspace 中有哪些 member paths?
- 某个 workspace member 在 `codex-rs/Cargo.toml` 的哪一行登记?
- workspace member count 当前是多少?
- workspace resolver、package version、edition、license 在哪里定义?
- `[workspace.dependencies]` 从哪里开始?

## Workspace 元数据

| Symbol | 当前值 | 说明 | 定义处 |
|---|---|---|---|
| `[workspace].members` | 134 entries | `members` starts at line 2 and member entries cover line 3 through line 136. | [E: codex-rs/Cargo.toml:1][E: codex-rs/Cargo.toml:2][E: codex-rs/Cargo.toml:3][E: codex-rs/Cargo.toml:136] |
| `[workspace].resolver` | `"2"` | Cargo resolver setting for the workspace. | [E: codex-rs/Cargo.toml:138] |
| `[workspace.package].version` | `"0.0.0"` | Shared workspace package version. | [E: codex-rs/Cargo.toml:141] |
| `[workspace.package].edition` | `"2024"` | Shared workspace package edition. | [E: codex-rs/Cargo.toml:146] |
| `[workspace.package].license` | `"Apache-2.0"` | Shared workspace package license. | [E: codex-rs/Cargo.toml:147] |
| `[workspace.dependencies]` | starts at line 149 | Workspace dependency table; the first dependency entry follows at line 151. | [E: codex-rs/Cargo.toml:149][E: codex-rs/Cargo.toml:151] |

相对 `7750465934`，workspace members 从 128 增到 134：新增 `build-info`、`diagnostics`、`history`、`ext/guardian-v2`、`ext/queue`、`workload-identity`、`utils/audio`；移除 `core-skills`。[E: codex-rs/Cargo.toml:9][E: codex-rs/Cargo.toml:45][E: codex-rs/Cargo.toml:47][E: codex-rs/Cargo.toml:62][E: codex-rs/Cargo.toml:67][E: codex-rs/Cargo.toml:100][E: codex-rs/Cargo.toml:102][I]

## Workspace members 全量表

| # | Member path | Entry type | 定义处 |
|---:|---|---|---|
| 1 | `aws-auth` | Workspace member entry | [E: codex-rs/Cargo.toml:3] |
| 2 | `analytics` | Workspace member entry | [E: codex-rs/Cargo.toml:4] |
| 3 | `agent-graph-store` | Workspace member entry | [E: codex-rs/Cargo.toml:5] |
| 4 | `agent-identity` | Workspace member entry | [E: codex-rs/Cargo.toml:6] |
| 5 | `backend-client` | Workspace member entry | [E: codex-rs/Cargo.toml:7] |
| 6 | `bwrap` | Workspace member entry | [E: codex-rs/Cargo.toml:8] |
| 7 | `build-info` | Workspace member entry | [E: codex-rs/Cargo.toml:9] |
| 8 | `ansi-escape` | Workspace member entry | [E: codex-rs/Cargo.toml:10] |
| 9 | `async-utils` | Workspace member entry | [E: codex-rs/Cargo.toml:11] |
| 10 | `app-server` | Workspace member entry | [E: codex-rs/Cargo.toml:12] |
| 11 | `app-server-transport` | Workspace member entry | [E: codex-rs/Cargo.toml:13] |
| 12 | `app-server-daemon` | Workspace member entry | [E: codex-rs/Cargo.toml:14] |
| 13 | `app-server-client` | Workspace member entry | [E: codex-rs/Cargo.toml:15] |
| 14 | `app-server-protocol` | Workspace member entry | [E: codex-rs/Cargo.toml:16] |
| 15 | `app-server-protocol-noop-macros` | Workspace member entry | [E: codex-rs/Cargo.toml:17] |
| 16 | `app-server-test-client` | Workspace member entry | [E: codex-rs/Cargo.toml:18] |
| 17 | `apply-patch` | Workspace member entry | [E: codex-rs/Cargo.toml:19] |
| 18 | `arg0` | Workspace member entry | [E: codex-rs/Cargo.toml:20] |
| 19 | `feedback` | Workspace member entry | [E: codex-rs/Cargo.toml:21] |
| 20 | `features` | Workspace member entry | [E: codex-rs/Cargo.toml:22] |
| 21 | `install-context` | Workspace member entry | [E: codex-rs/Cargo.toml:23] |
| 22 | `codex-backend-openapi-models` | Workspace member entry | [E: codex-rs/Cargo.toml:24] |
| 23 | `code-mode` | Workspace member entry | [E: codex-rs/Cargo.toml:25] |
| 24 | `code-mode-host` | Workspace member entry | [E: codex-rs/Cargo.toml:26] |
| 25 | `code-mode-protocol` | Workspace member entry | [E: codex-rs/Cargo.toml:27] |
| 26 | `code-mode-runtime` | Workspace member entry | [E: codex-rs/Cargo.toml:28] |
| 27 | `codex-home` | Workspace member entry | [E: codex-rs/Cargo.toml:29] |
| 28 | `cloud-config` | Workspace member entry | [E: codex-rs/Cargo.toml:30] |
| 29 | `cloud-tasks` | Workspace member entry | [E: codex-rs/Cargo.toml:31] |
| 30 | `cloud-tasks-client` | Workspace member entry | [E: codex-rs/Cargo.toml:32] |
| 31 | `cloud-tasks-mock-client` | Workspace member entry | [E: codex-rs/Cargo.toml:33] |
| 32 | `cli` | Workspace member entry | [E: codex-rs/Cargo.toml:34] |
| 33 | `collaboration-mode-templates` | Workspace member entry | [E: codex-rs/Cargo.toml:35] |
| 34 | `connectors` | Workspace member entry | [E: codex-rs/Cargo.toml:36] |
| 35 | `config` | Workspace member entry | [E: codex-rs/Cargo.toml:37] |
| 36 | `context-fragments` | Workspace member entry | [E: codex-rs/Cargo.toml:38] |
| 37 | `shell-command` | Workspace member entry | [E: codex-rs/Cargo.toml:39] |
| 38 | `shell-escalation` | Workspace member entry | [E: codex-rs/Cargo.toml:40] |
| 39 | `skills` | Workspace member entry | [E: codex-rs/Cargo.toml:41] |
| 40 | `core` | Workspace member entry | [E: codex-rs/Cargo.toml:42] |
| 41 | `core-api` | Workspace member entry | [E: codex-rs/Cargo.toml:43] |
| 42 | `core-plugins` | Workspace member entry | [E: codex-rs/Cargo.toml:44] |
| 43 | `diagnostics` | Workspace member entry | [E: codex-rs/Cargo.toml:45] |
| 44 | `hooks` | Workspace member entry | [E: codex-rs/Cargo.toml:46] |
| 45 | `history` | Workspace member entry | [E: codex-rs/Cargo.toml:47] |
| 46 | `http-client` | Workspace member entry | [E: codex-rs/Cargo.toml:48] |
| 47 | `secrets` | Workspace member entry | [E: codex-rs/Cargo.toml:49] |
| 48 | `exec` | Workspace member entry | [E: codex-rs/Cargo.toml:50] |
| 49 | `file-system` | Workspace member entry | [E: codex-rs/Cargo.toml:51] |
| 50 | `exec-server-protocol` | Workspace member entry | [E: codex-rs/Cargo.toml:52] |
| 51 | `exec-server` | Workspace member entry | [E: codex-rs/Cargo.toml:53] |
| 52 | `exec-server/tests/support` | Workspace member entry | [E: codex-rs/Cargo.toml:54] |
| 53 | `execpolicy` | Workspace member entry | [E: codex-rs/Cargo.toml:55] |
| 54 | `ext/agent` | Workspace member entry | [E: codex-rs/Cargo.toml:56] |
| 55 | `ext/connectors` | Workspace member entry | [E: codex-rs/Cargo.toml:57] |
| 56 | `ext/extension-api` | Workspace member entry | [E: codex-rs/Cargo.toml:58] |
| 57 | `ext/goal` | Workspace member entry | [E: codex-rs/Cargo.toml:59] |
| 58 | `ext/git-attribution` | Workspace member entry | [E: codex-rs/Cargo.toml:60] |
| 59 | `ext/guardian` | Workspace member entry | [E: codex-rs/Cargo.toml:61] |
| 60 | `ext/guardian-v2` | Workspace member entry | [E: codex-rs/Cargo.toml:62] |
| 61 | `ext/image-generation` | Workspace member entry | [E: codex-rs/Cargo.toml:63] |
| 62 | `ext/items` | Workspace member entry | [E: codex-rs/Cargo.toml:64] |
| 63 | `ext/memories` | Workspace member entry | [E: codex-rs/Cargo.toml:65] |
| 64 | `ext/mcp` | Workspace member entry | [E: codex-rs/Cargo.toml:66] |
| 65 | `ext/queue` | Workspace member entry | [E: codex-rs/Cargo.toml:67] |
| 66 | `ext/skills` | Workspace member entry | [E: codex-rs/Cargo.toml:68] |
| 67 | `ext/web-search` | Workspace member entry | [E: codex-rs/Cargo.toml:69] |
| 68 | `external-agent-migration` | Workspace member entry | [E: codex-rs/Cargo.toml:70] |
| 69 | `keyring-store` | Workspace member entry | [E: codex-rs/Cargo.toml:71] |
| 70 | `file-search` | Workspace member entry | [E: codex-rs/Cargo.toml:72] |
| 71 | `file-watcher` | Workspace member entry | [E: codex-rs/Cargo.toml:73] |
| 72 | `linux-sandbox` | Workspace member entry | [E: codex-rs/Cargo.toml:74] |
| 73 | `lmstudio` | Workspace member entry | [E: codex-rs/Cargo.toml:75] |
| 74 | `login` | Workspace member entry | [E: codex-rs/Cargo.toml:76] |
| 75 | `codex-mcp` | Workspace member entry | [E: codex-rs/Cargo.toml:77] |
| 76 | `mcp-server` | Workspace member entry | [E: codex-rs/Cargo.toml:78] |
| 77 | `memories/read` | Workspace member entry | [E: codex-rs/Cargo.toml:79] |
| 78 | `memories/write` | Workspace member entry | [E: codex-rs/Cargo.toml:80] |
| 79 | `model-provider-info` | Workspace member entry | [E: codex-rs/Cargo.toml:81] |
| 80 | `models-manager` | Workspace member entry | [E: codex-rs/Cargo.toml:82] |
| 81 | `network-proxy` | Workspace member entry | [E: codex-rs/Cargo.toml:83] |
| 82 | `ollama` | Workspace member entry | [E: codex-rs/Cargo.toml:84] |
| 83 | `process-hardening` | Workspace member entry | [E: codex-rs/Cargo.toml:85] |
| 84 | `protocol` | Workspace member entry | [E: codex-rs/Cargo.toml:86] |
| 85 | `prompts` | Workspace member entry | [E: codex-rs/Cargo.toml:87] |
| 86 | `rollout` | Workspace member entry | [E: codex-rs/Cargo.toml:88] |
| 87 | `rollout-trace` | Workspace member entry | [E: codex-rs/Cargo.toml:89] |
| 88 | `rmcp-client` | Workspace member entry | [E: codex-rs/Cargo.toml:90] |
| 89 | `responses-api-proxy` | Workspace member entry | [E: codex-rs/Cargo.toml:91] |
| 90 | `response-debug-context` | Workspace member entry | [E: codex-rs/Cargo.toml:92] |
| 91 | `sandboxing` | Workspace member entry | [E: codex-rs/Cargo.toml:93] |
| 92 | `stdio-to-uds` | Workspace member entry | [E: codex-rs/Cargo.toml:94] |
| 93 | `otel` | Workspace member entry | [E: codex-rs/Cargo.toml:95] |
| 94 | `tui` | Workspace member entry | [E: codex-rs/Cargo.toml:96] |
| 95 | `tools` | Workspace member entry | [E: codex-rs/Cargo.toml:97] |
| 96 | `v8-poc` | Workspace member entry | [E: codex-rs/Cargo.toml:98] |
| 97 | `websocket-client` | Workspace member entry | [E: codex-rs/Cargo.toml:99] |
| 98 | `workload-identity` | Workspace member entry | [E: codex-rs/Cargo.toml:100] |
| 99 | `utils/absolute-path` | Workspace member entry | [E: codex-rs/Cargo.toml:101] |
| 100 | `utils/audio` | Workspace member entry | [E: codex-rs/Cargo.toml:102] |
| 101 | `utils/path-uri` | Workspace member entry | [E: codex-rs/Cargo.toml:103] |
| 102 | `utils/cargo-bin` | Workspace member entry | [E: codex-rs/Cargo.toml:104] |
| 103 | `git-utils` | Workspace member entry | [E: codex-rs/Cargo.toml:105] |
| 104 | `utils/cache` | Workspace member entry | [E: codex-rs/Cargo.toml:106] |
| 105 | `utils/image` | Workspace member entry | [E: codex-rs/Cargo.toml:107] |
| 106 | `utils/json-to-toml` | Workspace member entry | [E: codex-rs/Cargo.toml:108] |
| 107 | `utils/home-dir` | Workspace member entry | [E: codex-rs/Cargo.toml:109] |
| 108 | `utils/pty` | Workspace member entry | [E: codex-rs/Cargo.toml:110] |
| 109 | `utils/readiness` | Workspace member entry | [E: codex-rs/Cargo.toml:111] |
| 110 | `utils/rustls-provider` | Workspace member entry | [E: codex-rs/Cargo.toml:112] |
| 111 | `utils/string` | Workspace member entry | [E: codex-rs/Cargo.toml:113] |
| 112 | `utils/cli` | Workspace member entry | [E: codex-rs/Cargo.toml:114] |
| 113 | `utils/elapsed` | Workspace member entry | [E: codex-rs/Cargo.toml:115] |
| 114 | `utils/sandbox-summary` | Workspace member entry | [E: codex-rs/Cargo.toml:116] |
| 115 | `utils/sleep-inhibitor` | Workspace member entry | [E: codex-rs/Cargo.toml:117] |
| 116 | `utils/approval-presets` | Workspace member entry | [E: codex-rs/Cargo.toml:118] |
| 117 | `utils/oss` | Workspace member entry | [E: codex-rs/Cargo.toml:119] |
| 118 | `utils/output-truncation` | Workspace member entry | [E: codex-rs/Cargo.toml:120] |
| 119 | `utils/path-utils` | Workspace member entry | [E: codex-rs/Cargo.toml:121] |
| 120 | `utils/plugins` | Workspace member entry | [E: codex-rs/Cargo.toml:122] |
| 121 | `utils/fuzzy-match` | Workspace member entry | [E: codex-rs/Cargo.toml:123] |
| 122 | `utils/stream-parser` | Workspace member entry | [E: codex-rs/Cargo.toml:124] |
| 123 | `utils/template` | Workspace member entry | [E: codex-rs/Cargo.toml:125] |
| 124 | `codex-client` | Workspace member entry | [E: codex-rs/Cargo.toml:126] |
| 125 | `codex-api` | Workspace member entry | [E: codex-rs/Cargo.toml:127] |
| 126 | `state` | Workspace member entry | [E: codex-rs/Cargo.toml:128] |
| 127 | `terminal-detection` | Workspace member entry | [E: codex-rs/Cargo.toml:129] |
| 128 | `test-binary-support` | Workspace member entry | [E: codex-rs/Cargo.toml:130] |
| 129 | `thread-manager-sample` | Workspace member entry | [E: codex-rs/Cargo.toml:131] |
| 130 | `thread-store` | Workspace member entry | [E: codex-rs/Cargo.toml:132] |
| 131 | `uds` | Workspace member entry | [E: codex-rs/Cargo.toml:133] |
| 132 | `codex-experimental-api-macros` | Workspace member entry | [E: codex-rs/Cargo.toml:134] |
| 133 | `plugin` | Workspace member entry | [E: codex-rs/Cargo.toml:135] |
| 134 | `model-provider` | Workspace member entry | [E: codex-rs/Cargo.toml:136] |

## Sources

- `codex-rs/Cargo.toml`

## 相关

- [spine.overview](../spine/overview.md)
- [ref.key-types](key-types.md)
- [ref.feature-flags](feature-flags.md)
- [ref.env-vars](env-vars.md)
