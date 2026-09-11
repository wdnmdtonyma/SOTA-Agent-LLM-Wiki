---
id: rpc.config-account-methods
title: config/account/model/system 方法
kind: rpc
tier: T1
source: [codex-rs/app-server-protocol/src/protocol/common.rs, codex-rs/app-server-protocol/src/protocol/v2/config.rs, codex-rs/app-server-protocol/src/protocol/v2/account.rs, codex-rs/app-server-protocol/src/protocol/v2/model.rs, codex-rs/app-server-protocol/src/protocol/v2/permissions.rs, codex-rs/app-server-protocol/src/protocol/v2/remote_control.rs, codex-rs/app-server-protocol/src/protocol/v2/windows_sandbox.rs, codex-rs/app-server-protocol/src/protocol/v2/feedback.rs, codex-rs/app-server-protocol/src/protocol/v2/plugin.rs, codex-rs/app-server-protocol/src/protocol/v2/experimental_feature.rs, codex-rs/app-server-protocol/src/protocol/v2/collaboration_mode.rs, codex-rs/app-server-protocol/src/protocol/v2/thread.rs, codex-rs/app-server-protocol/src/protocol/v2/environment.rs, codex-rs/app-server-protocol/src/protocol/v2/user_verification.rs, codex-rs/app-server/src/external_agent_migration/protocol.rs, codex-rs/app-server/src/external_agent_migration/processor.rs]
symbols: [ConfigReadParams, ConfigWriteResponse, ConfigRequirements, LoginAccountParams, LoginAccountResponse, GetAccountResponse, GetWorkspaceMessagesResponse, GetAccountTokenUsageParams, GetAccountTokenUsageResponse, ModelListParams, PermissionProfileListParams, ExternalAgentConfigDetectResponse, ExternalAgentConfigImportHistoryRecordParams, ExternalAgentConfigImportHistoryRecordSuccessParams, RemoteControlEnableResponse, FeedbackUploadParams, EnvironmentInfoParams, EnvironmentStatusParams, EnvironmentStatusResponse, UserVerificationCancelParams]
related: [surface.cli.external-agent-import, rpc.overview, rpc.notifications-system, rpc.thread-methods]
evidence: explicit
status: verified
updated: 02a8f038b8
---

> config/account/model/system 方法是 app-server 面向设置页、登录页、model picker、feature gate、remote control、Windows sandbox 和外部 agent 配置迁移 UI 的 client request catalog。

## 能回答的问题

- config/account/model/permission/remoteControl/system 方法当前有哪些 wire method？
- 哪些方法是 experimental 或按 params 字段检查 experimental gate？
- `account/usage/read` 现在能读 account-wide 还是 thread usage？
- `server/diagnostics` 是否属于本 catalog？
- `userVerification/cancel` 取消的是哪一类 verification？

## 字段模型

config read/write/requirements/external-agent migration 类型都在 `v2/config.rs`；account login/read/rate-limit/usage/workspace-message 类型在 `v2/account.rs`；model、permission、remote control、Windows sandbox、feedback、environment、user-verification 分别在对应 v2 模块定义。[E: codex-rs/app-server-protocol/src/protocol/v2/config.rs:362][E: codex-rs/app-server-protocol/src/protocol/v2/config.rs:386][E: codex-rs/app-server-protocol/src/protocol/v2/config.rs:410][E: codex-rs/app-server-protocol/src/protocol/v2/config.rs:865][E: codex-rs/app-server-protocol/src/protocol/v2/account.rs:64][E: codex-rs/app-server-protocol/src/protocol/v2/account.rs:136][E: codex-rs/app-server-protocol/src/protocol/v2/account.rs:437][E: codex-rs/app-server-protocol/src/protocol/v2/account.rs:448][E: codex-rs/app-server-protocol/src/protocol/v2/model.rs:53][E: codex-rs/app-server-protocol/src/protocol/v2/permissions.rs:391][E: codex-rs/app-server-protocol/src/protocol/v2/remote_control.rs:40][E: codex-rs/app-server-protocol/src/protocol/v2/windows_sandbox.rs:36][E: codex-rs/app-server-protocol/src/protocol/v2/feedback.rs:11][E: codex-rs/app-server-protocol/src/protocol/v2/environment.rs:37][E: codex-rs/app-server-protocol/src/protocol/v2/environment.rs:62][E: codex-rs/app-server-protocol/src/protocol/v2/user_verification.rs:154]

