---
id: clients.ui
title: 共享 UI 与 Session UI 组件库(SolidJS)
kind: subsystem
tier: T2
v: na
source:
  - packages/ui/package.json
  - packages/ui/src/components/button.tsx
  - packages/ui/src/v2/components/button-v2.tsx
  - packages/ui/src/theme/index.ts
  - packages/ui/src/theme/context.tsx
  - packages/ui/src/theme/v2/resolve.ts
  - packages/ui/src/context/index.ts
  - packages/ui/src/context/i18n.tsx
  - packages/ui/src/context/marked.tsx
  - packages/ui/src/context/marked-parser.tsx
  - packages/ui/src/context/marked-theme.tsx
  - packages/ui/src/i18n/en.ts
  - packages/session-ui/package.json
  - packages/session-ui/src/v2/components/attachment-card-v2.tsx
  - packages/session-ui/src/v2/components/prompt-input/attachments.ts
  - packages/session-ui/src/v2/components/prompt-input/index.tsx
  - packages/session-ui/src/v2/components/prompt-input/interaction.ts
  - packages/session-ui/src/v2/components/prompt-input/machine.ts
  - packages/session-ui/src/v2/components/prompt-input/store.ts
  - packages/session-ui/src/v2/components/prompt-input/types.ts
  - packages/session-ui/src/v2/components/session-review-v2.tsx
  - packages/session-ui/src/components/markdown.tsx
  - packages/session-ui/src/components/markdown.worker.ts
  - packages/session-ui/src/components/markdown-worker.ts
  - packages/session-ui/src/components/part-default-open.ts
  - packages/session-ui/src/components/basic-tool.tsx
  - packages/session-ui/src/pierre/index.ts
  - packages/session-ui/src/pierre/file-runtime.ts
  - packages/app/src/utils/draft-store.ts
  - packages/app/src/utils/prompt.ts
  - packages/app/src/components/prompt-input/submit.ts
  - packages/schema/src/prompt-input.ts
  - packages/core/src/session.ts
  - packages/app/e2e/regression/prompt-input-v2-command-draft.spec.ts
symbols:
  - ButtonV2
  - ThemeProvider
  - PromptInputV2
  - transitionPromptInputV2
  - createPromptInputV2Store
  - AttachmentCardV2
  - SessionReviewV2
  - createMarkdownParser
  - partDefaultOpen
  - pluralCategory
related:
  - clients.app
  - clients.storybook
evidence: explicit
status: verified
updated: 3fd77ae980
---

> 共享 UI 层由 `@opencode-ai/ui` 的 design-system primitives 与 `@opencode-ai/session-ui` 的 session-facing components 组成；前者提供 theme/i18n/icons 和 v1/v2 primitives，后者组装 prompt input、attachments、message timeline 与 review surfaces。

## 能回答的问题

- `@opencode-ai/ui` 暴露哪些 public entrypoints?
- v1 component 与 v2 component 的目录和 API 如何区分?
- 组件库怎样使用 Kobalte primitive?
- theme provider 如何把 theme JSON 转成 CSS variables?
- UI i18n dictionary 覆盖哪些通用文案，plural / RTL 原语在哪?
- Markdown 解析为什么进 worker，和 `MarkedProvider` 的关系是什么?
- 新的 `@opencode-ai/session-ui/v2/prompt-input` 如何表示 prompt parts、attachments 与 comments?
- V2 prompt input 怎样在 cursor 位置插入文本，并区分 inline command 与 populated command menu?
- V2 session review 为什么不应并入 `packages/app` 节点?

## 职责边界

`@opencode-ai/ui` 是 presentation primitive library, 不是 App shell。package exports 将 `./*` 映射到 `src/components/*.tsx`, 将 `./v2/*` 映射到 `src/v2/components/*.tsx`, 还暴露 i18n、hooks、context、storybook fixtures/scaffold、styles、theme、icons、fonts、audio 等资源 [E: packages/ui/package.json:35] [E: packages/ui/package.json:37] [E: packages/ui/package.json:38] [E: packages/ui/package.json:39] [E: packages/ui/package.json:40] [E: packages/ui/package.json:42] [E: packages/ui/package.json:44] [E: packages/ui/package.json:46] [E: packages/ui/package.json:48] [E: packages/ui/package.json:49] [E: packages/ui/package.json:50] [E: packages/ui/package.json:51] [E: packages/ui/package.json:52] [E: packages/ui/package.json:53] [E: packages/ui/package.json:54] [E: packages/ui/package.json:55] [E: packages/ui/package.json:56]。

