---
id: subsys.coding-agent.html-export
title: 会话 HTML 导出
kind: subsystem
tier: T2
pkg: coding-agent
source:
  - packages/coding-agent/src/core/export-html/index.ts
  - packages/coding-agent/src/core/export-html/ansi-to-html.ts
  - packages/coding-agent/src/core/export-html/tool-renderer.ts
symbols:
  - exportHtml
  - ansiToHtml
related:
  - surface.sessions.management
  - subsys.coding-agent.theme-controller
evidence: explicit
status: verified
updated: 8c943640
---

> 会话 HTML 导出是 pi-coding-agent 把 `SessionManager` 的 JSONL 会话、可选 `AgentState` 元数据、主题色和扩展工具渲染结果打包成单个 standalone HTML 文件的子系统。

## 能回答的问题

- `/export`、RPC `export_html` 和 CLI `--export` 最终如何生成 HTML?
- `exportSessionToHtml()` 和 `exportFromFile()` 的输入、输出路径和错误条件有什么差异?
- HTML export 怎样把 session data、CSS、template JS、`marked` 和 `highlight.js` 放进一个文件?
- 扩展工具的 TUI renderer 如何经 ANSI 转成 HTML?
- ANSI SGR code 到 HTML inline style 的支持范围和限制是什么?
- HTML export 如何使用 theme export colors,以及没有显式 export colors 时怎样派生背景色?

## 职责边界

`packages/coding-agent/src/core/export-html/index.ts` 是 HTML export 的编排层:它读取 export template 目录里的 `template.html`、`template.css`、`template.js`、`vendor/marked.min.js` 和 `vendor/highlight.min.js`,把 session data base64、主题 CSS 变量和脚本替换进模板字符串 [E: packages/coding-agent/src/core/export-html/index.ts:144] [E: packages/coding-agent/src/core/export-html/index.ts:145] [E: packages/coding-agent/src/core/export-html/index.ts:146] [E: packages/coding-agent/src/core/export-html/index.ts:147] [E: packages/coding-agent/src/core/export-html/index.ts:148] [E: packages/coding-agent/src/core/export-html/index.ts:149] [E: packages/coding-agent/src/core/export-html/index.ts:160] [E: packages/coding-agent/src/core/export-html/index.ts:169]。

`packages/coding-agent/src/core/export-html/tool-renderer.ts` 只处理 custom tool HTML rendering:它按 tool name 查 `ToolDefinition`,调用工具自己的 `renderCall` / `renderResult`,再把 TUI `Component.render(width)` 产出的 ANSI lines 交给 `ansiLinesToHtml()` [E: packages/coding-agent/src/core/export-html/tool-renderer.ts:58] [E: packages/coding-agent/src/core/export-html/tool-renderer.ts:102] [E: packages/coding-agent/src/core/export-html/tool-renderer.ts:107] [E: packages/coding-agent/src/core/export-html/tool-renderer.ts:113] [E: packages/coding-agent/src/core/export-html/tool-renderer.ts:114] [E: packages/coding-agent/src/core/export-html/tool-renderer.ts:129] [E: packages/coding-agent/src/core/export-html/tool-renderer.ts:143] [E: packages/coding-agent/src/core/export-html/tool-renderer.ts:150]。

`packages/coding-agent/src/core/export-html/ansi-to-html.ts` 是低层 ANSI SGR converter:它维护当前 `TextStyle`,识别 `ESC[...m` 序列,把普通文本 HTML escape,在样式变化时开闭 `<span style="...">` [E: packages/coding-agent/src/core/export-html/ansi-to-html.ts:72] [E: packages/coding-agent/src/core/export-html/ansi-to-html.ts:110] [E: packages/coding-agent/src/core/export-html/ansi-to-html.ts:193] [E: packages/coding-agent/src/core/export-html/ansi-to-html.ts:198] [E: packages/coding-agent/src/core/export-html/ansi-to-html.ts:212] [E: packages/coding-agent/src/core/export-html/ansi-to-html.ts:226] [E: packages/coding-agent/src/core/export-html/ansi-to-html.ts:230]。

