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
updated: 8b68dc0d7
---

> SDK method surface 是 generated client 的逐方法目录：`src/gen` 是旧 legacy SDK；`src/v2/gen` 是当前全量 SDK，包含 legacy compatibility namespaces 和 `client.v2.*` native `/api/*` namespaces。

## 能回答的问题

- `@opencode-ai/sdk` legacy `OpencodeClient` 有哪些方法？
- `@opencode-ai/sdk/v2` current `OpencodeClient` 有哪些 legacy compatibility 方法？
- `client.v2.*` native `/api/*` namespace 具体有哪些 method/path？
- SDK method 名称如何映射到 server route path？

## V1

Legacy `src/gen/sdk.gen.ts` 的 generated `OpencodeClient` 暴露 83 个 callable methods，其中 82 个可从 namespace property 到达，1 个 direct method 挂在 root client 上；其中 `client.auth.*` 与 `client.mcp.auth.*` 指向同一 `Auth` generated class，但它们是两个可达调用路径。[E: packages/sdk/js/src/gen/sdk.gen.ts:866][E: packages/sdk/js/src/gen/sdk.gen.ts:973][E: packages/sdk/js/src/gen/sdk.gen.ts:1161][E: packages/sdk/js/src/gen/sdk.gen.ts:1177][I]

