---
id: clients.app
title: App UI shell(SolidJS)
kind: subsystem
tier: T2
v: na
source:
  - packages/app/package.json
  - packages/app/V1_API_MIGRATION.md
  - packages/app/vite.config.ts
  - packages/app/src/entry.tsx
  - packages/app/src/app.tsx
  - packages/app/src/context/platform.tsx
  - packages/app/src/context/server.tsx
  - packages/app/src/context/sdk.tsx
  - packages/app/src/context/server-sync.tsx
  - packages/app/src/context/global-sync/bootstrap.ts
  - packages/app/src/context/language.tsx
  - packages/app/src/i18n/desktop-native.ts
  - packages/app/src/utils/draft-store.ts
  - packages/app/src/utils/prompt.ts
  - packages/app/src/utils/persist.ts
  - packages/app/src/utils/session-export.ts
  - packages/app/src/utils/session-export.test.ts
  - packages/app/src/utils/session-title.ts
  - packages/app/src/pages/home.tsx
  - packages/app/src/pages/home/home-controller.ts
  - packages/app/src/pages/home/home-projects-controller.tsx
  - packages/app/src/pages/home/home-projects-view.tsx
  - packages/app/src/pages/home/home-session-search-controller.ts
  - packages/app/src/pages/home/home-sessions-controller.tsx
  - packages/app/src/pages/home/home-sessions-view.tsx
  - packages/app/src/pages/home/home-scroll-controller.ts
  - packages/app/src/pages/layout/helpers.ts
  - packages/app/src/pages/new-session.tsx
  - packages/app/src/pages/new-session/new-session-view.tsx
  - packages/app/src/pages/new-session/new-session-draft-controller.ts
  - packages/app/src/pages/new-session/new-session-workspace-controller.ts
  - packages/app/src/pages/session/use-session-commands.tsx
  - packages/app/src/pages/session/composer/prompt-model-selection.ts
  - packages/app/src/components/prompt-project-selector.tsx
  - packages/ui/src/context/i18n.tsx
  - packages/desktop/src/renderer/index.tsx
symbols:
  - "@opencode-ai/app"
  - AppInterface
  - AppBaseProviders
  - Platform
  - ServerConnection
  - LanguageProvider
  - NewHome
  - createHomeController
  - createDraftStore
  - createNewSessionDraftController
  - createNewSessionWorkspaceController
  - fetchSessionExport
  - sessionTitle
related:
  - clients.desktop
  - clients.ui
  - clients.app-compatibility
evidence: explicit
status: verified
updated: 3fd77ae980
---

> App UI shell 是 `@opencode-ai/app` SolidJS 前端包: 同一套 `AppInterface` 可以在浏览器直接连 HTTP server, 也可以在 Electron renderer 内通过 desktop `Platform` 连本地 sidecar。

## 能回答的问题

- `packages/app` 和 `packages/desktop` 的 UI 边界在哪里?
- Web browser entry 如何决定默认 opencode server URL?
- `Platform` 抽象有哪些 browser/desktop 差异?
- `AppInterface` 里有哪些 provider 和 routes?
- App shell 怎样通过 generated SDK 同步 server state?
- App locale 如何覆盖、如何判定 RTL、如何做复数?
- Session export JSON 从哪个命令下载，形状是什么?

## 职责边界

`@opencode-ai/app` 暴露 package root、`desktop-menu`、`i18n/desktop-native`、`updater`、`wsl/types`、`vite` plugin 和 CSS 入口 [E: packages/app/package.json:6] [E: packages/app/package.json:7] [E: packages/app/package.json:8] [E: packages/app/package.json:9] [E: packages/app/package.json:10] [E: packages/app/package.json:11] [E: packages/app/package.json:12] [E: packages/app/package.json:13]。这些 exports 支撑 Web 与 Desktop 复用 UI shell 的包装边界 [I]。它依赖 `@opencode-ai/sdk`, `@opencode-ai/ui`, `@opencode-ai/session-ui`, `@opencode-ai/core`, Solid Router 和 TanStack Solid Query [E: packages/app/package.json:57] [E: packages/app/package.json:58] [E: packages/app/package.json:60] [E: packages/app/package.json:61] [E: packages/app/package.json:62] [E: packages/app/package.json:78] [E: packages/app/package.json:79] [E: packages/app/package.json:80]。

V1/V2 关系: App shell 同时连接 legacy unprefixed API 与 current `/api/*` API。它会按 server 探测 protocol、选择兼容 API/event transport，并把 current session state 投影进现有 UI store；详细边界见 `clients.app-compatibility`。[E: packages/app/src/context/server-sync.tsx:227][E: packages/app/src/context/server-sync.tsx:228][E: packages/app/src/context/server-sync.tsx:538]

## 技术栈

