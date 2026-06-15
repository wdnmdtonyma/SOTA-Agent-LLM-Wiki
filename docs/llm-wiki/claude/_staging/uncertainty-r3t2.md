# Uncertainty log — round 3, task 2 (reference/react-contexts.md)

来源任务:`context/` 目录 9 个 React Context providers 的 catalog 表。

- [U] `useVoiceStore`(voice.tsx:43)是 module-private(非 `export`),仅供同文件三个 `useVoiceState`/`useSetVoiceState`/`useGetVoiceState` 内部复用 —— 已在表中标注为内部 helper,不列为对外 hook。[E: context/voice.tsx:43] 确认无 `export` 前缀。
- [I] `notifications.tsx` 与 `overlayContext.tsx` 不在本文件内 `createContext`,而是复用 `state/AppState.js` 的 `AppStoreContext`/AppState store;因此严格说它们是"基于共享 AppState 的 hook 模块",非独立 Provider。已在表/正文显式标注此区分。权威 AppState 节点为 `subsys.session-state`。
- [U] 各 Provider 在组件树中的实际挂载点(谁渲染 `<XxxProvider>`)未在 `context/` 目录内体现,需查 REPL/根组件装配;本页只描述 context 模块自身的导出契约,不追挂载点。