| SDK method | HTTP | generated URL | evidence |
|---|---|---|---|
| `client.global.event` | GET SSE | `/global/event` | [E: packages/sdk/js/src/gen/sdk.gen.ts:239] |
| `client.project.list` | GET | `/project` | [E: packages/sdk/js/src/gen/sdk.gen.ts:251] |
| `client.project.current` | GET | `/project/current` | [E: packages/sdk/js/src/gen/sdk.gen.ts:261] |
| `client.pty.list` | GET | `/pty` | [E: packages/sdk/js/src/gen/sdk.gen.ts:273] |
| `client.pty.create` | POST | `/pty` | [E: packages/sdk/js/src/gen/sdk.gen.ts:283] |
| `client.pty.remove` | DELETE | `/pty/{id}` | [E: packages/sdk/js/src/gen/sdk.gen.ts:297] |
| `client.pty.get` | GET | `/pty/{id}` | [E: packages/sdk/js/src/gen/sdk.gen.ts:307] |
| `client.pty.update` | PUT | `/pty/{id}` | [E: packages/sdk/js/src/gen/sdk.gen.ts:317] |
| `client.pty.connect` | GET | `/pty/{id}/connect` | [E: packages/sdk/js/src/gen/sdk.gen.ts:331] |
| `client.config.get` | GET | `/config` | [E: packages/sdk/js/src/gen/sdk.gen.ts:343] |
| `client.config.update` | PATCH | `/config` | [E: packages/sdk/js/src/gen/sdk.gen.ts:353] |
| `client.config.providers` | GET | `/config/providers` | [E: packages/sdk/js/src/gen/sdk.gen.ts:367] |
| `client.tool.ids` | GET | `/experimental/tool/ids` | [E: packages/sdk/js/src/gen/sdk.gen.ts:379] |
| `client.tool.list` | GET | `/experimental/tool` | [E: packages/sdk/js/src/gen/sdk.gen.ts:389] |
| `client.instance.dispose` | POST | `/instance/dispose` | [E: packages/sdk/js/src/gen/sdk.gen.ts:401] |
| `client.path.get` | GET | `/path` | [E: packages/sdk/js/src/gen/sdk.gen.ts:413] |
| `client.vcs.get` | GET | `/vcs` | [E: packages/sdk/js/src/gen/sdk.gen.ts:425] |
| `client.session.list` | GET | `/session` | [E: packages/sdk/js/src/gen/sdk.gen.ts:437] |
| `client.session.create` | POST | `/session` | [E: packages/sdk/js/src/gen/sdk.gen.ts:447] |
| `client.session.status` | GET | `/session/status` | [E: packages/sdk/js/src/gen/sdk.gen.ts:461] |
| `client.session.delete` | DELETE | `/session/{id}` | [E: packages/sdk/js/src/gen/sdk.gen.ts:471] |
| `client.session.get` | GET | `/session/{id}` | [E: packages/sdk/js/src/gen/sdk.gen.ts:481] |
| `client.session.update` | PATCH | `/session/{id}` | [E: packages/sdk/js/src/gen/sdk.gen.ts:491] |
| `client.session.children` | GET | `/session/{id}/children` | [E: packages/sdk/js/src/gen/sdk.gen.ts:505] |
| `client.session.todo` | GET | `/session/{id}/todo` | [E: packages/sdk/js/src/gen/sdk.gen.ts:515] |
| `client.session.init` | POST | `/session/{id}/init` | [E: packages/sdk/js/src/gen/sdk.gen.ts:525] |
| `client.session.fork` | POST | `/session/{id}/fork` | [E: packages/sdk/js/src/gen/sdk.gen.ts:539] |
| `client.session.abort` | POST | `/session/{id}/abort` | [E: packages/sdk/js/src/gen/sdk.gen.ts:553] |
| `client.session.unshare` | DELETE | `/session/{id}/share` | [E: packages/sdk/js/src/gen/sdk.gen.ts:563] |
| `client.session.share` | POST | `/session/{id}/share` | [E: packages/sdk/js/src/gen/sdk.gen.ts:573] |
| `client.session.diff` | GET | `/session/{id}/diff` | [E: packages/sdk/js/src/gen/sdk.gen.ts:583] |
| `client.session.summarize` | POST | `/session/{id}/summarize` | [E: packages/sdk/js/src/gen/sdk.gen.ts:593] |
| `client.session.messages` | GET | `/session/{id}/message` | [E: packages/sdk/js/src/gen/sdk.gen.ts:607] |
| `client.session.prompt` | POST | `/session/{id}/message` | [E: packages/sdk/js/src/gen/sdk.gen.ts:617] |
| `client.session.message` | GET | `/session/{id}/message/{messageID}` | [E: packages/sdk/js/src/gen/sdk.gen.ts:631] |
| `client.session.promptAsync` | POST | `/session/{id}/prompt_async` | [E: packages/sdk/js/src/gen/sdk.gen.ts:641] |
| `client.session.command` | POST | `/session/{id}/command` | [E: packages/sdk/js/src/gen/sdk.gen.ts:655] |
| `client.session.shell` | POST | `/session/{id}/shell` | [E: packages/sdk/js/src/gen/sdk.gen.ts:669] |
| `client.session.revert` | POST | `/session/{id}/revert` | [E: packages/sdk/js/src/gen/sdk.gen.ts:683] |
| `client.session.unrevert` | POST | `/session/{id}/unrevert` | [E: packages/sdk/js/src/gen/sdk.gen.ts:697] |
| `client.command.list` | GET | `/command` | [E: packages/sdk/js/src/gen/sdk.gen.ts:709] |
| `client.provider.list` | GET | `/provider` | [E: packages/sdk/js/src/gen/sdk.gen.ts:759] |
| `client.provider.auth` | GET | `/provider/auth` | [E: packages/sdk/js/src/gen/sdk.gen.ts:769] |
| `client.provider.oauth.authorize` | POST | `/provider/{id}/oauth/authorize` | [E: packages/sdk/js/src/gen/sdk.gen.ts:725] |
| `client.provider.oauth.callback` | POST | `/provider/{id}/oauth/callback` | [E: packages/sdk/js/src/gen/sdk.gen.ts:743] |
| `client.find.text` | GET | `/find` | [E: packages/sdk/js/src/gen/sdk.gen.ts:782] |
| `client.find.files` | GET | `/find/file` | [E: packages/sdk/js/src/gen/sdk.gen.ts:792] |
| `client.find.symbols` | GET | `/find/symbol` | [E: packages/sdk/js/src/gen/sdk.gen.ts:802] |
| `client.file.list` | GET | `/file` | [E: packages/sdk/js/src/gen/sdk.gen.ts:814] |
| `client.file.read` | GET | `/file/content` | [E: packages/sdk/js/src/gen/sdk.gen.ts:824] |
| `client.file.status` | GET | `/file/status` | [E: packages/sdk/js/src/gen/sdk.gen.ts:834] |
| `client.app.log` | POST | `/log` | [E: packages/sdk/js/src/gen/sdk.gen.ts:846] |
| `client.app.agents` | GET | `/agent` | [E: packages/sdk/js/src/gen/sdk.gen.ts:860] |
| `client.mcp.status` | GET | `/mcp` | [E: packages/sdk/js/src/gen/sdk.gen.ts:934] |
| `client.mcp.add` | POST | `/mcp` | [E: packages/sdk/js/src/gen/sdk.gen.ts:944] |
| `client.mcp.connect` | POST | `/mcp/{name}/connect` | [E: packages/sdk/js/src/gen/sdk.gen.ts:958] |
| `client.mcp.disconnect` | POST | `/mcp/{name}/disconnect` | [E: packages/sdk/js/src/gen/sdk.gen.ts:968] |
| `client.mcp.auth.remove` | DELETE | `/mcp/{name}/auth` | [E: packages/sdk/js/src/gen/sdk.gen.ts:872] |
| `client.mcp.auth.start` | POST | `/mcp/{name}/auth` | [E: packages/sdk/js/src/gen/sdk.gen.ts:882] |
| `client.mcp.auth.callback` | POST | `/mcp/{name}/auth/callback` | [E: packages/sdk/js/src/gen/sdk.gen.ts:892] |
| `client.mcp.auth.authenticate` | POST | `/mcp/{name}/auth/authenticate` | [E: packages/sdk/js/src/gen/sdk.gen.ts:907] |
| `client.mcp.auth.set` | PUT | `/auth/{id}` | [E: packages/sdk/js/src/gen/sdk.gen.ts:918] |
| `client.lsp.status` | GET | `/lsp` | [E: packages/sdk/js/src/gen/sdk.gen.ts:982] |
| `client.formatter.status` | GET | `/formatter` | [E: packages/sdk/js/src/gen/sdk.gen.ts:994] |
| `client.tui.appendPrompt` | POST | `/tui/append-prompt` | [E: packages/sdk/js/src/gen/sdk.gen.ts:1032] |
| `client.tui.openHelp` | POST | `/tui/open-help` | [E: packages/sdk/js/src/gen/sdk.gen.ts:1046] |
| `client.tui.openSessions` | POST | `/tui/open-sessions` | [E: packages/sdk/js/src/gen/sdk.gen.ts:1056] |
| `client.tui.openThemes` | POST | `/tui/open-themes` | [E: packages/sdk/js/src/gen/sdk.gen.ts:1066] |
| `client.tui.openModels` | POST | `/tui/open-models` | [E: packages/sdk/js/src/gen/sdk.gen.ts:1076] |
| `client.tui.submitPrompt` | POST | `/tui/submit-prompt` | [E: packages/sdk/js/src/gen/sdk.gen.ts:1086] |
| `client.tui.clearPrompt` | POST | `/tui/clear-prompt` | [E: packages/sdk/js/src/gen/sdk.gen.ts:1096] |
| `client.tui.executeCommand` | POST | `/tui/execute-command` | [E: packages/sdk/js/src/gen/sdk.gen.ts:1106] |
| `client.tui.showToast` | POST | `/tui/show-toast` | [E: packages/sdk/js/src/gen/sdk.gen.ts:1120] |
| `client.tui.publish` | POST | `/tui/publish` | [E: packages/sdk/js/src/gen/sdk.gen.ts:1134] |
| `client.tui.control.next` | GET | `/tui/control/next` | [E: packages/sdk/js/src/gen/sdk.gen.ts:1006] |
| `client.tui.control.response` | POST | `/tui/control/response` | [E: packages/sdk/js/src/gen/sdk.gen.ts:1016] |
| `client.auth.remove` | DELETE | `/mcp/{name}/auth` | [E: packages/sdk/js/src/gen/sdk.gen.ts:872] |
| `client.auth.start` | POST | `/mcp/{name}/auth` | [E: packages/sdk/js/src/gen/sdk.gen.ts:882] |
| `client.auth.callback` | POST | `/mcp/{name}/auth/callback` | [E: packages/sdk/js/src/gen/sdk.gen.ts:892] |
| `client.auth.authenticate` | POST | `/mcp/{name}/auth/authenticate` | [E: packages/sdk/js/src/gen/sdk.gen.ts:907] |
| `client.auth.set` | PUT | `/auth/{id}` | [E: packages/sdk/js/src/gen/sdk.gen.ts:918] |
| `client.event.subscribe` | GET SSE | `/event` | [E: packages/sdk/js/src/gen/sdk.gen.ts:1151] |
| `client.postSessionIdPermissionsPermissionId` | POST | `/session/{id}/permissions/{permissionID}` | [E: packages/sdk/js/src/gen/sdk.gen.ts:1169] |