## 关键文件

- `packages/coding-agent/src/core/export-html/index.ts`: `ToolHtmlRenderer` / `ExportOptions` / `SessionData` 类型,theme variable 生成,template 注入,custom tool pre-render,`exportSessionToHtml()` 和 `exportFromFile()` [E: packages/coding-agent/src/core/export-html/index.ts:15] [E: packages/coding-agent/src/core/export-html/index.ts:35] [E: packages/coding-agent/src/core/export-html/index.ts:130] [E: packages/coding-agent/src/core/export-html/index.ts:111] [E: packages/coding-agent/src/core/export-html/index.ts:143] [E: packages/coding-agent/src/core/export-html/index.ts:183] [E: packages/coding-agent/src/core/export-html/index.ts:236] [E: packages/coding-agent/src/core/export-html/index.ts:288]。
- `packages/coding-agent/src/core/export-html/ansi-to-html.ts`: ANSI 16 色、256 色、RGB true color、bold/dim/italic/underline/default reset 和 HTML escaping 的实现 [E: packages/coding-agent/src/core/export-html/ansi-to-html.ts:15] [E: packages/coding-agent/src/core/export-html/ansi-to-html.ts:37] [E: packages/coding-agent/src/core/export-html/ansi-to-html.ts:63] [E: packages/coding-agent/src/core/export-html/ansi-to-html.ts:123] [E: packages/coding-agent/src/core/export-html/ansi-to-html.ts:139] [E: packages/coding-agent/src/core/export-html/ansi-to-html.ts:142] [E: packages/coding-agent/src/core/export-html/ansi-to-html.ts:159] [E: packages/coding-agent/src/core/export-html/ansi-to-html.ts:162]。
- `packages/coding-agent/src/core/export-html/tool-renderer.ts`: extension/custom tool 的 call/result 预渲染,render context 构造,collapsed/expanded result 双态渲染和异常 fallback [E: packages/coding-agent/src/core/export-html/tool-renderer.ts:14] [E: packages/coding-agent/src/core/export-html/tool-renderer.ts:75] [E: packages/coding-agent/src/core/export-html/tool-renderer.ts:98] [E: packages/coding-agent/src/core/export-html/tool-renderer.ts:121] [E: packages/coding-agent/src/core/export-html/tool-renderer.ts:143] [E: packages/coding-agent/src/core/export-html/tool-renderer.ts:153] [E: packages/coding-agent/src/core/export-html/tool-renderer.ts:166]。

## 数据模型

`ToolHtmlRenderer` 是 export core 对外依赖的 narrow interface: `renderCall(toolCallId, toolName, args)` 返回可选 HTML string,`renderResult(toolCallId, toolName, result, details, isError)` 返回可选 collapsed / expanded HTML 片段 [E: packages/coding-agent/src/core/export-html/index.ts:15] [E: packages/coding-agent/src/core/export-html/index.ts:17] [E: packages/coding-agent/src/core/export-html/index.ts:19] [E: packages/coding-agent/src/core/export-html/index.ts:25]。`ExportOptions` 支持 `outputPath`、`themeName` 和可选 `toolRenderer`,所以导出层本身不直接知道 extension registry 或 TUI runtime [E: packages/coding-agent/src/core/export-html/index.ts:35] [E: packages/coding-agent/src/core/export-html/index.ts:36] [E: packages/coding-agent/src/core/export-html/index.ts:37] [E: packages/coding-agent/src/core/export-html/index.ts:39] [I]。