- SolidJS + Vite: package scripts 用 `vite`, `vite.config.ts` 安装 `desktopPlugin` 与 Sentry plugin, dev server 默认 `0.0.0.0:3000` [E: packages/app/package.json:18] [E: packages/app/package.json:19] [E: packages/app/vite.config.ts:22] [E: packages/app/vite.config.ts:23] [E: packages/app/vite.config.ts:25] [E: packages/app/vite.config.ts:27]。
- Tailwind Vite plugin、Kobalte、Solid primitives、Solid Router、TanStack Solid Query 和 session UI 共同组成 UI runtime [E: packages/app/package.json:38] [E: packages/app/package.json:57] [E: packages/app/package.json:61] [E: packages/app/package.json:66] [E: packages/app/package.json:78] [E: packages/app/package.json:79] [E: packages/app/package.json:80]。
- 测试层是 Bun unit、browser-condition Bun tests 和 Playwright e2e, package scripts 明确把 unit/browser/e2e 分开 [E: packages/app/package.json:22] [E: packages/app/package.json:23] [E: packages/app/package.json:24] [E: packages/app/package.json:26]。

## 关键文件

| 文件 | 角色 |
| --- | --- |
| `packages/app/src/entry.tsx` | Browser entry。构造 `Platform` 为 `web`, 解析 `auth_token`, 创建 HTTP `ServerConnection`, 然后 render `AppInterface` [E: packages/app/src/entry.tsx:119] [E: packages/app/src/entry.tsx:154] [E: packages/app/src/entry.tsx:156] [E: packages/app/src/entry.tsx:168]。 |
| `packages/app/src/app.tsx` | 共享 shell。定义 `AppBaseProviders`, `ConnectionGate`, `AppInterface` 和 `Routes` [E: packages/app/src/app.tsx:393] [E: packages/app/src/app.tsx:430] [E: packages/app/src/app.tsx:557] [E: packages/app/src/app.tsx:615]。 |
| `packages/app/src/context/language.tsx` | App locale coverage。`LanguageProvider` 懒加载 app+ui 词典、写 `dir`/`lang`、提供 plural 与 RTL override [E: packages/app/src/context/language.tsx:20] [E: packages/app/src/context/language.tsx:166] [E: packages/app/src/context/language.tsx:197] [E: packages/app/src/context/language.tsx:210]。 |
| `packages/app/src/utils/session-export.ts` | Session JSON export。形状对齐 `opencode export` CLI 的 `{ info, messages: [{ info, parts }] }` [E: packages/app/src/utils/session-export.ts:4] [E: packages/app/src/utils/session-export.ts:19] [E: packages/app/src/utils/session-export.ts:50]。 |
| `packages/app/src/context/platform.tsx` | host capability contract。`Platform` discriminated union 分 `web` 与 `desktop`, desktop 分支要求 `openDirectoryPickerDialog` [E: packages/app/src/context/platform.tsx:126] [E: packages/app/src/context/platform.tsx:128] [E: packages/app/src/context/platform.tsx:130] [E: packages/app/src/context/platform.tsx:132]。 |
| `packages/app/src/context/server.tsx` | server list, keys, local/sidecar/ssh 分类, persisted server/project state;项目状态还保留 recently-closed history [E: packages/app/src/context/server.tsx:10] [E: packages/app/src/context/server.tsx:13] [E: packages/app/src/context/server.tsx:20] [E: packages/app/src/context/server.tsx:21] [E: packages/app/src/context/server.tsx:191] [E: packages/app/src/context/server.tsx:197] [E: packages/app/src/context/server.tsx:212] [E: packages/app/src/context/server.tsx:224] [E: packages/app/src/context/server.tsx:255] [E: packages/app/src/context/server.tsx:263]。 |
| `packages/app/src/context/server-sync.tsx` | server state sync root。创建 SDK cache、bootstrap query、global store、directory child stores、server session helper 和 home session index cache [E: packages/app/src/context/server-sync.tsx:215] [E: packages/app/src/context/server-sync.tsx:227] [E: packages/app/src/context/server-sync.tsx:266] [E: packages/app/src/context/server-sync.tsx:292] [E: packages/app/src/context/server-sync.tsx:320] [E: packages/app/src/context/server-sync.tsx:356]。 |
| `packages/app/src/context/global-sync/bootstrap.ts` | bootstrap queries。加载 config、providers、path、projects；provider/path 查询按 protocol 选择兼容路径，project 结果写入 global store [E: packages/app/src/context/global-sync/bootstrap.ts:143] [E: packages/app/src/context/global-sync/bootstrap.ts:154] [E: packages/app/src/context/global-sync/bootstrap.ts:152] [E: packages/app/src/context/global-sync/bootstrap.ts:158] [E: packages/app/src/context/global-sync/bootstrap.ts:160] [E: packages/app/src/context/global-sync/bootstrap.ts:163] [E: packages/app/src/context/global-sync/bootstrap.ts:164]。 |
| `packages/app/src/pages/home.tsx` + `pages/home/*` | 新 layout Home composition root。它组合 home/project/session/search/scroll controllers，再把 accessors 与 callbacks 交给 project/session views [E: packages/app/src/pages/home.tsx:11] [E: packages/app/src/pages/home.tsx:16] [E: packages/app/src/pages/home.tsx:38] [E: packages/app/src/pages/home.tsx:39]。 |
| `packages/app/src/utils/draft-store.ts` | prompt draft document/blob persistence adapter。Web driver 用 IndexedDB，统一 encode/decode legacy data URL 与 content-addressed BlobReference。[E: packages/app/src/utils/draft-store.ts:3][E: packages/app/src/utils/draft-store.ts:36][E: packages/app/src/utils/draft-store.ts:97] |
| `packages/app/src/pages/new-session.tsx` + `pages/new-session/*` | draft-only V2 new-session composition：workspace、project、prompt/model controller 与 view 拆分。[E: packages/app/src/pages/new-session.tsx:11][E: packages/app/src/pages/new-session.tsx:14][E: packages/app/src/pages/new-session.tsx:15][E: packages/app/src/pages/new-session.tsx:19][E: packages/app/src/pages/new-session.tsx:45] |

