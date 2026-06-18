---
id: sdk.surface
title: TypeScript SDK method surface
kind: catalog
tier: T1
v: shared
source: [packages/sdk/js/src/gen/sdk.gen.ts, packages/sdk/js/src/v2/gen/sdk.gen.ts]
symbols: [OpencodeClient]
related: [sdk.overview, server-api.v1-routes, server-api.v2-routes]
evidence: explicit
status: verified
updated: 355a0bcf5
---

> SDK method surface 是 generated client 的逐方法目录：`src/gen` 是旧 legacy SDK；`src/v2/gen` 是当前全量 SDK，包含 legacy compatibility namespaces 和 `client.v2.*` native `/api/*` namespaces。

## 能回答的问题

- `@opencode-ai/sdk` legacy `OpencodeClient` 有哪些方法？
- `@opencode-ai/sdk/v2` current `OpencodeClient` 有哪些 legacy compatibility 方法？
- `client.v2.*` native `/api/*` namespace 具体有哪些 method/path？
- SDK method 名称如何映射到 server route path？

## V1

Legacy `src/gen/sdk.gen.ts` 的 generated `OpencodeClient` 暴露 83 个 callable methods，其中 82 个可从 namespace getter 到达，1 个 direct method 挂在 root client 上；其中 `client.auth.*` 与 `client.mcp.auth.*` 指向同一 `Auth` generated class，但它们是两个可达调用路径。[E: packages/sdk/js/src/gen/sdk.gen.ts:866][E: packages/sdk/js/src/gen/sdk.gen.ts:973][E: packages/sdk/js/src/gen/sdk.gen.ts:1157][E: packages/sdk/js/src/gen/sdk.gen.ts:1177][I]

