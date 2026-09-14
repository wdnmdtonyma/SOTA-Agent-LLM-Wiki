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
updated: 3abbf9fe2c
---

> `codex-rs/Cargo.toml` 定义 Rust workspace：当前 `members` 数组含 **147** 个 workspace member path（第 3–149 行），resolver 为 `"2"`，并集中声明 workspace package version / edition / license 与 `[workspace.dependencies]`。[E: codex-rs/Cargo.toml:1][E: codex-rs/Cargo.toml:2][E: codex-rs/Cargo.toml:3][E: codex-rs/Cargo.toml:151][E: codex-rs/Cargo.toml:154][E: codex-rs/Cargo.toml:159][E: codex-rs/Cargo.toml:160][E: codex-rs/Cargo.toml:162]

## 能回答的问题

- 当前 `codex-rs` workspace 中有哪些 member paths?
- 某个 workspace member 在 `codex-rs/Cargo.toml` 的哪一行登记?
- workspace member count 当前是多少?
- workspace resolver、package version、edition、license 在哪里定义?
- `[workspace.dependencies]` 从哪里开始?

## Workspace 元数据

| Symbol | 当前值 | 说明 | 定义处 |
|---|---|---|---|
| `[workspace].members` | 147 entries | `members` 从第 2 行开始，member entries 覆盖第 3–149 行。 | [E: codex-rs/Cargo.toml:1][E: codex-rs/Cargo.toml:2][E: codex-rs/Cargo.toml:3][E: codex-rs/Cargo.toml:149] |
| `[workspace].resolver` | `"2"` | Cargo resolver setting for the workspace. | [E: codex-rs/Cargo.toml:151] |
| `[workspace.package].version` | `"0.0.0"` | Shared workspace package version. | [E: codex-rs/Cargo.toml:154] |
| `[workspace.package].edition` | `"2024"` | Shared workspace package edition. | [E: codex-rs/Cargo.toml:159] |
| `[workspace.package].license` | `"Apache-2.0"` | Shared workspace package license. | [E: codex-rs/Cargo.toml:160] |
| `[workspace.dependencies]` | starts at line 162 | Workspace dependency table。 | [E: codex-rs/Cargo.toml:162] |

相对上一轮 catalog 重数：workspace `members` 仍是 **147** 条（第 3–149 行），本轮无 member 增删。[E: codex-rs/Cargo.toml:3][E: codex-rs/Cargo.toml:149]

`mcp-server` crate 与 `codex mcp-server` 子命令已不在 workspace。MCP **client** crates `codex-mcp` 与 `rmcp-client` 仍是 members。[E: codex-rs/Cargo.toml:82][E: codex-rs/Cargo.toml:97]