## Home controller/view seams

`NewHome` 已从单体页面拆成多个窄 controller：root controller 解析 focused server/project selection 与 new-session target；projects controller 承担 server/project management；sessions controller 读取 home session index、分组/open/archive；search 与 scroll controller 分别隔离查询交互和 sticky-header/viewport 状态。[E: packages/app/src/pages/home/home-controller.ts:9] [E: packages/app/src/pages/home/home-controller.ts:45] [E: packages/app/src/pages/home/home-projects-controller.tsx:18] [E: packages/app/src/pages/home/home-sessions-controller.tsx:61] [E: packages/app/src/pages/home/home-session-search-controller.ts:13] [E: packages/app/src/pages/home/home-scroll-controller.ts:9]

这不是纯 MVC：views 仍持有 DnD、local UI state、platform helpers 与 session status controller。[E: packages/app/src/pages/home/home-projects-view.tsx:3] [E: packages/app/src/pages/home/home-projects-view.tsx:17] [E: packages/app/src/pages/home/home-projects-view.tsx:63] [E: packages/app/src/pages/home/home-sessions-view.tsx:150] 路由只在 `newLayoutDesigns` 为 false 时挂 `LegacyHome`，为 true 时挂 `NewHome`。[E: packages/app/src/app.tsx:625] [E: packages/app/src/app.tsx:628] [E: packages/app/src/app.tsx:638] [E: packages/app/src/app.tsx:639]

New Home 也不是“只走 current API”：home session index 用 SDK `v2.session.list`，但 archive 目前只允许 protocol V1 并调用 legacy session update。[E: packages/app/src/pages/home/home-sessions-controller.tsx:61] [E: packages/app/src/pages/home/home-sessions-controller.tsx:70] [E: packages/app/src/pages/home/home-sessions-controller.tsx:208] [E: packages/app/src/pages/home/home-sessions-controller.tsx:212] [E: packages/app/src/pages/home/home-sessions-controller.tsx:217]

Home 左侧是 project picker：`HomeProjectsView` 列出 focused server 的 open projects，点击选中/取消选中，empty 态可从 recently-closed 再注册。[E: packages/app/src/pages/home/home-projects-view.tsx:30] [E: packages/app/src/pages/home/home-projects-view.tsx:105] [E: packages/app/src/pages/home/home-projects-view.tsx:437] [E: packages/app/src/pages/home/home-controller.ts:77] Add 走 directory picker（`multiple: true`），`home.project.add` 对每个新目录先 `file.list`，空目录则 `project.initGit`，再 `project.current` 写入 child store 并 `projects.open`。[E: packages/app/src/pages/home/home-projects-controller.tsx:89] [E: packages/app/src/pages/home/home-projects-controller.tsx:95] [E: packages/app/src/pages/home/home-controller.ts:89] [E: packages/app/src/pages/home/home-controller.ts:96] [E: packages/app/src/pages/home/home-controller.ts:99] [E: packages/app/src/pages/home/home-controller.ts:105] 右键或 dots menu 提供 new session / edit / reveal / clear notifications / close。[E: packages/app/src/pages/home/home-projects-view.tsx:478] [E: packages/app/src/pages/home/home-projects-view.tsx:548] [E: packages/app/src/pages/home/home-projects-view.tsx:551] [E: packages/app/src/pages/home/home-projects-view.tsx:569]

