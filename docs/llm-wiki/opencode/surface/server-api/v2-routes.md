---
id: server-api.v2-routes
title: V2 /api route catalog
kind: catalog
tier: T1
v: v2
source: [packages/server/src/api.ts, packages/server/src/routes.ts, packages/protocol/src/api.ts, packages/protocol/src/groups/, packages/server/src/handlers/, packages/opencode/src/server/routes/instance/httpapi/server.ts, specs/v2/api.html]
symbols: [Api, makeDefaultApi, HealthGroup, LocationGroup, SessionGroup, MessageGroup, ProviderGroup, IntegrationGroup, CredentialGroup, PtyGroup, ProjectCopyGroup]
related: [server-api.overview, sdk.surface, integrations.integration-v2, persistence.project-directories, execution.pty]
evidence: explicit
status: verified
updated: 8b68dc0d7
---

> V2 route catalog 覆盖 `packages/protocol/src/groups` 声明、`packages/server/src/handlers` 实现的 V2 Effect HttpApi routes；这些 routes 是 V2 native server API，不包含 V1 legacy compatibility routes。

## 能回答的问题

- V2 `/api/*` 当前实际实现了哪些 method/path？
- 每个 V2 route 对应哪个 group、operation identifier 和 handler？
- 哪些 V2 routes 使用 request location context，哪些使用 session-pinned context？
- V2 integration、credential、permission、question、fs、event route 如何映射到 SDK `.v2.*` namespace？

## 路由来源与装配

V2 server 端的 `Api` 在 `packages/server/src/api.ts` 调用 `makeDefaultApi()`，把具体 location middleware 和 session-location middleware 注入 protocol API factory。[E: packages/server/src/api.ts:5][E: packages/server/src/api.ts:6][E: packages/server/src/api.ts:7] Protocol 层的 `makeApiFromGroup()` 使用 `HttpApi.make("server")`，group add chain 从 `HealthGroup` 开始，到 `ProjectCopyGroup` 结束。[E: packages/protocol/src/api.ts:37][E: packages/protocol/src/api.ts:38][E: packages/protocol/src/api.ts:55] `createRoutes()` 用 `HttpApiBuilder.layer(Api, { openapiPath: "/openapi.json" })` 暴露 V2 routes；V1 server process 也通过 `HttpApiBuilder.layer(Api)` 挂载同一个 V2 API。[E: packages/server/src/routes.ts:54][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:177]

## V2 route table

