---
id: ref.react-contexts
path: reference/react-contexts.md
title: React Context providers 目录(context/)
kind: reference
tier: T3
status: verified
source: [context/fpsMetrics.tsx, context/mailbox.tsx, context/modalContext.tsx, context/notifications.tsx, context/overlayContext.tsx, context/promptOverlayContext.tsx, context/QueuedMessageContext.tsx, context/stats.tsx, context/voice.tsx]
symbols: [FpsMetricsProvider, useFpsMetrics, MailboxProvider, useMailbox, ModalContext, useIsInsideModal, useModalOrTerminalSize, useModalScrollRef, useNotifications, getNext, useRegisterOverlay, useIsOverlayActive, useIsModalOverlayActive, PromptOverlayProvider, usePromptOverlay, usePromptOverlayDialog, useSetPromptOverlay, useSetPromptOverlayDialog, QueuedMessageProvider, useQueuedMessage, StatsProvider, useStats, useCounter, useGauge, useTimer, useSet, createStatsStore, VoiceProvider, useVoiceState, useSetVoiceState, useGetVoiceState]
related: [subsys.session-state, subsys.ink-runtime]
updated: 2026-06-14
evidence: explicit
---

> `claude/context/` 目录是 UI 层的 React Context providers 集合 —— 每个 `.tsx` 用 `createContext` + `<XxxProvider>` + `useXxx()` 三件套,向 Ink 组件树注入一类横切状态(FPS、邮箱、模态尺寸、通知、浮层、排队消息、统计指标、语音)。本页是这 9 个文件的 catalog 表。

注意区分:本页讲的是 **`context/` 目录里的 React Context providers**,与顶层文件 `context.ts`(系统/用户 prompt 上下文装配,见 `spine.context-compaction`)完全是两回事 [I]。另外两个例外:`context/notifications.tsx` 和 `context/overlayContext.tsx` 虽住在本目录,却**不自建 context**,而是把读写转发到共享的 `state/AppState.js` `AppStoreContext`(权威节点 `subsys.session-state`)—— 表中单列说明 [I]。

## 能回答的问题

- `context/` 目录里都有哪些 React Context?各自的 Provider 和 hook 叫什么?
- 怎么读 FPS 指标 / 邮箱 / 统计计数器 / 语音状态?用哪个 hook?
- `useStats` / `useMailbox` / `useVoiceState` 必须包在哪个 Provider 里?不包会怎样?
- 通知队列(`useNotifications`)和浮层激活态(`useIsOverlayActive`)的 state 实际存在哪里?
- prompt 上方的浮动建议/对话框是哪个 context portal 出去的?
- 模态对话框里组件怎么拿到"可用行数"而不是整个终端尺寸?

## Catalog 表

每行一个 context 模块。"Provider"列为 `<XxxProvider>` 组件(无则注明);"提供的 state/API"为 context value 或 hook 返回值;"hook"为对外消费入口;"用途/消费者"为典型读取方。