Home session 列表按 persisted `time.updated ?? time.created`（再比 id）排序，不是按 session id 或 list 返回顺序。[E: packages/app/src/pages/layout/helpers.ts:12] [E: packages/app/src/pages/home/home-sessions-controller.tsx:257] 标题经过 `sessionTitle()`：匹配 `New session|Child session - <ISO timestamp>` 时只保留前缀，否则原样显示；缺 title 时 UI 回退 session id。[E: packages/app/src/utils/session-title.ts:1] [E: packages/app/src/utils/session-title.ts:15] [E: packages/app/src/pages/home/home-sessions-view.tsx:347]

## New Session controller seams

`NewSessionPage` 现在是 composition root：workspace controller 决定 worktree/branch，draft controller 组装 prompt、model、project controls 与 V2 prompt input，`NewSessionView` 的公开 props 只消费三个 controller。view 内部的 `ProviderTip` 等子组件仍直接读取 language/dialog/SDK/server-sync/provider contexts，因此这不是整个 view tree 的无 context 边界。提交仍负责把 draft promote 为真实 session；页面会等 prompt persistence ready 后恢复 focus。[E: packages/app/src/pages/new-session.tsx:11][E: packages/app/src/pages/new-session.tsx:14][E: packages/app/src/pages/new-session.tsx:15][E: packages/app/src/pages/new-session.tsx:19][E: packages/app/src/pages/new-session.tsx:30][E: packages/app/src/pages/new-session.tsx:35][E: packages/app/src/pages/new-session.tsx:45][E: packages/app/src/pages/new-session/new-session-view.tsx:29][E: packages/app/src/pages/new-session/new-session-view.tsx:44][E: packages/app/src/pages/new-session/new-session-view.tsx:95][E: packages/app/src/pages/new-session/new-session-view.tsx:110]

workspace selector 只在非 production channel 且当前 project 是 Git 时可见。disabled 必然返回字面 sentinel `main`；selector 可见但没有显式选择时，若当前 directory 已偏离 project root，则 default 返回当前 directory，否则返回 `main`。显式选择 `main` 会 normalize 为 project root（当它与当前 directory 不同）。submit 遇到 `main` sentinel 时不改当前 `sdk().directory`，其他实际 worktree path 才替换 session directory；branch 再从 local 或选中 worktree state 解析。[E: packages/app/src/pages/new-session/new-session-workspace-controller.ts:6][E: packages/app/src/pages/new-session/new-session-workspace-controller.ts:8][E: packages/app/src/pages/new-session/new-session-workspace-controller.ts:14][E: packages/app/src/pages/new-session/new-session-workspace-controller.ts:22][E: packages/app/src/pages/new-session/new-session-workspace-controller.ts:25][E: packages/app/src/pages/new-session/new-session-workspace-controller.ts:31][E: packages/app/src/pages/new-session/new-session-workspace-controller.ts:39][E: packages/app/src/pages/new-session/new-session-workspace-controller.ts:44][E: packages/app/src/pages/new-session/new-session-workspace-controller.ts:45][E: packages/app/src/pages/new-session/new-session-workspace-controller.ts:62][E: packages/app/src/pages/new-session/new-session-workspace-controller.ts:63][E: packages/app/src/components/prompt-input/submit.ts:353][E: packages/app/src/components/prompt-input/submit.ts:359][E: packages/app/src/components/prompt-input/submit.ts:386][E: packages/app/src/components/prompt-input/submit.ts:387]

draft controller 从 search param 消费一次性 `prompt`，并把 composer controls、model selection、comments clear 与 new-session worktree 接进 session-ui V2 controller；这是一条 UI controller seam，不代表后端另有一套 SessionV2 create protocol。[E: packages/app/src/pages/new-session/new-session-draft-controller.ts:13][E: packages/app/src/pages/new-session/new-session-draft-controller.ts:19][E: packages/app/src/pages/new-session/new-session-draft-controller.ts:20][E: packages/app/src/pages/new-session/new-session-draft-controller.ts:24][E: packages/app/src/pages/new-session/new-session-draft-controller.ts:31][E: packages/app/src/pages/new-session/new-session-draft-controller.ts:35][E: packages/app/src/pages/new-session/new-session-draft-controller.ts:39][E: packages/app/src/pages/new-session/new-session-draft-controller.ts:42][E: packages/app/src/pages/new-session/new-session-draft-controller.ts:48] `NewSessionView` 还挂 `PromptProjectSelector`，可从 Home/new-session 切换或 add 项目。[E: packages/app/src/pages/new-session/new-session-view.tsx:50] [E: packages/app/src/components/prompt-project-selector.tsx:195] [E: packages/app/src/components/prompt-project-selector.tsx:225]

当前默认模型由 `createPromptModelSelection()` 解析：先看 prompt 已选模型，再看当前 agent 绑定模型，再看 `providers.defaultModel()` 与 legacy `config.model`，然后 recent，最后 connected provider 的 catalog default。[E: packages/app/src/pages/session/composer/prompt-model-selection.ts:24] [E: packages/app/src/pages/session/composer/prompt-model-selection.ts:25] [E: packages/app/src/pages/session/composer/prompt-model-selection.ts:39] 这里的 “V2” 是 session-ui PromptInputV2 / current model catalog，不是 SessionV2 kernel。[I]

