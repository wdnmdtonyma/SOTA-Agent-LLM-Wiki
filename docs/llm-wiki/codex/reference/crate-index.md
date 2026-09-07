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
updated: 121f91fd5d
---

> `codex-rs/Cargo.toml` 定义 Rust workspace：当前 `members` 数组含 145 个 workspace member path（第 3–147 行），resolver 为 `"2"`，并集中声明 workspace package version / edition / license 与 `[workspace.dependencies]`。[E: codex-rs/Cargo.toml:1][E: codex-rs/Cargo.toml:2][E: codex-rs/Cargo.toml:3][E: codex-rs/Cargo.toml:147][E: codex-rs/Cargo.toml:149][E: codex-rs/Cargo.toml:152][E: codex-rs/Cargo.toml:157][E: codex-rs/Cargo.toml:158][E: codex-rs/Cargo.toml:160]

## 能回答的问题

- 当前 `codex-rs` workspace 中有哪些 member paths?
- 某个 workspace member 在 `codex-rs/Cargo.toml` 的哪一行登记?
- workspace member count 当前是多少?
- workspace resolver、package version、edition、license 在哪里定义?
- `[workspace.dependencies]` 从哪里开始?

## Workspace 元数据

| Symbol | 当前值 | 说明 | 定义处 |
|---|---|---|---|
| `[workspace].members` | 145 entries | `members` 从第 2 行开始，member entries 覆盖第 3–147 行。 | [E: codex-rs/Cargo.toml:1][E: codex-rs/Cargo.toml:2][E: codex-rs/Cargo.toml:3][E: codex-rs/Cargo.toml:147] |
| `[workspace].resolver` | `"2"` | Cargo resolver setting for the workspace. | [E: codex-rs/Cargo.toml:149] |
| `[workspace.package].version` | `"0.0.0"` | Shared workspace package version. | [E: codex-rs/Cargo.toml:152] |
| `[workspace.package].edition` | `"2024"` | Shared workspace package edition. | [E: codex-rs/Cargo.toml:157] |
| `[workspace.package].license` | `"Apache-2.0"` | Shared workspace package license. | [E: codex-rs/Cargo.toml:158] |
| `[workspace.dependencies]` | starts at line 160 | Workspace dependency table。 | [E: codex-rs/Cargo.toml:160] |

相对 `a9519cbcdd` 的 138 members：删除 `mcp-server`，新增 `attachment-store`、`config-schema`、`mxc-sandbox`、`otel-trace-websocket`、`realtime-webrtc`、`utils/git-discovery`、`voice-host`、`windows-sandbox-service`（138 − 1 + 8 = 145）。[E: codex-rs/Cargo.toml:13][E: codex-rs/Cargo.toml:42][E: codex-rs/Cargo.toml:82][E: codex-rs/Cargo.toml:88][E: codex-rs/Cargo.toml:94][E: codex-rs/Cargo.toml:95][E: codex-rs/Cargo.toml:108][E: codex-rs/Cargo.toml:113][E: codex-rs/Cargo.toml:123]

`mcp-server` crate 与 `codex mcp-server` 子命令已不在 workspace。MCP **client** crates `codex-mcp` 与 `rmcp-client` 仍是 members。[E: codex-rs/Cargo.toml:81][E: codex-rs/Cargo.toml:100]

## Workspace members 全量表