`LoginAccountParams` 是 tagged enum，`LoginAccountResponse` 同样是 tagged enum；`AccountLoginCompleted` 是 server notification，而不是 `account/login/start` 的同步 response。[E: codex-rs/app-server-protocol/src/protocol/v2/account.rs:64][E: codex-rs/app-server-protocol/src/protocol/v2/account.rs:136][E: codex-rs/app-server-protocol/src/protocol/common.rs:2025][E: codex-rs/app-server-protocol/src/protocol/common.rs:2028]

`server/diagnostics` 不属于本 catalog：它是 process-local diagnostics，收在 overview。`thread/approveGuardianDeniedAction` 也不属于本 catalog，收在 thread catalog。[E: codex-rs/app-server-protocol/src/protocol/common.rs:515][E: codex-rs/app-server-protocol/src/protocol/common.rs:733]

`account/usage/read` 不再是无 params 的 `Option<()>`。宏用 `NullableGetAccountTokenUsageParams` 保留“省略 params / explicit undefined”兼容，params 可带 optional `threadId`：省略时读 account-wide token activity，提供时读该 thread 的 estimated usage；response 含 `summary`、optional `dailyUsageBuckets` 与 optional `threadUsage`。[E: codex-rs/app-server-protocol/src/protocol/common.rs:490][E: codex-rs/app-server-protocol/src/protocol/common.rs:1312][E: codex-rs/app-server-protocol/src/protocol/v2/account.rs:437][E: codex-rs/app-server-protocol/src/protocol/v2/account.rs:440][E: codex-rs/app-server-protocol/src/protocol/v2/account.rs:448]

`externalAgentConfig/import/recordHistory` 继续与真正执行 import 的 `externalAgentConfig/import` 分离。record-history payload 使用专门的 `ExternalAgentConfigImportHistoryRecordTypeResultParams`/success params，success 可携带原 session `title`。[E: codex-rs/app-server-protocol/src/protocol/common.rs:1405][E: codex-rs/app-server-protocol/src/protocol/v2/config.rs:959][E: codex-rs/app-server-protocol/src/protocol/v2/config.rs:967][E: codex-rs/app-server-protocol/src/protocol/v2/config.rs:973]

`ExternalAgentConfigDetectResponse` 的协议 shape 含 detected `connectors`，source 可为 remote MCP config 或 session tool use。当前 processor 会从 detected sessions 计算 connector candidates，再交给 `detect_response()` 映射进 response，不再固定返回空列表。[E: codex-rs/app-server-protocol/src/protocol/v2/config.rs:865][E: codex-rs/app-server-protocol/src/protocol/v2/config.rs:868][E: codex-rs/app-server/src/external_agent_migration/processor.rs:159][E: codex-rs/app-server/src/external_agent_migration/processor.rs:170][E: codex-rs/app-server/src/external_agent_migration/protocol.rs:34][E: codex-rs/app-server/src/external_agent_migration/protocol.rs:40]