| SDK method | HTTP | generated URL | evidence |
|---|---|---|---|
| `client.global.event` | GET SSE | `/global/event` | [E: packages/sdk/js/src/gen/sdk.gen.ts:237] |
| `client.project.list` | GET | `/project` | [E: packages/sdk/js/src/gen/sdk.gen.ts:249] |
| `client.project.current` | GET | `/project/current` | [E: packages/sdk/js/src/gen/sdk.gen.ts:259] |
| `client.pty.list` | GET | `/pty` | [E: packages/sdk/js/src/gen/sdk.gen.ts:271] |
| `client.pty.create` | POST | `/pty` | [E: packages/sdk/js/src/gen/sdk.gen.ts:281] |
| `client.pty.remove` | DELETE | `/pty/{id}` | [E: packages/sdk/js/src/gen/sdk.gen.ts:295] |
| `client.pty.get` | GET | `/pty/{id}` | [E: packages/sdk/js/src/gen/sdk.gen.ts:305] |
| `client.pty.update` | PUT | `/pty/{id}` | [E: packages/sdk/js/src/gen/sdk.gen.ts:315] |
| `client.pty.connect` | GET | `/pty/{id}/connect` | [E: packages/sdk/js/src/gen/sdk.gen.ts:329] |
| `client.config.get` | GET | `/config` | [E: packages/sdk/js/src/gen/sdk.gen.ts:341] |
| `client.config.update` | PATCH | `/config` | [E: packages/sdk/js/src/gen/sdk.gen.ts:351] |
| `client.config.providers` | GET | `/config/providers` | [E: packages/sdk/js/src/gen/sdk.gen.ts:365] |
| `client.tool.ids` | GET | `/experimental/tool/ids` | [E: packages/sdk/js/src/gen/sdk.gen.ts:377] |
| `client.tool.list` | GET | `/experimental/tool` | [E: packages/sdk/js/src/gen/sdk.gen.ts:387] |
| `client.instance.dispose` | POST | `/instance/dispose` | [E: packages/sdk/js/src/gen/sdk.gen.ts:399] |
| `client.path.get` | GET | `/path` | [E: packages/sdk/js/src/gen/sdk.gen.ts:411] |
| `client.vcs.get` | GET | `/vcs` | [E: packages/sdk/js/src/gen/sdk.gen.ts:423] |
| `client.session.list` | GET | `/session` | [E: packages/sdk/js/src/gen/sdk.gen.ts:435] |
| `client.session.create` | POST | `/session` | [E: packages/sdk/js/src/gen/sdk.gen.ts:445] |
| `client.session.status` | GET | `/session/status` | [E: packages/sdk/js/src/gen/sdk.gen.ts:459] |
| `client.session.delete` | DELETE | `/session/{id}` | [E: packages/sdk/js/src/gen/sdk.gen.ts:469] |
| `client.session.get` | GET | `/session/{id}` | [E: packages/sdk/js/src/gen/sdk.gen.ts:479] |
| `client.session.update` | PATCH | `/session/{id}` | [E: packages/sdk/js/src/gen/sdk.gen.ts:489] |
| `client.session.children` | GET | `/session/{id}/children` | [E: packages/sdk/js/src/gen/sdk.gen.ts:503] |
| `client.session.todo` | GET | `/session/{id}/todo` | [E: packages/sdk/js/src/gen/sdk.gen.ts:513] |
| `client.session.init` | POST | `/session/{id}/init` | [E: packages/sdk/js/src/gen/sdk.gen.ts:523] |
| `client.session.fork` | POST | `/session/{id}/fork` | [E: packages/sdk/js/src/gen/sdk.gen.ts:537] |
| `client.session.abort` | POST | `/session/{id}/abort` | [E: packages/sdk/js/src/gen/sdk.gen.ts:551] |
| `client.session.unshare` | DELETE | `/session/{id}/share` | [E: packages/sdk/js/src/gen/sdk.gen.ts:561] |
| `client.session.share` | POST | `/session/{id}/share` | [E: packages/sdk/js/src/gen/sdk.gen.ts:571] |
| `client.session.diff` | GET | `/session/{id}/diff` | [E: packages/sdk/js/src/gen/sdk.gen.ts:581] |
| `client.session.summarize` | POST | `/session/{id}/summarize` | [E: packages/sdk/js/src/gen/sdk.gen.ts:591] |
| `client.session.messages` | GET | `/session/{id}/message` | [E: packages/sdk/js/src/gen/sdk.gen.ts:605] |
| `client.session.prompt` | POST | `/session/{id}/message` | [E: packages/sdk/js/src/gen/sdk.gen.ts:615] |
| `client.session.message` | GET | `/session/{id}/message/{messageID}` | [E: packages/sdk/js/src/gen/sdk.gen.ts:629] |
| `client.session.promptAsync` | POST | `/session/{id}/prompt_async` | [E: packages/sdk/js/src/gen/sdk.gen.ts:639] |
| `client.session.command` | POST | `/session/{id}/command` | [E: packages/sdk/js/src/gen/sdk.gen.ts:653] |
| `client.session.shell` | POST | `/session/{id}/shell` | [E: packages/sdk/js/src/gen/sdk.gen.ts:667] |
| `client.session.revert` | POST | `/session/{id}/revert` | [E: packages/sdk/js/src/gen/sdk.gen.ts:681] |
| `client.session.unrevert` | POST | `/session/{id}/unrevert` | [E: packages/sdk/js/src/gen/sdk.gen.ts:695] |
| `client.command.list` | GET | `/command` | [E: packages/sdk/js/src/gen/sdk.gen.ts:707] |
| `client.provider.oauth.authorize` | POST | `/provider/{id}/oauth/authorize` | [E: packages/sdk/js/src/gen/sdk.gen.ts:719] |
| `client.provider.oauth.callback` | POST | `/provider/{id}/oauth/callback` | [E: packages/sdk/js/src/gen/sdk.gen.ts:737] |
| `client.provider.list` | GET | `/provider` | [E: packages/sdk/js/src/gen/sdk.gen.ts:757] |
| `client.provider.auth` | GET | `/provider/auth` | [E: packages/sdk/js/src/gen/sdk.gen.ts:767] |
| `client.find.text` | GET | `/find` | [E: packages/sdk/js/src/gen/sdk.gen.ts:780] |
| `client.find.files` | GET | `/find/file` | [E: packages/sdk/js/src/gen/sdk.gen.ts:790] |
| `client.find.symbols` | GET | `/find/symbol` | [E: packages/sdk/js/src/gen/sdk.gen.ts:800] |
| `client.file.list` | GET | `/file` | [E: packages/sdk/js/src/gen/sdk.gen.ts:812] |
| `client.file.read` | GET | `/file/content` | [E: packages/sdk/js/src/gen/sdk.gen.ts:822] |
| `client.file.status` | GET | `/file/status` | [E: packages/sdk/js/src/gen/sdk.gen.ts:832] |
| `client.app.log` | POST | `/log` | [E: packages/sdk/js/src/gen/sdk.gen.ts:844] |
| `client.app.agents` | GET | `/agent` | [E: packages/sdk/js/src/gen/sdk.gen.ts:858] |
| `client.auth.remove` | DELETE | `/mcp/{name}/auth` | [E: packages/sdk/js/src/gen/sdk.gen.ts:870] |
| `client.auth.start` | POST | `/mcp/{name}/auth` | [E: packages/sdk/js/src/gen/sdk.gen.ts:880] |
| `client.auth.callback` | POST | `/mcp/{name}/auth/callback` | [E: packages/sdk/js/src/gen/sdk.gen.ts:890] |
| `client.auth.authenticate` | POST | `/mcp/{name}/auth/authenticate` | [E: packages/sdk/js/src/gen/sdk.gen.ts:904] |
| `client.auth.set` | PUT | `/auth/{id}` | [E: packages/sdk/js/src/gen/sdk.gen.ts:916] |
| `client.mcp.status` | GET | `/mcp` | [E: packages/sdk/js/src/gen/sdk.gen.ts:932] |
| `client.mcp.add` | POST | `/mcp` | [E: packages/sdk/js/src/gen/sdk.gen.ts:942] |
| `client.mcp.connect` | POST | `/mcp/{name}/connect` | [E: packages/sdk/js/src/gen/sdk.gen.ts:956] |
| `client.mcp.disconnect` | POST | `/mcp/{name}/disconnect` | [E: packages/sdk/js/src/gen/sdk.gen.ts:966] |
| `client.mcp.auth.remove` | DELETE | `/mcp/{name}/auth` | [E: packages/sdk/js/src/gen/sdk.gen.ts:870][E: packages/sdk/js/src/gen/sdk.gen.ts:973] |
| `client.mcp.auth.start` | POST | `/mcp/{name}/auth` | [E: packages/sdk/js/src/gen/sdk.gen.ts:880][E: packages/sdk/js/src/gen/sdk.gen.ts:973] |
| `client.mcp.auth.callback` | POST | `/mcp/{name}/auth/callback` | [E: packages/sdk/js/src/gen/sdk.gen.ts:890][E: packages/sdk/js/src/gen/sdk.gen.ts:973] |
| `client.mcp.auth.authenticate` | POST | `/mcp/{name}/auth/authenticate` | [E: packages/sdk/js/src/gen/sdk.gen.ts:904][E: packages/sdk/js/src/gen/sdk.gen.ts:973] |
| `client.mcp.auth.set` | PUT | `/auth/{id}` | [E: packages/sdk/js/src/gen/sdk.gen.ts:916][E: packages/sdk/js/src/gen/sdk.gen.ts:973] |
| `client.lsp.status` | GET | `/lsp` | [E: packages/sdk/js/src/gen/sdk.gen.ts:980] |
| `client.formatter.status` | GET | `/formatter` | [E: packages/sdk/js/src/gen/sdk.gen.ts:992] |
| `client.tui.control.next` | GET | `/tui/control/next` | [E: packages/sdk/js/src/gen/sdk.gen.ts:1004] |
| `client.tui.control.response` | POST | `/tui/control/response` | [E: packages/sdk/js/src/gen/sdk.gen.ts:1014] |
| `client.tui.appendPrompt` | POST | `/tui/append-prompt` | [E: packages/sdk/js/src/gen/sdk.gen.ts:1030] |
| `client.tui.openHelp` | POST | `/tui/open-help` | [E: packages/sdk/js/src/gen/sdk.gen.ts:1044] |
| `client.tui.openSessions` | POST | `/tui/open-sessions` | [E: packages/sdk/js/src/gen/sdk.gen.ts:1054] |
| `client.tui.openThemes` | POST | `/tui/open-themes` | [E: packages/sdk/js/src/gen/sdk.gen.ts:1064] |
| `client.tui.openModels` | POST | `/tui/open-models` | [E: packages/sdk/js/src/gen/sdk.gen.ts:1074] |
| `client.tui.submitPrompt` | POST | `/tui/submit-prompt` | [E: packages/sdk/js/src/gen/sdk.gen.ts:1084] |
| `client.tui.clearPrompt` | POST | `/tui/clear-prompt` | [E: packages/sdk/js/src/gen/sdk.gen.ts:1094] |
| `client.tui.executeCommand` | POST | `/tui/execute-command` | [E: packages/sdk/js/src/gen/sdk.gen.ts:1104] |
| `client.tui.showToast` | POST | `/tui/show-toast` | [E: packages/sdk/js/src/gen/sdk.gen.ts:1118] |
| `client.tui.publish` | POST | `/tui/publish` | [E: packages/sdk/js/src/gen/sdk.gen.ts:1132] |
| `client.event.subscribe` | GET SSE | `/event` | [E: packages/sdk/js/src/gen/sdk.gen.ts:1149] |
| `client.postSessionIdPermissionsPermissionId` | POST | `/session/{id}/permissions/{permissionID}` | [E: packages/sdk/js/src/gen/sdk.gen.ts:1161] |