`SessionData` 是注入浏览器端 template 的 payload:包含 `header`、`entries`、`leafId`、可选 `systemPrompt`、可选工具定义摘要 `tools`、以及按 tool call id 索引的 `renderedTools` [E: packages/coding-agent/src/core/export-html/index.ts:130] [E: packages/coding-agent/src/core/export-html/index.ts:131] [E: packages/coding-agent/src/core/export-html/index.ts:132] [E: packages/coding-agent/src/core/export-html/index.ts:133] [E: packages/coding-agent/src/core/export-html/index.ts:134] [E: packages/coding-agent/src/core/export-html/index.ts:135] [E: packages/coding-agent/src/core/export-html/index.ts:137]。`RenderedToolHtml` 只保存 `callHtml`、`resultHtmlCollapsed` 和 `resultHtmlExpanded`,这说明 export core 预渲染的是 HTML fragment,不是完整 tool state [E: packages/coding-agent/src/core/export-html/index.ts:29] [E: packages/coding-agent/src/core/export-html/index.ts:30] [E: packages/coding-agent/src/core/export-html/index.ts:31] [E: packages/coding-agent/src/core/export-html/index.ts:32] [I]。

`ToolHtmlRendererDeps` 把 custom renderer 所需环境限制为 `getToolDefinition`、`theme`、`cwd` 和可选 `width`;`createRenderContext()` 固定 `executionStarted: true`、`argsComplete: true`、`showImages: false`,并把 `expanded` / `isPartial` / `isError` 传给工具 renderer [E: packages/coding-agent/src/core/export-html/tool-renderer.ts:14] [E: packages/coding-agent/src/core/export-html/tool-renderer.ts:16] [E: packages/coding-agent/src/core/export-html/tool-renderer.ts:18] [E: packages/coding-agent/src/core/export-html/tool-renderer.ts:20] [E: packages/coding-agent/src/core/export-html/tool-renderer.ts:22] [E: packages/coding-agent/src/core/export-html/tool-renderer.ts:82] [E: packages/coding-agent/src/core/export-html/tool-renderer.ts:89] [E: packages/coding-agent/src/core/export-html/tool-renderer.ts:90] [E: packages/coding-agent/src/core/export-html/tool-renderer.ts:93]。

## 控制流

