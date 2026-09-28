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
updated: 1cc7e23612
---

> `codex-rs/Cargo.toml` 定义 Rust workspace：当前 `members` 数组含 **153** 个 workspace member path（第 3–155 行），resolver 为 `"2"`，并集中声明 workspace package version / edition / license 与 `[workspace.dependencies]`。[E: codex-rs/Cargo.toml:1][E: codex-rs/Cargo.toml:2][E: codex-rs/Cargo.toml:3][E: codex-rs/Cargo.toml:157][E: codex-rs/Cargo.toml:159][E: codex-rs/Cargo.toml:160][E: codex-rs/Cargo.toml:165][E: codex-rs/Cargo.toml:166][E: codex-rs/Cargo.toml:168]

## 能回答的问题

- 当前 `codex-rs` workspace 中有哪些 member paths?
- 某个 workspace member 在 `codex-rs/Cargo.toml` 的哪一行登记?
- workspace member count 当前是多少?
- workspace resolver、package version、edition、license 在哪里定义?
- `[workspace.dependencies]` 从哪里开始?

## Workspace 元数据

| Symbol | 当前值 | 说明 | 定义处 |
|---|---|---|---|
| `[workspace].members` | 153 entries | `members` 从第 2 行开始，member entries 覆盖第 3–155 行。 | [E: codex-rs/Cargo.toml:1][E: codex-rs/Cargo.toml:2][E: codex-rs/Cargo.toml:3][E: codex-rs/Cargo.toml:155] |
| `[workspace].resolver` | `"2"` | Cargo resolver setting for the workspace. | [E: codex-rs/Cargo.toml:157] |
| `[workspace.package].version` | `"0.0.0"` | Shared workspace package version. | [E: codex-rs/Cargo.toml:160] |
| `[workspace.package].edition` | `"2024"` | Shared workspace package edition. | [E: codex-rs/Cargo.toml:165] |
| `[workspace.package].license` | `"Apache-2.0"` | Shared workspace package license. | [E: codex-rs/Cargo.toml:166] |
| `[workspace.dependencies]` | starts at line 168 | Workspace dependency table。 | [E: codex-rs/Cargo.toml:168] |

相对上一轮 147 条，本轮净增 6 条到 **153**：`agent-message-board-client`、`core-plugin-common`、`ext/agent-message-board`、`mermaid`、`tcp-tunnel`、`websocket-auth`。[E: codex-rs/Cargo.toml:6][E: codex-rs/Cargo.toml:48][E: codex-rs/Cargo.toml:63][E: codex-rs/Cargo.toml:88][E: codex-rs/Cargo.toml:108][E: codex-rs/Cargo.toml:113]

`mcp-server` crate 与 `codex mcp-server` 子命令已不在 workspace。MCP **client** crates `codex-mcp` 与 `rmcp-client` 仍是 members。[E: codex-rs/Cargo.toml:85][E: codex-rs/Cargo.toml:101]

`exec-server/tests/support` 仍是独立 workspace member。[E: codex-rs/Cargo.toml:60]

`ext/` crate **16**：`ext/agent`、`ext/agent-message-board`、`ext/connectors`、`ext/extension-api`、`ext/goal`、`ext/git-attribution`、`ext/guardian-reviewer`、`ext/guardian-v2`、`ext/history-notes`、`ext/image-generation`、`ext/items`、`ext/memories`、`ext/mcp`、`ext/queue`、`ext/skills`、`ext/web-search`。[E: codex-rs/Cargo.toml:62][E: codex-rs/Cargo.toml:63][E: codex-rs/Cargo.toml:77]

WebSocket 入站鉴权 crate 是 `websocket-auth`；`PluginId` 定义在 `core-plugin-common`，不在 `plugin/src/plugin_id.rs`。[E: codex-rs/Cargo.toml:48][E: codex-rs/Cargo.toml:113]

## Workspace members 全量表