| # | group | method | path | operation | purpose | handler |
|---:|---|---|---|---|---|---|
| 1 | agent | GET | `/api/agent` | `v2.agent.list` | List agents | `AgentHandler` [E: packages/protocol/src/groups/agent.ts:8][E: packages/server/src/handlers/agent.ts:8] |
| 2 | command | GET | `/api/command` | `v2.command.list` | List commands | `CommandHandler` [E: packages/protocol/src/groups/command.ts:9][E: packages/server/src/handlers/command.ts:7] |
| 3 | integration | GET | `/api/integration` | `v2.integration.list` | List integrations | `IntegrationHandler` [E: packages/protocol/src/groups/integration.ts:12][E: packages/server/src/handlers/integration.ts:23] |
| 4 | integration | GET | `/api/integration/:integrationID` | `v2.integration.get` | Get integration | `IntegrationHandler` [E: packages/protocol/src/groups/integration.ts:26][E: packages/server/src/handlers/integration.ts:30] |
| 5 | integration | POST | `/api/integration/:integrationID/connect/key` | `v2.integration.connect.key` | Connect with key | `IntegrationHandler` [E: packages/protocol/src/groups/integration.ts:41][E: packages/server/src/handlers/integration.ts:37] |
| 6 | integration | POST | `/api/integration/:integrationID/connect/oauth` | `v2.integration.connect.oauth` | Begin OAuth connection | `IntegrationHandler` [E: packages/protocol/src/groups/integration.ts:61][E: packages/server/src/handlers/integration.ts:51] |
| 7 | integration | GET | `/api/integration/attempt/:attemptID` | `v2.integration.attempt.status` | Get OAuth attempt status | `IntegrationHandler` [E: packages/protocol/src/groups/integration.ts:82][E: packages/server/src/handlers/integration.ts:67] |
| 8 | integration | POST | `/api/integration/attempt/:attemptID/complete` | `v2.integration.attempt.complete` | Complete OAuth connection | `IntegrationHandler` [E: packages/protocol/src/groups/integration.ts:97][E: packages/server/src/handlers/integration.ts:74] |
| 9 | integration | DELETE | `/api/integration/attempt/:attemptID` | `v2.integration.attempt.cancel` | Cancel OAuth connection | `IntegrationHandler` [E: packages/protocol/src/groups/integration.ts:114][E: packages/server/src/handlers/integration.ts:96] |
| 10 | credential | PATCH | `/api/credential/:credentialID` | `v2.credential.update` | Update credential label | `CredentialHandler` [E: packages/protocol/src/groups/credential.ts:8][E: packages/server/src/handlers/credential.ts:9] |
| 11 | credential | DELETE | `/api/credential/:credentialID` | `v2.credential.remove` | Remove credential | `CredentialHandler` [E: packages/protocol/src/groups/credential.ts:24][E: packages/server/src/handlers/credential.ts:16] |
| 12 | event | GET | `/api/event` | `v2.event.subscribe` | Subscribe to events | `EventHandler` [E: packages/protocol/src/groups/event.ts:35][E: packages/server/src/handlers/event.ts:23] |
| 13 | fs | GET | `/api/fs/read/*` | `v2.fs.read` | Read file | `FileSystemHandler` [E: packages/protocol/src/groups/fs.ts:22][E: packages/server/src/handlers/fs.ts:12] |
| 14 | fs | GET | `/api/fs/list` | `v2.fs.list` | List directory | `FileSystemHandler` [E: packages/protocol/src/groups/fs.ts:36][E: packages/server/src/handlers/fs.ts:22] |
| 15 | fs | GET | `/api/fs/find` | `v2.fs.find` | Find files | `FileSystemHandler` [E: packages/protocol/src/groups/fs.ts:50][E: packages/server/src/handlers/fs.ts:30] |
| 16 | health | GET | `/api/health` | `v2.health.get` | Check server health | `HealthHandler` [E: packages/protocol/src/groups/health.ts:5][E: packages/server/src/handlers/health.ts:6] |
| 17 | location | GET | `/api/location` | `v2.location.get` | Get location | `LocationHandler` [E: packages/protocol/src/groups/location.ts:30][E: packages/server/src/handlers/location.ts:8] |
| 18 | message | GET | `/api/session/:sessionID/message` | `v2.session.messages` | Get session messages | `MessageHandler` [E: packages/protocol/src/groups/message.ts:26][E: packages/server/src/handlers/message.ts:32] |
| 19 | model | GET | `/api/model` | `v2.model.list` | List models | `ModelHandler` [E: packages/protocol/src/groups/model.ts:10][E: packages/server/src/handlers/model.ts:10] |
| 20 | permission | GET | `/api/permission/request` | `v2.permission.request.list` | List pending permission requests | `PermissionHandler` [E: packages/protocol/src/groups/permission.ts:23][E: packages/server/src/handlers/permission.ts:18] |
| 21 | permission | GET | `/api/permission/saved` | `v2.permission.saved.list` | List saved permissions | `PermissionHandler` [E: packages/protocol/src/groups/permission.ts:37][E: packages/server/src/handlers/permission.ts:80] |
| 22 | permission | DELETE | `/api/permission/saved/:id` | `v2.permission.saved.remove` | Remove saved permission | `PermissionHandler` [E: packages/protocol/src/groups/permission.ts:49][E: packages/server/src/handlers/permission.ts:91] |
| 23 | permission | POST | `/api/session/:sessionID/permission` | `v2.session.permission.create` | Create permission request | `PermissionHandler` [E: packages/protocol/src/groups/permission.ts:63][E: packages/server/src/handlers/permission.ts:24] |
| 24 | permission | GET | `/api/session/:sessionID/permission` | `v2.session.permission.list` | List session permission requests | `PermissionHandler` [E: packages/protocol/src/groups/permission.ts:89][E: packages/server/src/handlers/permission.ts:53] |
| 25 | permission | GET | `/api/session/:sessionID/permission/:requestID` | `v2.session.permission.get` | Get permission request | `PermissionHandler` [E: packages/protocol/src/groups/permission.ts:104][E: packages/server/src/handlers/permission.ts:60] |
| 26 | permission | POST | `/api/session/:sessionID/permission/:requestID/reply` | `v2.session.permission.reply` | Reply to pending permission request | `PermissionHandler` [E: packages/protocol/src/groups/permission.ts:119][E: packages/server/src/handlers/permission.ts:68] |
| 27 | provider | GET | `/api/provider` | `v2.provider.list` | List providers | `ProviderHandler` [E: packages/protocol/src/groups/provider.ts:10][E: packages/server/src/handlers/provider.ts:12] |
| 28 | provider | GET | `/api/provider/:providerID` | `v2.provider.get` | Get provider | `ProviderHandler` [E: packages/protocol/src/groups/provider.ts:25][E: packages/server/src/handlers/provider.ts:19] |
| 29 | question | GET | `/api/question/request` | `v2.question.request.list` | List pending question requests | `QuestionHandler` [E: packages/protocol/src/groups/question.ts:20][E: packages/server/src/handlers/question.ts:27] |
| 30 | question | GET | `/api/session/:sessionID/question` | `v2.session.question.list` | List session question requests | `QuestionHandler` [E: packages/protocol/src/groups/question.ts:37][E: packages/server/src/handlers/question.ts:33] |
| 31 | question | POST | `/api/session/:sessionID/question/:requestID/reply` | `v2.session.question.reply` | Reply to pending question request | `QuestionHandler` [E: packages/protocol/src/groups/question.ts:52][E: packages/server/src/handlers/question.ts:40] |
| 32 | question | POST | `/api/session/:sessionID/question/:requestID/reject` | `v2.session.question.reject` | Reject pending question request | `QuestionHandler` [E: packages/protocol/src/groups/question.ts:68][E: packages/server/src/handlers/question.ts:51] |
| 33 | reference | GET | `/api/reference` | `v2.reference.list` | List references | `ReferenceHandler` [E: packages/protocol/src/groups/reference.ts:9][E: packages/server/src/handlers/reference.ts:7] |
| 34 | session | GET | `/api/session` | `v2.session.list` | List sessions | `SessionHandler` [E: packages/protocol/src/groups/session.ts:109][E: packages/server/src/handlers/session.ts:25] |
| 35 | session | POST | `/api/session` | `v2.session.create` | Create session | `SessionHandler` [E: packages/protocol/src/groups/session.ts:129][E: packages/server/src/handlers/session.ts:68] |
| 36 | session | GET | `/api/session/active` | `v2.session.active` | List active sessions | `SessionHandler` [E: packages/protocol/src/groups/session.ts:146][E: packages/server/src/handlers/session.ts:81] |
| 37 | session | GET | `/api/session/:sessionID` | `v2.session.get` | Get session | `SessionHandler` [E: packages/protocol/src/groups/session.ts:158][E: packages/server/src/handlers/session.ts:91] |
| 38 | session | POST | `/api/session/:sessionID/agent` | `v2.session.switchAgent` | Switch session agent | `SessionHandler` [E: packages/protocol/src/groups/session.ts:173][E: packages/server/src/handlers/session.ts:108] |
| 39 | session | POST | `/api/session/:sessionID/model` | `v2.session.switchModel` | Switch session model | `SessionHandler` [E: packages/protocol/src/groups/session.ts:189][E: packages/server/src/handlers/session.ts:124] |
| 40 | session | POST | `/api/session/:sessionID/prompt` | `v2.session.prompt` | Send message | `SessionHandler` [E: packages/protocol/src/groups/session.ts:205][E: packages/server/src/handlers/session.ts:140] |
| 41 | session | POST | `/api/session/:sessionID/compact` | `v2.session.compact` | Compact session | `SessionHandler` [E: packages/protocol/src/groups/session.ts:226][E: packages/server/src/handlers/session.ts:173] |
| 42 | session | POST | `/api/session/:sessionID/wait` | `v2.session.wait` | Wait for session | `SessionHandler` [E: packages/protocol/src/groups/session.ts:241][E: packages/server/src/handlers/session.ts:197] |
| 43 | session | POST | `/api/session/:sessionID/revert/stage` | `v2.session.revert.stage` | Stage session revert | `SessionHandler` [E: packages/protocol/src/groups/session.ts:256][E: packages/server/src/handlers/session.ts:221] |
| 44 | session | POST | `/api/session/:sessionID/revert/clear` | `v2.session.revert.clear` | Clear staged revert | `SessionHandler` [E: packages/protocol/src/groups/session.ts:272][E: packages/server/src/handlers/session.ts:260] |
| 45 | session | POST | `/api/session/:sessionID/revert/commit` | `v2.session.revert.commit` | Commit staged revert | `SessionHandler` [E: packages/protocol/src/groups/session.ts:281][E: packages/server/src/handlers/session.ts:289] |
| 46 | session | GET | `/api/session/:sessionID/context` | `v2.session.context` | Get session context | `SessionHandler` [E: packages/protocol/src/groups/session.ts:292][E: packages/server/src/handlers/session.ts:305] |
| 47 | session | GET | `/api/session/:sessionID/history` | `v2.session.history` | Get session history | `SessionHandler` [E: packages/protocol/src/groups/session.ts:307][E: packages/server/src/handlers/session.ts:333] |
| 48 | session | GET | `/api/session/:sessionID/event` | `v2.session.events` | Subscribe to session events | `SessionHandler` [E: packages/protocol/src/groups/session.ts:327][E: packages/server/src/handlers/session.ts:358] |
| 49 | session | POST | `/api/session/:sessionID/interrupt` | `v2.session.interrupt` | Interrupt session execution | `SessionHandler` [E: packages/protocol/src/groups/session.ts:345][E: packages/server/src/handlers/session.ts:366] |
| 50 | session | GET | `/api/session/:sessionID/message/:messageID` | `v2.session.message` | Get session message | `SessionHandler` [E: packages/protocol/src/groups/session.ts:360][E: packages/server/src/handlers/session.ts:373] |
| 51 | skill | GET | `/api/skill` | `v2.skill.list` | List skills | `SkillHandler` [E: packages/protocol/src/groups/skill.ts:9][E: packages/server/src/handlers/skill.ts:7] |
| 52 | pty | GET | `/api/pty` | `v2.pty.list` | List PTY sessions | `PtyHandler` [E: packages/protocol/src/groups/pty.ts:23][E: packages/server/src/handlers/pty.ts:33] |
| 53 | pty | POST | `/api/pty` | `v2.pty.create` | Create PTY session | `PtyHandler` [E: packages/protocol/src/groups/pty.ts:37][E: packages/server/src/handlers/pty.ts:39] |
| 54 | pty | GET | `/api/pty/:ptyID` | `v2.pty.get` | Get PTY session | `PtyHandler` [E: packages/protocol/src/groups/pty.ts:52][E: packages/server/src/handlers/pty.ts:58] |
| 55 | pty | PUT | `/api/pty/:ptyID` | `v2.pty.update` | Update PTY title/size | `PtyHandler` [E: packages/protocol/src/groups/pty.ts:68][E: packages/server/src/handlers/pty.ts:76] |
| 56 | pty | DELETE | `/api/pty/:ptyID` | `v2.pty.remove` | Remove PTY session | `PtyHandler` [E: packages/protocol/src/groups/pty.ts:85][E: packages/server/src/handlers/pty.ts:99] |
| 57 | pty | POST | `/api/pty/:ptyID/connect-token` | `v2.pty.connectToken` | Create PTY WebSocket token | `PtyHandler` [E: packages/protocol/src/groups/pty.ts:101][E: packages/server/src/handlers/pty.ts:116] |
| 58 | pty | GET | `/api/pty/:ptyID/connect` | `v2.pty.connect` | Connect WebSocket to PTY | `PtyHandler` [E: packages/protocol/src/groups/pty.ts:119][E: packages/server/src/handlers/pty.ts:141] |
| 59 | projectCopy | POST | `/experimental/project/:projectID/copy` | `v2.projectCopy.create` | Create project copy | `ProjectCopyHandler` [E: packages/protocol/src/groups/project-copy.ts:25][E: packages/server/src/handlers/project-copy.ts:12] |
| 60 | projectCopy | DELETE | `/experimental/project/:projectID/copy` | `v2.projectCopy.remove` | Remove project copy | `ProjectCopyHandler` [E: packages/protocol/src/groups/project-copy.ts:36][E: packages/server/src/handlers/project-copy.ts:25] |
| 61 | projectCopy | POST | `/experimental/project/:projectID/copy/refresh` | `v2.projectCopy.refresh` | Refresh project copy records | `ProjectCopyHandler` [E: packages/protocol/src/groups/project-copy.ts:47][E: packages/server/src/handlers/project-copy.ts:32] |