| Context / Provider | 文件 | 提供的 state / API | 对应 hook(useXxx) | 用途 / 消费者 |
|---|---|---|---|---|
| **FpsMetricsContext** / `FpsMetricsProvider` | `context/fpsMetrics.tsx` | 一个 getter 函数 `() => FpsMetrics \| undefined`,Provider 通过 `getFpsMetrics` prop 注入 [E: context/fpsMetrics.tsx:5] [E: context/fpsMetrics.tsx:10] | `useFpsMetrics()` → getter 或 `undefined` [E: context/fpsMetrics.tsx:27] | 给调试/状态行按需读取实时 FPS;value 是 getter 而非数值,避免每帧 re-render [I] |
| **MailboxContext** / `MailboxProvider` | `context/mailbox.tsx` | 单例 `Mailbox` 实例(`useMemo` 一次性 `new Mailbox()`)[E: context/mailbox.tsx:4] [E: context/mailbox.tsx:15] | `useMailbox()` → `Mailbox`;Provider 外调用 **throw** `"useMailbox must be used within a MailboxProvider"` [E: context/mailbox.tsx:31] [E: context/mailbox.tsx:34] | 跨组件共享的进程内消息信箱(实现见 `utils/mailbox.js`)[E: context/mailbox.tsx:3] |
| **ModalContext** / (无 Provider 组件,直接 `<ModalContext.Provider>`,由 FullscreenLayout 在 `modal` slot 写入) | `context/modalContext.tsx` | `{ rows, columns, scrollRef }`;`null` = 不在 modal slot 内 [E: context/modalContext.tsx:22] [E: context/modalContext.tsx:27] | `useIsInsideModal()` → bool [E: context/modalContext.tsx:28];`useModalOrTerminalSize(fallback)` → modal 内尺寸否则 fallback [E: context/modalContext.tsx:38];`useModalScrollRef()` → `ScrollBoxHandle` ref 或 `null` [E: context/modalContext.tsx:55] | slash-command 对话框组件:抑制顶层 framing、按 modal 内区高度做 Select 分页、tab 切换重置滚动(设计意图见文件头 JSDoc)[I] |
| **(无自有 context)** —— 复用 AppState | `context/notifications.tsx` | 不 `createContext`;经 `useAppStateStore`/`useSetAppState` 读写 `AppState.notifications.{queue,current}`,带优先级、超时、fold、invalidate 队列逻辑 [E: context/notifications.tsx:42] [E: context/notifications.tsx:43] | `useNotifications()` → `{ addNotification, removeNotification }` [E: context/notifications.tsx:38];辅助 `getNext(queue)`(按优先级取队首,非 hook)[E: context/notifications.tsx:236] | 通知/toast 队列。state 真正的家是 `AppStoreContext`(`subsys.session-state`),本文件只是其上的队列调度 hook [I];`Notification` 类型导出于此 [E: context/notifications.tsx:33] |
| **(无自有 context)** —— 复用 AppState | `context/overlayContext.tsx` | 不 `createContext`;从 `state/AppState.js` 的 `AppStoreContext` / `useAppState` 读写 `activeOverlays: Set<string>` [E: context/overlayContext.tsx:18] [E: context/overlayContext.tsx:41] | `useRegisterOverlay(id, enabled?)` 挂载注册/卸载注销 [E: context/overlayContext.tsx:38];`useIsOverlayActive()` → 有任一 overlay [E: context/overlayContext.tsx:122];`useIsModalOverlayActive()` → 有非 autocomplete overlay [E: context/overlayContext.tsx:140] | Escape 键协调:让 CancelRequestHandler 区分"关浮层"与"取消请求";`autocomplete` 列为 non-modal 不抢 TextInput 焦点 [E: context/overlayContext.tsx:21] |
| **DataContext / SetContext / DialogContext / SetDialogContext**(4 个,均内部)/ `PromptOverlayProvider` | `context/promptOverlayContext.tsx` | data/setter 拆成两对:`PromptOverlayData`(建议项)与任意 `ReactNode`(对话框);拆 data/setter 让 writer 不因自身写入 re-render [E: context/promptOverlayContext.tsx:30] [E: context/promptOverlayContext.tsx:34] | 读:`usePromptOverlay()` [E: context/promptOverlayContext.tsx:61]、`usePromptOverlayDialog()` [E: context/promptOverlayContext.tsx:64];写(挂载即注册、卸载清空):`useSetPromptOverlay(data)` [E: context/promptOverlayContext.tsx:72]、`useSetPromptOverlayDialog(node)` [E: context/promptOverlayContext.tsx:101] | 让浮动内容逃出 FullscreenLayout 底槽的 `overflowY:hidden` 裁剪;FullscreenLayout 读两路并在裁剪槽外渲染(设计意图见文件头 JSDoc)[I] |
| **QueuedMessageContext** / `QueuedMessageProvider` | `context/QueuedMessageContext.tsx` | `{ isQueued: boolean, isFirst: boolean, paddingWidth: number }`;Provider 还按 `useBriefLayout` 包一层 `<Box paddingX>` [E: context/QueuedMessageContext.tsx:4] [E: context/QueuedMessageContext.tsx:20] | `useQueuedMessage()` → value 或 `undefined`(Provider 外安全)[E: context/QueuedMessageContext.tsx:11] | 标记某消息处于"排队"渲染态,供子组件知道是否首条、容器 padding 宽度以校正布局 [E: context/QueuedMessageContext.tsx:7] |
| **StatsContext** / `StatsProvider` | `context/stats.tsx` | `StatsStore`:`increment / set / observe / add / getAll`(计数器、gauge、含 reservoir 采样的 histogram、集合)[E: context/stats.tsx:4] [E: context/stats.tsx:99];工厂 `createStatsStore()` 导出 [E: context/stats.tsx:28] | `useStats()` → store,Provider 外 **throw** [E: context/stats.tsx:157] [E: context/stats.tsx:160];便捷 hook:`useCounter` [E: context/stats.tsx:164]、`useGauge` [E: context/stats.tsx:178]、`useTimer` [E: context/stats.tsx:192]、`useSet` [E: context/stats.tsx:206] | 会话内指标收集;Provider 在 `process.on('exit')` 时把 `getAll()` flush 进 `lastSessionMetrics` 项目配置 [E: context/stats.tsx:126] [E: context/stats.tsx:132] |
| **VoiceContext** / `VoiceProvider` | `context/voice.tsx` | `Store<VoiceState>`(`createStore`,见 `state/store.js`);`VoiceState` = `{ voiceState, voiceError, voiceInterimTranscript, voiceAudioLevels, voiceWarmingUp }` [E: context/voice.tsx:4] [E: context/voice.tsx:19] | `useVoiceState(selector)` 订阅切片(`useSyncExternalStore`,`Object.is` 比较)[E: context/voice.tsx:55];`useSetVoiceState()` → 稳定 setter [E: context/voice.tsx:76];`useGetVoiceState()` → 同步 getter [E: context/voice.tsx:85];内部 `useVoiceStore()` 在 Provider 外 throw(非 export)[E: context/voice.tsx:43] | 语音输入状态机(idle/recording/processing)+ 错误/中间转写/音量电平;store 一次创建、稳定引用,消费者按切片订阅避免 re-render [E: context/voice.tsx:28] |

