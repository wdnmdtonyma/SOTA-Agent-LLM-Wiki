---
id: rpc.config-account-methods
title: config/account/model/system 方法
kind: rpc
tier: T1
source: [codex-rs/app-server-protocol/src/protocol/common.rs, codex-rs/app-server-protocol/src/protocol/v2/config.rs, codex-rs/app-server-protocol/src/protocol/v2/account.rs, codex-rs/app-server-protocol/src/protocol/v2/model.rs, codex-rs/app-server-protocol/src/protocol/v2/permissions.rs, codex-rs/app-server-protocol/src/protocol/v2/remote_control.rs, codex-rs/app-server-protocol/src/protocol/v2/windows_sandbox.rs, codex-rs/app-server-protocol/src/protocol/v2/feedback.rs, codex-rs/app-server-protocol/src/protocol/v2/plugin.rs, codex-rs/app-server-protocol/src/protocol/v2/experimental_feature.rs, codex-rs/app-server-protocol/src/protocol/v2/collaboration_mode.rs, codex-rs/app-server-protocol/src/protocol/v2/thread.rs, codex-rs/app-server-protocol/src/protocol/v2/environment.rs]
symbols: [ConfigReadParams, ConfigWriteResponse, ConfigRequirements, LoginAccountParams, LoginAccountResponse, GetAccountResponse, GetWorkspaceMessagesResponse, ModelListParams, PermissionProfileListParams, RemoteControlEnableResponse, FeedbackUploadParams, EnvironmentInfoParams, EnvironmentStatusParams, EnvironmentStatusResponse]
related: [surface.cli.external-agent-import, rpc.overview, rpc.notifications-system, rpc.thread-methods]
evidence: explicit
status: verified
updated: 4d7a5c7c73
---

> config/account/model/system 方法是 app-server 面向设置页、登录页、model picker、feature gate、remote control、Windows sandbox 和外部 agent 配置迁移 UI 的 client request catalog。

## 能回答的问题

- config/account/model/permission/remoteControl/system 方法当前有哪些 wire method？
- 哪些方法是 experimental 或按 params 字段检查 experimental gate？
- account login 与 account notifications 如何拆开？
- external agent config migration 和 Windows sandbox setup 在 RPC 表中落在哪里？

## 字段模型

config read/write/requirements/external-agent migration 类型都在 `v2/config.rs`；account login/read/rate-limit/workspace-message 类型在 `v2/account.rs`；model、permission、remote control、Windows sandbox、feedback、environment 分别在对应 v2 模块定义。[E: codex-rs/app-server-protocol/src/protocol/v2/config.rs:327][E: codex-rs/app-server-protocol/src/protocol/v2/config.rs:350][E: codex-rs/app-server-protocol/src/protocol/v2/config.rs:374][E: codex-rs/app-server-protocol/src/protocol/v2/config.rs:670][E: codex-rs/app-server-protocol/src/protocol/v2/config.rs:770][E: codex-rs/app-server-protocol/src/protocol/v2/account.rs:65][E: codex-rs/app-server-protocol/src/protocol/v2/account.rs:126][E: codex-rs/app-server-protocol/src/protocol/v2/account.rs:400][E: codex-rs/app-server-protocol/src/protocol/v2/model.rs:43][E: codex-rs/app-server-protocol/src/protocol/v2/permissions.rs:378][E: codex-rs/app-server-protocol/src/protocol/v2/remote_control.rs:40][E: codex-rs/app-server-protocol/src/protocol/v2/windows_sandbox.rs:36][E: codex-rs/app-server-protocol/src/protocol/v2/feedback.rs:11][E: codex-rs/app-server-protocol/src/protocol/v2/environment.rs:10][E: codex-rs/app-server-protocol/src/protocol/v2/environment.rs:35]

