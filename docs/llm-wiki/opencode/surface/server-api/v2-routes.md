---
id: server-api.v2-routes
title: V2 /api route catalog
kind: catalog
tier: T1
v: v2
source: [packages/server/src/groups/, packages/server/src/handlers/]
symbols: [Api, HealthGroup, LocationGroup, SessionGroup, MessageGroup, ProviderGroup, IntegrationGroup, CredentialGroup, PtyGroup, ProjectCopyGroup]
related: [server-api.overview, sdk.surface, integrations.integration-v2, persistence.project-directories, execution.pty]
evidence: explicit
status: verified
updated: 355a0bcf5
---

> V2 route catalog 覆盖 `packages/server/src/groups` 下当前实现的 `/api/*` Effect HttpApi routes；这些 routes 是 V2 native server API，不包含 V1 legacy compatibility routes。

## 能回答的问题

- V2 `/api/*` 当前实际实现了哪些 method/path？
- 每个 V2 route 对应哪个 group、operation identifier 和 handler？
- 哪些 V2 routes 使用 request location context，哪些使用 session-pinned context？
- V2 integration、credential、permission、question、fs、event route 如何映射到 SDK `.v2.*` namespace？

## 路由来源与装配

V2 `Api` 在 `packages/server/src/api.ts` 里声明，使用 `HttpApi.make("server")` 并 add Health、Location、Agent、Session、Message、Model、Provider、Integration、Credential、Permission、FileSystem、Command、Skill、Event、Pty、Question、Reference 和 ProjectCopy groups。[E: packages/server/src/api.ts:23][E: packages/server/src/api.ts:24][E: packages/server/src/api.ts:31][E: packages/server/src/api.ts:32][E: packages/server/src/api.ts:38][E: packages/server/src/api.ts:41] `createRoutes()` 用 `HttpApiBuilder.layer(Api, { openapiPath: "/openapi.json" })` 暴露 V2 routes；V1 server 也通过 `HttpApiBuilder.layer(Api)` 把同一 V2 API 挂到 legacy server process。[E: packages/server/src/routes.ts:14][E: packages/server/src/routes.ts:15][E: packages/opencode/src/server/routes/instance/httpapi/server.ts:168]

## V2 route table