`@opencode-ai/session-ui` 是同一 presentation boundary 中的 session-specific 层，它依赖 `@opencode-ai/ui` 并分别暴露 legacy components、`./v2/*` 以及 prompt-input 的 component/interaction/store/types 入口 [E: packages/session-ui/package.json:2] [E: packages/session-ui/package.json:8] [E: packages/session-ui/package.json:20] [E: packages/session-ui/package.json:22] [E: packages/session-ui/package.json:23] [E: packages/session-ui/package.json:24] [E: packages/session-ui/package.json:25] [E: packages/session-ui/package.json:44]。因此本轮新增的 V2 prompt-input/review/attachment 组件归入本 `clients.ui` 节点，而不是 `clients.app` 的 routing/state shell [I]。

V1/V2 关系: UI 包自身是 `v: na`, 但它暴露两个 design-system generation。`./*` 是旧组件入口, `./v2/*` 是 v2 组件入口 [E: packages/ui/package.json:37] [E: packages/ui/package.json:55]。

## 技术栈

- SolidJS component library, Vite dev server 和 typecheck scripts [E: packages/ui/package.json:60] [E: packages/ui/package.json:62] [E: packages/ui/package.json:74] [E: packages/ui/package.json:80] [E: packages/ui/package.json:111]。
- Kobalte primitive wrapper: v1 `Button` 和 v2 `ButtonV2` 都 import `Button as Kobalte` [E: packages/ui/src/components/button.tsx:1] [E: packages/ui/src/v2/components/button-v2.tsx:1]。
- Theme engine: `theme/index.ts` export color conversion、v1 resolver、v2 resolver、loader、context 和 default themes [E: packages/ui/src/theme/index.ts:15] [E: packages/ui/src/theme/index.ts:34] [E: packages/ui/src/theme/index.ts:35] [E: packages/ui/src/theme/index.ts:36] [E: packages/ui/src/theme/index.ts:37] [E: packages/ui/src/theme/index.ts:39]。
- i18n dictionary: English dict 包含 session review、file media、line comments、session turn statuses、dialog text 和 tool labels 等 shared UI strings [E: packages/ui/src/i18n/en.ts:1] [E: packages/ui/src/i18n/en.ts:2] [E: packages/ui/src/i18n/en.ts:39] [E: packages/ui/src/i18n/en.ts:49] [E: packages/ui/src/i18n/en.ts:58] [E: packages/ui/src/i18n/en.ts:76] [E: packages/ui/src/i18n/en.ts:151]。locale 文件通过 `./i18n/*` 导出，但覆盖机制与 RTL/plural 原语不在逐 locale 文件里，而在 `i18n.tsx` + App `LanguageProvider`。[E: packages/ui/package.json:38] [E: packages/ui/src/context/i18n.tsx:28] [E: packages/ui/src/context/i18n.tsx:62]

## 关键文件