1. `exportSessionToHtml(sm, state, options)` 首先把 string option 规范化为 `{ outputPath }`,然后要求 `SessionManager.getSessionFile()` 有路径且文件存在;in-memory session 或还没有落盘 conversation 都会抛错 [E: packages/coding-agent/src/core/export-html/index.ts:236] [E: packages/coding-agent/src/core/export-html/index.ts:241] [E: packages/coding-agent/src/core/export-html/index.ts:243] [E: packages/coding-agent/src/core/export-html/index.ts:244] [E: packages/coding-agent/src/core/export-html/index.ts:247]。
2. `exportSessionToHtml()` 读取当前 entries;如果传入 `toolRenderer`,它调用 `preRenderCustomTools(entries, opts.toolRenderer)`,且只有至少渲染出一个 tool fragment 时才把 `renderedTools` 放进 `SessionData` [E: packages/coding-agent/src/core/export-html/index.ts:251] [E: packages/coding-agent/src/core/export-html/index.ts:255] [E: packages/coding-agent/src/core/export-html/index.ts:256] [E: packages/coding-agent/src/core/export-html/index.ts:258] [E: packages/coding-agent/src/core/export-html/index.ts:259]。
3. `exportSessionToHtml()` 把 header、entries、leaf id、`state.systemPrompt`、`state.tools` 的 name/description/parameters 摘要和 rendered tools 组合成 `SessionData`,再调用 `generateHtml()` [E: packages/coding-agent/src/core/export-html/index.ts:263] [E: packages/coding-agent/src/core/export-html/index.ts:264] [E: packages/coding-agent/src/core/export-html/index.ts:265] [E: packages/coding-agent/src/core/export-html/index.ts:266] [E: packages/coding-agent/src/core/export-html/index.ts:267] [E: packages/coding-agent/src/core/export-html/index.ts:268] [E: packages/coding-agent/src/core/export-html/index.ts:272]。
4. 输出路径优先使用 `opts.outputPath` 经 `normalizePath()`,否则从 session jsonl basename 生成 `${APP_NAME}-session-${sessionBasename}.html`;最后 `writeFileSync(outputPath, html, "utf8")` 并返回路径 [E: packages/coding-agent/src/core/export-html/index.ts:274] [E: packages/coding-agent/src/core/export-html/index.ts:276] [E: packages/coding-agent/src/core/export-html/index.ts:277] [E: packages/coding-agent/src/core/export-html/index.ts:280] [E: packages/coding-agent/src/core/export-html/index.ts:281]。
5. `exportFromFile(inputPath, options)` 是 standalone file path 入口:它 `resolvePath(inputPath)`,要求文件存在,用 `SessionManager.open(resolvedInputPath)` 读取 header/entries/leaf,但不带 `systemPrompt`、`tools` 或 `renderedTools` [E: packages/coding-agent/src/core/export-html/index.ts:288] [E: packages/coding-agent/src/core/export-html/index.ts:290] [E: packages/coding-agent/src/core/export-html/index.ts:292] [E: packages/coding-agent/src/core/export-html/index.ts:296] [E: packages/coding-agent/src/core/export-html/index.ts:298] [E: packages/coding-agent/src/core/export-html/index.ts:302] [E: packages/coding-agent/src/core/export-html/index.ts:303]。
6. `exportFromFile()` 的默认输出名来自输入 jsonl basename,同样写 utf8 HTML 并返回 output path [E: packages/coding-agent/src/core/export-html/index.ts:306] [E: packages/coding-agent/src/core/export-html/index.ts:308] [E: packages/coding-agent/src/core/export-html/index.ts:310] [E: packages/coding-agent/src/core/export-html/index.ts:311] [E: packages/coding-agent/src/core/export-html/index.ts:314] [E: packages/coding-agent/src/core/export-html/index.ts:315]。

## 主题与模板注入

`generateThemeVars(themeName)` 读取 resolved theme colors,为每个 color key 生成 CSS custom property;然后优先使用 theme JSON 的 explicit export colors,否则基于 `userMessageBg` 派生 `--exportPageBg`、`--exportCardBg` 和 `--exportInfoBg` [E: packages/coding-agent/src/core/export-html/index.ts:111] [E: packages/coding-agent/src/core/export-html/index.ts:112] [E: packages/coding-agent/src/core/export-html/index.ts:114] [E: packages/coding-agent/src/core/export-html/index.ts:115] [E: packages/coding-agent/src/core/export-html/index.ts:119] [E: packages/coding-agent/src/core/export-html/index.ts:120] [E: packages/coding-agent/src/core/export-html/index.ts:123] [E: packages/coding-agent/src/core/export-html/index.ts:125]。

fallback export colors 来自 `deriveExportColors(baseColor)`:无法 parse color 时回到固定深色组合;能 parse 时按 luminance 判断 light/dark,light base 稍微压暗 page background,dark base 加深 page/card 并调亮 info background [E: packages/coding-agent/src/core/export-html/index.ts:81] [E: packages/coding-agent/src/core/export-html/index.ts:82] [E: packages/coding-agent/src/core/export-html/index.ts:83] [E: packages/coding-agent/src/core/export-html/index.ts:91] [E: packages/coding-agent/src/core/export-html/index.ts:92] [E: packages/coding-agent/src/core/export-html/index.ts:94] [E: packages/coding-agent/src/core/export-html/index.ts:101]。