config write error 有 `ConfigRequirementReadonly`，用于值被 managed requirement 锁定而非整个 config layer 只读的情况。`ConfigRequirements` 覆盖 browser-use、PathUri-backed sqlite/log/model-catalog paths、startup update check、login shell、feedback 与 Windows private-desktop constraints，以及 approval reviewer、permission profiles、managed hooks、network 和 models requirements。[E: codex-rs/app-server-protocol/src/protocol/v2/config.rs:375][E: codex-rs/app-server-protocol/src/protocol/v2/config.rs:410][E: codex-rs/app-server-protocol/src/protocol/v2/config.rs:421][E: codex-rs/app-server-protocol/src/protocol/v2/config.rs:424][E: codex-rs/app-server-protocol/src/protocol/v2/config.rs:436][E: codex-rs/app-server-protocol/src/protocol/v2/config.rs:436][E: codex-rs/app-server-protocol/src/protocol/v2/config.rs:443][E: codex-rs/app-server-protocol/src/protocol/v2/config.rs:443][E: codex-rs/app-server-protocol/src/protocol/v2/config.rs:450]

`userVerification/cancel` 取消本连接上的 native verification RPC（不是 elicitation）；unknown 或已完成的 request 是 no-op，不回滚已完成效果。[E: codex-rs/app-server-protocol/src/protocol/common.rs:549][E: codex-rs/app-server-protocol/src/protocol/v2/user_verification.rs:154][E: codex-rs/app-server-protocol/src/protocol/v2/user_verification.rs:163]

## 方法 catalog

本 catalog 覆盖 44 个 config/account/model/system 方法。本轮新增 experimental `userVerification/cancel`。`hooks/list` 只在 mcp/skills/plugin catalog，不在本表。


