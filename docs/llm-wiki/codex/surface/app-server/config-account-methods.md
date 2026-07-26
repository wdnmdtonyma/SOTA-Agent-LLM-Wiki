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
updated: 61a44880a8
---

> config/account/model/system 方法是 app-server 面向设置页、登录页、model picker、feature gate、remote control、Windows sandbox 和外部 agent 配置迁移 UI 的 client request catalog。

## 能回答的问题

- config/account/model/permission/remoteControl/system 方法当前有哪些 wire method？
- 哪些方法是 experimental 或按 params 字段检查 experimental gate？
- account login 与 account notifications 如何拆开？
- external agent config migration 和 Windows sandbox setup 在 RPC 表中落在哪里？

## 字段模型

config read/write/requirements/external-agent migration 类型都在 `v2/config.rs`；account login/read/rate-limit/workspace-message 类型在 `v2/account.rs`；model、permission、remote control、Windows sandbox、feedback、environment 分别在对应 v2 模块定义。[E: codex-rs/app-server-protocol/src/protocol/v2/config.rs:328][E: codex-rs/app-server-protocol/src/protocol/v2/config.rs:352][E: codex-rs/app-server-protocol/src/protocol/v2/config.rs:376][E: codex-rs/app-server-protocol/src/protocol/v2/config.rs:704][E: codex-rs/app-server-protocol/src/protocol/v2/config.rs:832][E: codex-rs/app-server-protocol/src/protocol/v2/account.rs:65][E: codex-rs/app-server-protocol/src/protocol/v2/account.rs:126][E: codex-rs/app-server-protocol/src/protocol/v2/account.rs:400][E: codex-rs/app-server-protocol/src/protocol/v2/model.rs:43][E: codex-rs/app-server-protocol/src/protocol/v2/permissions.rs:379][E: codex-rs/app-server-protocol/src/protocol/v2/remote_control.rs:40][E: codex-rs/app-server-protocol/src/protocol/v2/windows_sandbox.rs:36][E: codex-rs/app-server-protocol/src/protocol/v2/feedback.rs:11][E: codex-rs/app-server-protocol/src/protocol/v2/environment.rs:10][E: codex-rs/app-server-protocol/src/protocol/v2/environment.rs:35]

`LoginAccountParams` 是 tagged enum，`LoginAccountResponse` 同样是 tagged enum；`AccountLoginCompleted` 是 server notification，而不是 `account/login/start` 的同步 response。[E: codex-rs/app-server-protocol/src/protocol/v2/account.rs:65][E: codex-rs/app-server-protocol/src/protocol/v2/account.rs:126][E: codex-rs/app-server-protocol/src/protocol/common.rs:1749][E: codex-rs/app-server-protocol/src/protocol/common.rs:1752]

本次唯一新增 client-request wire method 是 `externalAgentConfig/import/recordHistory`：外部完成的导入可提交 provider id 与按 item type 分组的 success/failure 结果，server 返回新 import id；它与真正执行 import 的 `externalAgentConfig/import` 是两条路径。[E: codex-rs/app-server-protocol/src/protocol/common.rs:1158][E: codex-rs/app-server-protocol/src/protocol/common.rs:1161][E: codex-rs/app-server-protocol/src/protocol/v2/config.rs:801][E: codex-rs/app-server-protocol/src/protocol/v2/config.rs:815]

config write error 新增 `ConfigRequirementReadonly`，用于值被 managed requirement 锁定而非整个 config layer 只读的情况。本轮 `ConfigRequirements` 新增 browser-use、PathUri-backed sqlite/log/model-catalog paths、startup update check、login shell、feedback 与 Windows private-desktop constraints；approval reviewer、permission profiles、managed hooks、network 和 models requirements 已在 baseline，不属于本轮新增。[E: codex-rs/app-server-protocol/src/protocol/v2/config.rs:336][E: codex-rs/app-server-protocol/src/protocol/v2/config.rs:346][E: codex-rs/app-server-protocol/src/protocol/v2/config.rs:376][E: codex-rs/app-server-protocol/src/protocol/v2/config.rs:407]

## 方法 catalog

