# uncertainty-coding-agent-html-export

- `exportHtml` 在 index.json 的 symbols 中列出,但当前源码导出的函数名是 `exportSessionToHtml` 和 `exportFromFile`;RPC client/mode 使用 `exportHtml` / `export_html` 作为协议方法名。节点将 `exportHtml` 保留在 frontmatter 以匹配 index.json,正文按实际源码函数名讲解。[U]
- `getExportTemplateDir()`、`template.html`、`template.css` 和 `template.js` 对最终浏览器端渲染很关键,但 node 109 的 index source 只列出 `core/export-html/index.ts`、`ansi-to-html.ts`、`tool-renderer.ts`。节点只把这些作为 Sources,入口/模板行为仅在必要处引用邻近源码。[I]
- `../../../pi` 从当前工作目录 `/Users/makii/Project/Agent_Wiki` 不存在;实际源码仓库位于 `/Users/makii/Project/Agent_Wiki/pi`,本节点 `updated` 使用 `git -C pi rev-parse --short HEAD` 得到的 `5a073885`。[U]
