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
updated: 5670360009
---

> `codex-rs/Cargo.toml` defines the Rust workspace: the current `members` array contains 121 workspace member paths, closes at line 124, uses Cargo resolver `"2"`, and centralizes workspace package version, edition, license, and dependency declarations.[E: codex-rs/Cargo.toml:1][E: codex-rs/Cargo.toml:2][E: codex-rs/Cargo.toml:3][E: codex-rs/Cargo.toml:123][E: codex-rs/Cargo.toml:124][E: codex-rs/Cargo.toml:125][E: codex-rs/Cargo.toml:127][E: codex-rs/Cargo.toml:128][E: codex-rs/Cargo.toml:133][E: codex-rs/Cargo.toml:134][E: codex-rs/Cargo.toml:136]

## 能回答的问题

- 当前 `codex-rs` workspace 中有哪些 member paths?
- 某个 workspace member 在 `codex-rs/Cargo.toml` 的哪一行登记?
- workspace member count 当前是多少?
- workspace resolver、package version、edition、license 在哪里定义?
- `[workspace.dependencies]` 从哪里开始?

## Workspace 元数据

| Symbol | 当前值 | 说明 | 定义处 |
|---|---|---|---|
| `[workspace].members` | 121 entries | `members` starts at line 2, member entries cover line 3 through line 123, and the array closes at line 124. | [E: codex-rs/Cargo.toml:1][E: codex-rs/Cargo.toml:2][E: codex-rs/Cargo.toml:3][E: codex-rs/Cargo.toml:123][E: codex-rs/Cargo.toml:124] |
| `[workspace].resolver` | `"2"` | Cargo resolver setting for the workspace. | [E: codex-rs/Cargo.toml:125] |
| `[workspace.package].version` | `"0.0.0"` | Shared workspace package version. | [E: codex-rs/Cargo.toml:127][E: codex-rs/Cargo.toml:128] |
| `[workspace.package].edition` | `"2024"` | The workspace package edition; surrounding comments explain new workspace crates inherit this edition by default. | [E: codex-rs/Cargo.toml:129][E: codex-rs/Cargo.toml:131][E: codex-rs/Cargo.toml:133] |
| `[workspace.package].license` | `"Apache-2.0"` | Shared workspace package license. | [E: codex-rs/Cargo.toml:134] |
| `[workspace.dependencies]` | starts at line 136 | Workspace dependency table; the first following section is the internal dependency list. | [E: codex-rs/Cargo.toml:136][E: codex-rs/Cargo.toml:137][E: codex-rs/Cargo.toml:138] |

## Workspace members 全量表