| # | Member path | Entry type | 定义处 |
|---:|---|---|---|
| 1 | `aws-auth` | Workspace member entry | [E: codex-rs/Cargo.toml:3] |
| 2 | `analytics` | Workspace member entry | [E: codex-rs/Cargo.toml:4] |
| 3 | `agent-graph-store` | Workspace member entry | [E: codex-rs/Cargo.toml:5] |
| 4 | `agent-message-board-client` | Workspace member entry | [E: codex-rs/Cargo.toml:6] |
| 5 | `agent-identity` | Workspace member entry | [E: codex-rs/Cargo.toml:7] |
| 6 | `agent-roles` | Workspace member entry | [E: codex-rs/Cargo.toml:8] |
| 7 | `backend-client` | Workspace member entry | [E: codex-rs/Cargo.toml:9] |
| 8 | `bwrap` | Workspace member entry | [E: codex-rs/Cargo.toml:10] |
| 9 | `build-info` | Workspace member entry | [E: codex-rs/Cargo.toml:11] |
| 10 | `ansi-escape` | Workspace member entry | [E: codex-rs/Cargo.toml:12] |
| 11 | `attachment-store` | Workspace member entry | [E: codex-rs/Cargo.toml:13] |
| 12 | `async-utils` | Workspace member entry | [E: codex-rs/Cargo.toml:14] |
| 13 | `app-server` | Workspace member entry | [E: codex-rs/Cargo.toml:15] |
| 14 | `app-server-transport` | Workspace member entry | [E: codex-rs/Cargo.toml:16] |
| 15 | `app-server-daemon` | Workspace member entry | [E: codex-rs/Cargo.toml:17] |
| 16 | `app-server-client` | Workspace member entry | [E: codex-rs/Cargo.toml:18] |
| 17 | `app-server-protocol` | Workspace member entry | [E: codex-rs/Cargo.toml:19] |
| 18 | `app-server-protocol-noop-macros` | Workspace member entry | [E: codex-rs/Cargo.toml:20] |
| 19 | `app-server-test-client` | Workspace member entry | [E: codex-rs/Cargo.toml:21] |
| 20 | `apply-patch` | Workspace member entry | [E: codex-rs/Cargo.toml:22] |
| 21 | `arg0` | Workspace member entry | [E: codex-rs/Cargo.toml:23] |
| 22 | `feedback` | Workspace member entry | [E: codex-rs/Cargo.toml:24] |
| 23 | `features` | Workspace member entry | [E: codex-rs/Cargo.toml:25] |
| 24 | `install-context` | Workspace member entry | [E: codex-rs/Cargo.toml:26] |
| 25 | `codex-backend-openapi-models` | Workspace member entry | [E: codex-rs/Cargo.toml:27] |
| 26 | `code-mode` | Workspace member entry | [E: codex-rs/Cargo.toml:28] |
| 27 | `code-mode-host` | Workspace member entry | [E: codex-rs/Cargo.toml:29] |
| 28 | `code-mode-protocol` | Workspace member entry | [E: codex-rs/Cargo.toml:30] |
| 29 | `code-mode-runtime` | Workspace member entry | [E: codex-rs/Cargo.toml:31] |
| 30 | `codex-home` | Workspace member entry | [E: codex-rs/Cargo.toml:32] |
| 31 | `cloud-config` | Workspace member entry | [E: codex-rs/Cargo.toml:33] |
| 32 | `cloud-tasks` | Workspace member entry | [E: codex-rs/Cargo.toml:34] |
| 33 | `cloud-tasks-client` | Workspace member entry | [E: codex-rs/Cargo.toml:35] |
| 34 | `cloud-tasks-mock-client` | Workspace member entry | [E: codex-rs/Cargo.toml:36] |
| 35 | `cli` | Workspace member entry | [E: codex-rs/Cargo.toml:37] |
| 36 | `collaboration-mode-templates` | Workspace member entry | [E: codex-rs/Cargo.toml:38] |
| 37 | `connectors` | Workspace member entry | [E: codex-rs/Cargo.toml:39] |
| 38 | `config` | Workspace member entry | [E: codex-rs/Cargo.toml:40] |
| 39 | `config-schema` | Workspace member entry | [E: codex-rs/Cargo.toml:41] |
| 40 | `context-fragments` | Workspace member entry | [E: codex-rs/Cargo.toml:42] |
| 41 | `shell-command` | Workspace member entry | [E: codex-rs/Cargo.toml:43] |
| 42 | `shell-escalation` | Workspace member entry | [E: codex-rs/Cargo.toml:44] |
| 43 | `skills` | Workspace member entry | [E: codex-rs/Cargo.toml:45] |
| 44 | `core` | Workspace member entry | [E: codex-rs/Cargo.toml:46] |
| 45 | `core-api` | Workspace member entry | [E: codex-rs/Cargo.toml:47] |
| 46 | `core-plugin-common` | Workspace member entry | [E: codex-rs/Cargo.toml:48] |
| 47 | `core-plugins` | Workspace member entry | [E: codex-rs/Cargo.toml:49] |
| 48 | `diagnostics` | Workspace member entry | [E: codex-rs/Cargo.toml:50] |
| 49 | `guardian-context` | Workspace member entry | [E: codex-rs/Cargo.toml:51] |
| 50 | `hooks` | Workspace member entry | [E: codex-rs/Cargo.toml:52] |
| 51 | `history` | Workspace member entry | [E: codex-rs/Cargo.toml:53] |
| 52 | `http-client` | Workspace member entry | [E: codex-rs/Cargo.toml:54] |
| 53 | `secrets` | Workspace member entry | [E: codex-rs/Cargo.toml:55] |
| 54 | `exec` | Workspace member entry | [E: codex-rs/Cargo.toml:56] |
| 55 | `file-system` | Workspace member entry | [E: codex-rs/Cargo.toml:57] |
| 56 | `exec-server-protocol` | Workspace member entry | [E: codex-rs/Cargo.toml:58] |
| 57 | `exec-server` | Workspace member entry | [E: codex-rs/Cargo.toml:59] |
| 58 | `exec-server/tests/support` | Workspace member entry | [E: codex-rs/Cargo.toml:60] |
| 59 | `execpolicy` | Workspace member entry | [E: codex-rs/Cargo.toml:61] |
| 60 | `ext/agent` | Workspace member entry | [E: codex-rs/Cargo.toml:62] |
| 61 | `ext/agent-message-board` | Workspace member entry | [E: codex-rs/Cargo.toml:63] |
| 62 | `ext/connectors` | Workspace member entry | [E: codex-rs/Cargo.toml:64] |
| 63 | `ext/extension-api` | Workspace member entry | [E: codex-rs/Cargo.toml:65] |
| 64 | `ext/goal` | Workspace member entry | [E: codex-rs/Cargo.toml:66] |
| 65 | `ext/git-attribution` | Workspace member entry | [E: codex-rs/Cargo.toml:67] |
| 66 | `ext/guardian-reviewer` | Workspace member entry | [E: codex-rs/Cargo.toml:68] |
| 67 | `ext/guardian-v2` | Workspace member entry | [E: codex-rs/Cargo.toml:69] |
| 68 | `ext/history-notes` | Workspace member entry | [E: codex-rs/Cargo.toml:70] |
| 69 | `ext/image-generation` | Workspace member entry | [E: codex-rs/Cargo.toml:71] |
| 70 | `ext/items` | Workspace member entry | [E: codex-rs/Cargo.toml:72] |
| 71 | `ext/memories` | Workspace member entry | [E: codex-rs/Cargo.toml:73] |
| 72 | `ext/mcp` | Workspace member entry | [E: codex-rs/Cargo.toml:74] |
| 73 | `ext/queue` | Workspace member entry | [E: codex-rs/Cargo.toml:75] |
| 74 | `ext/skills` | Workspace member entry | [E: codex-rs/Cargo.toml:76] |
| 75 | `ext/web-search` | Workspace member entry | [E: codex-rs/Cargo.toml:77] |
| 76 | `external-agent-migration` | Workspace member entry | [E: codex-rs/Cargo.toml:78] |
| 77 | `keyring-store` | Workspace member entry | [E: codex-rs/Cargo.toml:79] |
| 78 | `file-search` | Workspace member entry | [E: codex-rs/Cargo.toml:80] |
| 79 | `file-watcher` | Workspace member entry | [E: codex-rs/Cargo.toml:81] |
| 80 | `linux-sandbox` | Workspace member entry | [E: codex-rs/Cargo.toml:82] |
| 81 | `lmstudio` | Workspace member entry | [E: codex-rs/Cargo.toml:83] |
| 82 | `login` | Workspace member entry | [E: codex-rs/Cargo.toml:84] |
| 83 | `codex-mcp` | Workspace member entry | [E: codex-rs/Cargo.toml:85] |
| 84 | `memories/read` | Workspace member entry | [E: codex-rs/Cargo.toml:86] |
| 85 | `memories/write` | Workspace member entry | [E: codex-rs/Cargo.toml:87] |
| 86 | `mermaid` | Workspace member entry | [E: codex-rs/Cargo.toml:88] |
| 87 | `model-provider-info` | Workspace member entry | [E: codex-rs/Cargo.toml:89] |
| 88 | `mxc-sandbox` | Workspace member entry | [E: codex-rs/Cargo.toml:90] |
| 89 | `models-manager` | Workspace member entry | [E: codex-rs/Cargo.toml:91] |
| 90 | `network-proxy` | Workspace member entry | [E: codex-rs/Cargo.toml:92] |
| 91 | `ollama` | Workspace member entry | [E: codex-rs/Cargo.toml:93] |
| 92 | `process-hardening` | Workspace member entry | [E: codex-rs/Cargo.toml:94] |
| 93 | `realtime-webrtc` | Workspace member entry | [E: codex-rs/Cargo.toml:95] |
| 94 | `voice-host` | Workspace member entry | [E: codex-rs/Cargo.toml:96] |
| 95 | `protocol` | Workspace member entry | [E: codex-rs/Cargo.toml:97] |
| 96 | `prompts` | Workspace member entry | [E: codex-rs/Cargo.toml:98] |
| 97 | `rollout` | Workspace member entry | [E: codex-rs/Cargo.toml:99] |
| 98 | `rollout-trace` | Workspace member entry | [E: codex-rs/Cargo.toml:100] |
| 99 | `rmcp-client` | Workspace member entry | [E: codex-rs/Cargo.toml:101] |
| 100 | `responses-api-proxy` | Workspace member entry | [E: codex-rs/Cargo.toml:102] |
| 101 | `response-debug-context` | Workspace member entry | [E: codex-rs/Cargo.toml:103] |
| 102 | `sandboxing` | Workspace member entry | [E: codex-rs/Cargo.toml:104] |
| 103 | `stdio-to-uds` | Workspace member entry | [E: codex-rs/Cargo.toml:105] |
| 104 | `otel` | Workspace member entry | [E: codex-rs/Cargo.toml:106] |
| 105 | `otel-trace-websocket` | Workspace member entry | [E: codex-rs/Cargo.toml:107] |
| 106 | `tcp-tunnel` | Workspace member entry | [E: codex-rs/Cargo.toml:108] |
| 107 | `tui` | Workspace member entry | [E: codex-rs/Cargo.toml:109] |
| 108 | `user-verification` | Workspace member entry | [E: codex-rs/Cargo.toml:110] |
| 109 | `tools` | Workspace member entry | [E: codex-rs/Cargo.toml:111] |
| 110 | `v8-poc` | Workspace member entry | [E: codex-rs/Cargo.toml:112] |
| 111 | `websocket-auth` | Workspace member entry | [E: codex-rs/Cargo.toml:113] |
| 112 | `websocket-client` | Workspace member entry | [E: codex-rs/Cargo.toml:114] |
| 113 | `windows-sandbox-service` | Workspace member entry | [E: codex-rs/Cargo.toml:115] |
| 114 | `worktree` | Workspace member entry | [E: codex-rs/Cargo.toml:116] |
| 115 | `workload-identity` | Workspace member entry | [E: codex-rs/Cargo.toml:117] |
| 116 | `utils/absolute-path` | Workspace member entry | [E: codex-rs/Cargo.toml:118] |
| 117 | `utils/audio` | Workspace member entry | [E: codex-rs/Cargo.toml:119] |
| 118 | `utils/path-uri` | Workspace member entry | [E: codex-rs/Cargo.toml:120] |
| 119 | `utils/cargo-bin` | Workspace member entry | [E: codex-rs/Cargo.toml:121] |
| 120 | `git-utils` | Workspace member entry | [E: codex-rs/Cargo.toml:122] |
| 121 | `utils/cache` | Workspace member entry | [E: codex-rs/Cargo.toml:123] |
| 122 | `utils/git-discovery` | Workspace member entry | [E: codex-rs/Cargo.toml:124] |
| 123 | `utils/image` | Workspace member entry | [E: codex-rs/Cargo.toml:125] |
| 124 | `utils/json-to-toml` | Workspace member entry | [E: codex-rs/Cargo.toml:126] |
| 125 | `utils/home-dir` | Workspace member entry | [E: codex-rs/Cargo.toml:127] |
| 126 | `utils/pty` | Workspace member entry | [E: codex-rs/Cargo.toml:128] |
| 127 | `utils/readiness` | Workspace member entry | [E: codex-rs/Cargo.toml:129] |
| 128 | `utils/redacted-string` | Workspace member entry | [E: codex-rs/Cargo.toml:130] |
| 129 | `utils/rustls-provider` | Workspace member entry | [E: codex-rs/Cargo.toml:131] |
| 130 | `utils/string` | Workspace member entry | [E: codex-rs/Cargo.toml:132] |
| 131 | `utils/cli` | Workspace member entry | [E: codex-rs/Cargo.toml:133] |
| 132 | `utils/elapsed` | Workspace member entry | [E: codex-rs/Cargo.toml:134] |
| 133 | `utils/sandbox-summary` | Workspace member entry | [E: codex-rs/Cargo.toml:135] |
| 134 | `utils/sleep-inhibitor` | Workspace member entry | [E: codex-rs/Cargo.toml:136] |
| 135 | `utils/approval-presets` | Workspace member entry | [E: codex-rs/Cargo.toml:137] |
| 136 | `utils/oss` | Workspace member entry | [E: codex-rs/Cargo.toml:138] |
| 137 | `utils/output-truncation` | Workspace member entry | [E: codex-rs/Cargo.toml:139] |
| 138 | `utils/path-utils` | Workspace member entry | [E: codex-rs/Cargo.toml:140] |
| 139 | `utils/plugins` | Workspace member entry | [E: codex-rs/Cargo.toml:141] |
| 140 | `utils/fuzzy-match` | Workspace member entry | [E: codex-rs/Cargo.toml:142] |
| 141 | `utils/stream-parser` | Workspace member entry | [E: codex-rs/Cargo.toml:143] |
| 142 | `utils/template` | Workspace member entry | [E: codex-rs/Cargo.toml:144] |
| 143 | `codex-client` | Workspace member entry | [E: codex-rs/Cargo.toml:145] |
| 144 | `codex-api` | Workspace member entry | [E: codex-rs/Cargo.toml:146] |
| 145 | `state` | Workspace member entry | [E: codex-rs/Cargo.toml:147] |
| 146 | `terminal-detection` | Workspace member entry | [E: codex-rs/Cargo.toml:148] |
| 147 | `test-binary-support` | Workspace member entry | [E: codex-rs/Cargo.toml:149] |
| 148 | `thread-manager-sample` | Workspace member entry | [E: codex-rs/Cargo.toml:150] |
| 149 | `thread-store` | Workspace member entry | [E: codex-rs/Cargo.toml:151] |
| 150 | `uds` | Workspace member entry | [E: codex-rs/Cargo.toml:152] |
| 151 | `codex-experimental-api-macros` | Workspace member entry | [E: codex-rs/Cargo.toml:153] |
| 152 | `plugin` | Workspace member entry | [E: codex-rs/Cargo.toml:154] |
| 153 | `model-provider` | Workspace member entry | [E: codex-rs/Cargo.toml:155] |

## Sources

- `codex-rs/Cargo.toml`

## 相关

- [spine.overview](../spine/overview.md)
- [ref.key-types](key-types.md)
- [ref.feature-flags](feature-flags.md)
- [ref.env-vars](env-vars.md)
