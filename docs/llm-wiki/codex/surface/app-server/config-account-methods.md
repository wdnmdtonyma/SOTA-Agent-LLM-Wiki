---
id: rpc.config-account-methods
title: config/account/model/system 方法
kind: rpc
tier: T1
source: [codex-rs/app-server-protocol/src/protocol/common.rs, codex-rs/app-server-protocol/src/protocol/v2/config.rs, codex-rs/app-server-protocol/src/protocol/v2/account.rs, codex-rs/app-server-protocol/src/protocol/v2/model.rs, codex-rs/app-server-protocol/src/protocol/v2/permissions.rs, codex-rs/app-server-protocol/src/protocol/v2/remote_control.rs, codex-rs/app-server-protocol/src/protocol/v2/windows_sandbox.rs, codex-rs/app-server-protocol/src/protocol/v2/feedback.rs, codex-rs/app-server-protocol/src/protocol/v2/plugin.rs, codex-rs/app-server-protocol/src/protocol/v2/experimental_feature.rs, codex-rs/app-server-protocol/src/protocol/v2/collaboration_mode.rs, codex-rs/app-server-protocol/src/protocol/v2/thread.rs, codex-rs/app-server-protocol/src/protocol/v2/environment.rs]
symbols: [ConfigReadParams, ConfigWriteResponse, ConfigRequirements, LoginAccountParams, LoginAccountResponse, GetAccountResponse, ModelListParams, PermissionProfileListParams, RemoteControlEnableResponse, FeedbackUploadParams]
related: [surface.cli.external-agent-import, rpc.overview, rpc.notifications-system, rpc.thread-methods]
evidence: explicit
status: verified
updated: 5670360009
---

> config/account/model/system 方法是 app-server 面向设置页、登录页、model picker、feature gate、remote control、Windows sandbox 和外部 agent 配置迁移 UI 的 client request catalog。

## 能回答的问题

- config/account/model/permission/remoteControl/system 方法当前有哪些 wire method？
- 哪些方法是 experimental 或按 params 字段检查 experimental gate？
- account login 与 account notifications 如何拆开？
- external agent config migration 和 Windows sandbox setup 在 RPC 表中落在哪里？

## 字段模型

config read/write/requirements/external-agent migration 类型都在 `v2/config.rs`；account login/read/rate-limit 类型在 `v2/account.rs`；model、permission、remote control、Windows sandbox、feedback 分别在对应 v2 模块定义。[E: codex-rs/app-server-protocol/src/protocol/v2/config.rs:326][E: codex-rs/app-server-protocol/src/protocol/v2/config.rs:349][E: codex-rs/app-server-protocol/src/protocol/v2/config.rs:373][E: codex-rs/app-server-protocol/src/protocol/v2/config.rs:653][E: codex-rs/app-server-protocol/src/protocol/v2/config.rs:746][E: codex-rs/app-server-protocol/src/protocol/v2/account.rs:58][E: codex-rs/app-server-protocol/src/protocol/v2/account.rs:99][E: codex-rs/app-server-protocol/src/protocol/v2/model.rs:43][E: codex-rs/app-server-protocol/src/protocol/v2/permissions.rs:361][E: codex-rs/app-server-protocol/src/protocol/v2/remote_control.rs:40][E: codex-rs/app-server-protocol/src/protocol/v2/windows_sandbox.rs:36][E: codex-rs/app-server-protocol/src/protocol/v2/feedback.rs:11]

`LoginAccountParams` 是 tagged enum，`LoginAccountResponse` 同样是 tagged enum；`AccountLoginCompleted` 是 server notification，而不是 `account/login/start` 的同步 response。[E: codex-rs/app-server-protocol/src/protocol/v2/account.rs:58][E: codex-rs/app-server-protocol/src/protocol/v2/account.rs:99][E: codex-rs/app-server-protocol/src/protocol/common.rs:1661][E: codex-rs/app-server-protocol/src/protocol/common.rs:1664]

## 方法 catalog