`generateHtml()` 会再次解析 theme export colors 与派生色,用 `{{THEME_VARS}}`、`{{BODY_BG}}`、`{{CONTAINER_BG}}`、`{{INFO_BG}}` 替换 CSS placeholder,再把 CSS、JS、base64 session data 和 vendor scripts 替换到 HTML template placeholder [E: packages/coding-agent/src/core/export-html/index.ts:151] [E: packages/coding-agent/src/core/export-html/index.ts:153] [E: packages/coding-agent/src/core/export-html/index.ts:154] [E: packages/coding-agent/src/core/export-html/index.ts:163] [E: packages/coding-agent/src/core/export-html/index.ts:164] [E: packages/coding-agent/src/core/export-html/index.ts:165] [E: packages/coding-agent/src/core/export-html/index.ts:170] [E: packages/coding-agent/src/core/export-html/index.ts:172]。

## Custom Tool 预渲染

`preRenderCustomTools()` 遍历 session entries,只检查 `type === "message"` 的 entry;assistant message 中的 `toolCall` 会触发 `toolRenderer.renderCall()`,tool result message 会触发 `toolRenderer.renderResult()` [E: packages/coding-agent/src/core/export-html/index.ts:189] [E: packages/coding-agent/src/core/export-html/index.ts:190] [E: packages/coding-agent/src/core/export-html/index.ts:194] [E: packages/coding-agent/src/core/export-html/index.ts:196] [E: packages/coding-agent/src/core/export-html/index.ts:197] [E: packages/coding-agent/src/core/export-html/index.ts:206] [E: packages/coding-agent/src/core/export-html/index.ts:211]。

`bash`、`read`、`write`、`edit` 和 `ls` 被列入 `TEMPLATE_RENDERED_TOOLS`,这批内置工具交给 browser template 直接渲染;不在该 set 的工具才走 TUI renderer 预渲染,但如果某个 result 已有 pre-rendered call,它也会合并 result collapsed/expanded HTML [E: packages/coding-agent/src/core/export-html/index.ts:178] [E: packages/coding-agent/src/core/export-html/index.ts:196] [E: packages/coding-agent/src/core/export-html/index.ts:209] [E: packages/coding-agent/src/core/export-html/index.ts:210] [E: packages/coding-agent/src/core/export-html/index.ts:219] [E: packages/coding-agent/src/core/export-html/index.ts:221]。

`createToolHtmlRenderer()` 为每个 tool call id 保存 call component、result component、state 和 args;这样同一工具的 call/result renderer 可以复用 `ToolRenderContext.state` 与 last component,接近 TUI 运行时的 incremental rendering 语义 [E: packages/coding-agent/src/core/export-html/tool-renderer.ts:61] [E: packages/coding-agent/src/core/export-html/tool-renderer.ts:62] [E: packages/coding-agent/src/core/export-html/tool-renderer.ts:63] [E: packages/coding-agent/src/core/export-html/tool-renderer.ts:64] [E: packages/coding-agent/src/core/export-html/tool-renderer.ts:66] [E: packages/coding-agent/src/core/export-html/tool-renderer.ts:86] [E: packages/coding-agent/src/core/export-html/tool-renderer.ts:87] [I]。

result 预渲染会分别用 `{ expanded: false, isPartial: false }` 和 `{ expanded: true, isPartial: false }` 渲染 collapsed/expanded 两个版本;collapsed 与 expanded 相同时只返回 expanded,减少重复 HTML [E: packages/coding-agent/src/core/export-html/tool-renderer.ts:143] [E: packages/coding-agent/src/core/export-html/tool-renderer.ts:145] [E: packages/coding-agent/src/core/export-html/tool-renderer.ts:150] [E: packages/coding-agent/src/core/export-html/tool-renderer.ts:153] [E: packages/coding-agent/src/core/export-html/tool-renderer.ts:155] [E: packages/coding-agent/src/core/export-html/tool-renderer.ts:160] [E: packages/coding-agent/src/core/export-html/tool-renderer.ts:163] [E: packages/coding-agent/src/core/export-html/tool-renderer.ts:164]。

## ANSI 到 HTML