`exec-server/tests/support` 仍是独立 workspace member。[E: codex-rs/Cargo.toml:58]

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
| 11 | `async-utils` | Workspace member entry | [E: codex-rs/Cargo.toml:13] |
| 12 | `app-server` | Workspace member entry | [E: codex-rs/Cargo.toml:14] |
| 13 | `app-server-transport` | Workspace member entry | [E: codex-rs/Cargo.toml:15] |
| 14 | `app-server-daemon` | Workspace member entry | [E: codex-rs/Cargo.toml:16] |
| 15 | `app-server-client` | Workspace member entry | [E: codex-rs/Cargo.toml:17] |
| 16 | `app-server-protocol` | Workspace member entry | [E: codex-rs/Cargo.toml:18] |
| 17 | `app-server-protocol-noop-macros` | Workspace member entry | [E: codex-rs/Cargo.toml:19] |
| 18 | `app-server-test-client` | Workspace member entry | [E: codex-rs/Cargo.toml:20] |
| 19 | `apply-patch` | Workspace member entry | [E: codex-rs/Cargo.toml:21] |
| 20 | `arg0` | Workspace member entry | [E: codex-rs/Cargo.toml:22] |
| 21 | `feedback` | Workspace member entry | [E: codex-rs/Cargo.toml:23] |
| 22 | `features` | Workspace member entry | [E: codex-rs/Cargo.toml:24] |
| 23 | `install-context` | Workspace member entry | [E: codex-rs/Cargo.toml:25] |
| 24 | `codex-backend-openapi-models` | Workspace member entry | [E: codex-rs/Cargo.toml:26] |
| 25 | `code-mode` | Workspace member entry | [E: codex-rs/Cargo.toml:27] |
| 26 | `code-mode-host` | Workspace member entry | [E: codex-rs/Cargo.toml:28] |
| 27 | `code-mode-protocol` | Workspace member entry | [E: codex-rs/Cargo.toml:29] |
| 28 | `code-mode-runtime` | Workspace member entry | [E: codex-rs/Cargo.toml:30] |
| 29 | `codex-home` | Workspace member entry | [E: codex-rs/Cargo.toml:31] |
| 30 | `cloud-config` | Workspace member entry | [E: codex-rs/Cargo.toml:32] |
| 31 | `cloud-tasks` | Workspace member entry | [E: codex-rs/Cargo.toml:33] |
| 32 | `cloud-tasks-client` | Workspace member entry | [E: codex-rs/Cargo.toml:34] |
| 33 | `cloud-tasks-mock-client` | Workspace member entry | [E: codex-rs/Cargo.toml:35] |
| 34 | `cli` | Workspace member entry | [E: codex-rs/Cargo.toml:36] |
| 35 | `collaboration-mode-templates` | Workspace member entry | [E: codex-rs/Cargo.toml:37] |
| 36 | `connectors` | Workspace member entry | [E: codex-rs/Cargo.toml:38] |
| 37 | `config` | Workspace member entry | [E: codex-rs/Cargo.toml:39] |
| 38 | `config-schema` | Workspace member entry | [E: codex-rs/Cargo.toml:40] |
| 39 | `context-fragments` | Workspace member entry | [E: codex-rs/Cargo.toml:41] |
| 40 | `shell-command` | Workspace member entry | [E: codex-rs/Cargo.toml:42] |
| 41 | `shell-escalation` | Workspace member entry | [E: codex-rs/Cargo.toml:43] |
| 42 | `skills` | Workspace member entry | [E: codex-rs/Cargo.toml:44] |
| 43 | `core` | Workspace member entry | [E: codex-rs/Cargo.toml:45] |
| 44 | `core-api` | Workspace member entry | [E: codex-rs/Cargo.toml:46] |
| 45 | `core-plugins` | Workspace member entry | [E: codex-rs/Cargo.toml:47] |
| 46 | `diagnostics` | Workspace member entry | [E: codex-rs/Cargo.toml:48] |
| 47 | `guardian-context` | Workspace member entry | [E: codex-rs/Cargo.toml:49] |
| 48 | `hooks` | Workspace member entry | [E: codex-rs/Cargo.toml:50] |
| 49 | `history` | Workspace member entry | [E: codex-rs/Cargo.toml:51] |
| 50 | `http-client` | Workspace member entry | [E: codex-rs/Cargo.toml:52] |
| 51 | `secrets` | Workspace member entry | [E: codex-rs/Cargo.toml:53] |
| 52 | `exec` | Workspace member entry | [E: codex-rs/Cargo.toml:54] |
| 53 | `file-system` | Workspace member entry | [E: codex-rs/Cargo.toml:55] |
| 54 | `exec-server-protocol` | Workspace member entry | [E: codex-rs/Cargo.toml:56] |
| 55 | `exec-server` | Workspace member entry | [E: codex-rs/Cargo.toml:57] |
| 56 | `exec-server/tests/support` | Workspace member entry | [E: codex-rs/Cargo.toml:58] |
| 57 | `execpolicy` | Workspace member entry | [E: codex-rs/Cargo.toml:59] |
| 58 | `ext/agent` | Workspace member entry | [E: codex-rs/Cargo.toml:60] |
| 59 | `ext/connectors` | Workspace member entry | [E: codex-rs/Cargo.toml:61] |
| 60 | `ext/extension-api` | Workspace member entry | [E: codex-rs/Cargo.toml:62] |
| 61 | `ext/goal` | Workspace member entry | [E: codex-rs/Cargo.toml:63] |
| 62 | `ext/git-attribution` | Workspace member entry | [E: codex-rs/Cargo.toml:64] |
| 63 | `ext/guardian-reviewer` | Workspace member entry | [E: codex-rs/Cargo.toml:65] |
| 64 | `ext/guardian-v2` | Workspace member entry | [E: codex-rs/Cargo.toml:66] |
| 65 | `ext/history-notes` | Workspace member entry | [E: codex-rs/Cargo.toml:67] |
| 66 | `ext/image-generation` | Workspace member entry | [E: codex-rs/Cargo.toml:68] |
| 67 | `ext/items` | Workspace member entry | [E: codex-rs/Cargo.toml:69] |
| 68 | `ext/memories` | Workspace member entry | [E: codex-rs/Cargo.toml:70] |
| 69 | `ext/mcp` | Workspace member entry | [E: codex-rs/Cargo.toml:71] |
| 70 | `ext/queue` | Workspace member entry | [E: codex-rs/Cargo.toml:72] |
| 71 | `ext/skills` | Workspace member entry | [E: codex-rs/Cargo.toml:73] |
| 72 | `ext/web-search` | Workspace member entry | [E: codex-rs/Cargo.toml:74] |
| 73 | `external-agent-migration` | Workspace member entry | [E: codex-rs/Cargo.toml:75] |
| 74 | `keyring-store` | Workspace member entry | [E: codex-rs/Cargo.toml:76] |
| 75 | `file-search` | Workspace member entry | [E: codex-rs/Cargo.toml:77] |
| 76 | `file-watcher` | Workspace member entry | [E: codex-rs/Cargo.toml:78] |
| 77 | `linux-sandbox` | Workspace member entry | [E: codex-rs/Cargo.toml:79] |
| 78 | `lmstudio` | Workspace member entry | [E: codex-rs/Cargo.toml:80] |
| 79 | `login` | Workspace member entry | [E: codex-rs/Cargo.toml:81] |
| 80 | `codex-mcp` | Workspace member entry | [E: codex-rs/Cargo.toml:82] |
| 81 | `memories/read` | Workspace member entry | [E: codex-rs/Cargo.toml:83] |
| 82 | `memories/write` | Workspace member entry | [E: codex-rs/Cargo.toml:84] |
| 83 | `model-provider-info` | Workspace member entry | [E: codex-rs/Cargo.toml:85] |
| 84 | `mxc-sandbox` | Workspace member entry | [E: codex-rs/Cargo.toml:86] |
| 85 | `models-manager` | Workspace member entry | [E: codex-rs/Cargo.toml:87] |
| 86 | `network-proxy` | Workspace member entry | [E: codex-rs/Cargo.toml:88] |
| 87 | `ollama` | Workspace member entry | [E: codex-rs/Cargo.toml:89] |
| 88 | `process-hardening` | Workspace member entry | [E: codex-rs/Cargo.toml:90] |
| 89 | `realtime-webrtc` | Workspace member entry | [E: codex-rs/Cargo.toml:91] |
| 90 | `voice-host` | Workspace member entry | [E: codex-rs/Cargo.toml:92] |
| 91 | `protocol` | Workspace member entry | [E: codex-rs/Cargo.toml:93] |
| 92 | `prompts` | Workspace member entry | [E: codex-rs/Cargo.toml:94] |
| 93 | `rollout` | Workspace member entry | [E: codex-rs/Cargo.toml:95] |
| 94 | `rollout-trace` | Workspace member entry | [E: codex-rs/Cargo.toml:96] |
| 95 | `rmcp-client` | Workspace member entry | [E: codex-rs/Cargo.toml:97] |
| 96 | `responses-api-proxy` | Workspace member entry | [E: codex-rs/Cargo.toml:98] |
| 97 | `response-debug-context` | Workspace member entry | [E: codex-rs/Cargo.toml:99] |
| 98 | `sandboxing` | Workspace member entry | [E: codex-rs/Cargo.toml:100] |
| 99 | `stdio-to-uds` | Workspace member entry | [E: codex-rs/Cargo.toml:101] |
| 100 | `otel` | Workspace member entry | [E: codex-rs/Cargo.toml:102] |
| 101 | `otel-trace-websocket` | Workspace member entry | [E: codex-rs/Cargo.toml:103] |
| 102 | `tui` | Workspace member entry | [E: codex-rs/Cargo.toml:104] |
| 103 | `user-verification` | Workspace member entry | [E: codex-rs/Cargo.toml:105] |
| 104 | `tools` | Workspace member entry | [E: codex-rs/Cargo.toml:106] |
| 105 | `v8-poc` | Workspace member entry | [E: codex-rs/Cargo.toml:107] |
| 106 | `websocket-client` | Workspace member entry | [E: codex-rs/Cargo.toml:108] |
| 107 | `windows-sandbox-service` | Workspace member entry | [E: codex-rs/Cargo.toml:109] |
| 108 | `worktree` | Workspace member entry | [E: codex-rs/Cargo.toml:110] |
| 109 | `workload-identity` | Workspace member entry | [E: codex-rs/Cargo.toml:111] |
| 110 | `utils/absolute-path` | Workspace member entry | [E: codex-rs/Cargo.toml:112] |
| 111 | `utils/audio` | Workspace member entry | [E: codex-rs/Cargo.toml:113] |
| 112 | `utils/path-uri` | Workspace member entry | [E: codex-rs/Cargo.toml:114] |
| 113 | `utils/cargo-bin` | Workspace member entry | [E: codex-rs/Cargo.toml:115] |
| 114 | `git-utils` | Workspace member entry | [E: codex-rs/Cargo.toml:116] |
| 115 | `utils/cache` | Workspace member entry | [E: codex-rs/Cargo.toml:117] |
| 116 | `utils/git-discovery` | Workspace member entry | [E: codex-rs/Cargo.toml:118] |
| 117 | `utils/image` | Workspace member entry | [E: codex-rs/Cargo.toml:119] |
| 118 | `utils/json-to-toml` | Workspace member entry | [E: codex-rs/Cargo.toml:120] |
| 119 | `utils/home-dir` | Workspace member entry | [E: codex-rs/Cargo.toml:121] |
| 120 | `utils/pty` | Workspace member entry | [E: codex-rs/Cargo.toml:122] |
| 121 | `utils/readiness` | Workspace member entry | [E: codex-rs/Cargo.toml:123] |
| 122 | `utils/redacted-string` | Workspace member entry | [E: codex-rs/Cargo.toml:124] |
| 123 | `utils/rustls-provider` | Workspace member entry | [E: codex-rs/Cargo.toml:125] |
| 124 | `utils/string` | Workspace member entry | [E: codex-rs/Cargo.toml:126] |
| 125 | `utils/cli` | Workspace member entry | [E: codex-rs/Cargo.toml:127] |
| 126 | `utils/elapsed` | Workspace member entry | [E: codex-rs/Cargo.toml:128] |
| 127 | `utils/sandbox-summary` | Workspace member entry | [E: codex-rs/Cargo.toml:129] |
| 128 | `utils/sleep-inhibitor` | Workspace member entry | [E: codex-rs/Cargo.toml:130] |
| 129 | `utils/approval-presets` | Workspace member entry | [E: codex-rs/Cargo.toml:131] |
| 130 | `utils/oss` | Workspace member entry | [E: codex-rs/Cargo.toml:132] |
| 131 | `utils/output-truncation` | Workspace member entry | [E: codex-rs/Cargo.toml:133] |
| 132 | `utils/path-utils` | Workspace member entry | [E: codex-rs/Cargo.toml:134] |
| 133 | `utils/plugins` | Workspace member entry | [E: codex-rs/Cargo.toml:135] |
| 134 | `utils/fuzzy-match` | Workspace member entry | [E: codex-rs/Cargo.toml:136] |
| 135 | `utils/stream-parser` | Workspace member entry | [E: codex-rs/Cargo.toml:137] |
| 136 | `utils/template` | Workspace member entry | [E: codex-rs/Cargo.toml:138] |
| 137 | `codex-client` | Workspace member entry | [E: codex-rs/Cargo.toml:139] |
| 138 | `codex-api` | Workspace member entry | [E: codex-rs/Cargo.toml:140] |
| 139 | `state` | Workspace member entry | [E: codex-rs/Cargo.toml:141] |
| 140 | `terminal-detection` | Workspace member entry | [E: codex-rs/Cargo.toml:142] |
| 141 | `test-binary-support` | Workspace member entry | [E: codex-rs/Cargo.toml:143] |
| 142 | `thread-manager-sample` | Workspace member entry | [E: codex-rs/Cargo.toml:144] |
| 143 | `thread-store` | Workspace member entry | [E: codex-rs/Cargo.toml:145] |
| 144 | `uds` | Workspace member entry | [E: codex-rs/Cargo.toml:146] |
| 145 | `codex-experimental-api-macros` | Workspace member entry | [E: codex-rs/Cargo.toml:147] |
| 146 | `plugin` | Workspace member entry | [E: codex-rs/Cargo.toml:148] |
| 147 | `model-provider` | Workspace member entry | [E: codex-rs/Cargo.toml:149] |

## Sources

- `codex-rs/Cargo.toml`

## 相关

- [spine.overview](../spine/overview.md)
- [ref.key-types](key-types.md)
- [ref.feature-flags](feature-flags.md)
- [ref.env-vars](env-vars.md)