| 文件 | 角色 |
| --- | --- |
| `packages/ui/package.json` | Public API map。组件、context、theme、styles、icons、fonts/audio、v2 components 都从这里暴露 [E: packages/ui/package.json:37] [E: packages/ui/package.json:40] [E: packages/ui/package.json:44] [E: packages/ui/package.json:46] [E: packages/ui/package.json:49] [E: packages/ui/package.json:50] [E: packages/ui/package.json:51] [E: packages/ui/package.json:52] [E: packages/ui/package.json:53] [E: packages/ui/package.json:55]。 |
| `packages/ui/src/components/button.tsx` | v1 component pattern。props 包含 `size`, `variant`, `icon`, render 时写 `data-component="button"` 和 `data-variant` [E: packages/ui/src/components/button.tsx:5] [E: packages/ui/src/components/button.tsx:8] [E: packages/ui/src/components/button.tsx:9] [E: packages/ui/src/components/button.tsx:10] [E: packages/ui/src/components/button.tsx:18] [E: packages/ui/src/components/button.tsx:20]。 |
| `packages/ui/src/v2/components/button-v2.tsx` | v2 component pattern。导入自己的 CSS, variant set 包含 `neutral/danger/warning/outline/contrast/ghost/ghost-muted/loading`, render 时写 `data-component="button-v2"` [E: packages/ui/src/v2/components/button-v2.tsx:4] [E: packages/ui/src/v2/components/button-v2.tsx:6] [E: packages/ui/src/v2/components/button-v2.tsx:10] [E: packages/ui/src/v2/components/button-v2.tsx:20]。 |
| `packages/ui/src/theme/context.tsx` | ThemeProvider。动态 glob `./themes/*.json`, 本地存储 theme/color scheme, 注入 `#oc-theme` style element, 暴露 preview/commit/cancel/register APIs [E: packages/ui/src/theme/context.tsx:28] [E: packages/ui/src/theme/context.tsx:14] [E: packages/ui/src/theme/context.tsx:16] [E: packages/ui/src/theme/context.tsx:119] [E: packages/ui/src/theme/context.tsx:123] [E: packages/ui/src/theme/context.tsx:326] [E: packages/ui/src/theme/context.tsx:327] [E: packages/ui/src/theme/context.tsx:353] [E: packages/ui/src/theme/context.tsx:363]。 |
| `packages/ui/src/theme/v2/resolve.ts` | v2 token resolver。生成 primitive ramps, semantic tokens, foreground tokens, 输出 CSS variables [E: packages/ui/src/theme/v2/resolve.ts:9] [E: packages/ui/src/theme/v2/resolve.ts:109] [E: packages/ui/src/theme/v2/resolve.ts:121] [E: packages/ui/src/theme/v2/resolve.ts:135] [E: packages/ui/src/theme/v2/resolve.ts:137] [E: packages/ui/src/theme/v2/resolve.ts:138] [E: packages/ui/src/theme/v2/resolve.ts:149]。 |
| `packages/session-ui/src/v2/components/prompt-input/index.tsx` | `PromptInputV2` view 边界：文件选择、drag/drop、attachments/comments cards、contenteditable editor、command/context/agent/model controls 和 submit/stop [E: packages/session-ui/src/v2/components/prompt-input/index.tsx:49] [E: packages/session-ui/src/v2/components/prompt-input/index.tsx:79] [E: packages/session-ui/src/v2/components/prompt-input/index.tsx:111] [E: packages/session-ui/src/v2/components/prompt-input/index.tsx:133] [E: packages/session-ui/src/v2/components/prompt-input/index.tsx:153] [E: packages/session-ui/src/v2/components/prompt-input/index.tsx:205] [E: packages/session-ui/src/v2/components/prompt-input/index.tsx:257]。 |
| `packages/session-ui/src/v2/components/prompt-input/{machine,interaction,store}.ts` | interaction state machine 解释 keyboard/popover 事件，controller 执行 commands/host actions，store 维护 cursor-aware structured draft；三者把状态转移、host side effect 与 persisted prompt 分开 [E: packages/session-ui/src/v2/components/prompt-input/machine.ts:59] [E: packages/session-ui/src/v2/components/prompt-input/interaction.ts:162] [E: packages/session-ui/src/v2/components/prompt-input/store.ts:20]。 |
| `packages/session-ui/src/v2/components/session-review-v2.tsx` | V2 review surface 接收 files/active file/diff style/expand mode，提供可缩放 sidebar、filter 和前后文件导航 [E: packages/session-ui/src/v2/components/session-review-v2.tsx:24] [E: packages/session-ui/src/v2/components/session-review-v2.tsx:31] [E: packages/session-ui/src/v2/components/session-review-v2.tsx:62] [E: packages/session-ui/src/v2/components/session-review-v2.tsx:89] [E: packages/session-ui/src/v2/components/session-review-v2.tsx:151] [E: packages/session-ui/src/v2/components/session-review-v2.tsx:187]。 |
| `packages/ui/src/context/marked-parser.tsx` + `marked.tsx` | 共享 Marked 工厂：外链 renderer、KaTeX、marked-shiki。`MarkedProvider` 仍在主线程用 pierre/shiki-wasm highlight。[E: packages/ui/src/context/marked-parser.tsx:5] [E: packages/ui/src/context/marked.tsx:11] [E: packages/ui/src/context/marked.tsx:14] |
| `packages/session-ui/src/components/markdown.worker.ts` | Session markdown worker。`parse` / `project` / `highlight` 都在 worker 内跑 `createMarkdownParser` + Shiki stream；host 侧 `markdown-worker.ts` 管 transport/supersede。[E: packages/session-ui/src/components/markdown.worker.ts:4] [E: packages/session-ui/src/components/markdown.worker.ts:37] [E: packages/session-ui/src/components/markdown.worker.ts:45] [E: packages/session-ui/src/components/markdown-worker.ts:58] [E: packages/session-ui/src/components/markdown.tsx:28] |

