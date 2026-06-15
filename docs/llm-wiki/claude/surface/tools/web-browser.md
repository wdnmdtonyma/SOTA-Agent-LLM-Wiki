---
id: tool.web-browser
title: WebBrowser
kind: tool
tier: T1
path: surface/tools/web-browser.md
status: verified
source: [tools.ts]
symbols: [WebBrowserTool]
related: [subsys.tool-system, subsys.telemetry-flags]
updated: 2026-06-14
evidence: explicit
---

`WebBrowserTool` 是 `tools.ts` 中由 `WEB_BROWSER_TOOL` feature flag 控制的注册级工具条目; 本节点只描述注册方式, 不推断浏览器自动化实现细节。[E: tools.ts:117][E: tools.ts:217]

## 能回答的问题

- `WebBrowserTool` 在 `tools.ts` 里由哪个 feature flag 控制?
- `WebBrowserTool` 如何被加入 `getAllBaseTools()` 的工具数组?
- `tools.ts` 能否确认 `WebBrowserTool` 的输入 schema、输出 schema 和 `call()` 行为?

## 1 Identity

| 项 | 值 |
| --- | --- |
| 注册符号 | `WebBrowserTool` 变量在 `tools.ts` 中声明。[E: tools.ts:117] |
| 工具 name | 模型可见 `Tool.name` 不在 `tools.ts` 定义, 需要实现文件确认。[U] |
| aliases / searchHint / description | `tools.ts` 没有暴露这些字段。[U] |
| gating | `feature('WEB_BROWSER_TOOL')` 为真时才 `require('./tools/WebBrowserTool/WebBrowserTool.js').WebBrowserTool`, 否则变量为 `null`。[E: tools.ts:117][E: tools.ts:118][E: tools.ts:119] |

## 2 用途定位

`tools.ts` 只证明 `WebBrowserTool` 是内置 tool pool 的可选成员; `llms.txt` 对其用途有 Playwright 浏览器自动化的入口描述, 但本节点不把该描述升级为源码事实。[I]

## 3 输入 schema 表

| 字段 | 类型 | 必填 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| unknown | unknown | unknown | unknown | `tools.ts` 没有导出或内联 `WebBrowserTool` 的 input schema。[U] |

## 4 输出 & maxResultSizeChars

`tools.ts` 没有显示 `WebBrowserTool` 的 output schema、`maxResultSizeChars` 或 tool result 映射逻辑。[U]

## 5 行为标志

| 标志 | 可从 `tools.ts` 确认的状态 |
| --- | --- |
| 注册方式 | `getAllBaseTools()` 使用 `...(WebBrowserTool ? [WebBrowserTool] : [])` 条件展开, 因此只有变量非 null 时才进入 base tools 数组。[E: tools.ts:217] |
| `isEnabled()` 过滤 | 正常 `getTools()` 路径会对允许的工具调用 `isEnabled()` 并过滤 false 结果; `WebBrowserTool` 若进入该路径也受此过滤。[E: tools.ts:325][E: tools.ts:326] |
| read-only / concurrency / destructive / defer / interrupt | 这些 tool definition 字段不在 `tools.ts` 中可见。[U] |

## 6 权限

`tools.ts` 没有暴露 `WebBrowserTool.checkPermissions()`、`validateInput()` 或 permission matcher; 具体权限模型需要实现文件确认。[U]

## 7 call() 走读

`tools.ts` 只在 gate 通过后加载 `WebBrowserTool` export, 没有内联 `call()` 控制流。[E: tools.ts:118][U]

## 8 渲染

`tools.ts` 没有暴露 `WebBrowserTool` 的 render 函数或 UI panel 交互; 渲染细节保持未知。[U]

## 9 设计动机·edge·历史

`WEB_BROWSER_TOOL` gate 说明该工具在构建/运行环境中可被裁剪或关闭; `tools.ts` 没有说明 gate 背后的产品动机。[E: tools.ts:117][U]

## Sources

- `tools.ts`

## 相关

- subsys.tool-system
- subsys.telemetry-flags