| Variant | Wire method | Params type | Response type | Gate | Evidence |
|---|---|---|---|---|---|
| `HooksList` | `hooks/list` | `v2::HooksListParams` | `v2::HooksListResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:689][E: codex-rs/app-server-protocol/src/protocol/common.rs:690][E: codex-rs/app-server-protocol/src/protocol/common.rs:692] |
| `ModelList` | `model/list` | `v2::ModelListParams` | `v2::ModelListResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:890][E: codex-rs/app-server-protocol/src/protocol/common.rs:891][E: codex-rs/app-server-protocol/src/protocol/common.rs:893] |
| `ModelProviderCapabilitiesRead` | `modelProvider/capabilities/read` | `v2::ModelProviderCapabilitiesReadParams` | `v2::ModelProviderCapabilitiesReadResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:895][E: codex-rs/app-server-protocol/src/protocol/common.rs:896][E: codex-rs/app-server-protocol/src/protocol/common.rs:898] |
| `ExperimentalFeatureList` | `experimentalFeature/list` | `v2::ExperimentalFeatureListParams` | `v2::ExperimentalFeatureListResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:900][E: codex-rs/app-server-protocol/src/protocol/common.rs:901][E: codex-rs/app-server-protocol/src/protocol/common.rs:903] |
| `PermissionProfileList` | `permissionProfile/list` | `v2::PermissionProfileListParams` | `v2::PermissionProfileListResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:905][E: codex-rs/app-server-protocol/src/protocol/common.rs:906][E: codex-rs/app-server-protocol/src/protocol/common.rs:908] |
| `ExperimentalFeatureEnablementSet` | `experimentalFeature/enablement/set` | `v2::ExperimentalFeatureEnablementSetParams` | `v2::ExperimentalFeatureEnablementSetResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:910][E: codex-rs/app-server-protocol/src/protocol/common.rs:911][E: codex-rs/app-server-protocol/src/protocol/common.rs:913] |
| `RemoteControlEnable` | `remoteControl/enable` | `v2::NullableRemoteControlEnableParams` | `v2::RemoteControlEnableResponse` | experimental: remoteControl/enable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:915][E: codex-rs/app-server-protocol/src/protocol/common.rs:916][E: codex-rs/app-server-protocol/src/protocol/common.rs:917][E: codex-rs/app-server-protocol/src/protocol/common.rs:919] |
| `RemoteControlDisable` | `remoteControl/disable` | `v2::NullableRemoteControlDisableParams` | `v2::RemoteControlDisableResponse` | experimental: remoteControl/disable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:921][E: codex-rs/app-server-protocol/src/protocol/common.rs:922][E: codex-rs/app-server-protocol/src/protocol/common.rs:923][E: codex-rs/app-server-protocol/src/protocol/common.rs:925] |
| `RemoteControlStatusRead` | `remoteControl/status/read` | `Option<()>` | `v2::RemoteControlStatusReadResponse` | experimental: remoteControl/status/read | [E: codex-rs/app-server-protocol/src/protocol/common.rs:927][E: codex-rs/app-server-protocol/src/protocol/common.rs:928][E: codex-rs/app-server-protocol/src/protocol/common.rs:929][E: codex-rs/app-server-protocol/src/protocol/common.rs:931] |
| `RemoteControlPairingStart` | `remoteControl/pairing/start` | `v2::RemoteControlPairingStartParams` | `v2::RemoteControlPairingStartResponse` | experimental: remoteControl/pairing/start | [E: codex-rs/app-server-protocol/src/protocol/common.rs:933][E: codex-rs/app-server-protocol/src/protocol/common.rs:934][E: codex-rs/app-server-protocol/src/protocol/common.rs:935][E: codex-rs/app-server-protocol/src/protocol/common.rs:937] |
| `RemoteControlPairingStatus` | `remoteControl/pairing/status` | `v2::RemoteControlPairingStatusParams` | `v2::RemoteControlPairingStatusResponse` | experimental: remoteControl/pairing/status | [E: codex-rs/app-server-protocol/src/protocol/common.rs:939][E: codex-rs/app-server-protocol/src/protocol/common.rs:940][E: codex-rs/app-server-protocol/src/protocol/common.rs:941][E: codex-rs/app-server-protocol/src/protocol/common.rs:943] |
| `RemoteControlClientsList` | `remoteControl/client/list` | `v2::RemoteControlClientsListParams` | `v2::RemoteControlClientsListResponse` | experimental: remoteControl/client/list | [E: codex-rs/app-server-protocol/src/protocol/common.rs:945][E: codex-rs/app-server-protocol/src/protocol/common.rs:946][E: codex-rs/app-server-protocol/src/protocol/common.rs:947][E: codex-rs/app-server-protocol/src/protocol/common.rs:949] |
| `RemoteControlClientsRevoke` | `remoteControl/client/revoke` | `v2::RemoteControlClientsRevokeParams` | `v2::RemoteControlClientsRevokeResponse` | experimental: remoteControl/client/revoke | [E: codex-rs/app-server-protocol/src/protocol/common.rs:951][E: codex-rs/app-server-protocol/src/protocol/common.rs:952][E: codex-rs/app-server-protocol/src/protocol/common.rs:953][E: codex-rs/app-server-protocol/src/protocol/common.rs:955] |
| `CollaborationModeList` | `collaborationMode/list` | `v2::CollaborationModeListParams` | `v2::CollaborationModeListResponse` | experimental: collaborationMode/list | [E: codex-rs/app-server-protocol/src/protocol/common.rs:957][E: codex-rs/app-server-protocol/src/protocol/common.rs:959][E: codex-rs/app-server-protocol/src/protocol/common.rs:960][E: codex-rs/app-server-protocol/src/protocol/common.rs:962] |
| `MockExperimentalMethod` | `mock/experimentalMethod` | `v2::MockExperimentalMethodParams` | `v2::MockExperimentalMethodResponse` | experimental: mock/experimentalMethod | [E: codex-rs/app-server-protocol/src/protocol/common.rs:964][E: codex-rs/app-server-protocol/src/protocol/common.rs:966][E: codex-rs/app-server-protocol/src/protocol/common.rs:967][E: codex-rs/app-server-protocol/src/protocol/common.rs:969] |
| `EnvironmentAdd` | `environment/add` | `v2::EnvironmentAddParams` | `v2::EnvironmentAddResponse` | experimental: environment/add | [E: codex-rs/app-server-protocol/src/protocol/common.rs:971][E: codex-rs/app-server-protocol/src/protocol/common.rs:973][E: codex-rs/app-server-protocol/src/protocol/common.rs:974][E: codex-rs/app-server-protocol/src/protocol/common.rs:976] |
| `EnvironmentInfo` | `environment/info` | `v2::EnvironmentInfoParams` | `v2::EnvironmentInfoResponse` | experimental: environment/info | [E: codex-rs/app-server-protocol/src/protocol/common.rs:978][E: codex-rs/app-server-protocol/src/protocol/common.rs:980][E: codex-rs/app-server-protocol/src/protocol/common.rs:981][E: codex-rs/app-server-protocol/src/protocol/common.rs:983] |
| `EnvironmentStatus` | `environment/status` | `v2::EnvironmentStatusParams` | `v2::EnvironmentStatusResponse` | experimental: environment/status | [E: codex-rs/app-server-protocol/src/protocol/common.rs:985][E: codex-rs/app-server-protocol/src/protocol/common.rs:987][E: codex-rs/app-server-protocol/src/protocol/common.rs:988][E: codex-rs/app-server-protocol/src/protocol/common.rs:990] |
| `WindowsSandboxSetupStart` | `windowsSandbox/setupStart` | `v2::WindowsSandboxSetupStartParams` | `v2::WindowsSandboxSetupStartResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1023][E: codex-rs/app-server-protocol/src/protocol/common.rs:1024][E: codex-rs/app-server-protocol/src/protocol/common.rs:1026] |
| `WindowsSandboxReadiness` | `windowsSandbox/readiness` | `Option<()>` | `v2::WindowsSandboxReadinessResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1028][E: codex-rs/app-server-protocol/src/protocol/common.rs:1029][E: codex-rs/app-server-protocol/src/protocol/common.rs:1031] |
| `LoginAccount` | `account/login/start` | `v2::LoginAccountParams` | `v2::LoginAccountResponse` | params-inspected | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1034][E: codex-rs/app-server-protocol/src/protocol/common.rs:1035][E: codex-rs/app-server-protocol/src/protocol/common.rs:1036][E: codex-rs/app-server-protocol/src/protocol/common.rs:1038] |
| `CancelLoginAccount` | `account/login/cancel` | `v2::CancelLoginAccountParams` | `v2::CancelLoginAccountResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1041][E: codex-rs/app-server-protocol/src/protocol/common.rs:1042][E: codex-rs/app-server-protocol/src/protocol/common.rs:1044] |
| `LogoutAccount` | `account/logout` | `Option<()>` | `v2::LogoutAccountResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1047][E: codex-rs/app-server-protocol/src/protocol/common.rs:1048][E: codex-rs/app-server-protocol/src/protocol/common.rs:1050] |
| `GetAccountRateLimits` | `account/rateLimits/read` | `Option<()>` | `v2::GetAccountRateLimitsResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1053][E: codex-rs/app-server-protocol/src/protocol/common.rs:1054][E: codex-rs/app-server-protocol/src/protocol/common.rs:1056] |
| `ConsumeAccountRateLimitResetCredit` | `account/rateLimitResetCredit/consume` | `v2::ConsumeAccountRateLimitResetCreditParams` | `v2::ConsumeAccountRateLimitResetCreditResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1059][E: codex-rs/app-server-protocol/src/protocol/common.rs:1060][E: codex-rs/app-server-protocol/src/protocol/common.rs:1062] |
| `GetAccountTokenUsage` | `account/usage/read` | `Option<()>` | `v2::GetAccountTokenUsageResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1065][E: codex-rs/app-server-protocol/src/protocol/common.rs:1066][E: codex-rs/app-server-protocol/src/protocol/common.rs:1068] |
| `GetWorkspaceMessages` | `account/workspaceMessages/read` | `Option<()>` | `v2::GetWorkspaceMessagesResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1071][E: codex-rs/app-server-protocol/src/protocol/common.rs:1072][E: codex-rs/app-server-protocol/src/protocol/common.rs:1074] |
| `SendAddCreditsNudgeEmail` | `account/sendAddCreditsNudgeEmail` | `v2::SendAddCreditsNudgeEmailParams` | `v2::SendAddCreditsNudgeEmailResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1077][E: codex-rs/app-server-protocol/src/protocol/common.rs:1078][E: codex-rs/app-server-protocol/src/protocol/common.rs:1080] |
| `FeedbackUpload` | `feedback/upload` | `v2::FeedbackUploadParams` | `v2::FeedbackUploadResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1083][E: codex-rs/app-server-protocol/src/protocol/common.rs:1084][E: codex-rs/app-server-protocol/src/protocol/common.rs:1086] |
| `ConfigRead` | `config/read` | `v2::ConfigReadParams` | `v2::ConfigReadResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1143][E: codex-rs/app-server-protocol/src/protocol/common.rs:1144][E: codex-rs/app-server-protocol/src/protocol/common.rs:1146] |
| `ExternalAgentConfigDetect` | `externalAgentConfig/detect` | `v2::ExternalAgentConfigDetectParams` | `v2::ExternalAgentConfigDetectResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1148][E: codex-rs/app-server-protocol/src/protocol/common.rs:1149][E: codex-rs/app-server-protocol/src/protocol/common.rs:1151] |
| `ExternalAgentConfigImport` | `externalAgentConfig/import` | `v2::ExternalAgentConfigImportParams` | `v2::ExternalAgentConfigImportResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1153][E: codex-rs/app-server-protocol/src/protocol/common.rs:1154][E: codex-rs/app-server-protocol/src/protocol/common.rs:1156] |
| `ExternalAgentConfigImportHistoryRecord` | `externalAgentConfig/import/recordHistory` | `v2::ExternalAgentConfigImportHistoryRecordParams` | `v2::ExternalAgentConfigImportHistoryRecordResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1158][E: codex-rs/app-server-protocol/src/protocol/common.rs:1161] |
| `ExternalAgentConfigImportHistoriesRead` | `externalAgentConfig/import/readHistories` | `Option<()>` | `v2::ExternalAgentConfigImportHistoriesReadResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1163][E: codex-rs/app-server-protocol/src/protocol/common.rs:1164][E: codex-rs/app-server-protocol/src/protocol/common.rs:1166] |
| `ConfigValueWrite` | `config/value/write` | `v2::ConfigValueWriteParams` | `v2::ConfigWriteResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1168][E: codex-rs/app-server-protocol/src/protocol/common.rs:1169][E: codex-rs/app-server-protocol/src/protocol/common.rs:1172] |
| `ConfigBatchWrite` | `config/batchWrite` | `v2::ConfigBatchWriteParams` | `v2::ConfigWriteResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1174][E: codex-rs/app-server-protocol/src/protocol/common.rs:1175][E: codex-rs/app-server-protocol/src/protocol/common.rs:1178] |
| `ConfigRequirementsRead` | `configRequirements/read` | `Option<()>` | `v2::ConfigRequirementsReadResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1181][E: codex-rs/app-server-protocol/src/protocol/common.rs:1182][E: codex-rs/app-server-protocol/src/protocol/common.rs:1184] |
| `GetAccount` | `account/read` | `v2::GetAccountParams` | `v2::GetAccountResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1187][E: codex-rs/app-server-protocol/src/protocol/common.rs:1188][E: codex-rs/app-server-protocol/src/protocol/common.rs:1190] |

`environment/status` 是 shared-read、non-recovering probe：返回 `Ready`、`Pending`、`Disconnected` 或 `Unknown`，只在需要解释状态时带 optional error；调用不会启动或恢复 environment。[E: codex-rs/app-server-protocol/src/protocol/v2/environment.rs:52][E: codex-rs/app-server-protocol/src/protocol/v2/environment.rs:63][E: codex-rs/app-server-protocol/src/protocol/v2/environment.rs:77][E: codex-rs/app-server-protocol/src/protocol/v2/environment.rs:80][E: codex-rs/app-server-protocol/src/protocol/v2/environment.rs:84][E: codex-rs/app-server-protocol/src/protocol/v2/environment.rs:88][E: codex-rs/app-server-protocol/src/protocol/v2/environment.rs:90]

`AuthMode` 另增 `headers`：它不是 human ChatGPT account，但属于 Codex-backend auth，而不是 direct model API auth。[E: codex-rs/app-server-protocol/src/protocol/common.rs:38][E: codex-rs/app-server-protocol/src/protocol/common.rs:58][E: codex-rs/app-server-protocol/src/protocol/common.rs:61][E: codex-rs/app-server-protocol/src/protocol/common.rs:70]

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