| # | Member path | Entry type | 定义处 |
|---:|---|---|---|
| 1 | `aws-auth` | Workspace member entry | [E: codex-rs/Cargo.toml:3] |
| 2 | `analytics` | Workspace member entry | [E: codex-rs/Cargo.toml:4] |
| 3 | `agent-graph-store` | Workspace member entry | [E: codex-rs/Cargo.toml:5] |
| 4 | `agent-identity` | Workspace member entry | [E: codex-rs/Cargo.toml:6] |
| 5 | `backend-client` | Workspace member entry | [E: codex-rs/Cargo.toml:7] |
| 6 | `bwrap` | Workspace member entry | [E: codex-rs/Cargo.toml:8] |
| 7 | `ansi-escape` | Workspace member entry | [E: codex-rs/Cargo.toml:9] |
| 8 | `async-utils` | Workspace member entry | [E: codex-rs/Cargo.toml:10] |
| 9 | `app-server` | Workspace member entry | [E: codex-rs/Cargo.toml:11] |
| 10 | `app-server-transport` | Workspace member entry | [E: codex-rs/Cargo.toml:12] |
| 11 | `app-server-daemon` | Workspace member entry | [E: codex-rs/Cargo.toml:13] |
| 12 | `app-server-client` | Workspace member entry | [E: codex-rs/Cargo.toml:14] |
| 13 | `app-server-protocol` | Workspace member entry | [E: codex-rs/Cargo.toml:15] |
| 14 | `app-server-test-client` | Workspace member entry | [E: codex-rs/Cargo.toml:16] |
| 15 | `apply-patch` | Workspace member entry | [E: codex-rs/Cargo.toml:17] |
| 16 | `arg0` | Workspace member entry | [E: codex-rs/Cargo.toml:18] |
| 17 | `feedback` | Workspace member entry | [E: codex-rs/Cargo.toml:19] |
| 18 | `features` | Workspace member entry | [E: codex-rs/Cargo.toml:20] |
| 19 | `install-context` | Workspace member entry | [E: codex-rs/Cargo.toml:21] |
| 20 | `codex-backend-openapi-models` | Workspace member entry | [E: codex-rs/Cargo.toml:22] |
| 21 | `code-mode` | Workspace member entry | [E: codex-rs/Cargo.toml:23] |
| 22 | `code-mode-host` | Workspace member entry | [E: codex-rs/Cargo.toml:24] |
| 23 | `code-mode-protocol` | Workspace member entry | [E: codex-rs/Cargo.toml:25] |
| 24 | `codex-home` | Workspace member entry | [E: codex-rs/Cargo.toml:26] |
| 25 | `cloud-config` | Workspace member entry | [E: codex-rs/Cargo.toml:27] |
| 26 | `cloud-tasks` | Workspace member entry | [E: codex-rs/Cargo.toml:28] |
| 27 | `cloud-tasks-client` | Workspace member entry | [E: codex-rs/Cargo.toml:29] |
| 28 | `cloud-tasks-mock-client` | Workspace member entry | [E: codex-rs/Cargo.toml:30] |
| 29 | `cli` | Workspace member entry | [E: codex-rs/Cargo.toml:31] |
| 30 | `collaboration-mode-templates` | Workspace member entry | [E: codex-rs/Cargo.toml:32] |
| 31 | `connectors` | Workspace member entry | [E: codex-rs/Cargo.toml:33] |
| 32 | `config` | Workspace member entry | [E: codex-rs/Cargo.toml:34] |
| 33 | `context-fragments` | Workspace member entry | [E: codex-rs/Cargo.toml:35] |
| 34 | `shell-command` | Workspace member entry | [E: codex-rs/Cargo.toml:36] |
| 35 | `shell-escalation` | Workspace member entry | [E: codex-rs/Cargo.toml:37] |
| 36 | `skills` | Workspace member entry | [E: codex-rs/Cargo.toml:38] |
| 37 | `core` | Workspace member entry | [E: codex-rs/Cargo.toml:39] |
| 38 | `core-api` | Workspace member entry | [E: codex-rs/Cargo.toml:40] |
| 39 | `core-plugins` | Workspace member entry | [E: codex-rs/Cargo.toml:41] |
| 40 | `core-skills` | Workspace member entry | [E: codex-rs/Cargo.toml:42] |
| 41 | `hooks` | Workspace member entry | [E: codex-rs/Cargo.toml:43] |
| 42 | `secrets` | Workspace member entry | [E: codex-rs/Cargo.toml:44] |
| 43 | `exec` | Workspace member entry | [E: codex-rs/Cargo.toml:45] |
| 44 | `file-system` | Workspace member entry | [E: codex-rs/Cargo.toml:46] |
| 45 | `exec-server` | Workspace member entry | [E: codex-rs/Cargo.toml:47] |
| 46 | `execpolicy` | Workspace member entry | [E: codex-rs/Cargo.toml:48] |
| 47 | `execpolicy-legacy` | Workspace member entry | [E: codex-rs/Cargo.toml:49] |
| 48 | `ext/extension-api` | Workspace member entry | [E: codex-rs/Cargo.toml:50] |
| 49 | `ext/goal` | Workspace member entry | [E: codex-rs/Cargo.toml:51] |
| 50 | `ext/guardian` | Workspace member entry | [E: codex-rs/Cargo.toml:52] |
| 51 | `ext/image-generation` | Workspace member entry | [E: codex-rs/Cargo.toml:53] |
| 52 | `ext/memories` | Workspace member entry | [E: codex-rs/Cargo.toml:54] |
| 53 | `ext/mcp` | Workspace member entry | [E: codex-rs/Cargo.toml:55] |
| 54 | `ext/skills` | Workspace member entry | [E: codex-rs/Cargo.toml:56] |
| 55 | `ext/web-search` | Workspace member entry | [E: codex-rs/Cargo.toml:57] |
| 56 | `external-agent-migration` | Workspace member entry | [E: codex-rs/Cargo.toml:58] |
| 57 | `external-agent-sessions` | Workspace member entry | [E: codex-rs/Cargo.toml:59] |
| 58 | `keyring-store` | Workspace member entry | [E: codex-rs/Cargo.toml:60] |
| 59 | `file-search` | Workspace member entry | [E: codex-rs/Cargo.toml:61] |
| 60 | `file-watcher` | Workspace member entry | [E: codex-rs/Cargo.toml:62] |
| 61 | `linux-sandbox` | Workspace member entry | [E: codex-rs/Cargo.toml:63] |
| 62 | `lmstudio` | Workspace member entry | [E: codex-rs/Cargo.toml:64] |
| 63 | `login` | Workspace member entry | [E: codex-rs/Cargo.toml:65] |
| 64 | `codex-mcp` | Workspace member entry | [E: codex-rs/Cargo.toml:66] |
| 65 | `mcp-server` | Workspace member entry | [E: codex-rs/Cargo.toml:67] |
| 66 | `memories/read` | Workspace member entry | [E: codex-rs/Cargo.toml:68] |
| 67 | `memories/write` | Workspace member entry | [E: codex-rs/Cargo.toml:69] |
| 68 | `model-provider-info` | Workspace member entry | [E: codex-rs/Cargo.toml:70] |
| 69 | `models-manager` | Workspace member entry | [E: codex-rs/Cargo.toml:71] |
| 70 | `network-proxy` | Workspace member entry | [E: codex-rs/Cargo.toml:72] |
| 71 | `ollama` | Workspace member entry | [E: codex-rs/Cargo.toml:73] |
| 72 | `process-hardening` | Workspace member entry | [E: codex-rs/Cargo.toml:74] |
| 73 | `protocol` | Workspace member entry | [E: codex-rs/Cargo.toml:75] |
| 74 | `realtime-webrtc` | Workspace member entry | [E: codex-rs/Cargo.toml:76] |
| 75 | `prompts` | Workspace member entry | [E: codex-rs/Cargo.toml:77] |
| 76 | `rollout` | Workspace member entry | [E: codex-rs/Cargo.toml:78] |
| 77 | `rollout-trace` | Workspace member entry | [E: codex-rs/Cargo.toml:79] |
| 78 | `rmcp-client` | Workspace member entry | [E: codex-rs/Cargo.toml:80] |
| 79 | `responses-api-proxy` | Workspace member entry | [E: codex-rs/Cargo.toml:81] |
| 80 | `response-debug-context` | Workspace member entry | [E: codex-rs/Cargo.toml:82] |
| 81 | `sandboxing` | Workspace member entry | [E: codex-rs/Cargo.toml:83] |
| 82 | `stdio-to-uds` | Workspace member entry | [E: codex-rs/Cargo.toml:84] |
| 83 | `otel` | Workspace member entry | [E: codex-rs/Cargo.toml:85] |
| 84 | `tui` | Workspace member entry | [E: codex-rs/Cargo.toml:86] |
| 85 | `tools` | Workspace member entry | [E: codex-rs/Cargo.toml:87] |
| 86 | `v8-poc` | Workspace member entry | [E: codex-rs/Cargo.toml:88] |
| 87 | `utils/absolute-path` | Workspace member entry | [E: codex-rs/Cargo.toml:89] |
| 88 | `utils/path-uri` | Workspace member entry | [E: codex-rs/Cargo.toml:90] |
| 89 | `utils/cargo-bin` | Workspace member entry | [E: codex-rs/Cargo.toml:91] |
| 90 | `git-utils` | Workspace member entry | [E: codex-rs/Cargo.toml:92] |
| 91 | `utils/cache` | Workspace member entry | [E: codex-rs/Cargo.toml:93] |
| 92 | `utils/image` | Workspace member entry | [E: codex-rs/Cargo.toml:94] |
| 93 | `utils/json-to-toml` | Workspace member entry | [E: codex-rs/Cargo.toml:95] |
| 94 | `utils/home-dir` | Workspace member entry | [E: codex-rs/Cargo.toml:96] |
| 95 | `utils/pty` | Workspace member entry | [E: codex-rs/Cargo.toml:97] |
| 96 | `utils/readiness` | Workspace member entry | [E: codex-rs/Cargo.toml:98] |
| 97 | `utils/rustls-provider` | Workspace member entry | [E: codex-rs/Cargo.toml:99] |
| 98 | `utils/string` | Workspace member entry | [E: codex-rs/Cargo.toml:100] |
| 99 | `utils/cli` | Workspace member entry | [E: codex-rs/Cargo.toml:101] |
| 100 | `utils/elapsed` | Workspace member entry | [E: codex-rs/Cargo.toml:102] |
| 101 | `utils/sandbox-summary` | Workspace member entry | [E: codex-rs/Cargo.toml:103] |
| 102 | `utils/sleep-inhibitor` | Workspace member entry | [E: codex-rs/Cargo.toml:104] |
| 103 | `utils/approval-presets` | Workspace member entry | [E: codex-rs/Cargo.toml:105] |
| 104 | `utils/oss` | Workspace member entry | [E: codex-rs/Cargo.toml:106] |
| 105 | `utils/output-truncation` | Workspace member entry | [E: codex-rs/Cargo.toml:107] |
| 106 | `utils/path-utils` | Workspace member entry | [E: codex-rs/Cargo.toml:108] |
| 107 | `utils/plugins` | Workspace member entry | [E: codex-rs/Cargo.toml:109] |
| 108 | `utils/fuzzy-match` | Workspace member entry | [E: codex-rs/Cargo.toml:110] |
| 109 | `utils/stream-parser` | Workspace member entry | [E: codex-rs/Cargo.toml:111] |
| 110 | `utils/template` | Workspace member entry | [E: codex-rs/Cargo.toml:112] |
| 111 | `codex-client` | Workspace member entry | [E: codex-rs/Cargo.toml:113] |
| 112 | `codex-api` | Workspace member entry | [E: codex-rs/Cargo.toml:114] |
| 113 | `state` | Workspace member entry | [E: codex-rs/Cargo.toml:115] |
| 114 | `terminal-detection` | Workspace member entry | [E: codex-rs/Cargo.toml:116] |
| 115 | `test-binary-support` | Workspace member entry | [E: codex-rs/Cargo.toml:117] |
| 116 | `thread-manager-sample` | Workspace member entry | [E: codex-rs/Cargo.toml:118] |
| 117 | `thread-store` | Workspace member entry | [E: codex-rs/Cargo.toml:119] |
| 118 | `uds` | Workspace member entry | [E: codex-rs/Cargo.toml:120] |
| 119 | `codex-experimental-api-macros` | Workspace member entry | [E: codex-rs/Cargo.toml:121] |
| 120 | `plugin` | Workspace member entry | [E: codex-rs/Cargo.toml:122] |
| 121 | `model-provider` | Workspace member entry | [E: codex-rs/Cargo.toml:123] |

## Sources

- `codex-rs/Cargo.toml`

## 相关

- [spine.overview](../spine/overview.md)
- [ref.key-types](key-types.md)
- [ref.feature-flags](feature-flags.md)
- [ref.env-vars](env-vars.md)