## 数据模型

`Platform` 是 host capability carrier。基础能力包括 `openExternal`, `restart`, notification, optional storage/fetch/default-server, 以及 desktop-only open/reveal path、attachment picker、save picker、updater、WSL、display backend、markdown parser、zoom/menu/clipboard/logging/force-focus 能力 [E: packages/app/src/context/platform.tsx:31] [E: packages/app/src/context/platform.tsx:36] [E: packages/app/src/context/platform.tsx:39] [E: packages/app/src/context/platform.tsx:45] [E: packages/app/src/context/platform.tsx:48] [E: packages/app/src/context/platform.tsx:51] [E: packages/app/src/context/platform.tsx:54] [E: packages/app/src/context/platform.tsx:63] [E: packages/app/src/context/platform.tsx:66] [E: packages/app/src/context/platform.tsx:78] [E: packages/app/src/context/platform.tsx:81] [E: packages/app/src/context/platform.tsx:87] [E: packages/app/src/context/platform.tsx:90] [E: packages/app/src/context/platform.tsx:96] [E: packages/app/src/context/platform.tsx:108] [E: packages/app/src/context/platform.tsx:114] [E: packages/app/src/context/platform.tsx:117] [E: packages/app/src/context/platform.tsx:120] [E: packages/app/src/context/platform.tsx:123]。

`ServerConnection` 是 UI 连接 server 的 union。`Http` 用 URL 和 optional auth, `Sidecar` 表示 Desktop server 或 WSL server, `Ssh` 表示 desktop 通过 SSH 暴露的 HTTP proxy [E: packages/app/src/context/server.tsx:184] [E: packages/app/src/context/server.tsx:191] [E: packages/app/src/context/server.tsx:197] [E: packages/app/src/context/server.tsx:212]。`ServerConnection.key` 把 HTTP URL、sidecar、WSL distro、SSH host 统一成 stable key [E: packages/app/src/context/server.tsx:224]。

`GlobalStore` 镜像 server 全局数据: readiness/error、path、project list、normalized provider list、provider auth、config 和 reload 状态 [E: packages/app/src/context/server-sync.tsx:63] [E: packages/app/src/context/server-sync.tsx:64] [E: packages/app/src/context/server-sync.tsx:65] [E: packages/app/src/context/server-sync.tsx:66] [E: packages/app/src/context/server-sync.tsx:67] [E: packages/app/src/context/server-sync.tsx:68] [E: packages/app/src/context/server-sync.tsx:69] [E: packages/app/src/context/server-sync.tsx:70] [E: packages/app/src/context/server-sync.tsx:71]。

`Platform` 新增 optional `draftStore`，把 prompt drafts/history 和关联 blobs 作为 host capability。`Persist.prompt()` 给 target 加 draft marker，`persisted()` 只在 marker + platform store 同时存在时改走 async draft storage，并保留从旧 local/desktop storage 迁移的 fallback。[E: packages/app/src/context/platform.tsx:66][E: packages/app/src/context/platform.tsx:69][E: packages/app/src/utils/persist.ts:525][E: packages/app/src/utils/persist.ts:526][E: packages/app/src/utils/persist.ts:579][E: packages/app/src/utils/persist.ts:580][E: packages/app/src/utils/persist.ts:583][E: packages/app/src/utils/persist.ts:635][E: packages/app/src/utils/persist.ts:637][E: packages/app/src/utils/persist.ts:644]

`BlobReference` 是 `{ id, url }`。新 attachment 用 SHA-256 content hash 作 id、object URL 作 renderer handle；draft store 写入时把 legacy image data URLs / data-URL blob ids 搬进 blob table，只在 JSON document 中保存 id，读出时重建 object URL。仍有 runtime legacy 例外：从历史 data-URL file part 恢复时会临时构造 `{ id: dataUrl, url: dataUrl }`；且没有 platform `draftStore` 时 persistence 会回退普通 storage，不能把“JSON 只留 id”当全局不变量。Web entry 默认安装 IndexedDB `opencode-drafts` 的 documents/blobs 两个 stores，并在数据库打开时清理无 document 引用的 blobs。[E: packages/app/src/utils/draft-store.ts:3][E: packages/app/src/utils/draft-store.ts:24][E: packages/app/src/utils/draft-store.ts:33][E: packages/app/src/utils/draft-store.ts:42][E: packages/app/src/utils/draft-store.ts:46][E: packages/app/src/utils/draft-store.ts:57][E: packages/app/src/utils/draft-store.ts:63][E: packages/app/src/utils/draft-store.ts:71][E: packages/app/src/utils/draft-store.ts:97][E: packages/app/src/utils/draft-store.ts:118][E: packages/app/src/utils/draft-store.ts:169][E: packages/app/src/utils/draft-store.ts:170][E: packages/app/src/utils/prompt.ts:105][E: packages/app/src/utils/prompt.ts:111][E: packages/app/src/utils/persist.ts:579][E: packages/app/src/utils/persist.ts:593][E: packages/app/src/entry.tsx:119][E: packages/app/src/entry.tsx:121]

