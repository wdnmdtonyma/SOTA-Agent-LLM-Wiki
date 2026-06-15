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
updated: 92c70c9c3
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

`src/v2/gen/sdk.gen.ts` 的 generated `OpencodeClient` 暴露 165 个 callable methods。前 128 个是 legacy compatibility surface；后 37 个挂在 `client.v2.*` 下，对应 V2 `/api/*` route surface。[E: packages/sdk/js/src/v2/gen/sdk.gen.ts:6271][E: packages/sdk/js/src/v2/gen/sdk.gen.ts:6409][I]

### V2 legacy compatibility methods

| SDK method | HTTP | generated URL | evidence |
|---|---|---|---|
| `client.auth.remove` | DELETE | `/auth/{providerID}` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:410] |
| `client.auth.set` | PUT | `/auth/{providerID}` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:429] |
| `client.app.log` | POST | `/log` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:466] |
| `client.app.agents` | GET | `/agent` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:511] |
| `client.app.skills` | GET | `/skill` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:541] |
| `client.experimental.controlPlane.moveSession` | POST | `/experimental/control-plane/move-session` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:573] |
| `client.experimental.console.get` | GET | `/experimental/console` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:616] |
| `client.experimental.console.listOrgs` | GET | `/experimental/console/orgs` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:650] |
| `client.experimental.console.switchOrg` | POST | `/experimental/console/switch` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:684] |
| `client.experimental.session.list` | GET | `/experimental/session` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:725] |
| `client.experimental.session.background` | POST | `/experimental/session/{sessionID}/background` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:771] |
| `client.experimental.resource.list` | GET | `/experimental/resource` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:809] |
| `client.experimental.projectCopy.remove` | DELETE | `/experimental/project/{projectID}/copy` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:845] |
| `client.experimental.projectCopy.create` | POST | `/experimental/project/{projectID}/copy` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:888] |
| `client.experimental.projectCopy.refresh` | POST | `/experimental/project/{projectID}/copy/refresh` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:935] |
| `client.experimental.workspace.adapter.list` | GET | `/experimental/workspace/adapter` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:973] |
| `client.experimental.workspace.list` | GET | `/experimental/workspace` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1009] |
| `client.experimental.workspace.create` | POST | `/experimental/workspace` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1043] |
| `client.experimental.workspace.syncList` | POST | `/experimental/workspace/sync-list` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1090] |
| `client.experimental.workspace.status` | GET | `/experimental/workspace/status` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1124] |
| `client.experimental.workspace.remove` | DELETE | `/experimental/workspace/{id}` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1158] |
| `client.experimental.workspace.warp` | POST | `/experimental/workspace/warp` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1194] |
| `client.global.config.get` | GET | `/global/config` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1278] |
| `client.global.config.update` | PATCH | `/global/config` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1290] |
| `client.global.health` | GET | `/global/health` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1316] |
| `client.global.event` | GET SSE | `/global/event` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1328] |
| `client.global.dispose` | POST | `/global/dispose` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1340] |
| `client.global.upgrade` | POST | `/global/upgrade` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1352] |
| `client.event.subscribe` | GET SSE | `/event` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1383] |
| `client.config.get` | GET | `/config` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1415] |
| `client.config.update` | PATCH | `/config` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1445] |
| `client.config.providers` | GET | `/config/providers` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1482] |
| `client.tool.list` | GET | `/experimental/tool` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1514] |
| `client.tool.ids` | GET | `/experimental/tool/ids` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1548] |
| `client.worktree.remove` | DELETE | `/experimental/worktree` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1580] |
| `client.worktree.list` | GET | `/experimental/worktree` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1617] |
| `client.worktree.create` | POST | `/experimental/worktree` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1647] |
| `client.worktree.reset` | POST | `/experimental/worktree/reset` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1684] |
| `client.find.text` | GET | `/find` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1723] |
| `client.find.files` | GET | `/find/file` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1755] |
| `client.find.symbols` | GET | `/find/symbol` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1793] |
| `client.file.list` | GET | `/file` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1827] |
| `client.file.read` | GET | `/file/content` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1859] |
| `client.file.status` | GET | `/file/status` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1891] |
| `client.instance.dispose` | POST | `/instance/dispose` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1923] |
| `client.path.get` | GET | `/path` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1955] |
| `client.vcs.diff2.raw` | GET | `/vcs/diff/raw` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:1987][E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2146] |
| `client.vcs.get` | GET | `/vcs` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2019] |
| `client.vcs.status` | GET | `/vcs/status` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2049] |
| `client.vcs.diff` | GET | `/vcs/diff` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2079] |
| `client.vcs.apply` | POST | `/vcs/apply` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2113] |
| `client.command.list` | GET | `/command` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2157] |
| `client.lsp.status` | GET | `/lsp` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2189] |
| `client.formatter.status` | GET | `/formatter` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2221] |
| `client.mcp.auth.remove` | DELETE | `/mcp/{name}/auth` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2253] |
| `client.mcp.auth.start` | POST | `/mcp/{name}/auth` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2285] |
| `client.mcp.auth.callback` | POST | `/mcp/{name}/auth/callback` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2317] |
| `client.mcp.auth.authenticate` | POST | `/mcp/{name}/auth/authenticate` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2356] |
| `client.mcp.status` | GET | `/mcp` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2392] |
| `client.mcp.add` | POST | `/mcp` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2422] |
| `client.mcp.connect` | POST | `/mcp/{name}/connect` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2459] |
| `client.mcp.disconnect` | POST | `/mcp/{name}/disconnect` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2489] |
| `client.project.list` | GET | `/project` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2528] |
| `client.project.current` | GET | `/project/current` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2558] |
| `client.project.initGit` | POST | `/project/git/init` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2588] |
| `client.project.update` | PATCH | `/project/{projectID}` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2618] |
| `client.project.directories` | GET | `/project/{projectID}/directories` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2670] |
| `client.pty.shells` | GET | `/pty/shells` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2704] |
| `client.pty.list` | GET | `/pty` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2734] |
| `client.pty.create` | POST | `/pty` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2764] |
| `client.pty.remove` | DELETE | `/pty/{ptyID}` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2811] |
| `client.pty.get` | GET | `/pty/{ptyID}` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2843] |
| `client.pty.update` | PUT | `/pty/{ptyID}` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2875] |
| `client.pty.connectToken` | POST | `/pty/{ptyID}/connect-token` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2919] |
| `client.pty.connect` | GET | `/pty/{ptyID}/connect` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2951] |
| `client.question.list` | GET | `/question` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:2989] |
| `client.question.reply` | POST | `/question/{requestID}/reply` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:3019] |
| `client.question.reject` | POST | `/question/{requestID}/reject` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:3058] |
| `client.permission.list` | GET | `/permission` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:3092] |
| `client.permission.reply` | POST | `/permission/{requestID}/reply` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:3122] |
| `client.permission.respond` | POST | `/session/{sessionID}/permissions/{permissionID}` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:3165] |
| `client.provider.oauth.authorize` | POST | `/provider/{providerID}/oauth/authorize` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:3208] |
| `client.provider.oauth.callback` | POST | `/provider/{providerID}/oauth/callback` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:3255] |
| `client.provider.list` | GET | `/provider` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:3302] |
| `client.provider.auth` | GET | `/provider/auth` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:3332] |
| `client.session.list` | GET | `/session` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:3369] |
| `client.session.create` | POST | `/session` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:3411] |
| `client.session.status` | GET | `/session/status` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:3466] |
| `client.session.delete` | DELETE | `/session/{sessionID}` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:3496] |
| `client.session.get` | GET | `/session/{sessionID}` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:3528] |
| `client.session.update` | PATCH | `/session/{sessionID}` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:3560] |
| `client.session.children` | GET | `/session/{sessionID}/children` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:3609] |
| `client.session.todo` | GET | `/session/{sessionID}/todo` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:3641] |
| `client.session.diff` | GET | `/session/{sessionID}/diff` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:3673] |
| `client.session.messages` | GET | `/session/{sessionID}/message` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:3707] |
| `client.session.prompt` | POST | `/session/{sessionID}/message` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:3743] |
| `client.session.deleteMessage` | DELETE | `/session/{sessionID}/message/{messageID}` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:3803] |
| `client.session.message` | GET | `/session/{sessionID}/message/{messageID}` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:3841] |
| `client.session.fork` | POST | `/session/{sessionID}/fork` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:3875] |
| `client.session.abort` | POST | `/session/{sessionID}/abort` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:3914] |
| `client.session.init` | POST | `/session/{sessionID}/init` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:3946] |
| `client.session.unshare` | DELETE | `/session/{sessionID}/share` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:3989] |
| `client.session.share` | POST | `/session/{sessionID}/share` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:4021] |
| `client.session.summarize` | POST | `/session/{sessionID}/summarize` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:4053] |
| `client.session.promptAsync` | POST | `/session/{sessionID}/prompt_async` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:4096] |
| `client.session.command` | POST | `/session/{sessionID}/command` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:4156] |
| `client.session.shell` | POST | `/session/{sessionID}/shell` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:4214] |
| `client.session.revert` | POST | `/session/{sessionID}/revert` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:4262] |
| `client.session.unrevert` | POST | `/session/{sessionID}/unrevert` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:4303] |
| `client.part.delete` | DELETE | `/session/{sessionID}/message/{messageID}/part/{partID}` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:4335] |
| `client.part.update` | PATCH | `/session/{sessionID}/message/{messageID}/part/{partID}` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:4369] |
| `client.sync.history.list` | POST | `/sync/history` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:4414] |
| `client.sync.start` | POST | `/sync/start` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:4455] |
| `client.sync.replay` | POST | `/sync/replay` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:4485] |
| `client.sync.steal` | POST | `/sync/steal` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:4540] |
| `client.tui.control.next` | GET | `/tui/control/next` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:4584] |
| `client.tui.control.response` | POST | `/tui/control/response` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:4614] |
| `client.tui.appendPrompt` | POST | `/tui/append-prompt` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:4653] |
| `client.tui.openHelp` | POST | `/tui/open-help` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:4690] |
| `client.tui.openSessions` | POST | `/tui/open-sessions` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:4720] |
| `client.tui.openThemes` | POST | `/tui/open-themes` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:4750] |
| `client.tui.openModels` | POST | `/tui/open-models` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:4780] |
| `client.tui.submitPrompt` | POST | `/tui/submit-prompt` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:4810] |
| `client.tui.clearPrompt` | POST | `/tui/clear-prompt` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:4840] |
| `client.tui.executeCommand` | POST | `/tui/execute-command` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:4870] |
| `client.tui.showToast` | POST | `/tui/show-toast` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:4907] |
| `client.tui.publish` | POST | `/tui/publish` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:4950] |
| `client.tui.selectSession` | POST | `/tui/select-session` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:4987] |