## 数据模型

v1 `ButtonProps` 允许 `size: "small" | "normal" | "large"`, `variant: "primary" | "secondary" | "ghost"`, `icon` 来自 `IconProps["name"]` [E: packages/ui/src/components/button.tsx:5] [E: packages/ui/src/components/button.tsx:8] [E: packages/ui/src/components/button.tsx:9] [E: packages/ui/src/components/button.tsx:10]。v2 `ButtonV2Props` 同样保留 size/icon, 但 variant 集合换成 `neutral`, `danger`, `warning`, `outline`, `contrast`, `ghost`, `ghost-muted`, `loading` [E: packages/ui/src/v2/components/button-v2.tsx:6] [E: packages/ui/src/v2/components/button-v2.tsx:9] [E: packages/ui/src/v2/components/button-v2.tsx:10]。

`PromptInputV2Prompt` 是 text/file/agent/image attachment 的 union；persisted state 另带 cursor、model 和 comment context items [E: packages/session-ui/src/v2/components/prompt-input/types.ts:9] [E: packages/session-ui/src/v2/components/prompt-input/types.ts:28] [E: packages/session-ui/src/v2/components/prompt-input/types.ts:37] [E: packages/session-ui/src/v2/components/prompt-input/types.ts:68] [E: packages/session-ui/src/v2/components/prompt-input/types.ts:72]。image attachment 用 `{ id, url }` blob reference；新附件的 id 是内容 SHA-256、url 是 renderer object URL。picker/paste/drop 仍走同一添加路径，host 可注入 persistent store，否则 session-ui 使用内存 object URL fallback；duplicate 判定以 blob id 再结合 source path/filename。历史 data-URL file part 恢复仍是例外，会临时构造 `{ id: dataUrl, url: dataUrl }`。[E: packages/session-ui/src/v2/components/prompt-input/types.ts:28][E: packages/session-ui/src/v2/components/prompt-input/types.ts:34][E: packages/session-ui/src/v2/components/prompt-input/attachments.ts:69][E: packages/session-ui/src/v2/components/prompt-input/attachments.ts:81][E: packages/session-ui/src/v2/components/prompt-input/attachments.ts:99][E: packages/session-ui/src/v2/components/prompt-input/attachments.ts:106][E: packages/session-ui/src/v2/components/prompt-input/attachments.ts:110][E: packages/session-ui/src/v2/components/prompt-input/attachments.ts:115][E: packages/session-ui/src/v2/components/prompt-input/attachments.ts:124][E: packages/session-ui/src/v2/components/prompt-input/attachments.ts:130][E: packages/session-ui/src/v2/components/prompt-input/attachments.ts:224][E: packages/session-ui/src/v2/components/prompt-input/attachments.ts:228][E: packages/app/src/utils/draft-store.ts:24][E: packages/app/src/utils/draft-store.ts:33][E: packages/app/src/utils/draft-store.ts:169][E: packages/app/src/utils/draft-store.ts:170][E: packages/app/src/utils/prompt.ts:105][E: packages/app/src/utils/prompt.ts:111]。

App host 的 submit adapter 会通过 BlobReference `url` 取回 blob，并选择转成 data URL；同一转换覆盖 new-session input、附件 part 与后续 submit 分支。这是当前 App adapter 的 wire choice，不是 current prompt/SessionV2 schema 强制：底层 file attachment 只要求 `uri: string`，session core 会继续解析该 URI。[E: packages/app/src/utils/draft-store.ts:157][E: packages/app/src/utils/draft-store.ts:163][E: packages/app/src/components/prompt-input/submit.ts:101][E: packages/app/src/components/prompt-input/submit.ts:117][E: packages/app/src/components/prompt-input/submit.ts:528][E: packages/app/src/components/prompt-input/submit.ts:530][E: packages/schema/src/prompt-input.ts:7][E: packages/schema/src/prompt-input.ts:9][E: packages/core/src/session.ts:460][E: packages/core/src/session.ts:469]