| Variant | Wire method | Params type | Response type | Gate | Evidence |
|---|---|---|---|---|---|
| `HooksList` | `hooks/list` | `v2::HooksListParams` | `v2::HooksListResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:667][E: codex-rs/app-server-protocol/src/protocol/common.rs:668][E: codex-rs/app-server-protocol/src/protocol/common.rs:670] |
| `ModelList` | `model/list` | `v2::ModelListParams` | `v2::ModelListResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:858][E: codex-rs/app-server-protocol/src/protocol/common.rs:859][E: codex-rs/app-server-protocol/src/protocol/common.rs:861] |
| `ModelProviderCapabilitiesRead` | `modelProvider/capabilities/read` | `v2::ModelProviderCapabilitiesReadParams` | `v2::ModelProviderCapabilitiesReadResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:863][E: codex-rs/app-server-protocol/src/protocol/common.rs:864][E: codex-rs/app-server-protocol/src/protocol/common.rs:866] |
| `ExperimentalFeatureList` | `experimentalFeature/list` | `v2::ExperimentalFeatureListParams` | `v2::ExperimentalFeatureListResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:868][E: codex-rs/app-server-protocol/src/protocol/common.rs:869][E: codex-rs/app-server-protocol/src/protocol/common.rs:871] |
| `PermissionProfileList` | `permissionProfile/list` | `v2::PermissionProfileListParams` | `v2::PermissionProfileListResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:873][E: codex-rs/app-server-protocol/src/protocol/common.rs:874][E: codex-rs/app-server-protocol/src/protocol/common.rs:876] |
| `ExperimentalFeatureEnablementSet` | `experimentalFeature/enablement/set` | `v2::ExperimentalFeatureEnablementSetParams` | `v2::ExperimentalFeatureEnablementSetResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:878][E: codex-rs/app-server-protocol/src/protocol/common.rs:879][E: codex-rs/app-server-protocol/src/protocol/common.rs:881] |
| `RemoteControlEnable` | `remoteControl/enable` | `v2::NullableRemoteControlEnableParams` | `v2::RemoteControlEnableResponse` | experimental: remoteControl/enable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:883][E: codex-rs/app-server-protocol/src/protocol/common.rs:884][E: codex-rs/app-server-protocol/src/protocol/common.rs:885][E: codex-rs/app-server-protocol/src/protocol/common.rs:887] |
| `RemoteControlDisable` | `remoteControl/disable` | `v2::NullableRemoteControlDisableParams` | `v2::RemoteControlDisableResponse` | experimental: remoteControl/disable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:889][E: codex-rs/app-server-protocol/src/protocol/common.rs:890][E: codex-rs/app-server-protocol/src/protocol/common.rs:891][E: codex-rs/app-server-protocol/src/protocol/common.rs:893] |
| `RemoteControlStatusRead` | `remoteControl/status/read` | `Option<()>` | `v2::RemoteControlStatusReadResponse` | experimental: remoteControl/status/read | [E: codex-rs/app-server-protocol/src/protocol/common.rs:895][E: codex-rs/app-server-protocol/src/protocol/common.rs:896][E: codex-rs/app-server-protocol/src/protocol/common.rs:897][E: codex-rs/app-server-protocol/src/protocol/common.rs:899] |
| `RemoteControlPairingStart` | `remoteControl/pairing/start` | `v2::RemoteControlPairingStartParams` | `v2::RemoteControlPairingStartResponse` | experimental: remoteControl/pairing/start | [E: codex-rs/app-server-protocol/src/protocol/common.rs:901][E: codex-rs/app-server-protocol/src/protocol/common.rs:902][E: codex-rs/app-server-protocol/src/protocol/common.rs:903][E: codex-rs/app-server-protocol/src/protocol/common.rs:905] |
| `RemoteControlPairingStatus` | `remoteControl/pairing/status` | `v2::RemoteControlPairingStatusParams` | `v2::RemoteControlPairingStatusResponse` | experimental: remoteControl/pairing/status | [E: codex-rs/app-server-protocol/src/protocol/common.rs:907][E: codex-rs/app-server-protocol/src/protocol/common.rs:908][E: codex-rs/app-server-protocol/src/protocol/common.rs:909][E: codex-rs/app-server-protocol/src/protocol/common.rs:911] |
| `RemoteControlClientsList` | `remoteControl/client/list` | `v2::RemoteControlClientsListParams` | `v2::RemoteControlClientsListResponse` | experimental: remoteControl/client/list | [E: codex-rs/app-server-protocol/src/protocol/common.rs:913][E: codex-rs/app-server-protocol/src/protocol/common.rs:914][E: codex-rs/app-server-protocol/src/protocol/common.rs:915][E: codex-rs/app-server-protocol/src/protocol/common.rs:917] |
| `RemoteControlClientsRevoke` | `remoteControl/client/revoke` | `v2::RemoteControlClientsRevokeParams` | `v2::RemoteControlClientsRevokeResponse` | experimental: remoteControl/client/revoke | [E: codex-rs/app-server-protocol/src/protocol/common.rs:919][E: codex-rs/app-server-protocol/src/protocol/common.rs:920][E: codex-rs/app-server-protocol/src/protocol/common.rs:921][E: codex-rs/app-server-protocol/src/protocol/common.rs:923] |
| `CollaborationModeList` | `collaborationMode/list` | `v2::CollaborationModeListParams` | `v2::CollaborationModeListResponse` | experimental: collaborationMode/list | [E: codex-rs/app-server-protocol/src/protocol/common.rs:925][E: codex-rs/app-server-protocol/src/protocol/common.rs:927][E: codex-rs/app-server-protocol/src/protocol/common.rs:928][E: codex-rs/app-server-protocol/src/protocol/common.rs:930] |
| `MockExperimentalMethod` | `mock/experimentalMethod` | `v2::MockExperimentalMethodParams` | `v2::MockExperimentalMethodResponse` | experimental: mock/experimentalMethod | [E: codex-rs/app-server-protocol/src/protocol/common.rs:932][E: codex-rs/app-server-protocol/src/protocol/common.rs:934][E: codex-rs/app-server-protocol/src/protocol/common.rs:935][E: codex-rs/app-server-protocol/src/protocol/common.rs:937] |
| `EnvironmentAdd` | `environment/add` | `v2::EnvironmentAddParams` | `v2::EnvironmentAddResponse` | experimental: environment/add | [E: codex-rs/app-server-protocol/src/protocol/common.rs:939][E: codex-rs/app-server-protocol/src/protocol/common.rs:941][E: codex-rs/app-server-protocol/src/protocol/common.rs:942][E: codex-rs/app-server-protocol/src/protocol/common.rs:944] |
| `WindowsSandboxSetupStart` | `windowsSandbox/setupStart` | `v2::WindowsSandboxSetupStartParams` | `v2::WindowsSandboxSetupStartResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:977][E: codex-rs/app-server-protocol/src/protocol/common.rs:978][E: codex-rs/app-server-protocol/src/protocol/common.rs:980] |
| `WindowsSandboxReadiness` | `windowsSandbox/readiness` | `Option<()>` | `v2::WindowsSandboxReadinessResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:982][E: codex-rs/app-server-protocol/src/protocol/common.rs:983][E: codex-rs/app-server-protocol/src/protocol/common.rs:985] |
| `LoginAccount` | `account/login/start` | `v2::LoginAccountParams` | `v2::LoginAccountResponse` | params-inspected | [E: codex-rs/app-server-protocol/src/protocol/common.rs:988][E: codex-rs/app-server-protocol/src/protocol/common.rs:989][E: codex-rs/app-server-protocol/src/protocol/common.rs:990][E: codex-rs/app-server-protocol/src/protocol/common.rs:992] |
| `CancelLoginAccount` | `account/login/cancel` | `v2::CancelLoginAccountParams` | `v2::CancelLoginAccountResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:995][E: codex-rs/app-server-protocol/src/protocol/common.rs:996][E: codex-rs/app-server-protocol/src/protocol/common.rs:998] |
| `LogoutAccount` | `account/logout` | `Option<()>` | `v2::LogoutAccountResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1001][E: codex-rs/app-server-protocol/src/protocol/common.rs:1002][E: codex-rs/app-server-protocol/src/protocol/common.rs:1004] |
| `GetAccountRateLimits` | `account/rateLimits/read` | `Option<()>` | `v2::GetAccountRateLimitsResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1007][E: codex-rs/app-server-protocol/src/protocol/common.rs:1008][E: codex-rs/app-server-protocol/src/protocol/common.rs:1010] |
| `ConsumeAccountRateLimitResetCredit` | `account/rateLimitResetCredit/consume` | `v2::ConsumeAccountRateLimitResetCreditParams` | `v2::ConsumeAccountRateLimitResetCreditResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1013][E: codex-rs/app-server-protocol/src/protocol/common.rs:1014][E: codex-rs/app-server-protocol/src/protocol/common.rs:1016] |
| `GetAccountTokenUsage` | `account/usage/read` | `Option<()>` | `v2::GetAccountTokenUsageResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1019][E: codex-rs/app-server-protocol/src/protocol/common.rs:1020][E: codex-rs/app-server-protocol/src/protocol/common.rs:1022] |
| `SendAddCreditsNudgeEmail` | `account/sendAddCreditsNudgeEmail` | `v2::SendAddCreditsNudgeEmailParams` | `v2::SendAddCreditsNudgeEmailResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1025][E: codex-rs/app-server-protocol/src/protocol/common.rs:1026][E: codex-rs/app-server-protocol/src/protocol/common.rs:1028] |
| `FeedbackUpload` | `feedback/upload` | `v2::FeedbackUploadParams` | `v2::FeedbackUploadResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1031][E: codex-rs/app-server-protocol/src/protocol/common.rs:1032][E: codex-rs/app-server-protocol/src/protocol/common.rs:1034] |
| `ConfigRead` | `config/read` | `v2::ConfigReadParams` | `v2::ConfigReadResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1091][E: codex-rs/app-server-protocol/src/protocol/common.rs:1092][E: codex-rs/app-server-protocol/src/protocol/common.rs:1094] |
| `ExternalAgentConfigDetect` | `externalAgentConfig/detect` | `v2::ExternalAgentConfigDetectParams` | `v2::ExternalAgentConfigDetectResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1096][E: codex-rs/app-server-protocol/src/protocol/common.rs:1097][E: codex-rs/app-server-protocol/src/protocol/common.rs:1099] |
| `ExternalAgentConfigImport` | `externalAgentConfig/import` | `v2::ExternalAgentConfigImportParams` | `v2::ExternalAgentConfigImportResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1101][E: codex-rs/app-server-protocol/src/protocol/common.rs:1102][E: codex-rs/app-server-protocol/src/protocol/common.rs:1104] |
| `ExternalAgentConfigImportHistoriesRead` | `externalAgentConfig/import/readHistories` | `Option<()>` | `v2::ExternalAgentConfigImportHistoriesReadResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1106][E: codex-rs/app-server-protocol/src/protocol/common.rs:1107][E: codex-rs/app-server-protocol/src/protocol/common.rs:1109] |
| `ConfigValueWrite` | `config/value/write` | `v2::ConfigValueWriteParams` | `v2::ConfigWriteResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1111][E: codex-rs/app-server-protocol/src/protocol/common.rs:1112][E: codex-rs/app-server-protocol/src/protocol/common.rs:1115] |
| `ConfigBatchWrite` | `config/batchWrite` | `v2::ConfigBatchWriteParams` | `v2::ConfigWriteResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1117][E: codex-rs/app-server-protocol/src/protocol/common.rs:1118][E: codex-rs/app-server-protocol/src/protocol/common.rs:1121] |
| `ConfigRequirementsRead` | `configRequirements/read` | `Option<()>` | `v2::ConfigRequirementsReadResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1124][E: codex-rs/app-server-protocol/src/protocol/common.rs:1125][E: codex-rs/app-server-protocol/src/protocol/common.rs:1127] |
| `GetAccount` | `account/read` | `v2::GetAccountParams` | `v2::GetAccountResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1130][E: codex-rs/app-server-protocol/src/protocol/common.rs:1131][E: codex-rs/app-server-protocol/src/protocol/common.rs:1133] |

## Sources

- `codex-rs/app-server-protocol/src/protocol/common.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/config.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/account.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/model.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/permissions.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/remote_control.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/windows_sandbox.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/feedback.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/plugin.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/experimental_feature.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/collaboration_mode.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/thread.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/environment.rs`

## 相关

- `rpc.overview` -> [App-Server 协议总览](overview.md)
- `rpc.notifications-system` -> [server notifications: system](notifications-system.md)
- [从外部 agent 导入](../cli/external-agent-import.md)