### V2 native `/api/*` methods

| SDK method | HTTP | generated URL | evidence |
|---|---|---|---|
| `client.v2.health.get` | GET | `/api/health` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5031] |
| `client.v2.location.get` | GET | `/api/location` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5045] |
| `client.v2.agent.list` | GET | `/api/agent` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5069] |
| `client.v2.session.permission.list` | GET | `/api/session/{sessionID}/permission` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5093] |
| `client.v2.session.permission.reply` | POST | `/api/session/{sessionID}/permission/{requestID}/reply` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5116] |
| `client.v2.session.question.list` | GET | `/api/session/{sessionID}/question` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5161] |
| `client.v2.session.question.reply` | POST | `/api/session/{sessionID}/question/{requestID}/reply` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5184] |
| `client.v2.session.question.reject` | POST | `/api/session/{sessionID}/question/{requestID}/reject` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5225] |
| `client.v2.session.list` | GET | `/api/session` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5261] |
| `client.v2.session.create` | POST | `/api/session` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5303] |
| `client.v2.session.get` | GET | `/api/session/{sessionID}` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5346] |
| `client.v2.session.prompt` | POST | `/api/session/{sessionID}/prompt` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5365] |
| `client.v2.session.compact` | POST | `/api/session/{sessionID}/compact` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5406] |
| `client.v2.session.wait` | POST | `/api/session/{sessionID}/wait` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5425] |
| `client.v2.session.context` | GET | `/api/session/{sessionID}/context` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5444] |
| `client.v2.session.messages` | GET | `/api/session/{sessionID}/message` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5463] |
| `client.v2.model.list` | GET | `/api/model` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5509] |
| `client.v2.provider.list` | GET | `/api/provider` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5533] |
| `client.v2.provider.get` | GET | `/api/provider/{providerID}` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5555] |
| `client.v2.connector.connect.oauth.begin` | POST | `/api/connector/{connectorID}/connect/oauth` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5590][E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5808][E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5870] |
| `client.v2.connector.connect.oauth.cancel` | DELETE | `/api/connector/oauth/{attemptID}` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5640][E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5808][E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5870] |
| `client.v2.connector.connect.oauth.status` | GET | `/api/connector/oauth/{attemptID}` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5677][E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5808][E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5870] |
| `client.v2.connector.connect.oauth.complete` | POST | `/api/connector/oauth/{attemptID}/complete` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5714][E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5808][E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5870] |
| `client.v2.connector.connect.key` | POST | `/api/connector/{connectorID}/connect/key` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5760] |
| `client.v2.connector.list` | GET | `/api/connector` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5819] |
| `client.v2.connector.get` | GET | `/api/connector/{connectorID}` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5841] |
| `client.v2.permission.request.list` | GET | `/api/permission/request` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5881] |
| `client.v2.permission.saved.list` | GET | `/api/permission/saved` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5909] |
| `client.v2.permission.saved.remove` | DELETE | `/api/permission/saved/{id}` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5932] |
| `client.v2.fs.read` | GET | `/api/fs/read` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:5969] |
| `client.v2.fs.list` | GET | `/api/fs/list` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:6002] |
| `client.v2.fs.find` | GET | `/api/fs/find` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:6035] |
| `client.v2.command.list` | GET | `/api/command` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:6074] |
| `client.v2.skill.list` | GET | `/api/skill` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:6098] |
| `client.v2.event.subscribe` | GET SSE | `/api/event` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:6122] |
| `client.v2.question.request.list` | GET | `/api/question/request` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:6146] |
| `client.v2.reference.list` | GET | `/api/reference` | [E: packages/sdk/js/src/v2/gen/sdk.gen.ts:6181] |

## Sources

- packages/sdk/js/src/gen/sdk.gen.ts
- packages/sdk/js/src/v2/gen/sdk.gen.ts

## 相关

- [SDK overview](overview.md)
- [V1 route catalog](../server-api/v1-routes.md)
- [V2 route catalog](../server-api/v2-routes.md)