`ansiToHtml(text)` 支持标准 foreground/background colors、bright variants、256-color palette、RGB true color、bold、dim、italic、underline、reset/default foreground/default background;未识别 code 不改变当前 style [E: packages/coding-agent/src/core/export-html/ansi-to-html.ts:123] [E: packages/coding-agent/src/core/export-html/ansi-to-html.ts:139] [E: packages/coding-agent/src/core/export-html/ansi-to-html.ts:142] [E: packages/coding-agent/src/core/export-html/ansi-to-html.ts:156] [E: packages/coding-agent/src/core/export-html/ansi-to-html.ts:159] [E: packages/coding-agent/src/core/export-html/ansi-to-html.ts:162] [E: packages/coding-agent/src/core/export-html/ansi-to-html.ts:176] [E: packages/coding-agent/src/core/export-html/ansi-to-html.ts:179] [E: packages/coding-agent/src/core/export-html/ansi-to-html.ts:182] [E: packages/coding-agent/src/core/export-html/ansi-to-html.ts:188] [I]。

`escapeHtml()` escape `&`、`<`、`>`、双引号和单引号;因此 ANSI 转换中的 plain text 不会直接注入 raw HTML [E: packages/coding-agent/src/core/export-html/ansi-to-html.ts:63] [E: packages/coding-agent/src/core/export-html/ansi-to-html.ts:65] [E: packages/coding-agent/src/core/export-html/ansi-to-html.ts:66] [E: packages/coding-agent/src/core/export-html/ansi-to-html.ts:67] [E: packages/coding-agent/src/core/export-html/ansi-to-html.ts:68] [E: packages/coding-agent/src/core/export-html/ansi-to-html.ts:69]。`ansiLinesToHtml(lines)` 把每行包进 `<div class="ansi-line">`,空行用 `&nbsp;` 保持视觉占位 [E: packages/coding-agent/src/core/export-html/ansi-to-html.ts:256] [E: packages/coding-agent/src/core/export-html/ansi-to-html.ts:257]。

## 入口与跨包关系

当前会话导出通常经 `AgentSession.exportToHtml()` 进入:它读取 settings 中的 theme name,创建 `createToolHtmlRenderer({ getToolDefinition, theme, cwd })`,再调用 `exportSessionToHtml()`。交互模式 `/export` 在目标路径不是 `.jsonl` 时调用 `session.exportToHtml(outputPath)`,RPC mode 的 `export_html` command 也返回 `{ path }`。这些入口层文件不在本节点 index source 列中,所以这里作为跨包导航信息而非本节点 `[E]` 证据 [I]。

CLI file export 是另一条入口: CLI wiring 不在本节点 index source 列中,本节点只把 `exportFromFile()` 自身作为可核证证据。`exportFromFile()` 这条路径没有 live `AgentState`,所以导出的 HTML 缺少当前 runtime 的 system prompt、tool schema 摘要和 custom tool pre-render [E: packages/coding-agent/src/core/export-html/index.ts:298] [E: packages/coding-agent/src/core/export-html/index.ts:302] [E: packages/coding-agent/src/core/export-html/index.ts:303] [I]。

跨包关系上,`subsys.coding-agent.html-export` 依赖 `@earendil-works/pi-agent-core` 的 `AgentState` 类型和 `SessionManager` 的 JSONL entries;读者需要 session 文件格式时看 [surface.sessions.management](../../surface/sessions/management.md),需要 theme resolution / export colors 时看 [subsys.coding-agent.theme-controller](theme-controller.md) [E: packages/coding-agent/src/core/export-html/index.ts:1] [E: packages/coding-agent/src/core/export-html/index.ts:8] [E: packages/coding-agent/src/core/export-html/index.ts:9] [E: packages/coding-agent/src/core/export-html/index.ts:236] [E: packages/coding-agent/src/core/export-html/index.ts:263]。

## 设计动机与权衡

session data 使用 base64(JSON.stringify(...)) 注入 template;这让 HTML template 不需要直接嵌入 raw JSON literal,但 browser 端仍需要解码这个 payload [E: packages/coding-agent/src/core/export-html/index.ts:160] [I]。