### 形态小结

- **自建独立 context 的(7 个)**:`fpsMetrics`、`mailbox`、`modalContext`、`promptOverlayContext`、`QueuedMessageContext`、`stats`、`voice` —— 都在文件内 `createContext`。
- **不自建、复用 `AppStoreContext` 的(2 个)**:`notifications`、`overlayContext` —— 只导出 hook,state 落在 AppState（`subsys.session-state`）[I]。
- **Provider 外 throw 的(强制 Provider)**:`useMailbox`、`useStats`、以及 voice 的内部 `useVoiceStore`。**返回 `undefined`/`null` 容错的**:`useFpsMetrics`、`useQueuedMessage`、`useModalScrollRef`、`usePromptOverlay`/`Dialog`。
- **store 模式 vs value 模式**:`voice` 与 `stats` 把可变 store(`createStore` / `createStatsStore`)放进 context,消费者订阅或调方法;其余多为直接放 value/getter。

## Sources

- `context/fpsMetrics.tsx` — `FpsMetricsContext`、`FpsMetricsProvider`、`useFpsMetrics`。
- `context/mailbox.tsx` — `MailboxContext`、`MailboxProvider`、`useMailbox`(Provider 外 throw)。
- `context/modalContext.tsx` — `ModalContext`(导出)、`useIsInsideModal`、`useModalOrTerminalSize`、`useModalScrollRef`。
- `context/notifications.tsx` — `useNotifications`、`getNext`、`Notification` 类型;经 `useAppStateStore`/`useSetAppState` 读写 AppState。
- `context/overlayContext.tsx` — `useRegisterOverlay`、`useIsOverlayActive`、`useIsModalOverlayActive`;经 `AppStoreContext`/`useAppState`。
- `context/promptOverlayContext.tsx` — `PromptOverlayProvider`、`usePromptOverlay`、`usePromptOverlayDialog`、`useSetPromptOverlay`、`useSetPromptOverlayDialog`、`PromptOverlayData` 类型。
- `context/QueuedMessageContext.tsx` — `QueuedMessageContext`、`QueuedMessageProvider`、`useQueuedMessage`。
- `context/stats.tsx` — `StatsContext`(导出)、`StatsProvider`、`createStatsStore`、`StatsStore` 类型、`useStats`、`useCounter`、`useGauge`、`useTimer`、`useSet`。
- `context/voice.tsx` — `VoiceContext`、`VoiceProvider`、`VoiceState` 类型、`useVoiceState`、`useSetVoiceState`、`useGetVoiceState`。

## 相关

- [subsys.session-state](../subsystems/session-state.md) —— `notifications` 与 `overlayContext` 复用的 `AppStoreContext` / AppState store(`createStore`、`AppState`、`getDefaultAppState`)的权威节点。
- [subsys.ink-runtime](../subsystems/ink-runtime.md) —— 承载这些 Provider 的 Ink 渲染运行时(`overlayContext` 用到 `ink/instances.js`,`QueuedMessageContext` 用到 `ink.js` 的 `Box`)。