## Context 分类

V2 design spec says non-session routes resolve runtime context from query/default runtime, while session item routes use the pinned context stored on the session row。[E: specs/v2/api.html:459][E: specs/v2/api.html:472][E: specs/v2/api.html:496] Protocol code applies `locationMiddleware` to location-scoped groups and `sessionLocationMiddleware` to session item endpoints; `makeQuestionGroup()` and `makePermissionGroup()` split their request-list endpoint from their session endpoints with different middleware placement。[E: packages/protocol/src/api.ts:39][E: packages/protocol/src/api.ts:47][E: packages/protocol/src/groups/question.ts:35][E: packages/protocol/src/groups/question.ts:42][E: packages/protocol/src/groups/permission.ts:61][E: packages/protocol/src/groups/permission.ts:79] In the implemented table, routes beginning with `/api/session/:sessionID/...` are session-pinned by path shape; `/api/fs/*`, `/api/provider`, `/api/model`, `/api/agent`, `/api/command`, `/api/skill`, `/api/reference`, `/api/permission/request`, `/api/question/request`, `/api/location`, `/api/integration`, `/api/credential`, `/api/pty` and `/api/event` are request/default location routes by V2 API design intent [I].

## Sources

- packages/server/src/api.ts
- packages/server/src/routes.ts
- packages/protocol/src/api.ts
- packages/protocol/src/groups/
- packages/server/src/handlers/
- packages/opencode/src/server/routes/instance/httpapi/server.ts
- specs/v2/api.html

## 相关

- [Server API overview](overview.md)
- [SDK surface](../sdk/surface.md)
- [V2 integration subsystem](../../subsystems/integrations/integration-v2.md)
- [Project directories](../../subsystems/persistence/project-directories.md)
- [PTY 子系统](../../subsystems/execution/pty.md)