## V2

`src/v2/gen/sdk.gen.ts` 的 generated `OpencodeClient` 暴露 176 个 callable methods。前 127 个是 legacy compatibility surface；后 49 个挂在 `client.v2.*` 下，对应 V2 native route surface。[E: packages/sdk/js/src/v2/gen/sdk.gen.ts:6694][E: packages/sdk/js/src/v2/gen/sdk.gen.ts:6832][I]

### V2 legacy compatibility methods

| SDK method | HTTP | generated URL | evidence |
|---|---|---|---|
| `client.auth.remove` | DELETE | `/auth/{providerID}` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:432] |
| `client.auth.set` | PUT | `/auth/{providerID}` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:451] |
| `client.app.log` | POST | `/log` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:488] |
| `client.app.agents` | GET | `/agent` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:533] |
| `client.app.skills` | GET | `/skill` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:563] |
| `client.experimental.controlPlane.moveSession` | POST | `/experimental/control-plane/move-session` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:595] |
| `client.experimental.console.get` | GET | `/experimental/console` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:674] |
| `client.experimental.console.listOrgs` | GET | `/experimental/console/orgs` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:708] |
| `client.experimental.console.switchOrg` | POST | `/experimental/console/switch` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:742] |
| `client.experimental.session.list` | GET | `/experimental/session` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:783] |
| `client.experimental.session.background` | POST | `/experimental/session/{sessionID}/background` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:829] |
| `client.experimental.resource.list` | GET | `/experimental/resource` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:867] |
| `client.experimental.projectCopy.generateName` | POST | `/experimental/project/{projectID}/copy/generate-name` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:903][E: packages/sdk/js/src/v2/gen/sdk.gen.ts:930] |
| `client.experimental.workspace.adapter.list` | GET | `/experimental/workspace/adapter` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:948] |
| `client.experimental.workspace.list` | GET | `/experimental/workspace` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:984] |
| `client.experimental.workspace.create` | POST | `/experimental/workspace` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1018] |
| `client.experimental.workspace.syncList` | POST | `/experimental/workspace/sync-list` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1065] |
| `client.experimental.workspace.status` | GET | `/experimental/workspace/status` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1099] |
| `client.experimental.workspace.remove` | DELETE | `/experimental/workspace/{id}` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1133] |
| `client.experimental.workspace.warp` | POST | `/experimental/workspace/warp` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1169] |
| `client.global.config.get` | GET | `/global/config` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1258] |
| `client.global.config.update` | PATCH | `/global/config` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1270] |
| `client.global.health` | GET | `/global/health` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1296] |
| `client.global.event` | GET SSE | `/global/event` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1308] |
| `client.global.dispose` | POST | `/global/dispose` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1320] |
| `client.global.upgrade` | POST | `/global/upgrade` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1332] |
| `client.event.subscribe` | GET SSE | `/event` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1363] |
| `client.config.get` | GET | `/config` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1395] |
| `client.config.update` | PATCH | `/config` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1425] |
| `client.config.providers` | GET | `/config/providers` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1462] |
| `client.tool.list` | GET | `/experimental/tool` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1494] |
| `client.tool.ids` | GET | `/experimental/tool/ids` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1528] |
| `client.worktree.remove` | DELETE | `/experimental/worktree` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1560] |
| `client.worktree.list` | GET | `/experimental/worktree` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1597] |
| `client.worktree.create` | POST | `/experimental/worktree` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1627] |
| `client.worktree.reset` | POST | `/experimental/worktree/reset` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1664] |
| `client.find.text` | GET | `/find` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1703] |
| `client.find.files` | GET | `/find/file` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1735] |
| `client.find.symbols` | GET | `/find/symbol` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1773] |
| `client.file.list` | GET | `/file` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1807] |
| `client.file.read` | GET | `/file/content` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1839] |
| `client.file.status` | GET | `/file/status` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1871] |
| `client.instance.dispose` | POST | `/instance/dispose` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1903] |
| `client.path.get` | GET | `/path` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1935] |
| `client.vcs.diff2.raw` | GET | `/vcs/diff/raw` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1967][E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2126] |
| `client.vcs.get` | GET | `/vcs` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1999] |
| `client.vcs.status` | GET | `/vcs/status` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2029] |
| `client.vcs.diff` | GET | `/vcs/diff` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2059] |
| `client.vcs.apply` | POST | `/vcs/apply` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2093] |
| `client.command.list` | GET | `/command` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2137] |
| `client.lsp.status` | GET | `/lsp` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2169] |
| `client.formatter.status` | GET | `/formatter` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2201] |
| `client.mcp.auth.remove` | DELETE | `/mcp/{name}/auth` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2233] |
| `client.mcp.auth.start` | POST | `/mcp/{name}/auth` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2265] |
| `client.mcp.auth.callback` | POST | `/mcp/{name}/auth/callback` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2297] |
| `client.mcp.auth.authenticate` | POST | `/mcp/{name}/auth/authenticate` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2336] |
| `client.mcp.status` | GET | `/mcp` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2372] |
| `client.mcp.add` | POST | `/mcp` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2402] |
| `client.mcp.connect` | POST | `/mcp/{name}/connect` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2439] |
| `client.mcp.disconnect` | POST | `/mcp/{name}/disconnect` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2469] |
| `client.project.list` | GET | `/project` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2508] |
| `client.project.current` | GET | `/project/current` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2538] |
| `client.project.initGit` | POST | `/project/git/init` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2568] |
| `client.project.update` | PATCH | `/project/{projectID}` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2598] |
| `client.project.directories` | GET | `/project/{projectID}/directories` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2650] |
| `client.pty.shells` | GET | `/pty/shells` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2684] |
| `client.pty.list` | GET | `/pty` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2714] |
| `client.pty.create` | POST | `/pty` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2744] |
| `client.pty.remove` | DELETE | `/pty/{ptyID}` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2791] |
| `client.pty.get` | GET | `/pty/{ptyID}` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2823] |
| `client.pty.update` | PUT | `/pty/{ptyID}` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2855] |
| `client.pty.connectToken` | POST | `/pty/{ptyID}/connect-token` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2899] |
| `client.pty.connect` | GET | `/pty/{ptyID}/connect` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2931] |
| `client.question.list` | GET | `/question` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2969] |
| `client.question.reply` | POST | `/question/{requestID}/reply` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2999] |
| `client.question.reject` | POST | `/question/{requestID}/reject` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:3038] |
| `client.permission.list` | GET | `/permission` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:3072] |
| `client.permission.reply` | POST | `/permission/{requestID}/reply` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:3102] |
| `client.permission.respond` | POST | `/session/{sessionID}/permissions/{permissionID}` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:3145] |
| `client.provider.oauth.authorize` | POST | `/provider/{providerID}/oauth/authorize` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:3188] |
| `client.provider.oauth.callback` | POST | `/provider/{providerID}/oauth/callback` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:3235] |
| `client.provider.list` | GET | `/provider` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:3282] |
| `client.provider.auth` | GET | `/provider/auth` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:3312] |
| `client.session.list` | GET | `/session` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:3349] |
| `client.session.create` | POST | `/session` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:3391] |
| `client.session.status` | GET | `/session/status` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:3446] |
| `client.session.delete` | DELETE | `/session/{sessionID}` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:3476] |
| `client.session.get` | GET | `/session/{sessionID}` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:3508] |
| `client.session.update` | PATCH | `/session/{sessionID}` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:3540] |
| `client.session.children` | GET | `/session/{sessionID}/children` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:3589] |
| `client.session.todo` | GET | `/session/{sessionID}/todo` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:3621] |
| `client.session.diff` | GET | `/session/{sessionID}/diff` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:3653] |
| `client.session.messages` | GET | `/session/{sessionID}/message` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:3687] |
| `client.session.prompt` | POST | `/session/{sessionID}/message` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:3723] |
| `client.session.deleteMessage` | DELETE | `/session/{sessionID}/message/{messageID}` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:3783] |
| `client.session.message` | GET | `/session/{sessionID}/message/{messageID}` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:3821] |
| `client.session.fork` | POST | `/session/{sessionID}/fork` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:3855] |
| `client.session.abort` | POST | `/session/{sessionID}/abort` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:3894] |
| `client.session.init` | POST | `/session/{sessionID}/init` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:3926] |
| `client.session.unshare` | DELETE | `/session/{sessionID}/share` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:3969] |
| `client.session.share` | POST | `/session/{sessionID}/share` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:4001] |
| `client.session.summarize` | POST | `/session/{sessionID}/summarize` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:4033] |
| `client.session.promptAsync` | POST | `/session/{sessionID}/prompt_async` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:4076] |
| `client.session.command` | POST | `/session/{sessionID}/command` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:4136] |
| `client.session.shell` | POST | `/session/{sessionID}/shell` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:4194] |
| `client.session.revert` | POST | `/session/{sessionID}/revert` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:4242] |
| `client.session.unrevert` | POST | `/session/{sessionID}/unrevert` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:4283] |
| `client.part.delete` | DELETE | `/session/{sessionID}/message/{messageID}/part/{partID}` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:4315] |
| `client.part.update` | PATCH | `/session/{sessionID}/message/{messageID}/part/{partID}` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:4349] |
| `client.sync.history.list` | POST | `/sync/history` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:4394] |
| `client.sync.start` | POST | `/sync/start` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:4435] |
| `client.sync.replay` | POST | `/sync/replay` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:4465] |
| `client.sync.steal` | POST | `/sync/steal` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:4520] |
| `client.tui.control.next` | GET | `/tui/control/next` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:4564] |
| `client.tui.control.response` | POST | `/tui/control/response` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:4594] |
| `client.tui.appendPrompt` | POST | `/tui/append-prompt` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:4633] |
| `client.tui.openHelp` | POST | `/tui/open-help` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:4670] |
| `client.tui.openSessions` | POST | `/tui/open-sessions` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:4700] |
| `client.tui.openThemes` | POST | `/tui/open-themes` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:4730] |
| `client.tui.openModels` | POST | `/tui/open-models` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:4760] |
| `client.tui.submitPrompt` | POST | `/tui/submit-prompt` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:4790] |
| `client.tui.clearPrompt` | POST | `/tui/clear-prompt` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:4820] |
| `client.tui.executeCommand` | POST | `/tui/execute-command` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:4850] |
| `client.tui.showToast` | POST | `/tui/show-toast` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:4887] |
| `client.tui.publish` | POST | `/tui/publish` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:4930] |
| `client.tui.selectSession` | POST | `/tui/select-session` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:4967] |

