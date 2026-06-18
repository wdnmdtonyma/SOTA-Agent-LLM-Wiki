---
id: clients.web
title: Web/文档站(Astro + Starlight)
kind: subsystem
tier: T2
v: na
source:
  - packages/web/package.json
  - packages/web/astro.config.mjs
  - packages/web/src/content.config.ts
  - packages/web/config.mjs
related:
  - infra.sst
evidence: explicit
status: verified
updated: 355a0bcf5
---

> Web/文档站是 `@opencode-ai/web` Astro 5 + Starlight 站点, 由 Cloudflare adapter 以 server output 部署, 主要承载 docs、多语言内容、品牌页面和分享页的 Web surface。

## 能回答的问题

- `packages/web` 用什么框架构建文档站?
- Astro/Starlight 如何配置 locale、sidebar 和 Cloudflare adapter?
- Web 站点的生产/dev URL 如何由 SST stage 决定?
- 文档内容和 i18n collection 的 schema 从哪里来?
- Web 站点和 `infra.sst` 的部署关系是什么?

## 职责边界

`@opencode-ai/web` 是 docs/web surface, 不是 App UI shell。package scripts 全部是 Astro dev/build/preview 命令 [E: packages/web/package.json:7] [E: packages/web/package.json:10] [E: packages/web/package.json:11], 依赖包含 `astro`, `@astrojs/starlight`, `@astrojs/cloudflare`, `@astrojs/solid-js` 和 `toolbeam-docs-theme` [E: packages/web/package.json:15] [E: packages/web/package.json:17] [E: packages/web/package.json:18] [E: packages/web/package.json:24] [E: packages/web/package.json:35]。

V1/V2 关系: Web docs 站点是 `v: na`。它会发布面向用户的文档和分享页面, 但不承载 V1/V2 session 执行路径 [I]。

## 技术栈

- Astro 5.7.13 + Starlight 0.34.3 [E: packages/web/package.json:18] [E: packages/web/package.json:24]。
- Cloudflare adapter, Astro `output: "server"` [E: packages/web/astro.config.mjs:16] [E: packages/web/astro.config.mjs:17]。
- Solid islands: `@astrojs/solid-js` dependency 和 `solidJs()` integration 同时出现 [E: packages/web/package.json:17] [E: packages/web/astro.config.mjs:32]。
- Markdown heading ids + autolinks: Astro markdown config 添加 `rehypeHeadingIds` 和 `rehypeAutolinkHeadings` [E: packages/web/astro.config.mjs:27]。

## 关键文件

| 文件 | 角色 |
| --- | --- |
| `packages/web/package.json` | 声明 Astro/Starlight/Cloudflare/Solid 依赖和 `astro build` scripts [E: packages/web/package.json:7] [E: packages/web/package.json:10] [E: packages/web/package.json:15] [E: packages/web/package.json:17] [E: packages/web/package.json:18] [E: packages/web/package.json:24]。 |
| `packages/web/astro.config.mjs` | Astro runtime config。设置 `site`, `base: "/docs"`, server output, Cloudflare adapter, Starlight integration [E: packages/web/astro.config.mjs:14] [E: packages/web/astro.config.mjs:15] [E: packages/web/astro.config.mjs:16] [E: packages/web/astro.config.mjs:17] [E: packages/web/astro.config.mjs:33]。 |
| `packages/web/src/content.config.ts` | Content collection schema。`docs` 用 `docsLoader/docsSchema`, `i18n` 用 `i18nLoader/i18nSchema` 并基于 English keys 扩展 string schema [E: packages/web/src/content.config.ts:2] [E: packages/web/src/content.config.ts:3] [E: packages/web/src/content.config.ts:6] [E: packages/web/src/content.config.ts:9] [E: packages/web/src/content.config.ts:11] [E: packages/web/src/content.config.ts:12] [E: packages/web/src/content.config.ts:13]。 |
| `packages/web/config.mjs` | Stage-aware public URLs。production 用 `https://opencode.ai`, 非 production 用 `${stage}.opencode.ai`, console auth URL 也按 stage 生成 [E: packages/web/config.mjs:1] [E: packages/web/config.mjs:4] [E: packages/web/config.mjs:5]。 |

## 数据模型