`LoginAccountParams` 是 tagged enum，`LoginAccountResponse` 同样是 tagged enum；`AccountLoginCompleted` 是 server notification，而不是 `account/login/start` 的同步 response。[E: codex-rs/app-server-protocol/src/protocol/v2/account.rs:65][E: codex-rs/app-server-protocol/src/protocol/v2/account.rs:126][E: codex-rs/app-server-protocol/src/protocol/common.rs:1735][E: codex-rs/app-server-protocol/src/protocol/common.rs:1738]

## 方法 catalog

| Variant | Wire method | Params type | Response type | Gate | Evidence |
|---|---|---|---|---|---|
| `HooksList` | `hooks/list` | `v2::HooksListParams` | `v2::HooksListResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:680][E: codex-rs/app-server-protocol/src/protocol/common.rs:681][E: codex-rs/app-server-protocol/src/protocol/common.rs:683] |
| `ModelList` | `model/list` | `v2::ModelListParams` | `v2::ModelListResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:881][E: codex-rs/app-server-protocol/src/protocol/common.rs:882][E: codex-rs/app-server-protocol/src/protocol/common.rs:884] |
| `ModelProviderCapabilitiesRead` | `modelProvider/capabilities/read` | `v2::ModelProviderCapabilitiesReadParams` | `v2::ModelProviderCapabilitiesReadResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:886][E: codex-rs/app-server-protocol/src/protocol/common.rs:887][E: codex-rs/app-server-protocol/src/protocol/common.rs:889] |
| `ExperimentalFeatureList` | `experimentalFeature/list` | `v2::ExperimentalFeatureListParams` | `v2::ExperimentalFeatureListResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:891][E: codex-rs/app-server-protocol/src/protocol/common.rs:892][E: codex-rs/app-server-protocol/src/protocol/common.rs:894] |
| `PermissionProfileList` | `permissionProfile/list` | `v2::PermissionProfileListParams` | `v2::PermissionProfileListResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:896][E: codex-rs/app-server-protocol/src/protocol/common.rs:897][E: codex-rs/app-server-protocol/src/protocol/common.rs:899] |
| `ExperimentalFeatureEnablementSet` | `experimentalFeature/enablement/set` | `v2::ExperimentalFeatureEnablementSetParams` | `v2::ExperimentalFeatureEnablementSetResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:901][E: codex-rs/app-server-protocol/src/protocol/common.rs:902][E: codex-rs/app-server-protocol/src/protocol/common.rs:904] |
| `RemoteControlEnable` | `remoteControl/enable` | `v2::NullableRemoteControlEnableParams` | `v2::RemoteControlEnableResponse` | experimental: remoteControl/enable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:906][E: codex-rs/app-server-protocol/src/protocol/common.rs:907][E: codex-rs/app-server-protocol/src/protocol/common.rs:908][E: codex-rs/app-server-protocol/src/protocol/common.rs:910] |
| `RemoteControlDisable` | `remoteControl/disable` | `v2::NullableRemoteControlDisableParams` | `v2::RemoteControlDisableResponse` | experimental: remoteControl/disable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:912][E: codex-rs/app-server-protocol/src/protocol/common.rs:913][E: codex-rs/app-server-protocol/src/protocol/common.rs:914][E: codex-rs/app-server-protocol/src/protocol/common.rs:916] |
| `RemoteControlStatusRead` | `remoteControl/status/read` | `Option<()>` | `v2::RemoteControlStatusReadResponse` | experimental: remoteControl/status/read | [E: codex-rs/app-server-protocol/src/protocol/common.rs:918][E: codex-rs/app-server-protocol/src/protocol/common.rs:919][E: codex-rs/app-server-protocol/src/protocol/common.rs:920][E: codex-rs/app-server-protocol/src/protocol/common.rs:922] |
| `RemoteControlPairingStart` | `remoteControl/pairing/start` | `v2::RemoteControlPairingStartParams` | `v2::RemoteControlPairingStartResponse` | experimental: remoteControl/pairing/start | [E: codex-rs/app-server-protocol/src/protocol/common.rs:924][E: codex-rs/app-server-protocol/src/protocol/common.rs:925][E: codex-rs/app-server-protocol/src/protocol/common.rs:926][E: codex-rs/app-server-protocol/src/protocol/common.rs:928] |
| `RemoteControlPairingStatus` | `remoteControl/pairing/status` | `v2::RemoteControlPairingStatusParams` | `v2::RemoteControlPairingStatusResponse` | experimental: remoteControl/pairing/status | [E: codex-rs/app-server-protocol/src/protocol/common.rs:930][E: codex-rs/app-server-protocol/src/protocol/common.rs:931][E: codex-rs/app-server-protocol/src/protocol/common.rs:932][E: codex-rs/app-server-protocol/src/protocol/common.rs:934] |
| `RemoteControlClientsList` | `remoteControl/client/list` | `v2::RemoteControlClientsListParams` | `v2::RemoteControlClientsListResponse` | experimental: remoteControl/client/list | [E: codex-rs/app-server-protocol/src/protocol/common.rs:936][E: codex-rs/app-server-protocol/src/protocol/common.rs:937][E: codex-rs/app-server-protocol/src/protocol/common.rs:938][E: codex-rs/app-server-protocol/src/protocol/common.rs:940] |
| `RemoteControlClientsRevoke` | `remoteControl/client/revoke` | `v2::RemoteControlClientsRevokeParams` | `v2::RemoteControlClientsRevokeResponse` | experimental: remoteControl/client/revoke | [E: codex-rs/app-server-protocol/src/protocol/common.rs:942][E: codex-rs/app-server-protocol/src/protocol/common.rs:943][E: codex-rs/app-server-protocol/src/protocol/common.rs:944][E: codex-rs/app-server-protocol/src/protocol/common.rs:946] |
| `CollaborationModeList` | `collaborationMode/list` | `v2::CollaborationModeListParams` | `v2::CollaborationModeListResponse` | experimental: collaborationMode/list | [E: codex-rs/app-server-protocol/src/protocol/common.rs:948][E: codex-rs/app-server-protocol/src/protocol/common.rs:950][E: codex-rs/app-server-protocol/src/protocol/common.rs:951][E: codex-rs/app-server-protocol/src/protocol/common.rs:953] |
| `MockExperimentalMethod` | `mock/experimentalMethod` | `v2::MockExperimentalMethodParams` | `v2::MockExperimentalMethodResponse` | experimental: mock/experimentalMethod | [E: codex-rs/app-server-protocol/src/protocol/common.rs:955][E: codex-rs/app-server-protocol/src/protocol/common.rs:957][E: codex-rs/app-server-protocol/src/protocol/common.rs:958][E: codex-rs/app-server-protocol/src/protocol/common.rs:960] |
| `EnvironmentAdd` | `environment/add` | `v2::EnvironmentAddParams` | `v2::EnvironmentAddResponse` | experimental: environment/add | [E: codex-rs/app-server-protocol/src/protocol/common.rs:962][E: codex-rs/app-server-protocol/src/protocol/common.rs:964][E: codex-rs/app-server-protocol/src/protocol/common.rs:965][E: codex-rs/app-server-protocol/src/protocol/common.rs:967] |
| `EnvironmentInfo` | `environment/info` | `v2::EnvironmentInfoParams` | `v2::EnvironmentInfoResponse` | experimental: environment/info | [E: codex-rs/app-server-protocol/src/protocol/common.rs:969][E: codex-rs/app-server-protocol/src/protocol/common.rs:971][E: codex-rs/app-server-protocol/src/protocol/common.rs:972][E: codex-rs/app-server-protocol/src/protocol/common.rs:974] |
| `EnvironmentStatus` | `environment/status` | `v2::EnvironmentStatusParams` | `v2::EnvironmentStatusResponse` | experimental: environment/status | [E: codex-rs/app-server-protocol/src/protocol/common.rs:976][E: codex-rs/app-server-protocol/src/protocol/common.rs:978][E: codex-rs/app-server-protocol/src/protocol/common.rs:979][E: codex-rs/app-server-protocol/src/protocol/common.rs:981] |
| `WindowsSandboxSetupStart` | `windowsSandbox/setupStart` | `v2::WindowsSandboxSetupStartParams` | `v2::WindowsSandboxSetupStartResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1014][E: codex-rs/app-server-protocol/src/protocol/common.rs:1015][E: codex-rs/app-server-protocol/src/protocol/common.rs:1017] |
| `WindowsSandboxReadiness` | `windowsSandbox/readiness` | `Option<()>` | `v2::WindowsSandboxReadinessResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1019][E: codex-rs/app-server-protocol/src/protocol/common.rs:1020][E: codex-rs/app-server-protocol/src/protocol/common.rs:1022] |
| `LoginAccount` | `account/login/start` | `v2::LoginAccountParams` | `v2::LoginAccountResponse` | params-inspected | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1025][E: codex-rs/app-server-protocol/src/protocol/common.rs:1026][E: codex-rs/app-server-protocol/src/protocol/common.rs:1027][E: codex-rs/app-server-protocol/src/protocol/common.rs:1029] |
| `CancelLoginAccount` | `account/login/cancel` | `v2::CancelLoginAccountParams` | `v2::CancelLoginAccountResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1032][E: codex-rs/app-server-protocol/src/protocol/common.rs:1033][E: codex-rs/app-server-protocol/src/protocol/common.rs:1035] |
| `LogoutAccount` | `account/logout` | `Option<()>` | `v2::LogoutAccountResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1038][E: codex-rs/app-server-protocol/src/protocol/common.rs:1039][E: codex-rs/app-server-protocol/src/protocol/common.rs:1041] |
| `GetAccountRateLimits` | `account/rateLimits/read` | `Option<()>` | `v2::GetAccountRateLimitsResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1044][E: codex-rs/app-server-protocol/src/protocol/common.rs:1045][E: codex-rs/app-server-protocol/src/protocol/common.rs:1047] |
| `ConsumeAccountRateLimitResetCredit` | `account/rateLimitResetCredit/consume` | `v2::ConsumeAccountRateLimitResetCreditParams` | `v2::ConsumeAccountRateLimitResetCreditResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1050][E: codex-rs/app-server-protocol/src/protocol/common.rs:1051][E: codex-rs/app-server-protocol/src/protocol/common.rs:1053] |
| `GetAccountTokenUsage` | `account/usage/read` | `Option<()>` | `v2::GetAccountTokenUsageResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1056][E: codex-rs/app-server-protocol/src/protocol/common.rs:1057][E: codex-rs/app-server-protocol/src/protocol/common.rs:1059] |
| `GetWorkspaceMessages` | `account/workspaceMessages/read` | `Option<()>` | `v2::GetWorkspaceMessagesResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1062][E: codex-rs/app-server-protocol/src/protocol/common.rs:1063][E: codex-rs/app-server-protocol/src/protocol/common.rs:1065] |
| `SendAddCreditsNudgeEmail` | `account/sendAddCreditsNudgeEmail` | `v2::SendAddCreditsNudgeEmailParams` | `v2::SendAddCreditsNudgeEmailResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1068][E: codex-rs/app-server-protocol/src/protocol/common.rs:1069][E: codex-rs/app-server-protocol/src/protocol/common.rs:1071] |
| `FeedbackUpload` | `feedback/upload` | `v2::FeedbackUploadParams` | `v2::FeedbackUploadResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1074][E: codex-rs/app-server-protocol/src/protocol/common.rs:1075][E: codex-rs/app-server-protocol/src/protocol/common.rs:1077] |
| `ConfigRead` | `config/read` | `v2::ConfigReadParams` | `v2::ConfigReadResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1134][E: codex-rs/app-server-protocol/src/protocol/common.rs:1135][E: codex-rs/app-server-protocol/src/protocol/common.rs:1137] |
| `ExternalAgentConfigDetect` | `externalAgentConfig/detect` | `v2::ExternalAgentConfigDetectParams` | `v2::ExternalAgentConfigDetectResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1139][E: codex-rs/app-server-protocol/src/protocol/common.rs:1140][E: codex-rs/app-server-protocol/src/protocol/common.rs:1142] |
| `ExternalAgentConfigImport` | `externalAgentConfig/import` | `v2::ExternalAgentConfigImportParams` | `v2::ExternalAgentConfigImportResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1144][E: codex-rs/app-server-protocol/src/protocol/common.rs:1145][E: codex-rs/app-server-protocol/src/protocol/common.rs:1147] |
| `ExternalAgentConfigImportHistoriesRead` | `externalAgentConfig/import/readHistories` | `Option<()>` | `v2::ExternalAgentConfigImportHistoriesReadResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1149][E: codex-rs/app-server-protocol/src/protocol/common.rs:1150][E: codex-rs/app-server-protocol/src/protocol/common.rs:1152] |
| `ConfigValueWrite` | `config/value/write` | `v2::ConfigValueWriteParams` | `v2::ConfigWriteResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1154][E: codex-rs/app-server-protocol/src/protocol/common.rs:1155][E: codex-rs/app-server-protocol/src/protocol/common.rs:1158] |
| `ConfigBatchWrite` | `config/batchWrite` | `v2::ConfigBatchWriteParams` | `v2::ConfigWriteResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1160][E: codex-rs/app-server-protocol/src/protocol/common.rs:1161][E: codex-rs/app-server-protocol/src/protocol/common.rs:1164] |
| `ConfigRequirementsRead` | `configRequirements/read` | `Option<()>` | `v2::ConfigRequirementsReadResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1167][E: codex-rs/app-server-protocol/src/protocol/common.rs:1168][E: codex-rs/app-server-protocol/src/protocol/common.rs:1170] |
| `GetAccount` | `account/read` | `v2::GetAccountParams` | `v2::GetAccountResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1173][E: codex-rs/app-server-protocol/src/protocol/common.rs:1174][E: codex-rs/app-server-protocol/src/protocol/common.rs:1176] |