| Variant | Wire method | Params type | Response type | Gate | Evidence |
|---|---|---|---|---|---|
| `UserVerificationStatus` | `userVerification/status` | `v2::UserVerificationStatusParams` | `v2::UserVerificationStatusResponse` | experimental: userVerification/status | [E: codex-rs/app-server-protocol/src/protocol/common.rs:522] |
| `UserVerificationEnroll` | `userVerification/enroll` | `v2::UserVerificationEnrollParams` | `v2::UserVerificationEnrollResponse` | experimental: userVerification/enroll | [E: codex-rs/app-server-protocol/src/protocol/common.rs:529] |
| `UserVerificationDelete` | `userVerification/delete` | `v2::UserVerificationDeleteParams` | `v2::UserVerificationDeleteResponse` | experimental: userVerification/delete | [E: codex-rs/app-server-protocol/src/protocol/common.rs:536] |
| `UserVerificationVerify` | `userVerification/verify` | `v2::UserVerificationVerifyParams` | `v2::UserVerificationVerifyResponse` | experimental: userVerification/verify | [E: codex-rs/app-server-protocol/src/protocol/common.rs:543] |
| `UserVerificationCancel` | `userVerification/cancel` | `v2::UserVerificationCancelParams` | `v2::UserVerificationCancelResponse` | experimental: userVerification/cancel | [E: codex-rs/app-server-protocol/src/protocol/common.rs:550] |
| `ModelList` | `model/list` | `v2::ModelListParams` | `v2::ModelListResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1109] |
| `ModelProviderCapabilitiesRead` | `modelProvider/capabilities/read` | `v2::ModelProviderCapabilitiesReadParams` | `v2::ModelProviderCapabilitiesReadResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1114] |
| `ExperimentalFeatureList` | `experimentalFeature/list` | `v2::ExperimentalFeatureListParams` | `v2::ExperimentalFeatureListResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1119] |
| `PermissionProfileList` | `permissionProfile/list` | `v2::PermissionProfileListParams` | `v2::PermissionProfileListResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1124] |
| `ExperimentalFeatureEnablementSet` | `experimentalFeature/enablement/set` | `v2::ExperimentalFeatureEnablementSetParams` | `v2::ExperimentalFeatureEnablementSetResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1129] |
| `RemoteControlEnable` | `remoteControl/enable` | `v2::NullableRemoteControlEnableParams` | `v2::RemoteControlEnableResponse` | experimental: remoteControl/enable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1135] |
| `RemoteControlDisable` | `remoteControl/disable` | `v2::NullableRemoteControlDisableParams` | `v2::RemoteControlDisableResponse` | experimental: remoteControl/disable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1141] |
| `RemoteControlStatusRead` | `remoteControl/status/read` | `Option<()>` | `v2::RemoteControlStatusReadResponse` | experimental: remoteControl/status/read | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1147] |
| `RemoteControlPairingStart` | `remoteControl/pairing/start` | `v2::RemoteControlPairingStartParams` | `v2::RemoteControlPairingStartResponse` | experimental: remoteControl/pairing/start | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1153] |
| `RemoteControlPairingStatus` | `remoteControl/pairing/status` | `v2::RemoteControlPairingStatusParams` | `v2::RemoteControlPairingStatusResponse` | experimental: remoteControl/pairing/status | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1159] |
| `RemoteControlClientsList` | `remoteControl/client/list` | `v2::RemoteControlClientsListParams` | `v2::RemoteControlClientsListResponse` | experimental: remoteControl/client/list | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1165] |
| `RemoteControlClientsRevoke` | `remoteControl/client/revoke` | `v2::RemoteControlClientsRevokeParams` | `v2::RemoteControlClientsRevokeResponse` | experimental: remoteControl/client/revoke | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1171] |
| `CollaborationModeList` | `collaborationMode/list` | `v2::CollaborationModeListParams` | `v2::CollaborationModeListResponse` | experimental: collaborationMode/list | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1178] |
| `MockExperimentalMethod` | `mock/experimentalMethod` | `v2::MockExperimentalMethodParams` | `v2::MockExperimentalMethodResponse` | experimental: mock/experimentalMethod | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1185] |
| `EnvironmentAdd` | `environment/add` | `v2::EnvironmentAddParams` | `v2::EnvironmentAddResponse` | experimental: environment/add | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1192] |
| `EnvironmentInfo` | `environment/info` | `v2::EnvironmentInfoParams` | `v2::EnvironmentInfoResponse` | experimental: environment/info | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1199] |
| `EnvironmentStatus` | `environment/status` | `v2::EnvironmentStatusParams` | `v2::EnvironmentStatusResponse` | experimental: environment/status | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1206] |
| `WindowsSandboxSetupStart` | `windowsSandbox/setupStart` | `v2::WindowsSandboxSetupStartParams` | `v2::WindowsSandboxSetupStartResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1256] |
| `WindowsSandboxReadiness` | `windowsSandbox/readiness` | `Option<()>` | `v2::WindowsSandboxReadinessResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1261] |
| `LoginAccount` | `account/login/start` | `v2::LoginAccountParams` | `v2::LoginAccountResponse` | params-inspected | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1267] |
| `BedrockDiscover` | `account/bedrock/discover` | `v2::BedrockDiscoverParams` | `v2::BedrockDiscoverResponse` | experimental: account/bedrock/discover | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1275] |
| `BedrockSetup` | `account/bedrock/setup` | `v2::BedrockSetupParams` | `v2::BedrockSetupResponse` | experimental: account/bedrock/setup | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1282] |
| `CancelLoginAccount` | `account/login/cancel` | `v2::CancelLoginAccountParams` | `v2::CancelLoginAccountResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1288] |
| `LogoutAccount` | `account/logout` | `Option<()>` | `v2::LogoutAccountResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1294] |
| `GetAccountRateLimits` | `account/rateLimits/read` | `v2::NullableGetAccountRateLimitsParams` | `v2::GetAccountRateLimitsResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1300] |
| `ConsumeAccountRateLimitResetCredit` | `account/rateLimitResetCredit/consume` | `v2::ConsumeAccountRateLimitResetCreditParams` | `v2::ConsumeAccountRateLimitResetCreditResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1306] |
| `GetAccountTokenUsage` | `account/usage/read` | `v2::NullableGetAccountTokenUsageParams` | `v2::GetAccountTokenUsageResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1312] |
| `GetWorkspaceMessages` | `account/workspaceMessages/read` | `Option<()>` | `v2::GetWorkspaceMessagesResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1318] |
| `SendAddCreditsNudgeEmail` | `account/sendAddCreditsNudgeEmail` | `v2::SendAddCreditsNudgeEmailParams` | `v2::SendAddCreditsNudgeEmailResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1324] |
| `FeedbackUpload` | `feedback/upload` | `v2::FeedbackUploadParams` | `v2::FeedbackUploadResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1330] |
| `ConfigRead` | `config/read` | `v2::ConfigReadParams` | `v2::ConfigReadResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1390] |
| `ExternalAgentConfigDetect` | `externalAgentConfig/detect` | `v2::ExternalAgentConfigDetectParams` | `v2::ExternalAgentConfigDetectResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1395] |
| `ExternalAgentConfigImport` | `externalAgentConfig/import` | `v2::ExternalAgentConfigImportParams` | `v2::ExternalAgentConfigImportResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1400] |
| `ExternalAgentConfigImportHistoryRecord` | `externalAgentConfig/import/recordHistory` | `v2::ExternalAgentConfigImportHistoryRecordParams` | `v2::ExternalAgentConfigImportHistoryRecordResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1405] |
| `ExternalAgentConfigImportHistoriesRead` | `externalAgentConfig/import/readHistories` | `Option<()>` | `v2::ExternalAgentConfigImportHistoriesReadResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1410] |
| `ConfigValueWrite` | `config/value/write` | `v2::ConfigValueWriteParams` | `v2::ConfigWriteResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1415] |
| `ConfigBatchWrite` | `config/batchWrite` | `v2::ConfigBatchWriteParams` | `v2::ConfigWriteResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1421] |
| `ConfigRequirementsRead` | `configRequirements/read` | `Option<()>` | `v2::ConfigRequirementsReadResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1428] |
| `GetAccount` | `account/read` | `v2::GetAccountParams` | `v2::GetAccountResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1434] |