store 的 `addText()` 按 persisted cursor 把文本插入 structured prompt，并重新计算非 image parts 的 offsets；mention insertion 复用同一 offset normalization。[E: packages/session-ui/src/v2/components/prompt-input/store.ts:50] [E: packages/session-ui/src/v2/components/prompt-input/store.ts:53] [E: packages/session-ui/src/v2/components/prompt-input/store.ts:96] [E: packages/session-ui/src/v2/components/prompt-input/store.ts:114] [E: packages/session-ui/src/v2/components/prompt-input/store.ts:137] [E: packages/session-ui/src/v2/components/prompt-input/store.ts:140]

Theme context 的 store 包含 `themes`, `themeId`, `colorScheme`, `mode`, `previewThemeId`, `previewScheme` [E: packages/ui/src/theme/context.tsx:183] [E: packages/ui/src/theme/context.tsx:184] [E: packages/ui/src/theme/context.tsx:187] [E: packages/ui/src/theme/context.tsx:188] [E: packages/ui/src/theme/context.tsx:189] [E: packages/ui/src/theme/context.tsx:190] [E: packages/ui/src/theme/context.tsx:191]。默认 theme id 是 `oc-2`, 并且 `oc-1` 会 normalize 到 `oc-2` [E: packages/ui/src/theme/context.tsx:87] [E: packages/ui/src/theme/context.tsx:180]。

v2 theme primitive steps 是 100 到 1200, `generateV2Primitives` 从 neutral/ink/primary/accent/success/warning/error/info/interactive/diff palette inputs 生成 grey/blue/green/yellow/red/purple/pink/orange/cyan ramps [E: packages/ui/src/theme/v2/resolve.ts:9] [E: packages/ui/src/theme/v2/resolve.ts:11] [E: packages/ui/src/theme/v2/resolve.ts:12] [E: packages/ui/src/theme/v2/resolve.ts:13] [E: packages/ui/src/theme/v2/resolve.ts:14] [E: packages/ui/src/theme/v2/resolve.ts:15] [E: packages/ui/src/theme/v2/resolve.ts:16] [E: packages/ui/src/theme/v2/resolve.ts:17] [E: packages/ui/src/theme/v2/resolve.ts:18] [E: packages/ui/src/theme/v2/resolve.ts:19] [E: packages/ui/src/theme/v2/resolve.ts:20] [E: packages/ui/src/theme/v2/resolve.ts:21] [E: packages/ui/src/theme/v2/resolve.ts:22] [E: packages/ui/src/theme/v2/resolve.ts:109] [E: packages/ui/src/theme/v2/resolve.ts:121] [E: packages/ui/src/theme/v2/resolve.ts:131]。

`pluralCategory(locale, count)` 缓存最多 32 个 `Intl.PluralRules`；`I18nProvider` 把 `layoutLocale ?? locale` 交给 Kobalte，供 RTL 菜单方向使用。[E: packages/ui/src/context/i18n.tsx:28] [E: packages/ui/src/context/i18n.tsx:32] [E: packages/ui/src/context/i18n.tsx:62] [E: packages/ui/src/context/i18n.tsx:64] `partDefaultOpen()` 在 edit/write/patch/apply_patch 且 edit-default-open 开启时，若 metadata 全是 delete files 或 `filediff.additions === 0 && deletions > 0`，则折叠。[E: packages/session-ui/src/components/part-default-open.ts:3] [E: packages/session-ui/src/components/part-default-open.ts:19] [E: packages/session-ui/src/components/part-default-open.ts:22] [E: packages/session-ui/src/components/part-default-open.ts:24] `BasicTool.allowOpenWhilePending` 允许 shell 等工具在 pending/running 时展开 details。[E: packages/session-ui/src/components/basic-tool.tsx:35] [E: packages/session-ui/src/components/basic-tool.tsx:180] [E: packages/session-ui/src/components/message-part.tsx:2111]

## 控制流