`environment/status` 是 shared-read、non-recovering probe：返回 `Ready`、`Pending`、`Disconnected` 或 `Unknown`，只在需要解释状态时带 optional error；调用不会启动或恢复 environment。[E: codex-rs/app-server-protocol/src/protocol/v2/environment.rs:48][E: codex-rs/app-server-protocol/src/protocol/v2/environment.rs:52][E: codex-rs/app-server-protocol/src/protocol/v2/environment.rs:57][E: codex-rs/app-server-protocol/src/protocol/v2/environment.rs:63][E: codex-rs/app-server-protocol/src/protocol/v2/environment.rs:64][E: codex-rs/app-server-protocol/src/protocol/v2/environment.rs:70][E: codex-rs/app-server-protocol/src/protocol/v2/environment.rs:77][E: codex-rs/app-server-protocol/src/protocol/v2/environment.rs:80][E: codex-rs/app-server-protocol/src/protocol/v2/environment.rs:84][E: codex-rs/app-server-protocol/src/protocol/v2/environment.rs:88][E: codex-rs/app-server-protocol/src/protocol/v2/environment.rs:90]

`AuthMode` 另增 `headers`：它不是 human ChatGPT account，但属于 Codex-backend auth，而不是 direct model API auth。[E: codex-rs/app-server-protocol/src/protocol/common.rs:34][E: codex-rs/app-server-protocol/src/protocol/common.rs:38][E: codex-rs/app-server-protocol/src/protocol/common.rs:58][E: codex-rs/app-server-protocol/src/protocol/common.rs:61][E: codex-rs/app-server-protocol/src/protocol/common.rs:65][E: codex-rs/app-server-protocol/src/protocol/common.rs:70]

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
