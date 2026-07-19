# uncertainty-coding-agent-html-export

- index 与节点 symbols 已改为当前源码导出的 `exportSessionToHtml`、`exportFromFile` 和 `ansiToHtml`;RPC 的 `exportHtml` / `export_html` 仅作为协议方法名保留在对应 surface 说明中。
- `getExportTemplateDir()`、`template.html`、`template.css` 和 `template.js` 对最终浏览器端渲染很关键,但 node 109 的 index source 只列出 `core/export-html/index.ts`、`ansi-to-html.ts`、`tool-renderer.ts`。节点只把这些作为 Sources,入口/模板行为仅在必要处引用邻近源码。[I]