1. `ThemeProvider` 初始化时读取 localStorage 的 theme id 和 color scheme, 根据 system mode 计算当前 mode [E: packages/ui/src/theme/context.tsx:174] [E: packages/ui/src/theme/context.tsx:176] [E: packages/ui/src/theme/context.tsx:180] [E: packages/ui/src/theme/context.tsx:181] [E: packages/ui/src/theme/context.tsx:182]。
2. ThemeProvider 用 `import.meta.glob("./themes/*.json")` lazy-load theme JSON, 并按 sorted ids 暴露 available themes [E: packages/ui/src/theme/context.tsx:26] [E: packages/ui/src/theme/context.tsx:28] [E: packages/ui/src/theme/context.tsx:32] [E: packages/ui/src/theme/context.tsx:36]。
3. `applyThemeCss` 同时调用 v1 `themeToCss` 和 v2 `themeV2ToCss`, 合并写入 `:root` CSS variables [E: packages/ui/src/theme/context.tsx:133] [E: packages/ui/src/theme/context.tsx:136] [E: packages/ui/src/theme/context.tsx:137] [E: packages/ui/src/theme/context.tsx:138] [E: packages/ui/src/theme/context.tsx:144] [E: packages/ui/src/theme/context.tsx:147] [E: packages/ui/src/theme/context.tsx:148]。
4. `createEffect` 监听当前 theme/mode/color scheme, 有 theme 时调用 `applyTheme(theme, store.themeId, store.mode, store.colorScheme)`；`onThemeApplied` 因此能同时获得 resolved mode 和用户选择的 scheme [E: packages/ui/src/theme/context.tsx:176] [E: packages/ui/src/theme/context.tsx:178] [E: packages/ui/src/theme/context.tsx:281] [E: packages/ui/src/theme/context.tsx:284]。
5. Components 通过 Kobalte primitive + data attributes 表达状态, 例如 `Button` 和 `ButtonV2` 都把 size/variant/icon 写成 data attributes 给 CSS 消费 [E: packages/ui/src/components/button.tsx:16] [E: packages/ui/src/components/button.tsx:18] [E: packages/ui/src/components/button.tsx:19] [E: packages/ui/src/components/button.tsx:20] [E: packages/ui/src/components/button.tsx:21] [E: packages/ui/src/v2/components/button-v2.tsx:18] [E: packages/ui/src/v2/components/button-v2.tsx:20] [E: packages/ui/src/v2/components/button-v2.tsx:21] [E: packages/ui/src/v2/components/button-v2.tsx:22] [E: packages/ui/src/v2/components/button-v2.tsx:23]。
6. `inputChanged()` 只用 cursor 之前的文本识别 `@` context trigger；command menu 在 draft 已 populated 时进入独立 search focus。若 populated command menu 选择的是 host built-in action，controller 不执行 state-machine 的 draft replacement，所以原 draft 保留；新增 e2e 用 `model.choose` 固定该行为。[E: packages/session-ui/src/v2/components/prompt-input/machine.ts:96] [E: packages/session-ui/src/v2/components/prompt-input/machine.ts:120] [E: packages/session-ui/src/v2/components/prompt-input/machine.ts:131] [E: packages/session-ui/src/v2/components/prompt-input/interaction.ts:165] [E: packages/session-ui/src/v2/components/prompt-input/interaction.ts:167] [E: packages/session-ui/src/v2/components/prompt-input/interaction.ts:183] [E: packages/app/e2e/regression/prompt-input-v2-command-draft.spec.ts:10] [E: packages/app/e2e/regression/prompt-input-v2-command-draft.spec.ts:44] [E: packages/app/e2e/regression/prompt-input-v2-command-draft.spec.ts:49]
7. Session `Markdown` 组件把 parse/project/highlight 交给 worker；worker 失败时 host 用 escaped `<br>` fallback，不回退到已删除的 `marked-code-span` helper。[E: packages/session-ui/src/components/markdown.tsx:28] [E: packages/session-ui/src/components/markdown.tsx:66] [E: packages/session-ui/src/components/markdown-worker.ts:116] [E: packages/session-ui/src/components/markdown.worker.ts:63] Diff viewer 的 pierre CSS 把 selection/deletion emphasis 与 `data-color-scheme` 对齐到 v2 tokens，这是 presentation refine，不是新的 diff 算法。[E: packages/session-ui/src/pierre/index.ts:35] [E: packages/session-ui/src/pierre/index.ts:154] [E: packages/session-ui/src/pierre/file-runtime.ts:26]

## 设计动机与权衡

UI 包把 low-level components、theme、i18n、icons 和 render helpers 收进一个 package, 让 `packages/app`, `packages/desktop`, `packages/console`, `packages/storybook` 不需要复制 presentation primitives [I]。package exports 同时保留 v1/v2 两套 component entrypoints [E: packages/ui/package.json:37] [E: packages/ui/package.json:55], 这允许新 design system 迁移逐步发生, 而不强迫所有 consumers 一次性切换 [I]。