内置常用工具交给 template renderer,custom/extension 工具走 TUI→ANSI→HTML 预渲染;这个分层让 browser template 可以保留专门的内置工具 UI,同时 extension 工具不用重新写一套 browser renderer [E: packages/coding-agent/src/core/export-html/index.ts:178] [E: packages/coding-agent/src/core/export-html/index.ts:183] [E: packages/coding-agent/src/core/export-html/tool-renderer.ts:58] [E: packages/coding-agent/src/core/export-html/tool-renderer.ts:102] [E: packages/coding-agent/src/core/export-html/tool-renderer.ts:107] [E: packages/coding-agent/src/core/export-html/tool-renderer.ts:113] [E: packages/coding-agent/src/core/export-html/tool-renderer.ts:114] [I]。

`tool-renderer.ts` 的 `catch` 分支全部返回 `undefined`;这避免某个 custom renderer 异常阻断整个 session export,代价是该工具可能失去 TUI 风格的预渲染片段 [E: packages/coding-agent/src/core/export-html/tool-renderer.ts:115] [E: packages/coding-agent/src/core/export-html/tool-renderer.ts:117] [E: packages/coding-agent/src/core/export-html/tool-renderer.ts:166] [E: packages/coding-agent/src/core/export-html/tool-renderer.ts:168] [I]。

## Gotcha

- `exportSessionToHtml()` 不是 “save whatever is in memory”:它要求 session file path 存在且文件已存在,否则分别抛 `Cannot export in-memory session to HTML` 或 `Nothing to export yet - start a conversation first` [E: packages/coding-agent/src/core/export-html/index.ts:243] [E: packages/coding-agent/src/core/export-html/index.ts:245] [E: packages/coding-agent/src/core/export-html/index.ts:247] [E: packages/coding-agent/src/core/export-html/index.ts:248]。
- `exportFromFile()` 会 `resolvePath(inputPath)` 后检查存在性,但只通过 `SessionManager.open()` 读取 session file;它不会加载当前 agent state、extension runner 或 settings theme [E: packages/coding-agent/src/core/export-html/index.ts:290] [E: packages/coding-agent/src/core/export-html/index.ts:292] [E: packages/coding-agent/src/core/export-html/index.ts:296] [E: packages/coding-agent/src/core/export-html/index.ts:302] [E: packages/coding-agent/src/core/export-html/index.ts:303] [I]。
- ANSI converter 只匹配 `\x1b\[([\d;]*)m`,也就是 SGR `m` 结尾序列;cursor movement、OSC hyperlinks 等非 SGR terminal escape 不在这里转换 [E: packages/coding-agent/src/core/export-html/ansi-to-html.ts:193] [I]。
- `trimRenderedResultLines()` 会去掉 custom result 渲染前后的空白行,但 `ansiLinesToHtml()` 对保留下来的空行使用 `&nbsp;`;所以 result 外缘 whitespace 与内部 blank line 的保留策略不同 [E: packages/coding-agent/src/core/export-html/tool-renderer.ts:50] [E: packages/coding-agent/src/core/export-html/tool-renderer.ts:53] [E: packages/coding-agent/src/core/export-html/tool-renderer.ts:54] [E: packages/coding-agent/src/core/export-html/tool-renderer.ts:55] [E: packages/coding-agent/src/core/export-html/ansi-to-html.ts:257] [I]。

## Sources

- `packages/coding-agent/src/core/export-html/index.ts`
- `packages/coding-agent/src/core/export-html/ansi-to-html.ts`
- `packages/coding-agent/src/core/export-html/tool-renderer.ts`

## 相关

- [surface.sessions.management](../../surface/sessions/management.md): session 文件、resume/fork/export 这些用户可见 session 操作的入口层。
- [subsys.coding-agent.theme-controller](theme-controller.md): theme JSON、resolved colors 和 export colors 的来源。