## V2

`src/v2/gen/sdk.gen.ts` 的 generated `OpencodeClient` 暴露 188 个 callable methods。前 127 个是 legacy compatibility surface；后 61 个挂在 `client.v2.*` 下，对应 V2 native route surface。[E: packages/sdk/js/src/v2/gen/sdk.gen.ts:7077][E: packages/sdk/js/src/v2/gen/sdk.gen.ts:7216][I]

### V2 legacy compatibility methods

| SDK method | HTTP | generated URL | evidence |
|---|---|---|---|
| `client.auth.remove` | DELETE | `/auth/{providerID}` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:468] |
| `client.auth.set` | PUT | `/auth/{providerID}` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:498] |
| `client.app.log` | POST | `/log` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:545] |
| `client.app.agents` | GET | `/agent` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:580] |
| `client.app.skills` | GET | `/skill` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:610] |
| `client.experimental.controlPlane.moveSession` | POST | `/experimental/control-plane/move-session` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:648] |
| `client.experimental.capabilities.get` | GET | `/experimental/capabilities` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:689] |
| `client.experimental.console.get` | GET | `/experimental/console` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:725] |
| `client.experimental.console.listOrgs` | GET | `/experimental/console/orgs` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:759] |
| `client.experimental.console.switchOrg` | POST | `/experimental/console/switch` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:793] |
| `client.experimental.session.list` | GET | `/experimental/session` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:846] |
| `client.experimental.session.background` | POST | `/experimental/session/{sessionID}/background` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:882] |
| `client.experimental.resource.list` | GET | `/experimental/resource` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:918] |
| `client.experimental.projectCopy.generateName` | POST | `/experimental/project/{projectID}/copy/generate-name` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:958] |
| `client.experimental.workspace.list` | GET | `/experimental/workspace` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1035] |
| `client.experimental.workspace.create` | POST | `/experimental/workspace` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1077] |
| `client.experimental.workspace.syncList` | POST | `/experimental/workspace/sync-list` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1116] |
| `client.experimental.workspace.status` | GET | `/experimental/workspace/status` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1150] |
| `client.experimental.workspace.remove` | DELETE | `/experimental/workspace/{id}` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1186] |
| `client.experimental.workspace.warp` | POST | `/experimental/workspace/warp` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1226] |
| `client.experimental.workspace.adapter.list` | GET | `/experimental/workspace/adapter` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:999] |
| `client.global.health` | GET | `/global/health` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1326] |
| `client.global.event` | GET SSE | `/global/event` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1338] |
| `client.global.dispose` | POST | `/global/dispose` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1350] |
| `client.global.upgrade` | POST | `/global/upgrade` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1368] |
| `client.global.config.get` | GET | `/global/config` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1288] |
| `client.global.config.update` | PATCH | `/global/config` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1306] |
| `client.event.subscribe` | GET SSE | `/event` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1410] |
| `client.config.get` | GET | `/config` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1442] |
| `client.config.update` | PATCH | `/config` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1474] |
| `client.config.providers` | GET | `/config/providers` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1509] |
| `client.tool.list` | GET | `/experimental/tool` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1545] |
| `client.tool.ids` | GET | `/experimental/tool/ids` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1575] |
| `client.worktree.remove` | DELETE | `/experimental/worktree` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1609] |
| `client.worktree.list` | GET | `/experimental/worktree` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1644] |
| `client.worktree.create` | POST | `/experimental/worktree` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1676] |
| `client.worktree.reset` | POST | `/experimental/worktree/reset` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1713] |
| `client.find.text` | GET | `/find` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1752] |
| `client.find.files` | GET | `/find/file` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1790] |
| `client.find.symbols` | GET | `/find/symbol` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1822] |
| `client.file.list` | GET | `/file` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1856] |
| `client.file.read` | GET | `/file/content` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1888] |
| `client.file.status` | GET | `/file/status` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1918] |
| `client.instance.dispose` | POST | `/instance/dispose` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1950] |
| `client.path.get` | GET | `/path` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1982] |
| `client.vcs.get` | GET | `/vcs` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2046] |
| `client.vcs.status` | GET | `/vcs/status` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2076] |
| `client.vcs.diff` | GET | `/vcs/diff` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2110] |
| `client.vcs.apply` | POST | `/vcs/apply` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2142] |
| `client.vcs.diff2.raw` | GET | `/vcs/diff/raw` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2014] |
| `client.command.list` | GET | `/command` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2184] |
| `client.lsp.status` | GET | `/lsp` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2216] |
| `client.formatter.status` | GET | `/formatter` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2248] |
| `client.mcp.status` | GET | `/mcp` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2419] |
| `client.mcp.add` | POST | `/mcp` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2453] |
| `client.mcp.connect` | POST | `/mcp/{name}/connect` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2488] |
| `client.mcp.disconnect` | POST | `/mcp/{name}/disconnect` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2518] |
| `client.mcp.auth.remove` | DELETE | `/mcp/{name}/auth` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2282] |
| `client.mcp.auth.start` | POST | `/mcp/{name}/auth` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2314] |
| `client.mcp.auth.callback` | POST | `/mcp/{name}/auth/callback` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2348] |
| `client.mcp.auth.authenticate` | POST | `/mcp/{name}/auth/authenticate` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2386] |
| `client.project.list` | GET | `/project` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2555] |
| `client.project.current` | GET | `/project/current` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2585] |
| `client.project.initGit` | POST | `/project/git/init` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2615] |
| `client.project.update` | PATCH | `/project/{projectID}` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2653] |
| `client.project.directories` | GET | `/project/{projectID}/directories` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2690] |
| `client.pty.shells` | GET | `/pty/shells` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2722] |
| `client.pty.list` | GET | `/pty` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2752] |
| `client.pty.create` | POST | `/pty` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2794] |
| `client.pty.remove` | DELETE | `/pty/{ptyID}` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2831] |
| `client.pty.get` | GET | `/pty/{ptyID}` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2863] |
| `client.pty.update` | PUT | `/pty/{ptyID}` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2902] |
| `client.pty.connectToken` | POST | `/pty/{ptyID}/connect-token` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2939] |
| `client.pty.connect` | GET | `/pty/{ptyID}/connect` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2975] |
| `client.question.list` | GET | `/question` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:3007] |
| `client.question.reply` | POST | `/question/{requestID}/reply` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:3041] |
| `client.question.reject` | POST | `/question/{requestID}/reject` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:3078] |
| `client.permission.list` | GET | `/permission` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:3110] |
| `client.permission.reply` | POST | `/permission/{requestID}/reply` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:3146] |
| `client.permission.respond` | POST | `/session/{sessionID}/permissions/{permissionID}` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:3189] |
| `client.provider.list` | GET | `/provider` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:3320] |
| `client.provider.auth` | GET | `/provider/auth` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:3350] |
| `client.provider.oauth.authorize` | POST | `/provider/{providerID}/oauth/authorize` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:3238] |
| `client.provider.oauth.callback` | POST | `/provider/{providerID}/oauth/callback` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:3283] |
| `client.session.list` | GET | `/session` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:3399] |
| `client.session.create` | POST | `/session` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:3449] |
| `client.session.status` | GET | `/session/status` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:3484] |
| `client.session.delete` | DELETE | `/session/{sessionID}` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:3516] |
| `client.session.get` | GET | `/session/{sessionID}` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:3548] |
| `client.session.update` | PATCH | `/session/{sessionID}` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:3592] |
| `client.session.children` | GET | `/session/{sessionID}/children` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:3629] |
| `client.session.todo` | GET | `/session/{sessionID}/todo` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:3661] |
| `client.session.diff` | GET | `/session/{sessionID}/diff` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:3695] |
| `client.session.messages` | GET | `/session/{sessionID}/message` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:3731] |
| `client.session.prompt` | POST | `/session/{sessionID}/message` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:3786] |
| `client.session.deleteMessage` | DELETE | `/session/{sessionID}/message/{messageID}` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:3829] |
| `client.session.message` | GET | `/session/{sessionID}/message/{messageID}` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:3863] |
| `client.session.fork` | POST | `/session/{sessionID}/fork` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:3897] |
| `client.session.abort` | POST | `/session/{sessionID}/abort` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:3934] |
| `client.session.init` | POST | `/session/{sessionID}/init` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:3972] |
| `client.session.unshare` | DELETE | `/session/{sessionID}/share` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:4009] |
| `client.session.share` | POST | `/session/{sessionID}/share` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:4041] |
| `client.session.summarize` | POST | `/session/{sessionID}/summarize` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:4079] |
| `client.session.promptAsync` | POST | `/session/{sessionID}/prompt_async` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:4139] |
| `client.session.command` | POST | `/session/{sessionID}/command` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:4197] |
| `client.session.shell` | POST | `/session/{sessionID}/shell` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:4245] |
| `client.session.revert` | POST | `/session/{sessionID}/revert` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:4286] |
| `client.session.unrevert` | POST | `/session/{sessionID}/unrevert` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:4323] |
| `client.part.delete` | DELETE | `/session/{sessionID}/message/{messageID}/part/{partID}` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:4359] |
| `client.part.update` | PATCH | `/session/{sessionID}/message/{messageID}/part/{partID}` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:4395] |
| `client.sync.start` | POST | `/sync/start` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:4473] |
| `client.sync.replay` | POST | `/sync/replay` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:4523] |
| `client.sync.steal` | POST | `/sync/steal` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:4560] |
| `client.sync.history.list` | POST | `/sync/history` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:4436] |
| `client.tui.appendPrompt` | POST | `/tui/append-prompt` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:4673] |
| `client.tui.openHelp` | POST | `/tui/open-help` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:4708] |
| `client.tui.openSessions` | POST | `/tui/open-sessions` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:4738] |
| `client.tui.openThemes` | POST | `/tui/open-themes` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:4768] |
| `client.tui.openModels` | POST | `/tui/open-models` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:4798] |
| `client.tui.submitPrompt` | POST | `/tui/submit-prompt` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:4828] |
| `client.tui.clearPrompt` | POST | `/tui/clear-prompt` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:4858] |
| `client.tui.executeCommand` | POST | `/tui/execute-command` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:4890] |
| `client.tui.showToast` | POST | `/tui/show-toast` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:4933] |
| `client.tui.publish` | POST | `/tui/publish` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:4970] |
| `client.tui.selectSession` | POST | `/tui/select-session` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5007] |
| `client.tui.control.next` | GET | `/tui/control/next` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:4602] |
| `client.tui.control.response` | POST | `/tui/control/response` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:4634] |

