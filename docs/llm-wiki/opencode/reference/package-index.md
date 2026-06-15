---
id: ref.package-index
title: Package Index
kind: reference
tier: T3
v: shared
source:
  - package.json
  - packages/
symbols:
  - workspaces.packages
related:
  - spine.overview
evidence: explicit
status: verified
updated: 92c70c9c3
---

> opencode monorepo 是 Bun workspace；当前 HEAD 的 workspace globs 展开为 29 个 package，而不是固定 27 个 package。

## 能回答的问题

- monorepo 中每个 package 大致负责什么？
- 哪些 package 属于 V1 当前活跑路径，哪些属于 V2 新内核，哪些是 UI/console/stats/supporting package？
- 为什么 `packages/cli` 和 `packages/opencode` 可以同时存在？

## V1

V1 当前活跑 CLI/package 是 `packages/opencode`，它的 package 名是 `opencode`，bin 也叫 `opencode` [E: packages/opencode/package.json:4] [E: packages/opencode/package.json:18]。这个 package 仍依赖 Vercel AI SDK family、`@opencode-ai/llm`、`@opencode-ai/server`、`@opencode-ai/tui`、OpenTUI、yargs 等依赖 [E: packages/opencode/package.json:54]，因此它是当前主 CLI、server glue、AI SDK runtime 和迁移 seam 的集中包 [I]。

## V2

V2 新内核 package 是 `packages/core`，package 名为 `@opencode-ai/core`，bin 也可导出 `opencode` [E: packages/core/package.json:4] [E: packages/core/package.json:15]。`packages/core` 依赖 `@opencode-ai/llm`、Effect platform、SQLite/Drizzle、provider SDKs 和 filesystem/runtime utilities [E: packages/core/package.json:62]，对应 `@opencode/v2` 的 durable session、事件溯源、location-scoped runner 和 embedded public API 主线 [I]。

`packages/cli` 是独立的新 CLI host，bin 名是 `lildax`，依赖 `@opencode-ai/core`、`@opencode-ai/server`、`@opencode-ai/tui` 和 `@opencode-ai/sdk` [E: packages/cli/package.json:3] [E: packages/cli/package.json:18]。这说明 `packages/cli` 不是 `packages/opencode/src/cli` 的同名替换文件夹，而是和旧 yargs CLI 并存的新 host [I]。

## Workspace 入口

根 package 名为 `opencode`，描述为 “AI-powered development tool”，并使用 `bun@1.3.14` 作为 package manager [E: package.json:3] [E: package.json:7]。根 scripts 明确禁止从 root 跑测试：`test` 脚本输出 “do not run tests from root” 并 exit 1 [E: package.json:22]。workspace globs 是 `packages/*`、`packages/console/*`、`packages/stats/*`、`packages/sdk/js`、`packages/slack` [E: package.json:24] [E: package.json:26] [E: package.json:27] [E: package.json:28] [E: package.json:29] [E: package.json:30]。

## Packages