project persistence 把用户主动 close 的 worktree 去重后记入 `recentlyClosed`,history 最多 16 条,UI display limit 是 5;再次 open 会从 recently-closed 中移除它。[E: packages/app/src/context/server.tsx:20] [E: packages/app/src/context/server.tsx:21] [E: packages/app/src/context/server.tsx:86] [E: packages/app/src/context/server.tsx:98] [E: packages/app/src/context/server.tsx:102] [E: packages/app/src/context/server.tsx:106] [E: packages/app/src/context/server.tsx:114] [E: packages/app/src/context/server.tsx:117] [E: packages/app/src/context/server.tsx:119] [E: packages/app/src/context/server.tsx:121]

## Locale / i18n / RTL

`Locale` 就是 `DesktopNativeLocale`：一份共享 locale id 表同时服务 App 词典、UI 词典和 Desktop native menu copy，不要按 `packages/app/src/i18n/*.ts` 逐文件编目。[E: packages/app/src/context/language.tsx:20] [E: packages/app/src/i18n/desktop-native.ts:1] [E: packages/app/src/i18n/desktop-native.ts:66] English 是 eager flatten 的 base；其它 locale 由 `loaders` 并行 `import()` app dict 与 `@opencode-ai/ui/i18n/<locale>`，再 flatten 覆盖 base。[E: packages/app/src/context/language.tsx:46] [E: packages/app/src/context/language.tsx:49] [E: packages/app/src/context/language.tsx:52] 检测走 `detectDesktopNativeLocale(navigator.languages)`：先规范化 `no/nb/nn` 到 `no`，再按 language+script 匹配 BCP 47 tag。[E: packages/app/src/context/language.tsx:131] [E: packages/app/src/i18n/desktop-native.ts:198] [E: packages/app/src/i18n/desktop-native.ts:202]

RTL 原语是 locale set `{ar, ur, pa, fa, dv}` 与 `document.documentElement.dir`；`setDirection()` 只在用户覆盖与 locale 默认不同时记下 override，`layoutLocale` 把 Kobalte 菜单方向钉到 `ar` 或 `en`，因为 Kobalte 从 locale 推导方向而不是接受 direction override。[E: packages/app/src/context/language.tsx:23] [E: packages/app/src/context/language.tsx:25] [E: packages/app/src/context/language.tsx:181] [E: packages/app/src/context/language.tsx:185] [E: packages/app/src/context/language.tsx:210] [E: packages/app/src/context/language.tsx:237] Plural 走 `@opencode-ai/ui` 的 `pluralCategory(intl, count)`（`Intl.PluralRules`，最多缓存 32 个 locale），key 形态是 `${key}.${category}`，缺省回退 `${key}.other`。[E: packages/ui/src/context/i18n.tsx:28] [E: packages/ui/src/context/i18n.tsx:32] [E: packages/app/src/context/language.tsx:197] [E: packages/app/src/context/language.tsx:200] Desktop renderer 另把 `createDesktopNativeBundle()` 经 `onNativeTranslations` 送进 main process；见 `clients.desktop`。[E: packages/app/src/context/language.tsx:215] [E: packages/desktop/src/renderer/index.tsx:431]

## Session export

用户可见 export 命令调用 `fetchSessionExport({ sessionID, client })`：并行 `session.get` + `session.messages`，下载 `{ info, messages: [{ info, parts }] }` JSON，文件名来自 title / slug / id 的 slugify。[E: packages/app/src/utils/session-export.ts:4] [E: packages/app/src/utils/session-export.ts:19] [E: packages/app/src/utils/session-export.ts:41] [E: packages/app/src/utils/session-export.ts:50] Session command palette、timeline 菜单和 session context tab 共用这条 helper。[E: packages/app/src/pages/session/use-session-commands.tsx:236] [E: packages/app/src/pages/session/use-session-commands.tsx:240] 这是 legacy SDK `session.messages` 形状，不是 SessionV2 aggregate dump。[I]

## 控制流