`environment/status` 是 shared-read、non-recovering probe：返回 `Ready`、`Pending`、`Disconnected` 或 `Unknown`，只在需要解释状态时带 optional error；调用不会启动或恢复 environment。[E: codex-rs/app-server-protocol/src/protocol/v2/environment.rs:104][E: codex-rs/app-server-protocol/src/protocol/v2/environment.rs:107][E: codex-rs/app-server-protocol/src/protocol/v2/environment.rs:111][E: codex-rs/app-server-protocol/src/protocol/v2/environment.rs:115][E: codex-rs/app-server-protocol/src/protocol/v2/environment.rs:117]

`AuthMode` 除 ChatGPT / API key / headers 外还有 `agentIdentity`、`personalAccessToken`、`bedrockApiKey` 与 `bedrockAccessKeys`。`headers` 与 `agentIdentity` 不是 human ChatGPT account，但属于 Codex-backend auth；`personalAccessToken` 同时算 ChatGPT account 与 Codex-backend auth。[E: codex-rs/app-server-protocol/src/protocol/common.rs:41][E: codex-rs/app-server-protocol/src/protocol/common.rs:46][E: codex-rs/app-server-protocol/src/protocol/common.rs:51][E: codex-rs/app-server-protocol/src/protocol/common.rs:56][E: codex-rs/app-server-protocol/src/protocol/common.rs:61][E: codex-rs/app-server-protocol/src/protocol/common.rs:68][E: codex-rs/app-server-protocol/src/protocol/common.rs:82]

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
- `codex-rs/app-server-protocol/src/protocol/v2/user_verification.rs`
- `codex-rs/app-server/src/external_agent_migration/protocol.rs`
- `codex-rs/app-server/src/external_agent_migration/processor.rs`

## 相关

- `rpc.overview` -> [App-Server 协议总览](overview.md)
- `rpc.notifications-system` -> [server notifications: system](notifications-system.md)
- [从外部 agent 导入](../cli/external-agent-import.md)