## Gotcha

- v2 组件入口映射到 `src/v2/components/*.tsx` [E: packages/ui/package.json:55]; 它不是 `packages/core` V2 session kernel, 而是 UI design-system generation [I]。
- Theme provider 同时生成旧 token 和 `--v2-*` token [E: packages/ui/src/theme/context.tsx:137] [E: packages/ui/src/theme/context.tsx:138] [E: packages/ui/src/theme/context.tsx:148] [E: packages/ui/src/theme/v2/resolve.ts:149], 所以某个页面使用 v2 component 不一定需要另起 theme provider [I]。
- `@opencode-ai/session-ui` 的 `v2` 同样是 UI generation，不是 V2 session kernel；它从 `@opencode-ai/ui/v2/*` 复用 primitives [E: packages/session-ui/src/v2/components/prompt-input/index.tsx:7] [E: packages/session-ui/src/v2/components/prompt-input/index.tsx:12]。`MarkedProvider` 主线程 parser 与 session-ui markdown worker 共用 `createMarkdownParser`，但 highlight 实现不同（pierre highlighter vs worker Shiki）。[E: packages/ui/src/context/marked.tsx:14] [E: packages/session-ui/src/components/markdown.worker.ts:37]
- command selection 不是一律保留或一律清空 draft：保留规则只针对 populated `command-menu` 中由 host 返回 action 的 selection；inline command 仍执行 replacement/cleanup 路径。[E: packages/session-ui/src/v2/components/prompt-input/interaction.ts:165] [E: packages/session-ui/src/v2/components/prompt-input/interaction.ts:168]
- canonical BlobReference 的 hash `id` 是 durable identity；`url` 同时服务 renderer preview 与 submit 时的 blob retrieval/serialization，不能说“仅用于 preview”。legacy restored reference 还可能以 data URL 同时充当 id/url。[E: packages/session-ui/src/v2/components/prompt-input/types.ts:34][E: packages/app/src/utils/draft-store.ts:157][E: packages/app/src/utils/draft-store.ts:163][E: packages/app/src/utils/draft-store.ts:169]

## Sources

- `packages/ui/package.json`
- `packages/ui/src/components/button.tsx`
- `packages/ui/src/v2/components/button-v2.tsx`
- `packages/ui/src/theme/index.ts`
- `packages/ui/src/theme/context.tsx`
- `packages/ui/src/theme/v2/resolve.ts`
- `packages/ui/src/context/index.ts`
- `packages/ui/src/context/i18n.tsx`
- `packages/ui/src/context/marked.tsx`
- `packages/ui/src/context/marked-parser.tsx`
- `packages/ui/src/context/marked-theme.tsx`
- `packages/ui/src/i18n/en.ts`
- `packages/session-ui/package.json`
- `packages/session-ui/src/v2/components/attachment-card-v2.tsx`
- `packages/session-ui/src/v2/components/prompt-input/attachments.ts`
- `packages/session-ui/src/v2/components/prompt-input/index.tsx`
- `packages/session-ui/src/v2/components/prompt-input/interaction.ts`
- `packages/session-ui/src/v2/components/prompt-input/machine.ts`
- `packages/session-ui/src/v2/components/prompt-input/store.ts`
- `packages/session-ui/src/v2/components/prompt-input/types.ts`
- `packages/session-ui/src/v2/components/session-review-v2.tsx`
- `packages/session-ui/src/components/markdown.tsx`
- `packages/session-ui/src/components/markdown.worker.ts`
- `packages/session-ui/src/components/markdown-worker.ts`
- `packages/session-ui/src/components/part-default-open.ts`
- `packages/session-ui/src/components/basic-tool.tsx`
- `packages/session-ui/src/pierre/index.ts`
- `packages/session-ui/src/pierre/file-runtime.ts`
- `packages/app/src/utils/draft-store.ts`
- `packages/app/src/utils/prompt.ts`
- `packages/app/src/components/prompt-input/submit.ts`
- `packages/schema/src/prompt-input.ts`
- `packages/core/src/session.ts`
- `packages/app/e2e/regression/prompt-input-v2-command-draft.spec.ts`

## 相关

- [App UI shell(SolidJS)](app.md)
- [Storybook(UI 沙盒)](storybook.md)