1. Browser entry 用 `getCurrentUrl()` 选择 server。`opencode.ai` hostname 默认连 `http://localhost:4096`, dev 模式读 `VITE_OPENCODE_SERVER_HOST/PORT`, production fallback 用 `location.origin` [E: packages/app/src/entry.tsx:99] [E: packages/app/src/entry.tsx:100] [E: packages/app/src/entry.tsx:101] [E: packages/app/src/entry.tsx:102] [E: packages/app/src/entry.tsx:103]。
2. Browser entry 构造 `Platform` 为 `web`, 使用 browser notification、受协议白名单保护的 `window.open` 和 localStorage-backed default server [E: packages/app/src/entry.tsx:58] [E: packages/app/src/entry.tsx:83] [E: packages/app/src/entry.tsx:84] [E: packages/app/src/entry.tsx:86] [E: packages/app/src/entry.tsx:87] [E: packages/app/src/entry.tsx:119] [E: packages/app/src/entry.tsx:126] [E: packages/app/src/entry.tsx:130]。
3. Browser entry 创建 canonical local HTTP server connection, 把它作为 `servers` 传入 `AppInterface`, 并禁用 startup health check [E: packages/app/src/entry.tsx:156] [E: packages/app/src/entry.tsx:168] [E: packages/app/src/entry.tsx:169] [E: packages/app/src/entry.tsx:170] [E: packages/app/src/entry.tsx:171] [E: packages/app/src/entry.tsx:172]。
4. `AppBaseProviders` 安装 Meta、Font、Theme、Language（可注入 `locale` 与 `onNativeTranslations`）、UI i18n bridge、ErrorBoundary、QueryClient、WSL、Dialog、File providers [E: packages/app/src/app.tsx:393] [E: packages/app/src/app.tsx:400] [E: packages/app/src/app.tsx:402] [E: packages/app/src/app.tsx:407] [E: packages/app/src/app.tsx:408] [E: packages/app/src/app.tsx:409] [E: packages/app/src/app.tsx:415] [E: packages/app/src/app.tsx:416] [E: packages/app/src/app.tsx:417] [E: packages/app/src/app.tsx:418]。
5. `AppInterface` 安装 `ServerProvider`, `GlobalProvider`, `SettingsProvider`, `ConnectionGate`, Router, Tabs, Permission/Notification 和 shared shell providers。`Routes` 挂 legacy/new-layout session routes、legacy redirect 与 `/new-session`;target server route 保持 server identity subtree,用 session error boundary/lineage 处理 session 切换。[E: packages/app/src/app.tsx:557] [E: packages/app/src/app.tsx:580] [E: packages/app/src/app.tsx:585] [E: packages/app/src/app.tsx:586] [E: packages/app/src/app.tsx:587] [E: packages/app/src/app.tsx:592] [E: packages/app/src/app.tsx:593] [E: packages/app/src/app.tsx:594] [E: packages/app/src/app.tsx:615] [E: packages/app/src/app.tsx:628] [E: packages/app/src/app.tsx:629] [E: packages/app/src/app.tsx:633] [E: packages/app/src/app.tsx:635] [E: packages/app/src/app.tsx:639] [E: packages/app/src/app.tsx:640] [E: packages/app/src/app.tsx:641] [E: packages/app/src/app.tsx:643] [E: packages/app/src/app.tsx:110] [E: packages/app/src/app.tsx:122] [E: packages/app/src/app.tsx:140] [E: packages/app/src/app.tsx:151]。
6. `ConnectionGate` 在未禁用时循环调用 `checkServerHealth(http)`,blocking 模式最多 10 秒,之后用 error UI 或后台 retry。health check 通过后,它还可等待 optional `startup` promise;失败只记录并放行。[E: packages/app/src/app.tsx:430] [E: packages/app/src/app.tsx:438] [E: packages/app/src/app.tsx:446] [E: packages/app/src/app.tsx:448] [E: packages/app/src/app.tsx:451] [E: packages/app/src/app.tsx:459] [E: packages/app/src/app.tsx:460] [E: packages/app/src/app.tsx:461] [E: packages/app/src/app.tsx:464] [E: packages/app/src/app.tsx:467]。
7. `ServerSyncProvider` 通过 `bootstrapGlobal` 读取 global config、providers、path 和 projects,directory 级数据再由 `SDKProvider` 用当前 directory 创建 context。server event 同时维护 home session index,而非 active directory 的 refresh/LSP/reference work会被抑制。[E: packages/app/src/context/server-sync.tsx:320] [E: packages/app/src/context/global-sync/bootstrap.ts:154] [E: packages/app/src/context/global-sync/bootstrap.ts:158] [E: packages/app/src/context/global-sync/bootstrap.ts:160] [E: packages/app/src/context/global-sync/bootstrap.ts:163] [E: packages/app/src/context/sdk.tsx:7] [E: packages/app/src/context/sdk.tsx:14] [E: packages/app/src/context/server-sync.tsx:539] [E: packages/app/src/context/server-sync.tsx:540] [E: packages/app/src/context/server-sync.tsx:541] [E: packages/app/src/context/server-sync.tsx:544] [E: packages/app/src/context/server-sync.tsx:568] [E: packages/app/src/context/server-sync.tsx:605] [E: packages/app/src/context/server-sync.tsx:606] [E: packages/app/src/context/server-sync.tsx:613] [E: packages/app/src/context/server-sync.tsx:617]。