### V2 native route methods

| SDK method | HTTP | generated URL | evidence |
|---|---|---|---|
| `client.v2.health.get` | GET | `/api/health` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5032] |
| `client.v2.location.get` | GET | `/api/location` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5055] |
| `client.v2.agent.list` | GET | `/api/agent` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5079] |
| `client.v2.session.list` | GET | `/api/session` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5463] |
| `client.v2.session.create` | POST | `/api/session` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5497] |
| `client.v2.session.active` | GET | `/api/session/active` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5515] |
| `client.v2.session.get` | GET | `/api/session/{sessionID}` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5533] |
| `client.v2.session.switchAgent` | POST | `/api/session/{sessionID}/agent` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5567] |
| `client.v2.session.switchModel` | POST | `/api/session/{sessionID}/model` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5606] |
| `client.v2.session.prompt` | POST | `/api/session/{sessionID}/prompt` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5647] |
| `client.v2.session.compact` | POST | `/api/session/{sessionID}/compact` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5671] |
| `client.v2.session.wait` | POST | `/api/session/{sessionID}/wait` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5690] |
| `client.v2.session.context` | GET | `/api/session/{sessionID}/context` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5709] |
| `client.v2.session.history` | GET | `/api/session/{sessionID}/history` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5741] |
| `client.v2.session.events` | GET SSE | `/api/session/{sessionID}/event` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5771] |
| `client.v2.session.interrupt` | POST | `/api/session/{sessionID}/interrupt` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5790] |
| `client.v2.session.message` | GET | `/api/session/{sessionID}/message/{messageID}` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5820] |
| `client.v2.session.messages` | GET | `/api/session/{sessionID}/message` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5854] |
| `client.v2.session.revert.stage` | POST | `/api/session/{sessionID}/revert/stage` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5117] |
| `client.v2.session.revert.clear` | POST | `/api/session/{sessionID}/revert/clear` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5143] |
| `client.v2.session.revert.commit` | POST | `/api/session/{sessionID}/revert/commit` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5164] |
| `client.v2.session.permission.list` | GET | `/api/session/{sessionID}/permission` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5189] |
| `client.v2.session.permission.create` | POST | `/api/session/{sessionID}/permission` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5237] |
| `client.v2.session.permission.get` | GET | `/api/session/{sessionID}/permission/{requestID}` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5276] |
| `client.v2.session.permission.reply` | POST | `/api/session/{sessionID}/permission/{requestID}/reply` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5314] |
| `client.v2.session.question.list` | GET | `/api/session/{sessionID}/question` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5344] |
| `client.v2.session.question.reply` | POST | `/api/session/{sessionID}/question/{requestID}/reply` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5380] |
| `client.v2.session.question.reject` | POST | `/api/session/{sessionID}/question/{requestID}/reject` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5419] |
| `client.v2.model.list` | GET | `/api/model` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5893] |
| `client.v2.provider.list` | GET | `/api/provider` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5917] |
| `client.v2.provider.get` | GET | `/api/provider/{providerID}` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5950] |
| `client.v2.integration.list` | GET | `/api/integration` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:6192] |
| `client.v2.integration.get` | GET | `/api/integration/{integrationID}` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:6225] |
| `client.v2.integration.connect.key` | POST | `/api/integration/{integrationID}/connect/key` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5993] |
| `client.v2.integration.connect.oauth` | POST | `/api/integration/{integrationID}/connect/oauth` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:6043] |
| `client.v2.integration.attempt.cancel` | DELETE | `/api/integration/attempt/{attemptID}` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:6087] |
| `client.v2.integration.attempt.status` | GET | `/api/integration/attempt/{attemptID}` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:6124] |
| `client.v2.integration.attempt.complete` | POST | `/api/integration/attempt/{attemptID}/complete` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:6163] |
| `client.v2.credential.remove` | DELETE | `/api/credential/{credentialID}` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:6271] |
| `client.v2.credential.update` | PATCH | `/api/credential/{credentialID}` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:6307] |
| `client.v2.permission.request.list` | GET | `/api/permission/request` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:6340] |
| `client.v2.permission.saved.list` | GET | `/api/permission/saved` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:6365] |
| `client.v2.permission.saved.remove` | DELETE | `/api/permission/saved/{id}` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:6388] |
| `client.v2.fs.read` | GET | `/api/fs/read/*` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:6424] |
| `client.v2.fs.list` | GET | `/api/fs/list` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:6457] |
| `client.v2.fs.find` | GET | `/api/fs/find` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:6494] |
| `client.v2.command.list` | GET | `/api/command` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:6518] |
| `client.v2.skill.list` | GET | `/api/skill` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:6542] |
| `client.v2.event.subscribe` | GET SSE | `/api/event` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:6557] |
| `client.v2.pty.list` | GET | `/api/pty` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:6580] |
| `client.v2.pty.create` | POST | `/api/pty` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:6623] |
| `client.v2.pty.remove` | DELETE | `/api/pty/{ptyID}` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:6661] |
| `client.v2.pty.get` | GET | `/api/pty/{ptyID}` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:6694] |
| `client.v2.pty.update` | PUT | `/api/pty/{ptyID}` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:6734] |
| `client.v2.pty.connectToken` | POST | `/api/pty/{ptyID}/connect-token` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:6772] |
| `client.v2.pty.connect` | GET | `/api/pty/{ptyID}/connect` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:6808] |
| `client.v2.question.request.list` | GET | `/api/question/request` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:6836] |
| `client.v2.reference.list` | GET | `/api/reference` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:6867] |
| `client.v2.projectCopy.remove` | DELETE | `/experimental/project/{projectID}/copy` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:6905] |
| `client.v2.projectCopy.create` | POST | `/experimental/project/{projectID}/copy` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:6945] |
| `client.v2.projectCopy.refresh` | POST | `/experimental/project/{projectID}/copy/refresh` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:6983] |

## Sources

- packages/sdk/js/src/gen/sdk.gen.ts
- packages/sdk/js/src/v2/gen/sdk.gen.ts

## 相关

- [SDK overview](overview.md)
- [V1 route catalog](../server-api/v1-routes.md)
- [V2 route catalog](../server-api/v2-routes.md)