Starlight locale config 在 `astro.config.mjs` 中内联声明。`defaultLocale` 是 `root`, English 的 `root` locale 设置 `label: "English"` 和 `lang: "en"` [E: packages/web/astro.config.mjs:35] [E: packages/web/astro.config.mjs:38] [E: packages/web/astro.config.mjs:39]。同一 config 包含 Arabic、Bosnian、Danish、German、Spanish、French、Italian、Japanese、Korean、Norwegian Bokmal、Polish、Portuguese Brazil、Russian、Thai、Turkish、Simplified Chinese、Traditional Chinese 等 locale entries [E: packages/web/astro.config.mjs:42] [E: packages/web/astro.config.mjs:117] [E: packages/web/astro.config.mjs:122]。

Sidebar 是内容组织主数据。配置里先放 docs root、config、providers、network、enterprise、troubleshooting, 然后用 structured items 组织 Windows、Usage、Configure 等分组 [E: packages/web/astro.config.mjs:174] [E: packages/web/astro.config.mjs:182] [E: packages/web/astro.config.mjs:206] [E: packages/web/astro.config.mjs:231]。

## 控制流

1. Astro config import `config.mjs`, 用 stage-aware `config.url` 设置 `site`, 文档 base 固定为 `/docs` [E: packages/web/config.mjs:1] [E: packages/web/config.mjs:4] [E: packages/web/astro.config.mjs:7] [E: packages/web/astro.config.mjs:14] [E: packages/web/astro.config.mjs:15]。
2. Build output 选择 server mode, adapter 是 Cloudflare, image service 设为 passthrough [E: packages/web/astro.config.mjs:16] [E: packages/web/astro.config.mjs:17] [E: packages/web/astro.config.mjs:18]。
3. Integrations 顺序包括 `configSchema()`, `solidJs()`, `starlight(...)`, Starlight 内部再安装 `toolbeam-docs-theme` plugin [E: packages/web/astro.config.mjs:30] [E: packages/web/astro.config.mjs:31] [E: packages/web/astro.config.mjs:32] [E: packages/web/astro.config.mjs:33] [E: packages/web/astro.config.mjs:305] [E: packages/web/astro.config.mjs:306]。
4. Starlight config 设置 favicon/head assets、lastUpdated、expressiveCode themes、social links、edit link、custom CSS、logo、sidebar [E: packages/web/astro.config.mjs:128] [E: packages/web/astro.config.mjs:129] [E: packages/web/astro.config.mjs:156] [E: packages/web/astro.config.mjs:157] [E: packages/web/astro.config.mjs:158] [E: packages/web/astro.config.mjs:162] [E: packages/web/astro.config.mjs:168] [E: packages/web/astro.config.mjs:169] [E: packages/web/astro.config.mjs:174]。
5. SST 在 `infra/app.ts` 里把 `packages/web` 部署成 Cloudflare Astro resource, domain 是 `docs.${domain}`, 并传入 `SST_STAGE` 与 `VITE_API_URL` [E: infra/app.ts:52] [E: infra/app.ts:53] [E: infra/app.ts:54] [E: infra/app.ts:57] [E: infra/app.ts:58]。

## 设计动机与权衡

Web 站点把 docs 放在 Astro/Starlight, 把 App shell 放在 `packages/app`。这个分工让文档站可以使用 Starlight 的 content collections、locale、sidebar 和 edit link, 而交互式 coding UI 仍由 `@opencode-ai/app` 维护 [E: packages/web/src/content.config.ts:8] [E: packages/web/astro.config.mjs:162] [I]。Cloudflare server output 让 docs 可以托管动态分享页和 Solid islands, 而不只是静态 markdown [E: packages/web/astro.config.mjs:16] [E: packages/web/astro.config.mjs:17] [I]。

## Gotcha

- `packages/web` 和 `packages/app` 都是 Web-facing, 但前者是 docs/marketing/share 站点, 后者是 coding app shell。SST 也把它们部署成两个不同资源: `Web` domain 是 `docs.${domain}`, `WebApp` domain 是 `app.${domain}` [E: infra/app.ts:52] [E: infra/app.ts:53] [E: infra/app.ts:62] [E: infra/app.ts:63]。
- `config.mjs` 的 repository URL 仍指向 `anomalyco/opencode`, 所以 docs edit links 也以该 GitHub repo 为 base [E: packages/web/config.mjs:8] [E: packages/web/astro.config.mjs:163]。

## Sources

- `packages/web/package.json`
- `packages/web/astro.config.mjs`
- `packages/web/src/content.config.ts`
- `packages/web/config.mjs`
- `infra/app.ts`

## 相关

- [SST 云基础设施(Cloudflare/AWS)](../infra/sst.md)