## 设计动机与权衡

`Platform` 把 host-specific 能力全部推到边界, 使 `AppInterface` 可以在 browser 和 Electron 内共享同一套路由、providers 和 server sync 代码 [E: packages/app/src/context/platform.tsx:126] [E: packages/app/src/app.tsx:557]。Server connection 使用 union 而不是单纯 URL; 这个形状能表达 HTTP、sidecar、WSL 和 SSH proxy 这类连接形态 [E: packages/app/src/context/server.tsx:191] [E: packages/app/src/context/server.tsx:197] [E: packages/app/src/context/server.tsx:204] [E: packages/app/src/context/server.tsx:212] [I]。

## Gotcha

- Browser entry 的 default server 不等于 Desktop sidecar。Desktop renderer 自己创建 `Platform` 并传 `DesktopMemoryRouter`,还用 `startup/serverScoped` 接入首次启动 onboarding;browser entry 使用普通 Router 和 HTTP connection。[E: packages/app/src/entry.tsx:156] [E: packages/app/src/entry.tsx:168] [E: packages/desktop/src/renderer/index.tsx:113] [E: packages/desktop/src/renderer/index.tsx:353] [E: packages/desktop/src/renderer/index.tsx:356] [E: packages/desktop/src/renderer/index.tsx:407] [E: packages/desktop/src/renderer/index.tsx:410] [E: packages/desktop/src/renderer/index.tsx:411] [E: packages/desktop/src/renderer/index.tsx:412] [E: packages/desktop/src/renderer/index.tsx:413]
- `@opencode-ai/sdk/v2` 在 App migration 术语中仍承载 legacy unprefixed API；不能根据 package 名把它误判为 current server API。[E: packages/app/V1_API_MIGRATION.md:3]
- controller/view extraction 没有一条 split-specific wiring/equivalence test；这里记录源码 ownership seam，不把重构本身外推成“行为完全等价”。[I]
- platform draft store 的 canonical persisted prompt JSON 只保留 blob id；`url` 是 renderer 内用于 retrieval/serialization 的 handle，submit path 会读取它并转成 App 当前选择的 data-URL wire form。legacy restored reference 可直接把 data URL 同时放入 id/url；没有 draft store 时也会走普通 storage fallback。[E: packages/app/src/utils/draft-store.ts:57][E: packages/app/src/utils/draft-store.ts:71][E: packages/app/src/utils/draft-store.ts:157][E: packages/app/src/utils/draft-store.ts:163][E: packages/app/src/utils/draft-store.ts:169][E: packages/app/src/utils/persist.ts:579][E: packages/app/src/utils/persist.ts:593]

## Sources

- `packages/app/package.json`
- `packages/app/V1_API_MIGRATION.md`
- `packages/app/vite.config.ts`
- `packages/app/src/entry.tsx`
- `packages/app/src/app.tsx`
- `packages/app/src/context/platform.tsx`
- `packages/app/src/context/server.tsx`
- `packages/app/src/context/sdk.tsx`
- `packages/app/src/context/server-sync.tsx`
- `packages/app/src/context/global-sync/bootstrap.ts`
- `packages/app/src/context/language.tsx`
- `packages/app/src/i18n/desktop-native.ts`
- `packages/app/src/utils/draft-store.ts`
- `packages/app/src/utils/prompt.ts`
- `packages/app/src/utils/persist.ts`
- `packages/app/src/utils/session-export.ts`
- `packages/app/src/utils/session-export.test.ts`
- `packages/app/src/utils/session-title.ts`
- `packages/app/src/pages/home.tsx`
- `packages/app/src/pages/home/home-controller.ts`
- `packages/app/src/pages/home/home-projects-controller.tsx`
- `packages/app/src/pages/home/home-projects-view.tsx`
- `packages/app/src/pages/home/home-session-search-controller.ts`
- `packages/app/src/pages/home/home-sessions-controller.tsx`
- `packages/app/src/pages/home/home-sessions-view.tsx`
- `packages/app/src/pages/home/home-scroll-controller.ts`
- `packages/app/src/pages/layout/helpers.ts`
- `packages/app/src/pages/new-session.tsx`
- `packages/app/src/pages/new-session/new-session-view.tsx`
- `packages/app/src/pages/new-session/new-session-draft-controller.ts`
- `packages/app/src/pages/new-session/new-session-workspace-controller.ts`
- `packages/app/src/pages/session/use-session-commands.tsx`
- `packages/app/src/pages/session/composer/prompt-model-selection.ts`
- `packages/app/src/components/prompt-project-selector.tsx`
- `packages/ui/src/context/i18n.tsx`
- `packages/desktop/src/renderer/index.tsx`

## 相关

- [Desktop 应用(Electron)](desktop.md)
- [共享 UI 组件库(SolidJS)](ui.md)
- [App Legacy/Current Server 兼容层](app-compatibility.md)