| # | Member path | Entry type | 定义处 |
|---:|---|---|---|
| 1 | `aws-auth` | Workspace member entry | [E: codex-rs/Cargo.toml:3] |
| 2 | `analytics` | Workspace member entry | [E: codex-rs/Cargo.toml:4] |
| 3 | `agent-graph-store` | Workspace member entry | [E: codex-rs/Cargo.toml:5] |
| 4 | `agent-identity` | Workspace member entry | [E: codex-rs/Cargo.toml:6] |
| 5 | `agent-roles` | Workspace member entry | [E: codex-rs/Cargo.toml:7] |
| 6 | `backend-client` | Workspace member entry | [E: codex-rs/Cargo.toml:8] |
| 7 | `bwrap` | Workspace member entry | [E: codex-rs/Cargo.toml:9] |
| 8 | `build-info` | Workspace member entry | [E: codex-rs/Cargo.toml:10] |
| 9 | `ansi-escape` | Workspace member entry | [E: codex-rs/Cargo.toml:11] |
| 10 | `attachment-store` | Workspace member entry | [E: codex-rs/Cargo.toml:12] |
| 11 | `async-utils` | Workspace member entry | [E: codex-rs/Cargo.toml:14] |
| 12 | `app-server` | Workspace member entry | [E: codex-rs/Cargo.toml:15] |
| 13 | `app-server-transport` | Workspace member entry | [E: codex-rs/Cargo.toml:16] |
| 14 | `app-server-daemon` | Workspace member entry | [E: codex-rs/Cargo.toml:17] |
| 15 | `app-server-client` | Workspace member entry | [E: codex-rs/Cargo.toml:18] |
| 16 | `app-server-protocol` | Workspace member entry | [E: codex-rs/Cargo.toml:19] |
| 17 | `app-server-protocol-noop-macros` | Workspace member entry | [E: codex-rs/Cargo.toml:20] |
| 18 | `app-server-test-client` | Workspace member entry | [E: codex-rs/Cargo.toml:21] |
| 19 | `apply-patch` | Workspace member entry | [E: codex-rs/Cargo.toml:22] |
| 20 | `arg0` | Workspace member entry | [E: codex-rs/Cargo.toml:23] |
| 21 | `feedback` | Workspace member entry | [E: codex-rs/Cargo.toml:24] |
| 22 | `features` | Workspace member entry | [E: codex-rs/Cargo.toml:25] |
| 23 | `install-context` | Workspace member entry | [E: codex-rs/Cargo.toml:26] |
| 24 | `codex-backend-openapi-models` | Workspace member entry | [E: codex-rs/Cargo.toml:27] |
| 25 | `code-mode` | Workspace member entry | [E: codex-rs/Cargo.toml:28] |
| 26 | `code-mode-host` | Workspace member entry | [E: codex-rs/Cargo.toml:29] |
| 27 | `code-mode-protocol` | Workspace member entry | [E: codex-rs/Cargo.toml:30] |
| 28 | `code-mode-runtime` | Workspace member entry | [E: codex-rs/Cargo.toml:31] |
| 29 | `codex-home` | Workspace member entry | [E: codex-rs/Cargo.toml:32] |
| 30 | `cloud-config` | Workspace member entry | [E: codex-rs/Cargo.toml:33] |
| 31 | `cloud-tasks` | Workspace member entry | [E: codex-rs/Cargo.toml:34] |
| 32 | `cloud-tasks-client` | Workspace member entry | [E: codex-rs/Cargo.toml:35] |
| 33 | `cloud-tasks-mock-client` | Workspace member entry | [E: codex-rs/Cargo.toml:36] |
| 34 | `cli` | Workspace member entry | [E: codex-rs/Cargo.toml:37] |
| 35 | `collaboration-mode-templates` | Workspace member entry | [E: codex-rs/Cargo.toml:38] |
| 36 | `connectors` | Workspace member entry | [E: codex-rs/Cargo.toml:39] |
| 37 | `config` | Workspace member entry | [E: codex-rs/Cargo.toml:41] |
| 38 | `config-schema` | Workspace member entry | [E: codex-rs/Cargo.toml:40] |
| 39 | `context-fragments` | Workspace member entry | [E: codex-rs/Cargo.toml:43] |
| 40 | `shell-command` | Workspace member entry | [E: codex-rs/Cargo.toml:44] |
| 41 | `shell-escalation` | Workspace member entry | [E: codex-rs/Cargo.toml:45] |
| 42 | `skills` | Workspace member entry | [E: codex-rs/Cargo.toml:46] |
| 43 | `core` | Workspace member entry | [E: codex-rs/Cargo.toml:47] |
| 44 | `core-api` | Workspace member entry | [E: codex-rs/Cargo.toml:48] |
| 45 | `core-plugins` | Workspace member entry | [E: codex-rs/Cargo.toml:49] |
| 46 | `diagnostics` | Workspace member entry | [E: codex-rs/Cargo.toml:50] |
| 47 | `guardian-context` | Workspace member entry | [E: codex-rs/Cargo.toml:51] |
| 48 | `hooks` | Workspace member entry | [E: codex-rs/Cargo.toml:52] |
| 49 | `history` | Workspace member entry | [E: codex-rs/Cargo.toml:53] |
| 50 | `http-client` | Workspace member entry | [E: codex-rs/Cargo.toml:54] |
| 51 | `secrets` | Workspace member entry | [E: codex-rs/Cargo.toml:55] |
| 52 | `exec` | Workspace member entry | [E: codex-rs/Cargo.toml:56] |
| 53 | `file-system` | Workspace member entry | [E: codex-rs/Cargo.toml:57] |
| 54 | `exec-server-protocol` | Workspace member entry | [E: codex-rs/Cargo.toml:58] |
| 55 | `exec-server` | Workspace member entry | [E: codex-rs/Cargo.toml:59] |
| 56 | `exec-server/tests/support` | Workspace member entry | [E: codex-rs/Cargo.toml:60] |
| 57 | `execpolicy` | Workspace member entry | [E: codex-rs/Cargo.toml:61] |
| 58 | `ext/agent` | Workspace member entry | [E: codex-rs/Cargo.toml:62] |
| 59 | `ext/connectors` | Workspace member entry | [E: codex-rs/Cargo.toml:63] |
| 60 | `ext/extension-api` | Workspace member entry | [E: codex-rs/Cargo.toml:64] |
| 61 | `ext/goal` | Workspace member entry | [E: codex-rs/Cargo.toml:65] |
| 62 | `ext/git-attribution` | Workspace member entry | [E: codex-rs/Cargo.toml:66] |
| 63 | `ext/guardian-v2` | Workspace member entry | [E: codex-rs/Cargo.toml:67] |
| 64 | `ext/history-notes` | Workspace member entry | [E: codex-rs/Cargo.toml:68] |
| 65 | `ext/image-generation` | Workspace member entry | [E: codex-rs/Cargo.toml:69] |
| 66 | `ext/items` | Workspace member entry | [E: codex-rs/Cargo.toml:70] |
| 67 | `ext/memories` | Workspace member entry | [E: codex-rs/Cargo.toml:71] |
| 68 | `ext/mcp` | Workspace member entry | [E: codex-rs/Cargo.toml:72] |
| 69 | `ext/queue` | Workspace member entry | [E: codex-rs/Cargo.toml:73] |
| 70 | `ext/skills` | Workspace member entry | [E: codex-rs/Cargo.toml:74] |
| 71 | `ext/web-search` | Workspace member entry | [E: codex-rs/Cargo.toml:75] |
| 72 | `external-agent-migration` | Workspace member entry | [E: codex-rs/Cargo.toml:76] |
| 73 | `keyring-store` | Workspace member entry | [E: codex-rs/Cargo.toml:77] |
| 74 | `file-search` | Workspace member entry | [E: codex-rs/Cargo.toml:78] |
| 75 | `file-watcher` | Workspace member entry | [E: codex-rs/Cargo.toml:79] |
| 76 | `linux-sandbox` | Workspace member entry | [E: codex-rs/Cargo.toml:80] |
| 77 | `lmstudio` | Workspace member entry | [E: codex-rs/Cargo.toml:81] |
| 78 | `login` | Workspace member entry | [E: codex-rs/Cargo.toml:80] |
| 79 | `codex-mcp` | Workspace member entry | [E: codex-rs/Cargo.toml:81] |
| 80 | `memories/read` | Workspace member entry | [E: codex-rs/Cargo.toml:83] |
| 81 | `memories/write` | Workspace member entry | [E: codex-rs/Cargo.toml:84] |
| 82 | `model-provider-info` | Workspace member entry | [E: codex-rs/Cargo.toml:86] |
| 83 | `mxc-sandbox` | Workspace member entry | [E: codex-rs/Cargo.toml:87] |
| 84 | `models-manager` | Workspace member entry | [E: codex-rs/Cargo.toml:86] |
| 85 | `network-proxy` | Workspace member entry | [E: codex-rs/Cargo.toml:89] |
| 86 | `ollama` | Workspace member entry | [E: codex-rs/Cargo.toml:92] |
| 87 | `process-hardening` | Workspace member entry | [E: codex-rs/Cargo.toml:93] |
| 88 | `realtime-webrtc` | Workspace member entry | [E: codex-rs/Cargo.toml:90] |
| 89 | `voice-host` | Workspace member entry | [E: codex-rs/Cargo.toml:91] |
| 90 | `protocol` | Workspace member entry | [E: codex-rs/Cargo.toml:96] |
| 91 | `prompts` | Workspace member entry | [E: codex-rs/Cargo.toml:97] |
| 92 | `rollout` | Workspace member entry | [E: codex-rs/Cargo.toml:98] |
| 93 | `rollout-trace` | Workspace member entry | [E: codex-rs/Cargo.toml:99] |
| 94 | `rmcp-client` | Workspace member entry | [E: codex-rs/Cargo.toml:96] |
| 95 | `responses-api-proxy` | Workspace member entry | [E: codex-rs/Cargo.toml:101] |
| 96 | `response-debug-context` | Workspace member entry | [E: codex-rs/Cargo.toml:103] |
| 97 | `sandboxing` | Workspace member entry | [E: codex-rs/Cargo.toml:104] |
| 98 | `stdio-to-uds` | Workspace member entry | [E: codex-rs/Cargo.toml:105] |
| 99 | `otel` | Workspace member entry | [E: codex-rs/Cargo.toml:106] |
| 100 | `otel-trace-websocket` | Workspace member entry | [E: codex-rs/Cargo.toml:108] |
| 101 | `tui` | Workspace member entry | [E: codex-rs/Cargo.toml:109] |
| 102 | `tools` | Workspace member entry | [E: codex-rs/Cargo.toml:110] |
| 103 | `v8-poc` | Workspace member entry | [E: codex-rs/Cargo.toml:111] |
| 104 | `websocket-client` | Workspace member entry | [E: codex-rs/Cargo.toml:112] |
| 105 | `windows-sandbox-service` | Workspace member entry | [E: codex-rs/Cargo.toml:107] |
| 106 | `worktree` | Workspace member entry | [E: codex-rs/Cargo.toml:114] |
| 107 | `workload-identity` | Workspace member entry | [E: codex-rs/Cargo.toml:115] |
| 108 | `utils/absolute-path` | Workspace member entry | [E: codex-rs/Cargo.toml:117] |
| 109 | `utils/audio` | Workspace member entry | [E: codex-rs/Cargo.toml:118] |
| 110 | `utils/path-uri` | Workspace member entry | [E: codex-rs/Cargo.toml:119] |
| 111 | `utils/cargo-bin` | Workspace member entry | [E: codex-rs/Cargo.toml:120] |
| 112 | `git-utils` | Workspace member entry | [E: codex-rs/Cargo.toml:121] |
| 113 | `utils/cache` | Workspace member entry | [E: codex-rs/Cargo.toml:122] |
| 114 | `utils/git-discovery` | Workspace member entry | [E: codex-rs/Cargo.toml:116] |
| 115 | `utils/image` | Workspace member entry | [E: codex-rs/Cargo.toml:124] |
| 116 | `utils/json-to-toml` | Workspace member entry | [E: codex-rs/Cargo.toml:125] |
| 117 | `utils/home-dir` | Workspace member entry | [E: codex-rs/Cargo.toml:126] |
| 118 | `utils/pty` | Workspace member entry | [E: codex-rs/Cargo.toml:127] |
| 119 | `utils/readiness` | Workspace member entry | [E: codex-rs/Cargo.toml:128] |
| 120 | `utils/redacted-string` | Workspace member entry | [E: codex-rs/Cargo.toml:129] |
| 121 | `utils/rustls-provider` | Workspace member entry | [E: codex-rs/Cargo.toml:130] |
| 122 | `utils/string` | Workspace member entry | [E: codex-rs/Cargo.toml:131] |
| 123 | `utils/cli` | Workspace member entry | [E: codex-rs/Cargo.toml:132] |
| 124 | `utils/elapsed` | Workspace member entry | [E: codex-rs/Cargo.toml:133] |
| 125 | `utils/sandbox-summary` | Workspace member entry | [E: codex-rs/Cargo.toml:134] |
| 126 | `utils/sleep-inhibitor` | Workspace member entry | [E: codex-rs/Cargo.toml:135] |
| 127 | `utils/approval-presets` | Workspace member entry | [E: codex-rs/Cargo.toml:136] |
| 128 | `utils/oss` | Workspace member entry | [E: codex-rs/Cargo.toml:137] |
| 129 | `utils/output-truncation` | Workspace member entry | [E: codex-rs/Cargo.toml:138] |
| 130 | `utils/path-utils` | Workspace member entry | [E: codex-rs/Cargo.toml:139] |
| 131 | `utils/plugins` | Workspace member entry | [E: codex-rs/Cargo.toml:140] |
| 132 | `utils/fuzzy-match` | Workspace member entry | [E: codex-rs/Cargo.toml:141] |
| 133 | `utils/stream-parser` | Workspace member entry | [E: codex-rs/Cargo.toml:142] |
| 134 | `utils/template` | Workspace member entry | [E: codex-rs/Cargo.toml:143] |
| 135 | `codex-client` | Workspace member entry | [E: codex-rs/Cargo.toml:144] |
| 136 | `codex-api` | Workspace member entry | [E: codex-rs/Cargo.toml:145] |
| 137 | `state` | Workspace member entry | [E: codex-rs/Cargo.toml:146] |
| 138 | `terminal-detection` | Workspace member entry | [E: codex-rs/Cargo.toml:147] |
| 139 | `test-binary-support` | Workspace member entry | [E: codex-rs/Cargo.toml:141] |
| 140 | `thread-manager-sample` | Workspace member entry | [E: codex-rs/Cargo.toml:149] |
| 141 | `thread-store` | Workspace member entry | [E: codex-rs/Cargo.toml:143] |
| 142 | `uds` | Workspace member entry | [E: codex-rs/Cargo.toml:144] |
| 143 | `codex-experimental-api-macros` | Workspace member entry | [E: codex-rs/Cargo.toml:152] |
| 144 | `plugin` | Workspace member entry | [E: codex-rs/Cargo.toml:146] |
| 145 | `model-provider` | Workspace member entry | [E: codex-rs/Cargo.toml:147] |

## Sources

- `codex-rs/Cargo.toml`

## 相关

- [spine.overview](../spine/overview.md)
- [ref.key-types](key-types.md)
- [ref.feature-flags](feature-flags.md)
- [ref.env-vars](env-vars.md)