### V2 native route methods

| SDK method | HTTP | generated URL | evidence |
|---|---|---|---|
| `client.v2.health.get` | GET | `/api/health` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5011] |
| `client.v2.location.get` | GET | `/api/location` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5025] |
| `client.v2.agent.list` | GET | `/api/agent` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5049] |
| `client.v2.session.permission.list` | GET | `/api/session/{sessionID}/permission` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5073] |
| `client.v2.session.permission.reply` | POST | `/api/session/{sessionID}/permission/{requestID}/reply` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5096] |
| `client.v2.session.question.list` | GET | `/api/session/{sessionID}/question` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5141] |
| `client.v2.session.question.reply` | POST | `/api/session/{sessionID}/question/{requestID}/reply` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5164] |
| `client.v2.session.question.reject` | POST | `/api/session/{sessionID}/question/{requestID}/reject` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5205] |
| `client.v2.session.list` | GET | `/api/session` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5241] |
| `client.v2.session.create` | POST | `/api/session` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5283] |
| `client.v2.session.get` | GET | `/api/session/{sessionID}` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5326] |
| `client.v2.session.prompt` | POST | `/api/session/{sessionID}/prompt` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5345] |
| `client.v2.session.compact` | POST | `/api/session/{sessionID}/compact` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5386] |
| `client.v2.session.wait` | POST | `/api/session/{sessionID}/wait` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5405] |
| `client.v2.session.context` | GET | `/api/session/{sessionID}/context` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5424] |
| `client.v2.session.messages` | GET | `/api/session/{sessionID}/message` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5443] |
| `client.v2.model.list` | GET | `/api/model` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5489] |
| `client.v2.provider.list` | GET | `/api/provider` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5513] |
| `client.v2.provider.get` | GET | `/api/provider/{providerID}` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5535] |
| `client.v2.integration.connect.key` | POST | `/api/integration/{integrationID}/connect/key` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5570][E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5600] |
| `client.v2.integration.connect.oauth` | POST | `/api/integration/{integrationID}/connect/oauth` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5616][E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5650] |
| `client.v2.integration.attempt.cancel` | DELETE | `/api/integration/attempt/{attemptID}` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5668][E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5694] |
| `client.v2.integration.attempt.status` | GET | `/api/integration/attempt/{attemptID}` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5705][E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5731] |
| `client.v2.integration.attempt.complete` | POST | `/api/integration/attempt/{attemptID}/complete` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5742][E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5770] |
| `client.v2.integration.list` | GET | `/api/integration` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5788][E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5799] |
| `client.v2.integration.get` | GET | `/api/integration/{integrationID}` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5810][E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5832] |
| `client.v2.credential.remove` | DELETE | `/api/credential/{credentialID}` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5855][E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5878] |
| `client.v2.credential.update` | PATCH | `/api/credential/{credentialID}` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5890][E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5913] |
| `client.v2.permission.request.list` | GET | `/api/permission/request` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5932] |
| `client.v2.permission.saved.list` | GET | `/api/permission/saved` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5960] |
| `client.v2.permission.saved.remove` | DELETE | `/api/permission/saved/{id}` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5983] |
| `client.v2.fs.read` | GET | `/api/fs/read` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:6020] |
| `client.v2.fs.list` | GET | `/api/fs/list` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:6042] |
| `client.v2.fs.find` | GET | `/api/fs/find` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:6075] |
| `client.v2.command.list` | GET | `/api/command` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:6114] |
| `client.v2.skill.list` | GET | `/api/skill` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:6138] |
| `client.v2.event.subscribe` | GET SSE | `/api/event` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:6162] |
| `client.v2.pty.list` | GET | `/api/pty` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:6186][E: packages/sdk/js/src/v2/gen/sdk.gen.ts:6197] |
| `client.v2.pty.create` | POST | `/api/pty` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:6208][E: packages/sdk/js/src/v2/gen/sdk.gen.ts:6240] |
| `client.v2.pty.remove` | DELETE | `/api/pty/{ptyID}` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:6256][E: packages/sdk/js/src/v2/gen/sdk.gen.ts:6278] |
| `client.v2.pty.get` | GET | `/api/pty/{ptyID}` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:6289][E: packages/sdk/js/src/v2/gen/sdk.gen.ts:6311] |
| `client.v2.pty.update` | PUT | `/api/pty/{ptyID}` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:6322][E: packages/sdk/js/src/v2/gen/sdk.gen.ts:6351] |
| `client.v2.pty.connectToken` | POST | `/api/pty/{ptyID}/connect-token` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:6367][E: packages/sdk/js/src/v2/gen/sdk.gen.ts:6389] |
| `client.v2.pty.connect` | GET | `/api/pty/{ptyID}/connect` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:6400][E: packages/sdk/js/src/v2/gen/sdk.gen.ts:6425] |
| `client.v2.question.request.list` | GET | `/api/question/request` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:6438][E: packages/sdk/js/src/v2/gen/sdk.gen.ts:6453] |
| `client.v2.reference.list` | GET | `/api/reference` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:6473] |
| `client.v2.projectCopy.remove` | DELETE | `/experimental/project/{projectID}/copy` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:6492][E: packages/sdk/js/src/v2/gen/sdk.gen.ts:6522] |
| `client.v2.projectCopy.create` | POST | `/experimental/project/{projectID}/copy` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:6533][E: packages/sdk/js/src/v2/gen/sdk.gen.ts:6562] |
| `client.v2.projectCopy.refresh` | POST | `/experimental/project/{projectID}/copy/refresh` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:6574][E: packages/sdk/js/src/v2/gen/sdk.gen.ts:6600] |

## Sources

- packages/sdk/js/src/gen/sdk.gen.ts
- packages/sdk/js/src/v2/gen/sdk.gen.ts

## 相关

- [SDK overview](overview.md)
- [V1 route catalog](../server-api/v1-routes.md)
- [V2 route catalog](../server-api/v2-routes.md)