| # | group | method | path | operation | purpose | handler |
|---:|---|---|---|---|---|---|
| 1 | agent | GET | `/api/agent` | `v2.agent.list` | List agents | `AgentHandler` [E: packages/server/src/groups/agent.ts:9][E: packages/server/src/handlers/agent.ts:9] |
| 2 | command | GET | `/api/command` | `v2.command.list` | List commands | `CommandHandler` [E: packages/server/src/groups/command.ts:9][E: packages/server/src/handlers/command.ts:8] |
| 3 | integration | GET | `/api/integration` | `v2.integration.list` | List integrations | `IntegrationHandler` [E: packages/server/src/groups/integration.ts:12][E: packages/server/src/handlers/integration.ts:23] |
| 4 | integration | GET | `/api/integration/:integrationID` | `v2.integration.get` | Get integration | `IntegrationHandler` [E: packages/server/src/groups/integration.ts:26][E: packages/server/src/handlers/integration.ts:30] |
| 5 | integration | POST | `/api/integration/:integrationID/connect/key` | `v2.integration.connect.key` | Connect with key | `IntegrationHandler` [E: packages/server/src/groups/integration.ts:41][E: packages/server/src/handlers/integration.ts:37] |
| 6 | integration | POST | `/api/integration/:integrationID/connect/oauth` | `v2.integration.connect.oauth` | Begin OAuth connection | `IntegrationHandler` [E: packages/server/src/groups/integration.ts:61][E: packages/server/src/handlers/integration.ts:51] |
| 7 | integration | GET | `/api/integration/attempt/:attemptID` | `v2.integration.attempt.status` | Get OAuth attempt status | `IntegrationHandler` [E: packages/server/src/groups/integration.ts:82][E: packages/server/src/handlers/integration.ts:67] |
| 8 | integration | POST | `/api/integration/attempt/:attemptID/complete` | `v2.integration.attempt.complete` | Complete OAuth connection | `IntegrationHandler` [E: packages/server/src/groups/integration.ts:97][E: packages/server/src/handlers/integration.ts:74] |
| 9 | integration | DELETE | `/api/integration/attempt/:attemptID` | `v2.integration.attempt.cancel` | Cancel OAuth connection | `IntegrationHandler` [E: packages/server/src/groups/integration.ts:114][E: packages/server/src/handlers/integration.ts:96] |
| 9.1 | credential | PATCH | `/api/credential/:credentialID` | `v2.credential.update` | Update credential label | `CredentialHandler` [E: packages/server/src/groups/credential.ts:8][E: packages/server/src/handlers/credential.ts:9] |
| 9.2 | credential | DELETE | `/api/credential/:credentialID` | `v2.credential.remove` | Remove credential | `CredentialHandler` [E: packages/server/src/groups/credential.ts:24][E: packages/server/src/handlers/credential.ts:16] |
| 10 | event | GET | `/api/event` | `v2.event.subscribe` | Subscribe to events | `EventHandler` [E: packages/server/src/groups/event.ts:18][E: packages/server/src/handlers/event.ts:21] |
| 11 | fs | GET | `/api/fs/read` | `v2.fs.read` | Read file | `FileSystemHandler` [E: packages/server/src/groups/fs.ts:27][E: packages/server/src/handlers/fs.ts:10] |
| 12 | fs | GET | `/api/fs/list` | `v2.fs.list` | List directory | `FileSystemHandler` [E: packages/server/src/groups/fs.ts:36][E: packages/server/src/handlers/fs.ts:22] |
| 13 | fs | GET | `/api/fs/find` | `v2.fs.find` | Find files | `FileSystemHandler` [E: packages/server/src/groups/fs.ts:50][E: packages/server/src/handlers/fs.ts:30] |
| 14 | health | GET | `/api/health` | `v2.health.get` | Check server health | `HealthHandler` [E: packages/server/src/groups/health.ts:5][E: packages/server/src/handlers/health.ts:6] |
| 15 | location | GET | `/api/location` | `v2.location.get` | Get location | `LocationHandler` [E: packages/server/src/groups/location.ts:59][E: packages/server/src/handlers/location.ts:7] |
| 16 | message | GET | `/api/session/:sessionID/message` | `v2.session.messages` | Get session messages | `MessageHandler` [E: packages/server/src/groups/message.ts:27][E: packages/server/src/handlers/message.ts:31] |
| 17 | model | GET | `/api/model` | `v2.model.list` | List models | `ModelHandler` [E: packages/server/src/groups/model.ts:10][E: packages/server/src/handlers/model.ts:16] |
| 18 | permission | GET | `/api/permission/request` | `v2.permission.request.list` | List pending permission requests | `PermissionHandler` [E: packages/server/src/groups/permission.ts:14][E: packages/server/src/handlers/permission.ts:17] |
| 19 | permission | GET | `/api/permission/saved` | `v2.permission.saved.list` | List saved permissions | `PermissionHandler` [E: packages/server/src/groups/permission.ts:28][E: packages/server/src/handlers/permission.ts:42] |
| 20 | permission | DELETE | `/api/permission/saved/:id` | `v2.permission.saved.remove` | Remove saved permission | `PermissionHandler` [E: packages/server/src/groups/permission.ts:40][E: packages/server/src/handlers/permission.ts:53] |
| 21 | permission | GET | `/api/session/:sessionID/permission` | `v2.session.permission.list` | List session permission requests | `PermissionHandler` [E: packages/server/src/groups/permission.ts:53][E: packages/server/src/handlers/permission.ts:23] |
| 22 | permission | POST | `/api/session/:sessionID/permission/:requestID/reply` | `v2.session.permission.reply` | Reply to pending permission request | `PermissionHandler` [E: packages/server/src/groups/permission.ts:68][E: packages/server/src/handlers/permission.ts:30] |
| 23 | provider | GET | `/api/provider` | `v2.provider.list` | List providers | `ProviderHandler` [E: packages/server/src/groups/provider.ts:10][E: packages/server/src/handlers/provider.ts:18] |
| 24 | provider | GET | `/api/provider/:providerID` | `v2.provider.get` | Get provider | `ProviderHandler` [E: packages/server/src/groups/provider.ts:25][E: packages/server/src/handlers/provider.ts:27] |
| 25 | question | GET | `/api/question/request` | `v2.question.request.list` | List pending question requests | `QuestionHandler` [E: packages/server/src/groups/question.ts:12][E: packages/server/src/handlers/question.ts:26] |
| 26 | question | GET | `/api/session/:sessionID/question` | `v2.session.question.list` | List session question requests | `QuestionHandler` [E: packages/server/src/groups/question.ts:28][E: packages/server/src/handlers/question.ts:32] |
| 27 | question | POST | `/api/session/:sessionID/question/:requestID/reply` | `v2.session.question.reply` | Reply to pending question request | `QuestionHandler` [E: packages/server/src/groups/question.ts:43][E: packages/server/src/handlers/question.ts:39] |
| 28 | question | POST | `/api/session/:sessionID/question/:requestID/reject` | `v2.session.question.reject` | Reject pending question request | `QuestionHandler` [E: packages/server/src/groups/question.ts:59][E: packages/server/src/handlers/question.ts:50] |
| 29 | reference | GET | `/api/reference` | `v2.reference.list` | List references | `ReferenceHandler` [E: packages/server/src/groups/reference.ts:9][E: packages/server/src/handlers/reference.ts:7] |
| 30 | session | GET | `/api/session` | `v2.session.list` | List sessions | `SessionHandler` [E: packages/server/src/groups/session.ts:92][E: packages/server/src/handlers/session.ts:22] |
| 31 | session | POST | `/api/session` | `v2.session.create` | Create session | `SessionHandler` [E: packages/server/src/groups/session.ts:112][E: packages/server/src/handlers/session.ts:65] |
| 32 | session | GET | `/api/session/:sessionID` | `v2.session.get` | Get session | `SessionHandler` [E: packages/server/src/groups/session.ts:129][E: packages/server/src/handlers/session.ts:78] |
| 33 | session | POST | `/api/session/:sessionID/prompt` | `v2.session.prompt` | Send message | `SessionHandler` [E: packages/server/src/groups/session.ts:144][E: packages/server/src/handlers/session.ts:95] |
| 34 | session | POST | `/api/session/:sessionID/compact` | `v2.session.compact` | Compact session | `SessionHandler` [E: packages/server/src/groups/session.ts:165][E: packages/server/src/handlers/session.ts:128] |
| 35 | session | POST | `/api/session/:sessionID/wait` | `v2.session.wait` | Wait for session | `SessionHandler` [E: packages/server/src/groups/session.ts:180][E: packages/server/src/handlers/session.ts:152] |
| 36 | session | GET | `/api/session/:sessionID/context` | `v2.session.context` | Get session context | `SessionHandler` [E: packages/server/src/groups/session.ts:195][E: packages/server/src/handlers/session.ts:176] |
| 37 | skill | GET | `/api/skill` | `v2.skill.list` | List skills | `SkillHandler` [E: packages/server/src/groups/skill.ts:9][E: packages/server/src/handlers/skill.ts:7] |
| 38 | pty | GET | `/api/pty` | `v2.pty.list` | List PTY sessions | `PtyHandler` [E: packages/server/src/groups/pty.ts:22][E: packages/server/src/groups/pty.ts:24][E: packages/server/src/handlers/pty.ts:21][E: packages/server/src/handlers/pty.ts:29] |
| 39 | pty | POST | `/api/pty` | `v2.pty.create` | Create PTY session | `PtyHandler` [E: packages/server/src/groups/pty.ts:38][E: packages/server/src/handlers/pty.ts:35] |
| 40 | pty | GET | `/api/pty/:ptyID` | `v2.pty.get` | Get PTY session | `PtyHandler` [E: packages/server/src/groups/pty.ts:53][E: packages/server/src/handlers/pty.ts:54] |
| 41 | pty | PUT | `/api/pty/:ptyID` | `v2.pty.update` | Update PTY title/size | `PtyHandler` [E: packages/server/src/groups/pty.ts:69][E: packages/server/src/handlers/pty.ts:72] |
| 42 | pty | DELETE | `/api/pty/:ptyID` | `v2.pty.remove` | Remove PTY session | `PtyHandler` [E: packages/server/src/groups/pty.ts:86][E: packages/server/src/handlers/pty.ts:95] |
| 43 | pty | POST | `/api/pty/:ptyID/connect-token` | `v2.pty.connectToken` | Create PTY WebSocket token | `PtyHandler` [E: packages/server/src/groups/pty.ts:102][E: packages/server/src/handlers/pty.ts:112] |
| 44 | pty | GET | `/api/pty/:ptyID/connect` | `v2.pty.connect` | Connect WebSocket to PTY | `PtyHandler` [E: packages/server/src/groups/pty.ts:120][E: packages/server/src/handlers/pty.ts:136][E: packages/server/src/handlers/pty.ts:138] |
| 45 | projectCopy | POST | `/experimental/project/:projectID/copy` | `v2.projectCopy.create` | Create project copy | `ProjectCopyHandler` [E: packages/server/src/groups/project-copy.ts:25][E: packages/server/src/handlers/project-copy.ts:12] |
| 46 | projectCopy | DELETE | `/experimental/project/:projectID/copy` | `v2.projectCopy.remove` | Remove project copy | `ProjectCopyHandler` [E: packages/server/src/groups/project-copy.ts:36][E: packages/server/src/handlers/project-copy.ts:25] |
| 47 | projectCopy | POST | `/experimental/project/:projectID/copy/refresh` | `v2.projectCopy.refresh` | Refresh project copy records | `ProjectCopyHandler` [E: packages/server/src/groups/project-copy.ts:47][E: packages/server/src/handlers/project-copy.ts:32] |

## Context 分类

V2 design spec says non-session routes resolve runtime context from query/default runtime, while session item routes use the pinned context stored on the session row。[E: specs/v2/api.html:459][E: specs/v2/api.html:472][E: specs/v2/api.html:496] In the implemented table, routes beginning with `/api/session/:sessionID/...` are session-pinned by path shape; `/api/fs/*`, `/api/provider`, `/api/model`, `/api/agent`, `/api/command`, `/api/skill`, `/api/reference`, `/api/permission/request`, `/api/question/request`, `/api/location`, `/api/integration`, `/api/credential`, `/api/pty` and `/api/event` are request/default location routes by V2 API design intent [I].

## Sources

- packages/server/src/api.ts
- packages/server/src/routes.ts
- packages/server/src/groups/
- packages/server/src/handlers/
- specs/v2/api.html

## 相关

- [Server API overview](overview.md)
- [SDK surface](../sdk/surface.md)
- [V2 integration subsystem](../../subsystems/integrations/integration-v2.md)
- [Project directories](../../subsystems/persistence/project-directories.md)
- [PTY 子系统](../../subsystems/execution/pty.md)