| Package path | Package name | V1/V2 role | 一句话职责 |
| --- | --- | --- | --- |
| `packages/app` | `@opencode-ai/app` [E: packages/app/package.json:2] | shared UI | Solid web app package，导出 app entry、desktop menu、updater、WSL types、Vite config 和 CSS [E: packages/app/package.json:6]。 |
| `packages/cli` | `@opencode-ai/cli` [E: packages/cli/package.json:3] | V2 host | 新 CLI host，提供 `lildax` bin，并依赖 core/server/tui/sdk 组合运行 [E: packages/cli/package.json:7] [E: packages/cli/package.json:18]。 |
| `packages/console/app` | `@opencode-ai/console-app` [E: packages/console/app/package.json:2] | shared console | Console web app，依赖 console core/resource/mail、OpenAuth、Stripe、Solid Start 和 Cloudflare/Vite stack [E: packages/console/app/package.json:13]。 |
| `packages/console/core` | `@opencode-ai/console-core` [E: packages/console/core/package.json:3] | shared console | Console backend/domain core，提供 DB、limits、model promotion 等 scripts，并导出 `src` modules [E: packages/console/core/package.json:25] [E: packages/console/core/package.json:21]。 |
| `packages/console/function` | `@opencode-ai/console-function` [E: packages/console/function/package.json:2] | shared console | Cloud/function package，依赖 AI SDK providers、console core/resource 和 OpenAuth [E: packages/console/function/package.json:19]。 |
| `packages/console/mail` | `@opencode-ai/console-mail` [E: packages/console/mail/package.json:2] | shared console | Email template package，导出 `emails/templates/*` 并依赖 JSX email/React/Solid [E: packages/console/mail/package.json:12] [E: packages/console/mail/package.json:4]。 |
| `packages/console/resource` | `@opencode-ai/console-resource` [E: packages/console/resource/package.json:3] | shared console | Console resource abstraction，exports 根据 production/import 条件选择 Cloudflare 或 Node resource entry [E: packages/console/resource/package.json:8]。 |
| `packages/console/support` | `@opencode-ai/console-support` [E: packages/console/support/package.json:2] | shared console | Console support app，依赖 console-core、Solid Start、Nitro 和 Cloudflare Vite plugin [E: packages/console/support/package.json:10]。 |
| `packages/core` | `@opencode-ai/core` [E: packages/core/package.json:4] | V2 core | Effect-native V2 core package，导出 public/session/system-context/internal modules 并提供 `opencode` bin [E: packages/core/package.json:18] [E: packages/core/package.json:15]。 |
| `packages/desktop` | `@opencode-ai/desktop` [E: packages/desktop/package.json:2] | shared desktop | Electron desktop shell，main entry 为 `./out/main/index.js`，依赖 `@opencode-ai/app` 和 Electron builder/tooling [E: packages/desktop/package.json:25] [E: packages/desktop/package.json:36]。 |
| `packages/effect-drizzle-sqlite` | `@opencode-ai/effect-drizzle-sqlite` [E: packages/effect-drizzle-sqlite/package.json:4] | V2 support | Effect/Drizzle SQLite adapter，导出 effect-sqlite、migrator 和 sqlite-core/effect APIs [E: packages/effect-drizzle-sqlite/package.json:12]。 |
| `packages/effect-sqlite-node` | `@opencode-ai/effect-sqlite-node` [E: packages/effect-sqlite-node/package.json:4] | V2 support | Node SQLite Effect adapter，导出 `src/index.ts` 给 core 使用 [E: packages/effect-sqlite-node/package.json:11]。 |
| `packages/enterprise` | `@opencode-ai/enterprise` [E: packages/enterprise/package.json:2] | shared enterprise | Enterprise web/backend package，依赖 core、ui、Solid Start、Hono、AWS signing 和 Nitro [E: packages/enterprise/package.json:15]。 |
| `packages/function` | `@opencode-ai/function` [E: packages/function/package.json:2] | shared cloud | Cloud function helper package，依赖 Octokit、Hono 和 Jose [E: packages/function/package.json:14]。 |
| `packages/http-recorder` | `@opencode-ai/http-recorder` [E: packages/http-recorder/package.json:4] | shared test infra | Effect HTTP client record/replay package，description 明确用于 deterministic cassettes [E: packages/http-recorder/package.json:5]。 |
| `packages/llm` | `@opencode-ai/llm` [E: packages/llm/package.json:4] | shared LLM engine | Native provider/protocol engine，导出 provider、providers、protocols 和 route modules [E: packages/llm/package.json:13]。 |
| `packages/opencode` | `opencode` [E: packages/opencode/package.json:4] | V1 active | 当前活跑 opencode package，导出 `src/*.ts`，bin 为 `opencode`，同时依赖 AI SDK providers、native `@opencode-ai/llm` seam 和 TUI/server/sdk [E: packages/opencode/package.json:21] [E: packages/opencode/package.json:54]。 |
| `packages/plugin` | `@opencode-ai/plugin` [E: packages/plugin/package.json:3] | shared plugin API | Plugin API package，导出 root、tool 和 TUI types/APIs [E: packages/plugin/package.json:11]。 |
| `packages/script` | `@opencode-ai/script` [E: packages/script/package.json:3] | shared tooling | Shared script helper package，导出 `src/index.ts` 并依赖 semver [E: packages/script/package.json:12] [E: packages/script/package.json:5]。 |
| `packages/sdk/js` | `@opencode-ai/sdk` [E: packages/sdk/js/package.json:3] | shared SDK | JS SDK package，导出 v1/v2 client/server/generated client surfaces [E: packages/sdk/js/package.json:11]。 |
| `packages/server` | `@opencode-ai/server` [E: packages/server/package.json:3] | V2 server | Server package，依赖 core、Effect 和 Drizzle，并导出 `src/*.ts` [E: packages/server/package.json:14] [E: packages/server/package.json:8]。 |
| `packages/slack` | `@opencode-ai/slack` [E: packages/slack/package.json:2] | shared integration | Slack integration package，依赖 SDK 和 `@slack/bolt` [E: packages/slack/package.json:10]。 |
| `packages/stats/app` | `@opencode-ai/stats-app` [E: packages/stats/app/package.json:3] | shared stats | Stats web app，依赖 stats-core、ui、Solid Start、D3 geo/scale 和 SST [E: packages/stats/app/package.json:14]。 |
| `packages/stats/core` | `@opencode-ai/stats-core` [E: packages/stats/core/package.json:3] | shared stats | Stats domain/database package，导出 athena/config/database/domain/runtime/stat-sync APIs [E: packages/stats/core/package.json:8]。 |
| `packages/stats/server` | `@opencode-ai/stats-server` [E: packages/stats/server/package.json:3] | shared stats | Stats server package，main/export 为 `src/server.ts`，依赖 Firehose、Effect platform 和 stats-core [E: packages/stats/server/package.json:8] [E: packages/stats/server/package.json:16]。 |
| `packages/storybook` | `@opencode-ai/storybook` [E: packages/storybook/package.json:3] | shared UI docs | Storybook package for UI components, with `storybook` and `build` scripts [E: packages/storybook/package.json:6]。 |
| `packages/tui` | `@opencode-ai/tui` [E: packages/tui/package.json:3] | shared TUI host | Canonical OpenTUI/Solid terminal UI package，导出 config、runtime、keymap、prompt、plugin、ui 和 utility surfaces [E: packages/tui/package.json:12]。 |
| `packages/ui` | `@opencode-ai/ui` [E: packages/ui/package.json:2] | shared UI | Shared Solid UI component/theme package，导出 components、hooks、context、styles、theme、icons、fonts/audio 和 v2 components [E: packages/ui/package.json:6]。 |
| `packages/web` | `@opencode-ai/web` [E: packages/web/package.json:2] | shared docs/web | Astro web/docs package，依赖 Starlight、Solid integration、Shiki/Marked 和 package `opencode` for docs/runtime links [E: packages/web/package.json:14] [E: packages/web/package.json:38]。 |

## TUI 迁移动机

`specs/tui-package.md` 的目标是把 canonical TUI 从旧 `packages/opencode/src/cli/cmd/tui` 移到 `packages/tui`，同时让 legacy CLI 和 new CLI 继续使用同一套 implementation [E: specs/tui-package.md:3] [E: specs/tui-package.md:14]。同一 spec 规定目标 dependency graph 是 `packages/opencode -> @opencode-ai/tui` 和 `packages/cli -> @opencode-ai/tui`，而 `@opencode-ai/tui` 再通过 SDK 边界访问 OpenCode domain [E: specs/tui-package.md:16] [E: specs/tui-package.md:31]。

## Sources

- `package.json`
- `packages/*/package.json`
- `packages/console/*/package.json`
- `packages/stats/*/package.json`
- `packages/sdk/js/package.json`
- `packages/slack/package.json`
- `specs/tui-package.md`

## 相关

- `spine.overview`
